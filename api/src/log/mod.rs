use axum::{
    extract::State,
    http::StatusCode,
    routing::post,
    Json, Router,
};
use serde::Deserialize;

use crate::{app_state::AppState, logging::service::LoggingService};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LogRequest {
    level: String,
    category: String,
    message: String,
    #[serde(default)]
    params: Option<Vec<serde_json::Value>>,
    #[serde(default)]
    source: Option<String>,
    timestamp: String,
}

/// Handle frontend log messages
async fn handle_frontend_log(
    State(state): State<AppState>,
    Json(payload): Json<LogRequest>,
) -> Result<StatusCode, StatusCode> {
    let params_str = payload.params
        .map(|p| format!(" | Params: {:?}", p))
        .unwrap_or_default();

    let details = if params_str.is_empty() {
        Some(format!("frontend_ts={}", payload.timestamp))
    } else {
        Some(format!("frontend_ts={}{}", payload.timestamp, params_str))
    };

    let level = match payload.level.trim().to_ascii_lowercase().as_str() {
        "debug" => "DEBUG",
        "warn" | "warning" => "WARN",
        "error" => "ERROR",
        _ => "INFO",
    };

    let db = state.conn.lock().await;
    LoggingService::new()
        .emit_from_parts(
            &*db,
            level,
            &payload.category,
            payload.source.as_deref().or(Some("frontend")),
            None,
            &payload.message,
            details.as_deref(),
        )
        .await;

    Ok(StatusCode::OK)
}

/// Create log routes
pub fn log_routes() -> Router<AppState> {
    Router::new().route("/log", post(handle_frontend_log))
}
