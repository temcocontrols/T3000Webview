use std::fs::{OpenOptions, create_dir_all};
use std::io::Write;
use std::path::Path;
use chrono::Utc;

/// Creates structured log file path: T3WebLog/YYYY-MM/filename_YYYY-MM-DD.log
pub fn create_structured_log_path(base_filename: &str) -> Result<String, std::io::Error> {
    let now = Utc::now();
    let year_month = now.format("%Y-%m").to_string();
    let date = now.format("%Y-%m-%d").to_string();

    // Create the directory structure: T3WebLog/YYYY-MM/
    let log_dir = format!("T3WebLog/{}", year_month);
    create_dir_all(&log_dir)?;

    // Create the full log file path
    let log_filename = format!("{}/{}_{}.log", log_dir, base_filename, date);
    Ok(log_filename)
}

/// Helper function to write structured logs
pub fn write_structured_log(base_filename: &str, message: &str) -> Result<(), std::io::Error> {
    let log_path = create_structured_log_path(base_filename)?;
    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(log_path)?;
    writeln!(file, "{}", message)?;
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
