// T3000 Main Service - Primary T3000 Building Automation Integration
// This is the main service that handles all T3000 functionality:
// - FFI calls to T3000 C++ functions (T3000_GetLoggingData)
// - Real-time data synchronization
// - Device discovery and management
// - WebSocket broadcasting for live updates
// - Database synchronization to webview_t3_device.db

use crate::db_connection::{establish_t3_device_connection, establish_device_conn_for_sync};
use crate::entity::t3_device::{
    devices, input_points, output_points, trendlog_data_detail, trendlog_data_sync_metadata,
    variable_points,
};
use crate::database_management::data_sync_service::{DataSyncMetadataService, InsertSyncMetadataRequest};
use crate::database_management::mssql_queries;
use crate::error::AppError;
use crate::logger::ServiceLogger;
use crate::t3_device::trendlog_parent_cache::{ParentKey, TrendlogParentCache};
use once_cell::sync::OnceCell;
use sea_orm::*;
use sea_orm::sea_query::Expr;
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use std::env;
use std::ffi::CString;
use std::os::raw::c_char;
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc,
};
use std::time::{Duration, Instant};
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
static FFI_STARTUP_AT: OnceCell<Instant> = OnceCell::new();
const FFI_MIN_STARTUP_DELAY_SECS: u64 = 30;
/// Guards one-time T3000.exe load result write to Activity Log
static T3000_LOAD_LOGGED: AtomicBool = AtomicBool::new(false);

// Load the BacnetWebView_HandleWebViewMsg function from the current executable (T3000.exe)
pub unsafe fn load_t3000_function() -> bool {
    // Global startup guard for all FFI callers (not only sync service).
    // Runtime logs showed Action 4 (GET_PANELS_LIST) can be called before the sync service delay,
    // which can still hit C++ vector bounds assertions during T3000 startup.
    let startup_at = FFI_STARTUP_AT.get_or_init(Instant::now);
    let elapsed = startup_at.elapsed();
    if elapsed < Duration::from_secs(FFI_MIN_STARTUP_DELAY_SECS) {
        let wait = Duration::from_secs(FFI_MIN_STARTUP_DELAY_SECS) - elapsed;

        use crate::logger::ServiceLogger;
        let mut init_logger = ServiceLogger::initialize()
            .unwrap_or_else(|_| ServiceLogger::new("fallback_init").unwrap());
        init_logger.warn(&format!(
            "⏳ FFI startup guard active: waiting {} ms before first C++ call",
            wait.as_millis()
        ));

        std::thread::sleep(wait);
    }

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
    // Acquire the global FFI serialization lock (shared with HTTP endpoint and trendlog refresh).
    // This prevents concurrent C++ calls which crash the non-reentrant T3000 FFI.
    let _guard = crate::t3_device::t3_ffi_api_service::ffi_call_lock()
        .lock()
        .unwrap_or_else(|p| p.into_inner());
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
    // Share the same global lock used by all HandleWebViewMsg entry points.
    // These FFI functions are also non-reentrant in T3000.exe.
    let _guard = crate::t3_device::t3_ffi_api_service::ffi_call_lock()
        .lock()
        .unwrap_or_else(|p| p.into_inner());
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
    // Share the same global lock used by all HandleWebViewMsg entry points.
    // These FFI functions are also non-reentrant in T3000.exe.
    let _guard = crate::t3_device::t3_ffi_api_service::ffi_call_lock()
        .lock()
        .unwrap_or_else(|p| p.into_inner());
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
            sync_interval_secs: 300, // Unified default: 5 minutes (matching config_api.rs)
            timeout_seconds: 30,     // 30 seconds FFI timeout
            retry_attempts: 3,
            auto_start: true,
        }
    }
}

/// PanelInfo structure for lightweight device list from GET_PANELS_LIST
/// Used to get list of available devices before loading full LOGGING_DATA
#[allow(dead_code)]
#[derive(Debug, Clone)]
struct PanelInfo {
    panel_number: i32,
    serial_number: i32,
    panel_name: String,
    pid: Option<i32>,              // Product ID from GET_PANELS_LIST
    object_instance: Option<i32>,  // BACnet object instance (used for MSTP MAC ID)
    online_time: Option<i64>,      // Last online timestamp
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

/// Clean C++ buffer garbage: remove null bytes, control characters, and everything after
fn clean_cpp_string(input: &str, fallback: &str) -> String {
    let cleaned = input
        .split('\0')
        .next()
        .unwrap_or("")
        .chars()
        .filter(|c| {
            // Keep only printable ASCII and common whitespace
            c.is_ascii_graphic() || *c == ' ' || *c == '\t'
        })
        .collect::<String>()
        .trim()
        .to_string();

    if cleaned.is_empty() {
        fallback.to_string()
    } else {
        cleaned
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
    pub calibration_l: Option<i32>,
    pub calibration_h: Option<i32>,

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
    async fn insert_data_sync_metadata(
        writer: &super::sync_writer::SyncWriter,
        local_db: &sea_orm::DatabaseConnection,
        data_type: &str,
        serial_number: &str,
        panel_id: Option<i32>,
        records_synced: i32,
        success: bool,
        error_message: Option<String>,
    ) -> Result<(), AppError> {
        let now = chrono::Utc::now();
        let sync_time_i64 = now.timestamp();
        let sync_time_i32 = if sync_time_i64 > i32::MAX as i64 {
            i32::MAX
        } else {
            sync_time_i64 as i32
        };
        let sync_time_fmt = now.format("%Y-%m-%d %H:%M:%S").to_string();

        match writer {
            super::sync_writer::SyncWriter::Sqlite(db) => {
                let req = InsertSyncMetadataRequest {
                    data_type: data_type.to_string(),
                    serial_number: serial_number.to_string(),
                    panel_id,
                    records_synced,
                    sync_method: "FFI_BACKEND".to_string(),
                    success,
                    error_message,
                };
                DataSyncMetadataService::insert_sync_metadata(db, req)
                    .await
                    .map_err(|e| AppError::DatabaseError(e.to_string()))?;
            }
            super::sync_writer::SyncWriter::MssqlDirect(pool) => {
                mssql_queries::insert_sync_metadata(
                    pool,
                    sync_time_i32,
                    &sync_time_fmt,
                    data_type,
                    serial_number,
                    panel_id,
                    records_synced,
                    "FFI_BACKEND",
                    if success { 1 } else { 0 },
                    error_message.as_deref(),
                )
                .await
                .map_err(AppError::DatabaseError)?;

                // Mirror to local SQLite so the dashboard (sync_health reads
                // DATA_SYNC_METADATA from local SQLite) can show "Last Sync"
                // and "Devices Today" even when the primary target is MSSQL.
                let req = InsertSyncMetadataRequest {
                    data_type: data_type.to_string(),
                    serial_number: serial_number.to_string(),
                    panel_id,
                    records_synced,
                    sync_method: "FFI_BACKEND".to_string(),
                    success,
                    error_message,
                };
                let _ = DataSyncMetadataService::insert_sync_metadata(local_db, req).await;
            }
        }

        Ok(())
    }

    pub async fn new(config: T3000MainConfig) -> Result<Self, AppError> {
        let db = establish_device_conn_for_sync().await?;

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

        // Write a startup entry immediately to local SQLite so the Activity Log
        // is never empty right after the binary starts.  SERVER_EVENT always
        // goes to local SQLite regardless of center-DB mode.
        let server_cfg = crate::ini_config::read_server_db_config_auto();
        let center_db_note = if server_cfg.enabled {
            format!("center_db=enabled role={}", server_cfg.role)
        } else {
            "center_db=disabled (standalone)".to_string()
        };
        crate::database_management::sync_health::ensure_app_log_table(&self.db).await;
        crate::logging::service::emit_app_log(
            &self.db,
            "info",
            "STARTUP",
            Some("ffi_sync"),
            None,
            "FFI sync service started — waiting for T3000.exe initialization",
            Some(&format!(
                "sync_interval_secs={} {}",
                self.config.sync_interval_secs, center_db_note
            )),
        )
        .await;

        let mut config = self.config.clone(); // Make config mutable for dynamic reload
        let is_running = self.is_running.clone();
        // Clone the already-open local DB connection so we can write startup log
        // entries from inside the spawn without needing to re-establish (which
        // returns Box<dyn Error>, not Send, and would fail tokio::spawn).
        let spawn_db = self.db.clone();

        tokio::spawn(async move {
            // Create logger for the spawned task
            let mut task_logger = ServiceLogger::ffi()
                .unwrap_or_else(|_| ServiceLogger::new("fallback_ffi").unwrap());

            // DELAY: Wait 30 seconds on first startup to let T3000.exe fully initialize.
            // HandleWebViewMsg accesses g_Input_data[panel_id] and g_Output_data[panel_id]
            // which are only populated in CDialogCM5_BacNet::OnInitialUpdate(). That runs
            // after m_pMainWnd is set, so IsAppInitialized() alone does not guarantee
            // these vectors are ready. Calling too early causes a C++ "vector subscript
            // out of range" assertion that crashes the application.
            task_logger.info("⏱️ Waiting 30 seconds for T3000.exe to fully initialize (g_Input_data/g_Output_data must be populated)...");
            sleep(Duration::from_secs(30)).await;
            task_logger.info("✅ Initialization delay completed, starting sync...");

            // Write a "T3000.exe ready" entry to local SQLite — this appears in the
            // Activity Log before the first full sync cycle lands in MSSQL.
            // Uses the pre-cloned connection captured before the spawn (avoids
            // re-establishing, which is not Send).
            crate::logging::service::emit_app_log(
                &spawn_db,
                "info",
                "STARTUP",
                Some("ffi_sync"),
                None,
                "T3000.exe initialization complete — starting first sync cycle",
                None,
            )
            .await;

            // Run immediate sync on startup with full rediscovery
            task_logger.info("🏃 Performing immediate startup sync with full rediscovery...");
            let startup_sync_ok = if let Err(e) = Self::sync_logging_data_static(config.clone()).await {
                task_logger.error(&format!("❌ Immediate startup sync failed: {}", e));
                // Also log critical errors to Initialize category
                if let Ok(mut init_logger) = ServiceLogger::initialize() {
                    init_logger.error(&format!("Immediate startup sync failed: {}", e));
                }
                false
            } else {
                task_logger.info("✅ Immediate startup sync completed successfully");
                true
            };

            // Sync trendlog configurations for all devices (ONE-TIME at startup)
            task_logger.info("📊 Syncing trendlog configurations for all devices...");
            if let Err(e) = Self::sync_all_trendlog_configs().await {
                task_logger.error(&format!("❌ Trendlog config sync failed: {}", e));
            } else {
                task_logger.info("✅ Trendlog config sync completed successfully");
            }

            // If startup sync failed, retry once after a short delay before entering the normal 900s cycle.
            // This avoids waiting 900s when T3000 just needed a bit more time to initialize.
            if !startup_sync_ok && is_running.load(Ordering::Relaxed) {
                task_logger.info("🔄 Startup sync failed — retrying in 60 seconds (short retry before normal 900s cycle)...");
                sleep(Duration::from_secs(60)).await;
                if is_running.load(Ordering::Relaxed) {
                    task_logger.info("🔄 Short retry: Calling sync_logging_data_static...");
                    if let Err(e) = Self::sync_logging_data_static(config.clone()).await {
                        task_logger.error(&format!("❌ Short retry sync also failed: {}", e));
                    } else {
                        task_logger.info("✅ Short retry sync succeeded");
                    }
                }
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
                    let old_interval = config.sync_interval_secs;
                    task_logger.info(&format!(
                        "🔄 Sync interval updated: {}s ({} min) → {}s ({} min)",
                        config.sync_interval_secs,
                        config.sync_interval_secs / 60,
                        current_sync_interval,
                        current_sync_interval / 60
                    ));
                    config.sync_interval_secs = current_sync_interval;
                    // Activity Log: interval change
                    let new_interval = current_sync_interval;
                    tokio::spawn(async move {
                        if let Ok(db) = establish_t3_device_connection().await.map_err(|e| e.to_string()) {
                            crate::logging::service::emit_app_log(
                                &db, "info", "POLL", Some("ffi_sync"), None,
                                &format!("Sync interval changed: {}s -> {}s", old_interval, new_interval),
                                None,
                            ).await;
                        }
                    });
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

                // Perform periodic logging data sync — errors are logged but never stop the service
                if is_running.load(Ordering::Relaxed) {
                    if let Err(e) = Self::sync_logging_data_static(config.clone()).await {
                        task_logger.error(&format!("❌ Periodic sync failed: {} — will retry next cycle", e));
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

        // Get database connection (center DB when enabled, else local SQLite)
        let db = establish_device_conn_for_sync().await?;

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
            // Use panel_number (Panel_Number column) as primary source, fall back to panel_id (PanelId column)
            let panel_id = device.panel_number.or(device.panel_id).unwrap_or(0);
            let serial_number = device.serial_number;

            if panel_id == 0 {
                sync_logger.warn(&format!(
                    "⚠️ Skipping device {} - invalid panel_id (both Panel_Number and PanelId are empty)",
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
                            .map(|s| clean_cpp_string(s, "(Unknown)")); // Keep "(Unknown)" as-is from C++

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
                device_info.show_label_name = Some(clean_cpp_string(&device_info.panel_name, "(Unknown)")); // Keep "(Unknown)" as-is from C++
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
                device_info.show_label_name = Some(clean_cpp_string(&device_info.panel_name, "(Unknown)")); // Keep "(Unknown)" as-is from C++
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
    ///
    /// Write path is chosen automatically at the start of each cycle:
    /// - MSSQL pool present → writes directly to MSSQL center DB (SyncWriter::MssqlDirect)
    /// - Otherwise         → writes to local SQLite or SeaORM center DB (SyncWriter::Sqlite)
    async fn try_auto_resume_sampling(local_db: &DatabaseConnection) -> Result<bool, String> {
        let ini_cfg = crate::ini_config::read_server_db_config_auto();

        // Pause guard only matters for center-DB server sync.
        if !ini_cfg.enabled || ini_cfg.role != "server" {
            crate::app_state::set_sampling_active();
            return Ok(true);
        }

        // If a pool is already available, we can safely resume.
        if crate::server_db_writer::get_server_mssql_pool().is_some() {
            crate::app_state::set_sampling_active();
            return Ok(true);
        }

        let active_cfg = crate::database_management::db_backend_config::load_active_config(local_db)
            .await
            .map_err(|e| format!("load_active_backend_config failed: {}", e))?;

        match active_cfg.backend_type {
            crate::database_management::db_backend_config::BackendType::Mssql => {
                let tib = crate::database_management::db_backend_config::build_mssql_config(&active_cfg)
                    .map_err(|e| format!("build_mssql_config failed: {}", e))?;
                let pool = crate::database_management::mssql_queries::create_mssql_pool(tib, 5)
                    .await
                    .map_err(|e| format!("create_mssql_pool failed: {}", e))?;

                crate::server_db_writer::set_reconnect_mssql_pool(pool);
                crate::app_state::set_sampling_active();
                Ok(true)
            }
            _ => Ok(false),
        }
    }

    async fn sync_logging_data_static(config: T3000MainConfig) -> Result<(), AppError> {
        // Create logger for this sync operation
        let mut sync_logger =
            ServiceLogger::ffi().unwrap_or_else(|_| ServiceLogger::new("fallback_ffi").unwrap());

        sync_logger.info(&format!(
            "⚙️ Config: Timeout {}s, Retry {}x",
            config.timeout_seconds, config.retry_attempts
        ));

        // Always use local SQLite for metadata / audit trail
        let local_db = establish_t3_device_connection().await.map_err(|e| {
            sync_logger.error(&format!("❌ Local database connection failed: {}", e));
            e
        })?;

        crate::database_management::sync_health::ensure_app_log_table(&local_db).await;

        // ── CHECK SAMPLING STATE ──────────────────────────────────────────────
        if crate::app_state::is_sampling_paused() {
            let reason = crate::app_state::get_pause_reason().unwrap_or_default();
            sync_logger.warn(&format!(
                "⏸️  Sampling paused — probing center DB before this cycle: {}",
                reason
            ));

            crate::logging::service::emit_app_log(
                &local_db,
                "warn",
                "POLL",
                Some("ffi_sync"),
                None,
                "Sampling paused — attempting auto-resume probe",
                Some(&format!("reason={}", reason)),
            )
            .await;

            match Self::try_auto_resume_sampling(&local_db).await {
                Ok(true) => {
                    sync_logger.info("▶️ Sampling auto-resumed after successful center DB probe");
                    crate::logging::service::emit_app_log(
                        &local_db,
                        "info",
                        "POLL",
                        Some("ffi_sync"),
                        None,
                        "Sampling auto-resumed after center DB probe",
                        None,
                    )
                    .await;
                }
                Ok(false) => {
                    sync_logger.warn("⏸️  Sampling remains paused — skipping this cycle");
                    return Ok(());
                }
                Err(e) => {
                    sync_logger.warn(&format!(
                        "⏸️  Auto-resume probe failed — skipping cycle: {}",
                        e
                    ));
                    return Ok(());
                }
            }
        }
        // ─────────────────────────────────────────────────────────────────────

        crate::logging::service::emit_app_log(
            &local_db,
            "info",
            "POLL",
            Some("ffi_sync"),
            None,
            "Starting FFI sync cycle",
            Some(&format!("sync_interval_secs={}", config.sync_interval_secs)),
        )
        .await;

        // Decide write target: MSSQL direct (center DB) if pool active, else SQLite/SeaORM
        let writer = super::sync_writer::SyncWriter::from_pool_or_sqlite().await.map_err(|e| {
            sync_logger.error(&format!("❌ Failed to initialize sync writer: {}", e));
            e
        })?;

        let (writer_target_text, writer_target_detail) = match &writer {
            super::sync_writer::SyncWriter::MssqlDirect(_) => (
                "MSSQL (direct write to center DB)",
                "target=center_mssql",
            ),
            super::sync_writer::SyncWriter::Sqlite(db) => match db.get_database_backend() {
                sea_orm::DatabaseBackend::Sqlite => ("Local SQLite", "target=local_sqlite"),
                sea_orm::DatabaseBackend::MySql | sea_orm::DatabaseBackend::Postgres => {
                    ("Center DB (SeaORM backend)", "target=center_seaorm")
                }
            },
        };

        // Strict policy: when Shared DB mode is enabled, do not continue if
        // resolved write target is local SQLite. Skip this cycle; service keeps running.
        let server_cfg = crate::ini_config::read_server_db_config_auto();

        // Standalone mode: center DB is disabled — backend interval sync is skipped entirely.
        // Only realtime writes (from device push) are active in this mode.
        if !server_cfg.enabled {
            let reason = "Standalone mode — backend interval sync disabled; only realtime writes are active";
            sync_logger.info(&format!("⏭️  {}", reason));
            crate::logging::service::emit_app_log(
                &local_db,
                "info",
                "POLL",
                Some("ffi_sync"),
                None,
                reason,
                Some("policy=standalone_skip"),
            )
            .await;
            return Ok(());
        }

        if server_cfg.enabled {
            if matches!(
                &writer,
                super::sync_writer::SyncWriter::Sqlite(db)
                    if db.get_database_backend() == sea_orm::DatabaseBackend::Sqlite
            ) {
                let reason = "Center DB mode is enabled but center DB is currently unavailable — skipping this cycle, will retry next cycle";
                sync_logger.warn(&format!("⚠️ {}", reason));
                crate::logging::service::emit_app_log(
                    &local_db,
                    "warn",
                    "POLL",
                    Some("ffi_sync"),
                    None,
                    reason,
                    Some("policy=center_db_skip_retry"),
                )
                .await;
                return Ok(());
            }
        }

        sync_logger.info(&format!(
            "✅ Database connections established — write target: {}",
            writer_target_text
        ));
        crate::logging::service::emit_app_log(
            &local_db,
            "info",
            "CONFIG",
            Some("ffi_sync"),
            None,
            "Sync writer target selected",
            Some(writer_target_detail),
        )
        .await;

        // STEP 1: Decide whether to perform full rediscovery or use cache
        let should_do_rediscovery = Self::should_rediscover().await;
        let panels: Vec<PanelInfo>;

        if should_do_rediscovery {
            sync_logger
                .info("🔍 FULL REDISCOVERY: Calling GET_PANELS_LIST to refresh device list...");

            // Get lightweight device list via GET_PANELS_LIST (Action 4)
            panels = match Self::get_panels_list_via_ffi().await {
                Ok(p) => p,
                Err(e) => {
                    sync_logger.error(&format!("GET_PANELS_LIST FFI failed: {}", e));
                    // Activity Log: T3000.exe load status (once) + timeout event
                    if T3000_LOAD_LOGGED.compare_exchange(false, true, Ordering::Relaxed, Ordering::Relaxed).is_ok() {
                        let (load_msg, load_level) = unsafe {
                            if BACNETWEBVIEW_HANDLE_WEBVIEW_MSG_FN.is_some() {
                                ("T3000.exe loaded — BacnetWebView_HandleWebViewMsg found", "info")
                            } else {
                                ("T3000.exe loaded but BacnetWebView_HandleWebViewMsg not found — FFI calls will fail", "error")
                            }
                        };
                        crate::logging::service::emit_app_log(
                            &local_db, load_level, "STARTUP", Some("ffi_sync"), None, load_msg, None,
                        ).await;
                    }

                    // Resilience path: if rediscovery fails, continue this cycle using cached
                    // devices instead of dropping all interval sync writes.
                    match Self::get_cached_device_list().await {
                        Ok(cached_panels) if !cached_panels.is_empty() => {
                            let msg = format!(
                                "GET_PANELS_LIST failed ({}). Falling back to cached device list for this cycle",
                                e
                            );
                            sync_logger.warn(&format!("⚠️ {}", msg));
                            crate::logging::service::emit_app_log(
                                &local_db,
                                "warn",
                                "POLL",
                                Some("ffi_sync"),
                                None,
                                &msg,
                                Some("action=4 policy=rediscover_fallback_cache"),
                            )
                            .await;
                            cached_panels
                        }
                        _ => {
                            crate::logging::service::emit_app_log(
                                &local_db,
                                "warn",
                                "POLL",
                                Some("ffi_sync"),
                                None,
                                "GET_PANELS_LIST timed out — sync cycle skipped, no cached devices available",
                                Some("action=4 policy=skip_no_cache"),
                            )
                            .await;
                            return Ok(());
                        }
                    }
                }
            };

            // Activity Log: T3000.exe load status (once) + device list found
            if T3000_LOAD_LOGGED.compare_exchange(false, true, Ordering::Relaxed, Ordering::Relaxed).is_ok() {
                let (load_msg, load_level) = unsafe {
                    if BACNETWEBVIEW_HANDLE_WEBVIEW_MSG_FN.is_some() {
                        ("T3000.exe loaded — BacnetWebView_HandleWebViewMsg found", "info")
                    } else {
                        ("T3000.exe loaded but BacnetWebView_HandleWebViewMsg not found — FFI calls will fail", "error")
                    }
                };
                crate::logging::service::emit_app_log(
                    &local_db, load_level, "STARTUP", Some("ffi_sync"), None, load_msg, None,
                ).await;
            }
            sync_logger.info(&format!(
                "📋 Found {} devices via GET_PANELS_LIST",
                panels.len()
            ));
            {
                let sn_list = panels.iter().map(|p| p.serial_number.to_string()).collect::<Vec<_>>().join(", ");
                crate::logging::service::emit_app_log(
                    &local_db, "info", "POLL", Some("ffi_sync"), None,
                    &format!("GET_PANELS_LIST: {} device(s) found (SN: {})", panels.len(), sn_list),
                    None,
                ).await;
            }

            if panels.is_empty() {
                sync_logger.warn("⚠️ No devices found in GET_PANELS_LIST - skipping sync cycle");
                crate::logging::service::emit_app_log(
                    &local_db,
                    "warn",
                    "POLL",
                    Some("ffi_sync"),
                    None,
                    "No devices found in GET_PANELS_LIST; sync cycle skipped",
                    None,
                )
                .await;
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

            if let Err(e) = trendlog_data_sync_metadata::Entity::insert(rediscover_metadata)
                .exec(&local_db)
                .await
            {
                sync_logger.error(&format!(
                    "❌ Failed to create GET_PANELS_LIST metadata (non-fatal): {}",
                    e
                ));
            }

            // Mirror to MSSQL TRENDLOG_DATA_SYNC_METADATA
            if let super::sync_writer::SyncWriter::MssqlDirect(pool) = &writer {
                let ts_fmt = rediscover_start_time.format("%Y-%m-%d %H:%M:%S").to_string();
                if let Err(e) = mssql_queries::insert_trendlog_sync_metadata(
                    pool,
                    &ts_fmt,
                    "GET_PANELS_LIST",
                    None,
                    None,
                    panels.len() as i32,
                    *REDISCOVER_INTERVAL_SECS.read().await as i32,
                    1,
                    None,
                ).await {
                    sync_logger.error(&format!("❌ Failed to write GET_PANELS_LIST to MSSQL TRENDLOG_DATA_SYNC_METADATA (non-fatal): {}", e));
                }
            }

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

            if let Err(e) = Self::insert_data_sync_metadata(
                &writer,
                &local_db,
                &new_metadata_request.data_type,
                &new_metadata_request.serial_number,
                new_metadata_request.panel_id,
                new_metadata_request.records_synced,
                new_metadata_request.success,
                new_metadata_request.error_message,
            )
            .await
            {
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
                    panels = match Self::get_panels_list_via_ffi().await {
                        Ok(p) => p,
                        Err(e) => {
                            sync_logger.error(&format!("❌ Forced rediscovery GET_PANELS_LIST failed: {} — skipping cycle, will retry next cycle", e));
                            crate::logging::service::emit_app_log(
                                &local_db, "warn", "POLL", Some("ffi_sync"), None,
                                "GET_PANELS_LIST failed (forced rediscovery) — sync cycle skipped, will retry",
                                Some("action=4"),
                            ).await;
                            return Ok(());
                        }
                    };

                    if panels.is_empty() {
                        sync_logger.warn("⚠️ No devices found - skipping sync cycle");
                        crate::logging::service::emit_app_log(
                            &local_db,
                            "warn",
                            "POLL",
                            Some("ffi_sync"),
                            None,
                            "No devices found after forced rediscovery; sync cycle skipped",
                            None,
                        )
                        .await;
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

        sync_logger.info("💾 Recording sync cycle metadata");

        // Legacy trendlog_data_sync_metadata stays local for diagnostic continuity.
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

        let sync_metadata_id = match trendlog_data_sync_metadata::Entity::insert(sync_metadata)
            .exec(&local_db)
            .await
        {
            Ok(result) => result.last_insert_id,
            Err(e) => {
                sync_logger.error(&format!("❌ Failed to create sync metadata (non-fatal): {} — continuing sync cycle", e));
                0 // fallback ID; only used for legacy metadata tracking
            }
        };

        // Mirror to MSSQL TRENDLOG_DATA_SYNC_METADATA
        if let super::sync_writer::SyncWriter::MssqlDirect(pool) = &writer {
            let ts_fmt = sync_start_time.format("%Y-%m-%d %H:%M:%S").to_string();
            if let Err(e) = mssql_queries::insert_trendlog_sync_metadata(
                pool,
                &ts_fmt,
                "LOGGING_DATA",
                None,
                None,
                0,
                config.sync_interval_secs as i32,
                1,
                None,
            ).await {
                sync_logger.error(&format!("❌ Failed to write LOGGING_DATA to MSSQL TRENDLOG_DATA_SYNC_METADATA (non-fatal): {}", e));
            }
        }

        sync_logger.info(&format!(
            "📋 LOGGING_DATA sync metadata created - ID: {}",
            sync_metadata_id
        ));

        // Insert start-of-cycle marker into DATA_SYNC_METADATA using active writer target.
        if let Err(e) = Self::insert_data_sync_metadata(
            &writer,
            &local_db,
            "LOGGING_DATA_CYCLE",
            "ALL",
            None,
            0,
            true,
            None,
        )
        .await
        {
            sync_logger.error(&format!("❌ Failed to insert LOGGING_DATA_CYCLE to DATA_SYNC_METADATA: {}", e));
        }

        // STEP 2: Process each device sequentially with per-device LOGGING_DATA calls
        let total_devices = panels.len();
        let mut successful_devices = 0;
        let mut failed_devices = 0;
        let mut skipped_devices = 0;
        // Track SNs that returned serial=0 (C++ issue) for cycle summary Activity Log
        let mut serial_zero_sns: Vec<String> = Vec::new();

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
                    crate::logging::service::emit_app_log(
                        &local_db, "error", "DEVICE", Some("ffi_sync"),
                        Some(&panel_info.serial_number.to_string()),
                        &format!("SN-{} Panel#{}: FFI call failed — {}", panel_info.serial_number, panel_info.panel_number, e),
                        None,
                    ).await;
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
                    crate::logging::service::emit_app_log(
                        &local_db, "error", "DEVICE", Some("ffi_sync"),
                        Some(&panel_info.serial_number.to_string()),
                        &format!("SN-{} Panel#{}: JSON parse failed — {}", panel_info.serial_number, panel_info.panel_number, e),
                        None,
                    ).await;
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
                    serial_zero_sns.push(format!("SN-{} Panel#{}", panel_info.serial_number, panel_info.panel_number));
                    continue;
                }

                // UPSERT device basic info (INSERT or UPDATE)
                sync_logger.info(&format!(
                    "📝 Syncing device basic info - Serial: {}, Name: {}",
                    serial_number, &device_with_points.device_info.panel_name
                ));

                if let Err(e) =
                    writer.sync_device(&device_with_points.device_info).await
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
                            writer.sync_input(serial_number, point).await
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
                    if let Err(e) = Self::insert_data_sync_metadata(
                        &writer,
                        &local_db,
                        "INPUTS",
                        &serial_number.to_string(),
                        Some(device_with_points.device_info.panel_id),
                        device_with_points.input_points.len() as i32,
                        true,
                        None,
                    )
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
                            writer.sync_output(serial_number, point).await
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
                    if let Err(e) = Self::insert_data_sync_metadata(
                        &writer,
                        &local_db,
                        "OUTPUTS",
                        &serial_number.to_string(),
                        Some(device_with_points.device_info.panel_id),
                        device_with_points.output_points.len() as i32,
                        true,
                        None,
                    )
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
                            writer.sync_variable(serial_number, point).await
                        {
                            sync_logger.error(&format!("❌ VARIABLE point {}/{} failed - Index: {}, Label: '{}', Error: {}",
                                point_index + 1, device_with_points.variable_points.len(), point.index, point.full_label, e));
                        }
                    }
                    sync_logger.info("✅ VARIABLE points completed");

                    // Insert DATA_SYNC_METADATA for VARIABLES sync
                    if let Err(e) = Self::insert_data_sync_metadata(
                        &writer,
                        &local_db,
                        "VARIABLES",
                        &serial_number.to_string(),
                        Some(device_with_points.device_info.panel_id),
                        device_with_points.variable_points.len() as i32,
                        true,
                        None,
                    )
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

                    if let Err(e) = writer.insert_trendlogs(
                        serial_number,
                        device_with_points,
                    )
                    .await
                    {
                        sync_logger.error(&format!("❌ Trend log insertion failed - Serial: {}, Error: {}, Total entries: {}",
                            serial_number, e, total_trend_points));
                    } else {
                        // Insert DATA_SYNC_METADATA so the dashboard "Records Today" counts trendlog details
                        if let Err(e) = Self::insert_data_sync_metadata(
                            &writer,
                            &local_db,
                            "TRENDLOG_DETAIL",
                            &serial_number.to_string(),
                            Some(device_with_points.device_info.panel_id),
                            total_trend_points as i32,
                            true,
                            None,
                        )
                        .await
                        {
                            sync_logger.error(&format!("❌ Failed to insert TRENDLOG_DETAIL sync metadata: {}", e));
                        }
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
            "💾 Sync cycle complete — {} successful, {} failed, {} skipped",
            successful_devices, failed_devices, skipped_devices
        ));
        // Activity Log: cycle summary
        if total_devices > 0 {
            if successful_devices == 0 {
                let detail = if !serial_zero_sns.is_empty() {
                    format!("serial=0 devices: {}", serial_zero_sns.join(", "))
                } else {
                    format!("failed={} skipped={}", failed_devices, skipped_devices)
                };
                crate::logging::service::emit_app_log(
                    &local_db, "error", "POLL", Some("ffi_sync"), None,
                    &format!("Cycle done: 0/{} devices synced — all returned serial=0 (C++ fix required)", total_devices),
                    Some(&detail),
                ).await;
            } else {
                crate::logging::service::emit_app_log(
                    &local_db, "info", "POLL", Some("ffi_sync"), None,
                    &format!("Cycle done: {}/{} devices synced", successful_devices, total_devices),
                    Some(&format!("skipped={} failed={}", skipped_devices, failed_devices)),
                ).await;
            }
        }

        // Validation and replication apply only to the SQLite/SeaORM path.
        // MSSQL direct path already wrote straight to center DB — no replication needed.
        if !writer.is_mssql_direct() {
            // Validate data was actually inserted by doing a quick count check
            let validation_db = establish_device_conn_for_sync().await?;
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

            // ---- SERVER DB REPLICATION (SQLite/SeaORM path only) ----
            // SeaORM path (PG/MySQL) upserts directly; SQLite path replicates here.
            if crate::server_db_writer::is_server_write_active() {
                sync_logger.info("🌐 Server DB replication: Starting (role=server)...");
                let serial_numbers: Vec<i32> = panels.iter().map(|p| p.serial_number).collect();

                if crate::server_db_writer::get_server_conn().is_some() {
                    match Self::replicate_basic_data_to_server(&validation_db, &serial_numbers).await {
                        Ok(stats) => {
                            sync_logger.info(&format!(
                                "🌐 Server DB replication (SeaORM) complete: {} devices, {} inputs, {} outputs, {} variables",
                                stats.0, stats.1, stats.2, stats.3
                            ));
                        }
                        Err(e) => {
                            sync_logger.warn(&format!(
                                "⚠️ Server DB replication (SeaORM) failed (local data is safe): {}",
                                e
                            ));
                        }
                    }
                }
            }
        } else {
            sync_logger.info("🎯 MSSQL direct path — data written straight to center DB, replication skipped");
        }

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
    pub(crate) async fn sync_device_basic_info(
        txn: &impl ConnectionTrait,
        device_info: &DeviceInfo,
    ) -> Result<(), AppError> {
        let serial_number = device_info.panel_serial_number;

        // Create sync logger for device info operations
        let mut sync_logger = ServiceLogger::ffi().unwrap_or_else(|_| ServiceLogger::noop());

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
            product_name: Set(Some(device_info.panel_name.clone())), // Use actual panel name from C++
            address: Set(Some(device_info.panel_ipaddress.clone())),
            status: Set(Some("Online".to_string())),
            description: Set(None), // Don't generate fake descriptions - keep what C++ provides

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
    pub(crate) fn format_unix_timestamp_to_local(unix_timestamp_str: &str) -> String {
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
    pub(crate) fn derive_units_from_range(range: i32) -> String {
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
    pub(crate) async fn insert_trend_logs(
        txn: &impl ConnectionTrait,
        serial_number: i32,
        device_data: &DeviceWithPoints,
        _sync_metadata_id: i32,
    ) -> Result<(), AppError> {
        let timestamp = chrono::Utc::now().to_rfc3339();

        // Create sync logger for trend log operations
        let mut sync_logger = ServiceLogger::ffi().unwrap_or_else(|_| ServiceLogger::noop());

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

            // ⚠️ VALIDATION: Skip points with zero value but invalid status (fallback zeros)
            if point.value == 0.0 && point.status == 0 {
                sync_logger.warn(&format!(
                    "⏭️ SKIPPING INPUT fallback zero - Serial: {}, Index: {}, Status: {}",
                    serial_number, point.index, point.status
                ));
                continue; // Skip this point - don't write fallback zero to DB
            }

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

            sync_logger.info(&format!("📊 ✅ Inserting REAL INPUT detail {}/{} - Serial: {}, ParentID: {}, Index: {}, Value: {}, Status: {}",
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

            // ⚠️ VALIDATION: Skip points with zero value but invalid status (fallback zeros)
            if point.value == 0.0 && point.status == 0 {
                sync_logger.warn(&format!(
                    "⏭️ SKIPPING OUTPUT fallback zero - Serial: {}, Index: {}, Status: {}",
                    serial_number, point.index, point.status
                ));
                continue; // Skip this point - don't write fallback zero to DB
            }

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

            // ⚠️ VALIDATION: Skip points with zero value but invalid status (fallback zeros)
            if point.value == 0.0 && point.status == 0 {
                sync_logger.warn(&format!(
                    "⏭️ SKIPPING VARIABLE fallback zero - Serial: {}, Index: {}, Status: {}",
                    serial_number, point.index, point.status
                ));
                continue; // Skip this point - don't write fallback zero to DB
            }

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
            Duration::from_secs(30), // 30 second timeout — matches LOGGING_DATA timeout, needed during T3000 startup
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
                                                let panel_name = clean_cpp_string(
                                                    panel_json
                                                        .get("panel_name")?
                                                        .as_str()?,
                                                    "(Unknown)" // Keep "(Unknown)" as-is from C++
                                                );
                                                Some(PanelInfo {
                                                    panel_number: panel_json
                                                        .get("panel_number")?
                                                        .as_i64()?
                                                        as i32,
                                                    serial_number: panel_json
                                                        .get("serial_number")?
                                                        .as_i64()?
                                                        as i32,
                                                    panel_name,
                                                    pid: panel_json
                                                        .get("pid")
                                                        .and_then(|v| v.as_i64())
                                                        .map(|v| v as i32),
                                                    object_instance: panel_json
                                                        .get("object_instance")
                                                        .and_then(|v| v.as_i64())
                                                        .map(|v| v as i32),
                                                    online_time: panel_json
                                                        .get("online_time")
                                                        .and_then(|v| v.as_i64()),
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
        let mut sync_logger = ServiceLogger::ffi().unwrap_or_else(|_| ServiceLogger::noop());

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
                    panel_name: clean_cpp_string(
                        device_json
                            .get("panel_name")
                            .and_then(|v| v.as_str())
                            .unwrap_or("Unknown"),
                        "Unknown"
                    ),
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

    /// Helper: parse a JSON value as i64, handling both integer and string representations
    fn json_value_as_i64(val: &JsonValue) -> Option<i64> {
        val.as_i64()
            .or_else(|| val.as_u64().map(|v| v as i64))
            .or_else(|| val.as_f64().map(|v| v as i64))
            .or_else(|| val.as_str().and_then(|s| s.parse::<i64>().ok()))
    }

    /// Parse individual point data from C++ JSON structure
    fn parse_point_data(point_json: &JsonValue) -> Result<PointData, AppError> {
        // Parse calibration fields with robust type handling
        let cal_h_raw = point_json.get("calibration_h");
        let cal_l_raw = point_json.get("calibration_l");
        let cal_sign_raw = point_json.get("calibration_sign");
        let filter_raw = point_json.get("filter");
        let control_raw = point_json.get("control");

        let cal_h = cal_h_raw.and_then(Self::json_value_as_i64).unwrap_or(0);
        let cal_l = cal_l_raw.and_then(Self::json_value_as_i64).unwrap_or(0);
        let cal_sign = cal_sign_raw.and_then(Self::json_value_as_i64).unwrap_or(0);
        let filter_val = filter_raw.and_then(Self::json_value_as_i64);
        let control_val = control_raw.and_then(Self::json_value_as_i64);

        // Debug: log raw calibration JSON values for first point to help diagnose sync issues
        let point_type = point_json.get("type").and_then(|v| v.as_str()).unwrap_or("?");
        let point_idx = point_json.get("index").and_then(|v| v.as_u64()).unwrap_or(0);
        if point_idx == 0 {
            info!(
                "🔬 [{}] idx=0 raw JSON: cal_h={:?}, cal_l={:?}, cal_sign={:?}, filter={:?}, control={:?} → parsed: cal_h={}, cal_l={}, sign={}, filter={:?}, control={:?}",
                point_type, cal_h_raw, cal_l_raw, cal_sign_raw, filter_raw, control_raw,
                cal_h, cal_l, cal_sign, filter_val, control_val
            );
        }

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
                .ok_or_else(|| AppError::ValidationError(
                    "Point missing/invalid 'value' field - SKIPPING (fallback zero not written)".to_string()
                ))?,
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
            calibration: {
                // Legacy: compute combined display value from h+l bytes
                ((cal_h << 8) | cal_l) as f64 / 10.0
            },
            sign: cal_sign as i32,
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
                .and_then(Self::json_value_as_i64)
                .map(|v| v as i32),
            filter: filter_val.map(|v| v as i32),
            control: control_val.map(|v| v as i32),
            command: point_json
                .get("command")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string()),
            id: point_json
                .get("id")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string()),
            calibration_l: cal_l_raw.and_then(Self::json_value_as_i64).map(|v| v as i32),
            calibration_h: cal_h_raw.and_then(Self::json_value_as_i64).map(|v| v as i32),

            // OUTPUT specific fields
            low_voltage: point_json.get("low_voltage").and_then(|v| v.as_f64()),
            high_voltage: point_json.get("high_voltage").and_then(|v| v.as_f64()),
            hw_switch_status: point_json
                .get("hw_switch_status")
                .and_then(Self::json_value_as_i64)
                .map(|v| v as i32),

            // VARIABLE specific fields
            unused: point_json
                .get("unused")
                .and_then(Self::json_value_as_i64)
                .map(|v| v as i32),
        };

        Ok(point_data)
    }

    /// Sync input point data (UPSERT: INSERT or UPDATE)
    pub(crate) async fn sync_input_point_static(
        txn: &impl ConnectionTrait,
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

        match existing {
            Some(_) => {
                // UPDATE existing input point using update_many + col_expr
                // (Safe pattern: PK doesn't include Input_Index, so Entity::update() could target wrong rows)
                if point.index == 0 {
                    sync_logger.info(&format!(
                        "🔬 INPUT UPDATE idx=0 calibration fields: cal_h={:?}, cal_l={:?}, sign={}, filter={:?}, control={:?}",
                        point.calibration_h, point.calibration_l, point.sign, point.filter, point.control
                    ));
                }
                info!(
                    "🔄 Updating existing INPUT point {}:{} - ID: {:?}, Label: '{}'",
                    serial_number, point.index, point.id, point.full_label
                );

                let _update_result = input_points::Entity::update_many()
                    .filter(input_points::Column::SerialNumber.eq(serial_number))
                    .filter(input_points::Column::InputIndex.eq(Some(point.index.to_string())))
                    .col_expr(input_points::Column::InputId, Expr::value(point.id.clone()))
                    .col_expr(input_points::Column::Panel, Expr::value(Some(point.panel.to_string())))
                    .col_expr(input_points::Column::FullLabel, Expr::value(Some(point.full_label.clone())))
                    .col_expr(input_points::Column::AutoManual, Expr::value(Some(point.auto_manual.to_string())))
                    .col_expr(input_points::Column::FValue, Expr::value(Some(point.value.to_string())))
                    .col_expr(input_points::Column::Units, Expr::value(Some(derived_units.clone())))
                    .col_expr(input_points::Column::RangeField, Expr::value(Some(point.range.to_string())))
                    .col_expr(input_points::Column::Calibration, Expr::value(Some(point.calibration.to_string())))
                    .col_expr(input_points::Column::Sign, Expr::value(Some(point.sign.to_string())))
                    .col_expr(input_points::Column::Status, Expr::value(Some(point.status.to_string())))
                    .col_expr(input_points::Column::FilterField, Expr::value(point.filter.map(|f| f.to_string())))
                    .col_expr(input_points::Column::DigitalAnalog, Expr::value(point.digital_analog.map(|da| da.to_string())))
                    .col_expr(input_points::Column::Label, Expr::value(point.label.clone()))
                    .col_expr(input_points::Column::TypeField, Expr::value(point.command.clone()))
                    .col_expr(input_points::Column::CalibrationH, Expr::value(point.calibration_h.map(|v| v.to_string())))
                    .col_expr(input_points::Column::CalibrationL, Expr::value(point.calibration_l.map(|v| v.to_string())))
                    .col_expr(input_points::Column::CalibrationSign, Expr::value(Some(point.sign.to_string())))
                    .col_expr(input_points::Column::Control, Expr::value(point.control.map(|c| c.to_string())))
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

                let input_model = input_points::ActiveModel {
                    serial_number: Set(serial_number),
                    input_id: Set(point.id.clone()),
                    input_index: Set(Some(point.index.to_string())),
                    panel: Set(Some(point.panel.to_string())),
                    full_label: Set(Some(point.full_label.clone())),
                    auto_manual: Set(Some(point.auto_manual.to_string())),
                    f_value: Set(Some(point.value.to_string())),
                    units: Set(Some(derived_units.clone())),
                    range_field: Set(Some(point.range.to_string())),
                    calibration: Set(Some(point.calibration.to_string())),
                    sign: Set(Some(point.sign.to_string())),
                    status: Set(Some(point.status.to_string())),
                    filter_field: Set(point.filter.map(|f| f.to_string())),
                    digital_analog: Set(point.digital_analog.map(|da| da.to_string())),
                    label: Set(point.label.clone()),
                    type_field: Set(point.command.clone()),
                    calibration_h: Set(point.calibration_h.map(|v| v.to_string())),
                    calibration_l: Set(point.calibration_l.map(|v| v.to_string())),
                    calibration_sign: Set(Some(point.sign.to_string())),
                    control: Set(point.control.map(|c| c.to_string())),
                };

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
    pub(crate) async fn sync_output_point_static(
        txn: &impl ConnectionTrait,
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

        match existing {
            Some(_) => {
                // UPDATE existing output point using update_many + col_expr
                // (Safe pattern: PK doesn't include Output_Index, so Entity::update() could target wrong rows)
                info!(
                    "🔄 Updating existing OUTPUT point {}:{} - ID: {:?}, Label: '{}'",
                    serial_number, point.index, point.id, point.full_label
                );

                let _update_result = output_points::Entity::update_many()
                    .filter(output_points::Column::SerialNumber.eq(serial_number))
                    .filter(output_points::Column::OutputIndex.eq(Some(point.index.to_string())))
                    .col_expr(output_points::Column::OutputId, Expr::value(point.id.clone()))
                    .col_expr(output_points::Column::Panel, Expr::value(Some(point.panel.to_string())))
                    .col_expr(output_points::Column::FullLabel, Expr::value(Some(point.full_label.clone())))
                    .col_expr(output_points::Column::AutoManual, Expr::value(Some(point.auto_manual.to_string())))
                    .col_expr(output_points::Column::FValue, Expr::value(Some(point.value.to_string())))
                    .col_expr(output_points::Column::Units, Expr::value(Some(derived_units.clone())))
                    .col_expr(output_points::Column::RangeField, Expr::value(Some(point.range.to_string())))
                    .col_expr(output_points::Column::Calibration, Expr::value(Some(point.calibration.to_string())))
                    .col_expr(output_points::Column::Sign, Expr::value(Some(point.sign.to_string())))
                    .col_expr(output_points::Column::Status, Expr::value(Some(point.status.to_string())))
                    .col_expr(output_points::Column::FilterField, Expr::value(point.filter.map(|f| f.to_string())))
                    .col_expr(output_points::Column::DigitalAnalog, Expr::value(point.digital_analog.map(|da| da.to_string())))
                    .col_expr(output_points::Column::Label, Expr::value(point.label.clone()))
                    .col_expr(output_points::Column::TypeField, Expr::value(point.command.clone()))
                    .col_expr(output_points::Column::CalibrationH, Expr::value(point.calibration_h.map(|v| v.to_string())))
                    .col_expr(output_points::Column::CalibrationL, Expr::value(point.calibration_l.map(|v| v.to_string())))
                    .col_expr(output_points::Column::CalibrationSign, Expr::value(Some(point.sign.to_string())))
                    .col_expr(output_points::Column::Control, Expr::value(point.control.map(|c| c.to_string())))
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

                let output_model = output_points::ActiveModel {
                    serial_number: Set(serial_number),
                    output_id: Set(point.id.clone()),
                    output_index: Set(Some(point.index.to_string())),
                    panel: Set(Some(point.panel.to_string())),
                    full_label: Set(Some(point.full_label.clone())),
                    auto_manual: Set(Some(point.auto_manual.to_string())),
                    f_value: Set(Some(point.value.to_string())),
                    units: Set(Some(derived_units.clone())),
                    range_field: Set(Some(point.range.to_string())),
                    calibration: Set(Some(point.calibration.to_string())),
                    sign: Set(Some(point.sign.to_string())),
                    status: Set(Some(point.status.to_string())),
                    filter_field: Set(point.filter.map(|f| f.to_string())),
                    digital_analog: Set(point.digital_analog.map(|da| da.to_string())),
                    label: Set(point.label.clone()),
                    type_field: Set(point.command.clone()),
                    calibration_h: Set(point.calibration_h.map(|v| v.to_string())),
                    calibration_l: Set(point.calibration_l.map(|v| v.to_string())),
                    calibration_sign: Set(Some(point.sign.to_string())),
                    control: Set(point.control.map(|c| c.to_string())),
                };

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
    pub(crate) async fn sync_variable_point_static(
        txn: &impl ConnectionTrait,
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

        match existing {
            Some(_) => {
                // UPDATE existing variable point using update_many + col_expr
                // (Safe pattern: PK doesn't include Variable_Index, so Entity::update() could target wrong rows)
                info!(
                    "🔄 Updating existing VARIABLE point {}:{} - ID: {:?}, Label: '{}'",
                    serial_number, point.index, point.id, point.full_label
                );

                let _update_result = variable_points::Entity::update_many()
                    .filter(variable_points::Column::SerialNumber.eq(serial_number))
                    .filter(variable_points::Column::VariableIndex.eq(Some(point.index.to_string())))
                    .col_expr(variable_points::Column::VariableId, Expr::value(point.id.clone()))
                    .col_expr(variable_points::Column::Panel, Expr::value(Some(point.pid.to_string())))
                    .col_expr(variable_points::Column::FullLabel, Expr::value(Some(point.full_label.clone())))
                    .col_expr(variable_points::Column::AutoManual, Expr::value(Some(point.auto_manual.to_string())))
                    .col_expr(variable_points::Column::FValue, Expr::value(Some(point.value.to_string())))
                    .col_expr(variable_points::Column::Units, Expr::value(Some(derived_units.clone())))
                    .col_expr(variable_points::Column::RangeField, Expr::value(Some(point.range.to_string())))
                    .col_expr(variable_points::Column::Calibration, Expr::value(Some(point.calibration.to_string())))
                    .col_expr(variable_points::Column::Sign, Expr::value(Some(point.sign.to_string())))
                    .col_expr(variable_points::Column::FilterField, Expr::value(point.filter.map(|f| f.to_string())))
                    .col_expr(variable_points::Column::Status, Expr::value(Some(point.status.to_string())))
                    .col_expr(variable_points::Column::DigitalAnalog, Expr::value(point.digital_analog.map(|da| da.to_string())))
                    .col_expr(variable_points::Column::Label, Expr::value(point.label.clone()))
                    .col_expr(variable_points::Column::TypeField, Expr::value(point.command.clone()))
                    .col_expr(variable_points::Column::CalibrationH, Expr::value(point.calibration_h.map(|v| v.to_string())))
                    .col_expr(variable_points::Column::CalibrationL, Expr::value(point.calibration_l.map(|v| v.to_string())))
                    .col_expr(variable_points::Column::CalibrationSign, Expr::value(Some(point.sign.to_string())))
                    .col_expr(variable_points::Column::Control, Expr::value(point.control.map(|c| c.to_string())))
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

                let variable_model = variable_points::ActiveModel {
                    serial_number: Set(serial_number),
                    variable_id: Set(point.id.clone()),
                    variable_index: Set(Some(point.index.to_string())),
                    panel: Set(Some(point.pid.to_string())),
                    full_label: Set(Some(point.full_label.clone())),
                    auto_manual: Set(Some(point.auto_manual.to_string())),
                    f_value: Set(Some(point.value.to_string())),
                    units: Set(Some(derived_units.clone())),
                    range_field: Set(Some(point.range.to_string())),
                    calibration: Set(Some(point.calibration.to_string())),
                    sign: Set(Some(point.sign.to_string())),
                    filter_field: Set(point.filter.map(|f| f.to_string())),
                    status: Set(Some(point.status.to_string())),
                    digital_analog: Set(point.digital_analog.map(|da| da.to_string())),
                    label: Set(point.label.clone()),
                    type_field: Set(point.command.clone()),
                    calibration_h: Set(point.calibration_h.map(|v| v.to_string())),
                    calibration_l: Set(point.calibration_l.map(|v| v.to_string())),
                    calibration_sign: Set(Some(point.sign.to_string())),
                    control: Set(point.control.map(|c| c.to_string())),
                };

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

    /// Replicate basic data (DEVICES, INPUTS, OUTPUTS, VARIABLES) from local SQLite
    /// to the server DB after a sync cycle. Called only when role=server and server enabled.
    /// Returns (devices, inputs, outputs, variables) counts replicated.
    async fn replicate_basic_data_to_server(
        local_db: &DatabaseConnection,
        serial_numbers: &[i32],
    ) -> Result<(u64, u64, u64, u64), AppError> {
        let server_conn_arc = crate::server_db_writer::get_server_conn()
            .ok_or_else(|| AppError::DatabaseError("Server DB connection not available".into()))?;
        let server = server_conn_arc.lock().await;

        let mut dev_count: u64 = 0;
        let mut inp_count: u64 = 0;
        let mut out_count: u64 = 0;
        let mut var_count: u64 = 0;

        for &sn in serial_numbers {
            // Replicate DEVICES
            if let Ok(Some(device)) = devices::Entity::find()
                .filter(devices::Column::SerialNumber.eq(sn))
                .one(local_db)
                .await
            {
                // Clone fields needed for potential update fallback
                let status_clone = device.status.clone();
                let address_clone = device.address.clone();
                let building_clone = device.building_name.clone();

                let model = devices::ActiveModel {
                    serial_number: Set(device.serial_number),
                    panel_id: Set(device.panel_id),
                    building_name: Set(device.building_name),
                    product_name: Set(device.product_name),
                    address: Set(device.address),
                    status: Set(device.status),
                    description: Set(device.description),
                    ip_address: Set(device.ip_address),
                    port: Set(device.port),
                    bacnet_mstp_mac_id: Set(device.bacnet_mstp_mac_id),
                    modbus_address: Set(device.modbus_address),
                    pc_ip_address: Set(device.pc_ip_address),
                    modbus_port: Set(device.modbus_port),
                    bacnet_ip_port: Set(device.bacnet_ip_port),
                    show_label_name: Set(device.show_label_name),
                    connection_type: Set(device.connection_type),
                    ..Default::default()
                };
                if devices::Entity::insert(model).exec(&*server).await.is_ok() {
                    dev_count += 1;
                } else {
                    // Insert failed (likely duplicate) — try update key fields
                    let _ = devices::Entity::update_many()
                        .filter(devices::Column::SerialNumber.eq(sn))
                        .col_expr(devices::Column::Status, Expr::value(status_clone.unwrap_or_default()))
                        .col_expr(devices::Column::Address, Expr::value(address_clone.unwrap_or_default()))
                        .col_expr(devices::Column::BuildingName, Expr::value(building_clone.unwrap_or_default()))
                        .exec(&*server)
                        .await;
                    dev_count += 1;
                }
            }

            // Replicate INPUTS
            if let Ok(inputs) = input_points::Entity::find()
                .filter(input_points::Column::SerialNumber.eq(sn))
                .all(local_db)
                .await
            {
                for ip in &inputs {
                    // Try insert, ignore conflicts (server may already have this point)
                    let model = input_points::ActiveModel {
                        serial_number: Set(ip.serial_number),
                        input_id: Set(ip.input_id.clone()),
                        input_index: Set(ip.input_index.clone()),
                        panel: Set(ip.panel.clone()),
                        full_label: Set(ip.full_label.clone()),
                        auto_manual: Set(ip.auto_manual.clone()),
                        f_value: Set(ip.f_value.clone()),
                        units: Set(ip.units.clone()),
                        range_field: Set(ip.range_field.clone()),
                        calibration: Set(ip.calibration.clone()),
                        sign: Set(ip.sign.clone()),
                        status: Set(ip.status.clone()),
                        filter_field: Set(ip.filter_field.clone()),
                        digital_analog: Set(ip.digital_analog.clone()),
                        label: Set(ip.label.clone()),
                        type_field: Set(ip.type_field.clone()),
                        calibration_h: Set(ip.calibration_h.clone()),
                        calibration_l: Set(ip.calibration_l.clone()),
                        calibration_sign: Set(ip.calibration_sign.clone()),
                        control: Set(ip.control.clone()),
                        ..Default::default()
                    };
                    if input_points::Entity::insert(model).exec(&*server).await.is_ok() {
                        inp_count += 1;
                    } else {
                        // Update existing point in server
                        let _ = input_points::Entity::update_many()
                            .filter(input_points::Column::SerialNumber.eq(sn))
                            .filter(input_points::Column::InputIndex.eq(ip.input_index.clone()))
                            .col_expr(input_points::Column::FValue, Expr::value(ip.f_value.clone().unwrap_or_default()))
                            .col_expr(input_points::Column::Status, Expr::value(ip.status.clone().unwrap_or_default()))
                            .col_expr(input_points::Column::FullLabel, Expr::value(ip.full_label.clone().unwrap_or_default()))
                            .col_expr(input_points::Column::Units, Expr::value(ip.units.clone().unwrap_or_default()))
                            .exec(&*server)
                            .await;
                        inp_count += 1;
                    }
                }
            }

            // Replicate OUTPUTS
            if let Ok(outputs) = output_points::Entity::find()
                .filter(output_points::Column::SerialNumber.eq(sn))
                .all(local_db)
                .await
            {
                for op in &outputs {
                    let model = output_points::ActiveModel {
                        serial_number: Set(op.serial_number),
                        output_id: Set(op.output_id.clone()),
                        output_index: Set(op.output_index.clone()),
                        panel: Set(op.panel.clone()),
                        full_label: Set(op.full_label.clone()),
                        auto_manual: Set(op.auto_manual.clone()),
                        f_value: Set(op.f_value.clone()),
                        units: Set(op.units.clone()),
                        range_field: Set(op.range_field.clone()),
                        status: Set(op.status.clone()),
                        digital_analog: Set(op.digital_analog.clone()),
                        label: Set(op.label.clone()),
                        type_field: Set(op.type_field.clone()),
                        ..Default::default()
                    };
                    if output_points::Entity::insert(model).exec(&*server).await.is_ok() {
                        out_count += 1;
                    } else {
                        let _ = output_points::Entity::update_many()
                            .filter(output_points::Column::SerialNumber.eq(sn))
                            .filter(output_points::Column::OutputIndex.eq(op.output_index.clone()))
                            .col_expr(output_points::Column::FValue, Expr::value(op.f_value.clone().unwrap_or_default()))
                            .col_expr(output_points::Column::Status, Expr::value(op.status.clone().unwrap_or_default()))
                            .col_expr(output_points::Column::FullLabel, Expr::value(op.full_label.clone().unwrap_or_default()))
                            .col_expr(output_points::Column::Units, Expr::value(op.units.clone().unwrap_or_default()))
                            .exec(&*server)
                            .await;
                        out_count += 1;
                    }
                }
            }

            // Replicate VARIABLES
            if let Ok(vars) = variable_points::Entity::find()
                .filter(variable_points::Column::SerialNumber.eq(sn))
                .all(local_db)
                .await
            {
                for vp in &vars {
                    let model = variable_points::ActiveModel {
                        serial_number: Set(vp.serial_number),
                        variable_id: Set(vp.variable_id.clone()),
                        variable_index: Set(vp.variable_index.clone()),
                        panel: Set(vp.panel.clone()),
                        full_label: Set(vp.full_label.clone()),
                        auto_manual: Set(vp.auto_manual.clone()),
                        f_value: Set(vp.f_value.clone()),
                        units: Set(vp.units.clone()),
                        status: Set(vp.status.clone()),
                        digital_analog: Set(vp.digital_analog.clone()),
                        label: Set(vp.label.clone()),
                        ..Default::default()
                    };
                    if variable_points::Entity::insert(model).exec(&*server).await.is_ok() {
                        var_count += 1;
                    } else {
                        let _ = variable_points::Entity::update_many()
                            .filter(variable_points::Column::SerialNumber.eq(sn))
                            .filter(variable_points::Column::VariableIndex.eq(vp.variable_index.clone()))
                            .col_expr(variable_points::Column::FValue, Expr::value(vp.f_value.clone().unwrap_or_default()))
                            .col_expr(variable_points::Column::Status, Expr::value(vp.status.clone().unwrap_or_default()))
                            .col_expr(variable_points::Column::FullLabel, Expr::value(vp.full_label.clone().unwrap_or_default()))
                            .col_expr(variable_points::Column::Units, Expr::value(vp.units.clone().unwrap_or_default()))
                            .exec(&*server)
                            .await;
                        var_count += 1;
                    }
                }
            }
        }

        Ok((dev_count, inp_count, out_count, var_count))
    }

    /// Replicate ALL data from local SQLite → MSSQL server via tiberius.
    /// Covers: DEVICES, INPUTS, OUTPUTS, VARIABLES + TRENDLOG_DATA + TRENDLOG_DATA_DETAIL.
    /// Returns (devices, points, trendlog_parents, trendlog_details) counts.
    /// NOTE: This path is superseded by `SyncWriter::MssqlDirect` which writes
    /// directly to MSSQL without an intermediate SQLite step. Kept for reference.
    #[allow(dead_code)]
    async fn replicate_all_data_to_mssql(
        local_db: &DatabaseConnection,
        serial_numbers: &[i32],
        pool: &crate::database_management::mssql_queries::MssqlPool,
        sync_interval_secs: u64,
    ) -> Result<(u64, u64, u64, u64), AppError> {
        use crate::database_management::mssql_queries;
        use crate::entity::t3_device::{trendlog_data, trendlog_data_detail};

        let mut dev_count: u64 = 0;
        let mut point_count: u64 = 0;
        let mut td_parent_count: u64 = 0;
        let mut td_detail_count: u64 = 0;

        for &sn in serial_numbers {
            // ---- DEVICES ----
            if let Ok(Some(device)) = devices::Entity::find()
                .filter(devices::Column::SerialNumber.eq(sn))
                .one(local_db)
                .await
            {
                if let Err(e) = mssql_queries::upsert_device(
                    pool,
                    device.serial_number,
                    device.panel_id,
                    device.main_building_name.as_deref(),
                    device.building_name.as_deref(),
                    device.floor_name.as_deref(),
                    device.room_name.as_deref(),
                    device.panel_number,
                    device.network_number,
                    device.product_name.as_deref(),
                    device.product_class_id,
                    device.product_id,
                    device.bautrate.as_deref(),
                    device.address.as_deref(),
                    device.description.as_deref(),
                    device.status.as_deref(),
                    device.ip_address.as_deref(),
                    device.port,
                    device.bacnet_mstp_mac_id,
                    device.modbus_address.map(|v| v as i32),
                    device.pc_ip_address.as_deref(),
                    device.modbus_port.map(|v| v as i32),
                    device.bacnet_ip_port.map(|v| v as i32),
                    device.show_label_name.as_deref(),
                    device.connection_type.as_deref(),
                ).await {
                    tracing::warn!("MSSQL DEVICES upsert failed for SN {}: {}", sn, e);
                } else {
                    dev_count += 1;
                }
            }

            // ---- INPUTS ----
            if let Ok(inputs) = input_points::Entity::find()
                .filter(input_points::Column::SerialNumber.eq(sn))
                .all(local_db)
                .await
            {
                for ip in &inputs {
                    if let Err(e) = mssql_queries::upsert_point(
                        pool,
                        "INPUTS",
                        "InputId",
                        ip.serial_number,
                        ip.input_id.as_deref().unwrap_or(""),
                        ip.input_index.as_deref(),
                        ip.panel.as_deref(),
                        ip.full_label.as_deref(),
                        ip.auto_manual.as_deref(),
                        ip.f_value.as_deref(),
                        ip.units.as_deref(),
                        ip.range_field.as_deref(),
                        ip.status.as_deref(),
                        ip.digital_analog.as_deref(),
                        ip.label.as_deref(),
                    ).await {
                        tracing::warn!("MSSQL INPUTS upsert failed: {}", e);
                    } else {
                        point_count += 1;
                    }
                }
            }

            // ---- OUTPUTS ----
            if let Ok(outputs) = output_points::Entity::find()
                .filter(output_points::Column::SerialNumber.eq(sn))
                .all(local_db)
                .await
            {
                for op in &outputs {
                    if let Err(e) = mssql_queries::upsert_point(
                        pool,
                        "OUTPUTS",
                        "OutputId",
                        op.serial_number,
                        op.output_id.as_deref().unwrap_or(""),
                        op.output_index.as_deref(),
                        op.panel.as_deref(),
                        op.full_label.as_deref(),
                        op.auto_manual.as_deref(),
                        op.f_value.as_deref(),
                        op.units.as_deref(),
                        op.range_field.as_deref(),
                        op.status.as_deref(),
                        op.digital_analog.as_deref(),
                        op.label.as_deref(),
                    ).await {
                        tracing::warn!("MSSQL OUTPUTS upsert failed: {}", e);
                    } else {
                        point_count += 1;
                    }
                }
            }

            // ---- VARIABLES ----
            if let Ok(vars) = variable_points::Entity::find()
                .filter(variable_points::Column::SerialNumber.eq(sn))
                .all(local_db)
                .await
            {
                for vp in &vars {
                    if let Err(e) = mssql_queries::upsert_point(
                        pool,
                        "VARIABLES",
                        "VariableId",
                        vp.serial_number,
                        vp.variable_id.as_deref().unwrap_or(""),
                        vp.variable_index.as_deref(),
                        vp.panel.as_deref(),
                        vp.full_label.as_deref(),
                        vp.auto_manual.as_deref(),
                        vp.f_value.as_deref(),
                        vp.units.as_deref(),
                        None, // VARIABLES table has no Range_Field
                        vp.status.as_deref(),
                        vp.digital_analog.as_deref(),
                        vp.label.as_deref(),
                    ).await {
                        tracing::warn!("MSSQL VARIABLES upsert failed: {}", e);
                    } else {
                        point_count += 1;
                    }
                }
            }

            // ---- TRENDLOG_DATA (parent) + TRENDLOG_DATA_DETAIL (child) ----
            // Read all trendlog parent rows for this device from local SQLite,
            // get-or-create each in MSSQL, then copy their detail rows.
            if let Ok(parents) = trendlog_data::Entity::find()
                .filter(trendlog_data::Column::SerialNumber.eq(sn))
                .all(local_db)
                .await
            {
                for parent in &parents {
                    // Get or create parent in MSSQL (returns the MSSQL-side id)
                    let mssql_parent_id = match mssql_queries::get_or_create_trendlog_parent(
                        pool,
                        parent.serial_number,
                        parent.panel_id,
                        &parent.point_id,
                        parent.point_index,
                        &parent.point_type,
                        parent.digital_analog.as_deref(),
                        parent.range_field.as_deref(),
                        parent.units.as_deref(),
                        parent.description.as_deref(),
                    ).await {
                        Ok(id) => {
                            td_parent_count += 1;
                            id
                        }
                        Err(e) => {
                            tracing::warn!(
                                "MSSQL TRENDLOG_DATA get_or_create failed for SN {}, point {}: {}",
                                sn, parent.point_id, e
                            );
                            continue;
                        }
                    };

                    // Copy detail rows for this parent (from local SQLite parent.id).
                    // Use a dynamic lookback window based on sync interval so long intervals
                    // (e.g., 1 hour) do not miss rows during MSSQL replication.
                    let lookback_minutes = std::cmp::max(
                        15,
                        (((sync_interval_secs.saturating_mul(2)) + 59) / 60) as i64,
                    );
                    let cutoff = (chrono::Local::now() - chrono::Duration::minutes(lookback_minutes))
                        .format("%Y-%m-%d %H:%M:%S")
                        .to_string();

                    if let Ok(details) = trendlog_data_detail::Entity::find()
                        .filter(trendlog_data_detail::Column::ParentId.eq(parent.id))
                        .filter(trendlog_data_detail::Column::LoggingTimeFmt.gte(&cutoff))
                        .all(local_db)
                        .await
                    {
                        for detail in &details {
                            if let Err(e) = mssql_queries::insert_trendlog_detail(
                                pool,
                                mssql_parent_id,
                                &detail.value,
                                &detail.logging_time_fmt,
                            ).await {
                                // Duplicate inserts may fail — that's OK
                                tracing::trace!(
                                    "MSSQL TRENDLOG_DATA_DETAIL insert skipped: {}", e
                                );
                            } else {
                                td_detail_count += 1;
                            }
                        }
                    }
                }
            }
        }

        Ok((dev_count, point_count, td_parent_count, td_detail_count))
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
