// Auto-tagging Service v3
// Regex-based rule engine that matches point names against HAYSTACK_AUTO_TAGGING_RULES
// to derive Haystack tags and Brick classes.

use regex::Regex;
use sea_orm::{ConnectionTrait, DbErr, Statement};
use serde::{Deserialize, Serialize};

// ── Types ──

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AutoTaggingRule {
    pub id: i64,
    pub rule_name: String,
    pub category: String,       // "haystack" | "brick"
    pub pattern: String,
    pub units: Option<String>,     // comma-separated unit substrings
    pub object_types: Option<String>, // comma-separated BACnet types
    pub haystack_tags: Option<String>, // comma-separated tags to assign
    pub brick_class: Option<String>,
    pub haystack_kind: Option<String>,   // "Number", "Bool", "Marker", "Str"
    pub haystack_unit: Option<String>,
    pub enabled: bool,
    pub priority: i32,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PointInfo {
    pub serial_number: i32,
    pub point_type: String,     // "INPUT" | "OUTPUT" | "VARIABLE"
    pub point_index: i32,
    pub label: Option<String>,
    pub full_label: Option<String>,
    pub units: Option<String>,
    pub digital_analog: Option<i32>,
    pub object_type: Option<String>, // BACnet object type if known
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TagMatch {
    pub point: PointInfo,
    pub matched_rule: String,
    pub haystack_tags: Vec<String>,
    pub brick_class: Option<String>,
    pub haystack_kind: Option<String>,
    pub haystack_unit: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AutoTagRequest {
    pub serial_numbers: Vec<i32>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateRuleRequest {
    pub rule_name: String,
    pub category: String,
    pub pattern: String,
    pub units: Option<String>,
    pub object_types: Option<String>,
    pub haystack_tags: Option<String>,
    pub brick_class: Option<String>,
    pub haystack_kind: Option<String>,
    pub haystack_unit: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateRuleRequest {
    pub pattern: Option<String>,
    pub units: Option<String>,
    pub object_types: Option<String>,
    pub haystack_tags: Option<String>,
    pub brick_class: Option<String>,
    pub haystack_kind: Option<String>,
    pub haystack_unit: Option<String>,
    pub enabled: Option<bool>,
    pub priority: Option<i32>,
}

// ── Rule CRUD ──

pub async fn list_rules(db: &impl ConnectionTrait) -> Result<Vec<AutoTaggingRule>, DbErr> {
    let rows = db
        .query_all(Statement::from_string(
            sea_orm::DatabaseBackend::Sqlite,
            "SELECT id, rule_name, category, pattern, units, object_types, haystack_tags,
                    brick_class, haystack_kind, haystack_unit, enabled, priority, created_at, updated_at
             FROM HAYSTACK_AUTO_TAGGING_RULES ORDER BY priority, category, rule_name",
        ))
        .await?;

    Ok(rows
        .iter()
        .filter_map(|r| Some(AutoTaggingRule {
            id: r.try_get("", "id").ok()?,
            rule_name: r.try_get("", "rule_name").ok()?,
            category: r.try_get("", "category").unwrap_or_default(),
            pattern: r.try_get("", "pattern").ok()?,
            units: r.try_get("", "units").ok(),
            object_types: r.try_get("", "object_types").ok(),
            haystack_tags: r.try_get("", "haystack_tags").ok(),
            brick_class: r.try_get("", "brick_class").ok(),
            haystack_kind: r.try_get("", "haystack_kind").ok(),
            haystack_unit: r.try_get("", "haystack_unit").ok(),
            enabled: r.try_get::<i32>("", "enabled").unwrap_or(1) != 0,
            priority: r.try_get("", "priority").unwrap_or(0),
            created_at: r.try_get("", "created_at").ok(),
            updated_at: r.try_get("", "updated_at").ok(),
        }))
        .collect())
}

pub async fn create_rule(db: &impl ConnectionTrait, req: &CreateRuleRequest) -> Result<i64, String> {
    let sql = format!(
        "INSERT INTO HAYSTACK_AUTO_TAGGING_RULES (rule_name, category, pattern, units, object_types, haystack_tags, brick_class, haystack_kind, haystack_unit)
         VALUES ('{}', '{}', '{}', {}, {}, {}, {}, {}, {})",
        req.rule_name.replace('\'', "''"),
        req.category.replace('\'', "''"),
        req.pattern.replace('\'', "''"),
        opt_str(&req.units),
        opt_str(&req.object_types),
        opt_str(&req.haystack_tags),
        opt_str(&req.brick_class),
        opt_str(&req.haystack_kind),
        opt_str(&req.haystack_unit),
    );

    db.execute(Statement::from_string(sea_orm::DatabaseBackend::Sqlite, &sql))
        .await
        .map_err(|e| format!("Failed to create rule: {}", e))?;

    // Get the last inserted id
    let row = db
        .query_one(Statement::from_string(
            sea_orm::DatabaseBackend::Sqlite,
            "SELECT last_insert_rowid() as id",
        ))
        .await
        .map_err(|e| format!("Failed to get id: {}", e))?;

    Ok(row.and_then(|r| r.try_get::<i64>("", "id").ok()).unwrap_or(0))
}

pub async fn update_rule(db: &impl ConnectionTrait, id: i64, req: &UpdateRuleRequest) -> Result<(), String> {
    let mut sets: Vec<String> = Vec::new();

    if let Some(v) = &req.pattern { sets.push(format!("pattern = '{}'", v.replace('\'', "''"))); }
    if let Some(v) = &req.units { sets.push(format!("units = {}", opt_str_val(v))); }
    if let Some(v) = &req.object_types { sets.push(format!("object_types = {}", opt_str_val(v))); }
    if let Some(v) = &req.haystack_tags { sets.push(format!("haystack_tags = {}", opt_str_val(v))); }
    if let Some(v) = &req.brick_class { sets.push(format!("brick_class = {}", opt_str_val(v))); }
    if let Some(v) = &req.haystack_kind { sets.push(format!("haystack_kind = {}", opt_str_val(v))); }
    if let Some(v) = &req.haystack_unit { sets.push(format!("haystack_unit = {}", opt_str_val(v))); }
    if let Some(v) = req.enabled { sets.push(format!("enabled = {}", if v { 1 } else { 0 })); }
    if let Some(v) = req.priority { sets.push(format!("priority = {}", v)); }

    if sets.is_empty() {
        return Ok(());
    }

    sets.push("updated_at = datetime('now')".to_string());
    let sql = format!("UPDATE HAYSTACK_AUTO_TAGGING_RULES SET {} WHERE id = {}", sets.join(", "), id);

    db.execute(Statement::from_string(sea_orm::DatabaseBackend::Sqlite, &sql))
        .await
        .map_err(|e| format!("Failed to update rule: {}", e))?;

    Ok(())
}

pub async fn toggle_rule(db: &impl ConnectionTrait, id: i64) -> Result<bool, String> {
    let row = db
        .query_one(Statement::from_sql_and_values(
            sea_orm::DatabaseBackend::Sqlite,
            "SELECT enabled FROM HAYSTACK_AUTO_TAGGING_RULES WHERE id = ?",
            vec![id.into()],
        ))
        .await
        .map_err(|e| format!("Query failed: {}", e))?;

    let current = row.and_then(|r| r.try_get::<i32>("", "enabled").ok()).unwrap_or(1);
    let new_val = if current != 0 { 0 } else { 1 };

    db.execute(Statement::from_sql_and_values(
        sea_orm::DatabaseBackend::Sqlite,
        "UPDATE HAYSTACK_AUTO_TAGGING_RULES SET enabled = ?, updated_at = datetime('now') WHERE id = ?",
        vec![new_val.into(), id.into()],
    ))
    .await
    .map_err(|e| format!("Failed to toggle rule: {}", e))?;

    Ok(new_val != 0)
}

pub async fn delete_rule(db: &impl ConnectionTrait, id: i64) -> Result<(), String> {
    db.execute(Statement::from_sql_and_values(
        sea_orm::DatabaseBackend::Sqlite,
        "DELETE FROM HAYSTACK_AUTO_TAGGING_RULES WHERE id = ?",
        vec![id.into()],
    ))
    .await
    .map_err(|e| format!("Failed to delete rule: {}", e))?;
    Ok(())
}

// ── Auto-tagging Engine ──

/// Run auto-tagging for all points on the given devices.
/// Returns the number of points that were tagged.
pub async fn run_auto_tagging(
    db: &impl ConnectionTrait,
    serial_numbers: &[i32],
) -> Result<usize, String> {
    if serial_numbers.is_empty() {
        return Ok(0);
    }

    // Load all enabled rules (ordered by priority —lower = higher priority)
    let rules = list_enabled_rules(db).await
        .map_err(|e| format!("Failed to load rules: {}", e))?;

    if rules.is_empty() {
        return Ok(0);
    }

    // Split into haystack and brick rule sets
    let haystack_rules: Vec<CompiledRule> = rules.iter()
        .filter(|r| r.category == "haystack")
        .filter_map(|r| compile_rule(r))
        .collect();
    let brick_rules: Vec<CompiledRule> = rules.iter()
        .filter(|r| r.category == "brick")
        .filter_map(|r| compile_rule(r))
        .collect();

    let sn_list = serial_numbers.iter().map(|s| s.to_string()).collect::<Vec<_>>().join(",");
    let mut tagged_count = 0usize;

    // Process each point type
    tagged_count += process_points(db, &sn_list, "INPUTS", "INPUT", &haystack_rules, &brick_rules).await?;
    tagged_count += process_points(db, &sn_list, "OUTPUTS", "OUTPUT", &haystack_rules, &brick_rules).await?;
    tagged_count += process_points(db, &sn_list, "VARIABLES", "VARIABLE", &haystack_rules, &brick_rules).await?;

    Ok(tagged_count)
}

/// Preview what tags would be assigned without writing to DB.
pub async fn preview_auto_tagging(
    db: &impl ConnectionTrait,
    serial_numbers: &[i32],
) -> Result<Vec<TagMatch>, String> {
    if serial_numbers.is_empty() {
        return Ok(Vec::new());
    }

    let rules = list_enabled_rules(db).await
        .map_err(|e| format!("Failed to load rules: {}", e))?;

    let haystack_rules: Vec<CompiledRule> = rules.iter()
        .filter(|r| r.category == "haystack")
        .filter_map(|r| compile_rule(r))
        .collect();
    let brick_rules: Vec<CompiledRule> = rules.iter()
        .filter(|r| r.category == "brick")
        .filter_map(|r| compile_rule(r))
        .collect();

    let sn_list = serial_numbers.iter().map(|s| s.to_string()).collect::<Vec<_>>().join(",");
    let mut matches = Vec::new();

    matches.extend(preview_points(db, &sn_list, "INPUTS", "INPUT", &haystack_rules, &brick_rules).await?);
    matches.extend(preview_points(db, &sn_list, "OUTPUTS", "OUTPUT", &haystack_rules, &brick_rules).await?);
    matches.extend(preview_points(db, &sn_list, "VARIABLES", "VARIABLE", &haystack_rules, &brick_rules).await?);

    Ok(matches)
}

/// Clear auto-assigned tags for given devices (keeps manually-assigned tags).
pub async fn reset_auto_tags(
    db: &impl ConnectionTrait,
    serial_numbers: &[i32],
) -> Result<usize, String> {
    if serial_numbers.is_empty() {
        return Ok(0);
    }

    let sn_list = serial_numbers.iter().map(|s| s.to_string()).collect::<Vec<_>>().join(",");

    // Delete point tags that match our auto-tagging rules
    // (tags that were assigned by the auto-tagger)
    // We also reset brick_class to NULL for these points
    let sql = format!(
        "DELETE FROM haystack_point_tags WHERE serial_number IN ({})",
        sn_list
    );
    db.execute(Statement::from_string(sea_orm::DatabaseBackend::Sqlite, &sql))
        .await
        .map_err(|e| format!("Failed to reset tags: {}", e))?;

    // Also clear brick_class
    let sql = format!(
        "UPDATE HAYSTACK_POINT_TAGS SET brick_class = NULL WHERE serial_number IN ({})",
        sn_list
    );
    db.execute(Statement::from_string(sea_orm::DatabaseBackend::Sqlite, &sql))
        .await
        .map_err(|e| format!("Failed to reset brick class: {}", e))?;

    Ok(serial_numbers.len())
}

// ── Internal helpers ──

struct CompiledRule {
    id: i64,
    rule_name: String,
    category: String,
    regex: Regex,
    units_filter: Vec<String>,
    object_types_filter: Vec<String>,
    haystack_tags: Vec<String>,
    brick_class: Option<String>,
    haystack_kind: Option<String>,
    haystack_unit: Option<String>,
}

fn compile_rule(rule: &AutoTaggingRule) -> Option<CompiledRule> {
    let regex = Regex::new(&rule.pattern).ok()?;
    let units_filter = rule.units.as_ref()
        .map(|u| u.split(',').map(|s| s.trim().to_lowercase()).collect())
        .unwrap_or_default();
    let object_types_filter = rule.object_types.as_ref()
        .map(|o| o.split(',').map(|s| s.trim().to_lowercase()).collect())
        .unwrap_or_default();
    let haystack_tags = rule.haystack_tags.as_ref()
        .map(|t| t.split(',').map(|s| s.trim().to_string()).collect())
        .unwrap_or_default();

    Some(CompiledRule {
        id: rule.id,
        rule_name: rule.rule_name.clone(),
        category: rule.category.clone(),
        regex,
        units_filter,
        object_types_filter,
        haystack_tags,
        brick_class: rule.brick_class.clone(),
        haystack_kind: rule.haystack_kind.clone(),
        haystack_unit: rule.haystack_unit.clone(),
    })
}

fn eval_rules<'a>(
    label: &str,
    units: Option<&str>,
    object_type: Option<&str>,
    rules: &'a [CompiledRule],
) -> Option<&'a CompiledRule> {
    let units_lower = units.map(|u| u.to_lowercase());
    let ot_lower = object_type.map(|o| o.to_lowercase());

    for rule in rules {
        // Check regex match on label
        if !rule.regex.is_match(label) {
            continue;
        }
        // Check units filter (if rule has units, point must have one matching unit)
        if !rule.units_filter.is_empty() {
            if let Some(ref u) = units_lower {
                let matches = rule.units_filter.iter().any(|f| u.contains(f.as_str()));
                if !matches {
                    continue;
                }
            } else {
                continue; // rule requires units but point has none
            }
        }
        // Check object type filter
        if !rule.object_types_filter.is_empty() {
            if let Some(ref ot) = ot_lower {
                if !rule.object_types_filter.contains(ot) {
                    continue;
                }
            } else {
                continue; // rule requires object_type but point has none
            }
        }
        return Some(rule);
    }
    None
}

async fn list_enabled_rules(db: &impl ConnectionTrait) -> Result<Vec<AutoTaggingRule>, DbErr> {
    let rows = db
        .query_all(Statement::from_string(
            sea_orm::DatabaseBackend::Sqlite,
            "SELECT id, rule_name, category, pattern, units, object_types, haystack_tags,
                    brick_class, haystack_kind, haystack_unit, enabled, priority
             FROM HAYSTACK_AUTO_TAGGING_RULES WHERE enabled = 1 ORDER BY priority, id",
        ))
        .await?;

    Ok(rows
        .iter()
        .filter_map(|r| Some(AutoTaggingRule {
            id: r.try_get("", "id").ok()?,
            rule_name: r.try_get("", "rule_name").ok()?,
            category: r.try_get("", "category").unwrap_or_default(),
            pattern: r.try_get("", "pattern").ok()?,
            units: r.try_get("", "units").ok(),
            object_types: r.try_get("", "object_types").ok(),
            haystack_tags: r.try_get("", "haystack_tags").ok(),
            brick_class: r.try_get("", "brick_class").ok(),
            haystack_kind: r.try_get("", "haystack_kind").ok(),
            haystack_unit: r.try_get("", "haystack_unit").ok(),
            enabled: true,
            priority: r.try_get("", "priority").unwrap_or(0),
            created_at: None,
            updated_at: None,
        }))
        .collect())
}

async fn process_points(
    db: &impl ConnectionTrait,
    sn_list: &str,
    table: &str,
    point_type: &str,
    haystack_rules: &[CompiledRule],
    brick_rules: &[CompiledRule],
) -> Result<usize, String> {
    let col_index = match table {
        "INPUTS" => "Input_Index",
        "OUTPUTS" => "Output_Index",
        _ => "Variable_Index",
    };

    let sql = format!(
        "SELECT SerialNumber as sn, {} as idx, Full_Label, Label, Units
         FROM {} WHERE SerialNumber IN ({})",
        col_index, table, sn_list
    );

    let rows = db
        .query_all(Statement::from_string(sea_orm::DatabaseBackend::Sqlite, &sql))
        .await
        .map_err(|e| format!("Failed to read {}: {}", table, e))?;

    let mut tagged = 0usize;

    for row in &rows {
        let sn: i32 = row.try_get("", "sn").unwrap_or(0);
        let idx: i32 = row.try_get("", "idx").unwrap_or(0);
        let full_label: Option<String> = row.try_get("", "Full_Label").ok();
        let label: Option<String> = row.try_get("", "Label").ok();
        let units: Option<String> = row.try_get("", "Units").ok();

        let display_label = full_label.as_deref().or(label.as_deref()).unwrap_or("");

        let point_id = format!(
            "dev{}.{}{}",
            sn,
            match point_type { "INPUT" => "in", "OUTPUT" => "out", _ => "var" },
            idx
        );
        let idx_str = idx.to_string();

        // Apply haystack tags from first matching haystack rule
        if let Some(rule) = eval_rules(display_label, units.as_deref(), None, haystack_rules) {
            for tag in &rule.haystack_tags {
                db.execute(Statement::from_sql_and_values(
                    sea_orm::DatabaseBackend::Sqlite,
                    "INSERT OR IGNORE INTO haystack_point_tags (serial_number, point_type, point_index, point_id, tag_name) VALUES (?, ?, ?, ?, ?)",
                    vec![sn.into(), point_type.into(), idx_str.clone().into(), point_id.clone().into(), tag.clone().into()],
                ))
                .await
                .map_err(|e| format!("Failed to insert tag: {}", e))?;
            }
        }

        // Apply brick_class from first matching brick rule
        if let Some(rule) = eval_rules(display_label, units.as_deref(), None, brick_rules) {
            if let Some(ref bc) = rule.brick_class {
                db.execute(Statement::from_sql_and_values(
                    sea_orm::DatabaseBackend::Sqlite,
                    "INSERT OR REPLACE INTO haystack_point_tags (serial_number, point_type, point_index, point_id, tag_name, brick_class) VALUES (?, ?, ?, ?, '__brick_class__', ?)",
                    vec![sn.into(), point_type.into(), idx_str.clone().into(), point_id.clone().into(), bc.clone().into()],
                ))
                .await
                .map_err(|e| format!("Failed to set brick_class: {}", e))?;
            }
        }

        tagged += 1;
    }

    Ok(tagged)
}

async fn preview_points(
    db: &impl ConnectionTrait,
    sn_list: &str,
    table: &str,
    point_type: &str,
    haystack_rules: &[CompiledRule],
    brick_rules: &[CompiledRule],
) -> Result<Vec<TagMatch>, String> {
    let col_index = match table {
        "INPUTS" => "Input_Index",
        "OUTPUTS" => "Output_Index",
        _ => "Variable_Index",
    };

    let sql = format!(
        "SELECT SerialNumber as sn, {} as idx, Full_Label, Label, Units, Digital_Analog
         FROM {} WHERE SerialNumber IN ({})",
        col_index, table, sn_list
    );

    let rows = db
        .query_all(Statement::from_string(sea_orm::DatabaseBackend::Sqlite, &sql))
        .await
        .map_err(|e| format!("Failed to read {}: {}", table, e))?;

    let mut matches = Vec::new();

    for row in &rows {
        let sn: i32 = row.try_get("", "sn").unwrap_or(0);
        let idx: i32 = row.try_get("", "idx").unwrap_or(0);
        let full_label: Option<String> = row.try_get("", "Full_Label").ok();
        let label: Option<String> = row.try_get("", "Label").ok();
        let units: Option<String> = row.try_get("", "Units").ok();
        let da: Option<i32> = row.try_get("", "Digital_Analog").ok();

        let display_label = full_label.as_deref().or(label.as_deref()).unwrap_or("");

        let point_info = PointInfo {
            serial_number: sn,
            point_type: point_type.to_string(),
            point_index: idx,
            label: label.clone(),
            full_label: full_label.clone(),
            units: units.clone(),
            digital_analog: da,
            object_type: None,
        };

        // Find first matching haystack rule
        let hs_match = eval_rules(display_label, units.as_deref(), None, haystack_rules);
        // Find first matching brick rule
        let br_match = eval_rules(display_label, units.as_deref(), None, brick_rules);

        let combined_tags: Vec<String> = hs_match
            .map(|r| r.haystack_tags.clone())
            .unwrap_or_default();

        let brick_class = br_match.and_then(|r| r.brick_class.clone());
        let matched_rule = hs_match.map(|r| r.rule_name.clone())
            .or_else(|| br_match.map(|r| r.rule_name.clone()))
            .unwrap_or_default();

        if !combined_tags.is_empty() || brick_class.is_some() {
            matches.push(TagMatch {
                point: point_info,
                matched_rule,
                haystack_tags: combined_tags,
                brick_class,
                haystack_kind: hs_match.and_then(|r| r.haystack_kind.clone()),
                haystack_unit: hs_match.and_then(|r| r.haystack_unit.clone()),
            });
        }
    }

    Ok(matches)
}

fn opt_str(val: &Option<String>) -> String {
    match val {
        Some(v) => format!("'{}'", v.replace('\'', "''")),
        None => "NULL".to_string(),
    }
}

fn opt_str_val(val: &String) -> String {
    format!("'{}'", val.replace('\'', "''"))
}
