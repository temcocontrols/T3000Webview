// T3000 GRAPHICS Entity - Exact match to T3000.db GRAPHICS table
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "GRAPHICS")]
#[serde(rename_all = "camelCase")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub nSerialNumber: i32,                     // C++ nSerialNumber (FK to ALL_NODE.Serial_ID)

    pub Graphic_ID: Option<String>,             // C++ Graphic_ID
    pub Switch_Node: Option<String>,            // C++ Switch_Node
    pub Graphic_Label: Option<String>,          // C++ Graphic_Label
    pub Graphic_Picture_File: Option<String>,   // C++ Graphic_Picture_File
    pub Graphic_Total_Point: Option<String>,    // C++ Graphic_Total_Point
    pub BinaryArray: Option<String>,            // C++ BinaryArray (hex encoded)
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
