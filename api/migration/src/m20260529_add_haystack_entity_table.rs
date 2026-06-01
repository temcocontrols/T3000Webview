use sea_orm_migration::{async_trait::async_trait, prelude::*};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();

        db.execute_unprepared(
            "CREATE TABLE IF NOT EXISTS HAYSTACK_ENTITY (
                id            TEXT PRIMARY KEY,
                kind          TEXT NOT NULL,
                dis           TEXT,
                tags          TEXT NOT NULL,
                serial_number INTEGER,
                point_table   TEXT,
                point_index   TEXT,
                updated_at    INTEGER
            )",
        )
        .await?;

        db.execute_unprepared(
            "CREATE INDEX IF NOT EXISTS idx_haystack_entity_kind ON HAYSTACK_ENTITY (kind)",
        )
        .await?;

        db.execute_unprepared(
            "CREATE INDEX IF NOT EXISTS idx_haystack_entity_serial ON HAYSTACK_ENTITY (serial_number)",
        )
        .await?;

        db.execute_unprepared(
            "CREATE INDEX IF NOT EXISTS idx_haystack_entity_point_table ON HAYSTACK_ENTITY (point_table)",
        )
        .await?;

        Ok(())
    }

    async fn down(&self, _manager: &SchemaManager) -> Result<(), DbErr> {
        // Keep historical semantics by default.
        Ok(())
    }
}
