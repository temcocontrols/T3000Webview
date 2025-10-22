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
    InputId TEXT,                              -- C++ InputId (JSON "id" field, e.g., "IN1", "IN2")
    Input_Index TEXT,                          -- C++ Input_Index (renamed from Input_index)
    Panel TEXT,                                -- C++ Panel
    Full_Label TEXT,                           -- C++ Full_Label (description from JSON)
    Auto_Manual TEXT,                          -- C++ Auto_Manual
    fValue TEXT,                               -- C++ fValue (stored as string in T3000.db)
    Units TEXT,                                -- C++ Units (derived from Range_Field: °C, °F, %, ppm, etc.)
    Range_Field TEXT,                          -- C++ Range
    Calibration TEXT,                          -- C++ Calibration
    Sign TEXT,                                 -- C++ Sign (calibration_sign)
    Filter_Field TEXT,                         -- C++ Filter (from "control" JSON field)
    Status TEXT,                               -- C++ Status (from "decom" JSON field)
    Digital_Analog TEXT,                       -- From JSON field "digital_analog" (0=digital, 1=analog)
    Label TEXT,                                -- C++ Label (from "label" JSON field directly)
    Type_Field TEXT                            -- C++ Type_Field (from "command" JSON field)
);

-- OUTPUTS table (Original T3000 output points table)
-- Optimized schema - removed unused BinaryArray field
CREATE TABLE IF NOT EXISTS OUTPUTS (
    SerialNumber INTEGER NOT NULL,             -- C++ SerialNumber (references DEVICES.SerialNumber)
    OutputId TEXT,                             -- C++ OutputId (JSON "id" field, e.g., "OUT1", "OUT2")
    Output_Index TEXT,                         -- C++ Output_Index (renamed from Output_index)
    Panel TEXT,                                -- C++ Panel
    Full_Label TEXT,                           -- C++ Full_Label (description from JSON)
    Auto_Manual TEXT,                          -- C++ Auto_Manual
    fValue TEXT,                               -- C++ fValue (stored as string)
    Units TEXT,                                -- C++ Units (derived from Range_Field: °C, °F, %, ppm, etc.)
    Range_Field TEXT,                          -- C++ Range
    Calibration TEXT,                          -- C++ Calibration
    Sign TEXT,                                 -- C++ Sign
    Filter_Field TEXT,                         -- C++ Filter (from "control" JSON field)
    Status TEXT,                               -- C++ Status (from "decom" JSON field)
    Digital_Analog TEXT,                       -- From JSON field "digital_analog" (0=digital, 1=analog)
    Label TEXT,                                -- C++ Label (from "label" JSON field directly)
    Type_Field TEXT                            -- C++ Type_Field (from "command" JSON field)
);

-- VARIABLES table (Original T3000 variable points table)
-- Updated to match runtime schema and support real JSON data
CREATE TABLE IF NOT EXISTS VARIABLES (
    SerialNumber INTEGER NOT NULL,             -- C++ SerialNumber (references DEVICES.SerialNumber)
    VariableId TEXT,                           -- C++ VariableId (JSON "id" field, e.g., "VAR1", "VAR128")
    Variable_Index TEXT,                       -- C++ Variable_Index (renamed from Variable_index)
    Panel TEXT,                                -- C++ Panel
    Full_Label TEXT,                           -- C++ Full_Label (description from JSON)
    Auto_Manual TEXT,                          -- C++ Auto_Manual
    fValue TEXT,                               -- C++ fValue (stored as string)
    Units TEXT,                                -- C++ Units (derived from Range_Field: °C, °F, %, ppm, etc.)
    Range_Field TEXT,                          -- C++ Range_Field (from "range" JSON field)
    Calibration TEXT,                          -- C++ Calibration
    Sign TEXT,                                 -- C++ Sign
    Filter_Field TEXT,                         -- C++ Filter_Field (from "control" JSON field)
    Status TEXT,                               -- C++ Status
    Digital_Analog TEXT,                       -- From JSON field "digital_analog" (0=digital, 1=analog)
    Label TEXT,                                -- C++ Label (from "label" JSON field directly)
    Type_Field TEXT                            -- C++ Type_Field (from "command" JSON field)
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
-- Enhanced for FFI integration and webview functionality
CREATE TABLE IF NOT EXISTS TRENDLOGS (
    id INTEGER PRIMARY KEY AUTOINCREMENT,     -- Auto-increment primary key
    SerialNumber INTEGER NOT NULL,             -- C++ SerialNumber (references DEVICES.SerialNumber)
    PanelId INTEGER NOT NULL,                  -- C++ PanelId (panel identification)
    Trendlog_ID TEXT NOT NULL,                 -- C++ Trendlog_ID (following T3000 ID pattern)
    Switch_Node TEXT,                          -- C++ Switch_Node (following T3000 pattern)
    Trendlog_Label TEXT,                       -- C++ Trendlog_Label (following T3000 label pattern)
    Interval_Seconds INTEGER,                  -- C++ Interval_Seconds (stores interval in seconds)
    Buffer_Size INTEGER,                       -- C++ Buffer_Size
    Data_Size_KB TEXT,                         -- C++ Data_Size_KB (changed to TEXT for flexibility)
    Auto_Manual TEXT,                          -- C++ Auto_Manual (following T3000 pattern)
    Status TEXT,                               -- C++ Status (following T3000 pattern)
    ffi_synced INTEGER DEFAULT 0,              -- FFI sync status (0=not synced, 1=synced)
    last_ffi_sync TEXT,                        -- Last FFI sync timestamp
    created_at TEXT DEFAULT CURRENT_TIMESTAMP, -- Record creation time
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP  -- Record update time
);

-- TRENDLOG_INPUTS table (Trendlog input configuration - T3000 style naming)
-- Links trendlogs to specific input/output/variable points
-- Optimized schema - removed unused BinaryArray field
-- Enhanced with view management columns for persistent user selections
CREATE TABLE IF NOT EXISTS TRENDLOG_INPUTS (
    id INTEGER PRIMARY KEY AUTOINCREMENT,     -- Auto-incrementing primary key
    SerialNumber INTEGER NOT NULL,             -- C++ SerialNumber (references DEVICES.SerialNumber)
    PanelId INTEGER NOT NULL,                  -- C++ PanelId (panel identification)
    Trendlog_ID TEXT NOT NULL,                 -- C++ Trendlog_ID (FK to TRENDLOGS.Trendlog_ID)
    Point_Type TEXT NOT NULL,                  -- C++ Point_Type ('INPUT', 'OUTPUT', 'VARIABLE')
    Point_Index TEXT NOT NULL,                 -- C++ Point_Index (references point index)
    Point_Panel TEXT,                          -- C++ Point_Panel
    Point_Label TEXT,                          -- C++ Point_Label
    Status TEXT,                               -- C++ Status
    view_type TEXT DEFAULT 'MAIN',             -- View type: 'MAIN' (from FFI) or 'VIEW' (user selection)
    view_number INTEGER DEFAULT NULL,          -- View number: NULL for MAIN, 2-3 for user views
    is_selected INTEGER DEFAULT 1,            -- Selection status: 1=selected, 0=not selected
    created_at TEXT DEFAULT CURRENT_TIMESTAMP, -- Record creation time
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP, -- Record update time
    UNIQUE(SerialNumber, PanelId, Trendlog_ID, Point_Type, Point_Index, view_type, view_number) -- One record per point per view per device
);

-- TRENDLOG_VIEWS table (View configurations and metadata - T3000 style naming)
-- Stores user-defined view configurations for TrendLog Views 2 and 3
-- Separate from TRENDLOG_INPUTS to maintain clean separation of concerns
CREATE TABLE IF NOT EXISTS TRENDLOG_VIEWS (
    id INTEGER PRIMARY KEY AUTOINCREMENT,     -- Auto-incrementing primary key
    SerialNumber INTEGER NOT NULL,             -- C++ SerialNumber (references DEVICES.SerialNumber)
    PanelId INTEGER NOT NULL,                  -- C++ PanelId (panel identification)
    Trendlog_ID TEXT NOT NULL,                 -- C++ Trendlog_ID (FK to TRENDLOGS.Trendlog_ID)
    View_Number INTEGER NOT NULL,              -- View number: 2 or 3 (user-created views)
    Point_Type TEXT NOT NULL,                  -- C++ Point_Type ('INPUT', 'OUTPUT', 'VARIABLE')
    Point_Index TEXT NOT NULL,                 -- C++ Point_Index (references point index)
    Point_Panel TEXT,                          -- C++ Point_Panel
    Point_Label TEXT,                          -- C++ Point_Label
    is_selected INTEGER DEFAULT 1,            -- Selection status: 1=selected, 0=not selected
    created_at TEXT DEFAULT CURRENT_TIMESTAMP, -- Record creation time
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP, -- Record update time
    UNIQUE(SerialNumber, PanelId, Trendlog_ID, View_Number, Point_Type, Point_Index) -- One record per point per view per device
);

-- TRENDLOG_DATA table (Actual trendlog data storage - T3000 style naming)
-- Stores the actual trendlog data points with comprehensive T3000 field mapping
-- Enhanced schema with complete device and point information for T3000 WebView
CREATE TABLE IF NOT EXISTS TRENDLOG_DATA (
    SerialNumber INTEGER NOT NULL,             -- C++ SerialNumber (references DEVICES.SerialNumber)
    PanelId INTEGER NOT NULL,                  -- C++ PanelId (panel identification)
    PointId TEXT NOT NULL,                     -- C++ Point ID (e.g., "IN1", "OUT1", "VAR128" from JSON "id" field)
    PointIndex INTEGER NOT NULL,               -- C++ Point Index (numeric index from JSON "index" field)
    PointType TEXT NOT NULL,                   -- C++ Point Type ('INPUT', 'OUTPUT', 'VARIABLE')
    Value TEXT NOT NULL,                       -- C++ Point Value (actual sensor/point value)
    LoggingTime TEXT NOT NULL,                 -- C++ Logging Time (input_logging_time, output_logging_time, variable_logging_time)
    LoggingTime_Fmt TEXT NOT NULL,             -- C++ Formatted Logging Time (e.g., "2025-08-25 12:23:40")
    Digital_Analog TEXT,                       -- C++ Digital_Analog (0=digital, 1=analog from JSON)
    Range_Field TEXT,                          -- C++ Range (range information for units calculation)
    Units TEXT,                                -- C++ Units (derived from range: C, degree, h/kh, etc.)
    DataSource TEXT DEFAULT 'REALTIME',       -- Data source tracking ('REALTIME', 'FFI_SYNC', 'HISTORICAL', 'MANUAL')
    SyncInterval INTEGER DEFAULT 30,          -- Sync interval in seconds
    CreatedBy TEXT DEFAULT 'FRONTEND'         -- Creator identification ('FRONTEND', 'BACKEND', 'API')
);

-- =================================================================
-- INDEXES for performance (T3000 style naming + new source tracking)
-- =================================================================

CREATE INDEX IF NOT EXISTS IDX_DEVICES_SERIAL ON DEVICES(SerialNumber);
CREATE INDEX IF NOT EXISTS IDX_INPUTS_SERIAL ON INPUTS(SerialNumber);
CREATE INDEX IF NOT EXISTS IDX_OUTPUTS_SERIAL ON OUTPUTS(SerialNumber);
CREATE INDEX IF NOT EXISTS IDX_TRENDLOGS_SERIAL ON TRENDLOGS(SerialNumber);
CREATE INDEX IF NOT EXISTS IDX_TRENDLOGS_ID ON TRENDLOGS(Trendlog_ID);
CREATE INDEX IF NOT EXISTS IDX_TRENDLOG_INPUTS_ID ON TRENDLOG_INPUTS(Trendlog_ID);
CREATE INDEX IF NOT EXISTS IDX_TRENDLOG_INPUTS_VIEW ON TRENDLOG_INPUTS(Trendlog_ID, view_type, view_number);
CREATE INDEX IF NOT EXISTS IDX_TRENDLOG_VIEWS_ID ON TRENDLOG_VIEWS(trendlog_id);
CREATE INDEX IF NOT EXISTS IDX_TRENDLOG_VIEWS_UNIQUE ON TRENDLOG_VIEWS(trendlog_id, view_number);
CREATE INDEX IF NOT EXISTS IDX_TRENDLOG_SOURCE_TIME ON TRENDLOG_DATA(SerialNumber, PanelId, DataSource, LoggingTime_Fmt);
CREATE INDEX IF NOT EXISTS IDX_TRENDLOG_RECENT_QUERY ON TRENDLOG_DATA(SerialNumber, PanelId, LoggingTime_Fmt DESC);
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
CREATE INDEX IF NOT EXISTS IDX_TRENDLOG_DATA_SERIAL ON TRENDLOG_DATA(SerialNumber);
CREATE INDEX IF NOT EXISTS IDX_TRENDLOG_DATA_PANEL ON TRENDLOG_DATA(PanelId);
CREATE INDEX IF NOT EXISTS IDX_TRENDLOG_DATA_POINT_ID ON TRENDLOG_DATA(PointId);
CREATE INDEX IF NOT EXISTS IDX_TRENDLOG_DATA_POINT_INDEX ON TRENDLOG_DATA(PointIndex);
CREATE INDEX IF NOT EXISTS IDX_TRENDLOG_DATA_TYPE ON TRENDLOG_DATA(PointType);
CREATE INDEX IF NOT EXISTS IDX_TRENDLOG_DATA_TIME ON TRENDLOG_DATA(LoggingTime);
CREATE INDEX IF NOT EXISTS IDX_TRENDLOG_DATA_TIME_FMT ON TRENDLOG_DATA(LoggingTime_Fmt);

-- =================================================================
-- DATABASE MANAGEMENT TABLES (Settings & Partitioning)
-- =================================================================

-- Old APPLICATION_SETTINGS table removed - using new database management tables below



-- =================================================================
-- DATABASE MANAGEMENT TABLES (Added September 28, 2025)
-- =================================================================

-- Database Partition Configuration Table
-- Stores partitioning strategy settings and retention policies
CREATE TABLE IF NOT EXISTS database_partition_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    strategy TEXT NOT NULL DEFAULT 'monthly' CHECK (strategy IN ('5minutes', 'daily', 'weekly', 'monthly', 'quarterly', 'custom', 'custom-months')),
    custom_days INTEGER CHECK (custom_days IS NULL OR (custom_days >= 1 AND custom_days <= 365)),
    custom_months INTEGER CHECK (custom_months IS NULL OR (custom_months >= 1 AND custom_months <= 12)),
    retention_value INTEGER NOT NULL DEFAULT 30 CHECK (retention_value > 0),
    retention_unit TEXT NOT NULL DEFAULT 'days' CHECK (retention_unit IN ('days', 'weeks', 'months')),
    auto_cleanup_enabled BOOLEAN NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Database Files Table
-- Tracks database file metadata and statistics
CREATE TABLE IF NOT EXISTS database_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_name TEXT NOT NULL UNIQUE,
    file_path TEXT NOT NULL,
    file_size_bytes INTEGER NOT NULL DEFAULT 0,
    record_count INTEGER NOT NULL DEFAULT 0,
    partition_identifier TEXT,
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    is_archived BOOLEAN NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_accessed_at DATETIME
);

-- Application Configuration Table (Renamed from application_settings)
-- Unified storage for all application configuration including:
-- Graphics data (deviceAppState, t3.library, t3.draw, etc.)
-- User preferences (localSettings, UI state)
-- System settings (database config, maintenance)
-- Device-specific configuration
CREATE TABLE IF NOT EXISTS APPLICATION_CONFIG (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    -- Unified configuration key (matches localStorage keys)
    -- Examples: "deviceAppState", "localSettings", "t3.library", "t3.draw"
    config_key TEXT NOT NULL,
    config_value TEXT NOT NULL,
    config_type TEXT NOT NULL DEFAULT 'json' CHECK (config_type IN ('string', 'number', 'boolean', 'json')),
    description TEXT,

    -- Scoping fields for flexible configuration management
    user_id INTEGER,                    -- NULL for global settings
    device_serial TEXT,                 -- NULL for non-device-specific (TEXT to match frontend)
    panel_id INTEGER,                   -- NULL for non-panel-specific

    is_system BOOLEAN NOT NULL DEFAULT 0,
    version TEXT,                       -- Schema version for data migrations (e.g., "0.8.1")
    size_bytes INTEGER,                 -- Auto-calculated size for monitoring
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Unique constraint ensuring one config per key+scope combination
    UNIQUE(config_key, user_id, device_serial, panel_id)
);

-- Application Configuration History Table
-- Tracks all changes to APPLICATION_CONFIG for audit trail and rollback
-- Used for FFI sync interval changes, database settings, and other critical config modifications
CREATE TABLE IF NOT EXISTS APPLICATION_CONFIG_HISTORY (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    config_key TEXT NOT NULL,           -- Configuration key that was changed
    old_value TEXT,                     -- Previous value (NULL for new entries)
    new_value TEXT NOT NULL,            -- New value after change
    changed_by TEXT,                    -- Username or "system" for automatic changes
    change_reason TEXT,                 -- Optional reason/comment for the change
    changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Database Partitions Table
-- Tracks active database partitions and their status
CREATE TABLE IF NOT EXISTS database_partitions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    partition_name TEXT NOT NULL UNIQUE,
    partition_identifier TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    table_prefix TEXT NOT NULL,
    record_count INTEGER NOT NULL DEFAULT 0,
    file_size_bytes INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    is_current BOOLEAN NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- DATABASE MANAGEMENT INDEXES (Performance Optimization)

-- Indexes for database_partition_config
CREATE INDEX IF NOT EXISTS idx_database_partition_config_strategy ON database_partition_config(strategy);
CREATE INDEX IF NOT EXISTS idx_database_partition_config_active ON database_partition_config(is_active);
CREATE INDEX IF NOT EXISTS idx_database_partition_config_created ON database_partition_config(created_at);

-- Indexes for database_files
CREATE INDEX IF NOT EXISTS idx_database_files_name ON database_files(file_name);
CREATE INDEX IF NOT EXISTS idx_database_files_active ON database_files(is_active);
CREATE INDEX IF NOT EXISTS idx_database_files_archived ON database_files(is_archived);
CREATE INDEX IF NOT EXISTS idx_database_files_partition ON database_files(partition_identifier);
CREATE INDEX IF NOT EXISTS idx_database_files_created ON database_files(created_at);
CREATE INDEX IF NOT EXISTS idx_database_files_accessed ON database_files(last_accessed_at);

-- Indexes for APPLICATION_CONFIG
CREATE INDEX IF NOT EXISTS idx_application_config_key ON APPLICATION_CONFIG(config_key);
CREATE INDEX IF NOT EXISTS idx_application_config_type ON APPLICATION_CONFIG(config_type);
CREATE INDEX IF NOT EXISTS idx_application_config_system ON APPLICATION_CONFIG(is_system);
CREATE INDEX IF NOT EXISTS idx_application_config_user ON APPLICATION_CONFIG(user_id);
CREATE INDEX IF NOT EXISTS idx_application_config_device ON APPLICATION_CONFIG(device_serial);
CREATE INDEX IF NOT EXISTS idx_application_config_size ON APPLICATION_CONFIG(size_bytes);

-- Indexes for APPLICATION_CONFIG_HISTORY
CREATE INDEX IF NOT EXISTS idx_application_config_history_key ON APPLICATION_CONFIG_HISTORY(config_key);
CREATE INDEX IF NOT EXISTS idx_application_config_history_changed_at ON APPLICATION_CONFIG_HISTORY(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_application_config_history_changed_by ON APPLICATION_CONFIG_HISTORY(changed_by);

-- Indexes for database_partitions
CREATE INDEX IF NOT EXISTS idx_database_partitions_name ON database_partitions(partition_name);
CREATE INDEX IF NOT EXISTS idx_database_partitions_identifier ON database_partitions(partition_identifier);
CREATE INDEX IF NOT EXISTS idx_database_partitions_active ON database_partitions(is_active);
CREATE INDEX IF NOT EXISTS idx_database_partitions_current ON database_partitions(is_current);
CREATE INDEX IF NOT EXISTS idx_database_partitions_dates ON database_partitions(start_date, end_date);

-- DATABASE MANAGEMENT DEFAULT DATA

-- Insert default partition configuration
INSERT OR IGNORE INTO database_partition_config (
    id, strategy, retention_value, retention_unit, auto_cleanup_enabled
) VALUES (
    1, 'monthly', 30, 'days', 1
);

-- Insert default application configuration
INSERT OR IGNORE INTO APPLICATION_CONFIG (config_key, config_value, config_type, description, is_system, user_id, device_serial, panel_id) VALUES
('database.max_file_size', '100', 'number', 'Maximum database file size in MB', 1, NULL, NULL, NULL),
('database.backup_enabled', 'true', 'boolean', 'Enable automatic database backups', 1, NULL, NULL, NULL),
('database.compression_enabled', 'false', 'boolean', 'Enable database compression', 1, NULL, NULL, NULL),
('database.vacuum_interval', '7', 'number', 'Database vacuum interval in days', 1, NULL, NULL, NULL),
('ui.theme', 'light', 'string', 'Application theme preference', 0, NULL, NULL, NULL),
('ui.language', 'en', 'string', 'Application language', 0, NULL, NULL, NULL),
('ffi.sync_interval_secs', '300', 'number', 'FFI Sync Service interval in seconds (default: 300 = 5 minutes, range: 60-31536000)', 0, NULL, NULL, NULL);

-- DATABASE MANAGEMENT TRIGGERS (Automatic Updates)

-- Trigger to update updated_at timestamp for database_partition_config
CREATE TRIGGER IF NOT EXISTS trigger_database_partition_config_updated_at
AFTER UPDATE ON database_partition_config
FOR EACH ROW
BEGIN
    UPDATE database_partition_config SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Trigger to update updated_at timestamp for database_files
CREATE TRIGGER IF NOT EXISTS trigger_database_files_updated_at
AFTER UPDATE ON database_files
FOR EACH ROW
BEGIN
    UPDATE database_files SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Trigger to update updated_at timestamp for APPLICATION_CONFIG
CREATE TRIGGER IF NOT EXISTS trigger_application_config_updated_at
AFTER UPDATE ON APPLICATION_CONFIG
FOR EACH ROW
BEGIN
    UPDATE APPLICATION_CONFIG SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Trigger to auto-calculate size_bytes for APPLICATION_CONFIG
CREATE TRIGGER IF NOT EXISTS trigger_application_config_size
AFTER INSERT ON APPLICATION_CONFIG
FOR EACH ROW
BEGIN
    UPDATE APPLICATION_CONFIG
    SET size_bytes = LENGTH(config_value)
    WHERE id = NEW.id;
END;

-- Trigger to update size_bytes on value change
CREATE TRIGGER IF NOT EXISTS trigger_application_config_size_update
AFTER UPDATE OF config_value ON APPLICATION_CONFIG
FOR EACH ROW
BEGIN
    UPDATE APPLICATION_CONFIG
    SET size_bytes = LENGTH(NEW.config_value)
    WHERE id = NEW.id;
END;

-- Trigger to update updated_at timestamp for database_partitions
CREATE TRIGGER IF NOT EXISTS trigger_database_partitions_updated_at
AFTER UPDATE ON database_partitions
FOR EACH ROW
BEGIN
    UPDATE database_partitions SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Database ready for T3000 WebView development with Database Management System (no foreign key constraints)
