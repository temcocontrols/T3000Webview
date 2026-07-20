// MCP (Model Context Protocol) Server — Streamable HTTP transport
// Exposes 25 tools for LLM agents via POST /api/mcp (JSON-RPC 2.0)
// SSE server→client streaming via GET /api/mcp
// Session termination via DELETE /api/mcp
//
// Protocol spec: https://spec.modelcontextprotocol.io/
// Transport spec: Streamable HTTP (2025-03-26)
//
// Categories:
//   Haystack (7):  list_tags, get_point_tags, search_points, auto_tag,
//                   preview_tags, list_rules, get_brick_class
//   Core (3):      ping, get_version, describe_tool
//   Data (4):      device_list, device_get_points, point_get_metadata, metadata_search
//   Operational(4): point_read, point_write, point_read_batch, point_write_batch
//   Analytics (2): haystack_validate, haystack_export
//   Rules (2):     rule_toggle, rule_create
//   Alarms (3):    alarm_list, alarm_acknowledge, trendlog_query

use axum::{
    extract::State,
    http::{StatusCode, HeaderMap},
    response::IntoResponse,
    routing::{delete, get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sea_orm::ConnectionTrait;
use chrono::Utc;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;
use uuid::Uuid;

use crate::app_state::T3AppState;
use crate::haystack::auto_tagging_service as ats;
use crate::haystack::tags_service as ts;
use crate::t3_device::services::T3DeviceService;
use crate::t3_device::trendlog_data_service::{T3TrendlogDataService, TrendlogHistoryRequest};

// ═══ JSON-RPC Types ═══

#[derive(Debug, Deserialize)]
struct JsonRpcRequest {
    #[allow(dead_code)]
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
    #[serde(skip_serializing_if = "Option::is_none")]
    data: Option<Value>,
}

// ═══ Session State ═══

/// MCP session tracking — one per connected client
#[derive(Debug, Clone)]
struct McpSession {
    #[allow(dead_code)]
    id: String,
    #[allow(dead_code)]
    created_at: String,
    initialized: bool,
}

/// Shared session store (in-memory, lost on restart)
type SessionStore = Arc<Mutex<HashMap<String, McpSession>>>;

// ═══ Tool Definitions ═══

lazy_static::lazy_static! {
    static ref TOOLS: Vec<ToolDef> = vec![
    ToolDef {
        name: "haystack_list_tags",
        title: "List Haystack Tags",
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
        title: "Get Point Tags",
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
        title: "Search Points by Tags",
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
        title: "Auto-Tag Devices",
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
        title: "Preview Auto-Tags",
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
        title: "List Tagging Rules",
        description: "List all auto-tagging rules with their patterns, categories, and whether they are enabled.",
        input_schema: json!({
            "type": "object",
            "properties": {}
        }),
    },
    ToolDef {
        name: "haystack_get_brick_class",
        title: "Get Brick Class",
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
    // ═══ v4: Core / Generic ═══
    ToolDef {
        name: "ping",
        title: "Ping Server",
        description: "Health check. Returns server status and timestamp.",
        input_schema: json!({
            "type": "object",
            "properties": {}
        }),
    },
    ToolDef {
        name: "get_version",
        title: "Server Version",
        description: "Return server name, version, protocol version, and tool count.",
        input_schema: json!({
            "type": "object",
            "properties": {}
        }),
    },
    ToolDef {
        name: "describe_tool",
        title: "Describe Tool",
        description: "Return the full input schema, description, and parameter details for a single tool by name.",
        input_schema: json!({
            "type": "object",
            "properties": {
                "tool_name": {
                    "type": "string",
                    "description": "Name of the tool to describe"
                }
            },
            "required": ["tool_name"]
        }),
    },
    // ═══ v4: Data & Metadata ═══
    ToolDef {
        name: "device_list",
        title: "List Devices",
        description: "Enumerate all devices with serial numbers, names, types, point counts, and online status.",
        input_schema: json!({
            "type": "object",
            "properties": {
                "filter_name": {
                    "type": "string",
                    "description": "Optional: filter devices by name substring"
                }
            }
        }),
    },
    ToolDef {
        name: "device_get_points",
        title: "Get Device Points",
        description: "Return all points for a device, optionally filtered by point type (INPUT, OUTPUT, VARIABLE).",
        input_schema: json!({
            "type": "object",
            "properties": {
                "serial_number": {
                    "type": "integer",
                    "description": "Device serial number"
                },
                "point_type": {
                    "type": "string",
                    "description": "Optional: filter by point type (INPUT, OUTPUT, VARIABLE)"
                }
            },
            "required": ["serial_number"]
        }),
    },
    ToolDef {
        name: "point_get_metadata",
        title: "Get Point Metadata",
        description: "Get complete metadata for one point: label, engineering units, range, description, Haystack tags, and Brick class.",
        input_schema: json!({
            "type": "object",
            "properties": {
                "serial_number": {
                    "type": "integer",
                    "description": "Device serial number"
                },
                "point_type": {
                    "type": "string",
                    "description": "Point type: INPUT, OUTPUT, or VARIABLE"
                },
                "point_index": {
                    "type": "integer",
                    "description": "Zero-based point index"
                }
            },
            "required": ["serial_number", "point_type", "point_index"]
        }),
    },
    ToolDef {
        name: "metadata_search",
        title: "Search Metadata",
        description: "Search points across devices by label text, tag, or Brick class.",
        input_schema: json!({
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Search query - matched against point labels"
                },
                "serial_numbers": {
                    "type": "array",
                    "items": { "type": "integer" },
                    "description": "Optional: restrict to these devices"
                },
                "point_types": {
                    "type": "array",
                    "items": { "type": "string" },
                    "description": "Optional: restrict to these point types"
                },
                "limit": {
                    "type": "integer",
                    "description": "Optional: max results (default 50)"
                }
            },
            "required": ["query"]
        }),
    },
    // ═══ v4: Operational ═══
    ToolDef {
        name: "point_read",
        title: "Read Point Value",
        description: "Read the current value of a single point from the database (last synced value).",
        input_schema: json!({
            "type": "object",
            "properties": {
                "serial_number": {
                    "type": "integer",
                    "description": "Device serial number"
                },
                "point_type": {
                    "type": "string",
                    "description": "Point type: INPUT, OUTPUT, or VARIABLE"
                },
                "point_index": {
                    "type": "integer",
                    "description": "Zero-based point index"
                }
            },
            "required": ["serial_number", "point_type", "point_index"]
        }),
    },
    ToolDef {
        name: "point_write",
        title: "Write Point Value",
        description: "Write a value to a point. Requires confirm:true for OUTPUT/VARIABLE points as a safety measure.",
        input_schema: json!({
            "type": "object",
            "properties": {
                "serial_number": {
                    "type": "integer",
                    "description": "Device serial number"
                },
                "point_type": {
                    "type": "string",
                    "description": "Point type: INPUT, OUTPUT, or VARIABLE"
                },
                "point_index": {
                    "type": "integer",
                    "description": "Zero-based point index"
                },
                "value": {
                    "description": "Value to write (number or boolean)"
                },
                "confirm": {
                    "type": "boolean",
                    "description": "Safety confirmation - must be true for OUTPUT/VARIABLE points"
                }
            },
            "required": ["serial_number", "point_type", "point_index", "value", "confirm"]
        }),
    },
    ToolDef {
        name: "point_read_batch",
        title: "Batch Read Points",
        description: "Read current values for multiple points in a single call from the database.",
        input_schema: json!({
            "type": "object",
            "properties": {
                "points": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "serial_number": { "type": "integer" },
                            "point_type": { "type": "string" },
                            "point_index": { "type": "integer" }
                        },
                        "required": ["serial_number", "point_type", "point_index"]
                    },
                    "description": "Array of point references"
                }
            },
            "required": ["points"]
        }),
    },
    ToolDef {
        name: "point_write_batch",
        title: "Batch Write Points",
        description: "Write values to multiple points atomically. Requires confirm:true.",
        input_schema: json!({
            "type": "object",
            "properties": {
                "points": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "serial_number": { "type": "integer" },
                            "point_type": { "type": "string" },
                            "point_index": { "type": "integer" },
                            "value": {}
                        },
                        "required": ["serial_number", "point_type", "point_index", "value"]
                    },
                    "description": "Array of point references with values"
                },
                "confirm": {
                    "type": "boolean",
                    "description": "Safety confirmation - must be true"
                }
            },
            "required": ["points", "confirm"]
        }),
    },
    // ═══ v4: Analytics ═══
    ToolDef {
        name: "haystack_validate",
        title: "Validate Tagging",
        description: "Validate Haystack/Brick tagging against ontology rules. Returns warnings and errors for: missing required tags, conflicting tag combinations, invalid Brick class assignments, orphaned tag references.",
        input_schema: json!({
            "type": "object",
            "properties": {
                "serial_numbers": {
                    "type": "array",
                    "items": { "type": "integer" },
                    "description": "Optional: device serial numbers to validate (omit for all devices)"
                }
            }
        }),
    },
    ToolDef {
        name: "haystack_export",
        title: "Export Semantic Model",
        description: "Export the full semantic model for devices. Supports haystack-json (Project Haystack), brick-ttl (Turtle RDF), and brick-jsonld (JSON-LD) formats.",
        input_schema: json!({
            "type": "object",
            "properties": {
                "serial_numbers": {
                    "type": "array",
                    "items": { "type": "integer" },
                    "description": "Device serial numbers to export"
                },
                "format": {
                    "type": "string",
                    "description": "Export format: haystack-json, brick-ttl, or brick-jsonld"
                }
            },
            "required": ["serial_numbers", "format"]
        }),
    },
    // ═══ v4: Rules Management ═══
    ToolDef {
        name: "rule_toggle",
        title: "Toggle Rule",
        description: "Enable or disable an auto-tagging rule by ID.",
        input_schema: json!({
            "type": "object",
            "properties": {
                "rule_id": {
                    "type": "integer",
                    "description": "Rule ID to toggle"
                },
                "enabled": {
                    "type": "boolean",
                    "description": "true to enable, false to disable"
                }
            },
            "required": ["rule_id", "enabled"]
        }),
    },
    ToolDef {
        name: "rule_create",
        title: "Create Rule",
        description: "Create a new auto-tagging rule with a regex pattern and target tags.",
        input_schema: json!({
            "type": "object",
            "properties": {
                "rule_name": {
                    "type": "string",
                    "description": "Unique rule name"
                },
                "pattern": {
                    "type": "string",
                    "description": "Regex pattern to match point labels"
                },
                "category": {
                    "type": "string",
                    "description": "Rule category: haystack or brick"
                },
                "haystack_tags": {
                    "type": "string",
                    "description": "Comma-separated Haystack tags to assign"
                },
                "brick_class": {
                    "type": "string",
                    "description": "Optional: Brick class to assign"
                },
                "priority": {
                    "type": "integer",
                    "description": "Optional: rule priority (higher = applied first)"
                },
                "units": {
                    "type": "string",
                    "description": "Optional: units filter"
                },
                "object_types": {
                    "type": "string",
                    "description": "Optional: object type filter"
                }
            },
            "required": ["rule_name", "pattern", "category"]
        }),
    },
    // ═══ v4: Alarms & Trends ═══
    ToolDef {
        name: "alarm_list",
        title: "List Alarms",
        description: "List alarms for devices, optionally filtered to active-only.",
        input_schema: json!({
            "type": "object",
            "properties": {
                "serial_numbers": {
                    "type": "array",
                    "items": { "type": "integer" },
                    "description": "Optional: restrict to these devices"
                },
                "active_only": {
                    "type": "boolean",
                    "description": "Optional: if true, only return unacknowledged alarms"
                }
            }
        }),
    },
    ToolDef {
        name: "alarm_acknowledge",
        title: "Acknowledge Alarm",
        description: "Acknowledge an alarm by device serial and alarm ID.",
        input_schema: json!({
            "type": "object",
            "properties": {
                "serial_number": {
                    "type": "integer",
                    "description": "Device serial number"
                },
                "alarm_id": {
                    "type": "string",
                    "description": "Alarm ID to acknowledge"
                }
            },
            "required": ["serial_number", "alarm_id"]
        }),
    },
    ToolDef {
        name: "trendlog_query",
        title: "Query Trend Log",
        description: "Query historical trend data for a point over a time range.",
        input_schema: json!({
            "type": "object",
            "properties": {
                "serial_number": {
                    "type": "integer",
                    "description": "Device serial number"
                },
                "point_type": {
                    "type": "string",
                    "description": "Point type: INPUT, OUTPUT, or VARIABLE"
                },
                "point_index": {
                    "type": "integer",
                    "description": "Zero-based point index"
                },
                "start": {
                    "type": "string",
                    "description": "Start time in ISO 8601 format"
                },
                "end": {
                    "type": "string",
                    "description": "Optional: end time in ISO 8601 format (default: now)"
                },
                "limit": {
                    "type": "integer",
                    "description": "Optional: max data points to return (default: 1000)"
                }
            },
            "required": ["serial_number", "point_type", "point_index", "start"]
        }),
    },
    ];
}

struct ToolDef {
    name: &'static str,
    title: &'static str,
    description: &'static str,
    input_schema: Value,
}

// ═══ MCP Server (Streamable HTTP) ═══

const SERVER_NAME: &str = "T3000 Haystack MCP";
const SERVER_VERSION: &str = "1.0.0";
const PROTOCOL_VERSION: &str = "2025-03-26";

/// Helper to get DB from T3AppState
async fn get_db(state: &T3AppState) -> Result<sea_orm::DatabaseConnection, (StatusCode, Json<Value>)> {
    if let Some(conn) = &state.local_config_conn {
        return Ok(conn.lock().await.clone());
    }
    Err((StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Local database connection not available"}))))
}

// ═══ Session Store ═══

fn get_session_store(_state: &T3AppState) -> SessionStore {
    // Reuse or create session store — stored in a static for now
    // In production this should be in T3AppState
    use std::sync::OnceLock;
    static SESSIONS: OnceLock<SessionStore> = OnceLock::new();
    SESSIONS.get_or_init(|| Arc::new(Mutex::new(HashMap::new()))).clone()
}

// ═══ Routes ═══

/// Create MCP routes for the Axum router
pub fn create_mcp_routes() -> Router<T3AppState> {
    Router::new()
        .route("/api/mcp", post(mcp_post_handler))
        .route("/api/mcp", get(mcp_sse_handler))
        .route("/api/mcp", delete(mcp_delete_handler))
}

// ═══ POST /api/mcp — JSON-RPC 2.0 request handling ═══

pub async fn mcp_post_handler(
    State(state): State<T3AppState>,
    headers: HeaderMap,
    Json(body): Json<Value>,
) -> Result<impl IntoResponse, (StatusCode, Json<Value>)> {
    let db = get_db(&state).await?;
    let sessions = get_session_store(&state);

    // Extract or create session
    let session_id = headers
        .get("mcp-session-id")
        .and_then(|v| v.to_str().ok())
        .map(String::from);

    let session_id = match session_id {
        Some(id) => {
            // Validate existing session
            let sessions_map = sessions.lock().await;
            if sessions_map.contains_key(&id) {
                id
            } else {
                // Invalid session — create new
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
            // No session — create one
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

    // Parse JSON-RPC request
    let req: JsonRpcRequest = serde_json::from_value(body).map_err(|e| {
        (StatusCode::BAD_REQUEST, Json(json!({
            "jsonrpc": "2.0",
            "id": null,
            "error": { "code": -32700, "message": format!("Parse error: {}", e) }
        })))
    })?;

    // JSON-RPC 2.0: notifications have no "id" — server MUST NOT respond
    if req.id.is_none() {
        // Acknowledge notifications/initialized to mark session ready
        if req.method == "notifications/initialized" {
            let mut map = sessions.lock().await;
            if let Some(session) = map.get_mut(&session_id) {
                session.initialized = true;
            }
        }
        // Return empty 202 Accepted for notifications
        let mut response_headers = HeaderMap::new();
        response_headers.insert(
            "mcp-session-id",
            axum::http::HeaderValue::from_str(&session_id).unwrap_or(
                axum::http::HeaderValue::from_static("unknown")
            ),
        );
        return Ok((response_headers, Json(json!({}))));
    }

    // Track initialization state for regular requests too
    if req.method == "initialize" {
        let mut map = sessions.lock().await;
        if let Some(session) = map.get_mut(&session_id) {
            session.initialized = true;
        }
    }

    let resp = handle_request(&req, &db).await;

    // Build response with session header
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

// ═══ GET /api/mcp — SSE endpoint for server→client notifications ═══

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

// ═══ Request Dispatch ═══

async fn handle_request(req: &JsonRpcRequest, db: &sea_orm::DatabaseConnection) -> JsonRpcResponse {
    match req.method.as_str() {
        "initialize" => handle_initialize(req),
        "ping" => handle_ping(req),
        "tools/list" => handle_tools_list(req),
        "tools/call" => handle_tools_call(req, db).await,
        _ => JsonRpcResponse {
            jsonrpc: "2.0".into(),
            id: req.id.clone(),
            result: None,
            error: Some(JsonRpcError {
                code: -32601,
                message: format!("Method not found: {}", req.method),
                data: None,
            }),
        },
    }
}

fn handle_initialize(req: &JsonRpcRequest) -> JsonRpcResponse {
    JsonRpcResponse {
        jsonrpc: "2.0".into(),
        id: req.id.clone(),
        result: Some(json!({
            "protocolVersion": PROTOCOL_VERSION,
            "serverInfo": {
                "name": SERVER_NAME,
                "version": SERVER_VERSION
            },
            "capabilities": {
                "tools": {
                    "listChanged": true
                }
            }
        })),
        error: None,
    }
}

fn handle_ping(req: &JsonRpcRequest) -> JsonRpcResponse {
    // Protocol-level ping (different from the "ping" tool)
    JsonRpcResponse {
        jsonrpc: "2.0".into(),
        id: req.id.clone(),
        result: Some(json!({})),
        error: None,
    }
}

fn handle_tools_list(req: &JsonRpcRequest) -> JsonRpcResponse {
    let tools: Vec<Value> = TOOLS
        .iter()
        .map(|t| {
            json!({
                "name": t.name,
                "title": t.title,
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
                error: Some(JsonRpcError { code: -32602, message: "Invalid params".into(), data: None }),
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
        // Tool execution errors → isError: true (LLM can see friendly message)
        Err(e) => JsonRpcResponse {
            jsonrpc: "2.0".into(),
            id: req.id.clone(),
            result: Some(json!({
                "content": [
                    {
                        "type": "text",
                        "text": e
                    }
                ],
                "isError": true
            })),
            error: None,
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

        // ═══ v4: Core / Generic ═══

        "ping" => {
            let now = Utc::now().to_rfc3339();
            Ok(json!({
                "status": "ok",
                "timestamp": now,
                "server": SERVER_NAME
            }).to_string())
        }

        "get_version" => {
            Ok(json!({
                "name": SERVER_NAME,
                "version": SERVER_VERSION,
                "protocolVersion": PROTOCOL_VERSION,
                "toolCount": TOOLS.len()
            }).to_string())
        }

        "describe_tool" => {
            let tool_name = args.get("tool_name").and_then(|v| v.as_str()).unwrap_or("");
            match TOOLS.iter().find(|t| t.name == tool_name) {
                Some(tool) => {
                    serde_json::to_string_pretty(&json!({
                        "name": tool.name,
                        "title": tool.title,
                        "description": tool.description,
                        "inputSchema": tool.input_schema
                    }))
                    .map_err(|e| format!("Serialize error: {}", e))
                }
                None => Err(format!("Tool not found: {}", tool_name)),
            }
        }

        // ═══ v4: Data & Metadata ═══

        "device_list" => {
            let filter_name = args.get("filter_name").and_then(|v| v.as_str()).map(String::from);
            let devices = T3DeviceService::get_all_devices_with_stats(db)
                .await
                .map_err(|e| format!("Failed to list devices: {}", e))?;

            let results: Vec<Value> = devices
                .iter()
                .filter(|d| {
                    if let Some(ref name) = filter_name {
                        d.device.product_name.as_deref().unwrap_or("")
                            .to_lowercase()
                            .contains(&name.to_lowercase())
                    } else {
                        true
                    }
                })
                .map(|d| {
                    json!({
                        "serial": d.device.serial_number,
                        "name": d.device.product_name,
                        "device_type": d.device.product_id,
                        "input_count": d.input_count,
                        "output_count": d.output_count,
                        "variable_count": d.variable_count,
                        "total_points": d.total_points,
                        "building": d.device.building_name,
                        "floor": d.device.floor_name,
                        "room": d.device.room_name,
                    })
                })
                .collect();

            serde_json::to_string_pretty(&json!({
                "devices": results,
                "total": results.len()
            }))
            .map_err(|e| format!("Serialize error: {}", e))
        }

        "device_get_points" => {
            let serial: i32 = args.get("serial_number")
                .and_then(|v| v.as_i64())
                .map(|n| n as i32)
                .ok_or_else(|| "serial_number required".to_string())?;
            let point_type_filter = args.get("point_type").and_then(|v| v.as_str());

            let mut results: Vec<Value> = Vec::new();

            let sn_filter = vec![serial];
            let tag_entries = ts::get_point_tags(db, &sn_filter, point_type_filter)
                .await
                .map_err(|e| format!("Failed to get tags: {}", e))?;

            let bc_sql = format!(
                "SELECT serial_number, point_type, point_index, brick_class
                 FROM HAYSTACK_POINT_BRICK_CLASS WHERE serial_number = {}",
                serial
            );
            let bc_rows = db
                .query_all(sea_orm::Statement::from_string(sea_orm::DatabaseBackend::Sqlite, &bc_sql))
                .await
                .map_err(|e| format!("Brick query failed: {}", e))?;

            let brick_map: std::collections::HashMap<String, String> = bc_rows
                .iter()
                .filter_map(|r| {
                    let pt: String = r.try_get("", "point_type").ok()?;
                    let idx: i32 = r.try_get("", "point_index").ok()?;
                    let bc: String = r.try_get("", "brick_class").ok()?;
                    Some((format!("{}:{}", pt, idx), bc))
                })
                .collect();

            let mut tag_map: std::collections::HashMap<String, Vec<String>> = std::collections::HashMap::new();
            for entry in &tag_entries {
                let key = format!("{}:{}", entry.point_type, entry.point_index);
                tag_map.entry(key).or_default().push(entry.tag_name.clone());
            }

            let mut seen = std::collections::HashSet::new();
            for entry in &tag_entries {
                let key = format!("{}:{}", entry.point_type, entry.point_index);
                if seen.insert(key.clone()) {
                    let tags = tag_map.get(&key).cloned().unwrap_or_default();
                    let brick_class = brick_map.get(&key).cloned();
                    results.push(json!({
                        "point_type": entry.point_type,
                        "point_index": entry.point_index,
                        "point_id": entry.point_id,
                        "haystack_tags": tags,
                        "brick_class": brick_class,
                    }));
                }
            }

            serde_json::to_string_pretty(&json!({
                "points": results,
                "total": results.len()
            }))
            .map_err(|e| format!("Serialize error: {}", e))
        }

        "point_get_metadata" => {
            let serial: i32 = args.get("serial_number")
                .and_then(|v| v.as_i64()).map(|n| n as i32)
                .ok_or_else(|| "serial_number required".to_string())?;
            let point_type = args.get("point_type").and_then(|v| v.as_str())
                .ok_or_else(|| "point_type required".to_string())?;
            let point_index: i32 = args.get("point_index")
                .and_then(|v| v.as_i64()).map(|n| n as i32)
                .ok_or_else(|| "point_index required".to_string())?;

            // Validate point_type early — prevents SQL injection
            if point_type != "INPUT" && point_type != "OUTPUT" && point_type != "VARIABLE" {
                return Err(format!("Invalid point_type: {}. Must be INPUT, OUTPUT, or VARIABLE", point_type));
            }

            let sn_filter = vec![serial];
            let tag_entries = ts::get_point_tags(db, &sn_filter, Some(point_type))
                .await
                .map_err(|e| format!("Failed to get tags: {}", e))?;
            let tags: Vec<String> = tag_entries
                .iter()
                .filter(|e| {
                    let idx_str = e.point_index.parse::<i32>().ok();
                    idx_str == Some(point_index) || e.point_index == point_index.to_string()
                })
                .map(|e| e.tag_name.clone())
                .collect();

            let bc_sql = format!(
                "SELECT brick_class FROM HAYSTACK_POINT_BRICK_CLASS
                 WHERE serial_number = {} AND point_type = '{}' AND point_index = {}",
                serial, point_type, point_index
            );
            let bc_rows = db
                .query_all(sea_orm::Statement::from_string(sea_orm::DatabaseBackend::Sqlite, &bc_sql))
                .await
                .map_err(|e| format!("Brick query failed: {}", e))?;
            let brick_class = bc_rows.first().and_then(|r| r.try_get::<String>("", "brick_class").ok());

            let table_name = match point_type {
                "INPUT" => "INPUTS",
                "OUTPUT" => "OUTPUTS",
                "VARIABLE" => "VARIABLES",
                _ => unreachable!(), // validated above
            };
            let idx_col = match point_type {
                "INPUT" => "Input_Index", "OUTPUT" => "Output_Index", _ => "Variable_Index"
            };
            let pt_sql = format!(
                "SELECT Label, Units, Range_Field, Digital_Analog, Full_Label
                 FROM {} WHERE SerialNumber = {} AND {} = '{}'",
                table_name, serial, idx_col, point_index
            );
            let pt_rows = db
                .query_all(sea_orm::Statement::from_string(sea_orm::DatabaseBackend::Sqlite, &pt_sql))
                .await
                .map_err(|e| format!("Point query failed: {}", e))?;

            let (label, units, range_field, digital_analog, description) = if let Some(row) = pt_rows.first() {
                (
                    row.try_get::<String>("", "Label").ok(),
                    row.try_get::<String>("", "Units").ok(),
                    row.try_get::<String>("", "Range_Field").ok(),
                    row.try_get::<String>("", "Digital_Analog").ok(),
                    row.try_get::<String>("", "Full_Label").ok(),
                )
            } else {
                (None, None, None, None, None)
            };

            let point_id = format!("dev{}.{}{}",
                serial,
                match point_type { "INPUT" => "in", "OUTPUT" => "out", _ => "var" },
                point_index
            );

            serde_json::to_string_pretty(&json!({
                "serial_number": serial,
                "point_type": point_type,
                "point_index": point_index,
                "point_id": point_id,
                "label": label,
                "engineering_units": units,
                "range_field": range_field,
                "digital_analog": digital_analog,
                "description": description,
                "haystack_tags": tags,
                "brick_class": brick_class,
            }))
            .map_err(|e| format!("Serialize error: {}", e))
        }

        "metadata_search" => {
            let query = args.get("query").and_then(|v| v.as_str())
                .ok_or_else(|| "query required".to_string())?;
            let device_serials: Option<Vec<i32>> = args
                .get("serial_numbers")
                .and_then(|v| v.as_array())
                .map(|a| a.iter().filter_map(|v| v.as_i64().map(|n| n as i32)).collect());
            let point_types: Option<Vec<String>> = args
                .get("point_types")
                .and_then(|v| v.as_array())
                .map(|a| a.iter().filter_map(|v| v.as_str().map(String::from)).collect());
            let limit: usize = args.get("limit")
                .and_then(|v| v.as_u64())
                .map(|n| n as usize)
                .unwrap_or(50);

            let req = ts::SearchPointsRequest {
                device_serials,
                point_types,
                tag_filter: None,
                label_filter: Some(query.to_string()),
                units_filter: None,
            };
            let entries = ts::search_points(db, &req)
                .await
                .map_err(|e| format!("Search failed: {}", e))?;

            let results: Vec<&ts::PointTagEntry> = entries.iter().take(limit).collect();
            serde_json::to_string_pretty(&json!({
                "results": results,
                "total": entries.len()
            }))
            .map_err(|e| format!("Serialize error: {}", e))
        }

        // ═══ v4: Operational ═══

        "point_read" => {
            let serial: i32 = args.get("serial_number")
                .and_then(|v| v.as_i64()).map(|n| n as i32)
                .ok_or_else(|| "serial_number required".to_string())?;
            let point_type = args.get("point_type").and_then(|v| v.as_str())
                .ok_or_else(|| "point_type required".to_string())?;
            let point_index: i32 = args.get("point_index")
                .and_then(|v| v.as_i64()).map(|n| n as i32)
                .ok_or_else(|| "point_index required".to_string())?;

            let (table, label_col, value_col, units_col) = match point_type {
                "INPUT" => ("INPUTS", "Label", "fValue", "Units"),
                "OUTPUT" => ("OUTPUTS", "Label", "fValue", "Units"),
                "VARIABLE" => ("VARIABLES", "Label", "fValue", "Units"),
                _ => return Err(format!("Invalid point_type: {}", point_type)),
            };
            let idx_col = match point_type {
                "INPUT" => "Input_Index", "OUTPUT" => "Output_Index", _ => "Variable_Index"
            };

            let sql = format!(
                "SELECT {}, {}, {} FROM {} WHERE SerialNumber = {} AND {} = '{}'",
                label_col, value_col, units_col, table, serial, idx_col, point_index
            );
            let rows = db
                .query_all(sea_orm::Statement::from_string(sea_orm::DatabaseBackend::Sqlite, &sql))
                .await
                .map_err(|e| format!("Query failed: {}", e))?;

            if let Some(row) = rows.first() {
                let label: Option<String> = row.try_get("", label_col).ok();
                let fvalue: Option<String> = row.try_get("", value_col).ok();
                let units: Option<String> = row.try_get("", units_col).ok();
                let value: Option<f64> = fvalue.as_ref().and_then(|v| v.parse::<f64>().ok());

                Ok(json!({
                    "serial_number": serial,
                    "point_type": point_type,
                    "point_index": point_index,
                    "label": label,
                    "value": value,
                    "engineering_units": units,
                    "timestamp": Utc::now().to_rfc3339(),
                }).to_string())
            } else {
                Ok(json!({"error": "Point not found"}).to_string())
            }
        }

        "point_write" => {
            let serial: i32 = args.get("serial_number")
                .and_then(|v| v.as_i64()).map(|n| n as i32)
                .ok_or_else(|| "serial_number required".to_string())?;
            let point_type = args.get("point_type").and_then(|v| v.as_str())
                .ok_or_else(|| "point_type required".to_string())?;
            let point_index: i32 = args.get("point_index")
                .and_then(|v| v.as_i64()).map(|n| n as i32)
                .ok_or_else(|| "point_index required".to_string())?;
            let confirm = args.get("confirm").and_then(|v| v.as_bool()).unwrap_or(false);

            if point_type != "INPUT" && !confirm {
                return Err(format!(
                    "Write to {} point requires confirm: true for safety",
                    point_type
                ));
            }

            let raw_value = args.get("value").cloned().unwrap_or(Value::Null);
            let value_str = match &raw_value {
                Value::Number(n) => n.to_string(),
                Value::Bool(b) => (if *b { "1" } else { "0" }).to_string(),
                Value::String(s) => s.clone(),
                _ => return Err("value must be number, boolean, or string".to_string()),
            };

            let (table, value_col, index_col) = match point_type {
                "INPUT" => ("INPUTS", "fValue", "Input_Index"),
                "OUTPUT" => ("OUTPUTS", "fValue", "Output_Index"),
                "VARIABLE" => ("VARIABLES", "fValue", "Variable_Index"),
                _ => return Err(format!("Invalid point_type: {}", point_type)),
            };

            let sql = format!(
                "UPDATE {} SET {} = '{}' WHERE SerialNumber = {} AND {} = '{}'",
                table, value_col, value_str, serial, index_col, point_index
            );
            db.execute(sea_orm::Statement::from_string(sea_orm::DatabaseBackend::Sqlite, &sql))
                .await
                .map_err(|e| format!("Write failed: {}", e))?;

            Ok(json!({
                "success": true,
                "written_value": value_str,
                "timestamp": Utc::now().to_rfc3339(),
                "note": "Value written to database. Live device sync requires FFI refresh."
            }).to_string())
        }

        "point_read_batch" => {
            let points: Vec<Value> = args.get("points")
                .and_then(|v| v.as_array())
                .map(|a| a.to_vec())
                .unwrap_or_default();

            let mut results: Vec<Value> = Vec::new();
            for point in &points {
                let sn = point.get("serial_number").and_then(|v| v.as_i64()).map(|n| n as i32);
                let pt = point.get("point_type").and_then(|v| v.as_str());
                let idx = point.get("point_index").and_then(|v| v.as_i64()).map(|n| n as i32);
                if let (Some(sn), Some(pt), Some(idx)) = (sn, pt, idx) {
                    let (table, label_col, value_col, units_col) = match pt {
                        "INPUT" => ("INPUTS", "Label", "fValue", "Units"),
                        "OUTPUT" => ("OUTPUTS", "Label", "fValue", "Units"),
                        "VARIABLE" => ("VARIABLES", "Label", "fValue", "Units"),
                        _ => continue,
                    };
                    let idx_col = match pt {
                        "INPUT" => "Input_Index", "OUTPUT" => "Output_Index", _ => "Variable_Index"
                    };
                    let sql = format!(
                        "SELECT {}, {}, {} FROM {} WHERE SerialNumber = {} AND {} = '{}'",
                        label_col, value_col, units_col, table, sn, idx_col, idx
                    );
                    if let Ok(rows) = db
                        .query_all(sea_orm::Statement::from_string(sea_orm::DatabaseBackend::Sqlite, &sql))
                        .await
                    {
                        if let Some(row) = rows.first() {
                            let label: Option<String> = row.try_get("", label_col).ok();
                            let fvalue: Option<String> = row.try_get("", value_col).ok();
                            let units: Option<String> = row.try_get("", units_col).ok();
                            let val: Option<f64> = fvalue.as_ref().and_then(|v| v.parse::<f64>().ok());
                            results.push(json!({
                                "serial_number": sn,
                                "point_type": pt,
                                "point_index": idx,
                                "label": label,
                                "value": val,
                                "engineering_units": units,
                            }));
                        }
                    }
                }
            }

            Ok(json!({
                "results": results,
                "requested": points.len(),
                "returned": results.len(),
                "timestamp": Utc::now().to_rfc3339(),
            }).to_string())
        }

        "point_write_batch" => {
            let points: Vec<Value> = args.get("points")
                .and_then(|v| v.as_array())
                .map(|a| a.to_vec())
                .unwrap_or_default();
            let confirm = args.get("confirm").and_then(|v| v.as_bool()).unwrap_or(false);

            if !confirm {
                return Err("Batch write requires confirm: true for safety".to_string());
            }

            let mut updated = 0;
            for point in &points {
                let sn = point.get("serial_number").and_then(|v| v.as_i64()).map(|n| n as i32);
                let pt = point.get("point_type").and_then(|v| v.as_str());
                let idx = point.get("point_index").and_then(|v| v.as_i64()).map(|n| n as i32);
                let val = point.get("value");
                if let (Some(sn), Some(pt), Some(idx), Some(val)) = (sn, pt, idx, val) {
                    let value_str = match val {
                        Value::Number(n) => n.to_string(),
                        Value::Bool(b) => (if *b { "1" } else { "0" }).to_string(),
                        Value::String(s) => s.clone(),
                        _ => continue,
                    };
                    let (table, value_col, index_col) = match pt {
                        "INPUT" => ("INPUTS", "fValue", "Input_Index"),
                        "OUTPUT" => ("OUTPUTS", "fValue", "Output_Index"),
                        "VARIABLE" => ("VARIABLES", "fValue", "Variable_Index"),
                        _ => continue,
                    };
                    let sql = format!(
                        "UPDATE {} SET {} = '{}' WHERE SerialNumber = {} AND {} = '{}'",
                        table, value_col, value_str, sn, index_col, idx
                    );
                    if db.execute(sea_orm::Statement::from_string(sea_orm::DatabaseBackend::Sqlite, &sql)).await.is_ok() {
                        updated += 1;
                    }
                }
            }

            Ok(json!({
                "success": true,
                "count": updated,
                "timestamp": Utc::now().to_rfc3339(),
                "note": "Values written to database. Live device sync requires FFI refresh."
            }).to_string())
        }

        // ═══ v4: Analytics ═══

        "haystack_validate" => {
            let serials: Option<Vec<i32>> = args
                .get("serial_numbers")
                .and_then(|v| v.as_array())
                .map(|a| a.iter().filter_map(|v| v.as_i64().map(|n| n as i32)).collect());

            let sn_filter = serials.as_ref().map(|sns| {
                sns.iter().map(|s| s.to_string()).collect::<Vec<_>>().join(",")
            });

            let mut warnings: Vec<Value> = Vec::new();
            let mut errors: Vec<Value> = Vec::new();

            // Rule 1: sensor tag must be INPUT
            let mut sql1 = String::from(
                "SELECT pt.serial_number, pt.point_type, pt.point_index, pt.point_id
                 FROM HAYSTACK_POINT_TAGS pt
                 WHERE pt.tag_name = 'sensor' AND pt.point_type != 'INPUT'"
            );
            if let Some(ref sf) = sn_filter {
                if !sf.is_empty() {
                    sql1.push_str(&format!(" AND pt.serial_number IN ({})", sf));
                }
            }
            if let Ok(rows) = db.query_all(sea_orm::Statement::from_string(sea_orm::DatabaseBackend::Sqlite, &sql1)).await {
                for row in &rows {
                    let pt: String = row.try_get("", "point_type").unwrap_or_default();
                    errors.push(json!({
                        "point_id": row.try_get::<String>("", "point_id").unwrap_or_default(),
                        "issue": format!("Tag 'sensor' assigned to {} point (should be INPUT)", pt)
                    }));
                }
            }

            // Rule 2: cmd tag must be OUTPUT
            let mut sql2 = String::from(
                "SELECT pt.serial_number, pt.point_type, pt.point_index, pt.point_id
                 FROM HAYSTACK_POINT_TAGS pt
                 WHERE pt.tag_name = 'cmd' AND pt.point_type != 'OUTPUT'"
            );
            if let Some(ref sf) = sn_filter {
                if !sf.is_empty() {
                    sql2.push_str(&format!(" AND pt.serial_number IN ({})", sf));
                }
            }
            if let Ok(rows) = db.query_all(sea_orm::Statement::from_string(sea_orm::DatabaseBackend::Sqlite, &sql2)).await {
                for row in &rows {
                    let pt: String = row.try_get("", "point_type").unwrap_or_default();
                    errors.push(json!({
                        "point_id": row.try_get::<String>("", "point_id").unwrap_or_default(),
                        "issue": format!("Tag 'cmd' assigned to {} point (should be OUTPUT)", pt)
                    }));
                }
            }

            // Rule 3: air tag without disambiguator
            let air_sql = "SELECT pt1.serial_number, pt1.point_type, pt1.point_index, pt1.point_id
                FROM HAYSTACK_POINT_TAGS pt1
                WHERE pt1.tag_name = 'air'
                AND NOT EXISTS (
                    SELECT 1 FROM HAYSTACK_POINT_TAGS pt2
                    WHERE pt2.serial_number = pt1.serial_number
                    AND pt2.point_type = pt1.point_type
                    AND pt2.point_index = pt1.point_index
                    AND pt2.tag_name IN ('temp', 'humidity', 'pressure', 'flow', 'quality')
                )";
            if let Ok(rows) = db.query_all(sea_orm::Statement::from_string(sea_orm::DatabaseBackend::Sqlite, air_sql)).await {
                for row in &rows {
                    warnings.push(json!({
                        "point_id": row.try_get::<String>("", "point_id").unwrap_or_default(),
                        "issue": "Tag 'air' present without temp/humidity/pressure/flow/quality - ambiguous sensor type"
                    }));
                }
            }

            let passed = errors.is_empty();

            Ok(json!({
                "passed": passed,
                "warnings": warnings,
                "errors": errors,
                "warning_count": warnings.len(),
                "error_count": errors.len(),
            }).to_string())
        }

        "haystack_export" => {
            let serials: Vec<i32> = args
                .get("serial_numbers")
                .and_then(|v| v.as_array())
                .map(|a| a.iter().filter_map(|v| v.as_i64().map(|n| n as i32)).collect())
                .unwrap_or_default();
            let format = args.get("format").and_then(|v| v.as_str()).unwrap_or("haystack-json");

            if serials.is_empty() {
                return Ok(json!({"error": "No serial numbers provided"}).to_string());
            }

            let sn_list = serials.iter().map(|s| s.to_string()).collect::<Vec<_>>().join(",");

            let sql = format!(
                "SELECT pt.serial_number, pt.point_type, pt.point_index, pt.point_id, pt.tag_name,
                        bc.brick_class
                 FROM HAYSTACK_POINT_TAGS pt
                 LEFT JOIN HAYSTACK_POINT_BRICK_CLASS bc
                   ON pt.serial_number = bc.serial_number
                   AND pt.point_type = bc.point_type
                   AND CAST(pt.point_index AS INTEGER) = bc.point_index
                 WHERE pt.serial_number IN ({})
                 ORDER BY pt.serial_number, pt.point_type, pt.point_index",
                sn_list
            );

            let rows = db
                .query_all(sea_orm::Statement::from_string(sea_orm::DatabaseBackend::Sqlite, &sql))
                .await
                .map_err(|e| format!("Export query failed: {}", e))?;

            match format {
                "haystack-json" => {
                    let mut entities: std::collections::BTreeMap<String, Value> = std::collections::BTreeMap::new();
                    for row in &rows {
                        let point_id: String = row.try_get("", "point_id").unwrap_or_default();
                        let tag: String = row.try_get("", "tag_name").unwrap_or_default();
                        let bc: Option<String> = row.try_get("", "brick_class").ok();
                        let sn: i32 = row.try_get("", "serial_number").unwrap_or(0);
                        let pt: String = row.try_get("", "point_type").unwrap_or_default();
                        let idx: String = row.try_get("", "point_index").unwrap_or_default();

                        let entry = entities.entry(point_id.clone()).or_insert_with(|| json!({
                            "id": format!("dev{}.{}{}",
                                sn,
                                match pt.as_str() { "INPUT" => "in", "OUTPUT" => "out", _ => "var" },
                                idx
                            ),
                            "dis": format!("{} point {}", pt, idx),
                            "tags": {},
                        }));
                        if let Some(obj) = entry.as_object_mut() {
                            if let Some(tags) = obj.get_mut("tags").and_then(|t| t.as_object_mut()) {
                                tags.insert(tag.clone(), json!("m:"));
                            }
                            if let Some(bc_val) = &bc {
                                obj.insert("brickClass".to_string(), json!(bc_val));
                            }
                        }
                    }
                    let items: Vec<Value> = entities.into_values().collect();
                    serde_json::to_string_pretty(&json!({
                        "format": "haystack-json",
                        "rows": items,
                        "total": items.len()
                    }))
                    .map_err(|e| format!("Serialize error: {}", e))
                }

                "brick-ttl" => {
                    let mut ttl = String::from("@prefix brick: <https://brickschema.org/schema/Brick#> .\n");
                    ttl.push_str("@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\n");
                    ttl.push_str("@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .\n\n");

                    let mut brick_classes: std::collections::HashMap<String, Vec<String>> = std::collections::HashMap::new();
                    for row in &rows {
                        let point_id: String = row.try_get("", "point_id").unwrap_or_default();
                        let bc: Option<String> = row.try_get("", "brick_class").ok();
                        let tag: String = row.try_get("", "tag_name").unwrap_or_default();
                        if let Some(bc) = bc {
                            brick_classes.entry(bc).or_default().push(format!("{} [tag: {}]", point_id, tag));
                        }
                    }

                    for (bc, _points) in &brick_classes {
                        let entity_id = bc.to_lowercase().replace('_', "-");
                        ttl.push_str(&format!("t3000:{} a brick:{} ;\n", entity_id, bc));
                        ttl.push_str(&format!("    rdfs:label \"{}\" .\n\n", bc.replace('_', " ")));
                    }

                    Ok(json!({
                        "format": "brick-ttl",
                        "content": ttl,
                        "entity_count": brick_classes.len(),
                    }).to_string())
                }

                "brick-jsonld" => {
                    let mut graph: Vec<Value> = Vec::new();
                    let mut brick_classes: std::collections::HashMap<String, Vec<String>> = std::collections::HashMap::new();
                    for row in &rows {
                        let point_id: String = row.try_get("", "point_id").unwrap_or_default();
                        let bc: Option<String> = row.try_get("", "brick_class").ok();
                        let tag: String = row.try_get("", "tag_name").unwrap_or_default();
                        if let Some(bc) = bc {
                            brick_classes.entry(bc).or_default().push(format!("{} [tag: {}]", point_id, tag));
                        }
                    }

                    for (bc, _points) in &brick_classes {
                        let entity_id = format!("t3000:{}", bc.to_lowercase().replace('_', "-"));
                        graph.push(json!({
                            "@id": entity_id,
                            "@type": format!("brick:{}", bc),
                            "rdfs:label": bc.replace('_', " "),
                        }));
                    }

                    serde_json::to_string_pretty(&json!({
                        "@context": {
                            "brick": "https://brickschema.org/schema/Brick#",
                            "rdf": "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
                            "rdfs": "http://www.w3.org/2000/01/rdf-schema#",
                            "t3000": "urn:t3000:"
                        },
                        "@graph": graph,
                        "entity_count": brick_classes.len(),
                    }))
                    .map_err(|e| format!("Serialize error: {}", e))
                }

                _ => Err(format!("Unknown export format: {}. Use haystack-json, brick-ttl, or brick-jsonld", format)),
            }
        }

        // ═══ v4: Rules Management ═══

        "rule_toggle" => {
            let rule_id: i64 = args.get("rule_id")
                .and_then(|v| v.as_i64())
                .ok_or_else(|| "rule_id required".to_string())?;

            let result = ats::toggle_rule(db, rule_id).await?;

            Ok(json!({
                "rule_id": rule_id,
                "enabled": result,
            }).to_string())
        }

        "rule_create" => {
            let rule_name = args.get("rule_name")
                .and_then(|v| v.as_str()).map(String::from)
                .ok_or_else(|| "rule_name required".to_string())?;
            let pattern = args.get("pattern")
                .and_then(|v| v.as_str()).map(String::from)
                .ok_or_else(|| "pattern required".to_string())?;
            let category = args.get("category")
                .and_then(|v| v.as_str()).map(String::from)
                .ok_or_else(|| "category required".to_string())?;

            let haystack_tags = args.get("haystack_tags").and_then(|v| v.as_str()).map(String::from);
            let brick_class = args.get("brick_class").and_then(|v| v.as_str()).map(String::from);
            let units = args.get("units").and_then(|v| v.as_str()).map(String::from);
            let object_types = args.get("object_types").and_then(|v| v.as_str()).map(String::from);

            let req = ats::CreateRuleRequest {
                rule_name,
                category,
                pattern,
                units,
                object_types,
                haystack_tags,
                brick_class,
                haystack_kind: None,
                haystack_unit: None,
            };

            let rule_id = ats::create_rule(db, &req).await?;

            Ok(json!({
                "rule_id": rule_id,
                "rule_name": req.rule_name,
                "pattern": req.pattern,
                "category": req.category,
                "enabled": true,
            }).to_string())
        }

        // ═══ v4: Alarms & Trends ═══

        "alarm_list" => {
            let serials: Option<Vec<i32>> = args
                .get("serial_numbers")
                .and_then(|v| v.as_array())
                .map(|a| a.iter().filter_map(|v| v.as_i64().map(|n| n as i32)).collect());
            let active_only = args.get("active_only").and_then(|v| v.as_bool()).unwrap_or(false);

            let mut sql = String::from(
                "SELECT SerialNumber AS serial_number, Alarm_ID AS alarm_id, Panel AS panel,
                        Message AS message, Priority AS priority, AlarmState AS alarm_state,
                        AlarmType AS alarm_type, Source AS source, Acknowledged AS acknowledged,
                        TimeStamp AS time_stamp, Description AS description
                 FROM ALARMS WHERE 1=1"
            );

            if let Some(ref sns) = serials {
                if !sns.is_empty() {
                    sql.push_str(&format!(
                        " AND SerialNumber IN ({})",
                        sns.iter().map(|s| s.to_string()).collect::<Vec<_>>().join(",")
                    ));
                }
            }

            if active_only {
                sql.push_str(" AND (Acknowledged IS NULL OR Acknowledged = '' OR Acknowledged = '0')");
            }

            sql.push_str(" ORDER BY SerialNumber, time_stamp DESC");

            let rows = db
                .query_all(sea_orm::Statement::from_string(sea_orm::DatabaseBackend::Sqlite, &sql))
                .await
                .map_err(|e| format!("Alarm query failed: {}", e))?;

            let results: Vec<Value> = rows
                .iter()
                .map(|r| {
                    json!({
                        "serial_number": r.try_get::<i32>("", "serial_number").unwrap_or(0),
                        "alarm_id": r.try_get::<String>("", "alarm_id").ok(),
                        "panel": r.try_get::<String>("", "panel").ok(),
                        "message": r.try_get::<String>("", "message").ok(),
                        "priority": r.try_get::<String>("", "priority").ok(),
                        "alarm_state": r.try_get::<String>("", "alarm_state").ok(),
                        "alarm_type": r.try_get::<String>("", "alarm_type").ok(),
                        "source": r.try_get::<String>("", "source").ok(),
                        "acknowledged": r.try_get::<String>("", "acknowledged").ok(),
                        "time_stamp": r.try_get::<String>("", "time_stamp").ok(),
                    })
                })
                .collect();

            serde_json::to_string_pretty(&json!({
                "alarms": results,
                "total": results.len()
            }))
            .map_err(|e| format!("Serialize error: {}", e))
        }

        "alarm_acknowledge" => {
            let serial: i32 = args.get("serial_number")
                .and_then(|v| v.as_i64()).map(|n| n as i32)
                .ok_or_else(|| "serial_number required".to_string())?;
            let alarm_id = args.get("alarm_id").and_then(|v| v.as_str())
                .ok_or_else(|| "alarm_id required".to_string())?;

            let now = Utc::now().to_rfc3339();
            let sql = format!(
                "UPDATE ALARMS SET Acknowledged = '1' WHERE SerialNumber = {} AND Alarm_ID = '{}'",
                serial, alarm_id
            );
            db.execute(sea_orm::Statement::from_string(sea_orm::DatabaseBackend::Sqlite, &sql))
                .await
                .map_err(|e| format!("Acknowledge failed: {}", e))?;

            Ok(json!({
                "success": true,
                "alarm_id": alarm_id,
                "acknowledged_at": now,
            }).to_string())
        }

        "trendlog_query" => {
            let serial: i32 = args.get("serial_number")
                .and_then(|v| v.as_i64()).map(|n| n as i32)
                .ok_or_else(|| "serial_number required".to_string())?;
            let point_type = args.get("point_type").and_then(|v| v.as_str())
                .ok_or_else(|| "point_type required".to_string())?;
            let point_index: i32 = args.get("point_index")
                .and_then(|v| v.as_i64()).map(|n| n as i32)
                .ok_or_else(|| "point_index required".to_string())?;
            let start = args.get("start").and_then(|v| v.as_str()).map(String::from)
                .ok_or_else(|| "start time required".to_string())?;
            let end = args.get("end").and_then(|v| v.as_str()).map(String::from);
            let limit: u64 = args.get("limit").and_then(|v| v.as_u64()).unwrap_or(1000);

            let point_id = format!("{}_{}_{}", serial,
                match point_type { "INPUT" => "in", "OUTPUT" => "out", _ => "var" },
                point_index);

            let tl_sql = format!(
                "SELECT ID, PanelID FROM TRENDLOGS WHERE SerialNumber = {} AND Point_ID LIKE '%{}%' LIMIT 1",
                serial, point_id
            );
            let tl_rows = db
                .query_all(sea_orm::Statement::from_string(sea_orm::DatabaseBackend::Sqlite, &tl_sql))
                .await
                .map_err(|e| format!("Trendlog lookup failed: {}", e))?;

            if tl_rows.is_empty() {
                return Ok(json!({
                    "error": "No trendlog found for this point",
                    "serial_number": serial,
                    "point_type": point_type,
                    "point_index": point_index,
                }).to_string());
            }

            let trendlog_id: String = tl_rows[0].try_get("", "ID").unwrap_or_default();
            let panel_id: i32 = tl_rows[0].try_get::<i32>("", "PanelID").unwrap_or(0);

            let request = TrendlogHistoryRequest {
                serial_number: serial,
                panel_id,
                trendlog_id,
                start_time: Some(start),
                end_time: end,
                limit: Some(limit),
                point_types: None,
                specific_points: None,
            };

            let result = T3TrendlogDataService::get_trendlog_history(db, request)
                .await
                .map_err(|e| format!("Trendlog query failed: {:?}", e))?;

            serde_json::to_string_pretty(&result)
                .map_err(|e| format!("Serialize error: {}", e))
        }

        _ => Err(format!("Unknown tool: {}", name)),
    }
}
