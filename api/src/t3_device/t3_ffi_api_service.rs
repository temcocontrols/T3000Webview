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
use crate::error::Error;
use crate::logger::ServiceLogger;
use crate::app_state::T3AppState;
use winapi::um::libloaderapi::{GetProcAddress, LoadLibraryA};

// FFI function type
type BacnetWebViewHandleWebViewMsgFn = unsafe extern "C" fn(action: i32, msg: *mut c_char, len: i32) -> i32;

// Global function pointer
static mut BACNETWEBVIEW_HANDLE_WEBVIEW_MSG_FN: Option<BacnetWebViewHandleWebViewMsgFn> = None;
static mut T3000_LOADED: bool = false;

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

        unsafe {
            if !Self::load_t3000_function() {
                return Err(Error::ServerError("T3000 FFI functions not loaded".to_string()));
            }

            if let Some(func) = BACNETWEBVIEW_HANDLE_WEBVIEW_MSG_FN {
                // Allocate buffer large enough for both input and output
                let mut buffer: Vec<u8> = vec![0; self.max_buffer_size];
                let input_bytes = message.as_bytes();

                if input_bytes.len() >= self.max_buffer_size {
                    return Err(Error::ServerError("Input message too large for buffer".to_string()));
                }

                // Copy input message into buffer
                buffer[..input_bytes.len()].copy_from_slice(input_bytes);
                buffer[input_bytes.len()] = 0;  // Null terminate

                // Call FFI - buffer contains input, will be modified to contain output
                let result = func(
                    action,
                    buffer.as_mut_ptr() as *mut c_char,
                    buffer.len() as i32
                );

                match result {
                    0 => {
                        // Success - extract response from buffer
                        let null_pos = buffer.iter().position(|&b| b == 0).unwrap_or(buffer.len());
                        let response = String::from_utf8_lossy(&buffer[..null_pos]).to_string();

                        api_logger.info(&format!("📡 FFI Response - {} bytes", null_pos));

                        // Parse and log response action
                        if let Ok(response_json) = serde_json::from_str::<serde_json::Value>(&response) {
                            let response_action = response_json.get("action")
                                .and_then(|a| a.as_str())
                                .unwrap_or("UNKNOWN");
                            api_logger.info(&format!("🔍 C++ Response Action: {}", response_action));
                            api_logger.info(&format!("📦 C++ Response: {}", serde_json::to_string_pretty(&response_json).unwrap_or_default()));
                        }

                        Ok(response)
                    }
                    -2 => {
                        let error_msg = "MFC application not initialized".to_string();
                        api_logger.error(&format!("❌ {}", error_msg));
                        Err(Error::ServerError(error_msg))
                    }
                    -1 => {
                        // C++ returned -1, but buffer may contain error JSON (e.g., device offline)
                        // Read buffer content to get actual error message
                        let null_pos = buffer.iter().position(|&b| b == 0).unwrap_or(buffer.len());
                        let response = String::from_utf8_lossy(&buffer[..null_pos]).to_string();

                        // If buffer has JSON content, return it (allows frontend to parse error)
                        if !response.is_empty() && (response.starts_with('{') || response.starts_with('[')) {
                            api_logger.info(&format!("⚠️ FFI returned -1 with JSON response: {}", response));
                            Ok(response)  // Return the JSON error response
                        } else {
                            let error_msg = format!("FFI call returned error code: -1");
                            api_logger.error(&format!("❌ {}", error_msg));
                            Err(Error::ServerError(error_msg))
                        }
                    }
                    code => {
                        let error_msg = format!("FFI call returned error code: {}", code);
                        api_logger.error(&format!("❌ {}", error_msg));
                        Err(Error::ServerError(error_msg))
                    }
                }
            } else {
                Err(Error::ServerError("FFI function not loaded".to_string()))
            }
        }
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
