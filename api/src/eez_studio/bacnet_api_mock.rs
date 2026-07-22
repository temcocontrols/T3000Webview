//! Mock BACnet device API — simulates the real FFI→BACnet→ESP32 pipeline.
//!
//! When `DeviceRestClient` cannot reach the ESP32 REST API, it falls back to
//! the BACnet path through our Rust backend. These handlers simulate that path
//! with an in-memory store, matching the same JSON contract the real C++ FFI
//! uses (DEPLOY_FIRMWARE=18 / READ_FIRMWARE=19 in `t3_ffi_sync_service.rs`).
//!
//! ## Endpoints
//!   - `POST /api/eez/screens/push/:panelId`  — store screens
//!   - `POST /api/eez/screens/pull/:panelId`  — retrieve screens
//!
//! ## Store key
//!   `(panel_id: i32, serial_number: i32)` — matches C++ `panelId` + `serialNumber`

use axum::{extract::Path, http::StatusCode, Json};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::sync::Mutex;
use tracing::{error, info};

// ═══════════════════════════════════════════════════════════════════
// Types — match the real C++ FFI contract exactly
// ═══════════════════════════════════════════════════════════════════

/// Per-device store key
type DeviceKey = (i32, i32); // (panel_id, serial_number)

/// Stored per device: list of screens + metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
struct DeviceStore {
    screens: Vec<StoredScreen>,
    meta: DeviceMeta,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct StoredScreen {
    name: String,
    json: Value, // the full DeviceScreen from firmware-export.ts
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct DeviceMeta {
    panel_name: String,
    serial_number: i32,
}

// ═══════════════════════════════════════════════════════════════════
// Request / Response types — match C++ handler I/O
// ═══════════════════════════════════════════════════════════════════

#[derive(Debug, Deserialize)]
pub struct PushScreensRequest {
    pub serial_number: i32,
    pub screens: Vec<PushScreen>,
}

#[derive(Debug, Deserialize)]
pub struct PushScreen {
    pub name: String,
    pub json: Value,
}

#[derive(Debug, Deserialize)]
pub struct PullScreensRequest {
    pub serial_number: i32,
}

#[derive(Debug, Serialize)]
pub struct PushScreensResponse {
    pub deployed: usize,
    pub failed: usize,
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub errors: Option<Vec<PushError>>,
}

#[derive(Debug, Serialize)]
pub struct PushError {
    pub screen: usize,
    pub name: String,
    pub message: String,
}

#[derive(Debug, Serialize)]
pub struct PullScreensResponse {
    pub screens: Vec<StoredScreen>,
    pub meta: DeviceMeta,
}

// ═══════════════════════════════════════════════════════════════════
// In-memory store
// ═══════════════════════════════════════════════════════════════════

lazy_static::lazy_static! {
    static ref DEVICE_STORE: Mutex<HashMap<DeviceKey, DeviceStore>> = Mutex::new(HashMap::new());
}

// ═══════════════════════════════════════════════════════════════════
// Handlers
// ═══════════════════════════════════════════════════════════════════

/// Push screen definitions to the mock device.
///
/// POST /api/eez/screens/push/:panelId
///
/// Real C++ equivalent: `HandleWebViewMsg(DEPLOY_FIRMWARE=18)` —
///   compresses JSON, chunks into 200-byte blocks, pushes via
///   `WritePrivateData_Blocking(WRITE_JSON_ITEM)`.
pub async fn push_screens(
    Path(panel_id): Path<i32>,
    Json(req): Json<PushScreensRequest>,
) -> Result<Json<PushScreensResponse>, StatusCode> {
    let key: DeviceKey = (panel_id, req.serial_number);

    info!(
        "mock_device::push_screens: panelId={} serial={} screens={}",
        panel_id,
        req.serial_number,
        req.screens.len()
    );

    let mut errors = Vec::new();
    let mut stored: Vec<StoredScreen> = Vec::new();

    for (i, screen) in req.screens.iter().enumerate() {
        if screen.name.is_empty() {
            errors.push(PushError {
                screen: i,
                name: screen.name.clone(),
                message: "screen name is empty".into(),
            });
            continue;
        }
        stored.push(StoredScreen {
            name: screen.name.clone(),
            json: screen.json.clone(),
        });
    }

    let deployed = stored.len();
    let failed = errors.len();

    // Persist to in-memory store
    {
        let mut store = DEVICE_STORE
            .lock()
            .map_err(|e| {
                error!("mock_device::push_screens: mutex poisoned: {}", e);
                StatusCode::INTERNAL_SERVER_ERROR
            })?;

        store.insert(
            key,
            DeviceStore {
                screens: stored,
                meta: DeviceMeta {
                    panel_name: format!("T3-ESP-Mock-{}", panel_id),
                    serial_number: req.serial_number,
                },
            },
        );
    }

    info!(
        "mock_device::push_screens: stored {} screens for panelId={} serial={}",
        deployed, panel_id, req.serial_number
    );

    Ok(Json(PushScreensResponse {
        deployed,
        failed,
        status: if failed == 0 && deployed > 0 {
            "ok".into()
        } else if deployed > 0 {
            "partial".into()
        } else {
            "error".into()
        },
        errors: if errors.is_empty() { None } else { Some(errors) },
    }))
}

/// Pull screen definitions from the mock device.
///
/// POST /api/eez/screens/pull/:panelId
///
/// Real C++ equivalent: `HandleWebViewMsg(READ_FIRMWARE=19)` —
///   reads 200-byte chunks via BACnet, decompresses, returns JSON.
pub async fn pull_screens(
    Path(panel_id): Path<i32>,
    Json(req): Json<PullScreensRequest>,
) -> Result<Json<PullScreensResponse>, StatusCode> {
    let key: DeviceKey = (panel_id, req.serial_number);

    info!(
        "mock_device::pull_screens: panelId={} serial={}",
        panel_id, req.serial_number
    );

    let store = DEVICE_STORE
        .lock()
        .map_err(|e| {
            error!("mock_device::pull_screens: mutex poisoned: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    match store.get(&key) {
        Some(entry) => {
            info!(
                "mock_device::pull_screens: found {} screens for panelId={} serial={}",
                entry.screens.len(),
                panel_id,
                req.serial_number
            );
            Ok(Json(PullScreensResponse {
                screens: entry.screens.clone(),
                meta: entry.meta.clone(),
            }))
        }
        None => {
            info!(
                "mock_device::pull_screens: no screens stored for panelId={} serial={}",
                panel_id, req.serial_number
            );
            // Return empty — matches what real device would do when no screens deployed
            Ok(Json(PullScreensResponse {
                screens: vec![],
                meta: DeviceMeta {
                    panel_name: format!("T3-ESP-Mock-{}", panel_id),
                    serial_number: req.serial_number,
                },
            }))
        }
    }
}
