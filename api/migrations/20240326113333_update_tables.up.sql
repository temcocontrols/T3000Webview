ALTER TABLE user ADD COLUMN last_modbus_register_pull TEXT;

DROP TRIGGER IF EXISTS update_status;

UPDATE sqlite_sequence SET seq = 900000 WHERE name = 'modbus_register';

CREATE TRIGGER IF NOT EXISTS update_timestamp
AFTER UPDATE ON modbus_register
FOR EACH ROW
BEGIN
    UPDATE modbus_register SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

