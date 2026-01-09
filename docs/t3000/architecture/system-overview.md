# T3000 WebView System Architecture

## Overview

The T3000 WebView is a modern web-based building automation system that provides real-time monitoring and control of HVAC devices through a hybrid desktop/web architecture.

**Architecture Type:** Hybrid Desktop Application with Web Frontend
**Technology Stack:** Rust Backend + Vue.js/React Frontend + SQLite Database
**Communication:** BACnet Protocol + WebSocket + REST API

---

## System Components

### 1. Frontend Layer (Client)
```
┌─────────────────────────────────────────┐
│         Web Browser / WebView           │
│  ┌──────────────┐  ┌─────────────────┐ │
│  │  Vue.js App  │  │  React Modules  │ │
│  │  (Main UI)   │  │  (Database,etc) │ │
│  └──────────────┘  └─────────────────┘ │
│         │                    │          │
│    ┌────▼────────────────────▼─────┐   │
│    │   Quasar Framework (SPA)      │   │
│    └───────────────────────────────┘   │
└─────────────────────────────────────────┘
         │ HTTP/WS
         ▼
```

### 2. Backend Layer (Rust API Server)
```
┌─────────────────────────────────────────┐
│       Axum HTTP Server (:9103)          │
│  ┌────────────────────────────────────┐ │
│  │  REST API Routes                   │ │
│  │  - /api/t3_device/*                │ │
│  │  - /api/database/*                 │ │
│  │  - /api/develop/*                  │ │
│  └────────────────────────────────────┘ │
│  ┌────────────────────────────────────┐ │
│  │  WebSocket Manager                 │ │
│  │  - Real-time device updates        │ │
│  │  - Control message handling        │ │
│  └────────────────────────────────────┘ │
│  ┌────────────────────────────────────┐ │
│  │  BACnet FFI Layer (C++ Bridge)     │ │
│  │  - bacnet_ffi.dll                  │ │
│  │  - Device communication            │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
         │
         ▼
```

### 3. Data Layer
```
┌─────────────────────────────────────────┐
│         SQLite Databases                │
│  ┌────────────────────────────────────┐ │
│  │  T3000.db (Main Configuration)     │ │
│  │  - panels, devices                 │ │
│  │  - settings, users                 │ │
│  └────────────────────────────────────┘ │
│  ┌────────────────────────────────────┐ │
│  │  webview_t3_device.db              │ │
│  │  - Device data cache               │ │
│  │  - Inputs, outputs, variables      │ │
│  └────────────────────────────────────┘ │
│  ┌────────────────────────────────────┐ │
│  │  T3000_Trendlog.db                 │ │
│  │  - Historical trend data           │ │
│  │  - Time-series records             │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
         │
         ▼
```

### 4. Device Layer
```
┌─────────────────────────────────────────┐
│     Physical BACnet Devices             │
│  ┌──────┐  ┌──────┐  ┌──────┐          │
│  │ T3-BB│  │ T3-TB│  │ T3-LB│  ...     │
│  └──────┘  └──────┘  └──────┘          │
│       BACnet/IP Protocol                │
└─────────────────────────────────────────┘
```

---

## Data Flow: Device Loading

### Initial Scan Flow

```
┌──────────────┐
│  User Opens  │
│  WebView App │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────┐
│  1. Frontend Initialization          │
│     - Load Vue.js application        │
│     - Connect WebSocket              │
│     - Request device list            │
└──────┬───────────────────────────────┘
       │ HTTP GET /api/t3_device/scan_network
       ▼
┌──────────────────────────────────────┐
│  2. Backend API Handler              │
│     - Receive scan request           │
│     - Call FFI function              │
│     scan_network_for_devices()       │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  3. BACnet FFI Layer (C++)           │
│     - Broadcast Who-Is               │
│     - Listen for I-Am responses      │
│     - Parse device properties        │
│     - Return device list             │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  4. Database Storage                 │
│     - Insert/Update panels table     │
│     - Create device records          │
│     - Cache device metadata          │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  5. Frontend Update                  │
│     - Receive device list JSON       │
│     - Update Vue store               │
│     - Render device tree UI          │
└──────────────────────────────────────┘
```

### Device Data Loading Flow

```
User Clicks Device
       │
       ▼
┌──────────────────────────────────────┐
│  Frontend: SELECT_PANEL              │
│     action: 1                        │
│     panelId, serialNumber            │
└──────┬───────────────────────────────┘
       │ WebSocket Message
       ▼
┌──────────────────────────────────────┐
│  Backend: Message Handler            │
│     - Parse control message          │
│     - Route to panel_handler()       │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  FFI: Read Device Data               │
│     - Connect to device IP           │
│     - Read BACnet objects            │
│       * Inputs (AI/BI)               │
│       * Outputs (AO/BO)              │
│       * Variables (AV)               │
│       * Programs, Schedules, etc     │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Database: Cache Update              │
│     - Write to webview_t3_device.db  │
│     - Update inputs, outputs tables  │
│     - Store with objectinstance      │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Frontend: Display Data              │
│     - WebSocket broadcast            │
│     - UPDATE_WEBVIEW_LIST            │
│     - Render tables/grids            │
└──────────────────────────────────────┘
```

---

## Communication Protocols

### 1. Frontend ↔ Backend

**REST API (HTTP)**
- Device scanning
- Configuration management
- Database queries
- File operations

**WebSocket (Real-time)**
- Control messages (action-based)
- Live data updates
- Device status changes
- Trend data streaming

### 2. Backend ↔ Devices

**BACnet/IP Protocol**
- Who-Is / I-Am (device discovery)
- Read-Property (data retrieval)
- Write-Property (control commands)
- Subscribe-COV (change notifications)

---

## Control Message System

### Message Structure
```json
{
  "action": <number>,
  "source": 0|1,          // 0=T3000, 1=WebUI
  "panelId": <number>,
  "serialNumber": <number>,
  "entryType": <number>,
  "data": { ... }
}
```

### Common Actions
| Action | Name | Purpose |
|--------|------|---------|
| 1 | SELECT_PANEL | Load device data |
| 2 | SAVE_ENTRY | Write single value |
| 16 | UPDATE_WEBVIEW_LIST | Bulk write |
| 17 | READ_SINGLE_ENTRY | Read one entry |

---

## Database Schema

### T3000.db
```sql
-- Device registration
panels (
  id, serial_number, product_name,
  ip_address, port, location
)

-- User management
users (
  id, username, password_hash, role
)

-- System settings
application_settings (
  key, value, category
)
```

### webview_t3_device.db
```sql
-- Device data cache
inputs (
  id, panel_id, number, label,
  value, units, auto_manual
)

outputs (
  id, panel_id, number, label,
  value, auto_manual, range
)

variables (
  id, panel_id, number, label,
  value, units, auto_manual
)
```

---

## Deployment Architecture

### Development Mode
```
Frontend (Quasar Dev Server)
  ↓ Port 3004
  ↓ Proxy to backend
Backend (Rust cargo run)
  ↓ Port 9103
  ↓ SQLite files in ./Database
Devices (Local network)
```

### Production Mode
```
Electron/Tauri Desktop App
  ├── Bundled Frontend (SPA)
  ├── Embedded Rust Backend
  └── SQLite in %AppData%/T3000
       ↓
  BACnet Network
```

---

## Key Design Patterns

### 1. Event-Driven Architecture
- WebSocket for real-time updates
- Publisher/subscriber pattern
- Async/await for non-blocking I/O

### 2. Caching Strategy
- Database cache for offline access
- In-memory state for active devices
- Background sync with physical devices

### 3. State Management
- Frontend: Vue Pinia stores
- Backend: Rust Arc<Mutex<T>> for shared state
- Database: SQLite transactions

### 4. Error Handling
- Frontend: Try-catch with user notifications
- Backend: Result<T, E> with proper propagation
- FFI: Safe error conversion across boundaries

---

## Performance Considerations

### Optimization Points
1. **Device Scanning**: Parallel network scans
2. **Data Loading**: Batch reads via bulk messages
3. **UI Updates**: Debounced re-renders
4. **Database**: Indexed queries on objectinstance
5. **WebSocket**: Message compression for large datasets

### Scalability Limits
- Max devices per network: ~250 (BACnet limitation)
- Max concurrent connections: ~100 WebSocket clients
- Database size: Tested up to 10GB trendlog data

---

## Security Model

### Authentication
- User login with bcrypt password hashing
- Session tokens for API access
- Role-based permissions (admin/user)

### Network Security
- BACnet authentication (optional)
- HTTPS for production deployment
- CORS configuration for web access

---

## Future Enhancements

### Planned Features
1. **Cloud Sync**: Multi-site management
2. **Mobile App**: React Native companion
3. **AI Analytics**: Predictive maintenance
4. **RESTful BACnet**: Bridge to cloud services

### Technical Debt
1. Migrate from mixed Vue/React to single framework
2. Implement GraphQL for flexible data queries
3. Add comprehensive integration tests
4. Improve FFI error handling with detailed codes

---

## Getting Started for Developers

### Prerequisites
```bash
# Rust toolchain
rustup install stable

# Node.js & npm
nvm install 18

# Quasar CLI
npm install -g @quasar/cli
```

### Development Setup
```bash
# 1. Start backend
cd api
cargo run

# 2. Start frontend
npm run client-dev

# 3. Access UI
open http://localhost:3004
```

### Project Structure
```
T3000Webview9/
├── api/              # Rust backend
│   ├── src/
│   │   ├── t3_device/     # Device management
│   │   ├── t3_develop/    # Developer tools
│   │   └── database_management/
│   └── build/        # FFI build outputs
├── src/              # Frontend source
│   ├── t3-vue/       # Vue components
│   └── t3-react/     # React modules
├── docs/             # Documentation
└── Database/         # SQLite files
```

---

## Troubleshooting Guide

### Common Issues

**Device not detected**
- Check BACnet router configuration
- Verify IP subnet matches
- Ensure Who-Is broadcasts are allowed

**WebSocket disconnects**
- Increase timeout in backend config
- Check firewall settings on port 9103
- Verify network stability

**Database locked errors**
- Only one writer at a time (SQLite limitation)
- Use WAL mode for concurrent reads
- Close connections properly in code

---

## References

- [BACnet Protocol Standard](http://www.bacnet.org/)
- [Axum Web Framework](https://github.com/tokio-rs/axum)
- [Quasar Framework](https://quasar.dev/)
- [SQLite Documentation](https://www.sqlite.org/docs.html)
