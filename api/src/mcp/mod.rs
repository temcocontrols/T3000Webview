// MCP (Model Context Protocol) Server — Streamable HTTP transport
// Exposes 50+ tools for LLM agents via POST /api/mcp (JSON-RPC 2.0)
// SSE server→client streaming via GET /api/mcp
// Session termination via DELETE /api/mcp
//
// Protocol spec: https://spec.modelcontextprotocol.io/
// Transport spec: Streamable HTTP
//
// Categories:
//   Haystack (7):   list_tags, get_point_tags, search_points, auto_tag,
//                   preview_tags, list_rules, get_brick_class
//   Core (3):       ping, get_version, describe_tool
//   Data (4):       device_list, device_get_points, point_get_metadata, metadata_search
//   Operational(5): point_read, point_write, point_read_batch, point_write_batch, point_batch_metadata
//   Analytics (2):  haystack_validate, haystack_export
//   Tasks (4):      task_create, task_list, task_update, task_delete
//   Memory (3):     memory_save, memory_list, memory_delete
//   Diagnostics(2): device_diagnostics, device_diagnostics_batch
//   Navigation (5): nav_list, nav_search, nav_redirect, page_info, device_current
//   Rules (2):      rule_toggle, rule_create
//   Alarms (3):     alarm_list, alarm_acknowledge, trendlog_query
//   Docs (2):       doc_list, doc_read
//   Docs (2):       doc_list, doc_read
//   Device (12):    trendlog_list, trendlog_export, device_refresh, schedule_list, settings_read, settings_write, device_control,
//                   program_list, program_read, pid_list, holiday_list, building_summary

pub mod types;
pub mod storage;
pub mod server;
pub mod tools;
pub mod dispatch;

// Re-export commonly used items for convenience
pub use server::{create_mcp_routes, mcp_post_handler, mcp_sse_handler, mcp_delete_handler};
pub use dispatch::execute_tool;
pub use tools::TOOLS;
pub use types::ToolDef;
