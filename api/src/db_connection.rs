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
    opt.max_connections(100)
        .min_connections(5)
        .connect_timeout(Duration::from_secs(8))
        .acquire_timeout(Duration::from_secs(8))
        .idle_timeout(Duration::from_secs(8))
        .max_lifetime(Duration::from_secs(8))
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

    Ok(db)
}
