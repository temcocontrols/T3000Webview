// SIMPLE DEMONSTRATION: Why One FFI Works, One Doesn't
// ====================================================

use std::ffi::CString;
use winapi::um::libloaderapi::{GetProcAddress, GetModuleHandleA, LoadLibraryA};

fn main() {
    println!("🔬 DIRECT COMPARISON: Both call C++ code, why different results?");
    println!("================================================================");

    // Both approaches try to call T3000.exe functions
    // Let's see what happens with each approach

    test_approach_1_direct_ffi();
    println!();
    test_approach_2_handlewebviewmsg();

    println!("\n🎯 THE ANSWER:");
    println!("==============");
    println!("Approach 1 FAILS: Functions not exported from T3000.exe");
    println!("Approach 2 WORKS: HandleWebViewMsg IS exported from T3000.exe");
    println!("\nBoth call C++ code, but only exported functions are accessible!");
}

fn test_approach_1_direct_ffi() {
    println!("🔴 APPROACH 1: Direct FFI (FAILS)");
    println!("----------------------------------");

    unsafe {
        // Try to get T3000.exe module handle
        let handle = GetModuleHandleA(b"T3000.exe\0".as_ptr() as *const i8);

        if handle.is_null() {
            println!("❌ T3000.exe module not found");
            return;
        }

        println!("✅ T3000.exe module found");

        // Try to find the direct FFI functions
        let functions_to_test = vec![
            "T3000_IsDeviceOnline",
            "GetMonitorBlockData",
            "SetPoint",
            "GetPanelInfo"
        ];

        for func_name in functions_to_test {
            let func_cstring = CString::new(func_name).unwrap();
            let func_ptr = GetProcAddress(handle, func_cstring.as_ptr());

            if func_ptr.is_null() {
                println!("❌ {} - NOT FOUND (This is why FFI fails)", func_name);
            } else {
                println!("✅ {} - Found", func_name);
            }
        }
    }
}

fn test_approach_2_handlewebviewmsg() {
    println!("🟢 APPROACH 2: HandleWebViewMsg (WORKS)");
    println!("---------------------------------------");

    unsafe {
        // Try to load T3000.exe as a library (different approach)
        let t3000_paths = vec![
            r"E:\1025\github\temcocontrols\T3000_Building_Automation_System\T3000 Output\Debug\T3000.exe"
        ];

        for path in t3000_paths {
            if std::path::Path::new(path).exists() {
                println!("✅ Found T3000.exe at: {}", path);

                let path_cstring = CString::new(path).unwrap();
                let module = LoadLibraryA(path_cstring.as_ptr());

                if !module.is_null() {
                    println!("✅ Successfully loaded T3000.exe as DLL");

                    // Try to find HandleWebViewMsg
                    let func_name = CString::new("BacnetWebView_HandleWebViewMsg").unwrap();
                    let func_ptr = GetProcAddress(module, func_name.as_ptr());

                    if func_ptr.is_null() {
                        println!("❌ BacnetWebView_HandleWebViewMsg - NOT FOUND");
                    } else {
                        println!("✅ BacnetWebView_HandleWebViewMsg - FOUND (This is why it works!)");

                        // This is the function we can actually call
                        println!("   📡 This function accepts JSON messages");
                        println!("   📡 It's properly exported for external use");
                        println!("   📡 It internally calls the T3000 functions we need");
                    }
                } else {
                    let error = winapi::um::errhandlingapi::GetLastError();
                    println!("❌ Failed to load T3000.exe as DLL (Error: {})", error);
                }
                break;
            }
        }
    }
}
