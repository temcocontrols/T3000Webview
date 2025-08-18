// T3000 MONITORDATA Entity - Exact match to T3000.db MONITORDATA table
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "MONITORDATA")]
#[serde(rename_all = "camelCase")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub nSerialNumber: i32,                     // C++ nSerialNumber (FK to ALL_NODE.Serial_ID)

    pub Monitor_ID: Option<String>,             // C++ Monitor_ID
    pub Switch_Node: Option<String>,            // C++ Switch_Node
    pub Monitor_Label: Option<String>,          // C++ Monitor_Label
    pub Monitor_Value: Option<String>,          // C++ Monitor_Value
    pub Auto_Manual: Option<String>,            // C++ Auto_Manual
    pub Status: Option<String>,                 // C++ Status
    pub Units: Option<String>,                  // C++ Units
    pub Monitor_Type: Option<String>,           // C++ Monitor_Type
    pub TimeStamp: Option<String>,              // C++ TimeStamp
    pub Range_Field: Option<String>,            // C++ Range
    pub Calibration: Option<String>,            // C++ Calibration
    pub BinaryArray: Option<String>,            // C++ BinaryArray (hex encoded)
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
