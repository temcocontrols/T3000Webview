use std::{error::Error, sync::Arc};

use sea_orm::DatabaseConnection;
use tokio::sync::Mutex;

use crate::db_connection::establish_connection;

/// Struct to hold the application state, which includes a database connection.
/// The `conn` field is a `DatabaseConnection` which is used to interact with the database.
#[derive(Clone)]
pub struct AppState {
    pub conn: Arc<Mutex<DatabaseConnection>>,
}

/// Asynchronously establishes a database connection and returns an `AppState` struct.
///
/// # Errors
///
/// If the database connection cannot be established, this function will return an `Err` containing the error.
pub async fn app_state() -> Result<AppState, Box<dyn Error>> {
    // Establish a database connection
    let conn = establish_connection().await?;
    // Wrap the connection in Arc and Mutex for shared access
    let shared_conn = Arc::new(Mutex::new(conn));
    // Return an `AppState` struct with the shared connection
    Ok(AppState { conn: shared_conn })
}

// ============================================================================
// ABSTRACTED FUNCTIONS - All new functionality separated from original code
// ============================================================================

use crate::db_connection::{establish_t3_device_connection, establish_device_conn_from_config};
use crate::logger::write_structured_log;

/// Abstracted enhanced application state with T3000 device support
#[derive(Clone)]
pub struct T3AppState {
    pub conn: Arc<Mutex<DatabaseConnection>>,
    pub t3_device_conn: Option<Arc<Mutex<DatabaseConnection>>>,
    /// Always points to local webview_t3_device.db SQLite for DB_BACKEND_CONFIG access.
    /// This connection is used by backend config REST endpoints and at startup.
    /// It remains valid even when t3_device_conn points to a remote DB.
    pub local_config_conn: Option<Arc<Mutex<DatabaseConnection>>>,
    /// MSSQL connection pool (only set when active backend is MSSQL).
    /// The 80+ route files use SeaORM via t3_device_conn. For MSSQL,
    /// MSSQL-specific service code uses this pool via `mssql_queries` functions.
    pub mssql_pool: Option<crate::database_management::mssql_queries::MssqlPool>,
}

/// Creates a webview T3000 application state with dual database connections
pub async fn create_t3_app_state() -> Result<T3AppState, Box<dyn std::error::Error>> {
    // Log database paths before attempting connections
    let _timestamp = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S UTC");

    // Use structured logging for database connection attempts
    use crate::logger::{write_structured_log_with_level, LogLevel};
    use crate::utils::{DATABASE_URL, T3_DEVICE_DATABASE_URL};

    let log_message = format!(
        "Database connection attempt: primary={}, t3_device={}",
        DATABASE_URL.as_str(), T3_DEVICE_DATABASE_URL.as_str()
    );
    let _ = write_structured_log_with_level("T3_Webview_Initialize", &log_message, LogLevel::Info);

    // Check if database files exist
    let primary_path = DATABASE_URL.strip_prefix("sqlite://").unwrap_or(&DATABASE_URL);
    let t3_device_path = T3_DEVICE_DATABASE_URL.strip_prefix("sqlite://").unwrap_or(&T3_DEVICE_DATABASE_URL);
    let file_check_message = format!(
        "Primary DB file exists: {}\nT3000 DB file exists: {}\nCurrent working directory: {:?}",
        std::path::Path::new(primary_path).exists(),
        std::path::Path::new(t3_device_path).exists(),
        std::env::current_dir().unwrap_or_default()
    );
    let _ = write_structured_log_with_level("T3_Webview_Initialize", &file_check_message, LogLevel::Info);

    // Establish primary database connection
    let conn = match establish_connection().await {
        Ok(conn) => conn,
        Err(e) => {
            // Log to structured log for headless service with specific database info
            let timestamp = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S UTC");
            let error_message = format!(
                "[{}] ❌ Failed to connect to PRIMARY database\n\
                [{}] Database URL: {}\n\
                [{}] Error details: {:?}",
                timestamp, timestamp, DATABASE_URL.as_str(), timestamp, e
            );
            let _ = write_structured_log("database_errors", &error_message);
            return Err(e);
        }
    };

    // ---- Step 1: Open local config connection (always local SQLite) ----
    // This is used for DB_BACKEND_CONFIG reads/writes and must exist before
    // we can determine which backend to connect to for device data.
    let local_config_conn = match establish_t3_device_connection().await {
        Ok(conn) => {
            let _ = write_structured_log_with_level(
                "T3_Webview_Initialize",
                "Local config connection (webview_t3_device.db) ready",
                LogLevel::Info,
            );
            Some(Arc::new(Mutex::new(conn)))
        }
        Err(e) => {
            let _ = write_structured_log_with_level(
                "T3_Webview_Initialize",
                &format!(
                    "local_config_conn unavailable — backend config REST endpoints disabled: {:?}",
                    e
                ),
                LogLevel::Warn,
            );
            None
        }
    };

    // ---- Step 2: Read DB_BACKEND_CONFIG and connect to the active backend ----
    // If local_config_conn is available, read the active backend config and
    // establish a connection to the chosen backend (SQLite / PG / MySQL / MSSQL).
    // Falls back to direct local SQLite connection if config read fails.
    let mut mssql_pool: Option<crate::database_management::mssql_queries::MssqlPool> = None;
    let t3_device_conn: Option<DatabaseConnection> = if let Some(ref lcfg) = local_config_conn {
        let cfg_guard = lcfg.lock().await;
        match establish_device_conn_from_config(&*cfg_guard).await {
            Ok((device_conn, config)) => {
                let _ = write_structured_log_with_level(
                    "T3_Webview_Initialize",
                    &format!(
                        "Device DB connected via active backend: {}",
                        config.backend_type
                    ),
                    LogLevel::Info,
                );
                // For SeaORM backends (SQLite/PG/MySQL), extract the inner connection.
                // For MSSQL, store the pool separately — t3_device_conn stays None
                // because the 80+ route files use SeaORM which doesn't support MSSQL.
                match device_conn {
                    crate::device_db_conn::DeviceDbConn::SeaOrm { conn, .. } => Some(conn),
                    crate::device_db_conn::DeviceDbConn::Mssql { pool } => {
                        let _ = write_structured_log_with_level(
                            "T3_Webview_Initialize",
                            "MSSQL pool stored — SeaORM routes will be unavailable, MSSQL-specific services active",
                            LogLevel::Info,
                        );
                        mssql_pool = Some(pool);
                        None
                    }
                }
            }
            Err(e) => {
                let _ = write_structured_log_with_level(
                    "T3_Webview_Initialize",
                    &format!(
                        "Backend-aware connect failed, falling back to local SQLite: {:?}",
                        e
                    ),
                    LogLevel::Warn,
                );
                // Fallback: connect to local SQLite directly
                establish_t3_device_connection().await.ok()
            }
        }
    } else {
        // No local config conn — try direct local SQLite as last resort
        match establish_t3_device_connection().await {
            Ok(conn) => {
                let _ = write_structured_log_with_level(
                    "T3_Webview_Initialize",
                    "WebView T3000 database connected (direct SQLite fallback)",
                    LogLevel::Info,
                );
                Some(conn)
            }
            Err(e) => {
                let _ = write_structured_log_with_level(
                    "T3_Webview_Initialize",
                    &format!(
                        "WebView T3000 database unavailable — core services will continue: {:?}",
                        e
                    ),
                    LogLevel::Warn,
                );
                None
            }
        }
    };

    // Wrap the connections in Arc and Mutex for shared access
    let shared_conn = Arc::new(Mutex::new(conn));
    let shared_t3_device_conn = t3_device_conn.map(|conn| Arc::new(Mutex::new(conn)));

    // Create data collection broadcast channel - TEMPORARILY DISABLED
    // let (data_sender, _data_receiver) = broadcast::channel(1000);

    // Initialize data collection service (will be set up later when started) - TEMPORARILY DISABLED
    // let data_collector = Arc::new(Mutex::new(None));

    // Initialize trend data collector if webview T3000 database is available - TEMPORARILY DISABLED
    // let (trend_collector, trend_data_sender) = if let Some(ref t3_device_conn) = shared_t3_device_conn {
    //     let (collector, _receiver) = crate::t3_device::trend_collector::TrendDataCollector::new(
    //         t3_device_conn.clone()
    //     );
    //     let sender = collector.get_data_sender();
    //     (Some(Arc::new(collector)), Some(sender))
    // } else {
    //     (None, None)
    // };

    // Return a T3AppState struct with the shared connections
    Ok(T3AppState {
        conn: shared_conn,
        t3_device_conn: shared_t3_device_conn,
        local_config_conn,
        mssql_pool,
        // data_collector, // Temporarily disabled
        // data_sender, // Temporarily disabled
        // trend_collector, // Temporarily disabled
        // trend_data_sender, // Temporarily disabled
    })
}
