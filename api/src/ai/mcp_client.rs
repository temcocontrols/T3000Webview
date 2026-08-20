// AI Chat — External MCP Client.
//
// Connects to an external MCP server via Streamable HTTP transport,
// discovers its tools via tools/list, and routes tool calls.
//
// Protocol: https://spec.modelcontextprotocol.io/

use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::sync::Arc;
use tokio::sync::RwLock;

use super::providers::ToolDef;
use super::types::AiError;

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
            client: Client::new(),
        }
    }

    /// Connect to the MCP server and discover tools.
    /// Sends initialize → tools/list requests via JSON-RPC over HTTP.
    pub async fn connect(&mut self) -> Result<(), AiError> {
        let url = self.config.url.trim_end_matches('/');

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
            .client
            .post(&format!("{}/message", url))
            .header("Content-Type", "application/json")
            .json(&init_body)
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
            .client
            .post(&format!("{}/message", url))
            .header("Content-Type", "application/json")
            .json(&tools_body)
            .send()
            .await
            .map_err(|e| AiError::Provider(format!("MCP tools/list failed: {}", e)))?;

        let json: Value = res
            .json()
            .await
            .map_err(|e| AiError::Provider(format!("MCP parse error: {}", e)))?;

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
        let url = self.config.url.trim_end_matches('/');

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
            .client
            .post(&format!("{}/message", url))
            .header("Content-Type", "application/json")
            .json(&body)
            .timeout(std::time::Duration::from_secs(30))
            .send()
            .await
            .map_err(|e| {
                if e.is_timeout() {
                    AiError::Provider(format!("MCP tool '{}' timed out after 30s", tool_name))
                } else {
                    AiError::Provider(format!("MCP tool call failed: {}", e))
                }
            })?;

        // Validate response size before parsing (1MB limit)
        if let Some(len) = res.content_length() {
            if len > 1_000_000 {
                return Err(AiError::Provider(format!(
                    "MCP response too large: {} bytes (max 1MB)", len
                )));
            }
        }

        let json: Value = res
            .json()
            .await
            .map_err(|e| AiError::Provider(format!("MCP response parse error: {}", e)))?;

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

    /// Add and connect a new MCP server. Does not fail if unreachable —
    /// the server is registered and will be tried again on next startup.
    pub async fn add_server(&self, config: McpServerConfig) -> Result<(), AiError> {
        let mut client = McpClient::new(config.clone());

        // Try connecting but don't fail — server may be offline
        if let Err(e) = client.connect().await {
            tracing::warn!("MCP server '{}' unreachable on add: {}", config.name, e);
        }

        let mut clients = self.clients.write().await;
        // Replace existing with same ID if present
        clients.retain(|c| c.config.id != config.id);
        clients.push(client);
        Ok(())
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

    /// Check if a tool name belongs to an external client and call it.
    pub async fn try_call_external(
        &self,
        tool_name: &str,
        arguments: &Value,
    ) -> Option<Result<Value, AiError>> {
        let clients = self.clients.read().await;
        for client in clients.iter() {
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
