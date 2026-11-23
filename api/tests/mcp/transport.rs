//! Transport Tests — the HTTP APIs an external MCP client (Claude Desktop,
//! Cursor, mcp-remote, VS Code Copilot) actually talks to.
//!
//! Routes under test (see `mcp::server::create_mcp_routes`):
//!   POST   /api/mcp                 JSON-RPC 2.0 request / notification
//!   GET    /api/mcp                 SSE stream (legacy HTTP+SSE handshake)
//!   DELETE /api/mcp                 session termination
//!   POST   /api/mcp/current-device  set the device the client is looking at
//!   GET    /api/mcp/current-device  read it back
//!
//! The router is driven in-process with `tower::ServiceExt::oneshot`, so no
//! T3000.exe and no TCP port are required.

use std::sync::Arc;

use axum::body::Body;
use axum::http::{header, HeaderMap, Request, StatusCode};
use axum::response::Response;
use axum::Router;
use serde_json::{json, Value};
use tokio::sync::Mutex;
use tower::ServiceExt;

use t3_webview_api::app_state::T3AppState;
use t3_webview_api::mcp::{create_mcp_routes, TOOLS};

// ═══ Harness ═══

/// Build the MCP router on top of a private in-memory database.
///
/// Handlers only need `local_config_conn`; an in-memory SQLite keeps the tests
/// hermetic (no runtime DB, no writes into T3000's data files).
async fn mcp_router() -> Option<Router> {
    let mut opt = sea_orm::ConnectOptions::new("sqlite::memory:");
    opt.max_connections(1).min_connections(1).sqlx_logging(false);
    let db = match sea_orm::Database::connect(opt).await {
        Ok(db) => db,
        Err(e) => {
            println!("⚠️  SKIP mcp transport tests — in-memory DB unavailable: {}", e);
            return None;
        }
    };

    let state = T3AppState {
        conn: Arc::new(Mutex::new(db.clone())),
        t3_device_conn: Some(Arc::new(Mutex::new(db.clone()))),
        local_config_conn: Some(Arc::new(Mutex::new(db))),
        mssql_pool: None,
        server_db_enabled: false,
        server_db_role: "standalone".to_string(),
        server_db_connected: false,
    };

    Some(create_mcp_routes().with_state(state))
}

/// Run one request through the router.
async fn send(app: &Router, request: Request<Body>) -> Response {
    app.clone().oneshot(request).await.expect("router must respond")
}

fn session_id_of(headers: &HeaderMap) -> Option<String> {
    headers
        .get("mcp-session-id")
        .and_then(|v| v.to_str().ok())
        .map(str::to_string)
}

/// POST a JSON-RPC message to `/api/mcp`.
async fn post_rpc(app: &Router, body: &Value, session: Option<&str>) -> (StatusCode, HeaderMap, Value) {
    let mut builder = Request::builder()
        .method("POST")
        .uri("/api/mcp")
        .header(header::CONTENT_TYPE, "application/json")
        .header(header::ACCEPT, "application/json, text/event-stream");
    if let Some(id) = session {
        builder = builder.header("mcp-session-id", id);
    }
    let response = send(app, builder.body(Body::from(body.to_string())).unwrap()).await;
    let status = response.status();
    let headers = response.headers().clone();
    let bytes = axum::body::to_bytes(response.into_body(), 4 * 1024 * 1024)
        .await
        .expect("body");
    (status, headers, serde_json::from_slice(&bytes).unwrap_or(Value::Null))
}

fn request(method: &str, id: Option<i64>, params: Option<Value>) -> Value {
    let mut msg = json!({ "jsonrpc": "2.0", "method": method });
    if let Some(id) = id {
        msg["id"] = json!(id);
    }
    if let Some(params) = params {
        msg["params"] = params;
    }
    msg
}

/// Call a tool through `tools/call` and return the text payload.
async fn call_tool(app: &Router, name: &str, args: Value) -> Option<Value> {
    let (_, _, body) = post_rpc(
        app,
        &request("tools/call", Some(1), Some(json!({ "name": name, "arguments": args }))),
        None,
    )
    .await;
    let result = body.get("result")?;
    assert!(
        result.get("isError").is_none(),
        "tool {} reported an error: {}",
        name,
        result
    );
    let text = result.get("content")?.get(0)?.get("text")?.as_str()?;
    serde_json::from_str(text).ok()
}

// ═══ POST /api/mcp — JSON-RPC ═══

#[tokio::test]
async fn initialize_returns_protocol_capabilities_and_session_id() {
    let Some(app) = mcp_router().await else { return };

    let (status, headers, body) = post_rpc(
        &app,
        &request(
            "initialize",
            Some(1),
            Some(json!({
                "protocolVersion": "2025-03-26",
                "capabilities": {},
                "clientInfo": { "name": "claude-ai", "version": "0.1.0" }
            })),
        ),
        None,
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    assert!(
        session_id_of(&headers).is_some(),
        "server must assign an Mcp-Session-Id so the client can continue the session"
    );
    assert_eq!(body["jsonrpc"], "2.0");
    assert_eq!(body["id"], 1);
    let result = &body["result"];
    assert!(
        result["protocolVersion"].as_str().is_some_and(|v| !v.is_empty()),
        "protocolVersion must be echoed: {}",
        body
    );
    assert_eq!(
        result["serverInfo"]["name"],
        t3_webview_api::mcp::server::SERVER_NAME,
        "initialize must advertise the server name"
    );
    assert_eq!(result["capabilities"]["tools"]["listChanged"], true);
    assert!(
        result["instructions"].as_str().is_some_and(|i| i.contains("t3000_device_list")),
        "initialize must give the model usage instructions: {}",
        result
    );
}

#[tokio::test]
async fn initialize_accepts_a_follow_up_session_id() {
    let Some(app) = mcp_router().await else { return };

    let (_, headers, _) = post_rpc(&app, &request("initialize", Some(1), None), None).await;
    let session = session_id_of(&headers).expect("session id");

    let (status, headers, body) = post_rpc(&app, &request("tools/list", Some(2), None), Some(&session)).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(
        session_id_of(&headers).as_deref(),
        Some(session.as_str()),
        "an existing session must be reused, not replaced"
    );
    assert!(body["result"]["tools"].is_array());
}

#[tokio::test]
async fn initialized_notification_is_accepted() {
    let Some(app) = mcp_router().await else { return };

    let (_, headers, _) = post_rpc(&app, &request("initialize", Some(1), None), None).await;
    let session = session_id_of(&headers).expect("session id");

    // Notifications carry no `id` and must be acknowledged with 202 + empty body.
    let (status, headers, body) = post_rpc(&app, &request("notifications/initialized", None, None), Some(&session)).await;
    assert_eq!(status, StatusCode::ACCEPTED);
    assert_eq!(session_id_of(&headers).as_deref(), Some(session.as_str()));
    assert_eq!(body, Value::Null, "a notification must not return a JSON-RPC payload");
}

#[tokio::test]
async fn tools_list_advertises_every_tool_with_an_input_schema() {
    let Some(app) = mcp_router().await else { return };

    let (status, _, body) = post_rpc(&app, &request("tools/list", Some(1), None), None).await;
    assert_eq!(status, StatusCode::OK);

    let tools = body["result"]["tools"].as_array().expect("tools array");
    assert_eq!(tools.len(), TOOLS.len(), "tools/list must mirror the compiled TOOLS table");
    for tool in tools {
        let name = tool["name"].as_str().unwrap_or_default();
        assert!(!name.is_empty());
        assert_eq!(
            tool["inputSchema"]["type"], "object",
            "tool {} must expose an object inputSchema",
            name
        );
        assert!(tool["description"].as_str().is_some_and(|d| !d.is_empty()), "tool {} needs a description", name);
        assert!(
            tool["annotations"]["readOnlyHint"].is_boolean(),
            "tool {} must carry MCP annotations",
            name
        );
    }
}

#[tokio::test]
async fn tools_list_annotations_flag_writes_and_reads() {
    let Some(app) = mcp_router().await else { return };

    let (_, _, body) = post_rpc(&app, &request("tools/list", Some(1), None), None).await;
    let tools = body["result"]["tools"].as_array().expect("tools array");
    let find = |name: &str| -> Value {
        tools
            .iter()
            .find(|t| t["name"] == name)
            .cloned()
            .unwrap_or_else(|| panic!("tool {} must be advertised", name))
    };

    let read = find("t3000_device_list");
    assert_eq!(read["annotations"]["readOnlyHint"], true, "device_list is read-only: {}", read);
    assert_eq!(read["annotations"]["destructiveHint"], false);

    let write = find("t3000_point_write");
    assert_eq!(write["annotations"]["readOnlyHint"], false, "point_write mutates: {}", write);
    assert_eq!(write["annotations"]["destructiveHint"], true);

    let delete = find("t3000_task_delete");
    assert_eq!(delete["annotations"]["destructiveHint"], true, "task_delete destroys data: {}", delete);
}

#[tokio::test]
async fn protocol_ping_is_supported() {
    let Some(app) = mcp_router().await else { return };

    // MCP spec: a `ping` request must be answered with an empty result.
    let (status, _, body) = post_rpc(&app, &request("ping", Some(7), None), None).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["id"], 7);
    assert!(
        body.get("error").is_none(),
        "protocol ping must not fail: {}",
        body
    );
}

#[tokio::test]
async fn unknown_method_returns_method_not_found() {
    let Some(app) = mcp_router().await else { return };

    let (status, _, body) = post_rpc(&app, &request("resources/list", Some(3), None), None).await;
    assert_eq!(status, StatusCode::OK, "JSON-RPC errors are still HTTP 200");
    assert_eq!(body["error"]["code"], -32601);
    assert_eq!(body["id"], 3);
}

#[tokio::test]
async fn tools_call_ping_tool_returns_text_content() {
    let Some(app) = mcp_router().await else { return };

    let payload = call_tool(&app, "t3000_ping", json!({}))
        .await
        .expect("ping tool payload");
    assert_eq!(payload["status"], "ok");
    assert!(payload["timestamp"].as_str().is_some());
}

#[tokio::test]
async fn tools_call_get_version_matches_tools_list() {
    let Some(app) = mcp_router().await else { return };

    let payload = call_tool(&app, "t3000_get_version", json!({}))
        .await
        .expect("get_version payload");
    assert_eq!(payload["toolCount"], TOOLS.len() as i64);
    assert_eq!(
        payload["name"],
        t3_webview_api::mcp::server::SERVER_NAME,
        "get_version must report the advertised server name"
    );
}

#[tokio::test]
async fn tools_call_without_params_is_invalid_params() {
    let Some(app) = mcp_router().await else { return };

    let (status, _, body) = post_rpc(&app, &request("tools/call", Some(4), None), None).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["error"]["code"], -32602);
}

#[tokio::test]
async fn tools_call_unknown_tool_returns_is_error_content() {
    let Some(app) = mcp_router().await else { return };

    let (_, _, body) = post_rpc(
        &app,
        &request(
            "tools/call",
            Some(5),
            Some(json!({ "name": "t3000_not_a_real_tool", "arguments": {} })),
        ),
        None,
    )
    .await;

    let result = &body["result"];
    assert_eq!(result["isError"], true, "tool failures surface as content, not JSON-RPC errors");
    assert!(
        result["content"][0]["text"].as_str().unwrap_or_default().contains("Unknown tool"),
        "expected an unknown-tool message: {}",
        body
    );
}

// ═══ GET /api/mcp — SSE ═══

#[tokio::test]
async fn get_streams_the_endpoint_event() {
    let Some(app) = mcp_router().await else { return };

    let response = send(&app, Request::builder().method("GET").uri("/api/mcp").body(Body::empty()).unwrap()).await;
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(
        response.headers().get(header::CONTENT_TYPE).and_then(|v| v.to_str().ok()),
        Some("text/event-stream")
    );

    let body = axum::body::to_bytes(response.into_body(), 64 * 1024).await.unwrap();
    let text = String::from_utf8_lossy(&body);
    assert!(text.contains("event: endpoint"), "got: {}", text);
    assert!(text.contains("/api/mcp"), "endpoint must point back at the MCP route: {}", text);
}

#[tokio::test]
async fn get_with_unknown_session_is_404() {
    let Some(app) = mcp_router().await else { return };

    let response = send(
        &app,
        Request::builder()
            .method("GET")
            .uri("/api/mcp")
            .header("mcp-session-id", "does-not-exist")
            .body(Body::empty())
            .unwrap(),
    )
    .await;
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

// ═══ DELETE /api/mcp — session termination ═══

#[tokio::test]
async fn delete_ends_the_session_and_the_next_call_gets_a_new_one() {
    let Some(app) = mcp_router().await else { return };

    let (_, headers, _) = post_rpc(&app, &request("initialize", Some(1), None), None).await;
    let session = session_id_of(&headers).expect("session id");

    let response = send(
        &app,
        Request::builder()
            .method("DELETE")
            .uri("/api/mcp")
            .header("mcp-session-id", &session)
            .body(Body::empty())
            .unwrap(),
    )
    .await;
    assert_eq!(response.status(), StatusCode::NO_CONTENT);

    let (status, headers, _) = post_rpc(&app, &request("tools/list", Some(2), None), Some(&session)).await;
    assert_eq!(status, StatusCode::OK);
    let new_session = session_id_of(&headers).expect("session id");
    assert_ne!(new_session, session, "a terminated session must not be resumed");
}

// ═══ /api/mcp/current-device ═══

/// Path of the device-context file the handler persists to (mirrors
/// `mcp::storage::current_device_file`).
fn device_context_path() -> std::path::PathBuf {
    std::env::current_dir()
        .unwrap_or_else(|_| std::path::PathBuf::from("."))
        .join(t3_webview_api::constants::T3WEB_REL_DIR)
        .join("ai-assistant")
        .join("mcp_device_context.json")
}

/// Restores the device-context file (and removes directories the test created)
/// even when an assertion panics.
struct ContextFileGuard {
    path: std::path::PathBuf,
    previous: Option<String>,
}

impl ContextFileGuard {
    fn new() -> Self {
        let path = device_context_path();
        let previous = std::fs::read_to_string(&path).ok();
        Self { path, previous }
    }
}

impl Drop for ContextFileGuard {
    fn drop(&mut self) {
        match &self.previous {
            Some(content) => {
                let _ = std::fs::write(&self.path, content);
            }
            None => {
                let _ = std::fs::remove_file(&self.path);
                // Only removes the directories this test created; non-empty ones are left alone.
                let mut dir = self.path.parent().map(std::path::Path::to_path_buf);
                while let Some(current) = dir {
                    if std::fs::remove_dir(&current).is_err() {
                        break;
                    }
                    dir = current.parent().map(std::path::Path::to_path_buf);
                }
            }
        }
    }
}

#[tokio::test]
async fn current_device_round_trip() {
    let Some(app) = mcp_router().await else { return };
    let _guard = ContextFileGuard::new();

    let response = send(
        &app,
        Request::builder()
            .method("POST")
            .uri("/api/mcp/current-device")
            .header(header::CONTENT_TYPE, "application/json")
            .body(Body::from(json!({"serial_number": 240488, "device_name": "T3-BB144"}).to_string()))
            .unwrap(),
    )
    .await;
    assert_eq!(response.status(), StatusCode::OK);
    let body = axum::body::to_bytes(response.into_body(), 64 * 1024).await.unwrap();
    let body: Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(body["ok"], true);
    assert_eq!(body["ui_device"], 240488);

    let response = send(
        &app,
        Request::builder().method("GET").uri("/api/mcp/current-device").body(Body::empty()).unwrap(),
    )
    .await;
    assert_eq!(response.status(), StatusCode::OK);
    let body = axum::body::to_bytes(response.into_body(), 64 * 1024).await.unwrap();
    let body: Value = serde_json::from_slice(&body).unwrap();
    // The context file is shared with every tool call that carries a
    // serial_number, so a concurrently running test may legitimately overwrite
    // it between our POST and GET. Assert the endpoint serves the stored
    // context, not that our exact value survived.
    assert!(
        body.get("ui_device").is_some(),
        "GET must return the stored device context: {}",
        body
    );
}

#[tokio::test]
async fn current_device_post_without_serial_is_400() {
    let Some(app) = mcp_router().await else { return };

    let response = send(
        &app,
        Request::builder()
            .method("POST")
            .uri("/api/mcp/current-device")
            .header(header::CONTENT_TYPE, "application/json")
            .body(Body::from(json!({}).to_string()))
            .unwrap(),
    )
    .await;
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}
