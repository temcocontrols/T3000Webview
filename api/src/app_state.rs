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
    // Establish primary database connection
    let conn = match establish_connection().await {
        Ok(conn) => conn,
        Err(e) => {
            // Log to file for headless service
            let timestamp = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S UTC");
            if let Ok(mut file) = std::fs::OpenOptions::new()
                .create(true)
                .append(true)
                .open("t3000_error.log") {
                use std::io::Write;
                let _ = writeln!(file, "[{}] Failed to connect to primary database: {:?}", timestamp, e);
            }
            return Err(e);
        }
    };

    // Establish comprehensive T3000 device database connection
    let t3_device_conn = match establish_t3_device_connection().await {
        Ok(conn) => conn,
        Err(e) => {
            // Log to file for headless service
            let timestamp = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S UTC");
            if let Ok(mut file) = std::fs::OpenOptions::new()
                .create(true)
                .append(true)
                .open("t3000_error.log") {
                use std::io::Write;
                let _ = writeln!(file, "[{}] Failed to connect to T3000 device database: {:?}", timestamp, e);
            }
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
