// T3000 Trend Log Inputs Entity
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "trendlog_inputs")]
#[serde(rename_all = "camelCase")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub trendlog_id: i32,
    pub input_number: i32,
    pub input_point: i32,
    pub created_at: Option<i64>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::trendlogs::Entity",
        from = "Column::TrendlogId",
        to = "super::trendlogs::Column::Id"
    )]
    Trendlogs,
}

impl Related<super::trendlogs::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Trendlogs.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
