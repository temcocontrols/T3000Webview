# T3000 Feature Inventory and Analysis

**Date**: 2025-11-04
**Purpose**: Complete catalog of T3000 C++ application features for migration planning
**Status**: In Progress

---

## Overview

This document provides a comprehensive inventory of all features, dialogs, and views in the T3000 C++ application, organized by subsystem. Each feature is analyzed for migration complexity and UI component mapping.

## Summary Statistics

- **Total Dialog Resources**: 229 (from resource.h IDD_ definitions)
- **Total Form Views**: 37 (from MainFrm.h DLG_ constants)
- **Major Subsystems**: 11 identified
- **C++ Source Files**: 300+
- **BACnet Features**: 40+ dialogs
- **Tstat Features**: 10+ dialogs
- **I/O Modules**: 8+ types
- **Sensors**: 6+ types

---

## Main Application Structure

### Core Framework
| Component | File | Purpose |
|-----------|------|---------|
| Main Frame | `MainFrm.cpp/.h` | Application shell, menu, toolbar, status bar |
| Default View | `T3000View.cpp/.h` | Main device control panel (Tstat view) |
| Document | `T3000Doc.cpp/.h` | Document model (MFC architecture) |
| Application | `T3000.cpp/.h` | App entry point, database initialization |
| Workspace | `WorkspaceBar.cpp/.h` | Left panel with device tree |
| Network View | `NetworkControllView.cpp/.h` | Network topology view |
| Graphic View | `GraphicView.cpp/.h` | Graphics editor canvas |
| Trend Log View | `TrendLogView.cpp/.h` | Trend/monitor charts |

### Form View Constants (from MainFrm.h)
```cpp
DLG_T3000_VIEW              = 0  // Main Tstat control
DLG_NETWORKCONTROL_VIEW     = 1  // Network topology
DLG_GRAPGIC_VIEW            = 2  // Graphics editor
DLG_TRENDLOG_VIEW           = 3  // Trend log charts
DLG_DIALOGCM5_VIEW          = 4  // CM5 panel
DLG_DIALOGT3_VIEW           = 5  // T3 series view
DLG_DIALOGMINIPANEL_VIEW    = 6  // Mini panel
DLG_AIRQUALITY_VIEW         = 7  // Air quality sensor
DLG_LIGHTINGCONTROLLER_VIEW = 8  // Lighting controller
DLG_HUMCHAMBER              = 9  // Humidity chamber
DLG_CO2_VIEW                = 10 // CO2 sensor
DLG_CO2_NET_VIEW            = 11 // CO2 network
DLG_BACNET_VIEW             = 12 // BACnet device view
... (up to 37 total)
```

---

## Feature Inventory by Subsystem

### 1. BACnet Protocol & Devices (Priority: HIGH)

#### 1.1 BACnet Data Points
| Dialog ID | Dialog Name | Caption | Purpose | Complexity |
|-----------|-------------|---------|---------|------------|
| `IDD_DIALOG_BACNET_INPUT` | `BacnetInput.cpp` | "Input" | Configure/monitor input points | HIGH - Grid with 64 items |
| `IDD_DIALOG_BACNET_OUTPUT` | `BacnetOutput.cpp` | "Output" | Configure/monitor output points | HIGH - Grid with 64 items |
| `IDD_DIALOG_BACNET_VARIABLE` | `BacnetVariable.cpp` | "Variable" | Configure/monitor variables | HIGH - Grid with 128 items |
| `IDD_DIALOG_BACNET_MONITOR` | `BacnetMonitor.cpp` | "Monitor" | Real-time data monitoring | HIGH - 12 monitors, charting |

**UI Components Needed**:
- Editable data grid (QTable)
- Real-time value updates
- Range selector dialogs
- Auto/Manual mode toggles
- Value editing with validation

**Data Model**:
- Modbus registers 10000-15000
- SQLite caching
- Real-time updates via polling

---

#### 1.2 BACnet Programming
| Dialog ID | Dialog Name | Caption | Purpose | Complexity |
|-----------|-------------|---------|---------|------------|
| `IDD_DIALOG_BACNET_PROGRAM` | `BacnetProgram.cpp` | "Program" | Program list management | MEDIUM - 16 programs |
| `IDD_DIALOG_BACNET_PROGRAM_EDIT` | `BacnetProgramEdit.cpp` | "Bacnet Program IDE" | Code editor with syntax highlighting | VERY HIGH - Full IDE |
| `IDD_DIALOG_BACNET_PROGRAM_DEBUG` | `BacnetProgramDebug.cpp` | Debug window | Program debugging | HIGH |
| `IDD_DIALOG_BACNET_PROGRAM_SETTING` | `BacnetProgramSetting.cpp` | "Program Setting" | Program configuration | LOW |

**UI Components Needed**:
- Code editor with syntax highlighting (Monaco Editor or CodeMirror)
- Autocomplete for variables/functions
- Debugging panel
- Line numbers, breakpoints

**Migration Challenge**: **VERY HIGH** - Full IDE functionality

---

#### 1.3 BACnet Scheduling
| Dialog ID | Dialog Name | Caption | Purpose | Complexity |
|-----------|-------------|---------|---------|------------|
| `IDD_DIALOG_BACNET_WEEKLY_ROUTINES` | `BacnetWeeklyRoutine.cpp` | Weekly schedule | 8 weekly schedules | MEDIUM |
| `IDD_DIALOG_BACNET_ANNUAL_ROUTINES` | `BacnetAnnualRoutine.cpp` | Annual schedule | 4 annual schedules | MEDIUM |
| `IDD_DIALOG_BACNET_SCHEDULE_TIME` | `BacnetScheduleTime.cpp` | "Schedule Time" | Time slot editing | MEDIUM |

**UI Components Needed**:
- Calendar picker (Quasar QDate)
- Time slot editor
- Schedule grid

---

#### 1.4 BACnet Controllers & Settings
| Dialog ID | Dialog Name | Caption | Purpose | Complexity |
|-----------|-------------|---------|---------|------------|
| `IDD_DIALOG_BACNET_CONTROLLER` | `BacnetController.cpp` | Controllers | PID controller config | MEDIUM |
| `IDD_DIALOG_BACNET_SETTING` | `BacnetSetting.cpp` | Settings | Device settings (tabbed) | HIGH - Multiple tabs |
| `IDD_DIALOG_BACNET_SETTING_BASIC` | `BacnetSettingBasicInfo.cpp` | Basic info | Device name, ID, etc. | LOW |
| `IDD_DIALOG_BACNET_SETTING_TCPIP` | `BacnetSettingTcpip.cpp` | Network config | IP, subnet, gateway | LOW |
| `IDD_DIALOG_BACNET_SETTING_TIME` | `BacnetSettingTime.cpp` | Time sync | Device time settings | LOW |

**UI Components Needed**:
- Tabbed settings panel (QTabs)
- IP address input
- Date/time picker

---

#### 1.5 BACnet Graphics & Screens
| Dialog ID | Dialog Name | Caption | Purpose | Complexity |
|-----------|-------------|---------|---------|------------|
| `IDD_DIALOG_BACNET_GRAPHIC` | `BacnetGraphic.cpp` | "Graphic" | Graphics editor (drawing) | VERY HIGH - Canvas editor |
| `IDD_DIALOG_BACNET_SCREENS` | `BacnetScreen.cpp` | Screens | Screen list management | MEDIUM |
| `IDD_DIALOG_BACNET_SCREENS_EDIT` | `BacnetScreenEdit.cpp` | Screen editor | Edit screen layouts | HIGH |

**UI Components Needed**:
- Canvas drawing (HTML5 Canvas or SVG)
- Drag-and-drop objects
- Property panels
- Image upload/management

**Migration Challenge**: **VERY HIGH** - Full graphics editor

---

#### 1.6 BACnet Tools & Utilities
| Dialog ID | Dialog Name | Caption | Purpose | Complexity |
|-----------|-------------|---------|---------|------------|
| `IDD_DIALOG_BACNET_TOOL` | `BacnetTool.cpp` | "MY_BACNET" | BACnet protocol tool | MEDIUM |
| `IDD_DIALOG_BACNET_RANGES` | `BacnetRange.cpp` | "Select Range Number" | Range table editor | HIGH - Complex grid |
| `IDD_DIALOG_BACNET_ALARM_WINDOW` | `BacnetAlarmWindow.cpp` | Alarm notification | Real-time alarm popup | MEDIUM |
| `IDD_DIALOG_BACNET_ALARMLOG` | `BacnetAlarmLog.cpp` | Alarm log | Historical alarms | MEDIUM |

---

### 2. Tstat (Thermostat) Devices (Priority: HIGH)

| Dialog ID | Dialog Name | Caption | Purpose | Complexity |
|-----------|-------------|---------|---------|------------|
| `IDD_DIALOG_T3` | `T3000View.cpp` | Main Tstat View | Primary control interface | HIGH - Main view |
| `IDD_TSTAT_SCHEDULE` | `TStatScheduleDlg.cpp` | "TStat Schedule" | Tstat scheduling | MEDIUM |
| `IDD_DIALOG_TSTAT_INPUT` | `TStatInputView.cpp` | Tstat inputs | Input configuration | MEDIUM |
| `IDD_DIALOG_TSTAT_OUTPUT` | `TStatOutputView.cpp` | Tstat outputs | Output configuration | MEDIUM |
| `IDD_DIALOG_TSTAT_RANGES` | Various Tstat dialogs | Range config | Sensor ranges | LOW |
| `IDD_DIALOG_TSTAT_AQ` | `TstatAQ.cpp` | Air quality | AQ sensor view | MEDIUM |

**UI Components Needed**:
- Temperature display/control
- Fan speed selector
- Mode selector (Heat/Cool/Auto)
- Schedule grid

---

### 3. Graphics & Visualization (Priority: MEDIUM)

| Dialog ID | Dialog Name | Caption | Purpose | Complexity |
|-----------|-------------|---------|---------|------------|
| `IDD_GRAPHICVIEW` | `GraphicView.cpp` | Graphics editor | Main graphics canvas | VERY HIGH |
| `IDD_DIALOG_GRAPHIC_MODE` | `GraphicMode.cpp` | "Graphic Controller" | Graphics controller | HIGH |
| `IDD_TRENDLOG_VIEW` | `TrendLogView.cpp` | Trend logs | Chart display | HIGH - Time series |

**Migration Note**: Already have basic charting in WebView (ECharts)

---

### 4. Device I/O Modules (Priority: MEDIUM)

| Dialog ID | Dialog Name | Caption | Purpose | Complexity |
|-----------|-------------|---------|---------|------------|
| `IDD_T38AI8AO` | `T38AI8AO.cpp` | T3-8AI/8AO | 8 analog I/O module | MEDIUM |
| `IDD_T38I13O` | `T38I13O.cpp` | T3-8I/13O | Digital I/O module | MEDIUM |
| `IDD_T332AI` | `T332AI.cpp` | T3-32AI | 32 analog input module | MEDIUM |
| `IDD_T36CT` | `T36CT.cpp` | T3-6CT | Current transformer module | MEDIUM |
| `IDD_T3RTD` | `T3RTDView.cpp` | T3-RTD | RTD temperature module | MEDIUM |

**Pattern**: Similar grid-based configuration for all I/O modules

---

### 5. Sensor Devices (Priority: LOW-MEDIUM)

| Dialog ID | Dialog Name | Caption | Purpose | Complexity |
|-----------|-------------|---------|---------|------------|
| `IDD_DIALOG_AIRQUALITY` | `AirQuality.cpp` | Air quality sensor | AQ monitoring | MEDIUM |
| `IDD_PRESSURE_SENSOR` | `PressureSensorForm.cpp` | Pressure sensor | Pressure monitoring | LOW |
| `IDD_DIALOG_HUM_TEMP_SENSOR` | `TempHumSensorForm.cpp` | Humidity/Temp sensor | H/T monitoring | LOW |
| `IDD_DIALOG_CO2_NODE` | `CO2_NodeView.cpp` | CO2 sensor | CO2 monitoring | MEDIUM |
| `IDD_DIALOG_BOATMONITOR_VIEW` | `BoatMonitorViewer.cpp` | Boat monitor | Marine monitoring | LOW |

---

### 6. Network & Communication (Priority: HIGH)

| Dialog ID | Dialog Name | Caption | Purpose | Complexity |
|-----------|-------------|---------|---------|------------|
| `IDD_NETWORKCONTROLLVIEW` | `NetworkControllView.cpp` | Network view | Network topology | HIGH |
| `IDD_DIALOG_DETECTONLINE` | Detect online dialog | "Detect Online" | Device discovery | MEDIUM |
| `IDD_DLG_SCANALL` | Scan dialog | "Scan Result" | Network scan results | MEDIUM |
| `IDD_SCANWAY` | Scan method | "Scan" | Scan configuration | LOW |
| `IDD_REMOTE_CONNECTION` | Remote connection | Remote server | Remote device connection | MEDIUM |

---

### 7. Building Management (Priority: MEDIUM)

| Dialog ID | Dialog Name | Caption | Purpose | Complexity |
|-----------|-------------|---------|---------|------------|
| `IDD_ADDBUILDING_DLG` | `AddBuilding.cpp` | Add building | Building creation | LOW |
| `IDD_DIALOG_BUILDING_CONFIG` | Building config | "Building Configration" | Building settings | MEDIUM |
| `IDD_DIALOG_BACNET_BUILDING_MANAGEMENT` | Building mgmt | Building management | Building hierarchy | HIGH |
| `IDD_DIALOG_BACNET_BUILDING_MAIN` | Building main | Building view | Building overview | MEDIUM |

---

### 8. System Settings & Utilities (Priority: LOW-MEDIUM)

| Dialog ID | Dialog Name | Caption | Purpose | Complexity |
|-----------|-------------|---------|---------|------------|
| `IDD_LOGINDLG` | `LoginDlg.cpp` | Login | User authentication | LOW |
| `IDD_CHANGE_PASSWORD` | Password change | Password management | LOW |
| `IDD_USERMANNAGE_DLG` | User management | User admin | MEDIUM |
| `IDD_DIALOG_OPTION` | Options | T3000 settings | LOW |
| `IDD_DIALOG_DOWNLOAD_FILE` | Firmware download | "Download Firmware" | Firmware update | HIGH |
| `IDD_DIALOG_MULTY_FLASH` | Multi-device flash | Batch firmware | HIGH |
| `IDD_DIALOG_TROUBLESHOOT` | Troubleshooting | Diagnostics | MEDIUM |
| `IDD_DIALOG_DEBUG_TRACE` | Debug log | "Log Window" | Debug/log viewer | MEDIUM |

---

## Migration Priority Matrix

### Phase 1: Core Infrastructure (MUST HAVE)
1. ✅ Building/Device Tree (`WorkspaceBar` → Vue QTree)
2. ✅ Trend Log/Monitor (`TrendLogView` → ECharts page)
3. Main Tstat View (`T3000View` → Vue page)
4. BACnet Input/Output/Variable grids
5. Network scan and device discovery

### Phase 2: Critical Features (HIGH PRIORITY)
1. BACnet Settings (tabbed configuration)
2. Scheduling (Weekly/Annual)
3. Program list management
4. Controller configuration
5. User authentication

### Phase 3: Advanced Features (MEDIUM PRIORITY)
1. Graphics editor (simplified version)
2. Screen editor
3. I/O module configuration
4. Building management
5. Firmware update tools

### Phase 4: Specialized Features (LOWER PRIORITY)
1. Program IDE (full code editor)
2. Advanced graphics editing
3. Third-party device support
4. Specialized sensor views
5. Advanced debugging tools

---

## UI Component Mapping Strategy

### Reusable Patterns Identified

#### Pattern 1: Data Grid with Inline Editing
**Used in**: Input, Output, Variable, Monitor, Controllers
**Vue Component**: `DataPointGrid.vue`
**Tech**: Quasar QTable with editable cells
**Features**:
- Row selection
- Inline editing
- Auto/Manual toggles
- Range selectors
- Real-time value updates

#### Pattern 2: Tabbed Settings Panel
**Used in**: BACnet Settings, Building Config, Device Settings
**Vue Component**: `TabbedSettings.vue`
**Tech**: Quasar QTabs + QTabPanels
**Features**:
- Multiple setting categories
- Form validation
- Save/Cancel actions

#### Pattern 3: Schedule Grid
**Used in**: Weekly/Annual schedules, Tstat schedules
**Vue Component**: `ScheduleGrid.vue`
**Tech**: Quasar QTable + QDate/QTime pickers
**Features**:
- Time slot management
- Calendar integration
- Copy/paste time slots

#### Pattern 4: Real-time Chart
**Used in**: Trend Log, Monitor, Sensor views
**Vue Component**: `TrendChart.vue` (already exists)
**Tech**: ECharts
**Features**:
- Time-series visualization
- Multiple series
- Zoom/pan

#### Pattern 5: Device List/Tree
**Used in**: Network view, Building management
**Vue Component**: `DeviceTree.vue` (partially exists)
**Tech**: Quasar QTree
**Features**:
- Hierarchical display
- Status indicators
- Context menus

---

## Technical Migration Notes

### Data Access Patterns
1. **Modbus Registers**: Direct device communication (keep in Rust)
2. **SQLite Cache**: Local data storage (use existing Rust DB layer)
3. **BACnet Protocol**: Complex protocol stack (adapter or port incrementally)
4. **Real-time Updates**: WebSocket push from Rust backend

### Complexity Assessment

**LOW Complexity** (1-2 days each):
- Login, password change
- Simple forms (Add Building, etc.)
- Display-only views

**MEDIUM Complexity** (3-7 days each):
- Data grids (Input/Output/Variable)
- Tabbed settings panels
- Schedule management
- Sensor views

**HIGH Complexity** (2-4 weeks each):
- Main Tstat control view
- Graphics editor
- Program IDE
- Network topology view

**VERY HIGH Complexity** (1-3 months):
- Full graphics editor with drawing
- Complete Program IDE
- Advanced BACnet protocol tools

---

## Next Steps

1. **Get Screenshots**: Need visual references of key dialogs
2. **User Workflow Analysis**: Document how features are actually used
3. **Prioritization Meeting**: Confirm Phase 1 scope with stakeholders
4. **Mockup Creation**: Design Vue equivalents for top 10 dialogs
5. **Proof of Concept**: Build 2-3 representative components

---

## Questions for Stakeholders

1. Which features are used most frequently by customers?
2. Which features are essential vs nice-to-have?
3. Can we simplify any complex features (e.g., graphics editor)?
4. Are there features that can be retired/deprecated?
5. Do we have analytics on feature usage?

---

**Status**: Initial inventory complete. See companion files:
- `T3000-Complete-Dialog-List.csv` - Full spreadsheet of all 229 dialogs
- `dialog-ids.txt` - Raw dialog ID definitions from resource.h

## Complete Feature Count by Subsystem

| Subsystem | Dialog Count | Criticality | Migration Complexity |
|-----------|-------------|-------------|---------------------|
| **BACnet Protocol** | 52 | CRITICAL | HIGH - Core protocol functionality |
| **Tstat/Thermostat** | 12 | HIGH | MEDIUM - Main user-facing feature |
| **I/O Modules** | 8 | MEDIUM | MEDIUM - Repetitive patterns |
| **Network/Communication** | 18 | CRITICAL | HIGH - Device discovery and management |
| **Scheduling** | 12 | HIGH | MEDIUM - Calendar-based interfaces |
| **Graphics/Visualization** | 8 | MEDIUM | VERY HIGH - Complex canvas editing |
| **Sensors** | 15 | MEDIUM | LOW-MEDIUM - Display-heavy |
| **Firmware/Tools** | 14 | MEDIUM | MEDIUM-HIGH - System utilities |
| **Building Management** | 11 | MEDIUM | MEDIUM |
| **Security/Users** | 6 | HIGH | LOW - Standard auth patterns |
| **Programming/IDE** | 6 | LOW | VERY HIGH - Full code editor |
| **Configuration** | 25 | MEDIUM | LOW-MEDIUM - Settings panels |
| **Debugging/Utility** | 22 | LOW | LOW-MEDIUM - Tools |
| **Specialized** | 20 | LOW | Variable |

**Total: 229 dialogs** across 14 subsystems

---

## Migration Effort Estimation

### By Complexity Level

| Complexity | Count | Avg Days/Dialog | Total Weeks | Examples |
|------------|-------|----------------|-------------|----------|
| **LOW** | 80 | 1-2 days | ~23 weeks | Login, simple forms, info dialogs |
| **MEDIUM** | 95 | 3-7 days | ~95 weeks | Data grids, settings panels, schedules |
| **HIGH** | 45 | 2-4 weeks | ~225 weeks | Input/Output/Variable grids, monitors |
| **VERY HIGH** | 9 | 1-3 months | ~36 weeks | Program IDE, Graphics editor |

**Total Estimated Effort**: ~379 developer-weeks (~7.3 years for one developer, or ~1.8 years for 4 developers working in parallel)

### Realistic Phased Approach

Given the scope, we recommend **NOT migrating all 229 dialogs**. Instead:

1. **Identify core 20% of features that deliver 80% of value**
2. **Modernize and simplify** complex features (e.g., web-based graphics instead of full desktop editor)
3. **Retire rarely-used features** (get usage analytics first)
4. **Keep legacy T3000.exe available** for advanced/specialized features during transition

---

## Recommended Migration Strategy

### Phase 0: Discovery & Validation (2-4 weeks)
- [ ] Get screenshots of top 30 most-used dialogs
- [ ] Run usage analytics if available
- [ ] Interview stakeholders and support team
- [ ] Identify must-have vs nice-to-have features
- [ ] Create mockups for top 10 dialogs

### Phase 1: Foundation (8-12 weeks) **← START HERE**
**Goal**: Replace most common daily-use features

Priority dialogs (already partially implemented):
1. ✅ Building/Device Tree - Workspace navigation
2. ✅ Trend Log View - Data visualization (ECharts)
3. **Login & User Management** - Authentication
4. **Network Scan & Device Discovery** - Device management
5. **BACnet Input/Output/Variable** - Data point grids (3 dialogs)
6. **Main Tstat View** - Thermostat control
7. **BACnet Settings** - Device configuration (5 tabbed sub-dialogs)

**Deliverable**: 12-15 core dialogs (5% of total), covering ~60% of user workflows

**Estimated effort**: 3 developers × 3 months = 9 developer-months

### Phase 2: Expand BACnet & Scheduling (12-16 weeks)
8. BACnet Monitor (12-point real-time)
9. BACnet Weekly/Annual Routines
10. BACnet Controllers
11. BACnet Alarm Log & Window
12. Tstat Schedule
13. Tstat Input/Output
14. Program List (not IDE, just list management)

**Deliverable**: Additional 10 dialogs, covering ~80% of workflows

**Estimated effort**: 2-3 developers × 4 months

### Phase 3: I/O Modules & Sensors (8-12 weeks)
15. T3-8AI/8AO, T3-32AI, T3-RTD (reusable grid component)
16. Air Quality sensors
17. Pressure/Temp/Humidity sensors
18. Register Viewer

**Deliverable**: 15+ dialogs using template components

### Phase 4: Advanced Features (12-24 weeks)
19. Simplified Graphics Editor (HTML5 Canvas, subset of features)
20. Screen Editor (simpler than full C++ version)
21. Building Management
22. Firmware Update Tools

**Deliverable**: Modernized versions of complex features

### Phase 5+: Optional/Specialized
- Program IDE (Monaco Editor integration)
- Control Basic Editor
- Third-party device integrations
- Advanced BACnet tools

**Decision Point**: May keep in legacy T3000.exe permanently

---

## Key Technical Decisions Needed

### 1. BACnet Protocol Layer
**Question**: How to handle BACnet stack?

**Options**:
- A) Port C++ BACnet code to Rust (huge effort)
- B) Use existing Rust BACnet library (limited feature set)
- C) Keep C++ BACnet, expose via FFI/API (hybrid approach)
- D) Use third-party BACnet service

**Recommendation**: Option C (hybrid) for Phase 1-2, evaluate porting later

### 2. Graphics Editor
**Question**: Full-featured editor or simplified version?

**Options**:
- A) Port full C++ graphics editor (6+ months)
- B) Build simplified web graphics tool (2-3 months)
- C) Use existing web graphics library (1 month integration)
- D) Keep legacy editor, add view-only mode in web

**Recommendation**: Option D for Phase 1-2, Option B for Phase 4

### 3. Program IDE
**Question**: Full IDE or simplified editor?

**Options**:
- A) Integrate Monaco Editor with full debugging (3-4 months)
- B) Simple code editor without debugging (1-2 months)
- C) Keep legacy IDE, add web-based program list management

**Recommendation**: Option C (program list only in web, IDE in legacy)

### 4. Data Synchronization
**Question**: How to keep web and potential legacy apps in sync?

**Recommendation**:
- Use Rust API as single source of truth
- SQLite database for local cache
- WebSocket for real-time updates
- Consider phasing out legacy entirely after Phase 2-3

---

## Reusable Component Library Strategy

Build once, use many times:

### Component 1: `DataPointGrid.vue`
**Use cases**: Input (3 dialogs), Output (3), Variable (3), Monitor (2)
**Features**: Inline editing, auto/manual toggle, range selectors
**Estimated build**: 2-3 weeks
**Reuse factor**: 11 dialogs

### Component 2: `TabbedSettings.vue`
**Use cases**: BACnet Settings (5 tabs), Building Config, Device Settings
**Features**: Tab navigation, form validation, save/cancel
**Estimated build**: 1 week
**Reuse factor**: 8+ dialogs

### Component 3: `ScheduleGrid.vue`
**Use cases**: Weekly routines (4), Annual routines (3), Tstat schedule
**Features**: Calendar picker, time slots, copy/paste
**Estimated build**: 2-3 weeks
**Reuse factor**: 8 dialogs

### Component 4: `IOModuleGrid.vue`
**Use cases**: All I/O modules (8 types)
**Features**: Template-driven grid, module-specific validation
**Estimated build**: 2 weeks
**Reuse factor**: 8 dialogs

### Component 5: `SensorView.vue`
**Use cases**: All sensor types (15)
**Features**: Real-time value display, charts, configuration
**Estimated build**: 1-2 weeks
**Reuse factor**: 15 dialogs

**Total component library**: 8-11 weeks to build, covers 50+ dialogs

---

## Next Action Items

### For Product Owner/Manager:
1. **Usage Analytics**: Get data on most-used features (if available)
2. **User Interviews**: Talk to 5-10 customers about their daily workflows
3. **Feature Prioritization**: Confirm Phase 1 scope is correct
4. **Budget Approval**: Allocate 3 developers for 6-9 months (Phase 1-2)

### For Development Team:
1. **Take Screenshots**: Capture all Phase 1 dialogs from running T3000.exe
2. **Create Mockups**: Design Vue equivalents in Figma/Sketch
3. **Prototype DataPointGrid**: Build reusable grid component first
4. **BACnet FFI Layer**: Design C++/Rust interface for protocol stack

### For Stakeholders:
1. **Review CSV**: Prioritize dialogs in `T3000-Complete-Dialog-List.csv`
2. **Approve Scope**: Confirm 40-50 dialogs (not all 229) is acceptable
3. **Legacy Plan**: Decide if keeping T3000.exe for 1-2 years is acceptable

---

**Status**: Analysis complete. Ready for Phase 0 (Discovery & Validation) kickoff.
