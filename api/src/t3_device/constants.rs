/// Constants for TRENDLOG_DATA DataSource field values
/// These represent the origin/source of the trendlog data
pub const DATA_SOURCE_FFI_SYNC: i32 = 1;     // Data synchronized from FFI/C++ layer
pub const DATA_SOURCE_REALTIME: i32 = 2;     // Real-time data from frontend
pub const DATA_SOURCE_HISTORICAL: i32 = 3;   // Historical import data (reserved)
pub const DATA_SOURCE_MANUAL: i32 = 4;       // Manually entered data (reserved)

/// Constants for TRENDLOG_DATA CreatedBy field values
/// These represent which component created the trendlog data record
pub const CREATED_BY_FFI_SYNC_SERVICE: i32 = 1;  // Created by FFI sync service
pub const CREATED_BY_FRONTEND: i32 = 2;          // Created by frontend application
pub const CREATED_BY_BACKEND: i32 = 3;           // Created by backend service (reserved)
pub const CREATED_BY_API: i32 = 4;               // Created via API endpoint (reserved)

/// Convert string data source to integer value for database storage
pub fn data_source_to_int(source: &str) -> Option<i32> {
    match source {
        "FFI_SYNC" => Some(DATA_SOURCE_FFI_SYNC),
        "REALTIME" => Some(DATA_SOURCE_REALTIME),
        "HISTORICAL" => Some(DATA_SOURCE_HISTORICAL),
        "MANUAL" => Some(DATA_SOURCE_MANUAL),
        _ => None,
    }
}

/// Convert integer data source to string representation
pub fn data_source_to_string(source: i32) -> Option<&'static str> {
    match source {
        DATA_SOURCE_FFI_SYNC => Some("FFI_SYNC"),
        DATA_SOURCE_REALTIME => Some("REALTIME"),
        DATA_SOURCE_HISTORICAL => Some("HISTORICAL"),
        DATA_SOURCE_MANUAL => Some("MANUAL"),
        _ => None,
    }
}

/// Convert string created_by to integer value for database storage
pub fn created_by_to_int(created: &str) -> Option<i32> {
    match created {
        "FFI_SYNC_SERVICE" => Some(CREATED_BY_FFI_SYNC_SERVICE),
        "FRONTEND" => Some(CREATED_BY_FRONTEND),
        "BACKEND" => Some(CREATED_BY_BACKEND),
        "API" => Some(CREATED_BY_API),
        _ => None,
    }
}

/// Convert integer created_by to string representation
pub fn created_by_to_string(created: i32) -> Option<&'static str> {
    match created {
        CREATED_BY_FFI_SYNC_SERVICE => Some("FFI_SYNC_SERVICE"),
        CREATED_BY_FRONTEND => Some("FRONTEND"),
        CREATED_BY_BACKEND => Some("BACKEND"),
        CREATED_BY_API => Some("API"),
        _ => None,
    }
}
