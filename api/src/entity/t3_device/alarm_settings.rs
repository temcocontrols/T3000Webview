// T3000 ALARM_SETTINGS Entity
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize, Default)]
#[sea_orm(table_name = "ALARM_SETTINGS")]
#[serde(rename_all = "PascalCase")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false, column_name = "SerialNumber")]
    pub serial_number: i32,

    #[sea_orm(column_name = "Alarm_Setting_ID")]
    pub alarm_setting_id: Option<i32>,
    #[sea_orm(column_name = "Point")]
    pub point: Option<i32>,
    #[sea_orm(column_name = "Point_Type")]
    pub point_type: Option<i32>,
    #[sea_orm(column_name = "Point_Panel")]
    pub point_panel: Option<i32>,
    #[sea_orm(column_name = "Point1")]
    pub point1: Option<i32>,
    #[sea_orm(column_name = "Point1_Type")]
    pub point1_type: Option<i32>,
    #[sea_orm(column_name = "Point1_Panel")]
    pub point1_panel: Option<i32>,
    #[sea_orm(column_name = "Condition")]
    pub condition: Option<i32>,
    #[sea_orm(column_name = "Way_Low")]
    pub way_low: Option<i32>,
    #[sea_orm(column_name = "Low")]
    pub low: Option<i32>,
    #[sea_orm(column_name = "Normal")]
    pub normal: Option<i32>,
    #[sea_orm(column_name = "High")]
    pub high: Option<i32>,
    #[sea_orm(column_name = "Way_High")]
    pub way_high: Option<i32>,
    #[sea_orm(column_name = "Time_Field")]
    pub time_field: Option<i32>,
    #[sea_orm(column_name = "Time_1")]
    pub time_1: Option<i32>,
    #[sea_orm(column_name = "Time_2")]
    pub time_2: Option<i32>,
    #[sea_orm(column_name = "Message_Count")]
    pub message_count: Option<i32>,
    #[sea_orm(column_name = "created_at")]
    pub created_at: Option<String>,
    #[sea_orm(column_name = "updated_at")]
    pub updated_at: Option<String>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
