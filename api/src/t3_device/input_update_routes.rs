// Input Update API Routes
// Provides RESTful endpoints for updating input point data using UPDATE_WEBVIEW_LIST action

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
use crate::entity::t3_device::{devices, input_points};
use crate::t3_device::t3_ffi_sync_service::WebViewMessageType;
use crate::logger::ServiceLogger;
use sea_orm::*;

// Entry type constants matching C++ defines
#[allow(dead_code)]
const BAC_OUT: i32 = 0;
const BAC_IN: i32 = 1;
#[allow(dead_code)]
const BAC_VAR: i32 = 2;

/// Request payload for updating a single input field
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateInputFieldRequest {
    pub value: serde_json::Value,
}

/// Request payload for updating full input record
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateInputFullRequest {
    pub full_label: Option<String>,
    pub label: Option<String>,
    pub value: Option<f32>,
    pub range: Option<i32>,
    pub auto_manual: Option<i32>,
    pub control: Option<i32>,
    pub filter: Option<i32>,
    pub digital_analog: Option<i32>,
    pub calibration_sign: Option<i32>,
    pub calibration_h: Option<i32>,
    pub calibration_l: Option<i32>,
    pub decom: Option<i32>,
}

/// Standard API response structure
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiResponse {
    pub success: bool,
    pub message: String,
    pub data: Option<Value>,
}

/// Creates and returns the input update API routes
pub fn create_input_update_routes() -> Router<T3AppState> {
    Router::new()
        // More specific route must come first to avoid being shadowed by less specific route
        .route("/inputs/:serial/:index/db", axum::routing::put(update_input_database_only))
        .route("/inputs/:serial/:index",
            axum::routing::get(get_input_by_serial_index)
            .put(update_input_full))
}

/// Update full input record using UPDATE_WEBVIEW_LIST action (Action 16)
/// PUT /api/t3-device/inputs/:serial/:index (via parent router)
pub async fn update_input_full(
    State(state): State<T3AppState>,
    Path((serial, index_str)): Path<(i32, String)>,
    Json(payload): Json<UpdateInputFullRequest>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let index = index_str.parse::<i32>().unwrap_or(0);

    if let Ok(mut logger) = ServiceLogger::api_inputs() {
        logger.info(&format!("📥 UPDATE_WEBVIEW_LIST: Updating full input record - Serial: {}, Index: {}", serial, index));
    }
    info!("UPDATE_WEBVIEW_LIST: Updating full input record - Serial: {}, Index: {}", serial, index);

    // Get database connection from state
    let db_connection = match &state.t3_device_conn {
        Some(conn) => conn.lock().await.clone(),
        None => {
            if let Ok(mut logger) = ServiceLogger::api_inputs() {
                logger.error("❌ T3000 device database unavailable");
            }
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
            if let Ok(mut logger) = ServiceLogger::api_inputs() {
                logger.error(&format!("Device not found for serial: {}", serial));
            }
            error!("Device not found for serial: {}", serial);
            return Err((StatusCode::NOT_FOUND, format!("Device with serial {} not found", serial)));
        }
        Err(e) => {
            if let Ok(mut logger) = ServiceLogger::api_inputs() {
                logger.error(&format!("Database error querying device: {:?}", e));
            }
            error!("Database error querying device: {:?}", e);
            return Err((StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)));
        }
    };

    // Collect updated field names before moving payload
    let mut updated_fields = Vec::new();
    if payload.full_label.is_some() {
        updated_fields.push("fullLabel");
    }
    if payload.label.is_some() {
        updated_fields.push("label");
    }
    if payload.value.is_some() {
        updated_fields.push("value");
    }
    if payload.range.is_some() {
        updated_fields.push("range");
    }
    if payload.auto_manual.is_some() {
        updated_fields.push("autoManual");
    }
    if payload.control.is_some() {
        updated_fields.push("control");
    }

    // Clone payload fields before they're moved in json! macro
    let full_label_clone = payload.full_label.clone();
    let label_clone = payload.label.clone();

    // Prepare input JSON for UPDATE_WEBVIEW_LIST action
    // Note: C++ expects field names matching the structure
    let input_json = json!({
        "action": WebViewMessageType::UPDATE_WEBVIEW_LIST as i32,
        "panelId": panel_id,
        "serialNumber": serial,
        "entryType": BAC_IN,  // 1 = INPUT
        "entryIndex": index,
        "control": payload.control.unwrap_or(0),
        "value": payload.value.unwrap_or(0.0),
        "description": full_label_clone.unwrap_or_default(),
        "label": label_clone.unwrap_or_default(),
        "range": payload.range.unwrap_or(0),
        "auto_manual": payload.auto_manual.unwrap_or(0),
        "filter": payload.filter.unwrap_or(0),
        "digital_analog": payload.digital_analog.unwrap_or(0),
        "calibration_sign": payload.calibration_sign.unwrap_or(0),
        "calibration_h": payload.calibration_h.unwrap_or(0),
        "calibration_l": payload.calibration_l.unwrap_or(0),
        "decom": payload.decom.unwrap_or(0),
    });

    // Call FFI function
    let updated_fields_clone = updated_fields.clone();
    match call_update_ffi(WebViewMessageType::UPDATE_WEBVIEW_LIST as i32, input_json).await {
        Ok(_response) => {
            if let Ok(mut logger) = ServiceLogger::api_inputs() {
                logger.info(&format!("✅ Full input record updated in device - serial: {}, index: {}", serial, index));
            }
            info!("✅ Full input record updated in device - serial: {}, index: {}", serial, index);

            // Now save to database
            match save_input_to_db(&db_connection, serial, index, payload).await {
                Ok(_) => {
                    if let Ok(mut logger) = ServiceLogger::api_inputs() {
                        logger.info(&format!("✅ Input record saved to database - serial: {}, index: {}", serial, index));
                    }
                    info!("✅ Input record saved to database - serial: {}, index: {}", serial, index);
                }
                Err(e) => {
                    if let Ok(mut logger) = ServiceLogger::api_inputs() {
                        logger.error(&format!("⚠️ Failed to save to database (device updated successfully): {} - serial: {}, index: {}", e, serial, index));
                    }
                    error!("⚠️ Failed to save to database (device updated successfully): {} - serial: {}, index: {}", e, serial, index);
                }
            }

            Ok(Json(json!({
                "success": true,
                "message": "Input point updated successfully",
                "data": {
                    "serialNumber": serial,
                    "inputIndex": index,
                    "updatedFields": updated_fields_clone,
                    "timestamp": chrono::Utc::now().to_rfc3339()
                }
            })))
        }
        Err(e) => {
            if let Ok(mut logger) = ServiceLogger::api_inputs() {
                logger.error(&format!("❌ Failed to update full input record: {}", e));
            }
            error!("❌ Failed to update full input record: {}", e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to update input record: {}", e),
            ))
        }
    }
}

/// Update input in database only (NO FFI call to device)
/// PUT /api/t3_device/inputs/:serial/:index/db
/// Used for direct database updates without modifying the physical device
pub async fn update_input_database_only(
    State(state): State<T3AppState>,
    Path((serial, index_str)): Path<(i32, String)>,
    Json(payload): Json<UpdateInputFullRequest>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let index = index_str.parse::<i32>().unwrap_or(0);
    info!("DATABASE_ONLY: Updating input in database - Serial: {}, Index: {}", serial, index);

    if let Ok(mut logger) = ServiceLogger::database_inputs() {
        logger.info(&format!("📊 Database-only update requested - serial: {}, index: {}", serial, index));
    }

    // Get database connection from state
    let db_connection = match &state.t3_device_conn {
        Some(conn) => conn.lock().await.clone(),
        None => {
            if let Ok(mut logger) = ServiceLogger::database_inputs() {
                logger.error("❌ T3000 device database unavailable");
            }
            error!("❌ T3000 device database unavailable");
            return Err((StatusCode::SERVICE_UNAVAILABLE, "T3000 device database unavailable".to_string()));
        }
    };

    // Save directly to database without FFI call
    match save_input_to_db(&db_connection, serial, index, payload).await {
        Ok(_) => {
            if let Ok(mut logger) = ServiceLogger::database_inputs() {
                logger.info(&format!("✅ Database-only update completed - serial: {}, index: {}", serial, index));
            }
            info!("✅ Database-only update completed - serial: {}, index: {}", serial, index);

            Ok(Json(json!({
                "success": true,
                "message": "Input updated in database only (device not modified)",
                "data": {
                    "serialNumber": serial,
                    "inputIndex": index,
                    "timestamp": chrono::Utc::now().to_rfc3339()
                }
            })))
        }
        Err(e) => {
            if let Ok(mut logger) = ServiceLogger::database_inputs() {
                logger.error(&format!("❌ Database-only update failed: {} - serial: {}, index: {}", e, serial, index));
            }
            error!("❌ Database-only update failed: {}", e);
            Err((StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to update database: {}", e)))
        }
    }
}

/// Save updated input to database
async fn save_input_to_db(
    db: &DatabaseConnection,
    serial: i32,
    index: i32,
    payload: UpdateInputFullRequest,
) -> Result<(), String> {
    if let Ok(mut logger) = ServiceLogger::database_inputs() {
        logger.info(&format!("🔍 Querying database for serial: {}, index: {}", serial, index));
    }

    let existing_input = input_points::Entity::find()
        .filter(input_points::Column::SerialNumber.eq(serial))
        .filter(input_points::Column::InputIndex.eq(index))
        .one(db)
        .await
        .map_err(|e| {
            if let Ok(mut logger) = ServiceLogger::database_inputs() {
                logger.error(&format!("Database query error: {} - serial: {}, index: {}", e, serial, index));
            }
            format!("Database query error: {}", e)
        })?;

    if let Some(input_model) = existing_input {
        if let Ok(mut logger) = ServiceLogger::database_inputs() {
            logger.info(&format!("📝 Found existing record, updating fields for serial: {}, index: {}", serial, index));
        }
        let mut active_model: input_points::ActiveModel = input_model.into();

        if let Some(val) = payload.full_label {
            active_model.full_label = Set(Some(val));
        }
        if let Some(val) = payload.label {
            active_model.label = Set(Some(val));
        }
        if let Some(val) = payload.value {
            active_model.f_value = Set(Some(val.to_string()));
        }
        if let Some(val) = payload.range {
            active_model.range_field = Set(Some(val.to_string()));
        }
        if let Some(val) = payload.auto_manual {
            active_model.auto_manual = Set(Some(val.to_string()));
        }
        if let Some(val) = payload.filter {
            active_model.filter_field = Set(Some(val.to_string()));
        }
        if let Some(val) = payload.digital_analog {
            active_model.digital_analog = Set(Some(val.to_string()));
        }
        if let Some(val) = payload.calibration_sign {
            active_model.sign = Set(Some(val.to_string()));
        }
        if let Some(val) = payload.calibration_h {
            active_model.calibration = Set(Some(val.to_string()));
        }

        if let Ok(mut logger) = ServiceLogger::database_inputs() {
            logger.info(&format!("💾 Executing database update for serial: {}, index: {}", serial, index));
        }

        // Use update_many with explicit filters to update only the specific record
        // This ensures we update WHERE SerialNumber = ? AND InputIndex = ?
        // instead of relying on primary key (which would only use SerialNumber)
        input_points::Entity::update_many()
            .filter(input_points::Column::SerialNumber.eq(serial))
            .filter(input_points::Column::InputIndex.eq(index.to_string()))
            .set(active_model)
            .exec(db)
            .await
            .map_err(|e| {
                if let Ok(mut logger) = ServiceLogger::database_inputs() {
                    logger.error(&format!("Failed to update input in database: {} - serial: {}, index: {}", e, serial, index));
                }
                format!("Failed to update input in database: {}", e)
            })?;

        if let Ok(mut logger) = ServiceLogger::database_inputs() {
            logger.info(&format!("✅ Database update completed successfully for serial: {}, index: {}", serial, index));
        }

        Ok(())
    } else {
        if let Ok(mut logger) = ServiceLogger::database_inputs() {
            logger.error(&format!("Input record not found: serial={}, index={}", serial, index));
        }
        Err(format!("Input record not found: serial={}, index={}", serial, index))
    }
}

/// Call FFI function for update operations
async fn call_update_ffi(action: i32, input_json: Value) -> Result<String, String> {
    use crate::t3_device::t3_ffi_sync_service::load_t3000_function;

    let input_str = input_json.to_string();

    if let Ok(mut logger) = ServiceLogger::api_inputs() {
        logger.info(&format!("📤 Sending to C++ (Action {}): {}", action, input_str));
    }
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

                        if let Ok(mut logger) = ServiceLogger::api_inputs() {
                            logger.info(&format!("📥 C++ Response (Action {}): {}", action, response));
                        }
                        info!("📥 C++ Response (Action {}): {}", action, response);
                        Ok(response)
                    }
                    -2 => {
                        let err_msg = "MFC application not initialized".to_string();
                        if let Ok(mut logger) = ServiceLogger::api_inputs() {
                            logger.error(&format!("❌ FFI Error: {}", err_msg));
                        }
                        Err(err_msg)
                    }
                    code => {
                        let err_msg = format!("FFI call failed with code: {}", code);
                        if let Ok(mut logger) = ServiceLogger::api_inputs() {
                            logger.error(&format!("❌ {}", err_msg));
                        }
                        Err(err_msg)
                    }
                }
            } else {
                let err_msg = "BacnetWebView_HandleWebViewMsg function not loaded".to_string();
                if let Ok(mut logger) = ServiceLogger::api_inputs() {
                    logger.error(&format!("❌ {}", err_msg));
                }
                Err(err_msg)
            }
        }
    })
    .await
    .map_err(|e| format!("Task spawn error: {}", e))?
}

/// Get input record by serial number and index
/// GET /api/t3_device/inputs/:serial/:index
pub async fn get_input_by_serial_index(
    State(state): State<T3AppState>,
    Path((serial, index)): Path<(i32, i32)>,
) -> Result<Json<Value>, (StatusCode, String)> {
    info!("GET input - Serial: {}, Index: {}", serial, index);

    // Get database connection
    let db_connection = match &state.t3_device_conn {
        Some(conn) => conn.lock().await.clone(),
        None => {
            error!("❌ T3000 device database unavailable");
            return Err((StatusCode::SERVICE_UNAVAILABLE, "T3000 device database unavailable".to_string()));
        }
    };

    // Find device by serial number
    let device = match devices::Entity::find()
        .filter(devices::Column::SerialNumber.eq(serial))
        .one(&db_connection)
        .await
    {
        Ok(Some(dev)) => dev,
        Ok(None) => {
            let err_msg = format!("Device not found with serial number: {}", serial);
            error!("{}", err_msg);
            return Err((StatusCode::NOT_FOUND, err_msg));
        }
        Err(e) => {
            let err_msg = format!("Database error: {}", e);
            error!("{}", err_msg);
            return Err((StatusCode::INTERNAL_SERVER_ERROR, err_msg));
        }
    };

    // Find input point by serial number and index
    let input = match input_points::Entity::find()
        .filter(input_points::Column::SerialNumber.eq(serial))
        .filter(input_points::Column::InputIndex.eq(index.to_string()))
        .one(&db_connection)
        .await
    {
        Ok(Some(inp)) => inp,
        Ok(None) => {
            let err_msg = format!("Input not found - Serial: {}, Index: {}", serial, index);
            error!("{}", err_msg);
            return Err((StatusCode::NOT_FOUND, err_msg));
        }
        Err(e) => {
            let err_msg = format!("Database error: {}", e);
            error!("{}", err_msg);
            return Err((StatusCode::INTERNAL_SERVER_ERROR, err_msg));
        }
    };

    Ok(Json(json!({
        "success": true,
        "message": "Input retrieved successfully",
        "data": input
    })))
}
