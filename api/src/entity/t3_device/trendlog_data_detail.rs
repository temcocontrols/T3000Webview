// T3000 TRENDLOG_DATA_DETAIL Entity (Child) - Stores time-series values only
// OPTIMIZED: Removed id, LoggingTime, SyncInterval, CreatedBy (moved to TRENDLOG_DATA_SYNC_METADATA)
// Space savings: 24 bytes per record (35% reduction)
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

    #[sea_orm(column_name = "DataSource")]
    pub data_source: Option<i32>,              // 1=FFI_SYNC, 2=REALTIME, 3=HISTORICAL, 4=MANUAL

    #[sea_orm(column_name = "SyncMetadataId")]
    pub sync_metadata_id: Option<i32>,         // References TRENDLOG_DATA_SYNC_METADATA.id - NULL for non-FFI
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
