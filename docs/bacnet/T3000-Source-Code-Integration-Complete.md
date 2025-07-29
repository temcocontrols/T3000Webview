# T3000 Source Code Integration Analysis - BACnet Implementation

**Date:** July 30, 2025
**Project:** T3000 BACnet Integration with Source Code Analysis
**Status:** Complete Source Code Access Established

## T3000 Source Code Analysis Complete

✅ **Successfully created junction link:** `T3000_BuildingSystem` → T3000 source code
✅ **Analyzed key components:** Trend Log, WebView server, SQLite patterns, T3-TB device support
✅ **Identified integration points:** Message handling, database operations, device communication

## Key Source Code Findings

### 1. Trend Log Implementation Analysis

#### TrendLogView.cpp/h - Core Implementation
```cpp
// Core Trend Log Window Structure
class CTrendLogView : public CFormView
{
    CTrendLogWnd m_TrendLogWnd;  // Main trend display component
    CRect m_rcClient;            // Window dimensions

    // Key Methods:
    void OnInitialUpdate();      // Initialize trend window
    void OnBnClickedSavebutton(); // Save trend data
    void OnBnClickedLoadbutton(); // Load trend data
    void Fresh();                // Refresh trend display
};

// Window Creation Pattern
m_TrendLogWnd.Create(_T("STATIC"), _T("TrendLogWnd"),
                     WS_VISIBLE|WS_CHILD, m_rcClient, this, 6001);
```

#### Trend Log Icon Integration
```cpp
// From BacnetScreenEdit.cpp - Icon Loading Pattern
HICON default_trendlog_icon = (HICON)LoadImage(
    AfxGetInstanceHandle(),
    MAKEINTRESOURCE(IDI_ICON_DEFAULT_TRENDLOG),
    IMAGE_ICON, 0, 0, LR_LOADTRANSPARENT
);

// Resource Definition (resource.h)
#define IDI_ICON_DEFAULT_TRENDLOG       631
#define IDD_TRENDLOGFORMVIEW            1073
#define IDC_TRENDLOGVIEW                1260
```

### 2. WebView Server Implementation Analysis

#### webview_run_server() - Core Server Function
```cpp
// From BacnetWebView.cpp line 2472
int webview_run_server() {
    // Server initialization and message handling
    // Integration with T3000 main application
    // WebView2 component management
}

// Server Integration Points:
// BacnetScreen.cpp line 2081: webview_run_server();
// MainFrm.cpp line 15926: webview_run_server();
```

#### WebView Message Processing
```cpp
// Message Handler Structure
HRESULT WebMessageReceived(ICoreWebView2* sender,
                          ICoreWebView2WebMessageReceivedEventArgs* args) {
    LPWSTR pwStr;
    args->get_WebMessageAsJson(&pwStr);
    CString receivedMessage = pwStr;
    ProcessWebviewMsg(receivedMessage);
}

// Message Processing Pattern
void ProcessWebviewMsg(CString msg) {
    CString outmsg;
    HandleWebViewMsg(msg, outmsg);
    if(!outmsg.IsEmpty())
        m_webView->PostWebMessageAsJson(outmsg);
}
```

### 3. SQLite Integration Patterns

#### CppSQLite3 Usage Pattern
```cpp
// From ApplyGraphicLabelsDlg.cpp - Standard SQLite Pattern
#include "../SQLiteDriver/CppSQLite3.h"

void DatabaseOperation() {
    CppSQLite3DB SqliteDBBuilding;
    CppSQLite3Table table;
    CppSQLite3Query q;

    // Open database
    SqliteDBBuilding.open((UTF8MBSTR)g_strCurBuildingDatabasefilePath);

    // Execute query
    q = SqliteDBBuilding.execQuery((UTF8MBSTR)strSql);
    table = SqliteDBBuilding.getTable((UTF8MBSTR)strSql);

    // Process results
    // ... data processing logic ...

    // Close database
    SqliteDBBuilding.closedb();
}
```

#### Database Path Pattern
```cpp
// Global database path management
CString g_strCurBuildingDatabasefilePath;  // Current building database
CString g_strExePth;                       // Application executable path

// Typical database location:
// g_strExePth + "Database\\Buildings\\" + BuildingName + "\\database.db"
```

### 4. T3-TB Device Support Analysis

#### Device Type Definitions
```cpp
// Device type constants (from BacnetSetting.cpp)
case T3_TB:
    ret_name = _T("T3-TB");        // Basic T3-TB device
    break;
case T3_TB_11I:
    ret_name = _T("T3-TB-11I");    // T3-TB with 11 inputs
    break;

// Input/Output Configuration (from BacnetOutput.cpp)
if (bacnet_device_type == T3_TB_11I) {
    digital_special_output_count = T3_TB_11I_OUT_D;
    analog_special_output_count = T3_TB_11I_OUT_A;
}
```

#### T3-TB Communication Patterns
```cpp
// Device capability detection (from BacnetInput.cpp)
if (bacnet_device_type == T3_TB_11I) {
    // T3-TB specific input handling
    // Device-specific range and calibration
}

// Range configuration (from BacnetRange.cpp)
if ((Device_Basic_Setting.reg.mini_type == T3_TB_11I) &&
    (input_list_line >= 0) && (input_list_line <= 10)) {
    // T3-TB specific range configuration
}
```

## BACnet Integration Architecture

### 1. Shared BACnet Library Design

#### Core Library Structure
```cpp
// Proposed BACnetT3000Bridge.h
class BACnetT3000Bridge {
private:
    CppSQLite3DB m_database;           // SQLite integration
    BACnetClient m_bacnetClient;       // BACnet protocol handler

public:
    // T3000 Integration Methods
    bool InitializeWithT3000Database(const CString& dbPath);
    bool StartBACnetPolling(int deviceId, int interval);
    bool UpdateT3000TrendLog(int trendIndex, const BACnetReading& data);

    // WebView Integration
    CString ProcessBACnetMessage(const CString& jsonMessage);
    bool SendBACnetUpdate(const Json::Value& updateData);
};
```

#### Threading Integration Pattern
```cpp
// Following T3000 background processing pattern
class BACnetPollingThread {
private:
    static UINT BACnetPollingThreadProc(LPVOID pParam);

public:
    bool StartPolling() {
        // Follow T3000 threading model
        AfxBeginThread(BACnetPollingThreadProc, this);
    }
};
```

### 2. Database Schema Enhancement

#### Enhanced Monitoring Points Table
```sql
-- Extend existing monitoring structure for BACnet
CREATE TABLE IF NOT EXISTS bacnet_device_mapping (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id INTEGER NOT NULL,
    bacnet_device_instance INTEGER,
    bacnet_object_type INTEGER,
    bacnet_object_instance INTEGER,
    bacnet_property_id INTEGER,
    poll_interval_seconds INTEGER DEFAULT 300,
    last_poll_time INTEGER,
    is_active INTEGER DEFAULT 1,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (device_id) REFERENCES devices(device_id)
);

-- BACnet coordination table for multi-client access
CREATE TABLE IF NOT EXISTS bacnet_polling_coordination (
    id INTEGER PRIMARY KEY,
    device_id INTEGER NOT NULL,
    client_type TEXT NOT NULL, -- 'panel', 'browser', 'hybrid'
    client_id TEXT NOT NULL,
    last_poll_time INTEGER,
    poll_interval INTEGER,
    is_active INTEGER DEFAULT 1
);
```

### 3. WebView Message Protocol Extension

#### Enhanced Message Types
```cpp
// Extend existing WEBVIEW_MESSAGE_TYPE enum
enum BACNET_WEBVIEW_MESSAGE_TYPE {
    // Existing T3000 messages (0-20)
    GET_PANEL_DATA = 0,
    SAVE_GRAPHIC_DATA = 2,
    UPDATE_ENTRY = 3,
    // ... existing messages ...

    // New BACnet-specific messages
    BACNET_DISCOVER_DEVICES = 100,
    BACNET_DISCOVER_DEVICES_RES = 101,
    BACNET_START_POLLING = 102,
    BACNET_START_POLLING_RES = 103,
    BACNET_POLL_DATA = 104,
    BACNET_POLL_DATA_RES = 105,
    BACNET_DEVICE_STATUS = 106,
    BACNET_DEVICE_STATUS_RES = 107,
};
```

#### Message Processing Enhancement
```cpp
// Extend existing HandleWebViewMsg function
void HandleBACnetWebViewMsg(CString msg, CString &outmsg, int msg_source = 0) {
    Json::Value json;
    Json::Reader reader;
    reader.parse(CT2A(msg), json, false);
    int action = json.get("action", Json::nullValue).asInt();

    switch (action) {
        case BACNET_DISCOVER_DEVICES:
            ProcessBACnetDiscovery(json, outmsg);
            break;
        case BACNET_START_POLLING:
            ProcessBACnetPollingStart(json, outmsg);
            break;
        // ... additional BACnet message handlers ...
    }
}
```

### 4. T3-TB Device Integration

#### Device-Specific BACnet Configuration
```cpp
// T3-TB BACnet Object Mapping
class T3TBBACnetMapper {
public:
    static std::vector<BACnetObjectConfig> GetT3TBObjectList() {
        std::vector<BACnetObjectConfig> objects;

        // T3-TB Input Objects (Analog Inputs)
        for (int i = 0; i < T3_TB_11I_INPUT_COUNT; i++) {
            BACnetObjectConfig obj;
            obj.objectType = BACNET_OBJECT_ANALOG_INPUT;
            obj.objectInstance = i;
            obj.deviceType = T3_TB_11I;
            objects.push_back(obj);
        }

        // T3-TB Output Objects
        for (int i = 0; i < T3_TB_11I_OUT_A; i++) {
            BACnetObjectConfig obj;
            obj.objectType = BACNET_OBJECT_ANALOG_OUTPUT;
            obj.objectInstance = i;
            obj.deviceType = T3_TB_11I;
            objects.push_back(obj);
        }

        return objects;
    }
};
```

### 5. Trend Log Replacement Strategy

#### BACnet Trend Log Integration
```cpp
// Extend CTrendLogView for BACnet data
class CBACnetTrendLogView : public CTrendLogView {
private:
    BACnetT3000Bridge* m_bacnetBridge;

public:
    void DisplayBACnetTrendData(int deviceId, int objectInstance) {
        // Query BACnet trend data from enhanced database
        CppSQLite3DB db;
        db.open((UTF8MBSTR)g_strCurBuildingDatabasefilePath);

        CString query;
        query.Format(_T("SELECT timestamp, value FROM bacnet_trend_data "
                       "WHERE device_id = %d AND object_instance = %d "
                       "ORDER BY timestamp DESC LIMIT 1000"),
                       deviceId, objectInstance);

        CppSQLite3Query q = db.execQuery((UTF8MBSTR)query);

        // Process and display trend data
        while (!q.eof()) {
            // Update trend display
            q.nextRow();
        }

        db.closedb();
    }
};
```

## Implementation Roadmap

### Phase 1: Foundation (Week 1)
1. **BACnet Library Integration**
   - Install Node-BACnet in current WebView project
   - Create BACnetT3000Bridge C++ wrapper class
   - Implement basic device discovery

2. **Database Schema Enhancement**
   - Add BACnet mapping tables to existing SQLite schema
   - Implement database migration scripts
   - Test with existing T3000 database structure

### Phase 2: Core Integration (Week 2)
1. **WebView Message Enhancement**
   - Extend existing message processing with BACnet types
   - Implement BACnet message handlers
   - Test message flow between WebView and T3000

2. **T3-TB Device Testing**
   - Implement T3-TB specific BACnet object mapping
   - Test device discovery and communication
   - Validate data accuracy against existing methods

### Phase 3: Trend Log Integration (Week 3)
1. **Trend Log Enhancement**
   - Extend CTrendLogView with BACnet data support
   - Implement BACnet data visualization
   - Maintain compatibility with existing trend log UI

2. **Multi-Client Coordination**
   - Implement polling coordination for panel + browser access
   - Test simultaneous access scenarios
   - Optimize database access patterns

### Phase 4: Production Deployment (Week 4)
1. **Performance Optimization**
   - Implement block read optimization for T3-TB devices
   - Optimize database queries and indexing
   - Implement error handling and recovery

2. **Testing and Validation**
   - Complete integration testing with real T3-TB devices
   - Validate data consistency with existing systems
   - Performance benchmarking and optimization

## Next Steps

### Immediate Actions Required
1. **Install Node-BACnet library** in current WebView project
2. **Create BACnetT3000Bridge** wrapper class following T3000 patterns
3. **Test with T3-TB devices** to validate BACnet compliance
4. **Implement database schema enhancements** with migration support

### Success Criteria
- ✅ BACnet device discovery working with T3-TB devices
- ✅ Trend log data collection via BACnet replacing proprietary methods
- ✅ WebView interface supporting both panel and browser access
- ✅ Database integration maintaining existing T3000 functionality
- ✅ Performance equivalent or better than existing trend log system

---

**Status:** Ready for Implementation with Complete Source Code Analysis
**Architecture:** Unified BACnet integration maintaining full T3000 compatibility
**Database:** Enhanced SQLite schema with BACnet coordination
**Devices:** Full T3-TB support with device-specific optimization
