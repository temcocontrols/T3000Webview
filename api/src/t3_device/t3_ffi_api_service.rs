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
use winapi::shared::minwindef::HINSTANCE;

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
            max_buffer_size: 8192, // 8KB buffer
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
                r"E:\1025\github\temcocontrols\T3000_Building_Automation_System\T3000 Output\Debug\T3000.exe",
                r"C:\T3000\T3000.exe"
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
        let action = match serde_json::from_str::<serde_json::Value>(message) {
            Ok(json) => {
                json.get("message")
                    .and_then(|m| m.get("action"))
                    .and_then(|a| a.as_i64())
                    .unwrap_or(0) as i32
            }
            Err(_) => 0
        };

        api_logger.info(&format!("📡 FFI Call - Action: {}, Message: {}", action, message));

        unsafe {
            if !Self::load_t3000_function() {
                return Err(Error::ServerError("T3000 FFI functions not loaded".to_string()));
            }

            if let Some(func) = BACNETWEBVIEW_HANDLE_WEBVIEW_MSG_FN {
                let message_cstring = CString::new(message)
                    .map_err(|e| Error::ServerError(format!("Invalid message string: {}", e)))?;

                let mut buffer = vec![0u8; self.max_buffer_size];
                let result = func(
                    action,  // Use extracted action from JSON message
                    message_cstring.as_ptr() as *mut c_char,
                    message.len() as i32
                );

                if result > 0 {
                    let response = String::from_utf8(buffer[..result as usize].to_vec())
                        .map_err(|e| Error::ServerError(format!("Invalid UTF-8 response: {}", e)))?;

                    api_logger.info(&format!("📡 FFI Response - Size: {} bytes", result));
                    Ok(response)
                } else {
                    let error_msg = format!("FFI call returned error code: {}", result);
                    api_logger.error(&format!("❌ {}", error_msg));
                    Err(Error::ServerError(error_msg))
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
    api_logger.info(&format!("📡 FFI API Request - Message: {}", message));

    let service = T3000FfiApiService::new();

    match service.call_ffi(&message).await {
        Ok(response) => {
            // Try to parse response as JSON, otherwise return as string
            match serde_json::from_str::<JsonValue>(&response) {
                Ok(json_response) => Ok(Json(json_response)),
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
