//! Shared parser for `docs/t3000/haystack/mcp-api-examples.md`.
//!
//! The doc is the human-facing guide: for each tool it lists a description
//! and several plain-English example prompts (bold text). This parser turns
//! that doc into a machine-readable `Vec<ToolExample>` so tests can verify
//! the guide is complete and correct.

use regex::Regex;

/// One tool section from the guide.
pub struct ToolExample {
    /// Tool name (e.g. `t3000_alarm_list`).
    pub tool: String,
    /// The descriptive paragraph under the section header.
    pub description: String,
    /// Plain-English example prompts (the bold `**...**` lines).
    pub prompts: Vec<String>,
}

const DOC: &str = include_str!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/../docs/t3000/haystack/mcp-api-examples.md"
));

/// Parse the guide into per-tool sections.
pub fn parse_doc() -> Vec<ToolExample> {
    let header_re = Regex::new(r"(?m)^### `([^`]+)`").expect("valid header regex");
    let prompt_line_re = Regex::new(r"^\s*\*\*(.+?)\*\*\s*$").expect("valid prompt regex");

    // Locate every `### `tool`` header.
    let mut starts: Vec<(usize, String)> = Vec::new();
    for cap in header_re.captures_iter(DOC) {
        let m = cap.get(0).expect("matched header");
        starts.push((m.start(), cap[1].to_string()));
    }

    let mut sections: Vec<ToolExample> = Vec::new();
    for i in 0..starts.len() {
        let (start, tool) = &starts[i];
        let end = if i + 1 < starts.len() {
            starts[i + 1].0
        } else {
            DOC.len()
        };
        let body = &DOC[*start..end];

        // Description: the paragraph between the header and the first `<div`.
        let mut description = String::new();
        let mut in_description = true;
        for line in body.lines() {
            if line.starts_with("###") {
                continue;
            }
            if line.contains("<div") {
                in_description = false;
                continue;
            }
            if in_description {
                let t = line.trim();
                if !t.is_empty() && !t.starts_with('#') {
                    if !description.is_empty() {
                        description.push(' ');
                    }
                    description.push_str(t);
                }
            }
        }

        // Prompts: bold text that occupies a whole line (the prompt cards).
        // Descriptions may contain inline bold (e.g. "**Safety:** ...") which
        // must NOT be treated as example prompts.
        let mut prompts: Vec<String> = Vec::new();
        for line in body.lines() {
            if let Some(cap) = prompt_line_re.captures(line) {
                let p = cap[1].trim().to_string();
                if !p.is_empty() {
                    prompts.push(p);
                }
            }
        }

        sections.push(ToolExample {
            tool: tool.clone(),
            description,
            prompts,
        });
    }

    sections
}
