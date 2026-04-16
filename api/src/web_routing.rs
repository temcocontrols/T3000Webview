//! Web Routing Helpers for Multi-PC Centralized Database
//!
//! Provides utility functions that route handlers use to determine which
//! database connection to use based on the current central DB mode.
//!
//! ## Connection Rules
//!
//! | Category | central_db_enabled=false | central_db_enabled=true |
//! |----------|------------------------|------------------------|
//! | A–F (device data) | `t3_device_conn` (local) | `t3_device_conn` (central) |
//! | G (local-only config) | `local_config_conn` (local) | `local_config_conn` (local) |
//! | H (system logs) | central if `store_logs` | central if `store_logs` |

use axum::{
    extract::State,
    http::StatusCode,
    response::Json,
    routing::get,
    Router,
};
use serde::Serialize;

use crate::app_state::T3AppState;

/// Response for the central DB status endpoint.
#[derive(Debug, Serialize)]
pub struct CentralDbStatus {
    /// Whether centralized DB mode is enabled (from setting.ini)
    pub enabled: bool,
    /// PC role: "main" or "reader"
    pub role: String,
    /// Whether system logs are routed to central DB
    pub store_logs: bool,
    /// Whether the central DB connection is active (t3_device_conn is Some)
    pub central_connected: bool,
    /// Whether MSSQL pool is available
    pub mssql_pool_active: bool,
    /// Local config connection status
    pub local_config_available: bool,
    /// Hostname of this PC
    pub hostname: String,
}

/// Returns true if this PC is the main PC AND central DB is enabled,
/// meaning web writes should also be replicated to local SQLite.
pub fn should_dual_write_to_local(state: &T3AppState) -> bool {
    state.central_db_enabled && state.central_db_role == "main"
}

/// Returns true if this PC is a reader (not the main PC).
pub fn is_reader_pc(state: &T3AppState) -> bool {
    state.central_db_enabled && state.central_db_role == "reader"
}

/// GET /api/database/central/status — returns the current central DB mode info
async fn central_db_status_handler(
    State(state): State<T3AppState>,
) -> Result<Json<CentralDbStatus>, StatusCode> {
    let hostname = hostname::get()
        .map(|h| h.to_string_lossy().to_string())
        .unwrap_or_else(|_| "unknown".to_string());

    Ok(Json(CentralDbStatus {
        enabled: state.central_db_enabled,
        role: state.central_db_role.clone(),
        store_logs: state.store_logs_to_central,
        central_connected: state.t3_device_conn.is_some(),
        mssql_pool_active: state.mssql_pool.is_some(),
        local_config_available: state.local_config_conn.is_some(),
        hostname,
    }))
}

/// Create routes for central DB status.
pub fn central_db_routes() -> Router<T3AppState> {
    Router::new()
        .route("/api/database/central/status", get(central_db_status_handler))
}
