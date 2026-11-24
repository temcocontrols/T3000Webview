//! Rules Tool Tests — rule_toggle, rule_create
//!
//! These 2 tools manage auto-tagging rules. Require a live database.
//! Every test cleans up the rules it creates, so repeated runs stay green.

use sea_orm::{ConnectionTrait, DatabaseConnection, Statement};
use serde_json::json;
use crate::mcp::common;

// ═══ Tool existence / schema ═══

#[test]
fn test_rules_tools_exist() {
    assert!(common::all_tools().iter().any(|t| t.name == "t3000_rule_toggle"));
    assert!(common::all_tools().iter().any(|t| t.name == "t3000_rule_create"));
}

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

// ═══ DB helpers ═══

/// The runtime DB is a single SQLite file shared with T3000 and every test in this
/// binary, so the mutating rule tests take turns instead of racing each other.
fn write_lock() -> &'static tokio::sync::Mutex<()> {
    static LOCK: std::sync::OnceLock<tokio::sync::Mutex<()>> = std::sync::OnceLock::new();
    LOCK.get_or_init(|| tokio::sync::Mutex::new(()))
}

/// Delete a rule by name — the tool set has no delete, so tests clean up directly.
async fn delete_rule_by_name(db: &DatabaseConnection, name: &str) {
    let sql = format!(
        "DELETE FROM HAYSTACK_AUTO_TAGGING_RULES WHERE rule_name = '{}'",
        name.replace('\'', "''")
    );
    let _ = db
        .execute(Statement::from_string(sea_orm::DatabaseBackend::Sqlite, &sql))
        .await;
}

/// Read a rule's stored state back through the public list tool.
async fn fetch_rule(db: &DatabaseConnection, rule_id: i64) -> Option<serde_json::Value> {
    let list = common::execute_tool_json("t3000_haystack_list_rules", &json!({}), db)
        .await
        .expect("list_rules should succeed");
    list.get("rules")?
        .as_array()?
        .iter()
        .find(|r| common::get_i64(r, "id") == Some(rule_id))
        .cloned()
}

/// Create a test rule and return its id. The caller cleans up by name.
async fn create_test_rule(db: &DatabaseConnection, name: &str) -> i64 {
    let created = common::execute_tool_json(
        "t3000_rule_create",
        &json!({
            "rule_name": name,
            "pattern": "^MCP_TEST_POINT$",
            "category": "haystack",
            "haystack_tags": "mcp, test"
        }),
        db,
    )
    .await
    .expect("rule_create should succeed");
    common::get_i64(&created, "rule_id").expect("rule_create must return a rule_id")
}

// ═══ Live DB tests ═══

/// Regression: `enabled` used to be ignored and the stored flag was flipped, so
/// asking for the same state twice silently did the opposite the second time.
#[tokio::test]
async fn test_rule_toggle_sets_the_requested_state() {
    common::with_db_or_skip("rule_toggle_sets_state", |db| async move {
        let _guard = write_lock().lock().await;
        let name = "mcp_test_toggle_state";
        delete_rule_by_name(&db, name).await;

        let rule_id = create_test_rule(&db, name).await;
        assert_eq!(
            fetch_rule(&db, rule_id).await.and_then(|r| r.get("enabled").and_then(|v| v.as_bool())),
            Some(true),
            "a new rule starts enabled"
        );

        // Disable twice — the second call must not re-enable it.
        for attempt in 1..=2 {
            let out = common::execute_tool_json(
                "t3000_rule_toggle",
                &json!({"rule_id": rule_id, "enabled": false}),
                &db,
            )
            .await
            .expect("disable should succeed");
            assert_eq!(out.get("enabled").and_then(|v| v.as_bool()), Some(false),
                "attempt {} should report enabled=false: {}", attempt, out);

            let stored = fetch_rule(&db, rule_id).await.expect("rule should still exist");
            assert_eq!(
                stored.get("enabled").and_then(|v| v.as_bool()),
                Some(false),
                "attempt {}: rule must stay disabled in the database ({})",
                attempt,
                stored
            );
        }

        // Enable twice — same rule in the other direction.
        for attempt in 1..=2 {
            common::execute_tool_json(
                "t3000_rule_toggle",
                &json!({"rule_id": rule_id, "enabled": true}),
                &db,
            )
            .await
            .expect("enable should succeed");

            let stored = fetch_rule(&db, rule_id).await.expect("rule should still exist");
            assert_eq!(
                stored.get("enabled").and_then(|v| v.as_bool()),
                Some(true),
                "attempt {}: rule must stay enabled in the database ({})",
                attempt,
                stored
            );
        }

        delete_rule_by_name(&db, name).await;
    })
    .await;
}

#[tokio::test]
async fn test_rule_toggle_unknown_id_is_an_error() {
    common::with_db_or_skip("rule_toggle_unknown_id", |db| async move {
        let err = common::execute_tool_json(
            "t3000_rule_toggle",
            &json!({"rule_id": 999_999_999_i64, "enabled": true}),
            &db,
        )
        .await
        .expect_err("toggling a rule that does not exist must fail");
        assert!(err.contains("999999999"), "the error should name the rule id: {}", err);
        assert!(err.to_lowercase().contains("not found"), "got: {}", err);
    })
    .await;
}

#[tokio::test]
async fn test_rule_toggle_requires_enabled() {
    common::with_db_or_skip("rule_toggle_requires_enabled", |db| async move {
        let err = common::execute_tool_json(
            "t3000_rule_toggle",
            &json!({"rule_id": 1}),
            &db,
        )
        .await
        .expect_err("enabled is required — the tool must not guess a direction");
        assert!(err.to_lowercase().contains("enabled"), "got: {}", err);
    })
    .await;
}

#[tokio::test]
async fn test_rule_create_honours_priority() {
    common::with_db_or_skip("rule_create_priority", |db| async move {
        let _guard = write_lock().lock().await;
        let name = "mcp_test_priority";
        delete_rule_by_name(&db, name).await;

        let created = common::execute_tool_json(
            "t3000_rule_create",
            &json!({
                "rule_name": name,
                "pattern": "^MCP_PRIORITY$",
                "category": "haystack",
                "haystack_tags": "priority, test",
                "priority": 42
            }),
            &db,
        )
        .await
        .expect("create should succeed");

        assert_eq!(common::get_i64(&created, "priority"), Some(42),
            "the response should echo the stored priority: {}", created);

        let rule_id = common::get_i64(&created, "rule_id").expect("rule_id");
        let stored = fetch_rule(&db, rule_id).await.expect("rule should be listed");
        assert_eq!(common::get_i64(&stored, "priority"), Some(42),
            "priority must be persisted, not silently dropped: {}", stored);

        delete_rule_by_name(&db, name).await;
    })
    .await;
}

#[tokio::test]
async fn test_rule_create_rejects_invalid_input() {
    common::with_db_or_skip("rule_create_rejects_invalid", |db| async move {
        let _guard = write_lock().lock().await;
        // Unknown category (the table only allows haystack / brick / range).
        let err = common::execute_tool_json(
            "t3000_rule_create",
            &json!({"rule_name": "mcp_bad_cat", "pattern": "^X$", "category": "nonsense",
                    "haystack_tags": "x"}),
            &db,
        )
        .await
        .expect_err("unknown category must be rejected");
        assert!(err.to_lowercase().contains("category"), "got: {}", err);

        // Pattern is a regex — an invalid one would break auto-tagging later.
        let err = common::execute_tool_json(
            "t3000_rule_create",
            &json!({"rule_name": "mcp_bad_regex", "pattern": "([unclosed", "category": "haystack",
                    "haystack_tags": "x"}),
            &db,
        )
        .await
        .expect_err("an invalid regex must be rejected");
        assert!(err.to_lowercase().contains("regex"), "got: {}", err);

        // A haystack rule with no tags assigns nothing.
        let err = common::execute_tool_json(
            "t3000_rule_create",
            &json!({"rule_name": "mcp_no_tags", "pattern": "^X$", "category": "haystack"}),
            &db,
        )
        .await
        .expect_err("a rule that assigns nothing must be rejected");
        assert!(err.to_lowercase().contains("haystack_tags"), "got: {}", err);

        // A brick rule without a class is equally useless.
        let err = common::execute_tool_json(
            "t3000_rule_create",
            &json!({"rule_name": "mcp_no_brick", "pattern": "^X$", "category": "brick"}),
            &db,
        )
        .await
        .expect_err("a brick rule without brick_class must be rejected");
        assert!(err.to_lowercase().contains("brick_class"), "got: {}", err);

        // None of the rejected rules may have been persisted.
        let list = common::execute_tool_json("t3000_haystack_list_rules", &json!({}), &db)
            .await
            .expect("list_rules should succeed");
        let names: Vec<String> = list["rules"]
            .as_array()
            .map(|a| a.iter().filter_map(|r| common::get_str(r, "rule_name").map(String::from)).collect())
            .unwrap_or_default();
        for rejected in ["mcp_bad_cat", "mcp_bad_regex", "mcp_no_tags", "mcp_no_brick"] {
            assert!(!names.contains(&rejected.to_string()),
                "rejected rule '{}' must not be stored", rejected);
        }
    })
    .await;
}

#[tokio::test]
async fn test_rule_create_rejects_duplicate_name() {
    common::with_db_or_skip("rule_create_duplicate", |db| async move {
        let _guard = write_lock().lock().await;
        let name = "mcp_test_duplicate";
        delete_rule_by_name(&db, name).await;

        let _first = create_test_rule(&db, name).await;

        let err = common::execute_tool_json(
            "t3000_rule_create",
            &json!({"rule_name": name, "pattern": "^OTHER$", "category": "haystack",
                    "haystack_tags": "dup"}),
            &db,
        )
        .await
        .expect_err("rule names are UNIQUE, so a duplicate must fail");
        assert!(
            err.to_lowercase().contains("duplicate") || err.contains("already exists"),
            "the error should explain the name collision: {}",
            err
        );

        delete_rule_by_name(&db, name).await;
    })
    .await;
}
