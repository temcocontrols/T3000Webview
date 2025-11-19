// Input Update API Routes
// Provides RESTful endpoints for updating input point data using UPDATE_WEBVIEW_LIST action

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
use crate::entity::t3_device::devices;
use sea_orm::*;

// Entry type constants matching C++ defines
const BAC_OUT: i32 = 0;
const BAC_IN: i32 = 1;
const BAC_VAR: i32 = 2;

/// Request payload for updating a single input field
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateInputFieldRequest {
    pub value: serde_json::Value,
}

/// Request payload for updating full input record
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateInputFullRequest {
    pub full_label: Option<String>,
    pub label: Option<String>,
    pub value: Option<f32>,
    pub range: Option<i32>,
    pub auto_manual: Option<i32>,
    pub control: Option<i32>,
    pub filter: Option<i32>,
    pub digital_analog: Option<i32>,
    pub calibration_sign: Option<i32>,
    pub calibration_h: Option<i32>,
    pub calibration_l: Option<i32>,
    pub decom: Option<i32>,
}

/// Standard API response structure
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiResponse {
    pub success: bool,
    pub message: String,
    pub data: Option<Value>,
}

/// Creates and returns the input update API routes
pub fn create_input_update_routes() -> Router<T3AppState> {
    Router::new()
        .route("/api/t3-device/inputs/:serial/:index", axum::routing::put(update_input_full))
}

/// Update full input record using UPDATE_WEBVIEW_LIST action (Action 16)
/// PUT /api/t3-device/inputs/:serial/:index
pub async fn update_input_full(
    State(state): State<T3AppState>,
    Path((serial, index_str)): Path<(i32, String)>,
    Json(payload): Json<UpdateInputFullRequest>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let index = index_str.parse::<i32>().unwrap_or(0);
    info!("UPDATE_WEBVIEW_LIST: Updating full input record - Serial: {}, Index: {}", serial, index);

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

    // Collect updated field names before moving payload
    let mut updated_fields = Vec::new();
    if payload.full_label.is_some() {
        updated_fields.push("fullLabel");
    }
    if payload.label.is_some() {
        updated_fields.push("label");
    }
    if payload.value.is_some() {
        updated_fields.push("value");
    }
    if payload.range.is_some() {
        updated_fields.push("range");
    }
    if payload.auto_manual.is_some() {
        updated_fields.push("autoManual");
    }
    if payload.control.is_some() {
        updated_fields.push("control");
    }

    // Prepare input JSON for UPDATE_WEBVIEW_LIST action
    // Note: C++ expects field names matching the structure
    let input_json = json!({
        "action": 16,  // UPDATE_WEBVIEW_LIST
        "panelId": panel_id,
        "serialNumber": serial,
        "entryType": BAC_IN,  // 1 = INPUT
        "entryIndex": index,
        "control": payload.control.unwrap_or(0),
        "value": payload.value.unwrap_or(0.0),
        "description": payload.full_label.unwrap_or_default(),
        "label": payload.label.unwrap_or_default(),
        "range": payload.range.unwrap_or(0),
        "auto_manual": payload.auto_manual.unwrap_or(0),
        "filter": payload.filter.unwrap_or(0),
        "digital_analog": payload.digital_analog.unwrap_or(0),
        "calibration_sign": payload.calibration_sign.unwrap_or(0),
        "calibration_h": payload.calibration_h.unwrap_or(0),
        "calibration_l": payload.calibration_l.unwrap_or(0),
        "decom": payload.decom.unwrap_or(0),
    });

    // Call FFI function
    match call_update_ffi(16, input_json).await {
        Ok(_response) => {
            info!("✅ Full input record updated successfully");
            Ok(Json(json!({
                "success": true,
                "message": "Input point updated successfully",
                "data": {
                    "serialNumber": serial,
                    "inputIndex": index,
                    "updatedFields": updated_fields,
                    "timestamp": chrono::Utc::now().to_rfc3339()
                }
            })))
        }
        Err(e) => {
            error!("❌ Failed to update full input record: {}", e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to update input record: {}", e),
            ))
        }
    }
}

/// Call FFI function for update operations
async fn call_update_ffi(action: i32, input_json: Value) -> Result<String, String> {
    let input_str = input_json.to_string();

    info!("📤 Sending to C++: {}", input_str);

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
                    info!("📥 C++ Response: {}", response);
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
