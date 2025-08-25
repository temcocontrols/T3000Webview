// T3000 MONITORDATA Entity - Exact match to T3000.db MONITORDATA table
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "MONITORDATA")]
#[serde(rename_all = "camelCase")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false, column_name = "SerialNumber")]
    pub serial_number: i32,                     // C++ SerialNumber (FK to DEVICES.SerialNumber)

    #[sea_orm(column_name = "Monitor_ID")]
    pub monitor_id: Option<String>,             // C++ Monitor_ID
    #[sea_orm(column_name = "Switch_Node")]
    pub switch_node: Option<String>,            // C++ Switch_Node
    #[sea_orm(column_name = "Monitor_Label")]
    pub monitor_label: Option<String>,          // C++ Monitor_Label
    #[sea_orm(column_name = "Monitor_Value")]
    pub monitor_value: Option<String>,          // C++ Monitor_Value
    #[sea_orm(column_name = "Auto_Manual")]
    pub auto_manual: Option<String>,            // C++ Auto_Manual
    #[sea_orm(column_name = "Status")]
    pub status: Option<String>,                 // C++ Status
    #[sea_orm(column_name = "Units")]
    pub units: Option<String>,                  // C++ Units
    #[sea_orm(column_name = "Monitor_Type")]
    pub monitor_type: Option<String>,           // C++ Monitor_Type
    #[sea_orm(column_name = "TimeStamp")]
    pub time_stamp: Option<String>,             // C++ TimeStamp
    #[sea_orm(column_name = "Range_Field")]
    pub range_field: Option<String>,            // C++ Range
    #[sea_orm(column_name = "Calibration")]
    pub calibration: Option<String>,            // C++ Calibration
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
