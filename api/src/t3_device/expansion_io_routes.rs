// Expansion IO API Routes
// DB-backed GET/POST/DELETE endpoints for Str_Extio_point (EXTIO_DEVICES table).
// A /refresh stub fires Action 17 entryType=51 — returns 503 until C++ adds
// case 51 in the GET_WEBVIEW_LIST switch in BacnetWebView.cpp.

use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::Json,
    Router,
};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tracing::{error, info};

use crate::app_state::T3AppState;
use crate::entity::t3_device::extio_devices;
use crate::t3_device::t3_ffi_sync_service::WebViewMessageType;
use sea_orm::*;

// ⚠️  C++ has not yet implemented this entry type in GET_WEBVIEW_LIST.
// When BacnetWebView.cpp adds `case BAC_EXTIO_DEVICES:` the refresh
// endpoint will start returning live data automatically.
const BAC_EXTIO_DEVICES: i32 = 51;

// ---------------------------------------------------------------------------
// Request / Response types
// ---------------------------------------------------------------------------

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExtioResponse {
    pub success: bool,
    pub message: String,
    pub data: Option<Value>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExtioListResponse {
    pub success: bool,
    pub count: usize,
    pub data: Vec<Value>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpsertExtioRequest {
    pub extio_id: Option<i32>,
    pub product_id: Option<i32>,
    pub port: Option<i32>,
    pub modbus_id: Option<i32>,
    pub last_contact_time: Option<i32>,
    pub input_start: Option<i32>,
    pub input_end: Option<i32>,
    pub output_start: Option<i32>,
    pub output_end: Option<i32>,
    pub enable: Option<i32>,
    pub extio_serial_number: Option<i32>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RefreshResponse {
    pub success: bool,
    pub message: String,
    pub items: Vec<Value>,
    pub count: i32,
    pub timestamp: String,
}

// ---------------------------------------------------------------------------
// Route registration
// ---------------------------------------------------------------------------

pub fn create_expansion_io_routes() -> Router<T3AppState> {
    Router::new()
        // List all extio devices for a serial (works now — DB-backed)
        .route(
            "/devices/:serial/settings/expansion-io",
            axum::routing::get(list_expansion_io).post(upsert_expansion_io),
        )
        // Delete a single extio device by ExtIO_ID (works now — DB-backed)
        .route(
            "/devices/:serial/settings/expansion-io/:extio_id",
            axum::routing::delete(delete_expansion_io),
        )
        // FFI refresh stub (works once C++ implements case BAC_EXTIO_DEVICES)
        .route(
            "/devices/:serial/settings/expansion-io/refresh",
            axum::routing::post(refresh_expansion_io),
        )
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

/// GET /api/t3-device/devices/:serial/settings/expansion-io
async fn list_expansion_io(
    State(state): State<T3AppState>,
    Path(serial): Path<i32>,
) -> Result<Json<ExtioListResponse>, (StatusCode, String)> {
    let db = match &state.t3_device_conn {
        Some(conn) => conn.lock().await.clone(),
        None => return Err((StatusCode::SERVICE_UNAVAILABLE, "Database unavailable".to_string())),
    };

    let records = extio_devices::Entity::find()
        .filter(extio_devices::Column::SerialNumber.eq(serial))
        .all(&db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)))?;

    let count = records.len();
    let data: Vec<Value> = records.into_iter().map(|r| json!(r)).collect();

    info!("✅ Found {} expansion IO device(s) for serial {}", count, serial);
    Ok(Json(ExtioListResponse {
        success: true,
        count,
        data,
    }))
}

/// POST /api/t3-device/devices/:serial/settings/expansion-io
/// Inserts or updates a single EXTIO device record (matched by extio_id).
async fn upsert_expansion_io(
    State(state): State<T3AppState>,
    Path(serial): Path<i32>,
    Json(payload): Json<UpsertExtioRequest>,
) -> Result<Json<ExtioResponse>, (StatusCode, String)> {
    let db = match &state.t3_device_conn {
        Some(conn) => conn.lock().await.clone(),
        None => return Err((StatusCode::SERVICE_UNAVAILABLE, "Database unavailable".to_string())),
    };

    // Try to find existing record by serial + extio_id
    let existing = if let Some(eid) = payload.extio_id {
        extio_devices::Entity::find()
            .filter(extio_devices::Column::SerialNumber.eq(serial))
            .filter(extio_devices::Column::ExtioId.eq(eid))
            .one(&db)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)))?
    } else {
        None
    };

    if let Some(record) = existing {
        let mut m: extio_devices::ActiveModel = record.into();

        if let Some(v) = payload.product_id       { m.product_id          = Set(Some(v)); }
        if let Some(v) = payload.port              { m.port                = Set(Some(v)); }
        if let Some(v) = payload.modbus_id         { m.modbus_id           = Set(Some(v)); }
        if let Some(v) = payload.last_contact_time { m.last_contact_time   = Set(Some(v)); }
        if let Some(v) = payload.input_start       { m.input_start         = Set(Some(v)); }
        if let Some(v) = payload.input_end         { m.input_end           = Set(Some(v)); }
        if let Some(v) = payload.output_start      { m.output_start        = Set(Some(v)); }
        if let Some(v) = payload.output_end        { m.output_end          = Set(Some(v)); }
        if let Some(v) = payload.enable            { m.enable              = Set(Some(v)); }
        if let Some(v) = payload.extio_serial_number { m.extio_serial_number = Set(Some(v)); }
        m.updated_at = Set(Some(chrono::Utc::now().to_rfc3339()));

        match m.update(&db).await {
            Ok(updated) => {
                info!("✅ Expansion IO device updated for serial {}", serial);
                Ok(Json(ExtioResponse {
                    success: true,
                    message: "Expansion IO device updated successfully".to_string(),
                    data: Some(json!(updated)),
                }))
            }
            Err(e) => {
                error!("Failed to update expansion IO device: {}", e);
                Err((StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to update: {}", e)))
            }
        }
    } else {
        // Insert new record
        let new_record = extio_devices::ActiveModel {
            serial_number:        Set(serial),
            extio_id:             Set(payload.extio_id),
            product_id:           Set(payload.product_id),
            port:                 Set(payload.port),
            modbus_id:            Set(payload.modbus_id),
            last_contact_time:    Set(payload.last_contact_time),
            input_start:          Set(payload.input_start),
            input_end:            Set(payload.input_end),
            output_start:         Set(payload.output_start),
            output_end:           Set(payload.output_end),
            enable:               Set(payload.enable),
            extio_serial_number:  Set(payload.extio_serial_number),
            created_at:           Set(Some(chrono::Utc::now().to_rfc3339())),
            updated_at:           Set(Some(chrono::Utc::now().to_rfc3339())),
        };

        match new_record.insert(&db).await {
            Ok(inserted) => {
                info!("✅ Expansion IO device created for serial {}", serial);
                Ok(Json(ExtioResponse {
                    success: true,
                    message: "Expansion IO device created successfully".to_string(),
                    data: Some(json!(inserted)),
                }))
            }
            Err(e) => Err((StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to create: {}", e))),
        }
    }
}

/// DELETE /api/t3-device/devices/:serial/settings/expansion-io/:extio_id
async fn delete_expansion_io(
    State(state): State<T3AppState>,
    Path((serial, extio_id)): Path<(i32, i32)>,
) -> Result<Json<ExtioResponse>, (StatusCode, String)> {
    let db = match &state.t3_device_conn {
        Some(conn) => conn.lock().await.clone(),
        None => return Err((StatusCode::SERVICE_UNAVAILABLE, "Database unavailable".to_string())),
    };

    let record = extio_devices::Entity::find()
        .filter(extio_devices::Column::SerialNumber.eq(serial))
        .filter(extio_devices::Column::ExtioId.eq(extio_id))
        .one(&db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)))?;

    match record {
        None => Err((
            StatusCode::NOT_FOUND,
            format!("Expansion IO device {} not found for serial {}", extio_id, serial),
        )),
        Some(r) => {
            r.delete(&db)
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to delete: {}", e)))?;

            info!("✅ Expansion IO device {} deleted for serial {}", extio_id, serial);
            Ok(Json(ExtioResponse {
                success: true,
                message: format!("Expansion IO device {} deleted", extio_id),
                data: None,
            }))
        }
    }
}

/// POST /api/t3-device/devices/:serial/settings/expansion-io/refresh
///
/// Fires GET_WEBVIEW_LIST (Action 17) with entryType=51.
/// ⚠️  Returns 503 until C++ BacnetWebView.cpp adds `case BAC_EXTIO_DEVICES (51)`
/// to the GET_WEBVIEW_LIST switch that reads g_extio_config_data / Str_Extio_point.
async fn refresh_expansion_io(
    State(state): State<T3AppState>,
    Path(serial): Path<i32>,
) -> Result<Json<RefreshResponse>, (StatusCode, String)> {
    info!("GET_WEBVIEW_LIST: Refreshing expansion IO from device - Serial: {}", serial);

    let db = match &state.t3_device_conn {
        Some(conn) => conn.lock().await.clone(),
        None => return Err((StatusCode::SERVICE_UNAVAILABLE, "Database unavailable".to_string())),
    };

    use crate::entity::t3_device::devices;
    let panel_id = match devices::Entity::find()
        .filter(devices::Column::SerialNumber.eq(serial))
        .one(&db)
        .await
    {
        Ok(Some(device)) => device.panel_id.unwrap_or(0),
        Ok(None) => {
            error!("Device not found for serial: {}", serial);
            return Err((StatusCode::NOT_FOUND, format!("Device {} not found", serial)));
        }
        Err(e) => {
            error!("Database error: {:?}", e);
            return Err((StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)));
        }
    };

    let refresh_json = serde_json::json!({
        "action": WebViewMessageType::GET_WEBVIEW_LIST as i32,
        "panelId": panel_id,
        "serialNumber": serial,
        "entryType": BAC_EXTIO_DEVICES,
        "entryIndexStart": 0,
        "entryIndexEnd": 11,   // BAC_EXTIO_COUNT - 1
    });

    match call_refresh_ffi(WebViewMessageType::GET_WEBVIEW_LIST as i32, refresh_json).await {
        Ok(response) => {
            let response_json: Value = serde_json::from_str(&response).map_err(|e| {
                (StatusCode::INTERNAL_SERVER_ERROR, format!("Invalid response from device: {}", e))
            })?;

            let success = response_json.get("success").and_then(|v| v.as_bool()).unwrap_or(false);
            if !success {
                let error_msg = response_json
                    .get("message")
                    .and_then(|v| v.as_str())
                    .unwrap_or("Unknown error");
                let debug_msg = response_json
                    .get("debug")
                    .and_then(|v| v.as_str())
                    .unwrap_or("");

                if debug_msg.contains("empty response") || error_msg.contains("not implemented") {
                    return Err((
                        StatusCode::NOT_IMPLEMENTED,
                        "GET_WEBVIEW_LIST (Action 17) for expansion IO is not yet implemented in C++. \
                         Add `case BAC_EXTIO_DEVICES (51):` to the GET_WEBVIEW_LIST switch \
                         in BacnetWebView.cpp reading from g_extio_config_data / Str_Extio_point."
                            .to_string(),
                    ));
                }

                return Err((StatusCode::INTERNAL_SERVER_ERROR, error_msg.to_string()));
            }

            let items = response_json
                .get("items")
                .and_then(|v| v.as_array())
                .cloned()
                .unwrap_or_default();

            let count = items.len() as i32;
            info!("✅ Refreshed {} expansion IO device(s) from device", count);
            Ok(Json(RefreshResponse {
                success: true,
                message: format!("Refreshed expansion IO from device ({} item(s))", count),
                items,
                count,
                timestamp: chrono::Utc::now().to_rfc3339(),
            }))
        }
        Err(e) => {
            if e.contains("not implemented") || e.contains("empty response") {
                return Err((
                    StatusCode::NOT_IMPLEMENTED,
                    "GET_WEBVIEW_LIST (Action 17) for expansion IO is not yet implemented in C++."
                        .to_string(),
                ));
            }
            Err((StatusCode::INTERNAL_SERVER_ERROR, format!("FFI call failed: {}", e)))
        }
    }
}

// ---------------------------------------------------------------------------
// FFI helper (same pattern as users_refresh_routes.rs)
// ---------------------------------------------------------------------------

async fn call_refresh_ffi(action: i32, refresh_json: Value) -> Result<String, String> {
    use crate::t3_device::t3_ffi_sync_service::load_t3000_function;

    let input_str = refresh_json.to_string();
    info!("📤 Sending to C++ (Action {}): {}", action, input_str);

    tokio::task::spawn_blocking(|| {
        unsafe {
            if !load_t3000_function() {
                return Err("T3000 functions not loaded".to_string());
            }
        }
        Ok(())
    })
    .await
    .map_err(|e| format!("Spawn error: {}", e))?
    .map_err(|e: String| e)?;

    tokio::task::spawn_blocking(move || {
        use crate::t3_device::t3_ffi_sync_service::BACNETWEBVIEW_HANDLE_WEBVIEW_MSG_FN;

        const BUFFER_SIZE: usize = 1048576;
        let mut buffer: Vec<u8> = vec![0; BUFFER_SIZE];

        let input_bytes = input_str.as_bytes();
        if input_bytes.len() >= BUFFER_SIZE {
            return Err("Input JSON too large for buffer".to_string());
        }
        buffer[..input_bytes.len()].copy_from_slice(input_bytes);
        buffer[input_bytes.len()] = 0;

        unsafe {
            if let Some(func) = BACNETWEBVIEW_HANDLE_WEBVIEW_MSG_FN {
                let result = func(
                    action,
                    buffer.as_mut_ptr() as *mut std::os::raw::c_char,
                    buffer.len() as i32,
                );
                match result {
                    0 => {
                        let null_pos = buffer.iter().position(|&b| b == 0).unwrap_or(buffer.len());
                        let response = String::from_utf8_lossy(&buffer[..null_pos]).to_string();
                        info!("📥 C++ Response (Action {}): {}", action, response);
                        if response.is_empty() || response == "{}" {
                            return Err("Action not implemented in C++ - empty response".to_string());
                        }
                        Ok(response)
                    }
                    -2 => Err("MFC application not initialized".to_string()),
                    code => Err(format!("FFI call failed with code: {}", code)),
                }
            } else {
                Err("BacnetWebView_HandleWebViewMsg function not loaded".to_string())
            }
        }
    })
    .await
    .map_err(|e| format!("Task spawn error: {}", e))?
}
