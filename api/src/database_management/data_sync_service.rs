//! Data Sync Metadata Service
//!
//! Provides database operations for tracking data sync status from both
//! FFI backend service and frontend manual refreshes.

use chrono::{Local, Utc};
use sea_orm::*;
use serde::{Deserialize, Serialize};

use crate::entity::data_sync_metadata;
use crate::error::Result;

/// Data sync metadata response
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncStatusResponse {
    pub id: i32,
    pub sync_time: i64,
    pub sync_time_fmt: String,
    pub data_type: String,
    pub serial_number: String,
    pub panel_id: Option<i32>,
    pub records_synced: i32,
    pub sync_method: String,
    pub success: bool,
    pub error_message: Option<String>,
    pub created_at: i64,
}

impl From<data_sync_metadata::Model> for SyncStatusResponse {
    fn from(model: data_sync_metadata::Model) -> Self {
        // Convert sync_time timestamp to local time format
        // This handles existing records that may have UTC formatted times
        let sync_time_fmt = chrono::DateTime::from_timestamp(model.sync_time, 0)
            .map(|dt| dt.with_timezone(&Local).format("%Y-%m-%d %H:%M:%S").to_string())
            .unwrap_or(model.sync_time_fmt);

        Self {
            id: model.id,
            sync_time: model.sync_time,
            sync_time_fmt,
            data_type: model.data_type,
            serial_number: model.serial_number,
            panel_id: model.panel_id,
            records_synced: model.records_synced,
            sync_method: model.sync_method,
            success: model.success == 1,
            error_message: model.error_message,
            created_at: model.created_at,
        }
    }
}

/// Request for inserting new sync metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InsertSyncMetadataRequest {
    pub data_type: String,
    pub serial_number: String,
    pub panel_id: Option<i32>,
    pub records_synced: i32,
    pub sync_method: String,
    pub success: bool,
    pub error_message: Option<String>,
}

pub struct DataSyncMetadataService;

impl DataSyncMetadataService {
    /// Get latest sync status for a specific device and data type
    pub async fn get_latest_sync(
        db: &DatabaseConnection,
        serial_number: &str,
        data_type: &str,
    ) -> Result<Option<SyncStatusResponse>> {
        let result = data_sync_metadata::Entity::find()
            .filter(data_sync_metadata::Column::SerialNumber.eq(serial_number))
            .filter(data_sync_metadata::Column::DataType.eq(data_type))
            .order_by_desc(data_sync_metadata::Column::SyncTime)
            .one(db)
            .await?;

        Ok(result.map(SyncStatusResponse::from))
    }

    /// Get sync history for a specific device and data type (latest N records)
    pub async fn get_sync_history(
        db: &DatabaseConnection,
        serial_number: &str,
        data_type: &str,
        limit: u64,
    ) -> Result<Vec<SyncStatusResponse>> {
        let results = data_sync_metadata::Entity::find()
            .filter(data_sync_metadata::Column::SerialNumber.eq(serial_number))
            .filter(data_sync_metadata::Column::DataType.eq(data_type))
            .order_by_desc(data_sync_metadata::Column::SyncTime)
            .limit(limit)
            .all(db)
            .await?;

        Ok(results.into_iter().map(SyncStatusResponse::from).collect())
    }

    /// Insert new sync metadata record
    pub async fn insert_sync_metadata(
        db: &DatabaseConnection,
        request: InsertSyncMetadataRequest,
    ) -> Result<SyncStatusResponse> {
        let now = Utc::now();
        let sync_time = now.timestamp();
        // Use local time for display format
        let sync_time_fmt = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

        let active_model = data_sync_metadata::ActiveModel {
            sync_time: Set(sync_time),
            sync_time_fmt: Set(sync_time_fmt),
            data_type: Set(request.data_type.clone()),
            serial_number: Set(request.serial_number.clone()),
            panel_id: Set(request.panel_id),
            records_synced: Set(request.records_synced),
            sync_method: Set(request.sync_method),
            success: Set(if request.success { 1 } else { 0 }),
            error_message: Set(request.error_message),
            created_at: Set(sync_time),
            ..Default::default()
        };

        let result = active_model.insert(db).await?;

        // Cleanup old records (keep latest 10)
        Self::cleanup_old_records(
            db,
            &request.serial_number,
            &request.data_type,
            10,
        )
        .await?;

        Ok(SyncStatusResponse::from(result))
    }

    /// Delete old sync records, keeping only the latest N records per device/data_type
    async fn cleanup_old_records(
        db: &DatabaseConnection,
        serial_number: &str,
        data_type: &str,
        keep_count: usize,
    ) -> Result<()> {
        // Get IDs of records to keep (latest N)
        let records_to_keep = data_sync_metadata::Entity::find()
            .filter(data_sync_metadata::Column::SerialNumber.eq(serial_number))
            .filter(data_sync_metadata::Column::DataType.eq(data_type))
            .order_by_desc(data_sync_metadata::Column::SyncTime)
            .limit(keep_count as u64)
            .all(db)
            .await?;

        if records_to_keep.len() >= keep_count {
            let ids_to_keep: Vec<i32> = records_to_keep.iter().map(|r| r.id).collect();

            // Delete records not in the keep list
            data_sync_metadata::Entity::delete_many()
                .filter(data_sync_metadata::Column::SerialNumber.eq(serial_number))
                .filter(data_sync_metadata::Column::DataType.eq(data_type))
                .filter(data_sync_metadata::Column::Id.is_not_in(ids_to_keep))
                .exec(db)
                .await?;
        }

        Ok(())
    }

    /// Get all sync status for a device (all data types)
    pub async fn get_all_device_sync_status(
        db: &DatabaseConnection,
        serial_number: &str,
    ) -> Result<Vec<SyncStatusResponse>> {
        let results = data_sync_metadata::Entity::find()
            .filter(data_sync_metadata::Column::SerialNumber.eq(serial_number))
            .order_by_desc(data_sync_metadata::Column::SyncTime)
            .all(db)
            .await?;

        Ok(results.into_iter().map(SyncStatusResponse::from).collect())
    }
}
