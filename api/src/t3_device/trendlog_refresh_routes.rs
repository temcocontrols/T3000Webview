// TrendLog Refresh API Routes
// Provides RESTful endpoints for refreshing trendlog data using GET_WEBVIEW_LIST action

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
use crate::entity::t3_device::{devices, trendlogs, trendlog_inputs, input_points, output_points, variable_points};
use crate::t3_device::t3_ffi_sync_service::WebViewMessageType;
use sea_orm::*;

// Entry type constants matching C++ defines
const BAC_AMON: i32 = 9;  // BAC_AMON = Analog Monitors (trendlogs)

/// Request payload for refreshing a single trendlog (index is optional)
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RefreshTrendlogRequest {
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

/// Creates and returns the trendlog refresh API routes
pub fn create_trendlog_refresh_routes() -> Router<T3AppState> {
    Router::new()
        .route("/trendlogs/:serial/refresh", axum::routing::post(refresh_trendlogs))
        .route("/trendlogs/:serial/save-refreshed", axum::routing::post(save_refreshed_trendlogs))
}

/// Refresh trendlog(s) from device using GET_WEBVIEW_LIST action (Action 17)
pub async fn refresh_trendlogs(
    State(state): State<T3AppState>,
    Path(serial): Path<i32>,
    Json(payload): Json<RefreshTrendlogRequest>,
) -> Result<Json<RefreshResponse>, (StatusCode, String)> {
    match payload.index {
        Some(idx) => {
            info!("GET_WEBVIEW_LIST: Refreshing single trendlog - Serial: {}, Index: {}", serial, idx);
        }
        None => {
            info!("GET_WEBVIEW_LIST: Refreshing all trendlogs - Serial: {}", serial);
        }
    }

    let db_connection = match &state.t3_device_conn {
        Some(conn) => conn.lock().await.clone(),
        None => {
            error!("❌ T3000 device database unavailable");
            return Err((StatusCode::SERVICE_UNAVAILABLE, "T3000 device database unavailable".to_string()));
        }
    };

    let panel_id = match devices::Entity::find()
        .filter(devices::Column::SerialNumber.eq(serial))
        .one(&db_connection)
        .await
    {
        Ok(Some(device)) => device.panel_number.or(device.panel_id).unwrap_or(0),
        Ok(None) => {
            error!("Device not found for serial: {}", serial);
            return Err((StatusCode::NOT_FOUND, format!("Device with serial {} not found", serial)));
        }
        Err(e) => {
            error!("Database error querying device: {:?}", e);
            return Err((StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)));
        }
    };

    let mut refresh_json = json!({
        "action": WebViewMessageType::GET_WEBVIEW_LIST as i32,
        "panelId": panel_id,
        "serialNumber": serial,
        "entryType": BAC_AMON,
    });

    if let Some(idx) = payload.index {
        refresh_json["entryIndex"] = json!(idx);
    }

    match call_refresh_ffi(WebViewMessageType::GET_WEBVIEW_LIST as i32, refresh_json).await {
        Ok(response) => {
            let response_json: Value = match serde_json::from_str(&response) {
                Ok(json) => json,
                Err(e) => {
                    error!("❌ Failed to parse C++ response: {}", e);
                    return Err((StatusCode::INTERNAL_SERVER_ERROR, format!("Invalid response from device: {}", e)));
                }
            };

            let success = response_json.get("success").and_then(|v| v.as_bool()).unwrap_or(false);
            if !success {
                let error_msg = response_json.get("message").and_then(|v| v.as_str()).unwrap_or("Unknown error from device");
                let debug_msg = response_json.get("debug").and_then(|v| v.as_str()).unwrap_or("");

                if debug_msg.contains("empty response") || error_msg.contains("not implemented") {
                    error!("❌ Action 17 not implemented in C++: {}", debug_msg);
                    return Err((StatusCode::NOT_IMPLEMENTED, "GET_WEBVIEW_LIST (Action 17) not yet implemented in C++".to_string()));
                }

                error!("❌ Device refresh failed: {}", error_msg);
                return Err((StatusCode::INTERNAL_SERVER_ERROR, format!("{}", error_msg)));
            }

            let items = response_json.get("items").and_then(|v| v.as_array()).map(|arr| arr.clone()).unwrap_or_default();
            let count = items.len() as i32;

            info!("✅ Refreshed {} trendlog(s) from device", count);
            Ok(Json(RefreshResponse {
                success: true,
                message: format!("Refreshed {} trendlog(s) from device", count),
                items,
                count,
                timestamp: chrono::Utc::now().to_rfc3339(),
            }))
        }
        Err(e) => {
            error!("❌ Failed to refresh trendlogs: {}", e);
            if e.contains("not implemented") || e.contains("empty response") {
                return Err((StatusCode::NOT_IMPLEMENTED, "GET_WEBVIEW_LIST (Action 17) not yet implemented in C++".to_string()));
            }
            Err((StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to refresh trendlogs: {}", e)))
        }
    }
}

/// Save refreshed trendlogs to database
pub async fn save_refreshed_trendlogs(
    State(state): State<T3AppState>,
    Path(serial): Path<i32>,
    Json(payload): Json<SaveRefreshedDataRequest>,
) -> Result<Json<SaveResponse>, (StatusCode, String)> {
    info!("Saving {} refreshed trendlog(s) to database - Serial: {}", payload.items.len(), serial);

    // When Center DB (SQL Server) is configured but currently unreachable, the process
    // has already fallen back to local SQLite for t3_device_conn. Writing here would
    // silently store data only in local SQLite while the user believes it went to the
    // center DB, causing data divergence across PCs. Block the save and tell the caller.
    if state.server_db_enabled && !state.server_db_connected {
        warn!("⚠️ Refusing save-refreshed for serial={}: Center DB configured but unreachable — data would be lost on server side", serial);
        return Err((
            StatusCode::SERVICE_UNAVAILABLE,
            "Center DB (SQL Server) is configured but currently unreachable. \
             Data cannot be saved — it would only land in local SQLite and \
             never reach the shared center database. \
             Please check your SQL Server connection.".to_string(),
        ));
    }

    let db_connection = match &state.t3_device_conn {
        Some(conn) => conn.lock().await.clone(),
        None => {
            error!("❌ T3000 device database unavailable");
            return Err((StatusCode::SERVICE_UNAVAILABLE, "T3000 device database unavailable".to_string()));
        }
    };

    let saved_count = match save_trendlogs_to_db(&db_connection, serial, &payload.items).await {
        Ok(count) => count,
        Err(e) => {
            error!("❌ Failed to save trendlogs to database: {}", e);
            return Err((StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to save to database: {}", e)));
        }
    };

    info!("✅ Saved {} trendlog(s) to database", saved_count);
    Ok(Json(SaveResponse {
        success: true,
        message: format!("Saved {} trendlog(s) to database", saved_count),
        saved_count,
        timestamp: chrono::Utc::now().to_rfc3339(),
    }))
}

/// Extract a string value from JSON, handling both string and integer values
fn get_string_value(item: &Value, key1: &str, key2: &str) -> Option<String> {
    item.get(key1).or_else(|| item.get(key2)).and_then(|v| {
        if let Some(s) = v.as_str() {
            Some(s.to_string())
        } else if let Some(n) = v.as_i64() {
            Some(n.to_string())
        } else {
            None
        }
    })
}

async fn save_trendlogs_to_db(db: &DatabaseConnection, serial: i32, items: &[Value]) -> Result<i32, String> {
    let mut saved_count = 0;

    // Look up panel_id from device
    let panel_id = devices::Entity::find()
        .filter(devices::Column::SerialNumber.eq(serial))
        .one(db)
        .await
        .map_err(|e| format!("Database query error: {}", e))?
        .map(|d| d.panel_number.or(d.panel_id).unwrap_or(0))
        .unwrap_or(0);

    for item in items {
        let trendlog_index = item.get("trendlogId")
            .or_else(|| item.get("trendlog_id"))
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());

        if trendlog_index.is_none() {
            error!("⚠️ Skipping item without trendlogId: {:?}", item);
            continue;
        }
        let trendlog_index = trendlog_index.unwrap();

        let existing_trendlog = trendlogs::Entity::find()
            .filter(trendlogs::Column::SerialNumber.eq(serial))
            .filter(trendlogs::Column::TrendlogId.eq(&trendlog_index))
            .one(db)
            .await
            .map_err(|e| format!("Database query error: {}", e))?;

        if let Some(trendlog_model) = existing_trendlog {
            // UPDATE existing record
            let mut active_model: trendlogs::ActiveModel = trendlog_model.into();

            if let Some(val) = get_string_value(item, "trendlogLabel", "trendlog_label") {
                active_model.trendlog_label = Set(Some(val));
            }
            if let Some(val) = item.get("intervalSeconds").or_else(|| item.get("interval_seconds")).and_then(|v| v.as_i64()) {
                active_model.interval_seconds = Set(Some(val as i32));
            }
            if let Some(val) = item.get("bufferSize").or_else(|| item.get("buffer_size")).and_then(|v| v.as_i64()) {
                active_model.buffer_size = Set(Some(val as i32));
            }
            if let Some(val) = get_string_value(item, "autoManual", "auto_manual") {
                active_model.auto_manual = Set(Some(val));
            }
            if let Some(val) = get_string_value(item, "status", "status") {
                active_model.status = Set(Some(val));
            }
            let now = chrono::Utc::now().to_rfc3339();
            active_model.updated_at = Set(Some(now.clone()));
            active_model.ffi_synced = Set(Some(1));
            active_model.last_ffi_sync = Set(Some(now));

            active_model.update(db).await.map_err(|e| format!("Failed to update trendlog: {}", e))?;
            saved_count += 1;
        } else {
            // INSERT new record
            let now = chrono::Utc::now().to_rfc3339();
            let new_trendlog = trendlogs::ActiveModel {
                id: NotSet,
                serial_number: Set(serial),
                panel_id: Set(item.get("panelId").and_then(|v| v.as_i64()).unwrap_or(panel_id as i64) as i32),
                trendlog_id: Set(trendlog_index.clone()),
                switch_node: Set(Some(trendlog_index.clone())),
                trendlog_label: Set(get_string_value(item, "trendlogLabel", "trendlog_label")),
                interval_seconds: Set(item.get("intervalSeconds").or_else(|| item.get("interval_seconds")).and_then(|v| v.as_i64()).map(|v| v as i32)),
                buffer_size: Set(item.get("bufferSize").or_else(|| item.get("buffer_size")).and_then(|v| v.as_i64()).map(|v| v as i32)),
                data_size_kb: Set(None),
                auto_manual: Set(get_string_value(item, "autoManual", "auto_manual")),
                status: Set(get_string_value(item, "status", "status")),
                ffi_synced: Set(Some(1)),
                last_ffi_sync: Set(Some(now.clone())),
                created_at: Set(Some(now.clone())),
                updated_at: Set(Some(now)),
            };
            new_trendlog.insert(db).await.map_err(|e| format!("Failed to insert trendlog: {}", e))?;
            info!("✅ Created new trendlog record: serial={}, trendlog_id={}", serial, trendlog_index);
            saved_count += 1;
        }

        // Save monitor input points to TRENDLOG_INPUTS
        let item_panel_id = item.get("panelId").and_then(|v| v.as_i64()).unwrap_or(panel_id as i64) as i32;
        let raw_inputs = item.get("inputs");
        info!("🔍 Trendlog {} inputs field type: is_array={}, is_object={}, numInputs={}, raw={:?}",
            trendlog_index,
            raw_inputs.map_or(false, |v| v.is_array()),
            raw_inputs.map_or(false, |v| v.is_object()),
            item.get("numInputs").and_then(|v| v.as_i64()).unwrap_or(0),
            raw_inputs.map(|v| v.to_string().chars().take(500).collect::<String>())
        );

        // Handle inputs as either JSON array or JSON object with numeric keys (C++ can send either format)
        let inputs_vec: Vec<Value> = if let Some(arr) = raw_inputs.and_then(|v| v.as_array()) {
            arr.clone()
        } else if let Some(obj) = raw_inputs.and_then(|v| v.as_object()) {
            // Convert object {"0": {...}, "1": {...}} to array
            let mut pairs: Vec<(usize, Value)> = obj.iter()
                .filter_map(|(k, v)| k.parse::<usize>().ok().map(|i| (i, v.clone())))
                .collect();
            pairs.sort_by_key(|(i, _)| *i);
            pairs.into_iter().map(|(_, v)| v).collect()
        } else {
            Vec::new()
        };

        if !inputs_vec.is_empty() {
            let num_inputs = item.get("numInputs").and_then(|v| v.as_i64()).unwrap_or(inputs_vec.len() as i64) as usize;
            let now = chrono::Utc::now().to_rfc3339();

            // Clear ALL existing inputs for this trendlog (MAIN and VIEW) before re-inserting fresh data
            let _ = trendlog_inputs::Entity::delete_many()
                .filter(trendlog_inputs::Column::SerialNumber.eq(serial))
                .filter(trendlog_inputs::Column::TrendlogId.eq(&trendlog_index))
                .exec(db)
                .await;

            let mut input_count = 0;
            for (idx, input_val) in inputs_vec.iter().enumerate() {
                if idx >= num_inputs { break; }

                let pt = input_val.get("point_type").and_then(|v| v.as_i64()).unwrap_or(0);
                let pn = input_val.get("point_number").and_then(|v| v.as_i64()).unwrap_or(0);
                let panel = input_val.get("panel").and_then(|v| v.as_i64()).unwrap_or(0);

                info!("🔍 Trendlog input[{}]: raw point_type={}, point_number={}, panel={}, full_json={}", idx, pt, pn, panel, input_val);

                // Only save valid points (point_type > 0)
                if pt > 0 {
                    // PointNet point_type is 1-based offset from BAC_* constants:
                    // BAC_OUT=0 → pt=1 (OUTPUT), BAC_IN=1 → pt=2 (INPUT), BAC_VAR=2 → pt=3 (VARIABLE)
                    let point_type_str = match pt {
                        1 => "OUTPUT",
                        2 => "INPUT",
                        3 => "VARIABLE",
                        _ => "UNKNOWN",
                    }.to_string();

                    let fallback_label = format!("{}_{}",
                        match pt { 1 => "OUT", 2 => "IN", 3 => "VAR", _ => "UNK" },
                        pn
                    );

                    // Resolve actual label from DB (INPUTS/OUTPUTS/VARIABLES tables)
                    let point_label = match pt {
                        1 => {
                            // pt=1 is OUTPUT (BAC_OUT+1) — Look up from OUTPUTS by serial + index
                            output_points::Entity::find()
                                .filter(output_points::Column::SerialNumber.eq(serial))
                                .filter(output_points::Column::OutputIndex.eq(pn.to_string()))
                                .one(db).await.ok().flatten()
                                .and_then(|p| p.label.filter(|l| !l.is_empty()).or(p.full_label))
                                .filter(|l| !l.is_empty())
                                .unwrap_or_else(|| fallback_label.clone())
                        }
                        2 => {
                            // pt=2 is INPUT (BAC_IN+1) — Look up from INPUTS by serial + index
                            input_points::Entity::find()
                                .filter(input_points::Column::SerialNumber.eq(serial))
                                .filter(input_points::Column::InputIndex.eq(pn.to_string()))
                                .one(db).await.ok().flatten()
                                .and_then(|p| p.label.filter(|l| !l.is_empty()).or(p.full_label))
                                .filter(|l| !l.is_empty())
                                .unwrap_or_else(|| fallback_label.clone())
                        }
                        3 => {
                            // Look up from VARIABLES by serial + index
                            variable_points::Entity::find()
                                .filter(variable_points::Column::SerialNumber.eq(serial))
                                .filter(variable_points::Column::VariableIndex.eq(pn.to_string()))
                                .one(db).await.ok().flatten()
                                .and_then(|p| p.label.filter(|l| !l.is_empty()).or(p.full_label))
                                .filter(|l| !l.is_empty())
                                .unwrap_or_else(|| fallback_label.clone())
                        }
                        _ => fallback_label.clone(),
                    };

                    info!("📝 Trendlog input[{}]: pt={} → type_str={}, pn={}, resolved_label={}, fallback={}", idx, pt, point_type_str, pn, point_label, fallback_label);

                    let input_record = trendlog_inputs::ActiveModel {
                        id: NotSet,
                        serial_number: Set(serial),
                        panel_id: Set(item_panel_id),
                        trendlog_id: Set(trendlog_index.clone()),
                        point_type: Set(point_type_str),
                        point_index: Set(pn.to_string()),
                        point_panel: Set(Some(panel.to_string())),
                        point_label: Set(Some(point_label)),
                        status: Set(Some("ACTIVE".to_string())),
                        view_type: Set(Some("MAIN".to_string())),
                        view_number: Set(None),
                        is_selected: Set(Some(1)),
                        created_at: Set(Some(now.clone())),
                        updated_at: Set(Some(now.clone())),
                    };

                    if let Err(e) = input_record.insert(db).await {
                        error!("Failed to insert trendlog input: {}", e);
                    } else {
                        input_count += 1;
                    }
                }
            }
            if input_count > 0 {
                info!("✅ Saved {} input point(s) for {}", input_count, trendlog_index);
            }
        }
    }

    Ok(saved_count)
}

async fn call_refresh_ffi(action: i32, refresh_json: Value) -> Result<String, String> {
    use crate::t3_device::t3_ffi_sync_service::load_t3000_function;

    let input_str = refresh_json.to_string();
    info!("📤 Sending to C++ (Action {}): {}", action, input_str);

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

    tokio::task::spawn_blocking(move || {
        use crate::t3_device::t3_ffi_sync_service::BACNETWEBVIEW_HANDLE_WEBVIEW_MSG_FN;

        const BUFFER_SIZE: usize = 1048576;
        let mut buffer: Vec<u8> = vec![0; BUFFER_SIZE];
        let input_bytes = input_str.as_bytes();

        if input_bytes.len() >= BUFFER_SIZE {
            return Err("Input JSON too large for buffer".to_string());
        }

        buffer[..input_bytes.len()].copy_from_slice(input_bytes);
        buffer[input_bytes.len()] = 0;

        unsafe {
            if let Some(func) = BACNETWEBVIEW_HANDLE_WEBVIEW_MSG_FN {
                let result = func(action, buffer.as_mut_ptr() as *mut std::os::raw::c_char, buffer.len() as i32);

                match result {
                    0 => {
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
    .map_err(|e| format!("Task spawn error: {}", e))?
}
