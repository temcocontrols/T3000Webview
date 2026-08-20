//! FDD tool tests — rules_list, analyze, rule CRUD, import/export, faults
//!
//! Validates tool definitions/schemas (no DB) and DB-backed behaviour
//! (rules seeding, analyze shape, rule lifecycle) when the runtime DB is available.

use serde_json::json;
use sea_orm::ConnectionTrait;
use crate::mcp::common;

// ═══ Tool existence ═══

#[test]
fn test_fdd_tools_exist() {
    let names = [
        "t3000_fdd_rules_list",
        "t3000_fdd_analyze",
        "t3000_fdd_rule_create",
        "t3000_fdd_rule_update",
        "t3000_fdd_rule_toggle",
        "t3000_fdd_rule_export",
        "t3000_fdd_rule_import",
        "t3000_fdd_faults",
    ];
    for name in &names {
        assert!(
            common::all_tools().iter().any(|t| t.name == *name),
            "Tool '{}' must be defined",
            name
        );
    }
}

// ═══ Schemas ═══

#[test]
fn test_fdd_rules_list_has_optional_category() {
    let tool = common::all_tools()
        .iter()
        .find(|t| t.name == "t3000_fdd_rules_list")
        .unwrap();
    let props = tool.input_schema.get("properties").and_then(|v| v.as_object()).unwrap();
    assert!(props.contains_key("category"), "should have optional 'category' filter");
    let required = tool.input_schema.get("required");
    assert!(
        required.is_none() || required.unwrap().as_array().map_or(true, |a| a.is_empty()),
        "rules_list should have no required params"
    );
}

#[test]
fn test_fdd_analyze_requires_serial_number() {
    let tool = common::all_tools()
        .iter()
        .find(|t| t.name == "t3000_fdd_analyze")
        .unwrap();
    let required: Vec<&str> = tool.input_schema
        .get("required")
        .and_then(|v| v.as_array())
        .map(|a| a.iter().filter_map(|v| v.as_str()).collect())
        .unwrap_or_default();
    assert!(required.contains(&"serial_number"), "fdd_analyze must require 'serial_number'");
}

#[test]
fn test_fdd_write_tools_require_confirm() {
    let write_tools = [
        "t3000_fdd_rule_create",
        "t3000_fdd_rule_update",
        "t3000_fdd_rule_toggle",
        "t3000_fdd_rule_import",
    ];
    for name in &write_tools {
        let tool = common::all_tools().iter().find(|t| t.name == *name).unwrap();
        let props = tool.input_schema.get("properties").and_then(|v| v.as_object()).unwrap();
        assert!(props.contains_key("confirm"), "{} must expose a confirm flag", name);
    }
}

// ═══ Live DB tests ═══

#[tokio::test]
async fn test_fdd_rules_list_returns_seeded_rules() {
    common::with_db_or_skip("fdd_rules_list_returns_seeded_rules", |db| async move {
        let result = common::execute_tool_json("t3000_fdd_rules_list", &json!({}), &db)
            .await
            .expect("rules_list should succeed");
        let rules = result.get("rules").and_then(|v| v.as_array());
        assert!(rules.is_some(), "should have a rules array");
        let rules = rules.unwrap();
        // Seeded on first run — the full 16-rule catalog.
        assert!(!rules.is_empty(), "rules should not be empty after seeding");
        let ids: Vec<&str> = rules
            .iter()
            .filter_map(|r| r.get("rule_id").and_then(|v| v.as_str()))
            .collect();
        assert!(ids.contains(&"ECON-4"), "ECON-4 should be seeded");
        assert!(ids.contains(&"SAT-HIGH"), "SAT-HIGH should be seeded");
        assert!(ids.contains(&"CHW-1"), "CHW-1 should be seeded");
        assert!(ids.contains(&"VAV-1"), "VAV-1 should be seeded");
    })
    .await;
}

#[tokio::test]
async fn test_fdd_rule_lifecycle() {
    common::with_db_or_skip("fdd_rule_lifecycle", |db| async move {
        let rid = "TEST-RULE-1";

        // Clean up any leftover row from a previous run (runtime DB persists).
        let cleanup = sea_orm::Statement::from_string(
            sea_orm::DatabaseBackend::Sqlite,
            format!("DELETE FROM FDD_RULES WHERE rule_id = '{}'", rid),
        );
        let _ = db.execute(cleanup).await;

        // Create requires confirm.
        let err = common::execute_tool_json(
            "t3000_fdd_rule_create",
            &json!({"rule_id": rid, "rule_name": "Test", "rule_kind": "RangeBand"}),
            &db,
        )
        .await
        .expect_err("create without confirm must fail");
        assert!(err.to_string().to_lowercase().contains("confirm"), "unexpected: {}", err);

        // Create with confirm.
        let created = common::execute_tool_json(
            "t3000_fdd_rule_create",
            &json!({
                "rule_id": rid,
                "rule_name": "Test Range Rule",
                "category": "custom",
                "rule_kind": "RangeBand",
                "required_roles": ["zone_t"],
                "params": {"lo": 60, "hi": 80, "confirm_rows": 4, "poll_seconds": 300},
                "severity": "warning",
                "confirm": true
            }),
            &db,
        )
        .await
        .expect("create with confirm should succeed");
        assert_eq!(created.get("rule_id").and_then(|v| v.as_str()), Some(rid));

        // Update params (merge) + disable.
        let updated = common::execute_tool_json(
            "t3000_fdd_rule_update",
            &json!({"rule_id": rid, "params": {"lo": 65}, "enabled": false, "confirm": true}),
            &db,
        )
        .await
        .expect("update should succeed");
        assert_eq!(updated.get("enabled").and_then(|v| v.as_bool()), Some(false));

        // Toggle back on.
        let toggled = common::execute_tool_json(
            "t3000_fdd_rule_toggle",
            &json!({"rule_id": rid, "enabled": true, "confirm": true}),
            &db,
        )
        .await
        .expect("toggle should succeed");
        assert_eq!(toggled.get("enabled").and_then(|v| v.as_bool()), Some(true));

        // Export includes the new rule.
        let export = common::execute_tool_json("t3000_fdd_rule_export", &json!({}), &db)
            .await
            .expect("export should succeed");
        let ids: Vec<&str> = export
            .get("rules")
            .and_then(|v| v.as_array())
            .unwrap()
            .iter()
            .filter_map(|r| r.get("rule_id").and_then(|v| v.as_str()))
            .collect();
        assert!(ids.contains(&rid), "export should include the new rule");

        // Cleanup so repeated runs stay idempotent.
        let _ = db
            .execute(sea_orm::Statement::from_string(
                sea_orm::DatabaseBackend::Sqlite,
                format!("DELETE FROM FDD_RULES WHERE rule_id = '{}'", rid),
            ))
            .await;
    })
    .await;
}

#[tokio::test]
async fn test_fdd_faults_returns_findings_shape() {
    common::with_db_or_skip("fdd_faults_returns_findings_shape", |db| async move {
        let result = common::execute_tool_json("t3000_fdd_faults", &json!({}), &db)
            .await
            .expect("faults should succeed");
        assert!(result.get("findings").is_some(), "should have findings array");
        assert!(result.get("total").is_some(), "should have total");
    })
    .await;
}

#[tokio::test]
async fn test_fdd_analyze_returns_findings_shape() {
    common::with_db_or_skip("fdd_analyze_returns_findings_shape", |db| async move {
        // Analyze the first device in the DB (or skip body assertions if none).
        let list = common::execute_tool_json("t3000_device_list", &json!({}), &db)
            .await
            .expect("device_list should succeed");
        let serial = list
            .get("devices")
            .and_then(|v| v.as_array())
            .and_then(|arr| arr.first())
            .and_then(|d| d.get("serial"))
            .and_then(|v| v.as_i64());
        let Some(serial) = serial else {
            println!("fdd_analyze: no devices in DB, skipping body check");
            return;
        };

        let result = common::execute_tool_json(
            "t3000_fdd_analyze",
            &json!({"serial_number": serial, "range_hours": 24}),
            &db,
        )
        .await
        .expect("fdd_analyze should succeed");
        assert!(result.get("findings").is_some(), "should have findings array");
        assert!(result.get("roles_found").is_some(), "should have roles_found");
        assert!(result.get("sample_count").is_some(), "should have sample_count");
    })
    .await;
}
