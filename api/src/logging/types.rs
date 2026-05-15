#[derive(Debug, Clone, PartialEq, Eq)]
pub enum LogLevel {
    Debug,
    Info,
    Warn,
    Error,
}

impl LogLevel {
    pub fn from_str(value: &str) -> Self {
        match value.trim().to_ascii_uppercase().as_str() {
            "DEBUG" => Self::Debug,
            "WARN" | "WARNING" => Self::Warn,
            "ERROR" | "ERR" => Self::Error,
            _ => Self::Info,
        }
    }

    pub fn as_upper(&self) -> &'static str {
        match self {
            Self::Debug => "DEBUG",
            Self::Info => "INFO",
            Self::Warn => "WARN",
            Self::Error => "ERROR",
        }
    }

    pub fn as_lower(&self) -> &'static str {
        match self {
            Self::Debug => "debug",
            Self::Info => "info",
            Self::Warn => "warn",
            Self::Error => "error",
        }
    }
}

#[derive(Debug, Clone, Default)]
pub struct LogContext {
    pub source: Option<String>,
    pub device_serial: Option<String>,
    pub file_base_override: Option<String>,
}

#[derive(Debug, Clone)]
pub struct LogEvent {
    pub level: LogLevel,
    pub category: String,
    pub message: String,
    pub details: Option<String>,
    pub context: LogContext,
}

impl LogEvent {
    pub fn new(level: LogLevel, category: impl Into<String>, message: impl Into<String>) -> Self {
        Self {
            level,
            category: category.into(),
            message: message.into(),
            details: None,
            context: LogContext::default(),
        }
    }
}
