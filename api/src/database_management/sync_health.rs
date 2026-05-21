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
use chrono::{Datelike, Local, NaiveDateTime, TimeZone, Utc};
use sea_orm::*;
use serde::{Deserialize, Serialize};
use std::collections::{BTreeSet, HashMap};
use std::sync::OnceLock;
use std::time::{Duration, Instant};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::sync::RwLock;
use tracing::{debug, warn};

use crate::app_state::T3AppState;
use crate::constants::ACTIVITY_LOG_CATEGORY_DEFS;
use crate::error::Result;

// ============================================================================
// Sync Health Response
// ============================================================================

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SyncHealthResponse {
    /// PC role: "server" | "client" | "standalone"
    pub role: String,
    /// Whether [ServerDatabase] enabled=1 in INI
    pub center_db_enabled: bool,
    /// Whether the center DB runtime connection is alive
    pub center_db_connected: bool,
    /// Detailed center DB runtime state.
    pub center_db_status: String,
    /// Human-readable center DB status message.
    pub center_db_message: Option<String>,
    /// Whether MSSQL pool is active (direct write path)
    pub mssql_pool_active: bool,
    /// Backend configured for Shared DB mode.
    pub backend_type: String,
    /// Backend currently servicing device data at runtime.
    pub runtime_backend_type: String,
    /// Whether writes are currently blocked because center DB is unavailable.
    pub writes_blocked: bool,
    /// Center DB host from the active backend config.
    pub center_db_host: Option<String>,
    /// Center DB port from the active backend config.
    pub center_db_port: Option<i32>,
    /// Center DB database name from the active backend config.
    pub center_db_database_name: Option<String>,
    /// Whether schema initialization is a valid next action.
    pub can_init_schema: bool,
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

    /// Scope of /api/sync/event-log storage.
    /// Can be "local" or "hybrid" depending on center DB runtime state.
    pub event_log_scope: String,
    /// Human-readable note explaining event-log storage behavior.
    pub event_log_note: String,

    /// Whether FFI sampling is currently paused (center DB down)
    pub sampling_paused: bool,
    /// Human-readable reason for the pause, or null when active
    pub paused_reason: Option<String>,
    /// Current sync sampling interval in seconds.
    pub sync_interval_secs: u32,
}

#[derive(Clone)]
struct CachedSyncHealth {
    created_at: Instant,
    payload: SyncHealthResponse,
}

const SYNC_HEALTH_CACHE_TTL: Duration = Duration::from_secs(2);

fn sync_health_cache() -> &'static RwLock<Option<CachedSyncHealth>> {
    static CACHE: OnceLock<RwLock<Option<CachedSyncHealth>>> = OnceLock::new();
    CACHE.get_or_init(|| RwLock::new(None))
}

#[derive(Debug, Serialize, Default, Clone)]
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
    pub sink: Option<String>,
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

async fn get_device_db_conn(state: &T3AppState) -> Option<sea_orm::DatabaseConnection> {
    if let Some(arc) = &state.t3_device_conn {
        return Some(arc.lock().await.clone());
    }
    if let Some(arc) = &state.local_config_conn {
        return Some(arc.lock().await.clone());
    }
    None
}

async fn get_local_log_db_conn(state: &T3AppState) -> Option<sea_orm::DatabaseConnection> {
    if let Some(arc) = &state.local_config_conn {
        return Some(arc.lock().await.clone());
    }
    if let Some(arc) = &state.t3_device_conn {
        return Some(arc.lock().await.clone());
    }
    None
}

async fn resolve_db_info(
    state: &T3AppState,
    server_status: &crate::web_routing::ServerDbStatus,
) -> (u64, String, String, String) {
    // Shared DB mode: prefer MSSQL-reported size/path.
    if server_status.enabled {
        let host = server_status.host.clone().unwrap_or_else(|| "SQL Server".to_string());
        let db_name = server_status
            .database_name
            .clone()
            .unwrap_or_else(|| "(unknown-db)".to_string());

        if let Some(pool) = &state.mssql_pool {
            if let Ok(mut conn) = pool.get().await {
                // Total allocated DB size in bytes (sum of all files in current DB)
                let size_bytes = if let Ok(stream) = conn
                    .query(
                        "SELECT CAST(SUM(CAST(size AS BIGINT)) * 8192 AS BIGINT) AS total_bytes FROM sys.database_files",
                        &[],
                    )
                    .await
                {
                    stream
                        .into_row()
                        .await
                        .ok()
                        .flatten()
                        .and_then(|r| r.get::<i64, _>(0))
                        .unwrap_or(0)
                        .max(0) as u64
                } else {
                    0
                };

                // Try to get one physical file path for visibility.
                let physical_path = if let Ok(stream) = conn
                    .query(
                        "SELECT TOP 1 physical_name FROM sys.database_files ORDER BY file_id",
                        &[],
                    )
                    .await
                {
                    if let Some(row) = stream.into_row().await.ok().flatten() {
                        row.get::<&str, _>(0).map(|s| s.to_string())
                    } else {
                        None
                    }
                } else {
                    None
                };

                if let Some(path) = physical_path {
                    let folder = std::path::Path::new(&path)
                        .parent()
                        .map(|p| p.to_string_lossy().to_string())
                        .unwrap_or_else(|| format!("{} / {}", host, db_name));
                    return (size_bytes, format_bytes(size_bytes), folder, path);
                }

                // If no path was returned, fall back to host/db target text.
                return (
                    size_bytes,
                    if size_bytes > 0 {
                        format_bytes(size_bytes)
                    } else {
                        "N/A".to_string()
                    },
                    format!("{} / {}", host, db_name),
                    format!("{} / {}", host, db_name),
                );
            }
        }

        // Shared mode configured but no active pool/lookup failed.
        return (
            0,
            "N/A".to_string(),
            format!("{} / {}", host, db_name),
            format!("{} / {}", host, db_name),
        );
    }

    // Standalone mode: local SQLite size/path from runtime DB URL.
    let raw_url = crate::utils::T3_DEVICE_DATABASE_URL.clone();
    let rel_path = raw_url
        .strip_prefix("sqlite://")
        .unwrap_or("Database/webview_t3_device.db")
        .to_string();
    let db_path_abs = {
        let p = std::path::Path::new(&rel_path);
        if p.is_absolute() {
            p.to_path_buf()
        } else {
            std::env::current_dir().unwrap_or_default().join(p)
        }
    };

    let db_size_bytes = std::fs::metadata(&db_path_abs).map(|m| m.len()).unwrap_or(0);
    let db_size_human = format_bytes(db_size_bytes);
    let db_folder_path = db_path_abs
        .parent()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_default();
    let db_file_path = db_path_abs.to_string_lossy().to_string();
    (db_size_bytes, db_size_human, db_folder_path, db_file_path)
}

// ============================================================================
// GET /api/sync/health
// ============================================================================

async fn get_sync_health(State(state): State<T3AppState>) -> Result<Json<SyncHealthResponse>> {
    {
        let cache_guard = sync_health_cache().read().await;
        if let Some(cached) = cache_guard.as_ref() {
            if cached.created_at.elapsed() <= SYNC_HEALTH_CACHE_TTL {
                debug!(
                    cache_age_ms = cached.created_at.elapsed().as_millis() as u64,
                    "GET /api/sync/health cache hit"
                );
                return Ok(Json(cached.payload.clone()));
            }
        }
    }

    let response = build_sync_health_response(&state).await?;
    {
        let mut cache_guard = sync_health_cache().write().await;
        *cache_guard = Some(CachedSyncHealth {
            created_at: Instant::now(),
            payload: response.clone(),
        });
    }
    Ok(Json(response))
}

async fn build_sync_health_response(state: &T3AppState) -> Result<SyncHealthResponse> {
    let total_started = Instant::now();

    let resolve_status_started = Instant::now();
    let server_status = crate::web_routing::resolve_server_db_status(&state).await;
    let resolve_status_elapsed_ms = resolve_status_started.elapsed().as_millis() as u64;
    let hostname = server_status.hostname.clone();

    let role = if !server_status.enabled {
        "standalone".to_string()
    } else {
        server_status.role.clone()
    };

    // Shared DB mode is always modeled as MSSQL from the dashboard perspective,
    // even when connectivity/schema state is unhealthy.
    let backend_type = if server_status.enabled {
        "mssql".to_string()
    } else {
        server_status.configured_backend.clone()
    };

    let runtime_backend_type = if server_status.enabled {
        "mssql".to_string()
    } else {
        server_status.runtime_backend.clone()
    };

    let writes_blocked = server_status.writes_blocked;

    let resolve_db_info_started = Instant::now();
    let (db_size_bytes, db_size_human, db_folder_path, db_file_path) =
        resolve_db_info(&state, &server_status).await;
    let resolve_db_info_elapsed_ms = resolve_db_info_started.elapsed().as_millis() as u64;

    // Query DATA_SYNC_METADATA for last sync + records today
    let mut last_sync_time: Option<String> = None;
    let mut last_sync_ago: Option<String> = None;
    let mut records_today = RecordsToday::default();
    let mut devices_synced_today: i64 = 0;

    let metadata_started = Instant::now();
    if let Some(db) = get_device_db_conn(&state).await {
        let backend = db.get_database_backend();
        // -- Last sync time (most recent LOGGING_DATA_CYCLE or any FFI record)
        let raw_last = db
            .query_one(sea_orm::Statement::from_string(
                backend,
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
                backend,
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
                backend,
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
    let metadata_elapsed_ms = metadata_started.elapsed().as_millis() as u64;

    // In center DB mode with blocked writes, do not surface historical local
    // metadata as "today" counts. Keep dashboard counts explicitly at zero.
    if server_status.enabled && writes_blocked {
        records_today = RecordsToday::default();
        devices_synced_today = 0;
    }

    let sync_interval_secs = if let Some(db) = get_local_log_db_conn(&state).await {
        crate::database_management::config_api::get_sync_interval_secs(&db)
            .await
            .unwrap_or(300)
    } else {
        300
    };

    let total_elapsed_ms = total_started.elapsed().as_millis() as u64;
    if total_elapsed_ms > 1500 {
        warn!(
            elapsed_ms = total_elapsed_ms,
            resolve_status_ms = resolve_status_elapsed_ms,
            resolve_db_info_ms = resolve_db_info_elapsed_ms,
            metadata_ms = metadata_elapsed_ms,
            center_db_enabled = server_status.enabled,
            center_db_status = %server_status.center_db_status,
            "GET /api/sync/health slow response"
        );
    } else {
        debug!(
            elapsed_ms = total_elapsed_ms,
            resolve_status_ms = resolve_status_elapsed_ms,
            resolve_db_info_ms = resolve_db_info_elapsed_ms,
            metadata_ms = metadata_elapsed_ms,
            center_db_enabled = server_status.enabled,
            center_db_status = %server_status.center_db_status,
            "GET /api/sync/health completed"
        );
    }

    let (event_log_scope, event_log_note) = if server_status.mssql_pool_active {
        (
            "hybrid".to_string(),
            "Activity Log can include local SQLite rows and center MSSQL rows.".to_string(),
        )
    } else {
        (
            "local".to_string(),
            "Activity Log entries are stored locally on this PC. DB sink falls back to local SQLite when center DB is unavailable.".to_string(),
        )
    };

    let response = SyncHealthResponse {
        role,
        center_db_enabled: server_status.enabled,
        center_db_connected: server_status.server_connected,
        center_db_status: server_status.center_db_status,
        center_db_message: server_status.center_db_message,
        mssql_pool_active: server_status.mssql_pool_active,
        backend_type,
        runtime_backend_type,
        writes_blocked,
        center_db_host: server_status.host,
        center_db_port: server_status.port,
        center_db_database_name: server_status.database_name,
        can_init_schema: server_status.can_init_schema,
        hostname,
        last_sync_time,
        last_sync_ago,
        records_today,
        db_size_bytes,
        db_size_human,
        db_folder_path,
        db_file_path,
        devices_synced_today,
        event_log_scope,
        event_log_note,
        sampling_paused: crate::app_state::is_sampling_paused(),
        paused_reason: crate::app_state::get_pause_reason(),
        sync_interval_secs,
    };

    Ok(response)
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

fn canonical_category(category: &str) -> String {
    crate::logging::policy::canonical_category(category)
}

fn category_filter_variants(category: &str) -> Vec<String> {
    let upper = category.trim().to_ascii_uppercase();
    let canonical = canonical_category(&upper);
    match canonical.as_str() {
        "CONFIG" => vec!["CONFIG".to_string(), "DB_CONFIG".to_string()],
        "STARTUP" => vec![
            "STARTUP".to_string(),
            "SERVER_EVENT".to_string(),
            "T3_WEBVIEW_INITIALIZE".to_string(),
        ],
        "MAINTENANCE" => vec![
            "MAINTENANCE".to_string(),
            "T3_DATABASE_MIGRATION".to_string(),
            "T3_PARTITIONMONITOR".to_string(),
            "T3_DATABASESIZEMONITOR".to_string(),
            "T3_WEBVIEW_DATABASE".to_string(),
        ],
        "POLL" => vec![
            "POLL".to_string(),
            "SYNC_CYCLE".to_string(),
            "SAMPLING".to_string(),
            "FFI_POLL".to_string(),
            "T3_WEBVIEW_POLL".to_string(),
        ],
        "DEVICE" => vec![
            "DEVICE".to_string(),
            "DEVICE_SYNC".to_string(),
            "T3_WEBVIEW_DEVICE".to_string(),
        ],
        "TRENDLOG" => vec![
            "TRENDLOG".to_string(),
            "TREND_LOG".to_string(),
            "TD_READ".to_string(),
            "TD_WRITE".to_string(),
            "TD_INPUTS".to_string(),
            "TD_FFI".to_string(),
            "TD_SYNC".to_string(),
            "T3_WEBVIEW_TRENDLOG".to_string(),
            "T3_WEBVIEW_TRL_FFI".to_string(),
            "T3_PARTITIONQUERY".to_string(),
        ],
        "API_REQ" => vec!["API_REQ".to_string(), "T3_WEBVIEW_API".to_string()],
        "WEBSOCKET" => vec!["WEBSOCKET".to_string(), "T3_WEBVIEW_SOCKET".to_string()],
        "FFI_CALL" => vec![
            "FFI_CALL".to_string(),
            "T3_WEBVIEW_FFI".to_string(),
            "T3_FFI".to_string(),
        ],
        "MESSAGE_ACTION" => vec![
            "MESSAGE_ACTION".to_string(),
            "T3_WEBVIEW_MSGACTION".to_string(),
        ],
        _ => vec![canonical],
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct LogValidationAliasItem {
    raw_category: String,
    canonical_category: String,
    count: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct LogValidationUnknownItem {
    raw_category: String,
    count: i64,
}

async fn get_log_validation(
    State(state): State<T3AppState>,
) -> Result<Json<serde_json::Value>> {
    let db = match get_local_log_db_conn(&state).await {
        Some(d) => d,
        None => {
            return Ok(Json(serde_json::json!({
                "ok": false,
                "error": "DB unavailable"
            })))
        }
    };

    ensure_app_log_table(&db).await;

    let canonical_set: BTreeSet<String> = default_log_settings()
        .into_iter()
        .map(|cfg| cfg.category)
        .collect();

    let rows = db
        .query_all(sea_orm::Statement::from_string(
            sea_orm::DatabaseBackend::Sqlite,
            "SELECT category, COUNT(*) AS cnt FROM T3_APP_LOG GROUP BY category ORDER BY cnt DESC"
                .to_string(),
        ))
        .await
        .unwrap_or_default();

    let mut alias_categories: Vec<LogValidationAliasItem> = Vec::new();
    let mut unknown_categories: Vec<LogValidationUnknownItem> = Vec::new();

    for row in rows {
        let raw_category = row.try_get::<String>("", "category").unwrap_or_default();
        let count = row.try_get::<i64>("", "cnt").unwrap_or(0);
        if raw_category.is_empty() {
            continue;
        }

        let canonical = canonical_category(&raw_category);
        let raw_upper = raw_category.trim().to_ascii_uppercase();

        if raw_upper != canonical {
            alias_categories.push(LogValidationAliasItem {
                raw_category: raw_category.clone(),
                canonical_category: canonical.clone(),
                count,
            });
        }

        if !canonical_set.contains(&canonical) {
            unknown_categories.push(LogValidationUnknownItem {
                raw_category,
                count,
            });
        }
    }

    let total_rows = db
        .query_one(sea_orm::Statement::from_string(
            sea_orm::DatabaseBackend::Sqlite,
            "SELECT COUNT(*) AS cnt FROM T3_APP_LOG".to_string(),
        ))
        .await
        .ok()
        .flatten()
        .and_then(|r| r.try_get::<i64>("", "cnt").ok())
        .unwrap_or(0);

    let mojibake_rows = db
        .query_one(sea_orm::Statement::from_string(
            sea_orm::DatabaseBackend::Sqlite,
            "SELECT COUNT(*) AS cnt FROM T3_APP_LOG WHERE message LIKE '%鈥%' OR details LIKE '%鈥%' OR message LIKE '%�%' OR details LIKE '%�%'".to_string(),
        ))
        .await
        .ok()
        .flatten()
        .and_then(|r| r.try_get::<i64>("", "cnt").ok())
        .unwrap_or(0);

    let mojibake_samples = db
        .query_all(sea_orm::Statement::from_string(
            sea_orm::DatabaseBackend::Sqlite,
            "SELECT id, category, message FROM T3_APP_LOG WHERE message LIKE '%鈥%' OR details LIKE '%鈥%' OR message LIKE '%�%' OR details LIKE '%�%' ORDER BY id DESC LIMIT 5".to_string(),
        ))
        .await
        .unwrap_or_default()
        .into_iter()
        .map(|r| {
            serde_json::json!({
                "id": r.try_get::<i64>("", "id").unwrap_or(0),
                "category": r.try_get::<String>("", "category").unwrap_or_default(),
                "message": r.try_get::<String>("", "message").unwrap_or_default(),
            })
        })
        .collect::<Vec<_>>();

    Ok(Json(serde_json::json!({
        "ok": true,
        "totalRows": total_rows,
        "canonicalCategoryCount": canonical_set.len(),
        "canonicalCategories": canonical_set.into_iter().collect::<Vec<_>>(),
        "aliasCategories": alias_categories,
        "unknownCategories": unknown_categories,
        "mojibakeRows": mojibake_rows,
        "mojibakeSamples": mojibake_samples,
    })))
}

fn sqlite_category_filter_sql(cat_filter: Option<&str>) -> String {
    match cat_filter {
        Some(c) if !c.is_empty() => {
            let variants = category_filter_variants(c);
            let quoted = variants
                .iter()
                .map(|v| format!("'{}'", v.replace('\'', "''")))
                .collect::<Vec<_>>()
                .join(", ");
            format!(" AND category IN ({})", quoted)
        }
        _ => String::new(),
    }
}

fn parse_bool_config(v: &str) -> bool {
    matches!(v.trim().to_ascii_lowercase().as_str(), "1" | "true" | "yes" | "on")
}

/// Write one entry to T3_APP_LOG.
///
/// Routing:
///   • High-volume sync categories (SYNC_CYCLE, SAMPLING, …)
///       – MSSQL pool active → write to MSSQL only (fire-and-forget).
///       – MSSQL pool down   → fallback to local SQLite so the Activity Log
///                             still shows "MSSQL unavailable" context.
///   • All other categories → local SQLite always.
///
/// Best-effort — errors are swallowed to never affect the calling operation.
/// Legacy shim: write with category=POLL, source=ffi_sync
pub async fn write_sync_event(
    db: &sea_orm::DatabaseConnection,
    level: &str,
    device_serial: Option<&str>,
    message: &str,
) {
    crate::logging::service::emit_app_log(
        db,
        level,
        "POLL",
        Some("ffi_sync"),
        device_serial,
        message,
        None,
    )
    .await;
}

// ============================================================================
// GET /api/sync/event-log
// ============================================================================

/// Convert a serde_json::Value row (from MSSQL or SQLite raw query) into AppLogEntry.
fn json_to_log_entry(v: &serde_json::Value) -> AppLogEntry {
    AppLogEntry {
        id:            v["id"].as_i64().unwrap_or(0),
        ts_unix:       v["ts_unix"].as_i64().unwrap_or(0),
        ts:            v["ts_fmt"].as_str().unwrap_or("").to_string(),
        level:         EventLevel::from_str(v["level"].as_str().unwrap_or("info")),
        category:      v["category"].as_str().unwrap_or("SERVER_EVENT").to_string(),
        sink:          v["sink"].as_str().map(|s| s.to_string()),
        source:        v["source"].as_str().map(|s| s.to_string()),
        hostname:      v["hostname"].as_str().map(|s| s.to_string()),
        role:          v["role"].as_str().map(|s| s.to_string()),
        device_serial: v["device_serial"].as_str().map(|s| s.to_string()),
        message:       v["message"].as_str().unwrap_or("").to_string(),
        details:       v["details"].as_str().map(|s| s.to_string()),
    }
}

/// Read rows from local SQLite T3_APP_LOG as serde_json::Value, suitable for merging.
/// Fetches at most `fetch_count` rows, most-recent-first.
async fn query_sqlite_log_raw(
    db: &sea_orm::DatabaseConnection,
    level_filter: Option<&str>,
    cat_filter: Option<&str>,
    fetch_count: u32,
) -> Vec<serde_json::Value> {
    let level_sql = match level_filter {
        Some("error") => " AND level = 'error'",
        Some("warn")  => " AND level = 'warn'",
        Some("info")  => " AND level = 'info'",
        Some("debug") => " AND level = 'debug'",
        _ => "",
    };
    let cat_sql = sqlite_category_filter_sql(cat_filter);
    let sql = format!(
        "SELECT id, ts_unix, ts_fmt, level, category, source, hostname, role, \
                device_serial, message, details \
         FROM T3_APP_LOG WHERE 1=1{}{} \
         ORDER BY ts_unix DESC LIMIT {}",
        level_sql, cat_sql, fetch_count
    );

    let rows = db
        .query_all(sea_orm::Statement::from_string(
            sea_orm::DatabaseBackend::Sqlite,
            sql,
        ))
        .await
        .unwrap_or_default();

    rows.into_iter()
        .map(|r| {
            serde_json::json!({
                "id":            r.try_get::<i64>("", "id").unwrap_or(0),
                "ts_unix":       r.try_get::<i64>("", "ts_unix").unwrap_or(0),
                "ts_fmt":        r.try_get::<String>("", "ts_fmt").unwrap_or_default(),
                "level":         r.try_get::<String>("", "level").unwrap_or_else(|_| "info".into()),
                "category":      r.try_get::<String>("", "category").unwrap_or_else(|_| "SERVER_EVENT".into()),
                "sink":          "SQLITE",
                "source":        r.try_get::<Option<String>>("", "source").ok().flatten(),
                "hostname":      r.try_get::<Option<String>>("", "hostname").ok().flatten(),
                "role":          r.try_get::<Option<String>>("", "role").ok().flatten(),
                "device_serial": r.try_get::<Option<String>>("", "device_serial").ok().flatten(),
                "message":       r.try_get::<String>("", "message").unwrap_or_default(),
                "details":       r.try_get::<Option<String>>("", "details").ok().flatten(),
            })
        })
        .collect()
}

async fn count_sqlite_log_raw(
    db: &sea_orm::DatabaseConnection,
    level_filter: Option<&str>,
    cat_filter: Option<&str>,
) -> i64 {
    let level_sql = match level_filter {
        Some("error") => " AND level = 'error'",
        Some("warn") => " AND level = 'warn'",
        Some("info") => " AND level = 'info'",
        Some("debug") => " AND level = 'debug'",
        _ => "",
    };
    let cat_sql = sqlite_category_filter_sql(cat_filter);

    let count_sql = format!(
        "SELECT COUNT(*) AS cnt FROM T3_APP_LOG WHERE 1=1{}{}",
        level_sql, cat_sql
    );

    db.query_one(sea_orm::Statement::from_string(
        sea_orm::DatabaseBackend::Sqlite,
        count_sql,
    ))
    .await
    .ok()
    .flatten()
    .and_then(|r| r.try_get::<i64>("", "cnt").ok())
    .unwrap_or(0)
}

async fn query_sqlite_log_category_counts(
    db: &sea_orm::DatabaseConnection,
    level_filter: Option<&str>,
    cat_filter: Option<&str>,
) -> HashMap<String, i64> {
    let level_sql = match level_filter {
        Some("error") => " AND level = 'error'",
        Some("warn")  => " AND level = 'warn'",
        Some("info")  => " AND level = 'info'",
        Some("debug") => " AND level = 'debug'",
        _ => "",
    };
    let cat_sql = sqlite_category_filter_sql(cat_filter);

    let sql = format!(
        "SELECT category, COUNT(*) AS cnt FROM T3_APP_LOG WHERE 1=1{}{} GROUP BY category",
        level_sql, cat_sql
    );

    let rows = db
        .query_all(sea_orm::Statement::from_string(
            sea_orm::DatabaseBackend::Sqlite,
            sql,
        ))
        .await
        .unwrap_or_default();

    let mut counts = HashMap::new();
    for row in rows {
        let category = row.try_get::<String>("", "category").unwrap_or_default();
        let count = row.try_get::<i64>("", "cnt").unwrap_or(0);
        if !category.is_empty() {
            let canonical = canonical_category(&category);
            *counts.entry(canonical).or_insert(0) += count;
        }
    }
    counts
}

async fn query_sqlite_log_level_counts(
    db: &sea_orm::DatabaseConnection,
    cat_filter: Option<&str>,
) -> HashMap<String, i64> {
    let cat_sql = sqlite_category_filter_sql(cat_filter);
    let sql = format!(
        "SELECT level, COUNT(*) AS cnt FROM T3_APP_LOG WHERE 1=1{} GROUP BY level",
        cat_sql
    );
    let rows = db
        .query_all(sea_orm::Statement::from_string(
            sea_orm::DatabaseBackend::Sqlite,
            sql,
        ))
        .await
        .unwrap_or_default();
    let mut counts = HashMap::new();
    for row in rows {
        let level = row.try_get::<String>("", "level").unwrap_or_default().to_lowercase();
        let count = row.try_get::<i64>("", "cnt").unwrap_or(0);
        if !level.is_empty() {
            *counts.entry(level).or_insert(0) += count;
        }
    }
    counts
}

async fn query_sqlite_log_categories(db: &sea_orm::DatabaseConnection) -> Vec<String> {
    let sql = "SELECT DISTINCT category FROM T3_APP_LOG WHERE category IS NOT NULL AND category <> '' ORDER BY category ASC";
    let rows = db
        .query_all(sea_orm::Statement::from_string(
            sea_orm::DatabaseBackend::Sqlite,
            sql.to_string(),
        ))
        .await
        .unwrap_or_default();

    rows.into_iter()
        .filter_map(|r| r.try_get::<String>("", "category").ok())
        .collect()
}

async fn get_event_log(
    State(state): State<T3AppState>,
    Query(q): Query<EventLogQuery>,
) -> Result<Json<serde_json::Value>> {
    let limit = q.limit.min(5000) as usize;
    let offset = (q.page as usize).saturating_mul(limit);
    // Fetch enough rows from each source to satisfy the requested page.
    let fetch_count = (offset + limit) as u32;

    let level_filter = q
        .level
        .as_deref()
        .map(|s| s.trim().to_ascii_lowercase())
        .and_then(|s| match s.as_str() {
            "error" | "err" => Some("error"),
            "warn" | "warning" => Some("warn"),
            "info" => Some("info"),
            "debug" => Some("debug"),
            _ => None,
        });
    let cat_filter   = q.category.as_deref().filter(|s| !s.is_empty());

    // ── When MSSQL pool is active: merge rows from both stores ────────────────
    // High-volume sync logs (SYNC_CYCLE, SAMPLING, …) live in MSSQL.
    // System/config logs (DB_CONFIG, SERVER_EVENT, …) live in local SQLite.
    // The two sets are disjoint, so no deduplication is needed.
    if let Some(pool) = crate::server_db_writer::get_server_mssql_pool() {
        // Fetch from MSSQL
        let mssql_rows = crate::database_management::mssql_queries::query_app_log(
            pool,
            level_filter,
            cat_filter,
            fetch_count,
        )
        .await
        .unwrap_or_default();

        let mssql_total = crate::database_management::mssql_queries::count_app_log(
            pool,
            level_filter,
            cat_filter,
        )
        .await
        .unwrap_or(0);

        let mssql_categories = crate::database_management::mssql_queries::query_app_log_categories(pool)
            .await
            .unwrap_or_default();

        let mssql_category_counts = crate::database_management::mssql_queries::query_app_log_category_counts(
            pool,
            level_filter,
            cat_filter,
        )
        .await
        .unwrap_or_default();

        let mssql_level_counts = crate::database_management::mssql_queries::query_app_log_level_counts(
            pool,
            cat_filter,
        )
        .await
        .unwrap_or_default();

        // Fetch from local SQLite
        let (sqlite_rows, sqlite_total, sqlite_categories, sqlite_category_counts, sqlite_level_counts) = if let Some(db) = get_local_log_db_conn(&state).await {
            ensure_app_log_table(&db).await;
            (
                query_sqlite_log_raw(&db, level_filter, cat_filter, fetch_count).await,
                count_sqlite_log_raw(&db, level_filter, cat_filter).await,
                query_sqlite_log_categories(&db).await,
                query_sqlite_log_category_counts(&db, level_filter, cat_filter).await,
                query_sqlite_log_level_counts(&db, cat_filter).await,
            )
        } else {
            (Vec::new(), 0, Vec::new(), HashMap::new(), HashMap::new())
        };

        // Merge and sort descending by ts_unix
        let mut all_rows: Vec<(i64, serde_json::Value)> = mssql_rows
            .into_iter()
            .chain(sqlite_rows.into_iter())
            .map(|v| (v["ts_unix"].as_i64().unwrap_or(0), v))
            .collect();
        all_rows.sort_unstable_by(|a, b| b.0.cmp(&a.0));

        let total = mssql_total + sqlite_total;

        let mut category_set: BTreeSet<String> = BTreeSet::new();
        category_set.extend(default_log_settings().into_iter().map(|c| c.category));
        category_set.extend(sqlite_categories.into_iter().map(|c| canonical_category(&c)));
        category_set.extend(mssql_categories.into_iter().map(|c| canonical_category(&c)));
        let categories: Vec<String> = category_set.into_iter().collect();

        let mut category_counts: HashMap<String, i64> = HashMap::new();
        for (cat, cnt) in sqlite_category_counts {
            *category_counts.entry(cat).or_insert(0) += cnt;
        }
        for (cat, cnt) in mssql_category_counts {
            let canonical = canonical_category(&cat);
            *category_counts.entry(canonical).or_insert(0) += cnt;
        }
        for cat in &categories {
            category_counts.entry(cat.clone()).or_insert(0);
        }

        let mut level_counts: HashMap<String, i64> = HashMap::new();
        for (lvl, cnt) in sqlite_level_counts {
            *level_counts.entry(lvl).or_insert(0) += cnt;
        }
        for (lvl, cnt) in mssql_level_counts {
            *level_counts.entry(lvl).or_insert(0) += cnt;
        }

        let entries: Vec<AppLogEntry> = all_rows
            .into_iter()
            .skip(offset)
            .take(limit)
            .map(|(_, v)| json_to_log_entry(&v))
            .collect();

        return Ok(Json(serde_json::json!({
            "entries": entries,
            "total":   total,
            "categories": categories,
            "categoryCounts": category_counts,
            "levelCounts": level_counts,
            "page":    q.page,
            "limit":   limit,
        })));
    }

    // ── Local SQLite only (MSSQL not active) ─────────────────────────────────
    let db = match get_local_log_db_conn(&state).await {
        Some(d) => d,
        None => {
            return Ok(Json(serde_json::json!({ "entries": [], "total": 0 })));
        }
    };

    ensure_app_log_table(&db).await;

    let level_sql = match level_filter {
        Some("error") => " AND level = 'error'",
        Some("warn")  => " AND level = 'warn'",
        Some("info")  => " AND level = 'info'",
        Some("debug") => " AND level = 'debug'",
        _ => "",
    };
    let cat_sql = sqlite_category_filter_sql(cat_filter);

    let sql = format!(
        "SELECT id, ts_unix, ts_fmt, level, category, source, hostname, role, device_serial, message, details \
         FROM T3_APP_LOG WHERE 1=1{}{} \
         ORDER BY ts_unix DESC LIMIT {} OFFSET {}",
        level_sql, cat_sql, limit, offset
    );

    let rows = db
        .query_all(sea_orm::Statement::from_string(
            sea_orm::DatabaseBackend::Sqlite,
            sql,
        ))
        .await
        .unwrap_or_default();

    let total = count_sqlite_log_raw(&db, level_filter, cat_filter).await;
    let level_counts = query_sqlite_log_level_counts(&db, cat_filter).await;
    let mut category_counts = query_sqlite_log_category_counts(&db, level_filter, cat_filter).await;
    let mut category_set: BTreeSet<String> = BTreeSet::new();
    category_set.extend(default_log_settings().into_iter().map(|c| c.category));
    category_set.extend(
        query_sqlite_log_categories(&db)
            .await
            .into_iter()
            .map(|c| canonical_category(&c)),
    );
    let categories: Vec<String> = category_set.into_iter().collect();
    for cat in &categories {
        category_counts.entry(cat.clone()).or_insert(0);
    }

    let entries: Vec<AppLogEntry> = rows
        .into_iter()
        .map(|r| AppLogEntry {
            id:           r.try_get("", "id").unwrap_or(0),
            ts_unix:      r.try_get("", "ts_unix").unwrap_or(0),
            ts:           r.try_get("", "ts_fmt").unwrap_or_default(),
            level:        EventLevel::from_str(&r.try_get::<String>("", "level").unwrap_or_default()),
            category:     r.try_get("", "category").unwrap_or_else(|_| "SERVER_EVENT".into()),
            sink:         Some("SQLITE".to_string()),
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
        "categories": categories,
        "categoryCounts": category_counts,
        "levelCounts": level_counts,
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
    if let Some(db) = get_local_log_db_conn(&state).await {
        ensure_app_log_table(&db).await;
        let level = body.level.as_ref().map(|l| l.as_str()).unwrap_or("info");
        let category = body.category.as_deref().unwrap_or("POLL");
        crate::logging::service::emit_app_log(
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
// GET /api/sync/health/ping — quick roundtrip through the active pool
// ============================================================================

async fn ping_center_db() -> impl axum::response::IntoResponse {
    use axum::http::StatusCode;

    let pool = match crate::server_db_writer::get_server_mssql_pool() {
        Some(p) => p,
        None => {
            return (
                StatusCode::SERVICE_UNAVAILABLE,
                axum::Json(serde_json::json!({
                    "ok": false,
                    "error": "MSSQL pool not active"
                })),
            );
        }
    };

    let t0 = std::time::Instant::now();
    let result = (|| async {
        let mut conn = pool.get().await.map_err(|e| e.to_string())?;
        conn.simple_query("SELECT 1 AS alive")
            .await
            .map_err(|e| e.to_string())?
            .into_row()
            .await
            .map_err(|e| e.to_string())?;
        Ok::<(), String>(())
    })()
    .await;

    let latency_ms = t0.elapsed().as_millis() as u64;

    match result {
        Ok(_) => (
            StatusCode::OK,
            axum::Json(serde_json::json!({
                "ok": true,
                "latency_ms": latency_ms
            })),
        ),
        Err(e) => (
            StatusCode::OK,
            axum::Json(serde_json::json!({
                "ok": false,
                "error": e,
                "latency_ms": latency_ms
            })),
        ),
    }
}

// ============================================================================
// GET /api/logs/settings  |  PUT /api/logs/settings
// Read/write per-category log config from APPLICATION_CONFIG
// Keys: log.category.<CATEGORY>.enabled / detail_mode / min_level / sink_db / sink_file
// ============================================================================

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LogCategoryConfig {
    pub category: String,
    pub display_name: String,
    pub description: String,
    pub group: String,         // "system" | "operational" | "debug"
    pub enabled: bool,
    pub detail_mode: String,   // "SUMMARY" | "FULL"
    pub min_level: String,     // "INFO" | "WARN" | "ERROR" | "DEBUG"
    pub target: String,        // "sqlite" | "mssql" | "both"
    pub sink_db: bool,
    pub sink_file: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateLogSettingsRequest {
    pub settings: Vec<UpdateLogCategoryConfig>,
}

#[derive(Debug, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct UpdateLogCategoryConfig {
    pub category: String,
    pub enabled: bool,
    pub detail_mode: String,
    pub min_level: String,
    #[serde(default)]
    pub sink_db: Option<bool>,
    #[serde(default)]
    pub sink_file: Option<bool>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApplyLogProfileRequest {
    pub profile: String,
    #[serde(default)]
    pub ttl_sec: Option<u32>,
}

fn baseline_profile_settings() -> Vec<UpdateLogCategoryConfig> {
    default_log_settings()
        .into_iter()
        .map(|cfg| UpdateLogCategoryConfig {
            category: cfg.category,
            enabled: cfg.enabled,
            detail_mode: cfg.detail_mode,
            min_level: cfg.min_level,
            sink_db: Some(cfg.sink_db),
            sink_file: Some(cfg.sink_file),
        })
        .collect()
}

fn profile_settings(profile: &str) -> Option<Vec<UpdateLogCategoryConfig>> {
    let mut settings = baseline_profile_settings();
    let index_by_category: HashMap<String, usize> = settings
        .iter()
        .enumerate()
        .map(|(idx, cfg)| (canonical_category(&cfg.category), idx))
        .collect();

    let mut set = |
        category: &str,
        enabled: bool,
        detail_mode: &str,
        min_level: &str,
        sink_db: bool,
        sink_file: bool,
    | {
        let canonical = canonical_category(category);
        if let Some(idx) = index_by_category.get(&canonical) {
            if let Some(cfg) = settings.get_mut(*idx) {
                cfg.enabled = enabled;
                cfg.detail_mode = detail_mode.to_string();
                cfg.min_level = min_level.to_string();
                cfg.sink_db = Some(sink_db);
                cfg.sink_file = Some(sink_file);
            }
        }
    };

    match profile.trim().to_ascii_lowercase().as_str() {
        "baseline" => {}
        "trendlog-trace" => {
            set("MESSAGE_ACTION", true, "FULL", "DEBUG", false, true);
            set("TRENDLOG", true, "FULL", "INFO", true, true);
            set("DEVICE", true, "FULL", "INFO", true, true);
            set("FFI_CALL", true, "FULL", "DEBUG", false, true);
        }
        "ffi-stale-trace" => {
            set("FFI_CALL", true, "FULL", "DEBUG", false, true);
            set("DEVICE", true, "FULL", "INFO", true, true);
            set("POLL", true, "FULL", "INFO", true, true);
            set("MESSAGE_ACTION", true, "FULL", "DEBUG", false, true);
        }
        "ui-trace" => {
            set("MESSAGE_ACTION", true, "FULL", "DEBUG", false, true);
            set("API_REQ", true, "SUMMARY", "INFO", false, true);
            set("WEBSOCKET", true, "SUMMARY", "INFO", false, true);
        }
        _ => return None,
    }

    Some(settings)
}

async fn upsert_application_config(
    db: &DatabaseConnection,
    key: &str,
    value: &str,
) -> Result<()> {
    let key_sql = key.replace('\'', "''");
    let val_sql = value.replace('\'', "''");
    let ts_sql = chrono::Utc::now().naive_utc().to_string().replace('\'', "''");

    let update_sql = format!(
        "UPDATE APPLICATION_CONFIG \
         SET config_value = '{val}', updated_at = '{ts}' \
         WHERE config_key = '{key}'",
        key = key_sql,
        val = val_sql,
        ts = ts_sql,
    );

    let update_result = db
        .execute(sea_orm::Statement::from_string(
            sea_orm::DatabaseBackend::Sqlite,
            update_sql,
        ))
        .await
        .map_err(|e| {
            crate::error::Error::DbError(format!(
                "Failed to update config '{}': {}",
                key, e
            ))
        })?;

    if update_result.rows_affected() == 0 {
        let insert_sql = format!(
            "INSERT INTO APPLICATION_CONFIG (config_key, config_value, updated_at) \
             VALUES ('{key}', '{val}', '{ts}')",
            key = key_sql,
            val = val_sql,
            ts = ts_sql,
        );

        db.execute(sea_orm::Statement::from_string(
            sea_orm::DatabaseBackend::Sqlite,
            insert_sql,
        ))
        .await
        .map_err(|e| {
            crate::error::Error::DbError(format!(
                "Failed to insert config '{}': {}",
                key, e
            ))
        })?;
    }

    Ok(())
}

async fn load_application_config(
    db: &DatabaseConnection,
    key: &str,
) -> Option<String> {
    let key_sql = key.replace('\'', "''");
    let sql = format!(
        "SELECT config_value FROM APPLICATION_CONFIG WHERE config_key = '{}' LIMIT 1",
        key_sql
    );

    db.query_one(sea_orm::Statement::from_string(
        sea_orm::DatabaseBackend::Sqlite,
        sql,
    ))
    .await
    .ok()
    .flatten()
    .and_then(|row| row.try_get::<String>("", "config_value").ok())
}

async fn maybe_auto_revert_profile_if_expired(
    db: &DatabaseConnection,
) -> Result<bool> {
    let active_profile = load_application_config(db, "log.profile.active")
        .await
        .unwrap_or_else(|| "baseline".to_string())
        .trim()
        .to_ascii_lowercase();

    if active_profile == "baseline" {
        return Ok(false);
    }

    let expires_at = load_application_config(db, "log.profile.expires_at")
        .await
        .unwrap_or_default();
    if expires_at.trim().is_empty() {
        return Ok(false);
    }

    let expires_at_dt = match chrono::DateTime::parse_from_rfc3339(expires_at.trim()) {
        Ok(v) => v.with_timezone(&chrono::Utc),
        Err(_) => return Ok(false),
    };

    if chrono::Utc::now() < expires_at_dt {
        return Ok(false);
    }

    let baseline = baseline_profile_settings();
    apply_log_settings_to_db(db, &baseline).await?;
    upsert_application_config(db, "log.profile.active", "baseline").await?;
    upsert_application_config(db, "log.profile.applied_at", &chrono::Utc::now().to_rfc3339()).await?;
    upsert_application_config(db, "log.profile.ttl_sec", "0").await?;
    upsert_application_config(db, "log.profile.expires_at", "").await?;

    Ok(true)
}

async fn apply_log_settings_to_db(
    db: &DatabaseConnection,
    settings: &[UpdateLogCategoryConfig],
) -> Result<()> {
    let default_sink_by_category: HashMap<String, (bool, bool)> = default_log_settings()
        .into_iter()
        .map(|cfg| (cfg.category, (cfg.sink_db, cfg.sink_file)))
        .collect();

    for cfg in settings {
        let canonical_cat = canonical_category(&cfg.category);
        let prefix = format!("log.category.{}", canonical_cat);

        let (default_sink_db, default_sink_file) = default_sink_by_category
            .get(&canonical_cat)
            .copied()
            .unwrap_or((true, false));
        let sink_db = cfg.sink_db.unwrap_or(default_sink_db);
        let sink_file = cfg.sink_file.unwrap_or(default_sink_file);

        let updates = [
            (format!("{}.enabled", prefix), cfg.enabled.to_string()),
            (format!("{}.detail_mode", prefix), cfg.detail_mode.clone()),
            (format!("{}.min_level", prefix), cfg.min_level.clone()),
            (format!("{}.sink_db", prefix), sink_db.to_string()),
            (format!("{}.sink_file", prefix), sink_file.to_string()),
        ];

        for (key, value) in updates {
            upsert_application_config(db, &key, &value).await?;
        }
    }

    Ok(())
}

fn default_log_settings() -> Vec<LogCategoryConfig> {
    ACTIVITY_LOG_CATEGORY_DEFS
        .iter()
        .map(|def| LogCategoryConfig {
            category: def.category.into(),
            display_name: def.display_name.into(),
            description: def.description.into(),
            group: def.group.into(),
            enabled: def.enabled,
            detail_mode: def.detail_mode.into(),
            min_level: def.min_level.into(),
            target: def.target.into(),
            sink_db: def.sink_db,
            sink_file: def.sink_file,
        })
        .collect()
}

async fn get_log_settings(
    State(state): State<T3AppState>,
) -> Result<Json<Vec<LogCategoryConfig>>> {
    let db = match get_local_log_db_conn(&state).await {
        Some(d) => d,
        None => return Ok(Json(default_log_settings())),
    };

    let _ = maybe_auto_revert_profile_if_expired(&db).await;

    let defaults = default_log_settings();
    let mut result = Vec::with_capacity(defaults.len());

    for mut cfg in defaults {
        // Try to load overrides from APPLICATION_CONFIG
        let prefix = format!("log.category.{}", cfg.category);

        let enabled_key = format!("{}.enabled", prefix);
        let detail_key  = format!("{}.detail_mode", prefix);
        let level_key   = format!("{}.min_level", prefix);
        let sink_db_key = format!("{}.sink_db", prefix);
        let sink_file_key = format!("{}.sink_file", prefix);

        let load_val = |key: String| {
            let db = db.clone();
            async move {
                let sql = format!(
                    "SELECT config_value FROM APPLICATION_CONFIG WHERE config_key = '{}' LIMIT 1",
                    key.replace('\'', "''")
                );
                db.query_one(sea_orm::Statement::from_string(sea_orm::DatabaseBackend::Sqlite, sql))
                    .await
                    .ok()
                    .flatten()
                    .and_then(|r| r.try_get::<String>("", "config_value").ok())
            }
        };

        if let Some(v) = load_val(enabled_key).await {
            cfg.enabled = v.trim() == "true" || v.trim() == "1";
        }
        if let Some(v) = load_val(detail_key).await {
            cfg.detail_mode = v;
        }
        if let Some(v) = load_val(level_key).await {
            cfg.min_level = v;
        }
        if let Some(v) = load_val(sink_db_key).await {
            cfg.sink_db = parse_bool_config(&v);
        }
        if let Some(v) = load_val(sink_file_key).await {
            cfg.sink_file = parse_bool_config(&v);
        }

        result.push(cfg);
    }

    Ok(Json(result))
}

async fn put_log_settings(
    State(state): State<T3AppState>,
    Json(body): Json<UpdateLogSettingsRequest>,
) -> Result<Json<serde_json::Value>> {
    let db = match get_local_log_db_conn(&state).await {
        Some(d) => d,
        None => return Ok(Json(serde_json::json!({ "ok": false, "error": "DB unavailable" }))),
    };

    apply_log_settings_to_db(&db, &body.settings).await?;

    Ok(Json(serde_json::json!({ "ok": true })))
}

async fn get_log_profile_current(
    State(state): State<T3AppState>,
) -> Result<Json<serde_json::Value>> {
    let db = match get_local_log_db_conn(&state).await {
        Some(d) => d,
        None => {
            return Ok(Json(serde_json::json!({
                "ok": false,
                "error": "DB unavailable"
            })))
        }
    };

    let auto_reverted = maybe_auto_revert_profile_if_expired(&db).await?;

    let active_profile = load_application_config(&db, "log.profile.active")
        .await
        .unwrap_or_else(|| "baseline".to_string());
    let applied_at = load_application_config(&db, "log.profile.applied_at").await;
    let ttl_sec = load_application_config(&db, "log.profile.ttl_sec")
        .await
        .and_then(|v| v.parse::<u32>().ok())
        .unwrap_or(0);
    let expires_at = load_application_config(&db, "log.profile.expires_at")
        .await
        .filter(|v| !v.trim().is_empty());

    Ok(Json(serde_json::json!({
        "ok": true,
        "profile": active_profile,
        "ttlSec": ttl_sec,
        "appliedAt": applied_at,
        "expiresAt": expires_at,
        "autoReverted": auto_reverted,
    })))
}

async fn apply_log_profile(
    State(state): State<T3AppState>,
    Json(body): Json<ApplyLogProfileRequest>,
) -> Result<Json<serde_json::Value>> {
    let db = match get_local_log_db_conn(&state).await {
        Some(d) => d,
        None => return Ok(Json(serde_json::json!({ "ok": false, "error": "DB unavailable" }))),
    };

    let profile_name = body.profile.trim().to_ascii_lowercase();
    let Some(settings) = profile_settings(&profile_name) else {
        return Ok(Json(serde_json::json!({
            "ok": false,
            "error": format!("Unknown profile '{}'", body.profile),
            "supportedProfiles": ["baseline", "trendlog-trace", "ffi-stale-trace", "ui-trace"]
        })));
    };

    apply_log_settings_to_db(&db, &settings).await?;

    let now = chrono::Utc::now();
    let ttl_sec = body.ttl_sec.unwrap_or(1800);
    let expires_at = now + chrono::Duration::seconds(ttl_sec as i64);

    upsert_application_config(&db, "log.profile.active", &profile_name).await?;
    upsert_application_config(&db, "log.profile.applied_at", &now.to_rfc3339()).await?;
    upsert_application_config(&db, "log.profile.ttl_sec", &ttl_sec.to_string()).await?;
    upsert_application_config(&db, "log.profile.expires_at", &expires_at.to_rfc3339()).await?;

    Ok(Json(serde_json::json!({
        "ok": true,
        "profile": profile_name,
        "ttlSec": ttl_sec,
        "expiresAt": expires_at.to_rfc3339(),
        "appliedSettingsCount": settings.len()
    })))
}

async fn disable_log_profile(
    State(state): State<T3AppState>,
) -> Result<Json<serde_json::Value>> {
    let db = match get_local_log_db_conn(&state).await {
        Some(d) => d,
        None => return Ok(Json(serde_json::json!({ "ok": false, "error": "DB unavailable" }))),
    };

    let settings = baseline_profile_settings();
    apply_log_settings_to_db(&db, &settings).await?;

    upsert_application_config(&db, "log.profile.active", "baseline").await?;
    upsert_application_config(&db, "log.profile.applied_at", &chrono::Utc::now().to_rfc3339()).await?;
    upsert_application_config(&db, "log.profile.ttl_sec", "0").await?;
    upsert_application_config(&db, "log.profile.expires_at", "").await?;

    Ok(Json(serde_json::json!({
        "ok": true,
        "profile": "baseline",
        "appliedSettingsCount": settings.len()
    })))
}

// ============================================================================
// ============================================================================
// GET /api/sync/diagnostics — structured sync troubleshooting for the dashboard
// ============================================================================

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DiagnosticCheck {
    pub severity: String,
    pub title: String,
    pub detail: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub hint: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncDiagnosticsResponse {
    /// Runtime role from the running service (same as GET /api/sync/health role).
    pub role: String,
    pub hostname: String,
    /// setting.ini [ServerDatabase] role (read from disk now).
    pub ini_role: String,
    pub ini_center_db_enabled: bool,
    /// True when setting.ini has enabled=1 and role=server (same gate as lib.rs FFI startup).
    pub sync_runs_on_this_pc: bool,
    /// True when ini role disagrees with runtime role (restart required).
    pub role_mismatch: bool,
    /// Where dashboard sync KPIs / metadata come from.
    pub metrics_source: String,
    pub ffi_sync_host: Option<String>,
    pub event_log_scope: String,
    pub event_log_note: String,
    pub checks: Vec<DiagnosticCheck>,
    pub recent_ffi_events: Vec<AppLogEntry>,
}

fn last_sync_age_secs(last_sync_time: &Option<String>) -> Option<i64> {
    let raw = last_sync_time.as_ref()?;
    let naive = NaiveDateTime::parse_from_str(raw, "%Y-%m-%d %H:%M:%S").ok()?;
    let local_dt = Local.from_local_datetime(&naive).single()?;
    Some(Local::now().timestamp() - local_dt.timestamp())
}

fn build_diagnostic_checks(
    health: &SyncHealthResponse,
    ini_cfg: &crate::ini_config::ServerDbIniConfig,
    sync_runs_on_this_pc: bool,
    role_mismatch: bool,
    server_proxy_error: Option<&str>,
) -> Vec<DiagnosticCheck> {
    let mut checks: Vec<DiagnosticCheck> = Vec::new();

    if role_mismatch {
        checks.push(DiagnosticCheck {
            severity: "error".into(),
            title: "INI and running service disagree — restart required".into(),
            detail: format!(
                "setting.ini: enabled={}, role={}. Running service role={}. FFI startup uses INI at boot; dashboard uses runtime role.",
                ini_cfg.enabled, ini_cfg.role, health.role
            ),
            hint: Some(
                "Restart the T3000 webview / Rust service after changing setting.ini.".into(),
            ),
        });
    }

    match health.role.as_str() {
        "standalone" => {
            checks.push(DiagnosticCheck {
                severity: "info".into(),
                title: "This PC: standalone (not Shared DB)".into(),
                detail: "Background FFI interval sync is disabled. Only realtime device writes are active.".into(),
                hint: Some("Enable Shared DB + role=server in setting.ini to use interval sync.".into()),
            });
        }
        "client" => {
            let host = health
                .center_db_host
                .clone()
                .unwrap_or_else(|| "server PC".into());
            checks.push(DiagnosticCheck {
                severity: "info".into(),
                title: "This PC: CLIENT — FFI sync does not run here".into(),
                detail: format!(
                    "Dashboard Last Sync / Records Today are proxied from {}:9103 (not this machine).",
                    host
                ),
                hint: Some(
                    "To debug sync, open the dashboard or Develop → Logs on the server PC.".into(),
                ),
            });
            if let Some(err) = server_proxy_error {
                checks.push(DiagnosticCheck {
                    severity: "error".into(),
                    title: "Cannot reach server sync API".into(),
                    detail: err.to_string(),
                    hint: Some(
                        "Verify the server PC is online, port 9103 is open, and Database Config host matches the server IP.".into(),
                    ),
                });
            }
        }
        "server" => {
            checks.push(DiagnosticCheck {
                severity: "ok".into(),
                title: "This PC: SERVER — FFI sync host".into(),
                detail: format!(
                    "Dashboard sync KPIs are read from local DATA_SYNC_METADATA on {} (this machine).",
                    health.hostname
                ),
                hint: None,
            });
            if sync_runs_on_this_pc {
                checks.push(DiagnosticCheck {
                    severity: "ok".into(),
                    title: "setting.ini allows FFI interval sync".into(),
                    detail: format!(
                        "enabled=1, role=server — service should run the FFI loop every {} seconds.",
                        health.sync_interval_secs
                    ),
                    hint: Some(
                        "If cycles still fail, check Activity Log category POLL (source ffi_sync) below.".into(),
                    ),
                });
            } else {
                checks.push(DiagnosticCheck {
                    severity: "error".into(),
                    title: "setting.ini blocks FFI interval sync".into(),
                    detail: format!(
                        "Current INI: enabled={}, role={}. Need enabled=1 and role=server, then restart the service.",
                        ini_cfg.enabled, ini_cfg.role
                    ),
                    hint: Some(
                        "Activity Log STARTUP may show \"FFI Sync Service DISABLED\".".into(),
                    ),
                });
            }
        }
        _ => {}
    }

    if health.center_db_enabled && !health.center_db_connected {
        checks.push(DiagnosticCheck {
            severity: "error".into(),
            title: "Center database disconnected".into(),
            detail: health
                .center_db_message
                .clone()
                .unwrap_or_else(|| format!("Status: {}", health.center_db_status)),
            hint: Some("Use Test Connection on the dashboard or Database Config to fix connectivity.".into()),
        });
    }

    if health.writes_blocked {
        checks.push(DiagnosticCheck {
            severity: "error".into(),
            title: "Writes blocked — today counts forced to zero".into(),
            detail: "Center DB is enabled but unavailable; dashboard zeros Records/Devices Today even if old metadata exists.".into(),
            hint: None,
        });
    }

    if health.sampling_paused {
        checks.push(DiagnosticCheck {
            severity: "warn".into(),
            title: "FFI sampling paused".into(),
            detail: health
                .paused_reason
                .clone()
                .unwrap_or_else(|| "Sampling paused by policy.".into()),
            hint: None,
        });
    }

    if health.center_db_enabled && health.role == "server" && !health.mssql_pool_active {
        checks.push(DiagnosticCheck {
            severity: "warn".into(),
            title: "MSSQL pool inactive — sync cycles may be skipped".into(),
            detail: "When center DB mode is on but the pool is down, each cycle logs policy=center_db_skip_retry and writes no metadata.".into(),
            hint: Some("Restore SQL Server connectivity on this server PC.".into()),
        });
    }

    if let Some(age_secs) = last_sync_age_secs(&health.last_sync_time) {
        let interval = health.sync_interval_secs.max(30) as i64;
        if age_secs > interval * 3 {
            let severity = if age_secs > 86_400 { "error" } else { "warn" };
            checks.push(DiagnosticCheck {
                severity: severity.into(),
                title: "Last sync is stale".into(),
                detail: format!(
                    "Last successful FFI metadata write was {} ago ({}) — expected about every {}s.",
                    health.last_sync_ago.clone().unwrap_or_else(|| "?".into()),
                    health.last_sync_time.clone().unwrap_or_default(),
                    interval
                ),
                hint: Some(
                    "Open Activity Log, filter POLL, and look for policy= or GET_PANELS_LIST messages.".into(),
                ),
            });
        }
    } else if health.role == "server" && sync_runs_on_this_pc {
        checks.push(DiagnosticCheck {
            severity: "warn".into(),
            title: "No sync metadata recorded yet".into(),
            detail: "DATA_SYNC_METADATA has no FFI_BACKEND rows — the service may still be starting (30s delay) or cycles are failing.".into(),
            hint: None,
        });
    }

    if health.center_db_enabled
        && !health.writes_blocked
        && health.records_today.total == 0
        && health.devices_synced_today == 0
        && health.last_sync_time.is_some()
    {
        checks.push(DiagnosticCheck {
            severity: "warn".into(),
            title: "No sync activity today".into(),
            detail: "Last sync exists but Records Today and Devices Today are both zero (local midnight boundary).".into(),
            hint: Some(
                "Confirm sync cycles are completing on the server after midnight local time.".into(),
            ),
        });
    }

    if checks.is_empty() {
        checks.push(DiagnosticCheck {
            severity: "ok".into(),
            title: "No issues detected".into(),
            detail: "Sync health checks passed with current configuration.".into(),
            hint: None,
        });
    }

    checks
}

async fn fetch_recent_ffi_events(state: &T3AppState, limit: usize) -> Vec<AppLogEntry> {
    let mut merged: Vec<(i64, AppLogEntry)> = Vec::new();

    if let Some(pool) = crate::server_db_writer::get_server_mssql_pool() {
        for row in crate::database_management::mssql_queries::query_app_log(pool, None, Some("POLL"), 40)
            .await
            .unwrap_or_default()
        {
            if row["source"].as_str() != Some("ffi_sync") {
                continue;
            }
            let entry = json_to_log_entry(&row);
            merged.push((entry.ts_unix, entry));
        }
        for row in crate::database_management::mssql_queries::query_app_log(pool, None, Some("DEVICE"), 20)
            .await
            .unwrap_or_default()
        {
            if row["source"].as_str() != Some("ffi_sync") {
                continue;
            }
            let entry = json_to_log_entry(&row);
            merged.push((entry.ts_unix, entry));
        }
    }

    if let Some(db) = get_local_log_db_conn(state).await {
        ensure_app_log_table(&db).await;
        for row in query_sqlite_log_raw(&db, None, Some("POLL"), 40).await {
            if row["source"].as_str() != Some("ffi_sync") {
                continue;
            }
            let entry = json_to_log_entry(&row);
            merged.push((entry.ts_unix, entry));
        }
        for row in query_sqlite_log_raw(&db, None, Some("STARTUP"), 10).await {
            if row["source"].as_str() != Some("ffi_sync") {
                continue;
            }
            let entry = json_to_log_entry(&row);
            merged.push((entry.ts_unix, entry));
        }
    }

    merged.sort_unstable_by(|a, b| b.0.cmp(&a.0));
    merged.dedup_by(|a, b| a.1.id == b.1.id && a.0 == b.0);
    merged
        .into_iter()
        .take(limit)
        .map(|(_, e)| e)
        .collect()
}

async fn build_sync_diagnostics(
    state: &T3AppState,
    server_proxy_error: Option<String>,
) -> Result<SyncDiagnosticsResponse> {
    let health = build_sync_health_response(state).await?;
    let ini_cfg = crate::ini_config::read_server_db_config_auto();
    let sync_runs_on_this_pc = ini_cfg.enabled && ini_cfg.role == "server";
    let role_mismatch = ini_cfg.enabled
        && health.role != "standalone"
        && ini_cfg.role != health.role;

    let metrics_source = if health.role == "client" {
        let host = health
            .center_db_host
            .clone()
            .unwrap_or_else(|| "server".into());
        format!("remote_server:{}", host)
    } else {
        "this_pc".to_string()
    };

    let ffi_sync_host = if health.role == "client" {
        health.center_db_host.clone()
    } else if sync_runs_on_this_pc {
        Some(health.hostname.clone())
    } else {
        None
    };

    let mut checks = build_diagnostic_checks(
        &health,
        &ini_cfg,
        sync_runs_on_this_pc,
        role_mismatch,
        server_proxy_error.as_deref(),
    );

    // Surface skip reasons from the latest POLL ffi_sync row when present.
    let recent_ffi_events = fetch_recent_ffi_events(state, 12).await;
    if let Some(ev) = recent_ffi_events.first() {
        if let Some(details) = ev.details.as_deref() {
            if details.contains("policy=center_db_skip_retry") {
                checks.push(DiagnosticCheck {
                    severity: "warn".into(),
                    title: "Latest cycle: center DB skip".into(),
                    detail: "Most recent ffi_sync POLL log shows policy=center_db_skip_retry — cycle wrote no metadata.".into(),
                    hint: Some("Restore MSSQL pool on this PC (server) or fix SQL connectivity.".into()),
                });
            } else if details.contains("policy=standalone_skip") {
                checks.push(DiagnosticCheck {
                    severity: "warn".into(),
                    title: "Latest cycle: standalone skip".into(),
                    detail: "FFI loop is skipping because center DB is disabled in setting.ini at cycle time.".into(),
                    hint: None,
                });
            }
        }
        if ev.message.contains("GET_PANELS_LIST timed out") {
            checks.push(DiagnosticCheck {
                severity: "warn".into(),
                title: "Latest cycle: T3000 FFI timeout".into(),
                detail: ev.message.clone(),
                hint: Some("Ensure T3000.exe is running and BacnetWebView_HandleWebViewMsg is available.".into()),
            });
        }
    }

    Ok(SyncDiagnosticsResponse {
        role: health.role,
        hostname: health.hostname,
        ini_role: ini_cfg.role,
        ini_center_db_enabled: ini_cfg.enabled,
        sync_runs_on_this_pc,
        role_mismatch,
        metrics_source,
        ffi_sync_host,
        event_log_scope: health.event_log_scope,
        event_log_note: health.event_log_note,
        checks,
        recent_ffi_events,
    })
}

async fn get_sync_diagnostics(State(state): State<T3AppState>) -> Result<Json<SyncDiagnosticsResponse>> {
    let diagnostics = build_sync_diagnostics(&state, None).await?;
    Ok(Json(diagnostics))
}

async fn get_server_sync_diagnostics(
    State(state): State<T3AppState>,
) -> Json<serde_json::Value> {
    if !state.server_db_enabled || state.server_db_role != "client" {
        return Json(serde_json::json!({
            "ok": false,
            "error": "Not in client mode"
        }));
    }

    let server_ip = if let Some(ref local_conn) = state.local_config_conn {
        let db = local_conn.lock().await;
        crate::database_management::db_backend_config::load_active_config(&*db)
            .await
            .ok()
            .and_then(|cfg| cfg.host)
    } else {
        None
    };

    let Some(server_ip) = server_ip else {
        return Json(serde_json::json!({
            "ok": false,
            "error": "Server IP not configured"
        }));
    };

    match fetch_server_get_raw(&server_ip, 9103, "/api/sync/diagnostics").await {
        Ok(body) => Json(serde_json::json!({ "ok": true, "serverIp": server_ip, "diagnostics": body })),
        Err(e) => Json(serde_json::json!({ "ok": false, "error": e, "serverIp": server_ip })),
    }
}

// Router
// ============================================================================

pub fn sync_health_routes() -> Router<T3AppState> {
    Router::new()
        .route("/api/sync/health", get(get_sync_health))
        .route("/api/sync/health/ping", get(ping_center_db))
        .route("/api/sync/diagnostics", get(get_sync_diagnostics))
        .route("/api/sync/server-diagnostics", get(get_server_sync_diagnostics))
        .route("/api/sync/server-health", get(get_server_sync_metrics))
        .route("/api/sync/event-log", get(get_event_log))
        .route("/api/sync/event-log", post(post_event))
        .route("/api/logs/settings", get(get_log_settings))
        .route("/api/logs/validation", get(get_log_validation))
        .route("/api/logs/profile/current", get(get_log_profile_current))
        .route("/api/logs/settings", axum::routing::put(put_log_settings))
        .route("/api/logs/profile/apply", post(apply_log_profile))
        .route("/api/logs/profile/disable", post(disable_log_profile))
        // FFI sampling control
        .route("/api/sync/sampling/status", get(get_sampling_status))
        .route("/api/sync/sampling/pause", post(post_sampling_pause))
        .route("/api/sync/sampling/resume", post(post_sampling_resume))
        .route("/api/sync/trigger", post(post_trigger_sync))
}

// ============================================================================
// GET /api/sync/sampling/status
// Returns real-time FFI sampling state: paused/active, pause reason, interval.
// ============================================================================

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct SamplingStatusResponse {
    paused: bool,
    pause_reason: Option<String>,
    sync_interval_secs: u32,
    service_running: bool,
}

async fn get_sampling_status() -> Json<SamplingStatusResponse> {
    use crate::app_state::{get_pause_reason, is_sampling_paused};
    use crate::t3_device::t3_ffi_sync_service::is_logging_service_running;

    // Read interval from DB config (same path used elsewhere), fallback 300s
    let sync_interval_secs = crate::t3_device::t3_ffi_sync_service::T3000MainService::get_service()
        .map(|_| 300u32) // service is opaque; get from config API
        .unwrap_or(300);

    Json(SamplingStatusResponse {
        paused: is_sampling_paused(),
        pause_reason: get_pause_reason(),
        sync_interval_secs,
        service_running: is_logging_service_running(),
    })
}

// ============================================================================
// POST /api/sync/sampling/pause
// Body: { "reason": "optional human-readable reason" }
// Manually pause FFI sampling.
// ============================================================================

#[derive(Deserialize, Default)]
struct PauseBody {
    reason: Option<String>,
}

async fn post_sampling_pause(
    body: Option<Json<PauseBody>>,
) -> Json<serde_json::Value> {
    let reason = body
        .and_then(|b| b.reason.clone())
        .unwrap_or_else(|| "manually paused via API".to_string());
    crate::app_state::set_sampling_paused(&reason);
    Json(serde_json::json!({ "ok": true, "paused": true, "reason": reason }))
}

// ============================================================================
// POST /api/sync/sampling/resume
// Manually resume FFI sampling (clears any pause).
// ============================================================================

async fn post_sampling_resume() -> Json<serde_json::Value> {
    crate::app_state::set_sampling_active();
    Json(serde_json::json!({ "ok": true, "paused": false }))
}

// ============================================================================
// POST /api/sync/trigger
// Fires an immediate sync cycle in the background (non-blocking).
// Returns immediately; the sync runs concurrently.
// ============================================================================

async fn post_trigger_sync() -> Json<serde_json::Value> {
    use crate::t3_device::t3_ffi_sync_service::sync_logging_data_once;

    if crate::app_state::is_sampling_paused() {
        return Json(serde_json::json!({
            "ok": false,
            "error": "sampling is paused — resume before triggering sync"
        }));
    }

    tokio::spawn(async move {
        if let Err(e) = sync_logging_data_once().await {
            tracing::warn!("manual sync trigger failed: {}", e);
        }
    });

    Json(serde_json::json!({ "ok": true, "message": "sync triggered in background" }))
}

// ============================================================================
// GET /api/sync/server-health
// Proxies to the server PC's /api/sync/health endpoint using a raw TCP
// connection (no extra dependencies required).  Only meaningful in client mode.
// Returns a small subset: devicesSyncedToday, recordsToday, lastSyncAgo,
// lastSyncTime, serverHostname.
// ============================================================================
async fn get_server_sync_metrics(
    State(state): State<T3AppState>,
) -> Json<serde_json::Value> {
    if !state.server_db_enabled || state.server_db_role != "client" {
        return Json(serde_json::json!({
            "ok": false,
            "error": "Not in client mode"
        }));
    }

    // Get the configured server host (SQL Server host == server PC IP)
    let server_ip = if let Some(ref local_conn) = state.local_config_conn {
        let db = local_conn.lock().await;
        crate::database_management::db_backend_config::load_active_config(&*db)
            .await
            .ok()
            .and_then(|cfg| cfg.host)
    } else {
        None
    };

    let Some(server_ip) = server_ip else {
        return Json(serde_json::json!({
            "ok": false,
            "error": "Server IP not configured"
        }));
    };

    match fetch_server_get_raw(&server_ip, 9103, "/api/sync/health").await {
        Ok(body) => {
            // Extract only the fields we need.
            // /api/sync/health serialises with rename_all = "camelCase", so
            // index with camelCase keys here.
            Json(serde_json::json!({
                "ok": true,
                "devicesSyncedToday": body["devicesSyncedToday"],
                "recordsToday": {
                    "total":     body["recordsToday"]["total"],
                    "inputs":    body["recordsToday"]["inputs"],
                    "outputs":   body["recordsToday"]["outputs"],
                    "variables": body["recordsToday"]["variables"],
                    "trendlogs": body["recordsToday"]["trendlogs"],
                },
                "lastSyncAgo":  body["lastSyncAgo"],
                "lastSyncTime": body["lastSyncTime"],
                "serverHostname": body["hostname"],
            }))
        }
        Err(e) => Json(serde_json::json!({ "ok": false, "error": e })),
    }
}

/// Raw HTTP/1.1 GET over a plain TCP stream — no TLS, no extra crates.
async fn fetch_server_get_raw(
    host: &str,
    port: u16,
    path: &str,
) -> std::result::Result<serde_json::Value, String> {
    let addr = format!("{}:{}", host, port);

    let mut stream = tokio::time::timeout(
        Duration::from_secs(5),
        tokio::net::TcpStream::connect(&addr),
    )
    .await
    .map_err(|_| format!("Connect to {} timed out", addr))?
    .map_err(|e| format!("TCP connect error: {}", e))?;

    let request = format!(
        "GET {} HTTP/1.1\r\nHost: {}\r\nConnection: close\r\nAccept: application/json\r\n\r\n",
        path, host
    );
    stream
        .write_all(request.as_bytes())
        .await
        .map_err(|e| format!("Write error: {}", e))?;

    let mut buf = Vec::new();
    tokio::time::timeout(Duration::from_secs(5), stream.read_to_end(&mut buf))
        .await
        .map_err(|_| "Read timed out".to_string())?
        .map_err(|e| format!("Read error: {}", e))?;

    let raw = String::from_utf8_lossy(&buf);
    // HTTP response: headers\r\n\r\nbody
    let body = raw
        .find("\r\n\r\n")
        .map(|i| &raw[i + 4..])
        .ok_or_else(|| "No HTTP body in response".to_string())?;

    serde_json::from_str(body.trim()).map_err(|e| format!("JSON parse error: {}", e))
}
