// T3000 VARIABLES Entity - Updated for DEVICES table
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "VARIABLES")]
#[serde(rename_all = "camelCase")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub SerialNumber: i32,                     // C++ SerialNumber (FK to DEVICES.SerialNumber)

    pub Variable_index: Option<String>,         // C++ Variable_index
    pub Panel: Option<String>,                  // C++ Panel
    pub Full_Label: Option<String>,             // C++ Full_Label (description[21])
    pub Auto_Manual: Option<String>,            // C++ Auto_Manual
    pub fValue: Option<String>,                 // C++ fValue (stored as string)
    pub Units: Option<String>,                  // C++ Units
    pub BinaryArray: Option<String>,            // C++ BinaryArray (hex encoded)
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
