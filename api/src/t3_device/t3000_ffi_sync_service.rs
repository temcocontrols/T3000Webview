// T3000 Main Service - Primary T3000 Building Automation Integration
// This is the main service that handles all T3000 functionality:
// - FFI calls to T3000 C++ functions (T3000_GetLoggingData)
// - Real-time data synchronization
// - Device discovery and management
// - WebSocket broadcasting for live updates
// - Database synchronization to webview_t3_device.db

use std::ffi::CStr;
use std::os::raw::c_char;
use std::sync::{Arc, atomic::{AtomicBool, Ordering}};
use std::time::Duration;
use tokio::time::sleep;
use sea_orm::*;
use serde::{Serialize, Deserialize};
use serde_json::Value as JsonValue;
use tracing::{info, warn, error, debug};
use crate::entity::t3_device::{
    devices, input_points, output_points, variable_points,
    trendlog_data
};
use crate::db_connection::establish_t3_device_connection;
use crate::error::AppError;
use crate::logger::write_structured_log;
use once_cell::sync::OnceCell;

// FFI function declarations to T3000 C++ Building Automation System
extern "C" {
    fn T3000_GetLoggingData() -> *mut c_char;
    fn T3000_FreeLoggingDataString(ptr: *mut c_char);
}

/// Global main service instance
static MAIN_SERVICE: OnceCell<Arc<T3000MainService>> = OnceCell::new();

/// Configuration for the main T3000 service
#[derive(Debug, Clone)]
pub struct T3000MainConfig {
    pub sync_interval_secs: u64,      // Default: 300 (5 minutes)
    pub timeout_seconds: u64,         // FFI call timeout: 30 seconds
    pub retry_attempts: u32,          // Retry failed FFI calls: 3 times
    pub auto_start: bool,             // Start sync service on creation: true
}

impl Default for T3000MainConfig {
    fn default() -> Self {
        Self {
            sync_interval_secs: 60,   // 1 minute for faster debugging
            timeout_seconds: 30,      // 30 seconds FFI timeout
            retry_attempts: 3,
            auto_start: true,
        }
    }
}

/// Device information structure from T3000 LOGGING_DATA JSON
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceInfo {
    pub panel_id: i32,
    pub panel_name: String,
    pub panel_serial_number: i32,
    pub panel_ipaddress: String,
    pub input_logging_time: String,
    pub output_logging_time: String,
    pub variable_logging_time: String,
}

/// Point data structure from T3000 LOGGING_DATA JSON
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PointData {
    pub index: u32,
    pub panel: i32,
    pub full_label: String,
    pub auto_manual: i32,
    pub value: f64,
    pub pid: i32,
    pub units: String,
    pub range: i32,
    pub calibration: f64,
    pub sign: i32,
    pub status: i32,
    pub timestamp: String,        // ISO 8601 timestamp from T3000

    // INPUT specific fields
    pub decom: Option<String>,
    pub sub_product: Option<i32>,
    pub sub_id: Option<i32>,
    pub sub_panel: Option<i32>,
    pub network_number: Option<i32>,

    // OUTPUT specific fields
    pub low_voltage: Option<f64>,
    pub high_voltage: Option<f64>,
    pub hw_switch_status: Option<i32>,

    // VARIABLE specific fields
    pub unused: Option<i32>,
}

/// Complete logging data structure with device info and points
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoggingDataResponse {
    pub action: String,
    pub devices: Vec<DeviceWithPoints>,
    pub timestamp: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceWithPoints {
    pub device_info: DeviceInfo,
    pub input_points: Vec<PointData>,
    pub output_points: Vec<PointData>,
    pub variable_points: Vec<PointData>,
}

pub struct T3000MainService {
    db: DatabaseConnection,
    config: T3000MainConfig,
    is_running: Arc<AtomicBool>,
    websocket_sender: Option<tokio::sync::broadcast::Sender<String>>,
}

impl T3000MainService {
    pub async fn new(config: T3000MainConfig) -> Result<Self, AppError> {
        let db = establish_t3_device_connection().await?;

        Ok(Self {
            db,
            config,
            is_running: Arc::new(AtomicBool::new(false)),
            websocket_sender: None,
        })
    }

    pub fn set_websocket_sender(&mut self, sender: tokio::sync::broadcast::Sender<String>) {
        self.websocket_sender = Some(sender);
    }

    /// Start the periodic logging data sync service
    pub async fn start_sync_service(&self) -> Result<(), AppError> {
        if self.is_running.compare_exchange(false, true, Ordering::SeqCst, Ordering::Relaxed).is_err() {
            return Err(AppError::ServiceError("Logging data service is already running".to_string()));
        }

        info!("🚀 Starting T3000 LOGGING_DATA sync service with {}-second intervals", self.config.sync_interval_secs);
        info!("⚡ Running immediate sync on startup, then continuing with periodic sync...");

        let config = self.config.clone();
        let is_running = self.is_running.clone();

        tokio::spawn(async move {
            // Run immediate sync on startup
            info!("🏃 Performing immediate startup sync...");
            if let Err(e) = Self::sync_logging_data_static(config.clone()).await {
                error!("❌ Immediate startup sync failed: {}", e);
                // Log error to structured log file
                let timestamp = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S UTC");
                let _ = write_structured_log("t3000_ffi_sync_service_errors",
                    &format!("[{}] ❌ Immediate startup sync failed: {}", timestamp, e));
            } else {
                info!("✅ Immediate startup sync completed successfully");
            }

            // Continue with periodic sync loop
            while is_running.load(Ordering::Relaxed) {
                // Sleep until next sync interval
                info!("⏰ Waiting {} seconds until next sync cycle", config.sync_interval_secs);
                sleep(Duration::from_secs(config.sync_interval_secs)).await;

                // Perform periodic logging data sync
                if is_running.load(Ordering::Relaxed) {
                    if let Err(e) = Self::sync_logging_data_static(config.clone()).await {
                        error!("❌ Periodic sync failed: {}", e);
                        // Log periodic sync error to structured log file
                        let timestamp = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S UTC");
                        let _ = write_structured_log("t3000_ffi_sync_service_errors",
                            &format!("[{}] ❌ Periodic sync failed: {}", timestamp, e));
                    }
                }
            }

            info!("🛑 T3000 LOGGING_DATA sync service stopped");
        });

        Ok(())
    }

    /// Stop the periodic sync service
    pub fn stop_sync_service(&self) {
        self.is_running.store(false, Ordering::Relaxed);
        info!("Stopping T3000 LOGGING_DATA sync service");
    }

    /// Check if the service is currently running
    pub fn is_running(&self) -> bool {
        self.is_running.load(Ordering::Relaxed)
    }

    /// Perform one-time logging data sync (can be called independently)
    pub async fn sync_once(&self) -> Result<(), AppError> {
        Self::sync_logging_data_static(self.config.clone()).await
    }

    /// Static method to sync logging data (for use in spawned tasks)
    async fn sync_logging_data_static(config: T3000MainConfig) -> Result<(), AppError> {
        info!("🚀 Starting T3000 LOGGING_DATA sync cycle");
        info!("⚙️  Sync Config - Interval: {}s, Timeout: {}s", config.sync_interval_secs, config.timeout_seconds);

        // Log sync start to structured log file
        let timestamp = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S UTC");
        let _ = write_structured_log("t3000_ffi_sync_service_sync",
            &format!("[{}] 🚀 T3000 LOGGING_DATA sync cycle started", timestamp));

        let db = establish_t3_device_connection().await
            .map_err(|e| {
                error!("❌ Database connection failed: {}", e);
                e
            })?;

        info!("✅ Database connection established");

        // Get JSON data from T3000 C++ via FFI - this contains ALL devices and their data
        let json_data = Self::get_logging_data_via_ffi_static(&config).await?;

        // Parse the complete LOGGING_DATA response
        let logging_response = Self::parse_logging_response(&json_data)?;

        // Start database transaction
        info!("🔄 Starting database transaction for atomic sync operations");
        let txn = db.begin().await
            .map_err(|e| {
                error!("❌ Failed to start transaction: {}", e);
                AppError::DatabaseError(format!("Transaction start failed: {}", e))
            })?;
        info!("✅ Database transaction started successfully");

        info!("📦 Processing {} devices from T3000 LOGGING_DATA response", logging_response.devices.len());

        // Process each device from the response
        for (device_index, device_with_points) in logging_response.devices.iter().enumerate() {
            let serial_number = device_with_points.device_info.panel_serial_number;

            info!("🏭 Processing Device {} of {}: Serial={}, Name='{}'",
                  device_index + 1, logging_response.devices.len(),
                  serial_number, device_with_points.device_info.panel_name);

            // UPSERT device basic info (INSERT or UPDATE)
            info!("📝 Syncing device basic info...");
            if let Err(e) = Self::sync_device_basic_info(&txn, &device_with_points.device_info).await {
                error!("❌ Failed to sync device info for {}: {}", serial_number, e);
                continue;
            }
            info!("✅ Device basic info synced");

            // UPSERT input points (INSERT or UPDATE)
            if !device_with_points.input_points.is_empty() {
                info!("🔧 Syncing {} INPUT points...", device_with_points.input_points.len());
                for point in &device_with_points.input_points {
                    if let Err(e) = Self::sync_input_point_static(&txn, serial_number, point).await {
                        error!("❌ Failed to sync input point {}:{}: {}", serial_number, point.index, e);
                    }
                }
                info!("✅ INPUT points synced");
            }

            // UPSERT output points (INSERT or UPDATE)
            if !device_with_points.output_points.is_empty() {
                info!("🔧 Syncing {} OUTPUT points...", device_with_points.output_points.len());
                for point in &device_with_points.output_points {
                    if let Err(e) = Self::sync_output_point_static(&txn, serial_number, point).await {
                        error!("❌ Failed to sync output point {}:{}: {}", serial_number, point.index, e);
                    }
                }
                info!("✅ OUTPUT points synced");
            }

            // UPSERT variable points (INSERT or UPDATE)
            if !device_with_points.variable_points.is_empty() {
                info!("🔧 Syncing {} VARIABLE points...", device_with_points.variable_points.len());
                for point in &device_with_points.variable_points {
                    if let Err(e) = Self::sync_variable_point_static(&txn, serial_number, point).await {
                        error!("❌ Failed to sync variable point {}:{}: {}", serial_number, point.index, e);
                    }
                }
                info!("✅ VARIABLE points synced");
            }

            // INSERT trend log data (ALWAYS INSERT for historical data)
            let total_trend_points = device_with_points.input_points.len() +
                                   device_with_points.output_points.len() +
                                   device_with_points.variable_points.len();
            if total_trend_points > 0 {
                info!("📊 Inserting {} trend log entries...", total_trend_points);
                if let Err(e) = Self::insert_trend_logs(&txn, serial_number, device_with_points).await {
                    error!("❌ Failed to insert trend logs for {}: {}", serial_number, e);
                } else {
                    info!("✅ Trend log entries inserted");
                }
            }

            info!("🎯 Device {} sync completed: {} inputs, {} outputs, {} variables",
                  serial_number,
                  device_with_points.input_points.len(),
                  device_with_points.output_points.len(),
                  device_with_points.variable_points.len());
        }

        // Commit transaction after all devices processed
        info!("💾 Committing database transaction...");
        txn.commit().await
            .map_err(|e| {
                error!("❌ Failed to commit transaction: {}", e);
                AppError::DatabaseError(format!("Transaction commit failed: {}", e))
            })?;

        info!("🎉 T3000 LOGGING_DATA sync completed successfully - {} devices processed",
              logging_response.devices.len());
        Ok(())
    }

    /// UPSERT device basic info (INSERT or UPDATE based on existence)
    async fn sync_device_basic_info(txn: &DatabaseTransaction, device_info: &DeviceInfo) -> Result<(), AppError> {
        let serial_number = device_info.panel_serial_number;

        info!("🔍 Checking if device {} exists in database...", serial_number);

        // Check if device exists
        let existing = devices::Entity::find()
            .filter(devices::Column::SerialNumber.eq(serial_number))
            .one(txn).await?;

        let device_model = devices::ActiveModel {
            SerialNumber: Set(serial_number),
            PanelId: Set(Some(device_info.panel_id)),
            Building_Name: Set(Some(device_info.panel_name.clone())),
            Product_Name: Set(Some("T3000 Panel".to_string())),
            Address: Set(Some(device_info.panel_ipaddress.clone())),
            Status: Set(Some("Online".to_string())),
            Description: Set(Some(format!("Panel {} - {}", device_info.panel_id, device_info.panel_name))),
            ..Default::default()
        };

        if existing.is_some() {
            info!("🔄 Device {} exists - performing UPDATE with latest info", serial_number);
            // UPDATE existing device
            devices::Entity::update(device_model)
                .filter(devices::Column::SerialNumber.eq(serial_number))
                .exec(txn).await?;
            info!("✅ Device {} info UPDATED successfully", serial_number);
        } else {
            info!("➕ Device {} not found - performing INSERT as new device", serial_number);
            // INSERT new device
            devices::Entity::insert(device_model)
                .exec(txn).await?;
            info!("✅ Device {} info INSERTED successfully", serial_number);
        }

        Ok(())
    }

    /// INSERT trend log entries (ALWAYS INSERT for historical data)
    async fn insert_trend_logs(txn: &DatabaseTransaction, serial_number: i32, device_data: &DeviceWithPoints) -> Result<(), AppError> {
        let timestamp = chrono::Utc::now().to_rfc3339();
        info!("📊 Starting trend log insertion at timestamp: {}", timestamp);

        // Insert trend logs for all input points
        if !device_data.input_points.is_empty() {
            info!("📈 Inserting {} INPUT point trend logs...", device_data.input_points.len());
        }
        for point in &device_data.input_points {
            let trend_model = trendlog_data::ActiveModel {
                Trendlog_Input_ID: Set(point.index as i32),
                TimeStamp: Set(timestamp.clone()),
                fValue: Set(Some(point.value.to_string())),
                Status: Set(Some(point.status.to_string())),
                Quality: Set(Some("Good".to_string())),
                BinaryArray: Set(None),
            };

            trendlog_data::Entity::insert(trend_model).exec(txn).await?;
        }

        // Insert trend logs for all output points
        if !device_data.output_points.is_empty() {
            info!("📈 Inserting {} OUTPUT point trend logs...", device_data.output_points.len());
        }
        for point in &device_data.output_points {
            let trend_model = trendlog_data::ActiveModel {
                Trendlog_Input_ID: Set(point.index as i32),
                TimeStamp: Set(timestamp.clone()),
                fValue: Set(Some(point.value.to_string())),
                Status: Set(Some(point.status.to_string())),
                Quality: Set(Some("Good".to_string())),
                BinaryArray: Set(None),
            };

            trendlog_data::Entity::insert(trend_model).exec(txn).await?;
        }

        // Insert trend logs for all variable points
        if !device_data.variable_points.is_empty() {
            info!("📈 Inserting {} VARIABLE point trend logs...", device_data.variable_points.len());
        }
        for point in &device_data.variable_points {
            let trend_model = trendlog_data::ActiveModel {
                Trendlog_Input_ID: Set(point.index as i32),
                TimeStamp: Set(timestamp.clone()),
                fValue: Set(Some(point.value.to_string())),
                Status: Set(Some(point.status.to_string())),
                Quality: Set(Some("Good".to_string())),
                BinaryArray: Set(None),
            };

            trendlog_data::Entity::insert(trend_model).exec(txn).await?;
        }

        let total_inserted = device_data.input_points.len() + device_data.output_points.len() + device_data.variable_points.len();
        info!("✅ Inserted {} total trend log entries for device {} at {}",
              total_inserted, serial_number, timestamp);
        Ok(())
    }

    /// Call T3000 C++ LOGGING_DATA function via FFI
    async fn get_logging_data_via_ffi_static(config: &T3000MainConfig) -> Result<String, AppError> {
        info!("🔄 Starting FFI call to T3000_GetLoggingData");
        info!("📋 FFI Config - Timeout: {}s, Retry: {}", config.timeout_seconds, config.retry_attempts);

        // Run FFI call in a blocking task with timeout
        let spawn_result = tokio::time::timeout(
            Duration::from_secs(config.timeout_seconds),
            tokio::task::spawn_blocking(move || {
                info!("🔌 Calling T3000_GetLoggingData() via FFI...");

                unsafe {
                    let data_ptr = T3000_GetLoggingData();

                    if data_ptr.is_null() {
                        error!("❌ T3000_GetLoggingData returned null pointer");
                        return Err(AppError::FfiError("T3000_GetLoggingData returned null pointer".to_string()));
                    }

                    info!("✅ T3000_GetLoggingData returned valid pointer");

                    // Convert C string to Rust string
                    let c_str = CStr::from_ptr(data_ptr);
                    let result = c_str.to_string_lossy().to_string();

                    info!("📊 Raw C++ Response Size: {} bytes", result.len());
                    info!("📝 Raw C++ Response Preview: {}",
                         if result.len() > 200 {
                             format!("{}...", &result[..200])
                         } else {
                             result.clone()
                         });

                    // Log the complete response for debugging
                    debug!("🔍 COMPLETE C++ RESPONSE:");
                    debug!("{}", result);

                    // Free the C++ allocated string
                    T3000_FreeLoggingDataString(data_ptr);
                    info!("🧹 C++ memory freed successfully");

                    Ok(result)
                }
            })
        ).await;

        match spawn_result {
            Ok(join_result) => {
                match join_result {
                    Ok(ffi_result) => {
                        match ffi_result {
                            Ok(data) => {
                                info!("✅ FFI call completed successfully - {} bytes received", data.len());
                                Ok(data)
                            }
                            Err(e) => {
                                error!("❌ FFI call failed: {}", e);
                                Err(e)
                            }
                        }
                    }
                    Err(join_err) => {
                        let error_msg = format!("❌ FFI task join failed: {}", join_err);
                        error!("{}", error_msg);
                        Err(AppError::ServiceError(error_msg))
                    }
                }
            }
            Err(timeout_err) => {
                let error_msg = format!("⏰ FFI call timed out: {}", timeout_err);
                error!("{}", error_msg);
                Err(AppError::ServiceError(error_msg))
            }
        }
    }

    /// Parse the complete LOGGING_DATA response from T3000 C++
    fn parse_logging_response(json_data: &str) -> Result<LoggingDataResponse, AppError> {
        info!("🔍 Starting JSON parsing - {} bytes", json_data.len());

        let json_value: JsonValue = serde_json::from_str(json_data)
            .map_err(|e| {
                error!("❌ JSON parse error: {}", e);
                AppError::ParseError(format!("Failed to parse LOGGING_DATA JSON: {}", e))
            })?;

        info!("✅ JSON parsed successfully");

        // The C++ response structure based on BacnetWebView.cpp analysis:
        // {
        //   "action": "LOGGING_DATA_RES",
        //   "panel_id": npanel_id,
        //   "panel_name": "Device Name",
        //   "panel_serial_number": serial,
        //   "panel_ipaddress": "IP",
        //   "input_logging_time": "timestamp",
        //   "output_logging_time": "timestamp",
        //   "variable_logging_time": "timestamp",
        //   "data": [ array of all points ]
        // }

        let action = json_value.get("action")
            .and_then(|v| v.as_str())
            .unwrap_or("UNKNOWN")
            .to_string();

        info!("📋 Action: {}", action);

        // Extract device information
        let device_info = DeviceInfo {
            panel_id: json_value.get("panel_id").and_then(|v| v.as_i64()).unwrap_or(0) as i32,
            panel_name: json_value.get("panel_name").and_then(|v| v.as_str()).unwrap_or("Unknown").to_string(),
            panel_serial_number: json_value.get("panel_serial_number").and_then(|v| v.as_i64()).unwrap_or(0) as i32,
            panel_ipaddress: json_value.get("panel_ipaddress").and_then(|v| v.as_str()).unwrap_or("0.0.0.0").to_string(),
            input_logging_time: json_value.get("input_logging_time").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            output_logging_time: json_value.get("output_logging_time").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            variable_logging_time: json_value.get("variable_logging_time").and_then(|v| v.as_str()).unwrap_or("").to_string(),
        };

        info!("🏠 Device Info - Panel ID: {}, Serial: {}, Name: '{}', IP: {}",
              device_info.panel_id, device_info.panel_serial_number,
              device_info.panel_name, device_info.panel_ipaddress);
        info!("⏰ Logging Times - Input: '{}', Output: '{}', Variable: '{}'",
              device_info.input_logging_time, device_info.output_logging_time, device_info.variable_logging_time);

        // Parse point data from the "data" array
        let mut input_points = Vec::new();
        let mut output_points = Vec::new();
        let mut variable_points = Vec::new();

        if let Some(data_array) = json_value.get("data").and_then(|v| v.as_array()) {
            info!("📊 Found data array with {} points", data_array.len());

            for (point_index, point_json) in data_array.iter().enumerate() {
                if let Some(point_type) = point_json.get("type").and_then(|v| v.as_str()) {
                    let point_index_value = point_json.get("index").and_then(|v| v.as_u64()).unwrap_or(0);
                    debug!("🔸 Processing point {}: type={}, index={}", point_index, point_type, point_index_value);

                    match Self::parse_point_data(point_json) {
                        Ok(point_data) => {
                            match point_type {
                                "INPUT" => {
                                    input_points.push(point_data);
                                    debug!("✅ Added INPUT point {}", point_index_value);
                                }
                                "OUTPUT" => {
                                    output_points.push(point_data);
                                    debug!("✅ Added OUTPUT point {}", point_index_value);
                                }
                                "VARIABLE" => {
                                    variable_points.push(point_data);
                                    debug!("✅ Added VARIABLE point {}", point_index_value);
                                }
                                _ => warn!("⚠️  Unknown point type: {}", point_type),
                            }
                        }
                        Err(e) => {
                            warn!("⚠️  Failed to parse point {}: {}", point_index, e);
                        }
                    }
                } else {
                    warn!("⚠️  Point {} missing 'type' field", point_index);
                }
            }
        } else {
            warn!("⚠️  No 'data' array found in response");
        }

        info!("📈 Parsed Points Summary - INPUT: {}, OUTPUT: {}, VARIABLE: {}",
              input_points.len(), output_points.len(), variable_points.len());

        let device_with_points = DeviceWithPoints {
            device_info,
            input_points,
            output_points,
            variable_points,
        };

        info!("✅ Logging response parsing completed successfully");

        Ok(LoggingDataResponse {
            action,
            devices: vec![device_with_points], // Single device per response
            timestamp: chrono::Utc::now().to_rfc3339(),
        })
    }

    /// Parse individual point data from C++ JSON structure
    fn parse_point_data(point_json: &JsonValue) -> Result<PointData, AppError> {
        let point_data = PointData {
            index: point_json.get("index").and_then(|v| v.as_u64()).unwrap_or(0) as u32,
            panel: point_json.get("pid").and_then(|v| v.as_i64()).unwrap_or(0) as i32,
            full_label: point_json.get("label").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            auto_manual: point_json.get("auto_manual").and_then(|v| v.as_i64()).unwrap_or(0) as i32,
            value: point_json.get("value").and_then(|v| v.as_f64()).unwrap_or(0.0),
            pid: point_json.get("pid").and_then(|v| v.as_i64()).unwrap_or(0) as i32,
            units: point_json.get("unit").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            range: point_json.get("range").and_then(|v| v.as_i64()).unwrap_or(0) as i32,
            calibration: point_json.get("calibration_h").and_then(|v| v.as_f64()).unwrap_or(0.0),
            sign: point_json.get("calibration_sign").and_then(|v| v.as_i64()).unwrap_or(0) as i32,
            status: point_json.get("decom").and_then(|v| v.as_i64()).unwrap_or(0) as i32,
            timestamp: chrono::Utc::now().to_rfc3339(),

            // INPUT specific fields
            decom: point_json.get("decom").and_then(|v| v.as_str()).map(|s| s.to_string()),
            sub_product: None,
            sub_id: None,
            sub_panel: None,
            network_number: None,

            // OUTPUT specific fields
            low_voltage: point_json.get("low_voltage").and_then(|v| v.as_f64()),
            high_voltage: point_json.get("high_voltage").and_then(|v| v.as_f64()),
            hw_switch_status: point_json.get("hw_switch_status").and_then(|v| v.as_i64()).map(|v| v as i32),

            // VARIABLE specific fields
            unused: point_json.get("unused").and_then(|v| v.as_i64()).map(|v| v as i32),
        };

        Ok(point_data)
    }

    /// Sync input point data (UPSERT: INSERT or UPDATE)
    async fn sync_input_point_static(
        txn: &DatabaseTransaction,
        serial_number: i32,
        point: &PointData,
    ) -> Result<(), AppError> {
        // Check if input point exists
        let existing = input_points::Entity::find()
            .filter(input_points::Column::SerialNumber.eq(serial_number))
            .filter(input_points::Column::InputIndex.eq(Some(point.index.to_string())))
            .one(txn).await
            .map_err(|e| AppError::DatabaseError(format!("Failed to query input point: {}", e)))?;

        let input_model = input_points::ActiveModel {
            SerialNumber: Set(serial_number),
            Input_index: Set(Some(point.index.to_string())),
            Panel: Set(Some(point.panel.to_string())),
            Full_Label: Set(Some(point.full_label.clone())),
            Auto_Manual: Set(Some(point.auto_manual.to_string())),
            fValue: Set(Some(point.value.to_string())),
            Units: Set(Some(point.units.clone())),
            Range_Field: Set(Some(point.range.to_string())),
            Calibration: Set(Some(point.calibration.to_string())),
            Sign: Set(Some(point.sign.to_string())),
            Status: Set(Some(point.status.to_string())),
            Filter_Field: Set(None),
            Signal_Type: Set(None),
            Label: Set(Some(point.full_label.clone())),
            Type_Field: Set(None),
            BinaryArray: Set(None),
        };

        match existing {
            Some(_) => {
                // UPDATE existing input point
                debug!("🔄 Updating existing INPUT point {}:{} - Label: '{}'", serial_number, point.index, point.full_label);
                input_points::Entity::update(input_model)
                    .filter(input_points::Column::SerialNumber.eq(serial_number))
                    .filter(input_points::Column::InputIndex.eq(Some(point.index.to_string())))
                    .exec(txn).await
                    .map_err(|e| AppError::DatabaseError(format!("Failed to update input point: {}", e)))?;
                debug!("✅ INPUT point {}:{} UPDATED", serial_number, point.index);
                Ok(())
            }
            None => {
                // INSERT new input point
                debug!("➕ Inserting new INPUT point {}:{} - Label: '{}'", serial_number, point.index, point.full_label);
                input_points::Entity::insert(input_model)
                    .exec(txn).await
                    .map_err(|e| AppError::DatabaseError(format!("Failed to insert input point: {}", e)))?;
                debug!("✅ INPUT point {}:{} INSERTED", serial_number, point.index);
                Ok(())
            }
        }
    }

    /// Sync output point data (UPSERT: INSERT or UPDATE)
    async fn sync_output_point_static(
        txn: &DatabaseTransaction,
        serial_number: i32,
        point: &PointData,
    ) -> Result<(), AppError> {
        // Check if output point exists
        let existing = output_points::Entity::find()
            .filter(output_points::Column::SerialNumber.eq(serial_number))
            .filter(output_points::Column::OutputIndex.eq(Some(point.index.to_string())))
            .one(txn).await
            .map_err(|e| AppError::DatabaseError(format!("Failed to query output point: {}", e)))?;

        let output_model = output_points::ActiveModel {
            SerialNumber: Set(serial_number),
            Output_index: Set(Some(point.index.to_string())),
            Panel: Set(Some(point.panel.to_string())),
            Full_Label: Set(Some(point.full_label.clone())),
            Auto_Manual: Set(Some(point.auto_manual.to_string())),
            fValue: Set(Some(point.value.to_string())),
            Units: Set(Some(point.units.clone())),
            Range_Field: Set(Some(point.range.to_string())),
            Calibration: Set(Some(point.calibration.to_string())),
            Sign: Set(Some(point.sign.to_string())),
            Status: Set(Some(point.status.to_string())),
            Filter_Field: Set(None),
            Signal_Type: Set(None),
            Label: Set(Some(point.full_label.clone())),
            Type_Field: Set(None),
            BinaryArray: Set(None),
        };

        match existing {
            Some(_) => {
                // UPDATE existing output point
                debug!("🔄 Updating existing OUTPUT point {}:{} - Label: '{}'", serial_number, point.index, point.full_label);
                output_points::Entity::update(output_model)
                    .filter(output_points::Column::SerialNumber.eq(serial_number))
                    .filter(output_points::Column::OutputIndex.eq(Some(point.index.to_string())))
                    .exec(txn).await
                    .map_err(|e| AppError::DatabaseError(format!("Failed to update output point: {}", e)))?;
                debug!("✅ OUTPUT point {}:{} UPDATED", serial_number, point.index);
                Ok(())
            }
            None => {
                // INSERT new output point
                debug!("➕ Inserting new OUTPUT point {}:{} - Label: '{}'", serial_number, point.index, point.full_label);
                output_points::Entity::insert(output_model)
                    .exec(txn).await
                    .map_err(|e| AppError::DatabaseError(format!("Failed to insert output point: {}", e)))?;
                debug!("✅ OUTPUT point {}:{} INSERTED", serial_number, point.index);
                Ok(())
            }
        }
    }

    /// Sync variable point data (UPSERT: INSERT or UPDATE)
    async fn sync_variable_point_static(
        txn: &DatabaseTransaction,
        serial_number: i32,
        point: &PointData,
    ) -> Result<(), AppError> {
        // Check if variable point exists
        let existing = variable_points::Entity::find()
            .filter(variable_points::Column::SerialNumber.eq(serial_number))
            .filter(variable_points::Column::VariableIndex.eq(Some(point.index.to_string())))
            .one(txn).await
            .map_err(|e| AppError::DatabaseError(format!("Failed to query variable point: {}", e)))?;

        let variable_model = variable_points::ActiveModel {
            SerialNumber: Set(serial_number),
            Variable_index: Set(Some(point.index.to_string())),
            Panel: Set(Some(point.pid.to_string())),
            Full_Label: Set(Some(point.full_label.clone())),
            Auto_Manual: Set(Some(point.auto_manual.to_string())),
            fValue: Set(Some(point.value.to_string())),
            Units: Set(Some(point.units.clone())),
            BinaryArray: Set(None), // TODO: Handle binary array if provided in JSON
        };

        match existing {
            Some(_) => {
                // UPDATE existing variable point
                debug!("🔄 Updating existing VARIABLE point {}:{} - Label: '{}'", serial_number, point.index, point.full_label);
                variable_points::Entity::update(variable_model)
                    .filter(variable_points::Column::SerialNumber.eq(serial_number))
                    .filter(variable_points::Column::VariableIndex.eq(Some(point.index.to_string())))
                    .exec(txn).await
                    .map_err(|e| AppError::DatabaseError(format!("Failed to update variable point: {}", e)))?;
                debug!("✅ VARIABLE point {}:{} UPDATED", serial_number, point.index);
                Ok(())
            }
            None => {
                // INSERT new variable point
                debug!("➕ Inserting new VARIABLE point {}:{} - Label: '{}'", serial_number, point.index, point.full_label);
                variable_points::Entity::insert(variable_model)
                    .exec(txn).await
                    .map_err(|e| AppError::DatabaseError(format!("Failed to insert variable point: {}", e)))?;
                debug!("✅ VARIABLE point {}:{} INSERTED", serial_number, point.index);
                Ok(())
            }
        }
    }

    /// Insert trend log data (always INSERT, never UPDATE for historical data)
    async fn insert_trend_log_static(
        txn: &DatabaseTransaction,
        _serial_number: i32, // Not used in current trendlog_data structure
        point: &PointData,
    ) -> Result<usize, AppError> {
        let trendlog_model = trendlog_data::ActiveModel {
            Trendlog_Input_ID: Set(point.index as i32), // Use point index as reference
            TimeStamp: Set(point.timestamp.clone()),
            fValue: Set(Some(point.value.to_string())),
            Status: Set(Some(point.status.to_string())),
            Quality: Set(Some("Good".to_string())), // Default quality
            BinaryArray: Set(None),
        };

        trendlog_data::Entity::insert(trendlog_model)
            .exec(txn).await
            .map_err(|e| AppError::DatabaseError(format!("Failed to insert trend log data: {}", e)))?;

        Ok(1)
    }
}

/// Global service management
impl T3000MainService {
    /// Initialize the global T3000 main service
    pub async fn initialize(config: T3000MainConfig) -> Result<(), AppError> {
        let service = Arc::new(Self::new(config).await?);

        MAIN_SERVICE.set(service.clone())
            .map_err(|_| AppError::InitializationError("T3000 main service already initialized".to_string()))?;

        // Auto-start if configured
        if service.config.auto_start {
            service.start_sync_service().await?;
        }

        info!("T3000 Main Service initialized successfully");
        Ok(())
    }

    /// Get the global T3000 main service instance
    pub fn get_service() -> Option<Arc<T3000MainService>> {
        MAIN_SERVICE.get().cloned()
    }
}

/// Public functions for global service access
pub async fn initialize_logging_service(config: T3000MainConfig) -> Result<(), AppError> {
    T3000MainService::initialize(config).await
}

pub fn get_logging_service() -> Option<Arc<T3000MainService>> {
    T3000MainService::get_service()
}

pub async fn sync_logging_data_once() -> Result<(), AppError> {
    if let Some(service) = get_logging_service() {
        service.sync_once().await
    } else {
        Err(AppError::ServiceError("T3000 main service not initialized".to_string()))
    }
}

pub async fn start_logging_sync() -> Result<(), AppError> {
    if let Some(service) = get_logging_service() {
        service.start_sync_service().await
    } else {
        Err(AppError::ServiceError("T3000 main service not initialized".to_string()))
    }
}

pub fn stop_logging_sync() -> Result<(), AppError> {
    if let Some(service) = get_logging_service() {
        service.stop_sync_service();
        Ok(())
    } else {
        Err(AppError::ServiceError("T3000 main service not initialized".to_string()))
    }
}

pub fn is_logging_service_running() -> bool {
    get_logging_service()
        .map(|service| service.is_running())
        .unwrap_or(false)
}
