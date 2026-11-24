//! File-based JSON storage for MCP tasks, memory, and device context.

use serde_json::{json, Value};
use std::path::PathBuf;

/// Base data directory for MCP persisted files.
pub fn data_dir() -> PathBuf {
    std::env::current_dir().unwrap_or_else(|_| PathBuf::from(".")).join("data")
}

pub fn tasks_file() -> PathBuf { data_dir().join("mcp_tasks.json") }
pub fn memory_file() -> PathBuf { data_dir().join("mcp_memory.json") }

pub fn current_device_file() -> PathBuf {
    std::env::current_dir()
        .unwrap_or_else(|_| PathBuf::from("."))
        .join(crate::constants::T3WEB_REL_DIR)
        .join("ai-assistant")
        .join("mcp_device_context.json")
}

pub async fn load_json_file(path: &PathBuf) -> Result<Value, String> {
    let content = tokio::fs::read_to_string(path).await.unwrap_or_else(|_| "[]".into());
    serde_json::from_str(&content).map_err(|e| format!("JSON parse error: {}", e))
}

pub async fn save_json_file(path: &PathBuf, data: &Value) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        tokio::fs::create_dir_all(parent).await.map_err(|e| format!("Cannot create dir: {}", e))?;
    }
    let json = serde_json::to_string_pretty(data).map_err(|e| format!("Serialize error: {}", e))?;
    tokio::fs::write(path, &json).await.map_err(|e| format!("Write error: {}", e))?;
    Ok(())
}

// ── Device context (single shared JSON object) ──

/// Serializes read-modify-write cycles on the device-context file.
///
/// Three independent writers update the same object: `POST
/// /api/mcp/current-device` (UI selection), `t3000_set_chat_device` (user
/// confirmation), and every tool call that carries a `serial_number`. Without a
/// lock a writer that read the file before another write landed saves a stale
/// copy and silently drops the other's key.
static DEVICE_CONTEXT_LOCK: tokio::sync::Mutex<()> = tokio::sync::Mutex::const_new(());

/// Read the device context, apply `mutate`, and write it back — atomically with
/// respect to other `update_device_context` callers. Returns the stored object.
pub async fn update_device_context<F>(mutate: F) -> Result<Value, String>
where
    F: FnOnce(&mut Value),
{
    let _guard = DEVICE_CONTEXT_LOCK.lock().await;
    let path = current_device_file();
    let mut state = if path.exists() {
        load_json_file(&path).await.unwrap_or_else(|_| json!({}))
    } else {
        json!({})
    };
    if !state.is_object() {
        state = json!({});
    }
    mutate(&mut state);
    save_json_file(&path, &state).await?;
    Ok(state)
}

// ── Task helpers ──

pub async fn load_tasks() -> Result<Vec<Value>, String> {
    let v = load_json_file(&tasks_file()).await?;
    Ok(v.as_array().cloned().unwrap_or_default())
}

pub async fn save_tasks(tasks: &[Value]) -> Result<(), String> {
    save_json_file(&tasks_file(), &json!(tasks)).await
}

// ── Memory helpers ──

pub async fn load_memories() -> Result<Vec<Value>, String> {
    let v = load_json_file(&memory_file()).await?;
    Ok(v.as_array().cloned().unwrap_or_default())
}

pub async fn save_memories(memories: &[Value]) -> Result<(), String> {
    save_json_file(&memory_file(), &json!(memories)).await
}
