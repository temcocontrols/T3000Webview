use t3_webview_api;
use std::error::Error;

/// Main entry point - starts all T3000 services using modular architecture
#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    t3_webview_api::start_all_services().await
}
