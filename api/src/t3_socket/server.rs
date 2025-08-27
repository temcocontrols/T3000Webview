use std::error::Error;
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
    use crate::logger::{write_structured_log_with_level, LogLevel};
    let start_msg = "Initializing WebSocket Service on port 9104";
    let _ = write_structured_log_with_level("T3_Webview_Socket", &start_msg, LogLevel::Info);

    let clients = crate::t3_socket::create_clients();

    // Start the WebSocket server (blocking)
    start_websocket_server_blocking(clients).await;

    // Log success to structured log
    let success_msg = "WebSocket Service started successfully on port 9104";
    let _ = write_structured_log_with_level("T3_Webview_Socket", &success_msg, LogLevel::Info);

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
                log_message(&format!("🔗 New client connected: {:?}", addr), true);
                log_message(&format!("📡 Socket details: {:?}", socket), true);

                let config = WebSocketConfig {
                    max_message_size: Some(MAX_MESSAGE_SIZE),
                    max_frame_size: Some(MAX_FRAME_SIZE),
                    ..Default::default()
                };

                let clients = clients.clone();
                tokio::spawn(async move {
                    if let Err(e) = handle_websocket(socket, clients, config.clone()).await {
                        log_message(&format!("❌ WebSocket error: {:?}", e), true);
                    }
                });
            }
            Err(e) => {
                log_message(&format!("❌ Failed to accept connection: {:?}", e), true);
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
    log_message(&format!("🚀 Starting WebSocket handler"), true);
    log_message(&format!("📊 Stream: {:?}", stream), true);
    log_message(&format!(""), true);

    let ws_stream = match accept_hdr_async_with_config(
        stream,
        |_req: &Request, response: Response| {
            log_message(&format!("📥 Received connection request: {:#?}", _req), true);
            log_message(&format!("📤 Responding with: {:#?}", response), true);
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

    // Spawn task to handle outgoing messages
    tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            log_message(&format!("📤 Sending message to client: {:?}", msg), true);
            if let Err(e) = write.send(msg).await {
                log_message(&format!("❌ Error sending message to client: {:?}", e), true);
                break;
            } else {
                log_message(&format!("✅ Message sent successfully"), true);
            }
        }
        log_message(&format!("📤 Outgoing message handler stopped"), true);
    });

    // Handle incoming messages
    log_message(&format!("👂 Starting to listen for incoming messages..."), true);
    while let Some(msg) = read.next().await {
        let msg = msg?;

        // Log the frame size and message details
        let info_msg = msg.clone();
        let frame_size = info_msg.into_data().len();

        log_message(&format!("📊 Received frame - Size: {} bytes", frame_size), true);
        log_message(&format!("📥 Raw message: {:?}", msg), true);

        if msg.is_text() || msg.is_binary() {
            let msg_text = msg.to_text()?;
            log_message(&format!("📝 Message text content: {}", msg_text), true);

            let json_msg: serde_json::Value = match serde_json::from_str(msg_text) {
                Ok(json) => {
                    log_message(&format!("✅ Successfully parsed JSON: {:#}", json), true);
                    json
                },
                Err(e) => {
                    log_message(
                        &format!("❌ Message with incorrect JSON format: {} - Error: {:?}", msg_text, e),
                        true,
                    );
                    continue;
                }
            };

            // Handle message structure: {"header":{"clientId":"-","from":"Firefox"},"message":{"action":-1,"clientId":"..."}}
            if let Some(message) = json_msg.get("message") {
                log_message(&format!("🔧 Processing structured message with header"), true);
                log_message(&format!("📋 Message payload: {:#}", message), true);

                // NON-INVASIVE: Intercept data for trend collection (preserves existing functionality)
                intercept_trend_data(&json_msg).await;

                if let Some(action) = message.get("action").and_then(|a| a.as_i64()) {
                    log_message(&format!("⚡ Processing action: {}", action), true);

                    if action == ACTION_BIND_CLIENT {
                        log_message(&format!("🔗 Binding client..."), true);
                        bind_clients(message, &clients, &tx).await?;
                        log_message(&format!("✅ Client bound successfully"), true);

                        sleep(Duration::from_secs(1)).await;
                        log_message(&format!("📢 Notifying web clients..."), true);
                        if let Err(e) = notify_web_clients(message, &clients).await {
                            log_message(&format!("❌ Failed to notify web clients: {:?}", e), true);
                        } else {
                            log_message(&format!("✅ Web clients notified successfully"), true);
                        }
                    } else {
                        log_message(&format!("📡 Forwarding message to data client..."), true);
                        if let Err(e) = send_message_to_data_client(message, &clients).await {
                            log_message(&format!("❌ Failed to send message to data client: {:?}", e), true);
                        } else {
                            log_message(&format!("✅ Message forwarded to data client"), true);
                        }
                    }
                } else {
                    log_message(&format!("⚠️ Message has no valid action field"), true);
                }
            } else {
                log_message(&format!("🔧 Processing direct message (no header)"), true);

                // NON-INVASIVE: Intercept data for trend collection (preserves existing functionality)
                intercept_trend_data(&json_msg).await;

                // Handle direct messages and transfer processed data back to web clients
                if let Some(action) = json_msg.get("action") {
                    log_message(&format!("📤 Sending processed data back to web client"), true);

                    if let Some(action_int) = action.as_i64() {
                        log_message(&format!("⚡ Processing integer action: {}", action_int), true);
                        // Handle action as an integer
                        if action_int != ACTION_BIND_CLIENT {
                            if let Err(e) = send_data_to_web_client(msg.clone(), &clients).await {
                                log_message(&format!("❌ Failed to send data to web client: {:?}", e), true);
                            } else {
                                log_message(&format!("✅ Data sent to web client successfully"), true);
                            }
                        }
                    } else if let Some(action_str) = action.as_str() {
                        log_message(&format!("⚡ Processing string action: {}", action_str), true);
                        // Handle action as a string
                        if let Err(e) = send_data_to_web_client(msg.clone(), &clients).await {
                            log_message(&format!("❌ Failed to send data to web client: {:?}", e), true);
                        } else {
                            log_message(&format!("✅ Data sent to web client successfully"), true);
                        }
                    } else {
                        log_message("⚠️ Action is neither an integer nor a string", true);
                    }
                } else {
                    log_message(&format!("⚠️ Direct message has no action field"), true);
                }
            }
        } else {
            log_message(&format!("⚠️ Received non-text/non-binary message: {:?}", msg), true);
        }
    }

    log_message(&format!("🔚 WebSocket connection closed - stopped listening for messages"), true);
    Ok(())
}

/// Bind client IDs to WebSocket sessions
async fn bind_clients(
    message: &serde_json::Value,
    clients: &Clients,
    tx: &tokio::sync::mpsc::UnboundedSender<Message>,
) -> Result<(), Box<dyn Error>> {
    if let Some(client_id_str) = message.get("clientId").and_then(|id| id.as_str()) {
        log_message(&format!("🔗 Binding client ID: {}", client_id_str), true);

        let mut clients = clients.lock().unwrap();
        let client_count_before = clients.len();

        if client_id_str == T3000_DATA_CLIENT_ID {
            log_message(&format!("🔄 Removing existing T3000 data client"), true);
            clients.retain(|(id, _)| {
                *id != Uuid::parse_str(T3000_DATA_CLIENT_ID).unwrap()
            });
        }

        let client_id = Uuid::parse_str(client_id_str)?;
        clients.push((client_id, tx.clone()));

        let client_count_after = clients.len();
        log_message(&format!("👥 Client count: {} → {}", client_count_before, client_count_after), true);
        log_message(&format!("✅ Client {} bound successfully", client_id_str), true);
    } else {
        log_message(&format!("⚠️ No clientId found in bind message"), true);
    }
    Ok(())
}

/// Send message to T3000 data client
async fn send_message_to_data_client(
    message: &serde_json::Value,
    clients: &Clients,
) -> Result<(), Box<dyn Error>> {
    log_message(&format!("📡 Looking for T3000 data client..."), true);

    let clients = clients.lock().unwrap();
    let client_count = clients.len();
    let mut data_client_found = false;

    log_message(&format!("👥 Total clients: {}", client_count), true);

    for (id, client) in clients.iter() {
        if *id == Uuid::parse_str(T3000_DATA_CLIENT_ID)? {
            data_client_found = true;
            let text_message = Message::text(message.to_string());
            let message_preview = if message.to_string().len() > 200 {
                format!("{}...", &message.to_string()[..200])
            } else {
                message.to_string()
            };

            log_message(&format!("📤 Sending to T3000 data client: {}", message_preview), true);

            if let Err(e) = client.send(text_message) {
                log_message(
                    &format!("❌ Failed to send message to T3000 data client: {:?}", e),
                    true,
                );
                return Err(Box::new(e));
            } else {
                log_message(&format!("✅ Message sent to T3000 data client successfully"), true);
            }
            break;
        }
    }

    if !data_client_found {
        log_message(&format!("⚠️ T3000 data client not found among {} clients", client_count), true);
    }

    Ok(())
}

/// Send data to web clients (excluding T3000 data client)
async fn send_data_to_web_client(
    message: Message,
    clients: &Clients,
) -> Result<(), Box<dyn Error>> {
    log_message(&format!("🌐 Broadcasting data to web clients..."), true);

    let clients = clients.lock().unwrap();
    let total_clients = clients.len();
    let mut web_client_count = 0;
    let mut success_count = 0;
    let mut error_count = 0;

    let message_preview = match &message {
        Message::Text(text) => {
            if text.len() > 200 {
                format!("Text: {}...", &text[..200])
            } else {
                format!("Text: {}", text)
            }
        },
        Message::Binary(data) => format!("Binary: {} bytes", data.len()),
        _ => format!("{:?}", message)
    };

    log_message(&format!("📤 Message to broadcast: {}", message_preview), true);

    for (id, client) in clients.iter() {
        if *id != Uuid::parse_str(T3000_DATA_CLIENT_ID)? {
            web_client_count += 1;
            log_message(&format!("📡 Sending to web client {}", id), true);

            if let Err(e) = client.send(message.clone()) {
                error_count += 1;
                log_message(
                    &format!("❌ Failed to send message to web client {}: {:?}", id, e),
                    true,
                );
            } else {
                success_count += 1;
                log_message(&format!("✅ Message sent to web client {} successfully", id), true);
            }
        }
    }

    log_message(&format!("📊 Broadcast summary: {} total clients, {} web clients, {} success, {} errors",
                        total_clients, web_client_count, success_count, error_count), true);

    Ok(())
}

/// Notify all web clients that the data client is online
async fn notify_web_clients(
    message: &serde_json::Value,
    clients: &Clients,
) -> Result<(), Box<dyn Error>> {
    let client_id_str = match message.get("clientId").and_then(|id| id.as_str()) {
        Some(id) => {
            log_message(&format!("📢 Preparing notification for client: {}", id), true);
            id
        },
        None => {
            log_message(&format!("⚠️ No clientId in message for notification"), true);
            return Ok(());
        }
    };

    if client_id_str != T3000_DATA_CLIENT_ID {
        log_message(&format!("⚠️ Notification skipped - not from T3000 data client"), true);
        return Ok(());
    }

    let clients = clients.lock().unwrap();
    let notification = serde_json::json!({
      "action": ACTION_DATA_SERVER_ONLINE,
      "message": "Data server is online"
    });
    let message = Message::text(notification.to_string());

    log_message(&format!("📢 Broadcasting 'Data server online' notification..."), true);
    log_message(&format!("📋 Notification content: {}", notification), true);

    let total_clients = clients.len();
    let mut web_client_count = 0;
    let mut success_count = 0;

    for (id, client) in clients.iter() {
        if *id != Uuid::parse_str(T3000_DATA_CLIENT_ID)? {
            web_client_count += 1;
            log_message(&format!("📡 Notifying web client: {}", id), true);

            if let Err(e) = client.send(message.clone()) {
                log_message(
                    &format!("❌ Failed to send notification to web client {}: {:?}", id, e),
                    true,
                );
            } else {
                success_count += 1;
                log_message(&format!("✅ Notification sent to web client {} successfully", id), true);
            }
        }
    }

    log_message(&format!("📊 Notification summary: {} total clients, {} web clients, {} notified successfully",
                        total_clients, web_client_count, success_count), true);

    Ok(())
}

/// NON-INVASIVE: Intercept WebSocket messages for trend data collection
/// This function runs in parallel with existing message handling
async fn intercept_trend_data(json_msg: &serde_json::Value) {
    // Enhanced logging for trend data interception
    log_message(&format!("🔍 Intercepting message for trend data analysis..."), false);

    let message_size = json_msg.to_string().len();
    log_message(&format!("📊 Message size: {} bytes", message_size), false);

    // Check for action patterns that might indicate trend data
    if let Some(action) = json_msg.get("action") {
        if let Some(action_str) = action.as_str() {
            log_message(&format!("🔍 String action detected: {}", action_str), false);
            if action_str.contains("data") || action_str.contains("trend") || action_str.contains("value") ||
               action_str.contains("monitor") || action_str.contains("point") || action_str.contains("input") ||
               action_str.contains("output") || action_str.contains("variable") {
                log_message(&format!("🎯 Potential trend data action: {}", action_str), true);
            }
        } else if let Some(action_int) = action.as_i64() {
            log_message(&format!("🔍 Numeric action detected: {}", action_int), false);
            // Log specific action codes that might be related to data
            if action_int > 0 && action_int < 1000 {
                log_message(&format!("🎯 Potential data action code: {}", action_int), true);
            }
        }
    }

    // Check for specific trend data field patterns
    let mut data_fields_found = Vec::new();

    if json_msg.get("input").is_some() {
        data_fields_found.push("input");
    }
    if json_msg.get("output").is_some() {
        data_fields_found.push("output");
    }
    if json_msg.get("variable").is_some() {
        data_fields_found.push("variable");
    }
    if json_msg.get("points").is_some() {
        data_fields_found.push("points");
    }
    if json_msg.get("trend").is_some() {
        data_fields_found.push("trend");
    }
    if json_msg.get("monitor").is_some() {
        data_fields_found.push("monitor");
    }
    if json_msg.get("value").is_some() {
        data_fields_found.push("value");
    }
    if json_msg.get("data").is_some() {
        data_fields_found.push("data");
    }

    if !data_fields_found.is_empty() {
        log_message(&format!("🎯 Found potential point data fields: {:?}", data_fields_found), true);

        // Log sample of the data structure for debugging
        let data_sample = serde_json::json!({
            "detected_fields": data_fields_found,
            "message_keys": json_msg.as_object().map(|obj| obj.keys().collect::<Vec<_>>()),
            "timestamp": chrono::Utc::now().to_rfc3339()
        });
        log_message(&format!("📋 Data structure analysis: {}", data_sample), false);
    }

    // Check for nested message structures (common in T3000 protocol)
    if let Some(message) = json_msg.get("message") {
        log_message(&format!("🔍 Found nested message structure"), false);
        if let Some(nested_action) = message.get("action") {
            log_message(&format!("🔍 Nested action: {:?}", nested_action), false);
        }
    }

    // Check for client identification and data source info
    if let Some(client_id) = json_msg.get("clientId") {
        log_message(&format!("👤 Client ID in message: {:?}", client_id), false);
    }

    if let Some(from) = json_msg.get("from") {
        log_message(&format!("📍 Message source: {:?}", from), false);
    }
}
