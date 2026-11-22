// AI Chat — External MCP Client.
//
// Connects to an external MCP server via Streamable HTTP transport,
// discovers its tools via tools/list, and routes tool calls.
//
// Protocol: https://spec.modelcontextprotocol.io/

use futures_util::StreamExt;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::RwLock;

use super::providers::ToolDef;
use super::types::AiError;

/// Cap on the connection phase (DNS/TCP/TLS). Shared with the LLM providers so a
/// blackholed host fails in seconds instead of burning the OS TCP timeout.
const CONNECT_TIMEOUT: Duration = super::providers::CONNECT_TIMEOUT;
/// `initialize` + `tools/list` must answer quickly — anything slower is a
/// misconfigured URL rather than a slow tool.
const HANDSHAKE_TIMEOUT: Duration = Duration::from_secs(15);
/// Tool calls may legitimately take a while (windowing, DB work).
const TOOL_TIMEOUT: Duration = Duration::from_secs(30);
/// Hard cap on a JSON-RPC response body.
const MAX_BODY_BYTES: usize = 1_000_000;

/// JSON-RPC endpoint for a configured MCP server URL.
///
/// Streamable-HTTP servers (spec 2025-03-26, e.g. `http://host:9001/mcp`) accept
/// JSON-RPC on the advertised URL itself, while the legacy HTTP+SSE transport
/// posts to `<url>/message`. Appending `/message` unconditionally turned
/// `…/mcp` into `…/mcp/message`, which 404s on every modern server.
pub(crate) fn rpc_url(base: &str) -> String {
    let base = base.trim_end_matches('/');
    if base.ends_with("/message") || base.ends_with("/mcp") {
        base.to_string()
    } else {
        format!("{}/message", base)
    }
}

/// Read a response body with a hard size cap. `content_length()` is absent on
/// chunked responses, so the old pre-parse check could be bypassed entirely.
async fn read_body_limited(res: reqwest::Response, limit: usize) -> Result<String, AiError> {
    let mut stream = res.bytes_stream();
    let mut buf: Vec<u8> = Vec::new();
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| AiError::Provider(format!("MCP read error: {}", e)))?;
        if buf.len() + chunk.len() > limit {
            return Err(AiError::Provider(format!(
                "MCP response too large (max {} KB)",
                limit / 1000
            )));
        }
        buf.extend_from_slice(&chunk);
    }
    Ok(String::from_utf8_lossy(&buf).into_owned())
}

/// Parse a JSON-RPC reply that may be plain JSON or SSE-framed (`data: {...}`),
/// which is what a Streamable-HTTP MCP server returns for a POST.
fn parse_rpc_reply(text: &str) -> Result<Value, AiError> {
    let trimmed = text.trim();
    if let Ok(value) = serde_json::from_str::<Value>(trimmed) {
        return Ok(value);
    }
    for line in trimmed.lines() {
        if let Some(data) = line.trim().strip_prefix("data:") {
            if let Ok(value) = serde_json::from_str::<Value>(data.trim()) {
                return Ok(value);
            }
        }
    }
    Err(AiError::Provider(
        "MCP response parse error: neither JSON nor SSE-framed JSON".to_string(),
    ))
}

/// Configuration for an external MCP server.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpServerConfig {
    pub id: String,
    pub name: String,
    pub url: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub api_key: Option<String>,
    pub enabled: bool,
}

/// A connected external MCP server.
pub struct McpClient {
    pub config: McpServerConfig,
    pub tools: Vec<ToolDef>,
    pub connected: bool,
    client: Client,
}

impl McpClient {
    pub fn new(config: McpServerConfig) -> Self {
        Self {
            config,
            tools: vec![],
            connected: false,
            client: Client::builder()
                .connect_timeout(CONNECT_TIMEOUT)
                .timeout(TOOL_TIMEOUT)
                .build()
                .unwrap_or_default(),
        }
    }

    /// Build a JSON-RPC POST with the transport headers and optional API key.
    fn post_rpc(&self, body: &Value, timeout: Duration) -> reqwest::RequestBuilder {
        let mut request = self
            .client
            .post(rpc_url(&self.config.url))
            .header("Content-Type", "application/json")
            // Streamable HTTP servers require both media types on the request.
            .header("Accept", "application/json, text/event-stream")
            .json(body)
            .timeout(timeout);

        if let Some(key) = self
            .config
            .api_key
            .as_deref()
            .map(str::trim)
            .filter(|k| !k.is_empty())
        {
            request = request.bearer_auth(key);
        }
        request
    }

    /// Connect to the MCP server and discover tools.
    /// Sends initialize → tools/list requests via JSON-RPC over HTTP.
    pub async fn connect(&mut self) -> Result<(), AiError> {
        // Step 1: initialize
        let init_body = json!({
            "jsonrpc": "2.0",
            "id": 1,
            "method": "initialize",
            "params": {
                "protocolVersion": "2024-11-05",
                "capabilities": {},
                "clientInfo": { "name": "t3000", "version": "1.0" }
            }
        });

        let res = self
            .post_rpc(&init_body, HANDSHAKE_TIMEOUT)
            .send()
            .await
            .map_err(|e| AiError::Provider(format!("MCP connect failed: {}", e)))?;

        if !res.status().is_success() {
            let status = res.status();
            let body = res.text().await.unwrap_or_default();
            return Err(AiError::Provider(format!(
                "MCP init returned {}: {}",
                status,
                body
            )));
        }

        // Step 2: tools/list
        let tools_body = json!({
            "jsonrpc": "2.0",
            "id": 2,
            "method": "tools/list",
            "params": {}
        });

        let res = self
            .post_rpc(&tools_body, HANDSHAKE_TIMEOUT)
            .send()
            .await
            .map_err(|e| AiError::Provider(format!("MCP tools/list failed: {}", e)))?;

        let json = parse_rpc_reply(&read_body_limited(res, MAX_BODY_BYTES).await?)?;

        let tool_list = json
            .get("result")
            .and_then(|r| r.get("tools"))
            .and_then(|t| t.as_array())
            .cloned()
            .unwrap_or_default();

        self.tools = tool_list
            .iter()
            .map(|t| ToolDef {
                name: t["name"].as_str().unwrap_or("").to_string(),
                description: t["description"].as_str().unwrap_or("").to_string(),
                input_schema: t.get("inputSchema").cloned().unwrap_or(json!({})),
            })
            .collect();

        self.connected = true;
        Ok(())
    }

    /// Call a tool on this external MCP server.
    /// Includes timeout, size limits, and response validation.
    pub async fn call_tool(
        &self,
        tool_name: &str,
        arguments: &Value,
    ) -> Result<Value, AiError> {
        let body = json!({
            "jsonrpc": "2.0",
            "id": 1,
            "method": "tools/call",
            "params": {
                "name": tool_name,
                "arguments": arguments
            }
        });

        let res = self
            .post_rpc(&body, TOOL_TIMEOUT)
            .send()
            .await
            .map_err(|e| {
                if e.is_timeout() {
                    AiError::Provider(format!("MCP tool '{}' timed out after 30s", tool_name))
                } else {
                    AiError::Provider(format!("MCP tool call failed: {}", e))
                }
            })?;

        let json = parse_rpc_reply(&read_body_limited(res, MAX_BODY_BYTES).await?)?;

        // Validate response has expected structure
        if let Some(err) = json.get("error") {
            return Err(AiError::Provider(format!(
                "MCP tool error: {}",
                err.get("message")
                    .and_then(|m| m.as_str())
                    .unwrap_or("unknown")
            )));
        }

        // Must have a "result" field
        match json.get("result") {
            Some(result) => Ok(result.clone()),
            None => Err(AiError::Provider(format!(
                "MCP response missing 'result' field for tool '{}'", tool_name
            ))),
        }
    }
}

/// Thread-safe manager for all external MCP clients.
pub struct McpClientManager {
    pub clients: Arc<RwLock<Vec<McpClient>>>,
}

impl McpClientManager {
    pub fn new() -> Self {
        Self {
            clients: Arc::new(RwLock::new(vec![])),
        }
    }

    /// Register a server and try to connect to it.
    ///
    /// The client is always registered (so it can be retried on the next
    /// activation/startup), but the connect failure is returned so callers can
    /// tell the user instead of silently pretending the server is usable.
    pub async fn add_server(&self, config: McpServerConfig) -> Result<(), AiError> {
        let mut client = McpClient::new(config.clone());

        let connect_result = client.connect().await;
        if let Err(e) = &connect_result {
            tracing::warn!("MCP server '{}' unreachable on add: {}", config.name, e);
        }

        let mut clients = self.clients.write().await;
        // Replace existing with same ID if present
        clients.retain(|c| c.config.id != config.id);
        clients.push(client);

        connect_result
    }

    /// Remove a server by ID.
    pub async fn remove_server(&self, id: &str) {
        let mut clients = self.clients.write().await;
        clients.retain(|c| c.config.id != id);
    }

    /// Remove all connected clients.
    pub async fn clear(&self) {
        let mut clients = self.clients.write().await;
        clients.clear();
    }

    /// Get all external tools from connected servers.
    pub async fn get_external_tools(&self) -> Vec<ToolDef> {
        let clients = self.clients.read().await;
        clients
            .iter()
            .filter(|c| c.config.enabled && c.connected)
            .flat_map(|c| c.tools.clone())
            .collect()
    }

    /// IDs of the servers that connected successfully.
    pub async fn connected_ids(&self) -> Vec<String> {
        self.clients
            .read()
            .await
            .iter()
            .filter(|c| c.connected)
            .map(|c| c.config.id.clone())
            .collect()
    }

    /// Check if a tool name belongs to an external client and call it.
    pub async fn try_call_external(
        &self,
        tool_name: &str,
        arguments: &Value,
    ) -> Option<Result<Value, AiError>> {
        let clients = self.clients.read().await;
        for client in clients.iter() {
            // Only route to servers that are actually active and connected.
            if !client.config.enabled || !client.connected {
                continue;
            }
            if client.tools.iter().any(|t| t.name == tool_name) {
                return Some(client.call_tool(tool_name, arguments).await);
            }
        }
        None
    }

    /// Get configs for all registered servers (for frontend).
    pub async fn get_configs(&self) -> Vec<McpServerConfig> {
        let clients = self.clients.read().await;
        clients.iter().map(|c| c.config.clone()).collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::{routing::post, Json, Router};
    use std::sync::{Arc, Mutex};

    #[test]
    fn rpc_url_honours_streamable_http_and_legacy_paths() {
        // Streamable HTTP server: the URL is the JSON-RPC endpoint.
        assert_eq!(rpc_url("http://h:1/mcp"), "http://h:1/mcp");
        assert_eq!(rpc_url("http://h:1/mcp/"), "http://h:1/mcp");
        // Legacy HTTP+SSE: already points at the message endpoint.
        assert_eq!(rpc_url("http://h:1/message"), "http://h:1/message");
        // Legacy SSE base URL still needs /message appended.
        assert_eq!(rpc_url("http://h:1/sse"), "http://h:1/sse/message");
    }

    #[test]
    fn parse_rpc_reply_accepts_json_and_sse_frames() {
        let plain = parse_rpc_reply(r#"{"jsonrpc":"2.0","id":1,"result":{}}"#).unwrap();
        assert_eq!(plain["id"], 1);

        let sse = parse_rpc_reply(
            "event: message\ndata: {\"jsonrpc\":\"2.0\",\"id\":2,\"result\":{\"tools\":[]}}\n\n",
        )
        .unwrap();
        assert_eq!(sse["id"], 2);

        assert!(parse_rpc_reply("definitely not json").is_err());
    }

    /// Records (authorization, accept) of every request the mock receives.
    async fn spawn_mock_mcp() -> (String, Arc<Mutex<Vec<(String, String)>>>) {
        let seen: Arc<Mutex<Vec<(String, String)>>> = Arc::new(Mutex::new(vec![]));
        let seen_handler = seen.clone();
        let app = Router::new().route(
            "/mcp",
            post(move |headers: axum::http::HeaderMap, body: String| {
                let seen = seen_handler.clone();
                async move {
                    let auth = headers
                        .get("authorization")
                        .and_then(|v| v.to_str().ok())
                        .unwrap_or("")
                        .to_string();
                    let accept = headers
                        .get("accept")
                        .and_then(|v| v.to_str().ok())
                        .unwrap_or("")
                        .to_string();
                    seen.lock().unwrap().push((auth, accept));

                    let request: Value = serde_json::from_str(&body).unwrap_or(Value::Null);
                    let id = request["id"].clone();
                    let payload = match request["method"].as_str().unwrap_or("") {
                        "initialize" => json!({ "jsonrpc": "2.0", "id": id, "result": { "protocolVersion": "2024-11-05" } }),
                        "tools/list" => json!({ "jsonrpc": "2.0", "id": id, "result": { "tools": [
                            { "name": "mock_echo", "description": "Echo", "inputSchema": { "type": "object" } }
                        ] } }),
                        "tools/call" => json!({ "jsonrpc": "2.0", "id": id, "result": { "content": [ { "type": "text", "text": "pong" } ] } }),
                        _ => json!({ "jsonrpc": "2.0", "id": id, "error": { "message": "unknown method" } }),
                    };
                    Json(payload)
                }
            }),
        );

        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap();
        tokio::spawn(async move {
            axum::serve(listener, app).await.unwrap();
        });
        (format!("http://{}/mcp", addr), seen)
    }

    fn config(id: &str, url: String, api_key: Option<&str>) -> McpServerConfig {
        McpServerConfig {
            id: id.to_string(),
            name: id.to_string(),
            url,
            api_key: api_key.map(|k| k.to_string()),
            enabled: true,
        }
    }

    #[tokio::test]
    async fn connect_uses_the_advertised_endpoint_and_sends_the_api_key() {
        let (url, seen) = spawn_mock_mcp().await;
        let mut client = McpClient::new(config("mock", url, Some("secret")));

        client.connect().await.expect("connect should succeed");
        assert!(client.connected);
        assert_eq!(client.tools.len(), 1);
        assert_eq!(client.tools[0].name, "mock_echo");

        let calls = seen.lock().unwrap().clone();
        assert_eq!(calls.len(), 2, "initialize + tools/list");
        assert!(
            calls.iter().all(|(auth, _)| auth == "Bearer secret"),
            "api_key must be sent: {:?}",
            calls
        );
        assert!(calls.iter().all(|(_, accept)| accept.contains("text/event-stream")));
    }

    #[tokio::test]
    async fn call_tool_returns_the_result_payload() {
        let (url, _seen) = spawn_mock_mcp().await;
        let mut client = McpClient::new(config("mock", url, None));
        client.connect().await.expect("connect");

        let result = client
            .call_tool("mock_echo", &json!({ "text": "hi" }))
            .await
            .expect("tool call");
        assert_eq!(result["content"][0]["text"], "pong");
    }

    #[tokio::test]
    async fn unreachable_server_reports_an_error_but_stays_registered() {
        let manager = McpClientManager::new();
        // Port 1 on loopback refuses immediately.
        let result = manager
            .add_server(config("dead", "http://127.0.0.1:1/mcp".to_string(), None))
            .await;

        assert!(result.is_err(), "connect failure must be reported");
        assert_eq!(manager.get_configs().await.len(), 1, "still registered");
        assert!(manager.get_external_tools().await.is_empty(), "no tools advertised");
        assert!(manager.try_call_external("mock_echo", &json!({})).await.is_none());
    }

    #[tokio::test]
    async fn oversized_bodies_are_rejected() {
        let app = Router::new().route(
            "/big",
            post(|| async { "x".repeat(200) }),
        );
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap();
        tokio::spawn(async move {
            axum::serve(listener, app).await.unwrap();
        });

        let response = reqwest::Client::new()
            .post(format!("http://{}/big", addr))
            .send()
            .await
            .unwrap();

        let error = read_body_limited(response, 50).await.unwrap_err();
        assert!(error.to_string().contains("too large"), "got: {}", error);
    }
}
