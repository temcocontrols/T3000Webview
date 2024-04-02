use axum::{
    extract::State,
    middleware,
    routing::{get, patch, post},
    Json, Router,
};
use sea_orm::{entity::prelude::*, IntoActiveModel, Set};
use serde::Deserialize;

use crate::entity::user;
use crate::{auth::require_auth, entity::prelude::*};

use crate::{
    app_state::AppState,
    error::{Error, Result},
};

pub fn user_routes() -> Router<AppState> {
    Router::new()
        .route("/user", get(get_user).post(save_user).delete(delete_user))
        .route("/login", post(login))
        .route(
            "/user/update_last_modbus_register_pull",
            patch(update_user_last_modbus_register_pull),
        )
        .route_layer(middleware::from_fn(require_auth))
}

pub async fn get_user(State(state): State<AppState>) -> Result<Json<Option<user::Model>>> {
    let result = User::find()
        .one(&state.conn)
        .await
        .map_err(|error| Error::DbError(error.to_string()))?;

    Ok(Json(result))
}

pub async fn save_user(
    State(state): State<AppState>,
    Json(item): Json<user::Model>,
) -> Result<Json<user::Model>> {
    let the_user = User::find()
        .one(&state.conn)
        .await
        .map_err(|error| Error::DbError(error.to_string()))?;

    let mut last_pull = Some("2024-02-10 00:00:00".to_string());

    if let Some(user) = the_user {
        if user.last_modbus_register_pull.is_some() {
            last_pull = user.last_modbus_register_pull;
        }
        User::delete_by_id(user.id)
            .exec(&state.conn)
            .await
            .map_err(|error| Error::DbError(error.to_string()))?;
    }
    let mut new_user = item.clone();
    new_user.last_modbus_register_pull = last_pull;
    let result = User::insert(user::ActiveModel::from(new_user))
        .exec_with_returning(&state.conn)
        .await
        .map_err(|error| Error::DbError(error.to_string()))?;
    Ok(Json(result))
}

#[derive(Deserialize)]
pub struct ServerTimeInput {
    pub time: String,
}

pub async fn update_user_last_modbus_register_pull(
    State(state): State<AppState>,
    Json(payload): Json<ServerTimeInput>,
) -> Result<Json<String>> {
    let the_user = User::find()
        .one(&state.conn)
        .await
        .map_err(|error| Error::DbError(error.to_string()))?;

    if the_user.is_none() {
        return Err(Error::NotFound);
    }

    let mut the_user = the_user.unwrap().into_active_model();
    the_user.last_modbus_register_pull = Set(Some(payload.time.clone()));
    the_user
        .save(&state.conn)
        .await
        .map_err(|error| Error::DbError(error.to_string()))?;
    Ok(Json("Time updated".to_string()))
}

pub async fn delete_user(State(state): State<AppState>) -> Result<Json<user::Model>> {
    let the_user = User::find()
        .one(&state.conn)
        .await
        .map_err(|error| Error::DbError(error.to_string()))?
        .ok_or(Error::NotFound)?;

    User::delete_by_id(the_user.id)
        .exec(&state.conn)
        .await
        .map_err(|error| Error::DbError(error.to_string()))
        .unwrap();

    Ok(Json(the_user))
}
#[derive(Deserialize)]
pub struct LoginParams {
    url: String,
}

pub async fn login(Json(params): Json<LoginParams>) -> Result<Json<String>> {
    open::that(params.url)
        .map_err(|error| Error::BadRequest(error.to_string()))
        .unwrap();

    Ok(Json("Logging in...".to_string()))
}
