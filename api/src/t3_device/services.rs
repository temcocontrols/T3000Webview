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
    pub SerialNumber: Option<i32>,                // T3000: SerialNumber (primary key, renamed from Serial_ID)
    pub PanelId: Option<i32>,                     // T3000: PanelId (new column for panel identification)
    pub MainBuilding_Name: Option<String>,         // T3000: MainBuilding_Name
    pub Building_Name: Option<String>,             // T3000: Building_Name
    pub Floor_Name: Option<String>,                // T3000: Floor_Name
    pub Room_Name: Option<String>,                 // T3000: Room_Name
    pub Product_Name: Option<String>,              // T3000: Product_Name
    pub Product_Class_ID: Option<i32>,             // T3000: Product_Class_ID
    pub Product_ID: Option<i32>,                   // T3000: Product_ID
    pub Address: Option<String>,                   // T3000: Address (IP/Modbus address)
    pub Bautrate: Option<String>,                  // T3000: Bautrate (IP address or baud rate)
    pub Description: Option<String>,               // T3000: Description
    pub Status: Option<String>,                    // T3000: Status
}

#[derive(Debug, Deserialize)]
pub struct UpdateDeviceRequest {
    pub PanelId: Option<i32>,                      // T3000: PanelId (new column for panel identification)
    pub MainBuilding_Name: Option<String>,         // T3000: MainBuilding_Name
    pub Building_Name: Option<String>,             // T3000: Building_Name
    pub Floor_Name: Option<String>,                // T3000: Floor_Name
    pub Room_Name: Option<String>,                 // T3000: Room_Name
    pub Product_Name: Option<String>,              // T3000: Product_Name
    pub Address: Option<String>,                   // T3000: Address
    pub Bautrate: Option<String>,                  // T3000: Bautrate
    pub Description: Option<String>,               // T3000: Description
    pub Status: Option<String>,                    // T3000: Status
}

pub struct T3DeviceService;

impl T3DeviceService {
    /// Get all devices with basic statistics
    pub async fn get_all_devices_with_stats(db: &DatabaseConnection) -> Result<Vec<DeviceWithStats>, AppError> {
        let devices_list = devices::Entity::find().all(db).await?;
        let mut devices_with_stats = Vec::new();

        for device in devices_list {
            let serial_id = device.SerialNumber;

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
            SerialNumber: NotSet, // Auto-generated primary key
            PanelId: Set(device_data.PanelId),
            MainBuilding_Name: Set(device_data.MainBuilding_Name),
            Building_Name: Set(device_data.Building_Name),
            Floor_Name: Set(device_data.Floor_Name),
            Room_Name: Set(device_data.Room_Name),
            Panel_Number: Set(None),
            Network_Number: Set(None),
            Product_Name: Set(device_data.Product_Name),
            Product_Class_ID: Set(device_data.Product_Class_ID),
            Product_ID: Set(device_data.Product_ID),
            Screen_Name: Set(None),
            Bautrate: Set(device_data.Bautrate),
            Address: Set(device_data.Address),
            Register: Set(None),
            Function: Set(None),
            Description: Set(device_data.Description),
            High_Units: Set(None),
            Low_Units: Set(None),
            Update_Field: Set(None),
            Status: Set(device_data.Status),
            Range_Field: Set(None),
            Calibration: Set(None),

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

        if let Some(panel_id) = device_data.PanelId {
            device.PanelId = Set(Some(panel_id));
        }
        if let Some(main_building_name) = device_data.MainBuilding_Name {
            device.MainBuilding_Name = Set(Some(main_building_name));
        }
        if let Some(building_name) = device_data.Building_Name {
            device.Building_Name = Set(Some(building_name));
        }
        if let Some(floor_name) = device_data.Floor_Name {
            device.Floor_Name = Set(Some(floor_name));
        }
        if let Some(room_name) = device_data.Room_Name {
            device.Room_Name = Set(Some(room_name));
        }
        if let Some(product_name) = device_data.Product_Name {
            device.Product_Name = Set(Some(product_name));
        }
        if let Some(address) = device_data.Address {
            device.Address = Set(Some(address));
        }
        if let Some(bautrate) = device_data.Bautrate {
            device.Bautrate = Set(Some(bautrate));
        }
        if let Some(description) = device_data.Description {
            device.Description = Set(Some(description));
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
