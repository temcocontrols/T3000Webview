use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "timebase_config")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: i32,
    #[sea_orm(unique)]
    pub name: String,
    pub interval_seconds: i32,
    pub retention_days: i32,
    pub description: Option<String>,
    pub is_active: i32,
    pub created_at: i64,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}

impl Model {
    /// Check if timebase is active
    pub fn is_timebase_active(&self) -> bool {
        self.is_active == 1
    }

    /// Get interval as Duration
    pub fn get_interval_duration(&self) -> std::time::Duration {
        std::time::Duration::from_secs(self.interval_seconds as u64)
    }

    /// Get retention period as Duration
    pub fn get_retention_duration(&self) -> std::time::Duration {
        std::time::Duration::from_secs((self.retention_days as u64) * 24 * 60 * 60)
    }

    /// Get human-readable interval description
    pub fn get_interval_description(&self) -> String {
        let seconds = self.interval_seconds;

        if seconds < 60 {
            format!("{} seconds", seconds)
        } else if seconds < 3600 {
            let minutes = seconds / 60;
            if minutes == 1 {
                "1 minute".to_string()
            } else {
                format!("{} minutes", minutes)
            }
        } else if seconds < 86400 {
            let hours = seconds / 3600;
            if hours == 1 {
                "1 hour".to_string()
            } else {
                format!("{} hours", hours)
            }
        } else {
            let days = seconds / 86400;
            if days == 1 {
                "1 day".to_string()
            } else {
                format!("{} days", days)
            }
        }
    }

    /// Get human-readable retention description
    pub fn get_retention_description(&self) -> String {
        let days = self.retention_days;

        if days < 7 {
            if days == 1 {
                "1 day".to_string()
            } else {
                format!("{} days", days)
            }
        } else if days < 365 {
            let weeks = days / 7;
            if weeks == 1 {
                "1 week".to_string()
            } else if days % 7 == 0 {
                format!("{} weeks", weeks)
            } else {
                format!("{} days", days)
            }
        } else {
            let years = days / 365;
            if years == 1 {
                "1 year".to_string()
            } else if days % 365 == 0 {
                format!("{} years", years)
            } else {
                format!("{} days", days)
            }
        }
    }

    /// Calculate cutoff timestamp for data retention
    pub fn get_retention_cutoff(&self) -> i64 {
        let now = chrono::Utc::now().timestamp();
        now - (self.retention_days as i64 * 24 * 60 * 60)
    }

    /// Get timebase category for UI grouping
    pub fn get_category(&self) -> TimebaseCategory {
        match self.interval_seconds {
            s if s <= 60 => TimebaseCategory::HighResolution,
            s if s <= 900 => TimebaseCategory::Standard,
            s if s <= 3600 => TimebaseCategory::Medium,
            s if s <= 86400 => TimebaseCategory::Low,
            _ => TimebaseCategory::Archive,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum TimebaseCategory {
    HighResolution,
    Standard,
    Medium,
    Low,
    Archive,
}

impl TimebaseCategory {
    pub fn as_str(&self) -> &'static str {
        match self {
            TimebaseCategory::HighResolution => "High Resolution",
            TimebaseCategory::Standard => "Standard",
            TimebaseCategory::Medium => "Medium Resolution",
            TimebaseCategory::Low => "Low Resolution",
            TimebaseCategory::Archive => "Archive",
        }
    }

    pub fn description(&self) -> &'static str {
        match self {
            TimebaseCategory::HighResolution => "For real-time monitoring and short-term analysis",
            TimebaseCategory::Standard => "For regular monitoring and daily analysis",
            TimebaseCategory::Medium => "For trend analysis and weekly reports",
            TimebaseCategory::Low => "For long-term trends and monthly reports",
            TimebaseCategory::Archive => "For historical analysis and yearly reports",
        }
    }
}
