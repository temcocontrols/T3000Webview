use sea_orm_migration::{async_trait::async_trait, prelude::*};
use sea_orm_migration::sea_orm::{DatabaseBackend, Statement};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();

        // This migration can run in environments where FEATURE_FLAGS may not exist.
        let has_feature_flags = db
            .query_one(Statement::from_string(
                DatabaseBackend::Sqlite,
                "SELECT name FROM sqlite_master WHERE type='table' AND name='FEATURE_FLAGS'"
                    .to_owned(),
            ))
            .await?
            .is_some();

        if !has_feature_flags {
            return Ok(());
        }

        let has_lcd_mode = db
            .query_one(Statement::from_string(
                DatabaseBackend::Sqlite,
                "SELECT 1 FROM pragma_table_info('FEATURE_FLAGS') WHERE name='LCD_Mode' LIMIT 1"
                    .to_owned(),
            ))
            .await?
            .is_some();

        if !has_lcd_mode {
            // Add LCD_Mode column to FEATURE_FLAGS table
            // 0 = Always On, 1 = Off, 2 = Delay
            db.execute_unprepared(
                "ALTER TABLE FEATURE_FLAGS ADD COLUMN LCD_Mode INTEGER DEFAULT 0"
            )
            .await?;
        }

        let has_lcd_delay_seconds = db
            .query_one(Statement::from_string(
                DatabaseBackend::Sqlite,
                "SELECT 1 FROM pragma_table_info('FEATURE_FLAGS') WHERE name='LCD_Delay_Seconds' LIMIT 1"
                    .to_owned(),
            ))
            .await?
            .is_some();

        if !has_lcd_delay_seconds {
            // Add LCD_Delay_Seconds column to FEATURE_FLAGS table
            // Delay time in seconds when LCD_Mode = 2
            db.execute_unprepared(
                "ALTER TABLE FEATURE_FLAGS ADD COLUMN LCD_Delay_Seconds INTEGER DEFAULT 30"
            )
            .await?;
        }

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let _db = manager.get_connection();

        // SQLite doesn't support DROP COLUMN directly, so we skip the down migration
        // In production, you would need to recreate the table without these columns
        Ok(())
    }
}
