use std::env;

use axum::{
    body::Body,
    extract::State,
    http::{self, Request, StatusCode},
    Json,
};
use t3_webview_api::{
    app_state::{self, app_state},
    entity::user,
    server::create_app,
    user::routes::{delete_user, get_user, save_user},
    utils::run_migrations,
};
use tower::ServiceExt;

#[tokio::test]
async fn test_user_crud() {
    dotenvy::from_filename("./tests/.test.env").ok();
    run_migrations().await.unwrap();

    let conn = app_state().await.unwrap();
    let res = get_user(State(conn.clone())).await;
    assert!(res.is_ok() && res.unwrap().is_none());

    let user = user::Model {
        id: 1,
        name: "test".to_string(),
        token: Some("test".to_string()),
        last_modbus_register_pull: None,
    };

    let res = save_user(State(conn.clone()), Json(user)).await;
    assert!(res.is_ok());

    let res = get_user(State(conn.clone())).await;
    assert!(res.is_ok());
    assert!(res.unwrap().as_ref().unwrap().id == 1);

    let res = delete_user(State(conn.clone())).await;
    assert!(res.is_ok());
}

#[tokio::test]
async fn test_user_auth() {
    dotenvy::from_filename("./tests/.test.env").ok();

    run_migrations().await.unwrap();

    let state = app_state::app_state().await.unwrap();

    // Call the function with the mock
    let app = create_app(state).await.unwrap();

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
