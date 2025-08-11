// T3000 Buildings Service
use sea_orm::*;
use serde::{Deserialize, Serialize};
use crate::entity::t3_device::{buildings, devices, input_points, output_points};
use crate::error::AppError;

#[derive(Debug, Serialize, Deserialize)]
pub struct BuildingWithStats {
    #[serde(flatten)]
    pub building: buildings::Model,
    pub device_count: u64,
    pub total_points: u64,
    pub online_devices: u64,
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
pub struct CreateBuildingRequest {
    pub name: String,
    pub address: Option<String>,
    pub protocol: Option<String>,
    pub ip_domain_tel: Option<String>,
    pub modbus_tcp_port: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateBuildingRequest {
    pub name: Option<String>,
    pub address: Option<String>,
    pub protocol: Option<String>,
    pub ip_domain_tel: Option<String>,
    pub modbus_tcp_port: Option<i32>,
}

pub struct T3DeviceService;

impl T3DeviceService {
    /// Get all buildings with device statistics
    pub async fn get_buildings_with_stats(db: &DatabaseConnection) -> Result<Vec<BuildingWithStats>, AppError> {
        let buildings_list = buildings::Entity::find().all(db).await?;

        let mut result = Vec::new();

        for building in buildings_list {
            // For now, get a simple count - in production you'd implement proper relations
            let device_count = devices::Entity::find().count(db).await?;
            let total_points = input_points::Entity::find().count(db).await?
                + output_points::Entity::find().count(db).await?;
            let online_devices = devices::Entity::find().count(db).await?; // Simplified

            result.push(BuildingWithStats {
                building,
                device_count,
                total_points,
                online_devices,
            });
        }

        Ok(result)
    }

    /// Get building by ID with full details
    pub async fn get_building_by_id(db: &DatabaseConnection, building_id: i32) -> Result<Option<buildings::Model>, AppError> {
        let building = buildings::Entity::find_by_id(building_id)
            .one(db)
            .await?;
        Ok(building)
    }

    /// Get devices for a building with point counts
    pub async fn get_building_devices(db: &DatabaseConnection, building_id: i32) -> Result<Vec<DeviceWithPoints>, AppError> {
    // Get devices directly from building
    let building_devices = devices::Entity::find()
        .filter(devices::Column::BuildingId.eq(building_id))
        .all(db)
        .await?;

    let mut result = Vec::new();

    for device in building_devices {
        let input_points = input_points::Entity::find()
            .filter(input_points::Column::DeviceId.eq(device.id))
            .limit(10) // Limit for performance
            .all(db)
            .await?;

            let output_points = output_points::Entity::find()
                .filter(output_points::Column::DeviceId.eq(device.id))
                .limit(10) // Limit for performance
                .all(db)
                .await?;

            let point_count = (input_points.len() + output_points.len()) as u64;

            result.push(DeviceWithPoints {
                device,
                input_points,
                output_points,
                point_count,
            });
        }

        Ok(result)
    }

    /// Create a new building
    pub async fn create_building(
        db: &DatabaseConnection,
        req: CreateBuildingRequest,
    ) -> Result<buildings::Model, AppError> {
        let now = chrono::Utc::now().timestamp();

        let new_building = buildings::ActiveModel {
            name: Set(req.name),
            address: Set(req.address),
            protocol: Set(req.protocol),
            ip_domain_tel: Set(req.ip_domain_tel),
            modbus_tcp_port: Set(req.modbus_tcp_port),
            created_at: Set(Some(now)),
            updated_at: Set(Some(now)),
            ..Default::default()
        };

        let building = new_building.insert(db).await?;
        Ok(building)
    }

    /// Update building
    pub async fn update_building(
        db: &DatabaseConnection,
        building_id: i32,
        req: UpdateBuildingRequest,
    ) -> Result<buildings::Model, AppError> {
        let building = buildings::Entity::find_by_id(building_id)
            .one(db)
            .await?
            .ok_or(AppError::NotFound("Building not found".to_string()))?;

        let mut active_building: buildings::ActiveModel = building.into();

        if let Some(name) = req.name {
            active_building.name = Set(name);
        }
        if let Some(address) = req.address {
            active_building.address = Set(Some(address));
        }
        if let Some(protocol) = req.protocol {
            active_building.protocol = Set(Some(protocol));
        }
        if let Some(ip_domain_tel) = req.ip_domain_tel {
            active_building.ip_domain_tel = Set(Some(ip_domain_tel));
        }
        if let Some(modbus_tcp_port) = req.modbus_tcp_port {
            active_building.modbus_tcp_port = Set(Some(modbus_tcp_port));
        }

        active_building.updated_at = Set(Some(chrono::Utc::now().timestamp()));

        let updated_building = active_building.update(db).await?;
        Ok(updated_building)
    }

    /// Delete building
    pub async fn delete_building(db: &DatabaseConnection, building_id: i32) -> Result<(), AppError> {
        buildings::Entity::delete_by_id(building_id)
            .exec(db)
            .await?;
        Ok(())
    }

    /// Create device for a building
    pub async fn create_device(
        db: &DatabaseConnection,
        building_id: i32,
        device_name: String,
        product_type: i32,
        instance_number: i32,
    ) -> Result<devices::Model, AppError> {
        let now = chrono::Utc::now().timestamp();

        let new_device = devices::ActiveModel {
            building_id: Set(building_id),
            device_name: Set(Some(device_name)),
            product_type: Set(product_type),
            instance_number: Set(instance_number),
            status: Set(Some(0)), // 0 for offline initially
            created_at: Set(Some(now)),
            updated_at: Set(Some(now)),
            ..Default::default()
        };

        let device = new_device.insert(db).await?;
        Ok(device)
    }

    /// Get device with its points
    pub async fn get_device_with_points(
        db: &DatabaseConnection,
        device_id: i32,
    ) -> Result<DeviceWithPoints, AppError> {
        let device = devices::Entity::find_by_id(device_id)
            .one(db)
            .await?
            .ok_or(AppError::NotFound("Device not found".to_string()))?;

        let input_points = input_points::Entity::find()
            .filter(input_points::Column::DeviceId.eq(device_id))
            .all(db)
            .await?;

        let output_points = output_points::Entity::find()
            .filter(output_points::Column::DeviceId.eq(device_id))
            .all(db)
            .await?;

        let point_count = input_points.len() + output_points.len();

        Ok(DeviceWithPoints {
            device,
            input_points,
            output_points,
            point_count: point_count as u64,
        })
    }
}
