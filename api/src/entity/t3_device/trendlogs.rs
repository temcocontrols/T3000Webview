// T3000 TRENDLOGS Entity - Enhanced for FFI integration and webview functionality
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "TRENDLOGS")]
#[serde(rename_all = "camelCase")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false, column_name = "SerialNumber")]
    pub serial_number: i32,                     // C++ SerialNumber (FK to DEVICES.SerialNumber)

    #[sea_orm(column_name = "Trendlog_ID")]
    pub trendlog_id: Option<String>,            // C++ Trendlog_ID (following T3000 ID pattern)
    #[sea_orm(column_name = "Switch_Node")]
    pub switch_node: Option<String>,            // C++ Switch_Node (following T3000 pattern)
    #[sea_orm(column_name = "Trendlog_Label")]
    pub trendlog_label: Option<String>,         // C++ Trendlog_Label (following T3000 label pattern)
    #[sea_orm(column_name = "Interval_Minutes")]
    pub interval_minutes: Option<i32>,          // C++ Interval_Minutes
    #[sea_orm(column_name = "Buffer_Size")]
    pub buffer_size: Option<i32>,               // C++ Buffer_Size
    #[sea_orm(column_name = "Data_Size_KB")]
    pub data_size_kb: Option<String>,           // C++ Data_Size_KB (TEXT for flexibility)
    #[sea_orm(column_name = "Auto_Manual")]
    pub auto_manual: Option<String>,            // C++ Auto_Manual (following T3000 pattern)
    #[sea_orm(column_name = "Status")]
    pub status: Option<String>,                 // C++ Status (following T3000 pattern)

    // Enhanced fields for FFI integration
    #[sea_orm(column_name = "ffi_synced")]
    pub ffi_synced: Option<i32>,                // FFI sync status (0=not synced, 1=synced)
    #[sea_orm(column_name = "last_ffi_sync")]
    pub last_ffi_sync: Option<String>,          // Last FFI sync timestamp
    #[sea_orm(column_name = "created_at")]
    pub created_at: Option<String>,             // Record creation time
    #[sea_orm(column_name = "updated_at")]
    pub updated_at: Option<String>,             // Record update time
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
