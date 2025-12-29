// Program Refresh API Routes
// Provides RESTful endpoints for refreshing program data using GET_WEBVIEW_LIST action

use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::Json,
    Router,
};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tracing::{error, info};

use crate::app_state::T3AppState;
use crate::entity::t3_device::{devices, programs};
use crate::t3_device::t3_ffi_sync_service::WebViewMessageType;
use sea_orm::*;

// Entry type constants matching C++ defines
const BAC_PRG: i32 = 6;

/// Request payload for refreshing a single program (index is optional)
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RefreshProgramRequest {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub index: Option<i32>,
}

/// Response structure for refresh operations
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RefreshResponse {
    pub success: bool,
    pub message: String,
    pub items: Vec<Value>,
    pub count: i32,
    pub timestamp: String,
}

/// Request payload for saving refreshed data
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveRefreshedDataRequest {
    pub items: Vec<Value>,
}

/// Response structure for save operations
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveResponse {
    pub success: bool,
    pub message: String,
    pub saved_count: i32,
    pub timestamp: String,
}

/// Creates and returns the program refresh API routes
pub fn create_program_refresh_routes() -> Router<T3AppState> {
    Router::new()
        .route("/programs/:serial/refresh", axum::routing::post(refresh_programs))
        .route("/programs/:serial/save-refreshed", axum::routing::post(save_refreshed_programs))
}

/// Refresh program(s) from device using GET_WEBVIEW_LIST action (Action 17)
/// POST /api/t3-device/programs/:serial/refresh
/// Body: { "index": 5 } for single item, or {} for all items
/// Returns the raw data from device without saving to database
pub async fn refresh_programs(
    State(state): State<T3AppState>,
    Path(serial): Path<i32>,
    Json(payload): Json<RefreshProgramRequest>,
) -> Result<Json<RefreshResponse>, (StatusCode, String)> {
    match payload.index {
        Some(idx) => {
            info!("GET_WEBVIEW_LIST: Refreshing single program - Serial: {}, Index: {}", serial, idx);
        }
        None => {
            info!("GET_WEBVIEW_LIST: Refreshing all programs - Serial: {}", serial);
        }
    }

    // Get database connection from state
    let db_connection = match &state.t3_device_conn {
        Some(conn) => conn.lock().await.clone(),
        None => {
            error!("❌ T3000 device database unavailable");
            return Err((StatusCode::SERVICE_UNAVAILABLE, "T3000 device database unavailable".to_string()));
        }
    };

    // Find panel_id from devices table
    let panel_id = match devices::Entity::find()
        .filter(devices::Column::SerialNumber.eq(serial))
        .one(&db_connection)
        .await
    {
        Ok(Some(device)) => device.panel_id.unwrap_or(0),
        Ok(None) => {
            error!("Device not found for serial: {}", serial);
            return Err((StatusCode::NOT_FOUND, format!("Device with serial {} not found", serial)));
        }
        Err(e) => {
            error!("Database error querying device: {:?}", e);
            return Err((StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)));
        }
    };

    // Prepare refresh JSON for GET_WEBVIEW_LIST action (Action 17)
    let mut refresh_json = json!({
        "action": WebViewMessageType::GET_WEBVIEW_LIST as i32,
        "panelId": panel_id,
        "serialNumber": serial,
        "object_instance": serial,
        "entryType": BAC_PRG,  // 6 = PROGRAM
    });

    // Add entryIndex only if specified (omit for refresh all)
    if let Some(idx) = payload.index {
        refresh_json["entryIndex"] = json!(idx);
    }

    // Call FFI function
    match call_refresh_ffi(WebViewMessageType::GET_WEBVIEW_LIST as i32, refresh_json).await {
        Ok(response) => {
            // Parse C++ response
            let response_json: Value = match serde_json::from_str(&response) {
                Ok(json) => json,
                Err(e) => {
                    error!("❌ Failed to parse C++ response: {}", e);
                    return Err((
                        StatusCode::INTERNAL_SERVER_ERROR,
                        format!("Invalid response from device: {}", e),
                    ));
                }
            };

            // Check if C++ returned success
            let success = response_json.get("success").and_then(|v| v.as_bool()).unwrap_or(false);
            if !success {
                let error_msg = response_json.get("message")
                    .and_then(|v| v.as_str())
                    .unwrap_or("Unknown error from device");

                // Check if this is an "empty response" indicating unimplemented action
                let debug_msg = response_json.get("debug")
                    .and_then(|v| v.as_str())
                    .unwrap_or("");

                if debug_msg.contains("empty response") || error_msg.contains("not implemented") {
                    error!("❌ Action 17 not implemented in C++: {}", debug_msg);
                    return Err((
                        StatusCode::NOT_IMPLEMENTED,
                        "GET_WEBVIEW_LIST (Action 17) is not yet implemented in C++. Please add case 17 to BacnetWebView_HandleWebViewMsg in T3000.exe".to_string(),
                    ));
                }

                error!("❌ Device refresh failed: {}", error_msg);
                error!("❌ Full C++ response: {}", serde_json::to_string_pretty(&response_json).unwrap_or_default());
                return Err((StatusCode::INTERNAL_SERVER_ERROR, format!("{} (Full response: {})", error_msg, response)));
            }

            // Extract items array from response
            let items = response_json.get("items")
                .and_then(|v| v.as_array())
                .map(|arr| arr.clone())
                .unwrap_or_default();

            let count = items.len() as i32;

            info!("✅ Refreshed {} program(s) from device", count);
            Ok(Json(RefreshResponse {
                success: true,
                message: format!("Refreshed {} program(s) from device", count),
                items,
                count,
                timestamp: chrono::Utc::now().to_rfc3339(),
            }))
        }
        Err(e) => {
            error!("❌ Failed to refresh programs: {}", e);

            // Provide helpful message if C++ hasn't implemented this action yet
            if e.contains("not implemented") || e.contains("empty response") {
                return Err((
                    StatusCode::NOT_IMPLEMENTED,
                    "GET_WEBVIEW_LIST (Action 17) is not yet implemented in C++. Please implement BacnetWebView_HandleWebViewMsg case 17 in T3000.exe".to_string(),
                ));
            }

            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to refresh programs: {}", e),
            ))
        }
    }
}

/// Save refreshed programs to database
/// POST /api/t3-device/programs/:serial/save-refreshed
/// Body: { "items": [...] } - array of program data from refresh response
pub async fn save_refreshed_programs(
    State(state): State<T3AppState>,
    Path(serial): Path<i32>,
    Json(payload): Json<SaveRefreshedDataRequest>,
) -> Result<Json<SaveResponse>, (StatusCode, String)> {
    info!("Saving {} refreshed program(s) to database - Serial: {}", payload.items.len(), serial);

    // Get database connection from state
    let db_connection = match &state.t3_device_conn {
        Some(conn) => conn.lock().await.clone(),
        None => {
            error!("❌ T3000 device database unavailable");
            return Err((StatusCode::SERVICE_UNAVAILABLE, "T3000 device database unavailable".to_string()));
        }
    };

    // Save items to database
    let saved_count = match save_programs_to_db(&db_connection, serial, &payload.items).await {
        Ok(count) => count,
        Err(e) => {
            error!("❌ Failed to save programs to database: {}", e);
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to save to database: {}", e),
            ));
        }
    };

    info!("✅ Saved {} program(s) to database", saved_count);
    Ok(Json(SaveResponse {
        success: true,
        message: format!("Saved {} program(s) to database", saved_count),
        saved_count,
        timestamp: chrono::Utc::now().to_rfc3339(),
    }))
}

/// Save refreshed programs to database
async fn save_programs_to_db(
    db: &DatabaseConnection,
    serial: i32,
    items: &[Value],
) -> Result<i32, String> {
    let mut saved_count = 0;

    for item in items {
        // Extract program index
        let program_index = item.get("programIndex")
            .or_else(|| item.get("program_index"))
            .or_else(|| item.get("programId"))
            .or_else(|| item.get("program_id"))
            .and_then(|v| v.as_i64())
            .map(|v| v as i32);

        if program_index.is_none() {
            error!("⚠️ Skipping item without programIndex/programId: {:?}", item);
            continue;
        }
        let program_index = program_index.unwrap();

        // Find existing program record using program_id
        let existing_program = programs::Entity::find()
            .filter(programs::Column::SerialNumber.eq(serial))
            .filter(programs::Column::ProgramId.eq(program_index.to_string()))
            .one(db)
            .await
            .map_err(|e| format!("Database query error: {}", e))?;

        if let Some(program_model) = existing_program {
            // Update existing record
            let mut active_model: programs::ActiveModel = program_model.into();

            // Update fields from C++ response (matching T3000.db PROGRAMS table schema)
            if let Some(val) = item.get("programLabel").or_else(|| item.get("program_label")).and_then(|v| v.as_str()) {
                active_model.program_label = Set(Some(val.to_string()));
            }
            if let Some(val) = item.get("programStatus").or_else(|| item.get("program_status")).and_then(|v| v.as_i64()) {
                active_model.program_status = Set(Some(val.to_string()));
            }
            if let Some(val) = item.get("autoManual").or_else(|| item.get("auto_manual")).and_then(|v| v.as_i64()) {
                active_model.auto_manual = Set(Some(val.to_string()));
            }
            if let Some(val) = item.get("programSize").or_else(|| item.get("program_size")).and_then(|v| v.as_i64()) {
                active_model.program_size = Set(Some(val.to_string()));
            }
            if let Some(val) = item.get("programPointer").or_else(|| item.get("program_pointer")).and_then(|v| v.as_i64()) {
                active_model.program_pointer = Set(Some(val.to_string()));
            }

            // Save to database
            active_model.update(db).await
                .map_err(|e| format!("Failed to update program: {}", e))?;

            saved_count += 1;
        } else {
            error!("⚠️ Program record not found: serial={}, program_id={}", serial, program_index);
        }
    }

    Ok(saved_count)
}

/// Call FFI function for refresh operations
async fn call_refresh_ffi(action: i32, refresh_json: Value) -> Result<String, String> {
    use crate::t3_device::t3_ffi_sync_service::load_t3000_function;

    let input_str = refresh_json.to_string();
    info!("📤 Sending to C++ (Action {}): {}", action, input_str);

    // Ensure T3000 functions are loaded
    tokio::task::spawn_blocking(|| {
        unsafe {
            if !load_t3000_function() {
                return Err("T3000 functions not loaded".to_string());
            }
        }
        Ok(())
    }).await
    .map_err(|e| format!("Failed to check T3000 functions: {}", e))?
    .map_err(|e| e)?;

    // Run FFI call in blocking task
    tokio::task::spawn_blocking(move || {
        use crate::t3_device::t3_ffi_sync_service::BACNETWEBVIEW_HANDLE_WEBVIEW_MSG_FN;

        const BUFFER_SIZE: usize = 1048576; // 1MB buffer
        let mut buffer: Vec<u8> = vec![0; BUFFER_SIZE];

        // Write input JSON to buffer
        let input_bytes = input_str.as_bytes();
        if input_bytes.len() >= BUFFER_SIZE {
            return Err("Input JSON too large for buffer".to_string());
        }

        buffer[..input_bytes.len()].copy_from_slice(input_bytes);
        buffer[input_bytes.len()] = 0; // Null terminator

        unsafe {
            if let Some(func) = BACNETWEBVIEW_HANDLE_WEBVIEW_MSG_FN {
                let result = func(
                    action,
                    buffer.as_mut_ptr() as *mut std::os::raw::c_char,
                    buffer.len() as i32,
                );

                match result {
                    0 => {
                        // Success - read response from buffer
                        let null_pos = buffer.iter().position(|&b| b == 0).unwrap_or(buffer.len());
                        let response = String::from_utf8_lossy(&buffer[..null_pos]).to_string();
                        info!("📥 C++ Response (Action {}): {}", action, response);

                        // Check if response is empty or minimal (C++ not implemented)
                        if response.is_empty() || response == "{}" {
                            return Err("Action not implemented in C++ - empty response".to_string());
                        }

                        Ok(response)
                    }
                    -2 => Err("MFC application not initialized".to_string()),
                    code => Err(format!("FFI call failed with code: {}", code)),
                }
            } else {
                Err("BacnetWebView_HandleWebViewMsg function not loaded".to_string())
            }
        }
    })
    .await
    .map_err(|e| format!("Task spawn error: {}", e))?
}
