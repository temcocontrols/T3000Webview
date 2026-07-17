// MCP (Model Context Protocol) Server — JSON-RPC 2.0 over HTTP
// Exposes Haystack tagging tools for LLM agents via POST /api/mcp
//
// Protocol spec: https://spec.modelcontextprotocol.io/
// Tools exposed:
//   haystack_list_tags      — List all known tags with metadata
//   haystack_get_point_tags — Get tags for specific points
//   haystack_search_points  — Search points by tag filter
//   haystack_auto_tag       — Run auto-tagging on devices
//   haystack_preview_tags   — Preview auto-tagging results
//   haystack_list_rules     — List auto-tagging rules
//   haystack_get_brick_class— Get Brick class for a point

use axum::{extract::State, http::StatusCode, routing::post, Json, Router};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sea_orm::ConnectionTrait;

use crate::app_state::T3AppState;
use crate::haystack::auto_tagging_service as ats;
use crate::haystack::tags_service as ts;

// ═══ JSON-RPC Types ═══

#[derive(Debug, Deserialize)]
struct JsonRpcRequest {
    jsonrpc: String,
    #[serde(default)]
    id: Option<Value>,
    method: String,
    #[serde(default)]
    params: Option<Value>,
}

#[derive(Debug, Serialize)]
struct JsonRpcResponse {
    jsonrpc: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    id: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    result: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<JsonRpcError>,
}

#[derive(Debug, Serialize)]
struct JsonRpcError {
    code: i32,
    message: String,
}

// ═══ Tool Definitions ═══

lazy_static::lazy_static! {
    static ref TOOLS: Vec<ToolDef> = vec![
    ToolDef {
        name: "haystack_list_tags",
        description: "List all Haystack tags in the system with their categories, documentation, and usage counts. Use to discover available tags.",
        input_schema: json!({
            "type": "object",
            "properties": {
                "filter": {
                    "type": "string",
                    "description": "Optional category filter (haystack, brick, custom)"
                }
            }
        }),
    },
    ToolDef {
        name: "haystack_get_point_tags",
        description: "Get all Haystack tags assigned to specific points by serial number and point type.",
        input_schema: json!({
            "type": "object",
            "properties": {
                "serial_numbers": {
                    "type": "array",
                    "items": { "type": "integer" },
                    "description": "List of device serial numbers"
                },
                "point_type": {
                    "type": "string",
                    "description": "Optional: filter by point type (INPUT, OUTPUT, VARIABLE)"
                }
            },
            "required": ["serial_numbers"]
        }),
    },
    ToolDef {
        name: "haystack_search_points",
        description: "Search for points that have specific tags. Returns matching point metadata with full tag sets.",
        input_schema: json!({
            "type": "object",
            "properties": {
                "tags": {
                    "type": "array",
                    "items": { "type": "string" },
                    "description": "Tags to search for (points must have ALL specified tags)"
                },
                "serial_numbers": {
                    "type": "array",
                    "items": { "type": "integer" },
                    "description": "Optional: restrict search to these devices"
                },
                "point_types": {
                    "type": "array",
                    "items": { "type": "string" },
                    "description": "Optional: restrict to these point types"
                }
            },
            "required": ["tags"]
        }),
    },
    ToolDef {
        name: "haystack_auto_tag",
        description: "Run auto-tagging on specified devices. Applies range rules (based on point_type, digital/analog, range_value) first, then regex rules from labels. Derives Haystack tags and Brick classes. Returns count of points tagged.",
        input_schema: json!({
            "type": "object",
            "properties": {
                "serial_numbers": {
                    "type": "array",
                    "items": { "type": "integer" },
                    "description": "Device serial numbers to auto-tag"
                }
            },
            "required": ["serial_numbers"]
        }),
    },
    ToolDef {
        name: "haystack_preview_tags",
        description: "Preview what tags and Brick classes would be assigned by auto-tagging without actually writing to the database. Useful for testing rules before applying.",
        input_schema: json!({
            "type": "object",
            "properties": {
                "serial_numbers": {
                    "type": "array",
                    "items": { "type": "integer" },
                    "description": "Device serial numbers to preview"
                }
            },
            "required": ["serial_numbers"]
        }),
    },
    ToolDef {
        name: "haystack_list_rules",
        description: "List all auto-tagging rules with their patterns, categories, and whether they are enabled.",
        input_schema: json!({
            "type": "object",
            "properties": {}
        }),
    },
    ToolDef {
        name: "haystack_get_brick_class",
        description: "Get the Brick ontology class assigned to specific points. Returns the Brick class name (e.g., Supply_Air_Temperature_Sensor) if one has been auto-tagged.",
        input_schema: json!({
            "type": "object",
            "properties": {
                "serial_numbers": {
                    "type": "array",
                    "items": { "type": "integer" },
                    "description": "Device serial numbers to query"
                }
            },
            "required": ["serial_numbers"]
        }),
    },
    ];
}

struct ToolDef {
    name: &'static str,
    description: &'static str,
    input_schema: Value,
}

// ═══ MCP Server (HTTP) ═══

const SERVER_NAME: &str = "T3000 Haystack MCP";
const SERVER_VERSION: &str = "1.0.0";

/// Helper to get DB from T3AppState
async fn get_db(state: &T3AppState) -> Result<sea_orm::DatabaseConnection, (StatusCode, Json<Value>)> {
    if let Some(conn) = &state.local_config_conn {
        return Ok(conn.lock().await.clone());
    }
    Err((StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Local database connection not available"}))))
}

/// POST /api/mcp — JSON-RPC 2.0 endpoint
pub async fn mcp_handler(
    State(state): State<T3AppState>,
    Json(body): Json<Value>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let db = get_db(&state).await?;

    let req: JsonRpcRequest = serde_json::from_value(body).map_err(|e| {
        (StatusCode::BAD_REQUEST, Json(json!({
            "jsonrpc": "2.0",
            "id": null,
            "error": { "code": -32700, "message": format!("Parse error: {}", e) }
        })))
    })?;

    let resp = handle_request(&req, &db).await;
    Ok(Json(serde_json::to_value(resp).unwrap_or(json!({
        "jsonrpc": "2.0",
        "id": null,
        "error": { "code": -32603, "message": "Internal error" }
    }))))
}

/// Create MCP routes for the Axum router
pub fn create_mcp_routes() -> Router<T3AppState> {
    Router::new()
        .route("/api/mcp", post(mcp_handler))
}

async fn handle_request(req: &JsonRpcRequest, db: &sea_orm::DatabaseConnection) -> JsonRpcResponse {
    match req.method.as_str() {
        "initialize" => handle_initialize(req),
        "tools/list" => handle_tools_list(req),
        "tools/call" => handle_tools_call(req, db).await,
        _ => JsonRpcResponse {
            jsonrpc: "2.0".into(),
            id: req.id.clone(),
            result: None,
            error: Some(JsonRpcError {
                code: -32601,
                message: format!("Method not found: {}", req.method),
            }),
        },
    }
}

fn handle_initialize(req: &JsonRpcRequest) -> JsonRpcResponse {
    JsonRpcResponse {
        jsonrpc: "2.0".into(),
        id: req.id.clone(),
        result: Some(json!({
            "protocolVersion": "2024-11-05",
            "serverInfo": {
                "name": SERVER_NAME,
                "version": SERVER_VERSION
            },
            "capabilities": {
                "tools": {}
            }
        })),
        error: None,
    }
}

fn handle_tools_list(req: &JsonRpcRequest) -> JsonRpcResponse {
    let tools: Vec<Value> = TOOLS
        .iter()
        .map(|t| {
            json!({
                "name": t.name,
                "description": t.description,
                "inputSchema": t.input_schema
            })
        })
        .collect();

    JsonRpcResponse {
        jsonrpc: "2.0".into(),
        id: req.id.clone(),
        result: Some(json!({ "tools": tools })),
        error: None,
    }
}

async fn handle_tools_call(req: &JsonRpcRequest, db: &sea_orm::DatabaseConnection) -> JsonRpcResponse {
    let params = match &req.params {
        Some(Value::Object(obj)) => obj.clone(),
        _ => {
            return JsonRpcResponse {
                jsonrpc: "2.0".into(),
                id: req.id.clone(),
                result: None,
                error: Some(JsonRpcError { code: -32602, message: "Invalid params".into() }),
            };
        }
    };

    let tool_name = params.get("name").and_then(|v| v.as_str()).unwrap_or("");
    let arguments = params.get("arguments").cloned().unwrap_or(Value::Null);

    let result = execute_tool(tool_name, &arguments, db).await;

    match result {
        Ok(content) => JsonRpcResponse {
            jsonrpc: "2.0".into(),
            id: req.id.clone(),
            result: Some(json!({
                "content": [
                    {
                        "type": "text",
                        "text": content
                    }
                ]
            })),
            error: None,
        },
        Err(e) => JsonRpcResponse {
            jsonrpc: "2.0".into(),
            id: req.id.clone(),
            result: None,
            error: Some(JsonRpcError { code: -32000, message: e }),
        },
    }
}

async fn execute_tool(
    name: &str,
    args: &Value,
    db: &sea_orm::DatabaseConnection,
) -> Result<String, String> {
    match name {
        "haystack_list_tags" => {
            let filter = args.get("filter").and_then(|v| v.as_str());
            let tags = ts::list_tags(db, filter)
                .await
                .map_err(|e| format!("Failed to list tags: {}", e))?;
            serde_json::to_string_pretty(&json!({
                "tags": tags,
                "total": tags.len()
            }))
            .map_err(|e| format!("Serialize error: {}", e))
        }

        "haystack_get_point_tags" => {
            let serial_numbers: Vec<i32> = args
                .get("serial_numbers")
                .and_then(|v| v.as_array())
                .map(|a| a.iter().filter_map(|v| v.as_i64().map(|n| n as i32)).collect())
                .unwrap_or_default();
            let point_type = args.get("point_type").and_then(|v| v.as_str());

            let entries = ts::get_point_tags(db, &serial_numbers, point_type)
                .await
                .map_err(|e| format!("Failed to get point tags: {}", e))?;

            serde_json::to_string_pretty(&json!({
                "entries": entries,
                "total": entries.len()
            }))
            .map_err(|e| format!("Serialize error: {}", e))
        }

        "haystack_search_points" => {
            let tags: Vec<String> = args
                .get("tags")
                .and_then(|v| v.as_array())
                .map(|a| a.iter().filter_map(|v| v.as_str().map(String::from)).collect())
                .unwrap_or_default();
            let device_serials: Option<Vec<i32>> = args
                .get("serial_numbers")
                .and_then(|v| v.as_array())
                .map(|a| a.iter().filter_map(|v| v.as_i64().map(|n| n as i32)).collect());
            let point_types: Option<Vec<String>> = args
                .get("point_types")
                .and_then(|v| v.as_array())
                .map(|a| a.iter().filter_map(|v| v.as_str().map(String::from)).collect());

            let req = ts::SearchPointsRequest {
                device_serials,
                point_types,
                tag_filter: Some(tags),
                label_filter: None,
                units_filter: None,
            };
            let entries = ts::search_points(db, &req)
                .await
                .map_err(|e| format!("Failed to search: {}", e))?;

            serde_json::to_string_pretty(&json!({
                "entries": entries,
                "total": entries.len()
            }))
            .map_err(|e| format!("Serialize error: {}", e))
        }

        "haystack_auto_tag" => {
            let serial_numbers: Vec<i32> = args
                .get("serial_numbers")
                .and_then(|v| v.as_array())
                .map(|a| a.iter().filter_map(|v| v.as_i64().map(|n| n as i32)).collect())
                .unwrap_or_default();

            if serial_numbers.is_empty() {
                return Ok(json!({"error": "No serial numbers provided"}).to_string());
            }

            let (count, _matches) = ats::run_auto_tagging(db, &serial_numbers).await?;
            Ok(json!({
                "success": true,
                "message": "Auto-tagging completed",
                "points_tagged": count
            })
            .to_string())
        }

        "haystack_preview_tags" => {
            let serial_numbers: Vec<i32> = args
                .get("serial_numbers")
                .and_then(|v| v.as_array())
                .map(|a| a.iter().filter_map(|v| v.as_i64().map(|n| n as i32)).collect())
                .unwrap_or_default();

            if serial_numbers.is_empty() {
                return Ok(json!({"error": "No serial numbers provided"}).to_string());
            }

            let matches = ats::preview_auto_tagging(db, &serial_numbers).await?;
            serde_json::to_string_pretty(&json!({
                "matches": matches,
                "total": matches.len()
            }))
            .map_err(|e| format!("Serialize error: {}", e))
        }

        "haystack_list_rules" => {
            let rules = ats::list_rules(db)
                .await
                .map_err(|e| format!("Failed to list rules: {}", e))?;
            serde_json::to_string_pretty(&json!({
                "rules": rules,
                "total": rules.len()
            }))
            .map_err(|e| format!("Serialize error: {}", e))
        }

        "haystack_get_brick_class" => {
            let serial_numbers: Vec<i32> = args
                .get("serial_numbers")
                .and_then(|v| v.as_array())
                .map(|a| a.iter().filter_map(|v| v.as_i64().map(|n| n as i32)).collect())
                .unwrap_or_default();

            // Query brick_class marker rows
            let sn_list = serial_numbers
                .iter()
                .map(|s| s.to_string())
                .collect::<Vec<_>>()
                .join(",");

            let sql = format!(
                "SELECT serial_number, point_type, point_index, brick_class
                 FROM HAYSTACK_POINT_BRICK_CLASS
                 WHERE serial_number IN ({})",
                sn_list
            );

            let rows = db
                .query_all(sea_orm::Statement::from_string(
                    sea_orm::DatabaseBackend::Sqlite,
                    &sql,
                ))
                .await
                .map_err(|e| format!("Query failed: {}", e))?;

            let results: Vec<Value> = rows
                .iter()
                .filter_map(|r| {
                    let sn = r.try_get::<i32>("", "serial_number").ok()?;
                    let pt: String = r.try_get("", "point_type").ok()?;
                    let idx: i32 = r.try_get("", "point_index").ok()?;
                    let bc: String = r.try_get("", "brick_class").ok()?;
                    let point_id = format!("dev{}.{}{}",
                        sn,
                        match pt.as_str() { "INPUT" => "in", "OUTPUT" => "out", _ => "var" },
                        idx
                    );
                    Some(json!({
                        "serial_number": sn,
                        "point_type": pt,
                        "point_index": idx,
                        "point_id": point_id,
                        "brick_class": bc,
                    }))
                })
                .collect();

            serde_json::to_string_pretty(&json!({
                "points": results,
                "total": results.len()
            }))
            .map_err(|e| format!("Serialize error: {}", e))
        }

        _ => Err(format!("Unknown tool: {}", name)),
    }
}
