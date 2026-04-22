//! Sync Health API
//!
//! Single aggregate endpoint `GET /api/sync/health` that returns everything
//! the dashboard needs about sync status and database health — role, center DB
//! connection state, last-sync time, records written today, DB size and path.
//!
//! All data is read from:
//!   - `T3AppState` (role, MSSQL pool, connections)
//!   - `DATA_SYNC_METADATA` table (last sync time, records today)
//!   - Filesystem (DB file size + path)
//!
//! Additionally provides:
//!   `GET  /api/sync/event-log`  — paginated sync event log
//!   `POST /api/sync/event-log`  — write one event (called by FFI sync loop)

use axum::{
    extract::{Query, State},
    response::Json,
    routing::{get, post},
    Router,
};
use chrono::{Datelike, Local, TimeZone, Utc};
use sea_orm::*;
use serde::{Deserialize, Serialize};

use crate::app_state::T3AppState;
use crate::error::Result;

// ============================================================================
// Sync Health Response
// ============================================================================

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncHealthResponse {
    /// PC role: "server" | "client" | "standalone"
    pub role: String,
    /// Whether [ServerDatabase] enabled=1 in INI
    pub center_db_enabled: bool,
    /// Whether the center DB runtime connection is alive
    pub center_db_connected: bool,
    /// Whether MSSQL pool is active (direct write path)
    pub mssql_pool_active: bool,
    /// Backend type in use: "sqlite" | "postgres" | "mysql" | "mssql"
    pub backend_type: String,
    /// Hostname of this PC
    pub hostname: String,

    /// Last sync time (ISO string), null if never synced
    pub last_sync_time: Option<String>,
    /// How long ago the last sync was (e.g. "2 min ago")
    pub last_sync_ago: Option<String>,

    /// Records written today across all data types
    pub records_today: RecordsToday,

    /// Local SQLite DB size in bytes
    pub db_size_bytes: u64,
    /// Human-readable size (e.g. "245.3 MB")
    pub db_size_human: String,
    /// Absolute path to the DB folder
    pub db_folder_path: String,
    /// Absolute path to the DB file
    pub db_file_path: String,

    /// Total devices seen in sync today
    pub devices_synced_today: i64,
}

#[derive(Debug, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct RecordsToday {
    pub inputs: i64,
    pub outputs: i64,
    pub variables: i64,
    pub trendlogs: i64,
    pub total: i64,
}

// ============================================================================
// Sync Event Log Types
// ============================================================================

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum EventLevel {
    Info,
    Warn,
    Error,
}

impl EventLevel {
    fn as_str(&self) -> &'static str {
        match self {
            EventLevel::Info => "info",
            EventLevel::Warn => "warn",
            EventLevel::Error => "error",
        }
    }
    fn from_str(s: &str) -> Self {
        match s {
            "warn" => EventLevel::Warn,
            "error" => EventLevel::Error,
            _ => EventLevel::Info,
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncEventEntry {
    pub id: i64,
    pub ts: String,
    pub ts_unix: i64,
    pub level: EventLevel,
    pub device_serial: Option<String>,
    pub message: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InsertEventRequest {
    pub level: Option<EventLevel>,
    pub device_serial: Option<String>,
    pub message: String,
}

#[derive(Debug, Deserialize)]
pub struct EventLogQuery {
    #[serde(default = "default_log_limit")]
    pub limit: u32,
    #[serde(default)]
    pub page: u32,
    pub level: Option<String>,
}

fn default_log_limit() -> u32 {
    50
}

// ============================================================================
// DB helpers
// ============================================================================

fn format_bytes(bytes: u64) -> String {
    const UNITS: &[&str] = &["B", "KB", "MB", "GB"];
    if bytes == 0 {
        return "0 B".to_string();
    }
    let i = ((bytes as f64).ln() / 1024_f64.ln()).floor() as usize;
    let i = i.min(UNITS.len() - 1);
    format!("{:.1} {}", bytes as f64 / 1024_f64.powi(i as i32), UNITS[i])
}

fn time_ago(unix_ts: i64) -> String {
    let now = Utc::now().timestamp();
    let secs = now.saturating_sub(unix_ts);
    if secs < 60 {
        return "Just now".to_string();
    }
    let mins = secs / 60;
    if mins < 60 {
        return format!("{} min ago", mins);
    }
    let hours = mins / 60;
    if hours < 24 {
        return format!("{} hr ago", hours);
    }
    format!("{} days ago", hours / 24)
}

async fn get_db_conn(state: &T3AppState) -> Option<sea_orm::DatabaseConnection> {
    if let Some(arc) = &state.t3_device_conn {
        return Some(arc.lock().await.clone());
    }
    if let Some(arc) = &state.local_config_conn {
        return Some(arc.lock().await.clone());
    }
    None
}

// ============================================================================
// GET /api/sync/health
// ============================================================================

async fn get_sync_health(State(state): State<T3AppState>) -> Result<Json<SyncHealthResponse>> {
    let hostname = hostname::get()
        .map(|h| h.to_string_lossy().to_string())
        .unwrap_or_else(|_| "unknown".to_string());

    let role = if !state.server_db_enabled {
        "standalone".to_string()
    } else {
        state.server_db_role.clone()
    };

    let backend_type = if state.mssql_pool.is_some() {
        "mssql"
    } else if state.server_db_enabled && state.server_db_connected {
        "postgres_or_mysql"
    } else {
        "sqlite"
    }
    .to_string();

    // DB file info
    let db_path = crate::constants::get_t3000_database_path();
    let db_size_bytes = std::fs::metadata(&db_path)
        .map(|m| m.len())
        .unwrap_or(0);
    let db_size_human = format_bytes(db_size_bytes);
    let db_folder_path = db_path
        .parent()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_default();
    let db_file_path = db_path.to_string_lossy().to_string();

    // Query DATA_SYNC_METADATA for last sync + records today
    let mut last_sync_time: Option<String> = None;
    let mut last_sync_ago: Option<String> = None;
    let mut records_today = RecordsToday::default();
    let mut devices_synced_today: i64 = 0;

    if let Some(db) = get_db_conn(&state).await {
        // -- Last sync time (most recent LOGGING_DATA_CYCLE or any FFI record)
        let raw_last = db
            .query_one(sea_orm::Statement::from_string(
                sea_orm::DatabaseBackend::Sqlite,
                r#"SELECT MAX(sync_time) AS t FROM DATA_SYNC_METADATA
                   WHERE sync_method = 'FFI_BACKEND'"#
                    .to_string(),
            ))
            .await
            .ok()
            .flatten();

        if let Some(row) = raw_last {
            if let Ok(ts) = row.try_get::<i64>("", "t") {
                let dt = Local.timestamp_opt(ts, 0).single();
                last_sync_time = dt.map(|d| d.format("%Y-%m-%d %H:%M:%S").to_string());
                last_sync_ago = Some(time_ago(ts));
            }
        }

        // -- Today's midnight timestamp
        let today_start = {
            let now = Local::now();
            Local
                .with_ymd_and_hms(now.year(), now.month(), now.day(), 0, 0, 0)
                .single()
                .map(|d| d.timestamp())
                .unwrap_or_else(|| Utc::now().timestamp() - 86400)
        };

        // Records today by type
        let today_rows = db
            .query_all(sea_orm::Statement::from_string(
                sea_orm::DatabaseBackend::Sqlite,
                format!(
                    r#"SELECT data_type, SUM(records_synced) AS total
                       FROM DATA_SYNC_METADATA
                       WHERE sync_time >= {} AND sync_method = 'FFI_BACKEND'
                       GROUP BY data_type"#,
                    today_start
                ),
            ))
            .await
            .unwrap_or_default();

        for row in today_rows {
            let dt: String = row.try_get("", "data_type").unwrap_or_default();
            let total: i64 = row.try_get("", "total").unwrap_or(0);
            match dt.as_str() {
                "INPUTS" => records_today.inputs += total,
                "OUTPUTS" => records_today.outputs += total,
                "VARIABLES" => records_today.variables += total,
                "TRENDLOG_DATA" | "TRENDLOG_DETAIL" => records_today.trendlogs += total,
                _ => {}
            }
        }
        records_today.total =
            records_today.inputs + records_today.outputs + records_today.variables + records_today.trendlogs;

        // Distinct devices synced today
        let dev_row = db
            .query_one(sea_orm::Statement::from_string(
                sea_orm::DatabaseBackend::Sqlite,
                format!(
                    r#"SELECT COUNT(DISTINCT serial_number) AS cnt
                       FROM DATA_SYNC_METADATA
                       WHERE sync_time >= {} AND sync_method = 'FFI_BACKEND'
                         AND serial_number != 'ALL'"#,
                    today_start
                ),
            ))
            .await
            .ok()
            .flatten();

        if let Some(row) = dev_row {
            devices_synced_today = row.try_get::<i64>("", "cnt").unwrap_or(0);
        }
    }

    Ok(Json(SyncHealthResponse {
        role,
        center_db_enabled: state.server_db_enabled,
        center_db_connected: state.server_db_connected,
        mssql_pool_active: state.mssql_pool.is_some(),
        backend_type,
        hostname,
        last_sync_time,
        last_sync_ago,
        records_today,
        db_size_bytes,
        db_size_human,
        db_folder_path,
        db_file_path,
        devices_synced_today,
    }))
}

// ============================================================================
// Sync Event Log — SQLite raw table (no SeaORM entity needed)
// ============================================================================

const CREATE_EVENT_LOG_SQL: &str = r#"
CREATE TABLE IF NOT EXISTS SYNC_EVENT_LOG (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    ts_unix     INTEGER NOT NULL,
    ts_fmt      TEXT    NOT NULL,
    level       TEXT    NOT NULL DEFAULT 'info',
    device_serial TEXT,
    message     TEXT    NOT NULL
)
"#;

const CREATE_EVENT_LOG_IDX: &str =
    "CREATE INDEX IF NOT EXISTS idx_sel_ts ON SYNC_EVENT_LOG (ts_unix DESC)";

/// Ensure the SYNC_EVENT_LOG table exists (called once at startup via route init, or lazily).
pub async fn ensure_event_log_table(db: &sea_orm::DatabaseConnection) {
    let _ = db
        .execute(sea_orm::Statement::from_string(
            sea_orm::DatabaseBackend::Sqlite,
            CREATE_EVENT_LOG_SQL.to_string(),
        ))
        .await;
    let _ = db
        .execute(sea_orm::Statement::from_string(
            sea_orm::DatabaseBackend::Sqlite,
            CREATE_EVENT_LOG_IDX.to_string(),
        ))
        .await;
}

/// Write a sync event to SYNC_EVENT_LOG. Best-effort — errors are swallowed.
pub async fn write_sync_event(
    db: &sea_orm::DatabaseConnection,
    level: &str,
    device_serial: Option<&str>,
    message: &str,
) {
    let now = Local::now();
    let ts_unix = now.timestamp();
    let ts_fmt = now.format("%Y-%m-%d %H:%M:%S").to_string();
    let serial_sql = match device_serial {
        Some(s) => format!("'{}'", s.replace('\'', "''")),
        None => "NULL".to_string(),
    };
    let msg_escaped = message.replace('\'', "''");
    let lvl_escaped = level.replace('\'', "''");

    let sql = format!(
        "INSERT INTO SYNC_EVENT_LOG (ts_unix, ts_fmt, level, device_serial, message) \
         VALUES ({}, '{}', '{}', {}, '{}')",
        ts_unix, ts_fmt, lvl_escaped, serial_sql, msg_escaped
    );

    let _ = db
        .execute(sea_orm::Statement::from_string(
            sea_orm::DatabaseBackend::Sqlite,
            sql,
        ))
        .await;

    // Keep only latest 2000 rows
    let _ = db
        .execute(sea_orm::Statement::from_string(
            sea_orm::DatabaseBackend::Sqlite,
            "DELETE FROM SYNC_EVENT_LOG WHERE id NOT IN \
             (SELECT id FROM SYNC_EVENT_LOG ORDER BY ts_unix DESC LIMIT 2000)"
                .to_string(),
        ))
        .await;
}

// ============================================================================
// GET /api/sync/event-log
// ============================================================================

async fn get_event_log(
    State(state): State<T3AppState>,
    Query(q): Query<EventLogQuery>,
) -> Result<Json<serde_json::Value>> {
    let db = match get_db_conn(&state).await {
        Some(d) => d,
        None => {
            return Ok(Json(serde_json::json!({ "entries": [], "total": 0 })));
        }
    };

    ensure_event_log_table(&db).await;

    let limit = q.limit.min(200);
    let offset = q.page.saturating_mul(limit);

    let level_filter = match q.level.as_deref() {
        Some("error") => "AND level = 'error'",
        Some("warn") => "AND level = 'warn'",
        Some("info") => "AND level = 'info'",
        _ => "",
    };

    let sql = format!(
        "SELECT id, ts_unix, ts_fmt, level, device_serial, message \
         FROM SYNC_EVENT_LOG WHERE 1=1 {} \
         ORDER BY ts_unix DESC LIMIT {} OFFSET {}",
        level_filter, limit, offset
    );

    let count_sql = format!(
        "SELECT COUNT(*) AS cnt FROM SYNC_EVENT_LOG WHERE 1=1 {}",
        level_filter
    );

    let rows = db
        .query_all(sea_orm::Statement::from_string(
            sea_orm::DatabaseBackend::Sqlite,
            sql,
        ))
        .await
        .unwrap_or_default();

    let total: i64 = db
        .query_one(sea_orm::Statement::from_string(
            sea_orm::DatabaseBackend::Sqlite,
            count_sql,
        ))
        .await
        .ok()
        .flatten()
        .and_then(|r| r.try_get::<i64>("", "cnt").ok())
        .unwrap_or(0);

    let entries: Vec<SyncEventEntry> = rows
        .into_iter()
        .map(|r| SyncEventEntry {
            id: r.try_get("", "id").unwrap_or(0),
            ts_unix: r.try_get("", "ts_unix").unwrap_or(0),
            ts: r.try_get("", "ts_fmt").unwrap_or_default(),
            level: EventLevel::from_str(
                &r.try_get::<String>("", "level").unwrap_or_default(),
            ),
            device_serial: r
                .try_get::<Option<String>>("", "device_serial")
                .ok()
                .flatten(),
            message: r.try_get("", "message").unwrap_or_default(),
        })
        .collect();

    Ok(Json(serde_json::json!({
        "entries": entries,
        "total": total,
        "page": q.page,
        "limit": limit,
    })))
}

// ============================================================================
// POST /api/sync/event-log
// ============================================================================

async fn post_event(
    State(state): State<T3AppState>,
    Json(body): Json<InsertEventRequest>,
) -> Result<Json<serde_json::Value>> {
    if let Some(db) = get_db_conn(&state).await {
        ensure_event_log_table(&db).await;
        let level = body
            .level
            .as_ref()
            .map(|l| l.as_str())
            .unwrap_or("info");
        write_sync_event(&db, level, body.device_serial.as_deref(), &body.message).await;
    }
    Ok(Json(serde_json::json!({ "ok": true })))
}

// ============================================================================
// Router
// ============================================================================

pub fn sync_health_routes() -> Router<T3AppState> {
    Router::new()
        .route("/api/sync/health", get(get_sync_health))
        .route("/api/sync/event-log", get(get_event_log))
        .route("/api/sync/event-log", post(post_event))
}
