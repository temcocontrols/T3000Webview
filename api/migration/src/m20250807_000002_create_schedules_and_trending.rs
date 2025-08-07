use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Schedules
        manager
            .create_table(
                Table::create()
                    .table(Schedules::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Schedules::Id)
                            .integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(Schedules::DeviceId).integer().not_null())
                    .col(ColumnDef::new(Schedules::ScheduleIndex).integer().not_null())
                    .col(ColumnDef::new(Schedules::ScheduleName).text().not_null())
                    .col(ColumnDef::new(Schedules::Description).text())
                    .col(ColumnDef::new(Schedules::AutoManual).integer().default(0))
                    .col(ColumnDef::new(Schedules::OutputPointId).integer())
                    .col(ColumnDef::new(Schedules::Holiday1Id).integer())
                    .col(ColumnDef::new(Schedules::Holiday1Status).integer())
                    .col(ColumnDef::new(Schedules::Holiday2Id).integer())
                    .col(ColumnDef::new(Schedules::Holiday2Status).integer())
                    .col(ColumnDef::new(Schedules::Status).text().default("inactive"))
                    .col(
                        ColumnDef::new(Schedules::CreatedAt)
                            .integer()
                            .default(Expr::cust("strftime('%s', 'now')")),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_table(
                Table::create()
                    .table(ScheduleDetails::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(ScheduleDetails::Id)
                            .integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(ScheduleDetails::ScheduleId).integer().not_null())
                    .col(ColumnDef::new(ScheduleDetails::DayOfWeek).integer().not_null())
                    .col(ColumnDef::new(ScheduleDetails::TimeSlot).integer().not_null())
                    .col(ColumnDef::new(ScheduleDetails::StartTime).text())
                    .col(ColumnDef::new(ScheduleDetails::EndTime).text())
                    .col(ColumnDef::new(ScheduleDetails::Value).double())
                    .to_owned(),
            )
            .await?;

        // Holidays
        manager
            .create_table(
                Table::create()
                    .table(Holidays::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Holidays::Id)
                            .integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(Holidays::DeviceId).integer().not_null())
                    .col(ColumnDef::new(Holidays::HolidayIndex).integer().not_null())
                    .col(ColumnDef::new(Holidays::HolidayName).text().not_null())
                    .col(ColumnDef::new(Holidays::Description).text())
                    .col(ColumnDef::new(Holidays::AutoManual).integer().default(0))
                    .col(ColumnDef::new(Holidays::DateStart).text())
                    .col(ColumnDef::new(Holidays::DateEnd).text())
                    .col(ColumnDef::new(Holidays::Value).double())
                    .col(ColumnDef::new(Holidays::Status).text().default("inactive"))
                    .col(
                        ColumnDef::new(Holidays::CreatedAt)
                            .integer()
                            .default(Expr::cust("strftime('%s', 'now')")),
                    )
                    .to_owned(),
            )
            .await?;

        // Programs
        manager
            .create_table(
                Table::create()
                    .table(Programs::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Programs::Id)
                            .integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(Programs::DeviceId).integer().not_null())
                    .col(ColumnDef::new(Programs::ProgramIndex).integer().not_null())
                    .col(ColumnDef::new(Programs::ProgramName).text().not_null())
                    .col(ColumnDef::new(Programs::Description).text())
                    .col(ColumnDef::new(Programs::AutoManual).integer().default(0))
                    .col(ColumnDef::new(Programs::ProgramSize).integer().default(0))
                    .col(ColumnDef::new(Programs::ExecutionTime).integer().default(0))
                    .col(ColumnDef::new(Programs::ProgramText).text())
                    .col(ColumnDef::new(Programs::Status).text().default("stopped"))
                    .col(
                        ColumnDef::new(Programs::CreatedAt)
                            .integer()
                            .default(Expr::cust("strftime('%s', 'now')")),
                    )
                    .col(
                        ColumnDef::new(Programs::UpdatedAt)
                            .integer()
                            .default(Expr::cust("strftime('%s', 'now')")),
                    )
                    .to_owned(),
            )
            .await?;

        // Trendlogs
        manager
            .create_table(
                Table::create()
                    .table(Trendlogs::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Trendlogs::Id)
                            .integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(Trendlogs::DeviceId).integer().not_null())
                    .col(ColumnDef::new(Trendlogs::TrendlogIndex).integer().not_null())
                    .col(ColumnDef::new(Trendlogs::TrendlogName).text().not_null())
                    .col(ColumnDef::new(Trendlogs::Description).text())
                    .col(ColumnDef::new(Trendlogs::PointType).text().not_null())
                    .col(ColumnDef::new(Trendlogs::PointId).integer().not_null())
                    .col(ColumnDef::new(Trendlogs::IntervalSeconds).integer().not_null())
                    .col(ColumnDef::new(Trendlogs::BufferSize).integer().default(1000))
                    .col(ColumnDef::new(Trendlogs::Status).text().default("inactive"))
                    .col(
                        ColumnDef::new(Trendlogs::CreatedAt)
                            .integer()
                            .default(Expr::cust("strftime('%s', 'now')")),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_table(
                Table::create()
                    .table(TrendlogData::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(TrendlogData::Id)
                            .integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(TrendlogData::TrendlogId).integer().not_null())
                    .col(ColumnDef::new(TrendlogData::Timestamp).integer().not_null())
                    .col(ColumnDef::new(TrendlogData::Value).double().not_null())
                    .col(ColumnDef::new(TrendlogData::Quality).integer().default(0))
                    .col(
                        ColumnDef::new(TrendlogData::CreatedAt)
                            .integer()
                            .default(Expr::cust("strftime('%s', 'now')")),
                    )
                    .to_owned(),
            )
            .await?;

        // Timebase Configuration
        manager
            .create_table(
                Table::create()
                    .table(TimebaseConfig::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(TimebaseConfig::Id)
                            .integer()
                            .not_null()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(TimebaseConfig::Name).text().not_null().unique_key())
                    .col(ColumnDef::new(TimebaseConfig::IntervalSeconds).integer().not_null())
                    .col(ColumnDef::new(TimebaseConfig::RetentionDays).integer().not_null())
                    .col(ColumnDef::new(TimebaseConfig::Description).text())
                    .col(ColumnDef::new(TimebaseConfig::IsActive).integer().default(1))
                    .col(
                        ColumnDef::new(TimebaseConfig::CreatedAt)
                            .integer()
                            .default(Expr::cust("strftime('%s', 'now')")),
                    )
                    .to_owned(),
            )
            .await?;

        // Supporting Tables
        manager
            .create_table(
                Table::create()
                    .table(Units::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Units::Id)
                            .integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(Units::UnitName).text().not_null().unique_key())
                    .col(ColumnDef::new(Units::UnitSymbol).text())
                    .col(ColumnDef::new(Units::UnitType).text())
                    .col(ColumnDef::new(Units::ConversionFactor).double().default(1.0))
                    .to_owned(),
            )
            .await?;

        manager
            .create_table(
                Table::create()
                    .table(CustomTables::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(CustomTables::Id)
                            .integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(CustomTables::DeviceId).integer().not_null())
                    .col(ColumnDef::new(CustomTables::TableName).text().not_null())
                    .col(ColumnDef::new(CustomTables::TableData).text())
                    .to_owned(),
            )
            .await?;

        manager
            .create_table(
                Table::create()
                    .table(Alarms::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Alarms::Id)
                            .integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(Alarms::DeviceId).integer().not_null())
                    .col(ColumnDef::new(Alarms::AlarmIndex).integer().not_null())
                    .col(ColumnDef::new(Alarms::Message).text().not_null())
                    .col(ColumnDef::new(Alarms::AlarmTime).integer().not_null())
                    .col(ColumnDef::new(Alarms::Acknowledged).integer().default(0))
                    .col(ColumnDef::new(Alarms::AcknowledgedBy).text())
                    .col(ColumnDef::new(Alarms::AcknowledgedTime).integer())
                    .col(ColumnDef::new(Alarms::Resolved).integer().default(0))
                    .col(ColumnDef::new(Alarms::ResolvedTime).integer())
                    .col(ColumnDef::new(Alarms::Priority).integer().default(0))
                    .col(
                        ColumnDef::new(Alarms::CreatedAt)
                            .integer()
                            .default(Expr::cust("strftime('%s', 'now')")),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_table(
                Table::create()
                    .table(PidControllers::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(PidControllers::Id)
                            .integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(PidControllers::DeviceId).integer().not_null())
                    .col(ColumnDef::new(PidControllers::PidIndex).integer().not_null())
                    .col(ColumnDef::new(PidControllers::InputPointId).integer())
                    .col(ColumnDef::new(PidControllers::OutputPointId).integer())
                    .col(ColumnDef::new(PidControllers::SetpointPointId).integer())
                    .col(ColumnDef::new(PidControllers::ProportionalGain).double().default(1.0))
                    .col(ColumnDef::new(PidControllers::IntegralTime).integer().default(0))
                    .col(ColumnDef::new(PidControllers::DerivativeTime).integer().default(0))
                    .col(ColumnDef::new(PidControllers::Bias).double().default(0.0))
                    .col(ColumnDef::new(PidControllers::Action).text().default("DIRECT"))
                    .col(ColumnDef::new(PidControllers::AutoManual).integer().default(0))
                    .col(ColumnDef::new(PidControllers::Status).text().default("inactive"))
                    .col(
                        ColumnDef::new(PidControllers::CreatedAt)
                            .integer()
                            .default(Expr::cust("strftime('%s', 'now')")),
                    )
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(PidControllers::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(Alarms::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(CustomTables::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(Units::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(TimebaseConfig::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(TrendlogData::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(Trendlogs::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(Programs::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(Holidays::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(ScheduleDetails::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(Schedules::Table).to_owned())
            .await?;

        Ok(())
    }
}

// Table definitions
#[derive(DeriveIden)]
enum Schedules {
    Table,
    Id,
    DeviceId,
    ScheduleIndex,
    ScheduleName,
    Description,
    AutoManual,
    OutputPointId,
    Holiday1Id,
    Holiday1Status,
    Holiday2Id,
    Holiday2Status,
    Status,
    CreatedAt,
}

#[derive(DeriveIden)]
enum ScheduleDetails {
    Table,
    Id,
    ScheduleId,
    DayOfWeek,
    TimeSlot,
    StartTime,
    EndTime,
    Value,
}

#[derive(DeriveIden)]
enum Holidays {
    Table,
    Id,
    DeviceId,
    HolidayIndex,
    HolidayName,
    Description,
    AutoManual,
    DateStart,
    DateEnd,
    Value,
    Status,
    CreatedAt,
}

#[derive(DeriveIden)]
enum Programs {
    Table,
    Id,
    DeviceId,
    ProgramIndex,
    ProgramName,
    Description,
    AutoManual,
    ProgramSize,
    ExecutionTime,
    ProgramText,
    Status,
    CreatedAt,
    UpdatedAt,
}

#[derive(DeriveIden)]
enum Trendlogs {
    Table,
    Id,
    DeviceId,
    TrendlogIndex,
    TrendlogName,
    Description,
    PointType,
    PointId,
    IntervalSeconds,
    BufferSize,
    Status,
    CreatedAt,
}

#[derive(DeriveIden)]
enum TrendlogData {
    Table,
    Id,
    TrendlogId,
    Timestamp,
    Value,
    Quality,
    CreatedAt,
}

#[derive(DeriveIden)]
enum TimebaseConfig {
    Table,
    Id,
    Name,
    IntervalSeconds,
    RetentionDays,
    Description,
    IsActive,
    CreatedAt,
}

#[derive(DeriveIden)]
enum Units {
    Table,
    Id,
    UnitName,
    UnitSymbol,
    UnitType,
    ConversionFactor,
}

#[derive(DeriveIden)]
enum CustomTables {
    Table,
    Id,
    DeviceId,
    TableName,
    TableData,
}

#[derive(DeriveIden)]
enum Alarms {
    Table,
    Id,
    DeviceId,
    AlarmIndex,
    Message,
    AlarmTime,
    Acknowledged,
    AcknowledgedBy,
    AcknowledgedTime,
    Resolved,
    ResolvedTime,
    Priority,
    CreatedAt,
}

#[derive(DeriveIden)]
enum PidControllers {
    Table,
    Id,
    DeviceId,
    PidIndex,
    InputPointId,
    OutputPointId,
    SetpointPointId,
    ProportionalGain,
    IntegralTime,
    DerivativeTime,
    Bias,
    Action,
    AutoManual,
    Status,
    CreatedAt,
}
