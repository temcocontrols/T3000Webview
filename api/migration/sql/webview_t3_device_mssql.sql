-- ==========================================================================
-- T3000 WebView Device Database Schema — Microsoft SQL Server (T-SQL)
-- Translated from webview_t3_device_schema.sql (SQLite)
-- Date: 2026-06-04 (updated — sync with SQLite schema at 54 tables)
-- Purpose: Create all 54 device + logging tables on a centralized SQL Server instance.
--          All tables are included for schema parity, even those typically written
--          only to local SQLite (T3_FLOW*, T3_APP_LOG, DB_BACKEND_CONFIG).
-- Compatible with: SQL Server 2012+
-- ==========================================================================

-- =================================================================
-- CORE T3000 TABLES
-- =================================================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'DEVICES')
CREATE TABLE DEVICES (
    SerialNumber INT PRIMARY KEY,
    PanelId INT,
    MainBuilding_Name NVARCHAR(255),
    Building_Name NVARCHAR(255),
    Floor_Name NVARCHAR(255),
    Room_Name NVARCHAR(255),
    Panel_Number INT,
    Network_Number INT,
    Product_Name NVARCHAR(255),
    Product_Class_ID INT,
    Product_ID INT,
    Screen_Name NVARCHAR(255),
    Bautrate NVARCHAR(255),
    Address NVARCHAR(255),
    Register NVARCHAR(255),
    [Function] NVARCHAR(255),
    Description NVARCHAR(MAX),
    High_Units NVARCHAR(255),
    Low_Units NVARCHAR(255),
    Update_Field NVARCHAR(255),
    Status NVARCHAR(255),
    Range_Field NVARCHAR(255),
    Calibration NVARCHAR(255),
    ip_address NVARCHAR(64),
    port INT,
    bacnet_mstp_mac_id INT,
    modbus_address INT,
    pc_ip_address NVARCHAR(64),
    modbus_port INT,
    bacnet_ip_port INT,
    show_label_name NVARCHAR(255),
    connection_type NVARCHAR(64),
    is_online INT DEFAULT 0,
    last_checked NVARCHAR(64)
);

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'INPUTS')
CREATE TABLE INPUTS (
    SerialNumber INT NOT NULL,
    InputId NVARCHAR(64),
    Input_Index NVARCHAR(64),
    Panel NVARCHAR(255),
    Full_Label NVARCHAR(MAX),
    Auto_Manual NVARCHAR(64),
    fValue NVARCHAR(255),
    Units NVARCHAR(64),
    Range_Field NVARCHAR(255),
    Calibration NVARCHAR(255),
    Sign NVARCHAR(64),
    Filter_Field NVARCHAR(255),
    Status NVARCHAR(64),
    Digital_Analog NVARCHAR(64),
    Label NVARCHAR(255),
    Type_Field NVARCHAR(255),
    Calibration_H NVARCHAR(64),
    Calibration_L NVARCHAR(64),
    Calibration_Sign NVARCHAR(64),
    Control NVARCHAR(64)
);

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'OUTPUTS')
CREATE TABLE OUTPUTS (
    SerialNumber INT NOT NULL,
    OutputId NVARCHAR(64),
    Output_Index NVARCHAR(64),
    Panel NVARCHAR(255),
    Full_Label NVARCHAR(MAX),
    Auto_Manual NVARCHAR(64),
    fValue NVARCHAR(255),
    Units NVARCHAR(64),
    Range_Field NVARCHAR(255),
    Calibration NVARCHAR(255),
    Sign NVARCHAR(64),
    Filter_Field NVARCHAR(255),
    Status NVARCHAR(64),
    Digital_Analog NVARCHAR(64),
    Label NVARCHAR(255),
    Type_Field NVARCHAR(255),
    Calibration_H NVARCHAR(64),
    Calibration_L NVARCHAR(64),
    Calibration_Sign NVARCHAR(64),
    Control NVARCHAR(64)
);

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'VARIABLES')
CREATE TABLE VARIABLES (
    SerialNumber INT NOT NULL,
    VariableId NVARCHAR(64),
    Variable_Index NVARCHAR(64),
    Panel NVARCHAR(255),
    Full_Label NVARCHAR(MAX),
    Auto_Manual NVARCHAR(64),
    fValue NVARCHAR(255),
    Units NVARCHAR(64),
    Range_Field NVARCHAR(255),
    Calibration NVARCHAR(255),
    Sign NVARCHAR(64),
    Filter_Field NVARCHAR(255),
    Status NVARCHAR(64),
    Digital_Analog NVARCHAR(64),
    Label NVARCHAR(255),
    Type_Field NVARCHAR(255),
    Calibration_H NVARCHAR(64),
    Calibration_L NVARCHAR(64),
    Calibration_Sign NVARCHAR(64),
    Control NVARCHAR(64)
);

-- HAYSTACK_TAGS — standard Haystack v4 semantic tagging (replaces old HAYSTACK_ENTITY)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'HAYSTACK_TAGS')
CREATE TABLE HAYSTACK_TAGS (
    tag_name   NVARCHAR(255) PRIMARY KEY,
    doc        NVARCHAR(MAX),
    category   NVARCHAR(64) NOT NULL DEFAULT 'custom',
    deprecated INT NOT NULL DEFAULT 0,
    source     NVARCHAR(64) DEFAULT 'user'
);

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'HAYSTACK_TAG_RELATIONS')
CREATE TABLE HAYSTACK_TAG_RELATIONS (
    tag_name   NVARCHAR(255) NOT NULL,
    parent_tag NVARCHAR(255) NOT NULL,
    PRIMARY KEY (tag_name, parent_tag)
);

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'HAYSTACK_POINT_TAGS')
CREATE TABLE HAYSTACK_POINT_TAGS (
    serial_number INT NOT NULL,
    point_type    NVARCHAR(32) NOT NULL,
    point_index   NVARCHAR(64) NOT NULL,
    point_id      NVARCHAR(255) NOT NULL,
    tag_name      NVARCHAR(255) NOT NULL,
    PRIMARY KEY (serial_number, point_type, point_index, tag_name)
);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_hpt_serial' AND object_id = OBJECT_ID('HAYSTACK_POINT_TAGS'))
CREATE INDEX idx_hpt_serial ON HAYSTACK_POINT_TAGS (serial_number);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_hpt_tag' AND object_id = OBJECT_ID('HAYSTACK_POINT_TAGS'))
CREATE INDEX idx_hpt_tag ON HAYSTACK_POINT_TAGS (tag_name);

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PROGRAMS')
CREATE TABLE PROGRAMS (
    SerialNumber INT NOT NULL,
    Program_ID NVARCHAR(64),
    Switch_Node NVARCHAR(255),
    Program_Label NVARCHAR(255),
    Program_List NVARCHAR(MAX),
    Program_Size NVARCHAR(64),
    Program_Pointer NVARCHAR(64),
    Program_Status NVARCHAR(64),
    Auto_Manual NVARCHAR(64)
);

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SCHEDULES')
CREATE TABLE SCHEDULES (
    SerialNumber INT NOT NULL,
    Schedule_ID NVARCHAR(64),
    Auto_Manual NVARCHAR(64),
    Output_Field NVARCHAR(255),
    Variable_Field NVARCHAR(255),
    Holiday1 NVARCHAR(255),
    Status1 NVARCHAR(64),
    Holiday2 NVARCHAR(255),
    Status2 NVARCHAR(64),
    Interval_Field NVARCHAR(255),
    Schedule_Time NVARCHAR(MAX),
    Monday_Time NVARCHAR(MAX),
    Tuesday_Time NVARCHAR(MAX),
    Wednesday_Time NVARCHAR(MAX),
    Thursday_Time NVARCHAR(MAX),
    Friday_Time NVARCHAR(MAX)
);

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PID_TABLE')
CREATE TABLE PID_TABLE (
    SerialNumber INT NOT NULL,
    Loop_Field NVARCHAR(255),
    Switch_Node NVARCHAR(255),
    Input_Field NVARCHAR(255),
    Input_Value NVARCHAR(255),
    Auto_Manual NVARCHAR(64),
    Output_Field NVARCHAR(255),
    Output_Value NVARCHAR(255),
    Set_Value NVARCHAR(255),
    Units NVARCHAR(64),
    Action_Field NVARCHAR(255),
    Proportional NVARCHAR(255),
    Reset_Field NVARCHAR(255),
    Rate NVARCHAR(255),
    Bias NVARCHAR(255),
    Status NVARCHAR(64),
    Type_Field NVARCHAR(255),
    Setpoint_High NVARCHAR(255),
    Setpoint_Low NVARCHAR(255),
    Units_State NVARCHAR(255),
    Variable_State NVARCHAR(255)
);

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'HOLIDAYS')
CREATE TABLE HOLIDAYS (
    SerialNumber INT NOT NULL,
    Holiday_ID NVARCHAR(64),
    Auto_Manual NVARCHAR(64),
    Holiday_Value NVARCHAR(255),
    Status NVARCHAR(64),
    Month_Field NVARCHAR(64),
    Day_Field NVARCHAR(64),
    Year_Field NVARCHAR(64)
);

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'GRAPHICS')
CREATE TABLE GRAPHICS (
    SerialNumber INT NOT NULL,
    Graphic_ID NVARCHAR(64),
    Switch_Node NVARCHAR(255),
    Graphic_Label NVARCHAR(255),
    Graphic_Full_Label NVARCHAR(MAX),
    Graphic_Picture_File NVARCHAR(MAX),
    Graphic_Total_Point NVARCHAR(255)
);

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ALARMS')
CREATE TABLE ALARMS (
    SerialNumber INT NOT NULL,
    Alarm_ID NVARCHAR(64),
    Panel NVARCHAR(255),
    [Message] NVARCHAR(MAX),
    Status NVARCHAR(64),
    [Priority] NVARCHAR(64),
    NotificationID NVARCHAR(255),
    AlarmState NVARCHAR(64),
    AlarmType NVARCHAR(64),
    Source NVARCHAR(255),
    Description NVARCHAR(MAX),
    Acknowledged NVARCHAR(64),
    Action_Field NVARCHAR(255),
    [TimeStamp] NVARCHAR(64),
    LowLimit NVARCHAR(255),
    HighLimit NVARCHAR(255)
);

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'MONITORDATA')
CREATE TABLE MONITORDATA (
    SerialNumber INT NOT NULL,
    Monitor_ID NVARCHAR(64),
    Switch_Node NVARCHAR(255),
    Monitor_Label NVARCHAR(255),
    Monitor_Value NVARCHAR(255),
    Auto_Manual NVARCHAR(64),
    Status NVARCHAR(64),
    Units NVARCHAR(64),
    Monitor_Type NVARCHAR(64),
    [TimeStamp] NVARCHAR(64),
    Range_Field NVARCHAR(255),
    Calibration NVARCHAR(255)
);

-- =================================================================
-- ADDITIONAL T3000 FEATURE TABLES
-- =================================================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ARRAYS')
CREATE TABLE ARRAYS (
    SerialNumber INT NOT NULL,
    Array_ID NVARCHAR(64),
    Array_Index NVARCHAR(64),
    Panel NVARCHAR(255),
    Label NVARCHAR(255),
    Array_Size INT,
    Status NVARCHAR(64)
);

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'CONVERSION_TABLES')
CREATE TABLE CONVERSION_TABLES (
    SerialNumber INT NOT NULL,
    Table_ID NVARCHAR(64),
    Table_Index NVARCHAR(64),
    Panel NVARCHAR(255),
    Table_Name NVARCHAR(255),
    Table_Data NVARCHAR(MAX),
    Status NVARCHAR(64)
);

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'CUSTOM_UNITS')
CREATE TABLE CUSTOM_UNITS (
    SerialNumber INT NOT NULL,
    Unit_ID NVARCHAR(64),
    Unit_Index NVARCHAR(64),
    Panel NVARCHAR(255),
    Unit_Type NVARCHAR(64),
    Direct INT,
    Digital_Units_Off NVARCHAR(255),
    Digital_Units_On NVARCHAR(255),
    Analog_Unit_Name NVARCHAR(255),
    Status NVARCHAR(64)
);

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'VARIABLE_UNITS')
CREATE TABLE VARIABLE_UNITS (
    SerialNumber INT NOT NULL,
    Variable_ID NVARCHAR(64),
    Variable_Index NVARCHAR(64),
    Panel NVARCHAR(255),
    Variable_Cus_Unite NVARCHAR(255),
    Status NVARCHAR(64)
);

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'USERS')
CREATE TABLE USERS (
    SerialNumber INT NOT NULL,
    User_ID NVARCHAR(64),
    User_Index NVARCHAR(64),
    Panel NVARCHAR(255),
    Name NVARCHAR(255),
    Password NVARCHAR(255),
    Access_Level INT,
    Rights_Access INT,
    Default_Panel INT,
    Default_Group INT,
    Screen_Right NVARCHAR(255),
    Program_Right NVARCHAR(255),
    Status NVARCHAR(64)
);

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'REMOTE_POINTS')
CREATE TABLE REMOTE_POINTS (
    SerialNumber INT NOT NULL,
    Remote_ID NVARCHAR(64),
    Remote_Index NVARCHAR(64),
    Panel NVARCHAR(255),
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
    Status NVARCHAR(64)
);

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'EMAIL_ALARMS')
CREATE TABLE EMAIL_ALARMS (
    SerialNumber INT NOT NULL,
    Email_ID NVARCHAR(64),
    Panel NVARCHAR(255),
    SMTP_Type INT,
    SMTP_IP NVARCHAR(64),
    SMTP_Domain NVARCHAR(255),
    SMTP_Port INT,
    Email_Address NVARCHAR(255),
    User_Name NVARCHAR(255),
    Password NVARCHAR(255),
    Secure_Connection_Type INT,
    To1_Addr NVARCHAR(255),
    To2_Addr NVARCHAR(255),
    Error_Code INT,
    Status NVARCHAR(64)
);

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'EXTIO_DEVICES')
CREATE TABLE EXTIO_DEVICES (
    SerialNumber INT NOT NULL,
    ExtIO_ID NVARCHAR(64),
    ExtIO_Index NVARCHAR(64),
    Panel NVARCHAR(255),
    Product_ID INT,
    Port INT,
    Modbus_ID INT,
    Last_Contact_Time INT,
    Input_Start INT,
    Input_End INT,
    Output_Start INT,
    Output_End INT,
    ExtIO_SerialNumber INT,
    Status NVARCHAR(64)
);

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'TSTAT_SCHEDULES')
CREATE TABLE TSTAT_SCHEDULES (
    SerialNumber INT NOT NULL,
    Tstat_ID NVARCHAR(64),
    Tstat_Index NVARCHAR(64),
    Panel NVARCHAR(255),
    Schedule_ID INT,
    Schedule INT,
    Flag INT,
    Online_Status INT,
    Name NVARCHAR(255),
    Day_Setpoint INT,
    Night_Setpoint INT,
    Awake_Setpoint INT,
    Sleep_Setpoint INT,
    Status NVARCHAR(64)
);

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'GRAPHIC_LABELS')
CREATE TABLE GRAPHIC_LABELS (
    SerialNumber INT NOT NULL,
    Label_ID NVARCHAR(64),
    Label_Index INT,
    Panel NVARCHAR(255),
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
    Icon_Name_1 NVARCHAR(255),
    Icon_Name_2 NVARCHAR(255),
    Network INT,
    Status NVARCHAR(64)
);

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'MSV_DATA')
CREATE TABLE MSV_DATA (
    SerialNumber INT NOT NULL,
    MSV_ID NVARCHAR(64),
    MSV_Index INT,
    Panel NVARCHAR(255),
    Status_Field INT,
    MSV_Name NVARCHAR(255),
    MSV_Value INT,
    Status NVARCHAR(64)
);

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ALARM_SETTINGS')
CREATE TABLE ALARM_SETTINGS (
    SerialNumber INT NOT NULL,
    Alarm_Setting_ID NVARCHAR(64),
    Alarm_Setting_Index NVARCHAR(64),
    Panel NVARCHAR(255),
    Point_Number INT,
    Point_Type INT,
    Point_Panel INT,
    Point1_Number INT,
    Point1_Type INT,
    Point1_Panel INT,
    [Condition] INT,
    Way_Low INT,
    Low INT,
    Normal INT,
    High INT,
    Way_High INT,
    Time_Field INT,
    Message_Count INT,
    Count_Field INT,
    Status NVARCHAR(64)
);

-- =================================================================
-- DEVICE SETTINGS TABLES
-- =================================================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'NETWORK_SETTINGS')
CREATE TABLE NETWORK_SETTINGS (
    SerialNumber INT PRIMARY KEY,
    IP_Address NVARCHAR(64),
    Subnet NVARCHAR(64),
    Gateway NVARCHAR(64),
    MAC_Address NVARCHAR(64),
    TCP_Type INT,
    created_at DATETIME2 DEFAULT GETUTCDATE(),
    updated_at DATETIME2 DEFAULT GETUTCDATE()
);

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'COMMUNICATION_SETTINGS')
CREATE TABLE COMMUNICATION_SETTINGS (
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
    created_at DATETIME2 DEFAULT GETUTCDATE(),
    updated_at DATETIME2 DEFAULT GETUTCDATE()
);

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PROTOCOL_SETTINGS')
CREATE TABLE PROTOCOL_SETTINGS (
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
    created_at DATETIME2 DEFAULT GETUTCDATE(),
    updated_at DATETIME2 DEFAULT GETUTCDATE()
);

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'TIME_SETTINGS')
CREATE TABLE TIME_SETTINGS (
    SerialNumber INT PRIMARY KEY,
    Time_Zone INT,
    Time_Zone_Summer_Daytime INT,
    Time_Update_Since_1970 INT,
    Enable_SNTP INT,
    SNTP_Server NVARCHAR(255),
    Flag_Time_Sync_PC INT,
    Time_Sync_Auto_Manual INT,
    Sync_Time_Results INT,
    Start_Month INT,
    Start_Day INT,
    End_Month INT,
    End_Day INT,
    created_at DATETIME2 DEFAULT GETUTCDATE(),
    updated_at DATETIME2 DEFAULT GETUTCDATE()
);

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'DYNDNS_SETTINGS')
CREATE TABLE DYNDNS_SETTINGS (
    SerialNumber INT PRIMARY KEY,
    Enable_DynDNS INT,
    DynDNS_Provider INT,
    DynDNS_User NVARCHAR(255),
    DynDNS_Pass NVARCHAR(255),
    DynDNS_Domain NVARCHAR(255),
    DynDNS_Update_Time INT,
    Update_DynDNS_Time NVARCHAR(64),
    created_at DATETIME2 DEFAULT GETUTCDATE(),
    updated_at DATETIME2 DEFAULT GETUTCDATE()
);

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'HARDWARE_INFO')
CREATE TABLE HARDWARE_INFO (
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
    created_at DATETIME2 DEFAULT GETUTCDATE(),
    updated_at DATETIME2 DEFAULT GETUTCDATE()
);

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'FEATURE_FLAGS')
CREATE TABLE FEATURE_FLAGS (
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
    created_at DATETIME2 DEFAULT GETUTCDATE(),
    updated_at DATETIME2 DEFAULT GETUTCDATE()
);

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'WIFI_SETTINGS')
CREATE TABLE WIFI_SETTINGS (
    SerialNumber INT PRIMARY KEY,
    Wifi_Enable INT,
    IP_Auto_Manual INT,
    IP_Wifi_Status INT,
    Load_Default INT,
    Modbus_Port INT,
    BACnet_Port INT,
    Software_Version INT,
    Username NVARCHAR(255),
    Password NVARCHAR(255),
    IP_Address NVARCHAR(64),
    Net_Mask NVARCHAR(64),
    Gateway NVARCHAR(64),
    Wifi_MAC NVARCHAR(64),
    created_at DATETIME2 DEFAULT GETUTCDATE(),
    updated_at DATETIME2 DEFAULT GETUTCDATE()
);

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'MISC_SETTINGS')
CREATE TABLE MISC_SETTINGS (
    SerialNumber INT PRIMARY KEY,
    Flag1 INT,
    Flag2 INT,
    Monitor_Analog_Block_0 INT, Monitor_Analog_Block_1 INT,
    Monitor_Analog_Block_2 INT, Monitor_Analog_Block_3 INT,
    Monitor_Analog_Block_4 INT, Monitor_Analog_Block_5 INT,
    Monitor_Analog_Block_6 INT, Monitor_Analog_Block_7 INT,
    Monitor_Analog_Block_8 INT, Monitor_Analog_Block_9 INT,
    Monitor_Analog_Block_10 INT, Monitor_Analog_Block_11 INT,
    Monitor_Digital_Block_0 INT, Monitor_Digital_Block_1 INT,
    Monitor_Digital_Block_2 INT, Monitor_Digital_Block_3 INT,
    Monitor_Digital_Block_4 INT, Monitor_Digital_Block_5 INT,
    Monitor_Digital_Block_6 INT, Monitor_Digital_Block_7 INT,
    Monitor_Digital_Block_8 INT, Monitor_Digital_Block_9 INT,
    Monitor_Digital_Block_10 INT, Monitor_Digital_Block_11 INT,
    Operation_Time_0 INT, Operation_Time_1 INT,
    Operation_Time_2 INT, Operation_Time_3 INT,
    Operation_Time_4 INT, Operation_Time_5 INT,
    Operation_Time_6 INT, Operation_Time_7 INT,
    Operation_Time_8 INT, Operation_Time_9 INT,
    Operation_Time_10 INT, Operation_Time_11 INT,
    Network_Health_Flag INT,
    COM_RX_0 INT, COM_RX_1 INT, COM_RX_2 INT,
    COM_TX_0 INT, COM_TX_1 INT, COM_TX_2 INT,
    Collision_0 INT, Collision_1 INT, Collision_2 INT,
    Packet_Error_0 INT, Packet_Error_1 INT, Packet_Error_2 INT,
    Timeout_0 INT, Timeout_1 INT, Timeout_2 INT,
    created_at DATETIME2 DEFAULT GETUTCDATE(),
    updated_at DATETIME2 DEFAULT GETUTCDATE()
);

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'REMOTE_TSTAT_DB')
CREATE TABLE REMOTE_TSTAT_DB (
    SerialNumber INT NOT NULL,
    Remote_Tstat_ID NVARCHAR(64),
    Remote_Index INT,
    Panel NVARCHAR(255),
    Protocol INT,
    Modbus_ID INT,
    BACnet_Instance INT,
    Status NVARCHAR(64)
);

-- =================================================================
-- TRENDLOG TABLES
-- =================================================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'TRENDLOGS')
CREATE TABLE TRENDLOGS (
    id INT IDENTITY(1,1) PRIMARY KEY,
    SerialNumber INT NOT NULL,
    PanelId INT NOT NULL,
    Trendlog_ID NVARCHAR(64) NOT NULL,
    Switch_Node NVARCHAR(255),
    Trendlog_Label NVARCHAR(255),
    Interval_Seconds INT,
    Buffer_Size INT,
    Data_Size_KB NVARCHAR(64),
    Auto_Manual NVARCHAR(64),
    Status NVARCHAR(64),
    ffi_synced INT DEFAULT 0,
    last_ffi_sync NVARCHAR(64),
    created_at DATETIME2 DEFAULT GETUTCDATE(),
    updated_at DATETIME2 DEFAULT GETUTCDATE()
);

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'TRENDLOG_INPUTS')
CREATE TABLE TRENDLOG_INPUTS (
    id INT IDENTITY(1,1) PRIMARY KEY,
    SerialNumber INT NOT NULL,
    PanelId INT NOT NULL,
    Trendlog_ID NVARCHAR(64) NOT NULL,
    Point_Type NVARCHAR(32) NOT NULL,
    Point_Index NVARCHAR(32) NOT NULL,
    Point_Panel NVARCHAR(255),
    Point_Label NVARCHAR(255),
    Status NVARCHAR(64),
    view_type NVARCHAR(16) DEFAULT 'MAIN',
    view_number INT DEFAULT NULL,
    is_selected INT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETUTCDATE(),
    updated_at DATETIME2 DEFAULT GETUTCDATE(),
    CONSTRAINT UQ_TRENDLOG_INPUTS UNIQUE (SerialNumber, PanelId, Trendlog_ID, Point_Type, Point_Index, view_type, view_number)
);

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'TRENDLOG_VIEWS')
CREATE TABLE TRENDLOG_VIEWS (
    id INT IDENTITY(1,1) PRIMARY KEY,
    SerialNumber INT NOT NULL,
    PanelId INT NOT NULL,
    Trendlog_ID NVARCHAR(64) NOT NULL,
    View_Number INT NOT NULL,
    Point_Type NVARCHAR(32) NOT NULL,
    Point_Index NVARCHAR(32) NOT NULL,
    Point_Panel NVARCHAR(255),
    Point_Label NVARCHAR(255),
    is_selected INT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETUTCDATE(),
    updated_at DATETIME2 DEFAULT GETUTCDATE(),
    CONSTRAINT UQ_TRENDLOG_VIEWS UNIQUE (SerialNumber, PanelId, Trendlog_ID, View_Number, Point_Type, Point_Index)
);

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'TRENDLOG_DATA_OLD')
CREATE TABLE TRENDLOG_DATA_OLD (
    SerialNumber INT NOT NULL,
    PanelId INT NOT NULL,
    PointId NVARCHAR(64) NOT NULL,
    PointIndex INT NOT NULL,
    PointType NVARCHAR(32) NOT NULL,
    Value NVARCHAR(255) NOT NULL,
    LoggingTime NVARCHAR(64) NOT NULL,
    LoggingTime_Fmt NVARCHAR(64) NOT NULL,
    Digital_Analog NVARCHAR(64),
    Range_Field NVARCHAR(255),
    Units NVARCHAR(64),
    DataSource NVARCHAR(32) DEFAULT 'REALTIME',
    SyncInterval INT DEFAULT 30,
    CreatedBy NVARCHAR(32) DEFAULT 'FRONTEND'
);

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'TRENDLOG_DATA')
CREATE TABLE TRENDLOG_DATA (
    id INT IDENTITY(1,1) PRIMARY KEY,
    SerialNumber INT NOT NULL,
    PanelId INT NOT NULL,
    PointId NVARCHAR(64) NOT NULL,
    PointIndex INT NOT NULL,
    PointType NVARCHAR(32) NOT NULL,
    Digital_Analog NVARCHAR(64),
    Range_Field NVARCHAR(255),
    Units NVARCHAR(64),
    Description NVARCHAR(MAX),
    IsActive BIT DEFAULT 1,
    CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 DEFAULT GETUTCDATE(),
    CONSTRAINT UQ_TRENDLOG_DATA UNIQUE (SerialNumber, PanelId, PointId, PointIndex, PointType)
);

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'TRENDLOG_DATA_SYNC_METADATA')
CREATE TABLE TRENDLOG_DATA_SYNC_METADATA (
    id INT IDENTITY(1,1) PRIMARY KEY,
    SyncTime_Fmt NVARCHAR(64) NOT NULL,
    MessageType NVARCHAR(64) NOT NULL,
    PanelId INT,
    SerialNumber INT,
    RecordsInserted INT DEFAULT 0,
    SyncInterval INT NOT NULL,
    Success INT DEFAULT 1,
    ErrorMessage NVARCHAR(MAX),
    CreatedAt DATETIME2 DEFAULT GETUTCDATE()
);

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'TRENDLOG_DATA_DETAIL')
CREATE TABLE TRENDLOG_DATA_DETAIL (
    ParentId INT NOT NULL,
    Value NVARCHAR(255) NOT NULL,
    LoggingTime_Fmt NVARCHAR(64) NOT NULL
);

-- =================================================================
-- DATABASE MANAGEMENT TABLES
-- =================================================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'DATABASE_PARTITION_CONFIG')
CREATE TABLE DATABASE_PARTITION_CONFIG (
    id INT IDENTITY(1,1) PRIMARY KEY,
    strategy NVARCHAR(32) NOT NULL DEFAULT 'monthly',
    custom_days INT,
    custom_months INT,
    retention_value INT NOT NULL DEFAULT 30,
    retention_unit NVARCHAR(16) NOT NULL DEFAULT 'days',
    auto_cleanup_enabled BIT NOT NULL DEFAULT 1,
    is_active BIT NOT NULL DEFAULT 1,
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'DATABASE_FILES')
CREATE TABLE DATABASE_FILES (
    id INT IDENTITY(1,1) PRIMARY KEY,
    file_name NVARCHAR(255) NOT NULL UNIQUE,
    file_path NVARCHAR(MAX) NOT NULL,
    file_size_bytes INT NOT NULL DEFAULT 0,
    record_count INT NOT NULL DEFAULT 0,
    partition_identifier NVARCHAR(255),
    start_date DATE,
    end_date DATE,
    is_active BIT NOT NULL DEFAULT 1,
    is_archived BIT NOT NULL DEFAULT 0,
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    last_accessed_at DATETIME2
);

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'APPLICATION_CONFIG')
CREATE TABLE APPLICATION_CONFIG (
    id INT IDENTITY(1,1) PRIMARY KEY,
    config_key NVARCHAR(255) NOT NULL,
    config_value NVARCHAR(MAX) NOT NULL,
    config_type NVARCHAR(16) NOT NULL DEFAULT 'json',
    description NVARCHAR(MAX),
    user_id INT,
    device_serial NVARCHAR(64),
    panel_id INT,
    is_system BIT NOT NULL DEFAULT 0,
    version NVARCHAR(32),
    size_bytes INT,
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT UQ_APP_CONFIG UNIQUE (config_key, user_id, device_serial, panel_id)
);

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'APPLICATION_CONFIG_HISTORY')
CREATE TABLE APPLICATION_CONFIG_HISTORY (
    id INT IDENTITY(1,1) PRIMARY KEY,
    config_key NVARCHAR(255) NOT NULL,
    old_value NVARCHAR(MAX),
    new_value NVARCHAR(MAX) NOT NULL,
    changed_by NVARCHAR(255),
    change_reason NVARCHAR(MAX),
    changed_at DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'DATABASE_PARTITIONS')
CREATE TABLE DATABASE_PARTITIONS (
    id INT IDENTITY(1,1) PRIMARY KEY,
    partition_name NVARCHAR(255) NOT NULL UNIQUE,
    partition_identifier NVARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    table_prefix NVARCHAR(255) NOT NULL,
    record_count INT NOT NULL DEFAULT 0,
    file_size_bytes INT NOT NULL DEFAULT 0,
    is_active BIT NOT NULL DEFAULT 1,
    is_current BIT NOT NULL DEFAULT 0,
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'DATA_SYNC_METADATA')
CREATE TABLE DATA_SYNC_METADATA (
    id INT IDENTITY(1,1) PRIMARY KEY,
    sync_time INT NOT NULL,
    sync_time_fmt NVARCHAR(64) NOT NULL,
    data_type NVARCHAR(64) NOT NULL,
    serial_number NVARCHAR(64) NOT NULL,
    panel_id INT,
    records_synced INT DEFAULT 0,
    sync_method NVARCHAR(32) NOT NULL,
    success INT NOT NULL DEFAULT 1,
    error_message NVARCHAR(MAX),
    created_at DATETIME2 DEFAULT GETUTCDATE()
);

-- =================================================================
-- INDEXES
-- =================================================================

-- Helper: only create index if it doesn't exist
-- Core table indexes
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_DEVICES_SERIAL')
    CREATE INDEX IDX_DEVICES_SERIAL ON DEVICES(SerialNumber);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_INPUTS_SERIAL')
    CREATE INDEX IDX_INPUTS_SERIAL ON INPUTS(SerialNumber);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_OUTPUTS_SERIAL')
    CREATE INDEX IDX_OUTPUTS_SERIAL ON OUTPUTS(SerialNumber);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_VARIABLES_SERIAL')
    CREATE INDEX IDX_VARIABLES_SERIAL ON VARIABLES(SerialNumber);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_PROGRAMS_SERIAL')
    CREATE INDEX IDX_PROGRAMS_SERIAL ON PROGRAMS(SerialNumber);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_SCHEDULES_SERIAL')
    CREATE INDEX IDX_SCHEDULES_SERIAL ON SCHEDULES(SerialNumber);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_PID_TABLE_SERIAL')
    CREATE INDEX IDX_PID_TABLE_SERIAL ON PID_TABLE(SerialNumber);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_HOLIDAYS_SERIAL')
    CREATE INDEX IDX_HOLIDAYS_SERIAL ON HOLIDAYS(SerialNumber);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_GRAPHICS_SERIAL')
    CREATE INDEX IDX_GRAPHICS_SERIAL ON GRAPHICS(SerialNumber);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_ALARMS_SERIAL')
    CREATE INDEX IDX_ALARMS_SERIAL ON ALARMS(SerialNumber);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_MONITORDATA_SERIAL')
    CREATE INDEX IDX_MONITORDATA_SERIAL ON MONITORDATA(SerialNumber);

-- Trendlog indexes
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_TRENDLOGS_SERIAL')
    CREATE INDEX IDX_TRENDLOGS_SERIAL ON TRENDLOGS(SerialNumber);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_TRENDLOGS_ID')
    CREATE INDEX IDX_TRENDLOGS_ID ON TRENDLOGS(Trendlog_ID);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_TRENDLOG_INPUTS_ID')
    CREATE INDEX IDX_TRENDLOG_INPUTS_ID ON TRENDLOG_INPUTS(Trendlog_ID);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_TRENDLOG_INPUTS_VIEW')
    CREATE INDEX IDX_TRENDLOG_INPUTS_VIEW ON TRENDLOG_INPUTS(Trendlog_ID, view_type, view_number);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_TRENDLOG_VIEWS_ID')
    CREATE INDEX IDX_TRENDLOG_VIEWS_ID ON TRENDLOG_VIEWS(Trendlog_ID);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_TRENDLOG_VIEWS_UNIQUE')
    CREATE INDEX IDX_TRENDLOG_VIEWS_UNIQUE ON TRENDLOG_VIEWS(Trendlog_ID, View_Number);

-- Legacy TRENDLOG_DATA_OLD indexes
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_TRENDLOG_DATA_OLD_SOURCE_TIME')
    CREATE INDEX IDX_TRENDLOG_DATA_OLD_SOURCE_TIME ON TRENDLOG_DATA_OLD(SerialNumber, PanelId, DataSource, LoggingTime_Fmt);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_TRENDLOG_DATA_OLD_RECENT_QUERY')
    CREATE INDEX IDX_TRENDLOG_DATA_OLD_RECENT_QUERY ON TRENDLOG_DATA_OLD(SerialNumber, PanelId, LoggingTime_Fmt DESC);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_TRENDLOG_DATA_OLD_SERIAL')
    CREATE INDEX IDX_TRENDLOG_DATA_OLD_SERIAL ON TRENDLOG_DATA_OLD(SerialNumber);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_TRENDLOG_DATA_OLD_PANEL')
    CREATE INDEX IDX_TRENDLOG_DATA_OLD_PANEL ON TRENDLOG_DATA_OLD(PanelId);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_TRENDLOG_DATA_OLD_POINT_ID')
    CREATE INDEX IDX_TRENDLOG_DATA_OLD_POINT_ID ON TRENDLOG_DATA_OLD(PointId);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_TRENDLOG_DATA_OLD_POINT_INDEX')
    CREATE INDEX IDX_TRENDLOG_DATA_OLD_POINT_INDEX ON TRENDLOG_DATA_OLD(PointIndex);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_TRENDLOG_DATA_OLD_TYPE')
    CREATE INDEX IDX_TRENDLOG_DATA_OLD_TYPE ON TRENDLOG_DATA_OLD(PointType);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_TRENDLOG_DATA_OLD_TIME')
    CREATE INDEX IDX_TRENDLOG_DATA_OLD_TIME ON TRENDLOG_DATA_OLD(LoggingTime);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_TRENDLOG_DATA_OLD_TIME_FMT')
    CREATE INDEX IDX_TRENDLOG_DATA_OLD_TIME_FMT ON TRENDLOG_DATA_OLD(LoggingTime_Fmt);

-- TRENDLOG_DATA (Parent) indexes
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_TRENDLOG_DATA_LOOKUP')
    CREATE INDEX IDX_TRENDLOG_DATA_LOOKUP ON TRENDLOG_DATA(SerialNumber, PanelId, PointId);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_TRENDLOG_DATA_SERIAL')
    CREATE INDEX IDX_TRENDLOG_DATA_SERIAL ON TRENDLOG_DATA(SerialNumber);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_TRENDLOG_DATA_TYPE')
    CREATE INDEX IDX_TRENDLOG_DATA_TYPE ON TRENDLOG_DATA(PointType);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_TRENDLOG_DATA_ACTIVE')
    CREATE INDEX IDX_TRENDLOG_DATA_ACTIVE ON TRENDLOG_DATA(IsActive);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_TRENDLOG_DATA_HISTORY_FILTER')
    CREATE INDEX IDX_TRENDLOG_DATA_HISTORY_FILTER ON TRENDLOG_DATA(SerialNumber, PanelId, PointType, PointIndex);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_TRENDLOG_DATA_SPECIFIC_POINTS')
    CREATE INDEX IDX_TRENDLOG_DATA_SPECIFIC_POINTS ON TRENDLOG_DATA(PointId, PointType, PointIndex, PanelId);

-- TRENDLOG_DATA_DETAIL (Child) indexes
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_TRENDLOG_DETAIL_PARENT')
    CREATE INDEX IDX_TRENDLOG_DETAIL_PARENT ON TRENDLOG_DATA_DETAIL(ParentId);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_TRENDLOG_DETAIL_TIME_FMT')
    CREATE INDEX IDX_TRENDLOG_DETAIL_TIME_FMT ON TRENDLOG_DATA_DETAIL(LoggingTime_Fmt DESC);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_TRENDLOG_DETAIL_PARENT_TIME')
    CREATE INDEX IDX_TRENDLOG_DETAIL_PARENT_TIME ON TRENDLOG_DATA_DETAIL(ParentId, LoggingTime_Fmt DESC);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_TRENDLOG_DETAIL_TIME_RANGE')
    CREATE INDEX IDX_TRENDLOG_DETAIL_TIME_RANGE ON TRENDLOG_DATA_DETAIL(LoggingTime_Fmt, ParentId);

-- TRENDLOG_DATA_SYNC_METADATA indexes
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_SYNC_META_TIME')
    CREATE INDEX IDX_SYNC_META_TIME ON TRENDLOG_DATA_SYNC_METADATA(SyncTime_Fmt DESC);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_SYNC_META_TYPE')
    CREATE INDEX IDX_SYNC_META_TYPE ON TRENDLOG_DATA_SYNC_METADATA(MessageType);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_SYNC_META_DEVICE')
    CREATE INDEX IDX_SYNC_META_DEVICE ON TRENDLOG_DATA_SYNC_METADATA(PanelId, SerialNumber);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_SYNC_META_SUCCESS')
    CREATE INDEX IDX_SYNC_META_SUCCESS ON TRENDLOG_DATA_SYNC_METADATA(Success);

-- Feature table indexes
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_ARRAYS_SERIAL')
    CREATE INDEX IDX_ARRAYS_SERIAL ON ARRAYS(SerialNumber);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_ARRAYS_ID')
    CREATE INDEX IDX_ARRAYS_ID ON ARRAYS(Array_ID);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_CONVERSION_TABLES_SERIAL')
    CREATE INDEX IDX_CONVERSION_TABLES_SERIAL ON CONVERSION_TABLES(SerialNumber);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_CONVERSION_TABLES_ID')
    CREATE INDEX IDX_CONVERSION_TABLES_ID ON CONVERSION_TABLES(Table_ID);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_CUSTOM_UNITS_SERIAL')
    CREATE INDEX IDX_CUSTOM_UNITS_SERIAL ON CUSTOM_UNITS(SerialNumber);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_CUSTOM_UNITS_ID')
    CREATE INDEX IDX_CUSTOM_UNITS_ID ON CUSTOM_UNITS(Unit_ID);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_CUSTOM_UNITS_TYPE')
    CREATE INDEX IDX_CUSTOM_UNITS_TYPE ON CUSTOM_UNITS(Unit_Type);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_VARIABLE_UNITS_SERIAL')
    CREATE INDEX IDX_VARIABLE_UNITS_SERIAL ON VARIABLE_UNITS(SerialNumber);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_VARIABLE_UNITS_ID')
    CREATE INDEX IDX_VARIABLE_UNITS_ID ON VARIABLE_UNITS(Variable_ID);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_USERS_SERIAL')
    CREATE INDEX IDX_USERS_SERIAL ON USERS(SerialNumber);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_USERS_ID')
    CREATE INDEX IDX_USERS_ID ON USERS(User_ID);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_USERS_NAME')
    CREATE INDEX IDX_USERS_NAME ON USERS(Name);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_USERS_ACCESS_LEVEL')
    CREATE INDEX IDX_USERS_ACCESS_LEVEL ON USERS(Access_Level);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_REMOTE_POINTS_SERIAL')
    CREATE INDEX IDX_REMOTE_POINTS_SERIAL ON REMOTE_POINTS(SerialNumber);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_REMOTE_POINTS_ID')
    CREATE INDEX IDX_REMOTE_POINTS_ID ON REMOTE_POINTS(Remote_ID);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_REMOTE_POINTS_OBJECT_INSTANCE')
    CREATE INDEX IDX_REMOTE_POINTS_OBJECT_INSTANCE ON REMOTE_POINTS(Object_Instance);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_EMAIL_ALARMS_SERIAL')
    CREATE INDEX IDX_EMAIL_ALARMS_SERIAL ON EMAIL_ALARMS(SerialNumber);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_EMAIL_ALARMS_ID')
    CREATE INDEX IDX_EMAIL_ALARMS_ID ON EMAIL_ALARMS(Email_ID);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_EXTIO_DEVICES_SERIAL')
    CREATE INDEX IDX_EXTIO_DEVICES_SERIAL ON EXTIO_DEVICES(SerialNumber);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_EXTIO_DEVICES_ID')
    CREATE INDEX IDX_EXTIO_DEVICES_ID ON EXTIO_DEVICES(ExtIO_ID);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_EXTIO_DEVICES_EXTIO_SERIAL')
    CREATE INDEX IDX_EXTIO_DEVICES_EXTIO_SERIAL ON EXTIO_DEVICES(ExtIO_SerialNumber);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_TSTAT_SCHEDULES_SERIAL')
    CREATE INDEX IDX_TSTAT_SCHEDULES_SERIAL ON TSTAT_SCHEDULES(SerialNumber);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_TSTAT_SCHEDULES_ID')
    CREATE INDEX IDX_TSTAT_SCHEDULES_ID ON TSTAT_SCHEDULES(Tstat_ID);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_GRAPHIC_LABELS_SERIAL')
    CREATE INDEX IDX_GRAPHIC_LABELS_SERIAL ON GRAPHIC_LABELS(SerialNumber);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_GRAPHIC_LABELS_ID')
    CREATE INDEX IDX_GRAPHIC_LABELS_ID ON GRAPHIC_LABELS(Label_ID);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_GRAPHIC_LABELS_SCREEN')
    CREATE INDEX IDX_GRAPHIC_LABELS_SCREEN ON GRAPHIC_LABELS(Screen_Index);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_MSV_DATA_SERIAL')
    CREATE INDEX IDX_MSV_DATA_SERIAL ON MSV_DATA(SerialNumber);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_MSV_DATA_ID')
    CREATE INDEX IDX_MSV_DATA_ID ON MSV_DATA(MSV_ID);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_ALARM_SETTINGS_SERIAL')
    CREATE INDEX IDX_ALARM_SETTINGS_SERIAL ON ALARM_SETTINGS(SerialNumber);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_ALARM_SETTINGS_ID')
    CREATE INDEX IDX_ALARM_SETTINGS_ID ON ALARM_SETTINGS(Alarm_Setting_ID);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_NETWORK_SETTINGS_SERIAL')
    CREATE INDEX IDX_NETWORK_SETTINGS_SERIAL ON NETWORK_SETTINGS(SerialNumber);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_COMMUNICATION_SETTINGS_SERIAL')
    CREATE INDEX IDX_COMMUNICATION_SETTINGS_SERIAL ON COMMUNICATION_SETTINGS(SerialNumber);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_PROTOCOL_SETTINGS_SERIAL')
    CREATE INDEX IDX_PROTOCOL_SETTINGS_SERIAL ON PROTOCOL_SETTINGS(SerialNumber);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_TIME_SETTINGS_SERIAL')
    CREATE INDEX IDX_TIME_SETTINGS_SERIAL ON TIME_SETTINGS(SerialNumber);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_DYNDNS_SETTINGS_SERIAL')
    CREATE INDEX IDX_DYNDNS_SETTINGS_SERIAL ON DYNDNS_SETTINGS(SerialNumber);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_HARDWARE_INFO_SERIAL')
    CREATE INDEX IDX_HARDWARE_INFO_SERIAL ON HARDWARE_INFO(SerialNumber);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_FEATURE_FLAGS_SERIAL')
    CREATE INDEX IDX_FEATURE_FLAGS_SERIAL ON FEATURE_FLAGS(SerialNumber);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_WIFI_SETTINGS_SERIAL')
    CREATE INDEX IDX_WIFI_SETTINGS_SERIAL ON WIFI_SETTINGS(SerialNumber);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_MISC_SETTINGS_SERIAL')
    CREATE INDEX IDX_MISC_SETTINGS_SERIAL ON MISC_SETTINGS(SerialNumber);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_REMOTE_TSTAT_DB_SERIAL')
    CREATE INDEX IDX_REMOTE_TSTAT_DB_SERIAL ON REMOTE_TSTAT_DB(SerialNumber);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_REMOTE_TSTAT_DB_ID')
    CREATE INDEX IDX_REMOTE_TSTAT_DB_ID ON REMOTE_TSTAT_DB(Remote_Tstat_ID);

-- Database management indexes
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_DATABASE_PARTITION_CONFIG_strategy')
    CREATE INDEX idx_DATABASE_PARTITION_CONFIG_strategy ON DATABASE_PARTITION_CONFIG(strategy);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_DATABASE_PARTITION_CONFIG_active')
    CREATE INDEX idx_DATABASE_PARTITION_CONFIG_active ON DATABASE_PARTITION_CONFIG(is_active);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_DATABASE_PARTITION_CONFIG_created')
    CREATE INDEX idx_DATABASE_PARTITION_CONFIG_created ON DATABASE_PARTITION_CONFIG(created_at);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_DATABASE_FILES_name')
    CREATE INDEX idx_DATABASE_FILES_name ON DATABASE_FILES(file_name);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_DATABASE_FILES_active')
    CREATE INDEX idx_DATABASE_FILES_active ON DATABASE_FILES(is_active);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_DATABASE_FILES_archived')
    CREATE INDEX idx_DATABASE_FILES_archived ON DATABASE_FILES(is_archived);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_DATABASE_FILES_created')
    CREATE INDEX idx_DATABASE_FILES_created ON DATABASE_FILES(created_at);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_DATABASE_FILES_accessed')
    CREATE INDEX idx_DATABASE_FILES_accessed ON DATABASE_FILES(last_accessed_at);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_application_config_key')
    CREATE INDEX idx_application_config_key ON APPLICATION_CONFIG(config_key);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_application_config_type')
    CREATE INDEX idx_application_config_type ON APPLICATION_CONFIG(config_type);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_application_config_system')
    CREATE INDEX idx_application_config_system ON APPLICATION_CONFIG(is_system);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_application_config_user')
    CREATE INDEX idx_application_config_user ON APPLICATION_CONFIG(user_id);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_application_config_device')
    CREATE INDEX idx_application_config_device ON APPLICATION_CONFIG(device_serial);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_application_config_size')
    CREATE INDEX idx_application_config_size ON APPLICATION_CONFIG(size_bytes);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_application_config_history_key')
    CREATE INDEX idx_application_config_history_key ON APPLICATION_CONFIG_HISTORY(config_key);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_application_config_history_changed_at')
    CREATE INDEX idx_application_config_history_changed_at ON APPLICATION_CONFIG_HISTORY(changed_at DESC);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_application_config_history_changed_by')
    CREATE INDEX idx_application_config_history_changed_by ON APPLICATION_CONFIG_HISTORY(changed_by);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_DATABASE_PARTITIONS_name')
    CREATE INDEX idx_DATABASE_PARTITIONS_name ON DATABASE_PARTITIONS(partition_name);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_DATABASE_PARTITIONS_identifier')
    CREATE INDEX idx_DATABASE_PARTITIONS_identifier ON DATABASE_PARTITIONS(partition_identifier);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_DATABASE_PARTITIONS_active')
    CREATE INDEX idx_DATABASE_PARTITIONS_active ON DATABASE_PARTITIONS(is_active);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_DATABASE_PARTITIONS_current')
    CREATE INDEX idx_DATABASE_PARTITIONS_current ON DATABASE_PARTITIONS(is_current);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_DATABASE_PARTITIONS_dates')
    CREATE INDEX idx_DATABASE_PARTITIONS_dates ON DATABASE_PARTITIONS(start_date, end_date);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_data_sync_metadata_lookup')
    CREATE INDEX idx_data_sync_metadata_lookup ON DATA_SYNC_METADATA(serial_number, data_type, sync_time DESC);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_data_sync_metadata_created')
    CREATE INDEX idx_data_sync_metadata_created ON DATA_SYNC_METADATA(created_at DESC);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_data_sync_metadata_method')
    CREATE INDEX idx_data_sync_metadata_method ON DATA_SYNC_METADATA(sync_method, created_at DESC);

-- =================================================================
-- SEED DATA
-- =================================================================

IF NOT EXISTS (SELECT 1 FROM DATABASE_PARTITION_CONFIG WHERE id = 1)
INSERT INTO DATABASE_PARTITION_CONFIG (strategy, retention_value, retention_unit, auto_cleanup_enabled)
VALUES ('monthly', 30, 'days', 1);

-- Seed APPLICATION_CONFIG rows (skip if key already exists)
IF NOT EXISTS (SELECT 1 FROM APPLICATION_CONFIG WHERE config_key = 'database.version')
INSERT INTO APPLICATION_CONFIG (config_key, config_value, config_type, description, is_system) VALUES ('database.version', '1.0', 'string', 'Database schema version', 1);
IF NOT EXISTS (SELECT 1 FROM APPLICATION_CONFIG WHERE config_key = 'database.need_update')
INSERT INTO APPLICATION_CONFIG (config_key, config_value, config_type, description, is_system) VALUES ('database.need_update', '1', 'boolean', 'Flag indicating if database needs update', 1);
IF NOT EXISTS (SELECT 1 FROM APPLICATION_CONFIG WHERE config_key = 'database.update_status')
INSERT INTO APPLICATION_CONFIG (config_key, config_value, config_type, description, is_system) VALUES ('database.update_status', '0', 'boolean', 'Update completion status', 1);
IF NOT EXISTS (SELECT 1 FROM APPLICATION_CONFIG WHERE config_key = 'database.max_file_size')
INSERT INTO APPLICATION_CONFIG (config_key, config_value, config_type, description, is_system) VALUES ('database.max_file_size', '2048', 'number', 'Maximum database file size in MB', 1);
IF NOT EXISTS (SELECT 1 FROM APPLICATION_CONFIG WHERE config_key = 'database.backup_enabled')
INSERT INTO APPLICATION_CONFIG (config_key, config_value, config_type, description, is_system) VALUES ('database.backup_enabled', 'true', 'boolean', 'Enable automatic database backups', 1);
IF NOT EXISTS (SELECT 1 FROM APPLICATION_CONFIG WHERE config_key = 'database.compression_enabled')
INSERT INTO APPLICATION_CONFIG (config_key, config_value, config_type, description, is_system) VALUES ('database.compression_enabled', 'false', 'boolean', 'Enable database compression', 1);
IF NOT EXISTS (SELECT 1 FROM APPLICATION_CONFIG WHERE config_key = 'database.vacuum_interval')
INSERT INTO APPLICATION_CONFIG (config_key, config_value, config_type, description, is_system) VALUES ('database.vacuum_interval', '7', 'number', 'Database vacuum interval in days', 1);
IF NOT EXISTS (SELECT 1 FROM APPLICATION_CONFIG WHERE config_key = 'ui.theme')
INSERT INTO APPLICATION_CONFIG (config_key, config_value, config_type, description, is_system) VALUES ('ui.theme', 'light', 'string', 'Application theme preference', 0);
IF NOT EXISTS (SELECT 1 FROM APPLICATION_CONFIG WHERE config_key = 'ui.language')
INSERT INTO APPLICATION_CONFIG (config_key, config_value, config_type, description, is_system) VALUES ('ui.language', 'en', 'string', 'Application language', 0);
IF NOT EXISTS (SELECT 1 FROM APPLICATION_CONFIG WHERE config_key = 'ffi.sync_interval_secs')
INSERT INTO APPLICATION_CONFIG (config_key, config_value, config_type, description, is_system) VALUES ('ffi.sync_interval_secs', '900', 'number', 'FFI Sync Service interval in seconds', 0);
IF NOT EXISTS (SELECT 1 FROM APPLICATION_CONFIG WHERE config_key = 'rediscover.interval_secs')
INSERT INTO APPLICATION_CONFIG (config_key, config_value, config_type, description, is_system) VALUES ('rediscover.interval_secs', '3600', 'number', 'Rediscover Service interval in seconds', 0);

-- UI auto-refresh seed data
IF NOT EXISTS (SELECT 1 FROM APPLICATION_CONFIG WHERE config_key = 'ui.refresh.inputs')
INSERT INTO APPLICATION_CONFIG (config_key, config_value, config_type, description, is_system) VALUES ('ui.refresh.inputs', '{"autoRefreshEnabled":false,"refreshIntervalSecs":30}', 'json', 'UI auto-refresh settings for Inputs page', 0);
IF NOT EXISTS (SELECT 1 FROM APPLICATION_CONFIG WHERE config_key = 'ui.refresh.outputs')
INSERT INTO APPLICATION_CONFIG (config_key, config_value, config_type, description, is_system) VALUES ('ui.refresh.outputs', '{"autoRefreshEnabled":false,"refreshIntervalSecs":30}', 'json', 'UI auto-refresh settings for Outputs page', 0);
IF NOT EXISTS (SELECT 1 FROM APPLICATION_CONFIG WHERE config_key = 'ui.refresh.variables')
INSERT INTO APPLICATION_CONFIG (config_key, config_value, config_type, description, is_system) VALUES ('ui.refresh.variables', '{"autoRefreshEnabled":false,"refreshIntervalSecs":30}', 'json', 'UI auto-refresh settings for Variables page', 0);
IF NOT EXISTS (SELECT 1 FROM APPLICATION_CONFIG WHERE config_key = 'ui.refresh.programs')
INSERT INTO APPLICATION_CONFIG (config_key, config_value, config_type, description, is_system) VALUES ('ui.refresh.programs', '{"autoRefreshEnabled":false,"refreshIntervalSecs":30}', 'json', 'UI auto-refresh settings for Programs page', 0);
IF NOT EXISTS (SELECT 1 FROM APPLICATION_CONFIG WHERE config_key = 'ui.refresh.schedules')
INSERT INTO APPLICATION_CONFIG (config_key, config_value, config_type, description, is_system) VALUES ('ui.refresh.schedules', '{"autoRefreshEnabled":false,"refreshIntervalSecs":30}', 'json', 'UI auto-refresh settings for Schedules page', 0);
IF NOT EXISTS (SELECT 1 FROM APPLICATION_CONFIG WHERE config_key = 'ui.refresh.holidays')
INSERT INTO APPLICATION_CONFIG (config_key, config_value, config_type, description, is_system) VALUES ('ui.refresh.holidays', '{"autoRefreshEnabled":false,"refreshIntervalSecs":30}', 'json', 'UI auto-refresh settings for Holidays page', 0);

-- ============================================================================
-- T3_APP_LOG - Unified application event log
-- Replaces SYNC_EVENT_LOG and SYSTEM_LOGS.
-- categories: SYNC_CYCLE | SYNC_ERROR | DB_CONFIG | SAMPLING_STATE | SERVER_EVENT | HEARTBEAT
-- ============================================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'T3_APP_LOG')
CREATE TABLE T3_APP_LOG (
    id            INT IDENTITY(1,1) PRIMARY KEY,
    ts_unix       BIGINT        NOT NULL,
    ts_fmt        NVARCHAR(30)  NOT NULL,
    level         NVARCHAR(10)  NOT NULL DEFAULT 'info',
    category      NVARCHAR(30)  NOT NULL DEFAULT 'SERVER_EVENT',
    source        NVARCHAR(50),
    hostname      NVARCHAR(100),
    role          NVARCHAR(20),
    device_serial NVARCHAR(50),
    message       NVARCHAR(MAX) NOT NULL DEFAULT '',
    details       NVARCHAR(MAX)
);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_t3_app_log_ts'  AND object_id = OBJECT_ID('T3_APP_LOG'))
CREATE INDEX idx_t3_app_log_ts  ON T3_APP_LOG (ts_unix DESC);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_t3_app_log_cat' AND object_id = OBJECT_ID('T3_APP_LOG'))
CREATE INDEX idx_t3_app_log_cat ON T3_APP_LOG (category);

-- ============================================================================
-- DB_BACKEND_CONFIG - Centralized Database Backend Configuration
-- Stores connection settings for each supported database backend.
-- Each backend type is a row. Only one row has is_active=1 at a time.
-- This table ALWAYS lives in local SQLite (never on remote DB).
-- ============================================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'DB_BACKEND_CONFIG')
CREATE TABLE DB_BACKEND_CONFIG (
    id            INT IDENTITY(1,1) PRIMARY KEY,
    backend_type  NVARCHAR(20) NOT NULL UNIQUE,
    is_active     INT NOT NULL DEFAULT 0,
    host          NVARCHAR(255),
    port          INT,
    instance      NVARCHAR(255),
    database_name NVARCHAR(255),
    username      NVARCHAR(255),
    password      NVARCHAR(255),
    connection_url NVARCHAR(1024),
    extra_options NVARCHAR(MAX),
    role          NVARCHAR(20) DEFAULT 'server',
    updated_at    DATETIME2 DEFAULT GETDATE()
);

-- Seed default rows (one per supported backend)
IF NOT EXISTS (SELECT 1 FROM DB_BACKEND_CONFIG WHERE backend_type = 'sqlite')
INSERT INTO DB_BACKEND_CONFIG (backend_type, is_active, connection_url)
    VALUES ('sqlite', 1, 'sqlite://Database/webview_t3_device.db');
IF NOT EXISTS (SELECT 1 FROM DB_BACKEND_CONFIG WHERE backend_type = 'mssql')
INSERT INTO DB_BACKEND_CONFIG (backend_type, is_active, port)
    VALUES ('mssql', 0, 1433);
IF NOT EXISTS (SELECT 1 FROM DB_BACKEND_CONFIG WHERE backend_type = 'postgres')
INSERT INTO DB_BACKEND_CONFIG (backend_type, is_active, port)
    VALUES ('postgres', 0, 5432);
IF NOT EXISTS (SELECT 1 FROM DB_BACKEND_CONFIG WHERE backend_type = 'mysql')
INSERT INTO DB_BACKEND_CONFIG (backend_type, is_active, port)
    VALUES ('mysql', 0, 3306);

-- ============================================================================
-- SERVER_CLIENT_REGISTRY - Tracks all PCs participating in centralized DB mode
-- Server writes its own entry, clients send heartbeats to the server.
-- ============================================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SERVER_CLIENT_REGISTRY')
CREATE TABLE SERVER_CLIENT_REGISTRY (
    id            INT IDENTITY(1,1) PRIMARY KEY,
    hostname      NVARCHAR(255) NOT NULL DEFAULT '',
    ip_address    NVARCHAR(45) NOT NULL DEFAULT '',
    role          NVARCHAR(20) NOT NULL DEFAULT 'client',
    is_self       INT NOT NULL DEFAULT 0,
    status        NVARCHAR(20) NOT NULL DEFAULT 'online',
    last_seen     DATETIME2 NOT NULL DEFAULT GETDATE(),
    db_backend    NVARCHAR(20) DEFAULT 'sqlite',
    table_count   INT DEFAULT 0,
    version       NVARCHAR(50) DEFAULT '',
    created_at    DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT UQ_SCR_host_ip UNIQUE (hostname, ip_address)
);

-- ============================================================================
-- T3_FLOW / T3_FLOW_STEP / T3_FLOW_PAYLOAD - Flow-based trace logging
-- NOTE: At runtime these tables live in local SQLite only (webview_t3_device.db).
-- This MSSQL DDL is kept as a reference schema for future multi-DB deployments.
-- ============================================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'T3_FLOW')
CREATE TABLE T3_FLOW (
    id           INT IDENTITY(1,1) PRIMARY KEY,
    flow_id      NVARCHAR(36)  NOT NULL UNIQUE,
    flow_type    NVARCHAR(50)  NOT NULL,
    trigger_src  NVARCHAR(30)  NOT NULL,
    started_at   BIGINT        NOT NULL,
    ended_at     BIGINT,
    status       NVARCHAR(20)  NOT NULL DEFAULT 'running',
    hostname     NVARCHAR(100),
    total_steps  INT           NOT NULL DEFAULT 0,
    done_steps   INT           NOT NULL DEFAULT 0,
    error_count  INT           NOT NULL DEFAULT 0,
    meta         NVARCHAR(MAX)
);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_t3_flow_type'    AND object_id = OBJECT_ID('T3_FLOW'))
CREATE INDEX idx_t3_flow_type    ON T3_FLOW (flow_type);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_t3_flow_started' AND object_id = OBJECT_ID('T3_FLOW'))
CREATE INDEX idx_t3_flow_started ON T3_FLOW (started_at DESC);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_t3_flow_status'  AND object_id = OBJECT_ID('T3_FLOW'))
CREATE INDEX idx_t3_flow_status  ON T3_FLOW (status);

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'T3_FLOW_STEP')
CREATE TABLE T3_FLOW_STEP (
    id           INT IDENTITY(1,1) PRIMARY KEY,
    flow_id      NVARCHAR(36)  NOT NULL,
    seq          INT           NOT NULL,
    step_name    NVARCHAR(100) NOT NULL,
    level        NVARCHAR(10)  NOT NULL DEFAULT 'info',
    source       NVARCHAR(100),
    api_path     NVARCHAR(500),
    action_type  INT,
    status       NVARCHAR(20)  NOT NULL DEFAULT 'ok',
    duration_ms  BIGINT,
    payload_ref  NVARCHAR(500),
    message      NVARCHAR(MAX),
    details      NVARCHAR(MAX),
    ts_unix      BIGINT        NOT NULL,
    ts_fmt       NVARCHAR(30)  NOT NULL
);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_t3_flow_step_flow' AND object_id = OBJECT_ID('T3_FLOW_STEP'))
CREATE INDEX idx_t3_flow_step_flow ON T3_FLOW_STEP (flow_id);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_t3_flow_step_ts'   AND object_id = OBJECT_ID('T3_FLOW_STEP'))
CREATE INDEX idx_t3_flow_step_ts   ON T3_FLOW_STEP (ts_unix DESC);

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'T3_FLOW_PAYLOAD')
CREATE TABLE T3_FLOW_PAYLOAD (
    id           INT IDENTITY(1,1) PRIMARY KEY,
    flow_id      NVARCHAR(36)  NOT NULL,
    step_id      INT           NOT NULL,
    file_path    NVARCHAR(500) NOT NULL,
    size_bytes   BIGINT        NOT NULL,
    created_at   BIGINT        NOT NULL,
    purged       INT           NOT NULL DEFAULT 0
);

-- ============================================================================
-- TRENDLOG_POINT_SETS - Named saved point set selections for trendlog views
-- ============================================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'TRENDLOG_POINT_SETS')
CREATE TABLE TRENDLOG_POINT_SETS (
    id            INT IDENTITY(1,1) PRIMARY KEY,
    serial_number INT            NOT NULL,
    set_name      NVARCHAR(255)  NOT NULL,
    selected_keys NVARCHAR(MAX)  NOT NULL,
    point_tags    NVARCHAR(MAX)  NOT NULL,
    created_at    BIGINT,
    updated_at    BIGINT
);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'uq_trendpointsets_serial_name' AND object_id = OBJECT_ID('TRENDLOG_POINT_SETS'))
CREATE UNIQUE INDEX uq_trendpointsets_serial_name ON TRENDLOG_POINT_SETS (serial_number, set_name);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_trendpointsets_serial' AND object_id = OBJECT_ID('TRENDLOG_POINT_SETS'))
CREATE INDEX idx_trendpointsets_serial ON TRENDLOG_POINT_SETS (serial_number);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_trendpointsets_updated_at' AND object_id = OBJECT_ID('TRENDLOG_POINT_SETS'))
CREATE INDEX idx_trendpointsets_updated_at ON TRENDLOG_POINT_SETS (updated_at DESC);
