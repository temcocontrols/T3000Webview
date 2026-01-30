use std::path::PathBuf;

/// Enable/disable T3000 FFI Sync Service (calls C++ LOGGING_DATA every 15 min)
/// Set to false to disable automatic device data syncing from T3000.exe
pub const ENABLE_FFI_SYNC_SERVICE: bool = false;

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
