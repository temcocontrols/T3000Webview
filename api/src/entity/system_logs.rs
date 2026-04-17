//! SYSTEM_LOGS Entity
//!
//! Application event / error / audit log entries.
//! Written to server DB when enabled via application config.

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "SYSTEM_LOGS")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,

    /// ISO 8601 timestamp of the log event
    pub timestamp: String,

    /// Log level: "info", "warn", "error", "debug"
    pub level: String,

    /// Originating module or service name
    pub source: Option<String>,

    /// Log message
    pub message: String,

    /// Hostname of the PC that generated this log
    pub hostname: Option<String>,

    /// PC role when log was generated: "main" or "reader"
    pub role: Option<String>,

    /// Optional JSON details / extra context
    pub details: Option<String>,

    /// Record creation timestamp
    pub created_at: Option<String>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
