// T3000 Rooms Entity
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "rooms")]
#[serde(rename_all = "camelCase")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub floor_id: i32,
    pub room_number: String,
    pub name: String,
    pub description: Option<String>,
    pub created_at: Option<i64>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::floors::Entity",
        from = "Column::FloorId",
        to = "super::floors::Column::Id"
    )]
    Floors,
    #[sea_orm(has_many = "super::devices::Entity")]
    Devices,
}

impl Related<super::floors::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Floors.def()
    }
}

impl Related<super::devices::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Devices.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
