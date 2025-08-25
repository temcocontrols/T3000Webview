// T3000 PROGRAMS Entity - Exact match to T3000.db PROGRAMS table
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "PROGRAMS")]
#[serde(rename_all = "camelCase")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false, column_name = "SerialNumber")]
    pub serial_number: i32,                     // C++ SerialNumber (FK to DEVICES.SerialNumber)

    #[sea_orm(column_name = "Program_ID")]
    pub program_id: Option<String>,             // C++ Program_ID
    #[sea_orm(column_name = "Switch_Node")]
    pub switch_node: Option<String>,            // C++ Switch_Node
    #[sea_orm(column_name = "Program_Label")]
    pub program_label: Option<String>,          // C++ Program_Label
    #[sea_orm(column_name = "Program_List")]
    pub program_list: Option<String>,           // C++ Program_List
    #[sea_orm(column_name = "Program_Size")]
    pub program_size: Option<String>,           // C++ Program_Size
    #[sea_orm(column_name = "Program_Pointer")]
    pub program_pointer: Option<String>,        // C++ Program_Pointer
    #[sea_orm(column_name = "Program_Status")]
    pub program_status: Option<String>,         // C++ Program_Status
    #[sea_orm(column_name = "Auto_Manual")]
    pub auto_manual: Option<String>,            // C++ Auto_Manual
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
