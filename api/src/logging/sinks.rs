use chrono::Local;
use sea_orm::{ConnectionTrait, DatabaseBackend, DatabaseConnection, Statement};

pub fn is_high_volume_category(cat: &str) -> bool {
    matches!(
        cat,
        "POLL"
            | "DEVICE"
            | "TRENDLOG"
            | "SYNC_CYCLE"
            | "SAMPLING"
            | "FFI_POLL"
            | "DEVICE_SYNC"
            | "TREND_LOG"
            | "TD_READ"
            | "TD_WRITE"
            | "TD_INPUTS"
            | "TD_FFI"
            | "TD_SYNC"
    )
}

pub fn should_mirror_to_mssql(category: &str, source: Option<&str>) -> bool {
    if !is_high_volume_category(category) {
        return false;
    }
    matches!(source, Some("ffi_sync"))
}

pub fn file_log_base_for_category(category: &str) -> &'static str {
    match category {
        "API_REQ" => "T3_Webview_API",
        "WEBSOCKET" => "T3_Webview_Socket",
        "FFI_CALL" => "T3_Webview_FFI",
        "MESSAGE_ACTION" => "T3_Webview_MsgAction",
        "POLL" => "T3_Webview_Poll",
        "DEVICE" => "T3_Webview_Device",
        "TRENDLOG" => "T3_Webview_Trendlog",
        "MAINTENANCE" => "T3_Webview_Database",
        _ => "T3_Webview_Initialize",
    }
}

fn append_file_log_line(base_filename: &str, message: &str, level_upper: &str) {
    if let Ok(log_path) = crate::logger::create_structured_log_path(base_filename) {
        if let Ok(mut file) = std::fs::OpenOptions::new().create(true).append(true).open(log_path) {
            let timestamp = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S UTC");
            let log_entry = format!("[{}] [{}] {}\n", timestamp, level_upper, message);
            let _ = std::io::Write::write_all(&mut file, log_entry.as_bytes());
            let _ = std::io::Write::flush(&mut file);
        }
    }
}

pub fn write_file_sink(
    category: &str,
    level_upper: &str,
    detail_mode: &str,
    source: Option<&str>,
    device_serial: Option<&str>,
    file_base_override: Option<&str>,
    message: &str,
    details: Option<&str>,
) {
    let base_filename = file_base_override.unwrap_or_else(|| file_log_base_for_category(category));
    let mut file_message = format!("[{}] {}", category, message);
    if let Some(src) = source {
        file_message.push_str(&format!(" | source={}", src));
    }
    if let Some(serial) = device_serial {
        file_message.push_str(&format!(" | serial={}", serial));
    }
    if detail_mode.eq_ignore_ascii_case("FULL") {
        if let Some(d) = details {
            file_message.push_str(&format!(" | details={}", d));
        }
    }

    append_file_log_line(base_filename, &file_message, level_upper);
}

pub async fn write_sqlite_sink(
    db: &DatabaseConnection,
    canonical_cat: &str,
    level_lc: &str,
    source: Option<&str>,
    device_serial: Option<&str>,
    message: &str,
    details: Option<&str>,
    detail_mode: &str,
    is_error: bool,
) {
    let now = Local::now();
    let ts_unix = now.timestamp();
    let ts_fmt = now.format("%Y-%m-%d %H:%M:%S").to_string();

    let hostname_val = hostname::get()
        .map(|h| h.to_string_lossy().into_owned())
        .unwrap_or_else(|_| "unknown".into());

    let fallback_detail_storage: String;
    let detailed_allowed = detail_mode.eq_ignore_ascii_case("FULL") || is_error;
    let mut selected_details = if detailed_allowed { details } else { None };

    let effective_details: Option<&str> = if is_high_volume_category(canonical_cat)
        && crate::server_db_writer::get_server_mssql_pool().is_none()
    {
        fallback_detail_storage = match selected_details {
            Some(d) => format!("[center DB unreachable - saved to local] {}", d),
            None => "[center DB unreachable - saved to local]".to_string(),
        };
        Some(fallback_detail_storage.as_str())
    } else {
        selected_details.take()
    };

    let esc = |s: &str| s.replace('\'', "''");
    let opt_str = |v: Option<&str>| match v {
        Some(s) => format!("'{}'", esc(s)),
        None => "NULL".to_string(),
    };

    let sql = format!(
        "INSERT INTO T3_APP_LOG \
         (ts_unix, ts_fmt, level, category, source, hostname, device_serial, message, details) \
         VALUES ({}, '{}', '{}', '{}', {}, '{}', {}, '{}', {})",
        ts_unix,
        esc(&ts_fmt),
        esc(level_lc),
        esc(canonical_cat),
        opt_str(source),
        esc(&hostname_val),
        opt_str(device_serial),
        esc(message),
        opt_str(effective_details),
    );

    let _ = db
        .execute(Statement::from_string(DatabaseBackend::Sqlite, sql))
        .await;

    let _ = db
        .execute(Statement::from_string(
            DatabaseBackend::Sqlite,
            "DELETE FROM T3_APP_LOG WHERE id NOT IN \
             (SELECT id FROM T3_APP_LOG ORDER BY ts_unix DESC LIMIT 5000)"
                .to_string(),
        ))
        .await;
}

pub fn spawn_mssql_sink(
    ts_unix: i64,
    ts_fmt: String,
    level_lc: String,
    category: String,
    source: Option<String>,
    hostname: String,
    device_serial: Option<String>,
    message: String,
    details: Option<String>,
) -> bool {
    if let Some(pool) = crate::server_db_writer::get_server_mssql_pool() {
        tokio::spawn(async move {
            let _ = crate::database_management::mssql_queries::insert_app_log(
                pool,
                ts_unix,
                &ts_fmt,
                &level_lc,
                &category,
                source.as_deref(),
                &hostname,
                device_serial.as_deref(),
                &message,
                details.as_deref(),
            )
            .await;
        });
        true
    } else {
        false
    }
}
