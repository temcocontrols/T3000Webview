// Users Update API Routes
// Provides RESTful endpoints for updating user data using UPDATE_WEBVIEW_LIST action

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
// ENUM_USER_NAME = 14 (from ud_str.h line 22)
const BAC_USER: i32 = 14;

/// Request payload for updating full user record
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateUserFullRequest {
    pub name: Option<String>,
    pub password: Option<String>,
    pub access_level: Option<i32>,
    pub rights_access: Option<i32>,
    pub default_panel: Option<i32>,
    pub default_group: Option<i32>,
    pub screen_right: Option<String>,
    pub program_right: Option<String>,
}

/// Standard API response structure
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiResponse {
    pub success: bool,
    pub message: String,
    pub data: Option<Value>,
}

/// Creates and returns the user update API routes
pub fn create_users_update_routes() -> Router<T3AppState> {
    Router::new()
        .route("/users/:serial/:index", axum::routing::put(update_user_full))
}

/// Update full user record using UPDATE_WEBVIEW_LIST action (Action 16)
/// PUT /api/t3-device/users/:serial/:index
pub async fn update_user_full(
    State(state): State<T3AppState>,
    Path((serial, index_str)): Path<(i32, String)>,
    Json(payload): Json<UpdateUserFullRequest>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let index = index_str.parse::<i32>().unwrap_or(0);
    info!("UPDATE_WEBVIEW_LIST: Updating full user record - Serial: {}, Index: {}", serial, index);

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
    if payload.name.is_some() {
        updated_fields.push("name");
    }
    if payload.password.is_some() {
        updated_fields.push("password");
    }
    if payload.access_level.is_some() {
        updated_fields.push("accessLevel");
    }
    if payload.rights_access.is_some() {
        updated_fields.push("rightsAccess");
    }
    if payload.default_panel.is_some() {
        updated_fields.push("defaultPanel");
    }
    if payload.default_group.is_some() {
        updated_fields.push("defaultGroup");
    }
    if payload.screen_right.is_some() {
        updated_fields.push("screenRight");
    }
    if payload.program_right.is_some() {
        updated_fields.push("programRight");
    }

    // Prepare input JSON for UPDATE_WEBVIEW_LIST action
    // Note: C++ expects field names matching Str_userlogin_point structure
    let input_json = json!({
        "action": WebViewMessageType::UPDATE_WEBVIEW_LIST as i32,
        "panelId": panel_id,
        "serialNumber": serial,
        "entryType": BAC_USER,  // 14 = USER
        "entryIndex": index,
        "name": payload.name.unwrap_or_default(),
        "password": payload.password.unwrap_or_default(),
        "access_level": payload.access_level.unwrap_or(0),
        "rights_access": payload.rights_access.unwrap_or(0),
        "default_panel": payload.default_panel.unwrap_or(0),
        "default_group": payload.default_group.unwrap_or(0),
        "screen_right": payload.screen_right.unwrap_or_default(),
        "program_right": payload.program_right.unwrap_or_default(),
    });

    // Call FFI function
    match call_update_ffi(WebViewMessageType::UPDATE_WEBVIEW_LIST as i32, input_json).await {
        Ok(_response) => {
            info!("✅ Full user record updated successfully");
            Ok(Json(json!({
                "success": true,
                "message": "User updated successfully",
                "data": {
                    "serialNumber": serial,
                    "userIndex": index,
                    "updatedFields": updated_fields,
                }
            })))
        }
        Err(e) => {
            error!("❌ Failed to update user: {}", e);

            // Provide helpful message if C++ hasn't implemented this action yet
            if e.contains("not implemented") || e.contains("empty response") {
                return Err((
                    StatusCode::NOT_IMPLEMENTED,
                    "UPDATE_WEBVIEW_LIST (Action 16) for users is not yet implemented in C++. Please implement BacnetWebView_HandleWebViewMsg case 16 in T3000.exe".to_string(),
                ));
            }

            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to update user: {}", e),
            ))
        }
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
