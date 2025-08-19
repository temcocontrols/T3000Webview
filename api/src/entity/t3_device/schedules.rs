// T3000 SCHEDULES Entity - Exact match to T3000.db SCHEDULES table
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "SCHEDULES")]
#[serde(rename_all = "camelCase")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub SerialNumber: i32,                     // C++ SerialNumber (FK to DEVICES.SerialNumber)

    pub Schedule_ID: Option<String>,            // C++ Schedule_ID
    pub Auto_Manual: Option<String>,            // C++ Auto_Manual
    pub Output_Field: Option<String>,           // C++ Output
    pub Variable_Field: Option<String>,         // C++ Variable
    pub Holiday1: Option<String>,               // C++ Holiday1
    pub Status1: Option<String>,                // C++ Status1
    pub Holiday2: Option<String>,               // C++ Holiday2
    pub Status2: Option<String>,                // C++ Status2
    pub Interval_Field: Option<String>,         // C++ Interval
    pub Schedule_Time: Option<String>,          // C++ Schedule_Time
    pub Monday_Time: Option<String>,            // C++ Monday_Time
    pub Tuesday_Time: Option<String>,           // C++ Tuesday_Time
    pub Wednesday_Time: Option<String>,         // C++ Wednesday_Time
    pub Thursday_Time: Option<String>,          // C++ Thursday_Time
    pub Friday_Time: Option<String>,            // C++ Friday_Time
    pub BinaryArray: Option<String>,            // C++ BinaryArray (hex encoded)
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
