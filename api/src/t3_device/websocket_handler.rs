// WebSocket handler for real-time T3000 data updates
// Broadcasts logging data updates to connected WebSocket clients

use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        State,
    },
    response::Response,
};
use futures::{sink::SinkExt, stream::StreamExt};
use serde_json::json;
use std::sync::Arc;
use tokio::sync::broadcast;
use tracing::debug;

use crate::app_state::AppState;
use crate::t3_device::t3000_ffi_sync_service;

/// WebSocket upgrade handler - converts HTTP connection to WebSocket
pub async fn websocket_handler(
    ws: WebSocketUpgrade,
    State(state): State<Arc<AppState>>,
) -> Response {
    // Use socket logger for WebSocket operations
    use crate::logger::ServiceLogger;
    let mut ws_logger = ServiceLogger::socket().unwrap_or_else(|_| ServiceLogger::new("fallback_socket").unwrap());
    ws_logger.info("WebSocket connection requested");
    ws.on_upgrade(|socket| handle_websocket(socket, state))
}

/// Handle individual WebSocket connection
async fn handle_websocket(socket: WebSocket, _state: Arc<AppState>) {
    use crate::logger::ServiceLogger;
    let mut ws_logger = ServiceLogger::socket().unwrap_or_else(|_| ServiceLogger::new("fallback_socket").unwrap());

    let (mut sender, mut receiver) = socket.split();

    ws_logger.info("WebSocket connection established");

    // Send welcome message
    let welcome_msg = json!({
        "type": "connection_established",
        "timestamp": chrono::Utc::now().to_rfc3339(),
        "message": "T3000 WebView real-time data connection established"
    });

    if sender.send(Message::Text(welcome_msg.to_string())).await.is_err() {
        ws_logger.warn("Failed to send welcome message to WebSocket client");
        return;
    }

    // Create broadcast receiver for logging data updates
    let mut logging_data_receiver = create_logging_data_receiver().await;

    // Spawn task to handle incoming WebSocket messages
    let mut recv_task = tokio::spawn(async move {
        while let Some(Ok(msg)) = receiver.next().await {
            if process_incoming_message(msg).await.is_err() {
                break;
            }
        }
    });

    // Main loop - broadcast logging data updates to client
    let mut send_task = tokio::spawn(async move {
        use crate::logger::ServiceLogger;
        let mut task_logger = ServiceLogger::socket().unwrap_or_else(|_| ServiceLogger::new("fallback_socket").unwrap());

        loop {
            // Receive logging data updates
            match logging_data_receiver.recv().await {
                Ok(update_msg) => {
                    if sender.send(Message::Text(update_msg)).await.is_err() {
                        task_logger.warn("Failed to send logging data update to WebSocket client");
                        break;
                    }
                }
                Err(_) => {
                    break;
                }
            }
        }
    });

    // Wait for either task to complete
    tokio::select! {
        result = &mut send_task => {
            recv_task.abort();
            if let Err(e) = result {
                ws_logger.warn(&format!("Send task failed: {:?}", e));
            }
        },
        result = &mut recv_task => {
            send_task.abort();
            if let Err(e) = result {
                ws_logger.warn(&format!("Receive task failed: {:?}", e));
            }
        }
    }

    ws_logger.info("WebSocket connection closed");
}

/// Create receiver for logging data updates
async fn create_logging_data_receiver() -> broadcast::Receiver<String> {
    // Try to get the logging service and its broadcast sender
    if let Some(_service) = t3000_ffi_sync_service::get_logging_service() {
        // For now, create a basic receiver that gets updates via a broadcast channel
        // In a full implementation, the service would have a broadcast sender
        let (tx, rx) = broadcast::channel(100);

        // TODO: Connect this to the actual logging service broadcast sender
        // This is a placeholder implementation
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(30));
            loop {
                interval.tick().await;
                let update_msg = json!({
                    "type": "periodic_update",
                    "timestamp": chrono::Utc::now().to_rfc3339(),
                    "message": "Periodic logging data update check"
                });

                let _ = tx.send(update_msg.to_string());
            }
        });

        rx
    } else {
        // Fallback: create empty receiver if service not available
        let (tx, rx) = broadcast::channel(1);
        drop(tx); // Close sender immediately
        rx
    }
}

/// Process incoming WebSocket messages from client
async fn process_incoming_message(msg: Message) -> Result<(), ()> {
    use crate::logger::ServiceLogger;
    let mut ws_logger = ServiceLogger::socket().unwrap_or_else(|_| ServiceLogger::new("fallback_socket").unwrap());

    match msg {
        Message::Text(text) => {
            // Try to parse as JSON command
            match serde_json::from_str::<serde_json::Value>(&text) {
                Ok(json) => {
                    if let Some(command) = json.get("command").and_then(|v| v.as_str()) {
                        handle_websocket_command(command, &json).await?;
                    }
                }
                Err(e) => {
                    ws_logger.warn(&format!("Failed to parse WebSocket message as JSON: {}", e));
                }
            }
        }
        Message::Binary(_) => {
            // Binary messages ignored
        }
        Message::Ping(_) => {
            // Pings handled automatically
        }
        Message::Pong(_) => {
            // Pongs handled automatically
        }
        Message::Close(_) => {
            ws_logger.info("WebSocket close message received");
            return Err(());
        }
    }

    Ok(())
}

/// Handle specific WebSocket commands from client
async fn handle_websocket_command(command: &str, _json: &serde_json::Value) -> Result<(), ()> {
    use crate::logger::ServiceLogger;
    let mut ws_logger = ServiceLogger::socket().unwrap_or_else(|_| ServiceLogger::new("fallback_socket").unwrap());

    match command {
        "request_sync" => {
            // Trigger immediate sync if service is available
            if let Some(service) = t3000_ffi_sync_service::get_logging_service() {
                tokio::spawn(async move {
                    use crate::logger::ServiceLogger;
                    let mut sync_logger = ServiceLogger::socket().unwrap_or_else(|_| ServiceLogger::new("fallback_socket").unwrap());

                    if let Err(e) = service.sync_once().await {
                        sync_logger.error(&format!("Failed to sync logging data on client request: {}", e));
                    } else {
                        sync_logger.info("Successfully completed client-requested logging data sync");
                    }
                });
            }
        }
        "subscribe_updates" => {
            // This is handled automatically by the connection
        }
        "unsubscribe_updates" => {
            // For now, just log - could implement selective broadcasting in the future
        }
        _ => {
            ws_logger.warn(&format!("Unknown WebSocket command: {}", command));
        }
    }

    Ok(())
}

/// Create WebSocket route for integration with Axum router
pub fn create_websocket_routes() -> axum::Router<Arc<crate::app_state::AppState>> {
    use axum::routing::get;

    axum::Router::new()
        .route("/ws/logging_data", get(websocket_handler))
}

/// Broadcast a message to all connected WebSocket clients
/// This is a utility function that can be called from the logging service
pub async fn broadcast_logging_update(message: String) {
    // TODO: Implement global WebSocket client management
    // For now, this is a placeholder that would need to be connected
    // to a global broadcast channel or client registry

    debug!("Broadcasting logging update: {}", message);
}
