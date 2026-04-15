# T3000 Centralized Database - Full Design Document

**Date:** 2026-04-15
**Status:** PENDING CONFIRMATION
**Scope:** Replace local SQLite `webview_t3_device.db` with optional centralized DB server

---

## 1. Problem Statement

When multiple PCs (e.g. 5) run T3000 on the same LAN, each creates its own local
`webview_t3_device.db` SQLite file. All PCs poll the same Modbus devices, producing
5 identical but isolated copies of the same data. There is no single source of truth.

**Goal:** Allow all PCs to optionally share one centralized database server for the
46 T3 device tables, while keeping each PC's local `webview_database.db`
(users, app config) unchanged.

---

## 2. Key Design Decision: MSSQL via Tiberius (Option B)

SeaORM's MSSQL support (`sqlz-mssql`) is only available through **SeaORM-X**,
which is commercial, closed-beta, and requires private repo access. Since the
user's PRIMARY requirement is SQL Server support, we use a **dual-driver**
architecture:

```
  ┌─────────────────────────────────────────────────────────┐
  │            T3AppState.t3_device_conn                     │
  │                      │                                   │
  │          ┌───────────┴───────────┐                       │
  │          │     DeviceDbConn      │  ← NEW enum wrapper   │
  │          │     (adapter layer)   │                       │
  │          └───────────┬───────────┘                       │
  │                      │                                   │
  │      ┌───────────────┼───────────────┐                   │
  │      │               │               │                   │
  │  SeaORM conn    SeaORM conn    bb8 Pool<Tiberius>        │
  │  (SQLite)       (PG / MySQL)   (SQL Server)              │
  │      │               │               │                   │
  │  Existing        Existing        Raw SQL with            │
  │  entity code     entity code     parameterized           │
  │  unchanged       unchanged       queries (46 tables,     │
  │                                  simple CRUD)            │
  └─────────────────────────────────────────────────────────┘
```

| Database       | Crate          | How                           |
|----------------|----------------|-------------------------------|
| SQLite         | `sea-orm` (sqlx-sqlite)  | Already working (default)     |
| PostgreSQL     | `sea-orm` (sqlx-postgres)| Just enable feature flag      |
| MySQL/MariaDB  | `sea-orm` (sqlx-mysql)   | Just enable feature flag      |
| **SQL Server** | **`tiberius`** + `bb8`   | Direct TDS driver, raw SQL    |

**Why tiberius:** Free, open-source, 4M+ downloads, pure Rust, native async
tokio support, SQL Server 2005-2022, built-in SQL Browser (UDP 1434), no
external driver installation needed.

**Trade-off:** MSSQL queries are raw SQL (not SeaORM entities), but the 46
device tables are simple CRUD — no complex joins or exotic queries.

---

## 3. What Changes vs What Stays The Same

| Component | Changes? | Details |
|-----------|----------|---------|
| `webview_database.db` (users, app config) | **NO** | Stays local SQLite, untouched |
| `webview_t3_device.db` (46 device tables + config) | **YES** | Add `DB_BACKEND_CONFIG` table (always read from local SQLite file). Device data can switch to SQL Server / PostgreSQL / MySQL |
| `AppState.conn` (primary DB connection) | **NO** | Untouched |
| `T3AppState.t3_device_conn` type | **YES** | Changes from `Option<Arc<Mutex<DatabaseConnection>>>` to `Option<Arc<Mutex<DeviceDbConn>>>` |
| `Cargo.toml` | **YES** | Add tiberius, bb8, sqlx-postgres, sqlx-mysql |
| `db_connection.rs` | **YES** | Backend-aware connection logic |
| `lib.rs` startup | **YES** | Load config before connecting |
| SeaORM entity code (60+ files) | **NO** | Works unchanged for SQLite/PG/MySQL |
| React frontend | **YES** | 1 new page + 1 API client file |
| FFI sync service | **SMALL** | Must use `DeviceDbConn` adapter instead of raw `DatabaseConnection` |

---

## 4. Config Storage: In `webview_t3_device.db` (Local SQLite File)

### Why store config in `webview_t3_device.db`?

The backend configuration (server, port, username, encrypted password) is
stored in `webview_t3_device.db` — the local SQLite file that already holds
`APPLICATION_CONFIG` and the 46 device tables.

**Key insight:** The **local SQLite file** `webview_t3_device.db` is **never deleted**.
It always exists on disk. When the user switches to a remote backend, the local
file simply stops being used for device data — but it's still there, and we still
read config from it.

**Startup flow:**
1. Always open local `webview_t3_device.db` SQLite file first (quick read)
2. Read `DB_BACKEND_CONFIG` table → which backend is active?
3. If `sqlite` → use this same connection for everything (same as today)
4. If `mssql/postgres/mysql` → open a SECOND connection to the remote DB
   for device data operations. The local SQLite stays open for config reads.

**Reasons this is the right approach:**
1. The `APPLICATION_CONFIG` table already lives here — consistent location
2. No change to `webview_database.db` (primary DB untouched)
3. No separate JSON config file to manage
4. No chicken-and-egg problem (local SQLite file always available)
5. Already has a working REST API (`/api/config/*`) and config history tracking
6. Already initialized at startup by `initialize_t3_device_database()`

### DB_BACKEND_CONFIG Table Schema

**Normalized design:** Each database type is a **row**, not a set of columns.
Adding a new DB type in the future = just INSERT a new row. No schema changes.

```sql
-- In webview_t3_device.db (local SQLite, always exists on disk)
CREATE TABLE IF NOT EXISTS DB_BACKEND_CONFIG (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    backend_type  TEXT NOT NULL UNIQUE,  -- 'sqlite'|'mssql'|'postgres'|'mysql'|future...
    is_active     INTEGER NOT NULL DEFAULT 0,  -- only ONE row has is_active=1
    host          TEXT,            -- server hostname or IP (NULL for sqlite)
    port          INTEGER,         -- server port (NULL for sqlite)
    instance      TEXT,            -- named instance, e.g. 'SQLEXPRESS' (MSSQL only)
    database_name TEXT,            -- database/catalog name on server
    username      TEXT,
    password      TEXT,            -- encrypted (AES-256-GCM), NULL for sqlite
    connection_url TEXT,           -- for sqlite: 'sqlite://Database/webview_t3_device.db'
    extra_options TEXT,            -- JSON for backend-specific options, e.g.:
                                  --   MSSQL:    {"trust_cert": true}
                                  --   Postgres: {"sslmode": "prefer"}
                                  --   MySQL:    {"charset": "utf8mb4"}
    updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Seed default rows (one per supported backend)
INSERT OR IGNORE INTO DB_BACKEND_CONFIG (backend_type, is_active, connection_url)
    VALUES ('sqlite', 1, 'sqlite://Database/webview_t3_device.db');
INSERT OR IGNORE INTO DB_BACKEND_CONFIG (backend_type, is_active, port)
    VALUES ('mssql', 0, 1433);
INSERT OR IGNORE INTO DB_BACKEND_CONFIG (backend_type, is_active, port)
    VALUES ('postgres', 0, 5432);
INSERT OR IGNORE INTO DB_BACKEND_CONFIG (backend_type, is_active, port)
    VALUES ('mysql', 0, 3306);
```

**Example data:**

| id | backend_type | is_active | host | port | instance | database_name | username | password | connection_url | extra_options |
|----|-------------|-----------|------|------|----------|--------------|----------|----------|----------------|--------------|
| 1 | sqlite | **1** | | | | | | | sqlite://Database/webview_t3_device.db | |
| 2 | mssql | 0 | 192.168.1.100 | 1433 | SQLEXPRESS | T3000_Devices | sa | (encrypted) | | {"trust_cert":true} |
| 3 | postgres | 0 | | 5432 | | | | | | {"sslmode":"prefer"} |
| 4 | mysql | 0 | | 3306 | | | | | | {"charset":"utf8mb4"} |

**Queries:**
- Read active: `SELECT * FROM DB_BACKEND_CONFIG WHERE is_active = 1`
- Switch backend: `UPDATE DB_BACKEND_CONFIG SET is_active = 0; UPDATE DB_BACKEND_CONFIG SET is_active = 1 WHERE backend_type = 'mssql';`
- Save settings: `UPDATE DB_BACKEND_CONFIG SET host=?, port=?, ... WHERE backend_type = 'mssql'`
- Add new DB type later: `INSERT INTO DB_BACKEND_CONFIG (backend_type, is_active, port) VALUES ('oracle', 0, 1521)`

**Why this is better:**
- Adding Oracle, CockroachDB, or any future DB = just a new row, no ALTER TABLE
- All backends share the same columns (host, port, username, password, etc.)
- Backend-specific options go in `extra_options` JSON column
- `UNIQUE(backend_type)` prevents duplicates

### Password Storage

Passwords are AES-256-GCM encrypted before writing to this table.
Key derived from machine identity (hostname + Windows machine SID).
Never stored in plaintext.

---

## 5. React Frontend: Pages & User Flow

### How Many Pages Added?

**1 new page:**

| New File | Route | Purpose |
|----------|-------|---------|
| `DatabaseConfigPage.tsx` | `/t3000/system/database` | All-in-one config page |

**1 new API client file:**

| New File | Purpose |
|----------|---------|
| `databaseConfigApi.ts` | API calls for backend config |

**Existing pages to modify:**

| File | Change |
|------|--------|
| `App.tsx` | Add `<Route path="system/database" ...>` |
| `menuConfig.ts` | Add "Database Backend" menu item under System |

### Where Does It Appear In The Menu?

```
  System (existing menu group in menuConfig.ts)
  ├── Sync Configuration     ← /t3000/system/sync (existing)
  └── Database Backend (NEW) ← /t3000/system/database
```

### How Does The User Choose A Database?

The single `DatabaseConfigPage.tsx` has sections stacked vertically:

```
  ┌─────────────────────────────────────────────────────┐
  │  Database Backend Configuration                      │
  ├─────────────────────────────────────────────────────┤
  │                                                      │
  │  ┌─ Current Status ────────────────────────────┐     │
  │  │  Active Backend: SQLite (Local)    [●green]  │     │
  │  │  Connection: Connected                       │     │
  │  │  Tables: 46                                  │     │
  │  └──────────────────────────────────────────────┘     │
  │                                                      │
  │  ┌─ Choose Backend ────────────────────────────┐     │
  │  │  ● SQLite (Local)     Default, zero config   │     │
  │  │  ○ SQL Server (MSSQL)                        │     │
  │  │  ○ PostgreSQL                                │     │
  │  │  ○ MySQL / MariaDB                           │     │
  │  └──────────────────────────────────────────────┘     │
  │                                                      │
  │  (When user selects "SQL Server", this appears:)     │
  │                                                      │
  │  ┌─ SQL Server Connection ─────────────────────┐     │
  │  │  Host:     [192.168.1.100    ]               │     │
  │  │  Port:     [1433             ]               │     │
  │  │  Instance: [SQLEXPRESS       ] (optional)    │     │
  │  │  Database: [T3000_Devices    ]               │     │
  │  │  Username: [sa               ]               │     │
  │  │  Password: [••••••••         ]               │     │
  │  │  ☑ Trust Server Certificate                  │     │
  │  │                                              │     │
  │  │  [🔍 Scan Network]  [🔌 Test Connection]     │     │
  │  └──────────────────────────────────────────────┘     │
  │                                                      │
  │  (Scan results, if Scan was clicked:)                │
  │                                                      │
  │  ┌─ Found SQL Server Instances ────────────────┐     │
  │  │  192.168.1.100\SQLEXPRESS  port:1433 [Use]  │     │
  │  │  192.168.1.55\MSSQLSERVER  port:1433 [Use]  │     │
  │  └──────────────────────────────────────────────┘     │
  │                                                      │
  │  (Test result:)                                      │
  │                                                      │
  │  ┌─ Connection Test ───────────────────────────┐     │
  │  │  ✅ Connected successfully                   │     │
  │  │  Server: Microsoft SQL Server 2022 (16.0)   │     │
  │  │  Database "T3000_Devices" exists: Yes        │     │
  │  └──────────────────────────────────────────────┘     │
  │                                                      │
  │  ┌─ Actions ───────────────────────────────────┐     │
  │  │  [💾 Save Settings]                          │     │
  │  │  [🏗️ Initialize Schema] Create 46 tables     │     │
  │  │                                              │     │
  │  │  ⚠️  Switch requires T3000 restart.           │     │
  │  │  ⚠️  Remote database starts empty (no data    │     │
  │  │     migration in v1).                        │     │
  │  │                                              │     │
  │  │  [🔄 Switch to SQL Server]                   │     │
  │  └──────────────────────────────────────────────┘     │
  └─────────────────────────────────────────────────────┘
```

### User Flow Step by Step

```
  1. User opens /t3000/system/database
     → Page loads, shows current status (SQLite, connected)

  2. User clicks "SQL Server (MSSQL)" radio button
     → Connection form appears with host/port/instance/db/user/pass fields

  3. User clicks [Scan Network] (optional)
     → API: GET /api/database/backend/scan
     → Shows list of discovered SQL Server instances
     → User clicks [Use] next to one → auto-fills host/port/instance

  4. User fills in credentials (or edits auto-filled values)

  5. User clicks [Test Connection]
     → API: POST /api/database/backend/test {host, port, ...}
     → Shows success/failure + server version info

  6. User clicks [Save Settings]
     → API: POST /api/database/backend/config
     → Password encrypted, stored in DB_BACKEND_CONFIG table
       in local webview_t3_device.db
     → Settings saved but backend NOT switched yet

  7. User clicks [Initialize Schema]
     → API: POST /api/database/backend/init-schema
     → Creates 46 tables on remote server (IF NOT EXISTS)
     → Shows "46 tables ready"

  8. User clicks [Switch to SQL Server]
     → API: POST /api/database/backend/switch
     → Updates active_backend = 'mssql' in DB_BACKEND_CONFIG
     → Shows "Restart T3000 to apply"

  9. User restarts T3000.exe
     → On startup: always opens local webview_t3_device.db first
     → Reads DB_BACKEND_CONFIG → sees 'mssql'
     → Opens second connection to SQL Server via tiberius
     → All device data now goes to shared SQL Server
     → Local SQLite stays open for future config reads
```

---

## 6. Startup Flow (How The Backend Is Selected)

```
  T3000.exe starts → Rust API init
        │
        ▼
  ┌──────────────────────────────────────┐
  │ 1. initialize_t3_device_database()   │  Always runs first!
  │    Ensures local webview_t3_device.db│  exists on disk
  │    (copy from ResourceFile or create │
  │    from SQL schema — same as today)  │
  └───────────────┬──────────────────────┘
                  │
  ┌───────────────▼──────────────────────┐
  │ 2. Open local webview_t3_device.db   │  Quick SQLite open
  │    SELECT * FROM DB_BACKEND_CONFIG  │
  │    WHERE is_active = 1              │
  │    → backend_type = ?               │
  └───────────────┬──────────────────────┘
                  │
        ┌─────────┴─────────┐
        │ active_backend?   │
        └──┬──┬──┬──┬───────┘
           │  │  │  │
  "sqlite" │  │  │  │ "mssql"
           │  │  │  │
           │  │  │  └──► Decrypt mssql_password
           │  │  │       Connect via tiberius + bb8 pool
           │  │  │       Verify schema (46 tables)
           │  │  │
           │  │  └─"mysql"──► SeaORM(sqlx-mysql) connect
           │  │               Verify schema
           │  │
           │  └──"postgres"─► SeaORM(sqlx-postgres) connect
           │                  Verify schema
           │
           └──► Use the SAME local SQLite connection
                Apply WAL, PRAGMAs, indexes
                Same as today, zero change
                  │
                  ▼
  ┌──────────────────────────────────┐
  │ 3. DeviceDbConn ready            │
  │    (wraps whichever backend)     │
  │    Local SQLite stays open for   │
  │    config reads regardless       │
  └───────────────┬──────────────────┘
                  │
                  ▼
  ┌──────────────────────────────────┐
  │ 4. Continue normal startup:      │
  │    - FFI Sync Service            │
  │    - Partition Monitor           │
  │    - WebSocket :9104             │
  │    - HTTP Server :9103           │
  └──────────────────────────────────┘
```

---

## 7. REST API Endpoints

All new endpoints under `/api/database/backend/`:

| # | Method | Path | Request Body | Response | Purpose |
|---|--------|------|-------------|----------|---------|
| 1 | `GET` | `/config` | — | `{active_backend, mssql:{host,port,...}, pg:{...}, mysql:{...}}` (passwords masked `****`) | Read current config |
| 2 | `POST` | `/config` | `{backend:"mssql", host, port, ...password}` | `{success: true}` | Save config (encrypts password, writes to DB_BACKEND_CONFIG) |
| 3 | `POST` | `/test` | `{backend:"mssql", host, port, ...password}` | `{success, server_version, error?}` | Test connection without saving or switching |
| 4 | `GET` | `/scan` | — | `[{host, instance, port, version}, ...]` | Scan LAN for SQL Server (UDP 1434) |
| 5 | `GET` | `/status` | — | `{active_backend, connected, table_count}` | Current runtime status |
| 6 | `POST` | `/switch` | `{backend:"mssql"}` | `{success, restart_required: true}` | Set active_backend, return restart needed |
| 7 | `POST` | `/init-schema` | `{backend:"mssql"}` | `{success, tables_created: 46}` | Create tables on remote DB |

---

## 8. DeviceDbConn Adapter Layer

Since MSSQL uses tiberius (not SeaORM), we need an adapter that provides a
unified interface for all backends. Existing code that calls SeaORM directly
will work unchanged for SQLite/PG/MySQL. For MSSQL, the adapter translates
to raw parameterized SQL.

```rust
// New enum in db_connection.rs or new file
pub enum DeviceDbConn {
    SeaOrm(DatabaseConnection),              // SQLite, PostgreSQL, MySQL
    Mssql(bb8::Pool<TiberiusConnectionManager>), // SQL Server via tiberius
}

impl DeviceDbConn {
    // For SeaORM backends, just return the connection
    pub fn as_sea_orm(&self) -> Option<&DatabaseConnection> { ... }

    // For MSSQL, get a pooled connection
    pub async fn get_mssql(&self) -> Option<bb8::PooledConnection<...>> { ... }

    // Which backend is active?
    pub fn backend_type(&self) -> BackendType { ... }
}
```

**Impact on existing code:**
- Most service code uses SeaORM entities → works unchanged for SQLite/PG/MySQL
- For MSSQL, the FFI sync service and trendlog service must have an alternate
  code path that uses raw SQL through tiberius
- The raw SQL is simple INSERT/UPDATE/SELECT — not complex

---

## 9. Full Breakdown Steps

### ═══ PHASE 1: Dependencies + Config Table + Config Service ═══
*Goal: Store and read backend config. No actual connections yet.*

| Step | File | Action |
|------|------|--------|
| 1.1 | `api/Cargo.toml` | Add: `tiberius`, `bb8`, `bb8-tiberius`, `tokio-util`, `aes-gcm`, `base64`. Enable: `sqlx-postgres`, `sqlx-mysql` in sea-orm features. |
| 1.2 | `api/migration/sql/webview_t3_device_schema.sql` | Add `DB_BACKEND_CONFIG` table to the existing device schema (creates alongside the 46 device tables) |
| 1.3 | `api/src/entity/` | Add `db_backend_config.rs` — SeaORM entity for `DB_BACKEND_CONFIG` table |
| 1.4 | `api/src/database_management/db_backend_config.rs` | Create: `BackendType` enum, `load_config()`, `save_config()`, `encrypt_password()`, `decrypt_password()`, `build_mssql_config()`, `build_seaorm_url()`, `validate_config()` |
| 1.5 | `api/src/database_management/mod.rs` | Register `pub mod db_backend_config;` |
| 1.6 | Compile + test | `cargo build --release` — verify existing SQLite behavior unchanged (new table exists but defaults to `sqlite`) |

### ═══ PHASE 2: DeviceDbConn Adapter + Connection Logic ═══
*Goal: Actually connect to the chosen backend at startup.*

| Step | File | Action |
|------|------|--------|
| 2.1 | `api/src/db_connection.rs` | Create `DeviceDbConn` enum. Modify `establish_t3_device_connection()` to: (a) read `DB_BACKEND_CONFIG`, (b) if sqlite → existing code, (c) if mssql → tiberius + bb8 pool, (d) if pg/mysql → SeaORM with new URL |
| 2.2 | `api/src/app_state.rs` | Change `t3_device_conn` type from `Option<Arc<Mutex<DatabaseConnection>>>` to `Option<Arc<Mutex<DeviceDbConn>>>` |
| 2.3 | `api/src/lib.rs` | In `start_all_services()`: always run `initialize_t3_device_database()` first (ensures local SQLite + config table exist), then read config, then connect to chosen backend. Log active backend. |
| 2.4 | All service files using `t3_device_conn` | Update to call `conn.as_sea_orm()` or `conn.get_mssql()` depending on backend. Most files just need `.as_sea_orm().unwrap()` wrapper for now. |
| 2.5 | Compile + test | Connect to actual SQL Server instance, verify startup log says "MSSQL connected" |

### ═══ PHASE 3: Schema Files + Schema Init ═══
*Goal: Create 46 tables on remote DB servers.*

| Step | File | Action |
|------|------|--------|
| 3.1 | `api/migration/sql/webview_t3_device_mssql.sql` | Translate 46 tables to T-SQL dialect (IDENTITY, NVARCHAR, IF NOT EXISTS wrapper) |
| 3.2 | `api/migration/sql/webview_t3_device_postgres.sql` | Translate 46 tables to PostgreSQL dialect (SERIAL, TEXT, BYTEA) |
| 3.3 | `api/migration/sql/webview_t3_device_mysql.sql` | Translate 46 tables to MySQL dialect (AUTO_INCREMENT, InnoDB) |
| 3.4 | `api/src/database_management/db_backend_config.rs` | Add `initialize_remote_schema(conn, backend)` — read embedded SQL, execute statements |
| 3.5 | Test | Create tables on real SQL Server, verify all 46 exist |

### ═══ PHASE 4: REST API Endpoints + Network Scan ═══
*Goal: Frontend can configure, test, scan, switch backend via REST.*

| Step | File | Action |
|------|------|--------|
| 4.1 | `api/src/database_management/db_backend_routes.rs` | Create 7 endpoints: GET config, POST config, POST test, GET scan, GET status, POST switch, POST init-schema |
| 4.2 | `api/src/database_management/network_scan.rs` | UDP 1434 broadcast → parse SQL Server Browser responses |
| 4.3 | `api/src/database_management/mod.rs` | Register `pub mod db_backend_routes;` and `pub mod network_scan;` |
| 4.4 | `api/src/server.rs` | Add `.merge(db_backend_routes())` in `create_t3_app()` |
| 4.5 | Test | curl all 7 endpoints manually |

### ═══ PHASE 5: MSSQL Raw SQL Adapter ═══
*Goal: FFI sync and trendlog operations work on SQL Server.*

| Step | File | Action |
|------|------|--------|
| 5.1 | `api/src/database_management/mssql_queries.rs` | Write raw T-SQL equivalents for INSERT/UPDATE/SELECT on key tables: DEVICES, INPUTS, OUTPUTS, VARIABLES, PROGRAMS, SCHEDULES, TRENDLOG_INPUTS, MONITORDATA |
| 5.2 | FFI sync service files | Add MSSQL code path: if `DeviceDbConn::Mssql` → use `mssql_queries` functions |
| 5.3 | Trendlog service files | Add MSSQL code path for trendlog writes |
| 5.4 | Test | Run FFI sync with SQL Server, verify data appears in remote tables |

### ═══ PHASE 6: React Frontend ═══
*Goal: User can configure and switch backend from the browser.*

| Step | File | Action |
|------|------|--------|
| 6.1 | `src/t3-react/features/system/api/databaseConfigApi.ts` | API client: `getConfig()`, `saveConfig()`, `testConnection()`, `scanNetwork()`, `getStatus()`, `switchBackend()`, `initSchema()` |
| 6.2 | `src/t3-react/features/system/pages/DatabaseConfigPage.tsx` | Full page: status card, radio selector, connection form, scan results, test result, save/init/switch buttons |
| 6.3 | `src/t3-react/app/App.tsx` | Add `<Route path="system/database" element={<DatabaseConfigPage />} />` |
| 6.4 | `src/t3-react/config/menuConfig.ts` | Add "Database Backend" under System menu group |
| 6.5 | Test | Full browser walkthrough: select MSSQL → fill form → scan → test → save → init → switch → restart |

### ═══ PHASE 7: SQLite-Specific Code Audit + Hardening ═══
*Goal: No crashes when running on non-SQLite backend.*

| Step | File | Action |
|------|------|--------|
| 7.1 | All `.rs` files | Search for `DatabaseBackend::Sqlite`, `PRAGMA`, `datetime('now')`, `GROUP_CONCAT`, `IFNULL`. Gate behind backend type check. |
| 7.2 | `partition_monitor_service.rs` | Skip SQLite PRAGMAs when remote backend |
| 7.3 | `db_connection.rs` | Only apply WAL/PRAGMA/indexes for SQLite backend |
| 7.4 | Test failure paths | Remote DB down, wrong password, network timeout, switch back to SQLite |

---

## 10. Files Changed Summary

### New Files (10 files)

| # | File | Est. Lines | Purpose |
|---|------|-----------|---------|
| 1 | `api/src/database_management/db_backend_config.rs` | ~350 | Config load/save/validate, password crypto |
| 2 | `api/src/database_management/db_backend_routes.rs` | ~300 | 7 REST endpoints |
| 3 | `api/src/database_management/network_scan.rs` | ~120 | UDP 1434 SQL Server scanner |
| 4 | `api/src/database_management/mssql_queries.rs` | ~400 | Raw T-SQL for key device table CRUD |
| 5 | `api/src/entity/db_backend_config.rs` | ~40 | SeaORM entity for config table |
| 6 | `api/migration/sql/webview_t3_device_mssql.sql` | ~1400 | 46 tables in T-SQL |
| 7 | `api/migration/sql/webview_t3_device_postgres.sql` | ~1350 | 46 tables in PostgreSQL |
| 8 | `api/migration/sql/webview_t3_device_mysql.sql` | ~1400 | 46 tables in MySQL |
| 9 | `src/t3-react/features/system/pages/DatabaseConfigPage.tsx` | ~400 | React config UI |
| 10 | `src/t3-react/features/system/api/databaseConfigApi.ts` | ~80 | React API client |

### Modified Files (8 files)

| # | File | Change |
|---|------|--------|
| 1 | `api/Cargo.toml` | Add tiberius, bb8, aes-gcm, base64; enable sqlx-postgres, sqlx-mysql |
| 2 | `api/src/db_connection.rs` | `DeviceDbConn` enum, backend-aware `establish_t3_device_connection()` |
| 3 | `api/src/app_state.rs` | Change `t3_device_conn` type to `DeviceDbConn` |
| 4 | `api/src/lib.rs` | Load config before DB init, skip SQLite init if remote |
| 5 | `api/src/database_management/mod.rs` | Register 4 new submodules |
| 6 | `api/src/server.rs` | Register backend routes in `create_t3_app()` |
| 7 | `src/t3-react/app/App.tsx` | Add route `/t3000/system/database` |
| 8 | `src/t3-react/config/menuConfig.ts` | Add "Database Backend" menu item |

### Possibly Modified (Phase 7 audit)

| # | Files | Change |
|---|-------|--------|
| 9+ | Various service `.rs` files with raw SQLite SQL | Gate behind `if backend == Sqlite` |
| 9+ | FFI sync + trendlog service files | Add MSSQL code path using `mssql_queries.rs` |

---

## 11. Risks & Mitigations

| # | Risk | Severity | Mitigation |
|---|------|----------|------------|
| 1 | Remote DB down → all PCs lose device data | HIGH | Graceful degradation: `t3_device_conn = None`, service runs without device data. |
| 2 | Two code paths: SeaORM vs tiberius for MSSQL | HIGH | Limit tiberius raw SQL to a single `mssql_queries.rs` file. Unit test each query. |
| 3 | Multiple PCs writing same rows simultaneously | MEDIUM | Last-write-wins for v1. Data converges since all PCs poll same devices. |
| 4 | Password stored in SQLite | MEDIUM | AES-256-GCM encrypted. Key derived from machine identity. |
| 5 | Raw SQLite SQL breaks on PG/MySQL | HIGH | Phase 7 audit. Gate all PRAGMA and SQLite-specific functions. |
| 6 | DLL size increase | LOW | tiberius adds ~2MB. Acceptable. |
| 7 | Schema drift between 4 SQL files | MEDIUM | Hand-maintained. Version tracking. Diff tool for updates. |
| 8 | tiberius connection pool exhaustion | MEDIUM | bb8 pool with max=10, min=2. Monitor pool health in status endpoint. |
| 9 | SQL injection via tiberius raw queries | HIGH | All queries use parameterized `@P1, @P2` syntax. Never string interpolation. |
| 10 | Empty string vs NULL differences (MSSQL) | MEDIUM | Test INSERT/UPDATE with empty strings on all backends. |
| 11 | Partition monitor uses SQLite PRAGMAs | MEDIUM | Gate behind backend type check in Phase 7. |
| 12 | UDP 1434 scan blocked by firewall | LOW | Scan is optional convenience. Manual config always works. |

---

## 12. Rollback Strategy

**Switch back to SQLite:**
1. Open `/t3000/system/database`
2. Select "SQLite (Local)", click "Switch to SQLite"
3. Restart T3000
4. Local SQLite file is **never deleted** — previous data still intact

**Config table corrupted:**
- Delete row from `DB_BACKEND_CONFIG` in local `webview_t3_device.db` → restart → defaults to SQLite

**Worst case:**
- Delete `webview_t3_device.db` → recreated on next startup with SQLite defaults (includes fresh config table)

---

## 13. Out Of Scope (Future Work)

- Data migration between backends (v1 starts fresh)
- Real-time replication SQLite ↔ remote
- Multi-master conflict resolution
- Automatic failover to SQLite if remote DB goes down
- Per-table backend selection (all 46 go together)
- SeaORM-X integration for native MSSQL support (if it becomes available)

---

## CONFIRMATION NEEDED

1. **7 phases** — are they all acceptable?
2. **Config in local SQLite** (`DB_BACKEND_CONFIG` table in `webview_t3_device.db`, always read from local file first) — OK?
3. **tiberius for MSSQL** (Option B) — OK to proceed despite dual code path?
4. **1 React page** with all functionality — or split into sub-pages?
5. Any steps to add, remove, or reorder?
6. Any risks I missed?
