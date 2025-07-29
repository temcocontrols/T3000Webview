# T3000 BACnet Infrastructure - Complete Analysis

**Date:** July 30, 2025
**Analysis Scope:** Complete BACnet implementation in T3000 Building System
**Purpose:** Full assessment of existing BACnet capabilities for trend log integration

## Executive Summary

T3000 contains a **mature, production-ready BACnet infrastructure** with comprehensive protocol support, device management, and trend logging capabilities. The system includes both native C++ BACnet stack and C# BACnet tools, with extensive WebView integration already in place.

## 🏗️ **Architecture Overview**

### **1. BACnet Stack Components**

#### **A. Native C++ BACnet Stack (`BacNetDllforVc/`)**
- **Complete BACnet Protocol Implementation**: 50+ source files covering full protocol
- **Headers**: 60+ header files for all BACnet services and data types
- **Core Components**:
  - `bacnet.h` - Main stack library reference
  - `bip.c/h` - BACnet/IP implementation
  - `mstp.c/h` - MS/TP implementation
  - `rp.c/rpm.c` - ReadProperty and ReadPropertyMultiple
  - `wp.c/wpm.c` - WriteProperty and WritePropertyMultiple
  - `cov.c` - Change of Value services
  - `readrange.c` - ReadRange for trend logs

#### **B. C# BACnet Tools (`TemcoStandardBacnetToolScr/`)**
- **System.IO.BACnet Namespace**: Full C# BACnet implementation
- **Core Classes**:
  - `BACnetClient.cs` (2,724 lines) - Main BACnet client
  - `MainDialog.cs` (3,019 lines) - BACnet tool main interface
  - `TrendLogDisplay.cs` (375 lines) - **BACnet trend log visualization**
  - `BACnetTransport.cs` - Transport layer abstraction
  - `DeviceStorage.cs` - Device persistence
  - `TreeView.cs` - Device tree navigation

#### **C. T3000 Integration (`T3000BacnetTool.cs`)**
- **COM Interface**: `[Guid("52374044-6019-4885-B14B-21EBDD1AA6CA")]`
- **Device Management**: Dictionary-based device tracking
- **Subscription Handling**: COV subscription management
- **Cross-Session Memory**: Device object name caching

### **2. T3000 BACnet Integration Layer**

#### **A. Core BACnet Functions (global_function.h)**
```cpp
// Property Operations
int Bacnet_Read_Properties(uint32_t deviceid, BACNET_OBJECT_TYPE object_type,
                          uint32_t object_instance, int property_id);
int Bacnet_Read_Properties_Blocking(uint32_t deviceid, BACNET_OBJECT_TYPE object_type,
                                   uint32_t object_instance, int property_id,
                                   BACNET_APPLICATION_DATA_VALUE &value, uint8_t retrytime = 3);

// Multiple Property Operations
int Bacnet_Read_Property_Multiple(uint32_t deviceid, BACNET_OBJECT_TYPE object_type,
                                 uint32_t object_instance, int property_id);
int Bacnet_Read_Properties_Multiple_Blocking(uint32_t deviceid, BACNET_OBJECT_TYPE object_type,
                                            uint32_t object_instance, int property_id,
                                            BACNET_READ_ACCESS_DATA &value, uint8_t retrytime);

// Write Operations
int Bacnet_Write_Properties(uint32_t deviceid, BACNET_OBJECT_TYPE object_type,
                           uint32_t object_instance, int property_id,
                           BACNET_APPLICATION_DATA_VALUE * object_value, uint8_t priority = 16);
int Bacnet_Write_Properties_Blocking(uint32_t deviceid, BACNET_OBJECT_TYPE object_type,
                                    uint32_t object_instance, int property_id,
                                    BACNET_APPLICATION_DATA_VALUE * object_value,
                                    uint8_t priority = 16, uint8_t retrytime = 3);

// Network Management
void close_bac_com();
bool Initial_bac(int comport = 0, CString bind_local_ip = _T(""), int n_baudrate = 19200);
bool Open_bacnetSocket2(CString strIPAdress, unsigned short nPort, SOCKET &mysocket);
```

#### **B. Device Management Functions**
```cpp
// Device Detection & Classification
bool Bacnet_Private_Device(int device_type);  // T3000 device identification
void LocalIAmHandler(uint8_t * service_request, uint16_t service_len, BACNET_ADDRESS * src);
void Send_WhoIs_remote_ip(CString ipaddress);

// Error Handling
void LocalBacnetAbortHandler(BACNET_ADDRESS* src, uint8_t invoke_id, uint8_t abort_reason, bool server);
void LocalBacnetReadErrorHandler(BACNET_ADDRESS* src, uint8_t invoke_id,
                                BACNET_ERROR_CLASS error_class, BACNET_ERROR_CODE error_code);
```

### **3. Menu Integration & User Interface**

#### **A. BACnet Menu System**
- **Menu Path**: `Tools > Bacnet Tool` (`ID_DATABASE_BACNETTOOL`)
- **Implementation**: `OnDatabaseBacnettool()` in MainFrm.cpp
- **Status**: Currently launches external `BacnetExplore.exe` (YABE-based tool)

#### **B. Current Menu Handler**
```cpp
void CMainFrame::OnDatabaseBacnettool()
{
    close_bac_com(); // Release BACnet port for YABE
    CString CS_BacnetExplore_Path = ApplicationFolder + _T("\\BacnetExplore.exe");

    // Get selected device and network information
    CString selecteditemstr = m_pTreeViewCrl->GetItemText(item);
    CString selectednetwork = m_current_tree_node.NetworkCard_Address;

    // Launch YABE with device selection
    ShellExecute(NULL, L"open", CS_BacnetExplore_Path,
                selecteditemstr + " " + selectednetwork, NULL, SW_SHOWNORMAL);

    // Socket cleanup and monitoring
    if (bip_socket() > 0) {
        ::closesocket(bip_socket());
        bip_set_socket(NULL);
    }
}
```

### **4. Trend Log Infrastructure**

#### **A. Existing Trend Log Components**
- **CTrendLogView**: Form view for trend log display (TrendLogView.h/cpp)
- **CTrendLogWnd**: Trend log window component (m_TrendLogWnd member)
- **BACnet Trend Objects**: Support for `OBJECT_TRENDLOG` and `OBJECT_TREND_LOG_MULTIPLE`

#### **B. T3000 Trend Log Storage**
```cpp
// Trend log file management (BacnetMonitor.cpp)
extern CString g_trendlog_ini_path;  // INI-based trend log storage

// Trend log data persistence
WritePrivateProfileString(temp_serial, temp_monitor_index, WriteValue, g_trendlog_ini_path);
GetPrivateProfileString(temp_serial, temp_monitor_index, _T(""), ReadPackage.GetBuffer(),
                       GRAPHIC_MAX_PACKAGE * 2 + 100, g_trendlog_ini_path);
```

#### **C. C# BACnet Trend Log Display**
```csharp
// TrendLogDisplay.cs - Full BACnet trend log visualization
public partial class TrendLogDisplay : Form
{
    int Logsize;
    PointPairList[] Pointslists;
    BacnetClient comm;
    BacnetAddress adr;
    BacnetObjectId object_id;

    // Trend log reading with ReadRange
    private int ReadRangeSize(BacnetClient comm, BacnetAddress adr, BacnetObjectId object_id);
    private void DownloadFullTrendLog(); // Background thread implementation

    // Multiple trend log support
    if (object_id.type == BacnetObjectTypes.OBJECT_TREND_LOG_MULTIPLE)
        CurvesNumber = ReadNumberofCurves(comm, adr, object_id);
}
```

### **5. WebView Integration**

#### **A. WebView BACnet Bridge (BacnetWebView.cpp)**
- **webview_run_server()**: Server function for WebView communication
- **HandleWebViewMsg()**: JSON message processing with mutex protection
- **WebMessageReceived()**: WebView2 message handler

#### **B. Message Types (WEBVIEW_MESSAGE_TYPE enum)**
```cpp
enum WEBVIEW_MESSAGE_TYPE
{
    GET_PANEL_DATA = 0,
    GET_INITIAL_DATA = 1,
    SAVE_GRAPHIC_DATA = 2,
    UPDATE_ENTRY = 3,
    GET_PANELS_LIST = 4,
    GET_PANEL_RANGE_INFO = 5,
    GET_ENTRIES = 6,
    LOAD_GRAPHIC_ENTRY = 7,
    OPEN_ENTRY_EDIT_WINDOW = 8,
    SAVE_IMAGE = 9,
    SAVE_LIBRAY_DATA = 10,
    DELETE_IMAGE = 11,
    GET_SELECTED_DEVICE_INFO = 12,
    BIND_DEVICE = 13,
    SAVE_NEW_LIBRARY_DATA = 14,
    // ✅ Ready for BACnet extension:
    // BACNET_DISCOVER_DEVICES = 15,
    // BACNET_START_TREND_POLLING = 16,
    // BACNET_STOP_TREND_POLLING = 17,
    // BACNET_GET_TREND_DATA = 18
};
```

### **6. Database Integration**

#### **A. SQLite Infrastructure**
- **CppSQLite3**: Already used throughout T3000
- **Building Database**: `g_strCurBuildingDatabasefilePath` pattern
- **Device Tables**: Existing device management in Building table

#### **B. Current Data Storage Patterns**
```cpp
// Example from ApplyGraphicLabelsDlg.cpp
CppSQLite3DB SqliteDBBuilding;
SqliteDBBuilding.open((UTF8MBSTR)g_strCurBuildingDatabasefilePath);

CppSQLite3Table table = SqliteDBBuilding.getTable("SELECT * FROM Building WHERE Unique_ID = %d", device_id);
for (int i = 0; i < table.numRows(); i++) {
    // Process device data
}
```

## 🔍 **Protocol Support Analysis**

### **1. BACnet Services Implemented**

#### **A. Core Services**
- ✅ **WHO-IS/I-AM**: Device discovery
- ✅ **ReadProperty**: Single property reads
- ✅ **ReadPropertyMultiple**: Block reads (efficient polling)
- ✅ **WriteProperty**: Single property writes
- ✅ **WritePropertyMultiple**: Block writes
- ✅ **COV (Change of Value)**: Real-time notifications
- ✅ **ReadRange**: Trend log data retrieval

#### **B. Object Types Supported**
- ✅ **Analog Input (AI)**: Present value, units, description
- ✅ **Analog Output (AO)**: Present value, priority arrays
- ✅ **Digital Input (DI)**: Present value, polarity
- ✅ **Digital Output (DO)**: Present value, polarity
- ✅ **Analog Value (AV)**: Present value, priority arrays
- ✅ **Binary Value (BV)**: Present value, priority arrays
- ✅ **Calendar Objects**: Schedule management
- ✅ **Schedule Objects**: Time-based control
- ✅ **Trend Log Objects**: Historical data storage
- ✅ **Device Objects**: Device properties

#### **C. Network Transports**
- ✅ **BACnet/IP**: UDP port 47808 (standard)
- ✅ **BACnet MS/TP**: Serial communication
- ✅ **BACnet Ethernet**: Direct Ethernet support

### **2. T3-TB Device Support**

#### **A. Device Type Constants (from T3000 source)**
```cpp
// T3-TB Device Types (identified in previous analysis)
#define T3_TB      84   // 8 Digital Inputs + 8 Digital Outputs
#define T3_TB_11I  203  // 11 Analog Inputs

// Device identification function
bool Bacnet_Private_Device(int device_type) {
    return (device_type == T3_TB || device_type == T3_TB_11I || /* other T3000 devices */);
}
```

#### **B. Vendor Information**
- **Vendor ID**: 644 (Temco Controls)
- **Device Models**: T3-TB series controllers
- **Protocol Support**: BACnet/IP and MS/TP

## 🔧 **Current Implementation Status**

### **✅ Fully Implemented & Working**

1. **BACnet Stack**: Complete C++ and C# implementations
2. **Device Discovery**: WHO-IS/I-AM with device classification
3. **Property Operations**: Read/Write with blocking and async variants
4. **Multiple Property Support**: ReadPropertyMultiple for efficient polling
5. **Transport Layers**: BACnet/IP and MS/TP
6. **Error Handling**: Comprehensive error and abort handling
7. **WebView Bridge**: JSON message processing framework
8. **Database Integration**: SQLite patterns and building database
9. **Trend Log Display**: Full C# visualization with ZedGraph
10. **Socket Management**: Port management and conflict resolution

### **🚧 Partially Implemented**

1. **Menu Integration**: External YABE tool vs. integrated solution
2. **Trend Log Storage**: INI files vs. database storage
3. **WebView BACnet Messages**: Framework ready, BACnet types not yet added
4. **T3-TB Specific Handling**: Generic BACnet vs. device-specific optimization

### **❌ Missing Components**

1. **Automated BACnet Polling**: No background polling service
2. **Trend Data Aggregation**: No time-series data management
3. **Multi-Client Coordination**: Panel vs. browser access coordination
4. **Performance Optimization**: No caching or batching for trend data
5. **Real-time Streaming**: No live data updates to WebView

## 🚀 **Integration Opportunities**

### **1. Immediate Wins (1-2 weeks)**

#### **A. Extend WebView Message Types**
```cpp
// Add to existing WEBVIEW_MESSAGE_TYPE enum
case BACNET_DISCOVER_DEVICES:
    DiscoverBACnetDevices(json, tempjson);
    break;

case BACNET_START_TREND_POLLING:
    StartBACnetTrendPolling(json, tempjson);
    break;

case BACNET_GET_TREND_DATA:
    GetBACnetTrendData(json, tempjson);
    break;
```

#### **B. Leverage Existing BACnet Functions**
```cpp
void DiscoverBACnetDevices(Json::Value& request, Json::Value& response)
{
    // Use existing T3000 functions
    Send_WhoIs_remote_ip("255.255.255.255");

    // Filter for T3-TB devices using existing function
    for (auto& device : discovered_devices) {
        if (Bacnet_Private_Device(device.product_type)) {
            // Add to response
        }
    }
}
```

### **2. Medium-term Enhancements (2-4 weeks)**

#### **A. Database Schema Extension**
```sql
-- Extend existing Building table
ALTER TABLE Building ADD COLUMN bacnet_device_instance INTEGER;
ALTER TABLE Building ADD COLUMN bacnet_vendor_id INTEGER;
ALTER TABLE Building ADD COLUMN supports_block_read INTEGER DEFAULT 0;

-- New BACnet-specific tables
CREATE TABLE bacnet_trend_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    building_id INTEGER REFERENCES Building(Unique_ID),
    object_type TEXT NOT NULL,
    object_instance INTEGER NOT NULL,
    timestamp INTEGER NOT NULL,
    value REAL,
    quality TEXT DEFAULT 'good'
);
```

#### **B. Polling Engine Integration**
```cpp
class T3000BACnetPollingEngine {
private:
    std::vector<BackgroundPollingTask> polling_tasks;

public:
    void StartT3TBPolling(int device_id, int interval_seconds) {
        // Use existing Bacnet_Read_Properties_Multiple_Blocking
        // Store results using existing CppSQLite3 patterns
        // Notify WebView using existing HandleWebViewMsg framework
    }
};
```

### **3. Advanced Features (4-8 weeks)**

#### **A. Replace INI with Database Storage**
```cpp
void StoreTrendLogData(int device_id, const BACnetTrendData& data)
{
    // Replace existing INI operations:
    // WritePrivateProfileString(temp_serial, temp_monitor_index, WriteValue, g_trendlog_ini_path);

    // With SQLite operations:
    CppSQLite3DB database;
    database.open(g_strCurBuildingDatabasefilePath);
    database.execDML("INSERT INTO bacnet_trend_data VALUES (...)");
}
```

#### **B. Real-time WebView Updates**
```cpp
void NotifyWebViewTrendData(int object_id, const std::vector<TrendDataPoint>& data)
{
    Json::Value message;
    message["type"] = "bacnet_trend_data_update";
    message["objectId"] = object_id;
    // Use existing WebView message sending
}
```

## 🏁 **Recommended Implementation Strategy**

### **Phase 1: Leverage Existing Infrastructure (Week 1)**
1. **Extend WebView Messages**: Add BACnet message types to existing framework
2. **Device Discovery**: Use existing `Send_WhoIs_remote_ip()` and device filtering
3. **Testing**: Validate with existing `TemcoStandardBacnetTool`

### **Phase 2: T3-TB Polling Engine (Weeks 2-3)**
1. **Polling Implementation**: Use existing `Bacnet_Read_Properties_Multiple_Blocking()`
2. **Database Storage**: Extend existing SQLite schema and patterns
3. **WebView Integration**: Stream data via existing message framework

### **Phase 3: UI Integration (Week 4)**
1. **Menu Enhancement**: Replace external YABE with integrated BACnet tools
2. **Trend Visualization**: Integrate existing `TrendLogDisplay.cs` components
3. **Real-time Updates**: Implement live data streaming

### **Phase 4: Production Optimization (Weeks 5-6)**
1. **Performance**: Optimize polling intervals and batch operations
2. **Error Handling**: Enhance existing error management
3. **Multi-client**: Coordinate panel vs. browser access

## 📊 **Architecture Benefits**

### **✅ Using Existing T3000 BACnet Stack**

1. **Mature Technology**: 2,724+ lines of proven BACnet client code
2. **Native Performance**: C++ implementation with direct hardware access
3. **Seamless Integration**: Uses existing T3000 patterns and infrastructure
4. **Advanced Features**: ReadPropertyMultiple, COV, trend logs built-in
5. **No External Dependencies**: Self-contained within T3000 ecosystem
6. **Existing Tools**: Can leverage `TemcoStandardBacnetTool` for testing
7. **Socket Management**: Built-in port management and conflict resolution
8. **Error Handling**: Comprehensive error, abort, and timeout handling

### **❌ Drawbacks of External Libraries (Node-BACnet, etc.)**

1. **Integration Complexity**: Requires bridging between technologies
2. **Performance Overhead**: Additional process and communication layers
3. **Dependency Management**: External library updates and compatibility
4. **Debugging Complexity**: Multiple technology stacks to troubleshoot
5. **Resource Usage**: Additional memory and CPU overhead
6. **Port Conflicts**: Potential conflicts with existing T3000 BACnet stack

## 🎯 **Conclusion**

T3000 contains a **comprehensive, production-ready BACnet infrastructure** that can be **extended rather than replaced** to implement trend log polling. The existing architecture provides:

- ✅ Complete BACnet protocol implementation (C++ and C#)
- ✅ Device discovery and management
- ✅ Property read/write operations with blocking variants
- ✅ ReadPropertyMultiple for efficient polling
- ✅ WebView integration framework
- ✅ SQLite database patterns
- ✅ Trend log visualization components
- ✅ T3-TB device support and identification

**Recommendation**: Extend the existing T3000 BACnet infrastructure by adding BACnet-specific message types to the WebView framework and implementing a polling engine that leverages existing `Bacnet_Read_Properties_Multiple_Blocking()` functions.

This approach will deliver faster implementation, better performance, easier maintenance, and seamless integration with the existing T3000 ecosystem.

---

**Analysis Status**: ✅ Complete - Ready for implementation planning
**Next Step**: Design specific WebView message extensions and polling engine architecture
**Estimated Implementation**: 4-6 weeks using existing infrastructure vs. 12+ weeks with external libraries
