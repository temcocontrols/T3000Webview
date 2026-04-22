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
use serde::Serialize;

use crate::app_state::T3AppState;

/// Response for the server DB status endpoint.
#[derive(Debug, Serialize)]
pub struct ServerDbStatus {
    /// Whether server DB mode is enabled (from setting.ini)
    pub enabled: bool,
    /// PC role: "server" or "client"
    pub role: String,
    /// Whether the server DB connection is active (t3_device_conn is Some)
    pub server_connected: bool,
    /// Whether MSSQL pool is available
    pub mssql_pool_active: bool,
    /// Local config connection status
    pub local_config_available: bool,
    /// Hostname of this PC
    pub hostname: String,
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
    let hostname = hostname::get()
        .map(|h| h.to_string_lossy().to_string())
        .unwrap_or_else(|_| "unknown".to_string());

    Ok(Json(ServerDbStatus {
        enabled: state.server_db_enabled,
        role: state.server_db_role.clone(),
        server_connected: state.server_db_connected, // true only when center DB actually connected
        mssql_pool_active: state.mssql_pool.is_some(),
        local_config_available: state.local_config_conn.is_some(),
        hostname,
    }))
}

/// Create routes for server DB status.
pub fn server_db_routes() -> Router<T3AppState> {
    Router::new()
        .route("/api/database/server/status", get(server_db_status_handler))
}
