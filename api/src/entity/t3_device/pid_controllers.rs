// T3000 PID Controllers Entity
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "pid_controllers")]
#[serde(rename_all = "camelCase")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub device_id: i32,
    pub pid_number: i32,
    pub label: Option<String>,
    pub description: Option<String>,
    pub input_point: Option<i32>,
    pub input_value: Option<f32>,
    pub output_value: Option<f32>,
    pub units_type: Option<i32>,
    pub auto_manual: Option<i32>,
    pub output_point: Option<i32>,
    pub setpoint_point: Option<i32>,
    pub setpoint_value: Option<f32>,
    pub setpoint_units: Option<i32>,
    pub action: Option<i32>,
    pub proportional_gain: Option<f32>,
    pub integral_time: Option<i32>,
    pub derivative_time: Option<i32>,
    pub sample_time: Option<i32>,
    pub bias: Option<f32>,
    pub repeats_per_min: Option<i32>,
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
