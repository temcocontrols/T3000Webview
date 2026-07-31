// AI Chat — Shared types for LLM chat requests, SSE streaming events,
// session messages, and provider settings.

use serde::{Deserialize, Serialize};

// ═══ Request / Response Types ═══

/// Incoming chat request from the frontend.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatRequest {
    /// Provider key: "local", "anthropic", or "gemini".
    pub provider: String,
    /// Model name, e.g. "llama3.1:8b", "claude-3-5-sonnet-20241022".
    pub model: String,
    /// Conversation messages for this turn.
    pub messages: Vec<Message>,
    /// Optional session ID to resume an existing conversation.
    pub session_id: Option<String>,
    /// Optional provider settings (endpoint / api_key) — overrides stored defaults.
    pub settings: Option<AiSettings>,
}

/// A single conversation message.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub role: String,
    pub content: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_calls: Option<Vec<ToolCall>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_call_id: Option<String>,
}

/// A tool call requested by the LLM.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolCall {
    pub id: String,
    #[serde(rename = "type", default = "default_tool_type")]
    pub call_type: String,
    pub function: FunctionCall,
}

fn default_tool_type() -> String {
    "function".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FunctionCall {
    pub name: String,
    /// JSON-encoded arguments string.
    pub arguments: String,
}

/// Provider connection settings.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiSettings {
    pub endpoint: Option<String>,
    pub api_key: Option<String>,
}

// ═══ SSE Stream Events ═══

/// Events streamed back to the frontend via SSE.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "event", content = "data")]
pub enum StreamEvent {
    /// A chunk of streaming text.
    #[serde(rename = "text_delta")]
    TextDelta { content: String },
    /// The LLM has requested a tool call.
    #[serde(rename = "tool_call")]
    ToolCall {
        id: String,
        name: String,
        #[serde(rename = "args")]
        arguments: String,
    },
    /// The result of a locally-executed tool.
    #[serde(rename = "tool_result")]
    ToolResult { id: String, result: String },
    /// The turn is complete.
    #[serde(rename = "done")]
    Done { session_id: String },
    /// A fatal error occurred.
    #[serde(rename = "error")]
    Error { message: String },
}

impl StreamEvent {
    /// Serialize to a single `data: {...}\n\n` SSE frame.
    pub fn to_sse_frame(&self) -> String {
        match serde_json::to_string(self) {
            Ok(json) => format!("data: {}\n\n", json),
            Err(e) => format!(
                "data: {{\"event\":\"error\",\"data\":{{\"message\":\"Serialization error: {}\"}}}}\n\n",
                e
            ),
        }
    }
}

// ═══ AI Error ═══

#[derive(Debug, thiserror::Error)]
pub enum AiError {
    #[error("Unknown tool: {0}")]
    UnknownTool(String),

    #[error("Provider error: {0}")]
    Provider(String),

    #[error("Session not found: {0}")]
    SessionNotFound(String),

    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),

    #[error("HTTP error: {0}")]
    Http(#[from] reqwest::Error),

    #[error("Stream error: {0}")]
    Stream(String),

    #[error("Tool execution error: {0}")]
    ToolExecution(String),

    #[error("No provider configured")]
    NoProvider,
}
