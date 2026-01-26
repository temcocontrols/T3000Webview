use std::path::PathBuf;

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
