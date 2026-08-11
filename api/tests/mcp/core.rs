//! Core Tool Tests — ping, get_version, describe_tool
//!
//! These tools require no database and test fundamental MCP protocol operations.

use crate::mcp::common;

// ═══ t3000_ping ═══

#[test]
fn test_ping_tool_exists() {
    let tool = common::all_tools()
        .iter()
        .find(|t| t.name == "t3000_ping");
    assert!(tool.is_some(), "t3000_ping tool must be defined");
}

#[test]
fn test_ping_schema_is_object_with_no_required_params() {
    let tool = common::all_tools()
        .iter()
        .find(|t| t.name == "t3000_ping")
        .unwrap();
    assert_eq!(tool.input_schema.get("type").and_then(|v| v.as_str()), Some("object"));
    // ping should have no required params
    let required = tool.input_schema.get("required");
    assert!(required.is_none() || required.unwrap().as_array().map_or(true, |a| a.is_empty()));
}

// ═══ t3000_get_version ═══

#[test]
fn test_get_version_tool_exists() {
    let tool = common::all_tools()
        .iter()
        .find(|t| t.name == "t3000_get_version");
    assert!(tool.is_some(), "t3000_get_version tool must be defined");
}

#[test]
fn test_get_version_schema_no_required_params() {
    let tool = common::all_tools()
        .iter()
        .find(|t| t.name == "t3000_get_version")
        .unwrap();
    let required = tool.input_schema.get("required");
    assert!(required.is_none() || required.unwrap().as_array().map_or(true, |a| a.is_empty()));
}

// ═══ t3000_describe_tool ═══

#[test]
fn test_describe_tool_exists() {
    let tool = common::all_tools()
        .iter()
        .find(|t| t.name == "t3000_describe_tool");
    assert!(tool.is_some(), "t3000_describe_tool tool must be defined");
}

#[test]
fn test_describe_tool_requires_tool_name() {
    let tool = common::all_tools()
        .iter()
        .find(|t| t.name == "t3000_describe_tool")
        .unwrap();
    let required: Vec<&str> = tool.input_schema
        .get("required")
        .and_then(|v| v.as_array())
        .map(|a| a.iter().filter_map(|v| v.as_str()).collect())
        .unwrap_or_default();
    assert!(required.contains(&"tool_name"), "describe_tool must require 'tool_name'");
}

#[test]
fn test_describe_tool_has_tool_name_property() {
    let tool = common::all_tools()
        .iter()
        .find(|t| t.name == "t3000_describe_tool")
        .unwrap();
    let props = tool.input_schema.get("properties").and_then(|v| v.as_object());
    assert!(props.is_some(), "describe_tool must have properties");
    assert!(props.unwrap().contains_key("tool_name"), "must have 'tool_name' property");
}

#[test]
fn test_describe_tool_tool_name_is_string_type() {
    let tool = common::all_tools()
        .iter()
        .find(|t| t.name == "t3000_describe_tool")
        .unwrap();
    let tool_name_prop = tool.input_schema
        .get("properties")
        .and_then(|v| v.get("tool_name"));
    assert!(tool_name_prop.is_some(), "tool_name property must exist");
    let prop_type = tool_name_prop.and_then(|v| v.get("type")).and_then(|v| v.as_str());
    assert_eq!(prop_type, Some("string"), "tool_name must be string type");
}
