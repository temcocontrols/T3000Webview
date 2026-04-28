// T3000 FFI API Service - Simple middleware for HTTP to FFI calls
// This service provides simple HTTP endpoints that pass JSON messages to T3000 FFI
// - Minimal middleware: receives HTTP requests, calls FFI, returns response
// - All message formatting and response parsing handled in TypeScript layer
// - Simple pass-through architecture for easy WebSocket/FFI switching

use std::ffi::CString;
use std::os::raw::c_char;
use axum::{
    extract::State,
    http::StatusCode,
    response::Json,
    routing::post,
    Router,
};
use serde_json::Value as JsonValue;
use std::sync::{Mutex, OnceLock};
use std::time::{Duration, Instant};
use crate::error::Error;
use crate::logger::ServiceLogger;
use crate::app_state::T3AppState;
use winapi::um::libloaderapi::{GetProcAddress, LoadLibraryA};

// FFI function type
type BacnetWebViewHandleWebViewMsgFn = unsafe extern "C" fn(action: i32, msg: *mut c_char, len: i32) -> i32;

// Global function pointer
static mut BACNETWEBVIEW_HANDLE_WEBVIEW_MSG_FN: Option<BacnetWebViewHandleWebViewMsgFn> = None;
static mut T3000_LOADED: bool = false;
static T3000_LOADED_AT: OnceLock<Instant> = OnceLock::new();

fn action17_warmup_active() -> bool {
    if let Some(loaded_at) = T3000_LOADED_AT.get() {
        return loaded_at.elapsed() < Duration::from_secs(4);
    }
    false
}

/// Global FFI serialization lock — shared across ALL FFI call sites (HTTP, sync service, trendlog refresh).
/// Uses std::sync::Mutex so it works in both async and spawn_blocking contexts.
pub fn ffi_call_lock() -> &'static Mutex<()> {
    static FFI_CALL_LOCK: OnceLock<Mutex<()>> = OnceLock::new();
    FFI_CALL_LOCK.get_or_init(|| Mutex::new(()))
}

/// Simple FFI API Service - middleware only
pub struct T3000FfiApiService {
    pub max_buffer_size: usize,
}

impl T3000FfiApiService {
    pub fn new() -> Self {
        Self {
            max_buffer_size: 10485760, // 10MB buffer (increased from 8KB to handle large graphics data)
        }
    }

    /// Load T3000 FFI function
    fn load_t3000_function() -> bool {
        unsafe {
            if T3000_LOADED {
                return BACNETWEBVIEW_HANDLE_WEBVIEW_MSG_FN.is_some();
            }

            let mut api_logger = ServiceLogger::api().unwrap_or_else(|_| ServiceLogger::new("fallback_api").unwrap());

            // Try to find T3000.exe - look in same directory as Rust API first
            let t3000_paths = vec![
                "T3000.exe",  // Same directory as Rust API
                "./T3000.exe",  // Current directory explicitly
                "../T3000.exe",  // Parent directory
            ];

            for path in &t3000_paths {
                api_logger.info(&format!("🔍 API Service - Looking for T3000.exe at: {}", path));

                if std::path::Path::new(path).exists() {
                    let path_cstring = CString::new(*path).unwrap();
                    let t3000_module = LoadLibraryA(path_cstring.as_ptr());

                    if !t3000_module.is_null() {
                        api_logger.info("✅ API Service - Successfully loaded T3000.exe");
                        let func_name = CString::new("BacnetWebView_HandleWebViewMsg").unwrap();
                        let func_ptr = GetProcAddress(t3000_module, func_name.as_ptr());

                        if !func_ptr.is_null() {
                            BACNETWEBVIEW_HANDLE_WEBVIEW_MSG_FN = Some(std::mem::transmute(func_ptr));
                            T3000_LOADED = true;
                            let _ = T3000_LOADED_AT.set(Instant::now());
                            return true;
                        } else {
                            api_logger.error("❌ API Service - BacnetWebView_HandleWebViewMsg not found in T3000.exe");
                        }
                    }
                }
            }

            T3000_LOADED = true;
            false
        }
    }

    /// Simple FFI call - just pass the message to C++
    pub async fn call_ffi(&self, message: &str) -> Result<String, Error> {
        let mut api_logger = ServiceLogger::api().unwrap_or_else(|_| ServiceLogger::new("fallback_api").unwrap());

        // Parse the JSON to extract the action number
        api_logger.info(&format!("🔍 Parsing message JSON: {}", message));

        let action = match serde_json::from_str::<serde_json::Value>(message) {
            Ok(json) => {
                api_logger.info(&format!("✅ JSON parsed successfully"));

                // Log the full JSON structure
                api_logger.info(&format!("📦 Full JSON: {}", serde_json::to_string_pretty(&json).unwrap_or_default()));

                // Support BOTH patterns:
                // 1. Top-level action: {"action": 0, "panelId": 123} (trendlog_webmsg_service)
                // 2. Nested action: {"header": {...}, "message": {"action": 4}} (TransportTesterPage)
                let action_field = json.get("action")  // Try top level first
                    .or_else(|| {
                        // If not found, try nested in "message" field
                        json.get("message").and_then(|m| m.get("action"))
                    });

                api_logger.info(&format!("🔍 action field found: {:?}", action_field));

                // Try to convert to i64
                let action_value = action_field.and_then(|a| a.as_i64()).unwrap_or(0) as i32;
                api_logger.info(&format!("🔍 action value extracted: {}", action_value));

                action_value
            }
            Err(e) => {
                api_logger.error(&format!("❌ Failed to parse JSON: {}", e));
                0
            }
        };

        api_logger.info(&format!("📡 FFI Call - Final Action: {}, Calling C++ now...", action));
        let max_buffer_size = self.max_buffer_size;
        let message_owned = message.to_string();

        // Run heavy FFI work on blocking pool so request handling threads stay responsive.
        let ffi_result = tokio::task::spawn_blocking(move || {
            let _guard = ffi_call_lock().lock().unwrap_or_else(|p| p.into_inner());

            unsafe {
                if !Self::load_t3000_function() {
                    return Err(Error::ServerError("T3000 FFI functions not loaded".to_string()));
                }

                // Guard first-load startup window: C++ can assert on early Action 17 calls
                // right after DLL/reload. Fail fast so frontend retries instead of crashing T3000.exe.
                if action == 17 && action17_warmup_active() {
                    let warmup = serde_json::json!({
                        "error": "T3000 initialization in progress, please retry shortly",
                        "code": "T3000_WARMUP"
                    })
                    .to_string();
                    return Ok((-1, warmup.len(), warmup));
                }

                if let Some(func) = BACNETWEBVIEW_HANDLE_WEBVIEW_MSG_FN {
                    // Allocate buffer large enough for both input and output
                    let mut buffer: Vec<u8> = vec![0; max_buffer_size];
                    let input_bytes = message_owned.as_bytes();

                    if input_bytes.len() >= max_buffer_size {
                        return Err(Error::ServerError("Input message too large for buffer".to_string()));
                    }

                    // Copy input message into buffer
                    buffer[..input_bytes.len()].copy_from_slice(input_bytes);
                    buffer[input_bytes.len()] = 0; // Null terminate

                    // Call FFI - buffer contains input, will be modified to contain output
                    let result = func(
                        action,
                        buffer.as_mut_ptr() as *mut c_char,
                        buffer.len() as i32,
                    );

                    match result {
                        code if code >= 0 => {
                            // Non-negative codes (0, 1, 2, etc.) are success or "no data" states
                            // Extract response from buffer
                            let null_pos = buffer.iter().position(|&b| b == 0).unwrap_or(buffer.len());
                            let response = String::from_utf8_lossy(&buffer[..null_pos]).to_string();
                            Ok((code, null_pos, response))
                        }
                        -2 => Err(Error::ServerError("MFC application not initialized".to_string())),
                        -1 => {
                            // C++ returned -1, but buffer may contain error JSON (e.g., device offline)
                            let null_pos = buffer.iter().position(|&b| b == 0).unwrap_or(buffer.len());
                            let response = String::from_utf8_lossy(&buffer[..null_pos]).to_string();
                            if !response.is_empty() && (response.starts_with('{') || response.starts_with('[')) {
                                Ok((-1, null_pos, response))
                            } else {
                                Err(Error::ServerError("FFI call returned error code: -1".to_string()))
                            }
                        }
                        code => Err(Error::ServerError(format!("FFI call returned error code: {}", code))),
                    }
                } else {
                    Err(Error::ServerError("FFI function not loaded".to_string()))
                }
            }
        })
        .await
        .map_err(|e| Error::ServerError(format!("FFI blocking task join error: {}", e)))?;

        let (code, null_pos, response) = ffi_result?;
        if code == 0 {
            api_logger.info(&format!("✅ FFI Success - {} bytes", null_pos));
        } else if code > 0 {
            api_logger.info(&format!("ℹ️  FFI returned code {} (no new data/empty result) - {} bytes", code, null_pos));
        } else {
            api_logger.info(&format!("⚠️  FFI returned -1 with JSON response: {}", response));
        }

        if let Ok(response_json) = serde_json::from_str::<serde_json::Value>(&response) {
            let response_action = response_json.get("action")
                .and_then(|a| a.as_str())
                .unwrap_or("UNKNOWN");
            api_logger.info(&format!("🔍 C++ Response Action: {}", response_action));

            if code == 0 {
                api_logger.info(&format!("📦 C++ Response: {}", serde_json::to_string_pretty(&response_json).unwrap_or_default()));
            }
        }

        Ok(response)
    }
}

/// Create FFI API routes
pub fn create_ffi_api_routes() -> Router<T3AppState> {
    Router::new()
        .route("/api/t3000/ffi/call", post(handle_ffi_call))
}

/// Simple HTTP endpoint - receives JSON message, calls FFI, returns response
async fn handle_ffi_call(
    State(_app_state): State<T3AppState>,
    Json(payload): Json<JsonValue>
) -> Result<Json<JsonValue>, (StatusCode, Json<JsonValue>)> {
    let mut api_logger = ServiceLogger::api().unwrap_or_else(|_| ServiceLogger::new("fallback_api").unwrap());

    // Convert payload to string for FFI call
    let message = payload.to_string();

    // Extract action for logging - support both top-level and nested patterns
    let action = payload.get("action")  // Try top level first (old services)
        .or_else(|| payload.get("message").and_then(|m| m.get("action")))  // Then nested (new TransportTesterPage)
        .and_then(|a| a.as_i64())
        .unwrap_or(0);

    api_logger.info(&format!("📡 FFI API Request - Action: {}, Full payload: {}", action, message));

    let service = T3000FfiApiService::new();

    match service.call_ffi(&message).await {
        Ok(response) => {
            api_logger.info(&format!("📡 FFI Response from C++: {}", response));

            // Try to parse response as JSON, otherwise return as string
            match serde_json::from_str::<JsonValue>(&response) {
                Ok(json_response) => {
                    let response_action = json_response.get("action")
                        .and_then(|a| a.as_str())
                        .unwrap_or("UNKNOWN");
                    api_logger.info(&format!("✅ C++ returned action: {}", response_action));
                    Ok(Json(json_response))
                },
                Err(_) => Ok(Json(serde_json::json!({
                    "status": "success",
                    "data": response,
                    "timestamp": chrono::Utc::now().to_rfc3339()
                })))
            }
        }
        Err(e) => {
            api_logger.error(&format!("❌ FFI call failed: {:?}", e));
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "status": "error",
                    "error": e.to_string(),
                    "timestamp": chrono::Utc::now().to_rfc3339()
                }))
            ))
        }
    }
}
