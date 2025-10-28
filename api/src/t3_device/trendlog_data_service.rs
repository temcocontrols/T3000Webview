// T3000 TrendLog Data Service - Historical Data Management (Split-Table Optimized)
// Handles TRENDLOG_DATA (parent) and TRENDLOG_DATA_DETAIL (child) table operations
// Uses parent_id caching for optimal performance
use sea_orm::*;
use serde::{Deserialize, Serialize};
use chrono::{Duration, Utc};
use crate::entity::t3_device::{trendlog_data, trendlog_data_detail};
use crate::t3_device::constants::{DATA_SOURCE_REALTIME};
use crate::t3_device::trendlog_parent_cache::{TrendlogParentCache, ParentKey};
use crate::error::AppError;
use std::sync::Arc;

// Default sync interval to match T3000MainConfig::sync_interval_secs
const DEFAULT_SYNC_INTERVAL_SECS: i32 = 30;
use crate::logger::{write_structured_log_with_level, LogLevel};

#[derive(Debug, Serialize, Deserialize, FromQueryResult)]
pub struct TrendlogDataPoint {
    pub serial_number: i32,
    pub panel_id: i32,
    pub point_id: String,
    pub point_index: i32,
    pub point_type: String,
    pub logging_time: String,
    pub logging_time_fmt: String,
    pub value: String,
    pub range_field: Option<String>,
    pub digital_analog: Option<String>,
    pub units: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateTrendlogDataRequest {
    pub serial_number: i32,
    pub panel_id: i32,
    pub point_id: String,
    pub point_index: i32,
    pub point_type: String,
    pub value: String,
    pub range_field: Option<String>,
    pub digital_analog: Option<String>,
    pub units: Option<String>,
    // Enhanced source tracking
    pub data_source: Option<String>,     // 'REALTIME', 'FFI_SYNC', 'HISTORICAL', 'MANUAL'
    pub sync_interval: Option<i32>,      // Sync interval in seconds
    pub created_by: Option<String>,      // 'FRONTEND', 'BACKEND', 'API'
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SpecificPoint {
    pub point_id: String,
    pub point_type: String,
    pub point_index: i32,
    pub panel_id: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SmartTrendlogRequest {
    pub serial_number: i32,
    pub panel_id: i32,
    pub lookback_minutes: i32,
    pub max_points: Option<usize>,
    pub data_sources: Vec<String>,
    pub consolidate_duplicates: bool,
    pub specific_points: Option<Vec<SpecificPoint>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SmartTrendlogResponse {
    pub data: Vec<serde_json::Value>,
    pub total_points: usize,
    pub sources_used: Vec<String>,
    pub consolidation_applied: bool,
    pub has_historical_data: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TrendlogHistoryRequest {
    pub serial_number: i32,
    pub panel_id: i32,
    pub trendlog_id: String,
    pub start_time: Option<String>,  // Optional start time filter
    pub end_time: Option<String>,    // Optional end time filter
    pub limit: Option<u64>,          // Optional limit for pagination
    pub point_types: Option<Vec<String>>, // Optional point types filter ["INPUT", "OUTPUT", "VARIABLE"]
    pub specific_points: Option<Vec<SpecificPoint>>, // NEW: Specific points to filter
}

pub struct T3TrendlogDataService;

// Global parent cache instance
lazy_static::lazy_static! {
    static ref PARENT_CACHE: Arc<TrendlogParentCache> = Arc::new(TrendlogParentCache::new(1000));
}

impl T3TrendlogDataService {
    /// Get access to the parent cache
    fn cache() -> &'static Arc<TrendlogParentCache> {
        &PARENT_CACHE
    }

    /// Scale large values: if value >= 1000, divide by 1000
    /// Returns (scaled_value, original_value, was_scaled)
    fn scale_value_if_needed(raw_value: &str) -> (f64, f64, bool) {
        let original_value = raw_value.parse::<f64>().unwrap_or(0.0);
        let mut scaled_value = original_value;
        let was_scaled = original_value >= 1000.0;

        if was_scaled {
            scaled_value = original_value / 1000.0;
        }

        (scaled_value, original_value, was_scaled)
    }

    /// Get historical trendlog data for a specific device and trendlog
    pub async fn get_trendlog_history(
        db: &DatabaseConnection,
        request: TrendlogHistoryRequest
    ) -> Result<serde_json::Value, AppError> {
        // Log the start of the request
        let request_info = format!(
            "🔍 [TrendlogDataService] Starting history query - Device: {}, Panel: {}, Trendlog: {}, Time: {} to {}, Limit: {:?}",
            request.serial_number,
            request.panel_id,
            request.trendlog_id,
            request.start_time.as_deref().unwrap_or("N/A"),
            request.end_time.as_deref().unwrap_or("N/A"),
            request.limit
        );
        let _ = write_structured_log_with_level("T3_Webview_API", &request_info, LogLevel::Info);

        // Execute the query with proper error handling
        match Self::execute_history_query(db, &request).await {
            Ok(result) => {
                // Log successful completion
                let _ = write_structured_log_with_level(
                    "T3_Webview_API",
                    "🎉 [TrendlogDataService] History query completed successfully",
                    LogLevel::Info
                );
                Ok(result)
            },
            Err(error) => {
                // Log the error with full context
                let error_info = format!(
                    "❌ [TrendlogDataService] History query failed - Device: {}, Panel: {}, Error: {}",
                    request.serial_number,
                    request.panel_id,
                    error
                );
                let _ = write_structured_log_with_level("T3_Webview_API", &error_info, LogLevel::Error);
                Err(error)
            }
        }
    }

    /// Internal method to execute the actual history query with JOIN
    async fn execute_history_query(
        db: &DatabaseConnection,
        request: &TrendlogHistoryRequest
    ) -> Result<serde_json::Value, AppError> {

        // Build JOIN query: detail LEFT JOIN parent
        // We use raw SQL for better control over the JOIN
        use sea_orm::FromQueryResult;

        #[derive(Debug, FromQueryResult)]
        struct JoinedTrendlogData {
            // From TRENDLOG_DATA_DETAIL (child)
            detail_id: i32,
            parent_id: i32,
            value: String,
            logging_time: i64,
            logging_time_fmt: String,
            data_source: Option<i32>,  // Fixed: Changed from String to i32 to match database schema
            sync_interval: Option<i32>,
            // From TRENDLOG_DATA (parent)
            serial_number: i32,
            panel_id: i32,
            point_id: String,
            point_index: i32,
            point_type: String,
            digital_analog: Option<String>,
            range_field: Option<String>,
            units: Option<String>,
        }

        let mut sql = r#"
            SELECT
                d.id as detail_id,
                d.ParentId as parent_id,
                d.Value as value,
                d.LoggingTime as logging_time,
                d.LoggingTime_Fmt as logging_time_fmt,
                d.DataSource as data_source,
                d.SyncInterval as sync_interval,
                p.SerialNumber as serial_number,
                p.PanelId as panel_id,
                p.PointId as point_id,
                p.PointIndex as point_index,
                p.PointType as point_type,
                p.Digital_Analog as digital_analog,
                p.Range_Field as range_field,
                p.Units as units
            FROM TRENDLOG_DATA_DETAIL d
            INNER JOIN TRENDLOG_DATA p ON d.ParentId = p.id
            WHERE p.SerialNumber = ?
              AND p.PanelId = ?
        "#.to_string();

        let mut params: Vec<sea_orm::Value> = vec![
            request.serial_number.into(),
            request.panel_id.into(),
        ];

        // Apply point types filter if provided
        if let Some(point_types) = &request.point_types {
            let placeholders = point_types.iter().map(|_| "?").collect::<Vec<_>>().join(", ");
            sql.push_str(&format!(" AND p.PointType IN ({})", placeholders));
            for pt in point_types {
                params.push(pt.clone().into());
            }

            let filter_info = format!(
                "� [TrendlogDataService] Applied point types filter: {:?}",
                point_types
            );
            let _ = write_structured_log_with_level("T3_Webview_API", &filter_info, LogLevel::Info);
        }

        // Apply specific points filter if provided
        if let Some(specific_points) = &request.specific_points {
            if !specific_points.is_empty() {
                let filter_info = format!(
                    "🎯 [TrendlogDataService] Applying specific points filter: {} points",
                    specific_points.len()
                );
                let _ = write_structured_log_with_level("T3_Webview_API", &filter_info, LogLevel::Info);

                let mut point_conditions = Vec::new();
                for point in specific_points {
                    point_conditions.push("(p.PointId = ? AND p.PointType = ? AND p.PointIndex = ? AND p.PanelId = ?)");
                    params.push(point.point_id.clone().into());
                    params.push(point.point_type.clone().into());
                    params.push(point.point_index.into());
                    params.push(point.panel_id.into());
                }

                sql.push_str(&format!(" AND ({})", point_conditions.join(" OR ")));
            }
        }

        // Apply time range filter if provided
        if let Some(start_time) = &request.start_time {
            sql.push_str(" AND d.LoggingTime_Fmt >= ?");
            params.push(start_time.clone().into());

            let time_filter_info = format!(
                "⏰ [TrendlogDataService] Applied start time filter: {}",
                start_time
            );
            let _ = write_structured_log_with_level("T3_Webview_API", &time_filter_info, LogLevel::Info);
        }

        if let Some(end_time) = &request.end_time {
            sql.push_str(" AND d.LoggingTime_Fmt <= ?");
            params.push(end_time.clone().into());

            let time_filter_info = format!(
                "⏰ [TrendlogDataService] Applied end time filter: {}",
                end_time
            );
            let _ = write_structured_log_with_level("T3_Webview_API", &time_filter_info, LogLevel::Info);
        }

        // Order by logging time (newest first)
        sql.push_str(" ORDER BY d.LoggingTime_Fmt DESC");

        // Apply limit if provided
        if let Some(limit) = request.limit {
            sql.push_str(&format!(" LIMIT {}", limit));
            let limit_info = format!(
                "📊 [TrendlogDataService] Applied result limit: {}",
                limit
            );
            let _ = write_structured_log_with_level("T3_Webview_API", &limit_info, LogLevel::Info);
        }

        // Log query execution start
        let _ = write_structured_log_with_level(
            "T3_Webview_API",
            "🔄 [TrendlogDataService] Executing JOIN query...",
            LogLevel::Info
        );

        let query_start_time = std::time::Instant::now();

        let trendlog_data_list = JoinedTrendlogData::find_by_statement(
            Statement::from_sql_and_values(DbBackend::Sqlite, &sql, params)
        )
        .all(db)
        .await?;

        let query_duration = query_start_time.elapsed();

        // Log query completion with performance metrics
        let query_result_info = format!(
            "📈 [TrendlogDataService] JOIN query completed in {:.3}ms - Retrieved {} records",
            query_duration.as_millis(),
            trendlog_data_list.len()
        );
        let _ = write_structured_log_with_level("T3_Webview_API", &query_result_info, LogLevel::Info);

        // Format the data for the TrendLogChart component
        let format_start_time = std::time::Instant::now();
        let formatted_data: Vec<serde_json::Value> = trendlog_data_list.iter().map(|data| {
            // Scale value if needed (divide by 1000 if >= 1000)
            let (scaled_value, original_value, was_scaled) = Self::scale_value_if_needed(&data.value);

            // Log scaling operations for debugging
            if was_scaled {
                let scale_info = format!(
                    "📏 [TrendlogDataService] Value scaled - Point: {}, Original: {:.2}, Scaled: {:.3}",
                    data.point_id, original_value, scaled_value
                );
                let _ = write_structured_log_with_level("T3_Webview_API", &scale_info, LogLevel::Info);
            }

            serde_json::json!({
                "time": data.logging_time_fmt,
                "value": scaled_value,
                "point_id": data.point_id,
                "point_type": data.point_type,
                "point_index": data.point_index,
                "units": data.units,
                "range": data.range_field,
                "raw_value": data.value,
                "original_value": original_value, // Include original value for reference
                "was_scaled": was_scaled, // Indicate if value was scaled
                "is_analog": data.digital_analog.as_ref().map(|da| da == "1").unwrap_or(true)
            })
        }).collect();
        let format_duration = format_start_time.elapsed();

        // Log data formatting completion
        let format_info = format!(
            "🔄 [TrendlogDataService] Data formatting completed in {:.3}ms - {} data points processed",
            format_duration.as_millis(),
            formatted_data.len()
        );
        let _ = write_structured_log_with_level("T3_Webview_API", &format_info, LogLevel::Info);

        // Create detailed response message
        let specific_points_count = request.specific_points.as_ref().map(|sp| sp.len()).unwrap_or(0);
        let message = if specific_points_count > 0 {
            format!("Trendlog history data retrieved successfully (filtered for {} specific points)", specific_points_count)
        } else {
            "Trendlog history data retrieved successfully".to_string()
        };

        // Final success log with comprehensive summary
        let success_summary = format!(
            "✅ [TrendlogDataService] Request completed successfully - Device: {}, Panel: {}, Records: {}, Specific Points: {}, Time Range: {} to {}",
            request.serial_number,
            request.panel_id,
            formatted_data.len(),
            specific_points_count,
            request.start_time.as_deref().unwrap_or("N/A"),
            request.end_time.as_deref().unwrap_or("N/A")
        );
        let _ = write_structured_log_with_level("T3_Webview_API", &success_summary, LogLevel::Info);

        // Log sample data points for debugging (first 3 records)
        if !formatted_data.is_empty() {
            let sample_count = std::cmp::min(3, formatted_data.len());
            let sample_info = format!(
                "🔍 [TrendlogDataService] Sample data (first {} of {} records):",
                sample_count, formatted_data.len()
            );
            let _ = write_structured_log_with_level("T3_Webview_API", &sample_info, LogLevel::Info);

            for (i, sample) in formatted_data.iter().take(sample_count).enumerate() {
                let sample_detail = format!(
                    "   Record {}: Time={}, Value={}, Point={}, Type={}",
                    i + 1,
                    sample["time"].as_str().unwrap_or("N/A"),
                    sample["value"].as_f64().unwrap_or(0.0),
                    sample["point_id"].as_str().unwrap_or("N/A"),
                    sample["point_type"].as_str().unwrap_or("N/A")
                );
                let _ = write_structured_log_with_level("T3_Webview_API", &sample_detail, LogLevel::Info);
            }
        }

        Ok(serde_json::json!({
            "device_id": request.serial_number,
            "panel_id": request.panel_id,
            "trendlog_id": request.trendlog_id,
            "data": formatted_data,
            "count": formatted_data.len(),
            "message": message,
            "filtering": {
                "specific_points_applied": specific_points_count > 0,
                "specific_points_count": specific_points_count,
                "time_range_applied": request.start_time.is_some() || request.end_time.is_some(),
                "start_time": request.start_time,
                "end_time": request.end_time
            }
        }))
    }

    /// Save realtime data to database (from socket port 9104)
    /// Uses split-table design: gets/creates parent, inserts detail
    pub async fn save_realtime_data(
        db: &DatabaseConnection,
        data_point: CreateTrendlogDataRequest
    ) -> Result<i32, AppError> {
        // Log the start of save operation
        let save_info = format!(
            "💾 [TrendlogDataService] Saving realtime data - Device: {}, Panel: {}, Point: {} ({}), Value: {}",
            data_point.serial_number,
            data_point.panel_id,
            data_point.point_id,
            data_point.point_type,
            data_point.value
        );
        let _ = write_structured_log_with_level("T3_Webview_API", &save_info, LogLevel::Info);

        // Generate timestamp for logging
        let now = Utc::now();
        let logging_time = now.timestamp();
        let logging_time_fmt = now.format("%Y-%m-%d %H:%M:%S").to_string();

        // Step 1: Get or create parent record (with caching)
        let parent_key = ParentKey {
            serial_number: data_point.serial_number,
            panel_id: data_point.panel_id,
            point_id: data_point.point_id.clone(),
            point_index: data_point.point_index,
            point_type: data_point.point_type.clone(),
        };

        let parent_id = Self::cache().get_or_create_parent(
            db,
            parent_key,
            data_point.digital_analog.clone(),
            data_point.range_field.clone(),
            data_point.units.clone(),
        ).await?;

        // Step 2: Insert detail record only
        let detail_record = trendlog_data_detail::ActiveModel {
            parent_id: Set(parent_id),
            value: Set(data_point.value.clone()),
            logging_time_fmt: Set(logging_time_fmt.clone()),
            data_source: Set(Some(DATA_SOURCE_REALTIME)),
            sync_metadata_id: Set(None), // NULL for realtime data
            ..Default::default()
        };

        match detail_record.insert(db).await {
            Ok(saved_detail) => {
                // Log successful save
                let success_info = format!(
                    "✅ [TrendlogDataService] Realtime data saved - Parent ID: {}, Point: {}, Time: {}",
                    parent_id,
                    data_point.point_id,
                    logging_time_fmt
                );
                let _ = write_structured_log_with_level("T3_Webview_API", &success_info, LogLevel::Info);
                Ok(parent_id) // Return parent_id instead of detail.id
            },
            Err(error) => {
                // Log save error
                let error_info = format!(
                    "❌ [TrendlogDataService] Failed to save realtime data - Point: {}, Error: {}",
                    data_point.point_id,
                    error
                );
                let _ = write_structured_log_with_level("T3_Webview_API", &error_info, LogLevel::Error);
                Err(error.into())
            }
        }
    }

    /// Batch save realtime data points (for multiple points at once)
    /// Uses split-table design with batch parent_id retrieval
    pub async fn save_realtime_batch(
        db: &DatabaseConnection,
        data_points: Vec<CreateTrendlogDataRequest>
    ) -> Result<u64, AppError> {
        if data_points.is_empty() {
            let _ = write_structured_log_with_level(
                "T3_Webview_API",
                "⚠️ [TrendlogDataService] Batch save called with empty data_points array",
                LogLevel::Warn
            );
            return Ok(0);
        }

        // Log batch save start
        let batch_info = format!(
            "📦 [TrendlogDataService] Starting batch save - {} data points",
            data_points.len()
        );
        let _ = write_structured_log_with_level("T3_Webview_API", &batch_info, LogLevel::Info);

        let now = Utc::now();
        let logging_time = now.timestamp();
        let logging_time_fmt = now.format("%Y-%m-%d %H:%M:%S").to_string();

        let batch_start_time = std::time::Instant::now();

        // Step 1: Batch get or create all parent_ids
        let parent_keys: Vec<(ParentKey, Option<String>, Option<String>, Option<String>)> =
            data_points.iter().map(|dp| {
                let key = ParentKey {
                    serial_number: dp.serial_number,
                    panel_id: dp.panel_id,
                    point_id: dp.point_id.clone(),
                    point_index: dp.point_index,
                    point_type: dp.point_type.clone(),
                };
                (key, dp.digital_analog.clone(), dp.range_field.clone(), dp.units.clone())
            }).collect();

        let parent_ids = Self::cache().batch_get_or_create_parents(db, parent_keys).await?;

        // Step 2: Create detail records for batch insert
        let detail_records: Vec<trendlog_data_detail::ActiveModel> = data_points.iter()
            .zip(parent_ids.iter())
            .map(|(dp, &parent_id)| {
                trendlog_data_detail::ActiveModel {
                    parent_id: Set(parent_id),
                    value: Set(dp.value.clone()),
                    logging_time_fmt: Set(logging_time_fmt.clone()),
                    data_source: Set(Some(DATA_SOURCE_REALTIME)),
                    sync_metadata_id: Set(None), // NULL for realtime data
                    ..Default::default()
                }
            })
            .collect();

        let count = detail_records.len() as u64;

        // Step 3: Batch insert all details
        match trendlog_data_detail::Entity::insert_many(detail_records).exec(db).await {
            Ok(_result) => {
                let batch_duration = batch_start_time.elapsed();
                // Log successful batch save
                let success_info = format!(
                    "✅ [TrendlogDataService] Batch save completed in {:.3}ms - {} detail records inserted (split-table optimized), Time: {}",
                    batch_duration.as_millis(),
                    count,
                    logging_time_fmt
                );
                let _ = write_structured_log_with_level("T3_Webview_API", &success_info, LogLevel::Info);

                // Check if database partitioning is needed after successful data insertion
                if let Err(e) = crate::database_management::DatabaseConfigService::check_and_apply_partitioning(db).await {
                    let partition_error = format!(
                        "⚠️ [TrendlogDataService] Partitioning check failed: {}",
                        e
                    );
                    let _ = write_structured_log_with_level("T3_Webview_API", &partition_error, LogLevel::Warn);
                }

                Ok(count)
            },
            Err(error) => {
                // Log batch save error
                let error_info = format!(
                    "❌ [TrendlogDataService] Batch save failed - {} points, Error: {}",
                    count,
                    error
                );
                let _ = write_structured_log_with_level("T3_Webview_API", &error_info, LogLevel::Error);
                Err(error.into())
            }
        }
    }

    /// Get recent trendlog data (for realtime display)
    pub async fn get_recent_data(
        db: &DatabaseConnection,
        serial_number: i32,
        panel_id: i32,
        point_types: Option<Vec<String>>,
        limit: Option<u64>
    ) -> Result<Vec<TrendlogDataPoint>, AppError> {
        // Log recent data request
        let recent_info = format!(
            "📊 [TrendlogDataService] Getting recent data - Device: {}, Panel: {}, Types: {:?}, Limit: {:?}",
            serial_number,
            panel_id,
            point_types,
            limit
        );
        let _ = write_structured_log_with_level("T3_Webview_API", &recent_info, LogLevel::Info);

        // Build SQL query with JOIN for recent data
        let mut sql = r#"
            SELECT
                p.serial_number,
                p.panel_id,
                p.point_id,
                p.point_index,
                p.point_type,
                d.logging_time,
                d.logging_time_fmt,
                d.value,
                p.range_field,
                p.digital_analog,
                p.units
            FROM TRENDLOG_DATA p
            INNER JOIN TRENDLOG_DATA_DETAIL d ON p.id = d.parent_id
            WHERE p.serial_number = ? AND p.panel_id = ?
        "#.to_string();

        let mut params: Vec<Value> = vec![serial_number.into(), panel_id.into()];

        if let Some(types) = &point_types {
            let placeholders = types.iter().map(|_| "?").collect::<Vec<_>>().join(",");
            sql.push_str(&format!(" AND p.point_type IN ({})", placeholders));
            for t in types {
                params.push(t.clone().into());
            }
        }

        sql.push_str(" ORDER BY d.logging_time_fmt DESC");

        if let Some(limit_val) = limit {
            sql.push_str(&format!(" LIMIT {}", limit_val));
        }

        let stmt = Statement::from_sql_and_values(DbBackend::Sqlite, &sql, params);

        match TrendlogDataPoint::find_by_statement(stmt).all(db).await {
            Ok(recent_data) => {
                // Log successful retrieval
                let success_info = format!(
                    "✅ [TrendlogDataService] Recent data retrieved - {} records found",
                    recent_data.len()
                );
                let _ = write_structured_log_with_level("T3_Webview_API", &success_info, LogLevel::Info);
                Ok(recent_data)
            },
            Err(error) => {
                // Log error
                let error_info = format!(
                    "❌ [TrendlogDataService] Failed to get recent data - Device: {}, Error: {}",
                    serial_number,
                    error
                );
                let _ = write_structured_log_with_level("T3_Webview_API", &error_info, LogLevel::Error);
                Err(error.into())
            }
        }
    }

    /// Delete old trendlog data (for cleanup/maintenance)
    /// Deletes from TRENDLOG_DATA_DETAIL (cascade will not delete parent metadata)
    pub async fn cleanup_old_data(
        db: &DatabaseConnection,
        serial_number: i32,
        days_to_keep: i64
    ) -> Result<u64, AppError> {
        let cutoff_date = Utc::now() - chrono::Duration::days(days_to_keep);
        let cutoff_timestamp = cutoff_date.format("%Y-%m-%d %H:%M:%S").to_string();

        // Delete from detail table only (parent metadata preserved)
        // Use raw SQL to join and delete
        let sql = r#"
            DELETE FROM TRENDLOG_DATA_DETAIL
            WHERE id IN (
                SELECT d.id
                FROM TRENDLOG_DATA_DETAIL d
                INNER JOIN TRENDLOG_DATA p ON d.ParentId = p.id
                WHERE p.SerialNumber = ? AND d.LoggingTime_Fmt < ?
            )
        "#;

        let result = db.execute(Statement::from_sql_and_values(
            DbBackend::Sqlite,
            sql,
            vec![serial_number.into(), cutoff_timestamp.into()],
        )).await?;

        Ok(result.rows_affected())
    }

    /// Get trendlog data statistics
    /// Queries both parent and detail tables for comprehensive stats
    pub async fn get_data_statistics(
        db: &DatabaseConnection,
        serial_number: i32,
        panel_id: i32
    ) -> Result<serde_json::Value, AppError> {
        // Log statistics request
        let stats_info = format!(
            "📈 [TrendlogDataService] Getting data statistics - Device: {}, Panel: {}",
            serial_number,
            panel_id
        );
        let _ = write_structured_log_with_level("T3_Webview_API", &stats_info, LogLevel::Info);

        let stats_start_time = std::time::Instant::now();

        // Count unique points (from parent table)
        let total_points = trendlog_data::Entity::find()
            .filter(trendlog_data::Column::SerialNumber.eq(serial_number))
            .filter(trendlog_data::Column::PanelId.eq(panel_id))
            .count(db)
            .await?;

        // Count detail records via raw SQL for better performance
        #[derive(Debug, sea_orm::FromQueryResult)]
        struct CountResult {
            total_count: i64,
            input_count: i64,
            output_count: i64,
            variable_count: i64,
        }

        let count_sql = r#"
            SELECT
                COUNT(d.id) as total_count,
                SUM(CASE WHEN p.PointType = 'INPUT' THEN 1 ELSE 0 END) as input_count,
                SUM(CASE WHEN p.PointType = 'OUTPUT' THEN 1 ELSE 0 END) as output_count,
                SUM(CASE WHEN p.PointType = 'VARIABLE' THEN 1 ELSE 0 END) as variable_count
            FROM TRENDLOG_DATA_DETAIL d
            INNER JOIN TRENDLOG_DATA p ON d.ParentId = p.id
            WHERE p.SerialNumber = ? AND p.PanelId = ?
        "#;

        let counts = CountResult::find_by_statement(Statement::from_sql_and_values(
            DbBackend::Sqlite,
            count_sql,
            vec![serial_number.into(), panel_id.into()],
        ))
        .one(db)
        .await?
        .unwrap_or(CountResult {
            total_count: 0,
            input_count: 0,
            output_count: 0,
            variable_count: 0,
        });

        // Get latest data timestamp from detail table
        let latest_sql = r#"
            SELECT d.LoggingTime_Fmt as logging_time_fmt
            FROM TRENDLOG_DATA_DETAIL d
            INNER JOIN TRENDLOG_DATA p ON d.ParentId = p.id
            WHERE p.SerialNumber = ? AND p.PanelId = ?
            ORDER BY d.LoggingTime_Fmt DESC
            LIMIT 1
        "#;

        #[derive(Debug, sea_orm::FromQueryResult)]
        struct LatestResult {
            logging_time_fmt: String,
        }

        let latest_timestamp = LatestResult::find_by_statement(Statement::from_sql_and_values(
            DbBackend::Sqlite,
            latest_sql,
            vec![serial_number.into(), panel_id.into()],
        ))
        .one(db)
        .await?
        .map(|r| r.logging_time_fmt);

        let stats_duration = stats_start_time.elapsed();

        // Log statistics completion
        let completion_info = format!(
            "✅ [TrendlogDataService] Statistics completed in {:.3}ms - Points: {}, Detail Records: {}, Input: {}, Output: {}, Variable: {}, Latest: {}",
            stats_duration.as_millis(),
            total_points,
            counts.total_count,
            counts.input_count,
            counts.output_count,
            counts.variable_count,
            latest_timestamp.as_deref().unwrap_or("N/A")
        );
        let _ = write_structured_log_with_level("T3_Webview_API", &completion_info, LogLevel::Info);

        Ok(serde_json::json!({
            "device_id": serial_number,
            "panel_id": panel_id,
            "total_points": total_points,
            "total_data_points": counts.total_count,
            "input_data_points": counts.input_count,
            "output_data_points": counts.output_count,
            "variable_data_points": counts.variable_count,
            "latest_timestamp": latest_timestamp,
            "message": "Trendlog data statistics retrieved successfully (split-table optimized)"
        }))
    }

    /// Smart trendlog data retrieval with source prioritization and consolidation
    pub async fn get_smart_trendlog_data(
        db: &DatabaseConnection,
        request: SmartTrendlogRequest
    ) -> Result<SmartTrendlogResponse, AppError> {
        let cutoff_time = Utc::now() - Duration::minutes(request.lookback_minutes as i64);

        let smart_info = format!(
            "🧠 [TrendlogDataService] Smart trendlog query - Device: {}, Panel: {}, Lookback: {}m, Sources: {:?}",
            request.serial_number,
            request.panel_id,
            request.lookback_minutes,
            request.data_sources
        );
        let _ = write_structured_log_with_level("T3_Webview_API", &smart_info, LogLevel::Info);

        // Build SQL query with JOIN
        let mut sql = r#"
            SELECT
                p.serial_number,
                p.panel_id,
                p.point_id,
                p.point_index,
                p.point_type,
                d.logging_time,
                d.logging_time_fmt,
                d.value,
                p.range_field,
                p.digital_analog,
                p.units
            FROM TRENDLOG_DATA p
            INNER JOIN TRENDLOG_DATA_DETAIL d ON p.id = d.parent_id
            WHERE p.serial_number = ? AND p.panel_id = ?
            AND d.logging_time_fmt >= ?
        "#.to_string();

        let mut params: Vec<Value> = vec![
            request.serial_number.into(),
            request.panel_id.into(),
            cutoff_time.format("%Y-%m-%d %H:%M:%S").to_string().into(),
        ];

        if !request.data_sources.is_empty() {
            let placeholders = request.data_sources.iter().map(|_| "?").collect::<Vec<_>>().join(",");
            sql.push_str(&format!(" AND d.data_source IN ({})", placeholders));
            for s in &request.data_sources {
                params.push(s.clone().into());
            }
        }

        if let Some(points) = &request.specific_points {
            let placeholders = points.iter().map(|_| "?").collect::<Vec<_>>().join(",");
            sql.push_str(&format!(" AND p.point_id IN ({})", placeholders));
            for p in points {
                params.push(p.point_id.clone().into());
            }
        }

        sql.push_str(" ORDER BY d.logging_time_fmt ASC");

        if let Some(max) = request.max_points {
            sql.push_str(&format!(" LIMIT {}", max));
        } else {
            sql.push_str(" LIMIT 10000");
        }

        let stmt = Statement::from_sql_and_values(DbBackend::Sqlite, &sql, params);
        let raw_data = TrendlogDataPoint::find_by_statement(stmt).all(db).await?;

        let has_historical_data = !raw_data.is_empty();

        // Apply data consolidation if requested
        let final_data = if request.consolidate_duplicates {
            Self::consolidate_by_priority(raw_data)
        } else {
            raw_data
        };

        // Format data with scaling
        let formatted_data: Vec<serde_json::Value> = final_data.into_iter().map(|data| {
            let (scaled_value, original_value, was_scaled) = Self::scale_value_if_needed(&data.value);

            serde_json::json!({
                "time": data.logging_time_fmt,
                "value": scaled_value,
                "point_id": data.point_id,
                "point_type": data.point_type,
                "point_index": data.point_index,
                "units": data.units,
                "range": data.range_field,
                "raw_value": data.value,
                "original_value": original_value,
                "was_scaled": was_scaled,
                "is_analog": data.digital_analog.as_deref() == Some("1"),
                "data_source": "N/A",  // Not queried in JOIN
                "sync_interval": 30     // Not queried in JOIN
            })
        }).collect();

        let smart_result = SmartTrendlogResponse {
            data: formatted_data.clone(),
            total_points: formatted_data.len(),
            sources_used: request.data_sources,
            consolidation_applied: request.consolidate_duplicates,
            has_historical_data,
        };

        let completion_info = format!(
            "✅ [TrendlogDataService] Smart query completed - Points: {}, HasHistorical: {}, Sources: {:?}",
            smart_result.total_points,
            smart_result.has_historical_data,
            smart_result.sources_used
        );
        let _ = write_structured_log_with_level("T3_Webview_API", &completion_info, LogLevel::Info);

        Ok(smart_result)
    }

    /// Consolidate data points by source priority (FFI_SYNC > REALTIME > others)
    fn consolidate_by_priority(data_points: Vec<TrendlogDataPoint>) -> Vec<TrendlogDataPoint> {
        use std::collections::HashMap;

        // Group by point_id and approximate time (30-second tolerance)
        let mut time_groups: HashMap<String, Vec<TrendlogDataPoint>> = HashMap::new();

        for point in data_points {
            // Create composite key: point_id + rounded_time
            let time_key = if let Ok(parsed_time) = chrono::NaiveDateTime::parse_from_str(&point.logging_time_fmt, "%Y-%m-%d %H:%M:%S") {
                let rounded_minutes = parsed_time.and_utc().timestamp() / 30 * 30; // 30-second groups
                format!("{}_{}", point.point_id, rounded_minutes)
            } else {
                format!("{}_{}", point.point_id, point.logging_time_fmt)
            };

            time_groups.entry(time_key).or_insert_with(Vec::new).push(point);
        }

        // For each group, select highest priority data source
        let mut consolidated: Vec<TrendlogDataPoint> = Vec::new();

        for group_points in time_groups.into_values() {
            // Since we don't have data_source in TrendlogDataPoint, just take the first point
            // In the future, we could add data_source to the SELECT query if needed
            if let Some(point) = group_points.into_iter().next() {
                consolidated.push(point);
            }
        }

        // Sort by time
        consolidated.sort_by(|a, b| a.logging_time_fmt.cmp(&b.logging_time_fmt));
        consolidated
    }
}
