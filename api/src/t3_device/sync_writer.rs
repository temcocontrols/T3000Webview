//! SyncWriter — write FFI sync data directly to the right target DB.
//!
//! Decision is **automatic** at the start of each sync cycle:
//! - MSSQL pool present → `MssqlDirect`: writes straight to center DB via tiberius
//! - Otherwise → `Sqlite`: writes to local SQLite (or SeaORM center DB for PG/MySQL)
//!
//! The caller (`sync_logging_data_static`) just calls `writer.*()` methods;
//! it does NOT need to know which backend is active.  No intermediate SQLite step
//! occurs in the MSSQL path.

use crate::database_management::mssql_queries::{self, MssqlPool};
use crate::db_connection::establish_device_conn_for_sync;
use crate::error::AppError;
use sea_orm::DatabaseConnection;

use super::t3_ffi_sync_service::{DeviceInfo, DeviceWithPoints, PointData, T3000MainService};

/// Controls where FFI sync data is written.
pub enum SyncWriter {
    /// Local SQLite or SeaORM-connected center DB (PG/MySQL).
    /// Uses existing `T3000MainService` static methods; each call is its own transaction.
    Sqlite(DatabaseConnection),

    /// MSSQL center DB via tiberius pool.
    /// No local SQLite intermediate step — data goes straight to center DB.
    MssqlDirect(&'static MssqlPool),
}

impl SyncWriter {
    /// Decide the write target for this sync cycle.
    ///
    /// If the global MSSQL pool is available (center DB is MSSQL and we are the server
    /// role), use `MssqlDirect`.  Otherwise fall back to the standard
    /// `establish_device_conn_for_sync()` which returns the appropriate SeaORM connection.
    pub async fn from_pool_or_sqlite() -> Result<Self, AppError> {
        if let Some(pool) = crate::server_db_writer::get_server_mssql_pool() {
            return Ok(SyncWriter::MssqlDirect(pool));
        }
        let db = establish_device_conn_for_sync().await?;
        Ok(SyncWriter::Sqlite(db))
    }

    /// Returns `true` when `MssqlDirect` is the active path.
    pub fn is_mssql_direct(&self) -> bool {
        matches!(self, SyncWriter::MssqlDirect(_))
    }

    // -----------------------------------------------------------------------
    // Device
    // -----------------------------------------------------------------------

    /// Upsert one device's basic information.
    pub async fn sync_device(&self, device_info: &DeviceInfo) -> Result<(), AppError> {
        match self {
            SyncWriter::Sqlite(db) => {
                T3000MainService::sync_device_basic_info(db, device_info).await
            }
            SyncWriter::MssqlDirect(pool) => mssql_queries::upsert_device(
                pool,
                device_info.panel_serial_number,
                Some(device_info.panel_id),
                None,                                       // main_building_name
                Some(device_info.panel_name.as_str()),      // building_name
                None,                                       // floor_name
                None,                                       // room_name
                None,                                       // panel_number
                None,                                       // network_number
                Some(device_info.panel_name.as_str()),      // product_name
                None,                                       // product_class_id
                None,                                       // product_id
                None,                                       // bautrate
                Some(device_info.panel_ipaddress.as_str()), // address
                None,                                       // description
                Some("Online"),                             // status
                device_info.ip_address.as_deref(),
                device_info.port,
                device_info.bacnet_mstp_mac_id,
                device_info.modbus_address,
                device_info.pc_ip_address.as_deref(),
                device_info.modbus_port,
                device_info.bacnet_ip_port,
                device_info.show_label_name.as_deref(),
                device_info.connection_type.as_deref(),
            )
            .await
            .map_err(AppError::DatabaseError),
        }
    }

    // -----------------------------------------------------------------------
    // Points
    // -----------------------------------------------------------------------

    /// Upsert one input point.
    pub async fn sync_input(&self, serial_number: i32, point: &PointData) -> Result<(), AppError> {
        match self {
            SyncWriter::Sqlite(db) => {
                T3000MainService::sync_input_point_static(db, serial_number, point).await
            }
            SyncWriter::MssqlDirect(pool) => {
                let units = T3000MainService::derive_units_from_range(point.range);
                let idx_str = point.index.to_string();
                let panel_str = point.panel.to_string();
                let am_str = point.auto_manual.to_string();
                let val_str = point.value.to_string();
                let range_str = point.range.to_string();
                let status_str = point.status.to_string();
                let da_str = point.digital_analog.map(|da| da.to_string());
                let point_id =
                    point.id.clone().unwrap_or_else(|| format!("IN{}", point.index));

                mssql_queries::upsert_point(
                    pool,
                    "INPUTS",
                    "InputId",
                    serial_number,
                    &point_id,
                    Some(idx_str.as_str()),
                    Some(panel_str.as_str()),
                    Some(point.full_label.as_str()),
                    Some(am_str.as_str()),
                    Some(val_str.as_str()),
                    Some(units.as_str()),
                    Some(range_str.as_str()),
                    Some(status_str.as_str()),
                    da_str.as_deref(),
                    point.label.as_deref(),
                )
                .await
                .map_err(AppError::DatabaseError)
            }
        }
    }

    /// Upsert one output point.
    pub async fn sync_output(
        &self,
        serial_number: i32,
        point: &PointData,
    ) -> Result<(), AppError> {
        match self {
            SyncWriter::Sqlite(db) => {
                T3000MainService::sync_output_point_static(db, serial_number, point).await
            }
            SyncWriter::MssqlDirect(pool) => {
                let units = T3000MainService::derive_units_from_range(point.range);
                let idx_str = point.index.to_string();
                let panel_str = point.panel.to_string();
                let am_str = point.auto_manual.to_string();
                let val_str = point.value.to_string();
                let range_str = point.range.to_string();
                let status_str = point.status.to_string();
                let da_str = point.digital_analog.map(|da| da.to_string());
                let point_id =
                    point.id.clone().unwrap_or_else(|| format!("OUT{}", point.index));

                mssql_queries::upsert_point(
                    pool,
                    "OUTPUTS",
                    "OutputId",
                    serial_number,
                    &point_id,
                    Some(idx_str.as_str()),
                    Some(panel_str.as_str()),
                    Some(point.full_label.as_str()),
                    Some(am_str.as_str()),
                    Some(val_str.as_str()),
                    Some(units.as_str()),
                    Some(range_str.as_str()),
                    Some(status_str.as_str()),
                    da_str.as_deref(),
                    point.label.as_deref(),
                )
                .await
                .map_err(AppError::DatabaseError)
            }
        }
    }

    /// Upsert one variable point.
    pub async fn sync_variable(
        &self,
        serial_number: i32,
        point: &PointData,
    ) -> Result<(), AppError> {
        match self {
            SyncWriter::Sqlite(db) => {
                T3000MainService::sync_variable_point_static(db, serial_number, point).await
            }
            SyncWriter::MssqlDirect(pool) => {
                let units = T3000MainService::derive_units_from_range(point.range);
                let idx_str = point.index.to_string();
                let panel_str = point.panel.to_string();
                let am_str = point.auto_manual.to_string();
                let val_str = point.value.to_string();
                let range_str = point.range.to_string();
                let status_str = point.status.to_string();
                let da_str = point.digital_analog.map(|da| da.to_string());
                let point_id =
                    point.id.clone().unwrap_or_else(|| format!("VAR{}", point.index));

                mssql_queries::upsert_point(
                    pool,
                    "VARIABLES",
                    "VariableId",
                    serial_number,
                    &point_id,
                    Some(idx_str.as_str()),
                    Some(panel_str.as_str()),
                    Some(point.full_label.as_str()),
                    Some(am_str.as_str()),
                    Some(val_str.as_str()),
                    Some(units.as_str()),
                    Some(range_str.as_str()),
                    Some(status_str.as_str()),
                    da_str.as_deref(),
                    point.label.as_deref(),
                )
                .await
                .map_err(AppError::DatabaseError)
            }
        }
    }

    // -----------------------------------------------------------------------
    // Trend logs
    // -----------------------------------------------------------------------

    /// Insert trend log detail rows for all points in the device snapshot.
    /// Parent rows (TRENDLOG_DATA) are get-or-created; detail rows are always inserted.
    pub async fn insert_trendlogs(
        &self,
        serial_number: i32,
        device_data: &DeviceWithPoints,
    ) -> Result<(), AppError> {
        match self {
            SyncWriter::Sqlite(db) => {
                T3000MainService::insert_trend_logs(db, serial_number, device_data, 0).await
            }
            SyncWriter::MssqlDirect(pool) => {
                mssql_insert_trendlogs(pool, serial_number, device_data).await
            }
        }
    }
}

// ---------------------------------------------------------------------------
// MSSQL-specific trendlog helper
// ---------------------------------------------------------------------------

/// Write trendlog history directly into the MSSQL center DB.
/// For each point: get-or-create the parent row, then INSERT one detail row.
async fn mssql_insert_trendlogs(
    pool: &MssqlPool,
    serial_number: i32,
    device_data: &DeviceWithPoints,
) -> Result<(), AppError> {
    let panel_id = device_data.device_info.panel_id;

    // -- INPUT points --
    let input_time =
        T3000MainService::format_unix_timestamp_to_local(&device_data.device_info.input_logging_time);
    for point in &device_data.input_points {
        let units = T3000MainService::derive_units_from_range(point.range);
        let range_str = point.range.to_string();
        let da_str = point.digital_analog.map(|da| da.to_string());
        let point_id = point.id.clone().unwrap_or_else(|| format!("IN{}", point.index));

        let parent_id = mssql_queries::get_or_create_trendlog_parent(
            pool,
            serial_number,
            panel_id,
            &point_id,
            point.index as i32,
            "INPUT",
            da_str.as_deref(),
            Some(range_str.as_str()),
            Some(units.as_str()),
            None,
        )
        .await
        .map_err(AppError::DatabaseError)?;

        mssql_queries::insert_trendlog_detail(
            pool,
            parent_id,
            &point.value.to_string(),
            &input_time,
        )
        .await
        .map_err(AppError::DatabaseError)?;
    }

    // -- OUTPUT points --
    let output_time =
        T3000MainService::format_unix_timestamp_to_local(&device_data.device_info.output_logging_time);
    for point in &device_data.output_points {
        let units = T3000MainService::derive_units_from_range(point.range);
        let range_str = point.range.to_string();
        let da_str = point.digital_analog.map(|da| da.to_string());
        let point_id = point.id.clone().unwrap_or_else(|| format!("OUT{}", point.index));

        let parent_id = mssql_queries::get_or_create_trendlog_parent(
            pool,
            serial_number,
            panel_id,
            &point_id,
            point.index as i32,
            "OUTPUT",
            da_str.as_deref(),
            Some(range_str.as_str()),
            Some(units.as_str()),
            None,
        )
        .await
        .map_err(AppError::DatabaseError)?;

        mssql_queries::insert_trendlog_detail(
            pool,
            parent_id,
            &point.value.to_string(),
            &output_time,
        )
        .await
        .map_err(AppError::DatabaseError)?;
    }

    // -- VARIABLE points --
    let variable_time = T3000MainService::format_unix_timestamp_to_local(
        &device_data.device_info.variable_logging_time,
    );
    for point in &device_data.variable_points {
        let units = T3000MainService::derive_units_from_range(point.range);
        let range_str = point.range.to_string();
        let da_str = point.digital_analog.map(|da| da.to_string());
        let point_id = point.id.clone().unwrap_or_else(|| format!("VAR{}", point.index));

        let parent_id = mssql_queries::get_or_create_trendlog_parent(
            pool,
            serial_number,
            panel_id,
            &point_id,
            point.index as i32,
            "VARIABLE",
            da_str.as_deref(),
            Some(range_str.as_str()),
            Some(units.as_str()),
            None,
        )
        .await
        .map_err(AppError::DatabaseError)?;

        mssql_queries::insert_trendlog_detail(
            pool,
            parent_id,
            &point.value.to_string(),
            &variable_time,
        )
        .await
        .map_err(AppError::DatabaseError)?;
    }

    Ok(())
}
