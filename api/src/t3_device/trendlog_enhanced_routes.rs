// T3000 TrendLog Enhanced API Routes - FFI Integration and View Management
use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::Json,
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

use crate::app_state::T3AppState;
use crate::error::AppError;
use crate::t3_device::trendlog_ffi_service::{TrendLogFFIService, ViewSelection, TrendLogInfo};
use crate::entity::t3_device::{trendlog_views, trendlog_inputs};
use sea_orm::*;

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

// Enhanced TrendLog routes with FFI integration - CORRECTED FUNCTION NAME
pub fn create_trendlog_enhanced_routes() -> Router<T3AppState> {
    Router::new()
        .route("/sync-ffi/:serial_number/:trendlog_id", post(sync_trendlog_with_ffi))
        .route("/view-selections/:trendlog_id/:view_number", get(get_view_selections))
        .route("/view-selections/:trendlog_id/:view_number", post(save_view_selections))
        .route("/info/:trendlog_id", get(get_trendlog_info))
}

// Sync TrendLog with T3000 via FFI and persist to database
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

// Get view selections for a specific TrendLog and view
pub async fn get_view_selections(
    State(app_state): State<T3AppState>,
    Path((trendlog_id, view_number)): Path<(String, i32)>,
) -> Result<Json<Vec<ViewSelection>>, AppError> {
    let db = get_t3_device_conn!(app_state);

    if view_number < 2 || view_number > 3 {
        return Err(AppError::ValidationError("View number must be 2 or 3".to_string()));
    }

    let selections = TrendLogFFIService::get_view_selections(&trendlog_id, view_number, &*db).await?;
    Ok(Json(selections))
}

// Save view selections for a specific TrendLog and view
pub async fn save_view_selections(
    State(app_state): State<T3AppState>,
    Path((trendlog_id, view_number)): Path<(String, i32)>,
    Json(request): Json<SaveSelectionsRequest>,
) -> Result<Json<String>, AppError> {
    let db = get_t3_device_conn!(app_state);

    if view_number < 2 || view_number > 3 {
        return Err(AppError::ValidationError("View number must be 2 or 3".to_string()));
    }

    TrendLogFFIService::save_view_selections(
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
