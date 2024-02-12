use crate::{
    error::Error,
    error::Result,
    extra_models::{CreateModbusRegisterItemInput, UpdateModbusRegisterItemInput},
    models,
};
use diesel::prelude::*;
use models::ModbusRegisterItem;
use serde::Deserialize;

pub fn create_modbus_register_item(
    conn: &mut SqliteConnection,
    item: CreateModbusRegisterItemInput,
) -> Result<ModbusRegisterItem> {
    use crate::schema::modbus_register_items;
    diesel::insert_into(modbus_register_items::table)
        .values(&item)
        .returning(ModbusRegisterItem::as_returning())
        .get_result(conn)
        .map_err(|error| Error::DbError(error.to_string()))
}

pub fn update_modbus_register_item(
    conn: &mut SqliteConnection,
    id: i32,
    item: UpdateModbusRegisterItemInput,
) -> Result<ModbusRegisterItem> {
    use crate::schema::modbus_register_items::dsl::modbus_register_items;
    let old_item: std::result::Result<ModbusRegisterItem, diesel::result::Error> =
        modbus_register_items.find(id).first(conn);
    if old_item.is_err() {
        return Err(Error::NotFound);
    }

    diesel::update(modbus_register_items.find(id))
        .set(&item)
        .returning(ModbusRegisterItem::as_returning())
        .get_result(conn)
        .map_err(|error| Error::DbError(error.to_string()))
}

pub fn delete_modbus_register_item(
    conn: &mut SqliteConnection,
    id: i32,
) -> Result<ModbusRegisterItem> {
    use crate::schema::modbus_register_items::dsl::modbus_register_items;
    let item: std::result::Result<ModbusRegisterItem, diesel::result::Error> =
        modbus_register_items.find(id).first(conn);
    if item.is_err() {
        return Err(Error::NotFound);
    } else if item.is_ok() && item.as_ref().unwrap().status != "NEW" {
        return Err(Error::PermissionDenied);
    }
    diesel::delete(modbus_register_items.find(id))
        .returning(ModbusRegisterItem::as_returning())
        .get_result(conn)
        .map_err(|error| Error::DbError(error.to_string()))
}
