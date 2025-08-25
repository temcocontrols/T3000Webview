// T3000 TRENDLOGS Entity - Exact match to T3000.db TRENDLOGS table
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "TRENDLOGS")]
#[serde(rename_all = "camelCase")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false, column_name = "SerialNumber")]
    pub serial_number: i32,                     // C++ SerialNumber (FK to DEVICES.SerialNumber)

    #[sea_orm(column_name = "Trendlog_index")]
    pub trendlog_index: Option<String>,         // C++ Trendlog_index
    #[sea_orm(column_name = "Panel")]
    pub panel: Option<String>,                  // C++ Panel
    #[sea_orm(column_name = "Full_Label")]
    pub full_label: Option<String>,             // C++ Full_Label (description[21])
    #[sea_orm(column_name = "Auto_Manual")]
    pub auto_manual: Option<String>,            // C++ Auto_Manual
    #[sea_orm(column_name = "Units")]
    pub units: Option<String>,                  // C++ Units
    #[sea_orm(column_name = "Range_Field")]
    pub range_field: Option<String>,            // C++ Range
    #[sea_orm(column_name = "Calibration")]
    pub calibration: Option<String>,            // C++ Calibration
    #[sea_orm(column_name = "Sign")]
    pub sign: Option<String>,                   // C++ Sign (calibration_sign)
    #[sea_orm(column_name = "Filter_Field")]
    pub filter_field: Option<String>,           // C++ Filter
    #[sea_orm(column_name = "Status")]
    pub status: Option<String>,                 // C++ Status
    #[sea_orm(column_name = "Signal_Type")]
    pub signal_type: Option<String>,            // C++ Signal_Type (digital_analog)
    #[sea_orm(column_name = "Label")]
    pub label: Option<String>,                  // C++ Label (label[9])
    #[sea_orm(column_name = "Type_Field")]
    pub type_field: Option<String>,             // C++ Type
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
