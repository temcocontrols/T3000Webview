use std::time::Duration;

use crate::utils::{DATABASE_URL, T3_DEVICE_DATABASE_URL};

use sea_orm::{ConnectOptions, Database, DatabaseConnection};

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
    opt.max_connections(200)  // 🆕 PERFORMANCE: Increased from 100 to 200 for better concurrent request handling
        .min_connections(10)  // 🆕 PERFORMANCE: Increased from 5 to 10 to maintain ready connections
        .connect_timeout(Duration::from_secs(8))
        .acquire_timeout(Duration::from_secs(8))
        .idle_timeout(Duration::from_secs(30))  // 🆕 PERFORMANCE: Increased from 8s to 30s to reuse connections
        .max_lifetime(Duration::from_secs(300))  // 🆕 PERFORMANCE: Increased from 8s to 5min for connection reuse during bursts
        // SQLite-specific optimizations for better concurrency
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

    Ok(db)
}
