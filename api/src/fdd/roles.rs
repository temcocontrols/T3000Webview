//! Role inference — Haystack/Brick tags → FDD cookbook roles.
//!
//! Mirrors open-fdd's `column_map` concept: physical points are mapped to the
//! semantic roles the rules operate on (oa_t, sat, mat, rat, zone_t, ...).

use sea_orm::ConnectionTrait;
use std::collections::HashMap;

/// A point identified on a device by type + index (plus its human point id).
#[derive(Debug, Clone)]
pub struct RolePoint {
    pub point_type: String, // INPUT | OUTPUT | VARIABLE
    pub point_index: i32,
    pub point_id: String,
}

/// Infer an FDD role from a point's Haystack tags (lowercased keyword matching).
pub fn infer_role(tags: &[String]) -> Option<String> {
    let joined = tags
        .iter()
        .map(|t| t.to_lowercase())
        .collect::<Vec<_>>()
        .join(" ");
    let has = |kw: &str| joined.contains(kw);
    match () {
        _ if has("outside") && has("temp") => Some("oa_t".into()),
        _ if (has("discharge") || has("supply")) && has("temp") => Some("sat".into()),
        _ if has("mixed") && has("temp") => Some("mat".into()),
        _ if has("return") && has("temp") => Some("rat".into()),
        _ if (has("zone") || has("space")) && has("temp") => Some("zone_t".into()),
        _ if has("fan") && (has("cmd") || has("command")) => Some("fan_cmd".into()),
        _ if has("fan") && (has("status") || has("run")) => Some("fan_status".into()),
        _ if has("damper") && (has("position") || has("cmd") || has("command")) => {
            Some("damper_pct".into())
        }
        _ if has("chw") && has("supply") => Some("chw_s".into()),
        _ if has("chw") && has("return") => Some("chw_r".into()),
        _ if has("chw") && (has("pressure") || has("dp")) => Some("chw_dp".into()),
        _ if (has("supply") || has("discharge")) && (has("setpoint") || has("sp")) => {
            Some("sat_sp".into())
        }
        _ => None,
    }
}

/// Load the role map for a device: role → first point whose tags infer it.
pub async fn load_role_map(
    db: &sea_orm::DatabaseConnection,
    serial: i32,
) -> Result<HashMap<String, RolePoint>, String> {
    let sql = format!(
        "SELECT point_type, point_index, point_id, tag_name FROM HAYSTACK_POINT_TAGS WHERE serial_number = {}",
        serial
    );
    let rows = db
        .query_all(sea_orm::Statement::from_string(sea_orm::DatabaseBackend::Sqlite, sql))
        .await
        .map_err(|e| format!("Role map query failed: {}", e))?;

    // Group tags per point (point_type, normalized index).
    let mut by_point: HashMap<(String, i32), (String, Vec<String>)> = HashMap::new();
    for r in &rows {
        let pt: String = r.try_get("", "point_type").unwrap_or_default();
        let idx_str: String = r.try_get("", "point_index").unwrap_or_default();
        let point_id: String = r.try_get("", "point_id").unwrap_or_default();
        let tag: String = r.try_get("", "tag_name").unwrap_or_default();
        // Normalize index: "IN1" -> 1, "1" -> 1, "VAR2" -> 2
        let idx: i32 = idx_str
            .chars()
            .filter(|c| c.is_ascii_digit())
            .collect::<String>()
            .parse()
            .unwrap_or(0);
        by_point
            .entry((pt.clone(), idx))
            .or_insert_with(|| (point_id, Vec::new()))
            .1
            .push(tag);
    }

    let mut map: HashMap<String, RolePoint> = HashMap::new();
    for ((pt, idx), (point_id, tags)) in by_point {
        if let Some(role) = infer_role(&tags) {
            map.entry(role).or_insert(RolePoint {
                point_type: pt,
                point_index: idx,
                point_id,
            });
        }
    }
    Ok(map)
}
