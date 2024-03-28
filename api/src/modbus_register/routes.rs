use axum::{
    middleware,
    routing::{get, patch, post},
    Router,
};

use super::{queries, settings_queries};
use crate::{app_state::AppState, auth::require_auth};

pub fn modbus_register_routes() -> Router<AppState> {
    let open_routes = Router::new()
        .route("/modbus-registers", get(queries::list))
        .route("/modbus-registers/:id", get(queries::get_one))
        .route("/modbus-register-settings", get(settings_queries::get_all))
        .route(
            "/modbus-register-settings/:name",
            get(settings_queries::get_by_name),
        );

    let protected_routes = Router::new()
        .route("/modbus-registers", post(queries::create))
        .route(
            "/modbus-registers/:id",
            patch(queries::update).delete(queries::delete),
        )
        .route("/modbus-register-settings", post(settings_queries::create))
        .route(
            "/modbus-register-settings/:name",
            patch(settings_queries::update).delete(settings_queries::delete),
        )
        .route_layer(middleware::from_fn(require_auth));

    open_routes.merge(protected_routes)
}
