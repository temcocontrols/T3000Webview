use std::{error::Error, sync::Arc};

use sea_orm::DatabaseConnection;
use tokio::sync::{Mutex, broadcast};

use crate::db_connection::{establish_connection, establish_t3_device_connection};
use crate::t3_device::data_collector::{DataCollectionService, DataPoint};

/// Struct to hold the application state, which includes dual database connections.
/// The `conn` field is for the main webview database.
/// The `t3_device_conn` field is for the comprehensive T3000 device database.
/// The `data_collector` field is for managing hybrid data collection.
#[derive(Clone)]
pub struct AppState {
    pub conn: Arc<Mutex<DatabaseConnection>>,
    pub t3_device_conn: Arc<Mutex<DatabaseConnection>>,
    pub data_collector: Arc<Mutex<Option<DataCollectionService>>>,
    pub data_sender: broadcast::Sender<DataPoint>,
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
    let shared_t3_device_conn = Arc::new(Mutex::new(t3_device_conn));

    // Create data collection broadcast channel
    let (data_sender, _data_receiver) = broadcast::channel(1000);

    // Initialize data collection service (will be set up later when started)
    let data_collector = Arc::new(Mutex::new(None));

    // Return an `AppState` struct with the shared connections
    Ok(AppState {
        conn: shared_conn,
        t3_device_conn: shared_t3_device_conn,
        data_collector,
        data_sender,
    })
}
