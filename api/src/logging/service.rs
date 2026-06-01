use chrono::Local;
use sea_orm::{ConnectionTrait, DatabaseConnection, Statement, DatabaseBackend};

use super::policy::{canonical_category, level_meets_min, load_runtime_log_policy, normalize_level_upper};
use super::sinks::{should_mirror_to_mssql, spawn_mssql_sink, write_file_sink, write_sqlite_sink};
use super::types::{LogContext, LogEvent, LogLevel};

pub struct LoggingService;

impl LoggingService {
    pub fn new() -> Self {
        Self
    }

    pub async fn emit(&self, db: &DatabaseConnection, event: LogEvent) {
        let level_upper = normalize_level_upper(event.level.as_upper());
        let is_error = level_upper == "ERROR";

        // Check DB-backed global kill switch (log.global.enabled).
        // Errors always bypass this so critical failures are never silenced.
        if !is_error && !load_global_logging_enabled(db).await {
            return;
        }

        let canonical_cat = canonical_category(&event.category);
        let level_lc = level_upper.to_ascii_lowercase();

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

        // SQLite-first durability: always keep a local trace regardless of center DB mode.
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

        // Optional center mirror: only for ffi_sync high-volume operational categories.
        if should_mirror_to_mssql(&canonical_cat, event.context.source.as_deref()) {
            let now = Local::now();
            let ts_unix = now.timestamp();
            let ts_fmt = now.format("%Y-%m-%d %H:%M:%S").to_string();
            let hostname_val = hostname::get()
                .map(|h| h.to_string_lossy().into_owned())
                .unwrap_or_else(|_| "unknown".into());

            let _ = spawn_mssql_sink(
                ts_unix,
                ts_fmt,
                level_lc,
                canonical_cat,
                event.context.source.clone(),
                hostname_val,
                event.context.device_serial.clone(),
                event.message.clone(),
                event.details.clone(),
            );
        }
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

/// Read `log.global.enabled` from APPLICATION_CONFIG.
/// Returns `true` (logging on) when no key exists yet.
pub async fn load_global_logging_enabled(db: &DatabaseConnection) -> bool {
    let sql = "SELECT config_value FROM APPLICATION_CONFIG \
               WHERE config_key = 'log.global.enabled' LIMIT 1";
    let row = db
        .query_one(Statement::from_string(
            DatabaseBackend::Sqlite,
            sql.to_string(),
        ))
        .await
        .ok()
        .flatten();
    match row {
        Some(r) => {
            let v: String = r.try_get("", "config_value").unwrap_or_default();
            v.trim() != "false" && v.trim() != "0"
        }
        None => true, // default: logging enabled
    }
}
