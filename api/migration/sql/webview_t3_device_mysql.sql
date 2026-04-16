-- ==========================================================================
-- T3000 WebView Device Database Schema — MySQL Dialect
-- Translated from webview_t3_device_schema.sql (SQLite)
-- Date: 2026-04-15
-- Purpose: Create 46 device tables on a centralized MySQL/MariaDB server.
--          DB_BACKEND_CONFIG is NOT included (local SQLite only).
-- ==========================================================================

-- =================================================================
-- CORE T3000 TABLES
-- =================================================================

CREATE TABLE IF NOT EXISTS DEVICES (
    SerialNumber INT PRIMARY KEY,
    PanelId INT,
    MainBuilding_Name TEXT,
    Building_Name TEXT,
    Floor_Name TEXT,
    Room_Name TEXT,
    Panel_Number INT,
    Network_Number INT,
    Product_Name TEXT,
    Product_Class_ID INT,
    Product_ID INT,
    Screen_Name TEXT,
    Bautrate TEXT,
    Address TEXT,
    `Register` TEXT,
    `Function` TEXT,
    Description TEXT,
    High_Units TEXT,
    Low_Units TEXT,
    Update_Field TEXT,
    Status TEXT,
    Range_Field TEXT,
    Calibration TEXT,
    ip_address TEXT,
    port INT,
    bacnet_mstp_mac_id INT,
    modbus_address INT,
    pc_ip_address TEXT,
    modbus_port INT,
    bacnet_ip_port INT,
    show_label_name TEXT,
    connection_type TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS INPUTS (
    SerialNumber INT NOT NULL,
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS OUTPUTS (
    SerialNumber INT NOT NULL,
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS VARIABLES (
    SerialNumber INT NOT NULL,
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS PROGRAMS (
    SerialNumber INT NOT NULL,
    Program_ID TEXT,
    Switch_Node TEXT,
    Program_Label TEXT,
    Program_List TEXT,
    Program_Size TEXT,
    Program_Pointer TEXT,
    Program_Status TEXT,
    Auto_Manual TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS SCHEDULES (
    SerialNumber INT NOT NULL,
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS PID_TABLE (
    SerialNumber INT NOT NULL,
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS HOLIDAYS (
    SerialNumber INT NOT NULL,
    Holiday_ID TEXT,
    Auto_Manual TEXT,
    Holiday_Value TEXT,
    Status TEXT,
    Month_Field TEXT,
    Day_Field TEXT,
    Year_Field TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS GRAPHICS (
    SerialNumber INT NOT NULL,
    Graphic_ID TEXT,
    Switch_Node TEXT,
    Graphic_Label TEXT,
    Graphic_Full_Label TEXT,
    Graphic_Picture_File TEXT,
    Graphic_Total_Point TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ALARMS (
    SerialNumber INT NOT NULL,
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS MONITORDATA (
    SerialNumber INT NOT NULL,
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =================================================================
-- ADDITIONAL T3000 FEATURE TABLES
-- =================================================================

CREATE TABLE IF NOT EXISTS ARRAYS (
    SerialNumber INT NOT NULL,
    Array_ID TEXT,
    Array_Index TEXT,
    Panel TEXT,
    Label TEXT,
    Array_Size INT,
    Status TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS CONVERSION_TABLES (
    SerialNumber INT NOT NULL,
    Table_ID TEXT,
    Table_Index TEXT,
    Panel TEXT,
    Table_Name TEXT,
    Table_Data TEXT,
    Status TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS CUSTOM_UNITS (
    SerialNumber INT NOT NULL,
    Unit_ID TEXT,
    Unit_Index TEXT,
    Panel TEXT,
    Unit_Type TEXT,
    Direct INT,
    Digital_Units_Off TEXT,
    Digital_Units_On TEXT,
    Analog_Unit_Name TEXT,
    Status TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS VARIABLE_UNITS (
    SerialNumber INT NOT NULL,
    Variable_ID TEXT,
    Variable_Index TEXT,
    Panel TEXT,
    Variable_Cus_Unite TEXT,
    Status TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS USERS (
    SerialNumber INT NOT NULL,
    User_ID TEXT,
    User_Index TEXT,
    Panel TEXT,
    Name TEXT,
    Password TEXT,
    Access_Level INT,
    Rights_Access INT,
    Default_Panel INT,
    Default_Group INT,
    Screen_Right TEXT,
    Program_Right TEXT,
    Status TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS REMOTE_POINTS (
    SerialNumber INT NOT NULL,
    Remote_ID TEXT,
    Remote_Index TEXT,
    Panel TEXT,
    Point_Number INT,
    Point_Type INT,
    Point_Panel INT,
    Sub_Panel INT,
    Network INT,
    Point_Value INT,
    Auto_Manual INT,
    Digital_Analog INT,
    Device_Online INT,
    Product_ID INT,
    Count_Field INT,
    Read_Write INT,
    Time_Remaining INT,
    Object_Instance INT,
    Status TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS EMAIL_ALARMS (
    SerialNumber INT NOT NULL,
    Email_ID TEXT,
    Panel TEXT,
    SMTP_Type INT,
    SMTP_IP TEXT,
    SMTP_Domain TEXT,
    SMTP_Port INT,
    Email_Address TEXT,
    User_Name TEXT,
    Password TEXT,
    Secure_Connection_Type INT,
    To1_Addr TEXT,
    To2_Addr TEXT,
    Error_Code INT,
    Status TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS EXTIO_DEVICES (
    SerialNumber INT NOT NULL,
    ExtIO_ID TEXT,
    ExtIO_Index TEXT,
    Panel TEXT,
    Product_ID INT,
    Port INT,
    Modbus_ID INT,
    Last_Contact_Time INT,
    Input_Start INT,
    Input_End INT,
    Output_Start INT,
    Output_End INT,
    ExtIO_SerialNumber INT,
    Status TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS TSTAT_SCHEDULES (
    SerialNumber INT NOT NULL,
    Tstat_ID TEXT,
    Tstat_Index TEXT,
    Panel TEXT,
    Schedule_ID INT,
    `Schedule` INT,
    Flag INT,
    Online_Status INT,
    Name TEXT,
    Day_Setpoint INT,
    Night_Setpoint INT,
    Awake_Setpoint INT,
    Sleep_Setpoint INT,
    Status TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS GRAPHIC_LABELS (
    SerialNumber INT NOT NULL,
    Label_ID TEXT,
    Label_Index INT,
    Panel TEXT,
    Label_Status INT,
    Screen_Index INT,
    Main_Panel INT,
    Sub_Panel INT,
    Point_Type INT,
    Point_Number INT,
    Point_X INT,
    Point_Y INT,
    Text_Color INT,
    Display_Type INT,
    Icon_Size INT,
    Icon_Place INT,
    Icon_Name_1 TEXT,
    Icon_Name_2 TEXT,
    Network INT,
    Status TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS MSV_DATA (
    SerialNumber INT NOT NULL,
    MSV_ID TEXT,
    MSV_Index INT,
    Panel TEXT,
    Status_Field INT,
    MSV_Name TEXT,
    MSV_Value INT,
    Status TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ALARM_SETTINGS (
    SerialNumber INT NOT NULL,
    Alarm_Setting_ID TEXT,
    Alarm_Setting_Index TEXT,
    Panel TEXT,
    Point_Number INT,
    Point_Type INT,
    Point_Panel INT,
    Point1_Number INT,
    Point1_Type INT,
    Point1_Panel INT,
    `Condition` INT,
    Way_Low INT,
    Low INT,
    Normal INT,
    High INT,
    Way_High INT,
    Time_Field INT,
    Message_Count INT,
    Count_Field INT,
    Status TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =================================================================
-- DEVICE SETTINGS TABLES
-- =================================================================

CREATE TABLE IF NOT EXISTS NETWORK_SETTINGS (
    SerialNumber INT PRIMARY KEY,
    IP_Address TEXT,
    Subnet TEXT,
    Gateway TEXT,
    MAC_Address TEXT,
    TCP_Type INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS COMMUNICATION_SETTINGS (
    SerialNumber INT PRIMARY KEY,
    COM0_Config INT,
    COM1_Config INT,
    COM2_Config INT,
    COM_Baudrate0 INT,
    COM_Baudrate1 INT,
    COM_Baudrate2 INT,
    UART_Parity0 INT,
    UART_Parity1 INT,
    UART_Parity2 INT,
    UART_Stopbit0 INT,
    UART_Stopbit1 INT,
    UART_Stopbit2 INT,
    Fix_COM_Config INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS PROTOCOL_SETTINGS (
    SerialNumber INT PRIMARY KEY,
    Modbus_ID INT,
    Modbus_Port INT,
    MSTP_ID INT,
    MSTP_Network_Number INT,
    Max_Master INT,
    Object_Instance INT,
    BBMD_Enable INT,
    Network_Number INT,
    Network_Number_Hi INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS TIME_SETTINGS (
    SerialNumber INT PRIMARY KEY,
    Time_Zone INT,
    Time_Zone_Summer_Daytime INT,
    Time_Update_Since_1970 INT,
    Enable_SNTP INT,
    SNTP_Server TEXT,
    Flag_Time_Sync_PC INT,
    Time_Sync_Auto_Manual INT,
    Sync_Time_Results INT,
    Start_Month INT,
    Start_Day INT,
    End_Month INT,
    End_Day INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS DYNDNS_SETTINGS (
    SerialNumber INT PRIMARY KEY,
    Enable_DynDNS INT,
    DynDNS_Provider INT,
    DynDNS_User TEXT,
    DynDNS_Pass TEXT,
    DynDNS_Domain TEXT,
    DynDNS_Update_Time INT,
    Update_DynDNS_Time TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS HARDWARE_INFO (
    SerialNumber INT PRIMARY KEY,
    Hardware_Rev INT,
    Firmware0_Rev_Main INT,
    Firmware0_Rev_Sub INT,
    Firmware1_Rev INT,
    Firmware2_Rev INT,
    Firmware3_Rev INT,
    Bootloader_Rev INT,
    Mini_Type INT,
    Panel_Type INT,
    USB_Mode INT,
    SD_Exist INT,
    Zigbee_Exist INT,
    Zigbee_PanID INT,
    Special_Flag INT,
    Max_Var INT,
    Max_In INT,
    Max_Out INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS FEATURE_FLAGS (
    SerialNumber INT PRIMARY KEY,
    User_Name_Enable INT,
    Customer_Unite_Enable INT,
    Enable_Panel_Name INT,
    LCD_Display INT,
    LCD_Display_Type INT,
    LCD_Point_Type INT,
    LCD_Point_Number INT,
    LCD_BACnet_Instance INT,
    Enable_Plug_N_Play INT,
    Refresh_Flash_Timer INT,
    Reset_Default INT,
    Debug INT,
    Webview_JSON_Flash INT,
    Write_Flash INT,
    LCD_Mode INT DEFAULT 0,
    LCD_Delay_Seconds INT DEFAULT 30,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS WIFI_SETTINGS (
    SerialNumber INT PRIMARY KEY,
    Wifi_Enable INT,
    IP_Auto_Manual INT,
    IP_Wifi_Status INT,
    Load_Default INT,
    Modbus_Port INT,
    BACnet_Port INT,
    Software_Version INT,
    Username TEXT,
    Password TEXT,
    IP_Address TEXT,
    Net_Mask TEXT,
    Gateway TEXT,
    Wifi_MAC TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS MISC_SETTINGS (
    SerialNumber INT PRIMARY KEY,
    Flag1 INT,
    Flag2 INT,
    Monitor_Analog_Block_0 INT,
    Monitor_Analog_Block_1 INT,
    Monitor_Analog_Block_2 INT,
    Monitor_Analog_Block_3 INT,
    Monitor_Analog_Block_4 INT,
    Monitor_Analog_Block_5 INT,
    Monitor_Analog_Block_6 INT,
    Monitor_Analog_Block_7 INT,
    Monitor_Analog_Block_8 INT,
    Monitor_Analog_Block_9 INT,
    Monitor_Analog_Block_10 INT,
    Monitor_Analog_Block_11 INT,
    Monitor_Digital_Block_0 INT,
    Monitor_Digital_Block_1 INT,
    Monitor_Digital_Block_2 INT,
    Monitor_Digital_Block_3 INT,
    Monitor_Digital_Block_4 INT,
    Monitor_Digital_Block_5 INT,
    Monitor_Digital_Block_6 INT,
    Monitor_Digital_Block_7 INT,
    Monitor_Digital_Block_8 INT,
    Monitor_Digital_Block_9 INT,
    Monitor_Digital_Block_10 INT,
    Monitor_Digital_Block_11 INT,
    Operation_Time_0 INT,
    Operation_Time_1 INT,
    Operation_Time_2 INT,
    Operation_Time_3 INT,
    Operation_Time_4 INT,
    Operation_Time_5 INT,
    Operation_Time_6 INT,
    Operation_Time_7 INT,
    Operation_Time_8 INT,
    Operation_Time_9 INT,
    Operation_Time_10 INT,
    Operation_Time_11 INT,
    Network_Health_Flag INT,
    COM_RX_0 INT,
    COM_RX_1 INT,
    COM_RX_2 INT,
    COM_TX_0 INT,
    COM_TX_1 INT,
    COM_TX_2 INT,
    Collision_0 INT,
    Collision_1 INT,
    Collision_2 INT,
    Packet_Error_0 INT,
    Packet_Error_1 INT,
    Packet_Error_2 INT,
    Timeout_0 INT,
    Timeout_1 INT,
    Timeout_2 INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS REMOTE_TSTAT_DB (
    SerialNumber INT NOT NULL,
    Remote_Tstat_ID TEXT,
    Remote_Index INT,
    Panel TEXT,
    Protocol INT,
    Modbus_ID INT,
    BACnet_Instance INT,
    Status TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =================================================================
-- TRENDLOG TABLES
-- =================================================================

CREATE TABLE IF NOT EXISTS TRENDLOGS (
    id INT AUTO_INCREMENT PRIMARY KEY,
    SerialNumber INT NOT NULL,
    PanelId INT NOT NULL,
    Trendlog_ID TEXT NOT NULL,
    Switch_Node TEXT,
    Trendlog_Label TEXT,
    Interval_Seconds INT,
    Buffer_Size INT,
    Data_Size_KB TEXT,
    Auto_Manual TEXT,
    Status TEXT,
    ffi_synced INT DEFAULT 0,
    last_ffi_sync TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS TRENDLOG_INPUTS (
    id INT AUTO_INCREMENT PRIMARY KEY,
    SerialNumber INT NOT NULL,
    PanelId INT NOT NULL,
    Trendlog_ID VARCHAR(64) NOT NULL,
    Point_Type VARCHAR(32) NOT NULL,
    Point_Index VARCHAR(32) NOT NULL,
    Point_Panel TEXT,
    Point_Label TEXT,
    Status TEXT,
    view_type VARCHAR(16) DEFAULT 'MAIN',
    view_number INT DEFAULT NULL,
    is_selected INT DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_trendlog_inputs (SerialNumber, PanelId, Trendlog_ID, Point_Type, Point_Index, view_type, view_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS TRENDLOG_VIEWS (
    id INT AUTO_INCREMENT PRIMARY KEY,
    SerialNumber INT NOT NULL,
    PanelId INT NOT NULL,
    Trendlog_ID VARCHAR(64) NOT NULL,
    View_Number INT NOT NULL,
    Point_Type VARCHAR(32) NOT NULL,
    Point_Index VARCHAR(32) NOT NULL,
    Point_Panel TEXT,
    Point_Label TEXT,
    is_selected INT DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_trendlog_views (SerialNumber, PanelId, Trendlog_ID, View_Number, Point_Type, Point_Index)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS TRENDLOG_DATA_OLD (
    SerialNumber INT NOT NULL,
    PanelId INT NOT NULL,
    PointId TEXT NOT NULL,
    PointIndex INT NOT NULL,
    PointType TEXT NOT NULL,
    Value TEXT NOT NULL,
    LoggingTime TEXT NOT NULL,
    LoggingTime_Fmt TEXT NOT NULL,
    Digital_Analog TEXT,
    Range_Field TEXT,
    Units TEXT,
    DataSource TEXT DEFAULT 'REALTIME',
    SyncInterval INT DEFAULT 30,
    CreatedBy TEXT DEFAULT 'FRONTEND'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS TRENDLOG_DATA (
    id INT AUTO_INCREMENT PRIMARY KEY,
    SerialNumber INT NOT NULL,
    PanelId INT NOT NULL,
    PointId VARCHAR(64) NOT NULL,
    PointIndex INT NOT NULL,
    PointType VARCHAR(32) NOT NULL,
    Digital_Analog TEXT,
    Range_Field TEXT,
    Units TEXT,
    Description TEXT,
    IsActive TINYINT(1) DEFAULT 1,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_trendlog_data (SerialNumber, PanelId, PointId, PointIndex, PointType)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS TRENDLOG_DATA_SYNC_METADATA (
    id INT AUTO_INCREMENT PRIMARY KEY,
    SyncTime_Fmt TEXT NOT NULL,
    MessageType TEXT NOT NULL,
    PanelId INT,
    SerialNumber INT,
    RecordsInserted INT DEFAULT 0,
    SyncInterval INT NOT NULL,
    Success INT DEFAULT 1,
    ErrorMessage TEXT,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS TRENDLOG_DATA_DETAIL (
    ParentId INT NOT NULL,
    Value TEXT NOT NULL,
    LoggingTime_Fmt TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =================================================================
-- DATABASE MANAGEMENT TABLES
-- =================================================================

CREATE TABLE IF NOT EXISTS database_partition_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    strategy VARCHAR(32) NOT NULL DEFAULT 'monthly',
    custom_days INT,
    custom_months INT,
    retention_value INT NOT NULL DEFAULT 30,
    retention_unit VARCHAR(16) NOT NULL DEFAULT 'days',
    auto_cleanup_enabled TINYINT(1) NOT NULL DEFAULT 1,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS database_files (
    id INT AUTO_INCREMENT PRIMARY KEY,
    file_name VARCHAR(255) NOT NULL UNIQUE,
    file_path TEXT NOT NULL,
    file_size_bytes INT NOT NULL DEFAULT 0,
    record_count INT NOT NULL DEFAULT 0,
    partition_identifier TEXT,
    start_date DATE,
    end_date DATE,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    is_archived TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_accessed_at DATETIME
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS APPLICATION_CONFIG (
    id INT AUTO_INCREMENT PRIMARY KEY,
    config_key VARCHAR(255) NOT NULL,
    config_value TEXT NOT NULL,
    config_type VARCHAR(16) NOT NULL DEFAULT 'json',
    description TEXT,
    user_id INT,
    device_serial VARCHAR(64),
    panel_id INT,
    is_system TINYINT(1) NOT NULL DEFAULT 0,
    version TEXT,
    size_bytes INT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_app_config (config_key, user_id, device_serial, panel_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS APPLICATION_CONFIG_HISTORY (
    id INT AUTO_INCREMENT PRIMARY KEY,
    config_key VARCHAR(255) NOT NULL,
    old_value TEXT,
    new_value TEXT NOT NULL,
    changed_by TEXT,
    change_reason TEXT,
    changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS database_partitions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    partition_name VARCHAR(255) NOT NULL UNIQUE,
    partition_identifier TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    table_prefix TEXT NOT NULL,
    record_count INT NOT NULL DEFAULT 0,
    file_size_bytes INT NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    is_current TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS DATA_SYNC_METADATA (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sync_time INT NOT NULL,
    sync_time_fmt TEXT NOT NULL,
    data_type VARCHAR(64) NOT NULL,
    serial_number VARCHAR(64) NOT NULL,
    panel_id INT,
    records_synced INT DEFAULT 0,
    sync_method VARCHAR(32) NOT NULL,
    success INT NOT NULL DEFAULT 1,
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =================================================================
-- INDEXES
-- =================================================================

CREATE INDEX IDX_DEVICES_SERIAL ON DEVICES(SerialNumber);
CREATE INDEX IDX_INPUTS_SERIAL ON INPUTS(SerialNumber);
CREATE INDEX IDX_OUTPUTS_SERIAL ON OUTPUTS(SerialNumber);
CREATE INDEX IDX_VARIABLES_SERIAL ON VARIABLES(SerialNumber);
CREATE INDEX IDX_PROGRAMS_SERIAL ON PROGRAMS(SerialNumber);
CREATE INDEX IDX_SCHEDULES_SERIAL ON SCHEDULES(SerialNumber);
CREATE INDEX IDX_PID_TABLE_SERIAL ON PID_TABLE(SerialNumber);
CREATE INDEX IDX_HOLIDAYS_SERIAL ON HOLIDAYS(SerialNumber);
CREATE INDEX IDX_GRAPHICS_SERIAL ON GRAPHICS(SerialNumber);
CREATE INDEX IDX_ALARMS_SERIAL ON ALARMS(SerialNumber);
CREATE INDEX IDX_MONITORDATA_SERIAL ON MONITORDATA(SerialNumber);
CREATE INDEX IDX_TRENDLOGS_SERIAL ON TRENDLOGS(SerialNumber);
CREATE INDEX IDX_TRENDLOGS_ID ON TRENDLOGS(Trendlog_ID(64));
CREATE INDEX IDX_TRENDLOG_INPUTS_ID ON TRENDLOG_INPUTS(Trendlog_ID);
CREATE INDEX IDX_TRENDLOG_INPUTS_VIEW ON TRENDLOG_INPUTS(Trendlog_ID, view_type, view_number);
CREATE INDEX IDX_TRENDLOG_VIEWS_ID ON TRENDLOG_VIEWS(Trendlog_ID);
CREATE INDEX IDX_TRENDLOG_VIEWS_UNIQUE ON TRENDLOG_VIEWS(Trendlog_ID, View_Number);

-- Legacy TRENDLOG_DATA_OLD indexes
CREATE INDEX IDX_TRENDLOG_DATA_OLD_SOURCE_TIME ON TRENDLOG_DATA_OLD(SerialNumber, PanelId, DataSource(16), LoggingTime_Fmt(32));
CREATE INDEX IDX_TRENDLOG_DATA_OLD_RECENT_QUERY ON TRENDLOG_DATA_OLD(SerialNumber, PanelId, LoggingTime_Fmt(32));
CREATE INDEX IDX_TRENDLOG_DATA_OLD_SERIAL ON TRENDLOG_DATA_OLD(SerialNumber);
CREATE INDEX IDX_TRENDLOG_DATA_OLD_PANEL ON TRENDLOG_DATA_OLD(PanelId);
CREATE INDEX IDX_TRENDLOG_DATA_OLD_POINT_ID ON TRENDLOG_DATA_OLD(PointId(64));
CREATE INDEX IDX_TRENDLOG_DATA_OLD_POINT_INDEX ON TRENDLOG_DATA_OLD(PointIndex);
CREATE INDEX IDX_TRENDLOG_DATA_OLD_TYPE ON TRENDLOG_DATA_OLD(PointType(32));
CREATE INDEX IDX_TRENDLOG_DATA_OLD_TIME ON TRENDLOG_DATA_OLD(LoggingTime(32));
CREATE INDEX IDX_TRENDLOG_DATA_OLD_TIME_FMT ON TRENDLOG_DATA_OLD(LoggingTime_Fmt(32));

-- TRENDLOG_DATA (Parent) indexes
CREATE INDEX IDX_TRENDLOG_DATA_LOOKUP ON TRENDLOG_DATA(SerialNumber, PanelId, PointId);
CREATE INDEX IDX_TRENDLOG_DATA_SERIAL ON TRENDLOG_DATA(SerialNumber);
CREATE INDEX IDX_TRENDLOG_DATA_TYPE ON TRENDLOG_DATA(PointType);
CREATE INDEX IDX_TRENDLOG_DATA_ACTIVE ON TRENDLOG_DATA(IsActive);
CREATE INDEX IDX_TRENDLOG_DATA_HISTORY_FILTER ON TRENDLOG_DATA(SerialNumber, PanelId, PointType, PointIndex);
CREATE INDEX IDX_TRENDLOG_DATA_SPECIFIC_POINTS ON TRENDLOG_DATA(PointId, PointType, PointIndex, PanelId);

-- TRENDLOG_DATA_DETAIL (Child) indexes
CREATE INDEX IDX_TRENDLOG_DETAIL_PARENT ON TRENDLOG_DATA_DETAIL(ParentId);
CREATE INDEX IDX_TRENDLOG_DETAIL_TIME_FMT ON TRENDLOG_DATA_DETAIL(LoggingTime_Fmt(32));
CREATE INDEX IDX_TRENDLOG_DETAIL_PARENT_TIME ON TRENDLOG_DATA_DETAIL(ParentId, LoggingTime_Fmt(32));
CREATE INDEX IDX_TRENDLOG_DETAIL_TIME_RANGE ON TRENDLOG_DATA_DETAIL(LoggingTime_Fmt(32), ParentId);

-- TRENDLOG_DATA_SYNC_METADATA indexes
CREATE INDEX IDX_SYNC_META_TIME ON TRENDLOG_DATA_SYNC_METADATA(SyncTime_Fmt(32));
CREATE INDEX IDX_SYNC_META_TYPE ON TRENDLOG_DATA_SYNC_METADATA(MessageType(32));
CREATE INDEX IDX_SYNC_META_DEVICE ON TRENDLOG_DATA_SYNC_METADATA(PanelId, SerialNumber);
CREATE INDEX IDX_SYNC_META_SUCCESS ON TRENDLOG_DATA_SYNC_METADATA(Success);

-- Feature table indexes
CREATE INDEX IDX_ARRAYS_SERIAL ON ARRAYS(SerialNumber);
CREATE INDEX IDX_ARRAYS_ID ON ARRAYS(Array_ID(64));
CREATE INDEX IDX_CONVERSION_TABLES_SERIAL ON CONVERSION_TABLES(SerialNumber);
CREATE INDEX IDX_CONVERSION_TABLES_ID ON CONVERSION_TABLES(Table_ID(64));
CREATE INDEX IDX_CUSTOM_UNITS_SERIAL ON CUSTOM_UNITS(SerialNumber);
CREATE INDEX IDX_CUSTOM_UNITS_ID ON CUSTOM_UNITS(Unit_ID(64));
CREATE INDEX IDX_CUSTOM_UNITS_TYPE ON CUSTOM_UNITS(Unit_Type(32));
CREATE INDEX IDX_VARIABLE_UNITS_SERIAL ON VARIABLE_UNITS(SerialNumber);
CREATE INDEX IDX_VARIABLE_UNITS_ID ON VARIABLE_UNITS(Variable_ID(64));
CREATE INDEX IDX_USERS_SERIAL ON USERS(SerialNumber);
CREATE INDEX IDX_USERS_ID ON USERS(User_ID(64));
CREATE INDEX IDX_USERS_NAME ON USERS(Name(64));
CREATE INDEX IDX_USERS_ACCESS_LEVEL ON USERS(Access_Level);
CREATE INDEX IDX_REMOTE_POINTS_SERIAL ON REMOTE_POINTS(SerialNumber);
CREATE INDEX IDX_REMOTE_POINTS_ID ON REMOTE_POINTS(Remote_ID(64));
CREATE INDEX IDX_REMOTE_POINTS_OBJECT_INSTANCE ON REMOTE_POINTS(Object_Instance);
CREATE INDEX IDX_EMAIL_ALARMS_SERIAL ON EMAIL_ALARMS(SerialNumber);
CREATE INDEX IDX_EMAIL_ALARMS_ID ON EMAIL_ALARMS(Email_ID(64));
CREATE INDEX IDX_EXTIO_DEVICES_SERIAL ON EXTIO_DEVICES(SerialNumber);
CREATE INDEX IDX_EXTIO_DEVICES_ID ON EXTIO_DEVICES(ExtIO_ID(64));
CREATE INDEX IDX_EXTIO_DEVICES_EXTIO_SERIAL ON EXTIO_DEVICES(ExtIO_SerialNumber);
CREATE INDEX IDX_TSTAT_SCHEDULES_SERIAL ON TSTAT_SCHEDULES(SerialNumber);
CREATE INDEX IDX_TSTAT_SCHEDULES_ID ON TSTAT_SCHEDULES(Tstat_ID(64));
CREATE INDEX IDX_GRAPHIC_LABELS_SERIAL ON GRAPHIC_LABELS(SerialNumber);
CREATE INDEX IDX_GRAPHIC_LABELS_ID ON GRAPHIC_LABELS(Label_ID(64));
CREATE INDEX IDX_GRAPHIC_LABELS_SCREEN ON GRAPHIC_LABELS(Screen_Index);
CREATE INDEX IDX_MSV_DATA_SERIAL ON MSV_DATA(SerialNumber);
CREATE INDEX IDX_MSV_DATA_ID ON MSV_DATA(MSV_ID(64));
CREATE INDEX IDX_ALARM_SETTINGS_SERIAL ON ALARM_SETTINGS(SerialNumber);
CREATE INDEX IDX_ALARM_SETTINGS_ID ON ALARM_SETTINGS(Alarm_Setting_ID(64));
CREATE INDEX IDX_NETWORK_SETTINGS_SERIAL ON NETWORK_SETTINGS(SerialNumber);
CREATE INDEX IDX_COMMUNICATION_SETTINGS_SERIAL ON COMMUNICATION_SETTINGS(SerialNumber);
CREATE INDEX IDX_PROTOCOL_SETTINGS_SERIAL ON PROTOCOL_SETTINGS(SerialNumber);
CREATE INDEX IDX_TIME_SETTINGS_SERIAL ON TIME_SETTINGS(SerialNumber);
CREATE INDEX IDX_DYNDNS_SETTINGS_SERIAL ON DYNDNS_SETTINGS(SerialNumber);
CREATE INDEX IDX_HARDWARE_INFO_SERIAL ON HARDWARE_INFO(SerialNumber);
CREATE INDEX IDX_FEATURE_FLAGS_SERIAL ON FEATURE_FLAGS(SerialNumber);
CREATE INDEX IDX_WIFI_SETTINGS_SERIAL ON WIFI_SETTINGS(SerialNumber);
CREATE INDEX IDX_MISC_SETTINGS_SERIAL ON MISC_SETTINGS(SerialNumber);
CREATE INDEX IDX_REMOTE_TSTAT_DB_SERIAL ON REMOTE_TSTAT_DB(SerialNumber);
CREATE INDEX IDX_REMOTE_TSTAT_DB_ID ON REMOTE_TSTAT_DB(Remote_Tstat_ID(64));

-- Database management indexes
CREATE INDEX idx_database_partition_config_strategy ON database_partition_config(strategy);
CREATE INDEX idx_database_partition_config_active ON database_partition_config(is_active);
CREATE INDEX idx_database_partition_config_created ON database_partition_config(created_at);
CREATE INDEX idx_database_files_name ON database_files(file_name);
CREATE INDEX idx_database_files_active ON database_files(is_active);
CREATE INDEX idx_database_files_archived ON database_files(is_archived);
CREATE INDEX idx_database_files_partition ON database_files(partition_identifier(64));
CREATE INDEX idx_database_files_created ON database_files(created_at);
CREATE INDEX idx_database_files_accessed ON database_files(last_accessed_at);
CREATE INDEX idx_application_config_key ON APPLICATION_CONFIG(config_key);
CREATE INDEX idx_application_config_type ON APPLICATION_CONFIG(config_type);
CREATE INDEX idx_application_config_system ON APPLICATION_CONFIG(is_system);
CREATE INDEX idx_application_config_user ON APPLICATION_CONFIG(user_id);
CREATE INDEX idx_application_config_device ON APPLICATION_CONFIG(device_serial);
CREATE INDEX idx_application_config_size ON APPLICATION_CONFIG(size_bytes);
CREATE INDEX idx_application_config_history_key ON APPLICATION_CONFIG_HISTORY(config_key);
CREATE INDEX idx_application_config_history_changed_at ON APPLICATION_CONFIG_HISTORY(changed_at);
CREATE INDEX idx_application_config_history_changed_by ON APPLICATION_CONFIG_HISTORY(changed_by(64));
CREATE INDEX idx_database_partitions_name ON database_partitions(partition_name);
CREATE INDEX idx_database_partitions_identifier ON database_partitions(partition_identifier(64));
CREATE INDEX idx_database_partitions_active ON database_partitions(is_active);
CREATE INDEX idx_database_partitions_current ON database_partitions(is_current);
CREATE INDEX idx_database_partitions_dates ON database_partitions(start_date, end_date);
CREATE INDEX idx_data_sync_metadata_lookup ON DATA_SYNC_METADATA(serial_number, data_type, sync_time);
CREATE INDEX idx_data_sync_metadata_created ON DATA_SYNC_METADATA(created_at);
CREATE INDEX idx_data_sync_metadata_method ON DATA_SYNC_METADATA(sync_method, created_at);

-- =================================================================
-- SEED DATA
-- =================================================================

INSERT IGNORE INTO database_partition_config (id, strategy, retention_value, retention_unit, auto_cleanup_enabled)
VALUES (1, 'monthly', 30, 'days', 1);

INSERT IGNORE INTO APPLICATION_CONFIG (config_key, config_value, config_type, description, is_system)
VALUES
('database.version', '1.0', 'string', 'Database schema version', 1),
('database.need_update', '1', 'boolean', 'Flag indicating if database needs update', 1),
('database.update_status', '0', 'boolean', 'Update completion status', 1),
('database.max_file_size', '2048', 'number', 'Maximum database file size in MB', 1),
('database.backup_enabled', 'true', 'boolean', 'Enable automatic database backups', 1),
('database.compression_enabled', 'false', 'boolean', 'Enable database compression', 1),
('database.vacuum_interval', '7', 'number', 'Database vacuum interval in days', 1),
('ui.theme', 'light', 'string', 'Application theme preference', 0),
('ui.language', 'en', 'string', 'Application language', 0),
('ffi.sync_interval_secs', '900', 'number', 'FFI Sync Service interval in seconds', 0),
('rediscover.interval_secs', '3600', 'number', 'Rediscover Service interval in seconds', 0);

INSERT IGNORE INTO APPLICATION_CONFIG (config_key, config_value, config_type, description, is_system)
VALUES
('ui.refresh.inputs',    '{"autoRefreshEnabled":false,"refreshIntervalSecs":30}', 'json', 'UI auto-refresh settings for Inputs page', 0),
('ui.refresh.outputs',   '{"autoRefreshEnabled":false,"refreshIntervalSecs":30}', 'json', 'UI auto-refresh settings for Outputs page', 0),
('ui.refresh.variables', '{"autoRefreshEnabled":false,"refreshIntervalSecs":30}', 'json', 'UI auto-refresh settings for Variables page', 0),
('ui.refresh.programs',  '{"autoRefreshEnabled":false,"refreshIntervalSecs":30}', 'json', 'UI auto-refresh settings for Programs page', 0),
('ui.refresh.schedules', '{"autoRefreshEnabled":false,"refreshIntervalSecs":30}', 'json', 'UI auto-refresh settings for Schedules page', 0),
('ui.refresh.holidays',  '{"autoRefreshEnabled":false,"refreshIntervalSecs":30}', 'json', 'UI auto-refresh settings for Holidays page', 0);

-- ============================================================================
-- SYSTEM_LOGS - Application event / error / audit log table
-- ============================================================================
CREATE TABLE IF NOT EXISTS SYSTEM_LOGS (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    `timestamp`     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `level`         VARCHAR(20) NOT NULL DEFAULT 'info',
    source          VARCHAR(255) DEFAULT '',
    message         TEXT NOT NULL,
    hostname        VARCHAR(255) DEFAULT '',
    role            VARCHAR(20) DEFAULT '',
    details         TEXT,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);
