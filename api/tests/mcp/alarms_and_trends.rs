//! Alarms & Trends Tool Tests — alarm_list, alarm_acknowledge, alarm_settings_read,
//! trendlog_query, trendlog_list, trendlog_export
//!
//! These 6 tools deal with alarm management and historical trend data.
//! All require a live database connection.

use serde_json::json;
use crate::mcp::common;

// ═══ Tool existence ═══

#[test]
fn test_alarm_trend_tools_exist() {
    let names = [
        "t3000_alarm_list",
        "t3000_alarm_acknowledge",
        "t3000_alarm_settings_read",
        "t3000_trendlog_query",
        "t3000_trendlog_list",
        "t3000_trendlog_export",
    ];
    for name in &names {
        assert!(
            common::all_tools().iter().any(|t| t.name == *name),
            "Tool '{}' must be defined",
            name
        );
    }
}

// ═══ t3000_alarm_list ═══

#[test]
fn test_alarm_list_has_filter_params() {
    let tool = common::all_tools()
        .iter()
        .find(|t| t.name == "t3000_alarm_list")
        .unwrap();
    let props = tool.input_schema.get("properties").and_then(|v| v.as_object()).unwrap();
    assert!(props.contains_key("active_only"), "should have optional 'active_only'");
    assert!(props.contains_key("serial_numbers"), "should have optional 'serial_numbers'");
}

// ═══ t3000_alarm_acknowledge ═══

#[test]
fn test_alarm_acknowledge_alarm_id_is_string() {
    let tool = common::all_tools()
        .iter()
        .find(|t| t.name == "t3000_alarm_acknowledge")
        .unwrap();
    let id_type = tool.input_schema
        .get("properties")
        .and_then(|v| v.get("alarm_id"))
        .and_then(|v| v.get("type"))
        .and_then(|v| v.as_str());
    assert_eq!(id_type, Some("string"), "alarm_id must be string type");
}

// ═══ t3000_trendlog_query ═══

#[test]
fn test_trendlog_query_has_limit_param() {
    let tool = common::all_tools()
        .iter()
        .find(|t| t.name == "t3000_trendlog_query")
        .unwrap();
    let props = tool.input_schema.get("properties").and_then(|v| v.as_object()).unwrap();
    assert!(props.contains_key("limit"), "should have optional 'limit'");
    assert!(props.contains_key("end"), "should have optional 'end'");
}

// ═══ t3000_trendlog_export ═══

#[test]
fn test_trendlog_export_format_param() {
    let tool = common::all_tools()
        .iter()
        .find(|t| t.name == "t3000_trendlog_export")
        .unwrap();
    let props = tool.input_schema.get("properties").and_then(|v| v.as_object()).unwrap();
    assert!(props.contains_key("format"), "should have optional 'format' — csv or json");
    assert!(props.contains_key("limit"), "should have optional 'limit'");
}

// ═══ Live DB tests ═══

#[tokio::test]
async fn test_alarm_list_returns_results() {
    common::with_db_or_skip("alarm_list_returns_results", |db| async move {
        let result = common::execute_tool_json(
            "t3000_alarm_list",
            &json!({"serial_numbers": [444]}),
            &db,
        ).await.expect("should succeed");
        assert!(result.get("alarms").is_some(), "should have alarms array");
        assert!(result.get("total").is_some(), "should have total");
    }).await;
}

#[tokio::test]
async fn test_alarm_list_active_only() {
    common::with_db_or_skip("alarm_list_active_only", |db| async move {
        let all = common::execute_tool_json(
            "t3000_alarm_list",
            &json!({"serial_numbers": [444]}),
            &db,
        ).await.unwrap();
        let active = common::execute_tool_json(
            "t3000_alarm_list",
            &json!({"serial_numbers": [444], "active_only": true}),
            &db,
        ).await.unwrap();
        let all_total = common::get_i64(&all, "total").unwrap_or(0);
        let active_total = common::get_i64(&active, "total").unwrap_or(0);
        // Active-only should be subset of all
        assert!(active_total <= all_total,
            "active_only should filter: {} <= {}", active_total, all_total);
    }).await;
}

#[tokio::test]
async fn test_alarm_settings_read_returns_data() {
    common::with_db_or_skip("alarm_settings_read_returns_data", |db| async move {
        let result = common::execute_tool_json(
            "t3000_alarm_settings_read",
            &json!({"serial_number": 444}),
            &db,
        ).await.expect("should succeed");
        // Should return alarm rules or at minimum a valid shape
        assert!(result.get("rules").is_some() || result.get("alarm_settings").is_some(),
            "should return alarm settings");
    }).await;
}

#[tokio::test]
async fn test_trendlog_list_returns_data() {
    common::with_db_or_skip("trendlog_list_returns_data", |db| async move {
        let result = common::execute_tool_json(
            "t3000_trendlog_list",
            &json!({"serial_number": 444}),
            &db,
        ).await.expect("should succeed");
        assert!(result.get("trendlogs").is_some(), "should have trendlogs array");
        assert!(result.get("total").is_some(), "should have total");
    }).await;
}

#[tokio::test]
async fn test_trendlog_query_returns_data() {
    common::with_db_or_skip("trendlog_query_returns_data", |db| async move {
        let result = common::execute_tool_json(
            "t3000_trendlog_query",
            &json!({
                "serial_number": 444,
                "point_type": "INPUT",
                "point_index": 0,
                "start": "2026-01-01T00:00:00Z"
            }),
            &db,
        ).await.expect("should succeed");
        // Trendlog query may return empty if no data in range; verify shape
        assert!(!result.as_object().map_or(true, |o| o.is_empty()),
            "trendlog query should return data (may be empty)");
    }).await;
}
