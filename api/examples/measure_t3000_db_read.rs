//! Measures the cost of reading T3000's device list, on the real database when
//! one is present.
//!
//! Usage: `cargo run --example measure_t3000_db_read`
//!
//! Reports the lock-relevant numbers: how long the importer holds SQLite's
//! shared lock (i.e. the duration of its `SELECT`), because T3000's databases
//! use the `delete` journal mode where a reader can block a writer.

use std::time::Instant;

use t3_webview_api::t3_device::t3000_building_db;

#[tokio::main]
async fn main() {
    let Some(dir) = t3000_building_db::resolve_database_dir() else {
        println!("No T3000 Database folder found — nothing to measure.");
        return;
    };
    println!("Database folder : {}", dir.display());
    println!("Configured COM  : {:?}", t3000_building_db::t3000_serial_ports_from(&dir).await);

    // Warm up (first call opens the connection pool + reads the schema).
    let first = Instant::now();
    let first_result = t3000_building_db::read_all_nodes_from(&dir).await;
    let first_ms = first.elapsed().as_secs_f64() * 1000.0;
    match &first_result {
        Ok(nodes) => println!("First read       : {:>8.2} ms  ({} device(s))", first_ms, nodes.len()),
        Err(e) => {
            println!("First read failed: {}", e);
            return;
        }
    }

    // Steady state: this is the shared-lock window T3000 can observe.
    let runs = 20;
    let mut samples: Vec<f64> = Vec::with_capacity(runs);
    for _ in 0..runs {
        let t = Instant::now();
        let _ = t3000_building_db::read_all_nodes_from(&dir).await;
        samples.push(t.elapsed().as_secs_f64() * 1000.0);
    }
    samples.sort_by(|a, b| a.partial_cmp(b).unwrap());

    println!(
        "Read x{:<11}: median {:>6.2} ms, p95 {:>6.2} ms, max {:>6.2} ms",
        runs,
        samples[runs / 2],
        samples[(runs * 95) / 100],
        samples[runs - 1]
    );

    let nodes = first_result.unwrap();
    let online = nodes.iter().filter(|n| n.online).count();
    let serial = nodes
        .iter()
        .filter(|n| n.connection_type.as_deref() == Some("Sub Device RS485"))
        .count();
    println!(
        "Breakdown        : {} device(s), {} reported online, {} RS485 sub-device(s)",
        nodes.len(),
        online,
        serial
    );
}
