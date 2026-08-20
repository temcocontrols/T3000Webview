//! Device Operations Tool Tests — trendlog_list, trendlog_export, device_refresh,
//! schedule_list, settings_read, settings_write, device_control, program_list,
//! program_read, pid_list, holiday_list, building_summary, users_list, graphics_list
//!
//! These 14 tools cover device configuration, control logic, and system overview.
//! All require a live database connection.

use serde_json::json;
use crate::mcp::common;

// ═══ Tool existence ═══

#[test]
fn test_device_ops_tools_exist() {
    let names = [
        "t3000_trendlog_list",
        "t3000_trendlog_export",
        "t3000_device_refresh",
        "t3000_device_get",
        "t3000_device_delete",
        "t3000_schedule_list",
        "t3000_settings_read",
        "t3000_settings_write",
        "t3000_device_control",
        "t3000_program_list",
        "t3000_program_read",
        "t3000_pid_list",
        "t3000_holiday_list",
        "t3000_building_summary",
        "t3000_users_list",
        "t3000_graphics_list",
    ];
    for name in &names {
        assert!(
            common::all_tools().iter().any(|t| t.name == *name),
            "Tool '{}' must be defined",
            name
        );
    }
}

// ═══ t3000_device_refresh ═══

#[test]
fn test_device_refresh_has_point_type_filter() {
    let tool = common::all_tools()
        .iter()
        .find(|t| t.name == "t3000_device_refresh")
        .unwrap();
    let props = tool.input_schema.get("properties").and_then(|v| v.as_object()).unwrap();
    assert!(props.contains_key("point_type"),
        "should have optional 'point_type' to refresh only specific types");
}

// ═══ t3000_settings_read ═══

#[test]
fn test_settings_read_has_category_filter() {
    let tool = common::all_tools()
        .iter()
        .find(|t| t.name == "t3000_settings_read")
        .unwrap();
    let props = tool.input_schema.get("properties").and_then(|v| v.as_object()).unwrap();
    assert!(props.contains_key("category"),
        "should have optional 'category' — network, communication, time, protocol, etc.");
}

// ═══ t3000_device_control ═══

#[test]
fn test_device_control_requires_command() {
    let tool = common::all_tools()
        .iter()
        .find(|t| t.name == "t3000_device_control")
        .unwrap();
    let required: Vec<&str> = tool.input_schema
        .get("required")
        .and_then(|v| v.as_array())
        .map(|a| a.iter().filter_map(|v| v.as_str()).collect())
        .unwrap_or_default();
    assert!(required.contains(&"command"), "device_control must require 'command'");
}

#[test]
fn test_device_control_command_is_string() {
    let tool = common::all_tools()
        .iter()
        .find(|t| t.name == "t3000_device_control")
        .unwrap();
    let cmd_type = tool.input_schema
        .get("properties")
        .and_then(|v| v.get("command"))
        .and_then(|v| v.get("type"))
        .and_then(|v| v.as_str());
    assert_eq!(cmd_type, Some("string"), "command must be string type");
}

// ═══ t3000_building_summary ═══

#[test]
fn test_building_summary_no_params() {
    let tool = common::all_tools()
        .iter()
        .find(|t| t.name == "t3000_building_summary")
        .unwrap();
    let required = tool.input_schema.get("required");
    assert!(required.is_none() || required.unwrap().as_array().map_or(true, |a| a.is_empty()));
    let props = tool.input_schema.get("properties").and_then(|v| v.as_object()).unwrap();
    assert!(props.is_empty(), "building_summary should have empty properties");
}

// ═══ t3000_program_read ═══

#[test]
fn test_program_read_requires_program_id() {
    let tool = common::all_tools()
        .iter()
        .find(|t| t.name == "t3000_program_read")
        .unwrap();
    let required: Vec<&str> = tool.input_schema
        .get("required")
        .and_then(|v| v.as_array())
        .map(|a| a.iter().filter_map(|v| v.as_str()).collect())
        .unwrap_or_default();
    assert!(required.contains(&"program_id"), "program_read must require 'program_id'");
}

// ═══ t3000_graphics_list ═══

#[test]
fn test_graphics_list_requires_serial_number() {
    let tool = common::all_tools()
        .iter()
        .find(|t| t.name == "t3000_graphics_list")
        .unwrap();
    let required: Vec<&str> = tool.input_schema
        .get("required")
        .and_then(|v| v.as_array())
        .map(|a| a.iter().filter_map(|v| v.as_str()).collect())
        .unwrap_or_default();
    assert!(required.contains(&"serial_number"), "graphics_list must require 'serial_number'");
}

// ═══ Live DB tests ═══

#[tokio::test]
async fn test_schedule_list_returns_data() {
    common::with_db_or_skip("schedule_list_returns_data", |db| async move {
        let result = common::execute_tool_json(
            "t3000_schedule_list",
            &json!({"serial_number": 444}),
            &db,
        ).await.expect("should succeed");
        assert!(result.get("schedules").is_some(), "should have schedules array");
        assert!(result.get("total").is_some(), "should have total");
    }).await;
}

#[tokio::test]
async fn test_settings_read_returns_data() {
    common::with_db_or_skip("settings_read_returns_data", |db| async move {
        let result = common::execute_tool_json(
            "t3000_settings_read",
            &json!({"serial_number": 444}),
            &db,
        ).await.expect("should succeed");
        // Should have network or general settings
        assert!(result.get("network").is_some() || result.get("settings").is_some(),
            "should return device settings");
    }).await;
}

#[tokio::test]
async fn test_settings_read_by_category() {
    common::with_db_or_skip("settings_read_by_category", |db| async move {
        let result = common::execute_tool_json(
            "t3000_settings_read",
            &json!({"serial_number": 444, "category": "network"}),
            &db,
        ).await.expect("should succeed");
        // Filtered by network category should still return valid shape
        assert!(!result.as_object().map_or(true, |o| o.is_empty()),
            "network settings should not be empty");
    }).await;
}

#[tokio::test]
async fn test_program_list_returns_data() {
    common::with_db_or_skip("program_list_returns_data", |db| async move {
        let result = common::execute_tool_json(
            "t3000_program_list",
            &json!({"serial_number": 444}),
            &db,
        ).await.expect("should succeed");
        assert!(result.get("programs").is_some(), "should have programs array");
        assert!(result.get("total").is_some(), "should have total");
    }).await;
}

#[tokio::test]
async fn test_pid_list_returns_data() {
    common::with_db_or_skip("pid_list_returns_data", |db| async move {
        let result = common::execute_tool_json(
            "t3000_pid_list",
            &json!({"serial_number": 444}),
            &db,
        ).await.expect("should succeed");
        // PID list may be empty; verify shape
        assert!(result.get("pids").is_some() || result.get("loops").is_some() || result.get("total").is_some(),
            "should return PID data (may be empty)");
        assert!(result.get("total").is_some(), "should have total");
    }).await;
}

#[tokio::test]
async fn test_holiday_list_returns_data() {
    common::with_db_or_skip("holiday_list_returns_data", |db| async move {
        let result = common::execute_tool_json(
            "t3000_holiday_list",
            &json!({"serial_number": 444}),
            &db,
        ).await.expect("should succeed");
        assert!(result.get("holidays").is_some(), "should have holidays array");
        assert!(result.get("total").is_some(), "should have total");
    }).await;
}

#[tokio::test]
async fn test_building_summary_returns_overview() {
    common::with_db_or_skip("building_summary_returns_overview", |db| async move {
        let result = common::execute_tool_json("t3000_building_summary", &json!({}), &db)
            .await
            .expect("should succeed");
        // Should return building summary with some numeric fields
        assert!(!result.as_object().map_or(true, |o| o.is_empty()),
            "building_summary should return data");
    }).await;
}

#[tokio::test]
async fn test_users_list_returns_data() {
    common::with_db_or_skip("users_list_returns_data", |db| async move {
        let result = common::execute_tool_json(
            "t3000_users_list",
            &json!({"serial_number": 444}),
            &db,
        ).await.expect("should succeed");
        assert!(result.get("users").is_some(), "should have users array");
        assert!(result.get("total").is_some(), "should have total");
    }).await;
}

#[tokio::test]
async fn test_graphics_list_returns_data() {
    common::with_db_or_skip("graphics_list_returns_data", |db| async move {
        let result = common::execute_tool_json(
            "t3000_graphics_list",
            &json!({"serial_number": 444}),
            &db,
        ).await.expect("should succeed");
        assert!(result.get("graphics").is_some(), "should have graphics array");
        assert!(result.get("total").is_some(), "should have total");
    }).await;
}

#[tokio::test]
async fn test_device_refresh_handles_call() {
    common::with_db_or_skip("device_refresh_handles_call", |db| async move {
        let result = common::execute_tool(
            "t3000_device_refresh",
            &json!({"serial_number": 444}),
            &db,
        ).await;
        // May fail if FFI not available; test just validates it doesn't panic
        match result {
            Ok(s) => assert!(!s.is_empty()),
            Err(e) => println!("device_refresh returned error (may be expected without FFI): {}", e),
        }
    }).await;
}

#[tokio::test]
async fn test_program_read_returns_source() {
    common::with_db_or_skip("program_read_returns_source", |db| async move {
        // First get a program list to find a program_id
        let list = common::execute_tool_json(
            "t3000_program_list",
            &json!({"serial_number": 444}),
            &db,
        ).await.expect("program_list should succeed");
        let programs = list.get("programs").and_then(|v| v.as_array());
        if let Some(progs) = programs {
            if let Some(first) = progs.first() {
                let prog_id = common::get_str(first, "program_id")
                    .or_else(|| common::get_str(first, "ProgramID"))
                    .or_else(|| common::get_i64(first, "program_id").map(|_| "0"))
                    .or_else(|| common::get_i64(first, "id").map(|_| "0"));
                if let Some(id) = prog_id {
                    let result = common::execute_tool(
                        "t3000_program_read",
                        &json!({"serial_number": 444, "program_id": id}),
                        &db,
                    ).await;
                    assert!(result.is_ok(), "program_read should succeed: {:?}", result.err());
                }
            }
        }
    }).await;
}

// ═══ t3000_device_get (single device query) ═══

#[test]
fn test_device_get_requires_serial_number() {
    let tool = common::all_tools()
        .iter()
        .find(|t| t.name == "t3000_device_get")
        .unwrap();
    let required: Vec<&str> = tool.input_schema
        .get("required")
        .and_then(|v| v.as_array())
        .map(|a| a.iter().filter_map(|v| v.as_str()).collect())
        .unwrap_or_default();
    assert!(required.contains(&"serial_number"), "device_get must require 'serial_number'");
}

#[tokio::test]
async fn test_device_get_returns_device() {
    common::with_db_or_skip("device_get_returns_device", |db| async move {
        // Find an existing device serial from the list, then query it.
        let list = common::execute_tool_json("t3000_device_list", &json!({}), &db)
            .await
            .expect("device_list should succeed");
        let serial = list
            .get("devices")
            .and_then(|v| v.as_array())
            .and_then(|arr| arr.first())
            .and_then(|d| d.get("serial"))
            .and_then(|v| v.as_i64());
        match serial {
            Some(s) => {
                let result = common::execute_tool_json(
                    "t3000_device_get",
                    &json!({"serial_number": s}),
                    &db,
                )
                .await
                .expect("device_get should succeed");
                assert!(
                    result.get("found").and_then(|v| v.as_bool()) == Some(true),
                    "device should be found"
                );
                assert!(result.get("device").is_some(), "should include the device record");
            }
            None => println!("device_get_returns_device: no devices in DB, skipping body check"),
        }
    })
    .await;
}

// ═══ t3000_device_delete (destructive — confirm guarded) ═══

#[test]
fn test_device_delete_requires_serial_and_confirm() {
    let tool = common::all_tools()
        .iter()
        .find(|t| t.name == "t3000_device_delete")
        .unwrap();
    let required: Vec<&str> = tool.input_schema
        .get("required")
        .and_then(|v| v.as_array())
        .map(|a| a.iter().filter_map(|v| v.as_str()).collect())
        .unwrap_or_default();
    assert!(required.contains(&"serial_number"), "device_delete must require 'serial_number'");
    assert!(required.contains(&"confirm"), "device_delete must require 'confirm'");
    let confirm_type = tool.input_schema
        .get("properties")
        .and_then(|v| v.get("confirm"))
        .and_then(|v| v.get("type"))
        .and_then(|v| v.as_str());
    assert_eq!(confirm_type, Some("boolean"), "confirm must be boolean");
}

#[tokio::test]
async fn test_device_delete_requires_confirmation() {
    common::with_db_or_skip("device_delete_requires_confirmation", |db| async move {
        // Missing confirm:true must be rejected before any delete happens.
        let result = common::execute_tool(
            "t3000_device_delete",
            &json!({"serial_number": 444}),
            &db,
        )
        .await;
        match result {
            Ok(_) => panic!("device_delete without confirm must be rejected"),
            Err(e) => assert!(e.contains("confirm"), "error should mention confirm: {}", e),
        }
    })
    .await;
}
