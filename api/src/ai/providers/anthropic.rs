// AI Chat — Anthropic provider.
//
// Uses the Anthropic Messages API with SSE streaming.
// https://docs.anthropic.com/en/api/messages

use async_trait::async_trait;
use futures_util::StreamExt;
use reqwest::Client;
use serde_json::{json, Value};
use tokio::sync::mpsc::UnboundedSender;

use super::super::types::{AiError, Message, StreamEvent};
use super::{LlmProvider, ToolDef};

pub struct AnthropicProvider;

#[async_trait]
impl LlmProvider for AnthropicProvider {
    async fn stream_chat(
        &self,
        endpoint: &str,
        api_key: Option<&str>,
        model: &str,
        messages: &[Message],
        tools: &[ToolDef],
        tx: &UnboundedSender<StreamEvent>,
    ) -> Result<Option<String>, AiError> {
        let url = format!(
            "{}/messages",
            endpoint.trim_end_matches('/')
        );

        // Build Anthropic-format tools array
        let tools_json: Vec<Value> = tools
            .iter()
            .map(|t| {
                json!({
                    "name": t.name,
                    "description": t.description,
                    "input_schema": t.input_schema
                })
            })
            .collect();

        // Separate system message from conversation messages
        let mut system_prompt = String::new();
        let mut anthropic_msgs: Vec<Value> = Vec::new();

        for m in messages {
            if m.role == "system" {
                if !system_prompt.is_empty() {
                    system_prompt.push_str("\n\n");
                }
                system_prompt.push_str(&m.content);
                continue;
            }

            let mut content: Vec<Value> = Vec::new();

            // Add text content if present
            if !m.content.is_empty() {
                content.push(json!({"type": "text", "text": m.content}));
            }

            // Add tool calls if this is an assistant message with tool calls
            if m.role == "assistant" {
                if let Some(ref tcs) = m.tool_calls {
                    for tc in tcs {
                        content.push(json!({
                            "type": "tool_use",
                            "id": tc.id,
                            "name": tc.function.name,
                            "input": if tc.function.arguments.is_empty() {
                                json!({})
                            } else {
                                serde_json::from_str::<Value>(&tc.function.arguments)
                                    .unwrap_or(json!({}))
                            }
                        }));
                    }
                }
            }

            // Tool results
            if m.role == "tool" {
                let result_content = if let Ok(v) = serde_json::from_str::<Value>(&m.content) {
                    v
                } else {
                    json!({"result": m.content})
                };

                anthropic_msgs.push(json!({
                    "role": "user",
                    "content": [{
                        "type": "tool_result",
                        "tool_use_id": m.tool_call_id,
                        "content": result_content.to_string()
                    }]
                }));
                continue;
            }

            let role = match m.role.as_str() {
                "assistant" => "assistant",
                _ => "user",
            };

            anthropic_msgs.push(json!({
                "role": role,
                "content": content
            }));
        }

        let mut body = json!({
            "model": model,
            "max_tokens": 4096,
            "messages": anthropic_msgs,
            "stream": true,
        });

        if !system_prompt.is_empty() {
            body["system"] = json!(system_prompt);
        }
        if !tools_json.is_empty() {
            body["tools"] = json!(tools_json);
        }

        let client = Client::builder()
            .timeout(std::time::Duration::from_secs(300))
            .build()
            .map_err(|e| AiError::Provider(format!("Failed to build HTTP client: {}", e)))?;

        let key = api_key.unwrap_or("");
        // Initial call + one retry on transient connection failure (2 total).
        let attempts = 2;
        let mut response: Option<reqwest::Response> = None;
        let mut last_err: Option<AiError> = None;

        for attempt in 0..attempts {
            match client
                .post(&url)
                .header("Content-Type", "application/json")
                .header("x-api-key", key)
                .header("anthropic-version", "2023-06-01")
                .json(&body)
                .send()
                .await
            {
                Ok(r) => {
                    response = Some(r);
                    break;
                }
                Err(e) => {
                    tracing::warn!(
                        "[Anthropic] connect attempt {}/{} failed for {}: {}",
                        attempt + 1,
                        attempts,
                        url,
                        e
                    );
                    last_err = Some(AiError::Provider(format!(
                        "Failed to connect to Anthropic: {}",
                        e
                    )));
                    if attempt + 1 < attempts {
                        // Single retry — wait 500ms before it.
                        tokio::time::sleep(std::time::Duration::from_millis(500)).await;
                    }
                }
            }
        }

        let response = response.ok_or_else(|| {
            last_err.unwrap_or_else(|| {
                AiError::Provider("Failed to connect to Anthropic".to_string())
            })
        })?;

        let status = response.status();
        if !status.is_success() {
            let body_text = response.text().await.unwrap_or_default();
            return Err(AiError::Provider(format!(
                "Anthropic returned {}: {}",
                status, body_text
            )));
        }

        // Parse SSE stream
        let mut stream = response.bytes_stream();
        let mut buffer = String::new();
        let mut tool_id_buf: Option<String> = None;
        let mut tool_name_buf: Option<String> = None;
        let mut tool_args_buf: String = String::new();
        let mut in_tool_use = false;

        while let Some(chunk_result) = stream.next().await {
            let chunk = chunk_result
                .map_err(|e| AiError::Stream(format!("Stream read error: {}", e)))?;
            let chunk_str = String::from_utf8_lossy(&chunk);
            buffer.push_str(&chunk_str);

            // Normalize CRLF -> LF so the `\n\n` frame delimiter is found reliably.
            buffer = buffer.replace("\r\n", "\n");

            while let Some(pos) = buffer.find("\n\n") {
                let frame = buffer[..pos].to_string();
                buffer = buffer[pos + 2..].to_string();

                for line in frame.lines() {
                    let line = line.trim();
                    if line.is_empty() || !line.starts_with("data:") {
                        continue;
                    }
                    let data = line[5..].trim();
                    if data.is_empty() {
                        continue;
                    }
                    let parsed: Value = match serde_json::from_str(data) {
                        Ok(v) => v,
                        Err(_) => continue,
                    };

                    let event_type = parsed["type"].as_str().unwrap_or("");

                    match event_type {
                        "content_block_start" => {
                            if let Some(cb) = parsed.get("content_block") {
                                if cb["type"].as_str() == Some("tool_use") {
                                    in_tool_use = true;
                                    tool_id_buf = cb["id"].as_str().map(|s| s.to_string());
                                    tool_name_buf = cb["name"].as_str().map(|s| s.to_string());
                                    tool_args_buf.clear();
                                }
                            }
                        }
                        "content_block_delta" => {
                            if let Some(delta) = parsed.get("delta") {
                                if delta["type"].as_str() == Some("text_delta") {
                                    if let Some(text) = delta["text"].as_str() {
                                        let _ = tx.send(StreamEvent::TextDelta {
                                            content: text.to_string(),
                                        });
                                    }
                                } else if delta["type"].as_str() == Some("input_json_delta")
                                    && in_tool_use
                                {
                                    if let Some(partial) = delta["partial_json"].as_str() {
                                        tool_args_buf.push_str(partial);
                                    }
                                }
                            }
                        }
                        "content_block_stop" => {
                            if in_tool_use {
                                if let (Some(id), Some(name)) =
                                    (tool_id_buf.take(), tool_name_buf.take())
                                {
                                    let _ = tx.send(StreamEvent::ToolCall {
                                        id,
                                        name,
                                        arguments: std::mem::take(&mut tool_args_buf),
                                        thought_signature: None,
                                    });
                                }
                                in_tool_use = false;
                            }
                        }
                        "message_stop" => {
                            // Stream complete
                        }
                        _ => {}
                    }
                }
            }
        }

        // Flush any remaining tool call
        if in_tool_use {
            if let (Some(id), Some(name)) = (tool_id_buf.take(), tool_name_buf.take()) {
                let _ = tx.send(StreamEvent::ToolCall {
                    id,
                    name,
                    arguments: tool_args_buf,
                    thought_signature: None,
                });
            }
        }

        Ok(None)
    }
}
