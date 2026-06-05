// Example of how to run the server used to serve the webview api and ui components
use t3_webview_api;
use std::io::Write;

/// Print to console AND append to the debug log file (if it exists).
macro_rules! tee {
    ($($arg:tt)*) => {{
        let msg = format!($($arg)*);
        println!("{}", msg);
        if let Ok(mut f) = std::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open("t3-webview-api-dll.log")
        {
            let _ = writeln!(f, "{}", msg);
        }
    }};
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Load .env file — try current dir first, then relative to manifest dir
    let env_result = dotenvy::dotenv();
    match &env_result {
        Ok(path) => tee!("[ENV] Loaded .env from: {}", path.display()),
        Err(e) => {
            // Try loading from the Cargo manifest directory (api/)
            let manifest_dir = std::env::var("CARGO_MANIFEST_DIR").unwrap_or_default();
            let env_path = std::path::Path::new(&manifest_dir).join(".env");
            if env_path.exists() {
                match dotenvy::from_path(&env_path) {
                    Ok(_) => tee!("[ENV] Loaded .env from: {}", env_path.display()),
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

    tee!("══════════════════════════════════════════════");
    tee!("  T3000 WebView API Server");
    tee!("══════════════════════════════════════════════");
    tee!("  DATABASE_URL           = {}", db_url);
    tee!("  T3_DEVICE_DATABASE_URL = {}", t3_db_url);
    tee!("  HTTP API               → http://localhost:9103");
    tee!("  WebSocket              → ws://localhost:9104");
    tee!("══════════════════════════════════════════════");

    t3_webview_api::start_all_services_t3_migrations_only().await
}
