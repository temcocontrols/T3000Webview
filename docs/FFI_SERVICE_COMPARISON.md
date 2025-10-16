# Comparison: t3_ffi_api_service.rs vs t3_ffi_sync_service.rs

## File Statistics
- **t3_ffi_api_service.rs**: 183 lines, 7KB
- **t3_ffi_sync_service.rs**: 1,954 lines, 102KB

## Summary
**NO, they are NOT the same.** They serve completely different purposes.

---

## t3_ffi_api_service.rs (Simple HTTP Middleware)

### Purpose
**Simple pass-through HTTP API** - Acts as a thin middleware layer between frontend and T3000 FFI

### Key Features
- ✅ Single HTTP endpoint: `/api/t3000/ffi/call`
- ✅ Receives JSON message from frontend
- ✅ Calls `BacnetWebView_HandleWebViewMsg` FFI function
- ✅ Returns raw FFI response to frontend
- ✅ **No data processing** - just passes data through
- ✅ **No database operations** - pure FFI wrapper
- ✅ **No background sync** - only responds to HTTP requests

### Architecture
```
Frontend → HTTP POST → t3_ffi_api_service → FFI Call → T3000.exe
                                                            ↓
Frontend ← HTTP Response ← JSON Response ← FFI Response ←───┘
```

### Code Structure
- `T3000FfiApiService` struct (simple wrapper)
- `load_t3000_function()` - loads FFI function
- `call_ffi()` - makes FFI call
- `handle_ffi_call()` - HTTP endpoint handler
- `create_ffi_api_routes()` - route registration

### Use Case
- **On-demand FFI calls** from frontend
- Quick testing of FFI functionality
- Alternative to WebSocket communication

---

## t3000_ffi_sync_service.rs (Full Sync Service)

### Purpose
**Primary T3000 integration service** - Complete data synchronization and management system

### Key Features
- ✅ **Background sync service** - runs continuously
- ✅ **Database synchronization** - stores data in `webview_t3_device.db`
- ✅ **Device management** - tracks devices, points, trendlogs
- ✅ **Multi-device support** - syncs data from multiple T3000 devices
- ✅ **Trendlog data collection** - saves INPUT/OUTPUT/VARIABLE point data
- ✅ **Configurable intervals** - default 30-second sync
- ✅ **One-time startup sync** - `sync_all_trendlog_configs()`
- ✅ **Complete data processing** - parses, transforms, stores data

### Architecture
```
Background Service (runs every 30s)
  ↓
Call T3000_GetLoggingData (FFI)
  ↓
Parse JSON Response
  ↓
Store in Database:
  - DEVICES table
  - INPUTS/OUTPUTS/VARIABLES tables
  - TRENDLOG_DATA table (historical data)
  ↓
Log to T3WebLog
```

### Code Structure
- `T3000MainConfig` - service configuration
- `T3000MainService` - main service implementation
- `DeviceInfo`, `PointData`, `LoggingDataResponse` - data structures
- **15+ public functions** including:
  - `initialize_logging_service()` - setup
  - `start_logging_sync()` - start background sync
  - `stop_logging_sync()` - stop sync
  - `sync_logging_data_once()` - manual sync
  - `sync_all_trendlog_configs()` - startup sync
  - `sync_device_data()` - sync single device
  - `sync_trendlogs_to_database()` - save trendlog data
  - `derive_units_from_range()` - unit calculation
  - `format_unix_timestamp_to_local()` - timestamp formatting

### Use Case
- **Automatic background data collection**
- **Historical data storage** for trend analysis
- **Database persistence** for offline viewing
- **Multi-device monitoring**

---

## Key Differences

| Feature | t3_ffi_api_service | t3_ffi_sync_service |
|---------|-------------------|----------------------|
| **Size** | 183 lines | 1,954 lines |
| **Purpose** | HTTP passthrough | Full sync service |
| **Database** | ❌ None | ✅ Full database ops |
| **Background Service** | ❌ No | ✅ Yes (continuous) |
| **Data Processing** | ❌ Raw passthrough | ✅ Parse, transform, store |
| **Multi-Device** | ❌ Single call | ✅ Multiple devices |
| **Trendlog Storage** | ❌ No | ✅ TRENDLOG_DATA table |
| **Startup Sync** | ❌ No | ✅ One-time sync |
| **HTTP Endpoints** | 1 endpoint | 0 endpoints (background only) |
| **FFI Functions Called** | `BacnetWebView_HandleWebViewMsg` | Multiple FFI functions |
| **Constants Used** | ❌ No | ✅ DATA_SOURCE_FFI_SYNC, etc. |
| **Logging** | Basic API logging | Structured T3WebLog logging |

---

## When to Use Each

### Use `t3_ffi_api_service` when:
- ✅ Need quick FFI call from frontend
- ✅ Don't need data persistence
- ✅ Want simple request/response pattern
- ✅ Testing FFI functionality
- ✅ Alternative to WebSocket

### Use `t3000_ffi_sync_service` when:
- ✅ Need continuous background sync
- ✅ Want historical data storage
- ✅ Need multi-device monitoring
- ✅ Require offline data access
- ✅ Building trend charts/analysis
- ✅ Need database persistence

---

## Current Project Usage

Both services are **active and used** in different scenarios:

1. **t3_ffi_api_service** - Registered in `server.rs` as HTTP routes
2. **t3000_ffi_sync_service** - Main background service, called at startup

They **complement each other**, not duplicate:
- FFI API Service = **on-demand** HTTP calls
- FFI Sync Service = **automatic** background sync

---

## Recommendation

✅ **Keep both files** - they serve different purposes and are both actively used.

**Do NOT merge or remove either one.**
