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

/// Copy selected individual files from a source directory into the destination.
/// Each entry in `files` is (source_filename, dest_filename_or_subpath).
/// Destination: profile_root/T3Web/t3-eez/resources/{dest_rel}/
fn copy_selected_files(
    manifest_dir: &str,
    profile_root: &Path,
    relative_src_dir: &str,
    files: &[(&str, &str)],
    dest_rel: &str,
) {
    let src_dir = Path::new(manifest_dir).join(relative_src_dir);
    let dst_dir = profile_root
        .join("T3Web")
        .join("t3-eez")
        .join("resources")
        .join(dest_rel);

    if !src_dir.is_dir() {
        println!("cargo:warning=Resource source dir not found, skipping: {}", src_dir.display());
        return;
    }

    let _ = std::fs::create_dir_all(&dst_dir);

    for &(src_name, dest_name) in files {
        let src_file = src_dir.join(src_name);
        let dst_file = dst_dir.join(dest_name);
        if src_file.is_file() {
            if let Some(parent) = dst_file.parent() {
                let _ = std::fs::create_dir_all(parent);
            }
            std::fs::copy(&src_file, &dst_file)
                .unwrap_or_else(|e| panic!("Failed to copy {:?} → {:?}: {}", src_file, dst_file, e));
        } else {
            println!("cargo:warning=File not found, skipping: {}", src_file.display());
        }
    }
    println!("cargo:warning=Copied selected files → {}", dst_dir.display());
}

/// Copy WASM runtimes and font assets from source repos into profile_root.
/// Called once for release (target/) and once for dev (api/).
fn copy_wasm_and_fonts(manifest_dir: &str, root: &Path) {
    // Dashboard + GUI lite runtime → eez-studio-wasm/wasm/
    copy_selected_files(
        manifest_dir, root,
        "../../studio-wasm-libs/release/wasm",
        &[
            ("eez_runtime.js", "wasm/eez_runtime.js"),
            ("eez_runtime.wasm", "wasm/eez_runtime.wasm"),
            ("eez_gui_lite_runtime.js", "wasm/eez_gui_lite_runtime.js"),
            ("eez_gui_lite_runtime.wasm", "wasm/eez_gui_lite_runtime.wasm"),
            ("lz4.js", "wasm/lz4.js"),
            ("lz4.wasm", "wasm/lz4.wasm"),
        ],
        "eez-studio-wasm",
    );
    // LVGL per-version runtimes → eez-studio-wasm/wasm/lvgl/{version}/
    copy_selected_files(
        manifest_dir, root,
        "../../studio-wasm-libs/release/wasm",
        &[
            ("lvgl_runtime_v8.4.0.js", "wasm/lvgl/8.4.0/lvgl_runtime_v8.4.0.js"),
            ("lvgl_runtime_v8.4.0.wasm", "wasm/lvgl/8.4.0/lvgl_runtime_v8.4.0.wasm"),
            ("lvgl_runtime_v9.2.2.js", "wasm/lvgl/9.2.2/lvgl_runtime_v9.2.2.js"),
            ("lvgl_runtime_v9.2.2.wasm", "wasm/lvgl/9.2.2/lvgl_runtime_v9.2.2.wasm"),
            ("lvgl_runtime_v9.3.0.js", "wasm/lvgl/9.3.0/lvgl_runtime_v9.3.0.js"),
            ("lvgl_runtime_v9.3.0.wasm", "wasm/lvgl/9.3.0/lvgl_runtime_v9.3.0.wasm"),
            ("lvgl_runtime_v9.4.0.js", "wasm/lvgl/9.4.0/lvgl_runtime_v9.4.0.js"),
            ("lvgl_runtime_v9.4.0.wasm", "wasm/lvgl/9.4.0/lvgl_runtime_v9.4.0.wasm"),
            ("lvgl_runtime_v9.5.0.js", "wasm/lvgl/9.5.0/lvgl_runtime_v9.5.0.js"),
            ("lvgl_runtime_v9.5.0.wasm", "wasm/lvgl/9.5.0/lvgl_runtime_v9.5.0.wasm"),
        ],
        "eez-studio-wasm",
    );
    // Font assets → eez-studio-assets/
    copy_selected_files(
        manifest_dir, root,
        "../../eez-studio/packages/eez-studio-ui/_stylesheets",
        &[
            ("FontAwesome5-Solid+Brands+Regular.woff", "FontAwesome5-Solid+Brands+Regular.woff"),
            ("material-icons.css", "material-icons.css"),
            ("MaterialIcons-Regular.woff2", "MaterialIcons-Regular.woff2"),
            ("Roboto-Regular.ttf", "Roboto-Regular.ttf"),
            ("RobotoMono-Regular.ttf", "RobotoMono-Regular.ttf"),
        ],
        "eez-studio-assets",
    );
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
        "../../studio-wasm-libs/release/eez-framework-amalgamation",
    );

    copy_resource_dir(
        &manifest_dir,
        profile_root,
        "../../eez-studio/resources/docker-build",
    );

    // WASM runtimes + font assets → release (target/)
    copy_wasm_and_fonts(&manifest_dir, profile_root);

    println!("cargo:warning=Build complete");
}

