-- WebView T3000 Database Schema (webview_t3_device.db)
-- Based on original T3000.db structure with exact table names and field names
-- Date: January 25, 2025
-- Purpose: WebView implementation using T3000.db schema as foundation

-- =================================================================
-- CORE T3000 TABLES (Based on T3000.db structure - EXACT REPLICA)
-- =================================================================

-- DEVICES table (T3000 devices/nodes table for webview)
-- This is the main device table based on T3000.db with exact C++ field names
-- Enhanced with network communication fields from Device_Basic_Setting
CREATE TABLE IF NOT EXISTS DEVICES (
    SerialNumber INTEGER PRIMARY KEY,          -- C++ SerialNumber (primary key, renamed from Serial_ID)
    PanelId INTEGER,                           -- C++ PanelId (new column for panel identification)
    MainBuilding_Name TEXT,                    -- C++ MainBuilding_Name
    Building_Name TEXT,                        -- C++ Building_Name (network/subnet)
    Floor_Name TEXT,                           -- C++ Floor_name
    Room_Name TEXT,                            -- C++ Room_name
    Panel_Number INTEGER,                      -- C++ Panel_Number
    Network_Number INTEGER,                    -- C++ Network_Number
    Product_Name TEXT,                         -- C++ Product_Name
    Product_Class_ID INTEGER,                  -- C++ Product_class_ID
    Product_ID INTEGER,                        -- C++ Product_ID
    Screen_Name TEXT,                          -- C++ Screen_Name
    Bautrate TEXT,                             -- C++ Bautrate (IP address or baud rate)
    Address TEXT,                              -- C++ Address
    Register TEXT,                             -- C++ Register
    Function TEXT,                             -- C++ Function
    Description TEXT,                          -- C++ Description
    High_Units TEXT,                           -- C++ High_Units
    Low_Units TEXT,                            -- C++ Low_Units
    Update_Field TEXT,                         -- C++ Update
    Status TEXT,                               -- C++ Status
    Range_Field TEXT,                          -- C++ Range
    Calibration TEXT,                          -- C++ Calibration
    -- Network Communication Fields (from Device_Basic_Setting.reg)
    ip_address TEXT,                           -- C++ IP address from reg[6-9] (IP_ADDRESS_*)
    port INTEGER,                              -- C++ Port from reg[10] (PORT)
    bacnet_mstp_mac_id INTEGER,               -- C++ BACnet MSTP MAC ID from reg[17] (MSTP_MASTER_MAC_ID)
    modbus_address INTEGER,                    -- C++ Modbus address from reg[18] (MODBUS_ADDRESS)
    pc_ip_address TEXT,                        -- C++ PC IP address from reg[19-22] (PC_IP_ADDRESS_*)
    modbus_port INTEGER,                       -- C++ Modbus port from reg[25] (MODBUS_PORT)
    bacnet_ip_port INTEGER,                    -- C++ BACnet IP port from reg[23] (BACNET_IP_PORT)
    show_label_name INTEGER,                   -- C++ Show label name from reg[345] (SHOW_LABEL_NAME)
    connection_type INTEGER                    -- C++ Connection type from reg[18] (CONNECTION_TYPE)
);

-- INPUTS table (Original T3000 input points table)
-- Optimized schema - removed unused BinaryArray field
CREATE TABLE IF NOT EXISTS INPUTS (
    SerialNumber INTEGER NOT NULL,             -- C++ SerialNumber (references DEVICES.SerialNumber)
    Input_index TEXT,                          -- C++ Input_index
    Panel TEXT,                                -- C++ Panel
    Full_Label TEXT,                           -- C++ Full_Label (description from JSON)
    Auto_Manual TEXT,                          -- C++ Auto_Manual
    fValue TEXT,                               -- C++ fValue (stored as string in T3000.db)
    Units TEXT,                                -- C++ Units
    Range_Field TEXT,                          -- C++ Range
    Calibration TEXT,                          -- C++ Calibration
    Sign TEXT,                                 -- C++ Sign (calibration_sign)
    Filter_Field TEXT,                         -- C++ Filter (from "filter" JSON field)
    Status TEXT,                               -- C++ Status (from "decom" JSON field)
    Signal_Type TEXT,                          -- C++ Signal_Type (from "digital_analog" JSON field)
    Label TEXT,                                -- C++ Label (from "description" or "label" JSON field)
    Type_Field TEXT                            -- C++ Type (from "command" JSON field)
);

-- OUTPUTS table (Original T3000 output points table)
-- Optimized schema - removed unused BinaryArray field
CREATE TABLE IF NOT EXISTS OUTPUTS (
    SerialNumber INTEGER NOT NULL,             -- C++ SerialNumber (references DEVICES.SerialNumber)
    Output_index TEXT,                         -- C++ Output_index
    Panel TEXT,                                -- C++ Panel
    Full_Label TEXT,                           -- C++ Full_Label (description from JSON)
    Auto_Manual TEXT,                          -- C++ Auto_Manual
    fValue TEXT,                               -- C++ fValue (stored as string)
    Units TEXT,                                -- C++ Units
    Range_Field TEXT,                          -- C++ Range
    Calibration TEXT,                          -- C++ Calibration
    Sign TEXT,                                 -- C++ Sign
    Filter_Field TEXT,                         -- C++ Filter (from "control" JSON field)
    Status TEXT,                               -- C++ Status (from "decom" JSON field)
    Signal_Type TEXT,                          -- C++ Signal_Type (from "digital_analog" JSON field)
    Label TEXT,                                -- C++ Label (from "description" or "label" JSON field)
    Type_Field TEXT                            -- C++ Type (from "command" JSON field)
);

-- VARIABLES table (Original T3000 variable points table)
-- Optimized schema - removed unused BinaryArray field
CREATE TABLE IF NOT EXISTS VARIABLES (
    SerialNumber INTEGER NOT NULL,             -- C++ SerialNumber (references DEVICES.SerialNumber)
    Variable_index TEXT,                       -- C++ Variable_index
    Panel TEXT,                                -- C++ Panel
    Full_Label TEXT,                           -- C++ Full_Label (description from JSON)
    Auto_Manual TEXT,                          -- C++ Auto_Manual
    fValue TEXT,                               -- C++ fValue (stored as string)
    Units TEXT                                 -- C++ Units
);

-- PROGRAMS table (Original T3000 programs table)
-- Optimized schema - removed unused BinaryArray field
CREATE TABLE IF NOT EXISTS PROGRAMS (
    SerialNumber INTEGER NOT NULL,             -- C++ SerialNumber (references DEVICES.SerialNumber)
    Program_ID TEXT,                           -- C++ Program_ID
    Switch_Node TEXT,                          -- C++ Switch_Node
    Program_Label TEXT,                        -- C++ Program_Label
    Program_List TEXT,                         -- C++ Program_List
    Program_Size TEXT,                         -- C++ Program_Size
    Program_Pointer TEXT,                      -- C++ Program_Pointer
    Program_Status TEXT,                       -- C++ Program_Status
    Auto_Manual TEXT                           -- C++ Auto_Manual
);

-- SCHEDULES table (Original T3000 schedules table)
-- Optimized schema - removed unused BinaryArray field
CREATE TABLE IF NOT EXISTS SCHEDULES (
    SerialNumber INTEGER NOT NULL,             -- C++ SerialNumber (references DEVICES.SerialNumber)
    Schedule_ID TEXT,                          -- C++ Schedule_ID
    Auto_Manual TEXT,                          -- C++ Auto_Manual
    Output_Field TEXT,                         -- C++ Output
    Variable_Field TEXT,                       -- C++ Variable
    Holiday1 TEXT,                             -- C++ Holiday1
    Status1 TEXT,                              -- C++ Status1
    Holiday2 TEXT,                             -- C++ Holiday2
    Status2 TEXT,                              -- C++ Status2
    Interval_Field TEXT,                       -- C++ Interval
    Schedule_Time TEXT,                        -- C++ Schedule_Time
    Monday_Time TEXT,                          -- C++ Monday_Time
    Tuesday_Time TEXT,                         -- C++ Tuesday_Time
    Wednesday_Time TEXT,                       -- C++ Wednesday_Time
    Thursday_Time TEXT,                        -- C++ Thursday_Time
    Friday_Time TEXT                           -- C++ Friday_Time
);

-- PID_TABLE table (Original T3000 PID controllers table)
-- Optimized schema - removed unused BinaryArray field
CREATE TABLE IF NOT EXISTS PID_TABLE (
    SerialNumber INTEGER NOT NULL,             -- C++ SerialNumber (references DEVICES.SerialNumber)
    Loop_Field TEXT,                           -- C++ Loop
    Switch_Node TEXT,                          -- C++ Switch_Node
    Input_Field TEXT,                          -- C++ Input
    Input_Value TEXT,                          -- C++ Input_Value
    Auto_Manual TEXT,                          -- C++ Auto_Manual
    Output_Field TEXT,                         -- C++ Output
    Output_Value TEXT,                         -- C++ Output_Value
    Set_Value TEXT,                            -- C++ Set_Value
    Units TEXT,                                -- C++ Units
    Action_Field TEXT,                         -- C++ Action
    Proportional TEXT,                         -- C++ Proportional
    Reset_Field TEXT,                          -- C++ Reset
    Rate TEXT,                                 -- C++ Rate
    Bias TEXT,                                 -- C++ Bias
    Status TEXT,                               -- C++ Status
    Type_Field TEXT,                           -- C++ Type
    Setpoint_High TEXT,                        -- C++ Setpoint_High
    Setpoint_Low TEXT,                         -- C++ Setpoint_Low
    Units_State TEXT,                          -- C++ Units_State
    Variable_State TEXT                        -- C++ Variable_State
);

-- HOLIDAYS table (Original T3000 holidays table)
-- Optimized schema - removed unused BinaryArray field
CREATE TABLE IF NOT EXISTS HOLIDAYS (
    SerialNumber INTEGER NOT NULL,             -- C++ SerialNumber (references DEVICES.SerialNumber)
    Holiday_ID TEXT,                           -- C++ Holiday_ID
    Auto_Manual TEXT,                          -- C++ Auto_Manual
    Holiday_Value TEXT,                        -- C++ Holiday_Value
    Status TEXT,                               -- C++ Status
    Month_Field TEXT,                          -- C++ Month
    Day_Field TEXT,                            -- C++ Day
    Year_Field TEXT                            -- C++ Year
);

-- GRAPHICS table (Original T3000 graphics table)
-- Optimized schema - removed unused BinaryArray field
CREATE TABLE IF NOT EXISTS GRAPHICS (
    SerialNumber INTEGER NOT NULL,             -- C++ SerialNumber (references DEVICES.SerialNumber)
    Graphic_ID TEXT,                           -- C++ Graphic_ID
    Switch_Node TEXT,                          -- C++ Switch_Node
    Graphic_Label TEXT,                        -- C++ Graphic_Label
    Graphic_Picture_File TEXT,                 -- C++ Graphic_Picture_File
    Graphic_Total_Point TEXT                   -- C++ Graphic_Total_Point
);

-- ALARMS table (Original T3000 alarms table)
-- Optimized schema - removed unused BinaryArray field
CREATE TABLE IF NOT EXISTS ALARMS (
    SerialNumber INTEGER NOT NULL,             -- C++ SerialNumber (references DEVICES.SerialNumber)
    Alarm_ID TEXT,                             -- C++ Alarm_ID
    Panel TEXT,                                -- C++ Panel
    Message TEXT,                              -- C++ Message
    Status TEXT,                               -- C++ Status
    Priority TEXT,                             -- C++ Priority
    NotificationID TEXT,                       -- C++ NotificationID
    AlarmState TEXT,                           -- C++ AlarmState
    AlarmType TEXT,                            -- C++ AlarmType
    Source TEXT,                               -- C++ Source
    Description TEXT,                          -- C++ Description
    Acknowledged TEXT,                         -- C++ Acknowledged
    Action_Field TEXT,                         -- C++ Action
    TimeStamp TEXT,                            -- C++ TimeStamp
    LowLimit TEXT,                             -- C++ LowLimit
    HighLimit TEXT                             -- C++ HighLimit
);

-- MONITORDATA table (Original T3000 monitor data table)
-- Optimized schema - removed unused BinaryArray field
CREATE TABLE IF NOT EXISTS MONITORDATA (
    SerialNumber INTEGER NOT NULL,             -- C++ SerialNumber (references DEVICES.SerialNumber)
    Monitor_ID TEXT,                           -- C++ Monitor_ID
    Switch_Node TEXT,                          -- C++ Switch_Node
    Monitor_Label TEXT,                        -- C++ Monitor_Label
    Monitor_Value TEXT,                        -- C++ Monitor_Value
    Auto_Manual TEXT,                          -- C++ Auto_Manual
    Status TEXT,                               -- C++ Status
    Units TEXT,                                -- C++ Units
    Monitor_Type TEXT,                         -- C++ Monitor_Type
    TimeStamp TEXT,                            -- C++ TimeStamp
    Range_Field TEXT,                          -- C++ Range
    Calibration TEXT                           -- C++ Calibration
);

-- =================================================================
-- TRENDLOG TABLES (Following T3000 naming patterns)
-- New tables for trendlog functionality using T3000-style naming
-- =================================================================

-- TRENDLOGS table (Main trendlog configuration - T3000 style naming)
-- Following T3000 naming pattern: uppercase table name, descriptive fields
-- Optimized schema - removed unused BinaryArray field
CREATE TABLE IF NOT EXISTS TRENDLOGS (
    SerialNumber INTEGER NOT NULL,             -- C++ SerialNumber (references DEVICES.SerialNumber)
    Trendlog_ID TEXT,                          -- C++ Trendlog_ID (following T3000 ID pattern)
    Switch_Node TEXT,                          -- C++ Switch_Node (following T3000 pattern)
    Trendlog_Label TEXT,                       -- C++ Trendlog_Label (following T3000 label pattern)
    Interval_Minutes INTEGER,                  -- C++ Interval_Minutes
    Buffer_Size INTEGER,                       -- C++ Buffer_Size
    Data_Size_KB INTEGER,                      -- C++ Data_Size_KB
    Auto_Manual TEXT,                          -- C++ Auto_Manual (following T3000 pattern)
    Status TEXT                                -- C++ Status (following T3000 pattern)
);

-- TRENDLOG_INPUTS table (Trendlog input configuration - T3000 style naming)
-- Links trendlogs to specific input/output/variable points
-- Optimized schema - removed unused BinaryArray field
CREATE TABLE IF NOT EXISTS TRENDLOG_INPUTS (
    Trendlog_ID TEXT NOT NULL,                 -- C++ Trendlog_ID (FK to TRENDLOGS.Trendlog_ID)
    Point_Type TEXT NOT NULL,                  -- C++ Point_Type ('INPUT', 'OUTPUT', 'VARIABLE')
    Point_Index TEXT NOT NULL,                 -- C++ Point_Index (references point index)
    Point_Panel TEXT,                          -- C++ Point_Panel
    Point_Label TEXT,                          -- C++ Point_Label
    Status TEXT                                -- C++ Status
);

-- TRENDLOG_DATA table (Actual trendlog data storage - T3000 style naming)
-- Stores the actual trendlog data points
-- Optimized schema - removed unused BinaryArray field
CREATE TABLE IF NOT EXISTS TRENDLOG_DATA (
    Trendlog_Input_ID INTEGER NOT NULL,       -- C++ reference to TRENDLOG_INPUTS
    TimeStamp TEXT NOT NULL,                   -- C++ TimeStamp (T3000 uses TEXT for timestamps)
    fValue TEXT,                               -- C++ fValue (following T3000 pattern - stored as TEXT)
    Status TEXT,                               -- C++ Status
    Quality TEXT                               -- C++ Quality (data quality indicator)
);

-- TRENDLOG_BUFFER table (Circular buffer management - T3000 style naming)
-- Manages circular buffer for efficient data storage
-- Optimized schema - removed unused BinaryArray field
CREATE TABLE IF NOT EXISTS TRENDLOG_BUFFER (
    SerialNumber INTEGER NOT NULL,             -- C++ SerialNumber (references DEVICES.SerialNumber)
    Trendlog_ID TEXT NOT NULL,                 -- C++ Trendlog_ID
    Buffer_Index INTEGER,                      -- C++ Buffer_Index (circular buffer position)
    Buffer_Size INTEGER,                       -- C++ Buffer_Size
    Current_Position INTEGER,                  -- C++ Current_Position
    Buffer_Full INTEGER,                       -- C++ Buffer_Full (0/1 flag)
    Status TEXT                                -- C++ Status
);

-- =================================================================
-- INDEXES for performance (T3000 style naming)
-- =================================================================

CREATE INDEX IF NOT EXISTS IDX_DEVICES_SERIAL ON DEVICES(SerialNumber);
CREATE INDEX IF NOT EXISTS IDX_INPUTS_SERIAL ON INPUTS(SerialNumber);
CREATE INDEX IF NOT EXISTS IDX_OUTPUTS_SERIAL ON OUTPUTS(SerialNumber);
CREATE INDEX IF NOT EXISTS IDX_VARIABLES_SERIAL ON VARIABLES(SerialNumber);
CREATE INDEX IF NOT EXISTS IDX_PROGRAMS_SERIAL ON PROGRAMS(SerialNumber);
CREATE INDEX IF NOT EXISTS IDX_SCHEDULES_SERIAL ON SCHEDULES(SerialNumber);
CREATE INDEX IF NOT EXISTS IDX_PID_TABLE_SERIAL ON PID_TABLE(SerialNumber);
CREATE INDEX IF NOT EXISTS IDX_HOLIDAYS_SERIAL ON HOLIDAYS(SerialNumber);
CREATE INDEX IF NOT EXISTS IDX_GRAPHICS_SERIAL ON GRAPHICS(SerialNumber);
CREATE INDEX IF NOT EXISTS IDX_ALARMS_SERIAL ON ALARMS(SerialNumber);
CREATE INDEX IF NOT EXISTS IDX_MONITORDATA_SERIAL ON MONITORDATA(SerialNumber);
CREATE INDEX IF NOT EXISTS IDX_TRENDLOGS_SERIAL ON TRENDLOGS(SerialNumber);
CREATE INDEX IF NOT EXISTS IDX_TRENDLOG_INPUTS_ID ON TRENDLOG_INPUTS(Trendlog_ID);
CREATE INDEX IF NOT EXISTS IDX_TRENDLOG_DATA_INPUT ON TRENDLOG_DATA(Trendlog_Input_ID);
CREATE INDEX IF NOT EXISTS IDX_TRENDLOG_DATA_TIME ON TRENDLOG_DATA(TimeStamp);
CREATE INDEX IF NOT EXISTS IDX_TRENDLOG_BUFFER_SERIAL ON TRENDLOG_BUFFER(SerialNumber);

-- =================================================================
-- SAMPLE DATA (for testing - T3000 style data)
-- =================================================================

-- NOTE: Sample inserts are provided below for optional local testing.
-- They are commented out by default to avoid seeding production/dev DBs.
-- To use, remove leading `--` markers on the INSERT blocks.

-- Insert sample DEVICES device record (T3000 style)
-- INSERT OR IGNORE INTO DEVICES (
--     SerialNumber, PanelId, MainBuilding_Name, Building_Name, Product_Name,
--     Bautrate, Product_Class_ID, Product_ID, Panel_Number, Network_Number,
--     Description, Status
-- ) VALUES (
--     12345, 1, 'MAIN_BUILDING', 'Network_1', 'T3-BB Controller',
--     '192.168.1.100', 1, 1, 1, 1,
--     'Main building controller', 'Online'
-- );

-- Insert sample INPUTS records (T3000 style)
-- INSERT OR IGNORE INTO INPUTS (
--     SerialNumber, Input_index, Full_Label, fValue, Units, Status
-- ) VALUES
-- (12345, '1', 'Room Temperature', '22.5', 'DEG C', 'Online'),
-- (12345, '2', 'Humidity Level', '45.2', 'PERCENT', 'Online'),
-- (12345, '3', 'CO2 Level', '450', 'PPM', 'Online');

-- Insert sample OUTPUTS records (T3000 style)
-- INSERT OR IGNORE INTO OUTPUTS (
--     SerialNumber, Output_index, Full_Label, fValue, Units, Status
-- ) VALUES
-- (12345, '1', 'Cooling Valve', '25.0', 'PERCENT', 'Online'),
-- (12345, '2', 'Heating Valve', '0.0', 'PERCENT', 'Online'),
-- (12345, '3', 'Fan Speed', '75.0', 'PERCENT', 'Online');

-- Insert sample VARIABLES records (T3000 style)
-- INSERT OR IGNORE INTO VARIABLES (
--     SerialNumber, Variable_index, Full_Label, fValue, Units
-- ) VALUES
-- (12345, '1', 'Setpoint Temperature', '21.0', 'DEG C'),
-- (12345, '2', 'Occupied Schedule', '1', 'ON/OFF');

-- Insert sample TRENDLOGS record (T3000 style)
-- INSERT OR IGNORE INTO TRENDLOGS (
--     SerialNumber, Trendlog_ID, Trendlog_Label, Interval_Minutes, Buffer_Size, Status
-- ) VALUES
-- (12345, '1', 'Room Temperature Trend', 15, 1000, 'Online');

-- Insert sample TRENDLOG_INPUTS records (T3000 style)
-- INSERT OR IGNORE INTO TRENDLOG_INPUTS (
--     Trendlog_ID, Point_Type, Point_Index, Point_Label, Status
-- ) VALUES
-- ('1', 'INPUT', '1', 'Room Temperature', 'Active'),
-- ('1', 'INPUT', '2', 'Humidity Level', 'Active');

-- Database ready for T3000 WebView development (no foreign key constraints)
