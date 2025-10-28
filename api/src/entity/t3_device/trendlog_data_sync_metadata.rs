// TRENDLOG_DATA_SYNC_METADATA Entity - Tracks FFI sync operations
// Stores sync operation details ONCE instead of duplicating per detail record
// Space savings: Replaces SyncInterval/CreatedBy in millions of detail records
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "TRENDLOG_DATA_SYNC_METADATA")]
#[serde(rename_all = "camelCase")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = true, column_name = "id")]
    pub id: i32,

    #[sea_orm(column_name = "SyncTime_Fmt")]
    pub sync_time_fmt: String,                        // "2025-10-28 13:35:49"

    #[sea_orm(column_name = "MessageType")]
    pub message_type: String,                         // "LOGGING_DATA" or "GET_PANELS_LIST"

    #[sea_orm(column_name = "PanelId")]
    pub panel_id: Option<i32>,                        // NULL = all panels

    #[sea_orm(column_name = "SerialNumber")]
    pub serial_number: Option<i32>,                   // NULL = all devices

    #[sea_orm(column_name = "RecordsInserted")]
    pub records_inserted: Option<i32>,                // Detail records created in this sync

    #[sea_orm(column_name = "SyncInterval")]
    pub sync_interval: i32,                           // 15, 60, 300, 900 seconds

    #[sea_orm(column_name = "Success")]
    pub success: Option<i32>,                         // 1=success, 0=failed (BOOLEAN)

    #[sea_orm(column_name = "ErrorMessage")]
    pub error_message: Option<String>,                // NULL if success, error text if failed

    #[sea_orm(column_name = "CreatedAt")]
    pub created_at: Option<String>,                   // Record creation timestamp
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
