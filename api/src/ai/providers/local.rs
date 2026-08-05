// AI Chat — Local provider (OpenAI-compatible API).
//
// Handles Ollama, vLLM, LM Studio, llama.cpp — any server that exposes
// the OpenAI `/v1/chat/completions` endpoint with SSE streaming.

use async_trait::async_trait;
use futures_util::StreamExt;
use reqwest::Client;
use serde_json::{json, Value};
use tokio::sync::mpsc::UnboundedSender;

use super::super::types::{AiError, Message, StreamEvent};
use super::{LlmProvider, ToolDef};

pub struct LocalProvider;

#[async_trait]
impl LlmProvider for LocalProvider {
    async fn stream_chat(
        &self,
        endpoint: &str,
        api_key: Option<&str>,
        model: &str,
        messages: &[Message],
        tools: &[ToolDef],
        tx: &UnboundedSender<StreamEvent>,
    ) -> Result<(), AiError> {
        let url = format!("{}/chat/completions", endpoint.trim_end_matches('/'));

        // Build OpenAI-format tools array
        let tools_json: Vec<Value> = tools
            .iter()
            .map(|t| {
                json!({
                    "type": "function",
                    "function": {
                        "name": t.name,
                        "description": t.description,
                        "parameters": t.input_schema
                    }
                })
            })
            .collect();

        // Build messages array — filter out tool_call metadata that the
        // frontend may not send; only keep role + content for simplicity.
        let messages_json: Vec<Value> = messages
            .iter()
            .map(|m| {
                let mut obj = json!({
                    "role": m.role,
                    "content": m.content,
                });
                // If this is an assistant message with tool calls, include them
                if m.role == "assistant" {
                    if let Some(ref tcs) = m.tool_calls {
                        let openai_tool_calls: Vec<Value> = tcs
                            .iter()
                            .map(|tc| {
                                json!({
                                    "id": tc.id,
                                    "type": "function",
                                    "function": {
                                        "name": tc.function.name,
                                        "arguments": tc.function.arguments
                                    }
                                })
                            })
                            .collect();
                        obj["tool_calls"] = json!(openai_tool_calls);
                    }
                }
                // If this is a tool result message
                if m.role == "tool" {
                    obj["tool_call_id"] = json!(m.tool_call_id);
                }
                obj
            })
            .collect();

        let body = json!({
            "model": model,
            "messages": messages_json,
            "tools": tools_json,
            "stream": true,
        });

        // Build request with optional tool-fallback retry
        let client = Client::builder()
            .timeout(std::time::Duration::from_secs(300))
            .build()
            .map_err(|e| AiError::Provider(format!("Failed to build HTTP client: {}", e)))?;

        let mut req_builder = client
            .post(&url)
            .header("Content-Type", "application/json")
            .json(&body);

        if let Some(key) = api_key {
            if !key.is_empty() {
                req_builder = req_builder.header("Authorization", format!("Bearer {}", key));
            }
        }

        let request = req_builder.build().map_err(|e| {
            AiError::Provider(format!("Failed to build request: {}", e))
        })?;

        let response = client
            .execute(request.try_clone().unwrap_or(request))
            .await
            .map_err(|e| AiError::Provider(format!("Failed to connect to LLM at {}: {}", url, e)))?;

        let status = response.status();
        if !status.is_success() {
            let body_text = response.text().await.unwrap_or_default();
            // If tool parsing failed and we sent tools, retry without tools
            if !tools.is_empty()
                && (body_text.contains("parse tool") || body_text.contains("parse_error"))
            {
                tracing::info!("[AI] Tool parse error, retrying without tools. Model: {}", model);

                // Strip tool-related messages and simplify system prompt on retry
                let clean_messages: Vec<Value> = messages_json
                    .iter()
                    .filter(|m| {
                        let role = m["role"].as_str().unwrap_or("");
                        // Remove tool result messages and assistant messages with tool calls
                        role != "tool" && !(role == "assistant" && m.get("tool_calls").is_some())
                    })
                    .map(|m| {
                        let mut obj = m.clone();
                        // Simplify system prompt
                        if obj["role"] == "system" {
                            obj["content"] = json!("You are a helpful building automation assistant. Answer concisely.");
                        }
                        obj
                    })
                    .collect();

                let fallback_body = json!({
                    "model": model,
                    "messages": clean_messages,
                    "stream": true,
                });

                tracing::info!("[AI] Sending retry with {} clean messages (no tools)", clean_messages.len());

                let fallback_response = client
                    .post(&url)
                    .header("Content-Type", "application/json")
                    .json(&fallback_body)
                    .send()
                    .await
                    .map_err(|e| AiError::Provider(format!("Tool-less retry failed: {}", e)))?;

                let fb_status = fallback_response.status();
                if !fb_status.is_success() {
                    let fb_text = fallback_response.text().await.unwrap_or_default();
                    tracing::warn!("[AI] Retry without tools also failed: {} - {}", fb_status, fb_text);
                    return Err(AiError::Provider(format!(
                        "Model does not support tool calling. Try a different model or disable tools. ({})",
                        fb_status
                    )));
                }
                tracing::info!("[AI] Retry without tools succeeded");
                return Self::parse_sse_stream(fallback_response, tx).await;
            }
            return Err(AiError::Provider(format!(
                "LLM returned {}: {}",
                status, body_text
            )));
        }

        // Parse SSE stream
        Self::parse_sse_stream(response, tx).await
    }
}

impl LocalProvider {
    async fn parse_sse_stream(
        response: reqwest::Response,
        tx: &UnboundedSender<StreamEvent>,
    ) -> Result<(), AiError> {
        let mut stream = response.bytes_stream();
        let mut buffer = String::new();
        let mut tool_call_buf: Option<(String, String, String)> = None; // (id, name, args_acc)

        while let Some(chunk_result) = stream.next().await {
            let chunk = chunk_result.map_err(|e| {
                AiError::Stream(format!("Stream read error: {}", e))
            })?;

            let chunk_str = String::from_utf8_lossy(&chunk);
            buffer.push_str(&chunk_str);

            // Process complete SSE frames (separated by \n\n)
            while let Some(pos) = buffer.find("\n\n") {
                let frame = buffer[..pos].to_string();
                buffer = buffer[pos + 2..].to_string();

                for line in frame.lines() {
                    let line = line.trim();
                    if line.is_empty() || !line.starts_with("data: ") {
                        continue;
                    }

                    let data = &line[6..]; // Strip "data: " prefix
                    if data == "[DONE]" {
                        // Stream complete — send any pending tool call if valid
                        if let Some((id, name, args)) = tool_call_buf.take() {
                            if is_valid_tool_args(&args) {
                                let _ = tx.send(StreamEvent::ToolCall { id, name, arguments: args });
                            }
                        }
                        continue;
                    }

                    let parsed: Value = match serde_json::from_str(data) {
                        Ok(v) => v,
                        Err(_) => continue, // Skip unparseable lines
                    };

                    // Check for choices[0].delta
                    let delta = match parsed
                        .get("choices")
                        .and_then(|c| c.get(0))
                        .and_then(|c| c.get("delta"))
                    {
                        Some(d) => d,
                        None => continue,
                    };

                    // Emit both reasoning_content (thinking) and content (answer)
                    if let Some(t) = delta.get("reasoning_content").and_then(|c| c.as_str()) {
                        if !t.is_empty() {
                            let _ = tx.send(StreamEvent::TextDelta { content: t.to_string() });
                        }
                    }
                    if let Some(t) = delta.get("content").and_then(|c| c.as_str()) {
                        if !t.is_empty() {
                            let _ = tx.send(StreamEvent::TextDelta { content: t.to_string() });
                        }
                    }

                    // Tool call delta
                    if let Some(tool_calls) = delta.get("tool_calls").and_then(|tc| tc.as_array()) {
                        for tc in tool_calls {
                            let _tc_index = tc.get("index").and_then(|i| i.as_u64()).unwrap_or(0);
                            let tc_id = tc
                                .get("id")
                                .and_then(|i| i.as_str())
                                .unwrap_or("")
                                .to_string();

                            if let Some(func) = tc.get("function") {
                                let func_name = func
                                    .get("name")
                                    .and_then(|n| n.as_str())
                                    .unwrap_or("")
                                    .to_string();
                                let func_args = func
                                    .get("arguments")
                                    .and_then(|a| a.as_str())
                                    .unwrap_or("")
                                    .to_string();

                                if !tc_id.is_empty() && !func_name.is_empty() {
                                    // Start or update accumulating tool call
                                    tool_call_buf = Some((
                                        tc_id,
                                        func_name,
                                        format!(
                                            "{}{}",
                                            tool_call_buf
                                                .as_ref()
                                                .map(|(_, _, a)| a.as_str())
                                                .unwrap_or(""),
                                            func_args
                                        ),
                                    ));
                                }
                            }
                        }
                    }
                }
            }
        }

        // Flush any remaining tool call — validate JSON first
        if let Some((id, name, args)) = tool_call_buf.take() {
            if is_valid_tool_args(&args) {
                let _ = tx.send(StreamEvent::ToolCall { id, name, arguments: args });
            }
        }

        Ok(())
    }
}

/// Check that tool call arguments are valid JSON (or empty).
fn is_valid_tool_args(args: &str) -> bool {
    args.trim().is_empty() || serde_json::from_str::<Value>(args).is_ok()
}
