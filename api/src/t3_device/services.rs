// T3000 Device Service - Aligned with pure T3000 structure
use sea_orm::*;
use serde::{Deserialize, Serialize};
use crate::entity::t3_device::{devices, input_points, output_points};
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
    #[serde(rename = "SerialNumber")]
    pub serial_number: Option<i32>,                // T3000: SerialNumber (primary key, renamed from Serial_ID)
    #[serde(rename = "PanelId")]
    pub panel_id: Option<i32>,                     // T3000: PanelId (new column for panel identification)
    #[serde(rename = "MainBuilding_Name")]
    pub main_building_name: Option<String>,        // T3000: MainBuilding_Name
    #[serde(rename = "Building_Name")]
    pub building_name: Option<String>,             // T3000: Building_Name
    #[serde(rename = "Floor_Name")]
    pub floor_name: Option<String>,                // T3000: Floor_Name
    #[serde(rename = "Room_Name")]
    pub room_name: Option<String>,                 // T3000: Room_Name
    #[serde(rename = "Product_Name")]
    pub product_name: Option<String>,              // T3000: Product_Name
    #[serde(rename = "Product_Class_ID")]
    pub product_class_id: Option<i32>,             // T3000: Product_Class_ID
    #[serde(rename = "Product_ID")]
    pub product_id: Option<i32>,                   // T3000: Product_ID
    #[serde(rename = "Address")]
    pub address: Option<String>,                   // T3000: Address (IP/Modbus address)
    #[serde(rename = "Bautrate")]
    pub bautrate: Option<String>,                  // T3000: Bautrate (IP address or baud rate)
    #[serde(rename = "Description")]
    pub description: Option<String>,               // T3000: Description
    #[serde(rename = "Status")]
    pub status: Option<String>,                    // T3000: Status
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

            devices_with_stats.push(DeviceWithStats {
                device,
                input_count,
                output_count,
                variable_count: 0, // Will be updated when variable_points entity is used
                total_points: input_count + output_count,
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

        // For now return empty points until point entities are properly updated
        let input_points = vec![];
        let output_points = vec![];

        let point_count = input_points.len() + output_points.len();

        Ok(Some(DeviceWithPoints {
            device,
            input_points,
            output_points,
            point_count: point_count as u64,
        }))
    }

    /// Create a new device
    pub async fn create_device(db: &DatabaseConnection, device_data: CreateDeviceRequest) -> Result<devices::Model, AppError> {
        let new_device = devices::ActiveModel {
            serial_number: NotSet, // Auto-generated primary key
            panel_id: Set(device_data.panel_id),
            main_building_name: Set(device_data.main_building_name),
            building_name: Set(device_data.building_name),
            floor_name: Set(device_data.floor_name),
            room_name: Set(device_data.room_name),
            panel_number: Set(None),
            network_number: Set(None),
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

            // Initialize new network configuration fields as None/defaults
            ip_address: Set(None),
            port: Set(None),
            bacnet_mstp_mac_id: Set(None),
            modbus_address: Set(None),
            pc_ip_address: Set(None),
            modbus_port: Set(None),
            bacnet_ip_port: Set(None),
            show_label_name: Set(None),
            connection_type: Set(None),
        };

        let device = new_device.insert(db).await?;
        Ok(device)
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
