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

    // An unused point stores -1; the scaled value must be a plain 0.0, not -0.0.
    let unused = t3_webview_api::mcp::action17_points(
        r#"{"data":{"device_data":[{"index":0,"label":"","value":-1}]}}"#,
    );
    let value = unused[0]["value"].as_f64().expect("value present");
    assert_eq!(value, 0.0);
    assert!(!value.is_sign_negative(), "an unused point must not report -0.0");
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

// ═══ Action 17 response → device table ═══

/// A refresh must land in the device table, and must never blank a stored field
/// the device did not report (outputs carry no `unit`).
#[tokio::test]
async fn test_persist_action17_points_updates_and_keeps_missing_fields() {
    use sea_orm::{ConnectionTrait, DatabaseBackend, Statement};

    let Some(db) = common::memory_db().await else { return };

    let create = "CREATE TABLE INPUTS (
        SerialNumber INTEGER, InputId TEXT, Input_Index TEXT, Panel TEXT,
        Full_Label TEXT, Auto_Manual TEXT, fValue TEXT, Units TEXT,
        Range_Field TEXT, Calibration TEXT, Sign TEXT, Filter_Field TEXT,
        Status TEXT, Digital_Analog TEXT, Label TEXT, Type_Field TEXT,
        Calibration_H TEXT, Calibration_L TEXT, Calibration_Sign TEXT, Control TEXT)";
    db.execute(Statement::from_string(DatabaseBackend::Sqlite, create)).await.unwrap();
    db.execute(Statement::from_string(DatabaseBackend::Sqlite,
        "INSERT INTO INPUTS (SerialNumber, InputId, Input_Index, Panel, Full_Label, Label, fValue, \
         Units, Range_Field, Digital_Analog, Sign, Control) \
         VALUES (1028, 'IN1', '0', '1', 'OLD LABEL', 'OLD', '23900', '3', '3', '1', '7', '1')"))
        .await.unwrap();

    // `unit` wins over `range` for the Units column, as the C++ reports both.
    let response = r#"{"data":{"device_data":[{
        "pid":1,"type":"INPUT","index":0,"id":"IN1",
        "description":"TEMPERATURE ","label":"TEMP  ","value":20800,
        "unit":27,"range":3,"auto_manual":1,"control":1,"digital_analog":1
    }]}}"#;

    let saved = t3_webview_api::mcp::persist_action17_points(&db, 1028, "INPUT", response)
        .await
        .expect("persist must succeed");
    assert_eq!(saved, 1, "one row must be updated");

    let row = db
        .query_one(Statement::from_string(
            DatabaseBackend::Sqlite,
            "SELECT Full_Label, Label, fValue, Units, Range_Field, Auto_Manual, \
             Digital_Analog, Sign, Panel FROM INPUTS WHERE SerialNumber = 1028 AND Input_Index = '0'",
        ))
        .await
        .unwrap()
        .expect("row must still exist");

    let full: String = row.try_get("", "Full_Label").unwrap();
    let label: String = row.try_get("", "Label").unwrap();
    let value: String = row.try_get("", "fValue").unwrap();
    let units: String = row.try_get("", "Units").unwrap();
    let range: String = row.try_get("", "Range_Field").unwrap();
    let auto_manual: String = row.try_get("", "Auto_Manual").unwrap();
    let sign: String = row.try_get("", "Sign").unwrap();

    assert_eq!(full, "TEMPERATURE", "description is stored trimmed");
    assert_eq!(label, "TEMP");
    assert_eq!(value, "20800", "the raw ×1000 value is stored, not the scaled one");
    assert_eq!(units, "27", "`unit` feeds Units");
    assert_eq!(range, "3");
    assert_eq!(auto_manual, "1");
    assert_eq!(sign, "7", "a field the device did not report keeps its stored value");
}

/// Action 17 must never be given a panel id the C++ will reject. Device 1028's
/// `DEVICES.Panel_Number` became `1025` after a T3000 restart (a real panel index
/// is 1..254), so the lookup must either resolve the live panel or refuse.
#[tokio::test]
async fn test_action17_target_never_returns_an_invalid_panel() {
    let Some(db) = common::get_test_db().await else {
        println!("SKIP test_action17_target_never_returns_an_invalid_panel — runtime DB not available");
        return;
    };

    for serial in [1028, 4211, 11111] {
        match t3_webview_api::t3_device::action17_refresh_helper::lookup_action17_target(&db, serial).await {
            Ok((panel, object_instance)) => {
                assert!(
                    (1..254).contains(&panel),
                    "serial {} got panel {} which the C++ would reject",
                    serial,
                    panel
                );
                assert!(object_instance > 0, "serial {} needs an object instance", serial);
            }
            Err((_status, message)) => {
                assert!(
                    message.contains("not a T3000 panel index")
                        || message.contains("not found")
                        || message.contains("missing"),
                    "serial {}: unexpected error wording: {}",
                    serial,
                    message
                );
            }
        }
    }
}

/// The refresh routes require `{ success, items }`, but the C++ answers
/// `{ data: { device_data: [...] } }` and never sets `success` — before this
/// normalisation every successful read came back as "Unknown error from device".
#[test]
fn test_action17_response_is_normalised_for_refresh_routes() {
    use t3_webview_api::t3_device::action17_refresh_helper::normalise_action17_response;

    let ok = normalise_action17_response(json!({
        "data": { "device_data": [ {"index": 0, "value": 1}, {"index": 1, "value": 2} ] }
    }));
    assert_eq!(ok["success"], true, "a response without `error` is a success: {}", ok);
    assert_eq!(ok["items"].as_array().map(|a| a.len()), Some(2), "device_data becomes items: {}", ok);

    let per_panel = normalise_action17_response(json!({
        "data": [ {"device_data": [{"index": 0}]}, {"device_data": [{"index": 1}, {"index": 2}]} ]
    }));
    assert_eq!(per_panel["success"], true);
    assert_eq!(per_panel["items"].as_array().map(|a| a.len()), Some(3), "{}", per_panel);

    let rejected = normalise_action17_response(json!({ "error": "Panel is invalid ." }));
    assert_eq!(rejected["success"], false, "{}", rejected);
    assert_eq!(rejected["message"], "Panel is invalid .");

    // An older/scalar response that already carries the legacy shape is untouched.
    let legacy = normalise_action17_response(json!({ "success": false, "message": "nope", "items": [] }));
    assert_eq!(legacy["success"], false);
    assert_eq!(legacy["message"], "nope");
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
