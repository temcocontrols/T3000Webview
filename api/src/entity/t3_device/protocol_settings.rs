// T3000 PROTOCOL_SETTINGS Entity (one-to-one with DEVICES)
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "PROTOCOL_SETTINGS")]
#[serde(rename_all = "camelCase")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false, column_name = "SerialNumber")]
    pub serial_number: i32,

    #[sea_orm(column_name = "Modbus_ID")]
    pub modbus_id: Option<i32>,
    #[sea_orm(column_name = "Modbus_Port")]
    pub modbus_port: Option<i32>,
    #[sea_orm(column_name = "MSTP_ID")]
    pub mstp_id: Option<i32>,
    #[sea_orm(column_name = "MSTP_Network_Number")]
    pub mstp_network_number: Option<i32>,
    #[sea_orm(column_name = "Max_Master")]
    pub max_master: Option<i32>,                // max 245
    #[sea_orm(column_name = "Object_Instance")]
    pub object_instance: Option<i32>,
    #[sea_orm(column_name = "BBMD_Enable")]
    pub bbmd_enable: Option<i32>,               // 0=disabled, 1=enabled
    #[sea_orm(column_name = "Network_Number")]
    pub network_number: Option<i32>,
    #[sea_orm(column_name = "Network_Number_Hi")]
    pub network_number_hi: Option<i32>,         // high byte
    #[sea_orm(column_name = "created_at")]
    pub created_at: Option<String>,
    #[sea_orm(column_name = "updated_at")]
    pub updated_at: Option<String>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
