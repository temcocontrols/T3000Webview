// T3000 Device Service - Aligned with pure T3000 structure
use sea_orm::*;
use serde::{Deserialize, Serialize};
use crate::entity::t3_device::{devices, input_points, output_points, variable_points};
use crate::error::AppError;

#[derive(Debug, Serialize, Deserialize)]
pub struct DeviceWithStats {
    #[serde(flatten)]
    pub device: devices::Model,
    pub input_count: u64,
    pub output_count: u64,
    pub variable_count: u64,
    pub total_points: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DeviceWithPoints {
    #[serde(flatten)]
    pub device: devices::Model,
    pub input_points: Vec<input_points::Model>,
    pub output_points: Vec<output_points::Model>,
    pub point_count: u64,
}

#[derive(Debug, Deserialize)]
pub struct CreateDeviceRequest {
    #[serde(rename = "SerialNumber", alias = "serialNumber")]
    pub serial_number: Option<i32>,                // T3000: SerialNumber (primary key, renamed from Serial_ID)
    #[serde(rename = "PanelId", alias = "panelId")]
    pub panel_id: Option<i32>,                     // T3000: PanelId (new column for panel identification)
    #[serde(rename = "Panel_Number", alias = "panelNumber")]
    pub panel_number: Option<i32>,                 // T3000: Panel_Number
    #[serde(rename = "Network_Number", alias = "networkNumber")]
    pub network_number: Option<i32>,               // T3000: Network_Number
    #[serde(rename = "MainBuilding_Name", alias = "mainBuildingName")]
    pub main_building_name: Option<String>,        // T3000: MainBuilding_Name
    #[serde(rename = "Building_Name", alias = "buildingName", alias = "subnetName")]
    pub building_name: Option<String>,             // T3000: Building_Name
    #[serde(rename = "Floor_Name", alias = "floorName")]
    pub floor_name: Option<String>,                // T3000: Floor_Name
    #[serde(rename = "Room_Name", alias = "roomName")]
    pub room_name: Option<String>,                 // T3000: Room_Name
    #[serde(rename = "Product_Name", alias = "productName", alias = "panelName")]
    pub product_name: Option<String>,              // T3000: Product_Name
    #[serde(rename = "Product_Class_ID", alias = "productClassId")]
    pub product_class_id: Option<i32>,             // T3000: Product_Class_ID
    #[serde(rename = "Product_ID", alias = "productId", alias = "deviceType")]
    pub product_id: Option<i32>,                   // T3000: Product_ID
    #[serde(rename = "Address", alias = "address")]
    pub address: Option<String>,                   // T3000: Address (IP/Modbus address)
    #[serde(rename = "Bautrate", alias = "bautrate")]
    pub bautrate: Option<String>,                  // T3000: Bautrate (IP address or baud rate)
    #[serde(rename = "Description", alias = "description")]
    pub description: Option<String>,               // T3000: Description
    #[serde(rename = "Status", alias = "status")]
    pub status: Option<String>,                    // T3000: Status

    // NEW NETWORK CONFIGURATION FIELDS (matching latest entity)
    #[serde(rename = "IP_Address", alias = "ipAddress")]
    pub ip_address: Option<String>,                // T3000: IP_Address
    #[serde(rename = "Port", alias = "port")]
    pub port: Option<i32>,                         // T3000: Port
    #[serde(rename = "BACnet_MSTP_MAC_ID", alias = "bacnetMstpMacId", alias = "objectInstance")]
    pub bacnet_mstp_mac_id: Option<i32>,           // T3000: BACnet_MSTP_MAC_ID
    #[serde(rename = "Modbus_Address", alias = "modbusAddress")]
    pub modbus_address: Option<u8>,                // T3000: Modbus_Address (u8 type)
    #[serde(rename = "PC_IP_Address", alias = "pcIpAddress")]
    pub pc_ip_address: Option<String>,             // T3000: PC_IP_Address
    #[serde(rename = "Modbus_Port", alias = "modbusPort")]
    pub modbus_port: Option<u16>,                  // T3000: Modbus_Port (u16 type)
    #[serde(rename = "BACnet_IP_Port", alias = "bacnetIpPort")]
    pub bacnet_ip_port: Option<u16>,               // T3000: BACnet_IP_Port (u16 type)
    #[serde(rename = "Show_Label_Name", alias = "showLabelName")]
    pub show_label_name: Option<String>,           // T3000: Show_Label_Name (String type)
    #[serde(rename = "Connection_Type", alias = "connectionType", alias = "protocol")]
    pub connection_type: Option<String>,           // T3000: Connection_Type (String type)

    // Additional fields from frontend that may be sent but not stored
    #[serde(skip_deserializing)]
    pub last_online_time: Option<i64>,             // Timestamp - not in DEVICES table yet
    #[serde(skip_deserializing)]
    pub is_online: Option<bool>,                   // Online status - not in DEVICES table yet
}

#[derive(Debug, Deserialize)]
pub struct UpdateDeviceRequest {
    #[serde(rename = "PanelId")]
    pub panel_id: Option<i32>,                      // T3000: PanelId (new column for panel identification)
    #[serde(rename = "MainBuilding_Name")]
    pub main_building_name: Option<String>,         // T3000: MainBuilding_Name
    #[serde(rename = "Building_Name")]
    pub building_name: Option<String>,              // T3000: Building_Name
    #[serde(rename = "Floor_Name")]
    pub floor_name: Option<String>,                 // T3000: Floor_Name
    #[serde(rename = "Room_Name")]
    pub room_name: Option<String>,                  // T3000: Room_Name
    #[serde(rename = "Product_Name")]
    pub product_name: Option<String>,               // T3000: Product_Name
    #[serde(rename = "Address")]
    pub address: Option<String>,                    // T3000: Address
    #[serde(rename = "Bautrate")]
    pub bautrate: Option<String>,                   // T3000: Bautrate
    #[serde(rename = "Description")]
    pub description: Option<String>,                // T3000: Description
    #[serde(rename = "Status")]
    pub status: Option<String>,                     // T3000: Status

    // NEW NETWORK CONFIGURATION FIELDS (matching latest entity)
    #[serde(rename = "IP_Address")]
    pub ip_address: Option<String>,                // T3000: IP_Address
    #[serde(rename = "Port")]
    pub port: Option<i32>,                         // T3000: Port
    #[serde(rename = "BACnet_MSTP_MAC_ID")]
    pub bacnet_mstp_mac_id: Option<i32>,           // T3000: BACnet_MSTP_MAC_ID
    #[serde(rename = "Modbus_Address")]
    pub modbus_address: Option<u8>,                // T3000: Modbus_Address (u8 type)
    #[serde(rename = "PC_IP_Address")]
    pub pc_ip_address: Option<String>,             // T3000: PC_IP_Address
    #[serde(rename = "Modbus_Port")]
    pub modbus_port: Option<u16>,                  // T3000: Modbus_Port (u16 type)
    #[serde(rename = "BACnet_IP_Port")]
    pub bacnet_ip_port: Option<u16>,               // T3000: BACnet_IP_Port (u16 type)
    #[serde(rename = "Show_Label_Name")]
    pub show_label_name: Option<String>,           // T3000: Show_Label_Name (String type)
    #[serde(rename = "Connection_Type")]
    pub connection_type: Option<String>,           // T3000: Connection_Type (String type)
}

pub struct T3DeviceService;

impl T3DeviceService {
    /// Get all devices with basic statistics
    pub async fn get_all_devices_with_stats(db: &DatabaseConnection) -> Result<Vec<DeviceWithStats>, AppError> {
        let devices_list = devices::Entity::find().all(db).await?;
        let mut devices_with_stats = Vec::new();

        for device in devices_list {
            let serial_id = device.serial_number;

            // Count related points using the correct foreign key
            let input_count = input_points::Entity::find()
                .filter(input_points::Column::SerialNumber.eq(serial_id))
                .count(db)
                .await
                .unwrap_or(0);

            let output_count = output_points::Entity::find()
                .filter(output_points::Column::SerialNumber.eq(serial_id))
                .count(db)
                .await
                .unwrap_or(0);

            let variable_count = variable_points::Entity::find()
                .filter(variable_points::Column::SerialNumber.eq(serial_id))
                .count(db)
                .await
                .unwrap_or(0);

            devices_with_stats.push(DeviceWithStats {
                device,
                input_count,
                output_count,
                variable_count,
                total_points: input_count + output_count + variable_count,
            });
        }

        Ok(devices_with_stats)
    }

    /// Get a specific device by SerialNumber
    pub async fn get_device_by_id(db: &DatabaseConnection, device_id: i32) -> Result<Option<devices::Model>, AppError> {
        let device = devices::Entity::find_by_id(device_id)
            .one(db)
            .await?;

        Ok(device)
    }

    /// Get device with its points
    pub async fn get_device_with_points(db: &DatabaseConnection, device_id: i32) -> Result<Option<DeviceWithPoints>, AppError> {
        let device = devices::Entity::find_by_id(device_id)
            .one(db)
            .await?;

        let device = match device {
            Some(d) => d,
            None => return Ok(None),
        };

        // Fetch actual input and output points for this device
        let input_points = input_points::Entity::find()
            .filter(input_points::Column::SerialNumber.eq(device_id))
            .all(db)
            .await?;

        let output_points = output_points::Entity::find()
            .filter(output_points::Column::SerialNumber.eq(device_id))
            .all(db)
            .await?;

        let point_count = input_points.len() + output_points.len();

        Ok(Some(DeviceWithPoints {
            device,
            input_points,
            output_points,
            point_count: point_count as u64,
        }))
    }

    /// Create a new device (or update if exists - UPSERT behavior)
    pub async fn create_device(db: &DatabaseConnection, device_data: CreateDeviceRequest) -> Result<devices::Model, AppError> {
        let serial_number = device_data.serial_number.unwrap_or(0);

        // Check if device with this serial number already exists
        let existing_device = devices::Entity::find_by_id(serial_number)
            .one(db)
            .await?;

        if let Some(existing) = existing_device {
            // Device exists - update it
            let mut device: devices::ActiveModel = existing.into();

            if device_data.panel_id.is_some() {
                device.panel_id = Set(device_data.panel_id);
            }
            if device_data.panel_number.is_some() {
                device.panel_number = Set(device_data.panel_number);
            }
            if device_data.network_number.is_some() {
                device.network_number = Set(device_data.network_number);
            }
            if device_data.main_building_name.is_some() {
                device.main_building_name = Set(device_data.main_building_name);
            }
            if device_data.building_name.is_some() {
                device.building_name = Set(device_data.building_name);
            }
            if device_data.floor_name.is_some() {
                device.floor_name = Set(device_data.floor_name);
            }
            if device_data.room_name.is_some() {
                device.room_name = Set(device_data.room_name);
            }
            if device_data.product_name.is_some() {
                device.product_name = Set(device_data.product_name);
            }
            if device_data.product_class_id.is_some() {
                device.product_class_id = Set(device_data.product_class_id);
            }
            if device_data.product_id.is_some() {
                device.product_id = Set(device_data.product_id);
            }
            if device_data.bautrate.is_some() {
                device.bautrate = Set(device_data.bautrate);
            }
            if device_data.address.is_some() {
                device.address = Set(device_data.address);
            }
            if device_data.description.is_some() {
                device.description = Set(device_data.description);
            }
            if device_data.status.is_some() {
                device.status = Set(device_data.status);
            }
            if device_data.ip_address.is_some() {
                device.ip_address = Set(device_data.ip_address);
            }
            if device_data.port.is_some() {
                device.port = Set(device_data.port);
            }
            if device_data.bacnet_mstp_mac_id.is_some() {
                device.bacnet_mstp_mac_id = Set(device_data.bacnet_mstp_mac_id);
            }
            if device_data.modbus_address.is_some() {
                device.modbus_address = Set(device_data.modbus_address);
            }
            if device_data.pc_ip_address.is_some() {
                device.pc_ip_address = Set(device_data.pc_ip_address);
            }
            if device_data.modbus_port.is_some() {
                device.modbus_port = Set(device_data.modbus_port);
            }
            if device_data.bacnet_ip_port.is_some() {
                device.bacnet_ip_port = Set(device_data.bacnet_ip_port);
            }
            if device_data.show_label_name.is_some() {
                device.show_label_name = Set(device_data.show_label_name);
            }
            if device_data.connection_type.is_some() {
                device.connection_type = Set(device_data.connection_type);
            }

            let updated_device = device.update(db).await?;
            Ok(updated_device)
        } else {
            // Device doesn't exist - create new one
            let new_device = devices::ActiveModel {
                serial_number: Set(serial_number), // Use provided serial number as primary key
                panel_id: Set(device_data.panel_id),
                main_building_name: Set(device_data.main_building_name),
                building_name: Set(device_data.building_name),
                floor_name: Set(device_data.floor_name),
                room_name: Set(device_data.room_name),
                panel_number: Set(device_data.panel_number),
                network_number: Set(device_data.network_number),
                product_name: Set(device_data.product_name),
                product_class_id: Set(device_data.product_class_id),
                product_id: Set(device_data.product_id),
                screen_name: Set(None),
                bautrate: Set(device_data.bautrate),
                address: Set(device_data.address),
                register: Set(None),
                function: Set(None),
                description: Set(device_data.description),
                high_units: Set(None),
                low_units: Set(None),
                update_field: Set(None),
                status: Set(device_data.status),
                range_field: Set(None),
                calibration: Set(None),

                // Network configuration fields from latest entity
                ip_address: Set(device_data.ip_address),
                port: Set(device_data.port),
                bacnet_mstp_mac_id: Set(device_data.bacnet_mstp_mac_id),
                modbus_address: Set(device_data.modbus_address),
                pc_ip_address: Set(device_data.pc_ip_address),
                modbus_port: Set(device_data.modbus_port),
                bacnet_ip_port: Set(device_data.bacnet_ip_port),
                show_label_name: Set(device_data.show_label_name),
                connection_type: Set(device_data.connection_type),
            };

            let device = new_device.insert(db).await?;
            Ok(device)
        }
    }

    /// Update a device
    pub async fn update_device(db: &DatabaseConnection, device_id: i32, device_data: UpdateDeviceRequest) -> Result<Option<devices::Model>, AppError> {
        let device = devices::Entity::find_by_id(device_id)
            .one(db)
            .await?;

        let device = match device {
            Some(d) => d,
            None => return Ok(None),
        };

        let mut device: devices::ActiveModel = device.into();

        if let Some(panel_id) = device_data.panel_id {
            device.panel_id = Set(Some(panel_id));
        }
        if let Some(main_building_name) = device_data.main_building_name {
            device.main_building_name = Set(Some(main_building_name));
        }
        if let Some(building_name) = device_data.building_name {
            device.building_name = Set(Some(building_name));
        }
        if let Some(floor_name) = device_data.floor_name {
            device.floor_name = Set(Some(floor_name));
        }
        if let Some(room_name) = device_data.room_name {
            device.room_name = Set(Some(room_name));
        }
        if let Some(product_name) = device_data.product_name {
            device.product_name = Set(Some(product_name));
        }
        if let Some(address) = device_data.address {
            device.address = Set(Some(address));
        }
        if let Some(bautrate) = device_data.bautrate {
            device.bautrate = Set(Some(bautrate));
        }
        if let Some(description) = device_data.description {
            device.description = Set(Some(description));
        }

        // Update network configuration fields
        if let Some(ip_address) = device_data.ip_address {
            device.ip_address = Set(Some(ip_address));
        }
        if let Some(port) = device_data.port {
            device.port = Set(Some(port));
        }
        if let Some(bacnet_mstp_mac_id) = device_data.bacnet_mstp_mac_id {
            device.bacnet_mstp_mac_id = Set(Some(bacnet_mstp_mac_id));
        }
        if let Some(modbus_address) = device_data.modbus_address {
            device.modbus_address = Set(Some(modbus_address));
        }
        if let Some(pc_ip_address) = device_data.pc_ip_address {
            device.pc_ip_address = Set(Some(pc_ip_address));
        }
        if let Some(modbus_port) = device_data.modbus_port {
            device.modbus_port = Set(Some(modbus_port));
        }
        if let Some(bacnet_ip_port) = device_data.bacnet_ip_port {
            device.bacnet_ip_port = Set(Some(bacnet_ip_port));
        }
        if let Some(show_label_name) = device_data.show_label_name {
            device.show_label_name = Set(Some(show_label_name));
        }
        if let Some(connection_type) = device_data.connection_type {
            device.connection_type = Set(Some(connection_type));
        }

        let updated_device = device.update(db).await?;
        Ok(Some(updated_device))
    }

    /// Delete a device
    pub async fn delete_device(db: &DatabaseConnection, device_id: i32) -> Result<bool, AppError> {
        let result = devices::Entity::delete_by_id(device_id)
            .exec(db)
            .await?;

        Ok(result.rows_affected > 0)
    }
}
