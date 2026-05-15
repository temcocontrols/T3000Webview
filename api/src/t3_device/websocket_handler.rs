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
use crate::t3_device::t3_ffi_sync_service;
use crate::logging::service::emit_app_log;

/// WebSocket upgrade handler - converts HTTP connection to WebSocket
pub async fn websocket_handler(
    ws: WebSocketUpgrade,
    State(state): State<Arc<AppState>>,
) -> Response {
    if let Ok(db) = state.conn.try_lock() {
        emit_app_log(&*db, "info", "WEBSOCKET", Some("websocket_handler"), None, "WebSocket connection requested", None).await;
    }
    ws.on_upgrade(|socket| handle_websocket(socket, state))
}

/// Handle individual WebSocket connection
async fn handle_websocket(socket: WebSocket, state: Arc<AppState>) {
    let (mut sender, mut receiver) = socket.split();

    if let Ok(db) = state.conn.try_lock() {
        emit_app_log(&*db, "info", "WEBSOCKET", Some("websocket_handler"), None, "WebSocket connection established", None).await;
    }
    {
        let db = state.conn.lock().await;
        emit_app_log(&*db, "info", "WEBSOCKET", Some("websocket_handler"), None,
            "WebSocket client connected", None).await;
    }

    // Send welcome message
    let welcome_msg = json!({
        "type": "connection_established",
        "timestamp": chrono::Utc::now().to_rfc3339(),
        "message": "T3000 WebView real-time data connection established"
    });

    if sender.send(Message::Text(welcome_msg.to_string())).await.is_err() {
        let db = state.conn.lock().await;
        emit_app_log(&*db, "warn", "WEBSOCKET", Some("websocket_handler"), None, "Failed to send welcome message to WebSocket client", None).await;
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
    let state_for_send = state.clone();
    let mut send_task = tokio::spawn(async move {
        loop {
            // Receive logging data updates
            match logging_data_receiver.recv().await {
                Ok(update_msg) => {
                    if sender.send(Message::Text(update_msg)).await.is_err() {
                        if let Ok(db) = state_for_send.conn.try_lock() {
                            emit_app_log(&*db, "warn", "WEBSOCKET", Some("websocket_handler"), None, "Failed to send logging data update to WebSocket client", None).await;
                        }
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
                let db = state.conn.lock().await;
                emit_app_log(&*db, "warn", "WEBSOCKET", Some("websocket_handler"), None, &format!("Send task failed: {:?}", e), None).await;
            }
        },
        result = &mut recv_task => {
            send_task.abort();
            if let Err(e) = result {
                let db = state.conn.lock().await;
                emit_app_log(&*db, "warn", "WEBSOCKET", Some("websocket_handler"), None, &format!("Receive task failed: {:?}", e), None).await;
            }
        }
    }

    {
        let db = state.conn.lock().await;
        emit_app_log(&*db, "info", "WEBSOCKET", Some("websocket_handler"), None, "WebSocket connection closed", None).await;
    }
    {
        let db = state.conn.lock().await;
        emit_app_log(&*db, "info", "WEBSOCKET", Some("websocket_handler"), None,
            "WebSocket client disconnected", None).await;
    }
}

/// Create receiver for logging data updates
async fn create_logging_data_receiver() -> broadcast::Receiver<String> {
    // Try to get the logging service and its broadcast sender
    if let Some(_service) = t3_ffi_sync_service::get_logging_service() {
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
                    let _ = e;
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
            // close handled by caller
            return Err(());
        }
    }

    Ok(())
}

/// Handle specific WebSocket commands from client
async fn handle_websocket_command(command: &str, _json: &serde_json::Value) -> Result<(), ()> {
    match command {
        "request_sync" => {
            // Trigger immediate sync if service is available
            if let Some(service) = t3_ffi_sync_service::get_logging_service() {
                tokio::spawn(async move {
                    if let Err(e) = service.sync_once().await {
                        let _ = e;
                    } else {
                        // success handled by sync service itself
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
            let _ = command;
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
