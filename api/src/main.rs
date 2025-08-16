use t3_webview_api;
use std::error::Error;
use std::env;

/// Main entry point - starts all T3000 services using modular architecture
#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    // Check for --migrate flag
    let args: Vec<String> = env::args().collect();
    let should_migrate = args.iter().any(|arg| arg == "--migrate");

    t3_webview_api::start_all_services_with_options(should_migrate).await
}
