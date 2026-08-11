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

/// Get all 58 MCP tool definitions from the library.
pub fn all_tools() -> &'static [t3_webview_api::haystack::mcp::ToolDef] {
    &t3_webview_api::haystack::mcp::TOOLS
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
pub async fn get_test_db() -> Option<sea_orm::DatabaseConnection> {
    let path = runtime_db_path().as_ref()?;
    let url = format!("sqlite://{}", path);
    let mut opt = sea_orm::ConnectOptions::new(&url);
    opt.max_connections(2)
        .min_connections(1)
        .connect_timeout(std::time::Duration::from_secs(5))
        .acquire_timeout(std::time::Duration::from_secs(5))
        .sqlx_logging(false);
    sea_orm::Database::connect(opt).await.ok()
}

/// Check whether DB-dependent tests should run.
pub fn db_tests_enabled() -> bool {
    runtime_db_path().is_some()
}

// ═══ Tool execution helper ═══

/// Execute a tool by name and return the raw JSON result string.
pub async fn execute_tool(
    name: &str,
    args: &Value,
    db: &sea_orm::DatabaseConnection,
) -> Result<String, String> {
    t3_webview_api::haystack::mcp::execute_tool(name, args, db).await
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
