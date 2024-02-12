use sqlx::{QueryBuilder, Sqlite, SqliteConnection};

use crate::{
    error::Error,
    error::Result,
    models::{CreateModbusRegisterItemInput, ModbusRegister, UpdateModbusRegisterItemInput},
};

pub async fn create_modbus_register_item(
    mut conn: SqliteConnection,
    item: CreateModbusRegisterItemInput,
) -> Result<ModbusRegister> {
    let item = sqlx::query_as::<_, ModbusRegister>(
    r#"
    INSERT INTO modbus_register_items (register_address, operation, register_length, register_name, data_format, description, device_name, unit)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
    "#,
  )
  .bind(item.register_address)
  .bind(item.operation)
  .bind(item.register_length)
  .bind(item.register_name)
  .bind(item.data_format)
  .bind(item.description)
  .bind(item.device_name)
  .bind(item.unit)
  .fetch_one(&mut conn)
  .await;

    item.map_err(|error| Error::DbError(error.to_string()))
}

pub async fn update_modbus_register_item(
    mut conn: SqliteConnection,
    id: i32,
    item: UpdateModbusRegisterItemInput,
) -> Result<ModbusRegister> {
    println!("item: {:?}", item);
    //check if the item exists
    let existing_item = sqlx::query_as::<_, ModbusRegister>(
        r#"
    SELECT * FROM modbus_register_items
    WHERE id = $1
    "#,
    )
    .bind(id)
    .fetch_one(&mut conn)
    .await;

    if existing_item.is_err() {
        return Err(Error::NotFound);
    }

    let mut query = QueryBuilder::<Sqlite>::new("UPDATE modbus_register_items SET ");
    if item.operation.is_some() {
        if item.register_address.is_some() {
            query
                .push("register_address = ")
                .push_bind(item.register_address);
        }
        query.push("operation = ").push_bind(item.operation);
    }
    if item.register_length.is_some() {
        query
            .push("register_length = ")
            .push_bind(item.register_length);
    }
    if item.register_name.is_some() {
        query.push("register_name = ").push_bind(item.register_name);
    }
    if item.data_format.is_some() {
        query.push("data_format = ").push_bind(item.data_format);
    }
    if item.description.is_some() {
        query.push("description = ").push_bind(item.description);
    }
    if item.device_name.is_some() {
        query.push("device_name = ").push_bind(item.device_name);
    }
    if item.unit.is_some() {
        query.push("unit = ").push_bind(item.unit);
    }

    query.push("WHERE id = ").push_bind(id);
    query.push(" RETURNING *");

    let query = query.build_query_as::<ModbusRegister>();

    // update the item
    let updated_item = query.fetch_one(&mut conn).await;
    updated_item.map_err(|error| Error::DbError(error.to_string()))
}

pub async fn delete_modbus_register_item(
    mut conn: SqliteConnection,
    id: i32,
) -> Result<ModbusRegister> {
    //check if the item exists
    let item = sqlx::query_as::<_, ModbusRegister>(
        r#"
      SELECT * FROM modbus_register_items
      WHERE id = $1
      "#,
    )
    .bind(id)
    .fetch_one(&mut conn)
    .await;
    if item.is_err() {
        return Err(Error::NotFound);
    } else if item.is_ok() && item.as_ref().unwrap().status != "NEW" {
        return Err(Error::PermissionDenied);
    }
    sqlx::query_as::<_, ModbusRegister>(
        r#"
      DELETE FROM modbus_register_items
      WHERE id = $1
      RETURNING *
      "#,
    )
    .bind(id)
    .fetch_one(&mut conn)
    .await
    .map_err(|error| Error::DbError(error.to_string()))
}
