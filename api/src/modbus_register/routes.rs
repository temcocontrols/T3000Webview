use axum::{
    extract::{Path, Query, State},
    routing::{get, patch},
    Json, Router,
};
use sqlx::{Pool, Sqlite};

use super::{
    models::{
        CreateModbusRegisterItemInput, ModbusRegister, ModbusRegisterPagination,
        ModbusRegisterResponse, UpdateModbusRegisterItemInput,
    },
    queries::{
        create_modbus_register_item, delete_modbus_register_item, list_modbus_register_items,
        update_modbus_register_item,
    },
};
use crate::error::Result;

pub fn modbus_register_routes() -> Router<Pool<Sqlite>> {
    Router::new()
        .route("/modbus-registers", get(list).post(create))
        .route("/modbus-registers/:id", patch(update).delete(delete))
}

async fn list(
    State(conn): State<Pool<Sqlite>>,
    Query(pagination): Query<ModbusRegisterPagination>,
) -> Result<Json<ModbusRegisterResponse>> {
    let res = list_modbus_register_items(&conn, pagination).await?;

    Ok(Json(res))
}

async fn create(
    State(conn): State<Pool<Sqlite>>,
    Json(payload): Json<CreateModbusRegisterItemInput>,
) -> Result<Json<ModbusRegister>> {
    let item = create_modbus_register_item(&conn, payload).await?;

    Ok(Json(item))
}

async fn update(
    State(conn): State<Pool<Sqlite>>,
    Path(id): Path<i32>,
    Json(payload): Json<UpdateModbusRegisterItemInput>,
) -> Result<Json<ModbusRegister>> {
    let item = update_modbus_register_item(&conn, id, payload).await?;

    Ok(Json(item))
}

async fn delete(
    State(conn): State<Pool<Sqlite>>,
    Path(id): Path<i32>,
) -> Result<Json<ModbusRegister>> {
    let item = delete_modbus_register_item(&conn, id).await?;

    Ok(Json(item))
}