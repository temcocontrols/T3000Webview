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
    #[serde(default)]
    trace_id: Option<String>,
    #[serde(default)]
    feature: Option<String>,
    #[serde(default)]
    flow: Option<String>,
    #[serde(default)]
    step: Option<String>,
    #[serde(default)]
    status: Option<String>,
    timestamp: String,
}

/// Handle frontend log messages
async fn handle_frontend_log(
    State(state): State<AppState>,
    Json(payload): Json<LogRequest>,
) -> Result<StatusCode, StatusCode> {
    let mut detail_parts = vec![format!("frontend_ts={}", payload.timestamp)];

    if let Some(trace_id) = payload.trace_id.as_deref() {
        detail_parts.push(format!("trace_id={}", trace_id));
    }
    if let Some(feature) = payload.feature.as_deref() {
        detail_parts.push(format!("feature={}", feature));
    }
    if let Some(flow) = payload.flow.as_deref() {
        detail_parts.push(format!("flow={}", flow));
    }
    if let Some(step) = payload.step.as_deref() {
        detail_parts.push(format!("step={}", step));
    }
    if let Some(status) = payload.status.as_deref() {
        detail_parts.push(format!("status={}", status));
    }
    if let Some(params) = payload.params.as_ref() {
        detail_parts.push(format!("params={:?}", params));
    }

    let details = Some(detail_parts.join(" | "));

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
