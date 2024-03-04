use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use t3_webview_api::server::create_app; // Assuming you've modified server_start to create_app
use tower::ServiceExt; // for `call`, `oneshot`, and `ready`

#[tokio::test]
async fn test_server_start() {
    dotenvy::from_filename("./tests/.test.env").ok();

    let conn = t3_webview_api::db_connection::establish_connection().await;
    sqlx::migrate!("./migrations").run(&conn).await.unwrap();

    // Call the function with the mock
    let app = create_app().await;

    // Create a request
    let request = Request::builder()
        .uri("/api/modbus-registers")
        .body(Body::empty())
        .unwrap();

    // Call the app with the request
    let response = app.oneshot(request).await.unwrap();

    // Check the response
    assert_eq!(response.status(), StatusCode::OK);
    // Add more assertions here based on what you expect the response to be
}
