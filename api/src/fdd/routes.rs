//! FDD (Fault Detection & Diagnostics) REST routes.
//!
//! Mirrors the auto-tagging rules pattern: thin HTTP handlers over the shared
//! `crate::fdd` engine (rules CRUD + analyze + findings). Previously FDD was
//! only reachable via MCP tools; these routes power the new FDD page.

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::Json,
    routing::{get, post, put},
    Router,
};
use serde::Deserialize;
use serde_json::{json, Value};

use crate::app_state::T3AppState;
use crate::fdd::{self, rules};

/// Get a usable DB connection for FDD operations.
async fn get_db(state: &T3AppState) -> Result<sea_orm::DatabaseConnection, (StatusCode, Json<Value>)> {
    if let Some(conn) = &state.local_config_conn {
        return Ok(conn.lock().await.clone());
    }
    Err((
        StatusCode::INTERNAL_SERVER_ERROR,
        Json(json!({"error": "Local database connection not available"})),
    ))
}

fn default_severity() -> String {
    "warning".to_string()
}
fn default_true() -> bool {
    true
}

// ── Request types ──

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateRuleRequest {
    rule_id: String,
    rule_name: String,
    #[serde(default)]
    category: String,
    description: Option<String>,
    rule_kind: String,
    #[serde(default)]
    required_roles: Vec<String>,
    #[serde(default)]
    params: Value,
    #[serde(default = "default_severity")]
    severity: String,
    #[serde(default = "default_true")]
    enabled: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ToggleRequest {
    enabled: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AnalyzeRequest {
    serial_number: i32,
    equipment: Option<String>,
    range_hours: Option<u64>,
    rule_ids: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
struct ListRulesQuery {
    category: Option<String>,
}

#[derive(Debug, Deserialize)]
struct FindingsQuery {
    serial: Option<i32>,
    rule_id: Option<String>,
    limit: Option<u64>,
}

// ── Routes ──

pub fn create_fdd_routes() -> Router<T3AppState> {
    Router::new()
        .route("/api/fdd/rules", get(list_rules).post(create_rule))
        .route(
            "/api/fdd/rules/:rule_id",
            put(update_rule).delete(delete_rule),
        )
        .route("/api/fdd/rules/:rule_id/toggle", post(toggle_rule))
        .route("/api/fdd/analyze", post(run_analyze))
        .route("/api/fdd/faults", get(list_findings).delete(clear_findings))
}

// ── Rules CRUD ──

async fn list_rules(
    State(state): State<T3AppState>,
    Query(q): Query<ListRulesQuery>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let db = get_db(&state).await?;
    fdd::ensure_schema(&db).await.map_err(|e| {
        tracing::error!("FDD ensure_schema failed: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e})))
    })?;
    let rules = rules::list_rules(&db, q.category.as_deref()).await.map_err(|e| {
        tracing::error!("FDD list_rules failed: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": format!("Failed to list rules: {}", e)})))
    })?;
    Ok(Json(json!({ "rules": rules, "total": rules.len() })))
}

async fn create_rule(
    State(state): State<T3AppState>,
    Json(payload): Json<CreateRuleRequest>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let db = get_db(&state).await?;
    fdd::ensure_schema(&db).await.map_err(|e| {
        (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e})))
    })?;
    let rule = rules::Rule {
        rule_id: payload.rule_id,
        rule_name: payload.rule_name,
        category: payload.category,
        description: payload.description,
        rule_kind: payload.rule_kind,
        required_roles: payload.required_roles,
        params: if payload.params.is_null() { json!({}) } else { payload.params },
        severity: payload.severity,
        enabled: payload.enabled,
    };
    rules::create_rule(&db, &rule).await.map_err(|e| {
        tracing::error!("FDD create_rule failed: {}", e);
        (StatusCode::BAD_REQUEST, Json(json!({"error": e})))
    })?;
    Ok(Json(json!({ "message": "Rule created", "rule_id": rule.rule_id })))
}

async fn update_rule(
    State(state): State<T3AppState>,
    Path(rule_id): Path<String>,
    Json(payload): Json<Value>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let db = get_db(&state).await?;
    fdd::ensure_schema(&db).await.map_err(|e| {
        (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e})))
    })?;
    let updated = rules::update_rule(&db, &rule_id, &payload).await.map_err(|e| {
        tracing::error!("FDD update_rule failed: {}", e);
        (StatusCode::BAD_REQUEST, Json(json!({"error": e})))
    })?;
    match updated {
        Some(rule) => Ok(Json(json!({ "message": "Rule updated", "rule": rule }))),
        None => Err((
            StatusCode::NOT_FOUND,
            Json(json!({ "error": format!("Rule '{}' not found", rule_id) })),
        )),
    }
}

async fn delete_rule(
    State(state): State<T3AppState>,
    Path(rule_id): Path<String>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let db = get_db(&state).await?;
    rules::delete_rule(&db, &rule_id).await.map_err(|e| {
        tracing::error!("FDD delete_rule failed: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e})))
    })?;
    Ok(Json(json!({ "message": "Rule deleted", "rule_id": rule_id })))
}

async fn toggle_rule(
    State(state): State<T3AppState>,
    Path(rule_id): Path<String>,
    Json(payload): Json<ToggleRequest>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let db = get_db(&state).await?;
    fdd::ensure_schema(&db).await.map_err(|e| {
        (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e})))
    })?;
    let updated = rules::toggle_rule(&db, &rule_id, payload.enabled).await.map_err(|e| {
        tracing::error!("FDD toggle_rule failed: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e})))
    })?;
    match updated {
        Some(rule) => Ok(Json(json!({ "message": "Rule updated", "rule": rule }))),
        None => Err((
            StatusCode::NOT_FOUND,
            Json(json!({ "error": format!("Rule '{}' not found", rule_id) })),
        )),
    }
}

// ── Analysis / Findings ──

async fn run_analyze(
    State(state): State<T3AppState>,
    Json(payload): Json<AnalyzeRequest>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let db = get_db(&state).await?;
    let range_hours = payload.range_hours.unwrap_or(24);
    let rule_ids = payload.rule_ids.unwrap_or_default();
    let result = fdd::analyze(
        &db,
        payload.serial_number,
        &payload.equipment.unwrap_or_default(),
        range_hours,
        &rule_ids,
    )
    .await
    .map_err(|e| {
        tracing::error!("FDD analyze failed: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e})))
    })?;
    Ok(Json(result))
}

async fn list_findings(
    State(state): State<T3AppState>,
    Query(q): Query<FindingsQuery>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let db = get_db(&state).await?;
    let result = fdd::list_findings(&db, q.serial, q.rule_id.as_deref(), q.limit.unwrap_or(50))
        .await
        .map_err(|e| {
            tracing::error!("FDD list_findings failed: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e})))
        })?;
    Ok(Json(result))
}
async fn clear_findings(
    State(state): State<T3AppState>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let db = get_db(&state).await?;
    let count = rules::clear_findings(&db).await.map_err(|e| {
        tracing::error!("FDD clear_findings failed: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({ "error": e })))
    })?;
    Ok(Json(json!({ "message": "Findings cleared", "count": count })))
}