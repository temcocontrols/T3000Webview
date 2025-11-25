// T3000 HARDWARE_INFO Entity (one-to-one with DEVICES)
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "HARDWARE_INFO")]
#[serde(rename_all = "camelCase")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false, column_name = "SerialNumber")]
    pub serial_number: i32,

    #[sea_orm(column_name = "Hardware_Rev")]
    pub hardware_rev: Option<i32>,
    #[sea_orm(column_name = "Firmware0_Rev_Main")]
    pub firmware0_rev_main: Option<i32>,
    #[sea_orm(column_name = "Firmware0_Rev_Sub")]
    pub firmware0_rev_sub: Option<i32>,
    #[sea_orm(column_name = "Firmware1_Rev")]
    pub firmware1_rev: Option<i32>,             // PIC
    #[sea_orm(column_name = "Firmware2_Rev")]
    pub firmware2_rev: Option<i32>,             // C8051
    #[sea_orm(column_name = "Firmware3_Rev")]
    pub firmware3_rev: Option<i32>,             // SM5964
    #[sea_orm(column_name = "Bootloader_Rev")]
    pub bootloader_rev: Option<i32>,
    #[sea_orm(column_name = "Mini_Type")]
    pub mini_type: Option<i32>,
    #[sea_orm(column_name = "Panel_Type")]
    pub panel_type: Option<i32>,
    #[sea_orm(column_name = "USB_Mode")]
    pub usb_mode: Option<i32>,                  // 0=device, 1=host
    #[sea_orm(column_name = "SD_Exist")]
    pub sd_exist: Option<i32>,                  // 1=no, 2=yes, 3=file system ready
    #[sea_orm(column_name = "Zigbee_Exist")]
    pub zigbee_exist: Option<i32>,
    #[sea_orm(column_name = "Zigbee_PanID")]
    pub zigbee_panid: Option<i32>,
    #[sea_orm(column_name = "Special_Flag")]
    pub special_flag: Option<i32>,              // bitfield: bit0=PT1K, bit1=PT100
    #[sea_orm(column_name = "Max_Var")]
    pub max_var: Option<i32>,                   // ESP32 only, ST fixed at 128
    #[sea_orm(column_name = "Max_In")]
    pub max_in: Option<i32>,                    // ESP32 only, ST fixed at 64
    #[sea_orm(column_name = "Max_Out")]
    pub max_out: Option<i32>,                   // ESP32 only, ST fixed at 64
    #[sea_orm(column_name = "created_at")]
    pub created_at: Option<String>,
    #[sea_orm(column_name = "updated_at")]
    pub updated_at: Option<String>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
