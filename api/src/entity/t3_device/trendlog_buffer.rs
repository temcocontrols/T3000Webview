// T3000 TRENDLOG_BUFFER Entity - Exact match to T3000.db TRENDLOG_BUFFER table
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "TRENDLOG_BUFFER")]
#[serde(rename_all = "camelCase")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub SerialNumber: i32,                     // C++ SerialNumber (FK to DEVICES.SerialNumber)

    pub Trendlog_ID: String,                    // C++ Trendlog_ID
    pub Buffer_Index: Option<i32>,              // C++ Buffer_Index (circular buffer position)
    pub Buffer_Size: Option<i32>,               // C++ Buffer_Size
    pub Current_Position: Option<i32>,          // C++ Current_Position
    pub Buffer_Full: Option<i32>,               // C++ Buffer_Full (0/1 flag)
    pub Status: Option<String>,                 // C++ Status
    pub BinaryArray: Option<String>,            // C++ BinaryArray
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
