use axum::{
    extract::{Path, Query, State},
    Json,
};
use sea_orm::{prelude::*, sea_query::IntoCondition, QueryOrder, QuerySelect, Set, TryIntoModel};

use super::inputs::{
    CreateModbusRegisterItemInput, ModbusRegisterColumns, ModbusRegisterQueryParams,
    ModbusRegisterResponse, OrderByDirection, UpdateModbusRegisterItemInput,
};
use crate::{
    app_state::AppState,
    entity::modbus_register::{self, Entity as ModbusRegister},
    error::{Error, Result},
};

pub fn generate_filter_query(
    filter: &Option<String>,
    device_name: &Option<String>,
    local_only: bool,
) -> Select<ModbusRegister> {
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
    query = query.filter(modbus_register::Column::Status.not_like("REJECTED"));
    query = query.filter(modbus_register::Column::Status.not_like("APPROVED"));

    if device_name.is_some() {
        query = query.filter(modbus_register::Column::DeviceName.eq(device_name.clone().unwrap()));
    }
    if local_only {
        query = query.filter(modbus_register::Column::Status.is_in(vec!["NEW", "UPDATED"]));
    }

    query
}

pub async fn list(
    State(state): State<AppState>,
    Query(params): Query<ModbusRegisterQueryParams>,
) -> Result<Json<ModbusRegisterResponse>> {
    let mut query = generate_filter_query(
        &params.filter,
        &params.device_name,
        params.local_only.unwrap_or(false),
    );

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

pub async fn get_one(
    State(state): State<AppState>,
    Path(id): Path<i32>,
) -> Result<Json<Option<modbus_register::Model>>> {
    let item = ModbusRegister::find_by_id(id)
        .one(&state.conn)
        .await
        .map_err(|error| Error::DbError(error.to_string()))?;

    Ok(Json(item))
}

pub async fn create(
    State(state): State<AppState>,
    Json(payload): Json<CreateModbusRegisterItemInput>,
) -> Result<Json<modbus_register::Model>> {
    let mut model = modbus_register::ActiveModel {
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

    if payload.id.is_some() {
        model.id = Set(payload.id.unwrap());
    }

    if payload.status.is_some() {
        model.status = Set(payload.status.unwrap());
    }
    if payload.private.is_some() {
        model.private = Set(payload.private);
    }

    if payload.created_at.is_some() {
        model.created_at = Set(payload.created_at.unwrap());
    }

    if payload.updated_at.is_some() {
        model.updated_at = Set(payload.updated_at.unwrap());
    }

    let res = ModbusRegister::insert(model.clone())
        .exec_with_returning(&state.conn)
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

    if None == payload.status
        && model.private.clone().unwrap().is_none()
        && (model.status.clone().unwrap() == "PUBLISHED".to_string()
            || model.status.clone().unwrap() == "UNDER_REVIEW".to_string()
            || model.status.clone().unwrap() == "REVISION".to_string())
    {
        model.status = Set("UPDATED".to_string());
    }

    if let Some(operation) = payload.operation {
        model.operation = Set(operation);
    }
    if let Some(register_length) = payload.register_length {
        model.register_length = Set(register_length);
    }
    if let Some(register_name) = payload.register_name {
        model.register_name = Set(register_name);
    }
    if let Some(register_address) = payload.register_address {
        model.register_address = Set(Some(register_address));
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
    if let Some(status) = payload.status {
        model.status = Set(status);
    }
    if let Some(unit) = payload.unit {
        model.unit = Set(unit);
    }

    if let Some(private) = payload.private {
        model.private = Set(private);
    }

    let updated_item = model
        .save(&state.conn)
        .await
        .map_err(|error| Error::DbError(error.to_string()))?;

    Ok(Json(updated_item.try_into_model().unwrap()))
}

pub async fn delete(State(state): State<AppState>, Path(id): Path<i32>) -> Result<Json<String>> {
    let item = ModbusRegister::find_by_id(id).one(&state.conn).await;

    match item {
        Ok(Some(item)) => {
            if item.status == "NEW" {
                ModbusRegister::delete_by_id(id)
                    .exec(&state.conn)
                    .await
                    .map_err(|error| Error::DbError(error.to_string()))?;
                Ok(Json("Deleted successfully".to_string()))
            } else {
                let mut updated_item = modbus_register::ActiveModel::from(item);
                updated_item.status = Set("DELETED".to_string());
                updated_item
                    .save(&state.conn)
                    .await
                    .map_err(|error| Error::DbError(error.to_string()))?;
                Ok(Json("Deleted successfully".to_string()))
            }
        }
        Ok(None) => Err(Error::NotFound),
        Err(error) => Err(Error::DbError(error.to_string())),
    }
}
