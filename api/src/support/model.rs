//! Wire types for the report flow.
//!
//! Field names on the wire are snake_case (matching the rest of `/api/*`); request structs
//! accept camelCase from the browser because that is what the React client sends.

use serde::{Deserialize, Serialize};

/// What T3000 knows about itself when the report starts.
///
/// Every field is optional: the browser preview (no WebView2 host) sends only what it has,
/// and the rule table degrades instead of failing.
#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ClientContext {
    #[serde(default)]
    pub device_serial: Option<i32>,
    /// Only sent when the client actually counted the devices; `None` means "unknown" and the
    /// empty-building rule stays quiet.
    #[serde(default)]
    pub device_count: Option<i32>,
    /// Panel / building area the user was working in, e.g. "Inputs".
    #[serde(default)]
    pub area: String,
    /// The user's own words.
    #[serde(default)]
    pub message: String,
    #[serde(default)]
    pub exe_version: String,
    #[serde(default)]
    pub windows_version: String,
    #[serde(default)]
    pub building: String,
    #[serde(default)]
    pub panel: i32,
    /// Tail of the T3000 runtime log captured in-process by the C++ host.
    #[serde(default)]
    pub log_text: String,
}

/// One thing the user can try before filing.
#[derive(Debug, Clone, Serialize)]
pub struct Suggestion {
    pub rule_id: String,
    pub severity: String,
    pub title: String,
    pub detail: String,
    /// The concrete next step, phrased as an instruction.
    pub action: String,
    /// Documentation page that covers this area, when one was found.
    pub doc_id: Option<String>,
    pub doc_title: Option<String>,
    pub doc_url: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct SelfCheckResult {
    /// False means "nothing matched" — the UI shows the straight-to-form path.
    pub matched: bool,
    pub suggestions: Vec<Suggestion>,
    pub documents_searched: usize,
}

/// Which intake route the user picked.
fn default_kind() -> String {
    "issue".to_string()
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReportInput {
    #[serde(default = "default_kind")]
    pub kind: String,
    #[serde(default)]
    pub summary: String,
    #[serde(default)]
    pub details: String,
    #[serde(default)]
    pub expected: String,
    #[serde(default)]
    pub steps: String,
    #[serde(default)]
    pub context: ClientContext,
    #[serde(default)]
    pub log_text: String,
    #[serde(default)]
    pub include_logs: bool,
    /// Absolute paths written by the C++ capture handler (REPORT_CAPTURE).
    #[serde(default)]
    pub screenshot_paths: Vec<String>,
    /// `data:image/png;base64,...` payloads pasted into the page.
    #[serde(default)]
    pub screenshot_data_urls: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct DraftResult {
    pub title: String,
    pub body: String,
    pub labels: Vec<String>,
    /// Prefilled GitHub "new issue" URL — short enough for any browser.
    pub github_url: String,
    pub mailto_url: String,
    pub forum_url: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BundleRequest {
    #[serde(flatten)]
    pub report: ReportInput,
}

#[derive(Debug, Serialize)]
pub struct BundleResult {
    pub id: String,
    pub dir: String,
    pub markdown_path: String,
    /// Every file written into the bundle directory, absolute paths.
    pub files: Vec<String>,
    /// Just the attachments, so the UI can list what is on the clipboard.
    pub attachments: Vec<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SendRequest {
    #[serde(default = "default_kind")]
    pub kind: String,
    pub title: String,
    pub body: String,
    #[serde(default)]
    pub labels: Vec<String>,
    /// Bundle produced by `/api/report/bundle`; issue creation records it in the body.
    #[serde(default)]
    pub bundle_id: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct SendResult {
    pub ok: bool,
    /// "github" when the token route filed it, "browser" when the user must open the URL.
    pub route: String,
    pub issue_number: Option<u64>,
    pub issue_url: Option<String>,
    pub url: Option<String>,
    pub message: String,
}

#[derive(Debug, Serialize)]
pub struct StoredReport {
    pub id: String,
    pub created: String,
    pub kind: String,
    pub title: String,
    pub dir: String,
    /// What the user themselves wrote first, for the one-line description in the history list.
    pub summary: String,
    /// Labels the draft suggested, so the history can show how it was filed.
    pub labels: Vec<String>,
    /// Number of `screenshot-*.png` files in the bundle folder.
    pub screenshots: usize,
    /// File names inside the bundle folder, sorted, for the history details view.
    pub files: Vec<String>,
    /// How the report left T3000, once it has been sent.
    pub send: Option<StoredSend>,
}

/// The send outcome written back into `report.json` after a successful send.
#[derive(Debug, Serialize)]
pub struct StoredSend {
    /// "github" when the token route filed it, "browser" when a URL was handed back.
    pub route: String,
    pub issue_number: Option<u64>,
    pub issue_url: Option<String>,
    pub at: String,
}
