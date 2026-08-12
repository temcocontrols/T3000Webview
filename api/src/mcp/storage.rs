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
        .join("T3Web")
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
