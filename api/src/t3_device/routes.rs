use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::Json,
    routing::{delete, get, post, put},
    Router,
};
use sea_orm::{DatabaseBackend, Statement, ConnectionTrait};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::sync::Arc;

use crate::app_state::T3AppState;
use crate::t3_device::services::{T3DeviceService, CreateDeviceRequest, UpdateDeviceRequest};
// use crate::t3_device::realtime_data_service::{RealtimeDataService}; // Available but not called

// Helper function to check if T3000 device database is available
async fn ensure_t3_device_db_available(state: &T3AppState) -> Result<(), StatusCode> {
    if state.t3_device_conn.is_none() {
        eprintln!("⚠️  T3000 device database unavailable - feature disabled");
        return Err(StatusCode::SERVICE_UNAVAILABLE);
    }
    Ok(())
}

// Helper macro to get T3000 device database connection or return service unavailable
macro_rules! get_t3_device_conn {
    ($state:expr) => {
        match $state.t3_device_conn.as_ref() {
            Some(conn) => conn.lock().await,
            None => {
                eprintln!("⚠️  T3000 device database unavailable");
                return Err(StatusCode::SERVICE_UNAVAILABLE);
            }
        }
    };
}

// Helper function to get valid T3000 database table names
fn get_valid_table_names() -> &'static [&'static str] {
    &[
        "DEVICES", "INPUTS", "OUTPUTS", "VARIABLES", "PROGRAMS",
        "SCHEDULES", "PID_TABLE", "HOLIDAYS", "GRAPHICS", "ALARMS",
        "MONITORDATA", "TRENDLOGS", "TRENDLOG_INPUTS", "TRENDLOG_DATA", "TRENDLOG_BUFFER"
    ]
}

#[derive(Deserialize)]
pub struct QueryParams {
    pub page: Option<u64>,
    pub per_page: Option<u64>,
    pub search: Option<String>,
    pub table: Option<String>,
}

#[derive(Serialize)]
pub struct DatabaseInfo {
    pub status: String,
    pub tables: Vec<TableInfo>,
    pub connection_type: String,
}

#[derive(Serialize)]
pub struct TableInfo {
    pub name: String,
    pub description: String,
}

#[derive(Serialize)]
pub struct QueryResult {
    pub data: Vec<Value>,
    pub message: String,
}

// Get database status and table information
async fn get_database_status(State(state): State<T3AppState>) -> Result<Json<DatabaseInfo>, StatusCode> {
    let db = get_t3_device_conn!(state);

    // Get list of tables from SQLite database
    let tables_query = Statement::from_string(
        DatabaseBackend::Sqlite,
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name".to_string()
    );

    let tables_result = db.query_all(tables_query).await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let mut tables = Vec::new();
    for row in tables_result {
        let table_name: String = row.try_get("", "name")
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

        let description = match table_name.as_str() {
            "DEVICES" => "T3000 devices and nodes (main device table)",
            "INPUTS" => "Input points and sensors",
            "OUTPUTS" => "Output points and actuators",
            "VARIABLES" => "Variable points and calculated values",
            "PROGRAMS" => "Control programs and logic",
            "SCHEDULES" => "Time schedules and operations",
            "PID_TABLE" => "PID controllers and loops",
            "HOLIDAYS" => "Holiday schedules and exceptions",
            "GRAPHICS" => "Graphical displays and layouts",
            "ALARMS" => "Alarm conditions and notifications",
            "MONITORDATA" => "Real-time monitoring data",
            "TRENDLOGS" => "Trend log configurations",
            "TRENDLOG_INPUTS" => "Trend log input point configurations",
            "TRENDLOG_DATA" => "Historical trend data",
            "TRENDLOG_BUFFER" => "Trend data buffer",
            _ => "Database table",
        };

        tables.push(TableInfo {
            name: table_name,
            description: description.to_string(),
        });
    }

    Ok(Json(DatabaseInfo {
        status: "connected".to_string(),
        tables,
        connection_type: "WebView T3000 Database".to_string(),
    }))
}

// Execute a query on the specified table
async fn get_table_data(
    State(state): State<T3AppState>,
    Query(params): Query<QueryParams>,
) -> Result<Json<QueryResult>, StatusCode> {
    let db = get_t3_device_conn!(state);
    let table_name = params.table.unwrap_or_else(|| "DEVICES".to_string());
    let page = params.page.unwrap_or(1);
    let per_page = params.per_page.unwrap_or(10);
    let offset = (page - 1) * per_page;

    // Validate table name to prevent SQL injection
    let valid_tables = get_valid_table_names();

    if !valid_tables.contains(&table_name.as_str()) {
        return Err(StatusCode::BAD_REQUEST);
    }

    let query = if let Some(search) = params.search {
        // Use table-specific search logic based on table structure
        match table_name.as_str() {
            "DEVICES" => format!(
                "SELECT * FROM {} WHERE CAST(SerialNumber AS TEXT) LIKE '%{}%' OR CAST(Product_Name AS TEXT) LIKE '%{}%' OR CAST(Description AS TEXT) LIKE '%{}%' LIMIT {} OFFSET {}",
                table_name, search, search, search, per_page, offset
            ),
            "INPUTS" | "OUTPUTS" | "VARIABLES" => format!(
                "SELECT * FROM {} WHERE CAST(nSerialNumber AS TEXT) LIKE '%{}%' OR CAST(Full_Label AS TEXT) LIKE '%{}%' LIMIT {} OFFSET {}",
                table_name, search, search, per_page, offset
            ),
            _ => format!(
                "SELECT * FROM {} WHERE CAST(rowid AS TEXT) LIKE '%{}%' LIMIT {} OFFSET {}",
                table_name, search, per_page, offset
            )
        }
    } else {
        format!(
            "SELECT * FROM {} LIMIT {} OFFSET {}",
            table_name, per_page, offset
        )
    };

    let statement = Statement::from_string(DatabaseBackend::Sqlite, query);
    let results = db.query_all(statement).await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Get column names for the table
    let columns_query = format!("PRAGMA table_info({})", table_name);
    let column_statement = Statement::from_string(DatabaseBackend::Sqlite, columns_query);
    let column_results = db.query_all(column_statement).await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let mut column_names = Vec::new();
    for column_row in column_results {
        if let Ok(column_name) = column_row.try_get::<String>("", "name") {
            column_names.push(column_name);
        }
    }

    let mut data = Vec::new();
    for row in results {
        let mut row_data = serde_json::Map::new();

        // Extract all columns dynamically using index - same as export_table
        for (index, column_name) in column_names.iter().enumerate() {
            if let Ok(value) = row.try_get_by_index::<Option<String>>(index) {
                row_data.insert(column_name.clone(), json!(value));
            } else if let Ok(int_value) = row.try_get_by_index::<Option<i32>>(index) {
                row_data.insert(column_name.clone(), json!(int_value));
            }
        }

        data.push(Value::Object(row_data));
    }

    let data_len = data.len();
    Ok(Json(QueryResult {
        data,
        message: format!("Retrieved {} records from {}", data_len, table_name),
    }))
}

// Create new record (simplified version)
async fn create_record(
    State(state): State<T3AppState>,
    Path(table): Path<String>,
    Json(payload): Json<Value>,
) -> Result<Json<Value>, StatusCode> {
    let _db = get_t3_device_conn!(state);

    // Validate table name
    let valid_tables = get_valid_table_names();

    if !valid_tables.contains(&table.as_str()) {
        return Err(StatusCode::BAD_REQUEST);
    }

    // For now, return a success message indicating the table and payload received
    Ok(Json(json!({
        "message": format!("Create operation for table {} received", table),
        "payload": payload,
        "status": "pending_implementation"
    })))
}

// Update existing record (simplified version)
async fn update_record(
    State(state): State<T3AppState>,
    Path((table, id)): Path<(String, i32)>,
    Json(payload): Json<Value>,
) -> Result<Json<Value>, StatusCode> {
    let _db = get_t3_device_conn!(state);

    // Validate table name
    let valid_tables = get_valid_table_names();

    if !valid_tables.contains(&table.as_str()) {
        return Err(StatusCode::BAD_REQUEST);
    }

    Ok(Json(json!({
        "message": format!("Update operation for table {} record {} received", table, id),
        "payload": payload,
        "status": "pending_implementation"
    })))
}

// Delete record (simplified version)
async fn delete_record(
    State(state): State<T3AppState>,
    Path((table, id)): Path<(String, i32)>,
) -> Result<Json<Value>, StatusCode> {
    let _db = get_t3_device_conn!(state);

    // Validate table name
    let valid_tables = get_valid_table_names();

    if !valid_tables.contains(&table.as_str()) {
        return Err(StatusCode::BAD_REQUEST);
    }

    Ok(Json(json!({
        "message": format!("Delete operation for table {} record {} received", table, id),
        "status": "pending_implementation"
    })))
}

// Export table data (simplified version)
async fn export_table(
    State(state): State<T3AppState>,
    Path(table): Path<String>,
) -> Result<Json<Value>, StatusCode> {
    let db = get_t3_device_conn!(state);

    // Validate table name
    let valid_tables = get_valid_table_names();

    if !valid_tables.contains(&table.as_str()) {
        return Err(StatusCode::BAD_REQUEST);
    }

    let query = format!("SELECT * FROM {}", table);
    let statement = Statement::from_string(DatabaseBackend::Sqlite, query);
    let results = db.query_all(statement).await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Get column names for the table
    let columns_query = format!("PRAGMA table_info({})", table);
    let column_statement = Statement::from_string(DatabaseBackend::Sqlite, columns_query);
    let column_results = db.query_all(column_statement).await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let mut column_names = Vec::new();
    for column_row in column_results {
        if let Ok(column_name) = column_row.try_get::<String>("", "name") {
            column_names.push(column_name);
        }
    }

    let mut data = Vec::new();
    for row in results {
        let mut row_data = serde_json::Map::new();

        // Extract all columns dynamically using index
        for (index, column_name) in column_names.iter().enumerate() {
            if let Ok(value) = row.try_get_by_index::<Option<String>>(index) {
                row_data.insert(column_name.clone(), json!(value));
            } else if let Ok(int_value) = row.try_get_by_index::<Option<i32>>(index) {
                row_data.insert(column_name.clone(), json!(int_value));
            }
        }

        data.push(Value::Object(row_data));
    }

    Ok(Json(json!({
        "table": table,
        "data": data,
        "exported_at": chrono::Utc::now().to_rfc3339(),
        "count": data.len()
    })))
}

// Import table data (simplified version)
async fn import_table(
    State(state): State<T3AppState>,
    Path(table): Path<String>,
    Json(payload): Json<Value>,
) -> Result<Json<Value>, StatusCode> {
    let _db = get_t3_device_conn!(state);

    // Validate table name
    let valid_tables = get_valid_table_names();

    if !valid_tables.contains(&table.as_str()) {
        return Err(StatusCode::BAD_REQUEST);
    }

    let data = payload.get("data")
        .and_then(|d| d.as_array())
        .ok_or(StatusCode::BAD_REQUEST)?;

    Ok(Json(json!({
        "message": format!("Import operation for table {} received", table),
        "rows_to_import": data.len(),
        "status": "pending_implementation"
    })))
}

// T3000 Device Management Endpoints
async fn get_devices_with_stats(
    State(state): State<T3AppState>,
) -> Result<Json<Value>, StatusCode> {
    let db = get_t3_device_conn!(state);

    match T3DeviceService::get_all_devices_with_stats(&*db).await {
        Ok(devices) => Ok(Json(json!({
            "devices": devices,
            "total": devices.len(),
            "message": "Devices retrieved successfully"
        }))),
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR)
    }
}

async fn create_device(
    State(state): State<T3AppState>,
    Json(payload): Json<CreateDeviceRequest>,
) -> Result<Json<Value>, StatusCode> {
    let db = get_t3_device_conn!(state);

    match T3DeviceService::create_device(&*db, payload).await {
        Ok(device) => Ok(Json(json!({
            "device": device,
            "message": "Device created successfully"
        }))),
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR)
    }
}

async fn get_device_by_id(
    State(state): State<T3AppState>,
    Path(device_id): Path<i32>,
) -> Result<Json<Value>, StatusCode> {
    let db = get_t3_device_conn!(state);

    match T3DeviceService::get_device_by_id(&*db, device_id).await {
        Ok(Some(device)) => Ok(Json(json!({
            "device": device,
            "message": "Device found"
        }))),
        Ok(None) => Err(StatusCode::NOT_FOUND),
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR)
    }
}

async fn update_device(
    State(state): State<T3AppState>,
    Path(device_id): Path<i32>,
    Json(payload): Json<UpdateDeviceRequest>,
) -> Result<Json<Value>, StatusCode> {
    let db = get_t3_device_conn!(state);

    match T3DeviceService::update_device(&*db, device_id, payload).await {
        Ok(Some(device)) => Ok(Json(json!({
            "device": device,
            "message": "Device updated successfully"
        }))),
        Ok(None) => Err(StatusCode::NOT_FOUND),
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR)
    }
}

async fn delete_device(
    State(state): State<T3AppState>,
    Path(device_id): Path<i32>,
) -> Result<Json<Value>, StatusCode> {
    let db = get_t3_device_conn!(state);

    match T3DeviceService::delete_device(&*db, device_id).await {
        Ok(true) => Ok(Json(json!({
            "message": "Device deleted successfully"
        }))),
        Ok(false) => Err(StatusCode::NOT_FOUND),
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR)
    }
}

async fn get_device_with_points(
    State(state): State<T3AppState>,
    Path(device_id): Path<i32>,
) -> Result<Json<Value>, StatusCode> {
    let db = get_t3_device_conn!(state);

    match T3DeviceService::get_device_with_points(&*db, device_id).await {
        Ok(Some(device_with_points)) => Ok(Json(json!({
            "device": device_with_points,
            "message": "Device with points retrieved successfully"
        }))),
        Ok(None) => Err(StatusCode::NOT_FOUND),
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR)
    }
}

/* TEMPORARILY DISABLED - DATA COLLECTION ENDPOINTS (Need field name updates)
// Data Collection endpoints
async fn start_data_collection(State(state): State<T3AppState>) -> Result<Json<Value>, StatusCode> {
    let mut data_collector = state.data_collector.lock().await;

    if data_collector.is_some() {
        return Ok(Json(json!({
            "status": "info",
            "message": "Data collection is already running",
            "action": "start_data_collection"
        })));
    }

    // Create a new data collection service
    let t3_device_conn = get_t3_device_conn!(state).clone();
    let t3_device_conn_arc = Arc::new(t3_device_conn);

    let (mut service, _control_sender, _data_receiver) = RealtimeDataService::new(t3_device_conn_arc);

    // Start the service
    if let Err(e) = service.start().await {
        return Ok(Json(json!({
            "status": "error",
            "message": format!("Failed to start data collection: {}", e),
            "action": "start_data_collection"
        })));
    }

    *data_collector = Some(service);
    Ok(Json(json!({
        "status": "success",
        "message": "Data collection started successfully",
        "action": "start_data_collection"
    })))
}

async fn stop_data_collection(State(state): State<T3AppState>) -> Result<Json<Value>, StatusCode> {
    let mut data_collector = state.data_collector.lock().await;

    match data_collector.take() {
        Some(service) => {
            if let Err(e) = service.stop().await {
                Ok(Json(json!({
                    "status": "warning",
                    "message": format!("Data collection stopped with warning: {}", e),
                    "action": "stop_data_collection"
                })))
            } else {
                Ok(Json(json!({
                    "status": "success",
                    "message": "Data collection stopped successfully",
                    "action": "stop_data_collection"
                })))
            }
        }
        None => Ok(Json(json!({
            "status": "info",
            "message": "Data collection was not running",
            "action": "stop_data_collection"
        })))
    }
}

async fn get_collection_status(State(state): State<T3AppState>) -> Result<Json<Value>, StatusCode> {
    let data_collector = state.data_collector.lock().await;

    match data_collector.as_ref() {
        Some(service) => {
            let status = service.get_status().await;
            Ok(Json(json!({
                "is_running": status.is_running,
                "last_collection_time": status.last_collection_time,
                "next_collection_time": status.next_collection_time,
                "total_points_collected": status.total_points_collected,
                "errors_count": status.errors_count,
                "active_devices": status.active_devices,
                "collection_source": status.collection_source
            })))
        }
        None => Ok(Json(json!({
            "is_running": false,
            "last_collection_time": null,
            "next_collection_time": null,
            "total_points_collected": 0,
            "errors_count": 0,
            "active_devices": [],
            "collection_source": "None"
        })))
    }
}

async fn get_collection_config(State(state): State<T3AppState>) -> Result<Json<Value>, StatusCode> {
    let data_collector = state.data_collector.lock().await;

    match data_collector.as_ref() {
        Some(service) => {
            let config = service.get_config().await;
            Ok(Json(json!({
                "enabled": config.enabled,
                "collection_interval_seconds": config.collection_interval_seconds,
                "startup_delay_seconds": config.startup_delay_seconds,
                "devices_to_collect": config.devices_to_collect,
                "point_types": config.point_types,
                "batch_size": config.batch_size,
                "timeout_seconds": config.timeout_seconds,
                "retry_attempts": config.retry_attempts,
                "enable_websocket_collection": config.enable_websocket_collection,
                "enable_cpp_direct_calls": config.enable_cpp_direct_calls,
                "enable_bacnet_collection": config.enable_bacnet_collection
            })))
        }
        None => Ok(Json(json!({
            "enabled": true,
            "collection_interval_seconds": 300,
            "startup_delay_seconds": 30,
            "devices_to_collect": [],
            "point_types": ["Input", "Output", "Variable"],
            "batch_size": 100,
            "timeout_seconds": 30,
            "retry_attempts": 3,
            "enable_websocket_collection": true,
            "enable_cpp_direct_calls": true,
            "enable_bacnet_collection": false
        })))
    }
}

async fn update_collection_config(
    State(state): State<T3AppState>,
    Json(config): Json<Value>
) -> Result<Json<Value>, StatusCode> {
    let data_collector = state.data_collector.lock().await;

    match data_collector.as_ref() {
        Some(service) => {
            // Convert JSON to DataCollectionConfig
            // For now, just return success - would need proper config conversion
            Ok(Json(json!({
                "status": "success",
                "message": "Collection configuration updated",
                "action": "update_collection_config",
                "config": config
            })))
        }
        None => Ok(Json(json!({
            "status": "error",
            "message": "Data collection service is not running",
            "action": "update_collection_config"
        })))
    }
}

async fn collect_now(State(state): State<T3AppState>) -> Result<Json<Value>, StatusCode> {
    let data_collector = state.data_collector.lock().await;

    match data_collector.as_ref() {
        Some(service) => {
            match service.collect_immediately().await {
                Ok(point_count) => Ok(Json(json!({
                    "status": "success",
                    "message": format!("Immediate data collection completed. Collected {} data points.", point_count),
                    "action": "collect_now",
                    "points_collected": point_count
                }))),
                Err(e) => Ok(Json(json!({
                    "status": "error",
                    "message": format!("Immediate data collection failed: {}", e),
                    "action": "collect_now"
                })))
            }
        }
        None => Ok(Json(json!({
            "status": "error",
            "message": "Data collection service is not running",
            "action": "collect_now"
        })))
    }
}
END DISABLED DATA COLLECTION SECTION */

pub fn t3_device_routes() -> Router<T3AppState> {
    Router::new()
        // Generic table endpoints for T3Devicedb.vue interface
        .route("/:table", get(get_table_records))           // GET /api/t3_device/{table}
        .route("/:table/count", get(get_table_count))       // GET /api/t3_device/{table}/count
        .route("/:table", post(create_table_record))        // POST /api/t3_device/{table}
        .route("/:table/:id", put(update_table_record))     // PUT /api/t3_device/{table}/{id}
        .route("/:table/:id", delete(delete_table_record))  // DELETE /api/t3_device/{table}/{id}

        // Legacy endpoints (keep for compatibility)
        .route("/status", get(get_database_status))
        .route("/tables", get(get_table_data))
        .route("/tables/:table", post(create_record))
        .route("/tables/:table/:id", put(update_record))
        .route("/tables/:table/:id", delete(delete_record))
        .route("/export/:table", get(export_table))
        .route("/import/:table", post(import_table))

        // T3000 Device endpoints
        .route("/devices", get(get_devices_with_stats))
        .route("/devices", post(create_device))
        .route("/devices/:id", get(get_device_by_id))
        .route("/devices/:id", put(update_device))
        .route("/devices/:id", delete(delete_device))
        .route("/devices/:id/points", get(get_device_with_points))

        // Data Collection endpoints - TEMPORARILY DISABLED
        // .route("/collection/start", post(start_data_collection))
        // .route("/collection/stop", post(stop_data_collection))
        // .route("/collection/status", get(get_collection_status))
        // .route("/collection/config", get(get_collection_config))
        // .route("/collection/config", post(update_collection_config))
        // .route("/collection/collect-now", post(collect_now))
}

// ============================================================================
// GENERIC TABLE HANDLERS - For T3Devicedb.vue interface
// ============================================================================

/// Get all records from a specific table
async fn get_table_records(
    State(state): State<T3AppState>,
    Path(table): Path<String>,
    Query(params): Query<QueryParams>,
) -> Result<Json<Value>, StatusCode> {
    let db = get_t3_device_conn!(state);

    let page = params.page.unwrap_or(1);
    let per_page = params.per_page.unwrap_or(10);
    let offset = (page - 1) * per_page;

    let search_filter = if let Some(search) = &params.search {
        format!("WHERE name LIKE '%{}%' OR label LIKE '%{}%'", search, search)
    } else {
        String::new()
    };

    let query = format!(
        "SELECT * FROM {} {} LIMIT {} OFFSET {}",
        table, search_filter, per_page, offset
    );

    match db.query_all(Statement::from_string(DatabaseBackend::Sqlite, query)).await {
        Ok(rows) => {
            let data: Vec<Value> = rows.into_iter().map(|row| {
                let mut obj = serde_json::Map::new();
                for (i, column) in row.column_names().iter().enumerate() {
                    if let Ok(value) = row.try_get::<serde_json::Value>("", column) {
                        obj.insert(column.to_string(), value);
                    }
                }
                Value::Object(obj)
            }).collect();

            Ok(Json(json!({
                "data": data,
                "message": format!("Retrieved {} records from {}", data.len(), table),
                "total": data.len()
            })))
        }
        Err(e) => {
            eprintln!("Database error: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

/// Get count of records in a specific table
async fn get_table_count(
    State(state): State<T3AppState>,
    Path(table): Path<String>,
) -> Result<Json<Value>, StatusCode> {
    let db = get_t3_device_conn!(state);

    let query = format!("SELECT COUNT(*) as count FROM {}", table);

    match db.query_one(Statement::from_string(DatabaseBackend::Sqlite, query)).await {
        Ok(Some(row)) => {
            let count: i64 = row.try_get("", "count").unwrap_or(0);
            Ok(Json(json!({
                "count": count,
                "table": table,
                "message": format!("Table {} has {} records", table, count)
            })))
        }
        Ok(None) => Ok(Json(json!({
            "count": 0,
            "table": table,
            "message": format!("Table {} is empty", table)
        }))),
        Err(e) => {
            eprintln!("Database error: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

/// Create a new record in a specific table
async fn create_table_record(
    State(state): State<T3AppState>,
    Path(table): Path<String>,
    Json(payload): Json<Value>,
) -> Result<Json<Value>, StatusCode> {
    let db = get_t3_device_conn!(state);

    if let Some(obj) = payload.as_object() {
        let columns: Vec<String> = obj.keys().cloned().collect();
        let values: Vec<String> = obj.values().map(|v| {
            match v {
                Value::String(s) => format!("'{}'", s.replace("'", "''")),
                Value::Number(n) => n.to_string(),
                Value::Bool(b) => if *b { "1".to_string() } else { "0".to_string() },
                _ => "NULL".to_string(),
            }
        }).collect();

        let query = format!(
            "INSERT INTO {} ({}) VALUES ({})",
            table,
            columns.join(", "),
            values.join(", ")
        );

        match db.execute(Statement::from_string(DatabaseBackend::Sqlite, query)).await {
            Ok(result) => {
                Ok(Json(json!({
                    "message": format!("Record created successfully in {}", table),
                    "id": result.last_insert_id(),
                    "table": table
                })))
            }
            Err(e) => {
                eprintln!("Database error: {}", e);
                Err(StatusCode::INTERNAL_SERVER_ERROR)
            }
        }
    } else {
        Err(StatusCode::BAD_REQUEST)
    }
}

/// Update a record in a specific table
async fn update_table_record(
    State(state): State<T3AppState>,
    Path((table, id)): Path<(String, i32)>,
    Json(payload): Json<Value>,
) -> Result<Json<Value>, StatusCode> {
    let db = get_t3_device_conn!(state);

    if let Some(obj) = payload.as_object() {
        let updates: Vec<String> = obj.iter().map(|(key, value)| {
            let val_str = match value {
                Value::String(s) => format!("'{}'", s.replace("'", "''")),
                Value::Number(n) => n.to_string(),
                Value::Bool(b) => if *b { "1".to_string() } else { "0".to_string() },
                _ => "NULL".to_string(),
            };
            format!("{} = {}", key, val_str)
        }).collect();

        let query = format!(
            "UPDATE {} SET {} WHERE id = {}",
            table,
            updates.join(", "),
            id
        );

        match db.execute(Statement::from_string(DatabaseBackend::Sqlite, query)).await {
            Ok(_) => {
                Ok(Json(json!({
                    "message": format!("Record {} updated successfully in {}", id, table),
                    "id": id,
                    "table": table
                })))
            }
            Err(e) => {
                eprintln!("Database error: {}", e);
                Err(StatusCode::INTERNAL_SERVER_ERROR)
            }
        }
    } else {
        Err(StatusCode::BAD_REQUEST)
    }
}

/// Delete a record from a specific table
async fn delete_table_record(
    State(state): State<T3AppState>,
    Path((table, id)): Path<(String, i32)>,
) -> Result<Json<Value>, StatusCode> {
    let db = get_t3_device_conn!(state);

    let query = format!("DELETE FROM {} WHERE id = {}", table, id);

    match db.execute(Statement::from_string(DatabaseBackend::Sqlite, query)).await {
        Ok(_) => {
            Ok(Json(json!({
                "message": format!("Record {} deleted successfully from {}", id, table),
                "id": id,
                "table": table
            })))
        }
        Err(e) => {
            eprintln!("Database error: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}
