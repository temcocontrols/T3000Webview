//! Analytics Tool Tests — haystack_validate, haystack_export
//!
//! These 2 tools validate semantic tagging and export semantic models.

use serde_json::{json, Value};
use crate::mcp::common;

// ═══ Tool existence ═══

#[test]
fn test_analytics_tools_exist() {
    assert!(common::all_tools().iter().any(|t| t.name == "t3000_haystack_validate"));
    assert!(common::all_tools().iter().any(|t| t.name == "t3000_haystack_export"));
}

// ═══ t3000_haystack_validate ═══

#[test]
fn test_haystack_validate_no_required_params() {
    let tool = common::all_tools()
        .iter()
        .find(|t| t.name == "t3000_haystack_validate")
        .unwrap();
    let required = tool.input_schema.get("required");
    assert!(required.is_none() || required.unwrap().as_array().map_or(true, |a| a.is_empty()),
        "validate should have no required params — serial_numbers is optional");
}

#[test]
fn test_haystack_validate_has_optional_serials() {
    let tool = common::all_tools()
        .iter()
        .find(|t| t.name == "t3000_haystack_validate")
        .unwrap();
    let props = tool.input_schema.get("properties").and_then(|v| v.as_object()).unwrap();
    assert!(props.contains_key("serial_numbers"),
        "should have optional 'serial_numbers' — omit to validate all devices");
}

// ═══ t3000_haystack_export ═══

#[test]
fn test_haystack_export_format_property() {
    let tool = common::all_tools()
        .iter()
        .find(|t| t.name == "t3000_haystack_export")
        .unwrap();
    let format_desc = tool.input_schema
        .get("properties")
        .and_then(|v| v.get("format"))
        .and_then(|v| v.get("description"))
        .and_then(|v| v.as_str());
    assert!(format_desc.is_some());
    // format description should mention the 4 supported formats
    let desc = format_desc.unwrap().to_lowercase();
    assert!(desc.contains("haystack-json") || desc.contains("brick"), 
        "format description should mention supported formats");
}

// ═══ Live DB tests ═══

#[tokio::test]
async fn test_haystack_validate_returns_results() {
    common::with_db_or_skip("haystack_validate_returns_results", |db| async move {
        let result = common::execute_tool_json(
            "t3000_haystack_validate",
            &json!({"serial_numbers": [444]}),
            &db,
        ).await.expect("should succeed");
        // Validate returns some kind of results
        assert!(!result.as_object().map_or(true, |o| o.is_empty()),
            "validate should return data");
    }).await;
}

#[tokio::test]
async fn test_haystack_export_json_format() {
    common::with_db_or_skip("haystack_export_json_format", |db| async move {
        let result = common::execute_tool(
            "t3000_haystack_export",
            &json!({"serial_numbers": [444], "format": "haystack-json"}),
            &db,
        ).await.expect("should succeed");
        // haystack-json should be valid JSON
        let _v: Value = serde_json::from_str(&result)
            .expect("haystack-json export should be valid JSON");
    }).await;
}

#[tokio::test]
async fn test_haystack_export_csv_flat_format() {
    common::with_db_or_skip("haystack_export_csv_flat_format", |db| async move {
        let result = common::execute_tool(
            "t3000_haystack_export",
            &json!({"serial_numbers": [444], "format": "csv-flat"}),
            &db,
        ).await.expect("should succeed");
        // csv-flat should contain header rows or be non-empty
        assert!(!result.is_empty(), "csv-flat export should not be empty");
    }).await;
}
