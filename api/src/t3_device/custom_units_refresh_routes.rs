// Custom Units Refresh API Routes
// Provides RESTful endpoints for refreshing custom unit data using REFRESH_WEBVIEW_LIST action

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
use crate::entity::t3_device::{devices, custom_units};
use crate::t3_device::t3_ffi_sync_service::WebViewMessageType;
use sea_orm::*;

// Entry type constants matching C++ defines
// ENUM_UNIT = 13 (from ud_str.h line 22)
const BAC_UNIT: i32 = 13;

/// Request payload for refreshing a single custom unit (index is optional)
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RefreshCustomUnitRequest {
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

/// Creates and returns the custom unit refresh API routes
pub fn create_custom_units_refresh_routes() -> Router<T3AppState> {
    Router::new()
        .route("/custom-units/:serial/refresh", axum::routing::post(refresh_custom_units))
        .route("/custom-units/:serial/save-refreshed", axum::routing::post(save_refreshed_custom_units))
}

/// Refresh custom unit(s) from device using REFRESH_WEBVIEW_LIST action (Action 17)
/// POST /api/t3-device/custom-units/:serial/refresh
/// Body: { "index": 5 } for single item, or {} for all items
/// Returns the raw data from device without saving to database
pub async fn refresh_custom_units(
    State(state): State<T3AppState>,
    Path(serial): Path<i32>,
    Json(payload): Json<RefreshCustomUnitRequest>,
) -> Result<Json<RefreshResponse>, (StatusCode, String)> {
    match payload.index {
        Some(idx) => {
            info!("REFRESH_WEBVIEW_LIST: Refreshing single custom unit - Serial: {}, Index: {}", serial, idx);
        }
        None => {
            info!("REFRESH_WEBVIEW_LIST: Refreshing all custom units - Serial: {}", serial);
        }
    }

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

    let mut refresh_json = json!({
        "action": WebViewMessageType::REFRESH_WEBVIEW_LIST as i32,
        "panelId": panel_id,
        "serialNumber": serial,
        "entryType": BAC_UNIT,  // 13 = UNIT
    });

    if let Some(idx) = payload.index {
        refresh_json["entryIndex"] = json!(idx);
    }

    match call_refresh_ffi(WebViewMessageType::REFRESH_WEBVIEW_LIST as i32, refresh_json).await {
        Ok(response) => {
            let response_json: Value = match serde_json::from_str(&response) {
                Ok(json) => json,
                Err(e) => {
                    error!("❌ Failed to parse C++ response: {}", e);
                    return Err((StatusCode::INTERNAL_SERVER_ERROR, format!("Invalid response from device: {}", e)));
                }
            };

            let success = response_json.get("success").and_then(|v| v.as_bool()).unwrap_or(false);
            if !success {
                let error_msg = response_json.get("message").and_then(|v| v.as_str()).unwrap_or("Unknown error from device");
                let debug_msg = response_json.get("debug").and_then(|v| v.as_str()).unwrap_or("");

                if debug_msg.contains("empty response") || error_msg.contains("not implemented") {
                    error!("❌ Action 17 not implemented in C++ for custom units: {}", debug_msg);
                    return Err((StatusCode::NOT_IMPLEMENTED, "REFRESH_WEBVIEW_LIST (Action 17) for custom units is not yet implemented in C++.".to_string()));
                }

                error!("❌ Device refresh failed: {}", error_msg);
                return Err((StatusCode::INTERNAL_SERVER_ERROR, format!("{}", error_msg)));
            }

            let items = response_json.get("items").and_then(|v| v.as_array()).map(|arr| arr.clone()).unwrap_or_default();
            let count = items.len() as i32;

            info!("✅ Refreshed {} custom unit(s) from device", count);
            Ok(Json(RefreshResponse {
                success: true,
                message: format!("Refreshed {} custom unit(s) from device", count),
                items,
                count,
                timestamp: chrono::Utc::now().to_rfc3339(),
            }))
        }
        Err(e) => {
            error!("❌ Failed to refresh custom units: {}", e);
            if e.contains("not implemented") || e.contains("empty response") {
                return Err((StatusCode::NOT_IMPLEMENTED, "REFRESH_WEBVIEW_LIST (Action 17) for custom units is not yet implemented in C++.".to_string()));
            }
            Err((StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to refresh custom units: {}", e)))
        }
    }
}

/// Save refreshed custom units to database
pub async fn save_refreshed_custom_units(
    State(state): State<T3AppState>,
    Path(serial): Path<i32>,
    Json(payload): Json<SaveRefreshedDataRequest>,
) -> Result<Json<SaveResponse>, (StatusCode, String)> {
    info!("Saving {} refreshed custom unit(s) to database - Serial: {}", payload.items.len(), serial);

    let db_connection = match &state.t3_device_conn {
        Some(conn) => conn.lock().await.clone(),
        None => {
            error!("❌ T3000 device database unavailable");
            return Err((StatusCode::SERVICE_UNAVAILABLE, "T3000 device database unavailable".to_string()));
        }
    };

    let saved_count = match save_custom_units_to_db(&db_connection, serial, &payload.items).await {
        Ok(count) => count,
        Err(e) => {
            error!("❌ Failed to save custom units to database: {}", e);
            return Err((StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to save to database: {}", e)));
        }
    };

    info!("✅ Saved {} custom unit(s) to database", saved_count);
    Ok(Json(SaveResponse {
        success: true,
        message: format!("Saved {} custom unit(s) to database", saved_count),
        saved_count,
        timestamp: chrono::Utc::now().to_rfc3339(),
    }))
}

async fn save_custom_units_to_db(db: &DatabaseConnection, serial: i32, items: &[Value]) -> Result<i32, String> {
    let mut saved_count = 0;

    for item in items {
        let unit_index = item.get("unitIndex").or_else(|| item.get("unit_index")).and_then(|v| v.as_i64()).map(|v| v as i32);
        if unit_index.is_none() {
            error!("⚠️ Skipping item without unitIndex: {:?}", item);
            continue;
        }
        let unit_index = unit_index.unwrap();

        let existing_unit = custom_units::Entity::find()
            .filter(custom_units::Column::SerialNumber.eq(serial))
            .filter(custom_units::Column::UnitIndex.eq(unit_index.to_string()))
            .one(db)
            .await
            .map_err(|e| format!("Database query error: {}", e))?;

        if let Some(unit_model) = existing_unit {
            let mut active_model: custom_units::ActiveModel = unit_model.into();

            if let Some(val) = item.get("unitType").or_else(|| item.get("unit_type")).and_then(|v| v.as_str()) {
                active_model.unit_type = Set(Some(val.to_string()));
            }
            if let Some(val) = item.get("direct").and_then(|v| v.as_i64()) {
                active_model.direct = Set(Some(val as i32));
            }
            if let Some(val) = item.get("digitalUnitsOff").or_else(|| item.get("digital_units_off")).and_then(|v| v.as_str()) {
                active_model.digital_units_off = Set(Some(val.to_string()));
            }
            if let Some(val) = item.get("digitalUnitsOn").or_else(|| item.get("digital_units_on")).and_then(|v| v.as_str()) {
                active_model.digital_units_on = Set(Some(val.to_string()));
            }
            if let Some(val) = item.get("analogUnitName").or_else(|| item.get("analog_unit_name")).and_then(|v| v.as_str()) {
                active_model.analog_unit_name = Set(Some(val.to_string()));
            }

            active_model.update(db).await.map_err(|e| format!("Failed to update custom unit: {}", e))?;
            saved_count += 1;
        } else {
            let new_unit = custom_units::ActiveModel {
                serial_number: Set(serial),
                unit_id: Set(None),
                unit_index: Set(Some(unit_index.to_string())),
                panel: Set(None),
                unit_type: Set(item.get("unitType").or_else(|| item.get("unit_type")).and_then(|v| v.as_str()).map(|s| s.to_string())),
                direct: Set(item.get("direct").and_then(|v| v.as_i64()).map(|v| v as i32)),
                digital_units_off: Set(item.get("digitalUnitsOff").or_else(|| item.get("digital_units_off")).and_then(|v| v.as_str()).map(|s| s.to_string())),
                digital_units_on: Set(item.get("digitalUnitsOn").or_else(|| item.get("digital_units_on")).and_then(|v| v.as_str()).map(|s| s.to_string())),
                analog_unit_name: Set(item.get("analogUnitName").or_else(|| item.get("analog_unit_name")).and_then(|v| v.as_str()).map(|s| s.to_string())),
                status: Set(None),
            };

            new_unit.insert(db).await.map_err(|e| format!("Failed to insert custom unit: {}", e))?;
            saved_count += 1;
        }
    }

    Ok(saved_count)
}

async fn call_refresh_ffi(action: i32, refresh_json: Value) -> Result<String, String> {
    use crate::t3_device::t3_ffi_sync_service::load_t3000_function;

    let input_str = refresh_json.to_string();
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
