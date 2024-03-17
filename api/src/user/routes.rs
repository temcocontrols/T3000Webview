use axum::{extract::State, middleware, routing::get, Json, Router};
use futures_util::{SinkExt, StreamExt};
use sea_orm::entity::prelude::*;
use serde_json::Value;
use tokio_tungstenite::{
    connect_async,
    tungstenite::protocol::{frame::coding::CloseCode, CloseFrame, Message},
};

use crate::entity::user;
use crate::utils::{REMOTE_API_URL, REMOTE_API_WS_URL};
use crate::{auth::require_auth, entity::prelude::*};

use crate::{
    app_state::AppState,
    error::{Error, Result},
};

pub fn user_routes() -> Router<AppState> {
    Router::new()
        .route("/user", get(get_user).post(save_user).delete(delete_user))
        .route("/login", get(login))
        .route_layer(middleware::from_fn(require_auth))
}

pub async fn get_user(State(state): State<AppState>) -> Result<Json<user::Model>> {
    let result = User::find()
        .one(&state.conn)
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
        .one(&state.conn)
        .await
        .map_err(|error| Error::DbError(error.to_string()))?;

    if let Some(user) = the_user {
        User::delete_by_id(user.id)
            .exec(&state.conn)
            .await
            .map_err(|error| Error::DbError(error.to_string()))?;
    }
    let result = User::insert(user::ActiveModel::from(item))
        .exec_with_returning(&state.conn)
        .await
        .map_err(|error| Error::DbError(error.to_string()))?;
    Ok(Json(result))
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

pub async fn login() -> Result<Json<String>> {
    let (ws_stream, _) = connect_async(REMOTE_API_WS_URL.to_owned())
        .await
        .expect("Failed to connect");
    let (mut write, mut read) = ws_stream.split();

    let timeout_duration = std::time::Duration::from_secs(15 * 60); // 15 minutes

    tokio::spawn(async move {
        let timedout = tokio::time::timeout(timeout_duration, async {
            while let Some(msg) = read.next().await {
                let msg = msg.unwrap().into_text().unwrap();
                let data: Value =
                    serde_json::from_str(&msg).unwrap_or(serde_json::json!({"type": "empty"}));

                match data["type"].as_str() {
                    Some("hello") => {
                        let cid = data["cid"].as_str().unwrap();
                        let api_url = REMOTE_API_URL.to_owned();
                        let login_url = format!("{}/login?cid={}", api_url, cid);
                        open::that(login_url)
                            .map_err(|error| Error::BadRequest(error.to_string()))
                            .unwrap();
                    }
                    Some("token") => {
                        let user = data["user"].as_object().unwrap();
                        let token = data["token"].as_str().unwrap();
                        let m_type = data["type"].as_str().unwrap();
                        let res = serde_json::json!({
                            "token": token,
                            "user": user,
                            "type": m_type,
                        });
                        println!("login res: {}", res);
                        // Send a close message to the server
                        let close_frame = CloseFrame {
                            code: CloseCode::Normal,
                            reason: "Received token".into(),
                        };
                        let close_msg = Message::Close(Some(close_frame));
                        write.send(close_msg).await.unwrap();
                        break;
                    }
                    _ => (),
                }
            }
        })
        .await;

        match timedout {
            Ok(()) => (),
            Err(_) => {
                let close_frame = CloseFrame {
                    code: CloseCode::Normal,
                    reason: "Timed out".into(),
                };
                let close_msg = Message::Close(Some(close_frame));
                write.send(close_msg).await.unwrap();
            }
        }
        return;
    });

    Ok(Json("Logging in...".to_string()))
}
