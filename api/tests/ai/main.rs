//! AI test suite — entry point.
//!
//! Auto-discovered by Cargo as the `ai` test binary (`tests/ai/main.rs`).
//!
//! Run:
//!   cargo test --test ai                                  # doc + coverage tests
//!   cargo test --test ai llm -- --ignored --nocapture     # real local-model tests (loud)

mod doc_parser;
mod tool_coverage;
mod doc_guide;
mod llm_plain_english;
