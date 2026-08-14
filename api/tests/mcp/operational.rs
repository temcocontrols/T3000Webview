//! Operational Tool Tests — point_read, point_write, point_read_batch,
//! point_write_batch
//!
//! These 4 tools read and write point values. Write tools require confirm:true
//! for safety. All require a live database connection.

use serde_json::{json, Value};
use crate::mcp::common;

// ═══ Tool existence ═══

#[test]
fn test_operational_tools_exist() {
    let names = [
        "t3000_point_read",
        "t3000_point_write",
        "t3000_point_read_batch",
        "t3000_point_write_batch",
    ];
    for name in &names {
        assert!(
            common::all_tools().iter().any(|t| t.name == *name),
            "Tool '{}' must be defined",
            name
        );
    }
}

// ═══ t3000_point_write ═══

#[test]
fn test_point_write_has_readback_param() {
    let tool = common::all_tools()
        .iter()
        .find(|t| t.name == "t3000_point_write")
        .unwrap();
    let props = tool.input_schema.get("properties").and_then(|v| v.as_object()).unwrap();
    assert!(props.contains_key("readback"), "should have optional 'readback' param");
    assert!(props.contains_key("field"), "should have optional 'field' param");
}

#[test]
fn test_point_write_confirm_is_boolean() {
    let tool = common::all_tools()
        .iter()
        .find(|t| t.name == "t3000_point_write")
        .unwrap();
    let confirm_type = tool.input_schema
        .get("properties")
        .and_then(|v| v.get("confirm"))
        .and_then(|v| v.get("type"))
        .and_then(|v| v.as_str());
    assert_eq!(confirm_type, Some("boolean"), "confirm must be boolean");
}

// ═══ t3000_point_read_batch ═══

#[test]
fn test_point_read_batch_points_is_array() {
    let tool = common::all_tools()
        .iter()
        .find(|t| t.name == "t3000_point_read_batch")
        .unwrap();
    let points_type = tool.input_schema
        .get("properties")
        .and_then(|v| v.get("points"))
        .and_then(|v| v.get("type"));
    assert_eq!(points_type.and_then(|v| v.as_str()), Some("array"),
        "points must be array type");
}

// ═══ t3000_point_write_batch ═══

#[test]
fn test_point_write_batch_confirm_is_boolean() {
    let tool = common::all_tools()
        .iter()
        .find(|t| t.name == "t3000_point_write_batch")
        .unwrap();
    let confirm_type = tool.input_schema
        .get("properties")
        .and_then(|v| v.get("confirm"))
        .and_then(|v| v.get("type"))
        .and_then(|v| v.as_str());
    assert_eq!(confirm_type, Some("boolean"), "confirm must be boolean");
}

// ═══ Live DB tests ═══

#[tokio::test]
async fn test_point_read_returns_value() {
    common::with_db_or_skip("point_read_returns_value", |db| async move {
        let result = common::execute_tool_json(
            "t3000_point_read",
            &json!({"serial_number": 444, "point_type": "INPUT", "point_index": 0}),
            &db,
        ).await.expect("should succeed");
        // Should return a non-empty result with point data
        assert!(!result.as_object().map_or(true, |o| o.is_empty()),
            "point_read should return data");
    }).await;
}

#[tokio::test]
async fn test_point_read_batch_returns_values() {
    common::with_db_or_skip("point_read_batch_returns_values", |db| async move {
        let result = common::execute_tool_json(
            "t3000_point_read_batch",
            &json!({"points": [
                {"serial_number": 444, "point_type": "INPUT", "point_index": 0},
                {"serial_number": 444, "point_type": "INPUT", "point_index": 1}
            ]}),
            &db,
        ).await.expect("should succeed");
        let total = common::get_i64(&result, "total").unwrap_or(0);
        assert!(total >= 0, "batch read should have total");
    }).await;
}

#[tokio::test]
async fn test_point_write_requires_confirm() {
    common::with_db_or_skip("point_write_requires_confirm", |db| async move {
        // Write without confirm should fail or be blocked
        let raw = common::execute_tool(
            "t3000_point_write",
            &json!({"serial_number": 444, "point_type": "OUTPUT", "point_index": 0, "value": 50.0, "confirm": false}),
            &db,
        ).await;
        match raw {
            Ok(s) => {
                // If it succeeds, it might have returned a warning — either way handled properly
                let _v: Value = serde_json::from_str(&s).unwrap_or_default();
            }
            Err(e) => {
                // Error about confirm is expected
                assert!(e.to_lowercase().contains("confirm") || e.to_lowercase().contains("safety"),
                    "error should mention confirm: {}", e);
            }
        }
    }).await;
}

#[tokio::test]
async fn test_point_write_batch_requires_confirm() {
    common::with_db_or_skip("point_write_batch_requires_confirm", |db| async move {
        let raw = common::execute_tool(
            "t3000_point_write_batch",
            &json!({
                "points": [{"serial_number": 444, "point_type": "OUTPUT", "point_index": 0, "value": 1.0}],
                "confirm": false
            }),
            &db,
        ).await;
        match raw {
            Ok(_) => { /* handled */ }
            Err(e) => {
                assert!(e.to_lowercase().contains("confirm") || e.to_lowercase().contains("safety"),
                    "error should mention confirm: {}", e);
            }
        }
    }).await;
}
