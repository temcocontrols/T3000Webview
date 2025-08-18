// Real-time trend data collection and storage
// This module handles data interception from WebSocket messages and stores trend data

use sea_orm::*;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{broadcast, RwLock, Mutex};
use chrono::{DateTime, Utc};

use crate::entity::t3_device::{trendlog_data, trendlogs, input_points, output_points, variable_points};
use crate::error::AppError;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrendDataPoint {
    pub device_id: i32,
    pub point_type: PointType,
    pub point_number: i32,
    pub point_id: Option<i32>, // Reference to input_points/output_points/variable_points ID
    pub value: f64,
    pub units_type: Option<i32>,
    pub timestamp: i64,
    pub status: Option<i32>,
    pub source: DataSource,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PointType {
    Input,
    Output,
    Variable,
}

impl PointType {
    pub fn to_string(&self) -> &'static str {
        match self {
            PointType::Input => "input",
            PointType::Output => "output",
            PointType::Variable => "variable",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum DataSource {
    WebSocketIntercepted,  // From existing WebSocket communication
    ManualCollection,      // From background scheduled collection
    DirectApi,            // From direct API calls
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrendDataConfig {
    pub enabled: bool,
    pub buffer_size: usize,
    pub max_storage_days: i32,
    pub collection_interval_seconds: u64,
    pub enable_input_points: bool,
    pub enable_output_points: bool,
    pub enable_variable_points: bool,
}

impl Default for TrendDataConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            buffer_size: 10000,
            max_storage_days: 90,      // 3 months default
            collection_interval_seconds: 60, // 1 minute
            enable_input_points: true,
            enable_output_points: true,
            enable_variable_points: true,
        }
    }
}

/// Real-time trend data collector service
pub struct TrendDataCollector {
    db_connection: Arc<Mutex<DatabaseConnection>>,
    config: Arc<RwLock<TrendDataConfig>>,
    data_sender: broadcast::Sender<TrendDataPoint>,
    // Cache for point metadata to avoid repeated DB queries
    point_cache: Arc<RwLock<HashMap<String, CachedPointInfo>>>,
}

#[derive(Debug, Clone)]
struct CachedPointInfo {
    pub point_id: i32,
    pub device_id: i32,
    pub label: Option<String>,
    pub units_type: Option<i32>,
    pub last_updated: DateTime<Utc>,
}

impl TrendDataCollector {
    pub fn new(
        db_connection: Arc<Mutex<DatabaseConnection>>,
    ) -> (Self, broadcast::Receiver<TrendDataPoint>) {
        let (data_sender, data_receiver) = broadcast::channel(1000);

        let collector = Self {
            db_connection,
            config: Arc::new(RwLock::new(TrendDataConfig::default())),
            data_sender,
            point_cache: Arc::new(RwLock::new(HashMap::new())),
        };

        (collector, data_receiver)
    }

    /// Start the trend data collection service
    pub async fn start(&self) -> Result<(), AppError> {
        // Start background tasks
        self.start_cache_refresh().await?;
        self.start_data_processor().await?;
        self.start_cleanup_task().await?;

        Ok(())
    }

    /// Intercept and process WebSocket message for trend data
    pub async fn intercept_websocket_message(&self, message: &serde_json::Value) -> Result<(), AppError> {
        // Parse the message and extract trend data points
        if let Some(trend_points) = self.extract_trend_data_from_message(message).await? {
            for point in trend_points {
                // Send to broadcast channel for real-time streaming
                let _ = self.data_sender.send(point);
            }
        }
        Ok(())
    }

    /// Extract trend data from WebSocket message
    async fn extract_trend_data_from_message(&self, message: &serde_json::Value) -> Result<Option<Vec<TrendDataPoint>>, AppError> {
        let mut points = Vec::new();

        // Check if this is a trend data message
        // This will need to be customized based on your T3000 message format
        if let Some(action) = message.get("action") {
            // Example message parsing - adjust based on actual T3000 format
            if let Some(data_array) = message.get("data").and_then(|d| d.as_array()) {
                for data_item in data_array {
                    if let Some(point) = self.parse_data_item(data_item).await? {
                        points.push(point);
                    }
                }
            }
        }

        Ok(if points.is_empty() { None } else { Some(points) })
    }

    /// Parse individual data item from message
    async fn parse_data_item(&self, data_item: &serde_json::Value) -> Result<Option<TrendDataPoint>, AppError> {
        // Parse based on T3000 data format
        // This is a template - adjust based on actual message structure

        let device_id = data_item.get("device_id")
            .and_then(|v| v.as_i64())
            .map(|v| v as i32);

        let point_number = data_item.get("point_number")
            .and_then(|v| v.as_i64())
            .map(|v| v as i32);

        let value = data_item.get("value")
            .and_then(|v| v.as_f64());

        let point_type_str = data_item.get("type")
            .and_then(|v| v.as_str());

        if let (Some(device_id), Some(point_number), Some(value), Some(type_str)) =
            (device_id, point_number, value, point_type_str) {

            let point_type = match type_str {
                "input" => PointType::Input,
                "output" => PointType::Output,
                "variable" => PointType::Variable,
                _ => return Ok(None),
            };

            let point = TrendDataPoint {
                device_id,
                point_type,
                point_number,
                point_id: None, // Will be resolved from cache
                value,
                units_type: data_item.get("units").and_then(|v| v.as_i64()).map(|v| v as i32),
                timestamp: Utc::now().timestamp(),
                status: data_item.get("status").and_then(|v| v.as_i64()).map(|v| v as i32),
                source: DataSource::WebSocketIntercepted,
            };

            return Ok(Some(point));
        }

        Ok(None)
    }

    /// Start cache refresh background task
    async fn start_cache_refresh(&self) -> Result<(), AppError> {
        let db = self.db_connection.clone();
        let cache = self.point_cache.clone();

        tokio::spawn(async move {
            let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(300)); // 5 minutes

            loop {
                interval.tick().await;

                let db_guard = db.lock().await;
                if let Err(e) = Self::refresh_point_cache(&*db_guard, &cache).await {
                    eprintln!("Error refreshing point cache: {}", e);
                }
            }
        });

        Ok(())
    }

    /// Refresh the point metadata cache
    async fn refresh_point_cache(
        db: &DatabaseConnection,
        cache: &Arc<RwLock<HashMap<String, CachedPointInfo>>>,
    ) -> Result<(), AppError> {
        // Load input points
        let input_points = input_points::Entity::find().all(db).await?;
        let output_points = output_points::Entity::find().all(db).await?;
        let variable_points = variable_points::Entity::find().all(db).await?;

        let mut cache_map = HashMap::new();

        // Cache input points
        for point in input_points {
            let key = format!("input_{}_{}", point.device_id, point.point_number);
            cache_map.insert(key, CachedPointInfo {
                point_id: point.id,
                device_id: point.device_id,
                label: Some(point.label.unwrap_or_else(|| "Unknown".to_string())),
                units_type: Some(point.units_type.unwrap_or(0)),
                last_updated: Utc::now(),
            });
        }

        // Cache output points
        for point in output_points {
            let key = format!("output_{}_{}", point.device_id, point.point_number);
            cache_map.insert(key, CachedPointInfo {
                point_id: point.id,
                device_id: point.device_id,
                label: Some(point.label.unwrap_or_else(|| "Unknown".to_string())),
                units_type: Some(point.units_type.unwrap_or(0)),
                last_updated: Utc::now(),
            });
        }

        // Cache variable points
        for point in variable_points {
            let key = format!("variable_{}_{}", point.device_id, point.point_number);
            cache_map.insert(key, CachedPointInfo {
                point_id: point.id,
                device_id: point.device_id,
                label: Some(point.label.unwrap_or_else(|| "Unknown".to_string())),
                units_type: Some(point.units_type.unwrap_or(0)),
                last_updated: Utc::now(),
            });
        }

        *cache.write().await = cache_map;
        println!("Point cache refreshed with {} entries", cache.read().await.len());

        Ok(())
    }

    /// Start data processor background task
    async fn start_data_processor(&self) -> Result<(), AppError> {
        let mut receiver = self.data_sender.subscribe();
        let db = self.db_connection.clone();
        let cache = self.point_cache.clone();

        tokio::spawn(async move {
            while let Ok(point) = receiver.recv().await {
                let db_guard = db.lock().await;
                if let Err(e) = Self::process_and_store_point(&*db_guard, &cache, point).await {
                    eprintln!("Error processing trend data point: {}", e);
                }
            }
        });

        Ok(())
    }

    /// Process and store trend data point
    async fn process_and_store_point(
        db: &DatabaseConnection,
        cache: &Arc<RwLock<HashMap<String, CachedPointInfo>>>,
        mut point: TrendDataPoint,
    ) -> Result<(), AppError> {
        // Resolve point_id from cache
        let point_type_str = match point.point_type {
            PointType::Input => "input",
            PointType::Output => "output",
            PointType::Variable => "variable",
        };

        let cache_key = format!("{}_{}", point_type_str, point.point_number);

        if let Some(cached_info) = cache.read().await.get(&cache_key) {
            point.point_id = Some(cached_info.point_id);
            if point.units_type.is_none() {
                point.units_type = cached_info.units_type;
            }
        }

        // Store to trendlog_data table
        Self::store_point_to_database(db, point.clone()).await?;

        println!("Stored trend data: Device {}, {} Point {}, Value: {}, Time: {}",
                 point.device_id, point_type_str, point.point_number, point.value, point.timestamp);

        Ok(())
    }

    /// Store trend data point to database
    async fn store_point_to_database(
        db: &DatabaseConnection,
        point: TrendDataPoint,
    ) -> Result<(), AppError> {
        use sea_orm::{ActiveModelTrait, Set};
        use chrono::Utc;

        // First, find or create the trendlog entry
        let trendlog = trendlogs::Entity::find()
            .filter(trendlogs::Column::DeviceId.eq(point.device_id))
            .filter(trendlogs::Column::TrendlogNumber.eq(point.point_number))
            .one(db)
            .await?;

        let trendlog_id = if let Some(existing) = trendlog {
            existing.id
        } else {
            // Create new trendlog entry
            let new_trendlog = trendlogs::ActiveModel {
                device_id: Set(point.device_id),
                trendlog_number: Set(point.point_number),
                label: Set(Some(format!("{}_{}_{}", point.point_type.to_string(), point.device_id, point.point_number))),
                description: Set(Some(format!("Auto-created trendlog for {:?} point {}", point.point_type, point.point_number))),
                interval_seconds: Set(Some(60)), // Default 1 minute
                status: Set(Some(1)), // Active
                created_at: Set(Some(Utc::now().timestamp())),
                updated_at: Set(Some(Utc::now().timestamp())),
                ..Default::default()
            };
            new_trendlog.insert(db).await?.id
        };

        // Store the actual data point
        let data_entry = trendlog_data::ActiveModel {
            trendlog_id: Set(trendlog_id),
            timestamp: Set(point.timestamp),
            value: Set(point.value as f32),
            quality: Set(Some(0)), // Good quality by default
            created_at: Set(Some(Utc::now().timestamp())),
            ..Default::default()
        };

        data_entry.insert(db).await?;
        Ok(())
    }

    /// Start cleanup task for old data
    async fn start_cleanup_task(&self) -> Result<(), AppError> {
        let db = self.db_connection.clone();
        let config = self.config.clone();

        tokio::spawn(async move {
            let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(86400)); // Daily

            loop {
                interval.tick().await;

                let max_days = config.read().await.max_storage_days;
                let db_guard = db.lock().await;
                if let Err(e) = Self::cleanup_old_data(&*db_guard, max_days).await {
                    eprintln!("Error cleaning up old trend data: {}", e);
                }
            }
        });

        Ok(())
    }

    /// Clean up old trend data
    async fn cleanup_old_data(db: &DatabaseConnection, max_days: i32) -> Result<(), AppError> {
        let cutoff_timestamp = Utc::now().timestamp() - (max_days as i64 * 86400);

        // This will be implemented when we create the trend_data table
        println!("Cleaning up trend data older than {} days (timestamp: {})", max_days, cutoff_timestamp);

        Ok(())
    }

    /// Get data sender for external use
    pub fn get_data_sender(&self) -> broadcast::Sender<TrendDataPoint> {
        self.data_sender.clone()
    }

    /// Get configuration
    pub async fn get_config(&self) -> TrendDataConfig {
        self.config.read().await.clone()
    }

    /// Update configuration
    pub async fn update_config(&self, new_config: TrendDataConfig) {
        *self.config.write().await = new_config;
    }
}
