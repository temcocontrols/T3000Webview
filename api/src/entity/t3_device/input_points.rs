// T3000 INPUTS Entity - Updated for DEVICES table
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "INPUTS")]
#[serde(rename_all = "camelCase")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false, column_name = "SerialNumber")]
    pub serial_number: i32,                     // C++ SerialNumber (FK to DEVICES.SerialNumber)

    #[sea_orm(column_name = "InputId")]
    pub input_id: Option<String>,               // C++ InputId (JSON "id" field, e.g., "IN1", "IN2")
    #[sea_orm(column_name = "Input_Index")]
    pub input_index: Option<String>,            // C++ Input_Index (renamed from Input_index)
    #[sea_orm(column_name = "Panel")]
    pub panel: Option<String>,                  // C++ Panel
    #[sea_orm(column_name = "Full_Label")]
    pub full_label: Option<String>,             // C++ Full_Label (description[21])
    #[sea_orm(column_name = "Auto_Manual")]
    pub auto_manual: Option<String>,            // C++ Auto_Manual
    #[sea_orm(column_name = "fValue")]
    pub f_value: Option<String>,                // C++ fValue (stored as string in T3000.db)
    #[sea_orm(column_name = "Units")]
    pub units: Option<String>,                  // C++ Units (derived from Range_Field)
    #[sea_orm(column_name = "Range_Field")]
    pub range_field: Option<String>,            // C++ Range
    #[sea_orm(column_name = "Calibration")]
    pub calibration: Option<String>,            // Legacy - kept for backward compat
    #[sea_orm(column_name = "Sign")]
    pub sign: Option<String>,                   // Legacy - kept for backward compat
    #[sea_orm(column_name = "Filter_Field")]
    pub filter_field: Option<String>,           // C++ filter (raw int)
    #[sea_orm(column_name = "Status")]
    pub status: Option<String>,                 // C++ Status (decom)
    #[sea_orm(column_name = "Digital_Analog")]
    pub digital_analog: Option<String>,         // C++ digital_analog (0=digital, 1=analog)
    #[sea_orm(column_name = "Label")]
    pub label: Option<String>,                  // C++ Label (label[9])
    #[sea_orm(column_name = "Type_Field")]
    pub type_field: Option<String>,             // C++ Type
    #[sea_orm(column_name = "Calibration_H")]
    pub calibration_h: Option<String>,          // C++ calibration_h (raw high byte)
    #[sea_orm(column_name = "Calibration_L")]
    pub calibration_l: Option<String>,          // C++ calibration_l (raw low byte)
    #[sea_orm(column_name = "Calibration_Sign")]
    pub calibration_sign: Option<String>,       // C++ calibration_sign (0=positive, 1=negative)
    #[sea_orm(column_name = "Control")]
    pub control: Option<String>,                // C++ control (0=OFF, 1=ON)
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
