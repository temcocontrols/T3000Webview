//! Discovery & refresh tools — `t3000_scan_network`, `t3000_scan_all`,
//! `t3000_device_refresh`.
//!
//! These three are excluded from `dispatch_coverage` because they touch the
//! network / serial ports / FFI. The live scans are therefore `#[ignore]`d and
//! run explicitly:
//!
//!     cargo test --test mcp_test discovery                    # schema + safety
//!     cargo test --test mcp_test -- --ignored discovery       # real scans

use serde_json::json;

use crate::mcp::common;

fn find(name: &str) -> &'static t3_webview_api::mcp::ToolDef {
    common::all_tools()
        .iter()
        .find(|t| t.name == name)
        .unwrap_or_else(|| panic!("{} must be defined", name))
}

fn required_params(tool: &t3_webview_api::mcp::ToolDef) -> Vec<String> {
    tool.input_schema
        .get("required")
        .and_then(|v| v.as_array())
        .map(|a| a.iter().filter_map(|v| v.as_str().map(String::from)).collect())
        .unwrap_or_default()
}

fn has_property(tool: &t3_webview_api::mcp::ToolDef, name: &str) -> bool {
    tool.input_schema
        .get("properties")
        .and_then(|p| p.get(name))
        .is_some()
}

// ═══ Schemas ═══

#[test]
fn test_scan_network_schema() {
    let tool = find("t3000_scan_network");
    assert_eq!(tool.input_schema.get("type").and_then(|v| v.as_str()), Some("object"));
    assert!(required_params(tool).is_empty(), "scan_network takes only an optional timeout");
    assert!(has_property(tool, "timeout_seconds"));
}

#[test]
fn test_scan_all_schema() {
    let tool = find("t3000_scan_all");
    assert_eq!(tool.input_schema.get("type").and_then(|v| v.as_str()), Some("object"));
    assert!(required_params(tool).is_empty(), "scan_all takes only an optional timeout");
    assert!(has_property(tool, "timeout_seconds"));
}

#[test]
fn test_device_refresh_requires_serial_number() {
    let tool = find("t3000_device_refresh");
    let required = required_params(tool);
    assert!(required.contains(&"serial_number".to_string()), "device_refresh must require serial_number");
    assert!(has_property(tool, "point_type"), "device_refresh should allow a point_type filter");
}

// ═══ Safety: these must fail cleanly, never panic ═══

#[tokio::test]
async fn test_device_refresh_unknown_serial_errors() {
    let Some(db) = common::get_test_db().await else {
        println!("SKIP test_device_refresh_unknown_serial_errors — runtime DB not available");
        return;
    };

    let error = t3_webview_api::mcp::execute_tool(
        "t3000_device_refresh",
        &json!({ "serial_number": 987654321 }),
        &db,
    )
    .await
    .expect_err("refreshing an unknown serial must fail");

    assert!(
        error.contains("Cannot refresh") || error.to_lowercase().contains("not found"),
        "expected a clear 'cannot refresh' error, got: {}",
        error
    );
}

/// Outside T3000.exe the FFI entry point is absent, so a known device must come
/// back as a readable error instead of a crash.
#[tokio::test]
async fn test_device_refresh_reports_missing_ffi_cleanly() {
    let Some(db) = common::get_test_db().await else {
        println!("SKIP test_device_refresh_reports_missing_ffi_cleanly — runtime DB not available");
        return;
    };

    match t3_webview_api::mcp::execute_tool(
        "t3000_device_refresh",
        &json!({ "serial_number": 1028, "point_type": "INPUT" }),
        &db,
    )
    .await
    {
        Ok(payload) => println!("device_refresh ran (FFI available): {}", payload),
        Err(error) => {
            let lower = error.to_lowercase();
            assert!(
                lower.contains("ffi") || lower.contains("not found") || error.contains("Cannot refresh"),
                "unexpected device_refresh error: {}",
                error
            );
            println!("device_refresh reported cleanly: {}", error);
        }
    }
}

// ═══ Action 17 response counting ═══

/// Both response shapes the C++ has been seen to send must be counted, so
/// `points_updated` never reports 0 for a refresh that actually returned data.
#[test]
fn test_action17_point_count_handles_both_shapes() {
    let nested = r#"{"data":{"device_data":[{"pid":1},{"pid":2},{"pid":3}]}}"#;
    assert_eq!(t3_webview_api::mcp::count_action17_points(nested), 3);

    let per_panel = r#"{"data":[{"device_data":[{"pid":1},{"pid":2}]},{"device_data":[{"pid":3}]}]}"#;
    assert_eq!(t3_webview_api::mcp::count_action17_points(per_panel), 3);

    assert_eq!(t3_webview_api::mcp::count_action17_points(r#"{"data":{"device_data":[]}}"#), 0);
    assert_eq!(t3_webview_api::mcp::count_action17_points("{}"), 0);
    assert_eq!(t3_webview_api::mcp::count_action17_points("not json"), 0);
}

/// Action 17 reports the raw device value (`value × 1000`) and a 0-based index;
/// the MCP surface must speak the same language as every other point tool.
#[test]
fn test_action17_points_are_one_based_and_scaled() {
    let response = r#"{"data":{"device_data":[
        {"index":0,"id":"IN1","type":"INPUT","label":"TEMP","value":23900},
        {"index":5,"id":"IN6","type":"INPUT","label":"LUX","value":"12340"}
    ]}}"#;
    let points = t3_webview_api::mcp::action17_points(response);
    assert_eq!(points.len(), 2);
    assert_eq!(points[0]["index"], 1, "index must be echoed 1-based: {}", points[0]);
    assert_eq!(points[0]["value"], 23.9);
    assert_eq!(points[0]["raw_value"], "23900");
    assert_eq!(points[0]["label"], "TEMP");
    assert_eq!(points[1]["index"], 6);
    assert_eq!(points[1]["value"], 12.34, "string values from the C++ must scale too");
}

#[tokio::test]
async fn test_device_refresh_rejects_unknown_point_type() {
    // No DB lookup happens before this validation, so an in-memory DB is enough.
    let Some(db) = common::memory_db().await else { return };

    let error = t3_webview_api::mcp::execute_tool(
        "t3000_device_refresh",
        &json!({ "serial_number": 1028, "point_type": "INPUTS" }),
        &db,
    )
    .await
    .expect_err("a typo in point_type must not silently mean 'all three'");

    assert!(
        error.contains("Invalid point_type") && error.contains("INPUT, OUTPUT or VARIABLE"),
        "expected a helpful point_type error, got: {}",
        error
    );
}

// ═══ Live scans (explicit: --ignored) ═══

#[tokio::test]
#[ignore = "hits the real network; run with --ignored discovery"]
async fn live_scan_network_finds_adapters() {
    let Some(db) = common::memory_db().await else { return };

    let started = std::time::Instant::now();
    let result = common::execute_tool_json(
        "t3000_scan_network",
        &json!({ "timeout_seconds": 3 }),
        &db,
    )
    .await
    .expect("scan_network should succeed");
    let elapsed = started.elapsed();

    let devices = result.get("devices").and_then(|v| v.as_array()).expect("devices array");
    let total = common::get_i64(&result, "total").expect("total");
    assert_eq!(devices.len() as i64, total, "total must match the devices array");
    assert!(
        result.get("adapters_scanned").is_some(),
        "adapters_scanned must be reported: {}",
        result
    );
    // When nothing is found the tool must say why it may be empty, not return a
    // bare `total: 0` that reads like a broken scan.
    if total == 0 {
        let notes = result.get("notes").and_then(|v| v.as_array()).expect("notes array");
        assert!(!notes.is_empty(), "an empty scan must explain itself: {}", result);
    }
    // `timeout_seconds` is a cap on the UDP phase: a line that answers ends the
    // wait after a 500 ms quiet gap, a silent one after the ~1.2 s first-reply
    // window, and a large subnet can take the whole cap.
    assert!(
        elapsed >= std::time::Duration::from_millis(300) && elapsed <= std::time::Duration::from_secs(40),
        "a 3 s UDP scan must finish within its cap, took {:?}",
        elapsed
    );
    println!(
        "scan_network: {} device(s) in {:?}, adapters={:?}, warnings={:?}",
        total,
        elapsed,
        result.get("adapters_scanned"),
        result.get("warnings")
    );
}

#[tokio::test]
#[ignore = "hits UDP + serial COM + TCP; run with --ignored discovery"]
async fn live_scan_all_reports_every_transport() {
    let Some(db) = common::memory_db().await else { return };

    let started = std::time::Instant::now();
    let result = common::execute_tool_json(
        "t3000_scan_all",
        &json!({ "timeout_seconds": 3 }),
        &db,
    )
    .await
    .expect("scan_all should succeed");

    for key in ["devices", "total", "udp_count", "serial_count", "tcp_sub_count", "com_ports", "warnings", "notes"] {
        assert!(result.get(key).is_some(), "scan_all must report '{}': {}", key, result);
    }
    let total = common::get_i64(&result, "total").expect("total");
    assert_eq!(
        result.get("devices").and_then(|v| v.as_array()).map(|a| a.len()).unwrap_or(0) as i64,
        total
    );
    println!(
        "scan_all: {} device(s) in {:?} (udp={:?} serial={:?} tcp_sub={:?}) warnings={:?}",
        total,
        started.elapsed(),
        result.get("udp_count"),
        result.get("serial_count"),
        result.get("tcp_sub_count"),
        result.get("warnings")
    );
}
