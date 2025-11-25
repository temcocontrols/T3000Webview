// T3000 REMOTE_POINTS Entity
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "REMOTE_POINTS")]
#[serde(rename_all = "camelCase")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false, column_name = "SerialNumber")]
    pub serial_number: i32,

    #[sea_orm(column_name = "Remote_ID")]
    pub remote_id: Option<String>,
    #[sea_orm(column_name = "Remote_Index")]
    pub remote_index: Option<String>,
    #[sea_orm(column_name = "Panel")]
    pub panel: Option<String>,
    #[sea_orm(column_name = "Point_Number")]
    pub point_number: Option<i32>,
    #[sea_orm(column_name = "Point_Type")]
    pub point_type: Option<i32>,
    #[sea_orm(column_name = "Point_Panel")]
    pub point_panel: Option<i32>,
    #[sea_orm(column_name = "Sub_Panel")]
    pub sub_panel: Option<i32>,
    #[sea_orm(column_name = "Network")]
    pub network: Option<i32>,
    #[sea_orm(column_name = "Point_Value")]
    pub point_value: Option<i32>,
    #[sea_orm(column_name = "Auto_Manual")]
    pub auto_manual: Option<i32>,
    #[sea_orm(column_name = "Digital_Analog")]
    pub digital_analog: Option<i32>,
    #[sea_orm(column_name = "Device_Online")]
    pub device_online: Option<i32>,
    #[sea_orm(column_name = "Product_ID")]
    pub product_id: Option<i32>,
    #[sea_orm(column_name = "Count_Field")]
    pub count_field: Option<i32>,
    #[sea_orm(column_name = "Read_Write")]
    pub read_write: Option<i32>,
    #[sea_orm(column_name = "Time_Remaining")]
    pub time_remaining: Option<i32>,
    #[sea_orm(column_name = "Object_Instance")]
    pub object_instance: Option<i32>,
    #[sea_orm(column_name = "Status")]
    pub status: Option<String>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
