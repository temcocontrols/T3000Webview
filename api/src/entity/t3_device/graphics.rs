// T3000 GRAPHICS Entity - Exact match to T3000.db GRAPHICS table
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "GRAPHICS")]
#[serde(rename_all = "camelCase")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false, column_name = "SerialNumber")]
    pub serial_number: i32,                     // C++ SerialNumber (FK to DEVICES.SerialNumber)

    #[sea_orm(column_name = "Graphic_ID")]
    pub graphic_id: Option<String>,             // C++ Graphic_ID
    #[sea_orm(column_name = "Switch_Node")]
    pub switch_node: Option<String>,            // C++ Switch_Node
    #[sea_orm(column_name = "Graphic_Label")]
    pub graphic_label: Option<String>,          // C++ Graphic_Label (short)
    #[sea_orm(column_name = "Graphic_Full_Label")]
    pub graphic_full_label: Option<String>,     // C++ Graphic_Full_Label (full description)
    #[sea_orm(column_name = "Graphic_Picture_File")]
    pub graphic_picture_file: Option<String>,   // C++ Graphic_Picture_File
    #[sea_orm(column_name = "Graphic_Total_Point")]
    pub graphic_total_point: Option<String>,    // C++ Graphic_Total_Point
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
