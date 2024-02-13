use serde::{Deserialize, Deserializer, Serialize};
use serde_with::skip_serializing_none;

fn deserialize_option_option<'de, D, T>(deserializer: D) -> Result<Option<Option<T>>, D::Error>
where
    D: Deserializer<'de>,
    T: Deserialize<'de>,
{
    let opt: Option<T> = Option::deserialize(deserializer)?;
    Ok(Some(opt))
}

#[derive(sqlx::FromRow, Serialize, Debug)]
pub struct ModbusRegister {
    pub id: i32,
    pub register_address: i32,
    pub operation: Option<String>,
    pub register_length: i32,
    pub register_name: Option<String>,
    pub data_format: String,
    pub description: Option<String>,
    pub device_name: String,
    pub status: String,
    pub unit: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Deserialize, Debug)]
pub struct ModbusRegisterPagination {
    pub limit: Option<i64>,
    pub offset: Option<i64>,
    pub order_by: Option<ModbusRegisterColumns>,
    pub order_dir: Option<OrderByDirection>,
    pub filter: Option<String>,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "lowercase")]
pub enum OrderByDirection {
    Asc,
    Desc,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "snake_case")]
pub enum ModbusRegisterColumns {
    Id,
    RegisterAddress,
    Operation,
    RegisterLength,
    RegisterName,
    DataFormat,
    Description,
    DeviceName,
    Status,
    Unit,
    CreatedAt,
    UpdatedAt,
}

#[derive(Deserialize, Debug)]
pub struct CreateModbusRegisterItemInput {
    pub register_address: i32,
    pub operation: Option<String>,
    pub register_length: i32,
    pub register_name: Option<String>,
    pub data_format: String,
    pub description: Option<String>,
    pub device_name: String,
    pub unit: Option<String>,
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
    pub data_format: Option<String>,
    #[serde(default, deserialize_with = "deserialize_option_option")]
    pub description: Option<Option<String>>,
    pub device_name: Option<String>,
    #[serde(default, deserialize_with = "deserialize_option_option")]
    pub unit: Option<Option<String>>,
}
