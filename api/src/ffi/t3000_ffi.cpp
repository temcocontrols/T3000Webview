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
}// Output point functions (similar pattern)
int GetOutputPointCount(int device_id) {
    InitializeMockData();
    std::lock_guard<std::mutex> lock(g_devices_mutex);

    auto it = g_devices.find(device_id);
    if (it == g_devices.end()) {
        return 0;
    }

    return static_cast<int>(it->second.output_values.size());
}

int GetAllOutputPoints(int device_id, float* values, int max_count) {
    InitializeMockData();
    std::lock_guard<std::mutex> lock(g_devices_mutex);

    auto it = g_devices.find(device_id);
    if (it == g_devices.end() || !values) {
        return 0;
    }

    const auto& device_values = it->second.output_values;
    int count = std::min(max_count, static_cast<int>(device_values.size()));

    for (int i = 0; i < count; i++) {
        values[i] = device_values[i];
    }

    return count;
}

float GetOutputPointValue(int device_id, int point_number) {
    InitializeMockData();
    std::lock_guard<std::mutex> lock(g_devices_mutex);

    auto it = g_devices.find(device_id);
    if (it == g_devices.end()) {
        return 0.0f;
    }

    int index = point_number - 1;
    if (index < 0 || index >= static_cast<int>(it->second.output_values.size())) {
        return 0.0f;
    }

    return it->second.output_values[index];
}

int GetOutputPointStatus(int device_id, int point_number) {
    InitializeMockData();
    std::lock_guard<std::mutex> lock(g_devices_mutex);

    auto it = g_devices.find(device_id);
    if (it == g_devices.end()) {
        return 2;
    }

    int index = point_number - 1;
    if (index < 0 || index >= static_cast<int>(it->second.output_status.size())) {
        return 1;
    }

    return it->second.output_status[index];
}

const char* GetOutputPointUnits(int device_id, int point_number) {
    InitializeMockData();
    std::lock_guard<std::mutex> lock(g_devices_mutex);

    auto it = g_devices.find(device_id);
    if (it == g_devices.end()) {
        return nullptr;
    }

    int index = point_number - 1;
    if (index < 0 || index >= static_cast<int>(it->second.output_units.size())) {
        return nullptr;
    }

    g_unit_buffer = it->second.output_units[index];
    return g_unit_buffer.c_str();
}

// Variable point functions (similar pattern)
int GetVariablePointCount(int device_id) {
    InitializeMockData();
    std::lock_guard<std::mutex> lock(g_devices_mutex);

    auto it = g_devices.find(device_id);
    if (it == g_devices.end()) {
        return 0;
    }

    return static_cast<int>(it->second.variable_values.size());
}

int GetAllVariablePoints(int device_id, float* values, int max_count) {
    InitializeMockData();
    std::lock_guard<std::mutex> lock(g_devices_mutex);

    auto it = g_devices.find(device_id);
    if (it == g_devices.end() || !values) {
        return 0;
    }

    const auto& device_values = it->second.variable_values;
    int count = std::min(max_count, static_cast<int>(device_values.size()));

    for (int i = 0; i < count; i++) {
        values[i] = device_values[i];
    }

    return count;
}

float GetVariablePointValue(int device_id, int point_number) {
    InitializeMockData();
    std::lock_guard<std::mutex> lock(g_devices_mutex);

    auto it = g_devices.find(device_id);
    if (it == g_devices.end()) {
        return 0.0f;
    }

    int index = point_number - 1;
    if (index < 0 || index >= static_cast<int>(it->second.variable_values.size())) {
        return 0.0f;
    }

    return it->second.variable_values[index];
}

int GetVariablePointStatus(int device_id, int point_number) {
    InitializeMockData();
    std::lock_guard<std::mutex> lock(g_devices_mutex);

    auto it = g_devices.find(device_id);
    if (it == g_devices.end()) {
        return 2;
    }

    int index = point_number - 1;
    if (index < 0 || index >= static_cast<int>(it->second.variable_status.size())) {
        return 1;
    }

    return it->second.variable_status[index];
}

const char* GetVariablePointUnits(int device_id, int point_number) {
    InitializeMockData();
    std::lock_guard<std::mutex> lock(g_devices_mutex);

    auto it = g_devices.find(device_id);
    if (it == g_devices.end()) {
        return nullptr;
    }

    int index = point_number - 1;
    if (index < 0 || index >= static_cast<int>(it->second.variable_units.size())) {
        return nullptr;
    }

    g_unit_buffer = it->second.variable_units[index];
    return g_unit_buffer.c_str();
}

// Batch operations for efficiency
int GetBatchPointValues(int device_id, int* point_numbers, int* point_types,
                       float* values, int count) {
    InitializeMockData();

    if (!point_numbers || !point_types || !values || count <= 0) {
        return 0;
    }

    int success_count = 0;
    for (int i = 0; i < count; i++) {
        float value = 0.0f;
        int point_type = point_types[i];
        int point_number = point_numbers[i];

        switch (point_type) {
            case 0: // Input
                value = GetInputPointValue(device_id, point_number);
                break;
            case 1: // Output
                value = GetOutputPointValue(device_id, point_number);
                break;
            case 2: // Variable
                value = GetVariablePointValue(device_id, point_number);
                break;
            default:
                continue; // Skip unknown point types
        }

        values[i] = value;
        success_count++;
    }

    return success_count;
}

int SetBatchPointValues(int device_id, int* point_numbers, int* point_types,
                       float* values, int count) {
    // TODO: Implement batch write functionality
    // For now, return success count (mock implementation)
    return count;
}

// Device control functions
int ConnectToDevice(int device_id) {
    InitializeMockData();
    std::lock_guard<std::mutex> lock(g_devices_mutex);

    auto it = g_devices.find(device_id);
    if (it != g_devices.end()) {
        it->second.is_online = true;
        return 1; // Success
    }

    return 0; // Device not found
}

int DisconnectFromDevice(int device_id) {
    InitializeMockData();
    std::lock_guard<std::mutex> lock(g_devices_mutex);

    auto it = g_devices.find(device_id);
    if (it != g_devices.end()) {
        it->second.is_online = false;
        return 1; // Success
    }

    return 0; // Device not found
}

int RefreshDeviceData(int device_id) {
    // TODO: Implement device data refresh
    // For now, return success (mock implementation)
    return 1;
}
