// T3000 TIME_SETTINGS Entity (one-to-one with DEVICES)
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "TIME_SETTINGS")]
#[serde(rename_all = "camelCase")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false, column_name = "SerialNumber")]
    pub serial_number: i32,

    #[sea_orm(column_name = "Time_Zone")]
    pub time_zone: Option<i32>,                 // signed short
    #[sea_orm(column_name = "Time_Zone_Summer_Daytime")]
    pub time_zone_summer_daytime: Option<i32>,  // DST flag
    #[sea_orm(column_name = "Time_Update_Since_1970")]
    pub time_update_since_1970: Option<i32>,    // Unix timestamp
    #[sea_orm(column_name = "Enable_SNTP")]
    pub enable_sntp: Option<i32>,               // 0=no, 1=disable, 2=enable
    #[sea_orm(column_name = "SNTP_Server")]
    pub sntp_server: Option<String>,            // C++ sntp_server[30]
    #[sea_orm(column_name = "Flag_Time_Sync_PC")]
    pub flag_time_sync_pc: Option<i32>,         // 0=no sync, 1=sync
    #[sea_orm(column_name = "Time_Sync_Auto_Manual")]
    pub time_sync_auto_manual: Option<i32>,     // 0=SNTP, 1=PC
    #[sea_orm(column_name = "Sync_Time_Results")]
    pub sync_time_results: Option<i32>,         // 0=failed, 1=success
    #[sea_orm(column_name = "Start_Month")]
    pub start_month: Option<i32>,               // DST start
    #[sea_orm(column_name = "Start_Day")]
    pub start_day: Option<i32>,
    #[sea_orm(column_name = "End_Month")]
    pub end_month: Option<i32>,                 // DST end
    #[sea_orm(column_name = "End_Day")]
    pub end_day: Option<i32>,
    #[sea_orm(column_name = "created_at")]
    pub created_at: Option<String>,
    #[sea_orm(column_name = "updated_at")]
    pub updated_at: Option<String>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
