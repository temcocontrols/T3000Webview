use t3_webview_api;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    Ok(t3_webview_api::server::server_start().await?)
}
