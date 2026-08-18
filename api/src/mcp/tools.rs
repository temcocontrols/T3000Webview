//! MCP Tool Definitions — all 45+ tools exposed to LLM agents.

use serde_json::json;
use crate::mcp::types::ToolDef;

// ═══ Tool Definitions ═══ 

lazy_static::lazy_static! {
    pub static ref TOOLS: Vec<ToolDef> = vec![
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
    // ═══ Network Discovery ═══
    ToolDef {
        name: "t3000_scan_network",
        title: "Scan Network for T3000 Devices",
        description: "Scan the local network for T3000 devices via UDP broadcast (0x64/0x65 protocol). Returns discovered devices with serial numbers, IP addresses, product types, firmware versions, panel names, and subnet info. Takes 5–10 seconds. Use this to discover new/replacement devices on the network.",
        input_schema: json!({
            "type": "object",
            "properties": {
                "timeout_seconds": {
                    "type": "integer",
                    "description": "Seconds to wait for device responses (default: 8, range: 3–30)"
                }
            }
        }),
    },
    // ═══ v4: Data & Metadata ═══ 
    ToolDef {
        name: "t3000_device_list",
        title: "List Devices",
        description: "Enumerate all devices with serial numbers, names, types, point counts, building, floor, room, and online/offline status (is_online) from the latest LAN scan. Use refresh=true to trigger a network scan to update device information.",
        input_schema: json!({
            "type": "object",
            "properties": {
                "filter_name": {
                    "type": "string",
                    "description": "Optional: filter devices by name substring"
                },
                "refresh": {
                    "type": "boolean",
                    "description": "Optional: trigger network scan to refresh device information"
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
                    "description": "1-based point index (matches UI display, e.g. out1=1)"
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
                    "description": "1-based point index (matches UI display, e.g. out1=1)"
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
