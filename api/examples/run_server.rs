// Example of how to run the server used to serve the webview api and ui components
use t3_webview_api;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Load .env file — try current dir first, then relative to manifest dir
    let env_result = dotenvy::dotenv();
    match &env_result {
        Ok(path) => println!("[ENV] Loaded .env from: {}", path.display()),
        Err(e) => {
            // Try loading from the Cargo manifest directory (api/)
            let manifest_dir = std::env::var("CARGO_MANIFEST_DIR").unwrap_or_default();
            let env_path = std::path::Path::new(&manifest_dir).join(".env");
            if env_path.exists() {
                match dotenvy::from_path(&env_path) {
                    Ok(_) => println!("[ENV] Loaded .env from: {}", env_path.display()),
                    Err(e2) => eprintln!("[ENV] Failed to load .env: {} (also tried {}: {})", e, env_path.display(), e2),
                }
            } else {
                eprintln!("[ENV] No .env found (cwd={:?}, manifest_dir={})", std::env::current_dir().ok(), manifest_dir);
            }
        }
    }

    // Print resolved database paths so it's clear what's being used
    let db_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "sqlite://Database/webview_database.db (default)".to_string());
    let t3_db_url = std::env::var("T3_DEVICE_DATABASE_URL")
        .unwrap_or_else(|_| "sqlite://Database/webview_t3_device.db (default)".to_string());

    println!("══════════════════════════════════════════════");
    println!("  T3000 WebView API Server");
    println!("══════════════════════════════════════════════");
    println!("  DATABASE_URL           = {}", db_url);
    println!("  T3_DEVICE_DATABASE_URL = {}", t3_db_url);
    println!("  HTTP API               → http://localhost:9103");
    println!("  WebSocket              → ws://localhost:9104");
    println!("══════════════════════════════════════════════");

    t3_webview_api::start_all_services_t3_migrations_only().await
}
