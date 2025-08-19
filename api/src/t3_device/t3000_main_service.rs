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
            sync_interval_secs: 300,  // 5 minutes
            timeout_seconds: 30,      // 30 seconds FFI timeout
            retry_attempts: 3,
            auto_start: true,
        }
    }
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

        info!("Starting T3000 LOGGING_DATA sync service with {}-second intervals", self.config.sync_interval_secs);

        let config = self.config.clone();
        let is_running = self.is_running.clone();

        tokio::spawn(async move {
            while is_running.load(Ordering::Relaxed) {
                // Perform logging data sync
                if let Err(e) = Self::sync_logging_data_static(config.clone()).await {
                    error!("Logging data sync failed: {}", e);
                }

                // Sleep until next sync interval
                sleep(Duration::from_secs(config.sync_interval_secs)).await;
            }

            info!("T3000 LOGGING_DATA sync service stopped");
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
        debug!("Starting LOGGING_DATA sync");

        let db = establish_t3_device_connection().await?;

        // Get all devices to sync (no online filter since field doesn't exist)
        let devices_result = devices::Entity::find()
            .all(&db).await?;

        for device in devices_result {
            if let Err(e) = Self::sync_device_data_static(&db, device.SerialNumber, &config).await {
                error!("Failed to sync device {}: {}", device.SerialNumber, e);
            }
        }

        info!("LOGGING_DATA sync completed");
        Ok(())
    }

    /// Sync data for a specific device
    async fn sync_device_data_static(db: &DatabaseConnection, serial_number: i32, config: &T3000MainConfig) -> Result<(), AppError> {
        debug!("Syncing LOGGING_DATA for device {}", serial_number);

        // Get JSON data from T3000 C++ via FFI
        let json_data = Self::get_logging_data_via_ffi_static(config).await?;

        // Parse JSON response
        let logging_data = Self::parse_logging_data(&json_data)?;

        // Start database transaction
        let txn = db.begin().await?;

        // Update device points (INPUT/OUTPUT/VARIABLES)
        let mut sync_stats = (0usize, 0usize, 0usize); // (inputs, outputs, variables)

        if let Some(inputs) = logging_data.get("inputs").and_then(|v| v.as_array()) {
            for input_json in inputs {
                if let Ok(point) = serde_json::from_value::<PointData>(input_json.clone()) {
                    if let Ok(updated) = Self::sync_input_point_static(&txn, serial_number, &point).await {
                        sync_stats.0 += updated;
                    }
                }
            }
        }

        if let Some(outputs) = logging_data.get("outputs").and_then(|v| v.as_array()) {
            for output_json in outputs {
                if let Ok(point) = serde_json::from_value::<PointData>(output_json.clone()) {
                    if let Ok(updated) = Self::sync_output_point_static(&txn, serial_number, &point).await {
                        sync_stats.1 += updated;
                    }
                }
            }
        }

        if let Some(variables) = logging_data.get("variables").and_then(|v| v.as_array()) {
            for variable_json in variables {
                if let Ok(point) = serde_json::from_value::<PointData>(variable_json.clone()) {
                    if let Ok(updated) = Self::sync_variable_point_static(&txn, serial_number, &point).await {
                        sync_stats.2 += updated;
                    }
                }
            }
        }

        // Insert trend log data (always INSERT, never update for historical data)
        if let Some(trend_logs) = logging_data.get("trend_logs").and_then(|v| v.as_array()) {
            for trend_json in trend_logs {
                if let Ok(point) = serde_json::from_value::<PointData>(trend_json.clone()) {
                    let _ = Self::insert_trend_log_static(&txn, serial_number, &point).await;
                }
            }
        }

        // Commit transaction
        txn.commit().await?;

        info!("Device {} sync completed: {} inputs, {} outputs, {} variables",
              serial_number, sync_stats.0, sync_stats.1, sync_stats.2);

        Ok(())
    }

    /// Call T3000 C++ LOGGING_DATA function via FFI
    async fn get_logging_data_via_ffi_static(config: &T3000MainConfig) -> Result<String, AppError> {
        // Run FFI call in a blocking task with timeout
        let spawn_result = tokio::time::timeout(
            Duration::from_secs(config.timeout_seconds),
            tokio::task::spawn_blocking(move || {
                unsafe {
                    let data_ptr = T3000_GetLoggingData();

                    if data_ptr.is_null() {
                        return Err(AppError::FfiError("T3000_GetLoggingData returned null pointer".to_string()));
                    }

                    // Convert C string to Rust string
                    let c_str = CStr::from_ptr(data_ptr);
                    let result = c_str.to_string_lossy().to_string();

                    // Free the C++ allocated string
                    T3000_FreeLoggingDataString(data_ptr);

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
                                debug!("Successfully received {} bytes from T3000_GetLoggingData", data.len());
                                Ok(data)
                            }
                            Err(e) => {
                                error!("FFI call failed: {}", e);
                                Err(e)
                            }
                        }
                    }
                    Err(join_err) => {
                        let error_msg = format!("FFI task join failed: {}", join_err);
                        error!("{}", error_msg);
                        Err(AppError::ServiceError(error_msg))
                    }
                }
            }
            Err(timeout_err) => {
                let error_msg = format!("FFI call timed out: {}", timeout_err);
                error!("{}", error_msg);
                Err(AppError::ServiceError(error_msg))
            }
        }
    }

    /// Parse JSON response from T3000 LOGGING_DATA
    fn parse_logging_data(json_data: &str) -> Result<JsonValue, AppError> {
        serde_json::from_str(json_data)
            .map_err(|e| AppError::ParseError(format!("Failed to parse LOGGING_DATA JSON: {}", e)))
    }

    /// Sync input point data (INSERT or UPDATE)
    async fn sync_input_point_static(
        txn: &DatabaseTransaction,
        serial_number: i32,
        point: &PointData,
    ) -> Result<usize, AppError> {
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
                input_points::Entity::update(input_model)
                    .filter(input_points::Column::SerialNumber.eq(serial_number))
                    .filter(input_points::Column::InputIndex.eq(Some(point.index.to_string())))
                    .exec(txn).await
                    .map_err(|e| AppError::DatabaseError(format!("Failed to update input point: {}", e)))?;
                Ok(1)
            }
            None => {
                // INSERT new input point
                input_points::Entity::insert(input_model)
                    .exec(txn).await
                    .map_err(|e| AppError::DatabaseError(format!("Failed to insert input point: {}", e)))?;
                Ok(1)
            }
        }
    }

    /// Sync output point data (INSERT or UPDATE)
    async fn sync_output_point_static(
        txn: &DatabaseTransaction,
        serial_number: i32,
        point: &PointData,
    ) -> Result<usize, AppError> {
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
                output_points::Entity::update(output_model)
                    .filter(output_points::Column::SerialNumber.eq(serial_number))
                    .filter(output_points::Column::OutputIndex.eq(Some(point.index.to_string())))
                    .exec(txn).await
                    .map_err(|e| AppError::DatabaseError(format!("Failed to update output point: {}", e)))?;
                Ok(1)
            }
            None => {
                // INSERT new output point
                output_points::Entity::insert(output_model)
                    .exec(txn).await
                    .map_err(|e| AppError::DatabaseError(format!("Failed to insert output point: {}", e)))?;
                Ok(1)
            }
        }
    }

    /// Sync variable point data (INSERT or UPDATE)
    async fn sync_variable_point_static(
        txn: &DatabaseTransaction,
        serial_number: i32,
        point: &PointData,
    ) -> Result<usize, AppError> {
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
                variable_points::Entity::update(variable_model)
                    .filter(variable_points::Column::SerialNumber.eq(serial_number))
                    .filter(variable_points::Column::VariableIndex.eq(Some(point.index.to_string())))
                    .exec(txn).await
                    .map_err(|e| AppError::DatabaseError(format!("Failed to update variable point: {}", e)))?;
                Ok(1)
            }
            None => {
                // INSERT new variable point
                variable_points::Entity::insert(variable_model)
                    .exec(txn).await
                    .map_err(|e| AppError::DatabaseError(format!("Failed to insert variable point: {}", e)))?;
                Ok(1)
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
