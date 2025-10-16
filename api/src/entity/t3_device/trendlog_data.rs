// T3000 TRENDLOG_DATA Entity - Complete T3000 logging data with comprehensive field mapping
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "TRENDLOG_DATA")]
#[serde(rename_all = "camelCase")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false, column_name = "SerialNumber")]
    pub serial_number: i32,                    // C++ SerialNumber (references DEVICES.SerialNumber)

    #[sea_orm(primary_key, auto_increment = false, column_name = "PanelId")]
    pub panel_id: i32,                         // C++ PanelId (panel identification)

    #[sea_orm(primary_key, auto_increment = false, column_name = "PointId")]
    pub point_id: String,                      // C++ Point ID (e.g., "IN1", "OUT1", "VAR128" from JSON "id" field)

    #[sea_orm(primary_key, auto_increment = false, column_name = "PointIndex")]
    pub point_index: i32,                      // C++ Point Index (numeric index from JSON "index" field)

    #[sea_orm(primary_key, auto_increment = false, column_name = "PointType")]
    pub point_type: String,                    // C++ Point Type ('INPUT', 'OUTPUT', 'VARIABLE')

    #[sea_orm(primary_key, auto_increment = false, column_name = "LoggingTime")]
    pub logging_time: String,                  // C++ Logging Time (input_logging_time, output_logging_time, variable_logging_time)

    #[sea_orm(primary_key, auto_increment = false, column_name = "LoggingTime_Fmt")]
    pub logging_time_fmt: String,              // C++ Formatted Logging Time (e.g., "2025-08-25 12:23:40")

    #[sea_orm(column_name = "Value")]
    pub value: String,                         // C++ Point Value (actual sensor/point value)

    #[sea_orm(column_name = "Range_Field")]
    pub range_field: Option<String>,           // C++ Range (range information for units calculation)

    #[sea_orm(column_name = "Digital_Analog")]
    pub digital_analog: Option<String>,        // C++ Digital_Analog (0=digital, 1=analog from JSON)

    #[sea_orm(column_name = "Units")]
    pub units: Option<String>,                 // C++ Units (derived from range: C, degree, h/kh, etc.)

    #[sea_orm(column_name = "DataSource")]
    pub data_source: Option<i32>,              // Data source tracking (1=FFI_SYNC, 2=REALTIME)

    #[sea_orm(column_name = "SyncInterval")]
    pub sync_interval: Option<i32>,            // Sync interval in seconds

    #[sea_orm(column_name = "CreatedBy")]
    pub created_by: Option<i32>,               // Creator identification (1=FFI_SYNC_SERVICE, 2=FRONTEND)
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
