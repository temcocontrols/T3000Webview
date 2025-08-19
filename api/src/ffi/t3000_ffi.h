#ifndef T3000_FFI_H
#define T3000_FFI_H

#ifdef __cplusplus
extern "C" {
#endif

// Core T3000 system functions
int T3000_Initialize();
void T3000_Shutdown();
int T3000_IsInitialized();

// Database path access - critical for auto-sync
int T3000_GetCurrentDatabasePath(char* path, int max_len);
int T3000_GetBuildingDatabasePath(char* path, int max_len);

// Device management functions
int IsDeviceOnline(int device_id);
int GetDeviceCount();
int GetDeviceIdByIndex(int index);

// Device discovery and network operations
int T3000_ScanForDevices();
int T3000_ConnectToDevice(int device_id);
int T3000_DisconnectFromDevice(int device_id);
int T3000_RefreshDeviceData(int device_id);

// Device information
int T3000_GetDeviceInfo(int device_id, char* device_name, char* firmware_version,
                       char* ip_address, int* modbus_id);
int T3000_SetDeviceNetworkConfig(int device_id, const char* ip_address,
                                int modbus_id, int subnet_mask);

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

// Trendlog functions
int GetTrendLogCount(int device_id);
int GetTrendLogData(int device_id, int log_number, float* values,
                   long* timestamps, int max_records);

// Direct database access - UPDATED to match T3000 database column names
typedef struct DeviceFFIData {
    int Serial_ID;                    // ALL_NODE.Serial_ID (primary key)
    int Product_ID;                   // ALL_NODE.Product_ID
    int Product_Class_ID;             // ALL_NODE.Product_Class_ID
    int Panel_Number;                 // ALL_NODE.Panel_Number
    int Network_Number;               // ALL_NODE.Network_Number
    char MainBuilding_Name[256];      // ALL_NODE.MainBuilding_Name
    char Building_Name[256];          // ALL_NODE.Building_Name
    char Floor_Name[256];             // ALL_NODE.Floor_Name
    char Room_Name[256];              // ALL_NODE.Room_Name
    char Product_Name[256];           // ALL_NODE.Product_Name
    char Description[256];            // ALL_NODE.Description
    char Bautrate[64];                // ALL_NODE.Bautrate (IP address or baud rate)
    char Address[64];                 // ALL_NODE.Address (Modbus address)
    char Status[32];                  // ALL_NODE.Status
} DeviceFFIData;

typedef struct InputPointFFIData {
    int nSerialNumber;            // INPUTS.nSerialNumber (FK to ALL_NODE.Serial_ID)
    char Input_index[32];         // INPUTS.Input_index
    char Panel[32];               // INPUTS.Panel
    char Full_Label[256];         // INPUTS.Full_Label
    char Auto_Manual[32];         // INPUTS.Auto_Manual
    char fValue[32];              // INPUTS.fValue (stored as string in T3000.db)
    char Units[32];               // INPUTS.Units
    char Range_Field[32];         // INPUTS.Range_Field
    char Calibration[32];         // INPUTS.Calibration
    char Sign[32];                // INPUTS.Sign
    char Filter_Field[32];        // INPUTS.Filter_Field
    char Status[32];              // INPUTS.Status
    char Signal_Type[32];         // INPUTS.Signal_Type
    char Label[32];               // INPUTS.Label
    char Type_Field[32];          // INPUTS.Type_Field
    char BinaryArray[512];        // INPUTS.BinaryArray (hex encoded)
} InputPointFFIData;

typedef struct OutputPointFFIData {
    int nSerialNumber;            // OUTPUTS.nSerialNumber (FK to ALL_NODE.Serial_ID)
    char Output_index[32];        // OUTPUTS.Output_index
    char Panel[32];               // OUTPUTS.Panel
    char Full_Label[256];         // OUTPUTS.Full_Label
    char Auto_Manual[32];         // OUTPUTS.Auto_Manual
    char fValue[32];              // OUTPUTS.fValue (stored as string)
    char Units[32];               // OUTPUTS.Units
    char Range_Field[32];         // OUTPUTS.Range_Field
    char Calibration[32];         // OUTPUTS.Calibration
    char Sign[32];                // OUTPUTS.Sign
    char Filter_Field[32];        // OUTPUTS.Filter_Field
    char Status[32];              // OUTPUTS.Status
    char Signal_Type[32];         // OUTPUTS.Signal_Type
    char Label[32];               // OUTPUTS.Label
    char Type_Field[32];          // OUTPUTS.Type_Field
    char BinaryArray[512];        // OUTPUTS.BinaryArray (hex encoded)
} OutputPointFFIData;

typedef struct VariablePointFFIData {
    int nSerialNumber;            // VARIABLES.nSerialNumber (FK to ALL_NODE.Serial_ID)
    char Variable_index[32];      // VARIABLES.Variable_index
    char Panel[32];               // VARIABLES.Panel
    char Full_Label[256];         // VARIABLES.Full_Label
    char Auto_Manual[32];         // VARIABLES.Auto_Manual
    char fValue[32];              // VARIABLES.fValue (stored as string)
    char Units[32];               // VARIABLES.Units
    char BinaryArray[512];        // VARIABLES.BinaryArray (hex encoded)
} VariablePointFFIData;

// Direct database sync functions - KEY for auto-sync
int T3000_GetAllDevicesFromDB(DeviceFFIData* device_data, int max_devices);
int T3000_GetDevicePointsFromDB(int Serial_ID,
                               InputPointFFIData* inputs, int max_inputs,
                               OutputPointFFIData* outputs, int max_outputs,
                               VariablePointFFIData* variables, int max_variables);

// Database change monitoring - for efficient incremental sync
int T3000_HasDatabaseChanged();
int T3000_GetLastDatabaseChangeTime();
int T3000_ResetDatabaseChangeFlag();

// Point data access functions
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

// LOGGING_DATA function - New real-time data loading
const char* T3000_GetLoggingData();
void T3000_FreeLoggingDataString(const char* data);

// Device control
int ConnectToDevice(int device_id);
int DisconnectFromDevice(int device_id);
int RefreshDeviceData(int device_id);

#ifdef __cplusplus
}
#endif

#endif // T3000_FFI_H
