use sea_orm::{ConnectionTrait, DatabaseBackend, DatabaseConnection, Statement};

use crate::constants::ACTIVITY_LOG_CATEGORY_DEFS;

#[derive(Debug, Clone)]
pub struct RuntimeLogPolicy {
    pub enabled: bool,
    pub detail_mode: String,
    pub min_level: String,
    pub sink_db: bool,
    pub sink_file: bool,
}

#[derive(Debug, Clone)]
struct BasePolicyConfig {
    category: String,
    enabled: bool,
    detail_mode: String,
    min_level: String,
    sink_db: bool,
    sink_file: bool,
}

fn parse_bool_config(v: &str) -> bool {
    matches!(v.trim().to_ascii_lowercase().as_str(), "1" | "true" | "yes" | "on")
}

pub fn canonical_category(category: &str) -> String {
    match category.trim().to_ascii_uppercase().as_str() {
        "TRENDLOG_BACKEND" | "SAMPLING" | "FFI_POLL" => "POLL".to_string(),
        "DEVICE_SYNC" => "DEVICE".to_string(),
        "TREND_LOG" | "TD_READ" | "TD_WRITE" | "TD_INPUTS" | "TD_FFI" | "TD_SYNC" => {
            "TRENDLOG".to_string()
        }
        "DB_CONFIG" => "CONFIG".to_string(),
        "SERVER_EVENT" => "STARTUP".to_string(),
        "T3_WEBVIEW_INITIALIZE" => "STARTUP".to_string(),
        "T3_WEBVIEW_API" => "API_REQ".to_string(),
        "T3_WEBVIEW_SOCKET" => "WEBSOCKET".to_string(),
        "T3_WEBVIEW_FFI" | "T3_FFI" => "FFI_CALL".to_string(),
        "T3_WEBVIEW_MSGACTION" => "MESSAGE_ACTION".to_string(),
        "T3_WEBVIEW_POLL" => "POLL".to_string(),
        "T3_WEBVIEW_DEVICE" => "DEVICE".to_string(),
        "T3_WEBVIEW_TRENDLOG" | "T3_WEBVIEW_TRL_FFI" | "T3_PARTITIONQUERY" => {
            "TRENDLOG".to_string()
        }
        "T3_DATABASE_MIGRATION" | "T3_PARTITIONMONITOR" | "T3_DATABASESIZEMONITOR"
        | "T3_WEBVIEW_DATABASE" => "MAINTENANCE".to_string(),
        other => other.to_string(),
    }
}

pub fn normalize_level_upper(level: &str) -> String {
    match level.trim().to_ascii_uppercase().as_str() {
        "ERROR" | "ERR" => "ERROR".to_string(),
        "WARN" | "WARNING" => "WARN".to_string(),
        "DEBUG" => "DEBUG".to_string(),
        _ => "INFO".to_string(),
    }
}

fn level_rank(level_upper: &str) -> i32 {
    match level_upper {
        "DEBUG" => 10,
        "INFO" => 20,
        "WARN" => 30,
        "ERROR" => 40,
        _ => 20,
    }
}

pub fn level_meets_min(level_upper: &str, min_level: &str) -> bool {
    let raw = min_level.trim().to_ascii_uppercase();

    if raw == "ALL" {
        return true;
    }

    if raw.contains(',') {
        let allowed: std::collections::BTreeSet<String> = raw
            .split(',')
            .map(normalize_level_upper)
            .collect();
        return allowed.contains(level_upper);
    }

    let normalized = normalize_level_upper(&raw);
    level_rank(level_upper) >= level_rank(&normalized)
}

pub async fn load_runtime_log_policy(
    db: &DatabaseConnection,
    category: &str,
) -> RuntimeLogPolicy {
    let normalized_category = canonical_category(category);

    let mut base_cfg = ACTIVITY_LOG_CATEGORY_DEFS
        .iter()
        .find(|c| c.category == normalized_category)
        .map(|c| BasePolicyConfig {
            category: c.category.to_string(),
            enabled: c.enabled,
            detail_mode: c.detail_mode.to_string(),
            min_level: c.min_level.to_string(),
            sink_db: c.sink_db,
            sink_file: c.sink_file,
        })
        .unwrap_or(BasePolicyConfig {
            category: normalized_category,
            enabled: true,
            detail_mode: "SUMMARY".to_string(),
            min_level: "INFO".to_string(),
            sink_db: true,
            sink_file: false,
        });

    let key_prefix = format!("log.category.{}.", base_cfg.category.replace('\'', "''"));
    let sql = format!(
        "SELECT config_key, config_value FROM APPLICATION_CONFIG WHERE config_key LIKE '{}'",
        format!("{}%", key_prefix)
    );

    let rows = db
        .query_all(Statement::from_string(DatabaseBackend::Sqlite, sql))
        .await
        .unwrap_or_default();

    for row in rows {
        let key: String = row.try_get("", "config_key").unwrap_or_default();
        let val: String = row.try_get("", "config_value").unwrap_or_default();
        if key.ends_with(".enabled") {
            base_cfg.enabled = parse_bool_config(&val);
        } else if key.ends_with(".detail_mode") {
            base_cfg.detail_mode = val;
        } else if key.ends_with(".min_level") {
            base_cfg.min_level = val;
        } else if key.ends_with(".sink_db") {
            base_cfg.sink_db = parse_bool_config(&val);
        } else if key.ends_with(".sink_file") {
            base_cfg.sink_file = parse_bool_config(&val);
        }
    }

    RuntimeLogPolicy {
        enabled: base_cfg.enabled,
        detail_mode: base_cfg.detail_mode,
        min_level: base_cfg.min_level,
        sink_db: base_cfg.sink_db,
        sink_file: base_cfg.sink_file,
    }
}
