use std::path::Path;

/// Copy a directory tree into the Cargo output profile root.
///
/// Source paths are resolved relative to `CARGO_MANIFEST_DIR` (the `api/`
/// crate root).  The destination is `target/<profile>/T3Web/t3-eez/resources/`
/// — this matches `data_root()` at runtime (see `api/src/t3_eez_studio/mod.rs`).
///
/// **Adding new static resources for release packaging:**
///   1. Add another `copy_resource_dir(…)` call below.
///   2. The source must live somewhere reachable from this build script
///      (e.g. a sibling repo checked out next to this one; use `../../`).
///
fn copy_resource_dir(manifest_dir: &str, profile_root: &Path, relative_src: &str) {
    let src = Path::new(manifest_dir).join(relative_src);
    // Strip the last path component as the dir name (e.g. "eez-framework-amalgamation")
    let dir_name = src.file_name().expect("source must be a directory path");
    let dst = profile_root
        .join("T3Web")
        .join("t3-eez")
        .join("resources")
        .join(dir_name);

    if !src.is_dir() {
        println!("cargo:warning=Resource source not found, skipping: {}", src.display());
        return;
    }

    let _ = std::fs::create_dir_all(&dst);
    for entry in std::fs::read_dir(&src).expect("Failed to read resource source dir") {
        let entry = entry.expect("Failed to read resource entry");
        let dest_path = dst.join(entry.file_name());
        std::fs::copy(entry.path(), &dest_path)
            .unwrap_or_else(|e| panic!("Failed to copy {:?} → {:?}: {}", entry.path(), dest_path, e));
    }
    println!("cargo:warning=Copied {} files → {}", src.display(), dst.display());
}

fn main() {
    // FFI — HandleWebViewMsg is loaded from T3000.exe at runtime; nothing to compile.
    println!("cargo:warning=HandleWebViewMsg will be loaded from T3000.exe at runtime");

    // Resolve key paths
    let manifest_dir = std::env::var("CARGO_MANIFEST_DIR").unwrap();
    let out_dir = std::env::var("OUT_DIR").unwrap();

    // OUT_DIR  = target/<profile>/build/<crate>/out
    // parent×3 = target/<profile>
    let profile_root = Path::new(&out_dir)
        .parent()
        .and_then(|p| p.parent())
        .and_then(|p| p.parent())
        .expect("Failed to resolve profile root from OUT_DIR");

    // ── Static resources copied into the release output tree ──────────────
    // Source paths are relative to api/ (CARGO_MANIFEST_DIR).
    // Destination: target/<profile>/T3Web/t3-eez/resources/<dir>/
    // These are packaged alongside the DLL for distribution.

    copy_resource_dir(
        &manifest_dir,
        profile_root,
        "../../eez-studio/resources/eez-framework-amalgamation",
    );

    // TODO: add more copy_resource_dir(…) calls here for additional static
    //       resource directories needed at runtime.

    println!("cargo:warning=Build complete");
}
