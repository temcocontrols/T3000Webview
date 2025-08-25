// T3000 TRENDLOG_BUFFER Entity - Exact match to T3000.db TRENDLOG_BUFFER table
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "TRENDLOG_BUFFER")]
#[serde(rename_all = "camelCase")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false, column_name = "SerialNumber")]
    pub serial_number: i32,                     // C++ SerialNumber (FK to DEVICES.SerialNumber)

    #[sea_orm(column_name = "Trendlog_ID")]
    pub trendlog_id: String,                    // C++ Trendlog_ID
    #[sea_orm(column_name = "Buffer_Index")]
    pub buffer_index: Option<i32>,              // C++ Buffer_Index (circular buffer position)
    #[sea_orm(column_name = "Buffer_Size")]
    pub buffer_size: Option<i32>,               // C++ Buffer_Size
    #[sea_orm(column_name = "Current_Position")]
    pub current_position: Option<i32>,          // C++ Current_Position
    #[sea_orm(column_name = "Buffer_Full")]
    pub buffer_full: Option<i32>,               // C++ Buffer_Full (0/1 flag)
    #[sea_orm(column_name = "Status")]
    pub status: Option<String>,                 // C++ Status
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
