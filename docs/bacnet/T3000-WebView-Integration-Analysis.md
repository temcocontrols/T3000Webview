# T3000 WebView Integration Analysis

**Date:** July 30, 2025
**Project:** T3000 BACnet WebView Integration Analysis
**Based on:** Current T3000Webview workspace analysis

## Current WebView Integration Architecture

### Dual Communication Pattern Analysis

#### 1. Built-in Browser Integration (WebViewClient.ts)
```typescript
// T3000 Panel → WebView2 → JavaScript
class WebViewClient {
    private webview = (window as any).chrome?.webview;

    // Direct message passing to T3000 C++ application
    sendMessage(message: any) {
        if (!this.webview) return;
        this.webview.postMessage(message);
    }

    // Handle messages from T3000 C++ application
    handleMessage(event: any) {
        const data = event?.data ?? {};
        // Process T3000 responses
    }
}
```

#### 2. External Browser Integration (WebSocketClient.ts)
```typescript
// Browser → WebSocket → Rust Server → T3000
class WebSocketClient {
    private socket: WebSocket | null = null;

    // WebSocket connection to Rust API server (port 9104)
    connect() {
        const wsUri = `ws://${this.uri}:9104`;
        this.socket = new WebSocket(wsUri);
    }

    // Handle server responses
    private onMessage(event: MessageEvent) {
        // Process Rust server responses
    }
}
```

### Message Protocol Analysis

#### Common Message Types
```typescript
enum MessageType {
    GET_PANEL_DATA = 0,           // Request device data
    GET_INITIAL_DATA = 1,         // Initialize connection
    SAVE_GRAPHIC_DATA = 2,        // Save configuration
    UPDATE_ENTRY = 3,             // Update device entry
    GET_PANELS_LIST = 4,          // Get device list
    GET_ENTRIES = 5,              // Get device entries
    SAVE_LIBRARY_DATA = 13,       // Save library data
    SAVE_NEW_LIBRARY_DATA = 14,   // Save new library
}
```

#### Message Structure Pattern
```typescript
interface T3000Message {
    action: number;          // MessageType enum
    panelId?: number;        // Device identifier
    entryIndex?: number;     // Entry index for updates
    entryType?: string;      // Entry type classification
    field?: string;          // Field name for updates
    value?: any;             // New value for updates
    msgId?: string;          // Message correlation ID
    serialNumber?: string;   // Device serial number
}
```

## BACnet Integration Strategy

### Unified Message Protocol Enhancement

#### Enhanced Message Types for BACnet
```typescript
enum BACnetMessageType {
    // Existing T3000 messages (0-14)
    ...MessageType,

    // New BACnet-specific messages
    BACNET_DISCOVER_DEVICES = 100,    // Device discovery
    BACNET_DISCOVER_DEVICES_RES = 101,
    BACNET_POLL_DATA = 102,           // Data polling request
    BACNET_POLL_DATA_RES = 103,
    BACNET_CONFIG_POLLING = 104,      // Configure polling
    BACNET_CONFIG_POLLING_RES = 105,
    BACNET_DEVICE_STATUS = 106,       // Device status updates
    BACNET_DEVICE_STATUS_RES = 107,
}
```

#### BACnet Message Extensions
```typescript
interface BACnetMessage extends T3000Message {
    // BACnet-specific fields
    bacnetDeviceId?: number;          // BACnet device instance
    bacnetObjectType?: string;        // AI, AO, DI, DO, etc.
    bacnetObjectInstance?: number;    // Object instance number
    bacnetPropertyId?: string;        // Present_Value, etc.
    pollInterval?: number;            // Polling frequency
    blockReadSupport?: boolean;       // Device capability
    deviceCapabilities?: string[];    // Supported services
}
```

### Multi-Scenario Architecture Implementation

#### Scenario 1: T3000 Panel Integration
```typescript
class T3000PanelBACnetBridge extends WebViewClient {
    private bacnetService: BACnetPollingService;

    constructor() {
        super();
        this.bacnetService = new BACnetPollingService();
        this.initializeBACnetIntegration();
    }

    private initializeBACnetIntegration() {
        // Enhance existing message handlers with BACnet support
        this.addBACnetMessageHandlers();
        this.startBACnetPolling();
    }

    // Enhanced message handling for BACnet
    HandleBACnetDiscoverDevices(msgData: any) {
        // Integrate with T3000 device discovery
        // Use existing UPDATE_ENTRY pattern for compatibility
    }

    HandleBACnetPollData(msgData: any) {
        // Coordinate with existing trend log system
        // Maintain SQLite database consistency
    }
}
```

#### Scenario 2: Browser-Only Access
```typescript
class BrowserBACnetBridge extends WebSocketClient {
    private bacnetService: BACnetPollingService;

    constructor() {
        super();
        this.bacnetService = new BACnetPollingService();
        this.initializeBACnetIntegration();
    }

    private initializeBACnetIntegration() {
        // Independent BACnet operation
        this.setupIndependentPolling();
        this.manageDatabaseAccess();
    }

    // Independent polling for browser-only access
    private setupIndependentPolling() {
        // Direct BACnet device communication
        // No T3000 application dependency
    }
}
```

#### Scenario 3: Hybrid Operation
```typescript
class HybridBACnetCoordinator {
    private panelBridge: T3000PanelBACnetBridge;
    private browserBridge: BrowserBACnetBridge;
    private coordinationService: BACnetCoordinationService;

    constructor() {
        this.coordinationService = new BACnetCoordinationService();
        this.initializeHybridMode();
    }

    private initializeHybridMode() {
        // Coordinate between T3000 panel and browser access
        // Prevent duplicate polling
        // Synchronize database updates
    }
}
```

## Integration with Existing Systems

### SQLite Database Coordination

#### Database Schema Enhancement
```sql
-- Add BACnet coordination tables to existing schema
CREATE TABLE bacnet_polling_coordination (
    id INTEGER PRIMARY KEY,
    device_id INTEGER NOT NULL,
    client_type TEXT NOT NULL, -- 'panel', 'browser', 'hybrid'
    client_id TEXT NOT NULL,
    last_poll_time INTEGER,
    poll_interval INTEGER,
    is_active INTEGER DEFAULT 1,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (device_id) REFERENCES devices(device_id)
);

-- Add BACnet metadata to existing monitoring points
ALTER TABLE monitoring_points ADD COLUMN bacnet_object_type TEXT;
ALTER TABLE monitoring_points ADD COLUMN bacnet_object_instance INTEGER;
ALTER TABLE monitoring_points ADD COLUMN bacnet_property_id TEXT;
ALTER TABLE monitoring_points ADD COLUMN bacnet_device_id INTEGER;
```

#### Data Coordination Strategy
```typescript
class BACnetDatabaseCoordinator {
    private sqlite: SQLiteConnection;

    async coordinatePolling(clientType: string, deviceId: number): Promise<boolean> {
        // Check if another client is already polling
        // Implement intelligent coordination
        // Prevent duplicate network traffic
    }

    async updatePollingStatus(clientId: string, deviceId: number): Promise<void> {
        // Update coordination table
        // Manage polling ownership
    }

    async syncData(bacnetData: BACnetReading[]): Promise<void> {
        // Store data using existing schema
        // Maintain compatibility with trend log UI
    }
}
```

### UI Integration Patterns

#### Enhanced TimeSeriesModal.vue
```typescript
// Extend existing time series modal for BACnet data
class BACnetTimeSeriesModal extends TimeSeriesModal {
    private bacnetMetadata: BACnetObjectMetadata;

    async loadBACnetData(deviceId: number, objectId: number): Promise<void> {
        // Use existing Chart.js infrastructure
        // Add BACnet-specific metadata display
        // Maintain existing export functionality
    }

    renderBACnetChart(data: TimeSeriesData[]): void {
        // Enhanced chart with BACnet object information
        // Device identification and object details
        // Real-time vs. polled data indicators
    }
}
```

## Development Strategy

### Phase 1: Foundation (Week 1)
```
Tasks:
1. Install Node-BACnet library
2. Create BACnet service layer
3. Enhance message protocol
4. Set up SQLite coordination tables
5. Test with T3-TB devices
```

### Phase 2: T3000 Panel Integration (Week 2)
```
Tasks:
1. Extend WebViewClient.ts with BACnet support
2. Integrate with existing trend log system
3. Test T3000 panel → WebView → BACnet flow
4. Validate database coordination
5. Ensure backward compatibility
```

### Phase 3: Browser Integration (Week 3)
```
Tasks:
1. Extend WebSocketClient.ts with BACnet support
2. Test browser → WebSocket → BACnet flow
3. Implement independent polling mode
4. Validate database sharing
5. Test concurrent access scenarios
```

### Phase 4: Hybrid Coordination (Week 4)
```
Tasks:
1. Implement coordination service
2. Test simultaneous panel + browser access
3. Optimize polling efficiency
4. Validate data consistency
5. Performance testing and optimization
```

## Next Steps

### Immediate Requirements
1. **T3000 Source Code Access:** Analyze Trend Log and webview_run_server patterns
2. **T3-TB Device Testing:** Understand existing communication protocols
3. **BACnet Library Setup:** Install and test Node-BACnet with T3-TB devices
4. **Database Schema:** Enhance SQLite with BACnet coordination tables

### Success Criteria
1. **Compatibility:** Maintain existing T3000 functionality
2. **Performance:** No degradation in current operations
3. **Scalability:** Support multiple access scenarios
4. **Reliability:** Robust error handling and recovery
5. **Standardization:** Full BACnet protocol compliance

---

**Status:** Ready for T3000 source code analysis
**Dependencies:** Access to T3000 repository and T3-TB test devices
**Architecture:** Unified protocol supporting all three scenarios
