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
}

// Global initialization state
static bool g_ffi_initialized = false;
static std::mutex g_ffi_mutex;

// Initialize T3000 system on first use
bool EnsureT3000Initialized() {
    std::lock_guard<std::mutex> lock(g_ffi_mutex);

    if (!g_ffi_initialized) {
        if (T3000_Initialize()) {
            g_ffi_initialized = true;
        }
    }

    return g_ffi_initialized;
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
