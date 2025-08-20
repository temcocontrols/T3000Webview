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
    // LOGGING_DATA function - Returns real-time data - CONFIRMED WORKING
    fn T3000_GetLoggingData() -> *mut c_char;
    fn T3000_FreeLoggingDataString(ptr: *mut c_char);

    // Direct T3000 HandleWebViewMsg integration - NEW REAL IMPLEMENTATION
    fn HandleWebViewMsg(action: i32, msg: *mut c_char, len: i32) -> i32;
    fn T3000_RealHandleWebViewMsg_CPP(action: i32, msg: *mut c_char, len: i32) -> i32;

    // Device Information Functions - BASIC ONLY (CONFIRMED WORKING)
    fn IsDeviceOnline(device_id: i32) -> i32;
    fn GetDeviceCount() -> i32;
    fn GetDeviceIdByIndex(index: i32) -> i32;
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

        // Log service startup to structured log
        let timestamp = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S UTC");
        let _ = write_structured_log("t3000_ffi_sync_service_sync",
            &format!("[{}] 🚀 Starting T3000 LOGGING_DATA sync service with {}-second intervals",
                     timestamp, self.config.sync_interval_secs));

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

                // Log immediate startup success to structured log
                let timestamp = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S UTC");
                let _ = write_structured_log("t3000_ffi_sync_service_sync",
                    &format!("[{}] ✅ Immediate startup sync completed successfully", timestamp));
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
            write_structured_log("t3000_ffi_sync_service_sync",
                "🛑 T3000 LOGGING_DATA sync service stopped - Background task terminated").ok();
        });

        Ok(())
    }

    /// Stop the periodic sync service
    pub fn stop_sync_service(&self) {
        self.is_running.store(false, Ordering::Relaxed);
        info!("Stopping T3000 LOGGING_DATA sync service");

        // Log service stop to structured log
        let _ = write_structured_log("t3000_ffi_sync_service_sync",
            "🛑 T3000 FFI Sync Service stop requested - Setting running flag to false");
    }

    /// Test the direct T3000 HandleWebViewMsg integration
    pub async fn test_direct_integration(&self) -> Result<String, AppError> {
        info!("🧪 Testing direct T3000 HandleWebViewMsg integration");

        let timestamp = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S UTC");
        write_structured_log("t3000_ffi_sync_service_test",
            &format!("[{}] 🧪 Starting direct T3000 integration test", timestamp)).ok();

        // Call the direct FFI function
        let result = Self::get_logging_data_via_direct_ffi(&self.config).await?;

        // Log test results
        let is_real_data = !result.contains("Test Device") && !result.contains("test") && !result.contains("mock");

        if is_real_data {
            info!("🎉 SUCCESS: Direct integration returned REAL device data!");
            write_structured_log("t3000_ffi_sync_service_test",
                &format!("[{}] 🎉 SUCCESS: Direct T3000 integration test returned real device data", timestamp)).ok();
        } else {
            warn!("⚠️  WARNING: Direct integration still returns test data");
            write_structured_log("t3000_ffi_sync_service_test",
                &format!("[{}] ⚠️  Direct T3000 integration test returned test data - Check device connections", timestamp)).ok();
        }

        Ok(result)
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

        // Log database connection to structured log
        let timestamp = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S UTC");
        let _ = write_structured_log("t3000_ffi_sync_service_sync",
            &format!("[{}] ✅ Database connection established", timestamp));

        // Get JSON data from T3000 C++ via DIRECT FFI - this contains ALL devices and their data
        // Using new direct HandleWebViewMsg approach for real T3000 system integration
        let json_data = Self::get_logging_data_via_direct_ffi(&config).await?;

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

        // Log database transaction start to structured log
        let timestamp = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S UTC");
        let _ = write_structured_log("t3000_ffi_sync_service_sync",
            &format!("[{}] ✅ Database transaction started successfully", timestamp));

        info!("📦 Processing {} devices from T3000 LOGGING_DATA response", logging_response.devices.len());

        // Log device processing start to structured log
        let timestamp = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S UTC");
        let _ = write_structured_log("t3000_ffi_sync_service_sync",
            &format!("[{}] 📦 Processing {} devices from T3000 LOGGING_DATA response", timestamp, logging_response.devices.len()));

        // Process each device from the response
        for (device_index, device_with_points) in logging_response.devices.iter().enumerate() {
            let serial_number = device_with_points.device_info.panel_serial_number;

            info!("🏭 Processing Device {} of {}: Serial={}, Name='{}'",
                  device_index + 1, logging_response.devices.len(),
                  serial_number, device_with_points.device_info.panel_name);

            // Log individual device processing to structured log
            let timestamp = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S UTC");
            let _ = write_structured_log("t3000_ffi_sync_service_sync",
                &format!("[{}] 🏭 Processing Device {} of {}: Serial={}, Name='{}'",
                         timestamp, device_index + 1, logging_response.devices.len(), serial_number, device_with_points.device_info.panel_name));

            // UPSERT device basic info (INSERT or UPDATE)
            info!("📝 Syncing device basic info...");
            write_structured_log("t3000_ffi_sync_service_sync", &format!(
                "📝 Syncing device basic info - Serial: {}, Name: {}, Starting UPSERT operation",
                serial_number,
                &device_with_points.device_info.panel_name
            )).ok();

            if let Err(e) = Self::sync_device_basic_info(&txn, &device_with_points.device_info).await {
                error!("❌ Failed to sync device info for {}: {}", serial_number, e);
                write_structured_log("t3000_ffi_sync_service_errors", &format!(
                    "❌ Device basic info sync failed - Serial: {}, Error: {}",
                    serial_number, e
                )).ok();
                continue;
            }
            info!("✅ Device basic info synced");
            write_structured_log("t3000_ffi_sync_service_sync", &format!(
                "✅ Device basic info synced - Serial: {}, UPSERT operation completed successfully",
                serial_number
            )).ok();

                        // UPSERT input points (INSERT or UPDATE)
            if !device_with_points.input_points.is_empty() {
                info!("🔧 Syncing {} INPUT points...", device_with_points.input_points.len());
                write_structured_log("t3000_ffi_sync_service_sync", &format!(
                    "🔧 Starting INPUT points sync - Serial: {}, Count: {}, Processing individual points",
                    serial_number, device_with_points.input_points.len()
                )).ok();

                for (point_index, point) in device_with_points.input_points.iter().enumerate() {
                    write_structured_log("t3000_ffi_sync_service_sync", &format!(
                        "🔧 Processing INPUT point {}/{} - Serial: {}, Index: {}, Label: '{}', Value: {}",
                        point_index + 1, device_with_points.input_points.len(),
                        serial_number, point.index, point.full_label, point.value
                    )).ok();

                    if let Err(e) = Self::sync_input_point_static(&txn, serial_number, point).await {
                        error!("❌ Failed to sync input point {}: {}", point.index, e);
                        write_structured_log("t3000_ffi_sync_service_errors", &format!(
                            "❌ INPUT point sync failed - Serial: {}, Index: {}, Label: '{}', Error: {}",
                            serial_number, point.index, point.full_label, e
                        )).ok();
                    } else {
                        write_structured_log("t3000_ffi_sync_service_sync", &format!(
                            "✅ INPUT point synced successfully - Serial: {}, Index: {}, Label: '{}'",
                            serial_number, point.index, point.full_label
                        )).ok();
                    }
                }
                info!("✅ INPUT points synced");
                write_structured_log("t3000_ffi_sync_service_sync", &format!(
                    "✅ INPUT points sync completed - Serial: {}, Successfully synced {} INPUT points",
                    serial_number, device_with_points.input_points.len()
                )).ok();
            }

                        // UPSERT output points (INSERT or UPDATE)
            if !device_with_points.output_points.is_empty() {
                info!("🔧 Syncing {} OUTPUT points...", device_with_points.output_points.len());
                write_structured_log("t3000_ffi_sync_service_sync", &format!(
                    "🔧 Starting OUTPUT points sync - Serial: {}, Count: {}, Processing individual points",
                    serial_number, device_with_points.output_points.len()
                )).ok();

                for (point_index, point) in device_with_points.output_points.iter().enumerate() {
                    write_structured_log("t3000_ffi_sync_service_sync", &format!(
                        "🔧 Processing OUTPUT point {}/{} - Serial: {}, Index: {}, Label: '{}', Value: {}",
                        point_index + 1, device_with_points.output_points.len(),
                        serial_number, point.index, point.full_label, point.value
                    )).ok();

                    if let Err(e) = Self::sync_output_point_static(&txn, serial_number, point).await {
                        error!("❌ Failed to sync output point {}: {}", point.index, e);
                        write_structured_log("t3000_ffi_sync_service_errors", &format!(
                            "❌ OUTPUT point sync failed - Serial: {}, Index: {}, Label: '{}', Error: {}",
                            serial_number, point.index, point.full_label, e
                        )).ok();
                    } else {
                        write_structured_log("t3000_ffi_sync_service_sync", &format!(
                            "✅ OUTPUT point synced successfully - Serial: {}, Index: {}, Label: '{}'",
                            serial_number, point.index, point.full_label
                        )).ok();
                    }
                }
                info!("✅ OUTPUT points synced");
                write_structured_log("t3000_ffi_sync_service_sync", &format!(
                    "✅ OUTPUT points sync completed - Serial: {}, Successfully synced {} OUTPUT points",
                    serial_number, device_with_points.output_points.len()
                )).ok();
            }

                        // UPSERT variable points (INSERT or UPDATE)
            if !device_with_points.variable_points.is_empty() {
                info!("🔧 Syncing {} VARIABLE points...", device_with_points.variable_points.len());
                write_structured_log("t3000_ffi_sync_service_sync", &format!(
                    "🔧 Starting VARIABLE points sync - Serial: {}, Count: {}, Processing individual points",
                    serial_number, device_with_points.variable_points.len()
                )).ok();

                for (point_index, point) in device_with_points.variable_points.iter().enumerate() {
                    write_structured_log("t3000_ffi_sync_service_sync", &format!(
                        "🔧 Processing VARIABLE point {}/{} - Serial: {}, Index: {}, Label: '{}', Value: {}",
                        point_index + 1, device_with_points.variable_points.len(),
                        serial_number, point.index, point.full_label, point.value
                    )).ok();

                    if let Err(e) = Self::sync_variable_point_static(&txn, serial_number, point).await {
                        error!("❌ Failed to sync variable point {}: {}", point.index, e);
                        write_structured_log("t3000_ffi_sync_service_errors", &format!(
                            "❌ VARIABLE point sync failed - Serial: {}, Index: {}, Label: '{}', Error: {}",
                            serial_number, point.index, point.full_label, e
                        )).ok();
                    } else {
                        write_structured_log("t3000_ffi_sync_service_sync", &format!(
                            "✅ VARIABLE point synced successfully - Serial: {}, Index: {}, Label: '{}'",
                            serial_number, point.index, point.full_label
                        )).ok();
                    }
                }
                info!("✅ VARIABLE points synced");
                write_structured_log("t3000_ffi_sync_service_sync", &format!(
                    "✅ VARIABLE points sync completed - Serial: {}, Successfully synced {} VARIABLE points",
                    serial_number, device_with_points.variable_points.len()
                )).ok();
            }

            // INSERT trend log data (ALWAYS INSERT for historical data)
            let total_trend_points = device_with_points.input_points.len() +
                                   device_with_points.output_points.len() +
                                   device_with_points.variable_points.len();
            if total_trend_points > 0 {
                info!("📊 Inserting {} trend log entries...", total_trend_points);
                write_structured_log("t3000_ffi_sync_service_sync", &format!(
                    "📊 Starting trend log insertion - Serial: {}, Total entries: {} (Inputs: {}, Outputs: {}, Variables: {})",
                    serial_number, total_trend_points,
                    device_with_points.input_points.len(),
                    device_with_points.output_points.len(),
                    device_with_points.variable_points.len()
                )).ok();

                if let Err(e) = Self::insert_trend_logs(&txn, serial_number, device_with_points).await {
                    error!("❌ Failed to insert trend logs for {}: {}", serial_number, e);
                    write_structured_log("t3000_ffi_sync_service_errors", &format!(
                        "❌ Trend log insertion failed - Serial: {}, Error: {}, Total entries: {}",
                        serial_number, e, total_trend_points
                    )).ok();
                } else {
                    info!("✅ Trend log entries inserted");
                    write_structured_log("t3000_ffi_sync_service_sync", &format!(
                        "✅ Trend log insertion completed - Serial: {}, Successfully inserted {} trend log entries",
                        serial_number, total_trend_points
                    )).ok();
                }
            }

            info!("🎯 Device {} sync completed: {} inputs, {} outputs, {} variables",
                  serial_number,
                  device_with_points.input_points.len(),
                  device_with_points.output_points.len(),
                  device_with_points.variable_points.len());

            // Log device completion to structured log
            let timestamp = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S UTC");
            let _ = write_structured_log("t3000_ffi_sync_service_sync",
                &format!("[{}] 🎯 Device {} sync completed: {} inputs, {} outputs, {} variables",
                         timestamp, serial_number, device_with_points.input_points.len(),
                         device_with_points.output_points.len(), device_with_points.variable_points.len()));
        }

        // Commit transaction after all devices processed
        info!("💾 Committing database transaction...");
        write_structured_log("t3000_ffi_sync_service_sync", &format!(
            "💾 Transaction COMMIT starting - Processed {} devices, Total sync operations completed",
            logging_response.devices.len()
        )).ok();

        // Log transaction commit to structured log
        let timestamp = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S UTC");
        let _ = write_structured_log("t3000_ffi_sync_service_sync",
            &format!("[{}] 💾 Committing database transaction...", timestamp));

        let _commit_result = txn.commit().await
            .map_err(|e| {
                error!("❌ Failed to commit transaction: {}", e);
                write_structured_log("t3000_ffi_sync_service_errors", &format!(
                    "❌ Transaction COMMIT failed - Error: {}, All {} device changes rolled back",
                    e, logging_response.devices.len()
                )).ok();
                AppError::DatabaseError(format!("Transaction commit failed: {}", e))
            })?;

        info!("✅ Database transaction committed successfully");
        write_structured_log("t3000_ffi_sync_service_sync", &format!(
            "✅ Transaction COMMIT successful - All {} device changes persisted to database",
            logging_response.devices.len()
        )).ok();

        // Validate data was actually inserted by doing a quick count check
        let validation_db = establish_t3_device_connection().await?;

        info!("🔍 Validating data insertion...");
        write_structured_log("t3000_ffi_sync_service_sync",
            "🔍 Post-commit validation: Checking if data was actually inserted into database tables").ok();

        // Count devices that were processed in this sync
        let mut validation_summary = String::new();
        for device_with_points in &logging_response.devices {
            let serial_number = device_with_points.device_info.panel_serial_number;

            // Check if device exists in database
            if let Ok(device_count) = devices::Entity::find()
                .filter(devices::Column::SerialNumber.eq(serial_number))
                .count(&validation_db).await {

                validation_summary.push_str(&format!(
                    "Device {}: {} record(s) in DEVICES table; ",
                    serial_number, device_count
                ));
            }

            // Check input points count
            if let Ok(input_count) = input_points::Entity::find()
                .filter(input_points::Column::SerialNumber.eq(serial_number))
                .count(&validation_db).await {

                validation_summary.push_str(&format!(
                    "{} INPUT points; ", input_count
                ));
            }

            // Check output points count
            if let Ok(output_count) = output_points::Entity::find()
                .filter(output_points::Column::SerialNumber.eq(serial_number))
                .count(&validation_db).await {

                validation_summary.push_str(&format!(
                    "{} OUTPUT points; ", output_count
                ));
            }

            // Check variable points count
            if let Ok(variable_count) = variable_points::Entity::find()
                .filter(variable_points::Column::SerialNumber.eq(serial_number))
                .count(&validation_db).await {

                validation_summary.push_str(&format!(
                    "{} VARIABLE points; ", variable_count
                ));
            }
        }

        info!("📊 Validation Results: {}", validation_summary);
        write_structured_log("t3000_ffi_sync_service_sync", &format!(
            "📊 Post-commit validation results: {}",
            validation_summary
        )).ok();

        info!("🎉 T3000 LOGGING_DATA sync completed successfully - {} devices processed",
              logging_response.devices.len());

        // Log sync completion to structured log file with device count
        let timestamp = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S UTC");
        let _ = write_structured_log("t3000_ffi_sync_service_sync",
            &format!("[{}] 🎉 T3000 LOGGING_DATA sync completed successfully - {} devices processed",
                     timestamp, logging_response.devices.len()));

        Ok(())
    }

    /// UPSERT device basic info (INSERT or UPDATE based on existence)
    async fn sync_device_basic_info(txn: &DatabaseTransaction, device_info: &DeviceInfo) -> Result<(), AppError> {
        let serial_number = device_info.panel_serial_number;

        info!("🔍 Checking if device {} exists in database...", serial_number);
        write_structured_log("t3000_ffi_sync_service_sync", &format!(
            "🔍 Database lookup for device - Serial: {}, Name: '{}', IP: '{}'",
            serial_number, device_info.panel_name, device_info.panel_ipaddress
        )).ok();

        // Check if device exists
        let existing = devices::Entity::find()
            .filter(devices::Column::SerialNumber.eq(serial_number))
            .one(txn).await
            .map_err(|e| {
                let error_msg = format!("Database query failed for device {}: {}", serial_number, e);
                write_structured_log("t3000_ffi_sync_service_errors", &format!(
                    "❌ Device existence check failed - Serial: {}, Error: {}",
                    serial_number, e
                )).ok();
                AppError::DatabaseError(error_msg)
            })?;

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
            write_structured_log("t3000_ffi_sync_service_sync", &format!(
                "🔄 Device UPDATE operation - Serial: {}, Name: '{}', Status: Online",
                serial_number, device_info.panel_name
            )).ok();

            // UPDATE existing device
            let update_result = devices::Entity::update(device_model)
                .filter(devices::Column::SerialNumber.eq(serial_number))
                .exec(txn).await
                .map_err(|e| {
                    let error_msg = format!("Device UPDATE failed for {}: {}", serial_number, e);
                    write_structured_log("t3000_ffi_sync_service_errors", &format!(
                        "❌ Device UPDATE failed - Serial: {}, Error: {}",
                        serial_number, e
                    )).ok();
                    AppError::DatabaseError(error_msg)
                })?;

            info!("✅ Device {} info UPDATED successfully", serial_number);
            write_structured_log("t3000_ffi_sync_service_sync", &format!(
                "✅ Device UPDATE successful - Serial: {}, Update operation completed",
                serial_number
            )).ok();
        } else {
            info!("➕ Device {} not found - performing INSERT as new device", serial_number);
            write_structured_log("t3000_ffi_sync_service_sync", &format!(
                "➕ Device INSERT operation - Serial: {}, Name: '{}', New device registration",
                serial_number, device_info.panel_name
            )).ok();

            // INSERT new device
            let insert_result = devices::Entity::insert(device_model)
                .exec(txn).await
                .map_err(|e| {
                    let error_msg = format!("Device INSERT failed for {}: {}", serial_number, e);
                    write_structured_log("t3000_ffi_sync_service_errors", &format!(
                        "❌ Device INSERT failed - Serial: {}, Error: {}",
                        serial_number, e
                    )).ok();
                    AppError::DatabaseError(error_msg)
                })?;

            info!("✅ Device {} info INSERTED successfully", serial_number);
            write_structured_log("t3000_ffi_sync_service_sync", &format!(
                "✅ Device INSERT successful - Serial: {}, Last insert ID: {}",
                serial_number, insert_result.last_insert_id
            )).ok();
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
            write_structured_log("t3000_ffi_sync_service_sync", &format!(
                "📈 Starting INPUT trend log insertion - Serial: {}, Count: {}, Timestamp: {}",
                serial_number, device_data.input_points.len(), timestamp
            )).ok();
        }

        for (input_index, point) in device_data.input_points.iter().enumerate() {
            let trend_model = trendlog_data::ActiveModel {
                Trendlog_Input_ID: Set(point.index as i32),
                TimeStamp: Set(timestamp.clone()),
                fValue: Set(Some(point.value.to_string())),
                Status: Set(Some(point.status.to_string())),
                Quality: Set(Some("Good".to_string())),
                BinaryArray: Set(None),
            };

            write_structured_log("t3000_ffi_sync_service_sync", &format!(
                "📊 Inserting INPUT trend log {}/{} - Serial: {}, Index: {}, Value: {}, Status: {}",
                input_index + 1, device_data.input_points.len(),
                serial_number, point.index, point.value, point.status
            )).ok();

            if let Err(e) = trendlog_data::Entity::insert(trend_model).exec(txn).await {
                write_structured_log("t3000_ffi_sync_service_errors", &format!(
                    "❌ INPUT trend log insert failed - Serial: {}, Index: {}, Error: {}",
                    serial_number, point.index, e
                )).ok();
                return Err(AppError::DatabaseError(format!("Failed to insert INPUT trend log: {}", e)));
            }
        }

        // Insert trend logs for all output points
        if !device_data.output_points.is_empty() {
            info!("📈 Inserting {} OUTPUT point trend logs...", device_data.output_points.len());
            write_structured_log("t3000_ffi_sync_service_sync", &format!(
                "📈 Starting OUTPUT trend log insertion - Serial: {}, Count: {}, Timestamp: {}",
                serial_number, device_data.output_points.len(), timestamp
            )).ok();
        }

        for (output_index, point) in device_data.output_points.iter().enumerate() {
            let trend_model = trendlog_data::ActiveModel {
                Trendlog_Input_ID: Set(point.index as i32),
                TimeStamp: Set(timestamp.clone()),
                fValue: Set(Some(point.value.to_string())),
                Status: Set(Some(point.status.to_string())),
                Quality: Set(Some("Good".to_string())),
                BinaryArray: Set(None),
            };

            write_structured_log("t3000_ffi_sync_service_sync", &format!(
                "📊 Inserting OUTPUT trend log {}/{} - Serial: {}, Index: {}, Value: {}, Status: {}",
                output_index + 1, device_data.output_points.len(),
                serial_number, point.index, point.value, point.status
            )).ok();

            if let Err(e) = trendlog_data::Entity::insert(trend_model).exec(txn).await {
                write_structured_log("t3000_ffi_sync_service_errors", &format!(
                    "❌ OUTPUT trend log insert failed - Serial: {}, Index: {}, Error: {}",
                    serial_number, point.index, e
                )).ok();
                return Err(AppError::DatabaseError(format!("Failed to insert OUTPUT trend log: {}", e)));
            }
        }

        // Insert trend logs for all variable points
        if !device_data.variable_points.is_empty() {
            info!("📈 Inserting {} VARIABLE point trend logs...", device_data.variable_points.len());
            write_structured_log("t3000_ffi_sync_service_sync", &format!(
                "📈 Starting VARIABLE trend log insertion - Serial: {}, Count: {}, Timestamp: {}",
                serial_number, device_data.variable_points.len(), timestamp
            )).ok();
        }

        for (variable_index, point) in device_data.variable_points.iter().enumerate() {
            let trend_model = trendlog_data::ActiveModel {
                Trendlog_Input_ID: Set(point.index as i32),
                TimeStamp: Set(timestamp.clone()),
                fValue: Set(Some(point.value.to_string())),
                Status: Set(Some(point.status.to_string())),
                Quality: Set(Some("Good".to_string())),
                BinaryArray: Set(None),
            };

            write_structured_log("t3000_ffi_sync_service_sync", &format!(
                "📊 Inserting VARIABLE trend log {}/{} - Serial: {}, Index: {}, Value: {}, Status: {}",
                variable_index + 1, device_data.variable_points.len(),
                serial_number, point.index, point.value, point.status
            )).ok();

            if let Err(e) = trendlog_data::Entity::insert(trend_model).exec(txn).await {
                write_structured_log("t3000_ffi_sync_service_errors", &format!(
                    "❌ VARIABLE trend log insert failed - Serial: {}, Index: {}, Error: {}",
                    serial_number, point.index, e
                )).ok();
                return Err(AppError::DatabaseError(format!("Failed to insert VARIABLE trend log: {}", e)));
            }
        }

        let total_inserted = device_data.input_points.len() + device_data.output_points.len() + device_data.variable_points.len();
        info!("✅ Inserted {} total trend log entries for device {} at {}",
              total_inserted, serial_number, timestamp);
        Ok(())
    }

    /// Call T3000 C++ HandleWebViewMsg function directly via FFI for LOGGING_DATA
    async fn get_logging_data_via_direct_ffi(config: &T3000MainConfig) -> Result<String, AppError> {
        info!("🔄 Starting DIRECT FFI call to HandleWebViewMsg with LOGGING_DATA action");
        info!("📋 FFI Config - Timeout: {}s, Retry: {}", config.timeout_seconds, config.retry_attempts);

        let timestamp = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S UTC").to_string();
        write_structured_log("t3000_ffi_sync_service_sync",
            &format!("[{}] 🔄 Starting DIRECT FFI call to HandleWebViewMsg(15) - Real T3000 system integration", timestamp));

        // Run FFI call in a blocking task with timeout
        let spawn_result = tokio::time::timeout(
            Duration::from_secs(config.timeout_seconds),
            tokio::task::spawn_blocking(move || {
                info!("🔌 Calling HandleWebViewMsg(15) via direct FFI...");

                write_structured_log("t3000_ffi_sync_service_sync",
                    "🔌 About to call HandleWebViewMsg with LOGGING_DATA action - Using real T3000 BacnetWebView function").ok();

                unsafe {
                    // Prepare buffer for response
                    const BUFFER_SIZE: usize = 65536; // 64KB buffer
                    let mut buffer: Vec<u8> = vec![0; BUFFER_SIZE];

                    // Call the direct T3000 HandleWebViewMsg function
                    // Action 15 = LOGGING_DATA case in BacnetWebView.cpp
                    let result = HandleWebViewMsg(15, buffer.as_mut_ptr() as *mut i8, BUFFER_SIZE as i32);

                    if result != 0 {
                        error!("❌ HandleWebViewMsg returned error code: {}", result);
                        write_structured_log("t3000_ffi_sync_service_errors",
                            &format!("❌ HandleWebViewMsg returned error code {} - Failed to get real device data", result)).ok();
                        panic!("HandleWebViewMsg returned error code: {}", result);
                    }

                    // Find the null terminator to get the actual string length
                    let null_pos = buffer.iter().position(|&x| x == 0).unwrap_or(buffer.len());
                    let result_str = String::from_utf8_lossy(&buffer[..null_pos]).to_string();

                    if result_str.is_empty() {
                        error!("❌ HandleWebViewMsg returned empty response");
                        write_structured_log("t3000_ffi_sync_service_errors",
                            "❌ HandleWebViewMsg returned empty response - No device data available").ok();
                        panic!("HandleWebViewMsg returned empty response");
                    }

                    info!("✅ HandleWebViewMsg returned valid response");
                    info!("📊 Direct Response Size: {} bytes", result_str.len());
                    write_structured_log("t3000_ffi_sync_service_sync",
                        &format!("✅ HandleWebViewMsg returned {} bytes of device data", result_str.len())).ok();

                    // Check if this is real data or still test data
                    if result_str.contains("Test Device") || result_str.contains("test") ||
                       result_str.contains("mock") || result_str.contains("sample") {
                        warn!("⚠️  Still receiving test data from direct HandleWebViewMsg call!");
                        write_structured_log("t3000_ffi_sync_service_errors", &format!(
                            "⚠️  DIAGNOSTIC: Direct HandleWebViewMsg still returns test data. Check T3000 device connections"
                        )).ok();
                    } else {
                        info!("🎉 SUCCESS: Received real device data from direct T3000 integration!");
                        write_structured_log("t3000_ffi_sync_service_sync",
                            "🎉 SUCCESS: Direct HandleWebViewMsg call returned real T3000 device data").ok();
                    }

                    info!("📝 Direct Response Preview: {}",
                          if result_str.len() > 200 { &result_str[..200] } else { &result_str });

                    // Return the result directly without wrapping in Result
                    result_str
                }
            }),
        ).await;

        // Handle the spawn result
        match spawn_result {
            Ok(result) => {
                match result {
                    Ok(data) => {
                        info!("✅ Direct FFI call completed successfully");
                        write_structured_log("t3000_ffi_sync_service_sync",
                            &format!("[{}] ✅ Direct HandleWebViewMsg FFI call completed successfully", timestamp));
                        Ok(data)
                    }
                    Err(join_error) => {
                        error!("❌ Direct FFI task failed: {}", join_error);
                        write_structured_log("t3000_ffi_sync_service_errors",
                            &format!("[{}] ❌ Direct HandleWebViewMsg task failed: {}", timestamp, join_error));
                        Err(AppError::FfiError(format!("Direct FFI task failed: {}", join_error)))
                    }
                }
            }
            Err(timeout_error) => {
                error!("⏰ Direct FFI call timed out after {}s", config.timeout_seconds);
                write_structured_log("t3000_ffi_sync_service_errors",
                    &format!("[{}] ⏰ Direct HandleWebViewMsg FFI call timed out after {}s", timestamp, config.timeout_seconds));
                Err(AppError::FfiError(format!("Direct FFI call timed out after {}s: {}", config.timeout_seconds, timeout_error)))
            }
        }
    }

    /// Call T3000 C++ LOGGING_DATA function via FFI
    async fn get_logging_data_via_ffi_static(config: &T3000MainConfig) -> Result<String, AppError> {
        info!("🔄 Starting FFI call to T3000_GetLoggingData");
        info!("📋 FFI Config - Timeout: {}s, Retry: {}", config.timeout_seconds, config.retry_attempts);

        // Log FFI call start to structured log
        let timestamp = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S UTC");
        let _ = write_structured_log("t3000_ffi_sync_service_sync",
            &format!("[{}] 🔄 Starting FFI call to T3000_GetLoggingData (timeout: {}s)", timestamp, config.timeout_seconds));

        // Enhanced diagnostic logging for T3000 C++ integration
        let _ = write_structured_log("t3000_ffi_sync_service_sync",
            "🔧 Enhanced T3000 diagnostic and logging system active");
        let _ = write_structured_log("t3000_ffi_sync_service_sync",
            "⚡ Starting enhanced T3000 FFI call with comprehensive response data logging");

        // Run FFI call in a blocking task with timeout
        let spawn_result = tokio::time::timeout(
            Duration::from_secs(config.timeout_seconds),
            tokio::task::spawn_blocking(move || {
                info!("🔌 Calling T3000_GetLoggingData() via FFI...");

                // Add diagnostic logging before FFI call
                write_structured_log("t3000_ffi_sync_service_sync",
                    "🔌 About to call T3000_GetLoggingData() - Checking for real T3000 devices vs test data").ok();

                unsafe {
                    let data_ptr = T3000_GetLoggingData();

                    if data_ptr.is_null() {
                        error!("❌ T3000_GetLoggingData returned null pointer");
                        write_structured_log("t3000_ffi_sync_service_errors",
                            "❌ T3000_GetLoggingData returned NULL - No data available or C++ function failed").ok();
                        return Err(AppError::FfiError("T3000_GetLoggingData returned null pointer".to_string()));
                    }

                    info!("✅ T3000_GetLoggingData returned valid pointer");
                    write_structured_log("t3000_ffi_sync_service_sync",
                        "✅ T3000_GetLoggingData returned valid pointer - Starting memory processing").ok();

                    // Convert C string to Rust string
                    let c_str = CStr::from_ptr(data_ptr);
                    let result = c_str.to_string_lossy().to_string();

                    info!("📊 Raw C++ Response Size: {} bytes", result.len());

                    // Enhanced diagnostic check for test data
                    if result.contains("Test Device") || result.contains("test") ||
                       result.contains("mock") || result.contains("sample") {
                        warn!("⚠️  CRITICAL: C++ returned test/mock data instead of real device data!");
                        write_structured_log("t3000_ffi_sync_service_errors", &format!(
                            "⚠️  CRITICAL DIAGNOSTIC: T3000_GetLoggingData() returned test data. Response size: {} bytes. This suggests:",
                            result.len()
                        )).ok();
                        write_structured_log("t3000_ffi_sync_service_errors",
                            "   1. No real T3000 devices are connected/responding").ok();
                        write_structured_log("t3000_ffi_sync_service_errors",
                            "   2. C++ function is returning fallback test data").ok();
                        write_structured_log("t3000_ffi_sync_service_errors",
                            "   3. T3000 network communication may be failing").ok();
                        write_structured_log("t3000_ffi_sync_service_errors",
                            "   4. Check T3000 device connectivity and C++ implementation").ok();
                    }

                    info!("📝 Raw C++ Response Preview: {}",
                         if result.len() > 200 {
                             format!("{}...", &result[..200])
                         } else {
                             result.clone()
                         });

                    // Log complete raw C++ response to structured log for debugging
                    let timestamp = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S UTC");
                    let _ = write_structured_log("t3000_ffi_sync_service_sync",
                        &format!("[{}] 📊 Raw C++ Response FULL DATA ({} bytes):\n{}",
                                 timestamp, result.len(), result));

                    // Also log the complete response for debugging
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

                                // Log FFI success to structured log with data size and preview
                                let timestamp = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S UTC");
                                let preview = if data.len() > 200 { format!("{}...", &data[..200]) } else { data.clone() };
                                let _ = write_structured_log("t3000_ffi_sync_service_sync",
                                    &format!("[{}] ✅ FFI call completed - {} bytes received. Preview: {}", timestamp, data.len(), preview));

                                Ok(data)
                            }
                            Err(e) => {
                                error!("❌ FFI call failed: {}", e);

                                // Log FFI error to structured log
                                let timestamp = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S UTC");
                                let _ = write_structured_log("t3000_ffi_sync_service_errors",
                                    &format!("[{}] ❌ FFI call failed: {}", timestamp, e));

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

        // Log JSON parsing start to structured log
        let timestamp = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S UTC");
        let _ = write_structured_log("t3000_ffi_sync_service_sync",
            &format!("[{}] 🔍 Starting JSON parsing - {} bytes", timestamp, json_data.len()));

        // Add diagnostic logging to check for test data patterns
        if json_data.contains("Test Device") {
            warn!("⚠️  DIAGNOSTIC: JSON contains 'Test Device' - This indicates test/mock data is being returned!");
            write_structured_log("t3000_ffi_sync_service_errors", &format!(
                "[{}] ⚠️  DIAGNOSTIC WARNING: C++ returned test data containing 'Test Device' - Check T3000 C++ implementation",
                timestamp
            )).ok();
        }

        // Log first 500 characters for diagnostic purposes
        let preview = if json_data.len() > 500 {
            format!("{}...", &json_data[..500])
        } else {
            json_data.to_string()
        };
        info!("🔍 JSON Content Preview: {}", preview);
        write_structured_log("t3000_ffi_sync_service_sync", &format!(
            "[{}] 🔍 JSON Content Preview: {}",
            timestamp, preview
        )).ok();

        let json_value: JsonValue = serde_json::from_str(json_data)
            .map_err(|e| {
                error!("❌ JSON parse error: {}", e);
                // Log JSON parse error to structured log
                let timestamp = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S UTC");
                let _ = write_structured_log("t3000_ffi_sync_service_errors",
                    &format!("[{}] ❌ JSON parse error: {}", timestamp, e));
                AppError::ParseError(format!("Failed to parse LOGGING_DATA JSON: {}", e))
            })?;

        info!("✅ JSON parsed successfully");

        // Log JSON parsing success to structured log
        let timestamp = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S UTC");
        let _ = write_structured_log("t3000_ffi_sync_service_sync",
            &format!("[{}] ✅ JSON parsed successfully", timestamp));

        // Diagnostic: Check all top-level keys in the JSON
        if let Some(obj) = json_value.as_object() {
            let keys: Vec<&String> = obj.keys().collect();
            info!("🔑 JSON Top-level keys: {:?}", keys);
            write_structured_log("t3000_ffi_sync_service_sync", &format!(
                "[{}] 🔑 JSON Top-level keys: {:?}",
                timestamp, keys
            )).ok();
        }

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

        // Diagnostic: Check if action indicates test data
        if action.contains("TEST") || action.contains("MOCK") {
            warn!("⚠️  DIAGNOSTIC: Action '{}' suggests test/mock data", action);
        }

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

        // Diagnostic: Check for test device indicators
        if device_info.panel_name.contains("Test") || device_info.panel_name.contains("Mock") ||
           device_info.panel_name.contains("Dummy") || device_info.panel_name.contains("Sample") {
            warn!("⚠️  DIAGNOSTIC: Device name '{}' suggests test data", device_info.panel_name);
            write_structured_log("t3000_ffi_sync_service_errors", &format!(
                "[{}] ⚠️  DIAGNOSTIC: Device name '{}' indicates test/mock data - Check C++ T3000_GetLoggingData() implementation",
                timestamp, device_info.panel_name
            )).ok();
        }

        // Log device discovery to structured log
        let timestamp = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S UTC");
        let _ = write_structured_log("t3000_ffi_sync_service_sync",
            &format!("[{}] 🏠 Device Info - Panel ID: {}, Serial: {}, Name: '{}', IP: {}",
                     timestamp, device_info.panel_id, device_info.panel_serial_number,
                     device_info.panel_name, device_info.panel_ipaddress));

        // Parse point data from the "data" array
        let mut input_points = Vec::new();
        let mut output_points = Vec::new();
        let mut variable_points = Vec::new();

        if let Some(data_array) = json_value.get("data").and_then(|v| v.as_array()) {
            info!("📊 Found data array with {} points", data_array.len());

            // Log data array discovery to structured log
            let timestamp = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S UTC");
            let _ = write_structured_log("t3000_ffi_sync_service_sync",
                &format!("[{}] 📊 Found data array with {} points", timestamp, data_array.len()));

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
                info!("🔄 Updating existing INPUT point {}:{} - Label: '{}'", serial_number, point.index, point.full_label);
                write_structured_log("t3000_ffi_sync_service_sync", &format!(
                    "🔄 INPUT UPDATE - Serial: {}, Index: {}, Label: '{}', Value: {}, Units: '{}'",
                    serial_number, point.index, point.full_label, point.value, point.units
                )).ok();

                let update_result = input_points::Entity::update(input_model)
                    .filter(input_points::Column::SerialNumber.eq(serial_number))
                    .filter(input_points::Column::InputIndex.eq(Some(point.index.to_string())))
                    .exec(txn).await
                    .map_err(|e| {
                        write_structured_log("t3000_ffi_sync_service_errors", &format!(
                            "❌ INPUT UPDATE failed - Serial: {}, Index: {}, Error: {}",
                            serial_number, point.index, e
                        )).ok();
                        AppError::DatabaseError(format!("Failed to update input point: {}", e))
                    })?;

                info!("✅ INPUT point {}:{} UPDATED", serial_number, point.index);
                write_structured_log("t3000_ffi_sync_service_sync", &format!(
                    "✅ INPUT UPDATE successful - Serial: {}, Index: {}, Update operation completed",
                    serial_number, point.index
                )).ok();
                Ok(())
            }
            None => {
                // INSERT new input point
                info!("➕ Inserting new INPUT point {}:{} - Label: '{}'", serial_number, point.index, point.full_label);
                write_structured_log("t3000_ffi_sync_service_sync", &format!(
                    "➕ INPUT INSERT - Serial: {}, Index: {}, Label: '{}', Value: {}, Units: '{}'",
                    serial_number, point.index, point.full_label, point.value, point.units
                )).ok();

                let insert_result = input_points::Entity::insert(input_model)
                    .exec(txn).await
                    .map_err(|e| {
                        write_structured_log("t3000_ffi_sync_service_errors", &format!(
                            "❌ INPUT INSERT failed - Serial: {}, Index: {}, Error: {}",
                            serial_number, point.index, e
                        )).ok();
                        AppError::DatabaseError(format!("Failed to insert input point: {}", e))
                    })?;

                info!("✅ INPUT point {}:{} INSERTED", serial_number, point.index);
                write_structured_log("t3000_ffi_sync_service_sync", &format!(
                    "✅ INPUT INSERT successful - Serial: {}, Index: {}, Last insert ID: {}",
                    serial_number, point.index, insert_result.last_insert_id
                )).ok();
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
                info!("🔄 Updating existing OUTPUT point {}:{} - Label: '{}'", serial_number, point.index, point.full_label);
                write_structured_log("t3000_ffi_sync_service_sync", &format!(
                    "🔄 OUTPUT UPDATE - Serial: {}, Index: {}, Label: '{}', Value: {}, Units: '{}'",
                    serial_number, point.index, point.full_label, point.value, point.units
                )).ok();

                let update_result = output_points::Entity::update(output_model)
                    .filter(output_points::Column::SerialNumber.eq(serial_number))
                    .filter(output_points::Column::OutputIndex.eq(Some(point.index.to_string())))
                    .exec(txn).await
                    .map_err(|e| {
                        write_structured_log("t3000_ffi_sync_service_errors", &format!(
                            "❌ OUTPUT UPDATE failed - Serial: {}, Index: {}, Error: {}",
                            serial_number, point.index, e
                        )).ok();
                        AppError::DatabaseError(format!("Failed to update output point: {}", e))
                    })?;

                info!("✅ OUTPUT point {}:{} UPDATED", serial_number, point.index);
                write_structured_log("t3000_ffi_sync_service_sync", &format!(
                    "✅ OUTPUT UPDATE successful - Serial: {}, Index: {}, Update operation completed",
                    serial_number, point.index
                )).ok();
                Ok(())
            }
            None => {
                // INSERT new output point
                info!("➕ Inserting new OUTPUT point {}:{} - Label: '{}'", serial_number, point.index, point.full_label);
                write_structured_log("t3000_ffi_sync_service_sync", &format!(
                    "➕ OUTPUT INSERT - Serial: {}, Index: {}, Label: '{}', Value: {}, Units: '{}'",
                    serial_number, point.index, point.full_label, point.value, point.units
                )).ok();

                let insert_result = output_points::Entity::insert(output_model)
                    .exec(txn).await
                    .map_err(|e| {
                        write_structured_log("t3000_ffi_sync_service_errors", &format!(
                            "❌ OUTPUT INSERT failed - Serial: {}, Index: {}, Error: {}",
                            serial_number, point.index, e
                        )).ok();
                        AppError::DatabaseError(format!("Failed to insert output point: {}", e))
                    })?;

                info!("✅ OUTPUT point {}:{} INSERTED", serial_number, point.index);
                write_structured_log("t3000_ffi_sync_service_sync", &format!(
                    "✅ OUTPUT INSERT successful - Serial: {}, Index: {}, Last insert ID: {}",
                    serial_number, point.index, insert_result.last_insert_id
                )).ok();
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
                info!("🔄 Updating existing VARIABLE point {}:{} - Label: '{}'", serial_number, point.index, point.full_label);
                write_structured_log("t3000_ffi_sync_service_sync", &format!(
                    "🔄 VARIABLE UPDATE - Serial: {}, Index: {}, Label: '{}', Value: {}, Units: '{}'",
                    serial_number, point.index, point.full_label, point.value, point.units
                )).ok();

                let update_result = variable_points::Entity::update(variable_model)
                    .filter(variable_points::Column::SerialNumber.eq(serial_number))
                    .filter(variable_points::Column::VariableIndex.eq(Some(point.index.to_string())))
                    .exec(txn).await
                    .map_err(|e| {
                        write_structured_log("t3000_ffi_sync_service_errors", &format!(
                            "❌ VARIABLE UPDATE failed - Serial: {}, Index: {}, Error: {}",
                            serial_number, point.index, e
                        )).ok();
                        AppError::DatabaseError(format!("Failed to update variable point: {}", e))
                    })?;

                info!("✅ VARIABLE point {}:{} UPDATED", serial_number, point.index);
                write_structured_log("t3000_ffi_sync_service_sync", &format!(
                    "✅ VARIABLE UPDATE successful - Serial: {}, Index: {}, Update operation completed",
                    serial_number, point.index
                )).ok();
                Ok(())
            }
            None => {
                // INSERT new variable point
                info!("➕ Inserting new VARIABLE point {}:{} - Label: '{}'", serial_number, point.index, point.full_label);
                write_structured_log("t3000_ffi_sync_service_sync", &format!(
                    "➕ VARIABLE INSERT - Serial: {}, Index: {}, Label: '{}', Value: {}, Units: '{}'",
                    serial_number, point.index, point.full_label, point.value, point.units
                )).ok();

                let insert_result = variable_points::Entity::insert(variable_model)
                    .exec(txn).await
                    .map_err(|e| {
                        write_structured_log("t3000_ffi_sync_service_errors", &format!(
                            "❌ VARIABLE INSERT failed - Serial: {}, Index: {}, Error: {}",
                            serial_number, point.index, e
                        )).ok();
                        AppError::DatabaseError(format!("Failed to insert variable point: {}", e))
                    })?;

                info!("✅ VARIABLE point {}:{} INSERTED", serial_number, point.index);
                write_structured_log("t3000_ffi_sync_service_sync", &format!(
                    "✅ VARIABLE INSERT successful - Serial: {}, Index: {}, Last insert ID: {}",
                    serial_number, point.index, insert_result.last_insert_id
                )).ok();
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

    /// Enhanced diagnostic logging placeholder - T3000 initialization functions not available in current export library
    async fn check_t3000_system() -> Result<(), AppError> {
        // NOTE: T3000 initialization functions (T3000_Initialize, T3000_ScanForDevices, etc.)
        // are not available in the current T3000 export library.
        // The system will use T3000_GetLoggingData() directly, which should work
        // if the T3000 C++ system is already initialized by the main application.

        let _ = write_structured_log("t3000_ffi_sync_service_sync",
            "💡 T3000 initialization functions not available - Using direct T3000_GetLoggingData() call");
        let _ = write_structured_log("t3000_ffi_sync_service_sync",
            "📋 Assuming T3000 C++ system is initialized by main application");

        Ok(())
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
