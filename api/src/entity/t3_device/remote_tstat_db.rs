// T3000 REMOTE_TSTAT_DB Entity
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize, Default)]
#[sea_orm(table_name = "REMOTE_TSTAT_DB")]
#[serde(rename_all = "PascalCase")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false, column_name = "SerialNumber")]
    pub serial_number: i32,

    #[sea_orm(column_name = "Remote_Tstat_ID")]
    pub remote_tstat_id: Option<i32>,
    #[sea_orm(column_name = "Protocol")]
    pub protocol: Option<i32>,
    #[sea_orm(column_name = "Modbus_ID")]
    pub modbus_id: Option<i32>,
    #[sea_orm(column_name = "BACnet_Instance")]
    pub bacnet_instance: Option<i32>,
    #[sea_orm(column_name = "Product_Model")]
    pub product_model: Option<i32>,
    #[sea_orm(column_name = "created_at")]
    pub created_at: Option<String>,
    #[sea_orm(column_name = "updated_at")]
    pub updated_at: Option<String>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
