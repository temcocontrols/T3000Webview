//! Deep diagnostic for a single COM port — raw RX dump at every baud rate.
//!
//! Opens the port, and for each baud rate:
//!   1. Listens passively (~600 ms) for any spontaneous traffic
//!   2. Sends the T3000 online-check probe `[FF, 19, devHi, devLo, crc]`
//!   3. Sends a standard Modbus function-3 read to broadcast ID 1 (regs 0..9)
//!   4. Prints EVERY byte received in hex, so you can see exactly what the
//!      device (if any) replies with — even if it's a protocol we don't parse.
//!
//! Optional: toggle RTS high during TX then low after (needed by many
//! USB-RS485 dongles that use RTS to flip the transceiver to transmit mode):
//! ```sh
//! cargo run --example diag_serial -- COM3 --rts
//! ```
//!
//! Run from `api/`:
//! ```sh
//! cargo run --example diag_serial -- COM3
//! ```
//!
//! Interpretation:
//! - No bytes at ANY baud  → wiring/driver/port problem, or wrong COM port,
//!   or (if the device has an IP) it was never on the serial bus at all.
//! - Bytes only at one baud → that's the device's baud rate; check the hex:
//!     * echo of our probe  → FT232R loopback / not actually wired to device
//!     * `55 FF` pattern    → BACnet MSTP device on the line
//!     * `[01 03 ..]` reply → standard Modbus device (we can add support)
//!     * other data         → some other protocol; inspect the hex

use std::time::Duration;

use t3_webview_api::lan_scan::modbus;
use t3_webview_api::lan_scan::serial::{check_mstp_data, PROBE_BAUDRATES};

fn hex(b: &[u8]) -> String {
    b.iter().map(|x| format!("{:02X}", x)).collect::<Vec<_>>().join(" ")
}

fn main() {
    let args: Vec<String> = std::env::args().collect();
    let port_name = args.get(1).cloned().unwrap_or_else(|| {
        eprintln!("usage: cargo run --example diag_serial -- COMx [--rts]");
        std::process::exit(2);
    });
    let use_rts = args.iter().any(|a| a == "--rts");

    println!("=== Deep serial diagnostic on {} === (RTS toggle: {})", port_name, use_rts);

    for &baud in &PROBE_BAUDRATES {
        println!("--- {} @ {} baud ---", port_name, baud);

        let mut port = match serialport::new(&port_name, baud)
            .timeout(Duration::from_millis(250))
            .open()
        {
            Ok(p) => p,
            Err(e) => {
                println!("   ✘ cannot open: {}", e);
                continue;
            }
        };
        let _ = port.clear(serialport::ClearBuffer::All);
        std::thread::sleep(Duration::from_millis(30));

        // 1) Passive listen
        let mut passive: Vec<u8> = Vec::new();
        let mut buf = [0u8; 64];
        let deadline = std::time::Instant::now() + Duration::from_millis(600);
        while std::time::Instant::now() < deadline && passive.len() < 200 {
            match port.read(&mut buf) {
                Ok(n) if n > 0 => passive.extend_from_slice(&buf[..n]),
                _ => std::thread::sleep(Duration::from_millis(20)),
            }
        }
        if !passive.is_empty() {
            println!("   [passive RX {}B] {}", passive.len(), hex(&passive));
            if check_mstp_data(&passive) {
                println!("      → BACnet MSTP traffic detected!");
            }
        }

        // 2) T3000 online-check probe
        let pval = modbus::build_online_check(1, 254);
        println!("   → probe (T3000 online-check): {}", hex(&pval));
        let _ = port.clear(serialport::ClearBuffer::Input);
        if use_rts {
            let _ = port.write_request_to_send(true); // drive bus for TX
        }
        let _ = port.write(&pval);
        std::thread::sleep(Duration::from_millis(30));
        if use_rts {
            let _ = port.write_request_to_send(false); // back to RX
        }
        std::thread::sleep(Duration::from_millis(120));
        let mut resp: Vec<u8> = Vec::new();
        let deadline = std::time::Instant::now() + Duration::from_millis(400);
        while std::time::Instant::now() < deadline && resp.len() < 64 {
            match port.read(&mut buf) {
                Ok(n) if n > 0 => resp.extend_from_slice(&buf[..n]),
                _ => std::thread::sleep(Duration::from_millis(15)),
            }
        }
        if resp.is_empty() {
            println!("   [probe RX] (nothing)");
        } else {
            println!("   [probe RX {}B] {}", resp.len(), hex(&resp));
            // echo check — FT232R loopback / not wired
            if resp.len() >= 6 && resp[..6] == pval[..] {
                println!("      → RX is an ECHO of our probe (loopback — check wiring!)");
            } else if resp[0] == 0xFF && resp[1] == 0x19 {
                println!("      → valid T3000 probe response, device ID = {}", resp[2]);
            } else if resp.first() == Some(&0x55) {
                println!("      → BACnet MSTP frame start (55 ...)");
            }
        }

        // 3) Standard Modbus function-3 read to ID 1 (regs 0..9)
        let f3 = modbus::build_read_multiple(1, 0, 10);
        println!("   → modbus f3 (ID=1 regs 0..9): {}", hex(&f3));
        let _ = port.clear(serialport::ClearBuffer::Input);
        if use_rts {
            let _ = port.write_request_to_send(true);
        }
        let _ = port.write(&f3);
        std::thread::sleep(Duration::from_millis(30));
        if use_rts {
            let _ = port.write_request_to_send(false);
        }
        std::thread::sleep(Duration::from_millis(120));
        let mut resp: Vec<u8> = Vec::new();
        let deadline = std::time::Instant::now() + Duration::from_millis(400);
        while std::time::Instant::now() < deadline && resp.len() < 64 {
            match port.read(&mut buf) {
                Ok(n) if n > 0 => resp.extend_from_slice(&buf[..n]),
                _ => std::thread::sleep(Duration::from_millis(15)),
            }
        }
        if resp.is_empty() {
            println!("   [f3 RX] (nothing)");
        } else {
            println!("   [f3 RX {}B] {}", resp.len(), hex(&resp));
            if resp[0] == 1 && resp[1] == 3 {
                println!("      → standard Modbus response from ID 1!");
            }
        }

        println!();
    }

    println!("=== done ===");
}
