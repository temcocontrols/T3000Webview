//! Navigation Tool Tests — nav_list, nav_search, nav_redirect, page_info,
//! device_current, set_chat_device
//!
//! These tools require no database. They validate navigation metadata
//! and URL generation used to guide users through the T3000 web UI.

use crate::mcp::common;

// ═══ t3000_nav_list ═══

#[test]
fn test_nav_list_tool_exists() {
    assert!(common::all_tools().iter().any(|t| t.name == "t3000_nav_list"));
}

#[test]
fn test_nav_list_has_section_param() {
    let tool = common::all_tools()
        .iter()
        .find(|t| t.name == "t3000_nav_list")
        .unwrap();
    let props = tool.input_schema.get("properties").and_then(|v| v.as_object());
    assert!(props.is_some());
    assert!(props.unwrap().contains_key("section"), "should have optional 'section' param");
}

#[test]
fn test_nav_list_section_is_optional() {
    let tool = common::all_tools()
        .iter()
        .find(|t| t.name == "t3000_nav_list")
        .unwrap();
    let required = tool.input_schema.get("required");
    // section should be optional, so required should be absent or empty
    assert!(required.is_none() || required.unwrap().as_array().map_or(true, |a| a.is_empty()),
        "nav_list should have no required params");
}

// ═══ t3000_nav_search ═══

#[test]
fn test_nav_search_tool_exists() {
    assert!(common::all_tools().iter().any(|t| t.name == "t3000_nav_search"));
}

#[test]
fn test_nav_search_requires_query() {
    let tool = common::all_tools()
        .iter()
        .find(|t| t.name == "t3000_nav_search")
        .unwrap();
    let required: Vec<&str> = tool.input_schema
        .get("required")
        .and_then(|v| v.as_array())
        .map(|a| a.iter().filter_map(|v| v.as_str()).collect())
        .unwrap_or_default();
    assert!(required.contains(&"query"), "nav_search must require 'query'");
}

// ═══ t3000_nav_redirect ═══

#[test]
fn test_nav_redirect_tool_exists() {
    assert!(common::all_tools().iter().any(|t| t.name == "t3000_nav_redirect"));
}

#[test]
fn test_nav_redirect_requires_page() {
    let tool = common::all_tools()
        .iter()
        .find(|t| t.name == "t3000_nav_redirect")
        .unwrap();
    let required: Vec<&str> = tool.input_schema
        .get("required")
        .and_then(|v| v.as_array())
        .map(|a| a.iter().filter_map(|v| v.as_str()).collect())
        .unwrap_or_default();
    assert!(required.contains(&"page"), "nav_redirect must require 'page'");
}

#[test]
fn test_nav_redirect_has_optional_serial_number() {
    let tool = common::all_tools()
        .iter()
        .find(|t| t.name == "t3000_nav_redirect")
        .unwrap();
    let props = tool.input_schema.get("properties").and_then(|v| v.as_object());
    assert!(props.is_some());
    assert!(props.unwrap().contains_key("serial_number"),
        "should have optional 'serial_number' param");
}

// ═══ t3000_page_info ═══

#[test]
fn test_page_info_tool_exists() {
    assert!(common::all_tools().iter().any(|t| t.name == "t3000_page_info"));
}

#[test]
fn test_page_info_requires_page() {
    let tool = common::all_tools()
        .iter()
        .find(|t| t.name == "t3000_page_info")
        .unwrap();
    let required: Vec<&str> = tool.input_schema
        .get("required")
        .and_then(|v| v.as_array())
        .map(|a| a.iter().filter_map(|v| v.as_str()).collect())
        .unwrap_or_default();
    assert!(required.contains(&"page"), "page_info must require 'page'");
}

// ═══ t3000_device_current ═══

#[test]
fn test_device_current_tool_exists() {
    assert!(common::all_tools().iter().any(|t| t.name == "t3000_device_current"));
}

#[test]
fn test_device_current_no_required_params() {
    let tool = common::all_tools()
        .iter()
        .find(|t| t.name == "t3000_device_current")
        .unwrap();
    let required = tool.input_schema.get("required");
    assert!(required.is_none() || required.unwrap().as_array().map_or(true, |a| a.is_empty()));
}

// ═══ t3000_set_chat_device ═══

#[test]
fn test_set_chat_device_tool_exists() {
    assert!(common::all_tools().iter().any(|t| t.name == "t3000_set_chat_device"));
}

#[test]
fn test_set_chat_device_requires_serial_number() {
    let tool = common::all_tools()
        .iter()
        .find(|t| t.name == "t3000_set_chat_device")
        .unwrap();
    let required: Vec<&str> = tool.input_schema
        .get("required")
        .and_then(|v| v.as_array())
        .map(|a| a.iter().filter_map(|v| v.as_str()).collect())
        .unwrap_or_default();
    assert!(required.contains(&"serial_number"),
        "set_chat_device must require 'serial_number'");
}
