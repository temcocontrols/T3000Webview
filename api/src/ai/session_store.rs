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
use std::fs;
use std::io;
use std::path::PathBuf;

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

    let json = serde_json::to_string_pretty(session)
        .map_err(|e| io::Error::new(io::ErrorKind::Other, e))?;
    fs::write(session_path(&session.id), &json)?;

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
    if !path.exists() {
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
