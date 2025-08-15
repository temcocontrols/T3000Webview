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
use crate::t3_device::data_collector::{DataCollectionService, DataPoint};

/// Abstracted enhanced application state with T3000 device support
#[derive(Clone)]
pub struct T3AppState {
    pub conn: Arc<Mutex<DatabaseConnection>>,
    pub t3_device_conn: Arc<Mutex<DatabaseConnection>>,
    pub data_collector: Arc<Mutex<Option<DataCollectionService>>>,
    pub data_sender: broadcast::Sender<DataPoint>,
}

/// Creates a comprehensive T3000 application state with dual database connections
pub async fn create_t3_app_state() -> Result<T3AppState, Box<dyn std::error::Error>> {
    // Log database paths before attempting connections
    let timestamp = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S UTC");

    // Use structured logging for database connection attempts
    use crate::logger::write_structured_log;
    use crate::utils::{DATABASE_URL, T3_DEVICE_DATABASE_URL};

    let log_message = format!(
        "[{}] === DATABASE CONNECTION ATTEMPT ===\n\
        [{}] Primary database URL: {}\n\
        [{}] T3000 device database URL: {}",
        timestamp, timestamp, DATABASE_URL.as_str(), timestamp, T3_DEVICE_DATABASE_URL.as_str()
    );
    let _ = write_structured_log("database_connection", &log_message);

    // Check if database files exist
    let primary_path = DATABASE_URL.strip_prefix("sqlite://").unwrap_or(&DATABASE_URL);
    let t3_device_path = T3_DEVICE_DATABASE_URL.strip_prefix("sqlite://").unwrap_or(&T3_DEVICE_DATABASE_URL);
    let file_check_message = format!(
        "[{}] Primary DB file exists: {}\n\
        [{}] T3000 DB file exists: {}\n\
        [{}] Current working directory: {:?}",
        timestamp, std::path::Path::new(primary_path).exists(),
        timestamp, std::path::Path::new(t3_device_path).exists(),
        timestamp, std::env::current_dir().unwrap_or_default()
    );
    let _ = write_structured_log("database_connection", &file_check_message);

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

    // Establish comprehensive T3000 device database connection
    let t3_device_conn = match establish_t3_device_connection().await {
        Ok(conn) => conn,
        Err(e) => {
            // Log to structured log for headless service with specific database info
            let timestamp = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S UTC");
            use crate::utils::T3_DEVICE_DATABASE_URL;
            let error_message = format!(
                "[{}] ❌ Failed to connect to T3000 DEVICE database\n\
                [{}] Database URL: {}\n\
                [{}] Error details: {:?}",
                timestamp, timestamp, T3_DEVICE_DATABASE_URL.as_str(), timestamp, e
            );
            let _ = write_structured_log("database_errors", &error_message);
            return Err(e);
        }
    };

    // Wrap the connections in Arc and Mutex for shared access
    let shared_conn = Arc::new(Mutex::new(conn));
    let shared_t3_device_conn = Arc::new(Mutex::new(t3_device_conn));

    // Create data collection broadcast channel
    let (data_sender, _data_receiver) = broadcast::channel(1000);

    // Initialize data collection service (will be set up later when started)
    let data_collector = Arc::new(Mutex::new(None));

    // Return a T3AppState struct with the shared connections
    Ok(T3AppState {
        conn: shared_conn,
        t3_device_conn: shared_t3_device_conn,
        data_collector,
        data_sender,
    })
}
