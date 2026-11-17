//! `/api/report/*` and `/api/docs/*` — the REST surface behind Help → Report an Issue.
//!
//! Nothing here needs a GitHub account. The token route is an operator convenience: when
//! `T3000_REPORT_GITHUB_TOKEN` is set the issue is filed server-side, otherwise `send` returns
//! a prefilled URL that the C++ host opens in the default browser, where the user's own
//! GitHub session (or the forum) does the rest.
//!
//! Bundles are written to `T3000_REPORT_DIR` (default `./t3000-reports`) so the screenshot and
//! the runtime log survive a failed send — the user can drag the files into the issue editor.

use std::fs;
use std::path::{Path, PathBuf};

use axum::{
    extract::Query,
    http::StatusCode,
    response::Json,
    routing::{get, post},
    Router,
};
use base64::{engine::general_purpose::STANDARD, Engine as _};
use serde::Deserialize;
use serde_json::{json, Value};

use crate::app_state::T3AppState;
use crate::support::docs_index;
use crate::support::model::{
    BundleResult, ClientContext, DraftResult, ReportInput, SelfCheckResult, SendRequest,
    SendResult, StoredReport, StoredSend,
};
use crate::support::self_check;

type ApiError = (StatusCode, Json<Value>);

fn fail(message: impl Into<String>) -> ApiError {
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        Json(json!({ "error": message.into() })),
    )
}

fn bad_request(message: impl Into<String>) -> ApiError {
    (StatusCode::BAD_REQUEST, Json(json!({ "error": message.into() })))
}

/// Repository the prefilled URL points at.
fn github_repo() -> String {
    std::env::var("T3000_REPORT_GITHUB_REPO")
        .ok()
        .filter(|v| !v.trim().is_empty())
        .unwrap_or_else(|| "temcocontrols/T3000_Building_Automation_System".to_string())
}

/// Where bundles are written.
///
/// `T3000_REPORT_DIR` wins so support can point a machine at a shared folder. Otherwise the
/// bundle goes under `%LOCALAPPDATA%\T3000\reports` — never next to the executable, which is
/// `Program Files` on a normal install and is not writable by the user running T3000.
fn report_root() -> PathBuf {
    if let Ok(dir) = std::env::var("T3000_REPORT_DIR") {
        if !dir.trim().is_empty() {
            return PathBuf::from(dir);
        }
    }
    if let Ok(local) = std::env::var("LOCALAPPDATA") {
        if !local.trim().is_empty() {
            return PathBuf::from(local).join("T3000").join("reports");
        }
    }
    let base = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    base.join("t3000-reports")
}

fn url_encode(input: &str) -> String {
    let mut out = String::with_capacity(input.len() * 3);
    for byte in input.as_bytes() {
        match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                out.push(*byte as char)
            }
            _ => out.push_str(&format!("%{:02X}", byte)),
        }
    }
    out
}

fn clamp_chars(value: &str, max: usize) -> String {
    if value.chars().count() <= max {
        return value.to_string();
    }
    let mut out: String = value.chars().take(max).collect();
    out.push_str("...");
    out
}

fn kind_label(kind: &str) -> &'static str {
    match kind.to_lowercase().as_str() {
        "bug" => "Bug",
        "feature" => "Feature request",
        "support" => "Support request",
        _ => "Issue",
    }
}

fn labels_for(kind: &str, ctx: &ClientContext) -> Vec<String> {
    let mut labels = vec![match kind.to_lowercase().as_str() {
        "bug" => "bug",
        "feature" => "enhancement",
        "support" => "question",
        _ => "triage",
    }
    .to_string()];
    labels.push("customer-report".to_string());
    let area = ctx.area.trim().to_lowercase();
    if !area.is_empty() && area.len() <= 24 && area.chars().all(|c| c.is_alphanumeric() || c == '-' || c == ' ') {
        labels.push(area.replace(' ', "-"));
    }
    labels
}

fn environment_block(ctx: &ClientContext, attachments: usize) -> String {
    let mut lines = Vec::new();
    lines.push(format!(
        "- T3000 version: {}",
        if ctx.exe_version.trim().is_empty() {
            "unknown (not captured)".to_string()
        } else {
            ctx.exe_version.clone()
        }
    ));
    lines.push(format!(
        "- Windows: {}",
        if ctx.windows_version.trim().is_empty() {
            "unknown".to_string()
        } else {
            ctx.windows_version.clone()
        }
    ));
    lines.push(format!(
        "- Building: {}",
        if ctx.building.trim().is_empty() {
            "(none)".to_string()
        } else {
            ctx.building.clone()
        }
    ));
    lines.push(format!("- Panel: {}", ctx.panel));
    lines.push(format!(
        "- Device: {}",
        match ctx.device_serial {
            Some(serial) if serial > 0 => serial.to_string(),
            _ => "(none selected)".to_string(),
        }
    ));
    if !ctx.area.trim().is_empty() {
        lines.push(format!("- Screen: {}", ctx.area.trim()));
    }
    lines.push(format!("- Screenshots attached: {}", attachments));
    lines.join("\n")
}

fn build_body(input: &ReportInput, attachments: usize, bundle_id: Option<&str>) -> String {
    let mut body = String::new();

    body.push_str("### What happened\n\n");
    body.push_str(if input.summary.trim().is_empty() {
        "_Not described._"
    } else {
        input.summary.trim()
    });
    body.push_str("\n\n");

    if !input.details.trim().is_empty() {
        body.push_str("### Details\n\n");
        body.push_str(input.details.trim());
        body.push_str("\n\n");
    }

    if !input.steps.trim().is_empty() {
        body.push_str("### Steps to reproduce\n\n");
        body.push_str(input.steps.trim());
        body.push_str("\n\n");
    }

    if !input.expected.trim().is_empty() {
        body.push_str("### What I expected\n\n");
        body.push_str(input.expected.trim());
        body.push_str("\n\n");
    }

    body.push_str("### Environment\n\n");
    body.push_str(&environment_block(&input.context, attachments));
    body.push_str("\n\n");

    if input.include_logs && !input.log_text.trim().is_empty() {
        body.push_str("### Runtime log (last messages)\n\n```\n");
        body.push_str(clamp_chars(input.log_text.trim(), 4000).as_str());
        body.push_str("\n```\n\n");
    }

    if let Some(id) = bundle_id {
        body.push_str(&format!("<!-- t3000-report: {} -->\n", id));
    }

    body
}

fn build_draft(input: &ReportInput) -> DraftResult {
    let attachments = input.screenshot_paths.len() + input.screenshot_data_urls.len();
    let labels = labels_for(&input.kind, &input.context);
    let body = build_body(input, attachments, None);
    let summary = if input.summary.trim().is_empty() {
        "(no summary)".to_string()
    } else {
        clamp_chars(input.summary.trim(), 90)
    };
    let title = format!("[{}] {}", kind_label(&input.kind), summary);

    // Browsers cap the request line; the full text always lives in the bundle on disk.
    let url_body = clamp_chars(&body, 1200);
    let repo = github_repo();
    let github_url = format!(
        "https://github.com/{repo}/issues/new?title={}&body={}&labels={}",
        url_encode(&title),
        url_encode(&format!(
            "{url_body}\n\n_Full report, screenshot and log are attached from the Report page._"
        )),
        url_encode(&labels.join(","))
    );

    let mailto_url = format!(
        "mailto:support@temcocontrols.com?subject={}&body={}",
        url_encode(&title),
        url_encode(&clamp_chars(&body, 1500))
    );

    let forum_url = format!(
        "https://forums.temcocontrols.com/new-topic?title={}&body={}",
        url_encode(&title),
        url_encode(&clamp_chars(&body, 1500))
    );

    DraftResult {
        title,
        body,
        labels,
        github_url,
        mailto_url,
        forum_url,
    }
}

fn decode_data_url(data_url: &str) -> Option<Vec<u8>> {
    let payload = data_url.split_once(',').map(|(_, rest)| rest).unwrap_or(data_url);
    STANDARD.decode(payload.trim()).ok()
}

fn write_screenshots(
    input: &ReportInput,
    dir: &Path,
    written: &mut Vec<PathBuf>,
) -> Result<(), String> {
    let mut index = 0usize;
    for path in &input.screenshot_paths {
        let source = PathBuf::from(path);
        if !source.is_file() {
            continue;
        }
        index += 1;
        let ext = source
            .extension()
            .map(|e| e.to_string_lossy().to_string())
            .filter(|e| !e.is_empty())
            .unwrap_or_else(|| "png".to_string());
        let target = dir.join(format!("screenshot-{}.{}", index, ext));
        fs::copy(&source, &target).map_err(|e| format!("copy {}: {}", source.display(), e))?;
        written.push(target);
    }
    for data_url in &input.screenshot_data_urls {
        let Some(bytes) = decode_data_url(data_url) else {
            continue;
        };
        index += 1;
        let target = dir.join(format!("screenshot-{}.png", index));
        fs::write(&target, bytes).map_err(|e| format!("write {}: {}", target.display(), e))?;
        written.push(target);
    }
    Ok(())
}

// ── handlers ──

async fn self_check_handler(Json(ctx): Json<ClientContext>) -> Json<SelfCheckResult> {
    let (suggestions, documents_searched) = self_check::evaluate(&ctx);
    Json(SelfCheckResult {
        matched: !suggestions.is_empty(),
        suggestions,
        documents_searched,
    })
}

async fn draft_handler(Json(input): Json<ReportInput>) -> Json<DraftResult> {
    Json(build_draft(&input))
}

async fn bundle_handler(Json(input): Json<ReportInput>) -> Result<Json<BundleResult>, ApiError> {
    let stamp = chrono::Local::now().format("%Y%m%d-%H%M%S").to_string();
    let suffix = uuid::Uuid::new_v4().simple().to_string();
    let id = format!("{}-{}", stamp, &suffix[..6]);

    let root = report_root();
    let dir = root.join(&id);
    fs::create_dir_all(&dir).map_err(|e| fail(format!("create {}: {}", dir.display(), e)))?;

    let mut files: Vec<PathBuf> = Vec::new();
    let mut attachments: Vec<PathBuf> = Vec::new();
    write_screenshots(&input, &dir, &mut attachments).map_err(fail)?;

    let draft = build_draft(&input);
    let markdown = format!("# {}\n\n{}", draft.title, draft.body);
    let markdown_path = dir.join("report.md");
    fs::write(&markdown_path, &markdown).map_err(|e| fail(format!("write report.md: {}", e)))?;
    files.push(markdown_path.clone());

    if input.include_logs && !input.log_text.trim().is_empty() {
        let log_path = dir.join("runtime.log");
        fs::write(&log_path, input.log_text.as_bytes())
            .map_err(|e| fail(format!("write runtime.log: {}", e)))?;
        files.push(log_path);
    }

    let payload = json!({
        "id": id,
        "created": chrono::Local::now().to_rfc3339(),
        "kind": input.kind,
        "title": draft.title,
        "labels": draft.labels,
        "input": input,
    });
    let json_path = dir.join("report.json");
    fs::write(
        &json_path,
        serde_json::to_vec_pretty(&payload).unwrap_or_default(),
    )
    .map_err(|e| fail(format!("write report.json: {}", e)))?;
    files.push(json_path);

    files.extend(attachments.iter().cloned());

    Ok(Json(BundleResult {
        id,
        dir: dir.display().to_string(),
        markdown_path: markdown_path.display().to_string(),
        files: files.iter().map(|p| p.display().to_string()).collect(),
        attachments: attachments.iter().map(|p| p.display().to_string()).collect(),
    }))
}

async fn send_handler(Json(req): Json<SendRequest>) -> Result<Json<SendResult>, ApiError> {
    let repo = github_repo();
    let bundle_id = req.bundle_id.clone();
    let body = if let Some(bundle) = req.bundle_id.as_deref() {
        format!("{}\n\n<!-- t3000-report: {} -->", req.body, bundle)
    } else {
        req.body.clone()
    };

    let token = std::env::var("T3000_REPORT_GITHUB_TOKEN").unwrap_or_default();
    if !token.trim().is_empty() {
        let client = reqwest::Client::new();
        let response = client
            .post(format!("https://api.github.com/repos/{}/issues", repo))
            .header("User-Agent", "t3000-report")
            .header("Accept", "application/vnd.github+json")
            .header("Authorization", format!("Bearer {}", token.trim()))
            .json(&json!({
                "title": req.title,
                "body": body,
                "labels": req.labels,
            }))
            .send()
            .await;

        match response {
            Ok(res) if res.status().is_success() => {
                let value: Value = res.json().await.unwrap_or_else(|_| json!({}));
                let result = SendResult {
                    ok: true,
                    route: "github".to_string(),
                    issue_number: value.get("number").and_then(|v| v.as_u64()),
                    issue_url: value
                        .get("html_url")
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string()),
                    url: None,
                    message: "Report filed on GitHub.".to_string(),
                };
                record_send(bundle_id.as_deref(), &result);
                return Ok(Json(result));
            }
            Ok(res) => {
                let status = res.status();
                let text = res.text().await.unwrap_or_default();
                tracing::warn!("report send failed: {} {}", status, clamp_chars(&text, 400));
            }
            Err(e) => tracing::warn!("report send error: {}", e),
        }
    }

    // No token, or the API call failed: hand the caller a URL it can open.
    let url = format!(
        "https://github.com/{repo}/issues/new?title={}&body={}&labels={}",
        url_encode(&req.title),
        url_encode(&clamp_chars(&body, 1500)),
        url_encode(&req.labels.join(","))
    );
    let result = SendResult {
        ok: true,
        route: "browser".to_string(),
        issue_number: None,
        issue_url: None,
        url: Some(url),
        message: "Open the link to file the report with your own GitHub account.".to_string(),
    };
    record_send(bundle_id.as_deref(), &result);
    Ok(Json(result))
}

/// Write the send outcome back into `<bundle>/report.json`, so the history can show later how the
/// report left T3000. Best effort: a read-only or hand-edited bundle must not fail the send.
fn record_send(bundle_id: Option<&str>, result: &SendResult) {
    let Some(id) = bundle_id else {
        return;
    };
    if id.is_empty() || id.contains("..") || id.contains('/') || id.contains('\\') {
        return;
    }
    let path = report_root().join(id).join("report.json");
    let Ok(text) = fs::read_to_string(&path) else {
        return;
    };
    let Ok(mut value) = serde_json::from_str::<Value>(&text) else {
        return;
    };
    let Some(object) = value.as_object_mut() else {
        return;
    };
    object.insert(
        "send".to_string(),
        json!({
            "route": result.route,
            "issue_number": result.issue_number,
            "issue_url": result.issue_url,
            "at": chrono::Local::now().to_rfc3339(),
        }),
    );
    if let Ok(bytes) = serde_json::to_vec_pretty(&value) {
        let _ = fs::write(&path, bytes);
    }
}

/// `screenshot-*.png` files in a bundle folder.
fn count_screenshots(dir: &Path) -> usize {
    fs::read_dir(dir)
        .map(|entries| {
            entries
                .flatten()
                .filter(|entry| {
                    let name = entry.file_name().to_string_lossy().to_lowercase();
                    name.starts_with("screenshot-") && name.ends_with(".png")
                })
                .count()
        })
        .unwrap_or(0)
}

/// File names inside a bundle folder, sorted, for the history details view.
fn list_files(dir: &Path) -> Vec<String> {
    let mut names: Vec<String> = fs::read_dir(dir)
        .map(|entries| {
            entries
                .flatten()
                .filter(|entry| entry.path().is_file())
                .map(|entry| entry.file_name().to_string_lossy().to_string())
                .collect()
        })
        .unwrap_or_default();
    names.sort();
    names
}

async fn list_handler() -> Json<Value> {
    let root = report_root();
    let mut items: Vec<StoredReport> = Vec::new();
    if let Ok(entries) = fs::read_dir(&root) {
        for entry in entries.flatten() {
            let dir = entry.path();
            if !dir.is_dir() {
                continue;
            }
            let payload = match fs::read_to_string(dir.join("report.json")) {
                Ok(text) => text,
                Err(_) => continue,
            };
            let value: Value = match serde_json::from_str(&payload) {
                Ok(v) => v,
                Err(_) => continue,
            };
            items.push(StoredReport {
                id: value
                    .get("id")
                    .and_then(|v| v.as_str())
                    .unwrap_or_default()
                    .to_string(),
                created: value
                    .get("created")
                    .and_then(|v| v.as_str())
                    .unwrap_or_default()
                    .to_string(),
                kind: value
                    .get("kind")
                    .and_then(|v| v.as_str())
                    .unwrap_or("issue")
                    .to_string(),
                title: value
                    .get("title")
                    .and_then(|v| v.as_str())
                    .unwrap_or_default()
                    .to_string(),
                dir: dir.display().to_string(),
                summary: value
                    .get("input")
                    .and_then(|input| input.get("summary"))
                    .and_then(|v| v.as_str())
                    .unwrap_or_default()
                    .to_string(),
                labels: value
                    .get("labels")
                    .and_then(|v| v.as_array())
                    .map(|labels| {
                        labels
                            .iter()
                            .filter_map(|label| label.as_str())
                            .map(|label| label.to_string())
                            .collect()
                    })
                    .unwrap_or_default(),
                screenshots: count_screenshots(&dir),
                files: list_files(&dir),
                send: value.get("send").map(|send| StoredSend {
                    route: send
                        .get("route")
                        .and_then(|v| v.as_str())
                        .unwrap_or("unknown")
                        .to_string(),
                    issue_number: send.get("issue_number").and_then(|v| v.as_u64()),
                    issue_url: send
                        .get("issue_url")
                        .and_then(|v| v.as_str())
                        .map(|url| url.to_string()),
                    at: send
                        .get("at")
                        .and_then(|v| v.as_str())
                        .unwrap_or_default()
                        .to_string(),
                }),
            });
        }
    }
    items.sort_by(|a, b| b.id.cmp(&a.id));
    Json(json!({ "reports": items, "total": items.len(), "dir": root.display().to_string() }))
}

#[derive(Debug, Deserialize)]
struct SearchQuery {
    #[serde(default)]
    q: String,
    #[serde(default)]
    limit: Option<usize>,
}

async fn docs_search_handler(Query(params): Query<SearchQuery>) -> Json<Value> {
    let limit = params.limit.unwrap_or(5).clamp(1, 25);
    let results = docs_index::search(&params.q, limit);
    Json(json!({
        "query": params.q,
        "results": results,
        "total_docs": docs_index::count(),
    }))
}

#[derive(Debug, Deserialize)]
struct PageQuery {
    #[serde(default)]
    id: String,
}

async fn docs_page_handler(Query(params): Query<PageQuery>) -> Result<Json<Value>, ApiError> {
    if params.id.trim().is_empty() {
        return Err(bad_request("id is required"));
    }
    match docs_index::page(params.id.trim()) {
        Some((title, markdown)) => Ok(Json(json!({
            "id": params.id,
            "title": title,
            "markdown": markdown,
        }))),
        None => Err((
            StatusCode::NOT_FOUND,
            Json(json!({ "error": "document not found" })),
        )),
    }
}

/// Mount in `server.rs` via `.merge(crate::support::create_support_routes())`.
pub fn create_support_routes() -> Router<T3AppState> {
    Router::new()
        .route("/api/report/self-check", post(self_check_handler))
        .route("/api/report/draft", post(draft_handler))
        .route("/api/report/bundle", post(bundle_handler))
        .route("/api/report/send", post(send_handler))
        .route("/api/report/list", get(list_handler))
        .route("/api/docs/search", get(docs_search_handler))
        .route("/api/docs/page", get(docs_page_handler))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::support::model::ReportInput;

    fn sample_input() -> ReportInput {
        ReportInput {
            kind: "bug".to_string(),
            summary: "trend log shows no history".to_string(),
            details: "enabled it yesterday".to_string(),
            expected: "a chart".to_string(),
            steps: "1. open Trend Logs".to_string(),
            context: ClientContext {
                device_serial: Some(12345),
                exe_version: "2026.11".to_string(),
                windows_version: "Windows 11".to_string(),
                building: "HQ".to_string(),
                panel: 1,
                ..Default::default()
            },
            log_text: "status: connected".to_string(),
            include_logs: true,
            screenshot_paths: Vec::new(),
            screenshot_data_urls: Vec::new(),
        }
    }

    #[tokio::test]
    async fn self_check_endpoint_answers_with_a_rule() {
        let ctx = ClientContext {
            message: "the trend log is not saved".to_string(),
            ..Default::default()
        };
        let Json(result) = self_check_handler(Json(ctx)).await;
        assert!(result.matched, "expected at least one suggestion");
        assert!(
            result.suggestions.iter().any(|s| s.rule_id == "trendlog-not-saved"),
            "got {:?}",
            result.suggestions.iter().map(|s| &s.rule_id).collect::<Vec<_>>()
        );
    }

    #[tokio::test]
    async fn draft_produces_a_usable_github_url() {
        let Json(draft) = draft_handler(Json(sample_input())).await;
        assert!(draft.title.starts_with("[Bug] "), "title was {}", draft.title);
        assert!(draft.github_url.contains("/issues/new?title="), "{}", draft.github_url);
        assert!(draft.labels.contains(&"bug".to_string()));
        assert!(draft.labels.contains(&"customer-report".to_string()));
        assert!(draft.body.contains("### Environment"));
        assert!(draft.body.contains("2026.11"));
        // The URL must stay short enough for a browser request line.
        assert!(draft.github_url.len() < 8000, "url was {} chars", draft.github_url.len());
    }

    #[tokio::test]
    async fn bundle_send_and_list_round_trip() {
        std::env::remove_var("T3000_REPORT_GITHUB_TOKEN");
        let root = std::env::temp_dir().join(format!("t3000-report-test-{}", std::process::id()));
        std::env::set_var("T3000_REPORT_DIR", &root);
        let shot = std::env::temp_dir().join(format!("t3000-shot-{}.png", std::process::id()));
        std::fs::write(&shot, [0x89u8, b'P', b'N', b'G']).unwrap();

        let mut input = sample_input();
        input.screenshot_paths = vec![shot.display().to_string()];
        input.screenshot_data_urls = vec!["data:image/png;base64,iVBORw0KGgo=".to_string()];

        let Json(bundle) = bundle_handler(Json(input)).await.expect("bundle should be written");
        assert!(Path::new(&bundle.markdown_path).is_file());
        assert_eq!(bundle.attachments.len(), 2, "one copied file, one pasted image");
        assert!(bundle.files.len() >= 3, "report.json, report.md and the attachments");
        let listed = list_handler().await;
        assert_eq!(listed.0["total"], 1, "the bundle must show up in the list");

        // The list carries what the history UI shows, straight from report.json.
        let entry = &listed.0["reports"][0];
        assert_eq!(entry["summary"], "trend log shows no history");
        assert_eq!(entry["screenshots"], 2);
        assert!(
            entry["files"]
                .as_array()
                .unwrap()
                .iter()
                .any(|f| f == "report.json"),
            "files should list report.json, got {:?}",
            entry["files"]
        );
        assert!(entry["send"].is_null(), "nothing has been sent yet");

        // Sending with no token must produce a browser URL and never reach GitHub.
        let Json(send) = send_handler(Json(SendRequest {
            kind: "bug".to_string(),
            title: "[Bug] trend log shows no history".to_string(),
            body: "### What happened\n\nnothing".to_string(),
            labels: vec!["bug".to_string()],
            bundle_id: Some(bundle.id.clone()),
        }))
        .await
        .expect("send should not fail without a token");
        assert_eq!(send.route, "browser", "no token means no API call");
        assert!(send.issue_number.is_none());
        assert!(send.url.unwrap().contains("/issues/new?title="));

        // The outcome is written back, so the history can show how it left T3000.
        let after = list_handler().await;
        let entry = &after.0["reports"][0];
        assert_eq!(entry["send"]["route"], "browser");
        let stored: Value = serde_json::from_str(
            &std::fs::read_to_string(Path::new(&bundle.dir).join("report.json")).unwrap(),
        )
        .unwrap();
        assert!(stored.get("send").is_some(), "report.json must keep the outcome");

        std::fs::remove_dir_all(&root).ok();
        std::fs::remove_file(&shot).ok();
        std::env::remove_var("T3000_REPORT_DIR");
    }

    #[tokio::test]
    async fn send_without_a_token_hands_back_a_browser_url() {
        std::env::remove_var("T3000_REPORT_GITHUB_TOKEN");
        let Json(result) = send_handler(Json(SendRequest {
            kind: "bug".to_string(),
            title: "[Bug] something".to_string(),
            body: "### What happened\n\nnothing".to_string(),
            labels: vec!["bug".to_string()],
            bundle_id: Some("20260101-000000-abcdef".to_string()),
        }))
        .await
        .expect("send should not fail without a token");

        assert_eq!(result.route, "browser");
        assert!(result.ok);
        let url = result.url.expect("a browser route must carry a url");
        assert!(url.contains("/issues/new?title="), "{}", url);
    }

    #[tokio::test]
    async fn docs_page_reports_a_missing_document() {
        let result = docs_page_handler(Query(PageQuery {
            id: "this/page/does/not/exist".to_string(),
        }))
        .await;
        assert_eq!(result.err().map(|(status, _)| status), Some(StatusCode::NOT_FOUND));
    }

    #[tokio::test]
    async fn docs_search_ranks_real_pages_when_docs_are_present() {
        if std::env::var("T3000_DOCS_ROOT").is_ok() {
            assert!(
                docs_index::count() > 0,
                "T3000_DOCS_ROOT is set but no markdown was indexed"
            );
        }
        if docs_index::count() == 0 {
            // No documentation on this machine; nothing to rank.
            return;
        }
        let Json(result) = docs_search_handler(Query(SearchQuery {
            q: "trend log".to_string(),
            limit: Some(3),
        }))
        .await;
        let hits = result["results"].as_array().cloned().unwrap_or_default();
        assert!(!hits.is_empty(), "a documented phrase must match at least one page");
        assert!(
            hits[0]["title"].as_str().map(|t| !t.is_empty()).unwrap_or(false),
            "every hit needs a title"
        );
    }
}
