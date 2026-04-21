// ============================================================================
// Server DB Writer — Global state for server/client dual-write support
// ============================================================================
//
// Provides a global static that the FFI sync service can access to write
// data to the server DB in addition to local SQLite. Set during startup
// by `start_all_services()` after T3AppState is created.

use once_cell::sync::OnceCell;
use sea_orm::{DatabaseConnection, EntityTrait, ActiveModelTrait};
use std::sync::Arc;
use tokio::sync::Mutex;

/// Global server DB state for the FFI sync service.
static SERVER_DB: OnceCell<ServerDbWriter> = OnceCell::new();

/// Holds the server DB connection and configuration for dual-write.
pub struct ServerDbWriter {
    /// SeaORM connection to the server DB (PG/MySQL). None if MSSQL.
    pub conn: Option<Arc<Mutex<DatabaseConnection>>>,
    /// MSSQL pool (if the server DB is MSSQL). None if SeaORM backend.
    pub mssql_pool: Option<crate::database_management::mssql_queries::MssqlPool>,
    /// PC role: "server" or "client"
    pub role: String,
    /// Whether server DB is actually enabled
    pub enabled: bool,
}

/// Initialize the global server DB writer. Called once during startup.
pub fn init_server_db_writer(
    conn: Option<Arc<Mutex<DatabaseConnection>>>,
    mssql_pool: Option<crate::database_management::mssql_queries::MssqlPool>,
    role: String,
    enabled: bool,
) {
    let _ = SERVER_DB.set(ServerDbWriter {
        conn,
        mssql_pool,
        role,
        enabled,
    });
}

/// Check if server DB dual-write is active for this PC (server role + enabled).
pub fn is_server_write_active() -> bool {
    SERVER_DB
        .get()
        .map(|w| w.enabled && w.role == "server")
        .unwrap_or(false)
}

/// Check if this PC should write trendlog detail to server (any role when enabled).
pub fn should_write_trendlog_to_server() -> bool {
    SERVER_DB
        .get()
        .map(|w| w.enabled)
        .unwrap_or(false)
}

/// Get a reference to the server SeaORM connection (for PG/MySQL dual-write).
/// Returns None if not enabled, not server role, or MSSQL backend.
pub fn get_server_conn() -> Option<&'static Arc<Mutex<DatabaseConnection>>> {
    SERVER_DB.get().and_then(|w| {
        if w.enabled && w.conn.is_some() {
            w.conn.as_ref()
        } else {
            None
        }
    })
}

/// Get the server MSSQL pool if the server backend is MSSQL **and** this PC is the server role.
/// Only the server-role PC should write FFI data directly to the MSSQL center DB.
/// Client-role PCs write to local SQLite instead.
pub fn get_server_mssql_pool() -> Option<&'static crate::database_management::mssql_queries::MssqlPool> {
    SERVER_DB.get().and_then(|w| {
        if w.enabled && w.role == "server" {
            w.mssql_pool.as_ref()
        } else {
            None
        }
    })
}

/// Helper: Execute a dual-write to server DB for a SeaORM insert.
/// Logs errors but does not fail — server write failure should not block local.
pub async fn dual_write_insert<E, A>(
    active_model: A,
    table_name: &str,
) where
    E: EntityTrait,
    A: ActiveModelTrait<Entity = E> + Send,
    <E as EntityTrait>::Model: sea_orm::IntoActiveModel<A>,
{
    if !is_server_write_active() {
        return;
    }

    if let Some(conn_arc) = get_server_conn() {
        let conn = conn_arc.lock().await;
        if let Err(e) = E::insert(active_model).exec(&*conn).await {
            // Log but don't fail — server write is best-effort
            tracing::warn!(
                "Server DB dual-write INSERT to {} failed: {}",
                table_name,
                e
            );
        }
    }
    // MSSQL center DB is handled by SyncWriter::MssqlDirect — not via this helper.
}

/// Helper: Write trendlog detail to server DB only (skipping local).
/// Used for TRENDLOG_DATA_DETAIL which is high-volume and goes to server only.
pub async fn server_only_insert<E, A>(
    active_model: A,
    table_name: &str,
) where
    E: EntityTrait,
    A: ActiveModelTrait<Entity = E> + Send,
    <E as EntityTrait>::Model: sea_orm::IntoActiveModel<A>,
{
    if !should_write_trendlog_to_server() {
        return;
    }

    if let Some(conn_arc) = get_server_conn() {
        let conn = conn_arc.lock().await;
        if let Err(e) = E::insert(active_model).exec(&*conn).await {
            tracing::warn!(
                "Server DB INSERT to {} failed: {}",
                table_name,
                e
            );
        }
    }
    // MSSQL center DB is handled by SyncWriter::MssqlDirect — not via this helper.
}
