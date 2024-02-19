use super::models::{
    CreateModbusRegisterItemInput, ModbusRegister, ModbusRegisterColumns, ModbusRegisterPagination,
    ModbusRegisterResponse, OrderByDirection, UpdateModbusRegisterItemInput,
};
use crate::error::{Error, Result};
use sqlx::{Pool, QueryBuilder, Sqlite};

fn generate_filter_query(filter: Option<String>, base_query: String) -> String {
    match filter {
        Some(filter) => {
            let filter_num = filter.parse::<i32>();
            let mut query = format!(
                "{base_query} WHERE ( register_name LIKE '%' || $1 || '%'
            OR operation LIKE '%' || $1 || '%'
            OR description LIKE '%' || $1 || '%'
            OR device_name LIKE '%' || $1 || '%'
            OR unit LIKE '%' || $1 || '%'"
            );

            if filter_num.is_ok() {
                query = format!(
                    "{query} OR id LIKE $1
                OR register_address LIKE $1 )"
                );
            } else {
                query = format!("{query} )");
            }
            format!("{query} AND status NOT LIKE 'DELETED'", query = query)
        }
        None => base_query,
    }
}

pub async fn list_modbus_register_items(
    conn: &Pool<Sqlite>,
    pagination: ModbusRegisterPagination,
) -> Result<ModbusRegisterResponse> {
    let base_sql_query = "SELECT * FROM modbus_register".to_string();
    let base_count_query = "SELECT COUNT(*) FROM modbus_register".to_string();

    let sql_query = generate_filter_query(pagination.filter.clone(), base_sql_query);
    let count_query = generate_filter_query(pagination.filter.clone(), base_count_query);

    let order_by = pagination
        .order_by
        .as_ref()
        .unwrap_or(&ModbusRegisterColumns::Id);
    let order_dir = pagination
        .order_dir
        .as_ref()
        .unwrap_or(&OrderByDirection::Desc);

    let sql_query = format!(
        "{} ORDER BY {} {} LIMIT $2 OFFSET $3",
        sql_query, order_by, order_dir
    );

    let count = sqlx::query_scalar::<_, i64>(&count_query)
        .bind(&pagination.filter.clone().unwrap_or("".to_string()))
        .fetch_one(conn)
        .await
        .map_err(|error| Error::DbError(error.to_string()))?;

    let results = sqlx::query_as::<_, ModbusRegister>(&sql_query)
        .bind(&pagination.filter.clone().unwrap_or("".to_string()))
        .bind(&pagination.limit.clone().unwrap_or(100))
        .bind(&pagination.offset.clone().unwrap_or(0))
        .fetch_all(conn)
        .await;

    match results {
        Ok(items) => Ok(ModbusRegisterResponse { data: items, count }),
        Err(error) => Err(Error::DbError(error.to_string())),
    }
}

pub async fn create_modbus_register_item(
    conn: &Pool<Sqlite>,
    item: CreateModbusRegisterItemInput,
) -> Result<ModbusRegister> {
    let item = sqlx::query_as::<_, ModbusRegister>(
    r#"
    INSERT INTO modbus_register (register_address, operation, register_length, register_name, data_format, description, device_name, unit)
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
  .fetch_one(conn)
  .await;

    item.map_err(|error| Error::DbError(error.to_string()))
}

pub async fn update_modbus_register_item(
    conn: &Pool<Sqlite>,
    id: i32,
    item: UpdateModbusRegisterItemInput,
) -> Result<ModbusRegister> {
    //check if the item exists
    let existing_item = sqlx::query_as::<_, ModbusRegister>(
        r#"
    SELECT * FROM modbus_register
    WHERE id = $1
    "#,
    )
    .bind(id)
    .fetch_one(conn)
    .await;

    if existing_item.is_err() {
        return Err(Error::NotFound);
    }

    let mut query = QueryBuilder::<Sqlite>::new("UPDATE modbus_register SET ");
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
    let updated_item = query.fetch_one(conn).await;
    updated_item.map_err(|error| Error::DbError(error.to_string()))
}

pub async fn delete_modbus_register_item(conn: &Pool<Sqlite>, id: i32) -> Result<ModbusRegister> {
    //check if the item exists
    let item = sqlx::query_as::<_, ModbusRegister>(
        r#"
      SELECT * FROM modbus_register
      WHERE id = $1
      AND status NOT LIKE 'DELETED'
      "#,
    )
    .bind(id)
    .fetch_one(conn)
    .await;
    if item.is_err() {
        return Err(Error::NotFound);
    }

    if item.is_ok() && item.as_ref().unwrap().status == "NEW" {
        return sqlx::query_as::<_, ModbusRegister>(
            r#"
        DELETE FROM modbus_register
        WHERE id = $1
        RETURNING *
        "#,
        )
        .bind(id)
        .fetch_one(conn)
        .await
        .map_err(|error| Error::DbError(error.to_string()));
    }
    sqlx::query_as::<_, ModbusRegister>(
        r#"
    UPDATE modbus_register SET status = 'DELETED'
    WHERE id = $1
    RETURNING *
    "#,
    )
    .bind(id)
    .fetch_one(conn)
    .await
    .map_err(|error| Error::DbError(error.to_string()))
}
