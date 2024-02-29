use axum::{
    extract::{Path, Query, State},
    middleware,
    routing::{get, patch, post},
    Json, Router,
};

use super::{
    models::{
        CreateModbusRegisterItemInput, ModbusRegister, ModbusRegisterQueryParams,
        ModbusRegisterResponse, UpdateModbusRegisterItemInput,
    },
    queries::{
        create_modbus_register_item, delete_modbus_register_item, list_modbus_register_items,
        update_modbus_register_item,
    },
    settings_queries,
};
use crate::{app_state::AppState, auth::require_auth, error::Result};

pub fn modbus_register_routes() -> Router<AppState> {
    let open_routes = Router::new()
        .route("/modbus-registers", get(list))
        .route("/modbus-register-settings", get(settings_queries::get_all))
        .route(
            "/modbus-register-settings/:name",
            get(settings_queries::get_by_name),
        );

    let protected_routes = Router::new()
        .route("/modbus-registers", post(create))
        .route("/modbus-registers/:id", patch(update).delete(delete))
        .route("/modbus-register-settings", post(settings_queries::create))
        .route(
            "/modbus-register-settings/:name",
            patch(settings_queries::update).delete(settings_queries::delete),
        )
        .route_layer(middleware::from_fn(require_auth));

    open_routes.merge(protected_routes)
}

async fn list(
    State(state): State<AppState>,
    Query(params): Query<ModbusRegisterQueryParams>,
) -> Result<Json<ModbusRegisterResponse>> {
    let res = list_modbus_register_items(&state.conn, params).await?;

    Ok(Json(res))
}

async fn create(
    State(state): State<AppState>,
    Json(payload): Json<CreateModbusRegisterItemInput>,
) -> Result<Json<ModbusRegister>> {
    let item = create_modbus_register_item(&state.conn, payload).await?;

    Ok(Json(item))
}

async fn update(
    State(state): State<AppState>,
    Path(id): Path<i32>,
    Json(payload): Json<UpdateModbusRegisterItemInput>,
) -> Result<Json<ModbusRegister>> {
    let item = update_modbus_register_item(&state.conn, id, payload).await?;

    Ok(Json(item))
}

async fn delete(
    State(state): State<AppState>,
    Path(id): Path<i32>,
) -> Result<Json<ModbusRegister>> {
    let item = delete_modbus_register_item(&state.conn, id).await?;

    Ok(Json(item))
}
