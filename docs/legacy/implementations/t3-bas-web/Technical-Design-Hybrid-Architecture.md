# Technical Design Document: Hybrid Vue + React Architecture
## T3000 Webview - Dual Framework Implementation

**Version**: 1.1
**Date**: November 5, 2025
**Status**: AWAITING FINAL APPROVAL
**Author**: Development Team
**Project**: T3000 Webview Hybrid Architecture

---

## User Decisions Confirmed

### Folder Naming (Final)
- **Vue folder**: `src/t3-vue/` (clearer than `vue-app`)
- **React folder**: `src/t3-react/` (clearer than `react-app`)
- **Shared folder**: `src/common/` (clearer than `shared`)

### Import Alias Strategy (Final)
- **Option B Selected**: Explicit aliases (`@t3-vue/`, `@t3-react/`, `@common/`)
- **Update ~262 Vue files**: Change `@/` → `@t3-vue/` (automated)
- **Router guarantee**: Paths stay identical, only import strings change

### Key Benefits of User's Choices
1. **Clear naming**: `t3-vue` and `t3-react` show framework ownership
2. **Explicit imports**: Code is self-documenting
3. **Better tooling**: IDE autocomplete works perfectly
4. **Future-proof**: Easy to add more apps later

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture](#2-system-architecture)
3. [Detailed Technical Design](#3-detailed-technical-design)
4. [Implementation Plan](#4-implementation-plan)
5. [Code Examples](#5-code-examples)
6. [Testing Strategy](#6-testing-strategy)
7. [Deployment Plan](#7-deployment-plan)
8. [Risk Assessment](#8-risk-assessment)
9. [Success Criteria](#9-success-criteria)
10. [Appendices](#10-appendices)

---

## 1. Executive Summary

### 1.1 Objective

Implement a **hybrid architecture** that allows Vue 3 (existing) and React 18 + Fluent UI (new) to coexist in the same T3000 Webview application.

### 1.2 Business Goals

- Preserve existing Vue/Quasar functionality (zero regression risk)
- Enable new T3BASWeb features using React + Fluent UI
- Provide gradual migration path (no "big bang" rewrite)
- Maintain developer productivity during transition
- Achieve Microsoft Fluent design for new features

### 1.3 Key Metrics

| Metric | Current | Target | Timeline |
|--------|---------|--------|----------|
| **Bundle Size (gzipped)** | 150 KB | 350 KB | Acceptable |
| **Initial Load Time** | 1.2s | 1.5s | Acceptable |
| **Route Transition** | Instant (SPA) | 1s (reload) | Acceptable |
| **Code Duplication** | 0% | 5% (shared code) | Minimal |
| **Development Velocity** | Baseline | +20% (parallel work) | Month 3+ |

### 1.4 Timeline & Budget

| Phase | Duration | Team Size | Cost |
|-------|----------|-----------|------|
| **Phase 0: Planning & Design** | 1 week | 2 devs | $8k |
| **Phase 1: Infrastructure Setup** | 2 weeks | 2 devs | $16k |
| **Phase 2: First React Page** | 2 weeks | 3 devs | $24k |
| **Phase 3: Production Release** | 1 week | 2 devs | $8k |
| **TOTAL (Initial Delivery)** | **6 weeks** | **2-3 devs** | **$56k** |

---

## 2. System Architecture

### 2.1 High-Level Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    T3000 Webview Application                  │
│                     (Single Page Load)                        │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────────────────────────────────────────────┐     │
│  │              Entry Point (main.ts)                  │     │
│  │        Route-Based App Loader/Dispatcher            │     │
│  └─────────────────┬──────────────────────────────────┘     │
│                    │                                          │
│         ┌──────────┴──────────┐                              │
│         ▼                     ▼                              │
│  ┌─────────────┐       ┌─────────────┐                      │
│  │  Vue App    │       │  React App  │                      │
│  │  (Legacy)   │       │  (T3BASWeb) │                      │
│  ├─────────────┤       ├─────────────┤                      │
│  │ Routes:     │       │ Routes:     │                      │
│  │ /           │       │ /t3000/*    │                      │
│  │ /v2/*       │       │             │                      │
│  │ /login      │       │             │                      │
│  ├─────────────┤       ├─────────────┤                      │
│  │ Framework:  │       │ Framework:  │                      │
│  │ • Vue 3     │       │ • React 18  │                      │
│  │ • Quasar    │       │ • Fluent UI │                      │
│  │ • Ant Design│       │             │                      │
│  └─────────────┘       └─────────────┘                      │
│         │                     │                              │
│         └──────────┬──────────┘                              │
│                    ▼                                          │
│  ┌────────────────────────────────────────────────────┐     │
│  │            Shared Infrastructure                    │     │
│  ├────────────────────────────────────────────────────┤     │
│  │ • API Client (Axios)                               │     │
│  │ • Authentication (JWT, localStorage)               │     │
│  │ • State Management (SharedState, EventBus)         │     │
│  │ • TypeScript Types                                 │     │
│  │ • Utility Functions                                │     │
│  │ • Constants & Configuration                        │     │
│  └────────────────────────────────────────────────────┘     │
│                    │                                          │
│                    ▼                                          │
│  ┌────────────────────────────────────────────────────┐     │
│  │              Backend API                            │     │
│  │  Rust (Actix-web) - Port 8080                      │     │
│  └────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────┘
```

### 2.2 Route Mapping

| Route Pattern | Framework | UI Library | Status |
|---------------|-----------|------------|--------|
| `/` | Vue | Quasar | Redirect to /v2/dashboard |
| `/login` | Vue | Quasar | Existing |
| `/v2/*` | Vue | Quasar + Ant Design | Existing (no changes) |
| `/v2/dashboard` | Vue | Quasar | Existing |
| `/v2/trendlog` | Vue | Quasar | Existing |
| `/v2/modbus` | Vue | Quasar | Existing |
| `/v2/apps` | Vue | Quasar | Existing |
| `/t3000/*` | React | Fluent UI | NEW |
| `/t3000/tstat` | React | Fluent UI | NEW |
| `/t3000/bacnet/input` | React | Fluent UI | NEW |
| `/t3000/bacnet/output` | React | Fluent UI | NEW |
| `/t3000/network` | React | Fluent UI | NEW |

### 2.3 Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      User Interaction                        │
└───────────────────────┬─────────────────────────────────────┘
                        │
        ┌───────────────┴──────────────┐
        ▼                              ▼
┌───────────────┐              ┌───────────────┐
│   Vue Component│              │ React Component│
└───────┬───────┘              └───────┬───────┘
        │                              │
        ▼                              ▼
┌───────────────┐              ┌───────────────┐
│  Vue Composable│              │  React Hook   │
│  (useDevice)  │              │  (useDevice)  │
└───────┬───────┘              └───────┬───────┘
        │                              │
        └───────────────┬──────────────┘
                        ▼
              ┌──────────────────┐
              │   Shared API      │
              │   Client (Axios)  │
              └─────────┬─────────┘
                        │
                        ▼
              ┌──────────────────┐
              │  Rust Backend     │
              │  (Port 8080)      │
              └─────────┬─────────┘
                        │
                        ▼
              ┌──────────────────┐
              │   SQLite DB       │
              └───────────────────┘
```

### 2.4 Build Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Vite Build Process                     │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  Source Code (src/)                                       │
│  ├── main.ts (entry point)                               │
│  ├── vue-app/         → @vitejs/plugin-vue               │
│  ├── react-app/       → @vitejs/plugin-react             │
│  └── shared/          → TypeScript compilation           │
│                                                           │
│  ↓ Build Process ↓                                        │
│                                                           │
│  Code Splitting:                                          │
│  ├── main.[hash].js           (Route dispatcher)         │
│  ├── vue-vendor.[hash].js     (Vue, Quasar, Ant Design) │
│  ├── react-vendor.[hash].js   (React, Fluent UI)        │
│  ├── shared.[hash].js         (API, Auth, Utils)        │
│  ├── vue-app.[hash].js        (Vue pages/components)    │
│  └── react-app.[hash].js      (React pages/components)  │
│                                                           │
│  Output (dist/)                                           │
│  ├── index.html                                           │
│  ├── assets/                                              │
│  │   ├── main.[hash].js        (~50 KB)                  │
│  │   ├── vue-vendor.[hash].js  (~500 KB → 150 KB gz)    │
│  │   ├── react-vendor.[hash].js (~600 KB → 170 KB gz)   │
│  │   ├── shared.[hash].js      (~100 KB → 30 KB gz)     │
│  │   └── [app-chunks].[hash].js                          │
│  └── ...                                                  │
└──────────────────────────────────────────────────────────┘

Loading Strategy (Lazy Loading):
1. User visits /v2/dashboard
   → Load: main.js + vue-vendor.js + shared.js + vue-app.js
   → Total: ~330 KB gzipped

2. User navigates to /t3000/tstat (page reload)
   → Load: main.js + react-vendor.js + shared.js + react-app.js
   → Total: ~370 KB gzipped

Only the required framework is loaded per session!
```

---

## 3. Detailed Technical Design

### 3.1 Project Structure (Final - With User's Naming)

```
T3000Webview5/
│
├── public/
│   ├── index.html                        # Single HTML entry point
│   └── assets/                           # Static assets (images, fonts)
│
├── src/
│   │
│   ├── main.ts                           # 🎯 CRITICAL: Route dispatcher
│   │
│   ├── t3-vue/                           # 🔵 Vue 3 Application (EXISTING - moved here)
│   │   ├── main.ts                       # Vue entry point
│   │   ├── App.vue                       # Vue root component
│   │   │
│   │   ├── router/
│   │   │   ├── index.ts                  # Vue Router instance
│   │   │   └── routes.ts                 # Vue routes (/v2/*)
│   │   │
│   │   ├── pages/
│   │   │   ├── V2/                       # Existing pages
│   │   │   │   ├── Dashboard.vue
│   │   │   │   ├── TrendLogDashboard.vue
│   │   │   │   ├── Schedules.vue
│   │   │   │   ├── ModbusRegister.vue
│   │   │   │   └── ...
│   │   │   ├── AppsLibrary/
│   │   │   ├── Dashboard/
│   │   │   ├── HvacDrawer/
│   │   │   ├── ModbusRegister/
│   │   │   ├── TrendLog/
│   │   │   └── LoginPage.vue
│   │   │
│   │   ├── components/                   # Vue components
│   │   │   ├── Basic/
│   │   │   ├── Database/
│   │   │   ├── Grid/
│   │   │   ├── Hvac/
│   │   │   ├── Navigation/
│   │   │   ├── NewUI/
│   │   │   └── ObjectTypes/
│   │   │
│   │   ├── layouts/                      # Vue layouts
│   │   │   ├── MainLayout.vue
│   │   │   ├── MainLayout2.vue
│   │   │   ├── AppsLibLayout.vue
│   │   │   ├── ModbusRegLayout.vue
│   │   │   └── TrendLogLayout.vue
│   │   │
│   │   ├── composables/                  # Vue composables
│   │   │   ├── useDeviceConnection.ts
│   │   │   └── useDataRefresh.ts
│   │   │
│   │   ├── lib/                          # Vue-specific utilities
│   │   │   ├── demo-data.js              # Demo/mock data
│   │   │   └── gridColumns.js            # Grid column configs
│   │   │
│   │   └── styles/                       # Vue-specific styles
│   │       └── quasar-overrides.scss
│   │
│   ├── t3-react/                         # 🟢 React 18 Application (NEW - T3000 Desktop Layout)
│   │   ├── main.tsx                      # React entry point
│   │   ├── App.tsx                       # React root component
│   │   │
│   │   ├── router/
│   │   │   ├── index.tsx                 # React Router instance
│   │   │   └── routes.ts                 # React routes (/t3000/*)
│   │   │
│   │   ├── pages/                        # ⭐ ALL T3000 WINDOWS (from C++ analysis)
│   │   │   │
│   │   │   ├── HomePage.tsx              # Home/Dashboard
│   │   │   │
│   │   │   ├── inputs/                   # WINDOW_INPUT (Alt-I)
│   │   │   │   ├── InputsPage.tsx        # Main inputs view
│   │   │   │   ├── InputsGrid.tsx        # Data grid component
│   │   │   │   └── InputEditDialog.tsx   # Edit dialog
│   │   │   │
│   │   │   ├── outputs/                  # WINDOW_OUTPUT (Alt-O)
│   │   │   │   ├── OutputsPage.tsx       # Main outputs view
│   │   │   │   ├── OutputsGrid.tsx       # Data grid component
│   │   │   │   └── OutputEditDialog.tsx  # Edit dialog
│   │   │   │
│   │   │   ├── variables/                # WINDOW_VARIABLE (Alt-V)
│   │   │   │   ├── VariablesPage.tsx     # Main variables view
│   │   │   │   ├── VariablesGrid.tsx     # Data grid component
│   │   │   │   └── VariableEditDialog.tsx
│   │   │   │
│   │   │   ├── programs/                 # WINDOW_PROGRAM (Alt-P)
│   │   │   │   ├── ProgramsPage.tsx      # Main programs view
│   │   │   │   ├── ProgramEditor.tsx     # Code editor component
│   │   │   │   ├── ProgramList.tsx       # Program list
│   │   │   │   └── ProgramDebugger.tsx   # Debugger panel
│   │   │   │
│   │   │   ├── controllers/              # WINDOW_CONTROLLER (Alt-L) - PID Loops
│   │   │   │   ├── ControllersPage.tsx   # Main controllers view
│   │   │   │   ├── PIDLoopGrid.tsx       # PID loops grid
│   │   │   │   └── PIDTuningDialog.tsx   # PID tuning dialog
│   │   │   │
│   │   │   ├── graphics/                 # WINDOW_SCREEN (Alt-G)
│   │   │   │   ├── GraphicsPage.tsx      # Main graphics view
│   │   │   │   ├── GraphicsEditor.tsx    # Canvas editor
│   │   │   │   ├── GraphicsToolbar.tsx   # Drawing tools
│   │   │   │   ├── GraphicsLibrary.tsx   # Symbol library
│   │   │   │   └── GraphicsPreview.tsx   # Preview panel
│   │   │   │
│   │   │   ├── schedules/                # WINDOW_WEEKLY (Alt-S)
│   │   │   │   ├── SchedulesPage.tsx     # Main schedules view
│   │   │   │   ├── WeeklyScheduleGrid.tsx
│   │   │   │   ├── ScheduleEditor.tsx    # Schedule editor dialog
│   │   │   │   └── ScheduleCalendar.tsx  # Calendar view
│   │   │   │
│   │   │   ├── holidays/                 # WINDOW_ANNUAL (Alt-H)
│   │   │   │   ├── HolidaysPage.tsx      # Main holidays view
│   │   │   │   ├── AnnualRoutineGrid.tsx
│   │   │   │   ├── HolidayEditor.tsx     # Holiday editor dialog
│   │   │   │   └── HolidayCalendar.tsx   # Calendar view
│   │   │   │
│   │   │   ├── trend-logs/               # WINDOW_MONITOR (Alt-T)
│   │   │   │   ├── TrendLogsPage.tsx     # Main trend logs view
│   │   │   │   ├── TrendChart.tsx        # Chart component (ECharts)
│   │   │   │   ├── TrendConfig.tsx       # Trend configuration
│   │   │   │   └── TrendExport.tsx       # Export dialog
│   │   │   │
│   │   │   ├── alarms/                   # WINDOW_ALARMLOG (Alt-A)
│   │   │   │   ├── AlarmsPage.tsx        # Main alarms view
│   │   │   │   ├── AlarmList.tsx         # Alarm list grid
│   │   │   │   ├── AlarmDetails.tsx      # Alarm details panel
│   │   │   │   └── AlarmFilters.tsx      # Filter controls
│   │   │   │
│   │   │   ├── network/                  # WINDOW_REMOTE_POINT (Alt-N)
│   │   │   │   ├── NetworkPage.tsx       # Main network/remote points view
│   │   │   │   ├── NetworkPointsGrid.tsx # Network points grid
│   │   │   │   ├── ModbusConfig.tsx      # Modbus configuration
│   │   │   │   ├── BacnetConfig.tsx      # BACnet configuration
│   │   │   │   └── NetworkScan.tsx       # Network scan dialog
│   │   │   │
│   │   │   ├── array/                    # WINDOW_ARRAY
│   │   │   │   ├── ArrayPage.tsx         # Main array view
│   │   │   │   ├── ArrayDataGrid.tsx     # Array data grid
│   │   │   │   └── ArrayEditor.tsx       # Array editor dialog
│   │   │   │
│   │   │   └── settings/                 # WINDOW_SETTING (Alt-E)
│   │   │       ├── SettingsPage.tsx      # Main settings view (tabbed)
│   │   │       ├── BasicSettings.tsx     # IDD_DIALOG_BACNET_SETTING_BASIC
│   │   │       ├── TcpIpSettings.tsx     # IDD_DIALOG_BACNET_SETTING_TCPIP
│   │   │       ├── TimeSettings.tsx      # IDD_DIALOG_BACNET_SETTING_TIME
│   │   │       ├── DynDnsSettings.tsx    # IDD_DIALOG_BACNET_SETTING_DYNDNS
│   │   │       ├── LcdSettings.tsx       # IDD_DIALOG_BACNET_SETTING_LCD_PARAMETER
│   │   │       ├── HealthSettings.tsx    # IDD_DIALOG_BACNET_SETTING_HEALTH
│   │   │       └── AdvancedSettings.tsx  # IDD_DIALOG_ADVANCED_SETTINGS
│   │   │
│   │   ├── components/                   # ⭐ ALL React UI Components
│   │   │   │
│   │   │   ├── layout/                   # Layout components (T3000 desktop style)
│   │   │   │   ├── TopMenuBar.tsx        # Top menu (File, Tools, View, Database, Control, Misc, Help)
│   │   │   │   ├── ToolIconBar.tsx       # Icon toolbar (16 icons)
│   │   │   │   ├── LeftTreePanel.tsx     # Left tree navigation panel
│   │   │   │   ├── TreeNode.tsx          # Tree node component
│   │   │   │   ├── TreeContextMenu.tsx   # Context menu (5 types)
│   │   │   │   ├── Breadcrumb.tsx        # Breadcrumb navigation
│   │   │   │   ├── StatusBar.tsx         # Bottom status bar (4 panes)
│   │   │   │   └── RightPanel.tsx        # Right content area
│   │   │   │
│   │   │   ├── common/                   # Common/shared UI components
│   │   │   │   ├── DeviceCard.tsx        # Device information card
│   │   │   │   ├── DataGrid.tsx          # Reusable data grid (Fluent UI)
│   │   │   │   ├── EditableCell.tsx      # Editable grid cell
│   │   │   │   ├── LoadingSpinner.tsx    # Loading indicator
│   │   │   │   ├── ErrorBoundary.tsx     # Error boundary
│   │   │   │   ├── Toast.tsx             # Toast notification
│   │   │   │   └── ConfirmDialog.tsx     # Confirmation dialog
│   │   │   │
│   │   │   ├── dialogs/                  # Modal dialogs
│   │   │   │   ├── DiscoverDialog.tsx    # MY_SCAN dialog (device scanning)
│   │   │   │   ├── BuildingConfigDialog.tsx # Building configuration
│   │   │   │   ├── AddDeviceDialog.tsx   # Add device dialog
│   │   │   │   ├── RenameDialog.tsx      # Rename dialog
│   │   │   │   ├── DeleteConfirmDialog.tsx # Delete confirmation
│   │   │   │   └── ConnectDialog.tsx     # Connection dialog
│   │   │   │
│   │   │   ├── forms/                    # Form components
│   │   │   │   ├── InputField.tsx        # Input field (Fluent UI)
│   │   │   │   ├── SelectField.tsx       # Select dropdown
│   │   │   │   ├── CheckboxField.tsx     # Checkbox
│   │   │   │   ├── DatePicker.tsx        # Date picker
│   │   │   │   └── FormValidator.tsx     # Form validation helper
│   │   │   │
│   │   │   └── charts/                   # Chart components
│   │   │       ├── TrendLineChart.tsx    # Line chart (ECharts)
│   │   │       ├── BarChart.tsx          # Bar chart
│   │   │       ├── PieChart.tsx          # Pie chart
│   │   │       └── ChartToolbar.tsx      # Chart controls
│   │   │
│   │   ├── layouts/                      # React layouts
│   │   │   └── MainLayout.tsx            # Main T3000 desktop layout (Fluent UI)
│   │   │
│   │   ├── hooks/                        # ⭐ Custom React hooks
│   │   │   ├── useDeviceData.ts          # Device data hook
│   │   │   ├── useBacnetApi.ts           # BACnet API hook
│   │   │   ├── useModbusApi.ts           # Modbus API hook
│   │   │   ├── useTreeNavigation.ts      # Tree navigation hook
│   │   │   ├── useContextMenu.ts         # Context menu hook
│   │   │   ├── useWebSocket.ts           # WebSocket hook
│   │   │   ├── usePolling.ts             # Data polling hook
│   │   │   └── useLocalStorage.ts        # LocalStorage hook
│   │   │
│   │   ├── store/                        # ⭐ Zustand stores (React state)
│   │   │   ├── deviceStore.ts            # Device state
│   │   │   ├── treeStore.ts              # Tree state (buildings, floors, devices)
│   │   │   ├── bacnetStore.ts            # BACnet state (inputs, outputs, variables)
│   │   │   ├── modbusStore.ts            # Modbus state
│   │   │   ├── alarmStore.ts             # Alarm state
│   │   │   ├── trendStore.ts             # Trend log state
│   │   │   ├── uiStore.ts                # UI state (menu, toolbar, dialogs)
│   │   │   └── authStore.ts              # Authentication state
│   │   │
│   │   ├── styles/                       # React-specific styles
│   │   │   ├── global.css                # Global React styles
│   │   │   ├── theme.ts                  # Fluent UI theme configuration
│   │   │   ├── variables.css             # CSS variables (colors, spacing)
│   │   │   └── layout.css                # T3000 desktop layout styles
│   │   │
│   │   ├── config/                       # ⭐ React app configuration
│   │   │   ├── theme.ts                  # Fluent UI theme config
│   │   │   ├── menuConfig.ts             # Top menu configuration (7 menus)
│   │   │   ├── toolbarConfig.ts          # Icon toolbar configuration (16 icons)
│   │   │   ├── constants.ts              # App constants (WINDOW_*, routes)
│   │   │   └── contextMenuConfig.ts      # Context menu configurations (5 types)
│   │   │
│   │   └── utils/                        # React-specific utilities
│   │       ├── treeHelpers.ts            # Tree manipulation utilities
│   │       ├── formatters.ts             # Data formatters
│   │       └── validators.ts             # Input validators
│   │
│   ├── common/                           # ⭐ Shared code (used by both Vue & React)
│   │   │
│   │   ├── api/                          # ⭐ Shared API layer (Axios)
│   │   │   ├── client.ts                 # Axios client (from lib/api.js)
│   │   │   │
│   │   │   ├── bacnet/                   # BACnet API endpoints
│   │   │   │   ├── devices.ts            # Device operations (scan, connect, info)
│   │   │   │   ├── inputs.ts             # Input operations (read, write)
│   │   │   │   ├── outputs.ts            # Output operations (read, write)
│   │   │   │   ├── variables.ts          # Variable operations (read, write)
│   │   │   │   ├── programs.ts           # Program operations (upload, download, run)
│   │   │   │   ├── controllers.ts        # Controller/PID operations
│   │   │   │   ├── schedules.ts          # Schedule operations (weekly, annual)
│   │   │   │   ├── trends.ts             # Trend log operations
│   │   │   │   ├── alarms.ts             # Alarm operations
│   │   │   │   └── graphics.ts           # Graphics operations
│   │   │   │
│   │   │   ├── modbus/                   # Modbus API endpoints
│   │   │   │   ├── devices.ts            # Device operations
│   │   │   │   ├── registers.ts          # Register read/write operations
│   │   │   │   └── polling.ts            # Polling operations
│   │   │   │
│   │   │   ├── devices.ts                # General device API
│   │   │   ├── auth.ts                   # Authentication API
│   │   │   ├── buildings.ts              # Building management API
│   │   │   └── network.ts                # Network operations API
│   │   │
│   │   ├── auth/                         # ⭐ Authentication module
│   │   │   ├── AuthProvider.ts           # Auth context/provider
│   │   │   ├── authUtils.ts              # Auth utilities
│   │   │   ├── permissions.ts            # Permission checks (LOGIN_SUCCESS_*)
│   │   │   └── types.ts                  # Auth types
│   │   │
│   │   ├── state/                        # Shared state management
│   │   │   ├── SharedState.ts            # Cross-framework state
│   │   │   └── EventBus.ts               # Event communication (Vue ↔ React)
│   │   │
│   │   ├── types/                        # ⭐ Shared TypeScript types (from C++ structs)
│   │   │   ├── device.ts                 # Device types (tree_product struct)
│   │   │   ├── bacnet.ts                 # BACnet types
│   │   │   ├── modbus.ts                 # Modbus types
│   │   │   ├── tree.ts                   # Tree node types
│   │   │   ├── menu.ts                   # Menu types
│   │   │   ├── window.ts                 # Window constants (WINDOW_INPUT, etc.)
│   │   │   ├── protocol.ts               # Protocol types (PROTOCOL_BACNET_IP, etc.)
│   │   │   ├── product.ts                # Product types (PM_MINIPANEL, PM_TSTAT10, etc.)
│   │   │   ├── alarm.ts                  # Alarm types
│   │   │   ├── trend.ts                  # Trend log types
│   │   │   ├── schedule.ts               # Schedule types
│   │   │   └── api.ts                    # API response types
│   │   │
│   │   ├── utils/                        # ⭐ Utility functions
│   │   │   ├── common.ts                 # Common utilities (from lib/common.js)
│   │   │   ├── format.ts                 # Data formatting
│   │   │   ├── validation.ts             # Input validation
│   │   │   ├── constants.ts              # Constants (WINDOW_*, Protocol enum, etc.)
│   │   │   ├── helpers.ts                # Helper functions
│   │   │   ├── dateTime.ts               # Date/time utilities
│   │   │   └── conversion.ts             # Unit conversions (°F ↔ °C, etc.)
│   │   │
│   │   ├── T3000/                        # T3000 Business Logic (from lib/T3000/)
│   │   │   ├── Hvac/                     # HVAC controllers
│   │   │   ├── Security/                 # Security controllers
│   │   │   └── T3000.ts                  # Main T3000 logic
│   │   │
│   │   └── components/                   # Framework-agnostic logic
│   │       └── AppSwitcher.ts            # Navigation helper
│   │
│   └── assets/                           # Shared assets
│       ├── images/
│       │   ├── logo.png
│       │   ├── device-icons/             # Device type icons (Tstat, BACnet, CO2, etc.)
│       │   └── backgrounds/
│       ├── icons/
│       │   ├── toolbar/                  # Toolbar icons (16 icons)
│       │   ├── tree/                     # Tree node icons
│       │   └── menu/                     # Menu icons
│       └── fonts/
│   │   │   ├── fluent-theme.ts
│   │   │   └── main.css
│   │   │
│   │   └── config/                       # React config
│   │       ├── menu.config.tsx
│   │       └── routes.config.tsx
│   │
│   ├── common/                           # 🟡 Shared Infrastructure
│   │   │
│   │   ├── api/                          # API client (framework-agnostic)
│   │   │   ├── client.ts                 # Axios instance + interceptors (from lib/api.js)
│   │   │   ├── device.api.ts             # Device endpoints
│   │   │   ├── trendlog.api.ts           # Trend log endpoints
│   │   │   ├── bacnet.api.ts             # BACnet endpoints
│   │   │   └── user.api.ts               # User/auth endpoints
│   │   │
│   │   ├── auth/                         # Authentication
│   │   │   └── authService.ts            # Auth state management
│   │   │
│   │   ├── state/                        # Cross-framework state
│   │   │   ├── sharedState.ts            # localStorage wrapper
│   │   │   └── eventBus.ts               # Custom events
│   │   │
│   │   ├── types/                        # TypeScript types
│   │   │   ├── device.types.ts
│   │   │   ├── bacnet.types.ts
│   │   │   ├── trendlog.types.ts
│   │   │   ├── user.types.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── utils/                        # Utility functions
│   │   │   ├── common.ts                 # Common utilities (from lib/common.js)
│   │   │   ├── format.ts                 # Data formatting
│   │   │   ├── validation.ts             # Input validation
│   │   │   ├── constants.ts              # Constants
│   │   │   └── helpers.ts                # Helper functions
│   │   │
│   │   ├── T3000/                        # T3000 Business Logic (from lib/T3000/)
│   │   │   ├── Hvac/                     # HVAC controllers
│   │   │   ├── Security/                 # Security controllers
│   │   │   └── T3000.ts                  # Main T3000 logic
│   │   │
│   │   └── components/                   # Framework-agnostic logic
│   │       └── AppSwitcher.ts            # Navigation helper
│   │
│   └── assets/                           # Shared assets
│       ├── images/
│       ├── icons/
│       └── fonts/
│
├── api/                                  # Rust backend (existing)
│   └── ...
│
├── docs/                                 # Documentation
│   └── t3-bas-web/
│       ├── Technical-Design.md           # This document
│       ├── Hybrid-Vue-React-Architecture.md
│       ├── Fluent-UI-vs-Ant-Design-Analysis.md
│       └── ...
│
├── tests/                                # Tests
│   ├── t3-vue/                           # Vue tests
│   ├── t3-react/                         # React tests
│   └── common/                           # Shared code tests
│
├── package.json                          # Dependencies (Vue + React)
├── vite.config.ts                        # Vite config (dual plugins)
├── tsconfig.json                         # TypeScript config
├── tsconfig.node.json                    # Node TypeScript config
├── .eslintrc.js                          # ESLint config
├── .prettierrc                           # Prettier config
├── vitest.config.mjs                     # Vitest config
└── README.md
```

### 3.2 Critical Files Implementation

#### File 1: `src/main.ts` (Route Dispatcher)

**Purpose**: Detect route and load appropriate framework
**Priority**: CRITICAL - This is the entry point

```typescript
/**
 * Main Entry Point - Route-Based App Loader
 *
 * This file determines which framework to load based on the current URL:
 * - /t3000/* → Load React + Fluent UI
 * - Everything else → Load Vue + Quasar
 */

const currentPath = window.location.pathname;

console.log(`[Main] Current path: ${currentPath}`);

if (currentPath.startsWith('/t3000')) {
  console.log('[Main] Loading React app...');

  // Lazy load React app
  import('./react-app/main')
    .then((module) => {
      module.initReactApp();
    })
    .catch((error) => {
      console.error('[Main] Failed to load React app:', error);
      // Fallback to Vue app
      window.location.href = '/v2/dashboard';
    });
} else {
  console.log('[Main] Loading Vue app...');

  // Lazy load Vue app
  import('./vue-app/main')
    .then((module) => {
      module.initVueApp();
    })
    .catch((error) => {
      console.error('[Main] Failed to load Vue app:', error);
      document.body.innerHTML = '<h1>Failed to load application</h1>';
    });
}
```

**Testing Strategy**:
- Manual: Visit `/v2/dashboard` → Should load Vue
- Manual: Visit `/t3000/tstat` → Should load React
- Unit: Mock window.location, verify correct import called

---

#### File 2: `src/t3-vue/main.ts` (Vue Entry)

```typescript
/**
 * Vue App Entry Point
 * Initializes Vue 3 + Quasar + Vue Router
 */

import { createApp } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import { Quasar } from 'quasar';
import App from './App.vue';
import routes from './router/routes';

// Quasar styles
import 'quasar/dist/quasar.css';
import '@quasar/extras/material-icons/material-icons.css';

export function initVueApp() {
  console.log('[Vue] Initializing Vue application...');

  // Create router
  const router = createRouter({
    history: createWebHistory(),
    routes,
  });

  // Create Vue app
  const app = createApp(App);

  // Install plugins
  app.use(Quasar, {
    config: {
      brand: {
        primary: '#1976D2',
        secondary: '#26A69A',
      },
    },
  });
  app.use(router);

  // Mount app
  app.mount('#app');

  console.log('[Vue] ✅ Vue application mounted');
}
```

---

#### File 3: `src/t3-vue/router/routes.ts` (Vue Routes)

```typescript
/**
 * Vue Router Configuration
 * Handles all /v2/* routes and legacy routes
 */

import { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/v2/dashboard',
  },
  {
    path: '/login',
    component: () => import('../pages/LoginPage.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/v2',
    component: () => import('../layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: '/v2/dashboard',
      },
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('../pages/V2/Dashboard.vue'),
      },
      {
        path: 'trendlog',
        name: 'trendlog',
        component: () => import('../pages/V2/TrendLogDashboard.vue'),
      },
      {
        path: 'schedules',
        name: 'schedules',
        component: () => import('../pages/V2/Schedules.vue'),
      },
      {
        path: 'modbus',
        name: 'modbus',
        component: () => import('../pages/V2/ModbusRegister.vue'),
      },
      {
        path: 'apps',
        name: 'apps',
        component: () => import('../pages/V2/AppLibrary.vue'),
      },
      // Add all other existing Vue routes...
    ],
  },
  {
    // Catch-all: If user tries to access /t3000/* in Vue app,
    // trigger page reload to load React app
    path: '/t3000/:pathMatch(.*)*',
    beforeEnter: (to) => {
      console.log('[Vue Router] Redirecting to React app:', to.fullPath);
      window.location.href = to.fullPath;
      return false;
    },
  },
  {
    // 404 - Not Found
    path: '/:pathMatch(.*)*',
    component: () => import('../pages/V2/ErrorNotFound.vue'),
  },
];

export default routes;
```

---

#### File 4: `src/t3-react/main.tsx` (React Entry)

```typescript
/**
 * React App Entry Point
 * Initializes React 18 + Fluent UI + React Router
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { router } from './router/routes';
import './styles/main.css';

export function initReactApp() {
  console.log('[React] Initializing React application...');

  const rootElement = document.getElementById('app');

  if (!rootElement) {
    console.error('[React] Root element #app not found!');
    return;
  }

  // Clear any existing content
  rootElement.innerHTML = '';

  const root = ReactDOM.createRoot(rootElement);

  root.render(
    <React.StrictMode>
      <FluentProvider theme={webLightTheme}>
        <RouterProvider router={router} />
      </FluentProvider>
    </React.StrictMode>
  );

  console.log('[React] ✅ React application mounted');
}
```

---

#### File 5: `src/t3-react/router/routes.tsx` (React Routes)

```typescript
/**
 * React Router Configuration
 * Handles all /t3000/* routes (T3BASWeb)
 */

import { createBrowserRouter, Navigate } from 'react-router-dom';
import { MainLayout } from '../layouts/MainLayout';

// Lazy load pages for better code splitting
const TstatView = React.lazy(() => import('../pages/T3000/Tstat/TstatView'));
const BACnetInput = React.lazy(() => import('../pages/T3000/BACnet/BACnetInput'));
const BACnetOutput = React.lazy(() => import('../pages/T3000/BACnet/BACnetOutput'));
const BACnetVariable = React.lazy(() => import('../pages/T3000/BACnet/BACnetVariable'));
const NetworkView = React.lazy(() => import('../pages/T3000/Network/NetworkView'));

export const router = createBrowserRouter([
  {
    path: '/t3000',
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/t3000/tstat" replace />,
      },
      {
        path: 'tstat',
        element: (
          <React.Suspense fallback={<div>Loading...</div>}>
            <TstatView />
          </React.Suspense>
        ),
      },
      {
        path: 'bacnet/input',
        element: (
          <React.Suspense fallback={<div>Loading...</div>}>
            <BACnetInput />
          </React.Suspense>
        ),
      },
      {
        path: 'bacnet/output',
        element: (
          <React.Suspense fallback={<div>Loading...</div>}>
            <BACnetOutput />
          </React.Suspense>
        ),
      },
      {
        path: 'bacnet/variable',
        element: (
          <React.Suspense fallback={<div>Loading...</div>}>
            <BACnetVariable />
          </React.Suspense>
        ),
      },
      {
        path: 'network',
        element: (
          <React.Suspense fallback={<div>Loading...</div>}>
            <NetworkView />
          </React.Suspense>
        ),
      },
    ],
  },
  {
    // Catch-all: If user tries to access non-t3000 routes in React app,
    // redirect to Vue app
    path: '*',
    element: <Navigate to="/v2/dashboard" replace />,
    loader: () => {
      window.location.href = '/v2/dashboard';
      return null;
    },
  },
]);
```

---

#### File 6: `src/common/api/client.ts` (Shared API Client)

```typescript
/**
 * Shared API Client
 * Used by both Vue and React applications
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { AuthService } from '../auth/authService';

class ApiClient {
  private static instance: AxiosInstance | null = null;

  static getInstance(): AxiosInstance {
    if (!ApiClient.instance) {
      ApiClient.instance = axios.create({
        baseURL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8080/api',
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Request interceptor - Add auth token
      ApiClient.instance.interceptors.request.use(
        (config) => {
          const token = AuthService.getToken();
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }

          console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
          return config;
        },
        (error) => {
          console.error('[API] Request error:', error);
          return Promise.reject(error);
        }
      );

      // Response interceptor - Handle errors
      ApiClient.instance.interceptors.response.use(
        (response) => {
          console.log(`[API] Response: ${response.config.url} - ${response.status}`);
          return response;
        },
        (error: AxiosError) => {
          console.error('[API] Response error:', error);

          if (error.response?.status === 401) {
            // Unauthorized - redirect to login
            console.warn('[API] Unauthorized - redirecting to login');
            AuthService.logout();
          }

          return Promise.reject(error);
        }
      );
    }

    return ApiClient.instance;
  }
}

export const api = ApiClient.getInstance();

// Convenience methods
export const apiGet = <T>(url: string) => api.get<T>(url).then(res => res.data);
export const apiPost = <T>(url: string, data?: any) => api.post<T>(url, data).then(res => res.data);
export const apiPut = <T>(url: string, data?: any) => api.put<T>(url, data).then(res => res.data);
export const apiDelete = <T>(url: string) => api.delete<T>(url).then(res => res.data);
```

---

#### File 7: `src/common/auth/authService.ts` (Shared Auth)

```typescript
/**
 * Authentication Service
 * Shared between Vue and React applications
 */

export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
}

export class AuthService {
  private static readonly TOKEN_KEY = 'auth_token';
  private static readonly USER_KEY = 'current_user';

  static getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  static setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
    console.log('[Auth] Token stored');
  }

  static removeToken(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    console.log('[Auth] Token removed');
  }

  static getUser(): User | null {
    const userJson = localStorage.getItem(this.USER_KEY);
    return userJson ? JSON.parse(userJson) : null;
  }

  static setUser(user: User): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    console.log('[Auth] User stored:', user.username);
  }

  static removeUser(): void {
    localStorage.removeItem(this.USER_KEY);
    console.log('[Auth] User removed');
  }

  static isAuthenticated(): boolean {
    return !!this.getToken();
  }

  static logout(): void {
    this.removeToken();
    this.removeUser();
    console.log('[Auth] Logged out');

    // Redirect to login (works for both Vue and React)
    window.location.href = '/login';
  }
}
```

---

#### File 8: `vite.config.ts` (Build Configuration)

```typescript
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    vue(), // Support Vue 3 SFC
    react(), // Support React JSX/TSX
  ],

  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),                    // Root src/
      '@t3-vue': resolve(__dirname, 'src/t3-vue'),       // Vue app (explicit)
      '@t3-react': resolve(__dirname, 'src/t3-react'),   // React app (explicit)
      '@common': resolve(__dirname, 'src/common'),       // Shared code
    },
  },

  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
      },
    },
  },

  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vue vendor bundle
          'vue-vendor': ['vue', 'vue-router', 'quasar'],

          // React vendor bundle
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],

          // Fluent UI bundle
          'fluent-ui': ['@fluentui/react-components', '@fluentui/react-icons'],

          // Shared utilities
          'shared': ['axios'],
        },
      },
    },

    // Source maps for debugging
    sourcemap: true,

    // Code splitting
    chunkSizeWarningLimit: 1000, // 1MB warning threshold
  },

  optimizeDeps: {
    include: [
      'vue',
      'vue-router',
      'quasar',
      'react',
      'react-dom',
      'react-router-dom',
      '@fluentui/react-components',
      'axios',
    ],
  },
});
```

---

#### File 9: `package.json` (Dependencies)

```json
{
  "name": "t3-webview",
  "version": "0.9.0",
  "description": "T3 Webview - Hybrid Vue + React Architecture",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "lint": "eslint src --ext .ts,.tsx,.vue",
    "format": "prettier --write \"src/**/*.{ts,tsx,vue,css}\""
  },
  "dependencies": {
    "vue": "^3.4.0",
    "vue-router": "^4.2.0",
    "quasar": "^2.14.0",
    "@quasar/extras": "^1.16.0",
    "ant-design-vue": "^4.2.6",
    "@ant-design/icons-vue": "^7.0.0",

    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.22.0",
    "@fluentui/react-components": "^9.47.0",
    "@fluentui/react-icons": "^2.0.239",

    "axios": "^1.11.0",
    "echarts": "^5.5.0",
    "echarts-for-react": "^3.0.2",
    "zustand": "^4.5.0"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.0.0",
    "@vitejs/plugin-react": "^4.2.1",
    "vite": "^5.1.0",

    "typescript": "^5.3.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",

    "vitest": "^1.3.0",
    "@vitest/ui": "^1.3.0",
    "@testing-library/vue": "^8.0.0",
    "@testing-library/react": "^14.2.0",
    "@vue/test-utils": "^2.4.0",

    "eslint": "^8.57.0",
    "@typescript-eslint/eslint-plugin": "^7.0.0",
    "@typescript-eslint/parser": "^7.0.0",
    "eslint-plugin-vue": "^9.21.0",
    "eslint-plugin-react": "^7.33.0",
    "eslint-plugin-react-hooks": "^4.6.0",

    "prettier": "^3.2.0"
  }
}
```

---

## 4. T3-React Application Design (T3000 Desktop Layout)

### 4.1 Complete Menu Structure (From C++ Code Analysis)

Based on comprehensive analysis of the T3000 C++ source code (`T3000.rc`, `MainFrm.cpp`, `ImageTreeCtrl.cpp`, `resource.h`), here is the **exact** menu and UI structure to be replicated in T3-React:

#### 4.1.1 Top Menu Bar (7 Main Menus)

** File**
- New Project
- Save As... (Ctrl+S)
- Load File (Ctrl+L)
- Import... (Ctrl+I)
- Exit

** Tools**
- Connect (Ctrl+C)
- Change Modbus ID
- Bacnet Tool
- Modbus Poll
- Register Viewer
- Modbus Register v2 (beta)
- RegisterList Database Folder
- Load firmware for a single device (Ctrl+F2)
- Load firmware for many devices (Ctrl+M)
- Flash SN
- Psychrometry
- PH Chart
- Options
- Disconnect the serial port (Ctrl+D)
- Login my account

** View**
- Toolbars and Docking Windows
  - Tool Bar
  - Building Pane
- Status Bar
- Application Look
  - Office 2003
  - Office 2007 (Blue Style, Silver Style)
- Refresh (F2)

** Database**
- Building Config Database
- All Nodes... (Ctrl+N)
- IONameConfig
- LogDetail

** Control** (Maps to Tool Icon Toolbar)
- Graphics (Alt-G)
- Programs (Alt-P)
- Inputs (Alt-I)
- Outputs (Alt-O)
- Variables (Alt-V)
- Loops (Alt-L) - PID Loops
- Schedules (Alt-S)
- Holidays (Alt-H)
- Trend Logs (Alt-T)
- Alarms (Alt-A)
- Network and Panel (Alt-N)
- Remote Points (Alt-R)
- Configuration (Alt-E)

** Miscellaneous**
- Load Descriptors
- Write into flash
- GSM Connection

** Help**
- Contents
- Version History
- About Software...
- Check For Updates

#### 4.1.2 Tool Menu (Icon Toolbar) - Maps to Windows/Dialogs

The icon toolbar provides quick access to Control menu items. Each button opens a specific view or dialog:

| Icon | Label | Keyboard | Window Constant | Dialog/View Type |
|------|-------|----------|-----------------|------------------|
| ℹ | **Information** | - | WINDOW_SETTING | Settings Dialog (Device Info) |
| | **Inputs** | Alt-I | WINDOW_INPUT | Inputs View (Grid) |
| | **Outputs** | Alt-O | WINDOW_OUTPUT | Outputs View (Grid) |
| | **Variables** | Alt-V | WINDOW_VARIABLE | Variables View (Grid) |
| | **Programs** | Alt-P | WINDOW_PROGRAM | Programs View (Code Editor) |
| | **PID Loops** | Alt-L | WINDOW_CONTROLLER | Controllers View (PID Settings) |
| | **Graphics** | Alt-G | WINDOW_SCREEN | Graphics Editor (Canvas) |
| | **Schedules** | Alt-S | WINDOW_WEEKLY | Weekly Schedule (Grid) |
| | **Holidays** | Alt-H | WINDOW_ANNUAL | Annual Routines (Calendar) |
| | **Trend Logs** | Alt-T | WINDOW_MONITOR | Trend Monitor (Chart) |
| Important | **Alarms** | Alt-A | WINDOW_ALARMLOG | Alarm Log (List) |
| | **Array** | - | WINDOW_ARRAY | Array Data Dialog |
| | **Network Points** | Alt-N | WINDOW_REMOTE_POINT | Remote Points (Modbus/BACnet Grid) |
| | **Configuration** | Alt-E | WINDOW_SETTING | Settings Dialog |
| | **Discover** | - | MY_SCAN Dialog | Device Scanning Dialog |
| | **Buildings** | - | - | Building Configuration Dialog |
| | **Refresh Data** | F2 | - | Calls OnViewRefresh() function |

**Important Notes**:
- **"Information"** icon shows the **Settings Dialog** with device system info (Address, Firmware, Serial Number, Hardware Version)
- **"Discover"** icon opens the **MY_SCAN Dialog** (device scanning, not the same as Tools → Connect)
- **"Buildings"** icon opens **Building Configuration Dialog** (not a tree panel toggle)
- **"Network and Panel"** (Control menu) shows **Array Dialog** (WINDOW_ARRAY)
- **"Network Points"** toolbar shows **Remote Point Dialog** (WINDOW_REMOTE_POINT)
- **"Remote Points"** menu item shows the same **Network Points Dialog** (WINDOW_REMOTE_POINT)
- **"Refresh Data"** refreshes the current active view (calls `OnViewRefresh()`)

#### 4.1.3 Left Panel - Tree View Context Menus

The left tree panel displays a hierarchical structure of buildings, floors, rooms, and devices. **Different context menus** appear based on the clicked node type:

**Context Menu Type 1: Building Root/Empty Area**
```
├─ Project Point View
├─ Sort by Connection
├─ Sort by Floor
├─ Add Modbus Device
├─ Add Remote Device
└─ Add Virtual Device
```
*Source*: `ImageTreeCtrl.cpp` → `DisplayContextOtherMenu()`

**Context Menu Type 2: Building/Device Node**
```
├─ Rename (F2)
├─ Delete (Del)
├─ Sort By Connection
├─ Sort By Floor
├─ Ping
└─ Add Modbus Device
```
*Source*: `ImageTreeCtrl.cpp` → `DisplayContextMenu()`

**Context Menu Type 3: Building Management Mode - Point List Node**
```
├─ Rename
├─ Delete
├─ Communication
└─ Add (submenu)
    ├─ Add Groups
    ├─ Add Nodes (disabled)
    ├─ Add Inputs (disabled)
    ├─ Add Outputs (disabled)
    └─ Add Variable (disabled)
```
*Source*: `ImageTreeCtrl.cpp` → `BMContextMenu()` (TYPE_BM_POINT_LIST)

**Context Menu Type 4: Building Management Mode - Group Node**
```
├─ Rename
├─ Delete
└─ Add (submenu)
    ├─ Add Groups (disabled)
    ├─ Add Nodes
    ├─ Add Module
    ├─ Add Inputs (disabled)
    ├─ Add Outputs (disabled)
    └─ Add Variable (disabled)
```
*Source*: `ImageTreeCtrl.cpp` → `BMContextMenu()` (TYPE_BM_GROUP)

**Context Menu Type 5: Building Management Mode - I/O Node**
```
├─ Rename
├─ Delete
├─ Map to others
└─ Add (submenu)
    ├─ Add Groups (disabled)
    ├─ Add Nodes (disabled)
    ├─ Add Inputs
    ├─ Add Outputs
    ├─ Add Variable
    └─ Property Setting
```
*Source*: `ImageTreeCtrl.cpp` → `BMContextMenu()` (TYPE_BM_INPUT/OUTPUT/VARIABLE)

#### 4.1.4 MainLayout Design Diagram (T3000 Desktop Style)

The T3-React application follows the **T3000 Desktop** layout pattern (NOT Azure Portal style):

```
┌─────────────────────────────────────────────────────────────────────┐
│  TOP MENU BAR (32px) - Light Gray (#F5F5F5)                         │
│  [File] [Tools] [View] [Database] [Control] [Miscellaneous] [Help] │
├─────────────────────────────────────────────────────────────────────┤
│  TOOL MENU (Icon Toolbar - 60px) - Light Gray (#FAFAFA)             │
│  [ℹ️] [📥] [📤] [📝] [⚙️] [🔄] [🎨] [📅] [🗓️] [📈] [🚨] [🌐] [🔗] [🔧] │
│                                                     [🔍] [🏢] [🔄]   │
├──────────────────┬──────────────────────────────────────────────────┤
│                  │                                                  │
│  LEFT PANEL      │  RIGHT PANEL (Content Area)                      │
│  (Tree View)     │                                                  │
│  250px width     │  ┌────────────────────────────────────────────┐  │
│  Resizable       │  │ Breadcrumb: Home > Building 1 > Tstat 1    │  │
│                  │  ├────────────────────────────────────────────┤  │
│  🏢 Building 1   │  │                                            │  │
│   ├─📁 Floor 1   │  │  Tabs: [Info] [Inputs] [Outputs] [Vars]   │  │
│   │ ├─🚪 Room 1 │  │                                            │  │
│   │ │ └─🌡️ T1  │  │  Main Content Area:                        │  │
│   │ └─🚪 Room 2 │  │  ┌──────────────────────────────────────┐  │  │
│   │              │  │  │ Device Information Card              │  │  │
│   └─📁 Floor 2   │  │  │ ┌────────────────────────────────┐  │  │  │
│                  │  │  │ │ Address: 192.168.1.100         │  │  │  │
│  🏢 Building 2   │  │  │ │ Firmware: v2.5.1               │  │  │  │
│   └─🔌 Subnet 1  │  │  │ │ Serial: 12345678               │  │  │  │
│     ├─🌡️ Tstat  │  │  │ │ Hardware: v1.2                 │  │  │  │
│     ├─🔌 BACnet │  │  │ │ Model: PM-TSTAT10              │  │  │  │
│     └─💨 CO2    │  │  │ │ Status: ● Online               │  │  │  │
│                  │  │  │ └────────────────────────────────┘  │  │  │
│  [Right-click]   │  │  └──────────────────────────────────────┘  │  │
│  • Rename        │  │                                            │  │
│  • Delete        │  │  Data Grid: Inputs                         │  │
│  • Sort by Conn. │  │  ┌──────────────────────────────────────┐  │  │
│  • Add Device    │  │  │ Name        | Value | Unit | Status  │  │  │
│                  │  │  │ Temperature | 72.5  | °F   | Active  │  │  │
│                  │  │  │ Input 1     | 45.2  | %    | Active  │  │  │
│                  │  │  │ Input 2     | 0.0   | V    | Fault   │  │  │
│                  │  │  └──────────────────────────────────────┘  │  │
│                  │  │                                            │  │
│                  │  └────────────────────────────────────────────┘  │
│                  │                                                  │
├──────────────────┴──────────────────────────────────────────────────┤
│  STATUS BAR (24px) - Light Gray (#F5F5F5)                           │
│  [RX/TX: 200 pkts] [Building: Main] [Protocol: BACnet] [● Online]  │
└─────────────────────────────────────────────────────────────────────┘
```

**Layout Specifications**:
- **Top Menu Bar**: 32px height, light gray (#F5F5F5), traditional menu (File, Tools, View, etc.)
- **Tool Icon Bar**: 60px height, light gray (#FAFAFA), icon buttons with tooltips
- **Left Panel**: 250px default width, resizable (150px - 400px), white background, tree view
- **Right Panel**: Flexible width, white background, breadcrumb + tabs + content
- **Status Bar**: 24px height, light gray (#F5F5F5), 4 panes (RX/TX, Building, Protocol, Status)

**Color Scheme** (Traditional Desktop App):
- Primary: Light Gray (#F5F5F5, #FAFAFA)
- Content: White (#FFFFFF)
- Text: Dark Gray (#333333)
- Borders: Light Gray (#E0E0E0)
- Active: Blue (#0078D4)
- Success: Green (#107C10)
- Warning: Orange (#FF8C00)
- Error: Red (#D13438)

### 4.2 Tree View Structure

The left panel tree follows this hierarchical structure:

```
Root (Application)
│
├─ 🏢 Building 1 (Name: "Main Office")
│  │
│  ├─ 📁 Floor 1 (Name: "Ground Floor")
│  │  ├─ 🚪 Room 1 (Name: "Office 101")
│  │  │  ├─ 🌡️ Tstat 1 (ID: 1, IP: 192.168.1.100, Status: Online)
│  │  │  └─ 💨 CO2 Sensor (ID: 5, IP: 192.168.1.105, Status: Online)
│  │  │
│  │  └─ 🚪 Room 2 (Name: "Office 102")
│  │     └─ 🌡️ Tstat 2 (ID: 2, IP: 192.168.1.101, Status: Offline)
│  │
│  ├─ 📁 Floor 2 (Name: "Second Floor")
│  │  └─ ...
│  │
│  └─ 🔌 Subnet 1 (COM1 / 192.168.1.x)
│     ├─ 🌡️ Tstat 10 (ID: 10, Serial, Status: Online)
│     ├─ 🔌 BACnet Device (ID: 2, Object: 200, Status: Online)
│     └─ 💨 Air Quality Sensor (ID: 7, IP: 192.168.1.107, Status: Fault)
│
├─ 🏢 Building 2 (Name: "Warehouse")
│  └─ ...
│
└─ 🏢 Building 3 (Name: "Remote Site")
   └─ ...
```

**Node Data Structure** (From C++ `tree_product` struct):

```typescript
interface TreeNode {
  id: string;                    // Unique identifier
  name: string;                  // Display name
  type: NodeType;                // Building | Floor | Room | Device
  icon: string;                  // Icon name (building, folder, device, etc.)
  children?: TreeNode[];         // Child nodes

  // Device-specific fields (if type === Device)
  deviceInfo?: {
    serialNumber: string;        // Device serial number
    productClassId: number;      // Device type (Tstat, BACnet, CO2, etc.)
    productId: number;           // Specific product ID
    protocol: Protocol;          // BACnet, Modbus, etc.
    baudrate?: number;           // Serial baud rate (if serial)
    firmwareVersion: string;     // e.g., "2.5.1"
    hardwareVersion: string;     // e.g., "1.2"
    ipAddress?: string;          // IP address (if network device)
    comPort?: number;            // COM port number (if serial)
    objectInstance?: number;     // BACnet object instance
    status: DeviceStatus;        // Online | Offline | Fault
    networkCardAddress?: string; // MAC address
  };
}

enum NodeType {
  Building = 'building',
  Floor = 'floor',
  Room = 'room',
  Subnet = 'subnet',
  Device = 'device'
}

enum Protocol {
  BACnetIP = 'bacnet-ip',
  BACnetMSTP = 'bacnet-mstp',
  ModbusRTU = 'modbus-rtu',
  ModbusTCP = 'modbus-tcp'
}

enum DeviceStatus {
  Online = 'online',
  Offline = 'offline',
  Fault = 'fault'
}
```

### 4.3 Component Architecture (Fluent UI)

The T3-React application will use Fluent UI v9 components to match the desktop application aesthetics:

**Main Layout Components**:
```typescript
// MainLayout.tsx
├─ TopMenuBar (Fluent UI: MenuBar)
├─ ToolIconBar (Fluent UI: Toolbar)
├─ LeftPanel (Fluent UI: Tree)
├─ RightPanel
│  ├─ Breadcrumb (Fluent UI: Breadcrumb)
│  ├─ TabBar (Fluent UI: TabList)
│  └─ ContentArea (Fluent UI: Card, DataGrid)
└─ StatusBar (Custom component)
```

**Key Fluent UI Components to Use**:
- **Menu**: Top menu bar (File, Tools, View, etc.)
- **Toolbar**: Icon toolbar
- **Tree**: Left panel navigation
- **Breadcrumb**: Navigation path
- **TabList**: Content tabs
- **Card**: Information panels
- **DataGrid**: Data tables (Inputs, Outputs, Variables)
- **Dialog**: Modal windows (Discover, Buildings, Settings)
- **Button**: Action buttons
- **Icon**: Icon buttons (from @fluentui/react-icons)

---

## 5. Implementation Plan & Tracking

### 5.0 Implementation Task Breakdown (121 Tasks)

**Total Tasks**: 121 organized into 19 phases
**Estimated Timeline**: 6 weeks (2-3 developers)
**Current Status**: Ready to begin

#### Task Summary by Phase

| Phase | Tasks | Estimated Days | Description |
|-------|-------|----------------|-------------|
| **Phase 0** | 1 task | 0.5 days | Project setup & planning |
| **Phase 1** | 5 tasks | 1 day | Create folder structure |
| **Phase 2** | 5 tasks | 2 days | Move Vue code to t3-vue |
| **Phase 3** | 8 tasks | 2 days | Create TypeScript types |
| **Phase 4** | 5 tasks | 2 days | Create shared API layer |
| **Phase 5** | 5 tasks | 1.5 days | Create config files |
| **Phase 6** | 2 tasks | 0.5 days | Create React Router |
| **Phase 7** | 5 tasks | 2 days | Create Zustand stores |
| **Phase 8** | 5 tasks | 2 days | Create custom hooks |
| **Phase 9** | 9 tasks | 3 days | Create layout components |
| **Phase 10** | 5 tasks | 2 days | Create common UI components |
| **Phase 11** | 4 tasks | 1.5 days | Create dialog components |
| **Phase 12** | 1 task | 0.5 days | Create form components |
| **Phase 13** | 1 task | 0.5 days | Create chart components |
| **Phase 14** | 5 tasks | 2 days | Create Inputs page (first page) |
| **Phase 15** | 13 tasks | 8 days | Create remaining 12 pages |
| **Phase 16** | 4 tasks | 1 day | Create entry points |
| **Phase 17** | 14 tasks | 5 days | Testing & debugging |
| **Phase 18** | 4 tasks | 2 days | Documentation & cleanup |
| **Phase 19** | 3 tasks | 1 day | Production build & deployment |
| **TOTAL** | **121 tasks** | **~40 days** | **6 weeks (3 devs)** |

#### Critical Path Tasks (Must Complete First)

1. **Phase 0-2** (Days 1-3.5): Setup → Folder structure → Move Vue files
2. **Phase 3** (Days 4-5): TypeScript types (everything depends on this)
3. **Phase 4** (Days 6-7): API layer (pages need this)
4. **Phase 5-8** (Days 8-13): Config, routing, stores, hooks (foundation)
5. **Phase 9** (Days 14-16): Layout components (shell of the app)
6. **Phase 10-13** (Days 17-20): UI components (pages use these)
7. **Phase 14** (Days 21-22): First page (Inputs - establishes pattern)
8. **Phase 15** (Days 23-30): Remaining pages (parallel work possible)
9. **Phase 16-19** (Days 31-40): Integration, testing, deployment

#### Files to Create by Category

| Category | Files | Locations |
|----------|-------|-----------|
| **Pages** | ~60 files | `src/t3-react/pages/{13 folders}` |
| **Components** | ~31 files | `src/t3-react/components/{layout,common,dialogs,forms,charts}` |
| **Hooks** | 8 files | `src/t3-react/hooks/` |
| **Stores** | 8 files | `src/t3-react/store/` |
| **API Modules** | ~20 files | `src/common/api/{bacnet,modbus,etc}` |
| **Types** | ~12 files | `src/common/types/` |
| **Utils** | ~10 files | `src/common/utils/` |
| **Config** | 5 files | `src/t3-react/config/` |
| **Entry Points** | 4 files | `src/main.ts`, `src/t3-react/{main,App}`, etc. |
| **TOTAL** | **~158 new files** | Est. 16,100 lines of code |

---

### 5.1 Sprint Breakdown (6 weeks total)

#### **Sprint 0: Planning & Design (Week 0)**

**Goal**: Finalize technical design and get approval

**Tasks**:
- [ ] Review this technical design document
- [ ] Get approval from stakeholders
- [ ] Set up project tracking (Jira/GitHub Issues)
- [ ] Prepare development environment

**Deliverable**: Approved technical design

---

#### **Sprint 1: Infrastructure Setup (Week 1-2)**

**Goal**: Set up hybrid architecture foundation

**Week 1 Tasks**:
- [ ] **Day 1**: Install React dependencies
  ```bash
  npm install react react-dom react-router-dom @fluentui/react-components @fluentui/react-icons zustand
  npm install --save-dev @vitejs/plugin-react @types/react @types/react-dom
  ```

- [ ] **Day 2**: Update Vite configuration
  - Add React plugin
  - Configure aliases
  - Set up code splitting

- [ ] **Day 3**: Create folder structure
  ```bash
  mkdir -p src/t3-vue src/t3-react src/common
  mkdir -p src/t3-react/{pages,components,layouts,hooks,store,styles,config}
  mkdir -p src/common/{api,auth,state,types,utils,components}
  ```

- [ ] **Day 4-5**: Move existing Vue code
  ```bash
  # Move existing files to t3-vue/
  mv src/App.vue src/t3-vue/
  mv src/pages src/t3-vue/
  mv src/components src/t3-vue/
  mv src/layouts src/t3-vue/
  mv src/router src/t3-vue/

  # Create shared API layer
  mv src/lib/api.js src/common/api/client.ts

  # Update all imports: @/ → @t3-vue/ (automated)
  # This will be done with find & replace
  ```**Week 2 Tasks**:
- [ ] **Day 1**: Update all Vue imports (automated find & replace)
  ```bash
  # Find & Replace across all Vue files
  # Replace: from '@/ → from '@t3-vue/
  # Replace: import('@/ → import('@t3-vue/
  ```
- [ ] **Day 2**: Create `src/main.ts` (route dispatcher)
- [ ] **Day 3**: Create `src/t3-vue/main.ts` (Vue entry)
- [ ] **Day 4**: Create `src/t3-react/main.tsx` (React entry)
- [ ] **Day 5**: Create shared infrastructure
  - `src/common/api/client.ts`
  - `src/common/auth/authService.ts`
  - `src/common/state/sharedState.ts`
  - `src/common/types/device.types.ts`

**Testing**:
- [ ] Verify Vue app loads on `/v2/dashboard`
- [ ] Verify route dispatcher works
- [ ] Verify shared API client works in Vue

**Deliverables**:
- Project structure migrated
- Vite configured for dual build
- Vue app working (no regressions)
- Shared infrastructure created

---

#### **Sprint 2: First React Page (Week 3-4)**

**Goal**: Build and deploy first T3BASWeb page (Tstat view)

**Week 3 Tasks**:
- [ ] **Day 1-2**: Create MainLayout (React + Fluent UI)
  - Top header with logo, search, profile
  - Icon-only left sidebar (50px)
  - Content area with router outlet
  - Navigation menu

- [ ] **Day 3-4**: Create React Router configuration
  - Routes for `/t3000/*`
  - Navigation guards
  - Error boundaries

- [ ] **Day 5**: Create first page placeholder
  - `src/t3-react/pages/T3000/Tstat/TstatView.tsx`
  - Basic layout with Fluent UI components

**Week 4 Tasks**:
- [ ] **Day 1-2**: Implement TstatView UI
  - Data point grid
  - Device info panel
  - Control buttons

- [ ] **Day 3**: Connect to API
  - Use shared API client
  - Fetch device data
  - Display in UI

- [ ] **Day 4**: Add navigation between apps
  - Vue → React navigation links
  - React → Vue fallback

- [ ] **Day 5**: Testing and bug fixes

**Testing**:
- [ ] Manual: Navigate from `/v2/dashboard` to `/t3000/tstat`
- [ ] Manual: Verify Tstat view displays correctly
- [ ] Manual: Verify API calls work
- [ ] Manual: Navigate back to Vue app

**Deliverables**:
- MainLayout (Fluent UI)
- React Router configured
- TstatView page working
- Navigation between apps working

---

#### **Sprint 3: Production Release (Week 5-6)**

**Goal**: Test, optimize, and deploy to production

**Week 5 Tasks**:
- [ ] **Day 1-2**: End-to-end testing
  - Test all navigation paths
  - Test authentication flow
  - Test API integration
  - Test error handling

- [ ] **Day 3**: Performance optimization
  - Measure bundle sizes
  - Optimize code splitting
  - Verify lazy loading works

- [ ] **Day 4**: Documentation
  - Update README
  - Document navigation patterns
  - Document shared code usage

- [ ] **Day 5**: Bug fixes

**Week 6 Tasks**:
- [ ] **Day 1**: Staging deployment
- [ ] **Day 2**: Staging testing
- [ ] **Day 3**: Production deployment
- [ ] **Day 4**: Production verification
- [ ] **Day 5**: Knowledge transfer & retrospective

**Deliverables**:
- All tests passing
- Documentation complete
- Deployed to production
- Team trained

---

### 4.2 Team Assignments

| Role | Responsibility | Time Commitment |
|------|----------------|----------------|
| **Lead Developer** | Architecture, code reviews, critical files | 100% (6 weeks) |
| **React Developer** | React components, Fluent UI, TstatView | 100% (Weeks 3-6) |
| **Vue Developer** | Vue app maintenance, shared code | 50% (Weeks 1-2) |
| **QA Engineer** | Testing, bug tracking | 50% (Weeks 5-6) |

---

## 5. Code Examples

### 5.1 T3-React MainLayout Design (Azure Portal Style)

#### Layout Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  TOP HEADER (48px height, #323130 dark gray)                                │
│  ┌──────────┬────────────────────────────────────────────────┬────────────┐ │
│  │ T3000    │  🔍 Search devices, settings...                │  👤 Admin  │ │
│  │ Logo     │                                                 │  🔔 ⚙️     │ │
│  └──────────┴────────────────────────────────────────────────┴────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
┌──┬──────────────────────────────────────────────────────────────────────────┐
│  │  BREADCRUMB (32px height, #f3f2f1 light gray)                            │
│  │  Home > T3000 > Tstat Controller > Room 101                              │
│  │                                                                            │
├──┼────────────────────────────────────────────────────────────────────────────┤
│  │                                                                            │
│ L│  MAIN CONTENT AREA (scrollable, white background)                        │
│ E│  ┌──────────────────────────────────────────────────────────────────┐   │
│ F│  │  Page Title: Tstat Controller - Room 101                         │   │
│ T│  │  [Refresh] [Save] [Settings]                                     │   │
│  │  ├──────────────────────────────────────────────────────────────────┤   │
│ S│  │                                                                   │   │
│ I│  │  TABS: Overview | Data Points | Schedule | Trend Log            │   │
│ D│  │  ━━━━━━━━                                                        │   │
│ E│  │                                                                   │   │
│ B│  │  ┌─────────────────────┐  ┌──────────────────────────────────┐ │   │
│ A│  │  │ CARD: Device Info   │  │ CARD: Quick Actions              │ │   │
│ R│  │  │ Model: T3-BB        │  │ [Read All]  [Write All]          │ │   │
│  │  │  │ IP: 192.168.1.100   │  │ [Clear Alarms]                   │ │   │
│ (│  │  │ Status: Online      │  │                                  │ │   │
│ 5│  │  └─────────────────────┘  └──────────────────────────────────┘ │   │
│ 0│  │                                                                   │   │
│ p│  │  ┌───────────────────────────────────────────────────────────┐  │   │
│ x│  │  │ DATA GRID: Data Points (Fluent UI DataGrid)              │  │   │
│ )│  │  ├─────────┬────────┬──────┬──────┬────────┬─────────────────┤  │   │
│  │  │  │ Name    │ Value  │ Unit │ Auto │ Range  │ Description     │  │   │
│  │  │  ├─────────┼────────┼──────┼──────┼────────┼─────────────────┤  │   │
│ │││  │  │ Temp    │ 72.5   │ °F   │ ✓    │ 50-90  │ Room Temp       │  │   │
│ │││  │  │ Setpoint│ 70.0   │ °F   │ ✓    │ 50-90  │ Target Temp     │  │   │
│ │││  │  │ Humidity│ 45     │ %    │ ✓    │ 0-100  │ Relative Humid  │  │   │
│ │││  │  │ Fan     │ Auto   │ -    │ ✓    │ -      │ Fan Mode        │  │   │
│ │││  │  │ ...     │ ...    │ ...  │ ...  │ ...    │ ...             │  │   │
│ │││  │  └─────────┴────────┴──────┴──────┴────────┴─────────────────┘  │   │
│ ▼││  │                                                                   │   │
│  │  │  [Show 50 rows] [Page 1 of 5] [Next >]                           │   │
│  │  └───────────────────────────────────────────────────────────────────┘   │
│  │                                                                            │
└──┴────────────────────────────────────────────────────────────────────────────┘

LEFT SIDEBAR (Icon-only, 50px width, collapsible to 200px on hover):
┌──────┐
│ ☰    │  Hamburger (toggle expand)
├──────┤
│ 🏠   │  Home
│ Home │  (text shows on hover/expand)
├──────┤
│ 🌡️   │  Tstat
│Tstat │
├──────┤
│ 📊   │  BACnet
│BACnet│  ├─ Input
│      │  ├─ Output
│      │  ├─ Variable
│      │  └─ Schedule
├──────┤
│ 🌐   │  Network
│Netwrk│
├──────┤
│ 📈   │  Trend Log
│Trend │
├──────┤
│ 🎨   │  Graphics
│Graph │
├──────┤
│ ⚙️   │  Settings
│Config│
└──────┘
```

#### Key Design Elements (Fluent UI)

**1. Top Header (48px)**
- Dark gray background (#323130)
- White text and icons
- Components:
  - Logo/Brand (left)
  - Global search bar (center, expandable)
  - User profile, notifications, settings (right)

**2. Left Sidebar (50px collapsed, 200px expanded)**
- Icon-only by default (Azure Portal style)
- Expands on hover or click hamburger
- Shows icon + label when expanded
- Highlights active section
- Background: #f3f2f1 (light gray)

**3. Breadcrumb Navigation (32px)**
- Shows current location hierarchy
- Clickable breadcrumb trail
- Background: white or very light gray

**4. Main Content Area**
- White background
- Padded (24px)
- Components:
  - Page title + action buttons
  - Tabs for different views
  - Cards for grouped information
  - Fluent UI DataGrid for data tables
  - Pagination controls

**5. Color Scheme (Fluent UI)**
- Primary: #0078D4 (Microsoft Blue)
- Background: #FFFFFF (white)
- Surface: #F3F2F1 (light gray)
- Text: #323130 (dark gray)
- Border: #EDEBE9 (very light gray)

---

### 5.2 MainLayout Component Structure

```
MainLayout.tsx
├── Header (fixed top)
│   ├── Logo + Brand
│   ├── SearchBox (Fluent UI)
│   └── UserMenu (Persona + Menu)
│
├── Sidebar (fixed left)
│   ├── Hamburger toggle
│   ├── Navigation items
│   │   ├── NavLink (Home)
│   │   ├── NavLink (Tstat)
│   │   ├── NavLink with submenu (BACnet)
│   │   │   ├── Input
│   │   │   ├── Output
│   │   │   ├── Variable
│   │   │   └── Schedule
│   │   ├── NavLink (Network)
│   │   ├── NavLink (Trend Log)
│   │   ├── NavLink (Graphics)
│   │   └── NavLink (Settings)
│   └── [Collapsible state management]
│
├── Breadcrumb (below header)
│   └── Breadcrumb items (Home > Section > Page)
│
└── Main Content (scrollable)
    ├── Page header
    │   ├── Title
    │   └── Action buttons
    ├── Tabs (optional)
    └── Outlet (React Router)
        └── Rendered page content
```

---

### 5.3 Complete MainLayout Implementation

**File**: `src/t3-react/layouts/MainLayout.tsx`

```tsx
import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  makeStyles,
  shorthands,
  tokens,
  Button,
  Input,
  Menu,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  Avatar,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbButton,
  BreadcrumbDivider,
} from '@fluentui/react-components';
import {
  Navigation20Regular,
  Home20Regular,
  Temperature20Regular,
  DataArea20Regular,
  Globe20Regular,
  ChartMultiple20Regular,
  Paint20Regular,
  Settings20Regular,
  Search20Regular,
  Alert20Regular,
  Person20Regular,
  ChevronRight20Regular,
} from '@fluentui/react-icons';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    overflow: 'hidden',
  },

  // Top Header
  header: {
    display: 'flex',
    alignItems: 'center',
    height: '48px',
    backgroundColor: '#323130',
    color: '#FFFFFF',
    ...shorthands.padding('0', '16px'),
    ...shorthands.gap('16px'),
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    zIndex: 1000,
  },
  logo: {
    fontSize: '18px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('8px'),
    minWidth: '150px',
  },
  searchContainer: {
    flex: 1,
    maxWidth: '600px',
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('12px'),
  },

  // Main container
  mainContainer: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },

  // Left Sidebar
  sidebar: {
    width: '50px',
    backgroundColor: '#F3F2F1',
    ...shorthands.borderRight('1px', 'solid', '#EDEBE9'),
    display: 'flex',
    flexDirection: 'column',
    transition: 'width 0.2s ease',
    overflow: 'hidden',
    zIndex: 100,
    ':hover': {
      width: '200px',
    },
  },
  sidebarExpanded: {
    width: '200px',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.padding('12px', '16px'),
    ...shorthands.gap('12px'),
    cursor: 'pointer',
    color: '#323130',
    textDecoration: 'none',
    transition: 'background-color 0.15s',
    whiteSpace: 'nowrap',
    ':hover': {
      backgroundColor: '#E1DFDD',
    },
  },
  navItemActive: {
    backgroundColor: '#EDEBE9',
    ...shorthands.borderLeft('3px', 'solid', '#0078D4'),
  },
  navIcon: {
    minWidth: '20px',
  },
  navLabel: {
    fontSize: '14px',
  },

  // Content area
  contentArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  breadcrumbContainer: {
    ...shorthands.padding('8px', '24px'),
    backgroundColor: '#FAFAFA',
    ...shorthands.borderBottom('1px', 'solid', '#EDEBE9'),
  },
  content: {
    flex: 1,
    overflow: 'auto',
    backgroundColor: '#FFFFFF',
    ...shorthands.padding('24px'),
  },
});

export const MainLayout: React.FC = () => {
  const styles = useStyles();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  const navItems = [
    { path: '/t3000', icon: <Home20Regular />, label: 'Home' },
    { path: '/t3000/tstat', icon: <Temperature20Regular />, label: 'Tstat' },
    {
      path: '/t3000/bacnet',
      icon: <DataArea20Regular />,
      label: 'BACnet',
      submenu: [
        { path: '/t3000/bacnet/input', label: 'Input' },
        { path: '/t3000/bacnet/output', label: 'Output' },
        { path: '/t3000/bacnet/variable', label: 'Variable' },
        { path: '/t3000/bacnet/schedule', label: 'Schedule' },
      ],
    },
    { path: '/t3000/network', icon: <Globe20Regular />, label: 'Network' },
    { path: '/t3000/trendlog', icon: <ChartMultiple20Regular />, label: 'Trend Log' },
    { path: '/t3000/graphics', icon: <Paint20Regular />, label: 'Graphics' },
    { path: '/t3000/settings', icon: <Settings20Regular />, label: 'Settings' },
  ];

  const isActive = (path: string) => location.pathname === path;

  const handleNavClick = (path: string) => {
    navigate(path);
  };

  return (
    <div className={styles.root}>
      {/* Top Header */}
      <header className={styles.header}>
        <div className={styles.logo}>
          <Temperature20Regular /> T3000 Portal
        </div>

        <div className={styles.searchContainer}>
          <Input
            placeholder="Search devices, settings..."
            contentBefore={<Search20Regular />}
            appearance="filled-lighter"
            style={{ width: '100%' }}
          />
        </div>

        <div className={styles.headerActions}>
          <Button
            appearance="subtle"
            icon={<Alert20Regular />}
            style={{ color: '#FFFFFF' }}
          />

          <Menu>
            <MenuTrigger disableButtonEnhancement>
              <Button
                appearance="subtle"
                icon={<Avatar name="Admin" color="colorful" size={28} />}
                style={{ color: '#FFFFFF' }}
              >
                Admin
              </Button>
            </MenuTrigger>
            <MenuPopover>
              <MenuList>
                <MenuItem>Profile</MenuItem>
                <MenuItem>Settings</MenuItem>
                <MenuItem>Sign Out</MenuItem>
              </MenuList>
            </MenuPopover>
          </Menu>
        </div>
      </header>

      <div className={styles.mainContainer}>
        {/* Left Sidebar */}
        <nav
          className={`${styles.sidebar} ${sidebarExpanded ? styles.sidebarExpanded : ''}`}
          onMouseEnter={() => setSidebarExpanded(true)}
          onMouseLeave={() => setSidebarExpanded(false)}
        >
          <div
            className={styles.navItem}
            onClick={() => setSidebarExpanded(!sidebarExpanded)}
          >
            <Navigation20Regular className={styles.navIcon} />
            {sidebarExpanded && <span className={styles.navLabel}>Menu</span>}
          </div>

          {navItems.map((item) => (
            <div key={item.path}>
              <div
                className={`${styles.navItem} ${isActive(item.path) ? styles.navItemActive : ''}`}
                onClick={() => handleNavClick(item.path)}
              >
                <span className={styles.navIcon}>{item.icon}</span>
                {sidebarExpanded && <span className={styles.navLabel}>{item.label}</span>}
              </div>

              {/* Submenu items (if expanded and has submenu) */}
              {sidebarExpanded && item.submenu && (
                <div style={{ paddingLeft: '20px' }}>
                  {item.submenu.map((subItem) => (
                    <div
                      key={subItem.path}
                      className={`${styles.navItem} ${isActive(subItem.path) ? styles.navItemActive : ''}`}
                      onClick={() => handleNavClick(subItem.path)}
                      style={{ paddingLeft: '32px' }}
                    >
                      <ChevronRight20Regular className={styles.navIcon} />
                      <span className={styles.navLabel}>{subItem.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Content Area */}
        <div className={styles.contentArea}>
          {/* Breadcrumb */}
          <div className={styles.breadcrumbContainer}>
            <Breadcrumb>
              <BreadcrumbItem>
                <BreadcrumbButton onClick={() => navigate('/t3000')}>
                  Home
                </BreadcrumbButton>
              </BreadcrumbItem>
              <BreadcrumbDivider />
              <BreadcrumbItem>
                <BreadcrumbButton>T3000</BreadcrumbButton>
              </BreadcrumbItem>
              <BreadcrumbDivider />
              <BreadcrumbItem>
                <BreadcrumbButton>Current Page</BreadcrumbButton>
              </BreadcrumbItem>
            </Breadcrumb>
          </div>

          {/* Main Content (React Router Outlet) */}
          <main className={styles.content}>
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};

export default MainLayout;
```

---

### 5.4 Complete Example: React Page with Fluent UI

**File**: `src/t3-react/pages/T3000/Tstat/TstatView.tsx`

```tsx
import React, { useEffect, useState } from 'react';
import {
  makeStyles,
  tokens,
  Card,
  CardHeader,
  Button,
  Spinner,
  Text,
  Title3,
  DataGrid,
  DataGridBody,
  DataGridRow,
  DataGridHeader,
  DataGridHeaderCell,
  DataGridCell,
  createTableColumn,
  TableCellLayout,
  TableColumnDefinition,
} from '@fluentui/react-components';
import { apiGet } from '@common/api/client';
import { Device, DataPoint } from '@common/types/device.types';

const useStyles = makeStyles({
  container: {
    padding: tokens.spacingVerticalXXL,
  },
  header: {
    marginBottom: tokens.spacingVerticalL,
  },
  card: {
    marginBottom: tokens.spacingVerticalL,
  },
  grid: {
    width: '100%',
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '400px',
  },
});

export const TstatView: React.FC = () => {
  const styles = useStyles();
  const [device, setDevice] = useState<Device | null>(null);
  const [dataPoints, setDataPoints] = useState<DataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Fetch device and data points
      const [deviceData, pointsData] = await Promise.all([
        apiGet<Device>('/devices/current'),
        apiGet<DataPoint[]>('/devices/current/datapoints'),
      ]);

      setDevice(deviceData);
      setDataPoints(pointsData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const columns: TableColumnDefinition<DataPoint>[] = [
    createTableColumn<DataPoint>({
      columnId: 'name',
      compare: (a, b) => a.name.localeCompare(b.name),
      renderHeaderCell: () => 'Name',
      renderCell: (item) => (
        <TableCellLayout>{item.name}</TableCellLayout>
      ),
    }),
    createTableColumn<DataPoint>({
      columnId: 'value',
      renderHeaderCell: () => 'Value',
      renderCell: (item) => (
        <TableCellLayout>{item.value}</TableCellLayout>
      ),
    }),
    createTableColumn<DataPoint>({
      columnId: 'unit',
      renderHeaderCell: () => 'Unit',
      renderCell: (item) => (
        <TableCellLayout>{item.unit}</TableCellLayout>
      ),
    }),
  ];

  if (loading) {
    return (
      <div className={styles.loading}>
        <Spinner size="huge" label="Loading device data..." />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <Title3>{device?.name || 'Tstat Controller'}</Title3>
        <Text>Device ID: {device?.id}</Text>
      </div>

      {/* Device Info Card */}
      <Card className={styles.card}>
        <CardHeader
          header={<Text weight="semibold">Device Information</Text>}
        />
        <div style={{ padding: '16px' }}>
          <Text>Model: {device?.model}</Text><br />
          <Text>IP Address: {device?.ipAddress}</Text><br />
          <Text>Status: {device?.status}</Text>
        </div>
      </Card>

      {/* Data Points Grid */}
      <Card className={styles.card}>
        <CardHeader
          header={<Text weight="semibold">Data Points</Text>}
          action={
            <Button appearance="primary" onClick={loadData}>
              Refresh
            </Button>
          }
        />
        <DataGrid
          items={dataPoints}
          columns={columns}
          sortable
          className={styles.grid}
        >
          <DataGridHeader>
            <DataGridRow>
              {({ renderHeaderCell }) => (
                <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>
              )}
            </DataGridRow>
          </DataGridHeader>
          <DataGridBody<DataPoint>>
            {({ item, rowId }) => (
              <DataGridRow<DataPoint> key={rowId}>
                {({ renderCell }) => (
                  <DataGridCell>{renderCell(item)}</DataGridCell>
                )}
              </DataGridRow>
            )}
          </DataGridBody>
        </DataGrid>
      </Card>
    </div>
  );
};

export default TstatView;
```

### 5.2 Navigation Example: Vue → React

**In Vue Component** (`src/t3-vue/layouts/MainLayout.vue`):

```vue
<template>
  <q-layout view="hHh lpR fFf">
    <!-- Header -->
    <q-header elevated>
      <q-toolbar>
        <q-toolbar-title>T3000 Portal</q-toolbar-title>

        <q-btn flat label="Legacy Views" />

        <!-- Navigation to React app -->
        <q-btn
          flat
          label="T3BASWeb (New)"
          @click="goToT3BASWeb"
          color="primary"
        />
      </q-toolbar>
    </q-header>

    <!-- Content -->
    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
const goToT3BASWeb = () => {
  // Navigate to React app (will trigger page reload)
  window.location.href = '/t3000/tstat';
};
</script>
```

### 5.3 Navigation Example: React → Vue

**In React Component** (`src/t3-react/layouts/MainLayout.tsx`):

```tsx
import { Menu, MenuItem, MenuTrigger, MenuPopover, MenuList, Button } from '@fluentui/react-components';
import { ChevronDown20Regular } from '@fluentui/react-icons';

export const MainLayout: React.FC = () => {
  const goToLegacyApp = (path: string) => {
    window.location.href = path;
  };

  return (
    <div className="main-layout">
      <header>
        <Menu>
          <MenuTrigger disableButtonEnhancement>
            <Button appearance="subtle" icon={<ChevronDown20Regular />}>
              Switch to Legacy
            </Button>
          </MenuTrigger>

          <MenuPopover>
            <MenuList>
              <MenuItem onClick={() => goToLegacyApp('/v2/dashboard')}>
                Dashboard (Legacy)
              </MenuItem>
              <MenuItem onClick={() => goToLegacyApp('/v2/trendlog')}>
                Trend Log (Legacy)
              </MenuItem>
              <MenuItem onClick={() => goToLegacyApp('/v2/modbus')}>
                Modbus Register (Legacy)
              </MenuItem>
            </MenuList>
          </MenuPopover>
        </Menu>
      </header>

      <main>
        <Outlet />
      </main>
    </div>
  );
};
```

---

## 6. Testing Strategy

### 6.1 Unit Testing

**Vue Tests** (using @vue/test-utils):
```typescript
// tests/t3-vue/components/StatusIndicator.spec.ts
import { mount } from '@vue/test-utils';
import StatusIndicator from '@t3-vue/components/Basic/StatusIndicator.vue';

describe('StatusIndicator (Vue)', () => {
  it('renders online status', () => {
    const wrapper = mount(StatusIndicator, {
      props: { status: 'online', label: 'Online' },
    });
    expect(wrapper.text()).toContain('Online');
  });
});
```

**React Tests** (using @testing-library/react):
```typescript
// tests/t3-react/components/StatusIndicator.spec.tsx
import { render, screen } from '@testing-library/react';
import { StatusIndicator } from '@t3-react/components/T3000/StatusIndicator';

describe('StatusIndicator (React)', () => {
  it('renders online status', () => {
    render(<StatusIndicator status="online" label="Online" />);
    expect(screen.getByText('Online')).toBeInTheDocument();
  });
});
```

**Shared Code Tests**:
```typescript
// tests/common/api/client.spec.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { api } from '@common/api/client';

describe('API Client', () => {
  it('should add auth token to requests', async () => {
    // Test implementation
  });
});
```

### 6.2 Integration Testing

**Cross-Framework Navigation**:
```typescript
// tests/integration/navigation.spec.ts
import { test, expect } from '@playwright/test';

test('navigate from Vue to React app', async ({ page }) => {
  // Start on Vue app
  await page.goto('http://localhost:3000/v2/dashboard');
  await expect(page.locator('text=Dashboard')).toBeVisible();

  // Navigate to React app
  await page.click('text=T3BASWeb');
  await page.waitForURL('**/t3000/tstat');

  // Verify React app loaded
  await expect(page.locator('text=Tstat Controller')).toBeVisible();
});
```

### 6.3 E2E Testing Checklist

- [ ] User can log in
- [ ] Vue app loads on `/v2/dashboard`
- [ ] React app loads on `/t3000/tstat`
- [ ] Navigation from Vue → React works
- [ ] Navigation from React → Vue works
- [ ] API calls work in both apps
- [ ] Authentication persists across apps
- [ ] Logout works from both apps
- [ ] Error pages display correctly
- [ ] 404 handling works
- [ ] Browser back/forward buttons work

---

## 7. Deployment Plan

### 7.1 Build Process

```bash
# Development
npm run dev
# → Starts Vite dev server on http://localhost:3000
# → Both Vue and React apps available

# Production Build
npm run build
# → Creates optimized bundles in dist/
# → Code splitting applied
# → Source maps generated

# Preview Production Build
npm run preview
# → Serves production build locally
```

### 7.2 Deployment Checklist

**Pre-Deployment**:
- [ ] All tests passing
- [ ] Code review completed
- [ ] Performance benchmarks met
- [ ] Security audit completed
- [ ] Documentation updated

**Staging Deployment**:
- [ ] Deploy to staging server
- [ ] Run smoke tests
- [ ] Verify both Vue and React apps work
- [ ] Test navigation between apps
- [ ] Verify API integration
- [ ] Get stakeholder approval

**Production Deployment**:
- [ ] Create deployment backup
- [ ] Deploy to production
- [ ] Run smoke tests
- [ ] Monitor error logs
- [ ] Verify performance metrics
- [ ] Send release notes

### 7.3 Rollback Plan

If issues are detected:

1. **Immediate**: Rollback to previous deployment
   ```bash
   # Restore previous build
   cp -r dist.backup dist
   ```

2. **Investigation**: Review logs and identify issue

3. **Fix**: Address issue in development

4. **Re-deploy**: After thorough testing

---

## 8. Risk Assessment

### 8.1 Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Bundle size too large** | Medium | Medium | Code splitting, lazy loading |
| **Route conflicts** | Low | High | Clear route namespacing (/v2 vs /t3000) |
| **State sync issues** | Medium | Medium | Use SharedState and EventBus |
| **Build errors** | Low | High | Comprehensive testing, CI/CD |
| **Performance degradation** | Low | Medium | Performance monitoring, optimization |
| **Breaking existing Vue app** | Low | Critical | Comprehensive testing, no changes to Vue code |

### 8.2 Team Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Team unfamiliar with React** | High | Medium | Training, pair programming |
| **Confusion about which app to use** | Medium | Low | Clear documentation, team communication |
| **Increased complexity** | High | Medium | Good documentation, code reviews |

### 8.3 Mitigation Strategies

1. **Comprehensive Testing**: Unit, integration, E2E tests
2. **Code Reviews**: All changes reviewed by 2+ developers
3. **Documentation**: Keep technical docs up to date
4. **Monitoring**: Set up error tracking and performance monitoring
5. **Training**: Provide React training for team
6. **Gradual Rollout**: Start with one page, expand gradually

---

## 9. Success Criteria

### 9.1 Technical Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Bundle Size (gzipped)** | < 400 KB | Vite build output |
| **Initial Load Time** | < 2s | Lighthouse |
| **Route Transition** | < 1.5s | Manual testing |
| **Test Coverage** | > 80% | Vitest coverage report |
| **Build Time** | < 2 min | CI/CD pipeline |
| **No Regressions** | 0 bugs | QA testing |

### 9.2 User Experience Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Navigation Clarity** | 100% users understand | User testing |
| **Feature Parity** | 100% existing features work | QA testing |
| **Visual Consistency** | Professional appearance | Design review |

### 9.3 Business Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Development Velocity** | +20% | Sprint velocity |
| **Time to New Feature** | Reduced by 30% | Feature delivery time |
| **Team Satisfaction** | > 4/5 | Team survey |

---

## 10. Appendices

### 10.1 Glossary

| Term | Definition |
|------|------------|
| **Hybrid Architecture** | System where Vue and React coexist |
| **Route Dispatcher** | Entry point that determines which framework to load |
| **Shared Infrastructure** | Code used by both Vue and React (API, auth, etc.) |
| **Code Splitting** | Technique to split code into separate bundles |
| **Lazy Loading** | Loading code only when needed |
| **SPA** | Single Page Application |

### 10.2 References

- [Vue 3 Documentation](https://vuejs.org/)
- [React Documentation](https://react.dev/)
- [Fluent UI React](https://react.fluentui.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [React Router](https://reactrouter.com/)

### 10.3 Approvals

**This technical design requires approval from**:

- [ ] **Technical Lead**: _________________ Date: _______
- [ ] **Product Owner**: _________________ Date: _______
- [ ] **Development Team**: _________________ Date: _______

**Notes/Comments**:
_____________________________________________________________
_____________________________________________________________
_____________________________________________________________

---

## Document End

**Status**: PENDING APPROVAL
**Next Steps**: Review, approve, and begin Sprint 1

**Questions or concerns?** Contact the development team.
