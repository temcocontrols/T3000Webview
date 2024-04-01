CREATE TABLE IF NOT EXISTS modbus_register_settings (
    name TEXT NOT NULL PRIMARY KEY,
    json_value JSON,
    value TEXT
);
