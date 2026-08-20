// T3000 TrendLog FFI Service - Complete TrendLog information retrieval from T3000 C++
// This service provides FFI integration to get complete TrendLog information including:
// - Main TrendLog configuration (from Str_monitor_point structure)
// - Related input/output/variable points (from Point_Net inputs array)
// - Real-time status and data management

use std::os::raw::{c_char, c_int};
use sea_orm::*;
use sea_orm::prelude::Expr;
use sea_orm::ActiveValue::NotSet;
use migration::OnConflict;
use serde::{Serialize, Deserialize};
use chrono::Utc;

use crate::entity::t3_device::{trendlogs, trendlog_inputs, trendlog_views};
use crate::error::AppError;
use crate::logging::types::LogLevel;

fn emit_ffi_log_sync(category: &str, message: &str, level: LogLevel) {
    let handle = match tokio::runtime::Handle::try_current() {
        Ok(handle) => handle,
        Err(_) => return,
    };

    let category_owned = category.to_string();
    let message_owned = message.to_string();
    let level_owned = level.as_lower().to_string();

    handle.spawn(async move {
        let db = match crate::db_connection::establish_t3_device_connection().await {
            Ok(db) => db,
            Err(_) => return,
        };
        crate::logging::service::emit_app_log(
            &db,
            &level_owned,
            &category_owned,
            Some("trendlog_ffi_service"),
            None,
            &message_owned,
            None,
        )
        .await;
    });
}

// Link to T3000.exe functions - requires T3000.exe to be running
#[link(name = "kernel32")]
extern "system" {
    // Windows API for dynamic library loading
    #[allow(non_snake_case)]
    #[allow(dead_code)]
    fn LoadLibraryA(name: *const u8) -> *mut std::ffi::c_void;
    fn GetProcAddress(handle: *mut std::ffi::c_void, name: *const u8) -> *mut std::ffi::c_void;
    fn GetModuleHandleA(name: *const u8) -> *mut std::ffi::c_void;
}

// T3000 FFI function types
type PostRefreshMessageFn = unsafe extern "C" fn(c_int, c_int, c_int, c_int) -> c_int;
type BacnetWebViewGetTrendlogEntryFn = unsafe extern "C" fn(c_int, c_int, *mut c_char, c_int) -> c_int;
type BacnetWebViewGetTrendlogListFn = unsafe extern "C" fn(c_int, *mut c_char, c_int) -> c_int;

/// Check if T3000.exe is running and accessible for FFI operations
fn check_t3000_availability() -> Result<(), String> {
    unsafe {
        let handle = GetModuleHandleA(b"T3000.exe\0".as_ptr());
        if handle.is_null() {
            return Err("T3000.exe is not running or not accessible. Please ensure T3000 Building Automation software is started and connected to your device.".to_string());
        }

        // Check that the exported trendlog bridge is available. We probe the
        // symbol that is actually present in T3000.exe's export table
        // (T3000_IsDeviceOnline / T3000_ConnectToDevice are NOT exported).
        let entry_func = GetProcAddress(handle, b"BacnetWebView_GetTrendlogEntry\0".as_ptr());

        if entry_func.is_null() {
            return Err("T3000.exe is running but the BacnetWebView_GetTrendlogEntry export is not available. Please update T3000 software or check compatibility.".to_string());
        }

        let _ = emit_ffi_log_sync("T3_FFI", "[OK] T3000.exe is available and ready for FFI operations", LogLevel::Info);
        Ok(())
    }
}

// T3000 FFI function wrappers with dynamic loading
#[allow(dead_code)]
#[allow(non_snake_case)]
unsafe fn Post_Refresh_Message(device_id: c_int, point_type: c_int, start_instance: c_int, end_instance: c_int) -> c_int {
    let handle = GetModuleHandleA(b"T3000.exe\0".as_ptr());
    if handle.is_null() {
        println!("T3000.exe not found - returning error");
        return 0;
    }

    let func_ptr = GetProcAddress(handle, b"Post_Refresh_Message\0".as_ptr());
    if func_ptr.is_null() {
        println!("Post_Refresh_Message function not found");
        return 0;
    }

    let func: PostRefreshMessageFn = std::mem::transmute(func_ptr);
    func(device_id, point_type, start_instance, end_instance)
}

/// Fetch a single TrendLog entry from T3000.exe as JSON via the exported
/// `BacnetWebView_GetTrendlogEntry` bridge. Matches the C++ signature:
///   int BacnetWebView_GetTrendlogEntry(int panel_id, int monitor_index, char* buffer, int buffer_size)
/// Returns the JSON byte length (>0) on success, or <=0 on failure.
#[allow(non_snake_case)]
unsafe fn BacnetWebView_GetTrendlogEntry(panel_id: c_int, monitor_index: c_int, buffer: *mut c_char, buffer_size: c_int) -> c_int {
    let handle = GetModuleHandleA(b"T3000.exe\0".as_ptr());
    if handle.is_null() {
        println!("T3000.exe not found - returning error");
        return -1;
    }

    let func_ptr = GetProcAddress(handle, b"BacnetWebView_GetTrendlogEntry\0".as_ptr());
    if func_ptr.is_null() {
        println!("BacnetWebView_GetTrendlogEntry function not found");
        return -1;
    }

    let func: BacnetWebViewGetTrendlogEntryFn = std::mem::transmute(func_ptr);
    func(panel_id, monitor_index, buffer, buffer_size)
}

/// Fetch the full TrendLog list from T3000.exe as JSON via the exported
/// `BacnetWebView_GetTrendlogList` bridge. Matches the C++ signature:
///   int BacnetWebView_GetTrendlogList(int panel_id, char* result_buffer, int buffer_size)
/// Returns the JSON byte length (>0) on success, or <=0 on failure.
#[allow(non_snake_case)]
unsafe fn BacnetWebView_GetTrendlogList(panel_id: c_int, buffer: *mut c_char, buffer_size: c_int) -> c_int {
    let handle = GetModuleHandleA(b"T3000.exe\0".as_ptr());
    if handle.is_null() {
        println!("T3000.exe not found - returning error");
        return -1;
    }

    let func_ptr = GetProcAddress(handle, b"BacnetWebView_GetTrendlogList\0".as_ptr());
    if func_ptr.is_null() {
        println!("BacnetWebView_GetTrendlogList function not found");
        return -1;
    }

    let func: BacnetWebViewGetTrendlogListFn = std::mem::transmute(func_ptr);
    func(panel_id, buffer, buffer_size)
}

// Processed TrendLog information for database storage
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TrendLogInfo {
    pub serial_number: i32,
    pub panel_id: i32,
    pub trendlog_id: String,
    pub trendlog_label: String,
    pub interval_seconds: i32,  // Stores seconds (not minutes)
    pub status: String,
    pub num_inputs: i32,
    pub analog_inputs: i32,
    pub buffer_size: Option<i32>,
    pub data_size_kb: String,
    pub related_points: Vec<RelatedPointInfo>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RelatedPointInfo {
    pub point_type: String,
    pub point_index: String,
    pub point_panel: String,
    pub point_label: String,
    pub network: u8,
    pub range_value: u8,
}

// View selection structure for API
#[derive(Debug, Serialize, Deserialize)]
pub struct ViewSelection {
    pub point_type: String,
    pub point_index: String,
    pub point_label: String,
    pub is_selected: bool,
}

// Main TrendLog FFI Service
pub struct TrendLogFFIService;

impl TrendLogFFIService {
    /// Create initial TrendLog info from URL parameters (before FFI sync)
    /// This allows the page to initialize quickly with basic info
    pub async fn create_initial_trendlog_info(
        device_id: u32,
        trendlog_id: &str,
        db: &DatabaseConnection
    ) -> Result<TrendLogInfo, AppError> {
        Self::create_initial_trendlog_info_with_panel(device_id, 1, trendlog_id, db).await
    }

    /// Create initial TrendLog info with specific panel_id (before FFI sync)
    /// This allows the page to initialize quickly with basic info
    pub async fn create_initial_trendlog_info_with_panel(
        device_id: u32,
        panel_id: i32,
        trendlog_id: &str,
        db: &DatabaseConnection
    ) -> Result<TrendLogInfo, AppError> {
        Self::create_initial_trendlog_info_with_panel_and_title(device_id, panel_id, trendlog_id, None, db).await
    }

    /// Create fallback TrendLog info when FFI is not available
    /// First tries WebMessage API, then falls back to database
    async fn create_fallback_trendlog_info(
        device_id: u32,
        trendlog_id: &str,
        db: &DatabaseConnection
    ) -> Result<TrendLogInfo, AppError> {
        let _ = emit_ffi_log_sync("T3_Webview_TRL_FFI", &format!("[SYNC] Creating fallback TrendLog info for {} (device {})", trendlog_id, device_id), LogLevel::Info);

        // FIRST: Try WebMessage API path (T3000 may still be running, just FFI broken)
        if let Ok(webmessage_info) = Self::try_webmessage_trendlog_info(device_id, trendlog_id).await {
            let _ = emit_ffi_log_sync("T3_Webview_TRL_FFI", "[OK] Successfully retrieved TrendLog data via WebMessage API", LogLevel::Info);
            return Ok(webmessage_info);
        }

        let _ = emit_ffi_log_sync("T3_Webview_TRL_FFI", "[WARN] WebMessage API also unavailable, falling back to database", LogLevel::Warn);

        // SECOND: Try to get existing trendlog from database
        match trendlogs::Entity::find()
            .filter(trendlogs::Column::SerialNumber.eq(device_id as i32))
            .filter(trendlogs::Column::TrendlogId.eq(trendlog_id))
            .one(db)
            .await?
        {
            Some(existing_trendlog) => {
                let _ = emit_ffi_log_sync("T3_Webview_TRL_FFI", "[OK] Found existing trendlog in database, using stored configuration", LogLevel::Info);

                // Get related inputs
                let related_inputs = trendlog_inputs::Entity::find()
                    .filter(trendlog_inputs::Column::SerialNumber.eq(device_id as i32))
                    .filter(trendlog_inputs::Column::TrendlogId.eq(trendlog_id))
                    .all(db)
                    .await?;

                Ok(TrendLogInfo {
                    serial_number: existing_trendlog.serial_number,
                    panel_id: existing_trendlog.panel_id,
                    trendlog_id: existing_trendlog.trendlog_id,
                    trendlog_label: existing_trendlog.trendlog_label.unwrap_or_else(|| format!("TrendLog {}", trendlog_id)),
                    interval_seconds: existing_trendlog.interval_seconds.unwrap_or(15),
                    status: "DATABASE".to_string(), // Indicate this is from database
                    num_inputs: related_inputs.len() as i32,
                    analog_inputs: related_inputs.iter().filter(|input|
                        input.point_type.contains("INPUT")
                    ).count() as i32,
                    buffer_size: existing_trendlog.buffer_size,
                    data_size_kb: existing_trendlog.data_size_kb.unwrap_or_else(|| "Unknown".to_string()),
                    related_points: related_inputs.into_iter().map(|input| {
                        let point_index = input.point_index.clone();
                        RelatedPointInfo {
                            point_type: input.point_type,
                            point_index: point_index.clone(),
                            point_panel: input.point_panel.unwrap_or_else(|| input.panel_id.to_string()),
                            point_label: input.point_label.unwrap_or_else(|| format!("Point {}", point_index)),
                            network: 1, // Default network
                            range_value: 0, // Default range
                        }
                    }).collect(),
                })
            },
            None => {
                let _ = emit_ffi_log_sync("T3_Webview_TRL_FFI", "[INFO] No existing trendlog found, creating minimal fallback info", LogLevel::Info);

                // Create minimal TrendLog info with defaults
                Self::create_initial_trendlog_info_with_panel_and_title(
                    device_id,
                    1, // Default panel ID
                    trendlog_id,
                    Some(&format!("TrendLog {} (Offline)", trendlog_id.replace("MONITOR", ""))),
                    db
                ).await
            }
        }
    }

    /// Try to get TrendLog info via WebMessage API (when FFI fails but T3000.exe is running)
    async fn try_webmessage_trendlog_info(
        device_id: u32,
        trendlog_id: &str,
    ) -> Result<TrendLogInfo, AppError> {
        use crate::t3_device::t3_ffi_api_service::T3000FfiApiService;

        let _ = emit_ffi_log_sync("T3_Webview_TRL_FFI", "[API] Attempting TrendLog data retrieval via WebMessage API", LogLevel::Info);

        // Create GET_PANEL_DATA request
        let panel_id = 1; // Default panel for now
        let webmessage_request = serde_json::json!({
            "action": 1, // GET_PANEL_DATA
            "message": {
                "action": 1,
                "panelId": panel_id
            },
            "msgId": format!("trendlog_{}", chrono::Utc::now().timestamp())
        });

        let ffi_service = T3000FfiApiService::new();
        let response = ffi_service.call_ffi(&webmessage_request.to_string()).await
            .map_err(|e| AppError::InternalError(format!("WebMessage API call failed: {:?}", e)))?;

        // Parse response and extract TrendLog data
        let response_json: serde_json::Value = serde_json::from_str(&response)
            .map_err(|e| AppError::InternalError(format!("Failed to parse WebMessage response: {}", e)))?;

        // Extract monitor data from the response
        if let Some(data_array) = response_json.get("data").and_then(|d| d.as_array()) {
            // Find the monitor entry matching our trendlog_id
            let monitor_index = trendlog_id.replace("MONITOR", "").parse::<usize>()
                .map_err(|_| AppError::ValidationError("Invalid TrendLog ID format".to_string()))? - 1;

            for entry in data_array {
                if entry.get("type").and_then(|t| t.as_str()) == Some("MON") &&
                   entry.get("index").and_then(|i| i.as_u64()) == Some(monitor_index as u64) {

                    let _ = emit_ffi_log_sync("T3_Webview_TRL_FFI", &format!("[OK] Found TrendLog {} in WebMessage response", trendlog_id), LogLevel::Info);

                    // Extract TrendLog info from WebMessage response
                    let label = entry.get("label").and_then(|l| l.as_str()).unwrap_or("Unknown");
                    let hour_interval = entry.get("hour_interval_time").and_then(|h| h.as_u64()).unwrap_or(0) as i32;
                    let minute_interval = entry.get("minute_interval_time").and_then(|m| m.as_u64()).unwrap_or(15) as i32;
                    let status = entry.get("status").and_then(|s| s.as_u64()).unwrap_or(0);
                    let num_inputs = entry.get("num_inputs").and_then(|n| n.as_u64()).unwrap_or(0) as i32;
                    let an_inputs = entry.get("an_inputs").and_then(|a| a.as_u64()).unwrap_or(0) as i32;

                    let total_interval_minutes = hour_interval * 60 + minute_interval;
                    let status_str = if status == 1 { "ON".to_string() } else { "OFF".to_string() };

                    // Extract related points
                    let mut related_points = Vec::new();
                    if let Some(inputs) = entry.get("input").and_then(|i| i.as_array()) {
                        for (_idx, input_entry) in inputs.iter().enumerate().take(num_inputs as usize) {
                            if let (Some(panel), Some(point_type), Some(point_number)) = (
                                input_entry.get("panel").and_then(|p| p.as_u64()),
                                input_entry.get("point_type").and_then(|t| t.as_u64()),
                                input_entry.get("point_number").and_then(|n| n.as_u64())
                            ) {
                                if panel > 0 && point_type > 0 {
                                    // PointNet point_type is 1-based offset from BAC_* constants:
                                    // BAC_OUT=0 -> 1 (OUTPUT), BAC_IN=1 -> 2 (INPUT), BAC_VAR=2 -> 3 (VARIABLE)
                                    let point_type_str = match point_type {
                                        1 => "OUTPUT",
                                        2 => "INPUT",
                                        3 => "VARIABLE",
                                        _ => "UNKNOWN",
                                    };
                                    let point_label = format!("{}_{}",
                                        match point_type { 1 => "OUT", 2 => "IN", 3 => "VAR", _ => "UNK" },
                                        point_number
                                    );

                                    related_points.push(RelatedPointInfo {
                                        point_type: point_type_str.to_string(),
                                        point_index: point_number.to_string(),
                                        point_panel: panel.to_string(),
                                        point_label,
                                        network: input_entry.get("network").and_then(|n| n.as_u64()).unwrap_or(1) as u8,
                                        range_value: 0, // Would need range array from WebMessage
                                    });
                                }
                            }
                        }
                    }

                    return Ok(TrendLogInfo {
                        serial_number: device_id as i32,
                        panel_id,
                        trendlog_id: trendlog_id.to_string(),
                        trendlog_label: label.to_string(),
                        interval_seconds: total_interval_minutes * 60, // Convert minutes to seconds
                        status: format!("{} (WebMessage)", status_str), // Indicate source
                        num_inputs,
                        analog_inputs: an_inputs,
                        buffer_size: Some(100), // Default
                        data_size_kb: format!("{}KB", (num_inputs * 100 * 4) / 1024), // Estimate
                        related_points,
                    });
                }
            }
        }

        Err(AppError::InternalError("TrendLog not found in WebMessage response".to_string()))
    }

    /// Create initial TrendLog info with specific panel_id and custom title (before FFI sync)
    /// This allows the page to initialize quickly with basic info and custom labeling
    pub async fn create_initial_trendlog_info_with_panel_and_title(
        device_id: u32,
        panel_id: i32,
        trendlog_id: &str,
        chart_title: Option<&str>,
        db: &DatabaseConnection
    ) -> Result<TrendLogInfo, AppError> {
        let _ = emit_ffi_log_sync("T3_Webview_TRL_FFI", &format!("[INIT] Creating initial TrendLog info: {} for device {}", trendlog_id, device_id), LogLevel::Info);

        // Normalize Trendlog_ID: Convert numeric index (0,1,2...) to MON format (MON1,MON2,MON3...)
        let normalized_trendlog_id = if trendlog_id.starts_with("MON") {
            // Already in MON format
            trendlog_id.to_string()
        } else {
            // Try to parse as number and convert to MON format (0-based to 1-based)
            match trendlog_id.parse::<i32>() {
                Ok(index) => format!("MON{}", index + 1),  // 0->MON1, 1->MON2, etc.
                Err(_) => {
                    // Try to parse MONITOR format
                    if trendlog_id.starts_with("MONITOR") {
                        let monitor_index = trendlog_id.replace("MONITOR", "").parse::<i32>()
                            .map_err(|_| AppError::ValidationError("Invalid TrendLog ID format".to_string()))?;
                        format!("MON{}", monitor_index)
                    } else {
                        return Err(AppError::ValidationError(format!("Invalid TrendLog ID format: {}", trendlog_id)));
                    }
                }
            }
        };

        // Parse monitor index for label (1-based)
        let monitor_number = if normalized_trendlog_id.starts_with("MON") {
            normalized_trendlog_id.replace("MON", "").parse::<i32>()
                .unwrap_or(1)
        } else {
            1
        };

        // Create basic TrendLog info with defaults or custom title
        let trendlog_label = chart_title
            .map(|title| title.to_string())
            .unwrap_or_else(|| format!("Monitor {}", monitor_number));

        let _ = emit_ffi_log_sync("T3_Webview_TRL_FFI",
            &format!("[INFO] Normalized Trendlog_ID: '{}' -> '{}'", trendlog_id, normalized_trendlog_id), LogLevel::Info);

        let basic_info = TrendLogInfo {
            serial_number: device_id as i32,
            panel_id, // Use provided panel ID
            trendlog_id: normalized_trendlog_id,  // Use normalized ID (MON1-MON12)
            trendlog_label,
            interval_seconds: 15, // Default interval (15 seconds)
            status: "UNKNOWN".to_string(), // Will be updated by FFI
            num_inputs: 0, // Will be updated by FFI
            analog_inputs: 0, // Will be updated by FFI
            buffer_size: Some(100), // Default buffer size
            data_size_kb: "0KB".to_string(), // Will be calculated by FFI
            related_points: Vec::new(), // Will be populated by FFI
        };

        // Save basic info to database (will be updated later by FFI)
        Self::save_basic_trendlog_to_database(&basic_info, db).await?;

        let _ = emit_ffi_log_sync("T3_Webview_TRL_FFI", &format!("[OK] Created initial TrendLog info: {}", basic_info.trendlog_label), LogLevel::Info);
        Ok(basic_info)
    }

    /// Save basic TrendLog info to database (lightweight version)
    async fn save_basic_trendlog_to_database(
        info: &TrendLogInfo,
        db: &DatabaseConnection
    ) -> Result<(), AppError> {
        let _ = emit_ffi_log_sync("T3_Webview_TRL_FFI", &format!("[SAVE] Saving basic TrendLog to database: {}", info.trendlog_id), LogLevel::Info);

        let trendlog_record = trendlogs::ActiveModel {
            id: NotSet, // Auto-increment
            serial_number: Set(info.serial_number),
            panel_id: Set(info.panel_id),
            trendlog_id: Set(info.trendlog_id.clone()),
            switch_node: Set(None),
            trendlog_label: Set(Some(info.trendlog_label.clone())),
            interval_seconds: Set(Some(info.interval_seconds)),
            buffer_size: Set(info.buffer_size),
            data_size_kb: Set(Some(info.data_size_kb.clone())),
            auto_manual: Set(Some("AUTO".to_string())),
            status: Set(Some(info.status.clone())),
            ffi_synced: Set(Some(0)), // Not yet synced with FFI
            last_ffi_sync: Set(None), // No FFI sync yet
            created_at: Set(Some(Utc::now().to_rfc3339())),
            updated_at: Set(Some(Utc::now().to_rfc3339())),
            ..Default::default()
        };

        // Check by (SerialNumber, TrendlogId) only - panelId is NOT part of unique identity
        let existing_records = trendlogs::Entity::find()
            .filter(trendlogs::Column::SerialNumber.eq(info.serial_number))
            .filter(trendlogs::Column::TrendlogId.eq(&info.trendlog_id))
            .all(db)
            .await?;

        if existing_records.is_empty() {
            // Insert new trendlog record only if it doesn't exist
            trendlogs::Entity::insert(trendlog_record)
                .exec(db)
                .await?;
        } else {
            // Clean up duplicates: keep first, delete rest
            let (first, duplicates) = existing_records.split_first().unwrap();
            if !duplicates.is_empty() {
                let dup_ids: Vec<i32> = duplicates.iter().map(|d| d.id).collect();
                trendlogs::Entity::delete_many()
                    .filter(trendlogs::Column::Id.is_in(dup_ids))
                    .exec(db)
                    .await?;
            }
            // Update the kept record's panel_id
            let mut update_model: trendlogs::ActiveModel = first.clone().into();
            update_model.panel_id = Set(info.panel_id);
            update_model.updated_at = Set(Some(Utc::now().to_rfc3339()));
            update_model.update(db).await?;
            let _ = emit_ffi_log_sync("T3_Webview_TRL_FFI",
                &format!("[INFO] TrendLog already exists: SerialNumber={}, TrendlogId={}",
                    info.serial_number, info.trendlog_id), LogLevel::Info);
        }

        let _ = emit_ffi_log_sync("T3_Webview_TRL_FFI", "[OK] Basic TrendLog info saved to database", LogLevel::Info);
        Ok(())
    }

    /// Background sync - Update TrendLog info with detailed FFI data (non-blocking)
    pub async fn sync_detailed_trendlog_info(
        device_id: u32,
        trendlog_id: &str,
        db: &DatabaseConnection
    ) -> Result<TrendLogInfo, AppError> {
        let _ = emit_ffi_log_sync("T3_Webview_TRL_FFI", &format!("[SYNC] Background FFI sync for TrendLog: {} (device {})", trendlog_id, device_id), LogLevel::Info);

        // This is the existing detailed FFI sync logic
        Self::sync_complete_trendlog_info(device_id, trendlog_id, db).await
    }

    /// Add points to View 2 or View 3 selection for a TrendLog
    pub async fn add_points_to_view_selection(
        device_id: u32,
        trendlog_id: &str,
        view_number: i32, // 2 or 3
        selected_points: Vec<ViewSelection>,
        db: &DatabaseConnection
    ) -> Result<(), AppError> {
        // Default panel_id to 1 for backward compatibility
        let panel_id = 1u32;

        let _ = emit_ffi_log_sync("T3_Webview_TRL_FFI", &format!("[INFO] Adding {} points to View{} for TrendLog: {} (device {}, panel {})",
            selected_points.len(), view_number, trendlog_id, device_id, panel_id), LogLevel::Info);

        // First, clear existing selections for this view by updating is_selected to 0
        trendlog_inputs::Entity::update_many()
            .col_expr(trendlog_inputs::Column::IsSelected, Expr::value(0))
            .filter(trendlog_inputs::Column::SerialNumber.eq(device_id as i32))
            .filter(trendlog_inputs::Column::PanelId.eq(panel_id as i32))
            .filter(trendlog_inputs::Column::TrendlogId.eq(trendlog_id))
            .filter(trendlog_inputs::Column::ViewNumber.eq(view_number))
            .exec(db)
            .await?;

        // Add new selections by updating or inserting records
        for point in selected_points {
            if point.is_selected {
                let view_record = trendlog_inputs::ActiveModel {
                    id: NotSet,
                    serial_number: Set(device_id as i32),
                    panel_id: Set(panel_id as i32),
                    trendlog_id: Set(trendlog_id.to_string()),
                    point_type: Set(point.point_type),
                    point_index: Set(point.point_index),
                    point_panel: Set(None),
                    point_label: Set(Some(point.point_label)),
                    status: Set(None),
                    view_type: Set(Some("VIEW".to_string())), // User view selection
                    view_number: Set(Some(view_number)),
                    is_selected: Set(Some(1)), // Selected
                    created_at: Set(Some(Utc::now().to_rfc3339())),
                    updated_at: Set(Some(Utc::now().to_rfc3339())),
                };

                // Use upsert to handle existing records properly
                trendlog_inputs::Entity::insert(view_record)
                    .on_conflict(
                        OnConflict::columns([
                            trendlog_inputs::Column::SerialNumber,
                            trendlog_inputs::Column::PanelId,
                            trendlog_inputs::Column::TrendlogId,
                            trendlog_inputs::Column::PointType,
                            trendlog_inputs::Column::PointIndex,
                            trendlog_inputs::Column::ViewType,
                            trendlog_inputs::Column::ViewNumber
                        ])
                        .update_columns([
                            trendlog_inputs::Column::PointLabel,
                            trendlog_inputs::Column::IsSelected,
                            trendlog_inputs::Column::UpdatedAt,
                        ])
                        .to_owned()
                    )
                    .exec(db)
                    .await?;
            }
        }

        let _ = emit_ffi_log_sync("T3_Webview_TRL_FFI", &format!("[OK] View{} selections saved", view_number), LogLevel::Info);
        Ok(())
    }

    /// Add points to View 2 or View 3 selection for a TrendLog with explicit panel_id support
    pub async fn add_points_to_view_selection_with_panel(
        device_id: u32,
        panel_id: u32,
        trendlog_id: &str,
        view_number: i32, // 2 or 3
        selected_points: Vec<ViewSelection>,
        db: &DatabaseConnection
    ) -> Result<(), AppError> {
        println!("[DEBUG] add_points_to_view_selection_with_panel called with:");
        println!("  device_id: {}", device_id);
        println!("  panel_id: {}", panel_id);
        println!("  trendlog_id: {}", trendlog_id);
        println!("  view_number: {}", view_number);
        println!("  selected_points count: {}", selected_points.len());
        for (i, point) in selected_points.iter().enumerate() {
            println!("    Point {}: type={}, index={}, label={}, selected={}",
                i, point.point_type, point.point_index, point.point_label, point.is_selected);
        }

        use std::io::{self, Write};
        io::stdout().flush().unwrap(); // Force flush stdout

        let _ = emit_ffi_log_sync("T3_Webview_TRL_FFI", &format!("[INFO] Adding {} points to View{} for TrendLog: {} (device {}, panel {})",
            selected_points.len(), view_number, trendlog_id, device_id, panel_id), LogLevel::Info);

        // First, clear existing selections for this view by updating is_selected to 0 in BOTH tables
        println!("[DEBUG] Clearing existing selections from TRENDLOG_VIEWS...");
        let clear_views_result = trendlog_views::Entity::update_many()
            .col_expr(trendlog_views::Column::IsSelected, Expr::value(0))
            .filter(trendlog_views::Column::SerialNumber.eq(device_id as i32))
            .filter(trendlog_views::Column::PanelId.eq(panel_id as i32))
            .filter(trendlog_views::Column::TrendlogId.eq(trendlog_id))
            .filter(trendlog_views::Column::ViewNumber.eq(view_number))
            .exec(db)
            .await;

        match clear_views_result {
            Ok(result) => println!("[DEBUG] TRENDLOG_VIEWS clear result: {:?}", result),
            Err(e) => {
                println!("[DEBUG] TRENDLOG_VIEWS clear failed with error: {:?}", e);
                return Err(e.into());
            }
        }

        println!("[DEBUG] Clearing existing selections from TRENDLOG_INPUTS...");
        let clear_inputs_result = trendlog_inputs::Entity::update_many()
            .col_expr(trendlog_inputs::Column::IsSelected, Expr::value(0))
            .filter(trendlog_inputs::Column::SerialNumber.eq(device_id as i32))
            .filter(trendlog_inputs::Column::PanelId.eq(panel_id as i32))
            .filter(trendlog_inputs::Column::TrendlogId.eq(trendlog_id))
            .filter(trendlog_inputs::Column::ViewNumber.eq(view_number))
            .exec(db)
            .await;

        match clear_inputs_result {
            Ok(result) => println!("[DEBUG] TRENDLOG_INPUTS clear result: {:?}", result),
            Err(e) => {
                println!("[DEBUG] TRENDLOG_INPUTS clear failed with error: {:?}", e);
                return Err(e.into());
            }
        }

        // Add new selections by updating or inserting records to BOTH tables
        println!("[DEBUG] Adding new selections...");
        for (i, point) in selected_points.into_iter().enumerate() {
            if point.is_selected {
                println!("[DEBUG] Processing point {}: {} ({})", i, point.point_label, point.point_type);

                // 1. Insert into TRENDLOG_VIEWS table (View-specific selections)
                let view_record = trendlog_views::ActiveModel {
                    id: NotSet,
                    serial_number: Set(device_id as i32),
                    panel_id: Set(panel_id as i32),
                    trendlog_id: Set(trendlog_id.to_string()),
                    point_type: Set(point.point_type.clone()),
                    point_index: Set(point.point_index.clone()),
                    point_panel: Set(None),
                    point_label: Set(Some(point.point_label.clone())),
                    view_number: Set(view_number),
                    is_selected: Set(Some(1)), // Selected
                    created_at: Set(Some(Utc::now().to_rfc3339())),
                    updated_at: Set(Some(Utc::now().to_rfc3339())),
                };

                // 2. Insert into TRENDLOG_INPUTS table (Complete input tracking)
                let input_record = trendlog_inputs::ActiveModel {
                    id: NotSet,
                    serial_number: Set(device_id as i32),
                    panel_id: Set(panel_id as i32),
                    trendlog_id: Set(trendlog_id.to_string()),
                    point_type: Set(point.point_type.clone()),
                    point_index: Set(point.point_index.clone()),
                    point_panel: Set(None),
                    point_label: Set(Some(point.point_label.clone())),
                    status: Set(None),
                    view_type: Set(Some("VIEW".to_string())), // User view selection
                    view_number: Set(Some(view_number)),
                    is_selected: Set(Some(1)), // Selected
                    created_at: Set(Some(Utc::now().to_rfc3339())),
                    updated_at: Set(Some(Utc::now().to_rfc3339())),
                };

                // Insert into TRENDLOG_VIEWS table
                println!("[DEBUG] Attempting upsert to TRENDLOG_VIEWS for point: {}", point.point_label);
                let views_insert_result = trendlog_views::Entity::insert(view_record)
                    .on_conflict(
                        OnConflict::columns([
                            trendlog_views::Column::SerialNumber,
                            trendlog_views::Column::PanelId,
                            trendlog_views::Column::TrendlogId,
                            trendlog_views::Column::PointType,
                            trendlog_views::Column::PointIndex,
                            trendlog_views::Column::ViewNumber
                        ])
                        .update_columns([
                            trendlog_views::Column::PointLabel,
                            trendlog_views::Column::IsSelected,
                            trendlog_views::Column::UpdatedAt,
                        ])
                        .to_owned()
                    )
                    .exec(db)
                    .await;

                match views_insert_result {
                    Ok(result) => println!("[DEBUG] TRENDLOG_VIEWS insert/update success for {}: {:?}", point.point_label, result),
                    Err(e) => {
                        println!("[DEBUG] TRENDLOG_VIEWS insert/update failed for {}: {:?}", point.point_label, e);
                        return Err(e.into());
                    }
                }

                // Insert into TRENDLOG_INPUTS table
                println!("[DEBUG] Attempting upsert to TRENDLOG_INPUTS for point: {}", point.point_label);
                let inputs_insert_result = trendlog_inputs::Entity::insert(input_record)
                    .on_conflict(
                        OnConflict::columns([
                            trendlog_inputs::Column::SerialNumber,
                            trendlog_inputs::Column::PanelId,
                            trendlog_inputs::Column::TrendlogId,
                            trendlog_inputs::Column::PointType,
                            trendlog_inputs::Column::PointIndex,
                            trendlog_inputs::Column::ViewType,
                            trendlog_inputs::Column::ViewNumber
                        ])
                        .update_columns([
                            trendlog_inputs::Column::PointLabel,
                            trendlog_inputs::Column::IsSelected,
                            trendlog_inputs::Column::UpdatedAt,
                        ])
                        .to_owned()
                    )
                    .exec(db)
                    .await;

                match inputs_insert_result {
                    Ok(result) => println!("[DEBUG] TRENDLOG_INPUTS insert/update success for {}: {:?}", point.point_label, result),
                    Err(e) => {
                        println!("[DEBUG] TRENDLOG_INPUTS insert/update failed for {}: {:?}", point.point_label, e);
                        return Err(e.into());
                    }
                }
            } else {
                println!("[DEBUG] Skipping unselected point {}: {}", i, point.point_label);
            }
        }

        println!("[DEBUG] Function completed successfully");
        let _ = emit_ffi_log_sync("T3_Webview_TRL_FFI", &format!("[OK] View{} selections saved with panel_id {}", view_number, panel_id), LogLevel::Info);
        Ok(())
    }

    /// Get View 2 or View 3 selections for a TrendLog
    pub async fn get_view_selections(
        device_id: u32,
        trendlog_id: &str,
        view_number: i32,
        db: &DatabaseConnection
    ) -> Result<Vec<ViewSelection>, AppError> {
        // Default panel_id to 1 for backward compatibility
        let panel_id = 1u32;

        let _ = emit_ffi_log_sync("T3_Webview_TRL_FFI", &format!("[INFO] Getting View{} selections for TrendLog: {} (device {}, panel {})",
            view_number, trendlog_id, device_id, panel_id), LogLevel::Info);

        let selections = trendlog_inputs::Entity::find()
            .filter(trendlog_inputs::Column::SerialNumber.eq(device_id as i32))
            .filter(trendlog_inputs::Column::PanelId.eq(panel_id as i32))
            .filter(trendlog_inputs::Column::TrendlogId.eq(trendlog_id))
            .filter(trendlog_inputs::Column::ViewNumber.eq(view_number))
            .filter(trendlog_inputs::Column::IsSelected.eq(1))
            .all(db)
            .await?;

        let view_selections: Vec<ViewSelection> = selections
            .into_iter()
            .map(|s| ViewSelection {
                point_type: s.point_type,
                point_index: s.point_index,
                point_label: s.point_label.unwrap_or_default(),
                is_selected: true, // All records returned are selected
            })
            .collect();

        let _ = emit_ffi_log_sync("T3_Webview_TRL_FFI", &format!("[INFO] Found {} selected points for View{}", view_selections.len(), view_number), LogLevel::Info);
        Ok(view_selections)
    }

    /// Get View 2 or View 3 selections for a TrendLog with explicit panel_id support
    pub async fn get_view_selections_with_panel(
        device_id: u32,
        panel_id: u32,
        trendlog_id: &str,
        view_number: i32,
        db: &DatabaseConnection
    ) -> Result<Vec<ViewSelection>, AppError> {
        let _ = emit_ffi_log_sync("T3_Webview_TRL_FFI", &format!("[INFO] Fetching View{} selections for TrendLog: {} (device {}, panel {})",
            view_number, trendlog_id, device_id, panel_id), LogLevel::Info);

        let view_records = trendlog_views::Entity::find()
            .filter(trendlog_views::Column::SerialNumber.eq(device_id as i32))
            .filter(trendlog_views::Column::PanelId.eq(panel_id as i32))
            .filter(trendlog_views::Column::TrendlogId.eq(trendlog_id))
            .filter(trendlog_views::Column::ViewNumber.eq(view_number))
            .filter(trendlog_views::Column::IsSelected.eq(1)) // Only selected items
            .all(db)
            .await?;

        let view_selections: Vec<ViewSelection> = view_records
            .into_iter()
            .map(|record| ViewSelection {
                point_type: record.point_type.clone(),
                point_index: record.point_index.clone(),
                point_label: record.point_label.clone().unwrap_or_default(),
                is_selected: record.is_selected.unwrap_or(0) == 1,
            })
            .collect();

        let _ = emit_ffi_log_sync("T3_Webview_TRL_FFI", &format!("[INFO] Found {} selected points for View{} (panel_id {})", view_selections.len(), view_number, panel_id), LogLevel::Info);
        Ok(view_selections)
    }

    /// Sync complete TrendLog information from T3000 C++ via FFI
    pub async fn sync_complete_trendlog_info(
        device_id: u32,
        trendlog_id: &str,
        db: &DatabaseConnection
    ) -> Result<TrendLogInfo, AppError> {
        let _ = emit_ffi_log_sync("T3_Webview_TRL_FFI", "\n[START] === Starting TrendLog FFI Sync (T3000 Monitor Functions) ===", LogLevel::Info);
        let _ = emit_ffi_log_sync("T3_Webview_TRL_FFI", &format!("Device ID: {}, TrendLog ID: {}", device_id, trendlog_id), LogLevel::Info);

        // 0. Check T3000.exe availability first - use fallback if not available
        if let Err(availability_error) = check_t3000_availability() {
            let _ = emit_ffi_log_sync("T3_Webview_TRL_FFI", &format!("[WARN] T3000 FFI not available: {}", availability_error), LogLevel::Warn);
            let _ = emit_ffi_log_sync("T3_Webview_TRL_FFI", "[INFO] Falling back to database-based TrendLog info (limited functionality)", LogLevel::Info);

            // Use fallback mechanism to create basic TrendLog info from database
            return Self::create_fallback_trendlog_info(device_id, trendlog_id, db).await;
        }

        // 1. (device online/connect checks removed — T3000_IsDeviceOnline and
        //    T3000_ConnectToDevice are not exported from T3000.exe; the
        //    BacnetWebView_GetTrendlogEntry call below reports device state
        //    through its return code / JSON instead.)

        // 2. Parse TrendLog ID to get monitor index
        let _ = emit_ffi_log_sync("T3_Webview_TRL_FFI", &format!("[PARSE] Parsing TrendLog ID: {} -> monitor index", trendlog_id), LogLevel::Info);
        let monitor_index = trendlog_id.replace("MONITOR", "").parse::<i32>()
            .map_err(|e| {
                let _ = emit_ffi_log_sync("T3_Webview_TRL_FFI", &format!("[ERROR] Invalid TrendLog ID format: {} ({})", trendlog_id, e), LogLevel::Error);
                AppError::ValidationError("Invalid TrendLog ID format".to_string())
            })?;
        let _ = emit_ffi_log_sync("T3_Webview_TRL_FFI", &format!("[OK] Monitor index: {}", monitor_index), LogLevel::Info);

        // 3. Fetch the monitor entry from T3000 via the exported JSON bridge.
        //    (Replaces the old GetMonitorBlockData FFI call, whose C++ signature is
        //    a 7-arg Bacnet network send — not a StrMonitorPoint filler.)
        let panel_id: i32 = 1; // Default panel ID (matches legacy FFI behavior)
        let _ = emit_ffi_log_sync("T3_Webview_TRL_FFI", &format!("[CALL] Calling BacnetWebView_GetTrendlogEntry(panel={}, monitor={})", panel_id, monitor_index), LogLevel::Info);
        const ENTRY_BUFFER_SIZE: usize = 65536; // 64KB is plenty for a single monitor entry
        let mut entry_buffer: Vec<u8> = vec![0; ENTRY_BUFFER_SIZE];
        let ffi_result = unsafe {
            BacnetWebView_GetTrendlogEntry(
                panel_id as c_int,
                monitor_index,
                entry_buffer.as_mut_ptr() as *mut c_char,
                ENTRY_BUFFER_SIZE as c_int,
            )
        };

        if ffi_result <= 0 {
            let _ = emit_ffi_log_sync("T3_Webview_TRL_FFI", &format!("[ERROR] BacnetWebView_GetTrendlogEntry failed for device {} monitor {} (result {})", device_id, monitor_index, ffi_result), LogLevel::Error);
            return Err(AppError::FfiError("Failed to retrieve TrendLog data from T3000".to_string()));
        }
        let _ = emit_ffi_log_sync("T3_Webview_TRL_FFI", &format!("[OK] BacnetWebView_GetTrendlogEntry returned {} bytes", ffi_result), LogLevel::Info);

        // 4. Parse the JSON response into TrendLogInfo
        let _ = emit_ffi_log_sync("T3_Webview_TRL_FFI", "[PROCESS] Parsing monitor entry JSON into TrendLogInfo...", LogLevel::Info);
        let entry_json = String::from_utf8_lossy(&entry_buffer[..ffi_result as usize]).to_string();
        let trendlog_info = Self::parse_trendlog_entry_json(device_id as i32, trendlog_id, &entry_json)?;

        // 5. Save to database
        let _ = emit_ffi_log_sync("T3_Webview_TRL_FFI", "[SAVE] Saving TrendLog info to database...", LogLevel::Info);
        Self::save_trendlog_to_database(&trendlog_info, db).await?;
        let _ = emit_ffi_log_sync("T3_Webview_TRL_FFI", "[OK] TrendLog info saved to database successfully", LogLevel::Info);

        let _ = emit_ffi_log_sync("T3_Webview_TRL_FFI", &format!("[DONE] TrendLog FFI sync completed successfully: {} ({} points)",
            trendlog_info.trendlog_label, trendlog_info.num_inputs), LogLevel::Info);
        let _ = emit_ffi_log_sync("T3_Webview_TRL_FFI", "=== TrendLog FFI Sync End ===\n", LogLevel::Info);

        Ok(trendlog_info)
    }

    /// Parse the JSON returned by BacnetWebView_GetTrendlogEntry into TrendLogInfo.
    /// Response shape:
    /// { "success": bool, "panel_id": int, "monitor_index": int,
    ///   "trendlog": { "label", "interval_seconds", "status", "status_code",
    ///                 "num_inputs", "an_inputs", "data_size_kb", "data_size_text",
    ///                 "inputs": [ { "panel", "sub_panel", "point_type",
    ///                               "point_number", "network", "range" } ] } }
    fn parse_trendlog_entry_json(
        serial_number: i32,
        trendlog_id: &str,
        entry_json: &str,
    ) -> Result<TrendLogInfo, AppError> {
        let parsed: serde_json::Value = serde_json::from_str(entry_json)
            .map_err(|e| {
                let _ = emit_ffi_log_sync("T3_Webview_TRL_FFI", &format!("[ERROR] Failed to parse trendlog entry JSON: {}", e), LogLevel::Error);
                AppError::ParseError(format!("Failed to parse trendlog entry JSON: {}", e))
            })?;

        let success = parsed.get("success").and_then(|v| v.as_bool()).unwrap_or(false);
        if !success {
            let err = parsed.get("error").and_then(|v| v.as_str()).unwrap_or("unknown error");
            let _ = emit_ffi_log_sync("T3_Webview_TRL_FFI", &format!("[ERROR] TrendLog entry sync reported failure: {}", err), LogLevel::Error);
            return Err(AppError::FfiError(format!("TrendLog entry sync failed: {}", err)));
        }

        let trendlog = &parsed["trendlog"];
        let trendlog_label = trendlog.get("label").and_then(|v| v.as_str()).unwrap_or("").to_string();
        let interval_seconds = trendlog.get("interval_seconds").and_then(|v| v.as_i64()).unwrap_or(0) as i32;
        let status = trendlog.get("status").and_then(|v| v.as_str()).unwrap_or("OFF").to_string();
        let num_inputs = trendlog.get("num_inputs").and_then(|v| v.as_i64()).unwrap_or(0) as i32;
        let analog_inputs = trendlog.get("an_inputs").and_then(|v| v.as_i64()).unwrap_or(0) as i32;
        let panel_id = parsed.get("panel_id").and_then(|v| v.as_i64()).unwrap_or(1) as i32;
        let data_size_kb = trendlog.get("data_size_text")
            .and_then(|v| v.as_str())
            .map(|s| format!("{}KB", s))
            .unwrap_or_else(|| "0KB".to_string());

        let mut related_points = Vec::new();
        if let Some(inputs) = trendlog.get("inputs").and_then(|v| v.as_array()) {
            for input in inputs {
                let panel = input.get("panel").and_then(|v| v.as_i64()).unwrap_or(0);
                let point_type = input.get("point_type").and_then(|v| v.as_i64()).unwrap_or(0);
                let point_number = input.get("point_number").and_then(|v| v.as_i64()).unwrap_or(0);
                if panel > 0 && point_type > 0 {
                    // PointNet point_type is 1-based offset from BAC_* constants:
                    // BAC_OUT=0 -> 1 (OUTPUT), BAC_IN=1 -> 2 (INPUT), BAC_VAR=2 -> 3 (VARIABLE)
                    let point_type_str = match point_type {
                        1 => "OUTPUT",
                        2 => "INPUT",
                        3 => "VARIABLE",
                        _ => "UNKNOWN",
                    };
                    let point_label = format!("{}_{}",
                        match point_type { 1 => "OUT", 2 => "IN", 3 => "VAR", _ => "UNK" },
                        point_number
                    );
                    related_points.push(RelatedPointInfo {
                        point_type: point_type_str.to_string(),
                        point_index: point_number.to_string(),
                        point_panel: panel.to_string(),
                        point_label,
                        network: input.get("network").and_then(|v| v.as_i64()).unwrap_or(1) as u8,
                        range_value: input.get("range").and_then(|v| v.as_i64()).unwrap_or(0) as u8,
                    });
                }
            }
        }

        let trendlog_info = TrendLogInfo {
            serial_number,
            panel_id,
            trendlog_id: trendlog_id.to_string(),
            trendlog_label,
            interval_seconds,
            status,
            num_inputs,
            analog_inputs,
            buffer_size: None,
            data_size_kb,
            related_points,
        };

        let _ = emit_ffi_log_sync("T3_Webview_TRL_FFI", &format!("[OK] Created TrendLogInfo: '{}' ({} points, {} status, {} sec interval)",
            trendlog_info.trendlog_label, trendlog_info.num_inputs, trendlog_info.status, trendlog_info.interval_seconds), LogLevel::Info);

        Ok(trendlog_info)
    }

    /// Save processed TrendLog info to database
    async fn save_trendlog_to_database(
        info: &TrendLogInfo,
        db: &DatabaseConnection
    ) -> Result<(), AppError> {
        let _ = emit_ffi_log_sync("T3_Webview_TRL_FFI", &format!("[SAVE] Saving TrendLog to database: {} (device {})",
            info.trendlog_id, info.serial_number), LogLevel::Info);

        // Check by (SerialNumber, TrendlogId) only - panelId is NOT part of unique identity
        // Find ALL matching records and clean up duplicates
        let existing_records = trendlogs::Entity::find()
            .filter(trendlogs::Column::SerialNumber.eq(info.serial_number))
            .filter(trendlogs::Column::TrendlogId.eq(&info.trendlog_id))
            .all(db)
            .await?;

        if !existing_records.is_empty() {
            // Keep first, delete any duplicates
            let (first, duplicates) = existing_records.split_first().unwrap();
            if !duplicates.is_empty() {
                let dup_ids: Vec<i32> = duplicates.iter().map(|d| d.id).collect();
                let _ = emit_ffi_log_sync("T3_Webview_TRL_FFI",
                    &format!("[CLEANUP] Removing {} duplicate trendlog records for {}: ids={:?}",
                        duplicates.len(), info.trendlog_id, dup_ids), LogLevel::Warn);
                trendlogs::Entity::delete_many()
                    .filter(trendlogs::Column::Id.is_in(dup_ids))
                    .exec(db)
                    .await?;
            }

            // Update the kept record
            let mut update_model: trendlogs::ActiveModel = first.clone().into();
            update_model.panel_id = Set(info.panel_id);
            update_model.trendlog_label = Set(Some(info.trendlog_label.clone()));
            update_model.interval_seconds = Set(Some(info.interval_seconds));
            update_model.buffer_size = Set(info.buffer_size);
            update_model.data_size_kb = Set(Some(info.data_size_kb.clone()));
            update_model.status = Set(Some(info.status.clone()));
            update_model.ffi_synced = Set(Some(1));
            update_model.last_ffi_sync = Set(Some(Utc::now().to_rfc3339()));
            update_model.updated_at = Set(Some(Utc::now().to_rfc3339()));
            update_model.update(db).await?;

            let _ = emit_ffi_log_sync("T3_Webview_TRL_FFI",
                &format!("[INFO] Updated existing TrendLog: SerialNumber={}, TrendlogId={}",
                    info.serial_number, info.trendlog_id), LogLevel::Info);
        } else {
            // INSERT new trendlog record
            let trendlog_record = trendlogs::ActiveModel {
                id: NotSet,
                serial_number: Set(info.serial_number),
                panel_id: Set(info.panel_id),
                trendlog_id: Set(info.trendlog_id.clone()),
                switch_node: Set(None),
                trendlog_label: Set(Some(info.trendlog_label.clone())),
                interval_seconds: Set(Some(info.interval_seconds)),
                buffer_size: Set(info.buffer_size),
                data_size_kb: Set(Some(info.data_size_kb.clone())),
                auto_manual: Set(Some("AUTO".to_string())),
                status: Set(Some(info.status.clone())),
                ffi_synced: Set(Some(1)),
                last_ffi_sync: Set(Some(Utc::now().to_rfc3339())),
                created_at: Set(Some(Utc::now().to_rfc3339())),
                updated_at: Set(Some(Utc::now().to_rfc3339())),
            };
            trendlogs::Entity::insert(trendlog_record)
                .exec(db)
                .await?;
            let _ = emit_ffi_log_sync("T3_Webview_TRL_FFI", "[OK] New TrendLog record created", LogLevel::Info);
        }

        // Clear existing MAIN inputs for this TrendLog (any panelId)
        trendlog_inputs::Entity::delete_many()
            .filter(trendlog_inputs::Column::SerialNumber.eq(info.serial_number))
            .filter(trendlog_inputs::Column::TrendlogId.eq(&info.trendlog_id))
            .filter(trendlog_inputs::Column::ViewType.eq("MAIN"))
            .exec(db)
            .await?;

        // Save related points as MAIN inputs
        for point in &info.related_points {
            let input_record = trendlog_inputs::ActiveModel {
                id: NotSet,
                serial_number: Set(info.serial_number),
                panel_id: Set(info.panel_id), // Use actual panel ID from device
                trendlog_id: Set(info.trendlog_id.clone()),
                point_type: Set(point.point_type.clone()),
                point_index: Set(point.point_index.clone()),
                point_panel: Set(Some(point.point_panel.clone())),
                point_label: Set(Some(point.point_label.clone())),
                status: Set(Some("ACTIVE".to_string())),
                view_type: Set(Some("MAIN".to_string())),
                view_number: Set(None),
                is_selected: Set(Some(1)),
                created_at: Set(Some(Utc::now().to_rfc3339())),
                updated_at: Set(Some(Utc::now().to_rfc3339())),
            };

            trendlog_inputs::Entity::insert(input_record)
                .exec(db)
                .await?;
        }

        let _ = emit_ffi_log_sync("T3_Webview_TRL_FFI", &format!("[OK] Saved {} related points to database", info.related_points.len()), LogLevel::Info);
        Ok(())
    }





    /// Get all available TrendLog IDs for a device from T3000 via FFI.
    /// Uses the exported BacnetWebView_GetTrendlogList bridge (the old
    /// T3000_GetMonitorCount symbol is not exported and always returned 0).
    pub async fn get_available_trendlogs(device_id: u32) -> Result<Vec<String>, AppError> {
        // (device-online check removed — T3000_IsDeviceOnline is not exported;
        //  BacnetWebView_GetTrendlogList below reports device state via its return code.)
        const LIST_BUFFER_SIZE: usize = 65536; // 64KB — plenty for a monitor list
        let mut list_buffer: Vec<u8> = vec![0; LIST_BUFFER_SIZE];
        let ffi_result = unsafe {
            BacnetWebView_GetTrendlogList(
                1, // Default panel ID (matches legacy behavior)
                list_buffer.as_mut_ptr() as *mut c_char,
                LIST_BUFFER_SIZE as c_int,
            )
        };
        if ffi_result <= 0 {
            let _ = emit_ffi_log_sync("T3_Webview_TRL_FFI", &format!("[ERROR] BacnetWebView_GetTrendlogList failed (result {})", ffi_result), LogLevel::Error);
            return Err(AppError::FfiError("Failed to retrieve TrendLog list from T3000".to_string()));
        }

        let json_str = String::from_utf8_lossy(&list_buffer[..ffi_result as usize]).to_string();
        let parsed: serde_json::Value = serde_json::from_str(&json_str)
            .map_err(|e| {
                let _ = emit_ffi_log_sync("T3_Webview_TRL_FFI", &format!("[ERROR] Failed to parse trendlog list JSON: {}", e), LogLevel::Error);
                AppError::ParseError(format!("Failed to parse trendlog list JSON: {}", e))
            })?;

        let mut trendlog_ids = Vec::new();
        if let Some(trendlogs) = parsed.get("trendlogs").and_then(|v| v.as_array()) {
            for entry in trendlogs {
                if let Some(num) = entry.get("num").and_then(|v| v.as_i64()) {
                    // Preserve the legacy "MONITOR{n}" 1-based convention consumed by sync_complete_trendlog_info.
                    trendlog_ids.push(format!("MONITOR{}", num + 1));
                }
            }
        }

        let _ = emit_ffi_log_sync("T3_Webview_TRL_FFI", &format!("[OK] Retrieved {} available TrendLog IDs for device {}", trendlog_ids.len(), device_id), LogLevel::Info);
        Ok(trendlog_ids)
    }

    /// Get complete TrendLog information from database (after FFI sync)
    pub async fn get_trendlog_info(
        trendlog_id: &str,
        db: &DatabaseConnection,
    ) -> Result<Option<TrendLogInfo>, AppError> {
        // Get TrendLog main info
        let trendlog = trendlogs::Entity::find()
            .filter(trendlogs::Column::TrendlogId.eq(Some(trendlog_id.to_string())))
            .one(db)
            .await?;

        let trendlog = match trendlog {
            Some(t) => t,
            None => return Ok(None),
        };

        // Get TrendLog inputs
        let inputs = trendlog_inputs::Entity::find()
            .filter(trendlog_inputs::Column::TrendlogId.eq(trendlog_id.to_string()))
            .all(db)
            .await?;

        // Create TrendLogInfo structure
        let trendlog_info = TrendLogInfo {
            serial_number: trendlog.serial_number,
            panel_id: trendlog.panel_id,
            trendlog_id: trendlog_id.to_string(),
            trendlog_label: trendlog.trendlog_label.unwrap_or_default(),
            interval_seconds: trendlog.interval_seconds.unwrap_or(0),
            status: trendlog.status.unwrap_or_default(),
            num_inputs: inputs.len() as i32,
            analog_inputs: inputs.iter().filter(|i| i.point_type == "INPUT").count() as i32,
            buffer_size: trendlog.buffer_size,
            data_size_kb: trendlog.data_size_kb.unwrap_or_default(),
            related_points: inputs.iter().map(|input| RelatedPointInfo {
                point_type: input.point_type.clone(),
                point_index: input.point_index.clone(),
                point_panel: input.point_panel.clone().unwrap_or_default(),
                point_label: input.point_label.clone().unwrap_or_default(),
                network: 0, // Default network
                range_value: 0, // Default range
            }).collect(),
        };

        Ok(Some(trendlog_info))
    }
}

