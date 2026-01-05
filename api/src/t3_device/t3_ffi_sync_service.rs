// T3000 Main Service - Primary T3000 Building Automation Integration
// This is the main service that handles all T3000 functionality:
// - FFI calls to T3000 C++ functions (T3000_GetLoggingData)
// - Real-time data synchronization
// - Device discovery and management
// - WebSocket broadcasting for live updates
// - Database synchronization to webview_t3_device.db

use crate::db_connection::establish_t3_device_connection;
use crate::entity::t3_device::{
    devices, input_points, output_points, trendlog_data_detail, trendlog_data_sync_metadata,
    variable_points,
};
use crate::database_management::data_sync_service::{DataSyncMetadataService, InsertSyncMetadataRequest};
use crate::error::AppError;
use crate::logger::ServiceLogger;
use crate::t3_device::trendlog_parent_cache::{ParentKey, TrendlogParentCache};
use once_cell::sync::OnceCell;
use sea_orm::*;
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use std::env;
use std::ffi::CString;
use std::os::raw::c_char;
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc,
};
use std::time::Duration;
use tokio::time::sleep;
use tracing::{debug, error, info, warn};
use winapi::shared::minwindef::HINSTANCE;
use winapi::um::libloaderapi::{GetProcAddress, LoadLibraryA};

// Runtime function pointer type for BacnetWebView_HandleWebViewMsg
type BacnetWebViewHandleWebViewMsgFn =
    unsafe extern "C" fn(action: i32, msg: *mut c_char, len: i32) -> i32;

// New FFI function types for accessing Device_Basic_Setting data
type GetDeviceBasicSettingsFn =
    unsafe extern "C" fn(panel_id: i32, buffer: *mut c_char, buffer_size: i32) -> i32;
type GetDeviceNetworkConfigFn =
    unsafe extern "C" fn(panel_id: i32, buffer: *mut c_char, buffer_size: i32) -> i32;

/// WebView message type enum matching C++ WEBVIEW_MESSAGE_TYPE
/// These numeric values MUST match the C++ enum exactly
#[repr(i32)]
#[derive(Debug, Clone, Copy)]
#[allow(dead_code)]
#[allow(non_camel_case_types)]
pub enum WebViewMessageType {
    GET_PANEL_DATA = 0,
    GET_INITIAL_DATA = 1,
    SAVE_GRAPHIC_DATA = 2,
    UPDATE_ENTRY = 3,
    GET_PANELS_LIST = 4, // Used for lightweight device list
    GET_PANEL_RANGE_INFO = 5,
    GET_ENTRIES = 6,
    LOAD_GRAPHIC_ENTRY = 7,
    OPEN_ENTRY_EDIT_WINDOW = 8,
    SAVE_IMAGE = 9,
    SAVE_LIBRAY_DATA = 10,
    DELETE_IMAGE = 11,
    GET_SELECTED_DEVICE_INFO = 12,
    BIND_DEVICE = 13,
    SAVE_NEW_LIBRARY_DATA = 14,
    LOGGING_DATA = 15, // Used for full device data sync
    UPDATE_WEBVIEW_LIST = 16, // Used for updating full records (inputs/outputs/variables)
    GET_WEBVIEW_LIST = 17, // Used for refreshing data from device (inputs/outputs/variables)
}

// Global function pointers - will be loaded from T3000.exe at runtime
pub static mut BACNETWEBVIEW_HANDLE_WEBVIEW_MSG_FN: Option<BacnetWebViewHandleWebViewMsgFn> = None;
static mut GET_DEVICE_BASIC_SETTINGS_FN: Option<GetDeviceBasicSettingsFn> = None;
static mut GET_DEVICE_NETWORK_CONFIG_FN: Option<GetDeviceNetworkConfigFn> = None;
static mut T3000_LOADED: bool = false;

// Load the BacnetWebView_HandleWebViewMsg function from the current executable (T3000.exe)
pub unsafe fn load_t3000_function() -> bool {
    if T3000_LOADED {
        return BACNETWEBVIEW_HANDLE_WEBVIEW_MSG_FN.is_some();
    }

    // Create logger for initialization operations
    use crate::logger::ServiceLogger;
    let mut init_logger = ServiceLogger::initialize()
        .unwrap_or_else(|_| ServiceLogger::new("fallback_init").unwrap());

    // Get the current executable's directory and look for T3000.exe there
    let current_exe_path = match env::current_exe() {
        Ok(path) => {
            if let Some(parent_dir) = path.parent() {
                parent_dir.join("T3000.exe")
            } else {
                init_logger.warn("⚠️ Could not get parent directory of current executable");
                std::path::PathBuf::from("T3000.exe") // fallback to current directory
            }
        }
        Err(e) => {
            init_logger.warn(&format!(
                "⚠️ Could not get current executable path: {}, using current directory",
                e
            ));
            std::path::PathBuf::from("T3000.exe") // fallback to current directory
        }
    };

    init_logger.info(&format!(
        "🔍 Looking for T3000.exe at: {}",
        current_exe_path.display()
    ));

    // Try to load T3000.exe from the same directory as the current executable
    if let Some(path_str) = current_exe_path.to_str() {
        let t3000_path = CString::new(path_str).unwrap();
        let t3000_module = LoadLibraryA(t3000_path.as_ptr());

        if t3000_module.is_null() {
            init_logger.warn(&format!(
                "⚠️ Could not load T3000.exe from {}, trying current process",
                path_str
            ));
            // Fallback to current process if T3000.exe can't be loaded as library
            let current_module = std::ptr::null_mut(); // NULL means current executable
            let func_name = CString::new("BacnetWebView_HandleWebViewMsg").unwrap();
            let func_ptr = GetProcAddress(current_module as HINSTANCE, func_name.as_ptr());

            if !func_ptr.is_null() {
                init_logger
                    .info("✅ Found BacnetWebView_HandleWebViewMsg function in current process");
                BACNETWEBVIEW_HANDLE_WEBVIEW_MSG_FN = Some(std::mem::transmute(func_ptr));

                // Load additional device configuration functions (optional - may not exist in older T3000 versions)
                let basic_settings_func_name = CString::new("GetDeviceBasicSettings").unwrap();
                let basic_settings_ptr = GetProcAddress(
                    current_module as HINSTANCE,
                    basic_settings_func_name.as_ptr(),
                );
                if !basic_settings_ptr.is_null() {
                    init_logger.info("✅ Found GetDeviceBasicSettings function in current process");
                    GET_DEVICE_BASIC_SETTINGS_FN = Some(std::mem::transmute(basic_settings_ptr));
                } else {
                    init_logger.warn(
                        "⚠️ GetDeviceBasicSettings function not found - using fallback method",
                    );
                }

                let network_config_func_name = CString::new("GetDeviceNetworkConfig").unwrap();
                let network_config_ptr = GetProcAddress(
                    current_module as HINSTANCE,
                    network_config_func_name.as_ptr(),
                );
                if !network_config_ptr.is_null() {
                    init_logger.info("✅ Found GetDeviceNetworkConfig function in current process");
                    GET_DEVICE_NETWORK_CONFIG_FN = Some(std::mem::transmute(network_config_ptr));
                } else {
                    init_logger.warn(
                        "⚠️ GetDeviceNetworkConfig function not found - using fallback method",
                    );
                }

                T3000_LOADED = true;
                return true;
            }
        } else {
            init_logger.info("✅ Successfully loaded T3000.exe from same directory");
            let func_name = CString::new("BacnetWebView_HandleWebViewMsg").unwrap();
            let func_ptr = GetProcAddress(t3000_module, func_name.as_ptr());

            if !func_ptr.is_null() {
                init_logger.info("✅ Found BacnetWebView_HandleWebViewMsg function in T3000.exe");
                BACNETWEBVIEW_HANDLE_WEBVIEW_MSG_FN = Some(std::mem::transmute(func_ptr));

                // Load additional device configuration functions (optional - may not exist in older T3000 versions)
                let basic_settings_func_name = CString::new("GetDeviceBasicSettings").unwrap();
                let basic_settings_ptr =
                    GetProcAddress(t3000_module, basic_settings_func_name.as_ptr());
                if !basic_settings_ptr.is_null() {
                    init_logger.info("✅ Found GetDeviceBasicSettings function in T3000.exe");
                    GET_DEVICE_BASIC_SETTINGS_FN = Some(std::mem::transmute(basic_settings_ptr));
                } else {
                    init_logger.warn(
                        "⚠️ GetDeviceBasicSettings function not found - using fallback method",
                    );
                }

                let network_config_func_name = CString::new("GetDeviceNetworkConfig").unwrap();
                let network_config_ptr =
                    GetProcAddress(t3000_module, network_config_func_name.as_ptr());
                if !network_config_ptr.is_null() {
                    init_logger.info("✅ Found GetDeviceNetworkConfig function in T3000.exe");
                    GET_DEVICE_NETWORK_CONFIG_FN = Some(std::mem::transmute(network_config_ptr));
                } else {
                    init_logger.warn(
                        "⚠️ GetDeviceNetworkConfig function not found - using fallback method",
                    );
                }

                T3000_LOADED = true;
                return true;
            } else {
                init_logger
                    .error("❌ BacnetWebView_HandleWebViewMsg function not found in T3000.exe");
            }
        }
    }

    T3000_LOADED = true;
    false
}

// Safe wrapper to call BacnetWebView_HandleWebViewMsg
fn call_handle_webview_msg(action: i32, buffer: &mut [u8]) -> Result<i32, String> {
    unsafe {
        if !load_t3000_function() {
            return Err(
                "BacnetWebView_HandleWebViewMsg function not found in T3000.exe".to_string(),
            );
        }

        if let Some(func) = BACNETWEBVIEW_HANDLE_WEBVIEW_MSG_FN {
            let result = func(
                action,
                buffer.as_mut_ptr() as *mut c_char,
                buffer.len() as i32,
            );
            Ok(result)
        } else {
            Err("BacnetWebView_HandleWebViewMsg function not loaded".to_string())
        }
    }
}

// Safe wrapper to call GetDeviceBasicSettings (new function)
fn call_get_device_basic_settings(panel_id: i32, buffer: &mut [u8]) -> Result<i32, String> {
    unsafe {
        if !load_t3000_function() {
            return Err("T3000 functions not loaded".to_string());
        }

        if let Some(func) = GET_DEVICE_BASIC_SETTINGS_FN {
            let result = func(
                panel_id,
                buffer.as_mut_ptr() as *mut c_char,
                buffer.len() as i32,
            );
            Ok(result)
        } else {
            // Fallback: not an error, just means function not available in this T3000 version
            Ok(-1) // Signal that function is not available
        }
    }
}

// Safe wrapper to call GetDeviceNetworkConfig (new function)
fn call_get_device_network_config(panel_id: i32, buffer: &mut [u8]) -> Result<i32, String> {
    unsafe {
        if !load_t3000_function() {
            return Err("T3000 functions not loaded".to_string());
        }

        if let Some(func) = GET_DEVICE_NETWORK_CONFIG_FN {
            let result = func(
                panel_id,
                buffer.as_mut_ptr() as *mut c_char,
                buffer.len() as i32,
            );
            Ok(result)
        } else {
            // Fallback: not an error, just means function not available in this T3000 version
            Ok(-1) // Signal that function is not available
        }
    }
}

/// Global main service instance
static MAIN_SERVICE: OnceCell<Arc<T3000MainService>> = OnceCell::new();

/// Global parent cache for trendlog split-table optimization
static TRENDLOG_PARENT_CACHE: OnceCell<TrendlogParentCache> = OnceCell::new();

/// Get or initialize the trendlog parent cache
fn get_trendlog_cache() -> &'static TrendlogParentCache {
    TRENDLOG_PARENT_CACHE.get_or_init(|| TrendlogParentCache::new(1000))
}

// ═══════════════════════════════════════════════════════════════════════════
// TWO-TIER SYNC STATE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════
use chrono::{DateTime, Utc};
use tokio::sync::RwLock;

lazy_static::lazy_static! {
    /// Cached device list from last GET_PANELS_LIST call
    /// Used for quick sync cycles to avoid unnecessary GET_PANELS_LIST calls
    static ref CACHED_DEVICE_LIST: Arc<RwLock<Option<Vec<PanelInfo>>>> =
        Arc::new(RwLock::new(None));

    /// Timestamp of last GET_PANELS_LIST rediscovery
    /// Used to determine when to refresh device list
    static ref LAST_REDISCOVER_TIME: Arc<RwLock<Option<DateTime<Utc>>>> =
        Arc::new(RwLock::new(None));

    /// Rediscovery interval in seconds (loaded from DATABASE_CONFIG)
    /// Default: 3600 (1 hour)
    static ref REDISCOVER_INTERVAL_SECS: Arc<RwLock<u64>> =
        Arc::new(RwLock::new(3600));
}

/// Configuration for the main T3000 service
#[derive(Debug, Clone)]
pub struct T3000MainConfig {
    pub sync_interval_secs: u64, // Default: 300 (5 minutes)
    pub timeout_seconds: u64,    // FFI call timeout: 30 seconds
    pub retry_attempts: u32,     // Retry failed FFI calls: 3 times
    pub auto_start: bool,        // Start sync service on creation: true
}

impl Default for T3000MainConfig {
    fn default() -> Self {
        Self {
            sync_interval_secs: 900, // 15 minutes (matches database default)
            timeout_seconds: 30,     // 30 seconds FFI timeout
            retry_attempts: 3,
            auto_start: true,
        }
    }
}

/// PanelInfo structure for lightweight device list from GET_PANELS_LIST
/// Used to get list of available devices before loading full LOGGING_DATA
#[derive(Debug, Clone)]
struct PanelInfo {
    panel_number: i32,
    serial_number: i32,
    panel_name: String,
}

/// Device information structure from T3000 LOGGING_DATA JSON
/// Extended with complete network configuration fields
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceInfo {
    // Original LOGGING_DATA fields
    pub panel_id: i32,
    pub panel_name: String,
    pub panel_serial_number: i32,
    pub panel_ipaddress: String,
    pub input_logging_time: String,
    pub output_logging_time: String,
    pub variable_logging_time: String,

    // Extended network configuration fields from Device_Basic_Setting
    pub ip_address: Option<String>,      // from reg.ip_addr[4]
    pub port: Option<i32>,               // from reg.panel_number or modbus_port
    pub bacnet_mstp_mac_id: Option<i32>, // from reg.mstp_id or object_instance
    pub modbus_address: Option<i32>,     // from reg.modbus_id
    pub pc_ip_address: Option<String>,   // from network configuration
    pub modbus_port: Option<i32>,        // from reg.modbus_port
    pub bacnet_ip_port: Option<i32>,     // from BACnet IP configuration
    pub show_label_name: Option<String>, // from panel settings
    pub connection_type: Option<String>, // from communication type
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
    pub timestamp: String,     // ISO 8601 timestamp from T3000
    pub label: Option<String>, // Direct label field from JSON

    // INPUT specific fields
    pub decom: Option<String>,
    pub sub_product: Option<i32>,
    pub sub_id: Option<i32>,
    pub sub_panel: Option<i32>,
    pub network_number: Option<i32>,
    pub description: Option<String>,
    pub digital_analog: Option<i32>,
    pub filter: Option<i32>,
    pub control: Option<i32>,
    pub command: Option<String>,
    pub id: Option<String>,
    pub calibration_l: Option<f64>,

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
    #[allow(dead_code)]
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
        if self
            .is_running
            .compare_exchange(false, true, Ordering::SeqCst, Ordering::Relaxed)
            .is_err()
        {
            return Err(AppError::ServiceError(
                "Logging data service is already running".to_string(),
            ));
        }

        // Use unified logging - remove duplicate console logs
        use crate::logger::ServiceLogger;
        let mut logger =
            ServiceLogger::ffi().unwrap_or_else(|_| ServiceLogger::new("fallback_ffi").unwrap());

        logger.info(&format!(
            "🚀 Starting T3000 LOGGING_DATA sync service with {}-second intervals",
            self.config.sync_interval_secs
        ));
        logger.info("⚡ Running immediate sync on startup, then continuing with periodic sync...");

        let mut config = self.config.clone(); // Make config mutable for dynamic reload
        let is_running = self.is_running.clone();

        tokio::spawn(async move {
            // Create logger for the spawned task
            let mut task_logger = ServiceLogger::ffi()
                .unwrap_or_else(|_| ServiceLogger::new("fallback_ffi").unwrap());

            // 🆕 DELAY: Wait 10 seconds on first startup to let T3000.exe fully initialize
            task_logger.info("⏱️ Waiting 10 seconds for T3000.exe to fully initialize...");
            sleep(Duration::from_secs(10)).await;
            task_logger.info("✅ Initialization delay completed, starting sync...");

            // Run immediate sync on startup with full rediscovery
            task_logger.info("🏃 Performing immediate startup sync with full rediscovery...");
            if let Err(e) = Self::sync_logging_data_static(config.clone()).await {
                task_logger.error(&format!("❌ Immediate startup sync failed: {}", e));
                // Also log critical errors to Initialize category
                if let Ok(mut init_logger) = ServiceLogger::initialize() {
                    init_logger.error(&format!("Immediate startup sync failed: {}", e));
                }
            } else {
                task_logger.info("✅ Immediate startup sync completed successfully");
            }

            // Sync trendlog configurations for all devices (ONE-TIME at startup)
            task_logger.info("📊 Syncing trendlog configurations for all devices...");
            if let Err(e) = Self::sync_all_trendlog_configs().await {
                task_logger.error(&format!("❌ Trendlog config sync failed: {}", e));
            } else {
                task_logger.info("✅ Trendlog config sync completed successfully");
            }

            // Continue with periodic sync loop (TWO-TIER sync)
            while is_running.load(Ordering::Relaxed) {
                // Reload sync intervals from database before each sleep cycle (dynamic configuration)
                let current_sync_interval = Self::reload_sync_interval_from_db()
                    .await
                    .unwrap_or(config.sync_interval_secs);
                let current_rediscover_interval = Self::reload_rediscover_interval_from_db()
                    .await
                    .unwrap_or(3600);

                // Log if sync interval changed
                if current_sync_interval != config.sync_interval_secs {
                    task_logger.info(&format!(
                        "🔄 Sync interval updated: {}s ({} min) → {}s ({} min)",
                        config.sync_interval_secs,
                        config.sync_interval_secs / 60,
                        current_sync_interval,
                        current_sync_interval / 60
                    ));
                    config.sync_interval_secs = current_sync_interval;
                }

                // Update rediscover interval in state
                {
                    let mut interval = REDISCOVER_INTERVAL_SECS.write().await;
                    if *interval != current_rediscover_interval {
                        task_logger.info(&format!(
                            "🔄 Rediscover interval updated: {}s ({} min) → {}s ({} min)",
                            *interval,
                            *interval / 60,
                            current_rediscover_interval,
                            current_rediscover_interval / 60
                        ));
                        *interval = current_rediscover_interval;
                    }
                }

                // Sleep until next sync interval
                task_logger.info(&format!(
                    "⏰ Waiting {} seconds until next sync cycle",
                    config.sync_interval_secs
                ));
                sleep(Duration::from_secs(config.sync_interval_secs)).await;

                // Perform periodic logging data sync
                if is_running.load(Ordering::Relaxed) {
                    if let Err(e) = Self::sync_logging_data_static(config.clone()).await {
                        task_logger.error(&format!("❌ Periodic sync failed: {}", e));
                    }
                }
            }

            task_logger.info("🛑 T3000 LOGGING_DATA sync service stopped");
        });

        Ok(())
    }

    /// Stop the periodic sync service
    pub fn stop_sync_service(&self) {
        self.is_running.store(false, Ordering::Relaxed);

        // Use unified logging
        let mut logger =
            ServiceLogger::ffi().unwrap_or_else(|_| ServiceLogger::new("fallback_ffi").unwrap());
        logger.info("Stopping T3000 LOGGING_DATA sync service");
    }

    /// Test the direct T3000 HandleWebViewMsg integration
    pub async fn test_direct_integration(&self) -> Result<String, AppError> {
        let mut logger =
            ServiceLogger::ffi().unwrap_or_else(|_| ServiceLogger::new("fallback_ffi").unwrap());
        logger.info("🧪 Testing direct T3000 HandleWebViewMsg integration");

        // Call the direct FFI function with default values (panel 1, serial 0 means fetch first device)
        let result = Self::get_logging_data_via_direct_ffi(&self.config, 1, 0).await?;

        // Log test results
        let is_real_data =
            !result.contains("Test Device") && !result.contains("test") && !result.contains("mock");

        if is_real_data {
            logger.info("🎉 SUCCESS: Direct integration returned REAL device data!");
        } else {
            logger.warn("⚠️  WARNING: Direct integration still returns test data");
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

    /// Reload sync interval from APPLICATION_CONFIG table (dynamic configuration)
    /// This allows changing the sync interval without restarting the service
    async fn reload_sync_interval_from_db() -> Result<u64, AppError> {
        use crate::entity::application_settings;

        let db = establish_t3_device_connection().await?;

        // Query APPLICATION_CONFIG for ffi.sync_interval_secs
        let config = application_settings::Entity::find()
            .filter(application_settings::Column::ConfigKey.eq("ffi.sync_interval_secs"))
            .one(&db)
            .await
            .map_err(|e| {
                AppError::DatabaseError(format!("Failed to query sync interval: {}", e))
            })?;

        match config {
            Some(cfg) => {
                // Parse config_value as JSON to handle both Number and String formats
                // New format: 300 (JSON number)
                // Old format: "300" (JSON string with quotes)
                let json_value: serde_json::Value = serde_json::from_str(&cfg.config_value)
                    .unwrap_or_else(|_| {
                        // Fallback: treat as plain string if not valid JSON
                        serde_json::Value::String(cfg.config_value.clone())
                    });

                let interval = match json_value {
                    serde_json::Value::Number(n) => n
                        .as_u64()
                        .ok_or_else(|| AppError::ParseError("Invalid number format".to_string()))?,
                    serde_json::Value::String(s) => s.parse::<u64>().map_err(|_| {
                        AppError::ParseError(format!("Invalid string number: {}", s))
                    })?,
                    _ => {
                        return Err(AppError::ParseError(
                            "Invalid config value type".to_string(),
                        ));
                    }
                };

                Ok(interval)
            }
            None => {
                // Config not found, return default
                Ok(300) // 5 minutes default
            }
        }
    }

    async fn reload_rediscover_interval_from_db() -> Result<u64, AppError> {
        use crate::entity::application_settings;

        let db = establish_t3_device_connection().await?;

        // Query APPLICATION_CONFIG for rediscover.interval_secs
        let config = application_settings::Entity::find()
            .filter(application_settings::Column::ConfigKey.eq("rediscover.interval_secs"))
            .one(&db)
            .await
            .map_err(|e| {
                AppError::DatabaseError(format!("Failed to query rediscover interval: {}", e))
            })?;

        match config {
            Some(cfg) => {
                // Parse config_value as JSON to handle both Number and String formats
                // New format: 3600 (JSON number)
                // Old format: "3600" (JSON string with quotes)
                let json_value: serde_json::Value = serde_json::from_str(&cfg.config_value)
                    .unwrap_or_else(|_| {
                        // Fallback: treat as plain string if not valid JSON
                        serde_json::Value::String(cfg.config_value.clone())
                    });

                let interval = match json_value {
                    serde_json::Value::Number(n) => n
                        .as_u64()
                        .ok_or_else(|| AppError::ParseError("Invalid number format".to_string()))?,
                    serde_json::Value::String(s) => s.parse::<u64>().map_err(|_| {
                        AppError::ParseError(format!("Invalid string number: {}", s))
                    })?,
                    _ => {
                        return Err(AppError::ParseError(
                            "Invalid config value type".to_string(),
                        ));
                    }
                };

                Ok(interval)
            }
            None => {
                // Config not found, return default
                Ok(3600) // 1 hour default
            }
        }
    }

    /// Check if we should perform a full rediscovery (GET_PANELS_LIST)
    /// Returns true if:
    /// - Never performed rediscovery before (LAST_REDISCOVER_TIME is None)
    /// - Elapsed time since last rediscovery >= REDISCOVER_INTERVAL_SECS
    async fn should_rediscover() -> bool {
        let last_rediscover = LAST_REDISCOVER_TIME.read().await;
        let interval_secs = *REDISCOVER_INTERVAL_SECS.read().await;

        match *last_rediscover {
            None => {
                // Never performed rediscovery, do it now
                true
            }
            Some(last_time) => {
                let now = Utc::now();
                let elapsed_secs = (now - last_time).num_seconds() as u64;

                elapsed_secs >= interval_secs
            }
        }
    }

    /// Update the cached device list after a successful GET_PANELS_LIST operation
    async fn update_cached_device_list(device_list: Vec<PanelInfo>) {
        let mut cache = CACHED_DEVICE_LIST.write().await;
        *cache = Some(device_list);
    }

    /// Get the cached device list
    /// Returns error if cache is empty (rediscovery needed)
    async fn get_cached_device_list() -> Result<Vec<PanelInfo>, AppError> {
        let cache = CACHED_DEVICE_LIST.read().await;
        match cache.as_ref() {
            Some(list) => Ok(list.clone()),
            None => Err(AppError::NotFound(
                "Device list cache is empty, rediscovery required".to_string(),
            )),
        }
    }

    /// Update the last rediscovery timestamp to current time
    async fn update_last_rediscover_time() {
        let mut last_time = LAST_REDISCOVER_TIME.write().await;
        *last_time = Some(Utc::now());
    }
    /// Sync trendlog configurations for all devices (ONE-TIME operation)
    /// This calls the NEW BacnetWebView_GetTrendlogList/Entry C++ export functions
    async fn sync_all_trendlog_configs() -> Result<(), AppError> {
        use crate::t3_device::trendlog_monitor_service::TrendlogMonitorService;
        use std::sync::Arc;
        use tokio::sync::Mutex;
        use tokio::time::{sleep, Duration};

        let mut sync_logger =
            ServiceLogger::ffi().unwrap_or_else(|_| ServiceLogger::new("fallback_ffi").unwrap());

        sync_logger.info("📊 Starting one-time trendlog configuration sync for all devices...");

        // TIMING FIX: Wait for device data to be loaded into g_monitor_data before syncing
        // This ensures g_monitor_data[panel_id] has real device data (not "Monitor 1" defaults)
        const DEVICE_DATA_LOAD_DELAY_SECS: u64 = 5;
        sync_logger.info(&format!(
            "⏳ Waiting {} seconds for device data to load into g_monitor_data...",
            DEVICE_DATA_LOAD_DELAY_SECS
        ));
        sleep(Duration::from_secs(DEVICE_DATA_LOAD_DELAY_SECS)).await;
        sync_logger.info("✅ Device data load delay complete, proceeding with trendlog sync");

        // Get database connection
        let db = establish_t3_device_connection().await?;

        // Get all devices from database
        let all_devices = devices::Entity::find()
            .all(&db)
            .await
            .map_err(|e| AppError::DatabaseError(format!("Failed to query devices: {}", e)))?;

        sync_logger.info(&format!(
            "📱 Found {} devices to sync trendlog configs",
            all_devices.len()
        ));

        // Create trendlog monitor service
        let db_arc = Arc::new(Mutex::new(db));
        let trendlog_service = TrendlogMonitorService::new(db_arc);

        let mut total_synced = 0;
        let mut total_failed = 0;

        // Sync trendlog config for each device
        for device in all_devices {
            let panel_id = device.panel_id.unwrap_or(0);
            let serial_number = device.serial_number;

            if panel_id == 0 {
                sync_logger.warn(&format!(
                    "⚠️ Skipping device {} - invalid panel_id",
                    serial_number
                ));
                continue;
            }

            sync_logger.info(&format!(
                "🔄 Syncing trendlog config for device {} (panel_id: {})",
                serial_number, panel_id
            ));

            // Small delay between devices to ensure data is available
            const PER_DEVICE_DELAY_MS: u64 = 500;
            sleep(Duration::from_millis(PER_DEVICE_DELAY_MS)).await;

            match trendlog_service
                .sync_trendlogs_to_database(panel_id, serial_number)
                .await
            {
                Ok(count) => {
                    total_synced += count;
                    sync_logger.info(&format!(
                        "✅ Device {} - synced {} trendlogs",
                        serial_number, count
                    ));
                }
                Err(e) => {
                    total_failed += 1;
                    sync_logger.warn(&format!(
                        "⚠️ Device {} - trendlog sync failed: {}",
                        serial_number, e
                    ));
                }
            }
        }

        sync_logger.info(&format!(
            "🎉 Trendlog config sync complete - {} trendlogs synced, {} devices failed",
            total_synced, total_failed
        ));

        Ok(())
    }

    /// Populate extended device information using additional FFI calls
    /// This function tries to get complete device configuration from g_Device_Basic_Setting
    fn populate_extended_device_info(device_info: &mut DeviceInfo) {
        let panel_id = device_info.panel_id;

        // Try to get basic device settings using the new FFI function
        let mut buffer = vec![0u8; 4096];
        match call_get_device_basic_settings(panel_id, &mut buffer) {
            Ok(result) if result > 0 => {
                // Function succeeded - parse the JSON response
                if let Ok(settings_json) = String::from_utf8(buffer[..result as usize].to_vec()) {
                    if let Ok(settings_value) = serde_json::from_str::<JsonValue>(&settings_json) {
                        // Use FFI logger for this operation
                        let mut ffi_logger = ServiceLogger::ffi()
                            .unwrap_or_else(|_| ServiceLogger::new("fallback_ffi").unwrap());
                        ffi_logger.info(&format!(
                            "✅ Got extended device settings for panel {}",
                            panel_id
                        ));

                        // Parse the Device_Basic_Setting fields and populate our extended info
                        device_info.ip_address = settings_value
                            .get("ip_address")
                            .and_then(|v| v.as_str())
                            .map(|s| s.to_string());
                        device_info.modbus_address = settings_value
                            .get("modbus_id")
                            .and_then(|v| v.as_i64())
                            .map(|v| v as i32);
                        device_info.modbus_port = settings_value
                            .get("modbus_port")
                            .and_then(|v| v.as_i64())
                            .map(|v| v as i32);
                        device_info.bacnet_mstp_mac_id = settings_value
                            .get("mstp_id")
                            .and_then(|v| v.as_i64())
                            .map(|v| v as i32);
                        device_info.port = settings_value
                            .get("panel_number")
                            .and_then(|v| v.as_i64())
                            .map(|v| v as i32);
                        device_info.show_label_name = settings_value
                            .get("panel_name")
                            .and_then(|v| v.as_str())
                            .map(|s| s.to_string());

                        // Try to get BACnet object instance for BACnet devices
                        if let Some(obj_instance) = settings_value
                            .get("object_instance")
                            .and_then(|v| v.as_i64())
                        {
                            if device_info.bacnet_mstp_mac_id.is_none() {
                                device_info.bacnet_mstp_mac_id = Some(obj_instance as i32);
                            }
                        }
                    } else {
                        let mut ffi_logger = ServiceLogger::ffi()
                            .unwrap_or_else(|_| ServiceLogger::new("fallback_ffi").unwrap());
                        ffi_logger.warn(&format!(
                            "⚠️ Failed to parse device settings JSON for panel {}",
                            panel_id
                        ));
                    }
                } else {
                    let mut ffi_logger = ServiceLogger::ffi()
                        .unwrap_or_else(|_| ServiceLogger::new("fallback_ffi").unwrap());
                    ffi_logger.warn(&format!(
                        "⚠️ Invalid UTF-8 in device settings response for panel {}",
                        panel_id
                    ));
                }
            }
            Ok(_) => {
                // Function not available or returned no data - this is OK for older T3000 versions
                debug!("📡 Extended device settings function not available for panel {} - using fallback", panel_id);

                // Fallback: populate what we can from existing LOGGING_DATA
                device_info.ip_address = Some(device_info.panel_ipaddress.clone());
                device_info.port = Some(device_info.panel_id);
                device_info.show_label_name = Some(device_info.panel_name.clone());
                device_info.connection_type = Some("LOGGING_DATA".to_string()); // Indicate data source
            }
            Err(e) => {
                let mut ffi_logger = ServiceLogger::ffi()
                    .unwrap_or_else(|_| ServiceLogger::new("fallback_ffi").unwrap());
                ffi_logger.warn(&format!(
                    "⚠️ Failed to get device settings for panel {}: {}",
                    panel_id, e
                ));

                // Fallback: populate what we can from existing LOGGING_DATA
                device_info.ip_address = Some(device_info.panel_ipaddress.clone());
                device_info.port = Some(device_info.panel_id);
                device_info.show_label_name = Some(device_info.panel_name.clone());
                device_info.connection_type = Some("FALLBACK".to_string()); // Indicate fallback data source
            }
        }

        // Try to get network configuration using the second new FFI function
        buffer.fill(0);
        match call_get_device_network_config(panel_id, &mut buffer) {
            Ok(result) if result > 0 => {
                if let Ok(network_json) = String::from_utf8(buffer[..result as usize].to_vec()) {
                    if let Ok(network_value) = serde_json::from_str::<JsonValue>(&network_json) {
                        let mut ffi_logger = ServiceLogger::ffi()
                            .unwrap_or_else(|_| ServiceLogger::new("fallback_ffi").unwrap());
                        ffi_logger.info(&format!(
                            "✅ Got network configuration for panel {}",
                            panel_id
                        ));

                        // Parse network configuration fields
                        device_info.pc_ip_address = network_value
                            .get("pc_ip_address")
                            .and_then(|v| v.as_str())
                            .map(|s| s.to_string());
                        device_info.bacnet_ip_port = network_value
                            .get("bacnet_ip_port")
                            .and_then(|v| v.as_i64())
                            .map(|v| v as i32);

                        // Update connection type if available
                        if let Some(conn_type) = network_value
                            .get("connection_type")
                            .and_then(|v| v.as_str())
                        {
                            device_info.connection_type = Some(conn_type.to_string());
                        }
                    }
                }
            }
            Ok(_) => {
                debug!("📡 Network configuration function not available for panel {} - OK for older T3000", panel_id);
            }
            Err(e) => {
                debug!(
                    "📡 Network configuration error for panel {}: {} - OK for older T3000",
                    panel_id, e
                );
            }
        }

        let mut ffi_logger =
            ServiceLogger::ffi().unwrap_or_else(|_| ServiceLogger::new("fallback_ffi").unwrap());
        ffi_logger.info(&format!("🔧 Extended device info populated for panel {} - IP: {:?}, Port: {:?}, Modbus: {:?}, BACnet: {:?}",
              panel_id, device_info.ip_address, device_info.port, device_info.modbus_address, device_info.bacnet_mstp_mac_id));
    }

    /// Static method to sync logging data (for use in spawned tasks)
    /// Implements TWO-TIER sync strategy:
    /// - QUICK SYNC: Use cached device list, only call LOGGING_DATA (every ffi.sync_interval_secs)
    /// - FULL REDISCOVERY: Call GET_PANELS_LIST + LOGGING_DATA (every rediscover.interval_secs)
    async fn sync_logging_data_static(config: T3000MainConfig) -> Result<(), AppError> {
        // Create logger for this sync operation
        let mut sync_logger =
            ServiceLogger::ffi().unwrap_or_else(|_| ServiceLogger::new("fallback_ffi").unwrap());

        sync_logger.info(&format!(
            "⚙️ Config: Timeout {}s, Retry {}x",
            config.timeout_seconds, config.retry_attempts
        ));

        let db = establish_t3_device_connection().await.map_err(|e| {
            sync_logger.error(&format!("❌ Database connection failed: {}", e));
            e
        })?;

        sync_logger.info("✅ Database connection established");

        // STEP 1: Decide whether to perform full rediscovery or use cache
        let should_do_rediscovery = Self::should_rediscover().await;
        let panels: Vec<PanelInfo>;

        if should_do_rediscovery {
            sync_logger
                .info("🔍 FULL REDISCOVERY: Calling GET_PANELS_LIST to refresh device list...");

            // Get lightweight device list via GET_PANELS_LIST (Action 4)
            panels = Self::get_panels_list_via_ffi().await?;

            sync_logger.info(&format!(
                "📋 Found {} devices via GET_PANELS_LIST",
                panels.len()
            ));

            if panels.is_empty() {
                sync_logger.warn("⚠️ No devices found in GET_PANELS_LIST - skipping sync cycle");
                return Ok(());
            }

            // Update cache with fresh device list
            Self::update_cached_device_list(panels.clone()).await;
            Self::update_last_rediscover_time().await;

            sync_logger.info("✅ Device list cache updated");

            // Create GET_PANELS_LIST sync metadata record
            let rediscover_start_time = chrono::Utc::now();
            let rediscover_metadata = trendlog_data_sync_metadata::ActiveModel {
                sync_time_fmt: Set(rediscover_start_time
                    .format("%Y-%m-%d %H:%M:%S")
                    .to_string()),
                message_type: Set("GET_PANELS_LIST".to_string()),
                panel_id: Set(None),      // NULL = all devices
                serial_number: Set(None), // NULL = all devices
                records_inserted: Set(Some(panels.len() as i32)),
                sync_interval: Set(*REDISCOVER_INTERVAL_SECS.read().await as i32),
                success: Set(Some(1)),
                error_message: Set(None),
                ..Default::default()
            };

            trendlog_data_sync_metadata::Entity::insert(rediscover_metadata)
                .exec(&db)
                .await
                .map_err(|e| {
                    sync_logger.error(&format!(
                        "❌ Failed to create GET_PANELS_LIST metadata: {}",
                        e
                    ));
                    AppError::DatabaseError(format!(
                        "GET_PANELS_LIST metadata creation failed: {}",
                        e
                    ))
                })?;

            sync_logger.info("✅ GET_PANELS_LIST metadata record created");

            // Also insert into new DATA_SYNC_METADATA table
            let new_metadata_request = InsertSyncMetadataRequest {
                data_type: "GET_PANELS_LIST".to_string(),
                serial_number: "ALL".to_string(),
                panel_id: None,
                records_synced: panels.len() as i32,
                sync_method: "FFI_BACKEND".to_string(),
                success: true,
                error_message: None,
            };

            if let Err(e) = DataSyncMetadataService::insert_sync_metadata(&db, new_metadata_request).await {
                sync_logger.error(&format!("❌ Failed to insert GET_PANELS_LIST to DATA_SYNC_METADATA: {}", e));
            }
        } else {
            sync_logger
                .info("⚡ QUICK SYNC: Using cached device list, skipping GET_PANELS_LIST...");

            // Try to get cached device list
            match Self::get_cached_device_list().await {
                Ok(cached_panels) => {
                    panels = cached_panels;
                    sync_logger.info(&format!("📋 Using {} devices from cache", panels.len()));
                }
                Err(_) => {
                    // Cache is empty (should not happen after first run, but handle gracefully)
                    sync_logger.warn("⚠️ Cache is empty, performing forced rediscovery...");
                    panels = Self::get_panels_list_via_ffi().await?;

                    if panels.is_empty() {
                        sync_logger.warn("⚠️ No devices found - skipping sync cycle");
                        return Ok(());
                    }

                    Self::update_cached_device_list(panels.clone()).await;
                    Self::update_last_rediscover_time().await;
                    sync_logger.info("✅ Cache initialized with forced rediscovery");
                }
            }
        } // Log device list for tracking
        for (idx, panel) in panels.iter().enumerate() {
            sync_logger.info(&format!(
                "  Device {}/{}: Panel #{}, SN: {}, Name: '{}'",
                idx + 1,
                panels.len(),
                panel.panel_number,
                panel.serial_number,
                panel.panel_name
            ));
        }

        sync_logger.info("💾 Database transaction started");

        // Start database transaction
        let txn = db.begin().await.map_err(|e| {
            sync_logger.error(&format!("❌ Failed to start transaction: {}", e));
            AppError::DatabaseError(format!("Transaction start failed: {}", e))
        })?;

        // Create sync metadata record for this LOGGING_DATA sync operation
        let sync_start_time = chrono::Utc::now();
        let sync_metadata = trendlog_data_sync_metadata::ActiveModel {
            sync_time_fmt: Set(sync_start_time.format("%Y-%m-%d %H:%M:%S").to_string()),
            message_type: Set("LOGGING_DATA".to_string()),
            panel_id: Set(None),            // NULL = all devices
            serial_number: Set(None),       // NULL = all devices
            records_inserted: Set(Some(0)), // Will update later
            sync_interval: Set(config.sync_interval_secs as i32),
            success: Set(Some(1)), // Assume success, will update if error
            error_message: Set(None),
            ..Default::default()
        };

        let sync_metadata_result = trendlog_data_sync_metadata::Entity::insert(sync_metadata)
            .exec(&txn)
            .await
            .map_err(|e| {
                sync_logger.error(&format!("❌ Failed to create sync metadata: {}", e));
                AppError::DatabaseError(format!("Sync metadata creation failed: {}", e))
            })?;

        let sync_metadata_id = sync_metadata_result.last_insert_id;
        sync_logger.info(&format!(
            "📋 LOGGING_DATA sync metadata created - ID: {}",
            sync_metadata_id
        ));

        // Also insert into new DATA_SYNC_METADATA table for sync cycle start
        // Note: Using txn.into_transaction_log() for inline insertion to avoid database lock
        let now = chrono::Utc::now();
        let sync_time = now.timestamp();
        let sync_time_fmt = now.format("%Y-%m-%d %H:%M:%S").to_string();

        let cycle_metadata = crate::entity::data_sync_metadata::ActiveModel {
            sync_time: Set(sync_time),
            sync_time_fmt: Set(sync_time_fmt.clone()),
            data_type: Set("LOGGING_DATA_CYCLE".to_string()),
            serial_number: Set("ALL".to_string()),
            panel_id: Set(None),
            records_synced: Set(0),
            sync_method: Set("FFI_BACKEND".to_string()),
            success: Set(1),
            error_message: Set(None),
            created_at: Set(sync_time),
            ..Default::default()
        };

        if let Err(e) = crate::entity::data_sync_metadata::Entity::insert(cycle_metadata)
            .exec(&txn)
            .await
        {
            sync_logger.error(&format!("❌ Failed to insert LOGGING_DATA_CYCLE to DATA_SYNC_METADATA: {}", e));
        }

        // STEP 2: Process each device sequentially with per-device LOGGING_DATA calls
        let total_devices = panels.len();
        let mut successful_devices = 0;
        let mut failed_devices = 0;
        let mut skipped_devices = 0;

        for (device_index, panel_info) in panels.iter().enumerate() {
            let device_start_time = std::time::Instant::now();

            sync_logger.info(&format!(
                "📱 ========== Device {}/{} START ==========",
                device_index + 1,
                total_devices
            ));
            sync_logger.info(&format!(
                "📱 Device: Panel #{}, SN: {}, Name: '{}'",
                panel_info.panel_number, panel_info.serial_number, panel_info.panel_name
            ));

            // Call LOGGING_DATA for this device (C++ will filter based on g_logging_time validation)
            sync_logger.info(&format!(
                "🔄 Calling LOGGING_DATA (Action 15) for device {}...",
                panel_info.serial_number
            ));

            let json_data = match Self::get_logging_data_via_direct_ffi(
                &config,
                panel_info.panel_number,
                panel_info.serial_number,
            )
            .await
            {
                Ok(data) => data,
                Err(e) => {
                    sync_logger.error(&format!(
                        "❌ LOGGING_DATA FFI call failed for device {} - Error: {}",
                        panel_info.serial_number, e
                    ));
                    failed_devices += 1;

                    // Log device failure and continue to next device (Option A: Skip on error)
                    sync_logger.info(&format!(
                        "⏭️  Skipping device {} due to FFI error, continuing with next device",
                        panel_info.serial_number
                    ));
                    continue;
                }
            };

            // Parse response - might contain 0-1 devices depending on C++ validation
            let logging_response = match Self::parse_logging_response(&json_data) {
                Ok(response) => response,
                Err(e) => {
                    sync_logger.error(&format!(
                        "❌ JSON parse failed for device {} - Error: {}",
                        panel_info.serial_number, e
                    ));
                    failed_devices += 1;

                    // Log parse failure and continue to next device
                    sync_logger.info(&format!(
                        "⏭️  Skipping device {} due to parse error, continuing with next device",
                        panel_info.serial_number
                    ));
                    continue;
                }
            };

            sync_logger.info(&format!(
                "� LOGGING_DATA returned {} device(s), {} characters",
                logging_response.devices.len(),
                json_data.len()
            ));

            // Handle empty response (C++ validation failed - device not ready)
            if logging_response.devices.is_empty() {
                sync_logger.warn(&format!("⚠️ Device {} returned 0 devices (C++ validation failed - basic_setting_status != 1 or g_logging_time mismatch)",
                    panel_info.serial_number));
                sync_logger.warn(&format!(
                    "⏭️  Skipping device {} - not ready for logging, will retry next sync cycle",
                    panel_info.serial_number
                ));
                skipped_devices += 1;
                continue;
            }

            // Process device(s) from response (usually 1 device, but handle multiple just in case)
            for device_with_points in logging_response.devices.iter() {
                let serial_number = device_with_points.device_info.panel_serial_number;

                sync_logger.info(&format!(
                    "📝 Processing device data - Serial: {}, Name: '{}'",
                    serial_number, device_with_points.device_info.panel_name
                ));

                // Validate serial number - skip devices with invalid SerialNumber=0
                if serial_number == 0 {
                    sync_logger.warn(&format!(
                        "⚠️ SKIPPING device with invalid SerialNumber=0 - Name: '{}', IP: '{}', Panel ID: {}",
                        device_with_points.device_info.panel_name,
                        device_with_points.device_info.ip_address.as_ref().unwrap_or(&"unknown".to_string()),
                        device_with_points.device_info.panel_id
                    ));
                    sync_logger.warn("⚠️ This indicates missing or invalid panel_serial_number in JSON response - check C++ HandleWebViewMsg implementation");
                    sync_logger.error(&format!(
                        "🔍 DEBUG INFO for invalid device - Expected Serial: {} (from GET_PANELS_LIST), Got: {} (from LOGGING_DATA)",
                        panel_info.serial_number, serial_number
                    ));
                    sync_logger.error(&format!(
                        "💡 HINT: Device with Panel#{} probably has records in INPUTS/OUTPUTS/VARIABLES tables but won't show sync status due to SerialNumber=0",
                        device_with_points.device_info.panel_id
                    ));
                    sync_logger.error(&format!(
                        "💡 FIX: Update C++ code to properly set panel_serial_number field in LOGGING_DATA response for Panel#{}",
                        device_with_points.device_info.panel_id
                    ));
                    skipped_devices += 1;
                    continue;
                }

                // UPSERT device basic info (INSERT or UPDATE)
                sync_logger.info(&format!(
                    "📝 Syncing device basic info - Serial: {}, Name: {}",
                    serial_number, &device_with_points.device_info.panel_name
                ));

                if let Err(e) =
                    Self::sync_device_basic_info(&txn, &device_with_points.device_info).await
                {
                    sync_logger.error(&format!(
                        "❌ Device basic info sync failed - Serial: {}, Error: {}",
                        serial_number, e
                    ));
                    failed_devices += 1;
                    continue;
                }
                sync_logger.info(&format!(
                    "✅ Device info synced ({})",
                    if device_with_points.device_info.panel_serial_number > 0 {
                        "UPDATE"
                    } else {
                        "INSERT"
                    }
                ));

                // UPSERT input points (INSERT or UPDATE)
                if !device_with_points.input_points.is_empty() {
                    sync_logger.info(&format!(
                        "🔧 Processing {} INPUT points...",
                        device_with_points.input_points.len()
                    ));

                    for (point_index, point) in device_with_points.input_points.iter().enumerate() {
                        if let Err(e) =
                            Self::sync_input_point_static(&txn, serial_number, point).await
                        {
                            sync_logger.error(&format!(
                                "❌ INPUT point {}/{} failed - Index: {}, Label: '{}', Error: {}",
                                point_index + 1,
                                device_with_points.input_points.len(),
                                point.index,
                                point.full_label,
                                e
                            ));
                        }
                    }
                    sync_logger.info("✅ INPUT points completed");

                    // Insert DATA_SYNC_METADATA for INPUTS sync
                    let now = chrono::Utc::now();
                    let sync_time = now.timestamp();
                    let sync_time_fmt = now.format("%Y-%m-%d %H:%M:%S").to_string();

                    let input_metadata = crate::entity::data_sync_metadata::ActiveModel {
                        sync_time: Set(sync_time),
                        sync_time_fmt: Set(sync_time_fmt),
                        data_type: Set("INPUTS".to_string()),
                        serial_number: Set(serial_number.to_string()),
                        panel_id: Set(Some(device_with_points.device_info.panel_id)),
                        records_synced: Set(device_with_points.input_points.len() as i32),
                        sync_method: Set("FFI_BACKEND".to_string()),
                        success: Set(1),
                        error_message: Set(None),
                        created_at: Set(sync_time),
                        ..Default::default()
                    };

                    if let Err(e) = crate::entity::data_sync_metadata::Entity::insert(input_metadata)
                        .exec(&txn)
                        .await
                    {
                        sync_logger.error(&format!("❌ Failed to insert INPUTS sync metadata: {}", e));
                    }
                }

                // UPSERT output points (INSERT or UPDATE)
                if !device_with_points.output_points.is_empty() {
                    sync_logger.info(&format!(
                        "🔧 Processing {} OUTPUT points...",
                        device_with_points.output_points.len()
                    ));

                    for (point_index, point) in device_with_points.output_points.iter().enumerate()
                    {
                        if let Err(e) =
                            Self::sync_output_point_static(&txn, serial_number, point).await
                        {
                            sync_logger.error(&format!(
                                "❌ OUTPUT point {}/{} failed - Index: {}, Label: '{}', Error: {}",
                                point_index + 1,
                                device_with_points.output_points.len(),
                                point.index,
                                point.full_label,
                                e
                            ));
                        }
                    }
                    sync_logger.info("✅ OUTPUT points completed");

                    // Insert DATA_SYNC_METADATA for OUTPUTS sync
                    let now = chrono::Utc::now();
                    let sync_time = now.timestamp();
                    let sync_time_fmt = now.format("%Y-%m-%d %H:%M:%S").to_string();

                    let output_metadata = crate::entity::data_sync_metadata::ActiveModel {
                        sync_time: Set(sync_time),
                        sync_time_fmt: Set(sync_time_fmt),
                        data_type: Set("OUTPUTS".to_string()),
                        serial_number: Set(serial_number.to_string()),
                        panel_id: Set(Some(device_with_points.device_info.panel_id)),
                        records_synced: Set(device_with_points.output_points.len() as i32),
                        sync_method: Set("FFI_BACKEND".to_string()),
                        success: Set(1),
                        error_message: Set(None),
                        created_at: Set(sync_time),
                        ..Default::default()
                    };

                    if let Err(e) = crate::entity::data_sync_metadata::Entity::insert(output_metadata)
                        .exec(&txn)
                        .await
                    {
                        sync_logger.error(&format!("❌ Failed to insert OUTPUTS sync metadata: {}", e));
                    }
                }

                // UPSERT variable points (INSERT or UPDATE)
                if !device_with_points.variable_points.is_empty() {
                    sync_logger.info(&format!(
                        "🔧 Processing {} VARIABLE points...",
                        device_with_points.variable_points.len()
                    ));

                    for (point_index, point) in
                        device_with_points.variable_points.iter().enumerate()
                    {
                        if let Err(e) =
                            Self::sync_variable_point_static(&txn, serial_number, point).await
                        {
                            sync_logger.error(&format!("❌ VARIABLE point {}/{} failed - Index: {}, Label: '{}', Error: {}",
                                point_index + 1, device_with_points.variable_points.len(), point.index, point.full_label, e));
                        }
                    }
                    sync_logger.info("✅ VARIABLE points completed");

                    // Insert DATA_SYNC_METADATA for VARIABLES sync
                    let now = chrono::Utc::now();
                    let sync_time = now.timestamp();
                    let sync_time_fmt = now.format("%Y-%m-%d %H:%M:%S").to_string();

                    let variable_metadata = crate::entity::data_sync_metadata::ActiveModel {
                        sync_time: Set(sync_time),
                        sync_time_fmt: Set(sync_time_fmt),
                        data_type: Set("VARIABLES".to_string()),
                        serial_number: Set(serial_number.to_string()),
                        panel_id: Set(Some(device_with_points.device_info.panel_id)),
                        records_synced: Set(device_with_points.variable_points.len() as i32),
                        sync_method: Set("FFI_BACKEND".to_string()),
                        success: Set(1),
                        error_message: Set(None),
                        created_at: Set(sync_time),
                        ..Default::default()
                    };

                    if let Err(e) = crate::entity::data_sync_metadata::Entity::insert(variable_metadata)
                        .exec(&txn)
                        .await
                    {
                        sync_logger.error(&format!("❌ Failed to insert VARIABLES sync metadata: {}", e));
                    }
                }

                // INSERT trend log data (ALWAYS INSERT for historical data)
                let total_trend_points = device_with_points.input_points.len()
                    + device_with_points.output_points.len()
                    + device_with_points.variable_points.len();
                if total_trend_points > 0 {
                    sync_logger.info(&format!(
                        "📊 Trend logs inserted ({} entries)",
                        total_trend_points
                    ));

                    if let Err(e) = Self::insert_trend_logs(
                        &txn,
                        serial_number,
                        device_with_points,
                        sync_metadata_id,
                    )
                    .await
                    {
                        sync_logger.error(&format!("❌ Trend log insertion failed - Serial: {}, Error: {}, Total entries: {}",
                            serial_number, e, total_trend_points));
                    }
                }

                successful_devices += 1;
                sync_logger.info(&format!("✅ Device {} data sync completed", serial_number));
            }

            // Log device processing time
            let device_duration = device_start_time.elapsed();
            sync_logger.info(&format!(
                "⏱️  Device {} completed in {:.2}s",
                panel_info.serial_number,
                device_duration.as_secs_f64()
            ));
            sync_logger.info(&format!(
                "📱 ========== Device {}/{} END ==========",
                device_index + 1,
                total_devices
            ));

            // Add 30-second delay between devices to reduce T3000 load
            if device_index < total_devices - 1 {
                sync_logger.info("⏸️  Waiting 30 seconds before next device (load balancing)...");
                tokio::time::sleep(Duration::from_secs(30)).await;
            }
        }

        sync_logger.info(&format!(
            "💾 Committing transaction - {} successful, {} failed, {} skipped",
            successful_devices, failed_devices, skipped_devices
        ));

        let _commit_result = txn.commit().await.map_err(|e| {
            sync_logger.error(&format!(
                "❌ Transaction COMMIT failed - Error: {}, All {} device changes rolled back",
                e, successful_devices
            ));
            AppError::DatabaseError(format!("Transaction commit failed: {}", e))
        })?;

        sync_logger.info("✅ Transaction committed successfully");

        // Validate data was actually inserted by doing a quick count check
        let validation_db = establish_t3_device_connection().await?;
        sync_logger.info("🔍 Validation: Checking data persistence");

        // Validate only successful devices
        let mut validation_summary = String::new();
        for panel_info in &panels {
            let serial_number = panel_info.serial_number;

            // Check if device exists in database
            if let Ok(device_count) = devices::Entity::find()
                .filter(devices::Column::SerialNumber.eq(serial_number))
                .count(&validation_db)
                .await
            {
                validation_summary.push_str(&format!(
                    "Device {}: {} record(s) in DEVICES table; ",
                    serial_number, device_count
                ));
            }

            // Check input points count
            if let Ok(input_count) = input_points::Entity::find()
                .filter(input_points::Column::SerialNumber.eq(serial_number))
                .count(&validation_db)
                .await
            {
                validation_summary.push_str(&format!("{} INPUT points; ", input_count));
            }

            // Check output points count
            if let Ok(output_count) = output_points::Entity::find()
                .filter(output_points::Column::SerialNumber.eq(serial_number))
                .count(&validation_db)
                .await
            {
                validation_summary.push_str(&format!("{} OUTPUT points; ", output_count));
            }

            // Check variable points count
            if let Ok(variable_count) = variable_points::Entity::find()
                .filter(variable_points::Column::SerialNumber.eq(serial_number))
                .count(&validation_db)
                .await
            {
                validation_summary.push_str(&format!("{} VARIABLE points; ", variable_count));
            }
        }

        sync_logger.info(&format!("📊 Validation results: {}", validation_summary));
        sync_logger.info(&format!("🎉 SEQUENTIAL SYNC CYCLE COMPLETED"));
        sync_logger.info(&format!(
            "📈 Summary: Total={}, Successful={}, Failed={}, Skipped={}",
            total_devices, successful_devices, failed_devices, skipped_devices
        ));
        sync_logger.info(&format!(
            "⏰ Next sync cycle in {}s ({}min)",
            config.sync_interval_secs,
            config.sync_interval_secs / 60
        ));

        Ok(())
    }

    /// UPSERT device basic info (INSERT or UPDATE based on existence)
    async fn sync_device_basic_info(
        txn: &DatabaseTransaction,
        device_info: &DeviceInfo,
    ) -> Result<(), AppError> {
        let serial_number = device_info.panel_serial_number;

        // Create sync logger for device info operations
        let mut sync_logger = ServiceLogger::ffi().map_err(|e| {
            error!("Failed to create sync logger: {}", e);
            AppError::LoggerError(format!("Failed to create sync logger: {}", e))
        })?;

        // Validate SerialNumber - skip devices with SerialNumber=0 (invalid devices)
        if serial_number == 0 {
            sync_logger.warn(&format!("⚠️ SKIPPING device with invalid SerialNumber=0 - Name: '{}', IP: '{}', Panel ID: {}",
                device_info.panel_name, device_info.panel_ipaddress, device_info.panel_id));
            sync_logger.warn("⚠️ This indicates missing or invalid panel_serial_number in JSON response - check C++ HandleWebViewMsg implementation");
            return Ok(()); // Skip this device - don't insert/update
        }

        info!(
            "🔍 Checking if device {} exists in database...",
            serial_number
        );
        sync_logger.info(&format!(
            "🔍 Database lookup for device - Serial: {}, Name: '{}', IP: '{}'",
            serial_number, device_info.panel_name, device_info.panel_ipaddress
        ));

        // Check if device exists
        let existing = devices::Entity::find()
            .filter(devices::Column::SerialNumber.eq(serial_number))
            .one(txn)
            .await
            .map_err(|e| {
                let error_msg =
                    format!("Database query failed for device {}: {}", serial_number, e);
                sync_logger.error(&format!(
                    "❌ Device existence check failed - Serial: {}, Error: {}",
                    serial_number, e
                ));
                AppError::DatabaseError(error_msg)
            })?;

        let device_model = devices::ActiveModel {
            serial_number: Set(serial_number),
            panel_id: Set(Some(device_info.panel_id)),
            building_name: Set(Some(device_info.panel_name.clone())),
            product_name: Set(Some("T3000 Panel".to_string())),
            address: Set(Some(device_info.panel_ipaddress.clone())),
            status: Set(Some("Online".to_string())),
            description: Set(Some(format!(
                "Panel {} - {}",
                device_info.panel_id, device_info.panel_name
            ))),

            // Extended network configuration fields from Device_Basic_Setting
            ip_address: Set(device_info.ip_address.clone()),
            port: Set(device_info.port),
            bacnet_mstp_mac_id: Set(device_info.bacnet_mstp_mac_id),
            modbus_address: Set(device_info.modbus_address.map(|v| v as u8)), // Convert i32 to u8
            pc_ip_address: Set(device_info.pc_ip_address.clone()),
            modbus_port: Set(device_info.modbus_port.map(|v| v as u16)), // Convert i32 to u16
            bacnet_ip_port: Set(device_info.bacnet_ip_port.map(|v| v as u16)), // Convert i32 to u16
            show_label_name: Set(device_info.show_label_name.clone()),
            connection_type: Set(device_info.connection_type.clone()),

            ..Default::default()
        };

        if existing.is_some() {
            info!(
                "🔄 Device {} exists - performing UPDATE with latest info",
                serial_number
            );
            sync_logger.info(&format!(
                "🔄 Device UPDATE operation - Serial: {}, Name: '{}', Status: Online",
                serial_number, device_info.panel_name
            ));

            // UPDATE existing device
            let _update_result = devices::Entity::update(device_model)
                .filter(devices::Column::SerialNumber.eq(serial_number))
                .exec(txn)
                .await
                .map_err(|e| {
                    let error_msg = format!("Device UPDATE failed for {}: {}", serial_number, e);
                    sync_logger.error(&format!(
                        "❌ Device UPDATE failed - Serial: {}, Error: {}",
                        serial_number, e
                    ));
                    AppError::DatabaseError(error_msg)
                })?;

            info!("✅ Device {} info UPDATED successfully", serial_number);
            sync_logger.info(&format!(
                "✅ Device UPDATE successful - Serial: {}, Update operation completed",
                serial_number
            ));
        } else {
            info!(
                "➕ Device {} not found - performing INSERT as new device",
                serial_number
            );
            sync_logger.info(&format!(
                "➕ Device INSERT operation - Serial: {}, Name: '{}', New device registration",
                serial_number, device_info.panel_name
            ));

            // INSERT new device
            let insert_result = devices::Entity::insert(device_model)
                .exec(txn)
                .await
                .map_err(|e| {
                    let error_msg = format!("Device INSERT failed for {}: {}", serial_number, e);
                    sync_logger.error(&format!(
                        "❌ Device INSERT failed - Serial: {}, Error: {}",
                        serial_number, e
                    ));
                    AppError::DatabaseError(error_msg)
                })?;

            info!("✅ Device {} info INSERTED successfully", serial_number);
            sync_logger.info(&format!(
                "✅ Device INSERT successful - Serial: {}, Last insert ID: {}",
                serial_number, insert_result.last_insert_id
            ));
        }

        Ok(())
    }

    /// Format timestamp to "YYYY-MM-DD HH:MM:SS" format for LoggingTime_Fmt - using Local time
    #[allow(dead_code)]
    fn format_logging_time() -> String {
        chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string()
    }

    /// Convert Unix timestamp to formatted local time string for LoggingTime_Fmt
    /// Takes a Unix timestamp string and converts it to "YYYY-MM-DD HH:MM:SS" format in local timezone
    fn format_unix_timestamp_to_local(unix_timestamp_str: &str) -> String {
        // Parse the Unix timestamp (handle both string and numeric formats)
        if let Ok(unix_timestamp) = unix_timestamp_str.parse::<i64>() {
            // Convert Unix timestamp to DateTime
            if let Some(datetime) = chrono::DateTime::from_timestamp(unix_timestamp, 0) {
                // Get local timezone offset (this will use system timezone)
                let local_datetime = datetime.with_timezone(&chrono::Local);
                return local_datetime.format("%Y-%m-%d %H:%M:%S").to_string();
            }
        }

        // Fallback to current Local time if parsing fails
        chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string()
    }

    /// Derive units from range value for T3000 points
    /// Updated to match T3000 frontend variable range mappings from T3Data.ts
    fn derive_units_from_range(range: i32) -> String {
        match range {
            0 => "Unused".to_string(),
            1 => "Deg.C".to_string(),        // Temperature Celsius
            2 => "Deg.F".to_string(),        // Temperature Fahrenheit
            3 => "Feet per Min".to_string(), // Feet per minute (FPM)
            4 => "Pascals".to_string(),      // Pascals (corrected from %)
            5 => "KPascals".to_string(),     // Kilopascals
            6 => "lbs/sqr.inch".to_string(), // PSI
            7 => "inches of WC".to_string(), // Inches water column
            8 => "Watts".to_string(),        // Watts
            9 => "KWatts".to_string(),       // Kilowatts
            10 => "KWH".to_string(),         // Kilowatt hours
            11 => "Volts".to_string(),       // Volts
            12 => "KV".to_string(),          // Kilovolts
            13 => "Amps".to_string(),        // Amperes
            14 => "ma".to_string(),          // Milliamperes
            15 => "CFM".to_string(),         // Cubic feet per minute
            16 => "Seconds".to_string(),     // Seconds
            17 => "Minutes".to_string(),     // Minutes
            18 => "Hours".to_string(),       // Hours
            19 => "Days".to_string(),        // Days
            20 => "Time".to_string(),        // Time
            21 => "Ohms".to_string(),        // Ohms
            22 => "%".to_string(),           // Percent
            23 => "%RH".to_string(),         // Relative humidity percent
            24 => "p/min".to_string(),       // Pulses per minute (corrected from gal/min)
            25 => "Counts".to_string(),      // Counts
            26 => "%Open".to_string(),       // Percent open
            27 => "Kg".to_string(),          // Kilograms
            28 => "L/Hour".to_string(),      // Liters per hour
            29 => "GPH".to_string(),         // Gallons per hour
            30 => "GAL".to_string(),         // Gallons
            31 => "CF".to_string(),          // Cubic feet
            32 => "BTU".to_string(),         // BTU
            33 => "CMH".to_string(),         // Cubic meters per hour
            _ => "Unknown".to_string(),      // Unknown range
        }
    }

    /// INSERT trend log entries (ALWAYS INSERT for historical data)
    async fn insert_trend_logs(
        txn: &DatabaseTransaction,
        serial_number: i32,
        device_data: &DeviceWithPoints,
        _sync_metadata_id: i32,
    ) -> Result<(), AppError> {
        let timestamp = chrono::Utc::now().to_rfc3339();

        // Create sync logger for trend log operations
        let mut sync_logger = ServiceLogger::ffi().map_err(|e| {
            error!("Failed to create sync logger: {}", e);
            AppError::LoggerError(format!("Failed to create sync logger: {}", e))
        })?;

        info!(
            "📊 Starting trend log insertion at timestamp: {}",
            timestamp
        );

        // Insert trend logs for all input points
        if !device_data.input_points.is_empty() {
            info!(
                "📈 Inserting {} INPUT point trend logs...",
                device_data.input_points.len()
            );
            sync_logger.info(&format!(
                "📈 Starting INPUT trend log insertion - Serial: {}, Count: {}, Timestamp: {}",
                serial_number,
                device_data.input_points.len(),
                timestamp
            ));
        }

        for (input_index, point) in device_data.input_points.iter().enumerate() {
            let units = Self::derive_units_from_range(point.range);

            // Step 1: Get or create parent record (with caching)
            let parent_key = ParentKey {
                serial_number,
                panel_id: device_data.device_info.panel_id,
                point_id: point
                    .id
                    .clone()
                    .unwrap_or_else(|| format!("IN{}", point.index)),
                point_index: point.index as i32,
                point_type: "INPUT".to_string(),
            };

            let parent_id = match get_trendlog_cache()
                .get_or_create_parent(
                    txn,
                    parent_key,
                    point.digital_analog.map(|da| da.to_string()),
                    Some(point.range.to_string()),
                    Some(units.clone()),
                )
                .await
            {
                Ok(id) => id,
                Err(e) => {
                    sync_logger.error(&format!(
                        "❌ Failed to get/create INPUT parent - Serial: {}, Index: {}, Error: {}",
                        serial_number, point.index, e
                    ));
                    return Err(AppError::DatabaseError(format!(
                        "Failed to get/create INPUT parent: {}",
                        e
                    )));
                }
            };

            // Step 2: Insert detail record only
            let logging_time_fmt =
                Self::format_unix_timestamp_to_local(&device_data.device_info.input_logging_time);

            let trend_detail = trendlog_data_detail::ActiveModel {
                parent_id: Set(parent_id),
                value: Set(point.value.to_string()),
                logging_time_fmt: Set(logging_time_fmt.clone()),
                ..Default::default()
            };

            sync_logger.info(&format!("📊 Inserting INPUT trend detail {}/{} - Serial: {}, ParentID: {}, Index: {}, Value: {}, Status: {}",
                input_index + 1, device_data.input_points.len(),
                serial_number, parent_id, point.index, point.value, point.status));

            if let Err(e) = trendlog_data_detail::Entity::insert(trend_detail)
                .exec(txn)
                .await
            {
                sync_logger.error(&format!(
                    "❌ INPUT trend detail insert failed - Serial: {}, Index: {}, Error: {}",
                    serial_number, point.index, e
                ));
                return Err(AppError::DatabaseError(format!(
                    "Failed to insert INPUT trend detail: {}",
                    e
                )));
            }
        }

        // Insert trend logs for all output points
        if !device_data.output_points.is_empty() {
            info!(
                "📈 Inserting {} OUTPUT point trend logs...",
                device_data.output_points.len()
            );
            sync_logger.info(&format!(
                "📈 Starting OUTPUT trend log insertion - Serial: {}, Count: {}, Timestamp: {}",
                serial_number,
                device_data.output_points.len(),
                timestamp
            ));
        }

        for (output_index, point) in device_data.output_points.iter().enumerate() {
            let units = Self::derive_units_from_range(point.range);

            // Step 1: Get or create parent record (with caching)
            let parent_key = ParentKey {
                serial_number,
                panel_id: device_data.device_info.panel_id,
                point_id: point
                    .id
                    .clone()
                    .unwrap_or_else(|| format!("OUT{}", point.index)),
                point_index: point.index as i32,
                point_type: "OUTPUT".to_string(),
            };

            let parent_id = match get_trendlog_cache()
                .get_or_create_parent(
                    txn,
                    parent_key,
                    point.digital_analog.map(|da| da.to_string()),
                    Some(point.range.to_string()),
                    Some(units.clone()),
                )
                .await
            {
                Ok(id) => id,
                Err(e) => {
                    sync_logger.error(&format!(
                        "❌ Failed to get/create OUTPUT parent - Serial: {}, Index: {}, Error: {}",
                        serial_number, point.index, e
                    ));
                    return Err(AppError::DatabaseError(format!(
                        "Failed to get/create OUTPUT parent: {}",
                        e
                    )));
                }
            };

            // Step 2: Insert detail record only
            let logging_time_fmt =
                Self::format_unix_timestamp_to_local(&device_data.device_info.output_logging_time);

            let trend_detail = trendlog_data_detail::ActiveModel {
                parent_id: Set(parent_id),
                value: Set(point.value.to_string()),
                logging_time_fmt: Set(logging_time_fmt.clone()),
                ..Default::default()
            };

            sync_logger.info(&format!("📊 Inserting OUTPUT trend detail {}/{} - Serial: {}, ParentID: {}, Index: {}, Value: {}, Status: {}",
                output_index + 1, device_data.output_points.len(),
                serial_number, parent_id, point.index, point.value, point.status));

            if let Err(e) = trendlog_data_detail::Entity::insert(trend_detail)
                .exec(txn)
                .await
            {
                sync_logger.error(&format!(
                    "❌ OUTPUT trend detail insert failed - Serial: {}, Index: {}, Error: {}",
                    serial_number, point.index, e
                ));
                return Err(AppError::DatabaseError(format!(
                    "Failed to insert OUTPUT trend detail: {}",
                    e
                )));
            }
        }

        // Insert trend logs for all variable points
        if !device_data.variable_points.is_empty() {
            info!(
                "📈 Inserting {} VARIABLE point trend logs...",
                device_data.variable_points.len()
            );
            sync_logger.info(&format!(
                "📈 Starting VARIABLE trend log insertion - Serial: {}, Count: {}, Timestamp: {}",
                serial_number,
                device_data.variable_points.len(),
                timestamp
            ));
        }

        for (variable_index, point) in device_data.variable_points.iter().enumerate() {
            let units = Self::derive_units_from_range(point.range);

            // Step 1: Get or create parent record (with caching)
            let parent_key = ParentKey {
                serial_number,
                panel_id: device_data.device_info.panel_id,
                point_id: point
                    .id
                    .clone()
                    .unwrap_or_else(|| format!("VAR{}", point.index)),
                point_index: point.index as i32,
                point_type: "VARIABLE".to_string(),
            };

            let parent_id = match get_trendlog_cache()
                .get_or_create_parent(
                    txn,
                    parent_key,
                    point.digital_analog.map(|da| da.to_string()),
                    Some(point.range.to_string()),
                    Some(units.clone()),
                )
                .await
            {
                Ok(id) => id,
                Err(e) => {
                    sync_logger.error(&format!("❌ Failed to get/create VARIABLE parent - Serial: {}, Index: {}, Error: {}",
                        serial_number, point.index, e));
                    return Err(AppError::DatabaseError(format!(
                        "Failed to get/create VARIABLE parent: {}",
                        e
                    )));
                }
            };

            // Step 2: Insert detail record only
            let logging_time_fmt = Self::format_unix_timestamp_to_local(
                &device_data.device_info.variable_logging_time,
            );

            let trend_detail = trendlog_data_detail::ActiveModel {
                parent_id: Set(parent_id),
                value: Set(point.value.to_string()),
                logging_time_fmt: Set(logging_time_fmt.clone()),
                ..Default::default()
            };

            sync_logger.info(&format!("📊 Inserting VARIABLE trend detail {}/{} - Serial: {}, ParentID: {}, Index: {}, Value: {}, Status: {}",
                variable_index + 1, device_data.variable_points.len(),
                serial_number, parent_id, point.index, point.value, point.status));

            if let Err(e) = trendlog_data_detail::Entity::insert(trend_detail)
                .exec(txn)
                .await
            {
                sync_logger.error(&format!(
                    "❌ VARIABLE trend detail insert failed - Serial: {}, Index: {}, Error: {}",
                    serial_number, point.index, e
                ));
                return Err(AppError::DatabaseError(format!(
                    "Failed to insert VARIABLE trend detail: {}",
                    e
                )));
            }
        }

        let total_inserted = device_data.input_points.len()
            + device_data.output_points.len()
            + device_data.variable_points.len();
        info!(
            "✅ Inserted {} total trend log entries for device {} at {}",
            total_inserted, serial_number, timestamp
        );
        Ok(())
    }

    /// Call T3000 C++ HandleWebViewMsg function directly via FFI for LOGGING_DATA
    /// Includes retry logic to wait for MFC application initialization
    async fn get_logging_data_via_direct_ffi(
        config: &T3000MainConfig,
        panel_id: i32,
        serial_number: i32,
    ) -> Result<String, AppError> {
        info!("🔄 Starting DIRECT FFI call to HandleWebViewMsg with LOGGING_DATA action - Panel: {}, Serial: {}", panel_id, serial_number);
        info!(
            "📋 FFI Config - Timeout: {}s, Retry: {}",
            config.timeout_seconds, config.retry_attempts
        );

        if let Ok(mut sync_logger) = ServiceLogger::ffi() {
            sync_logger.info(&format!(
                "🔄 Starting DIRECT FFI call to HandleWebViewMsg(15) - Panel: {}, Serial: {}",
                panel_id, serial_number
            ));
        }

        // Try multiple times with increasing delays to wait for MFC initialization
        for attempt in 1..=(config.retry_attempts + 1) {
            info!("🔄 FFI attempt {}/{}", attempt, config.retry_attempts + 1);

            let panel_id_clone = panel_id;
            let serial_number_clone = serial_number;

            // Run FFI call in a blocking task with timeout
            let spawn_result = tokio::time::timeout(
                Duration::from_secs(config.timeout_seconds),
                tokio::task::spawn_blocking(move || {
                    info!("🔌 Calling HandleWebViewMsg(15) via direct FFI for Panel: {}, Serial: {}...", panel_id_clone, serial_number_clone);

                    // Prepare input JSON with panel_id and serial_number
                    let input_json = serde_json::json!({
                        "action": WebViewMessageType::LOGGING_DATA as i32,  // Use numeric enum value (15)
                        "panelId": panel_id_clone,
                        "serialNumber": serial_number_clone
                    });
                    let input_str = input_json.to_string();

                    // Log FFI call start WITH ACTUAL JSON BEING SENT
                    info!("🔌 About to call HandleWebViewMsg with LOGGING_DATA action - Panel: {}, Serial: {}", panel_id_clone, serial_number_clone);
                    info!("📤 Sending JSON to C++: {}", input_str);
                    if let Ok(mut sync_logger) = ServiceLogger::ffi() {
                        sync_logger.info(&format!("📤 LOGGING_DATA JSON sent to C++: {}", input_str));
                    }

                    // Prepare buffer for response - very large buffer for up to 100 devices
                    // Each device can be ~1MB, so 100 devices = ~100MB
                    const BUFFER_SIZE: usize = 104857600; // 100MB buffer for maximum device capacity
                    let mut buffer: Vec<u8> = vec![0; BUFFER_SIZE];

                    // Write input JSON to buffer
                    let input_bytes = input_str.as_bytes();
                    if input_bytes.len() < BUFFER_SIZE {
                        buffer[..input_bytes.len()].copy_from_slice(input_bytes);
                        buffer[input_bytes.len()] = 0; // Null terminator
                    } else {
                        error!("❌ Input JSON too large for buffer");
                        return Err("Input JSON too large".to_string());
                    }

                    // Call the T3000 HandleWebViewMsg function via runtime loading
                    // Action 15 = LOGGING_DATA case in BacnetWebView.cpp
                    let result = match call_handle_webview_msg(WebViewMessageType::LOGGING_DATA as i32, &mut buffer) {
                        Ok(code) => code,
                        Err(err) => {
                            error!("❌ Failed to call BacnetWebView_HandleWebViewMsg: {}", err);
                            if let Ok(mut sync_logger) = ServiceLogger::ffi() {
                                sync_logger.error(&format!("❌ Failed to call BacnetWebView_HandleWebViewMsg: {} - Function not found in T3000.exe", err));
                            }
                            return Err(format!("Failed to call BacnetWebView_HandleWebViewMsg: {}", err));
                        }
                    };

                    if result == -2 {
                        // MFC not ready - this is expected during startup
                        return Err("MFC application not initialized".to_string());
                    } else if result != 0 {
                        // Check if we got any error message in the buffer despite the error code
                        let null_pos = buffer.iter().position(|&x| x == 0).unwrap_or(buffer.len());
                        let error_response = String::from_utf8_lossy(&buffer[..null_pos]).to_string();

                        error!("❌ BacnetWebView_HandleWebViewMsg returned error code: {} with response: '{}'", result, error_response);
                        if let Ok(mut sync_logger) = ServiceLogger::ffi() {
                            sync_logger.error(&format!("❌ BacnetWebView HandleWebViewMsg returned error code {} - Response: '{}' - This may indicate C++ compilation issues or T3000.exe needs rebuild", result, error_response));
                        }
                        return Err(format!("BacnetWebView HandleWebViewMsg returned error code: {} - Response: {}", result, error_response));
                    }

                    // Find the null terminator to get the actual string length
                    let null_pos = buffer.iter().position(|&x| x == 0).unwrap_or(buffer.len());
                    let result_str = String::from_utf8_lossy(&buffer[..null_pos]).to_string();

                    if result_str.is_empty() || result_str == "{}" {
                        warn!("⚠️ HandleWebViewMsg returned empty or minimal response - T3000 data might not be ready");
                        if let Ok(mut sync_logger) = ServiceLogger::ffi() {
                            sync_logger.warn("⚠️ HandleWebViewMsg returned empty response - No device data available yet");
                        }
                        return Err("HandleWebViewMsg returned empty response - T3000 data not ready".to_string());
                    }

                    if result_str.contains("\"error\"") {
                        error!("❌ HandleWebViewMsg returned error response: {}", result_str);
                        return Err(format!("HandleWebViewMsg returned error: {}", result_str));
                    } else {
                        info!("🎉 SUCCESS: Received real device data from direct T3000 integration!");
                        if let Ok(mut sync_logger) = ServiceLogger::ffi() {
                            sync_logger.info("🎉 SUCCESS: Direct HandleWebViewMsg call returned real T3000 device data");
                        }
                    }

                    info!("📝 Direct Response Preview: {}",
                          if result_str.len() > 200 { &result_str[..200] } else { &result_str });

                    // Return the result string directly
                    Ok(result_str)
                }),
            ).await;

            // Handle the spawn result
            match spawn_result {
                Ok(join_result) => {
                    match join_result {
                        Ok(ffi_result) => {
                            match ffi_result {
                                Ok(data) => {
                                    info!(
                                        "✅ Direct FFI call completed successfully on attempt {}",
                                        attempt
                                    );
                                    if let Ok(mut sync_logger) = ServiceLogger::ffi() {
                                        sync_logger.info("✅ Direct HandleWebViewMsg FFI call completed successfully");
                                    }
                                    return Ok(data);
                                }
                                Err(ffi_error) => {
                                    if ffi_error.contains("MFC application not initialized")
                                        && attempt < config.retry_attempts + 1
                                    {
                                        warn!("⚠️ MFC not ready on attempt {}, waiting before retry...", attempt);
                                        if let Ok(mut warn_logger) = ServiceLogger::ffi() {
                                            warn_logger.warn(&format!("⚠️ MFC not ready on attempt {}, will retry after delay", attempt));
                                        }

                                        // Progressive delay: 2s, 4s, 6s, etc.
                                        let delay_seconds = attempt as u64 * 2;
                                        tokio::time::sleep(Duration::from_secs(delay_seconds))
                                            .await;
                                        break; // Break to continue outer loop
                                    }

                                    error!("❌ Direct FFI call failed: {}", ffi_error);
                                    return Err(AppError::FfiError(format!(
                                        "Direct FFI call failed: {}",
                                        ffi_error
                                    )));
                                }
                            }
                        }
                        Err(join_error) => {
                            error!("❌ Direct FFI task failed: {}", join_error);
                            if let Ok(mut error_logger) = ServiceLogger::ffi() {
                                error_logger.error(&format!(
                                    "❌ Direct HandleWebViewMsg task failed: {}",
                                    join_error
                                ));
                            }
                            return Err(AppError::FfiError(format!(
                                "Direct FFI task failed: {}",
                                join_error
                            )));
                        }
                    }
                }
                Err(timeout_error) => {
                    error!("❌ Direct FFI call timed out: {}", timeout_error);
                    if let Ok(mut error_logger) = ServiceLogger::ffi() {
                        error_logger.error(&format!(
                            "❌ Direct HandleWebViewMsg call timed out: {}",
                            timeout_error
                        ));
                    }

                    if attempt < config.retry_attempts + 1 {
                        warn!("⚠️ Timeout on attempt {}, retrying...", attempt);
                        break; // Break to continue outer loop
                    }

                    return Err(AppError::FfiError(format!(
                        "Direct FFI call timed out: {}",
                        timeout_error
                    )));
                }
            }
        }

        // If we get here, all attempts failed
        error!("❌ All FFI attempts failed - MFC application never became ready");
        Err(AppError::FfiError(
            "All FFI attempts failed - MFC application never became ready".to_string(),
        ))
    }

    /// Get lightweight device list via GET_PANELS_LIST (Action 4)
    /// Returns list of available panels without loading full point data
    /// This is much faster than LOGGING_DATA as it only queries panel metadata
    async fn get_panels_list_via_ffi() -> Result<Vec<PanelInfo>, AppError> {
        info!("🔄 Starting GET_PANELS_LIST FFI call (Action 4)");

        // Create sync logger for this operation
        let mut sync_logger =
            ServiceLogger::ffi().unwrap_or_else(|_| ServiceLogger::new("fallback_ffi").unwrap());

        sync_logger.info("🔄 Calling HandleWebViewMsg(4) to get device list");

        // Run FFI call in blocking task with timeout
        let spawn_result = tokio::time::timeout(
            Duration::from_secs(10), // 10 second timeout for lightweight operation
            tokio::task::spawn_blocking(move || {
                info!("🔌 Calling HandleWebViewMsg(GET_PANELS_LIST) for device list...");

                // Prepare buffer for response - increased size for large device lists
                const BUFFER_SIZE: usize = 1048576; // 1MB buffer for large device lists (was 10KB)
                let mut buffer: Vec<u8> = vec![0; BUFFER_SIZE];

                // Call HandleWebViewMsg with Action 4 (GET_PANELS_LIST)
                let result = match call_handle_webview_msg(
                    WebViewMessageType::GET_PANELS_LIST as i32,
                    &mut buffer,
                ) {
                    Ok(code) => code,
                    Err(err) => {
                        error!(
                            "❌ Failed to call HandleWebViewMsg(GET_PANELS_LIST): {}",
                            err
                        );
                        return Err(format!("Failed to call HandleWebViewMsg: {}", err));
                    }
                };

                if result == -2 {
                    return Err("MFC application not initialized".to_string());
                } else if result != 0 {
                    let null_pos = buffer.iter().position(|&x| x == 0).unwrap_or(buffer.len());
                    let _error_response = String::from_utf8_lossy(&buffer[..null_pos]).to_string();
                    error!(
                        "❌ HandleWebViewMsg(GET_PANELS_LIST) returned error code: {}",
                        result
                    );
                    return Err(format!("HandleWebViewMsg returned error code: {}", result));
                }

                // Parse response
                let null_pos = buffer.iter().position(|&x| x == 0).unwrap_or(buffer.len());
                let result_str = String::from_utf8_lossy(&buffer[..null_pos]).to_string();

                if result_str.is_empty() || result_str == "{}" {
                    warn!("⚠️ GET_PANELS_LIST returned empty response");
                    return Err("GET_PANELS_LIST returned empty response".to_string());
                }

                info!("✅ GET_PANELS_LIST returned {} bytes", result_str.len());
                Ok(result_str)
            }),
        )
        .await;

        // Handle spawn result
        match spawn_result {
            Ok(join_result) => {
                match join_result {
                    Ok(ffi_result) => {
                        match ffi_result {
                            Ok(json_data) => {
                                sync_logger.info(&format!(
                                    "✅ GET_PANELS_LIST completed - {} bytes received",
                                    json_data.len()
                                ));

                                // Parse JSON response: {"action":"GET_PANELS_LIST_RES","data":[...]}
                                let json_value: JsonValue = serde_json::from_str(&json_data)
                                    .map_err(|e| {
                                        AppError::ParseError(format!(
                                            "Failed to parse GET_PANELS_LIST JSON: {}",
                                            e
                                        ))
                                    })?;

                                let panels: Vec<PanelInfo> = json_value
                                    .get("data")
                                    .and_then(|v| v.as_array())
                                    .map(|arr| {
                                        arr.iter()
                                            .filter_map(|panel_json| {
                                                Some(PanelInfo {
                                                    panel_number: panel_json
                                                        .get("panel_number")?
                                                        .as_i64()?
                                                        as i32,
                                                    serial_number: panel_json
                                                        .get("serial_number")?
                                                        .as_i64()?
                                                        as i32,
                                                    panel_name: panel_json
                                                        .get("panel_name")?
                                                        .as_str()?
                                                        .to_string(),
                                                })
                                            })
                                            .collect()
                                    })
                                    .unwrap_or_default();

                                sync_logger.info(&format!(
                                    "📋 Parsed {} panels from GET_PANELS_LIST",
                                    panels.len()
                                ));

                                if panels.is_empty() {
                                    sync_logger.warn("⚠️ No panels returned from GET_PANELS_LIST");
                                }

                                Ok(panels)
                            }
                            Err(ffi_error) => {
                                error!("❌ GET_PANELS_LIST FFI call failed: {}", ffi_error);
                                sync_logger
                                    .error(&format!("❌ GET_PANELS_LIST failed: {}", ffi_error));
                                Err(AppError::FfiError(format!(
                                    "GET_PANELS_LIST failed: {}",
                                    ffi_error
                                )))
                            }
                        }
                    }
                    Err(join_error) => {
                        error!("❌ GET_PANELS_LIST task failed: {}", join_error);
                        sync_logger
                            .error(&format!("❌ GET_PANELS_LIST task failed: {}", join_error));
                        Err(AppError::FfiError(format!(
                            "GET_PANELS_LIST task failed: {}",
                            join_error
                        )))
                    }
                }
            }
            Err(timeout_error) => {
                error!("❌ GET_PANELS_LIST timed out: {}", timeout_error);
                sync_logger.error(&format!("❌ GET_PANELS_LIST timed out: {}", timeout_error));
                Err(AppError::FfiError(format!(
                    "GET_PANELS_LIST timed out: {}",
                    timeout_error
                )))
            }
        }
    }

    /// Call T3000 C++ LOGGING_DATA function via FFI
    #[allow(dead_code)]
    async fn get_logging_data_via_ffi_static(config: &T3000MainConfig) -> Result<String, AppError> {
        info!("🔄 Starting FFI call to T3000_GetLoggingData");
        info!(
            "📋 FFI Config - Timeout: {}s, Retry: {}",
            config.timeout_seconds, config.retry_attempts
        );

        // Create sync logger for FFI operations
        let mut sync_logger = ServiceLogger::ffi().map_err(|e| {
            error!("Failed to create sync logger: {}", e);
            AppError::LoggerError(format!("Failed to create sync logger: {}", e))
        })?;

        // Log FFI call start to structured log
        sync_logger.info(&format!(
            "🔄 Starting FFI call to T3000_GetLoggingData (timeout: {}s)",
            config.timeout_seconds
        ));

        // Enhanced diagnostic logging for T3000 C++ integration
        sync_logger.info("🔧 Enhanced T3000 diagnostic and logging system active");
        sync_logger
            .info("⚡ Starting enhanced T3000 FFI call with comprehensive response data logging");

        // Run FFI call in a blocking task with timeout
        let spawn_result = tokio::time::timeout(
            Duration::from_secs(config.timeout_seconds),
            tokio::task::spawn_blocking(move || {
                info!("🔌 Calling T3000_GetLoggingData() via FFI...");

                // OLD APPROACH - DISABLED - Now using direct HandleWebViewMsg
                warn!("⚠️ Old T3000_GetLoggingData approach disabled - using HandleWebViewMsg instead");
                let err: Result<String, AppError> = Err(AppError::FfiError("Old FFI approach disabled - use HandleWebViewMsg".to_string()));
                return err;

                /*
                unsafe {
                    let data_ptr = T3000_GetLoggingData();

                    if data_ptr.is_null() {
                        error!("❌ T3000_GetLoggingData returned null pointer");
                        sync_logger.error("❌ T3000_GetLoggingData returned NULL - No data available or C++ function failed");
                        return Err(AppError::FfiError("T3000_GetLoggingData returned null pointer".to_string()));
                    }

                    info!("✅ T3000_GetLoggingData returned valid pointer");
                    sync_logger.info("✅ T3000_GetLoggingData returned valid pointer - Starting memory processing");

                    // Convert C string to Rust string
                    let c_str = CStr::from_ptr(data_ptr);
                    let result = c_str.to_string_lossy().to_string();

                    info!("📊 Raw C++ Response Size: {} bytes", result.len());

                    // Enhanced diagnostic check for test data
                    if result.contains("Test Device") || result.contains("test") ||
                       result.contains("mock") || result.contains("sample") {
                        warn!("⚠️  CRITICAL: C++ returned test/mock data instead of real device data!");
                        sync_logger.error(&format!("⚠️  CRITICAL DIAGNOSTIC: T3000_GetLoggingData() returned test data. Response size: {} bytes. This suggests:",
                            result.len()));
                        sync_logger.error("   1. No real T3000 devices are connected/responding");
                        sync_logger.error("   2. C++ function is returning fallback test data");
                        sync_logger.error("   3. T3000 network communication may be failing");
                        sync_logger.error("   4. Check T3000 device connectivity and C++ implementation");
                    }

                    info!("📝 Raw C++ Response Preview: {}",
                         if result.len() > 200 {
                             format!("{}...", &result[..200])
                         } else {
                             result.clone()
                         });

                    // Log complete raw C++ response to structured log for debugging
                    sync_logger.info(&format!("📊 Raw C++ Response FULL DATA ({} bytes):\n{}",
                                 result.len(), result));

                    // Also log the complete response for debugging
                    debug!("🔍 COMPLETE C++ RESPONSE:");
                    debug!("{}", result);

                    // Free the C++ allocated string
                    T3000_FreeLoggingDataString(data_ptr);
                    info!("🧹 C++ memory freed successfully");

                    Ok(result)
                }
                */
            })
        ).await;

        match spawn_result {
            Ok(join_result) => {
                match join_result {
                    Ok(ffi_result) => {
                        match ffi_result {
                            Ok(data) => {
                                info!(
                                    "✅ FFI call completed successfully - {} bytes received",
                                    data.len()
                                );

                                // Log FFI success to structured log with data size and preview
                                let preview = if data.len() > 200 {
                                    format!("{}...", &data[..200])
                                } else {
                                    data.clone()
                                };
                                sync_logger.info(&format!(
                                    "✅ FFI call completed - {} bytes received. Preview: {}",
                                    data.len(),
                                    preview
                                ));

                                Ok(data)
                            }
                            Err(e) => {
                                error!("❌ FFI call failed: {}", e);

                                // Log FFI error to structured log
                                sync_logger.error(&format!("❌ FFI call failed: {}", e));

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
    pub fn parse_logging_response(json_data: &str) -> Result<LoggingDataResponse, AppError> {
        info!("🔍 Starting JSON parsing - {} bytes", json_data.len());

        // Create sync logger for JSON parsing operations
        let mut sync_logger = match ServiceLogger::ffi() {
            Ok(logger) => logger,
            Err(e) => {
                error!("Failed to create sync logger: {}", e);
                return Err(AppError::LoggerError(format!(
                    "Failed to create sync logger: {}",
                    e
                )));
            }
        };

        // Log JSON parsing start to structured log
        sync_logger.info(&format!(
            "🔍 Starting JSON parsing - {} bytes",
            json_data.len()
        ));

        // Log full JSON response for diagnostic purposes
        info!("🔍 JSON Content Preview (FULL): {}", json_data);
        sync_logger.info(&format!("🔍 JSON Content Preview (FULL): {}", json_data));

        let json_value: JsonValue = serde_json::from_str(json_data).map_err(|e| {
            error!("❌ JSON parse error: {}", e);
            sync_logger.error(&format!("❌ JSON parse error: {}", e));
            AppError::ParseError(format!("Failed to parse LOGGING_DATA JSON: {}", e))
        })?;

        info!("✅ JSON parsed successfully");
        sync_logger.info("✅ JSON parsed successfully");

        let action = json_value
            .get("action")
            .and_then(|v| v.as_str())
            .unwrap_or("UNKNOWN")
            .to_string();

        info!("� Action: {}", action);

        // NEW STRUCTURE: Parse the updated JSON structure with device_data nested arrays
        // Expected structure:
        // {
        //   "action": "LOGGING_DATA_RES",
        //   "data": [
        //     {
        //       "panel_id": 1,
        //       "panel_name": "Device1",
        //       "panel_serial_number": 12345,
        //       "panel_ipaddress": "192.168.1.100",
        //       "input_logging_time": 123456,
        //       "output_logging_time": 123457,
        //       "variable_logging_time": 123458,
        //       "device_data": [ array of all points for this device ]
        //     },
        //     { ... next device }
        //   ]
        // }

        let mut all_devices = Vec::new();

        if let Some(data_array) = json_value.get("data").and_then(|v| v.as_array()) {
            info!("📱 Found {} devices in data array", data_array.len());

            sync_logger.info(&format!(
                "� Processing {} devices from C++ response",
                data_array.len()
            ));

            for (device_index, device_json) in data_array.iter().enumerate() {
                // Log raw device JSON for debugging (compact single-line format)
                let device_json_str = serde_json::to_string(device_json)
                    .unwrap_or_else(|_| "Invalid JSON".to_string());
                sync_logger.info(&format!(
                    "📋 Raw Device {} JSON: {}",
                    device_index + 1,
                    device_json_str
                ));

                // Extract device information from each device object
                let panel_serial_number_raw = device_json.get("panel_serial_number");
                let panel_serial_number = panel_serial_number_raw
                    .and_then(|v| v.as_i64())
                    .unwrap_or(0) as i32;

                // Log detailed parsing info
                sync_logger.info(&format!(
                    "🔍 Device {} parsing - panel_serial_number field: {:?} -> parsed value: {}",
                    device_index + 1,
                    panel_serial_number_raw,
                    panel_serial_number
                ));

                let mut device_info = DeviceInfo {
                    panel_id: device_json
                        .get("panel_id")
                        .and_then(|v| v.as_i64())
                        .unwrap_or(0) as i32,
                    panel_name: device_json
                        .get("panel_name")
                        .and_then(|v| v.as_str())
                        .unwrap_or("Unknown")
                        .to_string(),
                    panel_serial_number,
                    panel_ipaddress: device_json
                        .get("panel_ipaddress")
                        .and_then(|v| v.as_str())
                        .unwrap_or("0.0.0.0")
                        .to_string(),
                    input_logging_time: device_json
                        .get("input_logging_time")
                        .and_then(|v| v.as_i64())
                        .map(|t| t.to_string())
                        .unwrap_or("".to_string()),
                    output_logging_time: device_json
                        .get("output_logging_time")
                        .and_then(|v| v.as_i64())
                        .map(|t| t.to_string())
                        .unwrap_or("".to_string()),
                    variable_logging_time: device_json
                        .get("variable_logging_time")
                        .and_then(|v| v.as_i64())
                        .map(|t| t.to_string())
                        .unwrap_or("".to_string()),

                    // Initialize extended fields to None
                    ip_address: None,
                    port: None,
                    bacnet_mstp_mac_id: None,
                    modbus_address: None,
                    pc_ip_address: None,
                    modbus_port: None,
                    bacnet_ip_port: None,
                    show_label_name: None,
                    connection_type: None,
                };

                info!(
                    "🏠 Device {} - Panel ID: {}, Serial: {}, Name: '{}', IP: {}",
                    device_index + 1,
                    device_info.panel_id,
                    device_info.panel_serial_number,
                    device_info.panel_name,
                    device_info.panel_ipaddress
                );

                sync_logger.info(&format!(
                    "🏠 Device {} - Panel ID: {}, Serial: {}, Name: '{}', IP: {}",
                    device_index + 1,
                    device_info.panel_id,
                    device_info.panel_serial_number,
                    device_info.panel_name,
                    device_info.panel_ipaddress
                ));

                // Try to get extended device configuration using new FFI functions
                Self::populate_extended_device_info(&mut device_info);

                // Parse point data from the "device_data" array for this device
                let mut input_points = Vec::new();
                let mut output_points = Vec::new();
                let mut variable_points = Vec::new();

                if let Some(device_data_array) =
                    device_json.get("device_data").and_then(|v| v.as_array())
                {
                    info!(
                        "📊 Device {} has {} data points",
                        device_index + 1,
                        device_data_array.len()
                    );
                    sync_logger.info(&format!(
                        "📊 Device {} has {} data points",
                        device_index + 1,
                        device_data_array.len()
                    ));

                    for (point_index, point_json) in device_data_array.iter().enumerate() {
                        if let Some(point_type) = point_json.get("type").and_then(|v| v.as_str()) {
                            let point_index_value = point_json
                                .get("index")
                                .and_then(|v| v.as_u64())
                                .unwrap_or(0);
                            debug!(
                                "🔸 Device {} Point {}: type={}, index={}",
                                device_index + 1,
                                point_index,
                                point_type,
                                point_index_value
                            );

                            match Self::parse_point_data(point_json) {
                                Ok(point_data) => match point_type {
                                    "INPUT" => {
                                        input_points.push(point_data);
                                        debug!(
                                            "✅ Added INPUT point {} for device {}",
                                            point_index_value,
                                            device_index + 1
                                        );
                                    }
                                    "OUTPUT" => {
                                        output_points.push(point_data);
                                        debug!(
                                            "✅ Added OUTPUT point {} for device {}",
                                            point_index_value,
                                            device_index + 1
                                        );
                                    }
                                    "VARIABLE" => {
                                        variable_points.push(point_data);
                                        debug!(
                                            "✅ Added VARIABLE point {} for device {}",
                                            point_index_value,
                                            device_index + 1
                                        );
                                    }
                                    _ => warn!("⚠️  Unknown point type: {}", point_type),
                                },
                                Err(e) => {
                                    warn!(
                                        "⚠️  Failed to parse point {} for device {}: {}",
                                        point_index,
                                        device_index + 1,
                                        e
                                    );
                                }
                            }
                        } else {
                            warn!(
                                "⚠️  Point {} for device {} missing 'type' field",
                                point_index,
                                device_index + 1
                            );
                        }
                    }
                } else {
                    warn!("⚠️  Device {} has no 'device_data' array", device_index + 1);
                }

                info!(
                    "📈 Device {} Points Summary - INPUT: {}, OUTPUT: {}, VARIABLE: {}",
                    device_index + 1,
                    input_points.len(),
                    output_points.len(),
                    variable_points.len()
                );

                sync_logger.info(&format!(
                    "📈 Device {} Points Summary - INPUT: {}, OUTPUT: {}, VARIABLE: {}",
                    device_index + 1,
                    input_points.len(),
                    output_points.len(),
                    variable_points.len()
                ));

                let device_with_points = DeviceWithPoints {
                    device_info,
                    input_points,
                    output_points,
                    variable_points,
                };

                all_devices.push(device_with_points);
            }
        } else {
            warn!("⚠️  No 'data' array found in response - trying legacy single device format");

            sync_logger.warn("⚠️  No 'data' array found - attempting legacy single device parsing");

            // Fallback to legacy single device format for backwards compatibility
            let mut device_info = DeviceInfo {
                panel_id: json_value
                    .get("panel_id")
                    .and_then(|v| v.as_i64())
                    .unwrap_or(0) as i32,
                panel_name: json_value
                    .get("panel_name")
                    .and_then(|v| v.as_str())
                    .unwrap_or("Unknown")
                    .to_string(),
                panel_serial_number: json_value
                    .get("panel_serial_number")
                    .and_then(|v| v.as_i64())
                    .unwrap_or(0) as i32,
                panel_ipaddress: json_value
                    .get("panel_ipaddress")
                    .and_then(|v| v.as_str())
                    .unwrap_or("0.0.0.0")
                    .to_string(),
                input_logging_time: json_value
                    .get("input_logging_time")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string(),
                output_logging_time: json_value
                    .get("output_logging_time")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string(),
                variable_logging_time: json_value
                    .get("variable_logging_time")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string(),

                ip_address: None,
                port: None,
                bacnet_mstp_mac_id: None,
                modbus_address: None,
                pc_ip_address: None,
                modbus_port: None,
                bacnet_ip_port: None,
                show_label_name: None,
                connection_type: None,
            };

            Self::populate_extended_device_info(&mut device_info);

            let device_with_points = DeviceWithPoints {
                device_info,
                input_points: Vec::new(),
                output_points: Vec::new(),
                variable_points: Vec::new(),
            };

            all_devices.push(device_with_points);
        }

        info!(
            "✅ Logging response parsing completed successfully - {} devices processed",
            all_devices.len()
        );

        sync_logger.info(&format!(
            "✅ Multi-device parsing completed - {} devices processed",
            all_devices.len()
        ));

        Ok(LoggingDataResponse {
            action,
            devices: all_devices,
            timestamp: chrono::Utc::now().to_rfc3339(),
        })
    }

    /// Parse individual point data from C++ JSON structure
    fn parse_point_data(point_json: &JsonValue) -> Result<PointData, AppError> {
        let point_data = PointData {
            index: point_json
                .get("index")
                .and_then(|v| v.as_u64())
                .unwrap_or(0) as u32,
            panel: point_json.get("pid").and_then(|v| v.as_i64()).unwrap_or(0) as i32,
            full_label: point_json
                .get("description")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string(),
            auto_manual: point_json
                .get("auto_manual")
                .and_then(|v| v.as_i64())
                .unwrap_or(0) as i32,
            value: point_json
                .get("value")
                .and_then(|v| v.as_f64())
                .unwrap_or(0.0),
            pid: point_json.get("pid").and_then(|v| v.as_i64()).unwrap_or(0) as i32,
            units: point_json
                .get("unit")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string(),
            range: point_json
                .get("range")
                .and_then(|v| v.as_i64())
                .unwrap_or(0) as i32,
            calibration: point_json
                .get("calibration_h")
                .and_then(|v| v.as_f64())
                .unwrap_or(0.0),
            sign: point_json
                .get("calibration_sign")
                .and_then(|v| v.as_i64())
                .unwrap_or(0) as i32,
            status: point_json
                .get("decom")
                .and_then(|v| v.as_i64())
                .unwrap_or(0) as i32,
            timestamp: chrono::Utc::now().to_rfc3339(),
            label: point_json
                .get("label")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string()),

            // INPUT specific fields
            decom: point_json
                .get("decom")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string()),
            sub_product: None,
            sub_id: None,
            sub_panel: None,
            network_number: None,
            description: point_json
                .get("description")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string()),
            digital_analog: point_json
                .get("digital_analog")
                .and_then(|v| v.as_i64())
                .map(|v| v as i32),
            filter: point_json
                .get("filter")
                .and_then(|v| v.as_i64())
                .map(|v| v as i32),
            control: point_json
                .get("control")
                .and_then(|v| v.as_i64())
                .map(|v| v as i32),
            command: point_json
                .get("command")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string()),
            id: point_json
                .get("id")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string()),
            calibration_l: point_json.get("calibration_l").and_then(|v| v.as_f64()),

            // OUTPUT specific fields
            low_voltage: point_json.get("low_voltage").and_then(|v| v.as_f64()),
            high_voltage: point_json.get("high_voltage").and_then(|v| v.as_f64()),
            hw_switch_status: point_json
                .get("hw_switch_status")
                .and_then(|v| v.as_i64())
                .map(|v| v as i32),

            // VARIABLE specific fields
            unused: point_json
                .get("unused")
                .and_then(|v| v.as_i64())
                .map(|v| v as i32),
        };

        Ok(point_data)
    }

    /// Sync input point data (UPSERT: INSERT or UPDATE)
    async fn sync_input_point_static(
        txn: &DatabaseTransaction,
        serial_number: i32,
        point: &PointData,
    ) -> Result<(), AppError> {
        let mut sync_logger = ServiceLogger::ffi()
            .map_err(|e| AppError::LoggerError(format!("Failed to create sync logger: {}", e)))?;

        // Check if input point exists using the new Input_Index column name
        let existing = input_points::Entity::find()
            .filter(input_points::Column::SerialNumber.eq(serial_number))
            .filter(input_points::Column::InputIndex.eq(Some(point.index.to_string())))
            .one(txn)
            .await
            .map_err(|e| AppError::DatabaseError(format!("Failed to query input point: {}", e)))?;

        // Derive units from range field
        let derived_units = Self::derive_units_from_range(point.range);

        let input_model = input_points::ActiveModel {
            serial_number: Set(serial_number),
            input_id: Set(point.id.clone()), // New InputId field from JSON "id" field
            input_index: Set(Some(point.index.to_string())), // Updated column name to Input_Index
            panel: Set(Some(point.panel.to_string())),
            full_label: Set(Some(point.full_label.clone())),
            auto_manual: Set(Some(point.auto_manual.to_string())),
            f_value: Set(Some(point.value.to_string())),
            units: Set(Some(derived_units.clone())), // Use derived units from range
            range_field: Set(Some(point.range.to_string())),
            calibration: Set(Some(point.calibration.to_string())),
            sign: Set(Some(point.sign.to_string())),
            status: Set(Some(point.status.to_string())),
            filter_field: Set(point.control.map(|c| c.to_string())),
            digital_analog: Set(point.digital_analog.map(|da| da.to_string())),
            label: Set(point.label.clone()),
            type_field: Set(point.command.clone()),
        };

        match existing {
            Some(_) => {
                // UPDATE existing input point
                info!(
                    "🔄 Updating existing INPUT point {}:{} - ID: {:?}, Label: '{}'",
                    serial_number, point.index, point.id, point.full_label
                );

                let _update_result = input_points::Entity::update(input_model)
                    .filter(input_points::Column::SerialNumber.eq(serial_number))
                    .filter(input_points::Column::InputIndex.eq(Some(point.index.to_string())))
                    .exec(txn).await
                    .map_err(|e| {
                        sync_logger.error(&format!(
                            "❌ INPUT UPDATE failed - Serial: {}, ID: {:?}, Index: {}, Label: '{}', Value: {}, Units: '{}', Error: {}",
                            serial_number, point.id, point.index, point.full_label, point.value, derived_units, e
                        ));
                        AppError::DatabaseError(format!("Failed to update input point: {}", e))
                    })?;

                info!("✅ INPUT point {}:{} UPDATED", serial_number, point.index);
                sync_logger.info(&format!(
                    "✅ INPUT UPDATE successful - Serial: {}, ID: {:?}, Index: {}, Label: '{}', Value: {}, Units: '{}'",
                    serial_number, point.id, point.index, point.full_label, point.value, derived_units
                ));
                Ok(())
            }
            None => {
                // INSERT new input point
                info!(
                    "➕ Inserting new INPUT point {}:{} - ID: {:?}, Label: '{}'",
                    serial_number, point.index, point.id, point.full_label
                );

                let insert_result = input_points::Entity::insert(input_model)
                    .exec(txn).await
                    .map_err(|e| {
                        sync_logger.error(&format!(
                            "❌ INPUT INSERT failed - Serial: {}, ID: {:?}, Index: {}, Label: '{}', Value: {}, Units: '{}', Error: {}",
                            serial_number, point.id, point.index, point.full_label, point.value, derived_units, e
                        ));
                        AppError::DatabaseError(format!("Failed to insert input point: {}", e))
                    })?;

                info!("✅ INPUT point {}:{} INSERTED", serial_number, point.index);
                sync_logger.info(&format!(
                    "✅ INPUT INSERT successful - Serial: {}, ID: {:?}, Index: {}, Label: '{}', Value: {}, Units: '{}', Last insert ID: {}",
                    serial_number, point.id, point.index, point.full_label, point.value, derived_units, insert_result.last_insert_id
                ));
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
        let mut sync_logger = ServiceLogger::ffi()
            .map_err(|e| AppError::LoggerError(format!("Failed to create sync logger: {}", e)))?;

        // Check if output point exists using the new Output_Index column name
        let existing = output_points::Entity::find()
            .filter(output_points::Column::SerialNumber.eq(serial_number))
            .filter(output_points::Column::OutputIndex.eq(Some(point.index.to_string())))
            .one(txn)
            .await
            .map_err(|e| AppError::DatabaseError(format!("Failed to query output point: {}", e)))?;

        // Derive units from range field
        let derived_units = Self::derive_units_from_range(point.range);

        let output_model = output_points::ActiveModel {
            serial_number: Set(serial_number),
            output_id: Set(point.id.clone()), // New OutputId field from JSON "id" field
            output_index: Set(Some(point.index.to_string())), // Updated column name to Output_Index
            panel: Set(Some(point.panel.to_string())),
            full_label: Set(Some(point.full_label.clone())),
            auto_manual: Set(Some(point.auto_manual.to_string())),
            f_value: Set(Some(point.value.to_string())),
            units: Set(Some(derived_units.clone())), // Use derived units from range
            range_field: Set(Some(point.range.to_string())),
            calibration: Set(Some(point.calibration.to_string())),
            sign: Set(Some(point.sign.to_string())),
            status: Set(Some(point.status.to_string())),
            filter_field: Set(point.control.map(|c| c.to_string())),
            digital_analog: Set(point.digital_analog.map(|da| da.to_string())),
            label: Set(point.label.clone()),
            type_field: Set(point.command.clone()),
        };

        match existing {
            Some(_) => {
                // UPDATE existing output point
                info!(
                    "🔄 Updating existing OUTPUT point {}:{} - ID: {:?}, Label: '{}'",
                    serial_number, point.index, point.id, point.full_label
                );

                let _update_result = output_points::Entity::update(output_model)
                    .filter(output_points::Column::SerialNumber.eq(serial_number))
                    .filter(output_points::Column::OutputIndex.eq(Some(point.index.to_string())))
                    .exec(txn).await
                    .map_err(|e| {
                        sync_logger.error(&format!(
                            "❌ OUTPUT UPDATE failed - Serial: {}, ID: {:?}, Index: {}, Label: '{}', Value: {}, Units: '{}', Error: {}",
                            serial_number, point.id, point.index, point.full_label, point.value, derived_units, e
                        ));
                        AppError::DatabaseError(format!("Failed to update output point: {}", e))
                    })?;

                info!("✅ OUTPUT point {}:{} UPDATED", serial_number, point.index);
                sync_logger.info(&format!(
                    "✅ OUTPUT UPDATE successful - Serial: {}, ID: {:?}, Index: {}, Label: '{}', Value: {}, Units: '{}'",
                    serial_number, point.id, point.index, point.full_label, point.value, derived_units
                ));
                Ok(())
            }
            None => {
                // INSERT new output point
                info!(
                    "➕ Inserting new OUTPUT point {}:{} - ID: {:?}, Label: '{}'",
                    serial_number, point.index, point.id, point.full_label
                );

                let insert_result = output_points::Entity::insert(output_model)
                    .exec(txn).await
                    .map_err(|e| {
                        sync_logger.error(&format!(
                            "❌ OUTPUT INSERT failed - Serial: {}, ID: {:?}, Index: {}, Label: '{}', Value: {}, Units: '{}', Error: {}",
                            serial_number, point.id, point.index, point.full_label, point.value, derived_units, e
                        ));
                        AppError::DatabaseError(format!("Failed to insert output point: {}", e))
                    })?;

                info!("✅ OUTPUT point {}:{} INSERTED", serial_number, point.index);
                sync_logger.info(&format!(
                    "✅ OUTPUT INSERT successful - Serial: {}, ID: {:?}, Index: {}, Label: '{}', Value: {}, Units: '{}', Last insert ID: {}",
                    serial_number, point.id, point.index, point.full_label, point.value, derived_units, insert_result.last_insert_id
                ));
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
        let mut sync_logger = ServiceLogger::ffi()
            .map_err(|e| AppError::LoggerError(format!("Failed to create sync logger: {}", e)))?;

        // Check if variable point exists using the new Variable_Index column name
        let existing = variable_points::Entity::find()
            .filter(variable_points::Column::SerialNumber.eq(serial_number))
            .filter(variable_points::Column::VariableIndex.eq(Some(point.index.to_string())))
            .one(txn)
            .await
            .map_err(|e| {
                AppError::DatabaseError(format!("Failed to query variable point: {}", e))
            })?;

        // Derive units from range field
        let derived_units = Self::derive_units_from_range(point.range);

        let variable_model = variable_points::ActiveModel {
            serial_number: Set(serial_number),
            variable_id: Set(point.id.clone()), // New VariableId field from JSON "id" field
            variable_index: Set(Some(point.index.to_string())), // Updated column name to Variable_Index
            panel: Set(Some(point.pid.to_string())),
            full_label: Set(Some(point.full_label.clone())),
            auto_manual: Set(Some(point.auto_manual.to_string())),
            f_value: Set(Some(point.value.to_string())),
            units: Set(Some(derived_units.clone())), // Use derived units from range
            range_field: Set(Some(point.range.to_string())),
            calibration: Set(Some(point.calibration.to_string())),
            sign: Set(Some(point.sign.to_string())),
            filter_field: Set(point.control.map(|c| c.to_string())),
            status: Set(Some(point.status.to_string())),
            digital_analog: Set(point.digital_analog.map(|da| da.to_string())),
            label: Set(point.label.clone()),
            type_field: Set(point.command.clone()),
        };

        match existing {
            Some(_) => {
                // UPDATE existing variable point
                info!(
                    "🔄 Updating existing VARIABLE point {}:{} - ID: {:?}, Label: '{}'",
                    serial_number, point.index, point.id, point.full_label
                );

                let _update_result = variable_points::Entity::update(variable_model)
                    .filter(variable_points::Column::SerialNumber.eq(serial_number))
                    .filter(variable_points::Column::VariableIndex.eq(Some(point.index.to_string())))
                    .exec(txn).await
                    .map_err(|e| {
                        sync_logger.error(&format!(
                            "❌ VARIABLE UPDATE failed - Serial: {}, ID: {:?}, Index: {}, Label: '{}', Value: {}, Units: '{}', Error: {}",
                            serial_number, point.id, point.index, point.full_label, point.value, derived_units, e
                        ));
                        AppError::DatabaseError(format!("Failed to update variable point: {}", e))
                    })?;

                info!(
                    "✅ VARIABLE point {}:{} UPDATED",
                    serial_number, point.index
                );
                sync_logger.info(&format!(
                    "✅ VARIABLE UPDATE successful - Serial: {}, ID: {:?}, Index: {}, Label: '{}', Value: {}, Units: '{}'",
                    serial_number, point.id, point.index, point.full_label, point.value, derived_units
                ));
                Ok(())
            }
            None => {
                // INSERT new variable point
                info!(
                    "➕ Inserting new VARIABLE point {}:{} - ID: {:?}, Label: '{}'",
                    serial_number, point.index, point.id, point.full_label
                );

                let insert_result = variable_points::Entity::insert(variable_model)
                    .exec(txn).await
                    .map_err(|e| {
                        sync_logger.error(&format!(
                            "❌ VARIABLE INSERT failed - Serial: {}, ID: {:?}, Index: {}, Label: '{}', Value: {}, Units: '{}', Error: {}",
                            serial_number, point.id, point.index, point.full_label, point.value, derived_units, e
                        ));
                        AppError::DatabaseError(format!("Failed to insert variable point: {}", e))
                    })?;

                info!(
                    "✅ VARIABLE point {}:{} INSERTED",
                    serial_number, point.index
                );
                sync_logger.info(&format!(
                    "✅ VARIABLE INSERT successful - Serial: {}, ID: {:?}, Index: {}, Label: '{}', Value: {}, Units: '{}', Last insert ID: {}",
                    serial_number, point.id, point.index, point.full_label, point.value, derived_units, insert_result.last_insert_id
                ));
                Ok(())
            }
        }
    }

    /// Insert trend log data (always INSERT, never UPDATE for historical data)
    #[allow(dead_code)]
    async fn insert_trend_log_static(
        txn: &DatabaseTransaction,
        serial_number: i32,
        panel_id: i32,
        point: &PointData,
        point_type: &str,
        logging_time: &str,
        _sync_metadata_id: i32,
    ) -> Result<usize, AppError> {
        let units = Self::derive_units_from_range(point.range);

        // Generate point_id from JSON or fallback
        let point_id = point
            .id
            .clone()
            .unwrap_or_else(|| format!("{}{}", point_type, point.index));

        // Create parent key
        let parent_key = ParentKey {
            serial_number,
            panel_id,
            point_id: point_id.clone(),
            point_index: point.index as i32,
            point_type: point_type.to_string(),
        };

        // Get or create parent record using cache
        let parent_id = get_trendlog_cache()
            .get_or_create_parent(
                txn,
                parent_key,
                point.digital_analog.map(|da| da.to_string()),
                Some(point.range.to_string()),
                Some(units),
            )
            .await?;

        // Insert detail record with time-series data
        let detail_model = trendlog_data_detail::ActiveModel {
            parent_id: Set(parent_id),
            value: Set(point.value.to_string()),
            logging_time_fmt: Set(Self::format_unix_timestamp_to_local(logging_time)),
        };

        trendlog_data_detail::Entity::insert(detail_model)
            .exec(txn)
            .await
            .map_err(|e| {
                AppError::DatabaseError(format!("Failed to insert trend log detail: {}", e))
            })?;

        Ok(1)
    }
}

/// Global service management
impl T3000MainService {
    /// Initialize the global T3000 main service
    pub async fn initialize(config: T3000MainConfig) -> Result<(), AppError> {
        let service = Arc::new(Self::new(config).await?);

        MAIN_SERVICE.set(service.clone()).map_err(|_| {
            AppError::InitializationError("T3000 main service already initialized".to_string())
        })?;

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
    #[allow(dead_code)]
    async fn check_t3000_system() -> Result<(), AppError> {
        // NOTE: T3000 initialization functions (T3000_Initialize, T3000_ScanForDevices, etc.)
        // are not available in the current T3000 export library.
        // The system will use T3000_GetLoggingData() directly, which should work
        // if the T3000 C++ system is already initialized by the main application.

        if let Ok(mut sync_logger) = ServiceLogger::ffi() {
            sync_logger.info("💡 T3000 initialization functions not available - Using direct T3000_GetLoggingData() call");
            sync_logger.info("📋 Assuming T3000 C++ system is initialized by main application");
        }

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
        Err(AppError::ServiceError(
            "T3000 main service not initialized".to_string(),
        ))
    }
}

pub async fn start_logging_sync() -> Result<(), AppError> {
    if let Some(service) = get_logging_service() {
        service.start_sync_service().await
    } else {
        Err(AppError::ServiceError(
            "T3000 main service not initialized".to_string(),
        ))
    }
}

pub fn stop_logging_sync() -> Result<(), AppError> {
    if let Some(service) = get_logging_service() {
        service.stop_sync_service();
        Ok(())
    } else {
        Err(AppError::ServiceError(
            "T3000 main service not initialized".to_string(),
        ))
    }
}

pub fn is_logging_service_running() -> bool {
    get_logging_service()
        .map(|service| service.is_running())
        .unwrap_or(false)
}
