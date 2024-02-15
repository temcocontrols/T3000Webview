pub mod db_connection;
pub mod error;
pub mod modbus_register;
pub mod server;

#[no_mangle]
pub extern "C" fn run_server() {
    tokio::runtime::Runtime::new()
        .unwrap()
        .block_on(server::server_start());
}
