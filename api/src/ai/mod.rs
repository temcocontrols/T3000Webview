// AI Chat — Module root.
//
// Mount all AI routes under /api/ai/* via create_ai_routes().
// Called from server.rs during app construction.

pub mod mcp_client;
pub mod prompt_builder;
pub mod providers;
pub mod routes;
pub mod session;
pub mod session_store;
pub mod tool_executor;
pub mod types;

use axum::Router;
use crate::app_state::T3AppState;

/// Create the AI route group. Mount at /api via .merge() in server.rs.
pub fn create_ai_routes() -> Router<T3AppState> {
    routes::ai_routes()
}
