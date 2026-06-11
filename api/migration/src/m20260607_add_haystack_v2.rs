use sea_orm_migration::{async_trait::async_trait, prelude::*};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();

        // ── HAYSTACK_TAGS: tag definitions ──
        db.execute_unprepared(
            "CREATE TABLE IF NOT EXISTS HAYSTACK_TAGS (
                tag_name   TEXT PRIMARY KEY,
                doc        TEXT,
                category   TEXT NOT NULL DEFAULT 'custom',
                deprecated INTEGER NOT NULL DEFAULT 0,
                source     TEXT DEFAULT 'user'
            )",
        )
        .await?;

        // ── HAYSTACK_TAG_RELATIONS: multi-parent inheritance ──
        db.execute_unprepared(
            "CREATE TABLE IF NOT EXISTS HAYSTACK_TAG_RELATIONS (
                tag_name   TEXT NOT NULL,
                parent_tag TEXT NOT NULL,
                PRIMARY KEY (tag_name, parent_tag)
            )",
        )
        .await?;

        // ── HAYSTACK_POINT_TAGS: point ↔ tag mapping ──
        db.execute_unprepared(
            "CREATE TABLE IF NOT EXISTS HAYSTACK_POINT_TAGS (
                serial_number INTEGER NOT NULL,
                point_type    TEXT NOT NULL,
                point_index   TEXT NOT NULL,
                point_id      TEXT NOT NULL,
                tag_name      TEXT NOT NULL,
                PRIMARY KEY (serial_number, point_type, point_index, tag_name)
            )",
        )
        .await?;

        db.execute_unprepared(
            "CREATE INDEX IF NOT EXISTS idx_hpt_serial ON HAYSTACK_POINT_TAGS (serial_number)",
        )
        .await?;
        db.execute_unprepared(
            "CREATE INDEX IF NOT EXISTS idx_hpt_tag ON HAYSTACK_POINT_TAGS (tag_name)",
        )
        .await?;

        // ── Seed: Haystack v4 standard tags ──
        // Tags are populated via the Sync button (fetches from project-haystack.org),
        // not hardcoded here. See haystack_tags_service::reseed_standard_tags().

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();
        db.execute_unprepared("DROP TABLE IF EXISTS HAYSTACK_POINT_TAGS").await?;
        db.execute_unprepared("DROP TABLE IF EXISTS HAYSTACK_TAG_RELATIONS").await?;
        db.execute_unprepared("DROP TABLE IF EXISTS HAYSTACK_TAGS").await?;
        Ok(())
    }
}
