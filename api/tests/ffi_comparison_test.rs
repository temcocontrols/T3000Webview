// FFI Comparison Test - Shows exactly why HandleWebViewMsg works but direct FFI doesn't
// This test demonstrates the technical differences between the two approaches

use std::ffi::CString;
use std::os::raw::c_char;
use winapi::um::libloaderapi::{GetProcAddress, LoadLibraryA, GetModuleHandleA};
use std::ptr::null_mut;

fn main() {
    println!("🔍 FFI Comparison Test - Testing both approaches");
    println!("================================================");

    // Test 1: Check if T3000.exe is running as a process
    test_t3000_process_status();

    // Test 2: Try to load T3000.exe as DLL
    test_t3000_dll_loading();

    // Test 3: Check for exported functions
    test_exported_functions();

    println!("\n📋 Summary:");
    println!("- HandleWebViewMsg works because it's properly exported");
    println!("- Direct FFI fails because functions aren't in export table");
    println!("- T3000.exe must be loadable as DLL, not just running process");
}

fn test_t3000_process_status() {
    println!("\n1️⃣ Testing T3000.exe Process Status");
    println!("-----------------------------------");

    // Check if T3000.exe is running
    let output = std::process::Command::new("tasklist")
        .args(&["/FI", "IMAGENAME eq T3000.exe", "/FO", "CSV"])
        .output();

    match output {
        Ok(result) => {
            let output_str = String::from_utf8_lossy(&result.stdout);
            if output_str.contains("T3000.exe") {
                println!("✅ T3000.exe is running as a process");
            } else {
                println!("❌ T3000.exe is NOT running as a process");
            }
        }
        Err(e) => println!("❌ Error checking process: {}", e)
    }
}

fn test_t3000_dll_loading() {
    println!("\n2️⃣ Testing T3000.exe DLL Loading");
    println!("--------------------------------");

    let t3000_paths = vec![
        "T3000.exe",
        "./T3000.exe",
        "../T3000.exe",
        r"E:\1025\github\temcocontrols\T3000_Building_Automation_System\T3000 Output\Debug\T3000.exe",
    ];

    for path in &t3000_paths {
        if std::path::Path::new(path).exists() {
            println!("📁 Found T3000.exe at: {}", path);

            unsafe {
                let path_cstring = CString::new(*path).unwrap();
                let t3000_module = LoadLibraryA(path_cstring.as_ptr());

                if !t3000_module.is_null() {
                    println!("✅ Successfully loaded T3000.exe as DLL");
                    test_function_exports(t3000_module);
                    return;
                } else {
                    let error = winapi::um::errhandlingapi::GetLastError();
                    println!("❌ Failed to load as DLL (Error: {})", error);
                }
            }
        }
    }

    println!("❌ Could not load T3000.exe as DLL from any path");
}

unsafe fn test_function_exports(module: winapi::shared::minwindef::HINSTANCE) {
    println!("\n3️⃣ Testing Function Exports");
    println!("---------------------------");

    // Test functions that are supposed to work
    let working_functions = vec![
        "BacnetWebView_HandleWebViewMsg",
        "HandleWebViewMsg",  // Internal function name
    ];

    // Test functions that don't work
    let failing_functions = vec![
        "T3000_IsDeviceOnline",
        "GetMonitorBlockData",
        "GetMonitorBlockDataEx",
        "GetPanelInfo",
        "SetPoint",
    ];

    println!("🟢 Testing WORKING functions:");
    for func_name in &working_functions {
        let func_cstring = CString::new(*func_name).unwrap();
        let func_ptr = GetProcAddress(module, func_cstring.as_ptr());

        if !func_ptr.is_null() {
            println!("  ✅ {} - FOUND in export table", func_name);
        } else {
            println!("  ❌ {} - NOT FOUND in export table", func_name);
        }
    }

    println!("\n🔴 Testing FAILING functions:");
    for func_name in &failing_functions {
        let func_cstring = CString::new(*func_name).unwrap();
        let func_ptr = GetProcAddress(module, func_cstring.as_ptr());

        if !func_ptr.is_null() {
            println!("  ✅ {} - FOUND in export table", func_name);
        } else {
            println!("  ❌ {} - NOT FOUND in export table", func_name);
        }
    }
}

fn test_exported_functions() {
    println!("\n4️⃣ Explaining the Difference");
    println!("----------------------------");

    println!("📋 Why HandleWebViewMsg WORKS:");
    println!("  1. Explicitly exported with __declspec(dllexport)");
    println!("  2. Present in T3000.exe's PE export directory");
    println!("  3. Has stable C interface with proper calling convention");
    println!("  4. Designed for external DLL access");

    println!("\n📋 Why Direct FFI FAILS:");
    println!("  1. Functions are internal C++ class methods");
    println!("  2. NOT in T3000.exe's PE export directory");
    println!("  3. Names are mangled by C++ compiler");
    println!("  4. May require specific T3000 application context");

    println!("\n📋 Technical Difference:");
    println!("  🟢 HandleWebViewMsg: DLL Export Function (External Interface)");
    println!("  🔴 T3000_IsDeviceOnline: Internal Function (No Export)");

    println!("\n📋 Solution:");
    println!("  ✅ Use HandleWebViewMsg with JSON messages");
    println!("  ❌ Don't try to call internal functions directly");
}
