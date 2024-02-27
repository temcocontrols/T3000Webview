CREATE TABLE modbus_register (
    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    register_address INTEGER NOT NULL,
    operation TEXT,
    register_length INTEGER NOT NULL DEFAULT 1,
    register_name TEXT,
    data_format TEXT NOT NULL,
    description TEXT,
    device_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'NEW',
    unit TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_timestamp
AFTER UPDATE ON modbus_register
FOR EACH ROW
BEGIN
    UPDATE modbus_register SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

CREATE TRIGGER update_status
AFTER UPDATE ON modbus_register
FOR EACH ROW
WHEN OLD.status = 'PUBLISHED'
BEGIN
    UPDATE modbus_register SET status = 'UPDATED' WHERE id = OLD.id;
END;
