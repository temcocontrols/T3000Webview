//! Mock BACnet/ESP32 device API — full REST surface for testing.
//!
//! Simulates the ESP32 REST API at `/api/eez-device/screens` so the EEZ Studio
//! frontend can do full load→edit→push round-trips without real hardware.
//!
//! ## Endpoints (mirror ESP32's `GET/PUT/PATCH /api/v1/screens`)
//!   GET    /api/eez-device/screens                        — load all screens
//!   PUT    /api/eez-device/screens                        — deploy all screens
//!   GET    /api/eez-device/screens/:name                  — load single screen
//!   PUT    /api/eez-device/screens/:name                  — deploy single screen
//!   PATCH  /api/eez-device/screens/:name                  — delta update
//!   PATCH  /api/eez-device/screens/:name/widgets/:widgetId — widget delta
//!   GET    /api/eez-device/devices                        — list mock devices
//!   POST   /api/eez-device/images/push/:panelId           — upload image
//!   GET    /api/eez-device/images/pull/:panelId/:name     — download image
//!   DELETE /api/eez-device/images/:panelId/:name          — delete image
//!
//! ## BACnet-style (used by DeviceRestClient BACnet fallback)
//!   POST /api/eez-device/screens/push/:panelId            — store screens
//!   POST /api/eez-device/screens/pull/:panelId            — retrieve screens
//!
//! ## Switching to real device: change USE_MOCK in device-rest-client.ts

use axum::{
    extract::{Path, Query},
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::sync::Mutex;
use tracing::{error, info};

// ═══════════════════════════════════════════════════════════════════
// Store
// ═══════════════════════════════════════════════════════════════════

/// Per-device key: (panel_id, serial_number)
type DeviceKey = (i32, i32);

#[derive(Debug, Clone, Serialize, Deserialize)]
struct DeviceStore {
    screens: Vec<StoredScreen>,
    meta: DeviceMeta,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct StoredScreen {
    name: String,
    json: Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct DeviceMeta {
    panel_name: String,
    serial_number: i32,
}

lazy_static::lazy_static! {
    static ref STORE: Mutex<HashMap<DeviceKey, DeviceStore>> = Mutex::new(HashMap::new());
}

fn key(panel_id: i32, serial: i32) -> DeviceKey { (panel_id, serial) }

/// Resolve the ESP32 firmware TemcoScreen directory relative to CWD.
/// From the runtime dir (T3000 Output\Debug), firmware is at:
///   ..\..\..\T3-programmable-controller-on-ESP32\main\TemcoScreen
fn resolve_firmware_dir() -> Option<std::path::PathBuf> {
    let path = std::env::current_dir()
        .unwrap_or_default()
        .join("..").join("..").join("..")
        .join("T3-programmable-controller-on-ESP32")
        .join("main").join("TemcoScreen");
    if path.exists() {
        return Some(path);
    }
    None
}

/// Dynamically parse the ESP32 firmware C files into StoredScreen list.
/// Called on every read request — no caching, always reflects latest firmware edits.
/// Screens are sorted by `ui_init()` order (the natural device page sequence).
fn parse_firmware_screens() -> Result<Vec<StoredScreen>, String> {
    let dir = resolve_firmware_dir()
        .ok_or_else(|| "firmware TemcoScreen directory not found".to_string())?;

    let mut parsed = crate::eez_studio::parse_squareline::parse_screens(&dir)?;

    // Sort by ui_init() order from ui.c
    let init_order = read_init_order(&dir);
    parsed.sort_by_key(|s| {
        init_order.iter().position(|n| n == &s.name).unwrap_or(usize::MAX)
    });

    Ok(parsed.iter().map(|s| {
        let mut json = serde_json::json!({
            "fonts": s.fonts.iter().map(|(name, size)| {
                serde_json::json!({"name": name, "size": size})
            }).collect::<Vec<_>>(),
            "bitmaps": &s.bitmaps,
            "widgets": &s.widgets_map,
        });
        if let Some(ref bg) = s.bg_color {
            json["bg_color"] = serde_json::json!(bg);
        }
        StoredScreen {
            name: s.name.clone(),
            json,
        }
    }).collect())
}

/// Read the screen init order from `ui.c`'s `ui_init()` function.
/// Returns screen names in firmware page sequence (e.g. start_up_screen first, home_screen second).
fn read_init_order(dir: &std::path::Path) -> Vec<String> {
    let mut order = Vec::new();
    let ui_c = dir.join("ui.c");
    if let Ok(content) = std::fs::read_to_string(&ui_c) {
        for line in content.lines() {
            // Pattern: ui_StartUpScreen_screen_init();
            if let Some(start) = line.find("ui_") {
                if let Some(end) = line[start..].find("_screen_init") {
                    let raw = &line[start + 3..start + end]; // skip "ui_"
                    let name = screen_name_from_pascal(raw);
                    if !name.is_empty() {
                        order.push(name);
                    }
                }
            }
        }
    }
    order
}

/// Convert PascalCase screen name from firmware to snake_case (matching parse_squareline output).
/// e.g. "StartUpScreen" → "start_up_screen", "HomeScreen" → "home_screen"
fn screen_name_from_pascal(pascal: &str) -> String {
    let mut result = String::new();
    for (i, c) in pascal.chars().enumerate() {
        if c.is_uppercase() {
            if i > 0 { result.push('_'); }
            result.push(c.to_ascii_lowercase());
        } else {
            result.push(c);
        }
    }
    result
}

// ═══════════════════════════════════════════════════════════════════
// Request / Response types
// ═══════════════════════════════════════════════════════════════════

#[derive(Debug, Deserialize)]
pub struct DeployAllBody {
    pub screens: Vec<DeployScreenBody>,
    #[serde(default)]
    pub serial_number: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct DeployScreenBody {
    pub name: String,
    pub json: Value,
}

#[derive(Debug, Deserialize)]
pub struct DeploySingleBody {
    pub json: Value,
    #[serde(default)]
    pub serial_number: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct PatchBody {
    pub changes: Vec<DeltaChange>,
    #[serde(default)]
    pub serial_number: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct DeltaChange {
    pub path: String,
    pub value: Value,
}

#[derive(Debug, Deserialize)]
pub struct ScreenQuery {
    #[serde(default)]
    pub serial_number: Option<i32>,
}

#[derive(Debug, Serialize)]
pub struct DeployAllResponse {
    pub deployed: usize,
    pub failed: usize,
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub errors: Option<Vec<DeployError>>,
}

#[derive(Debug, Serialize)]
pub struct DeployError {
    pub screen: usize,
    pub name: String,
    pub message: String,
}

#[derive(Debug, Serialize)]
pub struct DeploySingleResponse {
    pub name: String,
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct PatchResponse {
    pub applied: usize,
    pub rejected: usize,
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub errors: Option<Vec<DeltaError>>,
}

#[derive(Debug, Serialize)]
pub struct DeltaError {
    pub path: String,
    pub message: String,
}

#[derive(Debug, Serialize)]
pub struct LoadAllResponse {
    pub screens: Vec<StoredScreen>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub meta: Option<DeviceMeta>,
}

/// Response for GET /api/eez-device/device/info — lightweight summary
/// before fetching full screen data.
#[derive(Debug, Serialize)]
pub struct DeviceInfoResponse {
    pub panel_name: String,
    pub serial_number: i32,
    pub screen_size: ScreenSize,
    pub screen_count: usize,
    pub screens: Vec<String>,
    pub image_count: usize,
    pub font_count: usize,
    pub firmware_version: String,
}

#[derive(Debug, Serialize)]
pub struct ScreenSize {
    pub width: u32,
    pub height: u32,
}

// ═══════════════════════════════════════════════════════════════════
// REST handlers (mirror ESP32 /api/v1/screens)
// ═══════════════════════════════════════════════════════════════════

/// GET /api/eez-device/screens — load all screens dynamically from firmware
///
/// Ignores serial_number — always parses the ESP32 firmware C files on-the-fly.
/// This mirrors the real device behavior: the device reads its internal screen
/// definitions and returns them. Here we read from the firmware source instead.
pub async fn get_screens(
    Query(q): Query<ScreenQuery>,
) -> Result<Json<LoadAllResponse>, StatusCode> {
    match parse_firmware_screens() {
        Ok(screens) => {
            let count = screens.len();
            info!("get_screens: dynamically parsed {} screens from firmware", count);
            Ok(Json(LoadAllResponse {
                screens,
                meta: Some(DeviceMeta {
                    panel_name: "T3-ESP32-Firmware".into(),
                    serial_number: q.serial_number.unwrap_or(0),
                }),
            }))
        }
        Err(e) => {
            error!("get_screens: failed to parse firmware: {}", e);
            Ok(Json(LoadAllResponse {
                screens: vec![],
                meta: Some(DeviceMeta {
                    panel_name: "T3-ESP32-Firmware".into(),
                    serial_number: q.serial_number.unwrap_or(0),
                }),
            }))
        }
    }
}

/// PUT /api/eez-device/screens
pub async fn put_screens(
    Query(q): Query<ScreenQuery>,
    Json(body): Json<DeployAllBody>,
) -> Result<Json<DeployAllResponse>, StatusCode> {
    let serial = body.serial_number.or(q.serial_number).unwrap_or(0);
    let k = key(0, serial);
    info!("put_screens: {} screens, serial={}", body.screens.len(), serial);

    let mut errors = Vec::new();
    let mut stored = Vec::new();
    for (i, s) in body.screens.iter().enumerate() {
        if s.name.is_empty() {
            errors.push(DeployError { screen: i, name: "".into(), message: "empty name".into() });
            continue;
        }
        stored.push(StoredScreen { name: s.name.clone(), json: s.json.clone() });
    }
    let deployed = stored.len();
    let failed = errors.len();

    STORE.lock().map_err(|e| { error!("put_screens: {}", e); StatusCode::INTERNAL_SERVER_ERROR })?
        .insert(k, DeviceStore {
            screens: stored,
            meta: DeviceMeta { panel_name: "T3-ESP-Mock".into(), serial_number: serial },
        });

    Ok(Json(DeployAllResponse {
        deployed, failed,
        status: if failed == 0 && deployed > 0 { "ok".into() } else if deployed > 0 { "partial".into() } else { "error".into() },
        errors: if errors.is_empty() { None } else { Some(errors) },
    }))
}

/// GET /api/eez-device/screens/:name — load a single screen dynamically from firmware
pub async fn get_screen(
    Path(name): Path<String>,
    _q: Query<ScreenQuery>,
) -> Result<Json<Value>, StatusCode> {
    match parse_firmware_screens() {
        Ok(screens) => {
            match screens.iter().find(|s| s.name == name) {
                Some(s) => Ok(Json(serde_json::json!({ "name": s.name, "json": s.json }))),
                None => {
                    error!("get_screen: '{}' not found in firmware", name);
                    Err(StatusCode::NOT_FOUND)
                }
            }
        }
        Err(e) => {
            error!("get_screen: parse failed: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

/// GET /api/eez-device/device/info — lightweight summary before fetching screens
///
/// Returns device metadata (panel name, screen size, screen list, counts)
/// without the heavy widget JSON. The frontend calls this first to know
/// what screens are available, then fetches individual or all screens.
pub async fn get_device_info() -> Result<Json<DeviceInfoResponse>, StatusCode> {
    let dir = resolve_firmware_dir()
        .ok_or(StatusCode::SERVICE_UNAVAILABLE)?;

    // Use parse_firmware_screens() to get screens in ui_init() order
    let screens = parse_firmware_screens()
        .map_err(|e| {
            error!("get_device_info: parse failed: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    let screen_names: Vec<String> = screens.iter().map(|s| s.name.clone()).collect();
    let (image_count, font_count, display_width, display_height) =
        count_firmware_assets(&dir);

    info!("get_device_info: {} screens, {} images, {} fonts, {}x{}",
        screen_names.len(), image_count, font_count, display_width, display_height);

    Ok(Json(DeviceInfoResponse {
        panel_name: "T3-BB".into(),
        serial_number: 0,
        screen_size: ScreenSize { width: display_width, height: display_height },
        screen_count: screen_names.len(),
        screens: screen_names,
        image_count,
        font_count,
        firmware_version: "5.1.0".into(),
    }))
}

/// Scan firmware directory for ui_img_*.c and ui_font_*.c to count assets,
/// and try to read display resolution from the first screen's set_size calls.
fn count_firmware_assets(dir: &std::path::Path) -> (usize, usize, u32, u32) {
    let mut images = 0usize;
    let mut fonts = 0usize;
    let mut width: u32 = 320;  // ILI9341 display resolution (portrait)
    let mut height: u32 = 240;

    if let Ok(entries) = std::fs::read_dir(dir) {
        for entry in entries.flatten() {
            let name = entry.file_name();
            let name = name.to_string_lossy();
            if name.starts_with("ui_img_") { images += 1; }
            if name.starts_with("ui_font_") { fonts += 1; }
        }
    }

    let ui_c = dir.join("ui.c");
    if let Ok(content) = std::fs::read_to_string(&ui_c) {
        for line in content.lines() {
            if line.contains("lv_obj_set_size") {
                if let Some(args) = line.split('(').nth(1).and_then(|s| s.split(')').next()) {
                    let nums: Vec<u32> = args.split(',')
                        .filter_map(|s| s.trim().parse().ok())
                        .collect();
                    if nums.len() >= 2 {
                        width = nums[nums.len() - 2];
                        height = nums[nums.len() - 1];
                    }
                }
                break;
            }
        }
    }

    (images, fonts, width, height)
}

/// PUT /api/eez-device/screens/:name
pub async fn put_screen(
    Path(name): Path<String>,
    Query(q): Query<ScreenQuery>,
    Json(body): Json<DeploySingleBody>,
) -> Result<Json<DeploySingleResponse>, StatusCode> {
    let serial = body.serial_number.or(q.serial_number).unwrap_or(0);
    let k = key(0, serial);
    info!("put_screen: '{}' serial={}", name, serial);

    let mut store = STORE.lock().map_err(|e| { error!("put_screen: {}", e); StatusCode::INTERNAL_SERVER_ERROR })?;
    let entry = store.entry(k).or_insert_with(|| DeviceStore {
        screens: vec![],
        meta: DeviceMeta { panel_name: "T3-ESP-Mock".into(), serial_number: serial },
    });
    if let Some(s) = entry.screens.iter_mut().find(|s| s.name == name) {
        s.json = body.json;
    } else {
        entry.screens.push(StoredScreen { name: name.clone(), json: body.json });
    }
    Ok(Json(DeploySingleResponse { name, status: "ok".into(), error: None }))
}

/// PATCH /api/eez-device/screens/:name
pub async fn patch_screen(
    Path(name): Path<String>,
    Query(q): Query<ScreenQuery>,
    Json(body): Json<PatchBody>,
) -> Result<Json<PatchResponse>, StatusCode> {
    let serial = body.serial_number.or(q.serial_number).unwrap_or(0);
    let k = key(0, serial);
    info!("patch_screen: '{}' {} changes", name, body.changes.len());

    let mut store = STORE.lock().map_err(|e| { error!("patch_screen: {}", e); StatusCode::INTERNAL_SERVER_ERROR })?;
    let entry = match store.get_mut(&k) {
        Some(e) => e,
        None => return Ok(Json(PatchResponse {
            applied: 0, rejected: body.changes.len(), status: "error".into(),
            errors: Some(vec![DeltaError { path: "".into(), message: "device not found".into() }]),
        })),
    };
    let screen = match entry.screens.iter_mut().find(|s| s.name == name) {
        Some(s) => s,
        None => return Ok(Json(PatchResponse {
            applied: 0, rejected: body.changes.len(), status: "error".into(),
            errors: Some(vec![DeltaError { path: "".into(), message: format!("screen '{}' not found", name) }]),
        })),
    };

    let mut applied = 0usize;
    let mut rejected = 0usize;
    let mut errors = Vec::new();
    for c in &body.changes {
        match apply_delta(&mut screen.json, &c.path, &c.value) {
            Ok(_) => applied += 1,
            Err(m) => { rejected += 1; errors.push(DeltaError { path: c.path.clone(), message: m }); }
        }
    }
    Ok(Json(PatchResponse {
        applied, rejected,
        status: if rejected == 0 { "ok".into() } else if applied > 0 { "partial".into() } else { "error".into() },
        errors: if errors.is_empty() { None } else { Some(errors) },
    }))
}

/// PATCH /api/eez-device/screens/:name/widgets/:widgetId
pub async fn patch_widget(
    Path((name, widget_id)): Path<(String, String)>,
    Query(q): Query<ScreenQuery>,
    Json(body): Json<PatchBody>,
) -> Result<Json<PatchResponse>, StatusCode> {
    let serial = body.serial_number.or(q.serial_number).unwrap_or(0);
    let k = key(0, serial);
    info!("patch_widget: '{}/{}' {} changes", name, widget_id, body.changes.len());

    let mut store = STORE.lock().map_err(|e| { error!("patch_widget: {}", e); StatusCode::INTERNAL_SERVER_ERROR })?;
    let entry = match store.get_mut(&k) {
        Some(e) => e,
        None => return Ok(Json(PatchResponse {
            applied: 0, rejected: body.changes.len(), status: "error".into(),
            errors: Some(vec![DeltaError { path: "".into(), message: "device not found".into() }]),
        })),
    };
    let screen = match entry.screens.iter_mut().find(|s| s.name == name) {
        Some(s) => s,
        None => return Ok(Json(PatchResponse {
            applied: 0, rejected: body.changes.len(), status: "error".into(),
            errors: Some(vec![DeltaError { path: "".into(), message: format!("screen '{}' not found", name) }]),
        })),
    };

    let mut applied = 0usize;
    let mut rejected = 0usize;
    let mut errors = Vec::new();
    for c in &body.changes {
        let full = format!("widgets.{}.{}", widget_id, c.path);
        match apply_delta(&mut screen.json, &full, &c.value) {
            Ok(_) => applied += 1,
            Err(m) => { rejected += 1; errors.push(DeltaError { path: c.path.clone(), message: m }); }
        }
    }
    Ok(Json(PatchResponse {
        applied, rejected,
        status: if rejected == 0 { "ok".into() } else if applied > 0 { "partial".into() } else { "error".into() },
        errors: if errors.is_empty() { None } else { Some(errors) },
    }))
}

// ═══════════════════════════════════════════════════════════════════
// BACnet-style handlers (DeviceRestClient BACnet fallback)
// ═══════════════════════════════════════════════════════════════════

#[derive(Debug, Deserialize)]
pub struct BacnetPushRequest {
    pub serial_number: i32,
    pub screens: Vec<DeployScreenBody>,
}

#[derive(Debug, Deserialize)]
pub struct BacnetPullRequest {
    pub serial_number: i32,
}

pub async fn push_screens_bacnet(
    Path(panel_id): Path<i32>,
    Json(req): Json<BacnetPushRequest>,
) -> Result<Json<DeployAllResponse>, StatusCode> {
    let k = key(panel_id, req.serial_number);
    info!("bacnet_push: panel={} serial={} screens={}", panel_id, req.serial_number, req.screens.len());
    let mut errors = Vec::new();
    let mut stored = Vec::new();
    for (i, s) in req.screens.iter().enumerate() {
        if s.name.is_empty() { errors.push(DeployError { screen: i, name: "".into(), message: "empty name".into() }); continue; }
        stored.push(StoredScreen { name: s.name.clone(), json: s.json.clone() });
    }
    let deployed = stored.len();
    let failed = errors.len();
    STORE.lock().map_err(|e| { error!("bacnet_push: {}", e); StatusCode::INTERNAL_SERVER_ERROR })?
        .insert(k, DeviceStore {
            screens: stored,
            meta: DeviceMeta { panel_name: format!("T3-ESP-{}", panel_id), serial_number: req.serial_number },
        });
    Ok(Json(DeployAllResponse {
        deployed, failed,
        status: if failed == 0 && deployed > 0 { "ok".into() } else if deployed > 0 { "partial".into() } else { "error".into() },
        errors: if errors.is_empty() { None } else { Some(errors) },
    }))
}

pub async fn pull_screens_bacnet(
    Path(panel_id): Path<i32>,
    Json(req): Json<BacnetPullRequest>,
) -> Result<Json<LoadAllResponse>, StatusCode> {
    let k = key(panel_id, req.serial_number);
    let store = STORE.lock().map_err(|e| { error!("bacnet_pull: {}", e); StatusCode::INTERNAL_SERVER_ERROR })?;
    match store.get(&k) {
        Some(d) => Ok(Json(LoadAllResponse { screens: d.screens.clone(), meta: Some(d.meta.clone()) })),
        None => Ok(Json(LoadAllResponse {
            screens: vec![],
            meta: Some(DeviceMeta { panel_name: format!("T3-ESP-{}", panel_id), serial_number: req.serial_number }),
        })),
    }
}

// ═══════════════════════════════════════════════════════════════════
// Image (bitmap) store — images transferred separately from screen JSON
// ═══════════════════════════════════════════════════════════════════

lazy_static::lazy_static! {
    /// (panel_id, image_name) → base64-encoded image bytes
    static ref IMG_STORE: Mutex<HashMap<(i32, String), Vec<u8>>> = Mutex::new(HashMap::new());
}

#[derive(Debug, Deserialize)]
pub struct PushImageBody {
    pub name: String,
    /// Base64-encoded image binary (PNG, converted to LVGL format by lv_img_conv_v9)
    pub data_base64: String,
}

#[derive(Debug, Serialize)]
pub struct PushImageResponse {
    pub name: String,
    pub status: String,
}

#[derive(Debug, Serialize)]
pub struct PullImageResponse {
    pub name: String,
    pub data_base64: String,
}

/// POST /api/eez-device/images/push/:panelId — upload a bitmap to mock device
pub async fn push_image(
    Path(panel_id): Path<i32>,
    Json(body): Json<PushImageBody>,
) -> Result<Json<PushImageResponse>, StatusCode> {
    info!("push_image: panel={} name='{}' bytes={}", panel_id, body.name, body.data_base64.len());
    if body.name.is_empty() {
        return Err(StatusCode::BAD_REQUEST);
    }
    let mut store = IMG_STORE.lock().map_err(|e| { error!("push_image: {}", e); StatusCode::INTERNAL_SERVER_ERROR })?;
    store.insert((panel_id, body.name.clone()), body.data_base64.into_bytes());
    Ok(Json(PushImageResponse { name: body.name, status: "ok".into() }))
}

/// GET /api/eez-device/images/pull/:panelId/:name — download a bitmap from mock device
pub async fn pull_image(
    Path((panel_id, name)): Path<(i32, String)>,
) -> Result<Json<PullImageResponse>, StatusCode> {
    let store = IMG_STORE.lock().map_err(|e| { error!("pull_image: {}", e); StatusCode::INTERNAL_SERVER_ERROR })?;
    match store.get(&(panel_id, name.clone())) {
        Some(data) => Ok(Json(PullImageResponse {
            name,
            data_base64: String::from_utf8_lossy(data).to_string(),
        })),
        None => { error!("pull_image: '{}' not found", name); Err(StatusCode::NOT_FOUND) }
    }
}

/// DELETE /api/eez-device/images/:panelId/:name — remove a bitmap from mock device
pub async fn delete_image(
    Path((panel_id, name)): Path<(i32, String)>,
) -> StatusCode {
    info!("delete_image: panel={} name='{}'", panel_id, name);
    let mut store = IMG_STORE.lock().unwrap_or_else(|e| e.into_inner());
    store.remove(&(panel_id, name));
    StatusCode::OK
}

// ═══════════════════════════════════════════════════════════════════
// Device list (for "Import from Device" UI)
// ═══════════════════════════════════════════════════════════════════

#[derive(Debug, Serialize)]
pub struct MockDeviceInfo {
    pub serial_number: i32,
    pub panel_name: String,
    pub ip: String,
    pub panel_id: i32,
    pub connection_type: String,
    pub screen_count: usize,
}

/// GET /api/eez-device/devices — list available mock devices
///
/// Dynamically parses firmware to report screen count so the UI shows
/// accurate info (e.g. "12 screens found").
pub async fn list_devices() -> Json<Vec<MockDeviceInfo>> {
    let screen_count = parse_firmware_screens()
        .map(|s| s.len())
        .unwrap_or(0);

    let devices = vec![MockDeviceInfo {
        serial_number: 12345,
        panel_name: "T3-ESP32-Firmware".into(),
        ip: "192.168.1.100".into(),
        panel_id: 0,
        connection_type: "BACnet".into(),
        screen_count,
    }];

    info!("list_devices: 1 device, {} screens", screen_count);
    Json(devices)
}

// ═══════════════════════════════════════════════════════════════════
// Dot-path delta helper
// ═══════════════════════════════════════════════════════════════════

fn apply_delta(root: &mut Value, path: &str, new_value: &Value) -> Result<(), String> {
    let segs: Vec<&str> = path.split('.').collect();
    if segs.is_empty() { return Err("empty path".into()); }
    let mut cur = root;
    for (i, seg) in segs.iter().enumerate() {
        if i == segs.len() - 1 {
            cur[seg] = new_value.clone();
            return Ok(());
        }
        cur = cur.get_mut(seg).ok_or_else(|| format!("key '{}' not found", seg))?;
    }
    Ok(())
}
