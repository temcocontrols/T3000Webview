use axum::{
    middleware,
    routing::{get, patch, post},
    Router,
};

use super::{queries, settings};
use crate::{app_state::AppState, auth::require_auth};

pub fn modbus_register_routes() -> Router<AppState> {
    let open_routes = Router::new()
        .route("/modbus-registers", get(queries::list))
        .route("/modbus-registers/:id", get(queries::get_one))
        .route("/modbus-register-settings", get(settings::get_all))
        .route(
            "/modbus-register-settings/:name",
            get(settings::get_by_name),
        );

    let protected_routes = Router::new()
        .route("/modbus-registers", post(queries::create))
        .route(
            "/modbus-registers/:id",
            patch(queries::update).delete(queries::delete),
        )
        .route("/modbus-register-settings", post(settings::create))
        .route(
            "/modbus-register-settings/:name",
            patch(settings::update).delete(settings::delete),
        )
        .route_layer(middleware::from_fn(require_auth));

    open_routes.merge(protected_routes)
}
