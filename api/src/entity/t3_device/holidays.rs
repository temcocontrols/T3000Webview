// T3000 HOLIDAYS Entity - Exact match to T3000.db HOLIDAYS table
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "HOLIDAYS")]
#[serde(rename_all = "camelCase")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub nSerialNumber: i32,                     // C++ nSerialNumber (FK to ALL_NODE.Serial_ID)

    pub Holiday_ID: Option<String>,             // C++ Holiday_ID
    pub Auto_Manual: Option<String>,            // C++ Auto_Manual
    pub Holiday_Value: Option<String>,          // C++ Holiday_Value
    pub Status: Option<String>,                 // C++ Status
    pub Month_Field: Option<String>,            // C++ Month
    pub Day_Field: Option<String>,              // C++ Day
    pub Year_Field: Option<String>,             // C++ Year
    pub BinaryArray: Option<String>,            // C++ BinaryArray (hex encoded)
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
