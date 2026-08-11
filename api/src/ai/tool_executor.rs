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

    // (routes.rs logs tool execution with timing)

    // Try external MCP servers first
    if let Some(result) = super::routes::MCP_CLIENT_MANAGER
        .try_call_external(name, &args)
        .await
    {
        return result.map_err(|e| e.to_string());
    }

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

    // Call the real tool executor directly (not the JSON-RPC router)
    let result_str = mcp::execute_tool(name, &args, &db).await
        .map_err(|e| format!("Tool {} failed: {}", name, e))?;

    // (routes.rs logs success with timing)

    // Parse result string back into JSON for the LLM
    serde_json::from_str(&result_str)
        .or_else(|_| Ok(Value::String(result_str)))
}
