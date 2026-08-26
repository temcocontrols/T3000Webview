//! FDD_RULES storage — DB table creation, seed, and read helpers.
//!
//! Rules live as DB rows (managed at runtime like HAYSTACK_AUTO_TAGGING_RULES),
//! NOT embedded in the binary.

use sea_orm::ConnectionTrait;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

/// A fault-detection rule, stored as a row in FDD_RULES.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Rule {
    pub rule_id: String,
    pub rule_name: String,
    pub category: String,
    pub description: Option<String>,
    /// Which Rust evaluator runs this rule (see evaluator::eval_rule).
    pub rule_kind: String,
    /// Semantic roles the rule needs on the device (e.g. ["mat","rat","oa_t","fan_cmd"]).
    pub required_roles: Vec<String>,
    /// Tunable parameters (e.g. {"oa_min_pct":15,"confirm_rows":4,"poll_seconds":300}).
    pub params: Value,
    pub severity: String,
    pub enabled: bool,
}

const DDL: &str = "
CREATE TABLE IF NOT EXISTS FDD_RULES (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    rule_id        TEXT NOT NULL UNIQUE,
    rule_name      TEXT NOT NULL,
    category       TEXT,
    description    TEXT,
    rule_kind      TEXT NOT NULL,
    required_roles TEXT,
    params_json    TEXT,
    severity       TEXT DEFAULT 'warning',
    enabled        BOOLEAN DEFAULT 1,
    created_at     TEXT DEFAULT (datetime('now')),
    updated_at     TEXT DEFAULT (datetime('now'))
);
";

/// Default rules seeded on first run (idempotent). All constants — safe to embed
/// as a one-time seed; after seeding the DB is authoritative and rules are editable.
const SEED: &[(&str, &str, &str, &str, &str, &str, &str, &str)] = &[
    ("ECON-1", "OA damper stuck closed", "economizer", "OA damper near zero while fan runs in free-cooling conditions", "EconomizerStuckClosed", r#"["oa_t","mat","fan_cmd","damper_pct"]"#, r#"{"confirm_rows":4,"poll_seconds":300}"#, "warning"),
    ("ECON-3", "Mechanical cooling without economizing", "economizer", "Mechanical cooling when the economizer should be free-cooling", "EconomizerOaFraction", r#"["mat","rat","oa_t","fan_cmd"]"#, r#"{"oa_min_pct":0,"confirm_rows":4,"poll_seconds":300}"#, "warning"),
    ("ECON-4", "Low outdoor-air fraction", "economizer", "Economizer not bringing in enough outdoor air when free-cooling is available", "EconomizerOaFraction", r#"["mat","rat","oa_t","fan_cmd"]"#, r#"{"oa_min_pct":15,"confirm_rows":4,"poll_seconds":300}"#, "warning"),
    ("ECON-6", "Economizer freezing risk", "economizer", "Mixed-air temperature below the freezing threshold", "ThresholdBelow", r#"["mat"]"#, r#"{"field":"mat","limit":2.0,"confirm_rows":3,"poll_seconds":300}"#, "critical"),
    ("ECON-7", "Not economizing when it should", "economizer", "Conditions favor economizing but outdoor-air fraction is ~0", "EconomizerOaFraction", r#"["mat","rat","oa_t","fan_cmd"]"#, r#"{"oa_min_pct":0,"confirm_rows":4,"poll_seconds":300}"#, "info"),
    ("CMD-1", "Fan command/status mismatch", "fan", "Fan command says running but status does not, or vice-versa", "FanMismatch", r#"["fan_cmd","fan_status"]"#, r#"{"confirm_rows":4,"poll_seconds":300}"#, "warning"),
    ("FAN-RUNTIME", "Fan runtime hours", "fan", "Accumulated fan running hours (metric, not a fault)", "ThresholdAbove", r#"["fan_cmd"]"#, r#"{"field":"fan_cmd","limit":0.05,"confirm_rows":1,"poll_seconds":300}"#, "info"),
    ("SAT-HIGH", "Supply air temperature too high", "sensor", "Supply air temperature exceeds the high limit for a sustained period", "ThresholdAbove", r#"["sat"]"#, r#"{"field":"sat","limit":100,"confirm_rows":4,"poll_seconds":300}"#, "critical"),
    ("SAT-LOW", "Supply air temperature too low", "sensor", "Supply air temperature below the low limit for a sustained period", "ThresholdBelow", r#"["sat"]"#, r#"{"field":"sat","limit":40,"confirm_rows":4,"poll_seconds":300}"#, "critical"),
    ("SAT-DEV", "Supply air temp deviation", "sensor", "Supply air temperature deviates from its setpoint", "SupplyTempDeviation", r#"["sat","sat_sp"]"#, r#"{"max_dev":5,"confirm_rows":4,"poll_seconds":300}"#, "warning"),
    ("SAT-STUCK", "Supply air temp sensor frozen", "sensor", "Supply air temperature shows no change over the window", "StuckValue", r#"["sat"]"#, r#"{"deadband":0.1,"window_rows":12,"poll_seconds":300}"#, "warning"),
    ("VAV-1", "Zone comfort band violation", "zone", "Zone temperature outside the comfort band for a sustained period", "RangeBand", r#"["zone_t"]"#, r#"{"lo":70,"hi":75,"confirm_rows":4,"poll_seconds":300}"#, "warning"),
    ("ZONE-STUCK", "Zone temp sensor frozen", "zone", "Zone temperature shows no change over the window", "StuckValue", r#"["zone_t"]"#, r#"{"deadband":0.1,"window_rows":12,"poll_seconds":300}"#, "warning"),
    ("CHW-1", "Low delta-T across coil", "chw", "Chilled-water return vs supply temperature difference too small", "ChwLowDeltaT", r#"["chw_s","chw_r"]"#, r#"{"min_dt":5,"confirm_rows":4,"poll_seconds":300}"#, "warning"),
    ("CHW-2", "CHW supply pressure low", "chw", "Chilled-water supply pressure below the limit", "ThresholdBelow", r#"["chw_dp"]"#, r#"{"field":"chw_dp","limit":8,"confirm_rows":4,"poll_seconds":300}"#, "warning"),
    ("CHW-3", "CHW supply temp out of band", "chw", "Chilled-water supply temperature outside the expected band", "RangeBand", r#"["chw_s"]"#, r#"{"lo":40,"hi":48,"confirm_rows":4,"poll_seconds":300}"#, "warning"),
];

const FINDINGS_DDL: &str = "
CREATE TABLE IF NOT EXISTS FDD_FINDINGS (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    device_serial INTEGER NOT NULL,
    equipment     TEXT,
    rule_id       TEXT NOT NULL,
    rule_name     TEXT,
    severity      TEXT,
    fault_hours   REAL,
    evidence      TEXT,
    created_at    TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_fdd_findings_device ON FDD_FINDINGS (device_serial);
CREATE INDEX IF NOT EXISTS idx_fdd_findings_rule ON FDD_FINDINGS (rule_id);
CREATE INDEX IF NOT EXISTS idx_fdd_findings_created ON FDD_FINDINGS (created_at);
";

/// Create FDD_RULES + FDD_FINDINGS if missing and seed defaults on first run.
pub async fn ensure_schema(db: &sea_orm::DatabaseConnection) -> Result<(), String> {
    db.execute(sea_orm::Statement::from_string(
        sea_orm::DatabaseBackend::Sqlite,
        DDL.to_string(),
    ))
    .await
    .map_err(|e| format!("FDD schema error: {}", e))?;
    db.execute(sea_orm::Statement::from_string(
        sea_orm::DatabaseBackend::Sqlite,
        FINDINGS_DDL.to_string(),
    ))
    .await
    .map_err(|e| format!("FDD findings schema error: {}", e))?;

    // Idempotent per-rule seeding: always INSERT OR IGNORE so existing DBs
    // (e.g. those seeded with the Phase-1 3-rule catalog) pick up new rules.
    for (id, name, cat, desc, kind, roles, params, severity) in SEED {
        let sql = format!(
            "INSERT OR IGNORE INTO FDD_RULES (rule_id, rule_name, category, description, rule_kind, required_roles, params_json, severity) \
             VALUES ('{}','{}','{}','{}','{}','{}','{}','{}')",
            id, name, cat, desc, kind, roles, params, severity
        );
        db.execute(sea_orm::Statement::from_string(sea_orm::DatabaseBackend::Sqlite, sql))
            .await
            .map_err(|e| format!("FDD seed error: {}", e))?;
    }
    Ok(())
}

const SELECT_COLS: &str =
    "rule_id, rule_name, category, description, rule_kind, required_roles, params_json, severity, enabled";

/// List all FDD rules, optionally filtered by category.
pub async fn list_rules(
    db: &sea_orm::DatabaseConnection,
    category: Option<&str>,
) -> Result<Vec<Rule>, String> {
    let sql = match category {
        Some(cat) => format!(
            "SELECT {} FROM FDD_RULES WHERE category = '{}' ORDER BY category, rule_id",
            SELECT_COLS, cat
        ),
        None => format!("SELECT {} FROM FDD_RULES ORDER BY category, rule_id", SELECT_COLS),
    };
    let rows = db
        .query_all(sea_orm::Statement::from_string(sea_orm::DatabaseBackend::Sqlite, sql))
        .await
        .map_err(|e| format!("FDD list error: {}", e))?;
    rows.iter().map(row_to_rule).collect()
}

/// Get rules by ID (only enabled ones). Empty `ids` = all enabled rules.
pub async fn get_rules(
    db: &sea_orm::DatabaseConnection,
    ids: &[String],
) -> Result<Vec<Rule>, String> {
    if ids.is_empty() {
        let all = list_rules(db, None).await?;
        return Ok(all.into_iter().filter(|r| r.enabled).collect());
    }
    let placeholders = ids.iter().map(|_| "?").collect::<Vec<_>>().join(",");
    let sql = format!(
        "SELECT {} FROM FDD_RULES WHERE rule_id IN ({}) AND enabled = 1 ORDER BY category, rule_id",
        SELECT_COLS, placeholders
    );
    let values: Vec<sea_orm::Value> = ids.iter().cloned().map(Into::into).collect();
    let stmt = sea_orm::Statement::from_sql_and_values(sea_orm::DatabaseBackend::Sqlite, sql, values);
    let rows = db
        .query_all(stmt)
        .await
        .map_err(|e| format!("FDD get_rules error: {}", e))?;
    rows.iter().map(row_to_rule).collect()
}

fn row_to_rule(r: &sea_orm::QueryResult) -> Result<Rule, String> {
    Ok(Rule {
        rule_id: r
            .try_get("", "rule_id")
            .map_err(|e| format!("FDD row error (rule_id): {}", e))?,
        rule_name: r
            .try_get("", "rule_name")
            .map_err(|e| format!("FDD row error (rule_name): {}", e))?,
        category: r.try_get("", "category").unwrap_or_default(),
        description: r.try_get("", "description").ok(),
        rule_kind: r
            .try_get("", "rule_kind")
            .map_err(|e| format!("FDD row error (rule_kind): {}", e))?,
        required_roles: r
            .try_get::<String>("", "required_roles")
            .ok()
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or_default(),
        params: r
            .try_get::<String>("", "params_json")
            .ok()
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or_else(|| json!({})),
        severity: r
            .try_get::<String>("", "severity")
            .unwrap_or_else(|_| "warning".into()),
        enabled: r.try_get::<i64>("", "enabled").unwrap_or(1) != 0,
    })
}

/// Get a single rule by ID regardless of enabled state (for admin/update flows).
pub async fn get_rule_any(db: &sea_orm::DatabaseConnection, rule_id: &str) -> Result<Option<Rule>, String> {
    let sql = format!(
        "SELECT {} FROM FDD_RULES WHERE rule_id = '{}' LIMIT 1",
        SELECT_COLS,
        rule_id.replace('\'', "''")
    );
    let rows = db
        .query_all(sea_orm::Statement::from_string(sea_orm::DatabaseBackend::Sqlite, sql))
        .await
        .map_err(|e| format!("FDD get_rule_any error: {}", e))?;
    match rows.first() {
        Some(r) => row_to_rule(r).map(Some),
        None => Ok(None),
    }
}

/// Insert a new rule. Fails if rule_id already exists (use `update_rule`).
pub async fn create_rule(db: &sea_orm::DatabaseConnection, rule: &Rule) -> Result<(), String> {
    let sql = format!(
        "INSERT INTO FDD_RULES (rule_id, rule_name, category, description, rule_kind, required_roles, params_json, severity, enabled) \
         VALUES ('{}','{}','{}','{}','{}','{}','{}','{}',{})",
        rule.rule_id.replace('\'', "''"),
        rule.rule_name.replace('\'', "''"),
        rule.category.replace('\'', "''"),
        rule.description.clone().unwrap_or_default().replace('\'', "''"),
        rule.rule_kind.replace('\'', "''"),
        serde_json::to_string(&rule.required_roles).unwrap_or_else(|_| "[]".into()),
        serde_json::to_string(&rule.params).unwrap_or_else(|_| "{}".into()),
        rule.severity.replace('\'', "''"),
        if rule.enabled { 1 } else { 0 },
    );
    db.execute(sea_orm::Statement::from_string(sea_orm::DatabaseBackend::Sqlite, sql))
        .await
        .map_err(|e| format!("FDD create error: {}", e))?;
    Ok(())
}

/// Update an existing rule. `changes` is a JSON object with any of:
/// rule_name, category, description, rule_kind, severity, enabled,
/// required_roles (array), params (object, merged with existing).
pub async fn update_rule(
    db: &sea_orm::DatabaseConnection,
    rule_id: &str,
    changes: &Value,
) -> Result<Option<Rule>, String> {
    // Read regardless of enabled state (updating may re-enable/disable the rule).
    let current = get_rule_any(db, rule_id).await?;
    let current = match current {
        Some(r) => r,
        None => return Ok(None),
    };

    let mut sets: Vec<String> = Vec::new();
    if let Some(v) = changes.get("rule_name").and_then(|v| v.as_str()) {
        sets.push(format!("rule_name = '{}'", v.replace('\'', "''")));
    }
    if let Some(v) = changes.get("category").and_then(|v| v.as_str()) {
        sets.push(format!("category = '{}'", v.replace('\'', "''")));
    }
    if let Some(v) = changes.get("description").and_then(|v| v.as_str()) {
        sets.push(format!("description = '{}'", v.replace('\'', "''")));
    }
    if let Some(v) = changes.get("rule_kind").and_then(|v| v.as_str()) {
        sets.push(format!("rule_kind = '{}'", v.replace('\'', "''")));
    }
    if let Some(v) = changes.get("severity").and_then(|v| v.as_str()) {
        sets.push(format!("severity = '{}'", v.replace('\'', "''")));
    }
    if let Some(v) = changes.get("enabled").and_then(|v| v.as_bool()) {
        sets.push(format!("enabled = {}", if v { 1 } else { 0 }));
    }
    if let Some(v) = changes.get("required_roles").and_then(|v| v.as_array()) {
        sets.push(format!(
            "required_roles = '{}'",
            serde_json::to_string(v).unwrap_or_else(|_| "[]".into())
        ));
    }
    if let Some(v) = changes.get("params").and_then(|v| v.as_object()) {
        // Merge into existing params so partial tuning works.
        let mut merged = current.params.clone();
        if let Some(obj) = merged.as_object_mut() {
            for (k, val) in v {
                obj.insert(k.clone(), val.clone());
            }
        }
        sets.push(format!(
            "params_json = '{}'",
            serde_json::to_string(&merged).unwrap_or_else(|_| "{}".into())
        ));
    }
    if sets.is_empty() {
        return Ok(Some(current));
    }
    sets.push("updated_at = datetime('now')".to_string());

    let sql = format!(
        "UPDATE FDD_RULES SET {} WHERE rule_id = '{}'",
        sets.join(", "),
        rule_id.replace('\'', "''")
    );
    db.execute(sea_orm::Statement::from_string(sea_orm::DatabaseBackend::Sqlite, sql))
        .await
        .map_err(|e| format!("FDD update error: {}", e))?;
    get_rule_any(db, rule_id).await
}

/// Enable or disable a rule by ID.
pub async fn toggle_rule(
    db: &sea_orm::DatabaseConnection,
    rule_id: &str,
    enabled: bool,
) -> Result<Option<Rule>, String> {
    update_rule(db, rule_id, &json!({ "enabled": enabled })).await
}

/// Delete a rule by ID (also removes persisted findings for that rule).
pub async fn delete_rule(db: &sea_orm::DatabaseConnection, rule_id: &str) -> Result<(), String> {
    let del = format!(
        "DELETE FROM FDD_RULES WHERE rule_id = '{}'",
        rule_id.replace('\'', "''")
    );
    db.execute(sea_orm::Statement::from_string(sea_orm::DatabaseBackend::Sqlite, del))
        .await
        .map_err(|e| format!("FDD delete error: {}", e))?;
    let del_findings = format!(
        "DELETE FROM FDD_FINDINGS WHERE rule_id = '{}'",
        rule_id.replace('\'', "''")
    );
    db.execute(sea_orm::Statement::from_string(
        sea_orm::DatabaseBackend::Sqlite,
        del_findings,
    ))
    .await
    .map_err(|e| format!("FDD delete findings error: {}", e))?;
    Ok(())
}

/// Clear all persisted findings.
pub async fn clear_findings(db: &sea_orm::DatabaseConnection) -> Result<usize, String> {
    let res = db
        .execute(sea_orm::Statement::from_string(
            sea_orm::DatabaseBackend::Sqlite,
            "DELETE FROM FDD_FINDINGS".to_string(),
        ))
        .await
        .map_err(|e| format!("FDD clear findings error: {}", e))?;
    Ok(res.rows_affected() as usize)
}

/// Import rules (upsert). `rules` is an array of rule objects.
pub async fn import_rules(db: &sea_orm::DatabaseConnection, rules: &[Value]) -> Result<usize, String> {
    let mut count = 0usize;
    for r in rules {
        let rule = Rule {
            rule_id: r.get("rule_id").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            rule_name: r.get("rule_name").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            category: r.get("category").and_then(|v| v.as_str()).unwrap_or("custom").to_string(),
            description: r.get("description").and_then(|v| v.as_str()).map(String::from),
            rule_kind: r.get("rule_kind").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            required_roles: r.get("required_roles")
                .and_then(|v| v.as_array())
                .map(|a| a.iter().filter_map(|x| x.as_str().map(String::from)).collect())
                .unwrap_or_default(),
            params: r.get("params").cloned().unwrap_or_else(|| json!({})),
            severity: r.get("severity").and_then(|v| v.as_str()).unwrap_or("warning").to_string(),
            enabled: r.get("enabled").and_then(|v| v.as_bool()).unwrap_or(true),
        };
        if rule.rule_id.is_empty() {
            continue;
        }
        // Upsert: delete any existing row with the same rule_id, then insert.
        let del_sql = format!("DELETE FROM FDD_RULES WHERE rule_id = '{}'", rule.rule_id.replace('\'', "''"));
        db.execute(sea_orm::Statement::from_string(sea_orm::DatabaseBackend::Sqlite, del_sql))
            .await
            .map_err(|e| format!("FDD import delete error: {}", e))?;
        let ins_sql = format!(
            "INSERT INTO FDD_RULES (rule_id, rule_name, category, description, rule_kind, required_roles, params_json, severity, enabled) \
             VALUES ('{}','{}','{}','{}','{}','{}','{}','{}',{})",
            rule.rule_id.replace('\'', "''"),
            rule.rule_name.replace('\'', "''"),
            rule.category.replace('\'', "''"),
            rule.description.clone().unwrap_or_default().replace('\'', "''"),
            rule.rule_kind.replace('\'', "''"),
            serde_json::to_string(&rule.required_roles).unwrap_or_else(|_| "[]".into()),
            serde_json::to_string(&rule.params).unwrap_or_else(|_| "{}".into()),
            rule.severity.replace('\'', "''"),
            if rule.enabled { 1 } else { 0 },
        );
        db.execute(sea_orm::Statement::from_string(sea_orm::DatabaseBackend::Sqlite, ins_sql))
            .await
            .map_err(|e| format!("FDD import insert error: {}", e))?;
        count += 1;
    }
    Ok(count)
}

/// Persist one finding row.
pub async fn persist_finding(
    db: &sea_orm::DatabaseConnection,
    serial: i32,
    equipment: &str,
    rule_id: &str,
    rule_name: &str,
    severity: &str,
    fault_hours: f64,
    evidence: &Value,
) -> Result<(), String> {
    let sql = format!(
        "INSERT INTO FDD_FINDINGS (device_serial, equipment, rule_id, rule_name, severity, fault_hours, evidence) \
         VALUES ({}, '{}', '{}', '{}', '{}', {}, '{}')",
        serial,
        equipment.replace('\'', "''"),
        rule_id.replace('\'', "''"),
        rule_name.replace('\'', "''"),
        severity.replace('\'', "''"),
        fault_hours,
        serde_json::to_string(evidence).unwrap_or_else(|_| "{}".into()).replace('\'', "''"),
    );
    db.execute(sea_orm::Statement::from_string(sea_orm::DatabaseBackend::Sqlite, sql))
        .await
        .map_err(|e| format!("FDD persist finding error: {}", e))?;
    Ok(())
}

/// Query persisted findings.
pub async fn list_findings(
    db: &sea_orm::DatabaseConnection,
    serial: Option<i32>,
    rule_id: Option<&str>,
    limit: u64,
) -> Result<Vec<Value>, String> {
    let mut sql = String::from(
        "SELECT id, device_serial, equipment, rule_id, rule_name, severity, fault_hours, evidence, created_at FROM FDD_FINDINGS",
    );
    let mut conds: Vec<String> = Vec::new();
    if let Some(s) = serial {
        conds.push(format!("device_serial = {}", s));
    }
    if let Some(r) = rule_id {
        conds.push(format!("rule_id = '{}'", r.replace('\'', "''")));
    }
    if !conds.is_empty() {
        sql.push_str(&format!(" WHERE {}", conds.join(" AND ")));
    }
    sql.push_str(" ORDER BY created_at DESC");
    sql.push_str(&format!(" LIMIT {}", limit));

    let rows = db
        .query_all(sea_orm::Statement::from_string(sea_orm::DatabaseBackend::Sqlite, sql))
        .await
        .map_err(|e| format!("FDD findings query error: {}", e))?;
    Ok(rows
        .iter()
        .map(|r| {
            json!({
                "id": r.try_get::<i64>("", "id").unwrap_or(0),
                "device_serial": r.try_get::<i32>("", "device_serial").unwrap_or(0),
                "equipment": r.try_get::<String>("", "equipment").ok(),
                "rule_id": r.try_get::<String>("", "rule_id").unwrap_or_default(),
                "rule_name": r.try_get::<String>("", "rule_name").ok(),
                "severity": r.try_get::<String>("", "severity").unwrap_or_default(),
                "fault_hours": r.try_get::<f64>("", "fault_hours").unwrap_or(0.0),
                "evidence": r.try_get::<String>("", "evidence").ok().and_then(|s| serde_json::from_str::<Value>(&s).ok()),
                "created_at": r.try_get::<String>("", "created_at").unwrap_or_default(),
            })
        })
        .collect())
}
