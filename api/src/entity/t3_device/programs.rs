// T3000 PROGRAMS Entity - Exact match to T3000.db PROGRAMS table
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "PROGRAMS")]
#[serde(rename_all = "camelCase")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub SerialNumber: i32,                     // C++ SerialNumber (FK to DEVICES.SerialNumber)

    pub Program_ID: Option<String>,             // C++ Program_ID
    pub Switch_Node: Option<String>,            // C++ Switch_Node
    pub Program_Label: Option<String>,          // C++ Program_Label
    pub Program_List: Option<String>,           // C++ Program_List
    pub Program_Size: Option<String>,           // C++ Program_Size
    pub Program_Pointer: Option<String>,        // C++ Program_Pointer
    pub Program_Status: Option<String>,         // C++ Program_Status
    pub Auto_Manual: Option<String>,            // C++ Auto_Manual
    pub BinaryArray: Option<String>,            // C++ BinaryArray (hex encoded)
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
