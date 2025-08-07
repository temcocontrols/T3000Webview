use std::{error::Error, sync::Arc};

use sea_orm::DatabaseConnection;
use tokio::sync::Mutex;

use crate::db_connection::{establish_connection, establish_t3_device_connection};

/// Struct to hold the application state, which includes dual database connections.
/// The `conn` field is for the main webview database.
/// The `trendlog_conn` field is for the separate trendlog database.
#[derive(Clone)]
pub struct AppState {
    pub conn: Arc<Mutex<DatabaseConnection>>,
    pub t3_device_conn: Arc<Mutex<DatabaseConnection>>,
    /// Legacy alias for backward compatibility
    pub trendlog_conn: Arc<Mutex<DatabaseConnection>>,
}

/// Asynchronously establishes dual database connections and returns an `AppState` struct.
///
/// # Errors
///
/// If either database connection cannot be established, this function will return an `Err` containing the error.
pub async fn app_state() -> Result<AppState, Box<dyn Error>> {
    // Establish main database connection
    let conn = establish_connection().await?;
    // Establish comprehensive T3000 device database connection
    let t3_device_conn = establish_t3_device_connection().await?;

    // Wrap the connections in Arc and Mutex for shared access
    let shared_conn = Arc::new(Mutex::new(conn));
    let shared_t3_device_conn = Arc::new(Mutex::new(t3_device_conn.clone()));
    let shared_trendlog_conn = Arc::new(Mutex::new(t3_device_conn)); // Legacy alias

    // Return an `AppState` struct with the shared connections
    Ok(AppState {
        conn: shared_conn,
        t3_device_conn: shared_t3_device_conn,
        trendlog_conn: shared_trendlog_conn,
    })
}
