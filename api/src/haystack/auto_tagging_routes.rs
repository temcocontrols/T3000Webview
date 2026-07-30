use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::Json,
    routing::{delete, get, post, put},
    Router,
};
use serde::Deserialize;
use serde_json::{json, Value};

use crate::app_state::T3AppState;
use crate::haystack::auto_tagging_service as ats;

/// Get a usable DB connection for haystack operations.
async fn get_db(state: &T3AppState) -> Result<sea_orm::DatabaseConnection, (StatusCode, Json<Value>)> {
    if let Some(conn) = &state.local_config_conn {
        return Ok(conn.lock().await.clone());
    }
    Err((StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Local database connection not available"}))))
}

// ── Request types ──

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RunRequest {
    serial_numbers: Vec<i32>,
    #[serde(default)]
    rule_ids: Option<Vec<i64>>,
}

// ── Routes ──

pub fn create_auto_tagging_routes() -> Router<T3AppState> {
    Router::new()
        .route("/api/haystack/auto-tagging/run", post(run_auto_tagging))
        .route("/api/haystack/auto-tagging/preview", post(preview_auto_tagging))
        .route("/api/haystack/auto-tagging/reset", post(reset_auto_tags))
        .route("/api/haystack/auto-tagging/rules", get(list_rules).post(create_rule))
        .route("/api/haystack/auto-tagging/rules/:id", put(update_rule).delete(delete_rule))
        .route("/api/haystack/auto-tagging/rules/:id/toggle", post(toggle_rule))
        .route("/api/haystack/auto-tagging/brick-classes", post(get_brick_classes))
}

// ── Auto-tagging execution ──

async fn run_auto_tagging(
    State(state): State<T3AppState>,
    Json(payload): Json<RunRequest>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let db = get_db(&state).await?;
    let (count, matches) = ats::run_auto_tagging(&db, &payload.serial_numbers, payload.rule_ids.as_deref())
        .await
        .map_err(|e| {
            tracing::error!("run_auto_tagging failed: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e})))
        })?;
    Ok(Json(json!({
        "success": true,
        "message": "Auto-tagging completed",
        "tagged": count,
        "matches": matches
    })))
}

async fn preview_auto_tagging(
    State(state): State<T3AppState>,
    Json(payload): Json<RunRequest>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let db = get_db(&state).await?;
    let matches = ats::preview_auto_tagging(&db, &payload.serial_numbers)
        .await
        .map_err(|e| {
            tracing::error!("preview_auto_tagging failed: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e})))
        })?;
    Ok(Json(json!({
        "matches": matches,
        "total": matches.len()
    })))
}

async fn reset_auto_tags(
    State(state): State<T3AppState>,
    Json(payload): Json<RunRequest>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let db = get_db(&state).await?;
    let count = ats::reset_auto_tags(&db, &payload.serial_numbers)
        .await
        .map_err(|e| {
            tracing::error!("reset_auto_tags failed: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e})))
        })?;
    Ok(Json(json!({
        "success": true,
        "message": "Auto-tags reset",
        "devices": count
    })))
}

async fn get_brick_classes(
    State(state): State<T3AppState>,
    Json(payload): Json<RunRequest>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let db = get_db(&state).await?;
    let entries = ats::get_brick_classes(&db, &payload.serial_numbers)
        .await
        .map_err(|e| {
            tracing::error!("get_brick_classes failed: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e})))
        })?;
    Ok(Json(json!({ "entries": entries })))
}

// ── Rules CRUD ──

async fn list_rules(
    State(state): State<T3AppState>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let db = get_db(&state).await?;
    let rules = ats::list_rules(&db)
        .await
        .map_err(|e| {
            tracing::error!("list_rules failed: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": format!("Failed to list rules: {}", e)})))
        })?;
    Ok(Json(json!({ "rules": rules, "total": rules.len() })))
}

async fn create_rule(
    State(state): State<T3AppState>,
    Json(payload): Json<ats::CreateRuleRequest>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let db = get_db(&state).await?;
    let id = ats::create_rule(&db, &payload).await.map_err(|e| {
        (StatusCode::BAD_REQUEST, Json(json!({ "error": e })))
    })?;
    Ok(Json(json!({ "message": "Rule created", "id": id })))
}

async fn update_rule(
    State(state): State<T3AppState>,
    Path(id): Path<i64>,
    Json(payload): Json<ats::UpdateRuleRequest>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let db = get_db(&state).await?;
    ats::update_rule(&db, id, &payload).await.map_err(|e| {
        (StatusCode::BAD_REQUEST, Json(json!({ "error": e })))
    })?;
    Ok(Json(json!({ "message": "Rule updated", "id": id })))
}

async fn delete_rule(
    State(state): State<T3AppState>,
    Path(id): Path<i64>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let db = get_db(&state).await?;
    ats::delete_rule(&db, id).await.map_err(|e| {
        (StatusCode::BAD_REQUEST, Json(json!({ "error": e })))
    })?;
    Ok(Json(json!({ "message": "Rule deleted", "id": id })))
}

async fn toggle_rule(
    State(state): State<T3AppState>,
    Path(id): Path<i64>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let db = get_db(&state).await?;
    let enabled = ats::toggle_rule(&db, id).await.map_err(|e| {
        (StatusCode::BAD_REQUEST, Json(json!({ "error": e })))
    })?;
    Ok(Json(json!({ "message": if enabled { "Rule enabled" } else { "Rule disabled" }, "id": id, "enabled": enabled })))
}
