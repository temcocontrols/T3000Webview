//! Database Partition Management Entity
//!
//! This entity manages database partitions for automated cleanup and size management
//! with support for daily, weekly, and monthly partitioning strategies.

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "DATABASE_PARTITIONS")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,

    /// Table name that is partitioned
    pub table_name: String,

    /// Partition type: "DAILY", "WEEKLY", "MONTHLY"
    pub partition_type: String,

    /// Partition identifier (e.g., "2025-01-25", "2025-W04", "2025-01")
    pub partition_identifier: String,

    /// Start date for this partition (inclusive)
    pub partition_start_date: DateTime,

    /// End date for this partition (exclusive)
    pub partition_end_date: DateTime,

    /// Current record count in this partition
    pub record_count: i64,

    /// Estimated size in bytes
    pub size_bytes: i64,

    /// Whether this partition is active for new inserts
    pub is_active: bool,

    /// Whether this partition is archived (read-only)
    pub is_archived: bool,

    /// Retention policy in days (null for permanent)
    pub retention_days: Option<i32>,

    /// Auto-cleanup enabled for this partition
    pub auto_cleanup_enabled: bool,

    /// Last cleanup timestamp
    pub last_cleanup_at: Option<DateTime>,

    /// Creation timestamp
    pub created_at: DateTime,

    /// Last update timestamp
    pub updated_at: DateTime,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}

/// Partition type enumeration
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum PartitionType {
    Daily,
    Weekly,
    Monthly,
}

impl PartitionType {
    pub fn as_str(&self) -> &'static str {
        match self {
            PartitionType::Daily => "DAILY",
            PartitionType::Weekly => "WEEKLY",
            PartitionType::Monthly => "MONTHLY",
        }
    }

    /// Get default retention days for partition type
    pub fn default_retention_days(&self) -> i32 {
        match self {
            PartitionType::Daily => 30,    // 30 days for daily partitions
            PartitionType::Weekly => 84,   // 12 weeks for weekly partitions
            PartitionType::Monthly => 365, // 12 months for monthly partitions
        }
    }
}

impl From<String> for PartitionType {
    fn from(s: String) -> Self {
        match s.as_str() {
            "DAILY" => PartitionType::Daily,
            "WEEKLY" => PartitionType::Weekly,
            "MONTHLY" => PartitionType::Monthly,
            _ => PartitionType::Daily,
        }
    }
}

/// Database partition with management metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatabasePartition {
    pub id: Option<i32>,
    pub table_name: String,
    pub partition_type: PartitionType,
    pub partition_identifier: String,
    pub partition_start_date: DateTime,
    pub partition_end_date: DateTime,
    pub record_count: i64,
    pub size_bytes: i64,
    pub is_active: bool,
    pub is_archived: bool,
    pub retention_days: Option<i32>,
    pub auto_cleanup_enabled: bool,
    pub last_cleanup_at: Option<DateTime>,
}

impl DatabasePartition {
    /// Create a new database partition
    pub fn new(
        table_name: String,
        partition_type: PartitionType,
        start_date: DateTime,
        end_date: DateTime,
    ) -> Self {
        let partition_identifier = match partition_type {
            PartitionType::Daily => start_date.format("%Y-%m-%d").to_string(),
            PartitionType::Weekly => start_date.format("%Y-W%U").to_string(),
            PartitionType::Monthly => start_date.format("%Y-%m").to_string(),
        };

        Self {
            id: None,
            table_name,
            partition_type: partition_type.clone(),
            partition_identifier,
            partition_start_date: start_date,
            partition_end_date: end_date,
            record_count: 0,
            size_bytes: 0,
            is_active: true,
            is_archived: false,
            retention_days: Some(partition_type.default_retention_days()),
            auto_cleanup_enabled: true,
            last_cleanup_at: None,
        }
    }

    /// Mark partition as archived
    pub fn archive(mut self) -> Self {
        self.is_archived = true;
        self.is_active = false;
        self
    }

    /// Enable auto-cleanup with custom retention
    pub fn with_retention(mut self, retention_days: i32) -> Self {
        self.retention_days = Some(retention_days);
        self.auto_cleanup_enabled = true;
        self
    }

    /// Disable auto-cleanup (permanent retention)
    pub fn permanent(mut self) -> Self {
        self.retention_days = None;
        self.auto_cleanup_enabled = false;
        self
    }

    /// Update statistics
    pub fn update_stats(mut self, record_count: i64, size_bytes: i64) -> Self {
        self.record_count = record_count;
        self.size_bytes = size_bytes;
        self
    }
}
