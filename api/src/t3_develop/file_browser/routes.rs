/**
 * File Browser Routes (Axum)
 *
 * Endpoints for browsing runtime folder structure
 */

use axum::{extract::Query, Json, http::StatusCode, response::IntoResponse};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileNode {
    pub name: String,
    pub path: String,
    pub is_directory: bool,
    pub size: Option<u64>,
    pub modified: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileContent {
    pub content: String,
    pub is_binary: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListFilesQuery {
    pub path: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReadFileQuery {
    pub path: String,
}

fn get_runtime_path() -> PathBuf {
    std::env::var("T3000_RUNTIME_PATH")
        .unwrap_or_else(|_| r"D:\T3000 Output\Debug".to_string())
        .into()
}

/// List files and directories in a path
pub async fn list_files(Query(query): Query<ListFilesQuery>) -> impl IntoResponse {
    let base_path = get_runtime_path();
    let target_path = if let Some(ref path) = query.path {
        base_path.join(path)
    } else {
        base_path.clone()
    };

    // Security: Ensure path is within runtime folder
    let canonical_target = match target_path.canonicalize() {
        Ok(p) => p,
        Err(_) => return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
            "error": "Invalid path"
        }))),
    };

    let canonical_base = match base_path.canonicalize() {
        Ok(p) => p,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
            "error": "Runtime path not found"
        }))),
    };

    if !canonical_target.starts_with(&canonical_base) {
        return (StatusCode::FORBIDDEN, Json(serde_json::json!({
            "error": "Access denied"
        })));
    }

    // Read directory
    let entries = match fs::read_dir(&canonical_target) {
        Ok(e) => e,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
            "error": format!("Failed to read directory: {}", e)
        }))),
    };

    let mut files = Vec::new();
    for entry in entries.filter_map(Result::ok) {
        let path = entry.path();
        let metadata = entry.metadata().ok();

        let name = entry.file_name().to_string_lossy().to_string();
        let is_directory = metadata.as_ref().map(|m| m.is_dir()).unwrap_or(false);
        let size = metadata.as_ref().and_then(|m| if !m.is_dir() { Some(m.len()) } else { None });
        let modified = metadata.as_ref().and_then(|m| {
            m.modified().ok().and_then(|time| {
                let dt: chrono::DateTime<chrono::Utc> = time.into();
                Some(dt.to_rfc3339())
            })
        });

        files.push(FileNode {
            name,
            path: path.to_string_lossy().to_string(),
            is_directory,
            size,
            modified,
        });
    }

    // Sort: directories first, then files alphabetically
    files.sort_by(|a, b| {
        match (a.is_directory, b.is_directory) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        }
    });

    (StatusCode::OK, Json(serde_json::json!(files)))
}

/// Read file content
pub async fn read_file(Query(query): Query<ReadFileQuery>) -> impl IntoResponse {
    let base_path = get_runtime_path();
    let target_path = base_path.join(&query.path);

    // Security check
    let canonical_target = match target_path.canonicalize() {
        Ok(p) => p,
        Err(_) => return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
            "error": "Invalid path"
        }))),
    };

    let canonical_base = match base_path.canonicalize() {
        Ok(p) => p,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
            "error": "Runtime path not found"
        }))),
    };

    if !canonical_target.starts_with(&canonical_base) {
        return (StatusCode::FORBIDDEN, Json(serde_json::json!({
            "error": "Access denied"
        })));
    }

    // Read file
    let content_bytes = match fs::read(&canonical_target) {
        Ok(b) => b,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
            "error": format!("Failed to read file: {}", e)
        }))),
    };

    // Check if binary
    let is_binary = content_bytes.iter().take(512).any(|&b| b == 0);

    let content = if is_binary {
        format!("<Binary file, {} bytes>", content_bytes.len())
    } else {
        String::from_utf8_lossy(&content_bytes).to_string()
    };

    (StatusCode::OK, Json(serde_json::json!(FileContent {
        content,
        is_binary,
    })))
}
