//! Real local-model tests for the plain-English guide.
//!
//! These tests send every example prompt from `mcp-api-examples.md` to a real
//! local model (llama.cpp or Ollama) together with the full MCP tool list, and
//! assert the model selects the tool that the guide documents for that prompt.
//!
//! These are `#[ignore]`d by default because loading a local model is slow and
//! loud (fans/GPU). Run them explicitly:
//!
//!   # llama.cpp
//!   $env:T3000_LLAMACPP_URL="http://192.168.1.22:1027"
//!   cargo test --test ai llama_cpp -- --ignored --nocapture
//!
//!   # Ollama
//!   $env:T3000_OLLAMA_URL="http://192.168.1.22:11434"
//!   cargo test --test ai ollama -- --ignored --nocapture
//!
//! Environment variables (all optional):
//!   T3000_LLAMACPP_URL    llama.cpp base URL (default http://192.168.1.22:1027)
//!   T3000_LLAMACPP_MODEL  model name sent to llama.cpp (default "local-model";
//!                         llama.cpp ignores it when a single model is loaded)
//!   T3000_OLLAMA_URL      Ollama base URL (default http://192.168.1.22:11434)
//!   T3000_OLLAMA_MODEL    model name pulled in Ollama (default "qwen2.5:7b")
//!   T3000_TEST_TOOL_LIMIT optional: only test the first N tools (default: all)

use serde_json::json;
use t3_webview_api::mcp::TOOLS;
use super::doc_parser::parse_doc;

fn env_or(name: &str, default: &str) -> String {
    std::env::var(name).unwrap_or_else(|_| default.to_string())
}

fn endpoint_of(base: &str) -> String {
    format!("{}/v1/chat/completions", base.trim_end_matches('/'))
}

/// Send one prompt to the model and return the selected tool name.
async fn ask_model(
    client: &reqwest::Client,
    endpoint: &str,
    model: &str,
    prompt: &str,
) -> Result<(String, String), String> {
    let tools: Vec<serde_json::Value> = TOOLS
        .iter()
        .map(|t| {
            json!({
                "type": "function",
                "function": {
                    "name": t.name,
                    "description": t.description,
                    "parameters": t.input_schema,
                }
            })
        })
        .collect();

    let body = json!({
        "model": model,
        "stream": false,
        "messages": [
            {
                "role": "system",
                "content": "You are a T3000 building automation assistant. Given the user's request, choose the single most appropriate tool from the provided tools and call it with reasonable arguments."
            },
            { "role": "user", "content": prompt }
        ],
        "tools": tools,
    });

    let resp = client
        .post(endpoint)
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let status = resp.status();
    let text = resp.text().await.map_err(|e| e.to_string())?;
    if !status.is_success() {
        return Err(format!("HTTP {}: {}", status, text));
    }

    let parsed: serde_json::Value =
        serde_json::from_str(&text).map_err(|e| format!("bad JSON: {} — body: {}", e, text))?;

    let name = parsed
        .get("choices")
        .and_then(|c| c.get(0))
        .and_then(|c| c.get("message"))
        .and_then(|m| m.get("tool_calls"))
        .and_then(|tc| tc.get(0))
        .and_then(|tc| tc.get("function"))
        .and_then(|f| f.get("name"))
        .and_then(|n| n.as_str());

    match name {
        Some(n) => Ok((n.to_string(), text)),
        None => Err(format!("model returned no tool_calls — body: {}", text)),
    }
}

async fn run_suite(label: &str, base_url: &str, model: &str) {
    println!("\n══════════════════════════════════════════════════════════════");
    println!("  {}  model={}  endpoint={}", label, model, base_url);
    println!("══════════════════════════════════════════════════════════════");

    let endpoint = endpoint_of(base_url);
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(180))
        .build()
        .expect("build http client");

    let examples = parse_doc();

    // Optional limit (e.g. 5) so the user can smoke-test without running all 60 tools.
    let limit: usize = env_or("T3000_TEST_TOOL_LIMIT", "0")
        .parse()
        .unwrap_or(0);
    let examples: Vec<_> = if limit > 0 {
        examples.into_iter().take(limit).collect()
    } else {
        examples
    };

    let mut total = 0usize;
    let mut pass = 0usize;
    let mut fail = 0usize;
    let mut failures: Vec<String> = Vec::new();

    for e in &examples {
        for prompt in &e.prompts {
            total += 1;
            print!("\n[case {:>3}] \"{}\"\n  expected: {}", total, prompt, e.tool);
            match ask_model(&client, &endpoint, model, prompt).await {
                Ok((got, _raw)) => {
                    if got == e.tool {
                        pass += 1;
                        println!("\n  ✅ selected: {}", got);
                    } else {
                        fail += 1;
                        let msg = format!("  ❌ expected '{}' but model selected '{}'", e.tool, got);
                        println!("\n{}", msg);
                        failures.push(format!("[{}] prompt=\"{}\" expected={} got={}", total, prompt, e.tool, got));
                    }
                }
                Err(err) => {
                    fail += 1;
                    println!("\n  ❌ ERROR: {}", err);
                    failures.push(format!("[{}] prompt=\"{}\" expected={} ERROR={}", total, prompt, e.tool, err));
                }
            }
        }
    }

    println!("\n──────────────────────────────────────────────────────────────");
    println!("  {} SUMMARY: {} cases, {} passed, {} failed", label, total, pass, fail);
    if !failures.is_empty() {
        println!("  Failures:");
        for f in &failures {
            println!("    {}", f);
        }
    }
    println!("──────────────────────────────────────────────────────────────\n");

    assert_eq!(fail, 0, "{} had {} failing case(s)", label, fail);
}

#[tokio::test]
#[ignore = "loads a real local model (llama.cpp) — run manually"]
async fn llama_cpp_plain_english() {
    let url = env_or("T3000_LLAMACPP_URL", "http://192.168.1.22:1027");
    let model = env_or("T3000_LLAMACPP_MODEL", "local-model");
    run_suite("llama.cpp", &url, &model).await;
}

#[tokio::test]
#[ignore = "loads a real local model (ollama) — run manually"]
async fn ollama_plain_english() {
    let url = env_or("T3000_OLLAMA_URL", "http://192.168.1.22:11434");
    let model = env_or("T3000_OLLAMA_MODEL", "qwen2.5:7b");
    run_suite("ollama", &url, &model).await;
}
