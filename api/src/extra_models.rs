#![allow(unused)]
#![allow(clippy::all)]

use diesel::{AsChangeset, Insertable};
use serde::{Deserialize, Deserializer};
use serde_with::skip_serializing_none;
use crate::schema::modbus_register_items;

fn deserialize_option_option<'de, D, T>(deserializer: D) -> Result<Option<Option<T>>, D::Error>
where
    D: Deserializer<'de>,
    T: Deserialize<'de>,
{
    let opt: Option<T> = Option::deserialize(deserializer)?;
    Ok(Some(opt))
}


#[derive(Deserialize, Insertable, Debug)]
#[diesel(table_name = modbus_register_items)]
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

#[derive(AsChangeset, Deserialize, Clone, Debug)]
#[skip_serializing_none]
#[diesel(table_name = modbus_register_items)]
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

