use axum::{extract::State, middleware, routing::get, Json, Router};
use sea_orm::entity::prelude::*;

use crate::entity::user;
use crate::{auth::require_auth, entity::prelude::*};

use crate::{
    app_state::AppState,
    error::{Error, Result},
};

pub fn user_routes() -> Router<AppState> {
    Router::new()
        .route("/user", get(get_user).post(save_user).delete(delete_user))
        .route_layer(middleware::from_fn(require_auth))
}

pub async fn get_user(State(state): State<AppState>) -> Result<Json<user::Model>> {
    let result = User::find()
        .one(&state.sea_orm_conn)
        .await
        .map_err(|error| Error::DbError(error.to_string()))
        .unwrap();
    match result {
        Some(item) => Ok(Json(item)),
        None => Err(Error::NotFound),
    }
}

pub async fn save_user(
    State(state): State<AppState>,
    Json(item): Json<user::Model>,
) -> Result<Json<user::Model>> {
    let the_user = User::find()
        .one(&state.sea_orm_conn)
        .await
        .map_err(|error| Error::DbError(error.to_string()))?;

    if let Some(user) = the_user {
        User::delete_by_id(user.id)
            .exec(&state.sea_orm_conn)
            .await
            .map_err(|error| Error::DbError(error.to_string()))?;
    }
    let result = User::insert(user::ActiveModel::from(item))
        .exec_with_returning(&state.sea_orm_conn)
        .await
        .map_err(|error| Error::DbError(error.to_string()))?;
    Ok(Json(result))
}

pub async fn delete_user(State(state): State<AppState>) -> Result<Json<user::Model>> {
    let the_user = User::find()
        .one(&state.sea_orm_conn)
        .await
        .map_err(|error| Error::DbError(error.to_string()))?
        .ok_or(Error::NotFound)?;

    User::delete_by_id(the_user.id)
        .exec(&state.sea_orm_conn)
        .await
        .map_err(|error| Error::DbError(error.to_string()))
        .unwrap();

    Ok(Json(the_user))
}
