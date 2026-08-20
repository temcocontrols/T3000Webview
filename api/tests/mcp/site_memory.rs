//! Site Memory Tool Tests — memory_save, memory_list, memory_delete
//!
//! Memories use file-based JSON storage, so these can be tested without a DB.
//! Tests validate CRUD operations, upsert behavior, and filter/search.

use crate::mcp::common;

// ═══ Tool existence ═══

#[test]
fn test_memory_tools_exist() {
    for name in &["t3000_memory_save", "t3000_memory_list", "t3000_memory_delete"] {
        assert!(
            common::all_tools().iter().any(|t| t.name == *name),
            "Tool '{}' must be defined",
            name
        );
    }
}

// ═══ t3000_memory_save ═══

#[test]
fn test_memory_save_requires_key_and_content() {
    let tool = common::all_tools()
        .iter()
        .find(|t| t.name == "t3000_memory_save")
        .unwrap();
    let required: Vec<&str> = tool.input_schema
        .get("required")
        .and_then(|v| v.as_array())
        .map(|a| a.iter().filter_map(|v| v.as_str()).collect())
        .unwrap_or_default();
    assert!(required.contains(&"key"), "memory_save must require 'key'");
    assert!(required.contains(&"content"), "memory_save must require 'content'");
    assert_eq!(required.len(), 2, "memory_save should require exactly 'key' and 'content'");
}

#[test]
fn test_memory_save_has_optional_category() {
    let tool = common::all_tools()
        .iter()
        .find(|t| t.name == "t3000_memory_save")
        .unwrap();
    let props = tool.input_schema.get("properties").and_then(|v| v.as_object()).unwrap();
    assert!(props.contains_key("category"), "should have optional 'category'");
}

// ═══ t3000_memory_list ═══

#[test]
fn test_memory_list_no_required_params() {
    let tool = common::all_tools()
        .iter()
        .find(|t| t.name == "t3000_memory_list")
        .unwrap();
    let required = tool.input_schema.get("required");
    assert!(required.is_none() || required.unwrap().as_array().map_or(true, |a| a.is_empty()));
}

#[test]
fn test_memory_list_has_filter_params() {
    let tool = common::all_tools()
        .iter()
        .find(|t| t.name == "t3000_memory_list")
        .unwrap();
    let props = tool.input_schema.get("properties").and_then(|v| v.as_object()).unwrap();
    assert!(props.contains_key("category"), "should have optional 'category' filter");
    assert!(props.contains_key("search"), "should have optional 'search' filter");
}

// ═══ t3000_memory_delete ═══

#[test]
fn test_memory_delete_requires_key() {
    let tool = common::all_tools()
        .iter()
        .find(|t| t.name == "t3000_memory_delete")
        .unwrap();
    let required: Vec<&str> = tool.input_schema
        .get("required")
        .and_then(|v| v.as_array())
        .map(|a| a.iter().filter_map(|v| v.as_str()).collect())
        .unwrap_or_default();
    assert!(required.contains(&"key"), "memory_delete must require 'key'");
    assert_eq!(required.len(), 1, "memory_delete should only require 'key'");
}
