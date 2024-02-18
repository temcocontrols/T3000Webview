use std::env;

use axum::{
    body::Body,
    extract::{Path, Query, State},
    http::{self, Request},
    middleware::{self, Next},
    response::Response,
    routing::{get, patch, post},
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
use crate::error::{Error, Result};

pub fn modbus_register_routes() -> Router<Pool<Sqlite>> {
    let open_routes = Router::new().route("/modbus-registers", get(list));

    let protected_routes = Router::new()
        .route("/modbus-registers", post(create))
        .route("/modbus-registers/:id", patch(update).delete(delete))
        .route_layer(middleware::from_fn(require_auth));

    open_routes.merge(protected_routes)
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

pub async fn require_auth(req: Request<Body>, next: Next) -> Result<Response> {
    let auth_header = req
        .headers()
        .get(http::header::AUTHORIZATION)
        .and_then(|header| header.to_str().ok())
        .unwrap_or("");
    let secret = env::var("API_SECRET_KEY").expect("API_SECRET_KEY is not set");
    if auth_header != secret {
        return Err(Error::Unauthorized);
    }

    Ok(next.run(req).await)
}
