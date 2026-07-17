use sea_orm_migration::{async_trait::async_trait, prelude::*};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();

        // ── HAYSTACK_POINT_BRICK_CLASS: one row per point for brick classification ──
        db.execute_unprepared(
            "CREATE TABLE IF NOT EXISTS HAYSTACK_POINT_BRICK_CLASS (
                serial_number INTEGER NOT NULL,
                point_type    TEXT NOT NULL,
                point_index   INTEGER NOT NULL,
                brick_class   TEXT NOT NULL,
                PRIMARY KEY (serial_number, point_type, point_index)
            )",
        )
        .await?;

        db.execute_unprepared(
            "CREATE INDEX IF NOT EXISTS idx_hpbc_serial ON HAYSTACK_POINT_BRICK_CLASS (serial_number)",
        )
        .await?;

        // Migrate existing __brick_class__ marker rows to the new table
        db.execute_unprepared(
            "INSERT OR IGNORE INTO HAYSTACK_POINT_BRICK_CLASS (serial_number, point_type, point_index, brick_class)
             SELECT serial_number, point_type, CAST(point_index AS INTEGER), brick_class
             FROM HAYSTACK_POINT_TAGS
             WHERE tag_name = '__brick_class__' AND brick_class IS NOT NULL",
        )
        .await?;

        // Remove the old marker rows from haystack_point_tags
        db.execute_unprepared(
            "DELETE FROM HAYSTACK_POINT_TAGS WHERE tag_name = '__brick_class__'",
        )
        .await?;

        // Add auto_assigned column to distinguish auto-tagged vs manual tags (idempotent)
        let _ = db.execute_unprepared(
            "ALTER TABLE HAYSTACK_POINT_TAGS ADD COLUMN auto_assigned INTEGER NOT NULL DEFAULT 0",
        )
        .await;

        // Drop brick_class column from HAYSTACK_POINT_TAGS (idempotent — may already be dropped)
        let _ = db.execute_unprepared("ALTER TABLE HAYSTACK_POINT_TAGS DROP COLUMN brick_class")
        .await;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();
        // Rollback: drop the new table and column. brick_class is intentionally gone.
        db.execute_unprepared("DROP TABLE IF EXISTS HAYSTACK_POINT_BRICK_CLASS").await?;
        db.execute_unprepared("ALTER TABLE HAYSTACK_POINT_TAGS DROP COLUMN auto_assigned").await?;
        Ok(())
    }
}
