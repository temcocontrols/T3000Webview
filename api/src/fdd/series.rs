//! Time-series loader — TRENDLOG_DATA_DETAIL → aligned `Vec<Sample>`.
//!
//! Pivots the long trendlog rows into a "wide" set of samples keyed by role,
//! exactly the shape the evaluator consumes.

use chrono::{Duration, Utc};
use sea_orm::ConnectionTrait;
use std::collections::{BTreeMap, HashMap};

use super::roles::RolePoint;

/// One timestamp with the values of every role that was present.
#[derive(Debug, Clone)]
pub struct Sample {
    /// LoggingTime_Fmt from the trendlog (e.g. "2025-10-28 13:35:49").
    pub ts: String,
    /// role → numeric value at this timestamp.
    pub values: HashMap<String, f64>,
}

/// Load history for the mapped points of a device over `range_hours`.
pub async fn load_series(
    db: &sea_orm::DatabaseConnection,
    serial: i32,
    role_map: &HashMap<String, RolePoint>,
    range_hours: u64,
) -> Result<Vec<Sample>, String> {
    let start = (Utc::now() - Duration::hours(range_hours as i64))
        .format("%Y-%m-%d %H:%M:%S")
        .to_string();

    // time → role → value
    let mut by_time: BTreeMap<String, HashMap<String, f64>> = BTreeMap::new();

    for (role, point) in role_map {
        // Locate the TRENDLOG_DATA parent row for this point.
        let parent_sql = format!(
            "SELECT id FROM TRENDLOG_DATA WHERE SerialNumber = {} AND PointType = '{}' AND PointIndex = {} LIMIT 1",
            serial, point.point_type, point.point_index
        );
        let parent_rows = db
            .query_all(sea_orm::Statement::from_string(sea_orm::DatabaseBackend::Sqlite, parent_sql))
            .await
            .map_err(|e| format!("Trendlog parent query failed: {}", e))?;
        let Some(parent_row) = parent_rows.first() else { continue };
        let parent_id: i64 = parent_row
            .try_get("", "id")
            .map_err(|e| format!("Trendlog parent id error: {}", e))?;

        // Pull the history for this point.
        let detail_sql = format!(
            "SELECT Value, LoggingTime_Fmt FROM TRENDLOG_DATA_DETAIL WHERE ParentId = {} AND LoggingTime_Fmt >= '{}' ORDER BY LoggingTime_Fmt",
            parent_id, start
        );
        let detail_rows = db
            .query_all(sea_orm::Statement::from_string(sea_orm::DatabaseBackend::Sqlite, detail_sql))
            .await
            .map_err(|e| format!("Trendlog detail query failed: {}", e))?;

        for r in &detail_rows {
            let v: String = r.try_get("", "Value").unwrap_or_default();
            let t: String = r.try_get("", "LoggingTime_Fmt").unwrap_or_default();
            if let Ok(num) = v.trim().parse::<f64>() {
                by_time.entry(t).or_default().insert(role.clone(), num);
            }
        }
    }

    Ok(by_time
        .into_iter()
        .map(|(ts, values)| Sample { ts, values })
        .collect())
}
