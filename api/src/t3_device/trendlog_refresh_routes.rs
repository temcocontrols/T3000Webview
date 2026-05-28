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
use crate::t3_device::action17_refresh_helper::lookup_action17_target;
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

    // Flow logging (best-effort)
    let flow_db_opt = crate::db_connection::establish_t3_device_connection().await
        .map_err(|e| e.to_string()).ok();
    let flow_opt = if let Some(ref fdb) = flow_db_opt {
        Some(crate::logging::flow::FlowHandle::start(
            fdb, "TRENDLOG_REFRESH", "api", 2,
            Some(&format!("serial={} index={:?}", serial, payload.index)),
        ).await)
    } else {
        None
    };
    let t0 = std::time::Instant::now();

    let db_connection = match &state.t3_device_conn {
        Some(conn) => conn.lock().await.clone(),
        None => {
            error!("❌ T3000 device database unavailable");
            if let (Some(ref fdb), Some(ref fh)) = (&flow_db_opt, &flow_opt) {
                fh.step(fdb, "db_connect", "error", "api", "error",
                    t0.elapsed().as_millis() as i64, "T3000 device database unavailable", None).await;
                fh.done(fdb, "error").await;
            }
            return Err((StatusCode::SERVICE_UNAVAILABLE, "T3000 device database unavailable".to_string()));
        }
    };

    let (panel_id, object_instance) = match lookup_action17_target(&db_connection, serial).await {
        Ok(target) => target,
        Err(err) => {
            if let (Some(ref fdb), Some(ref fh)) = (&flow_db_opt, &flow_opt) {
                fh.step(fdb, "lookup_device", "error", "db", "error",
                    t0.elapsed().as_millis() as i64, &err.1, None).await;
                fh.done(fdb, "error").await;
            }
            return Err(err);
        }
    };

    if let (Some(ref fdb), Some(ref fh)) = (&flow_db_opt, &flow_opt) {
        fh.step(fdb, "lookup_device", "info", "db", "ok",
            t0.elapsed().as_millis() as i64,
            &format!("serial={} panel_id={} objectinstance={}", serial, panel_id, object_instance), None).await;
    }

    let mut refresh_json = json!({
        "action": WebViewMessageType::GET_WEBVIEW_LIST as i32,
        "panelId": panel_id,
        "serialNumber": serial,
        "objectinstance": object_instance,
        "entryType": BAC_AMON,
    });

    if let Some(idx) = payload.index {
        refresh_json["entryIndex"] = json!(idx);
    }

    let t1 = std::time::Instant::now();
    match call_refresh_ffi(WebViewMessageType::GET_WEBVIEW_LIST as i32, refresh_json).await {
        Ok(response) => {
            let response_json: Value = match serde_json::from_str(&response) {
                Ok(json) => json,
                Err(e) => {
                    error!("❌ Failed to parse C++ response: {}", e);
                    if let (Some(ref fdb), Some(ref fh)) = (&flow_db_opt, &flow_opt) {
                        fh.step(fdb, "ffi_refresh", "error", "ffi", "error",
                            t1.elapsed().as_millis() as i64,
                            &format!("parse error: {}", e), None).await;
                        fh.done(fdb, "error").await;
                    }
                    return Err((StatusCode::INTERNAL_SERVER_ERROR, format!("Invalid response from device: {}", e)));
                }
            };

            let success = response_json.get("success").and_then(|v| v.as_bool()).unwrap_or(false);
            if !success {
                let error_msg = response_json.get("message").and_then(|v| v.as_str()).unwrap_or("Unknown error from device");
                let debug_msg = response_json.get("debug").and_then(|v| v.as_str()).unwrap_or("");

                if debug_msg.contains("empty response") || error_msg.contains("not implemented") {
                    error!("❌ Action 17 not implemented in C++: {}", debug_msg);
                    if let (Some(ref fdb), Some(ref fh)) = (&flow_db_opt, &flow_opt) {
                        fh.step(fdb, "ffi_refresh", "error", "ffi", "error",
                            t1.elapsed().as_millis() as i64,
                            "GET_WEBVIEW_LIST (Action 17) not implemented in C++", None).await;
                        fh.done(fdb, "error").await;
                    }
                    return Err((StatusCode::NOT_IMPLEMENTED, "GET_WEBVIEW_LIST (Action 17) not yet implemented in C++".to_string()));
                }

                error!("❌ Device refresh failed: {}", error_msg);
                if let (Some(ref fdb), Some(ref fh)) = (&flow_db_opt, &flow_opt) {
                    fh.step(fdb, "ffi_refresh", "error", "ffi", "error",
                        t1.elapsed().as_millis() as i64, error_msg, None).await;
                    fh.done(fdb, "error").await;
                }
                return Err((StatusCode::INTERNAL_SERVER_ERROR, format!("{}", error_msg)));
            }

            let items = response_json.get("items").and_then(|v| v.as_array()).map(|arr| arr.clone()).unwrap_or_default();
            let count = items.len() as i32;

            if let (Some(ref fdb), Some(ref fh)) = (&flow_db_opt, &flow_opt) {
                fh.step(fdb, "ffi_refresh", "info", "ffi", "ok",
                    t1.elapsed().as_millis() as i64,
                    &format!("count={}", count), None).await;
                fh.done(fdb, "ok").await;
            }

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
            if let (Some(ref fdb), Some(ref fh)) = (&flow_db_opt, &flow_opt) {
                fh.step(fdb, "ffi_refresh", "error", "ffi", "error",
                    t1.elapsed().as_millis() as i64, &e, None).await;
                fh.done(fdb, "error").await;
            }
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

    let db_connection = match &state.t3_device_conn {
        Some(conn) => conn.lock().await.clone(),
        None => {
            match crate::db_connection::establish_t3_device_connection().await {
                Ok(conn) => conn,
                Err(_) => {
                    error!("❌ T3000 local device database unavailable");
                    return Err((StatusCode::SERVICE_UNAVAILABLE, "T3000 device database unavailable".to_string()));
                }
            }
        }
    };

    let saved_count = match save_trendlogs_to_db(&db_connection, serial, &payload.items).await {
        Ok(count) => count,
        Err(e) => {
            error!("❌ Failed to save trendlogs to database: {}", e);
            return Err((StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to save to database: {}", e)));
        }
    };

    // Center DB mode: also mirror these two metadata/config tables.
    let mut message = format!("Saved {} trendlog(s) to local SQLite", saved_count);
    if state.server_db_enabled {
        if let Some(pool) = state.mssql_pool.as_ref() {
            match mirror_trendlogs_to_mssql(pool, serial, &payload.items).await {
                Ok(mirrored_count) => {
                    message = format!(
                        "Saved {} trendlog(s) to local SQLite and mirrored {} to Center DB",
                        saved_count, mirrored_count
                    );
                }
                Err(e) => {
                    warn!("⚠️ Center DB mirror for TRENDLOGS/TRENDLOG_INPUTS failed: {}", e);
                    message = format!(
                        "Saved {} trendlog(s) to local SQLite; Center DB mirror failed: {}",
                        saved_count, e
                    );
                }
            }
        } else {
            warn!("⚠️ Center DB enabled but MSSQL pool unavailable; kept local SQLite save only");
            message = format!(
                "Saved {} trendlog(s) to local SQLite; Center DB currently unavailable",
                saved_count
            );
        }
    }

    info!("✅ {}", message);
    Ok(Json(SaveResponse {
        success: true,
        message,
        saved_count,
        timestamp: chrono::Utc::now().to_rfc3339(),
    }))
}

async fn mirror_trendlogs_to_mssql(
    pool: &crate::database_management::mssql_queries::MssqlPool,
    serial: i32,
    items: &[Value],
) -> Result<i32, String> {
    let mut mirrored_count = 0;

    // Fallback from payload-level panel fields; avoid extra DB lookups in handler future.
    let panel_id_fallback = items
        .iter()
        .find_map(|it| {
            it.get("panelId")
                .or_else(|| it.get("panel_id"))
                .or_else(|| it.get("pid"))
                .and_then(|v| v.as_i64())
                .map(|v| v as i32)
                .filter(|v| *v > 0)
        })
        .unwrap_or(0);

    let mut mirror_errors: Vec<String> = Vec::new();

    for item in items {
        let trendlog_id = item
            .get("trendlogId")
            .or_else(|| item.get("trendlog_id"))
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());

        let Some(trendlog_id) = trendlog_id else {
            continue;
        };

        let panel_id_from_item = item
            .get("panelId")
            .or_else(|| item.get("panel_id"))
            .or_else(|| item.get("pid"))
            .and_then(|v| v.as_i64())
            .unwrap_or(0) as i32;
        let panel_id = if panel_id_from_item > 0 {
            panel_id_from_item
        } else {
            panel_id_fallback
        };

        if panel_id <= 0 {
            mirror_errors.push(format!(
                "trendlog={} rejected: invalid panel_id (item={}, fallback={})",
                trendlog_id, panel_id_from_item, panel_id_fallback
            ));
            continue;
        }

        let trendlog_label = get_string_value(item, "trendlogLabel", "trendlog_label");
        let interval_seconds = item
            .get("intervalSeconds")
            .or_else(|| item.get("interval_seconds"))
            .and_then(|v| v.as_i64())
            .map(|v| v as i32);
        let status = get_string_value(item, "status", "status");

        if let Err(e) = crate::database_management::mssql_queries::upsert_trendlog(
            pool,
            serial,
            panel_id,
            &trendlog_id,
            trendlog_label.as_deref(),
            interval_seconds,
            status.as_deref(),
        )
        .await
        {
            mirror_errors.push(format!(
                "trendlog={} upsert_trendlog failed (serial={}, panel={}): {}",
                trendlog_id, serial, panel_id, e
            ));
            continue;
        }

        // Keep MAIN inputs in sync: clear then upsert current set.
        let mut conn = match pool.get().await {
            Ok(c) => c,
            Err(e) => {
                mirror_errors.push(format!(
                    "trendlog={} pool get failed before input clear: {}",
                    trendlog_id, e
                ));
                continue;
            }
        };
        if let Err(e) = conn.execute(
            "DELETE FROM TRENDLOG_INPUTS WHERE SerialNumber = @P1 AND PanelId = @P2 AND Trendlog_ID = @P3 AND (view_type = 'MAIN' OR view_type IS NULL)",
            &[&serial, &panel_id, &trendlog_id],
        )
        .await
        {
            mirror_errors.push(format!(
                "trendlog={} TRENDLOG_INPUTS clear failed (serial={}, panel={}): {}",
                trendlog_id, serial, panel_id, e
            ));
            continue;
        }

        let raw_inputs = item.get("inputs");
        let inputs_vec: Vec<Value> = if let Some(arr) = raw_inputs.and_then(|v| v.as_array()) {
            arr.clone()
        } else if let Some(obj) = raw_inputs.and_then(|v| v.as_object()) {
            let mut pairs: Vec<(usize, Value)> = obj
                .iter()
                .filter_map(|(k, v)| k.parse::<usize>().ok().map(|i| (i, v.clone())))
                .collect();
            pairs.sort_by_key(|(i, _)| *i);
            pairs.into_iter().map(|(_, v)| v).collect()
        } else {
            Vec::new()
        };

        for input_val in &inputs_vec {
            let pt = input_val.get("point_type").and_then(|v| v.as_i64()).unwrap_or(0);
            let pn = input_val.get("point_number").and_then(|v| v.as_i64()).unwrap_or(0);
            if pt <= 0 {
                continue;
            }

            let point_type = match pt {
                1 => "OUTPUT",
                2 => "INPUT",
                3 => "VARIABLE",
                _ => "UNKNOWN",
            };

            let fallback_label = format!(
                "{}_{}",
                match pt {
                    1 => "OUT",
                    2 => "IN",
                    3 => "VAR",
                    _ => "UNK",
                },
                pn
            );
            let point_label = input_val
                .get("point_label")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
                .unwrap_or(fallback_label);

            if let Err(e) = crate::database_management::mssql_queries::upsert_trendlog_input(
                pool,
                serial,
                panel_id,
                &trendlog_id,
                point_type,
                &pn.to_string(),
                Some(point_label.as_str()),
                Some("ACTIVE"),
                "MAIN",
                None,
                1,
            )
            .await
            {
                mirror_errors.push(format!(
                    "trendlog={} input upsert failed (pt={}, pn={}, serial={}, panel={}): {}",
                    trendlog_id, point_type, pn, serial, panel_id, e
                ));
                break;
            }
        }

        mirrored_count += 1;
    }

    if !mirror_errors.is_empty() {
        let preview = mirror_errors.iter().take(6).cloned().collect::<Vec<_>>().join(" | ");
        return Err(format!(
            "MSSQL mirror partial failure: mirrored={}, total={}, errors={} [{}]",
            mirrored_count,
            items.len(),
            mirror_errors.len(),
            preview
        ));
    }

    Ok(mirrored_count)
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

    tokio::task::spawn_blocking(move || {
        use crate::t3_device::t3_ffi_sync_service::BACNETWEBVIEW_HANDLE_WEBVIEW_MSG_FN;

        const BUFFER_SIZE: usize = 1048576;
        // Acquire the global FFI lock before touching C++ — same lock used by call_ffi and call_handle_webview_msg.
        let _guard = crate::t3_device::t3_ffi_api_service::ffi_call_lock()
            .lock()
            .unwrap_or_else(|p| p.into_inner());

        unsafe {
            if !load_t3000_function() {
                return Err("T3000 functions not loaded".to_string());
            }
        }

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
