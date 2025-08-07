use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Buildings and Infrastructure
        manager
            .create_table(
                Table::create()
                    .table(Buildings::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Buildings::Id)
                            .integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(Buildings::Name).text().not_null())
                    .col(ColumnDef::new(Buildings::Description).text())
                    .col(ColumnDef::new(Buildings::Address).text())
                    .col(
                        ColumnDef::new(Buildings::CreatedAt)
                            .integer()
                            .default(Expr::cust("strftime('%s', 'now')")),
                    )
                    .col(
                        ColumnDef::new(Buildings::UpdatedAt)
                            .integer()
                            .default(Expr::cust("strftime('%s', 'now')")),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_table(
                Table::create()
                    .table(Floors::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Floors::Id)
                            .integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(Floors::BuildingId).integer().not_null())
                    .col(ColumnDef::new(Floors::FloorNumber).integer().not_null())
                    .col(ColumnDef::new(Floors::Name).text().not_null())
                    .col(ColumnDef::new(Floors::Description).text())
                    .col(
                        ColumnDef::new(Floors::CreatedAt)
                            .integer()
                            .default(Expr::cust("strftime('%s', 'now')")),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_table(
                Table::create()
                    .table(Rooms::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Rooms::Id)
                            .integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(Rooms::FloorId).integer().not_null())
                    .col(ColumnDef::new(Rooms::RoomNumber).text().not_null())
                    .col(ColumnDef::new(Rooms::Name).text().not_null())
                    .col(ColumnDef::new(Rooms::Description).text())
                    .col(
                        ColumnDef::new(Rooms::CreatedAt)
                            .integer()
                            .default(Expr::cust("strftime('%s', 'now')")),
                    )
                    .to_owned(),
            )
            .await?;

        // Networks and Devices
        manager
            .create_table(
                Table::create()
                    .table(Networks::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Networks::Id)
                            .integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(Networks::BuildingId).integer().not_null())
                    .col(ColumnDef::new(Networks::Name).text().not_null())
                    .col(ColumnDef::new(Networks::NetworkType).text().not_null())
                    .col(ColumnDef::new(Networks::NetworkNumber).integer())
                    .col(ColumnDef::new(Networks::Description).text())
                    .col(
                        ColumnDef::new(Networks::CreatedAt)
                            .integer()
                            .default(Expr::cust("strftime('%s', 'now')")),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_table(
                Table::create()
                    .table(Devices::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Devices::Id)
                            .integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(Devices::NetworkId).integer().not_null())
                    .col(ColumnDef::new(Devices::RoomId).integer())
                    .col(ColumnDef::new(Devices::DeviceInstance).integer().not_null())
                    .col(ColumnDef::new(Devices::ModbusId).integer())
                    .col(ColumnDef::new(Devices::ProductType).integer().not_null())
                    .col(ColumnDef::new(Devices::ProductName).text().not_null())
                    .col(ColumnDef::new(Devices::DeviceName).text().not_null())
                    .col(ColumnDef::new(Devices::IpAddress).text())
                    .col(ColumnDef::new(Devices::MacAddress).text())
                    .col(ColumnDef::new(Devices::SerialNumber).text())
                    .col(ColumnDef::new(Devices::FirmwareVersion).text())
                    .col(ColumnDef::new(Devices::HardwareVersion).text())
                    .col(ColumnDef::new(Devices::PanelNumber).integer())
                    .col(ColumnDef::new(Devices::SubPanelNumber).integer())
                    .col(ColumnDef::new(Devices::Status).text().default("offline"))
                    .col(ColumnDef::new(Devices::LastSeen).integer())
                    .col(
                        ColumnDef::new(Devices::CreatedAt)
                            .integer()
                            .default(Expr::cust("strftime('%s', 'now')")),
                    )
                    .col(
                        ColumnDef::new(Devices::UpdatedAt)
                            .integer()
                            .default(Expr::cust("strftime('%s', 'now')")),
                    )
                    .to_owned(),
            )
            .await?;

        // Input Points
        manager
            .create_table(
                Table::create()
                    .table(InputPoints::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(InputPoints::Id)
                            .integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(InputPoints::DeviceId).integer().not_null())
                    .col(ColumnDef::new(InputPoints::PointIndex).integer().not_null())
                    .col(ColumnDef::new(InputPoints::PointName).text().not_null())
                    .col(ColumnDef::new(InputPoints::FullLabel).text())
                    .col(ColumnDef::new(InputPoints::Description).text())
                    .col(ColumnDef::new(InputPoints::AutoManual).integer().default(0))
                    .col(ColumnDef::new(InputPoints::Value).double())
                    .col(ColumnDef::new(InputPoints::UnitsId).integer())
                    .col(ColumnDef::new(InputPoints::RangeType).integer())
                    .col(ColumnDef::new(InputPoints::RangeMin).double())
                    .col(ColumnDef::new(InputPoints::RangeMax).double())
                    .col(ColumnDef::new(InputPoints::Calibration).double().default(0.0))
                    .col(ColumnDef::new(InputPoints::Filter).integer().default(0))
                    .col(ColumnDef::new(InputPoints::SignalType).text())
                    .col(ColumnDef::new(InputPoints::FunctionType).integer())
                    .col(ColumnDef::new(InputPoints::CustomTableId).integer())
                    .col(ColumnDef::new(InputPoints::ObjectType).integer().default(0))
                    .col(ColumnDef::new(InputPoints::ObjectInstance).integer())
                    .col(ColumnDef::new(InputPoints::Status).text().default("normal"))
                    .col(
                        ColumnDef::new(InputPoints::CreatedAt)
                            .integer()
                            .default(Expr::cust("strftime('%s', 'now')")),
                    )
                    .col(
                        ColumnDef::new(InputPoints::UpdatedAt)
                            .integer()
                            .default(Expr::cust("strftime('%s', 'now')")),
                    )
                    .to_owned(),
            )
            .await?;

        // Output Points
        manager
            .create_table(
                Table::create()
                    .table(OutputPoints::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(OutputPoints::Id)
                            .integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(OutputPoints::DeviceId).integer().not_null())
                    .col(ColumnDef::new(OutputPoints::PointIndex).integer().not_null())
                    .col(ColumnDef::new(OutputPoints::PointName).text().not_null())
                    .col(ColumnDef::new(OutputPoints::FullLabel).text())
                    .col(ColumnDef::new(OutputPoints::Description).text())
                    .col(ColumnDef::new(OutputPoints::AutoManual).integer().default(0))
                    .col(ColumnDef::new(OutputPoints::HoaSwitch).integer().default(0))
                    .col(ColumnDef::new(OutputPoints::Value).double())
                    .col(ColumnDef::new(OutputPoints::UnitsId).integer())
                    .col(ColumnDef::new(OutputPoints::RangeType).integer())
                    .col(ColumnDef::new(OutputPoints::RangeMin).double())
                    .col(ColumnDef::new(OutputPoints::RangeMax).double())
                    .col(ColumnDef::new(OutputPoints::LowVoltage).double())
                    .col(ColumnDef::new(OutputPoints::HighVoltage).double())
                    .col(ColumnDef::new(OutputPoints::PwmPeriod).integer())
                    .col(ColumnDef::new(OutputPoints::SignalType).text())
                    .col(ColumnDef::new(OutputPoints::FunctionType).integer())
                    .col(ColumnDef::new(OutputPoints::InterlockConditions).text())
                    .col(ColumnDef::new(OutputPoints::OffOnDelay).integer().default(0))
                    .col(ColumnDef::new(OutputPoints::OnOffDelay).integer().default(0))
                    .col(ColumnDef::new(OutputPoints::ObjectType).integer().default(1))
                    .col(ColumnDef::new(OutputPoints::ObjectInstance).integer())
                    .col(ColumnDef::new(OutputPoints::Status).text().default("normal"))
                    .col(
                        ColumnDef::new(OutputPoints::CreatedAt)
                            .integer()
                            .default(Expr::cust("strftime('%s', 'now')")),
                    )
                    .col(
                        ColumnDef::new(OutputPoints::UpdatedAt)
                            .integer()
                            .default(Expr::cust("strftime('%s', 'now')")),
                    )
                    .to_owned(),
            )
            .await?;

        // Variable Points
        manager
            .create_table(
                Table::create()
                    .table(VariablePoints::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(VariablePoints::Id)
                            .integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(VariablePoints::DeviceId).integer().not_null())
                    .col(ColumnDef::new(VariablePoints::PointIndex).integer().not_null())
                    .col(ColumnDef::new(VariablePoints::PointName).text().not_null())
                    .col(ColumnDef::new(VariablePoints::FullLabel).text())
                    .col(ColumnDef::new(VariablePoints::Description).text())
                    .col(ColumnDef::new(VariablePoints::AutoManual).integer().default(0))
                    .col(ColumnDef::new(VariablePoints::Value).double())
                    .col(ColumnDef::new(VariablePoints::UnitsId).integer())
                    .col(ColumnDef::new(VariablePoints::RangeType).integer())
                    .col(ColumnDef::new(VariablePoints::RangeMin).double())
                    .col(ColumnDef::new(VariablePoints::RangeMax).double())
                    .col(ColumnDef::new(VariablePoints::ObjectType).integer().default(2))
                    .col(ColumnDef::new(VariablePoints::ObjectInstance).integer())
                    .col(ColumnDef::new(VariablePoints::Status).text().default("normal"))
                    .col(
                        ColumnDef::new(VariablePoints::CreatedAt)
                            .integer()
                            .default(Expr::cust("strftime('%s', 'now')")),
                    )
                    .col(
                        ColumnDef::new(VariablePoints::UpdatedAt)
                            .integer()
                            .default(Expr::cust("strftime('%s', 'now')")),
                    )
                    .to_owned(),
            )
            .await?;

        // Continue with the rest in the next part...
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(VariablePoints::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(OutputPoints::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(InputPoints::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(Devices::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(Networks::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(Rooms::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(Floors::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(Buildings::Table).to_owned())
            .await?;

        Ok(())
    }
}

// Table definitions
#[derive(DeriveIden)]
enum Buildings {
    Table,
    Id,
    Name,
    Description,
    Address,
    CreatedAt,
    UpdatedAt,
}

#[derive(DeriveIden)]
enum Floors {
    Table,
    Id,
    BuildingId,
    FloorNumber,
    Name,
    Description,
    CreatedAt,
}

#[derive(DeriveIden)]
enum Rooms {
    Table,
    Id,
    FloorId,
    RoomNumber,
    Name,
    Description,
    CreatedAt,
}

#[derive(DeriveIden)]
enum Networks {
    Table,
    Id,
    BuildingId,
    Name,
    NetworkType,
    NetworkNumber,
    Description,
    CreatedAt,
}

#[derive(DeriveIden)]
enum Devices {
    Table,
    Id,
    NetworkId,
    RoomId,
    DeviceInstance,
    ModbusId,
    ProductType,
    ProductName,
    DeviceName,
    IpAddress,
    MacAddress,
    SerialNumber,
    FirmwareVersion,
    HardwareVersion,
    PanelNumber,
    SubPanelNumber,
    Status,
    LastSeen,
    CreatedAt,
    UpdatedAt,
}

#[derive(DeriveIden)]
enum InputPoints {
    Table,
    Id,
    DeviceId,
    PointIndex,
    PointName,
    FullLabel,
    Description,
    AutoManual,
    Value,
    UnitsId,
    RangeType,
    RangeMin,
    RangeMax,
    Calibration,
    Filter,
    SignalType,
    FunctionType,
    CustomTableId,
    ObjectType,
    ObjectInstance,
    Status,
    CreatedAt,
    UpdatedAt,
}

#[derive(DeriveIden)]
enum OutputPoints {
    Table,
    Id,
    DeviceId,
    PointIndex,
    PointName,
    FullLabel,
    Description,
    AutoManual,
    HoaSwitch,
    Value,
    UnitsId,
    RangeType,
    RangeMin,
    RangeMax,
    LowVoltage,
    HighVoltage,
    PwmPeriod,
    SignalType,
    FunctionType,
    InterlockConditions,
    OffOnDelay,
    OnOffDelay,
    ObjectType,
    ObjectInstance,
    Status,
    CreatedAt,
    UpdatedAt,
}

#[derive(DeriveIden)]
enum VariablePoints {
    Table,
    Id,
    DeviceId,
    PointIndex,
    PointName,
    FullLabel,
    Description,
    AutoManual,
    Value,
    UnitsId,
    RangeType,
    RangeMin,
    RangeMax,
    ObjectType,
    ObjectInstance,
    Status,
    CreatedAt,
    UpdatedAt,
}
