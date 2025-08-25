// T3000 PID_TABLE Entity - Exact match to T3000.db PID_TABLE table
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "PID_TABLE")]
#[serde(rename_all = "camelCase")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false, column_name = "SerialNumber")]
    pub serial_number: i32,                     // C++ SerialNumber (FK to DEVICES.SerialNumber)

    #[sea_orm(column_name = "Loop_Field")]
    pub loop_field: Option<String>,             // C++ Loop
    #[sea_orm(column_name = "Switch_Node")]
    pub switch_node: Option<String>,            // C++ Switch_Node
    #[sea_orm(column_name = "Input_Field")]
    pub input_field: Option<String>,            // C++ Input
    #[sea_orm(column_name = "Input_Value")]
    pub input_value: Option<String>,            // C++ Input_Value
    #[sea_orm(column_name = "Auto_Manual")]
    pub auto_manual: Option<String>,            // C++ Auto_Manual
    #[sea_orm(column_name = "Output_Field")]
    pub output_field: Option<String>,           // C++ Output
    #[sea_orm(column_name = "Output_Value")]
    pub output_value: Option<String>,           // C++ Output_Value
    #[sea_orm(column_name = "Set_Value")]
    pub set_value: Option<String>,              // C++ Set_Value
    #[sea_orm(column_name = "Units")]
    pub units: Option<String>,                  // C++ Units
    #[sea_orm(column_name = "Action_Field")]
    pub action_field: Option<String>,           // C++ Action
    #[sea_orm(column_name = "Proportional")]
    pub proportional: Option<String>,           // C++ Proportional
    #[sea_orm(column_name = "Reset_Field")]
    pub reset_field: Option<String>,            // C++ Reset
    #[sea_orm(column_name = "Rate")]
    pub rate: Option<String>,                   // C++ Rate
    #[sea_orm(column_name = "Bias")]
    pub bias: Option<String>,                   // C++ Bias
    #[sea_orm(column_name = "Status")]
    pub status: Option<String>,                 // C++ Status
    #[sea_orm(column_name = "Type_Field")]
    pub type_field: Option<String>,             // C++ Type
    #[sea_orm(column_name = "Setpoint_High")]
    pub setpoint_high: Option<String>,          // C++ Setpoint_High
    #[sea_orm(column_name = "Setpoint_Low")]
    pub setpoint_low: Option<String>,           // C++ Setpoint_Low
    #[sea_orm(column_name = "Units_State")]
    pub units_state: Option<String>,            // C++ Units_State
    #[sea_orm(column_name = "Variable_State")]
    pub variable_state: Option<String>,         // C++ Variable_State
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
