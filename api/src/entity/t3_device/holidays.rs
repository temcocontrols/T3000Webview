// T3000 HOLIDAYS Entity - Exact match to T3000.db HOLIDAYS table
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "HOLIDAYS")]
#[serde(rename_all = "camelCase")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false, column_name = "SerialNumber")]
    pub serial_number: i32,                     // C++ SerialNumber (FK to DEVICES.SerialNumber)

    #[sea_orm(column_name = "Holiday_ID")]
    pub holiday_id: Option<String>,             // C++ Holiday_ID
    #[sea_orm(column_name = "Auto_Manual")]
    pub auto_manual: Option<String>,            // C++ Auto_Manual
    #[sea_orm(column_name = "Holiday_Value")]
    pub holiday_value: Option<String>,          // C++ Holiday_Value
    #[sea_orm(column_name = "Status")]
    pub status: Option<String>,                 // C++ Status
    #[sea_orm(column_name = "Month_Field")]
    pub month_field: Option<String>,            // C++ Month
    #[sea_orm(column_name = "Day_Field")]
    pub day_field: Option<String>,              // C++ Day
    #[sea_orm(column_name = "Year_Field")]
    pub year_field: Option<String>,             // C++ Year
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
