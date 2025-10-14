// TrendLog Monitor API Routes - HTTP endpoints for new C++ trendlog export functions
// These routes provide access to the TrendlogMonitorService that calls our new
// BacnetWebView_GetTrendlogList/Entry functions

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::Json,
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use crate::app_state::T3AppState;
use crate::error::AppError;
use crate::t3_device::trendlog_monitor_service::{TrendlogMonitorService, TrendlogListResponse, TrendlogEntryResponse};

/// Query parameters for trendlog operations
#[derive(Debug, Deserialize)]
pub struct TrendlogQuery {
    pub panel_id: Option<i32>,
    pub monitor_index: Option<i32>,
    pub sync_to_db: Option<bool>,
}

/// Response for sync operations
#[derive(Debug, Serialize)]
pub struct TrendlogSyncResponse {
    pub success: bool,
    pub panel_id: Option<i32>,
    pub synced_count: usize,
    pub message: String,
    pub timestamp: i64,
}

/// API response wrapper
#[derive(Debug, Serialize)]
pub struct ApiResponse<T> {
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<String>,
    pub timestamp: i64,
}

/// Get trendlog list for a device using new C++ export
pub async fn get_trendlog_list_handler(
    State(app_state): State<T3AppState>,
    Path(panel_id): Path<i32>,
    Query(query): Query<TrendlogQuery>,
) -> Result<Json<ApiResponse<TrendlogListResponse>>, AppError> {
    let db_connection = app_state.t3_device_conn
        .ok_or_else(|| AppError::DatabaseError("T3 device database not available".to_string()))?;

    // Create service instance
    let service = TrendlogMonitorService::new(db_connection);

    // Get trendlog list from C++
    let trendlog_list = service.get_trendlog_list(panel_id).await?;

    // Optionally sync to database
    if query.sync_to_db.unwrap_or(false) {
        let _ = service.sync_trendlogs_to_database(panel_id).await;
    }

    Ok(Json(ApiResponse {
        success: true,
        data: Some(trendlog_list),
        error: None,
        timestamp: chrono::Utc::now().timestamp(),
    }))
}

/// Get specific trendlog entry with details
pub async fn get_trendlog_entry_handler(
    State(app_state): State<T3AppState>,
    Path((panel_id, monitor_index)): Path<(i32, i32)>,
) -> Result<Json<ApiResponse<TrendlogEntryResponse>>, AppError> {
    let db_connection = app_state.t3_device_conn
        .ok_or_else(|| AppError::DatabaseError("T3 device database not available".to_string()))?;

    // Create service instance
    let service = TrendlogMonitorService::new(db_connection);

    // Get trendlog entry from C++
    let trendlog_entry = service.get_trendlog_entry(panel_id, monitor_index).await?;

    Ok(Json(ApiResponse {
        success: true,
        data: Some(trendlog_entry),
        error: None,
        timestamp: chrono::Utc::now().timestamp(),
    }))
}

/// Sync all trendlogs for a device to database
pub async fn sync_trendlogs_handler(
    State(app_state): State<T3AppState>,
    Path(panel_id): Path<i32>,
) -> Result<Json<ApiResponse<TrendlogSyncResponse>>, AppError> {
    let db_connection = app_state.t3_device_conn
        .ok_or_else(|| AppError::DatabaseError("T3 device database not available".to_string()))?;

    // Create service instance
    let service = TrendlogMonitorService::new(db_connection);

    // Sync trendlogs to database
    let synced_count = service.sync_trendlogs_to_database(panel_id).await?;

    let response = TrendlogSyncResponse {
        success: true,
        panel_id: Some(panel_id),
        synced_count,
        message: format!("Successfully synced {} trendlogs for panel_id {}", synced_count, panel_id),
        timestamp: chrono::Utc::now().timestamp(),
    };

    Ok(Json(ApiResponse {
        success: true,
        data: Some(response),
        error: None,
        timestamp: chrono::Utc::now().timestamp(),
    }))
}

/// Sync all trendlogs for all devices
pub async fn sync_all_devices_handler(
    State(app_state): State<T3AppState>,
) -> Result<Json<ApiResponse<TrendlogSyncResponse>>, AppError> {
    let db_connection = app_state.t3_device_conn
        .ok_or_else(|| AppError::DatabaseError("T3 device database not available".to_string()))?;

    // Create service instance
    let service = TrendlogMonitorService::new(db_connection);

    // Sync all devices
    let total_synced = service.sync_all_devices().await?;

    let response = TrendlogSyncResponse {
        success: true,
        panel_id: None,
        synced_count: total_synced,
        message: format!("Successfully synced {} trendlogs across all devices", total_synced),
        timestamp: chrono::Utc::now().timestamp(),
    };

    Ok(Json(ApiResponse {
        success: true,
        data: Some(response),
        error: None,
        timestamp: chrono::Utc::now().timestamp(),
    }))
}

/// Test FFI connectivity to new C++ export functions
pub async fn test_ffi_connectivity_handler(
    State(app_state): State<T3AppState>,
) -> Result<Json<ApiResponse<HashMap<String, serde_json::Value>>>, AppError> {
    let db_connection = app_state.t3_device_conn
        .ok_or_else(|| AppError::DatabaseError("T3 device database not available".to_string()))?;

    // Create service instance
    let service = TrendlogMonitorService::new(db_connection);

    // Test connectivity
    let is_connected = service.test_ffi_connectivity().await?;

    let mut test_result = HashMap::new();
    test_result.insert("ffi_connected".to_string(), serde_json::Value::Bool(is_connected));
    test_result.insert("service_name".to_string(), serde_json::Value::String("TrendlogMonitorService".to_string()));
    test_result.insert("cpp_functions".to_string(), serde_json::Value::Array(vec![
        serde_json::Value::String("BacnetWebView_GetTrendlogList".to_string()),
        serde_json::Value::String("BacnetWebView_GetTrendlogEntry".to_string()),
    ]));

    if is_connected {
        test_result.insert("status".to_string(), serde_json::Value::String("Ready".to_string()));
    } else {
        test_result.insert("status".to_string(), serde_json::Value::String("Fallback Mode".to_string()));
    }

    Ok(Json(ApiResponse {
        success: true,
        data: Some(test_result),
        error: None,
        timestamp: chrono::Utc::now().timestamp(),
    }))
}

/// Create trendlog monitor API routes
pub fn create_trendlog_monitor_routes() -> Router<T3AppState> {
    Router::new()
        // GET /api/t3/trendlog-monitor/list/{panel_id} - Get trendlog list for device
        .route("/list/:panel_id", get(get_trendlog_list_handler))

        // GET /api/t3/trendlog-monitor/entry/{panel_id}/{monitor_index} - Get specific trendlog entry
        .route("/entry/:panel_id/:monitor_index", get(get_trendlog_entry_handler))

        // POST /api/t3/trendlog-monitor/sync/{panel_id} - Sync trendlogs for device to database
        .route("/sync/:panel_id", post(sync_trendlogs_handler))

        // POST /api/t3/trendlog-monitor/sync-all - Sync all devices to database
        .route("/sync-all", post(sync_all_devices_handler))

        // GET /api/t3/trendlog-monitor/test-ffi - Test FFI connectivity
        .route("/test-ffi", get(test_ffi_connectivity_handler))
}

/// Helper function to handle common errors
impl From<AppError> for (StatusCode, Json<ApiResponse<()>>) {
    fn from(err: AppError) -> Self {
        let (status, message) = match err {
            AppError::NotFound(msg) => (StatusCode::NOT_FOUND, msg),
            AppError::ValidationError(msg) => (StatusCode::BAD_REQUEST, msg),
            AppError::DatabaseError(msg) => (StatusCode::SERVICE_UNAVAILABLE, msg),
            AppError::InternalError(msg) => (StatusCode::INTERNAL_SERVER_ERROR, msg),
            _ => (StatusCode::INTERNAL_SERVER_ERROR, "Unknown error".to_string()),
        };

        (
            status,
            Json(ApiResponse {
                success: false,
                data: None,
                error: Some(message),
                timestamp: chrono::Utc::now().timestamp(),
            }),
        )
    }
}
