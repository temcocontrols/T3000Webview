use std::panic;
use utils::{copy_database_if_not_exists, SHUTDOWN_CHANNEL};

pub mod app_state;
pub mod auth;
pub mod db_connection;
pub mod entity;
pub mod error;
pub mod file;
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
            match server::server_start().await {
                Ok(_) => RustError::Ok, // Server started successfully.
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
