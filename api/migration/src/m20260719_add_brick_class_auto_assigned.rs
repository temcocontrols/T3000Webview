use sea_orm_migration::{async_trait::async_trait, prelude::*};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();

        // Add auto_assigned column to brick class table (idempotent)
        let _ = db
            .execute_unprepared(
                "ALTER TABLE HAYSTACK_POINT_BRICK_CLASS ADD COLUMN auto_assigned INTEGER NOT NULL DEFAULT 1",
            )
            .await;

        // Existing rows were all auto-assigned, set them to 1
        let _ = db
            .execute_unprepared(
                "UPDATE HAYSTACK_POINT_BRICK_CLASS SET auto_assigned = 1 WHERE auto_assigned = 0",
            )
            .await;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();
        let _ = db
            .execute_unprepared("ALTER TABLE HAYSTACK_POINT_BRICK_CLASS DROP COLUMN auto_assigned")
            .await;
        Ok(())
    }
}
