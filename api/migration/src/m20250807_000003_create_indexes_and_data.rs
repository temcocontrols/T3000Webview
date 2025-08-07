use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Create performance indexes (no foreign keys)

        // Device and Point Indexes
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_devices_instance")
                    .table(Devices::Table)
                    .col(Devices::DeviceInstance)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_devices_product_type")
                    .table(Devices::Table)
                    .col(Devices::ProductType)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_devices_network")
                    .table(Devices::Table)
                    .col(Devices::NetworkId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_devices_status")
                    .table(Devices::Table)
                    .col(Devices::Status)
                    .to_owned(),
            )
            .await?;

        // Point Indexes
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_input_points_device")
                    .table(InputPoints::Table)
                    .col(InputPoints::DeviceId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_input_points_index")
                    .table(InputPoints::Table)
                    .col(InputPoints::DeviceId)
                    .col(InputPoints::PointIndex)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_output_points_device")
                    .table(OutputPoints::Table)
                    .col(OutputPoints::DeviceId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_output_points_index")
                    .table(OutputPoints::Table)
                    .col(OutputPoints::DeviceId)
                    .col(OutputPoints::PointIndex)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_variable_points_device")
                    .table(VariablePoints::Table)
                    .col(VariablePoints::DeviceId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_variable_points_index")
                    .table(VariablePoints::Table)
                    .col(VariablePoints::DeviceId)
                    .col(VariablePoints::PointIndex)
                    .to_owned(),
            )
            .await?;

        // Trending Indexes
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_trendlogs_device")
                    .table(Trendlogs::Table)
                    .col(Trendlogs::DeviceId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_trendlogs_point")
                    .table(Trendlogs::Table)
                    .col(Trendlogs::PointType)
                    .col(Trendlogs::PointId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_trendlog_data_time")
                    .table(TrendlogData::Table)
                    .col(TrendlogData::TrendlogId)
                    .col(TrendlogData::Timestamp)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_trendlog_data_timestamp")
                    .table(TrendlogData::Table)
                    .col(TrendlogData::Timestamp)
                    .to_owned(),
            )
            .await?;

        // Schedule Indexes
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_schedules_device")
                    .table(Schedules::Table)
                    .col(Schedules::DeviceId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_schedule_details_schedule")
                    .table(ScheduleDetails::Table)
                    .col(ScheduleDetails::ScheduleId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_holidays_device")
                    .table(Holidays::Table)
                    .col(Holidays::DeviceId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_programs_device")
                    .table(Programs::Table)
                    .col(Programs::DeviceId)
                    .to_owned(),
            )
            .await?;

        // Alarm Indexes
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_alarms_device_time")
                    .table(Alarms::Table)
                    .col(Alarms::DeviceId)
                    .col(Alarms::AlarmTime)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_alarms_priority")
                    .table(Alarms::Table)
                    .col(Alarms::Priority)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_alarms_status")
                    .table(Alarms::Table)
                    .col(Alarms::Acknowledged)
                    .col(Alarms::Resolved)
                    .to_owned(),
            )
            .await?;

        // Insert initial data

        // Default Timebase Configuration
        manager
            .exec_stmt(
                Query::insert()
                    .into_table(TimebaseConfig::Table)
                    .columns([
                        TimebaseConfig::Id,
                        TimebaseConfig::Name,
                        TimebaseConfig::IntervalSeconds,
                        TimebaseConfig::RetentionDays,
                        TimebaseConfig::Description,
                        TimebaseConfig::IsActive,
                    ])
                    .values_panic([
                        1.into(),
                        "1-minute".into(),
                        60.into(),
                        7.into(),
                        "High-resolution trending - 1 week retention".into(),
                        1.into(),
                    ])
                    .values_panic([
                        2.into(),
                        "5-minutes".into(),
                        300.into(),
                        30.into(),
                        "Standard trending - 1 month retention".into(),
                        1.into(),
                    ])
                    .values_panic([
                        3.into(),
                        "15-minutes".into(),
                        900.into(),
                        90.into(),
                        "Medium-resolution trending - 3 months retention".into(),
                        1.into(),
                    ])
                    .values_panic([
                        4.into(),
                        "30-minutes".into(),
                        1800.into(),
                        180.into(),
                        "Lower-resolution trending - 6 months retention".into(),
                        1.into(),
                    ])
                    .values_panic([
                        5.into(),
                        "1-hour".into(),
                        3600.into(),
                        365.into(),
                        "Hourly trending - 1 year retention".into(),
                        1.into(),
                    ])
                    .values_panic([
                        6.into(),
                        "2-hours".into(),
                        7200.into(),
                        730.into(),
                        "Bi-hourly trending - 2 years retention".into(),
                        1.into(),
                    ])
                    .values_panic([
                        7.into(),
                        "4-hours".into(),
                        14400.into(),
                        1095.into(),
                        "Quarterly-daily trending - 3 years retention".into(),
                        1.into(),
                    ])
                    .values_panic([
                        8.into(),
                        "1-day".into(),
                        86400.into(),
                        1825.into(),
                        "Daily trending - 5 years retention".into(),
                        1.into(),
                    ])
                    .values_panic([
                        9.into(),
                        "4-days".into(),
                        345600.into(),
                        3650.into(),
                        "Weekly trending - 10 years retention".into(),
                        1.into(),
                    ])
                    .to_owned(),
            )
            .await?;

        // Common Engineering Units
        manager
            .exec_stmt(
                Query::insert()
                    .into_table(Units::Table)
                    .columns([
                        Units::UnitName,
                        Units::UnitSymbol,
                        Units::UnitType,
                        Units::ConversionFactor,
                    ])
                    .values_panic([
                        "Degrees Celsius".into(),
                        "°C".into(),
                        "Temperature".into(),
                        1.0.into(),
                    ])
                    .values_panic([
                        "Degrees Fahrenheit".into(),
                        "°F".into(),
                        "Temperature".into(),
                        1.8.into(),
                    ])
                    .values_panic([
                        "Kelvin".into(),
                        "K".into(),
                        "Temperature".into(),
                        1.0.into(),
                    ])
                    .values_panic([
                        "Percent".into(),
                        "%".into(),
                        "Ratio".into(),
                        1.0.into(),
                    ])
                    .values_panic([
                        "Parts Per Million".into(),
                        "ppm".into(),
                        "Concentration".into(),
                        1.0.into(),
                    ])
                    .values_panic([
                        "Pascals".into(),
                        "Pa".into(),
                        "Pressure".into(),
                        1.0.into(),
                    ])
                    .values_panic([
                        "Kilopascals".into(),
                        "kPa".into(),
                        "Pressure".into(),
                        1000.0.into(),
                    ])
                    .values_panic([
                        "PSI".into(),
                        "psi".into(),
                        "Pressure".into(),
                        6894.76.into(),
                    ])
                    .values_panic([
                        "Cubic Feet per Minute".into(),
                        "CFM".into(),
                        "Flow".into(),
                        1.0.into(),
                    ])
                    .values_panic([
                        "Liters per Second".into(),
                        "L/s".into(),
                        "Flow".into(),
                        1.0.into(),
                    ])
                    .values_panic([
                        "Volts".into(),
                        "V".into(),
                        "Voltage".into(),
                        1.0.into(),
                    ])
                    .values_panic([
                        "Millivolts".into(),
                        "mV".into(),
                        "Voltage".into(),
                        0.001.into(),
                    ])
                    .values_panic([
                        "Amperes".into(),
                        "A".into(),
                        "Current".into(),
                        1.0.into(),
                    ])
                    .values_panic([
                        "Milliamperes".into(),
                        "mA".into(),
                        "Current".into(),
                        0.001.into(),
                    ])
                    .values_panic([
                        "No Units".into(),
                        "".into(),
                        "Dimensionless".into(),
                        1.0.into(),
                    ])
                    .to_owned(),
            )
            .await?;

        // Default Building
        manager
            .exec_stmt(
                Query::insert()
                    .into_table(Buildings::Table)
                    .columns([
                        Buildings::Name,
                        Buildings::Description,
                        Buildings::Address,
                    ])
                    .values_panic([
                        "Default Building".into(),
                        "T3000 System Default Building".into(),
                        "".into(),
                    ])
                    .to_owned(),
            )
            .await?;

        // Default Network
        manager
            .exec_stmt(
                Query::insert()
                    .into_table(Networks::Table)
                    .columns([
                        Networks::BuildingId,
                        Networks::Name,
                        Networks::NetworkType,
                        Networks::NetworkNumber,
                        Networks::Description,
                    ])
                    .values_panic([
                        1.into(),
                        "Default Network".into(),
                        "BACnet".into(),
                        1.into(),
                        "T3000 System Default Network".into(),
                    ])
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, _manager: &SchemaManager) -> Result<(), DbErr> {
        // Drop all indexes (they'll be recreated with the up migration)
        Ok(())
    }
}

// Reference the same table enums from previous migrations
#[derive(DeriveIden)]
enum Devices {
    Table,
    DeviceInstance,
    ProductType,
    NetworkId,
    Status,
}

#[derive(DeriveIden)]
enum InputPoints {
    Table,
    DeviceId,
    PointIndex,
}

#[derive(DeriveIden)]
enum OutputPoints {
    Table,
    DeviceId,
    PointIndex,
}

#[derive(DeriveIden)]
enum VariablePoints {
    Table,
    DeviceId,
    PointIndex,
}

#[derive(DeriveIden)]
enum Trendlogs {
    Table,
    DeviceId,
    PointType,
    PointId,
}

#[derive(DeriveIden)]
enum TrendlogData {
    Table,
    TrendlogId,
    Timestamp,
}

#[derive(DeriveIden)]
enum Schedules {
    Table,
    DeviceId,
}

#[derive(DeriveIden)]
enum ScheduleDetails {
    Table,
    ScheduleId,
}

#[derive(DeriveIden)]
enum Holidays {
    Table,
    DeviceId,
}

#[derive(DeriveIden)]
enum Programs {
    Table,
    DeviceId,
}

#[derive(DeriveIden)]
enum Alarms {
    Table,
    DeviceId,
    AlarmTime,
    Priority,
    Acknowledged,
    Resolved,
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
}

#[derive(DeriveIden)]
enum Units {
    Table,
    UnitName,
    UnitSymbol,
    UnitType,
    ConversionFactor,
}

#[derive(DeriveIden)]
enum Buildings {
    Table,
    Name,
    Description,
    Address,
}

#[derive(DeriveIden)]
enum Networks {
    Table,
    BuildingId,
    Name,
    NetworkType,
    NetworkNumber,
    Description,
}
