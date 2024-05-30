use utils::copy_database_if_not_exists;

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

// Externally callable function to run the server for using from C++, returning a RustError.
#[no_mangle]
pub extern "C" fn run_server() -> RustError {
    // Create a new Tokio runtime for asynchronous operations.
    let runtime = match tokio::runtime::Runtime::new() {
        Ok(rt) => rt,                      // Successfully created the runtime.
        Err(_) => return RustError::Error, // Failed to create the runtime.
    };

    // Run the server logic in a blocking thread within the Tokio runtime.
    let result = runtime.block_on(async {
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
    });

    result // Return the result of the server startup.
}
