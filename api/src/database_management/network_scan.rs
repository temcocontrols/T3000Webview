//! Network Scan — UDP 1434 SQL Server Browser discovery
//!
//! Broadcasts to the local subnet on UDP port 1434 and parses
//! SQL Server Browser responses to find available instances.
//! This is an optional convenience — manual config always works.

use serde::{Deserialize, Serialize};
use std::net::UdpSocket;
use std::time::Duration;

/// Discovered SQL Server instance from a network scan.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiscoveredInstance {
    pub host: String,
    pub instance: Option<String>,
    pub port: Option<u16>,
    pub version: Option<String>,
}

/// Scan the local subnet for SQL Server instances via UDP 1434 broadcast.
///
/// Sends a single `\x02` byte to the broadcast address on port 1434
/// (SQL Server Browser protocol). Waits up to `timeout_ms` for responses.
///
/// Returns a list of discovered instances. Returns an empty list (not an error)
/// if the scan finds nothing or if broadcasting is blocked by the firewall.
pub fn scan_sql_server_instances(timeout_ms: u64) -> Vec<DiscoveredInstance> {
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
