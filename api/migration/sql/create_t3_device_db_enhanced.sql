-- UPDATED T3000 Device Database Schema
-- Enhanced schema based on C++ source code analysis and field comparison

-- Buildings and Infrastructure (Enhanced)
CREATE TABLE IF NOT EXISTS buildings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    address TEXT,
    description TEXT,
    protocol TEXT,
    ip_domain_tel TEXT,
    modbus_tcp_port INTEGER,
    com_port TEXT,
    baud_rate INTEGER,
    building_path TEXT,
    selected INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE TABLE IF NOT EXISTS floors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    building_id INTEGER NOT NULL,
    floor_number INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE TABLE IF NOT EXISTS rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    floor_id INTEGER NOT NULL,
    room_number TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Networks and Devices (Enhanced)
CREATE TABLE IF NOT EXISTS networks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    building_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    network_type TEXT NOT NULL,
    network_number INTEGER,
    description TEXT,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE TABLE IF NOT EXISTS devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    network_id INTEGER NOT NULL,
    room_id INTEGER,
    instance_number INTEGER NOT NULL,
    product_type INTEGER NOT NULL,
    product_model TEXT,
    serial_number TEXT,
    hardware_version TEXT,
    software_version TEXT,
    device_name TEXT,
    description TEXT,
    ip_address TEXT,
    modbus_address INTEGER,
    zigbee_id TEXT,
    status INTEGER DEFAULT 0,
    last_communication INTEGER,
    -- Device Information Fields
    module_number TEXT,
    mcu_version TEXT,
    pic_version TEXT,
    top_version TEXT,
    bootloader_version TEXT,
    mcu_type TEXT,
    sd_card_status TEXT,
    -- Panel Information Fields
    bacnet_instance INTEGER,
    mac_address TEXT,
    mstp_network INTEGER,
    modbus_rtu_id INTEGER,
    bip_network INTEGER,
    max_master INTEGER,
    panel_number INTEGER,
    panel_name TEXT,
    -- IP Configuration
    subnet_mask TEXT,
    gateway_address TEXT,
    modbus_tcp_port INTEGER,
    -- Serial Port Configuration
    rs485_sub TEXT,
    zigbee_config TEXT,
    rs485_main TEXT,
    usb_port TEXT,
    zigbee_pan_id TEXT,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Enhanced Input Points (matches C++ Str_in_point)
CREATE TABLE IF NOT EXISTS input_points (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id INTEGER NOT NULL,
    point_number INTEGER NOT NULL,           -- Input
    panel_number INTEGER,                    -- Panel (sub_id)
    full_label TEXT,                         -- Full Label (description)
    label TEXT,                              -- Label
    auto_manual INTEGER DEFAULT 0,           -- Auto/Man
    value REAL DEFAULT 0.0,                  -- Value
    units_type INTEGER DEFAULT 0,            -- Units
    range_type INTEGER DEFAULT 0,            -- Range (as enum)
    range_min REAL DEFAULT 0.0,             -- Range min
    range_max REAL DEFAULT 100.0,           -- Range max
    calibration REAL DEFAULT 0.0,           -- Calibration
    calibration_sign INTEGER DEFAULT 0,     -- Sign
    filter INTEGER DEFAULT 0,               -- Filter
    status INTEGER DEFAULT 0,               -- Status
    signal_type INTEGER DEFAULT 0,          -- Signal Type (digital_analog)
    control_status INTEGER DEFAULT 0,       -- Control status
    sub_product INTEGER,                     -- Sub product
    decom INTEGER DEFAULT 0,                -- Decommissioned
    type_category TEXT DEFAULT 'INPUT',     -- Type category
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Enhanced Output Points (matches C++ Str_out_point)
CREATE TABLE IF NOT EXISTS output_points (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id INTEGER NOT NULL,
    point_number INTEGER NOT NULL,           -- Output
    panel_number INTEGER,                    -- Panel
    full_label TEXT,                         -- Full Label
    label TEXT,                              -- Label
    auto_manual INTEGER DEFAULT 0,           -- Auto/Man
    hoa_switch_status INTEGER DEFAULT 0,     -- HOA Switch
    value REAL DEFAULT 0.0,                  -- Value
    units_type INTEGER DEFAULT 0,            -- Units
    range_type INTEGER DEFAULT 0,            -- Range
    range_min REAL DEFAULT 0.0,
    range_max REAL DEFAULT 100.0,
    low_voltage REAL DEFAULT 0.0,           -- Low V
    high_voltage REAL DEFAULT 10.0,         -- High V
    pwm_period INTEGER DEFAULT 100,         -- PWM Period
    status INTEGER DEFAULT 0,               -- Status
    signal_type INTEGER DEFAULT 0,          -- Signal type
    control_status INTEGER DEFAULT 0,       -- Control
    sub_product INTEGER,                     -- Sub product
    decom INTEGER DEFAULT 0,
    type_category TEXT DEFAULT 'OUTPUT',    -- Type category
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Enhanced Variable Points (matches C++ Str_variable_point)
CREATE TABLE IF NOT EXISTS variable_points (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id INTEGER NOT NULL,
    point_number INTEGER NOT NULL,           -- Variable
    full_label TEXT,                         -- Full Label
    label TEXT,                              -- Label
    auto_manual INTEGER DEFAULT 0,           -- Auto/Man
    value REAL DEFAULT 0.0,                  -- Value
    units_type INTEGER DEFAULT 0,            -- Units
    range_type INTEGER DEFAULT 0,
    range_min REAL DEFAULT 0.0,
    range_max REAL DEFAULT 100.0,
    signal_type INTEGER DEFAULT 0,          -- Digital/Analog
    control_status INTEGER DEFAULT 0,
    status INTEGER DEFAULT 0,
    type_category TEXT DEFAULT 'VARIABLE',  -- Type category
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Enhanced Programs (matches C++ Str_program_point)
CREATE TABLE IF NOT EXISTS programs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id INTEGER NOT NULL,
    program_number INTEGER NOT NULL,         -- Program
    full_label TEXT,                         -- Full Label
    label TEXT,                              -- Label
    program_code TEXT,
    status INTEGER DEFAULT 0,               -- Status (on_off)
    auto_manual INTEGER DEFAULT 0,          -- Auto/Manual
    size_bytes INTEGER DEFAULT 0,           -- Size
    execution_time INTEGER DEFAULT 0,       -- Execution time
    com_program INTEGER DEFAULT 0,          -- Communication program
    error_code INTEGER DEFAULT 0,           -- Error code
    type_category TEXT DEFAULT 'PROGRAM',   -- Type category
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Enhanced PID Controllers (matches C++ Str_controller_point)
CREATE TABLE IF NOT EXISTS pid_controllers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id INTEGER NOT NULL,
    pid_number INTEGER NOT NULL,             -- NUM
    label TEXT,
    description TEXT,
    input_point INTEGER,                     -- Input
    input_value REAL DEFAULT 0.0,           -- Input value
    output_value REAL DEFAULT 0.0,          -- Value (controller output)
    units_type INTEGER DEFAULT 0,           -- Units
    auto_manual INTEGER DEFAULT 0,          -- A/M
    output_point INTEGER,                    -- Output
    setpoint_point INTEGER,                 -- Setpoint
    setpoint_value REAL DEFAULT 0.0,        -- Set Value
    setpoint_units INTEGER DEFAULT 0,       -- Units (for setpoint)
    action INTEGER DEFAULT 0,               -- Action (direct=0, reverse=1)
    proportional_gain REAL DEFAULT 1.0,     -- Prop
    integral_time INTEGER DEFAULT 0,        -- Int (reset)
    derivative_time INTEGER DEFAULT 0,      -- Der (rate)
    sample_time INTEGER DEFAULT 0,          -- Time
    bias REAL DEFAULT 0.0,                  -- Bias
    repeats_per_min INTEGER DEFAULT 0,
    status INTEGER DEFAULT 0,
    type_category TEXT DEFAULT 'PID',       -- Type category
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- NEW: Graphics Table
CREATE TABLE IF NOT EXISTS graphics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id INTEGER NOT NULL,
    graphic_number INTEGER NOT NULL,         -- Graphic
    full_label TEXT,                         -- Full Label
    label TEXT,                              -- Label
    picture_file TEXT,                       -- Picture File
    element_count INTEGER DEFAULT 0,        -- Element Count
    status INTEGER DEFAULT 0,
    type_category TEXT DEFAULT 'GRAPHIC',   -- Type category
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Enhanced Schedules (matches C++ Str_weekly_routine_point)
CREATE TABLE IF NOT EXISTS schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id INTEGER NOT NULL,
    schedule_number INTEGER NOT NULL,        -- NUM
    full_label TEXT,                         -- Full Label
    label TEXT,                              -- Label
    auto_manual INTEGER DEFAULT 0,          -- Auto/Manual
    output_point INTEGER,                    -- Output
    holiday1_reference INTEGER,             -- Holiday1
    state1_value INTEGER DEFAULT 0,         -- State1
    holiday2_reference INTEGER,             -- Holiday2
    state2_value INTEGER DEFAULT 0,         -- State2
    value INTEGER DEFAULT 0,
    override_1_value INTEGER DEFAULT 0,
    override_2_value INTEGER DEFAULT 0,
    override_1_point INTEGER,
    override_2_point INTEGER,
    status INTEGER DEFAULT 0,
    type_category TEXT DEFAULT 'SCHEDULE',  -- Type category
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE TABLE IF NOT EXISTS schedule_details (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    schedule_id INTEGER NOT NULL,
    day_of_week INTEGER NOT NULL,
    time_on TEXT,
    value REAL DEFAULT 0.0,
    time_off TEXT,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Enhanced Holidays (matches C++ Str_annual_routine_point)
CREATE TABLE IF NOT EXISTS holidays (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id INTEGER NOT NULL,
    holiday_number INTEGER NOT NULL,         -- NUM
    full_label TEXT,                         -- Full Label
    label TEXT,                              -- Label
    auto_manual INTEGER DEFAULT 0,          -- Auto/Manual
    value INTEGER DEFAULT 0,                -- Value
    month INTEGER,
    day INTEGER,
    status INTEGER DEFAULT 0,
    type_category TEXT DEFAULT 'HOLIDAY',   -- Type category
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Enhanced Trend Logs
CREATE TABLE IF NOT EXISTS trendlogs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id INTEGER NOT NULL,
    trendlog_number INTEGER NOT NULL,        -- NUM
    label TEXT,                              -- Label
    description TEXT,
    interval_seconds INTEGER DEFAULT 60,    -- Interval
    status INTEGER DEFAULT 0,               -- Status
    data_size_kb INTEGER DEFAULT 0,         -- Data Size (KB)
    buffer_size INTEGER DEFAULT 1000,
    type_category TEXT DEFAULT 'TRENDLOG',  -- Type category
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- NEW: Trend Log Inputs (sub-table)
CREATE TABLE IF NOT EXISTS trendlog_inputs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trendlog_id INTEGER NOT NULL,
    input_number INTEGER NOT NULL,          -- Num
    input_point INTEGER NOT NULL,           -- Input
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (trendlog_id) REFERENCES trendlogs(id)
);

CREATE TABLE IF NOT EXISTS trendlog_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trendlog_id INTEGER NOT NULL,
    timestamp INTEGER NOT NULL,
    value REAL NOT NULL,
    quality INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Enhanced Alarms
CREATE TABLE IF NOT EXISTS alarms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id INTEGER NOT NULL,
    alarm_number INTEGER NOT NULL,           -- NUM
    panel_number INTEGER,                    -- Panel
    message TEXT,                            -- Message
    alarm_time INTEGER,                      -- Time
    acknowledge_status INTEGER DEFAULT 0,   -- Acknowledge
    resolution_status INTEGER DEFAULT 0,    -- Res
    delete_status INTEGER DEFAULT 0,        -- Delete
    label TEXT,
    description TEXT,
    input_point INTEGER,
    alarm_type INTEGER DEFAULT 0,
    threshold_high REAL,
    threshold_low REAL,
    status INTEGER DEFAULT 0,
    type_category TEXT DEFAULT 'ALARM',     -- Type category
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- NEW: Arrays Table
CREATE TABLE IF NOT EXISTS arrays (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id INTEGER NOT NULL,
    array_number INTEGER NOT NULL,          -- Item
    array_name TEXT NOT NULL,               -- Array Name
    length INTEGER DEFAULT 0,              -- Length
    type_category TEXT DEFAULT 'ARRAY',    -- Type category
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- NEW: Array Values Table
CREATE TABLE IF NOT EXISTS array_values (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    array_id INTEGER NOT NULL,
    index_position INTEGER NOT NULL,
    value REAL DEFAULT 0.0,                 -- Value
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (array_id) REFERENCES arrays(id)
);

-- NEW: Network Points Table
CREATE TABLE IF NOT EXISTS network_points (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id INTEGER NOT NULL,
    item_number INTEGER NOT NULL,           -- Item
    main_panel INTEGER,                     -- Main Panel
    network_device_id INTEGER,              -- Device ID
    point_number INTEGER,                   -- Point number
    object_instance INTEGER,               -- Object instance
    point_type TEXT,                        -- Type
    value REAL DEFAULT 0.0,                 -- Value
    status INTEGER DEFAULT 0,              -- Status
    description TEXT,                       -- Description
    last_contact INTEGER,                   -- Last Contact
    type_category TEXT DEFAULT 'NETWORK_POINT', -- Type category
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- System Configuration (Enhanced)
CREATE TABLE IF NOT EXISTS units (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    units_type INTEGER NOT NULL UNIQUE,
    units_name TEXT NOT NULL,
    units_description TEXT,
    conversion_factor REAL DEFAULT 1.0,
    digital_values TEXT
);

-- NEW: Point Categories Table (for Type field)
CREATE TABLE IF NOT EXISTS point_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_name TEXT NOT NULL UNIQUE,     -- INPUT, OUTPUT, VARIABLE, PROGRAM, PID, etc.
    category_description TEXT,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_devices_network_id ON devices(network_id);
CREATE INDEX IF NOT EXISTS idx_devices_instance ON devices(instance_number);
CREATE INDEX IF NOT EXISTS idx_input_points_device_id ON input_points(device_id);
CREATE INDEX IF NOT EXISTS idx_input_points_number ON input_points(point_number);
CREATE INDEX IF NOT EXISTS idx_output_points_device_id ON output_points(device_id);
CREATE INDEX IF NOT EXISTS idx_output_points_number ON output_points(point_number);
CREATE INDEX IF NOT EXISTS idx_variable_points_device_id ON variable_points(device_id);
CREATE INDEX IF NOT EXISTS idx_variable_points_number ON variable_points(point_number);
CREATE INDEX IF NOT EXISTS idx_schedules_device_id ON schedules(device_id);
CREATE INDEX IF NOT EXISTS idx_programs_device_id ON programs(device_id);
CREATE INDEX IF NOT EXISTS idx_pid_controllers_device_id ON pid_controllers(device_id);
CREATE INDEX IF NOT EXISTS idx_graphics_device_id ON graphics(device_id);
CREATE INDEX IF NOT EXISTS idx_holidays_device_id ON holidays(device_id);
CREATE INDEX IF NOT EXISTS idx_trendlogs_device_id ON trendlogs(device_id);
CREATE INDEX IF NOT EXISTS idx_trendlog_inputs_trendlog_id ON trendlog_inputs(trendlog_id);
CREATE INDEX IF NOT EXISTS idx_trendlog_data_trendlog_id ON trendlog_data(trendlog_id);
CREATE INDEX IF NOT EXISTS idx_trendlog_data_timestamp ON trendlog_data(timestamp);
CREATE INDEX IF NOT EXISTS idx_alarms_device_id ON alarms(device_id);
CREATE INDEX IF NOT EXISTS idx_arrays_device_id ON arrays(device_id);
CREATE INDEX IF NOT EXISTS idx_array_values_array_id ON array_values(array_id);
CREATE INDEX IF NOT EXISTS idx_network_points_device_id ON network_points(device_id);

-- Insert Point Categories
INSERT OR IGNORE INTO point_categories (category_name, category_description) VALUES
('INPUT', 'Input Points'),
('OUTPUT', 'Output Points'),
('VARIABLE', 'Variable Points'),
('PROGRAM', 'Program Points'),
('PID', 'PID Controller Points'),
('GRAPHIC', 'Graphic Points'),
('SCHEDULE', 'Schedule Points'),
('HOLIDAY', 'Holiday Points'),
('TRENDLOG', 'Trend Log Points'),
('ALARM', 'Alarm Points'),
('ARRAY', 'Array Points'),
('NETWORK_POINT', 'Network Points');

-- Insert basic units data (existing units...)
INSERT OR IGNORE INTO units (units_type, units_name, units_description, conversion_factor) VALUES
(0, 'Unused', 'Unused units', 1.0),
(1, 'Deg C', 'Degrees Celsius', 1.0),
(2, 'Deg F', 'Degrees Fahrenheit', 1.0),
(3, 'Deg K', 'Degrees Kelvin', 1.0),
(4, 'PSI', 'Pounds per Square Inch', 1.0),
(5, 'InchWC', 'Inches Water Column', 1.0),
(6, 'FPM', 'Feet per Minute', 1.0),
(7, 'CFM', 'Cubic Feet per Minute', 1.0),
(8, 'RH', 'Relative Humidity %', 1.0),
(9, 'Volts', 'Voltage', 1.0),
(10, 'mAmps', 'Milliamps', 1.0),
(11, 'Hz', 'Frequency', 1.0),
(12, 'Percent', 'Percentage', 1.0),
(13, 'PPM', 'Parts per Million', 1.0),
(14, 'Ohms', 'Resistance', 1.0),
(15, 'BTU', 'British Thermal Units', 1.0),
(16, 'CMH', 'Cubic Meters per Hour', 1.0),
(17, 'GPM', 'Gallons per Minute', 1.0),
(18, 'KPAH', 'Kilopascals per Hour', 1.0),
(19, 'KPA', 'Kilopascals', 1.0),
(20, 'Bar', 'Pressure Bar', 1.0),
(21, 'mBar', 'Millibar', 1.0),
(22, 'mmHG', 'Millimeters Mercury', 1.0),
(23, 'Liter', 'Liters', 1.0),
(24, 'MPS', 'Meters per Second', 1.0),
(25, 'PA', 'Pascals', 1.0),
(26, 'LPS', 'Liters per Second', 1.0),
(27, 'LPM', 'Liters per Minute', 1.0),
(28, 'LPH', 'Liters per Hour', 1.0),
(29, 'kW', 'Kilowatts', 1.0),
(30, 'TONS', 'Tons Refrigeration', 1.0),
(31, 'KWH', 'Kilowatt Hours', 1.0),
(32, 'BTUH', 'BTU per Hour', 1.0);
