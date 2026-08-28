//! Bridge API — file system operations for the EEZ Studio web frontend.
//! Replaces Node.js `fs` in the browser by routing through the Rust backend.

pub mod font_extract;
pub mod bacnet_api_mock;
pub mod parse_squareline;
pub mod lvgl_img_extract;

use axum::{
    body::Bytes,
    extract::{Path, Query},
    http::{header, HeaderMap, Method, StatusCode},
    response::{IntoResponse, Response},
    routing::{any, delete, get, patch, post, put},
    Json, Router,
};
use rusqlite::OptionalExtension;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::path::PathBuf;
use std::process::Command;
use std::sync::Mutex;
use tokio::fs;
use tracing::{error, info, warn};

use crate::app_state::T3AppState;

////////////////////////////////////////////////////////////////////////////////
// Types
////////////////////////////////////////////////////////////////////////////////

#[derive(Debug, Deserialize)]
struct PathQuery {
    path: String,
}

#[derive(Debug, Deserialize)]
struct MakeFolderBody {
    path: String,
}

#[derive(Debug, Serialize)]
struct FileExistsResponse {
    exists: bool,
}

#[derive(Debug, Serialize)]
struct FileSizeResponse {
    size: u64,
}

#[derive(Debug, Serialize)]
struct IsDirectoryResponse {
    is_directory: bool,
}

/// Combined stat response — avoids separate file-size + is-directory calls
#[derive(Debug, Serialize)]
struct StatResponse {
    exists: bool,
    size: u64,
    is_directory: bool,
}

#[derive(Debug, Serialize)]
struct FileEntry {
    name: String,
    is_directory: bool,
}

#[derive(Debug, Serialize)]
struct ListFilesDetailedResponse {
    entries: Vec<FileEntry>,
}

#[derive(Debug, Deserialize)]
struct DeleteRecursiveQuery {
    path: String,
    #[serde(default)]
    force: bool,
}

////////////////////////////////////////////////////////////////////////////////
// Helpers
////////////////////////////////////////////////////////////////////////////////

/// Resolve a user-supplied path to an absolute path under T3Web/t3-eez.
///
/// `PathBuf::join` does NOT normalise `..` components, so we do it manually.
/// Additionally, the LVGL WASM runtime prepends a virtual `/wasm/` prefix to
/// paths — if `..` components would escape `data_root()`, we cap them so the
/// result always stays within `data_root()`.
fn resolve_path(base: &str, user_path: &str) -> PathBuf {
    let cleaned = user_path.trim_start_matches('/').trim_start_matches('\\');
    let joined = PathBuf::from(base).join(cleaned);

    let root = PathBuf::from(base);
    let root_depth = root.components().count();

    let mut normalized = PathBuf::new();
    let mut depth: usize = 0;
    for component in joined.components() {
        match component {
            std::path::Component::ParentDir => {
                // Don't pop past data_root() — cap at the root boundary
                if depth > root_depth {
                    normalized.pop();
                    depth -= 1;
                }
            }
            std::path::Component::CurDir => {}
            other => {
                normalized.push(other);
                depth += 1;
            }
        }
    }
    normalized
}

pub(crate) fn data_root() -> PathBuf {
    std::env::current_dir()
        .unwrap_or_else(|_| PathBuf::from("."))
        .join("T3Web").join("t3-eez")
}

////////////////////////////////////////////////////////////////////////////////
// Handlers
////////////////////////////////////////////////////////////////////////////////

async fn read_text_file(
    Query(q): Query<PathQuery>,
) -> Result<String, StatusCode> {
    let full_path = resolve_path(&data_root().to_string_lossy(), &q.path);
    info!("read_text_file: raw={} → resolved={}", q.path, full_path.display());
    match fs::read_to_string(&full_path).await {
        Ok(content) => Ok(content),
        Err(e) => {
            error!("read_text_file failed: {} — {:?}", full_path.display(), e);
            Err(StatusCode::NOT_FOUND)
        }
    }
}

async fn read_file(
    Query(q): Query<PathQuery>,
) -> Result<(axum::http::HeaderMap, Vec<u8>), StatusCode> {
    let full_path = resolve_path(&data_root().to_string_lossy(), &q.path);
    match fs::read(&full_path).await {
        Ok(data) => {
            let mime = mime_guess::from_path(&full_path).first_or_octet_stream();
            let mut headers = axum::http::HeaderMap::new();
            headers.insert(
                axum::http::header::CONTENT_TYPE,
                mime.to_string().parse().unwrap(),
            );
            Ok((headers, data))
        }
        Err(e) => {
            error!("read_file failed: {} — {:?}", full_path.display(), e);
            Err(StatusCode::NOT_FOUND)
        }
    }
}

async fn write_file(
    Query(q): Query<PathQuery>,
    body: axum::body::Bytes,
) -> Result<StatusCode, StatusCode> {
    let full_path = resolve_path(&data_root().to_string_lossy(), &q.path);
    if let Some(parent) = full_path.parent() {
        let _ = fs::create_dir_all(parent).await;
    }
    match fs::write(&full_path, &body).await {
        Ok(_) => {
            info!("write_file: {} ({} bytes)", full_path.display(), body.len());
            Ok(StatusCode::OK)
        }
        Err(e) => {
            error!("write_file failed: {} — {:?}", full_path.display(), e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

async fn write_text_file(
    Query(q): Query<PathQuery>,
    body: String,
) -> Result<StatusCode, StatusCode> {
    let full_path = resolve_path(&data_root().to_string_lossy(), &q.path);
    if let Some(parent) = full_path.parent() {
        let _ = fs::create_dir_all(parent).await;
    }
    match fs::write(&full_path, &body).await {
        Ok(_) => {
            info!("write_text_file: {} ({} chars)", full_path.display(), body.len());
            Ok(StatusCode::OK)
        }
        Err(e) => {
            error!("write_text_file failed: {} — {:?}", full_path.display(), e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

async fn make_folder(
    Json(body): Json<MakeFolderBody>,
) -> Result<StatusCode, StatusCode> {
    info!("bridge_api::make_folder called: path={}", body.path);
    let full_path = resolve_path(&data_root().to_string_lossy(), &body.path);
    match fs::create_dir_all(&full_path).await {
        Ok(_) => {
            info!("make_folder: {}", full_path.display());
            Ok(StatusCode::OK)
        }
        Err(e) => {
            error!("make_folder failed: {} — {:?}", full_path.display(), e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

async fn file_exists(
    Query(q): Query<PathQuery>,
) -> Json<FileExistsResponse> {
    let full_path = resolve_path(&data_root().to_string_lossy(), &q.path);
    let exists = fs::metadata(&full_path).await.map(|m| m.is_file() || m.is_dir()).unwrap_or(false);
    Json(FileExistsResponse { exists })
}

async fn delete_file(
    Query(q): Query<PathQuery>,
) -> Result<StatusCode, StatusCode> {
    let full_path = resolve_path(&data_root().to_string_lossy(), &q.path);
    // Try file first, then empty directory
    match fs::remove_file(&full_path).await {
        Ok(_) => {
            info!("delete_file: {}", full_path.display());
            Ok(StatusCode::OK)
        }
        Err(e) => {
            if e.kind() == std::io::ErrorKind::NotFound {
                Ok(StatusCode::OK) // idempotent
            } else {
                // Might be a directory — try remove_dir (only works if empty)
                match fs::remove_dir(&full_path).await {
                    Ok(_) => {
                        info!("delete_file (dir): {}", full_path.display());
                        Ok(StatusCode::OK)
                    }
                    Err(e2) => {
                        error!("delete_file failed: {} — {:?}", full_path.display(), e2);
                        Err(StatusCode::INTERNAL_SERVER_ERROR)
                    }
                }
            }
        }
    }
}

async fn list_files(
    Query(q): Query<PathQuery>,
) -> Result<Json<Vec<String>>, StatusCode> {
    let full_path = resolve_path(&data_root().to_string_lossy(), &q.path);
    let mut entries = Vec::new();
    if let Ok(mut dir) = fs::read_dir(&full_path).await {
        while let Ok(Some(entry)) = dir.next_entry().await {
            if let Ok(name) = entry.file_name().into_string() {
                entries.push(name);
            }
        }
    }
    Ok(Json(entries))
}

async fn file_size(
    Query(q): Query<PathQuery>,
) -> Result<Json<FileSizeResponse>, StatusCode> {
    let full_path = resolve_path(&data_root().to_string_lossy(), &q.path);
    match fs::metadata(&full_path).await {
        Ok(meta) => Ok(Json(FileSizeResponse { size: meta.len() })),
        Err(_) => Err(StatusCode::NOT_FOUND),
    }
}

async fn list_files_detailed(
    Query(q): Query<PathQuery>,
) -> Result<Json<ListFilesDetailedResponse>, StatusCode> {
    let full_path = resolve_path(&data_root().to_string_lossy(), &q.path);
    let mut entries = Vec::new();
    if let Ok(mut dir) = fs::read_dir(&full_path).await {
        while let Ok(Some(entry)) = dir.next_entry().await {
            if let Ok(name) = entry.file_name().into_string() {
                let is_dir = entry.file_type().await.map(|ft| ft.is_dir()).unwrap_or(false);
                entries.push(FileEntry { name, is_directory: is_dir });
            }
        }
    }
    Ok(Json(ListFilesDetailedResponse { entries }))
}

async fn delete_recursive(
    Query(q): Query<DeleteRecursiveQuery>,
) -> Result<StatusCode, StatusCode> {
    let full_path = resolve_path(&data_root().to_string_lossy(), &q.path);
    // force=true: don't error if path doesn't exist
    if q.force && fs::metadata(&full_path).await.is_err() {
        return Ok(StatusCode::OK);
    }
    match fs::remove_dir_all(&full_path).await {
        Ok(_) => {
            info!("delete_recursive: {}", full_path.display());
            Ok(StatusCode::OK)
        }
        Err(e) => {
            if q.force && e.kind() == std::io::ErrorKind::NotFound {
                Ok(StatusCode::OK)
            } else {
                error!("delete_recursive failed: {} — {:?}", full_path.display(), e);
                Err(StatusCode::INTERNAL_SERVER_ERROR)
            }
        }
    }
}

async fn stat_file(
    Query(q): Query<PathQuery>,
) -> Json<StatResponse> {
    let full_path = resolve_path(&data_root().to_string_lossy(), &q.path);
    match fs::metadata(&full_path).await {
        Ok(meta) => Json(StatResponse {
            exists: true,
            size: meta.len(),
            is_directory: meta.is_dir(),
        }),
        Err(_) => Json(StatResponse {
            exists: false,
            size: 0,
            is_directory: false,
        }),
    }
}

async fn is_directory(
    Query(q): Query<PathQuery>,
) -> Json<IsDirectoryResponse> {
    let full_path = resolve_path(&data_root().to_string_lossy(), &q.path);
    let is_dir = fs::metadata(&full_path).await.map(|m| m.is_dir()).unwrap_or(false);
    Json(IsDirectoryResponse { is_directory: is_dir })
}

////////////////////////////////////////////////////////////////////////////////
// Proxy fetch — bypasses browser CORS by fetching server-side
////////////////////////////////////////////////////////////////////////////////

#[derive(Debug, Deserialize)]
struct ProxyFetchQuery {
    url: String,
}

async fn proxy_fetch(
    Query(q): Query<ProxyFetchQuery>,
) -> Result<String, StatusCode> {
    let client = reqwest::Client::new();
    match client.get(&q.url).send().await {
        Ok(resp) => match resp.text().await {
            Ok(body) => Ok(body),
            Err(e) => {
                error!("proxy_fetch read failed: {} — {:?}", q.url, e);
                Err(StatusCode::BAD_GATEWAY)
            }
        },
        Err(e) => {
            error!("proxy_fetch failed: {} — {:?}", q.url, e);
            Err(StatusCode::BAD_GATEWAY)
        }
    }
}

async fn proxy_fetch_binary(
    Query(q): Query<ProxyFetchQuery>,
) -> Result<Vec<u8>, StatusCode> {
    let client = reqwest::Client::new();
    match client.get(&q.url).send().await {
        Ok(resp) => match resp.bytes().await {
            Ok(body) => Ok(body.to_vec()),
            Err(e) => {
                error!("proxy_fetch_binary read failed: {} — {:?}", q.url, e);
                Err(StatusCode::BAD_GATEWAY)
            }
        },
        Err(e) => {
            error!("proxy_fetch_binary failed: {} — {:?}", q.url, e);
            Err(StatusCode::BAD_GATEWAY)
        }
    }
}

////////////////////////////////////////////////////////////////////////////////
// Device REST proxy — forwards EEZ device calls through THIS server so the
// browser never talks to the device directly.
//
// The ESP32 device serves /api/eez-device/* on port 80 but sends no CORS
// headers, so direct browser→device fetches are blocked by the browser. This
// route proxies them server-side (server→device has no CORS), returning the
// device's status + body to the browser as a same-origin response.
////////////////////////////////////////////////////////////////////////////////

/// Device REST port (ESP32 dynamic-display API).
const DEVICE_REST_PORT: u16 = 80;

/// Forward any method + body to `http://{host}:{port}/{path}`.
///
/// Browser → `/api/device-rest/<ip>[:port]/api/eez-device/<path>` → this server
/// → device. Method, Content-Type and body are forwarded; status, body and
/// Content-Type are passed back.
///
/// Port resolution precedence:
///   1. `x-device-port` header (explicit override, used by tests)
///   2. port embedded in the ip segment, e.g. `/api/device-rest/127.0.0.1:8080/...`
///   3. default device port 80
///
/// `#[doc(hidden)] pub` — exposed so the integration test in `tests/eez_studio/`
/// can mount the handler on a plain router (keeps this file test-free).
#[doc(hidden)]
pub async fn proxy_device_rest(
    Path((device_ip, path)): Path<(String, String)>,
    method: Method,
    headers: HeaderMap,
    body: Bytes,
) -> Response {
    let header_port = headers
        .get("x-device-port")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.parse::<u16>().ok());
    let (host, ip_port) = match device_ip.rsplit_once(':') {
        Some((h, p)) => (h.to_string(), p.parse::<u16>().ok()),
        None => (device_ip, None),
    };
    let port = header_port.or(ip_port).unwrap_or(DEVICE_REST_PORT);
    let url = format!("http://{}:{}/{}", host, port, path);

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(35))
        .build()
        .unwrap_or_else(|_| reqwest::Client::new());

    let mut req = client.request(method.clone(), &url);
    if let Some(ct) = headers.get(header::CONTENT_TYPE) {
        req = req.header(header::CONTENT_TYPE, ct);
    }
    let resp = if body.is_empty() {
        req.send().await
    } else {
        req.body(body).send().await
    };

    match resp {
        Ok(r) => {
            let status = r.status();
            let ct = r
                .headers()
                .get(header::CONTENT_TYPE)
                .and_then(|v| v.to_str().ok())
                .map(|s| s.to_string());
            let bytes = r.bytes().await.unwrap_or_default();
            let mut out = Response::new(axum::body::Body::from(bytes));
            *out.status_mut() = status;
            if let Some(ct) = ct {
                if let Ok(v) = ct.parse() {
                    out.headers_mut().insert(header::CONTENT_TYPE, v);
                }
            }
            out
        }
        Err(e) => {
            warn!("[device-proxy] {} {} failed: {}", method, url, e);
            (
                StatusCode::BAD_GATEWAY,
                Json(serde_json::json!({ "error": format!("device proxy failed: {}", e) })),
            )
                .into_response()
        }
    }
}

////////////////////////////////////////////////////////////////////////////////
// Font extraction — pure Rust TTF → LVGL binary (replaces lv_font_conv)
////////////////////////////////////////////////////////////////////////////////

#[derive(Debug, Deserialize)]
struct FontExtractRequest {
    args: Value,
    output: String,
}

async fn extract_font(
    Json(req): Json<FontExtractRequest>,
) -> Result<Json<Value>, StatusCode> {
    // ── Entry log ──────────────────────────────────────────────────────
    info!("extract_font: RECEIVED request, output={}", req.output);
    info!("extract_font: args keys: {:?}", req.args.as_object().map(|o| o.keys().collect::<Vec<_>>()));
    info!("extract_font: args.size={:?}, args.bpp={:?}", req.args["size"], req.args["bpp"]);

    let font_entries = req.args["font"].as_array().ok_or(StatusCode::BAD_REQUEST)?;
    info!("extract_font: font_entries count={}", font_entries.len());

    for (i, entry) in font_entries.iter().enumerate() {
        let has_b64 = entry["source_bin_base64"].is_string();
        let b64_len = entry["source_bin_base64"].as_str().map(|s| s.len()).unwrap_or(0);
        let has_ranges = entry["ranges"].is_array();
        let ranges_count = entry["ranges"].as_array().map(|r| r.len()).unwrap_or(0);
        info!(
            "extract_font: entry[{}] has_b64={} b64_len={} has_ranges={} ranges_count={}",
            i, has_b64, b64_len, has_ranges, ranges_count
        );
    }

    let size = req.args["size"].as_f64().unwrap_or(16.0) as f32;
    let bpp = req.args["bpp"].as_u64().unwrap_or(4) as u8;
    let no_compress = req.args["no_compress"].as_bool().unwrap_or(true);
    let lcd = req.args["lcd"].as_bool().unwrap_or(false);
    let lcd_v = req.args["lcd_v"].as_bool().unwrap_or(false);
    let no_kerning = req.args["no_kerning"].as_bool().unwrap_or(true);
    let no_prefilter = req.args["no_prefilter"].as_bool().unwrap_or(false);

    let mut all_glyphs: Vec<serde_json::Value> = Vec::new();
    let mut font_ascent: u16 = 0;
    let mut font_descent: i16 = 0;
    let mut last_bin = String::new();
    let mut last_source = String::new();
    let mut last_diag_tables = serde_json::Value::Null;

    for entry in font_entries {
        let source_bin_base64 = entry["source_bin_base64"]
            .as_str()
            .ok_or(StatusCode::BAD_REQUEST)?;

        // Diagnostic: log first 80 chars to see what format the data is in
        let preview: String = source_bin_base64.chars().take(80).collect();
        info!("extract_font: source_bin_base64 preview: {}", preview);

        let mut codepoints: Vec<u32> = Vec::new();
        if let Some(ranges) = entry["ranges"].as_array() {
            for range_item in ranges {
                if let Some(range_arr) = range_item["range"].as_array() {
                    for chunk in range_arr.chunks(3) {
                        if chunk.len() >= 2 {
                            let from = chunk[0].as_u64().unwrap_or(0) as u32;
                            let to = chunk[1].as_u64().unwrap_or(0) as u32;
                            for c in from..=to { codepoints.push(c); }
                        }
                    }
                }
                if let Some(symbols) = range_item["symbols"].as_str() {
                    for c in symbols.chars() { codepoints.push(c as u32); }
                }
            }
        }
        codepoints.sort();
        codepoints.dedup();

        let result = font_extract::process_font(
            source_bin_base64, size, bpp, &codepoints, &req.output,
            no_compress, lcd, lcd_v, no_kerning, no_prefilter,
        ).map_err(|e| {
            error!("extract_font: process_font FAILED: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

        info!(
            "extract_font: process_font OK — glyphs={} ascent={} descent={} binFile_len={} sourceFile_len={}",
            result.font_data.glyphs.len(),
            result.font_data.ascent,
            result.font_data.descent,
            result.lvgl_bin_file.len(),
            result.lvgl_source_file.len()
        );

        for g in &result.font_data.glyphs {
            all_glyphs.push(serde_json::json!({
                "code": g.code,
                "advanceWidth": g.advance_width,
                "bbox": {"x": g.bbox.x, "y": g.bbox.y, "width": g.bbox.width, "height": g.bbox.height},
                "pixels": g.pixels
            }));
        }
        font_ascent = result.font_data.ascent;
        font_descent = result.font_data.descent;
        last_bin = result.lvgl_bin_file;
        last_source = result.lvgl_source_file;
        last_diag_tables = result.diag_tables;
    }

    info!(
        "extract_font: DONE — total_glyphs={} last_bin_len={} last_source_len={}",
        all_glyphs.len(),
        last_bin.len(),
        last_source.len()
    );

    Ok(Json(serde_json::json!({
        "_diag": {
            "bin_bytes": last_bin.len(),
            "glyph_count": all_glyphs.len(),
            "first_5_glyphs": all_glyphs.iter().take(5).map(|g| serde_json::json!({
                "code": g["code"],
                "x": g["bbox"]["x"],
                "y": g["bbox"]["y"],
                "w": g["bbox"]["width"],
                "h": g["bbox"]["height"],
                "adv": g["advanceWidth"]
            })).collect::<Vec<_>>(),
            "ascent": font_ascent,
            "descent": font_descent
        },
        "_diag_tables": last_diag_tables,
        "fontData": { "ascent": font_ascent, "descent": font_descent, "glyphs": all_glyphs },
        "lvglBinFile": last_bin,
        "lvglSourceFile": last_source
    })))
}

////////////////////////////////////////////////////////////////////////////////
// Health check — used by browser frontend to detect backend availability
////////////////////////////////////////////////////////////////////////////////

#[derive(Debug, Serialize)]
struct HealthResponse {
    status: &'static str,
}

async fn health() -> Json<HealthResponse> {
    Json(HealthResponse { status: "ok" })
}

////////////////////////////////////////////////////////////////////////////////
// Command execution — proxies child_process calls from browser to real OS
////////////////////////////////////////////////////////////////////////////////

#[derive(Debug, Deserialize)]
struct ExecRequest {
    cmd: String,
    args: Vec<String>,
    #[serde(default)]
    cwd: Option<String>,
}

#[derive(Debug, Serialize)]
struct ExecResponse {
    status: i32,
    stdout: String,
    stderr: String,
}

async fn exec_command(Json(req): Json<ExecRequest>) -> Json<ExecResponse> {
    let mut cmd = Command::new(&req.cmd);
    cmd.args(&req.args);
    if let Some(ref cwd) = req.cwd {
        // Resolve relative paths through data_root() (like other bridge endpoints)
        // Absolute paths (e.g. from Electron) pass through unchanged
        let resolved = resolve_path(&data_root().to_string_lossy(), cwd);
        cmd.current_dir(&resolved);
    }
    match cmd.output() {
        Ok(output) => Json(ExecResponse {
            status: output.status.code().unwrap_or(-1),
            stdout: String::from_utf8_lossy(&output.stdout).to_string(),
            stderr: String::from_utf8_lossy(&output.stderr).to_string(),
        }),
        Err(e) => Json(ExecResponse {
            status: -1,
            stdout: String::new(),
            stderr: format!("Failed to execute {}: {}", req.cmd, e),
        }),
    }
}

////////////////////////////////////////////////////////////////////////////////
// Show item in folder — opens OS file explorer at the given path
////////////////////////////////////////////////////////////////////////////////

#[derive(Debug, Deserialize)]
struct ShowItemInFolderBody {
    path: String,
}

#[derive(Debug, Serialize)]
struct ShowItemInFolderResponse {
    success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<String>,
}

async fn show_item_in_folder(
    Json(body): Json<ShowItemInFolderBody>,
) -> Result<Json<ShowItemInFolderResponse>, StatusCode> {
    let full_path = resolve_path(&data_root().to_string_lossy(), &body.path);

    // On Windows, use "explorer /select,<path>" to select the file in Explorer.
    // On macOS, use "open -R <path>".
    // On Linux, use "xdg-open <dir>" (opens the containing folder).
    #[cfg(target_os = "windows")]
    let result = Command::new("explorer")
        .arg("/select,")
        .arg(full_path.to_string_lossy().as_ref())
        .spawn();

    #[cfg(target_os = "macos")]
    let result = Command::new("open")
        .arg("-R")
        .arg(full_path.to_string_lossy().as_ref())
        .spawn();

    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    let result = {
        let dir = if full_path.is_dir() {
            full_path.clone()
        } else {
            full_path.parent().map(|p| p.to_path_buf()).unwrap_or(full_path.clone())
        };
        Command::new("xdg-open")
            .arg(dir.to_string_lossy().as_ref())
            .spawn()
    };

    match result {
        Ok(_) => {
            info!("show_item_in_folder: opened {}", full_path.display());
            Ok(Json(ShowItemInFolderResponse { success: true, error: None }))
        }
        Err(e) => {
            error!("show_item_in_folder: failed to open {}: {}", full_path.display(), e);
            Ok(Json(ShowItemInFolderResponse {
                success: false,
                error: Some(format!("Failed to open folder: {}", e)),
            }))
        }
    }
}

////////////////////////////////////////////////////////////////////////////////
// Detect Python — runs python to find its executable path
////////////////////////////////////////////////////////////////////////////////

#[derive(Debug, Serialize)]
struct DetectPythonResponse {
    #[serde(skip_serializing_if = "Option::is_none")]
    path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<String>,
}

async fn detect_python() -> Json<DetectPythonResponse> {
    let result = tokio::task::spawn_blocking(move || {
        #[cfg(target_os = "windows")]
        let cmd_name = "python";
        #[cfg(not(target_os = "windows"))]
        let cmd_name = "python3";

        match Command::new(cmd_name)
            .args(["-c", "import sys;print(sys.executable)"])
            .output()
        {
            Ok(output) => {
                if output.status.success() {
                    let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
                    if !path.is_empty() {
                        info!("detect_python: found {}", path);
                        Json(DetectPythonResponse { path: Some(path), error: None })
                    } else {
                        Json(DetectPythonResponse { path: None, error: Some("Python returned empty path".into()) })
                    }
                } else {
                    let stderr = String::from_utf8_lossy(&output.stderr);
                    warn!("detect_python: python exited with error: {}", stderr.trim());
                    Json(DetectPythonResponse { path: None, error: Some(format!("Python error: {}", stderr.trim())) })
                }
            }
            Err(e) => {
                warn!("detect_python: python not found: {}", e);
                Json(DetectPythonResponse { path: None, error: Some("Python not found on system".into()) })
            }
        }
    })
    .await
    .unwrap_or_else(|e| {
        error!("detect_python: spawn_blocking failed: {}", e);
        Json(DetectPythonResponse { path: None, error: Some("Internal error".into()) })
    });

    result
}

////////////////////////////////////////////////////////////////////////////////
// Native file dialogs — opens real OS file picker, returns absolute path
////////////////////////////////////////////////////////////////////////////////

#[derive(Debug, Deserialize)]
struct PickFileRequest {
    #[serde(default)]
    title: Option<String>,
    #[serde(default)]
    filters: Option<Vec<FileFilterDef>>,
    #[serde(default)]
    default_path: Option<String>,
    #[serde(default)]
    file_name: Option<String>,
}

#[derive(Debug, Deserialize)]
struct FileFilterDef {
    name: String,
    extensions: Vec<String>,
}

#[derive(Debug, Serialize)]
struct PickFileResponse {
    #[serde(skip_serializing_if = "Option::is_none")]
    file_path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    cancelled: Option<bool>,
}

/// Opens a native OS file-open dialog and returns the selected file path.
/// If the user cancels, returns `{ cancelled: true }`.
async fn pick_open_file(
    Json(req): Json<PickFileRequest>,
) -> Result<Json<PickFileResponse>, StatusCode> {
    let result = tokio::task::spawn_blocking(move || {
        let mut dialog = rfd::FileDialog::new();

        if let Some(ref title) = req.title {
            dialog = dialog.set_title(title);
        }
        if let Some(ref default_path) = req.default_path {
            dialog = dialog.set_directory(default_path);
        }
        if let Some(ref filters) = req.filters {
            for f in filters {
                dialog = dialog.add_filter(&f.name, &f.extensions.iter().map(|s| s.as_str()).collect::<Vec<_>>());
            }
        }

        dialog.pick_file()
    })
    .await
    .map_err(|e| {
        error!("pick_open_file: spawn_blocking failed: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    match result {
        Some(path) => {
            let path_str = path.to_string_lossy().to_string();
            info!("pick_open_file: selected {}", path_str);
            Ok(Json(PickFileResponse {
                file_path: Some(path_str),
                cancelled: None,
            }))
        }
        None => {
            info!("pick_open_file: cancelled");
            Ok(Json(PickFileResponse {
                file_path: None,
                cancelled: Some(true),
            }))
        }
    }
}

/// Opens a native OS file-save dialog and returns the chosen file path.
/// If the user cancels, returns `{ cancelled: true }`.
async fn pick_save_file(
    Json(req): Json<PickFileRequest>,
) -> Result<Json<PickFileResponse>, StatusCode> {
    let result = tokio::task::spawn_blocking(move || {
        let mut dialog = rfd::FileDialog::new();

        if let Some(ref title) = req.title {
            dialog = dialog.set_title(title);
        }
        if let Some(ref default_path) = req.default_path {
            dialog = dialog.set_directory(default_path);
        }
        if let Some(ref file_name) = req.file_name {
            dialog = dialog.set_file_name(file_name);
        }
        if let Some(ref filters) = req.filters {
            for f in filters {
                dialog = dialog.add_filter(&f.name, &f.extensions.iter().map(|s| s.as_str()).collect::<Vec<_>>());
            }
        }

        dialog.save_file()
    })
    .await
    .map_err(|e| {
        error!("pick_save_file: spawn_blocking failed: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    match result {
        Some(path) => {
            let path_str = path.to_string_lossy().to_string();
            info!("pick_save_file: selected {}", path_str);
            Ok(Json(PickFileResponse {
                file_path: Some(path_str),
                cancelled: None,
            }))
        }
        None => {
            info!("pick_save_file: cancelled");
            Ok(Json(PickFileResponse {
                file_path: None,
                cancelled: Some(true),
            }))
        }
    }
}

/// Opens a native OS directory-picker dialog and returns the selected folder path.
async fn pick_directory(
    Json(req): Json<PickFileRequest>,
) -> Result<Json<PickFileResponse>, StatusCode> {
    let result = tokio::task::spawn_blocking(move || {
        let mut dialog = rfd::FileDialog::new();

        if let Some(ref title) = req.title {
            dialog = dialog.set_title(title);
        }
        if let Some(ref default_path) = req.default_path {
            dialog = dialog.set_directory(default_path);
        }

        dialog.pick_folder()
    })
    .await
    .map_err(|e| {
        error!("pick_directory: spawn_blocking failed: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    match result {
        Some(path) => {
            let path_str = path.to_string_lossy().to_string();
            info!("pick_directory: selected {}", path_str);
            Ok(Json(PickFileResponse {
                file_path: Some(path_str),
                cancelled: None,
            }))
        }
        None => {
            info!("pick_directory: cancelled");
            Ok(Json(PickFileResponse {
                file_path: None,
                cancelled: Some(true),
            }))
        }
    }
}

////////////////////////////////////////////////////////////////////////////////
// Vacuum database — runs SQLite VACUUM to reclaim disk space
////////////////////////////////////////////////////////////////////////////////

#[derive(Debug, Serialize)]
struct VacuumResponse {
    success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<String>,
}

async fn vacuum_database(
    Json(body): Json<ShowItemInFolderBody>,
) -> Result<Json<VacuumResponse>, StatusCode> {
    let full_path = resolve_path(&data_root().to_string_lossy(), &body.path);

    info!("vacuum_database: vacuuming {}", full_path.display());

    tokio::task::spawn_blocking(move || {
        match rusqlite::Connection::open(&full_path) {
            Ok(conn) => {
                match conn.execute_batch("VACUUM") {
                    Ok(_) => {
                        info!("vacuum_database: VACUUM completed for {}", full_path.display());
                        Ok(Json(VacuumResponse { success: true, error: None }))
                    }
                    Err(e) => {
                        error!("vacuum_database: VACUUM failed for {}: {}", full_path.display(), e);
                        Ok(Json(VacuumResponse {
                            success: false,
                            error: Some(format!("VACUUM failed: {}", e)),
                        }))
                    }
                }
            }
            Err(e) => {
                error!("vacuum_database: failed to open {}: {}", full_path.display(), e);
                Ok(Json(VacuumResponse {
                    success: false,
                    error: Some(format!("Failed to open database: {}", e)),
                }))
            }
        }
    })
    .await
    .map_err(|e| {
        error!("vacuum_database: spawn_blocking failed: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?
}

////////////////////////////////////////////////////////////////////////////////
// Store — SQLite-backed persistence (replaces Electron's better-sqlite3)
////////////////////////////////////////////////////////////////////////////////

lazy_static::lazy_static! {
    static ref STORE_DB: Option<Mutex<rusqlite::Connection>> = {
        let db_path = data_root().join("userData").join("storage.db");
        info!("store_db: opening {}", db_path.display());
        match rusqlite::Connection::open(&db_path) {
            Ok(conn) => {
                if conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;").is_err() {
                    warn!("store_db: failed to set pragmas, continuing");
                }
                info!("store_api: SQLite store ready at {}", db_path.display());
                Some(Mutex::new(conn))
            }
            Err(e) => {
                warn!("store_db: failed to open {}: {} — store unavailable", db_path.display(), e);
                None
            }
        }
    };
}

#[derive(Debug, Deserialize)]
struct StoreRequest {
    action: String,
    #[serde(default)]
    sql: String,
    #[serde(default)]
    params: Vec<Value>,
    #[serde(default)]
    statements: Vec<BatchStatement>,
    /// Optional SQL to run before the main statement (used to fold BEGIN into first DML)
    #[serde(default)]
    prefix: Option<String>,
}

#[derive(Debug, Deserialize)]
struct BatchStatement {
    sql: String,
    #[serde(default)]
    params: Vec<Value>,
}

fn bind_params_returning(stmt: &mut rusqlite::Statement, params: &[Value]) -> Result<usize, StatusCode> {
    bind_params_inner(stmt, params)
}

fn bind_params_inner(stmt: &mut rusqlite::Statement, params: &[Value]) -> Result<usize, StatusCode> {
    let converted: Vec<rusqlite::types::Value> = params.iter().map(|v| match v {
        Value::Null => rusqlite::types::Value::Null,
        Value::Number(n) => {
            if let Some(i) = n.as_i64() { rusqlite::types::Value::Integer(i) }
            else { rusqlite::types::Value::Real(n.as_f64().unwrap_or(0.0)) }
        }
        Value::String(s) => rusqlite::types::Value::Text(s.clone()),
        _ => rusqlite::types::Value::Null,
    }).collect();
    let refs: Vec<&dyn rusqlite::types::ToSql> = converted.iter().map(|p| p as &dyn rusqlite::types::ToSql).collect();
    stmt.execute(&refs[..]).map_err(|e| {
        error!("store bind_params: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })
}

async fn store_handler(
    Json(req): Json<StoreRequest>,
) -> Result<Json<Value>, StatusCode> {
    info!("store: action={} sql={:.80}", req.action, req.sql);
    let store = STORE_DB.as_ref().ok_or_else(|| {
        warn!("store: DB not available");
        StatusCode::SERVICE_UNAVAILABLE
    })?;
    let db = store.lock().map_err(|_| {
        error!("store: mutex poisoned");
        StatusCode::INTERNAL_SERVER_ERROR
    })?;
    match req.action.as_str() {
        "batch" => {
            db.execute_batch("BEGIN IMMEDIATE").map_err(|e| {
                error!("store batch begin: {}", e);
                StatusCode::INTERNAL_SERVER_ERROR
            })?;
            let mut last_insert_rowid: i64 = 0;
            let mut total_changes: i64 = 0;
            for stmt_req in &req.statements {
                let mut stmt = db.prepare(&stmt_req.sql).map_err(|e| {
                    error!("store batch prepare: {}", e);
                    StatusCode::INTERNAL_SERVER_ERROR
                })?;
                let changed = bind_params_returning(&mut stmt, &stmt_req.params)?;
                total_changes += changed as i64;
                last_insert_rowid = db.last_insert_rowid();
            }
            db.execute_batch("COMMIT").map_err(|e| {
                error!("store batch commit: {}", e);
                StatusCode::INTERNAL_SERVER_ERROR
            })?;
            Ok(Json(serde_json::json!({
                "lastInsertRowid": last_insert_rowid,
                "changes": total_changes
            })))
        }
        "run" => {
            // If prefix is set (e.g. "BEGIN IMMEDIATE"), run it first via execute_batch
            if let Some(ref prefix_sql) = req.prefix {
                db.execute_batch(prefix_sql).map_err(|e| {
                    error!("store run prefix: {}", e);
                    StatusCode::INTERNAL_SERVER_ERROR
                })?;
            }
            let mut stmt = match db.prepare(&req.sql) {
                Ok(s) => s,
                Err(e) => {
                    warn!("store run prepare: {}", e);
                    return Ok(Json(serde_json::json!({"lastInsertRowid": 0, "changes": 0, "error": e.to_string()})));
                }
            };
            let params: Vec<rusqlite::types::Value> = req.params.iter().map(|v| match v {
                Value::Null => rusqlite::types::Value::Null,
                Value::Number(n) => {
                    if let Some(i) = n.as_i64() { rusqlite::types::Value::Integer(i) }
                    else { rusqlite::types::Value::Real(n.as_f64().unwrap_or(0.0)) }
                }
                Value::String(s) => rusqlite::types::Value::Text(s.clone()),
                _ => rusqlite::types::Value::Null,
            }).collect();
            let params_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p as &dyn rusqlite::types::ToSql).collect();
            let info = stmt.insert(&params_refs[..]).or_else(|_| {
                stmt.execute(&params_refs[..]).map(|n| n as i64)
            }).map_err(|e| {
                error!("store run: {}", e);
                StatusCode::INTERNAL_SERVER_ERROR
            })?;
            Ok(Json(serde_json::json!({
                "lastInsertRowid": info as i64,
                "changes": db.changes() as i64
            })))
        }
        "get" => {
            let mut stmt = match db.prepare(&req.sql) {
                Ok(s) => s,
                Err(e) => {
                    warn!("store get prepare: {}", e);
                    return Ok(Json(serde_json::Value::Null));
                }
            };
            let params: Vec<rusqlite::types::Value> = req.params.iter().map(|v| match v {
                Value::Null => rusqlite::types::Value::Null,
                Value::Number(n) => {
                    if let Some(i) = n.as_i64() { rusqlite::types::Value::Integer(i) }
                    else { rusqlite::types::Value::Real(n.as_f64().unwrap_or(0.0)) }
                }
                Value::String(s) => rusqlite::types::Value::Text(s.clone()),
                _ => rusqlite::types::Value::Null,
            }).collect();
            let params_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p as &dyn rusqlite::types::ToSql).collect();
            let result = stmt.query_row(&params_refs[..], |row| {
                let col_count = row.as_ref().column_count();
                let mut map = serde_json::Map::new();
                for i in 0..col_count {
                    let name = row.as_ref().column_name(i).unwrap_or("?").to_string();
                    let val: rusqlite::types::Value = row.get(i).unwrap_or(rusqlite::types::Value::Null);
                    map.insert(name, value_to_json(val));
                }
                Ok(serde_json::Value::Object(map))
            }).optional().map_err(|e| {
                error!("store get: {}", e);
                StatusCode::INTERNAL_SERVER_ERROR
            })?;
            Ok(Json(result.unwrap_or(serde_json::Value::Null)))
        }
        "all" => {
            let mut stmt = match db.prepare(&req.sql) {
                Ok(s) => s,
                Err(e) => {
                    warn!("store all prepare: {}", e);
                    return Ok(Json(serde_json::Value::Array(vec![])));
                }
            };
            let params: Vec<rusqlite::types::Value> = req.params.iter().map(|v| match v {
                Value::Null => rusqlite::types::Value::Null,
                Value::Number(n) => {
                    if let Some(i) = n.as_i64() { rusqlite::types::Value::Integer(i) }
                    else { rusqlite::types::Value::Real(n.as_f64().unwrap_or(0.0)) }
                }
                Value::String(s) => rusqlite::types::Value::Text(s.clone()),
                _ => rusqlite::types::Value::Null,
            }).collect();
            let params_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p as &dyn rusqlite::types::ToSql).collect();
            let rows = stmt.query_map(&params_refs[..], |row| {
                let col_count = row.as_ref().column_count();
                let mut map = serde_json::Map::new();
                for i in 0..col_count {
                    let name = row.as_ref().column_name(i).unwrap_or("?").to_string();
                    let val: rusqlite::types::Value = row.get(i).unwrap_or(rusqlite::types::Value::Null);
                    map.insert(name, value_to_json(val));
                }
                Ok(serde_json::Value::Object(map))
            }).map_err(|e| {
                error!("store all: {}", e);
                StatusCode::INTERNAL_SERVER_ERROR
            })?;
            let result: Vec<serde_json::Value> = rows.filter_map(|r| r.ok()).collect();
            Ok(Json(serde_json::Value::Array(result)))
        }
        "exec" => {
            info!("store exec: {:.100}", req.sql);
            if let Err(e) = db.execute_batch(&req.sql) {
                warn!("store exec: {}", e);
                return Ok(Json(serde_json::json!({"ok": false, "error": e.to_string()})));
            }
            Ok(Json(serde_json::json!({"ok": true})))
        }
        _ => Err(StatusCode::BAD_REQUEST),
    }
}

fn value_to_json(v: rusqlite::types::Value) -> serde_json::Value {
    match v {
        rusqlite::types::Value::Null => serde_json::Value::Null,
        rusqlite::types::Value::Integer(i) => serde_json::Value::Number((i).into()),
        rusqlite::types::Value::Real(f) => serde_json::json!(f),
        rusqlite::types::Value::Text(s) => serde_json::Value::String(s),
        rusqlite::types::Value::Blob(b) => serde_json::Value::Array(b.iter().map(|&x| serde_json::Value::Number(x.into())).collect()),
    }
}

////////////////////////////////////////////////////////////////////////////////
// Design Hub — real project catalog (EEZ + HVAC disk storage)
////////////////////////////////////////////////////////////////////////////////

#[derive(Debug, Serialize)]
struct EezProjectEntry {
    folder: String,
    name: String,
    file_path: String,
    lvgl_version: Option<String>,
    size: u64,
    modified: u64,
    pages: Option<usize>,
    widgets: Option<usize>,
}

#[derive(Debug, Serialize)]
struct EezProjectsResponse {
    projects: Vec<EezProjectEntry>,
}

/// The HVAC drawings root — sibling of `t3-eez` under `T3Web`
/// (e.g. `<cwd>/T3Web/t3-hvac`).
fn hvac_root() -> PathBuf {
    let mut root = data_root();
    if let Some(parent) = root.parent() {
        root = parent.to_path_buf();
    }
    root.join("t3-hvac")
}

/// Restrict a drawing id to a safe folder/file name.
fn sanitize_id(id: &str) -> String {
    id.chars()
        .map(|c| {
            if c.is_alphanumeric() || c == '-' || c == '_' || c == '.' || c == ' ' {
                c
            } else {
                '_'
            }
        })
        .collect()
}

fn unix_secs(meta: &std::fs::Metadata) -> u64 {
    meta.modified()
        .ok()
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

/// List real EEZ/LVGL projects on disk under `<data_root>/project/`.
async fn list_eez_projects() -> Json<EezProjectsResponse> {
    let project_root = data_root().join("project");
    let mut projects = Vec::new();
    if let Ok(mut dir) = fs::read_dir(&project_root).await {
        while let Ok(Some(entry)) = dir.next_entry().await {
            let Ok(ft) = entry.file_type().await else { continue };
            if !ft.is_dir() {
                continue;
            }
            let folder = entry.file_name().into_string().unwrap_or_default();
            let folder_path = entry.path();

            // Preferred: <folder>/<folder>.eez-project; fallback: first *.eez-project
            let mut project_file: Option<PathBuf> = None;
            let expected = folder_path.join(format!("{}.eez-project", folder));
            if fs::metadata(&expected).await.is_ok() {
                project_file = Some(expected);
            } else if let Ok(mut fd) = fs::read_dir(&folder_path).await {
                while let Ok(Some(fe)) = fd.next_entry().await {
                    if fe.file_name().to_string_lossy().ends_with(".eez-project") {
                        project_file = Some(fe.path());
                        break;
                    }
                }
            }

            if let Some(pf) = project_file {
                let name = pf
                    .file_stem()
                    .map(|s| s.to_string_lossy().to_string())
                    .unwrap_or_else(|| folder.clone());

                let mut lvgl_version: Option<String> = None;
                let mut pages: Option<usize> = None;
                let mut widgets: Option<usize> = None;
                if let Ok(content) = fs::read_to_string(&pf).await {
                    if let Ok(json) = serde_json::from_str::<Value>(&content) {
                        lvgl_version = json
                            .pointer("/settings/general/lvglVersion")
                            .and_then(|v| v.as_str())
                            .map(|s| s.to_string());
                        pages = json
                            .pointer("/userPages")
                            .and_then(|v| v.as_array())
                            .map(|a| a.len());
                        widgets = json
                            .pointer("/userWidgets")
                            .and_then(|v| v.as_array())
                            .map(|a| a.len());
                    }
                }

                let meta = fs::metadata(&pf).await.ok().map(std::fs::Metadata::from);
                let size = meta.as_ref().map(|m| m.len()).unwrap_or(0);
                let modified = meta.as_ref().map(unix_secs).unwrap_or(0);

                let rel = pf
                    .strip_prefix(&data_root())
                    .unwrap_or(pf.as_path())
                    .to_string_lossy()
                    .replace('\\', "/");

                projects.push(EezProjectEntry {
                    folder,
                    name,
                    file_path: rel,
                    lvgl_version,
                    size,
                    modified,
                    pages,
                    widgets,
                });
            }
        }
    }
    projects.sort_by(|a, b| b.modified.cmp(&a.modified));
    Json(EezProjectsResponse { projects })
}

#[derive(Debug, Serialize)]
struct HvacDrawingEntry {
    id: String,
    name: String,
    updated_at: u64,
    size: u64,
}

#[derive(Debug, Serialize)]
struct HvacDrawingsResponse {
    drawings: Vec<HvacDrawingEntry>,
}

/// List HVAC drawings saved on disk under `<T3Web>/t3-hvac/<id>/<id>.json`.
async fn list_hvac_drawings() -> Json<HvacDrawingsResponse> {
    let root = hvac_root();
    let mut drawings = Vec::new();
    if let Ok(mut dir) = fs::read_dir(&root).await {
        while let Ok(Some(entry)) = dir.next_entry().await {
            let Ok(ft) = entry.file_type().await else { continue };
            if !ft.is_dir() {
                continue;
            }
            let id = entry.file_name().into_string().unwrap_or_default();
            let file = entry.path().join(format!("{}.json", id));
            if fs::metadata(&file).await.is_err() {
                continue;
            }
            let mut name = id.clone();
            if let Ok(content) = fs::read_to_string(&file).await {
                if let Ok(json) = serde_json::from_str::<Value>(&content) {
                    if let Some(n) = json.get("name").and_then(|v| v.as_str()) {
                        name = n.to_string();
                    }
                }
            }
            let meta = fs::metadata(&file).await.ok().map(std::fs::Metadata::from);
            let size = meta.as_ref().map(|m| m.len()).unwrap_or(0);
            let updated_at = meta.as_ref().map(unix_secs).unwrap_or(0);
            drawings.push(HvacDrawingEntry {
                id,
                name,
                updated_at,
                size,
            });
        }
    }
    drawings.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
    Json(HvacDrawingsResponse { drawings })
}

/// Read a single HVAC drawing JSON.
async fn get_hvac_drawing(Path(id): Path<String>) -> Result<axum::response::Response, StatusCode> {
    let safe = sanitize_id(&id);
    let file = hvac_root().join(&safe).join(format!("{}.json", safe));
    match fs::read_to_string(&file).await {
        Ok(content) => Ok(axum::response::Response::builder()
            .header("Content-Type", "application/json")
            .body(axum::body::Body::from(content))
            .unwrap()),
        Err(_) => Err(StatusCode::NOT_FOUND),
    }
}

/// Save an HVAC drawing to disk (`<id>/<id>.json`).
async fn put_hvac_drawing(Path(id): Path<String>, body: String) -> Result<StatusCode, StatusCode> {
    let safe = sanitize_id(&id);
    let dir = hvac_root().join(&safe);
    if let Err(e) = fs::create_dir_all(&dir).await {
        error!("put_hvac_drawing mkdir failed: {} — {:?}", dir.display(), e);
        return Err(StatusCode::INTERNAL_SERVER_ERROR);
    }
    let file = dir.join(format!("{}.json", safe));
    match fs::write(&file, &body).await {
        Ok(_) => {
            info!("put_hvac_drawing: {} ({} chars)", file.display(), body.len());
            Ok(StatusCode::OK)
        }
        Err(e) => {
            error!("put_hvac_drawing write failed: {} — {:?}", file.display(), e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

/// Delete an HVAC drawing folder.
async fn delete_hvac_drawing(Path(id): Path<String>) -> Result<StatusCode, StatusCode> {
    let dir = hvac_root().join(sanitize_id(&id));
    match fs::remove_dir_all(&dir).await {
        Ok(_) => {
            info!("delete_hvac_drawing: {}", dir.display());
            Ok(StatusCode::OK)
        }
        Err(e) => {
            if e.kind() == std::io::ErrorKind::NotFound {
                Ok(StatusCode::OK)
            } else {
                error!("delete_hvac_drawing failed: {} — {:?}", dir.display(), e);
                Err(StatusCode::INTERNAL_SERVER_ERROR)
            }
        }
    }
}

////////////////////////////////////////////////////////////////////////////////
// Router
////////////////////////////////////////////////////////////////////////////////

pub fn bridge_routes(router: Router<T3AppState>) -> Router<T3AppState> {
    info!("bridge_api: registering /api/eez-studio/* routes");
    router
        .route("/api/eez-studio/health", get(health))
        .route("/api/eez-studio/exec", post(exec_command))
        .route("/api/eez-studio/detect-python", get(detect_python))
        .route("/api/eez-studio/show-item-in-folder", post(show_item_in_folder))
        .route("/api/eez-studio/pick-open-file", post(pick_open_file))
        .route("/api/eez-studio/pick-save-file", post(pick_save_file))
        .route("/api/eez-studio/pick-directory", post(pick_directory))
        .route("/api/eez-studio/vacuum-database", post(vacuum_database))
        .route("/api/eez-studio/read-text-file", get(read_text_file))
        .route("/api/eez-studio/read-file", get(read_file))
        .route("/api/eez-studio/write-file", post(write_file))
        .route("/api/eez-studio/write-text-file", post(write_text_file))
        .route("/api/eez-studio/make-folder", post(make_folder))
        .route("/api/eez-studio/file-exists", get(file_exists))
        .route("/api/eez-studio/delete-file", delete(delete_file))
        .route("/api/eez-studio/list-files", get(list_files))
        .route("/api/eez-studio/list-files-detailed", get(list_files_detailed))
        .route("/api/eez-studio/file-size", get(file_size))
        .route("/api/eez-studio/stat", get(stat_file))
        .route("/api/eez-studio/is-directory", get(is_directory))
        .route("/api/eez-studio/delete-recursive", delete(delete_recursive))
        .route("/api/eez-studio/proxy-fetch", get(proxy_fetch))
        .route("/api/eez-studio/proxy-fetch-binary", get(proxy_fetch_binary))
        // Device REST proxy — forwards EEZ device calls through this server to
        // avoid browser CORS (the ESP32 device sends no Access-Control-* headers).
        .route("/api/device-rest/:device_ip/*path", any(proxy_device_rest))
        .route("/api/eez-studio/extract-font", post(extract_font))
        .route("/api/eez-studio/store", post(store_handler))
        // Design Hub — real project catalog
        .route("/api/eez-studio/projects", get(list_eez_projects))
        // HVAC drawings disk persistence (<T3Web>/t3-hvac/<id>/<id>.json)
        .route("/api/design-hub/hvac-drawings", get(list_hvac_drawings))
        .route("/api/design-hub/hvac-drawings/:id", get(get_hvac_drawing))
        .route("/api/design-hub/hvac-drawings/:id", put(put_hvac_drawing))
        .route("/api/design-hub/hvac-drawings/:id", delete(delete_hvac_drawing))
        // Mock BACnet device API — simulates ESP32 REST + BACnet fallback
        // Device info summary (lightweight metadata before fetching screens)
        .route("/api/eez-device/device/info", get(bacnet_api_mock::get_device_info))
        // Device list (for "Import from Device" UI)
        .route("/api/eez-device/devices", get(bacnet_api_mock::list_devices))
        // Image/bitmap transfer (images sent separately from screen JSON)
        .route("/api/eez-device/images/push", post(bacnet_api_mock::push_image))
        .route("/api/eez-device/images/push/:panelId", post(bacnet_api_mock::push_image))
        .route("/api/eez-device/images/pull/*rest", get(bacnet_api_mock::pull_image))
        .route("/api/eez-device/images/*rest", delete(bacnet_api_mock::delete_image))
        // Specific routes (push/pull) must register before wildcard (:name)
        .route("/api/eez-device/screens/push/:panelId", post(bacnet_api_mock::push_screens_bacnet))
        .route("/api/eez-device/screens/pull/:panelId", post(bacnet_api_mock::pull_screens_bacnet))
        .route("/api/eez-device/screens", get(bacnet_api_mock::get_screens))
        .route("/api/eez-device/screens", put(bacnet_api_mock::put_screens))
        .route("/api/eez-device/screens/:name", get(bacnet_api_mock::get_screen))
        .route("/api/eez-device/screens/:name", put(bacnet_api_mock::put_screen))
        .route("/api/eez-device/screens/:name", patch(bacnet_api_mock::patch_screen))
        .route("/api/eez-device/screens/:name/widgets/:widgetId", patch(bacnet_api_mock::patch_widget))
        .layer(axum::extract::DefaultBodyLimit::max(50 * 1024 * 1024)) // 50 MB — catalog JSON ~6 MB
}
