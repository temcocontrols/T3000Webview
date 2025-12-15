use std::env;
use std::path::PathBuf;

/// Get the base runtime directory where T3000 application stores its files
/// In development: uses hardcoded path for debugging
/// In production: uses current executable directory (where DLL is deployed)
pub fn get_t3000_runtime_path() -> PathBuf {
    #[cfg(debug_assertions)]
    {
        // Development mode: use hardcoded path
        PathBuf::from("D:\\1025\\github\\temcocontrols\\T3000_Building_Automation_System\\T3000 Output\\Debug")
    }
    #[cfg(not(debug_assertions))]
    {
        // Production mode: use current executable directory
        match env::current_exe() {
            Ok(exe_path) => {
                exe_path.parent()
                    .unwrap_or_else(|| std::path::Path::new("."))
                    .to_path_buf()
            }
            Err(_) => {
                // Fallback to current directory if we can't get exe path
                env::current_dir().unwrap_or_else(|_| PathBuf::from("."))
            }
        }
    }
}

/// Get the database directory path within the T3000 runtime folder
pub fn get_t3000_database_path() -> PathBuf {
    get_t3000_runtime_path().join("Database")
}

/// Get the T3000 log directory path
pub fn get_t3000_log_path() -> PathBuf {
    get_t3000_runtime_path().join("T3WebLog")
}
