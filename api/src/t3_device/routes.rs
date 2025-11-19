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

use crate::app_state::T3AppState;
use crate::t3_device::services::{T3DeviceService, CreateDeviceRequest, UpdateDeviceRequest};
use crate::t3_device::points_service::{T3PointsService, CreateInputPointRequest, CreateOutputPointRequest, CreateVariablePointRequest};
use crate::t3_device::schedules_service::{T3ScheduleService, CreateScheduleRequest, UpdateScheduleRequest};
use crate::t3_device::programs_service::{T3ProgramService, CreateProgramRequest, UpdateProgramRequest};
use crate::t3_device::trendlogs_service::{T3TrendlogService, CreateTrendlogRequest, UpdateTrendlogRequest};
use crate::t3_device::trendlog_data_service::{T3TrendlogDataService, TrendlogHistoryRequest, CreateTrendlogDataRequest, SmartTrendlogRequest};
use crate::t3_device::trendlog_enhanced_routes::create_trendlog_enhanced_routes;
use crate::t3_device::trendlog_webmsg_routes::create_trendlog_webmsg_routes;
use crate::t3_device::input_update_routes::create_input_update_routes;
use crate::t3_device::output_update_routes::create_output_update_routes;
use crate::t3_device::variable_update_routes::create_variable_update_routes;

// Helper function to check if T3000 device database is available
#[allow(dead_code)]
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
        "MONITORDATA", "TRENDLOGS", "TRENDLOG_INPUTS", "TRENDLOG_DATA"
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

// Get table data for a specific device by serial number
async fn get_device_table_data(
    State(state): State<T3AppState>,
    Path((serial, table)): Path<(String, String)>,
) -> Result<Json<QueryResult>, StatusCode> {
    let db = get_t3_device_conn!(state);

    // Validate table name to prevent SQL injection
    let valid_tables = get_valid_table_names();

    if !valid_tables.contains(&table.as_str()) {
        return Err(StatusCode::BAD_REQUEST);
    }

    // Query table data filtered by SerialNumber
    let query = format!(
        "SELECT * FROM {} WHERE SerialNumber = '{}'",
        table, serial
    );

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

    let data_len = data.len();
    Ok(Json(QueryResult {
        data,
        message: format!("Retrieved {} records from {} for device {}", data_len, table, serial),
    }))
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

// T3000 Points Management Endpoints

async fn get_all_points_by_device(
    State(state): State<T3AppState>,
    Path(device_id): Path<i32>,
) -> Result<Json<Value>, StatusCode> {
    let db = get_t3_device_conn!(state);

    match T3PointsService::get_all_points_by_device(&*db, device_id).await {
        Ok(points_data) => Ok(Json(json!({
            "data": points_data,
            "message": "All points retrieved successfully"
        }))),
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR)
    }
}

async fn get_input_points(
    State(state): State<T3AppState>,
    Path(device_id): Path<i32>,
) -> Result<Json<Value>, StatusCode> {
    let db = get_t3_device_conn!(state);

    match T3PointsService::get_input_points_by_device(&*db, device_id).await {
        Ok(points) => Ok(Json(json!({
            "input_points": points,
            "count": points.len(),
            "message": "Input points retrieved successfully"
        }))),
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR)
    }
}

async fn get_output_points(
    State(state): State<T3AppState>,
    Path(device_id): Path<i32>,
) -> Result<Json<Value>, StatusCode> {
    let db = get_t3_device_conn!(state);

    match T3PointsService::get_output_points_by_device(&*db, device_id).await {
        Ok(points) => Ok(Json(json!({
            "output_points": points,
            "count": points.len(),
            "message": "Output points retrieved successfully"
        }))),
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR)
    }
}

async fn get_variable_points(
    State(state): State<T3AppState>,
    Path(device_id): Path<i32>,
) -> Result<Json<Value>, StatusCode> {
    let db = get_t3_device_conn!(state);

    match T3PointsService::get_variable_points_by_device(&*db, device_id).await {
        Ok(points) => Ok(Json(json!({
            "variable_points": points,
            "count": points.len(),
            "message": "Variable points retrieved successfully"
        }))),
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR)
    }
}

async fn create_input_point(
    State(state): State<T3AppState>,
    Json(payload): Json<CreateInputPointRequest>,
) -> Result<Json<Value>, StatusCode> {
    let db = get_t3_device_conn!(state);

    match T3PointsService::create_input_point(&*db, payload).await {
        Ok(point) => Ok(Json(json!({
            "input_point": point,
            "message": "Input point created successfully"
        }))),
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR)
    }
}

async fn create_output_point(
    State(state): State<T3AppState>,
    Json(payload): Json<CreateOutputPointRequest>,
) -> Result<Json<Value>, StatusCode> {
    let db = get_t3_device_conn!(state);

    match T3PointsService::create_output_point(&*db, payload).await {
        Ok(point) => Ok(Json(json!({
            "output_point": point,
            "message": "Output point created successfully"
        }))),
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR)
    }
}

async fn create_variable_point(
    State(state): State<T3AppState>,
    Json(payload): Json<CreateVariablePointRequest>,
) -> Result<Json<Value>, StatusCode> {
    let db = get_t3_device_conn!(state);

    match T3PointsService::create_variable_point(&*db, payload).await {
        Ok(point) => Ok(Json(json!({
            "variable_point": point,
            "message": "Variable point created successfully"
        }))),
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR)
    }
}

// T3000 Schedules Management Endpoints

async fn get_schedules_by_device(
    State(state): State<T3AppState>,
    Path(device_id): Path<i32>,
) -> Result<Json<Value>, StatusCode> {
    let db = get_t3_device_conn!(state);

    match T3ScheduleService::get_schedules_by_device(&*db, device_id).await {
        Ok(schedules) => Ok(Json(json!({
            "schedules": schedules,
            "count": schedules.len(),
            "device_id": device_id,
            "message": "Schedules retrieved successfully"
        }))),
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR)
    }
}

async fn get_schedule_stats(
    State(state): State<T3AppState>,
    Path(device_id): Path<i32>,
) -> Result<Json<Value>, StatusCode> {
    let db = get_t3_device_conn!(state);

    match T3ScheduleService::get_schedule_stats_by_device(&*db, device_id).await {
        Ok(stats) => Ok(Json(json!({
            "data": stats,
            "message": "Schedule statistics retrieved successfully"
        }))),
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR)
    }
}

async fn get_all_schedules(
    State(state): State<T3AppState>,
) -> Result<Json<Value>, StatusCode> {
    let db = get_t3_device_conn!(state);

    match T3ScheduleService::get_all_schedules_with_device_info(&*db).await {
        Ok(schedules) => Ok(Json(json!({
            "schedules": schedules,
            "count": schedules.len(),
            "message": "All schedules retrieved successfully"
        }))),
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR)
    }
}

async fn create_schedule(
    State(state): State<T3AppState>,
    Json(payload): Json<CreateScheduleRequest>,
) -> Result<Json<Value>, StatusCode> {
    let db = get_t3_device_conn!(state);

    match T3ScheduleService::create_schedule(&*db, payload).await {
        Ok(schedule) => Ok(Json(json!({
            "schedule": schedule,
            "message": "Schedule created successfully"
        }))),
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR)
    }
}

async fn get_schedule_by_id(
    State(state): State<T3AppState>,
    Path((device_id, schedule_id)): Path<(i32, String)>,
) -> Result<Json<Value>, StatusCode> {
    let db = get_t3_device_conn!(state);

    // Since schedules don't have a separate get by ID method, let's get all and filter
    match T3ScheduleService::get_schedules_by_device(&*db, device_id).await {
        Ok(schedules) => {
            let schedule = schedules.into_iter()
                .find(|s| s.schedule_id.as_ref() == Some(&schedule_id));

            match schedule {
                Some(schedule) => Ok(Json(json!({
                    "schedule": schedule,
                    "message": "Schedule found"
                }))),
                None => Err(StatusCode::NOT_FOUND)
            }
        },
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR)
    }
}

async fn update_schedule(
    State(state): State<T3AppState>,
    Path((device_id, schedule_id)): Path<(i32, String)>,
    Json(payload): Json<UpdateScheduleRequest>,
) -> Result<Json<Value>, StatusCode> {
    let db = get_t3_device_conn!(state);

    match T3ScheduleService::update_schedule(&*db, device_id, schedule_id, payload).await {
        Ok(Some(schedule)) => Ok(Json(json!({
            "schedule": schedule,
            "message": "Schedule updated successfully"
        }))),
        Ok(None) => Err(StatusCode::NOT_FOUND),
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR)
    }
}

async fn delete_schedule(
    State(state): State<T3AppState>,
    Path((device_id, schedule_id)): Path<(i32, String)>,
) -> Result<Json<Value>, StatusCode> {
    let db = get_t3_device_conn!(state);

    match T3ScheduleService::delete_schedule(&*db, device_id, schedule_id).await {
        Ok(true) => Ok(Json(json!({
            "message": "Schedule deleted successfully"
        }))),
        Ok(false) => Err(StatusCode::NOT_FOUND),
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR)
    }
}

// T3000 Programs Management Endpoints

async fn get_programs_by_device(
    State(state): State<T3AppState>,
    Path(device_id): Path<i32>,
) -> Result<Json<Value>, StatusCode> {
    let db = get_t3_device_conn!(state);

    match T3ProgramService::get_programs_by_device(&*db, device_id).await {
        Ok(programs) => Ok(Json(json!({
            "programs": programs,
            "count": programs.len(),
            "device_id": device_id,
            "message": "Programs retrieved successfully"
        }))),
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR)
    }
}

async fn get_program_stats(
    State(state): State<T3AppState>,
    Path(device_id): Path<i32>,
) -> Result<Json<Value>, StatusCode> {
    let db = get_t3_device_conn!(state);

    match T3ProgramService::get_program_stats_by_device(&*db, device_id).await {
        Ok(stats) => Ok(Json(json!({
            "data": stats,
            "message": "Program statistics retrieved successfully"
        }))),
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR)
    }
}

async fn get_programs_with_status(
    State(state): State<T3AppState>,
    Path(device_id): Path<i32>,
) -> Result<Json<Value>, StatusCode> {
    let db = get_t3_device_conn!(state);

    match T3ProgramService::get_programs_with_status(&*db, device_id).await {
        Ok(programs_status) => Ok(Json(json!({
            "data": programs_status,
            "message": "Programs with status retrieved successfully"
        }))),
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR)
    }
}

async fn get_all_programs(
    State(state): State<T3AppState>,
) -> Result<Json<Value>, StatusCode> {
    let db = get_t3_device_conn!(state);

    match T3ProgramService::get_all_programs_with_device_info(&*db).await {
        Ok(programs) => Ok(Json(json!({
            "programs": programs,
            "count": programs.len(),
            "message": "All programs retrieved successfully"
        }))),
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR)
    }
}

async fn create_program(
    State(state): State<T3AppState>,
    Json(payload): Json<CreateProgramRequest>,
) -> Result<Json<Value>, StatusCode> {
    let db = get_t3_device_conn!(state);

    match T3ProgramService::create_program(&*db, payload).await {
        Ok(program) => Ok(Json(json!({
            "program": program,
            "message": "Program created successfully"
        }))),
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR)
    }
}

async fn get_program_by_id(
    State(state): State<T3AppState>,
    Path((device_id, program_id)): Path<(i32, String)>,
) -> Result<Json<Value>, StatusCode> {
    let db = get_t3_device_conn!(state);

    match T3ProgramService::get_program_by_id(&*db, device_id, program_id).await {
        Ok(Some(program)) => Ok(Json(json!({
            "program": program,
            "message": "Program found"
        }))),
        Ok(None) => Err(StatusCode::NOT_FOUND),
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR)
    }
}

async fn update_program(
    State(state): State<T3AppState>,
    Path((device_id, program_id)): Path<(i32, String)>,
    Json(payload): Json<UpdateProgramRequest>,
) -> Result<Json<Value>, StatusCode> {
    let db = get_t3_device_conn!(state);

    match T3ProgramService::update_program(&*db, device_id, program_id, payload).await {
        Ok(Some(program)) => Ok(Json(json!({
            "program": program,
            "message": "Program updated successfully"
        }))),
        Ok(None) => Err(StatusCode::NOT_FOUND),
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR)
    }
}

async fn delete_program(
    State(state): State<T3AppState>,
    Path((device_id, program_id)): Path<(i32, String)>,
) -> Result<Json<Value>, StatusCode> {
    let db = get_t3_device_conn!(state);

    match T3ProgramService::delete_program(&*db, device_id, program_id).await {
        Ok(true) => Ok(Json(json!({
            "message": "Program deleted successfully"
        }))),
        Ok(false) => Err(StatusCode::NOT_FOUND),
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR)
    }
}

// T3000 Trendlogs Management Endpoints

async fn get_trendlogs_by_device(
    State(state): State<T3AppState>,
    Path(device_id): Path<i32>,
) -> Result<Json<Value>, StatusCode> {
    let db = get_t3_device_conn!(state);

    match T3TrendlogService::get_trendlogs_by_device(&*db, device_id).await {
        Ok(trendlogs) => Ok(Json(json!({
            "trendlogs": trendlogs,
            "count": trendlogs.len(),
            "device_id": device_id,
            "message": "Trendlogs retrieved successfully"
        }))),
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR)
    }
}

async fn get_trendlog_stats(
    State(state): State<T3AppState>,
    Path(device_id): Path<i32>,
) -> Result<Json<Value>, StatusCode> {
    let db = get_t3_device_conn!(state);

    match T3TrendlogService::get_trendlog_stats_by_device(&*db, device_id).await {
        Ok(stats) => Ok(Json(json!({
            "data": stats,
            "message": "Trendlog statistics retrieved successfully"
        }))),
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR)
    }
}

async fn get_trendlogs_with_config(
    State(state): State<T3AppState>,
    Path(device_id): Path<i32>,
) -> Result<Json<Value>, StatusCode> {
    let db = get_t3_device_conn!(state);

    match T3TrendlogService::get_trendlogs_with_config(&*db, device_id).await {
        Ok(trendlogs_config) => Ok(Json(json!({
            "data": trendlogs_config,
            "message": "Trendlogs with configuration retrieved successfully"
        }))),
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR)
    }
}

async fn get_all_trendlogs(
    State(state): State<T3AppState>,
) -> Result<Json<Value>, StatusCode> {
    let db = get_t3_device_conn!(state);

    match T3TrendlogService::get_all_trendlogs_with_device_info(&*db).await {
        Ok(trendlogs) => Ok(Json(json!({
            "trendlogs": trendlogs,
            "count": trendlogs.len(),
            "message": "All trendlogs retrieved successfully"
        }))),
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR)
    }
}

async fn create_trendlog(
    State(state): State<T3AppState>,
    Json(payload): Json<CreateTrendlogRequest>,
) -> Result<Json<Value>, StatusCode> {
    let db = get_t3_device_conn!(state);

    match T3TrendlogService::create_trendlog(&*db, payload).await {
        Ok(trendlog) => Ok(Json(json!({
            "trendlog": trendlog,
            "message": "Trendlog created successfully"
        }))),
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR)
    }
}

async fn get_trendlog_by_index(
    State(state): State<T3AppState>,
    Path((device_id, trendlog_index)): Path<(i32, String)>,
) -> Result<Json<Value>, StatusCode> {
    let db = get_t3_device_conn!(state);

    match T3TrendlogService::get_trendlog_by_index(&*db, device_id, trendlog_index).await {
        Ok(Some(trendlog)) => Ok(Json(json!({
            "trendlog": trendlog,
            "message": "Trendlog found"
        }))),
        Ok(None) => Err(StatusCode::NOT_FOUND),
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR)
    }
}

async fn update_trendlog(
    State(state): State<T3AppState>,
    Path((device_id, trendlog_index)): Path<(i32, String)>,
    Json(payload): Json<UpdateTrendlogRequest>,
) -> Result<Json<Value>, StatusCode> {
    let db = get_t3_device_conn!(state);

    match T3TrendlogService::update_trendlog(&*db, device_id, trendlog_index, payload).await {
        Ok(Some(trendlog)) => Ok(Json(json!({
            "trendlog": trendlog,
            "message": "Trendlog updated successfully"
        }))),
        Ok(None) => Err(StatusCode::NOT_FOUND),
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR)
    }
}

async fn delete_trendlog(
    State(state): State<T3AppState>,
    Path((device_id, trendlog_index)): Path<(i32, String)>,
) -> Result<Json<Value>, StatusCode> {
    let db = get_t3_device_conn!(state);

    match T3TrendlogService::delete_trendlog(&*db, device_id, trendlog_index).await {
        Ok(true) => Ok(Json(json!({
            "message": "Trendlog deleted successfully"
        }))),
        Ok(false) => Err(StatusCode::NOT_FOUND),
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
        // Generic table endpoints for T3DeviceDb.vue interface
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
        .route("/devices/:id/all-points", get(get_all_points_by_device))
        .route("/devices/:serial/table/:table", get(get_device_table_data))  // Generic table query by serial number

        // T3000 Points endpoints
        .route("/devices/:id/input-points", get(get_input_points))
        .route("/devices/:id/output-points", get(get_output_points))
        .route("/devices/:id/variable-points", get(get_variable_points))
        .route("/points/:id/inputs", get(get_input_points))        // Alias for simpler path
        .route("/points/:id/outputs", get(get_output_points))      // Alias for simpler path
        .route("/points/:id/variables", get(get_variable_points))  // Alias for simpler path
        .route("/input-points", post(create_input_point))
        .route("/output-points", post(create_output_point))
        .route("/variable-points", post(create_variable_point))

        // T3000 Schedules endpoints
        .route("/devices/:id/schedules", get(get_schedules_by_device))
        .route("/devices/:id/schedules/stats", get(get_schedule_stats))
        .route("/schedules", get(get_all_schedules))
        .route("/schedules", post(create_schedule))
        .route("/devices/:device_id/schedules/:schedule_id", get(get_schedule_by_id))
        .route("/devices/:device_id/schedules/:schedule_id", put(update_schedule))
        .route("/devices/:device_id/schedules/:schedule_id", delete(delete_schedule))

        // T3000 Programs endpoints
        .route("/devices/:id/programs", get(get_programs_by_device))
        .route("/devices/:id/programs/stats", get(get_program_stats))
        .route("/devices/:id/programs/status", get(get_programs_with_status))
        .route("/programs", get(get_all_programs))
        .route("/programs", post(create_program))
        .route("/devices/:device_id/programs/:program_id", get(get_program_by_id))
        .route("/devices/:device_id/programs/:program_id", put(update_program))
        .route("/devices/:device_id/programs/:program_id", delete(delete_program))

        // T3000 Trendlogs endpoints
        .route("/devices/:id/trendlogs", get(get_trendlogs_by_device))
        .route("/devices/:id/trendlogs/stats", get(get_trendlog_stats))
        .route("/devices/:id/trendlogs/config", get(get_trendlogs_with_config))
        .route("/trendlogs", get(get_all_trendlogs))
        .route("/trendlogs", post(create_trendlog))
        .route("/devices/:device_id/trendlogs/:trendlog_index", get(get_trendlog_by_index))
        .route("/devices/:device_id/trendlogs/:trendlog_index", put(update_trendlog))
        .route("/devices/:device_id/trendlogs/:trendlog_index", delete(delete_trendlog))

        // T3000 Trendlog Data endpoints (TRENDLOG_DATA table - Historical Data)
        .route("/devices/:device_id/trendlogs/:trendlog_id/history", post(get_trendlog_history))
        .route("/devices/:device_id/trendlog-data/stats", get(get_trendlog_data_stats))
        .route("/devices/:device_id/trendlog-data/recent", get(get_recent_trendlog_data))
        .route("/devices/:device_id/trendlog-data/smart", post(get_smart_trendlog_data))
        .route("/trendlog-data/realtime", post(save_realtime_trendlog_data))
        .route("/trendlog-data/realtime/batch", post(save_realtime_trendlog_batch))
        .route("/devices/:device_id/trendlog-data/cleanup", delete(cleanup_old_trendlog_data))

        // Project Point View endpoints
        .route("/devices/:serial_number/capacity", get(get_device_capacity))
        .route("/tree/project-view", get(get_project_point_tree))

        // Data Collection endpoints - TEMPORARILY DISABLED
        // .route("/collection/start", post(start_data_collection))
        // .route("/collection/stop", post(stop_data_collection))
        // .route("/collection/status", get(get_collection_status))
        // .route("/collection/config", get(get_collection_config))
        // .route("/collection/config", post(update_collection_config))
        // .route("/collection/collect-now", post(collect_now))

        // 🆕 Enhanced TrendLog FFI Routes
        .merge(create_trendlog_enhanced_routes())

        // 🟢 TrendLog WebMsg Routes (WORKING HandleWebViewMsg approach)
        .merge(create_trendlog_webmsg_routes())

        // 🆕 Point Update Routes (UPDATE_WEBVIEW_LIST Action 16)
        .merge(create_input_update_routes())
        .merge(create_output_update_routes())
        .merge(create_variable_update_routes())
}

// ============================================================================
// GENERIC TABLE HANDLERS - For T3DeviceDb.vue interface
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
            for (_i, column) in row.column_names().iter().enumerate() {
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

// ============================================================================
// TRENDLOG DATA HANDLERS - For TrendLog IndexPage.vue historical data integration
// ============================================================================

/// Get trendlog history data for TrendLogChart component
async fn get_trendlog_history(
    State(state): State<T3AppState>,
    Path((device_id, trendlog_id)): Path<(i32, String)>,
    Json(mut payload): Json<TrendlogHistoryRequest>,
) -> Result<Json<Value>, StatusCode> {
    use crate::logger::{write_structured_log_with_level, LogLevel};

    let db = get_t3_device_conn!(state);

    // Ensure the payload has the correct device_id and trendlog_id from the URL path
    payload.serial_number = device_id;
    payload.trendlog_id = trendlog_id.clone(); // Clone for later use in error logging

    // Log the history request
    let request_info = format!(
        "🔄 [Routes] Get trendlog history - Device: {}, TrendLog: {}, Panel: {}, Time: {} to {}, Limit: {:?}, SpecificPoints: {}",
        device_id,
        payload.trendlog_id,
        payload.panel_id,
        payload.start_time.as_deref().unwrap_or("N/A"),
        payload.end_time.as_deref().unwrap_or("N/A"),
        payload.limit,
        payload.specific_points.as_ref().map(|sp| sp.len()).unwrap_or(0)
    );
    let _ = write_structured_log_with_level("T3_Webview_API", &request_info, LogLevel::Info);

    match T3TrendlogDataService::get_trendlog_history(&*db, payload).await {
        Ok(history_data) => {
            let success_info = format!(
                "✅ [Routes] Trendlog history retrieved successfully - Device: {}",
                device_id
            );
            let _ = write_structured_log_with_level("T3_Webview_API", &success_info, LogLevel::Info);
            Ok(Json(history_data))
        },
        Err(error) => {
            let error_info = format!(
                "❌ [Routes] Get trendlog history FAILED - Device: {}, TrendLog: {}, Error: {:?}",
                device_id,
                trendlog_id, // Use the path parameter instead of moved payload
                error
            );
            let _ = write_structured_log_with_level("T3_Webview_API", &error_info, LogLevel::Error);

            eprintln!("❌ [Routes] Trendlog history error details: {:?}", error);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

/// Get trendlog data statistics
async fn get_trendlog_data_stats(
    State(state): State<T3AppState>,
    Path(device_id): Path<i32>,
    Query(params): Query<std::collections::HashMap<String, String>>,
) -> Result<Json<Value>, StatusCode> {
    let db = get_t3_device_conn!(state);

    let panel_id = params.get("panel_id")
        .and_then(|p| p.parse::<i32>().ok())
        .unwrap_or(1);

    match T3TrendlogDataService::get_data_statistics(&*db, device_id, panel_id).await {
        Ok(stats) => Ok(Json(stats)),
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR)
    }
}

/// Get recent trendlog data for realtime display
async fn get_recent_trendlog_data(
    State(state): State<T3AppState>,
    Path(device_id): Path<i32>,
    Query(params): Query<std::collections::HashMap<String, String>>,
) -> Result<Json<Value>, StatusCode> {
    let db = get_t3_device_conn!(state);

    let panel_id = params.get("panel_id")
        .and_then(|p| p.parse::<i32>().ok())
        .unwrap_or(1);

    let limit = params.get("limit")
        .and_then(|l| l.parse::<u64>().ok());

    let point_types = params.get("point_types")
        .map(|types| types.split(',').map(|s| s.to_string()).collect::<Vec<String>>());

    match T3TrendlogDataService::get_recent_data(&*db, device_id, panel_id, point_types, limit).await {
        Ok(recent_data) => {
            // Format the data with value scaling (same as history query)
            let formatted_data: Vec<serde_json::Value> = recent_data.iter().map(|data| {
                // Apply the same scaling logic as in history query
                let original_value = data.value.parse::<f64>().unwrap_or(0.0);
                let mut scaled_value = original_value;
                let was_scaled = original_value > 1000.0;

                if was_scaled {
                    scaled_value = original_value / 1000.0;
                }

                serde_json::json!({
                    "time": data.logging_time_fmt,
                    "value": scaled_value,
                    "point_id": data.point_id,
                    "point_type": data.point_type,
                    "point_index": data.point_index,
                    "units": data.units,
                    "range": data.range_field,
                    "raw_value": data.value,
                    "original_value": original_value,
                    "was_scaled": was_scaled,
                    "is_analog": data.digital_analog.as_ref().map(|da| da == "1").unwrap_or(true)
                })
            }).collect();

            Ok(Json(json!({
                "data": formatted_data,
                "count": formatted_data.len(),
                "message": "Recent trendlog data retrieved successfully"
            })))
        },
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR)
    }
}

/// Smart trendlog data retrieval with source consolidation
async fn get_smart_trendlog_data(
    State(state): State<T3AppState>,
    Path(device_id): Path<i32>,
    Json(request): Json<SmartTrendlogRequest>,
) -> Result<Json<Value>, StatusCode> {
    let db = get_t3_device_conn!(state);

    // Create smart trendlog request with device_id
    let smart_request = SmartTrendlogRequest {
        serial_number: device_id,
        panel_id: request.panel_id,
        lookback_minutes: request.lookback_minutes,
        data_sources: request.data_sources,
        specific_points: request.specific_points,
        consolidate_duplicates: request.consolidate_duplicates,
        max_points: request.max_points,
    };

    match T3TrendlogDataService::get_smart_trendlog_data(&*db, smart_request).await {
        Ok(response) => Ok(Json(json!({
            "data": response.data,
            "total_points": response.total_points,
            "sources_used": response.sources_used,
            "consolidation_applied": response.consolidation_applied,
            "has_historical_data": response.has_historical_data,
            "message": "Smart trendlog data retrieved successfully"
        }))),
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR)
    }
}

/// Save realtime trendlog data from socket port 9104
async fn save_realtime_trendlog_data(
    State(state): State<T3AppState>,
    Json(payload): Json<CreateTrendlogDataRequest>,
) -> Result<Json<Value>, StatusCode> {
    let db = get_t3_device_conn!(state);

    match T3TrendlogDataService::save_realtime_data(&*db, payload).await {
        Ok(saved_data) => Ok(Json(json!({
            "data": saved_data,
            "message": "Realtime trendlog data saved successfully"
        }))),
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR)
    }
}

/// Save realtime trendlog data batch from socket port 9104
async fn save_realtime_trendlog_batch(
    State(state): State<T3AppState>,
    Json(payload): Json<Vec<CreateTrendlogDataRequest>>,
) -> Result<Json<Value>, StatusCode> {
    use crate::logger::{write_structured_log_with_level, LogLevel};

    let db = get_t3_device_conn!(state);

    // Log the batch save request
    let request_info = format!(
        "🔄 [Routes] Realtime batch save request - {} data points",
        payload.len()
    );
    let _ = write_structured_log_with_level("T3_Webview_API", &request_info, LogLevel::Info);

    match T3TrendlogDataService::save_realtime_batch(&*db, payload).await {
        Ok(rows_affected) => {
            let success_info = format!(
                "✅ [Routes] Realtime batch save successful - {} rows affected",
                rows_affected
            );
            let _ = write_structured_log_with_level("T3_Webview_API", &success_info, LogLevel::Info);

            Ok(Json(json!({
                "rows_affected": rows_affected,
                "message": "Realtime trendlog batch data saved successfully"
            })))
        },
        Err(error) => {
            let error_info = format!(
                "❌ [Routes] Realtime batch save FAILED - Error: {:?}",
                error
            );
            let _ = write_structured_log_with_level("T3_Webview_API", &error_info, LogLevel::Error);

            eprintln!("❌ [Routes] Realtime batch save error details: {:?}", error);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

/// Cleanup old trendlog data
async fn cleanup_old_trendlog_data(
    State(state): State<T3AppState>,
    Path(device_id): Path<i32>,
    Query(params): Query<std::collections::HashMap<String, String>>,
) -> Result<Json<Value>, StatusCode> {
    let db = get_t3_device_conn!(state);

    let days_to_keep = params.get("days")
        .and_then(|d| d.parse::<i64>().ok())
        .unwrap_or(30); // Default keep 30 days

    match T3TrendlogDataService::cleanup_old_data(&*db, device_id, days_to_keep).await {
        Ok(rows_deleted) => Ok(Json(json!({
            "rows_deleted": rows_deleted,
            "days_kept": days_to_keep,
            "message": "Old trendlog data cleaned up successfully"
        }))),
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR)
    }
}

// ============================================================================
// PROJECT POINT VIEW ENDPOINTS
// ============================================================================

/// Device capacity information for Project Point View
#[derive(Serialize)]
pub struct DeviceCapacity {
    pub serial_number: String,
    pub device_name: String,
    pub inputs: CapacityInfo,
    pub outputs: CapacityInfo,
    pub variables: CapacityInfo,
    pub programs: CapacityInfo,
    pub schedules: CapacityInfo,
    pub holidays: CapacityInfo,
    pub pid_controllers: CapacityInfo,
    pub graphics: CapacityInfo,
    pub trendlogs: CapacityInfo,
}

#[derive(Serialize)]
pub struct CapacityInfo {
    pub used: i32,
    pub total: i32,
    pub percentage: f32,
}

/// Get device capacity and usage information
async fn get_device_capacity(
    State(state): State<T3AppState>,
    Path(serial_number): Path<String>,
) -> Result<Json<DeviceCapacity>, StatusCode> {
    let db = get_t3_device_conn!(state);

    // Get device information
    let device_query = Statement::from_string(
        DatabaseBackend::Sqlite,
        format!("SELECT Product_name, Product_class_ID FROM DEVICES WHERE Serial_ID = '{}'", serial_number)
    );

    let device_result = db.query_one(device_query).await
        .map_err(|_| StatusCode::NOT_FOUND)?
        .ok_or(StatusCode::NOT_FOUND)?;

    let device_name: String = device_result.try_get("", "Product_name")
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let product_class_id: i32 = device_result.try_get("", "Product_class_ID")
        .unwrap_or(0);

    // Get capacity totals based on product type
    let (input_total, output_total, var_total) = match product_class_id {
        74 | 88 => (64, 64, 128),  // T3-TB, T3-LB
        35 => (32, 32, 64),         // T3-8O
        _ => (64, 64, 128),         // Default
    };

    // Count used inputs
    let input_count_query = Statement::from_string(
        DatabaseBackend::Sqlite,
        format!("SELECT COUNT(*) as count FROM INPUTS WHERE Panel_Number = '{}' AND Label != ''", serial_number)
    );
    let input_count = db.query_one(input_count_query).await
        .ok()
        .and_then(|r| r)
        .and_then(|r| r.try_get::<i32>("", "count").ok())
        .unwrap_or(0);

    // Count used outputs
    let output_count_query = Statement::from_string(
        DatabaseBackend::Sqlite,
        format!("SELECT COUNT(*) as count FROM OUTPUTS WHERE Panel_Number = '{}' AND Label != ''", serial_number)
    );
    let output_count = db.query_one(output_count_query).await
        .ok()
        .and_then(|r| r)
        .and_then(|r| r.try_get::<i32>("", "count").ok())
        .unwrap_or(0);

    // Count used variables
    let var_count_query = Statement::from_string(
        DatabaseBackend::Sqlite,
        format!("SELECT COUNT(*) as count FROM VARIABLES WHERE Panel_Number = '{}' AND Label != ''", serial_number)
    );
    let var_count = db.query_one(var_count_query).await
        .ok()
        .and_then(|r| r)
        .and_then(|r| r.try_get::<i32>("", "count").ok())
        .unwrap_or(0);

    // Count used programs, schedules, holidays, etc.
    let program_count = count_records(&*db, "PROGRAMS", &serial_number).await;
    let schedule_count = count_records(&*db, "SCHEDULES", &serial_number).await;
    let holiday_count = count_records(&*db, "HOLIDAYS", &serial_number).await;
    let pid_count = count_records_with_desc(&*db, "PID_TABLE", &serial_number).await;
    let graphic_count = count_records(&*db, "GRAPHICS", &serial_number).await;
    let trendlog_count = count_records(&*db, "TRENDLOGS", &serial_number).await;

    // Calculate percentages
    let calc_percentage = |used: i32, total: i32| -> f32 {
        if total == 0 { 0.0 } else { (used as f32 / total as f32) * 100.0 }
    };

    Ok(Json(DeviceCapacity {
        serial_number: serial_number.clone(),
        device_name,
        inputs: CapacityInfo {
            used: input_count,
            total: input_total,
            percentage: calc_percentage(input_count, input_total),
        },
        outputs: CapacityInfo {
            used: output_count,
            total: output_total,
            percentage: calc_percentage(output_count, output_total),
        },
        variables: CapacityInfo {
            used: var_count,
            total: var_total,
            percentage: calc_percentage(var_count, var_total),
        },
        programs: CapacityInfo {
            used: program_count,
            total: 16,
            percentage: calc_percentage(program_count, 16),
        },
        schedules: CapacityInfo {
            used: schedule_count,
            total: 8,
            percentage: calc_percentage(schedule_count, 8),
        },
        holidays: CapacityInfo {
            used: holiday_count,
            total: 4,
            percentage: calc_percentage(holiday_count, 4),
        },
        pid_controllers: CapacityInfo {
            used: pid_count,
            total: 16,
            percentage: calc_percentage(pid_count, 16),
        },
        graphics: CapacityInfo {
            used: graphic_count,
            total: 16,
            percentage: calc_percentage(graphic_count, 16),
        },
        trendlogs: CapacityInfo {
            used: trendlog_count,
            total: 12,
            percentage: calc_percentage(trendlog_count, 12),
        },
    }))
}

// Helper function to count records with Label field
async fn count_records(db: &sea_orm::DatabaseConnection, table: &str, serial: &str) -> i32 {
    let query = Statement::from_string(
        DatabaseBackend::Sqlite,
        format!("SELECT COUNT(*) as count FROM {} WHERE Panel_Number = '{}' AND Label != ''", table, serial)
    );
    db.query_one(query).await
        .ok()
        .and_then(|r| r)
        .and_then(|r| r.try_get::<i32>("", "count").ok())
        .unwrap_or(0)
}

// Helper function for PID_TABLE which uses Description field
async fn count_records_with_desc(db: &sea_orm::DatabaseConnection, table: &str, serial: &str) -> i32 {
    let query = Statement::from_string(
        DatabaseBackend::Sqlite,
        format!("SELECT COUNT(*) as count FROM {} WHERE Panel_Number = '{}' AND Description != ''", table, serial)
    );
    db.query_one(query).await
        .ok()
        .and_then(|r| r)
        .and_then(|r| r.try_get::<i32>("", "count").ok())
        .unwrap_or(0)
}

/// Project Point Tree View node
#[derive(Serialize)]
pub struct ProjectTreeNode {
    pub name: String,
    pub node_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub serial_number: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub point_type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub used: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub total: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub percentage: Option<f32>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    #[serde(default)]
    pub children: Vec<ProjectTreeNode>,
}

/// Get project point view tree structure
async fn get_project_point_tree(
    State(state): State<T3AppState>,
) -> Result<Json<ProjectTreeNode>, StatusCode> {
    let db = get_t3_device_conn!(state);

    // Get all devices
    let devices_query = Statement::from_string(
        DatabaseBackend::Sqlite,
        "SELECT Serial_ID, Product_name, Online_Status, Product_class_ID FROM DEVICES ORDER BY Product_name".to_string()
    );

    let devices_result = db.query_all(devices_query).await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Build device nodes with capacity info
    let mut device_nodes = Vec::new();

    for device in devices_result {
        let serial_number: String = device.try_get("", "Serial_ID")
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
        let device_name: String = device.try_get("", "Product_name")
            .unwrap_or_else(|_| format!("Device {}", serial_number));
        let online_status: i32 = device.try_get("", "Online_Status").unwrap_or(0);
        let product_class_id: i32 = device.try_get("", "Product_class_ID").unwrap_or(0);

        let status = if online_status == 1 { "online" } else { "offline" };

        // Get capacity totals
        let (input_total, output_total, var_total) = match product_class_id {
            74 | 88 => (64, 64, 128),
            35 => (32, 32, 64),
            _ => (64, 64, 128),
        };

        // Count used points for this device
        let input_count = count_records(&*db, "INPUTS", &serial_number).await;
        let output_count = count_records(&*db, "OUTPUTS", &serial_number).await;
        let var_count = count_records(&*db, "VARIABLES", &serial_number).await;
        let program_count = count_records(&*db, "PROGRAMS", &serial_number).await;
        let schedule_count = count_records(&*db, "SCHEDULES", &serial_number).await;
        let holiday_count = count_records(&*db, "HOLIDAYS", &serial_number).await;
        let pid_count = count_records_with_desc(&*db, "PID_TABLE", &serial_number).await;
        let graphic_count = count_records(&*db, "GRAPHICS", &serial_number).await;
        let trendlog_count = count_records(&*db, "TRENDLOGS", &serial_number).await;

        let calc_percentage = |used: i32, total: i32| -> f32 {
            if total == 0 { 0.0 } else { (used as f32 / total as f32) * 100.0 }
        };

        // Build point type children nodes
        let point_children = vec![
            ProjectTreeNode {
                name: format!("Output ({}/{})", output_count, output_total),
                node_type: "point_type".to_string(),
                serial_number: None,
                status: None,
                point_type: Some("outputs".to_string()),
                used: Some(output_count),
                total: Some(output_total),
                percentage: Some(calc_percentage(output_count, output_total)),
                children: vec![],
            },
            ProjectTreeNode {
                name: format!("Input ({}/{})", input_count, input_total),
                node_type: "point_type".to_string(),
                serial_number: None,
                status: None,
                point_type: Some("inputs".to_string()),
                used: Some(input_count),
                total: Some(input_total),
                percentage: Some(calc_percentage(input_count, input_total)),
                children: vec![],
            },
            ProjectTreeNode {
                name: format!("Variable ({}/{})", var_count, var_total),
                node_type: "point_type".to_string(),
                serial_number: None,
                status: None,
                point_type: Some("variables".to_string()),
                used: Some(var_count),
                total: Some(var_total),
                percentage: Some(calc_percentage(var_count, var_total)),
                children: vec![],
            },
            ProjectTreeNode {
                name: format!("Pid ({}/16)", pid_count),
                node_type: "point_type".to_string(),
                serial_number: None,
                status: None,
                point_type: Some("pid".to_string()),
                used: Some(pid_count),
                total: Some(16),
                percentage: Some(calc_percentage(pid_count, 16)),
                children: vec![],
            },
            ProjectTreeNode {
                name: format!("Schedule ({}/8)", schedule_count),
                node_type: "point_type".to_string(),
                serial_number: None,
                status: None,
                point_type: Some("schedules".to_string()),
                used: Some(schedule_count),
                total: Some(8),
                percentage: Some(calc_percentage(schedule_count, 8)),
                children: vec![],
            },
            ProjectTreeNode {
                name: format!("Holiday ({}/4)", holiday_count),
                node_type: "point_type".to_string(),
                serial_number: None,
                status: None,
                point_type: Some("holidays".to_string()),
                used: Some(holiday_count),
                total: Some(4),
                percentage: Some(calc_percentage(holiday_count, 4)),
                children: vec![],
            },
            ProjectTreeNode {
                name: format!("Program ({}/16)", program_count),
                node_type: "point_type".to_string(),
                serial_number: None,
                status: None,
                point_type: Some("programs".to_string()),
                used: Some(program_count),
                total: Some(16),
                percentage: Some(calc_percentage(program_count, 16)),
                children: vec![],
            },
            ProjectTreeNode {
                name: format!("Graphic ({}/16)", graphic_count),
                node_type: "point_type".to_string(),
                serial_number: None,
                status: None,
                point_type: Some("graphics".to_string()),
                used: Some(graphic_count),
                total: Some(16),
                percentage: Some(calc_percentage(graphic_count, 16)),
                children: vec![],
            },
            ProjectTreeNode {
                name: format!("Trendlog ({}/12)", trendlog_count),
                node_type: "point_type".to_string(),
                serial_number: None,
                status: None,
                point_type: Some("trendlogs".to_string()),
                used: Some(trendlog_count),
                total: Some(12),
                percentage: Some(calc_percentage(trendlog_count, 12)),
                children: vec![],
            },
        ];

        // Build device node
        device_nodes.push(ProjectTreeNode {
            name: device_name,
            node_type: "device".to_string(),
            serial_number: Some(serial_number),
            status: Some(status.to_string()),
            point_type: None,
            used: None,
            total: None,
            percentage: None,
            children: point_children,
        });
    }

    // Build "System List" node
    let system_list_node = ProjectTreeNode {
        name: "System List".to_string(),
        node_type: "system".to_string(),
        serial_number: None,
        status: None,
        point_type: None,
        used: None,
        total: None,
        percentage: None,
        children: device_nodes,
    };

    // Build root "Point List" node
    let root_node = ProjectTreeNode {
        name: "Point List".to_string(),
        node_type: "root".to_string(),
        serial_number: None,
        status: None,
        point_type: None,
        used: None,
        total: None,
        percentage: None,
        children: vec![system_list_node],
    };

    Ok(Json(root_node))
}

