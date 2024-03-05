use axum::{
    extract::{Path, Query, State},
    Json,
};
use sea_orm::{prelude::*, Set, TryIntoModel};

use super::models::{
    CreateModbusRegisterItemInput, ModbusRegister as ModbusRegisterModel, ModbusRegisterColumns,
    ModbusRegisterQueryParams, ModbusRegisterResponse, OrderByDirection,
    UpdateModbusRegisterItemInput,
};
use crate::{
    app_state::AppState,
    entity::modbus_register::{self, Entity as ModbusRegister},
    error::{Error, Result},
};

pub fn generate_filter_query(filter: &Option<String>, base_query: String) -> String {
    let fields = [
        "register_name",
        "operation",
        "description",
        "device_name",
        "data_format",
        "unit",
    ];

    let final_query = match filter {
        Some(filter) => {
            let filter_num = filter.parse::<i32>().is_ok();
            let mut query = base_query.to_owned() + " AND ( ";
            for field in &fields {
                query += &format!("{} LIKE '%' || $1 || '%' OR ", field);
            }
            if filter_num {
                query += "id LIKE $1 OR register_address LIKE $1 )";
            } else {
                query = query.trim_end_matches(" OR ").to_owned() + " )";
            }
            query
        }
        None => base_query,
    };
    final_query
}

pub async fn list(
    State(state): State<AppState>,
    Query(params): Query<ModbusRegisterQueryParams>,
) -> Result<Json<ModbusRegisterResponse>> {
    let base_sql_query = "SELECT * FROM modbus_register".to_string();
    let base_count_query = "SELECT COUNT(*) FROM modbus_register".to_string();

    let sql_query = match params.local_only {
        Some(true) => format!("{} WHERE status IN ( 'NEW', 'UPDATED' )", base_sql_query),
        _ => format!("{} WHERE status NOT LIKE 'DELETED'", base_sql_query),
    };
    let count_query = match params.local_only {
        Some(true) => format!("{} WHERE status IN ( 'NEW', 'UPDATED' )", base_count_query),
        _ => format!("{} WHERE status NOT LIKE 'DELETED'", base_count_query),
    };
    let filter = params.filter.clone();
    let sql_query = generate_filter_query(&filter, sql_query);
    let count_query = generate_filter_query(&filter, count_query);

    let order_by = params
        .order_by
        .as_ref()
        .unwrap_or(&ModbusRegisterColumns::Id);
    let order_dir = params.order_dir.as_ref().unwrap_or(&OrderByDirection::Desc);

    let sql_query = format!(
        "{} ORDER BY {} {} LIMIT $2 OFFSET $3",
        sql_query, order_by, order_dir
    );

    let count = sqlx::query_scalar::<_, i64>(&count_query)
        .bind(&params.filter.clone().unwrap_or("".to_string()))
        .fetch_one(&state.conn)
        .await
        .map_err(|error| Error::DbError(error.to_string()))?;

    let results = sqlx::query_as::<_, ModbusRegisterModel>(&sql_query)
        .bind(&params.filter.clone().unwrap_or("".to_string()))
        .bind(&params.limit.clone().unwrap_or(100))
        .bind(&params.offset.clone().unwrap_or(0))
        .fetch_all(&state.conn)
        .await;

    match results {
        Ok(items) => Ok(Json(ModbusRegisterResponse { data: items, count })),
        Err(error) => Err(Error::DbError(error.to_string())),
    }
}

pub async fn create(
    State(state): State<AppState>,
    Json(payload): Json<CreateModbusRegisterItemInput>,
) -> Result<Json<ModbusRegisterModel>> {
    let item = sqlx::query_as::<_, ModbusRegisterModel>(
      r#"
      INSERT INTO modbus_register (register_address, operation, register_length, register_name, data_format, description, device_name, unit)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
      "#,
)
.bind(payload.register_address)
.bind(payload.operation)
.bind(payload.register_length)
.bind(payload.register_name)
.bind(payload.data_format)
.bind(payload.description)
.bind(payload.device_name)
.bind(payload.unit)
.fetch_one(&state.conn)
.await;

    item.map(|item| Json(item))
        .map_err(|error| Error::DbError(error.to_string()))
}

pub async fn update(
    State(state): State<AppState>,
    Path(id): Path<i32>,
    Json(payload): Json<UpdateModbusRegisterItemInput>,
) -> Result<Json<modbus_register::Model>> {
    let mut model = Into::<modbus_register::ActiveModel>::into(
        ModbusRegister::find_by_id(id)
            .one(&state.sea_orm_conn)
            .await
            .map_err(|error| Error::DbError(error.to_string()))
            .unwrap()
            .ok_or(Error::NotFound)
            .unwrap(),
    );

    if let Some(operation) = payload.operation {
        model.operation = Set(operation);
    }
    if let Some(register_length) = payload.register_length {
        model.register_length = Set(register_length);
    }
    if let Some(register_name) = payload.register_name {
        model.register_name = Set(register_name);
    }
    if let Some(data_format) = payload.data_format {
        model.data_format = Set(data_format);
    }
    if let Some(description) = payload.description {
        model.description = Set(description);
    }
    if let Some(device_name) = payload.device_name {
        model.device_name = Set(device_name);
    }
    if let Some(unit) = payload.unit {
        model.unit = Set(unit);
    }

    let updated_item = model
        .save(&state.sea_orm_conn)
        .await
        .map_err(|error| Error::DbError(error.to_string()))?;

    Ok(Json(updated_item.try_into_model().unwrap()))
}

pub async fn delete(
    State(state): State<AppState>,
    Path(id): Path<i32>,
) -> Result<Json<ModbusRegisterModel>> {
    let item = sqlx::query_as::<_, ModbusRegisterModel>(
        r#"
        SELECT * FROM modbus_register
        WHERE id = $1
        AND status NOT LIKE 'DELETED'
        "#,
    )
    .bind(id)
    .fetch_one(&state.conn)
    .await;
    if item.is_err() {
        return Err(Error::NotFound);
    }

    if item.is_ok() && item.as_ref().unwrap().status == "NEW" {
        return sqlx::query_as::<_, ModbusRegisterModel>(
            r#"
            DELETE FROM modbus_register
            WHERE id = $1
            RETURNING *
            "#,
        )
        .bind(id)
        .fetch_one(&state.conn)
        .await
        .map(|item| Json(item)) // Wrap ModbusRegisterModel in Json
        .map_err(|error| Error::DbError(error.to_string()));
    }
    sqlx::query_as::<_, ModbusRegisterModel>(
        r#"
        UPDATE modbus_register SET status = 'DELETED'
        WHERE id = $1
        RETURNING *
        "#,
    )
    .bind(id)
    .fetch_one(&state.conn)
    .await
    .map(|item| Json(item)) // Wrap ModbusRegister in Json
    .map_err(|error| Error::DbError(error.to_string()))
}
