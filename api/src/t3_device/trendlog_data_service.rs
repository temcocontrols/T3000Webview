// T3000 TrendLog Data Service - Historical Data Management
// Handles TRENDLOG_DATA table operations for historical trend data storage and retrieval
use sea_orm::*;
use serde::{Deserialize, Serialize};
use chrono::Utc;
use crate::entity::t3_device::trendlog_data;
use crate::error::AppError;

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
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SpecificPoint {
    pub point_id: String,
    pub point_type: String,
    pub point_index: i32,
    pub panel_id: i32,
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
    /// Get historical trendlog data for a specific device and trendlog
    pub async fn get_trendlog_history(
        db: &DatabaseConnection,
        request: TrendlogHistoryRequest
    ) -> Result<serde_json::Value, AppError> {
        let mut query = trendlog_data::Entity::find()
            .filter(trendlog_data::Column::SerialNumber.eq(request.serial_number))
            .filter(trendlog_data::Column::PanelId.eq(request.panel_id));

        // Apply point types filter if provided
        if let Some(point_types) = &request.point_types {
            query = query.filter(trendlog_data::Column::PointType.is_in(point_types.clone()));
        }

        // NEW: Apply specific points filter if provided (more precise than point_types)
        if let Some(specific_points) = &request.specific_points {
            if !specific_points.is_empty() {
                // Create conditions for each specific point
                use sea_orm::Condition;

                let mut condition = Condition::any();

                for point in specific_points {
                    // Match by point_id, point_type, point_index, and panel_id
                    let point_condition = Condition::all()
                        .add(trendlog_data::Column::PointId.eq(point.point_id.clone()))
                        .add(trendlog_data::Column::PointType.eq(point.point_type.clone()))
                        .add(trendlog_data::Column::PointIndex.eq(point.point_index))
                        .add(trendlog_data::Column::PanelId.eq(point.panel_id));

                    condition = condition.add(point_condition);
                }

                query = query.filter(condition);

                // Log the filtering for debugging
                println!("🔍 [TrendlogDataService] Applying specific points filter: {} points", specific_points.len());
                for (i, point) in specific_points.iter().enumerate() {
                    println!("   Point {}: ID={}, Type={}, Index={}, Panel={}",
                        i + 1, point.point_id, point.point_type, point.point_index, point.panel_id);
                }
            }
        }

        // Apply time range filter if provided
        if let Some(start_time) = &request.start_time {
            query = query.filter(trendlog_data::Column::LoggingTimeFmt.gte(start_time.clone()));
        }

        if let Some(end_time) = &request.end_time {
            query = query.filter(trendlog_data::Column::LoggingTimeFmt.lte(end_time.clone()));
        }

        // Order by logging time (newest first for realtime, oldest first for history)
        query = query.order_by_desc(trendlog_data::Column::LoggingTimeFmt);

        // Apply limit if provided
        if let Some(limit) = request.limit {
            query = query.limit(limit);
        }

        let trendlog_data_list = query.all(db).await?;

        // Format the data for the TrendLogChart component
        let formatted_data: Vec<serde_json::Value> = trendlog_data_list.iter().map(|data| {
            // Parse the value as a float for the chart
            let numeric_value = data.value.parse::<f64>().unwrap_or(0.0);

            serde_json::json!({
                "time": data.logging_time_fmt,
                "value": numeric_value,
                "point_id": data.point_id,
                "point_type": data.point_type,
                "point_index": data.point_index,
                "units": data.units,
                "range": data.range_field,
                "raw_value": data.value,
                "is_analog": data.digital_analog.as_ref().map(|da| da == "1").unwrap_or(true)
            })
        }).collect();

        // Create detailed response message
        let specific_points_count = request.specific_points.as_ref().map(|sp| sp.len()).unwrap_or(0);
        let message = if specific_points_count > 0 {
            format!("Trendlog history data retrieved successfully (filtered for {} specific points)", specific_points_count)
        } else {
            "Trendlog history data retrieved successfully".to_string()
        };

        println!("✅ [TrendlogDataService] Query completed: {} records, {} specific points",
            formatted_data.len(), specific_points_count);

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
            logging_time_fmt: Set(logging_time_fmt),
            value: Set(data_point.value),
            range_field: Set(data_point.range_field),
            digital_analog: Set(data_point.digital_analog),
            units: Set(data_point.units),
        };

        let saved_data_point = new_data_point.insert(db).await?;
        Ok(saved_data_point)
    }

    /// Batch save realtime data points (for multiple points at once)
    pub async fn save_realtime_batch(
        db: &DatabaseConnection,
        data_points: Vec<CreateTrendlogDataRequest>
    ) -> Result<u64, AppError> {
        if data_points.is_empty() {
            return Ok(0);
        }

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
            }
        }).collect();

        let count = active_models.len() as u64;
        let _result = trendlog_data::Entity::insert_many(active_models)
            .exec(db)
            .await?;

        // For insert_many, we return the count of inserted items
        Ok(count)
    }

    /// Get recent trendlog data (for realtime display)
    pub async fn get_recent_data(
        db: &DatabaseConnection,
        serial_number: i32,
        panel_id: i32,
        point_types: Option<Vec<String>>,
        limit: Option<u64>
    ) -> Result<Vec<trendlog_data::Model>, AppError> {
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

        let recent_data = query.all(db).await?;
        Ok(recent_data)
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
}
