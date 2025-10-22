//! Application Configuration History Entity
//!
//! Tracks all changes to APPLICATION_CONFIG for audit trail and rollback.
//! Used for:
//! - FFI sync interval changes
//! - Database settings modifications
//! - Critical configuration changes
//! - User preference updates
//!
//! Provides complete audit trail with:
//! - What changed (config_key)
//! - Old and new values
//! - Who made the change (user or system)
//! - When the change occurred
//! - Optional reason/comment

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "APPLICATION_CONFIG_HISTORY")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,

    /// Configuration key that was changed
    /// Examples: "ffi.sync_interval_secs", "database.max_file_size"
    pub config_key: String,

    /// Previous value before change (NULL for new entries)
    pub old_value: Option<String>,

    /// New value after change
    pub new_value: String,

    /// Who made the change (username, "system", "api", etc.)
    pub changed_by: Option<String>,

    /// Optional reason or comment for the change
    pub change_reason: Option<String>,

    /// Timestamp when change occurred
    pub changed_at: DateTime,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}

/// Helper methods for configuration history
impl Model {
    /// Check if this was a system-initiated change
    pub fn is_system_change(&self) -> bool {
        self.changed_by.as_deref() == Some("system")
    }

    /// Check if this was an API-initiated change
    pub fn is_api_change(&self) -> bool {
        self.changed_by.as_deref() == Some("api")
    }

    /// Get a human-readable description of the change
    pub fn get_change_description(&self) -> String {
        let old = self.old_value.as_deref().unwrap_or("(none)");
        let new = &self.new_value;
        format!("Changed from '{}' to '{}'", old, new)
    }

    /// Format the change for display
    pub fn format_for_display(&self) -> String {
        let changed_by = self.changed_by.as_deref().unwrap_or("unknown");
        let reason = self.change_reason.as_deref().unwrap_or("No reason provided");
        format!(
            "{} changed by {} at {} - {}",
            self.config_key,
            changed_by,
            self.changed_at.format("%Y-%m-%d %H:%M:%S"),
            reason
        )
    }
}
