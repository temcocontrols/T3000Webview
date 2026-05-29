use sea_orm_migration::{async_trait::async_trait, prelude::*};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();

        db.execute_unprepared(
            "CREATE TABLE IF NOT EXISTS TRENDLOG_POINT_SETS (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                serial_number INTEGER NOT NULL,
                set_name      TEXT NOT NULL,
                selected_keys TEXT NOT NULL,
                point_tags    TEXT NOT NULL,
                created_at    INTEGER,
                updated_at    INTEGER
            )",
        )
        .await?;

        db.execute_unprepared(
            "CREATE UNIQUE INDEX IF NOT EXISTS uq_trendpointsets_serial_name ON TRENDLOG_POINT_SETS (serial_number, set_name)",
        )
        .await?;

        db.execute_unprepared(
            "CREATE INDEX IF NOT EXISTS idx_trendpointsets_serial ON TRENDLOG_POINT_SETS (serial_number)",
        )
        .await?;

        db.execute_unprepared(
            "CREATE INDEX IF NOT EXISTS idx_trendpointsets_updated_at ON TRENDLOG_POINT_SETS (updated_at)",
        )
        .await?;

        Ok(())
    }

    async fn down(&self, _manager: &SchemaManager) -> Result<(), DbErr> {
        // Keep historical semantics by default.
        Ok(())
    }
}
