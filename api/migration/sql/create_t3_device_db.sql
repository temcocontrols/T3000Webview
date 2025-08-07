-- T3000 Device Database Schema
-- Complete schema for T3000 buildings, networks, devices, and data points

-- Buildings and Infrastructure
CREATE TABLE IF NOT EXISTS buildings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    address TEXT,
    description TEXT,
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

-- Networks and Devices
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
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Data Points (I/O)
CREATE TABLE IF NOT EXISTS input_points (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id INTEGER NOT NULL,
    point_number INTEGER NOT NULL,
    label TEXT,
    description TEXT,
    units_type INTEGER DEFAULT 0,
    value REAL DEFAULT 0.0,
    range_min REAL DEFAULT 0.0,
    range_max REAL DEFAULT 100.0,
    calibration REAL DEFAULT 0.0,
    status INTEGER DEFAULT 0,
    filter INTEGER DEFAULT 0,
    decom INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE TABLE IF NOT EXISTS output_points (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id INTEGER NOT NULL,
    point_number INTEGER NOT NULL,
    label TEXT,
    description TEXT,
    units_type INTEGER DEFAULT 0,
    value REAL DEFAULT 0.0,
    range_min REAL DEFAULT 0.0,
    range_max REAL DEFAULT 100.0,
    low_voltage REAL DEFAULT 0.0,
    high_voltage REAL DEFAULT 10.0,
    pwm_period INTEGER DEFAULT 100,
    status INTEGER DEFAULT 0,
    decom INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE TABLE IF NOT EXISTS variable_points (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id INTEGER NOT NULL,
    point_number INTEGER NOT NULL,
    label TEXT,
    description TEXT,
    units_type INTEGER DEFAULT 0,
    value REAL DEFAULT 0.0,
    range_min REAL DEFAULT 0.0,
    range_max REAL DEFAULT 100.0,
    status INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Schedule System
CREATE TABLE IF NOT EXISTS schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id INTEGER NOT NULL,
    schedule_number INTEGER NOT NULL,
    label TEXT,
    description TEXT,
    auto_manual INTEGER DEFAULT 0,
    output_point INTEGER,
    holiday_index INTEGER,
    status INTEGER DEFAULT 0,
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

CREATE TABLE IF NOT EXISTS annual_schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id INTEGER NOT NULL,
    schedule_number INTEGER NOT NULL,
    label TEXT,
    description TEXT,
    output_point INTEGER,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE TABLE IF NOT EXISTS holidays (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    annual_schedule_id INTEGER NOT NULL,
    holiday_index INTEGER NOT NULL,
    month INTEGER NOT NULL,
    day INTEGER NOT NULL,
    value REAL DEFAULT 0.0,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Program and Control
CREATE TABLE IF NOT EXISTS programs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id INTEGER NOT NULL,
    program_number INTEGER NOT NULL,
    label TEXT,
    description TEXT,
    program_code TEXT,
    auto_manual INTEGER DEFAULT 0,
    size_bytes INTEGER DEFAULT 0,
    execution_time INTEGER DEFAULT 0,
    status INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Trending and Logging
CREATE TABLE IF NOT EXISTS trendlogs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id INTEGER NOT NULL,
    trendlog_number INTEGER NOT NULL,
    label TEXT,
    description TEXT,
    input_point INTEGER,
    interval_seconds INTEGER DEFAULT 60,
    buffer_size INTEGER DEFAULT 1000,
    status INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE TABLE IF NOT EXISTS trendlog_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trendlog_id INTEGER NOT NULL,
    timestamp INTEGER NOT NULL,
    value REAL NOT NULL,
    quality INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Alarms and Events
CREATE TABLE IF NOT EXISTS alarms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id INTEGER NOT NULL,
    alarm_number INTEGER NOT NULL,
    label TEXT,
    description TEXT,
    input_point INTEGER,
    alarm_type INTEGER DEFAULT 0,
    threshold_high REAL,
    threshold_low REAL,
    status INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- System Configuration
CREATE TABLE IF NOT EXISTS units (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    units_type INTEGER NOT NULL UNIQUE,
    units_name TEXT NOT NULL,
    units_description TEXT,
    conversion_factor REAL DEFAULT 1.0,
    digital_values TEXT
);

CREATE TABLE IF NOT EXISTS pid_controllers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id INTEGER NOT NULL,
    pid_number INTEGER NOT NULL,
    label TEXT,
    description TEXT,
    input_point INTEGER,
    output_point INTEGER,
    setpoint_point INTEGER,
    proportional_gain REAL DEFAULT 1.0,
    bias REAL DEFAULT 0.0,
    auto_manual INTEGER DEFAULT 0,
    status INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_devices_network_id ON devices(network_id);
CREATE INDEX IF NOT EXISTS idx_devices_instance ON devices(instance_number);
CREATE INDEX IF NOT EXISTS idx_input_points_device_id ON input_points(device_id);
CREATE INDEX IF NOT EXISTS idx_output_points_device_id ON output_points(device_id);
CREATE INDEX IF NOT EXISTS idx_variable_points_device_id ON variable_points(device_id);
CREATE INDEX IF NOT EXISTS idx_schedules_device_id ON schedules(device_id);
CREATE INDEX IF NOT EXISTS idx_programs_device_id ON programs(device_id);
CREATE INDEX IF NOT EXISTS idx_trendlogs_device_id ON trendlogs(device_id);
CREATE INDEX IF NOT EXISTS idx_trendlog_data_trendlog_id ON trendlog_data(trendlog_id);
CREATE INDEX IF NOT EXISTS idx_trendlog_data_timestamp ON trendlog_data(timestamp);
CREATE INDEX IF NOT EXISTS idx_alarms_device_id ON alarms(device_id);

-- Insert basic units data
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
