// T3000 Device Service - Aligned with pure T3000 structure
use sea_orm::*;
use serde::{Deserialize, Serialize};
use crate::entity::t3_device::{all_node, input_points, output_points};
use crate::error::AppError;

#[derive(Debug, Serialize, Deserialize)]
pub struct DeviceWithStats {
    #[serde(flatten)]
    pub device: all_node::Model,
    pub input_count: u64,
    pub output_count: u64,
    pub variable_count: u64,
    pub total_points: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DeviceWithPoints {
    #[serde(flatten)]
    pub device: all_node::Model,
    pub input_points: Vec<input_points::Model>,
    pub output_points: Vec<output_points::Model>,
    pub point_count: u64,
}

#[derive(Debug, Deserialize)]
pub struct CreateDeviceRequest {
    pub n_serial_number: Option<i32>,
    pub n_product_number: Option<i32>,
    pub build_label: Option<String>,
    pub hardware_ver: Option<String>,
    pub software_ver: Option<String>,
    pub tcpip_address: Option<String>,
    pub tcpip_port: Option<i32>,
    pub modbus_station_id: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateDeviceRequest {
    pub build_label: Option<String>,
    pub hardware_ver: Option<String>,
    pub software_ver: Option<String>,
    pub tcpip_address: Option<String>,
    pub tcpip_port: Option<i32>,
    pub modbus_station_id: Option<i32>,
}

pub struct T3DeviceService;

impl T3DeviceService {
    /// Get all devices with basic statistics
    pub async fn get_all_devices_with_stats(db: &DatabaseConnection) -> Result<Vec<DeviceWithStats>, AppError> {
        let devices_list = all_node::Entity::find().all(db).await?;
        let mut devices_with_stats = Vec::new();

        for device in devices_list {
            let _serial_num = device.nSerialNumber.unwrap_or(0);

            // Note: Column names need to match actual entity field names
            // For now using simplified approach until point entities are updated
            let input_count = 0; // input_points::Entity::find().count(db).await?;
            let output_count = 0; // output_points::Entity::find().count(db).await?;

            devices_with_stats.push(DeviceWithStats {
                device,
                input_count,
                output_count,
                variable_count: 0,
                total_points: input_count + output_count,
            });
        }

        Ok(devices_with_stats)
    }

    /// Get a specific device by Serial_ID
    pub async fn get_device_by_id(db: &DatabaseConnection, device_id: i32) -> Result<Option<all_node::Model>, AppError> {
        let device = all_node::Entity::find_by_id(device_id)
            .one(db)
            .await?;

        Ok(device)
    }

    /// Get device with its points
    pub async fn get_device_with_points(db: &DatabaseConnection, device_id: i32) -> Result<Option<DeviceWithPoints>, AppError> {
        let device = all_node::Entity::find_by_id(device_id)
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
    pub async fn create_device(db: &DatabaseConnection, device_data: CreateDeviceRequest) -> Result<all_node::Model, AppError> {
        let new_device = all_node::ActiveModel {
            Serial_ID: NotSet,
            nSerialNumber: Set(device_data.n_serial_number),
            nProductNumber: Set(device_data.n_product_number),
            Build_Label: Set(device_data.build_label),
            Hardware_Ver: Set(device_data.hardware_ver),
            Software_Ver: Set(device_data.software_ver),
            TCPIP_Address: Set(device_data.tcpip_address),
            TCPIP_Port: Set(device_data.tcpip_port),
            TCPIP_gateway: Set(None),
            TCPIP_subnet: Set(None),
            Modbus_Station_ID: Set(device_data.modbus_station_id),
            Listen_Port: Set(None),
            Custom_Info_ID: Set(None),
            WebUI_Type: Set(None),
            nCustomTable_Instance: Set(None),
            nCustom_Units_Instance: Set(None),
            Hardware_ID: Set(None),
            nBACnetInstanceNumber: Set(None),
        };

        let device = new_device.insert(db).await?;
        Ok(device)
    }

    /// Update a device
    pub async fn update_device(db: &DatabaseConnection, device_id: i32, device_data: UpdateDeviceRequest) -> Result<Option<all_node::Model>, AppError> {
        let device = all_node::Entity::find_by_id(device_id)
            .one(db)
            .await?;

        let device = match device {
            Some(d) => d,
            None => return Ok(None),
        };

        let mut device: all_node::ActiveModel = device.into();

        if let Some(build_label) = device_data.build_label {
            device.Build_Label = Set(Some(build_label));
        }
        if let Some(hardware_ver) = device_data.hardware_ver {
            device.Hardware_Ver = Set(Some(hardware_ver));
        }
        if let Some(software_ver) = device_data.software_ver {
            device.Software_Ver = Set(Some(software_ver));
        }
        if let Some(tcpip_address) = device_data.tcpip_address {
            device.TCPIP_Address = Set(Some(tcpip_address));
        }
        if let Some(tcpip_port) = device_data.tcpip_port {
            device.TCPIP_Port = Set(Some(tcpip_port));
        }
        if let Some(modbus_station_id) = device_data.modbus_station_id {
            device.Modbus_Station_ID = Set(Some(modbus_station_id));
        }

        let updated_device = device.update(db).await?;
        Ok(Some(updated_device))
    }

    /// Delete a device
    pub async fn delete_device(db: &DatabaseConnection, device_id: i32) -> Result<bool, AppError> {
        let result = all_node::Entity::delete_by_id(device_id)
            .exec(db)
            .await?;

        Ok(result.rows_affected > 0)
    }
}
