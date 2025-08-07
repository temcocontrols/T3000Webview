use migration::{DeriveMigrationName, MigrationTrait, SchemaManager, DbErr, DeriveIden, async_trait};
use migration::{Table, ColumnDef, Index, ForeignKey, ForeignKeyAction, Query};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Create trendlog_device table
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
                    .col(ColumnDef::new(TrendlogDevice::DeviceId).integer().not_null())
                    .col(ColumnDef::new(TrendlogDevice::DeviceName).string().not_null())
                    .col(ColumnDef::new(TrendlogDevice::DeviceType).string().not_null())
                    .col(ColumnDef::new(TrendlogDevice::IpAddress).string())
                    .col(ColumnDef::new(TrendlogDevice::Port).integer())
                    .col(ColumnDef::new(TrendlogDevice::IsActive).boolean().not_null().default(true))
                    .col(ColumnDef::new(TrendlogDevice::CreatedAt).timestamp().not_null())
                    .col(ColumnDef::new(TrendlogDevice::UpdatedAt).timestamp())
                    .index(
                        Index::create()
                            .name("idx_trendlog_device_device_id")
                            .table(TrendlogDevice::Table)
                            .col(TrendlogDevice::DeviceId)
                            .unique(),
                    )
                    .to_owned(),
            )
            .await?;

        // Create trend_point table
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
                    .col(ColumnDef::new(TrendPoint::PointId).integer().not_null())
                    .col(ColumnDef::new(TrendPoint::PointName).string().not_null())
                    .col(ColumnDef::new(TrendPoint::PointType).string().not_null())
                    .col(ColumnDef::new(TrendPoint::DataType).string().not_null())
                    .col(ColumnDef::new(TrendPoint::Units).string())
                    .col(ColumnDef::new(TrendPoint::Scale).float())
                    .col(ColumnDef::new(TrendPoint::Offset).float())
                    .col(ColumnDef::new(TrendPoint::IsActive).boolean().not_null().default(true))
                    .col(ColumnDef::new(TrendPoint::TimebaseId).integer())
                    .col(ColumnDef::new(TrendPoint::CreatedAt).timestamp().not_null())
                    .col(ColumnDef::new(TrendPoint::UpdatedAt).timestamp())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_trend_point_device")
                            .from(TrendPoint::Table, TrendPoint::DeviceId)
                            .to(TrendlogDevice::Table, TrendlogDevice::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .index(
                        Index::create()
                            .name("idx_trend_point_device_point")
                            .table(TrendPoint::Table)
                            .col(TrendPoint::DeviceId)
                            .col(TrendPoint::PointId)
                            .unique(),
                    )
                    .index(
                        Index::create()
                            .name("idx_trend_point_timebase")
                            .table(TrendPoint::Table)
                            .col(TrendPoint::TimebaseId),
                    )
                    .to_owned(),
            )
            .await?;

        // Create trend_data table
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
                    .col(ColumnDef::new(TrendData::Timestamp).timestamp().not_null())
                    .col(ColumnDef::new(TrendData::Value).float().not_null())
                    .col(ColumnDef::new(TrendData::Quality).string().not_null())
                    .col(ColumnDef::new(TrendData::CreatedAt).timestamp().not_null())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_trend_data_point")
                            .from(TrendData::Table, TrendData::PointId)
                            .to(TrendPoint::Table, TrendPoint::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .index(
                        Index::create()
                            .name("idx_trend_data_point_timestamp")
                            .table(TrendData::Table)
                            .col(TrendData::PointId)
                            .col(TrendData::Timestamp),
                    )
                    .index(
                        Index::create()
                            .name("idx_trend_data_timestamp")
                            .table(TrendData::Table)
                            .col(TrendData::Timestamp),
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
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(TimebaseConfig::Name).string().not_null())
                    .col(ColumnDef::new(TimebaseConfig::IntervalMinutes).integer().not_null())
                    .col(ColumnDef::new(TimebaseConfig::Description).string())
                    .col(ColumnDef::new(TimebaseConfig::IsActive).boolean().not_null().default(true))
                    .col(ColumnDef::new(TimebaseConfig::CreatedAt).timestamp().not_null())
                    .col(ColumnDef::new(TimebaseConfig::UpdatedAt).timestamp())
                    .index(
                        Index::create()
                            .name("idx_timebase_config_name")
                            .table(TimebaseConfig::Table)
                            .col(TimebaseConfig::Name)
                            .unique(),
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
                    .col(ColumnDef::new(CollectionStatus::LastCollectionTime).timestamp())
                    .col(ColumnDef::new(CollectionStatus::NextCollectionTime).timestamp())
                    .col(ColumnDef::new(CollectionStatus::Status).string().not_null())
                    .col(ColumnDef::new(CollectionStatus::ErrorMessage).string())
                    .col(ColumnDef::new(CollectionStatus::CollectionCount).integer().not_null().default(0))
                    .col(ColumnDef::new(CollectionStatus::ErrorCount).integer().not_null().default(0))
                    .col(ColumnDef::new(CollectionStatus::CreatedAt).timestamp().not_null())
                    .col(ColumnDef::new(CollectionStatus::UpdatedAt).timestamp())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_collection_status_device")
                            .from(CollectionStatus::Table, CollectionStatus::DeviceId)
                            .to(TrendlogDevice::Table, TrendlogDevice::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .index(
                        Index::create()
                            .name("idx_collection_status_device")
                            .table(CollectionStatus::Table)
                            .col(CollectionStatus::DeviceId)
                            .unique(),
                    )
                    .to_owned(),
            )
            .await?;

        // Insert standard T3000 timebase configurations
        let timebase_configs = vec![
            ("1_MINUTE", 1, "1 minute interval"),
            ("5_MINUTES", 5, "5 minute interval"),
            ("15_MINUTES", 15, "15 minute interval"),
            ("30_MINUTES", 30, "30 minute interval"),
            ("1_HOUR", 60, "1 hour interval"),
            ("2_HOURS", 120, "2 hour interval"),
            ("4_HOURS", 240, "4 hour interval"),
            ("8_HOURS", 480, "8 hour interval"),
            ("12_HOURS", 720, "12 hour interval"),
            ("1_DAY", 1440, "1 day interval"),
        ];

        for (name, interval, description) in timebase_configs {
            manager
                .exec_stmt(
                    Query::insert()
                        .into_table(TimebaseConfig::Table)
                        .columns([
                            TimebaseConfig::Name,
                            TimebaseConfig::IntervalMinutes,
                            TimebaseConfig::Description,
                            TimebaseConfig::IsActive,
                            TimebaseConfig::CreatedAt,
                        ])
                        .values_panic([
                            name.into(),
                            interval.into(),
                            description.into(),
                            true.into(),
                            "datetime('now')".into(),
                        ])
                        .to_owned(),
                )
                .await?;
        }

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Drop tables in reverse order to respect foreign key constraints
        manager
            .drop_table(Table::drop().table(CollectionStatus::Table).to_owned())
            .await?;

        manager
            .drop_table(Table::drop().table(TrendData::Table).to_owned())
            .await?;

        manager
            .drop_table(Table::drop().table(TrendPoint::Table).to_owned())
            .await?;

        manager
            .drop_table(Table::drop().table(TimebaseConfig::Table).to_owned())
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
    DeviceType,
    IpAddress,
    Port,
    IsActive,
    CreatedAt,
    UpdatedAt,
}

#[derive(DeriveIden)]
enum TrendPoint {
    Table,
    Id,
    DeviceId,
    PointId,
    PointName,
    PointType,
    DataType,
    Units,
    Scale,
    Offset,
    IsActive,
    TimebaseId,
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
    IntervalMinutes,
    Description,
    IsActive,
    CreatedAt,
    UpdatedAt,
}

#[derive(DeriveIden)]
enum CollectionStatus {
    Table,
    Id,
    DeviceId,
    LastCollectionTime,
    NextCollectionTime,
    Status,
    ErrorMessage,
    CollectionCount,
    ErrorCount,
    CreatedAt,
    UpdatedAt,
}
