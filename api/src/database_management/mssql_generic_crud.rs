//! Generic MSSQL CRUD Layer — tiberius-based operations for any T3000 table
//!
//! Provides generic SELECT / INSERT / UPDATE / DELETE / COUNT operations
//! that work with any table using dynamic column reflection.
//! This module is the MSSQL equivalent of SeaORM for route handlers.
//!
//! All table and column names are whitelist-validated to prevent SQL injection.
//! All values go through parameterized queries where possible.

use super::mssql_queries::MssqlPool;
use serde_json::{json, Value};

// ============================================================================
// Table Whitelist — Only these tables can be accessed via generic CRUD
// ============================================================================

/// All valid T3000 device table names (matches MSSQL schema).
const VALID_TABLES: &[&str] = &[
    // Core T3000 tables
    "DEVICES", "INPUTS", "OUTPUTS", "VARIABLES",
    "PROGRAMS", "SCHEDULES", "PID_TABLE", "HOLIDAYS",
    "GRAPHICS", "GRAPHIC_LABELS", "ALARMS", "ARRAYS",
    // Extended tables
    "CONVERSION_TABLES", "CUSTOM_UNITS", "USERS",
    "EXTIO_DEVICES", "EMAIL_ALARMS", "REMOTE_POINTS",
    // Settings tables
    "NETWORK_SETTINGS", "COMMUNICATION_SETTINGS", "PROTOCOL_SETTINGS",
    "WIFI_SETTINGS", "DYNDNS_SETTINGS", "MISC_SETTINGS",
    "TIME_SETTINGS", "HARDWARE_INFO", "ALARM_SETTINGS",
    "FEATURE_FLAGS", "REMOTE_TSTAT_DB",
    // Trendlog tables
    "TRENDLOGS", "TRENDLOG_INPUTS", "TRENDLOG_DATA",
    "TRENDLOG_DATA_DETAIL", "TRENDLOG_DATA_OLD", "TRENDLOG_VIEWS",
    // Management tables
    "DATABASE_FILES", "DATABASE_PARTITION_CONFIG", "DATABASE_PARTITIONS",
    "DATA_SYNC_METADATA", "TRENDLOG_DATA_SYNC_METADATA",
    "SERVER_CLIENT_REGISTRY", "APPLICATION_CONFIG", "APPLICATION_CONFIG_HISTORY",
    "SYSTEM_LOGS",
    // Data tables
    "MONITORDATA", "MSV_DATA", "TSTAT_SCHEDULES", "VARIABLE_UNITS",
];

/// Validate that a table name is in the whitelist.
fn validate_table(table: &str) -> Result<&str, String> {
    let upper = table.to_uppercase();
    for valid in VALID_TABLES {
        if upper == *valid {
            return Ok(*valid);
        }
    }
    Err(format!("Invalid table name: {}", table))
}

/// Validate a column name — only allows alphanumeric + underscore characters.
fn validate_column_name(col: &str) -> Result<(), String> {
    if col.is_empty() {
        return Err("Empty column name".to_string());
    }
    if col.chars().all(|c| c.is_alphanumeric() || c == '_') {
        Ok(())
    } else {
        Err(format!("Invalid column name: {}", col))
    }
}

// ============================================================================
// Schema Discovery — Get column names from MSSQL information_schema
// ============================================================================

/// Get column names for a table from INFORMATION_SCHEMA.COLUMNS.
pub async fn get_table_columns(pool: &MssqlPool, table: &str) -> Result<Vec<String>, String> {
    let table = validate_table(table)?;
    let mut conn = pool.get().await.map_err(|e| format!("Pool error: {}", e))?;

    let result = conn
        .query(
            "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS \
             WHERE TABLE_NAME = @P1 ORDER BY ORDINAL_POSITION",
            &[&table],
        )
        .await
        .map_err(|e| format!("Column query failed: {}", e))?;

    let mut columns = Vec::new();
    let rows: Vec<_> = result
        .into_results()
        .await
        .map_err(|e| format!("Column fetch failed: {}", e))?;

    for result_set in &rows {
        for row in result_set {
            if let Some(name) = row.get::<&str, _>(0) {
                columns.push(name.to_string());
            }
        }
    }

    Ok(columns)
}

/// List all user tables in the MSSQL database.
pub async fn list_tables(pool: &MssqlPool) -> Result<Vec<String>, String> {
    let mut conn = pool.get().await.map_err(|e| format!("Pool error: {}", e))?;

    let result = conn
        .query(
            "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES \
             WHERE TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME",
            &[],
        )
        .await
        .map_err(|e| format!("Table list query failed: {}", e))?;

    let mut tables = Vec::new();
    let rows: Vec<_> = result
        .into_results()
        .await
        .map_err(|e| format!("Table list fetch failed: {}", e))?;

    for result_set in &rows {
        for row in result_set {
            if let Some(name) = row.get::<&str, _>(0) {
                tables.push(name.to_string());
            }
        }
    }

    Ok(tables)
}

// ============================================================================
// SELECT — Generic read operations
// ============================================================================

/// Select all rows from a table with pagination.
/// Returns Vec<serde_json::Value> where each row is a JSON object.
pub async fn select_all(
    pool: &MssqlPool,
    table: &str,
    page: u64,
    per_page: u64,
) -> Result<Vec<Value>, String> {
    let table = validate_table(table)?;
    let columns = get_table_columns(pool, table).await?;
    if columns.is_empty() {
        return Ok(Vec::new());
    }

    let offset = (page.saturating_sub(1)) * per_page;
    let mut conn = pool.get().await.map_err(|e| format!("Pool error: {}", e))?;

    // MSSQL requires ORDER BY for OFFSET/FETCH. Use first column as default order.
    let order_col = &columns[0];
    let sql = format!(
        "SELECT * FROM [{table}] ORDER BY [{order_col}] OFFSET {offset} ROWS FETCH NEXT {per_page} ROWS ONLY"
    );

    let result = conn
        .query(sql.as_str(), &[])
        .await
        .map_err(|e| format!("SELECT failed on {}: {}", table, e))?;

    let result_sets = result
        .into_results()
        .await
        .map_err(|e| format!("Row fetch failed: {}", e))?;

    Ok(result_sets_to_json(&result_sets, &columns))
}

/// Select all rows for a specific device (WHERE SerialNumber = @P1).
pub async fn select_by_device(
    pool: &MssqlPool,
    table: &str,
    serial_number: i32,
) -> Result<Vec<Value>, String> {
    let table = validate_table(table)?;
    let columns = get_table_columns(pool, table).await?;
    if columns.is_empty() {
        return Ok(Vec::new());
    }

    // Check if table has SerialNumber column
    if !columns.iter().any(|c| c.eq_ignore_ascii_case("SerialNumber")) {
        return Err(format!("Table {} has no SerialNumber column", table));
    }

    let mut conn = pool.get().await.map_err(|e| format!("Pool error: {}", e))?;

    let sql = format!("SELECT * FROM [{table}] WHERE SerialNumber = @P1");

    let result = conn
        .query(sql.as_str(), &[&serial_number])
        .await
        .map_err(|e| format!("SELECT by device failed on {}: {}", table, e))?;

    let result_sets = result
        .into_results()
        .await
        .map_err(|e| format!("Row fetch failed: {}", e))?;

    Ok(result_sets_to_json(&result_sets, &columns))
}

/// Select a single row by primary key (id or SerialNumber).
pub async fn select_by_id(
    pool: &MssqlPool,
    table: &str,
    id: i32,
) -> Result<Option<Value>, String> {
    let table = validate_table(table)?;
    let columns = get_table_columns(pool, table).await?;
    if columns.is_empty() {
        return Ok(None);
    }

    // Detect primary key column: DEVICES uses SerialNumber, most others use "id"
    let pk_col = detect_pk_column(table, &columns);

    let mut conn = pool.get().await.map_err(|e| format!("Pool error: {}", e))?;

    let sql = format!("SELECT TOP 1 * FROM [{table}] WHERE [{pk_col}] = @P1");

    let result = conn
        .query(sql.as_str(), &[&id])
        .await
        .map_err(|e| format!("SELECT by ID failed on {}: {}", table, e))?;

    let result_sets = result
        .into_results()
        .await
        .map_err(|e| format!("Row fetch failed: {}", e))?;

    let rows = result_sets_to_json(&result_sets, &columns);
    Ok(rows.into_iter().next())
}

/// Search rows by a text filter across common text columns.
pub async fn search_rows(
    pool: &MssqlPool,
    table: &str,
    search: &str,
    page: u64,
    per_page: u64,
) -> Result<Vec<Value>, String> {
    let table = validate_table(table)?;
    let columns = get_table_columns(pool, table).await?;
    if columns.is_empty() {
        return Ok(Vec::new());
    }

    let offset = (page.saturating_sub(1)) * per_page;
    let mut conn = pool.get().await.map_err(|e| format!("Pool error: {}", e))?;

    // Build WHERE clause: search across common text columns
    let search_cols: Vec<&String> = columns
        .iter()
        .filter(|c| {
            let lower = c.to_lowercase();
            lower.contains("label")
                || lower.contains("name")
                || lower.contains("description")
                || lower == "status"
                || lower.contains("address")
        })
        .collect();

    let where_clause = if search_cols.is_empty() {
        // Fallback: search first column
        format!("CAST([{}] AS NVARCHAR(MAX)) LIKE @P1", columns[0])
    } else {
        search_cols
            .iter()
            .map(|c| format!("CAST([{}] AS NVARCHAR(MAX)) LIKE @P1", c))
            .collect::<Vec<_>>()
            .join(" OR ")
    };

    let order_col = &columns[0];
    let sql = format!(
        "SELECT * FROM [{table}] WHERE {where_clause} \
         ORDER BY [{order_col}] OFFSET {offset} ROWS FETCH NEXT {per_page} ROWS ONLY"
    );

    let search_pattern = format!("%{}%", search);

    let result = conn
        .query(sql.as_str(), &[&search_pattern.as_str()])
        .await
        .map_err(|e| format!("SEARCH failed on {}: {}", table, e))?;

    let result_sets = result
        .into_results()
        .await
        .map_err(|e| format!("Row fetch failed: {}", e))?;

    Ok(result_sets_to_json(&result_sets, &columns))
}

// ============================================================================
// COUNT — Row count operations
// ============================================================================

/// Count total rows in a table.
pub async fn count_rows(pool: &MssqlPool, table: &str) -> Result<i64, String> {
    let table = validate_table(table)?;
    let mut conn = pool.get().await.map_err(|e| format!("Pool error: {}", e))?;

    let sql = format!("SELECT COUNT(*) FROM [{table}]");
    let result = conn
        .query(sql.as_str(), &[])
        .await
        .map_err(|e| format!("COUNT failed on {}: {}", table, e))?;

    let row = result
        .into_row()
        .await
        .map_err(|e| format!("COUNT row fetch failed: {}", e))?;

    match row {
        Some(r) => Ok(r.get::<i32, _>(0).unwrap_or(0) as i64),
        None => Ok(0),
    }
}

/// Count rows for a specific device.
pub async fn count_by_device(
    pool: &MssqlPool,
    table: &str,
    serial_number: i32,
) -> Result<i64, String> {
    let table = validate_table(table)?;
    let mut conn = pool.get().await.map_err(|e| format!("Pool error: {}", e))?;

    let sql = format!("SELECT COUNT(*) FROM [{table}] WHERE SerialNumber = @P1");
    let result = conn
        .query(sql.as_str(), &[&serial_number])
        .await
        .map_err(|e| format!("COUNT by device failed: {}", e))?;

    let row = result
        .into_row()
        .await
        .map_err(|e| format!("COUNT row fetch failed: {}", e))?;

    match row {
        Some(r) => Ok(r.get::<i32, _>(0).unwrap_or(0) as i64),
        None => Ok(0),
    }
}

// ============================================================================
// INSERT — Generic insert from JSON payload
// ============================================================================

/// Insert a single row from a JSON object.
/// Keys = column names, Values = column values.
/// Returns the number of affected rows.
pub async fn insert_row(
    pool: &MssqlPool,
    table: &str,
    payload: &Value,
) -> Result<u64, String> {
    let table = validate_table(table)?;
    let obj = payload
        .as_object()
        .ok_or("Payload must be a JSON object")?;

    if obj.is_empty() {
        return Err("Empty payload".to_string());
    }

    // Validate all column names
    for key in obj.keys() {
        validate_column_name(key)?;
    }

    let columns: Vec<String> = obj.keys().cloned().collect();
    let placeholders: Vec<String> = (1..=columns.len()).map(|i| format!("@P{}", i)).collect();

    let col_list = columns.iter().map(|c| format!("[{}]", c)).collect::<Vec<_>>().join(", ");
    let ph_list = placeholders.join(", ");

    let sql = format!("INSERT INTO [{table}] ({col_list}) VALUES ({ph_list})");

    let mut conn = pool.get().await.map_err(|e| format!("Pool error: {}", e))?;

    // Build parameter values as strings (tiberius handles conversion)
    let string_values: Vec<Option<String>> = obj
        .values()
        .map(|v| match v {
            Value::Null => None,
            Value::String(s) => Some(s.clone()),
            Value::Number(n) => Some(n.to_string()),
            Value::Bool(b) => Some(if *b { "1".to_string() } else { "0".to_string() }),
            _ => Some(v.to_string()),
        })
        .collect();

    // Use dynamic dispatch to build params slice
    // tiberius needs &[&dyn ToSql] — we pass Option<&str> for all columns
    let str_refs: Vec<Option<&str>> = string_values
        .iter()
        .map(|s| s.as_deref())
        .collect();

    // Execute based on param count (tiberius requires concrete types)
    execute_with_string_params(&mut conn, &sql, &str_refs).await
}

// ============================================================================
// UPDATE — Generic update from JSON payload
// ============================================================================

/// Update rows matching a primary key with JSON payload values.
/// Returns the number of affected rows.
pub async fn update_row(
    pool: &MssqlPool,
    table: &str,
    id: i32,
    payload: &Value,
) -> Result<u64, String> {
    let table = validate_table(table)?;
    let obj = payload
        .as_object()
        .ok_or("Payload must be a JSON object")?;

    if obj.is_empty() {
        return Err("Empty payload".to_string());
    }

    // Validate all column names
    for key in obj.keys() {
        validate_column_name(key)?;
    }

    let pk_col = detect_pk_column_simple(table);

    // Build SET clause: [col1] = @P1, [col2] = @P2, ...
    let columns: Vec<String> = obj.keys().cloned().collect();
    let set_clause = columns
        .iter()
        .enumerate()
        .map(|(i, c)| format!("[{}] = @P{}", c, i + 1))
        .collect::<Vec<_>>()
        .join(", ");

    // WHERE pk = @P(n+1)
    let pk_param_idx = columns.len() + 1;
    let sql = format!(
        "UPDATE [{table}] SET {set_clause} WHERE [{pk_col}] = @P{pk_param_idx}"
    );

    let mut conn = pool.get().await.map_err(|e| format!("Pool error: {}", e))?;

    let mut string_values: Vec<Option<String>> = obj
        .values()
        .map(|v| match v {
            Value::Null => None,
            Value::String(s) => Some(s.clone()),
            Value::Number(n) => Some(n.to_string()),
            Value::Bool(b) => Some(if *b { "1".to_string() } else { "0".to_string() }),
            _ => Some(v.to_string()),
        })
        .collect();

    // Add the PK value as the last parameter
    string_values.push(Some(id.to_string()));

    let str_refs: Vec<Option<&str>> = string_values
        .iter()
        .map(|s| s.as_deref())
        .collect();

    execute_with_string_params(&mut conn, &sql, &str_refs).await
}

// ============================================================================
// DELETE — Generic delete by primary key
// ============================================================================

/// Delete a single row by primary key. Returns number of affected rows.
pub async fn delete_row(
    pool: &MssqlPool,
    table: &str,
    id: i32,
) -> Result<u64, String> {
    let table = validate_table(table)?;
    let pk_col = detect_pk_column_simple(table);

    let mut conn = pool.get().await.map_err(|e| format!("Pool error: {}", e))?;

    let sql = format!("DELETE FROM [{table}] WHERE [{pk_col}] = @P1");

    let result = conn
        .execute(sql.as_str(), &[&id])
        .await
        .map_err(|e| format!("DELETE failed on {}: {}", table, e))?;

    Ok(result.total())
}

/// Delete all rows from a table. Returns number of affected rows.
pub async fn delete_all(pool: &MssqlPool, table: &str) -> Result<u64, String> {
    let table = validate_table(table)?;
    let mut conn = pool.get().await.map_err(|e| format!("Pool error: {}", e))?;

    let sql = format!("DELETE FROM [{table}]");

    let result = conn
        .execute(sql.as_str(), &[])
        .await
        .map_err(|e| format!("DELETE ALL failed on {}: {}", table, e))?;

    Ok(result.total())
}

/// Delete all rows for a specific device.
pub async fn delete_by_device(
    pool: &MssqlPool,
    table: &str,
    serial_number: i32,
) -> Result<u64, String> {
    let table = validate_table(table)?;
    let mut conn = pool.get().await.map_err(|e| format!("Pool error: {}", e))?;

    let sql = format!("DELETE FROM [{table}] WHERE SerialNumber = @P1");

    let result = conn
        .execute(sql.as_str(), &[&serial_number])
        .await
        .map_err(|e| format!("DELETE by device failed on {}: {}", table, e))?;

    Ok(result.total())
}

// ============================================================================
// Helpers
// ============================================================================

/// Detect the primary key column for a table.
fn detect_pk_column<'a>(table: &str, columns: &'a [String]) -> &'a str {
    match table {
        "DEVICES" => "SerialNumber",
        _ => {
            // Check if table has "id" column
            if columns.iter().any(|c| c.eq_ignore_ascii_case("id")) {
                "id"
            } else if columns.iter().any(|c| c.eq_ignore_ascii_case("SerialNumber")) {
                "SerialNumber"
            } else {
                // Fallback to first column
                &columns[0]
            }
        }
    }
}

/// Simplified PK detection when we don't have column list.
fn detect_pk_column_simple(table: &str) -> &str {
    match table {
        "DEVICES" => "SerialNumber",
        "SERVER_CLIENT_REGISTRY" => "id",
        "APPLICATION_CONFIG" => "id",
        "DATABASE_FILES" => "id",
        "DATABASE_PARTITION_CONFIG" => "id",
        "DATA_SYNC_METADATA" => "id",
        "TRENDLOG_DATA_SYNC_METADATA" => "id",
        "TRENDLOG_DATA" => "id",
        "TRENDLOG_DATA_DETAIL" => "id",
        "TRENDLOG_DATA_OLD" => "id",
        "TRENDLOG_VIEWS" => "id",
        _ => "id", // Most tables use auto-increment "id"
    }
}

/// Convert already-fetched tiberius result sets into Vec<serde_json::Value>.
fn result_sets_to_json(
    result_sets: &[Vec<tiberius::Row>],
    columns: &[String],
) -> Vec<Value> {
    let mut data = Vec::new();

    for result_set in result_sets {
        for row in result_set {
            let mut obj = serde_json::Map::new();
            for (i, col_name) in columns.iter().enumerate() {
                let val = extract_column_value(row, i);
                obj.insert(col_name.clone(), val);
            }
            data.push(Value::Object(obj));
        }
    }

    data
}

/// Extract a tiberius column value as serde_json::Value.
fn extract_column_value(row: &tiberius::Row, index: usize) -> Value {
    // Try integer types first
    if let Some(v) = row.get::<i32, _>(index) {
        return json!(v);
    }
    if let Some(v) = row.get::<i64, _>(index) {
        return json!(v);
    }
    if let Some(v) = row.get::<i16, _>(index) {
        return json!(v);
    }
    // Try float
    if let Some(v) = row.get::<f64, _>(index) {
        return json!(v);
    }
    if let Some(v) = row.get::<f32, _>(index) {
        return json!(v);
    }
    // Try string (NVARCHAR, VARCHAR)
    if let Some(v) = row.get::<&str, _>(index) {
        return json!(v);
    }
    // Try bool
    if let Some(v) = row.get::<bool, _>(index) {
        return json!(v);
    }
    // NULL or unsupported type
    Value::Null
}

/// Execute a parameterized query with a dynamic number of Option<&str> params.
///
/// tiberius requires `&[&dyn ToSql]`, so we build that from our string params.
async fn execute_with_string_params(
    conn: &mut bb8::PooledConnection<'_, bb8_tiberius::ConnectionManager>,
    sql: &str,
    params: &[Option<&str>],
) -> Result<u64, String> {
    // Build the &[&dyn ToSql] slice
    let boxed_params: Vec<&dyn tiberius::ToSql> = params
        .iter()
        .map(|p| p as &dyn tiberius::ToSql)
        .collect();

    let result = conn
        .execute(sql, boxed_params.as_slice())
        .await
        .map_err(|e| format!("Execute failed: {}", e))?;

    Ok(result.total())
}
