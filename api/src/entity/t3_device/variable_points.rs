// T3000 VARIABLES Entity - Updated for DEVICES table
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "VARIABLES")]
#[serde(rename_all = "camelCase")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false, column_name = "SerialNumber")]
    pub serial_number: i32,                     // C++ SerialNumber (FK to DEVICES.SerialNumber)

    #[sea_orm(column_name = "VariableId")]
    pub variable_id: Option<String>,            // C++ VariableId (JSON "id" field, e.g., "VAR1", "VAR128")
    #[sea_orm(column_name = "Variable_Index")]
    pub variable_index: Option<String>,         // C++ Variable_Index (renamed from Variable_index)
    #[sea_orm(column_name = "Panel")]
    pub panel: Option<String>,                  // C++ Panel
    #[sea_orm(column_name = "Full_Label")]
    pub full_label: Option<String>,             // C++ Full_Label (description[21])
    #[sea_orm(column_name = "Auto_Manual")]
    pub auto_manual: Option<String>,            // C++ Auto_Manual
    #[sea_orm(column_name = "fValue")]
    pub f_value: Option<String>,                // C++ fValue (stored as string)
    #[sea_orm(column_name = "Units")]
    pub units: Option<String>,                  // C++ Units (derived from Range_Field)
    #[sea_orm(column_name = "Range_Field")]
    pub range_field: Option<String>,            // C++ Range_Field
    #[sea_orm(column_name = "Calibration")]
    pub calibration: Option<String>,            // C++ Calibration
    #[sea_orm(column_name = "Sign")]
    pub sign: Option<String>,                   // C++ Sign
    #[sea_orm(column_name = "Filter_Field")]
    pub filter_field: Option<String>,           // C++ Filter_Field
    #[sea_orm(column_name = "Status")]
    pub status: Option<String>,                 // C++ Status
    #[sea_orm(column_name = "Digital_Analog")]
    pub digital_analog: Option<String>,         // From JSON field "digital_analog"
    #[sea_orm(column_name = "Label")]
    pub label: Option<String>,                  // C++ Label
    #[sea_orm(column_name = "Type_Field")]
    pub type_field: Option<String>,             // C++ Type_Field
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
