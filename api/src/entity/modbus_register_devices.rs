//! `SeaORM` Entity. Generated by sea-orm-codegen 1.0.0-rc.3

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, Serialize, Deserialize)]
#[sea_orm(table_name = "modbus_register_devices")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    #[sea_orm(unique)]
    pub remote_id: Option<i32>,
    pub name: String,
    pub description: Option<String>,
    pub status: String,
    pub private: bool,
    pub image_id: Option<i32>,
    pub created_at: DateTimeUtc,
    pub updated_at: DateTimeUtc,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::files::Entity",
        from = "Column::ImageId",
        to = "super::files::Column::Id",
        on_update = "NoAction",
        on_delete = "Cascade"
    )]
    Files,
    #[sea_orm(has_many = "super::modbus_register::Entity")]
    ModbusRegister,
    #[sea_orm(has_many = "super::modbus_register_product_device_mapping::Entity")]
    ModbusRegisterProductDeviceMapping,
}

impl Related<super::files::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Files.def()
    }
}

impl Related<super::modbus_register::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::ModbusRegister.def()
    }
}

impl Related<super::modbus_register_product_device_mapping::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::ModbusRegisterProductDeviceMapping.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
