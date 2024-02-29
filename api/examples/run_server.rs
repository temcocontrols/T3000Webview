use t3_webview_api;

#[tokio::main]
async fn main() {
    t3_webview_api::server::server_start().await.unwrap();
}
