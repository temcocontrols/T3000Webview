//! Documentation Tool Tests — doc_list, doc_read
//!
//! These tools serve T3000 product documentation. They require no database.

use crate::mcp::common;

// ═══ Tool existence ═══

#[test]
fn test_doc_tools_exist() {
    assert!(common::all_tools().iter().any(|t| t.name == "t3000_doc_list"));
    assert!(common::all_tools().iter().any(|t| t.name == "t3000_doc_read"));
}

// ═══ t3000_doc_list ═══

#[test]
fn test_doc_list_no_required_params() {
    let tool = common::all_tools()
        .iter()
        .find(|t| t.name == "t3000_doc_list")
        .unwrap();
    let required = tool.input_schema.get("required");
    assert!(required.is_none() || required.unwrap().as_array().map_or(true, |a| a.is_empty()),
        "doc_list should have no required params");
}

#[test]
fn test_doc_list_empty_properties() {
    let tool = common::all_tools()
        .iter()
        .find(|t| t.name == "t3000_doc_list")
        .unwrap();
    // doc_list takes no params, so properties should be empty
    let props = tool.input_schema.get("properties").and_then(|v| v.as_object());
    assert!(props.is_some());
    assert!(props.unwrap().is_empty(), "doc_list should have empty properties");
}

// ═══ t3000_doc_read ═══

#[test]
fn test_doc_read_requires_path() {
    let tool = common::all_tools()
        .iter()
        .find(|t| t.name == "t3000_doc_read")
        .unwrap();
    let required: Vec<&str> = tool.input_schema
        .get("required")
        .and_then(|v| v.as_array())
        .map(|a| a.iter().filter_map(|v| v.as_str()).collect())
        .unwrap_or_default();
    assert!(required.contains(&"path"), "doc_read must require 'path'");
    assert_eq!(required.len(), 1, "doc_read should only require 'path'");
}

#[test]
fn test_doc_read_path_is_string() {
    let tool = common::all_tools()
        .iter()
        .find(|t| t.name == "t3000_doc_read")
        .unwrap();
    let path_type = tool.input_schema
        .get("properties")
        .and_then(|v| v.get("path"))
        .and_then(|v| v.get("type"))
        .and_then(|v| v.as_str());
    assert_eq!(path_type, Some("string"), "path must be string type");
}
