use sea_orm_migration::prelude::*;

#[derive(DeriveIden)]
enum TempModbusRegister {
    Table,
    Id,
    RegisterAddress,
    Operation,
    RegisterLength,
    RegisterName,
    DataFormat,
    Description,
    DeviceName,
    DeviceId,
    Status,
    Unit,
    Private,
    CreatedAt,
    UpdatedAt,
}

#[derive(DeriveIden)]
enum ModbusRegisterDevices {
    Table,
    Id,
    RemoteId,
    Name,
    Description,
    Private,
    Status,
    ImageId,
    CreatedAt,
    UpdatedAt,
}

#[derive(DeriveIden)]
enum ModbusRegisterProductDeviceMapping {
    Table,
    ProductId,
    DeviceId,
}

#[derive(DeriveIden)]
enum Files {
    Table,
    Id,
    Name,
    MimeType,
    Path,
    Status,
    CreatedAt,
    UpdatedAt,
}

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Create modbus_register_devices table
        manager
            .create_table(
                Table::create()
                    .table(ModbusRegisterDevices::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(ModbusRegisterDevices::Id)
                            .integer()
                            .auto_increment()
                            .not_null()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(ModbusRegisterDevices::RemoteId)
                            .integer()
                            .unique_key(),
                    )
                    .col(
                        ColumnDef::new(ModbusRegisterDevices::Name)
                            .string()
                            .not_null(),
                    )
                    .col(ColumnDef::new(ModbusRegisterDevices::Description).string())
                    .col(
                        ColumnDef::new(ModbusRegisterDevices::Status)
                            .string()
                            .not_null()
                            .default("NEW"),
                    )
                    .col(
                        ColumnDef::new(ModbusRegisterDevices::Private)
                            .boolean()
                            .not_null()
                            .default(false),
                    )
                    .col(ColumnDef::new(ModbusRegisterDevices::ImageId).integer())
                    .col(
                        ColumnDef::new(ModbusRegisterDevices::CreatedAt)
                            .timestamp()
                            .not_null()
                            .default(SimpleExpr::Keyword(Keyword::CurrentTimestamp)),
                    )
                    .col(
                        ColumnDef::new(ModbusRegisterDevices::UpdatedAt)
                            .timestamp()
                            .not_null()
                            .default(SimpleExpr::Keyword(Keyword::CurrentTimestamp)),
                    )
                    .foreign_key(
                        ForeignKeyCreateStatement::new()
                            .name("device_image_id_fk")
                            .from_tbl(ModbusRegisterDevices::Table)
                            .from_col(ModbusRegisterDevices::ImageId)
                            .to_tbl(Files::Table)
                            .to_col(Files::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_table(
                Table::create()
                    .table(ModbusRegisterProductDeviceMapping::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(ModbusRegisterProductDeviceMapping::ProductId)
                            .integer()
                            .not_null()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(ModbusRegisterProductDeviceMapping::DeviceId)
                            .integer()
                            .not_null(),
                    )
                    .foreign_key(
                        ForeignKeyCreateStatement::new()
                            .name("device_id_fk")
                            .from_tbl(ModbusRegisterProductDeviceMapping::Table)
                            .from_col(ModbusRegisterProductDeviceMapping::DeviceId)
                            .to_tbl(ModbusRegisterDevices::Table)
                            .to_col(ModbusRegisterDevices::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_table(
                Table::create()
                    .table(Files::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Files::Id)
                            .integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(Files::Name).string().not_null())
                    .col(ColumnDef::new(Files::MimeType).string().not_null())
                    .col(ColumnDef::new(Files::Path).string().not_null())
                    .col(
                        ColumnDef::new(Files::Status)
                            .string()
                            .not_null()
                            .default("NEW"),
                    )
                    .col(
                        ColumnDef::new(Files::CreatedAt)
                            .timestamp()
                            .not_null()
                            .default(SimpleExpr::Keyword(Keyword::CurrentTimestamp)),
                    )
                    .col(
                        ColumnDef::new(Files::UpdatedAt)
                            .timestamp()
                            .not_null()
                            .default(SimpleExpr::Keyword(Keyword::CurrentTimestamp)),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_table(
                Table::create()
                    .table(TempModbusRegister::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(TempModbusRegister::Id)
                            .integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(TempModbusRegister::RegisterAddress).integer())
                    .col(ColumnDef::new(TempModbusRegister::Operation).string())
                    .col(
                        ColumnDef::new(TempModbusRegister::RegisterLength)
                            .integer()
                            .not_null()
                            .default(1),
                    )
                    .col(ColumnDef::new(TempModbusRegister::RegisterName).string())
                    .col(ColumnDef::new(TempModbusRegister::DataFormat).string())
                    .col(ColumnDef::new(TempModbusRegister::Description).string())
                    .col(ColumnDef::new(TempModbusRegister::DeviceName).string())
                    .col(ColumnDef::new(TempModbusRegister::DeviceId).integer())
                    .foreign_key(
                        ForeignKeyCreateStatement::new()
                            .name("device_id_fk")
                            .from_tbl(TempModbusRegister::Table)
                            .from_col(TempModbusRegister::DeviceId)
                            .to_tbl(ModbusRegisterDevices::Table)
                            .to_col(ModbusRegisterDevices::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .col(
                        ColumnDef::new(TempModbusRegister::Status)
                            .string()
                            .not_null()
                            .default("NEW"),
                    )
                    .col(ColumnDef::new(TempModbusRegister::Unit).string())
                    .col(
                        ColumnDef::new(TempModbusRegister::Private)
                            .boolean()
                            .default(false),
                    )
                    .col(
                        ColumnDef::new(TempModbusRegister::CreatedAt)
                            .timestamp()
                            .not_null()
                            .default(SimpleExpr::Keyword(Keyword::CurrentTimestamp)),
                    )
                    .col(
                        ColumnDef::new(TempModbusRegister::UpdatedAt)
                            .timestamp()
                            .not_null()
                            .default(SimpleExpr::Keyword(Keyword::CurrentTimestamp)),
                    )
                    .to_owned(),
            )
            .await?;
        let db = manager.get_connection();

        // delete rejected rows from modbus_register
        db.execute_unprepared(
            r#"
            DELETE FROM modbus_register WHERE status = 'REJECTED';
        "#,
        )
        .await?;

        // Create triggers for modbus_register_devices table
        db.execute_unprepared(
            r#"
          CREATE TRIGGER IF NOT EXISTS update_device_timestamp
          AFTER UPDATE ON modbus_register_devices
          FOR EACH ROW
          BEGIN
              UPDATE modbus_register_devices SET updated_at = CURRENT_TIMESTAMP WHERE name = OLD.name;
          END;
      "#,
        )
        .await?;

        // Alter the table to add the new columns
        db.execute_unprepared(
                r#"
                INSERT INTO temp_modbus_register (id, register_address, operation, register_length, register_name, data_format, description, device_name, status, unit, created_at, updated_at)
                SELECT id, register_address, operation, register_length, register_name, data_format, description, device_name, status, unit, created_at, updated_at
                FROM modbus_register;
                DROP TABLE IF EXISTS modbus_register;

                ALTER TABLE temp_modbus_register RENAME TO modbus_register;

                CREATE TRIGGER IF NOT EXISTS update_timestamp
                AFTER UPDATE ON modbus_register
                FOR EACH ROW
                BEGIN
                    UPDATE modbus_register SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
                END;
                UPDATE sqlite_sequence SET seq = 900000 WHERE name = 'modbus_register';
            "#,
            )
            .await?;

        // Insert the temco devices into the modbus_register_devices table
        db.execute_unprepared(
                r#"
            INSERT INTO "modbus_register_devices" ("id", remote_id, "name","description","status","private","created_at","updated_at")
            VALUES
            (1, 1, 'BTU Meter','A BTU meter, also as an energy meter, is a device used to measure the heat energy generated or consumed in a heating or cooling system.','PUBLISHED',0,'2024-02-10 00:00:00','2024-04-29 15:19:08'),
            (2, 2, 'T322AI','Multi-Channel Temperature Monitoring Device.','PUBLISHED',0,'2024-02-10 00:00:00','2024-04-29 15:21:36'),
            (3, 3, 'CO2','The CO2 sensor with Humidity & Temp transmitters are designed for environmental monitoring and controlling in industrial, commercial and other buildings. These transmitters can be used for indoor C02, temperature and humidity monitoring. The modbus interface provides easy setup and integration into large systems.Supports Modbus RTU over both the Ethernet port and the RS485 port,supports Bacnet over both the Ethernet port (IP) and the RS485 port (MSTP).','PUBLISHED',0,'2024-02-10 00:00:00','2024-04-29 15:22:20'),
            (4, 4, 'FAN_MODULE','Fan Speed Control Module.','PUBLISHED',0,'2024-02-10 00:00:00','2024-04-29 15:24:44'),
            (5, 5,'AFS','The air flow switch is used to prove air flow in ducts. It has an adjustable trip point with a range from 200 to 1800 FPM (1 to 9.2 m/sec).','PUBLISHED',0,'2024-02-10 00:00:00','2024-04-29 15:24:24'),
            (6, 6, 'PM2_5','The PM2.5/10 Particle Counter is designed for environmental monitoring in industrial, commercial and institutional buildings,which provides accurate readings of particle counts in five important sizes, 0.5μm,1.0μm,2.5μm,4μm and 10μm.','PUBLISHED',0,'2024-02-10 00:00:00','2024-04-29 15:25:18'),
            (7, 7, 'HUM','Humidity Sensor','PUBLISHED',0,'2024-02-10 00:00:00','2024-04-29 15:26:19'),
            (8, 8, 'Pressure','Single Ended Pressure Transmitter is a kind of standard and most popular transmitter applied in air and liquid pressure measuring,since a high sensitivity silicon pressure chip is employed in the sensor.','PUBLISHED',0,'2024-02-10 00:00:00','2024-04-29 15:27:04'),
            (9, 9, 'T38I8O6DO','Advanced Temperature Control System.','PUBLISHED',0,'2024-02-10 00:00:00','2024-04-29 15:28:24'),
            (10, 10, 'TSTAT8','This full-featured thermostat is designed for cooling and heating systems in residential and commercial buildings.','PUBLISHED',0,'2024-02-10 00:00:00','2024-04-29 15:16:23'),
            (11, 11, 'ZIGBEE_REPEATER',NULL,'PUBLISHED',0,'2024-02-10 00:00:00','2024-02-10 00:00:00'),
            (12, 12, 'T3_8AI13O',NULL,'PUBLISHED',0,'2024-02-10 00:00:00','2024-02-10 00:00:00'),
            (13, 13, 'Transducer2',NULL,'PUBLISHED',0,'2024-02-10 00:00:00','2024-02-10 00:00:00'),
            (14, 14, 'T3PT12',NULL,'PUBLISHED',0,'2024-02-10 00:00:00','2024-02-10 00:00:00'),
            (15, 15, 'CO2_Node',NULL,'PUBLISHED',0,'2024-02-10 00:00:00','2024-02-10 00:00:00'),
            (16, 16, 'PM5E_ARM',NULL,'PUBLISHED',0,'2024-02-10 00:00:00','2024-02-10 00:00:00'),
            (17, 17, 'T3BB',NULL,'PUBLISHED',0,'2024-02-10 00:00:00','2024-02-10 00:00:00'),
            (18, 18, 'T3_32I',NULL,'PUBLISHED',0,'2024-02-10 00:00:00','2024-02-10 00:00:00'),
            (19, 19, 'CM5',NULL,'PUBLISHED',0,'2024-02-10 00:00:00','2024-02-10 00:00:00'),
            (20, 20, 'MultipleSensor',NULL,'PUBLISHED',0,'2024-02-10 00:00:00','2024-02-10 00:00:00'),
            (21, 21, 'T36CTA',NULL,'PUBLISHED',0,'2024-02-10 00:00:00','2024-02-10 00:00:00'),
            (22, 22, 'AirLab',NULL,'PUBLISHED',0,'2024-02-10 00:00:00','2024-02-10 00:00:00'),
            (23, 23, 'CS',NULL,'PUBLISHED',0,'2024-02-10 00:00:00','2024-02-10 00:00:00'),
            (24, 24, 'SPM1',NULL,'PUBLISHED',0,'2024-02-10 00:00:00','2024-02-10 00:00:00');

            UPDATE sqlite_sequence SET seq = 900000 WHERE name = 'modbus_register_devices';

        "#,
            )
            .await?;

        // Insert the device mappings into the modbus_register_product_device_mapping table
        db.execute_unprepared(
            r#"
            INSERT INTO modbus_register_product_device_mapping (product_id, device_id)
            VALUES
              (9, 10),
              (35, 17),
              (74, 17),
              (216, 15),
              (44, 9),
              (43, 2),
              (46, 14),
              (121, 1),
              (95, 21),
              (52, 6),
              (50, 17),
              (63, 11),
              (51, 16),
              (60, 22),
              (62, 22),
              (10, 17),
              (90, 13),
              (210, 3),
              (211, 3),
              (212, 7),
              (213, 7),
              (96, 5),
              (97, 4),
              (36, 23),
              (37, 23),
              (20, 12),
              (22, 18),
              (88, 17),
              (24, 24);

        "#,
        )
        .await?;

        // Insert only missing devices into the modbus_register_devices table
        db.execute_unprepared(
            r#"
            INSERT INTO modbus_register_devices (name, status, created_at, updated_at)
            SELECT DISTINCT device_name, 'NEW', '2024-02-10 00:00:00', '2024-02-10 00:00:00'
            FROM modbus_register
            WHERE device_name NOT IN (
                SELECT name FROM modbus_register_devices
            );
            "#,
        )
        .await?;

        // Map devices IDs from modbus_register_devices into the modbus_register table
        db.execute_unprepared(
            r#"
            UPDATE modbus_register
            SET device_id = (
              SELECT id
              FROM modbus_register_devices
              WHERE name = modbus_register.device_name
            )
            WHERE device_name IS NOT NULL;

            ALTER TABLE modbus_register
            DROP COLUMN device_name;
        "#,
        )
        .await?;

        // Delete old data
        db.execute_unprepared(
            r#"
        DELETE FROM modbus_register WHERE id > 8070 AND id < 12725;
    "#,
        )
        .await?;

        // Insert new data
        db.execute_unprepared(include_str!("../sql/modbus_register.sql"))
            .await?;
        db.execute_unprepared(
            "UPDATE user SET last_modbus_register_pull = '2024-05-15T00:00:00.000Z';",
        )
        .await?;

        // Vacuum the database
        db.execute_unprepared("VACUUM;").await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(TempModbusRegister::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(TempModbusRegister::Id)
                            .integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(TempModbusRegister::RegisterAddress).integer())
                    .col(ColumnDef::new(TempModbusRegister::Operation).string())
                    .col(
                        ColumnDef::new(TempModbusRegister::RegisterLength)
                            .integer()
                            .not_null()
                            .default(1),
                    )
                    .col(ColumnDef::new(TempModbusRegister::RegisterName).string())
                    .col(ColumnDef::new(TempModbusRegister::DataFormat).string())
                    .col(ColumnDef::new(TempModbusRegister::Description).string())
                    .col(ColumnDef::new(TempModbusRegister::DeviceName).string())
                    .col(
                        ColumnDef::new(TempModbusRegister::Status)
                            .string()
                            .not_null()
                            .default("NEW"),
                    )
                    .col(ColumnDef::new(TempModbusRegister::Unit).string())
                    .col(
                        ColumnDef::new(TempModbusRegister::Private)
                            .boolean()
                            .default(false),
                    )
                    .col(
                        ColumnDef::new(TempModbusRegister::CreatedAt)
                            .timestamp()
                            .not_null()
                            .default(SimpleExpr::Keyword(Keyword::CurrentTimestamp)),
                    )
                    .col(
                        ColumnDef::new(TempModbusRegister::UpdatedAt)
                            .timestamp()
                            .not_null()
                            .default(SimpleExpr::Keyword(Keyword::CurrentTimestamp)),
                    )
                    .to_owned(),
            )
            .await?;
        let db = manager.get_connection();
        // Alter the table to add the new columns
        db.execute_unprepared(
            r#"
            INSERT INTO temp_modbus_register (id, register_address, operation, register_length, register_name, data_format, description, device_name, status, unit, created_at, updated_at)
            SELECT id, register_address, operation, register_length, register_name, data_format, description, device_name, status, unit, created_at, updated_at
            FROM modbus_register;

            DROP TABLE IF EXISTS modbus_register;

            ALTER TABLE temp_modbus_register RENAME TO modbus_register;

            CREATE TRIGGER IF NOT EXISTS update_timestamp
            AFTER UPDATE ON modbus_register
            FOR EACH ROW
            BEGIN
                UPDATE modbus_register SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
            END;
            UPDATE sqlite_sequence SET seq = 900000 WHERE name = 'modbus_register';
        "#,
        )
        .await?;

        manager
            .drop_table(
                Table::drop()
                    .table(ModbusRegisterProductDeviceMapping::Table)
                    .if_exists()
                    .to_owned(),
            )
            .await?;

        manager
            .drop_table(
                Table::drop()
                    .table(ModbusRegisterDevices::Table)
                    .if_exists()
                    .to_owned(),
            )
            .await?;

        manager
            .drop_table(Table::drop().table(Files::Table).to_owned())
            .await?;

        // Vacuum the database
        db.execute_unprepared("VACUUM;").await?;

        Ok(())
    }
}
