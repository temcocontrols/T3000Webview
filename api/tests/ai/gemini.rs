// Integration tests for the Gemini provider — response parsing.
//
// Verifies that text is extracted correctly when thinking parts
// (`thoughtSignature` / `thought`) are present, that thought-only parts are
// skipped while text parts stream normally, and that tool calls are emitted.

use serde_json::json;
use tokio::sync::mpsc;

use t3_webview_api::ai::providers::gemini::GeminiProvider;
use t3_webview_api::ai::types::StreamEvent;

fn channel() -> (
    mpsc::UnboundedSender<StreamEvent>,
    mpsc::UnboundedReceiver<StreamEvent>,
) {
    mpsc::unbounded_channel()
}

#[test]
fn extracts_text_from_part_with_thought_signature() {
    // Mirrors the exact generateContent response observed in the field: a
    // single part carrying both `text` and `thoughtSignature`, plus
    // `thoughtsTokenCount` usage metadata.
    let parsed = json!({
        "candidates": [{
            "content": {
                "parts": [{
                    "text": "I'm doing great, thanks for asking!",
                    "thoughtSignature": "EvQJCvEJ..."
                }],
                "role": "model"
            },
            "finishReason": "STOP",
            "index": 0
        }],
        "usageMetadata": { "thoughtsTokenCount": 327 }
    });

    let (tx, mut rx) = channel();
    let mut final_text = String::new();
    let mut had_tool_calls = false;

    GeminiProvider::handle_candidate(&parsed, &mut final_text, &mut had_tool_calls, &tx);
    drop(tx);

    assert_eq!(final_text, "I'm doing great, thanks for asking!");
    assert!(!had_tool_calls);

    match rx.try_recv().unwrap() {
        StreamEvent::TextDelta { content } => {
            assert_eq!(content, "I'm doing great, thanks for asking!");
        }
        other => panic!("expected TextDelta, got {:?}", other),
    }
}

#[test]
fn skips_thought_only_parts_and_streams_text() {
    // Streaming thinking models emit thought-only parts first (no `text`),
    // then text parts. The parser must skip thoughts and stream the text.
    let parsed = json!({
        "candidates": [{
            "content": {
                "parts": [
                    { "thoughtSignature": "abc123" },
                    { "text": "Hello " },
                    { "text": "world" }
                ],
                "role": "model"
            },
            "finishReason": "STOP",
            "index": 0
        }]
    });

    let (tx, mut rx) = channel();
    let mut final_text = String::new();
    let mut had_tool_calls = false;

    GeminiProvider::handle_candidate(&parsed, &mut final_text, &mut had_tool_calls, &tx);
    drop(tx);

    assert_eq!(final_text, "Hello world");
    assert!(!had_tool_calls);

    match rx.try_recv().unwrap() {
        StreamEvent::TextDelta { content } => assert_eq!(content, "Hello "),
        other => panic!("expected TextDelta, got {:?}", other),
    }
    match rx.try_recv().unwrap() {
        StreamEvent::TextDelta { content } => assert_eq!(content, "world"),
        other => panic!("expected TextDelta, got {:?}", other),
    }
    assert!(rx.try_recv().is_err());
}

#[test]
fn emits_tool_call() {
    let parsed = json!({
        "candidates": [{
            "content": {
                "parts": [{
                    "functionCall": { "name": "get_weather", "args": { "city": "SF" } }
                }],
                "role": "model"
            },
            "finishReason": "STOP",
            "index": 0
        }]
    });

    let (tx, mut rx) = channel();
    let mut final_text = String::new();
    let mut had_tool_calls = false;

    GeminiProvider::handle_candidate(&parsed, &mut final_text, &mut had_tool_calls, &tx);
    drop(tx);

    assert!(had_tool_calls);
    assert!(final_text.is_empty());

    match rx.try_recv().unwrap() {
        StreamEvent::ToolCall { id, name, arguments, thought_signature } => {
            assert_eq!(id, "gemini-get_weather");
            assert_eq!(name, "get_weather");
            assert_eq!(arguments, r#"{"city":"SF"}"#);
            assert!(thought_signature.is_none());
        }
        other => panic!("expected ToolCall, got {:?}", other),
    }
}

#[test]
fn captures_thought_signature_with_tool_call() {
    // The streaming response the model actually produced: a functionCall part
    // with a thoughtSignature sibling. The signature must be captured so it can
    // be echoed back on the next request.
    let parsed = json!({
        "candidates": [{
            "content": {
                "parts": [{
                    "functionCall": { "name": "t3000_device_current", "args": {}, "id": "call_499646" },
                    "thoughtSignature": "Ev0ECvoE..."
                }],
                "role": "model"
            },
            "index": 0
        }]
    });

    let (tx, mut rx) = channel();
    let mut final_text = String::new();
    let mut had_tool_calls = false;

    GeminiProvider::handle_candidate(&parsed, &mut final_text, &mut had_tool_calls, &tx);
    drop(tx);

    assert!(had_tool_calls);

    match rx.try_recv().unwrap() {
        StreamEvent::ToolCall { id, name, arguments, thought_signature } => {
            assert_eq!(id, "call_499646");
            assert_eq!(name, "t3000_device_current");
            assert_eq!(arguments, "{}");
            assert_eq!(thought_signature.as_deref(), Some("Ev0ECvoE..."));
        }
        other => panic!("expected ToolCall, got {:?}", other),
    }
}
