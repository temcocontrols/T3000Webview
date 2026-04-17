//! Server / Client Registry Entity
//!
//! Tracks all PCs participating in centralized database mode.
//! The server writes its own entry; clients send heartbeats.

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "SERVER_CLIENT_REGISTRY")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,

    pub hostname: String,
    pub ip_address: String,

    /// "server" or "client"
    pub role: String,

    /// 1 = this PC's own entry written by the local heartbeat
    pub is_self: i32,

    /// "online" or "offline"
    pub status: String,

    /// ISO-8601 datetime of last heartbeat
    pub last_seen: String,

    /// Active DB backend type (sqlite, mssql, etc.)
    pub db_backend: Option<String>,

    /// Number of tables in the database
    pub table_count: Option<i32>,

    /// T3000 / webview version string
    pub version: Option<String>,

    pub created_at: Option<String>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
