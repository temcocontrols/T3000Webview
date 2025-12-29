// Graphics Update API Routes
// Provides RESTful endpoints for updating graphics data using UPDATE_WEBVIEW_LIST action

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
use crate::entity::t3_device::{devices, graphics};
use crate::t3_device::t3_ffi_sync_service::WebViewMessageType;
use sea_orm::*;

// Entry type constants matching C++ defines
const BAC_GRP: i32 = 10;

/// Request payload for updating full graphics record
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateGraphicFullRequest {
    pub graphic_label: Option<String>,
    pub graphic_picture_file: Option<String>,
    pub switch_node: Option<i32>,
}

/// Standard API response structure
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiResponse {
    pub success: bool,
    pub message: String,
    pub data: Option<Value>,
}

/// Creates and returns the graphics update API routes
pub fn create_graphics_update_routes() -> Router<T3AppState> {
    Router::new()
        .route("/graphics/:serial/:index", axum::routing::put(update_graphic_full))
}

/// Update full graphics record using UPDATE_WEBVIEW_LIST action (Action 16)
/// PUT /api/t3-device/graphics/:serial/:index
pub async fn update_graphic_full(
    State(state): State<T3AppState>,
    Path((serial, index)): Path<(i32, i32)>,
    Json(payload): Json<UpdateGraphicFullRequest>,
) -> Result<Json<Value>, (StatusCode, String)> {
    info!("UPDATE_WEBVIEW_LIST: Updating full graphics record - Serial: {}, Index: {}", serial, index);

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
    if payload.graphic_label.is_some() {
        updated_fields.push("graphicLabel");
    }
    if payload.graphic_picture_file.is_some() {
        updated_fields.push("graphicPictureFile");
    }
    if payload.switch_node.is_some() {
        updated_fields.push("switchNode");
    }

    // Clone fields before moving payload
    let graphic_label_clone = payload.graphic_label.clone();
    let graphic_picture_file_clone = payload.graphic_picture_file.clone();

    // Prepare input JSON for UPDATE_WEBVIEW_LIST action
    let input_json = json!({
        "action": WebViewMessageType::UPDATE_WEBVIEW_LIST as i32,
        "panelId": panel_id,
        "serialNumber": serial,
        "entryType": BAC_GRP,  // 10 = GRAPHIC
        "entryIndex": index,
        "graphic_label": graphic_label_clone.unwrap_or_default(),
        "graphic_picture_file": graphic_picture_file_clone.unwrap_or_default(),
        "switch_node": payload.switch_node.unwrap_or(0),
    });

    // Call FFI function
    let updated_fields_clone = updated_fields.clone();
    match call_update_ffi(WebViewMessageType::UPDATE_WEBVIEW_LIST as i32, input_json).await {
        Ok(_response) => {
            info!("✅ Full graphics record updated in device");

            // Now save to database
            match save_graphic_to_db(&db_connection, serial, index, &payload).await {
                Ok(_) => {
                    info!("✅ Graphics record saved to database");
                }
                Err(e) => {
                    error!("⚠️ Failed to save to database (device updated successfully): {}", e);
                }
            }

            Ok(Json(json!({
                "success": true,
                "message": "Graphics updated successfully",
                "data": {
                    "serialNumber": serial,
                    "graphicIndex": index,
                    "updatedFields": updated_fields_clone,
                    "timestamp": chrono::Utc::now().to_rfc3339()
                }
            })))
        }
        Err(e) => {
            error!("❌ Failed to update graphic: {}", e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to update graphics record: {}", e),
            ))
        }
    }
}

/// Save updated graphics to database
async fn save_graphic_to_db(
    db: &DatabaseConnection,
    serial: i32,
    index: i32,
    payload: &UpdateGraphicFullRequest,
) -> Result<(), String> {
    // Find existing graphics record
    let existing_graphic = graphics::Entity::find()
        .filter(graphics::Column::SerialNumber.eq(serial))
        .filter(graphics::Column::GraphicId.eq(index.to_string()))
        .one(db)
        .await
        .map_err(|e| format!("Database query error: {}", e))?;

    if let Some(graphic_model) = existing_graphic {
        // Update existing record
        let mut active_model: graphics::ActiveModel = graphic_model.into();

        if let Some(val) = &payload.graphic_label {
            active_model.graphic_label = Set(Some(val.clone()));
        }
        if let Some(val) = &payload.graphic_picture_file {
            active_model.graphic_picture_file = Set(Some(val.clone()));
        }
        if let Some(val) = payload.switch_node {
            active_model.switch_node = Set(Some(val.to_string()));
        }

        graphics::Entity::update_many()
            .filter(graphics::Column::SerialNumber.eq(serial))
            .filter(graphics::Column::GraphicId.eq(index.to_string()))
            .set(active_model)
            .exec(db)
            .await
            .map_err(|e| format!("Failed to update graphics in database: {}", e))?;

        Ok(())
    } else {
        Err(format!("Graphics record not found: serial={}, index={}", serial, index))
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
