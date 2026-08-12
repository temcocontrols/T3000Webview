use std::fmt::Display;

use serde::{Deserialize, Deserializer, Serialize};
use serde_with::skip_serializing_none;
use strum_macros::Display;

use crate::entity::modbus_register;
use crate::entity::modbus_register_devices;

fn deserialize_option_option<'de, D, T>(deserializer: D) -> Result<Option<Option<T>>, D::Error>
where
    D: Deserializer<'de>,
    T: Deserialize<'de>,
{
    let opt: Option<T> = Option::deserialize(deserializer)?;
    Ok(Some(opt))
}

#[derive(Serialize, Debug)]
pub struct ModbusRegister {
    pub id: i32,
    pub register_address: i32,
    pub operation: Option<String>,
    pub register_length: i32,
    pub register_name: Option<String>,
    pub data_format: String,
    pub description: Option<String>,
    pub device_id: i32,
    pub status: String,
    pub unit: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Deserialize, Debug)]
pub struct ModbusRegisterQueryParams {
    pub limit: Option<u64>,
    pub offset: Option<u64>,
    pub order_by: Option<ModbusRegisterColumns>,
    pub order_dir: Option<OrderByDirection>,
    pub filter: Option<String>,
    pub device_id: Option<i32>,
    pub local_only: Option<bool>,
}

#[derive(Deserialize, Display, Debug)]
#[serde(rename_all = "lowercase")]
pub enum OrderByDirection {
    Asc,
    Desc,
}

impl Into<sea_orm::Order> for OrderByDirection {
    fn into(self) -> sea_orm::Order {
        match self {
            OrderByDirection::Asc => sea_orm::Order::Asc,
            OrderByDirection::Desc => sea_orm::Order::Desc,
        }
    }
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "snake_case")]
pub enum ModbusRegisterColumns {
    Id,
    RegisterAddress,
    Operation,
    RegisterLength,
    RegisterName,
    DataFormat,
    Description,
    DeviceId,
    Status,
    Unit,
    CreatedAt,
    UpdatedAt,
}

impl Into<modbus_register::Column> for ModbusRegisterColumns {
    fn into(self) -> modbus_register::Column {
        match self {
            ModbusRegisterColumns::Id => modbus_register::Column::Id,
            ModbusRegisterColumns::RegisterAddress => modbus_register::Column::RegisterAddress,
            ModbusRegisterColumns::Operation => modbus_register::Column::Operation,
            ModbusRegisterColumns::RegisterLength => modbus_register::Column::RegisterLength,
            ModbusRegisterColumns::RegisterName => modbus_register::Column::RegisterName,
            ModbusRegisterColumns::DataFormat => modbus_register::Column::DataFormat,
            ModbusRegisterColumns::Description => modbus_register::Column::Description,
            ModbusRegisterColumns::DeviceId => modbus_register::Column::DeviceId,
            ModbusRegisterColumns::Status => modbus_register::Column::Status,
            ModbusRegisterColumns::Unit => modbus_register::Column::Unit,
            ModbusRegisterColumns::CreatedAt => modbus_register::Column::CreatedAt,
            ModbusRegisterColumns::UpdatedAt => modbus_register::Column::UpdatedAt,
        }
    }
}

impl Display for ModbusRegisterColumns {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            f,
            "{}",
            serde_json::to_string(self).unwrap().trim_matches('"')
        )
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateModbusRegisterItemInput {
    pub id: Option<i32>,
    pub register_address: Option<i32>,
    pub operation: Option<String>,
    pub register_length: i32,
    pub register_name: Option<String>,
    pub data_format: Option<String>,
    pub description: Option<String>,
    pub device_id: Option<i32>,
    pub unit: Option<String>,
    pub status: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    pub private: Option<bool>,
}

#[derive(Deserialize, Clone, Debug)]
#[skip_serializing_none]
pub struct UpdateModbusRegisterItemInput {
    pub register_address: Option<i32>,
    #[serde(default, deserialize_with = "deserialize_option_option")]
    pub operation: Option<Option<String>>,
    pub register_length: Option<i32>,
    #[serde(default, deserialize_with = "deserialize_option_option")]
    pub register_name: Option<Option<String>>,
    #[serde(default, deserialize_with = "deserialize_option_option")]
    pub data_format: Option<Option<String>>,
    #[serde(default, deserialize_with = "deserialize_option_option")]
    pub description: Option<Option<String>>,
    #[serde(default, deserialize_with = "deserialize_option_option")]
    pub device_id: Option<Option<i32>>,
    #[serde(default, deserialize_with = "deserialize_option_option")]
    pub unit: Option<Option<String>>,
    pub status: Option<String>,
    #[serde(default, deserialize_with = "deserialize_option_option")]
    pub private: Option<Option<bool>>,
}

#[derive(Serialize, Debug)]
pub struct ModbusRegisterModel {
    pub id: i32,
    pub register_address: Option<i32>,
    pub operation: Option<String>,
    pub register_length: i32,
    pub register_name: Option<String>,
    pub data_format: Option<String>,
    pub description: Option<String>,
    pub device_id: Option<i32>,
    pub device: Option<modbus_register_devices::Model>,
    pub status: String,
    pub unit: Option<String>,
    pub private: Option<bool>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Serialize, Debug)]
pub struct ModbusRegisterResponse {
    pub data: Vec<ModbusRegisterModel>,
    pub count: u64,
}

#[derive(Debug, Deserialize)]
#[skip_serializing_none]
pub struct UpdateSettingInput {
    #[serde(default, deserialize_with = "deserialize_option_option")]
    pub value: Option<Option<String>>,
    #[serde(default, deserialize_with = "deserialize_option_option")]
    pub json_value: Option<Option<serde_json::Value>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateDeviceInput {
    pub id: Option<i32>,
    pub remote_id: Option<i32>,
    pub name: String,
    pub description: Option<String>,
    pub status: Option<String>,
    pub private: Option<bool>,
    pub image_id: Option<i32>,
}

#[derive(Debug, Deserialize)]
#[skip_serializing_none]
pub struct UpdateDeviceInput {
    #[serde(default, deserialize_with = "deserialize_option_option")]
    pub remote_id: Option<Option<i32>>,
    pub name: Option<String>,
    #[serde(default, deserialize_with = "deserialize_option_option")]
    pub description: Option<Option<String>>,
    pub status: Option<String>,
    pub private: Option<bool>,
    #[serde(default, deserialize_with = "deserialize_option_option")]
    pub image_id: Option<Option<i32>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateDeviceNameIdMappingInput {
    pub product_id: i32,
    pub device_id: i32,
}

#[derive(Deserialize, Debug)]
pub struct ModbusRegisterDevicesQueryParams {
    pub local_only: Option<bool>,
}
