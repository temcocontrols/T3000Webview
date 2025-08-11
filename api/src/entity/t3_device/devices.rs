// T3000 Devices Entity
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "devices")]
#[serde(rename_all = "camelCase")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub building_id: i32, // Required foreign key to buildings
    pub room_id: Option<i32>, // Optional foreign key to rooms
    pub instance_number: i32,
    pub product_type: i32,
    pub product_model: Option<String>,
    pub serial_number: Option<String>,
    pub hardware_version: Option<String>,
    pub software_version: Option<String>,
    pub device_name: Option<String>,
    pub description: Option<String>,
    pub ip_address: Option<String>,
    pub modbus_address: Option<i32>,
    pub zigbee_id: Option<String>,
    pub status: Option<i32>,
    pub last_communication: Option<i64>,

    // Device Information
    pub module_number: Option<String>,
    pub mcu_version: Option<String>,
    pub pic_version: Option<String>,
    pub top_version: Option<String>,
    pub bootloader_version: Option<String>,
    pub mcu_type: Option<String>,
    pub sd_card_status: Option<String>,

    // Panel Information
    pub bacnet_instance: Option<i32>,
    pub mac_address: Option<String>,
    pub mstp_network: Option<i32>,
    pub modbus_rtu_id: Option<i32>,
    pub bip_network: Option<i32>,
    pub max_master: Option<i32>,
    pub panel_number: Option<i32>,
    pub panel_name: Option<String>,

    // Network Configuration
    pub subnet_mask: Option<String>,
    pub gateway_address: Option<String>,
    pub modbus_tcp_port: Option<i32>,

    // Serial Port Configuration
    pub rs485_sub: Option<String>,
    pub zigbee_config: Option<String>,
    pub rs485_main: Option<String>,
    pub usb_port: Option<String>,
    pub zigbee_pan_id: Option<String>,

    pub created_at: Option<i64>,
    pub updated_at: Option<i64>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::buildings::Entity",
        from = "Column::BuildingId",
        to = "super::buildings::Column::Id"
    )]
    Building,
    #[sea_orm(
        belongs_to = "super::rooms::Entity",
        from = "Column::RoomId",
        to = "super::rooms::Column::Id"
    )]
    Room,
    #[sea_orm(has_many = "super::input_points::Entity")]
    InputPoints,
    #[sea_orm(has_many = "super::output_points::Entity")]
    OutputPoints,
    #[sea_orm(has_many = "super::variable_points::Entity")]
    VariablePoints,
    #[sea_orm(has_many = "super::schedules::Entity")]
    Schedules,
    #[sea_orm(has_many = "super::trendlogs::Entity")]
    Trendlogs,
    #[sea_orm(has_many = "super::alarms::Entity")]
    Alarms,
}

impl Related<super::buildings::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Building.def()
    }
}

impl Related<super::rooms::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Room.def()
    }
}

impl Related<super::input_points::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::InputPoints.def()
    }
}

impl Related<super::output_points::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::OutputPoints.def()
    }
}

impl Related<super::variable_points::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::VariablePoints.def()
    }
}

impl Related<super::schedules::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Schedules.def()
    }
}

impl Related<super::trendlogs::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Trendlogs.def()
    }
}

impl Related<super::alarms::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Alarms.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
