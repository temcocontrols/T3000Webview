# T3000 FFI Sync Service Flow Documentation

## Overview

The T3000 FFI Sync Service is a critical component that handles real-time data synchronization between the T3000.exe C++ application and the Rust API backend. This service runs continuously in the background, calling T3000 C++ functions via FFI (Foreign Function Interface) to retrieve device data and sync it to the SQLite database.

## Service Configuration

### T3000MainConfig Structure

```rust
pub struct T3000MainConfig {
    pub sync_interval_secs: u64,      // Default: 30 seconds
    pub timeout_seconds: u64,         // FFI call timeout: 30 seconds
    pub retry_attempts: u32,          // Retry failed FFI calls: 3 times
    pub auto_start: bool,             // Start sync service on creation: true
}
```

**Default Values:**
- `sync_interval_secs`: 30 seconds (periodic sync interval)
- `timeout_seconds`: 30 seconds (maximum wait time for FFI response)
- `retry_attempts`: 3 (number of retry attempts if FFI call fails)
- `auto_start`: true (automatically start sync service on initialization)

## Complete Service Flow

### 11-Step LOGGING_DATA Sync Cycle

```
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: Application Startup                                     │
│ ────────────────────────────────────────────────────────────── │
│ File: api/src/main.rs → api/src/lib.rs                         │
│ Action: start_all_services_with_options()                      │
│ Log: "🚀 Starting all services..."                             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 2: Service Initialization                                  │
│ ────────────────────────────────────────────────────────────── │
│ File: api/src/lib.rs (lines 84-230)                           │
│ Action: T3000MainService::new(config)                          │
│ Creates: Service instance with 30s sync interval               │
│ Database: Connects to webview_t3_device.db                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 3: Background Task Spawn                                   │
│ ────────────────────────────────────────────────────────────── │
│ File: api/src/t3_device/t3_ffi_sync_service.rs (line 320-420) │
│ Action: start_sync_service() spawns tokio background task      │
│ Log: "🚀 Starting T3000 LOGGING_DATA sync service with         │
│       30-second intervals"                                      │
│ Log: "⚡ Running immediate sync on startup..."                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 4: Immediate Startup Sync                                  │
│ ────────────────────────────────────────────────────────────── │
│ File: api/src/t3_device/t3_ffi_sync_service.rs (line 593-790) │
│ Action: sync_logging_data_static(config)                       │
│ Log: "🏃 Performing immediate startup sync..."                 │
│ Note: Runs ONCE at startup before entering periodic loop       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 5: FFI Call to T3000.exe                                   │
│ ────────────────────────────────────────────────────────────── │
│ File: api/src/t3_device/t3_ffi_sync_service.rs (line 1064-1210)│
│ Function: get_logging_data_via_direct_ffi()                    │
│ FFI Call: BacnetWebView_HandleWebViewMsg(action=15, ...)       │
│ C++ File: BacnetWebView.cpp (case 15: LOGGING_DATA)           │
│ Buffer: 100MB (supports up to 100 devices)                     │
│ Timeout: 30 seconds with 3 retry attempts                      │
│ Retry Delays: 2s, 4s, 6s (progressive wait for MFC init)      │
│ Log: "🔄 Starting DIRECT FFI call to HandleWebViewMsg(15)"     │
│ Log: "[=== LOGGING_DATA C++ FFI Call [2025-10-21 12:00:16] ===]"│
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 6: Parse JSON Response                                     │
│ ────────────────────────────────────────────────────────────── │
│ File: api/src/t3_device/t3_ffi_sync_service.rs (line 1340+)   │
│ Function: parse_logging_response(json_data)                    │
│ Structure: LoggingDataResponse with DeviceWithPoints[]         │
│ Log: "📋 FFI Response - X devices found, Y characters received"│
│ Parses: device_info, input_points, output_points, variable_points│
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 7: Database Transaction Start                              │
│ ────────────────────────────────────────────────────────────── │
│ File: api/src/t3_device/t3_ffi_sync_service.rs (line 620)     │
│ Action: db.begin().await                                        │
│ Log: "💾 Database transaction started"                         │
│ Database: webview_t3_device.db                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 8: UPSERT Device and Point Data                           │
│ ────────────────────────────────────────────────────────────── │
│ For EACH device in response:                                    │
│                                                                  │
│ 8.1) UPSERT Device Basic Info                                  │
│      Table: DEVICES                                             │
│      Operation: INSERT (new) or UPDATE (existing)               │
│      Key: serial_number                                         │
│      Log: "📱 Device X/Y: Serial=Z, Name='...'"                │
│      Fields: panel_id, building_name, address, status, etc.    │
│                                                                  │
│ 8.2) UPSERT Input Points                                       │
│      Table: INPUT_POINTS                                        │
│      Operation: INSERT (new) or UPDATE (existing)               │
│      Key: serial_number + point_index                           │
│      Log: "🔧 Processing X INPUT points..."                     │
│      Fields: value, range, units, calibration, status, etc.    │
│                                                                  │
│ 8.3) UPSERT Output Points                                      │
│      Table: OUTPUT_POINTS                                       │
│      Operation: INSERT (new) or UPDATE (existing)               │
│      Key: serial_number + point_index                           │
│      Log: "🔧 Processing X OUTPUT points..."                    │
│      Fields: value, range, units, low_voltage, high_voltage    │
│                                                                  │
│ 8.4) UPSERT Variable Points                                    │
│      Table: VARIABLE_POINTS                                     │
│      Operation: INSERT (new) or UPDATE (existing)               │
│      Key: serial_number + point_index                           │
│      Log: "🔧 Processing X VARIABLE points..."                  │
│      Fields: value, range, units, unused, etc.                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 9: INSERT Trendlog Historical Data                         │
│ ────────────────────────────────────────────────────────────── │
│ File: api/src/t3_device/t3_ffi_sync_service.rs (line 900+)    │
│ Function: insert_trend_logs()                                   │
│ Table: TRENDLOG_DATA                                            │
│ Operation: ALWAYS INSERT (historical time-series data)          │
│ Log: "📊 Trend logs inserted (X entries)"                      │
│ Fields: serial_number, point_id, point_type, logging_time,     │
│         value, range, units, data_source=1 (FFI_SYNC),         │
│         sync_interval=30, created_by='ffi_sync_service'        │
│                                                                  │
│ Inserts for ALL points:                                         │
│ - All INPUT points with input_logging_time timestamp           │
│ - All OUTPUT points with output_logging_time timestamp         │
│ - All VARIABLE points with variable_logging_time timestamp     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 10: Transaction Commit                                     │
│ ────────────────────────────────────────────────────────────── │
│ File: api/src/t3_device/t3_ffi_sync_service.rs (line 750+)    │
│ Action: txn.commit().await                                      │
│ Log: "💾 Committing transaction (X devices)"                   │
│ Log: "✅ Transaction committed successfully"                   │
│ Atomicity: ALL changes for ALL devices committed together      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 11: Validation and Wait for Next Cycle                    │
│ ────────────────────────────────────────────────────────────── │
│ File: api/src/t3_device/t3_ffi_sync_service.rs (line 760+)    │
│ Action: Validate inserted records by counting database rows    │
│ Log: "🔍 Validation: Checking data persistence"                │
│ Log: "📊 Validation results: Device X: Y records..."           │
│ Log: "🎉 SYNC CYCLE COMPLETED - Next in 30s"                   │
│ Log: "⏰ Waiting 30 seconds until next sync cycle"             │
│                                                                  │
│ Wait: sleep(Duration::from_secs(30))                           │
│ Then: LOOP BACK TO STEP 5 for next periodic sync              │
└─────────────────────────────────────────────────────────────────┘
```

## Database Tables and Operations

### Tables Modified During Sync

1. **DEVICES** (UPSERT - Insert or Update)
   - Primary Key: `serial_number`
   - Operation: Insert new devices, update existing ones
   - Fields: panel_id, building_name, address, status, ip_address, port, etc.

2. **INPUT_POINTS** (UPSERT - Insert or Update)
   - Primary Key: `serial_number + point_index`
   - Operation: Insert new points, update existing ones
   - Fields: value, range, units, calibration, digital_analog, status, etc.

3. **OUTPUT_POINTS** (UPSERT - Insert or Update)
   - Primary Key: `serial_number + point_index`
   - Operation: Insert new points, update existing ones
   - Fields: value, range, units, low_voltage, high_voltage, status, etc.

4. **VARIABLE_POINTS** (UPSERT - Insert or Update)
   - Primary Key: `serial_number + point_index`
   - Operation: Insert new points, update existing ones
   - Fields: value, range, units, status, etc.

5. **TRENDLOG_DATA** (INSERT ONLY - Historical Time-Series)
   - No Primary Key (allows duplicate time-series entries)
   - Operation: ALWAYS INSERT (never update historical data)
   - Fields: serial_number, point_id, point_type, logging_time, value, data_source=1
   - Special Fields:
     - `data_source`: Set to 1 (DATA_SOURCE_FFI_SYNC constant)
     - `sync_interval`: Set to 30 (from config.sync_interval_secs)
     - `created_by`: Set to "ffi_sync_service" (CREATED_BY_FFI_SYNC_SERVICE constant)

## FFI Call Details

### Function Signature

```rust
type BacnetWebViewHandleWebViewMsgFn = unsafe extern "C" fn(
    action: i32,      // Action code (15 = LOGGING_DATA)
    msg: *mut c_char, // Buffer for response JSON
    len: i32          // Buffer size (100MB = 104857600 bytes)
) -> i32;             // Return code (0 = success, -2 = MFC not ready, other = error)
```

### Return Codes

- `0`: Success - JSON data in buffer
- `-2`: MFC application not initialized - retry with delay
- Other: Error - check buffer for error message

### Retry Logic

The service implements progressive retry delays to handle MFC initialization:

1. **First attempt**: Immediate call
2. **Retry 1** (if -2): Wait 2 seconds, try again
3. **Retry 2** (if -2): Wait 4 seconds, try again
4. **Retry 3** (if -2): Wait 6 seconds, try again
5. **Final failure**: Log error and wait for next 30-second sync cycle

## JSON Response Structure

### Expected Format from T3000.exe

```json
{
  "action": "LOGGING_DATA_RES",
  "timestamp": "2025-10-21T12:00:16Z",
  "devices": [
    {
      "device_info": {
        "panel_id": 1,
        "panel_name": "Building A Controller",
        "panel_serial_number": 12345,
        "panel_ipaddress": "192.168.1.100",
        "input_logging_time": "1729512016",
        "output_logging_time": "1729512016",
        "variable_logging_time": "1729512016",
        "ip_address": "192.168.1.100",
        "port": 502,
        "modbus_address": 1,
        "bacnet_mstp_mac_id": 1
      },
      "input_points": [
        {
          "index": 1,
          "panel": 1,
          "full_label": "Temperature Sensor 1",
          "value": 72.5,
          "range": 2,
          "units": "Deg.F",
          "status": 1,
          "timestamp": "2025-10-21T12:00:16Z",
          "id": "IN1"
        }
      ],
      "output_points": [...],
      "variable_points": [...]
    }
  ]
}
```

## Logging Pattern

### Log Files

The service writes to structured log files in `api/T3WebLog/`:

- **FFI.log** - All FFI-related operations
  - FFI call start/end
  - Response data size
  - Retry attempts
  - Success/failure status

- **Initialize.log** - Service initialization
  - Service startup
  - Configuration values
  - Critical errors

### Log Message Format

All log messages include emoji indicators for easy visual scanning:

- 🚀 Service startup
- 🔄 FFI call in progress
- ✅ Successful operation
- ❌ Error occurred
- ⚠️ Warning
- 📱 Device processing
- 🔧 Point processing
- 📊 Trendlog operation
- 💾 Database operation
- 🔍 Validation
- ⏰ Waiting for next cycle
- 🎉 Cycle completed

### Example Log Sequence

```
[2025-10-21 12:00:00] 🚀 Starting T3000 LOGGING_DATA sync service with 30-second intervals
[2025-10-21 12:00:00] ⚡ Running immediate sync on startup, then continuing with periodic sync...
[2025-10-21 12:00:00] 🏃 Performing immediate startup sync...
[2025-10-21 12:00:00] ⚙️ Config: Timeout 30s, Retry 3x
[2025-10-21 12:00:00] ✅ Database connection established
[2025-10-21 12:00:00] 🔄 Starting HandleWebViewMsg(15) call
[2025-10-21 12:00:16] [=== LOGGING_DATA C++ FFI Call [2025-10-21 12:00:16] ===]
[2025-10-21 12:00:16] 📋 FFI Response - 5 devices found, 524288 characters received
[2025-10-21 12:00:16] 💾 Database transaction started
[2025-10-21 12:00:16] 📱 Device 1/5: Serial=12345, Name='Building A Controller'
[2025-10-21 12:00:16] 🔧 Processing 64 INPUT points...
[2025-10-21 12:00:16] ✅ INPUT points completed
[2025-10-21 12:00:16] 🔧 Processing 32 OUTPUT points...
[2025-10-21 12:00:16] ✅ OUTPUT points completed
[2025-10-21 12:00:16] 🔧 Processing 128 VARIABLE points...
[2025-10-21 12:00:16] ✅ VARIABLE points completed
[2025-10-21 12:00:16] 📊 Trend logs inserted (224 entries)
[2025-10-21 12:00:16] 🎯 Device 12345 completed
[2025-10-21 12:00:16] 💾 Committing transaction (5 devices)
[2025-10-21 12:00:16] ✅ Transaction committed successfully
[2025-10-21 12:00:16] 🔍 Validation: Checking data persistence
[2025-10-21 12:00:16] 📊 Validation results: Device 12345: 1 record(s) in DEVICES table; 64 INPUT points; 32 OUTPUT points; 128 VARIABLE points;
[2025-10-21 12:00:16] 🎉 SYNC CYCLE COMPLETED - Next in 30s
[2025-10-21 12:00:16] ⏰ Waiting 30 seconds until next sync cycle
```

## Timing Summary

| Operation | Duration | Notes |
|-----------|----------|-------|
| **Sync Interval** | 30 seconds | Time between periodic syncs |
| **FFI Timeout** | 30 seconds | Maximum wait for C++ response |
| **Startup Sync** | Immediate | Runs once at service startup |
| **Retry Delay 1** | 2 seconds | First retry wait time |
| **Retry Delay 2** | 4 seconds | Second retry wait time |
| **Retry Delay 3** | 6 seconds | Third retry wait time |
| **Total Retry Time** | Up to 12s | Maximum retry overhead |
| **Trendlog Config Sync** | One-time | 5s delay + 500ms per device |

## Service Control

### Starting the Service

The service starts automatically when the Rust API application launches:

```rust
// In api/src/lib.rs
let config = T3000MainConfig {
    sync_interval_secs: 30,
    timeout_seconds: 30,
    retry_attempts: 3,
    auto_start: true,
};

let service = T3000MainService::new(config).await?;
service.start_sync_service().await?;
```

### Manual Sync Trigger

You can trigger a one-time sync independently of the periodic schedule:

```rust
// Get the global service instance
let service = T3000MainService::get_service().await?;

// Trigger immediate sync
service.sync_once().await?;
```

### Stopping the Service

```rust
// Get the global service instance
let service = T3000MainService::get_service().await?;

// Stop periodic sync
service.stop_sync_service();
```

## Error Handling

### Common Error Scenarios

1. **MFC Not Initialized (-2)**
   - Symptom: FFI call returns -2 immediately after T3000.exe startup
   - Handling: Automatic retry with progressive delays (2s, 4s, 6s)
   - Resolution: MFC initialization completes within ~10 seconds

2. **Timeout Error**
   - Symptom: FFI call exceeds 30-second timeout
   - Handling: Logged as error, service continues with next cycle
   - Resolution: Check T3000.exe performance, increase timeout if needed

3. **Database Connection Error**
   - Symptom: Cannot connect to webview_t3_device.db
   - Handling: Service stops, error logged to Initialize.log
   - Resolution: Check database file permissions and path

4. **Transaction Commit Error**
   - Symptom: Database transaction fails during commit
   - Handling: All changes rolled back, error logged
   - Resolution: Check database integrity, disk space

5. **Invalid SerialNumber (SerialNumber=0)**
   - Symptom: Device in JSON response has SerialNumber=0
   - Handling: Device skipped with warning log
   - Resolution: Fix C++ HandleWebViewMsg to provide valid serial numbers

## Performance Considerations

### Buffer Size

- **100MB buffer** supports up to 100 devices
- Each device averages ~1MB in JSON format
- If you have more than 100 devices, increase `BUFFER_SIZE` constant

### Database Performance

- **Transaction-based sync** ensures atomicity
- All devices synced in single transaction
- Use indexes on `serial_number` and `point_index` columns for faster queries

### Memory Usage

- Service runs in background tokio task
- 100MB buffer allocated per FFI call
- Database connection pool managed by SeaORM

## Integration with Frontend

### WebSocket Broadcasting (Future Enhancement)

The service includes hooks for WebSocket broadcasting:

```rust
pub fn set_websocket_sender(&mut self, sender: tokio::sync::broadcast::Sender<String>) {
    self.websocket_sender = Some(sender);
}
```

This allows real-time updates to be pushed to connected frontend clients.

### Data Source Identification

Frontend queries can filter trendlog data by source:

```sql
SELECT * FROM TRENDLOG_DATA
WHERE data_source = 1  -- FFI_SYNC data
  AND serial_number = 12345
  AND point_type = 'INPUT'
ORDER BY logging_time DESC
LIMIT 1000;
```

## Constants and Configuration

### Data Source Constants

```rust
// From api/src/t3_device/constants.rs
pub const DATA_SOURCE_FFI_SYNC: i32 = 1;
pub const DATA_SOURCE_MANUAL: i32 = 2;
pub const DATA_SOURCE_REALTIME: i32 = 3;

pub const CREATED_BY_FFI_SYNC_SERVICE: &str = "ffi_sync_service";
pub const CREATED_BY_MANUAL_ENTRY: &str = "manual_entry";
pub const CREATED_BY_REALTIME_SYNC: &str = "realtime_sync";
```

### Sync Interval Fallback

```rust
// From api/src/t3_device/trendlog_data_service.rs
const DEFAULT_SYNC_INTERVAL_SECS: i32 = 30;

// Used as fallback when sync_interval not provided:
let sync_interval = sync_interval.unwrap_or(DEFAULT_SYNC_INTERVAL_SECS);
```

## Troubleshooting

### Service Not Starting

1. Check Initialize.log for startup errors
2. Verify database file exists and is accessible
3. Confirm T3000.exe is running
4. Check BacnetWebView_HandleWebViewMsg export exists

### No Data Syncing

1. Check FFI.log for call errors
2. Verify FFI call returns data (not empty JSON)
3. Check database transaction commit logs
4. Run validation queries on TRENDLOG_DATA table

### Slow Sync Performance

1. Check FFI call duration in logs
2. Monitor database transaction commit time
3. Consider reducing device count or sync interval
4. Add database indexes on frequently queried columns

### Memory Issues

1. Monitor buffer allocation (100MB per call)
2. Check for memory leaks in C++ HandleWebViewMsg
3. Reduce BUFFER_SIZE if memory constrained
4. Profile memory usage with `cargo flamegraph`

## Dynamic Configuration

### Configurable Sync Interval (Added October 22, 2025)

The FFI sync service now supports **dynamic configuration** of the sync interval without requiring service restart. Users can change the interval from 1 minute to 365 days through the UI, and the service will automatically pick up the new setting on the next cycle.

#### Configuration Storage

Sync interval is stored in the `APPLICATION_CONFIG` table:

```sql
-- Default configuration
config_key: "ffi.sync_interval_secs"
config_value: "300"  -- 5 minutes (default)
config_type: "number"
description: "FFI Sync Service interval in seconds"
is_system: false
```

All configuration changes are automatically logged to `APPLICATION_CONFIG_HISTORY` table for audit trail.

#### API Endpoints

**Get Current Interval:**
```http
GET /api/config/ffi-sync-interval

Response:
{
  "interval_secs": 300,
  "last_sync": "2025-10-22T10:30:00Z"
}
```

**Update Interval:**
```http
PUT /api/config/ffi-sync-interval
Content-Type: application/json

{
  "interval_secs": 600,
  "changed_by": "user",
  "change_reason": "Updated via Trendlog Configuration UI"
}

Response:
{
  "interval_secs": 600,
  "last_sync": null
}
```

**Get Change History:**
```http
GET /api/config/history?config_key=ffi.sync_interval_secs&limit=100

Response:
[
  {
    "id": 1,
    "config_key": "ffi.sync_interval_secs",
    "old_value": "300",
    "new_value": "600",
    "old_value_display": "5 minutes",
    "new_value_display": "10 minutes",
    "changed_by": "user",
    "change_reason": "Updated via Trendlog Configuration UI",
    "changed_at": "2025-10-22 10:30:15"
  }
]
```

#### Validation Rules

- **Minimum**: 60 seconds (1 minute)
- **Maximum**: 31,536,000 seconds (365 days)
- **Warning**: Intervals < 5 minutes may impact performance
- **Warning**: Intervals > 1 hour may delay data updates

#### UI Configuration

Users can configure the sync interval through the **Trendlog Configuration** modal in TrendLogChart:

**Preset Options:**
- 5 minutes (default)
- 10 minutes
- 15 minutes
- 30 minutes
- 1 hour
- Custom (with unit selector)

**Custom Interval:**
- Value range: 1-59 minutes, 1-23 hours, 1-365 days
- Unit selector: Minutes, Hours, Days
- Real-time validation

**Status Display:**
- Current interval (human-readable)
- Last sync timestamp
- Countdown timer: "Next sync in: MM:SS"

**Change History:**
- View last 100 configuration changes
- Shows: Date/Time, Old → New value, Changed By, Reason
- Modal table view with filtering

#### How Dynamic Reload Works

1. **Service Loop Check:**
   ```rust
   // Before each sleep cycle
   let current_interval = reload_sync_interval_from_db().await.unwrap_or(config.sync_interval_secs);

   if current_interval != config.sync_interval_secs {
       logger.info("🔄 Sync interval updated: {}s → {}s",
           config.sync_interval_secs, current_interval);
       config.sync_interval_secs = current_interval;
   }
   ```

2. **Log Output Example:**
   ```
   [2025-10-22 10:30:00] ⏰ Waiting 300 seconds until next sync cycle
   [2025-10-22 10:35:00] 🔄 Sync interval updated: 300s (5 min) → 600s (10 min)
   [2025-10-22 10:35:00] ⏰ Waiting 600 seconds until next sync cycle
   ```

3. **No Service Restart Required:**
   - Configuration changes take effect on next cycle
   - Current sync completes with old interval
   - Next cycle starts with new interval
   - Seamless transition without downtime

#### Startup Behavior

1. Service reads `APPLICATION_CONFIG` on startup
2. If `ffi.sync_interval_secs` not found, inserts default (300 seconds)
3. Logs: `"Sampling Interval loaded: 300 seconds (5 minutes)"`
4. Service starts with configured interval

#### History Tracking

Every configuration change is automatically logged:

**Database Table:**
```sql
CREATE TABLE APPLICATION_CONFIG_HISTORY (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    config_key TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT NOT NULL,
    changed_by TEXT,
    change_reason TEXT,
    changed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Log Entry Example:**
```json
{
  "config_key": "ffi.sync_interval_secs",
  "old_value": "300",
  "new_value": "900",
  "changed_by": "user",
  "change_reason": "Reduced sync frequency to save resources",
  "changed_at": "2025-10-22 14:30:00"
}
```

#### Best Practices

**Choosing the Right Interval:**

| Interval | Use Case | Pros | Cons |
|----------|----------|------|------|
| 1-5 min | Critical monitoring, real-time alerts | Quick updates | High resource usage |
| 5-15 min | Standard monitoring (default) | Balanced performance | Slight delay |
| 15-60 min | Low-priority data, stable systems | Resource efficient | Noticeable delay |
| 1+ hours | Historical data, archival systems | Minimal impact | Long delays |
| Days | Infrequent checks, backup systems | Very efficient | Very long delays |

**Performance Considerations:**
- Each sync processes ALL devices and points
- 100MB buffer allocated per sync
- Network bandwidth used for data transfer
- Database transaction per sync
- Consider device count when setting interval

**Monitoring:**
- Check `FFI.log` for sync cycle completion times
- Monitor database size growth rate
- Watch for timeout errors with long intervals
- Review change history for configuration auditing

## Related Files

- **Service Implementation**: `api/src/t3_device/t3_ffi_sync_service.rs`
- **Service Initialization**: `api/src/lib.rs`, `api/src/main.rs`
- **Database Entities**: `api/src/entity/t3_device/*.rs`, `api/src/entity/application_config_history.rs`
- **API Endpoints**: `api/src/database_management/config_api.rs`
- **Constants**: `api/src/t3_device/constants.rs`
- **Trendlog Service**: `api/src/t3_device/trendlog_data_service.rs`
- **Logger**: `api/src/logger.rs`
- **C++ Integration**: `T3000-Source/BacnetWebView.cpp` (HandleWebViewMsg function)
- **Frontend UI**: `src/components/NewUI/TrendLogChart.vue` (Trendlog Configuration modal)

## Future Enhancements

1. **WebSocket Broadcasting**: Push real-time updates to connected clients
2. ~~**Configurable Sync Interval**: Allow runtime adjustment via API~~ ✅ **Completed** (October 22, 2025)
3. **Selective Sync**: Sync only changed data instead of all devices
4. **Compression**: Compress JSON response for faster transfer
5. **Parallel Processing**: Process multiple devices concurrently
6. **Delta Sync**: Track and sync only changed points
7. **Health Monitoring**: Expose service health metrics via API endpoint
8. **Per-Device Intervals**: Different sync intervals for different devices based on priority

---

**Document Version**: 1.1
**Last Updated**: October 22, 2025
**Author**: T3000 Development Team
**Related**: [BACnet Implementation Plan](../bacnet/BACnet-Implementation-Plan-Phase1.md)

**Changelog:**
- **v1.1** (Oct 22, 2025): Added Dynamic Configuration section with configurable sync interval feature
- **v1.0** (Oct 21, 2025): Initial documentation
