// AI Chat — Provider abstraction trait and dispatch.
//
// Each provider adapter converts the unified Message/ToolDef types
// into the provider-specific HTTP request format, streams the SSE
// response, and emits parsed StreamEvents via a channel sender.
//
// The route handler owns the tool-call loop — providers are stateless.

use async_trait::async_trait;
use serde_json::Value;

use super::types::{AiError, Message, StreamEvent};

pub mod local;
pub mod anthropic;
pub mod gemini;

/// Canonical tool definition (matches MCP ToolDef schema).
#[derive(Debug, Clone, serde::Serialize)]
pub struct ToolDef {
    pub name: String,
    pub description: String,
    pub input_schema: Value,
}

/// Trait implemented by each LLM provider adapter.
#[async_trait]
pub trait LlmProvider: Send + Sync {
    /// Stream a chat completion from the LLM.
    ///
    /// The provider handles the HTTP request + SSE parsing. It sends
    /// `StreamEvent::TextDelta` for text chunks and `StreamEvent::ToolCall`
    /// when the LLM requests a tool. The route handler intercepts tool
    /// calls, executes them locally, and re-invokes this method with
    /// updated messages.
    /// Returns Ok(Some(finish_reason)) on success — "stop", "length", "tool_calls", etc.
    async fn stream_chat(
        &self,
        endpoint: &str,
        api_key: Option<&str>,
        model: &str,
        messages: &[Message],
        tools: &[ToolDef],
        tx: &tokio::sync::mpsc::UnboundedSender<StreamEvent>,
    ) -> Result<Option<String>, AiError>;
}

/// Select the appropriate provider based on the provider key.
pub fn get_provider(provider: &str) -> Result<Box<dyn LlmProvider>, AiError> {
    match provider {
        "local" | "" => Ok(Box::new(local::LocalProvider)),
        "anthropic" => Ok(Box::new(anthropic::AnthropicProvider)),
        "gemini" => Ok(Box::new(gemini::GeminiProvider)),
        other => Err(AiError::Provider(format!(
            "Unknown provider '{}'. Supported: local, anthropic, gemini",
            other
        ))),
    }
}
