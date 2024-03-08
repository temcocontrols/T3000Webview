use std::env;

use axum::{
    body::Body,
    extract::State,
    http::{self, Request, StatusCode},
    Json,
};
use sqlx::SqlitePool;
use t3_webview_api::{
    app_state::app_state,
    entity::user,
    error::Error,
    server::create_app,
    user::routes::{delete_user, get_user, save_user},
    utils::DATABASE_URL,
};
use tower::ServiceExt;

#[tokio::test]
async fn test_user_crud() {
    dotenvy::from_filename("./tests/.test.env").ok();

    let conn = SqlitePool::connect(DATABASE_URL.as_str())
        .await
        .unwrap_or_else(|_| panic!("Error connecting to {}", DATABASE_URL.as_str()));
    sqlx::migrate!("./migrations").run(&conn).await.unwrap();

    let conn = app_state().await.unwrap();
    let res = get_user(State(conn.clone())).await;
    assert!(matches!(res, Err(Error::NotFound)));

    let user = user::Model {
        id: 1,
        name: "test".to_string(),
        token: Some("test".to_string()),
    };

    let res = save_user(State(conn.clone()), Json(user)).await;
    assert!(res.is_ok());

    let res = get_user(State(conn.clone())).await;
    assert!(res.is_ok());
    assert!(res.unwrap().id == 1);

    let res = delete_user(State(conn.clone())).await;
    assert!(res.is_ok());
}

#[tokio::test]
async fn test_user_auth() {
    dotenvy::from_filename("./tests/.test.env").ok();

    let conn = SqlitePool::connect(DATABASE_URL.as_str())
        .await
        .unwrap_or_else(|_| panic!("Error connecting to {}", DATABASE_URL.as_str()));
    sqlx::migrate!("./migrations").run(&conn).await.unwrap();

    let app = create_app().await.unwrap();

    let request = Request::builder()
        .uri("/api/user")
        .body(Body::empty())
        .unwrap();

    let response = app.clone().oneshot(request).await.unwrap();

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);

    let request = Request::builder()
        .uri("/api/user")
        .header(
            http::header::AUTHORIZATION,
            env::var("API_SECRET_KEY").unwrap(),
        )
        .body(Body::empty())
        .unwrap();

    let response = app.clone().oneshot(request).await.unwrap();

    let status = response.status();
    assert!(status == StatusCode::NOT_FOUND || status == StatusCode::OK);

    let request = Request::builder()
        .uri("/api/user")
        .header(
            http::header::AUTHORIZATION,
            env::var("API_SECRET_KEY").unwrap() + "_add_wrong_secret",
        )
        .body(Body::empty())
        .unwrap();

    let response = app.clone().oneshot(request).await.unwrap();

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}
