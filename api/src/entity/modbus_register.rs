//! `SeaORM` Entity. Generated by sea-orm-codegen 0.12.14

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, Serialize, Deserialize)]
#[sea_orm(table_name = "modbus_register")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub register_address: Option<i32>,
    pub operation: Option<String>,
    pub register_length: i32,
    pub register_name: Option<String>,
    pub data_format: Option<String>,
    pub description: Option<String>,
    pub device_id: Option<i32>,
    pub status: String,
    pub unit: Option<String>,
    pub private: Option<bool>,
    #[sea_orm(column_type = "Text")]
    pub created_at: String,
    #[sea_orm(column_type = "Text")]
    pub updated_at: String,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::modbus_register_devices::Entity",
        from = "Column::DeviceId",
        to = "super::modbus_register_devices::Column::Id",
        on_update = "NoAction",
        on_delete = "Cascade"
    )]
    ModbusRegisterDevices,
}

impl Related<super::modbus_register_devices::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::ModbusRegisterDevices.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
