//! CLI tool: Parse SquareLine Studio C screens → firmware JSON.
//!
//! Reads the firmware project's TemcoScreen/*.c files and outputs
//! firmware JSON compatible with the /api/eez-device/screens mock API.
//!
//! Usage:
//!   cargo run --example parse_squareline -- \
//!     --input ../../T3-programmable-controller-on-ESP32/main/TemcoScreen \
//!     --output firmware-screens.json
//!
//! Then push to mock:
//!   curl -X PUT http://localhost:9103/api/eez-device/screens \
//!     -H "Content-Type: application/json" -d @firmware-screens.json

//! cargo run --release --example parse_squareline -- --input ../../T3-programmable-controller-on-ESP32/main/TemcoScreen --output firmware-screens.json

use std::env;
use std::path::PathBuf;
use t3_webview_api::eez_studio::parse_squareline;

fn main() {
    let args: Vec<String> = env::args().collect();
    let mut input = PathBuf::from("../../T3-programmable-controller-on-ESP32/main/TemcoScreen");
    let mut output = PathBuf::from("firmware-screens.json");

    let mut i = 1;
    while i < args.len() {
        match args[i].as_str() {
            "--input" => { i += 1; input = PathBuf::from(&args[i]); }
            "--output" => { i += 1; output = PathBuf::from(&args[i]); }
            _ => eprintln!("Unknown arg: {}", args[i]),
        }
        i += 1;
    }

    match parse_squareline::parse_screens(&input) {
        Ok(json) => {
            let content = serde_json::to_string_pretty(&json).unwrap();
            std::fs::write(&output, &content).unwrap_or_else(|e| {
                eprintln!("Failed to write {}: {}", output.display(), e);
            });
            println!("Done → {}", output.display());
            println!("Push: curl -X PUT http://localhost:9103/api/eez-device/screens -H \"Content-Type: application/json\" -d @{}", output.display());
        }
        Err(e) => {
            eprintln!("Error: {}", e);
            std::process::exit(1);
        }
    }
}
