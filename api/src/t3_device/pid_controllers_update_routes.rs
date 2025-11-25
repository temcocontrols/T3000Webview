// PID Controllers Update API Routes
// Provides RESTful endpoints for updating PID controller data using UPDATE_WEBVIEW_LIST action

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
use crate::entity::t3_device::{devices, pid_controllers};
use crate::t3_device::t3_ffi_sync_service::WebViewMessageType;
use sea_orm::*;

// Entry type constants matching C++ defines
const BAC_PID: i32 = 3;

/// Request payload for updating full PID controller record
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdatePidControllerFullRequest {
    pub auto_manual: Option<i32>,
    pub input_field: Option<i32>,
    pub output_field: Option<i32>,
    pub set_value: Option<f32>,
    pub action_field: Option<i32>,
    pub proportional: Option<f32>,
    pub reset_field: Option<f32>,
    pub rate: Option<f32>,
    pub bias: Option<f32>,
}

/// Standard API response structure
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiResponse {
    pub success: bool,
    pub message: String,
    pub data: Option<Value>,
}

/// Creates and returns the PID controller update API routes
pub fn create_pid_controllers_update_routes() -> Router<T3AppState> {
    Router::new()
        .route("/pid-controllers/:serial/:index", axum::routing::put(update_pid_controller_full))
}

/// Update full PID controller record using UPDATE_WEBVIEW_LIST action (Action 16)
/// PUT /api/t3-device/pid-controllers/:serial/:index
pub async fn update_pid_controller_full(
    State(state): State<T3AppState>,
    Path((serial, index)): Path<(i32, i32)>,
    Json(payload): Json<UpdatePidControllerFullRequest>,
) -> Result<Json<Value>, (StatusCode, String)> {
    info!("UPDATE_WEBVIEW_LIST: Updating full PID controller record - Serial: {}, Index: {}", serial, index);

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
    if payload.input_field.is_some() {
        updated_fields.push("inputField");
    }
    if payload.output_field.is_some() {
        updated_fields.push("outputField");
    }
    if payload.set_value.is_some() {
        updated_fields.push("setValue");
    }
    if payload.action_field.is_some() {
        updated_fields.push("actionField");
    }
    if payload.proportional.is_some() {
        updated_fields.push("proportional");
    }

    // Prepare input JSON for UPDATE_WEBVIEW_LIST action
    let input_json = json!({
        "action": WebViewMessageType::UPDATE_WEBVIEW_LIST as i32,
        "panelId": panel_id,
        "serialNumber": serial,
        "entryType": BAC_PID,  // 3 = PID
        "entryIndex": index,
        "auto_manual": payload.auto_manual.unwrap_or(0),
        "input": payload.input_field.unwrap_or(0),
        "output": payload.output_field.unwrap_or(0),
        "set_value": payload.set_value.unwrap_or(0.0),
        "action": payload.action_field.unwrap_or(0),
        "proportional": payload.proportional.unwrap_or(0.0),
        "reset": payload.reset_field.unwrap_or(0.0),
        "rate": payload.rate.unwrap_or(0.0),
        "bias": payload.bias.unwrap_or(0.0),
    });

    // Call FFI function
    let updated_fields_clone = updated_fields.clone();
    match call_update_ffi(WebViewMessageType::UPDATE_WEBVIEW_LIST as i32, input_json).await {
        Ok(_response) => {
            info!("✅ Full PID controller record updated in device");

            // Now save to database
            match save_pid_controller_to_db(&db_connection, serial, index, &payload).await {
                Ok(_) => {
                    info!("✅ PID controller record saved to database");
                }
                Err(e) => {
                    error!("⚠️ Failed to save to database (device updated successfully): {}", e);
                }
            }

            Ok(Json(json!({
                "success": true,
                "message": "PID controller updated successfully",
                "data": {
                    "serialNumber": serial,
                    "pidIndex": index,
                    "updatedFields": updated_fields_clone,
                    "timestamp": chrono::Utc::now().to_rfc3339()
                }
            })))
        }
        Err(e) => {
            error!("❌ Failed to update PID controller: {}", e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to update PID controller record: {}", e),
            ))
        }
    }
}

/// Save updated PID controller to database
async fn save_pid_controller_to_db(
    db: &DatabaseConnection,
    serial: i32,
    index: i32,
    payload: &UpdatePidControllerFullRequest,
) -> Result<(), String> {
    // Find existing PID controller record
    let existing_pid = pid_controllers::Entity::find()
        .filter(pid_controllers::Column::SerialNumber.eq(serial))
        .filter(pid_controllers::Column::LoopField.eq(index.to_string()))
        .one(db)
        .await
        .map_err(|e| format!("Database query error: {}", e))?;

    if let Some(pid_model) = existing_pid {
        // Update existing record
        let mut active_model: pid_controllers::ActiveModel = pid_model.into();

        if let Some(val) = payload.auto_manual {
            active_model.auto_manual = Set(Some(val.to_string()));
        }
        if let Some(val) = payload.input_field {
            active_model.input_field = Set(Some(val.to_string()));
        }
        if let Some(val) = payload.output_field {
            active_model.output_field = Set(Some(val.to_string()));
        }
        if let Some(val) = payload.set_value {
            active_model.set_value = Set(Some(val.to_string()));
        }
        if let Some(val) = payload.action_field {
            active_model.action_field = Set(Some(val.to_string()));
        }
        if let Some(val) = payload.proportional {
            active_model.proportional = Set(Some(val.to_string()));
        }
        if let Some(val) = payload.reset_field {
            active_model.reset_field = Set(Some(val.to_string()));
        }
        if let Some(val) = payload.rate {
            active_model.rate = Set(Some(val.to_string()));
        }
        if let Some(val) = payload.bias {
            active_model.bias = Set(Some(val.to_string()));
        }

        active_model.update(db).await
            .map_err(|e| format!("Failed to update PID controller in database: {}", e))?;

        Ok(())
    } else {
        Err(format!("PID controller record not found: serial={}, index={}", serial, index))
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
