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

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
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

        // Vacuum the database
        db.execute_unprepared("VACUUM;").await?;

        Ok(())
    }
}
