// T3000 CUSTOM_UNITS Entity
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize, Default)]
#[sea_orm(table_name = "CUSTOM_UNITS")]
#[serde(rename_all = "PascalCase")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false, column_name = "SerialNumber")]
    pub serial_number: i32,

    #[sea_orm(column_name = "Unit_ID")]
    pub unit_id: Option<String>,
    #[sea_orm(column_name = "Unit_Index")]
    pub unit_index: Option<String>,
    #[sea_orm(column_name = "Panel")]
    pub panel: Option<String>,
    #[sea_orm(column_name = "Unit_Type")]
    pub unit_type: Option<String>,
    #[sea_orm(column_name = "Direct")]
    pub direct: Option<i32>,
    #[sea_orm(column_name = "Digital_Units_Off")]
    pub digital_units_off: Option<String>,
    #[sea_orm(column_name = "Digital_Units_On")]
    pub digital_units_on: Option<String>,
    #[sea_orm(column_name = "Analog_Unit_Name")]
    pub analog_unit_name: Option<String>,
    #[sea_orm(column_name = "Status")]
    pub status: Option<String>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
