// T3000 TRENDLOGS E}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {} to T3000.db TRENDLOGS table
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "TRENDLOGS")]
#[serde(rename_all = "camelCase")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub nSerialNumber: i32,                     // C++ nSerialNumber (FK to ALL_NODE.Serial_ID)

    pub Trendlog_ID: Option<String>,            // C++ Trendlog_ID (following T3000 ID pattern)
    pub Switch_Node: Option<String>,            // C++ Switch_Node (following T3000 pattern)
    pub Trendlog_Label: Option<String>,         // C++ Trendlog_Label (following T3000 label pattern)
    pub Interval_Minutes: Option<i32>,          // C++ Interval_Minutes
    pub Buffer_Size: Option<i32>,               // C++ Buffer_Size
    pub Data_Size_KB: Option<i32>,              // C++ Data_Size_KB
    pub Auto_Manual: Option<String>,            // C++ Auto_Manual (following T3000 pattern)
    pub Status: Option<String>,                 // C++ Status (following T3000 pattern)
    pub BinaryArray: Option<String>,            // C++ BinaryArray (following T3000 pattern)
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::all_node::Entity",
        from = "Column::DeviceId",
        to = "super::all_node::Column::SerialId"
    )]
    Devices,
}

impl Related<super::all_node::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Devices.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
