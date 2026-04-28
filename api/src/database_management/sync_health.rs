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
use std::sync::OnceLock;
use std::time::{Duration, Instant};
use tokio::sync::RwLock;
use tracing::{debug, warn};

use crate::app_state::T3AppState;
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
    /// Current behavior is local SQLite regardless of center DB mode.
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
            .unwrap_or(1800)
    } else {
        1800
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
        event_log_scope: "local".to_string(),
        event_log_note: "Activity Log entries are stored on this PC, not in center DB.".to_string(),
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
/// Low-volume system/config categories always stay in local SQLite.
fn is_high_volume_category(cat: &str) -> bool {
    matches!(cat, "SYNC_CYCLE" | "SAMPLING" | "FFI_POLL" | "DEVICE_SYNC" | "TREND_LOG")
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
    let now = Local::now();
    let ts_unix = now.timestamp();
    let ts_fmt = now.format("%Y-%m-%d %H:%M:%S").to_string();

    let hostname_val = hostname::get()
        .map(|h| h.to_string_lossy().into_owned())
        .unwrap_or_else(|_| "unknown".into());

    // High-volume sync categories: route to MSSQL when pool is active.
    if is_high_volume_category(category) {
        if let Some(pool) = crate::server_db_writer::get_server_mssql_pool() {
            // Fire-and-forget: clone what we need across the spawn boundary.
            let ts_unix_c = ts_unix;
            let ts_fmt_c = ts_fmt.clone();
            let level_c = level.to_string();
            let category_c = category.to_string();
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

            // Skip local SQLite write — MSSQL is the primary for high-volume logs.
            return;
        }
        // MSSQL pool unavailable → fall through to local SQLite so the
        // Activity Log still shows what was attempted and why it landed locally.
    }

    // ── Local SQLite write (system/config logs always; sync logs as fallback) ──

    // When this is a sync-category log but MSSQL was unreachable, annotate the
    // details field so the Activity Log clearly shows what failed and where it
    // was saved, e.g.:
    //   "Starting FFI sync cycle" → details: "[center DB unreachable — saved to local] sync_interval_secs=300"
    let fallback_detail_storage: String;
    let effective_details: Option<&str> = if is_high_volume_category(category) {
        // We only reach here when the MSSQL pool was NOT available.
        fallback_detail_storage = match details {
            Some(d) => format!("[center DB unreachable — saved to local] {}", d),
            None    => "[center DB unreachable — saved to local]".to_string(),
        };
        Some(fallback_detail_storage.as_str())
    } else {
        details
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
        esc(level),
        esc(category),
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

/// Convert a serde_json::Value row (from MSSQL or SQLite raw query) into AppLogEntry.
fn json_to_log_entry(v: &serde_json::Value) -> AppLogEntry {
    AppLogEntry {
        id:            v["id"].as_i64().unwrap_or(0),
        ts_unix:       v["ts_unix"].as_i64().unwrap_or(0),
        ts:            v["ts_fmt"].as_str().unwrap_or("").to_string(),
        level:         EventLevel::from_str(v["level"].as_str().unwrap_or("info")),
        category:      v["category"].as_str().unwrap_or("SERVER_EVENT").to_string(),
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
        _ => "",
    };
    let cat_sql = match cat_filter {
        Some(c) if !c.is_empty() => format!(" AND category = '{}'", c.replace('\'', "''")),
        _ => String::new(),
    };
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

async fn get_event_log(
    State(state): State<T3AppState>,
    Query(q): Query<EventLogQuery>,
) -> Result<Json<serde_json::Value>> {
    let limit = q.limit.min(200) as usize;
    let offset = (q.page as usize).saturating_mul(limit);
    // Fetch enough rows from each source to satisfy the requested page.
    let fetch_count = (offset + limit) as u32;

    let level_filter = q.level.as_deref().filter(|s| !s.is_empty());
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
        let sqlite_rows = if let Some(db) = get_local_log_db_conn(&state).await {
            ensure_app_log_table(&db).await;
            query_sqlite_log_raw(&db, level_filter, cat_filter, fetch_count).await
        } else {
            Vec::new()
        };

        // Merge and sort descending by ts_unix
        let mut all_rows: Vec<(i64, serde_json::Value)> = mssql_rows
            .into_iter()
            .chain(sqlite_rows.into_iter())
            .map(|v| (v["ts_unix"].as_i64().unwrap_or(0), v))
            .collect();
        all_rows.sort_unstable_by(|a, b| b.0.cmp(&a.0));

        let total = all_rows.len() as i64;

        let entries: Vec<AppLogEntry> = all_rows
            .into_iter()
            .skip(offset)
            .take(limit)
            .map(|(_, v)| json_to_log_entry(&v))
            .collect();

        return Ok(Json(serde_json::json!({
            "entries": entries,
            "total":   total,
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
        _ => "",
    };
    let cat_sql = match cat_filter {
        Some(c) if !c.is_empty() => format!(" AND category = '{}'", c.replace('\'', "''")),
        _ => String::new(),
    };

    let sql = format!(
        "SELECT id, ts_unix, ts_fmt, level, category, source, hostname, role, device_serial, message, details \
         FROM T3_APP_LOG WHERE 1=1{}{} \
         ORDER BY ts_unix DESC LIMIT {} OFFSET {}",
        level_sql, cat_sql, limit, offset
    );

    let count_sql = format!(
        "SELECT COUNT(*) AS cnt FROM T3_APP_LOG WHERE 1=1{}{}",
        level_sql, cat_sql
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
    if let Some(db) = get_local_log_db_conn(&state).await {
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
// Router
// ============================================================================

pub fn sync_health_routes() -> Router<T3AppState> {
    Router::new()
        .route("/api/sync/health", get(get_sync_health))
        .route("/api/sync/health/ping", get(ping_center_db))
        .route("/api/sync/event-log", get(get_event_log))
        .route("/api/sync/event-log", post(post_event))
}
