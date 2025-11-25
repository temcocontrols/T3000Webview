// T3000 WIFI_SETTINGS Entity (one-to-one with DEVICES)
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "WIFI_SETTINGS")]
#[serde(rename_all = "camelCase")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false, column_name = "SerialNumber")]
    pub serial_number: i32,

    #[sea_orm(column_name = "Wifi_Enable")]
    pub wifi_enable: Option<i32>,
    #[sea_orm(column_name = "IP_Auto_Manual")]
    pub ip_auto_manual: Option<i32>,            // 0=DHCP, 1=static
    #[sea_orm(column_name = "IP_Wifi_Status")]
    pub ip_wifi_status: Option<i32>,
    #[sea_orm(column_name = "Load_Default")]
    pub load_default: Option<i32>,
    #[sea_orm(column_name = "Modbus_Port")]
    pub modbus_port: Option<i32>,
    #[sea_orm(column_name = "BACnet_Port")]
    pub bacnet_port: Option<i32>,
    #[sea_orm(column_name = "Software_Version")]
    pub software_version: Option<i32>,
    #[sea_orm(column_name = "Username")]
    pub username: Option<String>,               // WiFi SSID (64 bytes)
    #[sea_orm(column_name = "Password")]
    pub password: Option<String>,               // WiFi password (32 bytes)
    #[sea_orm(column_name = "IP_Address")]
    pub ip_address: Option<String>,
    #[sea_orm(column_name = "Net_Mask")]
    pub net_mask: Option<String>,
    #[sea_orm(column_name = "Gateway")]
    pub gateway: Option<String>,
    #[sea_orm(column_name = "Wifi_MAC")]
    pub wifi_mac: Option<String>,               // read-only
    #[sea_orm(column_name = "created_at")]
    pub created_at: Option<String>,
    #[sea_orm(column_name = "updated_at")]
    pub updated_at: Option<String>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
