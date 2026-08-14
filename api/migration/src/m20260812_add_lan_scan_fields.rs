use sea_orm_migration::{async_trait::async_trait, prelude::*};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();

        // Add UDP LAN scan fields to DEVICES table (from 0x64/0x65 protocol)
        let columns: Vec<(&str, &str)> = vec![
            ("object_instance", "INTEGER DEFAULT NULL"),
            ("firmware_version", "REAL DEFAULT NULL"),
            ("hardware_version", "INTEGER DEFAULT NULL"),
            ("parent_serial_number", "INTEGER DEFAULT 0"),
            ("subnet_protocol", "INTEGER DEFAULT NULL"),
            ("command_version", "INTEGER DEFAULT NULL"),
            ("minitype", "INTEGER DEFAULT NULL"),
        ];

        for (col, col_def) in &columns {
            let sql = format!("ALTER TABLE DEVICES ADD COLUMN {} {}", col, col_def);
            // Ignore error if column already exists (SQLite: duplicate column name)
            let _ = db.execute_unprepared(&sql).await;
        }

        Ok(())
    }
}
