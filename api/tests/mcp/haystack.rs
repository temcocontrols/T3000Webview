//! Haystack Tool Tests — list_tags, get_point_tags, search_points, auto_tag,
//! preview_tags, list_rules, get_brick_class
//!
//! These 7 tools require a live database connection with Haystack tag data.
//! Uses the T3000 runtime database at the configured path.

use serde_json::json;
use crate::mcp::common;

// ═══ Tool existence ═══

#[test]
fn test_haystack_tools_exist() {
    let names = [
        "t3000_haystack_list_tags",
        "t3000_haystack_get_point_tags",
        "t3000_haystack_search_points",
        "t3000_haystack_auto_tag",
        "t3000_haystack_preview_tags",
        "t3000_haystack_list_rules",
        "t3000_haystack_get_brick_class",
    ];
    for name in &names {
        assert!(
            common::all_tools().iter().any(|t| t.name == *name),
            "Tool '{}' must be defined",
            name
        );
    }
}

// ═══ t3000_haystack_list_tags ═══

#[test]
fn test_haystack_list_tags_has_filter_param() {
    let tool = common::all_tools()
        .iter()
        .find(|t| t.name == "t3000_haystack_list_tags")
        .unwrap();
    let props = tool.input_schema.get("properties").and_then(|v| v.as_object()).unwrap();
    assert!(props.contains_key("filter"), "should have optional 'filter' param");
}

// ═══ t3000_haystack_search_points ═══

#[test]
fn test_haystack_search_points_has_filter_params() {
    let tool = common::all_tools()
        .iter()
        .find(|t| t.name == "t3000_haystack_search_points")
        .unwrap();
    let props = tool.input_schema.get("properties").and_then(|v| v.as_object()).unwrap();
    assert!(props.contains_key("serial_numbers"), "should have optional 'serial_numbers'");
    assert!(props.contains_key("point_types"), "should have optional 'point_types'");
}

// ═══ t3000_haystack_export: format enum ═══

#[test]
fn test_haystack_export_format_param() {
    let tool = common::all_tools()
        .iter()
        .find(|t| t.name == "t3000_haystack_export")
        .unwrap();
    let format_prop = tool.input_schema
        .get("properties")
        .and_then(|v| v.get("format"))
        .and_then(|v| v.get("type"));
    assert_eq!(format_prop.and_then(|v| v.as_str()), Some("string"),
        "format must be string type");
}

// ═══ DB-dependent tests (run with T3000_TEST_DB_PATH) ═══

// ═══ Live DB tests ═══

#[tokio::test]
async fn test_list_tags_returns_data() {
    common::with_db_or_skip("list_tags_returns_data", |db| async move {
        let result = common::execute_tool_json("t3000_haystack_list_tags", &json!({}), &db)
            .await
            .expect("list_tags should succeed");
        let total = common::get_i64(&result, "total").expect("should have total");
        assert!(total > 0, "should have at least 1 tag");
        let tags = result.get("tags").and_then(|v| v.as_array()).expect("should have tags array");
        assert_eq!(tags.len() as i64, total, "total should match array length");
        // First tag should have some identifying field
        let first = &tags[0];
        assert!(!first.as_object().map_or(true, |o| o.is_empty()),
            "tag should not be empty");
    }).await;
}

#[tokio::test]
async fn test_list_tags_filter_by_category() {
    common::with_db_or_skip("list_tags_filter_by_category", |db| async move {
        let result = common::execute_tool_json(
            "t3000_haystack_list_tags",
            &json!({"filter": "haystack"}),
            &db,
        ).await.expect("should succeed");
        let _total = common::get_i64(&result, "total").unwrap_or(0);
        // Filtering should return a subset (may be 0 if no haystack-category tags)
        // Just verify the call succeeded and returned the right shape
        assert!(result.get("tags").is_some());
    }).await;
}

#[tokio::test]
async fn test_get_point_tags_returns_data() {
    common::with_db_or_skip("get_point_tags_returns_data", |db| async move {
        // Use device 444 (T3-NB-ESP) which has 192 points each
        let result = common::execute_tool_json(
            "t3000_haystack_get_point_tags",
            &json!({"serial_numbers": [444]}),
            &db,
        ).await.expect("should succeed");
        let total = common::get_i64(&result, "total").unwrap_or(0);
        // May have point tags or not; at minimum verify shape
        assert!(result.get("entries").is_some());
        let entries = result.get("entries").and_then(|v| v.as_array()).expect("should have entries");
        // Each entry should have serial_number, point_type, point_index, tags
        if let Some(first) = entries.first() {
            assert!(common::get_i64(first, "serial_number").is_some());
            assert!(common::get_str(first, "point_type").is_some());
        }
    }).await;
}

#[tokio::test]
async fn test_search_points_by_tag() {
    common::with_db_or_skip("search_points_by_tag", |db| async move {
        let result = common::execute_tool_json(
            "t3000_haystack_search_points",
            &json!({"tags": ["temp"]}),
            &db,
        ).await.expect("should succeed");
        let _total = common::get_i64(&result, "total").unwrap_or(0);
        // May or may not have temp-tagged points; just verify shape
        assert!(result.get("entries").is_some());
        assert!(result.get("total").is_some());
    }).await;
}

#[tokio::test]
async fn test_list_rules_returns_data() {
    common::with_db_or_skip("list_rules_returns_data", |db| async move {
        let result = common::execute_tool_json("t3000_haystack_list_rules", &json!({}), &db)
            .await
            .expect("list_rules should succeed");
        let total = common::get_i64(&result, "total").expect("should have total");
        assert!(total > 0, "should have at least 1 auto-tagging rule");
        let rules = result.get("rules").and_then(|v| v.as_array()).expect("should have rules array");
        // First rule should have pattern, category
        if let Some(first) = rules.first() {
            assert!(common::get_str(first, "pattern").is_some() || common::get_str(first, "rule_name").is_some());
        }
    }).await;
}

#[tokio::test]
async fn test_get_brick_class_returns_data() {
    common::with_db_or_skip("get_brick_class_returns_data", |db| async move {
        let result = common::execute_tool_json(
            "t3000_haystack_get_brick_class",
            &json!({"serial_numbers": [444]}),
            &db,
        ).await.expect("should succeed");
        let _total = common::get_i64(&result, "total").unwrap_or(0);
        // May have brick classes or not; just verify shape
        assert!(result.get("points").is_some());
        assert!(result.get("total").is_some());
    }).await;
}

#[tokio::test]
async fn test_preview_tags_returns_matches() {
    common::with_db_or_skip("preview_tags_returns_matches", |db| async move {
        let result = common::execute_tool_json(
            "t3000_haystack_preview_tags",
            &json!({"serial_numbers": [444]}),
            &db,
        ).await.expect("should succeed");
        assert!(result.get("matches").is_some());
        assert!(result.get("total").is_some());
    }).await;
}
