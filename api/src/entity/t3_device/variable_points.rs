// T3000 VARIABLES Entity - Updated for DEVICES table
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "VARIABLES")]
#[serde(rename_all = "camelCase")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false, column_name = "SerialNumber")]
    pub serial_number: i32,                     // C++ SerialNumber (FK to DEVICES.SerialNumber)

    #[sea_orm(column_name = "Variable_index")]
    pub variable_index: Option<String>,         // C++ Variable_index
    #[sea_orm(column_name = "Panel")]
    pub panel: Option<String>,                  // C++ Panel
    #[sea_orm(column_name = "Full_Label")]
    pub full_label: Option<String>,             // C++ Full_Label (description[21])
    #[sea_orm(column_name = "Auto_Manual")]
    pub auto_manual: Option<String>,            // C++ Auto_Manual
    #[sea_orm(column_name = "fValue")]
    pub f_value: Option<String>,                // C++ fValue (stored as string)
    #[sea_orm(column_name = "Units")]
    pub units: Option<String>,                  // C++ Units
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
