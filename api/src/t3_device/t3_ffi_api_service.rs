// T3000 FFI API Service - HTTP API endpoints with FFI integration
// This service provides HTTP API endpoints that directly call T3000 FFI functions
// - Follows same pattern as t3000_ffi_sync_service.rs but for HTTP responses
// - Uses same JSON message structure as WebSocket for consistency
// - Implements HTTP retry patterns for error handling
// - Provides all T3000 functionality via REST API endpoints
// - MMDD format logging (0830) in T3WebLog/YYYY-MM/ structure

use std::ffi::CString;
use std::os::raw::c_char;
use std::time::Duration;
use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::Json,
    routing::{get, post},
    Router,
};
use serde::{Serialize, Deserialize};
use serde_json::Value as JsonValue;
use tokio::time::timeout;
use crate::error::Error;
use crate::logger::ServiceLogger;
use crate::app_state::T3AppState;  // Import T3AppState
use winapi::um::libloaderapi::{GetProcAddress, LoadLibraryA};
use winapi::shared::minwindef::HINSTANCE;
use std::env;

// Re-use the same FFI function types from sync service for consistency
type BacnetWebViewHandleWebViewMsgFn = unsafe extern "C" fn(action: i32, msg: *mut c_char, len: i32) -> i32;
type GetDeviceBasicSettingsFn = unsafe extern "C" fn(panel_id: i32, buffer: *mut c_char, buffer_size: i32) -> i32;
type GetDeviceNetworkConfigFn = unsafe extern "C" fn(panel_id: i32, buffer: *mut c_char, buffer_size: i32) -> i32;

// Global function pointers - shared with sync service
static mut BACNETWEBVIEW_HANDLE_WEBVIEW_MSG_FN: Option<BacnetWebViewHandleWebViewMsgFn> = None;
static mut GET_DEVICE_BASIC_SETTINGS_FN: Option<GetDeviceBasicSettingsFn> = None;
static mut GET_DEVICE_NETWORK_CONFIG_FN: Option<GetDeviceNetworkConfigFn> = None;
static mut T3000_LOADED: bool = false;

/// HTTP API Configuration
#[derive(Debug, Clone)]
pub struct T3000ApiConfig {
    pub request_timeout_secs: u64,     // HTTP request timeout: 30 seconds
    pub retry_attempts: u32,           // HTTP retry attempts: 3 times
    pub retry_delay_ms: u64,           // Delay between retries: 1000ms
    pub max_buffer_size: usize,        // Max FFI buffer size: 8KB
}

impl Default for T3000ApiConfig {
    fn default() -> Self {
        Self {
            request_timeout_secs: 30,
            retry_attempts: 3,
            retry_delay_ms: 1000,
            max_buffer_size: 8192,
        }
    }
}

/// HTTP API Response structure matching WebSocket format
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiResponse<T> {
    pub action: String,
    pub status: String,           // "success" | "error"
    pub data: Option<T>,
    pub error: Option<String>,
    pub timestamp: String,
}

impl<T> ApiResponse<T> {
    pub fn success(action: String, data: T) -> Self {
        Self {
            action,
            status: "success".to_string(),
            data: Some(data),
            error: None,
            timestamp: chrono::Utc::now().to_rfc3339(),
        }
    }

    pub fn error(action: String, error: String) -> Self {
        Self {
            action,
            status: "error".to_string(),
            data: None,
            error: Some(error),
            timestamp: chrono::Utc::now().to_rfc3339(),
        }
    }
}

/// Device information structure (same as sync service)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceInfo {
    pub panel_id: i32,
    pub panel_name: String,
    pub panel_serial_number: i32,
    pub panel_ipaddress: String,
    pub input_logging_time: String,
    pub output_logging_time: String,
    pub variable_logging_time: String,
    // Extended fields
    pub ip_address: Option<String>,
    pub port: Option<i32>,
    pub bacnet_mstp_mac_id: Option<i32>,
    pub modbus_address: Option<i32>,
    pub pc_ip_address: Option<String>,
    pub modbus_port: Option<i32>,
    pub bacnet_ip_port: Option<i32>,
    pub show_label_name: Option<String>,
    pub connection_type: Option<String>,
}

/// Point data structure (same as sync service)
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
    pub timestamp: String,
    pub label: Option<String>,
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

/// Complete device with points structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceWithPoints {
    pub device_info: DeviceInfo,
    pub input_points: Vec<PointData>,
    pub output_points: Vec<PointData>,
    pub variable_points: Vec<PointData>,
}

/// Trend log data structure for API responses
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrendLogData {
    pub device_serial: i32,
    pub panel_id: i32,
    pub trendlog_id: i32,
    pub point_index: i32,
    pub value: f64,
    pub timestamp: String,
    pub units: String,
    pub label: String,
}

/// Query parameters for various endpoints
#[derive(Debug, Deserialize)]
pub struct DeviceQuery {
    pub panel_id: Option<i32>,
    pub serial_number: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct TrendLogQuery {
    pub panel_id: i32,
    pub trendlog_id: i32,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
    pub limit: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct PointQuery {
    pub panel_id: i32,
    pub point_type: Option<String>,  // "input" | "output" | "variable"
    pub point_index: Option<i32>,
}

/// Main T3000 FFI API Service
pub struct T3000FfiApiService {
    config: T3000ApiConfig,
}

impl T3000FfiApiService {
    pub fn new(config: T3000ApiConfig) -> Self {
        Self { config }
    }

    /// Load T3000 FFI functions (same pattern as sync service)
    unsafe fn load_t3000_function() -> bool {
        if T3000_LOADED {
            return BACNETWEBVIEW_HANDLE_WEBVIEW_MSG_FN.is_some();
        }

        let mut api_logger = ServiceLogger::api().unwrap_or_else(|_| ServiceLogger::new("fallback_api").unwrap());

        let current_exe_path = match env::current_exe() {
            Ok(path) => {
                if let Some(parent_dir) = path.parent() {
                    parent_dir.join("T3000.exe")
                } else {
                    api_logger.error("⚠️ Could not get parent directory of current executable");
                    std::path::PathBuf::from("T3000.exe")
                }
            },
            Err(e) => {
                api_logger.error(&format!("⚠️ Could not get current executable path: {}", e));
                std::path::PathBuf::from("T3000.exe")
            }
        };

        api_logger.info(&format!("🔍 API Service - Looking for T3000.exe at: {}", current_exe_path.display()));

        if let Some(path_str) = current_exe_path.to_str() {
            let t3000_path = CString::new(path_str).unwrap();
            let t3000_module = LoadLibraryA(t3000_path.as_ptr());

            if t3000_module.is_null() {
                api_logger.error(&format!("⚠️ Could not load T3000.exe from {}, trying current process", path_str));
                let current_module = std::ptr::null_mut();
                let func_name = CString::new("BacnetWebView_HandleWebViewMsg").unwrap();
                let func_ptr = GetProcAddress(current_module as HINSTANCE, func_name.as_ptr());

                if !func_ptr.is_null() {
                    api_logger.info("✅ API Service - Found BacnetWebView_HandleWebViewMsg in current process");
                    BACNETWEBVIEW_HANDLE_WEBVIEW_MSG_FN = Some(std::mem::transmute(func_ptr));

                    // Load additional functions
                    let basic_settings_func_name = CString::new("GetDeviceBasicSettings").unwrap();
                    let basic_settings_ptr = GetProcAddress(current_module as HINSTANCE, basic_settings_func_name.as_ptr());
                    if !basic_settings_ptr.is_null() {
                        GET_DEVICE_BASIC_SETTINGS_FN = Some(std::mem::transmute(basic_settings_ptr));
                        api_logger.info("✅ API Service - Found GetDeviceBasicSettings");
                    }

                    let network_config_func_name = CString::new("GetDeviceNetworkConfig").unwrap();
                    let network_config_ptr = GetProcAddress(current_module as HINSTANCE, network_config_func_name.as_ptr());
                    if !network_config_ptr.is_null() {
                        GET_DEVICE_NETWORK_CONFIG_FN = Some(std::mem::transmute(network_config_ptr));
                        api_logger.info("✅ API Service - Found GetDeviceNetworkConfig");
                    }

                    T3000_LOADED = true;
                    return true;
                }
            } else {
                api_logger.info("✅ API Service - Successfully loaded T3000.exe");
                let func_name = CString::new("BacnetWebView_HandleWebViewMsg").unwrap();
                let func_ptr = GetProcAddress(t3000_module, func_name.as_ptr());

                if !func_ptr.is_null() {
                    BACNETWEBVIEW_HANDLE_WEBVIEW_MSG_FN = Some(std::mem::transmute(func_ptr));

                    // Load additional functions
                    let basic_settings_func_name = CString::new("GetDeviceBasicSettings").unwrap();
                    let basic_settings_ptr = GetProcAddress(t3000_module, basic_settings_func_name.as_ptr());
                    if !basic_settings_ptr.is_null() {
                        GET_DEVICE_BASIC_SETTINGS_FN = Some(std::mem::transmute(basic_settings_ptr));
                    }

                    let network_config_func_name = CString::new("GetDeviceNetworkConfig").unwrap();
                    let network_config_ptr = GetProcAddress(t3000_module, network_config_func_name.as_ptr());
                    if !network_config_ptr.is_null() {
                        GET_DEVICE_NETWORK_CONFIG_FN = Some(std::mem::transmute(network_config_ptr));
                    }

                    T3000_LOADED = true;
                    return true;
                } else {
                    api_logger.error("❌ API Service - BacnetWebView_HandleWebViewMsg not found in T3000.exe");
                }
            }
        }

        T3000_LOADED = true;
        false
    }

    /// Specific FFI methods that match WebSocket client operations

    /// GetPanelsList - Action 4 (GET_PANELS_LIST)
    pub async fn get_panels_list(&self) -> Result<String, Error> {
        let mut api_logger = ServiceLogger::api().unwrap_or_else(|_| ServiceLogger::new("fallback_api").unwrap());
        api_logger.info("📡 FFI API - GetPanelsList (Action 4)");

        self.call_handle_webview_msg_with_retry(4).await
    }

    /// GetPanelData - Action 0 (GET_PANEL_DATA)
    pub async fn get_panel_data(&self, panel_id: i32) -> Result<String, Error> {
        let mut api_logger = ServiceLogger::api().unwrap_or_else(|_| ServiceLogger::new("fallback_api").unwrap());
        api_logger.info(&format!("📡 FFI API - GetPanelData (Action 0) for panel {}", panel_id));

        self.call_handle_webview_msg_with_retry(0).await
    }

    /// GetInitialData - Action 1 (GET_INITIAL_DATA)
    pub async fn get_initial_data(&self, panel_id: i32, graphic_id: Option<i32>) -> Result<String, Error> {
        let mut api_logger = ServiceLogger::api().unwrap_or_else(|_| ServiceLogger::new("fallback_api").unwrap());
        api_logger.info(&format!("📡 FFI API - GetInitialData (Action 1) for panel {} graphic {:?}", panel_id, graphic_id));

        self.call_handle_webview_msg_with_retry(1).await
    }

    /// GetEntries - Action 6 (GET_ENTRIES)
    pub async fn get_entries(&self, panel_id: i32, graphic_id: Option<i32>) -> Result<String, Error> {
        let mut api_logger = ServiceLogger::api().unwrap_or_else(|_| ServiceLogger::new("fallback_api").unwrap());
        api_logger.info(&format!("📡 FFI API - GetEntries (Action 6) for panel {} graphic {:?}", panel_id, graphic_id));

        self.call_handle_webview_msg_with_retry(6).await
    }

    /// GetSelectedDeviceInfo - Action 12 (GET_SELECTED_DEVICE_INFO)
    pub async fn get_selected_device_info(&self, panel_id: i32) -> Result<String, Error> {
        let mut api_logger = ServiceLogger::api().unwrap_or_else(|_| ServiceLogger::new("fallback_api").unwrap());
        api_logger.info(&format!("📡 FFI API - GetSelectedDeviceInfo (Action 12) for panel {}", panel_id));

        self.call_handle_webview_msg_with_retry(12).await
    }

    /// Safe wrapper for FFI calls with HTTP retry pattern
    async fn call_handle_webview_msg_with_retry(&self, action: i32) -> Result<String, Error> {
        let mut api_logger = ServiceLogger::api().unwrap_or_else(|_| ServiceLogger::new("fallback_api").unwrap());

        for attempt in 1..=self.config.retry_attempts {
            api_logger.info(&format!("🔄 API Call attempt {}/{} - Action: {}", attempt, self.config.retry_attempts, action));

            let result = timeout(
                Duration::from_secs(self.config.request_timeout_secs),
                self.perform_ffi_call(action, &mut api_logger)
            ).await;

            match result {
                Ok(Ok(response)) => {
                    api_logger.info(&format!("✅ API Call successful on attempt {} - {} bytes", attempt, response.len()));
                    return Ok(response);
                }
                Ok(Err(e)) => {
                    api_logger.error(&format!("❌ API Call failed on attempt {}: {}", attempt, e));
                    if attempt < self.config.retry_attempts {
                        tokio::time::sleep(Duration::from_millis(self.config.retry_delay_ms)).await;
                        continue;
                    }
                    return Err(e);
                }
                Err(_) => {
                    api_logger.error(&format!("⏰ API Call timed out on attempt {}", attempt));
                    if attempt < self.config.retry_attempts {
                        tokio::time::sleep(Duration::from_millis(self.config.retry_delay_ms)).await;
                        continue;
                    }
                    return Err(Error::ServerError("FFI call timed out".to_string()));
                }
            }
        }

        Err(Error::ServerError("All retry attempts failed".to_string()))
    }

    /// Perform actual FFI call
    async fn perform_ffi_call(&self, action: i32, logger: &mut ServiceLogger) -> Result<String, Error> {
        unsafe {
            if !Self::load_t3000_function() {
                return Err(Error::ServerError("T3000 FFI functions not loaded".to_string()));
            }

            if let Some(func) = BACNETWEBVIEW_HANDLE_WEBVIEW_MSG_FN {
                let mut buffer = vec![0u8; self.config.max_buffer_size];
                let result = func(action, buffer.as_mut_ptr() as *mut c_char, buffer.len() as i32);

                if result > 0 {
                    let response = String::from_utf8(buffer[..result as usize].to_vec())
                        .map_err(|e| Error::ServerError(format!("Invalid UTF-8 response: {}", e)))?;

                    logger.info(&format!("📡 FFI Response - Action: {}, Size: {} bytes", action, result));
                    Ok(response)
                } else {
                    let error_msg = format!("FFI call returned error code: {}", result);
                    logger.error(&format!("❌ {}", error_msg));
                    Err(Error::ServerError(error_msg))
                }
            } else {
                Err(Error::ServerError("FFI function not loaded".to_string()))
            }
        }
    }

    /// Parse logging response (same as sync service)
    fn parse_logging_response(json_data: &str) -> Result<LoggingDataResponse, Error> {
        let parsed: JsonValue = serde_json::from_str(json_data)
            .map_err(|e| Error::ServerError(format!("JSON parse error: {}", e)))?;

        // Extract devices from LOGGING_DATA structure
        let devices_array = parsed.get("LOGGING_DATA")
            .and_then(|data| data.as_array())
            .ok_or_else(|| Error::ServerError("No LOGGING_DATA found".to_string()))?;

        let mut devices = Vec::new();
        for device_data in devices_array {
            if let Ok(device) = Self::parse_device_with_points(device_data) {
                devices.push(device);
            }
        }

        Ok(LoggingDataResponse {
            action: "get_all_data".to_string(),
            devices,
            timestamp: chrono::Utc::now().to_rfc3339(),
        })
    }

    /// Parse individual device data (same logic as sync service)
    fn parse_device_with_points(device_data: &JsonValue) -> Result<DeviceWithPoints, Error> {
        // Parse device info
        let device_info = DeviceInfo {
            panel_id: device_data.get("PANEL").and_then(|v| v.as_i64()).unwrap_or(0) as i32,
            panel_name: device_data.get("PANEL_NAME").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            panel_serial_number: device_data.get("SN").and_then(|v| v.as_i64()).unwrap_or(0) as i32,
            panel_ipaddress: device_data.get("PANEL_IP").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            input_logging_time: device_data.get("INPUT_LOGGING_TIME").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            output_logging_time: device_data.get("OUTPUT_LOGGING_TIME").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            variable_logging_time: device_data.get("VARIABLE_LOGGING_TIME").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            // Extended fields will be populated later
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

        // Parse points (simplified - full implementation would match sync service)
        let input_points = Self::parse_points_array(device_data.get("INPUT").and_then(|v| v.as_array()).unwrap_or(&vec![]))?;
        let output_points = Self::parse_points_array(device_data.get("OUTPUT").and_then(|v| v.as_array()).unwrap_or(&vec![]))?;
        let variable_points = Self::parse_points_array(device_data.get("VARIABLE").and_then(|v| v.as_array()).unwrap_or(&vec![]))?;

        Ok(DeviceWithPoints {
            device_info,
            input_points,
            output_points,
            variable_points,
        })
    }

    /// Parse points array from JSON
    fn parse_points_array(points_array: &[JsonValue]) -> Result<Vec<PointData>, Error> {
        let mut points = Vec::new();

        for (index, point_data) in points_array.iter().enumerate() {
            let point = PointData {
                index: index as u32,
                panel: point_data.get("panel").and_then(|v| v.as_i64()).unwrap_or(0) as i32,
                full_label: point_data.get("full_label").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                auto_manual: point_data.get("auto_manual").and_then(|v| v.as_i64()).unwrap_or(0) as i32,
                value: point_data.get("value").and_then(|v| v.as_f64()).unwrap_or(0.0),
                pid: point_data.get("pid").and_then(|v| v.as_i64()).unwrap_or(0) as i32,
                units: point_data.get("units").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                range: point_data.get("range").and_then(|v| v.as_i64()).unwrap_or(0) as i32,
                calibration: point_data.get("calibration").and_then(|v| v.as_f64()).unwrap_or(0.0),
                sign: point_data.get("sign").and_then(|v| v.as_i64()).unwrap_or(0) as i32,
                status: point_data.get("status").and_then(|v| v.as_i64()).unwrap_or(0) as i32,
                timestamp: chrono::Utc::now().to_rfc3339(),
                label: point_data.get("label").and_then(|v| v.as_str()).map(|s| s.to_string()),
                // Optional fields - would be populated based on point type
                decom: None,
                sub_product: None,
                sub_id: None,
                sub_panel: None,
                network_number: None,
                description: None,
                digital_analog: None,
                filter: None,
                control: None,
                command: None,
                id: None,
                calibration_l: None,
                low_voltage: None,
                high_voltage: None,
                hw_switch_status: None,
                unused: None,
            };
            points.push(point);
        }

        Ok(points)
    }
}

// API Response structures for logging data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoggingDataResponse {
    pub action: String,
    pub devices: Vec<DeviceWithPoints>,
    pub timestamp: String,
}

/// Create API routes for T3000 FFI service compatible with T3AppState
pub fn create_api_routes() -> Router<T3AppState> {
    Router::new()
        // Core data endpoints (existing)
        .route("/api/t3000/devices", get(get_all_devices))
        .route("/api/t3000/devices/:panel_id", get(get_device_by_id))
        .route("/api/t3000/devices/:panel_id/points", get(get_device_points))
        .route("/api/t3000/devices/:panel_id/points/:point_type", get(get_device_points_by_type))

        // Trend log endpoints (existing)
        .route("/api/t3000/devices/:panel_id/trendlogs", get(get_device_trendlogs))
        .route("/api/t3000/devices/:panel_id/trendlogs/:trendlog_id", get(get_trendlog_data))

        // Real-time data endpoints (existing)
        .route("/api/t3000/realtime", get(get_realtime_data))
        .route("/api/t3000/realtime/:panel_id", get(get_device_realtime_data))

        // System endpoints (existing)
        .route("/api/t3000/status", get(get_system_status))
        .route("/api/t3000/refresh", post(refresh_all_data))

        // NEW: Direct WebSocket equivalent endpoints
        .route("/api/t3000/ffi/panels-list", get(ffi_get_panels_list))
        .route("/api/t3000/ffi/panel-data/:panel_id", get(ffi_get_panel_data))
        .route("/api/t3000/ffi/initial-data/:panel_id", get(ffi_get_initial_data))
        .route("/api/t3000/ffi/initial-data/:panel_id/:graphic_id", get(ffi_get_initial_data_with_graphic))
        .route("/api/t3000/ffi/entries/:panel_id", get(ffi_get_entries))
        .route("/api/t3000/ffi/entries/:panel_id/:graphic_id", get(ffi_get_entries_with_graphic))
        .route("/api/t3000/ffi/device-info/:panel_id", get(ffi_get_selected_device_info))
}

// API Handler implementations - create service instance per request
async fn get_all_devices(
    State(_state): State<T3AppState>,
) -> Result<Json<ApiResponse<LoggingDataResponse>>, StatusCode> {
    let mut api_logger = ServiceLogger::api().unwrap_or_else(|_| ServiceLogger::new("fallback_api").unwrap());
    api_logger.info("📡 API Request - GET /api/t3000/devices");

    let config = T3000ApiConfig::default();
    let service = T3000FfiApiService::new(config);

    match service.call_handle_webview_msg_with_retry(15).await {
        Ok(json_data) => {
            match T3000FfiApiService::parse_logging_response(&json_data) {
                Ok(response) => {
                    api_logger.info(&format!("✅ Devices retrieved - {} devices found", response.devices.len()));
                    Ok(Json(ApiResponse::success("get_all_devices".to_string(), response)))
                }
                Err(e) => {
                    api_logger.error(&format!("❌ Parse error: {}", e));
                    Err(StatusCode::INTERNAL_SERVER_ERROR)
                }
            }
        }
        Err(e) => {
            api_logger.error(&format!("❌ FFI call failed: {}", e));
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

async fn get_device_by_id(
    State(_state): State<T3AppState>,
    Path(panel_id): Path<i32>,
) -> Result<Json<ApiResponse<DeviceWithPoints>>, StatusCode> {
    let mut api_logger = ServiceLogger::api().unwrap_or_else(|_| ServiceLogger::new("fallback_api").unwrap());
    api_logger.info(&format!("📡 API Request - GET /api/t3000/devices/{}", panel_id));

    let config = T3000ApiConfig::default();
    let service = T3000FfiApiService::new(config);

    match service.call_handle_webview_msg_with_retry(15).await {
        Ok(json_data) => {
            match T3000FfiApiService::parse_logging_response(&json_data) {
                Ok(response) => {
                    if let Some(device) = response.devices.into_iter().find(|d| d.device_info.panel_id == panel_id) {
                        api_logger.info(&format!("✅ Device {} found", panel_id));
                        Ok(Json(ApiResponse::success("get_device_by_id".to_string(), device)))
                    } else {
                        api_logger.error(&format!("❌ Device {} not found", panel_id));
                        Err(StatusCode::NOT_FOUND)
                    }
                }
                Err(e) => {
                    api_logger.error(&format!("❌ Parse error: {}", e));
                    Err(StatusCode::INTERNAL_SERVER_ERROR)
                }
            }
        }
        Err(e) => {
            api_logger.error(&format!("❌ FFI call failed: {}", e));
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

async fn get_device_points(
    State(_state): State<T3AppState>,
    Path(panel_id): Path<i32>,
) -> Result<Json<ApiResponse<Vec<PointData>>>, StatusCode> {
    let mut api_logger = ServiceLogger::api().unwrap_or_else(|_| ServiceLogger::new("fallback_api").unwrap());
    api_logger.info(&format!("📡 API Request - GET /api/t3000/devices/{}/points", panel_id));

    let config = T3000ApiConfig::default();
    let service = T3000FfiApiService::new(config);

    match service.call_handle_webview_msg_with_retry(15).await {
        Ok(json_data) => {
            match T3000FfiApiService::parse_logging_response(&json_data) {
                Ok(response) => {
                    if let Some(device) = response.devices.into_iter().find(|d| d.device_info.panel_id == panel_id) {
                        let mut all_points = Vec::new();
                        all_points.extend(device.input_points);
                        all_points.extend(device.output_points);
                        all_points.extend(device.variable_points);

                        api_logger.info(&format!("✅ Device {} points retrieved - {} points", panel_id, all_points.len()));
                        Ok(Json(ApiResponse::success("get_device_points".to_string(), all_points)))
                    } else {
                        api_logger.error(&format!("❌ Device {} not found", panel_id));
                        Err(StatusCode::NOT_FOUND)
                    }
                }
                Err(e) => {
                    api_logger.error(&format!("❌ Parse error: {}", e));
                    Err(StatusCode::INTERNAL_SERVER_ERROR)
                }
            }
        }
        Err(e) => {
            api_logger.error(&format!("❌ FFI call failed: {}", e));
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

async fn get_device_points_by_type(
    State(_state): State<T3AppState>,
    Path((panel_id, point_type)): Path<(i32, String)>,
) -> Result<Json<ApiResponse<Vec<PointData>>>, StatusCode> {
    let mut api_logger = ServiceLogger::api().unwrap_or_else(|_| ServiceLogger::new("fallback_api").unwrap());
    api_logger.info(&format!("📡 API Request - GET /api/t3000/devices/{}/points/{}", panel_id, point_type));

    let config = T3000ApiConfig::default();
    let service = T3000FfiApiService::new(config);

    match service.call_handle_webview_msg_with_retry(15).await {
        Ok(json_data) => {
            match T3000FfiApiService::parse_logging_response(&json_data) {
                Ok(response) => {
                    if let Some(device) = response.devices.into_iter().find(|d| d.device_info.panel_id == panel_id) {
                        let points = match point_type.as_str() {
                            "input" => device.input_points,
                            "output" => device.output_points,
                            "variable" => device.variable_points,
                            _ => {
                                api_logger.error(&format!("❌ Invalid point type: {}", point_type));
                                return Err(StatusCode::BAD_REQUEST);
                            }
                        };

                        api_logger.info(&format!("✅ Device {} {} points retrieved - {} points", panel_id, point_type, points.len()));
                        Ok(Json(ApiResponse::success("get_device_points_by_type".to_string(), points)))
                    } else {
                        api_logger.error(&format!("❌ Device {} not found", panel_id));
                        Err(StatusCode::NOT_FOUND)
                    }
                }
                Err(e) => {
                    api_logger.error(&format!("❌ Parse error: {}", e));
                    Err(StatusCode::INTERNAL_SERVER_ERROR)
                }
            }
        }
        Err(e) => {
            api_logger.error(&format!("❌ FFI call failed: {}", e));
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

// Placeholder implementations for remaining endpoints
async fn get_device_trendlogs(
    State(_state): State<T3AppState>,
    Path(panel_id): Path<i32>,
) -> Result<Json<ApiResponse<Vec<String>>>, StatusCode> {
    let mut api_logger = ServiceLogger::api().unwrap_or_else(|_| ServiceLogger::new("fallback_api").unwrap());
    api_logger.info(&format!("📡 API Request - GET /api/t3000/devices/{}/trendlogs", panel_id));

    // TODO: Implement trend logs retrieval via FFI
    let trendlogs = vec!["trendlog1".to_string(), "trendlog2".to_string()];
    Ok(Json(ApiResponse::success("get_device_trendlogs".to_string(), trendlogs)))
}

async fn get_trendlog_data(
    State(_state): State<T3AppState>,
    Path((panel_id, trendlog_id)): Path<(i32, i32)>,
) -> Result<Json<ApiResponse<Vec<TrendLogData>>>, StatusCode> {
    let mut api_logger = ServiceLogger::api().unwrap_or_else(|_| ServiceLogger::new("fallback_api").unwrap());
    api_logger.info(&format!("📡 API Request - GET /api/t3000/devices/{}/trendlogs/{}", panel_id, trendlog_id));

    // TODO: Implement trend log data retrieval via FFI
    let data = vec![];
    Ok(Json(ApiResponse::success("get_trendlog_data".to_string(), data)))
}

async fn get_realtime_data(
    State(_state): State<T3AppState>,
) -> Result<Json<ApiResponse<LoggingDataResponse>>, StatusCode> {
    let mut api_logger = ServiceLogger::api().unwrap_or_else(|_| ServiceLogger::new("fallback_api").unwrap());
    api_logger.info("📡 API Request - GET /api/t3000/realtime");

    let config = T3000ApiConfig::default();
    let service = T3000FfiApiService::new(config);

    // Same as get_all_devices but with different action name
    match service.call_handle_webview_msg_with_retry(15).await {
        Ok(json_data) => {
            match T3000FfiApiService::parse_logging_response(&json_data) {
                Ok(response) => {
                    api_logger.info(&format!("✅ Realtime data retrieved - {} devices", response.devices.len()));
                    Ok(Json(ApiResponse::success("get_realtime_data".to_string(), response)))
                }
                Err(e) => {
                    api_logger.error(&format!("❌ Parse error: {}", e));
                    Err(StatusCode::INTERNAL_SERVER_ERROR)
                }
            }
        }
        Err(e) => {
            api_logger.error(&format!("❌ FFI call failed: {}", e));
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

async fn get_device_realtime_data(
    State(_state): State<T3AppState>,
    Path(panel_id): Path<i32>,
) -> Result<Json<ApiResponse<DeviceWithPoints>>, StatusCode> {
    let mut api_logger = ServiceLogger::api().unwrap_or_else(|_| ServiceLogger::new("fallback_api").unwrap());
    api_logger.info(&format!("📡 API Request - GET /api/t3000/realtime/{}", panel_id));

    let config = T3000ApiConfig::default();
    let service = T3000FfiApiService::new(config);

    // Same as get_device_by_id but with different action name
    match service.call_handle_webview_msg_with_retry(15).await {
        Ok(json_data) => {
            match T3000FfiApiService::parse_logging_response(&json_data) {
                Ok(response) => {
                    if let Some(device) = response.devices.into_iter().find(|d| d.device_info.panel_id == panel_id) {
                        api_logger.info(&format!("✅ Realtime data for device {} retrieved", panel_id));
                        Ok(Json(ApiResponse::success("get_device_realtime_data".to_string(), device)))
                    } else {
                        api_logger.error(&format!("❌ Device {} not found", panel_id));
                        Err(StatusCode::NOT_FOUND)
                    }
                }
                Err(e) => {
                    api_logger.error(&format!("❌ Parse error: {}", e));
                    Err(StatusCode::INTERNAL_SERVER_ERROR)
                }
            }
        }
        Err(e) => {
            api_logger.error(&format!("❌ FFI call failed: {}", e));
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

async fn get_system_status(
    State(_state): State<T3AppState>,
) -> Result<Json<ApiResponse<JsonValue>>, StatusCode> {
    let mut api_logger = ServiceLogger::api().unwrap_or_else(|_| ServiceLogger::new("fallback_api").unwrap());
    api_logger.info("📡 API Request - GET /api/t3000/status");

    let status = serde_json::json!({
        "service": "T3000 FFI API Service",
        "status": "running",
        "ffi_loaded": unsafe { T3000_LOADED },
        "timestamp": chrono::Utc::now().to_rfc3339()
    });

    Ok(Json(ApiResponse::success("get_system_status".to_string(), status)))
}

async fn refresh_all_data(
    State(_state): State<T3AppState>,
) -> Result<Json<ApiResponse<LoggingDataResponse>>, StatusCode> {
    let mut api_logger = ServiceLogger::api().unwrap_or_else(|_| ServiceLogger::new("fallback_api").unwrap());
    api_logger.info("📡 API Request - POST /api/t3000/refresh");

    let config = T3000ApiConfig::default();
    let service = T3000FfiApiService::new(config);

    // Force refresh by calling FFI again
    match service.call_handle_webview_msg_with_retry(15).await {
        Ok(json_data) => {
            match T3000FfiApiService::parse_logging_response(&json_data) {
                Ok(response) => {
                    api_logger.info(&format!("✅ Data refreshed - {} devices", response.devices.len()));
                    Ok(Json(ApiResponse::success("refresh_all_data".to_string(), response)))
                }
                Err(e) => {
                    api_logger.error(&format!("❌ Parse error: {}", e));
                    Err(StatusCode::INTERNAL_SERVER_ERROR)
                }
            }
        }
        Err(e) => {
            api_logger.error(&format!("❌ FFI call failed: {}", e));
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

// NEW: Direct FFI API handlers that match WebSocket client operations

/// FFI GetPanelsList - Action 4
async fn ffi_get_panels_list(
    State(_state): State<T3AppState>,
) -> Result<Json<ApiResponse<JsonValue>>, StatusCode> {
    let mut api_logger = ServiceLogger::api().unwrap_or_else(|_| ServiceLogger::new("fallback_api").unwrap());
    api_logger.info("📡 FFI API Request - GET /api/t3000/ffi/panels-list (Action 4)");

    let config = T3000ApiConfig::default();
    let service = T3000FfiApiService::new(config);

    match service.get_panels_list().await {
        Ok(json_data) => {
            // Parse and return raw JSON response
            match serde_json::from_str::<JsonValue>(&json_data) {
                Ok(parsed_data) => {
                    api_logger.info("✅ Panels list retrieved via FFI");
                    Ok(Json(ApiResponse::success("GET_PANELS_LIST".to_string(), parsed_data)))
                }
                Err(e) => {
                    api_logger.error(&format!("❌ JSON parse error: {}", e));
                    Err(StatusCode::INTERNAL_SERVER_ERROR)
                }
            }
        }
        Err(e) => {
            api_logger.error(&format!("❌ FFI call failed: {}", e));
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

/// FFI GetPanelData - Action 0
async fn ffi_get_panel_data(
    State(_state): State<T3AppState>,
    Path(panel_id): Path<i32>,
) -> Result<Json<ApiResponse<JsonValue>>, StatusCode> {
    let mut api_logger = ServiceLogger::api().unwrap_or_else(|_| ServiceLogger::new("fallback_api").unwrap());
    api_logger.info(&format!("📡 FFI API Request - GET /api/t3000/ffi/panel-data/{} (Action 0)", panel_id));

    let config = T3000ApiConfig::default();
    let service = T3000FfiApiService::new(config);

    match service.get_panel_data(panel_id).await {
        Ok(json_data) => {
            match serde_json::from_str::<JsonValue>(&json_data) {
                Ok(parsed_data) => {
                    api_logger.info(&format!("✅ Panel data for {} retrieved via FFI", panel_id));
                    Ok(Json(ApiResponse::success("GET_PANEL_DATA".to_string(), parsed_data)))
                }
                Err(e) => {
                    api_logger.error(&format!("❌ JSON parse error: {}", e));
                    Err(StatusCode::INTERNAL_SERVER_ERROR)
                }
            }
        }
        Err(e) => {
            api_logger.error(&format!("❌ FFI call failed: {}", e));
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

/// FFI GetInitialData - Action 1
async fn ffi_get_initial_data(
    State(_state): State<T3AppState>,
    Path(panel_id): Path<i32>,
) -> Result<Json<ApiResponse<JsonValue>>, StatusCode> {
    let mut api_logger = ServiceLogger::api().unwrap_or_else(|_| ServiceLogger::new("fallback_api").unwrap());
    api_logger.info(&format!("📡 FFI API Request - GET /api/t3000/ffi/initial-data/{} (Action 1)", panel_id));

    let config = T3000ApiConfig::default();
    let service = T3000FfiApiService::new(config);

    match service.get_initial_data(panel_id, None).await {
        Ok(json_data) => {
            match serde_json::from_str::<JsonValue>(&json_data) {
                Ok(parsed_data) => {
                    api_logger.info(&format!("✅ Initial data for panel {} retrieved via FFI", panel_id));
                    Ok(Json(ApiResponse::success("GET_INITIAL_DATA".to_string(), parsed_data)))
                }
                Err(e) => {
                    api_logger.error(&format!("❌ JSON parse error: {}", e));
                    Err(StatusCode::INTERNAL_SERVER_ERROR)
                }
            }
        }
        Err(e) => {
            api_logger.error(&format!("❌ FFI call failed: {}", e));
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

/// FFI GetInitialData with graphic - Action 1
async fn ffi_get_initial_data_with_graphic(
    State(_state): State<T3AppState>,
    Path((panel_id, graphic_id)): Path<(i32, i32)>,
) -> Result<Json<ApiResponse<JsonValue>>, StatusCode> {
    let mut api_logger = ServiceLogger::api().unwrap_or_else(|_| ServiceLogger::new("fallback_api").unwrap());
    api_logger.info(&format!("📡 FFI API Request - GET /api/t3000/ffi/initial-data/{}/{} (Action 1)", panel_id, graphic_id));

    let config = T3000ApiConfig::default();
    let service = T3000FfiApiService::new(config);

    match service.get_initial_data(panel_id, Some(graphic_id)).await {
        Ok(json_data) => {
            match serde_json::from_str::<JsonValue>(&json_data) {
                Ok(parsed_data) => {
                    api_logger.info(&format!("✅ Initial data for panel {} graphic {} retrieved via FFI", panel_id, graphic_id));
                    Ok(Json(ApiResponse::success("GET_INITIAL_DATA".to_string(), parsed_data)))
                }
                Err(e) => {
                    api_logger.error(&format!("❌ JSON parse error: {}", e));
                    Err(StatusCode::INTERNAL_SERVER_ERROR)
                }
            }
        }
        Err(e) => {
            api_logger.error(&format!("❌ FFI call failed: {}", e));
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

/// FFI GetEntries - Action 6
async fn ffi_get_entries(
    State(_state): State<T3AppState>,
    Path(panel_id): Path<i32>,
) -> Result<Json<ApiResponse<JsonValue>>, StatusCode> {
    let mut api_logger = ServiceLogger::api().unwrap_or_else(|_| ServiceLogger::new("fallback_api").unwrap());
    api_logger.info(&format!("📡 FFI API Request - GET /api/t3000/ffi/entries/{} (Action 6)", panel_id));

    let config = T3000ApiConfig::default();
    let service = T3000FfiApiService::new(config);

    match service.get_entries(panel_id, None).await {
        Ok(json_data) => {
            match serde_json::from_str::<JsonValue>(&json_data) {
                Ok(parsed_data) => {
                    api_logger.info(&format!("✅ Entries for panel {} retrieved via FFI", panel_id));
                    Ok(Json(ApiResponse::success("GET_ENTRIES".to_string(), parsed_data)))
                }
                Err(e) => {
                    api_logger.error(&format!("❌ JSON parse error: {}", e));
                    Err(StatusCode::INTERNAL_SERVER_ERROR)
                }
            }
        }
        Err(e) => {
            api_logger.error(&format!("❌ FFI call failed: {}", e));
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

/// FFI GetEntries with graphic - Action 6
async fn ffi_get_entries_with_graphic(
    State(_state): State<T3AppState>,
    Path((panel_id, graphic_id)): Path<(i32, i32)>,
) -> Result<Json<ApiResponse<JsonValue>>, StatusCode> {
    let mut api_logger = ServiceLogger::api().unwrap_or_else(|_| ServiceLogger::new("fallback_api").unwrap());
    api_logger.info(&format!("📡 FFI API Request - GET /api/t3000/ffi/entries/{}/{} (Action 6)", panel_id, graphic_id));

    let config = T3000ApiConfig::default();
    let service = T3000FfiApiService::new(config);

    match service.get_entries(panel_id, Some(graphic_id)).await {
        Ok(json_data) => {
            match serde_json::from_str::<JsonValue>(&json_data) {
                Ok(parsed_data) => {
                    api_logger.info(&format!("✅ Entries for panel {} graphic {} retrieved via FFI", panel_id, graphic_id));
                    Ok(Json(ApiResponse::success("GET_ENTRIES".to_string(), parsed_data)))
                }
                Err(e) => {
                    api_logger.error(&format!("❌ JSON parse error: {}", e));
                    Err(StatusCode::INTERNAL_SERVER_ERROR)
                }
            }
        }
        Err(e) => {
            api_logger.error(&format!("❌ FFI call failed: {}", e));
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

/// FFI GetSelectedDeviceInfo - Action 12
async fn ffi_get_selected_device_info(
    State(_state): State<T3AppState>,
    Path(panel_id): Path<i32>,
) -> Result<Json<ApiResponse<JsonValue>>, StatusCode> {
    let mut api_logger = ServiceLogger::api().unwrap_or_else(|_| ServiceLogger::new("fallback_api").unwrap());
    api_logger.info(&format!("📡 FFI API Request - GET /api/t3000/ffi/device-info/{} (Action 12)", panel_id));

    let config = T3000ApiConfig::default();
    let service = T3000FfiApiService::new(config);

    match service.get_selected_device_info(panel_id).await {
        Ok(json_data) => {
            match serde_json::from_str::<JsonValue>(&json_data) {
                Ok(parsed_data) => {
                    api_logger.info(&format!("✅ Device info for panel {} retrieved via FFI", panel_id));
                    Ok(Json(ApiResponse::success("GET_SELECTED_DEVICE_INFO".to_string(), parsed_data)))
                }
                Err(e) => {
                    api_logger.error(&format!("❌ JSON parse error: {}", e));
                    Err(StatusCode::INTERNAL_SERVER_ERROR)
                }
            }
        }
        Err(e) => {
            api_logger.error(&format!("❌ FFI call failed: {}", e));
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}
