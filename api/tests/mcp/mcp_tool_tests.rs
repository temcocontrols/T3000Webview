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

fn nav_all(db: &sea_orm::DatabaseConnection) -> impl std::future::Future<Output = serde_json::Value> + '_ {
    async move {
        common::execute_tool_json("t3000_nav_list", &json!({}), db)
            .await
            .expect("nav_list should succeed")
    }
}

#[tokio::test]
async fn test_nav_list_returns_all_pages() {
    common::with_db_or_skip("nav_list_returns_all_pages", |db| async move {
        let all = nav_all(&db).await;
        let pages = all["pages"].as_array().cloned().unwrap_or_default();

        assert!(!pages.is_empty(), "nav_list must return pages");
        assert_eq!(common::get_i64(&all, "total").unwrap_or(-1) as usize, pages.len(),
            "total must match the pages array");
        for page in &pages {
            assert!(common::get_str(page, "title").map(|t| !t.is_empty()).unwrap_or(false),
                "every page needs a title: {}", page);
            assert!(common::get_str(page, "path").map(|p| p.starts_with('/')).unwrap_or(false),
                "every page needs a route path: {}", page);
            assert!(common::get_str(page, "section").map(|s| !s.is_empty()).unwrap_or(false),
                "every page needs a section: {}", page);
        }
        // A well-known page must be in the index.
        assert!(pages.iter().any(|p| common::get_str(p, "title") == Some("Alarms")),
            "the Alarms page must be listed");
    })
    .await;
}

#[tokio::test]
async fn test_nav_list_filter_by_section() {
    common::with_db_or_skip("nav_list_filter_by_section", |db| async move {
        let all = nav_all(&db).await;
        let total_all = all["pages"].as_array().map(|a| a.len()).unwrap_or(0);

        let filtered = common::execute_tool_json(
            "t3000_nav_list",
            &json!({"section": "points"}),
            &db,
        )
        .await
        .expect("nav_list with a section should succeed");

        let pages = filtered["pages"].as_array().cloned().unwrap_or_default();
        assert!(!pages.is_empty(), "the 'points' section must not be empty");
        assert!(pages.len() < total_all,
            "filtering must return fewer pages than the full index ({} < {})", pages.len(), total_all);
        assert_eq!(common::get_i64(&filtered, "total").unwrap_or(-1) as usize, pages.len());
        for page in &pages {
            assert_eq!(common::get_str(page, "section"), Some("points"),
                "a filtered page leaked from another section: {}", page);
        }

        let none = common::execute_tool_json(
            "t3000_nav_list",
            &json!({"section": "no-such-section"}),
            &db,
        )
        .await
        .expect("an unknown section should return an empty list, not an error");
        assert_eq!(common::get_i64(&none, "total"), Some(0), "got: {}", none);
    })
    .await;
}

#[tokio::test]
async fn test_nav_search_finds_alarm() {
    common::with_db_or_skip("nav_search_finds_alarm", |db| async move {
        let result = common::execute_tool_json("t3000_nav_search", &json!({"query": "alarm"}), &db)
            .await
            .expect("nav_search should succeed");

        let results = result["results"].as_array().cloned().unwrap_or_default();
        assert!(!results.is_empty(), "searching 'alarm' must find the Alarms page: {}", result);
        assert_eq!(common::get_i64(&result, "total").unwrap_or(-1) as usize, results.len());

        let titles: Vec<&str> = results.iter().filter_map(|r| common::get_str(r, "title")).collect();
        assert!(titles.iter().any(|t| t.to_lowercase().contains("alarm")),
            "the Alarms page should rank in the results: {:?}", titles);
        // Relevance must be descending.
        let scores: Vec<i64> = results.iter().filter_map(|r| common::get_i64(r, "relevance")).collect();
        assert!(scores.windows(2).all(|w| w[0] >= w[1]),
            "results must be sorted by relevance: {:?}", scores);
    })
    .await;
}

#[tokio::test]
async fn test_nav_search_no_results() {
    common::with_db_or_skip("nav_search_no_results", |db| async move {
        let result = common::execute_tool_json(
            "t3000_nav_search",
            &json!({"query": "xyzzy_nonexistent"}),
            &db,
        )
        .await
        .expect("an unmatched search is an empty result, not an error");
        assert_eq!(common::get_i64(&result, "total"), Some(0), "got: {}", result);
        assert_eq!(common::array_len(&result, "results"), 0);

        let err = common::execute_tool_json("t3000_nav_search", &json!({}), &db)
            .await
            .expect_err("query is required");
        assert!(err.to_lowercase().contains("query"), "got: {}", err);
    })
    .await;
}

#[tokio::test]
async fn test_nav_redirect_returns_url() {
    common::with_db_or_skip("nav_redirect_returns_url", |db| async move {
        let result = common::execute_tool_json("t3000_nav_redirect", &json!({"page": "alarms"}), &db)
            .await
            .expect("nav_redirect should succeed");

        assert_eq!(common::get_str(&result, "page"), Some("Alarms"));
        assert_eq!(common::get_str(&result, "url"), Some("#/t3000/alarms"));
        assert_eq!(common::get_str(&result, "shortcut"), Some("Alt+A"));
        assert_eq!(result.get("requires_device").and_then(|v| v.as_bool()), Some(true));
    })
    .await;
}

#[tokio::test]
async fn test_nav_redirect_with_device() {
    common::with_db_or_skip("nav_redirect_with_device", |db| async move {
        let result = common::execute_tool_json(
            "t3000_nav_redirect",
            &json!({"page": "alarms", "serial_number": 240488}),
            &db,
        )
        .await
        .expect("nav_redirect with a device should succeed");

        assert_eq!(common::get_str(&result, "url"), Some("#/t3000/alarms?serial=240488"),
            "the device must be carried in the url: {}", result);
    })
    .await;
}

#[tokio::test]
async fn test_nav_redirect_unknown_page() {
    common::with_db_or_skip("nav_redirect_unknown_page", |db| async move {
        let err = common::execute_tool_json(
            "t3000_nav_redirect",
            &json!({"page": "nonexistent_page_xyz"}),
            &db,
        )
        .await
        .expect_err("an unknown page must be an error");
        assert!(err.contains("Page not found"), "got: {}", err);
    })
    .await;
}

#[tokio::test]
async fn test_page_info_returns_details() {
    common::with_db_or_skip("page_info_returns_details", |db| async move {
        let result = common::execute_tool_json("t3000_page_info", &json!({"page": "inputs"}), &db)
            .await
            .expect("page_info should succeed");

        assert_eq!(common::get_str(&result, "title"), Some("Inputs"));
        assert_eq!(common::get_str(&result, "path"), Some("/t3000/inputs"));
        assert!(common::get_str(&result, "section").map(|s| !s.is_empty()).unwrap_or(false));
        assert!(common::get_str(&result, "description").map(|d| d.len() > 20).unwrap_or(false),
            "page_info must describe the page: {}", result);
        assert!(common::array_len(&result, "features") > 0, "features must be listed: {}", result);
        assert!(common::array_len(&result, "related_tools") > 0,
            "related tools must be listed: {}", result);
    })
    .await;
}

#[tokio::test]
async fn test_page_info_unknown_page() {
    common::with_db_or_skip("page_info_unknown_page", |db| async move {
        let err = common::execute_tool_json(
            "t3000_page_info",
            &json!({"page": "nonexistent_page_xyz"}),
            &db,
        )
        .await
        .expect_err("an unknown page must be an error");
        assert!(err.contains("Page not found"), "got: {}", err);
    })
    .await;
}

// ═══ Task Management Tools ═══

#[tokio::test]
async fn test_task_create_requires_title() {
    common::with_db_or_skip("task_create_requires_title", |db| async move {
        let err = common::execute_tool_json(
            "t3000_task_create",
            &json!({"description": "no title here"}),
            &db,
        )
        .await
        .expect_err("a task without a title must be rejected");
        assert!(err.to_lowercase().contains("title"), "got: {}", err);

        let err = common::execute_tool_json("t3000_task_create", &json!({"title": "   "}), &db)
            .await
            .expect_err("a blank title must be rejected");
        assert!(err.to_lowercase().contains("title"), "got: {}", err);
    })
    .await;
}

#[tokio::test]
async fn test_task_create_rejects_invalid_priority() {
    common::with_db_or_skip("task_create_invalid_priority", |db| async move {
        // The schema advertises low|normal|high|critical; anything else used to be
        // stored verbatim and echoed back to the caller.
        let err = common::execute_tool_json(
            "t3000_task_create",
            &json!({"title": "mcp-suite-invalid-priority", "priority": "nonsense"}),
            &db,
        )
        .await
        .expect_err("an invalid priority must be rejected");
        assert!(err.to_lowercase().contains("priority"), "got: {}", err);
        assert!(err.contains("normal"), "the error should list the valid values: {}", err);

        let list = common::execute_tool_json("t3000_task_list", &json!({}), &db)
            .await
            .expect("task_list should succeed");
        let leaked = list["tasks"].as_array().map(|a| {
            a.iter().any(|t| common::get_str(t, "title") == Some("mcp-suite-invalid-priority"))
        }).unwrap_or(false);
        assert!(!leaked, "a rejected task must not be stored: {}", list);
    })
    .await;
}

#[tokio::test]
async fn test_task_crud_flow() {
    common::with_db_or_skip("task_crud_flow", |db| async move {
        let created = common::execute_tool_json(
            "t3000_task_create",
            &json!({
                "title": "mcp-suite-crud-task",
                "description": "created by the MCP test suite",
                "serial_number": 240488,
                "priority": "high"
            }),
            &db,
        )
        .await
        .expect("task_create should succeed");

        let task_id = common::get_str(&created, "task_id")
            .expect("task_create must return a task_id")
            .to_string();
        assert_eq!(common::get_str(&created, "status"), Some("pending"));
        assert_eq!(common::get_str(&created, "priority"), Some("high"),
            "the response must echo the priority it stored: {}", created);
        assert_eq!(common::get_i64(&created, "serial_number"), Some(240488),
            "the response must echo the device reference: {}", created);

        let list = common::execute_tool_json(
            "t3000_task_list",
            &json!({"serial_number": 240488}),
            &db,
        )
        .await
        .expect("task_list should succeed");
        let task = list["tasks"]
            .as_array()
            .and_then(|a| a.iter().find(|t| common::get_str(t, "id") == Some(task_id.as_str())))
            .unwrap_or_else(|| panic!("the created task must be listed: {}", list))
            .clone();
        assert_eq!(common::get_str(&task, "priority"), Some("high"));
        assert_eq!(common::get_str(&task, "description"), Some("created by the MCP test suite"));

        let updated = common::execute_tool_json(
            "t3000_task_update",
            &json!({"task_id": task_id, "status": "completed"}),
            &db,
        )
        .await
        .expect("task_update should succeed");
        assert_eq!(common::get_str(&updated["task"], "status"), Some("completed"),
            "task_update must return the updated task: {}", updated);

        let err = common::execute_tool_json(
            "t3000_task_update",
            &json!({"task_id": task_id, "status": "done"}),
            &db,
        )
        .await
        .expect_err("an unknown status must be rejected");
        assert!(err.to_lowercase().contains("status"), "got: {}", err);

        let err = common::execute_tool_json(
            "t3000_task_update",
            &json!({"task_id": task_id, "priority": "urgent"}),
            &db,
        )
        .await
        .expect_err("an unknown priority must be rejected");
        assert!(err.to_lowercase().contains("priority"), "got: {}", err);

        common::execute_tool_json("t3000_task_delete", &json!({"task_id": task_id}), &db)
            .await
            .expect("task_delete should succeed");

        let list = common::execute_tool_json("t3000_task_list", &json!({}), &db)
            .await
            .expect("task_list should succeed");
        let still_there = list["tasks"].as_array().map(|a| {
            a.iter().any(|t| common::get_str(t, "id") == Some(task_id.as_str()))
        }).unwrap_or(false);
        assert!(!still_there, "the deleted task must be gone: {}", list);
    })
    .await;
}

#[tokio::test]
async fn test_task_update_not_found() {
    common::with_db_or_skip("task_update_not_found", |db| async move {
        let err = common::execute_tool_json(
            "t3000_task_update",
            &json!({"task_id": "00000000-0000-0000-0000-000000000000", "status": "completed"}),
            &db,
        )
        .await
        .expect_err("updating a task that does not exist must fail");
        assert!(err.to_lowercase().contains("not found"), "got: {}", err);
    })
    .await;
}

#[tokio::test]
async fn test_task_delete_not_found() {
    common::with_db_or_skip("task_delete_not_found", |db| async move {
        let err = common::execute_tool_json(
            "t3000_task_delete",
            &json!({"task_id": "00000000-0000-0000-0000-000000000000"}),
            &db,
        )
        .await
        .expect_err("deleting a task that does not exist must fail");
        assert!(err.to_lowercase().contains("not found"), "got: {}", err);
    })
    .await;
}

// ═══ Memory Tools (file-backed: every test uses its own keys and cleans up) ═══

#[tokio::test]
async fn test_memory_save_requires_key_and_content() {
    common::with_db_or_skip("memory_save_requires_key_and_content", |db| async move {
        let err = common::execute_tool_json(
            "t3000_memory_save",
            &json!({"content": "no key"}),
            &db,
        )
        .await
        .expect_err("saving without a key must fail");
        assert!(err.to_lowercase().contains("key"), "got: {}", err);

        let err = common::execute_tool_json(
            "t3000_memory_save",
            &json!({"key": "mcp-suite-no-content"}),
            &db,
        )
        .await
        .expect_err("saving without content must fail");
        assert!(err.to_lowercase().contains("content"), "got: {}", err);
    })
    .await;
}

#[tokio::test]
async fn test_memory_save_upserts() {
    common::with_db_or_skip("memory_save_upserts", |db| async move {
        let key = "mcp-suite-upsert";
        let _ = common::execute_tool("t3000_memory_delete", &json!({"key": key}), &db).await;

        common::execute_tool_json(
            "t3000_memory_save",
            &json!({"key": key, "content": "first version", "category": "mcp-suite"}),
            &db,
        )
        .await
        .expect("first save should succeed");

        common::execute_tool_json(
            "t3000_memory_save",
            &json!({"key": key, "content": "second version", "category": "mcp-suite"}),
            &db,
        )
        .await
        .expect("second save should succeed");

        let list = common::execute_tool_json(
            "t3000_memory_list",
            &json!({"search": key}),
            &db,
        )
        .await
        .expect("memory_list should succeed");

        let entries: Vec<serde_json::Value> = list["memories"]
            .as_array()
            .map(|a| a.iter().filter(|m| common::get_str(m, "key") == Some(key)).cloned().collect())
            .unwrap_or_default();
        assert_eq!(entries.len(), 1, "the key must exist exactly once: {}", list);
        assert_eq!(common::get_str(&entries[0], "content"), Some("second version"),
            "the second save must overwrite the first");

        let _ = common::execute_tool("t3000_memory_delete", &json!({"key": key}), &db).await;
    })
    .await;
}

#[tokio::test]
async fn test_memory_list_by_category() {
    common::with_db_or_skip("memory_list_by_category", |db| async move {
        let category = "mcp-suite-cat";
        let key_a = "mcp-suite-cat-a";
        let key_b = "mcp-suite-cat-b";
        for key in [key_a, key_b] {
            let _ = common::execute_tool("t3000_memory_delete", &json!({"key": key}), &db).await;
        }

        common::execute_tool_json(
            "t3000_memory_save",
            &json!({"key": key_a, "content": "belongs to the category", "category": category}),
            &db,
        )
        .await
        .expect("save should succeed");
        common::execute_tool_json(
            "t3000_memory_save",
            &json!({"key": key_b, "content": "other category", "category": "mcp-suite-other"}),
            &db,
        )
        .await
        .expect("save should succeed");

        let list = common::execute_tool_json(
            "t3000_memory_list",
            &json!({"category": category}),
            &db,
        )
        .await
        .expect("memory_list should succeed");

        let keys: Vec<&str> = list["memories"]
            .as_array()
            .map(|a| a.iter().filter_map(|m| common::get_str(m, "key")).collect())
            .unwrap_or_default();
        assert!(keys.contains(&key_a), "the matching entry must be listed: {:?}", keys);
        assert!(!keys.contains(&key_b), "an entry from another category must not be listed: {:?}", keys);
        for entry in list["memories"].as_array().cloned().unwrap_or_default() {
            assert_eq!(common::get_str(&entry, "category"), Some(category));
        }

        for key in [key_a, key_b] {
            let _ = common::execute_tool("t3000_memory_delete", &json!({"key": key}), &db).await;
        }
    })
    .await;
}

#[tokio::test]
async fn test_memory_delete_not_found() {
    common::with_db_or_skip("memory_delete_not_found", |db| async move {
        let err = common::execute_tool_json(
            "t3000_memory_delete",
            &json!({"key": "mcp-suite-never-saved"}),
            &db,
        )
        .await
        .expect_err("deleting a memory that does not exist must fail");
        assert!(err.to_lowercase().contains("not found"), "got: {}", err);

        let err = common::execute_tool_json("t3000_memory_delete", &json!({}), &db)
            .await
            .expect_err("key is required");
        assert!(err.to_lowercase().contains("key"), "got: {}", err);
    })
    .await;
}

#[tokio::test]
async fn test_memory_crud_flow() {
    common::with_db_or_skip("memory_crud_flow", |db| async move {
        let key = "mcp-suite-crud";
        let _ = common::execute_tool("t3000_memory_delete", &json!({"key": key}), &db).await;

        let saved = common::execute_tool_json(
            "t3000_memory_save",
            &json!({"key": key, "content": "remember this", "category": "mcp-suite"}),
            &db,
        )
        .await
        .expect("save should succeed");
        assert_eq!(saved.get("saved").and_then(|v| v.as_bool()), Some(true), "{}", saved);
        assert_eq!(common::get_str(&saved, "key"), Some(key));
        assert_eq!(common::get_str(&saved, "category"), Some("mcp-suite"));

        let list = common::execute_tool_json("t3000_memory_list", &json!({"search": key}), &db)
            .await
            .expect("memory_list should succeed");
        let entry = list["memories"]
            .as_array()
            .and_then(|a| a.iter().find(|m| common::get_str(m, "key") == Some(key)))
            .unwrap_or_else(|| panic!("the saved memory must be listed: {}", list));
        assert_eq!(common::get_str(entry, "content"), Some("remember this"));

        let deleted = common::execute_tool_json("t3000_memory_delete", &json!({"key": key}), &db)
            .await
            .expect("delete should succeed");
        assert_eq!(deleted.get("deleted").and_then(|v| v.as_bool()), Some(true), "{}", deleted);

        let list = common::execute_tool_json("t3000_memory_list", &json!({"search": key}), &db)
            .await
            .expect("memory_list should succeed");
        let still_there = list["memories"].as_array().map(|a| {
            a.iter().any(|m| common::get_str(m, "key") == Some(key))
        }).unwrap_or(false);
        assert!(!still_there, "the deleted memory must be gone: {}", list);
    })
    .await;
}

// ═══ Tool Count ═══

#[test]
fn test_total_tool_count_is_58() {
    assert_eq!(common::all_tools().len(), 74,
        "the tool catalogue grew to 74 — update this count (and the docs) with it");
}

#[test]
fn test_no_duplicate_tool_names() {
    let mut names: Vec<&str> = common::all_tools().iter().map(|t| t.name).collect();
    let total = names.len();
    names.sort_unstable();
    names.dedup();
    assert_eq!(names.len(), total, "every tool name must be unique");
}

#[test]
fn test_all_tools_have_description() {
    for tool in common::all_tools() {
        assert!(!tool.description.trim().is_empty(),
            "tool '{}' has no description — an MCP client cannot know what it does", tool.name);
    }
}

#[test]
fn test_all_tools_have_input_schema() {
    for tool in common::all_tools() {
        assert_eq!(tool.input_schema.get("type").and_then(|v| v.as_str()), Some("object"),
            "tool '{}' must declare an object input schema", tool.name);
        assert!(tool.input_schema.get("properties").is_some(),
            "tool '{}' input schema is missing 'properties'", tool.name);
    }
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
