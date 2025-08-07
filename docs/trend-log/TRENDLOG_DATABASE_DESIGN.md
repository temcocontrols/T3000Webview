# T3000 Trendlog Database Design - Comprehensive Analysis & Solution

**Date:** August 7, 2025
**Branch:** feature/new-ui
**Status:** Design Phase - No Implementation Yet

---

## Executive Summary

This document provides a comprehensive solution for implementing historical data storage in the T3000 WebView system. Currently, the system only provides real-time data through WebView2/WebSocket messages. This design introduces a separate SQLite database specifically for trendlog historical data while preserving existing functionality.

---

## Current System Analysis

### 🏗️ Existing Architecture

```
T3000 C++ Application (Main Process)
├── Hardware Communication (BACnet/Modbus)
│   ├── INPUT Sensors: 64 points per device
│   ├── OUTPUT Actuators: 64 points per device
│   └── VARIABLE Points: 128 points per device
├── t3_webview_api.dll (Rust API Server)
│   ├── WebSocket Server: Port 9104
│   ├── HTTP API: Port 9103
│   └── Database: webview_database.db
└── Vue.js Frontend
    ├── Built-in WebView2 (embedded in T3000)
    ├── External Browser Support (http://localhost:9103)
    └── Real-time Communication Only
```

### 📊 Current Data Flow

```
Hardware Devices → T3000 C++ → Rust API → Vue Frontend
     ↑                ↑           ↑           ↑
BACnet/Modbus    Message Loop   WebSocket    Live Display
   Protocol                    HTTP API     (No History)
```

### 📁 Current Database Usage (webview_database.db)

**Purpose:** Modbus register management and configuration
- `modbus_register` - Modbus register definitions
- `modbus_register_devices` - Device registry
- `modbus_register_settings` - Configuration
- `user` - Authentication data
- `files` - File management

**⚠️ Recent Trendlog Changes to Rollback:**
- `m20250122_000000_data_management_schema.rs` migration
- Data management entities in `api/src/entity/data_management/`
- Any trendlog-related tables added since July 28, 2025

---

## Hardware Architecture Analysis

### 🏭 T3000 Device Points Structure

| Point Type | Count | Description | Examples |
|------------|-------|-------------|----------|
| INPUT | 64 | Physical sensors | Temperature, Pressure, Flow |
| OUTPUT | 64 | Actuators/Controls | Valves, Dampers, Fans |
| VARIABLE | 128 | Calculated/Stored | Setpoints, Calculations |
| PID | 16 | Control loops | HVAC control algorithms |
| MON | 16 | Monitor configs | Trendlog schedules |

### ⏱️ Trendlog Timebase System

Based on T3000 C++ source code analysis:

| Timebase | Constant | Interval | Use Case |
|----------|----------|----------|----------|
| 0 | TIME_ONE_MINUTE | 1 minute | Critical monitoring |
| 1 | TIME_FIVE_MINUTE | 5 minutes | Standard monitoring |
| 2 | TIME_TEN_MINUTE | 10 minutes | Normal operations |
| 3 | TIME_THIRTY_MINUTE | 30 minutes | Energy monitoring |
| 4 | TIME_ONE_HOUR | 1 hour | Daily trends |
| 5 | TIME_FOUR_HOUR | 4 hours | Long-term patterns |
| 6 | TIME_TWELVE_HOUR | 12 hours | Daily summaries |
| 7 | TIME_ONE_DAY | 1 day | Weekly trends |
| 8 | TIME_FOUR_DAY | 4 days | Monthly analysis |

---

## Current Trendlog Implementation Analysis

### 🖥️ Frontend Components
- `TrendLogChart.vue` - Main chart component with real-time data
- `TrendLogModal.vue` - Modal interface for configuration
- `TrendLogDashboard.vue` - Dashboard view
- `TrendLogLayout.vue` - Page layout structure

### 🔌 Communication Methods
1. **Built-in WebView2** - Direct C++ to JavaScript messages
2. **External Browser** - WebSocket client (Port 9104)
3. **HTTP API** - REST endpoints (Port 9103)

### ⚡ Current Limitations
- **No Historical Storage** - Only real-time data display
- **Performance Issues** - Continuous live data fetching
- **No Offline Access** - Requires T3000 running
- **Limited Analysis** - No trend analysis capabilities

---

## New Trendlog Database Design

### 🗃️ Database Separation Strategy

```
EXISTING: webview_database.db (Keep Unchanged)
├── modbus_register          -- Modbus register definitions
├── modbus_register_devices  -- Device registry
├── modbus_register_settings -- Configuration
├── user                     -- Authentication
└── files                    -- File management

NEW: trendlog_database.db (Separate Database)
├── devices                  -- Device registry (independent)
├── points                   -- Point definitions
├── trend_data               -- Historical time-series data
├── trend_configs            -- Collection schedules
├── retention_policies       -- Data cleanup rules
└── collection_status        -- Background service status
```

### 📋 Database Schema Design

#### 1. Devices Table
```sql
CREATE TABLE devices (
    device_id INTEGER PRIMARY KEY,
    serial_number INTEGER UNIQUE NOT NULL,
    device_name TEXT,
    device_type TEXT DEFAULT 'T3-BB',
    ip_address TEXT,
    bacnet_instance INTEGER,
    is_active INTEGER DEFAULT 1,
    last_seen DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 2. Points Table
```sql
CREATE TABLE points (
    point_id INTEGER PRIMARY KEY,
    device_id INTEGER NOT NULL,
    point_type TEXT NOT NULL,     -- 'INPUT', 'OUTPUT', 'VARIABLE', 'PID'
    point_index INTEGER NOT NULL,
    point_name TEXT,
    description TEXT,
    unit_type INTEGER,
    data_type TEXT,               -- 'ANALOG', 'DIGITAL'
    is_monitored INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (device_id) REFERENCES devices(device_id),
    UNIQUE(device_id, point_type, point_index)
);
```

#### 3. Trend Data Table (Time-series Core)
```sql
CREATE TABLE trend_data (
    id INTEGER PRIMARY KEY,
    point_id INTEGER NOT NULL,
    timestamp DATETIME NOT NULL,
    value REAL NOT NULL,
    quality INTEGER DEFAULT 1,    -- Data quality (1=good, 0=suspect)
    collection_source TEXT,       -- 'BACNET', 'MODBUS', 'MANUAL'
    timebase_interval INTEGER,    -- Original timebase used
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (point_id) REFERENCES points(point_id)
);

-- Performance Indexes for Time-series Queries
CREATE INDEX idx_trend_data_point_time ON trend_data(point_id, timestamp);
CREATE INDEX idx_trend_data_timestamp ON trend_data(timestamp);
CREATE INDEX idx_trend_data_recent ON trend_data(point_id, timestamp DESC);
```

#### 4. Trend Configurations Table
```sql
CREATE TABLE trend_configs (
    config_id INTEGER PRIMARY KEY,
    device_id INTEGER NOT NULL,
    config_name TEXT NOT NULL,
    timebase_type INTEGER NOT NULL,    -- 0-8 (TIME_ONE_MINUTE to TIME_FOUR_DAY)
    collection_interval INTEGER NOT NULL, -- seconds
    max_points INTEGER DEFAULT 14,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (device_id) REFERENCES devices(device_id)
);
```

#### 5. Config Point Mappings Table
```sql
CREATE TABLE trend_config_points (
    mapping_id INTEGER PRIMARY KEY,
    config_id INTEGER NOT NULL,
    point_id INTEGER NOT NULL,
    is_active INTEGER DEFAULT 1,
    collection_priority INTEGER DEFAULT 1,
    FOREIGN KEY (config_id) REFERENCES trend_configs(config_id),
    FOREIGN KEY (point_id) REFERENCES points(point_id),
    UNIQUE(config_id, point_id)
);
```

---

## Data Collection Strategy

### 🔄 Background Collection Service (Rust)

```rust
// Proposed architecture for background data collection
pub struct TrendlogCollector {
    database: SqlitePool,
    bacnet_client: BacnetClient,
    collection_configs: Vec<TrendConfig>,
    scheduler: CronScheduler,
}

impl TrendlogCollector {
    // Collect data based on timebase intervals
    async fn collect_trend_data(&self, config: &TrendConfig) -> Result<()> {
        // 1. Read BACnet data in bulk (up to 14 points)
        let readings = self.bacnet_client
            .read_multiple_properties(&config.points)
            .await?;

        // 2. Store to database with timestamp
        for reading in readings {
            self.store_trend_point(reading, config.timebase_type).await?;
        }

        Ok(())
    }
}
```

### 🕐 Collection Scheduling

```
Timebase Schedule (Background Service):
├── 1-5 minute intervals  → High priority queue
├── 10-30 minute intervals → Medium priority queue
├── 1-12 hour intervals   → Low priority queue
└── 1-4 day intervals     → Archive queue
```

### 📊 Data Retention Strategy

```sql
-- Retention Policies Table
CREATE TABLE retention_policies (
    policy_id INTEGER PRIMARY KEY,
    timebase_type INTEGER,
    retention_days INTEGER,
    compression_enabled INTEGER DEFAULT 0,
    archive_enabled INTEGER DEFAULT 0
);

-- Example Policies
INSERT INTO retention_policies VALUES
(1, 0, 30, 0, 1),    -- 1 min: 30 days, then archive
(2, 1, 90, 0, 1),    -- 5 min: 90 days, then archive
(3, 2, 365, 1, 1),   -- 10 min: 1 year with compression
(4, 7, -1, 1, 0);    -- 1 day: keep forever with compression
```

---

## T3000 Folder Structure Integration

### 📁 Following T3000 Conventions

Based on T3000 architecture analysis:

```
T3000_Building_Automation_System/
├── T3000/
│   ├── ResourceFile/           -- Database structure files
│   │   ├── trendlog_schema.sql -- Schema definition
│   │   └── webview/           -- Web components
│   └── Database/              -- Real data storage
│       ├── webview_database.db -- Existing (keep unchanged)
│       └── trendlog_database.db -- New historical data
```

### 🛠️ Database Creation Strategy

1. **Schema Definition** → `ResourceFile/trendlog_schema.sql`
2. **Database Creation** → `Database/trendlog_database.db`
3. **Migration System** → Rust API handles schema updates
4. **Backup System** → Daily/weekly automated backups

---

## API Endpoints Design

### 📡 Historical Data Access

```rust
// Historical data retrieval
GET /api/trendlog/data/{device_id}/{point_type}/{point_index}
    ?start_time=2025-08-01T00:00:00Z
    &end_time=2025-08-07T23:59:59Z
    &resolution=auto

// Bulk historical data for multiple points
POST /api/trendlog/data/bulk
{
    "device_id": 199,
    "points": [
        {"type": "INPUT", "index": 1},
        {"type": "VARIABLE", "index": 5}
    ],
    "time_range": {
        "start": "2025-08-01T00:00:00Z",
        "end": "2025-08-07T23:59:59Z"
    },
    "resolution": "10min"
}
```

### ⚙️ Configuration Management

```rust
// Trend configuration management
GET /api/trendlog/configs/{device_id}
PUT /api/trendlog/configs/{device_id}/{config_id}
POST /api/trendlog/configs/{device_id}

// Background service status
GET /api/trendlog/status
POST /api/trendlog/control/{action}  // start, stop, restart
```

---

## Frontend Integration Strategy

### 🖥️ Enhanced Chart Components

```typescript
// Combined data service (historical + real-time)
class TrendlogDataService {
    async getHistoricalData(deviceId, pointType, pointIndex, timeRange) {
        // Query trendlog_database via new API
        return await fetch(`/api/trendlog/data/${deviceId}/${pointType}/${pointIndex}`, {
            method: 'GET',
            params: timeRange
        });
    }

    async getCurrentData(deviceId, pointType, pointIndex) {
        // Query current WebSocket/WebView2 data (existing)
        return await this.webSocketClient.getCurrentValue(deviceId, pointType, pointIndex);
    }

    async getCombinedView(deviceId, pointType, pointIndex, timeRange) {
        // Combine historical + real-time data
        const historical = await this.getHistoricalData(deviceId, pointType, pointIndex, timeRange);
        const current = await this.getCurrentData(deviceId, pointType, pointIndex);
        return this.mergeDatasets(historical, current);
    }
}
```

### 📋 Admin Dashboard Features

```vue
<!-- New Admin Dashboard Component -->
<template>
  <div class="trendlog-admin">
    <!-- Collection Status -->
    <a-card title="Data Collection Status">
      <a-table :columns="statusColumns" :dataSource="collectionStatus" />
    </a-card>

    <!-- Storage Usage -->
    <a-card title="Database Storage">
      <a-progress :percent="storageUsage.percent" />
      <p>{{ storageUsage.size }} / {{ storageUsage.total }}</p>
    </a-card>

    <!-- Configuration Management -->
    <a-card title="Trend Configurations">
      <a-button @click="createTrendConfig">Add New Configuration</a-button>
      <a-table :columns="configColumns" :dataSource="trendConfigs" />
    </a-card>
  </div>
</template>
```

---

## Implementation Strategy

### 🚀 Phase 0: Rollback & Cleanup (Priority 1)

```bash
# 1. Remove recent trendlog changes from webview_database.db
git show cbf16f7b --name-only  # Identify files to rollback

# 2. Remove data management migration
rm api/migration/src/m20250122_000000_data_management_schema.rs

# 3. Evaluate data_management entities
# Keep useful code, adapt for separate database

# 4. Preserve webview_database.db original functionality
# - modbus_register management
# - user authentication
# - file management
```

### 📅 Phase 1: New Database Foundation (Week 1-2)

- [ ] Create `trendlog_database.db` schema
- [ ] Implement basic Rust entities and migrations
- [ ] Set up database connection management
- [ ] Create initial API endpoints

### 📅 Phase 2: Background Collection Service (Week 3-4)

- [ ] BACnet bulk data collection service
- [ ] Scheduled collection based on timebase
- [ ] Error handling and retry logic
- [ ] Data validation and quality tracking

### 📅 Phase 3: API & Frontend Integration (Week 5-6)

- [ ] Historical data query endpoints
- [ ] Frontend chart component updates
- [ ] Combined real-time + historical views
- [ ] Performance optimization

### 📅 Phase 4: Admin Dashboard & Management (Week 7-8)

- [ ] Admin dashboard for database management
- [ ] Configuration management UI
- [ ] Data export and backup tools
- [ ] Monitoring and alerting system

---

## Technical Considerations

### 📈 Performance Requirements

- **Data Volume:** ~20 devices × 256 points × 8760 hours/year = ~45M records/year
- **Query Performance:** Sub-200ms for typical historical queries
- **Collection Efficiency:** 95%+ successful data collection rate
- **Storage Growth:** ~10-20GB per year with retention policies

### 🔧 Rust vs C# BACnet Implementation

**Recommendation: Rust Implementation**

| Aspect | Rust | C# |
|--------|------|-----|
| Integration | ✅ Native DLL for T3000 | ⚠️ Additional runtime dependency |
| Performance | ✅ Zero-cost abstractions | ⚠️ GC overhead |
| Memory Safety | ✅ Compile-time guarantees | ⚠️ Runtime checks |
| Existing Codebase | ✅ Builds on current API | ❌ Separate service required |

### 🛡️ Data Integrity & Backup

```sql
-- Database integrity checks
PRAGMA foreign_key_check;
PRAGMA integrity_check;

-- Automated backup strategy
-- Daily: Incremental backup of new data
-- Weekly: Full database backup
-- Monthly: Archive old data with compression
```

---

## Risk Assessment & Mitigation

### ⚠️ High Risk Areas

1. **Data Loss During Collection**
   - *Mitigation:* Redundant collection, immediate backup

2. **Performance Impact on T3000**
   - *Mitigation:* Background service with priority queues

3. **Database Corruption**
   - *Mitigation:* WAL mode, regular integrity checks

4. **Storage Space Exhaustion**
   - *Mitigation:* Automated retention policies, monitoring

### 🔒 Security Considerations

- **Database Encryption:** SQLite encryption for sensitive data
- **API Authentication:** Secure endpoints with rate limiting
- **Access Control:** Role-based access to historical data
- **Audit Logging:** Track all data access and modifications

---

## Access Methods

### 🌐 Built-in Edge Browser
- Direct WebView2 integration with T3000
- Native C++ to JavaScript communication
- Optimal performance for embedded use

### 🌍 External Browser Support
- HTTP API access via localhost:9103
- WebSocket real-time communication
- Full feature parity with built-in browser

---

## Next Steps & Confirmation

### ✅ Design Review Required

This comprehensive design addresses all requirements:

1. ✅ **Separate Database** - New `trendlog_database.db` independent of `webview_database.db`
2. ✅ **BACnet Collection** - Background service with bulk data retrieval
3. ✅ **Performance Solution** - Reduces live data fetching load
4. ✅ **Historical Storage** - Years of data with retention policies
5. ✅ **Admin Dashboard** - Database management and monitoring
6. ✅ **T3000 Integration** - Follows existing folder structure
7. ✅ **Dual Access** - Built-in browser + external browser support
8. ✅ **Rollback Strategy** - Clean separation from existing system

### 🔍 Ready for Confirmation

**Please review this design and confirm:**

1. **Database separation approach** - Is this the right strategy?
2. **BACnet collection service** - Should this be in Rust or C#?
3. **Timebase integration** - Are the T3000 constants correctly mapped?
4. **Performance targets** - Are the metrics realistic?
5. **Implementation timeline** - Is 8 weeks reasonable?

**Once confirmed, implementation will proceed phase by phase with regular checkpoints.**

---

*This design document represents a complete solution ready for implementation. All technical details have been carefully considered based on the existing T3000 architecture and requirements.*
