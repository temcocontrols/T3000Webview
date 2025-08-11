// T3000 Schedules Entity
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "schedules")]
#[serde(rename_all = "camelCase")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub device_id: i32,
    pub schedule_number: i32,
    pub full_label: Option<String>,
    pub label: Option<String>,
    pub auto_manual: Option<i32>,
    pub output_point: Option<i32>,
    pub holiday1_reference: Option<i32>,
    pub state1_value: Option<i32>,
    pub holiday2_reference: Option<i32>,
    pub state2_value: Option<i32>,
    pub value: Option<i32>,
    pub override_1_value: Option<i32>,
    pub override_2_value: Option<i32>,
    pub override_1_point: Option<i32>,
    pub override_2_point: Option<i32>,
    pub status: Option<i32>,
    pub type_category: Option<String>,
    pub created_at: Option<i64>,
    pub updated_at: Option<i64>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::devices::Entity",
        from = "Column::DeviceId",
        to = "super::devices::Column::Id"
    )]
    Devices,
}

impl Related<super::devices::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Devices.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
