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

/// Cap on the connection phase (DNS + TCP + TLS) for every provider.
///
/// Without it a blackholed endpoint silently burns the OS TCP timeout
/// (~170 s on Windows) per attempt, and the UI shows "Thinking…" for minutes
/// before any error appears.
pub const CONNECT_TIMEOUT: std::time::Duration = std::time::Duration::from_secs(8);

/// Hard cap on obtaining the response *headers* for a cloud endpoint. The body
/// stream is not covered, so long generations are unaffected.
pub const SEND_TIMEOUT: std::time::Duration = std::time::Duration::from_secs(25);

/// Same cap for a local model server, but generous: llama.cpp / Ollama only
/// send headers after prompt processing, which is slow on CPU with a long
/// context. A dead local port still fails instantly (connection refused).
pub const LOCAL_SEND_TIMEOUT: std::time::Duration = std::time::Duration::from_secs(120);

/// True when the endpoint lives on this machine or on the local network
/// (loopback, `.local`, or an RFC1918 / link-local address).
///
/// Such an address must be reached **directly**: the machine's system proxy
/// (corporate proxy, VPN/accelerator such as `127.0.0.1:7892`, ...) cannot serve
/// a LAN host and answers `502 Bad Gateway` with an empty body — which surfaced
/// as "the LLM server may be down" while `curl` to the same URL worked.
///
/// Public endpoints return `false`, so they keep using the system proxy exactly
/// as before; on a machine without a proxy the bypass changes nothing.
pub fn is_local_endpoint(url: &str) -> bool {
    let lower = url.trim().to_ascii_lowercase();
    let after_scheme = lower.split("://").nth(1).unwrap_or(&lower);
    let host_port = after_scheme.split('/').next().unwrap_or(after_scheme);
    // Drop any `user:pass@` prefix.
    let host_port = host_port.rsplit('@').next().unwrap_or(host_port);

    // IPv6 literal, e.g. `[::1]:8080`.
    if let Some(rest) = host_port.strip_prefix('[') {
        return rest.starts_with("::1]") || rest.starts_with("fd") || rest.starts_with("fe80");
    }

    let host = host_port.split(':').next().unwrap_or(host_port);
    if host == "localhost" || host.ends_with(".local") || host == "0.0.0.0" {
        return true;
    }

    let octets: Vec<u8> = host.split('.').filter_map(|p| p.parse::<u8>().ok()).collect();
    if host.split('.').count() == 4 && octets.len() == 4 {
        return octets[0] == 127                                   // 127.0.0.0/8
            || octets[0] == 10                                    // 10.0.0.0/8
            || (octets[0] == 172 && (16..=31).contains(&octets[1])) // 172.16.0.0/12
            || (octets[0] == 192 && octets[1] == 168)              // 192.168.0.0/16
            || (octets[0] == 169 && octets[1] == 254);             // link-local
    }

    false
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn loopback_and_lan_endpoints_are_local() {
        assert!(is_local_endpoint("http://127.0.0.1:1200/v1"));
        assert!(is_local_endpoint("http://localhost:11434/v1"));
        assert!(is_local_endpoint("http://192.168.1.22:1027/v1"));
        assert!(is_local_endpoint("http://10.0.0.5:8080/v1"));
        assert!(is_local_endpoint("http://172.16.4.9:8080/v1"));
        assert!(is_local_endpoint("http://172.31.4.9:8080/v1"));
        assert!(is_local_endpoint("http://169.254.1.1/v1"));
        assert!(is_local_endpoint("http://[::1]:8080/v1"));
        assert!(is_local_endpoint("http://modelbox.local:8080/v1"));
        assert!(is_local_endpoint("http://user:pass@192.168.1.22:1027/v1"));
    }

    #[test]
    fn public_endpoints_are_not_local() {
        assert!(!is_local_endpoint("https://generativelanguage.googleapis.com/v1beta"));
        assert!(!is_local_endpoint("https://api.anthropic.com/v1"));
        assert!(!is_local_endpoint("http://172.32.4.9:8080/v1"));
        assert!(!is_local_endpoint("http://8.8.8.8/v1"));
        assert!(!is_local_endpoint("https://llm.example.com/v1"));
    }
}

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
