// Variable Refresh API Routes
// Provides RESTful endpoints for refreshing variable point data using REFRESH_WEBVIEW_LIST action

use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::Json,
    Router,
};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::ffi::CString;
use std::os::raw::c_char;
use tracing::{error, info};

use crate::app_state::T3AppState;
use crate::entity::t3_device::{devices, variable_points};
use sea_orm::*;

// Entry type constants matching C++ defines
const BAC_VAR: i32 = 2;

/// Request payload for refreshing a single variable (index is optional)
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RefreshVariableRequest {
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

/// Creates and returns the variable refresh API routes
pub fn create_variable_refresh_routes() -> Router<T3AppState> {
    Router::new()
        .route("/variables/:serial/refresh", axum::routing::post(refresh_variables))
        .route("/variables/:serial/save-refreshed", axum::routing::post(save_refreshed_variables))
}

/// Refresh variable(s) from device using REFRESH_WEBVIEW_LIST action (Action 17)
/// POST /api/t3-device/variables/:serial/refresh
/// Body: { "index": 5 } for single item, or {} for all items
/// Returns the raw data from device without saving to database
pub async fn refresh_variables(
    State(state): State<T3AppState>,
    Path(serial): Path<i32>,
    Json(payload): Json<RefreshVariableRequest>,
) -> Result<Json<RefreshResponse>, (StatusCode, String)> {
    match payload.index {
        Some(idx) => {
            info!("REFRESH_WEBVIEW_LIST: Refreshing single variable - Serial: {}, Index: {}", serial, idx);
        }
        None => {
            info!("REFRESH_WEBVIEW_LIST: Refreshing all variables - Serial: {}", serial);
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

    // Prepare refresh JSON for REFRESH_WEBVIEW_LIST action
    let mut refresh_json = json!({
        "action": 17,  // REFRESH_WEBVIEW_LIST
        "panelId": panel_id,
        "serialNumber": serial,
        "entryType": BAC_VAR,  // 2 = VARIABLE
    });

    // Add entryIndex only if specified (omit for refresh all)
    if let Some(idx) = payload.index {
        refresh_json["entryIndex"] = json!(idx);
    }

    // Call FFI function
    match call_refresh_ffi(17, refresh_json).await {
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
                error!("❌ Device refresh failed: {}", error_msg);
                return Err((StatusCode::INTERNAL_SERVER_ERROR, error_msg.to_string()));
            }

            // Extract items array from response
            let items = response_json.get("items")
                .and_then(|v| v.as_array())
                .map(|arr| arr.clone())
                .unwrap_or_default();

            let count = items.len() as i32;

            info!("✅ Refreshed {} variable(s) from device", count);
            Ok(Json(RefreshResponse {
                success: true,
                message: format!("Refreshed {} variable(s) from device", count),
                items,
                count,
                timestamp: chrono::Utc::now().to_rfc3339(),
            }))
        }
        Err(e) => {
            error!("❌ Failed to refresh variables: {}", e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to refresh variables: {}", e),
            ))
        }
    }
}

/// Save refreshed variables to database
/// POST /api/t3-device/variables/:serial/save-refreshed
/// Body: { "items": [...] } - array of variable data from refresh response
pub async fn save_refreshed_variables(
    State(state): State<T3AppState>,
    Path(serial): Path<i32>,
    Json(payload): Json<SaveRefreshedDataRequest>,
) -> Result<Json<SaveResponse>, (StatusCode, String)> {
    info!("Saving {} refreshed variable(s) to database - Serial: {}", payload.items.len(), serial);

    // Get database connection from state
    let db_connection = match &state.t3_device_conn {
        Some(conn) => conn.lock().await.clone(),
        None => {
            error!("❌ T3000 device database unavailable");
            return Err((StatusCode::SERVICE_UNAVAILABLE, "T3000 device database unavailable".to_string()));
        }
    };

    // Save items to database
    let saved_count = match save_variables_to_db(&db_connection, serial, &payload.items).await {
        Ok(count) => count,
        Err(e) => {
            error!("❌ Failed to save variables to database: {}", e);
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to save to database: {}", e),
            ));
        }
    };

    info!("✅ Saved {} variable(s) to database", saved_count);
    Ok(Json(SaveResponse {
        success: true,
        message: format!("Saved {} variable(s) to database", saved_count),
        saved_count,
        timestamp: chrono::Utc::now().to_rfc3339(),
    }))
}

/// Save refreshed variables to database
async fn save_variables_to_db(
    db: &DatabaseConnection,
    serial: i32,
    items: &[Value],
) -> Result<i32, String> {
    let mut saved_count = 0;

    for item in items {
        // Extract variable index
        let variable_index = item.get("variableIndex")
            .or_else(|| item.get("variable_index"))
            .and_then(|v| v.as_i64())
            .map(|v| v as i32);

        if variable_index.is_none() {
            error!("⚠️ Skipping item without variableIndex: {:?}", item);
            continue;
        }
        let variable_index = variable_index.unwrap();

        // Find existing variable record
        let existing_variable = variable_points::Entity::find()
            .filter(variable_points::Column::SerialNumber.eq(serial))
            .filter(variable_points::Column::VariableIndex.eq(variable_index))
            .one(db)
            .await
            .map_err(|e| format!("Database query error: {}", e))?;

        if let Some(variable_model) = existing_variable {
            // Update existing record
            let mut active_model: variable_points::ActiveModel = variable_model.into();

            // Update fields from C++ response
            if let Some(val) = item.get("fullLabel").and_then(|v| v.as_str()) {
                active_model.full_label = Set(Some(val.to_string()));
            }
            if let Some(val) = item.get("label").and_then(|v| v.as_str()) {
                active_model.label = Set(Some(val.to_string()));
            }
            if let Some(val) = item.get("value").and_then(|v| v.as_f64()) {
                active_model.f_value = Set(Some(val.to_string()));
            }
            if let Some(val) = item.get("range").and_then(|v| v.as_i64()) {
                active_model.range_field = Set(Some(val.to_string()));
            }
            if let Some(val) = item.get("autoManual").or_else(|| item.get("auto_manual")).and_then(|v| v.as_i64()) {
                active_model.auto_manual = Set(Some(val.to_string()));
            }
            if let Some(val) = item.get("filter").and_then(|v| v.as_i64()) {
                active_model.filter_field = Set(Some(val.to_string()));
            }
            if let Some(val) = item.get("digitalAnalog").or_else(|| item.get("digital_analog")).and_then(|v| v.as_i64()) {
                active_model.digital_analog = Set(Some(val.to_string()));
            }
            if let Some(val) = item.get("calibration").and_then(|v| v.as_i64()) {
                active_model.calibration = Set(Some(val.to_string()));
            }
            if let Some(val) = item.get("sign").and_then(|v| v.as_i64()) {
                active_model.sign = Set(Some(val.to_string()));
            }
            if let Some(val) = item.get("status").and_then(|v| v.as_i64()) {
                active_model.status = Set(Some(val.to_string()));
            }

            // Save to database
            active_model.update(db).await
                .map_err(|e| format!("Failed to update variable: {}", e))?;

            saved_count += 1;
        } else {
            error!("⚠️ Variable record not found: serial={}, index={}", serial, variable_index);
        }
    }

    Ok(saved_count)
}

/// Call FFI function for refresh operations
async fn call_refresh_ffi(action: i32, refresh_json: Value) -> Result<String, String> {
    let input_str = refresh_json.to_string();

    info!("📤 Sending to C++ (Action 17): {}", input_str);

    // Run FFI call in blocking task
    let result = tokio::task::spawn_blocking(move || {
        // Prepare buffer for response
        const BUFFER_SIZE: usize = 1048576; // 1MB buffer
        let mut buffer: Vec<u8> = vec![0; BUFFER_SIZE];

        // Write input JSON to buffer
        let input_bytes = input_str.as_bytes();
        if input_bytes.len() >= BUFFER_SIZE {
            return Err("Input JSON too large for buffer".to_string());
        }

        buffer[..input_bytes.len()].copy_from_slice(input_bytes);
        buffer[input_bytes.len()] = 0; // Null terminator

        // Call the private FFI wrapper through winapi
        use winapi::um::libloaderapi::GetProcAddress;
        use winapi::shared::minwindef::HINSTANCE;

        unsafe {
            // Get function pointer (assumes already loaded by service)
            let current_module = std::ptr::null_mut();
            let func_name = CString::new("BacnetWebView_HandleWebViewMsg").unwrap();
            let func_ptr = GetProcAddress(current_module as HINSTANCE, func_name.as_ptr());

            if func_ptr.is_null() {
                return Err("BacnetWebView_HandleWebViewMsg not found".to_string());
            }

            type FfiFunc = unsafe extern "C" fn(i32, *mut c_char, i32) -> i32;
            let ffi_func: FfiFunc = std::mem::transmute(func_ptr);

            let result = ffi_func(
                action,
                buffer.as_mut_ptr() as *mut c_char,
                buffer.len() as i32,
            );

            match result {
                0 => {
                    // Success - read response from buffer
                    let null_pos = buffer.iter().position(|&b| b == 0).unwrap_or(buffer.len());
                    let response = String::from_utf8_lossy(&buffer[..null_pos]).to_string();
                    info!("📥 C++ Response (Action 17): {}", response);
                    Ok(response)
                }
                -2 => Err("MFC application not initialized".to_string()),
                code => Err(format!("FFI call failed with code: {}", code)),
            }
        }
    })
    .await
    .map_err(|e| format!("Task spawn error: {}", e))??;

    Ok(result)
}
