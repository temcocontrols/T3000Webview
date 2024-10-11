use axum::extract::Path;
use axum::extract::State;
use axum::Json;
use sea_orm::entity::prelude::*;
use sea_orm::Set;
use sea_orm::TryIntoModel;

use crate::app_state::AppState;
use crate::entity::modbus_register_product_device_mapping as device_mappings;
use crate::entity::prelude::*;
use crate::error::{Error, Result};

use super::inputs::CreateDeviceNameIdMappingInput;

pub async fn get_all(State(state): State<AppState>) -> Result<Json<Vec<device_mappings::Model>>> {
    let conn = state.conn.lock().await;
    let results = ModbusRegisterProductDeviceMapping::find().all(&*conn).await;
    match results {
        Ok(items) => Ok(Json(items)),
        Err(error) => Err(Error::DbError(error.to_string())),
    }
}

pub async fn get_by_id(
    State(state): State<AppState>,
    Path(id): Path<i32>,
) -> Result<Json<device_mappings::Model>> {
    let conn = state.conn.lock().await;
    let result = ModbusRegisterProductDeviceMapping::find_by_id(id)
        .one(&*conn)
        .await
        .map_err(|error| Error::DbError(error.to_string()))
        .unwrap();
    match result {
        Some(item) => Ok(Json(item)),
        None => Err(Error::NotFound),
    }
}

pub async fn create(
    State(state): State<AppState>,
    Json(payload): Json<CreateDeviceNameIdMappingInput>,
) -> Result<Json<device_mappings::Model>> {
    let conn = state.conn.lock().await;
    let model = device_mappings::ActiveModel {
        product_id: Set(payload.product_id),
        device_id: Set(payload.device_id),
    };

    let res = ModbusRegisterProductDeviceMapping::insert(model.clone())
        .exec_with_returning(&*conn)
        .await
        .map_err(|error| Error::DbError(error.to_string()))?;

    Ok(Json(res.try_into_model().unwrap()))
}

pub async fn delete(
    State(state): State<AppState>,
    Path(id): Path<i32>,
) -> Result<Json<device_mappings::Model>> {
    let conn = state.conn.lock().await;
    let setting = ModbusRegisterProductDeviceMapping::find_by_id(id)
        .one(&*conn)
        .await
        .map_err(|error| Error::DbError(error.to_string()))?
        .ok_or(Error::NotFound)
        .map(Into::into)?;

    ModbusRegisterProductDeviceMapping::delete_by_id(id)
        .exec(&*conn)
        .await
        .map_err(|error| Error::DbError(error.to_string()))?;

    Ok(Json(setting))
}
