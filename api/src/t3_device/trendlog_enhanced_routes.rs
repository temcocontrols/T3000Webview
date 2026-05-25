// T3000 TrendLog Enhanced API Routes - FFI Integration and View Management
use axum::{
    extract::{Path, Query, State},
    response::Json,
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};

use crate::app_state::T3AppState;
use crate::error::AppError;
use crate::t3_device::trendlog_ffi_service::{TrendLogFFIService, ViewSelection, TrendLogInfo};
// use serde_json::json;  // Unused - commented out with FFI test endpoints

struct LocalDbConn(sea_orm::DatabaseConnection);

impl std::ops::Deref for LocalDbConn {
    type Target = sea_orm::DatabaseConnection;
    fn deref(&self) -> &sea_orm::DatabaseConnection { &self.0 }
}

// Helper macro to get T3000 device database connection
macro_rules! get_t3_device_conn {
    ($state:expr) => {{
        let _conn = match $state.t3_device_conn.as_ref() {
            Some(conn) => conn.lock().await.clone(),
            None => {
                match crate::db_connection::establish_t3_device_connection().await {
                    Ok(c) => c,
                    Err(_) => {
                        return Err(AppError::InternalError("T3000 device database unavailable".to_string()));
                    }
                }
            }
        };
        LocalDbConn(_conn)
    }};
}

// Request/Response types for view selection API
#[derive(Debug, Serialize, Deserialize)]
pub struct SaveSelectionsRequest {
    pub selections: Vec<ViewSelection>,
    pub serial_number: Option<i32>, // Optional for backward compatibility
    pub panel_id: Option<i32>,      // Optional for backward compatibility
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TrendLogFFIResponse {
    pub success: bool,
    pub message: String,
    pub trendlog_info: Option<TrendLogInfo>,
}

// Request structure for frontend FFI sync call (device_id, panel_id, and chart_title in body)
#[derive(Debug, Serialize, Deserialize)]
pub struct FrontendFFISyncRequest {
    pub device_id: i32,
    pub panel_id: i32,
    pub chart_title: Option<String>,
}

// Enhanced TrendLog routes with FFI integration - IMPROVED FLOW
pub fn create_trendlog_enhanced_routes() -> Router<T3AppState> {
    Router::new()
        // New improved flow endpoints
        .route("/init/:serial_number/:trendlog_id", post(create_initial_trendlog))
        .route("/sync-detailed/:serial_number/:trendlog_id", post(sync_detailed_trendlog))
        // Frontend-expected route pattern (what TrendLogChart.vue is calling)
        .route("/trendlogs/:trendlog_id/init", post(create_initial_trendlog_frontend_pattern))
        .route("/trendlogs/:trendlog_id/sync-ffi", post(sync_trendlog_frontend_pattern))
        // Legacy FFI sync endpoint (for backward compatibility)
        .route("/sync-ffi/:serial_number/:trendlog_id", post(sync_trendlog_with_ffi))
        // View selection management (new pattern)
        .route("/view-selections/:serial_number/:trendlog_id/:view_number", get(get_view_selections))
        .route("/view-selections/:serial_number/:trendlog_id/:view_number", post(save_view_selections))
        // Frontend-expected view selection routes (what TrendLogChart.vue is calling)
        .route("/trendlogs/:trendlog_id/views/:view_number/selections", get(get_view_selections_frontend))
        .route("/trendlogs/:trendlog_id/views/:view_number/selections", post(save_view_selections_frontend))
        // TrendLog info retrieval
        .route("/info/:trendlog_id", get(get_trendlog_info))
        // FFI Testing endpoints - DISABLED (ffi_test_helper moved to tests/ folder)
        // These were used by public/ffi-test.html for diagnostics
        // .route("/ffi/test", get(test_ffi_availability))
        // .route("/ffi/test/:device_id", get(test_device_connection))
        // .route("/ffi/enumerate", get(test_device_enumeration))
}

// NEW: Create initial TrendLog info (fast page load)
pub async fn create_initial_trendlog(
    State(app_state): State<T3AppState>,
    Path((serial_number, trendlog_id)): Path<(i32, String)>,
) -> Result<Json<TrendLogFFIResponse>, AppError> {
    // ── MSSQL branch ──
    if let Some(pool) = &app_state.mssql_pool {
        use crate::database_management::mssql_trendlog_service;
        let info = mssql_trendlog_service::create_initial_trendlog_info(pool, serial_number, 1, &trendlog_id, None)
            .await
            .map_err(|e| AppError::InternalError(format!("MSSQL trendlog init: {}", e)))?;
        // Convert the Value response into TrendLogFFIResponse-like structure
        return Ok(Json(TrendLogFFIResponse {
            success: info["success"].as_bool().unwrap_or(true),
            message: info["message"].as_str().unwrap_or("OK").to_string(),
            trendlog_info: serde_json::from_value(info["trendlog_info"].clone()).ok(),
        }));
    }

    // ── SeaORM branch ──
    let db = get_t3_device_conn!(app_state);

    match TrendLogFFIService::create_initial_trendlog_info(serial_number as u32, &trendlog_id, &*db).await {
        Ok(trendlog_info) => {
            Ok(Json(TrendLogFFIResponse {
                success: true,
                message: "Initial TrendLog info created successfully".to_string(),
                trendlog_info: Some(trendlog_info),
            }))
        }
        Err(e) => {
            Ok(Json(TrendLogFFIResponse {
                success: false,
                message: format!("Initial creation failed: {}", e),
                trendlog_info: None,
            }))
        }
    }
}

// NEW: Create initial TrendLog info (frontend pattern - consistent with sync-ffi)
pub async fn create_initial_trendlog_frontend_pattern(
    State(app_state): State<T3AppState>,
    Path(trendlog_id): Path<String>,
    Json(request): Json<FrontendFFISyncRequest>,
) -> Result<Json<TrendLogFFIResponse>, AppError> {
    // Flow logging (best-effort)
    let flow_db_opt = crate::db_connection::establish_t3_device_connection().await
        .map_err(|e| e.to_string()).ok();
    let flow_opt = if let Some(ref fdb) = flow_db_opt {
        Some(crate::logging::flow::FlowHandle::start(
            fdb, "TRENDLOG_CHART", "init", 0,
            Some(&format!("device={} panel={} trendlog={} title={}",
                request.device_id, request.panel_id, trendlog_id,
                request.chart_title.as_deref().unwrap_or("(none)"))),
        ).await)
    } else {
        None
    };
    let t0 = std::time::Instant::now();

    // Step 0: log query params
    if let (Some(ref fdb), Some(ref fh)) = (&flow_db_opt, &flow_opt) {
        fh.step(fdb, "query_params", "info", "api", "ok", 0,
            &format!("device={} panel={} trendlog={} title={}",
                request.device_id, request.panel_id, trendlog_id,
                request.chart_title.as_deref().unwrap_or("(none)")), None).await;
    }

    // ── MSSQL branch ──
    if let Some(pool) = &app_state.mssql_pool {
        use crate::database_management::mssql_trendlog_service;
        let info = mssql_trendlog_service::create_initial_trendlog_info(
            pool, request.device_id, request.panel_id, &trendlog_id, request.chart_title.as_deref(),
        )
        .await
        .map_err(|e| AppError::InternalError(format!("MSSQL trendlog init: {}", e)))?;
        if let (Some(ref fdb), Some(ref fh)) = (&flow_db_opt, &flow_opt) {
            fh.step(fdb, "create_record", "info", "mssql", "ok",
                t0.elapsed().as_millis() as i64,
                &format!("trendlog record created via MSSQL in {}ms — device={} panel={} trendlog={}",
                    t0.elapsed().as_millis(), request.device_id, request.panel_id, trendlog_id), None).await;
            fh.step(fdb, "init_done", "info", "api", "ok",
                t0.elapsed().as_millis() as i64,
                &format!("chart init complete — total {}ms", t0.elapsed().as_millis()), None).await;
            fh.done(fdb, "ok").await;
        }
        return Ok(Json(TrendLogFFIResponse {
            success: info["success"].as_bool().unwrap_or(true),
            message: info["message"].as_str().unwrap_or("OK").to_string(),
            trendlog_info: serde_json::from_value(info["trendlog_info"].clone()).ok(),
        }));
    }

    // ── SeaORM branch ──
    let db = get_t3_device_conn!(app_state);
    if let (Some(ref fdb), Some(ref fh)) = (&flow_db_opt, &flow_opt) {
        fh.step(fdb, "backend_select", "info", "api", "ok", 0,
            "backend=local_sqlite — using local device DB for trendlog init", None).await;
    }

    let t1 = std::time::Instant::now();
    match TrendLogFFIService::create_initial_trendlog_info_with_panel_and_title(request.device_id as u32, request.panel_id, &trendlog_id, request.chart_title.as_deref(), &*db).await {
        Ok(trendlog_info) => {
            if let (Some(ref fdb), Some(ref fh)) = (&flow_db_opt, &flow_opt) {
                fh.step(fdb, "create_record", "info", "db", "ok",
                    t1.elapsed().as_millis() as i64,
                    &format!("trendlog record created in {}ms — device={} panel={} trendlog={}",
                        t1.elapsed().as_millis(), request.device_id, request.panel_id, trendlog_id), None).await;
                fh.step(fdb, "init_done", "info", "api", "ok",
                    t0.elapsed().as_millis() as i64,
                    &format!("chart init complete — total {}ms", t0.elapsed().as_millis()), None).await;
                fh.done(fdb, "ok").await;
            }
            Ok(Json(TrendLogFFIResponse {
                success: true,
                message: "Initial TrendLog info created successfully".to_string(),
                trendlog_info: Some(trendlog_info),
            }))
        }
        Err(e) => {
            if let (Some(ref fdb), Some(ref fh)) = (&flow_db_opt, &flow_opt) {
                fh.step(fdb, "create_record", "error", "db", "error",
                    t1.elapsed().as_millis() as i64,
                    &format!("failed to create trendlog record: {}", e), None).await;
                fh.done(fdb, "error").await;
            }
            Ok(Json(TrendLogFFIResponse {
                success: false,
                message: format!("Initial creation failed: {}", e),
                trendlog_info: None,
            }))
        }
    }
}

// NEW: Background detailed FFI sync (non-blocking)
pub async fn sync_detailed_trendlog(
    State(app_state): State<T3AppState>,
    Path((serial_number, trendlog_id)): Path<(i32, String)>,
) -> Result<Json<TrendLogFFIResponse>, AppError> {
    // ── MSSQL branch — FFI sync not applicable, return existing info ──
    if let Some(pool) = &app_state.mssql_pool {
        use crate::database_management::mssql_trendlog_service;
        let info = mssql_trendlog_service::create_initial_trendlog_info(pool, serial_number, 1, &trendlog_id, None)
            .await
            .map_err(|e| AppError::InternalError(format!("MSSQL sync: {}", e)))?;
        return Ok(Json(TrendLogFFIResponse {
            success: info["success"].as_bool().unwrap_or(true),
            message: "Detailed TrendLog info retrieved from MSSQL (FFI sync skipped)".to_string(),
            trendlog_info: serde_json::from_value(info["trendlog_info"].clone()).ok(),
        }));
    }

    // ── SeaORM branch ──
    let db = get_t3_device_conn!(app_state);

    match TrendLogFFIService::sync_detailed_trendlog_info(serial_number as u32, &trendlog_id, &*db).await {
        Ok(trendlog_info) => {
            Ok(Json(TrendLogFFIResponse {
                success: true,
                message: "Detailed TrendLog info synchronized with T3000".to_string(),
                trendlog_info: Some(trendlog_info),
            }))
        }
        Err(e) => {
            Ok(Json(TrendLogFFIResponse {
                success: false,
                message: format!("Detailed FFI sync failed: {}", e),
                trendlog_info: None,
            }))
        }
    }
}

// LEGACY: Sync TrendLog with T3000 via FFI and persist to database (backward compatibility)
pub async fn sync_trendlog_with_ffi(
    State(app_state): State<T3AppState>,
    Path((serial_number, trendlog_id)): Path<(i32, String)>,
) -> Result<Json<TrendLogFFIResponse>, AppError> {
    // ── MSSQL branch — FFI sync not applicable, return existing info ──
    if let Some(pool) = &app_state.mssql_pool {
        use crate::database_management::mssql_trendlog_service;
        let info = mssql_trendlog_service::create_initial_trendlog_info(pool, serial_number, 1, &trendlog_id, None)
            .await
            .map_err(|e| AppError::InternalError(format!("MSSQL sync: {}", e)))?;
        return Ok(Json(TrendLogFFIResponse {
            success: info["success"].as_bool().unwrap_or(true),
            message: "TrendLog info retrieved from MSSQL (FFI sync skipped)".to_string(),
            trendlog_info: serde_json::from_value(info["trendlog_info"].clone()).ok(),
        }));
    }

    // ── SeaORM branch ──
    let db = get_t3_device_conn!(app_state);

    match TrendLogFFIService::sync_complete_trendlog_info(serial_number as u32, &trendlog_id, &*db).await {
        Ok(trendlog_info) => {
            Ok(Json(TrendLogFFIResponse {
                success: true,
                message: "TrendLog synchronized successfully with T3000".to_string(),
                trendlog_info: Some(trendlog_info),
            }))
        }
        Err(e) => {
            Ok(Json(TrendLogFFIResponse {
                success: false,
                message: format!("FFI sync failed: {}", e),
                trendlog_info: None,
            }))
        }
    }
}

// FRONTEND: Handle TrendLogChart.vue FFI sync call pattern
// Route: POST /api/t3_device/trendlogs/MONITOR1/sync-ffi
// Body: { "device_id": 123 }
pub async fn sync_trendlog_frontend_pattern(
    State(app_state): State<T3AppState>,
    Path(trendlog_id): Path<String>,
    Json(request): Json<FrontendFFISyncRequest>,
) -> Result<Json<TrendLogFFIResponse>, AppError> {
    // Add request logging to check if route is being called
    println!("🔥 FRONTEND FFI ROUTE CALLED: trendlog_id={}, device_id={}", trendlog_id, request.device_id);

    // Flow logging (best-effort)
    let flow_db_opt = crate::db_connection::establish_t3_device_connection().await
        .map_err(|e| e.to_string()).ok();
    let flow_opt = if let Some(ref fdb) = flow_db_opt {
        Some(crate::logging::flow::FlowHandle::start(
            fdb, "TRENDLOG_CHART", "sync", 0,
            Some(&format!("device={} panel={} trendlog={}", request.device_id, request.panel_id, trendlog_id)),
        ).await)
    } else {
        None
    };
    let t0 = std::time::Instant::now();

    // Step 0: log query params
    if let (Some(ref fdb), Some(ref fh)) = (&flow_db_opt, &flow_opt) {
        fh.step(fdb, "query_params", "info", "api", "ok", 0,
            &format!("device={} panel={} trendlog={}",
                request.device_id, request.panel_id, trendlog_id), None).await;
    }

    // ── MSSQL branch ──
    if let Some(pool) = &app_state.mssql_pool {
        if let (Some(ref fdb), Some(ref fh)) = (&flow_db_opt, &flow_opt) {
            fh.step(fdb, "backend_select", "info", "api", "ok", 0,
                "backend=mssql — using center DB for trendlog sync", None).await;
        }
        use crate::database_management::mssql_trendlog_service;
        let info = mssql_trendlog_service::create_initial_trendlog_info(
            pool, request.device_id, request.panel_id, &trendlog_id, request.chart_title.as_deref(),
        )
        .await
        .map_err(|e| AppError::InternalError(format!("MSSQL frontend sync: {}", e)))?;
        if let (Some(ref fdb), Some(ref fh)) = (&flow_db_opt, &flow_opt) {
            fh.step(fdb, "mssql_sync", "info", "mssql", "ok",
                t0.elapsed().as_millis() as i64,
                &format!("trendlog synced via MSSQL in {}ms — device={} panel={} trendlog={}",
                    t0.elapsed().as_millis(), request.device_id, request.panel_id, trendlog_id), None).await;
            fh.step(fdb, "sync_done", "info", "api", "ok",
                t0.elapsed().as_millis() as i64,
                &format!("chart sync complete — total {}ms", t0.elapsed().as_millis()), None).await;
            fh.done(fdb, "ok").await;
        }
        return Ok(Json(TrendLogFFIResponse {
            success: info["success"].as_bool().unwrap_or(true),
            message: "TrendLog synchronized successfully via MSSQL (FFI skipped)".to_string(),
            trendlog_info: serde_json::from_value(info["trendlog_info"].clone()).ok(),
        }));
    }

    // ── SeaORM branch ──
    let db = get_t3_device_conn!(app_state);
    if let (Some(ref fdb), Some(ref fh)) = (&flow_db_opt, &flow_opt) {
        fh.step(fdb, "backend_select", "info", "api", "ok", 0,
            "backend=local_sqlite — using local device DB for trendlog sync", None).await;
    }

    let t1 = std::time::Instant::now();
    match TrendLogFFIService::sync_complete_trendlog_info(request.device_id as u32, &trendlog_id, &*db).await {
        Ok(trendlog_info) => {
            if let (Some(ref fdb), Some(ref fh)) = (&flow_db_opt, &flow_opt) {
                fh.step(fdb, "ffi_sync", "info", "ffi", "ok",
                    t1.elapsed().as_millis() as i64,
                    &format!("trendlog synced from device via FFI in {}ms — device={} panel={} trendlog={}",
                        t1.elapsed().as_millis(), request.device_id, request.panel_id, trendlog_id), None).await;
                fh.step(fdb, "sync_done", "info", "api", "ok",
                    t0.elapsed().as_millis() as i64,
                    &format!("chart sync complete — total {}ms", t0.elapsed().as_millis()), None).await;
                fh.done(fdb, "ok").await;
            }
            Ok(Json(TrendLogFFIResponse {
                success: true,
                message: "TrendLog synchronized successfully with T3000 via frontend API".to_string(),
                trendlog_info: Some(trendlog_info),
            }))
        }
        Err(e) => {
            if let (Some(ref fdb), Some(ref fh)) = (&flow_db_opt, &flow_opt) {
                fh.step(fdb, "ffi_sync", "error", "ffi", "error",
                    t1.elapsed().as_millis() as i64,
                    &format!("FFI sync failed — device={} panel={} trendlog={}: {}",
                        request.device_id, request.panel_id, trendlog_id, e), None).await;
                fh.done(fdb, "error").await;
            }
            Ok(Json(TrendLogFFIResponse {
                success: false,
                message: format!("Frontend FFI sync failed: {}", e),
                trendlog_info: None,
            }))
        }
    }
}

// Get view selections for a specific TrendLog and view
pub async fn get_view_selections(
    State(app_state): State<T3AppState>,
    Path((serial_number, trendlog_id, view_number)): Path<(i32, String, i32)>,
) -> Result<Json<Vec<ViewSelection>>, AppError> {
    if view_number < 2 || view_number > 3 {
        return Err(AppError::ValidationError("View number must be 2 or 3".to_string()));
    }

    // ── MSSQL branch ──
    if let Some(pool) = &app_state.mssql_pool {
        use crate::database_management::mssql_trendlog_service;
        let sels = mssql_trendlog_service::get_view_selections(pool, serial_number, 1, &trendlog_id, view_number)
            .await
            .map_err(|e| AppError::InternalError(format!("MSSQL view selections: {}", e)))?;
        let converted: Vec<ViewSelection> = sels.iter().map(|v| ViewSelection {
            point_type: v["point_type"].as_str().unwrap_or("").to_string(),
            point_index: v["point_index"].as_str().unwrap_or("0").to_string(),
            point_label: v["point_label"].as_str().unwrap_or("").to_string(),
            is_selected: v["is_selected"].as_bool().unwrap_or(true),
        }).collect();
        return Ok(Json(converted));
    }

    // ── SeaORM branch ──
    let db = get_t3_device_conn!(app_state);

    let selections = TrendLogFFIService::get_view_selections(serial_number as u32, &trendlog_id, view_number, &*db).await?;
    Ok(Json(selections))
}

// Save view selections for a specific TrendLog and view
pub async fn save_view_selections(
    State(app_state): State<T3AppState>,
    Path((serial_number, trendlog_id, view_number)): Path<(i32, String, i32)>,
    Json(request): Json<SaveSelectionsRequest>,
) -> Result<Json<String>, AppError> {
    if view_number < 2 || view_number > 3 {
        return Err(AppError::ValidationError("View number must be 2 or 3".to_string()));
    }

    // ── MSSQL branch ──
    if let Some(pool) = &app_state.mssql_pool {
        use crate::database_management::mssql_trendlog_service;
        let sels: Vec<mssql_trendlog_service::ViewSelectionInput> = request.selections.into_iter().map(|s| {
            mssql_trendlog_service::ViewSelectionInput {
                point_type: s.point_type,
                point_index: s.point_index,
                point_label: s.point_label,
                is_selected: s.is_selected,
            }
        }).collect();
        mssql_trendlog_service::save_view_selections(pool, serial_number, 1, &trendlog_id, view_number, &sels)
            .await
            .map_err(|e| AppError::InternalError(format!("MSSQL save views: {}", e)))?;
        return Ok(Json("View selections saved successfully".to_string()));
    }

    // ── SeaORM branch ──
    let db = get_t3_device_conn!(app_state);

    TrendLogFFIService::add_points_to_view_selection(
        serial_number as u32,
        &trendlog_id,
        view_number,
        request.selections,
        &*db
    ).await?;

    Ok(Json("View selections saved successfully".to_string()))
}

// Get complete TrendLog information (from database with FFI data)
pub async fn get_trendlog_info(
    State(app_state): State<T3AppState>,
    Path(trendlog_id): Path<String>,
) -> Result<Json<Option<TrendLogInfo>>, AppError> {
    // ── MSSQL branch ──
    if let Some(pool) = &app_state.mssql_pool {
        use crate::database_management::mssql_trendlog_service;
        let info = mssql_trendlog_service::get_trendlog_info(pool, &trendlog_id)
            .await
            .map_err(|e| AppError::InternalError(format!("MSSQL trendlog info: {}", e)))?;
        if info.is_null() {
            return Ok(Json(None));
        }
        let trendlog_info: Option<TrendLogInfo> = serde_json::from_value(info).ok();
        return Ok(Json(trendlog_info));
    }

    // ── SeaORM branch ──
    let db = get_t3_device_conn!(app_state);

    let info = TrendLogFFIService::get_trendlog_info(&trendlog_id, &*db).await?;
    Ok(Json(info))
}

// FRONTEND: Get view selections (frontend pattern)
// Route: GET /api/t3_device/trendlogs/MONITOR1/views/2/selections?serial_number=237219&panel_id=1
// Note: Device context now provided via query parameters for multi-device support
pub async fn get_view_selections_frontend(
    State(app_state): State<T3AppState>,
    Path((trendlog_id, view_number)): Path<(String, i32)>,
    Query(query_params): Query<std::collections::HashMap<String, String>>,
) -> Result<Json<Vec<ViewSelection>>, AppError> {
    if view_number < 2 || view_number > 3 {
        return Err(AppError::ValidationError("View number must be 2 or 3".to_string()));
    }

    // Parse device context from query parameters
    let serial_number = query_params.get("serial_number")
        .and_then(|s| s.parse::<i32>().ok())
        .unwrap_or(0);

    let panel_id = query_params.get("panel_id")
        .and_then(|s| s.parse::<i32>().ok())
        .unwrap_or(1);

    // ── MSSQL branch ──
    if let Some(pool) = &app_state.mssql_pool {
        use crate::database_management::mssql_trendlog_service;
        let sels = mssql_trendlog_service::get_view_selections(pool, serial_number, panel_id, &trendlog_id, view_number)
            .await
            .map_err(|e| AppError::InternalError(format!("MSSQL view selections: {}", e)))?;
        let converted: Vec<ViewSelection> = sels.iter().map(|v| ViewSelection {
            point_type: v["point_type"].as_str().unwrap_or("").to_string(),
            point_index: v["point_index"].as_str().unwrap_or("0").to_string(),
            point_label: v["point_label"].as_str().unwrap_or("").to_string(),
            is_selected: v["is_selected"].as_bool().unwrap_or(true),
        }).collect();
        return Ok(Json(converted));
    }

    // ── SeaORM branch ──
    let db = get_t3_device_conn!(app_state);

    println!("🔧 API: Loading view selections with device context: serial_number={}, panel_id={}, trendlog_id={}, view_number={}",
             serial_number, panel_id, trendlog_id, view_number);

    let selections = TrendLogFFIService::get_view_selections_with_panel(
        serial_number as u32,
        panel_id as u32,
        &trendlog_id,
        view_number,
        &*db
    ).await?;

    Ok(Json(selections))
}

// FRONTEND: Save view selections (frontend pattern)
// Route: POST /api/t3_device/trendlogs/MONITOR1/views/2/selections
// Body: { "selections": [...], "serial_number": 237219, "panel_id": 1 }
pub async fn save_view_selections_frontend(
    State(app_state): State<T3AppState>,
    Path((trendlog_id, view_number)): Path<(String, i32)>,
    Json(request): Json<SaveSelectionsRequest>,
) -> Result<Json<String>, AppError> {
    if view_number < 2 || view_number > 3 {
        return Err(AppError::ValidationError("View number must be 2 or 3".to_string()));
    }

    let serial_number = request.serial_number.unwrap_or(0);
    let panel_id = request.panel_id.unwrap_or(1);

    // ── MSSQL branch ──
    if let Some(pool) = &app_state.mssql_pool {
        use crate::database_management::mssql_trendlog_service;
        let sels: Vec<mssql_trendlog_service::ViewSelectionInput> = request.selections.into_iter().map(|s| {
            mssql_trendlog_service::ViewSelectionInput {
                point_type: s.point_type,
                point_index: s.point_index,
                point_label: s.point_label,
                is_selected: s.is_selected,
            }
        }).collect();
        mssql_trendlog_service::save_view_selections(pool, serial_number, panel_id, &trendlog_id, view_number, &sels)
            .await
            .map_err(|e| AppError::InternalError(format!("MSSQL save views: {}", e)))?;
        return Ok(Json("View selections saved successfully".to_string()));
    }

    // ── SeaORM branch ──
    let db = get_t3_device_conn!(app_state);

    println!("🔧 API: Saving view selections with device context: serial_number={}, panel_id={}, trendlog_id={}, view_number={}",
             serial_number, panel_id, trendlog_id, view_number);
    println!("🔧 API: Request body received: selections count = {}", request.selections.len());

    use std::io::{self, Write};
    io::stdout().flush().unwrap(); // Force flush stdout

    // For now, store the panel_id in a separate call - we need to update the FFI service to accept both parameters
    // TODO: Update add_points_to_view_selection to accept panel_id directly
    TrendLogFFIService::add_points_to_view_selection_with_panel(
        serial_number as u32,
        panel_id as u32,
        &trendlog_id,
        view_number,
        request.selections,
        &*db
    ).await?;

    Ok(Json("View selections saved successfully".to_string()))
}

// FFI Test Endpoints - DISABLED (ffi_test_helper moved to tests/)
// These endpoints were used by public/ffi-test.html for diagnostics
// If needed, they can be re-enabled by moving ffi_test_helper back to src/t3_device/
// use crate::t3_device::ffi_test_helper;

/* COMMENTED OUT - ffi_test_helper not available in src/
/// Test FFI availability - checks if T3000.exe is running and FFI functions are accessible
pub async fn test_ffi_availability(
    State(_app_state): State<T3AppState>,
) -> Result<Json<serde_json::Value>, AppError> {
    match ffi_test_helper::test_ffi_availability() {
        Ok(result) => Ok(Json(json!({
            "success": true,
            "message": "FFI availability test completed",
            "result": result
        }))),
        Err(e) => Ok(Json(json!({
            "success": false,
            "message": format!("FFI availability test failed: {}", e),
            "result": null
        })))
    }
}

/// Test device connection via FFI
pub async fn test_device_connection(
    State(_app_state): State<T3AppState>,
    Path(device_id): Path<u32>,
) -> Result<Json<serde_json::Value>, AppError> {
    match ffi_test_helper::test_device_connection(device_id) {
        Ok(result) => Ok(Json(json!({
            "success": true,
            "message": format!("Device {} connection test completed", device_id),
            "result": result
        }))),
        Err(e) => Ok(Json(json!({
            "success": false,
            "message": format!("Device {} connection test failed: {}", device_id, e),
            "result": null
        })))
    }
}

/// Test device enumeration - check multiple devices (1-10)
pub async fn test_device_enumeration(
    State(_app_state): State<T3AppState>,
) -> Result<Json<serde_json::Value>, AppError> {
    match ffi_test_helper::test_device_enumeration() {
        Ok(result) => Ok(Json(json!({
            "success": true,
            "message": "Device enumeration test completed",
            "result": result
        }))),
        Err(e) => Ok(Json(json!({
            "success": false,
            "message": format!("Device enumeration test failed: {}", e),
            "result": null
        })))
    }
}
*/
