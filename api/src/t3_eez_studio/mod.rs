//! Bridge API — file system operations for the EEZ Studio web frontend.
//! Replaces Node.js `fs` in the browser by routing through the Rust backend.

use axum::{
    extract::Query,
    http::StatusCode,
    routing::{delete, get, post},
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

////////////////////////////////////////////////////////////////////////////////
// Helpers
////////////////////////////////////////////////////////////////////////////////

/// Resolve a user-supplied path to an absolute path under T3Web/t3-eez
fn resolve_path(base: &str, user_path: &str) -> PathBuf {
    let cleaned = user_path.trim_start_matches('/').trim_start_matches('\\');
    PathBuf::from(base).join(cleaned)
}

fn data_root() -> PathBuf {
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
) -> Result<Vec<u8>, StatusCode> {
    let full_path = resolve_path(&data_root().to_string_lossy(), &q.path);
    match fs::read(&full_path).await {
        Ok(data) => Ok(data),
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
// Font extraction — runs lv_font_conv via Node.js child process
////////////////////////////////////////////////////////////////////////////////

#[derive(Debug, Deserialize)]
struct FontExtractRequest {
    args: Value,
    output: String,
}

async fn extract_font(
    Json(req): Json<FontExtractRequest>,
) -> Result<Json<Value>, StatusCode> {
    let script_path = std::env::current_dir()
        .unwrap_or_else(|_| PathBuf::from("."))
        .join("extract-font.mjs");

    if !script_path.exists() {
        error!("extract_font: script not found at {}", script_path.display());
        return Err(StatusCode::INTERNAL_SERVER_ERROR);
    }

    let input = serde_json::to_string(&serde_json::json!({
        "args": req.args,
        "output": req.output,
    })).map_err(|_| StatusCode::BAD_REQUEST)?;

    let mut child = Command::new("node")
        .arg(&script_path)
        .stdin(std::process::Stdio::piped())
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| {
            error!("extract_font: failed to spawn node: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    // Write input to stdin
    if let Some(ref mut stdin) = child.stdin {
        use std::io::Write;
        stdin.write_all(input.as_bytes()).map_err(|e| {
            error!("extract_font: failed to write stdin: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;
    }

    let result = child.wait_with_output().map_err(|e| {
        error!("extract_font: node process error: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    if !result.status.success() {
        let stderr = String::from_utf8_lossy(&result.stderr);
        error!("extract_font: node exited with {}: {}", result.status, stderr);
        // Try to parse error from stderr (might be JSON or plain text)
        if let Ok(err_val) = serde_json::from_str::<Value>(&stderr) {
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
        return Err(StatusCode::INTERNAL_SERVER_ERROR);
    }

    let stdout = String::from_utf8_lossy(&result.stdout);
    let parsed: Value = serde_json::from_str(&stdout).map_err(|e| {
        error!("extract_font: failed to parse output: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    Ok(Json(parsed))
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
        cmd.current_dir(cwd);
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
// Store — SQLite-backed persistence (replaces Electron's better-sqlite3)
////////////////////////////////////////////////////////////////////////////////

lazy_static::lazy_static! {
    static ref STORE_DB: Option<Mutex<rusqlite::Connection>> = {
        let db_path = data_root().join("storage.db");
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
// Router
////////////////////////////////////////////////////////////////////////////////

pub fn bridge_routes() -> Router<T3AppState> {
    info!("bridge_api: registering /api/eez-studio/* routes");
    Router::new()
        .route("/api/eez-studio/health", get(health))
        .route("/api/eez-studio/exec", post(exec_command))
        .route("/api/eez-studio/read-text-file", get(read_text_file))
        .route("/api/eez-studio/read-file", get(read_file))
        .route("/api/eez-studio/write-file", post(write_file))
        .route("/api/eez-studio/write-text-file", post(write_text_file))
        .route("/api/eez-studio/make-folder", post(make_folder))
        .route("/api/eez-studio/file-exists", get(file_exists))
        .route("/api/eez-studio/delete-file", delete(delete_file))
        .route("/api/eez-studio/list-files", get(list_files))
        .route("/api/eez-studio/file-size", get(file_size))
        .route("/api/eez-studio/is-directory", get(is_directory))
        .route("/api/eez-studio/proxy-fetch", get(proxy_fetch))
        .route("/api/eez-studio/proxy-fetch-binary", get(proxy_fetch_binary))
        .route("/api/eez-studio/extract-font", post(extract_font))
        .route("/api/eez-studio/store", post(store_handler))
        .layer(axum::extract::DefaultBodyLimit::max(50 * 1024 * 1024)) // 50 MB — catalog JSON ~6 MB
}
