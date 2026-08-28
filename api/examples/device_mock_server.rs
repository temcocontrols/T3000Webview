//! Mock ESP32 device REST server — for testing the EEZ device integration
//! (loading screens / reproducing the CORS error) without touching real hardware.
//!
//! It serves the exact `/api/eez-device/*` REST shape the real ESP32 dynamic
//! display serves, but reads the screens from a JSON file instead of firmware.
//!
//! By default it sends **no CORS headers** (exactly like the ESP32), so a direct
//! browser → mock fetch is CORS-blocked — use that to reproduce the error, then
//! verify the fix by going through the T3000 proxy.
//!
//! ────────────────────────────────────────────────────────────────────────────
//! Usage
//! ────────────────────────────────────────────────────────────────────────────
//!   cargo run --example device_mock_server [SCREENS_JSON] [PORT] [--cors]
//!
//!   SCREENS_JSON  JSON file (or dir) with the real device screens.
//!                 Default: `firmware-screens.json`, then `examples/device/screen.json`
//!                 — searched in cwd, the api/ dir and the repo root. If a
//!                 directory, the first *.json in it is used.
//!   PORT          Listen port (default 8080, or $DEVICE_MOCK_PORT)
//!   --cors        Send `Access-Control-Allow-Origin: *` (to compare against the
//!                 CORS-blocked default)
//!
//! Accepted JSON shapes (any of):
//!   { "screens": [ { "name": "Home", "json": { ... } } ], "meta": { ... } }  ← GET /screens
//!   [ { "name": "Home", "json": { ... } } ]                                   ← bare array
//!   { "name": "Home", "json": { ... } }                                       ← single screen
//!
//! ────────────────────────────────────────────────────────────────────────────
//! Testing the CORS error + fix
//! ────────────────────────────────────────────────────────────────────────────
//! In a browser at http://localhost:9103 (EEZ Studio), DevTools console:
//!
//!   // 1. Direct → BLOCKED (device sends no Access-Control-Allow-Origin):
//!   fetch("http://127.0.0.1:8080/api/eez-device/screens")
//!   //    → "Access to fetch ... has been blocked by CORS policy"
//!
//!   // 2. Via the T3000 proxy → OK (server-side fetch, no CORS):
//!   fetch("/api/device-rest/127.0.0.1:8080/api/eez-device/screens")
//!
//!   // 3. Device info through the proxy:
//!   fetch("/api/device-rest/127.0.0.1:8080/api/eez-device/device/info")
//!
//! (The proxy accepts an `ip:port` in the path segment, so the 8080 mock port is
//!  embedded directly — no extra headers needed. A real ESP32 on port 80 works
//!  the same way without the `:port`.)

use axum::{
    extract::{Path, Request, State},
    http::{header, StatusCode},
    middleware::{self, Next},
    response::{Html, IntoResponse, Json, Response},
    routing::{get, post, put},
    Router,
};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::{Mutex, RwLock};

const DEFAULT_FILE: &str = "firmware-screens.json";
const DEFAULT_PORT: u16 = 8080;

#[derive(Clone)]
struct Screen {
    name: String,
    json: Value,
}

#[derive(Clone)]
struct AppState {
    screens: Arc<RwLock<Vec<Screen>>>,
    meta: Value,
    cors: bool,
    images: Arc<Mutex<HashMap<String, Value>>>,
}

#[tokio::main]
async fn main() {
    let args: Vec<String> = std::env::args().skip(1).collect();

    let cors = args.iter().any(|a| a == "--cors");
    let positional: Vec<&String> = args.iter().filter(|a| a.as_str() != "--cors").collect();

    let given = positional.first().map(|s| s.as_str());
    let file = given.unwrap_or(DEFAULT_FILE);
    let port = positional
        .get(1)
        .and_then(|s| s.parse::<u16>().ok())
        .or_else(|| {
            std::env::var("DEVICE_MOCK_PORT")
                .ok()
                .and_then(|v| v.parse::<u16>().ok())
        })
        .unwrap_or(DEFAULT_PORT);

    // ── Locate + load the screens JSON ──────────────────────────────────────
    let path = resolve_screens_path(file)
        .or_else(|| {
            // Nothing passed explicitly → also try the real-device JSON location.
            if given.is_none() {
                resolve_screens_path("examples/device/screen.json")
            } else {
                None
            }
        })
        .unwrap_or_else(|| {
            eprintln!(
                "✗ could not find screens JSON '{}' (looked in cwd, api/, repo root)",
                file
            );
            std::process::exit(1);
        });
    let raw = std::fs::read_to_string(&path)
        .unwrap_or_else(|e| panic!("✗ failed to read {}: {}", path.display(), e));
    let value: Value = serde_json::from_str(&raw)
        .unwrap_or_else(|e| panic!("✗ '{}' is not valid JSON: {}", path.display(), e));
    let (screens, meta) = normalize_screens(&value);
    if screens.is_empty() {
        eprintln!("⚠ no screens found in {} (expected {{screens:[...]}} / [...] / {{name,json}})", path.display());
    }

    // ── Router ──────────────────────────────────────────────────────────────
    let state = AppState {
        screens: Arc::new(RwLock::new(screens.clone())),
        meta,
        cors,
        images: Arc::new(Mutex::new(HashMap::new())),
    };

    let app = Router::new()
        .route("/", get(index))
        .route("/api/eez-device/device/info", get(device_info))
        .route(
            "/api/eez-device/screens",
            get(all_screens).put(put_all).options(options_handler),
        )
        .route(
            "/api/eez-device/screens/:name",
            get(one_screen).put(put_one).options(options_handler),
        )
        .route(
            "/api/eez-device/images/push/:panelId",
            post(push_image).options(options_handler),
        )
        .route(
            "/api/eez-device/images/pull/:panelId/:name",
            get(pull_image).options(options_handler),
        )
        .layer(middleware::from_fn(log_requests))
        .layer(middleware::from_fn_with_state(state.clone(), cors_layer))
        .with_state(state);

    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{}", port))
        .await
        .unwrap_or_else(|e| panic!("✗ failed to bind :{} — {}", port, e));

    // ── Startup banner ──────────────────────────────────────────────────────
    println!("════════════════════════════════════════════════════════════════");
    println!("  Mock ESP32 device REST server");
    println!("════════════════════════════════════════════════════════════════");
    println!("  Screens JSON : {}", path.display());
    println!("  Screens      : {}", screens.len());
    println!("  Listening    : http://0.0.0.0:{}", port);
    println!("  CORS headers : {}", if cors { "SENT (--cors)" } else { "NONE (like real ESP32)" });
    println!("────────────────────────────────────────────────────────────────");
    println!("  Direct (CORS-BLOCKED in a browser):");
    println!("    http://127.0.0.1:{}/api/eez-device/screens", port);
    println!("  Through the T3000 proxy (works):");
    println!("    http://localhost:9103/api/device-rest/127.0.0.1:{}/api/eez-device/screens", port);
    println!("    http://localhost:9103/api/device-rest/127.0.0.1:{}/api/eez-device/device/info", port);
    println!("  From localhost:9103 DevTools:");
    println!("    fetch('http://127.0.0.1:{}/api/eez-device/screens')            // blocked", port);
    println!("    fetch('/api/device-rest/127.0.0.1:{}/api/eez-device/screens')  // ok", port);
    println!("════════════════════════════════════════════════════════════════");
    println!("  Press Ctrl+C to stop.");

    axum::serve(listener, app).await.unwrap();
}

// ── JSON loading / normalization ────────────────────────────────────────────

/// Find the screens JSON — accept a file or a directory (first *.json inside),
/// checking the given path, the api/ dir and the repo root.
fn resolve_screens_path(given: &str) -> Option<PathBuf> {
    let mut candidates: Vec<PathBuf> = vec![PathBuf::from(given)];
    if let Ok(md) = std::env::var("CARGO_MANIFEST_DIR") {
        candidates.push(PathBuf::from(&md).join(given));
        if let Some(parent) = PathBuf::from(&md).parent() {
            candidates.push(parent.join(given));
        }
    }
    for c in candidates {
        if c.is_dir() {
            // directory → pick the first *.json inside
            if let Ok(mut entries) = std::fs::read_dir(&c) {
                if let Some(Ok(e)) = entries.find(|e| {
                    e.as_ref()
                        .map(|f| f.path().extension().map(|x| x == "json").unwrap_or(false))
                        .unwrap_or(false)
                }) {
                    return Some(e.path());
                }
            }
        } else if c.exists() {
            return Some(c);
        }
    }
    None
}

/// Accept `{screens:[...],meta}` / bare `[...]` / single `{name,json}`.
fn normalize_screens(v: &Value) -> (Vec<Screen>, Value) {
    let mut screens = Vec::new();
    if let Some(arr) = v.as_array() {
        for item in arr {
            push_screen(&mut screens, item);
        }
    } else if let Some(obj) = v.as_object() {
        if let Some(sarr) = obj.get("screens").and_then(|s| s.as_array()) {
            for item in sarr {
                push_screen(&mut screens, item);
            }
        } else {
            push_screen(&mut screens, v);
        }
    }
    let meta = v
        .get("meta")
        .cloned()
        .unwrap_or_else(|| json!({ "panel_name": "T3-Mock-Device" }));
    (screens, meta)
}

fn push_screen(screens: &mut Vec<Screen>, item: &Value) {
    if let (Some(name), Some(json)) = (
        item.get("name").and_then(|n| n.as_str()),
        item.get("json"),
    ) {
        screens.push(Screen {
            name: name.to_string(),
            json: unwrap_screen_json(name, json.clone()),
        });
    }
}

/// Normalize a screen's `json` so `fonts` / `bitmaps` / `widgets` sit at the top.
///
/// The real device export sometimes nests the content under a key equal to the
/// screen name — `"json": { "home_screen": { "bg_color":..., "widgets":... } }`
/// — while other screens already serve it flat. The frontend expects the flat
/// shape, so unwrap the wrapper when present.
fn unwrap_screen_json(name: &str, raw: Value) -> Value {
    if let Some(obj) = raw.as_object() {
        // Already content-shaped → keep as-is.
        if looks_like_content(obj) {
            return raw;
        }
        // Single-key wrapper: unwrap if the key is the screen name, or the
        // wrapped value itself looks like screen content (name mismatch).
        if obj.len() == 1 {
            if let Some((k, v)) = obj.iter().next() {
                if let Some(inner) = v.as_object() {
                    if k == name || looks_like_content(inner) {
                        return Value::Object(inner.clone());
                    }
                }
            }
        }
    }
    raw
}

fn looks_like_content(obj: &serde_json::Map<String, Value>) -> bool {
    ["widgets", "fonts", "bitmaps", "bg_color", "img_bg_color"]
        .iter()
        .any(|k| obj.contains_key(*k))
}

// ── Handlers ────────────────────────────────────────────────────────────────

async fn index() -> Html<&'static str> {
    Html(
        "<h1>Mock ESP32 device REST server</h1>\
         <p>This server mimics the real device — it sends <b>no CORS headers</b>, \
         so a direct browser fetch is blocked. Use the T3000 proxy instead:</p>\
         <pre>/api/device-rest/127.0.0.1:PORT/api/eez-device/...</pre>\
         <ul><li><a href='/api/eez-device/device/info'>device/info</a></li>\
         <li><a href='/api/eez-device/screens'>screens</a></li></ul>",
    )
}

async fn device_info(State(st): State<AppState>) -> Json<Value> {
    let screens = st.screens.read().await;
    let mut names = Vec::new();
    let mut image_count = 0usize;
    let mut font_count = 0usize;
    for s in screens.iter() {
        names.push(s.name.clone());
        if let Some(b) = s.json.get("bitmaps").and_then(|b| b.as_array()) {
            image_count += b.len();
        }
        if let Some(f) = s.json.get("fonts").and_then(|f| f.as_array()) {
            font_count += f.len();
        }
    }
    Json(json!({
        "panel_name": st.meta.get("panel_name").and_then(|v| v.as_str()).unwrap_or("T3-Mock"),
        "serial_number": st.meta.get("serial_number").and_then(|v| v.as_i64()).unwrap_or(0),
        "screen_size": { "width": 480, "height": 272 },
        "screen_count": screens.len(),
        "screens": names,
        "image_count": image_count,
        "font_count": font_count,
        "firmware_version": "3.7",
        "lvgl_version": "9.5.0",
        "dark_theme": false,
        "color_format": "RGB",
    }))
}

async fn all_screens(State(st): State<AppState>) -> Json<Value> {
    let screens = st.screens.read().await;
    let list: Vec<Value> = screens
        .iter()
        .map(|s| json!({ "name": s.name, "json": s.json }))
        .collect();
    Json(json!({ "screens": list, "meta": st.meta }))
}

async fn one_screen(State(st): State<AppState>, Path(name): Path<String>) -> Response {
    let screens = st.screens.read().await;
    match screens.iter().find(|s| s.name == name) {
        Some(s) => (StatusCode::OK, Json(json!({ "name": s.name, "json": s.json }))).into_response(),
        None => (
            StatusCode::NOT_FOUND,
            Json(json!({ "error": format!("screen '{}' not found", name) })),
        )
            .into_response(),
    }
}

async fn put_all(State(st): State<AppState>, Json(body): Json<Value>) -> Json<Value> {
    let mut screens = st.screens.write().await;
    let mut new_list = Vec::new();
    let mut failed = 0usize;
    if let Some(arr) = body.get("screens").and_then(|s| s.as_array()) {
        for item in arr {
            let before = new_list.len();
            push_screen(&mut new_list, item);
            if new_list.len() == before {
                failed += 1;
            }
        }
    }
    let deployed = new_list.len();
    *screens = new_list;
    Json(json!({
        "deployed": deployed,
        "failed": failed,
        "status": if deployed > 0 { "ok" } else { "error" },
    }))
}

async fn put_one(State(st): State<AppState>, Path(name): Path<String>, Json(body): Json<Value>) -> Json<Value> {
    let mut screens = st.screens.write().await;
    if let Some(s) = screens.iter_mut().find(|s| s.name == name) {
        s.json = body;
        Json(json!({ "name": name, "status": "ok" }))
    } else {
        screens.push(Screen { name: name.clone(), json: body });
        Json(json!({ "name": name, "status": "ok", "created": true }))
    }
}

async fn push_image(
    State(st): State<AppState>,
    Path(_panel_id): Path<String>,
    Json(body): Json<Value>,
) -> Json<Value> {
    let images = body
        .get("images")
        .cloned()
        .unwrap_or_else(|| body.clone());
    let list: Vec<Value> = if let Some(arr) = images.as_array() {
        arr.clone()
    } else {
        vec![images]
    };
    let mut store = st.images.lock().await;
    let mut pushed = 0usize;
    for img in list {
        if let Some(name) = img.get("name").and_then(|n| n.as_str()) {
            store.insert(name.to_string(), img);
            pushed += 1;
        }
    }
    Json(json!({ "pushed": pushed }))
}

async fn pull_image(
    State(st): State<AppState>,
    Path((_panel_id, name)): Path<(String, String)>,
) -> Response {
    let store = st.images.lock().await;
    match store.get(&name) {
        Some(img) => (StatusCode::OK, Json(img.clone())).into_response(),
        None => (
            StatusCode::NOT_FOUND,
            Json(json!({ "error": format!("image '{}' not found", name) })),
        )
            .into_response(),
    }
}

// ── Middleware ──────────────────────────────────────────────────────────────

/// Log every request with its origin (so you can see the browser origin that
/// triggers the CORS block).
async fn log_requests(req: Request, next: Next) -> Response {
    let method = req.method().clone();
    let path = req.uri().path().to_string();
    let origin = req
        .headers()
        .get(header::ORIGIN)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("(none)")
        .to_string();
    println!("[device-mock] {:>7} {}   origin={}", method, path, origin);
    next.run(req).await
}

/// Send CORS headers only in `--cors` mode (default = none, like the ESP32).
async fn cors_layer(
    State(st): State<AppState>,
    req: Request,
    next: Next,
) -> Response {
    let mut resp = next.run(req).await;
    if st.cors {
        resp.headers_mut().insert(
            header::ACCESS_CONTROL_ALLOW_ORIGIN,
            header::HeaderValue::from_static("*"),
        );
    }
    resp
}

async fn options_handler(State(st): State<AppState>) -> impl IntoResponse {
    if st.cors {
        (
            [
                (header::ACCESS_CONTROL_ALLOW_ORIGIN, "*"),
                (
                    header::ACCESS_CONTROL_ALLOW_METHODS,
                    "GET, PUT, PATCH, POST, DELETE, OPTIONS",
                ),
                (header::ACCESS_CONTROL_ALLOW_HEADERS, "Content-Type"),
            ],
            StatusCode::NO_CONTENT,
        )
            .into_response()
    } else {
        StatusCode::METHOD_NOT_ALLOWED.into_response()
    }
}
