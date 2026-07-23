//! SquareLine C → per-screen firmware JSON.
//!
//! Usage:
//!   cargo run --release --example parse_squareline -- \
//!     --input ../../T3-programmable-controller-on-ESP32/main/TemcoScreen \
//!     --output device-json
//!
//! Output: one .json file per screen, matching device-import format.

use std::env;
use std::fs;
use std::path::PathBuf;
use t3_webview_api::eez_studio::parse_squareline;

fn main() {
    let args: Vec<String> = env::args().collect();
    let mut input = PathBuf::from("../../T3-programmable-controller-on-ESP32/main/TemcoScreen");
    let mut output = PathBuf::from("device-json");

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
        Ok(screens) => {
            fs::create_dir_all(&output).ok();

            let mut count = 0;
            for screen in &screens {
                let filename = output.join(format!("{}.json", screen.name));
                let content = serde_json::to_string_pretty(&serde_json::json!({
                    &screen.name: {
                        "fonts": screen.fonts,
                        "bitmaps": screen.bitmaps,
                        "widgets": screen.widgets_map,
                    }
                })).unwrap();

                fs::write(&filename, &content).ok();
                let kb = content.len() / 1024;
                println!("  {}.json — {} KB", screen.name, kb);
                count += 1;
            }
            println!("\nDone. {} screens → {}", count, output.display());
        }
        Err(e) => {
            eprintln!("Error: {}", e);
            std::process::exit(1);
        }
    }
}
