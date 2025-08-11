// T3000 Floors Entity
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "floors")]
#[serde(rename_all = "camelCase")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub building_id: i32,
    pub floor_number: i32,
    pub name: String,
    pub description: Option<String>,
    pub created_at: Option<i64>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::buildings::Entity",
        from = "Column::BuildingId",
        to = "super::buildings::Column::Id"
    )]
    Buildings,
    #[sea_orm(has_many = "super::rooms::Entity")]
    Rooms,
}

impl Related<super::buildings::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Buildings.def()
    }
}

impl Related<super::rooms::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Rooms.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
