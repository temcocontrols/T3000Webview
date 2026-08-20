//! Tool-level coverage tests.
//!
//! These are DB-independent and verify that every MCP tool is:
//!   1. defined exactly once,
//!   2. wired to a dispatch handler,
//!   3. documented in the plain-English guide (and vice-versa).

use t3_webview_api::mcp::TOOLS;

#[test]
fn test_tool_count_is_60() {
    let count = TOOLS.len();
    assert_eq!(
        count, 60,
        "Expected 60 MCP tools, found {}. If you added/removed tools, update this test.",
        count
    );
}

#[test]
fn test_no_duplicate_tool_names() {
    use std::collections::HashSet;
    let mut seen = HashSet::new();
    for tool in TOOLS.iter() {
        assert!(
            seen.insert(tool.name),
            "Duplicate tool name found: '{}'",
            tool.name
        );
    }
}

#[test]
fn test_every_tool_has_dispatch_handler() {
    let dispatch_src = include_str!(concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/src/mcp/dispatch.rs"
    ));

    let mut missing: Vec<&str> = Vec::new();
    for tool in TOOLS.iter() {
        // Tool names appear as string literals in the dispatch match arms.
        if !dispatch_src.contains(&format!("\"{}\"", tool.name)) {
            missing.push(tool.name);
        }
    }

    if !missing.is_empty() {
        println!("\n=== Tools WITHOUT a dispatch handler ===");
        for m in &missing {
            println!("  {}", m);
        }
    }
    assert!(
        missing.is_empty(),
        "{} tool(s) have no dispatch handler:\n{}",
        missing.len(),
        missing.join("\n")
    );
}

#[test]
fn test_doc_and_tools_bidirectional() {
    let examples = super::doc_parser::parse_doc();

    let doc_tools: std::collections::HashSet<&str> =
        examples.iter().map(|e| e.tool.as_str()).collect();
    let code_tools: std::collections::HashSet<&str> =
        TOOLS.iter().map(|t| t.name).collect();

    let mut missing_from_doc: Vec<&str> =
        code_tools.difference(&doc_tools).cloned().collect();
    let mut missing_from_code: Vec<&str> =
        doc_tools.difference(&code_tools).cloned().collect();
    missing_from_doc.sort();
    missing_from_code.sort();

    println!("\n=== Guide ↔ TOOLS drift ===");
    println!("TOOLS count: {}, guide sections: {}", TOOLS.len(), examples.len());
    if !missing_from_doc.is_empty() {
        println!("In TOOLS but NOT in guide:");
        for t in &missing_from_doc {
            println!("  {}", t);
        }
    }
    if !missing_from_code.is_empty() {
        println!("In guide but NOT in TOOLS:");
        for t in &missing_from_code {
            println!("  {}", t);
        }
    }

    assert!(
        missing_from_doc.is_empty() && missing_from_code.is_empty(),
        "Guide ↔ TOOLS drift.\nIn TOOLS but not in guide:\n{}\nIn guide but not in TOOLS:\n{}",
        missing_from_doc.join("\n"),
        missing_from_code.join("\n")
    );
}
