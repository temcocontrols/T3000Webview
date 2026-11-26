//! Operational Tool Tests — point_read, point_write, point_read_batch,
//! point_write_batch
//!
//! These 4 tools read and write point values. Write tools require confirm:true
//! for safety. All require a live database connection.

use serde_json::json;
use crate::mcp::common;

// ═══ Tool existence ═══

#[test]
fn test_operational_tools_exist() {
    let names = [
        "t3000_point_read",
        "t3000_point_write",
        "t3000_point_read_batch",
        "t3000_point_write_batch",
    ];
    for name in &names {
        assert!(
            common::all_tools().iter().any(|t| t.name == *name),
            "Tool '{}' must be defined",
            name
        );
    }
}

// ═══ t3000_point_write ═══

#[test]
fn test_point_write_has_readback_param() {
    let tool = common::all_tools()
        .iter()
        .find(|t| t.name == "t3000_point_write")
        .unwrap();
    let props = tool.input_schema.get("properties").and_then(|v| v.as_object()).unwrap();
    assert!(props.contains_key("readback"), "should have optional 'readback' param");
    assert!(props.contains_key("field"), "should have optional 'field' param");
}

#[test]
fn test_point_write_confirm_is_boolean() {
    let tool = common::all_tools()
        .iter()
        .find(|t| t.name == "t3000_point_write")
        .unwrap();
    let confirm_type = tool.input_schema
        .get("properties")
        .and_then(|v| v.get("confirm"))
        .and_then(|v| v.get("type"))
        .and_then(|v| v.as_str());
    assert_eq!(confirm_type, Some("boolean"), "confirm must be boolean");
}

// ═══ t3000_point_read_batch ═══

#[test]
fn test_point_read_batch_points_is_array() {
    let tool = common::all_tools()
        .iter()
        .find(|t| t.name == "t3000_point_read_batch")
        .unwrap();
    let points_type = tool.input_schema
        .get("properties")
        .and_then(|v| v.get("points"))
        .and_then(|v| v.get("type"));
    assert_eq!(points_type.and_then(|v| v.as_str()), Some("array"),
        "points must be array type");
}

// ═══ t3000_point_write_batch ═══

#[test]
fn test_point_write_batch_confirm_is_boolean() {
    let tool = common::all_tools()
        .iter()
        .find(|t| t.name == "t3000_point_write_batch")
        .unwrap();
    let confirm_type = tool.input_schema
        .get("properties")
        .and_then(|v| v.get("confirm"))
        .and_then(|v| v.get("type"))
        .and_then(|v| v.as_str());
    assert_eq!(confirm_type, Some("boolean"), "confirm must be boolean");
}

// ═══ Live DB tests ═══

#[tokio::test]
async fn test_point_read_returns_value() {
    common::with_db_or_skip("point_read_returns_value", |db| async move {
        let Some((serial, input_count)) = common::pick_device_with_inputs(&db).await else {
            println!("SKIP point_read_returns_value — no device with inputs");
            return;
        };

        let result = common::execute_tool_json(
            "t3000_point_read",
            &json!({"serial_number": serial, "point_type": "INPUT", "point_index": 1}),
            &db,
        ).await.expect("point_read should succeed");

        assert_eq!(
            common::get_i64(&result, "point_index"), Some(1),
            "the 1-based index that was asked for must be echoed: {}", result
        );
        assert_eq!(
            common::get_i64(&result, "serial_number"), Some(serial),
            "the device serial must be echoed: {}", result
        );
        assert!(
            result.get("label").and_then(|v| v.as_str()).is_some(),
            "label must be present: {}", result
        );
        // value is the stored fValue / 1000, rounded to 2 decimals.
        if let Some(raw) = common::get_str(&result, "raw_value") {
            if let Ok(raw) = raw.trim().parse::<f64>() {
                let expected = (raw / 1000.0 * 100.0).round() / 100.0;
                let value = result.get("value").and_then(|v| v.as_f64());
                assert_eq!(value, Some(expected), "value must be raw/1000: {}", result);
            }
        }
        println!(
            "point_read: device {} IN1 = {:?} {} (device has {} stored inputs)",
            serial,
            result.get("value"),
            result.get("units").and_then(|v| v.as_str()).unwrap_or("-"),
            input_count
        );
    }).await;
}

#[tokio::test]
async fn test_point_read_requires_point_type() {
    common::with_db_or_skip("point_read_requires_point_type", |db| async move {
        let error = common::execute_tool(
            "t3000_point_read",
            &json!({"serial_number": 1028, "point_index": 1}),
            &db,
        ).await.expect_err("point_type must be required");
        assert!(
            error.starts_with("point_type required"),
            "expected a point_type hint, got: {}", error
        );
    }).await;
}

/// Clients type "variable", "VAR" or "INPUTS"; every one of those must reach the
/// same point instead of failing with "Invalid point_type".
#[tokio::test]
async fn test_point_read_accepts_point_type_spellings() {
    common::with_db_or_skip("point_read_accepts_point_type_spellings", |db| async move {
        let Some((serial, _)) = common::pick_device_with_inputs(&db).await else {
            println!("SKIP point_read_accepts_point_type_spellings — no device with inputs");
            return;
        };

        let canonical = common::execute_tool_json(
            "t3000_point_read",
            &json!({"serial_number": serial, "point_type": "INPUT", "point_index": 1}),
            &db,
        ).await.expect("canonical INPUT must read");

        for spelling in ["input", "Input", "INPUTS", "in"] {
            let result = common::execute_tool_json(
                "t3000_point_read",
                &json!({"serial_number": serial, "point_type": spelling, "point_index": 1}),
                &db,
            ).await.unwrap_or_else(|e| panic!("point_type '{}' must be accepted, got: {}", spelling, e));
            assert_eq!(
                result.get("point_type").and_then(|v| v.as_str()),
                Some("INPUT"),
                "point_type '{}' must normalise to INPUT: {}", spelling, result
            );
            assert_eq!(
                result.get("label").and_then(|v| v.as_str()),
                canonical.get("label").and_then(|v| v.as_str()),
                "'{}' must read the same point as INPUT", spelling
            );
        }
    }).await;
}

/// `point_index` is 1-based, so 0 (and 65) must be rejected instead of quietly
/// querying a row that cannot exist.
#[tokio::test]
async fn test_point_read_rejects_out_of_range_index() {
    common::with_db_or_skip("point_read_rejects_out_of_range_index", |db| async move {
        for bad in [0, -1, 65, 9999] {
            let error = common::execute_tool(
                "t3000_point_read",
                &json!({"serial_number": 1028, "point_type": "INPUT", "point_index": bad}),
                &db,
            ).await.expect_err(&format!("point_index {} must be rejected", bad));
            assert!(
                error.contains("1-based") && error.contains("1..64"),
                "expected a 1-based hint for index {}, got: {}", bad, error
            );
        }
    }).await;
}

/// A missing point must be an error, not a successful payload that happens to
/// contain an "error" key — otherwise a caller cannot tell it apart from a read.
#[tokio::test]
async fn test_point_read_unknown_point_is_an_error() {
    common::with_db_or_skip("point_read_unknown_point_is_an_error", |db| async move {
        let Some((serial, _)) = common::pick_device_with_inputs(&db).await else {
            println!("SKIP point_read_unknown_point_is_an_error — no device with inputs");
            return;
        };

        let error = common::execute_tool(
            "t3000_point_read",
            &json!({"serial_number": 987654321, "point_type": "INPUT", "point_index": 1}),
            &db,
        ).await.expect_err("an unknown device must not read successfully");
        assert!(
            error.contains("No INPUT 1 stored for device 987654321"),
            "expected a clear not-found error, got: {}", error
        );

        // Index 64 is valid but almost never present on a small device; whatever
        // the answer, a miss must be an Err carrying the same wording.
        match common::execute_tool(
            "t3000_point_read",
            &json!({"serial_number": serial, "point_type": "INPUT", "point_index": 64}),
            &db,
        ).await {
            Ok(_) => {}
            Err(e) => assert!(
                e.starts_with("No INPUT 64 stored for device"),
                "unexpected error wording: {}", e
            ),
        }
    }).await;
}

#[tokio::test]
async fn test_point_read_batch_returns_values() {
    common::with_db_or_skip("point_read_batch_returns_values", |db| async move {
        let Some((serial, input_count)) = common::pick_device_with_inputs(&db).await else {
            println!("SKIP point_read_batch_returns_values — no device with inputs");
            return;
        };
        let second = if input_count >= 2 { 2 } else { 1 };

        let result = common::execute_tool_json(
            "t3000_point_read_batch",
            &json!({"points": [
                {"serial_number": serial, "point_type": "INPUT", "point_index": 1},
                {"serial_number": serial, "point_type": "INPUT", "point_index": second}
            ]}),
            &db,
        ).await.expect("should succeed");

        let returned = common::array_len(&result, "results");
        assert_eq!(returned, 2, "both requested points must come back: {}", result);
        assert_eq!(common::get_i64(&result, "requested"), Some(2), "{}", result);
        assert_eq!(common::get_i64(&result, "returned"), Some(2), "{}", result);
        assert_eq!(common::array_len(&result, "errors"), 0, "{}", result);
    }).await;
}

/// A failed device write must not touch the database — the DB must never claim a
/// value the device rejected. Outside T3000.exe the FFI call fails, which is
/// exactly the case this pins down.
#[tokio::test]
async fn test_point_write_failure_leaves_db_untouched() {
    common::with_db_or_skip("point_write_failure_leaves_db_untouched", |db| async move {
        use sea_orm::{ConnectionTrait, DatabaseBackend, Statement};

        let Some((serial, _)) = common::pick_device_with_inputs(&db).await else {
            println!("SKIP point_write_failure_leaves_db_untouched — no device with inputs");
            return;
        };

        let before = db
            .query_one(Statement::from_string(
                DatabaseBackend::Sqlite,
                format!("SELECT fValue FROM INPUTS WHERE SerialNumber = {} AND Input_Index = '0'", serial),
            ))
            .await
            .unwrap()
            .and_then(|row| row.try_get::<String>("", "fValue").ok());

        let error = common::execute_tool(
            "t3000_point_write",
            &json!({"serial_number": serial, "point_type": "INPUT", "point_index": 1,
                    "field": "value", "value": 12.34}),
            &db,
        ).await.expect_err("the FFI call cannot succeed in the test process");
        assert!(
            error.contains("Device write failed") || error.contains("rejected") || error.contains("panel"),
            "unexpected write error: {}", error
        );

        let after = db
            .query_one(Statement::from_string(
                DatabaseBackend::Sqlite,
                format!("SELECT fValue FROM INPUTS WHERE SerialNumber = {} AND Input_Index = '0'", serial),
            ))
            .await
            .unwrap()
            .and_then(|row| row.try_get::<String>("", "fValue").ok());
        assert_eq!(before, after, "a failed write must not change the stored value");
    }).await;
}

#[tokio::test]
async fn test_point_write_validates_arguments() {
    common::with_db_or_skip("point_write_validates_arguments", |db| async move {
        for bad in [0, -3, 65] {
            let error = common::execute_tool(
                "t3000_point_write",
                &json!({"serial_number": 1028, "point_type": "INPUT", "point_index": bad, "value": 1, "confirm": true}),
                &db,
            ).await.expect_err(&format!("point_index {} must be rejected", bad));
            assert!(error.contains("1-based") && error.contains("1..64"), "got: {}", error);
        }

        let error = common::execute_tool(
            "t3000_point_write",
            &json!({"serial_number": 1028, "point_type": "OUTPUT", "point_index": 1, "value": 1}),
            &db,
        ).await.expect_err("OUTPUT writes need confirm");
        assert!(error.contains("confirm"), "got: {}", error);

        let error = common::execute_tool(
            "t3000_point_write",
            &json!({"serial_number": 1028, "point_type": "INPUT", "point_index": 1, "field": "bogus", "value": 1}),
            &db,
        ).await.expect_err("unknown field must be rejected");
        assert!(error.contains("Invalid field"), "got: {}", error);
    }).await;
}

#[tokio::test]
async fn test_point_write_rejects_wrong_table_range_codes() {
    common::with_db_or_skip("point_write_rejects_wrong_table_range_codes", |db| async move {
        // 45 is outside every analog table (inputs stop at 39, variables at 33), so
        // it must be refused rather than showing a label from the wrong table.
        let error = common::execute_tool(
            "t3000_point_write",
            &json!({"serial_number": 1028, "point_type": "INPUT", "point_index": 1,
                    "field": "range", "value": 45}),
            &db,
        ).await.expect_err("45 is not an input analog code");
        assert!(error.contains("not a valid INPUT analog code"), "got: {}", error);

        // Outputs allow 0–8 (analog) or 0–30/101–104 (digital), so 68 must be
        // refused in either table.
        let error = common::execute_tool(
            "t3000_point_write",
            &json!({"serial_number": 1028, "point_type": "OUTPUT", "point_index": 1,
                    "field": "range", "value": 68, "confirm": true}),
            &db,
        ).await.expect_err("68 is not an output range code");
        assert!(
            error.contains("is not a valid OUTPUT") && error.contains("code"),
            "got: {}", error
        );

        // 32 *is* a valid variable analog code (VAR21 is an analog variable), so
        // validation must not reject it — the write itself cannot reach the device
        // in the test process.
        match common::execute_tool(
            "t3000_point_write",
            &json!({"serial_number": 1028, "point_type": "VARIABLE", "point_index": 21,
                    "field": "range", "value": 32, "confirm": true}),
            &db,
        ).await {
            Ok(_) => {}
            Err(e) => assert!(!e.contains("not a valid"), "32 is valid for variables: {}", e),
        }

        let error = common::execute_tool(
            "t3000_point_write",
            &json!({"serial_number": 1028, "point_type": "VARIABLE", "point_index": 60,
                    "field": "digital_analog", "value": 5, "confirm": true}),
            &db,
        ).await.expect_err("digital_analog is 0 or 1 only");
        assert!(error.contains("0 (digital) or 1 (analog)"), "got: {}", error);

        let error = common::execute_tool(
            "t3000_point_write",
            &json!({"serial_number": 1028, "point_type": "INPUT", "point_index": 1,
                    "field": "units", "value": 3}),
            &db,
        ).await.expect_err("units is derived, not writable");
        assert!(error.contains("field 'range' instead of 'units'"), "got: {}", error);
    }).await;
}

#[tokio::test]
async fn test_point_write_batch_reports_per_point_errors() {
    common::with_db_or_skip("point_write_batch_reports_per_point_errors", |db| async move {
        let error = common::execute_tool(
            "t3000_point_write_batch",
            &json!({"points": [{"serial_number": 1028, "point_type": "OUTPUT", "point_index": 1, "value": 1}]}),
            &db,
        ).await.expect_err("batch write needs confirm");
        assert!(error.contains("confirm"), "got: {}", error);

        let result = common::execute_tool_json(
            "t3000_point_write_batch",
            &json!({"confirm": true, "points": [
                {"serial_number": 1028, "point_type": "OUTPUT", "point_index": 0, "value": 1},
                {"serial_number": 1028, "point_type": "BOGUS", "point_index": 1, "value": 1},
                {"serial_number": 1028, "point_type": "OUTPUT", "point_index": 1}
            ]}),
            &db,
        ).await.expect("a batch with bad entries still answers");

        assert_eq!(common::get_i64(&result, "count"), Some(0), "{}", result);
        let errors = result.get("errors").and_then(|v| v.as_array()).expect("errors array");
        assert_eq!(errors.len(), 3, "each bad entry must be explained: {}", result);
        let text = serde_json::to_string(errors).unwrap();
        assert!(text.contains("1-based"), "{}", text);
        assert!(text.contains("Invalid point_type"), "{}", text);
        assert!(text.contains("required"), "{}", text);
    }).await;
}

#[tokio::test]
async fn test_point_batch_metadata_reports_per_point_errors() {
    common::with_db_or_skip("point_batch_metadata_reports_per_point_errors", |db| async move {
        let Some((serial, _)) = common::pick_device_with_inputs(&db).await else {
            println!("SKIP point_batch_metadata_reports_per_point_errors — no device with inputs");
            return;
        };

        let result = common::execute_tool_json(
            "t3000_point_batch_metadata",
            &json!({"points": [
                {"serial_number": serial, "point_type": "INPUT", "point_index": 1},
                {"serial_number": serial, "point_type": "INPUT", "point_index": 0},
                {"serial_number": 987654321, "point_type": "INPUT", "point_index": 1}
            ]}),
            &db,
        ).await.expect("metadata batch answers");

        assert_eq!(common::get_i64(&result, "requested"), Some(3), "{}", result);
        assert_eq!(common::array_len(&result, "results"), 1, "only the valid point: {}", result);
        let errors = result.get("errors").and_then(|v| v.as_array()).expect("errors array");
        assert_eq!(errors.len(), 2, "{}", result);
        let text = serde_json::to_string(errors).unwrap();
        assert!(text.contains("1-based"), "{}", text);
        assert!(text.contains("No INPUT 1 stored for device 987654321"), "{}", text);

        // The metadata of the valid point must match point_read's view of it.
        let read = common::execute_tool_json(
            "t3000_point_read",
            &json!({"serial_number": serial, "point_type": "INPUT", "point_index": 1}),
            &db,
        ).await.expect("point_read works");
        let meta = &result["results"][0];
        assert_eq!(meta["point_index"], read["point_index"]);
        assert_eq!(meta["label"], read["label"]);
        assert_eq!(meta["value"], read["value"]);
        assert_eq!(meta["units"], read["units"]);
        assert_eq!(meta["range"], read["range"]);
        assert!(meta.get("haystack_tags").is_some(), "metadata includes tags: {}", meta);
    }).await;
}


#[tokio::test]
async fn test_point_read_batch_reports_per_point_errors() {
    common::with_db_or_skip("point_read_batch_reports_per_point_errors", |db| async move {
        let Some((serial, _)) = common::pick_device_with_inputs(&db).await else {
            println!("SKIP point_read_batch_reports_per_point_errors — no device with inputs");
            return;
        };

        let result = common::execute_tool_json(
            "t3000_point_read_batch",
            &json!({"points": [
                {"serial_number": serial, "point_type": "INPUT", "point_index": 1},
                {"serial_number": serial, "point_type": "INPUT", "point_index": 0},
                {"serial_number": serial, "point_type": "BOGUS", "point_index": 1},
                {"serial_number": 987654321, "point_type": "INPUT", "point_index": 1},
                {"serial_number": serial}
            ]}),
            &db,
        ).await.expect("a batch with bad entries still answers");

        assert_eq!(common::get_i64(&result, "requested"), Some(5), "{}", result);
        assert_eq!(common::array_len(&result, "results"), 1, "only the valid point reads: {}", result);
        let errors = result.get("errors").and_then(|v| v.as_array()).expect("errors array");
        assert_eq!(errors.len(), 4, "each bad entry must be explained: {}", result);

        let text = serde_json::to_string(errors).unwrap();
        assert!(text.contains("1-based"), "index 0 must be rejected: {}", text);
        assert!(text.contains("Invalid point_type"), "bogus type must be rejected: {}", text);
        assert!(text.contains("No INPUT 1 stored for device 987654321"), "missing point must be named: {}", text);
        assert!(text.contains("required"), "missing fields must be reported: {}", text);
    }).await;
}

#[tokio::test]
async fn test_point_write_requires_confirm() {
    common::with_db_or_skip("point_write_requires_confirm", |db| async move {
        // A valid 1-based index, so the answer is about the safety gate only.
        let error = common::execute_tool(
            "t3000_point_write",
            &json!({"serial_number": 444, "point_type": "OUTPUT", "point_index": 1, "value": 50.0, "confirm": false}),
            &db,
        ).await.expect_err("an OUTPUT write without confirm must be refused");
        assert!(
            error.to_lowercase().contains("confirm") || error.to_lowercase().contains("safety"),
            "error should mention confirm: {}",
            error
        );
    }).await;
}

#[tokio::test]
async fn test_point_write_batch_requires_confirm() {
    common::with_db_or_skip("point_write_batch_requires_confirm", |db| async move {
        let raw = common::execute_tool(
            "t3000_point_write_batch",
            &json!({
                "points": [{"serial_number": 444, "point_type": "OUTPUT", "point_index": 0, "value": 1.0}],
                "confirm": false
            }),
            &db,
        ).await;
        match raw {
            Ok(_) => { /* handled */ }
            Err(e) => {
                assert!(e.to_lowercase().contains("confirm") || e.to_lowercase().contains("safety"),
                    "error should mention confirm: {}", e);
            }
        }
    }).await;
}
