/**
 * T3 Develop Module - Axum Routes
 *
 * Developer tools backend services compatible with Axum web framework
 */

pub mod file_browser;
pub mod database_viewer;
pub mod system_logs;

use axum::{Router, routing::{get, post}};
use crate::app_state::T3AppState;

/// Create develop routes
pub fn create_develop_routes() -> Router<T3AppState> {
    Router::new()
        // File browser routes
        .route("/files/list", get(file_browser::list_files))
        .route("/files/read", get(file_browser::read_file))
        // Database viewer routes
        .route("/database/list", get(database_viewer::list_databases))
        .route("/database/tables", get(database_viewer::list_tables))
        .route("/database/query", post(database_viewer::execute_query))
        // System logs routes
        .route("/logs/get", get(system_logs::get_logs))
}
