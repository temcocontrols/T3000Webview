// T3000 TRENDLOG_DATA_DETAIL Entity (Child) - Stores time-series values only
// Optimized split-table design: only changing values stored per log entry
// Related to TRENDLOG_DATA (parent) via many-to-one relationship (ParentId foreign key)
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "TRENDLOG_DATA_DETAIL")]
#[serde(rename_all = "camelCase")]
pub struct Model {
    #[sea_orm(primary_key, column_name = "id")]
    pub id: i32,                               // Auto-increment primary key

    #[sea_orm(column_name = "ParentId")]
    pub parent_id: i32,                        // Foreign key to TRENDLOG_DATA.id

    #[sea_orm(column_name = "Value")]
    pub value: String,                         // C++ Point Value (actual sensor/point value)

    #[sea_orm(column_name = "LoggingTime")]
    pub logging_time: i64,                     // C++ Logging Time as Unix timestamp (INTEGER for efficiency)

    #[sea_orm(column_name = "LoggingTime_Fmt")]
    pub logging_time_fmt: String,              // C++ Formatted Time (e.g., "2025-10-23 12:34:56")

    #[sea_orm(column_name = "DataSource")]
    pub data_source: Option<String>,           // Data source tracking ('REALTIME', 'FFI_SYNC', 'HISTORICAL', 'MANUAL')

    #[sea_orm(column_name = "SyncInterval")]
    pub sync_interval: Option<i32>,            // Sync interval in seconds

    #[sea_orm(column_name = "CreatedBy")]
    pub created_by: Option<String>,            // Creator identification ('FRONTEND', 'BACKEND', 'API')
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::trendlog_data::Entity",
        from = "Column::ParentId",
        to = "super::trendlog_data::Column::Id",
        on_update = "NoAction",
        on_delete = "Cascade"
    )]
    TrendlogData,
}

impl Related<super::trendlog_data::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::TrendlogData.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
