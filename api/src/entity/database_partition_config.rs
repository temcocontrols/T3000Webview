//! Database Partition Configuration Entity
//!
//! This entity manages the configuration for database partitioning strategies
//! including custom days, custom months, and retention policies.

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};
use chrono::{Datelike, Timelike};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "database_partition_config")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,

    /// Partitioning strategy: "daily", "weekly", "monthly", "quarterly", "custom", "custom-months"
    pub strategy: String,

    /// Number of days for custom strategy (nullable)
    pub custom_days: Option<i32>,

    /// Number of months for custom-months strategy (nullable)
    pub custom_months: Option<i32>,

    /// Whether auto cleanup is enabled
    pub auto_cleanup_enabled: bool,

    /// Retention value (number)
    pub retention_value: i32,

    /// Retention unit: "days", "weeks", "months"
    pub retention_unit: String,

    /// Whether this configuration is active
    pub is_active: bool,

    /// Creation timestamp
    pub created_at: DateTime,

    /// Last update timestamp
    pub updated_at: DateTime,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}

/// Database partition configuration with validation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatabasePartitionConfig {
    pub id: Option<i32>,
    pub strategy: PartitionStrategy,
    pub custom_days: Option<i32>,
    pub custom_months: Option<i32>,
    pub auto_cleanup_enabled: bool,
    pub retention_value: i32,
    pub retention_unit: RetentionUnit,
    pub is_active: bool,
}

/// Partition strategy enumeration
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum PartitionStrategy {
    FiveMinutes,
    Daily,
    Weekly,
    Monthly,
    Quarterly,
    Custom,
    CustomMonths,
}

impl PartitionStrategy {
    pub fn as_str(&self) -> &'static str {
        match self {
            PartitionStrategy::FiveMinutes => "5minutes",
            PartitionStrategy::Daily => "daily",
            PartitionStrategy::Weekly => "weekly",
            PartitionStrategy::Monthly => "monthly",
            PartitionStrategy::Quarterly => "quarterly",
            PartitionStrategy::Custom => "custom",
            PartitionStrategy::CustomMonths => "custom-months",
        }
    }

    /// Validate custom parameters for the strategy
    pub fn validate_custom_params(&self, custom_days: Option<i32>, custom_months: Option<i32>) -> bool {
        match self {
            PartitionStrategy::Custom => custom_days.is_some() && custom_days.unwrap() >= 1 && custom_days.unwrap() <= 365,
            PartitionStrategy::CustomMonths => custom_months.is_some() && custom_months.unwrap() >= 1 && custom_months.unwrap() <= 12,
            _ => true, // Other strategies don't need custom params
        }
    }
}

impl From<String> for PartitionStrategy {
    fn from(s: String) -> Self {
        match s.as_str() {
            "5minutes" => PartitionStrategy::FiveMinutes,
            "daily" => PartitionStrategy::Daily,
            "weekly" => PartitionStrategy::Weekly,
            "monthly" => PartitionStrategy::Monthly,
            "quarterly" => PartitionStrategy::Quarterly,
            "custom" => PartitionStrategy::Custom,
            "custom-months" => PartitionStrategy::CustomMonths,
            _ => PartitionStrategy::Monthly, // Default fallback
        }
    }
}

/// Retention unit enumeration
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum RetentionUnit {
    Days,
    Weeks,
    Months,
}

impl RetentionUnit {
    pub fn as_str(&self) -> &'static str {
        match self {
            RetentionUnit::Days => "days",
            RetentionUnit::Weeks => "weeks",
            RetentionUnit::Months => "months",
        }
    }

    /// Convert retention value to days for calculation
    pub fn to_days(&self, value: i32) -> i32 {
        match self {
            RetentionUnit::Days => value,
            RetentionUnit::Weeks => value * 7,
            RetentionUnit::Months => value * 30, // Approximate month
        }
    }
}

impl From<String> for RetentionUnit {
    fn from(s: String) -> Self {
        match s.as_str() {
            "days" => RetentionUnit::Days,
            "weeks" => RetentionUnit::Weeks,
            "months" => RetentionUnit::Months,
            _ => RetentionUnit::Days, // Default fallback
        }
    }
}

impl DatabasePartitionConfig {
    /// Create a new configuration with defaults
    pub fn new() -> Self {
        Self {
            id: None,
            strategy: PartitionStrategy::Monthly,
            custom_days: Some(30),
            custom_months: Some(2),
            auto_cleanup_enabled: true,
            retention_value: 30,
            retention_unit: RetentionUnit::Days,
            is_active: true,
        }
    }

    /// Validate the configuration
    pub fn validate(&self) -> Result<(), String> {
        // Validate strategy-specific parameters
        if !self.strategy.validate_custom_params(self.custom_days, self.custom_months) {
            return Err("Invalid custom parameters for the selected strategy".to_string());
        }

        // Validate retention values
        if self.retention_value < 1 {
            return Err("Retention value must be at least 1".to_string());
        }

        match self.retention_unit {
            RetentionUnit::Days if self.retention_value > 3650 => {
                return Err("Retention days cannot exceed 3650 (10 years)".to_string());
            }
            RetentionUnit::Weeks if self.retention_value > 520 => {
                return Err("Retention weeks cannot exceed 520 (10 years)".to_string());
            }
            RetentionUnit::Months if self.retention_value > 120 => {
                return Err("Retention months cannot exceed 120 (10 years)".to_string());
            }
            _ => {}
        }

        Ok(())
    }

    /// Generate partition identifier based on strategy and date
    pub fn generate_partition_identifier(&self, date: &DateTime) -> String {
        match self.strategy {
            PartitionStrategy::FiveMinutes => {
                let minute_slot = (date.minute() / 5) * 5;
                format!("{}-{:02}{:02}", date.format("%Y-%m-%d"), date.hour(), minute_slot)
            }
            PartitionStrategy::Daily => date.format("%Y-%m-%d").to_string(),
            PartitionStrategy::Weekly => {
                // Use ISO week format %W (Monday-based) and handle week 0
                let week_num = date.format("%W").to_string();
                format!("{}-W{:02}", date.year(), week_num.parse::<u32>().unwrap_or(0))
            }
            PartitionStrategy::Monthly => date.format("%Y-%m").to_string(),
            PartitionStrategy::Quarterly => {
                let quarter = (date.month() - 1) / 3 + 1;
                format!("{}-Q{}", date.year(), quarter)
            }
            PartitionStrategy::Custom => {
                let days = self.custom_days.unwrap_or(30);
                // Calculate which custom period this date falls into
                let epoch = chrono::NaiveDate::from_ymd_opt(2025, 1, 1).unwrap();
                let current_date = date.date();
                let days_since_epoch = current_date.signed_duration_since(epoch).num_days();
                let period = days_since_epoch / days as i64;
                format!("custom-{}-P{}", days, period)
            }
            PartitionStrategy::CustomMonths => {
                let months = self.custom_months.unwrap_or(2);
                // Calculate which custom month period this falls into
                let base_year = 2025;
                let total_months = (date.year() - base_year) * 12 + (date.month() as i32 - 1);
                let period = total_months / months as i32;
                format!("custom-{}m-P{}", months, period)
            }
        }
    }

    /// Get description of current strategy
    pub fn get_description(&self) -> String {
        match self.strategy {
            PartitionStrategy::FiveMinutes => "One file every 5 minutes (for testing)".to_string(),
            PartitionStrategy::Daily => "One file per day".to_string(),
            PartitionStrategy::Weekly => "One file per week".to_string(),
            PartitionStrategy::Monthly => "One file per month".to_string(),
            PartitionStrategy::Quarterly => "One file per quarter (3 months)".to_string(),
            PartitionStrategy::Custom => {
                format!("One file every {} days", self.custom_days.unwrap_or(30))
            }
            PartitionStrategy::CustomMonths => {
                format!("One file every {} months", self.custom_months.unwrap_or(2))
            }
        }
    }
}

impl Default for DatabasePartitionConfig {
    fn default() -> Self {
        Self::new()
    }
}
