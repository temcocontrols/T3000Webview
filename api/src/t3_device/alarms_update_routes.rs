// Alarms Update API Routes
// Provides RESTful endpoints for updating alarm data using UPDATE_WEBVIEW_LIST action

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
const BAC_ALARMM: i32 = 12;

/// Request payload for updating full alarm record
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateAlarmFullRequest {
    pub panel: Option<String>,
    pub message: Option<String>,
    pub status: Option<i32>,
    pub priority: Option<i32>,
    pub alarm_state: Option<i32>,
    pub alarm_type: Option<i32>,
    pub source: Option<String>,
    pub acknowledged: Option<i32>,
}

/// Standard API response structure
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiResponse {
    pub success: bool,
    pub message: String,
    pub data: Option<Value>,
}

/// Creates and returns the alarm update API routes
pub fn create_alarms_update_routes() -> Router<T3AppState> {
    Router::new()
        .route("/alarms/:serial/:index", axum::routing::put(update_alarm_full))
}

/// Update full alarm record using UPDATE_WEBVIEW_LIST action (Action 16)
/// PUT /api/t3-device/alarms/:serial/:index
pub async fn update_alarm_full(
    State(state): State<T3AppState>,
    Path((serial, index)): Path<(i32, i32)>,
    Json(payload): Json<UpdateAlarmFullRequest>,
) -> Result<Json<Value>, (StatusCode, String)> {
    info!("UPDATE_WEBVIEW_LIST: Updating full alarm record - Serial: {}, Index: {}", serial, index);

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
    if payload.panel.is_some() {
        updated_fields.push("panel");
    }
    if payload.message.is_some() {
        updated_fields.push("message");
    }
    if payload.status.is_some() {
        updated_fields.push("status");
    }
    if payload.priority.is_some() {
        updated_fields.push("priority");
    }
    if payload.alarm_state.is_some() {
        updated_fields.push("alarmState");
    }
    if payload.acknowledged.is_some() {
        updated_fields.push("acknowledged");
    }

    // Clone fields before moving payload
    let panel_clone = payload.panel.clone();
    let message_clone = payload.message.clone();
    let source_clone = payload.source.clone();

    // Prepare input JSON for UPDATE_WEBVIEW_LIST action
    let input_json = json!({
        "action": WebViewMessageType::UPDATE_WEBVIEW_LIST as i32,
        "panelId": panel_id,
        "serialNumber": serial,
        "entryType": BAC_ALARMM,  // 12 = ALARM
        "entryIndex": index,
        "panel": panel_clone.unwrap_or_default(),
        "message": message_clone.unwrap_or_default(),
        "status": payload.status.unwrap_or(0),
        "priority": payload.priority.unwrap_or(0),
        "alarm_state": payload.alarm_state.unwrap_or(0),
        "alarm_type": payload.alarm_type.unwrap_or(0),
        "source": source_clone.unwrap_or_default(),
        "acknowledged": payload.acknowledged.unwrap_or(0),
    });

    // Call FFI function
    let updated_fields_clone = updated_fields.clone();
    match call_update_ffi(WebViewMessageType::UPDATE_WEBVIEW_LIST as i32, input_json).await {
        Ok(_response) => {
            info!("✅ Full alarm record updated in device");

            // Now save to database
            match save_alarm_to_db(&db_connection, serial, index, &payload).await {
                Ok(_) => {
                    info!("✅ Alarm record saved to database");
                }
                Err(e) => {
                    error!("⚠️ Failed to save to database (device updated successfully): {}", e);
                }
            }

            Ok(Json(json!({
                "success": true,
                "message": "Alarm updated successfully",
                "data": {
                    "serialNumber": serial,
                    "alarmIndex": index,
                    "updatedFields": updated_fields_clone,
                    "timestamp": chrono::Utc::now().to_rfc3339()
                }
            })))
        }
        Err(e) => {
            error!("❌ Failed to update alarm: {}", e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to update alarm record: {}", e),
            ))
        }
    }
}

/// Save updated alarm to database
async fn save_alarm_to_db(
    db: &DatabaseConnection,
    serial: i32,
    index: i32,
    payload: &UpdateAlarmFullRequest,
) -> Result<(), String> {
    // Find existing alarm record
    let existing_alarm = alarms::Entity::find()
        .filter(alarms::Column::SerialNumber.eq(serial))
        .filter(alarms::Column::AlarmId.eq(index.to_string()))
        .one(db)
        .await
        .map_err(|e| format!("Database query error: {}", e))?;

    if let Some(alarm_model) = existing_alarm {
        // Update existing record
        let mut active_model: alarms::ActiveModel = alarm_model.into();

        if let Some(val) = &payload.panel {
            active_model.panel = Set(Some(val.clone()));
        }
        if let Some(val) = &payload.message {
            active_model.message = Set(Some(val.clone()));
        }
        if let Some(val) = payload.status {
            active_model.status = Set(Some(val.to_string()));
        }
        if let Some(val) = payload.priority {
            active_model.priority = Set(Some(val.to_string()));
        }
        if let Some(val) = payload.alarm_state {
            active_model.alarm_state = Set(Some(val.to_string()));
        }
        if let Some(val) = payload.alarm_type {
            active_model.alarm_type = Set(Some(val.to_string()));
        }
        if let Some(val) = &payload.source {
            active_model.source = Set(Some(val.clone()));
        }
        if let Some(val) = payload.acknowledged {
            active_model.acknowledged = Set(Some(val.to_string()));
        }

        alarms::Entity::update_many()
            .filter(alarms::Column::SerialNumber.eq(serial))
            .filter(alarms::Column::AlarmId.eq(index.to_string()))
            .set(active_model)
            .exec(db)
            .await
            .map_err(|e| format!("Failed to update alarm in database: {}", e))?;

        Ok(())
    } else {
        Err(format!("Alarm record not found: serial={}, index={}", serial, index))
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
