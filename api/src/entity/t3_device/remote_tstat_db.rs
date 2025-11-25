// T3000 REMOTE_TSTAT_DB Entity
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "REMOTE_TSTAT_DB")]
#[serde(rename_all = "camelCase")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false, column_name = "SerialNumber")]
    pub serial_number: i32,

    #[sea_orm(column_name = "Remote_Tstat_ID")]
    pub remote_tstat_id: Option<String>,
    #[sea_orm(column_name = "Remote_Index")]
    pub remote_index: Option<i32>,              // 0-63
    #[sea_orm(column_name = "Panel")]
    pub panel: Option<String>,
    #[sea_orm(column_name = "Protocol")]
    pub protocol: Option<i32>,                  // 0=modbus, 1=bacnet
    #[sea_orm(column_name = "Modbus_ID")]
    pub modbus_id: Option<i32>,
    #[sea_orm(column_name = "BACnet_Instance")]
    pub bacnet_instance: Option<i32>,
    #[sea_orm(column_name = "Status")]
    pub status: Option<String>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
