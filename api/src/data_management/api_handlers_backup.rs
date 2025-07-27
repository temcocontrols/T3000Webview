use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
    response::Json as ResponseJson,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

use super::manager::DataManager;
use super::types::*;

/// Application state containing the data manager
#[derive(Clone)]
pub struct AppState {
    pub data_manager: Arc<DataManager>,
}

// API Request/Response types

#[derive(Debug, Deserialize)]
pub struct TimeSeriesQuery {
    pub start_time: i64,
    pub end_time: i64,
    pub interval_seconds: Option<i32>,
    pub trend_log_id: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct DeviceDataBatch {
    pub device_id: i32,
    pub data_points: Vec<DataPoint>,
}

#[derive(Debug, Serialize)]
pub struct DeviceDataResponse {
    pub device_id: i32,
    pub points: Vec<DataPoint>,
    pub last_updated: i64,
    pub cache_stats: CacheStats,
}

#[derive(Debug, Serialize)]
pub struct CacheStats {
    pub total_points: usize,
    pub fresh_points: usize,
    pub stale_points: usize,
    pub cache_hit_rate: f64,
}

// Device Data Endpoints

/// Get all cached data for a device
/// GET /api/device/{device_id}/data
pub async fn get_device_data(
    Path(device_id): Path<i32>,
    State(state): State<AppState>,
) -> Result<ResponseJson<ApiResponse<DeviceDataResponse>>, StatusCode> {
    match state.data_manager.get_device_cached_data(device_id).await {
        Ok(cached_data) => {
            let points: Vec<DataPoint> = cached_data
                .into_iter()
                .map(|cache| DataPoint {
                    device_id: cache.device_id,
                    point_type: cache.point_type,
                    point_number: cache.point_number,
                    value: cache.value,
                    timestamp: cache.timestamp,
                    data_type: cache.data_type,
                    unit_code: cache.unit_code,
                    unit_symbol: None, // TODO: Get from monitoring points
                    description: None, // TODO: Get from monitoring points
                })
                .collect();

            let fresh_count = points.iter().filter(|p| {
                let now = chrono::Utc::now().timestamp();
                (now - p.timestamp) <= 60 // Assume 60s cache duration
            }).count();

            let cache_stats = CacheStats {
                total_points: points.len(),
                fresh_points: fresh_count,
                stale_points: points.len() - fresh_count,
                cache_hit_rate: if points.is_empty() { 0.0 } else { fresh_count as f64 / points.len() as f64 },
            };

            let response = DeviceDataResponse {
                device_id,
                points,
                last_updated: chrono::Utc::now().timestamp(),
                cache_stats,
            };

            Ok(ResponseJson(ApiResponse::success(response, "cache")))
        }
        Err(e) => {
            eprintln!("Error getting device data: {}", e);
            Ok(ResponseJson(ApiResponse::error(&format!("Failed to get device data: {}", e))))
        }
    }
}

/// Get specific point data (with T3000 fallback if not cached)
/// GET /api/device/{device_id}/point/{point_type}/{point_number}
pub async fn get_point_data(
    Path((device_id, point_type, point_number)): Path<(i32, i32, i32)>,
    State(state): State<AppState>,
) -> Result<ResponseJson<ApiResponse<DataPoint>>, StatusCode> {
    // Try cache first
    match state.data_manager.get_cached_data(device_id, point_type, point_number).await {
        Ok(Some(cached_data)) if cached_data.is_data_fresh() => {
            let data_point = DataPoint {
                device_id: cached_data.device_id,
                point_type: cached_data.point_type,
                point_number: cached_data.point_number,
                value: cached_data.value,
                timestamp: cached_data.timestamp,
                data_type: cached_data.data_type,
                unit_code: cached_data.unit_code,
                unit_symbol: None,
                description: None,
            };

            return Ok(ResponseJson(ApiResponse::success(data_point, "cache")));
        }
        _ => {}
    }

    // Cache miss or stale data - fetch from T3000
    match fetch_from_t3000(device_id, point_type, point_number).await {
        Ok(data_point) => {
            // Cache the fresh data
            let cache_entry = RealtimeDataCache {
                id: None,
                device_id,
                point_type,
                point_number,
                value: data_point.value,
                timestamp: data_point.timestamp,
                data_type: data_point.data_type.clone(),
                unit_code: data_point.unit_code,
                is_fresh: 1,
                cache_duration: state.data_manager.get_config().cache_duration_seconds,
                created_at: Some(chrono::Utc::now().timestamp()),
                updated_at: Some(chrono::Utc::now().timestamp()),
            };

            if let Err(e) = state.data_manager.cache_realtime_data(&cache_entry).await {
                eprintln!("Failed to cache data: {}", e);
            }

            Ok(ResponseJson(ApiResponse::success(data_point, "t3000")))
        }
        Err(e) => {
            eprintln!("Error fetching from T3000: {}", e);
            Ok(ResponseJson(ApiResponse::error(&format!("Failed to fetch data: {}", e))))
        }
    }
}

/// Update device data (typically called by T3000 or background collector)
/// POST /api/device/{device_id}/data
pub async fn update_device_data(
    Path(device_id): Path<i32>,
    State(state): State<AppState>,
    Json(batch): Json<DeviceDataBatch>,
) -> Result<ResponseJson<ApiResponse<String>>, StatusCode> {
    if batch.device_id != device_id {
        return Ok(ResponseJson(ApiResponse::error("Device ID mismatch")));
    }

    let cache_entries: Vec<RealtimeDataCache> = batch.data_points
        .into_iter()
        .map(|point| RealtimeDataCache {
            id: None,
            device_id: point.device_id,
            point_type: point.point_type,
            point_number: point.point_number,
            value: point.value,
            timestamp: point.timestamp,
            data_type: point.data_type,
            unit_code: point.unit_code,
            is_fresh: 1,
            cache_duration: state.data_manager.get_config().cache_duration_seconds,
            created_at: Some(chrono::Utc::now().timestamp()),
            updated_at: Some(chrono::Utc::now().timestamp()),
        })
        .collect();

    match state.data_manager.cache_realtime_data_batch(&cache_entries).await {
        Ok(_) => {
            let message = format!("Updated {} data points for device {}", cache_entries.len(), device_id);
            Ok(ResponseJson(ApiResponse::success(message, "updated")))
        }
        Err(e) => {
            eprintln!("Error updating device data: {}", e);
            Ok(ResponseJson(ApiResponse::error(&format!("Failed to update data: {}", e))))
        }
    }
}

// Time Series Endpoints

/// Get time series data for a specific point
/// GET /api/timeseries/{device_id}/{point_type}/{point_number}
pub async fn get_timeseries_data(
    Path((device_id, point_type, point_number)): Path<(i32, i32, i32)>,
    Query(query): Query<TimeSeriesQuery>,
    State(state): State<AppState>,
) -> Result<ResponseJson<ApiResponse<TimeSeriesResponse>>, StatusCode> {
    match state.data_manager.get_timeseries_data(
        device_id,
        point_type,
        point_number,
        query.start_time,
        query.end_time,
        query.interval_seconds,
    ).await {
        Ok(data) => {
            let response = TimeSeriesResponse {
                total_points: data.len(),
                start_time: query.start_time,
                end_time: query.end_time,
                interval_seconds: query.interval_seconds.unwrap_or(60),
                device_info: None, // TODO: Fetch device info
                point_info: None,  // TODO: Fetch point info
                data,
            };

            Ok(ResponseJson(ApiResponse::success(response, "database")))
        }
        Err(e) => {
            eprintln!("Error getting time series data: {}", e);
            Ok(ResponseJson(ApiResponse::error(&format!("Failed to get time series data: {}", e))))
        }
    }
}

/// Store time series data batch (typically called by background collector)
/// POST /api/timeseries/batch
pub async fn store_timeseries_batch(
    State(state): State<AppState>,
    Json(data_points): Json<Vec<TimeSeriesData>>,
) -> Result<ResponseJson<ApiResponse<String>>, StatusCode> {
    match state.data_manager.store_timeseries_data(&data_points).await {
        Ok(_) => {
            let message = format!("Stored {} time series data points", data_points.len());
            Ok(ResponseJson(ApiResponse::success(message, "stored")))
        }
        Err(e) => {
            eprintln!("Error storing time series data: {}", e);
            Ok(ResponseJson(ApiResponse::error(&format!("Failed to store data: {}", e))))
        }
    }
}

// Configuration Endpoints

/// Get trend logs for a device
/// GET /api/trend-logs/{device_id}
pub async fn get_trend_logs(
    Path(device_id): Path<i32>,
    State(state): State<AppState>,
) -> Result<ResponseJson<ApiResponse<Vec<TrendLog>>>, StatusCode> {
    match state.data_manager.get_trend_logs(device_id).await {
        Ok(trend_logs) => {
            Ok(ResponseJson(ApiResponse::success(trend_logs, "database")))
        }
        Err(e) => {
            eprintln!("Error getting trend logs: {}", e);
            Ok(ResponseJson(ApiResponse::error(&format!("Failed to get trend logs: {}", e))))
        }
    }
}

/// Update trend log configuration
/// POST /api/trend-logs/{device_id}
pub async fn update_trend_log(
    Path(device_id): Path<i32>,
    State(state): State<AppState>,
    Json(trend_log): Json<TrendLog>,
) -> Result<ResponseJson<ApiResponse<TrendLog>>, StatusCode> {
    if trend_log.device_id != device_id {
        return Ok(ResponseJson(ApiResponse::error("Device ID mismatch")));
    }

    match state.data_manager.upsert_trend_log(&trend_log).await {
        Ok(updated_log) => {
            Ok(ResponseJson(ApiResponse::success(updated_log, "updated")))
        }
        Err(e) => {
            eprintln!("Error updating trend log: {}", e);
            Ok(ResponseJson(ApiResponse::error(&format!("Failed to update trend log: {}", e))))
        }
    }
}

/// Get monitoring points for a device
/// GET /api/monitoring-points/{device_id}
pub async fn get_monitoring_points(
    Path(device_id): Path<i32>,
    State(state): State<AppState>,
) -> Result<ResponseJson<ApiResponse<Vec<MonitoringPoint>>>, StatusCode> {
    match state.data_manager.get_monitoring_points(device_id).await {
        Ok(points) => {
            Ok(ResponseJson(ApiResponse::success(points, "database")))
        }
        Err(e) => {
            eprintln!("Error getting monitoring points: {}", e);
            Ok(ResponseJson(ApiResponse::error(&format!("Failed to get monitoring points: {}", e))))
        }
    }
}

// Utility function to fetch data from T3000 (placeholder)
async fn fetch_from_t3000(device_id: i32, point_type: i32, point_number: i32) -> Result<DataPoint, Box<dyn std::error::Error + Send + Sync>> {
    // TODO: Implement actual T3000 communication
    // This could use your existing WebSocket client or direct interface

    // For now, return mock data
    use rand::Rng;
    let mut rng = rand::thread_rng();

    let (value, data_type, unit_code) = match point_type {
        1 => (rng.gen_range(0.0..1.0_f64).round(), "digital".to_string(), Some(1)),
        2 => (rng.gen_range(10.0..30.0), "analog".to_string(), Some(0)),
        3 => (rng.gen_range(0.0..100.0), "analog".to_string(), Some(0)),
        _ => (rng.gen_range(0.0..1.0_f64).round(), "digital".to_string(), Some(1)),
    };

    Ok(DataPoint {
        device_id,
        point_type,
        point_number,
        value,
        timestamp: chrono::Utc::now().timestamp(),
        data_type,
        unit_code,
        unit_symbol: None,
        description: None,
    })
}
