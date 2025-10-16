# Trendlog Configuration Startup Sync

## Overview

This document explains the automatic trendlog configuration synchronization that occurs when T3000 starts up.

## Architecture

### Two Separate Trendlog Systems

1. **TRENDLOG Table** (Configuration)
   - Stores: Monitor list, labels, intervals, status, data size
   - Source: NEW C++ exports `BacnetWebView_GetTrendlogList/Entry`
   - Service: `TrendlogMonitorService` in `trendlog_monitor_service.rs`
   - Sync: **ONE-TIME at startup** + manual refresh via HTTP API

2. **TRENDLOG_DATA Table** (Time-Series Data)
   - Stores: Actual trendlog data points with timestamps
   - Source: `BacnetWebView_HandleWebViewMsg(action=15)`
   - Service: `T3000MainService` in `t3000_ffi_sync_service.rs`
   - Sync: **CONTINUOUS** (every 30 seconds)

## Startup Sequence

When T3000 starts and the Rust API initializes:

```
┌─────────────────────────────────────────────────────────┐
│ 1. T3000 Application Starts                            │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 2. T3000MainService::start_sync_service() called       │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 3. IMMEDIATE SYNC #1: sync_logging_data_static()       │
│    - Calls HandleWebViewMsg(15) to get all devices     │
│    - Populates DEVICES table                           │
│    - Populates INPUT/OUTPUT/VARIABLE points            │
│    - Populates TRENDLOG_DATA (time-series)             │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 4. IMMEDIATE SYNC #2: sync_all_trendlog_configs()      │
│    - Queries DEVICES table for all devices             │
│    - For each device:                                   │
│      • Calls BacnetWebView_GetTrendlogList(panel_id)   │
│      • Parses JSON response from C++                   │
│      • Saves to TRENDLOG table                         │
│    - Logs success/failure for each device              │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 5. PERIODIC SYNC: Every 30 seconds                     │
│    - Only syncs TRENDLOG_DATA (time-series)            │
│    - Does NOT re-sync trendlog config                  │
└─────────────────────────────────────────────────────────┘
```

## Implementation Details

### File: `api/src/t3_device/t3000_ffi_sync_service.rs`

#### Added Function: `sync_all_trendlog_configs()`

```rust
/// Sync trendlog configurations for all devices (ONE-TIME operation)
/// This calls the NEW BacnetWebView_GetTrendlogList/Entry C++ export functions
async fn sync_all_trendlog_configs() -> Result<(), AppError> {
    // 1. Get database connection
    // 2. Query all devices
    // 3. Create TrendlogMonitorService
    // 4. For each device:
    //    - Call sync_trendlogs_to_database(panel_id)
    //    - Log success/failure
    // 5. Return summary
}
```

#### Modified Function: `start_sync_service()`

Added call to `sync_all_trendlog_configs()` right after the immediate startup sync:

```rust
// Sync trendlog configurations for all devices (ONE-TIME at startup)
task_logger.info("📊 Syncing trendlog configurations for all devices...");
if let Err(e) = Self::sync_all_trendlog_configs().await {
    task_logger.error(&format!("❌ Trendlog config sync failed: {}", e));
} else {
    task_logger.info("✅ Trendlog config sync completed successfully");
}
```

## Manual Refresh

After startup, trendlog configuration can be manually refreshed via:

### Option 1: HTTP API Endpoints

```bash
# Sync all trendlogs for a specific device
GET /api/trendlog/:panel_id/sync

# Get trendlog list (with optional sync)
GET /api/trendlog/:panel_id/list?sync_to_db=true
```

### Option 2: UI Action

The trendlog window UI can trigger a manual sync when opened or when user clicks a refresh button.

## Logging

The startup sync operation logs to `T3WebLog` directory:

- **Category**: `FFI` (same as the periodic sync)
- **Log Messages**:
  - `📊 Starting one-time trendlog configuration sync for all devices...`
  - `📱 Found N devices to sync trendlog configs`
  - `🔄 Syncing trendlog config for device X (panel_id: Y)`
  - `✅ Device X - synced N trendlogs`
  - `⚠️ Device X - trendlog sync failed: error`
  - `🎉 Trendlog config sync complete - N trendlogs synced, M devices failed`

## C++ Functions Called

During startup sync, these NEW C++ export functions are called:

1. **BacnetWebView_GetTrendlogList(panel_id, buffer, buffer_size)**
   - Returns: JSON array of all trendlog monitors for a device
   - Logs to: `T3WebLog/YYYY-MM/MMDD/T3_CppMsg_BacnetWebView_Exports_MMDD_HHMM.txt`
   - Data source: `g_monitor_data[panel_id]` vector

2. **BacnetWebView_GetTrendlogEntry(panel_id, monitor_index, buffer, buffer_size)**
   - Returns: JSON object with detailed trendlog info and input points
   - Called only when getting detailed information (not during startup)

## Benefits

1. **Fast UI Load**: Trendlog list is pre-populated before user opens window
2. **No Delays**: No waiting for FFI calls when opening trendlog view
3. **Reduced Load**: Only syncs once at startup, not every 30 seconds
4. **Manual Control**: User can refresh when needed via UI or API

## Troubleshooting

### No Trendlogs After Startup

Check logs for:
- `⚠️ Skipping device X - invalid panel_id` - Device has panel_id=0
- `⚠️ Device X - trendlog sync failed` - C++ function call failed
- `⚠️ NEW C++ export functions NOT available` - DLL not loaded or functions missing

### Startup Delay

If startup is slow, check:
- Number of devices (each device requires FFI call)
- C++ function response time
- Database transaction time

Typical startup time: **1-3 seconds** for 5 devices with 8 trendlogs each

## Future Enhancements

Potential improvements:

1. **Configurable**: Make startup sync optional via config
2. **Parallel Sync**: Sync multiple devices concurrently
3. **Cached Results**: Cache C++ responses to speed up subsequent calls
4. **Incremental Sync**: Only sync changed trendlogs (requires change detection)

## Related Files

- `api/src/t3_device/t3000_ffi_sync_service.rs` - Main service with startup sync
- `api/src/t3_device/trendlog_monitor_service.rs` - Trendlog FFI service
- `api/src/t3_device/trendlog_monitor_routes.rs` - HTTP API endpoints
- `T3000-Source/T3000/BacnetWebView_Exports.cpp` - C++ export functions
- `api/src/entity/t3_device/trendlogs.rs` - TRENDLOG table entity

## Testing

To test the startup sync:

1. **Stop T3000** if running
2. **Clear TRENDLOG table**: `DELETE FROM trendlogs;`
3. **Start T3000**
4. **Check logs**: Look for trendlog sync messages
5. **Query database**: `SELECT * FROM trendlogs;` - should show trendlogs
6. **Open UI**: Trendlog window should show populated list

## Summary

✅ **ONE-TIME sync** at startup populates TRENDLOG config for all devices
✅ **Manual refresh** available via HTTP API or UI
✅ **No overhead** on periodic sync (only data, not config)
✅ **Fast UI** - no waiting for FFI calls when opening trendlog window
