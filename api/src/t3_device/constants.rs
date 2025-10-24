/// Constants for TRENDLOG_DATA DataSource field values (integers for space efficiency)
/// These represent the origin/source of the trendlog data
pub const DATA_SOURCE_FFI_SYNC: i32 = 1;     // Data synchronized from FFI/C++ layer
pub const DATA_SOURCE_REALTIME: i32 = 2;     // Real-time data from frontend
pub const DATA_SOURCE_HISTORICAL: i32 = 3;   // Historical import data (reserved)
pub const DATA_SOURCE_MANUAL: i32 = 4;       // Manually entered data (reserved)

/// Constants for TRENDLOG_DATA CreatedBy field values (integers for space efficiency)
/// These represent which component created the trendlog data record
pub const CREATED_BY_FFI_SYNC_SERVICE: i32 = 1;  // Created by FFI sync service
pub const CREATED_BY_FRONTEND: i32 = 2;          // Created by frontend application
pub const CREATED_BY_BACKEND: i32 = 3;           // Created by backend service (reserved)
pub const CREATED_BY_API: i32 = 4;               // Created via API endpoint (reserved)


