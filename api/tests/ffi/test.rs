//! Standalone FFI Test Executable
//! Tests T3000 FFI functions directly without web server dependency

use std::ffi::{c_int};
use std::process::Command;

#[cfg(target_os = "windows")]
extern "system" {
    fn LoadLibraryA(name: *const u8) -> *mut std::ffi::c_void;
    fn GetProcAddress(handle: *mut std::ffi::c_void, name: *const u8) -> *mut std::ffi::c_void;
    fn GetModuleHandleA(name: *const u8) -> *mut std::ffi::c_void;
}

type T3000IsDeviceOnlineFn = unsafe extern "C" fn(c_int) -> c_int;
#[allow(dead_code)]
type T3000ConnectToDeviceFn = unsafe extern "C" fn(c_int) -> c_int;

fn main() {
    println!("🔧 T3000 FFI Direct Test");
    println!("========================");
    println!("Expected T3000 path: D:\\1025\\github\\temcocontrols\\T3000_Building_Automation_System\\T3000 Output\\Debug");
    println!("");

    #[cfg(target_os = "windows")]
    {
        check_t3000_processes();
        println!("");
        test_ffi_availability();
        println!("");
        test_device_connections();
    }

    #[cfg(not(target_os = "windows"))]
    {
        println!("❌ FFI testing is only supported on Windows");
    }

    println!("");
    println!("Test completed. Press Enter to exit...");
    let mut input = String::new();
    std::io::stdin().read_line(&mut input).expect("Failed to read line");
}

#[cfg(target_os = "windows")]
fn check_t3000_processes() {
    println!("🔍 Checking for T3000 processes...");

    // Use tasklist to find T3000 processes
    match Command::new("tasklist")
        .args(&["/FI", "IMAGENAME eq T3000.exe", "/FO", "CSV"])
        .output()
    {
        Ok(output) => {
            let stdout = String::from_utf8_lossy(&output.stdout);
            if stdout.contains("T3000.exe") {
                println!("✅ T3000.exe process found in task list");
                // Try to extract more details
                for line in stdout.lines() {
                    if line.contains("T3000.exe") && !line.contains("Image Name") {
                        println!("   Process details: {}", line);
                    }
                }
            } else {
                println!("❌ T3000.exe process not found in task list");
                println!("   Make sure T3000.exe is running from:");
                println!("   D:\\1025\\github\\temcocontrols\\T3000_Building_Automation_System\\T3000 Output\\Debug");
            }
        }
        Err(e) => {
            println!("⚠️  Could not check process list: {}", e);
        }
    }
}

#[cfg(target_os = "windows")]
fn test_ffi_availability() {
    println!("🔍 Testing FFI Availability...");

    unsafe {
        // Test 1: Check if T3000.exe is in memory using GetModuleHandleA
        let handle = GetModuleHandleA(b"T3000.exe\0".as_ptr());
        if handle.is_null() {
            println!("❌ T3000.exe module not found via GetModuleHandleA");

            // Test 2: Try loading T3000.exe directly
            println!("🔄 Trying to load T3000.exe directly...");
            let direct_handle = LoadLibraryA(b"T3000.exe\0".as_ptr());
            if direct_handle.is_null() {
                println!("❌ Could not load T3000.exe directly");
                println!("   This might be normal - T3000.exe may be running as a separate process");
                println!("   FFI typically requires T3000.exe to be running in the same process space");
                return;
            } else {
                println!("✅ T3000.exe loaded directly");
            }
        } else {
            println!("✅ T3000.exe found in memory via GetModuleHandleA");
        }

        // Test 2: Check FFI functions
        let test_functions = [
            "T3000_IsDeviceOnline",
            "T3000_ConnectToDevice",
            "GetMonitorBlockData",
            "T3000_GetMonitorCount",
            "Post_Refresh_Message"
        ];

        let mut available_count = 0;
        for func_name in &test_functions {
            let func_name_cstr = format!("{}\0", func_name);
            let func_ptr = GetProcAddress(handle, func_name_cstr.as_ptr());
            if func_ptr.is_null() {
                println!("❌ Function '{}' not found", func_name);
            } else {
                println!("✅ Function '{}' available", func_name);
                available_count += 1;
            }
        }

        if available_count == test_functions.len() {
            println!("🎉 All {} FFI functions are available!", available_count);
        } else {
            println!("⚠️  Only {}/{} FFI functions available", available_count, test_functions.len());
        }
    }
}

#[cfg(target_os = "windows")]
fn test_device_connections() {
    println!("🌐 Testing Device Connections...");

    unsafe {
        let handle = GetModuleHandleA(b"T3000.exe\0".as_ptr());
        if handle.is_null() {
            println!("❌ T3000.exe not available for device testing");
            return;
        }

        let func_ptr = GetProcAddress(handle, b"T3000_IsDeviceOnline\0".as_ptr());
        if func_ptr.is_null() {
            println!("❌ T3000_IsDeviceOnline function not available");
            return;
        }

        let func: T3000IsDeviceOnlineFn = std::mem::transmute(func_ptr);

        let mut online_devices = Vec::new();
        let mut offline_devices = Vec::new();

        for device_id in 1..=10 {
            let result = func(device_id);
            if result == 1 {
                println!("✅ Device {} is ONLINE", device_id);
                online_devices.push(device_id);
            } else {
                println!("❌ Device {} is OFFLINE", device_id);
                offline_devices.push(device_id);
            }
        }

        println!("");
        println!("📊 Device Connection Summary:");
        if !online_devices.is_empty() {
            println!("   Online devices: {:?}", online_devices);
        }
        if !offline_devices.is_empty() {
            println!("   Offline devices: {:?}", offline_devices);
        }
        println!("   Total scanned: {} devices", online_devices.len() + offline_devices.len());

        if !online_devices.is_empty() {
            println!("🎉 FFI is working! Found {} online device(s)", online_devices.len());
        } else {
            println!("⚠️  FFI is working but no devices are online");
            println!("   Make sure devices are connected in T3000 software");
        }
    }
}
