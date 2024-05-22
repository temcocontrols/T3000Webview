use axum::{
    extract::{Path, Query, State},
    Json,
};
use sea_orm::{
    prelude::*, sea_query::IntoCondition, QueryOrder, QuerySelect, SelectTwo, Set, TryIntoModel,
};
use serde_json::json;

use super::inputs::{
    CreateModbusRegisterItemInput, ModbusRegisterColumns, ModbusRegisterModel,
    ModbusRegisterQueryParams, ModbusRegisterResponse, OrderByDirection,
    UpdateModbusRegisterItemInput,
};
use crate::{
    app_state::AppState,
    entity::modbus_register::{self, Entity as ModbusRegister},
    entity::modbus_register_devices::Entity as ModbusRegisterDevices,
    error::{Error, Result},
};

pub fn generate_filter_query(
    filter: &Option<String>,
    device_id: &Option<i32>,
    local_only: bool,
) -> SelectTwo<ModbusRegister, ModbusRegisterDevices> {
    let mut query = ModbusRegister::find().find_also_related(ModbusRegisterDevices);

    if let Some(filter) = filter {
        let fields = vec![
            modbus_register::Column::RegisterName,
            modbus_register::Column::Operation,
            modbus_register::Column::Description,
            modbus_register::Column::DeviceId,
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

    query = query.filter(modbus_register::Column::Status.not_like("REJECTED"));
    query = query.filter(modbus_register::Column::Status.not_like("APPROVED"));

    if device_id.is_some() {
        query = query.filter(modbus_register::Column::DeviceId.eq(device_id.clone().unwrap()));
    }
    if local_only {
        query =
            query.filter(modbus_register::Column::Status.is_in(vec!["NEW", "UPDATED", "DELETED"]));
    } else {
        query = query.filter(modbus_register::Column::Status.not_like("DELETED"));
    }

    query
}

pub async fn list(
    State(state): State<AppState>,
    Query(params): Query<ModbusRegisterQueryParams>,
) -> Result<Json<ModbusRegisterResponse>> {
    let mut query = generate_filter_query(
        &params.filter,
        &params.device_id,
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

    let items = items
        .iter()
        .map(|item| ModbusRegisterModel {
            id: item.0.id,
            register_address: item.0.register_address,
            operation: item.0.operation.clone(),
            register_length: item.0.register_length,
            register_name: item.0.register_name.clone(),
            data_format: item.0.data_format.clone(),
            description: item.0.description.clone(),
            device_id: item.0.device_id,
            device: item.1.clone(),
            status: item.0.status.clone(),
            unit: item.0.unit.clone(),
            private: item.0.private,
            created_at: item.0.created_at.clone(),
            updated_at: item.0.updated_at.clone(),
        })
        .collect();

    Ok(Json(ModbusRegisterResponse { data: items, count }))
}

pub async fn get_one(
    State(state): State<AppState>,
    Path(id): Path<i32>,
) -> Result<Json<Option<ModbusRegisterModel>>> {
    let item = ModbusRegister::find_by_id(id)
        .find_also_related(ModbusRegisterDevices)
        .one(&state.conn)
        .await
        .map_err(|error| Error::DbError(error.to_string()))?;

    let item = item.map(|item| ModbusRegisterModel {
        id: item.0.id,
        register_address: item.0.register_address,
        operation: item.0.operation.clone(),
        register_length: item.0.register_length,
        register_name: item.0.register_name.clone(),
        data_format: item.0.data_format.clone(),
        description: item.0.description.clone(),
        device_id: item.0.device_id,
        device: item.1.clone(),
        status: item.0.status.clone(),
        unit: item.0.unit.clone(),
        private: item.0.private,
        created_at: item.0.created_at.clone(),
        updated_at: item.0.updated_at.clone(),
    });

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
        device_id: Set(payload.device_id),
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

pub async fn create_many(
    State(state): State<AppState>,
    Json(payload): Json<Vec<CreateModbusRegisterItemInput>>,
) -> Result<Json<serde_json::Value>> {
    let mut models = Vec::new();
    for item in payload {
        let mut model = modbus_register::ActiveModel {
            register_address: Set(item.register_address),
            operation: Set(item.operation),
            register_length: Set(item.register_length),
            register_name: Set(item.register_name),
            data_format: Set(item.data_format),
            description: Set(item.description),
            device_id: Set(item.device_id),
            unit: Set(item.unit),
            ..Default::default()
        };

        if item.id.is_some() {
            model.id = Set(item.id.unwrap());
        }

        if item.status.is_some() {
            model.status = Set(item.status.unwrap());
        }
        if item.private.is_some() {
            model.private = Set(item.private);
        }

        if item.created_at.is_some() {
            model.created_at = Set(item.created_at.unwrap());
        }

        if item.updated_at.is_some() {
            model.updated_at = Set(item.updated_at.unwrap());
        }

        models.push(model);
    }
    let count = models.len();

    ModbusRegister::insert_many(models)
        .exec(&state.conn)
        .await
        .map_err(|error| Error::DbError(error.to_string()))?;

    Ok(Json(json!({"created_rows_count": count})))
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
            .ok_or(Error::NotFound)?,
    );

    if None == payload.status
        && model.private.clone().unwrap().unwrap_or(true) == false
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
    if let Some(device_id) = payload.device_id {
        model.device_id = Set(device_id);
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
            if item.status == "NEW" || item.status == "DELETED" {
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
