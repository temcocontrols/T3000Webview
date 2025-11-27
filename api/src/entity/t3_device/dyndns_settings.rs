// T3000 DYNDNS_SETTINGS Entity
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize, Default)]
#[sea_orm(table_name = "DYNDNS_SETTINGS")]
#[serde(rename_all = "PascalCase")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false, column_name = "SerialNumber")]
    pub serial_number: i32,

    #[sea_orm(column_name = "Enable_DynDNS")]
    pub enable_dyndns: Option<i32>,
    #[sea_orm(column_name = "Provider")]
    pub provider: Option<String>,
    #[sea_orm(column_name = "User")]
    pub user: Option<String>,
    #[sea_orm(column_name = "Pass")]
    pub pass: Option<String>,
    #[sea_orm(column_name = "Domain")]
    pub domain: Option<String>,
    #[sea_orm(column_name = "Update_Time")]
    pub update_time: Option<i32>,
    #[sea_orm(column_name = "Update_Status")]
    pub update_status: Option<i32>,
    #[sea_orm(column_name = "created_at")]
    pub created_at: Option<String>,
    #[sea_orm(column_name = "updated_at")]
    pub updated_at: Option<String>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
