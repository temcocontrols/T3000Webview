// Holidays Update API Routes
// Provides RESTful endpoints for updating holiday data using UPDATE_WEBVIEW_LIST action

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
const BAC_HOL: i32 = 5;

/// Request payload for updating full holiday record
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateHolidayFullRequest {
    pub auto_manual: Option<i32>,
    pub holiday_value: Option<i32>,
    pub status: Option<i32>,
    pub month_field: Option<i32>,
    pub day_field: Option<i32>,
    pub year_field: Option<i32>,
}

/// Standard API response structure
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiResponse {
    pub success: bool,
    pub message: String,
    pub data: Option<Value>,
}

/// Creates and returns the holiday update API routes
pub fn create_holidays_update_routes() -> Router<T3AppState> {
    Router::new()
        .route("/holidays/:serial/:index", axum::routing::put(update_holiday_full))
}

/// Update full holiday record using UPDATE_WEBVIEW_LIST action (Action 16)
/// PUT /api/t3-device/holidays/:serial/:index
pub async fn update_holiday_full(
    State(state): State<T3AppState>,
    Path((serial, index)): Path<(i32, i32)>,
    Json(payload): Json<UpdateHolidayFullRequest>,
) -> Result<Json<Value>, (StatusCode, String)> {
    info!("UPDATE_WEBVIEW_LIST: Updating full holiday record - Serial: {}, Index: {}", serial, index);

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

    // Collect updated field names
    let mut updated_fields = Vec::new();
    if payload.auto_manual.is_some() {
        updated_fields.push("autoManual");
    }
    if payload.holiday_value.is_some() {
        updated_fields.push("holidayValue");
    }
    if payload.status.is_some() {
        updated_fields.push("status");
    }
    if payload.month_field.is_some() {
        updated_fields.push("monthField");
    }
    if payload.day_field.is_some() {
        updated_fields.push("dayField");
    }
    if payload.year_field.is_some() {
        updated_fields.push("yearField");
    }

    // Prepare input JSON for UPDATE_WEBVIEW_LIST action
    let input_json = json!({
        "action": WebViewMessageType::UPDATE_WEBVIEW_LIST as i32,
        "panelId": panel_id,
        "serialNumber": serial,
        "entryType": BAC_HOL,  // 5 = HOLIDAY
        "entryIndex": index,
        "auto_manual": payload.auto_manual.unwrap_or(0),
        "holiday_value": payload.holiday_value.unwrap_or(0),
        "status": payload.status.unwrap_or(0),
        "month": payload.month_field.unwrap_or(0),
        "day": payload.day_field.unwrap_or(0),
        "year": payload.year_field.unwrap_or(0),
    });

    // Call FFI function
    let updated_fields_clone = updated_fields.clone();
    match call_update_ffi(WebViewMessageType::UPDATE_WEBVIEW_LIST as i32, input_json).await {
        Ok(_response) => {
            info!("✅ Full holiday record updated in device");

            // Now save to database
            match save_holiday_to_db(&db_connection, serial, index, &payload).await {
                Ok(_) => {
                    info!("✅ Holiday record saved to database");
                }
                Err(e) => {
                    error!("⚠️ Failed to save to database (device updated successfully): {}", e);
                }
            }

            Ok(Json(json!({
                "success": true,
                "message": "Holiday point updated successfully",
                "data": {
                    "serialNumber": serial,
                    "holidayIndex": index,
                    "updatedFields": updated_fields_clone,
                    "timestamp": chrono::Utc::now().to_rfc3339()
                }
            })))
        }
        Err(e) => {
            error!("❌ Failed to update holiday: {}", e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to update holiday record: {}", e),
            ))
        }
    }
}

/// Save updated holiday to database
async fn save_holiday_to_db(
    db: &DatabaseConnection,
    serial: i32,
    index: i32,
    payload: &UpdateHolidayFullRequest,
) -> Result<(), String> {
    // Find existing holiday record
    let existing_holiday = holidays::Entity::find()
        .filter(holidays::Column::SerialNumber.eq(serial))
        .filter(holidays::Column::HolidayId.eq(index.to_string()))
        .one(db)
        .await
        .map_err(|e| format!("Database query error: {}", e))?;

    if let Some(holiday_model) = existing_holiday {
        // Update existing record
        let mut active_model: holidays::ActiveModel = holiday_model.into();

        if let Some(val) = payload.auto_manual {
            active_model.auto_manual = Set(Some(val.to_string()));
        }
        if let Some(val) = payload.holiday_value {
            active_model.holiday_value = Set(Some(val.to_string()));
        }
        if let Some(val) = payload.status {
            active_model.status = Set(Some(val.to_string()));
        }
        if let Some(val) = payload.month_field {
            active_model.month_field = Set(Some(val.to_string()));
        }
        if let Some(val) = payload.day_field {
            active_model.day_field = Set(Some(val.to_string()));
        }
        if let Some(val) = payload.year_field {
            active_model.year_field = Set(Some(val.to_string()));
        }

        active_model.update(db).await
            .map_err(|e| format!("Failed to update holiday in database: {}", e))?;

        Ok(())
    } else {
        Err(format!("Holiday record not found: serial={}, index={}", serial, index))
    }
}

/// Call FFI function for update operations
async fn call_update_ffi(action: i32, input_json: Value) -> Result<String, String> {
    use crate::t3_device::t3_ffi_sync_service::load_t3000_function;

    let input_str = input_json.to_string();
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
    .map_err(|e| format!("Task join error: {}", e))?
}
