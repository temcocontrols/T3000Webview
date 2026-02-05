# T3000 BACnet SQLite Integration - Requirements Analysis

**Date:** July 29, 2025
**Project:** T3000 Webview BACnet Data Polling System
**Repository:** temcocontrols/T3000Webview
**Branch:** feature/new-ui

## Executive Summary

This document analyzes the requirements for implementing a new data polling system that will replace Temco's proprietary trend log structures with standard BACnet polling methods, integrating with SQLite for data archiving and visualization.

**Updated Context:** Based on user requirements for T3000 source code integration covering T3000 panel, browser-only, and hybrid scenarios with T3-TB device support.

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

## Comprehensive T3000 System Architecture Analysis

### Current Complete System Flow
```
Current Architecture (Complete Picture):

1. Build & Deployment:
   WebView (Vue3 + TypeScript) → build → /webview/www/
   Rust API → build → t3_webview_api.dll
   T3000 C++ → build → T3000.exe + /webview/www/ + t3_webview_api.dll

2. Runtime Architecture:
   T3000.exe (Main Application)
   ├── Built-in Edge Browser (localhost:9103) [Internal Users]
   ├── Hardware Communication (Proprietary Protocols)
   └── Backend Process:
       ├── Rust WebServer (Port 9103) ← External Browser Access
       ├── Rust WebSocket Server (Port 9104) ← Real-time Communication
       └── t3_webview_api.dll

3. Data Flow:
   Hardware Devices (Inputs/Outputs/Variables)
   ↓ proprietary protocols
   T3000 C++ Application
   ↓ edge message OR websocket message
   WebView (Built-in Browser OR External Browser)
   ↓ API calls
   Rust API (t3_webview_api.dll)
   ↓ stores/retrieves
   SQLite Database (History Storage)

4. Communication Channels:
   - Built-in Edge Browser: postMessage ↔ T3000 C++
   - External Browser: WebSocket ↔ Rust API ↔ T3000 C++
   - Both share same message payloads, different transport
```

### Proposed BACnet Integration Architecture (Complete Solution)

```
New Integrated BACnet Architecture:

1. Shared BACnet Library Design:
   ┌─────────────────────────────────────────────────────────┐
   │                BACnet Shared Library                    │
   │  ┌─────────────────┐    ┌─────────────────────────────┐ │
   │  │   C++ Interface │    │     Rust FFI Interface     │ │
   │  │ (for T3000.exe) │    │ (for t3_webview_api.dll)   │ │
   │  └─────────────────┘    └─────────────────────────────┘ │
   │  ┌─────────────────────────────────────────────────────┐ │
   │  │            Core BACnet Engine (C++)                 │ │
   │  │  • Device Discovery  • Block Reading               │ │
   │  │  • Object Enumeration • Error Handling             │ │
   │  └─────────────────────────────────────────────────────┘ │
   └─────────────────────────────────────────────────────────┘

2. Runtime Integration:
   T3000.exe (Enhanced)
   ├── Existing Hardware Communication (Legacy)
   ├── NEW: T3000 BACnet Window/Panel
   │   ├── Device List Display
   │   ├── Real-time Data Monitoring
   │   └── BACnet Configuration
   ├── NEW: BACnet Polling Service (C++)
   │   ├── Uses Shared BACnet Library
   │   ├── Background Polling Thread
   │   └── Direct SQLite Storage
   ├── Built-in Edge Browser (localhost:9103)
   └── Backend Process (Enhanced):
       ├── Rust WebServer (Port 9103)
       ├── Rust WebSocket Server (Port 9104)
       ├── NEW: Rust BACnet Service (Optional)
       │   ├── Uses Shared BACnet Library (via FFI)
       │   ├── Triggered by WebSocket/HTTP requests
       │   └── Fallback when T3000 BACnet disabled
       └── Enhanced t3_webview_api.dll
           └── Unified SQLite Access (Legacy + BACnet)

3. Shared SQLite Database (Single Source of Truth):
   SQLite Database (Enhanced Schema)
   ├── Existing Tables (Legacy T3000 data)
   ├── BACnet Tables (Device/Object registry)
   ├── Unified Time Series (Legacy + BACnet data)
   └── Access Methods:
       ├── T3000 C++ (Direct SQLite API)
       ├── Rust API (SeaORM)
       └── Thread-safe concurrent access

4. User Experience Scenarios:

   Scenario A: T3000-Only Usage
   User opens T3000.exe → Opens BACnet Panel
   → T3000 starts BACnet polling → Stores to SQLite
   → User views data in T3000 native window

   Scenario B: Browser-Only Usage
   User opens http://localhost:9103 (T3000 runs in background)
   → Browser requests BACnet data via WebSocket
   → Rust API triggers BACnet polling → Stores to SQLite
   → TrendLogModal displays data in browser

   Scenario C: Hybrid Usage
   Both T3000 BACnet panel AND browser active
   → Shared SQLite database serves both interfaces
   → Real-time synchronization between views
   → Consistent data across all interfaces
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

### Shared BACnet Library Design - RECOMMENDED SOLUTION

**Architecture Decision: C++ Core Library with FFI Bindings**

```cpp
// File: BACnetSharedLibrary.h
// Shared library that can be used by both T3000 C++ and Rust API

#pragma once

#ifdef __cplusplus
extern "C" {
#endif

// Export declarations for DLL
#ifdef BACNET_EXPORTS
#define BACNET_API __declspec(dllexport)
#else
#define BACNET_API __declspec(dllimport)
#endif

// Core data structures (C-compatible for FFI)
typedef struct {
    int device_id;
    char device_name[64];
    char ip_address[16];
    int port;
    int vendor_id;
    char vendor_name[64];
    char model_name[64];
    int is_active;
    long long last_discovered;
} BACnetDeviceInfo;

typedef struct {
    int device_id;
    int object_type;        // AI=0, AO=1, DI=3, DO=4
    int object_instance;
    char object_name[64];
    float present_value;
    char units[16];
    char description[128];
    long long last_updated;
} BACnetObjectInfo;

typedef struct {
    BACnetDeviceInfo* devices;
    int device_count;
    int max_devices;
} BACnetDeviceList;

typedef struct {
    BACnetObjectInfo* objects;
    int object_count;
    int max_objects;
} BACnetObjectList;

// Core BACnet Library Functions (Exported for both C++ and Rust)
BACNET_API int BACnet_Initialize(const char* local_ip, int local_port);
BACNET_API void BACnet_Shutdown();

// Device Discovery
BACNET_API int BACnet_DiscoverDevices(BACnetDeviceList* device_list, int timeout_ms);
BACNET_API int BACnet_AddDevice(const char* ip_address, int port, int device_id);
BACNET_API int BACnet_RemoveDevice(int device_id);

// Object Reading
BACNET_API int BACnet_ReadAllObjects(int device_id, BACnetObjectList* object_list);
BACNET_API int BACnet_ReadObjectBlock(int device_id, int* object_types, int* object_instances,
                                     int object_count, BACnetObjectList* results);
BACNET_API float BACnet_ReadSingleObject(int device_id, int object_type, int object_instance);

// Configuration
BACNET_API void BACnet_SetPollingInterval(int seconds);
BACNET_API void BACnet_SetRetryCount(int retries);
BACNET_API void BACnet_SetTimeout(int timeout_ms);

// Error Handling
BACNET_API const char* BACnet_GetLastError();
BACNET_API void BACnet_ClearError();

// Memory Management
BACNET_API void BACnet_FreeDeviceList(BACnetDeviceList* list);
BACNET_API void BACnet_FreeObjectList(BACnetObjectList* list);

#ifdef __cplusplus
}
#endif

// C++ Wrapper Class (for T3000 use)
#ifdef __cplusplus
#include <vector>
#include <string>
#include <memory>

class BACnetManager {
private:
    bool m_initialized;

public:
    BACnetManager();
    ~BACnetManager();

    bool Initialize(const std::string& localIp = "", int localPort = 47808);
    void Shutdown();

    std::vector<BACnetDeviceInfo> DiscoverDevices(int timeoutMs = 30000);
    bool AddDevice(const std::string& ipAddress, int port, int deviceId);

    std::vector<BACnetObjectInfo> ReadAllObjects(int deviceId);
    std::vector<BACnetObjectInfo> ReadObjectBlock(int deviceId,
        const std::vector<std::pair<int, int>>& objectIds);
    float ReadSingleObject(int deviceId, int objectType, int objectInstance);

    std::string GetLastError() const;
};
#endif
```

**Rust FFI Bindings:**
```rust
// File: src/bacnet_ffi.rs
// Rust bindings for the shared BACnet library

use std::ffi::{CStr, CString};
use std::os::raw::{c_char, c_int, c_float, c_longlong};

#[repr(C)]
pub struct BACnetDeviceInfo {
    pub device_id: c_int,
    pub device_name: [c_char; 64],
    pub ip_address: [c_char; 16],
    pub port: c_int,
    pub vendor_id: c_int,
    pub vendor_name: [c_char; 64],
    pub model_name: [c_char; 64],
    pub is_active: c_int,
    pub last_discovered: c_longlong,
}

#[repr(C)]
pub struct BACnetObjectInfo {
    pub device_id: c_int,
    pub object_type: c_int,
    pub object_instance: c_int,
    pub object_name: [c_char; 64],
    pub present_value: c_float,
    pub units: [c_char; 16],
    pub description: [c_char; 128],
    pub last_updated: c_longlong,
}

#[repr(C)]
pub struct BACnetDeviceList {
    pub devices: *mut BACnetDeviceInfo,
    pub device_count: c_int,
    pub max_devices: c_int,
}

#[repr(C)]
pub struct BACnetObjectList {
    pub objects: *mut BACnetObjectInfo,
    pub object_count: c_int,
    pub max_objects: c_int,
}

#[link(name = "BACnetSharedLibrary")]
extern "C" {
    pub fn BACnet_Initialize(local_ip: *const c_char, local_port: c_int) -> c_int;
    pub fn BACnet_Shutdown();

    pub fn BACnet_DiscoverDevices(device_list: *mut BACnetDeviceList, timeout_ms: c_int) -> c_int;
    pub fn BACnet_AddDevice(ip_address: *const c_char, port: c_int, device_id: c_int) -> c_int;

    pub fn BACnet_ReadAllObjects(device_id: c_int, object_list: *mut BACnetObjectList) -> c_int;
    pub fn BACnet_ReadSingleObject(device_id: c_int, object_type: c_int, object_instance: c_int) -> c_float;

    pub fn BACnet_GetLastError() -> *const c_char;
    pub fn BACnet_FreeDeviceList(list: *mut BACnetDeviceList);
    pub fn BACnet_FreeObjectList(list: *mut BACnetObjectList);
}

// Rust wrapper for safe usage
pub struct BACnetClient {
    initialized: bool,
}

impl BACnetClient {
    pub fn new() -> Self {
        BACnetClient { initialized: false }
    }

    pub fn initialize(&mut self, local_ip: Option<&str>, local_port: u16) -> Result<(), String> {
        let ip_cstr = match local_ip {
            Some(ip) => CString::new(ip).map_err(|e| format!("Invalid IP: {}", e))?,
            None => CString::new("").unwrap(),
        };

        let result = unsafe {
            BACnet_Initialize(ip_cstr.as_ptr(), local_port as c_int)
        };

        if result == 0 {
            self.initialized = true;
            Ok(())
        } else {
            Err(self.get_last_error())
        }
    }

    pub fn discover_devices(&self, timeout_ms: u32) -> Result<Vec<BACnetDeviceInfo>, String> {
        if !self.initialized {
            return Err("BACnet not initialized".to_string());
        }

        let mut device_list = BACnetDeviceList {
            devices: std::ptr::null_mut(),
            device_count: 0,
            max_devices: 100,
        };

        let result = unsafe {
            BACnet_DiscoverDevices(&mut device_list, timeout_ms as c_int)
        };

        if result == 0 {
            let devices = unsafe {
                std::slice::from_raw_parts(device_list.devices, device_list.device_count as usize)
            }.to_vec();

            unsafe { BACnet_FreeDeviceList(&mut device_list); }
            Ok(devices)
        } else {
            Err(self.get_last_error())
        }
    }

    pub fn read_all_objects(&self, device_id: i32) -> Result<Vec<BACnetObjectInfo>, String> {
        if !self.initialized {
            return Err("BACnet not initialized".to_string());
        }

        let mut object_list = BACnetObjectList {
            objects: std::ptr::null_mut(),
            object_count: 0,
            max_objects: 1000,
        };

        let result = unsafe {
            BACnet_ReadAllObjects(device_id as c_int, &mut object_list)
        };

        if result == 0 {
            let objects = unsafe {
                std::slice::from_raw_parts(object_list.objects, object_list.object_count as usize)
            }.to_vec();

            unsafe { BACnet_FreeObjectList(&mut object_list); }
            Ok(objects)
        } else {
            Err(self.get_last_error())
        }
    }

    fn get_last_error(&self) -> String {
        unsafe {
            let error_ptr = BACnet_GetLastError();
            if error_ptr.is_null() {
                "Unknown error".to_string()
            } else {
                CStr::from_ptr(error_ptr).to_string_lossy().to_string()
            }
        }
    }
}

impl Drop for BACnetClient {
    fn drop(&mut self) {
        if self.initialized {
            unsafe { BACnet_Shutdown(); }
        }
    }
}
```

### T3000 C++ Integration (Enhanced for Complete System)

**Enhanced T3000BACnetManager for Complete Integration:**
```cpp
// File: T3000BACnetManager.h
// Integration into T3000 C++ Application

#include "sqlite3.h"
#include "BACnetSharedLibrary.h"  // Our shared library
#include <thread>
#include <vector>
#include <memory>
#include <mutex>
#include <atomic>

class T3000BACnetManager {
private:
    sqlite3* m_sharedDatabase;           // Shared with existing T3000 SQLite
    std::unique_ptr<BACnetManager> m_bacnetClient;
    std::thread m_pollingThread;
    std::thread m_discoveryThread;
    std::vector<BACnetDeviceInfo> m_devices;
    std::atomic<bool> m_isRunning;
    std::atomic<bool> m_discoveryEnabled;
    std::atomic<int> m_pollIntervalSeconds;
    std::mutex m_devicesMutex;
    std::mutex m_databaseMutex;

    // Window/Panel integration for T3000 UI
    HWND m_bacnetWindow;
    bool m_windowVisible;

public:
    // Initialize with existing T3000 SQLite connection
    bool Initialize(sqlite3* existingDb, const std::string& localIp = "");

    // Service management
    bool StartServices();
    void StopServices();
    bool IsRunning() const { return m_isRunning; }

    // T3000 Window/Panel integration
    bool CreateBACnetWindow(HWND parentWindow);
    void ShowBACnetWindow(bool show);
    void UpdateWindowDisplay();
    LRESULT HandleWindowMessage(HWND hwnd, UINT msg, WPARAM wParam, LPARAM lParam);

    // WebView Bridge integration (existing pattern)
    void HandleWebViewBACnetRequest(const std::string& jsonMessage);
    std::string ProcessBACnetDataRequest(int deviceId, const std::string& timeRange);

    // Enhanced communication for Rust API coordination
    void HandleRustAPIRequest(const std::string& action, const std::string& params);
    std::string GetDeviceListJson();
    std::string GetTrendDataJson(int deviceId, long long startTime, long long endTime);

    // Device management
    std::vector<BACnetDeviceInfo> GetDiscoveredDevices();
    bool AddDevice(const std::string& ipAddress, int port = 47808, int deviceId = -1);
    bool RemoveDevice(int deviceId);
    void RefreshDeviceList();

    // Configuration management
    void SetPollingInterval(int seconds);
    void SetDiscoveryEnabled(bool enabled);
    void SaveConfiguration();
    void LoadConfiguration();

    // Status and monitoring
    int GetActiveDeviceCount();
    long long GetLastPollTime();
    std::string GetPollingStatus();

private:
    // Background operations
    void PollingLoop();
    void DiscoveryLoop();

    // BACnet operations using shared library
    bool DiscoverDevicesOnNetwork();
    bool PollDevice(const BACnetDeviceInfo& device);
    bool PollAllDevices();

    // Database operations (thread-safe)
    bool StoreBACnetDeviceData(const BACnetDeviceInfo& device,
                              const std::vector<BACnetObjectInfo>& objects);
    bool UpdateRealtimeCache(const BACnetDeviceInfo& device,
                           const std::vector<BACnetObjectInfo>& objects);
    bool CreateBACnetTables();
    bool ExecuteSQLWithLock(const std::string& sql, sqlite3_stmt** stmt = nullptr);

    // Window/UI operations
    void PopulateDeviceList();
    void UpdateDeviceStatus(int deviceId, bool online);
    void RefreshPollingStatus();

    // Utility functions
    std::string FormatBACnetResponse(const std::vector<BACnetObjectInfo>& data);
    void LogBACnetError(const std::string& error);
    std::string GetConfigFilePath();
};

// Implementation details for key methods
bool T3000BACnetManager::Initialize(sqlite3* existingDb, const std::string& localIp) {
    m_sharedDatabase = existingDb;
    m_isRunning = false;
    m_discoveryEnabled = true;
    m_pollIntervalSeconds = 300; // 5 minutes default
    m_windowVisible = false;

    // Initialize shared BACnet library
    m_bacnetClient = std::make_unique<BACnetManager>();
    if (!m_bacnetClient->Initialize(localIp)) {
        LogBACnetError("Failed to initialize BACnet library");
        return false;
    }

    // Create BACnet tables if they don't exist
    if (!CreateBACnetTables()) {
        LogBACnetError("Failed to create BACnet database tables");
        return false;
    }

    // Load saved configuration
    LoadConfiguration();

    return true;
}

bool T3000BACnetManager::CreateBACnetWindow(HWND parentWindow) {
    // Create native Windows dialog/window for BACnet management
    // This will be a T3000-style window showing:
    // - Device list with status indicators
    // - Real-time value display
    // - Polling configuration
    // - Device discovery controls

    // Implementation would use Windows API to create child window
    // Similar to existing T3000 panels/dialogs

    return true;
}

void T3000BACnetManager::HandleWebViewBACnetRequest(const std::string& jsonMessage) {
    // Enhanced to handle both built-in browser and external browser requests
    // Parse JSON message and determine action

    try {
        // Parse JSON (using existing T3000 JSON library or simple parser)
        // Handle different request types:
        // - BACNET_DISCOVER: Start device discovery
        // - BACNET_TREND_DATA: Get historical data
        // - BACNET_DEVICE_LIST: Get current devices
        // - BACNET_START_POLLING: Start/stop polling for specific device

        std::string response = ProcessBACnetRequest(jsonMessage);

        // Send response back through existing T3000 WebView bridge
        // This maintains compatibility with existing message system

    } catch (const std::exception& e) {
        LogBACnetError("Error handling WebView request: " + std::string(e.what()));
    }
}

void T3000BACnetManager::HandleRustAPIRequest(const std::string& action, const std::string& params) {
    // New method to handle requests from Rust API when external browser is used
    // This allows Rust API to trigger BACnet operations when T3000 C++ polling is preferred

    if (action == "start_polling") {
        // Rust API requests T3000 to start BACnet polling
        if (!m_isRunning) {
            StartServices();
        }
    } else if (action == "get_devices") {
        // Return device list to Rust API
        std::string deviceJson = GetDeviceListJson();
        // Send to Rust API through IPC or shared memory
    } else if (action == "discover_devices") {
        // Trigger device discovery
        std::thread([this]() {
            DiscoverDevicesOnNetwork();
        }).detach();
    }
}

bool T3000BACnetManager::PollDevice(const BACnetDeviceInfo& device) {
    try {
        // Use shared BACnet library to read all objects
        auto objects = m_bacnetClient->ReadAllObjects(device.device_id);

        if (!objects.empty()) {
            // Store data in shared SQLite database
            {
                std::lock_guard<std::mutex> lock(m_databaseMutex);
                StoreBACnetDeviceData(device, objects);
                UpdateRealtimeCache(device, objects);
            }

            // Update T3000 window if visible
            if (m_windowVisible) {
                UpdateDeviceStatus(device.device_id, true);
            }

            return true;
        }
    } catch (const std::exception& e) {
        LogBACnetError("Error polling device " + std::to_string(device.device_id) + ": " + e.what());

        if (m_windowVisible) {
            UpdateDeviceStatus(device.device_id, false);
        }
    }

    return false;
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
### Enhanced Rust API Integration (Complete t3_webview_api.dll Solution)

**Enhanced Rust API with BACnet Support:**
```rust
// File: src/bacnet_service.rs
// Enhanced Rust API for complete system integration

use crate::bacnet_ffi::{BACnetClient, BACnetDeviceInfo, BACnetObjectInfo};
use sea_orm::*;
use tokio::sync::Mutex;
use std::sync::Arc;
use std::collections::HashMap;

pub struct BACnetService {
    client: Arc<Mutex<Option<BACnetClient>>>,
    db: DatabaseConnection,
    polling_active: Arc<Mutex<bool>>,
    discovered_devices: Arc<Mutex<Vec<BACnetDeviceInfo>>>,
}

impl BACnetService {
    pub fn new(db: DatabaseConnection) -> Self {
        Self {
            client: Arc::new(Mutex::new(None)),
            db,
            polling_active: Arc::new(Mutex::new(false)),
            discovered_devices: Arc::new(Mutex::new(Vec::new())),
        }
    }

    // Initialize BACnet service (called when T3000 backend starts)
    pub async fn initialize(&self, local_ip: Option<&str>) -> Result<(), String> {
        let mut client_guard = self.client.lock().await;

        let mut client = BACnetClient::new();
        client.initialize(local_ip, 47808)?;

        *client_guard = Some(client);
        Ok(())
    }

    // WebSocket/HTTP endpoint handlers
    pub async fn handle_discover_devices(&self, timeout_ms: u32) -> Result<Vec<BACnetDeviceInfo>, String> {
        let client_guard = self.client.lock().await;

        if let Some(ref client) = *client_guard {
            let devices = client.discover_devices(timeout_ms)?;

            // Store discovered devices in database
            for device in &devices {
                self.store_discovered_device(device).await?;
            }

            // Update cached device list
            let mut devices_guard = self.discovered_devices.lock().await;
            *devices_guard = devices.clone();

            Ok(devices)
        } else {
            Err("BACnet client not initialized".to_string())
        }
    }

    pub async fn handle_start_polling(&self, device_ids: Vec<i32>, interval_seconds: u32) -> Result<(), String> {
        // Check if T3000 C++ is already handling polling
        if self.is_t3000_polling_active().await {
            return Ok(()); // T3000 handles polling, we just read from database
        }

        // Start Rust-based polling (fallback when T3000 not active)
        let mut polling_guard = self.polling_active.lock().await;
        if !*polling_guard {
            *polling_guard = true;

            let service = self.clone();
            tokio::spawn(async move {
                service.polling_loop(device_ids, interval_seconds).await;
            });
        }

        Ok(())
    }

    pub async fn handle_get_trend_data(
        &self,
        device_id: i32,
        start_time: i64,
        end_time: i64,
        object_types: Option<Vec<i32>>
    ) -> Result<Vec<BACnetTrendData>, String> {
        // Query unified database (works regardless of polling source)
        self.get_trend_data_from_db(device_id, start_time, end_time, object_types).await
    }

    // Coordination with T3000 C++
    async fn is_t3000_polling_active(&self) -> bool {
        // Check if T3000 C++ BACnet manager is running
        // This could be done via:
        // 1. Shared memory flag
        // 2. Database status table
        // 3. Named pipe/mutex
        // 4. Recent data timestamps in database

        // For now, check if we have recent BACnet data from T3000
        let recent_cutoff = chrono::Utc::now().timestamp() - 600; // 10 minutes

        match self.check_recent_bacnet_data(recent_cutoff).await {
            Ok(has_recent) => has_recent,
            Err(_) => false,
        }
    }

    async fn check_recent_bacnet_data(&self, cutoff_timestamp: i64) -> Result<bool, DbErr> {
        let count = timeseries_data_2025::Entity::find()
            .filter(timeseries_data_2025::Column::DataSource.eq("bacnet"))
            .filter(timeseries_data_2025::Column::Timestamp.gt(cutoff_timestamp))
            .count(&self.db)
            .await?;

        Ok(count > 0)
    }

    // Fallback polling loop (when T3000 C++ is not active)
    async fn polling_loop(&self, device_ids: Vec<i32>, interval_seconds: u32) {
        let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(interval_seconds as u64));

        loop {
            interval.tick().await;

            // Check if T3000 took over polling
            if self.is_t3000_polling_active().await {
                let mut polling_guard = self.polling_active.lock().await;
                *polling_guard = false;
                break; // T3000 is now handling polling
            }

            // Poll devices using shared BACnet library
            for device_id in &device_ids {
                if let Err(e) = self.poll_single_device(*device_id).await {
                    eprintln!("Error polling device {}: {}", device_id, e);
                }
            }
        }
    }

    async fn poll_single_device(&self, device_id: i32) -> Result<(), String> {
        let client_guard = self.client.lock().await;

        if let Some(ref client) = *client_guard {
            let objects = client.read_all_objects(device_id)?;

            // Store in database with "bacnet" source
            self.store_polling_data(device_id, &objects).await?;

            Ok(())
        } else {
            Err("BACnet client not initialized".to_string())
        }
    }

    async fn store_discovered_device(&self, device: &BACnetDeviceInfo) -> Result<(), String> {
        let device_model = bacnet_devices::ActiveModel {
            device_id: Set(device.device_id),
            device_name: Set(c_str_to_string(&device.device_name)),
            ip_address: Set(c_str_to_string(&device.ip_address)),
            port: Set(device.port),
            vendor_id: Set(Some(device.vendor_id)),
            vendor_name: Set(Some(c_str_to_string(&device.vendor_name))),
            model_name: Set(Some(c_str_to_string(&device.model_name))),
            is_active: Set(device.is_active),
            last_discovered: Set(Some(device.last_discovered)),
            created_at: Set(Some(chrono::Utc::now().timestamp())),
            ..Default::default()
        };

        // Upsert device record
        bacnet_devices::Entity::insert(device_model)
            .on_conflict(
                OnConflict::column(bacnet_devices::Column::DeviceId)
                    .update_columns([
                        bacnet_devices::Column::DeviceName,
                        bacnet_devices::Column::IpAddress,
                        bacnet_devices::Column::LastDiscovered,
                    ])
                    .to_owned()
            )
            .exec(&self.db)
            .await
            .map_err(|e| format!("Database error: {}", e))?;

        Ok(())
    }

    async fn store_polling_data(&self, device_id: i32, objects: &[BACnetObjectInfo]) -> Result<(), String> {
        let timestamp = chrono::Utc::now().timestamp();

        for object in objects {
            // Store object metadata
            let object_model = bacnet_objects::ActiveModel {
                device_id: Set(object.device_id),
                object_type: Set(object.object_type),
                object_instance: Set(object.object_instance),
                object_name: Set(c_str_to_string(&object.object_name)),
                present_value: Set(object.present_value),
                units: Set(Some(c_str_to_string(&object.units))),
                description: Set(Some(c_str_to_string(&object.description))),
                last_updated: Set(object.last_updated),
                ..Default::default()
            };

            bacnet_objects::Entity::insert(object_model)
                .on_conflict(
                    OnConflict::columns([
                        bacnet_objects::Column::DeviceId,
                        bacnet_objects::Column::ObjectType,
                        bacnet_objects::Column::ObjectInstance,
                    ])
                    .update_columns([
                        bacnet_objects::Column::PresentValue,
                        bacnet_objects::Column::LastUpdated,
                    ])
                    .to_owned()
                )
                .exec(&self.db)
                .await
                .map_err(|e| format!("Database error storing object: {}", e))?;

            // Store time series data
            let timeseries_model = timeseries_data_2025::ActiveModel {
                device_id: Set(object.device_id),
                point_type: Set(Some(object.object_type)),
                point_number: Set(Some(object.object_instance)),
                value: Set(object.present_value as f64),
                timestamp: Set(timestamp),
                interval_seconds: Set(300), // 5 minutes default
                data_source: Set(Some("bacnet".to_string())),
                bacnet_device_id: Set(Some(object.device_id)),
                bacnet_object_type: Set(Some(object.object_type)),
                bacnet_object_instance: Set(Some(object.object_instance)),
                ..Default::default()
            };

            timeseries_data_2025::Entity::insert(timeseries_model)
                .exec(&self.db)
                .await
                .map_err(|e| format!("Database error storing timeseries: {}", e))?;
        }

        Ok(())
    }

    async fn get_trend_data_from_db(
        &self,
        device_id: i32,
        start_time: i64,
        end_time: i64,
        object_types: Option<Vec<i32>>
    ) -> Result<Vec<BACnetTrendData>, String> {
        let mut query = timeseries_data_2025::Entity::find()
            .join(JoinType::InnerJoin, timeseries_data_2025::Relation::BacnetObjects.def())
            .join(JoinType::InnerJoin, bacnet_objects::Relation::BacnetDevices.def())
            .filter(timeseries_data_2025::Column::DataSource.eq("bacnet"))
            .filter(timeseries_data_2025::Column::BacnetDeviceId.eq(device_id))
            .filter(timeseries_data_2025::Column::Timestamp.between(start_time, end_time))
            .order_by_desc(timeseries_data_2025::Column::Timestamp);

        if let Some(types) = object_types {
            query = query.filter(timeseries_data_2025::Column::BacnetObjectType.is_in(types));
        }

        let results = query.all(&self.db)
            .await
            .map_err(|e| format!("Database query error: {}", e))?;

        // Transform to BACnetTrendData format
        let trend_data: Vec<BACnetTrendData> = results.into_iter()
            .map(|record| BACnetTrendData {
                device_name: record.device_name.unwrap_or_default(),
                object_name: record.object_name.unwrap_or_default(),
                object_type: record.bacnet_object_type.unwrap_or(0),
                object_instance: record.bacnet_object_instance.unwrap_or(0),
                value: record.value as f32,
                timestamp: record.timestamp,
                units: record.units,
            })
            .collect();

        Ok(trend_data)
    }
}

// WebSocket/HTTP handlers integration
impl WebviewApi {
    pub async fn handle_bacnet_discover(&self) -> Result<Vec<BACnetDeviceInfo>, String> {
        self.bacnet_service.handle_discover_devices(30000).await
    }

    pub async fn handle_bacnet_start_polling(&self, device_ids: Vec<i32>) -> Result<(), String> {
        self.bacnet_service.handle_start_polling(device_ids, 300).await
    }

    pub async fn handle_bacnet_trend_data(
        &self,
        device_id: i32,
        start_time: i64,
        end_time: i64,
        object_types: Option<Vec<i32>>
    ) -> Result<Vec<BACnetTrendData>, String> {
        self.bacnet_service.handle_get_trend_data(device_id, start_time, end_time, object_types).await
    }
}

// Helper functions
fn c_str_to_string(c_str: &[i8]) -> String {
    let bytes: Vec<u8> = c_str.iter()
        .take_while(|&&b| b != 0)
        .map(|&b| b as u8)
        .collect();
    String::from_utf8_lossy(&bytes).to_string()
}
```
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

### Complete Implementation Strategy & Build Process

**Recommended Implementation Approach:**

```
Phase 1: Shared BACnet Library (Week 1-2)
├── Create BACnetSharedLibrary.dll (C++ core)
├── Implement C++ wrapper classes
├── Create Rust FFI bindings
├── Test basic device discovery and reading
└── Validate cross-language compatibility

Phase 2: Database Schema Enhancement (Week 2-3)
├── Add BACnet tables to existing SQLite schema
├── Test database access from both C++ and Rust
├── Implement thread-safe concurrent access
├── Create migration scripts for existing installations
└── Performance testing with large datasets

Phase 3: T3000 C++ Integration (Week 3-5)
├── Integrate T3000BACnetManager into T3000.exe
├── Create native BACnet window/panel for T3000 UI
├── Implement background polling service
├── Add WebView message handlers for BACnet
├── Test with existing T3000 functionality
└── Ensure no impact on legacy operations

Phase 4: Rust API Enhancement (Week 4-6)
├── Add BACnet service to t3_webview_api.dll
├── Implement WebSocket/HTTP endpoints for BACnet
├── Add coordination logic with T3000 C++ polling
├── Create fallback polling when T3000 not active
├── Test external browser integration
└── Validate TrendLogModal with BACnet data

Phase 5: Complete Integration Testing (Week 6-8)
├── End-to-end testing with real BACnet devices
├── Performance optimization and tuning
├── Memory leak detection and cleanup
├── Error handling and recovery testing
├── Documentation and user training materials
└── Production deployment preparation
```

**Build Process Integration:**

```
Enhanced Build Pipeline:

1. BACnet Shared Library Build:
   BACnetSharedLibrary (C++) → BACnetSharedLibrary.dll
   ├── Exports C API for cross-language use
   ├── Includes chosen BACnet protocol library
   └── Optimized for both T3000 and Rust usage

2. T3000 Application Build (Enhanced):
   T3000 C++ Project → T3000.exe
   ├── Links BACnetSharedLibrary.dll
   ├── Includes T3000BACnetManager
   ├── Enhanced WebView message handling
   └── New BACnet UI window/panel

3. Rust API Build (Enhanced):
   Rust API Project → t3_webview_api.dll
   ├── Links BACnetSharedLibrary.dll (via FFI)
   ├── Enhanced WebSocket/HTTP endpoints
   ├── BACnet service coordination logic
   └── Unified database access layer

4. WebView Build (Minimal Changes):
   Vue3 + TypeScript → /webview/www/
   ├── Enhanced message types for BACnet
   ├── TrendLogModal BACnet support
   ├── Device discovery UI components
   └── Backward compatibility maintained

5. Deployment Package:
   T3000 Release Folder
   ├── T3000.exe (enhanced with BACnet)
   ├── BACnetSharedLibrary.dll (new)
   ├── t3_webview_api.dll (enhanced)
   ├── /webview/www/ (enhanced)
   ├── SQLite database (enhanced schema)
   └── BACnet configuration files
```

**Runtime Coordination Strategy:**

```
Intelligent Polling Coordination:

1. T3000 Application Startup:
   ├── Initialize SQLite database (enhanced schema)
   ├── Load BACnetSharedLibrary.dll
   ├── Start backend process (Rust API with BACnet support)
   ├── Check for saved BACnet configuration
   └── Optionally start BACnet services based on user preference

2. User Scenario A - T3000 BACnet Panel Usage:
   User opens T3000 BACnet panel
   ├── T3000BACnetManager starts polling
   ├── Sets database flag "T3000_POLLING_ACTIVE"
   ├── Rust API detects flag and defers to T3000
   ├── Both UI (T3000 panel + browser) read from same database
   └── Real-time synchronization via database triggers/notifications

3. User Scenario B - Browser-Only Usage:
   User opens http://localhost:9103 (T3000 runs minimized)
   ├── Browser requests BACnet data via WebSocket
   ├── Rust API checks "T3000_POLLING_ACTIVE" flag
   ├── If false: Rust API starts BACnet polling
   ├── If true: Rust API serves data from database
   └── Seamless experience regardless of polling source

4. User Scenario C - Hybrid Usage:
   Both T3000 panel and browser active
   ├── T3000 handles polling (primary)
   ├── Browser gets real-time updates via WebSocket
   ├── Database serves as single source of truth
   ├── No duplicate polling overhead
   └── Consistent data across all interfaces
```

**Database Coordination Design:**

```sql
-- Enhanced SQLite schema for coordination
-- Add coordination table for intelligent polling

CREATE TABLE bacnet_coordination (
    id INTEGER PRIMARY KEY DEFAULT 1,
    t3000_polling_active INTEGER DEFAULT 0,
    rust_polling_active INTEGER DEFAULT 0,
    last_t3000_poll INTEGER DEFAULT 0,
    last_rust_poll INTEGER DEFAULT 0,
    active_poller TEXT DEFAULT NULL, -- 't3000' or 'rust'
    polling_interval INTEGER DEFAULT 300,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now')),
    CHECK (id = 1) -- Ensure single row
);

-- Initialize coordination row
INSERT INTO bacnet_coordination (id) VALUES (1);

-- Triggers for automatic coordination
CREATE TRIGGER update_coordination_timestamp
AFTER UPDATE ON bacnet_coordination
BEGIN
    UPDATE bacnet_coordination SET updated_at = strftime('%s', 'now') WHERE id = 1;
END;

-- View for easy status checking
CREATE VIEW bacnet_status AS
SELECT
    CASE
        WHEN t3000_polling_active = 1 THEN 'T3000 Active'
        WHEN rust_polling_active = 1 THEN 'Rust API Active'
        ELSE 'No Active Polling'
    END as polling_status,
    active_poller,
    datetime(last_t3000_poll, 'unixepoch') as last_t3000_poll_time,
    datetime(last_rust_poll, 'unixepoch') as last_rust_poll_time,
    polling_interval,
    datetime(updated_at, 'unixepoch') as last_update
FROM bacnet_coordination WHERE id = 1;
```

**Communication Protocol Design:**

```javascript
// Enhanced WebView message protocol
// Supports both built-in browser and external browser

// New BACnet message types (extend existing protocol)
const BACnetMessageTypes = {
    // Device management
    BACNET_DISCOVER: 25,
    BACNET_DISCOVER_RES: 'BACNET_DISCOVER_RES',
    BACNET_ADD_DEVICE: 26,
    BACNET_REMOVE_DEVICE: 27,

    // Data requests
    BACNET_TREND_DATA: 28,
    BACNET_TREND_DATA_RES: 'BACNET_TREND_DATA_RES',
    BACNET_REALTIME_DATA: 29,
    BACNET_REALTIME_DATA_RES: 'BACNET_REALTIME_DATA_RES',

    // Polling control
    BACNET_START_POLLING: 30,
    BACNET_STOP_POLLING: 31,
    BACNET_POLLING_STATUS: 32,
    BACNET_POLLING_STATUS_RES: 'BACNET_POLLING_STATUS_RES',

    // Configuration
    BACNET_CONFIG_GET: 33,
    BACNET_CONFIG_SET: 34,
    BACNET_CONFIG_RES: 'BACNET_CONFIG_RES',
};

// Enhanced bridge for universal usage
class UniversalBACnetBridge {
    static sendMessage(messageType, data) {
        const message = {
            action: messageType,
            timestamp: Date.now(),
            source: 'webview',
            ...data
        };

        // Built-in browser: use postMessage
        if (window.chrome?.webview?.postMessage) {
            window.chrome.webview.postMessage(message);
        }
        // External browser: use WebSocket
        else if (window.T3000WebSocket?.send) {
            window.T3000WebSocket.send(JSON.stringify(message));
        }
        // Fallback: HTTP API
        else {
            this.sendHTTPRequest(message);
        }
    }

    static requestBACnetDiscovery(timeout = 30000) {
        this.sendMessage(BACnetMessageTypes.BACNET_DISCOVER, {
            timeout: timeout,
            autoAdd: true
        });
    }

    static requestTrendData(deviceId, objectTypes, timeRange) {
        this.sendMessage(BACnetMessageTypes.BACNET_TREND_DATA, {
            deviceId: deviceId,
            objectTypes: objectTypes,
            startTime: timeRange.start,
            endTime: timeRange.end,
            maxPoints: 1000,
            includeRealtime: true
        });
    }

    static startPolling(deviceIds, interval = 300) {
        this.sendMessage(BACnetMessageTypes.BACNET_START_POLLING, {
            deviceIds: deviceIds,
            intervalSeconds: interval,
            preferT3000: true // Prefer T3000 polling when available
        });
    }
}
```

### Next Steps and Recommendations

**Immediate Actions Required:**

1. **BACnet Library Selection**:
   - Evaluate open-source options (YABE-based, BACnet4J, others)
   - Test compatibility with T3000 build environment
   - Verify license compatibility for commercial use

2. **T3000 Source Code Access**:
   - Provide specific files related to:
     - SQLite database integration patterns
     - WebView message handling implementation
     - Window/dialog creation patterns
     - Threading and background service patterns

3. **Database Testing**:
   - Test SQLite concurrent access patterns
   - Validate performance with large datasets
   - Test WAL mode for better concurrency

4. **Development Environment Setup**:
   - Set up build environment for shared library
   - Test FFI integration between C++ and Rust
   - Validate deployment scenarios

**Risk Mitigation Priorities:**

1. **Database Concurrency**: Implement robust locking and coordination
2. **Memory Management**: Careful resource cleanup in shared library
3. **Performance Impact**: Ensure BACnet polling doesn't affect T3000 performance
4. **Backward Compatibility**: Maintain existing T3000 and WebView functionality

**Success Metrics:**

- ✅ Single SQLite database serves both T3000 and browser interfaces
- ✅ Intelligent polling coordination (no duplicate network traffic)
- ✅ Seamless user experience across all usage scenarios
- ✅ Zero impact on existing T3000 functionality
- ✅ TrendLogModal works with both legacy and BACnet data
- ✅ Real-time synchronization between T3000 panel and browser

This comprehensive solution provides a complete integration path while maintaining all existing functionality and providing the flexibility you need for different usage scenarios.

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
