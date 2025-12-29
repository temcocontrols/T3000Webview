// TrendLog Refresh API Routes
// Provides RESTful endpoints for refreshing trendlog data using GET_WEBVIEW_LIST action

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
use crate::entity::t3_device::{devices, trendlogs};
use crate::t3_device::t3_ffi_sync_service::WebViewMessageType;
use sea_orm::*;

// Entry type constants matching C++ defines
const BAC_TREND: i32 = 10;

/// Request payload for refreshing a single trendlog (index is optional)
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RefreshTrendlogRequest {
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

/// Creates and returns the trendlog refresh API routes
pub fn create_trendlog_refresh_routes() -> Router<T3AppState> {
    Router::new()
        .route("/trendlogs/:serial/refresh", axum::routing::post(refresh_trendlogs))
        .route("/trendlogs/:serial/save-refreshed", axum::routing::post(save_refreshed_trendlogs))
}

/// Refresh trendlog(s) from device using GET_WEBVIEW_LIST action (Action 17)
pub async fn refresh_trendlogs(
    State(state): State<T3AppState>,
    Path(serial): Path<i32>,
    Json(payload): Json<RefreshTrendlogRequest>,
) -> Result<Json<RefreshResponse>, (StatusCode, String)> {
    match payload.index {
        Some(idx) => {
            info!("GET_WEBVIEW_LIST: Refreshing single trendlog - Serial: {}, Index: {}", serial, idx);
        }
        None => {
            info!("GET_WEBVIEW_LIST: Refreshing all trendlogs - Serial: {}", serial);
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
        "action": WebViewMessageType::GET_WEBVIEW_LIST as i32,
        "panelId": panel_id,
        "serialNumber": serial,
        "entryType": BAC_TREND,
    });

    if let Some(idx) = payload.index {
        refresh_json["entryIndex"] = json!(idx);
    }

    match call_refresh_ffi(WebViewMessageType::GET_WEBVIEW_LIST as i32, refresh_json).await {
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
                    return Err((StatusCode::NOT_IMPLEMENTED, "GET_WEBVIEW_LIST (Action 17) not yet implemented in C++".to_string()));
                }

                error!("❌ Device refresh failed: {}", error_msg);
                return Err((StatusCode::INTERNAL_SERVER_ERROR, format!("{}", error_msg)));
            }

            let items = response_json.get("items").and_then(|v| v.as_array()).map(|arr| arr.clone()).unwrap_or_default();
            let count = items.len() as i32;

            info!("✅ Refreshed {} trendlog(s) from device", count);
            Ok(Json(RefreshResponse {
                success: true,
                message: format!("Refreshed {} trendlog(s) from device", count),
                items,
                count,
                timestamp: chrono::Utc::now().to_rfc3339(),
            }))
        }
        Err(e) => {
            error!("❌ Failed to refresh trendlogs: {}", e);
            if e.contains("not implemented") || e.contains("empty response") {
                return Err((StatusCode::NOT_IMPLEMENTED, "GET_WEBVIEW_LIST (Action 17) not yet implemented in C++".to_string()));
            }
            Err((StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to refresh trendlogs: {}", e)))
        }
    }
}

/// Save refreshed trendlogs to database
pub async fn save_refreshed_trendlogs(
    State(state): State<T3AppState>,
    Path(serial): Path<i32>,
    Json(payload): Json<SaveRefreshedDataRequest>,
) -> Result<Json<SaveResponse>, (StatusCode, String)> {
    info!("Saving {} refreshed trendlog(s) to database - Serial: {}", payload.items.len(), serial);

    let db_connection = match &state.t3_device_conn {
        Some(conn) => conn.lock().await.clone(),
        None => {
            error!("❌ T3000 device database unavailable");
            return Err((StatusCode::SERVICE_UNAVAILABLE, "T3000 device database unavailable".to_string()));
        }
    };

    let saved_count = match save_trendlogs_to_db(&db_connection, serial, &payload.items).await {
        Ok(count) => count,
        Err(e) => {
            error!("❌ Failed to save trendlogs to database: {}", e);
            return Err((StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to save to database: {}", e)));
        }
    };

    info!("✅ Saved {} trendlog(s) to database", saved_count);
    Ok(Json(SaveResponse {
        success: true,
        message: format!("Saved {} trendlog(s) to database", saved_count),
        saved_count,
        timestamp: chrono::Utc::now().to_rfc3339(),
    }))
}

async fn save_trendlogs_to_db(db: &DatabaseConnection, serial: i32, items: &[Value]) -> Result<i32, String> {
    let mut saved_count = 0;

    for item in items {
        let trendlog_index = item.get("trendlogId")
            .or_else(|| item.get("trendlog_id"))
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());

        if trendlog_index.is_none() {
            error!("⚠️ Skipping item without trendlogId: {:?}", item);
            continue;
        }
        let trendlog_index = trendlog_index.unwrap();

        let existing_trendlog = trendlogs::Entity::find()
            .filter(trendlogs::Column::SerialNumber.eq(serial))
            .filter(trendlogs::Column::TrendlogId.eq(&trendlog_index))
            .one(db)
            .await
            .map_err(|e| format!("Database query error: {}", e))?;

        if let Some(trendlog_model) = existing_trendlog {
            let mut active_model: trendlogs::ActiveModel = trendlog_model.into();

            if let Some(val) = item.get("trendlogLabel").or_else(|| item.get("trendlog_label")).and_then(|v| v.as_str()) {
                active_model.trendlog_label = Set(Some(val.to_string()));
            }
            if let Some(val) = item.get("intervalSeconds").or_else(|| item.get("interval_seconds")).and_then(|v| v.as_i64()) {
                active_model.interval_seconds = Set(Some(val as i32));
            }
            if let Some(val) = item.get("bufferSize").or_else(|| item.get("buffer_size")).and_then(|v| v.as_i64()) {
                active_model.buffer_size = Set(Some(val as i32));
            }
            if let Some(val) = item.get("autoManual").or_else(|| item.get("auto_manual")).and_then(|v| v.as_str()) {
                active_model.auto_manual = Set(Some(val.to_string()));
            }
            if let Some(val) = item.get("status").and_then(|v| v.as_str()) {
                active_model.status = Set(Some(val.to_string()));
            }

            active_model.update(db).await.map_err(|e| format!("Failed to update trendlog: {}", e))?;
            saved_count += 1;
        } else {
            error!("⚠️ Trendlog record not found: serial={}, trendlog_id={}", serial, trendlog_index);
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
