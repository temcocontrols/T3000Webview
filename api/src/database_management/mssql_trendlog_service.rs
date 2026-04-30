//! MSSQL TrendLog Service — separate tiberius-based service for trendlog operations
//!
//! This module provides all trendlog READ + WRITE operations for SQL Server.
//! It is the MSSQL equivalent of:
//!   - `T3TrendlogDataService`  (history, stats, recent, realtime save)
//!   - `TrendLogFFIService`     (init, view selections)
//!
//! Route handlers check `state.mssql_pool` first; if `Some`, they call
//! functions here instead of the SeaORM-based services.
//!
//! Existing SeaORM code is **never** touched — this is a parallel path.

use super::mssql_queries::MssqlPool;
use serde_json::{json, Value};

fn point_type_aliases(raw: &str) -> Vec<&'static str> {
    match raw.trim().to_ascii_uppercase().as_str() {
        "INPUT" | "IN" => vec!["INPUT", "IN"],
        "OUTPUT" | "OUT" => vec!["OUTPUT", "OUT"],
        "VARIABLE" | "VAR" => vec!["VARIABLE", "VAR"],
        "MONITOR" | "MON" => vec!["MONITOR", "MON"],
        _ => vec!["INPUT", "IN", "OUTPUT", "OUT", "VARIABLE", "VAR", "MONITOR", "MON"],
    }
}

// ============================================================================
// Trendlog History — SELECT from TRENDLOG_DATA + TRENDLOG_DATA_DETAIL
// ============================================================================

/// Get trendlog history data (JOIN parent+detail) with time range, point filters, etc.
///
/// Mirrors `T3TrendlogDataService::get_trendlog_history()`.
pub async fn get_trendlog_history(
    pool: &MssqlPool,
    serial_number: i32,
    panel_id: i32,
    trendlog_id: &str,
    start_time: Option<&str>,
    end_time: Option<&str>,
    limit: Option<u64>,
    point_types: Option<&[String]>,
    specific_points: Option<&[SpecificPoint]>,
) -> Result<Value, String> {
    let mut conn = pool.get().await.map_err(|e| format!("Pool error: {}", e))?;

    // Build dynamic T-SQL with parameterized WHERE clauses
    let mut sql = String::from(
        "SELECT TOP (@P1) \
           d.ParentId, d.Value, d.LoggingTime_Fmt, \
           p.SerialNumber, p.PanelId, p.PointId, p.PointIndex, \
           p.PointType, p.Digital_Analog, p.Range_Field, p.Units \
         FROM TRENDLOG_DATA_DETAIL d \
         INNER JOIN TRENDLOG_DATA p ON d.ParentId = p.id \
         WHERE p.SerialNumber = @P2 AND p.PanelId = @P3",
    );

    // Filter by trendlog_id when provided.
    // Skip when:
    //   - trendlog_id is empty or "0" (frontend sentinel for "all points")
    //   - specific_points are provided (they already fully identify the rows;
    //     applying PointId = trendlog_id would conflict since actual PointIds
    //     are e.g. "VAR1", "IN1", not the numeric trendlog slot "1")
    let has_specific_points = specific_points.map(|sp| !sp.is_empty()).unwrap_or(false);
    if !trendlog_id.is_empty() && trendlog_id != "0" && !has_specific_points {
        sql.push_str(&format!(
            " AND p.PointId = '{}'",
            trendlog_id.replace('\'', "''")
        ));
    }

    let row_limit: i64 = limit.map(|l| l as i64).unwrap_or(50_000);

    // Collect dynamic filter fragments — we append them to SQL with inline
    // values because tiberius doesn't allow truly dynamic param count easily.
    // Column names are hardcoded (no injection risk); values are escaped.

    // Point types filter
    if let Some(types) = point_types {
        if !types.is_empty() {
            let escaped: Vec<String> = types
                .iter()
                .flat_map(|t| point_type_aliases(t))
                .map(|t| format!("'{}'", t))
                .collect();
            sql.push_str(&format!(" AND UPPER(p.PointType) IN ({})", escaped.join(",")));
        }
    }

    // Specific points filter
    if let Some(points) = specific_points {
        if !points.is_empty() {
            let conditions: Vec<String> = points
                .iter()
                .map(|p| {
                    let type_sql = point_type_aliases(&p.point_type)
                        .into_iter()
                        .map(|t| format!("'{}'", t))
                        .collect::<Vec<_>>()
                        .join(",");
                    format!(
                        "(p.PanelId = {} AND UPPER(p.PointType) IN ({}) AND p.PointIndex = {})",
                        p.panel_id,
                        type_sql,
                        p.point_index,
                    )
                })
                .collect();
            sql.push_str(&format!(" AND ({})", conditions.join(" OR ")));
        }
    }

    // Time range filters
    if let Some(start) = start_time {
        sql.push_str(&format!(
            " AND d.LoggingTime_Fmt >= '{}'",
            start.replace('\'', "''")
        ));
    }
    if let Some(end) = end_time {
        sql.push_str(&format!(
            " AND d.LoggingTime_Fmt <= '{}'",
            end.replace('\'', "''")
        ));
    }

    // Safety: if no time filter, default to last 24h
    if start_time.is_none() && end_time.is_none() {
        let default_start = chrono::Local::now() - chrono::Duration::hours(24);
        let default_start_str = default_start.format("%Y-%m-%d %H:%M:%S").to_string();
        sql.push_str(&format!(
            " AND d.LoggingTime_Fmt >= '{}'",
            default_start_str
        ));
    }

    sql.push_str(" ORDER BY d.LoggingTime_Fmt DESC");

    let result = conn
        .query(&sql, &[&row_limit, &serial_number, &panel_id])
        .await
        .map_err(|e| format!("MSSQL trendlog history query failed: {}", e))?;

    let rows = result
        .into_results()
        .await
        .map_err(|e| format!("MSSQL result fetch failed: {}", e))?;

    let mut data: Vec<Value> = Vec::new();

    for result_set in &rows {
        for row in result_set {
            let value_str: &str = row.get::<&str, _>("Value").unwrap_or("0");
            let original_value: f64 = value_str.parse().unwrap_or(0.0);
            let scaled_value = original_value / 1000.0;

            let point_type: &str = row.get::<&str, _>("PointType").unwrap_or("");
            let digital_analog: Option<&str> = row.try_get::<&str, _>("Digital_Analog").ok().flatten();

            data.push(json!({
                "time": row.get::<&str, _>("LoggingTime_Fmt").unwrap_or(""),
                "value": scaled_value,
                "point_id": row.get::<&str, _>("PointId").unwrap_or(""),
                "point_type": point_type,
                "point_index": row.get::<i32, _>("PointIndex").unwrap_or(0),
                "units": row.try_get::<&str, _>("Units").ok().flatten().unwrap_or(""),
                "range": row.try_get::<&str, _>("Range_Field").ok().flatten().unwrap_or(""),
                "raw_value": value_str,
                "original_value": original_value,
                "is_analog": digital_analog.map(|da| da == "1").unwrap_or(true),
            }));
        }
    }

    let specific_points_count = specific_points.map(|sp| sp.len()).unwrap_or(0);

    Ok(json!({
        "device_id": serial_number,
        "panel_id": panel_id,
        "data": data,
        "count": data.len(),
        "message": if specific_points_count > 0 {
            format!("Trendlog history data retrieved successfully (filtered for {} specific points)", specific_points_count)
        } else {
            "Trendlog history data retrieved successfully".to_string()
        },
        "filtering": {
            "specific_points_applied": specific_points_count > 0,
            "specific_points_count": specific_points_count,
            "time_range_applied": start_time.is_some() || end_time.is_some(),
            "start_time": start_time,
            "end_time": end_time,
        }
    }))
}

// ============================================================================
// Trendlog Statistics — COUNT / aggregation from TRENDLOG_DATA
// ============================================================================

/// Get trendlog data statistics for a device.
///
/// Mirrors `T3TrendlogDataService::get_data_statistics()`.
pub async fn get_data_statistics(
    pool: &MssqlPool,
    serial_number: i32,
    panel_id: i32,
) -> Result<Value, String> {
    let mut conn = pool.get().await.map_err(|e| format!("Pool error: {}", e))?;

    // Count parent records
    let parent_result = conn
        .query(
            "SELECT COUNT(*) AS cnt FROM TRENDLOG_DATA \
             WHERE SerialNumber = @P1 AND PanelId = @P2",
            &[&serial_number, &panel_id],
        )
        .await
        .map_err(|e| format!("MSSQL stats query failed: {}", e))?;

    let parent_count: i32 = parent_result
        .into_row()
        .await
        .map_err(|e| format!("Row fetch failed: {}", e))?
        .and_then(|r| r.get::<i32, _>("cnt"))
        .unwrap_or(0);

    // Count detail records
    let detail_result = conn
        .query(
            "SELECT COUNT(*) AS cnt FROM TRENDLOG_DATA_DETAIL d \
             INNER JOIN TRENDLOG_DATA p ON d.ParentId = p.id \
             WHERE p.SerialNumber = @P1 AND p.PanelId = @P2",
            &[&serial_number, &panel_id],
        )
        .await
        .map_err(|e| format!("MSSQL detail count failed: {}", e))?;

    let detail_count: i32 = detail_result
        .into_row()
        .await
        .map_err(|e| format!("Row fetch failed: {}", e))?
        .and_then(|r| r.get::<i32, _>("cnt"))
        .unwrap_or(0);

    Ok(json!({
        "serial_number": serial_number,
        "panel_id": panel_id,
        "parent_records": parent_count,
        "detail_records": detail_count,
        "total_records": parent_count + detail_count,
        "message": "Statistics retrieved successfully"
    }))
}

// ============================================================================
// Trendlog Recent Data — SELECT latest N detail rows
// ============================================================================

/// Get recent trendlog data for realtime display.
///
/// Mirrors `T3TrendlogDataService::get_recent_data()`.
pub async fn get_recent_data(
    pool: &MssqlPool,
    serial_number: i32,
    panel_id: i32,
    point_types: Option<Vec<String>>,
    limit: Option<u64>,
) -> Result<Value, String> {
    let mut conn = pool.get().await.map_err(|e| format!("Pool error: {}", e))?;

    let row_limit: i64 = limit.map(|l| l as i64).unwrap_or(100);

    let mut sql = format!(
        "SELECT TOP (@P1) \
           d.Value, d.LoggingTime_Fmt, \
           p.PointId, p.PointIndex, p.PointType, \
           p.Digital_Analog, p.Range_Field, p.Units \
         FROM TRENDLOG_DATA_DETAIL d \
         INNER JOIN TRENDLOG_DATA p ON d.ParentId = p.id \
         WHERE p.SerialNumber = @P2 AND p.PanelId = @P3"
    );

    if let Some(types) = &point_types {
        if !types.is_empty() {
            let escaped: Vec<String> = types
                .iter()
                .map(|t| format!("'{}'", t.replace('\'', "''")))
                .collect();
            sql.push_str(&format!(" AND p.PointType IN ({})", escaped.join(",")));
        }
    }

    sql.push_str(" ORDER BY d.LoggingTime_Fmt DESC");

    let result = conn
        .query(&sql, &[&row_limit, &serial_number, &panel_id])
        .await
        .map_err(|e| format!("MSSQL recent data query failed: {}", e))?;

    let rows = result
        .into_results()
        .await
        .map_err(|e| format!("Result fetch failed: {}", e))?;

    let mut data: Vec<Value> = Vec::new();
    for result_set in &rows {
        for row in result_set {
            let value_str: &str = row.get::<&str, _>("Value").unwrap_or("0");
            let original_value: f64 = value_str.parse().unwrap_or(0.0);
            let scaled_value = original_value / 1000.0;
            let was_scaled = original_value > 1000.0;

            data.push(json!({
                "time": row.get::<&str, _>("LoggingTime_Fmt").unwrap_or(""),
                "value": scaled_value,
                "point_id": row.get::<&str, _>("PointId").unwrap_or(""),
                "point_type": row.get::<&str, _>("PointType").unwrap_or(""),
                "point_index": row.get::<i32, _>("PointIndex").unwrap_or(0),
                "units": row.try_get::<&str, _>("Units").ok().flatten().unwrap_or(""),
                "range": row.try_get::<&str, _>("Range_Field").ok().flatten().unwrap_or(""),
                "raw_value": value_str,
                "original_value": original_value,
                "was_scaled": was_scaled,
                "is_analog": row.try_get::<&str, _>("Digital_Analog").ok().flatten()
                    .map(|da| da == "1").unwrap_or(true),
            }));
        }
    }

    Ok(json!({
        "data": data,
        "count": data.len(),
        "message": "Recent trendlog data retrieved successfully"
    }))
}

// ============================================================================
// Realtime Data Save — INSERT into TRENDLOG_DATA_DETAIL (+ parent get-or-create)
// ============================================================================

/// Save a single realtime trendlog data point.
///
/// Mirrors `T3TrendlogDataService::save_realtime_data()`.
pub async fn save_realtime_data(
    pool: &MssqlPool,
    serial_number: i32,
    panel_id: i32,
    point_id: &str,
    point_index: i32,
    point_type: &str,
    value: &str,
    range_field: Option<&str>,
    digital_analog: Option<&str>,
    units: Option<&str>,
) -> Result<i32, String> {
    // get-or-create parent
    let parent_id = super::mssql_queries::get_or_create_trendlog_parent(
        pool,
        serial_number,
        panel_id,
        point_id,
        point_index,
        point_type,
        digital_analog,
        range_field,
        units,
        None,
    )
    .await?;

    // insert detail row
    let now = chrono::Local::now();
    let logging_time_fmt = now.format("%Y-%m-%d %H:%M:%S").to_string();

    super::mssql_queries::insert_trendlog_detail(pool, parent_id, value, &logging_time_fmt).await?;

    Ok(parent_id)
}

/// Save a batch of realtime trendlog data points.
///
/// Mirrors `T3TrendlogDataService::save_realtime_batch()`.
pub async fn save_realtime_batch(
    pool: &MssqlPool,
    batch: &[RealtimeDataPoint],
) -> Result<i64, String> {
    let mut rows_affected: i64 = 0;

    let now = chrono::Local::now();
    let logging_time_fmt = now.format("%Y-%m-%d %H:%M:%S").to_string();

    for point in batch {
        let parent_id = super::mssql_queries::get_or_create_trendlog_parent(
            pool,
            point.serial_number,
            point.panel_id,
            &point.point_id,
            point.point_index,
            &point.point_type,
            point.digital_analog.as_deref(),
            point.range_field.as_deref(),
            point.units.as_deref(),
            None,
        )
        .await?;

        super::mssql_queries::insert_trendlog_detail(pool, parent_id, &point.value, &logging_time_fmt)
            .await?;

        rows_affected += 1;
    }

    Ok(rows_affected)
}

// ============================================================================
// TrendLog Init / Info — TRENDLOGS + TRENDLOG_INPUTS tables
// ============================================================================

/// Create or get initial trendlog info from MSSQL.
///
/// Mirrors `TrendLogFFIService::create_initial_trendlog_info_with_panel_and_title()`.
pub async fn create_initial_trendlog_info(
    pool: &MssqlPool,
    serial_number: i32,
    panel_id: i32,
    trendlog_id: &str,
    chart_title: Option<&str>,
) -> Result<Value, String> {
    let mut conn = pool.get().await.map_err(|e| format!("Pool error: {}", e))?;

    // Look up existing trendlog metadata
    let result = conn
        .query(
            "SELECT Trendlog_Label, Interval_Seconds, Status \
             FROM TRENDLOGS \
             WHERE SerialNumber = @P1 AND PanelId = @P2 AND Trendlog_ID = @P3",
            &[&serial_number, &panel_id, &trendlog_id],
        )
        .await
        .map_err(|e| format!("TRENDLOGS SELECT failed: {}", e))?;

    let row = result
        .into_row()
        .await
        .map_err(|e| format!("Row fetch failed: {}", e))?;

    let (label, interval, status) = if let Some(r) = &row {
        (
            r.get::<&str, _>("Trendlog_Label").unwrap_or(trendlog_id),
            r.get::<i32, _>("Interval_Seconds").unwrap_or(60),
            r.get::<&str, _>("Status").unwrap_or("ON"),
        )
    } else {
        // Insert a new trendlog record if it doesn't exist
        let label = chart_title.unwrap_or(trendlog_id);
        super::mssql_queries::upsert_trendlog(
            pool,
            serial_number,
            panel_id,
            trendlog_id,
            Some(label),
            Some(60),
            Some("ON"),
        )
        .await?;
        (label, 60, "ON")
    };

    // Get related input points
    let inputs_result = conn
        .query(
            "SELECT Point_Type, Point_Index, Point_Label, Status, is_selected \
             FROM TRENDLOG_INPUTS \
             WHERE SerialNumber = @P1 AND PanelId = @P2 AND Trendlog_ID = @P3 \
               AND (view_type = 'MONITOR' OR view_type IS NULL)",
            &[&serial_number, &panel_id, &trendlog_id],
        )
        .await
        .map_err(|e| format!("TRENDLOG_INPUTS SELECT failed: {}", e))?;

    let input_rows = inputs_result
        .into_results()
        .await
        .map_err(|e| format!("Result fetch failed: {}", e))?;

    let mut related_points: Vec<Value> = Vec::new();
    let mut num_inputs = 0i32;
    let mut analog_inputs = 0i32;

    for result_set in &input_rows {
        for r in result_set {
            let pt = r.get::<&str, _>("Point_Type").unwrap_or("");
            related_points.push(json!({
                "point_type": pt,
                "point_index": r.get::<&str, _>("Point_Index").unwrap_or("0"),
                "point_panel": panel_id.to_string(),
                "point_label": r.try_get::<&str, _>("Point_Label").ok().flatten().unwrap_or(""),
                "network": 0,
                "range_value": 0,
            }));
            num_inputs += 1;
            if pt == "INPUT" || pt == "OUTPUT" || pt == "VARIABLE" {
                analog_inputs += 1;
            }
        }
    }

    Ok(json!({
        "success": true,
        "message": "Initial TrendLog info created successfully",
        "trendlog_info": {
            "serial_number": serial_number,
            "panel_id": panel_id,
            "trendlog_id": trendlog_id,
            "trendlog_label": label,
            "interval_seconds": interval,
            "status": status,
            "num_inputs": num_inputs,
            "analog_inputs": analog_inputs,
            "buffer_size": null,
            "data_size_kb": "0",
            "related_points": related_points,
        }
    }))
}

/// Get trendlog info by ID.
pub async fn get_trendlog_info(
    pool: &MssqlPool,
    trendlog_id: &str,
) -> Result<Value, String> {
    let mut conn = pool.get().await.map_err(|e| format!("Pool error: {}", e))?;

    let result = conn
        .query(
            "SELECT SerialNumber, PanelId, Trendlog_Label, Interval_Seconds, Status \
             FROM TRENDLOGS WHERE Trendlog_ID = @P1",
            &[&trendlog_id],
        )
        .await
        .map_err(|e| format!("TRENDLOGS SELECT failed: {}", e))?;

    let row = result
        .into_row()
        .await
        .map_err(|e| format!("Row fetch failed: {}", e))?;

    match row {
        Some(r) => Ok(json!({
            "serial_number": r.get::<i32, _>("SerialNumber").unwrap_or(0),
            "panel_id": r.get::<i32, _>("PanelId").unwrap_or(1),
            "trendlog_id": trendlog_id,
            "trendlog_label": r.get::<&str, _>("Trendlog_Label").unwrap_or(trendlog_id),
            "interval_seconds": r.get::<i32, _>("Interval_Seconds").unwrap_or(60),
            "status": r.get::<&str, _>("Status").unwrap_or("ON"),
        })),
        None => Ok(Value::Null),
    }
}

// ============================================================================
// View Selections — TRENDLOG_VIEWS table read/write
// ============================================================================

/// Get view selections for a specific trendlog view (2 or 3).
///
/// Mirrors `TrendLogFFIService::get_view_selections_with_panel()`.
pub async fn get_view_selections(
    pool: &MssqlPool,
    serial_number: i32,
    panel_id: i32,
    trendlog_id: &str,
    view_number: i32,
) -> Result<Vec<Value>, String> {
    let mut conn = pool.get().await.map_err(|e| format!("Pool error: {}", e))?;

    let result = conn
        .query(
            "SELECT Point_Type, Point_Index, Point_Label, is_selected \
             FROM TRENDLOG_VIEWS \
             WHERE SerialNumber = @P1 AND PanelId = @P2 \
                             AND Trendlog_ID = @P3 AND View_Number = @P4 \
               AND is_selected = 1",
            &[&serial_number, &panel_id, &trendlog_id, &view_number],
        )
        .await
        .map_err(|e| format!("TRENDLOG_VIEWS SELECT failed: {}", e))?;

    let rows = result
        .into_results()
        .await
        .map_err(|e| format!("Result fetch failed: {}", e))?;

    let mut selections: Vec<Value> = Vec::new();
    for result_set in &rows {
        for r in result_set {
            selections.push(json!({
                "point_type": r.get::<&str, _>("Point_Type").unwrap_or(""),
                "point_index": r.get::<&str, _>("Point_Index").unwrap_or("0"),
                "point_label": r.try_get::<&str, _>("Point_Label").ok().flatten().unwrap_or(""),
                "is_selected": true,
            }));
        }
    }

    Ok(selections)
}

/// Save view selections — clears old, inserts new.
///
/// Mirrors `TrendLogFFIService::add_points_to_view_selection_with_panel()`.
pub async fn save_view_selections(
    pool: &MssqlPool,
    serial_number: i32,
    panel_id: i32,
    trendlog_id: &str,
    view_number: i32,
    selections: &[ViewSelectionInput],
) -> Result<(), String> {
    let mut conn = pool.get().await.map_err(|e| format!("Pool error: {}", e))?;

    // 1. Clear existing selections (set is_selected = 0)
    conn.execute(
        "UPDATE TRENDLOG_VIEWS SET is_selected = 0 \
         WHERE SerialNumber = @P1 AND PanelId = @P2 \
                     AND Trendlog_ID = @P3 AND View_Number = @P4",
        &[&serial_number, &panel_id, &trendlog_id, &view_number],
    )
    .await
    .map_err(|e| format!("TRENDLOG_VIEWS clear failed: {}", e))?;

    // Also clear TRENDLOG_INPUTS for this view
    conn.execute(
        "UPDATE TRENDLOG_INPUTS SET is_selected = 0 \
         WHERE SerialNumber = @P1 AND PanelId = @P2 \
           AND Trendlog_ID = @P3 AND view_number = @P4",
        &[&serial_number, &panel_id, &trendlog_id, &view_number],
    )
    .await
    .map_err(|e| format!("TRENDLOG_INPUTS clear failed: {}", e))?;

    // 2. Insert/update selected points
    let now = chrono::Utc::now().to_rfc3339();

    for sel in selections {
        if !sel.is_selected {
            continue;
        }

        // MERGE into TRENDLOG_VIEWS
        conn.execute(
            "MERGE INTO TRENDLOG_VIEWS AS target \
             USING (SELECT @P1 AS SN, @P2 AS PI, @P3 AS TID, \
                           @P4 AS PT, @P5 AS PIX, @P6 AS VN) AS src \
             ON target.SerialNumber = src.SN AND target.PanelId = src.PI \
                AND target.Trendlog_ID = src.TID AND target.Point_Type = src.PT \
                                AND target.Point_Index = src.PIX AND target.View_Number = src.VN \
             WHEN MATCHED THEN UPDATE SET \
               is_selected = 1, Point_Label = @P7, updated_at = @P8 \
             WHEN NOT MATCHED THEN INSERT \
               (SerialNumber, PanelId, Trendlog_ID, Point_Type, Point_Index, \
                                View_Number, is_selected, Point_Label, created_at, updated_at) \
             VALUES (@P1, @P2, @P3, @P4, @P5, @P6, 1, @P7, @P8, @P8);",
            &[
                &serial_number,          // @P1
                &panel_id,               // @P2
                &trendlog_id,            // @P3
                &sel.point_type.as_str(), // @P4
                &sel.point_index.as_str(), // @P5
                &view_number,            // @P6
                &sel.point_label.as_str(), // @P7
                &now.as_str(),           // @P8
            ],
        )
        .await
        .map_err(|e| format!("TRENDLOG_VIEWS MERGE failed: {}", e))?;

        // MERGE into TRENDLOG_INPUTS
        conn.execute(
            "MERGE INTO TRENDLOG_INPUTS AS target \
             USING (SELECT @P1 AS SN, @P2 AS PI, @P3 AS TID, \
                           @P4 AS PT, @P5 AS PIX, @P6 AS VN) AS src \
             ON target.SerialNumber = src.SN AND target.PanelId = src.PI \
                AND target.Trendlog_ID = src.TID AND target.Point_Type = src.PT \
                AND target.Point_Index = src.PIX AND target.view_number = src.VN \
             WHEN MATCHED THEN UPDATE SET \
               is_selected = 1, Point_Label = @P7, view_type = 'VIEW', updated_at = @P8 \
             WHEN NOT MATCHED THEN INSERT \
               (SerialNumber, PanelId, Trendlog_ID, Point_Type, Point_Index, \
                view_number, view_type, is_selected, Point_Label, created_at, updated_at) \
             VALUES (@P1, @P2, @P3, @P4, @P5, @P6, 'VIEW', 1, @P7, @P8, @P8);",
            &[
                &serial_number,          // @P1
                &panel_id,               // @P2
                &trendlog_id,            // @P3
                &sel.point_type.as_str(), // @P4
                &sel.point_index.as_str(), // @P5
                &view_number,            // @P6
                &sel.point_label.as_str(), // @P7
                &now.as_str(),           // @P8
            ],
        )
        .await
        .map_err(|e| format!("TRENDLOG_INPUTS MERGE failed: {}", e))?;
    }

    Ok(())
}

// ============================================================================
// Cleanup — DELETE old detail rows
// ============================================================================

/// Delete trendlog detail rows older than N days.
pub async fn cleanup_old_data(
    pool: &MssqlPool,
    serial_number: i32,
    days_to_keep: i64,
) -> Result<i64, String> {
    let mut conn = pool.get().await.map_err(|e| format!("Pool error: {}", e))?;

    let cutoff = chrono::Local::now() - chrono::Duration::days(days_to_keep);
    let cutoff_str = cutoff.format("%Y-%m-%d %H:%M:%S").to_string();

    let result = conn
        .execute(
            "DELETE d FROM TRENDLOG_DATA_DETAIL d \
             INNER JOIN TRENDLOG_DATA p ON d.ParentId = p.id \
             WHERE p.SerialNumber = @P1 AND d.LoggingTime_Fmt < @P2",
            &[&serial_number, &cutoff_str.as_str()],
        )
        .await
        .map_err(|e| format!("MSSQL cleanup failed: {}", e))?;

    Ok(result.total() as i64)
}

// ============================================================================
// ============================================================================
// Dashboard Widget Query — all devices, time-range only
// ============================================================================

/// Query MSSQL trendlog data for the dashboard 24h widget (across all devices).
/// Returns records in the same shape as `partition_query_service::TrendlogDataRecord`
/// so the endpoint can return a unified type regardless of SQLite vs MSSQL source.
pub async fn query_trendlog_for_dashboard(
    pool: &MssqlPool,
    start_date: &str,       // "YYYY-MM-DD HH:MM:SS"
    end_date: &str,         // "YYYY-MM-DD HH:MM:SS"
    serial_number: Option<i32>,
    panel_id: Option<i32>,
) -> Result<Vec<crate::database_management::partition_query_service::TrendlogDataRecord>, String> {
    use crate::database_management::partition_query_service::TrendlogDataRecord;

    let mut conn = pool.get().await.map_err(|e| format!("Pool error: {}", e))?;

    // Dates are pre-validated NaiveDateTime strings — safe to inline.
    let start_esc = start_date.replace('\'', "''");
    let end_esc   = end_date.replace('\'', "''");

    let mut sql = format!(
        "SELECT TOP 10000 \
            p.SerialNumber, p.PanelId, p.PointId, p.PointIndex, p.PointType, \
            d.Value, d.LoggingTime_Fmt, \
            p.Digital_Analog, p.Range_Field, p.Units \
         FROM TRENDLOG_DATA_DETAIL d \
         INNER JOIN TRENDLOG_DATA p ON d.ParentId = p.id \
         WHERE d.LoggingTime_Fmt >= '{}' AND d.LoggingTime_Fmt <= '{}'",
        start_esc, end_esc
    );

    if let Some(sn) = serial_number {
        sql.push_str(&format!(" AND p.SerialNumber = {}", sn));
    }
    if let Some(pid) = panel_id {
        sql.push_str(&format!(" AND p.PanelId = {}", pid));
    }
    sql.push_str(" ORDER BY d.LoggingTime_Fmt ASC");

    let result = conn
        .query(&sql, &[])
        .await
        .map_err(|e| format!("MSSQL trendlog dashboard query failed: {}", e))?;

    let rows = result
        .into_results()
        .await
        .map_err(|e| format!("MSSQL result fetch failed: {}", e))?;

    let mut records = Vec::new();
    for result_set in &rows {
        for row in result_set {
            let sn: i32       = row.get::<i32, _>("SerialNumber").unwrap_or(0);
            let pid: i32      = row.get::<i32, _>("PanelId").unwrap_or(0);
            let point_id      = row.get::<&str, _>("PointId").unwrap_or("").to_string();
            let point_index   = row.get::<i32, _>("PointIndex").unwrap_or(0);
            let point_type    = row.get::<&str, _>("PointType").unwrap_or("").to_string();
            let value         = row.get::<&str, _>("Value").unwrap_or("0").to_string();
            let log_time      = row.get::<&str, _>("LoggingTime_Fmt").unwrap_or("").to_string();
            let digital_analog = row.try_get::<&str, _>("Digital_Analog").ok().flatten().map(|s| s.to_string());
            let range_field    = row.try_get::<&str, _>("Range_Field").ok().flatten().map(|s| s.to_string());
            let units          = row.try_get::<&str, _>("Units").ok().flatten().map(|s| s.to_string());

            records.push(TrendlogDataRecord {
                serial_number: sn,
                panel_id: pid,
                point_id,
                point_index,
                point_type,
                value,
                logging_time_fmt: log_time,
                digital_analog,
                range_field,
                units,
            });
        }
    }

    Ok(records)
}

// ============================================================================
// Data Types used by the service
// ============================================================================

/// Specific point filter (matches frontend `SpecificPoint` type).
#[derive(Debug, Clone)]
pub struct SpecificPoint {
    pub point_id: String,
    pub point_type: String,
    pub point_index: i32,
    pub panel_id: i32,
}

/// Realtime data point for batch save.
#[derive(Debug, Clone)]
pub struct RealtimeDataPoint {
    pub serial_number: i32,
    pub panel_id: i32,
    pub point_id: String,
    pub point_index: i32,
    pub point_type: String,
    pub value: String,
    pub range_field: Option<String>,
    pub digital_analog: Option<String>,
    pub units: Option<String>,
}

/// View selection input for save operations.
#[derive(Debug, Clone)]
pub struct ViewSelectionInput {
    pub point_type: String,
    pub point_index: String,
    pub point_label: String,
    pub is_selected: bool,
}
