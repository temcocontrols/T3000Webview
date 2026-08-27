//! Verify serial (COM/USB) Modbus RTU scanning.
//!
//! Lists the COM ports Windows sees, then scans each one at the standard
//! T3000 baud rates for Modbus devices — the exact path used by the webview's
//! "Scan" button (`lan_scan::serial`).
//!
//! Run from `api/`:
//! ```sh
//! cargo run --example scan_serial
//! ```
//!
//! What to look for:
//! - If a USB Modbus adapter (FT232R / CP2102 / CH340) is plugged in, it must
//!   appear in the "Available COM ports" list. If it does NOT, the OS driver is
//!   missing/broken — no COM port exists, so serial scanning can't reach it
//!   (even though the same device may be reachable by UDP over its IP).
//! - Devices found are printed with their serial number, product, Modbus ID,
//!   and the COM port + baud rate that answered.

use t3_webview_api::lan_scan::serial::{list_com_ports, scan_com_port, PROBE_BAUDRATES};

fn main() {
    println!("=== T3000 Serial (COM/USB) Modbus Scan ===\n");

    let ports = list_com_ports();
    if ports.is_empty() {
        println!("⚠  No COM ports detected.");
        println!("    If your USB Modbus adapter is plugged in, its driver is NOT installed");
        println!("    or Windows has not assigned a COM port. Device Manager will show it");
        println!("    with a problem (e.g. CM_PROB_FAILED_INSTALL).\n");
        println!("    Fix: install the USB-serial VCP driver (FTDI/CP210x/CH340) so a COMx appears,");
        println!("    then re-run this example.\n");
        return;
    }

    println!("Available COM ports ({}):", ports.len());
    for p in &ports {
        println!("   {}", p);
    }
    println!("\nBaud rates probed: {:?}\n", PROBE_BAUDRATES);

    let mut total_found = 0usize;
    for port in &ports {
        println!("--- Scanning {} ---", port);
        match scan_com_port(port, &PROBE_BAUDRATES, 1, 254) {
            Ok(devices) => {
                if devices.is_empty() {
                    println!("   no Modbus device answered (open but silent / wrong adapter)");
                } else {
                    for d in &devices {
                        total_found += 1;
                        let dev = &d.device;
                        println!(
                            "   ✔ SN={:<12}  product={:<16} ModbusID={:<3} @{} baud  label={}",
                            dev.serial_number,
                            dev.product_name,
                            dev.modbus_id,
                            d.baudrate,
                            dev.panel_name,
                        );
                        if d.mstp_detected {
                            println!("      (BACnet MSTP data detected on this port)");
                        }
                    }
                }
            }
            Err(e) => println!("   ✘ cannot open: {}", e),
        }
        println!();
    }

    println!("=== Done: {} device(s) found via serial ===\n", total_found);
}
