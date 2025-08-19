#ifndef T3000_EXPORTS_H
#define T3000_EXPORTS_H

#ifdef __cplusplus
extern "C" {
#endif

// FFI Data structures for auto-sync database access
typedef struct DeviceFFIData {
    char nSerialNumber[32];           // Device serial number
    char nProductModel[32];           // Product model number
    char strName[256];                // Device name/description
    char strIPAddress[64];            // IP address
    char nPort[16];                   // Port number
    char nBaudRate[16];               // Baud rate
    char nSubnetID[16];               // Subnet ID
    char nDeviceID[16];               // Device ID
    char nProtocol[16];               // Protocol type
    char nStationNumber[16];          // Station number
    char nObjectInstance[16];         // Object instance
    char nHardwareVersion[32];        // Hardware version
    char nSoftwareVersion[32];        // Software version
    char strNote[512];                // Notes
    char nStatus[16];                 // Device status
    char nLastOnline[32];             // Last online timestamp
    char nLastOffline[32];            // Last offline timestamp
    char strTimezone[64];             // Timezone
    char nTotalPoints[16];            // Total points count
    char nInputs[16];                 // Input points count
    char nOutputs[16];                // Output points count
    char nVariables[16];              // Variable points count
} DeviceFFIData;

typedef struct InputPointFFIData {
    char nDeviceSerial[32];           // Device serial number (FK)
    char Input_index[32];             // Input index
    char strDescription[256];         // Description
    char strLabel[64];                // Label
    char strUnits[32];                // Units
    char fValue[32];                  // Current value
    char nHighAlarm[32];              // High alarm threshold
    char nLowAlarm[32];               // Low alarm threshold
    char nRange[16];                  // Range setting
    char nFilter[16];                 // Filter setting
    char nStatus[16];                 // Status
    char nSignalType[16];             // Signal type
    char nJumper[16];                 // Jumper setting
    char nBypassError[16];            // Bypass error
    char strNote[512];                // Notes
} InputPointFFIData;

typedef struct OutputPointFFIData {
    char nDeviceSerial[32];           // Device serial number (FK)
    char Output_index[32];            // Output index
    char strDescription[256];         // Description
    char strLabel[64];                // Label
    char strUnits[32];                // Units
    char fValue[32];                  // Current value
    char nHighAlarm[32];              // High alarm threshold
    char nLowAlarm[32];               // Low alarm threshold
    char nRange[16];                  // Range setting
    char nLowVoltage[32];             // Low voltage setting
    char nStatus[16];                 // Status
    char nSignalType[16];             // Signal type
    char nPWMPeriod[16];              // PWM period
    char strNote[512];                // Notes
} OutputPointFFIData;

typedef struct VariablePointFFIData {
    char nDeviceSerial[32];           // Device serial number (FK)
    char Variable_index[32];          // Variable index
    char strDescription[256];         // Description
    char strLabel[64];                // Label
    char strUnits[32];                // Units
    char fValue[32];                  // Current value
    char nRange[16];                  // Range setting
    char nStatus[16];                 // Status
    char strNote[512];                // Notes
} VariablePointFFIData;

// Export functions for external access to T3000 functionality
// These functions bridge between the FFI interface and actual T3000 code

// System initialization and cleanup
int T3000_Initialize();
void T3000_Shutdown();
const char* T3000_GetVersion();

// Device management exports
int T3000_IsDeviceOnline(int device_id);
int T3000_GetDeviceCount();
int T3000_GetDeviceIdByIndex(int index);
int T3000_ConnectToDevice(int device_id);
int T3000_DisconnectFromDevice(int device_id);
int T3000_RefreshDeviceData(int device_id);

// Input point exports
int T3000_GetInputPointCount(int device_id);
int T3000_GetAllInputPoints(int device_id, float* values, int max_count);
float T3000_GetInputPointValue(int device_id, int point_number);
int T3000_GetInputPointStatus(int device_id, int point_number);
const char* T3000_GetInputPointUnits(int device_id, int point_number);
const char* T3000_GetInputPointLabel(int device_id, int point_number);

// Output point exports
int T3000_GetOutputPointCount(int device_id);
int T3000_GetAllOutputPoints(int device_id, float* values, int max_count);
float T3000_GetOutputPointValue(int device_id, int point_number);
int T3000_GetOutputPointStatus(int device_id, int point_number);
const char* T3000_GetOutputPointUnits(int device_id, int point_number);
const char* T3000_GetOutputPointLabel(int device_id, int point_number);

// Variable point exports
int T3000_GetVariablePointCount(int device_id);
int T3000_GetAllVariablePoints(int device_id, float* values, int max_count);
float T3000_GetVariablePointValue(int device_id, int point_number);
int T3000_GetVariablePointStatus(int device_id, int point_number);
const char* T3000_GetVariablePointUnits(int device_id, int point_number);
const char* T3000_GetVariablePointLabel(int device_id, int point_number);

// Program point exports
int T3000_GetProgramCount(int device_id);
int T3000_GetProgramStatus(int device_id, int program_number);
const char* T3000_GetProgramLabel(int device_id, int program_number);

// Schedule point exports
int T3000_GetScheduleCount(int device_id);
int T3000_GetScheduleStatus(int device_id, int schedule_number);
const char* T3000_GetScheduleLabel(int device_id, int schedule_number);

// Alarm/Monitor exports
int T3000_GetAlarmCount(int device_id);
int T3000_GetAlarmStatus(int device_id, int alarm_number);
const char* T3000_GetAlarmMessage(int device_id, int alarm_number);

// Batch operations for efficiency
int T3000_GetBatchPointValues(int device_id, int* point_numbers,
                             int* point_types, float* values, int count);
int T3000_SetBatchPointValues(int device_id, int* point_numbers,
                             int* point_types, float* values, int count);

// Communication and network exports
int T3000_ScanForDevices();
int T3000_GetDeviceInfo(int device_id, char* device_name, char* firmware_version,
                       char* ip_address, int* modbus_id);
int T3000_SetDeviceNetworkConfig(int device_id, const char* ip_address,
                                int modbus_id, int subnet_mask);

// Trend log and historical data exports
int T3000_GetTrendLogCount(int device_id);
int T3000_GetTrendLogData(int device_id, int log_number, float* values,
                         long* timestamps, int max_records);

// Error handling and diagnostics
const char* T3000_GetLastErrorMessage();
int T3000_GetLastErrorCode();
void T3000_ClearLastError();

// AUTO-SYNC DATABASE ACCESS FUNCTIONS - Added for WebView integration
int T3000_GetAllDevicesFromDB(DeviceFFIData* device_data, int max_devices);
int T3000_GetDevicePointsFromDB(const char* device_serial,
                               InputPointFFIData* inputs, int max_inputs,
                               OutputPointFFIData* outputs, int max_outputs,
                               VariablePointFFIData* variables, int max_variables,
                               int* input_count, int* output_count, int* variable_count);

// Database path access - critical for auto-sync
const char* T3000_GetDatabasePath();
int T3000_InitializeAutoSync();
void T3000_CleanupAutoSync();

#ifdef __cplusplus
}
#endif

#endif // T3000_EXPORTS_H
