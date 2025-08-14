#ifndef T3000_EXPORTS_H
#define T3000_EXPORTS_H

#ifdef __cplusplus
extern "C" {
#endif

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

// Legacy functions for backward compatibility
int T3000_Connect(const char* ip_address, int port);
int T3000_Disconnect();
int T3000_IsConnected();
int T3000_GetInputCount();
int T3000_GetInputValue(int point_number);
int T3000_GetInputStatus(int point_number);
const char* T3000_GetInputLabel(int point_number);
const char* T3000_GetInputUnits(int point_number);
int T3000_GetAllInputs(int* values, int max_count);
int T3000_GetOutputCount();
int T3000_GetOutputValue(int point_number);
int T3000_SetOutputValue(int point_number, int value);
int T3000_GetOutputStatus(int point_number);
const char* T3000_GetOutputLabel(int point_number);
const char* T3000_GetOutputUnits(int point_number);
int T3000_GetVariablePointCount();
int T3000_GetAllVariablePoints(int* values, int max_count);
int T3000_GetVariablePointValue(int point_number);
int T3000_GetVariablePointStatus(int point_number);
const char* T3000_GetVariablePointUnits(int point_number);
const char* T3000_GetVariablePointLabel(int point_number);
int T3000_GetProgramCount();
int T3000_GetProgramStatus(int program_number);
const char* T3000_GetProgramLabel(int program_number);
int T3000_GetScheduleCount();
int T3000_GetScheduleStatus(int schedule_number);
const char* T3000_GetScheduleLabel(int schedule_number);
int T3000_GetAlarmCount();
int T3000_GetAlarmStatus(int alarm_number);
const char* T3000_GetAlarmMessage(int alarm_number);
int T3000_GetBatchPointValues(int* point_numbers, int* values, int count);
int T3000_SetBatchPointValues(int* point_numbers, int* values, int count);
int T3000_ScanForDevices();
int T3000_GetDeviceInfo(int device_id, char* name, char* firmware, char* ip, int* modbus_id);
int T3000_SetDeviceNetworkConfig(int device_id, const char* ip, int modbus_id);
int T3000_GetTrendLogCount();
int T3000_GetTrendLogData(int log_number, int* timestamps, int* values, int max_count);
int T3000_GetLastError();
const char* T3000_GetErrorMessage(int error_code);
void T3000_ClearError();

#ifdef __cplusplus
}
#endif

#endif // T3000_EXPORTS_H
