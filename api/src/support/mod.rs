//! T3000 Report — the "Report an Issue" flow behind Help → Report an Issue.
//!
//! Three responsibilities, all local to the machine T3000 runs on:
//!   1. `docs_index`  — search the documentation that ships with the app, so a user can be
//!                      pointed at an existing page before filing anything.
//!   2. `self_check`  — turn the collected context (device, log tail, message) into concrete
//!                      suggestions using a static rule table. No model involvement: the
//!                      remedy text must be the same every time it is shown.
//!   3. `routes`      — `/api/report/*` (self-check, draft, bundle, send, list) and
//!                      `/api/docs/*` (search, page).
//!
//! The client never needs a GitHub token. `send` uses `T3000_REPORT_GITHUB_TOKEN` when the
//! operator configured one, and otherwise hands the page a prefilled URL to open in the
//! default browser.

pub mod docs_index;
pub mod model;
pub mod routes;
pub mod self_check;

pub use routes::create_support_routes;
