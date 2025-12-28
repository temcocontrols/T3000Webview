//! Data Sync Metadata API Endpoints
//!
//! REST API for querying and inserting data sync metadata

use axum::{
    extract::{Path, Query, State},
    routing::{get, post},
    Json, Router,
};
use serde::Deserialize;

use crate::app_state::T3AppState;
use crate::database_management::data_sync_service::{
    DataSyncMetadataService, InsertSyncMetadataRequest, SyncStatusResponse,
};
use crate::error::Result;

/// Query parameters for sync history endpoint
#[derive(Debug, Deserialize)]
pub struct SyncHistoryQuery {
    #[serde(default = "default_limit")]
    pub limit: u64,
}

fn default_limit() -> u64 {
    10
}

/// GET /api/sync-status/:serialNumber/:dataType
/// Get latest sync status for a specific device and data type
pub async fn get_latest_sync_status(
    State(state): State<T3AppState>,
    Path((serial_number, data_type)): Path<(String, String)>,
) -> Result<Json<Option<SyncStatusResponse>>> {
    let db = match &state.t3_device_conn {
        Some(conn) => conn.lock().await.clone(),
        None => return Err(crate::error::Error::DatabaseError("T3000 device database unavailable".to_string())),
    };

    let result = DataSyncMetadataService::get_latest_sync(
        &db,
        &serial_number,
        &data_type,
    )
    .await?;

    Ok(Json(result))
}

/// GET /api/sync-status/:serialNumber/:dataType/history?limit=10
/// Get sync history for a specific device and data type
pub async fn get_sync_history(
    State(state): State<T3AppState>,
    Path((serial_number, data_type)): Path<(String, String)>,
    Query(query): Query<SyncHistoryQuery>,
) -> Result<Json<Vec<SyncStatusResponse>>> {
    let db = match &state.t3_device_conn {
        Some(conn) => conn.lock().await.clone(),
        None => return Err(crate::error::Error::DatabaseError("T3000 device database unavailable".to_string())),
    };

    let results = DataSyncMetadataService::get_sync_history(
        &db,
        &serial_number,
        &data_type,
        query.limit,
    )
    .await?;

    Ok(Json(results))
}

/// GET /api/sync-status/:serialNumber
/// Get all sync status for a device (all data types)
pub async fn get_all_device_sync_status(
    State(state): State<T3AppState>,
    Path(serial_number): Path<String>,
) -> Result<Json<Vec<SyncStatusResponse>>> {
    let db = match &state.t3_device_conn {
        Some(conn) => conn.lock().await.clone(),
        None => return Err(crate::error::Error::DatabaseError("T3000 device database unavailable".to_string())),
    };

    let results = DataSyncMetadataService::get_all_device_sync_status(
        &db,
        &serial_number,
    )
    .await?;

    Ok(Json(results))
}

/// POST /api/sync-status
/// Insert new sync metadata record
pub async fn insert_sync_metadata(
    State(state): State<T3AppState>,
    Json(request): Json<InsertSyncMetadataRequest>,
) -> Result<Json<SyncStatusResponse>> {
    let db = match &state.t3_device_conn {
        Some(conn) => conn.lock().await.clone(),
        None => return Err(crate::error::Error::DatabaseError("T3000 device database unavailable".to_string())),
    };

    let result = DataSyncMetadataService::insert_sync_metadata(&db, request).await?;

    Ok(Json(result))
}

/// Create router for sync status endpoints
pub fn create_sync_status_routes() -> Router<T3AppState> {
    Router::new()
        .route("/sync-status", post(insert_sync_metadata))
        .route("/sync-status/:serialNumber", get(get_all_device_sync_status))
        .route(
            "/sync-status/:serialNumber/:dataType",
            get(get_latest_sync_status),
        )
        .route(
            "/sync-status/:serialNumber/:dataType/history",
            get(get_sync_history),
        )
}
