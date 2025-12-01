// T3000 TSTAT_SCHEDULES Entity
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize, Default)]
#[sea_orm(table_name = "TSTAT_SCHEDULES")]
#[serde(rename_all = "PascalCase")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false, column_name = "SerialNumber")]
    pub serial_number: i32,

    #[sea_orm(column_name = "Tstat_ID")]
    pub tstat_id: Option<i32>,
    #[sea_orm(column_name = "Schedule_ID")]
    pub schedule_id: Option<i32>,
    #[sea_orm(column_name = "Schedule")]
    pub schedule: Option<i32>,
    #[sea_orm(column_name = "Flag")]
    pub flag: Option<i32>,
    #[sea_orm(column_name = "Online_Status")]
    pub online_status: Option<i32>,
    #[sea_orm(column_name = "Name")]
    pub name: Option<String>,
    #[sea_orm(column_name = "Day_Setpoint")]
    pub day_setpoint: Option<i32>,
    #[sea_orm(column_name = "Night_Setpoint")]
    pub night_setpoint: Option<i32>,
    #[sea_orm(column_name = "Awake_Setpoint")]
    pub awake_setpoint: Option<i32>,
    #[sea_orm(column_name = "Away_Setpoint")]
    pub away_setpoint: Option<i32>,
    #[sea_orm(column_name = "Sleep_Setpoint")]
    pub sleep_setpoint: Option<i32>,
    #[sea_orm(column_name = "Temp_Setpoint")]
    pub temp_setpoint: Option<i32>,
    #[sea_orm(column_name = "created_at")]
    pub created_at: Option<String>,
    #[sea_orm(column_name = "updated_at")]
    pub updated_at: Option<String>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
