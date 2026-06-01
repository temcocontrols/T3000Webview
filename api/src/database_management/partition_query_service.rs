use crate::db_connection::establish_t3_device_connection;
use crate::entity::{database_files, database_partition_config};
use crate::database_management::{DatabaseConfigService, format_path_for_attach};
use crate::error::Result;
use crate::constants::get_t3000_database_path;
use sea_orm::*;
use chrono::{NaiveDateTime, NaiveDate, Utc, Datelike};
use serde::{Deserialize, Serialize};
use std::path::Path;

async fn emit_query_log(db: &DatabaseConnection, level: &str, message: &str) {
    crate::logging::service::emit_app_log(
        db,
        level,
        "TRENDLOG",
        Some("partition_query_service"),
        None,
        message,
        None,
    )
    .await;
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrendlogDataRecord {
    pub serial_number: i32,
    pub panel_id: i32,
    pub point_id: String,
    pub point_index: i32,
    pub point_type: String,
    pub value: String,
    pub logging_time_fmt: String,
    pub digital_analog: Option<String>,
    pub range_field: Option<String>,
    pub units: Option<String>,
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
    pub _start_date: NaiveDateTime,
    pub _end_date: NaiveDateTime,
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

    emit_query_log(
        &db,
        "info",
        &format!(
            "Trendlog query: {} to {}",
            start_date.format("%Y-%m-%d %H:%M:%S"),
            end_date.format("%Y-%m-%d %H:%M:%S")
        ),
    )
    .await;

    if let Some(serial) = filters.serial_number {
        emit_query_log(&db, "info", &format!("Filter: SerialNumber = {}", serial)).await;
    }
    if let Some(panel) = filters.panel_id {
        emit_query_log(&db, "info", &format!("Filter: PanelId = {}", panel)).await;
    }
    if let Some(ref point_id) = filters.point_id {
        emit_query_log(&db, "info", &format!("Filter: PointId = {}", point_id)).await;
    }

    // If the partition config table is missing (old DB schema) or returns an error,
    // fall back to a direct main-DB query rather than propagating HTTP 500.
    let config = DatabaseConfigService::get_config(&db).await.unwrap_or_else(|_| {
        crate::entity::database_partition_config::DatabasePartitionConfig {
            id: None,
            strategy: crate::entity::database_partition_config::PartitionStrategy::Monthly,
            custom_days: Some(30),
            custom_months: Some(2),
            auto_cleanup_enabled: false,
            retention_value: 30,
            retention_unit: crate::entity::database_partition_config::RetentionUnit::Days,
            is_active: false, // force non-partitioned path
        }
    });

    if !config.is_active {
        emit_query_log(&db, "info", "Partitioning disabled - querying main DB only").await;
        return query_main_database(&db, start_date, end_date, &filters, &db).await;
    }

    // Determine which partitions need to be queried
    let required_partitions = identify_required_partitions(
        &db,
        &config,
        start_date.date(),
        end_date.date()
    ).await?;

    emit_query_log(&db, "info", &format!("Found {} partition(s) to query", required_partitions.len())).await;

    let mut all_results = Vec::new();

    // Query each partition
    for (idx, partition_info) in required_partitions.iter().enumerate() {
        if partition_info.is_main_db {
            emit_query_log(
                &db,
                "info",
                &format!("[{}/{}] Querying MAIN database (current period)", idx + 1, required_partitions.len()),
            )
            .await;
            let results = query_main_database(&db, start_date, end_date, &filters, &db).await?;
            emit_query_log(&db, "info", &format!("Got {} records from main DB", results.len())).await;
            all_results.extend(results);
        } else {
            emit_query_log(
                &db,
                "info",
                &format!("[{}/{}] Querying partition: {}", idx + 1, required_partitions.len(), partition_info.partition_id),
            )
            .await;
            emit_query_log(&db, "info", &format!("Path: {}", partition_info.file_path)).await;

            let results = query_partition_file(
                &partition_info.file_path,
                start_date,
                end_date,
                &filters,
                &db
            ).await?;

            emit_query_log(
                &db,
                "info",
                &format!("Got {} records from partition {}", results.len(), partition_info.partition_id),
            )
            .await;
            all_results.extend(results);
        }
    }

    // Sort by timestamp
    all_results.sort_by(|a, b| a.logging_time_fmt.cmp(&b.logging_time_fmt));

    emit_query_log(
        &db,
        "info",
        &format!(
            "Query complete: {} total records from {} source(s)",
            all_results.len(),
            required_partitions.len()
        ),
    )
    .await;

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
                    _start_date: p_start,
                    _end_date: p_end,
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
            _start_date: current_period_start,
            _end_date: current_date,
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
    log_db: &DatabaseConnection,
) -> Result<Vec<TrendlogDataRecord>> {
    let query_sql = build_trendlog_query("main", start_date, end_date, filters);

    emit_query_log(log_db, "info", "Executing query on main database...").await;

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
    log_db: &DatabaseConnection,
) -> Result<Vec<TrendlogDataRecord>> {
    let db = establish_t3_device_connection().await
        .map_err(|e| crate::error::Error::ServerError(format!("Database connection failed: {}", e)))?;

    // Attach partition database
    let formatted_path = format_path_for_attach(Path::new(partition_path));
    let attach_sql = format!("ATTACH DATABASE '{}' AS partition_db", formatted_path);

    emit_query_log(log_db, "info", &format!("Attaching: {}", formatted_path)).await;

    if let Err(e) = db
        .execute(Statement::from_string(DatabaseBackend::Sqlite, attach_sql.clone()))
        .await
    {
        emit_query_log(log_db, "error", &format!("ATTACH failed: {}", e)).await;
        return Err(crate::error::Error::ServerError(format!("Failed to attach partition: {}", e)));
    }

    emit_query_log(log_db, "info", "Partition attached successfully").await;

    // Query with filters
    let query_sql = build_trendlog_query("partition_db", start_date, end_date, filters);
    emit_query_log(log_db, "info", "Executing query on partition...").await;

    let results = db.query_all(Statement::from_string(
        DatabaseBackend::Sqlite,
        query_sql
    )).await?;

    // Detach partition
    emit_query_log(log_db, "info", "Detaching partition").await;
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
        format!("datetime(tdd.LoggingTime_Fmt) >= datetime('{}')", start_date.format("%Y-%m-%d %H:%M:%S")),
        format!("datetime(tdd.LoggingTime_Fmt) <= datetime('{}')", end_date.format("%Y-%m-%d %H:%M:%S")),
    ];

    if let Some(serial) = filters.serial_number {
        where_clauses.push(format!("td.SerialNumber = {}", serial));
    }

    if let Some(panel) = filters.panel_id {
        where_clauses.push(format!("td.PanelId = {}", panel));
    }

    if let Some(ref point_id) = filters.point_id {
        let escaped_point_id = point_id.replace("'", "''");
        where_clauses.push(format!("td.PointId = '{}'", escaped_point_id));
    }

    if let Some(ref point_type) = filters.point_type {
        let escaped_point_type = point_type.replace("'", "''");
        where_clauses.push(format!("td.PointType = '{}'", escaped_point_type));
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
            tdd.Value,
            tdd.LoggingTime_Fmt,
            td.Digital_Analog,
            td.Range_Field,
            td.Units
        FROM {}.TRENDLOG_DATA td
        INNER JOIN {}.TRENDLOG_DATA_DETAIL tdd ON td.id = tdd.ParentId
        WHERE {}
        ORDER BY tdd.LoggingTime_Fmt ASC
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
            value: row.try_get("", "Value")
                .map_err(|e| crate::error::Error::ServerError(format!("Failed to get Value: {}", e)))?,
            logging_time_fmt: row.try_get("", "LoggingTime_Fmt")
                .map_err(|e| crate::error::Error::ServerError(format!("Failed to get LoggingTime_Fmt: {}", e)))?,
            digital_analog: row.try_get("", "Digital_Analog").ok(),
            range_field: row.try_get("", "Range_Field").ok(),
            units: row.try_get("", "Units").ok(),
        };

        records.push(record);
    }

    Ok(records)
}
