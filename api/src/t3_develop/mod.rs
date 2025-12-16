/**
 * T3 Develop Module
 *
 * Developer tools backend services:
 * - File browser (filesystem operations)
 * - Database viewer (SQLite query execution)
 * - Transport tester (message logging/history)
 * - System logs (log file access)
 */

pub mod file_browser;
pub mod database_viewer;
pub mod system_logs;

use axum::{Router, routing::{get, post}};

/// Create develop routes
pub fn create_develop_routes<S>() -> Router<S>
where
    S: Clone + Send + Sync + 'static,
{
    Router::new()
        // File browser routes
        .route("/files/list", get(file_browser::routes::list_files))
        .route("/files/read", get(file_browser::routes::read_file))
        // Database viewer routes
        .route("/database/list", get(database_viewer::routes::list_databases))
        .route("/database/tables", get(database_viewer::routes::list_tables))
        .route("/database/query", post(database_viewer::routes::execute_query))
        // System logs routes
        .route("/logs/get", get(system_logs::routes::get_logs))
}
