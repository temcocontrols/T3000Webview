use sea_orm_migration::{async_trait::async_trait, prelude::*};

/// Migration: add T3_FLOW, T3_FLOW_STEP, T3_FLOW_PAYLOAD tables.
///
/// These tables support the flow-based trace logging system.
/// They live in local SQLite (webview_t3_device.db) only — never in MSSQL.
///
/// All CREATE statements use IF NOT EXISTS so this migration is safe to run
/// on a database that was freshly created from the embedded schema (which
/// already contains the tables), as well as on existing production databases
/// that are being upgraded.
#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();

        // T3_FLOW: one row per flow instance
        db.execute_unprepared(
            "CREATE TABLE IF NOT EXISTS T3_FLOW (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                flow_id      TEXT    NOT NULL UNIQUE,
                flow_type    TEXT    NOT NULL,
                trigger_src  TEXT    NOT NULL,
                started_at   INTEGER NOT NULL,
                ended_at     INTEGER,
                status       TEXT    NOT NULL DEFAULT 'running',
                hostname     TEXT,
                total_steps  INTEGER NOT NULL DEFAULT 0,
                done_steps   INTEGER NOT NULL DEFAULT 0,
                error_count  INTEGER NOT NULL DEFAULT 0,
                meta         TEXT
            )",
        )
        .await?;

        db.execute_unprepared(
            "CREATE INDEX IF NOT EXISTS idx_t3_flow_type    ON T3_FLOW (flow_type)",
        )
        .await?;
        db.execute_unprepared(
            "CREATE INDEX IF NOT EXISTS idx_t3_flow_started ON T3_FLOW (started_at DESC)",
        )
        .await?;
        db.execute_unprepared(
            "CREATE INDEX IF NOT EXISTS idx_t3_flow_status  ON T3_FLOW (status)",
        )
        .await?;

        // T3_FLOW_STEP: one row per step inside a flow
        db.execute_unprepared(
            "CREATE TABLE IF NOT EXISTS T3_FLOW_STEP (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                flow_id      TEXT    NOT NULL,
                seq          INTEGER NOT NULL,
                step_name    TEXT    NOT NULL,
                level        TEXT    NOT NULL DEFAULT 'info',
                source       TEXT,
                api_path     TEXT,
                action_type  INTEGER,
                status       TEXT    NOT NULL DEFAULT 'ok',
                duration_ms  INTEGER,
                payload_ref  TEXT,
                message      TEXT,
                details      TEXT,
                ts_unix      INTEGER NOT NULL,
                ts_fmt       TEXT    NOT NULL
            )",
        )
        .await?;

        db.execute_unprepared(
            "CREATE INDEX IF NOT EXISTS idx_t3_flow_step_flow ON T3_FLOW_STEP (flow_id)",
        )
        .await?;
        db.execute_unprepared(
            "CREATE INDEX IF NOT EXISTS idx_t3_flow_step_ts   ON T3_FLOW_STEP (ts_unix DESC)",
        )
        .await?;

        // T3_FLOW_PAYLOAD: tracks offloaded large-payload files
        db.execute_unprepared(
            "CREATE TABLE IF NOT EXISTS T3_FLOW_PAYLOAD (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                flow_id      TEXT    NOT NULL,
                step_id      INTEGER NOT NULL,
                file_path    TEXT    NOT NULL,
                size_bytes   INTEGER NOT NULL,
                created_at   INTEGER NOT NULL,
                purged       INTEGER NOT NULL DEFAULT 0
            )",
        )
        .await?;

        Ok(())
    }

    async fn down(&self, _manager: &SchemaManager) -> Result<(), DbErr> {
        // Intentionally a no-op: dropping these tables would delete diagnostic history.
        // To remove manually:
        //   DROP TABLE IF EXISTS T3_FLOW_PAYLOAD;
        //   DROP TABLE IF EXISTS T3_FLOW_STEP;
        //   DROP TABLE IF EXISTS T3_FLOW;
        Ok(())
    }
}
