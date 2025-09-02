use std::fs::{OpenOptions, create_dir_all};
use std::io::Write;
use chrono::{Utc, Timelike};

/// Creates structured log file path with 4-hour bucket system: T3WebLog/YYYY-MM/MMDD/filename_HHHH.txt
pub fn create_structured_log_path(base_filename: &str) -> Result<String, std::io::Error> {
    let now = Utc::now();
    let year_month = now.format("%Y-%m").to_string();
    let month_day = now.format("%m%d").to_string();

    // Calculate 4-hour bucket (00-03, 04-07, 08-11, 12-15, 16-19, 20-23)
    let current_hour = now.hour();
    let start_hour = (current_hour / 4) * 4;
    let end_hour = start_hour + 3;
    let hour_bucket = format!("{:02}{:02}", start_hour, end_hour);

    // Create the directory structure: T3WebLog/YYYY-MM/MMDD/
    let log_dir = format!("T3WebLog/{}/{}", year_month, month_day);
    create_dir_all(&log_dir)?;

    // Create the full log file path with 4-hour bucket: filename_HHHH.txt
    let log_filename = format!("{}/{}_{}.txt", log_dir, base_filename, hour_bucket);
    Ok(log_filename)
}

/// Helper function to write structured logs with log level prefix
pub fn write_structured_log(base_filename: &str, message: &str) -> Result<(), std::io::Error> {
    write_structured_log_with_level(base_filename, message, LogLevel::Info)
}

/// Helper function to write structured logs with specific log level
pub fn write_structured_log_with_level(base_filename: &str, message: &str, level: LogLevel) -> Result<(), std::io::Error> {
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
    log_file: std::fs::File,
}

impl ServiceLogger {
    pub fn new(base_filename: &str) -> Result<Self, std::io::Error> {
        let log_path = create_structured_log_path(base_filename)?;
        let log_file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(log_path)?;

    Ok(ServiceLogger { log_file })
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

    pub fn log(&mut self, level: LogLevel, message: &str) {
        let timestamp = Utc::now().format("%Y-%m-%d %H:%M:%S UTC");
        let log_entry = format!("[{}] [{}] {}\n", timestamp, level.as_str(), message);

        // Write to file only (headless service)
        let _ = self.log_file.write_all(log_entry.as_bytes());
        let _ = self.log_file.flush();
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
        let _ = self.log_file.write_all(b"\n");
        let _ = self.log_file.flush();
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
