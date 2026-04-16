# Multi-PC Data Flow — Detailed Diagrams

**Date:** 2026-04-16
**Parent doc:** [centralized-database-multipc.md](centralized-database-multipc.md)

---

## 1. Startup Sequence (Every PC)

```
                   T3000.exe starts
                        │
                        ▼
              Load setting.ini
              [CentralDatabase] section
                        │
                        ▼
              Launch Rust DLL
              (run_server FFI call)
                        │
                        ▼
            ┌───────────────────────┐
            │ Step 1: Read INI      │
            │  enabled = ?          │
            │  role = ?             │
            └───────────┬───────────┘
                        │
              ┌─────────┴─────────┐
              │                   │
         enabled=0           enabled=1
              │                   │
              ▼                   ▼
     ┌────────────────┐  ┌───────────────────────────┐
     │ CLASSIC MODE   │  │ Step 2: Open local SQLite  │
     │                │  │ Read DB_BACKEND_CONFIG     │
     │ Open local     │  │ Get: host, port, user,     │
     │ SQLite for     │  │      pass (encrypted),     │
     │ everything     │  │      backend_type, role     │
     │                │  └──────────┬────────────────┘
     │ FFI → local    │             │
     │ Web → local    │             ▼
     │                │  ┌───────────────────────────┐
     │ Done.          │  │ Step 3: Connect to central │
     └────────────────┘  │ MSSQL/PG/MySQL             │
                         │                            │
                         │ Store in T3AppState:       │
                         │   t3_device_conn → central │
                         │   local_config_conn → local│
                         │   role → from INI          │
                         │   mssql_pool → if MSSQL    │
                         └──────────┬────────────────┘
                                    │
                           ┌────────┴────────┐
                           │                 │
                      role=main         role=reader
                           │                 │
                           ▼                 ▼
                  ┌────────────────┐ ┌───────────────┐
                  │ FFI sync:     │ │ FFI sync:     │
                  │ write central │ │ write local   │
                  │ DB only       │ │ SQLite only   │
                  │               │ │               │
                  │ Web: central  │ │ Web: central  │
                  └────────────────┘ └───────────────┘
```

---

## 2. FFI Sync Cycle — Classic Mode (enabled=0)

```
  T=0s    T3000.exe calls FFI → Rust DLL
          │
  T=0.1s  FFI fetches panel data from BACnet/Modbus
          │
  T=0.5s  ┌─────────────────────────────────────────┐
          │ Write to local SQLite                    │
          │ (DEVICES, INPUTS, OUTPUTS, VARIABLES,    │
          │  TRENDLOG_DATA_DETAIL, etc.)             │
          └──────────────────────────────────────────┘
          │
  T=1.0s  Done. Next cycle in 5 minutes.

  100% existing behavior. Zero changes.
```

---

## 3. FFI Sync Cycle — Main PC (enabled=1, role=main)

```
  T=0s    T3000.exe calls FFI → Rust DLL
          │
  T=0.1s  FFI fetches panel data from BACnet/Modbus
          │
          │   ┌─ Check: is central DB enabled? ─┐
          │   │ YES (enabled=1, role=main)       │
          │   └──────────────┬───────────────────┘
          │                  │
  T=0.5s  ┌──────────────────▼──────────────────────┐
          │ Write to CENTRAL DB (MSSQL)              │
          │ (DEVICES, INPUTS, OUTPUTS, VARIABLES,    │
          │  TRENDLOG_DATA_DETAIL, etc.)             │
          │                                          │
          │ Uses: UPSERT (MERGE) by SerialNumber     │
          │ + PanelId to prevent duplicates          │
          └──────────────────────────────────────────┘
          │
          │   ┌─ Write to local SQLite? ─────────┐
          │   │ NO — skip for device/trendlog     │
          │   │ tables (too much data, user said  │
          │   │ "do not save to local SQLite if   │
          │   │ using central")                   │
          │   │                                   │
          │   │ Local SQLite only keeps:          │
          │   │  • DB_BACKEND_CONFIG              │
          │   │  • APPLICATION_CONFIG (optional)  │
          │   └───────────────────────────────────┘
          │
  T=1.0s  Done. Next cycle in 5 minutes.

  If MSSQL is down at T=0.5s:
  ┌─────────────────────────────────────────────────┐
  │ Central write fails                              │
  │ → Log error to SYSTEM_LOGS (local file)         │
  │ → Optionally: fallback write to local SQLite    │
  │ → Next cycle will retry central DB              │
  │ → No data loss — panels will send same data     │
  │   again on next poll                            │
  └─────────────────────────────────────────────────┘
```

---

## 4. FFI Sync Cycle — Reader PC (enabled=1, role=reader)

```
  T=0s    T3000.exe calls FFI → Rust DLL
          │
  T=0.1s  FFI fetches panel data from BACnet/Modbus
          │
          │   ┌─ Check: is central DB enabled? ─┐
          │   │ YES (enabled=1, role=reader)     │
          │   │ Reader does NOT write to central │
          │   └──────────────┬───────────────────┘
          │                  │
  T=0.5s  ┌──────────────────▼──────────────────────┐
          │ Write to LOCAL SQLite                    │
          │ (existing behavior, unchanged)           │
          │                                          │
          │ Reader's local SQLite has its own copy   │
          │ of FFI data. This is fine — it's the     │
          │ reader's backup/local view.              │
          └──────────────────────────────────────────┘
          │
  T=1.0s  Done.

  Note: The reader's Web UI does NOT read this local data.
  It reads from central DB. The local SQLite is just a
  side effect of FFI running (can't stop C++ from polling).
```

---

## 5. Web UI Data Flow

```
BROWSER REQUEST: GET /api/t3-device/inputs?serial=12345
          │
          ▼
    Rust Web Server (Axum)
          │
          ├── Check: T3AppState.t3_device_conn
          │
          │   ┌─ enabled=0 (classic) ──────────────────────┐
          │   │ t3_device_conn → local SQLite              │
          │   │ Query: SELECT * FROM INPUTS WHERE ...      │
          │   │ Returns: data from local SQLite             │
          │   └────────────────────────────────────────────┘
          │
          │   ┌─ enabled=1, ANY role ──────────────────────┐
          │   │ t3_device_conn → MSSQL connection          │
          │   │ Query: SELECT * FROM INPUTS WHERE ...      │
          │   │ Returns: data from central MSSQL            │
          │   │                                            │
          │   │ Both main AND reader PCs read from central │
          │   │ because t3_device_conn points to MSSQL     │
          │   │ regardless of role.                        │
          │   └────────────────────────────────────────────┘
          │
          ▼
    JSON response → browser renders table
```

---

## 6. Trendlog Page Flow

```
USER OPENS TRENDLOG PAGE (browser or built-in webview)
          │
          ▼
    GET /api/t3-device/trendlog-data?serial=12345&point=AI_1
          │
          ▼
    ┌─ enabled=0 ─────────────────────────────────────────┐
    │ Read from local SQLite TRENDLOG_DATA_DETAIL         │
    │ Data: only what THIS PC's FFI has collected         │
    │ Size: limited (SQLite, maybe few months)            │
    └─────────────────────────────────────────────────────┘

    ┌─ enabled=1 ─────────────────────────────────────────┐
    │ Read from MSSQL TRENDLOG_DATA_DETAIL                │
    │ Data: everything MAIN PC has collected               │
    │       (ALL panels, ALL points)                       │
    │ Size: large (MSSQL can handle years of data)        │
    │                                                      │
    │ Works on both main AND reader PCs — same data        │
    │                                                      │
    │ Charts show same data regardless of which PC you    │
    │ open the browser on.                                 │
    └─────────────────────────────────────────────────────┘
```

---

## 7. Config Page Flow

```
USER OPENS System → Database Backend page
          │
          ▼
    ┌───────────────────────────────────────────────────────────┐
    │  API calls at page load:                                   │
    │                                                            │
    │  1. GET /api/database/ini                                  │
    │     → Reads setting.ini [CentralDatabase] section          │
    │     → Returns: { enabled: true, role: "main" }             │
    │                                                            │
    │  2. GET /api/database/backend/config                       │
    │     → Reads DB_BACKEND_CONFIG from local SQLite            │
    │     → Returns: { backend_type:"mssql", host:"192.168.1.50",│
    │       port:1433, instance:"SQLEXPRESS", ... }              │
    │                                                            │
    │  3. GET /api/database/backend/status                       │
    │     → Tests current central DB connection                  │
    │     → Returns: { connected:true, table_count:46 }          │
    └───────┬───────────────────────────────────────────────────┘
            │
            ▼
    ┌─ Page renders ─────────────────────────────────────────────┐
    │                                                             │
    │  ┌─ Status ────────────────────────────────────────────┐   │
    │  │ 🟢 MSSQL @ 192.168.1.50\SQLEXPRESS · 46 tables     │   │
    │  │    Role: MAIN · Connected                           │   │
    │  └────────────────────────────────────────────────────┘   │
    │                                                             │
    │  ┌─ Mode ──────────────────────────────────────────────┐   │
    │  │ (•) Central Database   ( ) Local SQLite             │   │
    │  └────────────────────────────────────────────────────┘   │
    │                                                             │
    │  ┌─ Role ──────────────────────────────────────────────┐   │
    │  │ (•) Main (this PC writes to central DB)             │   │
    │  │ ( ) Reader (read-only from central DB)              │   │
    │  └────────────────────────────────────────────────────┘   │
    │                                                             │
    │  ┌─ MSSQL Connection ─────────────────────────────────┐   │
    │  │ Host:     [192.168.1.50          ]                  │   │
    │  │ Port:     [1433                  ]                  │   │
    │  │ Instance: [SQLEXPRESS            ]                  │   │
    │  │ Database: [T3000_Devices         ]                  │   │
    │  │ Username: [sa                    ]                  │   │
    │  │ Password: [••••••••              ]                  │   │
    │  └────────────────────────────────────────────────────┘   │
    │                                                             │
    │  ┌─ Log Storage ──────────────────────────────────────┐   │
    │  │ [✓] Write logs to central DB                        │   │
    │  │     Level: [WARNING ▼]  Retention: [30 days ▼]     │   │
    │  └────────────────────────────────────────────────────┘   │
    │                                                             │
    │  [Scan LAN] [Test Connection] [Save] [Init Schema] [Apply] │
    └─────────────────────────────────────────────────────────────┘
            │
            │ User clicks "Save"
            ▼
    ┌───────────────────────────────────────────────────────────┐
    │  POST /api/database/backend/config                         │
    │   → Saves host, port, user, pass to DB_BACKEND_CONFIG     │
    │     (local SQLite, password encrypted)                     │
    │                                                            │
    │  POST /api/database/ini                                    │
    │   → Writes [CentralDatabase] to setting.ini                │
    │     enabled=1, role=main                                   │
    │                                                            │
    │  ⚠ "Restart T3000 to apply changes"                        │
    └───────────────────────────────────────────────────────────┘
```

---

## 8. Switch-Back Flow (Central → Local)

```
USER WANTS TO GO BACK TO LOCAL SQLITE:
          │
          ▼
    Open System → Database Backend page
          │
          ▼
    Select: ( ) Central Database   (•) Local SQLite
          │
          ▼
    Click "Save"
          │
          ├──► POST /api/database/ini
          │    → setting.ini: enabled=0
          │
          ├──► POST /api/database/backend/switch
          │    → DB_BACKEND_CONFIG: is_active=1 for sqlite
          │
          ▼
    Restart T3000
          │
          ▼
    ┌───────────────────────────────────────────────────────────┐
    │ Startup reads: enabled=0                                   │
    │ → Classic mode                                             │
    │ → FFI writes to local SQLite (as before)                  │
    │ → Web reads from local SQLite (as before)                 │
    │ → ALL features work exactly as before central DB feature  │
    │                                                            │
    │ Local SQLite still has data:                               │
    │   - Reader PCs: have their own FFI data (never stopped)   │
    │   - Main PC: local may be stale (was writing to central)  │
    │     but FFI will refill it on next sync cycle              │
    └───────────────────────────────────────────────────────────┘
```

---

## 9. SYSTEM_LOGS Flow

```
ANY PC (main or reader) generates a log event
          │
          ▼
    ┌─ store_logs=1 AND enabled=1 ──────────────────────────────┐
    │                                                            │
    │  Write to both:                                            │
    │                                                            │
    │  1. Local log file (C:\T3000\logs\*.log)                  │
    │     → Always, regardless of settings                      │
    │     → Same as today                                        │
    │                                                            │
    │  2. Central DB: SYSTEM_LOGS table                         │
    │     INSERT INTO SYSTEM_LOGS                                │
    │       (log_time, pc_name, pc_ip, log_level,               │
    │        log_source, log_message, ...)                       │
    │     → Queryable, filterable                                │
    │     → All 5 PCs write here                                 │
    │     → Admin can see all logs in one place                  │
    └────────────────────────────────────────────────────────────┘

    ┌─ store_logs=0 OR enabled=0 ──────────────────────────────┐
    │                                                            │
    │  Write to local log file only (existing behavior)          │
    └────────────────────────────────────────────────────────────┘


ADMIN VIEWS LOGS:
          │
          ▼
    Open System → Logs page (future)
          │
          ▼
    SELECT * FROM SYSTEM_LOGS
    WHERE log_time > DATEADD(day, -7, GETDATE())
    ORDER BY log_time DESC
          │
          ▼
    ┌───────────────────────────────────────────────────────────┐
    │ Time          │ PC      │ Level │ Source    │ Message     │
    ├───────────────┼─────────┼───────┼──────────┼─────────────┤
    │ 04:05 PM      │ PC-1    │ INFO  │ FFI_SYNC │ Synced 100  │
    │               │ (main)  │       │          │ devices     │
    │ 04:05 PM      │ PC-2    │ INFO  │ WEB_API  │ User login  │
    │               │ (reader)│       │          │ admin       │
    │ 04:04 PM      │ PC-1    │ WARN  │ TRENDLOG │ Point AI_3  │
    │               │ (main)  │       │          │ timeout     │
    └───────────────┴─────────┴───────┴──────────┴─────────────┘
```

---

## 10. Complete System Diagram (5 PCs, Central DB)

```
    ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
    │ Panel #1 │  │ Panel #2 │  │ Panel #3 │  │ Panel #4 │
    │ Floor 1  │  │ Floor 2  │  │ Floor 3  │  │ Floor 4  │
    └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘
         │              │              │              │
         └──────────────┴──────┬───────┴──────────────┘
                               │ BACnet / Modbus
                               │
          ┌────────────────────┴────────────────────┐
          │              BUILDING LAN                │
          │                                          │
          │  ┌─────────────────────────────────────┐ │
          │  │       MSSQL Server                  │ │
          │  │       192.168.1.50:1433             │ │
          │  │                                     │ │
          │  │  ┌───────────────────────────────┐  │ │
          │  │  │ T3000_Devices database        │  │ │
          │  │  │                               │  │ │
          │  │  │ DEVICES         (46 tables)   │  │ │
          │  │  │ INPUTS                        │  │ │
          │  │  │ OUTPUTS                       │  │ │
          │  │  │ VARIABLES                     │  │ │
          │  │  │ TRENDLOGS                     │  │ │
          │  │  │ TRENDLOG_DATA_DETAIL          │  │ │
          │  │  │ ...                           │  │ │
          │  │  │ SYSTEM_LOGS     (new)         │  │ │
          │  │  └───────────────────────────────┘  │ │
          │  └────────────┬────────────────────────┘ │
          │               │                          │
          │    ┌──────────┼──────────┬───────────┐   │
          │    │          │          │           │   │
          │ ┌──┴───┐  ┌──┴───┐  ┌──┴───┐  ┌───┴──┐ │
          │ │ PC-1 │  │ PC-2 │  │ PC-3 │  │ PC-4 │ │
          │ │ MAIN │  │ READ │  │ READ │  │ READ │ │
          │ │      │  │      │  │      │  │      │ │
          │ │ FFI→ │  │ FFI→ │  │ FFI→ │  │ FFI→ │ │
          │ │ MSSQL│  │local │  │local │  │local │ │
          │ │      │  │      │  │      │  │      │ │
          │ │ Web→ │  │ Web→ │  │ Web→ │  │ Web→ │ │
          │ │ MSSQL│  │ MSSQL│  │ MSSQL│  │ MSSQL│ │
          │ │      │  │      │  │      │  │      │ │
          │ │ Logs→│  │ Logs→│  │ Logs→│  │ Logs→│ │
          │ │ MSSQL│  │ MSSQL│  │ MSSQL│  │ MSSQL│ │
          │ └──────┘  └──────┘  └──────┘  └──────┘ │
          │                                          │
          │         ┌───────┐                        │
          │         │ PC-5  │  (user at home,        │
          │         │ READ  │   VPN to building)     │
          │         │ Web→  │                        │
          │         │ MSSQL │                        │
          │         └───────┘                        │
          └──────────────────────────────────────────┘
```
