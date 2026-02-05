use sea_orm_migration::{async_trait::async_trait, prelude::*};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();

        // Add LCD_Mode column to FEATURE_FLAGS table
        // 0 = Always On, 1 = Off, 2 = Delay
        db.execute_unprepared(
            "ALTER TABLE FEATURE_FLAGS ADD COLUMN LCD_Mode INTEGER DEFAULT 0"
        )
        .await?;

        // Add LCD_Delay_Seconds column to FEATURE_FLAGS table
        // Delay time in seconds when LCD_Mode = 2
        db.execute_unprepared(
            "ALTER TABLE FEATURE_FLAGS ADD COLUMN LCD_Delay_Seconds INTEGER DEFAULT 30"
        )
        .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let _db = manager.get_connection();

        // SQLite doesn't support DROP COLUMN directly, so we skip the down migration
        // In production, you would need to recreate the table without these columns
        Ok(())
    }
}
