use std::fs::{OpenOptions, create_dir_all};
use std::io::Write;
use chrono::{Utc, Timelike};
use crate::constants::get_t3000_runtime_path;

/// Global flag to enable/disable T3WebLog functionality
pub static ENABLE_T3_WEB_LOG: bool = true; // ✅ ENABLED for FFI verification

/// Creates structured log file path with 4-hour bucket system: T3000_Runtime/T3WebLog/YYYY-MM/MMDD/filename_HHHH.txt
pub fn create_structured_log_path(base_filename: &str) -> Result<String, std::io::Error> {
    let now = Utc::now();
    let year_month = now.format("%Y-%m").to_string();
    let month_day = now.format("%m%d").to_string();

    // Calculate 4-hour bucket (00-03, 04-07, 08-11, 12-15, 16-19, 20-23)
    let current_hour = now.hour();
    let start_hour = (current_hour / 4) * 4;
    let end_hour = start_hour + 3;
    let hour_bucket = format!("{:02}{:02}", start_hour, end_hour);

    // Create the directory structure in T3000 runtime folder: T3WebLog/YYYY-MM/MMDD/
    let runtime_path = get_t3000_runtime_path();
    let log_dir = runtime_path.join("T3WebLog").join(&year_month).join(&month_day);
    create_dir_all(&log_dir)?;

    // Create the full log file path with 4-hour bucket: filename_HHHH.txt
    let log_filename = log_dir.join(format!("{}_{}.txt", base_filename, hour_bucket));
    Ok(log_filename.to_string_lossy().to_string())
}

/// Helper function to write structured logs with log level prefix
pub fn write_structured_log(base_filename: &str, message: &str) -> Result<(), std::io::Error> {
    write_structured_log_with_level(base_filename, message, LogLevel::Info)
}

/// Helper function to write structured logs with specific log level
pub fn write_structured_log_with_level(base_filename: &str, message: &str, level: LogLevel) -> Result<(), std::io::Error> {
    if !ENABLE_T3_WEB_LOG {
        return Ok(());
    }

    let log_path = create_structured_log_path(base_filename)?;
    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(log_path)?;

    let timestamp = Utc::now().format("%Y-%m-%d %H:%M:%S UTC");
    let log_entry = format!("[{}] [{}] {}", timestamp, level.as_str(), message);
    writeln!(file, "{}", log_entry)?;
    Ok(())
}

/// Centralized logging for T3000 WebView Service
pub struct ServiceLogger {
    log_file: Option<std::fs::File>,
}

impl ServiceLogger {
    pub fn new(base_filename: &str) -> Result<Self, std::io::Error> {
        if !ENABLE_T3_WEB_LOG {
            return Ok(ServiceLogger { log_file: None });
        }

        let log_path = create_structured_log_path(base_filename)?;
        let log_file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(log_path)?;

        Ok(ServiceLogger { log_file: Some(log_file) })
    }

    /// Create a logger for FFI operations
    pub fn ffi() -> Result<Self, std::io::Error> {
        Self::new("T3_Webview_FFI")
    }

    /// Create a logger for Socket operations
    pub fn socket() -> Result<Self, std::io::Error> {
        Self::new("T3_Webview_Socket")
    }

    /// Create a logger for API operations
    pub fn api() -> Result<Self, std::io::Error> {
        Self::new("T3_Webview_API")
    }

    /// Create a logger for Database operations
    pub fn database() -> Result<Self, std::io::Error> {
        Self::new("T3_Webview_Database")
    }

    /// Create a logger for Initialize operations
    pub fn initialize() -> Result<Self, std::io::Error> {
        Self::new("T3_Webview_Initialize")
    }

    /// Create a logger for Input API operations
    pub fn api_inputs() -> Result<Self, std::io::Error> {
        Self::new("T3_Webview_API_Inputs")
    }

    /// Create a logger for Output API operations
    pub fn api_outputs() -> Result<Self, std::io::Error> {
        Self::new("T3_Webview_API_Outputs")
    }

    /// Create a logger for Variable API operations
    pub fn api_variables() -> Result<Self, std::io::Error> {
        Self::new("T3_Webview_API_Variables")
    }

    /// Create a logger for Input Database operations
    pub fn database_inputs() -> Result<Self, std::io::Error> {
        Self::new("T3_Webview_Database_Inputs")
    }

    /// Create a logger for Output Database operations
    pub fn database_outputs() -> Result<Self, std::io::Error> {
        Self::new("T3_Webview_Database_Outputs")
    }

    /// Create a logger for Variable Database operations
    pub fn database_variables() -> Result<Self, std::io::Error> {
        Self::new("T3_Webview_Database_Variables")
    }

    pub fn log(&mut self, level: LogLevel, message: &str) {
        if let Some(ref mut file) = self.log_file {
            let timestamp = Utc::now().format("%Y-%m-%d %H:%M:%S UTC");
            let log_entry = format!("[{}] [{}] {}\n", timestamp, level.as_str(), message);

            // Write to file only (headless service)
            let _ = file.write_all(log_entry.as_bytes());
            let _ = file.flush();
        }
    }

    pub fn info(&mut self, message: &str) {
        self.log(LogLevel::Info, message);
    }

    pub fn error(&mut self, message: &str) {
        self.log(LogLevel::Error, message);
    }

    pub fn warn(&mut self, message: &str) {
        self.log(LogLevel::Warn, message);
    }

    /// Add an empty line without timestamp for visual grouping
    pub fn add_empty_line(&mut self) {
        if let Some(ref mut file) = self.log_file {
            let _ = file.write_all(b"\n");
            let _ = file.flush();
        }
    }

    /// Add a breakdown line separator for action rounds
    pub fn add_breakdown(&mut self, _round_description: &str) {
        // Just add empty line for visual grouping
        self.add_empty_line();
    }
}

#[derive(Debug, Clone)]
pub enum LogLevel {
    Info,
    Warn,
    Error,
}

impl LogLevel {
    fn as_str(&self) -> &'static str {
        match self {
            LogLevel::Info => "INFO",
            LogLevel::Warn => "WARN",
            LogLevel::Error => "ERROR",
        }
    }
}
