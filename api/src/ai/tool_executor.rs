// AI Chat — Tool Executor.
//
// Bridges the AI chat SSE handler to the existing MCP tool dispatch.
// Constructs a synthetic JSON-RPC request, calls the MCP handler directly,
// and returns the result to the SSE stream.
//
// Phase 2: Full MCP dispatch via handle_request().
// Later: can be upgraded to direct function calls after mcp.rs refactor.

use serde_json::Value;
use tracing::{info, error};

use crate::app_state::T3AppState;
use crate::haystack::mcp;

/// Execute an MCP tool by name with JSON arguments.
/// Returns the result as a JSON Value, or an error string.
pub async fn execute_tool(
    name: &str,
    arguments: &str,
    state: &T3AppState,
) -> Result<Value, String> {
    let args: Value = serde_json::from_str(arguments).map_err(|e| {
        format!("Failed to parse tool arguments: {}", e)
    })?;

    info!("[AI] Executing tool: {} with args: {}", name, arguments);

    // Get DB connection from app state
    let db = match mcp::get_db(state).await {
        Ok(db) => db,
        Err((_, err_body)) => {
            let msg = err_body
                .get("error")
                .and_then(|e| e.as_str())
                .unwrap_or("Database connection unavailable");
            return Err(msg.to_string());
        }
    };

    // Build synthetic JSON-RPC request
    let req = mcp::JsonRpcRequest {
        jsonrpc: "2.0".to_string(),
        id: Some(Value::String("ai-chat-tool".to_string())),
        method: name.to_string(),
        params: Some(args),
    };

    // Dispatch to MCP handler
    let response = mcp::handle_request(&req, &db).await;

    // Extract result or error
    match (response.result, response.error) {
        (Some(result), _) => {
            info!("[AI] Tool {} succeeded", name);
            Ok(result)
        }
        (_, Some(err)) => {
            let msg = format!("Tool {} failed: {} (code {})", name, err.message, err.code);
            error!("[AI] {}", msg);
            Err(msg)
        }
        (None, None) => {
            Err(format!("Tool {} returned no result and no error", name))
        }
    }
}
