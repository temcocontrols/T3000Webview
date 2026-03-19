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
use crate::entity::t3_device::{devices, users};
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
        .route("/users/:serial", axum::routing::get(get_users_by_serial))
        .route("/users/:serial/:index", axum::routing::put(update_user_full))
}

/// GET /api/t3_device/users/:serial
/// Returns a stable 8-slot JSON array ordered by user_index.
/// Missing slots are filled with blank {name:"", password:"", access_level:1}.
pub async fn get_users_by_serial(
    State(state): State<T3AppState>,
    Path(serial): Path<i32>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let db = match &state.t3_device_conn {
        Some(conn) => conn.lock().await.clone(),
        None => return Err((StatusCode::SERVICE_UNAVAILABLE, "Database unavailable".to_string())),
    };

    let records = users::Entity::find()
        .filter(users::Column::SerialNumber.eq(serial))
        .order_by_asc(users::Column::UserIndex)
        .all(&db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("DB error: {}", e)))?;

    // Build a fixed 8-slot array; missing entries stay blank
    let mut slots: Vec<Value> = (0..8)
        .map(|_| json!({ "name": "", "password": "", "access_level": 1 }))
        .collect();

    for record in records {
        let idx = record.user_index
            .as_deref()
            .and_then(|s| s.parse::<usize>().ok())
            .unwrap_or(0);
        if idx < 8 {
            slots[idx] = json!({
                "name":         record.name.unwrap_or_default(),
                "password":     record.password.unwrap_or_default(),
                "access_level": record.access_level.unwrap_or(1),
            });
        }
    }

    info!("✅ Returning {} user slots for serial {}", slots.len(), serial);
    Ok(Json(json!(slots)))
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

    // Snapshot fields so they can be used for both FFI JSON and DB save
    let name          = payload.name.clone().unwrap_or_default();
    let password      = payload.password.clone().unwrap_or_default();
    let access_level  = payload.access_level.unwrap_or(0);
    let rights_access = payload.rights_access.unwrap_or(0);
    let default_panel = payload.default_panel.unwrap_or(0);
    let default_group = payload.default_group.unwrap_or(0);
    let screen_right  = payload.screen_right.clone().unwrap_or_default();
    let program_right = payload.program_right.clone().unwrap_or_default();

    // Prepare input JSON for UPDATE_WEBVIEW_LIST action
    // Note: C++ expects field names matching Str_userlogin_point structure
    let input_json = json!({
        "action": WebViewMessageType::UPDATE_WEBVIEW_LIST as i32,
        "panelId": panel_id,
        "serialNumber": serial,
        "entryType": BAC_USER,  // 14 = USER
        "entryIndex": index,
        "name": name,
        "password": password,
        "access_level": access_level,
        "rights_access": rights_access,
        "default_panel": default_panel,
        "default_group": default_group,
        "screen_right": screen_right,
        "program_right": program_right,
    });

    // Call FFI — best-effort: C++ UPDATE_WEBVIEW_LIST case 14 not yet implemented
    let ffi_status = match call_update_ffi(WebViewMessageType::UPDATE_WEBVIEW_LIST as i32, input_json).await {
        Ok(_) => {
            info!("✅ FFI user update succeeded for serial {} index {}", serial, index);
            "ffi_ok"
        }
        Err(e) => {
            error!("⚠️ FFI user update not yet implemented in C++: {}", e);
            "ffi_unimplemented"
        }
    };

    // Always save to local DB regardless of FFI result
    match save_user_to_db(&db_connection, serial, index,
        name, password, access_level, rights_access,
        default_panel, default_group, screen_right, program_right).await
    {
        Ok(()) => {
            info!("✅ User saved to local DB - serial {} index {}", serial, index);
            Ok(Json(json!({
                "success": true,
                "message": if ffi_status == "ffi_ok" {
                    "User updated on device and saved to local database"
                } else {
                    "User saved to local database (device sync requires C++ case 14 in UPDATE_WEBVIEW_LIST)"
                },
                "data": {
                    "serialNumber": serial,
                    "userIndex": index,
                    "ffiStatus": ffi_status,
                }
            })))
        }
        Err(e) => {
            error!("❌ Failed to save user to DB: {}", e);
            Err((StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to save user: {}", e)))
        }
    }
}

/// Upsert a user record in the local USERS table
#[allow(clippy::too_many_arguments)]
async fn save_user_to_db(
    db: &DatabaseConnection,
    serial: i32,
    index: i32,
    name: String,
    password: String,
    access_level: i32,
    rights_access: i32,
    default_panel: i32,
    default_group: i32,
    screen_right: String,
    program_right: String,
) -> Result<(), String> {
    let index_str = index.to_string();

    let existing = users::Entity::find()
        .filter(users::Column::SerialNumber.eq(serial))
        .filter(users::Column::UserIndex.eq(index_str.clone()))
        .one(db)
        .await
        .map_err(|e| format!("DB query error: {}", e))?;

    if let Some(record) = existing {
        let mut m: users::ActiveModel = record.into();
        m.name          = Set(Some(name));
        m.password      = Set(Some(password));
        m.access_level  = Set(Some(access_level));
        m.rights_access = Set(Some(rights_access));
        m.default_panel = Set(Some(default_panel));
        m.default_group = Set(Some(default_group));
        m.screen_right  = Set(Some(screen_right));
        m.program_right = Set(Some(program_right));
        m.update(db).await.map_err(|e| format!("DB update error: {}", e))?;
    } else {
        let new_record = users::ActiveModel {
            serial_number: Set(serial),
            user_id:       Set(None),
            user_index:    Set(Some(index_str)),
            panel:         Set(None),
            name:          Set(Some(name)),
            password:      Set(Some(password)),
            access_level:  Set(Some(access_level)),
            rights_access: Set(Some(rights_access)),
            default_panel: Set(Some(default_panel)),
            default_group: Set(Some(default_group)),
            screen_right:  Set(Some(screen_right)),
            program_right: Set(Some(program_right)),
            status:        Set(None),
        };
        new_record.insert(db).await.map_err(|e| format!("DB insert error: {}", e))?;
    }
    Ok(())
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
