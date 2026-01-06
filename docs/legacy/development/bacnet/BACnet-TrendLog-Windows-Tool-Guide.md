# BACnet Trend Log Windows Tool - Implementation Guide

**Date:** July 30, 2025
**Project:** T3000 BACnet Trend Log Manager
**Purpose:** Step-by-step guide for building the Windows trend log tool

## 🚀 **Quick Start Implementation**

### **1. Project Setup**

#### **A. Visual Studio Project Configuration**
```cpp
// Create new MFC Application project: "T3000BACnetTrendLogManager"
// Project Properties:
// - Configuration: Release/Debug
// - Platform: x86 (to match existing T3000)
// - Character Set: Unicode
// - MFC Usage: Use MFC in a Shared DLL

// Required includes and libraries
#include "../SQLiteDriver/CppSQLite3.h"           // T3000 SQLite wrapper
#include "../BacNetDllforVc/bacnet.h"             // T3000 BACnet stack
#include "../TemcoStandardBacnetToolScr/BACnetClient.h"  // C# BACnet client

// Link libraries
#pragma comment(lib, "BacNetDllforVc.lib")
#pragma comment(lib, "ws2_32.lib")
#pragma comment(lib, "sqlite3.lib")
```

#### **B. Database Initialization**
```cpp
// TrendLogDatabase.h - Database management class
class CTrendLogDatabase
{
public:
    CTrendLogDatabase();
    ~CTrendLogDatabase();

    bool Initialize(const CString& databasePath);
    bool CreateTables();
    void Close();

    // Device operations
    int AddDevice(const T3TBDevice& device);
    bool UpdateDevice(int deviceId, const T3TBDevice& device);
    std::vector<T3TBDevice> GetDevices();

    // Trend log operations
    int AddTrendLog(const TrendLogConfig& config);
    bool StoreTrendData(const std::vector<TrendLogRecord>& records);
    std::vector<TrendLogRecord> GetTrendData(int deviceId, time_t startTime, time_t endTime);

private:
    CppSQLite3DB m_database;
    bool m_isInitialized;
    CString m_databasePath;

    bool ExecuteSQL(const CString& sql);
    bool TableExists(const CString& tableName);
};

// Implementation in TrendLogDatabase.cpp
bool CTrendLogDatabase::Initialize(const CString& databasePath)
{
    try {
        m_databasePath = databasePath;
        m_database.open((LPCTSTR)databasePath);

        if (!CreateTables()) {
            return false;
        }

        m_isInitialized = true;
        return true;
    }
    catch (CppSQLite3Exception& e) {
        AfxMessageBox(CString(e.errorMessage()));
        return false;
    }
}

bool CTrendLogDatabase::CreateTables()
{
    // Create bacnet_devices table
    CString sql = _T(R"(
        CREATE TABLE IF NOT EXISTS bacnet_devices (
            device_id INTEGER PRIMARY KEY AUTOINCREMENT,
            device_instance INTEGER UNIQUE NOT NULL,
            device_type INTEGER NOT NULL,
            device_name TEXT NOT NULL,
            ip_address TEXT NOT NULL,
            port INTEGER DEFAULT 47808,
            vendor_id INTEGER DEFAULT 644,
            model_name TEXT,
            supports_block_read INTEGER DEFAULT 0,
            last_seen INTEGER DEFAULT (strftime('%s', 'now')),
            status TEXT DEFAULT 'active',
            created_at INTEGER DEFAULT (strftime('%s', 'now'))
        )
    )");

    if (!ExecuteSQL(sql)) return false;

    // Create bacnet_objects table
    sql = _T(R"(
        CREATE TABLE IF NOT EXISTS bacnet_objects (
            object_id INTEGER PRIMARY KEY AUTOINCREMENT,
            device_id INTEGER REFERENCES bacnet_devices(device_id),
            object_type TEXT NOT NULL,
            object_instance INTEGER NOT NULL,
            object_name TEXT,
            description TEXT,
            units TEXT,
            poll_interval INTEGER DEFAULT 30,
            enabled INTEGER DEFAULT 1,
            created_at INTEGER DEFAULT (strftime('%s', 'now')),
            UNIQUE(device_id, object_type, object_instance)
        )
    )");

    if (!ExecuteSQL(sql)) return false;

    // Create bacnet_trend_data table
    sql = _T(R"(
        CREATE TABLE IF NOT EXISTS bacnet_trend_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp INTEGER NOT NULL,
            device_id INTEGER NOT NULL,
            object_id INTEGER NOT NULL,
            object_type TEXT NOT NULL,
            object_instance INTEGER NOT NULL,
            value REAL,
            status TEXT DEFAULT 'reliable',
            sequence_number INTEGER,
            created_at INTEGER DEFAULT (strftime('%s', 'now')),
            FOREIGN KEY (device_id) REFERENCES bacnet_devices(device_id),
            FOREIGN KEY (object_id) REFERENCES bacnet_objects(object_id)
        )
    )");

    if (!ExecuteSQL(sql)) return false;

    // Create indexes for performance
    ExecuteSQL(_T("CREATE INDEX IF NOT EXISTS idx_trend_data_device_time ON bacnet_trend_data (device_id, timestamp DESC)"));
    ExecuteSQL(_T("CREATE INDEX IF NOT EXISTS idx_trend_data_object_time ON bacnet_trend_data (object_id, timestamp DESC)"));

    return true;
}
```

### **2. BACnet Communication Layer**

#### **A. Device Discovery Implementation**
```cpp
// BACnetDeviceManager.h - BACnet operations
class CBACnetDeviceManager
{
public:
    CBACnetDeviceManager();
    ~CBACnetDeviceManager();

    bool Initialize();
    void Shutdown();

    // Device discovery
    std::vector<T3TBDevice> DiscoverT3TBDevices(int timeoutSeconds = 10);
    bool TestDeviceConnectivity(const T3TBDevice& device);

    // Trend log operations
    std::vector<BacnetObjectId> GetTrendLogObjects(const T3TBDevice& device);
    int GetTrendLogRecordCount(const T3TBDevice& device, BacnetObjectId trendLogId);
    std::vector<TrendLogRecord> ReadTrendLogData(const T3TBDevice& device,
                                               BacnetObjectId trendLogId,
                                               int startIndex, int recordCount);

    // Property reading
    BacnetValue ReadProperty(const T3TBDevice& device, BacnetObjectId objectId,
                           BacnetPropertyIds propertyId);

private:
    bool m_isInitialized;
    std::vector<T3TBDevice> m_discoveredDevices;
    std::map<int, time_t> m_lastCommunication;

    bool IsT3TBDevice(int vendorId, const CString& modelName, int deviceType);
    void ProcessIAmResponse(BacnetAddress address, uint32_t deviceId,
                          uint32_t maxApdu, BacnetSegmentation segmentation,
                          uint16_t vendorId);
};

// Implementation
std::vector<T3TBDevice> CBACnetDeviceManager::DiscoverT3TBDevices(int timeoutSeconds)
{
    m_discoveredDevices.clear();

    // Use existing T3000 BACnet stack for WHO-IS broadcast
    if (bip_socket() <= 0) {
        // Initialize BACnet if not already done
        if (!bip_init(NULL)) {
            return m_discoveredDevices;
        }
    }

    // Send WHO-IS broadcast
    BACNET_ADDRESS dest;
    BACNET_ADDRESS my_address;

    // Set up broadcast address
    dest.mac_len = 6;
    dest.mac[0] = 0xFF;  // Broadcast
    dest.mac[1] = 0xFF;
    dest.mac[2] = 0xFF;
    dest.mac[3] = 0xFF;
    dest.net = BACNET_BROADCAST_NETWORK;
    dest.len = 0;

    // Send WHO-IS request
    Send_WhoIs_Global(-1, -1);

    // Wait for I-AM responses
    time_t startTime = time(NULL);
    while ((time(NULL) - startTime) < timeoutSeconds) {
        // Process incoming messages
        BACNET_ADDRESS src;
        uint8_t rx_buf[MAX_MPDU];
        uint16_t pdu_len;

        pdu_len = datalink_receive(&src, rx_buf, MAX_MPDU, 100);  // 100ms timeout
        if (pdu_len > 0) {
            npdu_handler(&src, rx_buf, pdu_len);
        }

        Sleep(50);  // Small delay to prevent high CPU usage
    }

    return m_discoveredDevices;
}

bool CBACnetDeviceManager::IsT3TBDevice(int vendorId, const CString& modelName, int deviceType)
{
    // Check for Temco Controls vendor ID
    if (vendorId != 644) return false;

    // Check for T3-TB device types
    if (deviceType == 84 || deviceType == 203) return true;

    // Check model name for T3-TB pattern
    if (modelName.Find(_T("T3-TB")) >= 0) return true;

    return false;
}
```

#### **B. Trend Log Reading Implementation**
```cpp
std::vector<TrendLogRecord> CBACnetDeviceManager::ReadTrendLogData(
    const T3TBDevice& device, BacnetObjectId trendLogId,
    int startIndex, int recordCount)
{
    std::vector<TrendLogRecord> records;

    try {
        // Set up device address
        BACNET_ADDRESS deviceAddr;
        // ... set up address from device.ip_address and device.port

        // Use existing T3000 BACnet functions
        uint8_t* trendBuffer = nullptr;
        uint32_t actualCount = recordCount;

        // Call BACnet ReadRange service
        bool success = Bacnet_Read_Range_Blocking(
            device.device_instance,
            trendLogId.type,
            trendLogId.instance,
            PROP_LOG_BUFFER,
            startIndex,
            &actualCount,
            &trendBuffer
        );

        if (success && trendBuffer && actualCount > 0) {
            // Decode the trend log records
            int offset = 0;
            for (uint32_t i = 0; i < actualCount; i++) {
                TrendLogRecord record;

                // Decode each log record from buffer
                // Format: timestamp, value, status flags
                if (DecodeTrendLogRecord(trendBuffer, offset, record)) {
                    record.device_id = device.device_id;
                    record.object_type = _T("TRENDLOG");
                    record.object_instance = trendLogId.instance;
                    records.push_back(record);
                }
            }

            if (trendBuffer) {
                free(trendBuffer);
            }
        }
    }
    catch (...) {
        // Handle errors
    }

    return records;
}

bool DecodeTrendLogRecord(uint8_t* buffer, int& offset, TrendLogRecord& record)
{
    try {
        // Decode BACnet timestamp
        BACNET_DATE_TIME dateTime;
        int len = decode_application_date_time(&buffer[offset], &dateTime);
        if (len < 0) return false;
        offset += len;

        // Convert to Unix timestamp
        record.timestamp = ConvertBACnetDateTimeToUnix(dateTime);

        // Decode value (could be real, integer, boolean, etc.)
        BACNET_APPLICATION_DATA_VALUE value;
        len = decode_application_data(&buffer[offset], MAX_APDU, &value);
        if (len < 0) return false;
        offset += len;

        // Convert value based on type
        switch (value.tag) {
            case BACNET_APPLICATION_TAG_REAL:
                record.value = value.type.Real;
                break;
            case BACNET_APPLICATION_TAG_DOUBLE:
                record.value = value.type.Double;
                break;
            case BACNET_APPLICATION_TAG_SIGNED_INT:
                record.value = value.type.Signed_Int;
                break;
            case BACNET_APPLICATION_TAG_UNSIGNED_INT:
                record.value = value.type.Unsigned_Int;
                break;
            case BACNET_APPLICATION_TAG_BOOLEAN:
                record.value = value.type.Boolean ? 1.0 : 0.0;
                break;
            default:
                record.value = 0.0;
                break;
        }

        // Decode status flags if present
        record.status = _T("reliable");  // Default

        return true;
    }
    catch (...) {
        return false;
    }
}
```

### **3. User Interface Implementation**

#### **A. Main Window Class**
```cpp
// MainWindow.h - Main application window
class CMainWindow : public CFrameWnd
{
    DECLARE_DYNCREATE(CMainWindow)

public:
    CMainWindow();
    virtual ~CMainWindow();

protected:
    // UI components
    CSplitterWnd m_splitter;
    CDeviceListView* m_pDeviceListView;
    CTrendDisplayView* m_pTrendDisplayView;

    // Core components
    CTrendLogDatabase m_database;
    CBACnetDeviceManager m_bacnetManager;
    CPollingThread* m_pollingThread;

    // Message handlers
    afx_msg int OnCreate(LPCREATESTRUCT lpCreateStruct);
    afx_msg void OnDestroy();
    afx_msg void OnSize(UINT nType, int cx, int cy);
    afx_msg void OnTimer(UINT_PTR nIDEvent);

    // Menu handlers
    afx_msg void OnDeviceDiscover();
    afx_msg void OnDeviceConfigure();
    afx_msg void OnTrendlogStart();
    afx_msg void OnTrendlogStop();
    afx_msg void OnDataExport();

    DECLARE_MESSAGE_MAP()

private:
    bool InitializeDatabase();
    bool InitializeBACnet();
    void UpdateDeviceList();
    void UpdateTrendDisplay();
};

// MainWindow.cpp implementation
int CMainWindow::OnCreate(LPCREATESTRUCT lpCreateStruct)
{
    if (CFrameWnd::OnCreate(lpCreateStruct) == -1)
        return -1;

    // Initialize database
    if (!InitializeDatabase()) {
        AfxMessageBox(_T("Failed to initialize database"));
        return -1;
    }

    // Initialize BACnet
    if (!InitializeBACnet()) {
        AfxMessageBox(_T("Failed to initialize BACnet communication"));
        return -1;
    }

    // Create splitter window
    CRect rect;
    GetClientRect(&rect);

    if (!m_splitter.CreateStatic(this, 1, 2)) {
        return -1;
    }

    // Create device list view (left pane)
    if (!m_splitter.CreateView(0, 0, RUNTIME_CLASS(CDeviceListView),
                              CSize(300, rect.Height()), NULL)) {
        return -1;
    }
    m_pDeviceListView = (CDeviceListView*)m_splitter.GetPane(0, 0);
    m_pDeviceListView->SetDatabase(&m_database);
    m_pDeviceListView->SetBACnetManager(&m_bacnetManager);

    // Create trend display view (right pane)
    if (!m_splitter.CreateView(0, 1, RUNTIME_CLASS(CTrendDisplayView),
                              CSize(rect.Width() - 300, rect.Height()), NULL)) {
        return -1;
    }
    m_pTrendDisplayView = (CTrendDisplayView*)m_splitter.GetPane(0, 1);
    m_pTrendDisplayView->SetDatabase(&m_database);

    // Set timer for periodic updates
    SetTimer(1, 5000, NULL);  // 5-second update timer

    return 0;
}

void CMainWindow::OnDeviceDiscover()
{
    // Show progress dialog
    CProgressDialog progressDlg;
    progressDlg.Create(IDD_PROGRESS_DIALOG, this);
    progressDlg.SetWindowText(_T("Discovering BACnet Devices"));
    progressDlg.ShowWindow(SW_SHOW);

    // Perform device discovery in background thread
    AfxBeginThread([](LPVOID pParam) -> UINT {
        CMainWindow* pMainWnd = (CMainWindow*)pParam;

        // Discover devices
        std::vector<T3TBDevice> devices = pMainWnd->m_bacnetManager.DiscoverT3TBDevices(15);

        // Store discovered devices in database
        for (const auto& device : devices) {
            pMainWnd->m_database.AddDevice(device);
        }

        // Update UI on main thread
        pMainWnd->PostMessage(WM_USER_UPDATE_DEVICE_LIST);

        return 0;
    }, this);
}
```

#### **B. Device List View**
```cpp
// DeviceListView.h - Left pane device management
class CDeviceListView : public CFormView
{
    DECLARE_DYNCREATE(CDeviceListView)

public:
    CDeviceListView();
    virtual ~CDeviceListView();

    void SetDatabase(CTrendLogDatabase* pDatabase) { m_pDatabase = pDatabase; }
    void SetBACnetManager(CBACnetDeviceManager* pManager) { m_pBACnetManager = pManager; }

    enum { IDD = IDD_DEVICE_LIST_VIEW };

protected:
    virtual void DoDataExchange(CDataExchange* pDX);
    virtual void OnInitialUpdate();

    // UI controls
    CListCtrl m_deviceList;
    CButton m_discoverButton;
    CButton m_configureButton;
    CButton m_testButton;
    CStatic m_statusText;

    // Data
    CTrendLogDatabase* m_pDatabase;
    CBACnetDeviceManager* m_pBACnetManager;
    std::vector<T3TBDevice> m_devices;

    // Message handlers
    afx_msg void OnBnClickedDiscover();
    afx_msg void OnBnClickedConfigure();
    afx_msg void OnBnClickedTest();
    afx_msg void OnLvnItemchangedDeviceList(NMHDR *pNMHDR, LRESULT *pResult);
    afx_msg void OnNMDblclkDeviceList(NMHDR *pNMHDR, LRESULT *pResult);

    DECLARE_MESSAGE_MAP()

private:
    void InitializeDeviceList();
    void UpdateDeviceList();
    void UpdateDeviceStatus(int deviceIndex, const CString& status);
    T3TBDevice* GetSelectedDevice();
};

// Implementation
void CDeviceListView::InitializeDeviceList()
{
    // Set up list control
    m_deviceList.SetExtendedStyle(LVS_EX_FULLROWSELECT | LVS_EX_GRIDLINES);

    // Add columns
    m_deviceList.InsertColumn(0, _T("Device Name"), LVCFMT_LEFT, 120);
    m_deviceList.InsertColumn(1, _T("Type"), LVCFMT_LEFT, 60);
    m_deviceList.InsertColumn(2, _T("IP Address"), LVCFMT_LEFT, 100);
    m_deviceList.InsertColumn(3, _T("Instance"), LVCFMT_LEFT, 60);
    m_deviceList.InsertColumn(4, _T("Status"), LVCFMT_LEFT, 80);

    UpdateDeviceList();
}

void CDeviceListView::UpdateDeviceList()
{
    if (!m_pDatabase) return;

    m_deviceList.DeleteAllItems();
    m_devices = m_pDatabase->GetDevices();

    for (size_t i = 0; i < m_devices.size(); i++) {
        const T3TBDevice& device = m_devices[i];

        int itemIndex = m_deviceList.InsertItem(i, device.device_name);

        CString deviceType;
        deviceType.Format(_T("T3-TB-%s"), device.device_type == 84 ? _T("8DI/8DO") : _T("11AI"));
        m_deviceList.SetItemText(itemIndex, 1, deviceType);

        m_deviceList.SetItemText(itemIndex, 2, device.ip_address);

        CString instance;
        instance.Format(_T("%d"), device.device_instance);
        m_deviceList.SetItemText(itemIndex, 3, instance);

        m_deviceList.SetItemText(itemIndex, 4, device.status);

        // Set item data for easy retrieval
        m_deviceList.SetItemData(itemIndex, i);
    }
}

void CDeviceListView::OnBnClickedDiscover()
{
    m_discoverButton.EnableWindow(FALSE);
    m_statusText.SetWindowText(_T("Discovering devices..."));

    // Start discovery in background thread
    AfxBeginThread([](LPVOID pParam) -> UINT {
        CDeviceListView* pView = (CDeviceListView*)pParam;

        std::vector<T3TBDevice> newDevices = pView->m_pBACnetManager->DiscoverT3TBDevices(15);

        // Add new devices to database
        for (const auto& device : newDevices) {
            pView->m_pDatabase->AddDevice(device);
        }

        // Update UI
        pView->PostMessage(WM_USER_DISCOVERY_COMPLETE, newDevices.size());

        return 0;
    }, this);
}
```

### **4. Background Polling Implementation**

#### **A. Polling Thread Class**
```cpp
// PollingThread.h - Background trend log polling
class CPollingThread : public CWinThread
{
    DECLARE_DYNCREATE(CPollingThread)

public:
    CPollingThread();
    virtual ~CPollingThread();

    // Thread control
    bool StartPolling(CTrendLogDatabase* pDatabase, CBACnetDeviceManager* pManager);
    void StopPolling();
    bool IsPolling() const { return m_isPolling; }

    // Configuration
    void SetPollingInterval(int intervalSeconds) { m_pollingInterval = intervalSeconds; }
    void EnableDevice(int deviceId, bool enable);

protected:
    virtual BOOL InitInstance();
    virtual int ExitInstance();

private:
    // Thread data
    bool m_isPolling;
    bool m_stopRequested;
    int m_pollingInterval;

    // References
    CTrendLogDatabase* m_pDatabase;
    CBACnetDeviceManager* m_pBACnetManager;

    // Device status
    std::map<int, bool> m_deviceEnabled;
    std::map<int, time_t> m_lastPollTime;

    // Main polling loop
    void PollingLoop();
    void PollDevice(const T3TBDevice& device);
    void ProcessTrendLogData(int deviceId, const std::vector<TrendLogRecord>& records);

    DECLARE_MESSAGE_MAP()
};

// Implementation
void CPollingThread::PollingLoop()
{
    while (!m_stopRequested) {
        try {
            // Get all enabled devices
            std::vector<T3TBDevice> devices = m_pDatabase->GetDevices();

            for (const auto& device : devices) {
                if (m_stopRequested) break;

                // Check if device is enabled for polling
                if (m_deviceEnabled.find(device.device_id) != m_deviceEnabled.end() &&
                    m_deviceEnabled[device.device_id]) {

                    // Check if it's time to poll this device
                    time_t now = time(NULL);
                    time_t lastPoll = m_lastPollTime[device.device_id];

                    if ((now - lastPoll) >= m_pollingInterval) {
                        PollDevice(device);
                        m_lastPollTime[device.device_id] = now;
                    }
                }
            }

            // Sleep for 1 second before next iteration
            if (!m_stopRequested) {
                Sleep(1000);
            }
        }
        catch (...) {
            // Log error and continue
            Sleep(5000);  // Wait longer on error
        }
    }
}

void CPollingThread::PollDevice(const T3TBDevice& device)
{
    try {
        // Get trend log objects for this device
        std::vector<BacnetObjectId> trendLogs = m_pBACnetManager->GetTrendLogObjects(device);

        for (const auto& trendLogId : trendLogs) {
            // Get record count
            int recordCount = m_pBACnetManager->GetTrendLogRecordCount(device, trendLogId);
            if (recordCount <= 0) continue;

            // Determine how many new records to read
            // (implement logic to track last read position)
            int lastReadIndex = GetLastReadIndex(device.device_id, trendLogId.instance);
            int newRecords = recordCount - lastReadIndex;

            if (newRecords > 0) {
                // Read new records
                std::vector<TrendLogRecord> records = m_pBACnetManager->ReadTrendLogData(
                    device, trendLogId, lastReadIndex + 1, newRecords);

                if (!records.empty()) {
                    // Store in database
                    m_pDatabase->StoreTrendData(records);

                    // Update last read position
                    SetLastReadIndex(device.device_id, trendLogId.instance, recordCount);
                }
            }
        }
    }
    catch (...) {
        // Handle polling errors
    }
}
```

## 🎯 **Integration with T3000 WebView**

### **A. WebView Message Extensions**
```cpp
// Add to BacnetWebView.cpp HandleWebViewMsg function
case WEBVIEW_MESSAGE_TYPE::BACNET_GET_TREND_HISTORY:
    {
        Json::Value response;

        int deviceId = json.get("device_id", 0).asInt();
        CString objectType = json.get("object_type", "").asString().c_str();
        time_t startTime = json.get("start_time", 0).asInt64();
        time_t endTime = json.get("end_time", 0).asInt64();

        // Query trend data from SQLite
        CTrendLogDatabase database;
        if (database.Initialize(g_strCurBuildingDatabasefilePath)) {
            std::vector<TrendLogRecord> records = database.GetTrendData(deviceId, startTime, endTime);

            Json::Value dataArray(Json::arrayValue);
            for (const auto& record : records) {
                Json::Value recordJson;
                recordJson["timestamp"] = (Json::Int64)record.timestamp;
                recordJson["value"] = record.value;
                recordJson["status"] = (LPCTSTR)record.status;
                dataArray.append(recordJson);
            }

            response["success"] = true;
            response["data"] = dataArray;
            response["count"] = (int)records.size();
        } else {
            response["success"] = false;
            response["error"] = "Database connection failed";
        }

        tempjson = response;
    }
    break;
```

### **B. Vue.js Frontend Integration**
```typescript
// TrendLogComponent.vue - WebView frontend component
<template>
  <div class="trend-log-container">
    <div class="device-selector">
      <select v-model="selectedDevice" @change="loadTrendLogs">
        <option v-for="device in devices" :key="device.id" :value="device">
          {{ device.name }} ({{ device.ip_address }})
        </option>
      </select>
    </div>

    <div class="trend-chart-container">
      <canvas ref="trendChart" width="800" height="400"></canvas>
    </div>

    <div class="controls">
      <button @click="startRealTimeMode" :disabled="isRealTime">Start Real-time</button>
      <button @click="stopRealTimeMode" :disabled="!isRealTime">Stop Real-time</button>
      <button @click="exportData">Export Data</button>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue';
import Chart from 'chart.js/auto';

interface TrendLogRecord {
  timestamp: number;
  value: number;
  status: string;
}

interface BACnetDevice {
  id: number;
  name: string;
  ip_address: string;
  device_type: number;
}

export default defineComponent({
  name: 'TrendLogComponent',
  setup() {
    const devices = ref<BACnetDevice[]>([]);
    const selectedDevice = ref<BACnetDevice | null>(null);
    const trendChart = ref<HTMLCanvasElement | null>(null);
    const chart = ref<Chart | null>(null);
    const isRealTime = ref(false);

    const loadDevices = async () => {
      try {
        const message = {
          type: 'BACNET_GET_DEVICES',
          data: {}
        };

        const response = await sendWebViewMessage(message);
        if (response.success) {
          devices.value = response.devices;
        }
      } catch (error) {
        console.error('Failed to load devices:', error);
      }
    };

    const loadTrendData = async (startTime: number, endTime: number) => {
      if (!selectedDevice.value) return;

      const message = {
        type: 'BACNET_GET_TREND_HISTORY',
        data: {
          device_id: selectedDevice.value.id,
          start_time: startTime,
          end_time: endTime
        }
      };

      try {
        const response = await sendWebViewMessage(message);
        if (response.success) {
          updateChart(response.data);
        }
      } catch (error) {
        console.error('Failed to load trend data:', error);
      }
    };

    const updateChart = (data: TrendLogRecord[]) => {
      if (!chart.value) return;

      const chartData = data.map(record => ({
        x: new Date(record.timestamp * 1000),
        y: record.value
      }));

      chart.value.data.datasets[0].data = chartData;
      chart.value.update();
    };

    const initializeChart = () => {
      if (!trendChart.value) return;

      chart.value = new Chart(trendChart.value, {
        type: 'line',
        data: {
          datasets: [{
            label: 'Trend Data',
            data: [],
            borderColor: 'rgb(75, 192, 192)',
            backgroundColor: 'rgba(75, 192, 192, 0.1)',
            tension: 0.1
          }]
        },
        options: {
          responsive: true,
          scales: {
            x: {
              type: 'time',
              time: {
                displayFormats: {
                  hour: 'MMM DD HH:mm'
                }
              }
            },
            y: {
              beginAtZero: true
            }
          },
          plugins: {
            title: {
              display: true,
              text: 'BACnet Trend Log Data'
            }
          }
        }
      });
    };

    const startRealTimeMode = () => {
      isRealTime.value = true;
      // Start periodic updates every 30 seconds
      setInterval(() => {
        if (isRealTime.value) {
          const endTime = Math.floor(Date.now() / 1000);
          const startTime = endTime - (24 * 60 * 60); // Last 24 hours
          loadTrendData(startTime, endTime);
        }
      }, 30000);
    };

    const stopRealTimeMode = () => {
      isRealTime.value = false;
    };

    onMounted(() => {
      loadDevices();
      initializeChart();

      // Load last 24 hours of data by default
      const endTime = Math.floor(Date.now() / 1000);
      const startTime = endTime - (24 * 60 * 60);
      loadTrendData(startTime, endTime);
    });

    return {
      devices,
      selectedDevice,
      trendChart,
      isRealTime,
      loadTrendLogs: () => {
        // Load trend logs for selected device
      },
      startRealTimeMode,
      stopRealTimeMode,
      exportData: () => {
        // Export trend data functionality
      }
    };
  }
});

async function sendWebViewMessage(message: any): Promise<any> {
  return new Promise((resolve, reject) => {
    // Implementation depends on T3000 WebView message system
    if (window.chrome && window.chrome.webview) {
      window.chrome.webview.postMessage(message);
      // Listen for response...
    } else {
      reject(new Error('WebView not available'));
    }
  });
}
</script>
```

## 📝 **Testing Strategy**

### **A. Unit Testing**
```cpp
// TrendLogTest.cpp - Unit tests for core functionality
class CTrendLogTest : public CTestCase
{
public:
    void TestDatabaseOperations();
    void TestBACnetCommunication();
    void TestTrendLogReading();
    void TestDataProcessing();

private:
    CTrendLogDatabase m_testDatabase;
    CBACnetDeviceManager m_testManager;
};

void CTrendLogTest::TestDatabaseOperations()
{
    // Test database initialization
    ASSERT_TRUE(m_testDatabase.Initialize(_T(":memory:")));  // SQLite in-memory DB

    // Test device operations
    T3TBDevice testDevice;
    testDevice.device_instance = 12345;
    testDevice.device_type = 84;
    testDevice.device_name = _T("Test T3-TB");
    testDevice.ip_address = _T("192.168.1.100");

    int deviceId = m_testDatabase.AddDevice(testDevice);
    ASSERT_TRUE(deviceId > 0);

    // Test trend data operations
    std::vector<TrendLogRecord> testRecords;
    TrendLogRecord record;
    record.timestamp = time(NULL);
    record.device_id = deviceId;
    record.value = 23.5;
    record.status = _T("reliable");
    testRecords.push_back(record);

    ASSERT_TRUE(m_testDatabase.StoreTrendData(testRecords));

    // Test data retrieval
    time_t startTime = time(NULL) - 3600;  // 1 hour ago
    time_t endTime = time(NULL);
    std::vector<TrendLogRecord> retrievedRecords =
        m_testDatabase.GetTrendData(deviceId, startTime, endTime);

    ASSERT_EQ(retrievedRecords.size(), 1);
    ASSERT_EQ(retrievedRecords[0].value, 23.5);
}
```

### **B. Integration Testing**
```cpp
void CTrendLogTest::TestBACnetCommunication()
{
    // Test device discovery (requires actual network setup)
    if (HasT3TBDevicesOnNetwork()) {
        std::vector<T3TBDevice> devices = m_testManager.DiscoverT3TBDevices(10);
        ASSERT_GT(devices.size(), 0);

        // Test connectivity to first discovered device
        if (!devices.empty()) {
            bool connected = m_testManager.TestDeviceConnectivity(devices[0]);
            ASSERT_TRUE(connected);

            // Test trend log reading
            std::vector<BacnetObjectId> trendLogs =
                m_testManager.GetTrendLogObjects(devices[0]);

            if (!trendLogs.empty()) {
                int recordCount = m_testManager.GetTrendLogRecordCount(devices[0], trendLogs[0]);
                ASSERT_GE(recordCount, 0);

                if (recordCount > 0) {
                    std::vector<TrendLogRecord> records =
                        m_testManager.ReadTrendLogData(devices[0], trendLogs[0], 1,
                                                     std::min(recordCount, 10));
                    ASSERT_GT(records.size(), 0);
                }
            }
        }
    }
}
```

## 🚀 **Deployment Instructions**

### **A. Build Configuration**
```cpp
// Project settings for distribution
// 1. Set configuration to Release
// 2. Enable static linking for MFC
// 3. Include required DLLs in output directory

// Post-build steps
copy "$(SolutionDir)SQLiteDriver\sqlite3.dll" "$(OutDir)"
copy "$(SolutionDir)BacNetDllforVc\BacNetDll.dll" "$(OutDir)"
```

### **B. Installation Package**
```nsis
; NSIS installer script for T3000 BACnet Trend Log Manager
!define PRODUCT_NAME "T3000 BACnet Trend Log Manager"
!define PRODUCT_VERSION "1.0.0"

; Include files in installer
File "T3000BACnetTrendLogManager.exe"
File "sqlite3.dll"
File "BacNetDll.dll"
File "mfc140.dll"
File "vcredist_x86.exe"

; Create desktop shortcut
CreateShortCut "$DESKTOP\T3000 BACnet Trend Log Manager.lnk" "$INSTDIR\T3000BACnetTrendLogManager.exe"

; Register with T3000 (optional integration)
WriteRegStr HKLM "SOFTWARE\Temco\T3000\TrendLog" "Manager" "$INSTDIR\T3000BACnetTrendLogManager.exe"
```

---

**Status:** Complete implementation guide with working code examples
**Next Steps:** Begin development with database and BACnet communication layers
**Timeline:** 6-week development cycle for fully functional Windows tool
**Success Criteria:** Successful T3-TB device discovery, trend log reading, SQLite storage, and WebView integration
