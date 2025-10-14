//! FFI Test Helper
//! Simple functions to test T3000 FFI service connectivity

use crate::error::AppError;
use crate::logger::{write_structured_log_with_level, LogLevel};
use std::ffi::c_int;

#[cfg(target_os = "windows")]
extern "system" {
    fn LoadLibraryA(name: *const u8) -> *mut std::ffi::c_void;
    fn GetProcAddress(handle: *mut std::ffi::c_void, name: *const u8) -> *mut std::ffi::c_void;
    fn GetModuleHandleA(name: *const u8) -> *mut std::ffi::c_void;
}

type T3000IsDeviceOnlineFn = unsafe extern "C" fn(c_int) -> c_int;

/// Simple FFI availability test
pub fn test_ffi_availability() -> Result<String, AppError> {
    let _ = write_structured_log_with_level("T3_FFI_TEST", "🔍 Starting FFI availability test...", LogLevel::Info);

    #[cfg(target_os = "windows")]
    unsafe {
        // Test 1: Check if T3000.exe is in memory
        let handle = GetModuleHandleA(b"T3000.exe\0".as_ptr());
        if handle.is_null() {
            let error_msg = "❌ T3000.exe is not running in memory. Please start T3000 Building Automation software.";
            let _ = write_structured_log_with_level("T3_FFI_TEST", error_msg, LogLevel::Error);
            return Err(AppError::InternalError(error_msg.to_string()));
        }
        let _ = write_structured_log_with_level("T3_FFI_TEST", "✅ T3000.exe found in memory", LogLevel::Info);

        // Test 2: Check if key FFI functions are available
        let test_functions = [
            "T3000_IsDeviceOnline",
            "T3000_ConnectToDevice",
            "GetMonitorBlockData",
            "T3000_GetMonitorCount",
            "Post_Refresh_Message"
        ];

        let mut available_functions = Vec::new();
        let mut missing_functions = Vec::new();

        for func_name in &test_functions {
            let func_name_cstr = format!("{}\0", func_name);
            let func_ptr = GetProcAddress(handle, func_name_cstr.as_ptr());
            if func_ptr.is_null() {
                missing_functions.push(func_name.to_string());
                let _ = write_structured_log_with_level("T3_FFI_TEST", &format!("❌ Function '{}' not found", func_name), LogLevel::Warn);
            } else {
                available_functions.push(func_name.to_string());
                let _ = write_structured_log_with_level("T3_FFI_TEST", &format!("✅ Function '{}' available", func_name), LogLevel::Info);
            }
        }

        let result_msg = format!(
            "FFI Test Results:\n✅ Available functions ({}): {}\n❌ Missing functions ({}): {}",
            available_functions.len(), available_functions.join(", "),
            missing_functions.len(), if missing_functions.is_empty() { "None".to_string() } else { missing_functions.join(", ") }
        );

        let _ = write_structured_log_with_level("T3_FFI_TEST", &result_msg, LogLevel::Info);

        if missing_functions.is_empty() {
            let _ = write_structured_log_with_level("T3_FFI_TEST", "🎉 All FFI functions are available!", LogLevel::Info);
        }

        Ok(result_msg)
    }

    #[cfg(not(target_os = "windows"))]
    {
        Err(AppError::InternalError("FFI is only supported on Windows".to_string()))
    }
}

/// Test device connectivity via FFI
pub fn test_device_connection(device_id: u32) -> Result<String, AppError> {
    let _ = write_structured_log_with_level("T3_FFI_TEST", &format!("🔍 Testing device {} connection...", device_id), LogLevel::Info);

    #[cfg(target_os = "windows")]
    unsafe {
        let handle = GetModuleHandleA(b"T3000.exe\0".as_ptr());
        if handle.is_null() {
            return Err(AppError::InternalError("T3000.exe not running".to_string()));
        }

        let func_ptr = GetProcAddress(handle, b"T3000_IsDeviceOnline\0".as_ptr());
        if func_ptr.is_null() {
            return Err(AppError::InternalError("T3000_IsDeviceOnline function not available".to_string()));
        }

        let func: T3000IsDeviceOnlineFn = std::mem::transmute(func_ptr);
        let result = func(device_id as c_int);

        let status_msg = if result == 1 {
            format!("✅ Device {} is ONLINE", device_id)
        } else {
            format!("❌ Device {} is OFFLINE", device_id)
        };

        let _ = write_structured_log_with_level("T3_FFI_TEST", &status_msg, LogLevel::Info);
        Ok(format!("Device {} FFI Status: {} (result code: {})", device_id, if result == 1 { "Online" } else { "Offline" }, result))
    }

    #[cfg(not(target_os = "windows"))]
    {
        Err(AppError::InternalError("FFI is only supported on Windows".to_string()))
    }
}

/// Get available devices via FFI (if such function exists)
pub fn test_device_enumeration() -> Result<String, AppError> {
    let _ = write_structured_log_with_level("T3_FFI_TEST", "🔍 Testing device enumeration...", LogLevel::Info);

    // Test common device IDs (1-10)
    let mut online_devices = Vec::new();
    let mut offline_devices = Vec::new();

    for device_id in 1..=10 {
        match test_device_connection(device_id) {
            Ok(status) if status.contains("Online") => {
                online_devices.push(device_id);
            }
            _ => {
                offline_devices.push(device_id);
            }
        }
    }

    let result_msg = format!(
        "Device Enumeration Results:\n✅ Online devices: {:?}\n❌ Offline devices: {:?}",
        if online_devices.is_empty() { vec!["None".to_string()] } else { online_devices.iter().map(|d| d.to_string()).collect() },
        if offline_devices.is_empty() { vec!["None".to_string()] } else { offline_devices.iter().map(|d| d.to_string()).collect() }
    );

    let _ = write_structured_log_with_level("T3_FFI_TEST", &result_msg, LogLevel::Info);
    Ok(result_msg)
}
