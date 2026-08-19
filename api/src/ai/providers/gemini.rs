// AI Chat — Gemini provider.
//
// Uses the Gemini API with SSE streaming via streamGenerateContent, and falls
// back to the non-streaming generateContent endpoint if the streaming call
// returns no output (some newer thinking models are unreliable over SSE).
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
        let mut system_instruction: Option<String> = None;

        for m in messages {
            if m.role == "system" {
                system_instruction = Some(m.content.clone());
                continue;
            }

            let mut parts: Vec<Value> = Vec::new();

            if !m.content.is_empty() {
                parts.push(json!({"text": m.content}));
            }

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

            if m.role == "tool" {
                let result: Value = serde_json::from_str(&m.content)
                    .unwrap_or(json!({"result": m.content}));
                let func_name = m.name.as_deref().unwrap_or("unknown");
                parts.push(json!({
                    "functionResponse": {
                        "name": func_name,
                        "response": { "content": result }
                    }
                }));
            }

            let role = match m.role.as_str() {
                "assistant" | "model" => "model",
                _ => "user",
            };

            if let Some(last) = contents.last_mut() {
                if last["role"].as_str() == Some(role) {
                    if let Some(existing_parts) = last.get_mut("parts").and_then(|p| p.as_array_mut()) {
                        existing_parts.extend(parts);
                        continue;
                    }
                }
            }

            contents.push(json!({ "role": role, "parts": parts }));
        }

        let mut body = json!({
            "contents": contents,
            "generationConfig": {
                "temperature": 0.7,
                "maxOutputTokens": 4096,
            },
        });

        if let Some(sys) = system_instruction {
            body["systemInstruction"] = json!({ "parts": [{ "text": sys }] });
        }
        if !function_declarations.is_empty() {
            body["tools"] = json!([{ "functionDeclarations": function_declarations }]);
        }

        let client = Self::http_client()?;

        let mut final_text = String::new();
        let mut had_tool_calls = false;
        let mut last_error: Option<String> = None;

        // 1) Try the streaming endpoint first (streamGenerateContent?alt=sse).
        let stream_url = format!("{}/models/{}:streamGenerateContent?alt=sse", base, model);
        match Self::stream_generate(
            &client,
            &stream_url,
            &body,
            api_key,
            &mut final_text,
            &mut had_tool_calls,
            tx,
        )
        .await
        {
            Ok(()) => {}
            Err(e) => {
                tracing::warn!("[Gemini] streamGenerateContent failed: {}", e);
                last_error = Some(e.to_string());
            }
        }

        // 2) Only fall back to the non-streaming generateContent endpoint when the
        //    streaming call succeeded but produced nothing (e.g. a response-shape
        //    mismatch). A hard failure (transport error / HTTP error such as 429)
        //    will hit the same problem, so skip the retry and surface the error.
        if final_text.is_empty() && !had_tool_calls && last_error.is_none() {
            tracing::warn!("[Gemini] streaming returned no output - retrying with generateContent");
            let non_stream_url = format!("{}/models/{}:generateContent", base, model);
            match Self::generate(
                &client,
                &non_stream_url,
                &body,
                api_key,
                &mut final_text,
                &mut had_tool_calls,
                tx,
            )
            .await
            {
                Ok(()) => {}
                Err(e) => {
                    tracing::error!("[Gemini] generateContent failed: {}", e);
                    last_error = Some(e.to_string());
                }
            }
        }

        // Signal completion. The backend emits its own final `Done` with the
        // real session id, so a single event here is enough.
        let _ = tx.send(StreamEvent::Done {
            session_id: "gemini".into(),
            finish_reason: Some("stop".into()),
        });

        if final_text.is_empty() && !had_tool_calls {
            // Surface the real provider error (e.g. 429 quota, connection failure)
            // instead of a generic message so the user knows what actually happened.
            let message = last_error
                .unwrap_or_else(|| "Gemini returned no output.".to_string());
            let _ = tx.send(StreamEvent::Error { message });
        }

        Ok(Some(final_text))
    }
}

impl GeminiProvider {
    fn http_client() -> Result<Client, AiError> {
        Client::builder()
            .timeout(std::time::Duration::from_secs(300))
            .build()
            .map_err(|e| AiError::Provider(format!("Failed to build HTTP client: {}", e)))
    }

    /// Shared POST + status check for both streaming and non-streaming calls.
    async fn send_request(
        client: &Client,
        url: &str,
        body: &Value,
        api_key: Option<&str>,
    ) -> Result<reqwest::Response, AiError> {
        let key = api_key.unwrap_or("");
        let response = client
            .post(url)
            .header("Content-Type", "application/json")
            .header("x-goog-api-key", key)
            .json(body)
            .send()
            .await
            .map_err(|e| AiError::Provider(format!("Failed to connect to Gemini: {}", e)))?;

        let status = response.status();
        tracing::info!("[Gemini HTTP] url={} status={} headers={:?}", url, status, response.headers());
        if !status.is_success() {
            let body_text = response.text().await.unwrap_or_default();
            return Err(AiError::Provider(format!(
                "Gemini returned {}: {}",
                status, body_text
            )));
        }
        Ok(response)
    }

    /// Extract text deltas / tool calls from a Gemini response object.
    ///
    /// Thinking parts carry only `thoughtSignature` / `thought` (no `text`) and
    /// are skipped; text parts are streamed to the UI as normal text deltas.
    pub fn handle_candidate(
        parsed: &Value,
        final_text: &mut String,
        had_tool_calls: &mut bool,
        tx: &UnboundedSender<StreamEvent>,
    ) {
        if let Some(candidates) = parsed.get("candidates").and_then(|c| c.as_array()) {
            for candidate in candidates {
                if let Some(finish) = candidate.get("finishReason").and_then(|f| f.as_str()) {
                    tracing::info!("[Gemini finishReason] {}", finish);
                }

                if let Some(content) = candidate.get("content") {
                    if let Some(parts) = content.get("parts").and_then(|p| p.as_array()) {
                        for part in parts {
                            if let Some(text) = part.get("text").and_then(|t| t.as_str()) {
                                if !text.is_empty() {
                                    final_text.push_str(text);
                                    let _ = tx.send(StreamEvent::TextDelta {
                                        content: text.to_string(),
                                    });
                                }
                            }
                            if let Some(fc) = part.get("functionCall") {
                                let name = fc["name"].as_str().unwrap_or("").to_string();
                                let args = fc.get("args").map(|a| a.to_string()).unwrap_or_default();
                                if !name.is_empty() {
                                    *had_tool_calls = true;
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

    /// POST to `:streamGenerateContent?alt=sse` and parse the SSE stream.
    async fn stream_generate(
        client: &Client,
        url: &str,
        body: &Value,
        api_key: Option<&str>,
        final_text: &mut String,
        had_tool_calls: &mut bool,
        tx: &UnboundedSender<StreamEvent>,
    ) -> Result<(), AiError> {
        let response = Self::send_request(client, url, body, api_key).await?;

        let mut stream = response.bytes_stream();
        let mut buffer = String::new();

        while let Some(chunk_result) = stream.next().await {
            let chunk = chunk_result
                .map_err(|e| AiError::Stream(format!("Stream read error: {}", e)))?;
            let chunk_str = String::from_utf8_lossy(&chunk);
            buffer.push_str(&chunk_str);

            // Google's `alt=sse` streams use CRLF line endings. Normalize so the
            // `\n\n` frame delimiter is found reliably even across chunk boundaries.
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
                    tracing::info!("[Gemini SSE raw] {}", data);

                    let parsed: Value = match serde_json::from_str(data) {
                        Ok(v) => v,
                        Err(_) => continue,
                    };

                    Self::handle_candidate(&parsed, final_text, had_tool_calls, tx);
                }
            }
        }

        Ok(())
    }

    /// POST to `:generateContent` (non-streaming) and parse the JSON response.
    async fn generate(
        client: &Client,
        url: &str,
        body: &Value,
        api_key: Option<&str>,
        final_text: &mut String,
        had_tool_calls: &mut bool,
        tx: &UnboundedSender<StreamEvent>,
    ) -> Result<(), AiError> {
        let response = Self::send_request(client, url, body, api_key).await?;
        let text = response
            .text()
            .await
            .map_err(|e| AiError::Stream(format!("Failed to read response: {}", e)))?;
        tracing::info!("[Gemini generateContent raw] {}", &text[..text.len().min(4000)]);

        let parsed: Value = serde_json::from_str(&text)
            .map_err(|e| AiError::Stream(format!("Invalid JSON from generateContent: {}", e)))?;

        Self::handle_candidate(&parsed, final_text, had_tool_calls, tx);

        Ok(())
    }
}

