// T3000 MSV_DATA Entity
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize, Default)]
#[sea_orm(table_name = "MSV_DATA")]
#[serde(rename_all = "PascalCase")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false, column_name = "SerialNumber")]
    pub serial_number: i32,

    #[sea_orm(column_name = "MSV_ID")]
    pub msv_id: Option<i32>,
    #[sea_orm(column_name = "MSV_Index")]
    pub msv_index: Option<i32>,
    #[sea_orm(column_name = "Status_Field")]
    pub status_field: Option<i32>,
    #[sea_orm(column_name = "MSV_Name")]
    pub msv_name: Option<String>,
    #[sea_orm(column_name = "MSV_Value")]
    pub msv_value: Option<String>,
    #[sea_orm(column_name = "created_at")]
    pub created_at: Option<String>,
    #[sea_orm(column_name = "updated_at")]
    pub updated_at: Option<String>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
