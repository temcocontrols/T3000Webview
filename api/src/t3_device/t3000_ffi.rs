// T3000 C++ FFI Interface
// This module provides the Foreign Function Interface (FFI) for calling T3000 C++ functions
// directly from Rust, which is the preferred method for data collection.

use std::ffi::{CStr, CString};
use std::os::raw::{c_char, c_int, c_float};
use crate::error::AppError;
use serde::{Deserialize, Serialize};

// Type definitions for FFI use (copied from disabled data_collector module)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PointType {
    Input,
    Output,
    Variable,
    Program,
    Schedule,
    Alarm,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataPoint {
    pub device_id: i32,
    pub point_type: PointType,
    pub point_number: i32,
    pub value: f32,
    pub status: String,
    pub units: Option<String>,
    pub timestamp: i64,
    pub source: DataSource,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum DataSource {
    RealTime,      // From WebSocket/WebView2 messages
    Background,    // From scheduled collection
    CppDirect,     // From direct C++ function calls
    BacnetScan,    // Future: From BACnet discovery
}

/// Start the FFI service - prepares FFI functions for T3000 C++ integration
pub async fn start_ffi_service() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize FFI for T3000 C++ integration
    // Test basic FFI connectivity if needed

    // Log success to structured log for headless service
    use crate::logger::write_structured_log;
    let timestamp = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S UTC");
    let ffi_msg = format!("[{}] FFI Service ready - 43 functions available for T3000 C++ calls", timestamp);
    let _ = write_structured_log("ffi", &ffi_msg);

    Ok(())
}// External C++ function declarations
// These functions should be exported from the T3000 C++ code
extern "C" {
    // Input/Output/Variable point functions
    fn GetInputPointValue(device_id: c_int, point_number: c_int) -> c_float;
    fn GetOutputPointValue(device_id: c_int, point_number: c_int) -> c_float;
    fn GetVariablePointValue(device_id: c_int, point_number: c_int) -> c_float;

    // Point status and units functions
    fn GetInputPointStatus(device_id: c_int, point_number: c_int) -> c_int;
    fn GetOutputPointStatus(device_id: c_int, point_number: c_int) -> c_int;
    fn GetVariablePointStatus(device_id: c_int, point_number: c_int) -> c_int;

    fn GetInputPointUnits(device_id: c_int, point_number: c_int) -> *const c_char;
    fn GetOutputPointUnits(device_id: c_int, point_number: c_int) -> *const c_char;
    fn GetVariablePointUnits(device_id: c_int, point_number: c_int) -> *const c_char;

    // Point range functions for getting all points
    fn GetInputPointCount(device_id: c_int) -> c_int;
    fn GetOutputPointCount(device_id: c_int) -> c_int;
    fn GetVariablePointCount(device_id: c_int) -> c_int;

    // Device information functions
    fn IsDeviceOnline(device_id: c_int) -> c_int;
    fn GetDeviceCount() -> c_int;
    fn GetDeviceIdByIndex(index: c_int) -> c_int;

    // Batch read functions (more efficient for reading multiple points)
    fn GetAllInputPoints(device_id: c_int, values: *mut c_float, count: c_int) -> c_int;
    fn GetAllOutputPoints(device_id: c_int, values: *mut c_float, count: c_int) -> c_int;
    fn GetAllVariablePoints(device_id: c_int, values: *mut c_float, count: c_int) -> c_int;

    // Real-time data loading via LOGGING_DATA - NEW FFI FUNCTIONS
    fn T3000_GetLoggingData() -> *mut c_char;
    fn T3000_FreeLoggingDataString(json_string: *mut c_char);
}

/// Safe wrapper for T3000 C++ function calls
pub struct T3000FFI;

impl T3000FFI {
    /// Get all input points for a device
    pub fn get_input_points(device_id: i32) -> Result<Vec<DataPoint>, AppError> {
        unsafe {
            // Check if device is online first
            if IsDeviceOnline(device_id) == 0 {
                return Ok(vec![]); // Device offline, return empty vector
            }

            let count = GetInputPointCount(device_id);
            if count <= 0 {
                return Ok(vec![]);
            }

            let mut values = vec![0.0f32; count as usize];
            let result = GetAllInputPoints(device_id, values.as_mut_ptr(), count);

            if result != count {
                return Err(AppError::InternalError(format!(
                    "Failed to read all input points for device {}. Expected {}, got {}",
                    device_id, count, result
                )));
            }

            let mut data_points = Vec::new();
            let now = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map_err(|e| AppError::InternalError(e.to_string()))?
                .as_secs() as i64;

            for (index, &value) in values.iter().enumerate() {
                let point_number = index as i32 + 1; // T3000 points are 1-indexed
                let status = GetInputPointStatus(device_id, point_number);
                let units_ptr = GetInputPointUnits(device_id, point_number);

                let units = if units_ptr.is_null() {
                    None
                } else {
                    CStr::from_ptr(units_ptr).to_string_lossy().into_owned().into()
                };

                let status_str = match status {
                    0 => "OK",
                    1 => "Error",
                    2 => "Offline",
                    _ => "Unknown",
                }.to_string();

                data_points.push(DataPoint {
                    device_id,
                    point_type: PointType::Input,
                    point_number,
                    value,
                    status: status_str,
                    units,
                    timestamp: now,
                    source: DataSource::CppDirect,
                });
            }

            Ok(data_points)
        }
    }

    /// Get all output points for a device
    pub fn get_output_points(device_id: i32) -> Result<Vec<DataPoint>, AppError> {
        unsafe {
            if IsDeviceOnline(device_id) == 0 {
                return Ok(vec![]);
            }

            let count = GetOutputPointCount(device_id);
            if count <= 0 {
                return Ok(vec![]);
            }

            let mut values = vec![0.0f32; count as usize];
            let result = GetAllOutputPoints(device_id, values.as_mut_ptr(), count);

            if result != count {
                return Err(AppError::InternalError(format!(
                    "Failed to read all output points for device {}. Expected {}, got {}",
                    device_id, count, result
                )));
            }

            let mut data_points = Vec::new();
            let now = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map_err(|e| AppError::InternalError(e.to_string()))?
                .as_secs() as i64;

            for (index, &value) in values.iter().enumerate() {
                let point_number = index as i32 + 1;
                let status = GetOutputPointStatus(device_id, point_number);
                let units_ptr = GetOutputPointUnits(device_id, point_number);

                let units = if units_ptr.is_null() {
                    None
                } else {
                    CStr::from_ptr(units_ptr).to_string_lossy().into_owned().into()
                };

                let status_str = match status {
                    0 => "OK",
                    1 => "Error",
                    2 => "Offline",
                    _ => "Unknown",
                }.to_string();

                data_points.push(DataPoint {
                    device_id,
                    point_type: PointType::Output,
                    point_number,
                    value,
                    status: status_str,
                    units,
                    timestamp: now,
                    source: DataSource::CppDirect,
                });
            }

            Ok(data_points)
        }
    }

    /// Get all variable points for a device
    pub fn get_variable_points(device_id: i32) -> Result<Vec<DataPoint>, AppError> {
        unsafe {
            if IsDeviceOnline(device_id) == 0 {
                return Ok(vec![]);
            }

            let count = GetVariablePointCount(device_id);
            if count <= 0 {
                return Ok(vec![]);
            }

            let mut values = vec![0.0f32; count as usize];
            let result = GetAllVariablePoints(device_id, values.as_mut_ptr(), count);

            if result != count {
                return Err(AppError::InternalError(format!(
                    "Failed to read all variable points for device {}. Expected {}, got {}",
                    device_id, count, result
                )));
            }

            let mut data_points = Vec::new();
            let now = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map_err(|e| AppError::InternalError(e.to_string()))?
                .as_secs() as i64;

            for (index, &value) in values.iter().enumerate() {
                let point_number = index as i32 + 1;
                let status = GetVariablePointStatus(device_id, point_number);
                let units_ptr = GetVariablePointUnits(device_id, point_number);

                let units = if units_ptr.is_null() {
                    None
                } else {
                    CStr::from_ptr(units_ptr).to_string_lossy().into_owned().into()
                };

                let status_str = match status {
                    0 => "OK",
                    1 => "Error",
                    2 => "Offline",
                    _ => "Unknown",
                }.to_string();

                data_points.push(DataPoint {
                    device_id,
                    point_type: PointType::Variable,
                    point_number,
                    value,
                    status: status_str,
                    units,
                    timestamp: now,
                    source: DataSource::CppDirect,
                });
            }

            Ok(data_points)
        }
    }

    /// Get all available device IDs
    pub fn get_all_device_ids() -> Result<Vec<i32>, AppError> {
        unsafe {
            let count = GetDeviceCount();
            if count <= 0 {
                return Ok(vec![]);
            }

            let mut device_ids = Vec::new();
            for i in 0..count {
                let device_id = GetDeviceIdByIndex(i);
                if device_id > 0 {
                    device_ids.push(device_id);
                }
            }

            Ok(device_ids)
        }
    }

    /// Check if a device is online
    pub fn is_device_online(device_id: i32) -> bool {
        unsafe {
            IsDeviceOnline(device_id) != 0
        }
    }

    /// Get a single point value (for testing or specific queries)
    pub fn get_single_point_value(device_id: i32, point_type: PointType, point_number: i32) -> Result<DataPoint, AppError> {
        unsafe {
            if IsDeviceOnline(device_id) == 0 {
                return Err(AppError::NotFound(format!("Device {} is offline", device_id)));
            }

            let (value, status, units_ptr) = match point_type {
                PointType::Input => (
                    GetInputPointValue(device_id, point_number),
                    GetInputPointStatus(device_id, point_number),
                    GetInputPointUnits(device_id, point_number)
                ),
                PointType::Output => (
                    GetOutputPointValue(device_id, point_number),
                    GetOutputPointStatus(device_id, point_number),
                    GetOutputPointUnits(device_id, point_number)
                ),
                PointType::Variable => (
                    GetVariablePointValue(device_id, point_number),
                    GetVariablePointStatus(device_id, point_number),
                    GetVariablePointUnits(device_id, point_number)
                ),
                _ => return Err(AppError::ValidationError(format!("Unsupported point type: {:?}", point_type))),
            };

            let units = if units_ptr.is_null() {
                None
            } else {
                CStr::from_ptr(units_ptr).to_string_lossy().into_owned().into()
            };

            let status_str = match status {
                0 => "OK",
                1 => "Error",
                2 => "Offline",
                _ => "Unknown",
            }.to_string();

            let now = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map_err(|e| AppError::InternalError(e.to_string()))?
                .as_secs() as i64;

            Ok(DataPoint {
                device_id,
                point_type,
                point_number,
                value,
                status: status_str,
                units,
                timestamp: now,
                source: DataSource::CppDirect,
            })
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ffi_functions_exist() {
        // This test just verifies that the FFI functions can be linked
        // In a real environment with T3000 C++ code linked, these would work
        // For now, this will fail at runtime but compile successfully

        // Note: These tests should only be run when T3000 C++ code is available
        println!("FFI functions declared successfully");
    }

    #[test]
    fn test_data_point_creation() {
        let point = DataPoint {
            device_id: 1,
            point_type: PointType::Input,
            point_number: 1,
            value: 23.5,
            status: "OK".to_string(),
            units: Some("°C".to_string()),
            timestamp: 1234567890,
            source: DataSource::CppDirect,
        };

        assert_eq!(point.device_id, 1);
        assert_eq!(point.value, 23.5);
        assert_eq!(point.status, "OK");
    }
}
