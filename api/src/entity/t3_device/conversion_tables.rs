// T3000 CONVERSION_TABLES Entity (Custom analog conversion tables)
// Renamed from TABLES to avoid SQL reserved keyword conflict
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize, Default)]
#[sea_orm(table_name = "CONVERSION_TABLES")]
#[serde(rename_all = "PascalCase")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false, column_name = "SerialNumber")]
    pub serial_number: i32,

    #[sea_orm(column_name = "Table_ID")]
    pub table_id: Option<String>,
    #[sea_orm(column_name = "Table_Index")]
    pub table_index: Option<String>,
    #[sea_orm(column_name = "Panel")]
    pub panel: Option<String>,
    #[sea_orm(column_name = "Table_Name")]
    pub table_name: Option<String>,
    #[sea_orm(column_name = "Table_Data")]
    pub table_data: Option<String>,
    #[sea_orm(column_name = "Status")]
    pub status: Option<String>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
