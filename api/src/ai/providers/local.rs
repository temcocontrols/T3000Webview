// AI Chat — Local provider (OpenAI-compatible API).
//
// Handles Ollama, vLLM, LM Studio, llama.cpp — any server that exposes
// the OpenAI `/v1/chat/completions` endpoint with SSE streaming.

use async_trait::async_trait;
use futures_util::StreamExt;
use reqwest::Client;
use serde_json::{json, Value};
use std::time::Instant;
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
    ) -> Result<Option<String>, AiError> {
        let url = format!("{}/chat/completions", endpoint.trim_end_matches('/'));
        tracing::info!("[Local] Request to {} model={} msgs={} tools={}", url, model, messages.len(), tools.len());

        // Build messages with tool calls preserved
        let messages_json: Vec<Value> = messages
            .iter()
            .map(|m| {
                let mut obj = json!({
                    "role": m.role,
                    "content": m.content,
                });
                if m.role == "assistant" {
                    if let Some(ref tcs) = m.tool_calls {
                        let openai_tool_calls: Vec<Value> = tcs.iter().map(|tc| {
                            json!({
                                "id": tc.id, "type": "function",
                                "function": { "name": tc.function.name, "arguments": tc.function.arguments }
                            })
                        }).collect();
                        obj["tool_calls"] = json!(openai_tool_calls);
                    }
                }
                if m.role == "tool" {
                    obj["tool_call_id"] = json!(m.tool_call_id);
                }
                obj
            })
            .collect();
        // DO NOT strip tools for local models.
        // Qwen with peg-native format DOES produce tool_calls via grammar.
        // Verified via raw SSE capture — server emits tool_calls deltas.
        let tools_json: Vec<Value> = tools.iter().map(|t| {
            json!({ "type": "function", "function": { "name": t.name, "description": t.description, "parameters": t.input_schema } })
        }).collect();

        let mut body = json!({
            "model": model, "messages": messages_json, "stream": true,
            "stream_options": { "include_usage": true },
        });
        if !tools_json.is_empty() {
            body["tools"] = json!(tools_json);
        }
        // (tools count already in request log above)

        let client = Client::builder()
            .timeout(std::time::Duration::from_secs(300))
            .http1_only()
            .user_agent("T3000-MCP/1.0")
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

        let response = req_builder
            .send()
            .await
            .map_err(|e| AiError::Provider(format!("Failed to connect: {}", e)))?;

        let status = response.status();
        tracing::info!("[Local] Response: {}", status);
        if !status.is_success() {
            let text = response.text().await.unwrap_or_default();
            let truncated = if text.len() > 500 { format!("{}... ({} chars)", &text[..500], text.len()) } else { text.clone() };
            tracing::error!("[Local] LLM error response ({}): {}", status, truncated);
            return Err(AiError::Provider(format!("LLM {}: {}", status, truncated)));
        }

        tracing::info!("[Local] Starting SSE stream parse");
        let result = Self::parse_and_collect(response, tx).await?;
        Ok(Some(result.2))
    }
}

impl LocalProvider {
    async fn parse_and_collect(
        resp: reqwest::Response,
        tx: &UnboundedSender<StreamEvent>,
    ) -> Result<(String, String, String), AiError> {
        let mut stream = resp.bytes_stream();
        let mut buffer = String::new();
        let mut tool_call_buf: Option<(String, String, String)> = None;
        let mut full_text = String::new();
        let mut full_reasoning = String::new();
        let mut content_count = 0u64;
        let mut reasoning_count = 0u64;
        let mut tool_call_count = 0u64;
        let mut frame_count = 0u64;
        let mut finish_reason = "stop".to_string();
        let thinking_start = Instant::now();
        let mut thinking_ended = false;
        // Buffer for content that arrives before tool calls (models without native reasoning)
        let mut pre_tool_content: Vec<String> = Vec::new();
        let mut has_tool_calls = false;

        while let Some(chunk_result) = stream.next().await {
            let chunk = chunk_result.map_err(|e| {
                AiError::Stream(format!("Stream read error: {}", e))
            })?;

            let chunk_str = String::from_utf8_lossy(&chunk);
            buffer.push_str(&chunk_str);

            while let Some(pos) = buffer.find("\n\n") {
                let frame = buffer[..pos].to_string();
                buffer = buffer[pos + 2..].to_string();
                frame_count += 1;

                for line in frame.lines() {
                    let line = line.trim();
                    if line.is_empty() || !line.starts_with("data: ") {
                        continue;
                    }

                    let data = &line[6..];
                    if data == "[DONE]" {
                        if let Some((id, name, args)) = tool_call_buf.take() {
                            if is_valid_tool_args(&args) {
                                let _ = tx.send(StreamEvent::ToolCall { id, name, arguments: args });
                                tool_call_count += 1;
                                has_tool_calls = true;
                            }
                        }
                        // Flush buffered pre-tool content
                        flush_pre_tool_content(tx, &mut pre_tool_content, &mut full_reasoning, &mut reasoning_count, &mut thinking_ended, has_tool_calls, thinking_start);
                        continue;
                    }

                    let parsed: Value = match serde_json::from_str(data) {
                        Ok(v) => v,
                        Err(_) => continue,
                    };

                    let delta = match parsed.get("choices").and_then(|c| c.get(0)).and_then(|c| c.get("delta")) {
                        Some(d) => d,
                        None => {
                            if let Some(reason) = parsed.get("choices").and_then(|c| c.get(0)).and_then(|c| c.get("finish_reason")).and_then(|r| r.as_str()) {
                                finish_reason = reason.to_string();
                            }
                            continue;
                        }
                    };

                    // Check for tool_calls BEFORE content, so we know if content is pre-tool
                    if let Some(tool_calls) = delta.get("tool_calls").and_then(|tc| tc.as_array()) {
                        for tc in tool_calls {
                            let tc_id = tc.get("id").and_then(|i| i.as_str()).unwrap_or("").to_string();
                            if let Some(func) = tc.get("function") {
                                let func_name = func.get("name").and_then(|n| n.as_str()).unwrap_or("").to_string();
                                let func_args = func.get("arguments").and_then(|a| a.as_str()).unwrap_or("").to_string();
                                if !tc_id.is_empty() && !func_name.is_empty() {
                                    // Flush buffered pre-tool content as thinking before sending tool call
                                    flush_pre_tool_content(tx, &mut pre_tool_content, &mut full_reasoning, &mut reasoning_count, &mut thinking_ended, true, thinking_start);
                                    // Start new tool call
                                    tool_call_buf = Some((tc_id, func_name, func_args));
                                } else if !func_args.is_empty() {
                                    // Arguments-only delta (may have no id/name) — append to existing
                                    if let Some((_, _, ref mut existing_args)) = tool_call_buf {
                                        existing_args.push_str(&func_args);
                                    }
                                }
                            }
                        }
                    }

                    // Check for reasoning content: Ollama uses "reasoning", DeepSeek/Qwen use "reasoning_content"
                    let reasoning_text = delta.get("reasoning").and_then(|c| c.as_str())
                        .or_else(|| delta.get("reasoning_content").and_then(|c| c.as_str()));
                    if let Some(t) = reasoning_text {
                        if !t.is_empty() {
                            let _ = tx.send(StreamEvent::ThinkingDelta { content: t.to_string() });
                            full_reasoning.push_str(t);
                            reasoning_count += 1;
                        }
                    }
                    if let Some(t) = delta.get("content").and_then(|c| c.as_str()) {
                        if !t.is_empty() {
                            if reasoning_count > 0 {
                                // Native reasoning model (Qwen): end thinking when final content starts
                                if !thinking_ended {
                                    let duration = thinking_start.elapsed();
                                    let _ = tx.send(StreamEvent::ThinkingEnd {
                                        steps: reasoning_count as usize,
                                        duration_ms: duration.as_millis() as u64,
                                    });
                                    thinking_ended = true;
                                }
                                let _ = tx.send(StreamEvent::TextDelta { content: t.to_string() });
                                full_text.push_str(t);
                                content_count += 1;
                            } else if has_tool_calls || !tool_call_buf.is_none() {
                                // Content after tool calls in same stream — send as TextDelta
                                if !thinking_ended {
                                    thinking_ended = true;
                                }
                                let _ = tx.send(StreamEvent::TextDelta { content: t.to_string() });
                                full_text.push_str(t);
                                content_count += 1;
                            } else {
                                // No native reasoning, no tool calls yet → buffer
                                pre_tool_content.push(t.to_string());
                                full_text.push_str(t);
                                content_count += 1;
                            }
                        }
                    }
                }
            }
        }

        if let Some((id, name, args)) = tool_call_buf.take() {
            if is_valid_tool_args(&args) {
                let _ = tx.send(StreamEvent::ToolCall { id, name, arguments: args });
                tool_call_count += 1;
                has_tool_calls = true;
            }
        }

        // Flush any remaining buffered pre-tool content at end of stream
        flush_pre_tool_content(tx, &mut pre_tool_content, &mut full_reasoning, &mut reasoning_count, &mut thinking_ended, has_tool_calls, thinking_start);

        tracing::info!("[Local] SSE done frames={} content={} reasoning={} tool_calls={} finish={}", frame_count, content_count, reasoning_count, tool_call_count, finish_reason);

        // Detect truncation: only when no real text was produced (model stalled in thinking)
        let truncated = tool_call_count == 0
            && full_text.trim().len() < 20
            && finish_reason == "stop"
            && reasoning_count > 50;

        Ok((full_text, full_reasoning, if truncated { "truncated".into() } else { finish_reason }))
    }
}

/// Flush buffered pre-tool content: emit as ThinkingDelta if tool calls followed, otherwise as TextDelta.
fn flush_pre_tool_content(
    tx: &UnboundedSender<StreamEvent>,
    buffer: &mut Vec<String>,
    full_reasoning: &mut String,
    reasoning_count: &mut u64,
    thinking_ended: &mut bool,
    has_tool_calls: bool,
    thinking_start: Instant,
) {
    if buffer.is_empty() {
        return;
    }
    if has_tool_calls {
        // Emit as thinking steps
        for chunk in buffer.drain(..) {
            full_reasoning.push_str(&chunk);
            *reasoning_count += 1;
            let _ = tx.send(StreamEvent::ThinkingDelta { content: chunk });
        }
        let duration = thinking_start.elapsed();
        let _ = tx.send(StreamEvent::ThinkingEnd {
            steps: *reasoning_count as usize,
            duration_ms: duration.as_millis() as u64,
        });
        *thinking_ended = true;
    } else {
        // No tool calls — this was the final answer, emit as TextDelta
        for chunk in buffer.drain(..) {
            let _ = tx.send(StreamEvent::TextDelta { content: chunk });
        }
    }
}

/// Check that tool call arguments are valid JSON (or empty).
fn is_valid_tool_args(args: &str) -> bool {
    args.trim().is_empty() || serde_json::from_str::<Value>(args).is_ok()
}
