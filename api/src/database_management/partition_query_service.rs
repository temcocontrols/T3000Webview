use crate::db_connection::establish_t3_device_connection;
use crate::entity::{database_files, database_partition_config};
use crate::database_management::{DatabaseConfigService, format_path_for_attach};
use crate::error::Result;
use crate::constants::get_t3000_database_path;
use sea_orm::*;
use chrono::{NaiveDateTime, NaiveDate, Utc, Datelike};
use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrendlogDataRecord {
    pub serial_number: i32,
    pub panel_id: i32,
    pub point_id: String,
    pub point_index: i32,
    pub point_type: String,
    pub value: String,
    pub logging_time: i64,
    pub logging_time_fmt: String,
    pub digital_analog: Option<String>,
    pub range_field: Option<String>,
    pub units: Option<String>,
    pub data_source: Option<String>,
    pub sync_interval: Option<i32>,
    pub created_by: Option<String>,
}

#[derive(Debug, Clone)]
pub struct TrendlogFilters {
    pub serial_number: Option<i32>,
    pub panel_id: Option<i32>,
    pub point_id: Option<String>,
    pub point_type: Option<String>,
}

#[derive(Debug, Clone)]
struct PartitionInfo {
    pub partition_id: String,
    pub file_path: String,
    pub start_date: NaiveDateTime,
    pub end_date: NaiveDateTime,
    pub is_main_db: bool,
}

/// Query trendlog data across multiple partitions and main DB
pub async fn query_trendlog_data(
    start_date: NaiveDateTime,
    end_date: NaiveDateTime,
    filters: TrendlogFilters,
) -> Result<Vec<TrendlogDataRecord>> {
    let db = establish_t3_device_connection().await
        .map_err(|e| crate::error::Error::ServerError(format!("Database connection failed: {}", e)))?;
    let config = DatabaseConfigService::get_config(&db).await?;

    if !config.is_active {
        // No partitioning - query main DB only
        return query_main_database(&db, start_date, end_date, &filters).await;
    }

    // Determine which partitions need to be queried
    let required_partitions = identify_required_partitions(
        &db,
        &config,
        start_date.date(),
        end_date.date()
    ).await?;

    let mut all_results = Vec::new();

    // Query each partition
    for partition_info in required_partitions {
        if partition_info.is_main_db {
            // Query main DB for current period data
            let results = query_main_database(&db, start_date, end_date, &filters).await?;
            all_results.extend(results);
        } else {
            // Query partition file
            let results = query_partition_file(
                &partition_info.file_path,
                start_date,
                end_date,
                &filters
            ).await?;
            all_results.extend(results);
        }
    }

    // Sort by timestamp
    all_results.sort_by(|a, b| a.logging_time_fmt.cmp(&b.logging_time_fmt));

    Ok(all_results)
}

/// Identify which partitions contain data for the date range
async fn identify_required_partitions(
    db: &DatabaseConnection,
    config: &database_partition_config::DatabasePartitionConfig,
    start_date: NaiveDate,
    end_date: NaiveDate,
) -> Result<Vec<PartitionInfo>> {
    let mut partitions = Vec::new();

    // Get all partition files from DATABASE_FILES table
    let partition_files = database_files::Entity::find()
        .filter(database_files::Column::PartitionIdentifier.is_not_null())
        .filter(database_files::Column::IsActive.eq(false)) // Partitions are inactive
        .all(db)
        .await?;

    // Check each partition to see if it overlaps with query range
    for partition_file in partition_files {
        if let (Some(p_start), Some(p_end)) = (partition_file.start_date, partition_file.end_date) {
            // Check if partition date range overlaps with query range
            if date_ranges_overlap(
                p_start.date(), p_end.date(),
                start_date, end_date
            ) {
                partitions.push(PartitionInfo {
                    partition_id: partition_file.partition_identifier.unwrap(),
                    file_path: partition_file.file_path,
                    start_date: p_start,
                    end_date: p_end,
                    is_main_db: false,
                });
            }
        }
    }

    // Check if main DB contains current period data in the query range
    let current_period_start = get_current_period_start(config);
    let current_date = Utc::now().naive_utc();

    if date_ranges_overlap(
        current_period_start.date(), current_date.date(),
        start_date, end_date
    ) {
        partitions.push(PartitionInfo {
            partition_id: "current".to_string(),
            file_path: get_t3000_database_path().join("webview_t3_device.db").to_string_lossy().to_string(),
            start_date: current_period_start,
            end_date: current_date,
            is_main_db: true,
        });
    }

    Ok(partitions)
}

/// Check if two date ranges overlap
fn date_ranges_overlap(
    range1_start: NaiveDate,
    range1_end: NaiveDate,
    range2_start: NaiveDate,
    range2_end: NaiveDate,
) -> bool {
    range1_start <= range2_end && range2_start <= range1_end
}

/// Get the start date of the current period based on strategy
fn get_current_period_start(
    config: &database_partition_config::DatabasePartitionConfig,
) -> NaiveDateTime {
    let now = Utc::now().naive_utc();
    let today = now.date();

    match config.strategy {
        database_partition_config::PartitionStrategy::Daily => {
            // Today at 00:00:00
            today.and_hms_opt(0, 0, 0).unwrap()
        }
        database_partition_config::PartitionStrategy::Weekly => {
            // This week's Monday at 00:00:00
            let days_from_monday = today.weekday().num_days_from_monday() as i64;
            let week_start = today - chrono::Duration::days(days_from_monday);
            week_start.and_hms_opt(0, 0, 0).unwrap()
        }
        database_partition_config::PartitionStrategy::Monthly => {
            // First day of current month at 00:00:00
            NaiveDate::from_ymd_opt(today.year(), today.month(), 1)
                .unwrap()
                .and_hms_opt(0, 0, 0)
                .unwrap()
        }
        _ => today.and_hms_opt(0, 0, 0).unwrap()
    }
}

/// Query main database for trendlog data
async fn query_main_database(
    db: &DatabaseConnection,
    start_date: NaiveDateTime,
    end_date: NaiveDateTime,
    filters: &TrendlogFilters,
) -> Result<Vec<TrendlogDataRecord>> {
    let query_sql = build_trendlog_query("main", start_date, end_date, filters);

    let results = db.query_all(Statement::from_string(
        DatabaseBackend::Sqlite,
        query_sql
    )).await?;

    parse_query_results(results)
}

/// Query a partition file using ATTACH DATABASE
async fn query_partition_file(
    partition_path: &str,
    start_date: NaiveDateTime,
    end_date: NaiveDateTime,
    filters: &TrendlogFilters,
) -> Result<Vec<TrendlogDataRecord>> {
    let db = establish_t3_device_connection().await
        .map_err(|e| crate::error::Error::ServerError(format!("Database connection failed: {}", e)))?;

    // Attach partition database
    let attach_sql = format!(
        "ATTACH DATABASE '{}' AS partition_db",
        format_path_for_attach(Path::new(partition_path))
    );

    db.execute(Statement::from_string(DatabaseBackend::Sqlite, attach_sql)).await?;

    // Query with filters
    let query_sql = build_trendlog_query("partition_db", start_date, end_date, filters);

    let results = db.query_all(Statement::from_string(
        DatabaseBackend::Sqlite,
        query_sql
    )).await?;

    // Detach partition
    db.execute(Statement::from_string(
        DatabaseBackend::Sqlite,
        "DETACH DATABASE partition_db".to_string()
    )).await?;

    // Parse results
    parse_query_results(results)
}

/// Build SQL query for trendlog data
fn build_trendlog_query(
    db_alias: &str,
    start_date: NaiveDateTime,
    end_date: NaiveDateTime,
    filters: &TrendlogFilters,
) -> String {
    let mut where_clauses = vec![
        format!("datetime(tdd.logging_time_fmt) >= datetime('{}')", start_date.format("%Y-%m-%d %H:%M:%S")),
        format!("datetime(tdd.logging_time_fmt) <= datetime('{}')", end_date.format("%Y-%m-%d %H:%M:%S")),
    ];

    if let Some(serial) = filters.serial_number {
        where_clauses.push(format!("td.SerialNumber = {}", serial));
    }

    if let Some(panel) = filters.panel_id {
        where_clauses.push(format!("td.PanelId = {}", panel));
    }

    if let Some(ref point_id) = filters.point_id {
        where_clauses.push(format!("td.PointId = '{}'", point_id));
    }

    if let Some(ref point_type) = filters.point_type {
        where_clauses.push(format!("td.PointType = '{}'", point_type));
    }

    let where_clause = where_clauses.join(" AND ");

    format!(
        r#"
        SELECT
            td.SerialNumber,
            td.PanelId,
            td.PointId,
            td.PointIndex,
            td.PointType,
            tdd.value,
            tdd.logging_time,
            tdd.logging_time_fmt,
            td.Digital_Analog,
            td.Range_Field,
            td.Units,
            tdd.data_source,
            tdd.sync_interval,
            tdd.created_by
        FROM {}.TRENDLOG_DATA td
        INNER JOIN {}.TRENDLOG_DATA_DETAIL tdd ON td.rowid = tdd.parent_id
        WHERE {}
        ORDER BY tdd.logging_time_fmt ASC
        "#,
        db_alias, db_alias, where_clause
    )
}

/// Parse query results into TrendlogDataRecord structs
fn parse_query_results(results: Vec<QueryResult>) -> Result<Vec<TrendlogDataRecord>> {
    let mut records = Vec::new();

    for row in results {
        let record = TrendlogDataRecord {
            serial_number: row.try_get("", "SerialNumber")
                .map_err(|e| crate::error::Error::ServerError(format!("Failed to get SerialNumber: {}", e)))?,
            panel_id: row.try_get("", "PanelId")
                .map_err(|e| crate::error::Error::ServerError(format!("Failed to get PanelId: {}", e)))?,
            point_id: row.try_get("", "PointId")
                .map_err(|e| crate::error::Error::ServerError(format!("Failed to get PointId: {}", e)))?,
            point_index: row.try_get("", "PointIndex")
                .map_err(|e| crate::error::Error::ServerError(format!("Failed to get PointIndex: {}", e)))?,
            point_type: row.try_get("", "PointType")
                .map_err(|e| crate::error::Error::ServerError(format!("Failed to get PointType: {}", e)))?,
            value: row.try_get("", "value")
                .map_err(|e| crate::error::Error::ServerError(format!("Failed to get value: {}", e)))?,
            logging_time: row.try_get("", "logging_time")
                .map_err(|e| crate::error::Error::ServerError(format!("Failed to get logging_time: {}", e)))?,
            logging_time_fmt: row.try_get("", "logging_time_fmt")
                .map_err(|e| crate::error::Error::ServerError(format!("Failed to get logging_time_fmt: {}", e)))?,
            digital_analog: row.try_get("", "Digital_Analog").ok(),
            range_field: row.try_get("", "Range_Field").ok(),
            units: row.try_get("", "Units").ok(),
            data_source: row.try_get("", "data_source").ok(),
            sync_interval: row.try_get("", "sync_interval").ok(),
            created_by: row.try_get("", "created_by").ok(),
        };

        records.push(record);
    }

    Ok(records)
}
