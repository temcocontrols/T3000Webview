//! Bridge API — file system operations for the EEZ Studio web frontend.
//! Replaces Node.js `fs` in the browser by routing through the Rust backend.

use axum::{
    extract::Query,
    http::StatusCode,
    routing::{delete, get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tokio::fs;
use tracing::{error, info};

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
    match fs::remove_file(&full_path).await {
        Ok(_) => {
            info!("delete_file: {}", full_path.display());
            Ok(StatusCode::OK)
        }
        Err(e) => {
            error!("delete_file failed: {} — {:?}", full_path.display(), e);
            if e.kind() == std::io::ErrorKind::NotFound {
                Ok(StatusCode::OK) // idempotent
            } else {
                Err(StatusCode::INTERNAL_SERVER_ERROR)
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
// Router
////////////////////////////////////////////////////////////////////////////////

pub fn bridge_routes() -> Router<T3AppState> {
    info!("bridge_api: registering /api/eez-studio/* routes");
    Router::new()
        .route("/api/eez-studio/health", get(health))
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
}
