// T3000 OUTPUTS Entity - Updated for DEVICES table
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "OUTPUTS")]
#[serde(rename_all = "camelCase")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub SerialNumber: i32,                     // C++ SerialNumber (FK to DEVICES.SerialNumber)

    pub Output_index: Option<String>,           // C++ Output_index
    pub Panel: Option<String>,                  // C++ Panel
    pub Full_Label: Option<String>,             // C++ Full_Label (description[19])
    pub Auto_Manual: Option<String>,            // C++ Auto_Manual
    pub fValue: Option<String>,                 // C++ fValue (stored as string)
    pub Units: Option<String>,                  // C++ Units
    pub Range_Field: Option<String>,            // C++ Range
    pub Calibration: Option<String>,            // C++ Calibration
    pub Sign: Option<String>,                   // C++ Sign
    pub Filter_Field: Option<String>,           // C++ Filter
    pub Status: Option<String>,                 // C++ Status
    pub Signal_Type: Option<String>,            // C++ Signal_Type (digital_analog)
    pub Label: Option<String>,                  // C++ Label (label[9])
    pub Type_Field: Option<String>,             // C++ Type
    pub BinaryArray: Option<String>,            // C++ BinaryArray (hex encoded)
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
