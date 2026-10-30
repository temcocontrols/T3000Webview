//! Async UDP broadcast scanner for T3000 device discovery.
//!
//! Port of the C++ `RefreshNetWorkDeviceListByUDPFunc()` from
//! `T3000_Building_Automation_System/T3000/global_function.cpp:9887`.
//!
//! For each local network adapter, binds a UDP socket, broadcasts a
//! 0x64 query to 255.255.255.255, and collects 0x65 responses.

use std::collections::HashSet;
use std::net::{Ipv4Addr, SocketAddrV4};
#[cfg(not(target_os = "windows"))]
use std::net::UdpSocket as StdUdpSocket;
use std::time::Duration;

use tokio::net::UdpSocket;
use tokio::time::timeout;

/// Silence after the last reply that ends the wait on one adapter.
///
/// The C++ re-arms an 8 s `select` after *every* packet, i.e. it really waits
/// for "8 s of silence". A LAN device answers a broadcast in well under a
/// millisecond, so a short quiet window gives the same answer set ~10x faster.
const QUIET_WINDOW: Duration = Duration::from_millis(700);

/// How long to wait for the *first* reply on an adapter before giving up.
///
/// A device that misses this window is picked up by the next scan; offline
/// marking is debounced (`OFFLINE_GRACE_SECS` in the device service), so a
/// missed reply never flips a live device to offline.
const FIRST_REPLY_WAIT: Duration = Duration::from_millis(2000);

/// Re-broadcast interval while listening.
///
/// One broadcast can be dropped — a device that misses it stays invisible until
/// the next periodic scan. Re-sending the 5-byte query a couple of times costs
/// nothing and makes discovery deterministic.
const RESEND_INTERVAL: Duration = Duration::from_millis(250);

/// Only re-broadcast during this window after the first query.
///
/// Re-sending must stop early: every reply extends the quiet window, so an
/// unbounded resend loop would keep pushing the deadline out to the hard cap.
const RESEND_PHASE: Duration = Duration::from_millis(600);

use super::protocol::{self, build_scan_query, BROADCAST_DEST_PORT, SCAN_PORT_RANGE, RESPONSE_MSG};
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

/// Mirrors C++ `GetIPMaskGetWay()` — enumerates every IPv4 adapter with its
/// mask and gateway (populates the equivalent of `g_Vector_Subnet`).
///
/// Uses the Win32 IP Helper API, like the C++ does. Parsing `ipconfig /all`
/// was locale-dependent: the `Subnet Mask` label is localized on non-English
/// Windows, so every adapter was dropped and the scan silently fell back to a
/// single interface — devices on any other NIC were never found.
#[cfg(target_os = "windows")]
fn get_ip_mask_gateway() -> Vec<LocalSubnetNode> {
    use std::os::raw::c_char;
    use winapi::um::iphlpapi::GetAdaptersInfo;
    use winapi::um::iptypes::{IP_ADAPTER_INFO};

    fn fixed_string(text: &[c_char]) -> String {
        let bytes: Vec<u8> = text.iter().map(|&c| c as u8).take_while(|&b| b != 0).collect();
        String::from_utf8_lossy(&bytes).trim().to_string()
    }

    let mut nodes = Vec::new();

    unsafe {
        // First call only reports the required buffer size.
        let mut size: u32 = 0;
        GetAdaptersInfo(std::ptr::null_mut(), &mut size);
        if size == 0 {
            tracing::warn!("[lan_scan] GetAdaptersInfo reported no adapters");
            return nodes;
        }

        // IP_ADAPTER_INFO contains pointers, so the buffer must be word aligned.
        let words = (size as usize + std::mem::size_of::<u64>() - 1) / std::mem::size_of::<u64>();
        let mut buf: Vec<u64> = vec![0; words];

        if GetAdaptersInfo(buf.as_mut_ptr() as *mut IP_ADAPTER_INFO, &mut size) != 0 {
            tracing::warn!(
                "[lan_scan] GetAdaptersInfo failed: {}",
                std::io::Error::last_os_error()
            );
            return nodes;
        }

        let mut cur = buf.as_ptr() as *const IP_ADAPTER_INFO;
        while !cur.is_null() {
            let adapter = &*cur;
            let ip = fixed_string(&adapter.IpAddressList.IpAddress.String);
            let mask = fixed_string(&adapter.IpAddressList.IpMask.String);
            let gateway = fixed_string(&adapter.GatewayList.IpAddress.String);

            // Loopback and APIPA (169.254.x.x) adapters cannot reach devices.
            if !ip.is_empty()
                && ip != "0.0.0.0"
                && !ip.starts_with("127.")
                && !ip.starts_with("169.254.")
            {
                nodes.push(LocalSubnetNode { ip, mask, gateway });
            }

            cur = adapter.Next;
        }
    }

    nodes
}

#[cfg(not(target_os = "windows"))]
fn get_ip_mask_gateway() -> Vec<LocalSubnetNode> {
    let mut nodes = Vec::new();
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
    nodes
}

/// Scan the local network for T3000 devices via UDP broadcast.
pub async fn scan_network(timeout_secs: u64) -> ScanResult {
    let nodes = get_ip_mask_gateway();
    let local_ips: Vec<String> = nodes.iter().map(|n| n.ip.clone()).collect();
    if local_ips.is_empty() {
        return ScanResult {
            devices: vec![],
            adapters_scanned: 0,
            local_ips: vec![],
            warnings: vec!["No local IP addresses found".into()],
        };
    }

    for node in &nodes {
        tracing::info!(
            "[lan_scan] adapter {} mask {} gateway {}",
            node.ip,
            if node.mask.is_empty() { "-" } else { &node.mask },
            if node.gateway.is_empty() { "-" } else { &node.gateway }
        );
    }

    let query = build_scan_query();
    let adapters_scanned = local_ips.len();

    // One task per adapter. The C++ sweeps them sequentially only because it
    // reuses a single global socket handle; distinct local-IP binds are
    // independent, so running them at once turns `timeout x N` into `timeout`.
    let mut tasks = tokio::task::JoinSet::new();
    for ip in &local_ips {
        let ip = ip.clone();
        let q = query;
        tasks.spawn(async move {
            let result = scan_on_adapter(&ip, &q, timeout_secs).await;
            (ip, result)
        });
    }

    let mut all_devices: Vec<DiscoveredDevice> = Vec::new();
    let mut warnings: Vec<String> = Vec::new();

    while let Some(joined) = tasks.join_next().await {
        match joined {
            Ok((_ip, Ok(mut devices))) => all_devices.append(&mut devices),
            Ok((ip, Err(e))) => warnings.push(format!("{}: {}", ip, e)),
            Err(_) => warnings.push("adapter scan task panicked".into()),
        }
    }

    let mut seen: HashSet<u32> = HashSet::new();
    let devices: Vec<DiscoveredDevice> = all_devices
        .into_iter()
        .filter(|d| seen.insert(d.serial_number))
        .collect();

    ScanResult { devices, adapters_scanned, local_ips, warnings }
}

/// Broadcast the query on one adapter and collect replies until the line goes
/// quiet.
///
/// `timeout_secs` is a hard cap only: the wait ends as soon as replies stop
/// arriving (`QUIET_WINDOW`), or after `FIRST_REPLY_WAIT` when nothing answers
/// at all. The query is re-broadcast every `RESEND_INTERVAL` meanwhile, because
/// a single dropped broadcast would otherwise hide a device until the next scan.
async fn scan_on_adapter(
    local_ip: &str,
    query: &[u8; 5],
    timeout_secs: u64,
) -> Result<Vec<DiscoveredDevice>, String> {
    let local_addr: Ipv4Addr = local_ip.parse().map_err(|e| format!("invalid local IP '{}': {}", local_ip, e))?;
    let socket = bind_scan_port(local_addr)?;
    socket.set_broadcast(true).map_err(|e| format!("set_broadcast failed: {}", e))?;

    let broadcast_target = SocketAddrV4::new(Ipv4Addr::new(255, 255, 255, 255), BROADCAST_DEST_PORT);
    tracing::info!("[lan_scan] {} sending query to {}", local_ip, broadcast_target);

    let mut devices: Vec<DiscoveredDevice> = Vec::new();
    let mut buf = [0u8; 512];
    let started = tokio::time::Instant::now();
    let cap = started + Duration::from_secs(timeout_secs.max(1));
    let mut last_reply: Option<tokio::time::Instant> = None;
    let mut next_send = started;
    let mut packet_count = 0u32;
    let mut send_count = 0u32;

    loop {
        let now = tokio::time::Instant::now();

        // Stop once the line has been quiet, or when nothing ever answered.
        let stop_at = match last_reply {
            Some(at) => (at + QUIET_WINDOW).min(cap),
            None => (started + FIRST_REPLY_WAIT).min(cap),
        };
        if now >= stop_at { break; }

        if now >= next_send && now < started + RESEND_PHASE {
            if socket.send_to(query, broadcast_target).await.is_ok() {
                send_count += 1;
            }
            next_send = now + RESEND_INTERVAL;
        }

        // Sleep straight through to the stop point once the resend phase is over.
        let until = if now < started + RESEND_PHASE {
            next_send.min(stop_at)
        } else {
            stop_at
        };
        let wait = until.saturating_duration_since(now).max(Duration::from_millis(1));

        match timeout(wait, socket.recv_from(&mut buf)).await {
            Ok(Ok((n, _src))) => {
                if n == 0 { continue; }
                packet_count += 1;
                last_reply = Some(tokio::time::Instant::now());
                if buf[0] == RESPONSE_MSG {
                    if let Some(dev) = protocol::parse_scan_response(&buf[..n]) {
                        // Each of our queries is answered by every device, so the
                        // same serial arrives several times.
                        if !devices.iter().any(|d| d.serial_number == dev.serial_number) {
                            tracing::info!("[lan_scan] {} found SN={} PID={} IP={} name={}", local_ip, dev.serial_number, dev.product_id, dev.ip_address, dev.panel_name);
                            devices.push(dev);
                        }
                    } else {
                        tracing::debug!("[lan_scan] {} parse failed for {}B response", local_ip, n);
                    }
                }
            }
            Ok(Err(_)) => break,
            Err(_elapsed) => continue,
        }
    }
    tracing::info!(
        "[lan_scan] {} scan done: {} query(s), {} packet(s), {} devices found",
        local_ip, send_count, packet_count, devices.len()
    );
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

/// Run a full device discovery pass mirroring the C++ `CTStatScanner::ScanAll()`:
///
/// 1. UDP network scan (0x64/0x65 broadcast) — already-existing LAN discovery
/// 2. Serial COM/USB Modbus RTU scan — devices on RS485/USB virtual COM ports
/// 3. Modbus TCP sub-port scan — devices behind Minipanel/CM5 down-expansion ports
///
/// Returns the merged device list, plus per-scan metadata.
pub async fn scan_all(timeout_secs: u64) -> FullScanResult {
    let udp = scan_network(timeout_secs).await;

    let mut all: Vec<DiscoveredDevice> = udp.devices.clone();

    // Parents for the TCP sub-port scan (from UDP results).
    let parents: Vec<DiscoveredDevice> = udp
        .devices
        .iter()
        .filter(|d| super::tcp_sub::supports_sub_ports(d.product_id))
        .cloned()
        .collect();

    // Run the serial COM scan and every parent's TCP sub-port scan concurrently.
    // Mirrors the C++ `ScanTCPSubPortThreadNoCritical`, which spawns one thread
    // per parent — scanning parents one-at-a-time (each ~15 probes x 1.5s) is
    // what made scan-refresh take minutes.
    enum Outcome {
        Serial(super::serial::SerialScanResult),
        TcpSub(Vec<super::tcp_sub::TcpSubDeviceResult>),
    }
    let mut tasks = tokio::task::JoinSet::new();
    tasks.spawn_blocking(move || {
        Outcome::Serial(super::serial::scan_all_serial_ports(None, 1, 254))
    });
    for parent in parents {
        tasks.spawn_blocking(move || match super::tcp_sub::scan_parent_sub_ports(&parent) {
            Ok(found) => Outcome::TcpSub(found),
            Err(_) => Outcome::TcpSub(Vec::new()),
        });
    }

    let mut serial_result = super::serial::SerialScanResult {
        devices: vec![],
        port_open_failures: vec!["serial scan task panicked".into()],
        warnings: vec![],
    };
    let mut tcp_devices: Vec<super::tcp_sub::TcpSubDeviceResult> = Vec::new();

    while let Some(joined) = tasks.join_next().await {
        match joined {
            Ok(Outcome::Serial(s)) => serial_result = s,
            Ok(Outcome::TcpSub(found)) => {
                for d in found {
                    all.push(d.device.clone());
                    tcp_devices.push(d);
                }
            }
            Err(_) => {} // a task panicked — ignore that one
        }
    }

    // Serial devices: ip_address is the COM port name — keep them distinct.
    for s in &serial_result.devices {
        all.push(s.device.clone());
    }

    // Deduplicate by (serial_number, ip_address) so a serial device that also
    // appears on the network isn't doubled.
    let mut seen: HashSet<(u32, String)> = HashSet::new();
    let devices: Vec<DiscoveredDevice> = all
        .into_iter()
        .filter(|d| seen.insert((d.serial_number, d.ip_address.clone())))
        .collect();

    let mut warnings = udp.warnings.clone();
    for f in &serial_result.port_open_failures {
        warnings.push(format!("serial: {}", f));
    }
    for w in &serial_result.warnings {
        warnings.push(format!("serial: {}", w));
    }

    tracing::info!(
        "[lan_scan] full scan done: {} UDP, {} serial, {} TCP sub-port → {} total devices",
        udp.devices.len(),
        serial_result.devices.len(),
        tcp_devices.len(),
        devices.len()
    );

    FullScanResult {
        devices,
        udp_count: udp.devices.len(),
        serial_count: serial_result.devices.len(),
        tcp_sub_count: tcp_devices.len(),
        com_ports: serial_result
            .devices
            .iter()
            .map(|d| d.com_port.clone())
            .collect(),
        adapters_scanned: udp.adapters_scanned,
        local_ips: udp.local_ips,
        warnings,
    }
}

/// Full multi-protocol scan result (UDP + serial + TCP sub-port).
#[derive(Debug, Clone, serde::Serialize)]
pub struct FullScanResult {
    /// Merged, deduplicated device list.
    pub devices: Vec<DiscoveredDevice>,
    /// Devices found via UDP broadcast.
    pub udp_count: usize,
    /// Devices found on serial COM ports.
    pub serial_count: usize,
    /// Devices found via Modbus TCP sub-port gateways.
    pub tcp_sub_count: usize,
    /// COM ports where devices were found.
    pub com_ports: Vec<String>,
    /// Network adapters scanned.
    pub adapters_scanned: usize,
    /// Local IPs used for scanning.
    pub local_ips: Vec<String>,
    /// Non-fatal warnings.
    pub warnings: Vec<String>,
}
