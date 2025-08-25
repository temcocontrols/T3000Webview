// T3000 SCHEDULES Entity - Exact match to T3000.db SCHEDULES table
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "SCHEDULES")]
#[serde(rename_all = "camelCase")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false, column_name = "SerialNumber")]
    pub serial_number: i32,                     // C++ SerialNumber (FK to DEVICES.SerialNumber)

    #[sea_orm(column_name = "Schedule_ID")]
    pub schedule_id: Option<String>,            // C++ Schedule_ID
    #[sea_orm(column_name = "Auto_Manual")]
    pub auto_manual: Option<String>,            // C++ Auto_Manual
    #[sea_orm(column_name = "Output_Field")]
    pub output_field: Option<String>,           // C++ Output
    #[sea_orm(column_name = "Variable_Field")]
    pub variable_field: Option<String>,         // C++ Variable
    #[sea_orm(column_name = "Holiday1")]
    pub holiday1: Option<String>,               // C++ Holiday1
    #[sea_orm(column_name = "Status1")]
    pub status1: Option<String>,                // C++ Status1
    #[sea_orm(column_name = "Holiday2")]
    pub holiday2: Option<String>,               // C++ Holiday2
    #[sea_orm(column_name = "Status2")]
    pub status2: Option<String>,                // C++ Status2
    #[sea_orm(column_name = "Interval_Field")]
    pub interval_field: Option<String>,         // C++ Interval
    #[sea_orm(column_name = "Schedule_Time")]
    pub schedule_time: Option<String>,          // C++ Schedule_Time
    #[sea_orm(column_name = "Monday_Time")]
    pub monday_time: Option<String>,            // C++ Monday_Time
    #[sea_orm(column_name = "Tuesday_Time")]
    pub tuesday_time: Option<String>,           // C++ Tuesday_Time
    #[sea_orm(column_name = "Wednesday_Time")]
    pub wednesday_time: Option<String>,         // C++ Wednesday_Time
    #[sea_orm(column_name = "Thursday_Time")]
    pub thursday_time: Option<String>,          // C++ Thursday_Time
    #[sea_orm(column_name = "Friday_Time")]
    pub friday_time: Option<String>,            // C++ Friday_Time
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
