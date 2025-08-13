use std::error::Error;
use std::time::Duration;

use tokio::time::sleep;
use tokio_tungstenite::tungstenite::protocol::Message;
use uuid::Uuid;

use super::types::*;
use crate::utils::log_message;

/// Monitor client status periodically
pub async fn monitor_clients_status(clients: Clients) {
    loop {
        if let Err(e) = check_clients_status(clients.clone()).await {
            log_message(&format!("Error checking clients status: {:?}", e), true);
        }
        sleep(Duration::from_secs(CLIENT_STATUS_CHECK_INTERVAL)).await;
    }
}

/// Check status of all connected clients
async fn check_clients_status(clients: Clients) -> Result<(), Box<dyn Error>> {
    let mut clients = clients.lock().unwrap();
    let total_clients_count = clients.len();

    let mut dead_clients = Vec::new();
    let data_client_id = Uuid::parse_str(T3000_DATA_CLIENT_ID)?;

    for (id, client) in clients.iter() {
        if *id != data_client_id {
            if client.is_closed() {
                dead_clients.push(*id);
            }
        }
    }

    let dead_clients_count: usize = dead_clients.len();

    for id in dead_clients {
        clients.retain(|(client_id, _)| *client_id != id);
    }

    let available_clients_count = clients.len();

    let data_client_alive = clients.iter().any(|(id, _)| *id == data_client_id);
    if !data_client_alive {
        let error_message = serde_json::json!({
          "action": ACTION_DATA_SERVER_DOWN,
          "message": "The data server is down, please check whether the T3 application is running"
        });
        let message = Message::text(error_message.to_string());

        for (id, client) in clients.iter() {
            if *id != data_client_id {
                if let Err(e) = client.send(message.clone()) {
                    log_message(
                        &format!("Failed to send error message to client: {:?}", e),
                        true,
                    );
                }
            }
        }
    }

    log_message(
        &format!(
            "Check status: Total clients: {:?}, Available now: {}, Dead clients: {}",
            total_clients_count, available_clients_count, dead_clients_count
        ),
        true,
    );

    Ok(())
}
