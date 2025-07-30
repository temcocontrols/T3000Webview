# T3000 Trend Log Analysis & BACnet Integration Strategy

**Date:** July 30, 2025
**Analysis Scope:** Current T3000 trend log implementation and BACnet-based replacement strategy
**Purpose:** Design comprehensive BACnet trend log system with SQLite storage and Rust API integration

## 📊 **Current T3000 Trend Log Implementation Analysis**

### **1. Existing Trend Log Architecture**

#### **A. Current T3000 Monitor System (`BacnetMonitor.cpp`)**
The existing T3000 trend log system is based on a "Monitor" concept with the following structure:

```cpp
// Core trend log structure (Str_monitor_point)
struct Str_monitor_point {
    char label[STR_MONITOR_LABEL_LENGTH];          // Monitor name/label
    Point_Net inputs[MAX_POINTS_IN_MONITOR];       // Array of input points (14 max)
    unsigned char range[MAX_POINTS_IN_MONITOR];    // Range/units for each point
    unsigned char hour_interval_time;              // Polling interval (hours)
    unsigned char minute_interval_time;            // Polling interval (minutes)
    unsigned char second_interval_time;            // Polling interval (seconds)
    unsigned char status;                          // ON(1)/OFF(0) status
    // Additional monitoring metadata...
};

// Point reference structure
struct Point_Net {
    unsigned char panel;        // Device panel ID
    unsigned char sub_panel;    // Sub-panel ID
    unsigned char point_type;   // Input/Output/Variable/BACnet object type
    unsigned char number;       // Point number/instance
    unsigned short network;     // Network ID
};
```

#### **B. Supported Point Types**
The current system supports these point types for trending:
- **Local Points**: `ENUM_IN`, `ENUM_OUT`, `ENUM_VAR` (T3000 proprietary)
- **BACnet Objects**: `BAC_AI`, `BAC_AO`, `BAC_AV`, `BAC_BI`, `BAC_BO`, `BAC_BV`
- **Modbus Registers**: `COIL_REG`, `DIS_INPUT_REG`, `INPUT_REG`, `MB_REG`
- **Float Types**: `BAC_FLOAT_ABCD`, `BAC_FLOAT_CDAB`, etc.

#### **C. Current Data Storage**
- **File-based**: Uses Windows INI files (`g_trendlog_ini_path`)
- **Access Database**: Optional integration (`WriteDeviceDataIntoAccessDB`)
- **SD Card Storage**: Device-side storage with filesystem support
- **Memory Buffers**: Real-time data in memory structures

### **2. Current Limitations & Issues**

#### **A. Proprietary Format**
- Custom binary format not compatible with standard BACnet trend logs
- Device-specific implementation tied to T3000 hardware
- Limited interoperability with third-party BACnet tools

#### **B. Storage Limitations**
- INI file storage is inefficient for time-series data
- No built-in query capabilities for historical data analysis
- Manual synchronization between device SD card and PC storage

#### **C. Visualization Constraints**
- Basic trend log window (`CTrendLogView`) with minimal functionality
- No real-time charting or advanced analytics
- Limited export capabilities

## 🎯 **BACnet-Based Trend Log Replacement Strategy**

### **1. BACnet ReadRange Implementation**

Based on the existing YABE `TrendLogDisplay.cs` implementation, here's how to read BACnet trend logs:

#### **A. BACnet Trend Log Reading Process**
```csharp
// Step 1: Get trend log size
private int ReadRangeSize(BacnetClient comm, BacnetAddress adr, BacnetObjectId object_id)
{
    IList<BacnetValue> value;
    if (!comm.ReadPropertyRequest(adr, object_id, BacnetPropertyIds.PROP_RECORD_COUNT, out value))
        return -1;
    return (int)Convert.ChangeType(value[0].Value, typeof(int));
}

// Step 2: Read trend log data in chunks
private void ReadTrendLogData(BacnetClient comm, BacnetAddress adr, BacnetObjectId object_id,
                              int startIndex, int recordCount)
{
    byte[] TrendBuffer;
    uint ItemCount = (uint)recordCount;

    // ReadRange request - core BACnet operation
    if (comm.ReadRangeRequest(adr, object_id, (uint)startIndex, ref ItemCount, out TrendBuffer))
    {
        // Step 3: Decode BACnet log records
        BacnetLogRecord[] records;
        if (Services.DecodeLogRecord(TrendBuffer, 0, TrendBuffer.Length, 1, out records) > 0)
        {
            foreach (var record in records)
            {
                // Store each record: timestamp, value, status
                StoreTrendLogRecord(record.timestamp, record.value, record.status);
            }
        }
    }
}
```

#### **B. BACnet Object Types for T3-TB Devices**
For T3-TB devices (types 84 and 203), we need to create BACnet trend logs for:

```cpp
// T3-TB (Device Type 84): 8DI + 8DO
BacnetObjectId trendlogs_84[] = {
    {OBJECT_TRENDLOG, 1},  // Digital Input trend log
    {OBJECT_TRENDLOG, 2},  // Digital Output trend log
};

// T3-TB-11I (Device Type 203): 11AI
BacnetObjectId trendlogs_203[] = {
    {OBJECT_TRENDLOG, 1},  // Analog Input trend log
};
```

### **2. SQLite Database Schema Design**

#### **A. Core Tables**
```sql
-- Device registry table
CREATE TABLE bacnet_devices (
    device_id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_instance INTEGER UNIQUE NOT NULL,
    device_type INTEGER NOT NULL,           -- 84 (T3-TB) or 203 (T3-TB-11I)
    device_name TEXT NOT NULL,
    ip_address TEXT NOT NULL,
    port INTEGER DEFAULT 47808,
    vendor_id INTEGER DEFAULT 644,          -- Temco Controls
    model_name TEXT,
    supports_block_read INTEGER DEFAULT 0,
    last_seen INTEGER DEFAULT (strftime('%s', 'now')),
    status TEXT DEFAULT 'active',
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Object/point configuration table
CREATE TABLE bacnet_objects (
    object_id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id INTEGER REFERENCES bacnet_devices(device_id),
    object_type TEXT NOT NULL,              -- 'AI', 'DI', 'DO', 'TRENDLOG'
    object_instance INTEGER NOT NULL,
    object_name TEXT,
    description TEXT,
    units TEXT,
    poll_interval INTEGER DEFAULT 30,      -- seconds
    cov_increment REAL,                     -- for Change of Value
    enabled INTEGER DEFAULT 1,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    UNIQUE(device_id, object_type, object_instance)
);

-- Main time-series data table
CREATE TABLE bacnet_trend_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp INTEGER NOT NULL,             -- Unix timestamp
    device_id INTEGER NOT NULL,
    object_id INTEGER NOT NULL,
    object_type TEXT NOT NULL,
    object_instance INTEGER NOT NULL,
    value REAL,
    status TEXT DEFAULT 'reliable',         -- reliable, unreliable, fault
    log_status TEXT DEFAULT 'valid',        -- valid, gap-filled, overwrite
    sequence_number INTEGER,                -- For log record ordering
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (device_id) REFERENCES bacnet_devices(device_id),
    FOREIGN KEY (object_id) REFERENCES bacnet_objects(object_id)
);

-- Trend log metadata table
CREATE TABLE bacnet_trendlogs (
    trendlog_id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id INTEGER NOT NULL,
    trendlog_object_instance INTEGER NOT NULL,
    trendlog_name TEXT NOT NULL,
    log_type TEXT DEFAULT 'polling',        -- polling, cov, triggered
    buffer_size INTEGER DEFAULT 1000,
    record_count INTEGER DEFAULT 0,
    enable INTEGER DEFAULT 1,
    start_time INTEGER,
    stop_time INTEGER,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (device_id) REFERENCES bacnet_devices(device_id),
    UNIQUE(device_id, trendlog_object_instance)
);

-- Performance indexes
CREATE INDEX idx_trend_data_device_time ON bacnet_trend_data (device_id, timestamp DESC);
CREATE INDEX idx_trend_data_object_time ON bacnet_trend_data (object_id, timestamp DESC);
CREATE INDEX idx_trend_data_type_time ON bacnet_trend_data (object_type, timestamp DESC);
```

#### **B. T3000 Integration Tables**
```sql
-- Link with existing T3000 Building table
ALTER TABLE Building ADD COLUMN bacnet_device_id INTEGER;
ALTER TABLE Building ADD COLUMN bacnet_device_instance INTEGER;
ALTER TABLE Building ADD COLUMN bacnet_enabled INTEGER DEFAULT 0;

-- Map T3000 points to BACnet objects
CREATE TABLE t3000_bacnet_mapping (
    mapping_id INTEGER PRIMARY KEY AUTOINCREMENT,
    building_id INTEGER REFERENCES Building(Unique_ID),
    t3000_point_type TEXT NOT NULL,         -- 'INPUT', 'OUTPUT', 'VARIABLE'
    t3000_point_number INTEGER NOT NULL,
    bacnet_object_id INTEGER REFERENCES bacnet_objects(object_id),
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    UNIQUE(building_id, t3000_point_type, t3000_point_number)
);
```

### **3. WebView Integration Architecture**

#### **A. Extend WebView Message Types**
```cpp
// Add to existing WEBVIEW_MESSAGE_TYPE enum in BacnetWebView.cpp
enum WEBVIEW_MESSAGE_TYPE {
    // ... existing types ...
    BACNET_DISCOVER_TRENDLOGS = 15,         // Discover BACnet trend log objects
    BACNET_READ_TRENDLOG_DATA = 16,         // Read trend log using ReadRange
    BACNET_START_TRENDLOG_POLLING = 17,     // Start periodic trend log reading
    BACNET_STOP_TRENDLOG_POLLING = 18,      // Stop polling
    BACNET_GET_TREND_HISTORY = 19,          // Query historical data from SQLite
    BACNET_CONFIGURE_TRENDLOG = 20,         // Configure trend log parameters
    BACNET_EXPORT_TREND_DATA = 21           // Export trend data
};
```

#### **B. WebView Handler Implementation**
```cpp
// Add to existing HandleWebViewMsg function
void HandleWebViewMsg(CString msg, CString &outmsg, int msg_source = 0)
{
    // ... existing switch cases ...

    case WEBVIEW_MESSAGE_TYPE::BACNET_DISCOVER_TRENDLOGS:
        DiscoverBACnetTrendLogs(json, tempjson);
        break;

    case WEBVIEW_MESSAGE_TYPE::BACNET_READ_TRENDLOG_DATA:
        ReadBACnetTrendLogData(json, tempjson);
        break;

    case WEBVIEW_MESSAGE_TYPE::BACNET_GET_TREND_HISTORY:
        GetTrendHistoryFromSQLite(json, tempjson);
        break;
}

// Implementation functions
void DiscoverBACnetTrendLogs(Json::Value& request, Json::Value& response)
{
    // 1. Perform WHO-IS broadcast to find T3-TB devices
    // 2. For each device, enumerate OBJECT_TRENDLOG objects
    // 3. Store device and trend log info in SQLite
    // 4. Return discovered trend logs to WebView
}

void ReadBACnetTrendLogData(Json::Value& request, Json::Value& response)
{
    // 1. Get trend log object ID from request
    // 2. Use ReadRange to get latest records
    // 3. Store records in SQLite bacnet_trend_data table
    // 4. Return summary to WebView
}
```

### **4. Rust API Integration**

#### **A. Rust API Endpoints**
```rust
// src/lib.rs - Main API endpoints for trend log access
use serde::{Deserialize, Serialize};
use rusqlite::{Connection, Result};

#[derive(Serialize, Deserialize)]
pub struct TrendLogRecord {
    pub timestamp: i64,
    pub device_id: i32,
    pub object_type: String,
    pub object_instance: i32,
    pub value: f64,
    pub status: String,
}

#[derive(Serialize, Deserialize)]
pub struct TrendLogQuery {
    pub device_id: Option<i32>,
    pub object_type: Option<String>,
    pub start_time: i64,
    pub end_time: i64,
    pub limit: Option<i32>,
}

// Core API functions
pub fn get_trend_data(conn: &Connection, query: &TrendLogQuery) -> Result<Vec<TrendLogRecord>> {
    let mut sql = "SELECT timestamp, device_id, object_type, object_instance, value, status
                   FROM bacnet_trend_data WHERE timestamp BETWEEN ? AND ?".to_string();

    let mut params: Vec<Box<dyn rusqlite::ToSql>> = vec![
        Box::new(query.start_time),
        Box::new(query.end_time),
    ];

    if let Some(device_id) = query.device_id {
        sql.push_str(" AND device_id = ?");
        params.push(Box::new(device_id));
    }

    if let Some(ref object_type) = query.object_type {
        sql.push_str(" AND object_type = ?");
        params.push(Box::new(object_type.clone()));
    }

    sql.push_str(" ORDER BY timestamp DESC");

    if let Some(limit) = query.limit {
        sql.push_str(" LIMIT ?");
        params.push(Box::new(limit));
    }

    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map(params.as_slice(), |row| {
        Ok(TrendLogRecord {
            timestamp: row.get(0)?,
            device_id: row.get(1)?,
            object_type: row.get(2)?,
            object_instance: row.get(3)?,
            value: row.get(4)?,
            status: row.get(5)?,
        })
    })?;

    let mut records = Vec::new();
    for row in rows {
        records.push(row?);
    }

    Ok(records)
}

pub fn insert_trend_record(conn: &Connection, record: &TrendLogRecord) -> Result<()> {
    conn.execute(
        "INSERT INTO bacnet_trend_data (timestamp, device_id, object_type, object_instance, value, status)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        [
            &record.timestamp,
            &record.device_id,
            &record.object_type,
            &record.object_instance,
            &record.value,
            &record.status,
        ],
    )?;
    Ok(())
}

// Aggregation functions for analytics
pub fn get_trend_summary(conn: &Connection, query: &TrendLogQuery) -> Result<TrendSummary> {
    // Implement min, max, avg, count aggregations
}

pub fn get_trend_hourly_averages(conn: &Connection, query: &TrendLogQuery) -> Result<Vec<TrendLogRecord>> {
    // Group by hour and calculate averages
}
```

#### **B. HTTP API Endpoints**
```rust
// src/api/mod.rs - REST API endpoints
use warp::{Filter, Reply};

pub fn trend_log_routes() -> impl Filter<Extract = impl Reply, Error = warp::Rejection> + Clone {
    let get_trends = warp::path("trends")
        .and(warp::get())
        .and(warp::query::<TrendLogQuery>())
        .and_then(handle_get_trends);

    let post_trend = warp::path("trends")
        .and(warp::post())
        .and(warp::body::json())
        .and_then(handle_post_trend);

    let get_devices = warp::path("devices")
        .and(warp::get())
        .and_then(handle_get_devices);

    get_trends.or(post_trend).or(get_devices)
}

async fn handle_get_trends(query: TrendLogQuery) -> Result<impl Reply, warp::Rejection> {
    let conn = get_db_connection()?;
    let records = get_trend_data(&conn, &query)
        .map_err(|_| warp::reject::custom(DatabaseError))?;
    Ok(warp::reply::json(&records))
}
```

## 🛠️ **Windows Tool Design: BACnet Trend Log Manager**

### **1. Tool Architecture**

#### **A. Application Structure**
```cpp
// Main application class
class CBACnetTrendLogManager : public CWinApp
{
public:
    // SQLite database connection
    CppSQLite3DB m_database;

    // BACnet communication
    BacnetClient* m_bacnetClient;

    // Device management
    std::vector<T3TBDevice> m_discoveredDevices;

    // Trend log configuration
    std::vector<TrendLogConfig> m_trendLogConfigs;
};

// Main window class
class CMainWindow : public CFrameWnd
{
public:
    // UI components
    CDeviceListCtrl m_deviceList;           // T3-TB device list
    CTrendLogListCtrl m_trendLogList;       // Available trend logs
    CTrendChartCtrl m_trendChart;           // Real-time chart display
    CConfigPanel m_configPanel;            // Trend log configuration

    // Background operations
    CPollingThread* m_pollingThread;        // Periodic trend log reading
    CDataProcessor* m_dataProcessor;        // Data processing and storage
};
```

#### **B. Device Discovery Panel**
```cpp
class CDeviceDiscoveryPanel : public CDialog
{
public:
    // Auto-discovery functionality
    void PerformWhoIsBroadcast();
    void FilterT3TBDevices();
    void TestDeviceConnectivity();

    // Device configuration
    void ConfigureDevice(T3TBDevice& device);
    void EnableTrendLogging(int deviceId, bool enable);

    // UI controls
    CListCtrl m_deviceList;
    CButton m_discoverButton;
    CButton m_configureButton;
    CProgressCtrl m_discoveryProgress;
};
```

#### **C. Trend Log Configuration Panel**
```cpp
class CTrendLogConfigPanel : public CDialog
{
public:
    // Trend log setup
    void CreateTrendLogForDevice(int deviceId);
    void ConfigurePollingInterval(int trendLogId, int intervalSeconds);
    void SetLogBufferSize(int trendLogId, int bufferSize);

    // Data management
    void StartPolling(int trendLogId);
    void StopPolling(int trendLogId);
    void ExportTrendData(int trendLogId, CString exportPath);

    // UI controls
    CListCtrl m_trendLogList;
    CEdit m_intervalEdit;
    CEdit m_bufferSizeEdit;
    CButton m_startPollingButton;
    CButton m_stopPollingButton;
};
```

#### **D. Real-time Chart Display**
```cpp
class CTrendChartCtrl : public CWnd
{
public:
    // Chart rendering using GDI+ or Chart control
    void AddDataPoint(int trendLogId, double timestamp, double value);
    void SetTimeRange(double startTime, double endTime);
    void SetYAxisRange(double minValue, double maxValue);
    void EnableRealTimeMode(bool enable);

    // Chart customization
    void SetChartTitle(CString title);
    void AddTrendLine(int trendLogId, CString label, COLORREF color);
    void ShowLegend(bool show);
    void EnableZoom(bool enable);

private:
    // Chart data management
    std::map<int, std::vector<ChartDataPoint>> m_chartData;
    ChartSettings m_settings;
    CRect m_chartRect;
};
```

### **2. Key Features**

#### **A. Automated Device Discovery**
- **WHO-IS Broadcast**: Automatic discovery of T3-TB devices on network
- **Device Filtering**: Filter by Vendor ID 644 (Temco Controls)
- **Connectivity Testing**: Verify BACnet communication with each device
- **Device Registration**: Store discovered devices in SQLite database

#### **B. Trend Log Management**
- **Automatic Setup**: Create trend log objects for T3-TB I/O points
- **Configurable Polling**: Set custom polling intervals (seconds to hours)
- **Buffer Management**: Configure trend log buffer sizes
- **Status Monitoring**: Real-time status of trend log operations

#### **C. Data Visualization**
- **Real-time Charts**: Live updating trend charts
- **Multi-device Display**: Show multiple device trends simultaneously
- **Historical Analysis**: Query and display historical trend data
- **Export Capabilities**: Export to CSV, Excel, or database formats

#### **D. Integration with T3000**
- **Database Sharing**: Use same SQLite database as T3000 WebView
- **Configuration Sync**: Synchronize with existing T3000 device configurations
- **API Integration**: Provide data to Rust API for web access

### **3. Implementation Steps**

#### **Phase 1: Core Infrastructure (Week 1-2)**
1. **SQLite Integration**
   - Implement database schema creation
   - Add CRUD operations for devices and trend logs
   - Test database performance with time-series data

2. **BACnet Communication**
   - Integrate existing T3000 BACnet stack
   - Implement WHO-IS/I-AM device discovery
   - Add ReadRange functionality for trend logs

#### **Phase 2: UI Development (Week 3-4)**
1. **Main Window Framework**
   - Create main application window with panels
   - Implement device discovery UI
   - Add trend log configuration dialogs

2. **Chart Display**
   - Integrate charting library (Chart.js via WebView or native GDI+)
   - Implement real-time data plotting
   - Add chart customization features

#### **Phase 3: Advanced Features (Week 5-6)**
1. **Data Processing**
   - Implement background polling threads
   - Add data validation and error handling
   - Create export functionality

2. **Integration Testing**
   - Test with actual T3-TB devices
   - Validate data accuracy and performance
   - Integration with T3000 WebView and Rust API

## 📈 **Expected Benefits**

### **1. Technical Advantages**
- **Standard BACnet**: Full compliance with BACnet standard trend logs
- **Efficient Storage**: SQLite provides fast, reliable time-series storage
- **Real-time Access**: Live trend data via Rust API and WebView
- **Scalability**: Support for multiple devices and thousands of trend points

### **2. Operational Benefits**
- **Automated Setup**: Automatic discovery and configuration of T3-TB devices
- **Centralized Management**: Single tool for all trend log operations
- **Data Analytics**: Built-in analysis and export capabilities
- **Integration**: Seamless integration with existing T3000 ecosystem

### **3. Development Benefits**
- **Reusable Components**: Leverage existing T3000 BACnet infrastructure
- **Modern API**: Rust-based API for web and mobile access
- **Extensible Design**: Easy to add new device types and features
- **Maintainable Code**: Clean separation of concerns and modular design

---

**Status**: Ready for implementation - Complete analysis and design completed
**Next Steps**: Begin Phase 1 implementation with SQLite database and BACnet integration
**Timeline**: 6-week implementation plan for full trend log replacement system
**Success Metrics**: Successful T3-TB device discovery, trend log reading, and SQLite storage
