//! Application Configuration API Endpoints
//!
//! RESTful API for storing and retrieving application configuration including:
//! - Graphics data (deviceAppState, t3.library, t3.draw, etc.)
//! - User preferences (localSettings, UI state)
//! - System settings (database config, maintenance)

use axum::{
    extract::{Path, Query, State},
    Json,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use sea_orm::*;

use crate::app_state::T3AppState;
use crate::database_management::ApplicationConfigService;
use crate::entity::application_settings;
use crate::error::Result;

/// Request body for setting configuration
#[derive(Debug, Deserialize)]
pub struct SetConfigRequest {
    pub key: String,
    pub value: String,
    pub config_type: Option<String>,
    pub user_id: Option<i32>,
    pub device_serial: Option<String>,
    pub panel_id: Option<i32>,
    pub is_system: Option<bool>,
    pub version: Option<String>,
}

/// Response for delete operations
#[derive(Debug, Serialize)]
pub struct DeleteResponse {
    pub success: bool,
    pub deleted_count: u64,
}

/// Statistics about config storage
#[derive(Debug, Serialize)]
pub struct ConfigStats {
    pub total_configs: usize,
    pub total_size_bytes: i64,
    pub by_type: HashMap<String, usize>,
}

/// Bulk operation response
#[derive(Debug, Serialize)]
pub struct BulkOperationResponse {
    pub success_count: usize,
    pub error_count: usize,
    pub errors: Vec<String>,
}

/// Import configs request
#[derive(Debug, Deserialize)]
pub struct ImportConfigsRequest {
    pub configs: Vec<application_settings::Model>,
    pub overwrite: bool,
}

/// Get a single configuration value
async fn get_config(
    State(state): State<T3AppState>,
    Path(key): Path<String>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<Option<application_settings::Model>>> {
    let db = match &state.t3_device_conn {
        Some(conn) => &*conn.lock().await,
        None => return Err(crate::error::Error::ServerError("T3 device database not available".to_string()))
    };

    let user_id: Option<i32> = params.get("user_id").and_then(|v| v.parse::<i32>().ok());
    let device_serial = params.get("device_serial").map(|v| v.to_string());
    let panel_id: Option<i32> = params.get("panel_id").and_then(|v| v.parse::<i32>().ok());

    let config = ApplicationConfigService::get_config(
        db,
        &key,
        user_id,
        device_serial,
        panel_id,
    )
    .await?;

    Ok(Json(config))
}

/// Set or update a configuration value
async fn set_config(
    State(state): State<T3AppState>,
    Json(request): Json<SetConfigRequest>,
) -> Result<Json<application_settings::Model>> {
    let db = match &state.t3_device_conn {
        Some(conn) => &*conn.lock().await,
        None => return Err(crate::error::Error::ServerError("T3 device database not available".to_string()))
    };

    // Parse value as JSON
    let json_value: serde_json::Value = serde_json::from_str(&request.value)
        .unwrap_or(serde_json::Value::String(request.value.clone()));

    let config = ApplicationConfigService::set_config(
        db,
        request.key,
        json_value,
        request.user_id,
        request.device_serial,
        request.panel_id,
        request.version,
    )
    .await?;

    Ok(Json(config))
}

/// Delete a configuration value
async fn delete_config(
    State(state): State<T3AppState>,
    Path(key): Path<String>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<DeleteResponse>> {
    let db = match &state.t3_device_conn {
        Some(conn) => &*conn.lock().await,
        None => return Err(crate::error::Error::ServerError("T3 device database not available".to_string()))
    };

    let user_id: Option<i32> = params.get("user_id").and_then(|v| v.parse::<i32>().ok());
    let device_serial = params.get("device_serial").map(|v| v.to_string());
    let panel_id: Option<i32> = params.get("panel_id").and_then(|v| v.parse::<i32>().ok());

    let mut delete_query = application_settings::Entity::delete_many()
        .filter(application_settings::Column::ConfigKey.eq(&key));

    if let Some(uid) = user_id {
        delete_query = delete_query.filter(application_settings::Column::UserId.eq(uid));
    }
    if let Some(serial) = device_serial {
        delete_query = delete_query.filter(application_settings::Column::DeviceSerial.eq(serial));
    }
    if let Some(pid) = panel_id {
        delete_query = delete_query.filter(application_settings::Column::PanelId.eq(pid));
    }

    let deleted = delete_query.exec(db).await?;

    Ok(Json(DeleteResponse {
        success: true,
        deleted_count: deleted.rows_affected,
    }))
}

/// Get all configs with a specific prefix (e.g., "t3.*", "deviceAppState.*")
async fn get_configs_by_prefix(
    State(state): State<T3AppState>,
    Path(prefix): Path<String>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<Vec<application_settings::Model>>> {
    let db = match &state.t3_device_conn {
        Some(conn) => &*conn.lock().await,
        None => return Err(crate::error::Error::ServerError("T3 device database not available".to_string()))
    };

    let user_id: Option<i32> = params.get("user_id").and_then(|v| v.parse::<i32>().ok());
    let device_serial = params.get("device_serial").map(|v| v.to_string());
    let panel_id: Option<i32> = params.get("panel_id").and_then(|v| v.parse::<i32>().ok());

    let mut query = application_settings::Entity::find()
        .filter(application_settings::Column::ConfigKey.like(format!("{}%", prefix)));

    if let Some(uid) = user_id {
        query = query.filter(application_settings::Column::UserId.eq(uid));
    }
    if let Some(serial) = device_serial {
        query = query.filter(application_settings::Column::DeviceSerial.eq(serial));
    }
    if let Some(pid) = panel_id {
        query = query.filter(application_settings::Column::PanelId.eq(pid));
    }

    let configs = query.all(db).await?;

    Ok(Json(configs))
}

/// Get all configs for a specific device
async fn get_device_configs(
    State(state): State<T3AppState>,
    Path(device_serial): Path<String>,
) -> Result<Json<Vec<application_settings::Model>>> {
    let db = match &state.t3_device_conn {
        Some(conn) => &*conn.lock().await,
        None => return Err(crate::error::Error::ServerError("T3 device database not available".to_string()))
    };

    let configs = application_settings::Entity::find()
        .filter(application_settings::Column::DeviceSerial.eq(&device_serial))
        .all(db)
        .await?;

    Ok(Json(configs))
}

/// Get statistics about config storage usage
async fn get_config_stats(
    State(state): State<T3AppState>,
) -> Result<Json<ConfigStats>> {
    let db = match &state.t3_device_conn {
        Some(conn) => &*conn.lock().await,
        None => return Err(crate::error::Error::ServerError("T3 device database not available".to_string()))
    };

    let configs = application_settings::Entity::find()
        .all(db)
        .await?;

    let total_size: i64 = configs.iter()
        .filter_map(|c| c.size_bytes)
        .map(|s| s as i64)
        .sum();

    let by_type = configs.iter()
        .fold(std::collections::HashMap::new(), |mut acc, config| {
            let key = config.config_type.clone();
            *acc.entry(key).or_insert(0) += 1;
            acc
        });    Ok(Json(ConfigStats {
        total_configs: configs.len(),
        total_size_bytes: total_size,
        by_type,
    }))
}

/// Get all large configs (>100KB)
async fn get_large_configs(
    State(state): State<T3AppState>,
) -> Result<Json<Vec<application_settings::Model>>> {
    let db = match &state.t3_device_conn {
        Some(conn) => &*conn.lock().await,
        None => return Err(crate::error::Error::ServerError("T3 device database not available".to_string()))
    };

    let configs = application_settings::Entity::find()
        .filter(application_settings::Column::SizeBytes.gt(100_000))
        .all(db)
        .await?;

    Ok(Json(configs))
}

/// Bulk set multiple configs
async fn bulk_set_configs(
    State(state): State<T3AppState>,
    Json(requests): Json<Vec<SetConfigRequest>>,
) -> Result<Json<BulkOperationResponse>> {
    let db = match &state.t3_device_conn {
        Some(conn) => &*conn.lock().await,
        None => return Err(crate::error::Error::ServerError("T3 device database not available".to_string()))
    };

    let mut success_count = 0;
    let mut errors = Vec::new();

    for request in requests {
        let json_value: serde_json::Value = serde_json::from_str(&request.value)
            .unwrap_or(serde_json::Value::String(request.value.clone()));

        match ApplicationConfigService::set_config(
            db,
            request.key.clone(),
            json_value,
            request.user_id,
            request.device_serial,
            request.panel_id,
            request.version,
        )
        .await
        {
            Ok(_) => success_count += 1,
            Err(e) => errors.push(format!("Failed to set {}: {}", request.key, e)),
        }
    }

    Ok(Json(BulkOperationResponse {
        success_count,
        error_count: errors.len(),
        errors,
    }))
}

/// Bulk delete configs by keys
async fn bulk_delete_configs(
    State(state): State<T3AppState>,
    Json(keys): Json<Vec<String>>,
) -> Result<Json<BulkOperationResponse>> {
    let db = match &state.t3_device_conn {
        Some(conn) => &*conn.lock().await,
        None => return Err(crate::error::Error::ServerError("T3 device database not available".to_string()))
    };

    let mut success_count = 0;
    let mut errors = Vec::new();

    for key in keys {
        match application_settings::Entity::delete_many()
            .filter(application_settings::Column::ConfigKey.eq(&key))
            .exec(db)
            .await
        {
            Ok(result) => {
                if result.rows_affected > 0 {
                    success_count += 1;
                }
            }
            Err(e) => errors.push(format!("Failed to delete {}: {}", key, e)),
        }
    }

    Ok(Json(BulkOperationResponse {
        success_count,
        error_count: errors.len(),
        errors,
    }))
}

/// Export configs to JSON
async fn export_configs(
    State(state): State<T3AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<Vec<application_settings::Model>>> {
    let db = match &state.t3_device_conn {
        Some(conn) => &*conn.lock().await,
        None => return Err(crate::error::Error::ServerError("T3 device database not available".to_string()))
    };

    let user_id: Option<i32> = params.get("user_id").and_then(|v| v.parse::<i32>().ok());
    let device_serial = params.get("device_serial").map(|v| v.to_string());
    let panel_id: Option<i32> = params.get("panel_id").and_then(|v| v.parse::<i32>().ok());

    let mut query = application_settings::Entity::find();

    if let Some(uid) = user_id {
        query = query.filter(application_settings::Column::UserId.eq(uid));
    }
    if let Some(serial) = device_serial {
        query = query.filter(application_settings::Column::DeviceSerial.eq(serial));
    }
    if let Some(pid) = panel_id {
        query = query.filter(application_settings::Column::PanelId.eq(pid));
    }

    let configs = query.all(db).await?;

    Ok(Json(configs))
}

/// Import configs from JSON
async fn import_configs(
    State(state): State<T3AppState>,
    Json(request): Json<ImportConfigsRequest>,
) -> Result<Json<BulkOperationResponse>> {
    let db = match &state.t3_device_conn {
        Some(conn) => &*conn.lock().await,
        None => return Err(crate::error::Error::ServerError("T3 device database not available".to_string()))
    };

    let mut success_count = 0;
    let mut errors = Vec::new();

    for config in request.configs {
        let json_value: serde_json::Value = serde_json::from_str(&config.config_value)
            .unwrap_or(serde_json::Value::String(config.config_value.clone()));

        match ApplicationConfigService::set_config(
            db,
            config.config_key.clone(),
            json_value,
            config.user_id,
            config.device_serial,
            config.panel_id,
            config.version,
        )
        .await
        {
            Ok(_) => success_count += 1,
            Err(e) => errors.push(format!("Failed to import {}: {}", config.config_key, e)),
        }
    }

    Ok(Json(BulkOperationResponse {
        success_count,
        error_count: errors.len(),
        errors,
    }))
}

/// Migrate data from frontend localStorage to database
async fn migrate_from_localstorage(
    State(state): State<T3AppState>,
    Json(data): Json<HashMap<String, String>>,
) -> Result<Json<BulkOperationResponse>> {
    let db = match &state.t3_device_conn {
        Some(conn) => &*conn.lock().await,
        None => return Err(crate::error::Error::ServerError("T3 device database not available".to_string()))
    };

    let mut success_count = 0;
    let mut errors = Vec::new();

    for (key, value) in data {
        // Determine scoping based on key patterns
        let (device_serial, user_id) = if key.starts_with("deviceAppState.") {
            // Extract device serial from key
            let parts: Vec<&str> = key.split('.').collect();
            if parts.len() >= 2 {
                (Some(parts[1].to_string()), None)
            } else {
                (None, None)
            }
        } else if key.starts_with("t3.") {
            // T3 configs are user-specific
            (None, Some(1)) // Default to user_id 1, should be passed from frontend
        } else {
            // Global configs
            (None, None)
        };

        let json_value: serde_json::Value = serde_json::from_str(&value)
            .unwrap_or(serde_json::Value::String(value.clone()));

        match ApplicationConfigService::set_config(
            db,
            key.clone(),
            json_value,
            user_id,
            device_serial,
            None,
            None,
        )
        .await
        {
            Ok(_) => success_count += 1,
            Err(e) => errors.push(format!("Failed to migrate {}: {}", key, e)),
        }
    }

    Ok(Json(BulkOperationResponse {
        success_count,
        error_count: errors.len(),
        errors,
    }))
}

// =================================================================
// FFI SYNC INTERVAL ENDPOINTS - Configurable sync interval
// =================================================================

/// FFI sync interval response
#[derive(Debug, Serialize)]
pub struct FfiSyncIntervalResponse {
    pub interval_secs: u64,
    pub last_sync: Option<String>,
}

/// FFI sync interval update request
#[derive(Debug, Deserialize)]
pub struct UpdateFfiSyncIntervalRequest {
    pub interval_secs: u64,
    pub changed_by: Option<String>,
    pub change_reason: Option<String>,
}

/// Configuration history entry for display
#[derive(Debug, Serialize)]
pub struct ConfigHistoryEntry {
    pub id: i32,
    pub config_key: String,
    pub old_value: Option<String>,
    pub new_value: String,
    pub old_value_display: String,
    pub new_value_display: String,
    pub changed_by: String,
    pub change_reason: Option<String>,
    pub changed_at: String,
}

/// Get current FFI sync interval configuration
async fn get_ffi_sync_interval(
    State(state): State<T3AppState>,
) -> Result<Json<FfiSyncIntervalResponse>> {
    let db = match &state.t3_device_conn {
        Some(conn) => &*conn.lock().await,
        None => return Err(crate::error::Error::ServerError("T3 device database not available".to_string()))
    };

    // Get current interval from APPLICATION_CONFIG
    let config = ApplicationConfigService::get_config(
        db,
        "ffi.sync_interval_secs",
        None,
        None,
        None,
    )
    .await?;

    let interval_secs = match config {
        Some(cfg) => cfg.config_value.parse::<u64>().unwrap_or(300),
        None => 300, // Default to 5 minutes
    };

    // TODO: Get last sync time from T3000MainService status
    let last_sync = None;

    Ok(Json(FfiSyncIntervalResponse {
        interval_secs,
        last_sync,
    }))
}

/// Update FFI sync interval configuration
async fn update_ffi_sync_interval(
    State(state): State<T3AppState>,
    Json(request): Json<UpdateFfiSyncIntervalRequest>,
) -> Result<Json<FfiSyncIntervalResponse>> {
    let db = match &state.t3_device_conn {
        Some(conn) => &*conn.lock().await,
        None => return Err(crate::error::Error::ServerError("T3 device database not available".to_string()))
    };

    // Validate interval range (1 minute to 365 days)
    const MIN_INTERVAL: u64 = 60;          // 1 minute
    const MAX_INTERVAL: u64 = 31536000;    // 365 days

    if request.interval_secs < MIN_INTERVAL || request.interval_secs > MAX_INTERVAL {
        return Err(crate::error::Error::ValidationError(
            format!("Interval must be between {} and {} seconds (1 minute to 365 days)", MIN_INTERVAL, MAX_INTERVAL)
        ));
    }

    // Get old value for history
    let old_config = ApplicationConfigService::get_config(
        db,
        "ffi.sync_interval_secs",
        None,
        None,
        None,
    )
    .await?;

    let old_value = old_config.as_ref().map(|c| c.config_value.clone());

    // Update configuration
    let new_value = serde_json::Value::String(request.interval_secs.to_string());
    ApplicationConfigService::set_config(
        db,
        "ffi.sync_interval_secs".to_string(),
        new_value,
        None,
        None,
        None,
        None,
    )
    .await?;

    // Log change to APPLICATION_CONFIG_HISTORY
    use crate::entity::application_config_history;
    let history_entry = application_config_history::ActiveModel {
        id: NotSet,
        config_key: Set("ffi.sync_interval_secs".to_string()),
        old_value: Set(old_value),
        new_value: Set(request.interval_secs.to_string()),
        changed_by: Set(request.changed_by.or(Some("api".to_string()))),
        change_reason: Set(request.change_reason),
        changed_at: Set(chrono::Utc::now().naive_utc()),
    };

    application_config_history::Entity::insert(history_entry)
        .exec(db)
        .await
        .map_err(|e| crate::error::Error::DatabaseError(format!("Failed to log config change: {}", e)))?;

    Ok(Json(FfiSyncIntervalResponse {
        interval_secs: request.interval_secs,
        last_sync: None,
    }))
}

/// Get configuration change history
async fn get_config_history(
    State(state): State<T3AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<Vec<ConfigHistoryEntry>>> {
    let db = match &state.t3_device_conn {
        Some(conn) => &*conn.lock().await,
        None => return Err(crate::error::Error::ServerError("T3 device database not available".to_string()))
    };

    let limit = params
        .get("limit")
        .and_then(|v| v.parse::<u64>().ok())
        .unwrap_or(100);

    let config_key = params.get("config_key");

    use crate::entity::application_config_history;

    let mut query = application_config_history::Entity::find()
        .order_by_desc(application_config_history::Column::ChangedAt);

    if let Some(key) = config_key {
        query = query.filter(application_config_history::Column::ConfigKey.eq(key));
    }

    let history = query
        .limit(limit)
        .all(db)
        .await
        .map_err(|e| crate::error::Error::DatabaseError(format!("Failed to fetch config history: {}", e)))?;

    // Convert to display format
    let entries: Vec<ConfigHistoryEntry> = history
        .into_iter()
        .map(|h| {
            let old_display = h.old_value.as_ref()
                .and_then(|v| format_interval_value(v))
                .unwrap_or_else(|| "(not set)".to_string());

            let new_display = format_interval_value(&h.new_value)
                .unwrap_or_else(|| h.new_value.clone());

            ConfigHistoryEntry {
                id: h.id,
                config_key: h.config_key,
                old_value: h.old_value,
                new_value: h.new_value,
                old_value_display: old_display,
                new_value_display: new_display,
                changed_by: h.changed_by.unwrap_or_else(|| "unknown".to_string()),
                change_reason: h.change_reason,
                changed_at: h.changed_at.format("%Y-%m-%d %H:%M:%S").to_string(),
            }
        })
        .collect();

    Ok(Json(entries))
}

/// Format interval value for human-readable display
fn format_interval_value(value: &str) -> Option<String> {
    if let Ok(secs) = value.parse::<u64>() {
        if secs < 60 {
            Some(format!("{} seconds", secs))
        } else if secs < 3600 {
            Some(format!("{} minutes", secs / 60))
        } else if secs < 86400 {
            Some(format!("{} hours", secs / 3600))
        } else {
            Some(format!("{} days", secs / 86400))
        }
    } else {
        None
    }
}

/// Create router with all config endpoints
pub fn config_routes() -> axum::Router<T3AppState> {
    use axum::routing::{get, post, delete, put};

    axum::Router::new()
        .route("/api/config/:key", get(get_config))
        .route("/api/config", post(set_config))
        .route("/api/config/:key", delete(delete_config))
        .route("/api/config/prefix/:prefix", get(get_configs_by_prefix))
        .route("/api/config/device/:serial", get(get_device_configs))
        .route("/api/config/stats", get(get_config_stats))
        .route("/api/config/large", get(get_large_configs))
        .route("/api/config/bulk", post(bulk_set_configs))
        .route("/api/config/bulk", delete(bulk_delete_configs))
        .route("/api/config/export", post(export_configs))
        .route("/api/config/import", post(import_configs))
        .route("/api/config/migrate-localstorage", post(migrate_from_localstorage))
        // FFI sync interval endpoints
        .route("/api/config/ffi-sync-interval", get(get_ffi_sync_interval))
        .route("/api/config/ffi-sync-interval", put(update_ffi_sync_interval))
        .route("/api/config/history", get(get_config_history))
}



