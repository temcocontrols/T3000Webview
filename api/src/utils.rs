use lazy_static::lazy_static;
use migration::{Migrator, MigratorTrait};
use std::{env, fs, path::Path, sync::Arc};
use tokio::sync::{mpsc, Mutex};

use crate::db_connection::establish_connection;

// Define static references for environment variables using lazy_static.
lazy_static! {
    // DATABASE_URL is set from environment variable or defaults to a local SQLite database.
    pub static ref DATABASE_URL: String = env::var("DATABASE_URL")
        .unwrap_or_else(|_| {
            let current_dir = env::current_dir().unwrap_or_else(|_| std::path::PathBuf::from("."));
            let db_path = current_dir.join("Database").join("webview_database.db");
            format!("sqlite://{}", db_path.to_string_lossy())
        });
    // TRENDLOG_DATABASE_URL is set from environment variable or defaults to a separate SQLite database.
    pub static ref TRENDLOG_DATABASE_URL: String = env::var("TRENDLOG_DATABASE_URL")
        .unwrap_or_else(|_| {
            let current_dir = env::current_dir().unwrap_or_else(|_| std::path::PathBuf::from("."));
            let db_path = current_dir.join("Database").join("trendlog_database.db");
            format!("sqlite://{}", db_path.to_string_lossy())
        });
    // REMOTE_API_URL is set from environment variable or defaults to a given URL.
    pub static ref REMOTE_API_URL: String = env::var("REMOTE_API_URL")
        .unwrap_or_else(|_| "https://user-lib.temcocontrols.com".to_string());
    // SPA_DIR is set from environment variable or defaults to a local directory.
    pub static ref SPA_DIR: String =
        env::var("SPA_DIR").unwrap_or_else(|_| "./ResourceFile/webview/www".to_string());

    pub static ref SHUTDOWN_CHANNEL: Arc<Mutex<mpsc::Sender<()>>> = Arc::new(Mutex::new(mpsc::channel(1).0));
}

// Copies the database file to the destination if it does not already exist.
pub fn copy_database_if_not_exists() -> Result<(), Box<dyn std::error::Error>> {
    let source_db_path = Path::new("ResourceFile/webview_database.db"); // Source database file path.
    let destination_db_path = Path::new(
        DATABASE_URL
            .strip_prefix("sqlite://") // Remove the sqlite:// prefix to get the file path.
            .ok_or("Invalid database url")?,
    );

    let destination_dir = destination_db_path
        .parent() // Get the parent directory of the destination path.
        .ok_or("Invalid destination database path")?;

    // Create the destination directory if it doesn't exist.
    if !destination_dir.exists() {
        fs::create_dir_all(destination_dir)?;
        println!("Created destination directory: {:?}", destination_dir);
    }

    // Copy the database file if it doesn't exist in the destination directory.
    if !destination_db_path.exists() {
        // Check if the source database file exists.
        if !source_db_path.exists() {
            return Err(From::from(format!(
                "Source database file does not exist: {:?}",
                source_db_path
            )));
        }
        // Copy the source database file to the destination.
        fs::copy(&source_db_path, &destination_db_path)?;
        println!(
            "Copied database file from {:?} to {:?}",
            source_db_path, destination_db_path
        );
    }

    Ok(())
}

// Asynchronously runs the database migrations.
pub async fn run_migrations() -> Result<(), Box<dyn std::error::Error>> {
    let conn = establish_connection().await?; // Establish a database connection.
    Migrator::up(&conn, None).await?; // Run the migrations.
    drop(conn);
    Ok(())
}

// Asynchronously initializes the trendlog database with the required schema.
pub async fn initialize_trendlog_database() -> Result<(), Box<dyn std::error::Error>> {
    use crate::db_connection::establish_trendlog_connection;
    use sea_orm::{Statement, ConnectionTrait};

    let conn = establish_trendlog_connection().await?;

    // Create trendlog_device table
    conn.execute(Statement::from_string(
        sea_orm::DatabaseBackend::Sqlite,
        r#"
        CREATE TABLE IF NOT EXISTS trendlog_device (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            device_id INTEGER UNIQUE NOT NULL,
            device_name TEXT NOT NULL,
            device_type TEXT NOT NULL,
            ip_address TEXT,
            port INTEGER,
            is_active BOOLEAN NOT NULL DEFAULT 1,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP
        );
        "#.to_string()
    )).await?;

    // Create trend_point table
    conn.execute(Statement::from_string(
        sea_orm::DatabaseBackend::Sqlite,
        r#"
        CREATE TABLE IF NOT EXISTS trend_point (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            device_id INTEGER NOT NULL,
            point_id INTEGER NOT NULL,
            point_name TEXT NOT NULL,
            point_type TEXT NOT NULL,
            data_type TEXT NOT NULL,
            units TEXT,
            scale REAL,
            offset REAL,
            is_active BOOLEAN NOT NULL DEFAULT 1,
            timebase_id INTEGER,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP,
            FOREIGN KEY (device_id) REFERENCES trendlog_device (id) ON DELETE CASCADE,
            UNIQUE(device_id, point_id)
        );
        "#.to_string()
    )).await?;

    // Create trend_data table
    conn.execute(Statement::from_string(
        sea_orm::DatabaseBackend::Sqlite,
        r#"
        CREATE TABLE IF NOT EXISTS trend_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            point_id INTEGER NOT NULL,
            timestamp TIMESTAMP NOT NULL,
            value REAL NOT NULL,
            quality TEXT NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (point_id) REFERENCES trend_point (id) ON DELETE CASCADE
        );
        "#.to_string()
    )).await?;

    // Create timebase_config table
    conn.execute(Statement::from_string(
        sea_orm::DatabaseBackend::Sqlite,
        r#"
        CREATE TABLE IF NOT EXISTS timebase_config (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            interval_minutes INTEGER NOT NULL,
            description TEXT,
            is_active BOOLEAN NOT NULL DEFAULT 1,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP
        );
        "#.to_string()
    )).await?;

    // Create collection_status table
    conn.execute(Statement::from_string(
        sea_orm::DatabaseBackend::Sqlite,
        r#"
        CREATE TABLE IF NOT EXISTS collection_status (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            device_id INTEGER UNIQUE NOT NULL,
            last_collection_time TIMESTAMP,
            next_collection_time TIMESTAMP,
            status TEXT NOT NULL,
            error_message TEXT,
            collection_count INTEGER NOT NULL DEFAULT 0,
            error_count INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP,
            FOREIGN KEY (device_id) REFERENCES trendlog_device (id) ON DELETE CASCADE
        );
        "#.to_string()
    )).await?;

    // Create indexes
    conn.execute(Statement::from_string(
        sea_orm::DatabaseBackend::Sqlite,
        r#"CREATE INDEX IF NOT EXISTS idx_trend_data_point_timestamp ON trend_data (point_id, timestamp);"#.to_string()
    )).await?;

    conn.execute(Statement::from_string(
        sea_orm::DatabaseBackend::Sqlite,
        r#"CREATE INDEX IF NOT EXISTS idx_trend_data_timestamp ON trend_data (timestamp);"#.to_string()
    )).await?;

    // Insert standard T3000 timebase configurations
    let timebase_configs = vec![
        ("1_MINUTE", 1, "1 minute interval"),
        ("5_MINUTES", 5, "5 minute interval"),
        ("15_MINUTES", 15, "15 minute interval"),
        ("30_MINUTES", 30, "30 minute interval"),
        ("1_HOUR", 60, "1 hour interval"),
        ("2_HOURS", 120, "2 hour interval"),
        ("4_HOURS", 240, "4 hour interval"),
        ("8_HOURS", 480, "8 hour interval"),
        ("12_HOURS", 720, "12 hour interval"),
        ("1_DAY", 1440, "1 day interval"),
    ];

    for (name, interval, description) in timebase_configs {
        conn.execute(Statement::from_string(
            sea_orm::DatabaseBackend::Sqlite,
            format!(
                "INSERT OR IGNORE INTO timebase_config (name, interval_minutes, description, is_active, created_at) VALUES ('{}', {}, '{}', 1, datetime('now'));",
                name, interval, description
            )
        )).await?;
    }

    drop(conn);
    Ok(())
}
