ALTER TABLE user DROP COLUMN last_modbus_register_pull;

DROP TRIGGER IF EXISTS update_status;

CREATE TRIGGER update_status
AFTER UPDATE ON modbus_register
FOR EACH ROW
WHEN OLD.status = 'PUBLISHED'
BEGIN
    UPDATE modbus_register SET status = 'UPDATED' WHERE id = OLD.id;
END;

