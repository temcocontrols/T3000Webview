// T3000 DYNDNS_SETTINGS Entity (one-to-one with DEVICES)
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "DYNDNS_SETTINGS")]
#[serde(rename_all = "camelCase")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false, column_name = "SerialNumber")]
    pub serial_number: i32,

    #[sea_orm(column_name = "Enable_DynDNS")]
    pub enable_dyndns: Option<i32>,             // 0=no, 1=disable, 2=enable
    #[sea_orm(column_name = "DynDNS_Provider")]
    pub dyndns_provider: Option<i32>,           // 0=3322.org, 1=dyndns.com, 2=no-ip.com
    #[sea_orm(column_name = "DynDNS_User")]
    pub dyndns_user: Option<String>,            // C++ dyndns_user[32]
    #[sea_orm(column_name = "DynDNS_Pass")]
    pub dyndns_pass: Option<String>,            // C++ dyndns_pass[32]
    #[sea_orm(column_name = "DynDNS_Domain")]
    pub dyndns_domain: Option<String>,          // C++ dyndns_domain[32]
    #[sea_orm(column_name = "DynDNS_Update_Time")]
    pub dyndns_update_time: Option<i32>,        // minutes
    #[sea_orm(column_name = "Update_DynDNS_Time")]
    pub update_dyndns_time: Option<String>,     // timestamp as TEXT
    #[sea_orm(column_name = "created_at")]
    pub created_at: Option<String>,
    #[sea_orm(column_name = "updated_at")]
    pub updated_at: Option<String>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
