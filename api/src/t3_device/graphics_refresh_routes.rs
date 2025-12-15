// Graphics Refresh API Routes
// Provides RESTful endpoints for refreshing graphics data using REFRESH_WEBVIEW_LIST action

use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::Json,
    Router,
};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tracing::{error, info, warn};

use crate::app_state::T3AppState;
use crate::entity::t3_device::{devices, graphics};
use crate::t3_device::t3_ffi_sync_service::WebViewMessageType;
use crate::logger::{write_structured_log_with_level, LogLevel};
use sea_orm::*;

// Entry type constants matching C++ defines
const BAC_GRP: i32 = 10;

/// Request payload for refreshing a single graphic (index is optional)
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RefreshGraphicRequest {
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

/// Creates and returns the graphics refresh API routes
pub fn create_graphics_refresh_routes() -> Router<T3AppState> {
    Router::new()
        .route("/graphics/:serial/refresh", axum::routing::post(refresh_graphics))
        .route("/graphics/:serial/save-refreshed", axum::routing::post(save_refreshed_graphics))
        .route("/graphics/:serial/load-and-save", axum::routing::post(load_and_save_graphics))
        .route("/graphics/:serial", axum::routing::get(get_graphics))
}

/// Get all graphics for a device from database
/// GET /api/t3-device/graphics/:serial
pub async fn get_graphics(
    State(state): State<T3AppState>,
    Path(serial): Path<i32>,
) -> Result<Json<Value>, (StatusCode, String)> {
    info!("GET: Retrieving graphics - Serial: {}", serial);

    // Get database connection from state
    let db_connection = match &state.t3_device_conn {
        Some(conn) => conn.lock().await.clone(),
        None => {
            error!("❌ T3000 device database unavailable");
            return Err((StatusCode::SERVICE_UNAVAILABLE, "T3000 device database unavailable".to_string()));
        }
    };

    // Query graphics from database
    match graphics::Entity::find()
        .filter(graphics::Column::SerialNumber.eq(serial))
        .all(&db_connection)
        .await
    {
        Ok(graphics_list) => {
            info!("✅ Retrieved {} graphics for serial: {}", graphics_list.len(), serial);
            Ok(Json(json!({
                "success": true,
                "count": graphics_list.len(),
                "data": graphics_list,
                "timestamp": chrono::Utc::now().to_rfc3339(),
            })))
        }
        Err(e) => {
            error!("Database error querying graphics: {:?}", e);
            Err((StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)))
        }
    }
}

/// Refresh graphic(s) from device using REFRESH_WEBVIEW_LIST action (Action 17)
/// POST /api/t3-device/graphics/:serial/refresh
/// Body: { "index": 5 } for single item, or {} for all items
/// Returns the raw data from device without saving to database
pub async fn refresh_graphics(
    State(state): State<T3AppState>,
    Path(serial): Path<i32>,
    Json(payload): Json<RefreshGraphicRequest>,
) -> Result<Json<RefreshResponse>, (StatusCode, String)> {
    match payload.index {
        Some(idx) => {
            info!("REFRESH_WEBVIEW_LIST: Refreshing single graphic - Serial: {}, Index: {}", serial, idx);
        }
        None => {
            info!("REFRESH_WEBVIEW_LIST: Refreshing all graphics - Serial: {}", serial);
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
        "entryType": BAC_GRP,  // 10 = GRAPHICS
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
                        format!("Graphics refresh not implemented in device firmware: {}", error_msg),
                    ));
                }

                error!("❌ Device returned error: {}", error_msg);
                return Err((
                    StatusCode::BAD_REQUEST,
                    format!("Device error: {}", error_msg),
                ));
            }

            // Extract items array from C++ response
            let items = response_json.get("items")
                .and_then(|v| v.as_array())
                .cloned()
                .unwrap_or_default();

            let count = items.len() as i32;
            let message = if let Some(idx) = payload.index {
                format!("Successfully refreshed graphic {} from device", idx)
            } else {
                format!("Successfully refreshed {} graphics from device", count)
            };

            info!("✅ {}", message);

            Ok(Json(RefreshResponse {
                success: true,
                message,
                items: items.into_iter().map(|item| item.clone()).collect(),
                count,
                timestamp: chrono::Utc::now().to_rfc3339(),
            }))
        }
        Err(e) => {
            error!("❌ FFI call failed: {}", e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to communicate with device: {}", e),
            ))
        }
    }
}

/// Save refreshed graphics data to database
/// POST /api/t3-device/graphics/:serial/save-refreshed
/// Body: { "items": [...refreshed graphics data...] }
pub async fn save_refreshed_graphics(
    State(state): State<T3AppState>,
    Path(serial): Path<i32>,
    Json(payload): Json<SaveRefreshedDataRequest>,
) -> Result<Json<SaveResponse>, (StatusCode, String)> {
    info!("SAVE_REFRESHED: Saving {} refreshed graphics - Serial: {}", payload.items.len(), serial);

    // Get database connection from state
    let db_connection = match &state.t3_device_conn {
        Some(conn) => conn.lock().await.clone(),
        None => {
            error!("❌ T3000 device database unavailable");
            return Err((StatusCode::SERVICE_UNAVAILABLE, "T3000 device database unavailable".to_string()));
        }
    };

    let mut saved_count = 0;

    // Process each graphic item
    for item in &payload.items {
        // Extract graphic data from the item
        let graphic_id = item.get("graphicId").and_then(|v| v.as_str()).map(|s| s.to_string());
        let graphic_label = item.get("graphicLabel").and_then(|v| v.as_str()).map(|s| s.to_string());
        let graphic_picture_file = item.get("graphicPictureFile").and_then(|v| v.as_str()).map(|s| s.to_string());
        let switch_node = item.get("switchNode").and_then(|v| v.as_str()).map(|s| s.to_string());
        let graphic_total_point = item.get("graphicTotalPoint").and_then(|v| v.as_str()).map(|s| s.to_string());

        // Check if graphic already exists
        let existing = if let Some(ref gid) = graphic_id {
            graphics::Entity::find()
                .filter(graphics::Column::SerialNumber.eq(serial))
                .filter(graphics::Column::GraphicId.eq(gid))
                .one(&db_connection)
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)))?
        } else {
            None
        };

        if let Some(existing_graphic) = existing {
            // Update existing graphic
            let mut active_model: graphics::ActiveModel = existing_graphic.into();
            active_model.graphic_label = Set(graphic_label);
            active_model.graphic_picture_file = Set(graphic_picture_file);
            active_model.switch_node = Set(switch_node);
            active_model.graphic_total_point = Set(graphic_total_point);

            active_model.update(&db_connection).await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to update graphic: {}", e)))?;

            saved_count += 1;
            info!("✅ Updated graphic: {:?}", graphic_id);
        } else {
            // Insert new graphic
            let new_graphic = graphics::ActiveModel {
                serial_number: Set(serial),
                graphic_id: Set(graphic_id.clone()),
                graphic_label: Set(graphic_label),
                graphic_picture_file: Set(graphic_picture_file),
                switch_node: Set(switch_node),
                graphic_total_point: Set(graphic_total_point),
            };

            new_graphic.insert(&db_connection).await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to insert graphic: {}", e)))?;

            saved_count += 1;
            info!("✅ Inserted new graphic: {:?}", graphic_id);
        }
    }

    let message = format!("Successfully saved {} graphics to database", saved_count);
    info!("✅ {}", message);

    Ok(Json(SaveResponse {
        success: true,
        message,
        saved_count,
        timestamp: chrono::Utc::now().to_rfc3339(),
    }))
}

// Helper function to call C++ FFI for refresh operations
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

/// Load graphics using GET_INITIAL_DATA (Action 1) and save to database
/// POST /api/t3-device/graphics/:serial/load-and-save
/// Body: { "viewitem": 0 } for specific screen index
/// This uses Action 1 (GET_INITIAL_DATA) to load graphic screen data and parse items to save
pub async fn load_and_save_graphics(
    State(state): State<T3AppState>,
    Path(serial): Path<i32>,
    Json(_payload): Json<Value>,
) -> Result<Json<SaveResponse>, (StatusCode, String)> {
    info!("GET_INITIAL_DATA: Loading and saving graphics - Serial: {}", serial);
    let _ = write_structured_log_with_level(
        "T3_Webview_API",
        &format!("📥 POST /graphics/{}/load-and-save - Action 1 (GET_INITIAL_DATA)", serial),
        LogLevel::Info
    );

    // Get database connection from state
    let db_connection = match &state.t3_device_conn {
        Some(conn) => conn.lock().await.clone(),
        None => {
            error!("❌ T3000 device database unavailable");
            return Err((StatusCode::SERVICE_UNAVAILABLE, "T3000 device database unavailable".to_string()));
        }
    };

    // Find panel_id from devices table
    let device = match devices::Entity::find()
        .filter(devices::Column::SerialNumber.eq(serial))
        .one(&db_connection)
        .await
    {
        Ok(Some(device)) => device,
        Ok(None) => {
            error!("Device not found for serial: {}", serial);
            return Err((StatusCode::NOT_FOUND, format!("Device with serial {} not found", serial)));
        }
        Err(e) => {
            error!("Database error querying device: {:?}", e);
            return Err((StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)));
        }
    };

    let panel_id = device.panel_id.unwrap_or(0);

    // Prepare GET_PANEL_DATA request to get graphic screens from cached .prog file (Action 0)
    // C++ loads screen data from .prog files via LoadOnlinePanelData(), we just retrieve it
    let request_json = json!({
        "action": 0, // GET_PANEL_DATA - get cached graphic screen list
        "panelId": panel_id,
        "serialNumber": serial,
        "entryType": BAC_GRP,  // 10 = GRAPHICS/SCREEN
        "msg_source": 1, // From browser
    });

    info!("📤 Calling GET_PANEL_DATA (Action 0) for graphic screens - Panel: {}, Serial: {}", panel_id, serial);
    let _ = write_structured_log_with_level(
        "T3_Webview_API",
        &format!("📤 Calling FFI Action 0 (GET_PANEL_DATA for screens) - Panel: {}, Serial: {}", panel_id, serial),
        LogLevel::Info
    );

    // Call FFI to get graphics list using Action 0 (from prog file cache)
    let response_str = match call_refresh_ffi(0, request_json).await {
        Ok(resp) => {
            let _ = write_structured_log_with_level(
                "T3_Webview_API",
                &format!("📥 FFI Response received - Length: {} bytes", resp.len()),
                LogLevel::Info
            );
            resp
        }
        Err(e) => {
            error!("❌ FFI call failed: {}", e);
            let _ = write_structured_log_with_level(
                "T3_Webview_API",
                &format!("❌ FFI call failed: {}", e),
                LogLevel::Error
            );
            return Err((StatusCode::INTERNAL_SERVER_ERROR, format!("FFI error: {}", e)));
        }
    };

    // Parse response
    let response_value: Value = match serde_json::from_str(&response_str) {
        Ok(val) => val,
        Err(e) => {
            error!("❌ Failed to parse FFI response: {}", e);
            let _ = write_structured_log_with_level(
                "T3_Webview_API",
                &format!("❌ Failed to parse FFI response: {} | Raw: {}", e, &response_str.chars().take(200).collect::<String>()),
                LogLevel::Error
            );
            return Err((StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to parse response: {}", e)));
        }
    };

    // Check for error in response
    if let Some(error) = response_value.get("error") {
        error!("❌ C++ returned error: {}", error);
        let _ = write_structured_log_with_level(
            "T3_Webview_API",
            &format!("❌ C++ returned error: {}", error),
            LogLevel::Error
        );
        return Err((StatusCode::BAD_REQUEST, format!("C++ error: {}", error)));
    }

    // Parse the graphic data JSON - handle various data field formats
    let data_str = match response_value.get("data") {
        Some(data_value) => {
            // Try as string first
            if let Some(s) = data_value.as_str() {
                if s.is_empty() {
                    warn!("⚠️ Graphics data field is empty string");
                    "{}"
                } else {
                    s
                }
            }
            // Try as null
            else if data_value.is_null() {
                warn!("⚠️ Graphics data field is null, using empty object");
                "{}"
            }
            // Try as object (already parsed)
            else if data_value.is_object() || data_value.is_array() {
                warn!("⚠️ Graphics data field is already parsed JSON, converting to string");
                &serde_json::to_string(data_value).unwrap_or_else(|_| "{}".to_string())
            }
            else {
                error!("❌ Graphics data field has unexpected type: {:?}", data_value);
                error!("❌ Full response: {}", serde_json::to_string_pretty(&response_value).unwrap_or_default());
                let _ = write_structured_log_with_level(
                    "T3_Webview_API",
                    &format!("❌ Invalid 'data' field type | Response keys: {:?}", response_value.as_object().map(|o| o.keys().collect::<Vec<_>>())),
                    LogLevel::Error
                );
                return Err((StatusCode::INTERNAL_SERVER_ERROR, "Invalid data field type in response".to_string()));
            }
        }
        None => {
            error!("❌ No 'data' field in response");
            error!("❌ Full response: {}", serde_json::to_string_pretty(&response_value).unwrap_or_default());
            let _ = write_structured_log_with_level(
                "T3_Webview_API",
                &format!("❌ Missing 'data' field | Response keys: {:?}", response_value.as_object().map(|o| o.keys().collect::<Vec<_>>())),
                LogLevel::Error
            );
            return Err((StatusCode::INTERNAL_SERVER_ERROR, "No data field in response".to_string()));
        }
    };

    info!("📄 Graphic data string (first 500 chars): {}", &data_str.chars().take(500).collect::<String>());
    let _ = write_structured_log_with_level(
        "T3_Webview_API",
        &format!("📄 Graphic data preview: {}", &data_str.chars().take(200).collect::<String>()),
        LogLevel::Info
    );

    let graphic_data: Value = match serde_json::from_str(data_str) {
        Ok(val) => val,
        Err(e) => {
            error!("❌ Failed to parse graphic data JSON: {}", e);
            error!("❌ Data string: {}", data_str);
            let _ = write_structured_log_with_level(
                "T3_Webview_API",
                &format!("❌ Failed to parse graphic data JSON: {} | Data: {}", e, &data_str.chars().take(200).collect::<String>()),
                LogLevel::Error
            );
            return Err((StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to parse graphic data: {}", e)));
        }
    };

    // C++ returns graphic data as a JSON array directly in the "data" field, NOT wrapped in an object
    // The parsed graphic_data should be either:
    // 1. An array directly: [{...}, {...}]
    // 2. An object with "items" field: {"items": [{...}, {...}]}
    // 3. An object with "myitems" field: {"myitems": [{...}, {...}]}

    let items = if graphic_data.is_array() {
        // Direct array format from C++
        info!("📊 Graphic data is a direct array with {} items", graphic_data.as_array().unwrap().len());
        let _ = write_structured_log_with_level(
            "T3_Webview_API",
            &format!("📊 Graphic data is direct array - {} items", graphic_data.as_array().unwrap().len()),
            LogLevel::Info
        );
        graphic_data.as_array().unwrap()
    } else if let Some(items_array) = graphic_data.get("items").and_then(|v| v.as_array()) {
        // Object with "items" field
        info!("📊 Graphic data has 'items' field with {} items", items_array.len());
        let _ = write_structured_log_with_level(
            "T3_Webview_API",
            &format!("📊 Graphic data has 'items' field - {} items", items_array.len()),
            LogLevel::Info
        );
        items_array
    } else if let Some(myitems_array) = graphic_data.get("myitems").and_then(|v| v.as_array()) {
        // Object with "myitems" field (legacy format)
        info!("📊 Graphic data has 'myitems' field with {} items", myitems_array.len());
        let _ = write_structured_log_with_level(
            "T3_Webview_API",
            &format!("📊 Graphic data has 'myitems' field - {} items", myitems_array.len()),
            LogLevel::Info
        );
        myitems_array
    } else {
        // Unknown format
        error!("❌ Graphic data is not an array and has no 'items' or 'myitems' field");
        error!("❌ Data type: {}", if graphic_data.is_object() { "object" } else if graphic_data.is_null() { "null" } else { "unknown" });
        if graphic_data.is_object() {
            error!("❌ Available keys: {:?}", graphic_data.as_object().map(|o| o.keys().collect::<Vec<_>>()));
        }
        let _ = write_structured_log_with_level(
            "T3_Webview_API",
            &format!("❌ Invalid graphic data format | Type: {} | Preview: {}",
                if graphic_data.is_object() { "object" } else if graphic_data.is_null() { "null" } else { "unknown" },
                serde_json::to_string_pretty(&graphic_data).unwrap_or_default().chars().take(500).collect::<String>()
            ),
            LogLevel::Error
        );
        return Err((StatusCode::INTERNAL_SERVER_ERROR, "Graphic data is not in expected format".to_string()));
    };

    info!("📊 Found {} items in response, filtering for type='GRP'", items.len());
    let _ = write_structured_log_with_level(
        "T3_Webview_API",
        &format!("📊 Found {} items total, filtering for GRP type only", items.len()),
        LogLevel::Info
    );

    // Filter items to only include type="GRP" (graphics)
    let grp_items: Vec<&Value> = items.iter()
        .filter(|item| {
            item.get("type")
                .and_then(|v| v.as_str())
                .map(|t| t == "GRP")
                .unwrap_or(false)
        })
        .collect();

    info!("📊 Filtered to {} GRP items (graphics only)", grp_items.len());
    let _ = write_structured_log_with_level(
        "T3_Webview_API",
        &format!("📊 Filtered {} GRP items from {} total items", grp_items.len(), items.len()),
        LogLevel::Info
    );

    // Save each GRP item to database
    let mut saved_count = 0;
    for (idx, item) in grp_items.iter().enumerate() {
        // Extract item data
        let graphic_id_str = idx.to_string();
        let switch_node = item.get("id").and_then(|v| v.as_i64()).unwrap_or(0).to_string();
        let label = item.get("label").and_then(|v| v.as_str()).unwrap_or("").to_string();
        let title = item.get("title").and_then(|v| v.as_str()).unwrap_or("").to_string();

        // Use title as label if label is empty
        let final_label = if label.is_empty() { title.clone() } else { label };

        // Extract picture file if available
        let picture_file = item.get("src")
            .or_else(|| item.get("image"))
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();

        // Extract total points (count t3Entry bindings)
        let total_point_str = if let Some(t3_entry) = item.get("t3Entry") {
            if t3_entry.is_object() { "1".to_string() } else { "0".to_string() }
        } else { "0".to_string() };

        // Create or update graphics record
        let existing = graphics::Entity::find()
            .filter(graphics::Column::SerialNumber.eq(serial))
            .filter(graphics::Column::GraphicId.eq(graphic_id_str.clone()))
            .one(&db_connection)
            .await;

        match existing {
            Ok(Some(existing_graphic)) => {
                // Update existing record
                let mut active_model: graphics::ActiveModel = existing_graphic.into();
                active_model.switch_node = Set(Some(switch_node.clone()));
                active_model.graphic_label = Set(Some(final_label.clone()));
                active_model.graphic_picture_file = Set(Some(picture_file.clone()));
                active_model.graphic_total_point = Set(Some(total_point_str.clone()));

                match active_model.update(&db_connection).await {
                    Ok(_) => {
                        info!("✅ Updated graphic {} for serial {}", graphic_id_str, serial);
                        saved_count += 1;
                    }
                    Err(e) => {
                        error!("❌ Failed to update graphic {}: {:?}", graphic_id_str, e);
                    }
                }
            }
            Ok(None) => {
                // Insert new record
                let new_graphic = graphics::ActiveModel {
                    serial_number: Set(serial),
                    graphic_id: Set(Some(graphic_id_str.clone())),
                    switch_node: Set(Some(switch_node.clone())),
                    graphic_label: Set(Some(final_label.clone())),
                    graphic_picture_file: Set(Some(picture_file.clone())),
                    graphic_total_point: Set(Some(total_point_str.clone())),
                    ..Default::default()
                };

                match new_graphic.insert(&db_connection).await {
                    Ok(_) => {
                        info!("✅ Inserted graphic {} for serial {}", graphic_id_str, serial);
                        saved_count += 1;
                    }
                    Err(e) => {
                        error!("❌ Failed to insert graphic {}: {:?}", graphic_id_str, e);
                    }
                }
            }
            Err(e) => {
                error!("❌ Database error checking existing graphic: {:?}", e);
            }
        }
    }

    info!("✅ Saved {} graphics to database", saved_count);

    Ok(Json(SaveResponse {
        success: true,
        message: format!("Loaded and saved {} graphics", saved_count),
        saved_count,
        timestamp: chrono::Utc::now().to_rfc3339(),
    }))
}

/// Helper function to call GET_INITIAL_DATA FFI (Action 1)
#[allow(dead_code)]
async fn call_get_initial_data_ffi(request_json: Value) -> Result<String, String> {
    use crate::t3_device::t3_ffi_sync_service::{load_t3000_function, BACNETWEBVIEW_HANDLE_WEBVIEW_MSG_FN};
    const ACTION_GET_INITIAL_DATA: i32 = 1;

    let input_str = request_json.to_string();
    info!("📤 Sending to C++ (Action {}): {}", ACTION_GET_INITIAL_DATA, input_str);

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
        const BUFFER_SIZE: usize = 1024 * 1024 * 2; // 2MB buffer for graphic data + images
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
                    ACTION_GET_INITIAL_DATA,
                    buffer.as_mut_ptr() as *mut std::os::raw::c_char,
                    buffer.len() as i32,
                );

                match result {
                    0 => {
                        // Success - read response from buffer
                        let null_pos = buffer.iter().position(|&b| b == 0).unwrap_or(buffer.len());
                        let response = String::from_utf8_lossy(&buffer[..null_pos]).to_string();
                        info!("📥 C++ Response (Action {}): {}", ACTION_GET_INITIAL_DATA, response);
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
