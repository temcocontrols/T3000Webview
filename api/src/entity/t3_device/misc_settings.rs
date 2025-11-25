// T3000 MISC_SETTINGS Entity (one-to-one with DEVICES)
// Network health statistics and monitor block tracking
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "MISC_SETTINGS")]
#[serde(rename_all = "camelCase")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false, column_name = "SerialNumber")]
    pub serial_number: i32,

    #[sea_orm(column_name = "Flag1")]
    pub flag1: Option<i32>,
    #[sea_orm(column_name = "Flag2")]
    pub flag2: Option<i32>,                     // should be 0x55ff

    // Monitor analog block numbers (12 monitors)
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

    // Monitor digital block numbers (12 monitors)
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

    // Operation times (12 monitors)
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

    // Network health
    #[sea_orm(column_name = "Network_Health_Flag")]
    pub network_health_flag: Option<i32>,       // 0x55 for network health

    // COM statistics (3 ports)
    #[sea_orm(column_name = "COM_RX_0")]
    pub com_rx_0: Option<i32>,
    #[sea_orm(column_name = "COM_RX_1")]
    pub com_rx_1: Option<i32>,
    #[sea_orm(column_name = "COM_RX_2")]
    pub com_rx_2: Option<i32>,
    #[sea_orm(column_name = "COM_TX_0")]
    pub com_tx_0: Option<i32>,
    #[sea_orm(column_name = "COM_TX_1")]
    pub com_tx_1: Option<i32>,
    #[sea_orm(column_name = "COM_TX_2")]
    pub com_tx_2: Option<i32>,

    // Network errors
    #[sea_orm(column_name = "Collision_0")]
    pub collision_0: Option<i32>,
    #[sea_orm(column_name = "Collision_1")]
    pub collision_1: Option<i32>,
    #[sea_orm(column_name = "Collision_2")]
    pub collision_2: Option<i32>,
    #[sea_orm(column_name = "Packet_Error_0")]
    pub packet_error_0: Option<i32>,
    #[sea_orm(column_name = "Packet_Error_1")]
    pub packet_error_1: Option<i32>,
    #[sea_orm(column_name = "Packet_Error_2")]
    pub packet_error_2: Option<i32>,
    #[sea_orm(column_name = "Timeout_0")]
    pub timeout_0: Option<i32>,
    #[sea_orm(column_name = "Timeout_1")]
    pub timeout_1: Option<i32>,
    #[sea_orm(column_name = "Timeout_2")]
    pub timeout_2: Option<i32>,

    #[sea_orm(column_name = "created_at")]
    pub created_at: Option<String>,
    #[sea_orm(column_name = "updated_at")]
    pub updated_at: Option<String>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
