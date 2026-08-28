//! Integration tests for the device REST proxy (`eez_studio::proxy_device_rest`).
//!
//! The proxy is what lets the browser load an LVGL project from an ESP32
//! device without CORS failures: the frontend calls `/api/device-rest/<ip>/...`
//! on our own origin and this server forwards the request to the device
//! server-side (server → device has no CORS restrictions).
//!
//! Run with: `cargo test --test eez_studio`

use axum::{
    body::Bytes,
    http::StatusCode,
    routing::{any, get, put},
    Router,
};
use t3_webview_api::eez_studio::proxy_device_rest;

/// Starts a mock "device" REST server on an ephemeral port and a proxy router
/// on another ephemeral port, then verifies the proxy forwards the request
/// (method + path) to the device and returns its status/body.
///
/// The `x-device-port` header lets the test point the proxy at the mock's
/// ephemeral port instead of the default device port 80.
#[tokio::test]
async fn device_proxy_forwards_get_and_preserves_body() {
    // --- Mock device (what the ESP32 would serve on :80) ---
    let mock = Router::new()
        .route(
            "/api/eez-device/screens",
            get(|| async { (StatusCode::OK, "{\"screens\":[{\"name\":\"A\"}]}") }),
        )
        .route(
            "/api/eez-device/screens/foo",
            put(|body: Bytes| async move {
                (StatusCode::OK, format!("received:{}", body.len()))
            }),
        );
    let device_listener = tokio::net::TcpListener::bind("127.0.0.1:0")
        .await
        .unwrap();
    let device_addr = device_listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(device_listener, mock).await.unwrap();
    });

    // --- Proxy router under test ---
    let proxy_router =
        Router::new().route("/api/device-rest/:device_ip/*path", any(proxy_device_rest));
    let proxy_listener = tokio::net::TcpListener::bind("127.0.0.1:0")
        .await
        .unwrap();
    let proxy_addr = proxy_listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(proxy_listener, proxy_router).await.unwrap();
    });

    // Let both servers bind before issuing requests.
    tokio::time::sleep(std::time::Duration::from_millis(100)).await;

    let client = reqwest::Client::new();

    // GET through the proxy → should reach the mock device and return its body.
    let url = format!(
        "http://{}/api/device-rest/127.0.0.1/api/eez-device/screens",
        proxy_addr
    );
    let resp = client
        .get(&url)
        .header("x-device-port", device_addr.port().to_string())
        .send()
        .await
        .expect("GET through proxy failed");
    assert_eq!(resp.status(), StatusCode::OK);
    assert_eq!(
        resp.text().await.unwrap(),
        "{\"screens\":[{\"name\":\"A\"}]}"
    );

    // PUT with a body through the proxy → method + body must be forwarded.
    let url_put = format!(
        "http://{}/api/device-rest/127.0.0.1/api/eez-device/screens/foo",
        proxy_addr
    );
    let resp = client
        .put(&url_put)
        .header("x-device-port", device_addr.port().to_string())
        .body("hello")
        .send()
        .await
        .expect("PUT through proxy failed");
    assert_eq!(resp.status(), StatusCode::OK);
    assert_eq!(resp.text().await.unwrap(), "received:5");
}
