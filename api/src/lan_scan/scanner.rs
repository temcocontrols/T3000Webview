//! Async UDP broadcast scanner for T3000 device discovery.
//!
//! Port of the C++ `RefreshNetWorkDeviceListByUDPFunc()` from
//! `T3000-Source/T3000/global_function.cpp:9796`.
//!
//! For each local network adapter, binds a UDP socket, broadcasts a
//! 0x64 query to 255.255.255.255, and collects 0x65 responses for
//! up to `timeout_secs` seconds.

use std::collections::HashSet;
use std::net::{Ipv4Addr, SocketAddrV4, UdpSocket as StdUdpSocket};
use std::time::Duration;

use tokio::net::UdpSocket;
use tokio::time::timeout;

use super::protocol::{self, build_scan_query, SCAN_PORT_RANGE, RESPONSE_MSG, RESPONSE_TOTAL_SUB_INFO};
use super::types::{DiscoveredDevice, ScanResult};

/// Mirrors C++ `ALL_LOCAL_SUBNET_NODE` from `global_struct.h`:
/// ```cpp
/// struct ALL_LOCAL_SUBNET_NODE {
///     CString StrIP;
///     CString StrMask;
///     CString StrGetway;
///     int NetworkCardType;
/// };
/// ```
#[derive(Debug, Clone)]
struct LocalSubnetNode {
    ip: String,         // ↔ StrIP
    mask: String,       // ↔ StrMask
    gateway: String,    // ↔ StrGetway
}

/// Mirrors C++ `GetIPMaskGetWay()` — enumerates all IPv4 adapters with
/// IP, subnet mask, and gateway. Populates the equivalent of `g_Vector_Subnet`.
fn get_ip_mask_gateway() -> Vec<LocalSubnetNode> {
    let mut nodes = Vec::new();

    #[cfg(target_os = "windows")]
    {
        if let Ok(output) = std::process::Command::new("ipconfig").arg("/all").output() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            let mut current_ip: Option<String> = None;
            let mut current_mask: Option<String> = None;
            let mut current_gw: Option<String> = None;

            for line in stdout.lines() {
                let line = line.trim();
                if line.contains("IPv4") && !line.contains("IPv6") {
                    if let Some(v) = line.rsplit(':').next().map(|s| s.trim().to_string()) {
                        if v.parse::<Ipv4Addr>().is_ok() && !v.starts_with("127.") {
                            if let (Some(ip), Some(mask)) = (current_ip.take(), current_mask.take()) {
                                if !ip.starts_with("169.254.") {
                                    nodes.push(LocalSubnetNode { ip, mask, gateway: current_gw.take().unwrap_or_default() });
                                }
                            }
                            current_ip = Some(v);
                        }
                    }
                }
                if line.contains("Subnet Mask") {
                    if let Some(v) = line.rsplit(':').next().map(|s| s.trim().to_string()) {
                        current_mask = Some(v);
                    }
                }
                if line.contains("Default Gateway") {
                    if let Some(v) = line.rsplit(':').next().map(|s| s.trim().to_string()) {
                        if v != "0.0.0.0" && !v.is_empty() { current_gw = Some(v); }
                    }
                }
            }
            if let (Some(ip), Some(mask)) = (current_ip.take(), current_mask.take()) {
                if !ip.starts_with("169.254.") {
                    nodes.push(LocalSubnetNode { ip, mask, gateway: current_gw.take().unwrap_or_default() });
                }
            }
        }
    }

    if nodes.is_empty() {
        if let Ok(socket) = StdUdpSocket::bind("0.0.0.0:0") {
            if socket.connect("8.8.8.8:80").is_ok() {
                if let Ok(addr) = socket.local_addr() {
                    let ip = addr.ip().to_string();
                    if !ip.starts_with("127.") {
                        nodes.push(LocalSubnetNode { ip, mask: String::new(), gateway: String::new() });
                    }
                }
            }
        }
    }
    nodes
}

/// Extract IPs from adapter nodes for scanning.
fn get_local_ips() -> Vec<String> {
    get_ip_mask_gateway().into_iter().map(|n| n.ip).collect()
}

/// Scan the local network for T3000 devices via UDP broadcast.
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

    let mut seen: HashSet<u32> = HashSet::new();
    let devices: Vec<DiscoveredDevice> = all_devices
        .into_iter()
        .filter(|d| seen.insert(d.serial_number))
        .collect();

    ScanResult { devices, adapters_scanned, local_ips, warnings }
}

async fn scan_on_adapter(
    local_ip: &str,
    query: &[u8; 5],
    timeout_dur: Duration,
) -> Result<Vec<DiscoveredDevice>, String> {
    let local_addr: Ipv4Addr = local_ip.parse().map_err(|e| format!("invalid local IP '{}': {}", local_ip, e))?;
    let socket = bind_scan_port(local_addr)?;
    socket.set_broadcast(true).map_err(|e| format!("set_broadcast failed: {}", e))?;

    let broadcast_target = SocketAddrV4::new(Ipv4Addr::new(255, 255, 255, 255), 57619);
    socket.send_to(query, broadcast_target).await.map_err(|e| format!("send_to broadcast failed: {}", e))?;

    let mut devices: Vec<DiscoveredDevice> = Vec::new();
    let mut buf = [0u8; 512];
    let deadline = tokio::time::Instant::now() + timeout_dur;

    loop {
        let remaining = deadline.saturating_duration_since(tokio::time::Instant::now());
        if remaining.is_zero() { break; }

        match timeout(remaining, socket.recv_from(&mut buf)).await {
            Ok(Ok((n, _src))) => {
                if n == 0 { continue; }
                match buf[0] {
                    RESPONSE_MSG => {
                        if let Some(dev) = protocol::parse_scan_response(&buf[..n]) {
                            devices.push(dev);
                        }
                    }
                    RESPONSE_TOTAL_SUB_INFO => {
                        // Phase 2: store sub-device info
                        let _ = protocol::parse_sub_device_info(&buf[..n]);
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

fn bind_scan_port(local_addr: Ipv4Addr) -> Result<UdpSocket, String> {
    for port in SCAN_PORT_RANGE {
        let bind_addr = SocketAddrV4::new(local_addr, port);
        match std::net::UdpSocket::bind(bind_addr) {
            Ok(s) => {
                s.set_broadcast(true).ok();
                s.set_nonblocking(true).map_err(|e| format!("set_nonblocking failed: {}", e))?;
                return UdpSocket::from_std(s).map_err(|e| format!("UdpSocket::from_std failed: {}", e));
            }
            Err(_) => continue,
        }
    }
    let fallback = SocketAddrV4::new(local_addr, 0);
    let s = std::net::UdpSocket::bind(fallback).map_err(|e| format!("fallback bind failed: {}", e))?;
    s.set_broadcast(true).ok();
    s.set_nonblocking(true).map_err(|e| format!("set_nonblocking failed: {}", e))?;
    UdpSocket::from_std(s).map_err(|e| format!("UdpSocket::from_std failed: {}", e))
}