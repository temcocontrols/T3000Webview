pub mod app_state;
pub mod auth;
pub mod db_connection;
pub mod entity;
pub mod error;
pub mod modbus_register;
pub mod server;
pub mod user;

#[repr(C)]
pub enum RustError {
    Ok = 0,
    Error = 1,
}

#[no_mangle]
pub extern "C" fn run_server() -> RustError {
    match tokio::runtime::Runtime::new() {
        Ok(runtime) => match runtime.block_on(server::server_start()) {
            Ok(_) => RustError::Ok,
            Err(_) => RustError::Error,
        },
        Err(_) => RustError::Error,
    }
}
