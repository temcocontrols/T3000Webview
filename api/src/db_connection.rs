use std::time::Duration;

use crate::database_management::db_backend_config::{
    self, BackendConfig, BackendType,
};
use crate::device_db_conn::DeviceDbConn;
use crate::utils::{DATABASE_URL, T3_DEVICE_DATABASE_URL};

use sea_orm::{ConnectOptions, ConnectionTrait, Database, DatabaseBackend, DatabaseConnection, Statement};

pub async fn establish_connection() -> Result<DatabaseConnection, Box<dyn std::error::Error>> {
    let mut opt = ConnectOptions::new(DATABASE_URL.as_str());
    opt.max_connections(4)
        .min_connections(1)
        .connect_timeout(Duration::from_secs(8))
        .acquire_timeout(Duration::from_secs(8))
        .idle_timeout(Duration::from_secs(3))
        .max_lifetime(Duration::from_secs(60))
        .sqlx_logging(false);

    Database::connect(opt).await.map_err(|error| error.into())
}

/// Establish connection to the webview T3000 database
pub async fn establish_t3_device_connection() -> Result<DatabaseConnection, Box<dyn std::error::Error>> {
    let mut opt = ConnectOptions::new(T3_DEVICE_DATABASE_URL.as_str());
    // SQLite only supports 1 writer at a time. Large pools cause WAL lock contention.
    // Keep this small: multiple readers are fine in WAL mode, but 200 connections all
    // reading a large WAL file simultaneously is counterproductive.
    opt.max_connections(5)
        .min_connections(2)
        .connect_timeout(Duration::from_secs(8))
        .acquire_timeout(Duration::from_secs(8))
        .idle_timeout(Duration::from_secs(60))
        .max_lifetime(Duration::from_secs(300))
        .sqlx_logging(false);

    let db = Database::connect(opt).await?;

    // Enable WAL mode for better concurrent write performance
    // WAL (Write-Ahead Logging) allows readers to access the database while writes are in progress
    use sea_orm::ConnectionTrait;
    db.execute(sea_orm::Statement::from_string(
        sea_orm::DatabaseBackend::Sqlite,
        "PRAGMA journal_mode = WAL;".to_owned()
    )).await?;

    // Increase busy timeout to 30 seconds to handle database locks gracefully
    // This gives SQLite more time to wait for locks instead of failing immediately
    db.execute(sea_orm::Statement::from_string(
        sea_orm::DatabaseBackend::Sqlite,
        "PRAGMA busy_timeout = 30000;".to_owned()
    )).await?;

    // Optimize synchronous mode for better performance with WAL
    db.execute(sea_orm::Statement::from_string(
        sea_orm::DatabaseBackend::Sqlite,
        "PRAGMA synchronous = NORMAL;".to_owned()
    )).await?;

    // 🆕 PERFORMANCE: Increase cache size for better query performance
    // Default is -2000 (2MB), increase to -64000 (64MB)
    db.execute(sea_orm::Statement::from_string(
        sea_orm::DatabaseBackend::Sqlite,
        "PRAGMA cache_size = -64000;".to_owned()
    )).await?;

    // WAL autocheckpoint: Checkpoint when WAL reaches 1000 pages (~4MB)
    // Smaller WAL = shorter checkpoint times = less lock contention
    // Default is 1000, which is optimal for most workloads
    db.execute(sea_orm::Statement::from_string(
        sea_orm::DatabaseBackend::Sqlite,
        "PRAGMA wal_autocheckpoint = 1000;".to_owned()
    )).await?;

    // 🆕 FIX: Set locking mode to NORMAL for better concurrency
    // This allows multiple readers while a writer is active
    db.execute(sea_orm::Statement::from_string(
        sea_orm::DatabaseBackend::Sqlite,
        "PRAGMA locking_mode = NORMAL;".to_owned()
    )).await?;

    // 🆕 FIX: Increase page size for better performance with large datasets (308K+ records)
    // Note: This only affects new databases, existing ones keep their page size
    db.execute(sea_orm::Statement::from_string(
        sea_orm::DatabaseBackend::Sqlite,
        "PRAGMA page_size = 4096;".to_owned()
    )).await?;

    // 🆕 FIX: Enable memory-mapped I/O for faster reads (helps with large datasets)
    // Map up to 256MB of database into memory
    db.execute(sea_orm::Statement::from_string(
        sea_orm::DatabaseBackend::Sqlite,
        "PRAGMA mmap_size = 268435456;".to_owned()
    )).await?;

    // Force WAL checkpoint on startup to clear any accumulated WAL file
    // This prevents starting with a large WAL that causes lock contention
    db.execute(sea_orm::Statement::from_string(
        sea_orm::DatabaseBackend::Sqlite,
        "PRAGMA wal_checkpoint(TRUNCATE);".to_owned()
    )).await.ok(); // Ignore errors - checkpoint might fail if database is busy

    // Ensure critical indexes exist on the live database.
    // The runtime DB may have been created by T3000.exe before Rust migrations ran.
    for sql in [
        "CREATE INDEX IF NOT EXISTS IDX_INPUTS_SERIAL ON INPUTS(SerialNumber);",
        "CREATE INDEX IF NOT EXISTS IDX_OUTPUTS_SERIAL ON OUTPUTS(SerialNumber);",
        "CREATE INDEX IF NOT EXISTS IDX_VARIABLES_SERIAL ON VARIABLES(SerialNumber);",
    ] {
        db.execute(sea_orm::Statement::from_string(
            sea_orm::DatabaseBackend::Sqlite,
            sql.to_owned()
        )).await.ok();
    }

    Ok(db)
}

// ============================================================================
// Backend-Aware Connection (Phase 2)
// ============================================================================

/// Establish a device database connection based on the active backend config.
///
/// 1. Opens local SQLite (`webview_t3_device.db`) to read `DB_BACKEND_CONFIG`.
/// 2. Determines which backend is active.
/// 3. If SQLite → reuses the same local connection (default, same as today).
/// 4. If Postgres/MySQL → builds a SeaORM URL and connects.
/// 5. If MSSQL → builds a tiberius Config and creates a bb8 connection pool.
///
/// Returns `(DeviceDbConn, BackendConfig)` so callers know which backend was chosen.
pub async fn establish_device_conn_from_config(
    local_conn: &DatabaseConnection,
) -> Result<(DeviceDbConn, BackendConfig), Box<dyn std::error::Error>> {
    let config = db_backend_config::load_active_config(local_conn).await?;

    match config.backend_type {
        BackendType::Sqlite => {
            // Use the standard local SQLite connection
            let conn = establish_t3_device_connection().await?;
            Ok((
                DeviceDbConn::new_sea_orm(conn, BackendType::Sqlite),
                config,
            ))
        }
        BackendType::Postgres | BackendType::Mysql => {
            db_backend_config::validate_config(&config)?;
            let url = db_backend_config::build_seaorm_url(&config)?;

            let mut opt = ConnectOptions::new(&url);
            opt.max_connections(10)
                .min_connections(2)
                .connect_timeout(Duration::from_secs(10))
                .acquire_timeout(Duration::from_secs(10))
                .idle_timeout(Duration::from_secs(60))
                .max_lifetime(Duration::from_secs(300))
                .sqlx_logging(false);

            let conn = Database::connect(opt).await?;
            Ok((
                DeviceDbConn::new_sea_orm(conn, config.backend_type),
                config,
            ))
        }
        BackendType::Mssql => {
            db_backend_config::validate_config(&config)?;
            let tib_config = db_backend_config::build_mssql_config(&config)?;
            let pool = crate::database_management::mssql_queries::create_mssql_pool(tib_config, 10)
                .await
                .map_err(|e| -> Box<dyn std::error::Error> { e.into() })?;
            Ok((DeviceDbConn::new_mssql(pool), config))
        }
    }
}

pub async fn validate_seaorm_backend_schema(
    conn: &DatabaseConnection,
    backend_type: BackendType,
) -> Result<(), Box<dyn std::error::Error>> {
    let (db_backend, sql) = match backend_type {
        BackendType::Sqlite => (
            DatabaseBackend::Sqlite,
            "SELECT COUNT(*) AS cnt FROM sqlite_master WHERE type = 'table' AND name IN ('DEVICES', 'DATA_SYNC_METADATA')",
        ),
        BackendType::Postgres => (
            DatabaseBackend::Postgres,
            "SELECT COUNT(*) AS cnt FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('devices', 'data_sync_metadata')",
        ),
        BackendType::Mysql => (
            DatabaseBackend::MySql,
            "SELECT COUNT(*) AS cnt FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name IN ('DEVICES', 'DATA_SYNC_METADATA')",
        ),
        BackendType::Mssql => {
            return Err("MSSQL schema validation must use the tiberius pool path".into());
        }
    };

    let row = conn
        .query_one(Statement::from_string(db_backend, sql.to_string()))
        .await?;

    let table_count = row
        .and_then(|r| r.try_get_by_index::<i64>(0).ok())
        .unwrap_or(0);

    if table_count >= 2 {
        Ok(())
    } else {
        Err("Connected to database, but the T3000 schema is not initialized".into())
    }
}

pub async fn validate_device_conn_ready(
    device_conn: &DeviceDbConn,
) -> Result<(), Box<dyn std::error::Error>> {
    match device_conn {
        DeviceDbConn::SeaOrm { conn, backend_type } => {
            validate_seaorm_backend_schema(conn, *backend_type).await
        }
        DeviceDbConn::Mssql { pool } => crate::database_management::mssql_queries::validate_t3000_schema(pool)
            .await
            .map_err(|e| -> Box<dyn std::error::Error> { e.into() }),
    }
}

// ============================================================================
// INI-Aware Device Connection (for background services)
// ============================================================================

/// Connect to the correct device database based on the current INI config.
///
/// - If `setting.ini [ServerDatabase] enabled=1`, reads `DB_BACKEND_CONFIG`
///   from local SQLite and returns a SeaORM connection to the center DB
///   (Postgres / MySQL). For MSSQL backends, falls back to local SQLite
///   because the FFI sync service requires a SeaORM `DatabaseConnection`.
/// - Otherwise returns a local SQLite connection.
///
/// This function is designed for background services (like the FFI sync service)
/// that cannot access `T3AppState` but still need to write to the correct DB.
pub async fn establish_device_conn_for_sync() -> Result<DatabaseConnection, Box<dyn std::error::Error>> {
    let ini_cfg = crate::ini_config::read_server_db_config_auto();

    if !ini_cfg.enabled {
        // Classic mode: use local SQLite
        return establish_t3_device_connection().await;
    }

    // Server DB mode: open local SQLite to read DB_BACKEND_CONFIG, then connect to center DB
    let local_conn = establish_t3_device_connection().await?;

    match establish_device_conn_from_config(&local_conn).await {
        Ok((device_conn, config)) => {
            match device_conn {
                DeviceDbConn::SeaOrm { conn, .. } => {
                    tracing::info!(
                        "FFI sync connected to center DB: {} (role={})",
                        config.backend_type, ini_cfg.role
                    );
                    Ok(conn)
                }
                DeviceDbConn::Mssql { .. } => {
                    // MSSQL uses tiberius pool, not SeaORM — this function returns SeaORM conn.
                    // The FFI sync service detects the MSSQL pool via get_server_mssql_pool()
                    // and writes directly via SyncWriter::MssqlDirect, so this branch is only
                    // reached when an explicit SeaORM conn to MSSQL is requested elsewhere.
                    tracing::warn!(
                        "MSSQL backend active — returning local SQLite (MSSQL direct writes handled by SyncWriter)"
                    );
                    Ok(local_conn)
                }
            }
        }
        Err(e) => {
            tracing::warn!(
                "Center DB connect failed, FFI sync falling back to local SQLite: {:?}", e
            );
            Ok(local_conn)
        }
    }
}
