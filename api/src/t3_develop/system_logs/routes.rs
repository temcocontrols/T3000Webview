/**
 * System Logs Routes
 *
 * Endpoints for viewing application logs
 */

use axum::{extract::Query, Json, http::StatusCode, response::IntoResponse};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LogEntry {
    pub timestamp: String,
    pub level: String,
    pub source: String,
    pub message: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LogQuery {
    pub level: Option<String>,
    pub source: Option<String>,
    pub limit: Option<usize>,
}

/// Get logs
pub async fn get_logs(Query(query): Query<LogQuery>) -> impl IntoResponse {
    let log_path = get_log_path();

    // Read log file
    let log_file = log_path.join("application.log");
    let content = match fs::read_to_string(&log_file) {
        Ok(c) => c,
        Err(_) => {
            // Return empty logs if file doesn't exist yet
            return (StatusCode::OK, Json(serde_json::json!({
                "logs": Vec::<LogEntry>::new(),
                "total": 0
            })));
        }
    };

    // Parse log entries (simple line-by-line parsing)
    let mut logs = Vec::new();
    for line in content.lines().rev().take(query.limit.unwrap_or(100)) {
        if line.is_empty() {
            continue;
        }

        // Simple parsing - format: [timestamp] [level] [source] message
        let parts: Vec<&str> = line.splitn(4, |c| c == '[' || c == ']').collect();
        if parts.len() >= 4 {
            let timestamp = parts[1].trim().to_string();
            let level = parts[2].trim().to_string();
            let rest: Vec<&str> = parts[3].splitn(2, ']').collect();
            let source = if rest.len() > 1 {
                rest[0].trim_start_matches('[').trim().to_string()
            } else {
                "Unknown".to_string()
            };
            let message = if rest.len() > 1 {
                rest[1].trim().to_string()
            } else {
                parts[3].trim().to_string()
            };

            // Apply filters
            if let Some(ref filter_level) = query.level {
                if filter_level != "All" && &level != filter_level {
                    continue;
                }
            }

            if let Some(ref filter_source) = query.source {
                if filter_source != "All" && &source != filter_source {
                    continue;
                }
            }

            logs.push(LogEntry {
                timestamp,
                level,
                source,
                message,
            });
        }
    }

    let total = logs.len();

    (StatusCode::OK, Json(serde_json::json!({
        "logs": logs,
        "total": total
    })))
}

/// Get log path
fn get_log_path() -> PathBuf {
    std::env::var("T3000_LOG_PATH")
        .map(PathBuf::from)
        .unwrap_or_else(|_| {
            PathBuf::from(r"D:\1025\github\temcocontrols\T3000_Building_Automation_System\T3000 Output\Debug")
        })
}


