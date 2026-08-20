//! LAN Scan — pure-Rust UDP broadcast scanner for T3000 devices.
//!
//! Implements the 20-year-old T3000 0x64/0x65 UDP scan protocol.
//! Port of `RefreshNetWorkDeviceListByUDPFunc()` from the C++ codebase.
//!
//! ## Usage
//!
//! ```rust,ignore
//! use lan_scan::scanner::scan_network;
//!
//! let result = scan_network(8).await;  // 8-second timeout per adapter
//! println!("Found {} devices", result.devices.len());
//! ```

pub mod protocol;
pub mod scanner;
pub mod types;
