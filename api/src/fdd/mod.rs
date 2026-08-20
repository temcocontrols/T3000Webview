//! FDD — native Fault Detection & Diagnostics engine.
//!
//! Rules are DB rows (`FDD_RULES`), the engine is a reusable Rust evaluator
//! (per-sample condition + confirm streak → fault hours). No SQL engine, no
//! embedded rules. Reuses Haystack/Brick tags for roles and TRENDLOG_DATA_DETAIL
//! for time-series.

pub mod evaluator;
pub mod roles;
pub mod rules;
pub mod series;

use sea_orm::DatabaseConnection;
use serde_json::{json, Value};

/// Ensure the FDD_RULES table exists and is seeded (idempotent).
pub async fn ensure_schema(db: &DatabaseConnection) -> Result<(), String> {
    rules::ensure_schema(db).await
}

/// Run fault detection for a device over `range_hours`.
///
/// `rule_ids` filters which rules to run; empty = all enabled rules.
pub async fn analyze(
    db: &DatabaseConnection,
    serial: i32,
    equipment: &str,
    range_hours: u64,
    rule_ids: &[String],
) -> Result<Value, String> {
    rules::ensure_schema(db).await?;

    // 1. tags → roles
    let role_map = roles::load_role_map(db, serial).await?;

    // 2. trendlogs → samples (wide, one row per timestamp)
    let series = series::load_series(db, serial, &role_map, range_hours).await?;

    // 3. rules → findings
    let rules_list = rules::get_rules(db, rule_ids).await?;
    let mut findings: Vec<Value> = Vec::new();

    for rule in rules_list {
        // A rule can only run if all its required roles are present.
        let missing: Vec<String> = rule
            .required_roles
            .iter()
            .filter(|r| !role_map.contains_key(*r))
            .cloned()
            .collect();

        if !missing.is_empty() {
            findings.push(json!({
                "rule_id": rule.rule_id,
                "rule_name": rule.rule_name,
                "severity": rule.severity,
                "status": "insufficient_roles",
                "missing_roles": missing,
                "fault_hours": 0.0,
            }));
            continue;
        }

        let finding = evaluator::eval_rule(&rule, &series);
        // Persist any active fault so t3000_fdd_faults can query history.
        if finding.fault_hours > 0.0 {
            let _ = rules::persist_finding(
                db,
                serial,
                equipment,
                &rule.rule_id,
                &rule.rule_name,
                &finding.severity,
                finding.fault_hours,
                &finding.evidence,
            )
            .await;
        }
        findings.push(json!({
            "rule_id": rule.rule_id,
            "rule_name": rule.rule_name,
            "category": rule.category,
            "severity": finding.severity,
            "status": "ok",
            "fault_hours": finding.fault_hours,
            "evidence": finding.evidence,
            "suggestion": evaluator::suggestion(&rule.rule_id),
        }));
    }

    let roles_found: Vec<&String> = role_map.keys().collect();
    Ok(json!({
        "device": serial,
        "equipment": equipment,
        "range_hours": range_hours,
        "roles_found": roles_found,
        "sample_count": series.len(),
        "findings": findings,
    }))
}

/// Query persisted FDD findings (optionally filtered by device / rule).
pub async fn list_findings(
    db: &DatabaseConnection,
    serial: Option<i32>,
    rule_id: Option<&str>,
    limit: u64,
) -> Result<Value, String> {
    rules::ensure_schema(db).await?;
    let items = rules::list_findings(db, serial, rule_id, limit).await?;
    Ok(json!({ "findings": items, "total": items.len() }))
}
