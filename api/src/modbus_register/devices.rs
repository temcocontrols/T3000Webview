use axum::extract::Path;
use axum::extract::State;
use axum::Json;
use sea_orm::entity::prelude::*;
use sea_orm::Set;
use sea_orm::TryIntoModel;

use crate::app_state::AppState;
use crate::entity::modbus_register_devices as devices;
use crate::entity::prelude::*;
use crate::error::{Error, Result};

use super::inputs::CreateDeviceInput;
use super::inputs::UpdateDeviceInput;

pub async fn get_all(State(state): State<AppState>) -> Result<Json<Vec<devices::Model>>> {
    let results = ModbusRegisterDevices::find().all(&state.conn).await;
    match results {
        Ok(items) => Ok(Json(items)),
        Err(error) => Err(Error::DbError(error.to_string())),
    }
}

pub async fn get_by_name(
    State(state): State<AppState>,
    Path(name): Path<String>,
) -> Result<Json<devices::Model>> {
    let result = ModbusRegisterDevices::find_by_id(name)
        .one(&state.conn)
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
    Json(payload): Json<CreateDeviceInput>,
) -> Result<Json<devices::Model>> {
    let mut model = devices::ActiveModel {
        name: Set(payload.name),
        description: Set(payload.description),
        ..Default::default()
    };

    if payload.status.is_some() {
        model.status = Set(payload.status.unwrap());
    }

    if payload.private.is_some() {
        model.private = Set(payload.private.unwrap());
    }

    let res = ModbusRegisterDevices::insert(model.clone())
        .exec_with_returning(&state.conn)
        .await
        .map_err(|error| Error::DbError(error.to_string()))?;

    Ok(Json(res.try_into_model().unwrap()))
}

pub async fn update(
    State(state): State<AppState>,
    Path(name): Path<String>,
    Json(payload): Json<UpdateDeviceInput>,
) -> Result<Json<devices::Model>> {
    let mut model = Into::<devices::ActiveModel>::into(
        ModbusRegisterDevices::find_by_id(name)
            .one(&state.conn)
            .await
            .map_err(|error| Error::DbError(error.to_string()))
            .unwrap()
            .ok_or(Error::NotFound)?,
    );

    if None == payload.status
        && model.private.clone().unwrap() == false
        && (model.status.clone().unwrap() == "PUBLISHED".to_string()
            || model.status.clone().unwrap() == "UNDER_REVIEW".to_string()
            || model.status.clone().unwrap() == "REVISION".to_string())
    {
        model.status = Set("UPDATED".to_string());
    }

    // if let Some(name) = payload.name {
    //     model.name = Set(name);
    // }

    if let Some(description) = payload.description {
        model.description = Set(description);
    }

    if let Some(status) = payload.status {
        model.status = Set(status);
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

pub async fn delete(
    State(state): State<AppState>,
    Path(name): Path<String>,
) -> Result<Json<devices::Model>> {
    let setting = ModbusRegisterDevices::find_by_id(&name)
        .one(&state.conn)
        .await
        .map_err(|error| Error::DbError(error.to_string()))?
        .ok_or(Error::NotFound)
        .map(Into::into)?;

    ModbusRegisterDevices::delete_by_id(&name)
        .exec(&state.conn)
        .await
        .map_err(|error| Error::DbError(error.to_string()))?;

    Ok(Json(setting))
}
