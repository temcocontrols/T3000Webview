// MCP (Model Context Protocol) Server — Streamable HTTP transport
// Exposes 45+ tools for LLM agents via POST /api/mcp (JSON-RPC 2.0)
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
//   Operational(5): point_read, point_write, point_read_batch, point_write_batch, point_batch_metadata
//   Analytics (2): haystack_validate, haystack_export
//   Tasks (4):     task_create, task_list, task_update, task_delete
//   Memory (3):    memory_save, memory_list, memory_delete
//   Diagnostics(2): device_diagnostics, device_diagnostics_batch
//   Navigation (5): nav_list, nav_search, nav_redirect, page_info, device_current
//   Rules (2):     rule_toggle, rule_create
//   Alarms (3):    alarm_list, alarm_acknowledge, trendlog_query
//   Docs (2):      doc_list, doc_read
//   Docs (2):      doc_list, doc_read
//   Device (12):   trendlog_list, trendlog_export, device_refresh, schedule_list, settings_read, settings_write, device_control,
//                   program_list, program_read, pid_list, holiday_list, building_summary

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
use tracing::{info, error};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;
use uuid::Uuid;

use crate::app_state::T3AppState;
use crate::haystack::auto_tagging_service as ats;
use crate::haystack::tags_service as ts;
use crate::t3_device::services::T3DeviceService;
use crate::t3_device::trendlog_data_service::{T3TrendlogDataService, TrendlogHistoryRequest, SpecificPoint};

// ═══ MCP API Logger — console + t3-webview-api-dll.log (gated by debug_log=1 in setting.ini) ═══

fn mcp_log(msg: &str) {
    crate::server::debug_log(&format!("[MCP] {}", msg));
}

// ═══ File-Based JSON Storage (Tasks & Memory) ═══

use std::path::PathBuf;

fn data_dir() -> PathBuf {
    std::env::current_dir().unwrap_or_else(|_| PathBuf::from(".")).join("data")
}

fn tasks_file() -> PathBuf { data_dir().join("mcp_tasks.json") }
fn memory_file() -> PathBuf { data_dir().join("mcp_memory.json") }

async fn load_json_file(path: &PathBuf) -> Result<Value, String> {
    let content = tokio::fs::read_to_string(path).await.unwrap_or_else(|_| "[]".into());
    serde_json::from_str(&content).map_err(|e| format!("JSON parse error: {}", e))
}

async fn save_json_file(path: &PathBuf, data: &Value) -> Result<(), String> {
    tokio::fs::create_dir_all(data_dir()).await.map_err(|e| format!("Cannot create data dir: {}", e))?;
    let json = serde_json::to_string_pretty(data).map_err(|e| format!("Serialize error: {}", e))?;
    tokio::fs::write(path, &json).await.map_err(|e| format!("Write error: {}", e))?;
    Ok(())
}

// ── Task helpers ──

async fn load_tasks() -> Result<Vec<Value>, String> {
    let v = load_json_file(&tasks_file()).await?;
    Ok(v.as_array().cloned().unwrap_or_default())
}

async fn save_tasks(tasks: &[Value]) -> Result<(), String> {
    save_json_file(&tasks_file(), &json!(tasks)).await
}

// ── Memory helpers ──

async fn load_memories() -> Result<Vec<Value>, String> {
    let v = load_json_file(&memory_file()).await?;
    Ok(v.as_array().cloned().unwrap_or_default())
}

async fn save_memories(memories: &[Value]) -> Result<(), String> {
    save_json_file(&memory_file(), &json!(memories)).await
}

// ── Current device tracking ──
// Saves the serial_number from any device-specific tool call so that
// device_current can return the device the user is actually working with.

fn current_device_file() -> PathBuf { data_dir().join("mcp_device_context.json") }

async fn track_current_device(args: &Value) {
    // Extract serial_number or first entry from serial_numbers array
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

// ═══ JSON-RPC Types ═══

#[derive(Debug, Deserialize)]
pub(crate) struct JsonRpcRequest {
    #[allow(dead_code)]
    pub(crate) jsonrpc: String,
    #[serde(default)]
    pub(crate) id: Option<Value>,
    pub(crate) method: String,
    #[serde(default)]
    pub(crate) params: Option<Value>,
}

#[derive(Debug, Serialize)]
pub(crate) struct JsonRpcResponse {
    pub(crate) jsonrpc: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(crate) id: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(crate) result: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(crate) error: Option<JsonRpcError>,
}

#[derive(Debug, Serialize)]
pub(crate) struct JsonRpcError {
    pub(crate) code: i32,
    pub(crate) message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(crate) data: Option<Value>,
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
    pub(crate) static ref TOOLS: Vec<ToolDef> = vec![
    ToolDef {
        name: "t3000_haystack_list_tags",
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
        name: "t3000_haystack_get_point_tags",
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
        name: "t3000_haystack_search_points",
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
        name: "t3000_haystack_auto_tag",
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
        name: "t3000_haystack_preview_tags",
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
        name: "t3000_haystack_list_rules",
        title: "List Tagging Rules",
        description: "List all auto-tagging rules with their patterns, categories, and whether they are enabled.",
        input_schema: json!({
            "type": "object",
            "properties": {}
        }),
    },
    ToolDef {
        name: "t3000_haystack_get_brick_class",
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
        name: "t3000_ping",
        title: "Ping Server",
        description: "Health check. Returns server status and timestamp.",
        input_schema: json!({
            "type": "object",
            "properties": {}
        }),
    },
    ToolDef {
        name: "t3000_get_version",
        title: "Server Version",
        description: "Return server name, version, protocol version, and tool count.",
        input_schema: json!({
            "type": "object",
            "properties": {}
        }),
    },
    ToolDef {
        name: "t3000_describe_tool",
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
        name: "t3000_device_list",
        title: "List Devices",
        description: "Enumerate all devices with serial numbers, names, types, point counts, building, floor, and room.",
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
        name: "t3000_device_get_points",
        title: "Get Device Points",
        description: "Return all points for a device with labels, engineering units, range, digital/analog type, description, Haystack tags, and Brick classes. Optionally filter by point type (INPUT, OUTPUT, VARIABLE).",
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
        name: "t3000_point_get_metadata",
        title: "Get Point Metadata",
        description: "Get complete metadata for one point: label, engineering units, range, digital/analog type, description, current value, Haystack tags, and Brick class.",
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
        name: "t3000_metadata_search",
        title: "Search Metadata",
        description: "Search points across devices by label text. Optionally filter by device serials or point types.",
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
    // ═══ v4: Semantic Search ═══
    ToolDef {
        name: "t3000_point_search",
        title: "Semantic Point Search",
        description: "Search points across devices using natural language. Matches against labels, haystack tags, brick classes, and descriptions. Returns the best matching points ranked by relevance. Use when the user says 'find the temperature sensor in the lobby' or 'show me all fan speed outputs'.",
        input_schema: json!({
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Natural language query, e.g. 'lobby temperature sensor' or 'basement fan speed'"
                },
                "serial_numbers": {
                    "type": "array",
                    "items": { "type": "integer" },
                    "description": "Optional: restrict search to these devices"
                },
                "limit": {
                    "type": "integer",
                    "description": "Optional: max results (default 10)"
                }
            },
            "required": ["query"]
        }),
    },
    // ═══ v4: Operational ═══
    ToolDef {
        name: "t3000_point_read",
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
        name: "t3000_point_write",
        title: "Write Point Value",
        description: "Write to a point field. Defaults to 'value' (fValue). Also supports: label, description, range, auto_manual, digital_analog. All other fields are preserved from the current device state. Requires confirm:true for OUTPUT/VARIABLE points as a safety measure.",
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
                    "description": "Value to write (number, boolean, or string)"
                },
                "field": {
                    "type": "string",
                    "description": "Target field: value (default), label, description, range, auto_manual, digital_analog"
                },
                "confirm": {
                    "type": "boolean",
                    "description": "Safety confirmation - must be true for OUTPUT/VARIABLE points"
                },
                "readback": {
                    "type": "boolean",
                    "description": "Optional: if true, read the point back after writing to confirm the new value"
                }
            },
            "required": ["serial_number", "point_type", "point_index", "value", "confirm"]
        }),
    },
    ToolDef {
        name: "t3000_point_read_batch",
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
        name: "t3000_point_write_batch",
        title: "Batch Write Points",
        description: "Write values to multiple points in a single call. Each point may specify an optional 'field' (defaults to 'value'). Requires confirm:true.",
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
                            "value": {},
                            "field": { "type": "string", "description": "Target field: value (default), label, description, range, auto_manual, digital_analog" }
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
    ToolDef {
        name: "t3000_point_batch_metadata",
        title: "Batch Point Metadata",
        description: "Get full metadata for multiple points in one call. Returns label, units, range, digital/analog, description, current value, Haystack tags, and Brick class for each point. Much more efficient than calling point_get_metadata N times.",
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
    // ═══ v4: Analytics ═══
    ToolDef {
        name: "t3000_haystack_validate",
        title: "Validate Tagging",
        description: "Validate Haystack/Brick tagging against ontology rules. Checks: sensor tag must be on INPUT points, cmd tag must be on OUTPUT points, air tag requires a disambiguator (temp/humidity/pressure/flow/quality).",
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
        name: "t3000_haystack_export",
        title: "Export Semantic Model",
        description: "Export the full semantic model for devices. Supports haystack-json (Project Haystack), brick-ttl (Turtle RDF), brick-jsonld (JSON-LD), and csv-flat (flat table of all points with values, units, tags, brick class).",
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
                    "description": "Export format: haystack-json, brick-ttl, brick-jsonld, or csv-flat"
                }
            },
            "required": ["serial_numbers", "format"]
        }),
    },
    // ═══ v4: Rules Management ═══
    ToolDef {
        name: "t3000_rule_toggle",
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
        name: "t3000_rule_create",
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
        name: "t3000_alarm_list",
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
        name: "t3000_alarm_acknowledge",
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
        name: "t3000_trendlog_query",
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
    // ═══ v4: Device Operations (new) ═══
    ToolDef {
        name: "t3000_trendlog_list",
        title: "List Trendlogs",
        description: "List all trendlogs for a device. Returns trendlog IDs, labels, intervals, buffer sizes, and point counts. Use to discover available trendlogs before querying history.",
        input_schema: json!({
            "type": "object",
            "properties": {
                "serial_number": {
                    "type": "integer",
                    "description": "Device serial number"
                }
            },
            "required": ["serial_number"]
        }),
    },
    ToolDef {
        name: "t3000_trendlog_export",
        title: "Export Trendlog",
        description: "Export all historical data from a trendlog as CSV or JSON. Queries all points in the trendlog in one call and returns timestamped values. Use after trendlog_list to pick a trendlog ID.",
        input_schema: json!({
            "type": "object",
            "properties": {
                "serial_number": {
                    "type": "integer",
                    "description": "Device serial number"
                },
                "trendlog_id": {
                    "type": "string",
                    "description": "Trendlog ID (from trendlog_list)"
                },
                "start": {
                    "type": "string",
                    "description": "Start time in ISO 8601 format"
                },
                "end": {
                    "type": "string",
                    "description": "Optional: end time in ISO 8601 format (default: now)"
                },
                "format": {
                    "type": "string",
                    "description": "Output format: csv (default) or json"
                },
                "limit": {
                    "type": "integer",
                    "description": "Optional: max data points to return (default: 10000)"
                }
            },
            "required": ["serial_number", "trendlog_id", "start"]
        }),
    },
    ToolDef {
        name: "t3000_device_refresh",
        title: "Refresh Device Data",
        description: "Force-refresh point data from the physical device via FFI Action 17 (GET_WEBVIEW_LIST). Updates the database with current values from the hardware. Optionally filter by point type.",
        input_schema: json!({
            "type": "object",
            "properties": {
                "serial_number": {
                    "type": "integer",
                    "description": "Device serial number"
                },
                "point_type": {
                    "type": "string",
                    "description": "Optional: refresh only INPUT, OUTPUT, or VARIABLE points (omit for all)"
                }
            },
            "required": ["serial_number"]
        }),
    },
    ToolDef {
        name: "t3000_schedule_list",
        title: "List Schedules",
        description: "List all schedules for a device. Returns schedule IDs, daily time settings, and assigned outputs/variables.",
        input_schema: json!({
            "type": "object",
            "properties": {
                "serial_number": {
                    "type": "integer",
                    "description": "Device serial number"
                }
            },
            "required": ["serial_number"]
        }),
    },
    // ═══ v4: Settings ═══
    ToolDef {
        name: "t3000_settings_read",
        title: "Read Device Settings",
        description: "Read all settings for a device: network (IP/subnet/gateway/DHCP), communication (COM ports/baudrates/parity), time (timezone/NTP/DST), protocol (Modbus ID/MSTP/BACnet), DynDNS, hardware info, feature flags, and email alerts. Optionally filter by category.",
        input_schema: json!({
            "type": "object",
            "properties": {
                "serial_number": {
                    "type": "integer",
                    "description": "Device serial number"
                },
                "category": {
                    "type": "string",
                    "description": "Optional: filter to one category. One of: network, communication, time, protocol, dyndns, hardware, features, email. Omit for all."
                }
            },
            "required": ["serial_number"]
        }),
    },
    ToolDef {
        name: "t3000_settings_write",
        title: "Update Device Settings",
        description: "Update device settings. Supports network (ip_address, subnet, gateway, tcp_type), communication (com0/1/2_config, com_baudrate0/1/2), time (time_zone, enable_sntp, sntp_server, flag_time_sync_pc), and email (smtp_server, smtp_port, email_address, etc.). Writes to database and syncs to device via FFI.",
        input_schema: json!({
            "type": "object",
            "properties": {
                "serial_number": {
                    "type": "integer",
                    "description": "Device serial number"
                },
                "category": {
                    "type": "string",
                    "description": "Settings category: network, communication, time, or email"
                },
                "fields": {
                    "type": "object",
                    "description": "Key-value pairs of fields to update. e.g. {\"ip_address\": \"192.168.1.100\", \"tcp_type\": 1} for network, or {\"com0_config\": 1, \"com_baudrate0\": 5} for communication"
                },
                "confirm": {
                    "type": "boolean",
                    "description": "Safety confirmation - must be true"
                }
            },
            "required": ["serial_number", "category", "fields", "confirm"]
        }),
    },
    ToolDef {
        name: "t3000_device_control",
        title: "Device Control",
        description: "Send control commands to a device: reboot (restart the controller) or reset_defaults (factory reset). Requires confirm:true.",
        input_schema: json!({
            "type": "object",
            "properties": {
                "serial_number": {
                    "type": "integer",
                    "description": "Device serial number"
                },
                "command": {
                    "type": "string",
                    "description": "Command: reboot or reset_defaults"
                },
                "confirm": {
                    "type": "boolean",
                    "description": "Safety confirmation - must be true"
                }
            },
            "required": ["serial_number", "command", "confirm"]
        }),
    },
    // ═══ v4: Control Logic ═══
    ToolDef {
        name: "t3000_program_list",
        title: "List Programs",
        description: "List all PLC programs on a device. Returns program IDs, labels, status (running/stopped), auto/manual mode, program size, and switch node. Use to discover what control logic exists before reading a specific program.",
        input_schema: json!({
            "type": "object",
            "properties": {
                "serial_number": {
                    "type": "integer",
                    "description": "Device serial number"
                }
            },
            "required": ["serial_number"]
        }),
    },
    ToolDef {
        name: "t3000_program_read",
        title: "Read Program Source",
        description: "Read a specific PLC program's full details: source code (program_list), label, status, auto/manual mode, size, and switch node. The source code is truncated to 2000 characters in the response.",
        input_schema: json!({
            "type": "object",
            "properties": {
                "serial_number": {
                    "type": "integer",
                    "description": "Device serial number"
                },
                "program_id": {
                    "type": "string",
                    "description": "Program ID (from program_list)"
                }
            },
            "required": ["serial_number", "program_id"]
        }),
    },
    ToolDef {
        name: "t3000_alarm_settings_read",
        title: "Read Alarm Settings",
        description: "Read alarm threshold configuration for a device. Returns alarm rules: monitored points, conditions, low/high/normal/way-low/way-high thresholds, and time delays. This is alarm configuration, not the active alarm list (use alarm_list for that).",
        input_schema: json!({
            "type": "object",
            "properties": {
                "serial_number": {
                    "type": "integer",
                    "description": "Device serial number"
                }
            },
            "required": ["serial_number"]
        }),
    },
    ToolDef {
        name: "t3000_users_list",
        title: "List Users",
        description: "List all users configured on a device. Returns user IDs, names, access levels (View/Full/Graphic/Routine), rights, default panel/group, and status.",
        input_schema: json!({
            "type": "object",
            "properties": {
                "serial_number": {
                    "type": "integer",
                    "description": "Device serial number"
                }
            },
            "required": ["serial_number"]
        }),
    },
    ToolDef {
        name: "t3000_graphics_list",
        title: "List Graphic Screens",
        description: "List all graphic/HMI screens available on a device. Returns graphic IDs, labels, descriptions, picture files, total points, and switch nodes.",
        input_schema: json!({
            "type": "object",
            "properties": {
                "serial_number": {
                    "type": "integer",
                    "description": "Device serial number"
                }
            },
            "required": ["serial_number"]
        }),
    },
    // ═══ v4: Documentation ═══
    ToolDef {
        name: "t3000_doc_list",
        title: "List Documentation Topics",
        description: "List all available T3000 documentation topics organized by section: Quick Start, Architecture, Device Management, Data Points, Features, API Reference, Guides, Building Platform, Haystack & MCP. Use to discover what docs exist before reading a specific one.",
        input_schema: json!({
            "type": "object",
            "properties": {}
        }),
    },
    ToolDef {
        name: "t3000_doc_read",
        title: "Read Documentation",
        description: "Read the full content of a T3000 documentation page by path (from doc_list). Returns the markdown content. Fetches from local filesystem in dev mode, falls back to GitHub raw in production.",
        input_schema: json!({
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "Documentation path from doc_list, e.g. 'quick-start/overview' or 'haystack/mcp-api-examples'"
                }
            },
            "required": ["path"]
        }),
    },
    ToolDef {
        name: "t3000_pid_list",
        title: "List PID Loops",
        description: "List all PID control loops on a device. Returns loop IDs, setpoint, process variable (input value), output value, proportional/reset/rate parameters, action type, auto/manual mode, and status.",
        input_schema: json!({
            "type": "object",
            "properties": {
                "serial_number": {
                    "type": "integer",
                    "description": "Device serial number"
                }
            },
            "required": ["serial_number"]
        }),
    },
    ToolDef {
        name: "t3000_holiday_list",
        title: "List Holiday Schedules",
        description: "List all holiday exceptions configured on a device. Returns holiday IDs, dates (month/day/year), holiday values, auto/manual mode, and status. Holidays override normal weekly schedules.",
        input_schema: json!({
            "type": "object",
            "properties": {
                "serial_number": {
                    "type": "integer",
                    "description": "Device serial number"
                }
            },
            "required": ["serial_number"]
        }),
    },
    ToolDef {
        name: "t3000_building_summary",
        title: "Building System Summary",
        description: "Get a one-shot overview of the entire building automation system. Returns total device count, online/offline breakdown, active alarm count, total trendlogs, schedules, programs, and PID loops across all devices. Use for 'How is the building doing?' queries.",
        input_schema: json!({
            "type": "object",
            "properties": {}
        }),
    },
    // ═══ v5: Task Management ═══
    ToolDef {
        name: "t3000_task_create",
        title: "Create Task",
        description: "Create a new task for tracking commissioning, maintenance, or troubleshooting workflows. Tasks have a title, description, status (pending/in_progress/completed), and optional device reference.",
        input_schema: json!({
            "type": "object",
            "properties": {
                "title": { "type": "string", "description": "Short task title (e.g. 'Configure AHU-1 network')" },
                "description": { "type": "string", "description": "Optional: detailed description of what needs to be done" },
                "serial_number": { "type": "integer", "description": "Optional: associate task with a specific device" },
                "priority": { "type": "string", "description": "Optional: low, normal (default), high, critical" }
            },
            "required": ["title"]
        }),
    },
    ToolDef {
        name: "t3000_task_list",
        title: "List Tasks",
        description: "List all tasks with optional filters by status or device. Returns tasks sorted by creation time (newest first).",
        input_schema: json!({
            "type": "object",
            "properties": {
                "status": { "type": "string", "description": "Optional: filter by status (pending, in_progress, completed)" },
                "serial_number": { "type": "integer", "description": "Optional: filter by device serial number" }
            }
        }),
    },
    ToolDef {
        name: "t3000_task_update",
        title: "Update Task",
        description: "Update a task's status, title, description, or priority. Use to mark tasks as in_progress or completed as you work through a workflow.",
        input_schema: json!({
            "type": "object",
            "properties": {
                "task_id": { "type": "string", "description": "Task ID (from task_list)" },
                "status": { "type": "string", "description": "Optional: new status (pending, in_progress, completed)" },
                "title": { "type": "string", "description": "Optional: new title" },
                "description": { "type": "string", "description": "Optional: new description" },
                "priority": { "type": "string", "description": "Optional: new priority" }
            },
            "required": ["task_id"]
        }),
    },
    ToolDef {
        name: "t3000_task_delete",
        title: "Delete Task",
        description: "Delete a task by ID. Use to clean up completed or obsolete tasks.",
        input_schema: json!({
            "type": "object",
            "properties": {
                "task_id": { "type": "string", "description": "Task ID to delete" }
            },
            "required": ["task_id"]
        }),
    },
    // ═══ v5: Site Memory ═══
    ToolDef {
        name: "t3000_memory_save",
        title: "Save Site Memory",
        description: "Save a note about the building site for future reference. Use for site-specific conventions, device naming patterns, or user preferences. Memories persist across sessions and are automatically loaded into the AI context.",
        input_schema: json!({
            "type": "object",
            "properties": {
                "key": { "type": "string", "description": "Short key/topic for this memory (e.g. 'naming-convention', 'ahu-layout')" },
                "content": { "type": "string", "description": "The memory content to save" },
                "category": { "type": "string", "description": "Optional: site-config, naming, workflow, troubleshooting, user-pref" }
            },
            "required": ["key", "content"]
        }),
    },
    ToolDef {
        name: "t3000_memory_list",
        title: "List Site Memories",
        description: "List all saved site memories with optional filtering by category. Returns memories sorted by last update time (newest first).",
        input_schema: json!({
            "type": "object",
            "properties": {
                "category": { "type": "string", "description": "Optional: filter by category (site-config, naming, workflow, troubleshooting, user-pref)" },
                "search": { "type": "string", "description": "Optional: search memory content for this text" }
            }
        }),
    },
    ToolDef {
        name: "t3000_memory_delete",
        title: "Delete Site Memory",
        description: "Delete a specific memory entry by key. Use to remove outdated or incorrect site information.",
        input_schema: json!({
            "type": "object",
            "properties": {
                "key": { "type": "string", "description": "Memory key to delete" }
            },
            "required": ["key"]
        }),
    },
    // ═══ v5: Device Diagnostics ═══
    ToolDef {
        name: "t3000_device_diagnostics",
        title: "Device Diagnostics",
        description: "Run a comprehensive diagnostic check on a device. Returns: connection status, firmware version, point counts, alarm summary, trendlog status, program status, schedule status, and PID loop health. Use for troubleshooting or health verification.",
        input_schema: json!({
            "type": "object",
            "properties": {
                "serial_number": { "type": "integer", "description": "Device serial number to diagnose" }
            },
            "required": ["serial_number"]
        }),
    },
    ToolDef {
        name: "t3000_device_diagnostics_batch",
        title: "Batch Device Diagnostics",
        description: "Run diagnostics on multiple devices at once. If no serial_numbers provided, diagnoses ALL devices. Returns health summary for each device and overall building health.",
        input_schema: json!({
            "type": "object",
            "properties": {
                "serial_numbers": {
                    "type": "array",
                    "items": { "type": "integer" },
                    "description": "Optional: device serials to diagnose (omit for all devices)"
                }
            }
        }),
    },
    // ═══ v5: Navigation ═══
    ToolDef {
        name: "t3000_nav_list",
        title: "List T3000 Pages",
        description: "List all pages in the T3000 web UI with paths, titles, keyboard shortcuts, and whether they require a device to be selected. Use to help users find the right page: 'Where do I configure PID loops?' → nav_list.",
        input_schema: json!({
            "type": "object",
            "properties": {
                "section": {
                    "type": "string",
                    "description": "Optional: filter by section — points, control, monitoring, config, system, develop"
                }
            }
        }),
    },
    ToolDef {
        name: "t3000_nav_search",
        title: "Search T3000 Pages",
        description: "Search for T3000 pages and topics by keyword. Returns matching pages ranked by relevance. Use when the user asks 'How do I...' or 'Where is...' type questions about the T3000 interface.",
        input_schema: json!({
            "type": "object",
            "properties": {
                "query": { "type": "string", "description": "Search term — e.g., 'alarm', 'schedule', 'PID', 'network'" }
            },
            "required": ["query"]
        }),
    },
    ToolDef {
        name: "t3000_nav_redirect",
        title: "Navigate to Page",
        description: "Get the URL to navigate to a specific T3000 page, optionally with a device pre-selected. The frontend uses this URL to redirect the user. Use when the user says 'open the outputs page' or 'take me to alarms'.",
        input_schema: json!({
            "type": "object",
            "properties": {
                "page": { "type": "string", "description": "Page name or path — e.g., 'outputs', 'alarms', 'programs', 'pidloops'" },
                "serial_number": { "type": "integer", "description": "Optional: pre-select this device on the target page" }
            },
            "required": ["page"]
        }),
    },
    ToolDef {
        name: "t3000_page_info",
        title: "Page Details",
        description: "Get detailed information about a T3000 page: what it does, what you can view/edit/configure, related MCP tools, keyboard shortcuts, and available features. Use when the user asks 'What can I do on the Alarms page?'",
        input_schema: json!({
            "type": "object",
            "properties": {
                "page": { "type": "string", "description": "Page name — e.g., 'inputs', 'outputs', 'schedules', 'settings'" }
            },
            "required": ["page"]
        }),
    },
    ToolDef {
        name: "t3000_device_current",
        title: "Get Current Device",
        description: "Get the currently selected device in the web UI. Returns serial number, name, type, and point counts. Use when the user asks 'which device am I on?' or as a context hint for other operations.",
        input_schema: json!({
            "type": "object",
            "properties": {}
        }),
    },
    ToolDef {
        name: "t3000_set_chat_device",
        title: "Set Chat Device",
        description: "Confirm which device the AI should use for MCP operations. Call after the user confirms which device to work with (which may differ from the UI-selected device). This sets the authoritative chat_device context.",
        input_schema: json!({
            "type": "object",
            "properties": {
                "serial_number": {
                    "type": "integer",
                    "description": "Device serial number to use for MCP operations"
                }
            },
            "required": ["serial_number"]
        }),
    },
    ];
}

pub(crate) struct ToolDef {
    pub(crate) name: &'static str,
    pub(crate) title: &'static str,
    pub(crate) description: &'static str,
    pub(crate) input_schema: Value,
}

// ═══ MCP Server (Streamable HTTP) ═══

const SERVER_NAME: &str = "T3000 Haystack MCP";
const SERVER_VERSION: &str = "1.0.0";
const PROTOCOL_VERSION: &str = "2025-03-26";

/// Helper to get DB from T3AppState
pub(crate) async fn get_db(state: &T3AppState) -> Result<sea_orm::DatabaseConnection, (StatusCode, Json<Value>)> {
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
        .route("/api/mcp/current-device", post(set_current_device_handler))
        .route("/api/mcp/current-device", get(get_current_device_handler))
}

// ═══ POST /api/mcp/current-device — Frontend reports UI-selected device ═══
// Saves ONLY the ui_device field. chat_device is managed by the AI via set_chat_device tool.

async fn set_current_device_handler(
    Json(body): Json<Value>,
) -> impl IntoResponse {
    let serial = body.get("serial_number").and_then(|v| v.as_i64()).map(|n| n as i32);

    match serial {
        Some(s) => {
            let state_file = data_dir().join("mcp_device_context.json");
            // Preserve existing chat_device if any
            let mut existing = if state_file.exists() {
                load_json_file(&state_file).await.unwrap_or(json!({}))
            } else {
                json!({})
            };
            // Look up device name for quick reference
            let dev_name = if let Ok(rows) = db.query_all(
                sea_orm::Statement::from_string(sea_orm::DatabaseBackend::Sqlite,
                    &format!("SELECT Product_Name FROM DEVICES WHERE SerialNumber = {}", s))
            ).await {
                rows.first().and_then(|r| r.try_get::<String>("", "Product_Name").ok())
            } else { None };
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

// ═══ GET /api/mcp/current-device — Read both device contexts ═══

async fn get_current_device_handler() -> impl IntoResponse {
    let state_file = data_dir().join("mcp_device_context.json");
    if state_file.exists() {
        match load_json_file(&state_file).await {
            Ok(v) => Json(v).into_response(),
            Err(_) => Json(json!({"ui_device": null, "chat_device": null, "note": "No device selected"})).into_response(),
        }
    } else {
        Json(json!({"ui_device": null, "chat_device": null, "note": "No device selected"})).into_response()
    }
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

pub(crate) async fn handle_request(req: &JsonRpcRequest, db: &sea_orm::DatabaseConnection) -> JsonRpcResponse {
    match req.method.as_str() {
        "initialize" => handle_initialize(req),
        "t3000_ping" => handle_ping(req),
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

// ═══ Point Write via FFI (Action 16) ═══

async fn point_write_ffi(
    db: &sea_orm::DatabaseConnection,
    serial: i32,
    point_type: &str,
    point_index: i32,
    target_field: &str,
    new_value_str: &str,
) -> Result<String, String> {
    use crate::t3_device::t3_ffi_api_service::T3000FfiApiService;

    let (table, idx_col) = match point_type {
        "INPUT" => ("INPUTS", "Input_Index"),
        "OUTPUT" => ("OUTPUTS", "Output_Index"),
        "VARIABLE" => ("VARIABLES", "Variable_Index"),
        _ => return Err(format!("Invalid point_type: {}", point_type)),
    };
    let entry_type: i32 = match point_type {
        "INPUT" => 1, "OUTPUT" => 0, "VARIABLE" => 2, _ => unreachable!(),
    };

    // Step 1: Query current row from DB
    let sql = format!(
        "SELECT Label, Full_Label, fValue, Range_Field, Auto_Manual, Filter_Field, \
                Digital_Analog, Calibration_Sign, Calibration_H, Calibration_L, Control, Panel \
         FROM {} WHERE SerialNumber = {} AND {} = '{}'",
        table, serial, idx_col, point_index
    );
    info!("[MCP] point_write_ffi: reading row from {} SerialNumber={} {}={}", table, serial, idx_col, point_index);
    let rows = db.query_all(sea_orm::Statement::from_string(sea_orm::DatabaseBackend::Sqlite, &sql)).await
        .map_err(|e| format!("Read current row failed: {}", e))?;
    let row = rows.first()
        .ok_or_else(|| format!("Point not found: {} index {} on device {}", point_type, point_index, serial))?;

    let cur_label: String = row.try_get::<String>("", "Label").unwrap_or_default();
    let cur_full_label: String = row.try_get::<String>("", "Full_Label").unwrap_or_default();
    let cur_fvalue: String = row.try_get::<String>("", "fValue").unwrap_or_else(|_| "0".into());
    let cur_range: String = row.try_get::<String>("", "Range_Field").unwrap_or_else(|_| "0".into());
    let cur_auto_manual: String = row.try_get::<String>("", "Auto_Manual").unwrap_or_else(|_| "0".into());
    let cur_filter: String = row.try_get::<String>("", "Filter_Field").unwrap_or_else(|_| "0".into());
    let cur_digital_analog: String = row.try_get::<String>("", "Digital_Analog").unwrap_or_else(|_| "0".into());
    let cur_cal_sign: String = row.try_get::<String>("", "Calibration_Sign").unwrap_or_else(|_| "0".into());
    let cur_cal_h: String = row.try_get::<String>("", "Calibration_H").unwrap_or_else(|_| "0".into());
    let cur_cal_l: String = row.try_get::<String>("", "Calibration_L").unwrap_or_else(|_| "0".into());
    let cur_control: String = row.try_get::<String>("", "Control").unwrap_or_else(|_| "0".into());
    let cur_panel: String = row.try_get::<String>("", "Panel").unwrap_or_default();

    // Step 2: Get panel_id — prefer point's Panel, then DEVICES.Panel_Number, then 1
    let panel_id: i32 = if !cur_panel.is_empty() {
        cur_panel.parse::<i32>().unwrap_or(1)
    } else {
        let dev_sql = format!("SELECT Panel_Number FROM DEVICES WHERE SerialNumber = {}", serial);
        let dev_rows = db.query_all(sea_orm::Statement::from_string(sea_orm::DatabaseBackend::Sqlite, &dev_sql)).await
            .map_err(|e| format!("Device lookup failed: {}", e))?;
        dev_rows.first().and_then(|r| r.try_get::<i32>("", "Panel_Number").ok()).unwrap_or(1)
    };
    info!("[MCP] point_write_ffi: panel_id={}, merging field='{}' val='{}'", panel_id, target_field, new_value_str);

    // Step 3: Merge — DB stores fValue as raw integer (×1000), FFI expects display value (/1000)
    let pf32 = |s: &str| s.parse::<f32>().unwrap_or(0.0);
    let pi32 = |s: &str| s.parse::<i32>().unwrap_or(0);
    let cur_fvalue_display = pf32(&cur_fvalue) / 1000.0; // DB raw → display (e.g., 72500 → 72.5)
    let (ffi_value, ffi_label, ffi_description, ffi_range, ffi_auto_manual, ffi_digital_analog) = match target_field {
        "label" => (cur_fvalue_display, new_value_str.to_string(), cur_full_label, pi32(&cur_range), pi32(&cur_auto_manual), pi32(&cur_digital_analog)),
        "description" => (cur_fvalue_display, cur_label, new_value_str.to_string(), pi32(&cur_range), pi32(&cur_auto_manual), pi32(&cur_digital_analog)),
        "range" => (cur_fvalue_display, cur_label, cur_full_label, pi32(new_value_str), pi32(&cur_auto_manual), pi32(&cur_digital_analog)),
        "auto_manual" => (cur_fvalue_display, cur_label, cur_full_label, pi32(&cur_range), pi32(new_value_str), pi32(&cur_digital_analog)),
        "digital_analog" => (cur_fvalue_display, cur_label, cur_full_label, pi32(&cur_range), pi32(&cur_auto_manual), pi32(new_value_str)),
        _ => (pf32(new_value_str), cur_label, cur_full_label, pi32(&cur_range), pi32(&cur_auto_manual), pi32(&cur_digital_analog)),
    };

    // Step 4: Build Action 16 JSON
    let ffi_json = json!({
        "action": 16, "panelId": panel_id, "serialNumber": serial,
        "entryType": entry_type, "entryIndex": point_index,
        "control": pi32(&cur_control), "value": ffi_value,
        "description": ffi_description, "label": ffi_label, "range": ffi_range,
        "auto_manual": ffi_auto_manual, "filter": pi32(&cur_filter),
        "digital_analog": ffi_digital_analog, "calibration_sign": pi32(&cur_cal_sign),
        "calibration_h": pi32(&cur_cal_h), "calibration_l": pi32(&cur_cal_l), "decom": 0,
    });
    let ffi_str = ffi_json.to_string();
    mcp_log(&format!("FFI Action 16: {}", ffi_str));
    info!("[MCP] point_write_ffi: calling C++ FFI Action 16...");

    // Step 5: Call FFI
    let ffi_service = T3000FfiApiService::new();
    ffi_service.call_ffi(&ffi_str).await
        .map_err(|e| format!("Device write failed (FFI error): {}", e))?;

    // Step 6: Update DB — fValue is stored as raw int (×1000), other fields as-is
    let (db_col, db_val) = match target_field {
        "label" => ("Label", new_value_str.to_string()),
        "description" => ("Full_Label", new_value_str.to_string()),
        "range" => ("Range_Field", new_value_str.to_string()),
        "auto_manual" => ("Auto_Manual", new_value_str.to_string()),
        "digital_analog" => ("Digital_Analog", new_value_str.to_string()),
        _ => ("fValue", (pf32(new_value_str) * 1000.0).to_string()), // scale: display → DB raw
    };
    let update_sql = format!("UPDATE {} SET {} = '{}' WHERE SerialNumber = {} AND {} = '{}'",
        table, db_col, db_val, serial, idx_col, point_index);
    db.execute(sea_orm::Statement::from_string(sea_orm::DatabaseBackend::Sqlite, &update_sql)).await
        .map_err(|e| format!("DB update failed (device was updated): {}", e))?;

    info!("[MCP] point_write OK: dev={} {}[{}] field={} val={}", serial, point_type, point_index, target_field, new_value_str);
    mcp_log(&format!("OK: dev={} {}[{}] field={} val={}", serial, point_type, point_index, target_field, new_value_str));
    Ok(json!({"success": true, "written_field": target_field, "written_value": new_value_str, "timestamp": Utc::now().to_rfc3339()}).to_string())
}

// ═══ Diagnostics Helper ═══

async fn run_device_diagnostics(db: &sea_orm::DatabaseConnection, serial: i32) -> Result<Value, String> {
    let now = Utc::now().to_rfc3339();

    // 1. Basic device info
    let dev_sql = format!(
        "SELECT Product_Name FROM DEVICES WHERE SerialNumber = {}", serial
    );
    let dev_rows = db.query_all(sea_orm::Statement::from_string(sea_orm::DatabaseBackend::Sqlite, &dev_sql)).await
        .map_err(|e| format!("Device query failed: {}", e))?;
    let dev = dev_rows.first()
        .ok_or_else(|| format!("Device {} not found", serial))?;

    let name: String = dev.try_get("", "Product_Name").unwrap_or_default();

    // Firmware + hardware from HARDWARE_INFO
    let hw_sql = format!(
        "SELECT Hardware_Rev, Firmware0_Rev_Main, Firmware0_Rev_Sub
         FROM HARDWARE_INFO WHERE SerialNumber = {}", serial
    );
    let (hw, fw_hi, fw_lo) = db.query_all(sea_orm::Statement::from_string(sea_orm::DatabaseBackend::Sqlite, &hw_sql)).await
        .ok().and_then(|r| r.first().map(|rr| (
            rr.try_get::<i32>("", "Hardware_Rev").unwrap_or(0),
            rr.try_get::<i32>("", "Firmware0_Rev_Main").unwrap_or(0),
            rr.try_get::<i32>("", "Firmware0_Rev_Sub").unwrap_or(0),
        ))).unwrap_or((0, 0, 0));

    // 2. Point counts
    let count_sql = format!(
        "SELECT 'inputs' as kind, COUNT(*) as cnt FROM INPUTS WHERE SerialNumber = {0}
         UNION ALL SELECT 'outputs', COUNT(*) FROM OUTPUTS WHERE SerialNumber = {0}
         UNION ALL SELECT 'variables', COUNT(*) FROM VARIABLES WHERE SerialNumber = {0}", serial
    );
    let mut input_count = 0i64; let mut output_count = 0i64; let mut var_count = 0i64;
    if let Ok(rows) = db.query_all(sea_orm::Statement::from_string(sea_orm::DatabaseBackend::Sqlite, &count_sql)).await {
        for row in &rows {
            let kind: String = row.try_get("", "kind").unwrap_or_default();
            let cnt: i64 = row.try_get("", "cnt").unwrap_or(0);
            match kind.as_str() { "inputs" => { input_count = cnt; } "outputs" => { output_count = cnt; } "variables" => { var_count = cnt; } _ => {} }
        }
    }

    // 3. Active alarms
    let alarm_sql = format!("SELECT COUNT(*) as cnt FROM ALARMS WHERE SerialNumber = {} AND (Acknowledged IS NULL OR Acknowledged = '' OR Acknowledged = '0')", serial);
    let active_alarms: i64 = db.query_all(sea_orm::Statement::from_string(sea_orm::DatabaseBackend::Sqlite, &alarm_sql)).await
        .ok().and_then(|r| r.first().and_then(|rr| rr.try_get::<i64>("", "cnt").ok())).unwrap_or(0);

    // 4. Trendlogs
    let tl_sql = format!("SELECT COUNT(*) as cnt FROM TRENDLOGS WHERE SerialNumber = {}", serial);
    let trendlog_count: i64 = db.query_all(sea_orm::Statement::from_string(sea_orm::DatabaseBackend::Sqlite, &tl_sql)).await
        .ok().and_then(|r| r.first().and_then(|rr| rr.try_get::<i64>("", "cnt").ok())).unwrap_or(0);

    // 5. Programs
    let prog_sql = format!("SELECT COUNT(*) as cnt, SUM(CASE WHEN Program_Status = '1' THEN 1 ELSE 0 END) as running FROM PROGRAMS WHERE SerialNumber = {}", serial);
    let (prog_count, prog_running) = db.query_all(sea_orm::Statement::from_string(sea_orm::DatabaseBackend::Sqlite, &prog_sql)).await
        .ok().and_then(|r| r.first().map(|rr| (
            rr.try_get::<i64>("", "cnt").unwrap_or(0),
            rr.try_get::<i64>("", "running").unwrap_or(0),
        ))).unwrap_or((0, 0));

    // 6. Schedules
    let sch_sql = format!("SELECT COUNT(*) as cnt FROM SCHEDULES WHERE SerialNumber = {}", serial);
    let schedule_count: i64 = db.query_all(sea_orm::Statement::from_string(sea_orm::DatabaseBackend::Sqlite, &sch_sql)).await
        .ok().and_then(|r| r.first().and_then(|rr| rr.try_get::<i64>("", "cnt").ok())).unwrap_or(0);

    // 7. PID loops
    let pid_sql = format!("SELECT COUNT(*) as cnt, SUM(CASE WHEN Auto_Manual = '1' THEN 1 ELSE 0 END) as auto FROM PID_TABLE WHERE SerialNumber = {}", serial);
    let (pid_count, pid_auto) = db.query_all(sea_orm::Statement::from_string(sea_orm::DatabaseBackend::Sqlite, &pid_sql)).await
        .ok().and_then(|r| r.first().map(|rr| (
            rr.try_get::<i64>("", "cnt").unwrap_or(0),
            rr.try_get::<i64>("", "auto").unwrap_or(0),
        ))).unwrap_or((0, 0));

    // 8. Network settings
    let net_sql = format!("SELECT IP_Address, TCP_Type FROM NETWORK_SETTINGS WHERE SerialNumber = {}", serial);
    let (ip, tcp_type) = db.query_all(sea_orm::Statement::from_string(sea_orm::DatabaseBackend::Sqlite, &net_sql)).await
        .ok().and_then(|r| r.first().map(|rr| (
            rr.try_get::<String>("", "IP_Address").unwrap_or_default(),
            rr.try_get::<String>("", "TCP_Type").unwrap_or_default(),
        ))).unwrap_or_default();

    let issues: Vec<&str> = {
        let mut i = Vec::new();
        if active_alarms > 0 { i.push("active_alarms"); }
        if prog_count == 0 { i.push("no_programs"); }
        if pid_count == 0 { i.push("no_pid_loops"); }
        if ip.is_empty() { i.push("no_ip"); }
        i
    };
    let health = if issues.is_empty() { "good" }
        else if issues.len() <= 2 { "warning" }
        else { "needs_attention" };

    Ok(json!({
        "serial": serial,
        "name": name,
        "firmware": format!("{}.{}", fw_hi, fw_lo),
        "hardware_rev": hw,
        "ip_address": ip,
        "tcp_type": tcp_type,
        "points": { "inputs": input_count, "outputs": output_count, "variables": var_count, "total": input_count + output_count + var_count },
        "active_alarms": active_alarms,
        "trendlogs": trendlog_count,
        "programs": { "total": prog_count, "running": prog_running },
        "schedules": schedule_count,
        "pid_loops": { "total": pid_count, "in_auto": pid_auto },
        "health": health,
        "issues": issues,
        "timestamp": now,
    }))
}

// ═══ Navigation Data (static page registry) ═══

struct NavPage {
    title: &'static str,
    path: &'static str,
    shortcut: &'static str,
    requires_device: bool,
    section: &'static str,
    description: &'static str,
    features: &'static [&'static str],
    related_tools: &'static [&'static str],
}

fn get_nav_pages() -> Vec<NavPage> {
    vec![
        // ── Points ──
        NavPage { title: "Dashboard", path: "/t3000/dashboard", shortcut: "", requires_device: false, section: "points",
            description: "Overview of all devices with online/offline status, alarm counts, and quick stats.",
            features: &["Device cards with status", "Online/offline indicators", "Alarm count badges", "Quick navigation to device pages"],
            related_tools: &["device_list", "building_summary", "device_diagnostics_batch"] },
        NavPage { title: "Inputs", path: "/t3000/inputs", shortcut: "Alt+I", requires_device: true, section: "points",
            description: "View and configure input points (analog sensors, digital inputs). Shows labels, values, engineering units, range, and digital/analog type.",
            features: &["Search/filter by label", "Edit labels and descriptions", "Batch edit mode", "Column visibility toggles", "Auto-tagging integration", "Value display with units"],
            related_tools: &["point_read", "point_write", "point_read_batch", "device_get_points", "haystack_auto_tag"] },
        NavPage { title: "Outputs", path: "/t3000/outputs", shortcut: "Alt+O", requires_device: true, section: "points",
            description: "View and control output points. Override values, toggle auto/manual mode, configure ranges and labels.",
            features: &["Search/filter by label", "Override output values", "Auto/manual mode toggle", "Batch edit mode", "Column visibility toggles", "Auto-tagging integration"],
            related_tools: &["point_read", "point_write", "point_write_batch", "device_get_points"] },
        NavPage { title: "Variables", path: "/t3000/variables", shortcut: "Alt+V", requires_device: true, section: "points",
            description: "View and edit variable points used in control logic, setpoints, and calculations.",
            features: &["Search/filter by label", "Edit values and labels", "Batch edit mode", "Column visibility toggles"],
            related_tools: &["point_read", "point_write", "point_read_batch"] },
        // ── Control ──
        NavPage { title: "Programs", path: "/t3000/programs", shortcut: "Alt+P", requires_device: true, section: "control",
            description: "PLC program editor. View and edit PLC/BASIC control programs. Shows program status (running/stopped), size, and source code.",
            features: &["Program list with status", "Source code viewer/editor", "Run/stop programs", "Auto/manual mode", "Program size display"],
            related_tools: &["program_list", "program_read"] },
        NavPage { title: "PID Loops", path: "/t3000/pidloops", shortcut: "Alt+L", requires_device: true, section: "control",
            description: "Configure PID control loops. Set setpoint, proportional/reset/rate parameters, action type, and auto/manual mode.",
            features: &["PID loop list", "Setpoint adjustment", "P/I/D parameter tuning", "Auto/manual mode toggle", "Input/output value display"],
            related_tools: &["pid_list"] },
        NavPage { title: "Schedules", path: "/t3000/schedules", shortcut: "Alt+S", requires_device: true, section: "control",
            description: "Weekly schedule editor. Configure time-based ON/OFF events for each day of the week.",
            features: &["Daily time settings", "Output/variable assignment", "Interval settings", "Holiday overrides"],
            related_tools: &["schedule_list"] },
        NavPage { title: "Holidays", path: "/t3000/holidays", shortcut: "Alt+H", requires_device: true, section: "control",
            description: "Holiday exception schedules. Define dates that override normal weekly schedules.",
            features: &["Date-based exceptions", "Month/day/year fields", "Holiday value settings", "Auto/manual mode"],
            related_tools: &["holiday_list"] },
        // ── Monitoring ──
        NavPage { title: "Alarms", path: "/t3000/alarms", shortcut: "Alt+A", requires_device: true, section: "monitoring",
            description: "Active alarm log. View and acknowledge alarms with priority levels, timestamps, and descriptions.",
            features: &["Active alarm list", "Acknowledge alarms", "Priority indicators", "Alarm type and source", "Timestamp display"],
            related_tools: &["alarm_list", "alarm_acknowledge", "alarm_settings_read"] },
        NavPage { title: "Trend Logs", path: "/t3000/trendlogs", shortcut: "Alt+T", requires_device: true, section: "monitoring",
            description: "Monitor and analyze trend log data. View historical values for points with trend logging enabled.",
            features: &["Trend log list", "Data point configuration", "Interval settings", "Historical data viewer"],
            related_tools: &["trendlog_list", "trendlog_query", "trendlog_export"] },
        NavPage { title: "Trend Chart", path: "/t3000/trends/chart", shortcut: "", requires_device: false, section: "monitoring",
            description: "Visual trend chart. Plot historical data over time with zoom and pan.",
            features: &["Time-series chart", "Multi-point overlay", "Zoom and pan", "Time range selection"],
            related_tools: &["trendlog_query", "trendlog_export"] },
        NavPage { title: "Graphics", path: "/t3000/graphics", shortcut: "Alt+G", requires_device: true, section: "monitoring",
            description: "HMI graphic screens. View and edit visual representations of equipment with live point bindings.",
            features: &["Graphic screen list", "Live point values", "Picture file display", "Switch node navigation"],
            related_tools: &["graphics_list"] },
        // ── Config ──
        NavPage { title: "Settings", path: "/t3000/settings", shortcut: "Alt+E", requires_device: true, section: "config",
            description: "Device configuration. Network (IP/subnet/gateway), communication (COM ports/baud rates), time (timezone/NTP), and email alarm settings.",
            features: &["Network settings", "Communication settings", "Time/NTP settings", "Protocol settings", "Email alarm settings", "DynDNS settings"],
            related_tools: &["settings_read", "settings_write"] },
        NavPage { title: "Users", path: "/t3000/users", shortcut: "", requires_device: false, section: "config",
            description: "User account management. Configure user names, access levels, rights, and default panels.",
            features: &["User list", "Access level configuration", "Rights management", "Default panel assignment"],
            related_tools: &["users_list"] },
        NavPage { title: "Custom Units", path: "/t3000/custom-units", shortcut: "", requires_device: true, section: "config",
            description: "Custom engineering units. Define unit conversion tables for specialized sensors.",
            features: &["Unit table editor", "Conversion formulas", "Unit assignment to points"],
            related_tools: &[] },
        NavPage { title: "Haystack Tags", path: "/t3000/haystack-tags", shortcut: "Alt+Y", requires_device: false, section: "config",
            description: "Haystack semantic tagging. Browse and manage Haystack v4 tags across all devices.",
            features: &["Tag list with categories", "Point-tag mappings", "Tag documentation"],
            related_tools: &["haystack_list_tags", "haystack_get_point_tags", "haystack_search_points"] },
        NavPage { title: "Auto-Tagging & MCP", path: "/t3000/auto-tagging", shortcut: "", requires_device: false, section: "config",
            description: "Auto-tagging rules and MCP server management. Create regex rules to automatically apply Haystack tags and Brick classes.",
            features: &["Auto-tagging rule editor", "Rule preview", "MCP tool reference", "Prompt examples"],
            related_tools: &["haystack_auto_tag", "haystack_preview_tags", "haystack_list_rules", "rule_create", "rule_toggle"] },
        // ── System ──
        NavPage { title: "Discover Devices", path: "/t3000/discover", shortcut: "", requires_device: false, section: "system",
            description: "Device discovery. Scan the network for T3000 controllers using BACnet/MSTP or Modbus.",
            features: &["Network scan", "Device list", "Add discovered devices", "Connection testing"],
            related_tools: &["device_list"] },
        NavPage { title: "Buildings", path: "/t3000/buildings", shortcut: "", requires_device: false, section: "system",
            description: "Building hierarchy. Organize devices into buildings, floors, and rooms.",
            features: &["Building/floor/room tree", "Device assignment", "Hierarchy navigation"],
            related_tools: &["device_list"] },
        NavPage { title: "Network Points", path: "/t3000/network", shortcut: "Alt+N", requires_device: true, section: "system",
            description: "Network point configuration. Set up remote I/O points shared across devices.",
            features: &["Remote point table", "Point mapping", "Network binding"],
            related_tools: &[] },
        NavPage { title: "Array", path: "/t3000/array", shortcut: "", requires_device: true, section: "system",
            description: "Array editor. Configure array data structures for batch point operations.",
            features: &["Array list", "Element editor", "Batch operations"],
            related_tools: &[] },
        NavPage { title: "Tables", path: "/t3000/tables", shortcut: "", requires_device: true, section: "system",
            description: "Generic data tables. View and edit custom table data stored on devices.",
            features: &["Table browser", "Row editor", "Import/export"],
            related_tools: &[] },
        // ── Develop ──
        NavPage { title: "File Browser", path: "/t3000/develop/files", shortcut: "", requires_device: false, section: "develop",
            description: "Browse project files and upload/download device configurations.",
            features: &["File tree", "Upload/download", "File operations"],
            related_tools: &[] },
        NavPage { title: "Database Viewer", path: "/t3000/develop/database", shortcut: "", requires_device: false, section: "develop",
            description: "Direct database viewer. Inspect SQLite tables and run queries.",
            features: &["Table browser", "SQL query editor", "Data export"],
            related_tools: &["point_read", "device_list"] },
        NavPage { title: "Transport Tester", path: "/t3000/develop/transport", shortcut: "", requires_device: false, section: "develop",
            description: "Network transport testing. Send raw commands to devices for debugging.",
            features: &["Command sender", "Response viewer", "Protocol debug"],
            related_tools: &[] },
        NavPage { title: "T3000 Logs", path: "/t3000/develop/logs", shortcut: "", requires_device: false, section: "develop",
            description: "Application and FFI logs. View debug output from the T3000 backend.",
            features: &["Log viewer", "Filter by level", "Search", "Export"],
            related_tools: &[] },
        NavPage { title: "Database Config", path: "/t3000/database/config", shortcut: "", requires_device: false, section: "develop",
            description: "Database connection settings. Configure SQL Server or SQLite backend.",
            features: &["Connection string editor", "Test connection", "Migration tools"],
            related_tools: &[] },
        NavPage { title: "Documentation", path: "/t3000/documentation", shortcut: "", requires_device: false, section: "develop",
            description: "Product documentation. Browse user guides, API references, and tutorials.",
            features: &["Doc browser", "Search", "Section navigation"],
            related_tools: &["doc_list", "doc_read"] },
    ]
}

pub(crate) async fn execute_tool(
    name: &str,
    args: &Value,
    db: &sea_orm::DatabaseConnection,
) -> Result<String, String> {
    info!("[MCP] -> {} args={}", name, serde_json::to_string(args).unwrap_or_default());
    mcp_log(&format!("-> {} {}", name, serde_json::to_string(args).unwrap_or_default()));

    // Track the device the user is working with for device_current
    track_current_device(args).await;

    let result = match name {
        "t3000_haystack_list_tags" => {
            let filter = args.get("filter")
                .and_then(|v| v.as_str())
                .filter(|s| !s.is_empty());
            let tags = ts::list_tags(db, filter)
                .await
                .map_err(|e| format!("Failed to list tags: {}", e))?;
            serde_json::to_string_pretty(&json!({
                "tags": tags,
                "total": tags.len()
            }))
            .map_err(|e| format!("Serialize error: {}", e))
        }

        "t3000_haystack_get_point_tags" => {
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

        "t3000_haystack_search_points" => {
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

        "t3000_haystack_auto_tag" => {
            let serial_numbers: Vec<i32> = args
                .get("serial_numbers")
                .and_then(|v| v.as_array())
                .map(|a| a.iter().filter_map(|v| v.as_i64().map(|n| n as i32)).collect())
                .unwrap_or_default();

            if serial_numbers.is_empty() {
                return Ok(json!({"error": "No serial numbers provided"}).to_string());
            }

            let (count, _matches) = ats::run_auto_tagging(db, &serial_numbers, None).await?;
            Ok(json!({
                "success": true,
                "message": "Auto-tagging completed",
                "points_tagged": count
            })
            .to_string())
        }

        "t3000_haystack_preview_tags" => {
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

        "t3000_haystack_list_rules" => {
            let rules = ats::list_rules(db)
                .await
                .map_err(|e| format!("Failed to list rules: {}", e))?;
            serde_json::to_string_pretty(&json!({
                "rules": rules,
                "total": rules.len()
            }))
            .map_err(|e| format!("Serialize error: {}", e))
        }

        "t3000_haystack_get_brick_class" => {
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

        "t3000_ping" => {
            let now = Utc::now().to_rfc3339();
            Ok(json!({
                "status": "ok",
                "timestamp": now,
                "server": SERVER_NAME
            }).to_string())
        }

        "t3000_get_version" => {
            Ok(json!({
                "name": SERVER_NAME,
                "version": SERVER_VERSION,
                "protocolVersion": PROTOCOL_VERSION,
                "toolCount": TOOLS.len()
            }).to_string())
        }

        "t3000_describe_tool" => {
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

        "t3000_device_list" => {
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

        "t3000_device_get_points" => {
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

            // ── Device point metadata (label, units, range, digital/analog, description, value) ──
            let meta_sql: String;
            if let Some(pt_filter) = point_type_filter {
                let (table, idx_col) = match pt_filter {
                    "INPUT" => ("INPUTS", "Input_Index"),
                    "OUTPUT" => ("OUTPUTS", "Output_Index"),
                    "VARIABLE" => ("VARIABLES", "Variable_Index"),
                    _ => ("INPUTS", "Input_Index"),
                };
                meta_sql = format!(
                    "SELECT '{}' as point_type, {} as point_index, Label, Units as engineering_units, \
                     Range_Field as range_field, Digital_Analog as digital_analog, Full_Label as description, \
                     fValue as current_value \
                     FROM {} WHERE SerialNumber = {}",
                    pt_filter, idx_col, table, serial
                );
            } else {
                meta_sql = format!(
                    "SELECT 'INPUT' as point_type, Input_Index as point_index, Label, Units as engineering_units, \
                     Range_Field as range_field, Digital_Analog as digital_analog, Full_Label as description, \
                     fValue as current_value \
                     FROM INPUTS WHERE SerialNumber = {0} \
                     UNION ALL SELECT 'OUTPUT', Output_Index, Label, Units, Range_Field, Digital_Analog, Full_Label, fValue \
                     FROM OUTPUTS WHERE SerialNumber = {0} \
                     UNION ALL SELECT 'VARIABLE', Variable_Index, Label, Units, Range_Field, Digital_Analog, Full_Label, fValue \
                     FROM VARIABLES WHERE SerialNumber = {0}",
                    serial
                );
            }

            let meta_rows = db
                .query_all(sea_orm::Statement::from_string(sea_orm::DatabaseBackend::Sqlite, &meta_sql))
                .await
                .map_err(|e| format!("Metadata query failed: {}", e))?;

            struct PointMeta {
                label: Option<String>,
                engineering_units: Option<String>,
                range_field: Option<String>,
                digital_analog: Option<String>,
                description: Option<String>,
                current_value: Option<String>,
            }
            let mut meta_map: std::collections::HashMap<String, PointMeta> = std::collections::HashMap::new();
            for row in &meta_rows {
                let pt: String = row.try_get("", "point_type").unwrap_or_default();
                let idx_str: String = row.try_get("", "point_index").unwrap_or_default();
                if !idx_str.is_empty() {
                    let key = format!("{}:{}", pt, idx_str);
                    meta_map.insert(key, PointMeta {
                        label: row.try_get("", "Label").ok(),
                        engineering_units: row.try_get("", "engineering_units").ok(),
                        range_field: row.try_get("", "range_field").ok(),
                        digital_analog: row.try_get("", "digital_analog").ok(),
                        description: row.try_get("", "description").ok(),
                        current_value: row.try_get("", "current_value").ok(),
                    });
                }
            }

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
                    let meta = meta_map.get(&key);
                    results.push(json!({
                        "point_type": entry.point_type,
                        "point_index": entry.point_index,
                        "point_id": entry.point_id,
                        "label": meta.and_then(|m| m.label.clone()),
                        "engineering_units": meta.and_then(|m| m.engineering_units.clone()),
                        "range_field": meta.and_then(|m| m.range_field.clone()),
                        "digital_analog": meta.and_then(|m| m.digital_analog.clone()),
                        "description": meta.and_then(|m| m.description.clone()),
                        "current_value": meta.and_then(|m| m.current_value.clone()),
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

        "t3000_point_get_metadata" => {
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
                "SELECT Label, Units, Range_Field, Digital_Analog, Full_Label, fValue
                 FROM {} WHERE SerialNumber = {} AND {} = '{}'",
                table_name, serial, idx_col, point_index
            );
            let pt_rows = db
                .query_all(sea_orm::Statement::from_string(sea_orm::DatabaseBackend::Sqlite, &pt_sql))
                .await
                .map_err(|e| format!("Point query failed: {}", e))?;

            let (label, units, range_field, digital_analog, description, current_value) = if let Some(row) = pt_rows.first() {
                (
                    row.try_get::<String>("", "Label").ok(),
                    row.try_get::<String>("", "Units").ok(),
                    row.try_get::<String>("", "Range_Field").ok(),
                    row.try_get::<String>("", "Digital_Analog").ok(),
                    row.try_get::<String>("", "Full_Label").ok(),
                    row.try_get::<String>("", "fValue").ok(),
                )
            } else {
                (None, None, None, None, None, None)
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
                "current_value": current_value,
                "haystack_tags": tags,
                "brick_class": brick_class,
            }))
            .map_err(|e| format!("Serialize error: {}", e))
        }

        "t3000_metadata_search" => {
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

        // ═══ v4: Semantic Search ═══

        "t3000_point_search" => {
            let query = args.get("query").and_then(|v| v.as_str())
                .ok_or_else(|| "query required".to_string())?;
            let serial_filter: Option<Vec<i32>> = args.get("serial_numbers")
                .and_then(|v| v.as_array())
                .map(|a| a.iter().filter_map(|v| v.as_i64().map(|n| n as i32)).collect());
            let limit: usize = args.get("limit").and_then(|v| v.as_u64()).map(|n| n as usize).unwrap_or(10);

            let query_lower = query.to_lowercase();
            let query_words: Vec<&str> = query_lower.split_whitespace().collect();

            // Collect all points with their full metadata for scoring
            let all_serials: Vec<i32> = if let Some(ref sf) = serial_filter { sf.clone() } else {
                let dev_sql = "SELECT SerialNumber FROM DEVICES";
                db.query_all(sea_orm::Statement::from_string(sea_orm::DatabaseBackend::Sqlite, dev_sql)).await
                    .map_err(|e| format!("Device list failed: {}", e))?
                    .iter()
                    .filter_map(|r| r.try_get::<i32>("", "SerialNumber").ok())
                    .collect()
            };

            let mut scored: Vec<(i32, Value)> = Vec::new();
            for sn in &all_serials {
                let sn_filter = vec![*sn];
                let tag_entries = ts::get_point_tags(db, &sn_filter, None).await.unwrap_or_default();
                if tag_entries.is_empty() { continue; }

                let pt_sql = format!(
                    "SELECT 'INPUT' as point_type, Input_Index as point_index, Label, Units, Full_Label, fValue \
                     FROM INPUTS WHERE SerialNumber = {0} \
                     UNION ALL SELECT 'OUTPUT', Output_Index, Label, Units, Full_Label, fValue \
                     FROM OUTPUTS WHERE SerialNumber = {0} \
                     UNION ALL SELECT 'VARIABLE', Variable_Index, Label, Units, Full_Label, fValue \
                     FROM VARIABLES WHERE SerialNumber = {0}", sn
                );
                let pt_rows = db.query_all(sea_orm::Statement::from_string(sea_orm::DatabaseBackend::Sqlite, &pt_sql)).await.unwrap_or_default();

                let mut tag_map: HashMap<String, Vec<String>> = HashMap::new();
                for e in &tag_entries {
                    tag_map.entry(format!("{}:{}", e.point_type, e.point_index)).or_default().push(e.tag_name.clone());
                }

                for row in &pt_rows {
                    let pt: String = row.try_get("", "point_type").unwrap_or_default();
                    let idx: String = row.try_get("", "point_index").unwrap_or_default();
                    let label: String = row.try_get("", "Label").unwrap_or_default();
                    let units: String = row.try_get("", "Units").unwrap_or_default();
                    let desc: String = row.try_get("", "Full_Label").unwrap_or_default();
                    let fval: String = row.try_get("", "fValue").unwrap_or_default();

                    let key = format!("{}:{}", pt, idx);
                    let tags = tag_map.get(&key).cloned().unwrap_or_default();
                    let label_lower = label.to_lowercase();
                    let desc_lower = desc.to_lowercase();
                    let pt_lower = pt.to_lowercase();
                    let units_lower = units.to_lowercase();

                    // Score: word matches in label (×3), description (×2), tags (×2), point_type, units
                    let mut score: i32 = 0;
                    for w in &query_words {
                        if label_lower.contains(w) { score += 3; }
                        if desc_lower.contains(w) { score += 2; }
                        if pt_lower.contains(w) { score += 1; }
                        if units_lower.contains(w) { score += 1; }
                        for t in &tags { if t.to_lowercase().contains(w) { score += 2; } }
                    }
                    if score > 0 {
                        let display_val: Option<f64> = if pt == "INPUT" && !fval.is_empty() {
                            fval.parse::<f64>().ok().map(|v| v / 1000.0)
                        } else { fval.parse::<f64>().ok() };
                        scored.push((score, json!({
                            "serial_number": sn, "point_type": pt, "point_index": idx,
                            "label": label, "description": desc, "units": units,
                            "current_value": display_val, "haystack_tags": tags,
                            "score": score
                        })));
                    }
                }
            }
            scored.sort_by(|a, b| b.0.cmp(&a.0));
            let results: Vec<Value> = scored.into_iter().take(limit).map(|(_, v)| v).collect();
            serde_json::to_string_pretty(&json!({"results": results, "total": results.len()}))
                .map_err(|e| format!("Serialize error: {}", e))
        }

        // ═══ v4: Operational ═══

        "t3000_point_read" => {
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

        "t3000_point_write" => {
            let serial: i32 = args.get("serial_number")
                .and_then(|v| v.as_i64()).map(|n| n as i32)
                .ok_or_else(|| "serial_number required".to_string())?;
            let point_type = args.get("point_type").and_then(|v| v.as_str())
                .ok_or_else(|| "point_type required".to_string())?;
            let point_index: i32 = args.get("point_index")
                .and_then(|v| v.as_i64()).map(|n| n as i32)
                .ok_or_else(|| "point_index required".to_string())?;
            let confirm = args.get("confirm").and_then(|v| v.as_bool()).unwrap_or(false);
            let field = args.get("field").and_then(|v| v.as_str()).unwrap_or("value");

            let valid_fields = ["value", "label", "description", "range", "auto_manual", "digital_analog"];
            if !valid_fields.contains(&field) {
                return Err(format!("Invalid field '{}'. Valid fields: {}", field, valid_fields.join(", ")));
            }

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

            info!("[MCP] point_write: serial={} type={} idx={} field={} val={}",
                serial, point_type, point_index, field, value_str);
            let write_result = point_write_ffi(db, serial, point_type, point_index, field, &value_str).await?;

            // Optional readback to confirm
            let readback = args.get("readback").and_then(|v| v.as_bool()).unwrap_or(false);
            if readback && field == "value" {
                let (table, idx_col, val_col, label_col, units_col) = match point_type {
                    "INPUT" => ("INPUTS", "Input_Index", "fValue", "Label", "Units"),
                    "OUTPUT" => ("OUTPUTS", "Output_Index", "fValue", "Label", "Units"),
                    _ => ("VARIABLES", "Variable_Index", "fValue", "Label", "Units"),
                };
                let sql = format!(
                    "SELECT {}, {}, {} FROM {} WHERE SerialNumber = {} AND {} = '{}'",
                    val_col, label_col, units_col, table, serial, idx_col, point_index
                );
                if let Ok(rows) = db.query_all(sea_orm::Statement::from_string(sea_orm::DatabaseBackend::Sqlite, &sql)).await {
                    if let Some(row) = rows.first() {
                        let readback_val: Option<String> = row.try_get("", val_col).ok();
                        let readback_label: Option<String> = row.try_get("", label_col).ok();
                        let readback_units: Option<String> = row.try_get("", units_col).ok();
                        let parsed = readback_val.as_ref().and_then(|v| v.parse::<f64>().ok());
                        let display = if point_type == "INPUT" { parsed.map(|x| x / 1000.0) } else { parsed };
                        return Ok(json!({
                            "success": true,
                            "written_field": field,
                            "written_value": value_str,
                            "readback": { "label": readback_label, "value": display, "units": readback_units },
                            "timestamp": Utc::now().to_rfc3339(),
                        }).to_string());
                    }
                }
            }

            Ok(write_result)
        }

        "t3000_point_read_batch" => {
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

        "t3000_point_write_batch" => {
            let points: Vec<Value> = args.get("points")
                .and_then(|v| v.as_array())
                .map(|a| a.to_vec())
                .unwrap_or_default();
            let confirm = args.get("confirm").and_then(|v| v.as_bool()).unwrap_or(false);

            if !confirm {
                return Err("Batch write requires confirm: true for safety".to_string());
            }

            let mut updated = 0;
            let mut errors: Vec<String> = Vec::new();
            for point in &points {
                let sn = point.get("serial_number").and_then(|v| v.as_i64()).map(|n| n as i32);
                let pt = point.get("point_type").and_then(|v| v.as_str());
                let idx = point.get("point_index").and_then(|v| v.as_i64()).map(|n| n as i32);
                let val = point.get("value");
                let field = point.get("field").and_then(|v| v.as_str()).unwrap_or("value");
                if let (Some(sn), Some(pt), Some(idx), Some(val)) = (sn, pt, idx, val) {
                    let value_str = match val {
                        Value::Number(n) => n.to_string(),
                        Value::Bool(b) => (if *b { "1" } else { "0" }).to_string(),
                        Value::String(s) => s.clone(),
                        _ => continue,
                    };
                    match point_write_ffi(db, sn, pt, idx, field, &value_str).await {
                        Ok(_) => updated += 1,
                        Err(e) => errors.push(format!("dev{} {}[{}]: {}", sn, pt, idx, e)),
                    }
                }
            }

            let result = json!({
                "success": errors.is_empty(),
                "count": updated,
                "errors": errors,
                "timestamp": Utc::now().to_rfc3339(),
            });
            Ok(result.to_string())
        }

        "t3000_point_batch_metadata" => {
            let points: Vec<Value> = args.get("points")
                .and_then(|v| v.as_array())
                .map(|a| a.to_vec())
                .unwrap_or_default();

            let mut results: Vec<Value> = Vec::new();
            for point in &points {
                let sn = point.get("serial_number").and_then(|v| v.as_i64()).map(|n| n as i32);
                let pt = point.get("point_type").and_then(|v| v.as_str());
                let idx = point.get("point_index").and_then(|v| v.as_i64()).map(|n| n as i32);
                if let (Some(sn), Some(pt_str), Some(idx)) = (sn, pt, idx) {
                    let (table, idx_col) = match pt_str {
                        "INPUT" => ("INPUTS", "Input_Index"),
                        "OUTPUT" => ("OUTPUTS", "Output_Index"),
                        "VARIABLE" => ("VARIABLES", "Variable_Index"),
                        _ => continue,
                    };
                    let sql = format!(
                        "SELECT Label, Units, Range_Field, Digital_Analog, Full_Label, fValue
                         FROM {} WHERE SerialNumber = {} AND {} = '{}'",
                        table, sn, idx_col, idx
                    );
                    if let Ok(rows) = db.query_all(sea_orm::Statement::from_string(sea_orm::DatabaseBackend::Sqlite, &sql)).await {
                        if let Some(row) = rows.first() {
                            let label: Option<String> = row.try_get("", "Label").ok();
                            let units: Option<String> = row.try_get("", "Units").ok();
                            let range: Option<String> = row.try_get("", "Range_Field").ok();
                            let da: Option<String> = row.try_get("", "Digital_Analog").ok();
                            let desc: Option<String> = row.try_get("", "Full_Label").ok();
                            let fval: Option<String> = row.try_get("", "fValue").ok();
                            let display_val = fval.as_ref().and_then(|v| {
                                if pt_str == "INPUT" { v.parse::<f64>().ok().map(|x| x / 1000.0) }
                                else { v.parse::<f64>().ok() }
                            });

                            // Get tags
                            let sn_filter = vec![sn];
                            let tag_entries = ts::get_point_tags(db, &sn_filter, Some(pt_str)).await.unwrap_or_default();
                            let tags: Vec<String> = tag_entries.iter()
                                .filter(|e| e.point_index == idx.to_string())
                                .map(|e| e.tag_name.clone())
                                .collect();

                            // Get brick class
                            let bc_sql = format!(
                                "SELECT brick_class FROM HAYSTACK_POINT_BRICK_CLASS
                                 WHERE serial_number = {} AND point_type = '{}' AND point_index = {}",
                                sn, pt_str, idx
                            );
                            let bc = db.query_all(sea_orm::Statement::from_string(sea_orm::DatabaseBackend::Sqlite, &bc_sql)).await
                                .ok().and_then(|r| r.first().and_then(|r2| r2.try_get::<String>("", "brick_class").ok()));

                            results.push(json!({
                                "serial_number": sn, "point_type": pt_str, "point_index": idx,
                                "label": label, "engineering_units": units, "range_field": range,
                                "digital_analog": da, "description": desc, "current_value": display_val,
                                "haystack_tags": tags, "brick_class": bc,
                            }));
                        }
                    }
                }
            }

            serde_json::to_string_pretty(&json!({
                "results": results, "requested": points.len(), "returned": results.len(),
                "timestamp": Utc::now().to_rfc3339(),
            }))
            .map_err(|e| format!("Serialize error: {}", e))
        }

        // ═══ v4: Analytics ═══

        "t3000_haystack_validate" => {
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

        "t3000_haystack_export" => {
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

                "csv-flat" => {
                    // Flat CSV: every point as a row with label, type, index, value, units, tags, brick class
                    let sn_list2 = serials.iter().map(|s| s.to_string()).collect::<Vec<_>>().join(",");
                    let pts_sql = format!(
                        "SELECT pt.serial_number, pt.point_type, pt.point_index, pt.point_id,
                                pt.tag_name, bc.brick_class
                         FROM HAYSTACK_POINT_TAGS pt
                         LEFT JOIN HAYSTACK_POINT_BRICK_CLASS bc
                           ON pt.serial_number = bc.serial_number
                           AND pt.point_type = bc.point_type
                           AND CAST(pt.point_index AS INTEGER) = bc.point_index
                         WHERE pt.serial_number IN ({})
                         ORDER BY pt.serial_number, pt.point_type, pt.point_index",
                        sn_list2
                    );
                    let tag_rows = db.query_all(sea_orm::Statement::from_string(sea_orm::DatabaseBackend::Sqlite, &pts_sql))
                        .await.unwrap_or_default();

                    // Build per-point tag/brick maps
                    let mut point_tags: HashMap<String, Vec<String>> = HashMap::new();
                    let mut point_brick: HashMap<String, String> = HashMap::new();
                    for r in &tag_rows {
                        let key = format!("{}:{}:{}",
                            r.try_get::<i32>("", "serial_number").unwrap_or(0),
                            r.try_get::<String>("", "point_type").unwrap_or_default(),
                            r.try_get::<String>("", "point_index").unwrap_or_default());
                        if let Ok(t) = r.try_get::<String>("", "tag_name") { point_tags.entry(key.clone()).or_default().push(t); }
                        if let Ok(bc) = r.try_get::<String>("", "brick_class") { point_brick.entry(key).or_insert(bc); }
                    }

                    // Collect all points from INPUTS/OUTPUTS/VARIABLES
                    struct FlatRow { sn: i32, pt: String, idx: String, label: String, desc: String, units: String, fval: String, da: String, range: String }
                    let mut all_rows: Vec<FlatRow> = Vec::new();
                    for sn in &serials {
                        let sq = format!(
                            "SELECT 'INPUT' as pt, Input_Index as idx, Label, Full_Label, Units, fValue, Digital_Analog, Range_Field as range_field FROM INPUTS WHERE SerialNumber={0}
                             UNION ALL SELECT 'OUTPUT', Output_Index, Label, Full_Label, Units, fValue, Digital_Analog, Range_Field as range_field FROM OUTPUTS WHERE SerialNumber={0}
                             UNION ALL SELECT 'VARIABLE', Variable_Index, Label, Full_Label, Units, fValue, Digital_Analog, Range_Field as range_field FROM VARIABLES WHERE SerialNumber={0}", sn
                        );
                        if let Ok(rows) = db.query_all(sea_orm::Statement::from_string(sea_orm::DatabaseBackend::Sqlite, &sq)).await {
                            for r in &rows {
                                all_rows.push(FlatRow {
                                    sn: *sn,
                                    pt: r.try_get("", "pt").unwrap_or_default(),
                                    idx: r.try_get("", "idx").unwrap_or_default(),
                                    label: r.try_get("", "Label").unwrap_or_default(),
                                    desc: r.try_get("", "Full_Label").unwrap_or_default(),
                                    units: r.try_get("", "Units").unwrap_or_default(),
                                    fval: r.try_get("", "fValue").unwrap_or_default(),
                                    da: r.try_get("", "Digital_Analog").unwrap_or_default(),
                                    range: r.try_get("", "range_field").unwrap_or_default(),
                                });
                            }
                        }
                    }

                    let mut csv = String::from("serial_number,point_type,point_index,label,description,value,units,range,digital_analog,tags,brick_class\n");
                    for row in &all_rows {
                        let key = format!("{}:{}:{}", row.sn, row.pt, row.idx);
                        let tags = point_tags.get(&key).map(|t| t.join("; ")).unwrap_or_default();
                        let bc = point_brick.get(&key).map(|s| s.as_str()).unwrap_or("");
                        let display_val: String = if row.pt == "INPUT" && !row.fval.is_empty() {
                            row.fval.parse::<f64>().map(|v| format!("{:.3}", v / 1000.0)).unwrap_or(row.fval.clone())
                        } else { row.fval.clone() };
                        let escaped_label = row.label.replace('"', "\"\"");
                        let escaped_desc = row.desc.replace('"', "\"\"");
                        csv.push_str(&format!("{},{},{},\"{}\",\"{}\",{},{},{},{},{},{}\n",
                            row.sn, row.pt, row.idx, escaped_label, escaped_desc, display_val,
                            row.units, row.range, row.da, tags, bc));
                    }

                    Ok(json!({
                        "format": "csv-flat",
                        "content": csv,
                        "total": all_rows.len(),
                    }).to_string())
                }

                _ => Err(format!("Unknown export format: {}. Use haystack-json, brick-ttl, brick-jsonld, or csv-flat", format))
            }
        }

        // ═══ v4: Rules Management ═══

        "t3000_rule_toggle" => {
            let rule_id: i64 = args.get("rule_id")
                .and_then(|v| v.as_i64())
                .ok_or_else(|| "rule_id required".to_string())?;

            let result = ats::toggle_rule(db, rule_id).await?;

            Ok(json!({
                "rule_id": rule_id,
                "enabled": result,
            }).to_string())
        }

        "t3000_rule_create" => {
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

        "t3000_alarm_list" => {
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

        "t3000_alarm_acknowledge" => {
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

        "t3000_trendlog_query" => {
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

            // Query TRENDLOG_INPUTS to find which trendlog this point belongs to
            let tl_sql = format!(
                "SELECT Trendlog_ID, PanelId FROM TRENDLOG_INPUTS
                 WHERE SerialNumber = {} AND Point_Type = '{}' AND Point_Index = '{}' LIMIT 1",
                serial, point_type, point_index
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

            let trendlog_id: String = tl_rows[0].try_get("", "Trendlog_ID").unwrap_or_default();
            let panel_id: i32 = tl_rows[0].try_get::<i32>("", "PanelId").unwrap_or(0);

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

        // ═══ v4: Device Operations ═══

        "t3000_trendlog_list" => {
            let serial: i32 = args.get("serial_number")
                .and_then(|v| v.as_i64()).map(|n| n as i32)
                .ok_or_else(|| "serial_number required".to_string())?;

            let sql = format!(
                "SELECT tl.Trendlog_ID, tl.Trendlog_Label, tl.Interval_Seconds, tl.Buffer_Size, tl.Auto_Manual, tl.Status,
                        COUNT(ti.id) as point_count
                 FROM TRENDLOGS tl
                 LEFT JOIN TRENDLOG_INPUTS ti ON tl.SerialNumber = ti.SerialNumber AND tl.Trendlog_ID = ti.Trendlog_ID
                 WHERE tl.SerialNumber = {}
                 GROUP BY tl.Trendlog_ID
                 ORDER BY tl.Trendlog_ID",
                serial
            );
            let rows = db.query_all(sea_orm::Statement::from_string(sea_orm::DatabaseBackend::Sqlite, &sql)).await
                .map_err(|e| format!("Trendlog list failed: {}", e))?;

            let results: Vec<Value> = rows.iter().map(|r| json!({
                "trendlog_id": r.try_get::<String>("", "Trendlog_ID").unwrap_or_default(),
                "label": r.try_get::<String>("", "Trendlog_Label").ok(),
                "interval_seconds": r.try_get::<i32>("", "Interval_Seconds").ok(),
                "buffer_size": r.try_get::<i32>("", "Buffer_Size").ok(),
                "auto_manual": r.try_get::<String>("", "Auto_Manual").ok(),
                "status": r.try_get::<String>("", "Status").ok(),
                "point_count": r.try_get::<i32>("", "point_count").unwrap_or(0),
            })).collect();

            serde_json::to_string_pretty(&json!({ "trendlogs": results, "total": results.len() }))
                .map_err(|e| format!("Serialize error: {}", e))
        }

        "t3000_trendlog_export" => {
            let serial: i32 = args.get("serial_number")
                .and_then(|v| v.as_i64()).map(|n| n as i32)
                .ok_or_else(|| "serial_number required".to_string())?;
            let trendlog_id = args.get("trendlog_id").and_then(|v| v.as_str())
                .ok_or_else(|| "trendlog_id required".to_string())?;
            let start = args.get("start").and_then(|v| v.as_str()).map(String::from)
                .ok_or_else(|| "start time required".to_string())?;
            let end = args.get("end").and_then(|v| v.as_str()).map(String::from);
            let format = args.get("format").and_then(|v| v.as_str()).unwrap_or("csv");
            let limit: u64 = args.get("limit").and_then(|v| v.as_u64()).unwrap_or(10000);

            // Step 1: Look up trendlog to get panel_id
            let tl_sql = format!(
                "SELECT PanelId FROM TRENDLOGS WHERE SerialNumber = {} AND Trendlog_ID = '{}'",
                serial, trendlog_id
            );
            let tl_rows = db.query_all(sea_orm::Statement::from_string(sea_orm::DatabaseBackend::Sqlite, &tl_sql)).await
                .map_err(|e| format!("Trendlog lookup failed: {}", e))?;
            let panel_id: i32 = tl_rows.first()
                .and_then(|r| r.try_get::<i32>("", "PanelId").ok())
                .ok_or_else(|| format!("Trendlog '{}' not found on device {}", trendlog_id, serial))?;

            // Step 2: Look up all points in this trendlog
            let pts_sql = format!(
                "SELECT Point_Type, Point_Index FROM TRENDLOG_INPUTS
                 WHERE SerialNumber = {} AND Trendlog_ID = '{}'",
                serial, trendlog_id
            );
            let pt_rows = db.query_all(sea_orm::Statement::from_string(sea_orm::DatabaseBackend::Sqlite, &pts_sql)).await
                .map_err(|e| format!("Point lookup failed: {}", e))?;

            let specific_points: Vec<SpecificPoint> = pt_rows.iter()
                .filter_map(|r| {
                    let pt: String = r.try_get("", "Point_Type").unwrap_or_default();
                    let idx: i32 = r.try_get("", "Point_Index").unwrap_or(0);
                    let pt_abbr = match pt.as_str() { "INPUT" => "in", "OUTPUT" => "out", _ => "var" };
                    Some(SpecificPoint {
                        point_id: format!("dev{}.{}{}", serial, pt_abbr, idx),
                        point_type: pt,
                        point_index: idx,
                        panel_id,
                    })
                })
                .collect();

            if specific_points.is_empty() {
                return Ok(json!({"error": "No points found in trendlog", "trendlog_id": trendlog_id}).to_string());
            }

            let point_count = specific_points.len();

            // Step 3: Query history for all points via specific_points
            let request = TrendlogHistoryRequest {
                serial_number: serial,
                panel_id,
                trendlog_id: trendlog_id.to_string(),
                start_time: Some(start),
                end_time: end,
                limit: Some(limit),
                point_types: None,
                specific_points: Some(specific_points),
            };

            let result = T3TrendlogDataService::get_trendlog_history(db, request)
                .await
                .map_err(|e| format!("Trendlog export failed: {:?}", e))?;

            // Step 4: Format output
            match format {
                "csv" => {
                    let data = result.get("data").and_then(|d| d.as_array()).cloned().unwrap_or_default();
                    let mut csv = String::from("timestamp,point_type,point_index,point_id,value,units,range,digital_analog\n");
                    for row in &data {
                        let ts = row.get("logging_time_fmt").or_else(|| row.get("logging_time"))
                            .and_then(|v| v.as_str()).unwrap_or("");
                        let pt = row.get("point_type").and_then(|v| v.as_str()).unwrap_or("");
                        let idx = row.get("point_index").and_then(|v| v.as_i64()).map(|n| n.to_string()).unwrap_or_default();
                        let pid = row.get("point_id").and_then(|v| v.as_str()).unwrap_or("");
                        let val = row.get("value").and_then(|v| v.as_str()).unwrap_or("");
                        let units = row.get("units").and_then(|v| v.as_str()).unwrap_or("");
                        let range = row.get("range_field").and_then(|v| v.as_str()).unwrap_or("");
                        let da = row.get("digital_analog").and_then(|v| v.as_str()).unwrap_or("");
                        csv.push_str(&format!("{},{},{},{},{},{},{},{}\n",
                            ts, pt, idx, pid, val, units, range, da));
                    }
                    Ok(json!({
                        "format": "csv",
                        "content": csv,
                        "total_rows": data.len(),
                        "total_points": point_count,
                    }).to_string())
                }
                _ => {
                    serde_json::to_string_pretty(&json!({
                        "format": "json",
                        "data": result,
                        "total_points": point_count,
                    }))
                    .map_err(|e| format!("Serialize error: {}", e))
                }
            }
        }

        "t3000_device_refresh" => {
            use crate::t3_device::t3_ffi_api_service::T3000FfiApiService;
            use crate::t3_device::action17_refresh_helper::lookup_action17_target;

            let serial: i32 = args.get("serial_number")
                .and_then(|v| v.as_i64()).map(|n| n as i32)
                .ok_or_else(|| "serial_number required".to_string())?;
            let point_type_filter = args.get("point_type").and_then(|v| v.as_str());

            let (panel_id, object_instance) = lookup_action17_target(db, serial).await
                .map_err(|e| format!("Cannot refresh device {}: {}. This may be expected for devices without BACnet/MSTP protocol settings configured.", serial, e.1))?;

            let mut refreshed = 0;
            let point_types = match point_type_filter {
                Some("INPUT") => vec!["INPUT"],
                Some("OUTPUT") => vec!["OUTPUT"],
                Some("VARIABLE") => vec!["VARIABLE"],
                _ => vec!["INPUT", "OUTPUT", "VARIABLE"],
            };

            for pt in &point_types {
                let entry_type: i32 = match *pt {
                    "INPUT" => 1, "OUTPUT" => 0, _ => 2,
                };
                let ffi_json = json!({
                    "action": 17,
                    "panelId": panel_id,
                    "serialNumber": serial,
                    "entryType": entry_type,
                    "objectInstance": object_instance,
                });
                info!("[MCP] device_refresh: Action 17 for {} (entryType={})", pt, entry_type);
                mcp_log(&format!("Action 17 refresh: serial={} type={}", serial, pt));
                let ffi_service = T3000FfiApiService::new();
                match ffi_service.call_ffi(&ffi_json.to_string()).await {
                    Ok(resp) => {
                        // Count points refreshed from response
                        if let Ok(v) = serde_json::from_str::<Value>(&resp) {
                            if let Some(arr) = v.get("data").and_then(|d| d.get("device_data")).and_then(|dd| dd.as_array()) {
                                refreshed += arr.len();
                            }
                        }
                    }
                    Err(e) => {
                        error!("[MCP] device_refresh: {} refresh failed: {}", pt, e);
                    }
                }
            }

            Ok(json!({ "refreshed": true, "points_updated": refreshed, "timestamp": Utc::now().to_rfc3339() }).to_string())
        }

        "t3000_schedule_list" => {
            let serial: i32 = args.get("serial_number")
                .and_then(|v| v.as_i64()).map(|n| n as i32)
                .ok_or_else(|| "serial_number required".to_string())?;

            let sql = format!(
                "SELECT Schedule_ID, Auto_Manual, Output_Field, Variable_Field, Interval_Field, Schedule_Time,
                        Monday_Time, Tuesday_Time, Wednesday_Time, Thursday_Time, Friday_Time,
                        Holiday1, Status1, Holiday2, Status2
                 FROM SCHEDULES WHERE SerialNumber = {} ORDER BY Schedule_ID",
                serial
            );
            let rows = db.query_all(sea_orm::Statement::from_string(sea_orm::DatabaseBackend::Sqlite, &sql)).await
                .map_err(|e| format!("Schedule list failed: {}", e))?;

            let results: Vec<Value> = rows.iter().map(|r| json!({
                "schedule_id": r.try_get::<String>("", "Schedule_ID").unwrap_or_default(),
                "auto_manual": r.try_get::<String>("", "Auto_Manual").ok(),
                "output_field": r.try_get::<String>("", "Output_Field").ok(),
                "variable_field": r.try_get::<String>("", "Variable_Field").ok(),
                "interval": r.try_get::<String>("", "Interval_Field").ok(),
                "schedule_time": r.try_get::<String>("", "Schedule_Time").ok(),
                "monday": r.try_get::<String>("", "Monday_Time").ok(),
                "tuesday": r.try_get::<String>("", "Tuesday_Time").ok(),
                "wednesday": r.try_get::<String>("", "Wednesday_Time").ok(),
                "thursday": r.try_get::<String>("", "Thursday_Time").ok(),
                "friday": r.try_get::<String>("", "Friday_Time").ok(),
                "holiday1": r.try_get::<String>("", "Holiday1").ok(),
                "status1": r.try_get::<String>("", "Status1").ok(),
                "holiday2": r.try_get::<String>("", "Holiday2").ok(),
                "status2": r.try_get::<String>("", "Status2").ok(),
            })).collect();

            serde_json::to_string_pretty(&json!({ "schedules": results, "total": results.len() }))
                .map_err(|e| format!("Serialize error: {}", e))
        }

        // ═══ v4: Settings ═══

        "t3000_settings_read" => {
            let serial: i32 = args.get("serial_number")
                .and_then(|v| v.as_i64()).map(|n| n as i32)
                .ok_or_else(|| "serial_number required".to_string())?;
            let category = args.get("category").and_then(|v| v.as_str());

            let mut result = json!({ "serial_number": serial });

            // Query a single table, return first row as JSON or null
            async fn read_table(db: &sea_orm::DatabaseConnection, serial: i32, table: &str, columns: &[&str]) -> Result<Value, String> {
                let cols = columns.join(", ");
                let sql = format!("SELECT {} FROM {} WHERE SerialNumber = {}", cols, table, serial);
                let rows = db.query_all(sea_orm::Statement::from_string(sea_orm::DatabaseBackend::Sqlite, &sql)).await
                    .map_err(|e| format!("Query {} failed: {}", table, e))?;
                if rows.is_empty() {
                    return Ok(json!(null));
                }
                let row = &rows[0];
                let mut obj = serde_json::Map::new();
                for col in columns {
                    if let Ok(v) = row.try_get::<String>("", col) {
                        obj.insert(col.to_string(), json!(v));
                    }
                }
                Ok(json!(obj))
            }

            let cats: Vec<(&str, &str, &[&str])> = vec![
                ("network", "NETWORK_SETTINGS", &["IP_Address", "Subnet", "Gateway", "MAC_Address", "TCP_Type"][..]),
                ("communication", "COMMUNICATION_SETTINGS", &["COM0_Config", "COM1_Config", "COM2_Config", "COM_Baudrate0", "COM_Baudrate1", "COM_Baudrate2", "UART_Parity0", "UART_Parity1", "UART_Parity2", "UART_Stopbit0", "UART_Stopbit1", "UART_Stopbit2", "Fix_COM_Config"]),
                ("time", "TIME_SETTINGS", &["Time_Zone", "Time_Zone_Summer_Daytime", "Enable_SNTP", "SNTP_Server", "Flag_Time_Sync_PC", "Time_Sync_Auto_Manual", "Sync_Time_Results", "Start_Month", "Start_Day", "End_Month", "End_Day"]),
                ("protocol", "PROTOCOL_SETTINGS", &["Modbus_ID", "Modbus_Port", "MSTP_ID", "MSTP_Network_Number", "Max_Master", "Object_Instance", "BBMD_Enable", "Network_Number", "Network_Number_Hi"]),
                ("dyndns", "DYNDNS_SETTINGS", &["Enable_DynDNS", "DynDNS_Provider", "DynDNS_User", "DynDNS_Pass", "DynDNS_Domain", "DynDNS_Update_Time", "Update_DynDNS_Time"]),
                ("hardware", "HARDWARE_INFO", &["Hardware_Rev", "Firmware0_Rev_Main", "Firmware0_Rev_Sub", "Firmware1_Rev", "Firmware2_Rev", "Firmware3_Rev", "Bootloader_Rev", "Mini_Type", "Panel_Type", "USB_Mode", "SD_Exist", "Zigbee_Exist", "Max_Var", "Max_In", "Max_Out"]),
                ("features", "FEATURE_FLAGS", &["User_Name_Enable", "Customer_Unite_Enable", "Enable_Panel_Name", "LCD_Display", "LCD_Display_Type", "LCD_Point_Type", "LCD_Point_Number", "LCD_BACnet_Instance", "Enable_Plug_N_Play", "Refresh_Flash_Timer", "Reset_Default", "Debug", "Webview_JSON_Flash", "Write_Flash", "LCD_Mode", "LCD_Delay_Seconds"]),
                ("email", "EMAIL_ALARMS", &["SMTP_Type", "SMTP_IP", "SMTP_Domain", "SMTP_Port", "Email_Address", "User_Name", "Password", "Secure_Connection_Type", "To1_Addr", "To2_Addr", "Error_Code", "Status"]),
            ];

            if let Some(cat) = category {
                if let Some((key, table, cols)) = cats.iter().find(|(k, _, _)| *k == cat) {
                    let data = read_table(db, serial, table, cols).await.unwrap_or(json!(null));
                    result.as_object_mut().unwrap().insert(key.to_string(), data);
                } else {
                    return Err(format!("Unknown category: {}. Valid: network, communication, time, protocol, dyndns, hardware, features, email", cat));
                }
            } else {
                for (key, table, cols) in &cats {
                    let data = read_table(db, serial, table, cols).await.unwrap_or(json!(null));
                    result.as_object_mut().unwrap().insert(key.to_string(), data);
                }
            }

            serde_json::to_string_pretty(&result)
                .map_err(|e| format!("Serialize error: {}", e))
        }

        "t3000_settings_write" => {
            let serial: i32 = args.get("serial_number")
                .and_then(|v| v.as_i64()).map(|n| n as i32)
                .ok_or_else(|| "serial_number required".to_string())?;
            let category = args.get("category").and_then(|v| v.as_str())
                .ok_or_else(|| "category required".to_string())?;
            let fields = args.get("fields").and_then(|v| v.as_object())
                .ok_or_else(|| "fields object required".to_string())?;
            let confirm = args.get("confirm").and_then(|v| v.as_bool()).unwrap_or(false);

            if !confirm {
                return Err("settings_write requires confirm: true for safety".to_string());
            }

            let (table, allowed_fields): (&str, &[&str]) = match category {
                "network" => ("NETWORK_SETTINGS", &["IP_Address", "Subnet", "Gateway", "MAC_Address", "TCP_Type"]),
                "communication" => ("COMMUNICATION_SETTINGS", &["COM0_Config", "COM1_Config", "COM2_Config", "COM_Baudrate0", "COM_Baudrate1", "COM_Baudrate2", "UART_Parity0", "UART_Parity1", "UART_Parity2", "UART_Stopbit0", "UART_Stopbit1", "UART_Stopbit2", "Fix_COM_Config"]),
                "time" => ("TIME_SETTINGS", &["Time_Zone", "Time_Zone_Summer_Daytime", "Enable_SNTP", "SNTP_Server", "Flag_Time_Sync_PC", "Time_Sync_Auto_Manual", "Start_Month", "Start_Day", "End_Month", "End_Day"]),
                "email" => ("EMAIL_ALARMS", &["SMTP_Type", "SMTP_IP", "SMTP_Domain", "SMTP_Port", "Email_Address", "User_Name", "Password", "Secure_Connection_Type", "To1_Addr", "To2_Addr"]),
                _ => return Err(format!("Unknown category: {}. Valid: network, communication, time, email", category)),
            };

            // Check record exists
            let check_sql = format!("SELECT SerialNumber FROM {} WHERE SerialNumber = {}", table, serial);
            let check = db.query_all(sea_orm::Statement::from_string(sea_orm::DatabaseBackend::Sqlite, &check_sql)).await
                .map_err(|e| format!("Check failed: {}", e))?;

            let now = chrono::Utc::now().to_rfc3339();
            let mut set_clauses: Vec<String> = Vec::new();
            for (key, val) in fields {
                let db_col = key.as_str();
                if !allowed_fields.contains(&db_col) {
                    return Err(format!("Field '{}' not allowed for category '{}'. Allowed: {}", db_col, category, allowed_fields.join(", ")));
                }
                let val_str = match val {
                    Value::String(s) => format!("'{}'", s.replace('\'', "''")),
                    Value::Number(n) => n.to_string(),
                    Value::Bool(b) => (if *b { "1" } else { "0" }).to_string(),
                    Value::Null => "NULL".to_string(),
                    _ => return Err(format!("Invalid value type for field '{}'", db_col)),
                };
                set_clauses.push(format!("{} = {}", db_col, val_str));
            }
            set_clauses.push(format!("updated_at = '{}'", now));

            if check.is_empty() {
                // Insert
                let cols = set_clauses.iter().map(|c| c.split(" = ").next().unwrap()).collect::<Vec<_>>().join(", ");
                let vals = set_clauses.iter().map(|c| c.split(" = ").nth(1).unwrap()).collect::<Vec<_>>().join(", ");
                let insert_sql = format!("INSERT INTO {} (SerialNumber, {}, created_at) VALUES ({}, {}, '{}')",
                    table, cols, serial, vals, now);
                db.execute(sea_orm::Statement::from_string(sea_orm::DatabaseBackend::Sqlite, &insert_sql)).await
                    .map_err(|e| format!("Insert failed: {}", e))?;
            } else {
                // Update
                let update_sql = format!("UPDATE {} SET {} WHERE SerialNumber = {}",
                    table, set_clauses.join(", "), serial);
                db.execute(sea_orm::Statement::from_string(sea_orm::DatabaseBackend::Sqlite, &update_sql)).await
                    .map_err(|e| format!("Update failed: {}", e))?;
            }

            info!("[MCP] settings_write: dev={} category={} fields={:?}", serial, category, fields);
            mcp_log(&format!("settings_write OK: dev={} category={}", serial, category));
            Ok(json!({"success": true, "category": category, "updated_fields": fields.len(), "timestamp": now}).to_string())
        }

        "t3000_device_control" => {
            use crate::t3_device::t3_ffi_api_service::T3000FfiApiService;

            let serial: i32 = args.get("serial_number")
                .and_then(|v| v.as_i64()).map(|n| n as i32)
                .ok_or_else(|| "serial_number required".to_string())?;
            let command = args.get("command").and_then(|v| v.as_str())
                .ok_or_else(|| "command required (reboot or reset_defaults)".to_string())?;
            let confirm = args.get("confirm").and_then(|v| v.as_bool()).unwrap_or(false);

            if !confirm {
                return Err("device_control requires confirm: true for safety".to_string());
            }

            match command {
                "reboot" => {
                    // Reboot: write 99 to reset_default field via Action 16 entryType 198
                    let ffi_json = json!({
                        "action": 16,
                        "panelId": 1,
                        "serialNumber": serial,
                        "entryType": 198,
                        "entryIndex": 43, // reset_default offset
                        "value": 99.0,
                        "label": "", "description": "", "range": 0,
                        "auto_manual": 0, "filter": 0, "digital_analog": 0,
                        "calibration_sign": 0, "calibration_h": 0, "calibration_l": 0,
                        "control": 0, "decom": 0,
                    });
                    info!("[MCP] device_control: reboot serial={}", serial);
                    mcp_log(&format!("device_control: reboot serial={}", serial));
                    let ffi_service = T3000FfiApiService::new();
                    ffi_service.call_ffi(&ffi_json.to_string()).await
                        .map_err(|e| format!("Reboot failed: {}", e))?;
                    Ok(json!({"success": true, "command": "reboot", "timestamp": Utc::now().to_rfc3339()}).to_string())
                }
                "reset_defaults" => {
                    let ffi_json = json!({
                        "action": 16,
                        "panelId": 1,
                        "serialNumber": serial,
                        "entryType": 198,
                        "entryIndex": 43,
                        "value": 88.0,
                        "label": "", "description": "", "range": 0,
                        "auto_manual": 0, "filter": 0, "digital_analog": 0,
                        "calibration_sign": 0, "calibration_h": 0, "calibration_l": 0,
                        "control": 0, "decom": 0,
                    });
                    info!("[MCP] device_control: reset_defaults serial={}", serial);
                    mcp_log(&format!("device_control: reset_defaults serial={}", serial));
                    let ffi_service = T3000FfiApiService::new();
                    ffi_service.call_ffi(&ffi_json.to_string()).await
                        .map_err(|e| format!("Reset failed: {}", e))?;
                    Ok(json!({"success": true, "command": "reset_defaults", "timestamp": Utc::now().to_rfc3339()}).to_string())
                }
                _ => Err(format!("Unknown command: {}. Valid: reboot, reset_defaults", command)),
            }
        }

        // ═══ v4: Control Logic ═══

        "t3000_program_list" => {
            let serial: i32 = args.get("serial_number")
                .and_then(|v| v.as_i64()).map(|n| n as i32)
                .ok_or_else(|| "serial_number required".to_string())?;

            let sql = format!(
                "SELECT Program_ID, Program_Label, Program_Status, Auto_Manual, Program_Size, Switch_Node, Program_Pointer
                 FROM PROGRAMS WHERE SerialNumber = {} ORDER BY Program_ID",
                serial
            );
            let rows = db.query_all(sea_orm::Statement::from_string(sea_orm::DatabaseBackend::Sqlite, &sql)).await
                .map_err(|e| format!("Program list failed: {}", e))?;

            let results: Vec<Value> = rows.iter().map(|r| json!({
                "program_id": r.try_get::<String>("", "Program_ID").unwrap_or_default(),
                "label": r.try_get::<String>("", "Program_Label").ok(),
                "status": r.try_get::<String>("", "Program_Status").ok(),
                "auto_manual": r.try_get::<String>("", "Auto_Manual").ok(),
                "size": r.try_get::<String>("", "Program_Size").ok(),
                "switch_node": r.try_get::<String>("", "Switch_Node").ok(),
                "pointer": r.try_get::<String>("", "Program_Pointer").ok(),
            })).collect();

            serde_json::to_string_pretty(&json!({ "programs": results, "total": results.len() }))
                .map_err(|e| format!("Serialize error: {}", e))
        }

        "t3000_program_read" => {
            let serial: i32 = args.get("serial_number")
                .and_then(|v| v.as_i64()).map(|n| n as i32)
                .ok_or_else(|| "serial_number required".to_string())?;
            let prog_id = args.get("program_id").and_then(|v| v.as_str())
                .ok_or_else(|| "program_id required".to_string())?;

            let sql = format!(
                "SELECT Program_ID, Program_Label, Program_List, Program_Status, Auto_Manual,
                        Program_Size, Switch_Node, Program_Pointer
                 FROM PROGRAMS WHERE SerialNumber = {} AND Program_ID = '{}'",
                serial, prog_id.replace('\'', "''")
            );
            let rows = db.query_all(sea_orm::Statement::from_string(sea_orm::DatabaseBackend::Sqlite, &sql)).await
                .map_err(|e| format!("Program read failed: {}", e))?;

            let row = rows.first()
                .ok_or_else(|| format!("Program '{}' not found on device {}", prog_id, serial))?;

            let source: String = row.try_get("", "Program_List").unwrap_or_default();
            let truncated = if source.len() > 2000 {
                format!("{}... (truncated, {} chars total)", &source[..2000], source.len())
            } else { source.clone() };

            serde_json::to_string_pretty(&json!({
                "program_id": row.try_get::<String>("", "Program_ID").unwrap_or_default(),
                "label": row.try_get::<String>("", "Program_Label").ok(),
                "source": truncated,
                "source_length": source.len(),
                "status": row.try_get::<String>("", "Program_Status").ok(),
                "auto_manual": row.try_get::<String>("", "Auto_Manual").ok(),
                "size": row.try_get::<String>("", "Program_Size").ok(),
                "switch_node": row.try_get::<String>("", "Switch_Node").ok(),
            }))
            .map_err(|e| format!("Serialize error: {}", e))
        }

        // ═══ v4: Diagnostics ═══

        "t3000_alarm_settings_read" => {
            let serial: i32 = args.get("serial_number")
                .and_then(|v| v.as_i64()).map(|n| n as i32)
                .ok_or_else(|| "serial_number required".to_string())?;

            let sql = format!(
                "SELECT Alarm_Setting_ID, Point_Number, Point_Type, Point_Panel, Point1_Number, Point1_Type, Point1_Panel,
                        Condition, Way_Low, Low, Normal, High, Way_High, Time_Field, Count_Field, Message_Count
                 FROM ALARM_SETTINGS WHERE SerialNumber = {} ORDER BY Alarm_Setting_ID",
                serial
            );
            let rows = db.query_all(sea_orm::Statement::from_string(sea_orm::DatabaseBackend::Sqlite, &sql)).await
                .map_err(|e| format!("Alarm settings read failed: {}", e))?;

            let results: Vec<Value> = rows.iter().map(|r| json!({
                "alarm_setting_id": r.try_get::<String>("", "Alarm_Setting_ID").ok(),
                "point_number": r.try_get::<i32>("", "Point_Number").ok(),
                "point_type": r.try_get::<i32>("", "Point_Type").ok(),
                "point_panel": r.try_get::<i32>("", "Point_Panel").ok(),
                "point1_number": r.try_get::<i32>("", "Point1_Number").ok(),
                "point1_type": r.try_get::<i32>("", "Point1_Type").ok(),
                "point1_panel": r.try_get::<i32>("", "Point1_Panel").ok(),
                "condition": r.try_get::<i32>("", "Condition").ok(),
                "way_low": r.try_get::<i32>("", "Way_Low").ok(),
                "low": r.try_get::<i32>("", "Low").ok(),
                "normal": r.try_get::<i32>("", "Normal").ok(),
                "high": r.try_get::<i32>("", "High").ok(),
                "way_high": r.try_get::<i32>("", "Way_High").ok(),
                "time_field": r.try_get::<i32>("", "Time_Field").ok(),
                "count_field": r.try_get::<i32>("", "Count_Field").ok(),
                "message_count": r.try_get::<i32>("", "Message_Count").ok(),
            })).collect();

            serde_json::to_string_pretty(&json!({ "alarm_settings": results, "total": results.len() }))
                .map_err(|e| format!("Serialize error: {}", e))
        }

        "t3000_users_list" => {
            let serial: i32 = args.get("serial_number")
                .and_then(|v| v.as_i64()).map(|n| n as i32)
                .ok_or_else(|| "serial_number required".to_string())?;

            let sql = format!(
                "SELECT User_ID, User_Index, Name, Access_Level, Rights_Access, Default_Panel, Default_Group, Status
                 FROM USERS WHERE SerialNumber = {} ORDER BY User_ID",
                serial
            );
            let rows = db.query_all(sea_orm::Statement::from_string(sea_orm::DatabaseBackend::Sqlite, &sql)).await
                .map_err(|e| format!("Users list failed: {}", e))?;

            let results: Vec<Value> = rows.iter().map(|r| json!({
                "user_id": r.try_get::<String>("", "User_ID").unwrap_or_default(),
                "user_index": r.try_get::<String>("", "User_Index").ok(),
                "name": r.try_get::<String>("", "Name").ok(),
                "access_level": r.try_get::<i32>("", "Access_Level").ok(),
                "rights_access": r.try_get::<i32>("", "Rights_Access").ok(),
                "default_panel": r.try_get::<i32>("", "Default_Panel").ok(),
                "default_group": r.try_get::<i32>("", "Default_Group").ok(),
                "status": r.try_get::<String>("", "Status").ok(),
            })).collect();

            serde_json::to_string_pretty(&json!({ "users": results, "total": results.len() }))
                .map_err(|e| format!("Serialize error: {}", e))
        }

        "t3000_graphics_list" => {
            let serial: i32 = args.get("serial_number")
                .and_then(|v| v.as_i64()).map(|n| n as i32)
                .ok_or_else(|| "serial_number required".to_string())?;

            let sql = format!(
                "SELECT Graphic_ID, Graphic_Label, Graphic_Full_Label, Graphic_Picture_File, Graphic_Total_Point, Switch_Node
                 FROM GRAPHICS WHERE SerialNumber = {} ORDER BY Graphic_ID",
                serial
            );
            let rows = db.query_all(sea_orm::Statement::from_string(sea_orm::DatabaseBackend::Sqlite, &sql)).await
                .map_err(|e| format!("Graphics list failed: {}", e))?;

            let results: Vec<Value> = rows.iter().map(|r| json!({
                "graphic_id": r.try_get::<String>("", "Graphic_ID").unwrap_or_default(),
                "label": r.try_get::<String>("", "Graphic_Label").ok(),
                "full_label": r.try_get::<String>("", "Graphic_Full_Label").ok(),
                "picture_file": r.try_get::<String>("", "Graphic_Picture_File").ok(),
                "total_point": r.try_get::<String>("", "Graphic_Total_Point").ok(),
                "switch_node": r.try_get::<String>("", "Switch_Node").ok(),
            })).collect();

            serde_json::to_string_pretty(&json!({ "graphics": results, "total": results.len() }))
                .map_err(|e| format!("Serialize error: {}", e))
        }

        // ═══ v4: Documentation ═══

        "t3000_doc_list" => {
            let sections: Vec<Value> = vec![
                ("Quick Start", &[("Overview", "quick-start/overview"), ("Installation", "quick-start/installation"), ("Configuration", "quick-start/configuration")][..]),
                ("Shared DB", &[("Shared Center DB Summary", "shared-db/shared-center-db-summary"), ("SQL Server Express Setup", "shared-db/sql-server-express-setup"), ("T3000 Center DB Config", "shared-db/t3000-center-db-config")]),
                ("Architecture", &[("System Overview", "architecture/system-overview"), ("Device Loading", "architecture/device-loading")]),
                ("Device Management", &[("Connecting Devices", "device-management/connecting-devices"), ("Device Configuration", "device-management/device-configuration"), ("Device Monitoring", "device-management/device-monitoring"), ("Troubleshooting", "device-management/device-troubleshooting")]),
                ("Data Points", &[("Inputs", "data-points/inputs"), ("Outputs", "data-points/outputs"), ("Variables", "data-points/variables"), ("Programs", "data-points/programs"), ("PID Loops", "data-points/pid-loops")]),
                ("Features", &[("Schedules", "features/schedules"), ("Holidays", "features/holidays"), ("Graphics", "features/graphics"), ("Trend Logs", "features/trendlogs"), ("Alarms", "features/alarms")]),
                ("API Reference", &[("Overview", "api-reference/overview"), ("Device Management", "api-reference/device-management"), ("Data Points", "api-reference/data-points"), ("Control & Automation", "api-reference/control-automation"), ("Trend Logging", "api-reference/trendlogs"), ("Generic Tables", "api-reference/generic-tables"), ("Database Management", "api-reference/database-management"), ("Developer Tools", "api-reference/developer-tools"), ("System & Utilities", "api-reference/system-utilities")]),
                ("Guides", &[("Best Practices", "guides/best-practices"), ("Troubleshooting", "guides/troubleshooting"), ("Performance Tuning", "guides/performance-tuning"), ("FAQ", "guides/faq")]),
                ("Building Platform", &[("Overview", "building-platform/overview"), ("Control Messages", "building-platform/control-messages/message-index"), ("BACnet Commands", "building-platform/bacnet-commands"), ("Data Structures", "building-platform/data-structures"), ("Device Settings Structure", "building-platform/device-settings-structure")]),
                ("Haystack & MCP", &[("Claude Desktop Setup", "haystack/mcp-claude-desktop"), ("VS Code Copilot Setup", "haystack/mcp-vscode-copilot"), ("MCP API Examples", "haystack/mcp-api-examples")]),
            ].into_iter().map(|(title, items)| {
                let items: Vec<Value> = items.iter().map(|(t, p)| json!({"title": t, "path": p})).collect();
                json!({"section": title, "items": items, "count": items.len()})
            }).collect();

            serde_json::to_string_pretty(&json!({"sections": sections, "total_sections": sections.len()}))
                .map_err(|e| format!("Serialize error: {}", e))
        }

        "t3000_doc_read" => {
            let doc_path = args.get("path").and_then(|v| v.as_str())
                .ok_or_else(|| "path required".to_string())?;
            // Sanitize: prevent directory traversal
            let safe_path = doc_path.replace("..", "").replace("\\", "/").trim_matches('/').to_string();
            let md_filename = format!("{}.md", safe_path);

            // Try local filesystem first (dev mode)
            let docs_dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).parent().unwrap().join("docs").join("t3000");
            let local_path = docs_dir.join(&md_filename);
            let content = if local_path.exists() {
                std::fs::read_to_string(&local_path)
                    .map_err(|e| format!("Failed to read {}: {}", local_path.display(), e))?
            } else {
                // Fallback: GitHub raw
                let github_url = format!(
                    "https://raw.githubusercontent.com/temcocontrols/T3000Webview/main/docs/t3000/{}",
                    md_filename
                );
                let client = reqwest::Client::new();
                let resp = client.get(&github_url)
                    .header("User-Agent", "T3000-MCP/1.0")
                    .send().await
                    .map_err(|e| format!("Failed to fetch doc: {}", e))?;
                if !resp.status().is_success() {
                    return Err(format!("Doc not found: {} (HTTP {})", doc_path, resp.status().as_u16()));
                }
                resp.text().await
                    .map_err(|e| format!("Failed to read response: {}", e))?
            };

            // Extract title from first # heading
            let title = content.lines()
                .find(|l| l.starts_with("# "))
                .map(|l| l.trim_start_matches("# ").to_string())
                .unwrap_or_else(|| doc_path.to_string());

            serde_json::to_string_pretty(&json!({
                "path": doc_path,
                "title": title,
                "content": content,
            }))
            .map_err(|e| format!("Serialize error: {}", e))
        }

        "t3000_pid_list" => {
            let serial: i32 = args.get("serial_number")
                .and_then(|v| v.as_i64()).map(|n| n as i32)
                .ok_or_else(|| "serial_number required".to_string())?;

            let sql = format!(
                "SELECT Loop_Field, Input_Field, Input_Value, Output_Field, Output_Value, Set_Value,
                        Proportional, Reset_Field, Rate, Bias, Auto_Manual, Status, Units,
                        Action_Field, Type_Field, Setpoint_High, Setpoint_Low, Switch_Node
                 FROM PID_TABLE WHERE SerialNumber = {} ORDER BY Loop_Field",
                serial
            );
            let rows = db.query_all(sea_orm::Statement::from_string(sea_orm::DatabaseBackend::Sqlite, &sql)).await
                .map_err(|e| format!("PID list failed: {}", e))?;

            let results: Vec<Value> = rows.iter().map(|r| json!({
                "loop_field": r.try_get::<String>("", "Loop_Field").ok(),
                "input_field": r.try_get::<String>("", "Input_Field").ok(),
                "input_value": r.try_get::<String>("", "Input_Value").ok(),
                "output_field": r.try_get::<String>("", "Output_Field").ok(),
                "output_value": r.try_get::<String>("", "Output_Value").ok(),
                "set_value": r.try_get::<String>("", "Set_Value").ok(),
                "proportional": r.try_get::<String>("", "Proportional").ok(),
                "reset_field": r.try_get::<String>("", "Reset_Field").ok(),
                "rate": r.try_get::<String>("", "Rate").ok(),
                "bias": r.try_get::<String>("", "Bias").ok(),
                "auto_manual": r.try_get::<String>("", "Auto_Manual").ok(),
                "status": r.try_get::<String>("", "Status").ok(),
                "units": r.try_get::<String>("", "Units").ok(),
                "action": r.try_get::<String>("", "Action_Field").ok(),
                "type_field": r.try_get::<String>("", "Type_Field").ok(),
                "setpoint_high": r.try_get::<String>("", "Setpoint_High").ok(),
                "setpoint_low": r.try_get::<String>("", "Setpoint_Low").ok(),
                "switch_node": r.try_get::<String>("", "Switch_Node").ok(),
            })).collect();

            serde_json::to_string_pretty(&json!({ "pid_loops": results, "total": results.len() }))
                .map_err(|e| format!("Serialize error: {}", e))
        }

        "t3000_holiday_list" => {
            let serial: i32 = args.get("serial_number")
                .and_then(|v| v.as_i64()).map(|n| n as i32)
                .ok_or_else(|| "serial_number required".to_string())?;

            let sql = format!(
                "SELECT Holiday_ID, Month_Field, Day_Field, Year_Field, Holiday_Value, Auto_Manual, Status
                 FROM HOLIDAYS WHERE SerialNumber = {} ORDER BY Holiday_ID",
                serial
            );
            let rows = db.query_all(sea_orm::Statement::from_string(sea_orm::DatabaseBackend::Sqlite, &sql)).await
                .map_err(|e| format!("Holiday list failed: {}", e))?;

            let results: Vec<Value> = rows.iter().map(|r| json!({
                "holiday_id": r.try_get::<String>("", "Holiday_ID").unwrap_or_default(),
                "month": r.try_get::<String>("", "Month_Field").ok(),
                "day": r.try_get::<String>("", "Day_Field").ok(),
                "year": r.try_get::<String>("", "Year_Field").ok(),
                "value": r.try_get::<String>("", "Holiday_Value").ok(),
                "auto_manual": r.try_get::<String>("", "Auto_Manual").ok(),
                "status": r.try_get::<String>("", "Status").ok(),
            })).collect();

            serde_json::to_string_pretty(&json!({ "holidays": results, "total": results.len() }))
                .map_err(|e| format!("Serialize error: {}", e))
        }

        "t3000_building_summary" => {
            // Total devices
            let dev_sql = "SELECT COUNT(*) as cnt FROM DEVICES";
            let dev_rows = db.query_all(sea_orm::Statement::from_string(sea_orm::DatabaseBackend::Sqlite, dev_sql)).await
                .map_err(|e| format!("Device count failed: {}", e))?;
            let device_count: i64 = dev_rows.first().and_then(|r| r.try_get::<i64>("", "cnt").ok()).unwrap_or(0);

            // Active alarms
            let alarm_sql = "SELECT COUNT(*) as cnt FROM ALARMS WHERE (Acknowledged IS NULL OR Acknowledged = '' OR Acknowledged = '0')";
            let alarm_rows = db.query_all(sea_orm::Statement::from_string(sea_orm::DatabaseBackend::Sqlite, alarm_sql)).await.unwrap_or_default();
            let active_alarms: i64 = alarm_rows.first().and_then(|r| r.try_get::<i64>("", "cnt").ok()).unwrap_or(0);

            // Trendlogs
            let tl_sql = "SELECT COUNT(*) as cnt FROM TRENDLOGS";
            let tl_rows = db.query_all(sea_orm::Statement::from_string(sea_orm::DatabaseBackend::Sqlite, tl_sql)).await.unwrap_or_default();
            let total_trendlogs: i64 = tl_rows.first().and_then(|r| r.try_get::<i64>("", "cnt").ok()).unwrap_or(0);

            // Schedules
            let sch_sql = "SELECT COUNT(*) as cnt FROM SCHEDULES";
            let sch_rows = db.query_all(sea_orm::Statement::from_string(sea_orm::DatabaseBackend::Sqlite, sch_sql)).await.unwrap_or_default();
            let total_schedules: i64 = sch_rows.first().and_then(|r| r.try_get::<i64>("", "cnt").ok()).unwrap_or(0);

            // Programs
            let prog_sql = "SELECT COUNT(*) as cnt FROM PROGRAMS";
            let prog_rows = db.query_all(sea_orm::Statement::from_string(sea_orm::DatabaseBackend::Sqlite, prog_sql)).await.unwrap_or_default();
            let total_programs: i64 = prog_rows.first().and_then(|r| r.try_get::<i64>("", "cnt").ok()).unwrap_or(0);

            // PID loops
            let pid_sql = "SELECT COUNT(*) as cnt FROM PID_TABLE";
            let pid_rows = db.query_all(sea_orm::Statement::from_string(sea_orm::DatabaseBackend::Sqlite, pid_sql)).await.unwrap_or_default();
            let total_pid_loops: i64 = pid_rows.first().and_then(|r| r.try_get::<i64>("", "cnt").ok()).unwrap_or(0);

            // Device list with names
            let dev_list_sql = "SELECT SerialNumber, Product_Name FROM DEVICES ORDER BY SerialNumber";
            let dev_list_rows = db.query_all(sea_orm::Statement::from_string(sea_orm::DatabaseBackend::Sqlite, dev_list_sql)).await.unwrap_or_default();
            let devices: Vec<Value> = dev_list_rows.iter().map(|r| json!({
                "serial": r.try_get::<i32>("", "SerialNumber").unwrap_or(0),
                "name": r.try_get::<String>("", "Product_Name").ok(),
            })).collect();

            serde_json::to_string_pretty(&json!({
                "device_count": device_count,
                "devices": devices,
                "active_alarms": active_alarms,
                "total_trendlogs": total_trendlogs,
                "total_schedules": total_schedules,
                "total_programs": total_programs,
                "total_pid_loops": total_pid_loops,
                "health": if active_alarms == 0 { "good" } else if active_alarms < 5 { "warning" } else { "critical" },
                "timestamp": Utc::now().to_rfc3339(),
            }))
            .map_err(|e| format!("Serialize error: {}", e))
        }

        // ═══ v5: Task Management ═══

        "t3000_task_create" => {
            let title = args.get("title").and_then(|v| v.as_str())
                .ok_or_else(|| "title required".to_string())?;
            let description = args.get("description").and_then(|v| v.as_str()).unwrap_or("");
            let sn = args.get("serial_number").and_then(|v| v.as_i64()).map(|n| n as i32);
            let priority = args.get("priority").and_then(|v| v.as_str()).unwrap_or("normal");

            let task_id = Uuid::new_v4().to_string();
            let now = Utc::now().to_rfc3339();

            let mut tasks = load_tasks().await?;
            tasks.push(json!({
                "id": task_id,
                "title": title,
                "description": description,
                "status": "pending",
                "priority": priority,
                "serial_number": sn,
                "created_at": now,
                "updated_at": now,
            }));
            save_tasks(&tasks).await?;

            serde_json::to_string_pretty(&json!({
                "task_id": task_id,
                "title": title,
                "status": "pending",
                "created_at": now,
            }))
            .map_err(|e| format!("Serialize error: {}", e))
        }

        "t3000_task_list" => {
            let status_filter = args.get("status").and_then(|v| v.as_str());
            let sn_filter = args.get("serial_number").and_then(|v| v.as_i64()).map(|n| n as i32);

            let tasks = load_tasks().await?;
            let filtered: Vec<&Value> = tasks.iter()
                .filter(|t| {
                    if let Some(s) = status_filter {
                        if t.get("status").and_then(|v| v.as_str()) != Some(s) { return false; }
                    }
                    if let Some(sn) = sn_filter {
                        if t.get("serial_number").and_then(|v| v.as_i64()).map(|n| n as i32) != Some(sn) { return false; }
                    }
                    true
                })
                .collect();

            let results: Vec<Value> = filtered.iter().map(|t| (*t).clone()).collect();
            serde_json::to_string_pretty(&json!({
                "tasks": results,
                "total": results.len(),
            }))
            .map_err(|e| format!("Serialize error: {}", e))
        }

        "t3000_task_update" => {
            let task_id = args.get("task_id").and_then(|v| v.as_str())
                .ok_or_else(|| "task_id required".to_string())?;
            let new_status = args.get("status").and_then(|v| v.as_str());
            let new_title = args.get("title").and_then(|v| v.as_str());
            let new_desc = args.get("description").and_then(|v| v.as_str());
            let new_priority = args.get("priority").and_then(|v| v.as_str());

            let mut tasks = load_tasks().await?;
            let mut found = false;
            let mut updated = json!({});
            let now = Utc::now().to_rfc3339();

            for task in tasks.iter_mut() {
                if task.get("id").and_then(|v| v.as_str()) == Some(task_id) {
                    if let Some(s) = new_status {
                        let valid = ["pending", "in_progress", "completed"];
                        if !valid.contains(&s) {
                            return Err(format!("Invalid status: {}. Must be: {}", s, valid.join(", ")));
                        }
                        task["status"] = json!(s);
                    }
                    if let Some(t) = new_title { task["title"] = json!(t); }
                    if let Some(d) = new_desc { task["description"] = json!(d); }
                    if let Some(p) = new_priority { task["priority"] = json!(p); }
                    task["updated_at"] = json!(now);
                    updated = task.clone();
                    found = true;
                    break;
                }
            }
            if !found {
                return Err(format!("Task not found: {}", task_id));
            }
            save_tasks(&tasks).await?;

            serde_json::to_string_pretty(&json!({
                "task": updated,
                "updated_at": now,
            }))
            .map_err(|e| format!("Serialize error: {}", e))
        }

        "t3000_task_delete" => {
            let task_id = args.get("task_id").and_then(|v| v.as_str())
                .ok_or_else(|| "task_id required".to_string())?;

            let mut tasks = load_tasks().await?;
            let len_before = tasks.len();
            tasks.retain(|t| t.get("id").and_then(|v| v.as_str()) != Some(task_id));
            if tasks.len() == len_before {
                return Err(format!("Task not found: {}", task_id));
            }
            save_tasks(&tasks).await?;

            Ok(json!({
                "deleted": true,
                "task_id": task_id,
                "timestamp": Utc::now().to_rfc3339(),
            }).to_string())
        }

        // ═══ v5: Site Memory ═══

        "t3000_memory_save" => {
            let key = args.get("key").and_then(|v| v.as_str())
                .ok_or_else(|| "key required".to_string())?;
            let content = args.get("content").and_then(|v| v.as_str())
                .ok_or_else(|| "content required".to_string())?;
            let category = args.get("category").and_then(|v| v.as_str()).unwrap_or("general");

            let now = Utc::now().to_rfc3339();
            let mut memories = load_memories().await?;

            // Upsert: replace existing entry with same key, or append
            memories.retain(|m| m.get("key").and_then(|v| v.as_str()) != Some(key));
            memories.push(json!({
                "key": key,
                "content": content,
                "category": category,
                "created_at": now,
                "updated_at": now,
            }));
            save_memories(&memories).await?;

            serde_json::to_string_pretty(&json!({
                "saved": true,
                "key": key,
                "category": category,
                "timestamp": now,
                "total_memories": memories.len(),
            }))
            .map_err(|e| format!("Serialize error: {}", e))
        }

        "t3000_memory_list" => {
            let category_filter = args.get("category").and_then(|v| v.as_str());
            let search = args.get("search").and_then(|v| v.as_str()).map(|s| s.to_lowercase());

            let memories = load_memories().await?;
            let filtered: Vec<&Value> = memories.iter()
                .filter(|m| {
                    if let Some(cat) = category_filter {
                        if m.get("category").and_then(|v| v.as_str()) != Some(cat) { return false; }
                    }
                    if let Some(ref q) = search {
                        let content = m.get("content").and_then(|v| v.as_str()).unwrap_or("").to_lowercase();
                        let key = m.get("key").and_then(|v| v.as_str()).unwrap_or("").to_lowercase();
                        if !content.contains(q) && !key.contains(q) { return false; }
                    }
                    true
                })
                .collect();

            let results: Vec<Value> = filtered.iter().map(|m| (*m).clone()).collect();
            serde_json::to_string_pretty(&json!({
                "memories": results,
                "total": results.len(),
            }))
            .map_err(|e| format!("Serialize error: {}", e))
        }

        "t3000_memory_delete" => {
            let key = args.get("key").and_then(|v| v.as_str())
                .ok_or_else(|| "key required".to_string())?;

            let mut memories = load_memories().await?;
            let len_before = memories.len();
            memories.retain(|m| m.get("key").and_then(|v| v.as_str()) != Some(key));
            if memories.len() == len_before {
                return Err(format!("Memory not found: {}", key));
            }
            save_memories(&memories).await?;

            Ok(json!({
                "deleted": true,
                "key": key,
                "timestamp": Utc::now().to_rfc3339(),
            }).to_string())
        }

        // ═══ v5: Device Diagnostics ═══

        "t3000_device_diagnostics" => {
            let serial: i32 = args.get("serial_number")
                .and_then(|v| v.as_i64()).map(|n| n as i32)
                .ok_or_else(|| "serial_number required".to_string())?;

            let diag = run_device_diagnostics(db, serial).await?;
            serde_json::to_string_pretty(&diag)
                .map_err(|e| format!("Serialize error: {}", e))
        }

        "t3000_device_diagnostics_batch" => {
            let serials: Vec<i32> = args.get("serial_numbers")
                .and_then(|v| v.as_array())
                .map(|a| a.iter().filter_map(|v| v.as_i64().map(|n| n as i32)).collect())
                .unwrap_or_default();

            let target_serials: Vec<i32> = if serials.is_empty() {
                // Diagnose all devices
                let all_sql = "SELECT SerialNumber FROM DEVICES ORDER BY SerialNumber";
                db.query_all(sea_orm::Statement::from_string(sea_orm::DatabaseBackend::Sqlite, all_sql)).await
                    .map_err(|e| format!("Device list failed: {}", e))?
                    .iter()
                    .filter_map(|r| r.try_get::<i32>("", "SerialNumber").ok())
                    .collect()
            } else {
                serials
            };

            let mut results: Vec<Value> = Vec::new();
            let mut good = 0i32;
            let mut warning = 0i32;
            let mut attention = 0i32;

            for serial in &target_serials {
                match run_device_diagnostics(db, *serial).await {
                    Ok(diag) => {
                        match diag.get("health").and_then(|v| v.as_str()).unwrap_or("unknown") {
                            "good" => good += 1,
                            "warning" => warning += 1,
                            _ => attention += 1,
                        }
                        results.push(diag);
                    }
                    Err(_) => {
                        attention += 1;
                        results.push(json!({
                            "serial": serial,
                            "name": "unknown",
                            "health": "offline",
                            "error": "Device not found or query failed",
                        }));
                    }
                }
            }

            let overall = if attention > 0 { "needs_attention" }
                else if warning > 0 { "warning" }
                else { "good" };

            serde_json::to_string_pretty(&json!({
                "overall_health": overall,
                "summary": { "good": good, "warning": warning, "attention": attention, "total": target_serials.len() },
                "devices": results,
                "timestamp": Utc::now().to_rfc3339(),
            }))
            .map_err(|e| format!("Serialize error: {}", e))
        }

        // ═══ v5: Navigation ═══

        "t3000_nav_list" => {
            let section = args.get("section").and_then(|v| v.as_str());
            let pages = get_nav_pages();
            let filtered: Vec<&NavPage> = if let Some(sec) = section {
                pages.iter().filter(|p| p.section == sec).collect()
            } else {
                pages.iter().collect()
            };
            let results: Vec<Value> = filtered.iter().map(|p| json!({
                "title": p.title,
                "path": p.path,
                "shortcut": p.shortcut,
                "requires_device": p.requires_device,
                "section": p.section,
            })).collect();
            serde_json::to_string_pretty(&json!({"pages": results, "total": results.len()}))
                .map_err(|e| format!("Serialize error: {}", e))
        }

        "t3000_nav_search" => {
            let query = args.get("query").and_then(|v| v.as_str())
                .ok_or_else(|| "query required".to_string())?;
            let query_lower = query.to_lowercase();
            let pages = get_nav_pages();
            let mut scored: Vec<(i32, &NavPage)> = pages.iter()
                .filter_map(|p| {
                    let title_lower = p.title.to_lowercase();
                    let desc_lower = p.description.to_lowercase();
                    let section_lower = p.section.to_lowercase();
                    let mut score = 0i32;
                    if title_lower.contains(&query_lower) { score += 10; }
                    for word in query_lower.split_whitespace() {
                        if title_lower.contains(word) { score += 5; }
                        if desc_lower.contains(word) { score += 2; }
                        if section_lower.contains(word) { score += 1; }
                    }
                    if score > 0 { Some((score, p)) } else { None }
                })
                .collect();
            scored.sort_by(|a, b| b.0.cmp(&a.0));
            let results: Vec<Value> = scored.iter().map(|(s, p)| json!({
                "title": p.title, "path": p.path, "shortcut": p.shortcut,
                "section": p.section, "relevance": s,
            })).collect();
            serde_json::to_string_pretty(&json!({"results": results, "total": results.len()}))
                .map_err(|e| format!("Serialize error: {}", e))
        }

        "t3000_nav_redirect" => {
            let page = args.get("page").and_then(|v| v.as_str())
                .ok_or_else(|| "page required".to_string())?;
            let sn = args.get("serial_number").and_then(|v| v.as_i64()).map(|n| n as i32);
            let pages = get_nav_pages();
            let page_lower = page.to_lowercase();
            let found = pages.iter().find(|p| {
                p.title.to_lowercase().contains(&page_lower)
                    || p.path.to_lowercase().contains(&page_lower)
            });
            match found {
                Some(p) => {
                    let url = if let Some(s) = sn {
                        format!("{}?serial={}", p.path, s)
                    } else {
                        p.path.to_string()
                    };
                    serde_json::to_string_pretty(&json!({
                        "page": p.title, "url": format!("#{}", url),
                        "shortcut": p.shortcut, "requires_device": p.requires_device,
                    }))
                    .map_err(|e| format!("Serialize error: {}", e))
                }
                None => Err(format!("Page not found: {}. Use nav_list to see all pages.", page)),
            }
        }

        "t3000_page_info" => {
            let page = args.get("page").and_then(|v| v.as_str())
                .ok_or_else(|| "page required".to_string())?;
            let pages = get_nav_pages();
            let page_lower = page.to_lowercase();
            let found = pages.iter().find(|p| {
                p.title.to_lowercase().contains(&page_lower)
                    || p.path.to_lowercase().contains(&page_lower)
            });
            match found {
                Some(p) => {
                    serde_json::to_string_pretty(&json!({
                        "title": p.title, "path": p.path,
                        "shortcut": p.shortcut, "requires_device": p.requires_device,
                        "section": p.section,
                        "description": p.description,
                        "features": p.features,
                        "related_tools": p.related_tools,
                    }))
                    .map_err(|e| format!("Serialize error: {}", e))
                }
                None => Err(format!("Page not found: {}. Use nav_list to see all pages.", page)),
            }
        }

        "t3000_device_current" => {
            // Return the device the user last interacted with via MCP tools.
            // We track this by saving the serial whenever a device-specific tool is called.
            let state_file = data_dir().join("mcp_device_context.json");
            let last_serial: Option<i32> = if state_file.exists() {
                if let Ok(content) = tokio::fs::read_to_string(&state_file).await {
                    serde_json::from_str::<Value>(&content).ok()
                        .and_then(|v| v.get("serial").and_then(|s| s.as_i64()).map(|n| n as i32))
                } else { None }
            } else { None };

            if let Some(serial) = last_serial {
                let sql = format!("SELECT Product_Name, Product_ID FROM DEVICES WHERE SerialNumber = {}", serial);
                let rows = db.query_all(sea_orm::Statement::from_string(sea_orm::DatabaseBackend::Sqlite, &sql)).await
                    .map_err(|e| format!("Device query failed: {}", e))?;
                if let Some(row) = rows.first() {
                    let name: String = row.try_get("", "Product_Name").unwrap_or_default();
                    let pid: i32 = row.try_get("", "Product_ID").unwrap_or(0);
                    let cnt_sql = format!("SELECT 'inputs' as k, COUNT(*) as c FROM INPUTS WHERE SerialNumber = {0}
                        UNION ALL SELECT 'outputs', COUNT(*) FROM OUTPUTS WHERE SerialNumber = {0}
                        UNION ALL SELECT 'variables', COUNT(*) FROM VARIABLES WHERE SerialNumber = {0}", serial);
                    let mut ic = 0i64; let mut oc = 0i64; let mut vc = 0i64;
                    if let Ok(crows) = db.query_all(sea_orm::Statement::from_string(sea_orm::DatabaseBackend::Sqlite, &cnt_sql)).await {
                        for cr in &crows {
                            let k: String = cr.try_get("", "k").unwrap_or_default();
                            let c: i64 = cr.try_get("", "c").unwrap_or(0);
                            match k.as_str() { "inputs" => { ic = c; } "outputs" => { oc = c; } "variables" => { vc = c; } _ => {} }
                        }
                    }
                    return serde_json::to_string_pretty(&json!({
                        "serial": serial, "name": name, "device_type": pid,
                        "points": { "inputs": ic, "outputs": oc, "variables": vc, "total": ic + oc + vc },
                        "note": "This device is currently selected in the T3000 UI. It may or may not be the device the user wants to work with — ALWAYS confirm with the user before proceeding."
                    }))
                    .map_err(|e| format!("Serialize error: {}", e));
                }
            }

            // Fallback: return device list so the model can ask the user to pick
            let all_sql = "SELECT SerialNumber, Product_Name, Product_ID FROM DEVICES ORDER BY SerialNumber";
            let all_rows = db.query_all(sea_orm::Statement::from_string(sea_orm::DatabaseBackend::Sqlite, all_sql)).await.unwrap_or_default();
            let devices: Vec<Value> = all_rows.iter().map(|r| json!({
                "serial": r.try_get::<i32>("", "SerialNumber").unwrap_or(0),
                "name": r.try_get::<String>("", "Product_Name").unwrap_or_default(),
            })).collect();
            Ok(json!({
                "devices": devices,
                "total": devices.len(),
                "note": "No device has been used yet in this session. Ask the user which device they want to work with."
            }).to_string())
        }

        "t3000_set_chat_device" => {
            let serial: i32 = args.get("serial_number")
                .and_then(|v| v.as_i64()).map(|n| n as i32)
                .ok_or_else(|| "serial_number required".to_string())?;

            let state_file = data_dir().join("mcp_device_context.json");
            let mut existing = if state_file.exists() {
                load_json_file(&state_file).await.unwrap_or(json!({}))
            } else {
                json!({})
            };
            // Look up device name
            let dev_name = if let Ok(rows) = db.query_all(
                sea_orm::Statement::from_string(sea_orm::DatabaseBackend::Sqlite,
                    &format!("SELECT Product_Name FROM DEVICES WHERE SerialNumber = {}", serial))
            ).await {
                rows.first().and_then(|r| r.try_get::<String>("", "Product_Name").ok())
            } else { None };
            existing["chat_device"] = json!(serial);
            existing["chat_device_name"] = json!(dev_name);
            existing["confirmed_at"] = json!(Utc::now().to_rfc3339());
            existing["updated_at"] = json!(Utc::now().to_rfc3339());
            save_json_file(&state_file, &existing).await
                .map_err(|e| format!("Failed to save: {}", e))?;

            info!("[MCP] chat_device set to serial={} name={:?}", serial, dev_name);
            mcp_log(&format!("chat_device confirmed: serial={}", serial));
            Ok(json!({
                "ok": true,
                "chat_device": serial,
                "chat_device_name": dev_name,
                "note": "Chat device confirmed. All subsequent operations will use this device."
            }).to_string())
        }

        _ => Err(format!("Unknown tool: {}", name)),
    };
    match &result {
        Ok(_) => { info!("[MCP] <- {} OK", name); mcp_log(&format!("<- {} OK", name)); },
        Err(e) => { error!("[MCP] <- {} FAILED: {}", name, e); mcp_log(&format!("<- {} FAILED: {}", name, e)); },
    }
    result
}
