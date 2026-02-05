# T3000 BACnet Integration Analysis

## Executive Summary

Based on the comprehensive codebase analysis, I've identified the complete integration path for replacing T3000's proprietary trend log system with the new BACnet SQLite implementation. This analysis covers both C++ and C# integration approaches for the T3000 Building Automation System.

## Current T3000 Architecture Analysis

### 1. Trend Log System Structure

**Current Implementation:**
- **7 Trend Logs per Device** (MON1-MON7): `trend_logs` table with `trend_log_index` 0-6
- **14 Items per Trend Log**: `trend_log_items` table with `item_index` 0-13
- **98 Total Monitoring Points** per device (7 × 14)
- **Configurable Intervals**: Hour/Minute/Second precision in `trend_logs` table
- **Real-time Cache**: `realtime_data_cache` for quick access to latest values
- **Time Series Data**: `timeseries_data_2025` (yearly partitions) for historical storage

**Data Flow:**
```
T3000 Device → WebView Bridge → SQLite Database → Time Series Modal
```

### 2. WebView Communication Bridge

**Message Types (C++ ↔ JavaScript):**
- `UPDATE_ENTRY` (Action 3): Updates device entry fields
- `UPDATE_ENTRY_RES`: Response confirmation
- `SAVE_NEW_LIBRARY_DATA` (Action 14): Library operations
- Real-time data synchronization every 30 seconds

**Communication Pattern:**
```javascript
// JavaScript to C++
window.chrome?.webview?.postMessage({
  action: 3, // UPDATE_ENTRY
  field: key,
  value: fieldVal,
  panelId: pid,
  entryIndex: index,
  entryType: t3Entry.type
});

// C++ Response
Json::Value response;
response["action"] = "UPDATE_ENTRY_RES";
response["status"] = true;
m_webView->PostWebMessageAsJson(output);
```

### 3. Time Series Visualization

**Current Implementation:**
- **TrendLogModal.vue**: Chart.js-based Grafana-style interface
- **Double-click trigger**: Objects of type "MON" (TrendLog) in IndexPage.vue
- **Real-time updates**: 30-second intervals with configurable time ranges
- **7 Temperature series**: BMC01E1E-1P1B through BMC01E1E-7P1B
- **Export capabilities**: PNG charts and CSV data

## BACnet Integration Strategy

### 1. Replacement Architecture

**New BACnet Flow:**
```
BACnet Devices → BACnet Polling Engine → SQLite Database → T3000 UI
```

**Key Changes:**
- Replace proprietary trend logs with BACnet standard polling
- Maintain existing SQLite schema for backward compatibility
- Enhance with BACnet-specific fields and indexing
- Preserve real-time data cache for performance

### 2. Database Schema Enhancement

**Current Schema Compatibility:**
- ✅ Keep existing `devices`, `monitoring_points`, `trend_logs` tables
- ✅ Maintain `realtime_data_cache` for performance
- ✅ Preserve `timeseries_data_YYYY` yearly partitioning
- ➕ Add BACnet-specific fields and tables

**Required Additions:**
```sql
-- Add BACnet fields to existing tables
ALTER TABLE devices ADD COLUMN bacnet_device_id INTEGER;
ALTER TABLE devices ADD COLUMN bacnet_network_number INTEGER;
ALTER TABLE devices ADD COLUMN bacnet_mac_address TEXT;

-- Add BACnet object mapping
ALTER TABLE monitoring_points ADD COLUMN bacnet_object_type INTEGER;
ALTER TABLE monitoring_points ADD COLUMN bacnet_object_instance INTEGER;
ALTER TABLE monitoring_points ADD COLUMN bacnet_property_id INTEGER;

-- New BACnet discovery table
CREATE TABLE bacnet_devices (
    id INTEGER PRIMARY KEY,
    device_id INTEGER NOT NULL UNIQUE,
    device_name TEXT,
    vendor_id INTEGER,
    vendor_name TEXT,
    model_name TEXT,
    firmware_revision TEXT,
    application_software_version TEXT,
    object_list TEXT, -- JSON array of supported objects
    services_supported TEXT, -- JSON array of supported services
    last_discovered INTEGER,
    is_active INTEGER DEFAULT 1,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (device_id) REFERENCES devices(device_id)
);

-- BACnet polling configuration
CREATE TABLE bacnet_polling_config (
    id INTEGER PRIMARY KEY,
    device_id INTEGER NOT NULL,
    poll_interval_seconds INTEGER DEFAULT 300,
    use_confirmed_requests INTEGER DEFAULT 1,
    max_apdu_length INTEGER DEFAULT 1476,
    retry_count INTEGER DEFAULT 3,
    timeout_seconds INTEGER DEFAULT 5,
    priority INTEGER DEFAULT 16,
    is_active INTEGER DEFAULT 1,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (device_id) REFERENCES devices(device_id)
);
```

### 3. C++ Integration Strategy

**Option A: Native BACnet Library Integration**
```cpp
// Required libraries
#include "bacnet-stack/include/bacnet.h" // Open source BACnet stack
#include "sqlite3.h"

class T3000BACnetTrendLog {
private:
    sqlite3* m_database;
    std::vector<BACnetDevice> m_devices;
    std::thread m_pollingThread;
    bool m_isRunning;

public:
    // Initialize BACnet polling system
    bool InitializeBACnetPolling(const std::string& dbPath) {
        // Open SQLite database
        int rc = sqlite3_open(dbPath.c_str(), &m_database);
        if (rc != SQLITE_OK) return false;

        // Initialize BACnet stack
        bool bacnet_init = Device_Init(nullptr);
        if (!bacnet_init) return false;

        // Start device discovery
        DiscoverBACnetDevices();

        // Start polling thread
        m_isRunning = true;
        m_pollingThread = std::thread(&T3000BACnetTrendLog::PollingLoop, this);

        return true;
    }

    // Replace existing trend log collection
    void ReplaceTrendLogSystem() {
        // 1. Migrate existing trend log configurations to BACnet polling
        MigrateTrendLogsToBACnet();

        // 2. Start BACnet polling for all configured points
        StartBACnetPolling();

        // 3. Maintain compatibility with existing WebView interface
        UpdateWebViewInterface();
    }

private:
    void PollingLoop() {
        while (m_isRunning) {
            for (auto& device : m_devices) {
                CollectBACnetData(device);
            }
            std::this_thread::sleep_for(std::chrono::seconds(300)); // 5-minute interval
        }
    }

    void CollectBACnetData(const BACnetDevice& device) {
        // Read all configured monitoring points via BACnet
        for (auto& point : device.monitoringPoints) {
            float value = ReadBACnetProperty(
                device.deviceId,
                point.objectType,
                point.objectInstance,
                point.propertyId
            );

            // Store in SQLite database
            StoreTrendData(device.deviceId, point, value);
            UpdateRealtimeCache(device.deviceId, point, value);
        }
    }

    float ReadBACnetProperty(uint32_t deviceId, int objectType,
                           uint32_t objectInstance, int propertyId) {
        BACNET_READ_PROPERTY_DATA rpdata;
        rpdata.object_type = (BACNET_OBJECT_TYPE)objectType;
        rpdata.object_instance = objectInstance;
        rpdata.object_property = (BACNET_PROPERTY_ID)propertyId;

        // Send BACnet read request
        uint8_t buffer[MAX_APDU];
        int len = rp_encode_apdu(&buffer[0], MAX_APDU, &rpdata);

        // Process response and extract value
        return ProcessBACnetResponse(buffer, len);
    }
};
```

**Option B: C# .NET Integration (Recommended)**
```csharp
using System;
using System.Data.SQLite;
using System.Threading.Tasks;
using BACnet; // Use existing .NET BACnet library

public class T3000BACnetIntegration
{
    private SQLiteConnection _database;
    private BacnetClient _bacnetClient;
    private Timer _pollingTimer;
    private List<BACnetDevice> _devices;

    public async Task<bool> InitializeAsync(string dbPath)
    {
        try
        {
            // Initialize SQLite connection
            _database = new SQLiteConnection($"Data Source={dbPath}");
            await _database.OpenAsync();

            // Initialize BACnet client
            _bacnetClient = new BacnetClient(new BacnetIpUdpProtocolTransport(0xBAC0));
            _bacnetClient.Start();

            // Discover BACnet devices
            await DiscoverDevicesAsync();

            // Start polling timer (5-minute intervals)
            _pollingTimer = new Timer(async _ => await PollAllDevicesAsync(),
                                    null, TimeSpan.Zero, TimeSpan.FromMinutes(5));

            return true;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"BACnet initialization failed: {ex.Message}");
            return false;
        }
    }

    public async Task ReplaceTrendLogSystemAsync()
    {
        // 1. Read existing trend log configurations
        var trendLogs = await GetExistingTrendLogsAsync();

        // 2. Convert to BACnet polling configurations
        foreach (var trendLog in trendLogs)
        {
            await ConvertTrendLogToBACnetAsync(trendLog);
        }

        // 3. Start BACnet data collection
        await StartBACnetPollingAsync();

        // 4. Update WebView interface to use new data source
        UpdateWebViewBridge();
    }

    private async Task PollAllDevicesAsync()
    {
        foreach (var device in _devices)
        {
            try
            {
                await CollectDeviceDataAsync(device);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error polling device {device.DeviceId}: {ex.Message}");
            }
        }
    }

    private async Task CollectDeviceDataAsync(BACnetDevice device)
    {
        foreach (var point in device.MonitoringPoints)
        {
            try
            {
                // Read BACnet property value
                var value = await ReadBACnetValueAsync(device.DeviceId,
                    point.ObjectType, point.ObjectInstance, point.PropertyId);

                // Store in database
                await StoreTimeSeriesDataAsync(device.DeviceId, point, value);
                await UpdateRealtimeCacheAsync(device.DeviceId, point, value);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error reading point {point}: {ex.Message}");
            }
        }
    }

    private async Task<float> ReadBACnetValueAsync(uint deviceId,
        BacnetObjectTypes objectType, uint objectInstance, BacnetPropertyIds propertyId)
    {
        var address = GetDeviceAddress(deviceId);
        var values = new List<BacnetValue>();

        await _bacnetClient.ReadPropertyAsync(address, objectType, objectInstance,
            propertyId, values);

        return Convert.ToSingle(values[0].Value);
    }
}
```

### 4. WebView Interface Updates

**Maintain Existing API:**
```javascript
// Keep existing message types but enhance data source
class T3000BACnetBridge {
    // Enhanced UPDATE_ENTRY to support BACnet metadata
    static UpdateEntry(panelId, entryIndex, field, value, bacnetMetadata = null) {
        window.chrome?.webview?.postMessage({
            action: 3, // Keep existing UPDATE_ENTRY
            field: field,
            value: value,
            panelId: panelId,
            entryIndex: entryIndex,
            entryType: "BACNET_POINT", // New type for BACnet points
            bacnetObjectType: bacnetMetadata?.objectType,
            bacnetObjectInstance: bacnetMetadata?.objectInstance,
            bacnetPropertyId: bacnetMetadata?.propertyId
        });
    }

    // New message type for BACnet device discovery
    static RequestBACnetDiscovery() {
        window.chrome?.webview?.postMessage({
            action: 20, // NEW: BACNET_DISCOVER
            timeout: 30000,
            maxDevices: 50
        });
    }

    // Enhanced trend log data request
    static RequestTrendData(deviceId, pointList, timeRange, bacnetOptions = {}) {
        window.chrome?.webview?.postMessage({
            action: 21, // NEW: BACNET_TREND_DATA
            deviceId: deviceId,
            pointList: pointList,
            startTime: timeRange.start,
            endTime: timeRange.end,
            aggregation: bacnetOptions.aggregation || 'raw',
            maxPoints: bacnetOptions.maxPoints || 1000
        });
    }
}
```

### 5. Migration Strategy

**Phase 1: Parallel Operation**
1. Deploy BACnet polling alongside existing trend logs
2. Populate new BACnet tables while maintaining existing data
3. Add BACnet metadata to existing monitoring points
4. Validate data consistency between old and new systems

**Phase 2: UI Enhancement**
1. Update TrendLogModal.vue to support BACnet metadata
2. Add BACnet device discovery interface
3. Enhanced configuration screens for BACnet polling
4. Backward compatibility with existing trend log UI

**Phase 3: Full Replacement**
1. Switch data source from proprietary trend logs to BACnet polling
2. Maintain existing SQLite schema for compatibility
3. Remove proprietary trend log collection code
4. Optimize BACnet polling performance

**Phase 4: Advanced Features**
1. BACnet alarm and event handling
2. COV (Change of Value) subscriptions for real-time updates
3. BACnet scheduling and calendar integration
4. Advanced BACnet object discovery and mapping

## Integration Recommendations

### 1. **Use C# .NET Approach**
- **Reason**: Better BACnet library ecosystem (.NET BACnet libraries)
- **Advantage**: Easier integration with existing T3000 .NET components
- **Performance**: Adequate for typical building automation polling requirements

### 2. **Maintain SQLite Schema**
- **Reason**: Preserve existing TrendLogModal and UI components
- **Advantage**: Minimal UI changes required
- **Migration**: Gradual transition with data validation

### 3. **Enhance WebView Bridge**
- **Add**: New message types for BACnet discovery and configuration
- **Maintain**: Existing UPDATE_ENTRY pattern for compatibility
- **Extend**: Metadata support for BACnet object identification

### 4. **Implement Progressive Migration**
- **Start**: Parallel operation with existing trend logs
- **Validate**: Data consistency and performance
- **Switch**: Gradual replacement with rollback capability
- **Optimize**: Performance tuning and advanced features

## Next Steps

1. **Set up BACnet development environment** with C# .NET libraries
2. **Create BACnet polling service** as separate module
3. **Enhance SQLite schema** with BACnet fields
4. **Update WebView bridge** with new message types
5. **Test parallel operation** with existing trend log system
6. **Migrate UI components** to support BACnet metadata
7. **Deploy and validate** in production environment

This comprehensive integration plan maintains full compatibility with the existing T3000 system while providing a clear path to BACnet standard compliance and enhanced functionality.
