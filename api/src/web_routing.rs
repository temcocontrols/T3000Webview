//! Web Routing Helpers for Server/Client Database
//!
//! Provides utility functions that route handlers use to determine which
//! database connection to use based on the current server DB mode.
//!
//! ## Connection Rules
//!
//! | Category | server_db_enabled=false | server_db_enabled=true |
//! |----------|------------------------|------------------------|
//! | A–F (device data) | `t3_device_conn` (local) | `t3_device_conn` (server) |
//! | G (local-only config) | `local_config_conn` (local) | `local_config_conn` (local) |


use axum::{
    extract::State,
    http::StatusCode,
    response::Json,
    routing::get,
    Router,
};
use sea_orm::Database;
use serde::Serialize;
use std::time::{Duration, Instant};
use tracing::{info, warn};

use crate::app_state::T3AppState;
use crate::database_management::db_backend_config::{self, BackendConfig, BackendType};

const CENTER_DB_HEALTH_TIMEOUT: Duration = Duration::from_secs(2);
const CENTER_DB_HEALTH_TOTAL_TIMEOUT: Duration = Duration::from_secs(4);

/// Response for the server DB status endpoint.
#[derive(Debug, Serialize)]
pub struct ServerDbStatus {
    /// Whether server DB mode is enabled (from setting.ini)
    pub enabled: bool,
    /// PC role: "server" or "client"
    pub role: String,
    /// Whether the server DB connection is active (t3_device_conn is Some)
    pub server_connected: bool,
    /// Detailed center DB runtime state.
    pub center_db_status: String,
    /// Human-readable center DB status message.
    pub center_db_message: Option<String>,
    /// Backend configured for Shared DB mode.
    pub configured_backend: String,
    /// Backend currently servicing device data at runtime.
    pub runtime_backend: String,
    /// Whether writes are blocked because Shared DB mode is enabled but center DB is unavailable.
    pub writes_blocked: bool,
    /// Whether schema initialization is a valid next action.
    pub can_init_schema: bool,
    /// Whether MSSQL pool is available
    pub mssql_pool_active: bool,
    /// Local config connection status
    pub local_config_available: bool,
    /// Hostname of this PC
    pub hostname: String,
    /// Configured center DB host, if any.
    pub host: Option<String>,
    /// Configured center DB port, if any.
    pub port: Option<i32>,
    /// Configured center DB database name, if any.
    pub database_name: Option<String>,
}

async fn probe_mssql_connection(config: tiberius::Config) -> Result<(), String> {
    use tokio::net::TcpStream;
    use tokio_util::compat::TokioAsyncWriteCompatExt;

    let tcp = TcpStream::connect(config.get_addr())
        .await
        .map_err(|e| format!("TCP connection failed: {}", e))?;

    tcp.set_nodelay(true)
        .map_err(|e| format!("Failed to set TCP_NODELAY: {}", e))?;

    let mut client = tiberius::Client::connect(config, tcp.compat_write())
        .await
        .map_err(|e| format!("MSSQL authentication failed: {}", e))?;

    let _row = client
        .simple_query("SELECT 1 AS alive")
        .await
        .map_err(|e| format!("MSSQL query failed: {}", e))?
        .into_row()
        .await
        .map_err(|e| format!("MSSQL row fetch failed: {}", e))?;

    Ok(())
}

async fn probe_mssql_connection_with_timeout(config: tiberius::Config) -> Result<(), String> {
    match tokio::time::timeout(CENTER_DB_HEALTH_TIMEOUT, probe_mssql_connection(config)).await {
        Ok(result) => result,
        Err(_) => Err("SQL Server probe timed out".to_string()),
    }
}

async fn validate_mssql_schema_with_timeout(config: tiberius::Config) -> Result<(), String> {
    match tokio::time::timeout(
        CENTER_DB_HEALTH_TIMEOUT,
        async move {
            let pool = crate::database_management::mssql_queries::create_mssql_pool(config, 1).await?;
            crate::database_management::mssql_queries::validate_t3000_schema(&pool).await
        },
    )
    .await
    {
        Ok(result) => result,
        Err(_) => Err("SQL Server schema validation timed out".to_string()),
    }
}

fn classify_target_db_probe_error(db_name: &str, raw_error: &str) -> (String, Option<String>, bool) {
    let lower = raw_error.to_ascii_lowercase();

    if lower.contains("cannot open database")
        || lower.contains("does not exist")
        || lower.contains("unknown database")
    {
        return (
            "db_missing".to_string(),
            Some(format!(
                "SQL Server is reachable, but database '{}' does not exist or cannot be opened.",
                db_name
            )),
            true,
        );
    }

    if lower.contains("login failed") || lower.contains("authentication failed") {
        return (
            "misconfigured_backend".to_string(),
            Some("SQL Server is reachable, but authentication to the target database failed. Check username/password and permissions.".to_string()),
            false,
        );
    }

    (
        "server_unreachable".to_string(),
        Some(user_friendly_unreachable_message(raw_error)),
        false,
    )
}

fn user_friendly_unreachable_message(raw: &str) -> String {
    let lower = raw.to_ascii_lowercase();
    if lower.contains("10060") || lower.contains("timed out") {
        "SQL Server is unreachable (connection timed out). Check server host, port, and firewall."
            .to_string()
    } else {
        "SQL Server is unreachable. Check server host, port, network, and SQL Server service."
            .to_string()
    }
}

async fn resolve_live_center_db_state(
    active_config: Option<&BackendConfig>,
) -> (bool, String, Option<String>, bool) {
    let Some(config) = active_config else {
        return (
            false,
            "misconfigured_backend".to_string(),
            Some("Shared DB mode is enabled, but no active backend configuration was found.".to_string()),
            false,
        );
    };

    match config.backend_type {
        BackendType::Sqlite => (
            false,
            "misconfigured_backend".to_string(),
            Some("Shared DB mode is enabled, but the active backend is not configured to a center database.".to_string()),
            false,
        ),
        BackendType::Mssql => {
            let probe_started = Instant::now();
            let outcome = match tokio::time::timeout(CENTER_DB_HEALTH_TOTAL_TIMEOUT, async {
                let mut master_config = config.clone();
                master_config.database_name = Some("master".to_string());
                let master_tib = db_backend_config::build_mssql_config(&master_config)
                    .map_err(|e| ("misconfigured_backend".to_string(), Some(e), false))?;

                if let Err(e) = probe_mssql_connection_with_timeout(master_tib).await {
                    return Err((
                        "server_unreachable".to_string(),
                        Some(user_friendly_unreachable_message(&e)),
                        false,
                    ));
                }

                let target_tib = db_backend_config::build_mssql_config(config)
                    .map_err(|e| ("misconfigured_backend".to_string(), Some(e), false))?;

                if let Err(e) = probe_mssql_connection_with_timeout(target_tib).await {
                    let db_name = config.database_name.clone().unwrap_or_else(|| "(unknown)".to_string());
                    return Err(classify_target_db_probe_error(&db_name, &e));
                }

                let schema_tib = db_backend_config::build_mssql_config(config)
                    .map_err(|e| ("misconfigured_backend".to_string(), Some(e), false))?;

                match validate_mssql_schema_with_timeout(schema_tib).await {
                    Ok(()) => Ok((
                        true,
                        "healthy".to_string(),
                        Some("Connected to the shared SQL Server database.".to_string()),
                        false,
                    )),
                    Err(e) if e.contains("not initialized") => Err((
                        "schema_missing".to_string(),
                        Some("SQL Server is reachable and the database exists, but the T3000 schema is not initialized.".to_string()),
                        true,
                    )),
                    Err(e) => Err((
                        "server_unreachable".to_string(),
                        Some(user_friendly_unreachable_message(&e)),
                        false,
                    )),
                }
            })
            .await
            {
                Ok(Ok(success)) => success,
                Ok(Err((status, message, can_init))) => (false, status, message, can_init),
                Err(_) => (
                    false,
                    "server_unreachable".to_string(),
                    Some("Center DB health check timed out. Showing latest known status; please retry.".to_string()),
                    false,
                ),
            };

            let probe_elapsed_ms = probe_started.elapsed().as_millis() as u64;
            let status_for_log = outcome.1.clone();
            if outcome.0 {
                info!(
                    center_db_status = %status_for_log,
                    elapsed_ms = probe_elapsed_ms,
                    "Center DB health probe completed"
                );
            } else {
                warn!(
                    center_db_status = %status_for_log,
                    elapsed_ms = probe_elapsed_ms,
                    "Center DB health probe degraded"
                );
            }

            outcome
        }
        BackendType::Postgres | BackendType::Mysql => {
            let url = match db_backend_config::build_seaorm_url(config) {
                Ok(url) => url,
                Err(e) => {
                    return (
                        false,
                        "misconfigured_backend".to_string(),
                        Some(e),
                        false,
                    );
                }
            };

            match Database::connect(&url).await {
                Ok(conn) => match crate::db_connection::validate_seaorm_backend_schema(&conn, config.backend_type).await {
                    Ok(()) => (
                        true,
                        "healthy".to_string(),
                        Some(format!("Connected to the shared {} database.", config.backend_type)),
                        false,
                    ),
                    Err(_) => (
                        false,
                        "schema_missing".to_string(),
                        Some(format!("{} is reachable, but the T3000 schema is not initialized.", config.backend_type)),
                        true,
                    ),
                },
                Err(e) => (
                    false,
                    "server_unreachable".to_string(),
                    Some(format!("Shared database is unreachable: {}", e)),
                    false,
                ),
            }
        }
    }
}

pub async fn resolve_server_db_status(state: &T3AppState) -> ServerDbStatus {
    let hostname = hostname::get()
        .map(|h| h.to_string_lossy().to_string())
        .unwrap_or_else(|_| "unknown".to_string());

    let active_config = if let Some(ref local_conn) = state.local_config_conn {
        let db = local_conn.lock().await;
        db_backend_config::load_active_config(&*db).await.ok()
    } else {
        None
    };

    let configured_backend = active_config
        .as_ref()
        .map(|cfg| cfg.backend_type.as_str().to_string())
        .unwrap_or_else(|| "unknown".to_string());

    let host = active_config.as_ref().and_then(|cfg| cfg.host.clone());
    let port = active_config.as_ref().and_then(|cfg| cfg.port);
    let database_name = active_config.as_ref().and_then(|cfg| cfg.database_name.clone());

    let (server_connected, center_db_status, center_db_message, can_init_schema) = if state.server_db_enabled {
        resolve_live_center_db_state(active_config.as_ref()).await
    } else {
        (
            false,
            "disabled".to_string(),
            Some("Shared DB mode is disabled. Running in standalone mode.".to_string()),
            false,
        )
    };

    let runtime_backend = if server_connected {
        configured_backend.clone()
    } else if state.t3_device_conn.is_some() {
        "sqlite".to_string()
    } else if state.mssql_pool.is_some() {
        "mssql".to_string()
    } else {
        configured_backend.clone()
    };

    // ── Auto-resume sampling after startup failure ─────────────────────────────
    // If sampling was paused at startup because center DB was unreachable, but the
    // live probe above just confirmed it is now reachable, rebuild the MSSQL pool
    // and clear the sampling pause so sync cycles resume automatically.
    if server_connected
        && state.server_db_role == "server"
        && crate::app_state::is_sampling_paused()
        && crate::server_db_writer::get_server_mssql_pool().is_none()
    {
        if let Some(cfg) = active_config.as_ref() {
            if matches!(cfg.backend_type, BackendType::Mssql) {
                if let Ok(tib) = db_backend_config::build_mssql_config(cfg) {
                    match crate::database_management::mssql_queries::create_mssql_pool(tib, 5).await {
                        Ok(pool) => {
                            crate::server_db_writer::set_reconnect_mssql_pool(pool);
                            crate::app_state::set_sampling_active();
                            info!("Center DB reconnected at runtime — MSSQL pool restored, sampling resumed");
                        }
                        Err(e) => {
                            warn!("Center DB probe succeeded but pool creation failed: {}", e);
                        }
                    }
                }
            }
        }
    }

    // Writes are blocked whenever center DB mode is enabled but the live probe
    // shows the center DB is unreachable — regardless of which backend type is
    // configured (MSSQL pool may still exist from startup but be non-functional).
    let writes_blocked = state.server_db_enabled && !server_connected;

    ServerDbStatus {
        enabled: state.server_db_enabled,
        role: state.server_db_role.clone(),
        server_connected,
        center_db_status,
        center_db_message,
        configured_backend,
        runtime_backend,
        writes_blocked,
        can_init_schema,
        // Also reflect a runtime-reconnected pool (created after startup failure).
        mssql_pool_active: state.mssql_pool.is_some()
            || crate::server_db_writer::get_server_mssql_pool().is_some(),
        local_config_available: state.local_config_conn.is_some(),
        hostname,
        host,
        port,
        database_name,
    }
}

/// Returns true if this PC is the server PC AND server DB is enabled,
/// meaning web writes should also be replicated to local SQLite.
pub fn should_dual_write_to_local(state: &T3AppState) -> bool {
    state.server_db_enabled && state.server_db_role == "server"
}

/// Returns true if this PC is a client (not the server PC).
pub fn is_client_pc(state: &T3AppState) -> bool {
    state.server_db_enabled && state.server_db_role == "client"
}

/// GET /api/database/server/status — returns the current server DB mode info
async fn server_db_status_handler(
    State(state): State<T3AppState>,
) -> Result<Json<ServerDbStatus>, StatusCode> {
    Ok(Json(resolve_server_db_status(&state).await))
}

/// Create routes for server DB status.
pub fn server_db_routes() -> Router<T3AppState> {
    Router::new()
        .route("/api/database/server/status", get(server_db_status_handler))
}
