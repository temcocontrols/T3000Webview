# Data Collection Endpoints - Removal Documentation

**Date Removed**: November 28, 2025
**Reason**: Module cleanup - `RealtimeDataService` was removed, endpoints were non-functional
**Status**: PERMANENTLY REMOVED (alternative mechanisms exist)

---

## Overview

The data collection endpoints were a set of 6 REST API routes that managed a background Rust service (`RealtimeDataService`) for automated polling and collection of device point data. These endpoints have been permanently removed as part of codebase cleanup.

## Removed Endpoints

### 1. POST `/api/t3_device/collection/start`
**Purpose**: Start the background data collection service
**Behavior**:
- Created `RealtimeDataService` instance
- Stored in `state.data_collector` (Arc<Mutex<Option<RealtimeDataService>>>)
- Called `service.start().await` to begin polling
- Returned success/error status

**Request**: No body required
**Response**:
```json
{
  "status": "success",
  "message": "Data collection started successfully",
  "action": "start_data_collection"
}
```

---

### 2. POST `/api/t3_device/collection/stop`
**Purpose**: Stop the running data collection service
**Behavior**:
- Retrieved service from `state.data_collector`
- Called `service.stop().await`
- Cleared the service from state

**Request**: No body required
**Response**:
```json
{
  "status": "success",
  "message": "Data collection stopped successfully",
  "action": "stop_data_collection"
}
```

---

### 3. GET `/api/t3_device/collection/status`
**Purpose**: Query current status of the collection service
**Response Fields**:
```json
{
  "is_running": true,
  "last_collection_time": "2025-11-28T10:30:00Z",
  "next_collection_time": "2025-11-28T10:35:00Z",
  "total_points_collected": 15420,
  "errors_count": 3,
  "active_devices": [12345, 67890],
  "collection_source": "FFI"
}
```

---

### 4. GET `/api/t3_device/collection/config`
**Purpose**: Retrieve current collection configuration
**Response Fields**:
```json
{
  "enabled": true,
  "collection_interval_seconds": 300,
  "startup_delay_seconds": 30,
  "devices_to_collect": [12345, 67890],
  "point_types": ["Input", "Output", "Variable"],
  "batch_size": 100,
  "timeout_seconds": 30,
  "retry_attempts": 3,
  "enable_websocket_collection": true,
  "enable_cpp_direct_calls": true,
  "enable_bacnet_collection": false
}
```

---

### 5. POST `/api/t3_device/collection/config`
**Purpose**: Update collection service configuration
**Request Body**: JSON with config fields (same as GET response)
**Response**:
```json
{
  "status": "success",
  "message": "Collection configuration updated",
  "action": "update_collection_config",
  "config": { /* updated config */ }
}
```

**Note**: Implementation was incomplete - JSON to `DataCollectionConfig` conversion was not implemented.

---

### 6. POST `/api/t3_device/collection/collect-now`
**Purpose**: Force an immediate collection run (bypass scheduled interval)
**Request**: No body required
**Response**:
```json
{
  "status": "success",
  "message": "Immediate data collection completed. Collected 245 data points.",
  "action": "collect_now",
  "points_collected": 245
}
```

---

## Technical Implementation Details

### Service Architecture
```
Background Collection Service (RealtimeDataService)
├── Device Scanner
│   ├── Auto-discover T3000 devices on network
│   ├── Register devices in database
│   └── Monitor device online/offline status
│
├── Point Manager
│   ├── Auto-configure trending for active points
│   ├── Apply timebase intervals based on point type
│   └── Enable/disable trending per user configuration
│
├── Data Collector
│   ├── Schedule collection based on intervals
│   ├── Read point values via T3000 C++ bridge (FFI)
│   ├── Validate and store data in TRENDLOG_DATA table
│   └── Handle communication errors gracefully
│
└── Real-time Broadcaster
    ├── Send updates via WebSocket (port 9104)
    ├── Notify frontend of new data
    └── Push device status changes
```

### Database Tables Used
- **Primary**: `TRENDLOG_DATA` - Historical trend data storage
- **Related**:
  - `TRENDLOGS` - Configuration for what to trend
  - `INPUT_POINTS`, `OUTPUT_POINTS`, `VARIABLE_POINTS` - Point definitions
  - `DEVICES` - Device registry

### C++ Integration
- **FFI Bridge**: `BacnetWebView_HandleWebViewMsg()` in `BacnetWebView_Exports.cpp`
- **Data Reading**: Called C++ functions to read device point values
- **Communication**: T3000.exe handled actual device communication (BACnet/Modbus)

### State Management
- **AppState Field**: `data_collector: Arc<Mutex<Option<RealtimeDataService>>>`
- **Status**: Commented out in `app_state.rs` (lines 114, 131)
- **Lifecycle**: Service lived in state for the lifetime of the application

---

## Why Removed

### Primary Reasons:
1. **Module Deleted**: `RealtimeDataService` module was removed during `MODULE_CLEANUP_2025-01`
2. **Non-Functional**: Endpoints referenced non-existent types and methods
3. **Incomplete Implementation**: Config update logic was stubbed out
4. **Alternative Mechanisms**: Better approaches exist (see below)
5. **Complexity**: Added unnecessary complexity for limited benefit

### Code Comments Found:
```rust
// TEMPORARILY DISABLED - DATA COLLECTION ENDPOINTS (Need field name updates)
// Note: C++ expects field names matching Str_table_point structure
```

---

## Alternative Approaches (Current System)

### 1. Manual Data Insertion (Active)
**Endpoints**:
```http
POST /api/t3_device/trendlog-data/realtime         # Insert single data point
POST /api/t3_device/trendlog-data/realtime/batch   # Insert batch of data points
```

**Usage**: External scripts or C++ T3000.exe directly pushes data to these endpoints

**Example**:
```bash
curl -X POST http://localhost:9103/api/t3_device/trendlog-data/realtime \
  -H "Content-Type: application/json" \
  -d '{
    "serial_number": 12345,
    "panel_id": 1,
    "point_type": "Input",
    "point_index": 5,
    "value": 72.5,
    "timestamp": "2025-11-28T10:30:00Z"
  }'
```

---

### 2. C++ Push Mechanism (Recommended)
**Approach**: T3000.exe directly calls the Rust API endpoints when values change

**Advantages**:
- Real-time updates (no polling delay)
- No Rust-side device communication needed
- Simpler architecture
- Leverages existing C++ device communication

**Flow**:
```
Device → C++ T3000.exe → HTTP POST → Rust API → Database
```

---

### 3. External Collection Script
**Approach**: Separate Python/Node.js script polls devices and inserts data

**Example Python Script**:
```python
import requests
import time

while True:
    # Poll device via BACnet/Modbus library
    value = read_device_point(device_id=12345, point_type="Input", point_index=5)

    # Insert via API
    requests.post("http://localhost:9103/api/t3_device/trendlog-data/realtime", json={
        "serial_number": 12345,
        "panel_id": 1,
        "point_type": "Input",
        "point_index": 5,
        "value": value,
        "timestamp": datetime.utcnow().isoformat()
    })

    time.sleep(300)  # 5-minute interval
```

---

### 4. WebSocket Real-Time Broadcasting (Port 9104)
**Status**: Already implemented
**Purpose**: Push real-time data to connected frontend clients

**Usage**: Frontend connects to WebSocket and receives live updates:
```javascript
const ws = new WebSocket('ws://localhost:9104');
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  updateChart(data);
};
```

---

## Frontend Impact

### Pages That Referenced Collection (No Longer Applicable):
- `DatabaseManagementPage.vue` - Showed collection status (can be removed)
- `DatabasePartitionsPanel.vue` - Referenced `TRENDLOG_DATA` table (still valid)
- `MonitoringStatsPanel.vue` - Displayed collection stats (can show table stats instead)

### No Breaking Changes:
- No frontend currently calls `/collection/*` endpoints
- Data display pages continue working with manual insertion endpoints
- TrendLog charts work identically (query `TRENDLOG_DATA` table)

---

## Data Collection Configuration (Historical Reference)

### Config Structure (Not Implemented):
```rust
struct DataCollectionConfig {
    enabled: bool,
    collection_interval_seconds: u64,        // Default: 300 (5 minutes)
    startup_delay_seconds: u64,              // Default: 30
    devices_to_collect: Vec<i32>,            // Device IDs to poll
    point_types: Vec<String>,                // ["Input", "Output", "Variable"]
    batch_size: usize,                       // Default: 100
    timeout_seconds: u64,                    // Default: 30
    retry_attempts: u32,                     // Default: 3
    enable_websocket_collection: bool,       // Default: true
    enable_cpp_direct_calls: bool,           // Default: true
    enable_bacnet_collection: bool,          // Default: false
}
```

---

## Migration Guide

### If You Need Automated Collection:

#### Option A: Implement External Script
1. Create Python/Node.js script using template above
2. Use existing device communication libraries (BACnet, Modbus)
3. Call `/trendlog-data/realtime/batch` endpoint every N seconds
4. Deploy as systemd service or Windows service

#### Option B: Extend C++ T3000.exe
1. Add timer in C++ MainFrm
2. On timer tick, collect current point values
3. Call Rust API via HTTP POST
4. Advantage: Reuses existing device communication

#### Option C: Restore RealtimeDataService (Not Recommended)
1. Restore removed module from git history
2. Fix field name mismatches
3. Implement full config conversion
4. Test extensively
5. **Caution**: High complexity, maintenance burden

---

## Files Modified

### Routes File:
- **File**: `api/src/t3_device/routes.rs`
- **Removed**: Lines 1047-1228 (6 handler functions)
- **Removed**: Lines 1315-1320 (6 route registrations)

### State File:
- **File**: `api/src/app_state.rs`
- **Status**: `data_collector` field already commented out (lines 114, 131)
- **No Changes Needed**: Field was never enabled

### Module File:
- **File**: `api/src/t3_device/mod.rs`
- **Status**: `pub mod realtime_data_service;` already commented (per cleanup docs)
- **No Changes Needed**: Module already removed

---

## Testing Impact

### Removed Test Scenarios:
- Start collection service
- Stop collection service
- Query service status
- Update service config
- Trigger immediate collection
- Service lifecycle (startup, shutdown, restart)

### Remaining Test Scenarios (Valid):
- Manual data insertion via `/trendlog-data/realtime`
- Batch insertion via `/trendlog-data/realtime/batch`
- Historical data queries
- WebSocket broadcasting
- Database cleanup operations

---

## References

### Documentation:
- Original Design: `docs/t3000/1.TRENDLOG_DATABASE_DESIGN.md` (lines 530-544)
- Module Cleanup: `docs/project/MODULE_CLEANUP_2025-01.md` (lines 85, 102, 105)

### Related Code:
- FFI Bridge: `T3000-Source/T3000/BacnetWebView_Exports.cpp` (line 95)
- Data Service: `api/src/t3_device/trendlog_data_service.rs` (active, for manual insertion)
- Database Schema: `api/migration/sql/webview_t3_device_schema.sql`

### Frontend References:
- Database Management: `src/t3-vue/components/Database/DatabaseManagementPage.vue`
- TrendLog Pages: `src/t3-vue/pages/TrendLog/IndexPageSocket.vue`

---

## Conclusion

The data collection endpoints have been permanently removed as part of codebase cleanup. The system now relies on **manual data insertion** via existing API endpoints, which provides a simpler, more maintainable architecture. If automated collection is required in the future, implementing an external script or extending C++ T3000.exe are the recommended approaches.

**Current Working Data Flow**:
```
Device → T3000.exe (C++) → POST /trendlog-data/realtime → TRENDLOG_DATA table → Frontend
```

This approach is simpler, more reliable, and easier to maintain than the removed background service architecture.
