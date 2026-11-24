//! Alarms & Trends Tool Tests — alarm_list, alarm_acknowledge, alarm_settings_read,
//! trendlog_query, trendlog_list, trendlog_export
//!
//! These 6 tools deal with alarm management and historical trend data.
//! The live tests read real rows: they pick a device/point that actually has data
//! (and insert + remove a synthetic alarm) so a green run means something worked.

use sea_orm::{ConnectionTrait, DatabaseConnection, Statement};
use serde_json::json;
use crate::mcp::common;

// ═══ Tool existence & schema ═══

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

// ═══ DB helpers ═══

/// Serial of the first device in DEVICES — used to park synthetic alarm rows.
async fn first_device_serial(db: &DatabaseConnection) -> i64 {
    let rows = db
        .query_all(Statement::from_string(
            sea_orm::DatabaseBackend::Sqlite,
            "SELECT SerialNumber FROM DEVICES ORDER BY SerialNumber LIMIT 1",
        ))
        .await
        .expect("device query should succeed");
    rows.first()
        .and_then(|r| r.try_get::<i32>("", "SerialNumber").ok())
        .expect("the runtime DB must contain at least one device") as i64
}

async fn delete_alarm(db: &DatabaseConnection, alarm_id: &str) {
    let sql = format!(
        "DELETE FROM ALARMS WHERE Alarm_ID = '{}'",
        alarm_id.replace('\'', "''")
    );
    let _ = db
        .execute(Statement::from_string(sea_orm::DatabaseBackend::Sqlite, &sql))
        .await;
}

async fn insert_alarm(db: &DatabaseConnection, serial: i64, alarm_id: &str, acknowledged: &str) {
    let sql = format!(
        "INSERT INTO ALARMS (SerialNumber, Alarm_ID, Panel, Message, Priority, AlarmState,
                             AlarmType, Source, Description, Acknowledged, TimeStamp)
         VALUES ({}, '{}', 13, 'MCP suite alarm', 3, 'ALARM', 'High Limit', 'IN1',
                 'row owned by the MCP test suite', '{}', '2026-01-01 00:00:00')",
        serial,
        alarm_id.replace('\'', "''"),
        acknowledged.replace('\'', "''")
    );
    db.execute(Statement::from_string(sea_orm::DatabaseBackend::Sqlite, &sql))
        .await
        .expect("inserting a synthetic alarm should succeed");
}

async fn acknowledged_flag(db: &DatabaseConnection, alarm_id: &str) -> Option<String> {
    let sql = format!(
        "SELECT Acknowledged FROM ALARMS WHERE Alarm_ID = '{}'",
        alarm_id.replace('\'', "''")
    );
    let rows = db
        .query_all(Statement::from_string(sea_orm::DatabaseBackend::Sqlite, &sql))
        .await
        .ok()?;
    rows.first()?.try_get::<String>("", "Acknowledged").ok()
}

/// A point that actually has recorded samples: `(serial, point_type, point_index 1-based)`.
async fn pick_logged_point(db: &DatabaseConnection) -> Option<(i64, String, i64)> {
    let rows = db
        .query_all(Statement::from_string(
            sea_orm::DatabaseBackend::Sqlite,
            "SELECT d.SerialNumber AS sn, d.PointType AS pt, CAST(d.PointIndex AS INTEGER) AS idx,
                    COUNT(x.ParentId) AS n
             FROM TRENDLOG_DATA d
             JOIN TRENDLOG_DATA_DETAIL x ON x.ParentId = d.id
             GROUP BY d.id ORDER BY n DESC LIMIT 1",
        ))
        .await
        .ok()?;
    let row = rows.first()?;
    Some((
        row.try_get::<i32>("", "sn").ok()? as i64,
        row.try_get::<String>("", "pt").ok()?,
        row.try_get::<i32>("", "idx").ok()? as i64,
    ))
}

// ═══ t3000_alarm_list ═══

#[tokio::test]
async fn test_alarm_list_returns_the_stored_alarm() {
    common::with_db_or_skip("alarm_list_returns_the_stored_alarm", |db| async move {
        let serial = first_device_serial(&db).await;
        let alarm_id = "MCP_SUITE_LIST";
        delete_alarm(&db, alarm_id).await;
        insert_alarm(&db, serial, alarm_id, "0").await;

        let result = common::execute_tool_json(
            "t3000_alarm_list",
            &json!({"serial_numbers": [serial]}),
            &db,
        )
        .await
        .expect("alarm_list should succeed");

        let alarms = result.get("alarms").and_then(|v| v.as_array()).cloned().unwrap_or_default();
        assert_eq!(common::get_i64(&result, "total").unwrap_or(-1) as usize, alarms.len(),
            "total must match the alarms array");

        let alarm = alarms
            .iter()
            .find(|a| common::get_str(a, "alarm_id") == Some(alarm_id))
            .unwrap_or_else(|| panic!("the synthetic alarm must be listed: {}", result));

        assert_eq!(common::get_str(alarm, "message"), Some("MCP suite alarm"));
        assert_eq!(common::get_str(alarm, "panel"), Some("13"));
        assert_eq!(common::get_str(alarm, "priority"), Some("3"));
        assert_eq!(common::get_str(alarm, "alarm_state"), Some("ALARM"));
        // alarm_list used to drop the description column it selected.
        assert_eq!(common::get_str(alarm, "description"),
            Some("row owned by the MCP test suite"),
            "description must be returned, not silently dropped: {}", alarm);

        delete_alarm(&db, alarm_id).await;
    })
    .await;
}

#[tokio::test]
async fn test_alarm_list_active_only_excludes_acknowledged() {
    common::with_db_or_skip("alarm_list_active_only", |db| async move {
        let serial = first_device_serial(&db).await;
        let open_id = "MCP_SUITE_ACTIVE";
        let done_id = "MCP_SUITE_ACKED";
        delete_alarm(&db, open_id).await;
        delete_alarm(&db, done_id).await;
        insert_alarm(&db, serial, open_id, "0").await;
        insert_alarm(&db, serial, done_id, "1").await;

        let active = common::execute_tool_json(
            "t3000_alarm_list",
            &json!({"serial_numbers": [serial], "active_only": true}),
            &db,
        )
        .await
        .expect("alarm_list should succeed");

        let ids: Vec<&str> = active["alarms"]
            .as_array()
            .map(|a| a.iter().filter_map(|x| common::get_str(x, "alarm_id")).collect())
            .unwrap_or_default();
        assert!(ids.contains(&open_id), "the unacknowledged alarm must be active: {:?}", ids);
        assert!(!ids.contains(&done_id), "the acknowledged alarm must not be active: {:?}", ids);

        delete_alarm(&db, open_id).await;
        delete_alarm(&db, done_id).await;
    })
    .await;
}

// ═══ t3000_alarm_acknowledge ═══

#[tokio::test]
async fn test_alarm_acknowledge_sets_the_stored_flag() {
    common::with_db_or_skip("alarm_acknowledge_sets_flag", |db| async move {
        let serial = first_device_serial(&db).await;
        let alarm_id = "MCP_SUITE_ACK";
        delete_alarm(&db, alarm_id).await;
        insert_alarm(&db, serial, alarm_id, "0").await;

        let out = common::execute_tool_json(
            "t3000_alarm_acknowledge",
            &json!({"serial_number": serial, "alarm_id": alarm_id}),
            &db,
        )
        .await
        .expect("acknowledging an existing alarm should succeed");

        assert_eq!(out.get("acknowledged").and_then(|v| v.as_bool()), Some(true), "{}", out);
        // The acknowledgement must reach the row, not just the response.
        assert_eq!(acknowledged_flag(&db, alarm_id).await.as_deref(), Some("1"),
            "ALARMS.Acknowledged must be '1' after acknowledging");

        delete_alarm(&db, alarm_id).await;
    })
    .await;
}

#[tokio::test]
async fn test_alarm_acknowledge_unknown_alarm_is_an_error() {
    common::with_db_or_skip("alarm_acknowledge_unknown", |db| async move {
        let serial = first_device_serial(&db).await;
        let err = common::execute_tool_json(
            "t3000_alarm_acknowledge",
            &json!({"serial_number": serial, "alarm_id": "MCP_SUITE_DOES_NOT_EXIST"}),
            &db,
        )
        .await
        .expect_err("acknowledging a missing alarm used to report success");
        assert!(err.contains("MCP_SUITE_DOES_NOT_EXIST"), "the error should name the alarm: {}", err);
        assert!(err.to_lowercase().contains("not found"), "got: {}", err);
    })
    .await;
}

/// Regression: `alarm_id` was interpolated into the SQL, so `X' OR '1'='1`
/// acknowledged every alarm on the device.
#[tokio::test]
async fn test_alarm_acknowledge_input_is_parameterised() {
    common::with_db_or_skip("alarm_acknowledge_parameterised", |db| async move {
        let serial = first_device_serial(&db).await;
        let victim_id = "MCP_SUITE_VICTIM";
        delete_alarm(&db, victim_id).await;
        insert_alarm(&db, serial, victim_id, "0").await;

        let err = common::execute_tool_json(
            "t3000_alarm_acknowledge",
            &json!({"serial_number": serial, "alarm_id": "X' OR '1'='1"}),
            &db,
        )
        .await
        .expect_err("an injection payload must not acknowledge anything");
        assert!(err.to_lowercase().contains("not found"), "got: {}", err);

        assert_eq!(acknowledged_flag(&db, victim_id).await.as_deref(), Some("0"),
            "the injection probe must not touch other alarms");

        delete_alarm(&db, victim_id).await;
    })
    .await;
}

// ═══ t3000_alarm_settings_read ═══

#[tokio::test]
async fn test_alarm_settings_read_returns_data() {
    common::with_db_or_skip("alarm_settings_read_returns_data", |db| async move {
        let serial = first_device_serial(&db).await;
        let result = common::execute_tool_json(
            "t3000_alarm_settings_read",
            &json!({"serial_number": serial}),
            &db,
        )
        .await
        .expect("should succeed");
        // Should return alarm rules or at minimum a valid shape
        assert!(result.get("rules").is_some() || result.get("alarm_settings").is_some(),
            "should return alarm settings: {}", result);
    })
    .await;
}

// ═══ t3000_trendlog_list ═══

#[tokio::test]
async fn test_trendlog_list_matches_the_database() {
    common::with_db_or_skip("trendlog_list_matches_db", |db| async move {
        let rows = db
            .query_all(Statement::from_string(
                sea_orm::DatabaseBackend::Sqlite,
                "SELECT SerialNumber, COUNT(*) AS n FROM TRENDLOGS
                 GROUP BY SerialNumber ORDER BY n DESC LIMIT 1",
            ))
            .await
            .expect("trendlog query should succeed");
        let row = rows.first().expect("the runtime DB must contain trendlogs");
        let serial = row.try_get::<i32>("", "SerialNumber").unwrap() as i64;
        let expected = row.try_get::<i32>("", "n").unwrap() as usize;

        let result = common::execute_tool_json(
            "t3000_trendlog_list",
            &json!({"serial_number": serial}),
            &db,
        )
        .await
        .expect("should succeed");

        let trendlogs = result["trendlogs"].as_array().cloned().unwrap_or_default();
        assert_eq!(trendlogs.len(), expected,
            "device {} has {} trendlogs in the DB", serial, expected);
        assert_eq!(common::get_i64(&result, "total").unwrap_or(-1) as usize, expected,
            "total must match the row count");

        let ids: Vec<&str> = trendlogs.iter().filter_map(|t| common::get_str(t, "trendlog_id")).collect();
        assert!(ids.iter().all(|id| !id.is_empty()), "every trendlog needs an id: {:?}", ids);
        for id in &ids {
            let sql = format!(
                "SELECT COUNT(*) AS n FROM TRENDLOGS WHERE SerialNumber = {} AND Trendlog_ID = '{}'",
                serial, id.replace('\'', "''")
            );
            let check = db.query_all(Statement::from_string(sea_orm::DatabaseBackend::Sqlite, &sql))
                .await.expect("check query");
            assert_eq!(check[0].try_get::<i32>("", "n").unwrap_or(0), 1,
                "trendlog id '{}' must exist in the DB", id);
        }
    })
    .await;
}

// ═══ t3000_trendlog_query ═══

#[tokio::test]
async fn test_trendlog_query_returns_only_the_requested_point() {
    common::with_db_or_skip("trendlog_query_only_requested_point", |db| async move {
        let (serial, point_type, point_index) = pick_logged_point(&db)
            .await
            .expect("the runtime DB must contain trendlog history");

        let result = common::execute_tool_json(
            "t3000_trendlog_query",
            &json!({
                "serial_number": serial,
                "point_type": point_type,
                "point_index": point_index,
                "start": "2000-01-01T00:00:00Z",
                "limit": 50
            }),
            &db,
        )
        .await
        .expect("querying a logged point should succeed");

        let count = common::get_i64(&result, "count").unwrap_or(0);
        assert!(count > 0,
            "{} {} on device {} has recorded samples, so the query must return some ({})",
            point_type, point_index, serial, result);
        assert_eq!(result.get("filtering").and_then(|f| f.get("specific_points_applied"))
                       .and_then(|v| v.as_bool()),
            Some(true),
            "the requested point must be applied as a filter: {}", result);

        let data = result["data"].as_array().cloned().unwrap_or_default();
        for row in &data {
            assert_eq!(common::get_str(row, "point_type"), Some(point_type.as_str()),
                "query for one point returned another point type: {}", row);
            assert_eq!(row.get("point_index").and_then(|v| v.as_i64()), Some(point_index),
                "query for {} {} returned a different point index: {}", point_type, point_index, row);
        }
    })
    .await;
}

#[tokio::test]
async fn test_trendlog_query_on_an_unlogged_point_is_an_error() {
    common::with_db_or_skip("trendlog_query_unlogged", |db| async move {
        let serial = first_device_serial(&db).await;
        let err = common::execute_tool_json(
            "t3000_trendlog_query",
            &json!({
                "serial_number": serial,
                "point_type": "PIDLOOP",
                "point_index": 1,
                "start": "2000-01-01T00:00:00Z"
            }),
            &db,
        )
        .await
        .expect_err("a point with no trendlog used to be reported as a successful call");
        assert!(err.to_lowercase().contains("no trendlog"), "got: {}", err);
    })
    .await;
}

#[tokio::test]
async fn test_trendlog_query_rejects_zero_point_index() {
    common::with_db_or_skip("trendlog_query_zero_index", |db| async move {
        let serial = first_device_serial(&db).await;
        let err = common::execute_tool_json(
            "t3000_trendlog_query",
            &json!({
                "serial_number": serial,
                "point_type": "INPUT",
                "point_index": 0,
                "start": "2000-01-01T00:00:00Z"
            }),
            &db,
        )
        .await
        .expect_err("point_index is 1-based, so 0 must be rejected");
        assert!(err.contains("1-based"), "got: {}", err);
    })
    .await;
}

// ═══ t3000_trendlog_export ═══

#[tokio::test]
async fn test_trendlog_export_contains_rows() {
    common::with_db_or_skip("trendlog_export_contains_rows", |db| async move {
        let (serial, point_type, point_index) = pick_logged_point(&db)
            .await
            .expect("the runtime DB must contain trendlog history");

        // Which trendlog logs that point? (TRENDLOG_INPUTS is 0-based)
        let sql = format!(
            "SELECT Trendlog_ID FROM TRENDLOG_INPUTS
             WHERE SerialNumber = {} AND Point_Type = '{}' AND CAST(Point_Index AS INTEGER) = {}
             LIMIT 1",
            serial, point_type, point_index - 1
        );
        let rows = db.query_all(Statement::from_string(sea_orm::DatabaseBackend::Sqlite, &sql))
            .await.expect("trendlog_inputs query");
        let trendlog_id: String = match rows.first().and_then(|r| r.try_get::<String>("", "Trendlog_ID").ok()) {
            Some(id) => id,
            None => {
                println!("no trendlog logs {} {} on device {} — skipping", point_type, point_index, serial);
                return;
            }
        };

        let result = common::execute_tool_json(
            "t3000_trendlog_export",
            &json!({
                "serial_number": serial,
                "trendlog_id": trendlog_id,
                "start": "2000-01-01T00:00:00Z",
                "format": "csv",
                "limit": 100
            }),
            &db,
        )
        .await
        .expect("exporting a trendlog with history should succeed");

        let total_rows = common::get_i64(&result, "total_rows").unwrap_or(0);
        assert!(total_rows > 0,
            "trendlog '{}' on device {} has recorded samples but the export was empty ({})",
            trendlog_id, serial, result);

        let content = common::get_str(&result, "content").expect("csv content");
        let lines: Vec<&str> = content.lines().collect();
        assert!(lines[0].starts_with("timestamp,point_type,point_index"),
            "unexpected csv header: {}", lines[0]);
        assert_eq!(lines.len(), total_rows as usize + 1,
            "csv must carry one line per exported row");

        // The first data line used to be `,INPUT,1,IN1,,Deg.C,,` — the timestamp and
        // value columns were read from keys the history service does not emit.
        let first = lines[1];
        let fields: Vec<&str> = first.splitn(5, ',').collect();
        assert!(!fields[0].trim().is_empty(),
            "csv timestamp column must be populated: {:?}", first);
        assert!(!fields[4].trim_start_matches('"').trim().is_empty(),
            "csv value column must be populated: {:?}", first);
    })
    .await;
}

#[tokio::test]
async fn test_trendlog_export_json_reports_the_same_counts() {
    common::with_db_or_skip("trendlog_export_json_counts", |db| async move {
        let (serial, point_type, point_index) = pick_logged_point(&db)
            .await
            .expect("the runtime DB must contain trendlog history");

        let sql = format!(
            "SELECT Trendlog_ID FROM TRENDLOG_INPUTS
             WHERE SerialNumber = {} AND Point_Type = '{}' AND CAST(Point_Index AS INTEGER) = {}
             LIMIT 1",
            serial, point_type, point_index - 1
        );
        let rows = db.query_all(Statement::from_string(sea_orm::DatabaseBackend::Sqlite, &sql))
            .await.expect("trendlog_inputs query");
        let trendlog_id: String = match rows.first().and_then(|r| r.try_get::<String>("", "Trendlog_ID").ok()) {
            Some(id) => id,
            None => return,
        };

        let result = common::execute_tool_json(
            "t3000_trendlog_export",
            &json!({
                "serial_number": serial,
                "trendlog_id": trendlog_id,
                "start": "2000-01-01T00:00:00Z",
                "format": "json",
                "limit": 10
            }),
            &db,
        )
        .await
        .expect("json export should succeed");

        assert_eq!(common::get_str(&result, "format"), Some("json"));
        // The json branch must report the same counters as the csv branch.
        let total_rows = common::get_i64(&result, "total_rows")
            .expect("json export must report total_rows");
        assert!(total_rows > 0, "json export returned no rows: {}", result);
        let rows = result.get("data").and_then(|d| d.get("data"))
            .and_then(|d| d.as_array()).map(|a| a.len()).unwrap_or(0);
        assert_eq!(total_rows as usize, rows, "total_rows must match data.data");
        assert!(common::get_i64(&result, "total_points").unwrap_or(0) > 0);
    })
    .await;
}

#[tokio::test]
async fn test_trendlog_export_rejects_unknown_format() {
    common::with_db_or_skip("trendlog_export_unknown_format", |db| async move {
        let (serial, point_type, point_index) = pick_logged_point(&db)
            .await
            .expect("the runtime DB must contain trendlog history");
        let sql = format!(
            "SELECT Trendlog_ID FROM TRENDLOG_INPUTS
             WHERE SerialNumber = {} AND Point_Type = '{}' AND CAST(Point_Index AS INTEGER) = {}
             LIMIT 1",
            serial, point_type, point_index - 1
        );
        let rows = db.query_all(Statement::from_string(sea_orm::DatabaseBackend::Sqlite, &sql))
            .await.expect("trendlog_inputs query");
        let trendlog_id: String = match rows.first().and_then(|r| r.try_get::<String>("", "Trendlog_ID").ok()) {
            Some(id) => id,
            None => return,
        };

        let err = common::execute_tool_json(
            "t3000_trendlog_export",
            &json!({
                "serial_number": serial,
                "trendlog_id": trendlog_id,
                "start": "2000-01-01T00:00:00Z",
                "format": "xml"
            }),
            &db,
        )
        .await
        .expect_err("an unknown export format must be rejected instead of silently returning json");
        assert!(err.contains("csv") && err.contains("json"), "got: {}", err);
    })
    .await;
}

#[tokio::test]
async fn test_trendlog_export_unknown_trendlog_is_an_error() {
    common::with_db_or_skip("trendlog_export_unknown", |db| async move {
        let serial = first_device_serial(&db).await;
        let err = common::execute_tool_json(
            "t3000_trendlog_export",
            &json!({
                "serial_number": serial,
                "trendlog_id": "MCP_SUITE_NOPE",
                "start": "2000-01-01T00:00:00Z",
                "format": "csv"
            }),
            &db,
        )
        .await
        .expect_err("an unknown trendlog must be an error");
        assert!(err.contains("MCP_SUITE_NOPE"), "got: {}", err);
    })
    .await;
}
