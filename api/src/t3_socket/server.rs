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
use crate::logger::{write_structured_log_with_level, LogLevel};
// use crate::t3_device::trend_collector::TrendDataCollector; // Temporarily disabled

/// Helper function to log WebSocket messages to both console and structured log file
fn log_socket_message(message: &str, level: LogLevel) {
    // Log to console for immediate debugging
    log_message(message, false);

    // Log to structured file with T3_Webview_Socket_MMDD_HHHH.txt pattern
    let _ = write_structured_log_with_level("T3_Webview_Socket", message, level);
}

/// Start the WebSocket service on port 9104
pub async fn start_websocket_service() -> Result<(), Box<dyn Error>> {
    log_socket_message("🚀 Initializing WebSocket Service on port 9104", LogLevel::Info);

    let clients = crate::t3_socket::create_clients();

    // Start the WebSocket server (blocking)
    start_websocket_server_blocking(clients).await;

    log_socket_message("✅ WebSocket Service started successfully on port 9104", LogLevel::Info);

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

    log_socket_message(
        &format!("🌐 WebSocket server listening on {:?}", ws_listener.local_addr()),
        LogLevel::Info
    );

    loop {
        match ws_listener.accept().await {
            Ok((socket, addr)) => {
                log_socket_message(&format!("🔗 New client connected: {:?}", addr), LogLevel::Info);
                log_socket_message(&format!("📡 Socket details: {:?}", socket), LogLevel::Info);

                let config = WebSocketConfig {
                    max_message_size: Some(MAX_MESSAGE_SIZE),
                    max_frame_size: Some(MAX_FRAME_SIZE),
                    ..Default::default()
                };

                let clients = clients.clone();
                tokio::spawn(async move {
                    if let Err(e) = handle_websocket(socket, clients, config.clone()).await {
                        log_socket_message(&format!("❌ WebSocket error: {:?}", e), LogLevel::Error);
                    }
                });
            }
            Err(e) => {
                log_socket_message(&format!("❌ Failed to accept connection: {:?}", e), LogLevel::Error);
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
    let peer_addr = stream.peer_addr()?;
    log_socket_message(&format!("🚀 Starting WebSocket handler for {}", peer_addr), LogLevel::Info);

    let ws_stream = match accept_hdr_async_with_config(
        stream,
        |_req: &Request, response: Response| {
            log_socket_message("📥 Received connection request", LogLevel::Info);
            Ok(response)
        },
        Some(config),
    )
    .await
    {
        Ok(ws) => {
            log_socket_message(&format!("✅ WebSocket handshake completed for {}", peer_addr), LogLevel::Info);
            ws
        },
        Err(e) => {
            log_socket_message(&format!("❌ Failed to accept websocket connection from {}: {:?}", peer_addr, e), LogLevel::Error);
            return Err(Box::new(e));
        }
    };

    let (mut write, mut read) = ws_stream.split();
    let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel();

    // Spawn task to handle outgoing messages
    let peer_addr_clone = peer_addr.clone();
    tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            log_socket_message(&format!("📤 Sending message to client {}: {:?}", peer_addr_clone, msg), LogLevel::Info);
            if let Err(e) = write.send(msg).await {
                log_socket_message(&format!("❌ Error sending message to client {}: {:?}", peer_addr_clone, e), LogLevel::Error);
                break;
            } else {
                log_socket_message(&format!("✅ Message sent successfully to {}", peer_addr_clone), LogLevel::Info);
            }
        }
        log_socket_message(&format!("📤 Outgoing message handler stopped for {}", peer_addr_clone), LogLevel::Info);
    });

    // Handle incoming messages
    log_socket_message(&format!("👂 Starting to listen for incoming messages from {}...", peer_addr), LogLevel::Info);
    while let Some(msg) = read.next().await {
        let msg = msg?;

        // ═══════════════════════════════════════════════════════════════════════════════════════
        log_socket_message("", LogLevel::Info);
        log_socket_message("🔄 ═══════════ NEW MESSAGE PROCESSING CYCLE ═══════════", LogLevel::Info);
        log_socket_message("", LogLevel::Info);

        // Log the frame size and message details
        let info_msg = msg.clone();
        let frame_size = info_msg.into_data().len();

        log_socket_message(&format!("📊 Received frame from {} - Size: {} bytes", peer_addr, frame_size), LogLevel::Info);

        if msg.is_text() || msg.is_binary() {
            // ─────────────────────────────────────────────────────────────────────
            log_socket_message("", LogLevel::Info);
            log_socket_message("📥 ────────── MESSAGE PARSING PHASE ──────────", LogLevel::Info);
            log_socket_message("", LogLevel::Info);

            let msg_text = msg.to_text()?;
            log_socket_message(&format!("📝 Message text content from {}: {}", peer_addr, msg_text), LogLevel::Info);

            let json_msg: serde_json::Value = match serde_json::from_str(msg_text) {
                Ok(json) => {
                    log_socket_message(&format!("✅ Successfully parsed JSON from {}", peer_addr), LogLevel::Info);
                    json
                },
                Err(e) => {
                    log_socket_message(
                        &format!("❌ Message with incorrect JSON format from {}: {} - Error: {:?}", peer_addr, msg_text, e),
                        LogLevel::Warn,
                    );
                    continue;
                }
            };

            // Handle message structure: {"header":{"clientId":"-","from":"Firefox"},"message":{"action":-1,"clientId":"..."}}
            if let Some(message) = json_msg.get("message") {
                // ─────────────────────────────────────────────────────────────────────
                log_socket_message("", LogLevel::Info);
                log_socket_message("🔧 ────────── STRUCTURED MESSAGE PROCESSING ──────────", LogLevel::Info);
                log_socket_message("", LogLevel::Info);

                log_socket_message(&format!("🔧 Processing structured message with header from {}", peer_addr), LogLevel::Info);

                // NON-INVASIVE: Intercept data for trend collection (preserves existing functionality)
                intercept_trend_data(&json_msg, &peer_addr).await;

                if let Some(action) = message.get("action").and_then(|a| a.as_i64()) {
                    log_socket_message(&format!("⚡ Processing action {} from {}", action, peer_addr), LogLevel::Info);

                    if action == ACTION_BIND_CLIENT {
                        // ═════════════════════════════════════════════════════════════════
                        log_socket_message("", LogLevel::Info);
                        log_socket_message("🔗 ═══════ CLIENT BINDING PROCESS ═══════", LogLevel::Info);
                        log_socket_message("", LogLevel::Info);

                        log_socket_message(&format!("🔗 Binding client from {}...", peer_addr), LogLevel::Info);
                        bind_clients(message, &clients, &tx).await?;
                        log_socket_message(&format!("✅ Client from {} bound successfully", peer_addr), LogLevel::Info);

                        sleep(Duration::from_secs(1)).await;

                        // ─────────────────────────────────────────────────────────────────
                        log_socket_message("", LogLevel::Info);
                        log_socket_message("📢 ─────── WEB CLIENT NOTIFICATION PROCESS ───────", LogLevel::Info);
                        log_socket_message("", LogLevel::Info);

                        log_socket_message(&format!("📢 Notifying web clients about {} connection...", peer_addr), LogLevel::Info);
                        if let Err(e) = notify_web_clients(message, &clients).await {
                            log_socket_message(&format!("❌ Failed to notify web clients about {}: {:?}", peer_addr, e), LogLevel::Error);
                        } else {
                            log_socket_message(&format!("✅ Web clients notified about {} successfully", peer_addr), LogLevel::Info);
                        }

                        // ─────────────────────────────────────────────────────────────────
                        log_socket_message("", LogLevel::Info);
                        log_socket_message("🔗 ═════ CLIENT BINDING COMPLETE ═════", LogLevel::Info);
                        log_socket_message("", LogLevel::Info);
                    } else {
                        // ═════════════════════════════════════════════════════════════════
                        log_socket_message("", LogLevel::Info);
                        log_socket_message("📡 ═══════ MESSAGE FORWARDING PROCESS ═══════", LogLevel::Info);
                        log_socket_message("", LogLevel::Info);

                        log_socket_message(&format!("📡 Forwarding message from {} to data client...", peer_addr), LogLevel::Info);
                        if let Err(e) = send_message_to_data_client(message, &clients).await {
                            log_socket_message(&format!("❌ Failed to send message from {} to data client: {:?}", peer_addr, e), LogLevel::Error);
                        } else {
                            log_socket_message(&format!("✅ Message from {} forwarded to data client", peer_addr), LogLevel::Info);
                        }

                        // ─────────────────────────────────────────────────────────────────
                        log_socket_message("", LogLevel::Info);
                        log_socket_message("📡 ═════ MESSAGE FORWARDING COMPLETE ═════", LogLevel::Info);
                        log_socket_message("", LogLevel::Info);
                    }
                } else {
                    log_socket_message(&format!("⚠️ Message from {} has no valid action field", peer_addr), LogLevel::Warn);
                }
            } else {
                // ─────────────────────────────────────────────────────────────────────
                log_socket_message("", LogLevel::Info);
                log_socket_message("🔧 ────────── DIRECT MESSAGE PROCESSING ──────────", LogLevel::Info);
                log_socket_message("", LogLevel::Info);

                log_socket_message(&format!("🔧 Processing direct message (no header) from {}", peer_addr), LogLevel::Info);

                // NON-INVASIVE: Intercept data for trend collection (preserves existing functionality)
                intercept_trend_data(&json_msg, &peer_addr).await;

                // Handle direct messages and transfer processed data back to web clients
                if let Some(action) = json_msg.get("action") {
                    // ═════════════════════════════════════════════════════════════════
                    log_socket_message("", LogLevel::Info);
                    log_socket_message("📤 ═══════ WEB CLIENT DATA RESPONSE ═══════", LogLevel::Info);
                    log_socket_message("", LogLevel::Info);

                    log_socket_message(&format!("📤 Sending processed data back to web client from {}", peer_addr), LogLevel::Info);

                    if let Some(action_int) = action.as_i64() {
                        log_socket_message(&format!("⚡ Processing integer action {} from {}", action_int, peer_addr), LogLevel::Info);
                        // Handle action as an integer
                        if action_int != ACTION_BIND_CLIENT {
                            if let Err(e) = send_data_to_web_client(msg.clone(), &clients).await {
                                log_socket_message(&format!("❌ Failed to send data to web client from {}: {:?}", peer_addr, e), LogLevel::Error);
                            } else {
                                log_socket_message(&format!("✅ Data from {} sent to web client successfully", peer_addr), LogLevel::Info);
                            }
                        }
                    } else if let Some(action_str) = action.as_str() {
                        log_socket_message(&format!("⚡ Processing string action '{}' from {}", action_str, peer_addr), LogLevel::Info);
                        // Handle action as a string
                        if let Err(e) = send_data_to_web_client(msg.clone(), &clients).await {
                            log_socket_message(&format!("❌ Failed to send data to web client from {}: {:?}", peer_addr, e), LogLevel::Error);
                        } else {
                            log_socket_message(&format!("✅ Data from {} sent to web client successfully", peer_addr), LogLevel::Info);
                        }
                    } else {
                        log_socket_message(&format!("⚠️ Action from {} is neither an integer nor a string", peer_addr), LogLevel::Warn);
                    }

                    // ─────────────────────────────────────────────────────────────────
                    log_socket_message("", LogLevel::Info);
                    log_socket_message("📤 ═════ WEB CLIENT DATA RESPONSE COMPLETE ═════", LogLevel::Info);
                    log_socket_message("", LogLevel::Info);
                } else {
                    log_socket_message(&format!("⚠️ Direct message from {} has no action field", peer_addr), LogLevel::Warn);
                }
            }
        } else if msg.is_close() {
            log_socket_message(&format!("🔚 Client {} sent close message", peer_addr), LogLevel::Info);
            break;
        } else {
            log_socket_message(&format!("⚠️ Received non-text/non-binary message from {}: {:?}", peer_addr, msg), LogLevel::Warn);
        }

        // ═══════════════════════════════════════════════════════════════════════════════════════
        log_socket_message("", LogLevel::Info);
        log_socket_message("🔄 ═════════ MESSAGE PROCESSING CYCLE COMPLETE ═════════", LogLevel::Info);
        log_socket_message("", LogLevel::Info);
    }

    log_socket_message(&format!("🔚 WebSocket connection from {} closed - stopped listening for messages", peer_addr), LogLevel::Info);
    Ok(())
}

/// Bind client IDs to WebSocket sessions
async fn bind_clients(
    message: &serde_json::Value,
    clients: &Clients,
    tx: &tokio::sync::mpsc::UnboundedSender<Message>,
) -> Result<(), Box<dyn Error>> {
    if let Some(client_id_str) = message.get("clientId").and_then(|id| id.as_str()) {
        log_socket_message(&format!("🔗 Binding client ID: {}", client_id_str), LogLevel::Info);

        let mut clients = clients.lock().unwrap();
        let client_count_before = clients.len();

        if client_id_str == T3000_DATA_CLIENT_ID {
            log_socket_message("🔄 Removing existing T3000 data client", LogLevel::Info);
            clients.retain(|(id, _)| {
                *id != Uuid::parse_str(T3000_DATA_CLIENT_ID).unwrap()
            });
        }

        let client_id = Uuid::parse_str(client_id_str)?;
        clients.push((client_id, tx.clone()));

        let client_count_after = clients.len();
        log_socket_message(&format!("👥 Client count: {} → {}", client_count_before, client_count_after), LogLevel::Info);
        log_socket_message(&format!("✅ Client {} bound successfully", client_id_str), LogLevel::Info);
    } else {
        log_socket_message("⚠️ No clientId found in bind message", LogLevel::Warn);
    }
    Ok(())
}

/// Send message to T3000 data client
async fn send_message_to_data_client(
    message: &serde_json::Value,
    clients: &Clients,
) -> Result<(), Box<dyn Error>> {
    log_socket_message("📡 Looking for T3000 data client...", LogLevel::Info);

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
async fn intercept_trend_data(json_msg: &serde_json::Value, peer_addr: &std::net::SocketAddr) {
    log_socket_message(&format!("🔍 Intercepting message from {} for trend data analysis...", peer_addr), LogLevel::Info);

    let message_size = json_msg.to_string().len();
    log_socket_message(&format!("📊 Message size from {}: {} bytes", peer_addr, message_size), LogLevel::Info);

    // Check for action patterns that might indicate trend data
    if let Some(action) = json_msg.get("action") {
        if let Some(action_str) = action.as_str() {
            log_socket_message(&format!("🔍 String action detected from {}: {}", peer_addr, action_str), LogLevel::Info);
            if action_str.contains("data") || action_str.contains("trend") || action_str.contains("value") ||
               action_str.contains("monitor") || action_str.contains("point") || action_str.contains("input") ||
               action_str.contains("output") || action_str.contains("variable") {
                log_socket_message(&format!("🎯 Potential trend data action from {}: {}", peer_addr, action_str), LogLevel::Info);
            }
        } else if let Some(action_int) = action.as_i64() {
            log_socket_message(&format!("🔍 Numeric action detected from {}: {}", peer_addr, action_int), LogLevel::Info);
            // Log specific action codes that might be related to data
            if action_int > 0 && action_int < 1000 {
                log_socket_message(&format!("🎯 Potential data action code from {}: {}", peer_addr, action_int), LogLevel::Info);
            }
        }
    }

    // Check for specific trend data field patterns
    let mut data_fields_found = Vec::new();

    if json_msg.get("input").is_some() { data_fields_found.push("input"); }
    if json_msg.get("output").is_some() { data_fields_found.push("output"); }
    if json_msg.get("variable").is_some() { data_fields_found.push("variable"); }
    if json_msg.get("points").is_some() { data_fields_found.push("points"); }
    if json_msg.get("trend").is_some() { data_fields_found.push("trend"); }
    if json_msg.get("monitor").is_some() { data_fields_found.push("monitor"); }
    if json_msg.get("value").is_some() { data_fields_found.push("value"); }
    if json_msg.get("data").is_some() { data_fields_found.push("data"); }

    if !data_fields_found.is_empty() {
        log_socket_message(&format!("🎯 Found potential point data fields from {}: {:?}", peer_addr, data_fields_found), LogLevel::Info);

    }

    // Check for nested message structures (common in T3000 protocol)
    if let Some(message) = json_msg.get("message") {
        log_socket_message(&format!("🔍 Found nested message structure from {}", peer_addr), LogLevel::Info);
        if let Some(nested_action) = message.get("action") {
            log_socket_message(&format!("🔍 Nested action from {}: {:?}", peer_addr, nested_action), LogLevel::Info);
        }
    }

    // Check for client identification and data source info
    if let Some(client_id) = json_msg.get("clientId") {
        log_socket_message(&format!("👤 Client ID in message from {}: {:?}", peer_addr, client_id), LogLevel::Info);
    }

    if let Some(from) = json_msg.get("from") {
        log_socket_message(&format!("📍 Message source from {}: {:?}", peer_addr, from), LogLevel::Info);
    }
}
