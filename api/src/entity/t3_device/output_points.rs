// T3000 Output Points Entity (Actuators)
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "output_points")]
#[serde(rename_all = "camelCase")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub device_id: i32,
    pub point_number: i32,
    pub panel_number: Option<i32>,
    pub full_label: Option<String>,
    pub label: Option<String>,
    pub auto_manual: Option<i32>,
    pub hoa_switch_status: Option<i32>,
    pub value: Option<f64>,
    pub units_type: Option<i32>,
    pub range_type: Option<i32>,
    pub range_min: Option<f64>,
    pub range_max: Option<f64>,
    pub low_voltage: Option<f64>,
    pub high_voltage: Option<f64>,
    pub pwm_period: Option<i32>,
    pub status: Option<i32>,
    pub signal_type: Option<i32>,
    pub control_status: Option<i32>,
    pub sub_product: Option<i32>,
    pub decom: Option<i32>,
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
    Device,
}

impl Related<super::devices::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Device.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
