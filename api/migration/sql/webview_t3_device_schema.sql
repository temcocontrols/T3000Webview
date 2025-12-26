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
    show_label_name TEXT,                      -- C++ Device display name (panel_name from LOGGING_DATA)
    connection_type TEXT                       -- C++ Connection type (Serial/Ethernet/BACnet/Modbus)
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
-- ADDITIONAL T3000 FEATURE TABLES (Missing from original schema)
-- Added: November 24, 2025
-- Based on C++ ud_str.h structures
-- =================================================================

-- ARRAYS table (Original T3000 arrays table - Str_array_point)
-- Array data storage (grouped variables)
CREATE TABLE IF NOT EXISTS ARRAYS (
    SerialNumber INTEGER NOT NULL,             -- C++ SerialNumber (references DEVICES.SerialNumber)
    Array_ID TEXT,                             -- C++ Array_ID (e.g., "AR1", "AR2")
    Array_Index TEXT,                          -- C++ Array_Index
    Panel TEXT,                                -- C++ Panel
    Label TEXT,                                -- C++ Label (9 bytes; array name)
    Array_Size INTEGER,                        -- C++ array_size (0-65535)
    Status TEXT                                -- C++ Status
);

-- CONVERSION_TABLES table (Custom analog conversion tables - Str_table_point)
-- Stores voltage-to-value conversion tables (16 pairs per table)
-- Renamed from TABLES to avoid SQL reserved keyword conflict
CREATE TABLE IF NOT EXISTS CONVERSION_TABLES (
    SerialNumber INTEGER NOT NULL,             -- C++ SerialNumber (references DEVICES.SerialNumber)
    Table_ID TEXT,                             -- C++ Table_ID (e.g., "TBL1", "TBL2")
    Table_Index TEXT,                          -- C++ Table_Index
    Panel TEXT,                                -- C++ Panel
    Table_Name TEXT,                           -- C++ table_name (9 bytes)
    Table_Data TEXT,                           -- C++ dat[16] stored as JSON array of {volts, value} pairs
    Status TEXT                                -- C++ Status
);

-- CUSTOM_UNITS table (Custom unit definitions - Str_Units_element)
-- Digital on/off labels and custom analog unit names
CREATE TABLE IF NOT EXISTS CUSTOM_UNITS (
    SerialNumber INTEGER NOT NULL,             -- C++ SerialNumber (references DEVICES.SerialNumber)
    Unit_ID TEXT,                              -- C++ Unit_ID (e.g., "UNIT1", "UNIT2")
    Unit_Index TEXT,                           -- C++ Unit_Index
    Panel TEXT,                                -- C++ Panel
    Unit_Type TEXT,                            -- Type: 'DIGITAL' or 'ANALOG'
    Direct INTEGER,                            -- C++ direct (0 or 1)
    Digital_Units_Off TEXT,                    -- C++ digital_units_off (12 bytes)
    Digital_Units_On TEXT,                     -- C++ digital_units_on (12 bytes)
    Analog_Unit_Name TEXT,                     -- Custom analog unit name
    Status TEXT                                -- C++ Status
);

-- VARIABLE_UNITS table (Custom units for variables - Str_variable_uint_point)
-- Variable-specific custom unit names
CREATE TABLE IF NOT EXISTS VARIABLE_UNITS (
    SerialNumber INTEGER NOT NULL,             -- C++ SerialNumber (references DEVICES.SerialNumber)
    Variable_ID TEXT,                          -- C++ Variable_ID (e.g., "VAR1", "VAR2")
    Variable_Index TEXT,                       -- C++ Variable_Index
    Panel TEXT,                                -- C++ Panel
    Variable_Cus_Unite TEXT,                   -- C++ variable_cus_unite (20 bytes)
    Status TEXT                                -- C++ Status
);

-- USERS table (User authentication and permissions - Str_userlogin_point)
-- User management with access levels and screen/program rights
CREATE TABLE IF NOT EXISTS USERS (
    SerialNumber INTEGER NOT NULL,             -- C++ SerialNumber (references DEVICES.SerialNumber)
    User_ID TEXT,                              -- C++ User_ID (e.g., "USER1", "USER2")
    User_Index TEXT,                           -- C++ User_Index
    Panel TEXT,                                -- C++ Panel
    Name TEXT,                                 -- C++ name (16 bytes)
    Password TEXT,                             -- C++ password (9 bytes) - should be hashed
    Access_Level INTEGER,                      -- C++ access_level (0-255)
    Rights_Access INTEGER,                     -- C++ rights_access (bitfield)
    Default_Panel INTEGER,                     -- C++ default_panel
    Default_Group INTEGER,                     -- C++ default_group
    Screen_Right TEXT,                         -- C++ screen_right[8] (bitfield as TEXT)
    Program_Right TEXT,                        -- C++ program_right[8] (bitfield as TEXT)
    Status TEXT                                -- C++ Status
);

-- REMOTE_POINTS table (Remote device points - Str_remote_point)
-- Cross-panel communication and remote point monitoring
CREATE TABLE IF NOT EXISTS REMOTE_POINTS (
    SerialNumber INTEGER NOT NULL,             -- C++ SerialNumber (references DEVICES.SerialNumber)
    Remote_ID TEXT,                            -- C++ Remote_ID (e.g., "REM1", "REM2")
    Remote_Index TEXT,                         -- C++ Remote_Index
    Panel TEXT,                                -- C++ Panel
    Point_Number INTEGER,                      -- C++ point.number
    Point_Type INTEGER,                        -- C++ point.point_type
    Point_Panel INTEGER,                       -- C++ point.panel
    Sub_Panel INTEGER,                         -- C++ point.sub_panel
    Network INTEGER,                           -- C++ point.network
    Point_Value INTEGER,                       -- C++ point_value
    Auto_Manual INTEGER,                       -- C++ auto_manual
    Digital_Analog INTEGER,                    -- C++ digital_analog
    Device_Online INTEGER,                     -- C++ device_online
    Product_ID INTEGER,                        -- C++ product_id
    Count_Field INTEGER,                       -- C++ count
    Read_Write INTEGER,                        -- C++ read_write (0=read only, 1=written)
    Time_Remaining INTEGER,                    -- C++ time_remaining
    Object_Instance INTEGER,                   -- C++ object_instance
    Status TEXT                                -- C++ Status
);

-- EMAIL_ALARMS table (Email notification settings - Str_Email_point)
-- SMTP configuration for alarm notifications
CREATE TABLE IF NOT EXISTS EMAIL_ALARMS (
    SerialNumber INTEGER NOT NULL,             -- C++ SerialNumber (references DEVICES.SerialNumber)
    Email_ID TEXT,                             -- C++ Email_ID
    Panel TEXT,                                -- C++ Panel
    SMTP_Type INTEGER,                         -- C++ smtp_type (0=IP, 1=domain)
    SMTP_IP TEXT,                              -- C++ smtp_ip[4] (stored as "192.168.1.1")
    SMTP_Domain TEXT,                          -- C++ smtp_domain (40 bytes)
    SMTP_Port INTEGER,                         -- C++ smtp_port
    Email_Address TEXT,                        -- C++ email_address (60 bytes)
    User_Name TEXT,                            -- C++ user_name (60 bytes)
    Password TEXT,                             -- C++ password (20 bytes)
    Secure_Connection_Type INTEGER,            -- C++ secure_connection_type (0=NULL, 1=SSL, 2=TLS)
    To1_Addr TEXT,                             -- C++ To1Addr (60 bytes)
    To2_Addr TEXT,                             -- C++ To2Addr (60 bytes)
    Error_Code INTEGER,                        -- C++ error_code
    Status TEXT                                -- C++ Status
);

-- EXTIO_DEVICES table (External I/O expansion modules - Str_Extio_point)
-- External I/O device management (Zigbee, sub-panels, etc.)
CREATE TABLE IF NOT EXISTS EXTIO_DEVICES (
    SerialNumber INTEGER NOT NULL,             -- C++ SerialNumber (parent device)
    ExtIO_ID TEXT,                             -- ExtIO device ID
    ExtIO_Index TEXT,                          -- ExtIO Index
    Panel TEXT,                                -- C++ Panel
    Product_ID INTEGER,                        -- C++ product_id
    Port INTEGER,                              -- C++ port (0=sub, 1=zigbee, 2=main)
    Modbus_ID INTEGER,                         -- C++ modbus_id
    Last_Contact_Time INTEGER,                 -- C++ last_contact_time (Unix timestamp)
    Input_Start INTEGER,                       -- C++ input_start
    Input_End INTEGER,                         -- C++ input_end
    Output_Start INTEGER,                      -- C++ output_start
    Output_End INTEGER,                        -- C++ output_end
    ExtIO_SerialNumber INTEGER,                -- C++ serialnumber (ExtIO device serial)
    Status TEXT                                -- Status
);

-- TSTAT_SCHEDULES table (Thermostat schedule presets - Str_tstat_schedule)
-- Thermostat setpoint schedules (day/night/awake/sleep)
CREATE TABLE IF NOT EXISTS TSTAT_SCHEDULES (
    SerialNumber INTEGER NOT NULL,             -- C++ SerialNumber (references DEVICES.SerialNumber)
    Tstat_ID TEXT,                             -- Thermostat ID
    Tstat_Index TEXT,                          -- Thermostat Index
    Panel TEXT,                                -- C++ Panel
    Schedule_ID INTEGER,                       -- C++ id
    Schedule INTEGER,                          -- C++ schedule
    Flag INTEGER,                              -- C++ flag
    Online_Status INTEGER,                     -- C++ on_line (0=offline, 1=online)
    Name TEXT,                                 -- C++ name (15 bytes)
    Day_Setpoint INTEGER,                      -- C++ daysetpoint
    Night_Setpoint INTEGER,                    -- C++ nightsetpoint
    Awake_Setpoint INTEGER,                    -- C++ awakesetpoint
    Sleep_Setpoint INTEGER,                    -- C++ sleepsetpoint
    Status TEXT                                -- Status
);

-- GRAPHIC_LABELS table (Graphic screen label positioning - Str_label_point)
-- Label positions and properties for graphic screens
CREATE TABLE IF NOT EXISTS GRAPHIC_LABELS (
    SerialNumber INTEGER NOT NULL,             -- C++ SerialNumber (nSerialNum)
    Label_ID TEXT,                             -- Label ID
    Label_Index INTEGER,                       -- C++ nLabel_index
    Panel TEXT,                                -- Panel
    Label_Status INTEGER,                      -- C++ label_status
    Screen_Index INTEGER,                      -- C++ nScreen_index
    Main_Panel INTEGER,                        -- C++ nMain_Panel
    Sub_Panel INTEGER,                         -- C++ nSub_Panel
    Point_Type INTEGER,                        -- C++ nPoint_type
    Point_Number INTEGER,                      -- C++ nPoint_number
    Point_X INTEGER,                           -- C++ nPoint_x
    Point_Y INTEGER,                           -- C++ nPoint_y
    Text_Color INTEGER,                        -- C++ nclrTxt (color as integer)
    Display_Type INTEGER,                      -- C++ nDisplay_Type
    Icon_Size INTEGER,                         -- C++ nIcon_size
    Icon_Place INTEGER,                        -- C++ nIcon_place
    Icon_Name_1 TEXT,                          -- C++ icon_name_1 (20 bytes)
    Icon_Name_2 TEXT,                          -- C++ icon_name_2 (20 bytes)
    Network INTEGER,                           -- C++ network
    Status TEXT                                -- Status
);

-- MSV_DATA table (Multi-state values - Str_MSV)
-- Multi-state value definitions (8 states per MSV)
CREATE TABLE IF NOT EXISTS MSV_DATA (
    SerialNumber INTEGER NOT NULL,             -- C++ SerialNumber (references DEVICES.SerialNumber)
    MSV_ID TEXT,                               -- MSV ID
    MSV_Index INTEGER,                         -- MSV Index (0-7)
    Panel TEXT,                                -- C++ Panel
    Status_Field INTEGER,                      -- C++ status
    MSV_Name TEXT,                             -- C++ msv_name (20 bytes)
    MSV_Value INTEGER,                         -- C++ msv_value
    Status TEXT                                -- Status
);

-- ALARM_SETTINGS table (Alarm threshold configuration - Alarm_set_point)
-- Alarm condition settings and thresholds
CREATE TABLE IF NOT EXISTS ALARM_SETTINGS (
    SerialNumber INTEGER NOT NULL,             -- C++ SerialNumber (references DEVICES.SerialNumber)
    Alarm_Setting_ID TEXT,                     -- Alarm Setting ID
    Alarm_Setting_Index TEXT,                  -- Alarm Setting Index
    Panel TEXT,                                -- Panel
    Point_Number INTEGER,                      -- C++ point.number
    Point_Type INTEGER,                        -- C++ point.point_type
    Point_Panel INTEGER,                       -- C++ point.panel
    Point1_Number INTEGER,                     -- C++ point1.number
    Point1_Type INTEGER,                       -- C++ point1.point_type
    Point1_Panel INTEGER,                      -- C++ point1.panel
    Condition INTEGER,                         -- C++ cond1
    Way_Low INTEGER,                           -- C++ waylow
    Low INTEGER,                               -- C++ low
    Normal INTEGER,                            -- C++ normal
    High INTEGER,                              -- C++ hi
    Way_High INTEGER,                          -- C++ wayhi
    Time_Field INTEGER,                        -- C++ time
    Message_Count INTEGER,                     -- C++ nrmes
    Count_Field INTEGER,                       -- C++ count
    Status TEXT                                -- Status
);

-- =================================================================
-- DEVICE SETTINGS TABLES (Split from Str_Setting_Info - 400 bytes)
-- Split into logical categories for better organization
-- =================================================================

-- NETWORK_SETTINGS table (Network configuration)
-- IP, subnet, gateway, MAC address, DHCP/static
CREATE TABLE IF NOT EXISTS NETWORK_SETTINGS (
    SerialNumber INTEGER PRIMARY KEY,          -- C++ SerialNumber (one-to-one with DEVICES)
    IP_Address TEXT,                           -- C++ ip_addr[4] (stored as "192.168.1.100")
    Subnet TEXT,                               -- C++ subnet[4] (stored as "255.255.255.0")
    Gateway TEXT,                              -- C++ gate_addr[4]
    MAC_Address TEXT,                          -- C++ mac_addr[6] (stored as "00:11:22:33:44:55")
    TCP_Type INTEGER,                          -- C++ tcp_type (0=DHCP, 1=Static)
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- COMMUNICATION_SETTINGS table (Serial port configuration)
-- COM port settings, baudrates, parity, stop bits
CREATE TABLE IF NOT EXISTS COMMUNICATION_SETTINGS (
    SerialNumber INTEGER PRIMARY KEY,          -- C++ SerialNumber (one-to-one with DEVICES)
    COM0_Config INTEGER,                       -- C++ com0_config
    COM1_Config INTEGER,                       -- C++ com1_config
    COM2_Config INTEGER,                       -- C++ com2_config
    COM_Baudrate0 INTEGER,                     -- C++ com_baudrate0
    COM_Baudrate1 INTEGER,                     -- C++ com_baudrate1
    COM_Baudrate2 INTEGER,                     -- C++ com_baudrate2
    UART_Parity0 INTEGER,                      -- C++ uart_parity[0]
    UART_Parity1 INTEGER,                      -- C++ uart_parity[1]
    UART_Parity2 INTEGER,                      -- C++ uart_parity[2]
    UART_Stopbit0 INTEGER,                     -- C++ uart_stopbit[0]
    UART_Stopbit1 INTEGER,                     -- C++ uart_stopbit[1]
    UART_Stopbit2 INTEGER,                     -- C++ uart_stopbit[2]
    Fix_COM_Config INTEGER,                    -- C++ fix_com_config (0=auto, non-0=fixed)
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- PROTOCOL_SETTINGS table (Modbus, BACnet, MSTP configuration)
-- Protocol-specific settings
CREATE TABLE IF NOT EXISTS PROTOCOL_SETTINGS (
    SerialNumber INTEGER PRIMARY KEY,          -- C++ SerialNumber (one-to-one with DEVICES)
    Modbus_ID INTEGER,                         -- C++ modbus_id
    Modbus_Port INTEGER,                       -- C++ modbus_port
    MSTP_ID INTEGER,                           -- C++ mstp_id
    MSTP_Network_Number INTEGER,               -- C++ mstp_network_number
    Max_Master INTEGER,                        -- C++ max_master (max 245)
    Object_Instance INTEGER,                   -- C++ object_instance (BACnet)
    BBMD_Enable INTEGER,                       -- C++ BBMD_EN (0=disabled, 1=enabled)
    Network_Number INTEGER,                    -- C++ network_number
    Network_Number_Hi INTEGER,                 -- C++ network_number_hi (high byte)
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- TIME_SETTINGS table (Time zone and SNTP configuration)
-- Time zone, DST, SNTP server settings
CREATE TABLE IF NOT EXISTS TIME_SETTINGS (
    SerialNumber INTEGER PRIMARY KEY,          -- C++ SerialNumber (one-to-one with DEVICES)
    Time_Zone INTEGER,                         -- C++ time_zone (signed short)
    Time_Zone_Summer_Daytime INTEGER,          -- C++ time_zone_summer_daytime (DST flag)
    Time_Update_Since_1970 INTEGER,            -- C++ time_update_since_1970 (Unix timestamp)
    Enable_SNTP INTEGER,                       -- C++ en_sntp (0=no, 1=disable, 2=enable)
    SNTP_Server TEXT,                          -- C++ sntp_server (30 bytes)
    Flag_Time_Sync_PC INTEGER,                 -- C++ flag_time_sync_pc (0=no sync, 1=sync)
    Time_Sync_Auto_Manual INTEGER,             -- C++ time_sync_auto_manual (0=SNTP, 1=PC)
    Sync_Time_Results INTEGER,                 -- C++ sync_time_results (0=failed, 1=success)
    Start_Month INTEGER,                       -- C++ start_month (DST start)
    Start_Day INTEGER,                         -- C++ start_day
    End_Month INTEGER,                         -- C++ end_month (DST end)
    End_Day INTEGER,                           -- C++ end_day
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- DYNDNS_SETTINGS table (Dynamic DNS configuration)
-- DynDNS provider, domain, credentials
CREATE TABLE IF NOT EXISTS DYNDNS_SETTINGS (
    SerialNumber INTEGER PRIMARY KEY,          -- C++ SerialNumber (one-to-one with DEVICES)
    Enable_DynDNS INTEGER,                     -- C++ en_dyndns (0=no, 1=disable, 2=enable)
    DynDNS_Provider INTEGER,                   -- C++ dyndns_provider (0=3322.org, 1=dyndns.com, 2=no-ip.com)
    DynDNS_User TEXT,                          -- C++ dyndns_user (32 bytes)
    DynDNS_Pass TEXT,                          -- C++ dyndns_pass (32 bytes)
    DynDNS_Domain TEXT,                        -- C++ dyndns_domain (32 bytes)
    DynDNS_Update_Time INTEGER,                -- C++ dyndns_update_time (minutes)
    Update_DynDNS_Time TEXT,                   -- C++ update_dyndns (timestamp as TEXT)
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- HARDWARE_INFO table (Hardware and firmware information)
-- Hardware revision, firmware versions, device capabilities
CREATE TABLE IF NOT EXISTS HARDWARE_INFO (
    SerialNumber INTEGER PRIMARY KEY,          -- C++ SerialNumber (one-to-one with DEVICES)
    Hardware_Rev INTEGER,                      -- C++ pro_info.harware_rev
    Firmware0_Rev_Main INTEGER,                -- C++ pro_info.firmware0_rev_main
    Firmware0_Rev_Sub INTEGER,                 -- C++ pro_info.firmware0_rev_sub
    Firmware1_Rev INTEGER,                     -- C++ pro_info.frimware1_rev (PIC)
    Firmware2_Rev INTEGER,                     -- C++ pro_info.frimware2_rev (C8051)
    Firmware3_Rev INTEGER,                     -- C++ pro_info.frimware3_rev (SM5964)
    Bootloader_Rev INTEGER,                    -- C++ pro_info.bootloader_rev
    Mini_Type INTEGER,                         -- C++ mini_type
    Panel_Type INTEGER,                        -- C++ panel_type
    USB_Mode INTEGER,                          -- C++ usb_mode (0=device, 1=host)
    SD_Exist INTEGER,                          -- C++ sd_exist (1=no, 2=yes, 3=file system ready)
    Zigbee_Exist INTEGER,                      -- C++ zegbee_exsit
    Zigbee_PanID INTEGER,                      -- C++ zigbee_panid
    Special_Flag INTEGER,                      -- C++ special_flag (bitfield: bit0=PT1K, bit1=PT100)
    Max_Var INTEGER,                           -- C++ max_var (ESP32 only, ST fixed at 128)
    Max_In INTEGER,                            -- C++ max_in (ESP32 only, ST fixed at 64)
    Max_Out INTEGER,                           -- C++ max_out (ESP32 only, ST fixed at 64)
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- FEATURE_FLAGS table (Feature enable/disable flags)
-- User features, custom units, panel name, debug mode, etc.
CREATE TABLE IF NOT EXISTS FEATURE_FLAGS (
    SerialNumber INTEGER PRIMARY KEY,          -- C++ SerialNumber (one-to-one with DEVICES)
    User_Name_Enable INTEGER,                  -- C++ user_name (0=no, 1=disable, 2=enable)
    Customer_Unite_Enable INTEGER,             -- C++ custmer_unite (0=no, 1=enable)
    Enable_Panel_Name INTEGER,                 -- C++ en_panel_name (0=disabled, 1=enabled)
    LCD_Display INTEGER,                       -- C++ LCD_Display (0=hide, 1=show)
    LCD_Display_Type INTEGER,                  -- C++ display_lcd.display_type
    LCD_Point_Type INTEGER,                    -- C++ display_lcd.lcd_mod_reg.npoint.point_type or lcd_bac_reg.point_type
    LCD_Point_Number INTEGER,                  -- C++ display_lcd.lcd_mod_reg.npoint.number or lcd_bac_reg.point_number
    LCD_BACnet_Instance INTEGER,              -- C++ display_lcd.lcd_bac_reg.obj_instance
    Enable_Plug_N_Play INTEGER,               -- C++ en_plug_n_play
    Refresh_Flash_Timer INTEGER,              -- C++ refresh_flash_timer
    Reset_Default INTEGER,                     -- C++ reset_default (write 88=reset defaults, 77=restore)
    Debug INTEGER,                             -- C++ debug
    Webview_JSON_Flash INTEGER,               -- C++ webview_json_flash (0=old way, 2=new JSON way)
    Write_Flash INTEGER,                       -- C++ write_flash (0=disabled, non-0=enabled)
    LCD_Mode INTEGER DEFAULT 0,                -- LCD display mode (0=Always On, 1=Off, 2=Delay)
    LCD_Delay_Seconds INTEGER DEFAULT 30,      -- LCD delay time in seconds when LCD_Mode=2
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- WIFI_SETTINGS table (WiFi configuration - str_wifi_point)
-- WiFi network settings for wireless T3000 devices
CREATE TABLE IF NOT EXISTS WIFI_SETTINGS (
    SerialNumber INTEGER PRIMARY KEY,          -- C++ SerialNumber (one-to-one with DEVICES)
    Wifi_Enable INTEGER,                       -- C++ Wifi_Enable
    IP_Auto_Manual INTEGER,                    -- C++ IP_Auto_Manual (0=DHCP, 1=static)
    IP_Wifi_Status INTEGER,                    -- C++ IP_Wifi_Status
    Load_Default INTEGER,                      -- C++ LoadDefault
    Modbus_Port INTEGER,                       -- C++ modbus_port
    BACnet_Port INTEGER,                       -- C++ bacnet_port
    Software_Version INTEGER,                  -- C++ software_version
    Username TEXT,                             -- C++ username (64 bytes, WiFi SSID)
    Password TEXT,                             -- C++ password (32 bytes, WiFi password)
    IP_Address TEXT,                           -- C++ ip_addr[4]
    Net_Mask TEXT,                             -- C++ net_mask[4]
    Gateway TEXT,                              -- C++ getway[4]
    Wifi_MAC TEXT,                             -- C++ wifi_mac[6] (read-only)
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- MISC_SETTINGS table (Network health and statistics - Str_MISC)
-- Monitor block tracking and network health statistics
CREATE TABLE IF NOT EXISTS MISC_SETTINGS (
    SerialNumber INTEGER PRIMARY KEY,          -- C++ SerialNumber (one-to-one with DEVICES)
    Flag1 INTEGER,                             -- C++ flag[0] (version check)
    Flag2 INTEGER,                             -- C++ flag[1] (version check, should be 0x55ff)
    Monitor_Analog_Block_0 INTEGER,            -- C++ monitor_analog_block_num[0]
    Monitor_Analog_Block_1 INTEGER,            -- C++ monitor_analog_block_num[1]
    Monitor_Analog_Block_2 INTEGER,            -- C++ monitor_analog_block_num[2]
    Monitor_Analog_Block_3 INTEGER,            -- C++ monitor_analog_block_num[3]
    Monitor_Analog_Block_4 INTEGER,            -- C++ monitor_analog_block_num[4]
    Monitor_Analog_Block_5 INTEGER,            -- C++ monitor_analog_block_num[5]
    Monitor_Analog_Block_6 INTEGER,            -- C++ monitor_analog_block_num[6]
    Monitor_Analog_Block_7 INTEGER,            -- C++ monitor_analog_block_num[7]
    Monitor_Analog_Block_8 INTEGER,            -- C++ monitor_analog_block_num[8]
    Monitor_Analog_Block_9 INTEGER,            -- C++ monitor_analog_block_num[9]
    Monitor_Analog_Block_10 INTEGER,           -- C++ monitor_analog_block_num[10]
    Monitor_Analog_Block_11 INTEGER,           -- C++ monitor_analog_block_num[11]
    Monitor_Digital_Block_0 INTEGER,           -- C++ monitor_digital_block_num[0]
    Monitor_Digital_Block_1 INTEGER,           -- C++ monitor_digital_block_num[1]
    Monitor_Digital_Block_2 INTEGER,           -- C++ monitor_digital_block_num[2]
    Monitor_Digital_Block_3 INTEGER,           -- C++ monitor_digital_block_num[3]
    Monitor_Digital_Block_4 INTEGER,           -- C++ monitor_digital_block_num[4]
    Monitor_Digital_Block_5 INTEGER,           -- C++ monitor_digital_block_num[5]
    Monitor_Digital_Block_6 INTEGER,           -- C++ monitor_digital_block_num[6]
    Monitor_Digital_Block_7 INTEGER,           -- C++ monitor_digital_block_num[7]
    Monitor_Digital_Block_8 INTEGER,           -- C++ monitor_digital_block_num[8]
    Monitor_Digital_Block_9 INTEGER,           -- C++ monitor_digital_block_num[9]
    Monitor_Digital_Block_10 INTEGER,          -- C++ monitor_digital_block_num[10]
    Monitor_Digital_Block_11 INTEGER,          -- C++ monitor_digital_block_num[11]
    Operation_Time_0 INTEGER,                  -- C++ operation_time[0]
    Operation_Time_1 INTEGER,                  -- C++ operation_time[1]
    Operation_Time_2 INTEGER,                  -- C++ operation_time[2]
    Operation_Time_3 INTEGER,                  -- C++ operation_time[3]
    Operation_Time_4 INTEGER,                  -- C++ operation_time[4]
    Operation_Time_5 INTEGER,                  -- C++ operation_time[5]
    Operation_Time_6 INTEGER,                  -- C++ operation_time[6]
    Operation_Time_7 INTEGER,                  -- C++ operation_time[7]
    Operation_Time_8 INTEGER,                  -- C++ operation_time[8]
    Operation_Time_9 INTEGER,                  -- C++ operation_time[9]
    Operation_Time_10 INTEGER,                 -- C++ operation_time[10]
    Operation_Time_11 INTEGER,                 -- C++ operation_time[11]
    Network_Health_Flag INTEGER,              -- C++ flag1 (0x55 for network health)
    COM_RX_0 INTEGER,                          -- C++ com_rx[0]
    COM_RX_1 INTEGER,                          -- C++ com_rx[1]
    COM_RX_2 INTEGER,                          -- C++ com_rx[2]
    COM_TX_0 INTEGER,                          -- C++ com_tx[0]
    COM_TX_1 INTEGER,                          -- C++ com_tx[1]
    COM_TX_2 INTEGER,                          -- C++ com_tx[2]
    Collision_0 INTEGER,                       -- C++ collision[0]
    Collision_1 INTEGER,                       -- C++ collision[1]
    Collision_2 INTEGER,                       -- C++ collision[2]
    Packet_Error_0 INTEGER,                    -- C++ packet_error[0]
    Packet_Error_1 INTEGER,                    -- C++ packet_error[1]
    Packet_Error_2 INTEGER,                    -- C++ packet_error[2]
    Timeout_0 INTEGER,                         -- C++ timeout[0]
    Timeout_1 INTEGER,                         -- C++ timeout[1]
    Timeout_2 INTEGER,                         -- C++ timeout[2]
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- REMOTE_TSTAT_DB table (Remote thermostat database - Str_Remote_TstDB)
-- Discovered remote thermostats (up to 64 sub-devices)
CREATE TABLE IF NOT EXISTS REMOTE_TSTAT_DB (
    SerialNumber INTEGER NOT NULL,             -- C++ SerialNumber (parent device)
    Remote_Tstat_ID TEXT,                      -- Remote thermostat ID
    Remote_Index INTEGER,                      -- Index (0-63)
    Panel TEXT,                                -- Panel
    Protocol INTEGER,                          -- C++ protocal (0=modbus, 1=bacnet)
    Modbus_ID INTEGER,                         -- C++ modbus_id
    BACnet_Instance INTEGER,                   -- C++ instance
    Status TEXT                                -- Status
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

-- =================================================================
-- TRENDLOG_DATA TABLES (Split-Table Design for Space Optimization)
-- =================================================================
-- Optimized schema splits static metadata from time-series values
-- Parent table stores metadata once, child table stores only changing values
-- Expected space savings: 41-55% for typical datasets
-- Performance improvement: 2-3× faster inserts, 2× faster queries

-- TRENDLOG_DATA_OLD table (Legacy single-table design - kept for migration/rollback)
-- This is the original design before optimization - will be dropped after successful migration
CREATE TABLE IF NOT EXISTS TRENDLOG_DATA_OLD (
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

-- TRENDLOG_DATA table (Parent/Main - Stores point metadata ONCE)
-- Normalized design: Each unique data point (IN1, OUT2, VAR3, etc.) stored once
-- Typical size: ~526 records for a full T3000 device (IN1-8, OUT1-8, VAR1-240)
CREATE TABLE IF NOT EXISTS TRENDLOG_DATA (
    -- Primary Key
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Device & Point Identification (UNIQUE combination)
    SerialNumber INTEGER NOT NULL,             -- C++ SerialNumber (references DEVICES.SerialNumber)
    PanelId INTEGER NOT NULL,                  -- C++ PanelId (panel identification)
    PointId TEXT NOT NULL,                     -- C++ Point ID (e.g., "IN1", "OUT1", "VAR128")
    PointIndex INTEGER NOT NULL,               -- C++ Point Index (numeric index from JSON "index" field)
    PointType TEXT NOT NULL,                   -- C++ Point Type ('INPUT', 'OUTPUT', 'VARIABLE')

    -- Point Metadata (stored once, not repeated per log entry)
    Digital_Analog TEXT,                       -- C++ Digital_Analog (0=digital, 1=analog from JSON)
    Range_Field TEXT,                          -- C++ Range (range information for units calculation)
    Units TEXT,                                -- C++ Units (derived from range: C, degree, h/kh, etc.)

    -- Additional metadata
    Description TEXT,                          -- Optional point description
    IsActive BOOLEAN DEFAULT 1,                -- Active/inactive flag for data collection
    CreatedAt TEXT DEFAULT (datetime('now')), -- Record creation timestamp
    UpdatedAt TEXT DEFAULT (datetime('now')), -- Last update timestamp

    -- Unique constraint on point identification
    UNIQUE(SerialNumber, PanelId, PointId, PointIndex, PointType)
);

-- TRENDLOG_DATA_DETAIL table (Child - Stores time-series values only)
-- High-frequency writes: Only value + timestamp per log entry
-- Typical size: ~1.27M records for production data (2,409 avg per point)
-- TRENDLOG_DATA_SYNC_METADATA table (Tracks sync operations - replaces per-record SyncInterval/CreatedBy)
-- Stores sync operation details ONCE instead of duplicating per detail record
-- Space savings: ~24 bytes per detail record × millions of records = significant savings
CREATE TABLE IF NOT EXISTS TRENDLOG_DATA_SYNC_METADATA (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- When (Single timestamp)
    SyncTime_Fmt TEXT NOT NULL,                        -- "2025-10-28 13:35:49"

    -- What (Message type)
    MessageType TEXT NOT NULL,                         -- "LOGGING_DATA" or "GET_PANELS_LIST"

    -- Which (Device targeting - NULL means all devices)
    PanelId INTEGER,                                   -- NULL = all panels
    SerialNumber INTEGER,                              -- NULL = all devices

    -- How Many (Statistics)
    RecordsInserted INTEGER DEFAULT 0,                 -- Detail records created in this sync

    -- Configuration
    SyncInterval INTEGER NOT NULL,                     -- 15, 60, 300, 900 seconds

    -- Result (Success/Failure - no IN_PROGRESS to avoid double updates)
    Success INTEGER DEFAULT 1,                         -- 1=success, 0=failed (BOOLEAN)
    ErrorMessage TEXT,                                 -- NULL if success, error text if failed

    -- Audit
    CreatedAt TEXT DEFAULT (datetime('now'))
);

-- TRENDLOG_DATA_DETAIL table (Child - Stores time-series values only)
-- OPTIMIZED: Removed id, SyncInterval, CreatedBy, DataSource, SyncMetadataId
-- Space savings: 32 bytes per record (47% reduction from original schema)
-- Tracking: DataSource always FFI_SYNC (constant), SyncMetadataId tracked at metadata table level
CREATE TABLE IF NOT EXISTS TRENDLOG_DATA_DETAIL (
    -- Core fields only (NO id field - use built-in rowid)
    ParentId INTEGER NOT NULL,                         -- References TRENDLOG_DATA(id)
    Value TEXT NOT NULL,                               -- C++ Point Value (actual sensor/point value)
    LoggingTime_Fmt TEXT NOT NULL                      -- C++ Formatted Time (e.g., "2025-10-28 13:35:49")
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

-- Legacy TRENDLOG_DATA_OLD indexes (kept for migration period)
CREATE INDEX IF NOT EXISTS IDX_TRENDLOG_DATA_OLD_SOURCE_TIME ON TRENDLOG_DATA_OLD(SerialNumber, PanelId, DataSource, LoggingTime_Fmt);
CREATE INDEX IF NOT EXISTS IDX_TRENDLOG_DATA_OLD_RECENT_QUERY ON TRENDLOG_DATA_OLD(SerialNumber, PanelId, LoggingTime_Fmt DESC);
CREATE INDEX IF NOT EXISTS IDX_TRENDLOG_DATA_OLD_SERIAL ON TRENDLOG_DATA_OLD(SerialNumber);
CREATE INDEX IF NOT EXISTS IDX_TRENDLOG_DATA_OLD_PANEL ON TRENDLOG_DATA_OLD(PanelId);
CREATE INDEX IF NOT EXISTS IDX_TRENDLOG_DATA_OLD_POINT_ID ON TRENDLOG_DATA_OLD(PointId);
CREATE INDEX IF NOT EXISTS IDX_TRENDLOG_DATA_OLD_POINT_INDEX ON TRENDLOG_DATA_OLD(PointIndex);
CREATE INDEX IF NOT EXISTS IDX_TRENDLOG_DATA_OLD_TYPE ON TRENDLOG_DATA_OLD(PointType);
CREATE INDEX IF NOT EXISTS IDX_TRENDLOG_DATA_OLD_TIME ON TRENDLOG_DATA_OLD(LoggingTime);
CREATE INDEX IF NOT EXISTS IDX_TRENDLOG_DATA_OLD_TIME_FMT ON TRENDLOG_DATA_OLD(LoggingTime_Fmt);

-- New TRENDLOG_DATA (Parent) indexes - for fast parent_id lookups
CREATE INDEX IF NOT EXISTS IDX_TRENDLOG_DATA_LOOKUP ON TRENDLOG_DATA(SerialNumber, PanelId, PointId);
CREATE INDEX IF NOT EXISTS IDX_TRENDLOG_DATA_SERIAL ON TRENDLOG_DATA(SerialNumber);
CREATE INDEX IF NOT EXISTS IDX_TRENDLOG_DATA_TYPE ON TRENDLOG_DATA(PointType);
CREATE INDEX IF NOT EXISTS IDX_TRENDLOG_DATA_ACTIVE ON TRENDLOG_DATA(IsActive);
-- Composite index for history query filtering (optimized for WHERE clause)
CREATE INDEX IF NOT EXISTS IDX_TRENDLOG_DATA_HISTORY_FILTER ON TRENDLOG_DATA(SerialNumber, PanelId, PointType, PointIndex);
-- 🆕 PERFORMANCE: Optimized index for specific_points filtering (covers exact WHERE conditions)
-- This index covers: (p.PointId = ? AND p.PointType = ? AND p.PointIndex = ? AND p.PanelId = ?)
CREATE INDEX IF NOT EXISTS IDX_TRENDLOG_DATA_SPECIFIC_POINTS ON TRENDLOG_DATA(PointId, PointType, PointIndex, PanelId);

-- New TRENDLOG_DATA_DETAIL (Child) indexes - for fast time-series queries (OPTIMIZED)
CREATE INDEX IF NOT EXISTS IDX_TRENDLOG_DETAIL_PARENT ON TRENDLOG_DATA_DETAIL(ParentId);
CREATE INDEX IF NOT EXISTS IDX_TRENDLOG_DETAIL_TIME_FMT ON TRENDLOG_DATA_DETAIL(LoggingTime_Fmt DESC);
CREATE INDEX IF NOT EXISTS IDX_TRENDLOG_DETAIL_PARENT_TIME ON TRENDLOG_DATA_DETAIL(ParentId, LoggingTime_Fmt DESC);
-- Composite index for history query time range filtering
CREATE INDEX IF NOT EXISTS IDX_TRENDLOG_DETAIL_TIME_RANGE ON TRENDLOG_DATA_DETAIL(LoggingTime_Fmt, ParentId);

-- New TRENDLOG_DATA_SYNC_METADATA indexes - for tracking sync operations
CREATE INDEX IF NOT EXISTS IDX_SYNC_META_TIME ON TRENDLOG_DATA_SYNC_METADATA(SyncTime_Fmt DESC);
CREATE INDEX IF NOT EXISTS IDX_SYNC_META_TYPE ON TRENDLOG_DATA_SYNC_METADATA(MessageType);
CREATE INDEX IF NOT EXISTS IDX_SYNC_META_DEVICE ON TRENDLOG_DATA_SYNC_METADATA(PanelId, SerialNumber);
CREATE INDEX IF NOT EXISTS IDX_SYNC_META_SUCCESS ON TRENDLOG_DATA_SYNC_METADATA(Success);

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

-- =================================================================
-- INDEXES for new feature tables (Added November 24, 2025)
-- =================================================================

-- ARRAYS indexes
CREATE INDEX IF NOT EXISTS IDX_ARRAYS_SERIAL ON ARRAYS(SerialNumber);
CREATE INDEX IF NOT EXISTS IDX_ARRAYS_ID ON ARRAYS(Array_ID);

-- CONVERSION_TABLES indexes (renamed from TABLES)
CREATE INDEX IF NOT EXISTS IDX_CONVERSION_TABLES_SERIAL ON CONVERSION_TABLES(SerialNumber);
CREATE INDEX IF NOT EXISTS IDX_CONVERSION_TABLES_ID ON CONVERSION_TABLES(Table_ID);

-- CUSTOM_UNITS indexes
CREATE INDEX IF NOT EXISTS IDX_CUSTOM_UNITS_SERIAL ON CUSTOM_UNITS(SerialNumber);
CREATE INDEX IF NOT EXISTS IDX_CUSTOM_UNITS_ID ON CUSTOM_UNITS(Unit_ID);
CREATE INDEX IF NOT EXISTS IDX_CUSTOM_UNITS_TYPE ON CUSTOM_UNITS(Unit_Type);

-- VARIABLE_UNITS indexes
CREATE INDEX IF NOT EXISTS IDX_VARIABLE_UNITS_SERIAL ON VARIABLE_UNITS(SerialNumber);
CREATE INDEX IF NOT EXISTS IDX_VARIABLE_UNITS_ID ON VARIABLE_UNITS(Variable_ID);

-- USERS indexes
CREATE INDEX IF NOT EXISTS IDX_USERS_SERIAL ON USERS(SerialNumber);
CREATE INDEX IF NOT EXISTS IDX_USERS_ID ON USERS(User_ID);
CREATE INDEX IF NOT EXISTS IDX_USERS_NAME ON USERS(Name);
CREATE INDEX IF NOT EXISTS IDX_USERS_ACCESS_LEVEL ON USERS(Access_Level);

-- REMOTE_POINTS indexes
CREATE INDEX IF NOT EXISTS IDX_REMOTE_POINTS_SERIAL ON REMOTE_POINTS(SerialNumber);
CREATE INDEX IF NOT EXISTS IDX_REMOTE_POINTS_ID ON REMOTE_POINTS(Remote_ID);
CREATE INDEX IF NOT EXISTS IDX_REMOTE_POINTS_OBJECT_INSTANCE ON REMOTE_POINTS(Object_Instance);

-- EMAIL_ALARMS indexes
CREATE INDEX IF NOT EXISTS IDX_EMAIL_ALARMS_SERIAL ON EMAIL_ALARMS(SerialNumber);
CREATE INDEX IF NOT EXISTS IDX_EMAIL_ALARMS_ID ON EMAIL_ALARMS(Email_ID);

-- EXTIO_DEVICES indexes
CREATE INDEX IF NOT EXISTS IDX_EXTIO_DEVICES_SERIAL ON EXTIO_DEVICES(SerialNumber);
CREATE INDEX IF NOT EXISTS IDX_EXTIO_DEVICES_ID ON EXTIO_DEVICES(ExtIO_ID);
CREATE INDEX IF NOT EXISTS IDX_EXTIO_DEVICES_EXTIO_SERIAL ON EXTIO_DEVICES(ExtIO_SerialNumber);

-- TSTAT_SCHEDULES indexes
CREATE INDEX IF NOT EXISTS IDX_TSTAT_SCHEDULES_SERIAL ON TSTAT_SCHEDULES(SerialNumber);
CREATE INDEX IF NOT EXISTS IDX_TSTAT_SCHEDULES_ID ON TSTAT_SCHEDULES(Tstat_ID);

-- GRAPHIC_LABELS indexes
CREATE INDEX IF NOT EXISTS IDX_GRAPHIC_LABELS_SERIAL ON GRAPHIC_LABELS(SerialNumber);
CREATE INDEX IF NOT EXISTS IDX_GRAPHIC_LABELS_ID ON GRAPHIC_LABELS(Label_ID);
CREATE INDEX IF NOT EXISTS IDX_GRAPHIC_LABELS_SCREEN ON GRAPHIC_LABELS(Screen_Index);

-- MSV_DATA indexes
CREATE INDEX IF NOT EXISTS IDX_MSV_DATA_SERIAL ON MSV_DATA(SerialNumber);
CREATE INDEX IF NOT EXISTS IDX_MSV_DATA_ID ON MSV_DATA(MSV_ID);

-- ALARM_SETTINGS indexes
CREATE INDEX IF NOT EXISTS IDX_ALARM_SETTINGS_SERIAL ON ALARM_SETTINGS(SerialNumber);
CREATE INDEX IF NOT EXISTS IDX_ALARM_SETTINGS_ID ON ALARM_SETTINGS(Alarm_Setting_ID);

-- NETWORK_SETTINGS indexes (one-to-one with DEVICES)
CREATE INDEX IF NOT EXISTS IDX_NETWORK_SETTINGS_SERIAL ON NETWORK_SETTINGS(SerialNumber);

-- COMMUNICATION_SETTINGS indexes (one-to-one with DEVICES)
CREATE INDEX IF NOT EXISTS IDX_COMMUNICATION_SETTINGS_SERIAL ON COMMUNICATION_SETTINGS(SerialNumber);

-- PROTOCOL_SETTINGS indexes (one-to-one with DEVICES)
CREATE INDEX IF NOT EXISTS IDX_PROTOCOL_SETTINGS_SERIAL ON PROTOCOL_SETTINGS(SerialNumber);

-- TIME_SETTINGS indexes (one-to-one with DEVICES)
CREATE INDEX IF NOT EXISTS IDX_TIME_SETTINGS_SERIAL ON TIME_SETTINGS(SerialNumber);

-- DYNDNS_SETTINGS indexes (one-to-one with DEVICES)
CREATE INDEX IF NOT EXISTS IDX_DYNDNS_SETTINGS_SERIAL ON DYNDNS_SETTINGS(SerialNumber);

-- HARDWARE_INFO indexes (one-to-one with DEVICES)
CREATE INDEX IF NOT EXISTS IDX_HARDWARE_INFO_SERIAL ON HARDWARE_INFO(SerialNumber);

-- FEATURE_FLAGS indexes (one-to-one with DEVICES)
CREATE INDEX IF NOT EXISTS IDX_FEATURE_FLAGS_SERIAL ON FEATURE_FLAGS(SerialNumber);

-- WIFI_SETTINGS indexes (one-to-one with DEVICES)
CREATE INDEX IF NOT EXISTS IDX_WIFI_SETTINGS_SERIAL ON WIFI_SETTINGS(SerialNumber);

-- MISC_SETTINGS indexes (one-to-one with DEVICES)
CREATE INDEX IF NOT EXISTS IDX_MISC_SETTINGS_SERIAL ON MISC_SETTINGS(SerialNumber);

-- REMOTE_TSTAT_DB indexes
CREATE INDEX IF NOT EXISTS IDX_REMOTE_TSTAT_DB_SERIAL ON REMOTE_TSTAT_DB(SerialNumber);
CREATE INDEX IF NOT EXISTS IDX_REMOTE_TSTAT_DB_ID ON REMOTE_TSTAT_DB(Remote_Tstat_ID);

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
-- Used for Sampling Interval changes, Trendlog Configurations, and other critical config modifications
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
-- Database Version Control System: database.version, database.need_update, database.update_status
-- Database Configuration: database.max_file_size, database.backup_enabled, database.compression_enabled, database.vacuum_interval
-- UI Configuration: ui.theme, ui.language
-- Service Configuration: ffi.sync_interval_secs, rediscover.interval_secs
INSERT OR IGNORE INTO APPLICATION_CONFIG (config_key, config_value, config_type, description, is_system, user_id, device_serial, panel_id) VALUES
('database.version', '1.0', 'string', 'Database schema version', 1, NULL, NULL, NULL),
('database.need_update', '1', 'boolean', 'Flag indicating if database needs update (force copy on startup)', 1, NULL, NULL, NULL),
('database.update_status', '0', 'boolean', 'Update completion status (0=pending, 1=completed)', 1, NULL, NULL, NULL),
('database.max_file_size', '2048', 'number', 'Maximum database file size in MB (default: 2GB)', 1, NULL, NULL, NULL),
('database.backup_enabled', 'true', 'boolean', 'Enable automatic database backups', 1, NULL, NULL, NULL),
('database.compression_enabled', 'false', 'boolean', 'Enable database compression', 1, NULL, NULL, NULL),
('database.vacuum_interval', '7', 'number', 'Database vacuum interval in days', 1, NULL, NULL, NULL),
('ui.theme', 'light', 'string', 'Application theme preference', 0, NULL, NULL, NULL),
('ui.language', 'en', 'string', 'Application language', 0, NULL, NULL, NULL),
('ffi.sync_interval_secs', '900', 'number', 'FFI Sync Service interval in seconds (default: 900 = 15 minutes, range: 60-31536000)', 0, NULL, NULL, NULL),
('rediscover.interval_secs', '3600', 'number', 'Rediscover Service interval in seconds (default: 3600 = 1 hour, range: 3600-604800)', 0, NULL, NULL, NULL);

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

-- NOTE: Triggers removed for APPLICATION_CONFIG to prevent recursion issues
-- Application code should handle updated_at and size_bytes directly during INSERT/UPDATE

-- Trigger to update updated_at timestamp for database_partitions
CREATE TRIGGER IF NOT EXISTS trigger_database_partitions_updated_at
AFTER UPDATE ON database_partitions
FOR EACH ROW
BEGIN
    UPDATE database_partitions SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- ============================================================================
-- Table: DATA_SYNC_METADATA
-- Purpose: Track sync operations from both FFI backend service and frontend manual refreshes
-- Strategy: INSERT on each sync, keep latest 10 records per device/type
-- ============================================================================

CREATE TABLE IF NOT EXISTS DATA_SYNC_METADATA (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Timestamp information
    sync_time INTEGER NOT NULL,                 -- Unix timestamp (e.g., 1735210845)
    sync_time_fmt TEXT NOT NULL,                -- Human-readable format (e.g., "2025-12-26 14:30:45")

    -- Sync identification
    data_type TEXT NOT NULL,                    -- Data type: "INPUTS", "OUTPUTS", "VARIABLES", "PROGRAMS", etc.
    serial_number TEXT NOT NULL,                -- Device serial number
    panel_id INTEGER,                           -- Panel number (optional)

    -- Sync details
    records_synced INTEGER DEFAULT 0,           -- Number of records updated in this sync
    sync_method TEXT NOT NULL,                  -- "FFI_BACKEND" or "UI_REFRESH"

    -- Status tracking
    success INTEGER NOT NULL DEFAULT 1,         -- 1 = successful sync, 0 = failed sync
    error_message TEXT,                         -- Error details if sync failed (NULL if successful)

    -- Audit
    created_at INTEGER DEFAULT (unixepoch())    -- When this record was created
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_data_sync_metadata_lookup
    ON DATA_SYNC_METADATA(serial_number, data_type, sync_time DESC);

CREATE INDEX IF NOT EXISTS idx_data_sync_metadata_created
    ON DATA_SYNC_METADATA(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_data_sync_metadata_method
    ON DATA_SYNC_METADATA(sync_method, created_at DESC);

-- ============================================================================
-- UI Auto-Refresh Configuration Entries in APPLICATION_CONFIG
-- ============================================================================

-- Inputs page auto-refresh configuration
INSERT OR IGNORE INTO APPLICATION_CONFIG (config_key, config_value, config_type, description, is_system, created_at, updated_at)
VALUES (
    'ui.refresh.inputs',
    '{"autoRefreshEnabled":false,"refreshIntervalSecs":30}',
    'json',
    'UI auto-refresh settings for Inputs page',
    0,
    unixepoch(),
    unixepoch()
);

-- Outputs page auto-refresh configuration
INSERT OR IGNORE INTO APPLICATION_CONFIG (config_key, config_value, config_type, description, is_system, created_at, updated_at)
VALUES (
    'ui.refresh.outputs',
    '{"autoRefreshEnabled":false,"refreshIntervalSecs":30}',
    'json',
    'UI auto-refresh settings for Outputs page',
    0,
    unixepoch(),
    unixepoch()
);

-- Variables page auto-refresh configuration
INSERT OR IGNORE INTO APPLICATION_CONFIG (config_key, config_value, config_type, description, is_system, created_at, updated_at)
VALUES (
    'ui.refresh.variables',
    '{"autoRefreshEnabled":false,"refreshIntervalSecs":30}',
    'json',
    'UI auto-refresh settings for Variables page',
    0,
    unixepoch(),
    unixepoch()
);

-- Programs page auto-refresh configuration
INSERT OR IGNORE INTO APPLICATION_CONFIG (config_key, config_value, config_type, description, is_system, created_at, updated_at)
VALUES (
    'ui.refresh.programs',
    '{"autoRefreshEnabled":false,"refreshIntervalSecs":30}',
    'json',
    'UI auto-refresh settings for Programs page',
    0,
    unixepoch(),
    unixepoch()
);

-- Schedules page auto-refresh configuration
INSERT OR IGNORE INTO APPLICATION_CONFIG (config_key, config_value, config_type, description, is_system, created_at, updated_at)
VALUES (
    'ui.refresh.schedules',
    '{"autoRefreshEnabled":false,"refreshIntervalSecs":30}',
    'json',
    'UI auto-refresh settings for Schedules page',
    0,
    unixepoch(),
    unixepoch()
);

-- Holidays page auto-refresh configuration
INSERT OR IGNORE INTO APPLICATION_CONFIG (config_key, config_value, config_type, description, is_system, created_at, updated_at)
VALUES (
    'ui.refresh.holidays',
    '{"autoRefreshEnabled":false,"refreshIntervalSecs":30}',
    'json',
    'UI auto-refresh settings for Holidays page',
    0,
    unixepoch(),
    unixepoch()
);

-- Database ready for T3000 WebView development with Database Management System (no foreign key constraints)
