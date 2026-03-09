// Email Settings API Routes
// DB-backed GET/PUT endpoints for Str_Email_point (EMAIL_ALARMS table).
// A /refresh stub fires Action 17 entryType=50 — returns 503 until C++ adds
// case 50 in the GET_WEBVIEW_LIST switch in BacnetWebView.cpp.

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
use crate::entity::t3_device::email_alarms;
use crate::t3_device::t3_ffi_sync_service::WebViewMessageType;
use sea_orm::*;

// ⚠️  C++ has not yet implemented this entry type in GET_WEBVIEW_LIST.
// When BacnetWebView.cpp adds `case BAC_EMAIL_SETTINGS:` the refresh
// endpoint will start returning live data automatically.
const BAC_EMAIL_SETTINGS: i32 = 50;

// ---------------------------------------------------------------------------
// Request / Response types
// ---------------------------------------------------------------------------

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EmailSettingsResponse {
    pub success: bool,
    pub message: String,
    pub data: Option<Value>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateEmailSettingsRequest {
    pub smtp_server: Option<String>,
    pub smtp_port: Option<i32>,
    pub email_address: Option<String>,
    pub user_name: Option<String>,
    pub password: Option<String>,
    pub secure_connection_type: Option<i32>,
    pub to1_addr: Option<String>,
    pub to2_addr: Option<String>,
    pub to3_addr: Option<String>,
    pub to4_addr: Option<String>,
    pub enable: Option<i32>,
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

pub fn create_email_settings_routes() -> Router<T3AppState> {
    Router::new()
        // DB-backed CRUD (works now)
        .route(
            "/devices/:serial/settings/email",
            axum::routing::get(get_email_settings).put(update_email_settings),
        )
        // FFI refresh stub (works once C++ implements case BAC_EMAIL_SETTINGS)
        .route(
            "/devices/:serial/settings/email/refresh",
            axum::routing::post(refresh_email_settings),
        )
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

/// GET /api/t3-device/devices/:serial/settings/email
async fn get_email_settings(
    State(state): State<T3AppState>,
    Path(serial): Path<i32>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let db = match &state.t3_device_conn {
        Some(conn) => conn.lock().await.clone(),
        None => return Err((StatusCode::SERVICE_UNAVAILABLE, "Database unavailable".to_string())),
    };

    match email_alarms::Entity::find()
        .filter(email_alarms::Column::SerialNumber.eq(serial))
        .one(&db)
        .await
    {
        Ok(Some(record)) => {
            info!("✅ Email settings found for device {}", serial);
            Ok(Json(json!({ "success": true, "data": record })))
        }
        Ok(None) => Err((
            StatusCode::NOT_FOUND,
            format!("Email settings not found for device {}", serial),
        )),
        Err(e) => Err((StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e))),
    }
}

/// PUT /api/t3-device/devices/:serial/settings/email
async fn update_email_settings(
    State(state): State<T3AppState>,
    Path(serial): Path<i32>,
    Json(payload): Json<UpdateEmailSettingsRequest>,
) -> Result<Json<EmailSettingsResponse>, (StatusCode, String)> {
    let db = match &state.t3_device_conn {
        Some(conn) => conn.lock().await.clone(),
        None => return Err((StatusCode::SERVICE_UNAVAILABLE, "Database unavailable".to_string())),
    };

    let existing = email_alarms::Entity::find()
        .filter(email_alarms::Column::SerialNumber.eq(serial))
        .one(&db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)))?;

    if let Some(record) = existing {
        let mut m: email_alarms::ActiveModel = record.into();

        if let Some(v) = payload.smtp_server        { m.smtp_server             = Set(Some(v)); }
        if let Some(v) = payload.smtp_port          { m.smtp_port               = Set(Some(v)); }
        if let Some(v) = payload.email_address      { m.email_address           = Set(Some(v)); }
        if let Some(v) = payload.user_name          { m.user_name               = Set(Some(v)); }
        if let Some(v) = payload.password           { m.password                = Set(Some(v)); }
        if let Some(v) = payload.secure_connection_type { m.secure_connection_type = Set(Some(v)); }
        if let Some(v) = payload.to1_addr           { m.to1_addr                = Set(Some(v)); }
        if let Some(v) = payload.to2_addr           { m.to2_addr                = Set(Some(v)); }
        if let Some(v) = payload.to3_addr           { m.to3_addr                = Set(Some(v)); }
        if let Some(v) = payload.to4_addr           { m.to4_addr                = Set(Some(v)); }
        if let Some(v) = payload.enable             { m.enable                  = Set(Some(v)); }
        m.updated_at = Set(Some(chrono::Utc::now().to_rfc3339()));

        match m.update(&db).await {
            Ok(updated) => {
                info!("✅ Email settings updated for device {}", serial);
                Ok(Json(EmailSettingsResponse {
                    success: true,
                    message: "Email settings updated successfully".to_string(),
                    data: Some(json!(updated)),
                }))
            }
            Err(e) => {
                error!("Failed to update email settings: {}", e);
                Err((StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to update: {}", e)))
            }
        }
    } else {
        // Insert new record
        let new_record = email_alarms::ActiveModel {
            serial_number:          Set(serial),
            email_id:               Set(None),
            smtp_server:            Set(payload.smtp_server),
            smtp_port:              Set(payload.smtp_port),
            email_address:          Set(payload.email_address),
            user_name:              Set(payload.user_name),
            password:               Set(payload.password),
            secure_connection_type: Set(payload.secure_connection_type),
            to1_addr:               Set(payload.to1_addr),
            to2_addr:               Set(payload.to2_addr),
            to3_addr:               Set(payload.to3_addr),
            to4_addr:               Set(payload.to4_addr),
            error_code:             Set(None),
            enable:                 Set(payload.enable),
            created_at:             Set(Some(chrono::Utc::now().to_rfc3339())),
            updated_at:             Set(Some(chrono::Utc::now().to_rfc3339())),
        };

        match new_record.insert(&db).await {
            Ok(inserted) => Ok(Json(EmailSettingsResponse {
                success: true,
                message: "Email settings created successfully".to_string(),
                data: Some(json!(inserted)),
            })),
            Err(e) => Err((StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to create: {}", e))),
        }
    }
}

/// POST /api/t3-device/devices/:serial/settings/email/refresh
///
/// Fires GET_WEBVIEW_LIST (Action 17) with entryType=50.
/// ⚠️  Returns 503 until C++ BacnetWebView.cpp adds `case BAC_EMAIL_SETTINGS (50)`
/// to the GET_WEBVIEW_LIST switch that reads g_email_data / Str_Email_point.
async fn refresh_email_settings(
    State(state): State<T3AppState>,
    Path(serial): Path<i32>,
) -> Result<Json<RefreshResponse>, (StatusCode, String)> {
    info!("GET_WEBVIEW_LIST: Refreshing email settings from device - Serial: {}", serial);

    // Look up panel_id
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
        "entryType": BAC_EMAIL_SETTINGS,
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
                    .unwrap_or("Unknown error from device");
                let debug_msg = response_json
                    .get("debug")
                    .and_then(|v| v.as_str())
                    .unwrap_or("");

                if debug_msg.contains("empty response") || error_msg.contains("not implemented") {
                    return Err((
                        StatusCode::NOT_IMPLEMENTED,
                        "GET_WEBVIEW_LIST (Action 17) for email is not yet implemented in C++. \
                         Add `case BAC_EMAIL_SETTINGS (50):` to the GET_WEBVIEW_LIST switch \
                         in BacnetWebView.cpp reading from g_email_data / Str_Email_point."
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
            info!("✅ Refreshed email settings from device ({})", count);
            Ok(Json(RefreshResponse {
                success: true,
                message: format!("Refreshed email settings from device ({} item(s))", count),
                items,
                count,
                timestamp: chrono::Utc::now().to_rfc3339(),
            }))
        }
        Err(e) => {
            if e.contains("not implemented") || e.contains("empty response") {
                return Err((
                    StatusCode::NOT_IMPLEMENTED,
                    "GET_WEBVIEW_LIST (Action 17) for email is not yet implemented in C++."
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
