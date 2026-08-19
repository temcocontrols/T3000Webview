//! MCP Tool Test Suite — entry point
//!
//! This file makes `tests/mcp/` discoverable by Cargo as a test binary.
//! All test functions live in the `mcp/` subdirectory, organized by category.
//!
//! Run with: cargo test --test mcp_test
//! Run DB-dependent tests: cargo test --test mcp_test -- --ignored

#[path = "mcp/mod.rs"]
mod mcp;
