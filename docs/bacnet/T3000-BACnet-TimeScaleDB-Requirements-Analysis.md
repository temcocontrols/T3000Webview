# T3000 BACnet SQLite Integration - Requirements Analysis

**Date:** July 29, 2025
**Project:** T3000 Webview BACnet Data Polling System
**Repository:** temcocontrols/T3000Webview
**Branch:** feature/new-ui

## Executive Summary

This document analyzes the requirements for implementing a new data polling system that will replace Temco's proprietary trend log structures with standard BACnet polling methods, integrating with SQLite for data archiving and visualization.

## Current System Analysis

### Existing T3000 Data Collection
- **Current Method:** Temco proprietary trend log structures
- **Limitations:**
  - Not standardized
  - Requires specific Temco protocols
  - Limited interoperability
  - Dependency on proprietary systems

### Transition Requirements
- **Target:** Standard BACnet protocol implementation
- **Goal:** Reduce dependency on proprietary systems
- **Benefit:** Improved compatibility and reduced overhead

## Core Requirements Analysis

### 1. Database Infrastructure Requirements

#### SQLite Integration
```
Primary Requirements:
- Install and configure SQLite (embedded database)
- Design schema for IoT time-series data
- Handle high-frequency data ingestion
- Optimize for time-based queries
- Support real-time and historical data access
```

#### Data Storage Schema
```
Required Data Points:
- All Analog Inputs (AI)
- All Analog Outputs (AO)
- All Digital Inputs (DI)
- All Digital Outputs (DO)
- Timestamp information
- Device identification
- Point names and metadata
```

### 2. BACnet Protocol Implementation

#### Standard BACnet Operations
```
Core BACnet Requirements:
- Device discovery and enumeration
- Object identification and reading
- Block reading capabilities (preferred)
- Individual point reading (fallback)
- Error handling and retry logic
- Connection management
```

#### Polling Strategy
```
Polling Priorities:
1. Block Reading (Primary Method)
   - Reduced network overhead
   - Improved efficiency
   - Multiple points per request

2. Individual Polling (Fallback)
   - For devices without block support
   - Point-by-point data collection
   - Higher overhead but universal compatibility
```

### 3. Device Management Requirements

#### Device Discovery
```
Discovery Process:
- Automated device scanning
- Device capability assessment
- Block read support detection
- Object enumeration
- Point mapping and cataloging
```

#### Device Compatibility
```
Support Matrix:
- All BACnet compliant devices
- T3-ESP controllers (primary target)
- Legacy T3000 devices
- Third-party BACnet devices
- Mixed-vendor environments
```

### 4. Data Collection Architecture

#### Polling System Design
```
Step 1: Device Discovery
- Scan network for BACnet devices
- Get device list from configuration
- Identify device capabilities
- Map available objects

Step 2: Data Polling
- Implement block reads where supported
- Fallback to individual reads
- Handle different data types
- Manage polling frequencies

Step 3: Data Storage
- Log all data to SQLite database
- Maintain data integrity
- Handle connection failures
- Implement data buffering

Step 4: Continuous Operation
- Return to Step 2 for data collection
- Periodically return to Step 1 for device discovery
- Monitor system health
- Handle device additions/removals
```

### 5. Integration Requirements

#### T3000 System Integration
```
Integration Points:
- Automatic point configuration
- AI-assisted point grouping
- Logical view organization
- User interface integration
- Existing workflow compatibility
```

#### Data Processing
```
Processing Requirements:
- Real-time data validation
- Data quality assessment
- Trend analysis preparation
- Anomaly detection capability
- Historical data management
```

## Technical Architecture Analysis

### 1. BACnet Library Requirements

#### Library Selection Criteria
```
Evaluation Factors:
- Standard BACnet compliance
- Block read support
- Cross-platform compatibility
- Performance characteristics
- Community support and documentation
```

#### Reference Implementation
```
YABE Integration:
- Study open-source YABE implementation
- Analyze block reading methods
- Extract best practices
- Understand error handling
- Document API patterns
```

### 2. Database Design

#### SQLite Schema
```sql
-- Preliminary schema concept for SQLite
CREATE TABLE device_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    device_id INTEGER NOT NULL,
    object_type TEXT NOT NULL,
    object_instance INTEGER NOT NULL,
    object_name TEXT,
    value REAL,
    units TEXT,
    quality TEXT DEFAULT 'good'
);

-- Create indexes for time-series optimization
CREATE INDEX idx_device_data_timestamp ON device_data(timestamp DESC);
CREATE INDEX idx_device_data_device_time ON device_data(device_id, timestamp DESC);
```

#### Data Retention Policies
```
Retention Strategy:
- Real-time data: 30 days full resolution
- Historical data: Compressed/aggregated
- Long-term storage: Statistical summaries
- Configurable retention periods
```

### 3. Performance Considerations

#### Optimization Strategies
```
Performance Targets:
- Block reads: 10-100 points per request
- Individual reads: Minimize when possible
- Network efficiency: Reduce BACnet traffic
- Database performance: Optimize inserts
- Memory usage: Efficient data handling
```

#### Scalability Planning
```
Scalability Factors:
- Number of devices: 100+ devices
- Data points per device: 50-500 points
- Polling frequency: 1-60 seconds
- Concurrent connections: Multiple device polls
- Data throughput: High-volume ingestion
```

## User Interface Requirements

### 1. Trend Log Visualization

#### Icon Design
```
Icon Requirements:
- Small graph icon for trend logs
- Modern, professional appearance
- Consistent with T3000 design language
- Scalable vector graphics
- Clear visual hierarchy
```

#### Dashboard Integration
```
UI Components:
- Real-time data displays
- Historical trend charts
- Device status indicators
- Polling status monitoring
- Configuration interfaces
```

### 2. Configuration Management

#### Automated Configuration
```
Auto-Configuration Features:
- Device discovery results
- Point name mapping
- Logical grouping suggestions
- AI-assisted organization
- User customization options
```

## Implementation Phases

### Phase 1: Foundation (Weeks 1-2)
```
Infrastructure Setup:
- SQLite database setup and configuration
- BACnet library evaluation and selection
- Basic polling framework development
- Database schema implementation
- Initial testing environment
```

### Phase 2: Core Polling (Weeks 3-4)
```
Polling Implementation:
- Device discovery mechanism
- Block read implementation
- Individual read fallback
- Data validation and storage
- Error handling and recovery
```

### Phase 3: Integration (Weeks 5-6)
```
T3000 Integration:
- UI component development
- Configuration interfaces
- Data visualization components
- Testing with real devices
- Performance optimization
```

### Phase 4: Enhancement (Weeks 7-8)
```
Advanced Features:
- AI-assisted point grouping
- Advanced trend analysis
- Alerting and notifications
- Historical data management
- Documentation and training
```

## Risk Analysis

### Technical Risks
```
Risk Factors:
- BACnet library compatibility issues
- Device-specific implementation variations
- Network performance challenges
- Database scaling concerns
- Integration complexity
```

### Mitigation Strategies
```
Risk Mitigation:
- Thorough library evaluation
- Comprehensive device testing
- Performance monitoring
- Gradual rollout approach
- Fallback mechanisms
```

## Dependencies and Prerequisites

### External Dependencies
```
Required Components:
- SQLite database system (embedded)
- BACnet protocol library
- Network access to BACnet devices
- Device configuration information
- Testing hardware/simulators
```

### Team Coordination
```
Team Responsibilities:
- Fandu: Limited involvement (as requested)
- Chelsea: BACnet implementation and YABE research
- Chen Bin: UI development and graphing system
- System integration and testing coordination
```

## Success Criteria

### Functional Requirements
```
Success Metrics:
- All AI/AO/DI/DO points successfully polled
- Block reads working where supported
- Data successfully stored in SQLite database
- Real-time data visualization
- System operates autonomously
```

### Performance Requirements
```
Performance Targets:
- Polling frequency: User-configurable (1-60 seconds)
- Data accuracy: 99.9% capture rate
- Response time: <5 seconds for UI updates
- System uptime: 99.5% availability
- Resource usage: Minimal system impact
```

## Next Steps and Recommendations

### Immediate Actions
1. **SQLite Setup**: Install SQLite packages and create database schema
2. **BACnet Research**: Detailed study of YABE implementation
3. **Library Evaluation**: Test multiple BACnet libraries
4. **Device Inventory**: Get comprehensive device list from Fandu
5. **Testing Plan**: Develop comprehensive testing strategy

### Research Requirements
```
Additional Information Needed:
- Specific device models and firmware versions
- Network topology and access requirements
- Existing BACnet configuration details
- Performance expectations and constraints
- Integration timeline requirements
```

### Documentation Deliverables
```
Required Documentation:
- BACnet library comparison analysis
- SQLite database setup guide
- Device polling implementation guide
- Testing procedures and results
- User interface design specifications
```

## T3000 C++ Integration Architecture Analysis

### Current System Flow Analysis
```
Current Architecture:
WebView (JavaScript)
    ↓ postMessage
T3000 C++ Application
    ↓ reads hardware devices
Hardware Devices (Inputs/Outputs/Variables)
    ↓ data flows back
WebView receives message
    ↓ calls
Rust API (t3_webview_api.dll)
    ↓ stores data
SQLite Database
    ↓ for history
Rust API reads SQLite
    ↓ displays
Right Panel (Chart/Visualization)
```

### Proposed BACnet Integration Architecture
```
New Integrated Architecture:
T3000 C++ Application
├── Existing Hardware Communication (Legacy)
├── NEW: BACnet Polling Service (Background Thread)
│   ├── Device Discovery
│   ├── Block/Individual Reading
│   └── Direct SQLite Storage
├── WebView Bridge (Enhanced)
│   ├── Existing postMessage handlers
│   └── NEW: BACnet data requests
└── Shared SQLite Database
    ├── Existing Tables (Legacy data)
    ├── BACnet Tables (New data)
    └── Unified Time Series Storage

Rust API (t3_webview_api.dll)
├── Existing Endpoints
├── NEW: BACnet Data Endpoints
└── Unified Data Access Layer
```

### Database Sharing Strategy - RECOMMENDED APPROACH

**Single Database Architecture:**
```sql
-- Extend existing SQLite schema with BACnet tables
-- Location: Same database file used by current system

-- New BACnet device registry
CREATE TABLE bacnet_devices (
    id INTEGER PRIMARY KEY,
    device_id INTEGER NOT NULL UNIQUE,
    device_name TEXT,
    ip_address TEXT,
    port INTEGER DEFAULT 47808,
    vendor_id INTEGER,
    vendor_name TEXT,
    model_name TEXT,
    firmware_revision TEXT,
    last_discovered INTEGER,
    is_active INTEGER DEFAULT 1,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    UNIQUE(device_id)
);

-- BACnet object mapping (extends existing monitoring_points concept)
CREATE TABLE bacnet_objects (
    id INTEGER PRIMARY KEY,
    device_id INTEGER NOT NULL,
    object_type INTEGER NOT NULL,        -- AI=0, AO=1, DI=3, DO=4, etc.
    object_instance INTEGER NOT NULL,
    object_name TEXT,
    present_value REAL,
    units TEXT,
    description TEXT,
    is_active INTEGER DEFAULT 1,
    last_updated INTEGER,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (device_id) REFERENCES bacnet_devices(device_id),
    UNIQUE(device_id, object_type, object_instance)
);

-- Extend existing time series tables for BACnet support
ALTER TABLE timeseries_data_2025 ADD COLUMN data_source TEXT DEFAULT 'legacy';
ALTER TABLE timeseries_data_2025 ADD COLUMN bacnet_device_id INTEGER;
ALTER TABLE timeseries_data_2025 ADD COLUMN bacnet_object_type INTEGER;
ALTER TABLE timeseries_data_2025 ADD COLUMN bacnet_object_instance INTEGER;

-- BACnet polling configuration
CREATE TABLE bacnet_polling_config (
    id INTEGER PRIMARY KEY,
    device_id INTEGER NOT NULL,
    poll_interval_seconds INTEGER DEFAULT 300,
    use_confirmed_requests INTEGER DEFAULT 1,
    max_apdu_length INTEGER DEFAULT 1476,
    retry_count INTEGER DEFAULT 3,
    timeout_seconds INTEGER DEFAULT 5,
    block_read_enabled INTEGER DEFAULT 1,
    is_active INTEGER DEFAULT 1,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (device_id) REFERENCES bacnet_devices(device_id)
);

-- Indexes for BACnet performance
CREATE INDEX idx_bacnet_devices_active ON bacnet_devices(is_active, last_discovered);
CREATE INDEX idx_bacnet_objects_device ON bacnet_objects(device_id, is_active);
CREATE INDEX idx_bacnet_objects_lookup ON bacnet_objects(device_id, object_type, object_instance);
CREATE INDEX idx_timeseries_bacnet_lookup ON timeseries_data_2025(bacnet_device_id, bacnet_object_type, bacnet_object_instance, timestamp);
```

### C++ vs C# Implementation Decision - RECOMMENDATION: C++

**C++ Implementation Advantages:**
- ✅ **Native T3000 Integration**: Direct integration with existing C++ codebase
- ✅ **Performance**: No interop overhead, native memory management
- ✅ **Single Runtime**: No additional .NET runtime dependency
- ✅ **Shared SQLite Handle**: Direct access to same database connection
- ✅ **Thread Safety**: Easier integration with existing T3000 threading model
- ✅ **Build Environment**: Consistent with existing T3000 build system

**Recommended C++ Implementation:**
```cpp
// Integration into T3000 C++ Application
// File: T3000BACnetManager.h

#include "sqlite3.h"
#include <thread>
#include <vector>
#include <memory>

// Forward declarations for BACnet library
struct BACnetDevice;
struct BACnetObject;

class T3000BACnetManager {
private:
    sqlite3* m_sharedDatabase;           // Shared with existing T3000 SQLite
    std::thread m_pollingThread;
    std::thread m_discoveryThread;
    std::vector<BACnetDevice> m_devices;
    bool m_isRunning;
    bool m_discoveryEnabled;
    int m_pollIntervalSeconds;

public:
    // Initialize with existing T3000 SQLite connection
    bool Initialize(sqlite3* existingDb);

    // Start BACnet services
    bool StartServices();
    void StopServices();

    // Integration with existing T3000 WebView message system
    void HandleWebViewBACnetRequest(const std::string& jsonMessage);
    std::string ProcessBACnetDataRequest(int deviceId, const std::string& timeRange);

    // Device management
    std::vector<BACnetDevice> GetDiscoveredDevices();
    bool AddDevice(const std::string& ipAddress, int port = 47808);
    bool RemoveDevice(int deviceId);

    // Configuration
    void SetPollingInterval(int seconds) { m_pollIntervalSeconds = seconds; }
    void EnableDiscovery(bool enable) { m_discoveryEnabled = enable; }

private:
    // Background operations
    void PollingLoop();
    void DiscoveryLoop();

    // BACnet operations
    bool DiscoverDevicesOnNetwork();
    bool PollDevice(const BACnetDevice& device);
    std::vector<BACnetObject> ReadDeviceObjects(const BACnetDevice& device);
    bool ReadObjectBlock(const BACnetDevice& device, std::vector<BACnetObject>& objects);
    float ReadObjectIndividual(const BACnetDevice& device, int objectType, int objectInstance);

    // Database operations
    bool StoreBACnetDeviceData(const BACnetDevice& device, const std::vector<BACnetObject>& objects);
    bool UpdateRealtimeCache(const BACnetDevice& device, const std::vector<BACnetObject>& objects);
    bool CreateBACnetTables();

    // Utility functions
    std::string FormatBACnetResponse(const std::vector<BACnetObject>& data);
    void LogBACnetError(const std::string& error);
};

// Implementation File: T3000BACnetManager.cpp
bool T3000BACnetManager::Initialize(sqlite3* existingDb) {
    m_sharedDatabase = existingDb;
    m_isRunning = false;
    m_discoveryEnabled = true;
    m_pollIntervalSeconds = 300; // 5 minutes default

    // Create BACnet tables if they don't exist
    if (!CreateBACnetTables()) {
        return false;
    }

    // Initialize BACnet library
    // TODO: Initialize chosen BACnet library here

    return true;
}

bool T3000BACnetManager::StartServices() {
    m_isRunning = true;

    // Start discovery thread
    if (m_discoveryEnabled) {
        m_discoveryThread = std::thread(&T3000BACnetManager::DiscoveryLoop, this);
    }

    // Start polling thread
    m_pollingThread = std::thread(&T3000BACnetManager::PollingLoop, this);

    return true;
}

void T3000BACnetManager::PollingLoop() {
    while (m_isRunning) {
        try {
            // Poll all active devices
            for (const auto& device : m_devices) {
                if (device.isActive) {
                    PollDevice(device);
                }
            }

            // Sleep until next poll cycle
            std::this_thread::sleep_for(std::chrono::seconds(m_pollIntervalSeconds));
        }
        catch (const std::exception& e) {
            LogBACnetError("Polling error: " + std::string(e.what()));
        }
    }
}

void T3000BACnetManager::HandleWebViewBACnetRequest(const std::string& jsonMessage) {
    // Parse JSON message from WebView
    // Example: {"action": "BACNET_TREND_DATA", "deviceId": 123, "startTime": "...", "endTime": "..."}

    // Query SQLite for BACnet trend data
    std::string query = R"(
        SELECT bd.device_name, bo.object_name, bo.object_type, bo.object_instance,
               ts.value, ts.timestamp, ts.interval_seconds
        FROM timeseries_data_2025 ts
        JOIN bacnet_objects bo ON ts.bacnet_device_id = bo.device_id
            AND ts.bacnet_object_type = bo.object_type
            AND ts.bacnet_object_instance = bo.object_instance
        JOIN bacnet_devices bd ON bo.device_id = bd.device_id
        WHERE ts.data_source = 'bacnet'
            AND ts.timestamp BETWEEN ? AND ?
            AND bd.device_id = ?
        ORDER BY ts.timestamp DESC
    )";

    // Execute query and format response
    // Send response back to WebView through existing T3000 bridge
}
```

### WebView Integration Strategy - MINIMAL CHANGES

**Enhanced Message System:**
```javascript
// Extend existing WebView bridge for BACnet support
// File: WebViewBACnetBridge.js

class T3000BACnetBridge {
    // Request BACnet device discovery
    static RequestBACnetDiscovery() {
        window.chrome?.webview?.postMessage({
            action: 25, // NEW: BACNET_DISCOVER
            timeout: 30000,
            autoAdd: true
        });
    }

    // Request BACnet trend data (similar to existing pattern)
    static RequestBACnetTrendData(deviceId, pointList, timeRange) {
        window.chrome?.webview?.postMessage({
            action: 26, // NEW: BACNET_TREND_DATA
            source: 'bacnet',
            deviceId: deviceId,
            objectTypes: pointList,
            startTime: timeRange.start,
            endTime: timeRange.end,
            maxPoints: 1000
        });
    }

    // Enhanced entry update with BACnet support
    static UpdateBACnetPoint(deviceId, objectType, objectInstance, value) {
        window.chrome?.webview?.postMessage({
            action: 3, // Keep existing UPDATE_ENTRY
            source: 'bacnet',
            deviceId: deviceId,
            objectType: objectType,
            objectInstance: objectInstance,
            value: value,
            timestamp: Date.now()
        });
    }

    // Handle BACnet responses (extend existing handler)
    static HandleBACnetResponse(data) {
        switch(data.action) {
            case 'BACNET_DISCOVER_RES':
                this.updateDeviceList(data.devices);
                break;
            case 'BACNET_TREND_DATA_RES':
                this.updateTimeSeriesChart(data.trendData);
                break;
            case 'BACNET_UPDATE_RES':
                this.confirmPointUpdate(data.status);
                break;
        }
    }
}
```

### Rust API Enhancement Strategy - EXTEND EXISTING

**Enhanced t3_webview_api.dll:**
```rust
// Extend existing Rust API with BACnet endpoints
// File: src/bacnet_api.rs

use sea_orm::*;
use crate::entity::{bacnet_devices, bacnet_objects, timeseries_data_2025};

#[derive(Debug, Serialize)]
pub struct BACnetDevice {
    pub id: i32,
    pub device_id: i32,
    pub device_name: String,
    pub ip_address: String,
    pub vendor_name: Option<String>,
    pub model_name: Option<String>,
    pub is_active: bool,
    pub last_discovered: Option<i64>,
}

#[derive(Debug, Serialize)]
pub struct BACnetTrendData {
    pub device_name: String,
    pub object_name: String,
    pub object_type: i32,
    pub object_instance: i32,
    pub value: f32,
    pub timestamp: i64,
    pub units: Option<String>,
}

impl WebviewApi {
    // Get all discovered BACnet devices
    pub async fn get_bacnet_devices(&self) -> Result<Vec<BACnetDevice>, DbErr> {
        let devices = bacnet_devices::Entity::find()
            .filter(bacnet_devices::Column::IsActive.eq(1))
            .order_by_desc(bacnet_devices::Column::LastDiscovered)
            .all(&self.db)
            .await?;

        Ok(devices.into_iter().map(|d| BACnetDevice {
            id: d.id,
            device_id: d.device_id,
            device_name: d.device_name,
            ip_address: d.ip_address,
            vendor_name: d.vendor_name,
            model_name: d.model_name,
            is_active: d.is_active == 1,
            last_discovered: d.last_discovered,
        }).collect())
    }

    // Get BACnet trend data (compatible with existing trend API)
    pub async fn get_bacnet_trend_data(
        &self,
        device_id: i32,
        object_types: Vec<i32>,
        start_time: i64,
        end_time: i64,
        max_points: Option<usize>
    ) -> Result<Vec<BACnetTrendData>, DbErr> {
        let mut query = timeseries_data_2025::Entity::find()
            .join(JoinType::InnerJoin, timeseries_data_2025::Relation::BacnetObjects.def())
            .join(JoinType::InnerJoin, bacnet_objects::Relation::BacnetDevices.def())
            .filter(timeseries_data_2025::Column::DataSource.eq("bacnet"))
            .filter(timeseries_data_2025::Column::BacnetDeviceId.eq(device_id))
            .filter(timeseries_data_2025::Column::Timestamp.between(start_time, end_time))
            .order_by_desc(timeseries_data_2025::Column::Timestamp);

        if !object_types.is_empty() {
            query = query.filter(timeseries_data_2025::Column::BacnetObjectType.is_in(object_types));
        }

        if let Some(limit) = max_points {
            query = query.limit(limit as u64);
        }

        let results = query.all(&self.db).await?;

        // Transform to BACnetTrendData format
        // Implementation details...

        Ok(trend_data)
    }

    // Unified trend data endpoint (legacy + BACnet)
    pub async fn get_unified_trend_data(
        &self,
        device_id: i32,
        start_time: i64,
        end_time: i64,
        include_legacy: bool,
        include_bacnet: bool
    ) -> Result<Vec<UnifiedTrendData>, DbErr> {
        let mut all_data = Vec::new();

        if include_legacy {
            let legacy_data = self.get_legacy_trend_data(device_id, start_time, end_time).await?;
            all_data.extend(legacy_data);
        }

        if include_bacnet {
            let bacnet_data = self.get_bacnet_trend_data(device_id, vec![], start_time, end_time, None).await?;
            all_data.extend(bacnet_data.into_iter().map(|d| d.to_unified()));
        }

        // Sort by timestamp and return unified format
        all_data.sort_by_key(|d| d.timestamp);
        Ok(all_data)
    }
}
```

### Integration Timeline and Migration Strategy

**Phase 1: Foundation Setup (Week 1-2)**
- Add BACnet tables to existing SQLite database
- Select and integrate C++ BACnet library
- Create T3000BACnetManager class stub
- Test basic database connectivity

**Phase 2: Basic BACnet Implementation (Week 3-4)**
- Implement device discovery functionality
- Add basic object reading (individual reads first)
- Create database storage functions
- Test with single BACnet device

**Phase 3: Enhanced Polling (Week 5-6)**
- Implement block reading for efficiency
- Add background polling threads
- Integrate with existing T3000 threading model
- Performance optimization

**Phase 4: WebView Integration (Week 7-8)**
- Extend WebView message handlers
- Enhance Rust API with BACnet endpoints
- Update TimeSeriesModal for BACnet data
- End-to-end testing

**Phase 5: Production Readiness (Week 9-10)**
- Error handling and recovery
- Configuration management
- Documentation and training
- Deployment and validation

### Risk Mitigation Strategies

**Technical Risks:**
- **BACnet Library Compatibility**: Evaluate multiple libraries early, have fallback options
- **Database Concurrency**: Use SQLite WAL mode, proper locking mechanisms
- **Performance Impact**: Background threads, configurable polling intervals
- **Memory Management**: Careful resource cleanup, memory leak detection

**Integration Risks:**
- **T3000 Compatibility**: Gradual integration, maintain existing functionality
- **WebView Changes**: Minimal UI changes, backward compatibility
- **Data Consistency**: Validation between legacy and BACnet data sources

## Conclusion

This comprehensive analysis provides a detailed roadmap for integrating BACnet polling capabilities into the existing T3000 system while maintaining full compatibility and leveraging the current SQLite database and Rust API infrastructure.

**Key Decisions:**
- ✅ **C++ Implementation**: Native integration with T3000 codebase
- ✅ **Shared SQLite Database**: Single source of truth, unified data access
- ✅ **Minimal WebView Changes**: Extend existing patterns, maintain compatibility
- ✅ **Enhanced Rust API**: Unified data endpoints for both legacy and BACnet data

The phased implementation approach allows for iterative development and testing, ensuring robust system delivery while minimizing risks associated with replacing existing proprietary systems.

---

**Document Status:** Comprehensive Integration Analysis Complete
**Next Review:** Pending T3000 source code analysis and BACnet library selection
**Related Documents:**
- T3000-BACnet-Integration-Analysis.md (Detailed C++ implementation)
- BACnet-Library-Evaluation.md (To be created)
- Database-Migration-Guide.md (To be created)
