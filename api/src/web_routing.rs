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

use crate::app_state::T3AppState;
use crate::database_management::db_backend_config::{self, BackendConfig, BackendType};

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
    /// Whether local SQLite fallback is active.
    pub fallback_active: bool,
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
            Some("Shared DB mode is enabled, but the active backend is still local SQLite.".to_string()),
            false,
        ),
        BackendType::Mssql => {
            let mut master_config = config.clone();
            master_config.database_name = Some("master".to_string());
            let master_tib = match db_backend_config::build_mssql_config(&master_config) {
                Ok(cfg) => cfg,
                Err(e) => {
                    return (
                        false,
                        "misconfigured_backend".to_string(),
                        Some(e),
                        false,
                    );
                }
            };

            if let Err(e) = probe_mssql_connection(master_tib).await {
                return (
                    false,
                    "server_unreachable".to_string(),
                    Some(format!("SQL Server is unreachable: {}", e)),
                    false,
                );
            }

            let target_tib = match db_backend_config::build_mssql_config(config) {
                Ok(cfg) => cfg,
                Err(e) => {
                    return (
                        false,
                        "misconfigured_backend".to_string(),
                        Some(e),
                        false,
                    );
                }
            };

            if probe_mssql_connection(target_tib).await.is_err() {
                let db_name = config.database_name.clone().unwrap_or_else(|| "(unknown)".to_string());
                return (
                    false,
                    "db_missing".to_string(),
                    Some(format!("SQL Server is reachable, but database '{}' does not exist or cannot be opened.", db_name)),
                    true,
                );
            }

            let schema_tib = match db_backend_config::build_mssql_config(config) {
                Ok(cfg) => cfg,
                Err(e) => {
                    return (
                        false,
                        "misconfigured_backend".to_string(),
                        Some(e),
                        false,
                    );
                }
            };

            match crate::database_management::mssql_queries::create_mssql_pool(schema_tib, 1).await {
                Ok(pool) => match crate::database_management::mssql_queries::validate_t3000_schema(&pool).await {
                    Ok(()) => (
                        true,
                        "healthy".to_string(),
                        Some("Connected to the shared SQL Server database.".to_string()),
                        false,
                    ),
                    Err(_) => (
                        false,
                        "schema_missing".to_string(),
                        Some("SQL Server is reachable and the database exists, but the T3000 schema is not initialized.".to_string()),
                        true,
                    ),
                },
                Err(e) => (
                    false,
                    "server_unreachable".to_string(),
                    Some(format!("SQL Server is unreachable: {}", e)),
                    false,
                ),
            }
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

    let fallback_active = state.server_db_enabled && !server_connected && runtime_backend == "sqlite";

    ServerDbStatus {
        enabled: state.server_db_enabled,
        role: state.server_db_role.clone(),
        server_connected,
        center_db_status,
        center_db_message,
        configured_backend,
        runtime_backend,
        fallback_active,
        can_init_schema,
        mssql_pool_active: state.mssql_pool.is_some(),
        local_config_available: state.local_config_conn.is_some(),
        hostname,
        host,
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
