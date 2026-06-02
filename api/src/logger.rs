use std::fs::{create_dir_all, OpenOptions};
use std::io::Write;
use chrono::{Utc, Timelike};
use crate::constants::get_t3000_runtime_path;

/// Global flag to enable/disable T3WebLog functionality
pub static ENABLE_T3_WEB_LOG: bool = true; // ❌ DISABLED - Set to true to enable logging

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

/// Backward-compatible helper retained for tests and legacy callsites.
pub fn write_structured_log(base_filename: &str, message: &str) -> Result<(), std::io::Error> {
    write_structured_log_with_level(base_filename, message, LogLevel::Info)
}

/// Backward-compatible helper retained for tests and legacy callsites.
pub fn write_structured_log_with_level(
    base_filename: &str,
    message: &str,
    level: LogLevel,
) -> Result<(), std::io::Error> {
    if !ENABLE_T3_WEB_LOG {
        return Ok(());
    }

    let log_path = create_structured_log_path(base_filename)?;
    let mut file = OpenOptions::new().create(true).append(true).open(log_path)?;
    let timestamp = Utc::now().format("%Y-%m-%d %H:%M:%S UTC");
    let line = format!("[{}] [{}] {}\n", timestamp, level.as_str(), message);
    file.write_all(line.as_bytes())?;
    file.flush()?;
    Ok(())
}

/// Structured logging for T3000 WebView Service
pub struct ServiceLogger {
    base_filename: String,
}

impl ServiceLogger {
    pub fn new(base_filename: &str) -> Result<Self, std::io::Error> {
        Ok(ServiceLogger { base_filename: base_filename.to_string() })
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

    /// Create a no-op logger that silently discards all messages.
    /// Used as a fallback when the log file cannot be created.
    pub fn noop() -> Self {
        ServiceLogger { base_filename: String::new() }
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

    pub async fn log(&mut self, level: LogLevel, message: &str) {
        if self.base_filename.is_empty() {
            return;
        }

        let base_filename = self.base_filename.clone();
        let level_text = level.as_str().to_string();
        let message_text = message.to_string();

        let db = match crate::db_connection::establish_t3_device_connection().await {
            Ok(db) => db,
            Err(_) => return,
        };

        let category = legacy_category_for_base_filename(&base_filename);
        crate::logging::service::emit_app_log(
            &db,
            &level_text,
            category,
            Some(&base_filename),
            None,
            &message_text,
            None,
        )
        .await;
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
        let _ = &self.base_filename;
    }

    /// Add a breakdown line separator for action rounds
    pub fn add_breakdown(&mut self, _round_description: &str) {
        // Just add empty line for visual grouping
        self.add_empty_line();
    }
}

fn legacy_category_for_base_filename(base_filename: &str) -> &'static str {
    match base_filename {
        "T3_Webview_API" => "API_REQ",
        "T3_Webview_Socket" => "WEBSOCKET",
        "T3_Webview_FFI" => "FFI_CALL",
        "T3_Webview_MsgAction" => "MESSAGE_ACTION",
        "T3_Webview_Poll" => "POLL",
        "T3_Webview_Device" => "DEVICE",
        "T3_Webview_Trendlog" => "TRENDLOG",
        "T3_Webview_Database" => "MAINTENANCE",
        "T3_Webview_Initialize" => "STARTUP",
        "T3_Webview_API_Inputs" => "DEVICE",
        "T3_Webview_API_Outputs" => "DEVICE",
        "T3_Webview_API_Variables" => "DEVICE",
        "T3_Webview_Database_Inputs" => "DEVICE",
        "T3_Webview_Database_Outputs" => "DEVICE",
        "T3_Webview_Database_Variables" => "DEVICE",
        "T3_PartitionMonitor" => "MAINTENANCE",
        "T3_DatabaseSizeMonitor" => "MAINTENANCE",
        "T3_PartitionQuery" => "TRENDLOG",
        "T3_Webview_TRL_FFI" => "TRENDLOG",
        _ => "STARTUP",
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
