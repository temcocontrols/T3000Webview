//! Network Scan — TCP 1433 port sweep + UDP 1434 SQL Server Browser discovery
//!
//! Primary: TCP-connect sweep of the local /24 subnet on port 1433
//!          (finds SQL Server on the default port without needing Browser service).
//! Secondary: UDP broadcast on port 1434 to discover named instances on
//!            non-default ports (requires SQL Server Browser service).
//!
//! Results from both methods are merged and deduplicated.
//! This is an optional convenience — manual config always works.

use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::net::{TcpStream, UdpSocket, SocketAddr};
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
///
/// Results are merged and deduplicated by (host, port).
pub fn scan_sql_server_instances(timeout_ms: u64) -> Vec<DiscoveredInstance> {
    // --- Phase 1: TCP 1433 subnet sweep (primary) ---
    let mut results = scan_tcp_1433(timeout_ms);

    // --- Phase 2: UDP 1434 Browser discovery (secondary) ---
    let udp_results = scan_udp_1434(timeout_ms);

    // --- Merge & deduplicate ---
    let existing: HashSet<(String, Option<u16>)> = results
        .iter()
        .map(|r| (r.host.clone(), r.port))
        .collect();

    for inst in udp_results {
        let key = (inst.host.clone(), inst.port);
        if !existing.contains(&key) {
            results.push(inst);
        }
    }

    results
}

/// TCP 1433 subnet sweep — probe every IP in the local /24 on port 1433.
fn scan_tcp_1433(timeout_ms: u64) -> Vec<DiscoveredInstance> {
    let local_ip = get_local_ip();

    // Skip sweep if we got a loopback address (no network / offline)
    if local_ip.starts_with("127.") {
        eprintln!("[network_scan] Skipping TCP sweep — local IP is loopback ({})", local_ip);
        return Vec::new();
    }

    let parts: Vec<&str> = local_ip.split('.').collect();
    if parts.len() != 4 {
        eprintln!("[network_scan] Cannot determine /24 subnet from IP: {}", local_ip);
        return Vec::new();
    }

    let subnet_prefix = format!("{}.{}.{}.", parts[0], parts[1], parts[2]);
    let per_host_timeout = Duration::from_millis(200.min(timeout_ms));

    // Probe 1–254 in parallel using threads
    let handles: Vec<_> = (1..=254)
        .map(|i| {
            let host = format!("{}{}", subnet_prefix, i);
            let local = local_ip.clone();
            std::thread::spawn(move || {
                // Skip our own IP
                if host == local {
                    return None;
                }
                let addr: SocketAddr = format!("{}:1433", host).parse().ok()?;
                match TcpStream::connect_timeout(&addr, per_host_timeout) {
                    Ok(_) => Some(DiscoveredInstance {
                        host,
                        instance: None,
                        port: Some(1433),
                        version: None,
                    }),
                    Err(_) => None,
                }
            })
        })
        .collect();

    let mut results = Vec::new();
    for h in handles {
        if let Ok(Some(inst)) = h.join() {
            results.push(inst);
        }
    }
    results
}

/// UDP 1434 broadcast — SQL Server Browser discovery for named instances.
fn scan_udp_1434(timeout_ms: u64) -> Vec<DiscoveredInstance> {
    let mut results = Vec::new();

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

    // SQL Server Browser discovery packet: single byte 0x02
    let probe = [0x02u8];
    if let Err(e) = socket.send_to(&probe, "255.255.255.255:1434") {
        eprintln!("[network_scan] Failed to send broadcast: {}", e);
        return results;
    }

    // Collect responses until timeout
    let mut buf = [0u8; 4096];
    loop {
        match socket.recv_from(&mut buf) {
            Ok((n, addr)) => {
                if n > 3 {
                    // Skip first 3 header bytes
                    let payload = String::from_utf8_lossy(&buf[3..n]);
                    let host = addr.ip().to_string();
                    let instances = parse_browser_response(&host, &payload);
                    results.extend(instances);
                }
            }
            Err(_) => break, // timeout or error — done
        }
    }

    results
}

/// Get the local IP address by connecting a UDP socket to a public address.
pub fn get_local_ip() -> String {
    if let Ok(socket) = UdpSocket::bind("0.0.0.0:0") {
        if socket.connect("8.8.8.8:80").is_ok() {
            if let Ok(addr) = socket.local_addr() {
                return addr.ip().to_string();
            }
        }
    }
    "127.0.0.1".to_string()
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
