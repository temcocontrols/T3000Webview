-- ==========================================================================
-- T3000 WebView Device Database Schema �?PostgreSQL Dialect
-- Translated from webview_t3_device_schema.sql (SQLite)
-- Date: 2026-04-15
-- Purpose: Create 46 device tables on a centralized PostgreSQL server.
--          DB_BACKEND_CONFIG is NOT included (local SQLite only).
-- ==========================================================================

-- =================================================================
-- CORE T3000 TABLES
-- =================================================================

CREATE TABLE IF NOT EXISTS DEVICES (
    SerialNumber INTEGER PRIMARY KEY,
    PanelId INTEGER,
    MainBuilding_Name TEXT,
    Building_Name TEXT,
    Floor_Name TEXT,
    Room_Name TEXT,
    Panel_Number INTEGER,
    Network_Number INTEGER,
    Product_Name TEXT,
    Product_Class_ID INTEGER,
    Product_ID INTEGER,
    Screen_Name TEXT,
    Bautrate TEXT,
    Address TEXT,
    Register TEXT,
    Function TEXT,
    Description TEXT,
    High_Units TEXT,
    Low_Units TEXT,
    Update_Field TEXT,
    Status TEXT,
    Range_Field TEXT,
    Calibration TEXT,
    ip_address TEXT,
    port INTEGER,
    bacnet_mstp_mac_id INTEGER,
    modbus_address INTEGER,
    pc_ip_address TEXT,
    modbus_port INTEGER,
    bacnet_ip_port INTEGER,
    show_label_name TEXT,
    connection_type TEXT
);

CREATE TABLE IF NOT EXISTS INPUTS (
    SerialNumber INTEGER NOT NULL,
    InputId TEXT,
    Input_Index TEXT,
    Panel TEXT,
    Full_Label TEXT,
    Auto_Manual TEXT,
    fValue TEXT,
    Units TEXT,
    Range_Field TEXT,
    Calibration TEXT,
    Sign TEXT,
    Filter_Field TEXT,
    Status TEXT,
    Digital_Analog TEXT,
    Label TEXT,
    Type_Field TEXT,
    Calibration_H TEXT,
    Calibration_L TEXT,
    Calibration_Sign TEXT,
    Control TEXT
);

CREATE TABLE IF NOT EXISTS OUTPUTS (
    SerialNumber INTEGER NOT NULL,
    OutputId TEXT,
    Output_Index TEXT,
    Panel TEXT,
    Full_Label TEXT,
    Auto_Manual TEXT,
    fValue TEXT,
    Units TEXT,
    Range_Field TEXT,
    Calibration TEXT,
    Sign TEXT,
    Filter_Field TEXT,
    Status TEXT,
    Digital_Analog TEXT,
    Label TEXT,
    Type_Field TEXT,
    Calibration_H TEXT,
    Calibration_L TEXT,
    Calibration_Sign TEXT,
    Control TEXT
);

CREATE TABLE IF NOT EXISTS VARIABLES (
    SerialNumber INTEGER NOT NULL,
    VariableId TEXT,
    Variable_Index TEXT,
    Panel TEXT,
    Full_Label TEXT,
    Auto_Manual TEXT,
    fValue TEXT,
    Units TEXT,
    Range_Field TEXT,
    Calibration TEXT,
    Sign TEXT,
    Filter_Field TEXT,
    Status TEXT,
    Digital_Analog TEXT,
    Label TEXT,
    Type_Field TEXT,
    Calibration_H TEXT,
    Calibration_L TEXT,
    Calibration_Sign TEXT,
    Control TEXT
);

-- HAYSTACK_TAGS — standard Haystack v4 semantic tagging (replaces old HAYSTACK_ENTITY)
CREATE TABLE IF NOT EXISTS HAYSTACK_TAGS (
    tag_name   TEXT PRIMARY KEY,
    doc        TEXT,
    category   TEXT NOT NULL DEFAULT 'custom',
    deprecated INTEGER NOT NULL DEFAULT 0,
    source     TEXT DEFAULT 'user'
);

CREATE TABLE IF NOT EXISTS HAYSTACK_TAG_RELATIONS (
    tag_name   TEXT NOT NULL,
    parent_tag TEXT NOT NULL,
    PRIMARY KEY (tag_name, parent_tag)
);

CREATE TABLE IF NOT EXISTS HAYSTACK_POINT_TAGS (
    serial_number INTEGER NOT NULL,
    point_type    TEXT NOT NULL,
    point_index   TEXT NOT NULL,
    point_id      TEXT NOT NULL,
    tag_name      TEXT NOT NULL,
    PRIMARY KEY (serial_number, point_type, point_index, tag_name)
);

CREATE INDEX IF NOT EXISTS idx_hpt_serial ON HAYSTACK_POINT_TAGS (serial_number);
CREATE INDEX IF NOT EXISTS idx_hpt_tag ON HAYSTACK_POINT_TAGS (tag_name);

CREATE TABLE IF NOT EXISTS PROGRAMS (
    SerialNumber INTEGER NOT NULL,
    Program_ID TEXT,
    Switch_Node TEXT,
    Program_Label TEXT,
    Program_List TEXT,
    Program_Size TEXT,
    Program_Pointer TEXT,
    Program_Status TEXT,
    Auto_Manual TEXT
);

CREATE TABLE IF NOT EXISTS SCHEDULES (
    SerialNumber INTEGER NOT NULL,
    Schedule_ID TEXT,
    Auto_Manual TEXT,
    Output_Field TEXT,
    Variable_Field TEXT,
    Holiday1 TEXT,
    Status1 TEXT,
    Holiday2 TEXT,
    Status2 TEXT,
    Interval_Field TEXT,
    Schedule_Time TEXT,
    Monday_Time TEXT,
    Tuesday_Time TEXT,
    Wednesday_Time TEXT,
    Thursday_Time TEXT,
    Friday_Time TEXT
);

CREATE TABLE IF NOT EXISTS PID_TABLE (
    SerialNumber INTEGER NOT NULL,
    Loop_Field TEXT,
    Switch_Node TEXT,
    Input_Field TEXT,
    Input_Value TEXT,
    Auto_Manual TEXT,
    Output_Field TEXT,
    Output_Value TEXT,
    Set_Value TEXT,
    Units TEXT,
    Action_Field TEXT,
    Proportional TEXT,
    Reset_Field TEXT,
    Rate TEXT,
    Bias TEXT,
    Status TEXT,
    Type_Field TEXT,
    Setpoint_High TEXT,
    Setpoint_Low TEXT,
    Units_State TEXT,
    Variable_State TEXT
);

CREATE TABLE IF NOT EXISTS HOLIDAYS (
    SerialNumber INTEGER NOT NULL,
    Holiday_ID TEXT,
    Auto_Manual TEXT,
    Holiday_Value TEXT,
    Status TEXT,
    Month_Field TEXT,
    Day_Field TEXT,
    Year_Field TEXT
);

CREATE TABLE IF NOT EXISTS GRAPHICS (
    SerialNumber INTEGER NOT NULL,
    Graphic_ID TEXT,
    Switch_Node TEXT,
    Graphic_Label TEXT,
    Graphic_Full_Label TEXT,
    Graphic_Picture_File TEXT,
    Graphic_Total_Point TEXT
);

CREATE TABLE IF NOT EXISTS ALARMS (
    SerialNumber INTEGER NOT NULL,
    Alarm_ID TEXT,
    Panel TEXT,
    Message TEXT,
    Status TEXT,
    Priority TEXT,
    NotificationID TEXT,
    AlarmState TEXT,
    AlarmType TEXT,
    Source TEXT,
    Description TEXT,
    Acknowledged TEXT,
    Action_Field TEXT,
    TimeStamp TEXT,
    LowLimit TEXT,
    HighLimit TEXT
);

CREATE TABLE IF NOT EXISTS MONITORDATA (
    SerialNumber INTEGER NOT NULL,
    Monitor_ID TEXT,
    Switch_Node TEXT,
    Monitor_Label TEXT,
    Monitor_Value TEXT,
    Auto_Manual TEXT,
    Status TEXT,
    Units TEXT,
    Monitor_Type TEXT,
    TimeStamp TEXT,
    Range_Field TEXT,
    Calibration TEXT
);

-- =================================================================
-- ADDITIONAL T3000 FEATURE TABLES
-- =================================================================

CREATE TABLE IF NOT EXISTS ARRAYS (
    SerialNumber INTEGER NOT NULL,
    Array_ID TEXT,
    Array_Index TEXT,
    Panel TEXT,
    Label TEXT,
    Array_Size INTEGER,
    Status TEXT
);

CREATE TABLE IF NOT EXISTS CONVERSION_TABLES (
    SerialNumber INTEGER NOT NULL,
    Table_ID TEXT,
    Table_Index TEXT,
    Panel TEXT,
    Table_Name TEXT,
    Table_Data TEXT,
    Status TEXT
);

CREATE TABLE IF NOT EXISTS CUSTOM_UNITS (
    SerialNumber INTEGER NOT NULL,
    Unit_ID TEXT,
    Unit_Index TEXT,
    Panel TEXT,
    Unit_Type TEXT,
    Direct INTEGER,
    Digital_Units_Off TEXT,
    Digital_Units_On TEXT,
    Analog_Unit_Name TEXT,
    Status TEXT
);

CREATE TABLE IF NOT EXISTS VARIABLE_UNITS (
    SerialNumber INTEGER NOT NULL,
    Variable_ID TEXT,
    Variable_Index TEXT,
    Panel TEXT,
    Variable_Cus_Unite TEXT,
    Status TEXT
);

CREATE TABLE IF NOT EXISTS USERS (
    SerialNumber INTEGER NOT NULL,
    User_ID TEXT,
    User_Index TEXT,
    Panel TEXT,
    Name TEXT,
    Password TEXT,
    Access_Level INTEGER,
    Rights_Access INTEGER,
    Default_Panel INTEGER,
    Default_Group INTEGER,
    Screen_Right TEXT,
    Program_Right TEXT,
    Status TEXT
);

CREATE TABLE IF NOT EXISTS REMOTE_POINTS (
    SerialNumber INTEGER NOT NULL,
    Remote_ID TEXT,
    Remote_Index TEXT,
    Panel TEXT,
    Point_Number INTEGER,
    Point_Type INTEGER,
    Point_Panel INTEGER,
    Sub_Panel INTEGER,
    Network INTEGER,
    Point_Value INTEGER,
    Auto_Manual INTEGER,
    Digital_Analog INTEGER,
    Device_Online INTEGER,
    Product_ID INTEGER,
    Count_Field INTEGER,
    Read_Write INTEGER,
    Time_Remaining INTEGER,
    Object_Instance INTEGER,
    Status TEXT
);

CREATE TABLE IF NOT EXISTS EMAIL_ALARMS (
    SerialNumber INTEGER NOT NULL,
    Email_ID TEXT,
    Panel TEXT,
    SMTP_Type INTEGER,
    SMTP_IP TEXT,
    SMTP_Domain TEXT,
    SMTP_Port INTEGER,
    Email_Address TEXT,
    User_Name TEXT,
    Password TEXT,
    Secure_Connection_Type INTEGER,
    To1_Addr TEXT,
    To2_Addr TEXT,
    Error_Code INTEGER,
    Status TEXT
);

CREATE TABLE IF NOT EXISTS EXTIO_DEVICES (
    SerialNumber INTEGER NOT NULL,
    ExtIO_ID TEXT,
    ExtIO_Index TEXT,
    Panel TEXT,
    Product_ID INTEGER,
    Port INTEGER,
    Modbus_ID INTEGER,
    Last_Contact_Time INTEGER,
    Input_Start INTEGER,
    Input_End INTEGER,
    Output_Start INTEGER,
    Output_End INTEGER,
    ExtIO_SerialNumber INTEGER,
    Status TEXT
);

CREATE TABLE IF NOT EXISTS TSTAT_SCHEDULES (
    SerialNumber INTEGER NOT NULL,
    Tstat_ID TEXT,
    Tstat_Index TEXT,
    Panel TEXT,
    Schedule_ID INTEGER,
    Schedule INTEGER,
    Flag INTEGER,
    Online_Status INTEGER,
    Name TEXT,
    Day_Setpoint INTEGER,
    Night_Setpoint INTEGER,
    Awake_Setpoint INTEGER,
    Sleep_Setpoint INTEGER,
    Status TEXT
);

CREATE TABLE IF NOT EXISTS GRAPHIC_LABELS (
    SerialNumber INTEGER NOT NULL,
    Label_ID TEXT,
    Label_Index INTEGER,
    Panel TEXT,
    Label_Status INTEGER,
    Screen_Index INTEGER,
    Main_Panel INTEGER,
    Sub_Panel INTEGER,
    Point_Type INTEGER,
    Point_Number INTEGER,
    Point_X INTEGER,
    Point_Y INTEGER,
    Text_Color INTEGER,
    Display_Type INTEGER,
    Icon_Size INTEGER,
    Icon_Place INTEGER,
    Icon_Name_1 TEXT,
    Icon_Name_2 TEXT,
    Network INTEGER,
    Status TEXT
);

CREATE TABLE IF NOT EXISTS MSV_DATA (
    SerialNumber INTEGER NOT NULL,
    MSV_ID TEXT,
    MSV_Index INTEGER,
    Panel TEXT,
    Status_Field INTEGER,
    MSV_Name TEXT,
    MSV_Value INTEGER,
    Status TEXT
);

CREATE TABLE IF NOT EXISTS ALARM_SETTINGS (
    SerialNumber INTEGER NOT NULL,
    Alarm_Setting_ID TEXT,
    Alarm_Setting_Index TEXT,
    Panel TEXT,
    Point_Number INTEGER,
    Point_Type INTEGER,
    Point_Panel INTEGER,
    Point1_Number INTEGER,
    Point1_Type INTEGER,
    Point1_Panel INTEGER,
    Condition INTEGER,
    Way_Low INTEGER,
    Low INTEGER,
    Normal INTEGER,
    High INTEGER,
    Way_High INTEGER,
    Time_Field INTEGER,
    Message_Count INTEGER,
    Count_Field INTEGER,
    Status TEXT
);

-- =================================================================
-- DEVICE SETTINGS TABLES
-- =================================================================

CREATE TABLE IF NOT EXISTS NETWORK_SETTINGS (
    SerialNumber INTEGER PRIMARY KEY,
    IP_Address TEXT,
    Subnet TEXT,
    Gateway TEXT,
    MAC_Address TEXT,
    TCP_Type INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS COMMUNICATION_SETTINGS (
    SerialNumber INTEGER PRIMARY KEY,
    COM0_Config INTEGER,
    COM1_Config INTEGER,
    COM2_Config INTEGER,
    COM_Baudrate0 INTEGER,
    COM_Baudrate1 INTEGER,
    COM_Baudrate2 INTEGER,
    UART_Parity0 INTEGER,
    UART_Parity1 INTEGER,
    UART_Parity2 INTEGER,
    UART_Stopbit0 INTEGER,
    UART_Stopbit1 INTEGER,
    UART_Stopbit2 INTEGER,
    Fix_COM_Config INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS PROTOCOL_SETTINGS (
    SerialNumber INTEGER PRIMARY KEY,
    Modbus_ID INTEGER,
    Modbus_Port INTEGER,
    MSTP_ID INTEGER,
    MSTP_Network_Number INTEGER,
    Max_Master INTEGER,
    Object_Instance INTEGER,
    BBMD_Enable INTEGER,
    Network_Number INTEGER,
    Network_Number_Hi INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS TIME_SETTINGS (
    SerialNumber INTEGER PRIMARY KEY,
    Time_Zone INTEGER,
    Time_Zone_Summer_Daytime INTEGER,
    Time_Update_Since_1970 INTEGER,
    Enable_SNTP INTEGER,
    SNTP_Server TEXT,
    Flag_Time_Sync_PC INTEGER,
    Time_Sync_Auto_Manual INTEGER,
    Sync_Time_Results INTEGER,
    Start_Month INTEGER,
    Start_Day INTEGER,
    End_Month INTEGER,
    End_Day INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS DYNDNS_SETTINGS (
    SerialNumber INTEGER PRIMARY KEY,
    Enable_DynDNS INTEGER,
    DynDNS_Provider INTEGER,
    DynDNS_User TEXT,
    DynDNS_Pass TEXT,
    DynDNS_Domain TEXT,
    DynDNS_Update_Time INTEGER,
    Update_DynDNS_Time TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS HARDWARE_INFO (
    SerialNumber INTEGER PRIMARY KEY,
    Hardware_Rev INTEGER,
    Firmware0_Rev_Main INTEGER,
    Firmware0_Rev_Sub INTEGER,
    Firmware1_Rev INTEGER,
    Firmware2_Rev INTEGER,
    Firmware3_Rev INTEGER,
    Bootloader_Rev INTEGER,
    Mini_Type INTEGER,
    Panel_Type INTEGER,
    USB_Mode INTEGER,
    SD_Exist INTEGER,
    Zigbee_Exist INTEGER,
    Zigbee_PanID INTEGER,
    Special_Flag INTEGER,
    Max_Var INTEGER,
    Max_In INTEGER,
    Max_Out INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS FEATURE_FLAGS (
    SerialNumber INTEGER PRIMARY KEY,
    User_Name_Enable INTEGER,
    Customer_Unite_Enable INTEGER,
    Enable_Panel_Name INTEGER,
    LCD_Display INTEGER,
    LCD_Display_Type INTEGER,
    LCD_Point_Type INTEGER,
    LCD_Point_Number INTEGER,
    LCD_BACnet_Instance INTEGER,
    Enable_Plug_N_Play INTEGER,
    Refresh_Flash_Timer INTEGER,
    Reset_Default INTEGER,
    Debug INTEGER,
    Webview_JSON_Flash INTEGER,
    Write_Flash INTEGER,
    LCD_Mode INTEGER DEFAULT 0,
    LCD_Delay_Seconds INTEGER DEFAULT 30,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS WIFI_SETTINGS (
    SerialNumber INTEGER PRIMARY KEY,
    Wifi_Enable INTEGER,
    IP_Auto_Manual INTEGER,
    IP_Wifi_Status INTEGER,
    Load_Default INTEGER,
    Modbus_Port INTEGER,
    BACnet_Port INTEGER,
    Software_Version INTEGER,
    Username TEXT,
    Password TEXT,
    IP_Address TEXT,
    Net_Mask TEXT,
    Gateway TEXT,
    Wifi_MAC TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS MISC_SETTINGS (
    SerialNumber INTEGER PRIMARY KEY,
    Flag1 INTEGER,
    Flag2 INTEGER,
    Monitor_Analog_Block_0 INTEGER,
    Monitor_Analog_Block_1 INTEGER,
    Monitor_Analog_Block_2 INTEGER,
    Monitor_Analog_Block_3 INTEGER,
    Monitor_Analog_Block_4 INTEGER,
    Monitor_Analog_Block_5 INTEGER,
    Monitor_Analog_Block_6 INTEGER,
    Monitor_Analog_Block_7 INTEGER,
    Monitor_Analog_Block_8 INTEGER,
    Monitor_Analog_Block_9 INTEGER,
    Monitor_Analog_Block_10 INTEGER,
    Monitor_Analog_Block_11 INTEGER,
    Monitor_Digital_Block_0 INTEGER,
    Monitor_Digital_Block_1 INTEGER,
    Monitor_Digital_Block_2 INTEGER,
    Monitor_Digital_Block_3 INTEGER,
    Monitor_Digital_Block_4 INTEGER,
    Monitor_Digital_Block_5 INTEGER,
    Monitor_Digital_Block_6 INTEGER,
    Monitor_Digital_Block_7 INTEGER,
    Monitor_Digital_Block_8 INTEGER,
    Monitor_Digital_Block_9 INTEGER,
    Monitor_Digital_Block_10 INTEGER,
    Monitor_Digital_Block_11 INTEGER,
    Operation_Time_0 INTEGER,
    Operation_Time_1 INTEGER,
    Operation_Time_2 INTEGER,
    Operation_Time_3 INTEGER,
    Operation_Time_4 INTEGER,
    Operation_Time_5 INTEGER,
    Operation_Time_6 INTEGER,
    Operation_Time_7 INTEGER,
    Operation_Time_8 INTEGER,
    Operation_Time_9 INTEGER,
    Operation_Time_10 INTEGER,
    Operation_Time_11 INTEGER,
    Network_Health_Flag INTEGER,
    COM_RX_0 INTEGER,
    COM_RX_1 INTEGER,
    COM_RX_2 INTEGER,
    COM_TX_0 INTEGER,
    COM_TX_1 INTEGER,
    COM_TX_2 INTEGER,
    Collision_0 INTEGER,
    Collision_1 INTEGER,
    Collision_2 INTEGER,
    Packet_Error_0 INTEGER,
    Packet_Error_1 INTEGER,
    Packet_Error_2 INTEGER,
    Timeout_0 INTEGER,
    Timeout_1 INTEGER,
    Timeout_2 INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS REMOTE_TSTAT_DB (
    SerialNumber INTEGER NOT NULL,
    Remote_Tstat_ID TEXT,
    Remote_Index INTEGER,
    Panel TEXT,
    Protocol INTEGER,
    Modbus_ID INTEGER,
    BACnet_Instance INTEGER,
    Status TEXT
);

-- =================================================================
-- TRENDLOG TABLES
-- =================================================================

CREATE TABLE IF NOT EXISTS TRENDLOGS (
    id SERIAL PRIMARY KEY,
    SerialNumber INTEGER NOT NULL,
    PanelId INTEGER NOT NULL,
    Trendlog_ID TEXT NOT NULL,
    Switch_Node TEXT,
    Trendlog_Label TEXT,
    Interval_Seconds INTEGER,
    Buffer_Size INTEGER,
    Data_Size_KB TEXT,
    Auto_Manual TEXT,
    Status TEXT,
    ffi_synced INTEGER DEFAULT 0,
    last_ffi_sync TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS TRENDLOG_INPUTS (
    id SERIAL PRIMARY KEY,
    SerialNumber INTEGER NOT NULL,
    PanelId INTEGER NOT NULL,
    Trendlog_ID TEXT NOT NULL,
    Point_Type TEXT NOT NULL,
    Point_Index TEXT NOT NULL,
    Point_Panel TEXT,
    Point_Label TEXT,
    Status TEXT,
    view_type TEXT DEFAULT 'MAIN',
    view_number INTEGER DEFAULT NULL,
    is_selected INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(SerialNumber, PanelId, Trendlog_ID, Point_Type, Point_Index, view_type, view_number)
);

CREATE TABLE IF NOT EXISTS TRENDLOG_VIEWS (
    id SERIAL PRIMARY KEY,
    SerialNumber INTEGER NOT NULL,
    PanelId INTEGER NOT NULL,
    Trendlog_ID TEXT NOT NULL,
    View_Number INTEGER NOT NULL,
    Point_Type TEXT NOT NULL,
    Point_Index TEXT NOT NULL,
    Point_Panel TEXT,
    Point_Label TEXT,
    is_selected INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(SerialNumber, PanelId, Trendlog_ID, View_Number, Point_Type, Point_Index)
);

CREATE TABLE IF NOT EXISTS TRENDLOG_DATA_OLD (
    SerialNumber INTEGER NOT NULL,
    PanelId INTEGER NOT NULL,
    PointId TEXT NOT NULL,
    PointIndex INTEGER NOT NULL,
    PointType TEXT NOT NULL,
    Value TEXT NOT NULL,
    LoggingTime TEXT NOT NULL,
    LoggingTime_Fmt TEXT NOT NULL,
    Digital_Analog TEXT,
    Range_Field TEXT,
    Units TEXT,
    DataSource TEXT DEFAULT 'REALTIME',
    SyncInterval INTEGER DEFAULT 30,
    CreatedBy TEXT DEFAULT 'FRONTEND'
);

CREATE TABLE IF NOT EXISTS TRENDLOG_DATA (
    id SERIAL PRIMARY KEY,
    SerialNumber INTEGER NOT NULL,
    PanelId INTEGER NOT NULL,
    PointId TEXT NOT NULL,
    PointIndex INTEGER NOT NULL,
    PointType TEXT NOT NULL,
    Digital_Analog TEXT,
    Range_Field TEXT,
    Units TEXT,
    Description TEXT,
    IsActive BOOLEAN DEFAULT TRUE,
    CreatedAt TIMESTAMP DEFAULT NOW(),
    UpdatedAt TIMESTAMP DEFAULT NOW(),
    UNIQUE(SerialNumber, PanelId, PointId, PointIndex, PointType)
);

CREATE TABLE IF NOT EXISTS TRENDLOG_DATA_SYNC_METADATA (
    id SERIAL PRIMARY KEY,
    SyncTime_Fmt TEXT NOT NULL,
    MessageType TEXT NOT NULL,
    PanelId INTEGER,
    SerialNumber INTEGER,
    RecordsInserted INTEGER DEFAULT 0,
    SyncInterval INTEGER NOT NULL,
    Success INTEGER DEFAULT 1,
    ErrorMessage TEXT,
    CreatedAt TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS TRENDLOG_DATA_DETAIL (
    ParentId INTEGER NOT NULL,
    Value TEXT NOT NULL,
    LoggingTime_Fmt TEXT NOT NULL
);

-- =================================================================
-- DATABASE MANAGEMENT TABLES
-- =================================================================

CREATE TABLE IF NOT EXISTS DATABASE_PARTITION_CONFIG (
    id SERIAL PRIMARY KEY,
    strategy TEXT NOT NULL DEFAULT 'monthly' CHECK (strategy IN ('5minutes', 'daily', 'weekly', 'monthly', 'quarterly', 'custom', 'custom-months')),
    custom_days INTEGER CHECK (custom_days IS NULL OR (custom_days >= 1 AND custom_days <= 365)),
    custom_months INTEGER CHECK (custom_months IS NULL OR (custom_months >= 1 AND custom_months <= 12)),
    retention_value INTEGER NOT NULL DEFAULT 30 CHECK (retention_value > 0),
    retention_unit TEXT NOT NULL DEFAULT 'days' CHECK (retention_unit IN ('days', 'weeks', 'months')),
    auto_cleanup_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS DATABASE_FILES (
    id SERIAL PRIMARY KEY,
    file_name TEXT NOT NULL UNIQUE,
    file_path TEXT NOT NULL,
    file_size_bytes INTEGER NOT NULL DEFAULT 0,
    record_count INTEGER NOT NULL DEFAULT 0,
    partition_identifier TEXT,
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_accessed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS APPLICATION_CONFIG (
    id SERIAL PRIMARY KEY,
    config_key TEXT NOT NULL,
    config_value TEXT NOT NULL,
    config_type TEXT NOT NULL DEFAULT 'json' CHECK (config_type IN ('string', 'number', 'boolean', 'json')),
    description TEXT,
    user_id INTEGER,
    device_serial TEXT,
    panel_id INTEGER,
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    version TEXT,
    size_bytes INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(config_key, user_id, device_serial, panel_id)
);

CREATE TABLE IF NOT EXISTS APPLICATION_CONFIG_HISTORY (
    id SERIAL PRIMARY KEY,
    config_key TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT NOT NULL,
    changed_by TEXT,
    change_reason TEXT,
    changed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS DATABASE_PARTITIONS (
    id SERIAL PRIMARY KEY,
    partition_name TEXT NOT NULL UNIQUE,
    partition_identifier TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    table_prefix TEXT NOT NULL,
    record_count INTEGER NOT NULL DEFAULT 0,
    file_size_bytes INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_current BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS DATA_SYNC_METADATA (
    id SERIAL PRIMARY KEY,
    sync_time INTEGER NOT NULL,
    sync_time_fmt TEXT NOT NULL,
    data_type TEXT NOT NULL,
    serial_number TEXT NOT NULL,
    panel_id INTEGER,
    records_synced INTEGER DEFAULT 0,
    sync_method TEXT NOT NULL,
    success INTEGER NOT NULL DEFAULT 1,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- =================================================================
-- INDEXES
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
CREATE INDEX IF NOT EXISTS IDX_TRENDLOGS_ID ON TRENDLOGS(Trendlog_ID);
CREATE INDEX IF NOT EXISTS IDX_TRENDLOG_INPUTS_ID ON TRENDLOG_INPUTS(Trendlog_ID);
CREATE INDEX IF NOT EXISTS IDX_TRENDLOG_INPUTS_VIEW ON TRENDLOG_INPUTS(Trendlog_ID, view_type, view_number);
CREATE INDEX IF NOT EXISTS IDX_TRENDLOG_VIEWS_ID ON TRENDLOG_VIEWS(Trendlog_ID);
CREATE INDEX IF NOT EXISTS IDX_TRENDLOG_VIEWS_UNIQUE ON TRENDLOG_VIEWS(Trendlog_ID, View_Number);

-- Legacy TRENDLOG_DATA_OLD indexes
CREATE INDEX IF NOT EXISTS IDX_TRENDLOG_DATA_OLD_SOURCE_TIME ON TRENDLOG_DATA_OLD(SerialNumber, PanelId, DataSource, LoggingTime_Fmt);
CREATE INDEX IF NOT EXISTS IDX_TRENDLOG_DATA_OLD_RECENT_QUERY ON TRENDLOG_DATA_OLD(SerialNumber, PanelId, LoggingTime_Fmt DESC);
CREATE INDEX IF NOT EXISTS IDX_TRENDLOG_DATA_OLD_SERIAL ON TRENDLOG_DATA_OLD(SerialNumber);
CREATE INDEX IF NOT EXISTS IDX_TRENDLOG_DATA_OLD_PANEL ON TRENDLOG_DATA_OLD(PanelId);
CREATE INDEX IF NOT EXISTS IDX_TRENDLOG_DATA_OLD_POINT_ID ON TRENDLOG_DATA_OLD(PointId);
CREATE INDEX IF NOT EXISTS IDX_TRENDLOG_DATA_OLD_POINT_INDEX ON TRENDLOG_DATA_OLD(PointIndex);
CREATE INDEX IF NOT EXISTS IDX_TRENDLOG_DATA_OLD_TYPE ON TRENDLOG_DATA_OLD(PointType);
CREATE INDEX IF NOT EXISTS IDX_TRENDLOG_DATA_OLD_TIME ON TRENDLOG_DATA_OLD(LoggingTime);
CREATE INDEX IF NOT EXISTS IDX_TRENDLOG_DATA_OLD_TIME_FMT ON TRENDLOG_DATA_OLD(LoggingTime_Fmt);

-- TRENDLOG_DATA (Parent) indexes
CREATE INDEX IF NOT EXISTS IDX_TRENDLOG_DATA_LOOKUP ON TRENDLOG_DATA(SerialNumber, PanelId, PointId);
CREATE INDEX IF NOT EXISTS IDX_TRENDLOG_DATA_SERIAL ON TRENDLOG_DATA(SerialNumber);
CREATE INDEX IF NOT EXISTS IDX_TRENDLOG_DATA_TYPE ON TRENDLOG_DATA(PointType);
CREATE INDEX IF NOT EXISTS IDX_TRENDLOG_DATA_ACTIVE ON TRENDLOG_DATA(IsActive);
CREATE INDEX IF NOT EXISTS IDX_TRENDLOG_DATA_HISTORY_FILTER ON TRENDLOG_DATA(SerialNumber, PanelId, PointType, PointIndex);
CREATE INDEX IF NOT EXISTS IDX_TRENDLOG_DATA_SPECIFIC_POINTS ON TRENDLOG_DATA(PointId, PointType, PointIndex, PanelId);

-- TRENDLOG_DATA_DETAIL (Child) indexes
CREATE INDEX IF NOT EXISTS IDX_TRENDLOG_DETAIL_PARENT ON TRENDLOG_DATA_DETAIL(ParentId);
CREATE INDEX IF NOT EXISTS IDX_TRENDLOG_DETAIL_TIME_FMT ON TRENDLOG_DATA_DETAIL(LoggingTime_Fmt DESC);
CREATE INDEX IF NOT EXISTS IDX_TRENDLOG_DETAIL_PARENT_TIME ON TRENDLOG_DATA_DETAIL(ParentId, LoggingTime_Fmt DESC);
CREATE INDEX IF NOT EXISTS IDX_TRENDLOG_DETAIL_TIME_RANGE ON TRENDLOG_DATA_DETAIL(LoggingTime_Fmt, ParentId);

-- TRENDLOG_DATA_SYNC_METADATA indexes
CREATE INDEX IF NOT EXISTS IDX_SYNC_META_TIME ON TRENDLOG_DATA_SYNC_METADATA(SyncTime_Fmt DESC);
CREATE INDEX IF NOT EXISTS IDX_SYNC_META_TYPE ON TRENDLOG_DATA_SYNC_METADATA(MessageType);
CREATE INDEX IF NOT EXISTS IDX_SYNC_META_DEVICE ON TRENDLOG_DATA_SYNC_METADATA(PanelId, SerialNumber);
CREATE INDEX IF NOT EXISTS IDX_SYNC_META_SUCCESS ON TRENDLOG_DATA_SYNC_METADATA(Success);

-- Feature table indexes
CREATE INDEX IF NOT EXISTS IDX_ARRAYS_SERIAL ON ARRAYS(SerialNumber);
CREATE INDEX IF NOT EXISTS IDX_ARRAYS_ID ON ARRAYS(Array_ID);
CREATE INDEX IF NOT EXISTS IDX_CONVERSION_TABLES_SERIAL ON CONVERSION_TABLES(SerialNumber);
CREATE INDEX IF NOT EXISTS IDX_CONVERSION_TABLES_ID ON CONVERSION_TABLES(Table_ID);
CREATE INDEX IF NOT EXISTS IDX_CUSTOM_UNITS_SERIAL ON CUSTOM_UNITS(SerialNumber);
CREATE INDEX IF NOT EXISTS IDX_CUSTOM_UNITS_ID ON CUSTOM_UNITS(Unit_ID);
CREATE INDEX IF NOT EXISTS IDX_CUSTOM_UNITS_TYPE ON CUSTOM_UNITS(Unit_Type);
CREATE INDEX IF NOT EXISTS IDX_VARIABLE_UNITS_SERIAL ON VARIABLE_UNITS(SerialNumber);
CREATE INDEX IF NOT EXISTS IDX_VARIABLE_UNITS_ID ON VARIABLE_UNITS(Variable_ID);
CREATE INDEX IF NOT EXISTS IDX_USERS_SERIAL ON USERS(SerialNumber);
CREATE INDEX IF NOT EXISTS IDX_USERS_ID ON USERS(User_ID);
CREATE INDEX IF NOT EXISTS IDX_USERS_NAME ON USERS(Name);
CREATE INDEX IF NOT EXISTS IDX_USERS_ACCESS_LEVEL ON USERS(Access_Level);
CREATE INDEX IF NOT EXISTS IDX_REMOTE_POINTS_SERIAL ON REMOTE_POINTS(SerialNumber);
CREATE INDEX IF NOT EXISTS IDX_REMOTE_POINTS_ID ON REMOTE_POINTS(Remote_ID);
CREATE INDEX IF NOT EXISTS IDX_REMOTE_POINTS_OBJECT_INSTANCE ON REMOTE_POINTS(Object_Instance);
CREATE INDEX IF NOT EXISTS IDX_EMAIL_ALARMS_SERIAL ON EMAIL_ALARMS(SerialNumber);
CREATE INDEX IF NOT EXISTS IDX_EMAIL_ALARMS_ID ON EMAIL_ALARMS(Email_ID);
CREATE INDEX IF NOT EXISTS IDX_EXTIO_DEVICES_SERIAL ON EXTIO_DEVICES(SerialNumber);
CREATE INDEX IF NOT EXISTS IDX_EXTIO_DEVICES_ID ON EXTIO_DEVICES(ExtIO_ID);
CREATE INDEX IF NOT EXISTS IDX_EXTIO_DEVICES_EXTIO_SERIAL ON EXTIO_DEVICES(ExtIO_SerialNumber);
CREATE INDEX IF NOT EXISTS IDX_TSTAT_SCHEDULES_SERIAL ON TSTAT_SCHEDULES(SerialNumber);
CREATE INDEX IF NOT EXISTS IDX_TSTAT_SCHEDULES_ID ON TSTAT_SCHEDULES(Tstat_ID);
CREATE INDEX IF NOT EXISTS IDX_GRAPHIC_LABELS_SERIAL ON GRAPHIC_LABELS(SerialNumber);
CREATE INDEX IF NOT EXISTS IDX_GRAPHIC_LABELS_ID ON GRAPHIC_LABELS(Label_ID);
CREATE INDEX IF NOT EXISTS IDX_GRAPHIC_LABELS_SCREEN ON GRAPHIC_LABELS(Screen_Index);
CREATE INDEX IF NOT EXISTS IDX_MSV_DATA_SERIAL ON MSV_DATA(SerialNumber);
CREATE INDEX IF NOT EXISTS IDX_MSV_DATA_ID ON MSV_DATA(MSV_ID);
CREATE INDEX IF NOT EXISTS IDX_ALARM_SETTINGS_SERIAL ON ALARM_SETTINGS(SerialNumber);
CREATE INDEX IF NOT EXISTS IDX_ALARM_SETTINGS_ID ON ALARM_SETTINGS(Alarm_Setting_ID);
CREATE INDEX IF NOT EXISTS IDX_NETWORK_SETTINGS_SERIAL ON NETWORK_SETTINGS(SerialNumber);
CREATE INDEX IF NOT EXISTS IDX_COMMUNICATION_SETTINGS_SERIAL ON COMMUNICATION_SETTINGS(SerialNumber);
CREATE INDEX IF NOT EXISTS IDX_PROTOCOL_SETTINGS_SERIAL ON PROTOCOL_SETTINGS(SerialNumber);
CREATE INDEX IF NOT EXISTS IDX_TIME_SETTINGS_SERIAL ON TIME_SETTINGS(SerialNumber);
CREATE INDEX IF NOT EXISTS IDX_DYNDNS_SETTINGS_SERIAL ON DYNDNS_SETTINGS(SerialNumber);
CREATE INDEX IF NOT EXISTS IDX_HARDWARE_INFO_SERIAL ON HARDWARE_INFO(SerialNumber);
CREATE INDEX IF NOT EXISTS IDX_FEATURE_FLAGS_SERIAL ON FEATURE_FLAGS(SerialNumber);
CREATE INDEX IF NOT EXISTS IDX_WIFI_SETTINGS_SERIAL ON WIFI_SETTINGS(SerialNumber);
CREATE INDEX IF NOT EXISTS IDX_MISC_SETTINGS_SERIAL ON MISC_SETTINGS(SerialNumber);
CREATE INDEX IF NOT EXISTS IDX_REMOTE_TSTAT_DB_SERIAL ON REMOTE_TSTAT_DB(SerialNumber);
CREATE INDEX IF NOT EXISTS IDX_REMOTE_TSTAT_DB_ID ON REMOTE_TSTAT_DB(Remote_Tstat_ID);

-- Database management indexes
CREATE INDEX IF NOT EXISTS idx_DATABASE_PARTITION_CONFIG_strategy ON DATABASE_PARTITION_CONFIG(strategy);
CREATE INDEX IF NOT EXISTS idx_DATABASE_PARTITION_CONFIG_active ON DATABASE_PARTITION_CONFIG(is_active);
CREATE INDEX IF NOT EXISTS idx_DATABASE_PARTITION_CONFIG_created ON DATABASE_PARTITION_CONFIG(created_at);
CREATE INDEX IF NOT EXISTS idx_DATABASE_FILES_name ON DATABASE_FILES(file_name);
CREATE INDEX IF NOT EXISTS idx_DATABASE_FILES_active ON DATABASE_FILES(is_active);
CREATE INDEX IF NOT EXISTS idx_DATABASE_FILES_archived ON DATABASE_FILES(is_archived);
CREATE INDEX IF NOT EXISTS idx_DATABASE_FILES_partition ON DATABASE_FILES(partition_identifier);
CREATE INDEX IF NOT EXISTS idx_DATABASE_FILES_created ON DATABASE_FILES(created_at);
CREATE INDEX IF NOT EXISTS idx_DATABASE_FILES_accessed ON DATABASE_FILES(last_accessed_at);
CREATE INDEX IF NOT EXISTS idx_application_config_key ON APPLICATION_CONFIG(config_key);
CREATE INDEX IF NOT EXISTS idx_application_config_type ON APPLICATION_CONFIG(config_type);
CREATE INDEX IF NOT EXISTS idx_application_config_system ON APPLICATION_CONFIG(is_system);
CREATE INDEX IF NOT EXISTS idx_application_config_user ON APPLICATION_CONFIG(user_id);
CREATE INDEX IF NOT EXISTS idx_application_config_device ON APPLICATION_CONFIG(device_serial);
CREATE INDEX IF NOT EXISTS idx_application_config_size ON APPLICATION_CONFIG(size_bytes);
CREATE INDEX IF NOT EXISTS idx_application_config_history_key ON APPLICATION_CONFIG_HISTORY(config_key);
CREATE INDEX IF NOT EXISTS idx_application_config_history_changed_at ON APPLICATION_CONFIG_HISTORY(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_application_config_history_changed_by ON APPLICATION_CONFIG_HISTORY(changed_by);
CREATE INDEX IF NOT EXISTS idx_DATABASE_PARTITIONS_name ON DATABASE_PARTITIONS(partition_name);
CREATE INDEX IF NOT EXISTS idx_DATABASE_PARTITIONS_identifier ON DATABASE_PARTITIONS(partition_identifier);
CREATE INDEX IF NOT EXISTS idx_DATABASE_PARTITIONS_active ON DATABASE_PARTITIONS(is_active);
CREATE INDEX IF NOT EXISTS idx_DATABASE_PARTITIONS_current ON DATABASE_PARTITIONS(is_current);
CREATE INDEX IF NOT EXISTS idx_DATABASE_PARTITIONS_dates ON DATABASE_PARTITIONS(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_data_sync_metadata_lookup ON DATA_SYNC_METADATA(serial_number, data_type, sync_time DESC);
CREATE INDEX IF NOT EXISTS idx_data_sync_metadata_created ON DATA_SYNC_METADATA(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_data_sync_metadata_method ON DATA_SYNC_METADATA(sync_method, created_at DESC);

-- =================================================================
-- SEED DATA
-- =================================================================

INSERT INTO DATABASE_PARTITION_CONFIG (id, strategy, retention_value, retention_unit, auto_cleanup_enabled)
VALUES (1, 'monthly', 30, 'days', TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO APPLICATION_CONFIG (config_key, config_value, config_type, description, is_system)
VALUES
('database.version', '1.0', 'string', 'Database schema version', TRUE),
('database.need_update', '1', 'boolean', 'Flag indicating if database needs update', TRUE),
('database.update_status', '0', 'boolean', 'Update completion status', TRUE),
('database.max_file_size', '2048', 'number', 'Maximum database file size in MB', TRUE),
('database.backup_enabled', 'true', 'boolean', 'Enable automatic database backups', TRUE),
('database.compression_enabled', 'false', 'boolean', 'Enable database compression', TRUE),
('database.vacuum_interval', '7', 'number', 'Database vacuum interval in days', TRUE),
('ui.theme', 'light', 'string', 'Application theme preference', FALSE),
('ui.language', 'en', 'string', 'Application language', FALSE),
('ffi.sync_interval_secs', '900', 'number', 'FFI Sync Service interval in seconds', FALSE),
('rediscover.interval_secs', '3600', 'number', 'Rediscover Service interval in seconds', FALSE)
ON CONFLICT DO NOTHING;

INSERT INTO APPLICATION_CONFIG (config_key, config_value, config_type, description, is_system)
VALUES
('ui.refresh.inputs',    '{"autoRefreshEnabled":false,"refreshIntervalSecs":30}', 'json', 'UI auto-refresh settings for Inputs page', FALSE),
('ui.refresh.outputs',   '{"autoRefreshEnabled":false,"refreshIntervalSecs":30}', 'json', 'UI auto-refresh settings for Outputs page', FALSE),
('ui.refresh.variables', '{"autoRefreshEnabled":false,"refreshIntervalSecs":30}', 'json', 'UI auto-refresh settings for Variables page', FALSE),
('ui.refresh.programs',  '{"autoRefreshEnabled":false,"refreshIntervalSecs":30}', 'json', 'UI auto-refresh settings for Programs page', FALSE),
('ui.refresh.schedules', '{"autoRefreshEnabled":false,"refreshIntervalSecs":30}', 'json', 'UI auto-refresh settings for Schedules page', FALSE),
('ui.refresh.holidays',  '{"autoRefreshEnabled":false,"refreshIntervalSecs":30}', 'json', 'UI auto-refresh settings for Holidays page', FALSE)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- T3_APP_LOG - Unified application event log
-- Replaces SYNC_EVENT_LOG and SYSTEM_LOGS.
-- categories: SYNC_CYCLE | SYNC_ERROR | DB_CONFIG | SAMPLING_STATE | SERVER_EVENT | HEARTBEAT
-- ============================================================================
CREATE TABLE IF NOT EXISTS T3_APP_LOG (
    id            SERIAL       PRIMARY KEY,
    ts_unix       BIGINT       NOT NULL,
    ts_fmt        TEXT         NOT NULL,
    level         TEXT         NOT NULL DEFAULT 'info',
    category      TEXT         NOT NULL DEFAULT 'SERVER_EVENT',
    source        TEXT,
    hostname      TEXT,
    role          TEXT,
    device_serial TEXT,
    message       TEXT         NOT NULL DEFAULT '',
    details       TEXT
);
CREATE INDEX IF NOT EXISTS idx_t3_app_log_ts  ON T3_APP_LOG (ts_unix DESC);
CREATE INDEX IF NOT EXISTS idx_t3_app_log_cat ON T3_APP_LOG (category);

-- ============================================================================
-- DB_BACKEND_CONFIG - Centralized Database Backend Configuration
-- Stores connection settings for each supported database backend.
-- Each backend type is a row. Only one row has is_active=1 at a time.
-- This table ALWAYS lives in local SQLite (never on remote DB).
-- ============================================================================
CREATE TABLE IF NOT EXISTS DB_BACKEND_CONFIG (
    id            SERIAL PRIMARY KEY,
    backend_type  VARCHAR(20) NOT NULL UNIQUE,
    is_active     INTEGER NOT NULL DEFAULT 0,
    host          TEXT,
    port          INTEGER,
    instance      TEXT,
    database_name TEXT,
    username      TEXT,
    password      TEXT,
    connection_url TEXT,
    extra_options TEXT,
    role          TEXT DEFAULT 'server',
    updated_at    TIMESTAMP DEFAULT NOW()
);

-- Seed default rows (one per supported backend)
INSERT INTO DB_BACKEND_CONFIG (backend_type, is_active, connection_url)
    VALUES ('sqlite', 1, 'sqlite://Database/webview_t3_device.db')
    ON CONFLICT DO NOTHING;
INSERT INTO DB_BACKEND_CONFIG (backend_type, is_active, port)
    VALUES ('mssql', 0, 1433)
    ON CONFLICT DO NOTHING;
INSERT INTO DB_BACKEND_CONFIG (backend_type, is_active, port)
    VALUES ('postgres', 0, 5432)
    ON CONFLICT DO NOTHING;
INSERT INTO DB_BACKEND_CONFIG (backend_type, is_active, port)
    VALUES ('mysql', 0, 3306)
    ON CONFLICT DO NOTHING;

-- ============================================================================
-- SERVER_CLIENT_REGISTRY - Tracks all PCs participating in centralized DB mode
-- Server writes its own entry, clients send heartbeats to the server.
-- ============================================================================
CREATE TABLE IF NOT EXISTS SERVER_CLIENT_REGISTRY (
    id            SERIAL PRIMARY KEY,
    hostname      VARCHAR(255) NOT NULL DEFAULT '',
    ip_address    VARCHAR(45) NOT NULL DEFAULT '',
    role          VARCHAR(20) NOT NULL DEFAULT 'client',
    is_self       INTEGER NOT NULL DEFAULT 0,
    status        VARCHAR(20) NOT NULL DEFAULT 'online',
    last_seen     TIMESTAMP NOT NULL DEFAULT NOW(),
    db_backend    VARCHAR(20) DEFAULT 'sqlite',
    table_count   INTEGER DEFAULT 0,
    version       VARCHAR(50) DEFAULT '',
    created_at    TIMESTAMP DEFAULT NOW(),
    UNIQUE(hostname, ip_address)
);

-- ============================================================================
-- T3_FLOW / T3_FLOW_STEP / T3_FLOW_PAYLOAD - Flow-based trace logging
-- NOTE: At runtime these tables live in local SQLite only (webview_t3_device.db).
-- This PostgreSQL DDL is kept as a reference schema for future multi-DB deployments.
-- ============================================================================
CREATE TABLE IF NOT EXISTS T3_FLOW (
    id           SERIAL  PRIMARY KEY,
    flow_id      TEXT    NOT NULL UNIQUE,
    flow_type    TEXT    NOT NULL,
    trigger_src  TEXT    NOT NULL,
    started_at   BIGINT  NOT NULL,
    ended_at     BIGINT,
    status       TEXT    NOT NULL DEFAULT 'running',
    hostname     TEXT,
    total_steps  INTEGER NOT NULL DEFAULT 0,
    done_steps   INTEGER NOT NULL DEFAULT 0,
    error_count  INTEGER NOT NULL DEFAULT 0,
    meta         TEXT
);
CREATE INDEX IF NOT EXISTS idx_t3_flow_type    ON T3_FLOW (flow_type);
CREATE INDEX IF NOT EXISTS idx_t3_flow_started ON T3_FLOW (started_at DESC);
CREATE INDEX IF NOT EXISTS idx_t3_flow_status  ON T3_FLOW (status);

CREATE TABLE IF NOT EXISTS T3_FLOW_STEP (
    id           SERIAL  PRIMARY KEY,
    flow_id      TEXT    NOT NULL,
    seq          INTEGER NOT NULL,
    step_name    TEXT    NOT NULL,
    level        TEXT    NOT NULL DEFAULT 'info',
    source       TEXT,
    api_path     TEXT,
    action_type  INTEGER,
    status       TEXT    NOT NULL DEFAULT 'ok',
    duration_ms  BIGINT,
    payload_ref  TEXT,
    message      TEXT,
    details      TEXT,
    ts_unix      BIGINT  NOT NULL,
    ts_fmt       TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_t3_flow_step_flow ON T3_FLOW_STEP (flow_id);
CREATE INDEX IF NOT EXISTS idx_t3_flow_step_ts   ON T3_FLOW_STEP (ts_unix DESC);

CREATE TABLE IF NOT EXISTS T3_FLOW_PAYLOAD (
    id           SERIAL  PRIMARY KEY,
    flow_id      TEXT    NOT NULL,
    step_id      INTEGER NOT NULL,
    file_path    TEXT    NOT NULL,
    size_bytes   BIGINT  NOT NULL,
    created_at   BIGINT  NOT NULL,
    purged       INTEGER NOT NULL DEFAULT 0
);
