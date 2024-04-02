use sea_orm_migration::{async_trait::async_trait, prelude::*};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[derive(DeriveIden)]
enum ModbusRegister {
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
    CreatedAt,
    UpdatedAt,
}

#[derive(DeriveIden)]
enum ModbusRegisterSettings {
    Table,
    Name,
    JsonValue,
    Value,
}

#[derive(DeriveIden)]
enum User {
    Table,
    Id,
    Name,
    Token,
    LastModbusRegisterPull,
}

#[async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();
        manager
            .create_table(
                Table::create()
                    .table(ModbusRegister::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(ModbusRegister::Id)
                            .integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(ModbusRegister::RegisterAddress)
                            .integer()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(ModbusRegister::Operation)
                            .string()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(ModbusRegister::RegisterLength)
                            .integer()
                            .not_null()
                            .default(1),
                    )
                    .col(ColumnDef::new(ModbusRegister::RegisterName).string())
                    .col(
                        ColumnDef::new(ModbusRegister::DataFormat)
                            .string()
                            .not_null(),
                    )
                    .col(ColumnDef::new(ModbusRegister::Description).string())
                    .col(
                        ColumnDef::new(ModbusRegister::DeviceName)
                            .string()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(ModbusRegister::Status)
                            .string()
                            .not_null()
                            .default("NEW"),
                    )
                    .col(ColumnDef::new(ModbusRegister::Unit).string())
                    .col(
                        ColumnDef::new(ModbusRegister::CreatedAt)
                            .timestamp()
                            .not_null()
                            .default(SimpleExpr::Keyword(Keyword::CurrentTimestamp)),
                    )
                    .col(
                        ColumnDef::new(ModbusRegister::UpdatedAt)
                            .timestamp()
                            .not_null()
                            .default(SimpleExpr::Keyword(Keyword::CurrentTimestamp)),
                    )
                    .to_owned(),
            )
            .await?;

        // Create modbus_register_settings table
        manager
            .create_table(
                Table::create()
                    .table(ModbusRegisterSettings::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(ModbusRegisterSettings::Name)
                            .string()
                            .not_null()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(ModbusRegisterSettings::JsonValue).json())
                    .col(ColumnDef::new(ModbusRegisterSettings::Value).string())
                    .to_owned(),
            )
            .await?;

        // Create user table
        manager
            .create_table(
                Table::create()
                    .table(User::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(User::Id)
                            .integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(User::Name).string().not_null())
                    .col(ColumnDef::new(User::Token).string())
                    .col(ColumnDef::new(User::LastModbusRegisterPull).string())
                    .to_owned(),
            )
            .await?;

        if !manager
            .has_column("user", "last_modbus_register_pull")
            .await?
        {
            manager
                .alter_table(
                    Table::alter()
                        .table(User::Table)
                        .add_column(ColumnDef::new(User::LastModbusRegisterPull).string())
                        .to_owned(),
                )
                .await?;
        }

        // Create triggers for modbus_register table (using raw SQL for now)
        db.execute_unprepared(
            r#"
              CREATE TRIGGER IF NOT EXISTS update_timestamp
              AFTER UPDATE ON modbus_register
              FOR EACH ROW
              BEGIN
                  UPDATE modbus_register SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
              END;
          "#,
        )
        .await?;

        // Drop update status trigger
        db.execute_unprepared(
            r#"
              DROP TRIGGER IF EXISTS update_status;
            "#,
        )
        .await?;

        // Drop the old sqlx migration table
        db.execute_unprepared(
            r#"
          DROP TABLE IF EXISTS _sqlx_migrations;
        "#,
        )
        .await?;

        // Reset the sqlite_sequence for modbus_register table
        db.execute_unprepared(
            r#"
          UPDATE sqlite_sequence SET seq = 900000 WHERE name = 'modbus_register';
          "#,
        )
        .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(ModbusRegister::Table).to_owned())
            .await?;

        manager
            .drop_table(
                Table::drop()
                    .table(ModbusRegisterSettings::Table)
                    .to_owned(),
            )
            .await?;

        manager
            .drop_table(Table::drop().table(User::Table).to_owned())
            .await?;

        Ok(())
    }
}
