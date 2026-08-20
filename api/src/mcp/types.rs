//! MCP (Model Context Protocol) — JSON-RPC 2.0 types and shared data structures.

use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;

// ═══ JSON-RPC Types ═══

#[derive(Debug, Deserialize)]
pub(crate) struct JsonRpcRequest {
    #[allow(dead_code)]
    pub(crate) jsonrpc: String,
    #[serde(default)]
    pub(crate) id: Option<Value>,
    pub(crate) method: String,
    #[serde(default)]
    pub(crate) params: Option<Value>,
}

#[derive(Debug, Serialize)]
pub(crate) struct JsonRpcResponse {
    pub(crate) jsonrpc: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(crate) id: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(crate) result: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(crate) error: Option<JsonRpcError>,
}

#[derive(Debug, Serialize)]
pub(crate) struct JsonRpcError {
    pub(crate) code: i32,
    pub(crate) message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(crate) data: Option<Value>,
}

// ═══ Session State ═══

/// MCP session tracking — one per connected client
#[derive(Debug, Clone)]
pub(crate) struct McpSession {
    #[allow(dead_code)]
    pub(crate) id: String,
    #[allow(dead_code)]
    pub(crate) created_at: String,
    pub(crate) initialized: bool,
}

/// Shared session store (in-memory, lost on restart)
pub(crate) type SessionStore = Arc<Mutex<HashMap<String, McpSession>>>;

// ═══ Tool Definition ═══

pub struct ToolDef {
    pub name: &'static str,
    pub title: &'static str,
    pub description: &'static str,
    pub input_schema: Value,
}
