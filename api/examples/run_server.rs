// Example of how to run the server used to serve the webview api and ui components
use t3_webview_api;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    t3_webview_api::start_all_services_t3_migrations_only().await
}
