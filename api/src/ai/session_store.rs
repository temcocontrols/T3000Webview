// AI Chat — JSON-file session persistence.
//
// Sessions are stored as individual JSON files under T3Web/ai-assistant/,
// with an index.json listing all sessions (id, title, date, message count).
//
//      T3Web/ai-assistant/
//      ├── index.json              ← [{id, title, created_at, message_count}]
//      ├── a1b2c3d4.json           ← session messages
//      └── e5f6g7h8.json

use crate::constants::get_ai_sessions_path;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fs;
use std::io;
use std::path::PathBuf;

use super::mcp_client::McpServerConfig;
use super::types::Message;

// ── Persisted types ──

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionFile {
    pub id: String,
    pub title: String,
    pub created_at: String, // ISO 8601
    pub provider: String,
    pub model: String,
    pub messages: Vec<Message>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionIndexEntry {
    pub id: String,
    pub title: String,
    pub created_at: String,
    pub message_count: usize,
}

// ── Path helpers ──

fn sessions_dir() -> PathBuf {
    get_ai_sessions_path()
}

fn index_path() -> PathBuf {
    sessions_dir().join("index.json")
}

fn session_path(id: &str) -> PathBuf {
    sessions_dir().join(format!("{}.json", sanitize_id(id)))
}

fn sanitize_id(id: &str) -> String {
    id.chars()
        .filter(|c| c.is_alphanumeric() || *c == '-' || *c == '_')
        .collect()
}

// ── Public API ──

/// Ensure the sessions directory exists.
pub fn ensure_dir() -> io::Result<()> {
    fs::create_dir_all(sessions_dir())
}

/// Save a session to its JSON file and update the index.
pub fn save_session(session: &SessionFile) -> io::Result<()> {
    ensure_dir()?;

    let path = session_path(&session.id);
    let json = serde_json::to_string_pretty(session)
        .map_err(|e| io::Error::new(io::ErrorKind::Other, e))?;
    fs::write(&path, &json)?;
    tracing::info!("[AI] save_session id={} path={} bytes={}", session.id, path.display(), json.len());

    // Update index
    let mut index = load_index().unwrap_or_default();

    if let Some(entry) = index.iter_mut().find(|e| e.id == session.id) {
        entry.title = session.title.clone();
        entry.message_count = session.messages.len();
    } else {
        index.push(SessionIndexEntry {
            id: session.id.clone(),
            title: session.title.clone(),
            created_at: session.created_at.clone(),
            message_count: session.messages.len(),
        });
    }

    // Sort newest first
    index.sort_by(|a, b| b.created_at.cmp(&a.created_at));

    let index_json = serde_json::to_string_pretty(&index)
        .map_err(|e| io::Error::new(io::ErrorKind::Other, e))?;
    fs::write(index_path(), &index_json)?;

    Ok(())
}

/// Load a single session by ID.
pub fn load_session(id: &str) -> io::Result<Option<SessionFile>> {
    let path = session_path(id);
    tracing::info!("[AI] load_session id={} path={}", id, path.display());
    if !path.exists() {
        tracing::warn!("[AI] load_session NOT FOUND at {}", path.display());
        return Ok(None);
    }
    let json = fs::read_to_string(&path)?;
    let session = serde_json::from_str(&json)
        .map_err(|e| io::Error::new(io::ErrorKind::Other, e))?;
    Ok(Some(session))
}

/// Delete a session file and remove from index.
pub fn delete_session(id: &str) -> io::Result<()> {
    let path = session_path(id);
    if path.exists() {
        fs::remove_file(&path)?;
    }

    let mut index = load_index().unwrap_or_default();
    index.retain(|e| e.id != id);
    let index_json = serde_json::to_string_pretty(&index)
        .map_err(|e| io::Error::new(io::ErrorKind::Other, e))?;
    fs::write(index_path(), &index_json)?;

    Ok(())
}

/// Load the index (list of all sessions).
pub fn load_index() -> io::Result<Vec<SessionIndexEntry>> {
    let path = index_path();
    if !path.exists() {
        return Ok(vec![]);
    }
    let json = fs::read_to_string(&path)?;
    let index: Vec<SessionIndexEntry> = serde_json::from_str(&json)
        .map_err(|e| io::Error::new(io::ErrorKind::Other, e))?;
    Ok(index)
}

/// Generate an auto-title from the first user message.
pub fn auto_title(first_user_message: &str) -> String {
    let trimmed = first_user_message.trim();
    if trimmed.len() <= 50 {
        trimmed.to_string()
    } else {
        format!("{}…", &trimmed[..50])
    }
}

// ── MCP Servers config ──

fn mcp_servers_path() -> PathBuf {
    sessions_dir().join("mcp-servers.json")
}

pub fn load_mcp_servers() -> io::Result<Vec<McpServerConfig>> {
    let path = mcp_servers_path();
    if !path.exists() {
        return Ok(vec![]);
    }
    let json = fs::read_to_string(&path)?;
    serde_json::from_str(&json).map_err(|e| io::Error::new(io::ErrorKind::Other, e))
}

pub fn save_mcp_servers(configs: &[McpServerConfig]) -> io::Result<()> {
    ensure_dir()?;
    let json = serde_json::to_string_pretty(configs)
        .map_err(|e| io::Error::new(io::ErrorKind::Other, e))?;
    fs::write(mcp_servers_path(), &json)
}

// ── AI Settings ──

fn ai_settings_path() -> PathBuf {
    sessions_dir().join("settings.json")
}

pub fn save_ai_settings(settings: &Value) -> io::Result<()> {
    ensure_dir()?;
    let json = serde_json::to_string_pretty(settings)
        .map_err(|e| io::Error::new(io::ErrorKind::Other, e))?;
    fs::write(ai_settings_path(), &json)
}

pub fn load_ai_settings() -> io::Result<Value> {
    let path = ai_settings_path();
    if !path.exists() {
        return Err(io::Error::new(io::ErrorKind::NotFound, "No saved settings"));
    }
    let json = fs::read_to_string(&path)?;
    serde_json::from_str(&json).map_err(|e| io::Error::new(io::ErrorKind::Other, e))
}
