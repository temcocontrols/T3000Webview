// T3000 TrendLog Data Service - Historical Data Management
// Handles TRENDLOG_DATA table operations for historical trend data storage and retrieval
use sea_orm::*;
use serde::{Deserialize, Serialize};
use chrono::{Duration, NaiveDateTime, Utc};
use crate::entity::t3_device::trendlog_data;
use crate::error::AppError;

// Default sync interval to match T3000MainConfig::sync_interval_secs
const DEFAULT_SYNC_INTERVAL_SECS: i32 = 30;
use crate::logger::{write_structured_log_with_level, LogLevel};

#[derive(Debug, Serialize, Deserialize)]
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

impl T3TrendlogDataService {
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

    /// Internal method to execute the actual history query
    async fn execute_history_query(
        db: &DatabaseConnection,
        request: &TrendlogHistoryRequest
    ) -> Result<serde_json::Value, AppError> {

        let mut query = trendlog_data::Entity::find()
            .filter(trendlog_data::Column::SerialNumber.eq(request.serial_number))
            .filter(trendlog_data::Column::PanelId.eq(request.panel_id));

        // Apply point types filter if provided
        if let Some(point_types) = &request.point_types {
            query = query.filter(trendlog_data::Column::PointType.is_in(point_types.clone()));
            let filter_info = format!(
                "📋 [TrendlogDataService] Applied point types filter: {:?}",
                point_types
            );
            let _ = write_structured_log_with_level("T3_Webview_API", &filter_info, LogLevel::Info);
        }

        // NEW: Apply specific points filter if provided (more precise than point_types)
        if let Some(specific_points) = &request.specific_points {
            if !specific_points.is_empty() {
                // Log detailed analysis of received point formats
                let filter_info = format!(
                    "🎯 [TrendlogDataService] Applying specific points filter: {} points",
                    specific_points.len()
                );
                let _ = write_structured_log_with_level("T3_Webview_API", &filter_info, LogLevel::Info);

                // Log each point with format analysis
                for (i, point) in specific_points.iter().enumerate() {
                    let format_analysis = if point.point_id.starts_with("IN") ||
                                            point.point_id.starts_with("OUT") ||
                                            point.point_id.starts_with("VAR") {
                        "✅ Database-compatible format"
                    } else {
                        "❌ Legacy format - needs conversion"
                    };

                    let point_analysis = format!(
                        "📍 [TrendlogDataService] Point {}: id='{}', type={}, index={}, panel={} - {}",
                        i + 1, point.point_id, point.point_type, point.point_index, point.panel_id, format_analysis
                    );
                    let _ = write_structured_log_with_level("T3_Webview_API", &point_analysis, LogLevel::Info);
                }

                // Create conditions for each specific point
                use sea_orm::Condition;

                let mut condition = Condition::any();

                for (i, point) in specific_points.iter().enumerate() {
                    // Match by point_id, point_type, point_index, and panel_id
                    let point_condition = Condition::all()
                        .add(trendlog_data::Column::PointId.eq(point.point_id.clone()))
                        .add(trendlog_data::Column::PointType.eq(point.point_type.clone()))
                        .add(trendlog_data::Column::PointIndex.eq(point.point_index))
                        .add(trendlog_data::Column::PanelId.eq(point.panel_id));

                    condition = condition.add(point_condition);

                    // Log each point detail
                    let point_detail = format!(
                        "   Point {}: ID={}, Type={}, Index={}, Panel={}",
                        i + 1, point.point_id, point.point_type, point.point_index, point.panel_id
                    );
                    let _ = write_structured_log_with_level("T3_Webview_API", &point_detail, LogLevel::Info);
                }

                query = query.filter(condition);
            }
        }

        // Apply time range filter if provided
        if let Some(start_time) = &request.start_time {
            query = query.filter(trendlog_data::Column::LoggingTimeFmt.gte(start_time.clone()));
            let time_filter_info = format!(
                "⏰ [TrendlogDataService] Applied start time filter: {}",
                start_time
            );
            let _ = write_structured_log_with_level("T3_Webview_API", &time_filter_info, LogLevel::Info);
        }

        if let Some(end_time) = &request.end_time {
            query = query.filter(trendlog_data::Column::LoggingTimeFmt.lte(end_time.clone()));
            let time_filter_info = format!(
                "⏰ [TrendlogDataService] Applied end time filter: {}",
                end_time
            );
            let _ = write_structured_log_with_level("T3_Webview_API", &time_filter_info, LogLevel::Info);
        }

        // Order by logging time (newest first for realtime, oldest first for history)
        query = query.order_by_desc(trendlog_data::Column::LoggingTimeFmt);

        // Apply limit if provided
        if let Some(limit) = request.limit {
            query = query.limit(limit);
            let limit_info = format!(
                "📊 [TrendlogDataService] Applied result limit: {}",
                limit
            );
            let _ = write_structured_log_with_level("T3_Webview_API", &limit_info, LogLevel::Info);
        }

        // Log query execution start
        let _ = write_structured_log_with_level(
            "T3_Webview_API",
            "🔄 [TrendlogDataService] Executing database query...",
            LogLevel::Info
        );

        let query_start_time = std::time::Instant::now();
        let trendlog_data_list = query.all(db).await?;
        let query_duration = query_start_time.elapsed();

        // Log query completion with performance metrics
        let query_result_info = format!(
            "📈 [TrendlogDataService] Query completed in {:.3}ms - Retrieved {} records",
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
    pub async fn save_realtime_data(
        db: &DatabaseConnection,
        data_point: CreateTrendlogDataRequest
    ) -> Result<trendlog_data::Model, AppError> {
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

        // Save point_id for error logging (before data_point is moved)
        let point_id_for_logging = data_point.point_id.clone();

        // Generate timestamp for logging
        let now = Utc::now();
        let logging_time = now.timestamp().to_string();
        let logging_time_fmt = now.format("%Y-%m-%d %H:%M:%S").to_string();

        let new_data_point = trendlog_data::ActiveModel {
            serial_number: Set(data_point.serial_number),
            panel_id: Set(data_point.panel_id),
            point_id: Set(data_point.point_id),
            point_index: Set(data_point.point_index),
            point_type: Set(data_point.point_type),
            logging_time: Set(logging_time),
            logging_time_fmt: Set(logging_time_fmt.clone()),
            value: Set(data_point.value),
            range_field: Set(data_point.range_field),
            digital_analog: Set(data_point.digital_analog),
            units: Set(data_point.units),
            // Enhanced source tracking
            data_source: Set(Some(data_point.data_source.unwrap_or_else(|| "REALTIME".to_string()))),
            sync_interval: Set(Some(data_point.sync_interval.unwrap_or(DEFAULT_SYNC_INTERVAL_SECS))),
            created_by: Set(Some(data_point.created_by.unwrap_or_else(|| "FRONTEND".to_string()))),
        };

        match new_data_point.insert(db).await {
            Ok(saved_data_point) => {
                // Log successful save
                let success_info = format!(
                    "✅ [TrendlogDataService] Realtime data saved successfully - Point: {}, Time: {}",
                    saved_data_point.point_id,
                    logging_time_fmt
                );
                let _ = write_structured_log_with_level("T3_Webview_API", &success_info, LogLevel::Info);
                Ok(saved_data_point)
            },
            Err(error) => {
                // Log save error
                let error_info = format!(
                    "❌ [TrendlogDataService] Failed to save realtime data - Point: {}, Error: {}",
                    point_id_for_logging,
                    error
                );
                let _ = write_structured_log_with_level("T3_Webview_API", &error_info, LogLevel::Error);
                Err(error.into())
            }
        }
    }

    /// Batch save realtime data points (for multiple points at once)
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
        let logging_time = now.timestamp().to_string();
        let logging_time_fmt = now.format("%Y-%m-%d %H:%M:%S").to_string();

        let active_models: Vec<trendlog_data::ActiveModel> = data_points.into_iter().map(|data_point| {
            trendlog_data::ActiveModel {
                serial_number: Set(data_point.serial_number),
                panel_id: Set(data_point.panel_id),
                point_id: Set(data_point.point_id),
                point_index: Set(data_point.point_index),
                point_type: Set(data_point.point_type),
                logging_time: Set(logging_time.clone()),
                logging_time_fmt: Set(logging_time_fmt.clone()),
                value: Set(data_point.value),
                range_field: Set(data_point.range_field),
                digital_analog: Set(data_point.digital_analog),
                units: Set(data_point.units),
                // Enhanced source tracking
                data_source: Set(Some(data_point.data_source.unwrap_or_else(|| "REALTIME".to_string()))),
                sync_interval: Set(Some(data_point.sync_interval.unwrap_or(DEFAULT_SYNC_INTERVAL_SECS))),
                created_by: Set(Some(data_point.created_by.unwrap_or_else(|| "FRONTEND".to_string()))),
            }
        }).collect();

        let count = active_models.len() as u64;
        let batch_start_time = std::time::Instant::now();

        match trendlog_data::Entity::insert_many(active_models).exec(db).await {
            Ok(_result) => {
                let batch_duration = batch_start_time.elapsed();
                // Log successful batch save
                let success_info = format!(
                    "✅ [TrendlogDataService] Batch save completed in {:.3}ms - {} records inserted, Time: {}",
                    batch_duration.as_millis(),
                    count,
                    logging_time_fmt
                );
                let _ = write_structured_log_with_level("T3_Webview_API", &success_info, LogLevel::Info);
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
    ) -> Result<Vec<trendlog_data::Model>, AppError> {
        // Log recent data request
        let recent_info = format!(
            "📊 [TrendlogDataService] Getting recent data - Device: {}, Panel: {}, Types: {:?}, Limit: {:?}",
            serial_number,
            panel_id,
            point_types,
            limit
        );
        let _ = write_structured_log_with_level("T3_Webview_API", &recent_info, LogLevel::Info);

        let mut query = trendlog_data::Entity::find()
            .filter(trendlog_data::Column::SerialNumber.eq(serial_number))
            .filter(trendlog_data::Column::PanelId.eq(panel_id));

        if let Some(types) = point_types {
            query = query.filter(trendlog_data::Column::PointType.is_in(types));
        }

        query = query.order_by_desc(trendlog_data::Column::LoggingTimeFmt);

        if let Some(limit_val) = limit {
            query = query.limit(limit_val);
        }

        match query.all(db).await {
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
    pub async fn cleanup_old_data(
        db: &DatabaseConnection,
        serial_number: i32,
        days_to_keep: i64
    ) -> Result<u64, AppError> {
        let cutoff_date = Utc::now() - chrono::Duration::days(days_to_keep);
        let cutoff_timestamp = cutoff_date.format("%Y-%m-%d %H:%M:%S").to_string();

        let result = trendlog_data::Entity::delete_many()
            .filter(trendlog_data::Column::SerialNumber.eq(serial_number))
            .filter(trendlog_data::Column::LoggingTimeFmt.lt(cutoff_timestamp))
            .exec(db)
            .await?;

        Ok(result.rows_affected)
    }

    /// Get trendlog data statistics
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

        // Get total count of data points
        let total_count = trendlog_data::Entity::find()
            .filter(trendlog_data::Column::SerialNumber.eq(serial_number))
            .filter(trendlog_data::Column::PanelId.eq(panel_id))
            .count(db)
            .await?;

        // Get counts by point type
        let input_count = trendlog_data::Entity::find()
            .filter(trendlog_data::Column::SerialNumber.eq(serial_number))
            .filter(trendlog_data::Column::PanelId.eq(panel_id))
            .filter(trendlog_data::Column::PointType.eq("INPUT"))
            .count(db)
            .await?;

        let output_count = trendlog_data::Entity::find()
            .filter(trendlog_data::Column::SerialNumber.eq(serial_number))
            .filter(trendlog_data::Column::PanelId.eq(panel_id))
            .filter(trendlog_data::Column::PointType.eq("OUTPUT"))
            .count(db)
            .await?;

        let variable_count = trendlog_data::Entity::find()
            .filter(trendlog_data::Column::SerialNumber.eq(serial_number))
            .filter(trendlog_data::Column::PanelId.eq(panel_id))
            .filter(trendlog_data::Column::PointType.eq("VARIABLE"))
            .count(db)
            .await?;

        // Get latest data timestamp
        let latest_data = trendlog_data::Entity::find()
            .filter(trendlog_data::Column::SerialNumber.eq(serial_number))
            .filter(trendlog_data::Column::PanelId.eq(panel_id))
            .order_by_desc(trendlog_data::Column::LoggingTimeFmt)
            .one(db)
            .await?;

        let latest_timestamp = latest_data.map(|data| data.logging_time_fmt);
        let stats_duration = stats_start_time.elapsed();

        // Log statistics completion
        let completion_info = format!(
            "✅ [TrendlogDataService] Statistics completed in {:.3}ms - Total: {}, Input: {}, Output: {}, Variable: {}, Latest: {}",
            stats_duration.as_millis(),
            total_count,
            input_count,
            output_count,
            variable_count,
            latest_timestamp.as_deref().unwrap_or("N/A")
        );
        let _ = write_structured_log_with_level("T3_Webview_API", &completion_info, LogLevel::Info);

        Ok(serde_json::json!({
            "device_id": serial_number,
            "panel_id": panel_id,
            "total_data_points": total_count,
            "input_data_points": input_count,
            "output_data_points": output_count,
            "variable_data_points": variable_count,
            "latest_timestamp": latest_timestamp,
            "message": "Trendlog data statistics retrieved successfully"
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

        // Build query with data source priority
        let mut query = trendlog_data::Entity::find()
            .filter(trendlog_data::Column::SerialNumber.eq(request.serial_number))
            .filter(trendlog_data::Column::PanelId.eq(request.panel_id))
            .filter(trendlog_data::Column::LoggingTimeFmt.gte(cutoff_time.format("%Y-%m-%d %H:%M:%S").to_string()));

        if !request.data_sources.is_empty() {
            query = query.filter(trendlog_data::Column::DataSource.is_in(request.data_sources.clone()));
        }

        if let Some(points) = &request.specific_points {
            let point_ids: Vec<String> = points.iter().map(|p| p.point_id.clone()).collect();
            query = query.filter(trendlog_data::Column::PointId.is_in(point_ids));
        }

        // Order by data source priority (FFI_SYNC first), then time
        let raw_data = query
            .order_by_asc(trendlog_data::Column::LoggingTimeFmt)
            .limit(request.max_points.unwrap_or(10000) as u64)
            .all(db)
            .await?;

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
                "data_source": data.data_source.unwrap_or_else(|| "UNKNOWN".to_string()),
                "sync_interval": data.sync_interval.unwrap_or(30)
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
    fn consolidate_by_priority(data_points: Vec<trendlog_data::Model>) -> Vec<trendlog_data::Model> {
        use std::collections::HashMap;

        // Group by point_id and approximate time (30-second tolerance)
        let mut time_groups: HashMap<String, Vec<trendlog_data::Model>> = HashMap::new();

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
        let mut consolidated: Vec<trendlog_data::Model> = Vec::new();

        for group_points in time_groups.into_values() {
            let best_point = group_points.into_iter().min_by_key(|point| {
                match point.data_source.as_deref() {
                    Some("FFI_SYNC") => 1,      // Highest priority
                    Some("REALTIME") => 2,      // Second priority
                    Some("HISTORICAL") => 3,    // Third priority
                    Some("MANUAL") => 4,        // Lowest priority
                    _ => 999,                   // Unknown sources last
                }
            });

            if let Some(point) = best_point {
                consolidated.push(point);
            }
        }

        // Sort by time
        consolidated.sort_by(|a, b| a.logging_time_fmt.cmp(&b.logging_time_fmt));
        consolidated
    }
}
