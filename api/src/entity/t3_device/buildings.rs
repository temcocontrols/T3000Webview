// T3000 Buildings Entity
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "buildings")]
#[serde(rename_all = "camelCase")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub name: String,
    pub address: Option<String>,
    pub description: Option<String>,
    pub protocol: Option<String>,
    pub ip_domain_tel: Option<String>,
    pub modbus_tcp_port: Option<i32>,
    pub com_port: Option<String>,
    pub baud_rate: Option<i32>,
    pub building_path: Option<String>,
    pub selected: Option<i32>,
    pub created_at: Option<i64>,
    pub updated_at: Option<i64>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(has_many = "super::floors::Entity")]
    Floors,
    #[sea_orm(has_many = "super::networks::Entity")]
    Networks,
    #[sea_orm(has_many = "super::devices::Entity")]
    Devices,
}

impl Related<super::floors::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Floors.def()
    }
}

impl Related<super::networks::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Networks.def()
    }
}

impl Related<super::devices::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Devices.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
