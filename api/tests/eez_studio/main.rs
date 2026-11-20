//! Integration tests for `eez_studio`: the device REST proxy and the
//! firmware-screen parser used by the mock device API.
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
use t3_webview_api::eez_studio::parse_squareline::{
    canonical_screen_name, parse_screens, split_screen_blocks,
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

/// The proxy must also honor a port embedded in the ip segment
/// (`/api/device-rest/127.0.0.1:8080/...`). This is how the frontend reaches a
/// mock device running on a non-standard port (e.g. `device_mock_server`) with
/// no extra headers.
#[tokio::test]
async fn device_proxy_honors_port_in_ip_segment() {
    // --- Mock device on an ephemeral port ---
    let mock = Router::new().route(
        "/api/eez-device/screens",
        get(|| async { (StatusCode::OK, "{\"screens\":[]}") }),
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

    tokio::time::sleep(std::time::Duration::from_millis(100)).await;

    // NO x-device-port header — the port is embedded in the ip segment.
    let url = format!(
        "http://{}/api/device-rest/127.0.0.1:{}/api/eez-device/screens",
        proxy_addr,
        device_addr.port()
    );
    let resp = reqwest::Client::new()
        .get(&url)
        .send()
        .await
        .expect("GET through proxy failed");
    assert_eq!(resp.status(), StatusCode::OK);
    assert_eq!(resp.text().await.unwrap(), "{\"screens\":[]}");
}

// ── Firmware screen parser ───────────────────────────────────────────
//
// The mock device API reports the firmware's screens. SquareLine generates one
// screen per `ui_*.c` file, but hand-written files can hold several — the real
// `ui_RemoteAccess.c` carries both `ui_WireGuardScreen` and `ui_DdnsScreen`.
// The parser must emit one screen per `ui_<Name>_screen_init()` block, named
// exactly as the device names it (`DefaultScreens/<name>.json`).

/// A trimmed-down stand-in for the firmware's `ui_RemoteAccess.c`: two screens
/// in one file, the second introduced by its `lv_obj_t *ui_<Name>;` declaration.
const REMOTE_ACCESS_C: &str = r#"
#include "../ui.h"
#include "wireguard.h"

lv_obj_t *ui_WireGuardScreen;
static lv_obj_t *wg_enable;

void ui_WireGuardScreen_screen_init(void)
{
    ui_WireGuardScreen = lv_obj_create(NULL);
    lv_obj_set_style_bg_color(ui_WireGuardScreen, lv_color_hex(0x101010), LV_PART_MAIN|LV_STATE_DEFAULT);
    wg_enable = lv_switch_create(ui_WireGuardScreen);
    lv_obj_set_width(wg_enable, 50);
    lv_obj_t *wg_label = lv_label_create(ui_WireGuardScreen);
    lv_label_set_text(wg_label, "Enable");
}

void ui_WireGuardScreen_screen_destroy(void)
{
    if(ui_WireGuardScreen)
    {
        lv_obj_del(ui_WireGuardScreen);
        ui_WireGuardScreen = NULL;
    }
}

#if 1
lv_obj_t *ui_DdnsScreen;
static lv_obj_t *ddns_enable;

void ui_DdnsScreen_screen_init(void)
{
    ui_DdnsScreen = lv_obj_create(NULL);
    ddns_enable = lv_switch_create(ui_DdnsScreen);
    lv_obj_t *ddns_label = lv_label_create(ui_DdnsScreen);
    lv_label_set_text(ddns_label, "Hostname");
}
#endif
"#;

/// A stand-in for a SquareLine-generated single-screen file (`ui_HomeScreen.c`).
const HOME_C: &str = r#"
#include "../ui.h"

lv_obj_t *ui_HomeScreen;

void ui_HomeScreen_screen_init(void)
{
    ui_HomeScreen = lv_obj_create(NULL);
    lv_obj_set_style_bg_color(ui_HomeScreen, lv_color_hex(0x000000), LV_PART_MAIN|LV_STATE_DEFAULT);
    lv_obj_t *title = lv_label_create(ui_HomeScreen);
    lv_label_set_text(title, "T3000");
}
"#;

#[test]
fn split_screen_blocks_separates_screens_in_one_file() {
    let blocks = split_screen_blocks(REMOTE_ACCESS_C);

    assert_eq!(blocks.len(), 2, "expected one block per screen init");
    assert_eq!(blocks[0].0, "wireguard_screen");
    assert_eq!(blocks[1].0, "ddns_screen");

    // Block 0 keeps the file header (includes + shared statics) with the first screen…
    assert!(blocks[0].1.contains("#include \"../ui.h\""));
    assert!(blocks[0].1.contains("void ui_WireGuardScreen_screen_init(void)"));
    // …and must not leak the second screen's widgets.
    assert!(!blocks[0].1.contains("ddns_enable"));

    // Block 1 starts at its own declaration and holds only its own widgets.
    assert!(blocks[1].1.trim_start().starts_with("lv_obj_t *ui_DdnsScreen;"));
    assert!(blocks[1].1.contains("ddns_enable"));
    assert!(!blocks[1].1.contains("wg_enable"));
}

#[test]
fn split_screen_blocks_leaves_single_screen_files_alone() {
    // One screen → no split, so the caller keeps the file-derived name.
    assert!(split_screen_blocks(HOME_C).is_empty());
    // A file with no screen init at all is not split either.
    assert!(split_screen_blocks("int helper(void) { return 1; }").is_empty());
}

#[test]
fn canonical_screen_name_matches_device_json_names() {
    // DefaultScreens/*.json filenames, as the device reports them.
    assert_eq!(canonical_screen_name("WireGuardScreen"), "wireguard_screen");
    assert_eq!(canonical_screen_name("DdnsScreen"), "ddns_screen");
    assert_eq!(canonical_screen_name("HomeScreen"), "home_screen");
    assert_eq!(canonical_screen_name("SchedulesScreen"), "schedules_screen");
    assert_eq!(canonical_screen_name("InputsScreen"), "inputs_screen");
}

#[test]
fn parse_screens_emits_one_screen_per_init_block() {
    let dir = std::env::temp_dir().join(format!("t3_parse_screens_{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(&dir).unwrap();

    std::fs::write(dir.join("ui_RemoteAccess.c"), REMOTE_ACCESS_C).unwrap();
    std::fs::write(dir.join("ui_HomeScreen.c"), HOME_C).unwrap();
    // Must be skipped: the ui.c bootstrap, image/font assets and event tables.
    std::fs::write(dir.join("ui.c"), "void ui_init(void) {}").unwrap();
    std::fs::write(dir.join("ui_img_logo_png.c"), "const unsigned char a[] = {0};").unwrap();
    std::fs::write(dir.join("ui_events.c"), "void events_init(void) {}").unwrap();

    let screens = parse_screens(&dir).expect("parse_screens failed");
    let mut names: Vec<&str> = screens.iter().map(|s| s.name.as_str()).collect();
    names.sort_unstable();

    assert_eq!(
        names,
        vec!["ddns_screen", "home_screen", "wireguard_screen"],
        "one screen per init block, non-screen files skipped"
    );

    for screen in &screens {
        assert!(
            !screen.widgets.is_empty(),
            "screen {} has no widgets",
            screen.name
        );
    }

    // The split really happened: each block only knows its own widgets.
    let wg = screens.iter().find(|s| s.name == "wireguard_screen").unwrap();
    let ddns = screens.iter().find(|s| s.name == "ddns_screen").unwrap();
    let ids = |s: &t3_webview_api::eez_studio::parse_squareline::ParsedScreen| {
        s.widgets.iter().map(|w| w.id.clone()).collect::<Vec<_>>()
    };
    assert!(ids(wg).iter().any(|i| i.contains("wg_enable")));
    assert!(!ids(wg).iter().any(|i| i.contains("ddns_enable")));
    assert!(ids(ddns).iter().any(|i| i.contains("ddns_enable")));
    assert!(!ids(ddns).iter().any(|i| i.contains("wg_enable")));

    let _ = std::fs::remove_dir_all(&dir);
}
