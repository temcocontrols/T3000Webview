use sea_orm_migration::prelude::*;
use chrono::Datelike;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Create devices table
        manager
            .create_table(
                Table::create()
                    .table(Device::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Device::Id)
                            .integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(Device::DeviceName).string().not_null())
                    .col(ColumnDef::new(Device::DeviceType).string().not_null())
                    .col(ColumnDef::new(Device::IpAddress).string())
                    .col(ColumnDef::new(Device::Port).integer())
                    .col(ColumnDef::new(Device::DeviceId).integer().not_null())
                    .col(ColumnDef::new(Device::IsActive).integer().default(1))
                    .col(ColumnDef::new(Device::LastSeen).big_integer())
                    .col(ColumnDef::new(Device::CreatedAt).big_integer())
                    .col(ColumnDef::new(Device::UpdatedAt).big_integer())
                    .index(
                        Index::create()
                            .name("idx_devices_device_id")
                            .col(Device::DeviceId)
                            .unique(),
                    )
                    .to_owned(),
            )
            .await?;

        // Create monitoring_points table
        manager
            .create_table(
                Table::create()
                    .table(MonitoringPoint::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(MonitoringPoint::Id)
                            .integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(MonitoringPoint::DeviceId).integer().not_null())
                    .col(ColumnDef::new(MonitoringPoint::PointType).integer().not_null())
                    .col(ColumnDef::new(MonitoringPoint::PointNumber).integer().not_null())
                    .col(ColumnDef::new(MonitoringPoint::PointName).string())
                    .col(ColumnDef::new(MonitoringPoint::Description).text())
                    .col(ColumnDef::new(MonitoringPoint::UnitCode).integer())
                    .col(ColumnDef::new(MonitoringPoint::UnitSymbol).string())
                    .col(ColumnDef::new(MonitoringPoint::DataType).string().not_null())
                    .col(ColumnDef::new(MonitoringPoint::IsActive).integer().default(1))
                    .col(ColumnDef::new(MonitoringPoint::CreatedAt).big_integer())
                    .col(ColumnDef::new(MonitoringPoint::UpdatedAt).big_integer())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_monitoring_points_device")
                            .from(MonitoringPoint::Table, MonitoringPoint::DeviceId)
                            .to(Device::Table, Device::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .index(
                        Index::create()
                            .name("idx_monitoring_points_device_point")
                            .col(MonitoringPoint::DeviceId)
                            .col(MonitoringPoint::PointType)
                            .col(MonitoringPoint::PointNumber)
                            .unique(),
                    )
                    .to_owned(),
            )
            .await?;

        // Create trend_logs table
        manager
            .create_table(
                Table::create()
                    .table(TrendLog::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(TrendLog::Id)
                            .integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(TrendLog::DeviceId).integer().not_null())
                    .col(ColumnDef::new(TrendLog::TrendLogName).string().not_null())
                    .col(ColumnDef::new(TrendLog::IntervalSeconds).integer().not_null().default(900))
                    .col(ColumnDef::new(TrendLog::MaxPoints).integer().not_null().default(1000))
                    .col(ColumnDef::new(TrendLog::IsActive).integer().default(1))
                    .col(ColumnDef::new(TrendLog::LastCollected).big_integer())
                    .col(ColumnDef::new(TrendLog::CreatedAt).big_integer())
                    .col(ColumnDef::new(TrendLog::UpdatedAt).big_integer())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_trend_logs_device")
                            .from(TrendLog::Table, TrendLog::DeviceId)
                            .to(Device::Table, Device::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        // Create trend_log_points table
        manager
            .create_table(
                Table::create()
                    .table(TrendLogPoint::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(TrendLogPoint::Id)
                            .integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(TrendLogPoint::TrendLogId).integer().not_null())
                    .col(ColumnDef::new(TrendLogPoint::MonitoringPointId).integer().not_null())
                    .col(ColumnDef::new(TrendLogPoint::IsActive).integer().default(1))
                    .col(ColumnDef::new(TrendLogPoint::CreatedAt).big_integer())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_trend_log_points_trend_log")
                            .from(TrendLogPoint::Table, TrendLogPoint::TrendLogId)
                            .to(TrendLog::Table, TrendLog::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_trend_log_points_monitoring_point")
                            .from(TrendLogPoint::Table, TrendLogPoint::MonitoringPointId)
                            .to(MonitoringPoint::Table, MonitoringPoint::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .index(
                        Index::create()
                            .name("idx_trend_log_points_trend_monitoring")
                            .col(TrendLogPoint::TrendLogId)
                            .col(TrendLogPoint::MonitoringPointId)
                            .unique(),
                    )
                    .to_owned(),
            )
            .await?;

        // Create realtime_data_cache table
        manager
            .create_table(
                Table::create()
                    .table(RealtimeDataCache::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(RealtimeDataCache::Id)
                            .integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(RealtimeDataCache::DeviceId).integer().not_null())
                    .col(ColumnDef::new(RealtimeDataCache::PointType).integer().not_null())
                    .col(ColumnDef::new(RealtimeDataCache::PointNumber).integer().not_null())
                    .col(ColumnDef::new(RealtimeDataCache::Value).double().not_null())
                    .col(ColumnDef::new(RealtimeDataCache::Timestamp).big_integer().not_null())
                    .col(ColumnDef::new(RealtimeDataCache::DataType).string().not_null())
                    .col(ColumnDef::new(RealtimeDataCache::UnitCode).integer())
                    .col(ColumnDef::new(RealtimeDataCache::IsFresh).integer().default(1))
                    .col(ColumnDef::new(RealtimeDataCache::CacheDuration).integer().default(60))
                    .col(ColumnDef::new(RealtimeDataCache::CreatedAt).big_integer())
                    .col(ColumnDef::new(RealtimeDataCache::UpdatedAt).big_integer())
                    .index(
                        Index::create()
                            .name("idx_cache_device_point")
                            .col(RealtimeDataCache::DeviceId)
                            .col(RealtimeDataCache::PointType)
                            .col(RealtimeDataCache::PointNumber)
                            .unique(),
                    )
                    .index(
                        Index::create()
                            .name("idx_cache_timestamp")
                            .col(RealtimeDataCache::Timestamp),
                    )
                    .to_owned(),
            )
            .await?;

        // Create timeseries_data table for current year
        let current_year = chrono::Utc::now().year();
        let table_name = format!("timeseries_data_{}", current_year);

        manager
            .create_table(
                Table::create()
                    .table(Alias::new(&table_name))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Alias::new("id"))
                            .integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(Alias::new("device_id")).integer().not_null())
                    .col(ColumnDef::new(Alias::new("point_type")).integer().not_null())
                    .col(ColumnDef::new(Alias::new("point_number")).integer().not_null())
                    .col(ColumnDef::new(Alias::new("value")).double().not_null())
                    .col(ColumnDef::new(Alias::new("timestamp")).big_integer().not_null())
                    .col(ColumnDef::new(Alias::new("data_type")).string().not_null())
                    .col(ColumnDef::new(Alias::new("unit_code")).integer())
                    .col(ColumnDef::new(Alias::new("trend_log_id")).integer())
                    .col(ColumnDef::new(Alias::new("created_at")).big_integer())
                    .index(
                        Index::create()
                            .name(&format!("idx_ts_{}_device_point_time", current_year))
                            .col(Alias::new("device_id"))
                            .col(Alias::new("point_type"))
                            .col(Alias::new("point_number"))
                            .col(Alias::new("timestamp")),
                    )
                    .index(
                        Index::create()
                            .name(&format!("idx_ts_{}_timestamp", current_year))
                            .col(Alias::new("timestamp")),
                    )
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Drop all tables in reverse order
        let current_year = chrono::Utc::now().year();
        let table_name = format!("timeseries_data_{}", current_year);

        manager
            .drop_table(Table::drop().table(Alias::new(&table_name)).to_owned())
            .await?;

        manager
            .drop_table(Table::drop().table(RealtimeDataCache::Table).to_owned())
            .await?;

        manager
            .drop_table(Table::drop().table(TrendLogPoint::Table).to_owned())
            .await?;

        manager
            .drop_table(Table::drop().table(TrendLog::Table).to_owned())
            .await?;

        manager
            .drop_table(Table::drop().table(MonitoringPoint::Table).to_owned())
            .await?;

        manager
            .drop_table(Table::drop().table(Device::Table).to_owned())
            .await?;

        Ok(())
    }
}

#[derive(DeriveIden)]
enum Device {
    Table,
    Id,
    DeviceName,
    DeviceType,
    IpAddress,
    Port,
    DeviceId,
    IsActive,
    LastSeen,
    CreatedAt,
    UpdatedAt,
}

#[derive(DeriveIden)]
enum MonitoringPoint {
    Table,
    Id,
    DeviceId,
    PointType,
    PointNumber,
    PointName,
    Description,
    UnitCode,
    UnitSymbol,
    DataType,
    IsActive,
    CreatedAt,
    UpdatedAt,
}

#[derive(DeriveIden)]
enum TrendLog {
    Table,
    Id,
    DeviceId,
    TrendLogName,
    IntervalSeconds,
    MaxPoints,
    IsActive,
    LastCollected,
    CreatedAt,
    UpdatedAt,
}

#[derive(DeriveIden)]
enum TrendLogPoint {
    Table,
    Id,
    TrendLogId,
    MonitoringPointId,
    IsActive,
    CreatedAt,
}

#[derive(DeriveIden)]
enum RealtimeDataCache {
    Table,
    Id,
    DeviceId,
    PointType,
    PointNumber,
    Value,
    Timestamp,
    DataType,
    UnitCode,
    IsFresh,
    CacheDuration,
    CreatedAt,
    UpdatedAt,
}
