// T3000 MISC_SETTINGS Entity
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize, Default)]
#[sea_orm(table_name = "MISC_SETTINGS")]
#[serde(rename_all = "PascalCase")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false, column_name = "SerialNumber")]
    pub serial_number: i32,

    #[sea_orm(column_name = "Flag1")]
    pub flag1: Option<i32>,
    #[sea_orm(column_name = "Flag2")]
    pub flag2: Option<i32>,
    #[sea_orm(column_name = "Monitor_Analog_Block_0")]
    pub monitor_analog_block_0: Option<i32>,
    #[sea_orm(column_name = "Monitor_Analog_Block_1")]
    pub monitor_analog_block_1: Option<i32>,
    #[sea_orm(column_name = "Monitor_Analog_Block_2")]
    pub monitor_analog_block_2: Option<i32>,
    #[sea_orm(column_name = "Monitor_Analog_Block_3")]
    pub monitor_analog_block_3: Option<i32>,
    #[sea_orm(column_name = "Monitor_Analog_Block_4")]
    pub monitor_analog_block_4: Option<i32>,
    #[sea_orm(column_name = "Monitor_Analog_Block_5")]
    pub monitor_analog_block_5: Option<i32>,
    #[sea_orm(column_name = "Monitor_Analog_Block_6")]
    pub monitor_analog_block_6: Option<i32>,
    #[sea_orm(column_name = "Monitor_Analog_Block_7")]
    pub monitor_analog_block_7: Option<i32>,
    #[sea_orm(column_name = "Monitor_Analog_Block_8")]
    pub monitor_analog_block_8: Option<i32>,
    #[sea_orm(column_name = "Monitor_Analog_Block_9")]
    pub monitor_analog_block_9: Option<i32>,
    #[sea_orm(column_name = "Monitor_Analog_Block_10")]
    pub monitor_analog_block_10: Option<i32>,
    #[sea_orm(column_name = "Monitor_Analog_Block_11")]
    pub monitor_analog_block_11: Option<i32>,
    #[sea_orm(column_name = "Monitor_Digital_Block_0")]
    pub monitor_digital_block_0: Option<i32>,
    #[sea_orm(column_name = "Monitor_Digital_Block_1")]
    pub monitor_digital_block_1: Option<i32>,
    #[sea_orm(column_name = "Monitor_Digital_Block_2")]
    pub monitor_digital_block_2: Option<i32>,
    #[sea_orm(column_name = "Monitor_Digital_Block_3")]
    pub monitor_digital_block_3: Option<i32>,
    #[sea_orm(column_name = "Monitor_Digital_Block_4")]
    pub monitor_digital_block_4: Option<i32>,
    #[sea_orm(column_name = "Monitor_Digital_Block_5")]
    pub monitor_digital_block_5: Option<i32>,
    #[sea_orm(column_name = "Monitor_Digital_Block_6")]
    pub monitor_digital_block_6: Option<i32>,
    #[sea_orm(column_name = "Monitor_Digital_Block_7")]
    pub monitor_digital_block_7: Option<i32>,
    #[sea_orm(column_name = "Monitor_Digital_Block_8")]
    pub monitor_digital_block_8: Option<i32>,
    #[sea_orm(column_name = "Monitor_Digital_Block_9")]
    pub monitor_digital_block_9: Option<i32>,
    #[sea_orm(column_name = "Monitor_Digital_Block_10")]
    pub monitor_digital_block_10: Option<i32>,
    #[sea_orm(column_name = "Monitor_Digital_Block_11")]
    pub monitor_digital_block_11: Option<i32>,
    #[sea_orm(column_name = "Operation_Time_0")]
    pub operation_time_0: Option<i32>,
    #[sea_orm(column_name = "Operation_Time_1")]
    pub operation_time_1: Option<i32>,
    #[sea_orm(column_name = "Operation_Time_2")]
    pub operation_time_2: Option<i32>,
    #[sea_orm(column_name = "Operation_Time_3")]
    pub operation_time_3: Option<i32>,
    #[sea_orm(column_name = "Operation_Time_4")]
    pub operation_time_4: Option<i32>,
    #[sea_orm(column_name = "Operation_Time_5")]
    pub operation_time_5: Option<i32>,
    #[sea_orm(column_name = "Operation_Time_6")]
    pub operation_time_6: Option<i32>,
    #[sea_orm(column_name = "Operation_Time_7")]
    pub operation_time_7: Option<i32>,
    #[sea_orm(column_name = "Operation_Time_8")]
    pub operation_time_8: Option<i32>,
    #[sea_orm(column_name = "Operation_Time_9")]
    pub operation_time_9: Option<i32>,
    #[sea_orm(column_name = "Operation_Time_10")]
    pub operation_time_10: Option<i32>,
    #[sea_orm(column_name = "Operation_Time_11")]
    pub operation_time_11: Option<i32>,
    #[sea_orm(column_name = "Network_Health_Flag")]
    pub network_health_flag: Option<i32>,
    #[sea_orm(column_name = "COM0_RX")]
    pub com0_rx: Option<i32>,
    #[sea_orm(column_name = "COM0_TX")]
    pub com0_tx: Option<i32>,
    #[sea_orm(column_name = "COM0_Collision")]
    pub com0_collision: Option<i32>,
    #[sea_orm(column_name = "COM0_Packet_Error")]
    pub com0_packet_error: Option<i32>,
    #[sea_orm(column_name = "COM0_Timeout")]
    pub com0_timeout: Option<i32>,
    #[sea_orm(column_name = "COM1_RX")]
    pub com1_rx: Option<i32>,
    #[sea_orm(column_name = "COM1_TX")]
    pub com1_tx: Option<i32>,
    #[sea_orm(column_name = "COM1_Collision")]
    pub com1_collision: Option<i32>,
    #[sea_orm(column_name = "COM1_Packet_Error")]
    pub com1_packet_error: Option<i32>,
    #[sea_orm(column_name = "COM1_Timeout")]
    pub com1_timeout: Option<i32>,
    #[sea_orm(column_name = "COM2_RX")]
    pub com2_rx: Option<i32>,
    #[sea_orm(column_name = "COM2_TX")]
    pub com2_tx: Option<i32>,
    #[sea_orm(column_name = "COM2_Collision")]
    pub com2_collision: Option<i32>,
    #[sea_orm(column_name = "COM2_Packet_Error")]
    pub com2_packet_error: Option<i32>,
    #[sea_orm(column_name = "COM2_Timeout")]
    pub com2_timeout: Option<i32>,
    #[sea_orm(column_name = "created_at")]
    pub created_at: Option<String>,
    #[sea_orm(column_name = "updated_at")]
    pub updated_at: Option<String>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
