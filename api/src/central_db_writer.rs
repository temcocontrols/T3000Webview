// ============================================================================
// Central DB Writer — Global state for multi-PC dual-write support
// ============================================================================
//
// Provides a global static that the FFI sync service can access to write
// data to the central DB in addition to local SQLite. Set during startup
// by `start_all_services()` after T3AppState is created.

use once_cell::sync::OnceCell;
use sea_orm::{DatabaseConnection, EntityTrait, ActiveModelTrait};
use std::sync::Arc;
use tokio::sync::Mutex;

/// Global central DB state for the FFI sync service.
static CENTRAL_DB: OnceCell<CentralDbWriter> = OnceCell::new();

/// Holds the central DB connection and configuration for dual-write.
pub struct CentralDbWriter {
    /// SeaORM connection to the central DB (PG/MySQL). None if MSSQL.
    pub conn: Option<Arc<Mutex<DatabaseConnection>>>,
    /// MSSQL pool (if the central DB is MSSQL). None if SeaORM backend.
    pub mssql_pool: Option<crate::database_management::mssql_queries::MssqlPool>,
    /// PC role: "main" or "reader"
    pub role: String,
    /// Whether central DB is actually enabled
    pub enabled: bool,
}

/// Initialize the global central DB writer. Called once during startup.
pub fn init_central_db_writer(
    conn: Option<Arc<Mutex<DatabaseConnection>>>,
    mssql_pool: Option<crate::database_management::mssql_queries::MssqlPool>,
    role: String,
    enabled: bool,
) {
    let _ = CENTRAL_DB.set(CentralDbWriter {
        conn,
        mssql_pool,
        role,
        enabled,
    });
}

/// Check if central DB dual-write is active for this PC (main role + enabled).
pub fn is_central_write_active() -> bool {
    CENTRAL_DB
        .get()
        .map(|w| w.enabled && w.role == "main")
        .unwrap_or(false)
}

/// Check if this PC should write trendlog detail to central (any role when enabled).
pub fn should_write_trendlog_detail_to_central() -> bool {
    CENTRAL_DB
        .get()
        .map(|w| w.enabled)
        .unwrap_or(false)
}

/// Get a reference to the central SeaORM connection (for PG/MySQL dual-write).
/// Returns None if not enabled, not main role, or MSSQL backend.
pub fn get_central_conn() -> Option<&'static Arc<Mutex<DatabaseConnection>>> {
    CENTRAL_DB.get().and_then(|w| {
        if w.enabled && w.conn.is_some() {
            w.conn.as_ref()
        } else {
            None
        }
    })
}

/// Get the central MSSQL pool if the central backend is MSSQL.
pub fn get_central_mssql_pool() -> Option<&'static crate::database_management::mssql_queries::MssqlPool> {
    CENTRAL_DB.get().and_then(|w| {
        if w.enabled {
            w.mssql_pool.as_ref()
        } else {
            None
        }
    })
}

/// Helper: Execute a dual-write to central DB for a SeaORM insert.
/// Logs errors but does not fail — central write failure should not block local.
pub async fn dual_write_insert<E, A>(
    active_model: A,
    table_name: &str,
) where
    E: EntityTrait,
    A: ActiveModelTrait<Entity = E> + Send,
    <E as EntityTrait>::Model: sea_orm::IntoActiveModel<A>,
{
    if !is_central_write_active() {
        return;
    }

    if let Some(conn_arc) = get_central_conn() {
        let conn = conn_arc.lock().await;
        if let Err(e) = E::insert(active_model).exec(&*conn).await {
            // Log but don't fail — central write is best-effort
            tracing::warn!(
                "Central DB dual-write INSERT to {} failed: {}",
                table_name,
                e
            );
        }
    }
    // TODO: MSSQL dual-write via mssql_queries (future enhancement)
}

/// Helper: Write trendlog detail to central DB only (skipping local).
/// Used for TRENDLOG_DATA_DETAIL which is high-volume and goes to central only.
pub async fn central_only_insert<E, A>(
    active_model: A,
    table_name: &str,
) where
    E: EntityTrait,
    A: ActiveModelTrait<Entity = E> + Send,
    <E as EntityTrait>::Model: sea_orm::IntoActiveModel<A>,
{
    if !should_write_trendlog_detail_to_central() {
        return;
    }

    if let Some(conn_arc) = get_central_conn() {
        let conn = conn_arc.lock().await;
        if let Err(e) = E::insert(active_model).exec(&*conn).await {
            tracing::warn!(
                "Central DB INSERT to {} failed: {}",
                table_name,
                e
            );
        }
    }
    // TODO: MSSQL central-only write via mssql_queries (future enhancement)
}
