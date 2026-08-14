//! Diagnostics Tool Tests — device_diagnostics, device_diagnostics_batch
//!
//! These 2 tools provide device health checking. Require a live database.

use serde_json::json;
use crate::mcp::common;

// ═══ Tool existence ═══

#[test]
fn test_diagnostics_tools_exist() {
    assert!(common::all_tools().iter().any(|t| t.name == "t3000_device_diagnostics"));
    assert!(common::all_tools().iter().any(|t| t.name == "t3000_device_diagnostics_batch"));
}

// ═══ t3000_device_diagnostics ═══

#[test]
fn test_device_diagnostics_requires_serial() {
    let tool = common::all_tools()
        .iter()
        .find(|t| t.name == "t3000_device_diagnostics")
        .unwrap();
    let required: Vec<&str> = tool.input_schema
        .get("required")
        .and_then(|v| v.as_array())
        .map(|a| a.iter().filter_map(|v| v.as_str()).collect())
        .unwrap_or_default();
    assert!(required.contains(&"serial_number"),
        "device_diagnostics must require 'serial_number'");
    assert_eq!(required.len(), 1, "only serial_number is required");
}

// ═══ t3000_device_diagnostics_batch ═══

#[test]
fn test_device_diagnostics_batch_no_required_params() {
    let tool = common::all_tools()
        .iter()
        .find(|t| t.name == "t3000_device_diagnostics_batch")
        .unwrap();
    let required = tool.input_schema.get("required");
    assert!(required.is_none() || required.unwrap().as_array().map_or(true, |a| a.is_empty()),
        "diagnostics_batch should have no required params — omit serial_numbers for all devices");
}

#[test]
fn test_device_diagnostics_batch_has_optional_serials() {
    let tool = common::all_tools()
        .iter()
        .find(|t| t.name == "t3000_device_diagnostics_batch")
        .unwrap();
    let props = tool.input_schema.get("properties").and_then(|v| v.as_object()).unwrap();
    assert!(props.contains_key("serial_numbers"),
        "should have optional 'serial_numbers' — omit to diagnose all devices");
}

// ═══ Live DB tests ═══

#[tokio::test]
async fn test_device_diagnostics_returns_health() {
    common::with_db_or_skip("device_diagnostics_returns_health", |db| async move {
        let result = common::execute_tool_json(
            "t3000_device_diagnostics",
            &json!({"serial_number": 444}),
            &db,
        ).await.expect("should succeed");
        // Should have connection status, firmware, point counts, etc.
        assert!(common::get_str(&result, "connection_status").is_some()
            || common::get_str(&result, "status").is_some()
            || common::get_str(&result, "firmware_version").is_some()
            || result.get("health").is_some(),
            "diagnostics should return health info");
    }).await;
}

#[tokio::test]
async fn test_device_diagnostics_batch_returns_summary() {
    common::with_db_or_skip("device_diagnostics_batch_returns_summary", |db| async move {
        let result = common::execute_tool_json(
            "t3000_device_diagnostics_batch",
            &json!({"serial_numbers": [444]}),
            &db,
        ).await.expect("should succeed");
        // Should return per-device health and overall summary
        assert!(result.get("devices").is_some() || result.get("results").is_some(),
            "batch diagnostics should return device results");
    }).await;
}

#[tokio::test]
async fn test_device_diagnostics_batch_all_devices() {
    common::with_db_or_skip("device_diagnostics_batch_all_devices", |db| async move {
        // Omitting serial_numbers should diagnose all devices
        let result = common::execute_tool_json(
            "t3000_device_diagnostics_batch",
            &json!({}),
            &db,
        ).await.expect("should succeed");
        assert!(!result.as_object().map_or(true, |o| o.is_empty()),
            "batch diagnostics for all devices should return data");
    }).await;
}
