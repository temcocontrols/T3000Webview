use axum::{
    extract::State,
    middleware,
    routing::{get, patch, post},
    Json, Router,
};
use sea_orm::{entity::prelude::*, IntoActiveModel, Set, TryIntoModel};
use serde::Deserialize;

use crate::entity::user;
use crate::{auth::require_auth, entity::prelude::*};

use crate::{
    app_state::AppState,
    error::{Error, Result},
};

// Defines the routes related to user operations and applies authentication middleware.
pub fn user_routes() -> Router<AppState> {
    Router::new()
        .route("/user", get(get_user).post(save_user).delete(delete_user)) // User CRUD routes.
        .route("/login", post(login)) // Login route.
        .route("/logout", post(logout)) // Logout route.
        .route(
            "/user/update_last_modbus_register_pull",
            patch(update_user_last_modbus_register_pull), // Update user's last Modbus register pull.
        )
        .route_layer(middleware::from_fn(require_auth)) // Apply authentication middleware.
}

// Asynchronously fetches a user from the database and returns it as JSON.
pub async fn get_user(State(state): State<AppState>) -> Result<Json<Option<user::Model>>> {
    let conn = state.conn.lock().await;
    let result = User::find()
        .one(&*conn) // Use the database connection from the application state.
        .await
        .map_err(|error| Error::DbError(error.to_string()))?; // Handle any database errors.

    Ok(Json(result)) // Return the result as JSON.
}

// Asynchronously saves a user to the database and returns the saved user as JSON.
pub async fn save_user(
    State(state): State<AppState>,
    Json(item): Json<user::Model>,
) -> Result<Json<user::Model>> {
    let conn = state.conn.lock().await;
    let the_user = User::find()
        .one(&*conn) // Use the database connection from the application state.
        .await
        .map_err(|error| Error::DbError(error.to_string()))?; // Handle any database errors.

    let mut last_pull = Some("2024-05-15 00:00:00".to_string()); // Default last Modbus register pull time.

    // If the user exists, update the last pull time and delete the existing user.
    if let Some(user) = the_user {
        if user.last_modbus_register_pull.is_some() {
            last_pull = user.last_modbus_register_pull;
        }
        User::delete_by_id(user.id)
            .exec(&*conn)
            .await
            .map_err(|error| Error::DbError(error.to_string()))?;
    }

    // Create a new user with the updated last pull time.
    let mut new_user = item.clone();
    new_user.last_modbus_register_pull = last_pull;
    let result = User::insert(user::ActiveModel::from(new_user))
        .exec_with_returning(&*conn)
        .await
        .map_err(|error| Error::DbError(error.to_string()))?;

    Ok(Json(result)) // Return the saved user as JSON.
}

// Structure to deserialize the server time input from JSON.
#[derive(Deserialize)]
pub struct ServerTimeInput {
    pub time: String,
}

// Asynchronously updates the user's last Modbus register pull time and returns a confirmation message.
pub async fn update_user_last_modbus_register_pull(
    State(state): State<AppState>,
    Json(payload): Json<ServerTimeInput>,
) -> Result<Json<String>> {
    let conn = state.conn.lock().await;
    let the_user = User::find()
        .one(&*conn) // Use the database connection from the application state.
        .await
        .map_err(|error| Error::DbError(error.to_string()))?; // Handle any database errors.

    if the_user.is_none() {
        return Err(Error::NotFound); // Return a NotFound error if the user does not exist.
    }

    // Update the user's last Modbus register pull time.
    let mut the_user = the_user.unwrap().into_active_model();
    the_user.last_modbus_register_pull = Set(Some(payload.time.clone()));
    the_user
        .save(&*conn)
        .await
        .map_err(|error| Error::DbError(error.to_string()))?;

    Ok(Json("Time updated".to_string())) // Return a confirmation message.
}

// Asynchronously deletes a user from the database and returns the deleted user as JSON.
pub async fn delete_user(State(state): State<AppState>) -> Result<Json<user::Model>> {
    let conn = state.conn.lock().await;
    let the_user = User::find()
        .one(&*conn) // Use the database connection from the application state.
        .await
        .map_err(|error| Error::DbError(error.to_string()))? // Handle any database errors.
        .ok_or(Error::NotFound)?; // Return a NotFound error if the user does not exist.

    // Delete the user by their ID.
    User::delete_by_id(the_user.id)
        .exec(&*conn)
        .await
        .map_err(|error| Error::DbError(error.to_string()))?;

    Ok(Json(the_user)) // Return the deleted user as JSON.
}

// Structure to deserialize login parameters from JSON.
#[derive(Deserialize)]
pub struct LoginParams {
    url: String,
}

// Asynchronously handles user login by opening a specified URL and returns a confirmation message.
pub async fn login(Json(params): Json<LoginParams>) -> Result<Json<String>> {
    open::that(params.url).map_err(|error| Error::BadRequest(error.to_string()))?; // Handle any errors in opening the URL.

    Ok(Json("Logging in...".to_string())) // Return a confirmation message.
}

// Asynchronously handles user logout by clearing the user's token and returns the updated user as JSON.
pub async fn logout(State(state): State<AppState>) -> Result<Json<user::Model>> {
    let conn = state.conn.lock().await;
    let mut model = Into::<user::ActiveModel>::into(
        User::find()
            .one(&*conn) // Use the database connection from the application state.
            .await
            .map_err(|error| Error::DbError(error.to_string()))? // Handle any database errors.
            .ok_or(Error::NotFound)?, // Return a NotFound error if the user does not exist.
    );

    model.token = Set(None); // Clear the user's token.
    let updated_item = model
        .save(&*conn)
        .await
        .map_err(|error| Error::DbError(error.to_string()))?; // Handle any database errors.

    Ok(Json(updated_item.try_into_model().unwrap())) // Return the updated user as JSON.
}
