//! Database Management Entity - Application Settings Storage
//!
//! This entity replaces localStorage functionality and provides centralized
//! application settings storage in the database with better performance and reliability.

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "APPLICATION_SETTINGS")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,

    /// Setting category (matches localStorage usage patterns)
    /// e.g., "modbusRegisterGridState", "localSettings", "appState", "userPreferences"
    pub category: String,

    /// Setting key within the category
    /// e.g., "columnWidths", "sortOrder", "viewConfiguration"
    pub setting_key: String,

    /// JSON value storage (replaces localStorage JSON serialization)
    pub setting_value: String,

    /// User identifier (null for global settings)
    pub user_id: Option<i32>,

    /// Device serial number (null for non-device-specific settings)
    pub device_serial: Option<i32>,

    /// Panel ID (null for non-panel-specific settings)
    pub panel_id: Option<i32>,

    /// Setting description for management UI
    pub description: Option<String>,

    /// Setting data type for validation
    /// Values: "string", "number", "boolean", "object", "array"
    pub data_type: String,

    /// Whether the setting is read-only
    pub is_readonly: bool,

    /// Setting expiry timestamp (null for permanent settings)
    pub expires_at: Option<DateTime>,

    /// Creation timestamp
    pub created_at: DateTime,

    /// Last update timestamp
    pub updated_at: DateTime,

    /// Created by (matches DataSource pattern)
    pub created_by: String,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}

/// DataSource enum for tracking setting origins
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum DataSource {
    /// Migrated from localStorage
    LocalStorageMigration,
    /// User interface input
    UserInterface,
    /// API endpoint
    ApiEndpoint,
    /// System default
    SystemDefault,
    /// Configuration import
    ConfigImport,
    /// Automatic sync
    AutoSync,
}

impl DataSource {
    pub fn as_str(&self) -> &'static str {
        match self {
            DataSource::LocalStorageMigration => "LOCALSTORAGE_MIGRATION",
            DataSource::UserInterface => "USER_INTERFACE",
            DataSource::ApiEndpoint => "API_ENDPOINT",
            DataSource::SystemDefault => "SYSTEM_DEFAULT",
            DataSource::ConfigImport => "CONFIG_IMPORT",
            DataSource::AutoSync => "AUTO_SYNC",
        }
    }
}

impl From<String> for DataSource {
    fn from(s: String) -> Self {
        match s.as_str() {
            "LOCALSTORAGE_MIGRATION" => DataSource::LocalStorageMigration,
            "USER_INTERFACE" => DataSource::UserInterface,
            "API_ENDPOINT" => DataSource::ApiEndpoint,
            "SYSTEM_DEFAULT" => DataSource::SystemDefault,
            "CONFIG_IMPORT" => DataSource::ConfigImport,
            "AUTO_SYNC" => DataSource::AutoSync,
            _ => DataSource::UserInterface,
        }
    }
}

/// CreatedBy enum for tracking who created the setting
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum CreatedBy {
    /// Frontend application
    Frontend,
    /// Backend service
    Backend,
    /// API client
    ApiClient,
    /// Migration script
    MigrationScript,
    /// System process
    SystemProcess,
    /// Administrator
    Administrator,
}

impl CreatedBy {
    pub fn as_str(&self) -> &'static str {
        match self {
            CreatedBy::Frontend => "FRONTEND",
            CreatedBy::Backend => "BACKEND",
            CreatedBy::ApiClient => "API_CLIENT",
            CreatedBy::MigrationScript => "MIGRATION_SCRIPT",
            CreatedBy::SystemProcess => "SYSTEM_PROCESS",
            CreatedBy::Administrator => "ADMINISTRATOR",
        }
    }
}

impl From<String> for CreatedBy {
    fn from(s: String) -> Self {
        match s.as_str() {
            "FRONTEND" => CreatedBy::Frontend,
            "BACKEND" => CreatedBy::Backend,
            "API_CLIENT" => CreatedBy::ApiClient,
            "MIGRATION_SCRIPT" => CreatedBy::MigrationScript,
            "SYSTEM_PROCESS" => CreatedBy::SystemProcess,
            "ADMINISTRATOR" => CreatedBy::Administrator,
            _ => CreatedBy::Frontend,
        }
    }
}

/// Application setting with type-safe handling
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApplicationSetting {
    pub id: Option<i32>,
    pub category: String,
    pub setting_key: String,
    pub setting_value: serde_json::Value,
    pub user_id: Option<i32>,
    pub device_serial: Option<i32>,
    pub panel_id: Option<i32>,
    pub description: Option<String>,
    pub data_type: String,
    pub is_readonly: bool,
    pub expires_at: Option<DateTime>,
    pub created_by: CreatedBy,
}

impl ApplicationSetting {
    /// Create a new application setting
    pub fn new(
        category: String,
        setting_key: String,
        setting_value: serde_json::Value,
        created_by: CreatedBy,
    ) -> Self {
        Self {
            id: None,
            category,
            setting_key,
            setting_value,
            user_id: None,
            device_serial: None,
            panel_id: None,
            description: None,
            data_type: "object".to_string(),
            is_readonly: false,
            expires_at: None,
            created_by,
        }
    }

    /// Set user-specific setting
    pub fn for_user(mut self, user_id: i32) -> Self {
        self.user_id = Some(user_id);
        self
    }

    /// Set device-specific setting
    pub fn for_device(mut self, device_serial: i32, panel_id: Option<i32>) -> Self {
        self.device_serial = Some(device_serial);
        self.panel_id = panel_id;
        self
    }

    /// Set expiration
    pub fn with_expiry(mut self, expires_at: DateTime) -> Self {
        self.expires_at = Some(expires_at);
        self
    }

    /// Mark as read-only
    pub fn readonly(mut self) -> Self {
        self.is_readonly = true;
        self
    }
}
