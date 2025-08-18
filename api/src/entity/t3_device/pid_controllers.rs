// T3000 PID_TABLE Entity - Exact match to T3000.db PID_TABLE table
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "PID_TABLE")]
#[serde(rename_all = "camelCase")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub nSerialNumber: i32,                     // C++ nSerialNumber (FK to ALL_NODE.Serial_ID)

    pub Loop_Field: Option<String>,             // C++ Loop
    pub Switch_Node: Option<String>,            // C++ Switch_Node
    pub Input_Field: Option<String>,            // C++ Input
    pub Input_Value: Option<String>,            // C++ Input_Value
    pub Auto_Manual: Option<String>,            // C++ Auto_Manual
    pub Output_Field: Option<String>,           // C++ Output
    pub Output_Value: Option<String>,           // C++ Output_Value
    pub Set_Value: Option<String>,              // C++ Set_Value
    pub Units: Option<String>,                  // C++ Units
    pub Action_Field: Option<String>,           // C++ Action
    pub Proportional: Option<String>,           // C++ Proportional
    pub Reset_Field: Option<String>,            // C++ Reset
    pub Rate: Option<String>,                   // C++ Rate
    pub Bias: Option<String>,                   // C++ Bias
    pub Status: Option<String>,                 // C++ Status
    pub Type_Field: Option<String>,             // C++ Type
    pub Setpoint_High: Option<String>,          // C++ Setpoint_High
    pub Setpoint_Low: Option<String>,           // C++ Setpoint_Low
    pub Units_State: Option<String>,            // C++ Units_State
    pub Variable_State: Option<String>,         // C++ Variable_State
    pub BinaryArray: Option<String>,            // C++ BinaryArray (hex encoded)
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
