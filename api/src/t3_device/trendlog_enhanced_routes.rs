// T3000 TrendLog Enhanced API Routes - FFI Integration and View Management
use axum::{
    extract::{Path, State},
    response::Json,
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};

use crate::app_state::T3AppState;
use crate::error::AppError;
use crate::t3_device::trendlog_ffi_service::{TrendLogFFIService, ViewSelection, TrendLogInfo};

// Helper macro to get T3000 device database connection
macro_rules! get_t3_device_conn {
    ($state:expr) => {
        match $state.t3_device_conn.as_ref() {
            Some(conn) => conn.lock().await,
            None => {
                return Err(AppError::InternalError("T3000 device database unavailable".to_string()));
            }
        }
    };
}

// Request/Response types for view selection API
#[derive(Debug, Serialize, Deserialize)]
pub struct SaveSelectionsRequest {
    pub selections: Vec<ViewSelection>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TrendLogFFIResponse {
    pub success: bool,
    pub message: String,
    pub trendlog_info: Option<TrendLogInfo>,
}

// Request structure for frontend FFI sync call (device_id in body)
#[derive(Debug, Serialize, Deserialize)]
pub struct FrontendFFISyncRequest {
    pub device_id: i32,
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
}

// NEW: Create initial TrendLog info (fast page load)
pub async fn create_initial_trendlog(
    State(app_state): State<T3AppState>,
    Path((serial_number, trendlog_id)): Path<(i32, String)>,
) -> Result<Json<TrendLogFFIResponse>, AppError> {
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
    let db = get_t3_device_conn!(app_state);

    match TrendLogFFIService::create_initial_trendlog_info(request.device_id as u32, &trendlog_id, &*db).await {
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

// NEW: Background detailed FFI sync (non-blocking)
pub async fn sync_detailed_trendlog(
    State(app_state): State<T3AppState>,
    Path((serial_number, trendlog_id)): Path<(i32, String)>,
) -> Result<Json<TrendLogFFIResponse>, AppError> {
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

    let db = get_t3_device_conn!(app_state);

    match TrendLogFFIService::sync_complete_trendlog_info(request.device_id as u32, &trendlog_id, &*db).await {
        Ok(trendlog_info) => {
            Ok(Json(TrendLogFFIResponse {
                success: true,
                message: "TrendLog synchronized successfully with T3000 via frontend API".to_string(),
                trendlog_info: Some(trendlog_info),
            }))
        }
        Err(e) => {
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
    let db = get_t3_device_conn!(app_state);

    if view_number < 2 || view_number > 3 {
        return Err(AppError::ValidationError("View number must be 2 or 3".to_string()));
    }

    let selections = TrendLogFFIService::get_view_selections(serial_number as u32, &trendlog_id, view_number, &*db).await?;
    Ok(Json(selections))
}

// Save view selections for a specific TrendLog and view
pub async fn save_view_selections(
    State(app_state): State<T3AppState>,
    Path((serial_number, trendlog_id, view_number)): Path<(i32, String, i32)>,
    Json(request): Json<SaveSelectionsRequest>,
) -> Result<Json<String>, AppError> {
    let db = get_t3_device_conn!(app_state);

    if view_number < 2 || view_number > 3 {
        return Err(AppError::ValidationError("View number must be 2 or 3".to_string()));
    }

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
    let db = get_t3_device_conn!(app_state);

    let info = TrendLogFFIService::get_trendlog_info(&trendlog_id, &*db).await?;
    Ok(Json(info))
}

// FRONTEND: Get view selections (frontend pattern)
// Route: GET /api/t3_device/trendlogs/MONITOR1/views/2/selections
// Note: No device_id in URL, so we'll need to derive it from trendlog context or use a default
pub async fn get_view_selections_frontend(
    State(app_state): State<T3AppState>,
    Path((trendlog_id, view_number)): Path<(String, i32)>,
) -> Result<Json<Vec<ViewSelection>>, AppError> {
    let db = get_t3_device_conn!(app_state);

    if view_number < 2 || view_number > 3 {
        return Err(AppError::ValidationError("View number must be 2 or 3".to_string()));
    }

    // Since frontend doesn't provide device_id in this pattern, we'll use 0 as a placeholder
    // This works because the view selections are indexed by trendlog_id which should be unique
    let selections = TrendLogFFIService::get_view_selections(0, &trendlog_id, view_number, &*db).await?;
    Ok(Json(selections))
}

// FRONTEND: Save view selections (frontend pattern)
// Route: POST /api/t3_device/trendlogs/MONITOR1/views/2/selections
// Body: { "selections": [...] }
pub async fn save_view_selections_frontend(
    State(app_state): State<T3AppState>,
    Path((trendlog_id, view_number)): Path<(String, i32)>,
    Json(request): Json<SaveSelectionsRequest>,
) -> Result<Json<String>, AppError> {
    let db = get_t3_device_conn!(app_state);

    if view_number < 2 || view_number > 3 {
        return Err(AppError::ValidationError("View number must be 2 or 3".to_string()));
    }

    // Since frontend doesn't provide device_id in this pattern, we'll use 0 as a placeholder
    // This works because the view selections are indexed by trendlog_id which should be unique
    TrendLogFFIService::add_points_to_view_selection(
        0, // placeholder device_id since frontend doesn't provide it in this URL pattern
        &trendlog_id,
        view_number,
        request.selections,
        &*db
    ).await?;

    Ok(Json("View selections saved successfully".to_string()))
}
