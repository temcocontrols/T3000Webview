// T3000 TrendLog Data Service - Historical Data Management (Split-Table Optimized)
// Handles TRENDLOG_DATA (parent) and TRENDLOG_DATA_DETAIL (child) table operations
// Uses parent_id caching for optimal performance
use sea_orm::*;
use serde::{Deserialize, Serialize};
use chrono::{Duration, Utc};
use crate::entity::t3_device::{trendlog_data, trendlog_data_detail};
use crate::t3_device::trendlog_parent_cache::{TrendlogParentCache, ParentKey};
use crate::error::AppError;
use std::sync::Arc;


async fn emit_api_log(db: &DatabaseConnection, level: &str, message: &str) {
    crate::logging::service::emit_app_log(
        db,
        level,
        "T3_Webview_API",
        Some("trendlog_data_service"),
        None,
        message,
        None,
    )
    .await;
}

/// Convert `?` placeholders to `$1, $2, …` when the backend is PostgreSQL.
/// SQLite and MySQL both accept `?`, so they pass through unchanged.
fn adapt_placeholders(backend: DbBackend, sql: &str) -> String {
    if backend != DbBackend::Postgres {
        return sql.to_string();
    }
    let mut out = String::with_capacity(sql.len() + 32);
    let mut idx = 1u32;
    for ch in sql.chars() {
        if ch == '?' {
            out.push('$');
            out.push_str(&idx.to_string());
            idx += 1;
        } else {
            out.push(ch);
        }
    }
    out
}

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

#[derive(Debug, Clone, Serialize, Deserialize)]
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

    /// Always divide values by 1000 when reading from database
    /// Database stores raw values, API returns scaled values
    /// Returns (scaled_value, original_value)
    fn scale_value_from_db(raw_value: &str) -> (f64, f64) {
        let original_value = raw_value.parse::<f64>().unwrap_or(0.0);
        let scaled_value = original_value / 1000.0;

        (scaled_value, original_value)
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
        emit_api_log(db, "info", &request_info).await;

        // Execute the query with proper error handling
        match Self::execute_history_query(db, &request).await {
            Ok(result) => {
                // Log successful completion
                emit_api_log(
                    db,
                    "info",
                    "🎉 [TrendlogDataService] History query completed successfully",
                )
                .await;
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
                emit_api_log(db, "error", &error_info).await;
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
            // From TRENDLOG_DATA_DETAIL (child) - OPTIMIZED SCHEMA (removed id, LoggingTime, SyncInterval, CreatedBy, DataSource, SyncMetadataId)
            _parent_id: i32,
            value: String,
            logging_time_fmt: String,
            // From TRENDLOG_DATA (parent)
            _serial_number: i32,
            _panel_id: i32,
            point_id: String,
            point_index: i32,
            point_type: String,
            digital_analog: Option<String>,
            range_field: Option<String>,
            units: Option<String>,
        }

        let mut sql = r#"
            SELECT
                d.ParentId as _parent_id,
                d.Value as value,
                d.LoggingTime_Fmt as logging_time_fmt,
                p.SerialNumber as _serial_number,
                p.PanelId as _panel_id,
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
            emit_api_log(db, "info", &filter_info).await;
        }

        // Apply specific points filter if provided
        if let Some(specific_points) = &request.specific_points {
            if !specific_points.is_empty() {
                let filter_info = format!(
                    "🎯 [TrendlogDataService] Applying specific points filter: {} points",
                    specific_points.len()
                );
                emit_api_log(db, "info", &filter_info).await;

                // Match by PointId + PointType + PanelId only.
                // Exclude PointIndex: C++ stores it 0-based (IN1 → index=0) but the
                // frontend sends 1-based (pointNumber+1=1), causing a systematic mismatch.
                let mut point_conditions = Vec::new();
                for point in specific_points {
                    point_conditions.push("(p.PointId = ? AND p.PointType = ?)");
                    params.push(point.point_id.clone().into());
                    params.push(point.point_type.clone().into());
                }

                sql.push_str(&format!(" AND ({})", point_conditions.join(" OR ")));

                // 🆕 DEBUG: Log the actual specific points being filtered
                let debug_points: Vec<String> = specific_points.iter()
                    .map(|p| format!("{}:{}/{}[panel:{}]", p.point_type, p.point_id, p.point_index, p.panel_id))
                    .collect();
                let debug_info = format!(
                    "🔍 [TrendlogDataService] Specific points detail: {:?}",
                    debug_points
                );
                emit_api_log(db, "info", &debug_info).await;
            }
        }

        // PERFORMANCE OPTIMIZATION: Apply time range filter if provided
        // If no time filter provided, default to last 24 hours to prevent scanning all historical data
        let mut applied_time_filter = false;

        if let Some(start_time) = &request.start_time {
            sql.push_str(" AND d.LoggingTime_Fmt >= ?");
            params.push(start_time.clone().into());
            applied_time_filter = true;

            let time_filter_info = format!(
                "⏰ [TrendlogDataService] Applied start time filter: {}",
                start_time
            );
            emit_api_log(db, "info", &time_filter_info).await;
        }

        if let Some(end_time) = &request.end_time {
            sql.push_str(" AND d.LoggingTime_Fmt <= ?");
            params.push(end_time.clone().into());
            applied_time_filter = true;

            let time_filter_info = format!(
                "⏰ [TrendlogDataService] Applied end time filter: {}",
                end_time
            );
            emit_api_log(db, "info", &time_filter_info).await;
        }

        // SAFETY: If no time filters provided, default to last 24 hours to prevent slow queries
        if !applied_time_filter {
            let default_start = chrono::Local::now() - chrono::Duration::hours(24);
            let default_start_str = default_start.format("%Y-%m-%d %H:%M:%S").to_string();
            sql.push_str(" AND d.LoggingTime_Fmt >= ?");
            params.push(default_start_str.clone().into());

            let safety_info = format!(
                "🛡️ [TrendlogDataService] No time filter provided - applying 24-hour safety limit from: {}",
                default_start_str
            );
            emit_api_log(db, "warn", &safety_info).await;
        }

        // Order by logging time (newest first)
        sql.push_str(" ORDER BY d.LoggingTime_Fmt DESC");

        // PERFORMANCE: Apply default limit if not provided to prevent huge result sets
        let default_limit = 50000; // Safety limit to prevent OOM on huge datasets
        if let Some(limit) = request.limit {
            sql.push_str(&format!(" LIMIT {}", limit));
            let limit_info = format!(
                "📊 [TrendlogDataService] Applied result limit: {}",
                limit
            );
            emit_api_log(db, "info", &limit_info).await;
        } else {
            sql.push_str(&format!(" LIMIT {}", default_limit));
            let safety_info = format!(
                "🛡️ [TrendlogDataService] No limit provided - applying safety limit: {}",
                default_limit
            );
            emit_api_log(db, "warn", &safety_info).await;
        }

        // Log query execution start
        emit_api_log(db, "info", "🔄 [TrendlogDataService] Executing JOIN query...").await;

        let query_start_time = std::time::Instant::now();

        let trendlog_data_list = JoinedTrendlogData::find_by_statement(
            Statement::from_sql_and_values(db.get_database_backend(), &adapt_placeholders(db.get_database_backend(), &sql), params)
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
        emit_api_log(db, "info", &query_result_info).await;

        // Analyze data distribution across points for debugging
        if !trendlog_data_list.is_empty() {
            use std::collections::HashMap;
            let mut point_counts: HashMap<String, usize> = HashMap::new();

            for record in &trendlog_data_list {
                let key = format!("{}_{}", record.point_type, record.point_id);
                *point_counts.entry(key).or_insert(0) += 1;
            }

            let distribution_info = format!(
                "📊 [TrendlogDataService] Data distribution - Total: {}, Unique points: {}, Records per point: {:?}",
                trendlog_data_list.len(),
                point_counts.len(),
                point_counts
            );
            emit_api_log(db, "info", &distribution_info).await;
        }

        // Format the data for the TrendLogChart component
        let format_start_time = std::time::Instant::now();

        let formatted_data: Vec<serde_json::Value> = trendlog_data_list.iter().map(|data| {
            // Always divide by 1000 when reading from database
            let (scaled_value, original_value) = Self::scale_value_from_db(&data.value);

            serde_json::json!({
                "time": data.logging_time_fmt,
                "timestamp": data.logging_time_fmt,
                "value": scaled_value,
                "point_id": data.point_id,
                "point_type": data.point_type,
                "point_index": data.point_index,
                "units": data.units,
                "range": data.range_field,
                "raw_value": data.value,
                "original_value": original_value,
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
        emit_api_log(db, "info", &format_info).await;

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
        emit_api_log(db, "info", &success_summary).await;

        // Log sample data points for debugging (first 3 records)
        if !formatted_data.is_empty() {
            let sample_count = std::cmp::min(3, formatted_data.len());
            let sample_info = format!(
                "🔍 [TrendlogDataService] Sample data (first {} of {} records):",
                sample_count, formatted_data.len()
            );
            emit_api_log(db, "info", &sample_info).await;

            for (i, sample) in formatted_data.iter().take(sample_count).enumerate() {
                let sample_detail = format!(
                    "   Record {}: Time={}, Value={}, Point={}, Type={}",
                    i + 1,
                    sample["time"].as_str().unwrap_or("N/A"),
                    sample["value"].as_f64().unwrap_or(0.0),
                    sample["point_id"].as_str().unwrap_or("N/A"),
                    sample["point_type"].as_str().unwrap_or("N/A")
                );
                emit_api_log(db, "info", &sample_detail).await;
            }
        }

        Ok(serde_json::json!({
            "device_id": request.serial_number,
            "panel_id": request.panel_id,
            "trendlog_id": request.trendlog_id,
            "data": formatted_data,
            "total_records": formatted_data.len(),
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
        emit_api_log(db, "info", &save_info).await;

        // Generate timestamp for logging - use Local time instead of UTC
        let now = chrono::Local::now();
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
            ..Default::default()
        };

        match detail_record.insert(db).await {
            Ok(_saved_detail) => {
                // Log successful save
                let success_info = format!(
                    "✅ [TrendlogDataService] Realtime data saved - Parent ID: {}, Point: {}, Time: {}",
                    parent_id,
                    data_point.point_id,
                    logging_time_fmt
                );
                emit_api_log(db, "info", &success_info).await;
                Ok(parent_id) // Return parent_id instead of detail.id
            },
            Err(error) => {
                // Log save error
                let error_info = format!(
                    "❌ [TrendlogDataService] Failed to save realtime data - Point: {}, Error: {}",
                    data_point.point_id,
                    error
                );
                emit_api_log(db, "error", &error_info).await;
                Err(error.into())
            }
        }
    }

    /// Batch save realtime data points (for multiple points at once)
    /// Uses split-table design with batch parent_id retrieval
    /// Implements retry logic with exponential backoff for database lock handling
    pub async fn save_realtime_batch(
        db: &DatabaseConnection,
        data_points: Vec<CreateTrendlogDataRequest>
    ) -> Result<u64, AppError> {
        if data_points.is_empty() {
            emit_api_log(
                db,
                "warn",
                "⚠️ [TrendlogDataService] Batch save called with empty data_points array",
            )
            .await;
            return Ok(0);
        }

        // Log batch save start
        let batch_info = format!(
            "📦 [TrendlogDataService] Starting batch save - {} data points",
            data_points.len()
        );
        emit_api_log(db, "info", &batch_info).await;

        // Use Local time instead of UTC to match user's timezone
        let now = chrono::Local::now();
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
        // ⚠️ VALIDATION: Skip points with missing/invalid values (fallback zeros not written)
        let detail_records: Vec<trendlog_data_detail::ActiveModel> = data_points.iter()
            .zip(parent_ids.iter())
            .filter_map(|(dp, &parent_id)| {
                // Skip only if value is completely empty (frontend already filtered fallback zeros via toFiniteNumber)
                if dp.value.is_empty() {
                    eprintln!(
                        "⏭️ SKIPPING data point with fallback/empty value - Point: {}, Type: {}",
                        dp.point_id, dp.point_type
                    );
                    return None; // Skip this point
                }

                Some(trendlog_data_detail::ActiveModel {
                    parent_id: Set(parent_id),
                    value: Set(dp.value.clone()),
                    logging_time_fmt: Set(logging_time_fmt.clone()),
                    ..Default::default()
                })
            })
            .collect();

        let count = detail_records.len() as u64;

        // Step 3: Batch insert with retry logic for database locks
        // Fast-fail strategy: 3 attempts with short delays (100ms, 200ms)
        // WAL mode + busy_timeout should handle most locks automatically
        // If all retries fail, return error to frontend - it will retry on next poll
        let max_retries = 3;
        let mut retry_count = 0;
        let mut last_error = None;

        while retry_count < max_retries {
            match trendlog_data_detail::Entity::insert_many(detail_records.clone()).exec(db).await {
                Ok(_result) => {
                    let batch_duration = batch_start_time.elapsed();

                    // Log retry info if applicable
                    if retry_count > 0 {
                        let retry_info = format!(
                            "✅ [TrendlogDataService] Batch save succeeded after {} retries",
                            retry_count
                        );
                        emit_api_log(db, "info", &retry_info).await;
                    }

                    // Log successful batch save
                    let success_info = format!(
                        "✅ [TrendlogDataService] Batch save completed in {:.3}ms - {} detail records inserted (split-table optimized), Time: {}",
                        batch_duration.as_millis(),
                        count,
                        logging_time_fmt
                    );
                    emit_api_log(db, "info", &success_info).await;

                    // 🆕 FIX: Removed partitioning check from hot path to prevent database locks
                    // Partitioning should be handled by a separate background task, not after every batch insert
                    // This was causing "database is locked" errors especially with 308K+ records

                    return Ok(count);
                },
                Err(error) => {
                    // Check if this is a database lock error
                    let error_string = error.to_string();
                    let is_lock_error = error_string.contains("database is locked")
                        || error_string.contains("code: 5");

                    if is_lock_error && retry_count < max_retries - 1 {
                        // Short exponential backoff: 100ms * 2^retry_count (100ms, 200ms)
                        // Total max wait: ~300ms for fast API response
                        // Frontend auto-retry will handle temporary lock failures
                        let delay_ms = 100 * (1 << retry_count);

                        let retry_info = format!(
                            "⏳ [TrendlogDataService] Database locked, retrying in {}ms (attempt {}/{})",
                            delay_ms,
                            retry_count + 1,
                            max_retries
                        );
                        emit_api_log(db, "warn", &retry_info).await;

                        // Wait before retrying
                        tokio::time::sleep(tokio::time::Duration::from_millis(delay_ms)).await;
                        retry_count += 1;
                        last_error = Some(error);
                    } else {
                        // Non-lock error or max retries reached
                        if is_lock_error {
                            let max_retry_info = format!(
                                "❌ [TrendlogDataService] Batch save failed after {} retries - database still locked",
                                max_retries
                            );
                            emit_api_log(db, "error", &max_retry_info).await;
                        }

                        // Log batch save error
                        let error_info = format!(
                            "❌ [TrendlogDataService] Batch save failed - {} points, Error: {}",
                            count,
                            error
                        );
                        emit_api_log(db, "error", &error_info).await;
                        return Err(error.into());
                    }
                }
            }
        }

        // If we get here, all retries failed
        if let Some(error) = last_error {
            let final_error = format!(
                "❌ [TrendlogDataService] Batch save failed permanently after {} retries - {} points",
                max_retries,
                count
            );
            emit_api_log(db, "error", &final_error).await;
            Err(error.into())
        } else {
            Err(AppError::DatabaseError("Unexpected retry loop exit".to_string()))
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
        emit_api_log(db, "info", &recent_info).await;

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

        let stmt = Statement::from_sql_and_values(db.get_database_backend(), &adapt_placeholders(db.get_database_backend(), &sql), params);

        match TrendlogDataPoint::find_by_statement(stmt).all(db).await {
            Ok(recent_data) => {
                // Log successful retrieval
                let success_info = format!(
                    "✅ [TrendlogDataService] Recent data retrieved - {} records found",
                    recent_data.len()
                );
                emit_api_log(db, "info", &success_info).await;
                Ok(recent_data)
            },
            Err(error) => {
                // Log error
                let error_info = format!(
                    "❌ [TrendlogDataService] Failed to get recent data - Device: {}, Error: {}",
                    serial_number,
                    error
                );
                emit_api_log(db, "error", &error_info).await;
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
            db.get_database_backend(),
            &adapt_placeholders(db.get_database_backend(), sql),
            vec![serial_number.into(), cutoff_timestamp.into()],
        )).await?;

        Ok(result.rows_affected())
    }

    /// Get trendlog data statistics
    /// Queries both parent and detail tables for comprehensive stats
    /// Returns total points, counts by type, latest timestamp, and sync metadata
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
        emit_api_log(db, "info", &stats_info).await;

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
            db.get_database_backend(),
            &adapt_placeholders(db.get_database_backend(), count_sql),
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

        // Count tracked points per type (distinct TRENDLOG_DATA parent rows)
        #[derive(Debug, sea_orm::FromQueryResult)]
        struct TrackedPerTypeResult {
            input_tracked: i64,
            output_tracked: i64,
            variable_tracked: i64,
        }

        let tracked_per_type_sql = r#"
            SELECT
                SUM(CASE WHEN PointType = 'INPUT'    THEN 1 ELSE 0 END) as input_tracked,
                SUM(CASE WHEN PointType = 'OUTPUT'   THEN 1 ELSE 0 END) as output_tracked,
                SUM(CASE WHEN PointType = 'VARIABLE' THEN 1 ELSE 0 END) as variable_tracked
            FROM TRENDLOG_DATA
            WHERE SerialNumber = ? AND PanelId = ?
        "#;

        let tracked_per_type = TrackedPerTypeResult::find_by_statement(Statement::from_sql_and_values(
            db.get_database_backend(),
            &adapt_placeholders(db.get_database_backend(), tracked_per_type_sql),
            vec![serial_number.into(), panel_id.into()],
        ))
        .one(db)
        .await?
        .unwrap_or(TrackedPerTypeResult { input_tracked: 0, output_tracked: 0, variable_tracked: 0 });

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
            db.get_database_backend(),
            &adapt_placeholders(db.get_database_backend(), latest_sql),
            vec![serial_number.into(), panel_id.into()],
        ))
        .one(db)
        .await?
        .map(|r| r.logging_time_fmt);

        // Get latest sync metadata for this device/panel
        #[derive(Debug, sea_orm::FromQueryResult)]
        struct LatestSyncMetaResult {
            records_inserted: Option<i32>,
            sync_time_fmt: Option<String>,
        }

        let latest_sync_meta_sql = r#"
            SELECT RecordsInserted as records_inserted, SyncTime_Fmt as sync_time_fmt
            FROM TRENDLOG_DATA_SYNC_METADATA
            WHERE SerialNumber = ?
              AND (PanelId = ? OR PanelId IS NULL)
              AND (Success = 1 OR Success IS NULL)
            ORDER BY id DESC
            LIMIT 1
        "#;

        let latest_sync_meta = LatestSyncMetaResult::find_by_statement(Statement::from_sql_and_values(
            db.get_database_backend(),
            &adapt_placeholders(db.get_database_backend(), latest_sync_meta_sql),
            vec![serial_number.into(), panel_id.into()],
        ))
        .one(db)
        .await?;

        let stats_duration = stats_start_time.elapsed();

        // Log statistics completion
        let completion_info = format!(
            "✅ [TrendlogDataService] Statistics completed in {:.3}ms - Points: {}, Detail Records: {}, Input: {}, Output: {}, Variable: {}, Latest: {}, LatestSyncInserted: {}",
            stats_duration.as_millis(),
            total_points,
            counts.total_count,
            counts.input_count,
            counts.output_count,
            counts.variable_count,
            latest_timestamp.as_deref().unwrap_or("N/A"),
            latest_sync_meta.as_ref().and_then(|m| m.records_inserted).unwrap_or(0)
        );
        emit_api_log(db, "info", &completion_info).await;

        Ok(serde_json::json!({
            "device_id": serial_number,
            "panel_id": panel_id,
            "total_points": total_points,
            "total_data_points": counts.total_count,
            "input_data_points": counts.input_count,
            "output_data_points": counts.output_count,
            "variable_data_points": counts.variable_count,
            "input_tracked_points": tracked_per_type.input_tracked,
            "output_tracked_points": tracked_per_type.output_tracked,
            "variable_tracked_points": tracked_per_type.variable_tracked,
            "latest_timestamp": latest_timestamp,
            "latest_sync_records_inserted": latest_sync_meta.as_ref().and_then(|m| m.records_inserted),
            "latest_sync_time_fmt": latest_sync_meta.as_ref().and_then(|m| m.sync_time_fmt.clone()),
            "message": "Trendlog data statistics retrieved successfully (split-table optimized)"
        }))
    }

    /// Get per-trendlog storage usage metrics
    /// Queries record counts and estimates storage per trendlog slot
    pub async fn get_data_usage(
        db: &DatabaseConnection,
        serial_number: i32,
        panel_id: i32
    ) -> Result<serde_json::Value, AppError> {
        let usage_info = format!(
            "📊 [TrendlogDataService] Getting data usage - Device: {}, Panel: {}",
            serial_number, panel_id
        );
        emit_api_log(db, "info", &usage_info).await;

        // Per-trendlog record counts from parent table
        #[derive(Debug, sea_orm::FromQueryResult)]
        struct TrendlogUsageRow {
            trendlog_id: String,
            record_count: i64,
            point_count: i64,
        }

        let per_trendlog_sql = r#"
            SELECT
                CAST(td.Trendlog_ID AS TEXT) as trendlog_id,
                COUNT(td.id) as record_count,
                COUNT(DISTINCT ti.id) as point_count
            FROM TRENDLOG_DATA td
            LEFT JOIN TRENDLOG_INPUTS ti ON ti.SerialNumber = td.SerialNumber
                AND CAST(ti.Trendlog_ID AS TEXT) = CAST(td.Trendlog_ID AS TEXT)
            WHERE td.SerialNumber = ? AND td.PanelId = ?
            GROUP BY td.Trendlog_ID
            ORDER BY td.Trendlog_ID
        "#;

        let rows: Vec<TrendlogUsageRow> = TrendlogUsageRow::find_by_statement(
            Statement::from_sql_and_values(
                db.get_database_backend(),
                &adapt_placeholders(db.get_database_backend(), per_trendlog_sql),
                vec![serial_number.into(), panel_id.into()],
            )
        )
        .all(db)
        .await?;

        // Estimate: ~200 bytes per detail record (timestamp + value + metadata)
        const EST_BYTES_PER_RECORD: i64 = 200;
        let trendlogs: Vec<serde_json::Value> = rows.iter().map(|r| {
            let est_kb = ((r.record_count * EST_BYTES_PER_RECORD) as f64 / 1024.0).round() as u64;
            serde_json::json!({
                "trendlogId": r.trendlog_id,
                "recordCount": r.record_count,
                "pointCount": r.point_count,
                "estimatedSizeKb": est_kb,
            })
        }).collect();

        // Total trendlog data size across all slots
        let total_records: i64 = rows.iter().map(|r| r.record_count).sum();
        let total_est_kb = ((total_records * EST_BYTES_PER_RECORD) as f64 / 1024.0).round() as u64;

        // Try to get DB file size (SQLite only)
        let db_size_kb: Option<u64> = std::env::var("T3_DB_PATH").ok()
            .or_else(|| std::env::var("DATABASE_URL").ok())
            .and_then(|path| {
                let clean = path.trim_start_matches("sqlite://");
                std::fs::metadata(clean).ok().map(|m| (m.len() / 1024) as u64)
            });

        Ok(serde_json::json!({
            "serialNumber": serial_number,
            "panelId": panel_id,
            "trendlogs": trendlogs,
            "totalRecords": total_records,
            "totalEstimatedSizeKb": total_est_kb,
            "dbFileSizeKb": db_size_kb,
            "estimatedBytesPerRecord": EST_BYTES_PER_RECORD,
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
        emit_api_log(db, "info", &smart_info).await;

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

        let stmt = Statement::from_sql_and_values(db.get_database_backend(), &adapt_placeholders(db.get_database_backend(), &sql), params);
        let raw_data = TrendlogDataPoint::find_by_statement(stmt).all(db).await?;

        let has_historical_data = !raw_data.is_empty();

        // Apply data consolidation if requested
        let final_data = if request.consolidate_duplicates {
            Self::consolidate_by_priority(raw_data)
        } else {
            raw_data
        };

        // Format data - always divide by 1000
        let formatted_data: Vec<serde_json::Value> = final_data.into_iter().map(|data| {
            let (scaled_value, original_value) = Self::scale_value_from_db(&data.value);

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
        emit_api_log(db, "info", &completion_info).await;

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
