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

    /// Whether FFI sampling is currently paused (center DB down)
    pub sampling_paused: bool,
    /// Human-readable reason for the pause, or null when active
    pub paused_reason: Option<String>,
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
// App Log Types  (T3_APP_LOG — replaces SYNC_EVENT_LOG and SYSTEM_LOGS)
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

/// One row returned by GET /api/sync/event-log
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppLogEntry {
    pub id: i64,
    pub ts: String,
    pub ts_unix: i64,
    pub level: EventLevel,
    pub category: String,
    pub source: Option<String>,
    pub hostname: Option<String>,
    pub role: Option<String>,
    pub device_serial: Option<String>,
    pub message: String,
    pub details: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InsertEventRequest {
    pub level: Option<EventLevel>,
    pub category: Option<String>,
    pub source: Option<String>,
    pub device_serial: Option<String>,
    pub message: String,
    pub details: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct EventLogQuery {
    #[serde(default = "default_log_limit")]
    pub limit: u32,
    #[serde(default)]
    pub page: u32,
    pub level: Option<String>,
    pub category: Option<String>,
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
        sampling_paused: crate::app_state::is_sampling_paused(),
        paused_reason: crate::app_state::get_pause_reason(),
    }))
}

// ============================================================================
// T3_APP_LOG — SQLite raw table helpers
// ============================================================================

const CREATE_APP_LOG_SQL: &str = r#"
CREATE TABLE IF NOT EXISTS T3_APP_LOG (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    ts_unix       INTEGER NOT NULL,
    ts_fmt        TEXT    NOT NULL,
    level         TEXT    NOT NULL DEFAULT 'info',
    category      TEXT    NOT NULL DEFAULT 'SERVER_EVENT',
    source        TEXT,
    hostname      TEXT,
    role          TEXT,
    device_serial TEXT,
    message       TEXT    NOT NULL DEFAULT '',
    details       TEXT
)
"#;

const CREATE_APP_LOG_IDX1: &str =
    "CREATE INDEX IF NOT EXISTS idx_t3_app_log_ts  ON T3_APP_LOG (ts_unix DESC)";
const CREATE_APP_LOG_IDX2: &str =
    "CREATE INDEX IF NOT EXISTS idx_t3_app_log_cat ON T3_APP_LOG (category)";
const CREATE_APP_LOG_IDX3: &str =
    "CREATE INDEX IF NOT EXISTS idx_t3_app_log_lvl ON T3_APP_LOG (level)";

/// Ensure T3_APP_LOG table and indexes exist (idempotent, called lazily or at startup).
pub async fn ensure_app_log_table(db: &sea_orm::DatabaseConnection) {
    for sql in &[CREATE_APP_LOG_SQL, CREATE_APP_LOG_IDX1, CREATE_APP_LOG_IDX2, CREATE_APP_LOG_IDX3] {
        let _ = db
            .execute(sea_orm::Statement::from_string(
                sea_orm::DatabaseBackend::Sqlite,
                sql.to_string(),
            ))
            .await;
    }
}

/// Backwards-compat alias used by older call sites.
pub async fn ensure_event_log_table(db: &sea_orm::DatabaseConnection) {
    ensure_app_log_table(db).await;
}

/// Write one entry to T3_APP_LOG. Best-effort — errors are swallowed.
pub async fn write_app_log(
    db: &sea_orm::DatabaseConnection,
    level: &str,
    category: &str,
    source: Option<&str>,
    device_serial: Option<&str>,
    message: &str,
    details: Option<&str>,
) {
    let now = Local::now();
    let ts_unix = now.timestamp();
    let ts_fmt = now.format("%Y-%m-%d %H:%M:%S").to_string();

    let hostname_val = hostname::get()
        .map(|h| h.to_string_lossy().into_owned())
        .unwrap_or_else(|_| "unknown".into());

    let esc = |s: &str| s.replace('\'', "''");
    let opt_str = |v: Option<&str>| match v {
        Some(s) => format!("'{}'", esc(s)),
        None => "NULL".to_string(),
    };

    let sql = format!(
        "INSERT INTO T3_APP_LOG \
         (ts_unix, ts_fmt, level, category, source, hostname, device_serial, message, details) \
         VALUES ({}, '{}', '{}', '{}', {}, '{}', {}, '{}', {})",
        ts_unix,
        esc(&ts_fmt),
        esc(level),
        esc(category),
        opt_str(source),
        esc(&hostname_val),
        opt_str(device_serial),
        esc(message),
        opt_str(details),
    );

    let _ = db
        .execute(sea_orm::Statement::from_string(
            sea_orm::DatabaseBackend::Sqlite,
            sql,
        ))
        .await;

    // Keep only the latest 5000 rows
    let _ = db
        .execute(sea_orm::Statement::from_string(
            sea_orm::DatabaseBackend::Sqlite,
            "DELETE FROM T3_APP_LOG WHERE id NOT IN \
             (SELECT id FROM T3_APP_LOG ORDER BY ts_unix DESC LIMIT 5000)"
                .to_string(),
        ))
        .await;
}

/// Legacy shim: write with category=SYNC_CYCLE, source=ffi_sync
pub async fn write_sync_event(
    db: &sea_orm::DatabaseConnection,
    level: &str,
    device_serial: Option<&str>,
    message: &str,
) {
    write_app_log(db, level, "SYNC_CYCLE", Some("ffi_sync"), device_serial, message, None).await;
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

    ensure_app_log_table(&db).await;

    let limit = q.limit.min(200);
    let offset = q.page.saturating_mul(limit);

    let level_filter = match q.level.as_deref() {
        Some("error") => " AND level = 'error'",
        Some("warn")  => " AND level = 'warn'",
        Some("info")  => " AND level = 'info'",
        _ => "",
    };

    let cat_filter = match q.category.as_deref() {
        Some(c) if !c.is_empty() => format!(" AND category = '{}'", c.replace('\'', "''")),
        _ => String::new(),
    };

    let sql = format!(
        "SELECT id, ts_unix, ts_fmt, level, category, source, hostname, role, device_serial, message, details \
         FROM T3_APP_LOG WHERE 1=1{}{} \
         ORDER BY ts_unix DESC LIMIT {} OFFSET {}",
        level_filter, cat_filter, limit, offset
    );

    let count_sql = format!(
        "SELECT COUNT(*) AS cnt FROM T3_APP_LOG WHERE 1=1{}{}",
        level_filter, cat_filter
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

    let entries: Vec<AppLogEntry> = rows
        .into_iter()
        .map(|r| AppLogEntry {
            id:           r.try_get("", "id").unwrap_or(0),
            ts_unix:      r.try_get("", "ts_unix").unwrap_or(0),
            ts:           r.try_get("", "ts_fmt").unwrap_or_default(),
            level:        EventLevel::from_str(&r.try_get::<String>("", "level").unwrap_or_default()),
            category:     r.try_get("", "category").unwrap_or_else(|_| "SERVER_EVENT".into()),
            source:       r.try_get::<Option<String>>("", "source").ok().flatten(),
            hostname:     r.try_get::<Option<String>>("", "hostname").ok().flatten(),
            role:         r.try_get::<Option<String>>("", "role").ok().flatten(),
            device_serial:r.try_get::<Option<String>>("", "device_serial").ok().flatten(),
            message:      r.try_get("", "message").unwrap_or_default(),
            details:      r.try_get::<Option<String>>("", "details").ok().flatten(),
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
        ensure_app_log_table(&db).await;
        let level = body.level.as_ref().map(|l| l.as_str()).unwrap_or("info");
        let category = body.category.as_deref().unwrap_or("SYNC_CYCLE");
        write_app_log(
            &db,
            level,
            category,
            body.source.as_deref(),
            body.device_serial.as_deref(),
            &body.message,
            body.details.as_deref(),
        )
        .await;
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
