use axum::extract::Path;
use axum::extract::State;
use axum::Json;
use sea_orm::entity::prelude::*;
use sea_orm::ActiveValue::NotSet;
use sea_orm::Set;

use crate::app_state::AppState;
use crate::entity::modbus_register_settings as settings;
use crate::entity::prelude::*;
use crate::error::{Error, Result};

use super::inputs::UpdateSettingInput;

pub async fn get_all(State(state): State<AppState>) -> Result<Json<Vec<settings::Model>>> {
    let conn = state.conn.lock().await;
    let results = ModbusRegisterSettings::find().all(&*conn).await;
    match results {
        Ok(items) => Ok(Json(items)),
        Err(error) => Err(Error::DbError(error.to_string())),
    }
}

pub async fn get_by_name(
    State(state): State<AppState>,
    Path(name): Path<String>,
) -> Result<Json<settings::Model>> {
    let conn = state.conn.lock().await;
    let result = ModbusRegisterSettings::find_by_id(name)
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
    Json(item): Json<settings::Model>,
) -> Result<Json<settings::Model>> {
    let conn = state.conn.lock().await;
    let result = ModbusRegisterSettings::insert(settings::ActiveModel::from(item))
        .exec_with_returning(&*conn)
        .await
        .map_err(|error| Error::DbError(error.to_string()))?;

    Ok(Json(result))
}

pub async fn update(
    State(state): State<AppState>,
    Path(name): Path<String>,
    Json(item): Json<UpdateSettingInput>,
) -> Result<Json<settings::Model>> {
    let conn = state.conn.lock().await;
    let setting: settings::ActiveModel = ModbusRegisterSettings::find_by_id(name)
        .one(&*conn)
        .await
        .map_err(|error| Error::DbError(error.to_string()))?
        .ok_or(Error::NotFound)
        .map(Into::into)?;

    let result = settings::ActiveModel {
        name: setting.name,
        value: match item.value {
            Some(value) => Set(value),
            None => NotSet,
        },
        json_value: match item.json_value {
            Some(json_value) => Set(json_value),
            None => NotSet,
        },
    }
    .update(&*conn)
    .await
    .map_err(|error| Error::DbError(error.to_string()))
    .unwrap();

    Ok(Json(result))
}

pub async fn delete(
    State(state): State<AppState>,
    Path(name): Path<String>,
) -> Result<Json<settings::Model>> {
    let conn = state.conn.lock().await;
    let setting = ModbusRegisterSettings::find_by_id(&name)
        .one(&*conn)
        .await
        .map_err(|error| Error::DbError(error.to_string()))?
        .ok_or(Error::NotFound)
        .map(Into::into)?;

    ModbusRegisterSettings::delete_by_id(&name)
        .exec(&*conn)
        .await
        .map_err(|error| Error::DbError(error.to_string()))?;

    Ok(Json(setting))
}
