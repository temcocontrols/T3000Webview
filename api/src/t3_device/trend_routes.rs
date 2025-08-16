// Trend Data API Routes - HTTP and WebSocket endpoints for real-time data
use axum::{
    extract::{Query, State, WebSocketUpgrade},
    http::StatusCode,
    response::{Json, Response},
    routing::{get, post},
    Router,
};
use axum::extract::ws::{WebSocket, Message};
use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tokio::sync::mpsc;

use crate::app_state::T3AppState;
use crate::t3_device::trend_collector::{TrendDataPoint, TrendDataConfig};

#[derive(Deserialize)]
pub struct TrendDataQuery {
    pub device_id: Option<i32>,
    pub point_type: Option<String>,     // "input", "output", "variable"
    pub point_number: Option<i32>,
    pub start_time: Option<i64>,        // Unix timestamp
    pub end_time: Option<i64>,          // Unix timestamp
    pub limit: Option<i32>,
    pub page: Option<i32>,
}

#[derive(Serialize)]
pub struct TrendDataResponse {
    pub data: Vec<TrendDataPoint>,
    pub total_count: i64,
    pub page: i32,
    pub per_page: i32,
    pub has_more: bool,
}

#[derive(Deserialize)]
pub struct WebSocketSubscription {
    pub device_ids: Option<Vec<i32>>,
    pub point_types: Option<Vec<String>>,
    pub max_frequency_seconds: Option<u64>, // Minimum interval between updates
}

/// Get historical trend data via HTTP API
async fn get_trend_data(
    State(state): State<T3AppState>,
    Query(params): Query<TrendDataQuery>,
) -> Result<Json<TrendDataResponse>, StatusCode> {
    // Check if trend collector is available
    if state.trend_collector.is_none() {
        return Err(StatusCode::SERVICE_UNAVAILABLE);
    }

    // Query actual trend data from trendlog_data table with proper join
    use crate::entity::t3_device::{trendlog_data, trendlogs};
    use sea_orm::*;

    let db_guard = match &state.t3_device_conn {
        Some(conn) => conn.lock().await,
        None => return Err(StatusCode::SERVICE_UNAVAILABLE),
    };
    let db = &*db_guard;

    // Apply pagination
    let page = params.page.unwrap_or(1) as u64;
    let per_page = params.limit.unwrap_or(100) as u64;
    let offset = (page - 1) * per_page;

    // Build optimized query with proper join to get trendlog info directly
    let data_results = trendlog_data::Entity::find()
        .find_also_related(trendlogs::Entity)
        .apply_if(params.device_id, |query, device_id| {
            query.filter(trendlogs::Column::DeviceId.eq(device_id))
        })
        .apply_if(params.point_number, |query, point_number| {
            query.filter(trendlogs::Column::TrendlogNumber.eq(point_number))
        })
        .apply_if(params.start_time, |query, start_time| {
            query.filter(trendlog_data::Column::Timestamp.gte(start_time))
        })
        .apply_if(params.end_time, |query, end_time| {
            query.filter(trendlog_data::Column::Timestamp.lte(end_time))
        })
        .offset(offset)
        .limit(per_page)
        .all(db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Convert to TrendDataPoint format with proper data from join
    let trend_data: Vec<TrendDataPoint> = data_results
        .into_iter()
        .filter_map(|(data_item, trendlog_opt)| {
            trendlog_opt.map(|trendlog| TrendDataPoint {
                device_id: trendlog.device_id,
                point_type: crate::t3_device::trend_collector::PointType::Input, // Default - can be enhanced
                point_number: trendlog.trendlog_number,
                point_id: Some(data_item.trendlog_id),
                value: data_item.value as f64,
                units_type: None, // Can be enhanced by joining with point tables
                timestamp: data_item.timestamp,
                status: data_item.quality,
                source: crate::t3_device::trend_collector::DataSource::WebSocketIntercepted,
            })
        })
        .collect();

    let total_count = trend_data.len() as i64;

    let response = TrendDataResponse {
        data: trend_data,
        total_count,
        page: page as i32,
        per_page: per_page as i32,
        has_more: total_count == per_page as i64,
    };

    Ok(Json(response))
}

/// Get trend data collection status
async fn get_trend_status(
    State(state): State<T3AppState>,
) -> Result<Json<Value>, StatusCode> {
    if let Some(ref trend_collector) = state.trend_collector {
        let config = trend_collector.get_config().await;

        Ok(Json(json!({
            "enabled": config.enabled,
            "collection_interval_seconds": config.collection_interval_seconds,
            "buffer_size": config.buffer_size,
            "max_storage_days": config.max_storage_days,
            "enable_input_points": config.enable_input_points,
            "enable_output_points": config.enable_output_points,
            "enable_variable_points": config.enable_variable_points,
            "status": "active"
        })))
    } else {
        Ok(Json(json!({
            "status": "unavailable",
            "message": "Trend data collector not initialized - T3000 device database required"
        })))
    }
}

/// Update trend data collection configuration
async fn update_trend_config(
    State(state): State<T3AppState>,
    Json(config): Json<TrendDataConfig>,
) -> Result<Json<Value>, StatusCode> {
    if let Some(ref trend_collector) = state.trend_collector {
        trend_collector.update_config(config).await;

        Ok(Json(json!({
            "status": "success",
            "message": "Trend data collection configuration updated"
        })))
    } else {
        Err(StatusCode::SERVICE_UNAVAILABLE)
    }
}

/// Get real-time trend data statistics
async fn get_trend_stats(
    State(state): State<T3AppState>,
) -> Result<Json<Value>, StatusCode> {
    if state.trend_collector.is_none() {
        return Err(StatusCode::SERVICE_UNAVAILABLE);
    }

    // Mock statistics - replace with actual database queries
    Ok(Json(json!({
        "total_points_today": 1250,
        "active_devices": 3,
        "data_sources": {
            "websocket": 800,
            "manual": 300,
            "api": 150
        },
        "point_types": {
            "input": 600,
            "output": 400,
            "variable": 250
        },
        "last_collection": chrono::Utc::now().timestamp(),
        "storage_size_mb": 15.8
    })))
}

/// WebSocket endpoint for real-time trend data streaming
async fn trend_data_websocket(
    ws: WebSocketUpgrade,
    State(state): State<T3AppState>,
) -> Response {
    ws.on_upgrade(|socket| handle_trend_websocket(socket, state))
}

/// Handle WebSocket connection for real-time trend data
async fn handle_trend_websocket(
    socket: WebSocket,
    state: T3AppState,
) {
    // Check if trend data sender is available
    let data_receiver = if let Some(ref trend_sender) = state.trend_data_sender {
        trend_sender.subscribe()
    } else {
        // Can't proceed without trend data service
        return;
    };

    // Split the socket for concurrent read/write
    let (mut sender, mut receiver) = socket.split();

    // Create a channel for messages to send
    let (tx, mut rx) = mpsc::unbounded_channel::<Message>();

    // Send welcome message
    let welcome_msg = json!({
        "type": "welcome",
        "message": "Connected to real-time trend data stream"
    });
    let _ = tx.send(Message::Text(welcome_msg.to_string()));

    // Task to handle outgoing messages
    let send_task = tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            if sender.send(msg).await.is_err() {
                break;
            }
        }
    });

    // Task to handle incoming messages
    let tx_clone = tx.clone();
    let recv_task = tokio::spawn(async move {
        while let Some(msg) = receiver.next().await {
            if let Ok(Message::Text(text)) = msg {
                // Parse subscription requests
                if let Ok(subscription) = serde_json::from_str::<WebSocketSubscription>(&text) {
                    let response = json!({
                        "type": "subscription_updated",
                        "device_ids": subscription.device_ids,
                        "point_types": subscription.point_types,
                        "max_frequency_seconds": subscription.max_frequency_seconds
                    });
                    let _ = tx_clone.send(Message::Text(response.to_string()));
                }
            } else if let Ok(Message::Close(_)) = msg {
                break;
            }
        }
    });

    // Task to handle trend data broadcasting
    let mut data_receiver = data_receiver;
    let data_task = tokio::spawn(async move {
        while let Ok(trend_point) = data_receiver.recv().await {
            let message = json!({
                "type": "trend_data",
                "data": trend_point
            });

            if tx.send(Message::Text(message.to_string())).is_err() {
                break;
            }
        }
    });

    // Wait for any task to complete (usually indicates disconnect)
    tokio::select! {
        _ = send_task => {},
        _ = recv_task => {},
        _ = data_task => {},
    }
}

/// Create trend data API routes
pub fn trend_data_routes() -> Router<T3AppState> {
    Router::new()
        // HTTP API endpoints
        .route("/trend-data", get(get_trend_data))
        .route("/trend-data/status", get(get_trend_status))
        .route("/trend-data/config", post(update_trend_config))
        .route("/trend-data/stats", get(get_trend_stats))

        // WebSocket endpoint for real-time streaming
        .route("/trend-data/stream", get(trend_data_websocket))
}
