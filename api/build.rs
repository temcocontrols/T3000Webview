use std::env;
use std::path::PathBuf;

fn main() {
    // Get the directory where the build script is located
    let manifest_dir = env::var("CARGO_MANIFEST_DIR").unwrap();
    let ffi_dir = PathBuf::from(&manifest_dir).join("src").join("ffi");
    let third_party_dir = PathBuf::from(&manifest_dir).join("src").join("ffi").join("third_party");

    // Tell cargo to rerun if any files change
    println!("cargo:rerun-if-changed=src/ffi/t3000_ffi.cpp");
    println!("cargo:rerun-if-changed=src/ffi/t3000_ffi.h");
    println!("cargo:rerun-if-changed=src/ffi/third_party/T3000_exports.cpp");
    println!("cargo:rerun-if-changed=src/ffi/third_party/T3000_exports.h");

    // Configure the C++ compiler for T3000 exports (includes all FFI functions)
    cc::Build::new()
        .cpp(true)
        .std("c++14")
        .file(third_party_dir.join("T3000_exports.cpp"))
        .include(&ffi_dir)
        .include(&third_party_dir)
        .compile("t3000_exports");

    // Note: Using T3000_exports.cpp instead of t3000_ffi.cpp to avoid duplicate symbols

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
