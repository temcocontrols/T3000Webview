use std::env;
use std::path::PathBuf;

fn main() {
    // Get the directory where the build script is located
    let manifest_dir = env::var("CARGO_MANIFEST_DIR").unwrap();
    let ffi_dir = PathBuf::from(&manifest_dir).join("src").join("ffi");
    let third_party_dir = PathBuf::from(&manifest_dir).join("src").join("ffi").join("third_party");
    let t3000_cpp_dir = PathBuf::from(&manifest_dir).parent().unwrap().join("T3000_Building_Automation_System_Source").join("T3000");

    // Tell cargo to rerun if any files change
    println!("cargo:rerun-if-changed=src/ffi/t3000_ffi.cpp");
    println!("cargo:rerun-if-changed=src/ffi/t3000_ffi.h");
    println!("cargo:rerun-if-changed=src/ffi/third_party/T3000_exports.cpp");
    println!("cargo:rerun-if-changed=src/ffi/third_party/T3000_exports.h");
    println!("cargo:rerun-if-changed=../T3000_Building_Automation_System_Source/T3000/T3000_exports.cpp");
    println!("cargo:rerun-if-changed=../T3000_Building_Automation_System_Source/T3000/T3000_exports.h");

    // Configure the C++ compiler for direct T3000 integration
    // We only use the real T3000 implementation now to avoid symbol conflicts
    if t3000_cpp_dir.join("T3000_exports.cpp").exists() {
        println!("cargo:rustc-link-lib=static=t3000_real");

        cc::Build::new()
            .cpp(true)
            .std("c++14")
            .file(t3000_cpp_dir.join("T3000_exports.cpp"))
            .include(&t3000_cpp_dir)
            .include(&ffi_dir)
            .include(&third_party_dir)
            // Simplified without MFC/ATL for now to avoid compilation issues
            .define("NOMINMAX", None)
            .compile("t3000_real");

        println!("✅ Compiled real T3000 C++ implementation (simplified)");
    } else {
        // Fallback to Rust side FFI (mock implementation) if real T3000 not available
        cc::Build::new()
            .cpp(true)
            .std("c++14")
            .file(third_party_dir.join("T3000_exports.cpp"))
            .include(&ffi_dir)
            .include(&third_party_dir)
            .include(&t3000_cpp_dir)  // Include C++ side headers
            .compile("t3000_exports_rust");

        println!("⚠️  Real T3000 C++ implementation not found, using fallback mock implementation");
    }

    // Link required Windows libraries
    println!("cargo:rustc-link-lib=kernel32");
    println!("cargo:rustc-link-lib=user32");
    println!("cargo:rustc-link-lib=ws2_32");
    println!("cargo:rustc-link-lib=ole32");
    println!("cargo:rustc-link-lib=shell32");

    // Add library search path
    println!("cargo:rustc-link-search=native={}",
             PathBuf::from(&manifest_dir).join("target").join("debug").display());
}
