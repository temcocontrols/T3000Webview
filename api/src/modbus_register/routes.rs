use axum::{
    middleware,
    routing::{delete, get, patch, post},
    Router,
};

use super::{devices, product_device_mappings, queries, settings};
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
        .route("/modbus-register/devices/:id", get(devices::get_by_id))
        .route(
            "/modbus-register/devices/remote_id/:id",
            get(devices::get_by_remote_id),
        )
        .route(
            "/modbus-register/device_id_name_mappings",
            get(product_device_mappings::get_all),
        )
        .route(
            "/modbus-register/device_id_name_mappings/:id",
            get(product_device_mappings::get_by_id),
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
            "/modbus-register/devices/:id",
            patch(devices::update).delete(devices::delete),
        )
        .route(
            "/modbus-register/device_id_name_mappings",
            post(product_device_mappings::create),
        )
        .route(
            "/modbus-register/device_id_name_mappings/:id",
            delete(product_device_mappings::delete),
        )
        .route_layer(middleware::from_fn(require_auth));

    open_routes.merge(protected_routes)
}
