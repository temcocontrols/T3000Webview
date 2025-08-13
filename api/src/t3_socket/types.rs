use std::sync::{Arc, Mutex};
use uuid::Uuid;
use tokio_tungstenite::tungstenite::protocol::Message;

/// Type alias for managing WebSocket clients
pub type Clients = Arc<Mutex<Vec<(Uuid, tokio::sync::mpsc::UnboundedSender<Message>)>>>;

/// Constants for T3000 WebSocket server
pub const WS_PORT: u16 = 9104;
pub const T3000_DATA_CLIENT_ID: &str = "11111111-1111-1111-1111-111111111111";

/// WebSocket message actions
pub const ACTION_BIND_CLIENT: i64 = 13;
pub const ACTION_DATA_SERVER_ONLINE: i64 = -1;
pub const ACTION_DATA_SERVER_DOWN: i64 = -2;

/// WebSocket configuration constants
pub const MAX_MESSAGE_SIZE: usize = 64 << 20; // 64 MB
pub const MAX_FRAME_SIZE: usize = 16 << 20;   // 16 MB
pub const CLIENT_STATUS_CHECK_INTERVAL: u64 = 10; // seconds
