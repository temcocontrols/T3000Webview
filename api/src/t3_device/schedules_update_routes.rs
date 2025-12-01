// Schedules Update API Routes
// Provides RESTful endpoints for updating schedule data using UPDATE_WEBVIEW_LIST action

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
use crate::entity::t3_device::{devices, schedules};
use crate::t3_device::t3_ffi_sync_service::WebViewMessageType;
use sea_orm::*;

// Entry type constants matching C++ defines
const BAC_SCH: i32 = 4;

/// Request payload for updating full schedule record
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateScheduleFullRequest {
    pub auto_manual: Option<i32>,
    pub output_field: Option<i32>,
    pub variable_field: Option<i32>,
    pub holiday1: Option<i32>,
    pub holiday2: Option<i32>,
    pub status1: Option<i32>,
    pub status2: Option<i32>,
}

/// Standard API response structure
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiResponse {
    pub success: bool,
    pub message: String,
    pub data: Option<Value>,
}

/// Creates and returns the schedule update API routes
pub fn create_schedules_update_routes() -> Router<T3AppState> {
    Router::new()
        .route("/schedules/:serial/:index", axum::routing::put(update_schedule_full))
}

/// Update full schedule record using UPDATE_WEBVIEW_LIST action (Action 16)
/// PUT /api/t3-device/schedules/:serial/:index
pub async fn update_schedule_full(
    State(state): State<T3AppState>,
    Path((serial, index)): Path<(i32, i32)>,
    Json(payload): Json<UpdateScheduleFullRequest>,
) -> Result<Json<Value>, (StatusCode, String)> {
    info!("UPDATE_WEBVIEW_LIST: Updating full schedule record - Serial: {}, Index: {}", serial, index);

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
    if payload.output_field.is_some() {
        updated_fields.push("outputField");
    }
    if payload.variable_field.is_some() {
        updated_fields.push("variableField");
    }
    if payload.holiday1.is_some() {
        updated_fields.push("holiday1");
    }
    if payload.holiday2.is_some() {
        updated_fields.push("holiday2");
    }

    // Prepare input JSON for UPDATE_WEBVIEW_LIST action
    let input_json = json!({
        "action": WebViewMessageType::UPDATE_WEBVIEW_LIST as i32,
        "panelId": panel_id,
        "serialNumber": serial,
        "entryType": BAC_SCH,  // 4 = SCHEDULE
        "entryIndex": index,
        "auto_manual": payload.auto_manual.unwrap_or(0),
        "output": payload.output_field.unwrap_or(0),
        "variable": payload.variable_field.unwrap_or(0),
        "holiday1": payload.holiday1.unwrap_or(0),
        "holiday2": payload.holiday2.unwrap_or(0),
        "status1": payload.status1.unwrap_or(0),
        "status2": payload.status2.unwrap_or(0),
    });

    // Call FFI function
    let updated_fields_clone = updated_fields.clone();
    match call_update_ffi(WebViewMessageType::UPDATE_WEBVIEW_LIST as i32, input_json).await {
        Ok(_response) => {
            info!("✅ Full schedule record updated in device");

            // Now save to database
            match save_schedule_to_db(&db_connection, serial, index, &payload).await {
                Ok(_) => {
                    info!("✅ Schedule record saved to database");
                }
                Err(e) => {
                    error!("⚠️ Failed to save to database (device updated successfully): {}", e);
                }
            }

            Ok(Json(json!({
                "success": true,
                "message": "Schedule point updated successfully",
                "data": {
                    "serialNumber": serial,
                    "scheduleIndex": index,
                    "updatedFields": updated_fields_clone,
                    "timestamp": chrono::Utc::now().to_rfc3339()
                }
            })))
        }
        Err(e) => {
            error!("❌ Failed to update schedule: {}", e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to update schedule record: {}", e),
            ))
        }
    }
}

/// Save updated schedule to database
async fn save_schedule_to_db(
    db: &DatabaseConnection,
    serial: i32,
    index: i32,
    payload: &UpdateScheduleFullRequest,
) -> Result<(), String> {
    // Find existing schedule record
    let existing_schedule = schedules::Entity::find()
        .filter(schedules::Column::SerialNumber.eq(serial))
        .filter(schedules::Column::ScheduleId.eq(index.to_string()))
        .one(db)
        .await
        .map_err(|e| format!("Database query error: {}", e))?;

    if let Some(schedule_model) = existing_schedule {
        // Update existing record
        let mut active_model: schedules::ActiveModel = schedule_model.into();

        if let Some(val) = payload.auto_manual {
            active_model.auto_manual = Set(Some(val.to_string()));
        }
        if let Some(val) = payload.output_field {
            active_model.output_field = Set(Some(val.to_string()));
        }
        if let Some(val) = payload.variable_field {
            active_model.variable_field = Set(Some(val.to_string()));
        }
        if let Some(val) = payload.holiday1 {
            active_model.holiday1 = Set(Some(val.to_string()));
        }
        if let Some(val) = payload.holiday2 {
            active_model.holiday2 = Set(Some(val.to_string()));
        }
        if let Some(val) = payload.status1 {
            active_model.status1 = Set(Some(val.to_string()));
        }
        if let Some(val) = payload.status2 {
            active_model.status2 = Set(Some(val.to_string()));
        }

        active_model.update(db).await
            .map_err(|e| format!("Failed to update schedule in database: {}", e))?;

        Ok(())
    } else {
        Err(format!("Schedule record not found: serial={}, index={}", serial, index))
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
