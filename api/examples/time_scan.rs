//! Time the full `scan_all()` (UDP + serial + TCP sub-port, parallel) from the
//! CURRENT source — the same code the webview scan-refresh runs after the DLL
//! is rebuilt/deployed.
//!
//! Run from `api/`:
//! ```sh
//! cargo run --release --example time_scan
//! ```

use std::time::Instant;
use t3_webview_api::lan_scan::scanner;

#[tokio::main]
async fn main() {
    println!("=== scan_all() timing (current source) ===");
    let t = Instant::now();
    let r = scanner::scan_all(8).await;
    let secs = t.elapsed().as_secs_f64();
    println!("ELAPSED: {:.1}s", secs);
    println!(
        "udp={} serial={} tcp_sub={} total_devices={}",
        r.udp_count, r.serial_count, r.tcp_sub_count, r.devices.len()
    );
    println!("com_ports: {:?}", r.com_ports);
    for w in &r.warnings {
        println!("  warning: {}", w);
    }
}
