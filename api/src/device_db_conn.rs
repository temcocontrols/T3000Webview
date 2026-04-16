//! DeviceDbConn - Unified database connection adapter for multi-backend support
//!
//! Wraps either a SeaORM DatabaseConnection (SQLite, PostgreSQL, MySQL)
//! or a bb8 connection pool for SQL Server (tiberius).
//!
//! Existing code that uses `DatabaseConnection` continues to work unchanged
//! for all SeaORM backends. MSSQL requires a separate code path.

use sea_orm::DatabaseConnection;

use crate::database_management::mssql_queries::MssqlPool;

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
    /// SQL Server connection via tiberius + bb8 pool
    Mssql {
        pool: MssqlPool,
    },
}

impl DeviceDbConn {
    /// Create a new SeaORM-backed connection (SQLite, PG, MySQL)
    pub fn new_sea_orm(conn: DatabaseConnection, backend_type: BackendType) -> Self {
        DeviceDbConn::SeaOrm { conn, backend_type }
    }

    /// Create a new MSSQL-backed connection
    pub fn new_mssql(pool: MssqlPool) -> Self {
        DeviceDbConn::Mssql { pool }
    }

    /// Get the inner SeaORM DatabaseConnection (for SQLite/PG/MySQL).
    /// Returns None for MSSQL.
    pub fn as_sea_orm(&self) -> Option<&DatabaseConnection> {
        match self {
            DeviceDbConn::SeaOrm { conn, .. } => Some(conn),
            DeviceDbConn::Mssql { .. } => None,
        }
    }

    /// Get the MSSQL connection pool.
    /// Returns None for SeaORM backends.
    pub fn as_mssql_pool(&self) -> Option<&MssqlPool> {
        match self {
            DeviceDbConn::SeaOrm { .. } => None,
            DeviceDbConn::Mssql { pool } => Some(pool),
        }
    }

    /// Which backend type is this connection for?
    pub fn backend_type(&self) -> BackendType {
        match self {
            DeviceDbConn::SeaOrm { backend_type, .. } => *backend_type,
            DeviceDbConn::Mssql { .. } => BackendType::Mssql,
        }
    }

    /// Convenience: unwrap the SeaORM connection or panic.
    /// Safe to call when you know the backend is not MSSQL.
    pub fn sea_orm(&self) -> &DatabaseConnection {
        self.as_sea_orm()
            .expect("Expected SeaORM connection but got MSSQL")
    }
}
