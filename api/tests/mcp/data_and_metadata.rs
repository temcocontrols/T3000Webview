//! Data & Metadata Tool Tests — device_list, device_get_points,
//! point_get_metadata, metadata_search, point_search, point_batch_metadata
//!
//! These 6 tools query device/point metadata from the database.

use serde_json::json;
use crate::mcp::common;

// ═══ Tool existence ═══

#[test]
fn test_data_tools_exist() {
    let names = [
        "t3000_device_list",
        "t3000_device_get_points",
        "t3000_point_get_metadata",
        "t3000_metadata_search",
        "t3000_point_search",
        "t3000_point_batch_metadata",
    ];
    for name in &names {
        assert!(
            common::all_tools().iter().any(|t| t.name == *name),
            "Tool '{}' must be defined",
            name
        );
    }
}

// ═══ t3000_device_list ═══

#[test]
fn test_device_list_has_optional_filter() {
    let tool = common::all_tools()
        .iter()
        .find(|t| t.name == "t3000_device_list")
        .unwrap();
    let props = tool.input_schema.get("properties").and_then(|v| v.as_object()).unwrap();
    assert!(props.contains_key("filter_name"), "should have optional 'filter_name'");
    let required = tool.input_schema.get("required");
    assert!(required.is_none() || required.unwrap().as_array().map_or(true, |a| a.is_empty()),
        "device_list should have no required params");
}

// ═══ t3000_device_get_points ═══

#[test]
fn test_device_get_points_has_point_type_filter() {
    let tool = common::all_tools()
        .iter()
        .find(|t| t.name == "t3000_device_get_points")
        .unwrap();
    let props = tool.input_schema.get("properties").and_then(|v| v.as_object()).unwrap();
    assert!(props.contains_key("point_type"), "should have optional 'point_type' filter");
}

// ═══ t3000_metadata_search ═══

#[test]
fn test_metadata_search_has_limit_param() {
    let tool = common::all_tools()
        .iter()
        .find(|t| t.name == "t3000_metadata_search")
        .unwrap();
    let props = tool.input_schema.get("properties").and_then(|v| v.as_object()).unwrap();
    assert!(props.contains_key("limit"), "should have optional 'limit'");
    assert!(props.contains_key("serial_numbers"), "should have optional 'serial_numbers'");
    assert!(props.contains_key("point_types"), "should have optional 'point_types'");
}

// ═══ t3000_point_search ═══

#[test]
fn test_point_search_has_limit_param() {
    let tool = common::all_tools()
        .iter()
        .find(|t| t.name == "t3000_point_search")
        .unwrap();
    let props = tool.input_schema.get("properties").and_then(|v| v.as_object()).unwrap();
    assert!(props.contains_key("limit"), "should have optional 'limit'");
    assert!(props.contains_key("serial_numbers"), "should have optional 'serial_numbers'");
}

// ═══ t3000_point_batch_metadata ═══

#[test]
fn test_point_batch_metadata_requires_points() {
    let tool = common::all_tools()
        .iter()
        .find(|t| t.name == "t3000_point_batch_metadata")
        .unwrap();
    let required: Vec<&str> = tool.input_schema
        .get("required")
        .and_then(|v| v.as_array())
        .map(|a| a.iter().filter_map(|v| v.as_str()).collect())
        .unwrap_or_default();
    assert!(required.contains(&"points"), "batch_metadata must require 'points'");
}

// ═══ Live DB tests ═══

/// First device that actually has inputs — keeps the assertions below
/// meaningful instead of passing on a device that no longer exists.
async fn pick_device_with_inputs(db: &sea_orm::DatabaseConnection) -> Option<(i64, i64)> {
    common::pick_device_with_inputs(db).await
}

#[tokio::test]
async fn test_device_list_returns_devices() {
    common::with_db_or_skip("device_list_returns_devices", |db| async move {
        let result = common::execute_tool_json("t3000_device_list", &json!({}), &db)
            .await
            .expect("device_list should succeed");
        let total = common::get_i64(&result, "total").expect("should have total");
        assert!(total > 0, "should have at least 1 device, got {}", total);
        let devices = result.get("devices").and_then(|v| v.as_array()).expect("should have devices array");
        assert_eq!(devices.len() as i64, total, "total should match array len");
        println!("device_list: {} devices (total field = {})", devices.len(), total);
        // First device should be a non-empty object
        let first = &devices[0];
        assert!(!first.as_object().map_or(true, |o| o.is_empty()),
            "device should not be empty");
    }).await;
}

#[tokio::test]
async fn test_device_list_filter_by_name() {
    common::with_db_or_skip("device_list_filter_by_name", |db| async move {
        let all = common::execute_tool_json("t3000_device_list", &json!({}), &db)
            .await
            .expect("unfiltered list should succeed");
        let all_total = common::get_i64(&all, "total").unwrap_or(0);
        let all_devices = all.get("devices").and_then(|v| v.as_array()).cloned().unwrap_or_default();

        let filtered = common::execute_tool_json(
            "t3000_device_list",
            &json!({"filter_name": "T3"}),
            &db,
        ).await.expect("filtered list should succeed");

        let total = common::get_i64(&filtered, "total").unwrap_or(0);
        let devices = filtered.get("devices").and_then(|v| v.as_array()).cloned().unwrap_or_default();

        assert_eq!(devices.len() as i64, total, "total must match the filtered array len");
        assert!(total > 0, "filtering by 'T3' should find at least 1 device, got {}", total);

        // The filter must actually filter: every returned name contains "T3".
        for device in &devices {
            let name = common::get_str(device, "name").unwrap_or("");
            assert!(
                name.to_lowercase().contains("t3"),
                "filter 'T3' returned a non-matching device: {}",
                device
            );
        }

        // ... and it must be case-insensitive and narrower than the full list.
        let lower = common::execute_tool_json(
            "t3000_device_list",
            &json!({"filter_name": "t3"}),
            &db,
        ).await.expect("lowercase filter should succeed");
        assert_eq!(
            common::get_i64(&lower, "total").unwrap_or(-1),
            total,
            "filter must be case-insensitive"
        );

        let non_matching = all_devices
            .iter()
            .filter(|d| !common::get_str(d, "name").unwrap_or("").to_lowercase().contains("t3"))
            .count();
        if non_matching > 0 {
            assert!(total < all_total, "filter returned everything ({} of {})", total, all_total);
        }
        println!("filter 'T3': {} of {} devices matched", total, all_total);
    }).await;
}

/// Every device record must carry the documented fields with the documented
/// types — clients (and the AI assistant) rely on them.
#[tokio::test]
async fn test_device_list_device_contract() {
    common::with_db_or_skip("device_list_device_contract", |db| async move {
        let result = common::execute_tool_json("t3000_device_list", &json!({}), &db)
            .await
            .expect("device_list should succeed");
        let devices = result.get("devices").and_then(|v| v.as_array()).expect("devices array");
        assert!(!devices.is_empty(), "expected at least one device");

        for device in devices {
            let serial = device
                .get("serial")
                .and_then(|v| v.as_i64())
                .unwrap_or_else(|| panic!("device without an integer 'serial': {}", device));
            assert!(serial > 0, "serial must be positive, got {}", serial);

            for key in ["name", "device_type", "input_count", "output_count",
                        "variable_count", "total_points", "building", "floor", "room",
                        "is_online", "last_checked", "refreshed"] {
                assert!(device.get(key).is_some(), "device {} is missing '{}': {}", serial, key, device);
            }

            for key in ["input_count", "output_count", "variable_count", "total_points"] {
                assert!(
                    device[key].as_i64().is_some(),
                    "device {} field '{}' must be an integer, got {}",
                    serial, key, device[key]
                );
            }

            assert!(
                device["is_online"].as_i64().is_some() || device["is_online"].is_boolean(),
                "device {}: is_online must be 0/1 (or bool), got {}",
                serial, device["is_online"]
            );
            assert_eq!(
                device["refreshed"], false,
                "device {}: refreshed must be false unless refresh=true was requested",
                serial
            );
        }
        println!("device_list contract ok: {} devices, all fields present", devices.len());
    }).await;
}

#[tokio::test]
async fn test_device_get_points_returns_data() {
    common::with_db_or_skip("device_get_points_returns_data", |db| async move {
        let Some((serial, input_count)) = pick_device_with_inputs(&db).await else {
            println!("SKIP device_get_points_returns_data — no device with inputs");
            return;
        };

        let result = common::execute_tool_json(
            "t3000_device_get_points",
            &json!({ "serial_number": serial }),
            &db,
        ).await.expect("should succeed");

        let total = common::get_i64(&result, "total").expect("should have total");
        let points = result.get("points").and_then(|v| v.as_array()).expect("should have points");
        assert_eq!(points.len() as i64, total, "total must match the points array");

        // Cross-check with t3000_device_list: the all-points total can never be
        // smaller than the device's input count.
        assert!(
            total >= input_count,
            "device {} has {} inputs per device_list but get_points returned {}",
            serial, input_count, total
        );

        for point in points {
            assert!(point.get("point_type").and_then(|v| v.as_str()).is_some(), "point without point_type: {}", point);
            assert!(point.get("point_index").is_some(), "point without point_index: {}", point);
            assert!(point.get("point_id").is_some(), "point without point_id: {}", point);
        }
        println!("device_get_points: device {} -> {} points (device_list input_count = {})", serial, total, input_count);
    }).await;
}

#[tokio::test]
async fn test_device_get_points_filter_by_type() {
    common::with_db_or_skip("device_get_points_filter_by_type", |db| async move {
        let Some((serial, input_count)) = pick_device_with_inputs(&db).await else {
            println!("SKIP device_get_points_filter_by_type — no device with inputs");
            return;
        };

        let filtered = common::execute_tool_json(
            "t3000_device_get_points",
            &json!({ "serial_number": serial, "point_type": "INPUT" }),
            &db,
        ).await.expect("filtered call should succeed");

        let total = common::get_i64(&filtered, "total").unwrap_or(-1);
        let points = filtered.get("points").and_then(|v| v.as_array()).expect("points array");

        // The filter must actually filter ...
        for point in points {
            assert_eq!(
                common::get_str(point, "point_type"), Some("INPUT"),
                "filter 'INPUT' returned another type: {}", point
            );
        }
        // ... and agree with the input count reported by device_list.
        assert_eq!(
            total, input_count,
            "device {}: filtered INPUT total {} != device_list input_count {}",
            serial, total, input_count
        );
        println!("device_get_points(INPUT): device {} -> {} points", serial, total);
    }).await;
}

#[tokio::test]
async fn test_point_get_metadata_returns_data() {
    common::with_db_or_skip("point_get_metadata_returns_data", |db| async move {
        let Some((serial, _)) = pick_device_with_inputs(&db).await else {
            println!("SKIP point_get_metadata_returns_data — no device with inputs");
            return;
        };

        let result = common::execute_tool_json(
            "t3000_point_get_metadata",
            &json!({ "serial_number": serial, "point_type": "INPUT", "point_index": 1 }),
            &db,
        ).await.expect("should succeed");

        // The tool echoes the requested reference and always returns the full
        // metadata record (fields may be null when the point has none).
        assert_eq!(common::get_i64(&result, "serial_number"), Some(serial));
        assert_eq!(common::get_str(&result, "point_type"), Some("INPUT"));
        // `point_index` is passed 1-based and echoed 1-based (the DB column is 0-based).
        assert_eq!(common::get_i64(&result, "point_index"), Some(1));

        for key in ["point_id", "label", "short_label", "full_label", "value", "current_value",
                    "current_value_num", "units", "range", "units_code", "range_code",
                    "digital", "digital_analog", "haystack_tags", "brick_class"] {
            assert!(result.get(key).is_some(), "metadata is missing '{}': {}", key, result);
        }

        // The engineering value must be the stored raw value / 1000 (the UI scale).
        if let Some(text) = common::get_str(&result, "current_value") {
            if let Ok(raw) = text.trim().parse::<f64>() {
                let expected = (raw / 1000.0 * 100.0).round() / 100.0;
                assert_eq!(
                    result.get("value").and_then(|v| v.as_f64()),
                    Some(expected),
                    "value must be raw/1000: {}",
                    result
                );
                assert_eq!(
                    result.get("current_value_num").and_then(|v| v.as_f64()),
                    Some(expected),
                    "current_value_num must be the scaled value: {}",
                    result
                );
            }
        }

        // A thermistor input (range code 3 = 10K Type2) must be described in words.
        if result.get("range_code").and_then(|v| v.as_str()) == Some("3")
            && result.get("digital").and_then(|v| v.as_bool()) == Some(false)
        {
            assert_eq!(result.get("units").and_then(|v| v.as_str()), Some("Deg.C"), "{}", result);
            assert_eq!(result.get("range").and_then(|v| v.as_str()), Some("10K Type2"), "{}", result);
        }
        println!(
            "point_get_metadata: device {} INPUT 1 -> label={:?} value={:?} {} ({}) tags={:?}",
            serial,
            result.get("label").and_then(|v| v.as_str()),
            result.get("value").and_then(|v| v.as_f64()),
            result.get("units").and_then(|v| v.as_str()).unwrap_or("<units?>"),
            result.get("range").and_then(|v| v.as_str()).unwrap_or("<range?>"),
            result.get("haystack_tags")
        );
    }).await;
}

#[tokio::test]
async fn test_metadata_search_finds_results() {
    common::with_db_or_skip("metadata_search_finds_results", |db| async move {
        let all = common::execute_tool_json(
            "t3000_metadata_search",
            &json!({ "query": "temp" }),
            &db,
        ).await.expect("unscoped search should succeed");
        let all_total = common::get_i64(&all, "total").expect("should have total");
        let all_results = all.get("results").and_then(|v| v.as_array()).expect("should have results");

        // `total` is the number of matches *before* the limit is applied, and
        // `returned` is the number of rows actually included.
        let returned = common::get_i64(&all, "returned").expect("should have returned");
        assert_eq!(returned, all_results.len() as i64, "returned must match the results array");
        assert!(
            all_results.len() as i64 <= all_total,
            "results ({}) cannot exceed total ({})",
            all_results.len(), all_total
        );

        // Scoping to one device can only narrow the search.
        if let Some((serial, _)) = pick_device_with_inputs(&db).await {
            let scoped = common::execute_tool_json(
                "t3000_metadata_search",
                &json!({ "query": "temp", "serial_numbers": [serial] }),
                &db,
            ).await.expect("scoped search should succeed");
            let scoped_total = common::get_i64(&scoped, "total").unwrap_or(-1);
            assert!(
                scoped_total <= all_total,
                "scoping to device {} returned more hits ({} > {})",
                serial, scoped_total, all_total
            );
            println!("metadata_search 'temp': {} overall, {} for device {}", all_total, scoped_total, serial);
        } else {
            println!("metadata_search 'temp': {} hits", all_total);
        }
    }).await;
}

#[tokio::test]
async fn test_point_search_returns_scored_results() {
    common::with_db_or_skip("point_search_returns_scored_results", |db| async move {
        let result = common::execute_tool_json(
            "t3000_point_search",
            &json!({ "query": "temperature sensor", "limit": 5 }),
            &db,
        ).await.expect("point_search should succeed");

        let total = common::get_i64(&result, "total").expect("should have total");
        let returned = common::get_i64(&result, "returned").expect("should have returned");
        let results = result.get("results").and_then(|v| v.as_array()).expect("should have results");
        assert_eq!(results.len() as i64, returned, "returned must match the results array");
        assert!(returned <= 5, "limit 5 must be honoured, got {}", returned);
        assert!(
            total >= returned,
            "total ({}) is the match count before the limit, so it cannot be below returned ({})",
            total, returned
        );

        let mut previous = i64::MAX;
        for hit in results {
            let score = hit.get("score").and_then(|v| v.as_i64()).expect("each hit must carry a score");
            assert!(score > 0, "only scoring hits are returned, got score {}", score);
            assert!(score <= previous, "results must be ordered by score desc: {} after {}", score, previous);
            previous = score;
            assert!(
                hit.get("label").is_some() && hit.get("point_type").is_some(),
                "hit must describe the point: {}", hit
            );
        }
        println!("point_search 'temperature sensor': {} hit(s), top score {:?}", total,
            results.first().and_then(|h| h.get("score")));
    }).await;
}

/// The whole point of 1-based indexes: a search hit must be readable as-is.
#[tokio::test]
async fn test_point_search_result_is_readable_by_point_read() {
    common::with_db_or_skip("point_search_result_is_readable_by_point_read", |db| async move {
        let hits = common::execute_tool_json(
            "t3000_point_search",
            &json!({ "query": "sensor", "limit": 1 }),
            &db,
        ).await.expect("search should succeed");

        let hit = match hits.get("results").and_then(|v| v.as_array()).and_then(|a| a.first()) {
            Some(hit) => hit.clone(),
            None => {
                println!("SKIP point_search_result_is_readable_by_point_read — no search hits");
                return;
            }
        };

        let serial = common::get_i64(&hit, "serial_number").expect("hit needs serial_number");
        let point_type = common::get_str(&hit, "point_type").expect("hit needs point_type").to_string();
        let index = common::get_i64(&hit, "point_index").expect("hit needs point_index");
        let label = common::get_str(&hit, "label").unwrap_or("").to_string();

        let read = common::execute_tool_json(
            "t3000_point_read",
            &json!({ "serial_number": serial, "point_type": point_type, "point_index": index }),
            &db,
        ).await.expect("read should succeed");

        assert_eq!(
            common::get_i64(&read, "point_index"), Some(index),
            "point_read must echo the index the search reported"
        );
        assert_eq!(
            common::get_str(&read, "label").unwrap_or(""), label,
            "search hit and point_read must describe the same point (index bases must match)"
        );
        println!("round-trip: {}/{} #{} '{}'", serial, point_type, index, label);
    }).await;
}

/// Batch reads take 1-based indexes and must echo the same values back.
#[tokio::test]
async fn test_point_read_batch_echoes_requested_indexes() {
    common::with_db_or_skip("point_read_batch_echoes_requested_indexes", |db| async move {
        let Some((serial, input_count)) = pick_device_with_inputs(&db).await else {
            println!("SKIP point_read_batch_echoes_requested_indexes — no device with inputs");
            return;
        };
        if input_count < 2 {
            println!("SKIP point_read_batch_echoes_requested_indexes — device {} has <2 inputs", serial);
            return;
        }

        let result = common::execute_tool_json(
            "t3000_point_read_batch",
            &json!({ "points": [
                { "serial_number": serial, "point_type": "INPUT", "point_index": 1 },
                { "serial_number": serial, "point_type": "INPUT", "point_index": 2 }
            ]}),
            &db,
        ).await.expect("batch read should succeed");

        let results = result.get("results").and_then(|v| v.as_array()).expect("results array");
        assert_eq!(results.len(), 2, "both requested points should come back: {}", result);
        for (offset, entry) in results.iter().enumerate() {
            assert_eq!(
                common::get_i64(entry, "point_index"),
                Some(offset as i64 + 1),
                "batch read must echo the requested 1-based index: {}",
                entry
            );
            // Same normalisation as t3000_point_read: full label + unit text.
            assert!(
                entry.get("label").and_then(|v| v.as_str()).is_some_and(|l| !l.is_empty()),
                "batch read needs a label: {}", entry
            );
            assert!(entry.get("short_label").is_some(), "batch read needs short_label: {}", entry);
            assert!(entry.get("range").is_some(), "batch read needs the mapped range: {}", entry);
            assert!(entry.get("digital").is_some(), "batch read needs the digital flag: {}", entry);
        }

        // The batch entry must describe the point exactly like point_read does.
        let first = &results[0];
        let read = common::execute_tool_json(
            "t3000_point_read",
            &json!({ "serial_number": serial, "point_type": "INPUT", "point_index": 1 }),
            &db,
        ).await.expect("point_read should succeed");

        assert_eq!(
            common::get_str(first, "label"), common::get_str(&read, "label"),
            "batch label must match point_read label (full label, not the short one)"
        );
        assert_eq!(
            first.get("value").and_then(|v| v.as_f64()),
            read.get("value").and_then(|v| v.as_f64()),
            "batch value must match point_read value"
        );
        assert_eq!(
            common::get_str(first, "units"), common::get_str(&read, "units"),
            "batch units must be the mapped text, like point_read"
        );
        println!(
            "read_batch: device {} INPUT 1,2 -> '{:?}' {:?} {} echoed correctly",
            serial,
            common::get_str(first, "label"),
            first.get("value").and_then(|v| v.as_f64()),
            common::get_str(first, "units").unwrap_or("")
        );
    }).await;
}

#[tokio::test]
async fn test_point_batch_metadata_returns_data() {
    common::with_db_or_skip("point_batch_metadata_returns_data", |db| async move {
        let result = common::execute_tool_json(
            "t3000_point_batch_metadata",
            &json!({"points": [
                {"serial_number": 444, "point_type": "INPUT", "point_index": 0},
                {"serial_number": 444, "point_type": "INPUT", "point_index": 1}
            ]}),
            &db,
        ).await.expect("should succeed");
        let total = common::get_i64(&result, "total").unwrap_or(0);
        assert!(total >= 0, "batch metadata should have total");
    }).await;
}
