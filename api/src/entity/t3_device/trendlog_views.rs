// T3000 TRENDLOG_VIEWS Entity - View configurations and metadata for TrendLog Views 2 and 3
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "TRENDLOG_VIEWS")]
#[serde(rename_all = "camelCase")]
pub struct Model {
    #[sea_orm(primary_key, column_name = "id")]
    pub id: i32,                                // Auto-incrementing primary key

    #[sea_orm(column_name = "trendlog_id")]
    pub trendlog_id: String,                    // C++ Trendlog_ID (FK to TRENDLOGS.Trendlog_ID)
    #[sea_orm(column_name = "view_number")]
    pub view_number: i32,                       // View number: 2, 3 (View 1 is always "all data")
    #[sea_orm(column_name = "view_name")]
    pub view_name: Option<String>,              // User-defined view name (optional)
    #[sea_orm(column_name = "view_description")]
    pub view_description: Option<String>,       // User-defined view description (optional)
    #[sea_orm(column_name = "view_config")]
    pub view_config: Option<String>,            // JSON configuration for the view (chart settings, etc.)
    #[sea_orm(column_name = "is_active")]
    pub is_active: Option<i32>,                 // Active status: 1=active, 0=inactive
    #[sea_orm(column_name = "created_at")]
    pub created_at: Option<String>,             // Record creation time
    #[sea_orm(column_name = "updated_at")]
    pub updated_at: Option<String>,             // Record update time
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
