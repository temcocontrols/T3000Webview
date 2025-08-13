#ifndef T3000_FFI_H
#define T3000_FFI_H

#ifdef __cplusplus
extern "C" {
#endif

// Device management functions
int IsDeviceOnline(int device_id);
int GetDeviceCount();
int GetDeviceIdByIndex(int index);

// Input point functions
int GetInputPointCount(int device_id);
int GetAllInputPoints(int device_id, float* values, int max_count);
float GetInputPointValue(int device_id, int point_number);
int GetInputPointStatus(int device_id, int point_number);
const char* GetInputPointUnits(int device_id, int point_number);

// Output point functions
int GetOutputPointCount(int device_id);
int GetAllOutputPoints(int device_id, float* values, int max_count);
float GetOutputPointValue(int device_id, int point_number);
int GetOutputPointStatus(int device_id, int point_number);
const char* GetOutputPointUnits(int device_id, int point_number);

// Variable point functions
int GetVariablePointCount(int device_id);
int GetAllVariablePoints(int device_id, float* values, int max_count);
float GetVariablePointValue(int device_id, int point_number);
int GetVariablePointStatus(int device_id, int point_number);
const char* GetVariablePointUnits(int device_id, int point_number);
const char* GetVariablePointLabel(int device_id, int point_number);

// Program point functions
int GetProgramCount(int device_id);
int GetProgramStatus(int device_id, int program_number);
const char* GetProgramLabel(int device_id, int program_number);

// Schedule point functions
int GetScheduleCount(int device_id);
int GetScheduleStatus(int device_id, int schedule_number);
const char* GetScheduleLabel(int device_id, int schedule_number);

// Alarm/Monitor functions
int GetAlarmCount(int device_id);
int GetAlarmStatus(int device_id, int alarm_number);
const char* GetAlarmMessage(int device_id, int alarm_number);

// Batch operations for efficiency
int GetBatchPointValues(int device_id, int* point_numbers, int* point_types,
                       float* values, int count);
int SetBatchPointValues(int device_id, int* point_numbers, int* point_types,
                       float* values, int count);

// Communication and network functions
int ScanForDevices();
int GetDeviceInfo(int device_id, char* device_name, char* firmware_version,
                 char* ip_address, int* modbus_id);
int SetDeviceNetworkConfig(int device_id, const char* ip_address,
                          int modbus_id, int subnet_mask);

// Trend log and historical data functions
int GetTrendLogCount(int device_id);
int GetTrendLogData(int device_id, int log_number, float* values,
                   long* timestamps, int max_records);

// Device control
int ConnectToDevice(int device_id);
int DisconnectFromDevice(int device_id);
int RefreshDeviceData(int device_id);

#ifdef __cplusplus
}
#endif

#endif // T3000_FFI_H
