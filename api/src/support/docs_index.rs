//! Markdown index over the documentation that ships next to the app.
//!
//! The point is to answer "is this already documented?" *before* the user files anything, so
//! it has to run without network and without a model. Every `.md` under the docs root is
//! indexed once per process; `page` always re-reads from disk so edited files show up.
//!
//! Root resolution order:
//!   1. `T3000_DOCS_ROOT` (absolute path, set by whoever ships the build)
//!   2. `public/docs` relative to the process working directory (packaged web app)
//!   3. `docs`, then the `..` variants — `docs/` is where this repository keeps its 300+ pages,
//!      so running the API from `api/` or from the repository root both find them.
//!   4. walking up from the working directory and from the executable, which covers a server
//!      started from `api/target/debug` or from the packaged `dist` folder.

use std::path::{Path, PathBuf};

use once_cell::sync::OnceCell;
use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct DocMatch {
    pub id: String,
    pub title: String,
    pub score: i32,
    pub excerpt: String,
}

#[derive(Debug, Clone)]
struct DocEntry {
    id: String,
    title: String,
    path: PathBuf,
    headings: String,
    body_lower: String,
    body: String,
}

static INDEX: OnceCell<Vec<DocEntry>> = OnceCell::new();

/// Where the markdown lives, if it was found at all.
pub fn root() -> Option<PathBuf> {
    if let Ok(explicit) = std::env::var("T3000_DOCS_ROOT") {
        let p = PathBuf::from(explicit);
        if p.is_dir() {
            return Some(p);
        }
    }
    let candidates = [
        "public/docs",
        "docs",
        "../docs",
        "../../docs",
        "../public/docs",
        "../../public/docs",
    ];
    let mut fallback: Option<PathBuf> = None;
    for candidate in candidates {
        let p = PathBuf::from(candidate);
        if is_docs_root(&p) {
            return Some(p);
        }
        if fallback.is_none() && p.is_dir() {
            fallback = Some(p);
        }
    }

    /*
     * The API is launched from `api/`, `api/target/debug` or the packaged `dist` depending on how
     * it was started, so the fixed list above misses the repository root in some setups and the
     * page then says "checked 0 pages". Walk up from both the working directory and the executable
     * instead — the docs always sit next to the source tree or the packaged app.
     */
    let starts = [
        std::env::current_dir().ok(),
        std::env::current_exe()
            .ok()
            .and_then(|exe| exe.parent().map(|dir| dir.to_path_buf())),
    ];
    for start in starts.into_iter().flatten() {
        for ancestor in start.ancestors().take(5) {
            let p = ancestor.join("docs");
            if is_docs_root(&p) {
                return Some(p);
            }
        }
    }

    fallback
}

/// Only accept a folder that looks like our documentation, so an unrelated `docs` in a parent
/// directory is never indexed.
fn is_docs_root(path: &Path) -> bool {
    path.is_dir() && path.join("t3000").is_dir()
}

fn collect_markdown(dir: &Path, out: &mut Vec<PathBuf>) {
    let entries = match std::fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return,
    };
    for entry in entries.flatten() {
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();
        if name.starts_with('.') || name == "node_modules" || name == "target" {
            continue;
        }
        if path.is_dir() {
            collect_markdown(&path, out);
        } else if name.to_lowercase().ends_with(".md") {
            out.push(path);
        }
    }
}

/// First `# ` heading wins; the file name is the fallback so nothing is ever untitled.
fn title_of(text: &str, path: &Path) -> String {
    for line in text.lines().take(40) {
        let trimmed = line.trim();
        if let Some(rest) = trimmed.strip_prefix("# ") {
            let t = rest.trim();
            if !t.is_empty() {
                return t.to_string();
            }
        }
    }
    path.file_stem()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_else(|| "Documentation".to_string())
}

fn build_index() -> Vec<DocEntry> {
    let root = match root() {
        Some(r) => r,
        None => return Vec::new(),
    };
    let mut files = Vec::new();
    collect_markdown(&root, &mut files);

    let mut entries = Vec::with_capacity(files.len());
    for path in files {
        let text = match std::fs::read_to_string(&path) {
            Ok(t) => t,
            Err(_) => continue,
        };
        let id = path
            .strip_prefix(&root)
            .unwrap_or(&path)
            .to_string_lossy()
            .replace('\\', "/")
            .trim_end_matches(".md")
            .trim_end_matches(".MD")
            .to_string();
        let title = title_of(&text, &path);
        let headings = text
            .lines()
            .filter(|l| l.trim_start().starts_with('#'))
            .collect::<Vec<_>>()
            .join(" ")
            .to_lowercase();
        entries.push(DocEntry {
            id,
            title,
            path,
            headings,
            body_lower: text.to_lowercase(),
            body: text,
        });
    }
    entries
}

fn index() -> &'static Vec<DocEntry> {
    INDEX.get_or_init(build_index)
}

fn excerpt_of(doc: &DocEntry, terms: &[String]) -> String {
    // Slicing by byte offset is only safe when lowercasing did not change length.
    if doc.body_lower.len() == doc.body.len() {
        for term in terms {
            if let Some(at) = doc.body_lower.find(term.as_str()) {
                let start = doc.body[..at].rfind('\n').map(|n| n + 1).unwrap_or(0);
                let end = doc.body[start..]
                    .find('\n')
                    .map(|n| start + n)
                    .unwrap_or(doc.body.len());
                let line = doc.body[start..end].trim();
                if !line.is_empty() {
                    return truncate_chars(line, 180);
                }
            }
        }
    }
    truncate_chars(doc.body.trim(), 180)
}

fn truncate_chars(text: &str, max: usize) -> String {
    let mut out = String::with_capacity(max + 3);
    for (i, ch) in text.chars().enumerate() {
        if i >= max {
            out.push_str("...");
            break;
        }
        out.push(ch);
    }
    out.replace('\n', " ")
}

/// Ranked search over the shipped documentation.
pub fn search(query: &str, limit: usize) -> Vec<DocMatch> {
    let query = query.trim().to_lowercase();
    if query.len() < 2 {
        return Vec::new();
    }
    let terms: Vec<String> = query
        .split(|c: char| !c.is_alphanumeric() && c != '-' && c != '_')
        .filter(|t| t.len() >= 3)
        .map(|t| t.to_string())
        .collect();
    if terms.is_empty() {
        return Vec::new();
    }

    let mut scored: Vec<DocMatch> = Vec::new();
    for doc in index() {
        let title_lower = doc.title.to_lowercase();
        let mut score = 0i32;
        for term in &terms {
            if title_lower.contains(term.as_str()) {
                score += 20;
            }
            if doc.id.to_lowercase().contains(term.as_str()) {
                score += 10;
            }
            if doc.headings.contains(term.as_str()) {
                score += 6;
            }
            let hits = doc.body_lower.matches(term.as_str()).count();
            if hits > 0 {
                score += std::cmp::min(hits, 20) as i32;
            }
        }
        if score > 0 {
            scored.push(DocMatch {
                id: doc.id.clone(),
                title: doc.title.clone(),
                score,
                excerpt: excerpt_of(doc, &terms),
            });
        }
    }
    scored.sort_by(|a, b| b.score.cmp(&a.score).then_with(|| a.id.cmp(&b.id)));
    scored.truncate(limit);
    scored
}

/// Raw markdown for one page, re-read from disk.
pub fn page(id: &str) -> Option<(String, String)> {
    let wanted = id.replace('\\', "/");
    // Prefer the index (it holds the resolved path), then fall back to a direct join so a
    // page added after startup is still readable.
    if let Some(entry) = index().iter().find(|d| d.id == wanted) {
        if let Ok(text) = std::fs::read_to_string(&entry.path) {
            return Some((title_of(&text, &entry.path), text));
        }
    }
    let root = root()?;
    let path = root.join(format!("{}.md", wanted));
    let text = std::fs::read_to_string(&path).ok()?;
    Some((title_of(&text, &path), text))
}

/// Number of indexed pages — surfaced so the UI can say "searched N pages".
pub fn count() -> usize {
    index().len()
}
