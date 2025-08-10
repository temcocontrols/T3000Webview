use t3_webview_api::server::server_start;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    server_start().await
}
