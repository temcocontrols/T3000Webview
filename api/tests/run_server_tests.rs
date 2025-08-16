use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use t3_webview_api::{app_state, server::create_app, utils::run_migrations_if_pending}; // Updated to use smart migration
use tower::ServiceExt; // for `call`, `oneshot`, and `ready`

#[tokio::test]
async fn test_server_start() {
    dotenvy::from_filename("./tests/.test.env").ok();

    // Use smart migration system that only runs when needed
    run_migrations_if_pending().await.unwrap();

    let state = app_state::app_state().await.unwrap();

    // Call the function with the mock
    let app = create_app(state).await;

    // Create a request
    let request = Request::builder()
        .uri("/api/modbus-registers")
        .body(Body::empty())
        .unwrap();

    // Call the app with the request
    let response = app.unwrap().oneshot(request).await.unwrap();

    // Check the response
    assert_eq!(response.status(), StatusCode::OK);
    // Add more assertions here based on what you expect the response to be
}
