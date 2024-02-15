use modbus_register_api;

#[tokio::main]
async fn main() {
    modbus_register_api::server::server_start().await
}
