//! Device Operations Tool Tests — trendlog_list, trendlog_export, device_refresh,
//! schedule_list, settings_read, settings_write, device_control, program_list,
//! program_read, pid_list, holiday_list, building_summary, users_list, graphics_list
//!
//! These 14 tools cover device configuration, control logic, and system overview.
//! All require a live database connection.

use sea_orm::{ConnectionTrait, DatabaseConnection, Statement};
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

// ═══ Device-scoped lists: counts must match the database ═══

/// Serial that has the most rows in `table`, plus that row count.
async fn busiest_device(db: &DatabaseConnection, table: &str) -> Option<(i64, usize)> {
    let sql = format!(
        "SELECT SerialNumber, COUNT(*) AS n FROM {} GROUP BY SerialNumber ORDER BY n DESC LIMIT 1",
        table
    );
    let rows = db
        .query_all(Statement::from_string(sea_orm::DatabaseBackend::Sqlite, &sql))
        .await
        .ok()?;
    let row = rows.first()?;
    Some((
        row.try_get::<i32>("", "SerialNumber").ok()? as i64,
        row.try_get::<i32>("", "n").ok()? as usize,
    ))
}

async fn assert_list_matches_db(db: &DatabaseConnection, tool: &str, table: &str, key: &str) {
    let (serial, expected) = match busiest_device(db, table).await {
        Some(pair) => pair,
        None => {
            println!("{} has no rows — skipping {}", table, tool);
            return;
        }
    };
    let result = common::execute_tool_json(tool, &json!({"serial_number": serial}), db)
        .await
        .unwrap_or_else(|e| panic!("{} should succeed: {}", tool, e));

    let items = result.get(key).and_then(|v| v.as_array()).cloned().unwrap_or_default();
    assert_eq!(items.len(), expected,
        "{} for device {} must return the {} rows stored in {}", tool, serial, expected, table);
    assert_eq!(common::get_i64(&result, "total").unwrap_or(-1) as usize, expected,
        "{} total must match the row count", tool);
}

#[tokio::test]
async fn test_program_list_returns_data() {
    common::with_db_or_skip("program_list_returns_data", |db| async move {
        assert_list_matches_db(&db, "t3000_program_list", "PROGRAMS", "programs").await;
    })
    .await;
}

#[tokio::test]
async fn test_pid_list_returns_data() {
    common::with_db_or_skip("pid_list_returns_data", |db| async move {
        assert_list_matches_db(&db, "t3000_pid_list", "PID_TABLE", "pid_loops").await;
    })
    .await;
}

#[tokio::test]
async fn test_holiday_list_returns_data() {
    common::with_db_or_skip("holiday_list_returns_data", |db| async move {
        assert_list_matches_db(&db, "t3000_holiday_list", "HOLIDAYS", "holidays").await;
    })
    .await;
}

#[tokio::test]
async fn test_graphics_list_returns_data() {
    common::with_db_or_skip("graphics_list_returns_data", |db| async move {
        assert_list_matches_db(&db, "t3000_graphics_list", "GRAPHICS", "graphics").await;
    })
    .await;
}

#[tokio::test]
async fn test_program_read_returns_the_stored_program() {
    common::with_db_or_skip("program_read_returns_stored_program", |db| async move {
        let (serial, _) = match busiest_device(&db, "PROGRAMS").await {
            Some(pair) => pair,
            None => return,
        };

        let rows = db
            .query_all(Statement::from_string(
                sea_orm::DatabaseBackend::Sqlite,
                format!(
                    "SELECT Program_ID, Program_Label, COALESCE(LENGTH(Program_List), 0) AS len
                     FROM PROGRAMS WHERE SerialNumber = {} LIMIT 1",
                    serial
                ),
            ))
            .await
            .expect("program query should succeed");
        let row = rows.first().expect("a program row is needed");
        let program_id: String = row.try_get("", "Program_ID").unwrap();
        let label: String = row.try_get("", "Program_Label").unwrap_or_default();
        let source_len: i64 = row.try_get("", "len").unwrap_or(0);

        let result = common::execute_tool_json(
            "t3000_program_read",
            &json!({"serial_number": serial, "program_id": program_id}),
            &db,
        )
        .await
        .expect("program_read should succeed");

        assert_eq!(common::get_str(&result, "program_id"), Some(program_id.as_str()));
        assert_eq!(common::get_str(&result, "label"), Some(label.as_str()),
            "the label must come from the DB");
        assert_eq!(common::get_i64(&result, "source_length").unwrap_or(-1), source_len,
            "source_length must match the stored Program_List length");
        assert_eq!(common::get_str(&result, "source").unwrap_or("x").len() as i64, source_len,
            "source must be the stored program text");

        let err = common::execute_tool_json(
            "t3000_program_read",
            &json!({"serial_number": serial, "program_id": "PRG_NOT_THERE"}),
            &db,
        )
        .await
        .expect_err("an unknown program must be an error");
        assert!(err.contains("PRG_NOT_THERE"), "got: {}", err);
    })
    .await;
}

/// `SELECT COUNT(*) AS n ...` helper.
async fn count_rows(db: &DatabaseConnection, sql: &str) -> i64 {
    let rows = db
        .query_all(Statement::from_string(sea_orm::DatabaseBackend::Sqlite, sql))
        .await
        .expect("count query should succeed");
    rows.first().and_then(|r| r.try_get::<i32>("", "n").ok()).unwrap_or(-1) as i64
}

#[tokio::test]
async fn test_building_summary_matches_the_database() {
    common::with_db_or_skip("building_summary_matches_db", |db| async move {
        let result = common::execute_tool_json("t3000_building_summary", &json!({}), &db)
            .await
            .expect("should succeed");

        let devices = count_rows(&db, "SELECT COUNT(*) AS n FROM DEVICES").await;
        let online = count_rows(&db, "SELECT COUNT(*) AS n FROM DEVICES WHERE is_online = 1").await;
        let programs = count_rows(&db, "SELECT COUNT(*) AS n FROM PROGRAMS").await;
        let pids = count_rows(&db, "SELECT COUNT(*) AS n FROM PID_TABLE").await;
        let schedules = count_rows(&db, "SELECT COUNT(*) AS n FROM SCHEDULES").await;
        let trendlogs = count_rows(&db, "SELECT COUNT(*) AS n FROM TRENDLOGS").await;

        assert_eq!(common::get_i64(&result, "device_count").unwrap_or(-1), devices,
            "device_count must match DEVICES");
        assert_eq!(common::array_len(&result, "devices") as i64, devices,
            "the devices array must list every device");
        assert_eq!(common::get_i64(&result, "online_devices").unwrap_or(-1), online,
            "online_devices must match the is_online flags");
        assert_eq!(common::get_i64(&result, "offline_devices").unwrap_or(-1), devices - online,
            "offline_devices must be the remainder");
        assert_eq!(common::get_i64(&result, "total_programs").unwrap_or(-1), programs);
        assert_eq!(common::get_i64(&result, "total_pid_loops").unwrap_or(-1), pids);
        assert_eq!(common::get_i64(&result, "total_schedules").unwrap_or(-1), schedules);
        assert_eq!(common::get_i64(&result, "total_trendlogs").unwrap_or(-1), trendlogs);
    })
    .await;
}

#[tokio::test]
async fn test_users_list_returns_data() {
    common::with_db_or_skip("users_list_returns_data", |db| async move {
        let serial = common::pick_device_with_inputs(&db).await.map(|(s, _)| s).unwrap_or(0);
        let result = common::execute_tool_json(
            "t3000_users_list",
            &json!({"serial_number": serial}),
            &db,
        ).await.expect("should succeed");
        assert_eq!(common::array_len(&result, "users"), common::get_i64(&result, "total").unwrap_or(-1) as usize,
            "total must match the users array: {}", result);
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
                let device = result.get("device").expect("should include the device record");
                // device_get now returns the same snake_case shape as
                // t3000_device_list, so the two can be compared directly.
                assert_eq!(
                    device.get("serial").and_then(|v| v.as_i64()),
                    Some(s),
                    "returned device must be the one that was asked for: {}",
                    device
                );
                if let Some(entry) = list
                    .get("devices")
                    .and_then(|v| v.as_array())
                    .and_then(|arr| arr.iter().find(|d| d.get("serial").and_then(|v| v.as_i64()) == Some(s)))
                {
                    assert_eq!(
                        device, entry,
                        "device_get must return exactly the device_list entry for serial {}",
                        s
                    );
                }
                // The full SeaORM record is still available under `raw`.
                assert!(
                    result.get("raw").and_then(|v| v.get("serialNumber")).is_some(),
                    "raw record should still expose the entity fields"
                );
                println!("device_get: serial {} -> {:?}", s, device.get("name").and_then(|v| v.as_str()));
            }
            None => println!("device_get_returns_device: no devices in DB, skipping body check"),
        }
    })
    .await;
}

/// An unknown serial must fail with a clear message, not an empty success.
#[tokio::test]
async fn test_device_get_unknown_serial_errors() {
    common::with_db_or_skip("device_get_unknown_serial_errors", |db| async move {
        let error = common::execute_tool("t3000_device_get", &json!({"serial_number": 987654321}), &db)
            .await
            .expect_err("unknown serials must fail");
        assert!(
            error.contains("not found"),
            "expected a 'not found' error, got: {}",
            error
        );
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

/// An unknown serial must be a clean "not found" — never a half-run delete.
#[tokio::test]
async fn test_device_delete_unknown_serial_is_not_found() {
    common::with_db_or_skip("device_delete_unknown_serial", |db| async move {
        let err = common::execute_tool(
            "t3000_device_delete",
            &json!({"serial_number": 987654, "confirm": true}),
            &db,
        )
        .await
        .expect_err("deleting a device that does not exist must fail");
        assert!(
            err.to_lowercase().contains("not found") || err.to_lowercase().contains("locked"),
            "the error should explain the failure: {}", err
        );
    })
    .await;
}

// ═══ t3000_settings_write / settings_read round trip ═══

#[tokio::test]
async fn test_settings_write_rejects_unknown_device_and_field() {
    common::with_db_or_skip("settings_write_rejects_bad_input", |db| async move {
        let err = common::execute_tool(
            "t3000_settings_write",
            &json!({"serial_number": 987654, "category": "network",
                    "fields": {"IP_Address": "1.2.3.4"}, "confirm": true}),
            &db,
        )
        .await
        .expect_err("writing settings for an unknown device must fail");
        assert!(err.to_lowercase().contains("not found"), "got: {}", err);

        let serial = common::pick_device_with_inputs(&db).await
            .map(|(s, _)| s)
            .expect("a device with points is needed");

        let err = common::execute_tool(
            "t3000_settings_write",
            &json!({"serial_number": serial, "category": "network",
                    "fields": {"Nonsense_Field": 1}, "confirm": true}),
            &db,
        )
        .await
        .expect_err("an unknown field must be rejected");
        assert!(err.contains("not allowed"), "got: {}", err);

        let err = common::execute_tool(
            "t3000_settings_write",
            &json!({"serial_number": serial, "category": "nonsense",
                    "fields": {"IP_Address": "1.2.3.4"}, "confirm": true}),
            &db,
        )
        .await
        .expect_err("an unknown category must be rejected");
        assert!(err.to_lowercase().contains("unknown category"), "got: {}", err);

        let err = common::execute_tool(
            "t3000_settings_write",
            &json!({"serial_number": serial, "category": "network",
                    "fields": {"IP_Address": "1.2.3.4"}}),
            &db,
        )
        .await
        .expect_err("settings_write must require confirm");
        assert!(err.to_lowercase().contains("confirm"), "got: {}", err);
    })
    .await;
}

/// Writes a temporary network settings row, reads it back (numeric columns
/// included) and removes it again.
#[tokio::test]
async fn test_settings_write_then_read_round_trip() {
    common::with_db_or_skip("settings_write_read_round_trip", |db| async move {
        let rows = db
            .query_all(sea_orm::Statement::from_string(
                sea_orm::DatabaseBackend::Sqlite,
                "SELECT SerialNumber FROM DEVICES
                 WHERE SerialNumber NOT IN (SELECT SerialNumber FROM NETWORK_SETTINGS)
                 ORDER BY SerialNumber LIMIT 1",
            ))
            .await
            .expect("device query should succeed");
        let serial = match rows.first().and_then(|r| r.try_get::<i32>("", "SerialNumber").ok()) {
            Some(serial) => serial as i64,
            None => {
                println!("every device already has a NETWORK_SETTINGS row — skipping");
                return;
            }
        };

        common::execute_tool_json(
            "t3000_settings_write",
            &json!({"serial_number": serial, "category": "network",
                    "fields": {"IP_Address": "10.11.12.13", "TCP_Type": 2},
                    "confirm": true}),
            &db,
        )
        .await
        .expect("settings_write should succeed for a real device");

        let read = common::execute_tool_json(
            "t3000_settings_read",
            &json!({"serial_number": serial, "category": "network"}),
            &db,
        )
        .await
        .expect("settings_read should succeed");

        let network = read.get("network").expect("network category must be present");
        assert_eq!(common::get_str(network, "IP_Address"), Some("10.11.12.13"),
            "the written value must be read back: {}", network);
        // TCP_Type is numeric in the table and used to be dropped from the response.
        assert!(network.get("TCP_Type").map(|v| !v.is_null()).unwrap_or(false),
            "numeric settings columns must be returned: {}", network);

        let cleanup = format!("DELETE FROM NETWORK_SETTINGS WHERE SerialNumber = {}", serial);
        let _ = db.execute(Statement::from_string(sea_orm::DatabaseBackend::Sqlite, &cleanup)).await;
    })
    .await;
}

#[tokio::test]
async fn test_settings_read_explains_missing_data() {
    common::with_db_or_skip("settings_read_explains_missing", |db| async move {
        let rows = db
            .query_all(Statement::from_string(
                sea_orm::DatabaseBackend::Sqlite,
                "SELECT SerialNumber FROM DEVICES
                 WHERE SerialNumber NOT IN (SELECT SerialNumber FROM NETWORK_SETTINGS)
                 ORDER BY SerialNumber LIMIT 1",
            ))
            .await
            .expect("device query should succeed");
        let serial = match rows.first().and_then(|r| r.try_get::<i32>("", "SerialNumber").ok()) {
            Some(serial) => serial as i64,
            None => return,
        };

        let read = common::execute_tool_json(
            "t3000_settings_read",
            &json!({"serial_number": serial}),
            &db,
        )
        .await
        .expect("settings_read should succeed");

        assert!(common::get_str(&read, "note").is_some(),
            "a device with no synced settings must say so instead of returning all nulls: {}", read);
    })
    .await;
}

// ═══ t3000_device_control ═══

/// Only the rejection paths: a real reboot must never be sent by a test.
#[tokio::test]
async fn test_device_control_rejects_unknown_device_and_command() {
    common::with_db_or_skip("device_control_rejects", |db| async move {
        let err = common::execute_tool(
            "t3000_device_control",
            &json!({"serial_number": 987654, "command": "reboot", "confirm": true}),
            &db,
        )
        .await
        .expect_err("a command for a device that does not exist must fail, not report success");
        assert!(err.to_lowercase().contains("not found"), "got: {}", err);

        let serial = common::pick_device_with_inputs(&db).await
            .map(|(s, _)| s)
            .expect("a device with points is needed");

        let err = common::execute_tool(
            "t3000_device_control",
            &json!({"serial_number": serial, "command": "nonsense", "confirm": true}),
            &db,
        )
        .await
        .expect_err("an unknown command must be rejected");
        assert!(err.contains("Unknown command"), "got: {}", err);

        let err = common::execute_tool(
            "t3000_device_control",
            &json!({"serial_number": serial, "command": "reboot"}),
            &db,
        )
        .await
        .expect_err("device_control must require confirm");
        assert!(err.to_lowercase().contains("confirm"), "got: {}", err);
    })
    .await;
}

#[tokio::test]
async fn test_schedule_list_matches_the_database() {
    common::with_db_or_skip("schedule_list_matches_db", |db| async move {
        let rows = db
            .query_all(Statement::from_string(
                sea_orm::DatabaseBackend::Sqlite,
                "SELECT SerialNumber, COUNT(*) AS n FROM SCHEDULES
                 GROUP BY SerialNumber ORDER BY n DESC LIMIT 1",
            ))
            .await
            .expect("schedule query should succeed");
        let row = match rows.first() {
            Some(row) => row,
            None => {
                println!("no schedules in this DB — skipping");
                return;
            }
        };
        let serial = row.try_get::<i32>("", "SerialNumber").unwrap() as i64;
        let expected = row.try_get::<i32>("", "n").unwrap() as usize;

        let result = common::execute_tool_json(
            "t3000_schedule_list",
            &json!({"serial_number": serial}),
            &db,
        )
        .await
        .expect("should succeed");

        assert_eq!(common::array_len(&result, "schedules"), expected,
            "device {} has {} schedules in the DB", serial, expected);
        assert_eq!(common::get_i64(&result, "total").unwrap_or(-1) as usize, expected,
            "total must match the schedules array");
    })
    .await;
}
