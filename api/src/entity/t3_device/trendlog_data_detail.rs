// T3000 TRENDLOG_DATA_DETAIL Entity (Child) - Stores time-series values only
// OPTIMIZED: Removed id, LoggingTime, SyncInterval, CreatedBy, DataSource, SyncMetadataId
// Space savings: 32 bytes per record (47% reduction from original schema)
// Tracking: DataSource always FFI_SYNC (constant), SyncMetadataId tracked at metadata table level
// NO FOREIGN KEYS - removed for simplicity
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "TRENDLOG_DATA_DETAIL")]
#[serde(rename_all = "camelCase")]
pub struct Model {
    // NO id field - use built-in rowid instead
    #[sea_orm(primary_key, auto_increment = false, column_name = "ParentId")]
    pub parent_id: i32,                        // References TRENDLOG_DATA.id

    #[sea_orm(column_name = "Value")]
    pub value: String,                         // C++ Point Value (actual sensor/point value)

    #[sea_orm(column_name = "LoggingTime_Fmt")]
    pub logging_time_fmt: String,              // C++ Formatted Time (e.g., "2025-10-28 13:35:49")
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
