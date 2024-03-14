use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use sqlx::SqlitePool;
use t3_webview_api::{server::create_app, utils::DATABASE_URL}; // Assuming you've modified server_start to create_app
use tower::ServiceExt; // for `call`, `oneshot`, and `ready`

#[tokio::test]
async fn test_server_start() {
    dotenvy::from_filename("./tests/.test.env").ok();

    let conn = SqlitePool::connect(DATABASE_URL.as_str())
        .await
        .unwrap_or_else(|_| panic!("Error connecting to {}", DATABASE_URL.as_str()));
    sqlx::migrate!("./migrations").run(&conn).await.unwrap();

    // Call the function with the mock
    let app = create_app().await;

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
