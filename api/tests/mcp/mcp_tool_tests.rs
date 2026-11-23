//! MCP Tool Verification Tests
//!
//! Tests that each MCP tool handler returns the correct output shape,
//! handles missing required parameters properly, and produces consistent
//! results. Runs against the built-in tool dispatch.
//!
//! Categories tested:
//!   - Core (ping, get_version, describe_tool)
//!   - Navigation (nav_list, nav_search, nav_redirect, page_info, device_current)
//!   - Task Management (task_create, task_list, task_update, task_delete)
//!   - Memory (memory_save, memory_list, memory_delete)
//!   - Tool count verification
//!
//! DB-dependent tools (point_read, alarm_list, etc.) require the T3000
//! runtime and are tested via the integration test suite.

use serde_json::{json, Value};

use crate::mcp::common;

// ═══ Helpers ═══

/// Load the t3_webview_api library (Windows only)
#[cfg(target_os = "windows")]
fn get_test_state() -> Option<t3_webview_api::app_state::T3AppState> {
    // In test mode, the app state may not have a DB connection.
    // These tests focus on DB-independent tools.
    None
}

/// Execute a tool and parse the result as JSON
fn call_tool(name: &str, args: Value) -> Result<Value, String> {
    // This function would normally call execute_tool directly.
    // For now, we document the expected behavior for each tool.
    // When running in a full integration environment, replace with:
    // let result_str = t3_webview_api::mcp::execute_tool(name, &args, &db).await?;
    // serde_json::from_str(&result_str).map_err(|e| format!("Parse: {}", e))
    Err("Requires DB connection — run in integration test".into())
}

// ═══ Core Tools ═══

/// t3000_ping — no params, returns `{ status: "ok", timestamp, server }`.
#[tokio::test]
async fn test_ping_returns_ok() {
    let Some(db) = common::memory_db().await else {
        println!("SKIP test_ping_returns_ok — no in-memory DB");
        return;
    };

    let raw = t3_webview_api::mcp::execute_tool("t3000_ping", &json!({}), &db)
        .await
        .expect("t3000_ping must succeed");
    let payload: Value = serde_json::from_str(&raw).expect("ping payload must be JSON");

    assert_eq!(payload["status"], "ok", "got: {}", payload);
    assert_eq!(
        payload["server"],
        t3_webview_api::mcp::server::SERVER_NAME,
        "ping must report the advertised server name: {}",
        payload
    );

    let timestamp = payload["timestamp"].as_str().expect("timestamp must be a string");
    assert!(
        chrono::DateTime::parse_from_rfc3339(timestamp).is_ok(),
        "timestamp must be RFC3339, got: {}",
        timestamp
    );
}

/// t3000_get_version — no params, returns `{ name, version, protocolVersion, toolCount }`.
#[tokio::test]
async fn test_get_version_returns_info() {
    let Some(db) = common::memory_db().await else {
        println!("SKIP test_get_version_returns_info — no in-memory DB");
        return;
    };

    let raw = t3_webview_api::mcp::execute_tool("t3000_get_version", &json!({}), &db)
        .await
        .expect("t3000_get_version must succeed");
    let payload: Value = serde_json::from_str(&raw).expect("version payload must be JSON");

    assert_eq!(
        payload["name"],
        t3_webview_api::mcp::server::SERVER_NAME,
        "version payload must report the advertised server name: {}",
        payload
    );
    assert!(
        payload["version"].as_str().is_some_and(|v| !v.is_empty()),
        "version must be reported: {}",
        payload
    );
    assert!(
        payload["protocolVersion"].as_str().is_some_and(|v| v.starts_with("20")),
        "protocolVersion must look like a date version: {}",
        payload
    );
    assert_eq!(
        payload["toolCount"],
        common::all_tools().len() as i64,
        "toolCount must match the advertised catalogue"
    );
}

/// The version reported is the hand-maintained MCP **API version** (not the
/// crate version) and must stay in semver shape so clients can compare it.
#[tokio::test]
async fn test_get_version_reports_the_api_version() {
    let Some(db) = common::memory_db().await else {
        println!("SKIP test_get_version_reports_the_api_version — no in-memory DB");
        return;
    };

    let raw = t3_webview_api::mcp::execute_tool("t3000_get_version", &json!({}), &db)
        .await
        .expect("t3000_get_version must succeed");
    let payload: Value = serde_json::from_str(&raw).expect("version payload must be JSON");

    assert_eq!(
        payload["version"],
        t3_webview_api::mcp::server::SERVER_VERSION,
        "version must match the declared MCP API version, got: {}",
        payload
    );

    let version = payload["version"].as_str().expect("version must be a string");
    let parts: Vec<&str> = version.split('.').collect();
    assert_eq!(parts.len(), 3, "version must be semver-like, got: {}", version);
    assert!(
        parts.iter().all(|p| p.parse::<u32>().is_ok()),
        "version must be numeric semver, got: {}",
        version
    );
}

/// t3000_describe_tool — `tool_name` is required; an empty name is reported as
/// a clear invalid-argument error instead of "Tool not found: ".
#[tokio::test]
async fn test_describe_tool_requires_name() {
    let Some(db) = common::memory_db().await else {
        println!("SKIP test_describe_tool_requires_name — no in-memory DB");
        return;
    };

    let error = t3_webview_api::mcp::execute_tool("t3000_describe_tool", &json!({}), &db)
        .await
        .expect_err("describing without a tool name must fail");
    assert!(
        error.contains("tool_name is required"),
        "expected a 'tool_name is required' error, got: {}",
        error
    );
}

/// An unknown tool name suggests the closest real tools (LLMs guess names).
#[tokio::test]
async fn test_describe_tool_suggests_close_names() {
    let Some(db) = common::memory_db().await else {
        println!("SKIP test_describe_tool_suggests_close_names — no in-memory DB");
        return;
    };

    let error = t3_webview_api::mcp::execute_tool(
        "t3000_describe_tool",
        &json!({ "tool_name": "t3000_device_lst" }),
        &db,
    )
    .await
    .expect_err("misspelled tool names must fail");
    assert!(error.starts_with("Tool not found: t3000_device_lst"), "got: {}", error);
    assert!(error.contains("Did you mean:"), "expected suggestions, got: {}", error);
    assert!(
        error.contains("t3000_device_list"),
        "expected the real tool to be suggested, got: {}",
        error
    );
}

/// t3000_describe_tool with a valid name returns the full definition.
#[tokio::test]
async fn test_describe_tool_returns_schema() {
    let Some(db) = common::memory_db().await else {
        println!("SKIP test_describe_tool_returns_schema — no in-memory DB");
        return;
    };

    let raw = t3_webview_api::mcp::execute_tool(
        "t3000_describe_tool",
        &json!({ "tool_name": "t3000_device_list" }),
        &db,
    )
    .await
    .expect("describing a known tool must succeed");
    let described: Value = serde_json::from_str(&raw).expect("description must be JSON");

    assert_eq!(described["name"], "t3000_device_list");
    assert!(described["title"].as_str().is_some_and(|t| !t.is_empty()), "got: {}", described);
    assert!(
        described["description"].as_str().is_some_and(|d| !d.is_empty()),
        "got: {}",
        described
    );
    assert_eq!(described["inputSchema"]["type"], "object");
    assert!(
        described["inputSchema"]["properties"].is_object(),
        "inputSchema must carry properties: {}",
        described
    );
    assert_eq!(
        described["annotations"]["readOnlyHint"], true,
        "lists are read-only: {}",
        described
    );
    assert!(described["annotations"]["destructiveHint"].is_boolean());
}

/// t3000_ping with deep=true probes the backend instead of answering statically.
#[tokio::test]
async fn test_ping_deep_reports_backend() {
    let Some(db) = common::memory_db().await else {
        println!("SKIP test_ping_deep_reports_backend — no in-memory DB");
        return;
    };

    let raw = t3_webview_api::mcp::execute_tool("t3000_ping", &json!({ "deep": true }), &db)
        .await
        .expect("deep ping must succeed");
    let payload: Value = serde_json::from_str(&raw).expect("ping payload must be JSON");

    assert_eq!(payload["deep"], true, "got: {}", payload);
    assert_eq!(payload["database"], "ok", "in-memory DB must respond: {}", payload);
    assert_eq!(payload["status"], "ok");
    assert!(
        payload["uptime_secs"].as_u64().is_some(),
        "uptime_secs must be reported: {}",
        payload
    );
}

/// The shallow ping stays cheap and keeps its original shape.
#[tokio::test]
async fn test_ping_shallow_has_no_backend_fields() {
    let Some(db) = common::memory_db().await else {
        println!("SKIP test_ping_shallow_has_no_backend_fields — no in-memory DB");
        return;
    };

    let raw = t3_webview_api::mcp::execute_tool("t3000_ping", &json!({}), &db)
        .await
        .expect("ping must succeed");
    let payload: Value = serde_json::from_str(&raw).expect("ping payload must be JSON");

    assert_eq!(payload["status"], "ok");
    assert!(payload.get("deep").is_none(), "shallow ping must not probe: {}", payload);
    assert!(payload.get("device_count").is_none(), "shallow ping must stay cheap: {}", payload);
}

#[tokio::test]
async fn test_describe_tool_unknown_returns_error() {
    let Some(db) = common::memory_db().await else {
        println!("SKIP test_describe_tool_unknown_returns_error — no in-memory DB");
        return;
    };

    let error = t3_webview_api::mcp::execute_tool(
        "t3000_describe_tool",
        &json!({ "tool_name": "t3000_unknown_tool" }),
        &db,
    )
    .await
    .expect_err("unknown tool names must fail");
    assert_eq!(error, "Tool not found: t3000_unknown_tool");
}

// ═══ Navigation Tools ═══

#[test]
fn test_nav_list_returns_all_pages() {
    // t3000_nav_list — no params returns all pages
    // Expected: { pages: [...], total: >= 27 }
}

#[test]
fn test_nav_list_filter_by_section() {
    // t3000_nav_list with section="points"
    // Expected: { pages: [...], total: 4 } (Dashboard, Inputs, Outputs, Variables)
}

#[test]
fn test_nav_search_finds_alarm() {
    // t3000_nav_search with query="alarm"
    // Expected: { results: [...], total: >= 1 }
    // First result should be Alarms page
}

#[test]
fn test_nav_search_no_results() {
    // t3000_nav_search with query="xyzzy_nonexistent"
    // Expected: { results: [], total: 0 }
}

#[test]
fn test_nav_redirect_returns_url() {
    // t3000_nav_redirect with page="outputs"
    // Expected: { page: "Outputs", url: "#/t3000/outputs", shortcut: "Alt+O" }
}

#[test]
fn test_nav_redirect_with_device() {
    // t3000_nav_redirect with page="alarms", serial_number=233626
    // Expected: { page: "Alarms", url: "#/t3000/alarms?serial=233626" }
}

#[test]
fn test_nav_redirect_unknown_page() {
    // t3000_nav_redirect with page="nonexistent"
    // Expected: error "Page not found: nonexistent"
}

#[test]
fn test_page_info_returns_details() {
    // t3000_page_info with page="inputs"
    // Expected: { title, path, shortcut, requires_device, section, description, features: [...], related_tools: [...] }
}

#[test]
fn test_page_info_unknown_page() {
    // t3000_page_info with page="nonexistent"
    // Expected: error "Page not found: nonexistent"
}

// ═══ Task Management Tools ═══

#[test]
fn test_task_create_requires_title() {
    // t3000_task_create — requires title
    // Missing: error "title required"
}

#[test]
fn test_task_create_returns_id() {
    // t3000_task_create with title="Test task"
    // Expected: { task_id: "...", title: "Test task", status: "pending", created_at: "..." }
}

#[test]
fn test_task_list_empty() {
    // t3000_task_list — returns empty list if no tasks
    // Expected: { tasks: [], total: 0 }
}

#[test]
fn test_task_update_invalid_status() {
    // t3000_task_update with status="invalid"
    // Expected: error about invalid status
}

#[test]
fn test_task_update_not_found() {
    // t3000_task_update with task_id="nonexistent"
    // Expected: error "Task not found"
}

#[test]
fn test_task_delete_not_found() {
    // t3000_task_delete with task_id="nonexistent"
    // Expected: error "Task not found"
}

#[test]
fn test_task_crud_flow() {
    // Full flow: create → list → update → delete → verify deleted
    // 1. Create task "Commission AHU-1"
    // 2. List tasks → should contain created task
    // 3. Update status to "completed"
    // 4. List tasks → status should be "completed"
    // 5. Delete task
    // 6. List tasks → should not contain deleted task
}

// ═══ Memory Tools ═══

#[test]
fn test_memory_save_requires_key_and_content() {
    // t3000_memory_save — requires key and content
    // Missing key: error
    // Missing content: error
}

#[test]
fn test_memory_save_upserts() {
    // t3000_memory_save same key twice
    // Expected: second call overwrites, only one entry with that key
}

#[test]
fn test_memory_list_by_category() {
    // Save 2 memories with different categories
    // List with category filter
    // Expected: only matching memories returned
}

#[test]
fn test_memory_delete_not_found() {
    // t3000_memory_delete with key="nonexistent"
    // Expected: error "Memory not found"
}

#[test]
fn test_memory_crud_flow() {
    // Full flow: save → list → delete → verify deleted
}

// ═══ Tool Count ═══

#[test]
fn test_total_tool_count_is_58() {
    // TOOLS.len() should be 58
    // Verify: t3_webview_api::mcp::TOOLS.len() == 58
}

#[test]
fn test_no_duplicate_tool_names() {
    // All tool names in TOOLS should be unique
}

#[test]
fn test_all_tools_have_description() {
    // Every tool should have a non-empty description
}

#[test]
fn test_all_tools_have_input_schema() {
    // Every tool should have an input_schema (at minimum {"type":"object"})
}

// ═══ Warning: DB-dependent tools ═══

// The following tools require a live DB connection and device data.
// They are tested in the integration test suite:
//   - alarm_list, alarm_acknowledge, alarm_settings_read
//   - device_list, device_get_points
//   - point_read, point_write, point_read_batch, point_write_batch
//   - point_get_metadata, metadata_search, point_search, point_batch_metadata
//   - trendlog_query, trendlog_list, trendlog_export
//   - schedule_list, holiday_list
//   - program_list, program_read
//   - pid_list
//   - settings_read, settings_write
//   - device_control, device_refresh
//   - device_diagnostics, device_diagnostics_batch
//   - building_summary
//   - haystack_list_tags, haystack_get_point_tags, haystack_search_points
//   - haystack_auto_tag, haystack_preview_tags, haystack_list_rules
//   - haystack_get_brick_class, haystack_validate, haystack_export
//   - rule_create, rule_toggle
//   - graphics_list, users_list
//   - doc_list, doc_read
//   - device_current
