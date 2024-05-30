use axum::{
    middleware,
    routing::{delete, get, patch, post},
    Router,
};

// Import the route handler modules
use super::{devices, product_device_mappings, queries, settings};
use crate::{app_state::AppState, auth::require_auth};

/// Configures the routes for Modbus register-related endpoints.
/// Returns a `Router` with all the defined routes.
pub fn modbus_register_routes() -> Router<AppState> {
    // Define open routes that do not require authentication
    let open_routes = Router::new()
        .route("/modbus-registers", get(queries::list)) // List all Modbus registers
        .route("/modbus-registers/:id", get(queries::get_one)) // Get a single Modbus register by ID
        .route("/modbus-register/settings", get(settings::get_all)) // Get all settings
        .route(
            "/modbus-register/settings/:name",
            get(settings::get_by_name),
        ) // Get settings by name
        .route("/modbus-register/devices", get(devices::get_all)) // Get all devices
        .route("/modbus-register/devices/:id", get(devices::get_by_id)) // Get a device by ID
        .route(
            "/modbus-register/devices/remote_id/:id",
            get(devices::get_by_remote_id),
        ) // Get a device by its remote ID
        .route(
            "/modbus-register/product_device_mappings",
            get(product_device_mappings::get_all),
        ) // Get all product-device mappings
        .route(
            "/modbus-register/product_device_mappings/:id",
            get(product_device_mappings::get_by_id),
        ); // Get a product-device mapping by ID

    // Define protected routes that require authentication
    let protected_routes = Router::new()
        .route("/modbus-registers", post(queries::create)) // Create a new Modbus register
        .route("/modbus-registers/create_many", post(queries::create_many)) // Create many Modbus registers
        .route(
            "/modbus-registers/:id",
            patch(queries::update).delete(queries::delete),
        ) // Update or delete a Modbus register by ID
        .route("/modbus-register/settings", post(settings::create)) // Create new settings
        .route(
            "/modbus-register/settings/:name",
            patch(settings::update).delete(settings::delete),
        ) // Update or delete settings by name
        .route("/modbus-register/devices", post(devices::create)) // Create a new device
        .route(
            "/modbus-register/devices/:id",
            patch(devices::update).delete(devices::delete),
        ) // Update or delete a device by ID
        .route(
            "/modbus-register/product_device_mappings",
            post(product_device_mappings::create),
        ) // Create a new product-device mapping
        .route(
            "/modbus-register/product_device_mappings/:id",
            delete(product_device_mappings::delete),
        ) // Delete a product-device mapping by ID
        .route_layer(middleware::from_fn(require_auth)); // Apply authentication middleware to all protected routes

    // Combine open and protected routes into a single router
    open_routes.merge(protected_routes)
}
