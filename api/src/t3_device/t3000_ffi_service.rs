// T3000 FFI Service for T3000 WebView API
// This service provides comprehensive FFI bindings for T3000 C++ integration
// Includes device discovery, connection management, and data access functions
//
// FFI CAPABILITIES:
// - Device discovery and management (T3000_ScanForDevices, T3000_ConnectToDevice)
// - Point data access (Input/Output/Variable points)
// - Real-time data collection from T3000 controllers
// - Complete C++ function binding layer

use std::ffi::{CStr, CString};
use std::os::raw::{c_char, c_int, c_float};
use std::sync::{Arc, Mutex, atomic::{AtomicBool, Ordering}};
use std::time::Duration;
use tokio::time::sleep;
use sea_orm::*;
use serde::{Serialize, Deserialize};

use crate::entity::t3_device::{devices, input_points, output_points, variable_points};
use crate::error::AppError;
use crate::db_connection::establish_t3_device_connection;

// FFI bindings to T3000 C++ functions
extern "C" {
    // Core T3000 initialization
    fn T3000_Initialize() -> c_int;
    fn T3000_Shutdown();

    // Device discovery and management
    fn T3000_ScanForDevices() -> c_int;
    fn T3000_GetDeviceCount() -> c_int;
    fn T3000_GetDeviceIdByIndex(index: c_int) -> c_int;
    fn T3000_IsDeviceOnline(device_id: c_int) -> c_int;
    fn T3000_ConnectToDevice(device_id: c_int) -> c_int;
    fn T3000_RefreshDeviceData(device_id: c_int) -> c_int;

    // Device information
    fn T3000_GetDeviceInfo(
        device_id: c_int,
        device_name: *mut c_char,
        firmware_version: *mut c_char,
        ip_address: *mut c_char,
        modbus_id: *mut c_int
    ) -> c_int;

    // Point data access
    fn T3000_GetInputPointCount(device_id: c_int) -> c_int;
    fn T3000_GetOutputPointCount(device_id: c_int) -> c_int;
    fn T3000_GetVariablePointCount(device_id: c_int) -> c_int;

    fn T3000_GetAllInputPoints(device_id: c_int, values: *mut c_float, max_count: c_int) -> c_int;
    fn T3000_GetAllOutputPoints(device_id: c_int, values: *mut c_float, max_count: c_int) -> c_int;
    fn T3000_GetAllVariablePoints(device_id: c_int, values: *mut c_float, max_count: c_int) -> c_int;

    // Database path access - key for our auto-sync
    fn T3000_GetCurrentDatabasePath(path: *mut c_char, max_len: c_int) -> c_int;
    fn T3000_GetBuildingDatabasePath(path: *mut c_char, max_len: c_int) -> c_int;

    // Direct database sync - ideal for our use case
    fn T3000_GetAllDevicesFromDB(device_data: *mut DeviceFFIData, max_devices: c_int) -> c_int;
    fn T3000_GetDevicePointsFromDB(Serial_ID: c_int,
                                   inputs: *mut InputPointFFIData, max_inputs: c_int,
                                   outputs: *mut OutputPointFFIData, max_outputs: c_int,
                                   variables: *mut VariablePointFFIData, max_variables: c_int) -> c_int;
}

// FFI data structures matching T3000 database column names exactly
#[repr(C)]
#[derive(Debug, Clone)]
pub struct DeviceFFIData {
    pub SerialNumber: c_int,                   // DEVICES.SerialNumber (primary key, renamed from Serial_ID)
    pub PanelId: c_int,                        // DEVICES.PanelId (new column for panel identification)
    pub Product_ID: c_int,                     // DEVICES.Product_ID
    pub Product_Class_ID: c_int,               // DEVICES.Product_Class_ID
    pub Panel_Number: c_int,                   // DEVICES.Panel_Number
    pub Network_Number: c_int,                 // DEVICES.Network_Number
    pub MainBuilding_Name: [c_char; 256],      // DEVICES.MainBuilding_Name
    pub Building_Name: [c_char; 256],          // DEVICES.Building_Name
    pub Floor_Name: [c_char; 256],             // DEVICES.Floor_Name
    pub Room_Name: [c_char; 256],              // DEVICES.Room_Name
    pub Product_Name: [c_char; 256],           // DEVICES.Product_Name
    pub Description: [c_char; 256],            // DEVICES.Description
    pub Bautrate: [c_char; 64],                // DEVICES.Bautrate (IP address or baud rate)
    pub Address: [c_char; 64],                 // DEVICES.Address (Modbus address)
    pub Status: [c_char; 32],                  // DEVICES.Status
}

#[repr(C)]
#[derive(Debug, Clone)]
pub struct InputPointFFIData {
    pub SerialNumber: c_int,                   // INPUTS.SerialNumber (FK to DEVICES.SerialNumber)
    pub Input_index: [c_char; 32],             // INPUTS.Input_index
    pub Panel: [c_char; 32],                   // INPUTS.Panel
    pub Full_Label: [c_char; 256],             // INPUTS.Full_Label
    pub Auto_Manual: [c_char; 32],             // INPUTS.Auto_Manual
    pub fValue: [c_char; 32],                  // INPUTS.fValue (stored as string)
    pub Units: [c_char; 32],                   // INPUTS.Units
    pub Range_Field: [c_char; 32],             // INPUTS.Range_Field
    pub Calibration: [c_char; 32],             // INPUTS.Calibration
    pub Sign: [c_char; 32],                    // INPUTS.Sign
    pub Filter_Field: [c_char; 32],            // INPUTS.Filter_Field
    pub Status: [c_char; 32],                  // INPUTS.Status
    pub Signal_Type: [c_char; 32],             // INPUTS.Signal_Type
    pub Label: [c_char; 32],                   // INPUTS.Label
    pub Type_Field: [c_char; 32],              // INPUTS.Type_Field
    // Removed BinaryArray from schema
}

#[repr(C)]
#[derive(Debug, Clone)]
pub struct OutputPointFFIData {
    pub SerialNumber: c_int,                   // OUTPUTS.SerialNumber (FK to DEVICES.SerialNumber)
    pub Output_index: [c_char; 32],            // OUTPUTS.Output_index
    pub Panel: [c_char; 32],                   // OUTPUTS.Panel
    pub Full_Label: [c_char; 256],             // OUTPUTS.Full_Label
    pub Auto_Manual: [c_char; 32],             // OUTPUTS.Auto_Manual
    pub fValue: [c_char; 32],                  // OUTPUTS.fValue (stored as string)
    pub Units: [c_char; 32],                   // OUTPUTS.Units
    pub Range_Field: [c_char; 32],             // OUTPUTS.Range_Field
    pub Calibration: [c_char; 32],             // OUTPUTS.Calibration
    pub Sign: [c_char; 32],                    // OUTPUTS.Sign
    pub Filter_Field: [c_char; 32],            // OUTPUTS.Filter_Field
    pub Status: [c_char; 32],                  // OUTPUTS.Status
    pub Signal_Type: [c_char; 32],             // OUTPUTS.Signal_Type
    pub Label: [c_char; 32],                   // OUTPUTS.Label
    pub Type_Field: [c_char; 32],              // OUTPUTS.Type_Field
    // Removed BinaryArray from schema
}

#[repr(C)]
#[derive(Debug, Clone)]
pub struct VariablePointFFIData {
    pub SerialNumber: c_int,                   // VARIABLES.SerialNumber (FK to DEVICES.SerialNumber)
    pub Variable_index: [c_char; 32],          // VARIABLES.Variable_index
    pub Panel: [c_char; 32],                   // VARIABLES.Panel
    pub Full_Label: [c_char; 256],             // VARIABLES.Full_Label
    pub Auto_Manual: [c_char; 32],             // VARIABLES.Auto_Manual
    pub fValue: [c_char; 32],                  // VARIABLES.fValue (stored as string)
    pub Units: [c_char; 32],                   // VARIABLES.Units
    // Removed BinaryArray from schema
}

#[derive(Debug, Serialize, Deserialize)]
#[derive(Debug, Clone)]
pub struct AutoSyncStatus {
    pub enabled: bool,
    pub last_sync: String,
    pub total_devices: u64,
    pub total_inputs: u64,
    pub total_outputs: u64,
    pub total_variables: u64,
    pub sync_interval_seconds: u64,
    pub errors: Vec<String>,
}

pub struct T3000FFIService {
    db_connection: Arc<Mutex<DatabaseConnection>>,
    is_running: Arc<AtomicBool>,
    sync_interval: Duration,
    status: Arc<Mutex<AutoSyncStatus>>,
}

impl T3000FFIService {
    pub fn new(db_connection: Arc<Mutex<DatabaseConnection>>, sync_interval_seconds: u64) -> Self {
        Self {
            db_connection,
            is_running: Arc::new(AtomicBool::new(false)),
            sync_interval: Duration::from_secs(sync_interval_seconds),
            status: Arc::new(Mutex::new(AutoSyncStatus {
                enabled: false,
                last_sync: chrono::Utc::now().to_rfc3339(),
                total_devices: 0,
                total_inputs: 0,
                total_outputs: 0,
                total_variables: 0,
                sync_interval_seconds,
                errors: Vec::new(),
            })),
        }
    }

    /// Initialize T3000 and start auto-sync service
    pub async fn start_auto_sync(&self) -> Result<(), AppError> {
        // Initialize T3000 system
        let init_result = unsafe { T3000_Initialize() };
        if init_result == 0 {
            return Err(AppError::InternalError("Failed to initialize T3000 system".to_string()));
        }

        // Set running flag
        self.is_running.store(true, Ordering::SeqCst);

        // Update status
        {
            let mut status = self.status.lock().unwrap();
            status.enabled = true;
            status.errors.clear();
        }

        // Perform initial sync
        self.perform_sync_from_t3000().await?;

        // Start background sync loop
        let db_conn = Arc::clone(&self.db_connection);
        let is_running = Arc::clone(&self.is_running);
        let sync_interval = self.sync_interval;
        let status = Arc::clone(&self.status);

        tokio::spawn(async move {
            while is_running.load(Ordering::SeqCst) {
                sleep(sync_interval).await;

                if let Err(e) = Self::sync_from_t3000_ffi(&db_conn, &status).await {
                    eprintln!("Auto-sync error: {}", e);
                    let mut status_guard = status.lock().unwrap();
                    status_guard.errors.push(format!("Auto-sync failed: {}", e));
                }
            }
        });

        println!("✅ T3000 Auto-sync service started (interval: {} seconds)", sync_interval_seconds);
        Ok(())
    }

    /// Stop auto-sync service
    pub fn stop_auto_sync(&self) {
        self.is_running.store(false, Ordering::SeqCst);

        {
            let mut status = self.status.lock().unwrap();
            status.enabled = false;
        }

        unsafe {
            T3000_Shutdown();
        }

        println!("🛑 T3000 Auto-sync service stopped");
    }

    /// Perform manual sync from T3000 using FFI
    pub async fn perform_sync_from_t3000(&self) -> Result<AutoSyncStatus, AppError> {
        Self::sync_from_t3000_ffi(&self.db_connection, &self.status).await
    }

    /// Core sync logic using FFI direct access
    async fn sync_from_t3000_ffi(
        db_connection: &Arc<Mutex<DatabaseConnection>>,
        status: &Arc<Mutex<AutoSyncStatus>>,
    ) -> Result<AutoSyncStatus, AppError> {
        let db = db_connection.lock().unwrap();

        // Step 1: Scan for devices (triggers T3000 internal discovery)
        let scan_result = unsafe { T3000_ScanForDevices() };
        if scan_result == 0 {
            return Err(AppError::InternalError("T3000 device scan failed".to_string()));
        }

        // Step 2: Get all devices directly from T3000 database/memory
        const MAX_DEVICES: usize = 1000;
        let mut device_data: Vec<DeviceFFIData> = vec![
            unsafe { std::mem::zeroed() }; MAX_DEVICES
        ];

        let device_count = unsafe {
            T3000_GetAllDevicesFromDB(device_data.as_mut_ptr(), MAX_DEVICES as c_int)
        };

        if device_count < 0 {
            return Err(AppError::InternalError("Failed to get devices from T3000".to_string()));
        }

        // Clear existing webview data (webview_t3_device.db)
        // This ensures fresh sync from T3000.db → webview_t3_device.db
        devices::Entity::delete_many().exec(&*db).await?;
        input_points::Entity::delete_many().exec(&*db).await?;
        output_points::Entity::delete_many().exec(&*db).await?;
        variable_points::Entity::delete_many().exec(&*db).await?;

        let mut sync_stats = AutoSyncStatus {
            enabled: true,
            last_sync: chrono::Utc::now().to_rfc3339(),
            total_devices: 0,
            total_inputs: 0,
            total_outputs: 0,
            total_variables: 0,
            sync_interval_seconds: 30,
            errors: Vec::new(),
        };

        // Step 3: Process devices and insert into webview database
        for i in 0..(device_count as usize) {
            let device = &device_data[i];

            // Convert FFI data to SeaORM model - now field names match exactly
            let device_model = devices::ActiveModel {
                SerialNumber: Set(device.SerialNumber),
                PanelId: Set(Some(device.PanelId)),
                Product_ID: Set(Some(device.Product_ID)),
                Product_Class_ID: Set(Some(device.Product_Class_ID)),
                Panel_Number: Set(Some(device.Panel_Number)),
                Network_Number: Set(Some(device.Network_Number)),
                MainBuilding_Name: Set(Some(Self::c_str_to_string(&device.MainBuilding_Name))),
                Building_Name: Set(Some(Self::c_str_to_string(&device.Building_Name))),
                Floor_Name: Set(Some(Self::c_str_to_string(&device.Floor_Name))),
                Room_Name: Set(Some(Self::c_str_to_string(&device.Room_Name))),
                Product_Name: Set(Some(Self::c_str_to_string(&device.Product_Name))),
                Description: Set(Some(Self::c_str_to_string(&device.Description))),
                Bautrate: Set(Some(Self::c_str_to_string(&device.Bautrate))),
                Address: Set(Some(Self::c_str_to_string(&device.Address))),
                Status: Set(Some(Self::c_str_to_string(&device.Status))),
                ..Default::default()
            };

            // Insert device
            if device_model.insert(&*db).await.is_ok() {
                sync_stats.total_devices += 1;

                // Step 4: Get and insert point data for this device
                Self::sync_device_points(&*db, device.SerialNumber, &mut sync_stats).await?;
            }
        }

        // Update status
        {
            let mut status_guard = status.lock().unwrap();
            *status_guard = sync_stats;
        }

        println!("🔄 Auto-sync completed: {} devices, {} inputs, {} outputs, {} variables",
                 sync_stats.total_devices,
                 sync_stats.total_inputs,
                 sync_stats.total_outputs,
                 sync_stats.total_variables);

        Ok(sync_stats)
    }

    /// Sync point data for a specific device using FFI
    async fn sync_device_points(
        db: &DatabaseConnection,
        Serial_ID: c_int,
        stats: &mut AutoSyncStatus,
    ) -> Result<(), AppError> {
        const MAX_POINTS: usize = 500;

        // Prepare data arrays
        let mut inputs: Vec<InputPointFFIData> = vec![unsafe { std::mem::zeroed() }; MAX_POINTS];
        let mut outputs: Vec<OutputPointFFIData> = vec![unsafe { std::mem::zeroed() }; MAX_POINTS];
        let mut variables: Vec<VariablePointFFIData> = vec![unsafe { std::mem::zeroed() }; MAX_POINTS];

        // Get point data from T3000
        let point_result = unsafe {
            T3000_GetDevicePointsFromDB(
                Serial_ID,
                inputs.as_mut_ptr(), MAX_POINTS as c_int,
                outputs.as_mut_ptr(), MAX_POINTS as c_int,
                variables.as_mut_ptr(), MAX_POINTS as c_int
            )
        };

        if point_result < 0 {
            stats.errors.push(format!("Failed to get points for Serial_ID {}", Serial_ID));
            return Ok(()); // Continue with other devices
        }

        // Insert input points
        let input_count = unsafe { T3000_GetInputPointCount(Serial_ID) };
        for i in 0..(input_count as usize).min(MAX_POINTS) {
            let input = &inputs[i];
            let input_model = input_points::ActiveModel {
                SerialNumber: Set(Serial_ID),
                Input_index: Set(Some(Self::c_str_to_string(&input.Input_index))),
                Panel: Set(Some(Self::c_str_to_string(&input.Panel))),
                Full_Label: Set(Some(Self::c_str_to_string(&input.Full_Label))),
                Auto_Manual: Set(Some(Self::c_str_to_string(&input.Auto_Manual))),
                fValue: Set(Some(Self::c_str_to_string(&input.fValue))),
                Units: Set(Some(Self::c_str_to_string(&input.Units))),
                Range_Field: Set(Some(Self::c_str_to_string(&input.Range_Field))),
                Calibration: Set(Some(Self::c_str_to_string(&input.Calibration))),
                Sign: Set(Some(Self::c_str_to_string(&input.Sign))),
                Filter_Field: Set(Some(Self::c_str_to_string(&input.Filter_Field))),
                Status: Set(Some(Self::c_str_to_string(&input.Status))),
                Signal_Type: Set(Some(Self::c_str_to_string(&input.Signal_Type))),
                Label: Set(Some(Self::c_str_to_string(&input.Label))),
                Type_Field: Set(Some(Self::c_str_to_string(&input.Type_Field))),
                // BinaryArray removed from schema
                ..Default::default()
            };

            if input_model.insert(db).await.is_ok() {
                stats.total_inputs += 1;
            }
        }

        // Insert output points
        let output_count = unsafe { T3000_GetOutputPointCount(Serial_ID) };
        for i in 0..(output_count as usize).min(MAX_POINTS) {
            let output = &outputs[i];
            let output_model = output_points::ActiveModel {
                SerialNumber: Set(Serial_ID),
                Output_index: Set(Some(Self::c_str_to_string(&output.Output_index))),
                Panel: Set(Some(Self::c_str_to_string(&output.Panel))),
                Full_Label: Set(Some(Self::c_str_to_string(&output.Full_Label))),
                Auto_Manual: Set(Some(Self::c_str_to_string(&output.Auto_Manual))),
                fValue: Set(Some(Self::c_str_to_string(&output.fValue))),
                Units: Set(Some(Self::c_str_to_string(&output.Units))),
                Range_Field: Set(Some(Self::c_str_to_string(&output.Range_Field))),
                Calibration: Set(Some(Self::c_str_to_string(&output.Calibration))),
                Sign: Set(Some(Self::c_str_to_string(&output.Sign))),
                Filter_Field: Set(Some(Self::c_str_to_string(&output.Filter_Field))),
                Status: Set(Some(Self::c_str_to_string(&output.Status))),
                Signal_Type: Set(Some(Self::c_str_to_string(&output.Signal_Type))),
                Label: Set(Some(Self::c_str_to_string(&output.Label))),
                Type_Field: Set(Some(Self::c_str_to_string(&output.Type_Field))),
                // BinaryArray removed from schema
                ..Default::default()
            };

            if output_model.insert(db).await.is_ok() {
                stats.total_outputs += 1;
            }
        }

        // Insert variable points
        let variable_count = unsafe { T3000_GetVariablePointCount(Serial_ID) };
        for i in 0..(variable_count as usize).min(MAX_POINTS) {
            let variable = &variables[i];
            let variable_model = variable_points::ActiveModel {
                SerialNumber: Set(Serial_ID),
                Variable_index: Set(Some(Self::c_str_to_string(&variable.Variable_index))),
                Panel: Set(Some(Self::c_str_to_string(&variable.Panel))),
                Full_Label: Set(Some(Self::c_str_to_string(&variable.Full_Label))),
                Auto_Manual: Set(Some(Self::c_str_to_string(&variable.Auto_Manual))),
                fValue: Set(Some(Self::c_str_to_string(&variable.fValue))),
                Units: Set(Some(Self::c_str_to_string(&variable.Units))),
                // BinaryArray removed from schema
                ..Default::default()
            };

            if variable_model.insert(db).await.is_ok() {
                stats.total_variables += 1;
            }
        }

        Ok(())
    }

    /// Get current sync status
    pub fn get_sync_status(&self) -> AutoSyncStatus {
        *self.status.lock().unwrap()
    }

    /// Helper function to convert C string to Rust String
    fn c_str_to_string(c_array: &[c_char]) -> String {
        unsafe {
            let c_str = CStr::from_ptr(c_array.as_ptr());
            c_str.to_string_lossy().into_owned()
        }
    }
}

/// Initialize auto-sync service when T3000 WebView API starts
pub async fn initialize_t3000_auto_sync(
    db_connection: Arc<Mutex<DatabaseConnection>>,
    sync_interval_seconds: u64,
) -> Result<Arc<T3000FFIService>, AppError> {
    let ffi_service = Arc::new(T3000FFIService::new(
        db_connection,
        sync_interval_seconds,
    ));

    // Start the auto-sync service
    auto_sync_service.start_auto_sync().await?;

    println!("🚀 T3000 Auto-sync initialized and running");
    Ok(auto_sync_service)
}

// Graceful shutdown function
pub async fn shutdown_t3000_ffi(service: Arc<T3000FFIService>) {
    service.stop_auto_sync();
    println!("🔽 T3000 Auto-sync service shutdown complete");
}
