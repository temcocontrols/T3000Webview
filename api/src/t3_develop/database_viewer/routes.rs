/**
 * Database Viewer Routes
 *
 * Endpoints for querying SQLite databases
 */

use axum::{extract::Query, Json, http::StatusCode, response::IntoResponse};
use serde::{Deserialize, Serialize};
use rusqlite::Connection;
use std::path::PathBuf;
use std::fs;

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DatabaseInfo {
    pub name: String,
    pub path: String,
    pub size: u64,
    pub modified: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TableInfo {
    pub name: String,
    pub row_count: Option<i64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QueryRequest {
    pub database: String,
    pub query: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct QueryResponse {
    pub columns: Vec<String>,
    pub rows: Vec<Vec<serde_json::Value>>,
    pub row_count: usize,
    pub execution_time_ms: u128,
}

/// List available databases
pub async fn list_databases() -> impl IntoResponse {
    let db_path = get_database_path();

    let entries = match fs::read_dir(&db_path) {
        Ok(e) => e,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
            "error": format!("Failed to read database directory: {}", e)
        }))),
    };

    let mut databases = Vec::new();
    for entry in entries.filter_map(Result::ok) {
        let path = entry.path();
        if let Some(ext) = path.extension() {
            if ext == "db" || ext == "db3" || ext == "sqlite" {
                if let Ok(metadata) = entry.metadata() {
                    let name = entry.file_name().to_string_lossy().to_string();
                    let modified = metadata.modified().ok().and_then(|time| {
                        let datetime: chrono::DateTime<chrono::Utc> = time.into();
                        Some(datetime.to_rfc3339())
                    });

                    databases.push(DatabaseInfo {
                        name,
                        path: path.to_string_lossy().to_string(),
                        size: metadata.len(),
                        modified,
                    });
                }
            }
        }
    }

    databases.sort_by(|a, b| a.name.cmp(&b.name));

    (StatusCode::OK, Json(serde_json::json!({
        "databases": databases
    })))
}

/// List tables in a database
pub async fn list_tables(Query(query): Query<serde_json::Value>) -> impl IntoResponse {
    let db_name = match query.get("database").and_then(|v| v.as_str()) {
        Some(name) => name,
        None => return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
            "error": "Database parameter required"
        }))),
    };

    let db_path = get_database_path().join(db_name);

    // Security check
    if !db_path.exists() || !db_path.is_file() {
        return (StatusCode::NOT_FOUND, Json(serde_json::json!({
            "error": "Database not found"
        })));
    }

    let conn = match Connection::open(&db_path) {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
            "error": format!("Failed to open database: {}", e)
        }))),
    };

    let mut stmt = match conn.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name") {
        Ok(s) => s,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
            "error": format!("Failed to query tables: {}", e)
        }))),
    };

    let tables_result: Result<Vec<String>, rusqlite::Error> = stmt.query_map([], |row| row.get(0))
        .and_then(|rows| rows.collect());

    let table_names = match tables_result {
        Ok(names) => names,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
            "error": format!("Failed to fetch tables: {}", e)
        }))),
    };

    let mut tables = Vec::new();
    for name in table_names {
        let count_query = format!("SELECT COUNT(*) FROM \"{}\"", name);
        let row_count = conn.query_row(&count_query, [], |row| row.get::<_, i64>(0)).ok();

        tables.push(TableInfo {
            name,
            row_count,
        });
    }

    (StatusCode::OK, Json(serde_json::json!({
        "tables": tables
    })))
}

/// Execute SQL query
pub async fn execute_query(Json(body): Json<QueryRequest>) -> impl IntoResponse {
    let db_path = get_database_path().join(&body.database);

    if !db_path.exists() || !db_path.is_file() {
        return (StatusCode::NOT_FOUND, Json(serde_json::json!({
            "error": "Database not found"
        })));
    }

    let start = std::time::Instant::now();

    let conn = match Connection::open(&db_path) {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
            "error": format!("Failed to open database: {}", e)
        }))),
    };

    // Prepare query
    let mut stmt = match conn.prepare(&body.query) {
        Ok(s) => s,
        Err(e) => return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
            "error": format!("SQL error: {}", e)
        }))),
    };

    // Get column names
    let columns: Vec<String> = stmt.column_names().iter().map(|s| s.to_string()).collect();

    // Execute query
    let rows_result = stmt.query_map([], |row| {
        let mut values = Vec::new();
        for i in 0..columns.len() {
            let value: serde_json::Value = match row.get_ref(i) {
                Ok(v) => match v {
                    rusqlite::types::ValueRef::Null => serde_json::Value::Null,
                    rusqlite::types::ValueRef::Integer(i) => serde_json::json!(i),
                    rusqlite::types::ValueRef::Real(f) => serde_json::json!(f),
                    rusqlite::types::ValueRef::Text(t) => serde_json::json!(String::from_utf8_lossy(t)),
                    rusqlite::types::ValueRef::Blob(b) => serde_json::json!(format!("<BLOB {} bytes>", b.len())),
                },
                Err(_) => serde_json::Value::Null,
            };
            values.push(value);
        }
        Ok(values)
    });

    let rows: Vec<Vec<serde_json::Value>> = match rows_result {
        Ok(r) => r.filter_map(Result::ok).collect(),
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
            "error": format!("Query execution error: {}", e)
        }))),
    };

    let execution_time_ms = start.elapsed().as_millis();
    let row_count = rows.len();

    (StatusCode::OK, Json(serde_json::json!(QueryResponse {
        columns,
        rows,
        row_count,
        execution_time_ms,
    })))
}

/// Get database path
fn get_database_path() -> PathBuf {
    std::env::var("T3000_DATABASE_PATH")
        .map(PathBuf::from)
        .unwrap_or_else(|_| {
            // Get the current executable's directory and append Database folder
            std::env::current_exe()
                .ok()
                .and_then(|exe_path| exe_path.parent().map(|p| p.join("Database")))
                .unwrap_or_else(|| PathBuf::from("Database"))
        })
}


