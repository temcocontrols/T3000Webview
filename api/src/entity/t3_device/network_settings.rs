// T3000 NETWORK_SETTINGS Entity (one-to-one with DEVICES)
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "NETWORK_SETTINGS")]
#[serde(rename_all = "camelCase")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false, column_name = "SerialNumber")]
    pub serial_number: i32,

    #[sea_orm(column_name = "IP_Address")]
    pub ip_address: Option<String>,             // "192.168.1.100"
    #[sea_orm(column_name = "Subnet")]
    pub subnet: Option<String>,                 // "255.255.255.0"
    #[sea_orm(column_name = "Gateway")]
    pub gateway: Option<String>,
    #[sea_orm(column_name = "MAC_Address")]
    pub mac_address: Option<String>,            // "00:11:22:33:44:55"
    #[sea_orm(column_name = "TCP_Type")]
    pub tcp_type: Option<i32>,                  // 0=DHCP, 1=Static
    #[sea_orm(column_name = "created_at")]
    pub created_at: Option<String>,
    #[sea_orm(column_name = "updated_at")]
    pub updated_at: Option<String>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
