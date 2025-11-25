// Custom Units Update API Routes
// Provides RESTful endpoints for updating custom unit data using UPDATE_WEBVIEW_LIST action

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
use crate::entity::t3_device::devices;
use crate::t3_device::t3_ffi_sync_service::WebViewMessageType;
use sea_orm::*;

// Entry type constants matching C++ defines
// ENUM_UNIT = 13 (from ud_str.h line 22)
const BAC_UNIT: i32 = 13;

/// Request payload for updating full custom unit record
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateCustomUnitFullRequest {
    pub unit_type: Option<String>,
    pub direct: Option<i32>,
    pub digital_units_off: Option<String>,
    pub digital_units_on: Option<String>,
    pub analog_unit_name: Option<String>,
}

/// Standard API response structure
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiResponse {
    pub success: bool,
    pub message: String,
    pub data: Option<Value>,
}

/// Creates and returns the custom unit update API routes
pub fn create_custom_units_update_routes() -> Router<T3AppState> {
    Router::new()
        .route("/custom-units/:serial/:index", axum::routing::put(update_custom_unit_full))
}

/// Update full custom unit record using UPDATE_WEBVIEW_LIST action (Action 16)
/// PUT /api/t3-device/custom-units/:serial/:index
pub async fn update_custom_unit_full(
    State(state): State<T3AppState>,
    Path((serial, index_str)): Path<(i32, String)>,
    Json(payload): Json<UpdateCustomUnitFullRequest>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let index = index_str.parse::<i32>().unwrap_or(0);
    info!("UPDATE_WEBVIEW_LIST: Updating full custom unit record - Serial: {}, Index: {}", serial, index);

    let db_connection = match &state.t3_device_conn {
        Some(conn) => conn.lock().await.clone(),
        None => {
            error!("❌ T3000 device database unavailable");
            return Err((StatusCode::SERVICE_UNAVAILABLE, "T3000 device database unavailable".to_string()));
        }
    };

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

    let mut updated_fields = Vec::new();
    if payload.unit_type.is_some() { updated_fields.push("unitType"); }
    if payload.direct.is_some() { updated_fields.push("direct"); }
    if payload.digital_units_off.is_some() { updated_fields.push("digitalUnitsOff"); }
    if payload.digital_units_on.is_some() { updated_fields.push("digitalUnitsOn"); }
    if payload.analog_unit_name.is_some() { updated_fields.push("analogUnitName"); }

    let input_json = json!({
        "action": WebViewMessageType::UPDATE_WEBVIEW_LIST as i32,
        "panelId": panel_id,
        "serialNumber": serial,
        "entryType": BAC_UNIT,  // 13 = UNIT
        "entryIndex": index,
        "unit_type": payload.unit_type.unwrap_or_default(),
        "direct": payload.direct.unwrap_or(0),
        "digital_units_off": payload.digital_units_off.unwrap_or_default(),
        "digital_units_on": payload.digital_units_on.unwrap_or_default(),
        "analog_unit_name": payload.analog_unit_name.unwrap_or_default(),
    });

    match call_update_ffi(WebViewMessageType::UPDATE_WEBVIEW_LIST as i32, input_json).await {
        Ok(_response) => {
            info!("✅ Full custom unit record updated successfully");
            Ok(Json(json!({
                "success": true,
                "message": "Custom unit updated successfully",
                "data": {
                    "serialNumber": serial,
                    "unitIndex": index,
                    "updatedFields": updated_fields,
                }
            })))
        }
        Err(e) => {
            error!("❌ Failed to update custom unit: {}", e);
            if e.contains("not implemented") || e.contains("empty response") {
                return Err((StatusCode::NOT_IMPLEMENTED, "UPDATE_WEBVIEW_LIST (Action 16) for custom units is not yet implemented in C++.".to_string()));
            }
            Err((StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to update custom unit: {}", e)))
        }
    }
}

async fn call_update_ffi(action: i32, input_json: Value) -> Result<String, String> {
    use crate::t3_device::t3_ffi_sync_service::load_t3000_function;

    let input_str = input_json.to_string();
    info!("📤 Sending to C++ (Action {}): {}", action, input_str);

    tokio::task::spawn_blocking(|| {
        unsafe {
            if !load_t3000_function() {
                return Err("T3000 functions not loaded".to_string());
            }
        }
        Ok(())
    }).await.map_err(|e| format!("Failed to check T3000 functions: {}", e))?.map_err(|e| e)?;

    tokio::task::spawn_blocking(move || {
        use crate::t3_device::t3_ffi_sync_service::BACNETWEBVIEW_HANDLE_WEBVIEW_MSG_FN;

        const BUFFER_SIZE: usize = 1048576;
        let mut buffer: Vec<u8> = vec![0; BUFFER_SIZE];

        let input_bytes = input_str.as_bytes();
        if input_bytes.len() >= BUFFER_SIZE {
            return Err("Input JSON too large for buffer".to_string());
        }

        buffer[..input_bytes.len()].copy_from_slice(input_bytes);
        buffer[input_bytes.len()] = 0;

        unsafe {
            if let Some(func) = BACNETWEBVIEW_HANDLE_WEBVIEW_MSG_FN {
                let result = func(action, buffer.as_mut_ptr() as *mut std::os::raw::c_char, buffer.len() as i32);

                match result {
                    0 => {
                        let null_pos = buffer.iter().position(|&b| b == 0).unwrap_or(buffer.len());
                        let response = String::from_utf8_lossy(&buffer[..null_pos]).to_string();
                        info!("📥 C++ Response (Action {}): {}", action, response);

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
    }).await.map_err(|e| format!("Task spawn error: {}", e))?
}
