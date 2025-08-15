use std::panic;
use utils::{copy_database_if_not_exists, SHUTDOWN_CHANNEL};

pub mod app_state;
pub mod auth;
pub mod db_connection;
pub mod entity;
pub mod error;
pub mod file;
pub mod logger;
pub mod modbus_register;
pub mod server;
pub mod user;
pub mod utils;

#[repr(C)]
pub enum RustError {
    Ok = 0,
    Error = 1,
}

// Externally callable function to shut down the server for using from C++.
#[no_mangle]
pub extern "C" fn shutdown_server() {
    // Send a shutdown signal to the server
    let _ = tokio::runtime::Builder::new_multi_thread()
        .enable_all()
        .build()
        .unwrap()
        .block_on(async {
            let sender = SHUTDOWN_CHANNEL.lock().await;
            sender.send(()).await.ok();
        });
}

// Externally callable function to run the server for using from C++, returning a RustError.
#[no_mangle]
pub extern "C" fn run_server() -> RustError {
    // Use panic::catch_unwind to catch any panic and prevent it from unwinding across FFI boundaries.
    let result = panic::catch_unwind(|| {
        // Create a new Tokio runtime for asynchronous operations.
        let runtime = match tokio::runtime::Runtime::new() {
            Ok(rt) => rt,                      // Successfully created the runtime.
            Err(_) => return RustError::Error, // Failed to create the runtime.
        };

        // Run the server logic in a blocking thread within the Tokio runtime.
        runtime.block_on(async {
            dotenvy::dotenv().ok(); // Load environment variables from a .env file, if it exists.
            copy_database_if_not_exists().ok(); // Copy the database if it doesn't already exist.

            // Start both HTTP (8000) and WebSocket (8001) services
            match start_all_services().await {
                Ok(_) => RustError::Ok, // Both servers started successfully.
                Err(err) => {
                    // Handle server errors (log the error and return RustError::Error).
                    eprintln!("Server error: {:?}", err);
                    RustError::Error
                }
            }
        })
    });

    // If the closure inside catch_unwind ran without panicking, return the result.
    // If a panic occurred, return an error.
    match result {
        Ok(res) => res,             // Normal execution, return the server result.
        Err(_) => RustError::Error, // A panic occurred, return RustError::Error.
    }
}

// ============================================================================
// ABSTRACTED FUNCTIONS - All new functionality separated from original code
// ============================================================================

pub mod t3_device;
pub mod t3_socket;

/// Start all T3000 services (HTTP + WebSocket)
pub async fn start_all_services() -> Result<(), Box<dyn std::error::Error>> {
    // Log to file for headless service
    let timestamp = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S UTC");
    let startup_msg = format!("[{}] T3000 WebView Service initializing HTTP (9103) + WebSocket (9104)", timestamp);

    // Write to structured log file
    use crate::logger::write_structured_log;
    let _ = write_structured_log("startup", &startup_msg);

    // Start WebSocket service in background
    let websocket_handle = tokio::spawn(async move {
        if let Err(e) = crate::t3_socket::start_websocket_service().await {
            // Log WebSocket errors to structured log
            let timestamp = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S UTC");
            let error_msg = format!("[{}] WebSocket service failed: {}", timestamp, e);
            let _ = write_structured_log("service_errors", &error_msg);
        }
    });

    // Give WebSocket a moment to start
    tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;

    // Start HTTP server (this will block and run the main server)
    let http_result = server::server_start().await;

    // If HTTP server stops, we should stop WebSocket too
    websocket_handle.abort();

    http_result
}/// Abstracted T3000 server startup for DLL entry point
#[no_mangle]
pub extern "C" fn run_t3_server() -> RustError {
    let result = panic::catch_unwind(|| {
        let runtime = match tokio::runtime::Runtime::new() {
            Ok(rt) => rt,
            Err(_) => return RustError::Error,
        };

        runtime.block_on(async {
            println!("🔗 T3000 DLL Entry Point: Starting all services...");

            match start_all_services().await {
                Ok(_) => {
                    println!("✅ T3000 WebView API services started from DLL");
                    RustError::Ok
                }
                Err(err) => {
                    eprintln!("❌ DLL service startup failed: {:?}", err);
                    RustError::Error
                }
            }
        })
    });

    match result {
        Ok(res) => res,
        Err(_) => RustError::Error,
    }
}
