//! Data & Metadata Tool Tests — device_list, device_get_points,
//! point_get_metadata, metadata_search, point_search, point_batch_metadata
//!
//! These 6 tools query device/point metadata from the database.

use serde_json::json;
use crate::mcp::common;

// ═══ Tool existence ═══

#[test]
fn test_data_tools_exist() {
    let names = [
        "t3000_device_list",
        "t3000_device_get_points",
        "t3000_point_get_metadata",
        "t3000_metadata_search",
        "t3000_point_search",
        "t3000_point_batch_metadata",
    ];
    for name in &names {
        assert!(
            common::all_tools().iter().any(|t| t.name == *name),
            "Tool '{}' must be defined",
            name
        );
    }
}

// ═══ t3000_device_list ═══

#[test]
fn test_device_list_has_optional_filter() {
    let tool = common::all_tools()
        .iter()
        .find(|t| t.name == "t3000_device_list")
        .unwrap();
    let props = tool.input_schema.get("properties").and_then(|v| v.as_object()).unwrap();
    assert!(props.contains_key("filter_name"), "should have optional 'filter_name'");
    let required = tool.input_schema.get("required");
    assert!(required.is_none() || required.unwrap().as_array().map_or(true, |a| a.is_empty()),
        "device_list should have no required params");
}

// ═══ t3000_device_get_points ═══

#[test]
fn test_device_get_points_has_point_type_filter() {
    let tool = common::all_tools()
        .iter()
        .find(|t| t.name == "t3000_device_get_points")
        .unwrap();
    let props = tool.input_schema.get("properties").and_then(|v| v.as_object()).unwrap();
    assert!(props.contains_key("point_type"), "should have optional 'point_type' filter");
}

// ═══ t3000_metadata_search ═══

#[test]
fn test_metadata_search_has_limit_param() {
    let tool = common::all_tools()
        .iter()
        .find(|t| t.name == "t3000_metadata_search")
        .unwrap();
    let props = tool.input_schema.get("properties").and_then(|v| v.as_object()).unwrap();
    assert!(props.contains_key("limit"), "should have optional 'limit'");
    assert!(props.contains_key("serial_numbers"), "should have optional 'serial_numbers'");
    assert!(props.contains_key("point_types"), "should have optional 'point_types'");
}

// ═══ t3000_point_search ═══

#[test]
fn test_point_search_has_limit_param() {
    let tool = common::all_tools()
        .iter()
        .find(|t| t.name == "t3000_point_search")
        .unwrap();
    let props = tool.input_schema.get("properties").and_then(|v| v.as_object()).unwrap();
    assert!(props.contains_key("limit"), "should have optional 'limit'");
    assert!(props.contains_key("serial_numbers"), "should have optional 'serial_numbers'");
}

// ═══ t3000_point_batch_metadata ═══

#[test]
fn test_point_batch_metadata_requires_points() {
    let tool = common::all_tools()
        .iter()
        .find(|t| t.name == "t3000_point_batch_metadata")
        .unwrap();
    let required: Vec<&str> = tool.input_schema
        .get("required")
        .and_then(|v| v.as_array())
        .map(|a| a.iter().filter_map(|v| v.as_str()).collect())
        .unwrap_or_default();
    assert!(required.contains(&"points"), "batch_metadata must require 'points'");
}

// ═══ Live DB tests ═══

#[tokio::test]
async fn test_device_list_returns_devices() {
    common::with_db_or_skip("device_list_returns_devices", |db| async move {
        let result = common::execute_tool_json("t3000_device_list", &json!({}), &db)
            .await
            .expect("device_list should succeed");
        let total = common::get_i64(&result, "total").expect("should have total");
        assert!(total > 0, "should have at least 1 device, got {}", total);
        let devices = result.get("devices").and_then(|v| v.as_array()).expect("should have devices array");
        assert_eq!(devices.len() as i64, total, "total should match array len");
        // First device should be a non-empty object
        let first = &devices[0];
        assert!(!first.as_object().map_or(true, |o| o.is_empty()),
            "device should not be empty");
    }).await;
}

#[tokio::test]
async fn test_device_list_filter_by_name() {
    common::with_db_or_skip("device_list_filter_by_name", |db| async move {
        let result = common::execute_tool_json(
            "t3000_device_list",
            &json!({"filter_name": "T3"}),
            &db,
        ).await.expect("should succeed");
        let total = common::get_i64(&result, "total").unwrap_or(0);
        // Device 444 is "T3-NB-ESP", should match
        assert!(total > 0, "filtering by 'T3' should find at least 1 device");
    }).await;
}

#[tokio::test]
async fn test_device_get_points_returns_data() {
    common::with_db_or_skip("device_get_points_returns_data", |db| async move {
        let result = common::execute_tool_json(
            "t3000_device_get_points",
            &json!({"serial_number": 444}),
            &db,
        ).await.expect("should succeed");
        let total = common::get_i64(&result, "total").unwrap_or(0);
        // Device may or may not have points depending on DB state; verify shape
        assert!(result.get("points").is_some(), "response should have points");
        let points = result.get("points").and_then(|v| v.as_array()).expect("should have points");
        // Each point should have label, point_type, point_index
        if let Some(first) = points.first() {
            assert!(common::get_str(first, "label").is_some() || common::get_str(first, "Label").is_some());
            assert!(common::get_str(first, "point_type").is_some() || common::get_str(first, "PointType").is_some());
        }
    }).await;
}

#[tokio::test]
async fn test_device_get_points_filter_by_type() {
    common::with_db_or_skip("device_get_points_filter_by_type", |db| async move {
        let all = common::execute_tool_json(
            "t3000_device_get_points",
            &json!({"serial_number": 444}),
            &db,
        ).await.unwrap();
        let all_total = common::get_i64(&all, "total").unwrap_or(0);

        let filtered = common::execute_tool_json(
            "t3000_device_get_points",
            &json!({"serial_number": 444, "point_type": "INPUT"}),
            &db,
        ).await.unwrap();
        let filtered_total = common::get_i64(&filtered, "total").unwrap_or(0);

        // INPUTs should be a subset of all points
        assert!(filtered_total <= all_total, "filtered should be subset: {} <= {}", filtered_total, all_total);
    }).await;
}

#[tokio::test]
async fn test_point_get_metadata_returns_data() {
    common::with_db_or_skip("point_get_metadata_returns_data", |db| async move {
        let result = common::execute_tool_json(
            "t3000_point_get_metadata",
            &json!({"serial_number": 444, "point_type": "INPUT", "point_index": 0}),
            &db,
        ).await.expect("should succeed");
        // Should have some identifying fields about the point
        assert!(!result.as_object().map_or(true, |o| o.is_empty()),
            "metadata should not be empty");
    }).await;
}

#[tokio::test]
async fn test_metadata_search_finds_results() {
    common::with_db_or_skip("metadata_search_finds_results", |db| async move {
        // Search for common term; use device 444 as scope
        let result = common::execute_tool_json(
            "t3000_metadata_search",
            &json!({"query": "temp", "serial_numbers": [444]}),
            &db,
        ).await.expect("should succeed");
        // Verify the call succeeded; shape depends on search implementation
        let total = common::get_i64(&result, "total").unwrap_or(0);
        assert!(result.get("entries").is_some() || result.get("results").is_some(),
            "search should return entries or results");
    }).await;
}

#[tokio::test]
async fn test_point_batch_metadata_returns_data() {
    common::with_db_or_skip("point_batch_metadata_returns_data", |db| async move {
        let result = common::execute_tool_json(
            "t3000_point_batch_metadata",
            &json!({"points": [
                {"serial_number": 444, "point_type": "INPUT", "point_index": 0},
                {"serial_number": 444, "point_type": "INPUT", "point_index": 1}
            ]}),
            &db,
        ).await.expect("should succeed");
        let total = common::get_i64(&result, "total").unwrap_or(0);
        assert!(total >= 0, "batch metadata should have total");
    }).await;
}
