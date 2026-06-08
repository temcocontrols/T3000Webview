// Haystack Tags Service v2
// Pure SQL against the 3-table schema: haystack_tags, haystack_tag_relations, haystack_point_tags

use sea_orm::{ConnectionTrait, DbErr, Statement};
use serde::{Deserialize, Serialize};

// ── Types ──

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TagDefinition {
    pub tag_name: String,
    pub doc: Option<String>,
    pub category: String,
    pub deprecated: bool,
    pub source: Option<String>,
    pub usage_count: i64,
    pub parents: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TagTreeNode {
    pub tag_name: String,
    pub doc: Option<String>,
    pub category: String,
    pub deprecated: bool,
    pub children: Vec<TagTreeNode>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PointTagEntry {
    pub serial_number: i32,
    pub point_type: String,
    pub point_index: String,
    pub point_id: String,
    pub tag_name: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateTagRequest {
    pub tag_name: String,
    pub doc: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateTagRequest {
    pub doc: Option<String>,
    pub deprecated: Option<bool>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchPointTagUpdate {
    pub serial_number: i32,
    pub point_type: String,
    pub point_index: String,
    pub point_id: String,
    pub add_tags: Option<Vec<String>>,
    pub remove_tags: Option<Vec<String>>,
    pub set_tags: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReplaceTagRequest {
    pub old_tag: String,
    pub new_tag: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchPointsRequest {
    pub device_serials: Option<Vec<i32>>,
    pub point_types: Option<Vec<String>>,
    pub tag_filter: Option<Vec<String>>,
    pub label_filter: Option<String>,
    pub units_filter: Option<String>,
}

// ── Tag Definition CRUD ──

pub async fn list_tags(
    db: &impl ConnectionTrait,
    filter: Option<&str>,
) -> Result<Vec<TagDefinition>, DbErr> {
    let mut sql = String::from(
        "SELECT t.tag_name, t.doc, t.category, t.deprecated, t.source,
                (SELECT COUNT(*) FROM haystack_point_tags WHERE tag_name = t.tag_name) as usage_count
         FROM haystack_tags t WHERE 1=1",
    );
    if let Some(cat) = filter {
        sql.push_str(&format!(" AND t.category = '{}'", cat));
    }
    sql.push_str(" ORDER BY t.category, t.tag_name");

    let rows = db
        .query_all(Statement::from_string(
            sea_orm::DatabaseBackend::Sqlite,
            &sql,
        ))
        .await?;

    let mut tags: Vec<TagDefinition> = Vec::new();
    for row in &rows {
        let tag_name: String = row.try_get("", "tag_name")?;
        let parents = get_parents(db, &tag_name).await?;
        tags.push(TagDefinition {
            tag_name,
            doc: row.try_get("", "doc").ok(),
            category: row.try_get("", "category").unwrap_or_default(),
            deprecated: row.try_get::<i32>("", "deprecated").unwrap_or(0) != 0,
            source: row.try_get("", "source").ok(),
            usage_count: row.try_get("", "usage_count").unwrap_or(0),
            parents,
        });
    }
    Ok(tags)
}

async fn get_parents(db: &impl ConnectionTrait, tag_name: &str) -> Result<Vec<String>, DbErr> {
    let rows = db
        .query_all(Statement::from_sql_and_values(
            sea_orm::DatabaseBackend::Sqlite,
            "SELECT parent_tag FROM haystack_tag_relations WHERE tag_name = ?",
            vec![tag_name.into()],
        ))
        .await?;
    Ok(rows
        .iter()
        .filter_map(|r| r.try_get::<String>("", "parent_tag").ok())
        .collect())
}

pub async fn create_tag(db: &impl ConnectionTrait, req: &CreateTagRequest) -> Result<(), String> {
    db.execute(Statement::from_sql_and_values(
        sea_orm::DatabaseBackend::Sqlite,
        "INSERT OR IGNORE INTO haystack_tags (tag_name, doc, category, deprecated, source) VALUES (?, ?, 'custom', 0, 'user')",
        vec![req.tag_name.clone().into(), req.doc.clone().into()],
    ))
    .await
    .map_err(|e| format!("Failed to create tag: {}", e))?;
    Ok(())
}

pub async fn update_tag(db: &impl ConnectionTrait, tag_name: &str, req: &UpdateTagRequest) -> Result<(), String> {
    if let Some(doc) = &req.doc {
        db.execute(Statement::from_sql_and_values(
            sea_orm::DatabaseBackend::Sqlite,
            "UPDATE haystack_tags SET doc = ? WHERE tag_name = ?",
            vec![doc.clone().into(), tag_name.into()],
        ))
        .await
        .map_err(|e| format!("Failed to update tag: {}", e))?;
    }
    if let Some(dep) = req.deprecated {
        db.execute(Statement::from_sql_and_values(
            sea_orm::DatabaseBackend::Sqlite,
            "UPDATE haystack_tags SET deprecated = ? WHERE tag_name = ?",
            vec![(dep as i32).into(), tag_name.into()],
        ))
        .await
        .map_err(|e| format!("Failed to update tag: {}", e))?;
    }
    Ok(())
}

pub async fn delete_tag(db: &impl ConnectionTrait, tag_name: &str) -> Result<(), String> {
    // Only delete if unused AND is custom (not standard)
    let row = db
        .query_one(Statement::from_sql_and_values(
            sea_orm::DatabaseBackend::Sqlite,
            "SELECT category, (SELECT COUNT(*) FROM haystack_point_tags WHERE tag_name = ?) as cnt FROM haystack_tags WHERE tag_name = ?",
            vec![tag_name.into(), tag_name.into()],
        ))
        .await
        .map_err(|e| format!("Query failed: {}", e))?;

    if let Some(r) = row {
        let cat: String = r.try_get("", "category").unwrap_or_default();
        let cnt: i64 = r.try_get("", "cnt").unwrap_or(0);
        if cat != "custom" {
            return Err("Cannot delete standard tags".into());
        }
        if cnt > 0 {
            return Err(format!("Tag '{}' is in use by {} point(s)", tag_name, cnt));
        }
    }

    db.execute(Statement::from_sql_and_values(
        sea_orm::DatabaseBackend::Sqlite,
        "DELETE FROM haystack_tags WHERE tag_name = ?",
        vec![tag_name.into()],
    ))
    .await
    .map_err(|e| format!("Failed to delete tag: {}", e))?;
    Ok(())
}

pub async fn replace_tag(db: &impl ConnectionTrait, req: &ReplaceTagRequest) -> Result<(), String> {
    db.execute(Statement::from_sql_and_values(
        sea_orm::DatabaseBackend::Sqlite,
        "UPDATE haystack_point_tags SET tag_name = ? WHERE tag_name = ?",
        vec![req.new_tag.clone().into(), req.old_tag.clone().into()],
    ))
    .await
    .map_err(|e| format!("Failed to replace tag: {}", e))?;
    Ok(())
}

// ── Tag Tree ──

pub async fn get_tag_tree(db: &impl ConnectionTrait) -> Result<Vec<TagTreeNode>, DbErr> {
    let tags = list_tags(db, None).await?;
    let relations = db
        .query_all(Statement::from_string(
            sea_orm::DatabaseBackend::Sqlite,
            "SELECT tag_name, parent_tag FROM haystack_tag_relations",
        ))
        .await?;

    let mut children_map: std::collections::HashMap<String, Vec<String>> = std::collections::HashMap::new();
    let mut has_parent: std::collections::HashSet<String> = std::collections::HashSet::new();

    for row in &relations {
        let child: String = row.try_get("", "tag_name").unwrap_or_default();
        let parent: String = row.try_get("", "parent_tag").unwrap_or_default();
        children_map.entry(parent.clone()).or_default().push(child.clone());
        has_parent.insert(child);
    }

    let tag_map: std::collections::HashMap<String, &TagDefinition> = tags
        .iter()
        .map(|t| (t.tag_name.clone(), t))
        .collect();

    fn build_node(
        name: &str,
        tag_map: &std::collections::HashMap<String, &TagDefinition>,
        children_map: &std::collections::HashMap<String, Vec<String>>,
    ) -> TagTreeNode {
        let tag = tag_map.get(name);
        let children = children_map
            .get(name)
            .map(|kids| {
                kids.iter()
                    .map(|k| build_node(k, tag_map, children_map))
                    .collect()
            })
            .unwrap_or_default();
        TagTreeNode {
            tag_name: name.to_string(),
            doc: tag.and_then(|t| t.doc.clone()),
            category: tag.map(|t| t.category.clone()).unwrap_or_default(),
            deprecated: tag.map(|t| t.deprecated).unwrap_or(false),
            children,
        }
    }

    // Roots = tags without parents
    let roots: Vec<TagTreeNode> = tags
        .iter()
        .filter(|t| !has_parent.contains(&t.tag_name))
        .map(|t| build_node(&t.tag_name, &tag_map, &children_map))
        .collect();

    Ok(roots)
}

// ── Point Tag Operations ──

pub async fn get_point_tags(
    db: &impl ConnectionTrait,
    serial_numbers: &[i32],
    point_type: Option<&str>,
) -> Result<Vec<PointTagEntry>, DbErr> {
    if serial_numbers.is_empty() {
        return Ok(Vec::new());
    }
    let sn_list = serial_numbers
        .iter()
        .map(|s| s.to_string())
        .collect::<Vec<_>>()
        .join(",");

    let mut sql = format!(
        "SELECT serial_number, point_type, point_index, point_id, tag_name
         FROM haystack_point_tags WHERE serial_number IN ({})",
        sn_list
    );
    if let Some(pt) = point_type {
        sql.push_str(&format!(" AND point_type = '{}'", pt));
    }
    sql.push_str(" ORDER BY serial_number, point_type, point_index, tag_name");

    let rows = db
        .query_all(Statement::from_string(sea_orm::DatabaseBackend::Sqlite, &sql))
        .await?;

    Ok(rows
        .iter()
        .filter_map(|r| {
            Some(PointTagEntry {
                serial_number: r.try_get("", "serial_number").ok()?,
                point_type: r.try_get("", "point_type").ok()?,
                point_index: r.try_get("", "point_index").ok()?,
                point_id: r.try_get("", "point_id").ok()?,
                tag_name: r.try_get("", "tag_name").ok()?,
            })
        })
        .collect())
}

pub async fn batch_update_point_tags(
    db: &impl ConnectionTrait,
    updates: &[BatchPointTagUpdate],
) -> Result<(), String> {
    for update in updates {
        // Ensure point_id is correct
        let point_id = &update.point_id;

        // Apply set_tags (replaces all)
        if let Some(tags) = &update.set_tags {
            // Delete existing
            db.execute(Statement::from_sql_and_values(
                sea_orm::DatabaseBackend::Sqlite,
                "DELETE FROM haystack_point_tags WHERE serial_number = ? AND point_type = ? AND point_index = ?",
                vec![
                    update.serial_number.into(),
                    update.point_type.clone().into(),
                    update.point_index.clone().into(),
                ],
            ))
            .await
            .map_err(|e| format!("Delete failed: {}", e))?;
            // Insert new
            for tag in tags {
                db.execute(Statement::from_sql_and_values(
                    sea_orm::DatabaseBackend::Sqlite,
                    "INSERT OR IGNORE INTO haystack_point_tags (serial_number, point_type, point_index, point_id, tag_name) VALUES (?, ?, ?, ?, ?)",
                    vec![
                        update.serial_number.into(),
                        update.point_type.clone().into(),
                        update.point_index.clone().into(),
                        point_id.clone().into(),
                        tag.clone().into(),
                    ],
                ))
                .await
                .map_err(|e| format!("Insert failed: {}", e))?;
            }
        } else {
            // Apply add_tags
            if let Some(add) = &update.add_tags {
                for tag in add {
                    db.execute(Statement::from_sql_and_values(
                        sea_orm::DatabaseBackend::Sqlite,
                        "INSERT OR IGNORE INTO haystack_point_tags (serial_number, point_type, point_index, point_id, tag_name) VALUES (?, ?, ?, ?, ?)",
                        vec![
                            update.serial_number.into(),
                            update.point_type.clone().into(),
                            update.point_index.clone().into(),
                            point_id.clone().into(),
                            tag.clone().into(),
                        ],
                    ))
                    .await
                    .map_err(|e| format!("Insert failed: {}", e))?;
                }
            }
            // Apply remove_tags
            if let Some(remove) = &update.remove_tags {
                for tag in remove {
                    db.execute(Statement::from_sql_and_values(
                        sea_orm::DatabaseBackend::Sqlite,
                        "DELETE FROM haystack_point_tags WHERE serial_number = ? AND point_type = ? AND point_index = ? AND tag_name = ?",
                        vec![
                            update.serial_number.into(),
                            update.point_type.clone().into(),
                            update.point_index.clone().into(),
                            tag.clone().into(),
                        ],
                    ))
                    .await
                    .map_err(|e| format!("Delete failed: {}", e))?;
                }
            }
        }
    }
    Ok(())
}

// ── Search ──

pub async fn search_points(
    db: &impl ConnectionTrait,
    req: &SearchPointsRequest,
) -> Result<Vec<PointTagEntry>, DbErr> {
    let mut conditions: Vec<String> = Vec::new();

    if let Some(serials) = &req.device_serials {
        if !serials.is_empty() {
            let list = serials.iter().map(|s| s.to_string()).collect::<Vec<_>>().join(",");
            conditions.push(format!("pt.serial_number IN ({})", list));
        }
    }
    if let Some(types) = &req.point_types {
        if !types.is_empty() {
            let list = types.iter().map(|t| format!("'{}'", t)).collect::<Vec<_>>().join(",");
            conditions.push(format!("pt.point_type IN ({})", list));
        }
    }
    if let Some(tags) = &req.tag_filter {
        if !tags.is_empty() {
            let list = tags.iter().map(|t| format!("'{}'", t)).collect::<Vec<_>>().join(",");
            conditions.push(format!("pt.tag_name IN ({})", list));
        }
    }

    let mut sql = format!(
        "SELECT DISTINCT pt.serial_number, pt.point_type, pt.point_index, pt.point_id, pt.tag_name
         FROM haystack_point_tags pt WHERE 1=1"
    );
    for c in &conditions {
        sql.push_str(&format!(" AND {}", c));
    }
    sql.push_str(" ORDER BY pt.serial_number, pt.point_type, pt.point_index");

    let rows = db
        .query_all(Statement::from_string(sea_orm::DatabaseBackend::Sqlite, &sql))
        .await?;

    Ok(rows
        .iter()
        .filter_map(|r| {
            Some(PointTagEntry {
                serial_number: r.try_get("", "serial_number").ok()?,
                point_type: r.try_get("", "point_type").ok()?,
                point_index: r.try_get("", "point_index").ok()?,
                point_id: r.try_get("", "point_id").ok()?,
                tag_name: r.try_get("", "tag_name").ok()?,
            })
        })
        .collect())
}
// ���� Auto-tagging from point data (called during FFI sync) ����
//
/// Derive basic Haystack tags from point properties.
/// Compatible replacement for the old haystack_service::upsert_from_point_data.
pub async fn auto_tag_point(
    db: &impl ConnectionTrait,
    point_table: &str,
    serial_number: i32,
    point_index: u32,
    label: Option<&str>,
    digital_analog: Option<i32>,
    units: Option<&str>,
) -> Result<(), String> {
    let point_type = match point_table {
        "INPUTS" => "INPUT",
        "OUTPUTS" => "OUTPUT",
        "VARIABLES" => "VARIABLE",
        _ => return Ok(()),
    };
    let point_id = format!(
        "dev{}.{}{}",
        serial_number,
        match point_type { "INPUT" => "in", "OUTPUT" => "out", _ => "var" },
        point_index
    );
    let point_index_str = point_index.to_string();
    // Don't re-tag points that already have tags
    let existing = db.query_one(Statement::from_sql_and_values(
        sea_orm::DatabaseBackend::Sqlite,
        "SELECT COUNT(*) as cnt FROM haystack_point_tags WHERE serial_number = ? AND point_type = ? AND point_index = ?",
        vec![serial_number.into(), point_type.into(), point_index_str.clone().into()],
    )).await.map_err(|e| format!("Query failed: {}", e))?;
    if let Some(r) = existing {
        if r.try_get::<i64>("", "cnt").unwrap_or(0) > 0 { return Ok(()); }
    }
    let is_digital = digital_analog.map(|da| da == 1).unwrap_or(false);
    let mut tags: Vec<String> = vec!["point".to_string()];
    match point_type {
        "INPUT" => { tags.push("sensor".to_string()); }
        "OUTPUT" => {
            if is_digital { tags.push("cmd".to_string()); }
            else { tags.push("actuator".to_string()); }
        }
        _ => {}
    }
    if let Some(u) = units {
        let u = u.to_lowercase();
        if u.contains("deg.c") || u.contains("celsius") { tags.push("temp".to_string()); tags.push("degC".to_string()); }
        else if u.contains("deg.f") || u.contains("fahrenheit") { tags.push("temp".to_string()); tags.push("degF".to_string()); }
        else if u.contains("%rh") || u.contains("humidity") { tags.push("humidity".to_string()); }
        else if u.contains("ppm") { tags.push("co2".to_string()); }
        else if u.contains("pa") || u.contains("pascal") { tags.push("pressure".to_string()); }
        else if u.contains("cfm") { tags.push("air".to_string()); tags.push("flow".to_string()); }
        else if u.contains("kw") { tags.push("power".to_string()); }
        else if u.contains("volt") { tags.push("voltage".to_string()); }
        else if u.contains("amp") || u.contains("ma") { tags.push("current".to_string()); }
        else if u.contains("%") { tags.push("percent".to_string()); }
        else if u.contains("fpm") { tags.push("air".to_string()); tags.push("velocity".to_string()); }
    }
    if let Some(lbl) = label {
        let lower = lbl.to_lowercase();
        if lower.contains("temp") && !tags.contains(&"temp".to_string()) { tags.push("temp".to_string()); }
        if lower.contains("setpoint") || lower.contains("sp ") { tags.push("setpoint".to_string()); }
        if lower.contains("alarm") || lower.contains("fault") { tags.push("alarm".to_string()); }
        if lower.contains("status") || lower.contains("run ") { tags.push("status".to_string()); tags.push("run".to_string()); }
        if lower.contains("enable") { tags.push("enable".to_string()); }
        if lower.contains("damper") { tags.push("damper".to_string()); }
        if lower.contains("valve") { tags.push("valve".to_string()); }
        if lower.contains("fan") { tags.push("fan".to_string()); }
        if lower.contains("pump") { tags.push("pump".to_string()); }
        if lower.contains("supply") || lower.contains("discharge") { tags.push("discharge".to_string()); }
        if lower.contains("return") || lower.contains("exhaust") { tags.push("return".to_string()); }
        if lower.contains("outside") || lower.contains("oat") { tags.push("outside".to_string()); }
    }
    for tag in &tags {
        let _ = db.execute(Statement::from_sql_and_values(
            sea_orm::DatabaseBackend::Sqlite,
            "INSERT OR IGNORE INTO haystack_point_tags (serial_number, point_type, point_index, point_id, tag_name) VALUES (?, ?, ?, ?, ?)",
            vec![serial_number.into(), point_type.into(), point_index_str.clone().into(), point_id.clone().into(), tag.clone().into()],
        )).await;
    }
    Ok(())
}

/// Force re-derive tags for all points on the given devices.
/// Clears existing point tags first, then reads device points and auto-tags them.
pub async fn rebuild_tags_for_serials(
    db: &impl ConnectionTrait,
    serial_numbers: &[i32],
) -> Result<usize, String> {
    if serial_numbers.is_empty() {
        return Ok(0);
    }

    let sn_list = serial_numbers
        .iter()
        .map(|s| s.to_string())
        .collect::<Vec<_>>()
        .join(",");

    // 1. Delete existing point tags for these serials
    db.execute(Statement::from_string(
        sea_orm::DatabaseBackend::Sqlite,
        &format!(
            "DELETE FROM haystack_point_tags WHERE serial_number IN ({})",
            sn_list
        ),
    ))
    .await
    .map_err(|e| format!("Failed to clear tags: {}", e))?;

    // 2. Read inputs, outputs, variables for these serials
    let mut tagged = 0usize;

    // Inputs
    let input_rows = db
        .query_all(Statement::from_string(
            sea_orm::DatabaseBackend::Sqlite,
            &format!(
                "SELECT SerialNumber, Input_Index, Full_Label, Label, Digital_Analog, Units \
                 FROM INPUTS WHERE SerialNumber IN ({})",
                sn_list
            ),
        ))
        .await
        .map_err(|e| format!("Failed to read inputs: {}", e))?;

    for row in &input_rows {
        let sn: i32 = row.try_get("", "SerialNumber").unwrap_or(0);
        let idx: i32 = row.try_get("", "Input_Index").unwrap_or(0);
        let full_label: Option<String> = row.try_get("", "Full_Label").ok();
        let label: Option<String> = row.try_get("", "Label").ok();
        let da: Option<i32> = row.try_get("", "Digital_Analog").ok();
        let units: Option<String> = row.try_get("", "Units").ok();
        let lbl = full_label.as_deref().or(label.as_deref());
        auto_tag_point(db, "INPUTS", sn, idx as u32, lbl, da, units.as_deref()).await?;
        tagged += 1;
    }

    // Outputs
    let output_rows = db
        .query_all(Statement::from_string(
            sea_orm::DatabaseBackend::Sqlite,
            &format!(
                "SELECT SerialNumber, Output_Index, Full_Label, Label, Digital_Analog, Units \
                 FROM OUTPUTS WHERE SerialNumber IN ({})",
                sn_list
            ),
        ))
        .await
        .map_err(|e| format!("Failed to read outputs: {}", e))?;

    for row in &output_rows {
        let sn: i32 = row.try_get("", "SerialNumber").unwrap_or(0);
        let idx: i32 = row.try_get("", "Output_Index").unwrap_or(0);
        let full_label: Option<String> = row.try_get("", "Full_Label").ok();
        let label: Option<String> = row.try_get("", "Label").ok();
        let da: Option<i32> = row.try_get("", "Digital_Analog").ok();
        let units: Option<String> = row.try_get("", "Units").ok();
        let lbl = full_label.as_deref().or(label.as_deref());
        auto_tag_point(db, "OUTPUTS", sn, idx as u32, lbl, da, units.as_deref()).await?;
        tagged += 1;
    }

    // Variables
    let var_rows = db
        .query_all(Statement::from_string(
            sea_orm::DatabaseBackend::Sqlite,
            &format!(
                "SELECT SerialNumber, Variable_Index, Full_Label, Label, Digital_Analog, Units \
                 FROM VARIABLES WHERE SerialNumber IN ({})",
                sn_list
            ),
        ))
        .await
        .map_err(|e| format!("Failed to read variables: {}", e))?;

    for row in &var_rows {
        let sn: i32 = row.try_get("", "SerialNumber").unwrap_or(0);
        let idx: i32 = row.try_get("", "Variable_Index").unwrap_or(0);
        let full_label: Option<String> = row.try_get("", "Full_Label").ok();
        let label: Option<String> = row.try_get("", "Label").ok();
        let da: Option<i32> = row.try_get("", "Digital_Analog").ok();
        let units: Option<String> = row.try_get("", "Units").ok();
        let lbl = full_label.as_deref().or(label.as_deref());
        auto_tag_point(db, "VARIABLES", sn, idx as u32, lbl, da, units.as_deref()).await?;
        tagged += 1;
    }

    Ok(tagged)
}
