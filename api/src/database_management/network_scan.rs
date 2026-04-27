//! Network Scan — TCP port sweep (1432, 1433, 1434) + UDP 1434 SQL Server Browser discovery
//!
//! Scans ALL local network interfaces (LAN, VPN, etc.) — not just the primary one.
//! Primary: TCP-connect sweep of each interface's /24 subnet on ports 1432, 1433, and 1434
//!          (finds SQL Server on default and common alternate ports without needing Browser service).
//! Secondary: UDP broadcast on port 1434 to discover named instances on
//!            non-default ports (requires SQL Server Browser service).
//!
//! Results from both methods are merged and deduplicated.
//! This is an optional convenience — manual config always works.

use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::net::{TcpStream, UdpSocket, SocketAddr, Ipv4Addr};
use std::time::Duration;

/// Discovered SQL Server instance from a network scan.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiscoveredInstance {
    pub host: String,
    pub instance: Option<String>,
    pub port: Option<u16>,
    pub version: Option<String>,
}

/// Scan the local subnet for SQL Server instances.
///
/// 1. **TCP 1433 sweep** — probes every IP in the local /24 subnet on port 1433.
///    Any host that accepts the TCP connection is assumed to be running SQL Server.
/// 2. **UDP 1434 broadcast** — sends a Browser discovery packet to find named
///    instances (requires SQL Server Browser service to be running).
/// 3. **Direct UDP probe** — for any TCP-found host that didn't respond to broadcast,
///    send a unicast UDP 1434 probe to get instance name + version.
///
/// Results are merged and deduplicated by (host, instance).
pub fn scan_sql_server_instances(timeout_ms: u64) -> Vec<DiscoveredInstance> {
    // --- Phase 0: Probe the local machine's own IPs ---
    // The subnet sweep skips local IPs to avoid noise, but the user may have SQL Server
    // installed on the same machine as T3000. Scan them explicitly here.
    let local_ips = get_all_local_ips();
    let sql_ports: &[u16] = &[1433, 1432, 1434];
    let local_timeout = Duration::from_millis(300);
    let mut local_results: Vec<DiscoveredInstance> = Vec::new();
    for ip in &local_ips {
        for &port in sql_ports {
            let addr_str = format!("{}:{}", ip, port);
            if let Ok(addr) = addr_str.parse::<SocketAddr>() {
                if TcpStream::connect_timeout(&addr, local_timeout).is_ok() {
                    local_results.push(DiscoveredInstance {
                        host: ip.clone(),
                        instance: None,
                        port: Some(port),
                        version: None,
                    });
                }
            }
        }
    }

    // --- Phase 1: TCP subnet sweep (primary) ---
    let tcp_results = scan_tcp_1433(timeout_ms);

    // --- Phase 2: UDP 1434 Browser discovery (secondary) ---
    let udp_results = scan_udp_1434(timeout_ms);

    // --- Phase 3: Direct unicast UDP probe for ALL TCP-found hosts ---
    // Always unicast-probe every TCP-found host (not just those missing from broadcast).
    // Reason: UDP broadcast may only return some instances (e.g. MSSQLSERVER but not SQLEXPRESS).
    // A unicast CLNT_UCAST_EX (0x03) probe asks the Browser for ALL instances on that specific host.
    let all_tcp: Vec<&DiscoveredInstance> = tcp_results.iter().chain(local_results.iter()).collect();
    let mut direct_results = Vec::new();
    let mut probed_hosts: HashSet<String> = HashSet::new();
    for tcp_inst in &all_tcp {
        if probed_hosts.insert(tcp_inst.host.clone()) {
            let probed = probe_single_host_udp(&tcp_inst.host, timeout_ms);
            if !probed.is_empty() {
                direct_results.extend(probed);
            }
        }
    }

    // --- Merge: prefer UDP/direct results (have instance+version) over bare TCP ---
    let mut merged: Vec<DiscoveredInstance> = Vec::new();
    let mut seen: HashSet<(String, Option<u16>)> = HashSet::new();

    // Add UDP broadcast results first (richest data)
    for inst in udp_results {
        let key = (inst.host.clone(), inst.port);
        if seen.insert(key) {
            merged.push(inst);
        }
    }

    // Add direct probe results
    for inst in direct_results {
        let key = (inst.host.clone(), inst.port);
        if seen.insert(key) {
            merged.push(inst);
        }
    }

    // Add TCP subnet results (skip any already found above)
    for inst in tcp_results {
        let key = (inst.host.clone(), inst.port);
        if seen.insert(key) {
            merged.push(inst);
        }
    }

    // Add local machine results last (skip any already found above)
    for inst in local_results {
        let key = (inst.host.clone(), inst.port);
        if seen.insert(key) {
            merged.push(inst);
        }
    }

    merged
}

/// TCP 1433 subnet sweep — probe every IP in each local interface's /24.
fn scan_tcp_1433(timeout_ms: u64) -> Vec<DiscoveredInstance> {
    let local_ips = get_all_local_ips();

    if local_ips.is_empty() {
        eprintln!("[network_scan] No usable network interfaces found — skipping TCP sweep");
        return Vec::new();
    }

    eprintln!("[network_scan] Scanning {} subnet(s): {:?}", local_ips.len(), local_ips);

    let local_set: HashSet<String> = local_ips.iter().cloned().collect();
    let per_host_timeout = Duration::from_millis(200.min(timeout_ms));

    // Collect all (subnet_prefix, skip_ip) pairs to scan
    let mut subnets_seen = HashSet::new();
    let mut scan_targets = Vec::new();

    for ip in &local_ips {
        let parts: Vec<&str> = ip.split('.').collect();
        if parts.len() != 4 {
            continue;
        }
        let subnet_prefix = format!("{}.{}.{}.", parts[0], parts[1], parts[2]);
        if subnets_seen.insert(subnet_prefix.clone()) {
            scan_targets.push(subnet_prefix);
        }
    }

    // SQL Server ports to probe per host: 1433 (default), 1432 (alternate), 1434 (alternate/Browser)
    // One thread per host — ALL ports are checked inside that thread (not early-exit) so that
    // e.g. a host with both 1433 (some other service) and 1432 (SQL Server) is reported correctly.
    const SQL_PORTS: &[u16] = &[1433, 1432, 1434];

    // One thread per host; probe ALL ports inside that thread and return every hit
    let handles: Vec<_> = scan_targets
        .into_iter()
        .flat_map(|prefix| {
            let local_set = local_set.clone();
            (1..=254).map(move |i| {
                let host = format!("{}{}", prefix, i);
                let skip = local_set.clone();
                std::thread::spawn(move || -> Vec<DiscoveredInstance> {
                    if skip.contains(&host) {
                        return Vec::new();
                    }
                    let mut found = Vec::new();
                    for &port in SQL_PORTS {
                        let addr: SocketAddr = match format!("{}:{}", host, port).parse() {
                            Ok(a) => a,
                            Err(_) => continue,
                        };
                        if TcpStream::connect_timeout(&addr, per_host_timeout).is_ok() {
                            // No instance name guessed from port number — could be anything.
                            // UDP Browser discovery (Phase 2/3) will fill in the real
                            // instance name and version when the Browser service is running.
                            found.push(DiscoveredInstance {
                                host: host.clone(),
                                instance: None,
                                port: Some(port),
                                version: None,
                            });
                        }
                    }
                    found
                })
            })
        })
        .collect();

    let mut results = Vec::new();
    for h in handles {
        if let Ok(found) = h.join() {
            results.extend(found);
        }
    }
    results
}

/// UDP 1434 broadcast — SQL Server Browser discovery for named instances.
/// Sends probe to subnet broadcast address on each interface (e.g. 192.168.1.255:1434).
fn scan_udp_1434(timeout_ms: u64) -> Vec<DiscoveredInstance> {
    let mut results = Vec::new();
    let local_ips = get_all_local_ips();

    // Build unique subnet broadcast addresses (e.g. 192.168.1.255)
    let mut broadcast_addrs = Vec::new();
    let mut seen = HashSet::new();
    for ip in &local_ips {
        let parts: Vec<&str> = ip.split('.').collect();
        if parts.len() == 4 {
            let bcast = format!("{}.{}.{}.255:1434", parts[0], parts[1], parts[2]);
            if seen.insert(bcast.clone()) {
                broadcast_addrs.push(bcast);
            }
        }
    }
    // Also include the global broadcast as fallback
    if seen.insert("255.255.255.255:1434".to_string()) {
        broadcast_addrs.push("255.255.255.255:1434".to_string());
    }

    let socket = match UdpSocket::bind("0.0.0.0:0") {
        Ok(s) => s,
        Err(e) => {
            eprintln!("[network_scan] Failed to bind UDP socket: {}", e);
            return results;
        }
    };

    if let Err(e) = socket.set_broadcast(true) {
        eprintln!("[network_scan] Failed to enable broadcast: {}", e);
        return results;
    }

    let timeout = Duration::from_millis(timeout_ms);
    if let Err(e) = socket.set_read_timeout(Some(timeout)) {
        eprintln!("[network_scan] Failed to set read timeout: {}", e);
        return results;
    }

    // Send probe to each broadcast address
    let probe = [0x02u8];
    for addr in &broadcast_addrs {
        if let Err(e) = socket.send_to(&probe, addr) {
            eprintln!("[network_scan] Failed to send broadcast to {}: {}", addr, e);
        }
    }

    // Collect responses until timeout
    let mut seen_hosts: HashSet<(String, Option<u16>)> = HashSet::new();
    let mut buf = [0u8; 4096];
    loop {
        match socket.recv_from(&mut buf) {
            Ok((n, addr)) => {
                if n > 3 {
                    let payload = String::from_utf8_lossy(&buf[3..n]);
                    let host = addr.ip().to_string();
                    let instances = parse_browser_response(&host, &payload);
                    for inst in instances {
                        let key = (inst.host.clone(), inst.port);
                        if seen_hosts.insert(key) {
                            results.push(inst);
                        }
                    }
                }
            }
            Err(_) => break,
        }
    }

    results
}

/// Send a direct (unicast) UDP 1434 probe to a single host.
/// Used when a host responds to TCP 1433 but didn't reply to the broadcast.
fn probe_single_host_udp(host: &str, timeout_ms: u64) -> Vec<DiscoveredInstance> {
    let socket = match UdpSocket::bind("0.0.0.0:0") {
        Ok(s) => s,
        Err(_) => return Vec::new(),
    };

    let timeout = Duration::from_millis(timeout_ms.min(1000));
    let _ = socket.set_read_timeout(Some(timeout));

    let target = format!("{}:1434", host);
    // 0x03 = CLNT_UCAST_EX: request all instances from a specific host (correct unicast opcode).
    // 0x02 = CLNT_BCAST_EX: broadcast opcode — some Browser implementations ignore it on unicast.
    let probe = [0x03u8];
    if socket.send_to(&probe, &target).is_err() {
        return Vec::new();
    }

    let mut buf = [0u8; 4096];
    match socket.recv_from(&mut buf) {
        Ok((n, _)) if n > 3 => {
            let payload = String::from_utf8_lossy(&buf[3..n]);
            parse_browser_response(host, &payload)
        }
        _ => Vec::new(),
    }
}

/// Get ALL local IPv4 addresses across every network interface.
///
/// Uses `ipconfig` on Windows to enumerate all adapters. Falls back to the
/// single-IP UDP trick if `ipconfig` fails.
/// Filters out loopback (127.x), link-local (169.254.x), and APIPA addresses.
pub fn get_all_local_ips() -> Vec<String> {
    let mut ips = Vec::new();

    // On Windows, parse `ipconfig` output for IPv4 addresses
    #[cfg(target_os = "windows")]
    {
        if let Ok(output) = std::process::Command::new("ipconfig").output() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            for line in stdout.lines() {
                let line = line.trim();
                // Match lines like "IPv4 Address. . . . . . . . . . . : 192.168.1.4"
                // Works for both English and many locales (key phrase contains "IPv4")
                if line.contains("IPv4") {
                    if let Some(ip_str) = line.rsplit(':').next() {
                        let ip = ip_str.trim().to_string();
                        if let Ok(addr) = ip.parse::<Ipv4Addr>() {
                            if !addr.is_loopback() && !addr.is_link_local() {
                                ips.push(ip);
                            }
                        }
                    }
                }
            }
        }
    }

    // Fallback: UDP trick to get at least one IP
    if ips.is_empty() {
        if let Ok(socket) = UdpSocket::bind("0.0.0.0:0") {
            if socket.connect("8.8.8.8:80").is_ok() {
                if let Ok(addr) = socket.local_addr() {
                    let ip = addr.ip().to_string();
                    if !ip.starts_with("127.") {
                        ips.push(ip);
                    }
                }
            }
        }
    }

    ips
}

/// Get a single local IP address (for backward compatibility).
pub fn get_local_ip() -> String {
    get_all_local_ips().into_iter().next().unwrap_or_else(|| "127.0.0.1".to_string())
}

/// Parse a SQL Server Browser response payload.
///
/// Format: `ServerName;INSTANCE;InstanceName;IsClustered;No;Version;X.Y.Z.W;tcp;PORT;;`
/// Multiple instances separated by `;;`.
fn parse_browser_response(host: &str, payload: &str) -> Vec<DiscoveredInstance> {
    let mut instances = Vec::new();

    for block in payload.split(";;") {
        let block = block.trim();
        if block.is_empty() {
            continue;
        }

        let parts: Vec<&str> = block.split(';').collect();
        let mut instance_name = None;
        let mut port = None;
        let mut version = None;

        // Parse key;value pairs
        let mut i = 0;
        while i + 1 < parts.len() {
            match parts[i].to_lowercase().as_str() {
                "instancename" => instance_name = Some(parts[i + 1].to_string()),
                "tcp" => port = parts[i + 1].parse::<u16>().ok(),
                "version" => version = Some(parts[i + 1].to_string()),
                _ => {}
            }
            i += 2;
        }

        instances.push(DiscoveredInstance {
            host: host.to_string(),
            instance: instance_name,
            port,
            version,
        });
    }

    instances
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_browser_response() {
        let payload = "ServerName;MYSERVER;InstanceName;SQLEXPRESS;IsClustered;No;Version;16.0.1000.6;tcp;1433;;";
        let instances = parse_browser_response("192.168.1.10", payload);
        assert_eq!(instances.len(), 1);
        assert_eq!(instances[0].host, "192.168.1.10");
        assert_eq!(instances[0].instance.as_deref(), Some("SQLEXPRESS"));
        assert_eq!(instances[0].port, Some(1433));
        assert_eq!(instances[0].version.as_deref(), Some("16.0.1000.6"));
    }

    #[test]
    fn test_parse_empty_payload() {
        let instances = parse_browser_response("10.0.0.1", "");
        assert!(instances.is_empty());
    }

    #[test]
    fn test_parse_multiple_instances() {
        let payload = "ServerName;SRV;InstanceName;INST1;tcp;1433;;;;ServerName;SRV;InstanceName;INST2;tcp;1434;;";
        let instances = parse_browser_response("10.0.0.5", payload);
        assert_eq!(instances.len(), 2);
        assert_eq!(instances[0].instance.as_deref(), Some("INST1"));
        assert_eq!(instances[1].instance.as_deref(), Some("INST2"));
    }
}
