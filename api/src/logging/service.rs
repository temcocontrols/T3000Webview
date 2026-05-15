use chrono::Local;
use sea_orm::DatabaseConnection;

use super::policy::{canonical_category, level_meets_min, load_runtime_log_policy, normalize_level_upper};
use super::sinks::{is_high_volume_category, spawn_mssql_sink, write_file_sink, write_sqlite_sink};
use super::types::{LogContext, LogEvent, LogLevel};

/// Global kill switch — set to true to completely disable all logging (DB + file).
/// Useful while the logging feature is not fully tested.
const LOGGING_ENABLED: bool = false;

pub struct LoggingService;

impl LoggingService {
    pub fn new() -> Self {
        Self
    }

    pub async fn emit(&self, db: &DatabaseConnection, event: LogEvent) {
        if !LOGGING_ENABLED { return; }
        let canonical_cat = canonical_category(&event.category);
        let level_upper = normalize_level_upper(event.level.as_upper());
        let level_lc = level_upper.to_ascii_lowercase();
        let is_error = level_upper == "ERROR";

        let policy = load_runtime_log_policy(db, &canonical_cat).await;

        if !is_error {
            if !policy.enabled {
                return;
            }
            if !level_meets_min(&level_upper, &policy.min_level) {
                return;
            }
        }

        let sink_db = is_error || policy.sink_db;
        let sink_file = policy.sink_file;

        if !sink_db && !sink_file {
            return;
        }

        if sink_file {
            write_file_sink(
                &canonical_cat,
                &level_upper,
                &policy.detail_mode,
                event.context.source.as_deref(),
                event.context.device_serial.as_deref(),
                event.context.file_base_override.as_deref(),
                &event.message,
                event.details.as_deref(),
            );
        }

        if !sink_db {
            return;
        }

        let now = Local::now();
        let ts_unix = now.timestamp();
        let ts_fmt = now.format("%Y-%m-%d %H:%M:%S").to_string();
        let hostname_val = hostname::get()
            .map(|h| h.to_string_lossy().into_owned())
            .unwrap_or_else(|_| "unknown".into());

        let wrote_mssql = if is_high_volume_category(&canonical_cat) {
            spawn_mssql_sink(
                ts_unix,
                ts_fmt.clone(),
                level_lc.clone(),
                canonical_cat.clone(),
                event.context.source.clone(),
                hostname_val,
                event.context.device_serial.clone(),
                event.message.clone(),
                event.details.clone(),
            )
        } else {
            false
        };

        if wrote_mssql {
            return;
        }

        write_sqlite_sink(
            db,
            &canonical_cat,
            &level_lc,
            event.context.source.as_deref(),
            event.context.device_serial.as_deref(),
            &event.message,
            event.details.as_deref(),
            &policy.detail_mode,
            is_error,
        )
        .await;
    }

    pub async fn emit_from_parts(
        &self,
        db: &DatabaseConnection,
        level: &str,
        category: &str,
        source: Option<&str>,
        device_serial: Option<&str>,
        message: &str,
        details: Option<&str>,
    ) {
        let mut event = LogEvent::new(LogLevel::from_str(level), category.to_string(), message.to_string());
        event.details = details.map(|d| d.to_string());
        event.context = LogContext {
            source: source.map(|s| s.to_string()),
            device_serial: device_serial.map(|s| s.to_string()),
            file_base_override: None,
        };
        self.emit(db, event).await;
    }
}

pub async fn emit_app_log(
    db: &DatabaseConnection,
    level: &str,
    category: &str,
    source: Option<&str>,
    device_serial: Option<&str>,
    message: &str,
    details: Option<&str>,
) {
    LoggingService::new()
        .emit_from_parts(db, level, category, source, device_serial, message, details)
        .await;
}
