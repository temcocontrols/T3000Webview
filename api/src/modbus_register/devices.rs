use super::inputs::{CreateDeviceInput, ModbusRegisterDevicesQueryParams, UpdateDeviceInput};
use crate::app_state::AppState;
use crate::{
    entity::{modbus_register_devices as devices, prelude::*},
    error::{Error, Result},
};
use axum::{
    extract::{Path, Query, State},
    Json,
};
use sea_orm::{entity::prelude::*, Set, TryIntoModel};

// Fetch all modbus register devices, optionally filtering based on their status.
pub async fn get_all(
    State(state): State<AppState>,
    Query(params): Query<ModbusRegisterDevicesQueryParams>,
) -> Result<Json<Vec<serde_json::Value>>> {
    let conn = state.conn.lock().await;
    // Start building the query to fetch devices.
    let mut query = ModbusRegisterDevices::find();

    // Apply filters based on query parameters.
    if Some(true) == params.local_only {
        // Filter devices with specific statuses if local_only is true.
        query = query.filter(devices::Column::Status.is_in(vec!["NEW", "UPDATED", "DELETED"]));
    } else {
        // Exclude devices with status "DELETED" if local_only is not true.
        query = query.filter(devices::Column::Status.not_like("DELETED"));
    }

    // Execute the query and fetch related files.
    let results = query.find_also_related(Files).all(&*conn).await;

    // Process the results and return JSON response.
    match results {
        Ok(items) => Ok(Json(
            items
                .iter()
                .map(|item| {
                    let mut device: serde_json::Value =
                        serde_json::to_value(&item.0).unwrap_or_default();
                    device["image"] = serde_json::to_value(&item.1).unwrap_or_default();
                    device
                })
                .collect(),
        )),
        Err(error) => Err(Error::DbError(error.to_string())),
    }
}

// Fetch a single modbus register device by its ID, including related file data.
pub async fn get_by_id(
    State(state): State<AppState>,
    Path(id): Path<i32>,
) -> Result<Json<serde_json::Value>> {
    let conn = state.conn.lock().await;
    let result = ModbusRegisterDevices::find_by_id(id)
        .find_also_related(Files)
        .one(&*conn)
        .await
        .map_err(|error| Error::DbError(error.to_string()))
        .unwrap();

    // Process and return the result, or handle not found error.
    match result {
        Some(item) => {
            let mut device: serde_json::Value = serde_json::to_value(&item.0).unwrap_or_default();
            device["image"] = serde_json::to_value(&item.1).unwrap_or_default();
            Ok(Json(device))
        }
        None => Err(Error::NotFound),
    }
}

// Fetch a single modbus register device by its remote ID, including related file data.
pub async fn get_by_remote_id(
    State(state): State<AppState>,
    Path(id): Path<i32>,
) -> Result<Json<serde_json::Value>> {
    let conn = state.conn.lock().await;
    let result = ModbusRegisterDevices::find()
        .filter(devices::Column::RemoteId.eq(id))
        .find_also_related(Files)
        .one(&*conn)
        .await
        .map_err(|error| Error::DbError(error.to_string()))
        .unwrap();

    // Process and return the result, or handle not found error.
    match result {
        Some(item) => {
            let mut device: serde_json::Value = serde_json::to_value(&item.0).unwrap_or_default();
            device["image"] = serde_json::to_value(&item.1).unwrap_or_default();
            Ok(Json(device))
        }
        None => Err(Error::NotFound),
    }
}

// Create a new modbus register device with the provided input data.
pub async fn create(
    State(state): State<AppState>,
    Json(payload): Json<CreateDeviceInput>,
) -> Result<Json<devices::Model>> {
    let conn = state.conn.lock().await;
    // Initialize the device model with input data.
    let mut model = devices::ActiveModel {
        name: Set(payload.name),
        description: Set(payload.description),
        image_id: Set(payload.image_id),
        remote_id: Set(payload.remote_id),
        ..Default::default()
    };

    // Optionally set fields if they are provided in the input.
    if payload.id.is_some() {
        model.id = Set(payload.id.unwrap());
    }

    if payload.status.is_some() {
        model.status = Set(payload.status.unwrap());
    }

    if payload.private.is_some() {
        model.private = Set(payload.private.unwrap());
    }

    // Insert the new device into the database and return the result.
    let res = ModbusRegisterDevices::insert(model.clone())
        .exec_with_returning(&*conn)
        .await
        .map_err(|error| Error::DbError(error.to_string()))?;

    Ok(Json(res.try_into_model().unwrap()))
}

// Update an existing modbus register device by its ID with the provided input data.
pub async fn update(
    State(state): State<AppState>,
    Path(id): Path<i32>,
    Json(payload): Json<UpdateDeviceInput>,
) -> Result<Json<devices::Model>> {
    let conn = state.conn.lock().await;
    // Fetch the existing device and convert it to an active model.
    let mut model = Into::<devices::ActiveModel>::into(
        ModbusRegisterDevices::find_by_id(id)
            .one(&*conn)
            .await
            .map_err(|error| Error::DbError(error.to_string()))
            .unwrap()
            .ok_or(Error::NotFound)?,
    );

    // Update the status if necessary.
    if None == payload.status
        && model.private.clone().unwrap() == false
        && (model.status.clone().unwrap() == "PUBLISHED".to_string()
            || model.status.clone().unwrap() == "UNDER_REVIEW".to_string()
            || model.status.clone().unwrap() == "REVISION".to_string())
    {
        model.status = Set("UPDATED".to_string());
    }

    // Apply updates from the input data to the model.
    if let Some(name) = payload.name {
        model.name = Set(name);
    }

    if let Some(description) = payload.description {
        model.description = Set(description);
    }

    if let Some(status) = payload.status {
        model.status = Set(status);
    }

    if let Some(private) = payload.private {
        model.private = Set(private);
    }

    if let Some(image_id) = payload.image_id {
        model.image_id = Set(image_id);
    }
    if let Some(remote_id) = payload.remote_id {
        model.remote_id = Set(remote_id);
    }

    // Save the updated model to the database and return the result.
    let updated_item = model
        .save(&*conn)
        .await
        .map_err(|error| Error::DbError(error.to_string()))?;

    Ok(Json(updated_item.try_into_model().unwrap()))
}

// Delete a modbus register device by its ID.
pub async fn delete(State(state): State<AppState>, Path(id): Path<i32>) -> Result<Json<String>> {
    let conn = state.conn.lock().await;
    // Fetch the device to be deleted.
    let item: devices::Model = ModbusRegisterDevices::find_by_id(id)
        .one(&*conn)
        .await
        .map_err(|error| Error::DbError(error.to_string()))?
        .ok_or(Error::NotFound)
        .map(Into::into)?;

    // If the device is "NEW" or "DELETED", remove it from the database.
    if item.status == "NEW" || item.status == "DELETED" {
        ModbusRegisterDevices::delete_by_id(id)
            .exec(&*conn)
            .await
            .map_err(|error| Error::DbError(error.to_string()))?;
        Ok(Json("Deleted successfully".to_string()))
    } else {
        // Otherwise, update its status to "DELETED".
        let mut updated_item = devices::ActiveModel::from(item.clone());
        updated_item.status = Set("DELETED".to_string());
        updated_item
            .save(&*conn)
            .await
            .map_err(|error| Error::DbError(error.to_string()))?;
        Ok(Json("Deleted successfully".to_string()))
    }
}
