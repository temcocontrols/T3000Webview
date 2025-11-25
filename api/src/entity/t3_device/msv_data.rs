// T3000 MSV_DATA Entity (Multi-state values)
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "MSV_DATA")]
#[serde(rename_all = "camelCase")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false, column_name = "SerialNumber")]
    pub serial_number: i32,

    #[sea_orm(column_name = "MSV_ID")]
    pub msv_id: Option<String>,
    #[sea_orm(column_name = "MSV_Index")]
    pub msv_index: Option<i32>,                 // 0-7
    #[sea_orm(column_name = "Panel")]
    pub panel: Option<String>,
    #[sea_orm(column_name = "Status_Field")]
    pub status_field: Option<i32>,
    #[sea_orm(column_name = "MSV_Name")]
    pub msv_name: Option<String>,               // C++ msv_name[20]
    #[sea_orm(column_name = "MSV_Value")]
    pub msv_value: Option<i32>,
    #[sea_orm(column_name = "Status")]
    pub status: Option<String>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
