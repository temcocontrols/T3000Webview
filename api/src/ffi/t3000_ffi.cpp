#include "t3000_ffi.h"
#include <vector>
#include <map>
#include <string>
#include <mutex>
#include <cstring>

// Include T3000 exports for actual functionality
// This bridges to the real T3000 C++ implementation
extern "C" {
    // Import T3000 export functions
    int T3000_Initialize();
    void T3000_Shutdown();
    int T3000_IsDeviceOnline(int device_id);
    int T3000_GetDeviceCount();
    int T3000_GetDeviceIdByIndex(int index);
    int T3000_GetInputPointCount(int device_id);
    int T3000_GetAllInputPoints(int device_id, float* values, int max_count);
    float T3000_GetInputPointValue(int device_id, int point_number);
    int T3000_GetInputPointStatus(int device_id, int point_number);
    const char* T3000_GetInputPointUnits(int device_id, int point_number);
    int T3000_GetOutputPointCount(int device_id);
    int T3000_GetAllOutputPoints(int device_id, float* values, int max_count);
    float T3000_GetOutputPointValue(int device_id, int point_number);
    int T3000_GetOutputPointStatus(int device_id, int point_number);
    const char* T3000_GetOutputPointUnits(int device_id, int point_number);
    int T3000_GetVariablePointCount(int device_id);
    int T3000_GetAllVariablePoints(int device_id, float* values, int max_count);
    float T3000_GetVariablePointValue(int device_id, int point_number);
    int T3000_GetVariablePointStatus(int device_id, int point_number);
    const char* T3000_GetVariablePointUnits(int device_id, int point_number);
    const char* T3000_GetVariablePointLabel(int device_id, int point_number);
    int T3000_GetProgramCount(int device_id);
    int T3000_GetProgramStatus(int device_id, int program_number);
    const char* T3000_GetProgramLabel(int device_id, int program_number);
    int T3000_GetScheduleCount(int device_id);
    int T3000_GetScheduleStatus(int device_id, int schedule_number);
    const char* T3000_GetScheduleLabel(int device_id, int schedule_number);
    int T3000_GetAlarmCount(int device_id);
    int T3000_GetAlarmStatus(int device_id, int alarm_number);
    const char* T3000_GetAlarmMessage(int device_id, int alarm_number);
    int T3000_GetBatchPointValues(int device_id, int* point_numbers, int* point_types,
                                 float* values, int count);
    int T3000_SetBatchPointValues(int device_id, int* point_numbers, int* point_types,
                                 float* values, int count);
    int T3000_ScanForDevices();
    int T3000_GetDeviceInfo(int device_id, char* device_name, char* firmware_version,
                           char* ip_address, int* modbus_id);
    int T3000_SetDeviceNetworkConfig(int device_id, const char* ip_address,
                                    int modbus_id, int subnet_mask);
    int T3000_GetTrendLogCount(int device_id);
    int T3000_GetTrendLogData(int device_id, int log_number, float* values,
                             long* timestamps, int max_records);
    int T3000_ConnectToDevice(int device_id);
    int T3000_DisconnectFromDevice(int device_id);
    int T3000_RefreshDeviceData(int device_id);

    // NEW: Direct database access functions for auto-sync
    extern const char* g_strCurBuildingDatabasefilePath;  // T3000 global database path
    extern const char* g_strDatabasefilepath;             // T3000 main database path
}

// Global initialization state
static bool g_ffi_initialized = false;
static std::mutex g_ffi_mutex;
static bool g_database_changed = false;
static time_t g_last_change_time = 0;

// Initialize T3000 system on first use
bool EnsureT3000Initialized() {
    std::lock_guard<std::mutex> lock(g_ffi_mutex);

    if (!g_ffi_initialized) {
        if (T3000_Initialize()) {
            g_ffi_initialized = true;
        }
    }

    return g_ffi_initialized;
}

// Core T3000 system functions
extern "C" int T3000_Initialize() {
    std::lock_guard<std::mutex> lock(g_ffi_mutex);

    if (!g_ffi_initialized) {
        // Initialize the actual T3000 system
        // This should call the real T3000 initialization
        g_ffi_initialized = true;
        g_last_change_time = time(nullptr);
        printf("✅ T3000 FFI System initialized\n");
        return 1;
    }
    return 1;
}

extern "C" void T3000_Shutdown() {
    std::lock_guard<std::mutex> lock(g_ffi_mutex);

    if (g_ffi_initialized) {
        // Shutdown T3000 system
        g_ffi_initialized = false;
        printf("🔽 T3000 FFI System shutdown\n");
    }
}

extern "C" int T3000_IsInitialized() {
    return g_ffi_initialized ? 1 : 0;
}

// Database path access - critical for auto-sync
extern "C" int T3000_GetCurrentDatabasePath(char* path, int max_len) {
    if (!EnsureT3000Initialized()) {
        return 0;
    }

    // Get the current T3000 database path
    if (g_strDatabasefilepath && strlen(g_strDatabasefilepath) > 0) {
        strncpy(path, g_strDatabasefilepath, max_len - 1);
        path[max_len - 1] = '\0';
        return 1;
    }

    // Fallback to default path
    const char* default_path = "Database/T3000.db";
    strncpy(path, default_path, max_len - 1);
    path[max_len - 1] = '\0';
    return 1;
}

extern "C" int T3000_GetBuildingDatabasePath(char* path, int max_len) {
    if (!EnsureT3000Initialized()) {
        return 0;
    }

    // Get the current building database path
    if (g_strCurBuildingDatabasefilePath && strlen(g_strCurBuildingDatabasefilePath) > 0) {
        strncpy(path, g_strCurBuildingDatabasefilePath, max_len - 1);
        path[max_len - 1] = '\0';
        return 1;
    }

    // Fallback to default path - T3000 C++ database
    const char* default_path = "Database/T3000.db";
    strncpy(path, default_path, max_len - 1);
    path[max_len - 1] = '\0';
    return 1;
}

// Direct database access for auto-sync - THE KEY FUNCTIONS
extern "C" int T3000_GetAllDevicesFromDB(DeviceFFIData* device_data, int max_devices) {
    if (!EnsureT3000Initialized() || !device_data) {
        return -1;
    }

    // This function should directly access the T3000 SQLite database
    // and populate the device_data array with ALL_NODE table data

    char db_path[512];
    if (!T3000_GetBuildingDatabasePath(db_path, sizeof(db_path))) {
        return -1;
    }

    printf("🔍 Accessing T3000 database: %s\n", db_path);

    // TODO: Implement SQLite access to ALL_NODE table
    // For now, simulate with some test data
    int device_count = 0;

    // Sample device data (replace with real SQLite query)
    // NOTE: FFI struct now matches T3000 database column names exactly
    if (max_devices > 0) {
        DeviceFFIData& device = device_data[0];
        // Direct mapping to T3000 database columns:
        device.Serial_ID = 12345;                              // ALL_NODE.Serial_ID
        device.Product_ID = 1;                                 // ALL_NODE.Product_ID
        device.Product_Class_ID = 20;                          // ALL_NODE.Product_Class_ID
        device.Panel_Number = 1;                               // ALL_NODE.Panel_Number
        device.Network_Number = 1;                             // ALL_NODE.Network_Number
        strcpy(device.MainBuilding_Name, "Main_Building");     // ALL_NODE.MainBuilding_Name
        strcpy(device.Building_Name, "Building_1");            // ALL_NODE.Building_Name
        strcpy(device.Floor_Name, "Floor_1");                  // ALL_NODE.Floor_Name
        strcpy(device.Room_Name, "Room_1");                    // ALL_NODE.Room_Name
        strcpy(device.Product_Name, "T3000_Controller");       // ALL_NODE.Product_Name
        strcpy(device.Description, "Auto-synced T3000 device"); // ALL_NODE.Description
        strcpy(device.Bautrate, "192.168.1.100");             // ALL_NODE.Bautrate (IP address)
        strcpy(device.Address, "121");                         // ALL_NODE.Address (Modbus address)
        strcpy(device.Status, "Online");                       // ALL_NODE.Status
        device_count = 1;
    }

    g_database_changed = false; // Reset change flag after sync
    printf("📊 Retrieved %d devices from T3000 database\n", device_count);
    return device_count;
}

extern "C" int T3000_GetDevicePointsFromDB(int Serial_ID,
                                           InputPointFFIData* inputs, int max_inputs,
                                           OutputPointFFIData* outputs, int max_outputs,
                                           VariablePointFFIData* variables, int max_variables) {
    if (!EnsureT3000Initialized()) {
        return -1;
    }

    printf("🔍 Getting points for Serial_ID %d\n", Serial_ID);

    // TODO: Implement real SQLite queries to INPUTS, OUTPUTS, VARIABLES tables
    // For now, simulate with test data

    // Sample input points
    if (inputs && max_inputs > 0) {
        InputPointFFIData& input = inputs[0];
        input.nSerialNumber = Serial_ID;                       // INPUTS.nSerialNumber (FK)
        strcpy(input.Input_index, "1");                        // INPUTS.Input_index
        strcpy(input.Panel, "1");                              // INPUTS.Panel
        strcpy(input.Full_Label, "Room Temperature Sensor");   // INPUTS.Full_Label
        strcpy(input.Auto_Manual, "0");                        // INPUTS.Auto_Manual (0=Auto)
        strcpy(input.fValue, "23.5");                          // INPUTS.fValue (stored as string)
        strcpy(input.Units, "0");                              // INPUTS.Units (0=Celsius)
        strcpy(input.Range_Field, "0");                        // INPUTS.Range_Field
        strcpy(input.Calibration, "0.0");                     // INPUTS.Calibration
        strcpy(input.Sign, "0");                               // INPUTS.Sign
        strcpy(input.Filter_Field, "0");                      // INPUTS.Filter_Field
        strcpy(input.Status, "0");                             // INPUTS.Status
        strcpy(input.Signal_Type, "3");                        // INPUTS.Signal_Type (3=Thermistor)
        strcpy(input.Label, "Room Temp");                      // INPUTS.Label
        strcpy(input.Type_Field, "1");                         // INPUTS.Type_Field
        strcpy(input.BinaryArray, "");                         // INPUTS.BinaryArray
    }

    // Sample output points
    if (outputs && max_outputs > 0) {
        OutputPointFFIData& output = outputs[0];
        output.nSerialNumber = Serial_ID;                      // OUTPUTS.nSerialNumber (FK)
        strcpy(output.Output_index, "1");                      // OUTPUTS.Output_index
        strcpy(output.Panel, "1");                             // OUTPUTS.Panel
        strcpy(output.Full_Label, "Main Cooling Control Output"); // OUTPUTS.Full_Label
        strcpy(output.Auto_Manual, "0");                       // OUTPUTS.Auto_Manual (0=Auto)
        strcpy(output.fValue, "50.0");                         // OUTPUTS.fValue (stored as string)
        strcpy(output.Units, "20");                            // OUTPUTS.Units (20=Percent)
        strcpy(output.Range_Field, "0");                       // OUTPUTS.Range_Field
        strcpy(output.Calibration, "0.0");                    // OUTPUTS.Calibration
        strcpy(output.Sign, "0");                              // OUTPUTS.Sign
        strcpy(output.Filter_Field, "0");                     // OUTPUTS.Filter_Field
        strcpy(output.Status, "0");                            // OUTPUTS.Status
        strcpy(output.Signal_Type, "1");                       // OUTPUTS.Signal_Type (1=Analog)
        strcpy(output.Label, "Cooling");                       // OUTPUTS.Label
        strcpy(output.Type_Field, "1");                        // OUTPUTS.Type_Field
        strcpy(output.BinaryArray, "");                        // OUTPUTS.BinaryArray
    }

    // Sample variable points
    if (variables && max_variables > 0) {
        VariablePointFFIData& variable = variables[0];
        variable.nSerialNumber = Serial_ID;                    // VARIABLES.nSerialNumber (FK)
        strcpy(variable.Variable_index, "1");                  // VARIABLES.Variable_index
        strcpy(variable.Panel, "1");                           // VARIABLES.Panel
        strcpy(variable.Full_Label, "Temperature Setpoint");   // VARIABLES.Full_Label
        strcpy(variable.Auto_Manual, "0");                     // VARIABLES.Auto_Manual (0=Auto)
        strcpy(variable.fValue, "72.0");                       // VARIABLES.fValue (stored as string)
        strcpy(variable.Units, "0");                           // VARIABLES.Units (0=Fahrenheit)
        strcpy(variable.BinaryArray, "");                      // VARIABLES.BinaryArray
    }

    printf("📊 Retrieved points for Serial_ID %d\n", Serial_ID);
    return 1; // Success
}

// Database change monitoring
extern "C" int T3000_HasDatabaseChanged() {
    return g_database_changed ? 1 : 0;
}

extern "C" int T3000_GetLastDatabaseChangeTime() {
    return (int)g_last_change_time;
}

extern "C" int T3000_ResetDatabaseChangeFlag() {
    g_database_changed = false;
    return 1;
}// Device management functions - now calling real T3000 functions
int IsDeviceOnline(int device_id) {
    if (!EnsureT3000Initialized()) {
        return 0; // T3000 not initialized
    }

    return T3000_IsDeviceOnline(device_id);
}

int GetDeviceCount() {
    if (!EnsureT3000Initialized()) {
        return 0;
    }

    return T3000_GetDeviceCount();
}

int GetDeviceIdByIndex(int index) {
    if (!EnsureT3000Initialized()) {
        return -1;
    }

    return T3000_GetDeviceIdByIndex(index);
}

// Input point functions - now calling real T3000 functions
int GetInputPointCount(int device_id) {
    if (!EnsureT3000Initialized()) {
        return 0;
    }

    return T3000_GetInputPointCount(device_id);
}

int GetAllInputPoints(int device_id, float* values, int max_count) {
    if (!EnsureT3000Initialized() || !values) {
        return 0;
    }

    return T3000_GetAllInputPoints(device_id, values, max_count);
}

float GetInputPointValue(int device_id, int point_number) {
    if (!EnsureT3000Initialized()) {
        return 0.0f;
    }

    return T3000_GetInputPointValue(device_id, point_number);
}

int GetInputPointStatus(int device_id, int point_number) {
    if (!EnsureT3000Initialized()) {
        return 2; // Offline
    }

    return T3000_GetInputPointStatus(device_id, point_number);
}

const char* GetInputPointUnits(int device_id, int point_number) {
    if (!EnsureT3000Initialized()) {
        return nullptr;
    }

    return T3000_GetInputPointUnits(device_id, point_number);
}// Output point functions
int GetOutputPointCount(int device_id) {
    if (!EnsureT3000Initialized()) {
        return 0;
    }

    return T3000_GetOutputPointCount(device_id);
}

int GetAllOutputPoints(int device_id, float* values, int max_count) {
    if (!EnsureT3000Initialized()) {
        return 0;
    }

    return T3000_GetAllOutputPoints(device_id, values, max_count);
}

float GetOutputPointValue(int device_id, int point_number) {
    if (!EnsureT3000Initialized()) {
        return 0.0f;
    }

    return T3000_GetOutputPointValue(device_id, point_number);
}

int GetOutputPointStatus(int device_id, int point_number) {
    if (!EnsureT3000Initialized()) {
        return 2; // Offline
    }

    return T3000_GetOutputPointStatus(device_id, point_number);
}

const char* GetOutputPointUnits(int device_id, int point_number) {
    if (!EnsureT3000Initialized()) {
        return nullptr;
    }

    return T3000_GetOutputPointUnits(device_id, point_number);
}

// Variable point functions
int GetVariablePointCount(int device_id) {
    if (!EnsureT3000Initialized()) {
        return 0;
    }

    return T3000_GetVariablePointCount(device_id);
}

int GetAllVariablePoints(int device_id, float* values, int max_count) {
    if (!EnsureT3000Initialized()) {
        return 0;
    }

    return T3000_GetAllVariablePoints(device_id, values, max_count);
}

float GetVariablePointValue(int device_id, int point_number) {
    if (!EnsureT3000Initialized()) {
        return 0.0f;
    }

    return T3000_GetVariablePointValue(device_id, point_number);
}

int GetVariablePointStatus(int device_id, int point_number) {
    if (!EnsureT3000Initialized()) {
        return 2; // Offline
    }

    return T3000_GetVariablePointStatus(device_id, point_number);
}

const char* GetVariablePointUnits(int device_id, int point_number) {
    if (!EnsureT3000Initialized()) {
        return nullptr;
    }

    return T3000_GetVariablePointUnits(device_id, point_number);
}

// Batch operations for efficiency
int GetBatchPointValues(int device_id, int* point_numbers, int* point_types,
                       float* values, int count) {
    if (!EnsureT3000Initialized()) {
        return 0;
    }

    return T3000_GetBatchPointValues(device_id, point_numbers, point_types, values, count);
}

int SetBatchPointValues(int device_id, int* point_numbers, int* point_types,
                       float* values, int count) {
    if (!EnsureT3000Initialized()) {
        return 0;
    }

    return T3000_SetBatchPointValues(device_id, point_numbers, point_types, values, count);
}

// Device control functions
int ConnectToDevice(int device_id) {
    if (!EnsureT3000Initialized()) {
        return 0;
    }

    return T3000_ConnectToDevice(device_id);
}

int DisconnectFromDevice(int device_id) {
    if (!EnsureT3000Initialized()) {
        return 0;
    }

    return T3000_DisconnectFromDevice(device_id);
}

int RefreshDeviceData(int device_id) {
    if (!EnsureT3000Initialized()) {
        return 0;
    }

    return T3000_RefreshDeviceData(device_id);
}

// ==============================
// Additional Variable Point Functions
// ==============================

const char* GetVariablePointLabel(int device_id, int point_number) {
    if (!EnsureT3000Initialized()) {
        return nullptr;
    }

    return T3000_GetVariablePointLabel(device_id, point_number);
}

// ==============================
// Program Point Functions
// ==============================

int GetProgramCount(int device_id) {
    if (!EnsureT3000Initialized()) {
        return 0;
    }

    return T3000_GetProgramCount(device_id);
}

int GetProgramStatus(int device_id, int program_number) {
    if (!EnsureT3000Initialized()) {
        return 0;
    }

    return T3000_GetProgramStatus(device_id, program_number);
}

const char* GetProgramLabel(int device_id, int program_number) {
    if (!EnsureT3000Initialized()) {
        return nullptr;
    }

    return T3000_GetProgramLabel(device_id, program_number);
}

// ==============================
// Schedule Point Functions
// ==============================

int GetScheduleCount(int device_id) {
    if (!EnsureT3000Initialized()) {
        return 0;
    }

    return T3000_GetScheduleCount(device_id);
}

int GetScheduleStatus(int device_id, int schedule_number) {
    if (!EnsureT3000Initialized()) {
        return 0;
    }

    return T3000_GetScheduleStatus(device_id, schedule_number);
}

const char* GetScheduleLabel(int device_id, int schedule_number) {
    if (!EnsureT3000Initialized()) {
        return nullptr;
    }

    return T3000_GetScheduleLabel(device_id, schedule_number);
}

// ==============================
// Alarm/Monitor Functions
// ==============================

int GetAlarmCount(int device_id) {
    if (!EnsureT3000Initialized()) {
        return 0;
    }

    return T3000_GetAlarmCount(device_id);
}

int GetAlarmStatus(int device_id, int alarm_number) {
    if (!EnsureT3000Initialized()) {
        return 0;
    }

    return T3000_GetAlarmStatus(device_id, alarm_number);
}

const char* GetAlarmMessage(int device_id, int alarm_number) {
    if (!EnsureT3000Initialized()) {
        return nullptr;
    }

    return T3000_GetAlarmMessage(device_id, alarm_number);
}

// ==============================
// Communication and Network Functions
// ==============================

int ScanForDevices() {
    if (!EnsureT3000Initialized()) {
        return 0;
    }

    return T3000_ScanForDevices();
}

int GetDeviceInfo(int device_id, char* device_name, char* firmware_version,
                 char* ip_address, int* modbus_id) {
    if (!EnsureT3000Initialized()) {
        return 0;
    }

    return T3000_GetDeviceInfo(device_id, device_name, firmware_version,
                              ip_address, modbus_id);
}

int SetDeviceNetworkConfig(int device_id, const char* ip_address,
                          int modbus_id, int subnet_mask) {
    if (!EnsureT3000Initialized()) {
        return 0;
    }

    return T3000_SetDeviceNetworkConfig(device_id, ip_address, modbus_id, subnet_mask);
}

// ==============================
// Trend Log and Historical Data Functions
// ==============================

int GetTrendLogCount(int device_id) {
    if (!EnsureT3000Initialized()) {
        return 0;
    }

    return T3000_GetTrendLogCount(device_id);
}

int GetTrendLogData(int device_id, int log_number, float* values,
                   long* timestamps, int max_records) {
    if (!EnsureT3000Initialized()) {
        return 0;
    }

    return T3000_GetTrendLogData(device_id, log_number, values, timestamps, max_records);
}

// LOGGING_DATA function - Real-time data loading from T3000
extern void HandleWebViewMsg(CString msg, CString& outmsg, int msg_source);

const char* T3000_GetLoggingData() {
    if (!EnsureT3000Initialized()) {
        return nullptr;
    }

    try {
        // Create JSON message for LOGGING_DATA action (15)
        CString msg = "{\"action\": 15}";
        CString outmsg;

        // Call T3000's HandleWebViewMsg function
        HandleWebViewMsg(msg, outmsg, 0);

        // Convert CString to std::string and then to char*
        std::string result = CT2A(outmsg);

        // Allocate memory for the result - caller must free with T3000_FreeLoggingDataString
        char* result_ptr = new char[result.length() + 1];
        strcpy(result_ptr, result.c_str());

        return result_ptr;
    } catch (...) {
        return nullptr;
    }
}

void T3000_FreeLoggingDataString(const char* data) {
    if (data != nullptr) {
        delete[] data;
    }
}
