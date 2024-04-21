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
    Status,
    Unit,
    Private,
    CreatedAt,
    UpdatedAt,
}

#[derive(DeriveIden)]
enum ModbusRegisterDevices {
    Table,
    Name,
    Description,
    Private,
    Status,
    CreatedAt,
    UpdatedAt,
}

#[derive(DeriveIden)]
enum ModbusRegisterDeviceNameIdMapping {
    Table,
    Id,
    Name,
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
                        ColumnDef::new(ModbusRegisterDevices::Name)
                            .string()
                            .not_null()
                            .primary_key(),
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
                            .default(false),
                    )
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
                    .to_owned(),
            )
            .await?;

        manager
            .create_table(
                Table::create()
                    .table(ModbusRegisterDeviceNameIdMapping::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(ModbusRegisterDeviceNameIdMapping::Id)
                            .integer()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(ModbusRegisterDeviceNameIdMapping::Name)
                            .string()
                            .not_null(),
                    )
                    .foreign_key(
                        ForeignKeyCreateStatement::new()
                            .name("device__mapping_name_fk")
                            .from_tbl(ModbusRegisterDeviceNameIdMapping::Table)
                            .from_col(ModbusRegisterDeviceNameIdMapping::Name)
                            .to_tbl(ModbusRegisterDevices::Table)
                            .to_col(ModbusRegisterDevices::Name),
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
                    .foreign_key(
                        ForeignKeyCreateStatement::new()
                            .name("device_name_fk")
                            .from_tbl(TempModbusRegister::Table)
                            .from_col(TempModbusRegister::DeviceName)
                            .to_tbl(ModbusRegisterDevices::Table)
                            .to_col(ModbusRegisterDevices::Name),
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

        // Insert the devices into the modbus_register_devices table
        db.execute_unprepared(
            r#"
            INSERT INTO modbus_register_devices (name, status, created_at, updated_at)
            SELECT DISTINCT device_name, 'PUBLISHED', '2024-02-10 00:00:00', '2024-02-10 00:00:00'
            FROM modbus_register;
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
        "#,
        )
        .await?;

        // Insert the device mappings into the modbus_register_devices table
        db.execute_unprepared(
            r#"
        INSERT OR IGNORE INTO modbus_register_devices (name, status, created_at, updated_at)
        VALUES
          ('TSTAT8', 'PUBLISHED', '2024-02-10 00:00:00', '2024-02-10 00:00:00'),
          ('T3BB', 'PUBLISHED', '2024-02-10 00:00:00', '2024-02-10 00:00:00'),
          ('CO2_Node', 'PUBLISHED', '2024-02-10 00:00:00', '2024-02-10 00:00:00'),
          ('T38I8O6DO', 'PUBLISHED', '2024-02-10 00:00:00', '2024-02-10 00:00:00'),
          ('T322AI', 'PUBLISHED', '2024-02-10 00:00:00', '2024-02-10 00:00:00'),
          ('T3PT12', 'PUBLISHED', '2024-02-10 00:00:00', '2024-02-10 00:00:00'),
          ('BTU Meter', 'PUBLISHED', '2024-02-10 00:00:00', '2024-02-10 00:00:00'),
          ('T36CTA', 'PUBLISHED', '2024-02-10 00:00:00', '2024-02-10 00:00:00'),
          ('PM2_5', 'PUBLISHED', '2024-02-10 00:00:00', '2024-02-10 00:00:00'),
          ('ZIGBEE_REPEATER', 'PUBLISHED', '2024-02-10 00:00:00', '2024-02-10 00:00:00'),
          ('PM5E_ARM', 'PUBLISHED', '2024-02-10 00:00:00', '2024-02-10 00:00:00'),
          ('AirLab', 'PUBLISHED', '2024-02-10 00:00:00', '2024-02-10 00:00:00'),
          ('Transducer2', 'PUBLISHED', '2024-02-10 00:00:00', '2024-02-10 00:00:00'),
          ('CO2', 'PUBLISHED', '2024-02-10 00:00:00', '2024-02-10 00:00:00'),
          ('HUM', 'PUBLISHED', '2024-02-10 00:00:00', '2024-02-10 00:00:00'),
          ('AFS', 'PUBLISHED', '2024-02-10 00:00:00', '2024-02-10 00:00:00'),
          ('FAN_MODULE', 'PUBLISHED', '2024-02-10 00:00:00', '2024-02-10 00:00:00'),
          ('T3_8AI13O', 'PUBLISHED', '2024-02-10 00:00:00', '2024-02-10 00:00:00'),
          ('T3_32I', 'PUBLISHED', '2024-02-10 00:00:00', '2024-02-10 00:00:00'),
          ('Pressure', 'PUBLISHED', '2024-02-10 00:00:00', '2024-02-10 00:00:00'),
          ('CS', 'PUBLISHED', '2024-02-10 00:00:00', '2024-02-10 00:00:00');
          ('SPM1', 'PUBLISHED', '2024-02-10 00:00:00', '2024-02-10 00:00:00');

    "#,
        )
        .await?;

        // Insert the device mappings into the modbus_register_device_name_id_mapping table
        db.execute_unprepared(
            r#"
            INSERT INTO modbus_register_device_name_id_mapping (id, name)
            VALUES
              (9, 'TSTAT8'),
              (35, 'T3BB'),
              (74, 'T3BB'),
              (216, 'CO2_Node'),
              (44, 'T38I8O6DO'),
              (43, 'T322AI'),
              (46, 'T3PT12'),
              (121, 'BTU Meter'),
              (95, 'T36CTA'),
              (52, 'PM2_5'),
              (50, 'T3BB'),
              (63, 'ZIGBEE_REPEATER'),
              (51, 'PM5E_ARM'),
              (60, 'AirLab'),
              (62, 'AirLab'),
              (10, 'T3BB'),
              (90, 'Transducer2'),
              (210, 'CO2'),
              (211, 'CO2'),
              (212, 'HUM'),
              (213, 'HUM'),
              (96, 'AFS'),
              (97, 'FAN_MODULE'),
              (36, 'CS'),
              (37, 'CS'),
              (20, 'T3_8AI13O'),
              (22, 'T3_32I'),
              (88, 'T3BB'),
              (7, 'TSTAT8'),
              (93, 'TSTAT8'),
              (214, 'Pressure'),
              (215, 'Pressure');
        "#,
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
        "#,
        )
        .await?;

        manager
            .drop_table(
                Table::drop()
                    .table(ModbusRegisterDeviceNameIdMapping::Table)
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

        // Vacuum the database
        db.execute_unprepared("VACUUM;").await?;

        Ok(())
    }
}
