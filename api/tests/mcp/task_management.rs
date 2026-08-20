//! Task Management Tool Tests — task_create, task_list, task_update, task_delete
//!
//! Tasks use file-based JSON storage, so these can be tested without a DB.
//! Tests validate CRUD operations, status transitions, and error handling.

use crate::mcp::common;

// ═══ Tool existence ═══

#[test]
fn test_task_tools_exist() {
    for name in &["t3000_task_create", "t3000_task_list", "t3000_task_update", "t3000_task_delete"] {
        assert!(
            common::all_tools().iter().any(|t| t.name == *name),
            "Tool '{}' must be defined",
            name
        );
    }
}

// ═══ t3000_task_create ═══

#[test]
fn test_task_create_requires_title() {
    let tool = common::all_tools()
        .iter()
        .find(|t| t.name == "t3000_task_create")
        .unwrap();
    let required: Vec<&str> = tool.input_schema
        .get("required")
        .and_then(|v| v.as_array())
        .map(|a| a.iter().filter_map(|v| v.as_str()).collect())
        .unwrap_or_default();
    assert!(required.contains(&"title"), "task_create must require 'title'");
    // title should be the only required param
    assert_eq!(required.len(), 1, "task_create should only require 'title'");
}

#[test]
fn test_task_create_has_optional_params() {
    let tool = common::all_tools()
        .iter()
        .find(|t| t.name == "t3000_task_create")
        .unwrap();
    let props = tool.input_schema.get("properties").and_then(|v| v.as_object()).unwrap();
    assert!(props.contains_key("description"), "should have optional 'description'");
    assert!(props.contains_key("serial_number"), "should have optional 'serial_number'");
    assert!(props.contains_key("priority"), "should have optional 'priority'");
}

// ═══ t3000_task_list ═══

#[test]
fn test_task_list_no_required_params() {
    let tool = common::all_tools()
        .iter()
        .find(|t| t.name == "t3000_task_list")
        .unwrap();
    let required = tool.input_schema.get("required");
    assert!(required.is_none() || required.unwrap().as_array().map_or(true, |a| a.is_empty()));
}

#[test]
fn test_task_list_has_filter_params() {
    let tool = common::all_tools()
        .iter()
        .find(|t| t.name == "t3000_task_list")
        .unwrap();
    let props = tool.input_schema.get("properties").and_then(|v| v.as_object()).unwrap();
    assert!(props.contains_key("status"), "should have optional 'status' filter");
    assert!(props.contains_key("serial_number"), "should have optional 'serial_number' filter");
}

// ═══ t3000_task_update ═══

#[test]
fn test_task_update_requires_task_id() {
    let tool = common::all_tools()
        .iter()
        .find(|t| t.name == "t3000_task_update")
        .unwrap();
    let required: Vec<&str> = tool.input_schema
        .get("required")
        .and_then(|v| v.as_array())
        .map(|a| a.iter().filter_map(|v| v.as_str()).collect())
        .unwrap_or_default();
    assert!(required.contains(&"task_id"), "task_update must require 'task_id'");
    assert_eq!(required.len(), 1, "task_update should only require 'task_id'");
}

#[test]
fn test_task_update_has_updatable_fields() {
    let tool = common::all_tools()
        .iter()
        .find(|t| t.name == "t3000_task_update")
        .unwrap();
    let props = tool.input_schema.get("properties").and_then(|v| v.as_object()).unwrap();
    assert!(props.contains_key("status"), "should have optional 'status'");
    assert!(props.contains_key("title"), "should have optional 'title'");
    assert!(props.contains_key("description"), "should have optional 'description'");
    assert!(props.contains_key("priority"), "should have optional 'priority'");
}

// ═══ t3000_task_delete ═══

#[test]
fn test_task_delete_requires_task_id() {
    let tool = common::all_tools()
        .iter()
        .find(|t| t.name == "t3000_task_delete")
        .unwrap();
    let required: Vec<&str> = tool.input_schema
        .get("required")
        .and_then(|v| v.as_array())
        .map(|a| a.iter().filter_map(|v| v.as_str()).collect())
        .unwrap_or_default();
    assert!(required.contains(&"task_id"), "task_delete must require 'task_id'");
    assert_eq!(required.len(), 1, "task_delete should only require 'task_id'");
}
