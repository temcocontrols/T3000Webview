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

#[derive(Debug, Clone, Copy)]
pub struct ActivityLogCategoryDef {
    pub category: &'static str,
    pub display_name: &'static str,
    pub description: &'static str,
    pub group: &'static str,
    pub enabled: bool,
    pub detail_mode: &'static str,
    pub min_level: &'static str,
    pub target: &'static str,
    pub sink_db: bool,
    pub sink_file: bool,
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
//   API_REQ | WEBSOCKET | FFI_CALL | MESSAGE_ACTION

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
/// Message action processing details (off by default — high volume debug use only)
pub const CAT_MESSAGE_ACTION: &str = "MESSAGE_ACTION";

pub const ACTIVITY_LOG_CATEGORY_DEFS: &[ActivityLogCategoryDef] = &[
    ActivityLogCategoryDef {
        category: CAT_STARTUP,
        display_name: "Service Startup",
        description: "DLL load, server init, DB connect, sampling state changes",
        group: "system",
        enabled: true,
        detail_mode: "SUMMARY",
        min_level: "INFO",
        target: "sqlite",
        sink_db: true,
        sink_file: false,
    },
    ActivityLogCategoryDef {
        category: CAT_AUTH,
        display_name: "Authentication",
        description: "Login, logout, session events",
        group: "system",
        enabled: true,
        detail_mode: "SUMMARY",
        min_level: "INFO",
        target: "sqlite",
        sink_db: true,
        sink_file: false,
    },
    ActivityLogCategoryDef {
        category: CAT_CONFIG,
        display_name: "Config Changes",
        description: "Operator settings: sync interval, rediscover interval",
        group: "system",
        enabled: true,
        detail_mode: "SUMMARY",
        min_level: "INFO",
        target: "sqlite",
        sink_db: true,
        sink_file: false,
    },
    ActivityLogCategoryDef {
        category: CAT_MAINTENANCE,
        display_name: "DB Maintenance",
        description: "Migration, partition creation, DB size warnings",
        group: "system",
        enabled: true,
        detail_mode: "SUMMARY",
        min_level: "INFO",
        target: "sqlite",
        sink_db: true,
        sink_file: false,
    },
    ActivityLogCategoryDef {
        category: CAT_POLL,
        display_name: "Device Poll",
        description: "Sync cycle: device count, ok/fail totals, policy skips",
        group: "operational",
        enabled: true,
        detail_mode: "SUMMARY",
        min_level: "INFO",
        target: "mssql",
        sink_db: true,
        sink_file: false,
    },
    ActivityLogCategoryDef {
        category: CAT_DEVICE,
        display_name: "Device Sync",
        description: "Per-device: points written, FFI errors, serial=0 skips",
        group: "operational",
        enabled: true,
        detail_mode: "SUMMARY",
        min_level: "INFO",
        target: "mssql",
        sink_db: true,
        sink_file: false,
    },
    ActivityLogCategoryDef {
        category: CAT_TRENDLOG,
        display_name: "Trendlog",
        description: "Trendlog config sync and data write summary",
        group: "operational",
        enabled: true,
        detail_mode: "SUMMARY",
        min_level: "INFO",
        target: "mssql",
        sink_db: true,
        sink_file: false,
    },
    ActivityLogCategoryDef {
        category: CAT_API_REQ,
        display_name: "API Requests",
        description: "HTTP endpoint calls - enable for debugging only",
        group: "debug",
        enabled: false,
        detail_mode: "SUMMARY",
        min_level: "INFO",
        target: "sqlite",
        sink_db: false,
        sink_file: true,
    },
    ActivityLogCategoryDef {
        category: CAT_WEBSOCKET,
        display_name: "WebSocket",
        description: "WS connect/disconnect, message types",
        group: "debug",
        enabled: false,
        detail_mode: "SUMMARY",
        min_level: "INFO",
        target: "sqlite",
        sink_db: false,
        sink_file: true,
    },
    ActivityLogCategoryDef {
        category: CAT_FFI_CALL,
        display_name: "C++ FFI Calls",
        description: "Raw C++ request/response - very high volume",
        group: "debug",
        enabled: false,
        detail_mode: "FULL",
        min_level: "DEBUG",
        target: "sqlite",
        sink_db: false,
        sink_file: true,
    },
    ActivityLogCategoryDef {
        category: CAT_MESSAGE_ACTION,
        display_name: "Message Action",
        description: "Message action processing and command dispatch details",
        group: "debug",
        enabled: false,
        detail_mode: "FULL",
        min_level: "DEBUG",
        target: "sqlite",
        sink_db: false,
        sink_file: true,
    },
];

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
