// T3000 TrendLog FFI Service - Complete TrendLog information retrieval from T3000 C++
// This service provides FFI integration to get complete TrendLog information including:
// - Main TrendLog configuration (from Str_monitor_point structure)
// - Related input/output/variable points (from Point_Net inputs array)
// - Real-time status and data management

use std::ffi::CStr;
use std::os::raw::{c_char, c_int, c_uchar};
use sea_orm::*;
use sea_orm::prelude::Expr;
use sea_orm::ActiveValue::NotSet;
use migration::OnConflict;
use serde::{Serialize, Deserialize};
use chrono::Utc;

use crate::entity::t3_device::{trendlogs, trendlog_inputs};
use crate::error::AppError;
use crate::logger::{write_structured_log_with_level, LogLevel};

// Maximum points in a TrendLog monitor (from T3000 C++)
pub const MAX_POINTS_IN_MONITOR: usize = 14;

// FFI structure matching T3000 C++ Point_Net
#[repr(C)]
#[derive(Debug, Clone, Copy)]
pub struct PointNet {
    pub number: c_uchar,        // Point number
    pub point_type: c_uchar,    // Point type (INPUT/OUTPUT/VARIABLE)
    pub panel: c_uchar,         // Panel ID
    pub sub_panel: c_uchar,     // Sub-panel ID
    pub network: c_uchar,       // Network ID
}

// FFI structure matching T3000 C++ Str_monitor_point
#[repr(C)]
#[derive(Debug, Clone)]
pub struct StrMonitorPoint {
    pub label: [c_char; 9],                                     // 9 bytes: TrendLog label
    pub inputs: [PointNet; MAX_POINTS_IN_MONITOR],              // 70 bytes: Point array
    pub range: [c_uchar; MAX_POINTS_IN_MONITOR],                // 14 bytes: Range array
    pub second_interval_time: c_uchar,                          // 1 byte: Seconds (0-59)
    pub minute_interval_time: c_uchar,                          // 1 byte: Minutes (0-59)
    pub hour_interval_time: c_uchar,                            // 1 byte: Hours (0-255)
    pub max_time_length: c_uchar,                               // Max time length
    pub num_inputs: c_uchar,                                    // Total number of points (bit 0-3)
    pub an_inputs: c_uchar,                                     // Analog inputs (bit 4-7)
    pub status: c_uchar,                                        // Status: 0=OFF, 1=ON
    pub next_sample_time: c_int,                                // Next sample time
}

// Link to T3000.exe functions - requires T3000.exe to be running
#[link(name = "kernel32")]
extern "system" {
    // Windows API for dynamic library loading
    fn LoadLibraryA(name: *const u8) -> *mut std::ffi::c_void;
    fn GetProcAddress(handle: *mut std::ffi::c_void, name: *const u8) -> *mut std::ffi::c_void;
    fn GetModuleHandleA(name: *const u8) -> *mut std::ffi::c_void;
}

// T3000 FFI function types
type PostRefreshMessageFn = unsafe extern "C" fn(c_int, c_int, c_int, c_int) -> c_int;
type GetMonitorBlockDataFn = unsafe extern "C" fn(c_int, c_int, *mut StrMonitorPoint) -> c_int;
type T3000GetMonitorCountFn = unsafe extern "C" fn(c_int) -> c_int;
type T3000GetMonitorByIdFn = unsafe extern "C" fn(c_int, c_int, *mut StrMonitorPoint) -> c_int;
type T3000IsDeviceOnlineFn = unsafe extern "C" fn(c_int) -> c_int;
type T3000ConnectToDeviceFn = unsafe extern "C" fn(c_int) -> c_int;

// T3000 FFI function wrappers with dynamic loading
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

unsafe fn GetMonitorBlockData(device_id: c_int, monitor_index: c_int, monitor_data: *mut StrMonitorPoint) -> c_int {
    let handle = GetModuleHandleA(b"T3000.exe\0".as_ptr());
    if handle.is_null() {
        println!("T3000.exe not found - returning error");
        return 0;
    }

    let func_ptr = GetProcAddress(handle, b"GetMonitorBlockData\0".as_ptr());
    if func_ptr.is_null() {
        println!("GetMonitorBlockData function not found");
        return 0;
    }

    let func: GetMonitorBlockDataFn = std::mem::transmute(func_ptr);
    func(device_id, monitor_index, monitor_data)
}

unsafe fn T3000_GetMonitorCount(device_id: c_int) -> c_int {
    let handle = GetModuleHandleA(b"T3000.exe\0".as_ptr());
    if handle.is_null() {
        println!("T3000.exe not found - returning error");
        return 0;
    }

    let func_ptr = GetProcAddress(handle, b"T3000_GetMonitorCount\0".as_ptr());
    if func_ptr.is_null() {
        println!("T3000_GetMonitorCount function not found");
        return 0;
    }

    let func: T3000GetMonitorCountFn = std::mem::transmute(func_ptr);
    func(device_id)
}

unsafe fn T3000_GetMonitorById(device_id: c_int, monitor_id: c_int, monitor_data: *mut StrMonitorPoint) -> c_int {
    let handle = GetModuleHandleA(b"T3000.exe\0".as_ptr());
    if handle.is_null() {
        println!("T3000.exe not found - returning error");
        return 0;
    }

    let func_ptr = GetProcAddress(handle, b"T3000_GetMonitorById\0".as_ptr());
    if func_ptr.is_null() {
        println!("T3000_GetMonitorById function not found");
        return 0;
    }

    let func: T3000GetMonitorByIdFn = std::mem::transmute(func_ptr);
    func(device_id, monitor_id, monitor_data)
}

unsafe fn T3000_IsDeviceOnline(device_id: c_int) -> c_int {
    let handle = GetModuleHandleA(b"T3000.exe\0".as_ptr());
    if handle.is_null() {
        println!("T3000.exe not found - returning error");
        return 0;
    }

    let func_ptr = GetProcAddress(handle, b"T3000_IsDeviceOnline\0".as_ptr());
    if func_ptr.is_null() {
        println!("T3000_IsDeviceOnline function not found");
        return 0;
    }

    let func: T3000IsDeviceOnlineFn = std::mem::transmute(func_ptr);
    func(device_id)
}

unsafe fn T3000_ConnectToDevice(device_id: c_int) -> c_int {
    let handle = GetModuleHandleA(b"T3000.exe\0".as_ptr());
    if handle.is_null() {
        println!("T3000.exe not found - returning error");
        return 0;
    }

    let func_ptr = GetProcAddress(handle, b"T3000_ConnectToDevice\0".as_ptr());
    if func_ptr.is_null() {
        println!("T3000_ConnectToDevice function not found");
        return 0;
    }

    let func: T3000ConnectToDeviceFn = std::mem::transmute(func_ptr);
    func(device_id)
}

// Processed TrendLog information for database storage
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TrendLogInfo {
    pub serial_number: i32,
    pub trendlog_id: String,
    pub trendlog_label: String,
    pub interval_minutes: i32,
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
        let _ = write_structured_log_with_level("T3_Webview_TRL_FFI", &format!("🆕 Creating initial TrendLog info: {} for device {}", trendlog_id, device_id), LogLevel::Info);

        // Parse TrendLog ID to get monitor index
        let monitor_index = trendlog_id.replace("MONITOR", "").parse::<i32>()
            .map_err(|_| AppError::ValidationError("Invalid TrendLog ID format".to_string()))?;

        // Create basic TrendLog info with defaults
        let basic_info = TrendLogInfo {
            serial_number: device_id as i32,
            trendlog_id: trendlog_id.to_string(),
            trendlog_label: format!("TrendLog {}", monitor_index),
            interval_minutes: 15, // Default interval
            status: "UNKNOWN".to_string(), // Will be updated by FFI
            num_inputs: 0, // Will be updated by FFI
            analog_inputs: 0, // Will be updated by FFI
            buffer_size: Some(100), // Default buffer size
            data_size_kb: "0KB".to_string(), // Will be calculated by FFI
            related_points: Vec::new(), // Will be populated by FFI
        };

        // Save basic info to database (will be updated later by FFI)
        Self::save_basic_trendlog_to_database(&basic_info, db).await?;

        let _ = write_structured_log_with_level("T3_Webview_TRL_FFI", &format!("✅ Created initial TrendLog info: {}", basic_info.trendlog_label), LogLevel::Info);
        Ok(basic_info)
    }

    /// Save basic TrendLog info to database (lightweight version)
    async fn save_basic_trendlog_to_database(
        info: &TrendLogInfo,
        db: &DatabaseConnection
    ) -> Result<(), AppError> {
        let _ = write_structured_log_with_level("T3_Webview_TRL_FFI", &format!("💾 Saving basic TrendLog to database: {}", info.trendlog_id), LogLevel::Info);

        let trendlog_record = trendlogs::ActiveModel {
            id: NotSet, // Auto-increment
            serial_number: Set(info.serial_number),
            trendlog_id: Set(info.trendlog_id.clone()),
            switch_node: Set(None),
            trendlog_label: Set(Some(info.trendlog_label.clone())),
            interval_minutes: Set(Some(info.interval_minutes)),
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

        // Insert new trendlog record (allows multiple combinations)
        trendlogs::Entity::insert(trendlog_record)
            .exec(db)
            .await?;

        let _ = write_structured_log_with_level("T3_Webview_TRL_FFI", "✅ Basic TrendLog info saved to database", LogLevel::Info);
        Ok(())
    }

    /// Background sync - Update TrendLog info with detailed FFI data (non-blocking)
    pub async fn sync_detailed_trendlog_info(
        device_id: u32,
        trendlog_id: &str,
        db: &DatabaseConnection
    ) -> Result<TrendLogInfo, AppError> {
        let _ = write_structured_log_with_level("T3_Webview_TRL_FFI", &format!("🔄 Background FFI sync for TrendLog: {} (device {})", trendlog_id, device_id), LogLevel::Info);

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

        let _ = write_structured_log_with_level("T3_Webview_TRL_FFI", &format!("📊 Adding {} points to View{} for TrendLog: {} (device {}, panel {})",
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

        let _ = write_structured_log_with_level("T3_Webview_TRL_FFI", &format!("✅ View{} selections saved", view_number), LogLevel::Info);
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
        println!("🔥 DEBUG: add_points_to_view_selection_with_panel called with:");
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

        let _ = write_structured_log_with_level("T3_Webview_TRL_FFI", &format!("📊 Adding {} points to View{} for TrendLog: {} (device {}, panel {})",
            selected_points.len(), view_number, trendlog_id, device_id, panel_id), LogLevel::Info);

        // First, clear existing selections for this view by updating is_selected to 0
        println!("🔥 DEBUG: Clearing existing selections...");
        let clear_result = trendlog_inputs::Entity::update_many()
            .col_expr(trendlog_inputs::Column::IsSelected, Expr::value(0))
            .filter(trendlog_inputs::Column::SerialNumber.eq(device_id as i32))
            .filter(trendlog_inputs::Column::PanelId.eq(panel_id as i32))
            .filter(trendlog_inputs::Column::TrendlogId.eq(trendlog_id))
            .filter(trendlog_inputs::Column::ViewNumber.eq(view_number))
            .exec(db)
            .await;

        match clear_result {
            Ok(result) => println!("🔥 DEBUG: Clear result: {:?}", result),
            Err(e) => {
                println!("🔥 DEBUG: Clear failed with error: {:?}", e);
                return Err(e.into());
            }
        }

        // Add new selections by updating or inserting records
        println!("🔥 DEBUG: Adding new selections...");
        for (i, point) in selected_points.into_iter().enumerate() {
            if point.is_selected {
                println!("🔥 DEBUG: Processing point {}: {} ({})", i, point.point_label, point.point_type);
                let view_record = trendlog_inputs::ActiveModel {
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

                // Use upsert to handle existing records properly
                println!("🔥 DEBUG: Attempting upsert for point: {}", point.point_label);
                let insert_result = trendlog_inputs::Entity::insert(view_record)
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

                match insert_result {
                    Ok(result) => println!("🔥 DEBUG: Insert/update success for {}: {:?}", point.point_label, result),
                    Err(e) => {
                        println!("🔥 DEBUG: Insert/update failed for {}: {:?}", point.point_label, e);
                        return Err(e.into());
                    }
                }
            } else {
                println!("🔥 DEBUG: Skipping unselected point {}: {}", i, point.point_label);
            }
        }

        println!("🔥 DEBUG: Function completed successfully");
        let _ = write_structured_log_with_level("T3_Webview_TRL_FFI", &format!("✅ View{} selections saved with panel_id {}", view_number, panel_id), LogLevel::Info);
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

        let _ = write_structured_log_with_level("T3_Webview_TRL_FFI", &format!("📋 Getting View{} selections for TrendLog: {} (device {}, panel {})",
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

        let _ = write_structured_log_with_level("T3_Webview_TRL_FFI", &format!("📊 Found {} selected points for View{}", view_selections.len(), view_number), LogLevel::Info);
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
        let _ = write_structured_log_with_level("T3_Webview_TRL_FFI", &format!("🔍 Fetching View{} selections for TrendLog: {} (device {}, panel {})",
            view_number, trendlog_id, device_id, panel_id), LogLevel::Info);

        let view_records = trendlog_inputs::Entity::find()
            .filter(trendlog_inputs::Column::SerialNumber.eq(device_id as i32))
            .filter(trendlog_inputs::Column::PanelId.eq(panel_id as i32))
            .filter(trendlog_inputs::Column::TrendlogId.eq(trendlog_id))
            .filter(trendlog_inputs::Column::ViewNumber.eq(view_number))
            .filter(trendlog_inputs::Column::IsSelected.eq(1)) // Only selected items
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

        let _ = write_structured_log_with_level("T3_Webview_TRL_FFI", &format!("📊 Found {} selected points for View{} (panel_id {})", view_selections.len(), view_number, panel_id), LogLevel::Info);
        Ok(view_selections)
    }

    /// Sync complete TrendLog information from T3000 C++ via FFI
    pub async fn sync_complete_trendlog_info(
        device_id: u32,
        trendlog_id: &str,
        db: &DatabaseConnection
    ) -> Result<TrendLogInfo, AppError> {
        let _ = write_structured_log_with_level("T3_Webview_TRL_FFI", "\n🚀 === Starting TrendLog FFI Sync (T3000 Monitor Functions) ===", LogLevel::Info);
        let _ = write_structured_log_with_level("T3_Webview_TRL_FFI", &format!("Device ID: {}, TrendLog ID: {}", device_id, trendlog_id), LogLevel::Info);

        // 1. Ensure device is connected
        let _ = write_structured_log_with_level("T3_Webview_TRL_FFI", "🔍 Checking T3000 device connection...", LogLevel::Info);
        let device_online = unsafe { T3000_IsDeviceOnline(device_id as c_int) };
        if device_online == 0 {
            let _ = write_structured_log_with_level("T3_Webview_TRL_FFI", &format!("⚠️ Device {} is offline, attempting to connect...", device_id), LogLevel::Warn);
            // Try to connect
            let connect_result = unsafe { T3000_ConnectToDevice(device_id as c_int) };
            if connect_result == 0 {
                let _ = write_structured_log_with_level("T3_Webview_TRL_FFI", &format!("❌ Failed to connect to T3000 device {}", device_id), LogLevel::Error);
                return Err(AppError::InternalError("Failed to connect to T3000 device".to_string()));
            } else {
                let _ = write_structured_log_with_level("T3_Webview_TRL_FFI", &format!("✅ Successfully connected to T3000 device {}", device_id), LogLevel::Info);
            }
        } else {
            let _ = write_structured_log_with_level("T3_Webview_TRL_FFI", &format!("✅ Device {} is online", device_id), LogLevel::Info);
        }

        // 2. Parse TrendLog ID to get monitor index
        let _ = write_structured_log_with_level("T3_Webview_TRL_FFI", &format!("🔢 Parsing TrendLog ID: {} → monitor index", trendlog_id), LogLevel::Info);
        let monitor_index = trendlog_id.replace("MONITOR", "").parse::<i32>()
            .map_err(|e| {
                let _ = write_structured_log_with_level("T3_Webview_TRL_FFI", &format!("❌ Invalid TrendLog ID format: {} ({})", trendlog_id, e), LogLevel::Error);
                AppError::ValidationError("Invalid TrendLog ID format".to_string())
            })?;
        let _ = write_structured_log_with_level("T3_Webview_TRL_FFI", &format!("✅ Monitor index: {}", monitor_index), LogLevel::Info);

        // 3. Get monitor data from T3000 via FFI
        let _ = write_structured_log_with_level("T3_Webview_TRL_FFI", &format!("📡 Calling GetMonitorBlockData(device={}, monitor={})", device_id, monitor_index), LogLevel::Info);
        let mut monitor_data = StrMonitorPoint {
            label: [0; 9],
            inputs: [PointNet { number: 0, point_type: 0, panel: 0, sub_panel: 0, network: 0 }; MAX_POINTS_IN_MONITOR],
            range: [0; MAX_POINTS_IN_MONITOR],
            second_interval_time: 0,
            minute_interval_time: 0,
            hour_interval_time: 0,
            max_time_length: 0,
            num_inputs: 0,
            an_inputs: 0,
            status: 0,
            next_sample_time: 0,
        };

        let ffi_result = unsafe {
            GetMonitorBlockData(device_id as c_int, monitor_index, &mut monitor_data as *mut StrMonitorPoint)
        };

        if ffi_result == 0 {
            let _ = write_structured_log_with_level("T3_Webview_TRL_FFI", &format!("❌ GetMonitorBlockData failed for device {} monitor {}", device_id, monitor_index), LogLevel::Error);
            return Err(AppError::FfiError("Failed to retrieve TrendLog data from T3000".to_string()));
        }
        let _ = write_structured_log_with_level("T3_Webview_TRL_FFI", &format!("✅ GetMonitorBlockData successful, result code: {}", ffi_result), LogLevel::Info);

        // 4. Process the FFI monitor data
        let _ = write_structured_log_with_level("T3_Webview_TRL_FFI", "🔧 Processing raw monitor data into TrendLogInfo structure...", LogLevel::Info);
        let trendlog_info = Self::process_monitor_data(device_id as i32, trendlog_id, &monitor_data)?;

        // 5. Save to database
        let _ = write_structured_log_with_level("T3_Webview_TRL_FFI", "💾 Saving TrendLog info to database...", LogLevel::Info);
        Self::save_trendlog_to_database(&trendlog_info, db).await?;
        let _ = write_structured_log_with_level("T3_Webview_TRL_FFI", "✅ TrendLog info saved to database successfully", LogLevel::Info);

        let _ = write_structured_log_with_level("T3_Webview_TRL_FFI", &format!("🎉 TrendLog FFI sync completed successfully: {} ({} points)",
            trendlog_info.trendlog_label, trendlog_info.num_inputs), LogLevel::Info);
        let _ = write_structured_log_with_level("T3_Webview_TRL_FFI", "=== TrendLog FFI Sync End ===\n", LogLevel::Info);

        Ok(trendlog_info)
    }

    /// Process raw FFI monitor data into structured TrendLogInfo
    fn process_monitor_data(
        serial_number: i32,
        trendlog_id: &str,
        monitor_data: &StrMonitorPoint
    ) -> Result<TrendLogInfo, AppError> {
        let _ = write_structured_log_with_level("T3_Webview_TRL_FFI", "📊 Processing raw StrMonitorPoint data:", LogLevel::Info);

        // Convert C string label to Rust String
        let label_cstr = unsafe { CStr::from_ptr(monitor_data.label.as_ptr()) };
        let trendlog_label = label_cstr.to_string_lossy().to_string();
        let _ = write_structured_log_with_level("T3_Webview_TRL_FFI", &format!("  📝 Label: '{}'", trendlog_label), LogLevel::Info);

        // Calculate interval in minutes
        let interval_minutes = monitor_data.hour_interval_time as i32 * 60
            + monitor_data.minute_interval_time as i32
            + (monitor_data.second_interval_time as f32 / 60.0) as i32;
        let _ = write_structured_log_with_level("T3_Webview_TRL_FFI", &format!("  ⏱️ Interval: {}h:{}m:{}s = {} minutes",
            monitor_data.hour_interval_time, monitor_data.minute_interval_time, monitor_data.second_interval_time, interval_minutes), LogLevel::Info);

        // Convert status
        let status = if monitor_data.status == 1 { "ON".to_string() } else { "OFF".to_string() };
        let _ = write_structured_log_with_level("T3_Webview_TRL_FFI", &format!("  🔛 Status: {} (raw: {})", status, monitor_data.status), LogLevel::Info);
        let _ = write_structured_log_with_level("T3_Webview_TRL_FFI", &format!("  📊 Buffer: max_time_length = {}, num_inputs = {}, an_inputs = {}",
            monitor_data.max_time_length, monitor_data.num_inputs, monitor_data.an_inputs), LogLevel::Info);

        // Process related points
        let mut related_points = Vec::new();
        let num_inputs = monitor_data.num_inputs.min(MAX_POINTS_IN_MONITOR as u8) as usize;
        let _ = write_structured_log_with_level("T3_Webview_TRL_FFI", &format!("  🔍 Processing {} input points:", num_inputs), LogLevel::Info);

        for i in 0..num_inputs {
            let point = &monitor_data.inputs[i];
            if point.panel > 0 && point.point_type > 0 {  // Valid point
                let point_type = match point.point_type {
                    1 => "INPUT",
                    2 => "OUTPUT",
                    3 => "VARIABLE",
                    _ => "UNKNOWN",
                }.to_string();

                let point_label = format!("{}_{}",
                    match point.point_type { 1 => "IN", 2 => "OUT", 3 => "VAR", _ => "UNK" },
                    point.number
                );

                let _ = write_structured_log_with_level("T3_Webview_TRL_FFI", &format!("    Point {}: {} #{} (Panel {}, Network {}, Range {})",
                    i+1, point_type, point.number, point.panel, point.network, monitor_data.range[i]), LogLevel::Info);

                related_points.push(RelatedPointInfo {
                    point_type,
                    point_index: point.number.to_string(),
                    point_panel: point.panel.to_string(),
                    point_label,
                    network: point.network,
                    range_value: monitor_data.range[i],
                });
            } else {
                let _ = write_structured_log_with_level("T3_Webview_TRL_FFI", &format!("    Point {}: EMPTY (panel={}, type={})",
                    i+1, point.panel, point.point_type), LogLevel::Info);
            }
        }

        // Calculate estimated data size
        let estimated_size_kb = format!("{}KB",
            (num_inputs * monitor_data.max_time_length as usize * 4) / 1024
        );
        let _ = write_structured_log_with_level("T3_Webview_TRL_FFI", &format!("  💾 Estimated data size: {}", estimated_size_kb), LogLevel::Info);

        let trendlog_info = TrendLogInfo {
            serial_number,
            trendlog_id: trendlog_id.to_string(),
            trendlog_label: trendlog_label.clone(),
            interval_minutes,
            status: status.clone(),
            num_inputs: num_inputs as i32,
            analog_inputs: monitor_data.an_inputs as i32,
            buffer_size: Some(monitor_data.max_time_length as i32),
            data_size_kb: estimated_size_kb,
            related_points,
        };

        let _ = write_structured_log_with_level("T3_Webview_TRL_FFI", &format!("✅ Created TrendLogInfo: '{}' ({} points, {} status, {} min interval)",
            trendlog_info.trendlog_label, trendlog_info.num_inputs, trendlog_info.status, trendlog_info.interval_minutes), LogLevel::Info);

        Ok(trendlog_info)
    }

    /// Save processed TrendLog info to database
    async fn save_trendlog_to_database(
        info: &TrendLogInfo,
        db: &DatabaseConnection
    ) -> Result<(), AppError> {
        let _ = write_structured_log_with_level("T3_Webview_TRL_FFI", &format!("💾 Saving TrendLog to database: {} (device {})",
            info.trendlog_id, info.serial_number), LogLevel::Info);

        // Save main TrendLog record
        let trendlog_record = trendlogs::ActiveModel {
            id: NotSet, // Auto-increment
            serial_number: Set(info.serial_number),
            panel_id: Set(1), // Default panel ID
            trendlog_id: Set(info.trendlog_id.clone()),
            switch_node: Set(None),
            trendlog_label: Set(Some(info.trendlog_label.clone())),
            interval_minutes: Set(Some(info.interval_minutes)),
            buffer_size: Set(info.buffer_size),
            data_size_kb: Set(Some(info.data_size_kb.clone())),
            auto_manual: Set(Some("AUTO".to_string())),
            status: Set(Some(info.status.clone())),
            ffi_synced: Set(Some(1)),
            last_ffi_sync: Set(Some(Utc::now().to_rfc3339())),
            created_at: Set(Some(Utc::now().to_rfc3339())),
            updated_at: Set(Some(Utc::now().to_rfc3339())),
        };

        // Insert new trendlog record (allows multiple combinations)
        trendlogs::Entity::insert(trendlog_record)
            .exec(db)
            .await?;

        // Clear existing MAIN inputs for this TrendLog
        trendlog_inputs::Entity::delete_many()
            .filter(trendlog_inputs::Column::SerialNumber.eq(info.serial_number))
            .filter(trendlog_inputs::Column::PanelId.eq(1))
            .filter(trendlog_inputs::Column::TrendlogId.eq(&info.trendlog_id))
            .filter(trendlog_inputs::Column::ViewType.eq("MAIN"))
            .exec(db)
            .await?;

        // Save related points as MAIN inputs
        for point in &info.related_points {
            let input_record = trendlog_inputs::ActiveModel {
                id: NotSet,
                serial_number: Set(info.serial_number),
                panel_id: Set(1), // Default panel ID
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

        let _ = write_structured_log_with_level("T3_Webview_TRL_FFI", &format!("✅ Saved {} related points to database", info.related_points.len()), LogLevel::Info);
        Ok(())
    }





    /// Get all available TrendLog IDs for a device from T3000 via FFI
    pub async fn get_available_trendlogs(device_id: u32) -> Result<Vec<String>, AppError> {
        let device_online = unsafe { T3000_IsDeviceOnline(device_id as c_int) };
        if device_online == 0 {
            return Err(AppError::FfiError("Device not online".to_string()));
        }

        let monitor_count = unsafe { T3000_GetMonitorCount(device_id as c_int) };
        let mut trendlog_ids = Vec::new();

        for i in 0..monitor_count {
            trendlog_ids.push(format!("MONITOR{}", i + 1));
        }

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
            trendlog_id: trendlog_id.to_string(),
            trendlog_label: trendlog.trendlog_label.unwrap_or_default(),
            interval_minutes: trendlog.interval_minutes.unwrap_or(0),
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
