//! Shared test helpers for MCP tool tests.
//!
//! Provides argument builders, JSON assertion macros, and DB-connection
//! utilities so individual test modules stay concise.
#![allow(dead_code)]

use serde_json::{json, Value};
use std::sync::OnceLock;

// ═══ Runtime DB path ═══

/// Path to the T3000 runtime database used for DB-dependent tests.
static RUNTIME_DB_PATH: OnceLock<Option<String>> = OnceLock::new();

fn runtime_db_path() -> &'static Option<String> {
    RUNTIME_DB_PATH.get_or_init(|| {
        if let Ok(path) = std::env::var("T3000_TEST_DB_PATH") {
            return Some(path);
        }
        let candidate = r"../../T3000_Building_Automation_System/T3000 Output/Debug/Database/webview_t3_device.db";
        if std::path::Path::new(candidate).exists() {
            return Some(candidate.to_string());
        }
        None
    })
}

// ═══ Tool list access ═══

/// Get every MCP tool definition (74 today).
pub fn all_tools() -> &'static [t3_webview_api::mcp::ToolDef] {
    &t3_webview_api::mcp::TOOLS
}

// ═══ Argument builders ═══
// (Used by DB-dependent tests; allow dead_code until those are fully enabled)

#[allow(dead_code)]
pub fn args(pairs: &[(&str, Value)]) -> Value {
    let mut map = serde_json::Map::new();
    for (k, v) in pairs {
        map.insert(k.to_string(), v.clone());
    }
    Value::Object(map)
}

/// Build args for a single device reference.
pub fn device_ref(serial: i64) -> Value {
    json!({ "serial_number": serial })
}

/// Build args for a single point reference.
pub fn point_ref(serial: i64, pt_type: &str, idx: i64) -> Value {
    json!({
        "serial_number": serial,
        "point_type": pt_type,
        "point_index": idx
    })
}

/// Build args with serial_numbers array (for haystack / batch tools).
pub fn serials(nums: &[i64]) -> Value {
    json!({ "serial_numbers": nums })
}

// ═══ JSON helpers ═══

/// Extract a string field from a JSON value, or None.
pub fn get_str<'a>(v: &'a Value, key: &str) -> Option<&'a str> {
    v.get(key).and_then(|v| v.as_str())
}

/// Extract an i64 field from a JSON value, or None.
pub fn get_i64(v: &Value, key: &str) -> Option<i64> {
    v.get(key).and_then(|v| v.as_i64())
}

/// Extract an array field and return its length.
pub fn array_len(v: &Value, key: &str) -> usize {
    v.get(key)
        .and_then(|v| v.as_array())
        .map(|a| a.len())
        .unwrap_or(0)
}

/// Check that a JSON result has `result.error` (error response).
pub fn is_error_result(v: &Value) -> bool {
    v.get("error").is_some()
}

/// Check that a JSON result is successful (no error).
pub fn is_ok_result(v: &Value) -> bool {
    v.get("error").is_none()
}

// ═══ DB helpers ═══

/// Returns Some(db) if the runtime DB is available for testing, or None.
pub async fn get_test_db() -> Option<sea_orm::DatabaseConnection> {    let path = runtime_db_path().as_ref()?;
    let url = format!("sqlite://{}", path);
    let mut opt = sea_orm::ConnectOptions::new(&url);
    opt.max_connections(2)
        .min_connections(1)
        .connect_timeout(std::time::Duration::from_secs(5))
        .acquire_timeout(std::time::Duration::from_secs(5))
        .sqlx_logging(false);
    let db = sea_orm::Database::connect(opt).await.ok()?;

    // T3000.exe holds the same file while it runs, so a write can collide with
    // its lock. Without a busy timeout SQLite fails immediately ("database is
    // locked") and the test flakes; with one it waits its turn.
    use sea_orm::ConnectionTrait;
    let _ = db
        .execute(sea_orm::Statement::from_string(
            sea_orm::DatabaseBackend::Sqlite,
            "PRAGMA busy_timeout = 15000",
        ))
        .await;

    Some(db)
}

/// Check whether DB-dependent tests should run.
pub fn db_tests_enabled() -> bool {
    runtime_db_path().is_some()
}

/// Fresh in-memory database — hermetic, never touches T3000's data files.
pub async fn memory_db() -> Option<sea_orm::DatabaseConnection> {
    let mut opt = sea_orm::ConnectOptions::new("sqlite::memory:");
    opt.max_connections(1).min_connections(1).sqlx_logging(false);
    sea_orm::Database::connect(opt).await.ok()
}

// ═══ Tool execution helper ═══

/// Execute a tool by name and return the raw JSON result string.
pub async fn execute_tool(
    name: &str,
    args: &Value,
    db: &sea_orm::DatabaseConnection,
) -> Result<String, String> {
    t3_webview_api::mcp::execute_tool(name, args, db).await
}

/// Execute a tool and parse the result as JSON.
pub async fn execute_tool_json(
    name: &str,
    args: &Value,
    db: &sea_orm::DatabaseConnection,
) -> Result<Value, String> {
    let raw = execute_tool(name, args, db).await?;
    serde_json::from_str(&raw)
        .map_err(|e| format!("JSON parse error: {} — raw: {}", e, &raw[..raw.len().min(200)]))
}

// ═══ Helper: run test only when DB is available ═══

/// First device in the runtime DB that actually has stored input points.
/// Returns `(serial, input_count)`.
pub async fn pick_device_with_inputs(db: &sea_orm::DatabaseConnection) -> Option<(i64, i64)> {
    let list = execute_tool_json("t3000_device_list", &serde_json::json!({}), db).await.ok()?;
    list.get("devices")?.as_array()?.iter().find_map(|device| {
        let inputs = device.get("input_count")?.as_i64()?;
        if inputs > 0 {
            Some((device.get("serial")?.as_i64()?, inputs))
        } else {
            None
        }
    })
}

/// Run an async test function only if the runtime DB is available.
pub async fn with_db_or_skip<F, Fut>(test_name: &str, f: F)
where
    F: FnOnce(sea_orm::DatabaseConnection) -> Fut,
    Fut: std::future::Future<Output = ()>,
{
    match get_test_db().await {
        Some(db) => f(db).await,
        None => println!("⚠️  SKIP {} — runtime DB not available", test_name),
    }
}
