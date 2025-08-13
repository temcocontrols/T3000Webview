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

// Batch operations for efficiency
int GetBatchPointValues(int device_id, int* point_numbers, int* point_types,
                       float* values, int count);
int SetBatchPointValues(int device_id, int* point_numbers, int* point_types,
                       float* values, int count);

// Device control
int ConnectToDevice(int device_id);
int DisconnectFromDevice(int device_id);
int RefreshDeviceData(int device_id);

#ifdef __cplusplus
}
#endif

#endif // T3000_FFI_H
