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
use std::collections::{BTreeSet, HashMap};
use std::sync::OnceLock;
use std::time::{Duration, Instant};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::sync::RwLock;
use tracing::{debug, warn};

use crate::app_state::T3AppState;
use crate::error::Result;
use crate::logger::{write_structured_log_with_level, LogLevel as FileLogLevel};

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

    {
        let mut cache_guard = sync_health_cache().write().await;
        *cache_guard = Some(CachedSyncHealth {
            created_at: Instant::now(),
            payload: response.clone(),
        });
    }

    Ok(Json(response))
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

/// Returns `true` for categories that are written at high frequency by the
/// FFI backend sync loop (one row per cycle / per device).  These should go
/// to MSSQL when the pool is active so they don't bloat local SQLite.
///
/// Group B (high-volume, operational): POLL | DEVICE | TRENDLOG
/// Group A (low-volume, system/config): STARTUP | AUTH | CONFIG | MAINTENANCE → always SQLite
fn is_high_volume_category(cat: &str) -> bool {
    matches!(cat,
        // New category names (Group B)
        "POLL" | "DEVICE" | "TRENDLOG" |
        // Legacy names kept for backwards compatibility
        "SYNC_CYCLE" | "SAMPLING" | "FFI_POLL" | "DEVICE_SYNC" | "TREND_LOG"
        | "TD_READ" | "TD_WRITE" | "TD_INPUTS" | "TD_FFI" | "TD_SYNC"
    )
}

#[derive(Debug, Clone)]
struct RuntimeLogPolicy {
    enabled: bool,
    detail_mode: String,
    min_level: String,
    sink_db: bool,
    sink_file: bool,
}

fn normalize_level_upper(level: &str) -> String {
    match level.trim().to_ascii_uppercase().as_str() {
        "ERROR" | "ERR" => "ERROR".to_string(),
        "WARN" | "WARNING" => "WARN".to_string(),
        "DEBUG" => "DEBUG".to_string(),
        _ => "INFO".to_string(),
    }
}

fn level_rank(level_upper: &str) -> i32 {
    match level_upper {
        "DEBUG" => 10,
        "INFO" => 20,
        "WARN" => 30,
        "ERROR" => 40,
        _ => 20,
    }
}

fn level_meets_min(level_upper: &str, min_level: &str) -> bool {
    level_rank(level_upper) >= level_rank(&normalize_level_upper(min_level))
}

fn canonical_category(category: &str) -> String {
    match category.trim().to_ascii_uppercase().as_str() {
        "SYNC_CYCLE" | "SAMPLING" | "FFI_POLL" => "POLL".to_string(),
        "DEVICE_SYNC" => "DEVICE".to_string(),
        "TREND_LOG" | "TD_READ" | "TD_WRITE" | "TD_INPUTS" | "TD_FFI" | "TD_SYNC" => "TRENDLOG".to_string(),
        "DB_CONFIG" => "CONFIG".to_string(),
        "SERVER_EVENT" => "STARTUP".to_string(),
        other => other.to_string(),
    }
}

fn category_filter_variants(category: &str) -> Vec<String> {
    let upper = category.trim().to_ascii_uppercase();
    let canonical = canonical_category(&upper);
    match canonical.as_str() {
        "CONFIG" => vec!["CONFIG".to_string(), "DB_CONFIG".to_string()],
        "STARTUP" => vec!["STARTUP".to_string(), "SERVER_EVENT".to_string()],
        "POLL" => vec![
            "POLL".to_string(),
            "SYNC_CYCLE".to_string(),
            "SAMPLING".to_string(),
            "FFI_POLL".to_string(),
        ],
        "DEVICE" => vec!["DEVICE".to_string(), "DEVICE_SYNC".to_string()],
        "TRENDLOG" => vec![
            "TRENDLOG".to_string(),
            "TREND_LOG".to_string(),
            "TD_READ".to_string(),
            "TD_WRITE".to_string(),
            "TD_INPUTS".to_string(),
            "TD_FFI".to_string(),
            "TD_SYNC".to_string(),
        ],
        _ => vec![canonical],
    }
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

fn file_log_base_for_category(category: &str) -> &'static str {
    match category {
        "API_REQ" => "T3_Webview_API",
        "WEBSOCKET" => "T3_Webview_Socket",
        "FFI_CALL" | "MESSAGE_ACTION" | "POLL" | "DEVICE" | "TRENDLOG" => "T3_Webview_FFI",
        "MAINTENANCE" => "T3_Webview_Database",
        _ => "T3_Webview_Initialize",
    }
}

fn parse_bool_config(v: &str) -> bool {
    matches!(v.trim().to_ascii_lowercase().as_str(), "1" | "true" | "yes" | "on")
}

async fn load_runtime_log_policy(
    db: &sea_orm::DatabaseConnection,
    category: &str,
) -> RuntimeLogPolicy {
    let normalized_category = canonical_category(category);

    let mut base_cfg = default_log_settings()
        .into_iter()
        .find(|c| c.category == normalized_category)
        .unwrap_or(LogCategoryConfig {
            category: normalized_category,
            display_name: "Custom Category".into(),
            description: "Runtime category (default policy)".into(),
            group: "debug".into(),
            enabled: true,
            detail_mode: "SUMMARY".into(),
            min_level: "INFO".into(),
            target: "sqlite".into(),
            sink_db: true,
            sink_file: false,
        });

    let key_prefix = format!("log.category.{}.", base_cfg.category.replace('\'', "''"));
    let sql = format!(
        "SELECT config_key, config_value FROM APPLICATION_CONFIG WHERE config_key LIKE '{}'",
        format!("{}%", key_prefix)
    );

    let rows = db
        .query_all(sea_orm::Statement::from_string(
            sea_orm::DatabaseBackend::Sqlite,
            sql,
        ))
        .await
        .unwrap_or_default();

    for row in rows {
        let key: String = row.try_get("", "config_key").unwrap_or_default();
        let val: String = row.try_get("", "config_value").unwrap_or_default();
        if key.ends_with(".enabled") {
            base_cfg.enabled = parse_bool_config(&val);
        } else if key.ends_with(".detail_mode") {
            base_cfg.detail_mode = val;
        } else if key.ends_with(".min_level") {
            base_cfg.min_level = val;
        } else if key.ends_with(".sink_db") {
            base_cfg.sink_db = parse_bool_config(&val);
        } else if key.ends_with(".sink_file") {
            base_cfg.sink_file = parse_bool_config(&val);
        }
    }

    RuntimeLogPolicy {
        enabled: base_cfg.enabled,
        detail_mode: base_cfg.detail_mode,
        min_level: base_cfg.min_level,
        sink_db: base_cfg.sink_db,
        sink_file: base_cfg.sink_file,
    }
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
pub async fn write_app_log(
    db: &sea_orm::DatabaseConnection,
    level: &str,
    category: &str,
    source: Option<&str>,
    device_serial: Option<&str>,
    message: &str,
    details: Option<&str>,
) {
    let canonical_cat = canonical_category(category);
    let level_upper = normalize_level_upper(level);
    let level_lc = level_upper.to_ascii_lowercase();
    let is_error = level_upper == "ERROR";

    let policy = load_runtime_log_policy(db, &canonical_cat).await;

    // For non-error logs, honor category enable/min-level policy.
    if !is_error {
        if !policy.enabled {
            return;
        }
        if !level_meets_min(&level_upper, &policy.min_level) {
            return;
        }
    }

    // Safety invariant: ERROR logs always go to DB.
    let sink_db = is_error || policy.sink_db;
    let sink_file = policy.sink_file;

    // Nothing to do if both sinks are disabled for non-error logs.
    if !sink_db && !sink_file {
        return;
    }

    let now = Local::now();
    let ts_unix = now.timestamp();
    let ts_fmt = now.format("%Y-%m-%d %H:%M:%S").to_string();

    let hostname_val = hostname::get()
        .map(|h| h.to_string_lossy().into_owned())
        .unwrap_or_else(|_| "unknown".into());

    let mut wrote_mssql = false;

    // DB sink: high-volume categories route to MSSQL when pool is active.
    if sink_db && is_high_volume_category(&canonical_cat) {
        if let Some(pool) = crate::server_db_writer::get_server_mssql_pool() {
            // Fire-and-forget: clone what we need across the spawn boundary.
            let ts_unix_c = ts_unix;
            let ts_fmt_c = ts_fmt.clone();
            let level_c = level_lc.clone();
            let category_c = canonical_cat.clone();
            let source_c = source.map(|s| s.to_string());
            let hostname_c = hostname_val.clone();
            let device_serial_c = device_serial.map(|s| s.to_string());
            let message_c = message.to_string();
            let details_c = details.map(|s| s.to_string());

            tokio::spawn(async move {
                let _ = crate::database_management::mssql_queries::insert_app_log(
                    pool,
                    ts_unix_c,
                    &ts_fmt_c,
                    &level_c,
                    &category_c,
                    source_c.as_deref(),
                    &hostname_c,
                    device_serial_c.as_deref(),
                    &message_c,
                    details_c.as_deref(),
                )
                .await;
            });
            wrote_mssql = true;
        }
        // MSSQL unavailable falls through to SQLite when DB sink is enabled.
    }

    // Local file sink (independent of DB sink).
    if sink_file {
        let base_filename = file_log_base_for_category(&canonical_cat);
        let mut file_message = format!("[{}] {}", canonical_cat, message);
        if let Some(src) = source {
            file_message.push_str(&format!(" | source={}", src));
        }
        if let Some(serial) = device_serial {
            file_message.push_str(&format!(" | serial={}", serial));
        }
        if policy.detail_mode.eq_ignore_ascii_case("FULL") {
            if let Some(d) = details {
                file_message.push_str(&format!(" | details={}", d));
            }
        }

        let file_level = match level_upper.as_str() {
            "ERROR" => FileLogLevel::Error,
            "WARN" => FileLogLevel::Warn,
            _ => FileLogLevel::Info,
        };
        let _ = write_structured_log_with_level(base_filename, &file_message, file_level);
    }

    // ── Local SQLite write (DB sink path; or fallback when MSSQL not available) ──
    if !sink_db || wrote_mssql {
        return;
    }

    // When this is a sync-category log but MSSQL was unreachable, annotate the
    // details field so the Activity Log clearly shows what failed and where it
    // was saved, e.g.:
    //   "Starting FFI sync cycle" → details: "[center DB unreachable — saved to local] sync_interval_secs=300"
    let fallback_detail_storage: String;
    let detailed_allowed = policy.detail_mode.eq_ignore_ascii_case("FULL") || is_error;
    let mut selected_details = if detailed_allowed { details } else { None };

    let effective_details: Option<&str> = if is_high_volume_category(&canonical_cat) {
        // We only reach here when the MSSQL pool was NOT available.
        fallback_detail_storage = match selected_details {
            Some(d) => format!("[center DB unreachable — saved to local] {}", d),
            None    => "[center DB unreachable — saved to local]".to_string(),
        };
        Some(fallback_detail_storage.as_str())
    } else {
        selected_details.take()
    };

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
        esc(&level_lc),
        esc(&canonical_cat),
        opt_str(source),
        esc(&hostname_val),
        opt_str(device_serial),
        esc(message),
        opt_str(effective_details),
    );

    let _ = db
        .execute(sea_orm::Statement::from_string(
            sea_orm::DatabaseBackend::Sqlite,
            sql,
        ))
        .await;

    // Keep only the latest 5000 rows in local SQLite.
    let _ = db
        .execute(sea_orm::Statement::from_string(
            sea_orm::DatabaseBackend::Sqlite,
            "DELETE FROM T3_APP_LOG WHERE id NOT IN \
             (SELECT id FROM T3_APP_LOG ORDER BY ts_unix DESC LIMIT 5000)"
                .to_string(),
        ))
        .await;
}

/// Legacy shim: write with category=POLL, source=ffi_sync
pub async fn write_sync_event(
    db: &sea_orm::DatabaseConnection,
    level: &str,
    device_serial: Option<&str>,
    message: &str,
) {
    write_app_log(db, level, "POLL", Some("ffi_sync"), device_serial, message, None).await;
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
    let limit = q.limit.min(200) as usize;
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

        // Fetch from local SQLite
        let (sqlite_rows, sqlite_categories) = if let Some(db) = get_local_log_db_conn(&state).await {
            ensure_app_log_table(&db).await;
            (
                query_sqlite_log_raw(&db, level_filter, cat_filter, fetch_count).await,
                query_sqlite_log_categories(&db).await,
            )
        } else {
            (Vec::new(), Vec::new())
        };

        // Merge and sort descending by ts_unix
        let mut all_rows: Vec<(i64, serde_json::Value)> = mssql_rows
            .into_iter()
            .chain(sqlite_rows.into_iter())
            .map(|v| (v["ts_unix"].as_i64().unwrap_or(0), v))
            .collect();
        all_rows.sort_unstable_by(|a, b| b.0.cmp(&a.0));

        let total = all_rows.len() as i64;

        let mut category_set: BTreeSet<String> = BTreeSet::new();
        category_set.extend(default_log_settings().into_iter().map(|c| c.category));
        category_set.extend(sqlite_categories.into_iter());
        for (_, row) in &all_rows {
            if let Some(cat) = row["category"].as_str() {
                if !cat.is_empty() {
                    category_set.insert(canonical_category(cat));
                }
            }
        }
        let categories: Vec<String> = category_set.into_iter().collect();

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
    let mut category_set: BTreeSet<String> = BTreeSet::new();
    category_set.extend(default_log_settings().into_iter().map(|c| c.category));
    category_set.extend(
        query_sqlite_log_categories(&db)
            .await
            .into_iter()
            .map(|c| canonical_category(&c)),
    );
    let categories: Vec<String> = category_set.into_iter().collect();

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

#[derive(Debug, Deserialize)]
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

fn default_log_settings() -> Vec<LogCategoryConfig> {
    vec![
        LogCategoryConfig { category: "STARTUP".into(),     display_name: "Service Startup".into(),  description: "DLL load, server init, DB connect, sampling state changes".into(), group: "system".into(),      enabled: true,  detail_mode: "SUMMARY".into(), min_level: "INFO".into(), target: "sqlite".into(), sink_db: true,  sink_file: false },
        LogCategoryConfig { category: "AUTH".into(),        display_name: "Authentication".into(),    description: "Login, logout, session events".into(),                            group: "system".into(),      enabled: true,  detail_mode: "SUMMARY".into(), min_level: "INFO".into(), target: "sqlite".into(), sink_db: true,  sink_file: false },
        LogCategoryConfig { category: "CONFIG".into(),      display_name: "Config Changes".into(),    description: "Operator settings: sync interval, rediscover interval".into(),    group: "system".into(),      enabled: true,  detail_mode: "SUMMARY".into(), min_level: "INFO".into(), target: "sqlite".into(), sink_db: true,  sink_file: false },
        LogCategoryConfig { category: "MAINTENANCE".into(), display_name: "DB Maintenance".into(),    description: "Migration, partition creation, DB size warnings".into(),           group: "system".into(),      enabled: true,  detail_mode: "SUMMARY".into(), min_level: "INFO".into(), target: "sqlite".into(), sink_db: true,  sink_file: false },
        LogCategoryConfig { category: "POLL".into(),        display_name: "Device Poll".into(),       description: "Sync cycle: device count, ok/fail totals, policy skips".into(),   group: "operational".into(), enabled: true,  detail_mode: "SUMMARY".into(), min_level: "INFO".into(), target: "mssql".into(),  sink_db: true,  sink_file: false },
        LogCategoryConfig { category: "DEVICE".into(),      display_name: "Device Sync".into(),       description: "Per-device: points written, FFI errors, serial=0 skips".into(),   group: "operational".into(), enabled: true,  detail_mode: "SUMMARY".into(), min_level: "INFO".into(), target: "mssql".into(),  sink_db: true,  sink_file: false },
        LogCategoryConfig { category: "TRENDLOG".into(),    display_name: "Trendlog".into(),          description: "Trendlog config sync and data write summary".into(),               group: "operational".into(), enabled: true,  detail_mode: "SUMMARY".into(), min_level: "INFO".into(), target: "mssql".into(),  sink_db: true,  sink_file: false },
        LogCategoryConfig { category: "API_REQ".into(),     display_name: "API Requests".into(),      description: "HTTP endpoint calls — enable for debugging only".into(),           group: "debug".into(),       enabled: false, detail_mode: "SUMMARY".into(), min_level: "INFO".into(), target: "sqlite".into(), sink_db: true,  sink_file: false },
        LogCategoryConfig { category: "WEBSOCKET".into(),   display_name: "WebSocket".into(),         description: "WS connect/disconnect, message types".into(),                      group: "debug".into(),       enabled: false, detail_mode: "SUMMARY".into(), min_level: "INFO".into(), target: "sqlite".into(), sink_db: true,  sink_file: false },
        LogCategoryConfig { category: "FFI_CALL".into(),    display_name: "C++ FFI Calls".into(),     description: "Raw C++ request/response — very high volume".into(),               group: "debug".into(),       enabled: false, detail_mode: "FULL".into(),    min_level: "DEBUG".into(), target: "sqlite".into(), sink_db: true,  sink_file: false },
        LogCategoryConfig { category: "MESSAGE_ACTION".into(), display_name: "Message Action".into(), description: "Message action processing and command dispatch details".into(),      group: "debug".into(),       enabled: false, detail_mode: "FULL".into(),    min_level: "DEBUG".into(), target: "sqlite".into(), sink_db: true,  sink_file: false },
    ]
}

async fn get_log_settings(
    State(state): State<T3AppState>,
) -> Result<Json<Vec<LogCategoryConfig>>> {
    let db = match get_local_log_db_conn(&state).await {
        Some(d) => d,
        None => return Ok(Json(default_log_settings())),
    };

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

    let now = chrono::Utc::now().naive_utc().to_string();
    let default_sink_by_category: HashMap<String, (bool, bool)> = default_log_settings()
        .into_iter()
        .map(|cfg| (cfg.category, (cfg.sink_db, cfg.sink_file)))
        .collect();

    for cfg in &body.settings {
        let canonical_cat = canonical_category(&cfg.category);
        let cat = canonical_cat.replace('\'', "''");
        let prefix = format!("log.category.{}", cat);

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
            let key_sql = key.replace('\'', "''");
            let val_sql = value.replace('\'', "''");
            let ts_sql = now.replace('\'', "''");

            // Some deployments do not enforce a UNIQUE constraint on config_key,
            // so ON CONFLICT(config_key) fails. Use update-first, insert-if-missing.
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
                        "Failed to update log setting '{}': {}",
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
                        "Failed to insert log setting '{}': {}",
                        key, e
                    ))
                })?;
            }
        }
    }

    Ok(Json(serde_json::json!({ "ok": true })))
}

// ============================================================================
// Router
// ============================================================================

pub fn sync_health_routes() -> Router<T3AppState> {
    Router::new()
        .route("/api/sync/health", get(get_sync_health))
        .route("/api/sync/health/ping", get(ping_center_db))
        .route("/api/sync/server-health", get(get_server_sync_metrics))
        .route("/api/sync/event-log", get(get_event_log))
        .route("/api/sync/event-log", post(post_event))
        .route("/api/logs/settings", get(get_log_settings))
        .route("/api/logs/settings", axum::routing::put(put_log_settings))
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

    match fetch_server_health_raw(&server_ip, 9103).await {
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
async fn fetch_server_health_raw(host: &str, port: u16) -> std::result::Result<serde_json::Value, String> {
    let addr = format!("{}:{}", host, port);

    let mut stream = tokio::time::timeout(
        Duration::from_secs(5),
        tokio::net::TcpStream::connect(&addr),
    )
    .await
    .map_err(|_| format!("Connect to {} timed out", addr))?
    .map_err(|e| format!("TCP connect error: {}", e))?;

    let request = format!(
        "GET /api/sync/health HTTP/1.1\r\nHost: {}\r\nConnection: close\r\nAccept: application/json\r\n\r\n",
        host
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
