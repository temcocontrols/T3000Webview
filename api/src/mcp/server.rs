//! MCP Server — Streamable HTTP transport (JSON-RPC 2.0 + SSE + session management).

use axum::{
    extract::State,
    http::{StatusCode, HeaderMap},
    response::{IntoResponse, Response},
    routing::{delete, get, post},
    Json, Router,
};
use serde_json::{json, Value};
use tracing::{info, error};
use uuid::Uuid;
use chrono::Utc;
use std::collections::HashMap;
use std::sync::Arc;

use crate::app_state::T3AppState;
use crate::mcp::types::{JsonRpcRequest, McpSession, SessionStore};
use crate::mcp::storage::{current_device_file, load_json_file, update_device_context};

// ═══ MCP API Logger ═══

pub(crate) fn mcp_log(msg: &str) {
    crate::server::debug_log(&format!("[MCP] {}", msg));
}

// ═══ Server Constants ═══

/// Display name advertised to MCP clients (`initialize.serverInfo.name`,
/// `t3000_ping.server`, `t3000_get_version.name`). The server covers the whole
/// T3000 surface — devices, points, Haystack, FDD — so the name is not
/// Haystack-specific.
pub const SERVER_NAME: &str = "T3000 MCP Server";
/// API version reported to MCP clients (`initialize.serverInfo.version` and
/// `t3000_get_version`). Maintained **by hand** — bump it when the MCP API
/// changes (1.0.1, 1.1.0, ...). It is intentionally independent of the Rust
/// crate version in `Cargo.toml`.
pub const SERVER_VERSION: &str = "1.0.0";
pub(crate) const PROTOCOL_VERSION: &str = "2025-03-26";

/// Process start reference for the `t3000_ping` deep probe (set at startup).
static STARTED_AT: std::sync::OnceLock<std::time::Instant> = std::sync::OnceLock::new();

/// Seconds since the MCP server was initialised.
pub(crate) fn uptime_secs() -> u64 {
    STARTED_AT.get_or_init(std::time::Instant::now).elapsed().as_secs()
}

/// Helper to get DB from T3AppState
pub(crate) async fn get_db(state: &T3AppState) -> Result<sea_orm::DatabaseConnection, (StatusCode, Json<Value>)> {
    if let Some(conn) = &state.local_config_conn {
        return Ok(conn.lock().await.clone());
    }
    Err((StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Local database connection not available"}))))
}

// ═══ Session Store ═══

fn get_session_store(_state: &T3AppState) -> SessionStore {
    use std::sync::OnceLock;
    static SESSIONS: OnceLock<SessionStore> = OnceLock::new();
    SESSIONS.get_or_init(|| Arc::new(tokio::sync::Mutex::new(HashMap::new()))).clone()
}

// ═══ Routes ═══

/// Track which device a tool is being used with.
pub(crate) async fn track_current_device(args: &Value) {
    let serial: Option<i64> = args.get("serial_number")
        .and_then(|v| v.as_i64())
        .or_else(|| {
            args.get("serial_numbers")
                .and_then(|v| v.as_array())
                .and_then(|a| a.first())
                .and_then(|v| v.as_i64())
        });
    if let Some(sn) = serial {
        // Merge instead of overwrite: `ui_device` (set by the UI tree) and
        // `chat_device` (set by t3000_set_chat_device) live in the same file and
        // are read by `t3000_device_current` / GET /api/mcp/current-device.
        // Rewriting the file wholesale erased them on every tool call.
        let _ = update_device_context(|state| {
            if let Some(object) = state.as_object_mut() {
                // Older builds stored this tool's serial as `serial`, which reads
                // like a current-device answer; `last_tool_device` replaces it.
                object.remove("serial");
                object.insert("last_tool_device".to_string(), json!(sn));
                object.insert("updated_at".to_string(), json!(Utc::now().to_rfc3339()));
            }
        })
        .await;
    }
}

/// Create MCP routes for the Axum router
pub fn create_mcp_routes() -> Router<T3AppState> {
    STARTED_AT.get_or_init(std::time::Instant::now);
    Router::new()
        .route("/api/mcp", post(mcp_post_handler))
        .route("/api/mcp", get(mcp_sse_handler))
        .route("/api/mcp", delete(mcp_delete_handler))
        .route("/api/mcp/current-device", post(set_current_device_handler))
        .route("/api/mcp/current-device", get(get_current_device_handler))
}

// ═══ POST /api/mcp/current-device ═══

async fn set_current_device_handler(
    Json(body): Json<Value>,
) -> impl IntoResponse {
    let serial = body.get("serial_number").and_then(|v| v.as_i64()).map(|n| n as i32);

    match serial {
        Some(s) => {
            let dev_name = body.get("device_name").and_then(|v| v.as_str()).map(|s| s.to_string());
            let result = update_device_context(|state| {
                state["ui_device"] = json!(s);
                state["ui_device_name"] = json!(dev_name);
                state["updated_at"] = json!(Utc::now().to_rfc3339());
                if state.get("chat_device").is_none() {
                    state["chat_device"] = json!(null);
                    state["chat_device_name"] = json!(null);
                    state["confirmed_at"] = json!(null);
                }
            })
            .await;
            match result {
                Ok(state) => {
                    info!("[MCP] ui_device set to serial={} name={:?}", s, dev_name);
                    Json(json!({"ok": true, "ui_device": s, "ui_device_name": dev_name, "chat_device": state["chat_device"]})).into_response()
                }
                Err(e) => {
                    error!("[MCP] Failed to save device: {}", e);
                    (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"ok": false, "error": e}))).into_response()
                }
            }
        }
        None => {
            (StatusCode::BAD_REQUEST, Json(json!({"ok": false, "error": "serial_number required"}))).into_response()
        }
    }
}

// ═══ GET /api/mcp/current-device ═══

async fn get_current_device_handler() -> impl IntoResponse {
    let state_file = current_device_file();
    if state_file.exists() {
        match load_json_file(&state_file).await {
            Ok(v) => Json(v).into_response(),
            Err(_) => Json(json!({"ui_device": null, "chat_device": null, "note": "No device selected"})).into_response(),
        }
    } else {
        Json(json!({"ui_device": null, "chat_device": null, "note": "No device selected"})).into_response()
    }
}

// ═══ POST /api/mcp — JSON-RPC 2.0 ═══

pub async fn mcp_post_handler(
    State(state): State<T3AppState>,
    headers: HeaderMap,
    Json(body): Json<Value>,
) -> Result<Response, (StatusCode, Json<Value>)> {
    let db = get_db(&state).await?;
    let sessions = get_session_store(&state);

    let session_id = headers
        .get("mcp-session-id")
        .and_then(|v| v.to_str().ok())
        .map(String::from);

    let session_id = match session_id {
        Some(id) => {
            let sessions_map = sessions.lock().await;
            if sessions_map.contains_key(&id) {
                id
            } else {
                drop(sessions_map);
                let new_id = Uuid::new_v4().to_string();
                let mut map = sessions.lock().await;
                map.insert(new_id.clone(), McpSession {
                    id: new_id.clone(),
                    created_at: Utc::now().to_rfc3339(),
                    initialized: false,
                });
                new_id
            }
        }
        None => {
            let new_id = Uuid::new_v4().to_string();
            let mut map = sessions.lock().await;
            map.insert(new_id.clone(), McpSession {
                id: new_id.clone(),
                created_at: Utc::now().to_rfc3339(),
                initialized: false,
            });
            new_id
        }
    };

    let req: JsonRpcRequest = serde_json::from_value(body).map_err(|e| {
        (StatusCode::BAD_REQUEST, Json(json!({
            "jsonrpc": "2.0",
            "id": null,
            "error": { "code": -32700, "message": format!("Parse error: {}", e) }
        })))
    })?;

    if req.id.is_none() {
        if req.method == "notifications/initialized" {
            let mut map = sessions.lock().await;
            if let Some(session) = map.get_mut(&session_id) {
                session.initialized = true;
            }
        }
        // Transport spec: a notification (no `id`) is acknowledged with
        // 202 Accepted and an empty body — never with a JSON-RPC response.
        let mut res = StatusCode::ACCEPTED.into_response();
        set_session_header(res.headers_mut(), &session_id);
        return Ok(res);
    }

    if req.method == "initialize" {
        let mut map = sessions.lock().await;
        if let Some(session) = map.get_mut(&session_id) {
            session.initialized = true;
        }
    }

    let resp = crate::mcp::dispatch::handle_request(&req, &db).await;

    let body = Json(serde_json::to_value(&resp).unwrap_or(json!({
        "jsonrpc": "2.0",
        "id": null,
        "error": { "code": -32603, "message": "Internal error" }
    })));
    let mut res = body.into_response();
    set_session_header(res.headers_mut(), &session_id);

    Ok(res)
}

/// Attach the `Mcp-Session-Id` every response must carry so the client can
/// continue (or re-initialize) its session.
fn set_session_header(headers: &mut HeaderMap, session_id: &str) {
    headers.insert(
        "mcp-session-id",
        axum::http::HeaderValue::from_str(session_id)
            .unwrap_or(axum::http::HeaderValue::from_static("unknown")),
    );
}

// ═══ GET /api/mcp — SSE ═══

pub async fn mcp_sse_handler(
    State(state): State<T3AppState>,
    headers: HeaderMap,
) -> Result<impl IntoResponse, (StatusCode, Json<Value>)> {
    let sessions = get_session_store(&state);

    let session_id = headers
        .get("mcp-session-id")
        .and_then(|v| v.to_str().ok());

    if let Some(id) = session_id {
        let map = sessions.lock().await;
        if !map.contains_key(id) {
            return Err((StatusCode::NOT_FOUND, Json(json!({
                "jsonrpc": "2.0",
                "id": null,
                "error": { "code": -32001, "message": "Session not found" }
            }))));
        }
    }

    let endpoint = format!("/api/mcp?session={}", session_id.unwrap_or(""));
    let body = format!(
        "event: endpoint\ndata: {}\n\n",
        endpoint
    );

    let mut response_headers = HeaderMap::new();
    response_headers.insert("Content-Type", "text/event-stream".parse().unwrap());
    response_headers.insert("Cache-Control", "no-cache".parse().unwrap());

    Ok((response_headers, body))
}

// ═══ DELETE /api/mcp — Session termination ═══

pub async fn mcp_delete_handler(
    State(state): State<T3AppState>,
    headers: HeaderMap,
) -> Result<StatusCode, (StatusCode, Json<Value>)> {
    let sessions = get_session_store(&state);

    if let Some(id) = headers.get("mcp-session-id").and_then(|v| v.to_str().ok()) {
        let mut map = sessions.lock().await;
        map.remove(id);
    }

    Ok(StatusCode::NO_CONTENT)
}
