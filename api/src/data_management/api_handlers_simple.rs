use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::Json as ResponseJson,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use anyhow::Result;

use super::manager::DataManager;
use super::types::*;

/// Application state containing data manager
#[derive(Clone)]
pub struct AppState {
    pub data_manager: Arc<DataManager>,
}

/// Query parameters for time series data
#[derive(Debug, Deserialize)]
pub struct TimeSeriesQuery {
    pub start_time: Option<i64>,
    pub end_time: Option<i64>,
    pub interval_seconds: Option<i32>,
    pub limit: Option<i32>,
}

/// Get device data with cache statistics
pub async fn get_device_data(
    State(state): State<AppState>,
    Path(device_id): Path<i32>
) -> Result<ResponseJson<ApiResponse<DeviceDataResponse>>, StatusCode> {
    log::info!("Getting device data for device {}", device_id);

    // Get cached data for device
    let cached_data = match state.data_manager.get_device_cached_data(device_id).await {
        Ok(data) => data,
        Err(e) => {
            log::error!("Failed to get cached data: {}", e);
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
    };

    let response = DeviceDataResponse {
        device_id,
        data_points: cached_data,
        timestamp: chrono::Utc::now().timestamp(),
        cache_hit_count: 0, // TODO: Implement cache statistics
        cache_miss_count: 0,
    };

    Ok(ResponseJson(ApiResponse::success(response, "cache")))
}

/// Get specific point data (cache-first with T3000 fallback)
pub async fn get_point_data(
    State(state): State<AppState>,
    Path((device_id, point_type, point_number)): Path<(i32, i32, i32)>
) -> Result<ResponseJson<ApiResponse<DataPoint>>, StatusCode> {
    log::info!("Getting point data for device {} point {}:{}", device_id, point_type, point_number);

    // Try cache first
    match state.data_manager.get_cached_data(device_id, point_type, point_number).await {
        Ok(Some(cached)) => {
            if cached.is_data_fresh() {
                let data_point = DataPoint {
                    device_id: cached.device_id,
                    point_type: cached.point_type,
                    point_number: cached.point_number,
                    value: cached.value,
                    quality: cached.quality,
                    timestamp: cached.timestamp,
                    data_type: cached.data_type,
                    unit_code: cached.unit_code,
                    unit_symbol: None, // TODO: Get from monitoring point
                    is_fresh: true,
                };
                return Ok(ResponseJson(ApiResponse::success(data_point, "cache")));
            }
        }
        Ok(None) => {
            log::debug!("No cached data found for device {} point {}:{}", device_id, point_type, point_number);
        }
        Err(e) => {
            log::error!("Cache lookup failed: {}", e);
        }
    }

    // Fallback to T3000 (simulated for now)
    match fetch_from_t3000(device_id, point_type, point_number).await {
        Ok(data_point) => Ok(ResponseJson(ApiResponse::success(data_point, "t3000"))),
        Err(e) => {
            log::error!("T3000 fetch failed: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

/// Update device data (batch operation)
pub async fn update_device_data(
    State(state): State<AppState>,
    Path(device_id): Path<i32>,
    ResponseJson(batch): ResponseJson<DeviceDataBatch>
) -> Result<ResponseJson<ApiResponse<String>>, StatusCode> {
    log::info!("Updating device data for device {} with {} points", device_id, batch.data_points.len());

    match state.data_manager.cache_realtime_data_batch(&batch.data_points).await {
        Ok(_) => Ok(ResponseJson(ApiResponse::success("Data updated successfully".to_string(), "database"))),
        Err(e) => {
            log::error!("Failed to update device data: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

/// Get time series data for a monitoring point
pub async fn get_timeseries_data(
    State(state): State<AppState>,
    Path((device_id, point_type, point_number)): Path<(i32, i32, i32)>,
    Query(query): Query<TimeSeriesQuery>
) -> Result<ResponseJson<ApiResponse<TimeSeriesResponse>>, StatusCode> {
    log::info!("Getting timeseries data for device {} point {}:{}", device_id, point_type, point_number);

    let start_time = query.start_time.unwrap_or_else(|| chrono::Utc::now().timestamp() - 86400); // Default: last 24h
    let end_time = query.end_time.unwrap_or_else(|| chrono::Utc::now().timestamp());

    match state.data_manager.query_timeseries_data(
        device_id,
        point_type,
        point_number,
        start_time,
        end_time,
        query.limit
    ).await {
        Ok(data) => {
            let response = TimeSeriesResponse {
                device_id,
                point_type,
                point_number,
                data,
                start_time,
                end_time,
                count: 0, // TODO: Set actual count
                source_tables: vec![], // TODO: Set actual source tables
            };
            Ok(ResponseJson(ApiResponse::success(response, "database")))
        }
        Err(e) => {
            log::error!("Failed to get timeseries data: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

/// Store time series data (batch operation)
pub async fn store_timeseries_batch(
    State(state): State<AppState>,
    ResponseJson(data_points): ResponseJson<Vec<TimeSeriesData>>
) -> Result<ResponseJson<ApiResponse<String>>, StatusCode> {
    log::info!("Storing {} timeseries data points", data_points.len());

    match state.data_manager.store_timeseries_data(&data_points).await {
        Ok(_) => Ok(ResponseJson(ApiResponse::success("Timeseries data stored successfully".to_string(), "database"))),
        Err(e) => {
            log::error!("Failed to store timeseries data: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

/// Get trend logs for a device
pub async fn get_trend_logs(
    State(state): State<AppState>,
    Path(device_id): Path<i32>
) -> Result<ResponseJson<ApiResponse<Vec<TrendLog>>>, StatusCode> {
    log::info!("Getting trend logs for device {}", device_id);

    match state.data_manager.get_trend_logs(device_id).await {
        Ok(trend_logs) => Ok(ResponseJson(ApiResponse::success(trend_logs, "database"))),
        Err(e) => {
            log::error!("Failed to get trend logs: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

/// Get monitoring points for a device
pub async fn get_monitoring_points(
    State(state): State<AppState>,
    Path(device_id): Path<i32>
) -> Result<ResponseJson<ApiResponse<Vec<MonitoringPoint>>>, StatusCode> {
    log::info!("Getting monitoring points for device {}", device_id);

    match state.data_manager.get_monitoring_points(device_id).await {
        Ok(points) => Ok(ResponseJson(ApiResponse::success(points, "database"))),
        Err(e) => {
            log::error!("Failed to get monitoring points: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

/// Simulate fetching data from T3000 (placeholder for actual implementation)
async fn fetch_from_t3000(device_id: i32, point_type: i32, point_number: i32) -> Result<DataPoint, Box<dyn std::error::Error + Send + Sync>> {
    log::debug!("Simulating T3000 fetch for device {} point {}:{}", device_id, point_type, point_number);

    // TODO: Replace with actual T3000 interface calls
    // This would use the T3000 C++ interface to get real data

    // For now, return simulated data
    Ok(DataPoint {
        device_id,
        point_type,
        point_number,
        value: "72.5".to_string(), // Simulated temperature
        quality: "Good".to_string(),
        timestamp: chrono::Utc::now().timestamp(),
        data_type: "Float".to_string(),
        unit_code: Some(62), // Fahrenheit
        unit_symbol: Some("°F".to_string()),
        is_fresh: true,
    })
}
