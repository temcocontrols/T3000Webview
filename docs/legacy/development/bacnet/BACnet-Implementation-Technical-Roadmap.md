# BACnet Implementation Technical Roadmap

**Date:** July 29, 2025
**Project:** T3000 BACnet Data Polling System
**Document Type:** Technical Implementation Plan

## Overview

This document provides a detailed technical roadmap for implementing the BACnet-based data polling system that will replace Temco's proprietary trend log structures with standard BACnet protocols and SQLite storage.

**Updated Status:** ✅ T3000 source code analysis complete with symbolic link access established.

## CRITICAL DISCOVERY: T3000 Already Has BACnet Implementation! 🎯

**Major Finding**: T3000 contains a complete, production-ready BACnet stack that eliminates the need for external libraries like Node-BACnet.

### **Existing T3000 BACnet Infrastructure:**

#### 1. **Complete C# BACnet Stack**
- **`System.IO.BACnet`** namespace with full protocol implementation
- **`BACnetClient.cs`**: 2,724 lines of mature BACnet client code
- **`TrendLogDisplay.cs`**: Complete BACnet trend log visualization (375 lines)
- **Supports**: WHO-IS/I-AM, ReadProperty, ReadPropertyMultiple, WriteProperty, COV

#### 2. **T3000 WebView Integration (Already Exists!)**
- **`BacnetWebView.cpp`**: WebView2 integration with 2,487 lines of code
- **`webview_run_server()`**: Server function already implemented
- **`HandleWebViewMsg()`**: JSON message processing framework
- **WebView Message Types**: Pre-defined enum for communication

#### 3. **BACnet Tools & UI**
- **`TemcoStandardBacnetTool`**: Complete BACnet testing and management tool
- **YABE Integration**: `BacnetExplore/Yabe/` - BACnet browser
- **Native C++ Library**: `BacNetDllforVc/` - Core BACnet functionality

#### 4. **Device & Data Management**
- **SQLite Integration**: CppSQLite3 already used throughout T3000
- **Building Database**: Established patterns in `g_strCurBuildingDatabasefilePath`
- **Device Communication**: Serial, Ethernet, WiFi, Modbus RTU, BACnet IP & MSTP

## REVISED IMPLEMENTATION STRATEGY

### Instead of Node-BACnet: **Extend Existing T3000 BACnet Stack**

#### Phase 1: Extend T3000 BACnet Message Types
```cpp
// Add to existing WEBVIEW_MESSAGE_TYPE enum in BacnetWebView.cpp
enum WEBVIEW_MESSAGE_TYPE
{
    // ... existing types ...
    BACNET_DISCOVER_DEVICES = 15,
    BACNET_START_TREND_POLLING = 16,
    BACNET_STOP_TREND_POLLING = 17,
    BACNET_GET_TREND_DATA = 18,
    BACNET_CONFIG_POLLING = 19
};
```

#### Phase 2: Extend HandleWebViewMsg for BACnet Operations
```cpp
// Add to existing HandleWebViewMsg function in BacnetWebView.cpp
void HandleWebViewMsg(CString msg, CString &outmsg, int msg_source = 0)
{
    // ... existing switch cases ...

    case WEBVIEW_MESSAGE_TYPE::BACNET_DISCOVER_DEVICES:
        DiscoverBACnetT3TBDevices(json, tempjson);
        break;

    case WEBVIEW_MESSAGE_TYPE::BACNET_START_TREND_POLLING:
        StartBACnetTrendPolling(json, tempjson);
        break;

    case WEBVIEW_MESSAGE_TYPE::BACNET_GET_TREND_DATA:
        GetBACnetTrendData(json, tempjson);
        break;
}
```

#### Phase 3: Utilize Existing BACnet Classes
```cpp
// Leverage existing T3000 BACnet implementation
#include "TemcoStandardBacnetToolScr/BACnetClient.h"
#include "TemcoStandardBacnetToolScr/T3000BacnetTool.h"

void DiscoverBACnetT3TBDevices(Json::Value& request, Json::Value& response)
{
    // Use existing BacnetClient from T3000BacnetTool
    System::IO::BACnet::BacnetClient* client = GetExistingBACnetClient();

    // Leverage existing device discovery functionality
    // Target T3-TB devices specifically (device types 84, 203)
}
```

#### Phase 4: Database Integration with Existing SQLite
```cpp
// Extend existing T3000 database patterns
void StoreBACnetTrendData(int deviceId, BacnetObjectId objectId, BacnetValue value)
{
    // Use existing CppSQLite3 patterns from T3000
    CppSQLite3DB database;
    database.open(g_strCurBuildingDatabasefilePath);

    // Extend existing Building table or create BACnet-specific tables
    CString sql;
    sql.Format(_T("INSERT INTO bacnet_sensor_data (device_id, object_type, object_instance, value, timestamp) VALUES (%d, %d, %d, %f, %d)"),
               deviceId, objectId.type, objectId.instance, value, time(NULL));

    database.execDML(sql);
}
```

## IMPLEMENTATION PHASES (REVISED)

### Phase 1: Extend Existing T3000 BACnet Integration ⚡
**Duration**: 1-2 weeks
**Leverage**: Existing `BacnetWebView.cpp`, `HandleWebViewMsg()`, `BACnetClient.cs`

1. **Add BACnet Message Types**: Extend existing `WEBVIEW_MESSAGE_TYPE` enum
2. **Enhance WebView Handler**: Add BACnet cases to `HandleWebViewMsg()`
3. **Device Discovery**: Use existing `BacnetClient` for T3-TB device discovery
4. **Testing**: Validate with existing `TemcoStandardBacnetTool`

### Phase 2: T3-TB Specific Polling Engine 🎯
**Duration**: 2-3 weeks
**Leverage**: Existing `TrendLogDisplay.cs`, device type constants

1. **T3-TB Object Mapping**: Configure for device types 84 (8DI/8DO) and 203 (11AI)
2. **Polling Implementation**: Use existing BACnet ReadPropertyMultiple
3. **Data Storage**: Extend current SQLite database schema
4. **WebView Communication**: Stream data via existing message framework

### Phase 3: UI Integration with T3000 🖥️
**Duration**: 1-2 weeks
**Leverage**: Existing trend log UI, WebView integration

1. **Trend Visualization**: Extend existing trend log display components
2. **Device Management**: Integrate with existing BACnet device list UI
3. **Configuration UI**: Use existing dialog patterns for polling setup
4. **Real-time Updates**: Via existing WebView message streaming

### Phase 4: Production Optimization 🚀
**Duration**: 1-2 weeks
**Leverage**: Existing error handling, performance patterns

1. **Error Handling**: Use existing T3000 error management patterns
2. **Performance**: Optimize using existing background threading
3. **Integration Testing**: With existing T3000 device communication
4. **Documentation**: Update existing BACnet tool documentation

## ADVANTAGES OF USING EXISTING T3000 BACNET STACK

### ✅ **Technical Benefits**
- **Mature Codebase**: 2,724+ lines of proven BACnet implementation
- **Native Performance**: C++ implementation vs. Node.js overhead
- **Seamless Integration**: Uses existing T3000 patterns and infrastructure
- **Advanced Features**: Block reads, segmentation, MSTP support built-in

### ✅ **Development Benefits**
- **Faster Implementation**: Extend existing vs. build from scratch
- **Lower Risk**: Proven technology already in production
- **Better Testing**: Can use existing `TemcoStandardBacnetTool` for validation
- **Consistent Architecture**: Follows T3000 design patterns

### ✅ **Maintenance Benefits**
- **Single Codebase**: No external library dependencies
- **Existing Support**: T3000 team already maintains BACnet stack
- **Known Performance**: Battle-tested in production environments
- **Future Compatibility**: Guaranteed compatibility with T3000 evolution

## NEXT IMMEDIATE ACTIONS

### Week 1: Analysis & Planning
1. **Study Existing Code**: Deep dive into `BACnetClient.cs` and `TrendLogDisplay.cs`
2. **Test Current Tools**: Use `TemcoStandardBacnetTool` to discover and poll T3-TB devices
3. **Plan Integration**: Map existing BACnet functions to trend log requirements

### Week 2: Core Extension
1. **Extend Message Types**: Add BACnet trend polling to `WEBVIEW_MESSAGE_TYPE`
2. **Implement Handlers**: Add BACnet cases to `HandleWebViewMsg()`
3. **Test Integration**: Verify WebView ↔ BACnet communication

### Week 3: T3-TB Implementation
1. **Device Discovery**: Target T3-TB devices using existing discovery
2. **Object Mapping**: Configure AI/DI/DO objects for device types 84/203
3. **Polling Engine**: Implement using existing ReadPropertyMultiple

This approach leverages **existing, proven T3000 BACnet infrastructure** instead of introducing new dependencies, resulting in faster development, better integration, and lower maintenance overhead.

## Technical Implementation Details

### 1. SQLite Setup and Configuration

#### Installation Requirements
```sql
-- SQLite Integration (Embedded Database)
-- 1. Use existing T3000 CppSQLite3 infrastructure
-- 2. Extend current database schema
-- 3. Maintain compatibility with existing T3000 data

-- Following T3000 pattern from ApplyGraphicLabelsDlg.cpp:
#include "../SQLiteDriver/CppSQLite3.h"

CppSQLite3DB SqliteDBBuilding;
SqliteDBBuilding.open((UTF8MBSTR)g_strCurBuildingDatabasefilePath);
```

#### Schema Design
```sql
-- Extend existing T3000 database schema
-- Device registry table (enhance existing)
CREATE TABLE IF NOT EXISTS bacnet_device_mapping (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id INTEGER NOT NULL,
    bacnet_device_instance INTEGER UNIQUE NOT NULL,
    device_name TEXT NOT NULL,
    ip_address TEXT,
    port INTEGER DEFAULT 47808,
    vendor_id INTEGER,
    model_name TEXT,
    firmware_version TEXT,
    supports_block_read INTEGER DEFAULT 0,
    last_seen INTEGER DEFAULT (strftime('%s', 'now')),
    status TEXT DEFAULT 'active',
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Object registry table
CREATE TABLE IF NOT EXISTS bacnet_objects (
    object_id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id INTEGER REFERENCES bacnet_device_mapping(device_id),
    object_type TEXT NOT NULL, -- 'AI', 'AO', 'DI', 'DO', etc.
    object_instance INTEGER NOT NULL,
    object_name TEXT,
    description TEXT,
    units TEXT,
    cov_increment REAL,
    poll_interval INTEGER DEFAULT 30, -- seconds
    enabled INTEGER DEFAULT 1,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    UNIQUE(device_id, object_type, object_instance)
);

-- Main time-series data table
CREATE TABLE IF NOT EXISTS bacnet_sensor_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    device_id INTEGER NOT NULL,
    object_id INTEGER NOT NULL REFERENCES bacnet_objects(object_id),
    object_type TEXT NOT NULL,
    object_instance INTEGER NOT NULL,
    value REAL,
    quality TEXT DEFAULT 'good',
    raw_value TEXT, -- Store original BACnet value for debugging
    poll_duration_ms INTEGER, -- Performance tracking
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_bacnet_sensor_data_device_time
    ON bacnet_sensor_data (device_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_bacnet_sensor_data_object_time
    ON bacnet_sensor_data (object_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_bacnet_sensor_data_type_time
    ON bacnet_sensor_data (object_type, timestamp DESC);

-- Polling coordination for multi-client access
CREATE TABLE IF NOT EXISTS bacnet_polling_coordination (
    id INTEGER PRIMARY KEY,
    device_id INTEGER NOT NULL,
    client_type TEXT NOT NULL, -- 'panel', 'browser', 'hybrid'
    client_id TEXT NOT NULL,
    last_poll_time INTEGER,
    poll_interval INTEGER,
    is_active INTEGER DEFAULT 1,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
);
```

### 2. BACnet Implementation Strategy

#### Device Discovery Implementation
```typescript
interface BACnetDevice {
    deviceId: number;
    ipAddress: string;
    port: number;
    vendorId: number;
    modelName: string;
    firmwareVersion: string;
    supportsBlockRead: boolean;
    objects: BACnetObject[];
}

interface BACnetObject {
    objectType: 'AI' | 'AO' | 'DI' | 'DO' | 'AV' | 'BV';
    objectInstance: number;
    objectName: string;
    description?: string;
    units?: string;
    presentValue?: any;
}

class BACnetDiscovery {
    async discoverDevices(networkRange: string): Promise<BACnetDevice[]> {
        // Implementation for WHO-IS broadcast and I-AM responses
    }

    async enumerateObjects(device: BACnetDevice): Promise<BACnetObject[]> {
        // Implementation for object enumeration
    }

    async testBlockReadSupport(device: BACnetDevice): Promise<boolean> {
        // Test if device supports ReadPropertyMultiple
    }
}
```

#### Polling Engine Implementation
```typescript
class BACnetPollingEngine {
    private devices: Map<number, BACnetDevice> = new Map();
    private pollingIntervals: Map<number, NodeJS.Timer> = new Map();

    async startPolling(device: BACnetDevice, intervalSeconds: number) {
        const interval = setInterval(async () => {
            try {
                if (device.supportsBlockRead) {
                    await this.performBlockRead(device);
                } else {
                    await this.performIndividualReads(device);
                }
            } catch (error) {
                await this.handlePollingError(device, error);
            }
        }, intervalSeconds * 1000);

        this.pollingIntervals.set(device.deviceId, interval);
    }

    private async performBlockRead(device: BACnetDevice): Promise<void> {
        // Implementation for ReadPropertyMultiple
        // Group objects by type for efficient reading
        const objectGroups = this.groupObjectsForBlockRead(device.objects);

        for (const group of objectGroups) {
            const startTime = performance.now();
            const results = await this.bacnetClient.readPropertyMultiple(
                device.ipAddress,
                device.port,
                group
            );
            const duration = performance.now() - startTime;

            await this.storeResults(device, results, duration);
        }
    }

    private async performIndividualReads(device: BACnetDevice): Promise<void> {
        // Fallback for devices without block read support
        for (const object of device.objects) {
            try {
                const startTime = performance.now();
                const value = await this.bacnetClient.readProperty(
                    device.ipAddress,
                    device.port,
                    object.objectType,
                    object.objectInstance,
                    'present-value'
                );
                const duration = performance.now() - startTime;

                await this.storeResult(device, object, value, duration);
            } catch (error) {
                await this.handleObjectError(device, object, error);
            }
        }
    }
}
```

### 3. Data Storage and Management

#### Data Ingestion Pipeline
```typescript
class DataStorageManager {
    private db: Pool; // PostgreSQL connection pool
    private batchBuffer: SensorReading[] = [];
    private batchSize = 1000;
    private flushInterval = 5000; // 5 seconds

    constructor() {
        // Setup periodic batch flush
        setInterval(() => this.flushBatch(), this.flushInterval);
    }

    async storeSensorReading(reading: SensorReading): Promise<void> {
        this.batchBuffer.push(reading);

        if (this.batchBuffer.length >= this.batchSize) {
            await this.flushBatch();
        }
    }

    private async flushBatch(): Promise<void> {
        if (this.batchBuffer.length === 0) return;

        const batch = this.batchBuffer.splice(0);

        try {
            await this.db.query(`
                INSERT INTO sensor_data (
                    timestamp, device_id, object_id, object_type,
                    object_instance, value, quality, raw_value, poll_duration_ms
                ) VALUES ${batch.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ')}
            `, batch.flatMap(r => [
                r.timestamp, r.deviceId, r.objectId, r.objectType,
                r.objectInstance, r.value, r.quality, r.rawValue, r.pollDuration
            ]));
        } catch (error) {
            console.error('Batch insert failed:', error);
            // Implement retry logic or dead letter queue
        }
    }
}
```

### 4. Performance Optimization Strategies

#### Block Read Optimization
```typescript
class BlockReadOptimizer {
    // Group objects to maximize block read efficiency
    groupObjectsForBlockRead(objects: BACnetObject[]): BACnetObject[][] {
        const groups: BACnetObject[][] = [];
        const maxObjectsPerRead = 50; // Configurable based on device capabilities

        // Group by object type first for better performance
        const typeGroups = objects.reduce((acc, obj) => {
            if (!acc[obj.objectType]) acc[obj.objectType] = [];
            acc[obj.objectType].push(obj);
            return acc;
        }, {} as Record<string, BACnetObject[]>);

        // Split each type group into chunks
        Object.values(typeGroups).forEach(typeObjects => {
            for (let i = 0; i < typeObjects.length; i += maxObjectsPerRead) {
                groups.push(typeObjects.slice(i, i + maxObjectsPerRead));
            }
        });

        return groups;
    }
}
```

#### Network Optimization
```typescript
class NetworkOptimizer {
    private connectionPool: Map<string, BACnetConnection> = new Map();

    async getConnection(ipAddress: string, port: number): Promise<BACnetConnection> {
        const key = `${ipAddress}:${port}`;

        if (!this.connectionPool.has(key)) {
            const connection = new BACnetConnection(ipAddress, port);
            await connection.connect();
            this.connectionPool.set(key, connection);
        }

        return this.connectionPool.get(key)!;
    }

    // Implement connection health monitoring and recycling
    async monitorConnections(): Promise<void> {
        for (const [key, connection] of this.connectionPool) {
            if (!connection.isHealthy()) {
                await connection.reconnect();
            }
        }
    }
}
```

## Integration Points with T3000

### 1. UI Component Integration

#### Trend Log Icon Implementation
```typescript
// Icon component for trend logs
const TrendLogIcon: React.FC<{ size?: number; className?: string }> = ({
    size = 16,
    className = ''
}) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        className={`trend-icon ${className}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
    >
        <path
            d="M3 17L9 11L13 15L21 7"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <path
            d="M21 7H16M21 7V12"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <rect
            x="2"
            y="3"
            width="20"
            height="18"
            rx="2"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
        />
    </svg>
);
```

#### Data Visualization Components
```typescript
interface TrendChartProps {
    deviceId: number;
    objectId: number;
    timeRange: { start: Date; end: Date };
    aggregation?: 'raw' | 'hourly' | 'daily';
}

const TrendChart: React.FC<TrendChartProps> = ({
    deviceId,
    objectId,
    timeRange,
    aggregation = 'raw'
}) => {
    const { data, loading, error } = useTrendData({
        deviceId,
        objectId,
        timeRange,
        aggregation
    });

    // Implement Chart.js or similar visualization
    return (
        <div className="trend-chart">
            {loading && <div>Loading trend data...</div>}
            {error && <div>Error: {error.message}</div>}
            {data && <LineChart data={data} />}
        </div>
    );
};
```

### 2. Configuration Management

#### Auto-Configuration Service
```typescript
class AutoConfigurationService {
    async generatePointConfiguration(devices: BACnetDevice[]): Promise<PointConfiguration> {
        const config: PointConfiguration = {
            logicalGroups: [],
            pollingSchedules: [],
            alertRules: []
        };

        // AI-assisted grouping logic
        for (const device of devices) {
            const groups = await this.analyzeAndGroupPoints(device);
            config.logicalGroups.push(...groups);
        }

        return config;
    }

    private async analyzeAndGroupPoints(device: BACnetDevice): Promise<LogicalGroup[]> {
        // Implement AI-assisted point grouping
        // Group by location, function, system type, etc.
        return [];
    }
}
```

## Error Handling and Resilience

### Error Recovery Strategies
```typescript
class ErrorHandler {
    private retryQueue: Map<string, RetryItem> = new Map();

    async handlePollingError(device: BACnetDevice, error: Error): Promise<void> {
        const key = `${device.deviceId}-${Date.now()}`;

        if (this.isTransientError(error)) {
            // Add to retry queue with exponential backoff
            this.retryQueue.set(key, {
                device,
                retryCount: 0,
                maxRetries: 5,
                nextRetry: Date.now() + 1000
            });
        } else {
            // Log permanent error and mark device as problematic
            await this.markDeviceProblematic(device, error);
        }
    }

    private isTransientError(error: Error): boolean {
        // Classify errors as transient (network issues) or permanent (configuration issues)
        return error.message.includes('timeout') ||
               error.message.includes('connection') ||
               error.message.includes('unreachable');
    }
}
```

## Implementation Phases

### Phase 1: BACnet Library Installation and T3000 Integration

#### Node-BACnet Library Setup
```bash
# Install BACnet library in WebView project
npm install node-bacnet --save
npm install @types/node-bacnet --save-dev
```

#### T3000 BACnet Bridge Implementation
```typescript
// src/lib/bacnet/BACnetT3000Bridge.ts
import * as BACnet from 'node-bacnet';

export class BACnetT3000Bridge {
    private client: any;
    private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();
    private activeDevices: Map<number, T3TBDevice> = new Map();

    constructor() {
        // Initialize BACnet client with T3000 compatible settings
        this.client = new BACnet({
            port: 47808,
            interface: '0.0.0.0',
            broadcastAddress: '255.255.255.255'
        });
    }

    // Following T3000 webview_run_server pattern from BacnetWebView.cpp
    async initializeT3000Integration(): Promise<void> {
        try {
            await this.client.open();
            await this.initializeSQLiteSchema();

            // Follow T3000 WebView message handling pattern
            this.setupWebViewMessageHandling();

            console.log('BACnet T3000 bridge initialized');
        } catch (error) {
            console.error('Failed to initialize BACnet bridge:', error);
            throw error;
        }
    }

    // Extend existing T3000 WebView message handling
    // Based on HandleWebViewMsg pattern in T3000 source
    handleT3000WebMessage(message: any): void {
        switch (message.type) {
            case 'bacnet_discover_devices':
                this.discoverT3TBDevices();
                break;
            case 'bacnet_start_polling':
                this.startPollingForDevice(message.deviceId);
                break;
            case 'bacnet_stop_polling':
                this.stopPollingForDevice(message.deviceId);
                break;
            case 'bacnet_get_trend_data':
                this.getTrendDataForObject(message.objectId, message.timeRange);
                break;
            // Integrate with existing T3000 message types
            default:
                console.warn('Unknown BACnet message type:', message.type);
        }
    }

    // Follow T3000 AfxBeginThread pattern for background operations
    private async discoverT3TBDevices(): Promise<void> {
        // Implement T3-TB specific device discovery
        // Target devices with constants: T3_TB (84), T3_TB_11I (203)
        try {
            const devices = await this.performWhoIsDiscovery();

            // Filter for T3-TB devices based on vendor ID and model
            const t3tbDevices = devices.filter(device =>
                this.isT3TBDevice(device)
            );

            // Store in SQLite using T3000 CppSQLite3 pattern
            await this.storeDiscoveredDevices(t3tbDevices);

            // Notify WebView of discovered devices
            this.notifyWebViewDiscoveryComplete(t3tbDevices);
        } catch (error) {
            console.error('T3-TB device discovery failed:', error);
        }
    }

    // Implement T3-TB device identification
    private isT3TBDevice(device: any): boolean {
        // Based on T3000 source analysis:
        // T3_TB: 84 (8DI/8DO)
        // T3_TB_11I: 203 (11AI)
        // Check vendor ID and model patterns
        return device.vendorId === 644 && // Temco Controls vendor ID
               (device.modelName?.includes('T3-TB') ||
                device.deviceType === 84 ||
                device.deviceType === 203);
    }

    // SQLite integration using T3000 CppSQLite3 patterns
    private async initializeSQLiteSchema(): Promise<void> {
        // Follow T3000 database patterns from ApplyGraphicLabelsDlg.cpp
        // Use existing g_strCurBuildingDatabasefilePath approach
        const dbPath = this.getT3000DatabasePath();

        // Extend existing T3000 database with BACnet tables
        await this.executeSQLiteSchema(dbPath);
    }
}

// T3-TB Device Interface (based on T3000 source analysis)
interface T3TBDevice {
    deviceId: number;
    deviceType: number; // 84 (T3_TB) or 203 (T3_TB_11I)
    ipAddress: string;
    port: number;
    vendorId: number;
    modelName: string;
    analogInputs: number;   // 0 for T3_TB, 11 for T3_TB_11I
    digitalInputs: number;  // 8 for T3_TB, 0 for T3_TB_11I
    digitalOutputs: number; // 8 for T3_TB, 0 for T3_TB_11I
    supportsBlockRead: boolean;
    firmwareVersion?: string;
}
```

### Phase 2: SQLite Database Enhancement

#### Extend T3000 Database Schema
```sql
-- Following T3000 CppSQLite3 patterns
-- Extend existing building database schema

-- Add BACnet device mapping (integrate with existing device tables)
ALTER TABLE Building ADD COLUMN bacnet_device_instance INTEGER;
ALTER TABLE Building ADD COLUMN bacnet_vendor_id INTEGER;
ALTER TABLE Building ADD COLUMN bacnet_model_name TEXT;
ALTER TABLE Building ADD COLUMN supports_block_read INTEGER DEFAULT 0;

-- Create BACnet-specific tables (new additions)
CREATE TABLE IF NOT EXISTS bacnet_objects (
    object_id INTEGER PRIMARY KEY AUTOINCREMENT,
    building_id INTEGER REFERENCES Building(Unique_ID),
    object_type TEXT NOT NULL, -- 'AI', 'DI', 'DO'
    object_instance INTEGER NOT NULL,
    object_name TEXT,
    description TEXT,
    units TEXT,
    poll_interval INTEGER DEFAULT 30,
    enabled INTEGER DEFAULT 1,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    UNIQUE(building_id, object_type, object_instance)
);

-- Enhanced sensor data table for BACnet trend logs
CREATE TABLE IF NOT EXISTS bacnet_sensor_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    building_id INTEGER NOT NULL,
    object_id INTEGER NOT NULL REFERENCES bacnet_objects(object_id),
    object_type TEXT NOT NULL,
    object_instance INTEGER NOT NULL,
    value REAL,
    quality TEXT DEFAULT 'good',
    raw_value TEXT,
    poll_duration_ms INTEGER,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Indexes for trend log performance
CREATE INDEX IF NOT EXISTS idx_bacnet_data_building_time
    ON bacnet_sensor_data (building_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_bacnet_data_object_time
    ON bacnet_sensor_data (object_id, timestamp DESC);
```

### Phase 3: WebView Message Protocol Extension

#### Extend T3000 WebView Communication
```typescript
// src/lib/webview/BACnetWebViewHandler.ts
// Based on T3000 WebViewClient.ts and WebSocketClient.ts patterns

export class BACnetWebViewHandler {
    private bacnetBridge: BACnetT3000Bridge;
    private webViewClient: WebViewClient;
    private webSocketClient: WebSocketClient;

    constructor() {
        this.bacnetBridge = new BACnetT3000Bridge();

        // Initialize existing T3000 WebView clients
        this.webViewClient = new WebViewClient();
        this.webSocketClient = new WebSocketClient();

        this.setupBACnetMessageHandlers();
    }

    // Extend existing T3000 message handling
    private setupBACnetMessageHandlers(): void {
        // Extend WebViewClient for T3000 panel
        this.webViewClient.addMessageHandler('bacnet', (message) => {
            this.bacnetBridge.handleT3000WebMessage(message);
        });

        // Extend WebSocketClient for browser-only mode
        this.webSocketClient.addMessageHandler('bacnet', (message) => {
            this.bacnetBridge.handleT3000WebMessage(message);
        });
    }

    // BACnet-specific message types for T3000 integration
    sendBACnetDeviceList(devices: T3TBDevice[]): void {
        const message = {
            type: 'bacnet_device_list',
            devices: devices,
            timestamp: Date.now()
        };

        // Send to both T3000 panel and browser clients
        this.webViewClient.sendMessage(message);
        this.webSocketClient.broadcast(message);
    }

    sendBACnetTrendData(objectId: number, data: any[]): void {
        const message = {
            type: 'bacnet_trend_data',
            objectId: objectId,
            data: data,
            timestamp: Date.now()
        };

        this.webViewClient.sendMessage(message);
        this.webSocketClient.broadcast(message);
    }
}
```

### Phase 4: T3-TB Device Polling Implementation

#### T3-TB Specific Polling Engine
```typescript
// src/lib/bacnet/T3TBPollingEngine.ts
// Based on T3000 CTrendLogView and CTrendLogWnd patterns

export class T3TBPollingEngine {
    private devices: Map<number, T3TBDevice> = new Map();
    private pollingIntervals: Map<number, NodeJS.Timeout> = new Map();
    private bacnetClient: any;

    constructor(bacnetClient: any) {
        this.bacnetClient = bacnetClient;
    }

    // Start polling T3-TB device (replace T3000 trend log functionality)
    async startT3TBPolling(device: T3TBDevice, intervalSeconds: number): Promise<void> {
        try {
            // Configure T3-TB specific object mapping
            const objectMap = this.createT3TBObjectMap(device);

            const interval = setInterval(async () => {
                await this.pollT3TBDevice(device, objectMap);
            }, intervalSeconds * 1000);

            this.pollingIntervals.set(device.deviceId, interval);

            console.log(`Started polling T3-TB device ${device.deviceId}`);
        } catch (error) {
            console.error(`Failed to start polling T3-TB device ${device.deviceId}:`, error);
        }
    }

    // Create T3-TB specific object mapping
    private createT3TBObjectMap(device: T3TBDevice): BACnetObjectMap {
        const objectMap: BACnetObjectMap = {
            analogInputs: [],
            digitalInputs: [],
            digitalOutputs: []
        };

        // Based on T3000 source analysis
        if (device.deviceType === 84) { // T3_TB
            // 8 Digital Inputs (DI 0-7)
            for (let i = 0; i < 8; i++) {
                objectMap.digitalInputs.push({
                    objectType: 'DI',
                    objectInstance: i,
                    objectName: `DI_${i}`,
                    pollEnabled: true
                });
            }

            // 8 Digital Outputs (DO 0-7)
            for (let i = 0; i < 8; i++) {
                objectMap.digitalOutputs.push({
                    objectType: 'DO',
                    objectInstance: i,
                    objectName: `DO_${i}`,
                    pollEnabled: true
                });
            }
        } else if (device.deviceType === 203) { // T3_TB_11I
            // 11 Analog Inputs (AI 0-10)
            for (let i = 0; i < 11; i++) {
                objectMap.analogInputs.push({
                    objectType: 'AI',
                    objectInstance: i,
                    objectName: `AI_${i}`,
                    pollEnabled: true,
                    units: 'unknown' // Will be read from device
                });
            }
        }

        return objectMap;
    }

    // Poll T3-TB device and store data (replace T3000 trend log storage)
    private async pollT3TBDevice(device: T3TBDevice, objectMap: BACnetObjectMap): Promise<void> {
        const startTime = performance.now();

        try {
            const pollResults: BACnetPollResult[] = [];

            // Read all objects for this device
            if (device.supportsBlockRead) {
                // Use ReadPropertyMultiple for efficiency
                const blockResults = await this.performBlockRead(device, objectMap);
                pollResults.push(...blockResults);
            } else {
                // Fall back to individual reads
                const individualResults = await this.performIndividualReads(device, objectMap);
                pollResults.push(...individualResults);
            }

            const pollDuration = performance.now() - startTime;

            // Store results in SQLite using T3000 patterns
            await this.storePollResults(device, pollResults, pollDuration);

            // Update T3000 WebView with new data (replace trend log updates)
            this.notifyWebViewDataUpdate(device, pollResults);

        } catch (error) {
            console.error(`Polling failed for T3-TB device ${device.deviceId}:`, error);
            await this.handlePollingError(device, error);
        }
    }
}

interface BACnetObjectMap {
    analogInputs: BACnetObjectInfo[];
    digitalInputs: BACnetObjectInfo[];
    digitalOutputs: BACnetObjectInfo[];
}

interface BACnetObjectInfo {
    objectType: 'AI' | 'DI' | 'DO';
    objectInstance: number;
    objectName: string;
    pollEnabled: boolean;
    units?: string;
}

interface BACnetPollResult {
    objectType: string;
    objectInstance: number;
    value: any;
    timestamp: number;
    quality: string;
}
```

## Testing Strategy

### Integration Testing
```typescript
describe('T3000 BACnet Integration', () => {
    let bacnetBridge: BACnetT3000Bridge;
    let mockT3TBDevice: T3TBDevice;

    beforeEach(() => {
        bacnetBridge = new BACnetT3000Bridge();
        mockT3TBDevice = createMockT3TBDevice();
    });

    test('should discover T3-TB devices correctly', async () => {
        const devices = await bacnetBridge.discoverT3TBDevices();

        expect(devices).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    deviceType: expect.oneOf([84, 203]),
                    vendorId: 644
                })
            ])
        );
    });

    test('should integrate with T3000 WebView messaging', async () => {
        const message = {
            type: 'bacnet_start_polling',
            deviceId: mockT3TBDevice.deviceId
        };

        await bacnetBridge.handleT3000WebMessage(message);

        // Verify polling started
        expect(mockPollingEngine.isPolling(mockT3TBDevice.deviceId)).toBe(true);
    });

    test('should store data in SQLite using T3000 patterns', async () => {
        const pollResults = createMockPollResults();

        await bacnetBridge.storePollResults(mockT3TBDevice, pollResults, 150);

        // Verify data stored in bacnet_sensor_data table
        const storedData = await queryBACnetSensorData(mockT3TBDevice.deviceId);
        expect(storedData).toHaveLength(pollResults.length);
    });
});
```

## Implementation Progress Tracking

### Completed Items ✅
- **T3000 Source Code Analysis**: Complete analysis of existing T3000 patterns including CTrendLogView, webview_run_server, CppSQLite3 usage, and T3-TB device support
- **SQLite Integration Design**: Database schema design using existing T3000 CppSQLite3 infrastructure
- **T3-TB Device Specification**: Identified device constants (T3_TB: 84, T3_TB_11I: 203) and I/O configurations
- **WebView Message Protocol**: Designed extensions to existing HandleWebViewMsg pattern

### Ready for Implementation 🚀
1. **Phase 1**: Node-BACnet library installation and BACnetT3000Bridge class creation
2. **Phase 2**: SQLite database schema enhancement following T3000 patterns
3. **Phase 3**: WebView message handler extensions for BACnet operations
4. **Phase 4**: T3-TB specific polling engine implementation

### Next Action Items
1. Install Node-BACnet library in current WebView project
2. Create BACnetT3000Bridge class following documented T3000 source patterns
3. Implement SQLite database extensions using existing CppSQLite3 infrastructure
4. Test T3-TB device discovery and polling with actual hardware

## Testing Strategy

### Integration Testing
```typescript
describe('BACnet Polling Integration', () => {
    let pollingEngine: BACnetPollingEngine;
    let mockDevice: BACnetDevice;

    beforeEach(() => {
        pollingEngine = new BACnetPollingEngine();
        mockDevice = createMockDevice();
    });

    test('should perform block reads when supported', async () => {
        mockDevice.supportsBlockRead = true;

        await pollingEngine.startPolling(mockDevice, 30);

        // Verify block read calls
        expect(mockBacnetClient.readPropertyMultiple).toHaveBeenCalled();
    });

    test('should fallback to individual reads', async () => {
        mockDevice.supportsBlockRead = false;

        await pollingEngine.startPolling(mockDevice, 30);

        // Verify individual read calls
        expect(mockBacnetClient.readProperty).toHaveBeenCalledTimes(
            mockDevice.objects.length
        );
    });
});
```

## Deployment Considerations

### Infrastructure Requirements
```yaml
# Docker Compose for development environment
version: '3.8'
services:
  timescaledb:
    image: timescale/timescaledb:latest-pg14
    environment:
      POSTGRES_DB: t3000_timeseries
      POSTGRES_USER: t3000_user
      POSTGRES_PASSWORD: secure_password
    ports:
      - "5432:5432"
    volumes:
      - timescale_data:/var/lib/postgresql/data

  polling_service:
    build: ./polling-service
    environment:
      DATABASE_URL: postgresql://t3000_user:secure_password@timescaledb:5432/t3000_timeseries
    depends_on:
      - timescaledb
    networks:
      - bacnet_network

volumes:
  timescale_data:

networks:
  bacnet_network:
    driver: bridge
```

## Monitoring and Observability

### Metrics and Monitoring
```typescript
class PollingMetrics {
    private metrics = {
        devicesPolled: new Map<number, number>(),
        pollErrors: new Map<number, number>(),
        pollDuration: new Map<number, number[]>(),
        dataPointsCollected: 0
    };

    recordPollSuccess(deviceId: number, duration: number, pointCount: number): void {
        this.metrics.devicesPolled.set(deviceId,
            (this.metrics.devicesPolled.get(deviceId) || 0) + 1);

        if (!this.metrics.pollDuration.has(deviceId)) {
            this.metrics.pollDuration.set(deviceId, []);
        }
        this.metrics.pollDuration.get(deviceId)!.push(duration);

        this.metrics.dataPointsCollected += pointCount;
    }

    getHealthReport(): HealthReport {
        return {
            totalDevices: this.metrics.devicesPolled.size,
            totalDataPoints: this.metrics.dataPointsCollected,
            averagePollTime: this.calculateAveragePollTime(),
            errorRate: this.calculateErrorRate()
        };
    }
}
```

## Next Steps

### Immediate Actions (Week 1)
1. **Node-BACnet Library Setup**
   - Install node-bacnet in T3000 WebView project
   - Create BACnetT3000Bridge class following T3000 source patterns
   - Set up TypeScript interfaces for T3-TB devices

2. **SQLite Database Enhancement**
   - Extend existing T3000 database schema with BACnet tables
   - Implement CppSQLite3 integration following T3000 patterns
   - Test database operations with existing T3000 infrastructure

3. **T3-TB Device Testing**
   - Configure test environment with T3-TB devices
   - Validate device discovery using identified device constants (84, 203)
   - Test BACnet object mapping for digital and analog I/O

### Short-term Goals (Weeks 2-4)
1. **Core BACnet Implementation**
   - Implement T3TBPollingEngine with device-specific object mapping
   - Create WebView message handler extensions
   - Integrate with existing T3000 WebViewClient and WebSocketClient

2. **T3000 Integration Testing**
   - Test dual-client coordination (T3000 panel + browser)
   - Validate SQLite data storage using T3000 database patterns
   - Implement trend log replacement functionality

### Medium-term Goals (Weeks 5-8)
1. **Advanced Features**
   - Block read optimization for efficient polling
   - Real-time data streaming to WebView
   - Error handling and device failover

2. **Production Readiness**
   - Performance optimization following T3000 threading patterns
   - Comprehensive error handling and logging
   - Integration with existing T3000 user interface

---

**Document Status:** Implementation Ready - T3000 Source Code Analysis Complete
**Review Required:** Begin Phase 1 implementation with Node-BACnet library
**Dependencies:** Node-BACnet installation, T3-TB device access for testing
**T3000 Integration:** Leverages existing CppSQLite3, WebView messaging, and device communication patterns
