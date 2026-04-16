# T3000 Centralized Database — Multi-PC Architecture

**Date:** 2026-04-16
**Status:** DESIGN — Pending implementation
**Focus:** MSSQL (SQL Server) as primary example

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Scenario A — Classic Mode (No Central DB)](#2-scenario-a--classic-mode)
3. [Scenario B — Central DB with Main/Reader Roles](#3-scenario-b--central-db-with-mainreader-roles)
4. [Configuration Design](#4-configuration-design)
5. [Data Flow Matrix](#5-data-flow-matrix)
6. [Trendlog & Large Data Considerations](#6-trendlog--large-data-considerations)
7. [Logs Table for Central DB](#7-logs-table-for-central-db)
8. [Edge Cases](#8-edge-cases)
9. [Implementation Plan](#9-implementation-plan)

See also:
- [centralized-database-design.md](centralized-database-design.md) — Phase 1-7 technical details
- [multipc-data-flow-details.md](multipc-data-flow-details.md) — Detailed per-feature data flow diagrams

---

## 1. Problem Statement

A building has 5 PCs running T3000, all polling the same BACnet/Modbus panels.
Today each PC has its own local SQLite DB — 5 isolated copies of the same data.

**Goal:** Let user designate ONE PC as "main" (writes to a central MSSQL server),
while other PCs become "readers" (read from the same central DB). No duplicate
writes. Safe fallback to local SQLite if central DB feature is disabled.

**Key rules:**
- Existing local SQLite features must remain fully functional
- User can switch back to local mode at any time
- Setting is per-PC: each PC knows its own role (main or reader)
- MSSQL (SQL Server) is the primary target

---

## 2. Scenario A — Classic Mode

```
 enabled=0 in setting.ini (DEFAULT — nothing changes)

 PC-1                PC-2                PC-3                PC-4                PC-5
 ┌──────────┐       ┌──────────┐       ┌──────────┐       ┌──────────┐       ┌──────────┐
 │T3000.exe │       │T3000.exe │       │T3000.exe │       │T3000.exe │       │T3000.exe │
 │  │ FFI    │       │  │ FFI    │       │  │ FFI    │       │  │ FFI    │       │  │ FFI    │
 │  ▼        │       │  ▼        │       │  ▼        │       │  ▼        │       │  ▼        │
 │ Rust DLL  │       │ Rust DLL  │       │ Rust DLL  │       │ Rust DLL  │       │ Rust DLL  │
 │  │        │       │  │        │       │  │        │       │  │        │       │  │        │
 │  ▼        │       │  ▼        │       │  ▼        │       │  ▼        │       │  ▼        │
 │ SQLite-1  │       │ SQLite-2  │       │ SQLite-3  │       │ SQLite-4  │       │ SQLite-5  │
 │ (local)   │       │ (local)   │       │ (local)   │       │ (local)   │       │ (local)   │
 │  │        │       │  │        │       │  │        │       │  │        │       │  │        │
 │  ▼        │       │  ▼        │       │  ▼        │       │  ▼        │       │  ▼        │
 │ Web:9103  │       │ Web:9103  │       │ Web:9103  │       │ Web:9103  │       │ Web:9103  │
 └──────────┘       └──────────┘       └──────────┘       └──────────┘       └──────────┘

 Each PC sees only its own panels' data.
 Browser at http://PC-2:9103 sees PC-2's data only.
 100% current behavior. Zero code changes needed.
```

---

## 3. Scenario B — Central DB with Main/Reader Roles

```
 enabled=1 in setting.ini
 PC-1: role=main     PC-2..5: role=reader

                    ┌─────────────────────────────────┐
                    │        MSSQL Server              │
                    │   (192.168.1.50, port 1433)      │
                    │                                  │
                    │  DEVICES    ← written by MAIN    │
                    │  INPUTS     ← written by MAIN    │
                    │  OUTPUTS    ← written by MAIN    │
                    │  VARIABLES  ← written by MAIN    │
                    │  TRENDLOGS  ← written by MAIN    │
                    │  TRENDLOG_DATA_DETAIL             │
                    │  ...46 tables...                 │
                    │  + SYSTEM_LOGS (new)              │
                    └──┬─────┬─────┬─────┬─────┬──────┘
                       │     │     │     │     │
          ┌────────────┘     │     │     │     └────────────┐
          │            ┌─────┘     │     └─────┐            │
          │            │           │           │            │
     ┌────┴────┐  ┌────┴────┐ ┌───┴─────┐ ┌───┴────┐ ┌────┴────┐
     │  PC-1   │  │  PC-2   │ │  PC-3   │ │  PC-4  │ │  PC-5   │
     │  MAIN   │  │ READER  │ │ READER  │ │ READER │ │ READER  │
     │         │  │         │ │         │ │        │ │         │
     │ FFI ──► │  │ FFI ──► │ │ FFI ──► │ │FFI ──►│ │ FFI ──► │
     │ central │  │ local   │ │ local   │ │local  │ │ local   │
     │ DB only │  │ SQLite  │ │ SQLite  │ │SQLite │ │ SQLite  │
     │         │  │ (local  │ │ (local  │ │(local │ │ (local  │
     │         │  │  only)  │ │  only)  │ │ only) │ │  only)  │
     │         │  │         │ │         │ │        │ │         │
     │ Web R/W │  │ Web R/W │ │ Web R/W │ │Web R/W│ │ Web R/W │
     │ central │  │ central │ │ central │ │central│ │ central │
     └─────────┘  └─────────┘ └─────────┘ └────────┘ └─────────┘

     1 writer, 4 readers.
     No duplicate writes to central DB.
     Everyone sees the same data.
```

### Main PC Detail

```
┌──────────────────────────────────────────────────────────────────┐
│   MAIN PC  (setting.ini: enabled=1, role=main)                   │
│                                                                  │
│  BACnet/Modbus Panels                                            │
│       │                                                          │
│  T3000.exe polls all panels                                      │
│       │ FFI call                                                 │
│       ▼                                                          │
│  Rust DLL (FFI sync service)                                     │
│       │                                                          │
│       └──► MSSQL (Central DB)  ← FFI writes HERE (role=main)    │
│            46 device tables                                      │
│            + trendlog data                                       │
│                                                                  │
│       ╳ Does NOT write to local SQLite for device data           │
│         (when central DB is enabled, to avoid data split)        │
│                                                                  │
│  Local SQLite remains for:                                       │
│       • DB_BACKEND_CONFIG (connection settings)                  │
│       • Fallback if central DB goes down                         │
│                                                                  │
│  Web Server :9103                                                │
│       └──► reads/writes from MSSQL (Central DB)                  │
│                                                                  │
│  Trendlog Beta Page / Browser                                    │
│       └──► hits Web :9103 → reads MSSQL                          │
└──────────────────────────────────────────────────────────────────┘
```

### Reader PC Detail

```
┌──────────────────────────────────────────────────────────────────┐
│   READER PC  (setting.ini: enabled=1, role=reader)               │
│                                                                  │
│  BACnet/Modbus Panels (still visible on network)                 │
│       │                                                          │
│  T3000.exe polls panels (C++ side, untouched)                    │
│       │ FFI call                                                 │
│       ▼                                                          │
│  Rust DLL (FFI sync service)                                     │
│       │                                                          │
│       └──► LOCAL SQLite   ← FFI writes here (existing behavior) │
│            (reader keeps local copy for its own use)             │
│                                                                  │
│       ╳ Does NOT write to central DB (role=reader)               │
│                                                                  │
│  Web Server :9103                                                │
│       └──► reads/writes from MSSQL (Central DB)                  │
│            (all web pages show central data)                     │
│                                                                  │
│  Trendlog Beta Page / Browser                                    │
│       └──► hits Web :9103 → reads MSSQL                          │
│            → sees ALL panels data (from main's writes)           │
└──────────────────────────────────────────────────────────────────┘
```

---

## 4. Configuration Design

### 4.1 Two-layer config: INI + SQLite table

```
┌─────────────────────────────────────────────────────────────┐
│ LAYER 1: setting.ini                                         │
│ (C++ app territory, read by Rust DLL at startup)             │
│                                                              │
│  [CentralDatabase]                                           │
│  enabled=0              ; 0=classic local, 1=use central DB  │
│  role=main              ; "main" or "reader"                 │
│                                                              │
│  That's it. Only 2 fields. Simple and clear.                 │
│  IT admin can set this before deployment.                    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ LAYER 2: DB_BACKEND_CONFIG table (local SQLite)              │
│ (connection details with encrypted password)                 │
│                                                              │
│  Already exists from Phase 1. Stores:                        │
│    backend_type, host, port, instance,                       │
│    database_name, username, password (encrypted),            │
│    connection_url, extra_options                              │
│                                                              │
│  + NEW fields:                                               │
│    role         TEXT  DEFAULT 'main'  — mirrors INI          │
│    sync_trendlog_to_central  INT  DEFAULT 1                  │
│    store_logs   INT  DEFAULT 1  — enable/disable log storage │
│                                                              │
│  Both main and reader PCs fill in same connection info       │
│  (host, port, user, pass) because all PCs connect to read.  │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Why two layers?

```
setting.ini:
  ✅ T3000.exe (C++) can read it natively at startup
  ✅ IT admin can pre-configure 5 PCs with notepad
  ✅ Simple: just enabled + role
  ✅ No need to open SQLite to know if central DB is on

DB_BACKEND_CONFIG table:
  ✅ Password encrypted (not plain text in INI)
  ✅ Web UI config page reads/writes here
  ✅ Already built and tested (Phase 1-6)
  ✅ Complex fields (extra_options JSON, etc.)

Rust DLL startup:
  1. Read setting.ini → enabled? role?
  2. If enabled=1 → read DB_BACKEND_CONFIG → get connection details
  3. Connect to central MSSQL
  4. Store role in T3AppState
```

### 4.3 Updated DB_BACKEND_CONFIG table

```sql
-- In webview_t3_device.db (local SQLite, always exists)
CREATE TABLE IF NOT EXISTS DB_BACKEND_CONFIG (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    backend_type   TEXT NOT NULL UNIQUE,
    is_active      INTEGER NOT NULL DEFAULT 0,
    host           TEXT,
    port           INTEGER,
    instance       TEXT,
    database_name  TEXT,
    username       TEXT,
    password       TEXT,            -- AES-256-GCM encrypted
    connection_url TEXT,
    extra_options  TEXT,            -- JSON
    role           TEXT DEFAULT 'main',     -- NEW: 'main' or 'reader'
    store_logs     INTEGER DEFAULT 1,       -- NEW: write logs to central DB
    updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 4.4 User setup flow (MSSQL example)

```
ADMIN ON PC-1 (the designated main):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Step 1: Install SQL Server on a server (or any PC)
        → MSSQL now running at 192.168.1.50:1433

Step 2: Edit setting.ini (or let Web UI do it):
        [CentralDatabase]
        enabled=1
        role=main

Step 3: Open Web UI → System → Database Backend
        → Page detects enabled=1, shows config form
        → Fill in: host=192.168.1.50, instance=SQLEXPRESS,
          database=T3000_Devices, user=sa, password=...
        → Click "Test Connection" → success
        → Click "Save Configuration" → saved to local SQLite
        → Click "Init Schema" → creates 46+ tables on MSSQL
        → Click "Activate" → restart, now running on central DB

Step 4: Status shows:
        🟢 MSSQL @ 192.168.1.50 · Role: MAIN · 46 tables · Online


ADMIN ON PC-2..5 (readers):
━━━━━━━━━━━━━━━━━━━━━━━━━━

Step 1: Edit setting.ini:
        [CentralDatabase]
        enabled=1
        role=reader

Step 2: Open Web UI → System → Database Backend
        → Fill in SAME host/port/user/pass as PC-1
        → Click "Test Connection" → success
        → Click "Save Configuration"
        → Click "Activate"
        → (No "Init Schema" needed — tables already exist)

Step 3: Status shows:
        🔵 MSSQL @ 192.168.1.50 · Role: READER · 46 tables · Online
```

---

## 5. Data Flow Matrix

```
┌──────────────────────────┬───────────────┬───────────────┬───────────────────┐
│ Feature / Action         │ enabled=0     │ enabled=1     │ enabled=1         │
│                          │ (classic)     │ role=main     │ role=reader       │
├──────────────────────────┼───────────────┼───────────────┼───────────────────┤
│ FFI sync                 │ → local       │ → central DB  │ → local SQLite    │
│ (T3000 polls panels)     │   SQLite      │   ONLY        │   ONLY            │
│                          │               │ (not local)   │ (not central)     │
├──────────────────────────┼───────────────┼───────────────┼───────────────────┤
│ Trendlog data from FFI   │ → local       │ → central DB  │ → local SQLite    │
│ (high-volume)            │   SQLite      │   ONLY        │   (own copy)      │
│                          │               │ (skip local)  │                   │
├──────────────────────────┼───────────────┼───────────────┼───────────────────┤
│ Web UI: Trendlog page    │ read local    │ read central  │ read central      │
│ (browser or built-in)    │ SQLite        │ DB            │ DB                │
├──────────────────────────┼───────────────┼───────────────┼───────────────────┤
│ Web UI: Device list      │ read local    │ read central  │ read central      │
│                          │ SQLite        │ DB            │ DB                │
├──────────────────────────┼───────────────┼───────────────┼───────────────────┤
│ Web UI: I/O/Var tables   │ read local    │ read central  │ read central      │
│                          │ SQLite        │ DB            │ DB                │
├──────────────────────────┼───────────────┼───────────────┼───────────────────┤
│ Web UI: user edits value │ write local   │ write central │ write central     │
│                          │ SQLite        │ DB            │ DB (allowed)      │
├──────────────────────────┼───────────────┼───────────────┼───────────────────┤
│ Schedules, PIDs, Alarms  │ read/write    │ read/write    │ read/write        │
│                          │ local SQLite  │ central DB    │ central DB        │
├──────────────────────────┼───────────────┼───────────────┼───────────────────┤
│ System logs              │ local file    │ central DB +  │ central DB +      │
│                          │ only          │ local file    │ local file        │
├──────────────────────────┼───────────────┼───────────────┼───────────────────┤
│ DB_BACKEND_CONFIG        │ local SQLite  │ local SQLite  │ local SQLite      │
│ (connection settings)    │ (always)      │ (always)      │ (always)          │
├──────────────────────────┼───────────────┼───────────────┼───────────────────┤
│ Switch back to local     │ N/A (already  │ set enabled=0 │ set enabled=0     │
│                          │  local)       │ restart       │ restart           │
│                          │               │ → full local  │ → full local      │
│                          │               │   features    │   features        │
└──────────────────────────┴───────────────┴───────────────┴───────────────────┘
```

---

## 6. Trendlog & Large Data Considerations

### Why main PC should NOT write trendlog to local SQLite

```
 Problem with writing trendlog to both local + central:

 ┌──────────────────────────────────────────────────────────────┐
 │  TRENDLOG_DATA_DETAIL size over time:                       │
 │                                                              │
 │  100 panels × 10 points × 1 sample/5min × 365 days         │
 │  = 100 × 10 × 288 × 365 = ~105 million rows/year           │
 │                                                              │
 │  In SQLite: 105M rows ≈ 8-15 GB → performance disaster     │
 │  In MSSQL:  105M rows → handled fine with indexes/partition │
 └──────────────────────────────────────────────────────────────┘

 So when enabled=1, role=main:
   FFI trendlog data → central DB ONLY (not local SQLite)
   This avoids the SQLite size disaster you mentioned.

 When enabled=0 (classic mode):
   FFI trendlog data → local SQLite (same as always)
   For single-PC setups this is fine — less data volume.
```

### Data destination by table type

```
┌──────────────────────┬────────────────┬────────────────────┐
│ Table category       │ enabled=0      │ enabled=1, main    │
├──────────────────────┼────────────────┼────────────────────┤
│ Device config tables │ local SQLite   │ central DB only    │
│ (DEVICES, INPUTS,    │                │                    │
│  OUTPUTS, VARIABLES, │                │                    │
│  PROGRAMS, etc.)     │                │                    │
├──────────────────────┼────────────────┼────────────────────┤
│ Trendlog metadata    │ local SQLite   │ central DB only    │
│ (TRENDLOGS,          │                │                    │
│  TRENDLOG_INPUTS)    │                │                    │
├──────────────────────┼────────────────┼────────────────────┤
│ Trendlog data        │ local SQLite   │ central DB ONLY    │
│ (TRENDLOG_DATA,      │                │ (never local —     │
│  TRENDLOG_DATA_      │                │  too much data)    │
│  DETAIL)             │                │                    │
├──────────────────────┼────────────────┼────────────────────┤
│ System logs (new)    │ local file     │ central DB + local │
│                      │                │ (configurable)     │
├──────────────────────┼────────────────┼────────────────────┤
│ DB_BACKEND_CONFIG    │ local SQLite   │ local SQLite       │
│                      │ (always)       │ (always)           │
└──────────────────────┴────────────────┴────────────────────┘
```

---

## 7. Logs Table for Central DB

### New SYSTEM_LOGS table

```sql
-- Added to ALL schema files (SQLite, Postgres, MySQL, MSSQL)
CREATE TABLE IF NOT EXISTS SYSTEM_LOGS (
    id             INT IDENTITY(1,1) PRIMARY KEY,  -- MSSQL syntax
    log_time       DATETIME NOT NULL DEFAULT GETDATE(),
    pc_name        NVARCHAR(128),     -- which PC generated this log
    pc_ip          NVARCHAR(64),      -- IP of the PC
    log_level      NVARCHAR(16),      -- INFO, WARN, ERROR, DEBUG
    log_source     NVARCHAR(128),     -- e.g. 'FFI_SYNC', 'WEB_API', 'TRENDLOG'
    log_message    NVARCHAR(MAX),     -- the actual log message
    log_details    NVARCHAR(MAX),     -- optional JSON with extra context
    serial_number  INT,               -- optional: related device
    panel_id       INT                -- optional: related panel
);

-- Index for time-based queries
CREATE INDEX IX_SYSTEM_LOGS_TIME ON SYSTEM_LOGS (log_time DESC);
CREATE INDEX IX_SYSTEM_LOGS_LEVEL ON SYSTEM_LOGS (log_level, log_time DESC);
```

### Logs configuration

```
Web UI: System → Database Backend → Logs Settings

┌─ Log Storage ──────────────────────────────────────────────┐
│                                                             │
│  [✓] Store logs to central database                        │
│      Log level: [WARNING and above ▼]                      │
│      Retention: [30 days ▼]                                │
│                                                             │
│  [✓] Keep local log files (always recommended)             │
│      Path: C:\T3000\logs\                                  │
│                                                             │
│  Log sources:                                               │
│  [✓] FFI Sync        [✓] Web API                            │
│  [✓] Trendlog Sync   [✓] Device Discovery                   │
│  [ ] Debug traces     [ ] SQL queries                        │
└─────────────────────────────────────────────────────────────┘

 Benefits of central DB logs:
  • See logs from ALL 5 PCs in one place
  • Filter by pc_name to debug a specific PC
  • MSSQL can hold years of logs efficiently
  • Queryable via SQL (unlike text files)
```

---

## 8. Edge Cases

```
┌──────────────────────────────┬────────────────────────────────────┐
│ Situation                    │ What happens                       │
├──────────────────────────────┼────────────────────────────────────┤
│ Main PC goes offline         │ Central DB still running           │
│                              │ (DB server is separate machine)    │
│                              │ Readers still read from central DB │
│                              │ No new FFI data until main returns │
├──────────────────────────────┼────────────────────────────────────┤
│ Central DB goes offline      │ Main: FFI write to central fails   │
│                              │   → log error, retry next cycle    │
│                              │   → Web UI shows DB offline error  │
│                              │ Readers: Web UI shows DB offline   │
│                              │   → can optionally fall back to    │
│                              │     reading own local SQLite       │
├──────────────────────────────┼────────────────────────────────────┤
│ Two PCs both set role=main   │ Both write to central → duplicates │
│                              │ Mitigated: UPSERT by SerialNumber  │
│                              │ + PanelId. Last write wins.        │
│                              │ UI warns: "Another main detected"  │
├──────────────────────────────┼────────────────────────────────────┤
│ Reader edits a setpoint      │ Allowed — writes to central DB     │
│ via Web UI                   │ via REST API. Main's next FFI poll │
│                              │ may overwrite with device value.   │
├──────────────────────────────┼────────────────────────────────────┤
│ setting.ini missing section  │ Default: enabled=0 → classic mode  │
│ [CentralDatabase]            │ Everything works as before.        │
├──────────────────────────────┼────────────────────────────────────┤
│ User switches back to local  │ Set enabled=0 in setting.ini       │
│                              │ Restart T3000 → classic mode       │
│                              │ Local SQLite still has data from   │
│                              │ reader's own FFI (never stopped)   │
│                              │ All features fully functional      │
├──────────────────────────────┼────────────────────────────────────┤
│ Central DB gets too large    │ MSSQL handles 100M+ rows fine      │
│ (trendlog data)              │ Add retention policy: auto-purge   │
│                              │ data older than N months            │
│                              │ (configurable in Web UI)           │
└──────────────────────────────┴────────────────────────────────────┘
```

---

## 9. Implementation Plan

```
┌───┬────────────────────────────────┬─────────────────────┬──────────────────┐
│ # │ Task                           │ Files               │ Risk Level       │
├───┼────────────────────────────────┼─────────────────────┼──────────────────┤
│ 1 │ INI reader/writer service      │ NEW: ini_config.rs  │ Low — new file   │
│   │ Read [CentralDatabase] from    │                     │                  │
│   │ setting.ini                    │                     │                  │
├───┼────────────────────────────────┼─────────────────────┼──────────────────┤
│ 2 │ Add role + store_logs columns  │ db_backend_config   │ Low — additive   │
│   │ to DB_BACKEND_CONFIG           │ entity + migration  │                  │
├───┼────────────────────────────────┼─────────────────────┼──────────────────┤
│ 3 │ Add role to T3AppState         │ app_state.rs        │ Low — 1 field    │
├───┼────────────────────────────────┼─────────────────────┼──────────────────┤
│ 4 │ Startup: read INI + config,    │ app_state.rs,       │ Medium — logic   │
│   │ decide connection + role       │ db_connection.rs    │ change           │
├───┼────────────────────────────────┼─────────────────────┼──────────────────┤
│ 5 │ FFI sync: main writes to       │ t3_ffi_sync_        │ Medium — additive│
│   │ central DB instead of local    │ service.rs          │ not destructive  │
│   │ when enabled=1+role=main       │                     │                  │
├───┼────────────────────────────────┼─────────────────────┼──────────────────┤
│ 6 │ SYSTEM_LOGS table + service    │ NEW: system_logs.rs │ Low — new file   │
│   │ Add to all 4 schema files      │ + schema .sql files │                  │
├───┼────────────────────────────────┼─────────────────────┼──────────────────┤
│ 7 │ INI config API endpoints       │ NEW routes file     │ Low — new file   │
│   │ GET/POST /api/database/ini     │                     │                  │
├───┼────────────────────────────────┼─────────────────────┼──────────────────┤
│ 8 │ Update DatabaseConfigPage      │ DatabaseConfigPage  │ Low — UI only    │
│   │ Role selector + INI section    │ .tsx                │                  │
├───┼────────────────────────────────┼─────────────────────┼──────────────────┤
│ 9 │ Verify switch-back to local    │ Integration test    │ Low — test only  │
│   │ All features work in classic   │                     │                  │
└───┴────────────────────────────────┴─────────────────────┴──────────────────┘
```
