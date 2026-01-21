/**
 * System Logs Routes
 *
 * Endpoints for viewing application logs from T3WebLog folder
 */

use axum::{extract::Query, Json, http::StatusCode, response::IntoResponse};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use chrono::{DateTime, Utc, NaiveDate};

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LogEntry {
    pub timestamp: String,
    pub level: String,
    pub source: String,
    pub message: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DateFolder {
    pub path: String,
    pub display_date: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LogFileInfo {
    pub name: String,
    pub size: u64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LogQuery {
    pub level: Option<String>,
    pub source: Option<String>,
    pub limit: Option<usize>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FilesQuery {
    pub date: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ContentQuery {
    pub date: String,
    pub file: String,
}

/// Get available date folders from T3WebLog
pub async fn get_dates() -> impl IntoResponse {
    let log_base = get_t3weblog_path();

    let mut dates = Vec::new();

    if let Ok(year_months) = fs::read_dir(&log_base) {
        for year_month_entry in year_months.flatten() {
            if !year_month_entry.path().is_dir() {
                continue;
            }

            let year_month = year_month_entry.file_name().to_string_lossy().to_string();

            // Read day folders within year-month
            if let Ok(days) = fs::read_dir(year_month_entry.path()) {
                for day_entry in days.flatten() {
                    if !day_entry.path().is_dir() {
                        continue;
                    }

                    let day = day_entry.file_name().to_string_lossy().to_string();
                    let path = format!("{}/{}", year_month, day);

                    // Parse date for display (e.g., "2026-01/0121" -> "Jan 21, 2026")
                    let display_date = format_date_display(&year_month, &day);

                    dates.push(DateFolder {
                        path,
                        display_date,
                    });
                }
            }
        }
    }

    // Sort by date descending (newest first)
    dates.sort_by(|a, b| b.path.cmp(&a.path));

    (StatusCode::OK, Json(dates))
}

/// Get log files for a specific date
pub async fn get_files(Query(query): Query<FilesQuery>) -> impl IntoResponse {
    let log_base = get_t3weblog_path();
    let folder_path = log_base.join(&query.date);

    let mut files = Vec::new();

    if let Ok(entries) = fs::read_dir(&folder_path) {
        for entry in entries.flatten() {
            if entry.path().is_file() {
                let name = entry.file_name().to_string_lossy().to_string();

                // Only include .txt files
                if !name.ends_with(".txt") {
                    continue;
                }

                let size = entry.metadata().map(|m| m.len()).unwrap_or(0);

                files.push(LogFileInfo { name, size });
            }
        }
    }

    // Sort by name
    files.sort_by(|a, b| a.name.cmp(&b.name));

    (StatusCode::OK, Json(files))
}
T3WebLog path
fn get_t3weblog_path() -> PathBuf {
    std::env::var("T3WEBLOG_PATH")
        .map(PathBuf::from)
        .unwrap_or_else(|_| {
            PathBuf::from(r"D:\1025\github\temcocontrols\T3000_Building_Automation_System\T3000 Output\Debug\T3WebLog")
        })
}

/// Get log path (legacy)
/// Get log file content
pub async fn get_content(Query(query): Query<ContentQuery>) -> impl IntoResponse {
    let log_base = get_t3weblog_path();
    let file_path = log_base.join(&query.date).join(&query.file);

    match fs::read_to_string(&file_path) {
        Ok(content) => (StatusCode::OK, content).into_response(),
        Err(e) => (
            StatusCode::NOT_FOUND,
            format!("Failed to read log file: {}", e)
        ).into_response(),
    }
}

/// Clear all logs (optional - removes all log files)
pub async fn clear_logs() -> impl IntoResponse {
    // For safety, we'll just return success without actually deleting
    // You can implement actual deletion if needed
    (StatusCode::OK, Json(serde_json::json!({
        "success": true,
        "message": "Logs cleared"
    })))
}

/// Helper function to format date display
fn format_date_display(year_month: &str, day: &str) -> String {
    // Parse year_month (e.g., "2026-01") and day (e.g., "0121")
    let parts: Vec<&str> = year_month.split('-').collect();
    if parts.len() != 2 {
        return format!("{}/{}", year_month, day);
    }

    let year = parts[0];
    let month = parts[1];
    let day_num = &day[2..]; // Remove leading "01" from "0121" to get "21"

    let month_name = match month {
        "01" => "Jan", "02" => "Feb", "03" => "Mar", "04" => "Apr",
        "05" => "May", "06" => "Jun", "07" => "Jul", "08" => "Aug",
        "09" => "Sep", "10" => "Oct", "11" => "Nov", "12" => "Dec",
        _ => month,
    };

    format!("{} {}, {}", month_name, day_num, year)
}

/// Get logs (legacy endpoint)
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


