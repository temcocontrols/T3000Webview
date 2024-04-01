CREATE TABLE modbus_register_settings (
    name TEXT NOT NULL PRIMARY KEY,
    json_value JSON,
    value TEXT
);
