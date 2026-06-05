// T3000 FFI API Service - Simple middleware for HTTP to FFI calls
// This service provides simple HTTP endpoints that pass JSON messages to T3000 FFI
// - Minimal middleware: receives HTTP requests, calls FFI, returns response
// - All message formatting and response parsing handled in TypeScript layer
// - Simple pass-through architecture for easy WebSocket/FFI switching

use std::ffi::CString;
use std::os::raw::c_char;
use std::collections::HashMap;
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
use once_cell::sync::Lazy;
use crate::error::Error;
use crate::logger::ServiceLogger;
use crate::app_state::T3AppState;
use crate::logging::service::emit_app_log;
use winapi::um::libloaderapi::{GetProcAddress, LoadLibraryA};

/// Pending realtime trendlog flows awaiting their batch_save step.
/// action=15 (LOGGING_DATA) stores a TRENDLOG_POLL flow here when called via HTTP.
/// Keyed by (panel_id, serial_number). Entries older than 60 s are reaped on
/// the next insert so they don't stay stuck as "running" forever.
pub static PENDING_REALTIME_FLOWS: Lazy<tokio::sync::Mutex<HashMap<(i32, i32), (crate::logging::flow::FlowHandle, std::time::Instant)>>> =
    Lazy::new(|| tokio::sync::Mutex::new(HashMap::new()));

/// One captured action=17 GET_WEBVIEW_LIST call, waiting to be replayed as a
/// `ffi_poll_*` step in the next TRENDLOG_POLL flow for this serial_number.
/// `sendPeriodicBatchRequest` in TrendLogChart.vue fires up to 3 parallel
/// action=17 calls per interval (one per entry type: OUT / IN / VAR).
pub struct PendingFfiPollStep {
    pub step_name: String,   // "ffi_poll_out" | "ffi_poll_in" | "ffi_poll_var"
    pub elapsed_ms: i64,
    pub message: String,
    pub detail: String,      // full prettified request + response written to disk via step_ffi
    pub inserted_at: std::time::Instant,
}

/// Accumulated action=17 steps per poll_cycle_id, drained by
/// `save_realtime_trendlog_batch` when it builds the TRENDLOG_POLL flow.
pub static PENDING_ACTION17_STEPS: Lazy<tokio::sync::Mutex<HashMap<String, Vec<PendingFfiPollStep>>>> =
    Lazy::new(|| tokio::sync::Mutex::new(HashMap::new()));

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

fn action4_warmup_active() -> bool {
    if let Some(loaded_at) = T3000_LOADED_AT.get() {
        return loaded_at.elapsed() < Duration::from_secs(3);
    }
    false
}

/// Global FFI serialization lock — shared across ALL FFI call sites (HTTP, sync service, trendlog refresh).
/// Uses std::sync::Mutex so it works in both async and spawn_blocking contexts.
pub fn ffi_call_lock() -> &'static Mutex<()> {
    static FFI_CALL_LOCK: OnceLock<Mutex<()>> = OnceLock::new();
    FFI_CALL_LOCK.get_or_init(|| Mutex::new(()))
}

/// Try to acquire the FFI lock with a timeout (default 60s).
/// Prevents deadlock when a prior C++ FFI call in spawn_blocking hangs.
pub fn ffi_call_lock_timeout(timeout_secs: u64) -> Option<std::sync::MutexGuard<'static, ()>> {
    let lock = ffi_call_lock();
    let deadline = Instant::now() + Duration::from_secs(timeout_secs);
    loop {
        match lock.try_lock() {
            Ok(guard) => return Some(guard),
            Err(std::sync::TryLockError::WouldBlock) => {
                if Instant::now() > deadline {
                    eprintln!("❌ FFI lock acquisition timed out after {}s — prior C++ call may be stuck", timeout_secs);
                    return None;
                }
                std::thread::sleep(Duration::from_millis(100));
            }
            Err(std::sync::TryLockError::Poisoned(p)) => {
                eprintln!("⚠️ FFI lock was poisoned — recovering");
                return Some(p.into_inner());
            }
        }
    }
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
                return std::ptr::addr_of!(BACNETWEBVIEW_HANDLE_WEBVIEW_MSG_FN)
                    .read()
                    .is_some();
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
            let _guard = ffi_call_lock_timeout(60)
                .ok_or_else(|| Error::ServerError("FFI lock timed out — prior C++ call may be stuck".to_string()))?;

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

                // Guard startup window: GET_PANELS_LIST has been observed to
                // hit vector assertions in T3000.exe when called too early.
                if action == 4 && action4_warmup_active() {
                    let warmup = serde_json::json!({
                        "error": "T3000 panel data still initializing, retry shortly",
                        "code": "T3000_PANELS_WARMUP"
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
    State(app_state): State<T3AppState>,
    Json(payload): Json<JsonValue>
) -> Result<Json<JsonValue>, (StatusCode, Json<JsonValue>)> {
    // Convert payload to string for FFI call
    let message = payload.to_string();

    // Extract action for logging - support both top-level and nested patterns
    let action = payload.get("action")  // Try top level first (old services)
        .or_else(|| payload.get("message").and_then(|m| m.get("action")))  // Then nested (new TransportTesterPage)
        .and_then(|a| a.as_i64())
        .unwrap_or(0);

    // Emit activity-log entry for this FFI call (DB/file per policy)
    {
        let db = app_state.conn.lock().await;
        emit_app_log(
            &*db,
            "info",
            "API_REQ",
            Some("ffi_api_service"),
            None,
            &format!("FFI request action={}", action),
            Some(&message),
        ).await;

        emit_app_log(
            &*db,
            "info",
            "FFI_CALL",
            Some("ffi_api_service"),
            None,
            &format!("FFI call action={}", action),
            Some(&message),
        ).await;
    }

    let t0 = std::time::Instant::now();
    let service = T3000FfiApiService::new();

    match service.call_ffi(&message).await {
        Ok(response) => {
            {
                let db = app_state.conn.lock().await;
                emit_app_log(
                    &*db,
                    "info",
                    "API_REQ",
                    Some("ffi_api_service"),
                    None,
                    &format!("FFI response action={}", action),
                    Some(&response),
                ).await;
            }

            // Flow logging for action=15 (LOGGING_DATA — trendlog realtime poll)
            // Starts a 2-step TRENDLOG_POLL flow; step 1 (batch_save) is logged
            // from save_realtime_trendlog_batch when the frontend sends the data.
            if action == 15 {
                let panel_id = payload.get("panelId").and_then(|v| v.as_i64()).unwrap_or(0) as i32;
                let sn       = payload.get("serialNumber").and_then(|v| v.as_i64()).unwrap_or(0) as i32;
                // Count points returned: response may use { data: { device_data: [...] } } or
                // { data: [...] } depending on the action=17 response shape.
                let item_count: usize = serde_json::from_str::<serde_json::Value>(&response)
                    .ok()
                    .map(|j| {
                        // Shape 1: { data: { device_data: [...] } }
                        j.get("data")
                            .and_then(|d| d.get("device_data"))
                            .and_then(|dd| dd.as_array())
                            .map(|a| a.len())
                            // Shape 2: { data: [...] } (array of panels each with device_data)
                            .or_else(|| j.get("data").and_then(|d| d.as_array()).map(|devs| {
                                devs.iter()
                                    .filter_map(|d| d.get("device_data").and_then(|dd| dd.as_array()).map(|a| a.len()))
                                    .sum::<usize>()
                            }))
                            .unwrap_or(0)
                    })
                    .unwrap_or(0);
                let elapsed = t0.elapsed().as_millis() as i64;
                if let Some(db) = crate::db_connection::establish_t3_device_connection().await
                    .map_err(|e| e.to_string()).ok() {
                    let response_pretty = serde_json::from_str::<serde_json::Value>(&response)
                        .ok()
                        .and_then(|v| serde_json::to_string_pretty(&v).ok())
                        .unwrap_or_else(|| response.clone());
                    let ffi_detail = format!(
                        "// request: {}\n// response ({} items):\n{}",
                        message, item_count, response_pretty,
                    );
                    let fh = crate::logging::flow::FlowHandle::start(
                        &db, "TRENDLOG_CHART", "realtime", 2,
                        Some(&format!("panel={} device={} items={}", panel_id, sn, item_count)),
                    ).await;
                    fh.step_ffi(&db, "ffi_poll", "info", "ffi", "ok", elapsed,
                        &format!("{} items fetched (action=17) — panel={} device={}", item_count, panel_id, sn),
                        Some(&ffi_detail)).await;
                    // Store for batch_save step; share the same PENDING_REALTIME_FLOWS map.
                    {
                        let mut map = PENDING_REALTIME_FLOWS.lock().await;
                        if let Some((old_fh, _)) = map.remove(&(panel_id, sn)) {
                            old_fh.done(&db, "superseded").await;
                        }
                        let timeout = std::time::Duration::from_secs(60);
                        let stale_keys: Vec<(i32, i32)> = map
                            .iter()
                            .filter(|(_, (_, t))| t.elapsed() > timeout)
                            .map(|(k, _)| *k)
                            .collect();
                        for key in stale_keys {
                            if let Some((stale_fh, _)) = map.remove(&key) {
                                stale_fh.done(&db, "timeout").await;
                            }
                        }
                        map.insert((panel_id, sn), (fh, std::time::Instant::now()));
                    }
                }
            }

            // Flow logging for action=17 (GET_WEBVIEW_LIST — TrendLogChart.vue realtime sampling)
            // sendPeriodicBatchRequest fires up to 3 parallel action=17 calls per interval
            // (one each for entry types OUT=0, IN=1, VAR=2).  Each call is captured here;
            // save_realtime_trendlog_batch drains them and builds a TRENDLOG_POLL flow with
            // one ffi_poll_* step per call + one batch_save step.
            if action == 17 {
                let panel_id  = payload.get("panelId").and_then(|v| v.as_i64()).unwrap_or(0) as i32;
                let sn        = payload.get("serialNumber").and_then(|v| v.as_i64()).unwrap_or(0) as i32;
                let entry_type = payload.get("entryType").and_then(|v| v.as_i64()).unwrap_or(-1);
                // poll_cycle_id is generated by sendPeriodicBatchRequest in TrendLogChart.vue
                // and passed with every action=17 call in the same interval batch.
                // Fall back to sn if absent (older frontend builds).
                let poll_cycle_id: String = payload.get("poll_cycle_id")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string())
                    .unwrap_or_else(|| sn.to_string());
                let step_name = match entry_type {
                    0 => "ffi_poll_out",
                    1 => "ffi_poll_in",
                    2 => "ffi_poll_var",
                    _ => "ffi_poll",
                };
                // Count device_data items in response: { data: { device_data: [...] } }
                let item_count: usize = serde_json::from_str::<serde_json::Value>(&response)
                    .ok()
                    .and_then(|j| j.get("data").and_then(|d| d.get("device_data"))
                        .and_then(|dd| dd.as_array()).map(|a| a.len()))
                    .unwrap_or(0);
                let elapsed = t0.elapsed().as_millis() as i64;
                let response_pretty = serde_json::from_str::<serde_json::Value>(&response)
                    .ok()
                    .and_then(|v| serde_json::to_string_pretty(&v).ok())
                    .unwrap_or_else(|| response.clone());
                let detail = format!(
                    "// request: {}\n// response ({} items):\n{}",
                    message, item_count, response_pretty,
                );
                let step_msg = format!(
                    "{} items — panel={} device={} entryType={}",
                    item_count, panel_id, sn, entry_type,
                );
                let mut map = PENDING_ACTION17_STEPS.lock().await;
                let steps = map.entry(poll_cycle_id).or_insert_with(Vec::new);
                // Reap stale slots (> 60 s) from a prior interval that never got a batch.
                let now = std::time::Instant::now();
                steps.retain(|s| now.duration_since(s.inserted_at).as_secs() < 60);
                steps.push(PendingFfiPollStep {
                    step_name: step_name.to_string(),
                    elapsed_ms: elapsed,
                    message: step_msg,
                    detail,
                    inserted_at: std::time::Instant::now(),
                });
            }

            // Try to parse response as JSON, otherwise return as string
            match serde_json::from_str::<JsonValue>(&response) {
                Ok(json_response) => {
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
            // Errors always go to DB regardless of policy
            {
                let db = app_state.conn.lock().await;
                emit_app_log(
                    &*db,
                    "error",
                    "FFI_CALL",
                    Some("ffi_api_service"),
                    None,
                    &format!("FFI call failed action={}: {}", action, e),
                    None,
                ).await;
            }
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
