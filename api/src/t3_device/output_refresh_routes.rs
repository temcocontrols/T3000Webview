// Output Refresh API Routes
// Provides RESTful endpoints for refreshing output point data using REFRESH_WEBVIEW_LIST action

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
use crate::entity::t3_device::{devices, output_points};
use sea_orm::*;

// Entry type constants matching C++ defines
const BAC_OUT: i32 = 0;

/// Request payload for refreshing a single output (index is optional)
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RefreshOutputRequest {
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

/// Creates and returns the output refresh API routes
pub fn create_output_refresh_routes() -> Router<T3AppState> {
    Router::new()
        .route("/outputs/:serial/refresh", axum::routing::post(refresh_outputs))
        .route("/outputs/:serial/save-refreshed", axum::routing::post(save_refreshed_outputs))
}

/// Refresh output(s) from device using REFRESH_WEBVIEW_LIST action (Action 17)
/// POST /api/t3-device/outputs/:serial/refresh
/// Body: { "index": 5 } for single item, or {} for all items
/// Returns the raw data from device without saving to database
pub async fn refresh_outputs(
    State(state): State<T3AppState>,
    Path(serial): Path<i32>,
    Json(payload): Json<RefreshOutputRequest>,
) -> Result<Json<RefreshResponse>, (StatusCode, String)> {
    match payload.index {
        Some(idx) => {
            info!("REFRESH_WEBVIEW_LIST: Refreshing single output - Serial: {}, Index: {}", serial, idx);
        }
        None => {
            info!("REFRESH_WEBVIEW_LIST: Refreshing all outputs - Serial: {}", serial);
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
        "entryType": BAC_OUT,  // 0 = OUTPUT
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

            info!("✅ Refreshed {} output(s) from device", count);
            Ok(Json(RefreshResponse {
                success: true,
                message: format!("Refreshed {} output(s) from device", count),
                items,
                count,
                timestamp: chrono::Utc::now().to_rfc3339(),
            }))
        }
        Err(e) => {
            error!("❌ Failed to refresh outputs: {}", e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to refresh outputs: {}", e),
            ))
        }
    }
}

/// Save refreshed outputs to database
/// POST /api/t3-device/outputs/:serial/save-refreshed
/// Body: { "items": [...] } - array of output data from refresh response
pub async fn save_refreshed_outputs(
    State(state): State<T3AppState>,
    Path(serial): Path<i32>,
    Json(payload): Json<SaveRefreshedDataRequest>,
) -> Result<Json<SaveResponse>, (StatusCode, String)> {
    info!("Saving {} refreshed output(s) to database - Serial: {}", payload.items.len(), serial);

    // Get database connection from state
    let db_connection = match &state.t3_device_conn {
        Some(conn) => conn.lock().await.clone(),
        None => {
            error!("❌ T3000 device database unavailable");
            return Err((StatusCode::SERVICE_UNAVAILABLE, "T3000 device database unavailable".to_string()));
        }
    };

    // Save items to database
    let saved_count = match save_outputs_to_db(&db_connection, serial, &payload.items).await {
        Ok(count) => count,
        Err(e) => {
            error!("❌ Failed to save outputs to database: {}", e);
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to save to database: {}", e),
            ));
        }
    };

    info!("✅ Saved {} output(s) to database", saved_count);
    Ok(Json(SaveResponse {
        success: true,
        message: format!("Saved {} output(s) to database", saved_count),
        saved_count,
        timestamp: chrono::Utc::now().to_rfc3339(),
    }))
}

/// Save refreshed outputs to database
async fn save_outputs_to_db(
    db: &DatabaseConnection,
    serial: i32,
    items: &[Value],
) -> Result<i32, String> {
    let mut saved_count = 0;

    for item in items {
        // Extract output index
        let output_index = item.get("outputIndex")
            .or_else(|| item.get("output_index"))
            .and_then(|v| v.as_i64())
            .map(|v| v as i32);

        if output_index.is_none() {
            error!("⚠️ Skipping item without outputIndex: {:?}", item);
            continue;
        }
        let output_index = output_index.unwrap();

        // Find existing output record
        let existing_output = output_points::Entity::find()
            .filter(output_points::Column::SerialNumber.eq(serial))
            .filter(output_points::Column::OutputIndex.eq(output_index))
            .one(db)
            .await
            .map_err(|e| format!("Database query error: {}", e))?;

        if let Some(output_model) = existing_output {
            // Update existing record
            let mut active_model: output_points::ActiveModel = output_model.into();

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
                .map_err(|e| format!("Failed to update output: {}", e))?;

            saved_count += 1;
        } else {
            error!("⚠️ Output record not found: serial={}, index={}", serial, output_index);
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
