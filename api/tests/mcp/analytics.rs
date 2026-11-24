//! Analytics Tool Tests — haystack_validate, haystack_export
//!
//! These 2 tools validate semantic tagging and export semantic models.
//! The live tests pick a device that actually has tags in the runtime DB, so a
//! green run means real rows came back — not an empty document.

use sea_orm::{ConnectionTrait, DatabaseConnection, Statement};
use serde_json::json;
use crate::mcp::common;

// ═══ Tool existence ═══

#[test]
fn test_analytics_tools_exist() {
    assert!(common::all_tools().iter().any(|t| t.name == "t3000_haystack_validate"));
    assert!(common::all_tools().iter().any(|t| t.name == "t3000_haystack_export"));
}

// ═══ t3000_haystack_validate ═══

#[test]
fn test_haystack_validate_no_required_params() {
    let tool = common::all_tools()
        .iter()
        .find(|t| t.name == "t3000_haystack_validate")
        .unwrap();
    let required = tool.input_schema.get("required");
    assert!(required.is_none() || required.unwrap().as_array().map_or(true, |a| a.is_empty()),
        "validate should have no required params — serial_numbers is optional");
}

#[test]
fn test_haystack_validate_has_optional_serials() {
    let tool = common::all_tools()
        .iter()
        .find(|t| t.name == "t3000_haystack_validate")
        .unwrap();
    let props = tool.input_schema.get("properties").and_then(|v| v.as_object()).unwrap();
    assert!(props.contains_key("serial_numbers"),
        "should have optional 'serial_numbers' — omit to validate all devices");
}

// ═══ t3000_haystack_export ═══

#[test]
fn test_haystack_export_format_property() {
    let tool = common::all_tools()
        .iter()
        .find(|t| t.name == "t3000_haystack_export")
        .unwrap();
    let format_desc = tool.input_schema
        .get("properties")
        .and_then(|v| v.get("format"))
        .and_then(|v| v.get("description"))
        .and_then(|v| v.as_str());
    assert!(format_desc.is_some());
    // format description should mention the 4 supported formats
    let desc = format_desc.unwrap().to_lowercase();
    assert!(desc.contains("haystack-json") || desc.contains("brick"),
        "format description should mention supported formats");
}

// ═══ DB helpers ═══

/// Serial number with the most tagged points — guarantees the tests see data.
async fn pick_tagged_serial(db: &DatabaseConnection) -> Option<i64> {
    let rows = db
        .query_all(Statement::from_string(
            sea_orm::DatabaseBackend::Sqlite,
            "SELECT serial_number, COUNT(*) AS n FROM HAYSTACK_POINT_TAGS
             GROUP BY serial_number ORDER BY n DESC LIMIT 1",
        ))
        .await
        .ok()?;
    rows.first()
        .and_then(|r| r.try_get::<i32>("", "serial_number").ok())
        .map(|s| s as i64)
}

/// Every `point_id` in the errors/warnings arrays.
fn point_ids(result: &serde_json::Value) -> Vec<String> {
    let mut ids = Vec::new();
    for key in ["errors", "warnings"] {
        if let Some(items) = result.get(key).and_then(|v| v.as_array()) {
            for item in items {
                if let Some(id) = item.get("point_id").and_then(|v| v.as_str()) {
                    ids.push(id.to_string());
                }
            }
        }
    }
    ids
}

// ═══ Live DB tests ═══

#[tokio::test]
async fn test_haystack_validate_returns_results() {
    common::with_db_or_skip("haystack_validate_returns_results", |db| async move {
        let result = common::execute_tool_json("t3000_haystack_validate", &json!({}), &db)
            .await
            .expect("validate should succeed");

        assert!(result.get("passed").and_then(|v| v.as_bool()).is_some(),
            "validate must report a boolean 'passed', got {}", result);
        // The counts must describe the arrays, not be hard-coded zeroes.
        assert_eq!(common::array_len(&result, "errors"),
            common::get_i64(&result, "error_count").unwrap_or(-1) as usize,
            "error_count must match the errors array");
        assert_eq!(common::array_len(&result, "warnings"),
            common::get_i64(&result, "warning_count").unwrap_or(-1) as usize,
            "warning_count must match the warnings array");

        let passed = result.get("passed").and_then(|v| v.as_bool()).unwrap();
        let errors = common::array_len(&result, "errors");
        assert_eq!(passed, errors == 0,
            "passed must be true only when there are no errors (errors={})", errors);
    })
    .await;
}

/// Regression: the 'air' rule ignored `serial_numbers`, so validating one device
/// reported warnings from every other device.
#[tokio::test]
async fn test_haystack_validate_serial_filter_only_reports_that_device() {
    common::with_db_or_skip("haystack_validate_serial_filter", |db| async move {
        let unfiltered = common::execute_tool_json("t3000_haystack_validate", &json!({}), &db)
            .await
            .expect("validate should succeed");

        // Which devices does the unfiltered run mention?
        let mut devices: Vec<i64> = point_ids(&unfiltered)
            .iter()
            .filter_map(|id| {
                id.trim_start_matches("dev")
                    .split('.')
                    .next()
                    .and_then(|s| s.parse::<i64>().ok())
            })
            .collect();
        devices.sort_unstable();
        devices.dedup();

        if devices.len() < 2 {
            println!("only one device is tagged in this DB — filter check is trivial");
            return;
        }

        let target = devices[0];
        let other = devices[1];
        let filtered = common::execute_tool_json(
            "t3000_haystack_validate",
            &json!({"serial_numbers": [target]}),
            &db,
        )
        .await
        .expect("filtered validate should succeed");

        let ids = point_ids(&filtered);
        assert!(
            ids.iter().all(|id| id.starts_with(&format!("dev{}.", target))),
            "serial filter leaked points from another device: {:?}",
            ids
        );
        assert!(
            !ids.iter().any(|id| id.starts_with(&format!("dev{}.", other))),
            "device {} must not appear when validating device {}: {:?}",
            other, target, ids
        );
    })
    .await;
}

#[tokio::test]
async fn test_haystack_export_json_format() {
    common::with_db_or_skip("haystack_export_json_format", |db| async move {
        let serial = pick_tagged_serial(&db).await.expect("a tagged device is needed");
        let raw = common::execute_tool(
            "t3000_haystack_export",
            &json!({"serial_numbers": [serial], "format": "haystack-json"}),
            &db,
        )
        .await
        .expect("export should succeed");

        let parsed: serde_json::Value = serde_json::from_str(&raw)
            .expect("haystack-json export must be valid JSON");
        let total = common::get_i64(&parsed, "total").unwrap_or(0);
        assert!(total > 0, "device {} is tagged, so the export must not be empty", serial);
        assert_eq!(common::array_len(&parsed, "rows") as i64, total,
            "total must match the rows array");

        let first = &parsed["rows"][0];
        assert!(first.get("id").and_then(|v| v.as_str()).is_some(), "rows need an id");
        assert!(first.get("tags").and_then(|v| v.as_object()).is_some(), "rows need tags");
        let id = first["id"].as_str().unwrap();
        assert!(id.starts_with(&format!("dev{}.", serial)),
            "entity id '{}' should be qualified with the device serial {}", id, serial);
    })
    .await;
}

#[tokio::test]
async fn test_haystack_export_csv_flat_format() {
    common::with_db_or_skip("haystack_export_csv_flat_format", |db| async move {
        let serial = pick_tagged_serial(&db).await.expect("a tagged device is needed");
        let parsed = common::execute_tool_json(
            "t3000_haystack_export",
            &json!({"serial_numbers": [serial], "format": "csv-flat"}),
            &db,
        )
        .await
        .expect("export should succeed");

        let content = common::get_str(&parsed, "content").expect("csv-flat returns content");
        let header = content.lines().next().unwrap_or_default();
        for column in ["serial_number", "point_type", "point_index", "value", "units", "range", "tags"] {
            assert!(header.contains(column), "csv header is missing '{}': {}", column, header);
        }

        let total = common::get_i64(&parsed, "total").unwrap_or(0);
        assert!(total > 0, "device {} has points, so the CSV must have rows", serial);
        // header + one line per point
        assert_eq!(content.lines().count() as i64, total + 1,
            "csv row count must match 'total'");

        // Values must be in engineering units for every point type (fValue is x1000).
        let rows = db
            .query_all(Statement::from_string(
                sea_orm::DatabaseBackend::Sqlite,
                format!(
                    "SELECT Variable_Index AS idx, fValue FROM VARIABLES
                     WHERE SerialNumber = {} AND CAST(fValue AS REAL) <> 0 LIMIT 1",
                    serial
                ),
            ))
            .await
            .expect("query should succeed");
        if let Some(row) = rows.first() {
            let idx: String = row.try_get("", "idx").unwrap_or_default();
            let fvalue: String = row.try_get("", "fValue").unwrap_or_default();
            let raw: f64 = fvalue.parse().unwrap_or(0.0);
            let expected = format!(",{:.3},", raw / 1000.0);
            let line = content
                .lines()
                .find(|l| l.starts_with(&format!("{},VARIABLE,{},", serial, idx)))
                .unwrap_or("<no row>");
            assert!(
                content.contains(&expected),
                "VARIABLE index {} raw value {} should appear as {} — variables are not \
                 being scaled like inputs. Line: {:?}",
                idx, fvalue, expected.trim_matches(','), line
            );
        }
    })
    .await;
}

#[tokio::test]
async fn test_haystack_export_brick_formats_report_missing_classes() {
    common::with_db_or_skip("haystack_export_brick_formats", |db| async move {
        let serial = pick_tagged_serial(&db).await.expect("a tagged device is needed");

        for format in ["brick-ttl", "brick-jsonld"] {
            let parsed = common::execute_tool_json(
                "t3000_haystack_export",
                &json!({"serial_numbers": [serial], "format": format}),
                &db,
            )
            .await
            .unwrap_or_else(|e| panic!("{} export should succeed: {}", format, e));

            assert_eq!(common::get_str(&parsed, "format"), Some(format));
            // The device is tagged, so an empty body must come with an explanation
            // instead of looking like "this device has nothing".
            if common::get_i64(&parsed, "entity_count").unwrap_or(-1) == 0 {
                let warning = common::get_str(&parsed, "warning").unwrap_or_default();
                assert!(
                    warning.to_lowercase().contains("brick class"),
                    "{} returned no entities but no warning: {}",
                    format, parsed
                );
            }
        }
    })
    .await;
}

#[tokio::test]
async fn test_haystack_export_rejects_missing_and_unknown_serials() {
    common::with_db_or_skip("haystack_export_rejects_bad_serials", |db| async move {
        let err = common::execute_tool_json(
            "t3000_haystack_export",
            &json!({"serial_numbers": [], "format": "haystack-json"}),
            &db,
        )
        .await
        .expect_err("an empty serial list must be an error, not an empty document");
        assert!(err.to_lowercase().contains("serial_numbers"), "got: {}", err);

        let err = common::execute_tool_json(
            "t3000_haystack_export",
            &json!({"serial_numbers": [987654], "format": "csv-flat"}),
            &db,
        )
        .await
        .expect_err("an unknown serial must be an error, not an empty document");
        assert!(err.contains("987654"), "the error should name the serial: {}", err);
        assert!(err.to_lowercase().contains("unknown"), "got: {}", err);
    })
    .await;
}

#[tokio::test]
async fn test_haystack_export_rejects_unknown_format() {
    common::with_db_or_skip("haystack_export_unknown_format", |db| async move {
        let serial = pick_tagged_serial(&db).await.expect("a tagged device is needed");
        let err = common::execute_tool_json(
            "t3000_haystack_export",
            &json!({"serial_numbers": [serial], "format": "yaml"}),
            &db,
        )
        .await
        .expect_err("unknown formats must be rejected");
        assert!(err.contains("haystack-json") && err.contains("csv-flat"), "got: {}", err);
    })
    .await;
}
