// T3000 WIFI_SETTINGS Entity
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize, Default)]
#[sea_orm(table_name = "WIFI_SETTINGS")]
#[serde(rename_all = "PascalCase")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false, column_name = "SerialNumber")]
    pub serial_number: i32,

    #[sea_orm(column_name = "Wifi_Enable")]
    pub wifi_enable: Option<i32>,
    #[sea_orm(column_name = "IP_Auto_Manual")]
    pub ip_auto_manual: Option<i32>,
    #[sea_orm(column_name = "Username")]
    pub username: Option<String>,
    #[sea_orm(column_name = "Password")]
    pub password: Option<String>,
    #[sea_orm(column_name = "IP_Address")]
    pub ip_address: Option<String>,
    #[sea_orm(column_name = "Net_Mask")]
    pub net_mask: Option<String>,
    #[sea_orm(column_name = "Gateway")]
    pub gateway: Option<String>,
    #[sea_orm(column_name = "Wifi_MAC")]
    pub wifi_mac: Option<String>,
    #[sea_orm(column_name = "Wifi_Security")]
    pub wifi_security: Option<i32>,
    #[sea_orm(column_name = "Wifi_SSID")]
    pub wifi_ssid: Option<String>,
    #[sea_orm(column_name = "Wifi_Error_Code")]
    pub wifi_error_code: Option<i32>,
    #[sea_orm(column_name = "Wifi_Signal_Strength")]
    pub wifi_signal_strength: Option<i32>,
    #[sea_orm(column_name = "Wifi_Flag")]
    pub wifi_flag: Option<i32>,
    #[sea_orm(column_name = "created_at")]
    pub created_at: Option<String>,
    #[sea_orm(column_name = "updated_at")]
    pub updated_at: Option<String>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
