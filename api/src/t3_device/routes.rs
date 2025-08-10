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

use crate::app_state::AppState;

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
async fn get_database_status(State(state): State<AppState>) -> Result<Json<DatabaseInfo>, StatusCode> {
    let db = state.t3_device_conn.lock().await;

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
            "Buildings" => "Building structures and properties",
            "Controllers" => "T3000 controller devices",
            "Inputs" => "Input points and sensors",
            "Outputs" => "Output points and actuators",
            "Variables" => "Variable points and calculated values",
            "Programs" => "Control programs and logic",
            "PID_Controllers" => "PID controllers and loops",
            "Schedules" => "Time schedules and operations",
            "Holidays" => "Holiday schedules and exceptions",
            "Trendlogs" => "Data trending and logging",
            "Alarms" => "Alarm conditions and notifications",
            "Graphics" => "Graphical displays and layouts",
            "Arrays" => "Data arrays and collections",
            "Network_Points" => "Network points and connections",
            "Units" => "Engineering units and conversions",
            "User_Units" => "Custom user-defined units",
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
        connection_type: "T3000 Device Database".to_string(),
    }))
}

// Execute a query on the specified table
async fn get_table_data(
    State(state): State<AppState>,
    Query(params): Query<QueryParams>,
) -> Result<Json<QueryResult>, StatusCode> {
    let db = state.t3_device_conn.lock().await;
    let table_name = params.table.unwrap_or_else(|| "Buildings".to_string());
    let page = params.page.unwrap_or(1);
    let per_page = params.per_page.unwrap_or(10);
    let offset = (page - 1) * per_page;

    // Validate table name to prevent SQL injection
    let valid_tables = [
        "Buildings", "Controllers", "Inputs", "Outputs", "Variables",
        "Programs", "PID_Controllers", "Schedules", "Holidays", "Trendlogs",
        "Alarms", "Graphics", "Arrays", "Network_Points", "Units", "User_Units"
    ];

    if !valid_tables.contains(&table_name.as_str()) {
        return Err(StatusCode::BAD_REQUEST);
    }

    let query = if let Some(search) = params.search {
        format!(
            "SELECT * FROM {} WHERE CAST(ID AS TEXT) LIKE '%{}%' OR CAST(Label AS TEXT) LIKE '%{}%' LIMIT {} OFFSET {}",
            table_name, search, search, per_page, offset
        )
    } else {
        format!(
            "SELECT * FROM {} LIMIT {} OFFSET {}",
            table_name, per_page, offset
        )
    };

    let statement = Statement::from_string(DatabaseBackend::Sqlite, query);
    let results = db.query_all(statement).await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let mut data = Vec::new();
    for row in results {
        let mut row_data = serde_json::Map::new();

        // Try to get common columns that most T3000 tables have
        if let Ok(id) = row.try_get::<i32>("", "ID") {
            row_data.insert("ID".to_string(), json!(id));
        }
        if let Ok(label) = row.try_get::<String>("", "Label") {
            row_data.insert("Label".to_string(), json!(label));
        }
        if let Ok(description) = row.try_get::<Option<String>>("", "Description") {
            row_data.insert("Description".to_string(), json!(description));
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
    State(state): State<AppState>,
    Path(table): Path<String>,
    Json(payload): Json<Value>,
) -> Result<Json<Value>, StatusCode> {
    let _db = state.t3_device_conn.lock().await;

    // Validate table name
    let valid_tables = [
        "Buildings", "Controllers", "Inputs", "Outputs", "Variables",
        "Programs", "PID_Controllers", "Schedules", "Holidays", "Trendlogs",
        "Alarms", "Graphics", "Arrays", "Network_Points", "Units", "User_Units"
    ];

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
    State(state): State<AppState>,
    Path((table, id)): Path<(String, i32)>,
    Json(payload): Json<Value>,
) -> Result<Json<Value>, StatusCode> {
    let _db = state.t3_device_conn.lock().await;

    // Validate table name
    let valid_tables = [
        "Buildings", "Controllers", "Inputs", "Outputs", "Variables",
        "Programs", "PID_Controllers", "Schedules", "Holidays", "Trendlogs",
        "Alarms", "Graphics", "Arrays", "Network_Points", "Units", "User_Units"
    ];

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
    State(state): State<AppState>,
    Path((table, id)): Path<(String, i32)>,
) -> Result<Json<Value>, StatusCode> {
    let _db = state.t3_device_conn.lock().await;

    // Validate table name
    let valid_tables = [
        "Buildings", "Controllers", "Inputs", "Outputs", "Variables",
        "Programs", "PID_Controllers", "Schedules", "Holidays", "Trendlogs",
        "Alarms", "Graphics", "Arrays", "Network_Points", "Units", "User_Units"
    ];

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
    State(state): State<AppState>,
    Path(table): Path<String>,
) -> Result<Json<Value>, StatusCode> {
    let db = state.t3_device_conn.lock().await;

    // Validate table name
    let valid_tables = [
        "Buildings", "Controllers", "Inputs", "Outputs", "Variables",
        "Programs", "PID_Controllers", "Schedules", "Holidays", "Trendlogs",
        "Alarms", "Graphics", "Arrays", "Network_Points", "Units", "User_Units"
    ];

    if !valid_tables.contains(&table.as_str()) {
        return Err(StatusCode::BAD_REQUEST);
    }

    let query = format!("SELECT * FROM {}", table);
    let statement = Statement::from_string(DatabaseBackend::Sqlite, query);
    let results = db.query_all(statement).await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let mut data = Vec::new();
    for row in results {
        let mut row_data = serde_json::Map::new();

        // Try to get common columns
        if let Ok(id) = row.try_get::<i32>("", "ID") {
            row_data.insert("ID".to_string(), json!(id));
        }
        if let Ok(label) = row.try_get::<String>("", "Label") {
            row_data.insert("Label".to_string(), json!(label));
        }
        if let Ok(description) = row.try_get::<Option<String>>("", "Description") {
            row_data.insert("Description".to_string(), json!(description));
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
    State(state): State<AppState>,
    Path(table): Path<String>,
    Json(payload): Json<Value>,
) -> Result<Json<Value>, StatusCode> {
    let _db = state.t3_device_conn.lock().await;

    // Validate table name
    let valid_tables = [
        "Buildings", "Controllers", "Inputs", "Outputs", "Variables",
        "Programs", "PID_Controllers", "Schedules", "Holidays", "Trendlogs",
        "Alarms", "Graphics", "Arrays", "Network_Points", "Units", "User_Units"
    ];

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

pub fn t3_device_routes() -> Router<AppState> {
    Router::new()
        .route("/status", get(get_database_status))
        .route("/tables", get(get_table_data))
        .route("/tables/:table", post(create_record))
        .route("/tables/:table/:id", put(update_record))
        .route("/tables/:table/:id", delete(delete_record))
        .route("/export/:table", get(export_table))
        .route("/import/:table", post(import_table))
}
