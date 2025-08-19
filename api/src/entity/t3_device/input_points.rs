// T3000 INPUTS Entity - Updated for DEVICES table
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "INPUTS")]
#[serde(rename_all = "camelCase")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub SerialNumber: i32,                     // C++ SerialNumber (FK to DEVICES.SerialNumber)

    pub Input_index: Option<String>,            // C++ Input_index
    pub Panel: Option<String>,                  // C++ Panel
    pub Full_Label: Option<String>,             // C++ Full_Label (description[21])
    pub Auto_Manual: Option<String>,            // C++ Auto_Manual
    pub fValue: Option<String>,                 // C++ fValue (stored as string in T3000.db)
    pub Units: Option<String>,                  // C++ Units
    pub Range_Field: Option<String>,            // C++ Range
    pub Calibration: Option<String>,            // C++ Calibration
    pub Sign: Option<String>,                   // C++ Sign (calibration_sign)
    pub Filter_Field: Option<String>,           // C++ Filter
    pub Status: Option<String>,                 // C++ Status
    pub Signal_Type: Option<String>,            // C++ Signal_Type (digital_analog)
    pub Label: Option<String>,                  // C++ Label (label[9])
    pub Type_Field: Option<String>,             // C++ Type
    pub BinaryArray: Option<String>,            // C++ BinaryArray (hex encoded binary data)
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
