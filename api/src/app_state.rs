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

use tokio::sync::broadcast;
use crate::db_connection::establish_t3_device_connection;
use crate::logger::{write_structured_log_with_level, LogLevel, write_structured_log};
// use crate::t3_device::realtime_data_service::{RealtimeDataService, DataPoint}; // Available but not called

/// Abstracted enhanced application state with T3000 device support
#[derive(Clone)]
pub struct T3AppState {
    pub conn: Arc<Mutex<DatabaseConnection>>,
    pub t3_device_conn: Option<Arc<Mutex<DatabaseConnection>>>,
    // pub realtime_data: Arc<Mutex<Option<RealtimeDataService>>>, // Available but not called
    // pub data_sender: broadcast::Sender<DataPoint>, // Temporarily disabled
    // pub trend_collector: Option<Arc<crate::t3_device::trend_collector::TrendDataCollector>>, // Temporarily disabled
    // pub trend_data_sender: Option<broadcast::Sender<crate::t3_device::trend_collector::TrendDataPoint>>, // Temporarily disabled
}

/// Creates a webview T3000 application state with dual database connections
pub async fn create_t3_app_state() -> Result<T3AppState, Box<dyn std::error::Error>> {
    // Log database paths before attempting connections
    let timestamp = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S UTC");

    // Use structured logging for database connection attempts
    use crate::logger::{write_structured_log_with_level, LogLevel};
    use crate::utils::{DATABASE_URL, T3_DEVICE_DATABASE_URL};

    let log_message = format!(
        "=== DATABASE CONNECTION ATTEMPT ===\nPrimary database URL: {}\nWebView T3000 database URL: {}",
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
    let _ = write_structured_log_with_level("T3000_Webview_Initialize", &file_check_message, LogLevel::Info);

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

    // Establish webview T3000 database connection (OPTIONAL - don't fail if unavailable)
    let t3_device_conn = match establish_t3_device_connection().await {
        Ok(conn) => {
            let success_message = "WebView T3000 database connected successfully";
            let _ = write_structured_log_with_level("T3000_Webview_Initialize", &success_message, LogLevel::Info);
            Some(conn)
        },
        Err(e) => {
            // Log to structured log for headless service but DON'T fail the entire service
            use crate::utils::T3_DEVICE_DATABASE_URL;
            let error_message = format!(
                "WebView T3000 database unavailable (core services will continue)\nDatabase URL: {}\nError details: {:?}",
                T3_DEVICE_DATABASE_URL.as_str(), e
            );
            let _ = write_structured_log_with_level("T3000_Webview_Initialize", &error_message, LogLevel::Warn);
            println!("⚠️  Warning: WebView T3000 database unavailable - Core HTTP/WebSocket services starting anyway");
            None
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
        // data_collector, // Temporarily disabled
        // data_sender, // Temporarily disabled
        // trend_collector, // Temporarily disabled
        // trend_data_sender, // Temporarily disabled
    })
}
