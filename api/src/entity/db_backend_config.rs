//! Database Backend Configuration Entity
//!
//! Stores connection settings for each supported database backend.
//! Each backend type is a row. Only one row has is_active=1 at a time.
//! This table ALWAYS lives in local SQLite (never on remote DB).

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "DB_BACKEND_CONFIG")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,

    #[sea_orm(unique)]
    pub backend_type: String,

    pub is_active: i32,

    pub host: Option<String>,
    pub port: Option<i32>,
    pub instance: Option<String>,
    pub database_name: Option<String>,
    pub username: Option<String>,

    /// Encrypted password (AES-256-GCM). NULL for sqlite.
    pub password: Option<String>,

    pub connection_url: Option<String>,

    /// JSON for backend-specific options
    pub extra_options: Option<String>,

    pub updated_at: Option<String>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
