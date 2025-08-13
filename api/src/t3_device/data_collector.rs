// T3000 Data Collection Service
// Handles both real-time data interception and background data collection
// Supports both direct C++ FFI calls and WebSocket message interception

use sea_orm::*;
use serde::{Deserialize, Serialize};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tokio::time::interval;
use tokio::sync::{broadcast, mpsc, RwLock};
use std::sync::Arc;
use crate::entity::t3_device::*;
use crate::error::AppError;
use crate::t3_device::t3000_ffi::T3000FFI;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataCollectionConfig {
    pub enabled: bool,
    pub collection_interval_seconds: u64,
    pub startup_delay_seconds: u64,
    pub devices_to_collect: Vec<i32>, // Empty = collect all
    pub point_types: Vec<PointType>,
    pub batch_size: usize,
    pub timeout_seconds: u64,
    pub retry_attempts: u32,
    pub enable_websocket_collection: bool,
    pub enable_cpp_direct_calls: bool,
    pub enable_bacnet_collection: bool, // Future use
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PointType {
    Input,
    Output,
    Variable,
    Program,
    Schedule,
    Alarm,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataPoint {
    pub device_id: i32,
    pub point_type: PointType,
    pub point_number: i32,
    pub value: f32,
    pub status: String,
    pub units: Option<String>,
    pub timestamp: i64,
    pub source: DataSource,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum DataSource {
    RealTime,      // From WebSocket/WebView2 messages
    Background,    // From scheduled collection
    CppDirect,     // From direct C++ function calls
    BacnetScan,    // Future: From BACnet discovery
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CollectionStatus {
    pub is_running: bool,
    pub last_collection_time: Option<i64>,
    pub next_collection_time: Option<i64>,
    pub total_points_collected: u64,
    pub errors_count: u32,
    pub active_devices: Vec<i32>,
    pub collection_source: DataSource,
}

impl Default for DataCollectionConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            collection_interval_seconds: 300, // 5 minutes
            startup_delay_seconds: 30,        // 30 second delay on startup
            devices_to_collect: vec![],       // Empty = collect all
            point_types: vec![
                PointType::Input,
                PointType::Output,
                PointType::Variable,
            ],
            batch_size: 100,
            timeout_seconds: 30,
            retry_attempts: 3,
            enable_websocket_collection: true,
            enable_cpp_direct_calls: true,  // Preferred method
            enable_bacnet_collection: false, // Future use
        }
    }
}

pub struct DataCollectionService {
    config: Arc<RwLock<DataCollectionConfig>>,
    status: Arc<RwLock<CollectionStatus>>,
    db_connection: Arc<DatabaseConnection>,
    data_sender: broadcast::Sender<DataPoint>,
    control_receiver: mpsc::Receiver<CollectionCommand>,
    control_sender: mpsc::Sender<CollectionCommand>,
}

#[derive(Debug, Clone)]
pub enum CollectionCommand {
    Start,
    Stop,
    Configure(DataCollectionConfig),
    CollectNow,
    GetStatus,
}

impl DataCollectionService {
    pub fn new(db_connection: Arc<DatabaseConnection>) -> (Self, mpsc::Sender<CollectionCommand>, broadcast::Receiver<DataPoint>) {
        let (data_sender, data_receiver) = broadcast::channel(1000);
        let (control_sender, control_receiver) = mpsc::channel(100);

        let status = CollectionStatus {
            is_running: false,
            last_collection_time: None,
            next_collection_time: None,
            total_points_collected: 0,
            errors_count: 0,
            active_devices: vec![],
            collection_source: DataSource::Background,
        };

        let service = Self {
            config: Arc::new(RwLock::new(DataCollectionConfig::default())),
            status: Arc::new(RwLock::new(status)),
            db_connection,
            data_sender,
            control_receiver,
            control_sender: control_sender.clone(),
        };

        (service, control_sender, data_receiver)
    }

    pub async fn start(&mut self) -> Result<(), AppError> {
        let mut status = self.status.write().await;
        if status.is_running {
            return Ok(());
        }

        status.is_running = true;
        status.errors_count = 0;
        drop(status);

        // Start the background collection task
        self.start_background_collection().await?;

        // Start the control command handler
        self.start_command_handler().await?;

        Ok(())
    }

    async fn start_background_collection(&self) -> Result<(), AppError> {
        let config = self.config.read().await;
        let interval_duration = Duration::from_secs(config.collection_interval_seconds);
        let startup_delay = Duration::from_secs(config.startup_delay_seconds);

        let config_clone = self.config.clone();
        let status_clone = self.status.clone();
        let db_clone = self.db_connection.clone();
        let data_sender = self.data_sender.clone();

        tokio::spawn(async move {
            // Initial startup delay
            tokio::time::sleep(startup_delay).await;

            let mut interval = interval(interval_duration);

            loop {
                interval.tick().await;

                let config = config_clone.read().await;
                if !config.enabled {
                    continue;
                }

                // Perform data collection
                if let Err(e) = Self::collect_all_data(&config, &status_clone, &db_clone, &data_sender).await {
                    eprintln!("Error during background data collection: {:?}", e);
                    let mut status = status_clone.write().await;
                    status.errors_count += 1;
                }
            }
        });

        Ok(())
    }

    async fn start_command_handler(&mut self) -> Result<(), AppError> {
        let config_clone = self.config.clone();
        let status_clone = self.status.clone();
        let db_clone = self.db_connection.clone();
        let data_sender = self.data_sender.clone();

        tokio::spawn(async move {
            // Command handler would go here - placeholder for now
            // This would handle CollectionCommand messages
        });

        Ok(())
    }

    async fn collect_all_data(
        config: &DataCollectionConfig,
        status: &Arc<RwLock<CollectionStatus>>,
        db: &DatabaseConnection,
        data_sender: &broadcast::Sender<DataPoint>,
    ) -> Result<(), AppError> {
        let now = SystemTime::now().duration_since(UNIX_EPOCH)?.as_secs() as i64;

        {
            let mut status = status.write().await;
            status.last_collection_time = Some(now);
            status.next_collection_time = Some(now + config.collection_interval_seconds as i64);
        }

        // Get all devices to collect data from
        let devices = if config.devices_to_collect.is_empty() {
            Self::get_all_devices(db).await?
        } else {
            config.devices_to_collect.clone()
        };

        let mut total_collected = 0u64;

        // Collect data from each device
        for device_id in devices {
            // Try direct C++ calls first (preferred)
            if config.enable_cpp_direct_calls {
                if let Ok(points) = Self::collect_via_cpp_calls(device_id, &config.point_types).await {
                    total_collected += Self::store_data_points(db, points, DataSource::CppDirect).await?;
                    continue;
                }
            }

            // Fallback to WebSocket collection
            if config.enable_websocket_collection {
                if let Ok(points) = Self::collect_via_websocket(device_id, &config.point_types).await {
                    total_collected += Self::store_data_points(db, points, DataSource::Background).await?;
                }
            }
        }

        // Update status
        {
            let mut status = status.write().await;
            status.total_points_collected += total_collected;
            status.active_devices = Self::get_all_devices(db).await.unwrap_or_default();
        }

        Ok(())
    }

    async fn get_all_devices(db: &DatabaseConnection) -> Result<Vec<i32>, AppError> {
        let devices = devices::Entity::find()
            .select_only()
            .column(devices::Column::Id)
            .into_tuple::<i32>()
            .all(db)
            .await?;

        Ok(devices)
    }

    // Direct C++ function calls (preferred method)
    async fn collect_via_cpp_calls(device_id: i32, point_types: &[PointType]) -> Result<Vec<DataPoint>, AppError> {
        let mut all_points = Vec::new();

        // Check if device is online first
        if !T3000FFI::is_device_online(device_id) {
            return Ok(vec![]); // Device offline, return empty
        }

        // Collect each requested point type
        for point_type in point_types {
            let points = match point_type {
                PointType::Input => T3000FFI::get_input_points(device_id)?,
                PointType::Output => T3000FFI::get_output_points(device_id)?,
                PointType::Variable => T3000FFI::get_variable_points(device_id)?,
                _ => {
                    // For other point types (Program, Schedule, Alarm), we'll skip for now
                    // These would need additional FFI functions to be implemented
                    continue;
                }
            };

            all_points.extend(points);
        }

        Ok(all_points)
    }

        // WebSocket communication fallback
    async fn collect_via_websocket(device_id: i32, point_types: &[PointType]) -> Result<Vec<DataPoint>, AppError> {
        use tokio_tungstenite::{connect_async, tungstenite::protocol::Message};
        use serde_json::json;
        use futures_util::{SinkExt, StreamExt};

        let mut all_points = Vec::new();

        // Connect to T3000 WebSocket (adjust URL as needed)
        let ws_url = format!("ws://localhost:9104/ws");
        let (ws_stream, _) = connect_async(&ws_url).await
            .map_err(|e| AppError::InternalError(format!("WebSocket connection failed: {}", e)))?;

        let (mut ws_sender, mut ws_receiver) = ws_stream.split();

        // For each point type, send GET_ENTRIES request
        for point_type in point_types {
            let point_type_str = match point_type {
                PointType::Input => "input",
                PointType::Output => "output",
                PointType::Variable => "variable",
                PointType::Program => "program",
                PointType::Schedule => "schedule",
                PointType::Alarm => "alarm",
            };

            // Send GET_ENTRIES command
            let command = json!({
                "command": "GET_ENTRIES",
                "device_id": device_id,
                "point_type": point_type_str,
                "count": 250  // Request up to 250 points
            });

            let message = Message::Text(command.to_string());
            ws_sender.send(message).await
                .map_err(|e| AppError::InternalError(format!("Failed to send WebSocket message: {}", e)))?;

            // Wait for response
            if let Some(msg) = ws_receiver.next().await {
                match msg {
                    Ok(Message::Text(text)) => {
                        if let Ok(response) = serde_json::from_str::<serde_json::Value>(&text) {
                                if let Some(entries) = response.get("entries").and_then(|e| e.as_array()) {
                                    for entry in entries {
                                        if let Some(data_point) = Self::parse_websocket_entry(entry, point_type.clone(), device_id) {
                                            all_points.push(data_point);
                                        }
                                    }
                                }
                        }
                    },
                    Ok(Message::Close(_)) => break,
                    Err(e) => return Err(AppError::InternalError(format!("WebSocket error: {}", e))),
                    _ => continue,
                }
            }
        }

        Ok(all_points)
    }

    // Helper to parse WebSocket entry into DataPoint
    fn parse_websocket_entry(entry: &serde_json::Value, point_type: PointType, device_id: i32) -> Option<DataPoint> {
        Some(DataPoint {
            device_id,
            point_type,
            point_number: entry.get("index")?.as_i64()? as i32,
            value: entry.get("value")?.as_f64()? as f32,
            status: entry.get("status")?.as_str().unwrap_or("OK").to_string(),
            units: entry.get("units")?.as_str().map(|s| s.to_string()),
            timestamp: chrono::Utc::now().timestamp(),
            source: DataSource::RealTime,
        })
    }

    // BACnet collection (future implementation)
    async fn collect_via_bacnet(device_id: i32, point_types: &[PointType]) -> Result<Vec<DataPoint>, AppError> {
        // TODO: Implement BACnet object discovery and reading
        // This would use BACnet Read Property services to get:
        // - Analog Input objects
        // - Analog Output objects
        // - Binary Input objects
        // - Binary Output objects
        // - Multi-state objects

        Ok(vec![])
    }

    async fn store_data_points(
        db: &DatabaseConnection,
        points: Vec<DataPoint>,
        source: DataSource,
    ) -> Result<u64, AppError> {
        if points.is_empty() {
            return Ok(0);
        }

        let now = SystemTime::now().duration_since(UNIX_EPOCH)?.as_secs() as i64;
        let mut stored_count = 0u64;

        // Store in trendlog_data table for historical tracking
        for point in points {
            let trendlog_entry = trendlogs::ActiveModel {
                id: NotSet,
                device_id: Set(point.device_id),
                trendlog_number: Set(point.point_number),
                label: Set(Some(format!("{:?}_{}_{}", point.point_type, point.device_id, point.point_number))),
                description: Set(Some(format!("Auto-created trendlog for {:?} point {}", point.point_type, point.point_number))),
                interval_seconds: Set(Some(300)), // 5 minutes default
                status: Set(Some(1)), // Active
                created_at: Set(Some(now)),
                updated_at: Set(Some(now)),
                ..Default::default()
            };

            if let Ok(_) = trendlog_entry.insert(db).await {
                stored_count += 1;
            }
        }

        Ok(stored_count)
    }

    // Simplified update methods - just log for now since we need to understand the exact schema
    async fn update_input_point(db: &DatabaseConnection, point: &DataPoint) -> Result<(), AppError> {
        // TODO: Implement after confirming exact schema
        // For now, just log the update
        println!("Would update input point: device={}, point={}, value={}",
                 point.device_id, point.point_number, point.value);
        Ok(())
    }

    async fn update_output_point(db: &DatabaseConnection, point: &DataPoint) -> Result<(), AppError> {
        // TODO: Implement after confirming exact schema
        println!("Would update output point: device={}, point={}, value={}",
                 point.device_id, point.point_number, point.value);
        Ok(())
    }

    async fn update_variable_point(db: &DatabaseConnection, point: &DataPoint) -> Result<(), AppError> {
        // TODO: Implement after confirming exact schema
        println!("Would update variable point: device={}, point={}, value={}",
                 point.device_id, point.point_number, point.value);
        Ok(())
    }

    // Public API methods for external control
    pub async fn get_status(&self) -> CollectionStatus {
        self.status.read().await.clone()
    }

    pub async fn update_config(&self, new_config: DataCollectionConfig) -> Result<(), AppError> {
        let mut config = self.config.write().await;
        *config = new_config;
        Ok(())
    }

    pub async fn stop(&self) -> Result<(), AppError> {
        let mut status = self.status.write().await;
        status.is_running = false;
        Ok(())
    }

    pub async fn get_config(&self) -> DataCollectionConfig {
        self.config.read().await.clone()
    }

    pub async fn collect_immediately(&self) -> Result<u64, AppError> {
        // Trigger immediate data collection
        let config = self.config.read().await;
        let devices = if config.devices_to_collect.is_empty() {
            Self::get_all_devices(&self.db_connection).await.unwrap_or_else(|_| vec![1])
        } else {
            config.devices_to_collect.clone()
        };

        let mut total_points = 0u64;

        for device_id in devices {
            // Try each collection method
            if config.enable_cpp_direct_calls {
                if let Ok(points) = Self::collect_via_cpp_calls(device_id, &config.point_types).await {
                    total_points += points.len() as u64;
                    // Store points to database
                    for point in points {
                        self.store_data_point(&point).await?;
                    }
                    continue;
                }
            }

            if config.enable_websocket_collection {
                if let Ok(points) = Self::collect_via_websocket(device_id, &config.point_types).await {
                    total_points += points.len() as u64;
                    // Store points to database
                    for point in points {
                        self.store_data_point(&point).await?;
                    }
                }
            }
        }

        // Update status
        {
            let mut status = self.status.write().await;
            status.total_points_collected += total_points;
            status.last_collection_time = Some(
                std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_secs() as i64
            );
        }

        Ok(total_points)
    }

    async fn store_data_point(&self, point: &DataPoint) -> Result<(), AppError> {
        // For now, just log the data point - later we could store to a dedicated data table
        println!("Storing data point: Device {}, Point {}, Type {:?}, Value {}",
                point.device_id, point.point_number, point.point_type, point.value);

        // TODO: Store to proper data storage table (separate from trendlogs config table)
        // The trendlogs table is for configuration, not actual data points
        // We would need a separate table like "trend_data" or "data_points"

        Ok(())
    }

    pub async fn collect_now(&self) -> Result<(), AppError> {
        let config = self.config.read().await;
        Self::collect_all_data(&config, &self.status, &self.db_connection, &self.data_sender).await
    }
}

// Real-time data interception for WebSocket/WebView2 messages
pub struct RealTimeDataInterceptor {
    data_sender: broadcast::Sender<DataPoint>,
    db_connection: Arc<DatabaseConnection>,
}

impl RealTimeDataInterceptor {
    pub fn new(data_sender: broadcast::Sender<DataPoint>, db_connection: Arc<DatabaseConnection>) -> Self {
        Self {
            data_sender,
            db_connection,
        }
    }

    // Call this method when you receive GET_ENTRIES_RES messages
    pub async fn intercept_get_entries_response(&self, message_data: &serde_json::Value) -> Result<(), AppError> {
        // Parse the GET_ENTRIES_RES message and extract data points
        if let Some(data_array) = message_data.get("data").and_then(|d| d.as_array()) {
            let mut data_points = Vec::new();
            let now = SystemTime::now().duration_since(UNIX_EPOCH)?.as_secs() as i64;

            for entry in data_array {
                if let Some(data_point) = Self::parse_entry_to_data_point(entry, now) {
                    data_points.push(data_point);
                }
            }

            // Store real-time data
            if !data_points.is_empty() {
                DataCollectionService::store_data_points(&self.db_connection, data_points.clone(), DataSource::RealTime).await?;

                // Broadcast to subscribers
                for point in data_points {
                    let _ = self.data_sender.send(point);
                }
            }
        }

        Ok(())
    }

    fn parse_entry_to_data_point(entry: &serde_json::Value, timestamp: i64) -> Option<DataPoint> {
        // Parse individual entry from GET_ENTRIES_RES to DataPoint
        // This depends on the actual structure of your T3000 messages

        let device_id = entry.get("pid").and_then(|v| v.as_i64()).unwrap_or(0) as i32;
        let point_number = entry.get("index").and_then(|v| v.as_i64()).unwrap_or(0) as i32;
        let value = entry.get("value").and_then(|v| v.as_f64()).unwrap_or(0.0) as f32;
        let entry_type = entry.get("type").and_then(|v| v.as_str()).unwrap_or("");

        let point_type = match entry_type {
            "INPUT" => PointType::Input,
            "OUTPUT" => PointType::Output,
            "VARIABLE" => PointType::Variable,
            _ => return None,
        };

        Some(DataPoint {
            device_id,
            point_type,
            point_number,
            value,
            status: "OK".to_string(),
            units: entry.get("units").and_then(|v| v.as_str()).map(|s| s.to_string()),
            timestamp,
            source: DataSource::RealTime,
        })
    }
}
