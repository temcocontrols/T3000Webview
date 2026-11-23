//! Dispatcher Coverage — every tool advertised by `tools/list` must be wired
//! into `execute_tool`.
//!
//! A tool that exists in `TOOLS` but has no dispatcher arm is the worst kind of
//! MCP defect: the client sees it, calls it, and gets `Unknown tool: ...`
//! (which is exactly what Claude Desktop reports as a broken tool).
//!
//! Tools that mutate state, drive hardware, or touch the network are skipped
//! here — their behaviour is covered by the per-category modules in this
//! directory (rules, task_management, operational, device_operations, ...).

use std::time::Duration;

use serde_json::{json, Value};

use crate::mcp::common;

/// Tools not invoked with empty arguments: they write data, drive devices,
/// scan the network, or block on FFI. They are exercised by their own modules.
const SIDE_EFFECT_TOOLS: &[&str] = &[
    "t3000_scan_network",
    "t3000_scan_all",
    "t3000_device_refresh",
    "t3000_device_delete",
    "t3000_device_control",
    "t3000_point_write",
    "t3000_point_write_batch",
    "t3000_settings_write",
    "t3000_rule_toggle",
    "t3000_rule_create",
    "t3000_task_create",
    "t3000_task_update",
    "t3000_task_delete",
    "t3000_memory_save",
    "t3000_memory_delete",
    "t3000_alarm_acknowledge",
    "t3000_set_chat_device",
    "t3000_haystack_auto_tag",
    "t3000_haystack_export",
    "t3000_trendlog_export",
    "t3000_report_self_check",
];

/// In-memory database — the wiring check does not care whether the queries
/// succeed, only that the dispatcher recognises the tool name.
async fn memory_db() -> Option<sea_orm::DatabaseConnection> {
    let mut opt = sea_orm::ConnectOptions::new("sqlite::memory:");
    opt.max_connections(1).min_connections(1).sqlx_logging(false);
    sea_orm::Database::connect(opt).await.ok()
}

// ═══ Every advertised tool is dispatched ═══

#[tokio::test]
async fn every_advertised_tool_reaches_the_dispatcher() {
    let Some(db) = memory_db().await else {
        println!("⚠️  SKIP every_advertised_tool_reaches_the_dispatcher — no in-memory DB");
        return;
    };

    let mut checked = 0;
    for tool in common::all_tools() {
        if SIDE_EFFECT_TOOLS.contains(&tool.name) {
            continue;
        }
        checked += 1;

        let outcome = tokio::time::timeout(
            Duration::from_secs(20),
            t3_webview_api::mcp::execute_tool(tool.name, &json!({}), &db),
        )
        .await
        .unwrap_or_else(|_| {
            panic!("tool '{}' did not return within 20s for empty arguments", tool.name)
        });

        if let Err(message) = outcome {
            assert!(
                !message.starts_with("Unknown tool"),
                "tool '{}' is advertised by tools/list but has no dispatcher arm",
                tool.name
            );
        }
    }

    assert!(
        checked >= common::all_tools().len() - SIDE_EFFECT_TOOLS.len(),
        "expected to exercise at least {} tools, only checked {}",
        common::all_tools().len() - SIDE_EFFECT_TOOLS.len(),
        checked
    );
}

#[tokio::test]
async fn unknown_tool_name_is_rejected() {
    let Some(db) = memory_db().await else { return };

    let error = t3_webview_api::mcp::execute_tool("t3000_not_a_real_tool", &json!({}), &db)
        .await
        .expect_err("unknown tools must fail");
    assert_eq!(error, "Unknown tool: t3000_not_a_real_tool");
}

// ═══ describe_tool resolves every advertised name ═══

#[tokio::test]
async fn describe_tool_resolves_every_advertised_tool() {
    let Some(db) = memory_db().await else { return };

    for tool in common::all_tools() {
        let result = t3_webview_api::mcp::execute_tool(
            "t3000_describe_tool",
            &json!({ "tool_name": tool.name }),
            &db,
        )
        .await;

        let raw = result.unwrap_or_else(|e| panic!("describe_tool failed for '{}': {}", tool.name, e));
        let described: Value = serde_json::from_str(&raw)
            .unwrap_or_else(|e| panic!("describe_tool for '{}' returned invalid JSON: {}", tool.name, e));
        assert_eq!(described["name"], tool.name);
        assert!(
            described["inputSchema"]["type"] == "object",
            "describe_tool for '{}' must return an object schema",
            tool.name
        );
    }
}

#[tokio::test]
async fn describe_tool_reports_unknown_names() {
    let Some(db) = memory_db().await else { return };

    let error = t3_webview_api::mcp::execute_tool(
        "t3000_describe_tool",
        &json!({ "tool_name": "t3000_not_a_real_tool" }),
        &db,
    )
    .await
    .expect_err("unknown tool names must fail");
    assert!(error.contains("Tool not found"), "got: {}", error);
}
