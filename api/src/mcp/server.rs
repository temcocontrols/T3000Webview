//! MCP Server — Streamable HTTP transport (JSON-RPC 2.0 + SSE + session management).

use axum::{
    extract::State,
    http::{StatusCode, HeaderMap},
    response::IntoResponse,
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
use crate::mcp::storage::{current_device_file, load_json_file, save_json_file};

// ═══ MCP API Logger ═══

pub(crate) fn mcp_log(msg: &str) {
    crate::server::debug_log(&format!("[MCP] {}", msg));
}

// ═══ Server Constants ═══

pub(crate) const SERVER_NAME: &str = "T3000 Haystack MCP";
pub(crate) const SERVER_VERSION: &str = "1.0.0";
pub(crate) const PROTOCOL_VERSION: &str = "2025-03-26";

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
        let _ = save_json_file(&current_device_file(), &json!({"serial": sn, "updated_at": Utc::now().to_rfc3339()})).await;
    }
}

/// Create MCP routes for the Axum router
pub fn create_mcp_routes() -> Router<T3AppState> {
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
            let state_file = current_device_file();
            let mut existing = if state_file.exists() {
                load_json_file(&state_file).await.unwrap_or(json!({}))
            } else {
                json!({})
            };
            let dev_name = body.get("device_name").and_then(|v| v.as_str()).map(|s| s.to_string());
            existing["ui_device"] = json!(s);
            existing["ui_device_name"] = json!(dev_name);
            existing["updated_at"] = json!(Utc::now().to_rfc3339());
            if existing.get("chat_device").is_none() {
                existing["chat_device"] = json!(null);
                existing["chat_device_name"] = json!(null);
                existing["confirmed_at"] = json!(null);
            }
            match save_json_file(&state_file, &existing).await {
                Ok(()) => {
                    info!("[MCP] ui_device set to serial={} name={:?}", s, dev_name);
                    Json(json!({"ok": true, "ui_device": s, "ui_device_name": dev_name, "chat_device": existing["chat_device"]})).into_response()
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
) -> Result<impl IntoResponse, (StatusCode, Json<Value>)> {
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
        let mut response_headers = HeaderMap::new();
        response_headers.insert(
            "mcp-session-id",
            axum::http::HeaderValue::from_str(&session_id).unwrap_or(
                axum::http::HeaderValue::from_static("unknown")
            ),
        );
        return Ok((response_headers, Json(json!({}))));
    }

    if req.method == "initialize" {
        let mut map = sessions.lock().await;
        if let Some(session) = map.get_mut(&session_id) {
            session.initialized = true;
        }
    }

    let resp = crate::mcp::dispatch::handle_request(&req, &db).await;

    let mut response_headers = HeaderMap::new();
    response_headers.insert(
        "mcp-session-id",
        axum::http::HeaderValue::from_str(&session_id).unwrap_or(
            axum::http::HeaderValue::from_static("unknown")
        ),
    );

    let body = Json(serde_json::to_value(&resp).unwrap_or(json!({
        "jsonrpc": "2.0",
        "id": null,
        "error": { "code": -32603, "message": "Internal error" }
    })));

    Ok((response_headers, body))
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
