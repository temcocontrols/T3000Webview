use axum::{
    middleware,
    routing::{delete, get, patch, post},
    Router,
};

use super::{device_name_id_mappings, devices, queries, settings};
use crate::{app_state::AppState, auth::require_auth};

pub fn modbus_register_routes() -> Router<AppState> {
    let open_routes = Router::new()
        .route("/modbus-registers", get(queries::list))
        .route("/modbus-registers/:id", get(queries::get_one))
        .route("/modbus-register/settings", get(settings::get_all))
        .route(
            "/modbus-register/settings/:name",
            get(settings::get_by_name),
        )
        .route("/modbus-register/devices", get(devices::get_all))
        .route("/modbus-register/devices/:name", get(devices::get_by_name))
        .route(
            "/modbus-register/device_id_name_mappings",
            get(device_name_id_mappings::get_all),
        )
        .route(
            "/modbus-register/device_id_name_mappings/:id",
            get(device_name_id_mappings::get_by_id),
        );

    let protected_routes = Router::new()
        .route("/modbus-registers", post(queries::create))
        .route(
            "/modbus-registers/:id",
            patch(queries::update).delete(queries::delete),
        )
        .route("/modbus-register/settings", post(settings::create))
        .route(
            "/modbus-register/settings/:name",
            patch(settings::update).delete(settings::delete),
        )
        .route("/modbus-register/devices", post(devices::create))
        .route(
            "/modbus-register/devices/:name",
            patch(devices::update).delete(devices::delete),
        )
        .route(
            "/modbus-register/device_id_name_mappings",
            post(device_name_id_mappings::create),
        )
        .route(
            "/modbus-register/device_id_name_mappings/:id",
            delete(device_name_id_mappings::delete),
        )
        .route_layer(middleware::from_fn(require_auth));

    open_routes.merge(protected_routes)
}
