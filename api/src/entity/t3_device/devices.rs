// T3000 DEVICES Entity - Renamed from ALL_NODE to DEVICES
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "DEVICES")]
#[serde(rename_all = "camelCase")]
pub struct Model {
    #[sea_orm(primary_key, column_name = "SerialNumber")]
    pub serial_number: i32,                     // C++ SerialNumber (primary key, renamed from Serial_ID)

    #[sea_orm(column_name = "PanelId")]
    pub panel_id: Option<i32>,                  // C++ PanelId (new column for panel identification)
    #[sea_orm(column_name = "MainBuilding_Name")]
    pub main_building_name: Option<String>,     // C++ MainBuilding_Name
    #[sea_orm(column_name = "Building_Name")]
    pub building_name: Option<String>,          // C++ Building_Name (network/subnet)
    #[sea_orm(column_name = "Floor_Name")]
    pub floor_name: Option<String>,             // C++ Floor_name
    #[sea_orm(column_name = "Room_Name")]
    pub room_name: Option<String>,              // C++ Room_name
    #[sea_orm(column_name = "Panel_Number")]
    pub panel_number: Option<i32>,              // C++ Panel_Number
    #[sea_orm(column_name = "Network_Number")]
    pub network_number: Option<i32>,            // C++ Network_Number
    #[sea_orm(column_name = "Product_Name")]
    pub product_name: Option<String>,           // C++ Product_Name
    #[sea_orm(column_name = "Product_Class_ID")]
    pub product_class_id: Option<i32>,          // C++ Product_class_ID
    #[sea_orm(column_name = "Product_ID")]
    pub product_id: Option<i32>,                // C++ Product_ID
    #[sea_orm(column_name = "Screen_Name")]
    pub screen_name: Option<String>,            // C++ Screen_Name
    #[sea_orm(column_name = "Bautrate")]
    pub bautrate: Option<String>,               // C++ Bautrate (IP address or baud rate)
    #[sea_orm(column_name = "Address")]
    pub address: Option<String>,                // C++ Address
    #[sea_orm(column_name = "Register")]
    pub register: Option<String>,               // C++ Register
    #[sea_orm(column_name = "Function")]
    pub function: Option<String>,               // C++ Function
    #[sea_orm(column_name = "Description")]
    pub description: Option<String>,            // C++ Description
    #[sea_orm(column_name = "High_Units")]
    pub high_units: Option<String>,             // C++ High_Units
    #[sea_orm(column_name = "Low_Units")]
    pub low_units: Option<String>,              // C++ Low_Units
    #[sea_orm(column_name = "Update_Field")]
    pub update_field: Option<String>,           // C++ Update
    #[sea_orm(column_name = "Status")]
    pub status: Option<String>,                 // C++ Status
    #[sea_orm(column_name = "Range_Field")]
    pub range_field: Option<String>,            // C++ Range
    #[sea_orm(column_name = "Calibration")]
    pub calibration: Option<String>,            // C++ Calibration

    // Additional network communication fields from C++ codebase analysis
    #[sea_orm(column_name = "ip_address")]
    pub ip_address: Option<String>,            // C++ ip_address (device IP address)
    #[sea_orm(column_name = "port")]
    pub port: Option<i32>,                     // C++ nport (network port number)
    #[sea_orm(column_name = "bacnet_mstp_mac_id")]
    pub bacnet_mstp_mac_id: Option<i32>,       // C++ macaddress (BACnet MSTP MAC ID)
    #[sea_orm(column_name = "modbus_address")]
    pub modbus_address: Option<u8>,            // C++ modbus_addr (Modbus device ID)
    #[sea_orm(column_name = "pc_ip_address")]
    pub pc_ip_address: Option<String>,         // C++ host IP address (connection info)
    #[sea_orm(column_name = "modbus_port")]
    pub modbus_port: Option<u16>,              // C++ modbus_port (Modbus TCP port)
    #[sea_orm(column_name = "bacnet_ip_port")]
    pub bacnet_ip_port: Option<u16>,           // C++ bacnetip_port (BACnet/IP port, default 47808)
    #[sea_orm(column_name = "show_label_name")]
    pub show_label_name: Option<String>,       // C++ show_label_name (display name)
    #[sea_orm(column_name = "connection_type")]
    pub connection_type: Option<String>,       // C++ connection type (Serial/Ethernet/etc)
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
