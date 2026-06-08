use t3_webview_api;
use std::error::Error;
use std::env;

/// Main entry point - starts all T3000 services using modular architecture
///
/// ## Migration behavior
/// Both migration systems run automatically on every startup regardless of flags:
///   - `Migrator` (webview_database.db)    → `server_start()` → `run_migrations_if_pending()`
///   - `T3DeviceMigrator` (webview_t3_device.db) → `initialize_t3_device_database()` → `run_t3_device_migrations()`
///
/// The `--migrate` CLI flag is optional — it forces `Migrator` to run upfront before
/// `start_all_services()`, but `run_migrations_if_pending()` would do the same moments later.
/// This flag has no effect when running as a DLL (`run_t3_server`).
#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    // Optional --migrate flag: forces main DB migrations upfront (redundant with auto-run in server_start)
    let args: Vec<String> = env::args().collect();
    let should_migrate = args.iter().any(|arg| arg == "--migrate");

    t3_webview_api::start_all_services_with_options(should_migrate).await
}
