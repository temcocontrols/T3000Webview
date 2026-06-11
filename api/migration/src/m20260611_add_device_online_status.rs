use sea_orm_migration::{async_trait::async_trait, prelude::*};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();

        // Add online-status tracking columns to DEVICES table
        // - is_online:  0 = offline/unknown, 1 = online (set by FFI Action 4 scan)
        // - last_checked: ISO 8601 timestamp of last online-status check
        let columns = vec![
            ("is_online", "INTEGER DEFAULT 0"),
            ("last_checked", "TEXT"),
        ];

        for (col, col_def) in &columns {
            let sql = format!("ALTER TABLE DEVICES ADD COLUMN {} {}", col, col_def);
            // Ignore error if column already exists (SQLite: duplicate column name)
            let _ = db.execute_unprepared(&sql).await;
        }

        Ok(())
    }
}
