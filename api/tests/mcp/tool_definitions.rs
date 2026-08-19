//! Tool Definition Tests — validates the TOOLS static array
//!
//! These tests run without a database and verify that every MCP tool
//! is properly defined with all required metadata fields.

/// Helper: get all tool definitions from the library.
fn all_tools() -> &'static [t3_webview_api::mcp::ToolDef] {
    &t3_webview_api::mcp::TOOLS
}

// ═══ Count ═══

#[test]
fn test_tool_count_is_60() {
    let count = all_tools().len();
    assert_eq!(
        count, 62,
        "Expected 62 MCP tools, found {}. If you added/removed tools, update this test.",
        count
    );
}

// ═══ Uniqueness ═══

#[test]
fn test_no_duplicate_tool_names() {
    use std::collections::HashSet;
    let mut seen = HashSet::new();
    for tool in all_tools() {
        assert!(
            seen.insert(tool.name),
            "Duplicate tool name found: '{}'",
            tool.name
        );
    }
}

// ═══ Required fields ═══

#[test]
fn test_all_tools_have_name() {
    for tool in all_tools() {
        assert!(
            !tool.name.is_empty(),
            "Tool at index has empty name"
        );
    }
}

#[test]
fn test_all_tools_have_title() {
    for tool in all_tools() {
        assert!(
            !tool.title.is_empty(),
            "Tool '{}' has empty title",
            tool.name
        );
    }
}

#[test]
fn test_all_tools_have_description() {
    for tool in all_tools() {
        assert!(
            !tool.description.is_empty(),
            "Tool '{}' has empty description",
            tool.name
        );
        assert!(
            tool.description.len() > 20,
            "Tool '{}' description too short ({} chars) — should be descriptive",
            tool.name,
            tool.description.len()
        );
    }
}

#[test]
fn test_all_tools_have_input_schema() {
    for tool in all_tools() {
        assert!(
            tool.input_schema.is_object(),
            "Tool '{}' input_schema is not a JSON object",
            tool.name
        );
        // Every input schema must declare "type": "object" at minimum
        let schema_type = tool.input_schema
            .get("type")
            .and_then(|v| v.as_str());
        assert_eq!(
            schema_type,
            Some("object"),
            "Tool '{}' input_schema must have type=object",
            tool.name
        );
    }
}

// ═══ Naming convention ═══

#[test]
fn test_tool_names_follow_convention() {
    for tool in all_tools() {
        assert!(
            tool.name.starts_with("t3000_"),
            "Tool '{}' must start with 't3000_'",
            tool.name
        );
        // No uppercase in tool names
        assert!(
            !tool.name.chars().any(|c| c.is_uppercase()),
            "Tool '{}' must not contain uppercase characters",
            tool.name
        );
    }
}

// ═══ Schema validation: required params ═══

#[test]
fn test_required_params_match_properties() {
    // If a schema declares required fields, those fields must appear
    // in the properties object.
    for tool in all_tools() {
        let required: Vec<&str> = tool.input_schema
            .get("required")
            .and_then(|v| v.as_array())
            .map(|a| a.iter().filter_map(|v| v.as_str()).collect())
            .unwrap_or_default();

        let properties = tool.input_schema
            .get("properties")
            .and_then(|v| v.as_object());

        for req_field in &required {
            assert!(
                properties.map_or(false, |p| p.contains_key(*req_field)),
                "Tool '{}' declares required field '{}' but it's not in properties",
                tool.name,
                req_field
            );
        }
    }
}

// ═══ Tool-by-tool shape checks ═══

/// Helper: find a tool by name.
fn find_tool(name: &str) -> Option<&t3_webview_api::mcp::ToolDef> {
    all_tools().iter().find(|t| t.name == name)
}

/// Helper: assert a tool has a specific required parameter.
fn assert_has_required(tool_name: &str, param: &str) {
    let tool = find_tool(tool_name).unwrap_or_else(|| panic!("Tool not found: {}", tool_name));
    let required: Vec<&str> = tool.input_schema
        .get("required")
        .and_then(|v| v.as_array())
        .map(|a| a.iter().filter_map(|v| v.as_str()).collect())
        .unwrap_or_default();
    assert!(
        required.contains(&param),
        "Tool '{}' should require '{}' parameter",
        tool_name,
        param
    );
}

/// Helper: assert a tool has a specific optional parameter in properties.
fn assert_has_property(tool_name: &str, param: &str) {
    let tool = find_tool(tool_name).unwrap_or_else(|| panic!("Tool not found: {}", tool_name));
    let has = tool.input_schema
        .get("properties")
        .and_then(|v| v.as_object())
        .map_or(false, |p| p.contains_key(param));
    assert!(
        has,
        "Tool '{}' should have property '{}'",
        tool_name,
        param
    );
}

// ── Core tools ──

#[test]
fn test_ping_no_required_params() {
    let tool = find_tool("t3000_ping").unwrap();
    let required = tool.input_schema.get("required");
    assert!(required.is_none() || required.unwrap().as_array().map_or(true, |a| a.is_empty()),
        "t3000_ping should have no required params");
}

#[test]
fn test_get_version_no_required_params() {
    let tool = find_tool("t3000_get_version").unwrap();
    let required = tool.input_schema.get("required");
    assert!(required.is_none() || required.unwrap().as_array().map_or(false, |a| a.is_empty()));
}

#[test]
fn test_describe_tool_requires_tool_name() {
    assert_has_required("t3000_describe_tool", "tool_name");
}

// ── Haystack tools ──

#[test]
fn test_haystack_search_points_requires_tags() {
    assert_has_required("t3000_haystack_search_points", "tags");
}

#[test]
fn test_haystack_auto_tag_requires_serial_numbers() {
    assert_has_required("t3000_haystack_auto_tag", "serial_numbers");
}

#[test]
fn test_haystack_get_point_tags_requires_serial_numbers() {
    assert_has_required("t3000_haystack_get_point_tags", "serial_numbers");
}

#[test]
fn test_haystack_preview_tags_requires_serial_numbers() {
    assert_has_required("t3000_haystack_preview_tags", "serial_numbers");
}

#[test]
fn test_haystack_get_brick_class_requires_serial_numbers() {
    assert_has_required("t3000_haystack_get_brick_class", "serial_numbers");
}

// ── Data tools ──

#[test]
fn test_device_get_points_requires_serial_number() {
    assert_has_required("t3000_device_get_points", "serial_number");
}

#[test]
fn test_point_get_metadata_requires_all_refs() {
    assert_has_required("t3000_point_get_metadata", "serial_number");
    assert_has_required("t3000_point_get_metadata", "point_type");
    assert_has_required("t3000_point_get_metadata", "point_index");
}

#[test]
fn test_metadata_search_requires_query() {
    assert_has_required("t3000_metadata_search", "query");
}

#[test]
fn test_point_search_requires_query() {
    assert_has_required("t3000_point_search", "query");
}

// ── Operational tools ──

#[test]
fn test_point_read_requires_all_refs() {
    assert_has_required("t3000_point_read", "serial_number");
    assert_has_required("t3000_point_read", "point_type");
    assert_has_required("t3000_point_read", "point_index");
}

#[test]
fn test_point_write_requires_confirm() {
    assert_has_required("t3000_point_write", "confirm");
}

#[test]
fn test_point_read_batch_requires_points() {
    assert_has_required("t3000_point_read_batch", "points");
}

#[test]
fn test_point_write_batch_requires_confirm() {
    assert_has_required("t3000_point_write_batch", "confirm");
}

// ── Navigation ──

#[test]
fn test_nav_search_requires_query() {
    assert_has_required("t3000_nav_search", "query");
}

#[test]
fn test_nav_redirect_requires_page() {
    assert_has_required("t3000_nav_redirect", "page");
}

#[test]
fn test_page_info_requires_page() {
    assert_has_required("t3000_page_info", "page");
}

// ── Tasks ──

#[test]
fn test_task_create_requires_title() {
    assert_has_required("t3000_task_create", "title");
}

#[test]
fn test_task_update_requires_task_id() {
    assert_has_required("t3000_task_update", "task_id");
}

#[test]
fn test_task_delete_requires_task_id() {
    assert_has_required("t3000_task_delete", "task_id");
}

// ── Memory ──

#[test]
fn test_memory_save_requires_key_and_content() {
    assert_has_required("t3000_memory_save", "key");
    assert_has_required("t3000_memory_save", "content");
}

#[test]
fn test_memory_delete_requires_key() {
    assert_has_required("t3000_memory_delete", "key");
}

// ── Alarms ──

#[test]
fn test_alarm_acknowledge_requires_serial_and_id() {
    assert_has_required("t3000_alarm_acknowledge", "serial_number");
    assert_has_required("t3000_alarm_acknowledge", "alarm_id");
}

#[test]
fn test_trendlog_query_requires_serial_type_index_start() {
    assert_has_required("t3000_trendlog_query", "serial_number");
    assert_has_required("t3000_trendlog_query", "point_type");
    assert_has_required("t3000_trendlog_query", "point_index");
    assert_has_required("t3000_trendlog_query", "start");
}

// ── Device operations ──

#[test]
fn test_device_control_requires_confirm() {
    assert_has_required("t3000_device_control", "confirm");
}

#[test]
fn test_settings_write_requires_confirm() {
    assert_has_required("t3000_settings_write", "confirm");
}

// ── Rules ──

#[test]
fn test_rule_toggle_requires_rule_id_and_enabled() {
    assert_has_required("t3000_rule_toggle", "rule_id");
    assert_has_required("t3000_rule_toggle", "enabled");
}

#[test]
fn test_rule_create_requires_name_pattern_category() {
    assert_has_required("t3000_rule_create", "rule_name");
    assert_has_required("t3000_rule_create", "pattern");
    assert_has_required("t3000_rule_create", "category");
}

// ── Analytics ──

#[test]
fn test_haystack_export_requires_serial_numbers_and_format() {
    assert_has_required("t3000_haystack_export", "serial_numbers");
    assert_has_required("t3000_haystack_export", "format");
}

// ── Docs ──

#[test]
fn test_doc_read_requires_path() {
    assert_has_required("t3000_doc_read", "path");
}

// ── Device-specific ──

#[test]
fn test_trendlog_export_requires_serial_trendlog_start() {
    assert_has_required("t3000_trendlog_export", "serial_number");
    assert_has_required("t3000_trendlog_export", "trendlog_id");
    assert_has_required("t3000_trendlog_export", "start");
}

#[test]
fn test_set_chat_device_requires_serial_number() {
    assert_has_required("t3000_set_chat_device", "serial_number");
}
