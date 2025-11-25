// T3000 TABLES Entity (Custom analog conversion tables)
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "TABLES")]
#[serde(rename_all = "camelCase")]
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
    pub table_name: Option<String>,             // C++ table_name[9]
    #[sea_orm(column_name = "Table_Data")]
    pub table_data: Option<String>,             // C++ dat[16] as JSON: [{"volts": 0, "value": 0}, ...]
    #[sea_orm(column_name = "Status")]
    pub status: Option<String>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
