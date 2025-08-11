// T3000 Alarms Entity
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "alarms")]
#[serde(rename_all = "camelCase")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub device_id: i32,
    pub alarm_number: i32,
    pub panel_number: Option<i32>,
    pub message: Option<String>,
    pub alarm_time: Option<i64>,
    pub acknowledge_status: Option<i32>,
    pub resolution_status: Option<i32>,
    pub delete_status: Option<i32>,
    pub label: Option<String>,
    pub description: Option<String>,
    pub input_point: Option<i32>,
    pub alarm_type: Option<i32>,
    pub threshold_high: Option<f64>,
    pub threshold_low: Option<f64>,
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
