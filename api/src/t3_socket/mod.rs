pub mod server;
pub mod client;
pub mod types;

pub use server::*;
pub use client::*;
pub use types::*;

use std::sync::{Arc, Mutex};

/// Create a new clients collection
pub fn create_clients() -> Clients {
    Arc::new(Mutex::new(Vec::new()))
}
