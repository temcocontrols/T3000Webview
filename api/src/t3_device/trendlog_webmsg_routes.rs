// TRENDLOG WEBMSG API ROUTES - Working HandleWebViewMsg Approach
// ==============================================================

use axum::{
    extract::{Path, State, Query},
    http::StatusCode,
    response::Json,
    routing::get,
    Router,
};
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use crate::app_state::T3AppState;
use crate::logger::ServiceLogger;
use crate::t3_device::trendlog_webmsg_service::{TrendlogWebMsgService, TrendlogInfo};

#[derive(Deserialize)]
pub struct TrendlogListQuery {
    #[serde(default)]
    active_only: bool,
}

#[derive(Serialize)]
pub struct TrendlogListResponse {
    pub success: bool,
    pub device_id: i32,
    pub total_count: usize,
    pub active_count: usize,
    pub trendlogs: Vec<TrendlogInfo>,
    pub timestamp: String,
}

#[derive(Serialize)]
pub struct TrendlogEntryResponse {
    pub success: bool,
    pub device_id: i32,
    pub monitor_index: i32,
    pub trendlog: TrendlogInfo,
    pub timestamp: String,
}

#[derive(Serialize)]
pub struct DeviceStatusResponse {
    pub success: bool,
    pub device_id: i32,
    pub online: bool,
    pub timestamp: String,
}

/// Create trendlog WebMsg API routes (the working approach)
pub fn create_trendlog_webmsg_routes() -> Router<T3AppState> {
    Router::new()
        .route("/api/trendlog/webmsg/list/:device_id", get(get_trendlog_list))
        .route("/api/trendlog/webmsg/entry/:device_id/:monitor_index", get(get_trendlog_entry))
        .route("/api/trendlog/webmsg/refresh/:device_id/:monitor_index", get(refresh_trendlog_entry))
        .route("/api/trendlog/webmsg/status/:device_id", get(check_device_status))
        .route("/api/trendlog/webmsg/summary/:device_id", get(get_trendlog_summary))
}

/// GET /api/trendlog/webmsg/list/{device_id} - Get trendlog list via HandleWebViewMsg
async fn get_trendlog_list(
    State(_app_state): State<T3AppState>,
    Path(device_id): Path<i32>,
    Query(params): Query<TrendlogListQuery>,
) -> Result<Json<TrendlogListResponse>, (StatusCode, Json<JsonValue>)> {
    let mut logger = ServiceLogger::api().unwrap_or_else(|_| ServiceLogger::new("trendlog_webmsg").unwrap());

    logger.info(&format!("🟢 WebMsg Trendlog List Request - Device: {}, Active Only: {}", device_id, params.active_only));

    let service = TrendlogWebMsgService::new();

    match if params.active_only {
        service.get_active_trendlogs(device_id).await
    } else {
        service.get_trendlog_list(device_id).await
    } {
        Ok(trendlogs) => {
            let active_count = trendlogs.iter().filter(|t| t.status == 1).count();

            let response = TrendlogListResponse {
                success: true,
                device_id,
                total_count: trendlogs.len(),
                active_count,
                trendlogs,
                timestamp: chrono::Utc::now().to_rfc3339(),
            };

            logger.info(&format!("✅ WebMsg Trendlog List Success - Total: {}, Active: {}", response.total_count, response.active_count));
            Ok(Json(response))
        }
        Err(e) => {
            logger.error(&format!("❌ WebMsg Trendlog List Failed: {:?}", e));
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "success": false,
                    "error": e.to_string(),
                    "device_id": device_id,
                    "timestamp": chrono::Utc::now().to_rfc3339()
                }))
            ))
        }
    }
}

/// GET /api/trendlog/webmsg/entry/{device_id}/{monitor_index} - Get specific trendlog entry
async fn get_trendlog_entry(
    State(_app_state): State<T3AppState>,
    Path((device_id, monitor_index)): Path<(i32, i32)>,
) -> Result<Json<TrendlogEntryResponse>, (StatusCode, Json<JsonValue>)> {
    let mut logger = ServiceLogger::api().unwrap_or_else(|_| ServiceLogger::new("trendlog_webmsg").unwrap());

    logger.info(&format!("🟢 WebMsg Trendlog Entry Request - Device: {}, Monitor: {}", device_id, monitor_index));

    let service = TrendlogWebMsgService::new();

    match service.get_trendlog_entry(device_id, monitor_index).await {
        Ok(trendlog) => {
            let response = TrendlogEntryResponse {
                success: true,
                device_id,
                monitor_index,
                trendlog,
                timestamp: chrono::Utc::now().to_rfc3339(),
            };

            logger.info(&format!("✅ WebMsg Trendlog Entry Success - Label: {}, Status: {}", response.trendlog.label, response.trendlog.status));
            Ok(Json(response))
        }
        Err(e) => {
            logger.error(&format!("❌ WebMsg Trendlog Entry Failed: {:?}", e));
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "success": false,
                    "error": e.to_string(),
                    "device_id": device_id,
                    "monitor_index": monitor_index,
                    "timestamp": chrono::Utc::now().to_rfc3339()
                }))
            ))
        }
    }
}

/// GET /api/trendlog/webmsg/refresh/{device_id}/{monitor_index} - Refresh trendlog from device
async fn refresh_trendlog_entry(
    State(_app_state): State<T3AppState>,
    Path((device_id, monitor_index)): Path<(i32, i32)>,
) -> Result<Json<TrendlogEntryResponse>, (StatusCode, Json<JsonValue>)> {
    let mut logger = ServiceLogger::api().unwrap_or_else(|_| ServiceLogger::new("trendlog_webmsg").unwrap());

    logger.info(&format!("🔄 WebMsg Trendlog Refresh Request - Device: {}, Monitor: {}", device_id, monitor_index));

    let service = TrendlogWebMsgService::new();

    match service.refresh_trendlog_from_device(device_id, monitor_index).await {
        Ok(trendlog) => {
            let response = TrendlogEntryResponse {
                success: true,
                device_id,
                monitor_index,
                trendlog,
                timestamp: chrono::Utc::now().to_rfc3339(),
            };

            logger.info(&format!("✅ WebMsg Trendlog Refresh Success - Fresh data loaded"));
            Ok(Json(response))
        }
        Err(e) => {
            logger.error(&format!("❌ WebMsg Trendlog Refresh Failed: {:?}", e));
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "success": false,
                    "error": e.to_string(),
                    "device_id": device_id,
                    "monitor_index": monitor_index,
                    "timestamp": chrono::Utc::now().to_rfc3339()
                }))
            ))
        }
    }
}

/// GET /api/trendlog/webmsg/status/{device_id} - Check device online status
async fn check_device_status(
    State(_app_state): State<T3AppState>,
    Path(device_id): Path<i32>,
) -> Result<Json<DeviceStatusResponse>, (StatusCode, Json<JsonValue>)> {
    let mut logger = ServiceLogger::api().unwrap_or_else(|_| ServiceLogger::new("trendlog_webmsg").unwrap());

    logger.info(&format!("🔍 WebMsg Device Status Check - Device: {}", device_id));

    let service = TrendlogWebMsgService::new();

    match service.is_device_online(device_id).await {
        Ok(online) => {
            let response = DeviceStatusResponse {
                success: true,
                device_id,
                online,
                timestamp: chrono::Utc::now().to_rfc3339(),
            };

            logger.info(&format!("✅ WebMsg Device Status - Device {} is {}", device_id, if online { "ONLINE" } else { "OFFLINE" }));
            Ok(Json(response))
        }
        Err(e) => {
            logger.error(&format!("❌ WebMsg Device Status Failed: {:?}", e));
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "success": false,
                    "error": e.to_string(),
                    "device_id": device_id,
                    "online": false,
                    "timestamp": chrono::Utc::now().to_rfc3339()
                }))
            ))
        }
    }
}

/// GET /api/trendlog/webmsg/summary/{device_id} - Get trendlog summary
async fn get_trendlog_summary(
    State(_app_state): State<T3AppState>,
    Path(device_id): Path<i32>,
) -> Result<Json<JsonValue>, (StatusCode, Json<JsonValue>)> {
    let mut logger = ServiceLogger::api().unwrap_or_else(|_| ServiceLogger::new("trendlog_webmsg").unwrap());

    logger.info(&format!("📊 WebMsg Trendlog Summary Request - Device: {}", device_id));

    let service = TrendlogWebMsgService::new();

    match service.get_trendlog_summary(device_id).await {
        Ok(summary) => {
            logger.info(&format!("✅ WebMsg Trendlog Summary Success - Device: {}", device_id));

            let mut response = summary;
            response.insert("success".to_string(), serde_json::Value::Bool(true));
            response.insert("timestamp".to_string(), serde_json::Value::String(chrono::Utc::now().to_rfc3339()));

            Ok(Json(serde_json::Value::Object(response.into_iter().collect())))
        }
        Err(e) => {
            logger.error(&format!("❌ WebMsg Trendlog Summary Failed: {:?}", e));
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "success": false,
                    "error": e.to_string(),
                    "device_id": device_id,
                    "timestamp": chrono::Utc::now().to_rfc3339()
                }))
            ))
        }
    }
}
