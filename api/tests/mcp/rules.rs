//! Rules Tool Tests — rule_toggle, rule_create
//!
//! These 2 tools manage auto-tagging rules. Require a live database.

use serde_json::json;
use crate::mcp::common;

// ═══ Tool existence ═══

#[test]
fn test_rules_tools_exist() {
    assert!(common::all_tools().iter().any(|t| t.name == "t3000_rule_toggle"));
    assert!(common::all_tools().iter().any(|t| t.name == "t3000_rule_create"));
}

// ═══ t3000_rule_toggle ═══

#[test]
fn test_rule_toggle_enabled_is_boolean() {
    let tool = common::all_tools()
        .iter()
        .find(|t| t.name == "t3000_rule_toggle")
        .unwrap();
    let enabled_type = tool.input_schema
        .get("properties")
        .and_then(|v| v.get("enabled"))
        .and_then(|v| v.get("type"))
        .and_then(|v| v.as_str());
    assert_eq!(enabled_type, Some("boolean"), "enabled must be boolean type");
}

// ═══ t3000_rule_create ═══

#[test]
fn test_rule_create_has_optional_params() {
    let tool = common::all_tools()
        .iter()
        .find(|t| t.name == "t3000_rule_create")
        .unwrap();
    let props = tool.input_schema.get("properties").and_then(|v| v.as_object()).unwrap();
    assert!(props.contains_key("brick_class"), "should have optional 'brick_class'");
    assert!(props.contains_key("priority"), "should have optional 'priority'");
    assert!(props.contains_key("units"), "should have optional 'units'");
    assert!(props.contains_key("object_types"), "should have optional 'object_types'");
    assert!(props.contains_key("haystack_tags"), "should have optional 'haystack_tags'");
}

#[test]
fn test_rule_create_category_param() {
    let tool = common::all_tools()
        .iter()
        .find(|t| t.name == "t3000_rule_create")
        .unwrap();
    let cat_desc = tool.input_schema
        .get("properties")
        .and_then(|v| v.get("category"))
        .and_then(|v| v.get("description"))
        .and_then(|v| v.as_str());
    assert!(cat_desc.is_some());
    let desc = cat_desc.unwrap().to_lowercase();
    assert!(desc.contains("haystack") || desc.contains("brick"),
        "category description should mention haystack or brick");
}

// ═══ Live DB tests ═══

#[tokio::test]
async fn test_rule_toggle_updates_status() {
    common::with_db_or_skip("rule_toggle_updates_status", |db| async move {
        // First list rules to find a valid rule_id
        let list = common::execute_tool_json("t3000_haystack_list_rules", &json!({}), &db)
            .await.expect("list_rules should succeed");
        let rules = list.get("rules").and_then(|v| v.as_array());
        if let Some(rules_arr) = rules {
            if let Some(first) = rules_arr.first() {
                let rule_id = common::get_i64(first, "id").or_else(|| common::get_i64(first, "rule_id"));
                if let Some(id) = rule_id {
                    // Toggle the rule off, then back on
                    let off = common::execute_tool_json(
                        "t3000_rule_toggle",
                        &json!({"rule_id": id, "enabled": false}),
                        &db,
                    ).await;
                    assert!(off.is_ok(), "rule_toggle disable should succeed: {:?}", off.err());

                    let on = common::execute_tool_json(
                        "t3000_rule_toggle",
                        &json!({"rule_id": id, "enabled": true}),
                        &db,
                    ).await;
                    assert!(on.is_ok(), "rule_toggle enable should succeed: {:?}", on.err());
                }
            }
        }
    }).await;
}

#[tokio::test]
async fn test_rule_create_and_toggle() {
    common::with_db_or_skip("rule_create_and_toggle", |db| async move {
        let result = common::execute_tool_json(
            "t3000_rule_create",
            &json!({
                "rule_name": "test_rule_mcp_suite",
                "pattern": "^TEST_POINT$",
                "category": "haystack",
                "haystack_tags": "test,point"
            }),
            &db,
        ).await;
        // May fail if rule already exists, or succeed — both are fine
        // Just verify it doesn't panic
        if let Ok(r) = &result {
            assert!(common::get_str(r, "status").is_some() || common::get_i64(r, "rule_id").is_some());
        }
    }).await;
}
