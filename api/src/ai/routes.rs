// AI Chat — Axum route handlers.
//
// POST /api/ai/chat       — SSE streaming chat (with tool-call loop)
// DELETE /api/ai/sessions/:id  — Clear a session
// GET  /api/ai/settings    — Get stored AI settings (Phase 3)
// PUT  /api/ai/settings    — Save AI settings (Phase 3)
// GET  /api/ai/tools       — List available MCP tools for transparency

use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::{
        sse::{Event, Sse},
        IntoResponse, Json,
    },
    routing::{delete, get, patch, post, put},
    Router,
};
use serde_json::{json, Value};
use std::convert::Infallible;
use std::sync::Arc;
use tokio_stream::wrappers::UnboundedReceiverStream;
use tracing::info;

use crate::app_state::T3AppState;
use crate::haystack::mcp::TOOLS;

use super::providers::{get_provider, ToolDef};
use super::session::SessionManager;
use super::types::{AiError, ChatRequest, Message, StreamEvent};
use super::mcp_client::{McpClient, McpClientManager, McpServerConfig};
use chrono::Utc;
use uuid::Uuid;

// ═══ Lazy-initialized singletons ═══

static SESSION_MANAGER: once_cell::sync::Lazy<Arc<SessionManager>> =
    once_cell::sync::Lazy::new(|| Arc::new(SessionManager::new()));

pub(crate) static MCP_CLIENT_MANAGER: once_cell::sync::Lazy<Arc<McpClientManager>> =
    once_cell::sync::Lazy::new(|| {
        let mgr = Arc::new(McpClientManager::new());
        let mgr_clone = mgr.clone();
        tokio::spawn(async move {
            if let Ok(configs) = super::session_store::load_mcp_servers() {
                for config in configs {
                    if config.enabled {
                        let _ = mgr_clone.add_server(config).await;
                    } else {
                        // Load disabled servers into memory without connecting
                        let mut clients = mgr_clone.clients.write().await;
                        clients.push(McpClient::new(config));
                    }
                }
            }
        });
        mgr
    });

// ═══ Tool definitions (built-in + external) ═══

fn get_all_tool_defs() -> Vec<ToolDef> {
    let mut tools: Vec<ToolDef> = TOOLS
        .iter()
        .map(|t| ToolDef {
            name: t.name.to_string(),
            description: t.description.to_string(),
            input_schema: t.input_schema.clone(),
        })
        .collect();

    // External tools are fetched synchronously from cache
    // (they're updated on connect/disconnect)
    // For now, built-in only — external merge happens at call time
    tools
}

// ═══ POST /api/ai/chat ═══

pub async fn handle_ai_chat(
    State(state): State<T3AppState>,
    Json(req): Json<ChatRequest>,
) -> impl IntoResponse {
    let session_manager = SESSION_MANAGER.clone();
    let session = session_manager.create_or_resume(&req).await;

    // Create a channel for streaming events
    let (tx, rx) = tokio::sync::mpsc::unbounded_channel::<Result<Event, std::convert::Infallible>>();

    // Spawn the chat processing task
    let state_clone = state.clone();
    tokio::spawn(async move {
        if let Err(e) = process_chat(session_manager, session, &state_clone, &tx).await {
            let _ = tx.send(Ok(Event::default().data(
                serde_json::to_string(&StreamEvent::Error {
                    message: e.to_string(),
                })
                .unwrap_or_else(|_| r#"{"event":"error","data":{"message":"Unknown error"}}"#.to_string()),
            )));
        }
        // Channel closed when tx is dropped — SSE stream ends
    });

    let stream = UnboundedReceiverStream::new(rx);

    Sse::new(stream)
        .keep_alive(
            axum::response::sse::KeepAlive::new()
                .interval(std::time::Duration::from_secs(15))
                .text("keep-alive"),
        )
}

/// Core chat processing — manages the tool-call loop.
async fn process_chat(
    session_manager: Arc<SessionManager>,
    mut session: super::session::Session,
    state: &T3AppState,
    tx: &tokio::sync::mpsc::UnboundedSender<Result<Event, Infallible>>,
) -> Result<(), AiError> {
    let provider = get_provider(&session.provider)?;
    let tools = get_all_tool_defs();

    // Send the system prompt if this is a new conversation
    let messages = if session.messages.iter().any(|m| m.role == "system") {
        session.messages.clone()
    } else {
        let mut msgs = vec![Message {
            role: "system".to_string(),
            content: build_system_prompt(),
            tool_calls: None,
            tool_call_id: None,
        }];
        msgs.extend(session.messages.clone());
        msgs
    };

    // Outer loop: keep calling the LLM until it produces a final response
    let mut current_messages = messages;
    let max_iterations = 10;
    let mut nudge_attempted = false;

    for _iteration in 0..max_iterations {
        let (inner_tx, mut inner_rx) = tokio::sync::mpsc::unbounded_channel::<StreamEvent>();

        let provider_result = provider
            .stream_chat(
                &session.endpoint,
                session.api_key.as_deref(),
                &session.model,
                &current_messages,
                &tools,
                &inner_tx,
            )
            .await;

        // Drop the inner sender so the receiver will eventually close
        drop(inner_tx);

        // Collect all events from this turn
        let mut turn_events: Vec<StreamEvent> = vec![];
        while let Some(event) = inner_rx.recv().await {
            turn_events.push(event);
        }

        if let Err(e) = provider_result {
            return Err(e);
        }

        // Check if the LLM called any tools
        let tool_requests: Vec<&StreamEvent> = turn_events
            .iter()
            .filter(|e| matches!(e, StreamEvent::ToolCall { .. }))
            .collect();

        if tool_requests.is_empty() {
            // No tools called — stream text events and finish
            for event in &turn_events {
                if let StreamEvent::TextDelta { .. } = event {
                    let json = serde_json::to_string(event).unwrap();
                    let _ = tx.send(Ok(Event::default().data(json)));
                }
            }

            // Update session messages — append the assistant's final text
            let assistant_text: String = turn_events
                .iter()
                .filter_map(|e| {
                    if let StreamEvent::TextDelta { content } = e {
                        Some(content.as_str())
                    } else {
                        None
                    }
                })
                .collect();

            if !assistant_text.is_empty() {
                current_messages.push(Message {
                    role: "assistant".to_string(),
                    content: assistant_text.clone(),
                    tool_calls: None,
                    tool_call_id: None,
                });

                // If model describes tools but didn't call any, nudge it
                let mentioned_tools: Vec<&str> = tools.iter()
                    .filter(|t| assistant_text.contains(&t.name))
                    .map(|t| t.name.as_str())
                    .collect();
                if !mentioned_tools.is_empty() && !nudge_attempted {
                    nudge_attempted = true;
                    current_messages.push(Message {
                        role: "user".to_string(),
                        content: "Please call the tool now to get the data.".to_string(),
                        tool_calls: None,
                        tool_call_id: None,
                    });
                    continue;
                }
            }

            // Send done event
            let done_json = serde_json::to_string(&StreamEvent::Done {
                session_id: session.id.clone(),
            })
            .unwrap();
            let _ = tx.send(Ok(Event::default().data(done_json)));

            // Persist session to JSON file (clone before update_messages moves it)
            let title = super::session_store::auto_title(
                current_messages
                    .iter()
                    .filter(|m| m.role == "user")
                    .last()
                    .map(|m| m.content.as_str())
                    .unwrap_or("New Chat"),
            );
            match super::session_store::save_session(&super::session_store::SessionFile {
                id: session.id.clone(),
                title: title.clone(),
                created_at: Utc::now().to_rfc3339(),
                provider: session.provider.clone(),
                model: session.model.clone(),
                messages: current_messages.clone(),
            }) {
                Ok(()) => info!("[AI] Session saved: {} ({})", session.id, title),
                Err(e) => info!("[AI] Failed to save session {}: {}", session.id, e),
            }

            session_manager
                .update_messages(&session.id, current_messages)
                .await;

            return Ok(());
        }

        // Tools were called — execute them
        // First, stream the tool_call events to the frontend
        let mut tool_call_records: Vec<(String, String, String)> = vec![]; // (id, name, args)

        for event in &turn_events {
            match event {
                StreamEvent::TextDelta { content: _ } => {
                    let json = serde_json::to_string(event).unwrap();
                    let _ = tx.send(Ok(Event::default().data(json)));
                }
                StreamEvent::ToolCall { id, name, arguments } => {
                    let json = serde_json::to_string(event).unwrap();
                    let _ = tx.send(Ok(Event::default().data(json)));
                    tool_call_records.push((id.clone(), name.clone(), arguments.clone()));
                }
                _ => {}
            }
        }

        // Execute tools and stream results
        let mut tool_results: Vec<(String, String)> = vec![]; // (tool_call_id, result_json)

        for (tc_id, tc_name, tc_args) in &tool_call_records {
            match execute_mcp_tool(tc_name, tc_args, state).await {
                Ok(result) => {
                    let result_json = serde_json::to_string(&result).unwrap_or_else(|_| "null".to_string());
                    let event = StreamEvent::ToolResult {
                        id: tc_id.clone(),
                        result: result_json.clone(),
                    };
                    let json = serde_json::to_string(&event).unwrap();
                    let _ = tx.send(Ok(Event::default().data(json)));
                    tool_results.push((tc_id.clone(), result_json));
                }
                Err(e) => {
                    let event = StreamEvent::ToolResult {
                        id: tc_id.clone(),
                        result: format!(r#"{{"error":"{}"}}"#, e),
                    };
                    let json = serde_json::to_string(&event).unwrap();
                    let _ = tx.send(Ok(Event::default().data(json)));
                    tool_results.push((tc_id.clone(), format!(r#"{{"error":"{}"}}"#, e)));
                }
            }
        }

        // Build assistant message with tool calls
        let openai_tool_calls: Vec<super::types::ToolCall> = tool_call_records
            .iter()
            .map(|(id, name, args)| super::types::ToolCall {
                id: id.clone(),
                call_type: "function".to_string(),
                function: super::types::FunctionCall {
                    name: name.clone(),
                    arguments: args.clone(),
                },
            })
            .collect();

        current_messages.push(Message {
            role: "assistant".to_string(),
            content: String::new(),
            tool_calls: Some(openai_tool_calls),
            tool_call_id: None,
        });

        // Append tool result messages
        for (tc_id, result) in &tool_results {
            current_messages.push(Message {
                role: "tool".to_string(),
                content: result.clone(),
                tool_calls: None,
                tool_call_id: Some(tc_id.clone()),
            });
        }

        // Continue the loop — the LLM will process the tool results
    }

    // Exceeded max iterations
    Err(AiError::Stream(
        "Tool-call loop exceeded maximum iterations".to_string(),
    ))
}

/// Execute an MCP tool via the existing MCP dispatch machinery.
async fn execute_mcp_tool(
    name: &str,
    arguments: &str,
    state: &T3AppState,
) -> Result<Value, String> {
    super::tool_executor::execute_tool(name, arguments, state).await
}

/// Build the default system prompt.
fn build_system_prompt() -> String {
    r#"You are a building automation assistant for the T3000 platform.
You have access to tools that query real-time device data, search
Haystack semantic tags, read/write points, and check alarms.

Rules:
- ALWAYS use tools to fetch live data — never guess values.
- When asked about a device, use device_list first to find it.
- When asked about a point value, search by tags with
  haystack_search_points, then read with point_read.
- Keep responses concise. Include units when reporting values.
- If a tool fails, explain the error and suggest alternatives.
- For multi-point queries, use batch tools (point_read_batch)."#
        .to_string()
}

// ═══ DELETE /api/ai/sessions/:id ═══

pub async fn handle_delete_session(
    Path(session_id): Path<String>,
) -> impl IntoResponse {
    SESSION_MANAGER.delete(&session_id).await;
    let _ = super::session_store::delete_session(&session_id);
    StatusCode::NO_CONTENT
}

// ═══ POST /api/ai/delete-session ═══

pub async fn handle_delete_session_post(
    Json(body): Json<Value>,
) -> impl IntoResponse {
    let session_id = body.get("id").and_then(|v| v.as_str()).unwrap_or("");
    if session_id.is_empty() {
        return Json(json!({"ok": false, "error": "Session ID required"})).into_response();
    }
    SESSION_MANAGER.delete(session_id).await;
    let _ = super::session_store::delete_session(session_id);
    Json(json!({"ok": true})).into_response()
}

// ═══ GET /api/ai/sessions (list) ═══

pub async fn handle_list_sessions() -> impl IntoResponse {
    match super::session_store::load_index() {
        Ok(index) => Json(json!({ "sessions": index })),
        Err(e) => {
            info!("[AI] Failed to load session index: {}", e);
            Json(json!({ "sessions": [] }))
        }
    }
}

// ═══ GET /api/ai/sessions/:id (single) ═══

pub async fn handle_get_session(
    Path(session_id): Path<String>,
) -> impl IntoResponse {
    match super::session_store::load_session(&session_id) {
        Ok(Some(session)) => Json(json!(session)).into_response(),
        Ok(None) => StatusCode::NOT_FOUND.into_response(),
        Err(e) => {
            info!("[AI] Failed to load session {}: {}", session_id, e);
            StatusCode::INTERNAL_SERVER_ERROR.into_response()
        }
    }
}

// ═══ PUT /api/ai/sessions/:id (rename) ═══

pub async fn handle_rename_session(
    Path(session_id): Path<String>,
    Json(body): Json<Value>,
) -> impl IntoResponse {
    let new_title = body
        .get("title")
        .and_then(|t| t.as_str())
        .unwrap_or("Untitled");

    match super::session_store::load_session(&session_id) {
        Ok(Some(mut session)) => {
            session.title = new_title.to_string();
            if let Err(e) = super::session_store::save_session(&session) {
                info!("[AI] Failed to rename session {}: {}", session_id, e);
                StatusCode::INTERNAL_SERVER_ERROR.into_response()
            } else {
                Json(json!({ "ok": true })).into_response()
            }
        }
        Ok(None) => StatusCode::NOT_FOUND.into_response(),
        Err(e) => {
            info!("[AI] Failed to load session {}: {}", session_id, e);
            StatusCode::INTERNAL_SERVER_ERROR.into_response()
        }
    }
}

// ═══ GET /api/ai/settings ═══

pub async fn handle_get_settings() -> impl IntoResponse {
    match super::session_store::load_ai_settings() {
        Ok(settings) => Json(settings),
        Err(_) => Json(json!({
            "provider": "local",
            "model": "llama3.1:8b",
            "endpoint": "http://localhost:11434/v1",
            "api_key": ""
        })),
    }
}

// ═══ PUT /api/ai/settings ═══

pub async fn handle_update_settings(
    Json(settings): Json<Value>,
) -> impl IntoResponse {
    // Phase 3: encrypt api_key and save to file
    let _ = super::session_store::save_ai_settings(&settings);
    info!("[AI] Settings updated: {:?}", settings);
    Json(json!({ "ok": true }))
}

// ═══ MCP Server CRUD ═══

pub async fn handle_list_mcp_servers() -> impl IntoResponse {
    let configs = MCP_CLIENT_MANAGER.get_configs().await;
    Json(json!({ "servers": configs }))
}

pub async fn handle_add_mcp_server(
    Json(body): Json<Value>,
) -> impl IntoResponse {
    let config = McpServerConfig {
        id: body.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string(),
        name: body.get("name").and_then(|v| v.as_str()).unwrap_or("").to_string(),
        url: body.get("url").and_then(|v| v.as_str()).unwrap_or("").to_string(),
        api_key: body.get("api_key").and_then(|v| v.as_str()).map(|s| s.to_string()),
        enabled: body.get("enabled").and_then(|v| v.as_bool()).unwrap_or(true),
    };

    if config.name.trim().is_empty() {
        return Json(json!({"ok": false, "error": "Please enter a display name for the server"})).into_response();
    }
    if config.url.trim().is_empty() {
        return Json(json!({"ok": false, "error": "Please enter the MCP server URL"})).into_response();
    }
    if !config.url.starts_with("http://") && !config.url.starts_with("https://") {
        return Json(json!({"ok": false, "error": "URL must start with http:// or https://"})).into_response();
    }

    let config_id = config.id.clone();

    // Always register in memory (mark as not connected if disabled)
    if config.enabled {
        if let Err(e) = MCP_CLIENT_MANAGER.add_server(config.clone()).await {
            let msg = format!("{}", e);
            let friendly = if msg.contains("connect") || msg.contains("502") || msg.contains("refused") {
                "Could not reach the MCP server. Check the URL and make sure the server is running."
            } else if msg.contains("timeout") {
                "Connection timed out. The server may be down or the URL is incorrect."
            } else {
                "Failed to add server. Please check your settings and try again."
            };
            return Json(json!({"ok": false, "error": friendly})).into_response();
        }
    } else {
        // Add to memory without connecting
        let mut clients = MCP_CLIENT_MANAGER.clients.write().await;
        clients.push(McpClient::new(config.clone()));
    }

    // Save to file
    let mut configs = MCP_CLIENT_MANAGER.get_configs().await;
    // Avoid duplicate if already added above
    if !configs.iter().any(|c| c.id == config_id) {
        configs.push(config.clone());
    }
    let _ = super::session_store::save_mcp_servers(&configs);
    Json(json!({ "ok": true, "id": config_id })).into_response()
}

pub async fn handle_delete_mcp_server(
    Path(server_id): Path<String>,
) -> impl IntoResponse {
    MCP_CLIENT_MANAGER.remove_server(&server_id).await;
    let configs = MCP_CLIENT_MANAGER.get_configs().await;
    let _ = super::session_store::save_mcp_servers(&configs);
    StatusCode::NO_CONTENT.into_response()
}

// ═══ POST /api/ai/delete-mcp-server ═══

pub async fn handle_delete_mcp_server_post(
    Json(body): Json<Value>,
) -> impl IntoResponse {
    let server_id = body.get("id").and_then(|v| v.as_str()).unwrap_or("");
    if server_id.is_empty() {
        return Json(json!({"ok": false, "error": "Server ID required"})).into_response();
    }
    MCP_CLIENT_MANAGER.remove_server(server_id).await;
    let configs = MCP_CLIENT_MANAGER.get_configs().await;
    let _ = super::session_store::save_mcp_servers(&configs);
    Json(json!({"ok": true})).into_response()
}

pub async fn handle_test_mcp_server(
    Json(body): Json<Value>,
) -> impl IntoResponse {
    let url = body.get("url").and_then(|v| v.as_str()).unwrap_or("");

    if url.trim().is_empty() {
        return Json(json!({ "ok": false, "error": "Please enter a URL to test" })).into_response();
    }
    if !url.starts_with("http://") && !url.starts_with("https://") {
        return Json(json!({ "ok": false, "error": "URL must start with http:// or https://" })).into_response();
    }

    let client = reqwest::Client::new();

    let body = json!({
        "jsonrpc": "2.0", "id": 1, "method": "initialize",
        "params": { "protocolVersion": "2024-11-05", "capabilities": {},
            "clientInfo": { "name": "t3000", "version": "1.0" } }
    });

    match client
        .post(&format!("{}/message", url.trim_end_matches('/')))
        .header("Content-Type", "application/json")
        .json(&body)
        .timeout(std::time::Duration::from_secs(5))
        .send()
        .await
    {
        Ok(res) if res.status().is_success() => {
            Json(json!({ "ok": true })).into_response()
        }
        Ok(res) => {
            let hint = match res.status().as_u16() {
                404 => "Server not found at this URL. Make sure the path is correct (usually ends with /mcp).",
                502 | 503 => "Server is unreachable. Check that the host and port are correct and the server is running.",
                401 | 403 => "Authentication required. Please provide a valid API key.",
                _ => "Server returned an unexpected response. Verify the URL points to a valid MCP endpoint.",
            };
            Json(json!({ "ok": false, "error": hint })).into_response()
        }
        Err(e) => {
            let hint = if e.is_timeout() {
                "Connection timed out. The server didn't respond within 5 seconds."
            } else if e.is_connect() {
                "Could not connect. Check that the host and port are correct and the server is running."
            } else if e.to_string().contains("dns") {
                "Host not found. Please check the server address."
            } else {
                "Connection failed. Please verify the URL and try again."
            };
            Json(json!({ "ok": false, "error": hint })).into_response()
        }
    }
}

// ═══ PATCH /api/ai/mcp-servers/{id}/activate ═══

pub async fn handle_activate_mcp_server(
    Path(server_id): Path<String>,
) -> impl IntoResponse {
    // Deactivate all, then activate the selected one
    let mut configs = MCP_CLIENT_MANAGER.get_configs().await;
    for c in &mut configs {
        c.enabled = c.id == server_id;
    }
    let _ = super::session_store::save_mcp_servers(&configs);

    // Rebuild connections: remove all, re-add only enabled
    MCP_CLIENT_MANAGER.clear().await;
    for c in &configs {
        if c.enabled {
            let _ = MCP_CLIENT_MANAGER.add_server(c.clone()).await;
        }
    }

    Json(json!({ "ok": true })).into_response()
}

// ═══ POST /api/ai/activate-mcp-server ═══

pub async fn handle_activate_server_post(
    Json(body): Json<Value>,
) -> impl IntoResponse {
    let server_id = body.get("id").and_then(|v| v.as_str()).unwrap_or("");
    if server_id.is_empty() {
        return Json(json!({"ok": false, "error": "Server ID required"})).into_response();
    }
    let mut configs = MCP_CLIENT_MANAGER.get_configs().await;

    // Toggle: if already active, deactivate; otherwise activate this one
    let currently_active = configs.iter().any(|c| c.id == server_id && c.enabled);

    for c in &mut configs {
        c.enabled = if currently_active {
            false // deactivate all
        } else {
            c.id == server_id // activate only this one
        };
    }
    let _ = super::session_store::save_mcp_servers(&configs);
    MCP_CLIENT_MANAGER.clear().await;
    for c in &configs {
        if c.enabled {
            let _ = MCP_CLIENT_MANAGER.add_server(c.clone()).await;
        } else {
            let mut clients = MCP_CLIENT_MANAGER.clients.write().await;
            clients.push(McpClient::new(c.clone()));
        }
    }
    Json(json!({"ok": true})).into_response()
}

// ═══ GET /api/ai/tools ═══

pub async fn handle_list_tools() -> impl IntoResponse {
    let tools: Vec<Value> = TOOLS
        .iter()
        .map(|t| {
            json!({
                "name": t.name,
                "description": t.description,
                "input_schema": t.input_schema
            })
        })
        .collect();

    Json(json!({
        "count": tools.len(),
        "tools": tools
    }))
}

// ═══ Router ═══

pub fn ai_routes() -> Router<T3AppState> {
    Router::new()
        .route("/api/ai/chat", post(handle_ai_chat))
        .route("/api/ai/sessions", get(handle_list_sessions))
        .route("/api/ai/sessions/{id}", get(handle_get_session).delete(handle_delete_session).put(handle_rename_session))
        .route("/api/ai/settings", get(handle_get_settings).put(handle_update_settings))
        .route("/api/ai/tools", get(handle_list_tools))
        .route("/api/ai/mcp-servers", get(handle_list_mcp_servers).post(handle_add_mcp_server))
        .route("/api/ai/mcp-servers/{id}/delete", post(handle_delete_mcp_server))
        .route("/api/ai/mcp-servers/{id}/activate", patch(handle_activate_mcp_server))
        .route("/api/ai/mcp-servers/test", post(handle_test_mcp_server))
        .route("/api/ai/delete-mcp-server", post(handle_delete_mcp_server_post))
        .route("/api/ai/activate-mcp-server", post(handle_activate_server_post))
        .route("/api/ai/delete-session", post(handle_delete_session_post))
}
