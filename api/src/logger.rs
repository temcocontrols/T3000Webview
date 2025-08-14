use std::fs::OpenOptions;
use std::io::Write;
use chrono::Utc;

/// Centralized logging for T3000 WebView Service
pub struct ServiceLogger {
    log_file: std::fs::File,
}

impl ServiceLogger {
    pub fn new(log_filename: &str) -> Result<Self, std::io::Error> {
        let log_file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(log_filename)?;

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
