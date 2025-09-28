//! Database Files Entity
//!
//! This entity manages metadata for database files including size,
//! record counts, partitioning information, and archival status.

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "database_files")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,

    /// Database file name
    pub file_name: String,

    /// Full file path
    pub file_path: String,

    /// Partition identifier (e.g., '2025-01', '2025-Q1', 'custom-2025-01-15')
    pub partition_identifier: Option<String>,

    /// File size in bytes
    pub file_size_bytes: i64,

    /// Number of records in the file
    pub record_count: i64,

    /// Start date for data in this file
    pub start_date: Option<DateTime>,

    /// End date for data in this file
    pub end_date: Option<DateTime>,

    /// Whether this file is currently active for new inserts
    pub is_active: bool,

    /// Whether this file is archived (read-only)
    pub is_archived: bool,

    /// Creation timestamp
    pub created_at: DateTime,

    /// Last time the file was accessed/modified
    pub last_accessed_at: DateTime,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}

/// Database file with formatted display information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatabaseFileInfo {
    pub id: i32,
    pub name: String,
    pub size: String,      // Formatted size (e.g., "2.3 MB")
    pub records: i64,
    pub start_date: Option<String>,  // Formatted date
    pub end_date: Option<String>,    // Formatted date
    pub is_active: bool,
    pub is_archived: bool,
    pub partition_identifier: Option<String>,
    pub age_days: i64,     // Days since creation
}

impl DatabaseFileInfo {
    /// Create from database model
    pub fn from_model(model: Model) -> Self {
        Self {
            id: model.id,
            name: model.file_name,
            size: Self::format_file_size(model.file_size_bytes),
            records: model.record_count,
            start_date: model.start_date.map(|d| d.format("%Y-%m-%d").to_string()),
            end_date: model.end_date.map(|d| d.format("%Y-%m-%d").to_string()),
            is_active: model.is_active,
            is_archived: model.is_archived,
            partition_identifier: model.partition_identifier,
            age_days: (chrono::Utc::now().naive_utc() - model.created_at).num_days(),
        }
    }

    /// Format file size in human readable format
    fn format_file_size(bytes: i64) -> String {
        const UNITS: &[&str] = &["B", "KB", "MB", "GB", "TB"];

        if bytes == 0 {
            return "0 B".to_string();
        }

        let bytes = bytes as f64;
        let unit_index = (bytes.log10() / 1024_f64.log10()).floor() as usize;
        let unit_index = unit_index.min(UNITS.len() - 1);

        let size = bytes / 1024_f64.powi(unit_index as i32);

        if size >= 100.0 {
            format!("{:.0} {}", size, UNITS[unit_index])
        } else if size >= 10.0 {
            format!("{:.1} {}", size, UNITS[unit_index])
        } else {
            format!("{:.2} {}", size, UNITS[unit_index])
        }
    }

    /// Check if file should be cleaned up based on retention policy
    pub fn should_cleanup(&self, retention_days: i32) -> bool {
        self.age_days > retention_days as i64 && !self.is_active
    }

    /// Generate mock database files for testing
    pub fn generate_mock_files() -> Vec<Self> {
        vec![
            Self {
                id: 1,
                name: "trendlog_2025_01.db".to_string(),
                size: "2.3 MB".to_string(),
                records: 15420,
                start_date: Some("2025-01-01".to_string()),
                end_date: Some("2025-01-31".to_string()),
                is_active: false,
                is_archived: false,
                partition_identifier: Some("2025-01".to_string()),
                age_days: 28,
            },
            Self {
                id: 2,
                name: "trendlog_2025_02.db".to_string(),
                size: "1.8 MB".to_string(),
                records: 12340,
                start_date: Some("2025-02-01".to_string()),
                end_date: Some("2025-02-28".to_string()),
                is_active: false,
                is_archived: false,
                partition_identifier: Some("2025-02".to_string()),
                age_days: 15,
            },
            Self {
                id: 3,
                name: "trendlog_2025_03.db".to_string(),
                size: "3.1 MB".to_string(),
                records: 18760,
                start_date: Some("2025-03-01".to_string()),
                end_date: Some("2025-03-31".to_string()),
                is_active: false,
                is_archived: false,
                partition_identifier: Some("2025-03".to_string()),
                age_days: 8,
            },
            Self {
                id: 4,
                name: "trendlog_2025_04.db".to_string(),
                size: "2.7 MB".to_string(),
                records: 16890,
                start_date: Some("2025-04-01".to_string()),
                end_date: Some("2025-04-30".to_string()),
                is_active: false,
                is_archived: false,
                partition_identifier: Some("2025-04".to_string()),
                age_days: 3,
            },
            Self {
                id: 5,
                name: "trendlog_2025_05.db".to_string(),
                size: "1.2 MB".to_string(),
                records: 8930,
                start_date: Some("2025-05-01".to_string()),
                end_date: None, // Current active file
                is_active: true,
                is_archived: false,
                partition_identifier: Some("2025-05".to_string()),
                age_days: 1,
            },
        ]
    }
}

/// Database statistics for overview
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatabaseStats {
    pub total_files: i32,
    pub total_size_bytes: i64,
    pub total_size_formatted: String,
    pub total_records: i64,
    pub active_files: i32,
    pub archived_files: i32,
    pub files_eligible_for_cleanup: i32,
    pub oldest_file_age_days: i64,
    pub average_file_size_bytes: i64,
}

impl DatabaseStats {
    /// Calculate statistics from file list
    pub fn from_files(files: &[DatabaseFileInfo]) -> Self {
        let total_files = files.len() as i32;
        let total_size_bytes: i64 = files.iter()
            .map(|f| Self::parse_file_size(&f.size))
            .sum();
        let total_records: i64 = files.iter().map(|f| f.records).sum();
        let active_files = files.iter().filter(|f| f.is_active).count() as i32;
        let archived_files = files.iter().filter(|f| f.is_archived).count() as i32;
        let oldest_file_age_days = files.iter().map(|f| f.age_days).max().unwrap_or(0);
        let average_file_size_bytes = if total_files > 0 {
            total_size_bytes / total_files as i64
        } else {
            0
        };

        Self {
            total_files,
            total_size_bytes,
            total_size_formatted: DatabaseFileInfo::format_file_size(total_size_bytes),
            total_records,
            active_files,
            archived_files,
            files_eligible_for_cleanup: 0, // Will be calculated based on retention policy
            oldest_file_age_days,
            average_file_size_bytes,
        }
    }

    /// Parse formatted file size back to bytes (approximate)
    fn parse_file_size(size_str: &str) -> i64 {
        let parts: Vec<&str> = size_str.split_whitespace().collect();
        if parts.len() != 2 {
            return 0;
        }

        let value: f64 = parts[0].parse().unwrap_or(0.0);
        let unit = parts[1];

        match unit {
            "B" => value as i64,
            "KB" => (value * 1024.0) as i64,
            "MB" => (value * 1024.0 * 1024.0) as i64,
            "GB" => (value * 1024.0 * 1024.0 * 1024.0) as i64,
            "TB" => (value * 1024.0 * 1024.0 * 1024.0 * 1024.0) as i64,
            _ => 0,
        }
    }
}
