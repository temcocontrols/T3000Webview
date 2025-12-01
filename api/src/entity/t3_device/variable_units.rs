// T3000 VARIABLE_UNITS Entity
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize, Default)]
#[sea_orm(table_name = "VARIABLE_UNITS")]
#[serde(rename_all = "PascalCase")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false, column_name = "SerialNumber")]
    pub serial_number: i32,

    #[sea_orm(column_name = "Variable_ID")]
    pub variable_id: Option<String>,
    #[sea_orm(column_name = "Variable_Index")]
    pub variable_index: Option<String>,
    #[sea_orm(column_name = "Panel")]
    pub panel: Option<String>,
    #[sea_orm(column_name = "Variable_Cus_Unite")]
    pub variable_cus_unite: Option<String>,
    #[sea_orm(column_name = "Status")]
    pub status: Option<String>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
