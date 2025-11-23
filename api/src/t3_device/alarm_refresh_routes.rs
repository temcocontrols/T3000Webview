// Alarm Refresh API Routes
// Provides RESTful endpoints for refreshing alarm data using REFRESH_WEBVIEW_LIST action

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
use crate::entity::t3_device::{devices, alarms};
use crate::t3_device::t3_ffi_sync_service::WebViewMessageType;
use sea_orm::*;

// Entry type constants matching C++ defines
const BAC_ALM: i32 = 9;

/// Request payload for refreshing a single alarm (index is optional)
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RefreshAlarmRequest {
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

/// Creates and returns the alarm refresh API routes
pub fn create_alarm_refresh_routes() -> Router<T3AppState> {
    Router::new()
        .route("/alarms/:serial/refresh", axum::routing::post(refresh_alarms))
        .route("/alarms/:serial/save-refreshed", axum::routing::post(save_refreshed_alarms))
}

/// Refresh alarm(s) from device using REFRESH_WEBVIEW_LIST action (Action 17)
pub async fn refresh_alarms(
    State(state): State<T3AppState>,
    Path(serial): Path<i32>,
    Json(payload): Json<RefreshAlarmRequest>,
) -> Result<Json<RefreshResponse>, (StatusCode, String)> {
    match payload.index {
        Some(idx) => {
            info!("REFRESH_WEBVIEW_LIST: Refreshing single alarm - Serial: {}, Index: {}", serial, idx);
        }
        None => {
            info!("REFRESH_WEBVIEW_LIST: Refreshing all alarms - Serial: {}", serial);
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
        "entryType": BAC_ALM,
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
                    error!("❌ Action 17 not implemented in C++: {}", debug_msg);
                    return Err((StatusCode::NOT_IMPLEMENTED, "REFRESH_WEBVIEW_LIST (Action 17) not yet implemented in C++".to_string()));
                }

                error!("❌ Device refresh failed: {}", error_msg);
                return Err((StatusCode::INTERNAL_SERVER_ERROR, format!("{}", error_msg)));
            }

            let items = response_json.get("items").and_then(|v| v.as_array()).map(|arr| arr.clone()).unwrap_or_default();
            let count = items.len() as i32;

            info!("✅ Refreshed {} alarm(s) from device", count);
            Ok(Json(RefreshResponse {
                success: true,
                message: format!("Refreshed {} alarm(s) from device", count),
                items,
                count,
                timestamp: chrono::Utc::now().to_rfc3339(),
            }))
        }
        Err(e) => {
            error!("❌ Failed to refresh alarms: {}", e);
            if e.contains("not implemented") || e.contains("empty response") {
                return Err((StatusCode::NOT_IMPLEMENTED, "REFRESH_WEBVIEW_LIST (Action 17) not yet implemented in C++".to_string()));
            }
            Err((StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to refresh alarms: {}", e)))
        }
    }
}

/// Save refreshed alarms to database
pub async fn save_refreshed_alarms(
    State(state): State<T3AppState>,
    Path(serial): Path<i32>,
    Json(payload): Json<SaveRefreshedDataRequest>,
) -> Result<Json<SaveResponse>, (StatusCode, String)> {
    info!("Saving {} refreshed alarm(s) to database - Serial: {}", payload.items.len(), serial);

    let db_connection = match &state.t3_device_conn {
        Some(conn) => conn.lock().await.clone(),
        None => {
            error!("❌ T3000 device database unavailable");
            return Err((StatusCode::SERVICE_UNAVAILABLE, "T3000 device database unavailable".to_string()));
        }
    };

    let saved_count = match save_alarms_to_db(&db_connection, serial, &payload.items).await {
        Ok(count) => count,
        Err(e) => {
            error!("❌ Failed to save alarms to database: {}", e);
            return Err((StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to save to database: {}", e)));
        }
    };

    info!("✅ Saved {} alarm(s) to database", saved_count);
    Ok(Json(SaveResponse {
        success: true,
        message: format!("Saved {} alarm(s) to database", saved_count),
        saved_count,
        timestamp: chrono::Utc::now().to_rfc3339(),
    }))
}

async fn save_alarms_to_db(db: &DatabaseConnection, serial: i32, items: &[Value]) -> Result<i32, String> {
    let mut saved_count = 0;

    for item in items {
        let alarm_index = item.get("alarmId")
            .or_else(|| item.get("alarm_id"))
            .and_then(|v| v.as_i64())
            .map(|v| v as i32);

        if alarm_index.is_none() {
            error!("⚠️ Skipping item without alarmId: {:?}", item);
            continue;
        }
        let alarm_index = alarm_index.unwrap();

        let existing_alarm = alarms::Entity::find()
            .filter(alarms::Column::SerialNumber.eq(serial))
            .filter(alarms::Column::AlarmId.eq(alarm_index.to_string()))
            .one(db)
            .await
            .map_err(|e| format!("Database query error: {}", e))?;

        if let Some(alarm_model) = existing_alarm {
            let mut active_model: alarms::ActiveModel = alarm_model.into();

            if let Some(val) = item.get("panel").and_then(|v| v.as_str()) {
                active_model.panel = Set(Some(val.to_string()));
            }
            if let Some(val) = item.get("message").and_then(|v| v.as_str()) {
                active_model.message = Set(Some(val.to_string()));
            }
            if let Some(val) = item.get("status").and_then(|v| v.as_i64()) {
                active_model.status = Set(Some(val.to_string()));
            }
            if let Some(val) = item.get("priority").and_then(|v| v.as_i64()) {
                active_model.priority = Set(Some(val.to_string()));
            }
            if let Some(val) = item.get("acknowledged").and_then(|v| v.as_i64()) {
                active_model.acknowledged = Set(Some(val.to_string()));
            }
            if let Some(val) = item.get("timeStamp").or_else(|| item.get("time_stamp")).and_then(|v| v.as_str()) {
                active_model.time_stamp = Set(Some(val.to_string()));
            }

            active_model.update(db).await.map_err(|e| format!("Failed to update alarm: {}", e))?;
            saved_count += 1;
        } else {
            error!("⚠️ Alarm record not found: serial={}, alarm_id={}", serial, alarm_index);
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
    }).await
    .map_err(|e| format!("Failed to check T3000 functions: {}", e))?
    .map_err(|e| e)?;

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
    })
    .await
    .map_err(|e| format!("Task spawn error: {}", e))?
}
