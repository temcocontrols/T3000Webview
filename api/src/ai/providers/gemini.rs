// AI Chat — Gemini provider.
//
// Uses the Gemini API with SSE streaming via generateContent.
// https://ai.google.dev/gemini-api/docs/text-generation

use async_trait::async_trait;
use futures_util::StreamExt;
use reqwest::Client;
use serde_json::{json, Value};
use tokio::sync::mpsc::UnboundedSender;

use super::super::types::{AiError, Message, StreamEvent};
use super::{LlmProvider, ToolDef};

pub struct GeminiProvider;

#[async_trait]
impl LlmProvider for GeminiProvider {
    async fn stream_chat(
        &self,
        endpoint: &str,
        api_key: Option<&str>,
        model: &str,
        messages: &[Message],
        tools: &[ToolDef],
        tx: &UnboundedSender<StreamEvent>,
    ) -> Result<Option<String>, AiError> {
        let base = endpoint.trim_end_matches('/');
        let url = format!(
            "{}/models/{}:streamGenerateContent?alt=sse",
            base, model
        );

        // Build Gemini-format tools
        let function_declarations: Vec<Value> = tools
            .iter()
            .map(|t| {
                json!({
                    "name": t.name,
                    "description": t.description,
                    "parameters": t.input_schema
                })
            })
            .collect();

        // Build Gemini contents array
        let mut contents: Vec<Value> = Vec::new();
        // System instruction — Gemini uses systemInstruction at top level
        let mut system_instruction: Option<String> = None;

        for m in messages {
            if m.role == "system" {
                system_instruction = Some(m.content.clone());
                continue;
            }

            let mut parts: Vec<Value> = Vec::new();

            // Text content
            if !m.content.is_empty() {
                parts.push(json!({"text": m.content}));
            }

            // Tool calls from assistant
            if m.role == "assistant" {
                if let Some(ref tcs) = m.tool_calls {
                    for tc in tcs {
                        let args: Value = if tc.function.arguments.is_empty() {
                            json!({})
                        } else {
                            serde_json::from_str(&tc.function.arguments).unwrap_or(json!({}))
                        };
                        parts.push(json!({
                            "functionCall": {
                                "name": tc.function.name,
                                "args": args
                            }
                        }));
                    }
                }
            }

            // Tool results
            if m.role == "tool" {
                let result: Value = serde_json::from_str(&m.content).unwrap_or(json!({"result": m.content}));
                let func_name = m.name.as_deref().unwrap_or("unknown");
                parts.push(json!({
                    "functionResponse": {
                        "name": func_name,
                        "response": {
                            "content": result
                        }
                    }
                }));
            }

            let role = match m.role.as_str() {
                "assistant" | "model" => "model",
                _ => "user",
            };

            // Merge with previous message if same role (Gemini requires alternating roles)
            if let Some(last) = contents.last_mut() {
                if last["role"].as_str() == Some(role) {
                    if let Some(existing_parts) = last.get_mut("parts").and_then(|p| p.as_array_mut()) {
                        existing_parts.extend(parts);
                        continue;
                    }
                }
            }

            contents.push(json!({
                "role": role,
                "parts": parts
            }));
        }

        let mut body = json!({
            "contents": contents,
            "generationConfig": {
                "temperature": 0.7,
                "maxOutputTokens": 4096,
            },
        });

        if let Some(sys) = system_instruction {
            body["systemInstruction"] = json!({
                "parts": [{ "text": sys }]
            });
        }
        if !function_declarations.is_empty() {
            body["tools"] = json!([{
                "functionDeclarations": function_declarations
            }]);
        }

        let client = Client::builder()
            .timeout(std::time::Duration::from_secs(300))
            .build()
            .map_err(|e| AiError::Provider(format!("Failed to build HTTP client: {}", e)))?;

        let key = api_key.unwrap_or("");
        let response = client
            .post(&url)
            .header("Content-Type", "application/json")
            .header("x-goog-api-key", key)
            .json(&body)
            .send()
            .await
            .map_err(|e| AiError::Provider(format!("Failed to connect to Gemini: {}", e)))?;

        let status = response.status();
        if !status.is_success() {
            let body_text = response.text().await.unwrap_or_default();
            return Err(AiError::Provider(format!(
                "Gemini returned {}: {}",
                status, body_text
            )));
        }

        // Parse SSE stream
        let mut stream = response.bytes_stream();
        let mut buffer = String::new();
        let mut tool_name_buf: Option<String> = None;

        while let Some(chunk_result) = stream.next().await {
            let chunk = chunk_result
                .map_err(|e| AiError::Stream(format!("Stream read error: {}", e)))?;
            let chunk_str = String::from_utf8_lossy(&chunk);
            buffer.push_str(&chunk_str);

            while let Some(pos) = buffer.find("\n\n") {
                let frame = buffer[..pos].to_string();
                buffer = buffer[pos + 2..].to_string();

                for line in frame.lines() {
                    let line = line.trim();
                    if line.is_empty() || !line.starts_with("data: ") {
                        continue;
                    }
                    let data = &line[6..];
                    let parsed: Value = match serde_json::from_str(data) {
                        Ok(v) => v,
                        Err(_) => continue,
                    };

                    // Gemini wraps in candidates array
                    if let Some(candidates) = parsed.get("candidates").and_then(|c| c.as_array()) {
                        for candidate in candidates {
                            if let Some(content) = candidate.get("content") {
                                if let Some(parts) = content.get("parts").and_then(|p| p.as_array()) {
                                    for part in parts {
                                        // Text
                                        if let Some(text) = part.get("text").and_then(|t| t.as_str()) {
                                            let _ = tx.send(StreamEvent::TextDelta {
                                                content: text.to_string(),
                                            });
                                        }

                                        // Function call
                                        if let Some(fc) = part.get("functionCall") {
                                            let name = fc["name"].as_str().unwrap_or("").to_string();
                                            let args = fc.get("args").map(|a| a.to_string()).unwrap_or_default();

                                            if !name.is_empty() {
                                                // Use tool name as ID
                                                tool_name_buf = Some(name.clone());
                                                let _ = tx.send(StreamEvent::ToolCall {
                                                    id: format!("gemini-{}", name),
                                                    name,
                                                    arguments: args,
                                                });
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        Ok(None)
    }
}
