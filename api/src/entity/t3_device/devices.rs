// T3000 DEVICES Entity - Renamed from ALL_NODE to DEVICES
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "DEVICES")]
#[serde(rename_all = "camelCase")]
pub struct Model {
    #[sea_orm(primary_key, column_name = "SerialNumber")]
    pub SerialNumber: i32,                     // C++ SerialNumber (primary key, renamed from Serial_ID)

    #[sea_orm(column_name = "PanelId")]
    pub PanelId: Option<i32>,                  // C++ PanelId (new column for panel identification)
    #[sea_orm(column_name = "MainBuilding_Name")]
    pub MainBuilding_Name: Option<String>,     // C++ MainBuilding_Name
    #[sea_orm(column_name = "Building_Name")]
    pub Building_Name: Option<String>,         // C++ Building_Name (network/subnet)
    #[sea_orm(column_name = "Floor_Name")]
    pub Floor_Name: Option<String>,            // C++ Floor_name
    #[sea_orm(column_name = "Room_Name")]
    pub Room_Name: Option<String>,             // C++ Room_name
    #[sea_orm(column_name = "Panel_Number")]
    pub Panel_Number: Option<i32>,             // C++ Panel_Number
    #[sea_orm(column_name = "Network_Number")]
    pub Network_Number: Option<i32>,           // C++ Network_Number
    #[sea_orm(column_name = "Product_Name")]
    pub Product_Name: Option<String>,          // C++ Product_Name
    #[sea_orm(column_name = "Product_Class_ID")]
    pub Product_Class_ID: Option<i32>,         // C++ Product_class_ID
    #[sea_orm(column_name = "Product_ID")]
    pub Product_ID: Option<i32>,               // C++ Product_ID
    #[sea_orm(column_name = "Screen_Name")]
    pub Screen_Name: Option<String>,           // C++ Screen_Name
    #[sea_orm(column_name = "Bautrate")]
    pub Bautrate: Option<String>,              // C++ Bautrate (IP address or baud rate)
    #[sea_orm(column_name = "Address")]
    pub Address: Option<String>,               // C++ Address
    #[sea_orm(column_name = "Register")]
    pub Register: Option<String>,              // C++ Register
    #[sea_orm(column_name = "Function")]
    pub Function: Option<String>,              // C++ Function
    #[sea_orm(column_name = "Description")]
    pub Description: Option<String>,           // C++ Description
    #[sea_orm(column_name = "High_Units")]
    pub High_Units: Option<String>,            // C++ High_Units
    #[sea_orm(column_name = "Low_Units")]
    pub Low_Units: Option<String>,             // C++ Low_Units
    #[sea_orm(column_name = "Update_Field")]
    pub Update_Field: Option<String>,          // C++ Update
    #[sea_orm(column_name = "Status")]
    pub Status: Option<String>,                // C++ Status
    #[sea_orm(column_name = "Range_Field")]
    pub Range_Field: Option<String>,           // C++ Range
    #[sea_orm(column_name = "Calibration")]
    pub Calibration: Option<String>,           // C++ Calibration

    // Additional network communication fields from C++ codebase analysis
    #[sea_orm(column_name = "IP_Address")]
    pub ip_address: Option<String>,            // C++ ip_address (device IP address)
    #[sea_orm(column_name = "Port")]
    pub port: Option<i32>,                     // C++ nport (network port number)
    #[sea_orm(column_name = "BACnet_MSTP_Mac_ID")]
    pub bacnet_mstp_mac_id: Option<i32>,       // C++ macaddress (BACnet MSTP MAC ID)
    #[sea_orm(column_name = "Modbus_Address")]
    pub modbus_address: Option<u8>,            // C++ modbus_addr (Modbus device ID)
    #[sea_orm(column_name = "PC_IP_Address")]
    pub pc_ip_address: Option<String>,         // C++ host IP address (connection info)
    #[sea_orm(column_name = "Modbus_Port")]
    pub modbus_port: Option<u16>,              // C++ modbus_port (Modbus TCP port)
    #[sea_orm(column_name = "BACnet_IP_Port")]
    pub bacnet_ip_port: Option<u16>,           // C++ bacnetip_port (BACnet/IP port, default 47808)
    #[sea_orm(column_name = "Show_Label_Name")]
    pub show_label_name: Option<String>,       // C++ show_label_name (display name)
    #[sea_orm(column_name = "Connection_Type")]
    pub connection_type: Option<String>,       // C++ connection type (Serial/Ethernet/etc)
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
