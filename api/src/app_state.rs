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
// SAMPLING STATE — global pause/resume for FFI sync cycles
// ============================================================================

use once_cell::sync::Lazy;
use std::sync::RwLock;

/// Whether FFI sampling is currently paused.
#[derive(Debug, Clone)]
pub enum SamplingState {
    Active,
    Paused { reason: String },
}

static SAMPLING_STATE: Lazy<RwLock<SamplingState>> =
    Lazy::new(|| RwLock::new(SamplingState::Active));

/// Returns true if sampling is currently paused.
pub fn is_sampling_paused() -> bool {
    matches!(*SAMPLING_STATE.read().unwrap(), SamplingState::Paused { .. })
}

/// Returns the pause reason, or None when active.
pub fn get_pause_reason() -> Option<String> {
    match &*SAMPLING_STATE.read().unwrap() {
        SamplingState::Paused { reason } => Some(reason.clone()),
        SamplingState::Active => None,
    }
}

/// Pause sampling with a human-readable reason.
pub fn set_sampling_paused(reason: impl Into<String>) {
    *SAMPLING_STATE.write().unwrap() = SamplingState::Paused { reason: reason.into() };
}

/// Resume sampling.
pub fn set_sampling_active() {
    *SAMPLING_STATE.write().unwrap() = SamplingState::Active;
}

// ============================================================================
// ABSTRACTED FUNCTIONS - All new functionality separated from original code
// ============================================================================

use crate::db_connection::{
    establish_device_conn_from_config, establish_t3_device_connection, validate_device_conn_ready,
};
use crate::ini_config;

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
    let startup_log_db = establish_t3_device_connection().await.ok();

    // Use centralized logging for database connection attempts
    use crate::utils::{DATABASE_URL, T3_DEVICE_DATABASE_URL};

    let log_message = format!(
        "Database connection attempt: primary={}, t3_device={}",
        DATABASE_URL.as_str(), T3_DEVICE_DATABASE_URL.as_str()
    );
    if let Some(log_db) = startup_log_db.as_ref() {
        crate::logging::service::emit_app_log(
            log_db,
            "info",
            "T3_Webview_Initialize",
            None,
            None,
            &log_message,
            None,
        )
        .await;
    }

    // Check if database files exist
    let primary_path = DATABASE_URL.strip_prefix("sqlite://").unwrap_or(&DATABASE_URL);
    let t3_device_path = T3_DEVICE_DATABASE_URL.strip_prefix("sqlite://").unwrap_or(&T3_DEVICE_DATABASE_URL);
    let file_check_message = format!(
        "Primary DB file exists: {}\nT3000 DB file exists: {}\nCurrent working directory: {:?}",
        std::path::Path::new(primary_path).exists(),
        std::path::Path::new(t3_device_path).exists(),
        std::env::current_dir().unwrap_or_default()
    );
    if let Some(log_db) = startup_log_db.as_ref() {
        crate::logging::service::emit_app_log(
            log_db,
            "info",
            "T3_Webview_Initialize",
            None,
            None,
            &file_check_message,
            None,
        )
        .await;
    }

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
            if let Some(log_db) = startup_log_db.as_ref() {
                crate::logging::service::emit_app_log(
                    log_db,
                    "error",
                    "database_errors",
                    None,
                    None,
                    &error_message,
                    None,
                )
                .await;
            }
            return Err(e);
        }
    };

    // ---- Step 1: Open local config connection (always local SQLite) ----
    // This is used for DB_BACKEND_CONFIG reads/writes and must exist before
    // we can determine which backend to connect to for device data.
    let local_config_conn = match establish_t3_device_connection().await {
        Ok(conn) => {
            crate::logging::service::emit_app_log(
                &conn,
                "info",
                "T3_Webview_Initialize",
                None,
                None,
                "Local config connection (webview_t3_device.db) ready",
                None,
            )
            .await;
            Some(Arc::new(Mutex::new(conn)))
        }
        Err(e) => {
            crate::logging::service::emit_app_log(
                &conn,
                "warn",
                "T3_Webview_Initialize",
                None,
                None,
                &format!(
                    "local_config_conn unavailable — backend config REST endpoints disabled: {:?}",
                    e
                ),
                None,
            )
            .await;
            None
        }
    };

    // ---- Step 2: Read setting.ini [ServerDatabase] for server/client config ----
    let ini_cfg = ini_config::read_server_db_config_auto();
    crate::logging::service::emit_app_log(
        &conn,
        "info",
        "T3_Webview_Initialize",
        None,
        None,
        &format!("INI config: enabled={}, role={}", ini_cfg.enabled, ini_cfg.role),
        None,
    )
    .await;

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
                    if config.backend_type == crate::database_management::db_backend_config::BackendType::Sqlite {
                        crate::logging::service::emit_app_log(
                            &conn,
                            "warn",
                            "T3_Webview_Initialize",
                            None,
                            None,
                            "Server DB mode is enabled, but active backend is still SQLite — treating center DB as disconnected and falling back to local SQLite",
                            None,
                        )
                        .await;
                        establish_t3_device_connection().await.ok()
                    } else {
                        match validate_device_conn_ready(&device_conn).await {
                            Ok(()) => {
                                server_db_connected = true;
                                crate::logging::service::emit_app_log(
                                    &conn,
                                    "info",
                                    "T3_Webview_Initialize",
                                    None,
                                    None,
                                    &format!(
                                        "Server DB connected via active backend: {} (role={})",
                                        config.backend_type, ini_cfg.role
                                    ),
                                    None,
                                )
                                .await;
                                match device_conn {
                                    crate::device_db_conn::DeviceDbConn::SeaOrm { conn, .. } => Some(conn),
                                    crate::device_db_conn::DeviceDbConn::Mssql { pool } => {
                                        crate::logging::service::emit_app_log(
                                            &conn,
                                            "info",
                                            "T3_Webview_Initialize",
                                            None,
                                            None,
                                            "MSSQL pool stored — MSSQL-specific services active",
                                            None,
                                        )
                                        .await;
                                        mssql_pool = Some(pool);
                                        None
                                    }
                                }
                            }
                            Err(e) => {
                                crate::logging::service::emit_app_log(
                                    &conn,
                                    "warn",
                                    "T3_Webview_Initialize",
                                    None,
                                    None,
                                    &format!(
                                        "Server DB validation failed, falling back to local SQLite: {}",
                                        e
                                    ),
                                    None,
                                )
                                .await;
                                establish_t3_device_connection().await.ok()
                            }
                        }
                    }
                }
                Err(e) => {
                    crate::logging::service::emit_app_log(
                        &conn,
                        "warn",
                        "T3_Webview_Initialize",
                        None,
                        None,
                        &format!(
                            "Server DB connect failed, falling back to local SQLite: {:?}",
                            e
                        ),
                        None,
                    )
                    .await;
                    establish_t3_device_connection().await.ok()
                }
            }
        } else {
            crate::logging::service::emit_app_log(
                &conn,
                "warn",
                "T3_Webview_Initialize",
                None,
                None,
                "Server DB enabled but local config unavailable — falling back to local SQLite",
                None,
            )
            .await;
            establish_t3_device_connection().await.ok()
        }
    } else {
        // Classic mode: use local SQLite directly (or backend-config for single-PC setups)
        if let Some(ref lcfg) = local_config_conn {
            let cfg_guard = lcfg.lock().await;
            match establish_device_conn_from_config(&*cfg_guard).await {
                Ok((device_conn, config)) => {
                    crate::logging::service::emit_app_log(
                        &conn,
                        "info",
                        "T3_Webview_Initialize",
                        None,
                        None,
                        &format!(
                            "Device DB connected via active backend: {} (classic mode)",
                            config.backend_type
                        ),
                        None,
                    )
                    .await;
                    match device_conn {
                        crate::device_db_conn::DeviceDbConn::SeaOrm { conn, .. } => Some(conn),
                        crate::device_db_conn::DeviceDbConn::Mssql { pool } => {
                            mssql_pool = Some(pool);
                            None
                        }
                    }
                }
                Err(e) => {
                    crate::logging::service::emit_app_log(
                        &conn,
                        "warn",
                        "T3_Webview_Initialize",
                        None,
                        None,
                        &format!(
                            "Backend-aware connect failed, falling back to local SQLite: {:?}",
                            e
                        ),
                        None,
                    )
                    .await;
                    establish_t3_device_connection().await.ok()
                }
            }
        } else {
            match establish_t3_device_connection().await {
                Ok(conn) => {
                    crate::logging::service::emit_app_log(
                        &conn,
                        "info",
                        "T3_Webview_Initialize",
                        None,
                        None,
                        "WebView T3000 database connected (direct SQLite fallback)",
                        None,
                    )
                    .await;
                    Some(conn)
                }
                Err(e) => {
                    crate::logging::service::emit_app_log(
                        &conn,
                        "warn",
                        "T3_Webview_Initialize",
                        None,
                        None,
                        &format!(
                            "WebView T3000 database unavailable — core services will continue: {:?}",
                            e
                        ),
                        None,
                    )
                    .await;
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
