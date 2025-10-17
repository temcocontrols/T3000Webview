//! Application Configuration Storage Entity
//!
//! Unified storage for all application configuration including:
//! - Graphics data (deviceAppState, t3.library, t3.draw, etc.)
//! - User preferences (localSettings, UI state)
//! - System settings (database config, maintenance)
//! - Device-specific configuration
//!
//! Replaces localStorage with database-backed storage for better reliability,
//! cross-device sync, and large data handling.

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "APPLICATION_CONFIG")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,

    /// Configuration key (matches localStorage keys)
    /// Examples: "deviceAppState", "localSettings", "t3.library", "t3.draw",
    /// "t3.state", "database.max_file_size", "ui.theme"
    pub config_key: String,

    /// Configuration value (JSON or primitive)
    /// Supports large graphics data with nested objects
    pub config_value: String,

    /// Data type for validation and parsing
    /// Values: "string", "number", "boolean", "json"
    pub config_type: String,

    /// Human-readable description
    pub description: Option<String>,

    /// User identifier (NULL for global settings)
    pub user_id: Option<i32>,

    /// Device serial number (NULL for non-device-specific)
    /// TEXT type to match frontend API (device serials can be alphanumeric)
    pub device_serial: Option<String>,

    /// Panel ID (NULL for non-panel-specific)
    pub panel_id: Option<i32>,

    /// System vs User setting
    /// true = system setting (readonly), false = user setting (editable)
    pub is_system: bool,

    /// Version tracking for data schema migrations
    /// Example: "0.8.1" for graphics data version
    pub version: Option<String>,

    /// Size in bytes (auto-calculated, for monitoring large data)
    pub size_bytes: Option<i32>,

    /// Creation timestamp
    pub created_at: DateTime,

    /// Last update timestamp (auto-updated by trigger)
    pub updated_at: DateTime,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}

/// Configuration scope helper
impl Model {
    /// Check if this is a global setting
    pub fn is_global(&self) -> bool {
        self.user_id.is_none() && self.device_serial.is_none() && self.panel_id.is_none()
    }

    /// Check if this is a user-specific setting
    pub fn is_user_scoped(&self) -> bool {
        self.user_id.is_some()
    }

    /// Check if this is a device-specific setting
    pub fn is_device_scoped(&self) -> bool {
        self.device_serial.is_some()
    }

    /// Parse JSON value
    pub fn parse_json_value(&self) -> Result<serde_json::Value, serde_json::Error> {
        serde_json::from_str(&self.config_value)
    }

    /// Get value as string
    pub fn as_string(&self) -> Option<String> {
        if self.config_type == "string" {
            Some(self.config_value.trim_matches('"').to_string())
        } else {
            None
        }
    }

    /// Get value as number
    pub fn as_number(&self) -> Option<f64> {
        if self.config_type == "number" {
            self.config_value.parse::<f64>().ok()
        } else {
            None
        }
    }

    /// Get value as boolean
    pub fn as_bool(&self) -> Option<bool> {
        if self.config_type == "boolean" {
            self.config_value.parse::<bool>().ok()
        } else {
            None
        }
    }
}
