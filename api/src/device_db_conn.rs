//! DeviceDbConn - Unified database connection adapter for multi-backend support
//!
//! Wraps either a SeaORM DatabaseConnection (SQLite, PostgreSQL, MySQL)
//! or a bb8 connection pool for SQL Server (tiberius).
//!
//! Existing code that uses `DatabaseConnection` continues to work unchanged
//! for all SeaORM backends. MSSQL requires a separate code path.

use sea_orm::DatabaseConnection;

/// Supported database backend types (re-exported from db_backend_config)
pub use crate::database_management::db_backend_config::BackendType;

/// Unified device database connection wrapper.
///
/// - `SeaOrm` variant: used for SQLite, PostgreSQL, MySQL (all SeaORM-supported backends)
/// - `Mssql` variant: used for SQL Server via tiberius + bb8 connection pool
///
/// Most existing code calls `as_sea_orm()` to get the inner `DatabaseConnection`.
/// This works unchanged for SQLite/PG/MySQL. Only MSSQL-specific code paths
/// need to call `as_mssql_pool()`.
pub enum DeviceDbConn {
    /// SeaORM connection — works with SQLite, PostgreSQL, MySQL
    SeaOrm {
        conn: DatabaseConnection,
        backend_type: BackendType,
    },
    // Future: MSSQL variant will be added in Phase 5
    // Mssql(bb8::Pool<TiberiusConnectionManager>),
}

impl DeviceDbConn {
    /// Create a new SeaORM-backed connection (SQLite, PG, MySQL)
    pub fn new_sea_orm(conn: DatabaseConnection, backend_type: BackendType) -> Self {
        DeviceDbConn::SeaOrm { conn, backend_type }
    }

    /// Get the inner SeaORM DatabaseConnection (for SQLite/PG/MySQL).
    /// Returns None for MSSQL.
    pub fn as_sea_orm(&self) -> Option<&DatabaseConnection> {
        match self {
            DeviceDbConn::SeaOrm { conn, .. } => Some(conn),
        }
    }

    /// Which backend type is this connection for?
    pub fn backend_type(&self) -> BackendType {
        match self {
            DeviceDbConn::SeaOrm { backend_type, .. } => *backend_type,
        }
    }

    /// Convenience: unwrap the SeaORM connection or panic.
    /// Safe to call when you know the backend is not MSSQL.
    pub fn sea_orm(&self) -> &DatabaseConnection {
        self.as_sea_orm()
            .expect("Expected SeaORM connection but got MSSQL")
    }
}
