// Settings API Routes
// Provides RESTful endpoints for device settings (network, communication, time, etc.)
// These are stored in local database and synced with device via existing mechanisms

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
use crate::entity::t3_device::{
    network_settings, communication_settings, protocol_settings,
    time_settings, dyndns_settings, hardware_info, feature_flags
};
use sea_orm::*;

/// Generic response structure
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SettingsResponse {
    pub success: bool,
    pub message: String,
    pub data: Option<Value>,
}

/// Update request for network settings
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateNetworkSettingsRequest {
    pub ip_address: Option<String>,
    pub subnet: Option<String>,
    pub gateway: Option<String>,
    pub mac_address: Option<String>,
    pub tcp_type: Option<i32>,
}

/// Update request for communication settings
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateCommunicationSettingsRequest {
    pub com0_config: Option<i32>,
    pub com1_config: Option<i32>,
    pub com2_config: Option<i32>,
    pub com_baudrate0: Option<i32>,
    pub com_baudrate1: Option<i32>,
    pub com_baudrate2: Option<i32>,
}

/// Update request for time settings
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateTimeSettingsRequest {
    pub time_zone: Option<i32>,
    pub enable_sntp: Option<i32>,
    pub sntp_server: Option<String>,
    pub flag_time_sync_pc: Option<i32>,
}

/// Creates and returns the settings API routes
pub fn create_settings_routes() -> Router<T3AppState> {
    Router::new()
        // Network settings
        .route("/devices/:serial/settings/network", axum::routing::get(get_network_settings))
        .route("/devices/:serial/settings/network", axum::routing::put(update_network_settings))

        // Communication settings
        .route("/devices/:serial/settings/communication", axum::routing::get(get_communication_settings))
        .route("/devices/:serial/settings/communication", axum::routing::put(update_communication_settings))

        // Time settings
        .route("/devices/:serial/settings/time", axum::routing::get(get_time_settings))
        .route("/devices/:serial/settings/time", axum::routing::put(update_time_settings))

        // Protocol settings
        .route("/devices/:serial/settings/protocol", axum::routing::get(get_protocol_settings))

        // DynDNS settings
        .route("/devices/:serial/settings/dyndns", axum::routing::get(get_dyndns_settings))

        // Hardware settings
        .route("/devices/:serial/settings/hardware", axum::routing::get(get_hardware_settings))

        // Features settings
        .route("/devices/:serial/settings/features", axum::routing::get(get_features_settings))
}

/// GET /api/t3-device/devices/:serial/settings/network
async fn get_network_settings(
    State(state): State<T3AppState>,
    Path(serial): Path<i32>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let db = match &state.t3_device_conn {
        Some(conn) => conn.lock().await.clone(),
        None => return Err((StatusCode::SERVICE_UNAVAILABLE, "Database unavailable".to_string())),
    };

    match network_settings::Entity::find()
        .filter(network_settings::Column::SerialNumber.eq(serial))
        .one(&db)
        .await
    {
        Ok(Some(settings)) => Ok(Json(json!({
            "success": true,
            "data": settings
        }))),
        Ok(None) => Err((StatusCode::NOT_FOUND, format!("Network settings not found for device {}", serial))),
        Err(e) => Err((StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e))),
    }
}

/// PUT /api/t3-device/devices/:serial/settings/network
async fn update_network_settings(
    State(state): State<T3AppState>,
    Path(serial): Path<i32>,
    Json(payload): Json<UpdateNetworkSettingsRequest>,
) -> Result<Json<SettingsResponse>, (StatusCode, String)> {
    let db = match &state.t3_device_conn {
        Some(conn) => conn.lock().await.clone(),
        None => return Err((StatusCode::SERVICE_UNAVAILABLE, "Database unavailable".to_string())),
    };

    let existing = network_settings::Entity::find()
        .filter(network_settings::Column::SerialNumber.eq(serial))
        .one(&db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)))?;

    if let Some(settings_model) = existing {
        let mut active_model: network_settings::ActiveModel = settings_model.into();

        if let Some(val) = payload.ip_address {
            active_model.ip_address = Set(Some(val));
        }
        if let Some(val) = payload.subnet {
            active_model.subnet = Set(Some(val));
        }
        if let Some(val) = payload.gateway {
            active_model.gateway = Set(Some(val));
        }
        if let Some(val) = payload.mac_address {
            active_model.mac_address = Set(Some(val));
        }
        if let Some(val) = payload.tcp_type {
            active_model.tcp_type = Set(Some(val));
        }

        active_model.updated_at = Set(Some(chrono::Utc::now().to_rfc3339()));

        match active_model.update(&db).await {
            Ok(updated) => {
                info!("✅ Network settings updated for device {}", serial);
                Ok(Json(SettingsResponse {
                    success: true,
                    message: "Network settings updated successfully".to_string(),
                    data: Some(json!(updated)),
                }))
            }
            Err(e) => {
                error!("Failed to update network settings: {}", e);
                Err((StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to update: {}", e)))
            }
        }
    } else {
        // Create new record
        let new_settings = network_settings::ActiveModel {
            serial_number: Set(serial),
            ip_address: Set(payload.ip_address),
            subnet: Set(payload.subnet),
            gateway: Set(payload.gateway),
            mac_address: Set(payload.mac_address),
            tcp_type: Set(payload.tcp_type),
            created_at: Set(Some(chrono::Utc::now().to_rfc3339())),
            updated_at: Set(Some(chrono::Utc::now().to_rfc3339())),
        };

        match new_settings.insert(&db).await {
            Ok(inserted) => Ok(Json(SettingsResponse {
                success: true,
                message: "Network settings created successfully".to_string(),
                data: Some(json!(inserted)),
            })),
            Err(e) => Err((StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to create: {}", e))),
        }
    }
}

/// GET /api/t3-device/devices/:serial/settings/communication
async fn get_communication_settings(
    State(state): State<T3AppState>,
    Path(serial): Path<i32>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let db = match &state.t3_device_conn {
        Some(conn) => conn.lock().await.clone(),
        None => return Err((StatusCode::SERVICE_UNAVAILABLE, "Database unavailable".to_string())),
    };

    match communication_settings::Entity::find()
        .filter(communication_settings::Column::SerialNumber.eq(serial))
        .one(&db)
        .await
    {
        Ok(Some(settings)) => Ok(Json(json!({
            "success": true,
            "data": settings
        }))),
        Ok(None) => Err((StatusCode::NOT_FOUND, format!("Communication settings not found for device {}", serial))),
        Err(e) => Err((StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e))),
    }
}

/// PUT /api/t3-device/devices/:serial/settings/communication
async fn update_communication_settings(
    State(state): State<T3AppState>,
    Path(serial): Path<i32>,
    Json(payload): Json<UpdateCommunicationSettingsRequest>,
) -> Result<Json<SettingsResponse>, (StatusCode, String)> {
    let db = match &state.t3_device_conn {
        Some(conn) => conn.lock().await.clone(),
        None => return Err((StatusCode::SERVICE_UNAVAILABLE, "Database unavailable".to_string())),
    };

    let existing = communication_settings::Entity::find()
        .filter(communication_settings::Column::SerialNumber.eq(serial))
        .one(&db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)))?;

    if let Some(settings_model) = existing {
        let mut active_model: communication_settings::ActiveModel = settings_model.into();

        if let Some(val) = payload.com0_config {
            active_model.com0_config = Set(Some(val));
        }
        if let Some(val) = payload.com1_config {
            active_model.com1_config = Set(Some(val));
        }
        if let Some(val) = payload.com2_config {
            active_model.com2_config = Set(Some(val));
        }
        if let Some(val) = payload.com_baudrate0 {
            active_model.com_baudrate0 = Set(Some(val));
        }
        if let Some(val) = payload.com_baudrate1 {
            active_model.com_baudrate1 = Set(Some(val));
        }
        if let Some(val) = payload.com_baudrate2 {
            active_model.com_baudrate2 = Set(Some(val));
        }

        active_model.updated_at = Set(Some(chrono::Utc::now().to_rfc3339()));

        match active_model.update(&db).await {
            Ok(updated) => Ok(Json(SettingsResponse {
                success: true,
                message: "Communication settings updated successfully".to_string(),
                data: Some(json!(updated)),
            })),
            Err(e) => Err((StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to update: {}", e))),
        }
    } else {
        // Create new record
        let new_settings = communication_settings::ActiveModel {
            serial_number: Set(serial),
            com0_config: Set(payload.com0_config),
            com1_config: Set(payload.com1_config),
            com2_config: Set(payload.com2_config),
            com_baudrate0: Set(payload.com_baudrate0),
            com_baudrate1: Set(payload.com_baudrate1),
            com_baudrate2: Set(payload.com_baudrate2),
            ..Default::default()
        };

        match new_settings.insert(&db).await {
            Ok(inserted) => Ok(Json(SettingsResponse {
                success: true,
                message: "Communication settings created successfully".to_string(),
                data: Some(json!(inserted)),
            })),
            Err(e) => Err((StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to create: {}", e))),
        }
    }
}

/// GET /api/t3-device/devices/:serial/settings/time
async fn get_time_settings(
    State(state): State<T3AppState>,
    Path(serial): Path<i32>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let db = match &state.t3_device_conn {
        Some(conn) => conn.lock().await.clone(),
        None => return Err((StatusCode::SERVICE_UNAVAILABLE, "Database unavailable".to_string())),
    };

    match time_settings::Entity::find()
        .filter(time_settings::Column::SerialNumber.eq(serial))
        .one(&db)
        .await
    {
        Ok(Some(settings)) => Ok(Json(json!({
            "success": true,
            "data": settings
        }))),
        Ok(None) => Err((StatusCode::NOT_FOUND, format!("Time settings not found for device {}", serial))),
        Err(e) => Err((StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e))),
    }
}

/// PUT /api/t3-device/devices/:serial/settings/time
async fn update_time_settings(
    State(state): State<T3AppState>,
    Path(serial): Path<i32>,
    Json(payload): Json<UpdateTimeSettingsRequest>,
) -> Result<Json<SettingsResponse>, (StatusCode, String)> {
    let db = match &state.t3_device_conn {
        Some(conn) => conn.lock().await.clone(),
        None => return Err((StatusCode::SERVICE_UNAVAILABLE, "Database unavailable".to_string())),
    };

    let existing = time_settings::Entity::find()
        .filter(time_settings::Column::SerialNumber.eq(serial))
        .one(&db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)))?;

    if let Some(settings_model) = existing {
        let mut active_model: time_settings::ActiveModel = settings_model.into();

        if let Some(val) = payload.time_zone {
            active_model.time_zone = Set(Some(val));
        }
        if let Some(val) = payload.enable_sntp {
            active_model.enable_sntp = Set(Some(val));
        }
        if let Some(val) = payload.sntp_server {
            active_model.sntp_server = Set(Some(val));
        }
        if let Some(val) = payload.flag_time_sync_pc {
            active_model.flag_time_sync_pc = Set(Some(val));
        }

        active_model.updated_at = Set(Some(chrono::Utc::now().to_rfc3339()));

        match active_model.update(&db).await {
            Ok(updated) => Ok(Json(SettingsResponse {
                success: true,
                message: "Time settings updated successfully".to_string(),
                data: Some(json!(updated)),
            })),
            Err(e) => Err((StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to update: {}", e))),
        }
    } else {
        let new_settings = time_settings::ActiveModel {
            serial_number: Set(serial),
            time_zone: Set(payload.time_zone),
            enable_sntp: Set(payload.enable_sntp),
            sntp_server: Set(payload.sntp_server),
            flag_time_sync_pc: Set(payload.flag_time_sync_pc),
            ..Default::default()
        };

        match new_settings.insert(&db).await {
            Ok(inserted) => Ok(Json(SettingsResponse {
                success: true,
                message: "Time settings created successfully".to_string(),
                data: Some(json!(inserted)),
            })),
            Err(e) => Err((StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to create: {}", e))),
        }
    }
}

// Read-only GET endpoints for remaining settings
async fn get_protocol_settings(
    State(state): State<T3AppState>,
    Path(serial): Path<i32>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let db = match &state.t3_device_conn {
        Some(conn) => conn.lock().await.clone(),
        None => return Err((StatusCode::SERVICE_UNAVAILABLE, "Database unavailable".to_string())),
    };

    match protocol_settings::Entity::find()
        .filter(protocol_settings::Column::SerialNumber.eq(serial))
        .one(&db)
        .await
    {
        Ok(Some(settings)) => Ok(Json(json!({"success": true, "data": settings}))),
        Ok(None) => Err((StatusCode::NOT_FOUND, "Protocol settings not found".to_string())),
        Err(e) => Err((StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e))),
    }
}

async fn get_dyndns_settings(
    State(state): State<T3AppState>,
    Path(serial): Path<i32>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let db = match &state.t3_device_conn {
        Some(conn) => conn.lock().await.clone(),
        None => return Err((StatusCode::SERVICE_UNAVAILABLE, "Database unavailable".to_string())),
    };

    match dyndns_settings::Entity::find()
        .filter(dyndns_settings::Column::SerialNumber.eq(serial))
        .one(&db)
        .await
    {
        Ok(Some(settings)) => Ok(Json(json!({"success": true, "data": settings}))),
        Ok(None) => Err((StatusCode::NOT_FOUND, "DynDNS settings not found".to_string())),
        Err(e) => Err((StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e))),
    }
}

async fn get_hardware_settings(
    State(state): State<T3AppState>,
    Path(serial): Path<i32>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let db = match &state.t3_device_conn {
        Some(conn) => conn.lock().await.clone(),
        None => return Err((StatusCode::SERVICE_UNAVAILABLE, "Database unavailable".to_string())),
    };

    match hardware_info::Entity::find()
        .filter(hardware_info::Column::SerialNumber.eq(serial))
        .one(&db)
        .await
    {
        Ok(Some(settings)) => Ok(Json(json!({"success": true, "data": settings}))),
        Ok(None) => Err((StatusCode::NOT_FOUND, "Hardware settings not found".to_string())),
        Err(e) => Err((StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e))),
    }
}

async fn get_features_settings(
    State(state): State<T3AppState>,
    Path(serial): Path<i32>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let db = match &state.t3_device_conn {
        Some(conn) => conn.lock().await.clone(),
        None => return Err((StatusCode::SERVICE_UNAVAILABLE, "Database unavailable".to_string())),
    };

    match feature_flags::Entity::find()
        .filter(feature_flags::Column::SerialNumber.eq(serial))
        .one(&db)
        .await
    {
        Ok(Some(settings)) => Ok(Json(json!({"success": true, "data": settings}))),
        Ok(None) => Err((StatusCode::NOT_FOUND, "Features settings not found".to_string())),
        Err(e) => Err((StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e))),
    }
}
