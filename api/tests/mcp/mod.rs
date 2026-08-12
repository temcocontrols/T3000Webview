//! MCP Tool Test Suite — module declarations
//!
//! Tests are grouped into DB-independent and DB-dependent categories.
//! DB-dependent tests skip gracefully when no database is available,
//! so the entire suite runs in CI and live environments alike.

pub mod common;
pub mod tool_definitions;
pub mod core;
pub mod navigation;
pub mod task_management;
pub mod site_memory;
pub mod docs;
pub mod mcp_test;
pub mod mcp_tool_tests;

// DB-dependent modules — each checks DB availability and skips if unavailable
pub mod haystack;
pub mod data_and_metadata;
pub mod operational;
pub mod analytics;
pub mod rules;
pub mod alarms_and_trends;
pub mod device_operations;
pub mod diagnostics;
pub mod integration_flows;
