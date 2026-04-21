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
use crate::ini_config;
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
    /// Whether server DB is enabled (from setting.ini [ServerDatabase] enabled=)
    pub server_db_enabled: bool,
    /// PC role when server DB is active: "server" (writes FFI to server) or "client"
    pub server_db_role: String,
    /// True when [ServerDatabase] is enabled and the configured center DB connection succeeded.
    /// False means runtime is using local SQLite fallback.
    pub server_db_connected: bool,
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

    // ---- Step 2: Read setting.ini [ServerDatabase] for server/client config ----
    let ini_cfg = ini_config::read_server_db_config_auto();
    let _ = write_structured_log_with_level(
        "T3_Webview_Initialize",
        &format!(
            "INI config: enabled={}, role={}",
            ini_cfg.enabled, ini_cfg.role
        ),
        LogLevel::Info,
    );

    // ---- Step 3: Connect to the active backend based on INI + DB_BACKEND_CONFIG ----
    // When server DB is enabled (INI enabled=1), read DB_BACKEND_CONFIG and connect
    // to the server backend (PG / MySQL / MSSQL). When disabled, use local SQLite.
    let mut mssql_pool: Option<crate::database_management::mssql_queries::MssqlPool> = None;
    let mut server_db_connected = false;
    let t3_device_conn: Option<DatabaseConnection> = if ini_cfg.enabled {
        // Server DB mode: attempt server backend connection
        if let Some(ref lcfg) = local_config_conn {
            let cfg_guard = lcfg.lock().await;
            match establish_device_conn_from_config(&*cfg_guard).await {
                Ok((device_conn, config)) => {
                    server_db_connected = true;
                    let _ = write_structured_log_with_level(
                        "T3_Webview_Initialize",
                        &format!(
                            "Server DB connected via active backend: {} (role={})",
                            config.backend_type, ini_cfg.role
                        ),
                        LogLevel::Info,
                    );
                    match device_conn {
                        crate::device_db_conn::DeviceDbConn::SeaOrm { conn, .. } => Some(conn),
                        crate::device_db_conn::DeviceDbConn::Mssql { pool } => {
                            let _ = write_structured_log_with_level(
                                "T3_Webview_Initialize",
                                "MSSQL pool stored — MSSQL-specific services active",
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
                            "Server DB connect failed, falling back to local SQLite: {:?}",
                            e
                        ),
                        LogLevel::Warn,
                    );
                    establish_t3_device_connection().await.ok()
                }
            }
        } else {
            let _ = write_structured_log_with_level(
                "T3_Webview_Initialize",
                "Server DB enabled but local config unavailable — falling back to local SQLite",
                LogLevel::Warn,
            );
            establish_t3_device_connection().await.ok()
        }
    } else {
        // Classic mode: use local SQLite directly (or backend-config for single-PC setups)
        if let Some(ref lcfg) = local_config_conn {
            let cfg_guard = lcfg.lock().await;
            match establish_device_conn_from_config(&*cfg_guard).await {
                Ok((device_conn, config)) => {
                    let _ = write_structured_log_with_level(
                        "T3_Webview_Initialize",
                        &format!(
                            "Device DB connected via active backend: {} (classic mode)",
                            config.backend_type
                        ),
                        LogLevel::Info,
                    );
                    match device_conn {
                        crate::device_db_conn::DeviceDbConn::SeaOrm { conn, .. } => Some(conn),
                        crate::device_db_conn::DeviceDbConn::Mssql { pool } => {
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
                    establish_t3_device_connection().await.ok()
                }
            }
        } else {
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
        }
    };

    // Wrap the connections in Arc and Mutex for shared access
    let shared_conn = Arc::new(Mutex::new(conn));
    let shared_t3_device_conn = t3_device_conn.map(|conn| Arc::new(Mutex::new(conn)));

    // Return a T3AppState struct with the shared connections
    Ok(T3AppState {
        conn: shared_conn,
        t3_device_conn: shared_t3_device_conn,
        local_config_conn,
        mssql_pool,
        server_db_enabled: ini_cfg.enabled,
        server_db_role: ini_cfg.role,
        server_db_connected,
    })
}
