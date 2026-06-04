use sea_orm_migration::{async_trait::async_trait, prelude::*};

/// Migration: add DB_BACKEND_CONFIG and SERVER_CLIENT_REGISTRY tables.
///
/// These tables are always local (SQLite) and hold backend connection settings
/// and multi-PC deployment registry entries.  All statements use IF NOT EXISTS
/// so this migration is safe to run on any existing database.
#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();

        // ── DB_BACKEND_CONFIG ────────────────────────────────────────────
        db.execute_unprepared(
            "CREATE TABLE IF NOT EXISTS DB_BACKEND_CONFIG (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                backend_type    TEXT    NOT NULL UNIQUE,
                is_active       INTEGER NOT NULL DEFAULT 0,
                host            TEXT,
                port            INTEGER,
                instance        TEXT,
                database_name   TEXT,
                username        TEXT,
                password        TEXT,
                connection_url  TEXT,
                extra_options   TEXT,
                role            TEXT    DEFAULT 'server',
                updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
            )",
        )
        .await?;

        // Seed default backends — harmless if rows already exist.
        db.execute_unprepared(
            "INSERT OR IGNORE INTO DB_BACKEND_CONFIG (backend_type, is_active, connection_url)
             VALUES ('sqlite', 1, 'sqlite://Database/webview_t3_device.db')",
        )
        .await?;
        db.execute_unprepared(
            "INSERT OR IGNORE INTO DB_BACKEND_CONFIG (backend_type, is_active, port)
             VALUES ('mssql', 0, 1433)",
        )
        .await?;
        db.execute_unprepared(
            "INSERT OR IGNORE INTO DB_BACKEND_CONFIG (backend_type, is_active, port)
             VALUES ('postgres', 0, 5432)",
        )
        .await?;
        db.execute_unprepared(
            "INSERT OR IGNORE INTO DB_BACKEND_CONFIG (backend_type, is_active, port)
             VALUES ('mysql', 0, 3306)",
        )
        .await?;

        // ── SERVER_CLIENT_REGISTRY ──────────────────────────────────────
        db.execute_unprepared(
            "CREATE TABLE IF NOT EXISTS SERVER_CLIENT_REGISTRY (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                hostname        TEXT    NOT NULL DEFAULT '',
                ip_address      TEXT    NOT NULL DEFAULT '',
                role            TEXT    NOT NULL DEFAULT 'client',
                is_self         INTEGER NOT NULL DEFAULT 0,
                status          TEXT    NOT NULL DEFAULT 'online',
                last_seen       TEXT    NOT NULL DEFAULT (datetime('now')),
                db_backend      TEXT    DEFAULT 'sqlite',
                table_count     INTEGER DEFAULT 0,
                version         TEXT    DEFAULT '',
                created_at      TEXT    DEFAULT (datetime('now')),
                UNIQUE(hostname, ip_address)
            )",
        )
        .await?;

        Ok(())
    }

    async fn down(&self, _manager: &SchemaManager) -> Result<(), DbErr> {
        // Keep for diagnostic purposes.
        Ok(())
    }
}
