//! Flow-based trace logging — FlowHandle
//!
//! A FlowHandle represents one named operation (DLL_INIT, SYNC_CYCLE, etc.)
//! that spans multiple steps. It writes to T3_FLOW / T3_FLOW_STEP in local
//! SQLite (webview_t3_device.db) only — never to MSSQL or any remote DB.
//!
//! Usage:
//!   let flow = FlowHandle::start(&db, "SYNC_CYCLE", "ffi_sync", 0, None).await;
//!   flow.step(&db, "get_panels", "info", "ok", 120, "Got 3 panels", None).await;
//!   flow.done(&db, "ok").await;

use chrono::Local;
use sea_orm::{ConnectionTrait, DatabaseConnection, Statement};
use std::sync::atomic::{AtomicI64, Ordering};
use std::sync::Arc;
use uuid::Uuid;

/// Maximum number of T3_FLOW rows to keep.  Oldest rows are trimmed on insert.
const FLOW_ROW_CAP: i64 = 10_000;

// ---------------------------------------------------------------------------
// FlowHandle
// ---------------------------------------------------------------------------

/// In-memory handle for one active flow.  Clone is cheap (inner Arc).
#[derive(Clone)]
pub struct FlowHandle {
    inner: Arc<FlowInner>,
}

struct FlowInner {
    pub flow_id: String,
    pub flow_type: String,
    seq: AtomicI64,
}

impl FlowHandle {
    // -----------------------------------------------------------------------
    // Public constructor
    // -----------------------------------------------------------------------

    /// Open a new flow row in T3_FLOW and return a handle.
    ///
    /// * `flow_type`   – constant identifier, e.g. `"SYNC_CYCLE"`, `"DLL_INIT"`
    /// * `trigger_src` – who started it, e.g. `"ffi_sync"`, `"user"`, `"scheduler"`
    /// * `total_steps` – expected step count (may be 0 if unknown)
    /// * `meta`        – optional free-form JSON string
    pub async fn start(
        db: &DatabaseConnection,
        flow_type: &str,
        trigger_src: &str,
        total_steps: i64,
        meta: Option<&str>,
    ) -> Self {
        let flow_id = Uuid::new_v4().to_string();
        let now = Local::now().timestamp_millis();
        let hostname = hostname();

        let sql = format!(
            "INSERT INTO T3_FLOW \
             (flow_id, flow_type, trigger_src, started_at, status, hostname, total_steps, meta) \
             VALUES ('{}','{}','{}',{},'running','{}',{},{})",
            esc(&flow_id),
            esc(flow_type),
            esc(trigger_src),
            now,
            esc(&hostname),
            total_steps,
            meta.map(|s| format!("'{}'", esc(s))).unwrap_or_else(|| "NULL".into()),
        );

        if let Err(e) = db.execute(Statement::from_string(sea_orm::DatabaseBackend::Sqlite, sql)).await {
            eprintln!("[flow] INSERT T3_FLOW failed: {}", e);
        }

        // Trim to cap
        let trim_sql = format!(
            "DELETE FROM T3_FLOW WHERE id NOT IN \
             (SELECT id FROM T3_FLOW ORDER BY started_at DESC LIMIT {})",
            FLOW_ROW_CAP
        );
        let _ = db.execute(Statement::from_string(sea_orm::DatabaseBackend::Sqlite, trim_sql)).await;

        FlowHandle {
            inner: Arc::new(FlowInner {
                flow_id,
                flow_type: flow_type.to_string(),
                seq: AtomicI64::new(0),
            }),
        }
    }

    // -----------------------------------------------------------------------
    // Accessors
    // -----------------------------------------------------------------------

    pub fn flow_id(&self) -> &str {
        &self.inner.flow_id
    }

    pub fn flow_type(&self) -> &str {
        &self.inner.flow_type
    }

    // -----------------------------------------------------------------------
    // Step recording
    // -----------------------------------------------------------------------

    /// Record one step. All `details` are stored inline in the DB row.
    ///
    /// * `step_name`  – short constant name, e.g. `"get_panels"`, `"write_db"`
    /// * `level`      – `"debug"` | `"info"` | `"warn"` | `"error"`
    /// * `source`     – subsystem, e.g. `"ffi_sync"`, `"api"`, `"react"`
    /// * `status`     – `"ok"` | `"error"` | `"skip"`
    /// * `duration_ms`– elapsed ms for this step (0 if unknown)
    /// * `message`    – short human-readable message
    /// * `details`    – optional payload stored inline in the DB
    pub async fn step(
        &self,
        db: &DatabaseConnection,
        step_name: &str,
        level: &str,
        source: &str,
        status: &str,
        duration_ms: i64,
        message: &str,
        details: Option<&str>,
    ) {
        let seq = self.inner.seq.fetch_add(1, Ordering::Relaxed);
        self.insert_step(db, seq, step_name, level, source, status, duration_ms, message,
            details, None).await;
    }

    /// For FFI message action steps (GET_PANELS_LIST, LOGGING_DATA, etc.).
    /// Writes the full `details` payload to a file on disk; only `message`
    /// (the short summary) is kept in the DB row (`payload_ref` holds the path).
    pub async fn step_ffi(
        &self,
        db: &DatabaseConnection,
        step_name: &str,
        level: &str,
        source: &str,
        status: &str,
        duration_ms: i64,
        message: &str,
        details: Option<&str>,
    ) {
        let seq = self.inner.seq.fetch_add(1, Ordering::Relaxed);
        let payload_ref = write_detail_file(&self.inner.flow_id, seq, details).await;
        self.insert_step(db, seq, step_name, level, source, status, duration_ms, message,
            None, payload_ref.as_deref()).await;
    }

    async fn insert_step(
        &self,
        db: &DatabaseConnection,
        seq: i64,
        step_name: &str,
        level: &str,
        source: &str,
        status: &str,
        duration_ms: i64,
        message: &str,
        inline_details: Option<&str>,
        payload_ref: Option<&str>,
    ) {
        let now_ms = Local::now().timestamp_millis();
        let ts_fmt = Local::now().format("%Y-%m-%d %H:%M:%S%.3f").to_string();
        let sql = format!(
            "INSERT INTO T3_FLOW_STEP \
             (flow_id, seq, step_name, level, source, status, duration_ms, message, details, payload_ref, ts_unix, ts_fmt) \
             VALUES ('{}',{},'{}','{}','{}','{}',{},'{}',{},{},{},'{}')",
            esc(&self.inner.flow_id),
            seq,
            esc(step_name),
            esc(level),
            esc(source),
            esc(status),
            duration_ms,
            esc(message),
            inline_details.as_deref().map(|s| format!("'{}'", esc(s))).unwrap_or_else(|| "NULL".into()),
            payload_ref.as_deref().map(|s| format!("'{}'", esc(s))).unwrap_or_else(|| "NULL".into()),
            now_ms,
            esc(&ts_fmt),
        );

        if let Err(e) = db.execute(Statement::from_string(sea_orm::DatabaseBackend::Sqlite, sql)).await {
            eprintln!("[flow] INSERT T3_FLOW_STEP failed: {}", e);
            return;
        }

        // Increment done_steps on the parent flow
        let upd = format!(
            "UPDATE T3_FLOW SET done_steps = done_steps + 1 {} WHERE flow_id = '{}'",
            if status == "error" { ", error_count = error_count + 1" } else { "" },
            esc(&self.inner.flow_id),
        );
        let _ = db.execute(Statement::from_string(sea_orm::DatabaseBackend::Sqlite, upd)).await;
    }

    // -----------------------------------------------------------------------
    // Finalise
    // -----------------------------------------------------------------------

    /// Mark the flow as finished. `status` should be `"ok"` or `"error"`.
    pub async fn done(&self, db: &DatabaseConnection, status: &str) {
        let now = Local::now().timestamp_millis();
        let sql = format!(
            "UPDATE T3_FLOW SET status = '{}', ended_at = {} WHERE flow_id = '{}'",
            esc(status),
            now,
            esc(&self.inner.flow_id),
        );
        if let Err(e) = db.execute(Statement::from_string(sea_orm::DatabaseBackend::Sqlite, sql)).await {
            eprintln!("[flow] UPDATE T3_FLOW (done) failed: {}", e);
        }
    }
}

// ---------------------------------------------------------------------------
// File writer for FFI steps
// ---------------------------------------------------------------------------

/// Write `details` to `T3WebLog/YYYY-MM/MMDD/{flow_id}_{seq}.txt`.
/// Returns the file path on success, or `None` if `details` is empty or write fails.
async fn write_detail_file(
    flow_id: &str,
    seq: i64,
    details: Option<&str>,
) -> Option<String> {
    let text = match details {
        Some(s) if !s.is_empty() => s,
        _ => return None,
    };

    let now = Local::now();
    let month = now.format("%Y-%m").to_string();
    let day   = now.format("%m%d").to_string();
    let runtime_path = crate::constants::get_t3000_runtime_path();
    let dir = runtime_path.join("T3WebLog").join(&month).join(&day);
    let file_name = format!("{}_{}.txt", flow_id, seq);
    let file_path = dir.join(&file_name);

    if let Err(e) = std::fs::create_dir_all(&dir) {
        eprintln!("[flow] create_dir_all {:?} failed: {}", dir, e);
        return None;
    }
    if let Err(e) = std::fs::write(&file_path, text.as_bytes()) {
        eprintln!("[flow] write payload file {:?} failed: {}", file_path, e);
        return None;
    }
    Some(file_path.to_string_lossy().into_owned())
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/// Escape single-quotes for inline SQL (not a substitute for parameterised queries,
/// but consistent with the existing pattern used across this codebase).
fn esc(s: &str) -> String {
    s.replace('\'', "''")
}

fn hostname() -> String {
    std::env::var("COMPUTERNAME")
        .or_else(|_| std::env::var("HOSTNAME"))
        .unwrap_or_else(|_| "unknown".to_string())
}
