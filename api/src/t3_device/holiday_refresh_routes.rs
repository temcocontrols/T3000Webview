// Holiday Refresh API Routes
// Provides RESTful endpoints for refreshing holiday data using REFRESH_WEBVIEW_LIST action

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
use crate::entity::t3_device::{devices, holidays};
use crate::t3_device::t3_ffi_sync_service::WebViewMessageType;
use sea_orm::*;

// Entry type constants matching C++ defines
const BAC_HOL: i32 = 8;

/// Request payload for refreshing a single holiday (index is optional)
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RefreshHolidayRequest {
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

/// Creates and returns the holiday refresh API routes
pub fn create_holiday_refresh_routes() -> Router<T3AppState> {
    Router::new()
        .route("/holidays/:serial/refresh", axum::routing::post(refresh_holidays))
        .route("/holidays/:serial/save-refreshed", axum::routing::post(save_refreshed_holidays))
}

/// Refresh holiday(s) from device using REFRESH_WEBVIEW_LIST action (Action 17)
/// POST /api/t3-device/holidays/:serial/refresh
/// Body: { "index": 1 } for single item, or {} for all items
/// Returns the raw data from device without saving to database
pub async fn refresh_holidays(
    State(state): State<T3AppState>,
    Path(serial): Path<i32>,
    Json(payload): Json<RefreshHolidayRequest>,
) -> Result<Json<RefreshResponse>, (StatusCode, String)> {
    match payload.index {
        Some(idx) => {
            info!("REFRESH_WEBVIEW_LIST: Refreshing single holiday - Serial: {}, Index: {}", serial, idx);
        }
        None => {
            info!("REFRESH_WEBVIEW_LIST: Refreshing all holidays - Serial: {}", serial);
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
        "action": WebViewMessageType::REFRESH_WEBVIEW_LIST as i32,
        "panelId": panel_id,
        "serialNumber": serial,
        "entryType": BAC_HOL,  // 8 = HOLIDAY
    });

    // Add entryIndex only if specified (omit for refresh all)
    if let Some(idx) = payload.index {
        refresh_json["entryIndex"] = json!(idx);
    }

    // Call FFI function
    match call_refresh_ffi(WebViewMessageType::REFRESH_WEBVIEW_LIST as i32, refresh_json).await {
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
                        "REFRESH_WEBVIEW_LIST (Action 17) is not yet implemented in C++. Please add case 17 to BacnetWebView_HandleWebViewMsg in T3000.exe".to_string(),
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

            info!("✅ Refreshed {} holiday(s) from device", count);
            Ok(Json(RefreshResponse {
                success: true,
                message: format!("Refreshed {} holiday(s) from device", count),
                items,
                count,
                timestamp: chrono::Utc::now().to_rfc3339(),
            }))
        }
        Err(e) => {
            error!("❌ Failed to refresh holidays: {}", e);

            // Provide helpful message if C++ hasn't implemented this action yet
            if e.contains("not implemented") || e.contains("empty response") {
                return Err((
                    StatusCode::NOT_IMPLEMENTED,
                    "REFRESH_WEBVIEW_LIST (Action 17) is not yet implemented in C++. Please implement BacnetWebView_HandleWebViewMsg case 17 in T3000.exe".to_string(),
                ));
            }

            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to refresh holidays: {}", e),
            ))
        }
    }
}

/// Save refreshed holidays to database
/// POST /api/t3-device/holidays/:serial/save-refreshed
/// Body: { "items": [...] } - array of holiday data from refresh response
pub async fn save_refreshed_holidays(
    State(state): State<T3AppState>,
    Path(serial): Path<i32>,
    Json(payload): Json<SaveRefreshedDataRequest>,
) -> Result<Json<SaveResponse>, (StatusCode, String)> {
    info!("Saving {} refreshed holiday(s) to database - Serial: {}", payload.items.len(), serial);

    // Get database connection from state
    let db_connection = match &state.t3_device_conn {
        Some(conn) => conn.lock().await.clone(),
        None => {
            error!("❌ T3000 device database unavailable");
            return Err((StatusCode::SERVICE_UNAVAILABLE, "T3000 device database unavailable".to_string()));
        }
    };

    // Save items to database
    let saved_count = match save_holidays_to_db(&db_connection, serial, &payload.items).await {
        Ok(count) => count,
        Err(e) => {
            error!("❌ Failed to save holidays to database: {}", e);
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to save to database: {}", e),
            ));
        }
    };

    info!("✅ Saved {} holiday(s) to database", saved_count);
    Ok(Json(SaveResponse {
        success: true,
        message: format!("Saved {} holiday(s) to database", saved_count),
        saved_count,
        timestamp: chrono::Utc::now().to_rfc3339(),
    }))
}

/// Save refreshed holidays to database
async fn save_holidays_to_db(
    db: &DatabaseConnection,
    serial: i32,
    items: &[Value],
) -> Result<i32, String> {
    let mut saved_count = 0;

    for item in items {
        // Extract holiday index
        let holiday_index = item.get("holidayId")
            .or_else(|| item.get("holiday_id"))
            .or_else(|| item.get("holidayIndex"))
            .or_else(|| item.get("holiday_index"))
            .and_then(|v| v.as_i64())
            .map(|v| v as i32);

        if holiday_index.is_none() {
            error!("⚠️ Skipping item without holidayId/holiday_index: {:?}", item);
            continue;
        }
        let holiday_index = holiday_index.unwrap();

        // Find existing holiday record using holiday_id
        let existing_holiday = holidays::Entity::find()
            .filter(holidays::Column::SerialNumber.eq(serial))
            .filter(holidays::Column::HolidayId.eq(holiday_index.to_string()))
            .one(db)
            .await
            .map_err(|e| format!("Database query error: {}", e))?;

        if let Some(holiday_model) = existing_holiday {
            // Update existing record
            let mut active_model: holidays::ActiveModel = holiday_model.into();

            // Update fields from C++ response (matching T3000.db HOLIDAYS table schema)
            if let Some(val) = item.get("autoManual").or_else(|| item.get("auto_manual")).and_then(|v| v.as_i64()) {
                active_model.auto_manual = Set(Some(val.to_string()));
            }
            if let Some(val) = item.get("holidayValue").or_else(|| item.get("holiday_value")).and_then(|v| v.as_i64()) {
                active_model.holiday_value = Set(Some(val.to_string()));
            }
            if let Some(val) = item.get("status").and_then(|v| v.as_i64()) {
                active_model.status = Set(Some(val.to_string()));
            }
            if let Some(val) = item.get("monthField").or_else(|| item.get("month_field")).and_then(|v| v.as_i64()) {
                active_model.month_field = Set(Some(val.to_string()));
            }
            if let Some(val) = item.get("dayField").or_else(|| item.get("day_field")).and_then(|v| v.as_i64()) {
                active_model.day_field = Set(Some(val.to_string()));
            }
            if let Some(val) = item.get("yearField").or_else(|| item.get("year_field")).and_then(|v| v.as_i64()) {
                active_model.year_field = Set(Some(val.to_string()));
            }

            // Save to database
            active_model.update(db).await
                .map_err(|e| format!("Failed to update holiday: {}", e))?;

            saved_count += 1;
        } else {
            error!("⚠️ Holiday record not found: serial={}, holiday_id={}", serial, holiday_index);
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
