//! Data Sync Metadata Entity
//!
//! Tracks synchronization operations for device data (INPUTS, OUTPUTS, VARIABLES, etc.)
//! from both FFI backend service and frontend manual refreshes.
//!
//! Purpose:
//! - Show users when data was last updated
//! - Distinguish between automatic backend syncs and manual UI refreshes
//! - Track sync success/failure for troubleshooting
//! - Maintain sync history (latest 10 records per device/type)

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "DATA_SYNC_METADATA")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,

    /// Unix timestamp of when the sync occurred
    /// Example: 1735210845
    pub sync_time: i64,

    /// Human-readable formatted timestamp
    /// Example: "2025-12-26 14:30:45"
    pub sync_time_fmt: String,

    /// Type of data being synced
    /// Values: "INPUTS", "OUTPUTS", "VARIABLES", "PROGRAMS", "SCHEDULES", "HOLIDAYS"
    pub data_type: String,

    /// Device serial number
    pub serial_number: String,

    /// Panel ID (optional, NULL if not panel-specific)
    pub panel_id: Option<i32>,

    /// Number of records updated in this sync operation
    pub records_synced: i32,

    /// Source of the sync operation
    /// Values: "FFI_BACKEND" (automatic background sync) or "UI_REFRESH" (user-initiated)
    pub sync_method: String,

    /// Sync operation success status
    /// 1 = successful, 0 = failed
    pub success: i32,

    /// Error message if sync failed (NULL if successful)
    pub error_message: Option<String>,

    /// Timestamp when this record was created
    pub created_at: i64,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}

/// Helper constants for sync_method field
pub mod sync_method {
    pub const FFI_BACKEND: &str = "FFI_BACKEND";
    pub const UI_REFRESH: &str = "UI_REFRESH";
}

/// Helper constants for data_type field
pub mod data_type {
    pub const INPUTS: &str = "INPUTS";
    pub const OUTPUTS: &str = "OUTPUTS";
    pub const VARIABLES: &str = "VARIABLES";
    pub const PROGRAMS: &str = "PROGRAMS";
    pub const SCHEDULES: &str = "SCHEDULES";
    pub const HOLIDAYS: &str = "HOLIDAYS";
    pub const GRAPHICS: &str = "GRAPHICS";
    pub const ALARMS: &str = "ALARMS";
}
