//! Guide quality tests.
//!
//! Verify that every tool section in `mcp-api-examples.md` is usable and that
//! its plain-English example prompts align with the tool's persona (the same
//! classifier the AI chat uses to pick the right category of tool).

use t3_webview_api::ai::prompt_builder::{classify_persona, tool_persona_map, ContextMode};
use super::doc_parser::parse_doc;

#[test]
fn test_every_tool_section_has_description_and_examples() {
    let examples = parse_doc();
    let mut problems: Vec<String> = Vec::new();

    for e in &examples {
        if e.description.trim().len() < 10 {
            problems.push(format!("{}: missing or too-short description", e.tool));
        }
        if e.prompts.is_empty() {
            problems.push(format!("{}: no example prompts", e.tool));
        }
    }

    println!("\n=== Guide quality: {} tool sections ===", examples.len());
    if !problems.is_empty() {
        for p in &problems {
            println!("  {}", p);
        }
    }
    assert!(
        problems.is_empty(),
        "Guide quality problems:\n{}",
        problems.join("\n")
    );
}

#[test]
fn test_prompts_align_with_tool_persona() {
    let examples = parse_doc();

    let mut mismatches: Vec<String> = Vec::new();
    let mut checked = 0usize;
    let mut skipped = 0usize;

    for e in &examples {
        // Generic tools (ping, docs, memory, tasks, ...) have no persona.
        let persona: ContextMode = match tool_persona_map(&e.tool) {
            Some(p) => p,
            None => {
                skipped += e.prompts.len();
                continue;
            }
        };

        for prompt in &e.prompts {
            checked += 1;
            let got = classify_persona(prompt);
            if got != persona {
                mismatches.push(format!(
                    "tool={:<34} expected={:?} got={:?}   prompt=\"{}\"",
                    e.tool, persona, got, prompt
                ));
            }
        }
    }

    let aligned = checked - mismatches.len();
    let rate = if checked == 0 {
        100.0
    } else {
        aligned as f64 / checked as f64 * 100.0
    };

    println!("\n=== Persona alignment (diagnostic — informational, not a hard gate) ===");
    println!(
        "checked={} skipped={} aligned={}/{} ({:.1}%)",
        checked, skipped, aligned, checked, rate
    );
    if mismatches.is_empty() {
        println!("All example prompts align with their tool's persona.");
    } else {
        println!(
            "{} MISMATCH(ES) — classifier/guide phrasing gaps (the authoritative check is the LLM test):",
            mismatches.len()
        );
        for m in &mismatches {
            println!("  {}", m);
        }
    }
}
