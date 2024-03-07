use axum::{
    extract::{Path, Query, State},
    Json,
};
use sea_orm::{prelude::*, sea_query::IntoCondition, QueryOrder, QuerySelect, Set, TryIntoModel};

use super::models::{
    CreateModbusRegisterItemInput, ModbusRegisterColumns, ModbusRegisterQueryParams,
    ModbusRegisterResponse, OrderByDirection, UpdateModbusRegisterItemInput,
};
use crate::{
    app_state::AppState,
    entity::modbus_register::{self, Entity as ModbusRegister},
    error::{Error, Result},
};

pub fn generate_filter_query(filter: &Option<String>, local_only: bool) -> Select<ModbusRegister> {
    let mut query = ModbusRegister::find();

    if let Some(filter) = filter {
        let fields = vec![
            modbus_register::Column::RegisterName,
            modbus_register::Column::Operation,
            modbus_register::Column::Description,
            modbus_register::Column::DeviceName,
            modbus_register::Column::DataFormat,
            modbus_register::Column::Unit,
        ];
        let like_expr = format!("%{}%", filter);
        let mut or_filters = vec![];
        for field in fields {
            or_filters.push(field.like(like_expr.clone()));
        }
        if let Ok(filter_num) = filter.parse::<i32>() {
            query = query.filter(
                modbus_register::Column::RegisterLength
                    .eq(filter_num)
                    .or(modbus_register::Column::RegisterAddress.eq(filter_num))
                    .or(modbus_register::Column::Id.eq(filter_num))
                    .or(or_filters
                        .drain(..)
                        .reduce(|l, r| l.or(r))
                        .map(|c| c)
                        .unwrap()),
            );
        } else {
            query = query.filter(
                or_filters
                    .drain(..)
                    .reduce(|l, r| l.or(r))
                    .map(|c| c.into_condition())
                    .unwrap(),
            );
        }
    }

    query = query.filter(modbus_register::Column::Status.not_like("DELETED"));
    if local_only {
        query = query.filter(modbus_register::Column::Status.is_in(vec!["NEW", "UPDATED"]));
    }

    query
}

pub async fn list(
    State(state): State<AppState>,
    Query(params): Query<ModbusRegisterQueryParams>,
) -> Result<Json<ModbusRegisterResponse>> {
    let mut query = generate_filter_query(&params.filter, params.local_only.unwrap_or(false));

    query = query.order_by(
        Into::<modbus_register::Column>::into(params.order_by.unwrap_or(ModbusRegisterColumns::Id)),
        params.order_dir.unwrap_or(OrderByDirection::Desc).into(),
    );
    query = query
        .limit(params.limit.unwrap_or(100))
        .offset(params.offset.unwrap_or(0));

    let count = query
        .clone()
        .count(&state.conn)
        .await
        .map_err(|error| Error::DbError(error.to_string()))?;
    let items = query
        .all(&state.conn)
        .await
        .map_err(|error| Error::DbError(error.to_string()))?;

    Ok(Json(ModbusRegisterResponse { data: items, count }))
}

pub async fn create(
    State(state): State<AppState>,
    Json(payload): Json<CreateModbusRegisterItemInput>,
) -> Result<Json<modbus_register::Model>> {
    let model = modbus_register::ActiveModel {
        register_address: Set(payload.register_address),
        operation: Set(payload.operation),
        register_length: Set(payload.register_length),
        register_name: Set(payload.register_name),
        data_format: Set(payload.data_format),
        description: Set(payload.description),
        device_name: Set(payload.device_name),
        unit: Set(payload.unit),
        ..Default::default()
    };

    let res = model
        .save(&state.conn)
        .await
        .map_err(|error| Error::DbError(error.to_string()))?;

    Ok(Json(res.try_into_model().unwrap()))
}

pub async fn update(
    State(state): State<AppState>,
    Path(id): Path<i32>,
    Json(payload): Json<UpdateModbusRegisterItemInput>,
) -> Result<Json<modbus_register::Model>> {
    let mut model = Into::<modbus_register::ActiveModel>::into(
        ModbusRegister::find_by_id(id)
            .one(&state.conn)
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
        .save(&state.conn)
        .await
        .map_err(|error| Error::DbError(error.to_string()))?;

    Ok(Json(updated_item.try_into_model().unwrap()))
}

pub async fn delete(
    State(state): State<AppState>,
    Path(id): Path<i32>,
) -> Result<Json<modbus_register::Model>> {
    let item = ModbusRegister::find_by_id(id).one(&state.conn).await;

    match item {
        Ok(Some(mut item)) => {
            if item.status == "NEW" {
                ModbusRegister::delete_by_id(id)
                    .exec(&state.conn)
                    .await
                    .map_err(|error| Error::DbError(error.to_string()))?;
                Ok(Json(item))
            } else {
                item.status = "DELETED".to_string();
                let updated_item = modbus_register::ActiveModel::from(item)
                    .save(&state.conn)
                    .await
                    .map_err(|error| Error::DbError(error.to_string()))?;
                Ok(Json(updated_item.try_into_model().unwrap()))
            }
        }
        Ok(None) => Err(Error::NotFound),
        Err(error) => Err(Error::DbError(error.to_string())),
    }
}
