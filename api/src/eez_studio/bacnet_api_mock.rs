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

// ═══════════════════════════════════════════════════════════════════
// REST handlers (mirror ESP32 /api/v1/screens)
// ═══════════════════════════════════════════════════════════════════

/// GET /api/eez-device/screens
pub async fn get_screens(
    Query(q): Query<ScreenQuery>,
) -> Result<Json<LoadAllResponse>, StatusCode> {
    let k = key(0, q.serial_number.unwrap_or(0));
    let store = STORE.lock().map_err(|e| {
        error!("get_screens: mutex: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;
    match store.get(&k) {
        Some(d) => {
            info!("get_screens: {} screens", d.screens.len());
            Ok(Json(LoadAllResponse { screens: d.screens.clone(), meta: Some(d.meta.clone()) }))
        }
        None => {
            info!("get_screens: empty, serial={}", q.serial_number.unwrap_or(0));
            Ok(Json(LoadAllResponse {
                screens: vec![],
                meta: Some(DeviceMeta { panel_name: "T3-ESP-Mock".into(), serial_number: q.serial_number.unwrap_or(0) }),
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

/// GET /api/eez-device/screens/:name
pub async fn get_screen(
    Path(name): Path<String>,
    Query(q): Query<ScreenQuery>,
) -> Result<Json<Value>, StatusCode> {
    let k = key(0, q.serial_number.unwrap_or(0));
    let store = STORE.lock().map_err(|e| { error!("get_screen: {}", e); StatusCode::INTERNAL_SERVER_ERROR })?;
    match store.get(&k).and_then(|d| d.screens.iter().find(|s| s.name == name)) {
        Some(s) => Ok(Json(s.json.clone())),
        None => { error!("get_screen: '{}' not found", name); Err(StatusCode::NOT_FOUND) }
    }
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
    pub ip_address: String,
    pub panel_id: i32,
    pub connection_type: String,
    pub screen_count: usize,
}

/// GET /api/eez-device/devices — list available mock devices
pub async fn list_devices() -> Json<Vec<MockDeviceInfo>> {
    let store = STORE.lock().unwrap_or_else(|e| e.into_inner());
    let mut devices: Vec<MockDeviceInfo> = store.iter().map(|((panel_id, serial), data)| {
        MockDeviceInfo {
            serial_number: *serial,
            panel_name: data.meta.panel_name.clone(),
            ip_address: format!("192.168.1.{}", serial % 254 + 1),
            panel_id: *panel_id,
            connection_type: "BACnet".into(),
            screen_count: data.screens.len(),
        }
    }).collect();

    // Always include a default device so the list is never empty
    if devices.is_empty() {
        devices.push(MockDeviceInfo {
            serial_number: 12345,
            panel_name: "T3-ESP-Mock".into(),
            ip_address: "192.168.1.100".into(),
            panel_id: 0,
            connection_type: "BACnet".into(),
            screen_count: 0,
        });
    }

    info!("list_devices: {} devices", devices.len());
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
