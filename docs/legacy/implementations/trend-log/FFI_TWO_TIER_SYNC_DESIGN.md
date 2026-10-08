# T3000 FFI Two-Tier Sync System Design
**Status:** Design Review

---

## Executive Summary

This document describes the redesigned two-tier synchronization system for T3000 FFI data collection. The system uses two independent intervals:

1. **Quick Sync** (`ffi.sync_interval_secs`): Frequent trend data collection (5/10/15 minutes)
2. **Full Rediscovery** (`rediscover.interval_secs`): Periodic device list refresh (default 1 hour)

**Key Benefits:**
- Reduces unnecessary GET_PANELS_LIST calls (from every cycle to once per hour)
- Always uses latest device list for LOGGING_DATA sync
- Automatically handles new/disappeared devices
- Maintains consistent data collection frequency
- Optimized database operations (UPDATE existing, INSERT new)

---

## 1. System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  SERVICE STARTUP                                                 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  1. Load ffi.sync_interval_secs from DB (e.g., 600s = 10 min)  │
│  2. Load rediscover.interval_secs from DB (e.g., 3600s = 1 hr) │
│  3. Initialize state:                                           │
│     - cached_device_list = None                                 │
│     - last_rediscover_time = None                               │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│  MAIN SYNC LOOP                                                  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  Repeats every ffi.sync_interval_secs (10 minutes)              │
└─────────────────────────────────────────────────────────────────┘
                          ↓
                    ┌─────────┐
                    │ DECISION│
                    │  POINT  │
                    └─────────┘
                          ↓
        Should rediscover? (First run OR elapsed >= rediscover_interval)
                          ↓
        ┌─────────────────┴──────────────────┐
        │                                    │
        ↓ YES                                ↓ NO
        │                                    │
┌───────────────────┐              ┌─────────────────┐
│ REDISCOVERY CYCLE │              │ NORMAL CYCLE    │
│ ═════════════════ │              │ ═══════════════ │
│                   │              │                 │
│ ┌───────────────┐ │              │ Use cached      │
│ │GET_PANELS_LIST│ │              │ device list     │
│ │  (Action 4)   │ │              │ from previous   │
│ └───────────────┘ │              │ rediscovery     │
│         ↓         │              └─────────────────┘
│  Update Cache     │                      │
│  Update Timestamp │                      │
└───────────────────┘                      │
        │                                  │
        └────────────────┬─────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  LOGGING_DATA SYNC (Always Runs)                                │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                  │
│  For each device in cached_device_list:                         │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ Device 1 (SN: 12345, Panel: 1)                         │    │
│  │ ──────────────────────────────────────────────────────  │    │
│  │ ├─ Call LOGGING_DATA (Action 15)                       │    │
│  │ │  └─ Returns ALL 128 points data                      │    │
│  │ │                                                       │    │
│  │ ├─ Process Each Point:                                 │    │
│  │ │  ├─ UPDATE existing TRENDLOG_DATA parent record      │    │
│  │ │  │  OR INSERT new parent if not exists               │    │
│  │ │  │  (Updates: Units, Range, UpdatedAt)               │    │
│  │ │  │                                                    │    │
│  │ │  └─ INSERT new TRENDLOG_DATA_DETAIL record           │    │
│  │ │     (Fields: ParentId, Value, LoggingTime_Fmt,       │    │
│  │ │              DataSource, SyncMetadataId)             │    │
│  │ │                                                       │    │
│  │ ├─ Update INPUTS/OUTPUTS/VARIABLES tables              │    │
│  │ │                                                       │    │
│  │ └─ Sleep 30 seconds (rate limiting)                    │    │
│  └────────────────────────────────────────────────────────┘    │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ Device 2 (SN: 12346, Panel: 1)                         │    │
│  │ ──────────────────────────────────────────────────────  │    │
│  │ ├─ Call LOGGING_DATA (Action 15)                       │    │
│  │ └─ Sleep 30 seconds                                    │    │
│  └────────────────────────────────────────────────────────┘    │
│  ... (repeat for all cached devices)                           │
│                                                                  │
│  Create TRENDLOG_DATA_SYNC_METADATA:                            │
│  - MessageType: LOGGING_DATA                                    │
│  - RecordsInserted: Total detail records inserted               │
│  - SyncInterval: ffi.sync_interval_secs                         │
└─────────────────────────────────────────────────────────────────┘
                         ↓
                 ┌───────────────┐
                 │ SLEEP         │
                 │ ffi.sync_     │
                 │ interval_secs │
                 │ (10 minutes)  │
                 └───────────────┘
                         ↓
                   (Loop Back)
```

---

## 2. Detailed Timeline Flow

### Scenario Configuration
- **ffi.sync_interval_secs:** 600 seconds (10 minutes)
- **rediscover.interval_secs:** 3600 seconds (60 minutes)
- **Initial Device Count:** 10 devices

```
TIME        CYCLE TYPE          ACTIONS PERFORMED                          METADATA RECORDS
═════════════════════════════════════════════════════════════════════════════════════════════

10:00 AM    🔄 REDISCOVERY      ┌─────────────────────────────────────┐
            CYCLE #1            │ PHASE 1: Device Discovery           │   ┌─────────────────┐
            (First Run)         │ ──────────────────────────────────   │   │ GET_PANELS_LIST │
                                │ ✓ GET_PANELS_LIST (Action 4)        │   │ ─────────────── │
                                │   - Query C++ service               │   │ Time: 10:00:00  │
                                │   - Found: 10 devices               │   │ MessageType:    │
                                │   - Cache: [Dev1...Dev10]           │   │   GET_PANELS_   │
                                │   - last_rediscover = 10:00 AM      │   │   LIST          │
                                │   - Duration: ~1 second             │   │ RecordsInserted:│
                                │                                     │   │   10            │
                                └─────────────────────────────────────┘   │ SyncInterval:   │
                                          ↓ (immediate)                   │   600           │
                                ┌─────────────────────────────────────┐   └─────────────────┘
                                │ PHASE 2: Data Collection            │
                                │ ──────────────────────────────────   │   ┌─────────────────┐
                                │ ✓ LOGGING_DATA for all devices      │   │ LOGGING_DATA    │
                                │   ├─ Dev1: LOGGING_DATA (128 pts)   │   │ ─────────────── │
                                │   │  ├─ UPDATE/INSERT parents       │   │ Time: 10:05:00  │
                                │   │  ├─ INSERT 128 detail records   │   │ MessageType:    │
                                │   │  └─ Sleep 30s                   │   │   LOGGING_DATA  │
                                │   ├─ Dev2: LOGGING_DATA (128 pts)   │   │ RecordsInserted:│
                                │   │  └─ Sleep 30s                   │   │   500           │
                                │   ├─ ... (Devices 3-9)              │   │ SyncInterval:   │
                                │   └─ Dev10: LOGGING_DATA            │   │   600           │
                                │   Total Time: ~5 minutes            │   └─────────────────┘
                                └─────────────────────────────────────┘
                                          ↓
                                    Sleep 10 minutes
─────────────────────────────────────────────────────────────────────────────────────────────

10:10 AM    ⚡ QUICK SYNC       ┌─────────────────────────────────────┐
            CYCLE #2            │ PHASE 1: Device Discovery           │
            (Use Cache)         │ ──────────────────────────────────   │   (No GET_PANELS_
                                │ ✗ SKIP GET_PANELS_LIST              │    LIST record)
                                │   Reason: Only 10 min elapsed       │
                                │   Using cached list from 10:00 AM   │
                                └─────────────────────────────────────┘
                                          ↓
                                ┌─────────────────────────────────────┐   ┌─────────────────┐
                                │ PHASE 2: Data Collection            │   │ LOGGING_DATA    │
                                │ ──────────────────────────────────   │   │ ─────────────── │
                                │ ✓ LOGGING_DATA for cached devices   │   │ Time: 10:10:00  │
                                │   ├─ Dev1...Dev10 (from cache)      │   │ RecordsInserted:│
                                │   └─ Total: 480 detail records      │   │   480           │
                                └─────────────────────────────────────┘   └─────────────────┘
                                          ↓
                                    Sleep 10 minutes
─────────────────────────────────────────────────────────────────────────────────────────────

10:20 AM    ⚡ QUICK SYNC       ✗ SKIP GET_PANELS_LIST                   ┌─────────────────┐
            CYCLE #3            ✓ LOGGING_DATA (cached devices)          │ LOGGING_DATA    │
                                   RecordsInserted: 490                   │ Time: 10:20:00  │
                                                                          │ Records: 490    │
                                    Sleep 10 minutes                      └─────────────────┘
─────────────────────────────────────────────────────────────────────────────────────────────

10:30 AM    ⚡ QUICK SYNC       ✗ SKIP GET_PANELS_LIST                   ┌─────────────────┐
            CYCLE #4            ✓ LOGGING_DATA (cached devices)          │ LOGGING_DATA    │
                                   RecordsInserted: 485                   │ Time: 10:30:00  │
                                                                          │ Records: 485    │
                                    Sleep 10 minutes                      └─────────────────┘
─────────────────────────────────────────────────────────────────────────────────────────────

10:40 AM    ⚡ QUICK SYNC       ✗ SKIP GET_PANELS_LIST                   ┌─────────────────┐
            CYCLE #5            ✓ LOGGING_DATA (cached devices)          │ LOGGING_DATA    │
                                   RecordsInserted: 495                   │ Time: 10:40:00  │
                                                                          │ Records: 495    │
                                    Sleep 10 minutes                      └─────────────────┘
─────────────────────────────────────────────────────────────────────────────────────────────

10:50 AM    ⚡ QUICK SYNC       ✗ SKIP GET_PANELS_LIST                   ┌─────────────────┐
            CYCLE #6            ✓ LOGGING_DATA (cached devices)          │ LOGGING_DATA    │
                                   RecordsInserted: 488                   │ Time: 10:50:00  │
                                                                          │ Records: 488    │
                                    Sleep 10 minutes                      └─────────────────┘
─────────────────────────────────────────────────────────────────────────────────────────────

11:00 AM    🔄 REDISCOVERY      ┌─────────────────────────────────────┐
            CYCLE #7            │ PHASE 1: Device Discovery           │   ┌─────────────────┐
            (60 min elapsed)    │ ──────────────────────────────────   │   │ GET_PANELS_LIST │
                                │ ✓ GET_PANELS_LIST (Action 4)        │   │ ─────────────── │
                                │   Reason: 60 minutes elapsed        │   │ Time: 11:00:00  │
                                │   - Query C++ service               │   │ MessageType:    │
                                │   - Found: 12 devices (2 NEW!)      │   │   GET_PANELS_   │
                                │   - Old cache: [Dev1...Dev10]       │   │   LIST          │
                                │   - New cache: [Dev1...Dev12]       │   │ RecordsInserted:│
                                │   - Detected changes:               │   │   12            │
                                │     • Dev11: NEW                    │   │ SyncInterval:   │
                                │     • Dev12: NEW                    │   │   600           │
                                │   - last_rediscover = 11:00 AM      │   └─────────────────┘
                                └─────────────────────────────────────┘
                                          ↓
                                ┌─────────────────────────────────────┐   ┌─────────────────┐
                                │ PHASE 2: Data Collection            │   │ LOGGING_DATA    │
                                │ ──────────────────────────────────   │   │ ─────────────── │
                                │ ✓ LOGGING_DATA for all 12 devices   │   │ Time: 11:06:00  │
                                │   ├─ Dev1: LOGGING_DATA             │   │ MessageType:    │
                                │   │  ├─ UPDATE existing parents     │   │   LOGGING_DATA  │
                                │   │  └─ INSERT detail records        │   │ RecordsInserted:│
                                │   ├─ Dev2...Dev10: (existing)       │   │   600           │
                                │   │  └─ UPDATE parents               │   │ SyncInterval:   │
                                │   ├─ Dev11: LOGGING_DATA (NEW!)     │   │   600           │
                                │   │  ├─ INSERT new parents (128)    │   │ Note: Includes  │
                                │   │  └─ INSERT detail records        │   │   2 new devices │
                                │   └─ Dev12: LOGGING_DATA (NEW!)     │   └─────────────────┘
                                │      ├─ INSERT new parents (128)    │
                                │      └─ INSERT detail records        │
                                │   Total: 600 detail records          │
                                │   (12 devices × ~50 avg per device) │
                                └─────────────────────────────────────┘
                                          ↓
                                    Sleep 10 minutes
─────────────────────────────────────────────────────────────────────────────────────────────

11:10 AM    ⚡ QUICK SYNC       ✗ SKIP GET_PANELS_LIST                   ┌─────────────────┐
            CYCLE #8            ✓ LOGGING_DATA for all 12 devices        │ LOGGING_DATA    │
                                  (Now includes Dev11, Dev12)            │ Time: 11:10:00  │
                                   RecordsInserted: 580                   │ Records: 580    │
                                                                          └─────────────────┘
                                    Sleep 10 minutes
─────────────────────────────────────────────────────────────────────────────────────────────

(Pattern continues: Quick sync every 10 min, Full rediscovery every 60 min)
```

---

## 3. Database Metadata Tracking

### TRENDLOG_DATA_SYNC_METADATA Table Records (After 70 Minutes)

```sql
-- Cycle 1 (10:00 AM - Rediscovery)
INSERT INTO TRENDLOG_DATA_SYNC_METADATA VALUES (
    1,                                    -- id
    '2025-10-29 10:00:00',               -- SyncTime_Fmt
    'GET_PANELS_LIST',                   -- MessageType
    NULL,                                 -- PanelId (NULL = all)
    NULL,                                 -- SerialNumber (NULL = all)
    10,                                   -- RecordsInserted (10 devices found)
    600,                                  -- SyncInterval
    1,                                    -- Success
    NULL,                                 -- ErrorMessage
    '2025-10-29 10:00:00'                -- CreatedAt
);

INSERT INTO TRENDLOG_DATA_SYNC_METADATA VALUES (
    2,                                    -- id
    '2025-10-29 10:05:00',               -- SyncTime_Fmt
    'LOGGING_DATA',                      -- MessageType
    NULL,                                 -- PanelId
    NULL,                                 -- SerialNumber
    500,                                  -- RecordsInserted (500 detail records)
    600,                                  -- SyncInterval
    1,                                    -- Success
    NULL,                                 -- ErrorMessage
    '2025-10-29 10:05:00'                -- CreatedAt
);

-- Cycle 2 (10:10 AM - Quick Sync)
INSERT INTO TRENDLOG_DATA_SYNC_METADATA VALUES (
    3, '2025-10-29 10:10:00', 'LOGGING_DATA', NULL, NULL, 480, 600, 1, NULL, '2025-10-29 10:10:00'
);

-- Cycle 3 (10:20 AM - Quick Sync)
INSERT INTO TRENDLOG_DATA_SYNC_METADATA VALUES (
    4, '2025-10-29 10:20:00', 'LOGGING_DATA', NULL, NULL, 490, 600, 1, NULL, '2025-10-29 10:20:00'
);

-- Cycle 4 (10:30 AM - Quick Sync)
INSERT INTO TRENDLOG_DATA_SYNC_METADATA VALUES (
    5, '2025-10-29 10:30:00', 'LOGGING_DATA', NULL, NULL, 485, 600, 1, NULL, '2025-10-29 10:30:00'
);

-- Cycle 5 (10:40 AM - Quick Sync)
INSERT INTO TRENDLOG_DATA_SYNC_METADATA VALUES (
    6, '2025-10-29 10:40:00', 'LOGGING_DATA', NULL, NULL, 495, 600, 1, NULL, '2025-10-29 10:40:00'
);

-- Cycle 6 (10:50 AM - Quick Sync)
INSERT INTO TRENDLOG_DATA_SYNC_METADATA VALUES (
    7, '2025-10-29 10:50:00', 'LOGGING_DATA', NULL, NULL, 488, 600, 1, NULL, '2025-10-29 10:50:00'
);

-- Cycle 7 (11:00 AM - Rediscovery)
INSERT INTO TRENDLOG_DATA_SYNC_METADATA VALUES (
    8, '2025-10-29 11:00:00', 'GET_PANELS_LIST', NULL, NULL, 12, 600, 1, NULL, '2025-10-29 11:00:00'
);

INSERT INTO TRENDLOG_DATA_SYNC_METADATA VALUES (
    9, '2025-10-29 11:06:00', 'LOGGING_DATA', NULL, NULL, 600, 600, 1, NULL, '2025-10-29 11:06:00'
);

-- Cycle 8 (11:10 AM - Quick Sync)
INSERT INTO TRENDLOG_DATA_SYNC_METADATA VALUES (
    10, '2025-10-29 11:10:00', 'LOGGING_DATA', NULL, NULL, 580, 600, 1, NULL, '2025-10-29 11:10:00'
);
```

### Query to Analyze Sync Patterns

```sql
-- Count metadata records by type
SELECT
    MessageType,
    COUNT(*) as TotalCycles,
    AVG(RecordsInserted) as AvgRecords,
    MIN(SyncTime_Fmt) as FirstSync,
    MAX(SyncTime_Fmt) as LastSync
FROM TRENDLOG_DATA_SYNC_METADATA
GROUP BY MessageType;

-- Expected Results:
-- MessageType       | TotalCycles | AvgRecords | FirstSync           | LastSync
-- GET_PANELS_LIST   | 2           | 11         | 2025-10-29 10:00:00 | 2025-10-29 11:00:00
-- LOGGING_DATA      | 8           | 515        | 2025-10-29 10:05:00 | 2025-10-29 11:10:00
```

---

## 4. Parent Table Update Logic

### TRENDLOG_DATA (Parent) Operations During LOGGING_DATA Sync

```rust
// For each point in LOGGING_DATA response (128 points per device):

// Step 1: Check if parent record exists
let parent_key = (serial_number, panel_id, point_id, point_type, point_index);
let existing_parent = TRENDLOG_DATA::find()
    .filter(SerialNumber.eq(serial_number))
    .filter(PanelId.eq(panel_id))
    .filter(PointId.eq(point_id))
    .filter(PointType.eq(point_type))
    .filter(PointIndex.eq(point_index))
    .one(&db)
    .await?;

// Step 2: Update or Insert parent
let parent_id = match existing_parent {
    Some(mut parent) => {
        // UPDATE EXISTING PARENT
        // Refresh metadata that may change over time
        parent.units = Set(point.units.clone());
        parent.range_field = Set(point.range.clone());
        parent.digital_analog = Set(point.digital_analog.clone());
        parent.updated_at = Set(now());

        let updated = parent.update(&db).await?;
        updated.id
    },
    None => {
        // INSERT NEW PARENT (first time seeing this point)
        let new_parent = trendlog_data::ActiveModel {
            serial_number: Set(serial_number),
            panel_id: Set(panel_id),
            point_id: Set(point.id.clone()),
            point_index: Set(point.index),
            point_type: Set(point.type.clone()),
            digital_analog: Set(point.digital_analog.clone()),
            range_field: Set(point.range.clone()),
            units: Set(point.units.clone()),
            description: Set(None),
            is_active: Set(Some(true)),
            created_at: Set(Some(now())),
            updated_at: Set(Some(now())),
            ..Default::default()
        };

        let result = new_parent.insert(&db).await?;
        result.id
    }
};

// Step 3: Always INSERT new detail record (time-series data)
let detail = trendlog_data_detail::ActiveModel {
    parent_id: Set(parent_id),
    value: Set(point.value.clone()),
    logging_time_fmt: Set(now_formatted),
    data_source: Set(Some(DATA_SOURCE_FFI_SYNC)),  // 1 = FFI_SYNC
    sync_metadata_id: Set(Some(sync_metadata_id)),
    ..Default::default()
};

detail.insert(&db).await?;
```

### Example Scenarios

**Scenario A: Existing Device, Existing Point**
```
Device: SN=12345, Point: IN1
Action: UPDATE parent (refresh Units/Range), INSERT detail
Result:
  - TRENDLOG_DATA: 1 row UPDATED
  - TRENDLOG_DATA_DETAIL: 1 row INSERTED
```

**Scenario B: Existing Device, New Point (Dev added new sensor)**
```
Device: SN=12345, Point: IN9 (newly configured)
Action: INSERT parent, INSERT detail
Result:
  - TRENDLOG_DATA: 1 row INSERTED
  - TRENDLOG_DATA_DETAIL: 1 row INSERTED
```

**Scenario C: New Device (Rediscovery found new device)**
```
Device: SN=99999 (new), All 128 points
Action: INSERT 128 parents, INSERT 128 details
Result:
  - TRENDLOG_DATA: 128 rows INSERTED
  - TRENDLOG_DATA_DETAIL: 128 rows INSERTED
```

---

## 5. Rate Limiting Strategy

### Why 30-Second Sleep Between Devices?

**Purpose:** Prevent overwhelming the C++ T3000 service and network

**Implementation:**
```rust
for (idx, device) in devices.iter().enumerate() {
    // Call LOGGING_DATA (Action 15)
    let json_data = get_logging_data_via_ffi(device).await?;

    // Process response (UPDATE/INSERT operations)
    process_logging_data(&db, device, json_data, sync_metadata_id).await?;

    // Sleep between devices (except last one)
    if idx < devices.len() - 1 {
        tokio::time::sleep(Duration::from_secs(30)).await;
    }
}
```

### Timing Breakdown (10 Devices)

| Action                  | Duration    | Cumulative |
|------------------------|-------------|------------|
| GET_PANELS_LIST        | ~1 second   | 0:01       |
| Device 1: LOGGING_DATA | ~2 seconds  | 0:03       |
| Sleep                  | 30 seconds  | 0:33       |
| Device 2: LOGGING_DATA | ~2 seconds  | 0:35       |
| Sleep                  | 30 seconds  | 1:05       |
| ... (Devices 3-9)      | ...         | ...        |
| Device 10: LOGGING_DATA| ~2 seconds  | 4:47       |
| (No sleep after last)  | 0 seconds   | 4:47       |
| **Total Cycle Time**   |             | **~5 min** |

**Note:** After LOGGING_DATA completes (~5 min), service sleeps for `ffi.sync_interval_secs` (10 min), making total cycle time ~15 minutes.

---

## 6. Configuration Settings

### Database Configuration (APPLICATION_CONFIG table)

```sql
-- Quick Sync Interval (LOGGING_DATA frequency)
UPDATE APPLICATION_CONFIG
SET config_value = '300'  -- 5 minutes
WHERE config_key = 'ffi.sync_interval_secs';

UPDATE APPLICATION_CONFIG
SET config_value = '600'  -- 10 minutes (recommended)
WHERE config_key = 'ffi.sync_interval_secs';

UPDATE APPLICATION_CONFIG
SET config_value = '900'  -- 15 minutes
WHERE config_key = 'ffi.sync_interval_secs';

-- Rediscovery Interval (GET_PANELS_LIST frequency)
UPDATE APPLICATION_CONFIG
SET config_value = '1800'  -- 30 minutes
WHERE config_key = 'rediscover.interval_secs';

UPDATE APPLICATION_CONFIG
SET config_value = '3600'  -- 1 hour (default)
WHERE config_key = 'rediscover.interval_secs';

UPDATE APPLICATION_CONFIG
SET config_value = '7200'  -- 2 hours
WHERE config_key = 'rediscover.interval_secs';
```

### Recommended Configurations

| Environment | ffi.sync_interval_secs | rediscover.interval_secs | Devices | Notes |
|-------------|------------------------|--------------------------|---------|-------|
| **Development** | 300 (5 min) | 1800 (30 min) | 1-5 | Fast testing |
| **Production** | 600 (10 min) | 3600 (1 hour) | 10-50 | Balanced |
| **Large Scale** | 900 (15 min) | 7200 (2 hours) | 50+ | Resource optimized |
| **High Frequency** | 300 (5 min) | 3600 (1 hour) | <20 | Critical monitoring |

---

## 7. Code Structure

### Main Service Loop

```rust
async fn sync_logging_data_static(config: T3000MainConfig) -> Result<(), AppError> {
    let mut sync_logger = ServiceLogger::ffi()?;
    let db = establish_t3_device_connection().await?;

    loop {
        // Step 1: Check if rediscovery needed
        let should_rediscover = check_should_rediscover().await?;

        if should_rediscover {
            // === REDISCOVERY CYCLE ===
            sync_logger.info("🔄 REDISCOVERY CYCLE - Refreshing device list");

            // 1.1: GET_PANELS_LIST (instant, no sleep)
            let panels_time = Utc::now();
            let panels = get_panels_list_via_ffi().await?;

            // 1.2: Create GET_PANELS_LIST metadata
            let txn = db.begin().await?;
            create_panels_metadata(&txn, &panels, &config, panels_time).await?;

            // 1.3: Update cache and timestamp
            update_cached_device_list(panels.clone()).await;
            update_last_rediscover_time(panels_time).await;

            sync_logger.info(&format!("✅ Device list updated: {} devices cached", panels.len()));
        } else {
            sync_logger.info("⚡ QUICK SYNC - Using cached device list");
        }

        // Step 2: Get device list (from cache)
        let devices = get_cached_device_list().await?;

        if devices.is_empty() {
            sync_logger.warn("⚠️ No devices in cache - skipping cycle");
            sleep(Duration::from_secs(config.sync_interval_secs)).await;
            continue;
        }

        // Step 3: LOGGING_DATA sync for all devices (with 30s sleep between)
        sync_logging_data_for_all_devices(&db, &devices, &config).await?;

        // Step 4: Sleep until next cycle
        sync_logger.info(&format!("⏰ Sleeping {} seconds until next cycle", config.sync_interval_secs));
        sleep(Duration::from_secs(config.sync_interval_secs)).await;
    }
}
```

### Rediscovery Decision Logic

```rust
async fn check_should_rediscover() -> Result<bool, AppError> {
    // Get last rediscover time from state
    let last_time_opt = LAST_REDISCOVER_TIME.read().await;

    // First run - always rediscover
    if last_time_opt.is_none() {
        return Ok(true);
    }

    // Load rediscover interval from database
    let rediscover_interval = reload_rediscover_interval_from_db().await?;

    // Check elapsed time
    let last_time = last_time_opt.unwrap();
    let elapsed = Utc::now() - last_time;

    Ok(elapsed.num_seconds() >= rediscover_interval as i64)
}
```

### LOGGING_DATA Sync Implementation

```rust
async fn sync_logging_data_for_all_devices(
    db: &DatabaseConnection,
    devices: &[PanelInfo],
    config: &T3000MainConfig
) -> Result<(), AppError> {
    let mut sync_logger = ServiceLogger::ffi()?;
    let txn = db.begin().await?;

    // Create LOGGING_DATA metadata record
    let sync_start_time = Utc::now();
    let sync_metadata = trendlog_data_sync_metadata::ActiveModel {
        sync_time_fmt: Set(sync_start_time.format("%Y-%m-%d %H:%M:%S").to_string()),
        message_type: Set("LOGGING_DATA".to_string()),
        panel_id: Set(None),
        serial_number: Set(None),
        records_inserted: Set(Some(0)),  // Will update later
        sync_interval: Set(config.sync_interval_secs as i32),
        success: Set(Some(1)),
        error_message: Set(None),
        ..Default::default()
    };

    let sync_metadata_result = trendlog_data_sync_metadata::Entity::insert(sync_metadata)
        .exec(&txn)
        .await?;
    let sync_metadata_id = sync_metadata_result.last_insert_id;

    let mut total_records = 0;

    // Process each device
    for (idx, device) in devices.iter().enumerate() {
        sync_logger.info(&format!("📱 Device {}/{}: SN={}, Panel={}",
            idx + 1, devices.len(), device.serial_number, device.panel_number));

        // Call LOGGING_DATA (Action 15) - gets all 128 points
        let json_data = get_logging_data_via_direct_ffi(config, device.panel_number, device.serial_number).await?;

        // Process response: UPDATE/INSERT parents, INSERT details
        let records = process_logging_data_response(&txn, device, json_data, sync_metadata_id).await?;
        total_records += records;

        // Sleep between devices (rate limiting)
        if idx < devices.len() - 1 {
            sync_logger.info("⏸️ Rate limiting: sleeping 30 seconds...");
            tokio::time::sleep(Duration::from_secs(30)).await;
        }
    }

    // Update metadata with total records
    update_sync_metadata_records(&txn, sync_metadata_id, total_records).await?;

    // Commit transaction
    txn.commit().await?;

    sync_logger.info(&format!("✅ LOGGING_DATA sync completed: {} records inserted", total_records));
    Ok(())
}
```

---

## 8. Benefits & Trade-offs

### Benefits

 **Reduced Network Load**
- GET_PANELS_LIST: From every 10 min → once per hour (83% reduction)
- Only LOGGING_DATA runs frequently

 **Automatic Device Discovery**
- New devices automatically included after next rediscovery
- Disappeared devices automatically excluded

 **Consistent Data Collection**
- LOGGING_DATA runs at fixed intervals regardless of device count
- Predictable timing for trend analysis

 **Database Optimization**
- Parent records updated only when metadata changes
- Detail records efficiently inserted with minimal overhead
- Proper indexing on ParentId and LoggingTime_Fmt

 **Monitoring & Debugging**
- Clear metadata tracking for both GET_PANELS_LIST and LOGGING_DATA
- Easy to identify rediscovery cycles vs quick syncs
- RecordsInserted shows data volume trends

### Trade-offs

 **Delayed Device Discovery**
- New devices only discovered at next rediscovery interval
- Max delay = rediscover.interval_secs (e.g., 1 hour)
- Mitigation: Reduce rediscover interval for critical environments

 **Increased Cycle Time**
- Total cycle time = LOGGING_DATA (~5 min) + sleep (10 min) = ~15 min
- Not exactly ffi.sync_interval_secs (10 min from start to start)
- Mitigation: Calculate remaining sleep time to achieve exact intervals

 **Memory Overhead**
- Cached device list kept in memory
- Minimal impact (~1KB for 100 devices)

---

## 9. Testing & Validation

### Unit Tests

```rust
#[tokio::test]
async fn test_rediscovery_decision_first_run() {
    // Test: First run should always rediscover
    clear_last_rediscover_time().await;
    assert!(check_should_rediscover().await.unwrap());
}

#[tokio::test]
async fn test_rediscovery_decision_not_elapsed() {
    // Test: Should NOT rediscover if time not elapsed
    update_last_rediscover_time(Utc::now()).await;
    set_rediscover_interval(3600).await; // 1 hour

    tokio::time::sleep(Duration::from_secs(60)).await; // Wait 1 minute
    assert!(!check_should_rediscover().await.unwrap());
}

#[tokio::test]
async fn test_rediscovery_decision_elapsed() {
    // Test: Should rediscover if time elapsed
    let past_time = Utc::now() - chrono::Duration::hours(2);
    update_last_rediscover_time(past_time).await;
    set_rediscover_interval(3600).await; // 1 hour

    assert!(check_should_rediscover().await.unwrap());
}
```

### Integration Tests

```sql
-- Verify metadata pattern after 1 hour
SELECT
    CASE
        WHEN MessageType = 'GET_PANELS_LIST' THEN 'Rediscovery'
        ELSE 'Quick Sync'
    END as CycleType,
    COUNT(*) as Count
FROM TRENDLOG_DATA_SYNC_METADATA
WHERE SyncTime_Fmt >= datetime('now', '-1 hour')
GROUP BY CycleType;

-- Expected:
-- CycleType    | Count
-- Rediscovery  | 1-2   (depends on timing)
-- Quick Sync   | 5-7   (10 min intervals)
```

---

## 10. Rollout Plan

### Phase 1: Code Implementation (Week 1)
- [ ] Implement cached device list state management
- [ ] Implement rediscovery decision logic
- [ ] Refactor sync loop to support two-tier system
- [ ] Add GET_PANELS_LIST metadata tracking
- [ ] Add configuration reload for rediscover.interval_secs

### Phase 2: Testing (Week 2)
- [ ] Unit tests for rediscovery logic
- [ ] Integration tests with test database
- [ ] Load testing with 50+ devices
- [ ] Verify metadata patterns

### Phase 3: Deployment (Week 3)
- [ ] Deploy to development environment
- [ ] Monitor for 24 hours
- [ ] Adjust intervals based on observations
- [ ] Deploy to production

### Phase 4: Monitoring (Ongoing)
- [ ] Track GET_PANELS_LIST frequency
- [ ] Monitor LOGGING_DATA consistency
- [ ] Verify new device discovery
- [ ] Measure database size reduction

---

## 11. Appendix

### FFI Actions Reference

| Action | Name | Purpose | Frequency (New Design) |
|--------|------|---------|----------------------|
| 4 | GET_PANELS_LIST | Get device list | Every rediscover.interval_secs |
| 15 | LOGGING_DATA | Get 128 points data | Every ffi.sync_interval_secs |

### Database Schema Reference

```sql
-- Parent table (metadata stored once per point)
CREATE TABLE TRENDLOG_DATA (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    SerialNumber INTEGER NOT NULL,
    PanelId INTEGER NOT NULL,
    PointId TEXT NOT NULL,
    PointIndex INTEGER NOT NULL,
    PointType TEXT NOT NULL,
    Digital_Analog TEXT,
    Range_Field TEXT,
    Units TEXT,
    Description TEXT,
    IsActive BOOLEAN DEFAULT 1,
    CreatedAt TEXT DEFAULT (datetime('now')),
    UpdatedAt TEXT DEFAULT (datetime('now')),
    UNIQUE(SerialNumber, PanelId, PointId, PointIndex, PointType)
);

-- Detail table (time-series values)
CREATE TABLE TRENDLOG_DATA_DETAIL (
    ParentId INTEGER NOT NULL,
    Value TEXT NOT NULL,
    LoggingTime_Fmt TEXT NOT NULL,
    DataSource INTEGER DEFAULT 1,
    SyncMetadataId INTEGER
);

-- Metadata tracking table
CREATE TABLE TRENDLOG_DATA_SYNC_METADATA (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    SyncTime_Fmt TEXT NOT NULL,
    MessageType TEXT NOT NULL,
    PanelId INTEGER,
    SerialNumber INTEGER,
    RecordsInserted INTEGER DEFAULT 0,
    SyncInterval INTEGER NOT NULL,
    Success INTEGER DEFAULT 1,
    ErrorMessage TEXT,
    CreatedAt TEXT DEFAULT (datetime('now'))
);
```

---

**Document Version:** 2.0
**Last Updated:** October 29, 2025
**Next Review:** After Phase 2 Testing Completion
