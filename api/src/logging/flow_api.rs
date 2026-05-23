//! Flow Log REST API
//!
//! All flow data lives in local SQLite (webview_t3_device.db) only.
//! Routes use `local_config_conn` which always points to that local DB
//! regardless of whether a remote MSSQL backend is configured.
//!
//! Endpoints:
//!   GET  /api/flows                       – list flows (filterable)
//!   GET  /api/flows/types                 – distinct flow_type counts
//!   GET  /api/flows/:flow_id              – one flow + all its steps
//!   GET  /api/flows/:flow_id/payload/:seq – stream offloaded payload file
//!   POST /api/flows/:flow_id/client-step  – React records a client-side step
//!   POST /api/flows/purge                 – delete flows older than N days

use axum::{
    extract::{Path, Query, State},
    http::{header, StatusCode},
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use sea_orm::{ConnectionTrait, Statement};

use crate::app_state::T3AppState;

// ---------------------------------------------------------------------------
// Shared helper: get local SQLite connection from state
// ---------------------------------------------------------------------------

macro_rules! local_db {
    ($state:expr) => {
        match &$state.local_config_conn {
            Some(conn) => conn.lock().await,
            None => {
                return (
                    StatusCode::SERVICE_UNAVAILABLE,
                    Json(serde_json::json!({"error": "T3 device database not available"})),
                )
                    .into_response()
            }
        }
    };
}

// ---------------------------------------------------------------------------
// Shared response / request types
// ---------------------------------------------------------------------------

#[derive(Debug, Serialize)]
pub struct FlowRow {
    pub id: i64,
    pub flow_id: String,
    pub flow_type: String,
    pub trigger_src: String,
    pub started_at: i64,
    pub ended_at: Option<i64>,
    pub status: String,
    pub hostname: Option<String>,
    pub total_steps: i64,
    pub done_steps: i64,
    pub error_count: i64,
    pub meta: Option<String>,
    /// Duration in ms (computed from started_at..ended_at or now)
    pub duration_ms: Option<i64>,
}

#[derive(Debug, Serialize)]
pub struct FlowStepRow {
    pub id: i64,
    pub flow_id: String,
    pub seq: i64,
    pub step_name: String,
    pub level: String,
    pub source: Option<String>,
    pub api_path: Option<String>,
    pub action_type: Option<i64>,
    pub status: String,
    pub duration_ms: Option<i64>,
    pub payload_ref: Option<String>,
    pub message: Option<String>,
    pub details: Option<String>,
    pub ts_unix: i64,
    pub ts_fmt: String,
}

#[derive(Debug, Serialize)]
pub struct FlowDetail {
    pub flow: FlowRow,
    pub steps: Vec<FlowStepRow>,
}

#[derive(Debug, Serialize)]
pub struct FlowTypeCount {
    pub flow_type: String,
    pub count: i64,
}

#[derive(Debug, Deserialize)]
pub struct ListFlowsQuery {
    pub flow_type: Option<String>,
    pub status: Option<String>,
    /// Unix ms
    pub from: Option<i64>,
    /// Unix ms
    pub to: Option<i64>,
    pub limit: Option<i64>,
    pub page: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct ClientStepRequest {
    pub step_name: String,
    pub level: Option<String>,
    pub status: Option<String>,
    pub duration_ms: Option<i64>,
    pub message: Option<String>,
    pub details: Option<String>,
    pub api_path: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct PurgeRequest {
    /// Delete flows whose ended_at is older than this many days. Default 30.
    pub older_than_days: Option<i64>,
}

#[derive(Debug, Serialize)]
pub struct PurgeResult {
    pub deleted_flows: i64,
    pub deleted_steps: i64,
    pub deleted_payloads: i64,
}

// ---------------------------------------------------------------------------
// GET /api/flows  — returns { flows, total, page, limit }
// ---------------------------------------------------------------------------

#[derive(Debug, Serialize)]
pub struct FlowListResponse {
    pub flows: Vec<FlowRow>,
    pub total: i64,
    pub page: i64,
    pub limit: i64,
}

async fn list_flows(
    State(state): State<T3AppState>,
    Query(q): Query<ListFlowsQuery>,
) -> Response {
    let guard = local_db!(state);
    let db: &sea_orm::DatabaseConnection = &*guard;

    let limit = q.limit.unwrap_or(15).min(500);
    let page  = q.page.unwrap_or(0);
    let offset = page * limit;

    let mut where_clauses: Vec<String> = Vec::new();
    if let Some(ft) = &q.flow_type {
        where_clauses.push(format!("flow_type = '{}'", esc(ft)));
    }
    if let Some(st) = &q.status {
        where_clauses.push(format!("status = '{}'", esc(st)));
    }
    if let Some(from) = q.from {
        where_clauses.push(format!("started_at >= {}", from));
    }
    if let Some(to) = q.to {
        where_clauses.push(format!("started_at <= {}", to));
    }

    let where_sql = if where_clauses.is_empty() {
        String::new()
    } else {
        format!("WHERE {}", where_clauses.join(" AND "))
    };

    // Count query (same WHERE, no LIMIT/OFFSET)
    let count_sql = format!("SELECT COUNT(*) as total FROM T3_FLOW {}", where_sql);
    let total: i64 = db
        .query_one(Statement::from_string(sea_orm::DatabaseBackend::Sqlite, count_sql))
        .await
        .ok()
        .flatten()
        .and_then(|r| r.try_get("", "total").ok())
        .unwrap_or(0);

    let sql = format!(
        "SELECT id, flow_id, flow_type, trigger_src, started_at, ended_at, status, hostname, \
         total_steps, done_steps, error_count, meta \
         FROM T3_FLOW {} ORDER BY started_at DESC LIMIT {} OFFSET {}",
        where_sql, limit, offset
    );

    match db.query_all(Statement::from_string(sea_orm::DatabaseBackend::Sqlite, sql)).await {
        Ok(rows) => {
            let flows: Vec<FlowRow> = rows
                .iter()
                .filter_map(|r| row_to_flow(r).ok())
                .collect();
            Json(FlowListResponse { flows, total, page, limit }).into_response()
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": format!("{}", e)})),
        )
            .into_response(),
    }
}

// ---------------------------------------------------------------------------
// GET /api/flows/types
// ---------------------------------------------------------------------------

async fn list_flow_types(State(state): State<T3AppState>) -> Response {
    let guard = local_db!(state);
    let db: &sea_orm::DatabaseConnection = &*guard;

    let sql = "SELECT flow_type, COUNT(*) as count FROM T3_FLOW GROUP BY flow_type ORDER BY count DESC";
    match db.query_all(Statement::from_string(sea_orm::DatabaseBackend::Sqlite, sql.to_string())).await {
        Ok(rows) => {
            let types: Vec<FlowTypeCount> = rows
                .iter()
                .filter_map(|r| {
                    let flow_type: String = r.try_get("", "flow_type").ok()?;
                    let count: i64 = r.try_get("", "count").ok()?;
                    Some(FlowTypeCount { flow_type, count })
                })
                .collect();
            Json(types).into_response()
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": format!("{}", e)})),
        )
            .into_response(),
    }
}

// ---------------------------------------------------------------------------
// GET /api/flows/:flow_id
// ---------------------------------------------------------------------------

async fn get_flow(State(state): State<T3AppState>, Path(flow_id): Path<String>) -> Response {
    let guard = local_db!(state);
    let db: &sea_orm::DatabaseConnection = &*guard;

    let flow_sql = format!(
        "SELECT id, flow_id, flow_type, trigger_src, started_at, ended_at, status, hostname, \
         total_steps, done_steps, error_count, meta \
         FROM T3_FLOW WHERE flow_id = '{}'",
        esc(&flow_id)
    );

    let flow_row = match db.query_one(Statement::from_string(sea_orm::DatabaseBackend::Sqlite, flow_sql)).await {
        Ok(Some(r)) => match row_to_flow(&r) {
            Ok(f) => f,
            Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": format!("{}", e)}))).into_response(),
        },
        Ok(None) => return (StatusCode::NOT_FOUND, Json(serde_json::json!({"error": "flow not found"}))).into_response(),
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": format!("{}", e)}))).into_response(),
    };

    let steps_sql = format!(
        "SELECT id, flow_id, seq, step_name, level, source, api_path, action_type, status, \
         duration_ms, payload_ref, message, details, ts_unix, ts_fmt \
         FROM T3_FLOW_STEP WHERE flow_id = '{}' ORDER BY seq ASC",
        esc(&flow_id)
    );

    let steps: Vec<FlowStepRow> = match db.query_all(Statement::from_string(sea_orm::DatabaseBackend::Sqlite, steps_sql)).await {
        Ok(rows) => rows.iter().filter_map(|r| row_to_step(r).ok()).collect(),
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": format!("{}", e)}))).into_response(),
    };

    Json(FlowDetail { flow: flow_row, steps }).into_response()
}

// ---------------------------------------------------------------------------
// GET /api/flows/:flow_id/payload/:seq
// ---------------------------------------------------------------------------

async fn get_payload(
    State(state): State<T3AppState>,
    Path((flow_id, seq)): Path<(String, i64)>,
) -> Response {
    let guard = local_db!(state);
    let db: &sea_orm::DatabaseConnection = &*guard;

    let sql = format!(
        "SELECT payload_ref FROM T3_FLOW_STEP WHERE flow_id = '{}' AND seq = {}",
        esc(&flow_id), seq
    );

    let path: Option<String> = match db.query_one(Statement::from_string(sea_orm::DatabaseBackend::Sqlite, sql)).await {
        Ok(Some(r)) => r.try_get("", "payload_ref").ok().flatten(),
        _ => None,
    };

    match path {
        None => (StatusCode::NOT_FOUND, "no offloaded payload for this step").into_response(),
        Some(p) => match std::fs::read_to_string(&p) {
            Ok(content) => (
                [(header::CONTENT_TYPE, "application/json")],
                content,
            )
                .into_response(),
            Err(e) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("could not read payload file: {}", e),
            )
                .into_response(),
        },
    }
}

// ---------------------------------------------------------------------------
// POST /api/flows/:flow_id/client-step
// ---------------------------------------------------------------------------

async fn post_client_step(
    State(state): State<T3AppState>,
    Path(flow_id): Path<String>,
    Json(req): Json<ClientStepRequest>,
) -> Response {
    let guard = local_db!(state);
    let db: &sea_orm::DatabaseConnection = &*guard;

    // Get next seq for this flow
    let seq_sql = format!(
        "SELECT COALESCE(MAX(seq), -1) + 1 AS next_seq FROM T3_FLOW_STEP WHERE flow_id = '{}'",
        esc(&flow_id)
    );
    let seq: i64 = match db.query_one(Statement::from_string(sea_orm::DatabaseBackend::Sqlite, seq_sql)).await {
        Ok(Some(r)) => r.try_get("", "next_seq").unwrap_or(0),
        _ => 0,
    };

    let now_ms = chrono::Local::now().timestamp_millis();
    let ts_fmt = chrono::Local::now().format("%Y-%m-%d %H:%M:%S%.3f").to_string();
    let level = req.level.as_deref().unwrap_or("info");
    let status = req.status.as_deref().unwrap_or("ok");
    let duration_ms = req.duration_ms.unwrap_or(0);

    let sql = format!(
        "INSERT INTO T3_FLOW_STEP \
         (flow_id, seq, step_name, level, source, status, duration_ms, message, details, api_path, ts_unix, ts_fmt) \
         VALUES ('{}',{},'{}','{}','react','{}',{},{},{},{},{},'{}')",
        esc(&flow_id),
        seq,
        esc(&req.step_name),
        esc(level),
        esc(status),
        duration_ms,
        req.message.as_deref().map(|s| format!("'{}'", esc(s))).unwrap_or_else(|| "NULL".into()),
        req.details.as_deref().map(|s| format!("'{}'", esc(s))).unwrap_or_else(|| "NULL".into()),
        req.api_path.as_deref().map(|s| format!("'{}'", esc(s))).unwrap_or_else(|| "NULL".into()),
        now_ms,
        esc(&ts_fmt),
    );

    match db.execute(Statement::from_string(sea_orm::DatabaseBackend::Sqlite, sql)).await {
        Ok(_) => {
            // bump done_steps on parent
            let upd = format!(
                "UPDATE T3_FLOW SET done_steps = done_steps + 1 {} WHERE flow_id = '{}'",
                if status == "error" { ", error_count = error_count + 1" } else { "" },
                esc(&flow_id)
            );
            let _ = db.execute(Statement::from_string(sea_orm::DatabaseBackend::Sqlite, upd)).await;
            (StatusCode::CREATED, Json(serde_json::json!({"seq": seq}))).into_response()
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": format!("{}", e)})),
        )
            .into_response(),
    }
}

// ---------------------------------------------------------------------------
// POST /api/flows/purge
// ---------------------------------------------------------------------------

async fn purge_flows(
    State(state): State<T3AppState>,
    Json(req): Json<PurgeRequest>,
) -> Response {
    let guard = local_db!(state);
    let db: &sea_orm::DatabaseConnection = &*guard;

    let days = req.older_than_days.unwrap_or(30);
    let cutoff_ms = chrono::Local::now().timestamp_millis() - days * 86_400_000;

    // Collect flow_ids to delete
    let id_sql = format!(
        "SELECT flow_id FROM T3_FLOW WHERE ended_at IS NOT NULL AND ended_at < {}",
        cutoff_ms
    );
    let flow_ids: Vec<String> = match db.query_all(Statement::from_string(sea_orm::DatabaseBackend::Sqlite, id_sql)).await {
        Ok(rows) => rows.iter().filter_map(|r| r.try_get::<String>("", "flow_id").ok()).collect(),
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": format!("{}", e)}))).into_response(),
    };

    if flow_ids.is_empty() {
        return Json(PurgeResult { deleted_flows: 0, deleted_steps: 0, deleted_payloads: 0 }).into_response();
    }

    let ids_csv = flow_ids.iter().map(|id| format!("'{}'", esc(id))).collect::<Vec<_>>().join(",");

    // Delete payload files referenced by steps of these flows before deleting DB rows
    let payload_sql = format!(
        "SELECT file_path FROM T3_FLOW_PAYLOAD WHERE flow_id IN ({})",
        ids_csv
    );
    let mut deleted_payloads: i64 = 0;
    if let Ok(rows) = db.query_all(Statement::from_string(sea_orm::DatabaseBackend::Sqlite, payload_sql)).await {
        for r in &rows {
            if let Ok(path) = r.try_get::<String>("", "file_path") {
                if std::fs::remove_file(&path).is_ok() {
                    deleted_payloads += 1;
                }
            }
        }
    }

    // Also check payload_ref in T3_FLOW_STEP
    let step_payload_sql = format!(
        "SELECT payload_ref FROM T3_FLOW_STEP WHERE flow_id IN ({}) AND payload_ref IS NOT NULL",
        ids_csv
    );
    if let Ok(rows) = db.query_all(Statement::from_string(sea_orm::DatabaseBackend::Sqlite, step_payload_sql)).await {
        for r in &rows {
            if let Ok(Some(path)) = r.try_get::<Option<String>>("", "payload_ref") {
                if std::fs::remove_file(&path).is_ok() {
                    deleted_payloads += 1;
                }
            }
        }
    }

    // Count steps before deletion for the response
    let count_steps_sql = format!(
        "SELECT COUNT(*) as cnt FROM T3_FLOW_STEP WHERE flow_id IN ({})",
        ids_csv
    );
    let deleted_steps: i64 = db.query_one(Statement::from_string(sea_orm::DatabaseBackend::Sqlite, count_steps_sql)).await
        .ok()
        .flatten()
        .and_then(|r| r.try_get::<i64>("", "cnt").ok())
        .unwrap_or(0);

    // Delete rows
    let del_payload = format!("DELETE FROM T3_FLOW_PAYLOAD WHERE flow_id IN ({})", ids_csv);
    let del_steps   = format!("DELETE FROM T3_FLOW_STEP    WHERE flow_id IN ({})", ids_csv);
    let del_flows   = format!("DELETE FROM T3_FLOW         WHERE flow_id IN ({})", ids_csv);

    let _ = db.execute(Statement::from_string(sea_orm::DatabaseBackend::Sqlite, del_payload)).await;
    let _ = db.execute(Statement::from_string(sea_orm::DatabaseBackend::Sqlite, del_steps)).await;
    let _ = db.execute(Statement::from_string(sea_orm::DatabaseBackend::Sqlite, del_flows)).await;

    Json(PurgeResult {
        deleted_flows: flow_ids.len() as i64,
        deleted_steps,
        deleted_payloads,
    })
    .into_response()
}

// ---------------------------------------------------------------------------
// POST /api/flows/clear-all
// ---------------------------------------------------------------------------

async fn clear_all_flows(State(state): State<T3AppState>) -> Response {
    let guard = local_db!(state);
    let db: &sea_orm::DatabaseConnection = &*guard;

    // Collect all payload file paths before deletion
    let mut deleted_payloads: i64 = 0;

    if let Ok(rows) = db.query_all(Statement::from_string(
        sea_orm::DatabaseBackend::Sqlite,
        "SELECT file_path FROM T3_FLOW_PAYLOAD".to_owned(),
    )).await {
        for r in &rows {
            if let Ok(path) = r.try_get::<String>("", "file_path") {
                if std::fs::remove_file(&path).is_ok() { deleted_payloads += 1; }
            }
        }
    }

    if let Ok(rows) = db.query_all(Statement::from_string(
        sea_orm::DatabaseBackend::Sqlite,
        "SELECT payload_ref FROM T3_FLOW_STEP WHERE payload_ref IS NOT NULL".to_owned(),
    )).await {
        for r in &rows {
            if let Ok(Some(path)) = r.try_get::<Option<String>>("", "payload_ref") {
                if std::fs::remove_file(&path).is_ok() { deleted_payloads += 1; }
            }
        }
    }

    // Count rows before deletion for the response
    let flow_count: i64 = db.query_one(Statement::from_string(
        sea_orm::DatabaseBackend::Sqlite,
        "SELECT COUNT(*) as cnt FROM T3_FLOW".to_owned(),
    )).await.ok().flatten()
        .and_then(|r| r.try_get::<i64>("", "cnt").ok()).unwrap_or(0);

    let step_count: i64 = db.query_one(Statement::from_string(
        sea_orm::DatabaseBackend::Sqlite,
        "SELECT COUNT(*) as cnt FROM T3_FLOW_STEP".to_owned(),
    )).await.ok().flatten()
        .and_then(|r| r.try_get::<i64>("", "cnt").ok()).unwrap_or(0);

    let _ = db.execute(Statement::from_string(sea_orm::DatabaseBackend::Sqlite,
        "DELETE FROM T3_FLOW_PAYLOAD".to_owned())).await;
    let _ = db.execute(Statement::from_string(sea_orm::DatabaseBackend::Sqlite,
        "DELETE FROM T3_FLOW_STEP".to_owned())).await;
    let _ = db.execute(Statement::from_string(sea_orm::DatabaseBackend::Sqlite,
        "DELETE FROM T3_FLOW".to_owned())).await;

    Json(PurgeResult {
        deleted_flows: flow_count,
        deleted_steps: step_count,
        deleted_payloads,
    }).into_response()
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

pub fn flow_routes() -> Router<T3AppState> {
    Router::new()
        .route("/api/flows",                               get(list_flows))
        .route("/api/flows/types",                         get(list_flow_types))
        .route("/api/flows/purge",                         post(purge_flows))
        .route("/api/flows/clear-all",                     post(clear_all_flows))
        .route("/api/flows/:flow_id",                      get(get_flow))
        .route("/api/flows/:flow_id/payload/:seq",         get(get_payload))
        .route("/api/flows/:flow_id/client-step",          post(post_client_step))
}

// ---------------------------------------------------------------------------
// Row-mapping helpers
// ---------------------------------------------------------------------------

fn row_to_flow(r: &sea_orm::QueryResult) -> Result<FlowRow, sea_orm::DbErr> {
    let started_at: i64 = r.try_get("", "started_at")?;
    let ended_at: Option<i64> = r.try_get("", "ended_at").ok().flatten();
    let now_ms = chrono::Local::now().timestamp_millis();
    let duration_ms = ended_at.map(|e| e - started_at).or_else(|| {
        // still running: elapsed so far
        Some(now_ms - started_at)
    });

    Ok(FlowRow {
        id:           r.try_get("", "id")?,
        flow_id:      r.try_get("", "flow_id")?,
        flow_type:    r.try_get("", "flow_type")?,
        trigger_src:  r.try_get("", "trigger_src")?,
        started_at,
        ended_at,
        status:       r.try_get("", "status")?,
        hostname:     r.try_get("", "hostname").ok().flatten(),
        total_steps:  r.try_get("", "total_steps")?,
        done_steps:   r.try_get("", "done_steps")?,
        error_count:  r.try_get("", "error_count")?,
        meta:         r.try_get("", "meta").ok().flatten(),
        duration_ms,
    })
}

fn row_to_step(r: &sea_orm::QueryResult) -> Result<FlowStepRow, sea_orm::DbErr> {
    Ok(FlowStepRow {
        id:          r.try_get("", "id")?,
        flow_id:     r.try_get("", "flow_id")?,
        seq:         r.try_get("", "seq")?,
        step_name:   r.try_get("", "step_name")?,
        level:       r.try_get("", "level")?,
        source:      r.try_get("", "source").ok().flatten(),
        api_path:    r.try_get("", "api_path").ok().flatten(),
        action_type: r.try_get("", "action_type").ok().flatten(),
        status:      r.try_get("", "status")?,
        duration_ms: r.try_get("", "duration_ms").ok().flatten(),
        payload_ref: r.try_get("", "payload_ref").ok().flatten(),
        message:     r.try_get("", "message").ok().flatten(),
        details:     r.try_get("", "details").ok().flatten(),
        ts_unix:     r.try_get("", "ts_unix")?,
        ts_fmt:      r.try_get("", "ts_fmt")?,
    })
}

// ---------------------------------------------------------------------------
// SQL escape (consistent with the rest of the codebase)
// ---------------------------------------------------------------------------

fn esc(s: &str) -> String {
    s.replace('\'', "''")
}
