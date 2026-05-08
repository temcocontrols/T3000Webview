use std::path::PathBuf;

/// Enable/disable Partition Monitor Service (hourly database maintenance)
/// Set to false to disable partition checks, WAL cleanup, and size monitoring
pub const ENABLE_PARTITION_MONITOR_SERVICE: bool = false;

/// Get the base runtime directory where T3000 application stores its files
/// Checks TEMCO_T3000_PATH environment variable first, then falls back to exe directory
pub fn get_t3000_runtime_path() -> PathBuf {
    // First check if environment variable is set (for both dev and production)
    if let Ok(env_path) = std::env::var("TEMCO_T3000_PATH") {
        let path = PathBuf::from(env_path);
        if path.exists() {
            return path;
        }
    }

    #[cfg(debug_assertions)]
    {
        // Development mode: use relative path from project root
        let dev_path = PathBuf::from("../T3000_Building_Automation_System/T3000 Output/Debug");
        if dev_path.exists() {
            return dev_path;
        }
    }

    #[cfg(not(debug_assertions))]
    {
        // Production mode: use current executable directory
        if let Ok(exe_path) = std::env::current_exe() {
            if let Some(parent) = exe_path.parent() {
                return parent.to_path_buf();
            }
        }
    }

    // Final fallback to current directory
    std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."))
}

/// Get the database directory path within the T3000 runtime folder
pub fn get_t3000_database_path() -> PathBuf {
    get_t3000_runtime_path().join("Database")
}

/// Get the T3000 log directory path
pub fn get_t3000_log_path() -> PathBuf {
    get_t3000_runtime_path().join("T3WebLog")
}

// ── Activity Log Category Constants ──────────────────────────────────────────
//
// Group A — Always written to local SQLite (low-frequency, system/operator):
//   STARTUP | AUTH | CONFIG | MAINTENANCE
//
// Group B — MSSQL preferred, SQLite fallback (high-frequency, operational):
//   POLL | DEVICE | TRENDLOG
//
// Group C — Optional debug categories, off by default (very high volume):
//   API_REQ | WEBSOCKET | FFI_CALL

/// Service lifecycle: DLL load, server init, DB connect, sampling state changes
pub const CAT_STARTUP: &str = "STARTUP";
/// Authentication events: login, logout, session (placeholder — no accounts yet)
pub const CAT_AUTH: &str = "AUTH";
/// Operator-initiated config changes: sync interval, rediscover interval, settings
pub const CAT_CONFIG: &str = "CONFIG";
/// DB maintenance: migration run/warn, partition created/skipped, DB size warnings
pub const CAT_MAINTENANCE: &str = "MAINTENANCE";

/// Device poll cycle: device count, ok/fail totals, GET_PANELS_LIST, policy skips
pub const CAT_POLL: &str = "POLL";
/// Per-device sync result: points written, FFI error, JSON parse error, serial=0 skip
pub const CAT_DEVICE: &str = "DEVICE";
/// Trendlog config sync summary and data write results
pub const CAT_TRENDLOG: &str = "TRENDLOG";

/// HTTP API requests (off by default — high volume, debug use only)
pub const CAT_API_REQ: &str = "API_REQ";
/// WebSocket connect/disconnect/message type (off by default)
pub const CAT_WEBSOCKET: &str = "WEBSOCKET";
/// Raw C++ FFI calls: action + response size (off by default — very high volume)
pub const CAT_FFI_CALL: &str = "FFI_CALL";

// ── Legacy aliases kept for backwards compatibility ───────────────────────────
#[deprecated(note = "Use CAT_POLL instead")]
pub const CAT_TD_SYNC: &str = "POLL";
#[deprecated(note = "Use CAT_DEVICE instead")]
pub const CAT_TD_READ: &str = "DEVICE";
#[deprecated(note = "Use CAT_TRENDLOG instead")]
pub const CAT_TD_WRITE: &str = "TRENDLOG";
#[deprecated(note = "Use CAT_TRENDLOG instead")]
pub const CAT_TD_INPUTS: &str = "TRENDLOG";
#[deprecated(note = "Use CAT_TRENDLOG instead")]
pub const CAT_TD_FFI: &str = "TRENDLOG";
