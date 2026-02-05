# T3000 WebView FFI Service Flow - Complete Analysis

**Date:** October 31, 2025
**Purpose:** Testing & Development Reference
**Status:** Production Analysis

---

## 📊 Quick Reference Diagrams

### 1. Simple Overview - The Big Picture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER BROWSER                                │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  Vue.js Frontend (Quasar)                                   │    │
│  │  - IndexPage2.vue                                           │    │
│  │  - TrendLogChart.vue                                        │    │
│  │  - DeviceInfo2.vue                                          │    │
│  └────────────────────────────────────────────────────────────┘    │
│           │                                    ▲                     │
│           │ WebSocket (ws://localhost:9104)   │                     │
│           │ HTTP REST (:9103)                  │                     │
│           ▼                                    │                     │
└─────────────────────────────────────────────────────────────────────┘
            │                                    │
┌───────────▼────────────────────────────────────┴───────────────────┐
│                    RUST BACKEND API SERVER                          │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  WebSocket Server (Port 9104)                                │  │
│  │  - Handles real-time messages                                │  │
│  │  - Broadcasts data updates                                   │  │
│  └──────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  HTTP Server (Port 9103)                                     │  │
│  │  - /api/t3-device/history (Trendlog queries)                 │  │
│  │  - /api/t3-device/devices (Device list)                      │  │
│  └──────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  T3 FFI Sync Service (Background)                            │  │
│  │  - Periodic data sync (every 15 min)                         │  │
│  │  - Device discovery (every 1 hour)                           │  │
│  └──────────────────────────────────────────────────────────────┘  │
│           │                                    ▲                     │
│           │ FFI Calls                          │                     │
│           │ HandleWebViewMsg()                 │                     │
│           ▼                                    │                     │
└─────────────────────────────────────────────────────────────────────┘
            │                                    │
┌───────────▼────────────────────────────────────┴───────────────────┐
│                      C++ T3000.exe                                  │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  BacnetWebView_HandleWebViewMsg(action, msg, len)            │  │
│  │  - Action 4:  GET_PANELS_LIST                                │  │
│  │  - Action 15: LOGGING_DATA (full device sync)                │  │
│  │  - Action 0:  GET_PANEL_DATA                                 │  │
│  │  - Action 3:  UPDATE_ENTRY                                   │  │
│  └──────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  T3000 Device Management                                     │  │
│  │  - Modbus/BACnet communication                               │  │
│  │  - Device registers & configurations                         │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
            │                                    ▲
            │ Protocol (Modbus/BACnet)          │
            ▼                                    │
┌─────────────────────────────────────────────────────────────────────┐
│                     PHYSICAL T3000 DEVICES                          │
│  - T3-BB Controllers                                                │
│  - T3-LB Controllers                                                │
│  - T3-Nano Controllers                                              │
│  - Input/Output/Variable Points                                    │
└─────────────────────────────────────────────────────────────────────┘

DATA FLOW: User → WebSocket → Rust API → FFI → C++ → Devices
RESPONSE:  Devices → C++ → FFI → Rust API → WebSocket → User
```

---

### 2. Professional Detailed Flow - Service Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          APPLICATION STARTUP SEQUENCE                           │
└─────────────────────────────────────────────────────────────────────────────────┘

T+0s: INITIALIZE
├─ Load T3000.exe FFI functions
│  └─ BacnetWebView_HandleWebViewMsg() loaded from T3000.exe
├─ Start HTTP Server (0.0.0.0:9103)
├─ Start WebSocket Server (0.0.0.0:9104)
└─ Spawn T3 FFI Sync Service

T+0s - T+10s: STARTUP DELAY ⏱️
├─ Purpose: Wait for T3000.exe to fully initialize
├─ Location: api/src/t3_device/t3_ffi_sync_service.rs:473
└─ Log: "⏱️ Waiting 10 seconds for T3000.exe to fully initialize..."

T+10s: IMMEDIATE SYNC (First-Time Only) 🚀
├─ Step 1: GET_PANELS_LIST (Device Discovery)
│  ├─ FFI Call: HandleWebViewMsg(action=4, msg="", len=0)
│  ├─ Timeout: 10 seconds
│  ├─ Location: api/src/t3_device/t3_ffi_sync_service.rs:1684-1744
│  ├─ Returns: JSON array of { panel_number, serial_number, panel_name }
│  └─ Log: T3WebLog/YYYY-MM/DDMM/initialize_DDMMHHMM.log
│
├─ Step 2: LOGGING_DATA (Full Device Sync) - For Each Device
│  ├─ FFI Call: HandleWebViewMsg(action=15, msg=panel_json, len=...)
│  ├─ Timeout: 30 seconds per device
│  ├─ Location: api/src/t3_device/t3_ffi_sync_service.rs:1511-1591
│  ├─ Returns: Complete device data with all points
│  ├─ Processing:
│  │  ├─ Parse JSON response (100-500ms)
│  │  ├─ Database Transaction (600-1400ms):
│  │  │  ├─ UPSERT device info
│  │  │  ├─ UPSERT input points (64 points)
│  │  │  ├─ UPSERT output points (32 points)
│  │  │  ├─ UPSERT variable points (128 points)
│  │  │  └─ INSERT trendlog records (historical data)
│  │  └─ Update sync metadata
│  ├─ Delay: 500ms before next device
│  └─ Log: T3WebLog/YYYY-MM/DDMM/ffi_DDMMHHMM.log
│
├─ Step 3: TRENDLOG CONFIG SYNC (One-Time)
│  ├─ Purpose: Sync trendlog configurations for all devices
│  ├─ Location: api/src/t3_device/t3_ffi_sync_service.rs:490-493
│  └─ Log: "📊 Syncing trendlog configurations for all devices..."
│
└─ Duration: ~150-180s for 5 devices

T+165s: ENTER PERIODIC SYNC LOOP ⏰
└─ Wait 900s (15 minutes) until next sync

┌─────────────────────────────────────────────────────────────────────────────────┐
│                          PERIODIC SYNC CYCLE (Every 15 min)                     │
└─────────────────────────────────────────────────────────────────────────────────┘

T+1065s (15 min): PERIODIC SYNC START 🔄
├─ Step 1: Reload Configuration from Database
│  ├─ Query: SELECT config_value FROM APPLICATION_CONFIG
│  │         WHERE config_key = 'ffi.sync_interval_secs'
│  ├─ Location: api/src/t3_device/t3_ffi_sync_service.rs:596-662
│  └─ Dynamic: Changes take effect immediately (no restart)
│
├─ Step 2: Check Rediscovery Needed?
│  ├─ Condition: Last rediscovery > 3600s (1 hour) ago
│  ├─ YES → Run GET_PANELS_LIST (full device scan)
│  └─ NO  → Use cached device list (skip discovery)
│
├─ Step 3: LOGGING_DATA Sync (Same as Immediate Sync)
│  └─ For each device in list (sequential processing)
│
└─ Wait 900s until next cycle

┌─────────────────────────────────────────────────────────────────────────────────┐
│                          REDISCOVERY CYCLE (Every 1 hour)                       │
└─────────────────────────────────────────────────────────────────────────────────┘

T+3600s (1 hour): REDISCOVERY SYNC 🔍
├─ Force GET_PANELS_LIST call
├─ Detect new/removed devices
├─ Update device cache
└─ Continue with LOGGING_DATA sync
```

---

### 3. WebSocket Message Flow - User Interaction

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│              USER CLICKS "RELOAD PANELS DATA" IN UI                             │
└─────────────────────────────────────────────────────────────────────────────────┘

[Vue Component: IndexPage2.vue]
    │
    │ @click="reloadPanelsData"
    ▼
[Function: reloadPanelsData()]
    │ Location: src/components/NewUI/IndexPage2.vue:445
    ▼
[WebSocketClient.GetPanelsList()]
    │ Location: src/lib/T3000/Hvac/Opt/Socket/WebSocketClient.ts:282
    │
    ├─ Format message: { action: 4, messageType: GET_PANELS_LIST }
    └─ ws.send(JSON.stringify(message))

        ▼ Network (localhost WebSocket)

[WebSocket Server: Port 9104]
    │ Location: api/src/t3_socket/server.rs:41-48
    │
    ├─ Parse incoming message
    ├─ Extract action code: 4
    └─ Route to handler

        ▼

[Handler: handle_websocket()]
    │ Location: api/src/t3_socket/server.rs
    │
    └─ Dispatch to C++ FFI call

        ▼

[FFI Call: get_panels_list_via_ffi()]
    │ Location: api/src/t3_device/t3_ffi_sync_service.rs:1684-1744
    │
    ├─ Timeout: 10 seconds
    ├─ Call: HandleWebViewMsg(4, "", 0)
    │
    │   ▼ C++ Function in T3000.exe
    │
    │   [BacnetWebView_HandleWebViewMsg]
    │       │
    │       ├─ Read g_DeviceList (global device array)
    │       ├─ Format JSON: { "data": [{ panel_number, serial_number, panel_name }] }
    │       └─ Return JSON string
    │
    │   ▲ Return to Rust
    │
    ├─ Parse JSON response
    ├─ Extract panel list
    └─ Return Result<Vec<PanelInfo>>

        ▼

[Broadcast to All Clients]
    │ Location: api/src/t3_socket/server.rs:382-422
    │
    ├─ Format response: { action: GET_PANELS_LIST_RES, data: [...] }
    └─ Send to all connected WebSocket clients

        ▼ Network (WebSocket broadcast)

[WebSocketClient.onMessage()]
    │ Location: src/lib/T3000/Hvac/Opt/Socket/WebSocketClient.ts:90
    │
    ├─ Parse incoming message
    ├─ Identify action: GET_PANELS_LIST_RES
    └─ Route to handler

        ▼

[HandleGetPanelsListRes()]
    │ Location: src/lib/T3000/Hvac/Opt/Socket/WebSocketClient.ts:607
    │
    ├─ Update state: T3000_Data.panelsList = msgData.data
    ├─ Set loading panel: T3000_Data.loadingPanel = 0
    └─ Auto-trigger: GetPanelData(firstPanelId)

        ▼

[Vue Reactivity Updates UI]
    │
    ├─ Display device list in dropdown
    ├─ Show loading indicator
    └─ User sees updated panel list

┌─────────────────────────────────────────────────────────────────────────────────┐
│                             TIMING BREAKDOWN                                    │
└─────────────────────────────────────────────────────────────────────────────────┘

T+0ms:    User clicks button
T+5ms:    WebSocket message sent
T+15ms:   Server receives message
T+20ms:   FFI call initiated
T+50ms:   T3000.exe processes request
T+100ms:  JSON response returned
T+120ms:  Rust parses response
T+130ms:  Broadcast to all clients
T+140ms:  Frontend receives message
T+150ms:  State updated
T+170ms:  UI re-renders

TOTAL: ~170ms (feels instant to user)
```

---

### 4. Database Transaction Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│              FFI SYNC: SINGLE DEVICE PROCESSING                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

[get_logging_data_via_direct_ffi(panel_id=1, serial=12345)]
    │
    ├─ FFI Call: HandleWebViewMsg(15, panel_json, len)
    ├─ Timeout: 30 seconds
    └─ Returns: JSON with device_info + input_points + output_points + variable_points

        ▼ (~5-15 seconds actual time)

[Parse JSON Response]
    │ Location: api/src/t3_device/t3_ffi_sync_service.rs:1545-1570
    │
    ├─ Parse device_info
    ├─ Parse input_points[] (64 points)
    ├─ Parse output_points[] (32 points)
    └─ Parse variable_points[] (128 points)

        ▼ (~100-500ms)

[BEGIN DATABASE TRANSACTION]
    │ Location: api/src/t3_device/t3_ffi_sync_service.rs:1100-1450
    │
    ├─ Step 1: UPSERT Device Info (~50ms)
    │  ├─ Table: DEVICES
    │  ├─ Check: SELECT * WHERE SerialNumber = 12345
    │  └─ Execute: INSERT OR REPLACE INTO DEVICES (...)
    │
    ├─ Step 2: UPSERT Input Points (~100-300ms)
    │  ├─ Table: INPUT_POINTS
    │  ├─ For each of 64 points:
    │  │  ├─ Check: SELECT * WHERE DeviceId=1 AND PointIndex=N
    │  │  └─ Execute: INSERT OR REPLACE INTO INPUT_POINTS (...)
    │  └─ Bulk operation optimized
    │
    ├─ Step 3: UPSERT Output Points (~50-150ms)
    │  └─ Same as input points (32 points)
    │
    ├─ Step 4: UPSERT Variable Points (~150-400ms)
    │  └─ Same as input points (128 points)
    │
    ├─ Step 5: INSERT Trendlog Records (~200-500ms)
    │  ├─ Table: TRENDLOG_DATA (parent records)
    │  │  ├─ Cache lookup first (ParentKey)
    │  │  ├─ If not cached: INSERT INTO TRENDLOG_DATA
    │  │  └─ Cache the parent_id
    │  │
    │  └─ Table: TRENDLOG_DATA_DETAIL (detail records)
    │     ├─ For each point (224 total: 64+32+128):
    │     │  └─ INSERT INTO TRENDLOG_DATA_DETAIL
    │     │      (parent_id, value, logging_time_fmt)
    │     └─ Historical data (never updated, always inserted)
    │
    └─ Step 6: Update Sync Metadata (~50ms)
       ├─ Table: TRENDLOG_DATA_SYNC_METADATA
       ├─ Record: last_sync_time, sync_status, point_counts
       └─ INSERT OR REPLACE INTO TRENDLOG_DATA_SYNC_METADATA (...)

[COMMIT TRANSACTION]
    │ (~50-100ms)
    └─ WAL mode ensures fast commit

        ▼

[Update Cache & Broadcast]
    │
    ├─ Update TrendlogParentCache (in-memory)
    └─ (Optional) Broadcast update via WebSocket

TOTAL TRANSACTION TIME: ~600-1400ms per device
```

---

## ⚙️ Configuration & Intervals

### Critical Timing Constants

| Parameter | Default | Location | Description |
|-----------|---------|----------|-------------|
| **STARTUP_DELAY** | 10s | `t3_ffi_sync_service.rs:473` | Initial delay before first FFI call |
| **SYNC_INTERVAL** | 900s (15min) | DB: `ffi.sync_interval_secs` | Periodic data sync frequency |
| **REDISCOVER_INTERVAL** | 3600s (1h) | DB: `ffi.rediscover_interval_secs` | Device discovery frequency |
| **FFI_TIMEOUT** | 30s | `t3_ffi_sync_service.rs:319` | LOGGING_DATA call timeout |
| **PANELS_TIMEOUT** | 10s | `t3_ffi_sync_service.rs:1697` | GET_PANELS_LIST timeout |
| **DEVICE_DELAY** | 500ms | `t3_ffi_sync_service.rs:803` | Delay between device syncs |
| **RETRY_ATTEMPTS** | 3 | `t3_ffi_sync_service.rs:319` | FFI call retry count |
| **CACHE_TTL** | 30s | `trendlog_data_service.rs` | History query cache lifetime |
| **DEBOUNCE_DELAY** | 300ms | Frontend | API call batching delay |

### Database Configuration

SQLite optimizations for performance:

```rust
// Connection Pool Settings
max_connections: 200
min_connections: 10
connection_lifetime: 300s
idle_timeout: 30s

// SQLite Pragmas
journal_mode: WAL                    // Write-Ahead Logging
wal_autocheckpoint: 10000           // 40MB before checkpoint
cache_size: -64000                  // 64MB cache
mmap_size: 268435456                // 256MB memory-mapped I/O
busy_timeout: 30000                 // 30s lock timeout
```

Location: `api/src/db_connection.rs:45-90`

---

## 📝 Log Files - Where to Check Details

### 1. FFI Sync Service Logs

**Location:** `T3WebLog/YYYY-MM/DDMM/`

#### Initialize Logs
- **Filename:** `initialize_DDMMHHMM.log`
- **Content:** Application startup, FFI function loading, server initialization
- **Example:**
  ```
  2025-10-31 14:30:00 - ✅ Found BacnetWebView_HandleWebViewMsg function
  2025-10-31 14:30:00 - 🚀 Starting T3000 LOGGING_DATA sync service
  2025-10-31 14:30:00 - ⏱️ Waiting 10 seconds for T3000.exe to fully initialize...
  ```

#### FFI Logs
- **Filename:** `ffi_DDMMHHMM.log`
- **Content:** FFI calls, device sync operations, trendlog insertions
- **Example:**
  ```
  2025-10-31 14:30:10 - 🏃 Performing immediate startup sync
  2025-10-31 14:30:15 - ✅ Got panels list - 5 devices discovered
  2025-10-31 14:30:20 - 📊 Syncing device 12345 (Panel 1: Chiller Plant)
  2025-10-31 14:30:35 - ✅ Device 12345 synced - 224 trendlog records inserted
  ```

#### WebSocket Logs
- **Filename:** `websocket_DDMMHHMM.log`
- **Content:** WebSocket connections, message routing, client management
- **Example:**
  ```
  2025-10-31 14:30:00 - 🌐 WebSocket server listening on 0.0.0.0:9104
  2025-10-31 14:30:05 - 📥 Client connected: 127.0.0.1:54321
  2025-10-31 14:30:10 - 📤 Broadcasting message to 3 clients
  ```

### 2. Database Query Logs

**Location:** `api/Database/` (SQLite database file)

- **File:** `webview_t3_device.db`
- **Tables to query:**
  ```sql
  -- Check sync status
  SELECT * FROM TRENDLOG_DATA_SYNC_METADATA
  ORDER BY LastSync_UTC DESC LIMIT 10;

  -- Check recent trendlog data
  SELECT * FROM TRENDLOG_DATA_DETAIL
  ORDER BY Id DESC LIMIT 100;

  -- Check device status
  SELECT SerialNumber, PanelName, Status, LastSync
  FROM DEVICES;
  ```

### 3. Frontend Console Logs

**Location:** Browser DevTools Console

- **WebSocket messages:**
  ```javascript
  = WS: GET PANELS LIST REQUEST - Sending WebSocket request
  = WS: PANEL DATA RESPONSE - Processing panel data from WebSocket
  = ws: HandleGetPanelsListRes / received data length: 5
  ```

### 4. HTTP API Logs

**Location:** Terminal/Console running Rust API

- **Example:**
  ```
  [2025-10-31T14:30:00Z INFO] HTTP server listening on 0.0.0.0:9103
  [2025-10-31T14:30:05Z INFO] GET /api/t3-device/history - 200 OK (523ms)
  [2025-10-31T14:30:10Z DEBUG] Query cache HIT - returning cached result
  ```

---

## 🔍 Key Functions Reference

### Rust Backend Functions

| Function | Location | Purpose | Timeout |
|----------|----------|---------|---------|
| `start_sync_service()` | `t3_ffi_sync_service.rs:444` | Start periodic sync loop | N/A |
| `sync_logging_data_static()` | `t3_ffi_sync_service.rs:817` | Main sync orchestrator | N/A |
| `get_panels_list_via_ffi()` | `t3_ffi_sync_service.rs:1684` | Device discovery FFI call | 10s |
| `get_logging_data_via_direct_ffi()` | `t3_ffi_sync_service.rs:1511` | Full device data FFI call | 30s |
| `save_device_and_points()` | `t3_ffi_sync_service.rs:1100` | Database UPSERT operation | N/A |
| `insert_trend_logs()` | `t3_ffi_sync_service.rs:1625` | Insert historical data | N/A |
| `reload_sync_interval_from_db()` | `t3_ffi_sync_service.rs:596` | Dynamic config reload | N/A |

### Frontend Functions

| Function | Location | Purpose |
|----------|----------|---------|
| `GetPanelsList()` | `WebSocketClient.ts:282` | Request device list |
| `GetPanelData()` | `WebSocketClient.ts:294` | Request panel data |
| `HandleGetPanelsListRes()` | `WebSocketClient.ts:607` | Process device list response |
| `HandleGetPanelDataRes()` | `WebSocketClient.ts:418` | Process panel data response |
| `sendMessage()` | `WebSocketClient.ts:200` | Send WebSocket message |
| `connect()` | `WebSocketClient.ts:42` | Establish WebSocket connection |

### C++ FFI Functions

| Function | Action Code | Purpose |
|----------|-------------|---------|
| `HandleWebViewMsg(4, ...)` | GET_PANELS_LIST | Return device list |
| `HandleWebViewMsg(15, ...)` | LOGGING_DATA | Return full device data |
| `HandleWebViewMsg(0, ...)` | GET_PANEL_DATA | Return panel graphics |
| `HandleWebViewMsg(3, ...)` | UPDATE_ENTRY | Update point value |

---

## 📈 Performance Metrics

### Expected Response Times

| Operation | Expected | Alert If > |
|-----------|----------|-----------|
| WebSocket message send | <50ms | >200ms |
| GET_PANELS_LIST | 1-5s | >10s |
| LOGGING_DATA (1 device) | 5-15s | >30s |
| Database transaction | 0.6-1.4s | >3s |
| History API query (cached) | <50ms | >200ms |
| History API query (uncached) | 0.5-2s | >5s |
| FFI call success rate | >95% | <90% |

### Monitoring Commands

```bash
# Check sync service status
tail -f T3WebLog/2025-10/3110/ffi_311014*.log

# Monitor WebSocket connections
tail -f T3WebLog/2025-10/3110/websocket_311014*.log

# Check database size
ls -lh api/Database/webview_t3_device.db

# Count recent trendlog records
sqlite3 api/Database/webview_t3_device.db "SELECT COUNT(*) FROM TRENDLOG_DATA_DETAIL WHERE Id > (SELECT MAX(Id) - 10000 FROM TRENDLOG_DATA_DETAIL);"
```

---

## 🛠️ Troubleshooting Guide

### Issue: Slow Initial Sync

**Symptoms:**
- Takes >3 minutes to load device data
- Frontend shows loading indicator for extended time

**Check:**
1. FFI log: `T3WebLog/.../ffi_*.log`
   - Look for: "❌ FFI call timeout" or "FFI call failed"
2. Database transaction times
   - Look for: "Database transaction took XXXXms"

**Solutions:**
- Increase FFI timeout in config
- Check T3000.exe is running and responsive
- Verify network connectivity to devices

### Issue: Missing Trendlog Data

**Symptoms:**
- History API returns empty array
- Charts show "No data available"

**Check:**
1. Database query:
   ```sql
   SELECT COUNT(*) FROM TRENDLOG_DATA_DETAIL
   WHERE LoggingTime_Fmt > datetime('now', '-1 day');
   ```
2. Sync metadata:
   ```sql
   SELECT * FROM TRENDLOG_DATA_SYNC_METADATA
   ORDER BY LastSync_UTC DESC LIMIT 5;
   ```

**Solutions:**
- Verify sync service is running
- Check FFI logs for insert errors
- Manually trigger sync via API

### Issue: WebSocket Connection Failed

**Symptoms:**
- Browser console: "WebSocket connection failed"
- UI shows "Load device data failed"

**Check:**
1. WebSocket server status:
   ```bash
   netstat -an | grep 9104
   ```
2. Firewall rules for port 9104

**Solutions:**
- Restart Rust API server
- Check Windows Firewall settings
- Verify localhost is not blocked

---

## 📚 Additional Resources

### Code Locations (Quick Reference)

```
api/src/
├── lib.rs (Line 146-247)              # Service startup
├── t3_device/
│   ├── t3_ffi_sync_service.rs         # Main FFI sync logic
│   │   ├── Line 444-497: start_sync_service()
│   │   ├── Line 817-1050: sync_logging_data_static()
│   │   ├── Line 1511-1591: get_logging_data_via_direct_ffi()
│   │   └── Line 1684-1744: get_panels_list_via_ffi()
│   ├── trendlog_data_service.rs       # History API queries
│   └── websocket_handler.rs           # WebSocket message handling
├── t3_socket/
│   └── server.rs                      # WebSocket server
└── db_connection.rs                   # Database configuration

src/lib/T3000/Hvac/Opt/Socket/
└── WebSocketClient.ts                 # Frontend WebSocket client
    ├── Line 42-68: connect()
    ├── Line 200-263: sendMessage()
    ├── Line 282-303: GetPanelsList()
    └── Line 607-654: HandleGetPanelsListRes()

src/components/NewUI/
├── IndexPage2.vue                     # Main UI
└── TrendLogChart.vue                  # Chart component
```

---

## 🎯 Summary

This document provides complete visibility into the T3000 WebView FFI service architecture for testing and development. Key takeaways:

1. **Startup:** 10-second delay → Immediate sync → Periodic sync loop
2. **Intervals:** 15 minutes (sync), 1 hour (rediscovery), configurable via database
3. **Flow:** Vue → WebSocket → Rust API → FFI → C++ T3000.exe → Devices
4. **Logs:** `T3WebLog/` directory contains all service logs with timestamps
5. **Performance:** ~6-17s per device, ~170ms for user interactions

**Last Updated:** October 31, 2025
**Version:** 1.0
**Maintainer:** T3000 Development Team
