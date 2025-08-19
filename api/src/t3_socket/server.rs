use std::error::Error;
use std::sync::{Arc, Mutex};
use std::time::Duration;

use futures_util::{SinkExt, StreamExt};
use tokio::net::{TcpListener, TcpStream};
use tokio::time::sleep;
use tokio_tungstenite::accept_hdr_async_with_config;
use tokio_tungstenite::tungstenite::handshake::server::{Request, Response};
use tokio_tungstenite::tungstenite::protocol::{Message, WebSocketConfig};
use uuid::Uuid;

use super::types::*;
use crate::utils::log_message;
// use crate::t3_device::trend_collector::TrendDataCollector; // Temporarily disabled

/// Start the WebSocket service on port 9104
pub async fn start_websocket_service() -> Result<(), Box<dyn Error>> {
    // Log to structured log for headless service
    use crate::logger::write_structured_log;
    let timestamp = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S UTC");
    let start_msg = format!("[{}] Initializing WebSocket Service on port 9104", timestamp);
    let _ = write_structured_log("websocket", &start_msg);

    let clients = crate::t3_socket::create_clients();

    // Start the WebSocket server (blocking)
    start_websocket_server_blocking(clients).await;

    // Log success to structured log
    let timestamp = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S UTC");
    let success_msg = format!("[{}] WebSocket Service started successfully on port 9104", timestamp);
    let _ = write_structured_log("websocket", &success_msg);

    Ok(())
}

/// Start the WebSocket server on port 9104
pub async fn start_websocket_server(clients: Clients) {
    tokio::spawn(async move {
        start_websocket_server_blocking(clients).await;
    });
}

/// Start the WebSocket server on port 9104 (blocking version)
pub async fn start_websocket_server_blocking(clients: Clients) {
    let ws_listener = TcpListener::bind(format!("0.0.0.0:{}", WS_PORT))
        .await
        .unwrap();

    log_message(
        &format!(
            "WebSocket server listening on {:?}",
            ws_listener.local_addr()
        ),
        true,
    );

    loop {
        match ws_listener.accept().await {
            Ok((socket, addr)) => {
                log_message(&format!(""), true);
                log_message(&format!(""), true);
                log_message(&format!("New client connected: {:?}", addr), true);
                log_message(&format!("Socket details: {:?}", socket), true);

                let config = WebSocketConfig {
                    max_message_size: Some(MAX_MESSAGE_SIZE),
                    max_frame_size: Some(MAX_FRAME_SIZE),
                    ..Default::default()
                };

                let clients = clients.clone();
                tokio::spawn(async move {
                    if let Err(e) = handle_websocket(socket, clients, config.clone()).await {
                        log_message(&format!("WebSocket error: {:?}", e), true);
                    }
                });
            }
            Err(e) => {
                log_message(&format!("Failed to accept connection: {:?}", e), true);
            }
        }
    }
}

/// Handle individual WebSocket connections
async fn handle_websocket(
    stream: TcpStream,
    clients: Clients,
    config: WebSocketConfig,
) -> Result<(), Box<dyn Error>> {
    log_message(&format!("Start handling websocket"), true);
    log_message(&format!("Stream: {:?}", stream), true);
    log_message(&format!(""), true);

    let ws_stream = match accept_hdr_async_with_config(
        stream,
        |_req: &Request, response: Response| {
            log_message(&format!("Received a connection request: {:#?}", _req), true);
            log_message(&format!("Response with: {:#?}", response), true);
            Ok(response)
        },
        Some(config),
    )
    .await
    {
        Ok(ws) => ws,
        Err(e) => {
            log_message(
                &format!("Failed to accept websocket connection: {:?}", e),
                true,
            );
            return Err(Box::new(e));
        }
    };

    let (mut write, mut read) = ws_stream.split();
    let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel();

    tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            if let Err(e) = write.send(msg).await {
                log_message(&format!("Error sending message to client: {:?}", e), true);
                break;
            }
        }
    });

    // Handle incoming messages
    while let Some(msg) = read.next().await {
        let msg = msg?;

        // Log the frame size
        let info_msg = msg.clone();
        let frame_size = info_msg.into_data().len();

        log_message(&format!("Frame size: {} bytes", frame_size), true);
        log_message(&format!("Received message: {:?}", msg), true);

        if msg.is_text() || msg.is_binary() {
            let msg_text = msg.to_text()?;

            let json_msg: serde_json::Value = match serde_json::from_str(msg_text) {
                Ok(json) => json,
                Err(_) => {
                    log_message(
                        &format!("Message with incorrect json format: {}", msg_text),
                        true,
                    );
                    continue;
                }
            };

            // Handle message structure: {"header":{"clientId":"-","from":"Firefox"},"message":{"action":-1,"clientId":"..."}}
            if let Some(message) = json_msg.get("message") {
                // NON-INVASIVE: Intercept data for trend collection (preserves existing functionality)
                intercept_trend_data(&json_msg).await;

                if let Some(action) = message.get("action").and_then(|a| a.as_i64()) {
                    if action == ACTION_BIND_CLIENT {
                        bind_clients(message, &clients, &tx).await?;

                        sleep(Duration::from_secs(1)).await;
                        if let Err(e) = notify_web_clients(message, &clients).await {
                            log_message(&format!("Failed to notify web clients: {:?}", e), true);
                        }
                    } else {
                        send_message_to_data_client(message, &clients).await?;
                    }
                }
            } else {
                // NON-INVASIVE: Intercept data for trend collection (preserves existing functionality)
                intercept_trend_data(&json_msg).await;

                // Handle direct messages and transfer processed data back to web clients
                if let Some(action) = json_msg.get("action") {
                    log_message(&format!("Send processed data back to web client"), true);

                    if let Some(action_int) = action.as_i64() {
                        // Handle action as an integer
                        if action_int != ACTION_BIND_CLIENT {
                            send_data_to_web_client(msg, &clients).await?;
                        }
                    } else if let Some(_action_str) = action.as_str() {
                        // Handle action as a string
                        send_data_to_web_client(msg, &clients).await?;
                    } else {
                        log_message("Action is neither an integer nor a string", true);
                    }
                }
            }
        }
    }

    Ok(())
}

/// Bind client IDs to WebSocket sessions
async fn bind_clients(
    message: &serde_json::Value,
    clients: &Clients,
    tx: &tokio::sync::mpsc::UnboundedSender<Message>,
) -> Result<(), Box<dyn Error>> {
    if let Some(client_id_str) = message.get("clientId").and_then(|id| id.as_str()) {
        let mut clients = clients.lock().unwrap();

        if client_id_str == T3000_DATA_CLIENT_ID {
            clients.retain(|(id, _)| {
                *id != Uuid::parse_str(T3000_DATA_CLIENT_ID).unwrap()
            });
        }

        let client_id = Uuid::parse_str(client_id_str)?;
        clients.push((client_id, tx.clone()));
    }
    Ok(())
}

/// Send message to T3000 data client
async fn send_message_to_data_client(
    message: &serde_json::Value,
    clients: &Clients,
) -> Result<(), Box<dyn Error>> {
    let clients = clients.lock().unwrap();
    for (id, client) in clients.iter() {
        if *id == Uuid::parse_str(T3000_DATA_CLIENT_ID)? {
            let text_message = Message::text(message.to_string());

            print!("Send message to data client: {:?}", text_message);

            if let Err(e) = client.send(text_message) {
                log_message(
                    &format!("Failed to send text msg to client ==1111: {:?}", e),
                    true,
                );
            }
        }
    }
    Ok(())
}

/// Send data to web clients (excluding T3000 data client)
async fn send_data_to_web_client(
    message: Message,
    clients: &Clients,
) -> Result<(), Box<dyn Error>> {
    let clients = clients.lock().unwrap();
    for (id, client) in clients.iter() {
        if *id != Uuid::parse_str(T3000_DATA_CLIENT_ID)? {
            if let Err(e) = client.send(message.clone()) {
                log_message(
                    &format!("Failed to send message to web client: {:?}", e),
                    true,
                );
            }
        }
    }
    Ok(())
}

/// Notify all web clients that the data client is online
async fn notify_web_clients(
    message: &serde_json::Value,
    clients: &Clients,
) -> Result<(), Box<dyn Error>> {
    let client_id_str = match message.get("clientId").and_then(|id| id.as_str()) {
        Some(id) => id,
        None => return Ok(()),
    };

    if client_id_str != T3000_DATA_CLIENT_ID {
        return Ok(());
    }

    let clients = clients.lock().unwrap();
    let notification = serde_json::json!({
      "action": ACTION_DATA_SERVER_ONLINE,
      "message": "Data server is online"
    });
    let message = Message::text(notification.to_string());

    for (id, client) in clients.iter() {
        if *id != Uuid::parse_str(T3000_DATA_CLIENT_ID)? {
            if let Err(e) = client.send(message.clone()) {
                log_message(
                    &format!("Failed to send notification to web client: {:?}", e),
                    true,
                );
            }
        }
    }

    Ok(())
}

/// NON-INVASIVE: Intercept WebSocket messages for trend data collection
/// This function runs in parallel with existing message handling
async fn intercept_trend_data(json_msg: &serde_json::Value) {
    // This is a placeholder for the actual trend data interception
    // We'll implement the actual logic based on your T3000 message format

    // For now, just log that we're intercepting
    if let Some(action) = json_msg.get("action") {
        if let Some(action_str) = action.as_str() {
            if action_str.contains("data") || action_str.contains("trend") || action_str.contains("value") {
                log_message(&format!("🔍 Intercepted potential trend data message: {}", action_str), false);
            }
        } else if let Some(action_int) = action.as_i64() {
            // Log numeric actions that might be trend data
            log_message(&format!("🔍 Intercepted numeric action: {}", action_int), false);
        }
    }

    // Check for specific trend data patterns in the message
    if json_msg.get("input").is_some() ||
       json_msg.get("output").is_some() ||
       json_msg.get("variable").is_some() ||
       json_msg.get("points").is_some() ||
       json_msg.get("trend").is_some() {
        log_message("🔍 Found potential point data in message", false);
    }
}
