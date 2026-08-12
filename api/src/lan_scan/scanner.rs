//! Async UDP broadcast scanner for T3000 device discovery.
//!
//! Port of the C++ `RefreshNetWorkDeviceListByUDPFunc()` from
//! `T3000-Source/T3000/global_function.cpp:9796`.
//!
//! For each local network adapter, binds a UDP socket, broadcasts a
//! 0x64 query to 255.255.255.255, and collects 0x65 responses for
//! up to `timeout_secs` seconds.

use std::collections::HashSet;
use std::net::{Ipv4Addr, SocketAddrV4};
use std::time::Duration;

use tokio::net::UdpSocket;
use tokio::time::timeout;

use super::protocol::{self, build_scan_query, SCAN_PORT_RANGE, RESPONSE_MSG, RESPONSE_TOTAL_SUB_INFO};
use super::types::{DiscoveredDevice, ScanResult};

/// Reuse the existing `get_all_local_ips()` from the SQL Server network scan module.
fn get_local_ips() -> Vec<String> {
    crate::server_db::network_scan::get_all_local_ips()
}

/// Scan the local network for T3000 devices via UDP broadcast.
///
/// * `timeout_secs` — how long to wait for responses after each broadcast (default: 8).
///
/// Returns a `ScanResult` with all discovered devices deduplicated by serial number.
pub async fn scan_network(timeout_secs: u64) -> ScanResult {
    let local_ips = get_local_ips();
    if local_ips.is_empty() {
        return ScanResult {
            devices: vec![],
            adapters_scanned: 0,
            local_ips: vec![],
            warnings: vec!["No local IP addresses found".into()],
        };
    }

    let mut all_devices: Vec<DiscoveredDevice> = Vec::new();
    let mut warnings: Vec<String> = Vec::new();
    let adapters_scanned = local_ips.len();

    let query = build_scan_query();
    let timeout_dur = Duration::from_secs(timeout_secs);

    for local_ip in &local_ips {
        match scan_on_adapter(local_ip, &query, timeout_dur).await {
            Ok(mut devices) => all_devices.append(&mut devices),
            Err(e) => warnings.push(format!("{}: {}", local_ip, e)),
        }
    }

    // Deduplicate by serial_number (mirrors C++ m_refresh_net_device_data dedup)
    let mut seen: HashSet<u32> = HashSet::new();
    let devices: Vec<DiscoveredDevice> = all_devices
        .into_iter()
        .filter(|d| seen.insert(d.serial_number))
        .collect();

    ScanResult {
        devices,
        adapters_scanned,
        local_ips,
        warnings,
    }
}

/// Scan on a single network adapter.
///
/// Mirrors the inner loop of C++ `RefreshNetWorkDeviceListByUDPFunc`:
/// bind → broadcast → select-like wait → recv loop.
async fn scan_on_adapter(
    local_ip: &str,
    query: &[u8; 5],
    timeout_dur: Duration,
) -> Result<Vec<DiscoveredDevice>, String> {
    let local_addr: Ipv4Addr = local_ip
        .parse()
        .map_err(|e| format!("invalid local IP '{}': {}", local_ip, e))?;

    let socket = bind_scan_port(local_addr)?;

    socket
        .set_broadcast(true)
        .map_err(|e| format!("set_broadcast failed: {}", e))?;

    let broadcast_target = SocketAddrV4::new(Ipv4Addr::new(255, 255, 255, 255), 57619);
    socket
        .send_to(query, broadcast_target)
        .await
        .map_err(|e| format!("send_to broadcast failed: {}", e))?;

    let mut devices: Vec<DiscoveredDevice> = Vec::new();
    let mut buf = [0u8; 512];
    let deadline = tokio::time::Instant::now() + timeout_dur;

    loop {
        let remaining = deadline.saturating_duration_since(tokio::time::Instant::now());
        if remaining.is_zero() {
            break;
        }

        match timeout(remaining, socket.recv_from(&mut buf)).await {
            Ok(Ok((n, _src))) => {
                if n == 0 {
                    continue;
                }
                match buf[0] {
                    RESPONSE_MSG => {
                        if let Some(dev) = protocol::parse_scan_response(&buf[..n]) {
                            devices.push(dev);
                        }
                    }
                    RESPONSE_TOTAL_SUB_INFO => {
                        // Phase 2: parse sub-device info. For now, skip.
                    }
                    _ => {}
                }
            }
            Ok(Err(_)) => break,
            Err(_elapsed) => break,
        }
    }

    Ok(devices)
}

/// Bind a UDP socket to one of the scan ports (57619-57623) on the given local IP.
///
/// Mirrors the C++ port-binding loop:
/// ```cpp
/// for (int i = 0; i < 5; i++) {
///     h_siBind.sin_port = htons(57619+i);
///     ret_bind = ::bind(h_Broad, ...);
///     if (ret_bind != 0) continue; else break;
/// }
/// ```
fn bind_scan_port(local_addr: Ipv4Addr) -> Result<UdpSocket, String> {
    for port in SCAN_PORT_RANGE {
        let bind_addr = SocketAddrV4::new(local_addr, port);
        match std::net::UdpSocket::bind(bind_addr) {
            Ok(s) => {
                s.set_broadcast(true).ok();
                s.set_nonblocking(true)
                    .map_err(|e| format!("set_nonblocking failed: {}", e))?;
                return UdpSocket::from_std(s)
                    .map_err(|e| format!("UdpSocket::from_std failed: {}", e));
            }
            Err(_) => continue,
        }
    }

    // Fallback: bind to port 0 (OS-assigned)
    let fallback = SocketAddrV4::new(local_addr, 0);
    let s = std::net::UdpSocket::bind(fallback)
        .map_err(|e| format!("fallback bind to {}:0 failed: {}", local_addr, e))?;
    s.set_broadcast(true).ok();
    s.set_nonblocking(true)
        .map_err(|e| format!("set_nonblocking failed: {}", e))?;
    UdpSocket::from_std(s)
        .map_err(|e| format!("UdpSocket::from_std failed: {}", e))
}
