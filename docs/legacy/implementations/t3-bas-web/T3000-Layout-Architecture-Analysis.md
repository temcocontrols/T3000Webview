# T3000 C++ Layout & Architecture - Complete Analysis

**Date**: November 4, 2025
**Purpose**: Comprehensive analysis of T3000 C++ UI structure for migration to T3BASWeb (Ant Design Vue)
**Status**: Analysis Complete

---

## Executive Summary

This document provides a complete architectural analysis of the T3000 C++ application's UI structure, focusing on the layout, navigation patterns, and view management system. This analysis will guide the migration to **T3BASWeb** using **Ant Design Vue**.

### Key Findings

- **Main Layout**: Classic desktop application with Menu Bar → Toolbar → Workspace (Left Tree + Central View) → Status Bar
- **37 View Types**: Dynamically switched in central area based on device type selection
- **229 Dialogs**: Modal dialogs for configuration, settings, and tools
- **Tree-Based Navigation**: Left panel tree drives central view switching
- **MFC Architecture**: Document/View pattern with dynamic view creation

---

## 1. Main Application Layout Structure

### 1.1 Overall Layout (CMainFrame)

```
┌─────────────────────────────────────────────────────────────────┐
│  Menu Bar (CMFCMenuBar)                                         │
│  File | Database | Control | Tools | View | Help                │
├─────────────────────────────────────────────────────────────────┤
│  Toolbar (CMFCToolBar) - BACnet operations                      │
│  [Scan] [Connect] [Disconnect] [Refresh] ...                    │
├──────────────────┬──────────────────────────────────────────────┤
│                  │                                              │
│  WorkspaceBar    │  Central View Area                           │
│  (Left Panel)    │  (Dynamically switched based on selection)   │
│                  │                                              │
│  ┌────────────┐  │  ┌────────────────────────────────────────┐ │
│  │ Building   │  │  │                                        │ │
│  │ Tree       │  │  │  Active View (1 of 37 possible views)  │ │
│  │            │  │  │                                        │ │
│  │ ├─Building │  │  │  - T3000View (Tstat)                   │ │
│  │ │ ├─Floor  │  │  │  - NetworkControllView                 │ │
│  │ │ │ ├─Room │  │  │  - GraphicView                         │ │
│  │ │ │ │ └Dev │  │  │  - TrendLogView                        │ │
│  │ │ │ │      │  │  │  - BACnet Views                        │ │
│  │ │ │ │      │  │  │  - I/O Module Views                    │ │
│  │ └─Subnet   │  │  │  - Sensor Views                        │ │
│  │   └─Device │  │  │  ...etc                                │ │
│  └────────────┘  │  └────────────────────────────────────────┘ │
│                  │                                              │
│  300px width     │  Flexible width                              │
├──────────────────┴──────────────────────────────────────────────┤
│  Status Bar (CMFCStatusBar) - 4 panes                           │
│  [RX/TX Info: 300px] [Building: 300px] [Protocol] [Results]     │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Layout Components Breakdown

| Component | MFC Class | Width/Height | Purpose |
|-----------|-----------|--------------|---------|
| **Menu Bar** | `CMFCMenuBar` | Full width, ~25px | File, Database, Control, Tools, View, Help menus |
| **Toolbar** | `CMFCToolBar` (m_testtoolbar) | Full width, ~32px | Quick access buttons for common operations |
| **Left Panel** | `CWorkspaceBar` | 300px fixed | Building/device tree navigation |
| **Central View** | Various `CView` subclasses | Flexible | Main working area - 37 different view types |
| **Status Bar** | `CMFCStatusBar` | Full width, ~25px | 4 panes showing connection status and info |

---

## 2. Menu Structure

### 2.1 Main Menu Bar

From `MainFrm.cpp` analysis:

```cpp
// Main Menu Structure
File
  ├─ New Project
  ├─ Open
  ├─ Save / Save Config
  ├─ Load Config File
  ├─ Import Data from Database
  ├─ Export Registers List
  ├─ Batch Flash Hex
  ├─ ISP Tool
  └─ Exit

Database
  ├─ Building Config Database
  ├─ All Nodes Database
  ├─ User Account
  ├─ IO Name Config
  ├─ Modbus Poll
  ├─ BACnet Tool
  ├─ Building Management
  └─ Log Detail

Control (BACnet Operations)
  ├─ Main
  ├─ Inputs
  ├─ Outputs
  ├─ Variables
  ├─ Programs
  ├─ Weekly Routines
  ├─ Annual Routines
  ├─ Controllers
  ├─ Screens
  ├─ Monitors
  ├─ Alarm Log
  ├─ Remote Point
  ├─ Array
  ├─ Custom Units
  └─ Refresh

Tools
  ├─ Scan Device
  ├─ Connect / Disconnect
  ├─ Psychrometry Chart
  ├─ PH Chart
  ├─ Modbus to BACnet Router
  ├─ BACnet Tool
  ├─ WebView
  ├─ Options
  ├─ Register Viewer
  └─ Login My Account

View
  ├─ Refresh
  ├─ Workspace (left panel toggle)
  ├─ Data Traffic
  └─ Language (English, Chinese, etc.)

Help
  ├─ Help Documentation
  ├─ Check Update
  ├─ Feedback to Temco
  └─ About
```

### 2.2 Toolbar Buttons

From `resource.h` (IDR_TOOLBAR_BACNET):

Primary toolbar includes quick access to:
- Scan Device
- Connect to Device
- Disconnect
- Refresh Tree
- Common BACnet operations (Inputs, Outputs, Variables, etc.)

---

## 3. Left Panel - WorkspaceBar (Building Tree)

### 3.1 Tree Structure

The left panel (`CWorkspaceBar`) contains a hierarchical tree (`CImageTreeCtrl`) with the following structure:

```
Root
├─ Building 1
│  ├─ Floor 1
│  │  ├─ Room 1
│  │  │  └─ Device (Tstat, BACnet, etc.)
│  │  └─ Room 2
│  ├─ Floor 2
│  └─ COM Port / IP Subnet
│     ├─ Serial Device 1
│     ├─ Serial Device 2
│     └─ IP Device 1
├─ Building 2
└─ Building 3
```

### 3.2 Tree Node Data Structure

From `MainFrm.h`:

```cpp
typedef struct _tree_product {
    Building_info  BuildingInfo;
    HTREEITEM product_item;         // Tree node handle
    unsigned int serial_number;     // Device serial number
    int product_class_id;           // Device type (Tstat, BACnet, etc.)
    int baudrate;
    int product_id;
    float software_version;
    float hardware_version;
    int protocol;                   // BACnet, Modbus, etc.
    unsigned int ncomport;
    bool status;                    // Online/offline
    CString NetworkCard_Address;
    CString NameShowOnTree;
    unsigned int object_instance;   // BACnet object instance
    // ... more fields
} tree_product;
```

### 3.3 Tree Selection Behavior

When user clicks a tree node:
1. `OnHTreeItemSeletedChanged()` is called
2. Determines device type (`product_class_id`)
3. Calls `SwitchToPruductType(viewIndex)` to switch central view
4. Updates status bar with device info
5. Connects to device if not already connected

---

## 4. Central View Area - Dynamic View Switching

### 4.1 View Management System

T3000 uses **37 different view types** (defined as constants in `MainFrm.h`):

```cpp
const int DLG_T3000_VIEW = 0;              // Main Tstat control
const int DLG_NETWORKCONTROL_VIEW = 1;     // Network topology
const int DLG_GRAPGIC_VIEW = 2;            // Graphics editor
const int DLG_TRENDLOG_VIEW = 3;           // Trend log charts
const int DLG_DIALOGCM5_VIEW = 4;          // CM5 panel
const int DLG_DIALOGT3_VIEW = 5;           // T3 series view
const int DLG_DIALOGMINIPANEL_VIEW = 6;    // Mini panel
const int DLG_AIRQUALITY_VIEW = 7;         // Air quality sensor
const int DLG_LIGHTINGCONTROLLER_VIEW = 8; // Lighting controller
const int DLG_HUMCHAMBER = 9;              // Humidity chamber
const int DLG_CO2_VIEW = 10;               // CO2 sensor
const int DLG_CO2_NET_VIEW = 11;           // CO2 network
const int DLG_BACNET_VIEW = 12;            // BACnet device view
const int DLG_DIALOGT38I13O_VIEW = 13;     // T3-8I/13O I/O module
const int DLG_DIALOGT332AI_VIEW = 14;      // T3-32AI module
const int DLG_DIALOGT38AI8AO = 15;         // T3-8AI/8AO module
const int DLG_DIALOGT36CT = 16;            // T3-6CT module
const int DLG_DIALOGT3PT10 = 17;           // T3-PT10 RTD module
const int DLG_DIALOG_PRESSURE_SENSOR = 18; // Pressure sensor
const int DLG_DIALOG_DEFAULT_BUILDING = 19;// Default building view
const int DLG_DIALOG_TEMP_HUMSENSOR = 20;  // Temp/Humidity sensor
const int DLG_DIALOG_DEFAULT_T3000_VIEW = 21; // Default Tstat
const int DLG_DIALOG_T3_INPUTS_VIEW = 22;  // T3 inputs
const int DLG_DIALOG_T3_OUTPUTS_VIEW = 23; // T3 outputs
const int DLG_DIALOG_CUSTOM_VIEW = 24;     // Custom register view
const int DLG_DIALOG_TSTAT_INPUT_VIEW = 25;// Tstat inputs
const int DLG_DIALOG_TSTAT_OUTPUT_VIEW = 26; // Tstat outputs
const int DLG_DIALOG_BOATMONITOR = 27;     // Boat monitor
const int DLG_DIALOG_BTUMETER = 28;        // BTU meter
const int DLG_DIALOG_POWERMETER = 29;      // Power meter
const int DLG_DIALOG_CO2_NODE = 30;        // CO2 node
const int DLG_DIALOG_ZIGBEE_REPEATER = 31; // Zigbee repeater
const int DLG_DIALOG_TSTAT_AQ = 32;        // Tstat Air Quality
const int DLG_DIALOG_THIRD_PARTY_BAC = 33; // 3rd party BACnet
const int DLG_DIALOG_BUILDING_MANAGEMENT = 34; // Building management
const int DLG_DIALOG_AIRFLOW = 35;         // Airflow sensor
const int DLG_DIALOG_TRANSDUCER = 36;      // Transducer
const int NUMVIEWS = 37;
```

### 4.2 View Creation and Switching

From `MainFrm.cpp` - `InitViews()` and `SwitchToPruductType()`:

**Initialization (App Startup)**:
```cpp
void CMainFrame::InitViews() {
    // Create array of view pointers
    m_pViews[DLG_T3000_VIEW] = new CT3000View();
    m_pViews[DLG_NETWORKCONTROL_VIEW] = new CNetworkControllView();
    m_pViews[DLG_GRAPGIC_VIEW] = new CGraphicView();
    m_pViews[DLG_TRENDLOG_VIEW] = new CTrendLogView();
    m_pViews[DLG_BACNET_VIEW] = new CDialogCM5_BacNet();
    // ... create all 37 views

    // Create windows for each view (hidden initially)
    for (int nView = 0; nView < NUMVIEWS; nView++) {
        if (nView < DLG_DIALOG_ZIGBEE_REPEATER) {
            m_pViews[nView]->Create(...);
            m_pViews[nView]->OnInitialUpdate();
        }
    }
}
```

**Dynamic View Switching**:
```cpp
void CMainFrame::SwitchToPruductType(int nIndex) {
    // Hide current view
    CView* pActiveView = GetActiveView();
    pActiveView->ShowWindow(SW_HIDE);

    // Show new view
    CView* pNewView = m_pViews[nIndex];
    pNewView->ShowWindow(SW_SHOW);
    pNewView->OnActivateView(TRUE, pNewView, pActiveView);

    // Update frame
    SetActiveView(pNewView);
    RecalcLayout();
}
```

### 4.3 View Categories

| Category | View Count | Examples |
|----------|-----------|----------|
| **Tstat/Thermostat** | 5 | T3000View, TStatInputView, TStatOutputView |
| **BACnet Devices** | 1 | DialogCM5_BacNet (main BACnet view) |
| **T3 I/O Modules** | 6 | T38I13O, T332AI, T38AI8AO, T36CT, T3RTD |
| **Sensors** | 8 | AirQuality, CO2, Pressure, Temp/Hum, Airflow |
| **Utilities** | 4 | NetworkControllView, GraphicView, TrendLogView |
| **Specialized** | 13 | Building Management, 3rd Party, Custom views |

---

## 5. Status Bar

### 5.1 Status Bar Panes

From `MainFrm.cpp` - `OnCreate()`:

```cpp
// 4 panes in the status bar
m_wndStatusBar.SetPaneInfo(0, ID_RW_INFO, SBPS_NOBORDERS, 300);
    // Pane 0: Read/Write count (RX/TX statistics)
m_wndStatusBar.SetPaneInfo(1, ID_BUILDING_INFO, SBPS_NOBORDERS, 300);
    // Pane 1: Building/Device info
m_wndStatusBar.SetPaneInfo(2, ID_PROTOCOL_INFO, SBPS_STRETCH | SBPS_NOBORDERS, 0);
    // Pane 2: Protocol info (stretch to fill)
m_wndStatusBar.SetPaneInfo(3, IDS_SHOW_RESULTS, SBPS_NOBORDERS, 1000);
    // Pane 3: Operation results/messages
```

### 5.2 Status Bar Usage

| Pane | Width | Purpose | Example Content |
|------|-------|---------|-----------------|
| 0 | 300px | RX/TX Stats | "RX: 1234 TX: 5678" |
| 1 | 300px | Connection Info | "Building: Main / Device: Tstat-101" |
| 2 | Stretch | Protocol | "Protocol: BACnet IP / COM5 @ 19200" |
| 3 | 1000px | Messages | "Device connected successfully" |

---

## 6. Modal Dialogs (229 Total)

### 6.1 Dialog Categories

T3000 has **229 modal dialogs** for various configuration, settings, and utility tasks. These are organized by subsystem:

| Subsystem | Dialog Count | Purpose |
|-----------|-------------|---------|
| **BACnet Protocol** | 52 | Input/Output/Variable grids, Programs, Schedules, Settings |
| **Tstat Configuration** | 12 | Tstat settings, schedules, calibration |
| **I/O Modules** | 8 | Configuration for various I/O modules |
| **Network** | 18 | Scan, discovery, connection management |
| **Scheduling** | 12 | Weekly/Annual schedules |
| **Graphics** | 8 | Graphics editor, screen management |
| **Sensors** | 15 | Sensor configuration and calibration |
| **Firmware/Tools** | 14 | Firmware update, ISP tool, utilities |
| **Building Management** | 11 | Building hierarchy, multi-building |
| **Security/Users** | 6 | Login, user management, permissions |
| **Programming** | 6 | Program editor/IDE, debugging |
| **Configuration** | 25 | Various settings panels |
| **Debugging/Utility** | 22 | Log viewer, register viewer, tools |
| **Specialized** | 20 | Custom/specialized features |

### 6.2 Common Dialog Patterns

**Pattern 1: Data Grid Dialogs** (e.g., BacnetInput.cpp)
- 64-128 row editable grid
- Inline combo boxes for ranges
- Auto/Manual toggle buttons
- Apply/Refresh buttons

**Pattern 2: Tabbed Settings** (e.g., BacnetSetting.cpp)
- Multiple tabs for categories
- Form fields in each tab
- Save/Apply/Cancel buttons

**Pattern 3: Schedule Editors** (e.g., BacnetWeeklyRoutine.cpp)
- Calendar/time picker
- Grid for time slots
- Copy/paste functionality

**Pattern 4: Tree + Detail** (e.g., Building Management)
- Left tree for hierarchy
- Right panel for detail editing

---

## 7. Navigation Flow

### 7.1 Primary Navigation Pattern

```
User Action                  System Response
-----------                  ---------------
1. Click tree node      -->  Identify device type
                             ↓
2. Load device data     -->  Read from Modbus/BACnet
                             ↓
3. Switch view          -->  SwitchToPruductType(viewIndex)
                             ↓
4. Display data         -->  View shows device-specific UI
                             ↓
5. User edits data      -->  UI updates local cache
                             ↓
6. Click Save/Apply     -->  Write to device via Modbus/BACnet
                             ↓
7. Refresh display      -->  Read back and verify
```

### 7.2 Secondary Navigation (Menu/Toolbar)

```
Menu Action                  System Response
-----------                  ---------------
Control → Inputs        -->  Open BacnetInput modal dialog
Control → Programs      -->  Open BacnetProgram modal dialog
Tools → Scan Device     -->  Open ScanDevice modal dialog
Database → BACnet Tool  -->  Open BACnet protocol analyzer
```

---

## 8. Data Flow Architecture

### 8.1 Communication Layers

```
┌─────────────────────────────────────────────────────────┐
│  UI Layer (Views & Dialogs)                             │
│  - CT3000View, CBacnetInput, etc.                       │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────────────────┐
│  Business Logic Layer                                   │
│  - Device connection management                         │
│  - Data caching (SQLite)                                │
│  - Protocol abstraction                                 │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────────────────┐
│  Protocol Layer                                         │
│  - Modbus RTU/TCP (modbus_read_write.cpp)              │
│  - BACnet IP (BACnet stack)                             │
│  - Custom serial protocols                              │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────────────────┐
│  Hardware Layer                                         │
│  - Serial COM ports (RS-485)                            │
│  - Ethernet/WiFi (TCP/IP)                               │
│  - USB devices                                          │
└─────────────────────────────────────────────────────────┘
```

### 8.2 Data Storage

- **SQLite Database** (`Database/` folder): Buildings, devices, historical data
- **Cache Files** (`.prog`, `.prg` files): Device configuration cache
- **INI Files**: Application settings and preferences

---

## 9. Key Technical Characteristics

### 9.1 MFC Framework Features Used

| Feature | Usage in T3000 |
|---------|---------------|
| **Document/View** | Single document, multiple view types |
| **Docking Panes** | Left workspace bar is dockable |
| **Command Routing** | Menu/toolbar commands route to active view |
| **Dynamic Creation** | Views created on-demand or at startup |
| **Tree Control** | Custom `CImageTreeCtrl` for building tree |
| **Grid Controls** | Custom grid classes for data tables |

### 9.2 Threading Model

- **Main UI Thread**: All UI operations
- **Worker Threads**:
  - `CRefreshTreeThread`: Periodic tree refresh
  - `Scan threads`: Device scanning operations
  - `Communication threads`: Modbus/BACnet read/write
  - `Ping threads`: Network connectivity checks

---

## 10. Migration Strategy to T3BASWeb (Ant Design Vue)

### 10.1 Layout Mapping: MFC → Ant Design Vue

| MFC Component | Ant Design Vue Component | Notes |
|---------------|-------------------------|-------|
| `CMFCMenuBar` | `<a-menu mode="horizontal">` | Top menu bar |
| `CMFCToolBar` | `<a-space>` with `<a-button>` | Toolbar buttons |
| `CWorkspaceBar` | `<a-layout-sider>` | Left panel |
| `CImageTreeCtrl` | `<a-tree>` | Building/device tree |
| Central View Area | `<a-layout-content>` with router-view | Dynamic view switching |
| `CMFCStatusBar` | `<a-layout-footer>` or custom footer | Status bar |
| Modal Dialogs | `<a-modal>` or `<a-drawer>` | Configuration dialogs |

### 10.2 Proposed T3BASWeb Layout Structure

```vue
<template>
  <a-layout class="t3000-layout">
    <!-- Header: Menu + Toolbar -->
    <a-layout-header>
      <a-menu mode="horizontal" :items="menuItems" />
      <a-space class="toolbar">
        <a-button @click="scanDevice">Scan</a-button>
        <a-button @click="connect">Connect</a-button>
        <a-button @click="disconnect">Disconnect</a-button>
        <a-button @click="refresh">Refresh</a-button>
      </a-space>
    </a-layout-header>

    <a-layout>
      <!-- Left Sider: Building Tree -->
      <a-layout-sider width="300" theme="light">
        <a-tree
          :tree-data="buildingTree"
          :selected-keys="selectedKeys"
          @select="onNodeSelect"
        />
      </a-layout-sider>

      <!-- Central Content: Dynamic View -->
      <a-layout-content>
        <router-view />
        <!-- or component :is="currentView" -->
      </a-layout-content>
    </a-layout>

    <!-- Footer: Status Bar -->
    <a-layout-footer>
      <a-row>
        <a-col :span="6">RX: {{ rxCount }} TX: {{ txCount }}</a-col>
        <a-col :span="6">{{ connectionInfo }}</a-col>
        <a-col :span="6">{{ protocolInfo }}</a-col>
        <a-col :span="6">{{ statusMessage }}</a-col>
      </a-row>
    </a-layout-footer>
  </a-layout>
</template>
```

### 10.3 View Routing Strategy

Instead of creating 37 views upfront, use Vue Router for lazy loading:

```typescript
const routes = [
  {
    path: '/device/:deviceId',
    component: () => import('@/layouts/DeviceLayout.vue'),
    children: [
      {
        path: 'tstat',
        component: () => import('@/views/devices/TstatView.vue')
      },
      {
        path: 'bacnet',
        component: () => import('@/views/devices/BacnetView.vue')
      },
      {
        path: 'io-module/:moduleType',
        component: () => import('@/views/devices/IOModuleView.vue')
      },
      // ... more routes
    ]
  }
]
```

---

## 11. Priority Recommendations for T3BASWeb

### Phase 1: Core Layout (Week 1-2)
1. ✅ Implement main Ant Design layout shell
2. ✅ Build building/device tree component
3. ✅ Set up routing for view switching
4. ✅ Create status bar component

### Phase 2: Essential Views (Week 3-8)
1. Tstat View (most common device)
2. BACnet Input/Output/Variable grids
3. Trend Log visualization
4. Network scan dialog

### Phase 3: Configuration Dialogs (Week 9-14)
1. BACnet Settings (tabbed)
2. Schedule editors
3. User management

---

## 12. Technical Notes for Developers

### 12.1 Key Differences: MFC vs Vue/Ant Design

| Aspect | MFC (C++) | Vue + Ant Design |
|--------|-----------|------------------|
| **View Creation** | Upfront creation, show/hide | Lazy loading via router |
| **Data Binding** | Manual update via SetWindowText() | Reactive two-way binding |
| **Grid Controls** | Custom CListCtrl/CGridCtrl | `<a-table>` with editable cells |
| **Tree Control** | CTreeCtrl with custom painting | `<a-tree>` with slots |
| **Modal Dialogs** | DoModal() blocking calls | Non-blocking `<a-modal>` |
| **Threading** | Win32 threads, message pumps | Promises, async/await |

### 12.2 Data Synchronization

In MFC, views manually read/write via Modbus. In T3BASWeb:

```typescript
// Reactive store (Pinia)
const deviceStore = useDeviceStore()

// Auto-refresh from API
watch(() => deviceStore.selectedDevice, async (device) => {
  await deviceStore.fetchDeviceData(device.id)
})

// Two-way binding updates store
<a-input v-model="deviceStore.currentData.temperature" />
```

---

## Conclusion

The T3000 C++ application follows a classic desktop application architecture with:
- Menu-driven navigation
- Tree-based device selection
- Dynamic view switching based on device type
- Modal dialogs for configuration

For T3BASWeb migration:
- Use **Ant Design Layout** to replicate the shell
- Use **Vue Router** for dynamic view switching
- Use **Pinia stores** for reactive data management
- Use **WebSocket** for real-time device updates
- Keep the same visual layout and navigation patterns for user familiarity

**Next Steps**: See `T3000-Ant-Design-Migration-Plan.md` for detailed component mapping and implementation guide.

---

**Document Version**: 1.0
**Last Updated**: November 4, 2025
**Author**: Development Team
