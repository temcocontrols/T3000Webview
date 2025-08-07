use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Create devices table for trendlog
        manager
            .create_table(
                Table::create()
                    .table(TrendlogDevice::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(TrendlogDevice::Id)
                            .integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(TrendlogDevice::DeviceId).integer().unique_key().not_null())
                    .col(ColumnDef::new(TrendlogDevice::DeviceName).string().not_null())
                    .col(ColumnDef::new(TrendlogDevice::IpAddress).string())
                    .col(ColumnDef::new(TrendlogDevice::DeviceType).string().not_null().default("T3000"))
                    .col(ColumnDef::new(TrendlogDevice::SerialNumber).integer())
                    .col(ColumnDef::new(TrendlogDevice::IsActive).integer().default(1))
                    .col(ColumnDef::new(TrendlogDevice::LastSeen).big_integer())
                    .col(ColumnDef::new(TrendlogDevice::CreatedAt).big_integer().default(Expr::current_timestamp()))
                    .col(ColumnDef::new(TrendlogDevice::UpdatedAt).big_integer().default(Expr::current_timestamp()))
                    .index(
                        Index::create()
                            .name("idx_trendlog_devices_device_id")
                            .col(TrendlogDevice::DeviceId),
                    )
                    .index(
                        Index::create()
                            .name("idx_trendlog_devices_active")
                            .col(TrendlogDevice::IsActive),
                    )
                    .index(
                        Index::create()
                            .name("idx_trendlog_devices_last_seen")
                            .col(TrendlogDevice::LastSeen),
                    )
                    .to_owned(),
            )
            .await?;

        // Create trend_points table
        manager
            .create_table(
                Table::create()
                    .table(TrendPoint::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(TrendPoint::Id)
                            .integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(TrendPoint::DeviceId).integer().not_null())
                    .col(ColumnDef::new(TrendPoint::PointType).string().not_null())
                    .col(ColumnDef::new(TrendPoint::PointNumber).integer().not_null())
                    .col(ColumnDef::new(TrendPoint::PointName).string())
                    .col(ColumnDef::new(TrendPoint::Description).text())
                    .col(ColumnDef::new(TrendPoint::Unit).string())
                    .col(ColumnDef::new(TrendPoint::DataType).string().not_null().default("ANALOG"))
                    .col(ColumnDef::new(TrendPoint::IsEnabled).integer().default(1))
                    .col(ColumnDef::new(TrendPoint::CollectionInterval).integer().default(60))
                    .col(ColumnDef::new(TrendPoint::MinValue).double())
                    .col(ColumnDef::new(TrendPoint::MaxValue).double())
                    .col(ColumnDef::new(TrendPoint::CreatedAt).big_integer().default(Expr::current_timestamp()))
                    .col(ColumnDef::new(TrendPoint::UpdatedAt).big_integer().default(Expr::current_timestamp()))
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_trend_points_device")
                            .from(TrendPoint::Table, TrendPoint::DeviceId)
                            .to(TrendlogDevice::Table, TrendlogDevice::DeviceId)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .index(
                        Index::create()
                            .name("idx_trend_points_device_type_number")
                            .col(TrendPoint::DeviceId)
                            .col(TrendPoint::PointType)
                            .col(TrendPoint::PointNumber)
                            .unique(),
                    )
                    .index(
                        Index::create()
                            .name("idx_trend_points_device")
                            .col(TrendPoint::DeviceId),
                    )
                    .index(
                        Index::create()
                            .name("idx_trend_points_enabled")
                            .col(TrendPoint::IsEnabled),
                    )
                    .index(
                        Index::create()
                            .name("idx_trend_points_type")
                            .col(TrendPoint::PointType),
                    )
                    .index(
                        Index::create()
                            .name("idx_trend_points_interval")
                            .col(TrendPoint::CollectionInterval),
                    )
                    .to_owned(),
            )
            .await?;

        // Create trend_data table for time-series storage
        manager
            .create_table(
                Table::create()
                    .table(TrendData::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(TrendData::Id)
                            .integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(TrendData::PointId).integer().not_null())
                    .col(ColumnDef::new(TrendData::Timestamp).big_integer().not_null())
                    .col(ColumnDef::new(TrendData::Value).double().not_null())
                    .col(ColumnDef::new(TrendData::Quality).integer().default(0))
                    .col(ColumnDef::new(TrendData::CreatedAt).big_integer().default(Expr::current_timestamp()))
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_trend_data_point")
                            .from(TrendData::Table, TrendData::PointId)
                            .to(TrendPoint::Table, TrendPoint::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .index(
                        Index::create()
                            .name("idx_trend_data_point_time")
                            .col(TrendData::PointId)
                            .col(TrendData::Timestamp),
                    )
                    .index(
                        Index::create()
                            .name("idx_trend_data_timestamp")
                            .col(TrendData::Timestamp),
                    )
                    .index(
                        Index::create()
                            .name("idx_trend_data_quality")
                            .col(TrendData::Quality),
                    )
                    .to_owned(),
            )
            .await?;

        // Create timebase_config table
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
                    .col(ColumnDef::new(TimebaseConfig::Name).string().unique_key().not_null())
                    .col(ColumnDef::new(TimebaseConfig::IntervalSeconds).integer().not_null())
                    .col(ColumnDef::new(TimebaseConfig::RetentionDays).integer().not_null())
                    .col(ColumnDef::new(TimebaseConfig::Description).text())
                    .col(ColumnDef::new(TimebaseConfig::IsActive).integer().default(1))
                    .col(ColumnDef::new(TimebaseConfig::CreatedAt).big_integer().default(Expr::current_timestamp()))
                    .index(
                        Index::create()
                            .name("idx_timebase_active")
                            .col(TimebaseConfig::IsActive),
                    )
                    .index(
                        Index::create()
                            .name("idx_timebase_interval")
                            .col(TimebaseConfig::IntervalSeconds),
                    )
                    .to_owned(),
            )
            .await?;

        // Create collection_status table
        manager
            .create_table(
                Table::create()
                    .table(CollectionStatus::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(CollectionStatus::Id)
                            .integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(CollectionStatus::DeviceId).integer().not_null())
                    .col(ColumnDef::new(CollectionStatus::PointId).integer())
                    .col(ColumnDef::new(CollectionStatus::Status).string().not_null())
                    .col(ColumnDef::new(CollectionStatus::LastCollection).big_integer())
                    .col(ColumnDef::new(CollectionStatus::LastError).text())
                    .col(ColumnDef::new(CollectionStatus::ErrorCount).integer().default(0))
                    .col(ColumnDef::new(CollectionStatus::TotalCollections).integer().default(0))
                    .col(ColumnDef::new(CollectionStatus::CreatedAt).big_integer().default(Expr::current_timestamp()))
                    .col(ColumnDef::new(CollectionStatus::UpdatedAt).big_integer().default(Expr::current_timestamp()))
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_collection_status_device")
                            .from(CollectionStatus::Table, CollectionStatus::DeviceId)
                            .to(TrendlogDevice::Table, TrendlogDevice::DeviceId)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_collection_status_point")
                            .from(CollectionStatus::Table, CollectionStatus::PointId)
                            .to(TrendPoint::Table, TrendPoint::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .index(
                        Index::create()
                            .name("idx_collection_device")
                            .col(CollectionStatus::DeviceId),
                    )
                    .index(
                        Index::create()
                            .name("idx_collection_status")
                            .col(CollectionStatus::Status),
                    )
                    .index(
                        Index::create()
                            .name("idx_collection_last")
                            .col(CollectionStatus::LastCollection),
                    )
                    .to_owned(),
            )
            .await?;

        // Insert T3000 Standard Timebase Intervals
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
                    ])
                    .values_panic([
                        1.into(),
                        "1-minute".into(),
                        60.into(),
                        7.into(),
                        "High-resolution trending - 1 week retention".into(),
                    ])
                    .values_panic([
                        2.into(),
                        "5-minutes".into(),
                        300.into(),
                        30.into(),
                        "Standard trending - 1 month retention".into(),
                    ])
                    .values_panic([
                        3.into(),
                        "15-minutes".into(),
                        900.into(),
                        90.into(),
                        "Medium-resolution trending - 3 months retention".into(),
                    ])
                    .values_panic([
                        4.into(),
                        "30-minutes".into(),
                        1800.into(),
                        180.into(),
                        "Lower-resolution trending - 6 months retention".into(),
                    ])
                    .values_panic([
                        5.into(),
                        "1-hour".into(),
                        3600.into(),
                        365.into(),
                        "Hourly trending - 1 year retention".into(),
                    ])
                    .values_panic([
                        6.into(),
                        "2-hours".into(),
                        7200.into(),
                        730.into(),
                        "Bi-hourly trending - 2 years retention".into(),
                    ])
                    .values_panic([
                        7.into(),
                        "4-hours".into(),
                        14400.into(),
                        1095.into(),
                        "Quarterly-daily trending - 3 years retention".into(),
                    ])
                    .values_panic([
                        8.into(),
                        "1-day".into(),
                        86400.into(),
                        1825.into(),
                        "Daily trending - 5 years retention".into(),
                    ])
                    .values_panic([
                        9.into(),
                        "4-days".into(),
                        345600.into(),
                        3650.into(),
                        "Weekly trending - 10 years retention".into(),
                    ])
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Drop tables in reverse order of creation due to foreign key constraints
        manager
            .drop_table(Table::drop().table(CollectionStatus::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(TimebaseConfig::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(TrendData::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(TrendPoint::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(TrendlogDevice::Table).to_owned())
            .await?;

        Ok(())
    }
}

#[derive(DeriveIden)]
enum TrendlogDevice {
    Table,
    Id,
    DeviceId,
    DeviceName,
    IpAddress,
    DeviceType,
    SerialNumber,
    IsActive,
    LastSeen,
    CreatedAt,
    UpdatedAt,
}

#[derive(DeriveIden)]
enum TrendPoint {
    Table,
    Id,
    DeviceId,
    PointType,
    PointNumber,
    PointName,
    Description,
    Unit,
    DataType,
    IsEnabled,
    CollectionInterval,
    MinValue,
    MaxValue,
    CreatedAt,
    UpdatedAt,
}

#[derive(DeriveIden)]
enum TrendData {
    Table,
    Id,
    PointId,
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
enum CollectionStatus {
    Table,
    Id,
    DeviceId,
    PointId,
    Status,
    LastCollection,
    LastError,
    ErrorCount,
    TotalCollections,
    CreatedAt,
    UpdatedAt,
}
