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
    pub category: String,       // "haystack" | "brick" | "range"
    pub pattern: Option<String>, // NULL for range rules
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
pub struct AffectedPoint {
    pub serial_number: i32,
    pub point_type: String,
    pub point_index: i32,
    pub label: Option<String>,
    pub full_label: Option<String>,
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
    #[serde(default)]
    pub rule_ids: Option<Vec<i64>>,
}

#[derive(Debug, Deserialize)]
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
             FROM HAYSTACK_AUTO_TAGGING_RULES
             ORDER BY CASE category WHEN 'haystack' THEN 1 WHEN 'brick' THEN 2 ELSE 3 END,
                      priority, COALESCE(point_type, ''), COALESCE(range_value, 0), id",
        ))
        .await?;

    Ok(rows
        .iter()
        .filter_map(|r| Some(AutoTaggingRule {
            id: r.try_get("", "id").ok()?,
            rule_name: r.try_get("", "rule_name").ok()?,
            category: r.try_get("", "category").unwrap_or_default(),
            pattern: r.try_get("", "pattern").ok(),
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

pub async fn delete_rule(db: &impl ConnectionTrait, id: i64, force: bool) -> Result<(), String> {
    if force {
        // Load the rule to get its tags and brick_class
        let rows = db
            .query_all(Statement::from_sql_and_values(
                sea_orm::DatabaseBackend::Sqlite,
                "SELECT category, haystack_tags, brick_class FROM HAYSTACK_AUTO_TAGGING_RULES WHERE id = ?",
                vec![id.into()],
            ))
            .await
            .map_err(|e| format!("Failed to load rule: {}", e))?;

        if let Some(row) = rows.first() {
            let category: String = row.try_get("", "category").unwrap_or_default();
            let haystack_tags: Option<String> = row.try_get("", "haystack_tags").ok();
            let brick_class: Option<String> = row.try_get("", "brick_class").ok();

            // For haystack rules: delete auto-assigned tags matching this rule's tag names
            if category == "haystack" {
                if let Some(ref tags) = haystack_tags {
                    for tag in tags.split(',') {
                        let tag = tag.trim();
                        if !tag.is_empty() {
                            db.execute(Statement::from_sql_and_values(
                                sea_orm::DatabaseBackend::Sqlite,
                                "DELETE FROM haystack_point_tags WHERE tag_name = ?",
                                vec![tag.into()],
                            )).await
                            .map_err(|e| format!("Failed to remove auto-assigned tag '{}': {}", tag, e))?;
                        }
                    }
                }
            }

            // For brick rules: delete auto-assigned brick_class entries
            if category == "brick" {
                if let Some(ref bc) = brick_class {
                    if !bc.is_empty() {
                        db.execute(Statement::from_sql_and_values(
                            sea_orm::DatabaseBackend::Sqlite,
                            "DELETE FROM HAYSTACK_POINT_BRICK_CLASS WHERE brick_class = ?",
                            vec![bc.clone().into()],
                        )).await
                        .map_err(|e| format!("Failed to remove auto-assigned brick_class '{}': {}", bc, e))?;
                    }
                }
            }
        }
    }

    db.execute(Statement::from_sql_and_values(
        sea_orm::DatabaseBackend::Sqlite,
        "DELETE FROM HAYSTACK_AUTO_TAGGING_RULES WHERE id = ?",
        vec![id.into()],
    ))
    .await
    .map_err(|e| format!("Failed to delete rule: {}", e))?;
    Ok(())
}

/// Delete all rules (used before a fresh re-sync).
pub async fn delete_all_rules(db: &impl ConnectionTrait) -> Result<u64, String> {
    db.execute(Statement::from_string(
        sea_orm::DatabaseBackend::Sqlite,
        "DELETE FROM HAYSTACK_AUTO_TAGGING_RULES",
    ))
    .await
    .map(|r| r.rows_affected())
    .map_err(|e| format!("Failed to delete all rules: {}", e))
}

/// Get points that are currently auto-tagged/brick-classified by this rule.
/// Queries haystack_point_tags and HAYSTACK_POINT_BRICK_CLASS directly
/// (by tag names / brick_class), not by regex against labels.
pub async fn get_rule_affected_points(
    db: &impl ConnectionTrait,
    id: i64,
) -> Result<(usize, Vec<AffectedPoint>), String> {
    let rows = db
        .query_all(Statement::from_sql_and_values(
            sea_orm::DatabaseBackend::Sqlite,
            "SELECT category, haystack_tags, brick_class FROM HAYSTACK_AUTO_TAGGING_RULES WHERE id = ?",
            vec![id.into()],
        ))
        .await
        .map_err(|e| format!("Failed to load rule: {}", e))?;

    let (category, haystack_tags, brick_class) = match rows.first() {
        Some(r) => {
            let cat: String = r.try_get("", "category").unwrap_or_default();
            let tags: Option<String> = r.try_get("", "haystack_tags").ok();
            let bc: Option<String> = r.try_get("", "brick_class").ok();
            (cat, tags, bc)
        }
        None => return Ok((0, vec![])),
    };

    let mut points: Vec<AffectedPoint> = Vec::new();
    let mut seen = std::collections::HashSet::new();

    // For haystack rules: find points with auto-assigned tags matching this rule
    if category == "haystack" {
        if let Some(ref tags_str) = haystack_tags {
            let tag_list: Vec<&str> = tags_str.split(',').map(|t| t.trim()).filter(|t| !t.is_empty()).collect();
            if !tag_list.is_empty() {
                let placeholders = tag_list.iter().map(|_| "?").collect::<Vec<_>>().join(",");
                let sql = format!(
                    "SELECT DISTINCT hpt.serial_number, hpt.point_type, CAST(hpt.point_index AS INTEGER) as point_index
                     FROM haystack_point_tags hpt
                     WHERE hpt.tag_name IN ({})
                     LIMIT 51",
                    placeholders
                );
                let mut params: Vec<sea_orm::Value> = tag_list.iter().map(|t| (*t).into()).collect();
                if let Ok(rows) = db.query_all(Statement::from_sql_and_values(
                    sea_orm::DatabaseBackend::Sqlite, &sql, params,
                )).await {
                    for r in &rows {
                        let sn: i32 = r.try_get("", "serial_number").unwrap_or(0);
                        let pt: String = r.try_get("", "point_type").unwrap_or_default();
                        let idx: i32 = r.try_get("", "point_index").unwrap_or(0);
                        let key = (sn, pt.clone(), idx);
                        if seen.insert(key) && points.len() < 50 {
                            let (label, full_label) = lookup_point_label(db, sn, &pt, idx).await;
                            points.push(AffectedPoint {
                                serial_number: sn,
                                point_type: pt,
                                point_index: idx,
                                label,
                                full_label,
                            });
                        }
                    }
                }
            }
        }
    }

    // For brick rules: find points with auto-assigned brick_class matching this rule
    if category == "brick" {
        if let Some(ref bc) = brick_class {
            if !bc.is_empty() {
                let sql = "SELECT serial_number, point_type, point_index FROM HAYSTACK_POINT_BRICK_CLASS WHERE brick_class = ? LIMIT 51";
                if let Ok(rows) = db.query_all(Statement::from_sql_and_values(
                    sea_orm::DatabaseBackend::Sqlite, sql,
                    vec![bc.clone().into()],
                )).await {
                    for r in &rows {
                        let sn: i32 = r.try_get("", "serial_number").unwrap_or(0);
                        let pt: String = r.try_get("", "point_type").unwrap_or_default();
                        let idx: i32 = r.try_get("", "point_index").unwrap_or(0);
                        let key = (sn, pt.clone(), idx);
                        if seen.insert(key) && points.len() < 50 {
                            let (label, full_label) = lookup_point_label(db, sn, &pt, idx).await;
                            points.push(AffectedPoint {
                                serial_number: sn,
                                point_type: pt,
                                point_index: idx,
                                label,
                                full_label,
                            });
                        }
                    }
                }
            }
        }
    }

    let count = points.len();
    Ok((count, points))
}

/// Look up a point's label from the device point tables.
async fn lookup_point_label(
    db: &impl ConnectionTrait,
    sn: i32,
    point_type: &str,
    idx: i32,
) -> (Option<String>, Option<String>) {
    let (table, idx_col) = match point_type {
        "INPUT" => ("INPUTS", "Input_Index"),
        "OUTPUT" => ("OUTPUTS", "Output_Index"),
        _ => ("VARIABLES", "Variable_Index"),
    };
    let sql = format!(
        "SELECT Full_Label, Label FROM {} WHERE SerialNumber = ? AND {} = ?",
        table, idx_col
    );
    if let Ok(rows) = db.query_all(Statement::from_sql_and_values(
        sea_orm::DatabaseBackend::Sqlite, &sql,
        vec![sn.into(), idx.into()],
    )).await {
        if let Some(r) = rows.first() {
            let full: Option<String> = r.try_get("", "Full_Label").ok();
            let label: Option<String> = r.try_get("", "Label").ok();
            return (label, full);
        }
    }
    (None, None)
}

// ── Auto-tagging Engine ──

/// Run auto-tagging for all points on the given devices.
/// Returns (count of tagged points, list of matched points).
pub async fn run_auto_tagging(
    db: &impl ConnectionTrait,
    serial_numbers: &[i32],
    rule_ids: Option<&[i64]>,
) -> Result<(usize, Vec<TagMatch>), String> {
    if serial_numbers.is_empty() {
        return Ok((0, Vec::new()));
    }

    // Load all enabled rules (optionally filtered by rule_ids)
    let mut rules = list_enabled_rules(db).await
        .map_err(|e| format!("Failed to load rules: {}", e))?;

    // If specific rule IDs are provided, filter to only those
    if let Some(ids) = rule_ids {
        let id_set: std::collections::HashSet<i64> = ids.iter().copied().collect();
        rules.retain(|r| id_set.contains(&r.id));
    }

    // Load range rules (metadata-based)
    let range_rules = load_range_rules(db).await
        .map_err(|e| format!("Failed to load range rules: {}", e))?;

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
    let mut all_matches = Vec::new();

    for table in &["INPUTS", "OUTPUTS", "VARIABLES"] {
        let pt = match *table { "INPUTS" => "INPUT", "OUTPUTS" => "OUTPUT", _ => "VARIABLE" };
        let (count, matches) = process_points(db, &sn_list, table, pt, &range_rules, &haystack_rules, &brick_rules).await?;
        tagged_count += count;
        all_matches.extend(matches);
    }

    Ok((tagged_count, all_matches))
}

/// Preview auto-tagging results: shows existing tags on points (from haystack_point_tags).
/// Groups tags by point and looks up labels from the point tables.
pub async fn preview_auto_tagging(
    db: &impl ConnectionTrait,
    serial_numbers: &[i32],
) -> Result<Vec<TagMatch>, String> {
    if serial_numbers.is_empty() {
        return Ok(Vec::new());
    }

    let sn_list = serial_numbers.iter().map(|s| s.to_string()).collect::<Vec<_>>().join(",");

    let sql = format!(
        "SELECT hpt.serial_number, hpt.point_type, hpt.point_index,
                GROUP_CONCAT(hpt.tag_name, ',') AS tags,
                pbc.brick_class,
                CASE hpt.point_type
                    WHEN 'INPUT' THEN (SELECT Full_Label FROM INPUTS WHERE SerialNumber = hpt.serial_number AND Input_Index = CAST(hpt.point_index AS INTEGER))
                    WHEN 'OUTPUT' THEN (SELECT Full_Label FROM OUTPUTS WHERE SerialNumber = hpt.serial_number AND Output_Index = CAST(hpt.point_index AS INTEGER))
                    WHEN 'VARIABLE' THEN (SELECT Full_Label FROM VARIABLES WHERE SerialNumber = hpt.serial_number AND Variable_Index = CAST(hpt.point_index AS INTEGER))
                END AS full_label,
                CASE hpt.point_type
                    WHEN 'INPUT' THEN (SELECT Label FROM INPUTS WHERE SerialNumber = hpt.serial_number AND Input_Index = CAST(hpt.point_index AS INTEGER))
                    WHEN 'OUTPUT' THEN (SELECT Label FROM OUTPUTS WHERE SerialNumber = hpt.serial_number AND Output_Index = CAST(hpt.point_index AS INTEGER))
                    WHEN 'VARIABLE' THEN (SELECT Label FROM VARIABLES WHERE SerialNumber = hpt.serial_number AND Variable_Index = CAST(hpt.point_index AS INTEGER))
                END AS label,
                CASE hpt.point_type
                    WHEN 'INPUT' THEN (SELECT Units FROM INPUTS WHERE SerialNumber = hpt.serial_number AND Input_Index = CAST(hpt.point_index AS INTEGER))
                    WHEN 'OUTPUT' THEN (SELECT Units FROM OUTPUTS WHERE SerialNumber = hpt.serial_number AND Output_Index = CAST(hpt.point_index AS INTEGER))
                    WHEN 'VARIABLE' THEN (SELECT Units FROM VARIABLES WHERE SerialNumber = hpt.serial_number AND Variable_Index = CAST(hpt.point_index AS INTEGER))
                END AS units
         FROM haystack_point_tags hpt
         LEFT JOIN HAYSTACK_POINT_BRICK_CLASS pbc
            ON pbc.serial_number = hpt.serial_number
           AND pbc.point_type = hpt.point_type
           AND pbc.point_index = CAST(hpt.point_index AS INTEGER)
         WHERE hpt.serial_number IN ({})
         GROUP BY hpt.serial_number, hpt.point_type, hpt.point_index
         ORDER BY hpt.serial_number, hpt.point_type, hpt.point_index",
        sn_list
    );

    let rows = db
        .query_all(Statement::from_string(sea_orm::DatabaseBackend::Sqlite, &sql))
        .await
        .map_err(|e| format!("Failed to query tagged points: {}", e))?;

    let mut matches = Vec::new();
    for row in &rows {
        let sn: i32 = row.try_get("", "serial_number").unwrap_or(0);
        let pt: String = row.try_get("", "point_type").unwrap_or_default();
        let idx_str: String = row.try_get("", "point_index").unwrap_or_default();
        let idx: i32 = idx_str.parse().unwrap_or(0);
        let tags_str: String = row.try_get("", "tags").unwrap_or_default();
        let brick_class: Option<String> = row.try_get("", "brick_class").ok().flatten();
        let full_label: Option<String> = row.try_get("", "full_label").ok().flatten();
        let label: Option<String> = row.try_get("", "label").ok().flatten();
        let units: Option<String> = row.try_get("", "units").ok().flatten();

        let haystack_tags: Vec<String> = if tags_str.is_empty() {
            Vec::new()
        } else {
            tags_str.split(',').map(|t| t.trim().to_string()).filter(|t| !t.is_empty()).collect()
        };

        matches.push(TagMatch {
            point: PointInfo {
                serial_number: sn,
                point_type: pt,
                point_index: idx,
                label,
                full_label,
                units,
                digital_analog: None,
                object_type: None,
            },
            matched_rule: String::new(),
            haystack_tags,
            brick_class,
            haystack_kind: None,
            haystack_unit: None,
        });
    }

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

    // Delete only auto-assigned tags (preserve manual tags)
    let sql = format!(
        "DELETE FROM haystack_point_tags WHERE serial_number IN ({}) AND auto_assigned = 1",
        sn_list
    );
    db.execute(Statement::from_string(sea_orm::DatabaseBackend::Sqlite, &sql))
        .await
        .map_err(|e| format!("Failed to reset tags: {}", e))?;

    // Also clear auto-assigned brick classes (preserve manual ones)
    let sql = format!(
        "DELETE FROM HAYSTACK_POINT_BRICK_CLASS WHERE serial_number IN ({}) AND auto_assigned = 1",
        sn_list
    );
    db.execute(Statement::from_string(sea_orm::DatabaseBackend::Sqlite, &sql))
        .await
        .map_err(|e| format!("Failed to reset brick class: {}", e))?;

    Ok(serial_numbers.len())
}

/// Get brick classes for given devices (all — auto and manual).
pub async fn get_brick_classes(
    db: &impl ConnectionTrait,
    serial_numbers: &[i32],
) -> Result<Vec<serde_json::Value>, String> {
    if serial_numbers.is_empty() {
        return Ok(vec![]);
    }
    let sn_list = serial_numbers.iter().map(|s| s.to_string()).collect::<Vec<_>>().join(",");
    let sql = format!(
        "SELECT serial_number, point_type, point_index, brick_class FROM HAYSTACK_POINT_BRICK_CLASS WHERE serial_number IN ({})",
        sn_list
    );
    let rows = db
        .query_all(Statement::from_string(sea_orm::DatabaseBackend::Sqlite, &sql))
        .await
        .map_err(|e| format!("Failed to query brick classes: {}", e))?;
    let entries: Vec<serde_json::Value> = rows
        .iter()
        .filter_map(|r| {
            let sn: i32 = r.try_get("", "serial_number").ok()?;
            let pt: String = r.try_get("", "point_type").ok()?;
            let pi: i32 = r.try_get("", "point_index").ok()?;
            let bc: String = r.try_get("", "brick_class").ok()?;
            Some(serde_json::json!({
                "serial_number": sn,
                "point_type": pt,
                "point_index": pi,
                "brick_class": bc,
            }))
        })
        .collect();
    Ok(entries)
}

// ── Sync Rules from Brick Official (GitHub) ──

const GITHUB_BRICK_URL: &str =
    "https://raw.githubusercontent.com/qnst/brick-bacnet-mcp/main/src/brick_bacnet_mcp/rules/brick_rules.yaml";
const GITHUB_HAYSTACK_URL: &str =
    "https://raw.githubusercontent.com/qnst/brick-bacnet-mcp/main/src/brick_bacnet_mcp/rules/haystack_rules.yaml";

#[derive(Debug, Deserialize)]
struct YamlRule {
    id: String,
    pattern: String,
    #[serde(default)]
    units: Vec<String>,
    #[serde(default)]
    object_types: Vec<String>,
    #[serde(default)]
    brick_class: Option<String>,
    #[serde(default)]
    haystack_tags: Option<Vec<String>>,
    #[serde(default)]
    haystack_kind: Option<String>,
    #[serde(default)]
    haystack_unit: Option<String>,
}

// ── Built-in seed rules (mirrors migration m20260715) ──

struct BuiltinRule {
    rule_name: &'static str,
    category: &'static str,
    pattern: &'static str,
    units: Option<&'static str>,
    object_types: Option<&'static str>,
    haystack_tags: Option<&'static str>,
    brick_class: Option<&'static str>,
    haystack_kind: Option<&'static str>,
    haystack_unit: Option<&'static str>,
}

static BUILTIN_RULES: &[BuiltinRule] = &[
    BuiltinRule { rule_name: "brick:oat", category: "brick", pattern: "(?i)(?<![A-Za-z])(oat|outside[_ ]?air[_ ]?temp|outsideair|oa[_ ]?temp)(?![A-Za-z])", units: Some("degF,degC,°F,°C,fahrenheit,celsius"), object_types: None, haystack_tags: None, brick_class: Some("Outside_Air_Temperature_Sensor"), haystack_kind: None, haystack_unit: None },
    BuiltinRule { rule_name: "brick:oah", category: "brick", pattern: "(?i)(?<![A-Za-z])(oah|outside[_ ]?air[_ ]?(humidity|rh)|outsideairhumidity)(?![A-Za-z])", units: Some("%,percent,percentRelativeHumidity"), object_types: None, haystack_tags: None, brick_class: Some("Outside_Air_Humidity_Sensor"), haystack_kind: None, haystack_unit: None },
    BuiltinRule { rule_name: "brick:mat", category: "brick", pattern: "(?i)(?<![A-Za-z])(mat|mixed[_ ]?air[_ ]?temp|mixedairtemp)(?![A-Za-z])", units: None, object_types: None, haystack_tags: None, brick_class: Some("Mixed_Air_Temperature_Sensor"), haystack_kind: None, haystack_unit: None },
    BuiltinRule { rule_name: "brick:mad", category: "brick", pattern: "(?i)(?<![A-Za-z])(mad|mixed[_ ]?air[_ ]?damper|oa[_ ]?damper|outside[_ ]?air[_ ]?damper)(?![A-Za-z])", units: None, object_types: None, haystack_tags: None, brick_class: Some("Outside_Air_Damper"), haystack_kind: None, haystack_unit: None },
    BuiltinRule { rule_name: "brick:dat", category: "brick", pattern: "(?i)(?<![A-Za-z])(dat|discharge[_ ]?air[_ ]?temp|sat|supply[_ ]?air[_ ]?temp)(?![A-Za-z])", units: Some("degF,degC,°F,°C,fahrenheit,celsius"), object_types: None, haystack_tags: None, brick_class: Some("Supply_Air_Temperature_Sensor"), haystack_kind: None, haystack_unit: None },
    BuiltinRule { rule_name: "brick:saf", category: "brick", pattern: "(?i)(?<![A-Za-z])(saf|supply[_ ]?air[_ ]?flow|supply[_ ]?fan[_ ]?airflow)(?![A-Za-z])", units: None, object_types: None, haystack_tags: None, brick_class: Some("Supply_Air_Flow_Sensor"), haystack_kind: None, haystack_unit: None },
    BuiltinRule { rule_name: "brick:supply_fan", category: "brick", pattern: "(?i)(?<![A-Za-z])(supply[_ ]?fan|sa[_ ]?fan|sf)(?![A-Za-z])", units: None, object_types: Some("binary-input,binary-output,binary-value,multi-state-input,multi-state-output"), haystack_tags: None, brick_class: Some("Supply_Fan"), haystack_kind: None, haystack_unit: None },
    BuiltinRule { rule_name: "brick:rat", category: "brick", pattern: "(?i)(?<![A-Za-z])(rat|return[_ ]?air[_ ]?temp)(?![A-Za-z])", units: Some("degF,degC,°F,°C,fahrenheit,celsius"), object_types: None, haystack_tags: None, brick_class: Some("Return_Air_Temperature_Sensor"), haystack_kind: None, haystack_unit: None },
    BuiltinRule { rule_name: "brick:rah", category: "brick", pattern: "(?i)(?<![A-Za-z])(rah|return[_ ]?air[_ ]?(humidity|rh))(?![A-Za-z])", units: Some("%,percent"), object_types: None, haystack_tags: None, brick_class: Some("Return_Air_Humidity_Sensor"), haystack_kind: None, haystack_unit: None },
    BuiltinRule { rule_name: "brick:return_fan", category: "brick", pattern: "(?i)(?<![A-Za-z])(return[_ ]?fan|ra[_ ]?fan|rf)(?![A-Za-z])", units: None, object_types: None, haystack_tags: None, brick_class: Some("Return_Fan"), haystack_kind: None, haystack_unit: None },
    BuiltinRule { rule_name: "brick:zone_temp", category: "brick", pattern: "(?i)(?<![A-Za-z])(zone[_ ]?temp|znt|space[_ ]?temp|room[_ ]?temp|rmt)(?![A-Za-z])", units: Some("degF,degC,°F,°C,fahrenheit,celsius"), object_types: None, haystack_tags: None, brick_class: Some("Zone_Air_Temperature_Sensor"), haystack_kind: None, haystack_unit: None },
    BuiltinRule { rule_name: "brick:zone_setpoint", category: "brick", pattern: "(?i)(?<![A-Za-z])(zone[_ ]?(temp[_ ]?)?(setpoint|sp|stpt)|znsp)(?![A-Za-z])", units: None, object_types: None, haystack_tags: None, brick_class: Some("Zone_Air_Temperature_Setpoint"), haystack_kind: None, haystack_unit: None },
    BuiltinRule { rule_name: "brick:zone_humidity", category: "brick", pattern: "(?i)(?<![A-Za-z])(zone[_ ]?(humidity|rh)|space[_ ]?humidity)(?![A-Za-z])", units: None, object_types: None, haystack_tags: None, brick_class: Some("Zone_Air_Humidity_Sensor"), haystack_kind: None, haystack_unit: None },
    BuiltinRule { rule_name: "brick:zone_co2", category: "brick", pattern: "(?i)(?<![A-Za-z])(zone[_ ]?co2|co2|space[_ ]?co2)(?![A-Za-z])", units: Some("ppm,partsPerMillion"), object_types: None, haystack_tags: None, brick_class: Some("CO2_Sensor"), haystack_kind: None, haystack_unit: None },
    BuiltinRule { rule_name: "brick:occ_sensor", category: "brick", pattern: "(?i)(?<![A-Za-z])(occupancy|occ[_ ]?sensor|occupied)(?![A-Za-z])", units: None, object_types: Some("binary-input,binary-value,multi-state-input,multi-state-value"), haystack_tags: None, brick_class: Some("Occupancy_Sensor"), haystack_kind: None, haystack_unit: None },
    BuiltinRule { rule_name: "brick:vav_damper", category: "brick", pattern: "(?i)(?<![A-Za-z])(vav[_ ]?damper|damper[_ ]?pos(ition)?|dpr[_ ]?pos)(?![A-Za-z])", units: None, object_types: None, haystack_tags: None, brick_class: Some("Damper_Position_Sensor"), haystack_kind: None, haystack_unit: None },
    BuiltinRule { rule_name: "brick:vav_airflow", category: "brick", pattern: "(?i)(?<![A-Za-z])(vav[_ ]?(airflow|flow)|box[_ ]?airflow)(?![A-Za-z])", units: None, object_types: None, haystack_tags: None, brick_class: Some("Supply_Air_Flow_Sensor"), haystack_kind: None, haystack_unit: None },
    BuiltinRule { rule_name: "brick:reheat_valve", category: "brick", pattern: "(?i)(?<![A-Za-z])(reheat[_ ]?valve|rh[_ ]?valve|hw[_ ]?valve[_ ]?pos)(?![A-Za-z])", units: None, object_types: None, haystack_tags: None, brick_class: Some("Reheat_Valve"), haystack_kind: None, haystack_unit: None },
    BuiltinRule { rule_name: "brick:chw_supply", category: "brick", pattern: "(?i)(?<![A-Za-z])(chw[_ ]?supply|chws[_ ]?temp|chilled[_ ]?water[_ ]?supply)(?![A-Za-z])", units: Some("degF,degC,°F,°C,fahrenheit,celsius"), object_types: None, haystack_tags: None, brick_class: Some("Chilled_Water_Supply_Temperature_Sensor"), haystack_kind: None, haystack_unit: None },
    BuiltinRule { rule_name: "brick:chw_return", category: "brick", pattern: "(?i)(?<![A-Za-z])(chw[_ ]?return|chwr[_ ]?temp|chilled[_ ]?water[_ ]?return)(?![A-Za-z])", units: Some("degF,degC,°F,°C,fahrenheit,celsius"), object_types: None, haystack_tags: None, brick_class: Some("Chilled_Water_Return_Temperature_Sensor"), haystack_kind: None, haystack_unit: None },
    BuiltinRule { rule_name: "brick:hw_supply", category: "brick", pattern: "(?i)(?<![A-Za-z])(hw[_ ]?supply|hws[_ ]?temp|hot[_ ]?water[_ ]?supply)(?![A-Za-z])", units: Some("degF,degC,°F,°C,fahrenheit,celsius"), object_types: None, haystack_tags: None, brick_class: Some("Hot_Water_Supply_Temperature_Sensor"), haystack_kind: None, haystack_unit: None },
    BuiltinRule { rule_name: "brick:hw_return", category: "brick", pattern: "(?i)(?<![A-Za-z])(hw[_ ]?return|hwr[_ ]?temp|hot[_ ]?water[_ ]?return)(?![A-Za-z])", units: Some("degF,degC,°F,°C,fahrenheit,celsius"), object_types: None, haystack_tags: None, brick_class: Some("Hot_Water_Return_Temperature_Sensor"), haystack_kind: None, haystack_unit: None },
    BuiltinRule { rule_name: "brick:chiller_status", category: "brick", pattern: "(?i)(?<![A-Za-z])(chiller[_ ]?(status|state|run))(?![A-Za-z])", units: None, object_types: Some("binary-input,binary-value,multi-state-input,multi-state-value"), haystack_tags: None, brick_class: Some("Chiller_Status"), haystack_kind: None, haystack_unit: None },
    BuiltinRule { rule_name: "brick:boiler_status", category: "brick", pattern: "(?i)(?<![A-Za-z])(boiler[_ ]?(status|state|run))(?![A-Za-z])", units: None, object_types: Some("binary-input,binary-value,multi-state-input,multi-state-value"), haystack_tags: None, brick_class: Some("Boiler_Status"), haystack_kind: None, haystack_unit: None },
    BuiltinRule { rule_name: "brick:chw_pump", category: "brick", pattern: "(?i)(?<![A-Za-z])(chw[_ ]?pump|chilled[_ ]?water[_ ]?pump)(?![A-Za-z])", units: None, object_types: None, haystack_tags: None, brick_class: Some("Chilled_Water_Pump"), haystack_kind: None, haystack_unit: None },
    BuiltinRule { rule_name: "brick:hw_pump", category: "brick", pattern: "(?i)(?<![A-Za-z])(hw[_ ]?pump|hot[_ ]?water[_ ]?pump)(?![A-Za-z])", units: None, object_types: None, haystack_tags: None, brick_class: Some("Hot_Water_Pump"), haystack_kind: None, haystack_unit: None },
    BuiltinRule { rule_name: "brick:light_status", category: "brick", pattern: "(?i)(?<![A-Za-z])(light[_ ]?(status|state)|lighting[_ ]?status|luminaire[_ ]?status)(?![A-Za-z])", units: None, object_types: Some("binary-input,binary-output,binary-value"), haystack_tags: None, brick_class: Some("Luminaire_Status"), haystack_kind: None, haystack_unit: None },
    BuiltinRule { rule_name: "brick:light_dim", category: "brick", pattern: "(?i)(?<![A-Za-z])(dim(ming)?[_ ]?(level|setpoint|sp)|light[_ ]?level)(?![A-Za-z])", units: None, object_types: None, haystack_tags: None, brick_class: Some("Luminaire_Dimming_Level_Sensor"), haystack_kind: None, haystack_unit: None },
    BuiltinRule { rule_name: "brick:electric_meter", category: "brick", pattern: "(?i)(?<![A-Za-z])(electric[_ ]?(meter|kwh|consumption)|kwh[_ ]?meter|power[_ ]?meter)(?![A-Za-z])", units: Some("kWh,Wh,MWh,kW,watt,kilowatt"), object_types: None, haystack_tags: None, brick_class: Some("Electrical_Power_Sensor"), haystack_kind: None, haystack_unit: None },
    BuiltinRule { rule_name: "brick:water_meter", category: "brick", pattern: "(?i)(?<![A-Za-z])(water[_ ]?(meter|consumption|flow))(?![A-Za-z])", units: Some("gallons,liters,m3,gpm,L/s"), object_types: None, haystack_tags: None, brick_class: Some("Water_Flow_Sensor"), haystack_kind: None, haystack_unit: None },
    BuiltinRule { rule_name: "brick:gas_meter", category: "brick", pattern: "(?i)(?<![A-Za-z])(gas[_ ]?(meter|consumption|flow))(?![A-Za-z])", units: Some("therms,kBtu,cf,cfm,m3"), object_types: None, haystack_tags: None, brick_class: Some("Gas_Flow_Sensor"), haystack_kind: None, haystack_unit: None },
    BuiltinRule { rule_name: "brick:ahu", category: "brick", pattern: "(?i)(?<![A-Za-z])(ahu|air[_ ]?handler|air[_ ]?handling[_ ]?unit)(?![A-Za-z])", units: None, object_types: None, haystack_tags: None, brick_class: Some("AHU"), haystack_kind: None, haystack_unit: None },
    BuiltinRule { rule_name: "brick:rtu", category: "brick", pattern: "(?i)(?<![A-Za-z])(rtu|rooftop[_ ]?unit|roof[_ ]?top[_ ]?unit)(?![A-Za-z])", units: None, object_types: None, haystack_tags: None, brick_class: Some("RTU"), haystack_kind: None, haystack_unit: None },
    BuiltinRule { rule_name: "brick:fcu", category: "brick", pattern: "(?i)(?<![A-Za-z])(fcu|fan[_ ]?coil[_ ]?unit)(?![A-Za-z])", units: None, object_types: None, haystack_tags: None, brick_class: Some("FCU"), haystack_kind: None, haystack_unit: None },
    BuiltinRule { rule_name: "brick:duct_pressure", category: "brick", pattern: "(?i)(?<![A-Za-z])(duct[_ ]?(static[_ ]?)?pressure|dsp|static[_ ]?pressure)(?![A-Za-z])", units: Some("inWC,\"wc,inH2O,Pa,kPa"), object_types: None, haystack_tags: None, brick_class: Some("Static_Pressure_Sensor"), haystack_kind: None, haystack_unit: None },
    BuiltinRule { rule_name: "brick:building_pressure", category: "brick", pattern: "(?i)(?<![A-Za-z])(building[_ ]?pressure|bldg[_ ]?pressure)(?![A-Za-z])", units: None, object_types: None, haystack_tags: None, brick_class: Some("Building_Air_Static_Pressure_Sensor"), haystack_kind: None, haystack_unit: None },
    BuiltinRule { rule_name: "brick:generic_temp", category: "brick", pattern: "(?i)(?<![A-Za-z])(temp(erature)?|tmp)(?![A-Za-z])", units: Some("degF,degC,°F,°C,fahrenheit,celsius"), object_types: None, haystack_tags: None, brick_class: Some("Air_Temperature_Sensor"), haystack_kind: None, haystack_unit: None },
    BuiltinRule { rule_name: "hs:oat", category: "haystack", pattern: "(?i)(?<![A-Za-z])(oat|outside[_ ]?air[_ ]?temp|outsideair|oa[_ ]?temp)(?![A-Za-z])", units: Some("degF,degC,°F,°C,fahrenheit,celsius"), object_types: None, haystack_tags: Some("point,sensor,outside,air,temp"), brick_class: None, haystack_kind: Some("Number"), haystack_unit: Some("°F") },
    BuiltinRule { rule_name: "hs:oah", category: "haystack", pattern: "(?i)(?<![A-Za-z])(oah|outside[_ ]?air[_ ]?(humidity|rh))(?![A-Za-z])", units: Some("%,percent"), object_types: None, haystack_tags: Some("point,sensor,outside,air,humidity"), brick_class: None, haystack_kind: Some("Number"), haystack_unit: Some("%") },
    BuiltinRule { rule_name: "hs:mat", category: "haystack", pattern: "(?i)(?<![A-Za-z])(mat|mixed[_ ]?air[_ ]?temp)(?![A-Za-z])", units: None, object_types: None, haystack_tags: Some("point,sensor,mixed,air,temp"), brick_class: None, haystack_kind: Some("Number"), haystack_unit: Some("°F") },
    BuiltinRule { rule_name: "hs:dat", category: "haystack", pattern: "(?i)(?<![A-Za-z])(dat|discharge[_ ]?air[_ ]?temp|sat|supply[_ ]?air[_ ]?temp)(?![A-Za-z])", units: Some("degF,degC,°F,°C,fahrenheit,celsius"), object_types: None, haystack_tags: Some("point,sensor,discharge,air,temp"), brick_class: None, haystack_kind: Some("Number"), haystack_unit: Some("°F") },
    BuiltinRule { rule_name: "hs:saf", category: "haystack", pattern: "(?i)(?<![A-Za-z])(saf|supply[_ ]?air[_ ]?flow)(?![A-Za-z])", units: None, object_types: None, haystack_tags: Some("point,sensor,supply,air,flow"), brick_class: None, haystack_kind: Some("Number"), haystack_unit: Some("cfm") },
    BuiltinRule { rule_name: "hs:supply_fan", category: "haystack", pattern: "(?i)(?<![A-Za-z])(supply[_ ]?fan|sa[_ ]?fan|sf)(?![A-Za-z])", units: None, object_types: Some("binary-input,binary-output,binary-value"), haystack_tags: Some("point,sensor,supply,fan,run,cmd"), brick_class: None, haystack_kind: Some("Bool"), haystack_unit: None },
    BuiltinRule { rule_name: "hs:rat", category: "haystack", pattern: "(?i)(?<![A-Za-z])(rat|return[_ ]?air[_ ]?temp)(?![A-Za-z])", units: Some("degF,degC,°F,°C,fahrenheit,celsius"), object_types: None, haystack_tags: Some("point,sensor,return,air,temp"), brick_class: None, haystack_kind: Some("Number"), haystack_unit: Some("°F") },
    BuiltinRule { rule_name: "hs:zone_temp", category: "haystack", pattern: "(?i)(?<![A-Za-z])(zone[_ ]?temp|znt|space[_ ]?temp|room[_ ]?temp)(?![A-Za-z])", units: Some("degF,degC,°F,°C,fahrenheit,celsius"), object_types: None, haystack_tags: Some("point,sensor,zone,air,temp"), brick_class: None, haystack_kind: Some("Number"), haystack_unit: Some("°F") },
    BuiltinRule { rule_name: "hs:zone_setpoint", category: "haystack", pattern: "(?i)(?<![A-Za-z])(zone[_ ]?(temp[_ ]?)?(setpoint|sp|stpt))(?![A-Za-z])", units: None, object_types: None, haystack_tags: Some("point,sp,zone,air,temp"), brick_class: None, haystack_kind: Some("Number"), haystack_unit: Some("°F") },
    BuiltinRule { rule_name: "hs:zone_co2", category: "haystack", pattern: "(?i)(?<![A-Za-z])(zone[_ ]?co2|co2)(?![A-Za-z])", units: Some("ppm"), object_types: None, haystack_tags: Some("point,sensor,zone,air,co2,concentration"), brick_class: None, haystack_kind: Some("Number"), haystack_unit: Some("ppm") },
    BuiltinRule { rule_name: "hs:occ", category: "haystack", pattern: "(?i)(?<![A-Za-z])(occupancy|occ[_ ]?sensor|occupied)(?![A-Za-z])", units: None, object_types: Some("binary-input,binary-value"), haystack_tags: Some("point,sensor,occupied"), brick_class: None, haystack_kind: Some("Bool"), haystack_unit: None },
    BuiltinRule { rule_name: "hs:vav_damper", category: "haystack", pattern: "(?i)(?<![A-Za-z])(vav[_ ]?damper|damper[_ ]?pos|dpr[_ ]?pos)(?![A-Za-z])", units: None, object_types: None, haystack_tags: Some("point,sensor,damper,position"), brick_class: None, haystack_kind: Some("Number"), haystack_unit: Some("%") },
    BuiltinRule { rule_name: "hs:reheat_valve", category: "haystack", pattern: "(?i)(?<![A-Za-z])(reheat[_ ]?valve|rh[_ ]?valve|hw[_ ]?valve[_ ]?pos)(?![A-Za-z])", units: None, object_types: None, haystack_tags: Some("point,sensor,reheat,valve,position"), brick_class: None, haystack_kind: Some("Number"), haystack_unit: Some("%") },
    BuiltinRule { rule_name: "hs:chw_supply", category: "haystack", pattern: "(?i)(?<![A-Za-z])(chw[_ ]?supply|chws[_ ]?temp|chilled[_ ]?water[_ ]?supply)(?![A-Za-z])", units: None, object_types: None, haystack_tags: Some("point,sensor,chilled,water,supply,temp"), brick_class: None, haystack_kind: Some("Number"), haystack_unit: Some("°F") },
    BuiltinRule { rule_name: "hs:chw_return", category: "haystack", pattern: "(?i)(?<![A-Za-z])(chw[_ ]?return|chwr[_ ]?temp)(?![A-Za-z])", units: None, object_types: None, haystack_tags: Some("point,sensor,chilled,water,return,temp"), brick_class: None, haystack_kind: Some("Number"), haystack_unit: Some("°F") },
    BuiltinRule { rule_name: "hs:hw_supply", category: "haystack", pattern: "(?i)(?<![A-Za-z])(hw[_ ]?supply|hws[_ ]?temp|hot[_ ]?water[_ ]?supply)(?![A-Za-z])", units: None, object_types: None, haystack_tags: Some("point,sensor,hot,water,supply,temp"), brick_class: None, haystack_kind: Some("Number"), haystack_unit: Some("°F") },
    BuiltinRule { rule_name: "hs:hw_return", category: "haystack", pattern: "(?i)(?<![A-Za-z])(hw[_ ]?return|hwr[_ ]?temp)(?![A-Za-z])", units: None, object_types: None, haystack_tags: Some("point,sensor,hot,water,return,temp"), brick_class: None, haystack_kind: Some("Number"), haystack_unit: Some("°F") },
    BuiltinRule { rule_name: "hs:chiller_status", category: "haystack", pattern: "(?i)(?<![A-Za-z])(chiller[_ ]?(status|state|run))(?![A-Za-z])", units: None, object_types: Some("binary-input,binary-value"), haystack_tags: Some("point,sensor,chiller,run"), brick_class: None, haystack_kind: Some("Bool"), haystack_unit: None },
    BuiltinRule { rule_name: "hs:boiler_status", category: "haystack", pattern: "(?i)(?<![A-Za-z])(boiler[_ ]?(status|state|run))(?![A-Za-z])", units: None, object_types: Some("binary-input,binary-value"), haystack_tags: Some("point,sensor,boiler,run"), brick_class: None, haystack_kind: Some("Bool"), haystack_unit: None },
    BuiltinRule { rule_name: "hs:chw_pump", category: "haystack", pattern: "(?i)(?<![A-Za-z])(chw[_ ]?pump|chilled[_ ]?water[_ ]?pump)(?![A-Za-z])", units: None, object_types: None, haystack_tags: Some("point,sensor,chilled,water,pump,run"), brick_class: None, haystack_kind: Some("Bool"), haystack_unit: None },
    BuiltinRule { rule_name: "hs:hw_pump", category: "haystack", pattern: "(?i)(?<![A-Za-z])(hw[_ ]?pump|hot[_ ]?water[_ ]?pump)(?![A-Za-z])", units: None, object_types: None, haystack_tags: Some("point,sensor,hot,water,pump,run"), brick_class: None, haystack_kind: Some("Bool"), haystack_unit: None },
    BuiltinRule { rule_name: "hs:light_status", category: "haystack", pattern: "(?i)(?<![A-Za-z])(light[_ ]?(status|state)|luminaire[_ ]?status)(?![A-Za-z])", units: None, object_types: Some("binary-input,binary-output,binary-value"), haystack_tags: Some("point,sensor,lighting,run"), brick_class: None, haystack_kind: Some("Bool"), haystack_unit: None },
    BuiltinRule { rule_name: "hs:light_dim", category: "haystack", pattern: "(?i)(?<![A-Za-z])(dim(ming)?[_ ]?(level|setpoint|sp)|light[_ ]?level)(?![A-Za-z])", units: None, object_types: None, haystack_tags: Some("point,sensor,lighting,level"), brick_class: None, haystack_kind: Some("Number"), haystack_unit: Some("%") },
    BuiltinRule { rule_name: "hs:electric_meter", category: "haystack", pattern: "(?i)(?<![A-Za-z])(electric[_ ]?(meter|kwh|consumption)|kwh[_ ]?meter|power[_ ]?meter)(?![A-Za-z])", units: Some("kWh,Wh,MWh,kW,watt,kilowatt"), object_types: None, haystack_tags: Some("point,sensor,elec,energy,meter"), brick_class: None, haystack_kind: Some("Number"), haystack_unit: Some("kWh") },
    BuiltinRule { rule_name: "hs:water_meter", category: "haystack", pattern: "(?i)(?<![A-Za-z])(water[_ ]?(meter|consumption|flow))(?![A-Za-z])", units: Some("gallons,liters,m3"), object_types: None, haystack_tags: Some("point,sensor,water,volume,meter"), brick_class: None, haystack_kind: Some("Number"), haystack_unit: Some("gallons") },
    BuiltinRule { rule_name: "hs:gas_meter", category: "haystack", pattern: "(?i)(?<![A-Za-z])(gas[_ ]?(meter|consumption|flow))(?![A-Za-z])", units: Some("therms,kBtu,cf"), object_types: None, haystack_tags: Some("point,sensor,gas,volume,meter"), brick_class: None, haystack_kind: Some("Number"), haystack_unit: Some("therms") },
    BuiltinRule { rule_name: "hs:ahu", category: "haystack", pattern: "(?i)(?<![A-Za-z])(ahu|air[_ ]?handler|air[_ ]?handling[_ ]?unit)(?![A-Za-z])", units: None, object_types: None, haystack_tags: Some("equip,ahu"), brick_class: None, haystack_kind: Some("Marker"), haystack_unit: None },
    BuiltinRule { rule_name: "hs:rtu", category: "haystack", pattern: "(?i)(?<![A-Za-z])(rtu|rooftop[_ ]?unit)(?![A-Za-z])", units: None, object_types: None, haystack_tags: Some("equip,rtu"), brick_class: None, haystack_kind: Some("Marker"), haystack_unit: None },
    BuiltinRule { rule_name: "hs:fcu", category: "haystack", pattern: "(?i)(?<![A-Za-z])(fcu|fan[_ ]?coil[_ ]?unit)(?![A-Za-z])", units: None, object_types: None, haystack_tags: Some("equip,fcu"), brick_class: None, haystack_kind: Some("Marker"), haystack_unit: None },
    BuiltinRule { rule_name: "hs:duct_pressure", category: "haystack", pattern: "(?i)(?<![A-Za-z])(duct[_ ]?(static[_ ]?)?pressure|dsp|static[_ ]?pressure)(?![A-Za-z])", units: Some("inWC"), object_types: None, haystack_tags: Some("point,sensor,duct,pressure,static"), brick_class: None, haystack_kind: Some("Number"), haystack_unit: Some("inWC") },
    BuiltinRule { rule_name: "hs:generic_temp", category: "haystack", pattern: "(?i)(?<![A-Za-z])(temp(erature)?|tmp)(?![A-Za-z])", units: Some("degF,degC,°F,°C,fahrenheit,celsius"), object_types: None, haystack_tags: Some("point,sensor,air,temp"), brick_class: None, haystack_kind: Some("Number"), haystack_unit: Some("°F") },
    BuiltinRule { rule_name: "brick:eat", category: "brick", pattern: "(?i)(?<![A-Za-z])(eat|exhaust[_ ]?air[_ ]?temp|ea[_ ]?temp)(?![A-Za-z])", units: Some("degF,degC,°F,°C"), haystack_tags: None, brick_class: Some("Exhaust_Air_Temperature_Sensor"), haystack_kind: None, haystack_unit: None, object_types: None },
    BuiltinRule { rule_name: "brick:ef", category: "brick", pattern: "(?i)(?<![A-Za-z])(ef|exhaust[_ ]?fan|relief[_ ]?fan)(?![A-Za-z])", object_types: Some("binary-input,binary-output,binary-value,multi-state-input,multi-state-output"), brick_class: Some("Exhaust_Fan"), haystack_kind: None, haystack_unit: None, units: None, haystack_tags: None },
    BuiltinRule { rule_name: "brick:economizer", category: "brick", pattern: "(?i)(?<![A-Za-z])(economizer|econ)(?![A-Za-z])", brick_class: Some("Economizer"), haystack_kind: None, haystack_unit: None, units: None, object_types: None, haystack_tags: None },
    BuiltinRule { rule_name: "brick:dewpoint", category: "brick", pattern: "(?i)(?<![A-Za-z])(dew[_ ]?point|dewpoint|dp[_ ]?temp)(?![A-Za-z])", units: Some("degF,degC,°F,°C"), brick_class: Some("Dewpoint_Sensor"), haystack_kind: None, haystack_unit: None, object_types: None, haystack_tags: None },
    BuiltinRule { rule_name: "brick:cooling_valve", category: "brick", pattern: "(?i)(?<![A-Za-z])(cooling[_ ]?(valve|coil[_ ]?valve)|ccv|cw[_ ]?valve[_ ]?pos)(?![A-Za-z])", brick_class: Some("Cooling_Valve"), haystack_kind: None, haystack_unit: None, units: None, object_types: None, haystack_tags: None },
    BuiltinRule { rule_name: "brick:heating_valve", category: "brick", pattern: "(?i)(?<![A-Za-z])(heating[_ ]?(valve|coil[_ ]?valve)|hcv|hw[_ ]?valve[_ ]?pos)(?![A-Za-z])", brick_class: Some("Heating_Valve"), haystack_kind: None, haystack_unit: None, units: None, object_types: None, haystack_tags: None },
    BuiltinRule { rule_name: "brick:fan_vfd", category: "brick", pattern: "(?i)(?<![A-Za-z])(fan[_ ]?(vfd|speed|hz)|vfd[_ ]?(speed|hz)|drive[_ ]?speed)(?![A-Za-z])", brick_class: Some("Fan_VFD"), haystack_kind: None, haystack_unit: None, units: None, object_types: None, haystack_tags: None },
    BuiltinRule { rule_name: "brick:compressor", category: "brick", pattern: "(?i)(?<![A-Za-z])(compressor|comp[_ ]?(status|run|cmd|speed))(?![A-Za-z])", object_types: Some("binary-input,binary-output,binary-value,multi-state-input,multi-state-output"), brick_class: Some("Compressor"), haystack_kind: None, haystack_unit: None, units: None, haystack_tags: None },
    BuiltinRule { rule_name: "hs:eat", category: "haystack", pattern: "(?i)(?<![A-Za-z])(eat|exhaust[_ ]?air[_ ]?temp|ea[_ ]?temp)(?![A-Za-z])", units: Some("degF,degC,°F,°C"), haystack_tags: Some("point,sensor,exhaust,air,temp"), haystack_kind: Some("Number"), haystack_unit: None, brick_class: None, object_types: None },
    BuiltinRule { rule_name: "hs:ef", category: "haystack", pattern: "(?i)(?<![A-Za-z])(ef|exhaust[_ ]?fan|relief[_ ]?fan)(?![A-Za-z])", haystack_tags: Some("point,sensor,exhaust,fan,run"), haystack_kind: Some("Bool"), haystack_unit: None, brick_class: None, units: None, object_types: None },
    BuiltinRule { rule_name: "hs:economizer", category: "haystack", pattern: "(?i)(?<![A-Za-z])(economizer|econ)(?![A-Za-z])", haystack_tags: Some("point,sensor,economizer"), haystack_kind: Some("Bool"), haystack_unit: None, brick_class: None, units: None, object_types: None },
    BuiltinRule { rule_name: "hs:supply_temp_plain", category: "haystack", pattern: "(?i)(supply[_ ]?temp)", haystack_tags: Some("point,sensor,discharge,air,temp,supply"), haystack_kind: Some("Number"), haystack_unit: None, brick_class: None, units: None, object_types: None },
    BuiltinRule { rule_name: "brick:supply_temp_plain", category: "brick", pattern: "(?i)(supply[_ ]?temp)", brick_class: Some("Supply_Air_Temperature_Sensor"), haystack_kind: None, haystack_unit: None, units: None, object_types: None, haystack_tags: None },
    BuiltinRule { rule_name: "hs:return_temp_plain", category: "haystack", pattern: "(?i)(return[_ ]?temp)", haystack_tags: Some("point,sensor,return,air,temp"), haystack_kind: Some("Number"), haystack_unit: None, brick_class: None, units: None, object_types: None },
    BuiltinRule { rule_name: "brick:return_temp_plain", category: "brick", pattern: "(?i)(return[_ ]?temp)", brick_class: Some("Return_Air_Temperature_Sensor"), haystack_kind: None, haystack_unit: None, units: None, object_types: None, haystack_tags: None },
    BuiltinRule { rule_name: "hs:fan_status", category: "haystack", pattern: "(?i)(fan[_ ]?status)", object_types: Some("binary-input,binary-value"), haystack_tags: Some("point,sensor,fan,run,status"), haystack_kind: Some("Bool"), haystack_unit: None, brick_class: None, units: None },
    BuiltinRule { rule_name: "brick:fan_status", category: "brick", pattern: "(?i)(fan[_ ]?status)", object_types: Some("binary-input,binary-value"), brick_class: Some("Fan_Status_Sensor"), haystack_kind: None, haystack_unit: None, units: None, haystack_tags: None },
    BuiltinRule { rule_name: "brick:fan_enable", category: "brick", pattern: "(?i)(fan[_ ]?(enable|cmd|command))", object_types: Some("binary-output,binary-value"), brick_class: Some("Fan_Enable_Command"), haystack_kind: None, haystack_unit: None, units: None, haystack_tags: None },
    BuiltinRule { rule_name: "brick:fan_speed", category: "brick", pattern: "(?i)(fan[_ ]?speed)", brick_class: Some("Fan_Speed_Command"), haystack_kind: None, haystack_unit: None, units: None, object_types: None, haystack_tags: None },
    BuiltinRule { rule_name: "hs:cooling_valve_plain", category: "haystack", pattern: "(?i)(cooling[_ ]?valve)", haystack_tags: Some("point,cmd,valve,cooling,chilledWater"), haystack_kind: Some("Number"), haystack_unit: None, brick_class: None, units: None, object_types: None },
    BuiltinRule { rule_name: "hs:heating_valve_plain", category: "haystack", pattern: "(?i)(heating[_ ]?valve)", haystack_tags: Some("point,cmd,valve,heating,hotWater"), haystack_kind: Some("Number"), haystack_unit: None, brick_class: None, units: None, object_types: None },
    BuiltinRule { rule_name: "brick:cooling_valve_plain", category: "brick", pattern: "(?i)(cooling[_ ]?valve)", brick_class: Some("Cooling_Valve_Command"), haystack_kind: None, haystack_unit: None, units: None, object_types: None, haystack_tags: None },
    BuiltinRule { rule_name: "brick:heating_valve_plain", category: "brick", pattern: "(?i)(heating[_ ]?valve)", brick_class: Some("Heating_Valve_Command"), haystack_kind: None, haystack_unit: None, units: None, object_types: None, haystack_tags: None },
    BuiltinRule { rule_name: "hs:fan_enable", category: "haystack", pattern: "(?i)(fan[_ ]?(enable|cmd|command))", object_types: Some("binary-output,binary-value"), haystack_tags: Some("point,cmd,fan,enable"), haystack_kind: Some("Bool"), haystack_unit: None, brick_class: None, units: None },
    BuiltinRule { rule_name: "hs:fan_speed", category: "haystack", pattern: "(?i)(fan[_ ]?speed)", haystack_tags: Some("point,cmd,fan,speed"), haystack_kind: Some("Number"), haystack_unit: None, brick_class: None, units: None, object_types: None },
];

static BUILTIN_RANGE_RULES: &[&str] = &[
    "INSERT OR IGNORE INTO HAYSTACK_AUTO_TAGGING_RULES (rule_name,category,pattern,haystack_tags,brick_class,units,haystack_kind,point_type,digital_analog,range_value,source,priority) VALUES ('range:in-dig-0','range',NULL,'point,sensor,binary',NULL,NULL,NULL,'INPUT',0,0,'migration',200)",
    "INSERT OR IGNORE INTO HAYSTACK_AUTO_TAGGING_RULES (rule_name,category,pattern,haystack_tags,brick_class,units,haystack_kind,point_type,digital_analog,range_value,source,priority) VALUES ('range:in-ana-0','range',NULL,'point,sensor,analog',NULL,NULL,NULL,'INPUT',1,0,'migration',201)",
    "INSERT OR IGNORE INTO HAYSTACK_AUTO_TAGGING_RULES (rule_name,category,pattern,haystack_tags,brick_class,units,haystack_kind,point_type,digital_analog,range_value,source,priority) VALUES ('range:in-ana-1','range',NULL,'point,sensor,air,temp','Temperature_Sensor','Deg.C','Number','INPUT',1,1,'migration',202)",
    "INSERT OR IGNORE INTO HAYSTACK_AUTO_TAGGING_RULES (rule_name,category,pattern,haystack_tags,brick_class,units,haystack_kind,point_type,digital_analog,range_value,source,priority) VALUES ('range:in-ana-2','range',NULL,'point,sensor,air,temp','Temperature_Sensor','Deg.F','Number','INPUT',1,2,'migration',203)",
    "INSERT OR IGNORE INTO HAYSTACK_AUTO_TAGGING_RULES (rule_name,category,pattern,haystack_tags,brick_class,units,haystack_kind,point_type,digital_analog,range_value,source,priority) VALUES ('range:in-ana-3','range',NULL,'point,sensor,air,temp','Temperature_Sensor','Deg.C','Number','INPUT',1,3,'migration',204)",
    "INSERT OR IGNORE INTO HAYSTACK_AUTO_TAGGING_RULES (rule_name,category,pattern,haystack_tags,brick_class,units,haystack_kind,point_type,digital_analog,range_value,source,priority) VALUES ('range:in-ana-4','range',NULL,'point,sensor,air,temp','Temperature_Sensor','Deg.F','Number','INPUT',1,4,'migration',205)",
    "INSERT OR IGNORE INTO HAYSTACK_AUTO_TAGGING_RULES (rule_name,category,pattern,haystack_tags,brick_class,units,haystack_kind,point_type,digital_analog,range_value,source,priority) VALUES ('range:in-ana-16','range',NULL,'point,sensor,percent','Percentage_Sensor','%','Number','INPUT',1,16,'migration',215)",
    "INSERT OR IGNORE INTO HAYSTACK_AUTO_TAGGING_RULES (rule_name,category,pattern,haystack_tags,brick_class,units,haystack_kind,point_type,digital_analog,range_value,source,priority) VALUES ('range:in-ana-27','range',NULL,'point,sensor,air,humidity','Humidity_Sensor','%','Number','INPUT',1,27,'migration',216)",
    "INSERT OR IGNORE INTO HAYSTACK_AUTO_TAGGING_RULES (rule_name,category,pattern,haystack_tags,brick_class,units,haystack_kind,point_type,digital_analog,range_value,source,priority) VALUES ('range:in-ana-28','range',NULL,'point,sensor,air,co2,concentration','CO2_Sensor','PPM','Number','INPUT',1,28,'migration',217)",
    "INSERT OR IGNORE INTO HAYSTACK_AUTO_TAGGING_RULES (rule_name,category,pattern,haystack_tags,brick_class,units,haystack_kind,point_type,digital_analog,range_value,source,priority) VALUES ('range:out-dig-0','range',NULL,'point,cmd,binary',NULL,NULL,NULL,'OUTPUT',0,0,'migration',300)",
    "INSERT OR IGNORE INTO HAYSTACK_AUTO_TAGGING_RULES (rule_name,category,pattern,haystack_tags,brick_class,units,haystack_kind,point_type,digital_analog,range_value,source,priority) VALUES ('range:out-ana-0','range',NULL,'point,cmd,analog',NULL,NULL,NULL,'OUTPUT',1,0,'migration',301)",
    "INSERT OR IGNORE INTO HAYSTACK_AUTO_TAGGING_RULES (rule_name,category,pattern,haystack_tags,brick_class,units,haystack_kind,point_type,digital_analog,range_value,source,priority) VALUES ('range:out-ana-32','range',NULL,'point,cmd,damper,position','Damper_Position_Actuator','%','Number','OUTPUT',1,32,'migration',303)",
    "INSERT OR IGNORE INTO HAYSTACK_AUTO_TAGGING_RULES (rule_name,category,pattern,haystack_tags,brick_class,units,haystack_kind,point_type,digital_analog,range_value,source,priority) VALUES ('range:out-ana-34','range',NULL,'point,cmd,percent','Percentage_Command','%','Number','OUTPUT',1,34,'migration',304)",
    "INSERT OR IGNORE INTO HAYSTACK_AUTO_TAGGING_RULES (rule_name,category,pattern,haystack_tags,brick_class,units,haystack_kind,point_type,digital_analog,range_value,source,priority) VALUES ('range:var-dig-0','range',NULL,'point,sp,binary',NULL,NULL,NULL,'VARIABLE',0,0,'migration',400)",
];

/// Sync Brick/Haystack regex rules from the official brick-bacnet-mcp repo on GitHub.
pub async fn sync_brick_rules(db: &impl ConnectionTrait) -> Result<serde_json::Value, String> {
    let mut brick = 0u32;
    let mut hs = 0u32;

    // Fetch brick rules
    if let Ok(resp) = reqwest::get(GITHUB_BRICK_URL).await {
        if let Ok(yaml) = resp.text().await {
            if let Ok(parsed) = serde_yaml::from_str::<Vec<YamlRule>>(&yaml) {
                for r in parsed {
                    let name = if r.id.starts_with("brick:") { r.id } else { format!("brick:{}", r.id) };
                    let sql = format!(
                        "INSERT OR REPLACE INTO HAYSTACK_AUTO_TAGGING_RULES (rule_name,category,pattern,units,object_types,brick_class,source,priority) VALUES ('{}','brick','{}',{},{},{},'github',{})",
                        name.replace('\'', "''"), r.pattern.replace('\'', "''"),
                        opt_sql_list(&r.units), opt_sql_list(&r.object_types), opt_sql_opt(&r.brick_class), brick,
                    );
                    let _ = db.execute(Statement::from_string(sea_orm::DatabaseBackend::Sqlite, &sql)).await;
                    brick += 1;
                }
            }
        }
    }

    // Fetch haystack rules
    if let Ok(resp) = reqwest::get(GITHUB_HAYSTACK_URL).await {
        if let Ok(yaml) = resp.text().await {
            if let Ok(parsed) = serde_yaml::from_str::<Vec<YamlRule>>(&yaml) {
                for r in parsed {
                    let name = if r.id.starts_with("hs:") { r.id } else { format!("hs:{}", r.id) };
                    let tags = r.haystack_tags.map(|t| t.join(","));
                    let sql = format!(
                        "INSERT OR REPLACE INTO HAYSTACK_AUTO_TAGGING_RULES (rule_name,category,pattern,units,object_types,haystack_tags,haystack_kind,haystack_unit,source,priority) VALUES ('{}','haystack','{}',{},{},{},{},{},'github',{})",
                        name.replace('\'', "''"), r.pattern.replace('\'', "''"),
                        opt_sql_list(&r.units), opt_sql_list(&r.object_types), opt_sql_opt(&tags),
                        opt_sql_opt(&r.haystack_kind), opt_sql_opt(&r.haystack_unit), hs,
                    );
                    let _ = db.execute(Statement::from_string(sea_orm::DatabaseBackend::Sqlite, &sql)).await;
                    hs += 1;
                }
            }
        }
    }

    // Also re-seed built-in migration rules (INSERT OR IGNORE — won't overwrite
    // YAML rules that were just synced, but will restore any deleted rules).
    let seeded = seed_builtin_rules(db).await?;

    Ok(serde_json::json!({
        "brick": brick,
        "haystack": hs,
        "seeded": seeded,
        "total": brick + hs + seeded,
        "message": format!("{} brick + {} haystack rules synced, {} built-in rules seeded", brick, hs, seeded),
    }))
}

/// Re-seed all built-in rules from the migration (INSERT OR IGNORE — won't
/// overwrite existing rules, but restores any that were deleted).
async fn seed_builtin_rules(db: &impl ConnectionTrait) -> Result<u32, String> {
    let mut count = 0u32;
    for rule in BUILTIN_RULES.iter() {
        let sql = format!(
            "INSERT OR IGNORE INTO HAYSTACK_AUTO_TAGGING_RULES (rule_name,category,pattern,units,object_types,haystack_tags,brick_class,haystack_kind,haystack_unit,source,priority) VALUES ('{}','{}','{}',{},{},{},{},{},{},'migration',{})",
            rule.rule_name.replace('\'', "''"),
            rule.category,
            rule.pattern.replace('\'', "''"),
            rule.units.map_or("NULL".to_string(), |u| format!("'{}'", u.replace('\'', "''"))),
            rule.object_types.map_or("NULL".to_string(), |o| format!("'{}'", o.replace('\'', "''"))),
            rule.haystack_tags.map_or("NULL".to_string(), |t| format!("'{}'", t.replace('\'', "''"))),
            rule.brick_class.map_or("NULL".to_string(), |b| format!("'{}'", b.replace('\'', "''"))),
            rule.haystack_kind.map_or("NULL".to_string(), |k| format!("'{}'", k.replace('\'', "''"))),
            rule.haystack_unit.map_or("NULL".to_string(), |u| format!("'{}'", u.replace('\'', "''"))),
            count,
        );
        db.execute(Statement::from_string(sea_orm::DatabaseBackend::Sqlite, &sql))
            .await
            .map_err(|e| format!("Failed to seed rule '{}': {}", rule.rule_name, e))?;
        count += 1;
    }

    // Also seed range rules
    for sql in BUILTIN_RANGE_RULES {
        db.execute(Statement::from_string(sea_orm::DatabaseBackend::Sqlite, (*sql).to_string()))
            .await
            .map_err(|e| format!("Failed to seed range rule: {}", e))?;
    }

    Ok(count)
}

fn opt_sql_list(v: &Vec<String>) -> String {
    if v.is_empty() { "NULL".to_string() } else { format!("'{}'", v.join(",").replace('\'', "''")) }
}

fn opt_sql_opt(v: &Option<String>) -> String {
    match v { Some(s) if !s.is_empty() => format!("'{}'", s.replace('\'', "''")), _ => "NULL".to_string() }
}

// ── Internal helpers ──

struct RangeRule {
    haystack_tags: Vec<String>,
    brick_class: Option<String>,
    haystack_kind: Option<String>,
    haystack_unit: Option<String>,
}

/// Load range rules into a HashMap keyed by (point_type, digital_analog, range_value)
async fn load_range_rules(
    db: &impl ConnectionTrait,
) -> Result<std::collections::HashMap<(String, i32, i32), RangeRule>, String> {
    let rows = db
        .query_all(Statement::from_string(
            sea_orm::DatabaseBackend::Sqlite,
            "SELECT point_type, digital_analog, range_value,
                    haystack_tags, brick_class, haystack_kind, haystack_unit
             FROM HAYSTACK_AUTO_TAGGING_RULES
             WHERE category = 'range' AND enabled = 1",
        ))
        .await
        .map_err(|e| format!("Failed to load range rules: {}", e))?;

    let mut map = std::collections::HashMap::new();
    for row in &rows {
        let pt: String = row.try_get("", "point_type").unwrap_or_default();
        let da: i32 = row.try_get("", "digital_analog").unwrap_or(0);
        let rv: i32 = row.try_get("", "range_value").unwrap_or(0);
        let tags_str: Option<String> = row.try_get("", "haystack_tags").ok();
        let bc: Option<String> = row.try_get("", "brick_class").ok();
        let hk: Option<String> = row.try_get("", "haystack_kind").ok();
        let hu: Option<String> = row.try_get("", "haystack_unit").ok();

        let haystack_tags: Vec<String> = tags_str
            .as_deref()
            .map(|s| s.split(',').map(|t| t.trim().to_string()).filter(|t| !t.is_empty()).collect())
            .unwrap_or_default();

        map.insert((pt, da, rv), RangeRule {
            haystack_tags,
            brick_class: bc,
            haystack_kind: hk,
            haystack_unit: hu,
        });
    }
    Ok(map)
}

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
    let pattern = rule.pattern.as_deref()?;
    let regex = Regex::new(pattern).ok()?;
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
        // Check object type filter — only filter if point has an object_type
        if !rule.object_types_filter.is_empty() {
            if let Some(ref ot) = ot_lower {
                if !rule.object_types_filter.contains(ot) {
                    continue;
                }
            }
            // If point has no object_type, let the rule apply (BACnet types may not be set)
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
    range_rules: &std::collections::HashMap<(String, i32, i32), RangeRule>,
    haystack_rules: &[CompiledRule],
    brick_rules: &[CompiledRule],
) -> Result<(usize, Vec<TagMatch>), String> {
    let col_index = match table {
        "INPUTS" => "Input_Index",
        "OUTPUTS" => "Output_Index",
        _ => "Variable_Index",
    };

    let sql = format!(
        "SELECT SerialNumber as sn, {} as idx, Full_Label, Label, Units, Digital_Analog, Range_Field
         FROM {} WHERE SerialNumber IN ({})",
        col_index, table, sn_list
    );

    let rows = db
        .query_all(Statement::from_string(sea_orm::DatabaseBackend::Sqlite, &sql))
        .await
        .map_err(|e| format!("Failed to read {}: {}", table, e))?;

    let mut tagged = 0usize;
    let mut matches = Vec::new();

    for row in &rows {
        let sn: i32 = row.try_get("", "sn").unwrap_or(0);
        let idx_str_tmp: Option<String> = row.try_get("", "idx").ok();
        let idx: i32 = idx_str_tmp.as_deref().and_then(|s| s.parse().ok()).unwrap_or(0);
        let full_label: Option<String> = row.try_get("", "Full_Label").ok();
        let label: Option<String> = row.try_get("", "Label").ok();
        let units: Option<String> = row.try_get("", "Units").ok();
        let da_str: Option<String> = row.try_get("", "Digital_Analog").ok();
        let rf_str: Option<String> = row.try_get("", "Range_Field").ok();
        let da: i32 = da_str.as_deref().and_then(|s| s.parse().ok()).unwrap_or(0);
        let rf: i32 = rf_str.as_deref().and_then(|s| s.parse().ok()).unwrap_or(0);

        let display_label = full_label.as_deref().or(label.as_deref()).unwrap_or("");

        let point_id = format!(
            "dev{}.{}{}",
            sn,
            match point_type { "INPUT" => "in", "OUTPUT" => "out", _ => "var" },
            idx
        );
        let idx_str = idx.to_string();

        let point_info = PointInfo {
            serial_number: sn,
            point_type: point_type.to_string(),
            point_index: idx,
            label: label.clone(),
            full_label: full_label.clone(),
            units: units.clone(),
            digital_analog: Some(da),
            object_type: None,
        };

        let mut point_tagged = false;
        let mut combined_tags: Vec<String> = Vec::new();
        let mut brick_class: Option<String> = None;
        let mut haystack_kind: Option<String> = None;
        let mut haystack_unit: Option<String> = None;
        let mut matched_rule = String::new();

        // ── STEP 1: Range Rules (metadata-based) ──
        if let Some(range_rule) = range_rules.get(&(point_type.to_string(), da, rf)) {
            for tag in &range_rule.haystack_tags {
                db.execute(Statement::from_sql_and_values(
                    sea_orm::DatabaseBackend::Sqlite,
                    "INSERT OR IGNORE INTO haystack_point_tags (serial_number, point_type, point_index, point_id, tag_name, auto_assigned) VALUES (?, ?, ?, ?, ?, 1)",
                    vec![sn.into(), point_type.into(), idx_str.clone().into(), point_id.clone().into(), tag.clone().into()],
                ))
                .await
                .map_err(|e| format!("Failed to insert tag: {}", e))?;
            }
            if let Some(ref bc) = range_rule.brick_class {
                db.execute(Statement::from_sql_and_values(
                    sea_orm::DatabaseBackend::Sqlite,
                    "INSERT OR REPLACE INTO HAYSTACK_POINT_BRICK_CLASS (serial_number, point_type, point_index, brick_class, auto_assigned) VALUES (?, ?, ?, ?, 1)",
                    vec![sn.into(), point_type.into(), idx.into(), bc.clone().into()],
                ))
                .await
                .map_err(|e| format!("Failed to set brick_class: {}", e))?;
            }
            combined_tags = range_rule.haystack_tags.clone();
            brick_class = range_rule.brick_class.clone();
            haystack_kind = range_rule.haystack_kind.clone();
            haystack_unit = range_rule.haystack_unit.clone();
            point_tagged = true;
        }

        // ── STEP 2: Haystack Regex Rules ──
        if let Some(rule) = eval_rules(display_label, units.as_deref(), None, haystack_rules) {
            for tag in &rule.haystack_tags {
                db.execute(Statement::from_sql_and_values(
                    sea_orm::DatabaseBackend::Sqlite,
                    "INSERT OR IGNORE INTO haystack_point_tags (serial_number, point_type, point_index, point_id, tag_name, auto_assigned) VALUES (?, ?, ?, ?, ?, 1)",
                    vec![sn.into(), point_type.into(), idx_str.clone().into(), point_id.clone().into(), tag.clone().into()],
                ))
                .await
                .map_err(|e| format!("Failed to insert tag: {}", e))?;
            }
            if combined_tags.is_empty() {
                combined_tags = rule.haystack_tags.clone();
            }
            if haystack_kind.is_none() { haystack_kind = rule.haystack_kind.clone(); }
            if haystack_unit.is_none() { haystack_unit = rule.haystack_unit.clone(); }
            if matched_rule.is_empty() { matched_rule = rule.rule_name.clone(); }
            point_tagged = true;
        }

        // ── STEP 3: Brick Regex Rules ──
        if let Some(rule) = eval_rules(display_label, units.as_deref(), None, brick_rules) {
            if let Some(ref bc) = rule.brick_class {
                db.execute(Statement::from_sql_and_values(
                    sea_orm::DatabaseBackend::Sqlite,
                    "INSERT OR REPLACE INTO HAYSTACK_POINT_BRICK_CLASS (serial_number, point_type, point_index, brick_class, auto_assigned) VALUES (?, ?, ?, ?, 1)",
                    vec![sn.into(), point_type.into(), idx.into(), bc.clone().into()],
                ))
                .await
                .map_err(|e| format!("Failed to set brick_class: {}", e))?;
            }
            brick_class = rule.brick_class.clone();
            if matched_rule.is_empty() { matched_rule = rule.rule_name.clone(); }
            point_tagged = true;
        }

        if point_tagged {
            tagged += 1;
            matches.push(TagMatch {
                point: point_info,
                matched_rule,
                haystack_tags: combined_tags,
                brick_class,
                haystack_kind,
                haystack_unit,
            });
        }
    }

    Ok((tagged, matches))
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
        let idx_str_raw: Option<String> = row.try_get("", "idx").ok();
        let idx: i32 = idx_str_raw.as_deref().and_then(|s| s.parse().ok()).unwrap_or(0);
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
