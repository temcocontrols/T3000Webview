/**
 * Report an Issue — shared types.
 *
 * These mirror the Rust wire types in `api/src/support/model.rs`; the request bodies are
 * camelCase because the backend uses `#[serde(rename_all = "camelCase")]` on inputs.
 */

export type ReportKind = 'bug' | 'feature' | 'support';

export interface ClientContext {
  deviceSerial?: number | null;
  deviceCount?: number | null;
  area: string;
  message: string;
  exeVersion: string;
  windowsVersion: string;
  building: string;
  panel: number;
  logText: string;
}

export type SuggestionSeverity = 'info' | 'warning' | 'critical';

export interface Suggestion {
  rule_id: string;
  severity: SuggestionSeverity | string;
  title: string;
  detail: string;
  action: string;
  doc_id?: string | null;
  doc_title?: string | null;
  doc_url?: string | null;
}

export interface SelfCheckResult {
  matched: boolean;
  suggestions: Suggestion[];
  documents_searched: number;
}

export interface ReportInput {
  kind: ReportKind;
  summary: string;
  details: string;
  expected: string;
  steps: string;
  context: ClientContext;
  logText: string;
  includeLogs: boolean;
  screenshotPaths: string[];
  screenshotDataUrls: string[];
}

export interface DraftResult {
  title: string;
  body: string;
  labels: string[];
  github_url: string;
  mailto_url: string;
  forum_url: string;
}

export interface BundleResult {
  id: string;
  dir: string;
  markdown_path: string;
  files: string[];
  attachments: string[];
}

export interface SendResult {
  ok: boolean;
  route: string;
  issue_number?: number | null;
  issue_url?: string | null;
  url?: string | null;
  message: string;
}

/** How a saved report left T3000, written back by `/api/report/send`. */
export interface StoredSend {
  /** "github" when the token route filed it, "browser" when a prefilled URL was opened. */
  route: string;
  issue_number?: number | null;
  issue_url?: string | null;
  at?: string;
}

export interface StoredReport {
  id: string;
  created: string;
  kind: string;
  title: string;
  dir: string;
  /** What the user wrote first, used as the one-line description in the history list. */
  summary?: string;
  /** Labels the draft suggested. Absent on bundles written before the history existed. */
  labels?: string[];
  /** `screenshot-*.png` files in the bundle folder. */
  screenshots?: number;
  /** File names inside the bundle folder. */
  files?: string[];
  send?: StoredSend | null;
}

export type ReportStep = 'describe' | 'self-check' | 'attach' | 'review' | 'done';

/** C++ `WEBVIEW_MESSAGE_TYPE` values added for the report flow (see BacnetWebView.cpp). */
export const REPORT_ACTIONS = {
  context: 19,
  logs: 20,
  capture: 21,
  clipboard: 22,
} as const;

export interface T3000Context {
  version: string;
  windows: string;
  locale: number;
  building: string;
  panel: number;
  device_serial?: number;
  log_lines: number;
  /** PNG the host took when the menu opened this window, and its bytes as a `data:` URL. */
  pending_shot?: string;
  pending_shot_data?: string;
}

export interface CaptureResult {
  ok: boolean;
  /** Absolute path written by the C++ host; empty when the browser fallback was used. */
  path: string;
  width: number;
  height: number;
  /** Present only for the browser fallback (getDisplayMedia → canvas). */
  dataUrl?: string;
  error?: string;
}
