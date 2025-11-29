// TrendLog Monitor Service - Lightweight FFI for new C++ trendlog export functions
// This service specifically calls the NEW BacnetWebView_GetTrendlogList/Entry functions
// that replicate Fresh_Monitor_List() logic from BacnetMonitor.cpp
//
// PURPOSE: Get trendlog data like the C++ popup window (NUM, Label, Interval, Status, Data Size)
// SCOPE: Only calls new export functions, does not duplicate existing FFI infrastructure
// DATA FLOW: New C++ exports → This service → TRENDLOG table

use std::os::raw::{c_char, c_int};
use sea_orm::*;
use serde::{Deserialize, Serialize};
use chrono::Utc;
use std::sync::Arc;
use tokio::sync::Mutex;
use std::ffi::CString;

use crate::entity::t3_device::trendlogs;
use crate::error::AppError;
use crate::logger::{write_structured_log_with_level, LogLevel};

// Dynamic loading approach to avoid linking errors
#[cfg(target_os = "windows")]
use winapi::um::libloaderapi::{GetProcAddress, GetModuleHandleA};
#[cfg(target_os = "windows")]
use winapi::shared::minwindef::HINSTANCE;

// Function pointer types for dynamic loading
type GetTrendlogListFn = unsafe extern "C" fn(panel_id: c_int, result_buffer: *mut c_char, buffer_size: c_int) -> c_int;
type GetTrendlogEntryFn = unsafe extern "C" fn(panel_id: c_int, monitor_index: c_int, result_buffer: *mut c_char, buffer_size: c_int) -> c_int;
type SyncMonitorDataFn = unsafe extern "C" fn(panel_id: c_int) -> c_int;/// Trendlog data structure matching C++ Fresh_Monitor_List output
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrendlogMonitorData {
    pub num: i32,                    // Monitor index (NUM column)
    pub id: String,                  // Monitor ID (MON1, MON2, etc.)
    pub label: String,               // Label from monitor data
    pub interval_seconds: i32,       // Interval in seconds
    pub interval_text: String,       // Human readable interval (e.g., "5m 30s")
    pub status: String,              // "ON" or "OFF"
    pub status_code: i32,            // 1=ON, 0=OFF
    pub data_size_kb: f32,          // Data size in KB
    pub data_size_text: String,      // Formatted data size
    pub num_inputs: i32,             // Number of input points
    pub an_inputs: i32,              // Analog inputs
}

/// Complete trendlog list response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrendlogListResponse {
    pub success: bool,
    pub panel_id: i32,
    pub total_monitors: i32,
    pub trendlogs: Vec<TrendlogMonitorData>,
    pub timestamp: i64,
}

/// Single trendlog entry with input details
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrendlogEntryResponse {
    pub success: bool,
    pub panel_id: i32,
    pub monitor_index: i32,
    pub trendlog: TrendlogMonitorData,
    pub inputs: Vec<TrendlogInputData>,
    pub timestamp: i64,
}

/// Trendlog input point data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrendlogInputData {
    pub index: i32,
    pub panel: i32,
    pub sub_panel: i32,
    pub point_type: i32,
    pub point_number: i32,
    pub network: i32,
    pub range: i32,
}

/// Lightweight TrendLog Monitor Service
pub struct TrendlogMonitorService {
    db_connection: Arc<Mutex<DatabaseConnection>>,
    buffer_size: usize,
    // Optional function pointers loaded dynamically
    get_trendlog_list_fn: Option<GetTrendlogListFn>,
    get_trendlog_entry_fn: Option<GetTrendlogEntryFn>,
    sync_monitor_data_fn: Option<SyncMonitorDataFn>,
}

impl TrendlogMonitorService {
    /// Create new service instance
    pub fn new(db_connection: Arc<Mutex<DatabaseConnection>>) -> Self {
        // Try to dynamically load the C++ functions
        let (get_trendlog_list_fn, get_trendlog_entry_fn, sync_monitor_data_fn) = Self::try_load_ffi_functions();

        Self {
            db_connection,
            buffer_size: 65536, // 64KB buffer for JSON responses
            get_trendlog_list_fn,
            get_trendlog_entry_fn,
            sync_monitor_data_fn,
        }
    }

    /// Attempt to dynamically load T3000 FFI functions
    #[cfg(target_os = "windows")]
    fn try_load_ffi_functions() -> (Option<GetTrendlogListFn>, Option<GetTrendlogEntryFn>, Option<SyncMonitorDataFn>) {
        unsafe {
            // Try to get handle to current process (where T3000.exe functions should be)
            // LoadLibraryA(NULL) does not return the current module; use GetModuleHandleA(NULL)
            let module = GetModuleHandleA(std::ptr::null()); // Current process
            if module.is_null() {
                return (None, None, None);
            }

            // Try to get function pointers
            let list_fn_name = CString::new("BacnetWebView_GetTrendlogList").unwrap();
            let entry_fn_name = CString::new("BacnetWebView_GetTrendlogEntry").unwrap();
            let sync_fn_name = CString::new("BacnetWebView_SyncMonitorData").unwrap();

            let list_fn = GetProcAddress(module, list_fn_name.as_ptr());
            let entry_fn = GetProcAddress(module, entry_fn_name.as_ptr());
            let sync_fn = GetProcAddress(module, sync_fn_name.as_ptr());

            let list_fn = if !list_fn.is_null() {
                Some(std::mem::transmute::<_, GetTrendlogListFn>(list_fn))
            } else {
                None
            };

            let entry_fn = if !entry_fn.is_null() {
                Some(std::mem::transmute::<_, GetTrendlogEntryFn>(entry_fn))
            } else {
                None
            };

            let sync_fn = if !sync_fn.is_null() {
                Some(std::mem::transmute::<_, SyncMonitorDataFn>(sync_fn))
            } else {
                None
            };

            (list_fn, entry_fn, sync_fn)
        }
    }

    /// Non-Windows platforms - no FFI available
    #[cfg(not(target_os = "windows"))]
    fn try_load_ffi_functions() -> (Option<GetTrendlogListFn>, Option<GetTrendlogEntryFn>, Option<SyncMonitorDataFn>) {
        (None, None, None)
    }

    /// Get trendlog list for a device using new C++ export function
    pub async fn get_trendlog_list(&self, panel_id: i32) -> Result<TrendlogListResponse, AppError> {
        use crate::logger::{write_structured_log_with_level, LogLevel};
        let _ = write_structured_log_with_level("T3_Webview_Trendlog_Monitor", &format!("🔍 Getting trendlog list for panel_id: {}", panel_id), LogLevel::Info);

        // Check if FFI function is available
        if let Some(ffi_fn) = self.get_trendlog_list_fn {
            let _ = write_structured_log_with_level("T3_Webview_Trendlog_Monitor", "✅ Using NEW C++ export function: BacnetWebView_GetTrendlogList", LogLevel::Info);
            // Prepare buffer for C++ response
            let mut buffer = vec![0u8; self.buffer_size];

            // Call the dynamically loaded C++ function
            let result = unsafe {
                ffi_fn(
                    panel_id,
                    buffer.as_mut_ptr() as *mut c_char,
                    self.buffer_size as c_int,
                )
            };

            if result > 0 {
                let _ = write_structured_log_with_level("T3_Webview_Trendlog_Monitor", &format!("✅ C++ export function returned {} bytes", result), LogLevel::Info);

                // Convert buffer to string (result contains actual length)
                let json_str = unsafe {
                    std::str::from_utf8_unchecked(&buffer[..result as usize])
                };

                let _ = write_structured_log_with_level("T3_Webview_Trendlog_Monitor", &format!("📋 C++ Response: {}", json_str), LogLevel::Info);

                // Parse JSON response from C++
                match serde_json::from_str::<TrendlogListResponse>(json_str) {
                    Ok(response) => {
                        let _ = write_structured_log_with_level("T3_Webview_Trendlog_Monitor", &format!("🎉 Successfully retrieved {} trendlogs for panel_id {} via NEW C++ exports", response.trendlogs.len(), panel_id), LogLevel::Info);
                        return Ok(response);
                    },
                    Err(e) => {
                        let _ = write_structured_log_with_level(
                            "T3_Webview_Trendlog_Monitor",
                            &format!("Failed to parse C++ JSON response: {}", e),
                            LogLevel::Warn,
                        );
                    }
                }
            }
        }

        // Fallback: return mock/empty response when FFI is not available
        let _ = write_structured_log_with_level("T3_Webview_Trendlog_Monitor", &format!("⚠️ NEW C++ export functions NOT available for panel_id {}, returning empty fallback data", panel_id), LogLevel::Warn);

        Ok(TrendlogListResponse {
            success: true,
            panel_id,
            total_monitors: 0,
            trendlogs: vec![],
            timestamp: chrono::Utc::now().timestamp(),
        })
    }    /// Get specific trendlog entry using new C++ export function
    pub async fn get_trendlog_entry(&self, panel_id: i32, monitor_index: i32) -> Result<TrendlogEntryResponse, AppError> {
        // Check if FFI function is available
        if let Some(ffi_fn) = self.get_trendlog_entry_fn {
            // Prepare buffer for C++ response
            let mut buffer = vec![0u8; self.buffer_size];

            // Call the dynamically loaded C++ function
            let result = unsafe {
                ffi_fn(
                    panel_id,
                    monitor_index,
                    buffer.as_mut_ptr() as *mut c_char,
                    self.buffer_size as c_int,
                )
            };

            if result > 0 {
                // Convert buffer to string
                let json_str = unsafe {
                    std::str::from_utf8_unchecked(&buffer[..result as usize])
                };

                // Parse JSON response from C++
                match serde_json::from_str::<TrendlogEntryResponse>(json_str) {
                    Ok(response) => {
                        // Log successful retrieval
                        let _ = write_structured_log_with_level(
                            "T3_Webview_Trendlog_Monitor",
                            &format!("Retrieved trendlog entry panel_id {} monitor {}", panel_id, monitor_index),
                            LogLevel::Info,
                        );
                        return Ok(response);
                    },
                    Err(e) => {
                        let _ = write_structured_log_with_level(
                            "T3_Webview_Trendlog_Monitor",
                            &format!("Failed to parse C++ entry JSON response: {}", e),
                            LogLevel::Warn,
                        );
                    }
                }
            }
        }

        // Fallback: return mock/empty response when FFI is not available
        let _ = write_structured_log_with_level(
            "T3_Webview_Trendlog_Monitor",
            &format!("FFI not available for panel_id {} monitor {}, returning fallback data", panel_id, monitor_index),
            LogLevel::Warn,
        );

        Ok(TrendlogEntryResponse {
            success: true,
            panel_id,
            monitor_index,
            trendlog: TrendlogMonitorData {
                num: monitor_index,
                id: format!("MON{}", monitor_index + 1),
                label: format!("Monitor {} (Fallback)", monitor_index + 1),
                interval_seconds: 300,
                interval_text: "5 min".to_string(),
                status: "UNKNOWN".to_string(),
                status_code: -1,
                data_size_kb: 0.0,
                data_size_text: "0.00".to_string(),
                num_inputs: 0,
                an_inputs: 0,
            },
            inputs: vec![],
            timestamp: chrono::Utc::now().timestamp(),
        })
    }

    /// Sync m_monitor_data to g_monitor_data[panel_id] to ensure data is accessible
    /// This should be called BEFORE getting trendlog data
    pub async fn sync_monitor_data_to_global(&self, panel_id: i32) -> Result<i32, AppError> {
        if let Some(sync_fn) = self.sync_monitor_data_fn {
            let result = unsafe { sync_fn(panel_id) };

            if result >= 0 {
                let _ = write_structured_log_with_level(
                    "T3_Webview_Trendlog_Monitor",
                    &format!("✅ Synced {} monitors to g_monitor_data[{}]", result, panel_id),
                    LogLevel::Info,
                );
                Ok(result)
            } else {
                let _ = write_structured_log_with_level(
                    "T3_Webview_Trendlog_Monitor",
                    &format!("⚠️ Failed to sync monitor data for panel_id {}: returned {}", panel_id, result),
                    LogLevel::Warn,
                );
                Err(AppError::NotFound(format!("Failed to sync monitor data for panel_id {}", panel_id)))
            }
        } else {
            let _ = write_structured_log_with_level(
                "T3_Webview_Trendlog_Monitor",
                &format!("⚠️ BacnetWebView_SyncMonitorData function not available"),
                LogLevel::Warn,
            );
            // Not a fatal error, just means the function isn't available
            Ok(0)
        }
    }

    /// Sync all trendlog data to database (saves to TRENDLOG table)
    /// panel_id: The panel ID used to call C++ function (1, 2, 3, etc.)
    /// serial_number: The actual device serial number to save in database
    pub async fn sync_trendlogs_to_database(&self, panel_id: i32, serial_number: i32) -> Result<usize, AppError> {
        // First, ensure monitor data is synced to global array
        let _ = self.sync_monitor_data_to_global(panel_id).await;

        // Get trendlog list from C++
        let trendlog_list = self.get_trendlog_list(panel_id).await?;

        let db = self.db_connection.lock().await;
        let mut synced_count = 0;

        // Process each trendlog
        for trendlog_data in &trendlog_list.trendlogs {
            // Create or update trendlog entry in database
            // Pass panel_id (device's panel ID) along with serial_number and trendlog data
            let result = self.save_trendlog_to_database(&*db, serial_number, panel_id, trendlog_data).await;

            match result {
                Ok(_) => {
                    synced_count += 1;
                    let _ = write_structured_log_with_level(
                        "T3_Webview_Trendlog_Monitor",
                        &format!("Saved trendlog {} '{}' to database", trendlog_data.num, trendlog_data.label),
                        LogLevel::Info,
                    );
                },
                Err(e) => {
                    let _ = write_structured_log_with_level(
                        "T3_Webview_Trendlog_Monitor",
                        &format!("Failed to save trendlog {} to database: {}", trendlog_data.num, e),
                        LogLevel::Error,
                    );
                }
            }
        }

        let _ = write_structured_log_with_level(
            "T3_Webview_Trendlog_Monitor",
            &format!("Synced {}/{} trendlogs for panel_id {} to database",
                synced_count, trendlog_list.trendlogs.len(), panel_id),
            LogLevel::Info,
        );

        Ok(synced_count)
    }

    /// Save individual trendlog to TRENDLOGS table
    /// device_id: SerialNumber of the device
    /// panel_id: Actual device panel ID (from DEVICES table)
    /// trendlog: Trendlog data from C++ (trendlog.num is monitor index 0-11)
    async fn save_trendlog_to_database(
        &self,
        db: &DatabaseConnection,
        device_id: i32,
        panel_id: i32,
        trendlog: &TrendlogMonitorData
    ) -> Result<(), AppError> {
        use sea_orm::{ActiveModelTrait, Set};

        // FIXED: The unique key is (SerialNumber, Trendlog_ID) where Trendlog_ID is "MON1", "MON2", etc.
        // PanelId should store the device's actual panel ID, not the monitor index
        // trendlog.num is the monitor index (0-11), trendlog.id SHOULD be "MON1"-"MON12" but might be unreliable
        // SOLUTION: Generate consistent Trendlog_ID from monitor index (trendlog.num)
        let trendlog_id = format!("MON{}", trendlog.num + 1);  // MON1-MON12 (0-based to 1-based)

        let existing = trendlogs::Entity::find()
            .filter(trendlogs::Column::SerialNumber.eq(device_id))
            .filter(trendlogs::Column::TrendlogId.eq(&trendlog_id))
            .one(db)
            .await?;

        let now = Utc::now().format("%Y-%m-%d %H:%M:%S UTC").to_string();

        if let Some(existing_trendlog) = existing {
            // UPDATE existing trendlog with fresh data from C++
            let mut update_model: trendlogs::ActiveModel = existing_trendlog.into();

            // Update fields with fresh data from C++ (DO NOT update Trendlog_ID - it's the unique key!)
            // NOTE: Trendlog_ID remains unchanged - it's part of the UNIQUE key (SerialNumber, Trendlog_ID)
            update_model.trendlog_label = Set(Some(trendlog.label.clone()));
            // FIXED: Store interval_seconds directly (not divided by 60) to preserve sub-minute intervals
            update_model.interval_seconds = Set(Some(trendlog.interval_seconds));
            update_model.status = Set(Some(trendlog.status.clone()));
            update_model.data_size_kb = Set(Some(trendlog.data_size_text.clone()));
            update_model.buffer_size = Set(Some((trendlog.data_size_kb * 1000.0) as i32)); // Update buffer size
            update_model.updated_at = Set(Some(now.clone()));
            update_model.ffi_synced = Set(Some(1)); // Mark as FFI synced
            update_model.last_ffi_sync = Set(Some(now));

            let _ = write_structured_log_with_level(
                "T3_Webview_Trendlog_Monitor",
                &format!("UPDATING trendlog: SerialNumber={}, PanelId={}, MonitorIndex={}, ID='{}' (from C++: '{}'), Label='{}'",
                    device_id, panel_id, trendlog.num, trendlog_id, trendlog.id, trendlog.label),
                LogLevel::Info,
            );

            update_model.update(db).await?;
        } else {
            // INSERT new trendlog entry
            let new_trendlog = trendlogs::ActiveModel {
                serial_number: Set(device_id),
                panel_id: Set(panel_id),  // FIXED: Use device's actual panel ID, not monitor index
                trendlog_id: Set(trendlog_id.clone()),  // Use generated ID (MON1-MON12)
                trendlog_label: Set(Some(trendlog.label.clone())),
                // FIXED: Store interval_seconds directly (not divided by 60) to preserve sub-minute intervals
                // Database column is "Interval_Minutes" but Rust field is interval_seconds (reflects actual data)
                interval_seconds: Set(Some(trendlog.interval_seconds)),
                data_size_kb: Set(Some(trendlog.data_size_text.clone())),
                status: Set(Some(trendlog.status.clone())),
                auto_manual: Set(Some("Auto".to_string())), // Default to Auto
                buffer_size: Set(Some((trendlog.data_size_kb * 1000.0) as i32)), // Convert KB to bytes
                created_at: Set(Some(now.clone())),
                updated_at: Set(Some(now.clone())),
                ffi_synced: Set(Some(1)), // Mark as FFI synced
                last_ffi_sync: Set(Some(now)),
                ..Default::default()
            };

            let _ = write_structured_log_with_level(
                "T3_Webview_Trendlog_Monitor",
                &format!("INSERTING new trendlog: SerialNumber={}, PanelId={}, MonitorIndex={}, ID='{}' (from C++: '{}'), Label='{}'",
                    device_id, panel_id, trendlog.num, trendlog_id, trendlog.id, trendlog.label),
                LogLevel::Info,
            );

            new_trendlog.insert(db).await?;
        }

        Ok(())
    }

    /// Get all trendlog data and sync to database for all configured devices
    /// FIXED: Now properly queries devices table for actual SerialNumber and PanelId
    pub async fn sync_all_devices(&self) -> Result<usize, AppError> {
        use crate::entity::t3_device::devices;

        // Query all devices from the database
        let db = self.db_connection.lock().await;
        let all_devices = devices::Entity::find()
            .all(&*db)
            .await
            .map_err(|e| AppError::DatabaseError(format!("Failed to query devices: {}", e)))?;

        drop(db); // Release lock before sync operations

        if all_devices.is_empty() {
            let _ = write_structured_log_with_level(
                "T3_Webview_Trendlog_Monitor",
                "No devices found in database to sync",
                LogLevel::Warn,
            );
            return Ok(0);
        }

        let _ = write_structured_log_with_level(
            "T3_Webview_Trendlog_Monitor",
            &format!("Found {} devices in database, starting trendlog sync", all_devices.len()),
            LogLevel::Info,
        );

        let mut total_synced = 0;

        for device in all_devices {
            let serial_number = device.serial_number;
            let panel_id = device.panel_id.unwrap_or(device.panel_number.unwrap_or(1));

            let _ = write_structured_log_with_level(
                "T3_Webview_Trendlog_Monitor",
                &format!("Syncing device: SerialNumber={}, PanelId={}, ProductName={:?}",
                    serial_number, panel_id, device.product_name),
                LogLevel::Info,
            );

            // FIXED: Now correctly uses actual panel_id and serial_number from database
            match self.sync_trendlogs_to_database(panel_id, serial_number).await {
                Ok(count) => {
                    total_synced += count;
                    let _ = write_structured_log_with_level(
                        "T3_Webview_Trendlog_Monitor",
                        &format!("✅ Synced {} trendlogs for device SerialNumber={}, PanelId={}",
                            count, serial_number, panel_id),
                        LogLevel::Info,
                    );
                },
                Err(e) => {
                    // Log error but continue with other devices
                    let _ = write_structured_log_with_level(
                        "T3_Webview_Trendlog_Monitor",
                        &format!("⚠️ Failed to sync trendlogs for device SerialNumber={}, PanelId={}: {}",
                            serial_number, panel_id, e),
                        LogLevel::Warn,
                    );
                }
            }
        }

        let _ = write_structured_log_with_level(
            "T3_Webview_Trendlog_Monitor",
            &format!("✅ Total trendlogs synced: {} across {} devices", total_synced, all_devices.len()),
            LogLevel::Info,
        );

        Ok(total_synced)
    }

    /// Test connectivity to new C++ export functions
    pub async fn test_ffi_connectivity(&self) -> Result<bool, AppError> {
        // Check if FFI functions are dynamically loaded
        let has_list_fn = self.get_trendlog_list_fn.is_some();
        let has_entry_fn = self.get_trendlog_entry_fn.is_some();

        if has_list_fn && has_entry_fn {
            // Test with a basic call to panel_id 1
            match self.get_trendlog_list(1).await {
                Ok(response) => {
                    if !response.trendlogs.is_empty() {
                        let _ = write_structured_log_with_level(
                            "T3_Webview_Trendlog_Monitor",
                            &format!("FFI connectivity test successful - got {} trendlogs", response.trendlogs.len()),
                            LogLevel::Info,
                        );
                        Ok(true)
                    } else {
                        let _ = write_structured_log_with_level(
                            "T3_Webview_Trendlog_Monitor",
                            "FFI functions loaded but returned empty data - may indicate T3000 not running or no devices configured",
                            LogLevel::Warn,
                        );
                        Ok(false)
                    }
                },
                Err(_) => {
                    let _ = write_structured_log_with_level(
                        "T3_Webview_Trendlog_Monitor",
                        "FFI functions loaded but call failed - T3000 may not be ready",
                        LogLevel::Warn,
                    );
                    Ok(false)
                }
            }
        } else {
            let _ = write_structured_log_with_level(
                "T3_Webview_Trendlog_Monitor",
                &format!("FFI functions not available - list_fn: {}, entry_fn: {}", has_list_fn, has_entry_fn),
                LogLevel::Info,
            );
            Ok(false)
        }
    }
}

/// Create shared trendlog monitor service
pub fn create_trendlog_monitor_service(db_connection: Arc<Mutex<DatabaseConnection>>) -> TrendlogMonitorService {
    TrendlogMonitorService::new(db_connection)
}

/// Initialize and test the service
pub async fn initialize_trendlog_monitor_service(
    db_connection: Arc<Mutex<DatabaseConnection>>
) -> Result<TrendlogMonitorService, AppError> {
    let service = create_trendlog_monitor_service(db_connection);

    // Test connectivity
    let is_connected = service.test_ffi_connectivity().await?;

    if is_connected {
        let _ = write_structured_log_with_level(
            "T3_Webview_Trendlog_Monitor",
            "TrendLog Monitor Service initialized successfully with C++ FFI connectivity",
            LogLevel::Info,
        );
    } else {
        let _ = write_structured_log_with_level(
            "T3_Webview_Trendlog_Monitor",
            "TrendLog Monitor Service initialized but C++ FFI not available (fallback mode)",
            LogLevel::Warn,
        );
    }

    Ok(service)
}
