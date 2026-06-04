use sea_orm_migration::{async_trait::async_trait, prelude::*};

/// Migration: add T3_APP_LOG table (unified application event log).
///
/// Replaces the old SYNC_EVENT_LOG (lazy-created by `emit_app_log`)
/// and SYSTEM_LOGS (dead code).  All Rust logging goes through this table.
/// Lives in local SQLite only — always writable, survives center DB outage.
///
/// Auto-pruned to 5000 rows on every insert (done in `sinks.rs`).
#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();

        db.execute_unprepared(
            "CREATE TABLE IF NOT EXISTS T3_APP_LOG (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                ts_unix       INTEGER NOT NULL,
                ts_fmt        TEXT    NOT NULL,
                level         TEXT    NOT NULL DEFAULT 'info',
                category      TEXT    NOT NULL DEFAULT 'SERVER_EVENT',
                source        TEXT,
                hostname      TEXT,
                role          TEXT,
                device_serial TEXT,
                message       TEXT    NOT NULL DEFAULT '',
                details       TEXT
            )",
        )
        .await?;

        db.execute_unprepared(
            "CREATE INDEX IF NOT EXISTS idx_t3_app_log_ts  ON T3_APP_LOG (ts_unix DESC)",
        )
        .await?;
        db.execute_unprepared(
            "CREATE INDEX IF NOT EXISTS idx_t3_app_log_cat ON T3_APP_LOG (category)",
        )
        .await?;
        db.execute_unprepared(
            "CREATE INDEX IF NOT EXISTS idx_t3_app_log_lvl ON T3_APP_LOG (level)",
        )
        .await?;

        Ok(())
    }

    async fn down(&self, _manager: &SchemaManager) -> Result<(), DbErr> {
        // Keep historical semantics.  To remove manually:
        //   DROP TABLE IF EXISTS T3_APP_LOG;
        Ok(())
    }
}
