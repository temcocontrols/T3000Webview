use axum::{
    extract::State,
    http::StatusCode,
    routing::post,
    Json, Router,
};
use serde::Deserialize;

use crate::{app_state::AppState, logger::ServiceLogger};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LogRequest {
    level: String,
    category: String,
    message: String,
    #[serde(default)]
    params: Option<Vec<serde_json::Value>>,
    timestamp: String,
}

/// Handle frontend log messages
async fn handle_frontend_log(
    State(_state): State<AppState>,
    Json(payload): Json<LogRequest>,
) -> Result<StatusCode, StatusCode> {
    let mut logger = ServiceLogger::new(&payload.category)
        .unwrap_or_else(|_| ServiceLogger::new("Frontend").unwrap());

    let params_str = payload.params
        .map(|p| format!(" | Params: {:?}", p))
        .unwrap_or_default();

    let log_message = format!("[{}] {}{}", payload.timestamp, payload.message, params_str);

    match payload.level.as_str() {
        "debug" => logger.info(&log_message),  // Use info for debug logs
        "info" => logger.info(&log_message),
        "error" => logger.error(&log_message),
        _ => logger.info(&log_message),
    }

    Ok(StatusCode::OK)
}

/// Create log routes
pub fn log_routes() -> Router<AppState> {
    Router::new().route("/log", post(handle_frontend_log))
}
