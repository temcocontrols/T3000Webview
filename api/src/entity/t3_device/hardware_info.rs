// T3000 HARDWARE_INFO Entity
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize, Default)]
#[sea_orm(table_name = "HARDWARE_INFO")]
#[serde(rename_all = "PascalCase")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false, column_name = "SerialNumber")]
    pub serial_number: i32,

    #[sea_orm(column_name = "Hardware_Rev")]
    pub hardware_rev: Option<String>,
    #[sea_orm(column_name = "Firmware_Version")]
    pub firmware_version: Option<String>,
    #[sea_orm(column_name = "Firmware_Version_Hi")]
    pub firmware_version_hi: Option<i32>,
    #[sea_orm(column_name = "Firmware_Version_Lo")]
    pub firmware_version_lo: Option<i32>,
    #[sea_orm(column_name = "Bootloader_Rev")]
    pub bootloader_rev: Option<i32>,
    #[sea_orm(column_name = "Mini_Type")]
    pub mini_type: Option<i32>,
    #[sea_orm(column_name = "Panel_Type")]
    pub panel_type: Option<i32>,
    #[sea_orm(column_name = "USB_Mode")]
    pub usb_mode: Option<i32>,
    #[sea_orm(column_name = "SD_Exist")]
    pub sd_exist: Option<i32>,
    #[sea_orm(column_name = "Zigbee_Exist")]
    pub zigbee_exist: Option<i32>,
    #[sea_orm(column_name = "Max_Var")]
    pub max_var: Option<i32>,
    #[sea_orm(column_name = "Max_In")]
    pub max_in: Option<i32>,
    #[sea_orm(column_name = "Max_Out")]
    pub max_out: Option<i32>,
    #[sea_orm(column_name = "Max_GRP")]
    pub max_grp: Option<i32>,
    #[sea_orm(column_name = "Max_Graph")]
    pub max_graph: Option<i32>,
    #[sea_orm(column_name = "Aux_In_Port")]
    pub aux_in_port: Option<i32>,
    #[sea_orm(column_name = "Aux_Out_Port")]
    pub aux_out_port: Option<i32>,
    #[sea_orm(column_name = "created_at")]
    pub created_at: Option<String>,
    #[sea_orm(column_name = "updated_at")]
    pub updated_at: Option<String>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
