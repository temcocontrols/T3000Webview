use std::{error::Error, sync::Arc};

use sea_orm::DatabaseConnection;
use tokio::sync::Mutex;

use crate::db_connection::{establish_connection, establish_trendlog_connection};

/// Struct to hold the application state, which includes dual database connections.
/// The `conn` field is for the main webview database.
/// The `trendlog_conn` field is for the separate trendlog database.
#[derive(Clone)]
pub struct AppState {
    pub conn: Arc<Mutex<DatabaseConnection>>,
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
    // Establish trendlog database connection
    let trendlog_conn = establish_trendlog_connection().await?;

    // Wrap the connections in Arc and Mutex for shared access
    let shared_conn = Arc::new(Mutex::new(conn));
    let shared_trendlog_conn = Arc::new(Mutex::new(trendlog_conn));

    // Return an `AppState` struct with the shared connections
    Ok(AppState {
        conn: shared_conn,
        trendlog_conn: shared_trendlog_conn,
    })
}
