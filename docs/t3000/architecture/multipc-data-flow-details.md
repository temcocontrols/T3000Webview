# Multi-PC Data Flow Details

> Per-table data flow reference for the centralized database multi-PC architecture.
> See [centralized-database-multipc.md](centralized-database-multipc.md) for the overall design.

---

## 1. Data Flow Diagram — Main PC

```
                     T3000.exe (Main PC)
                           │
                      FFI DLL calls
                           │
                    ┌──────┴──────┐
                    ▼              ▼
             Local SQLite    Central DB (MSSQL/PG/MySQL)
             (fallback)      (source of truth)
                    │              │
                    │         ┌────┴────┐
                    │         ▼         ▼
                    │    Web Server   Other PCs
                    │    reads here   read here
                    │         │
                    │    ┌────┴────┐
                    │    ▼         ▼
                    │  Browser   Browser
                    │  (local)   (remote)
                    ▼
              Switch-back
              safety net
```

### FFI Write Flow (Main PC)

```
Panel scan complete → FFI callback fires
  │
  ├─ Category A-C tables (DEVICES, INPUTS, OUTPUTS, VARIABLES,
  │   PROGRAMS, SCHEDULES, PID_TABLE, HOLIDAYS,
  │   TRENDLOGS, TRENDLOG_INPUTS, TRENDLOG_DATA):
  │
  │   ├─ 1. UPSERT to local SQLite      ← always first (fast, reliable)
  │   └─ 2. UPSERT to central DB        ← dual write
  │
  └─ Category D table (TRENDLOG_DATA_DETAIL):
      │
      └─ 1. INSERT to central DB ONLY   ← no local copy (saves GB)
```

### Web Server Flow (Main PC)

```
Browser request arrives
  │
  ├─ READ request for data table (Cat A-F):
  │   └─ Query central DB → return results
  │
  ├─ WRITE request for data table (Cat A-F):
  │   ├─ 1. Write to central DB
  │   └─ 2. Write to local SQLite (dual-write for fallback)
  │
  ├─ READ/WRITE for local-only table (Cat G):
  │   └─ Use local_config_conn (always local SQLite)
  │
  └─ READ TRENDLOG_DATA_DETAIL:
      └─ Query central DB (only copy exists there)
```

---

## 2. Data Flow Diagram — Reader PC

```
                     T3000.exe (Reader PC)
                           │
                      FFI DLL calls
                      (own panels only)
                           │
                           ▼
                    Local SQLite ONLY
                    (fallback data)

                    Central DB ◄──── Web Server reads/writes
                         │
                    ┌────┴────┐
                    ▼         ▼
                  Browser   Browser
                  (local)   (remote)
```

### FFI Write Flow (Reader PC)

```
Panel scan complete → FFI callback fires
  │
  ├─ Category A-C tables:
  │   └─ UPSERT to local SQLite ONLY
  │       (does NOT write to central — main PC owns that)
  │
  └─ Category D (TRENDLOG_DATA_DETAIL):
      └─ INSERT to central DB ONLY
         (reader's own panels' trend data still goes to central)
```

### Web Server Flow (Reader PC)

```
Browser request arrives
  │
  ├─ READ request for data table (Cat A-F):
  │   └─ Query central DB → return results
  │       (sees ALL data from all PCs)
  │
  ├─ WRITE request for data table (Cat A-F):
  │   └─ Write to central DB ONLY
  │       (reader doesn't dual-write via web — only main does)
  │
  ├─ READ/WRITE for local-only table (Cat G):
  │   └─ Use local_config_conn (always local SQLite)
  │
  └─ READ TRENDLOG_DATA_DETAIL:
      └─ Query central DB
```

---

## 3. Per-Table Detailed Flows

### 3.1 DEVICES (Category A)

**Source:** FFI `GET_PANELS_LIST` → DLL scans network for Temco controllers.

| PC Role | FFI Action | Web Read | Web Write |
|---------|-----------|----------|-----------|
| Main | UPSERT local + UPSERT central | Central | Central + local |
| Reader | UPSERT local only | Central | Central only |
| Classic | UPSERT local | Local | Local |

**Conflict handling:** UPSERT by `(serial_number)` or `(number, product_model)` — last write wins. Since each PC scans different panels, conflicts are rare.

### 3.2 INPUTS / OUTPUTS / VARIABLES (Category A)

**Source:** FFI `GET_PANEL_DATA` → reads point values from each discovered device.

| PC Role | FFI Action | Web Read | Web Write |
|---------|-----------|----------|-----------|
| Main | UPSERT local + UPSERT central | Central | Central + local |
| Reader | UPSERT local only | Central | Central only |
| Classic | UPSERT local | Local | Local |

**Key:** `(pid, panel_number, point_index)` — unique per panel, no cross-PC conflict.

### 3.3 PROGRAMS / SCHEDULES / PID_TABLE / HOLIDAYS (Category B)

**Source:** FFI reads these from panels along with point data.

Same flow as Category A. These are configuration data that changes rarely.

### 3.4 TRENDLOGS / TRENDLOG_INPUTS / TRENDLOG_DATA (Category C)

**Source:** FFI `LOGGING_DATA` cycle — discovery of trendlog configs and summary data.

Same flow as Category A. These are metadata/summary tables, relatively small.

### 3.5 TRENDLOG_DATA_DETAIL (Category D) ⭐ Special

**Source:** FFI `LOGGING_DATA` cycle — actual timestamped trend values.

| PC Role | FFI Action | Web Read | Web Write |
|---------|-----------|----------|-----------|
| Main | INSERT central ONLY | Central | Central |
| Reader | INSERT central ONLY | Central | Central |
| Classic | INSERT local | Local | Local |

**Why special:**
- Grows to millions of rows (one row per sample per trendlog per timestamp).
- Append-only (INSERT, never UPDATE).
- Keeping in local SQLite defeats the purpose of centralization.
- On switch-back, historical trendlogs are not critical for immediate operation.

### 3.6 UI/Config Tables (Category E) — GRAPHICS, ALARMS, etc.

**Source:** Web server only (user creates graphics, configures alarms via browser).

| PC Role | FFI Action | Web Read | Web Write |
|---------|-----------|----------|-----------|
| Main | — | Central | Central + local |
| Reader | — | Central | Central only |
| Classic | — | Local | Local |

### 3.7 Device Settings (Category F)

**Source:** Web server (user configures network/communication settings via browser).

Same flow as Category E.

### 3.8 Local-Only Tables (Category G)

**Source:** Internal application state.

| Table | Always Uses |
|-------|-------------|
| APPLICATION_CONFIG | Local SQLite |
| APPLICATION_CONFIG_HISTORY | Local SQLite |
| DB_BACKEND_CONFIG | Local SQLite |
| database_partition_config | Local SQLite |
| database_files | Local SQLite |
| database_partitions | Local SQLite |
| DATA_SYNC_METADATA | Local SQLite |
| TRENDLOG_DATA_SYNC_METADATA | Local SQLite |

These tables are **never** written to or read from the central DB. They contain per-PC state that must remain local.

### 3.9 SYSTEM_LOGS (New Table)

**Source:** Application events, errors, audit trail.

| PC Role | Write Destination | Read Source |
|---------|------------------|-------------|
| Main (store_logs=1) | Central DB | Central DB |
| Reader (store_logs=1) | Central DB | Central DB |
| Any (store_logs=0) | Not written | — |
| Classic | Not applicable | — |

---

## 4. Connection Resolution Logic

```rust
/// Determines which DB connection to use for a given operation.
fn resolve_connection(
    state: &T3AppState,
    table_category: TableCategory,
    operation: Operation,
) -> &DatabaseConnection {
    if !state.central_db_enabled {
        // Classic mode — always local
        return &state.local_config_conn;
    }

    match table_category {
        // Category G: Always local
        LocalOnly => &state.local_config_conn,

        // Category D: Always central when enabled
        TrendlogDetail => &state.t3_device_conn, // points to central

        // Categories A-F: Central for reads, dual for writes on main
        _ => match operation {
            Read => &state.t3_device_conn, // central
            Write => &state.t3_device_conn, // central (caller also writes local if main)
        },
    }
}
```

---

## 5. Failure Scenarios

### Central DB goes offline during operation

```
Write to central fails
  │
  ├─ FFI sync (Main):
  │   ├─ Local write already succeeded (done first)
  │   ├─ Log error, increment retry counter
  │   └─ Next sync cycle retries automatically
  │
  ├─ FFI sync (Reader):
  │   └─ Only writing local — unaffected
  │
  └─ Web server:
      ├─ Return 503 to browser with error message
      ├─ Log failure
      └─ UI shows "Central DB unavailable" banner
```

### Switch from central to classic mode

```
Admin sets enabled=0 in setting.ini, restarts app
  │
  ├─ T3AppState.central_db_enabled = false
  ├─ t3_device_conn points to local SQLite
  ├─ All reads/writes go to local
  └─ Warning: TRENDLOG_DATA_DETAIL from central period is not in local
```

### Network partition between PCs

```
Main PC and Reader PC can't reach each other
  │
  ├─ Both can still reach central DB → no impact
  ├─ Only Main can reach central → Reader falls back to local reads
  └─ Neither can reach central → both operate in degraded/classic mode
```
