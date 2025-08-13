use std::env;
use std::path::PathBuf;

fn main() {
    // Get the directory where the build script is located
    let manifest_dir = env::var("CARGO_MANIFEST_DIR").unwrap();
    let ffi_dir = PathBuf::from(&manifest_dir).join("src").join("ffi");
    let t3000_source_dir = PathBuf::from(&manifest_dir)
        .parent().unwrap()
        .join("T3000_Building_Automation_System_Source")
        .join("T3000");

    // Tell cargo to rerun if any files change
    println!("cargo:rerun-if-changed=src/ffi/t3000_ffi.cpp");
    println!("cargo:rerun-if-changed=src/ffi/t3000_ffi.h");
    println!("cargo:rerun-if-changed=../T3000_Building_Automation_System_Source/T3000/T3000_exports.cpp");
    println!("cargo:rerun-if-changed=../T3000_Building_Automation_System_Source/T3000/T3000_exports.h");

    // Configure the C++ compiler for FFI bridge
    cc::Build::new()
        .cpp(true)
        .std("c++14")
        .file(ffi_dir.join("t3000_ffi.cpp"))
        .include(&ffi_dir)
        .include(&t3000_source_dir) // Include T3000 source for exports
        .compile("t3000_ffi");

    // Configure the C++ compiler for T3000 exports
    // Note: In production, you might want to link against a pre-built T3000 library
    // instead of compiling the source directly
    cc::Build::new()
        .cpp(true)
        .std("c++14")
        .file(t3000_source_dir.join("T3000_exports.cpp"))
        .include(&t3000_source_dir)
        // Add other T3000 includes as needed:
        // .include(t3000_source_dir.join("include"))
        // .include(t3000_source_dir.join("bacnet"))
        .compile("t3000_exports");

    // Link required Windows libraries for 32-bit
    println!("cargo:rustc-link-lib=kernel32");
    println!("cargo:rustc-link-lib=user32");
    println!("cargo:rustc-link-lib=ws2_32");
    println!("cargo:rustc-link-lib=ole32");
    println!("cargo:rustc-link-lib=shell32");

    // Add library search path
    println!("cargo:rustc-link-search=native={}",
             PathBuf::from(&manifest_dir).join("target").join("debug").display());
}
