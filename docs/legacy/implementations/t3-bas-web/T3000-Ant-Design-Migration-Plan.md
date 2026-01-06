# T3000 to T3BASWeb - Ant Design Vue Migration Plan

**Date**: November 4, 2025
**Purpose**: Complete migration strategy from T3000 C++ (MFC) to T3BASWeb (Ant Design Vue)
**Status**: Technical Design

---

## Executive Summary

This document provides the complete technical migration plan for transforming the T3000 C++ MFC application into **T3BASWeb** (T3 Building Automation System Web) using **Vue 3 + Ant Design Vue + TypeScript**.

### Key Principles

1. **Preserve Layout**: Keep the exact same visual structure and navigation patterns
2. **Modern Stack**: Vue 3 Composition API + Ant Design Vue + TypeScript
3. **Incremental Migration**: Build and deploy in phases, not all at once
4. **Component Reuse**: Build 10-15 reusable components that cover 80% of use cases

---

## 1. Technology Stack

### Frontend

```json
{
  "framework": "Vue 3.3+",
  "ui-library": "Ant Design Vue 4.x",
  "language": "TypeScript 5.x",
  "state": "Pinia 2.x",
  "routing": "Vue Router 4.x",
  "charts": "Apache ECharts 5.x",
  "build": "Vite 5.x",
  "http": "Axios",
  "websocket": "Socket.IO Client"
}
```

### Backend (Existing)

- Rust API (Actix-web/Axum)
- SQLite Database
- WebSocket server
- C++ FFI for BACnet/Modbus

### Development Tools

- ESLint + Prettier
- Vitest (unit testing)
- Playwright (E2E testing)
- Storybook (component documentation)

---

## 2. MFC → Ant Design Component Mapping

### 2.1 Main Layout Components

| MFC Component | C++ Class | Ant Design Vue | Implementation Notes |
|---------------|-----------|----------------|---------------------|
| **Main Frame** | `CMainFrame` | `<a-layout>` | Root layout container |
| **Menu Bar** | `CMFCMenuBar` | `<a-menu mode="horizontal">` | Top menu with dropdowns |
| **Toolbar** | `CMFCToolBar` | `<a-space>` + `<a-button>` | Icon buttons with tooltips |
| **Left Panel** | `CWorkspaceBar` | `<a-layout-sider>` | Collapsible sidebar (300px) |
| **Tree Control** | `CImageTreeCtrl` | `<a-tree>` | Hierarchical tree with icons |
| **Central View** | `CView` subclasses | `<router-view>` | Dynamic content area |
| **Status Bar** | `CMFCStatusBar` | `<a-layout-footer>` | 4-pane status display |

### 2.2 Dialog Components

| MFC Control | C++ Class | Ant Design Vue | Use Case |
|-------------|-----------|----------------|----------|
| **Modal Dialog** | `CDialog` | `<a-modal>` | Settings, configuration |
| **Property Sheet** | `CPropertySheet` | `<a-tabs>` within modal | Tabbed settings |
| **Grid Control** | `CGridCtrl` / `CListCtrl` | `<a-table :editable>` | Data point grids |
| **Edit Box** | `CEdit` | `<a-input>` | Text input |
| **Combo Box** | `CComboBox` | `<a-select>` | Dropdown selection |
| **Check Box** | `CButton (BS_CHECKBOX)` | `<a-checkbox>` | Boolean toggle |
| **Radio Button** | `CButton (BS_RADIOBUTTON)` | `<a-radio>` | Mutually exclusive options |
| **Spin Control** | `CSpinButtonCtrl` | `<a-input-number>` | Numeric input with +/- |
| **Slider** | `CSliderCtrl` | `<a-slider>` | Range selection |
| **Progress Bar** | `CProgressCtrl` | `<a-progress>` | Operation progress |
| **Date/Time Picker** | `CDateTimeCtrl` | `<a-date-picker>` | Date/time selection |
| **Tree Control** | `CTreeCtrl` | `<a-tree>` | Hierarchical data |
| **List Control** | `CListCtrl` | `<a-list>` or `<a-table>` | Item lists |
| **Tab Control** | `CTabCtrl` | `<a-tabs>` | Tabbed interface |
| **Split Pane** | `CSplitterWnd` | `<a-layout-sider>` | Resizable panels |
| **Tooltip** | `CToolTipCtrl` | `<a-tooltip>` | Hover hints |

### 2.3 Custom Components Needed

Some MFC patterns don't have direct Ant Design equivalents and require custom components:

| Component | Purpose | Base On | Complexity |
|-----------|---------|---------|------------|
| **DataPointGrid** | Editable grid for Input/Output/Variable | `<a-table>` | HIGH |
| **ScheduleGrid** | Time slot editor with calendar | `<a-calendar>` | MEDIUM |
| **DeviceTree** | Building/device tree with status | `<a-tree>` | MEDIUM |
| **RegisterEditor** | Hex/decimal register viewer/editor | `<a-table>` | MEDIUM |
| **GraphicsCanvas** | SVG/Canvas drawing editor | HTML5 Canvas | VERY HIGH |

---

## 3. Layout Implementation

### 3.1 Main Layout Structure

```vue
<!-- src/T3BASWeb/layouts/MainLayout.vue -->
<template>
  <a-config-provider :theme="themeConfig">
    <a-layout class="t3000-main-layout">
      <!-- Header: Menu Bar + Toolbar -->
      <a-layout-header class="header">
        <div class="logo">
          <img src="@/assets/logo.png" alt="T3000" />
          <span>T3000 Building Automation</span>
        </div>

        <!-- Main Menu -->
        <a-menu
          v-model:selectedKeys="selectedMenuKeys"
          mode="horizontal"
          :items="menuItems"
          @click="onMenuClick"
        />

        <!-- Toolbar -->
        <div class="toolbar">
          <a-space>
            <a-tooltip title="Scan for devices">
              <a-button type="primary" @click="scanDevices">
                <template #icon><SearchOutlined /></template>
                Scan
              </a-button>
            </a-tooltip>

            <a-tooltip title="Connect to selected device">
              <a-button @click="connectDevice" :disabled="!selectedDevice">
                <template #icon><ApiOutlined /></template>
                Connect
              </a-button>
            </a-tooltip>

            <a-tooltip title="Disconnect from device">
              <a-button @click="disconnectDevice" :disabled="!isConnected">
                <template #icon><DisconnectOutlined /></template>
                Disconnect
              </a-button>
            </a-tooltip>

            <a-tooltip title="Refresh tree">
              <a-button @click="refreshTree">
                <template #icon><ReloadOutlined /></template>
                Refresh
              </a-button>
            </a-tooltip>

            <a-divider type="vertical" />

            <a-dropdown>
              <template #overlay>
                <a-menu>
                  <a-menu-item @click="logout">Logout</a-menu-item>
                </a-menu>
              </a-dropdown>
              <a-avatar :src="userAvatar" />
            </a-dropdown>
          </a-space>
        </div>
      </a-layout-header>

      <a-layout>
        <!-- Left Sidebar: Building/Device Tree -->
        <a-layout-sider
          v-model:collapsed="siderCollapsed"
          :width="300"
          theme="light"
          collapsible
          class="tree-sider"
        >
          <div class="sider-header">
            <h3>Building View</h3>
            <a-button
              type="text"
              size="small"
              @click="addBuilding"
            >
              <template #icon><PlusOutlined /></template>
            </a-button>
          </div>

          <a-input-search
            v-model:value="treeSearchText"
            placeholder="Search devices..."
            @search="onTreeSearch"
            class="tree-search"
          />

          <a-tree
            v-model:selectedKeys="selectedTreeKeys"
            v-model:expandedKeys="expandedTreeKeys"
            :tree-data="buildingTreeData"
            :show-icon="true"
            :show-line="true"
            @select="onTreeNodeSelect"
            @rightClick="onTreeContextMenu"
          >
            <template #icon="{ dataRef }">
              <component :is="getDeviceIcon(dataRef.deviceType)" />
            </template>

            <template #title="{ dataRef }">
              <span :class="{ 'offline': !dataRef.online }">
                {{ dataRef.title }}
              </span>
              <a-badge
                v-if="dataRef.alarmCount > 0"
                :count="dataRef.alarmCount"
                :offset="[10, 0]"
              />
            </template>
          </a-tree>
        </a-layout-sider>

        <!-- Central Content Area -->
        <a-layout-content class="main-content">
          <a-breadcrumb class="breadcrumb">
            <a-breadcrumb-item v-for="item in breadcrumbs" :key="item.path">
              <router-link :to="item.path">{{ item.name }}</router-link>
            </a-breadcrumb-item>
          </a-breadcrumb>

          <div class="content-wrapper">
            <router-view v-slot="{ Component }">
              <transition name="fade" mode="out-in">
                <keep-alive :include="cachedViews">
                  <component :is="Component" :key="currentDeviceKey" />
                </keep-alive>
              </transition>
            </router-view>
          </div>
        </a-layout-content>
      </a-layout>

      <!-- Footer: Status Bar -->
      <a-layout-footer class="status-bar">
        <a-row>
          <a-col :span="6" class="status-pane">
            <ClockCircleOutlined />
            <span>RX: {{ rxCount }} TX: {{ txCount }}</span>
          </a-col>

          <a-col :span="6" class="status-pane">
            <HomeOutlined />
            <span>{{ connectionInfo }}</span>
          </a-col>

          <a-col :span="6" class="status-pane">
            <WifiOutlined />
            <span>{{ protocolInfo }}</span>
          </a-col>

          <a-col :span="6" class="status-pane">
            <InfoCircleOutlined />
            <span>{{ statusMessage }}</span>
          </a-col>
        </a-row>
      </a-layout-footer>
    </a-layout>
  </a-config-provider>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useDeviceStore } from '@/stores/device'
import { useAuthStore } from '@/stores/auth'
import {
  SearchOutlined,
  ApiOutlined,
  DisconnectOutlined,
  ReloadOutlined,
  PlusOutlined,
  HomeOutlined,
  WifiOutlined,
  InfoCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons-vue'

const router = useRouter()
const route = useRoute()
const deviceStore = useDeviceStore()
const authStore = useAuthStore()

// State
const siderCollapsed = ref(false)
const selectedMenuKeys = ref<string[]>([])
const selectedTreeKeys = ref<string[]>([])
const expandedTreeKeys = ref<string[]>([])
const treeSearchText = ref('')

// Computed
const buildingTreeData = computed(() => deviceStore.buildingTree)
const selectedDevice = computed(() => deviceStore.selectedDevice)
const isConnected = computed(() => deviceStore.isConnected)
const rxCount = computed(() => deviceStore.rxCount)
const txCount = computed(() => deviceStore.txCount)
const connectionInfo = computed(() => deviceStore.connectionInfo)
const protocolInfo = computed(() => deviceStore.protocolInfo)
const statusMessage = computed(() => deviceStore.statusMessage)
const userAvatar = computed(() => authStore.user?.avatar)

// Menu configuration
const menuItems = [
  {
    key: 'file',
    label: 'File',
    children: [
      { key: 'new-project', label: 'New Project' },
      { key: 'open', label: 'Open' },
      { key: 'save', label: 'Save' },
      { key: 'save-config', label: 'Save Config' },
      { type: 'divider' },
      { key: 'exit', label: 'Exit' }
    ]
  },
  {
    key: 'database',
    label: 'Database',
    children: [
      { key: 'building-config', label: 'Building Config' },
      { key: 'all-nodes', label: 'All Nodes Database' },
      { key: 'user-account', label: 'User Account' },
      { key: 'bacnet-tool', label: 'BACnet Tool' }
    ]
  },
  {
    key: 'control',
    label: 'Control',
    children: [
      { key: 'inputs', label: 'Inputs' },
      { key: 'outputs', label: 'Outputs' },
      { key: 'variables', label: 'Variables' },
      { key: 'programs', label: 'Programs' },
      { key: 'schedules', label: 'Schedules' },
      { key: 'monitors', label: 'Monitors' }
    ]
  },
  {
    key: 'tools',
    label: 'Tools',
    children: [
      { key: 'scan', label: 'Scan Device' },
      { key: 'register-viewer', label: 'Register Viewer' },
      { key: 'options', label: 'Options' }
    ]
  },
  {
    key: 'view',
    label: 'View',
    children: [
      { key: 'refresh', label: 'Refresh' },
      { key: 'language', label: 'Language' }
    ]
  },
  {
    key: 'help',
    label: 'Help',
    children: [
      { key: 'documentation', label: 'Documentation' },
      { key: 'check-update', label: 'Check Update' },
      { key: 'about', label: 'About' }
    ]
  }
]

// Methods
const scanDevices = () => {
  deviceStore.scanDevices()
}

const connectDevice = () => {
  if (selectedDevice.value) {
    deviceStore.connect(selectedDevice.value.id)
  }
}

const disconnectDevice = () => {
  deviceStore.disconnect()
}

const refreshTree = () => {
  deviceStore.refreshTree()
}

const onTreeNodeSelect = (selectedKeys: string[], info: any) => {
  if (selectedKeys.length > 0) {
    const node = info.node.dataRef
    deviceStore.selectDevice(node)

    // Route to appropriate view based on device type
    router.push(`/device/${node.id}/${node.deviceType}`)
  }
}

const onMenuClick = ({ key }: { key: string }) => {
  // Handle menu actions
  switch (key) {
    case 'inputs':
      router.push(`/device/${selectedDevice.value?.id}/bacnet/inputs`)
      break
    case 'outputs':
      router.push(`/device/${selectedDevice.value?.id}/bacnet/outputs`)
      break
    // ... more cases
  }
}

const getDeviceIcon = (deviceType: string) => {
  // Return appropriate icon component based on device type
  const iconMap: Record<string, any> = {
    tstat: 'HomeOutlined',
    bacnet: 'ApiOutlined',
    io_module: 'ControlOutlined',
    sensor: 'DashboardOutlined'
  }
  return iconMap[deviceType] || 'QuestionOutlined'
}
</script>

<style lang="scss" scoped>
.t3000-main-layout {
  height: 100vh;

  .header {
    display: flex;
    align-items: center;
    background: #001529;
    padding: 0 20px;

    .logo {
      display: flex;
      align-items: center;
      margin-right: 40px;
      color: white;

      img {
        height: 32px;
        margin-right: 10px;
      }
    }

    .toolbar {
      margin-left: auto;
    }
  }

  .tree-sider {
    background: #fff;
    border-right: 1px solid #f0f0f0;

    .sider-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      border-bottom: 1px solid #f0f0f0;

      h3 {
        margin: 0;
      }
    }

    .tree-search {
      margin: 12px;
      width: calc(100% - 24px);
    }

    .offline {
      color: #999;
      text-decoration: line-through;
    }
  }

  .main-content {
    background: #f0f2f5;
    padding: 16px;
    overflow: auto;

    .breadcrumb {
      margin-bottom: 16px;
    }

    .content-wrapper {
      background: white;
      padding: 24px;
      min-height: calc(100vh - 200px);
      border-radius: 4px;
    }
  }

  .status-bar {
    background: #001529;
    color: white;
    padding: 8px 20px;

    .status-pane {
      display: flex;
      align-items: center;
      gap: 8px;
    }
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
```

### 3.2 Theme Configuration

```typescript
// src/T3BASWeb/config/theme.ts
import type { ThemeConfig } from 'ant-design-vue'

export const themeConfig: ThemeConfig = {
  token: {
    colorPrimary: '#1890ff',
    colorSuccess: '#52c41a',
    colorWarning: '#faad14',
    colorError: '#ff4d4f',
    fontSize: 14,
    borderRadius: 4,
  },
  components: {
    Layout: {
      headerBg: '#001529',
      headerHeight: 64,
      siderBg: '#ffffff',
    },
    Menu: {
      darkItemBg: '#001529',
      darkItemSelectedBg: '#1890ff',
    },
    Tree: {
      titleHeight: 28,
    },
    Table: {
      headerBg: '#fafafa',
    },
  },
}
```

---

## 4. Routing Strategy

### 4.1 Route Structure

```typescript
// src/T3BASWeb/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    children: [
      {
        path: '',
        name: 'Dashboard',
        component: () => import('@/views/Dashboard.vue'),
      },
      {
        path: 'device/:deviceId',
        component: () => import('@/layouts/DeviceLayout.vue'),
        children: [
          // Tstat devices
          {
            path: 'tstat',
            name: 'TstatView',
            component: () => import('@/views/devices/TstatView.vue'),
          },

          // BACnet devices
          {
            path: 'bacnet',
            redirect: 'bacnet/inputs',
            children: [
              {
                path: 'inputs',
                component: () => import('@/views/bacnet/InputsView.vue'),
              },
              {
                path: 'outputs',
                component: () => import('@/views/bacnet/OutputsView.vue'),
              },
              {
                path: 'variables',
                component: () => import('@/views/bacnet/VariablesView.vue'),
              },
              {
                path: 'programs',
                component: () => import('@/views/bacnet/ProgramsView.vue'),
              },
              {
                path: 'schedules',
                component: () => import('@/views/bacnet/SchedulesView.vue'),
              },
              {
                path: 'monitors',
                component: () => import('@/views/bacnet/MonitorsView.vue'),
              },
              {
                path: 'settings',
                component: () => import('@/views/bacnet/SettingsView.vue'),
              },
            ],
          },

          // I/O Modules
          {
            path: 'io-module/:moduleType',
            name: 'IOModuleView',
            component: () => import('@/views/devices/IOModuleView.vue'),
          },

          // Sensors
          {
            path: 'sensor/:sensorType',
            name: 'SensorView',
            component: () => import('@/views/devices/SensorView.vue'),
          },

          // Graphics
          {
            path: 'graphics',
            name: 'GraphicsView',
            component: () => import('@/views/graphics/GraphicsView.vue'),
          },

          // Trend Log
          {
            path: 'trendlog',
            name: 'TrendLogView',
            component: () => import('@/views/trendlog/TrendLogView.vue'),
          },
        ],
      },

      // Network view
      {
        path: 'network',
        name: 'NetworkView',
        component: () => import('@/views/network/NetworkView.vue'),
      },
    ],
  },

  // Login (outside main layout)
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/auth/LoginView.vue'),
  },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})
```

---

## 5. State Management (Pinia Stores)

### 5.1 Device Store

```typescript
// src/T3BASWeb/stores/device.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Device, BuildingTree } from '@/types'
import { deviceApi } from '@/api/device'

export const useDeviceStore = defineStore('device', () => {
  // State
  const buildingTree = ref<BuildingTree[]>([])
  const selectedDevice = ref<Device | null>(null)
  const isConnected = ref(false)
  const rxCount = ref(0)
  const txCount = ref(0)
  const statusMessage = ref('')

  // Computed
  const connectionInfo = computed(() => {
    if (!selectedDevice.value) return 'No device selected'
    return `${selectedDevice.value.buildingName} / ${selectedDevice.value.name}`
  })

  const protocolInfo = computed(() => {
    if (!selectedDevice.value) return ''
    return `${selectedDevice.value.protocol} ${selectedDevice.value.address}`
  })

  // Actions
  const fetchBuildingTree = async () => {
    const data = await deviceApi.getBuildingTree()
    buildingTree.value = data
  }

  const selectDevice = (device: Device) => {
    selectedDevice.value = device
  }

  const connect = async (deviceId: string) => {
    try {
      await deviceApi.connect(deviceId)
      isConnected.value = true
      statusMessage.value = 'Connected successfully'
    } catch (error) {
      statusMessage.value = 'Connection failed'
      throw error
    }
  }

  const disconnect = async () => {
    await deviceApi.disconnect()
    isConnected.value = false
    statusMessage.value = 'Disconnected'
  }

  const scanDevices = async () => {
    statusMessage.value = 'Scanning...'
    await deviceApi.scan()
    await fetchBuildingTree()
    statusMessage.value = 'Scan complete'
  }

  const refreshTree = async () => {
    await fetchBuildingTree()
  }

  return {
    buildingTree,
    selectedDevice,
    isConnected,
    rxCount,
    txCount,
    connectionInfo,
    protocolInfo,
    statusMessage,
    fetchBuildingTree,
    selectDevice,
    connect,
    disconnect,
    scanDevices,
    refreshTree,
  }
})
```

---

## 6. Reusable Components

### 6.1 DataPointGrid Component

```vue
<!-- src/T3BASWeb/components/DataPointGrid.vue -->
<template>
  <div class="data-point-grid">
    <a-space class="toolbar" style="margin-bottom: 16px">
      <a-button @click="handleRefresh">
        <template #icon><ReloadOutlined /></template>
        Refresh
      </a-button>
      <a-button @click="handleSave" type="primary" :loading="saving">
        <template #icon><SaveOutlined /></template>
        Save
      </a-button>
      <a-input-search
        v-model:value="searchText"
        placeholder="Search..."
        style="width: 200px"
        @search="onSearch"
      />
    </a-space>

    <a-table
      :columns="columns"
      :data-source="filteredData"
      :loading="loading"
      :scroll="{ x: 1500, y: 500 }"
      :pagination="{ pageSize: 50 }"
      bordered
      size="small"
    >
      <template #bodyCell="{ column, record, index }">
        <template v-if="column.editable">
          <a-input
            v-if="column.inputType === 'text'"
            v-model:value="record[column.dataIndex]"
            @change="onCellChange(record, column.dataIndex)"
          />

          <a-input-number
            v-else-if="column.inputType === 'number'"
            v-model:value="record[column.dataIndex]"
            @change="onCellChange(record, column.dataIndex)"
          />

          <a-select
            v-else-if="column.inputType === 'select'"
            v-model:value="record[column.dataIndex]"
            :options="column.options"
            @change="onCellChange(record, column.dataIndex)"
          />

          <a-switch
            v-else-if="column.inputType === 'switch'"
            v-model:checked="record[column.dataIndex]"
            @change="onCellChange(record, column.dataIndex)"
          />
        </template>

        <template v-else-if="column.dataIndex === 'status'">
          <a-tag :color="record.online ? 'success' : 'default'">
            {{ record.online ? 'Online' : 'Offline' }}
          </a-tag>
        </template>
      </template>
    </a-table>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { message } from 'ant-design-vue'
import { ReloadOutlined, SaveOutlined } from '@ant-design/icons-vue'

interface Props {
  pointType: 'input' | 'output' | 'variable'
  deviceId: string
}

const props = defineProps<Props>()

// State
const data = ref([])
const loading = ref(false)
const saving = ref(false)
const searchText = ref('')
const changedRecords = new Set()

// Columns configuration
const columns = computed(() => {
  // Column definitions based on pointType
  const baseColumns = [
    { title: '#', dataIndex: 'index', width: 60, fixed: 'left' },
    { title: 'Label', dataIndex: 'label', width: 150, editable: true, inputType: 'text' },
    { title: 'Value', dataIndex: 'value', width: 100, editable: true, inputType: 'number' },
    { title: 'Units', dataIndex: 'units', width: 80, editable: true, inputType: 'select',
      options: [
        { label: '°F', value: 'F' },
        { label: '°C', value: 'C' },
        { label: '%', value: 'percent' },
        // ... more units
      ]
    },
    { title: 'Auto/Manual', dataIndex: 'autoManual', width: 120, editable: true, inputType: 'switch' },
    { title: 'Range', dataIndex: 'range', width: 100, editable: true, inputType: 'select' },
    { title: 'Status', dataIndex: 'status', width: 80 },
  ]

  return baseColumns
})

// Computed
const filteredData = computed(() => {
  if (!searchText.value) return data.value
  return data.value.filter(item =>
    item.label?.toLowerCase().includes(searchText.value.toLowerCase())
  )
})

// Methods
const fetchData = async () => {
  loading.value = true
  try {
    // API call to fetch data
    const response = await fetch(`/api/device/${props.deviceId}/${props.pointType}`)
    data.value = await response.json()
  } finally {
    loading.value = false
  }
}

const handleRefresh = () => {
  fetchData()
}

const handleSave = async () => {
  saving.value = true
  try {
    // Save changed records
    const changedData = Array.from(changedRecords).map(index => data.value[index])
    await fetch(`/api/device/${props.deviceId}/${props.pointType}`, {
      method: 'PUT',
      body: JSON.stringify(changedData)
    })
    message.success('Saved successfully')
    changedRecords.clear()
  } catch (error) {
    message.error('Save failed')
  } finally {
    saving.value = false
  }
}

const onCellChange = (record: any, dataIndex: string) => {
  const index = data.value.indexOf(record)
  changedRecords.add(index)
}

const onSearch = () => {
  // Search is handled by computed filteredData
}

// Initialize
fetchData()
</script>
```

---

## 7. API Integration

### 7.1 API Client Setup

```typescript
// src/T3BASWeb/api/client.ts
import axios from 'axios'
import { message } from 'ant-design-vue'
import { useAuthStore } from '@/stores/auth'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api',
  timeout: 30000,
})

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    const authStore = useAuthStore()
    if (authStore.token) {
      config.headers.Authorization = `Bearer ${authStore.token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const errorMessage = error.response?.data?.message || 'Request failed'
    message.error(errorMessage)
    return Promise.reject(error)
  }
)
```

### 7.2 Device API

```typescript
// src/T3BASWeb/api/device.ts
import { apiClient } from './client'
import type { Device, BuildingTree } from '@/types'

export const deviceApi = {
  // Get building tree
  getBuildingTree: () =>
    apiClient.get<BuildingTree[]>('/buildings/tree'),

  // Scan for devices
  scan: (subnet?: string) =>
    apiClient.post('/devices/scan', { subnet }),

  // Connect to device
  connect: (deviceId: string) =>
    apiClient.post(`/devices/${deviceId}/connect`),

  // Disconnect from device
  disconnect: () =>
    apiClient.post('/devices/disconnect'),

  // Get device data points
  getInputs: (deviceId: string) =>
    apiClient.get(`/devices/${deviceId}/inputs`),

  getOutputs: (deviceId: string) =>
    apiClient.get(`/devices/${deviceId}/outputs`),

  getVariables: (deviceId: string) =>
    apiClient.get(`/devices/${deviceId}/variables`),

  // Update data points
  updateInputs: (deviceId: string, data: any[]) =>
    apiClient.put(`/devices/${deviceId}/inputs`, data),

  updateOutputs: (deviceId: string, data: any[]) =>
    apiClient.put(`/devices/${deviceId}/outputs`, data),

  updateVariables: (deviceId: string, data: any[]) =>
    apiClient.put(`/devices/${deviceId}/variables`, data),
}
```

---

## 8. WebSocket Real-Time Updates

```typescript
// src/T3BASWeb/services/websocket.ts
import { io, Socket } from 'socket.io-client'
import { useDeviceStore } from '@/stores/device'

class WebSocketService {
  private socket: Socket | null = null

  connect() {
    this.socket = io(import.meta.env.VITE_WS_URL || 'http://localhost:8080')

    this.socket.on('connect', () => {
      console.log('WebSocket connected')
    })

    this.socket.on('device:status', (data) => {
      const deviceStore = useDeviceStore()
      // Update device status in store
      deviceStore.updateDeviceStatus(data)
    })

    this.socket.on('device:data', (data) => {
      const deviceStore = useDeviceStore()
      // Update device data in real-time
      deviceStore.updateDeviceData(data)
    })

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected')
    })
  }

  disconnect() {
    this.socket?.disconnect()
  }

  subscribeToDevice(deviceId: string) {
    this.socket?.emit('subscribe:device', { deviceId })
  }

  unsubscribeFromDevice(deviceId: string) {
    this.socket?.emit('unsubscribe:device', { deviceId })
  }
}

export const wsService = new WebSocketService()
```

---

## 9. Project Structure

```
src/T3BASWeb/
├── api/                      # API clients
│   ├── client.ts            # Axios instance
│   ├── device.ts            # Device API
│   ├── auth.ts              # Auth API
│   └── bacnet.ts            # BACnet API
├── assets/                   # Static assets
│   ├── icons/
│   ├── images/
│   └── styles/
│       ├── main.scss
│       └── variables.scss
├── components/               # Reusable components
│   ├── DataPointGrid.vue
│   ├── DeviceTree.vue
│   ├── ScheduleGrid.vue
│   ├── RegisterEditor.vue
│   └── common/
│       ├── PageHeader.vue
│       ├── Loading.vue
│       └── ErrorBoundary.vue
├── composables/              # Composition functions
│   ├── useDevice.ts
│   ├── useWebSocket.ts
│   └── useModbus.ts
├── config/                   # Configuration
│   ├── theme.ts
│   └── constants.ts
├── layouts/                  # Layout components
│   ├── MainLayout.vue
│   ├── DeviceLayout.vue
│   └── AuthLayout.vue
├── router/                   # Vue Router
│   ├── index.ts
│   └── guards.ts
├── stores/                   # Pinia stores
│   ├── device.ts
│   ├── auth.ts
│   ├── bacnet.ts
│   └── ui.ts
├── types/                    # TypeScript types
│   ├── device.ts
│   ├── bacnet.ts
│   └── api.ts
├── utils/                    # Utility functions
│   ├── format.ts
│   ├── validation.ts
│   └── helpers.ts
├── views/                    # Page components
│   ├── Dashboard.vue
│   ├── auth/
│   │   └── LoginView.vue
│   ├── bacnet/
│   │   ├── InputsView.vue
│   │   ├── OutputsView.vue
│   │   ├── VariablesView.vue
│   │   ├── ProgramsView.vue
│   │   ├── SchedulesView.vue
│   │   ├── MonitorsView.vue
│   │   └── SettingsView.vue
│   ├── devices/
│   │   ├── TstatView.vue
│   │   ├── IOModuleView.vue
│   │   └── SensorView.vue
│   ├── graphics/
│   │   └── GraphicsView.vue
│   ├── network/
│   │   └── NetworkView.vue
│   └── trendlog/
│       └── TrendLogView.vue
├── App.vue
└── main.ts
```

---

## 10. Next Steps

### Phase 1: Foundation (Week 1-2)
1. ✅ Set up project structure
2. ✅ Install dependencies (Vue 3, Ant Design Vue, TypeScript, etc.)
3. ✅ Configure Vite build
4. ✅ Set up router and stores
5. ✅ Implement MainLayout component
6. ✅ Implement DeviceTree component
7. ✅ Set up API client

### Phase 2: Core Components (Week 3-4)
1. Build DataPointGrid component
2. Build ScheduleGrid component
3. Build RegisterEditor component
4. Set up WebSocket service
5. Implement real-time updates

### Phase 3: Views (Week 5-8)
1. Implement TstatView
2. Implement BACnet Input/Output/Variable views
3. Implement Settings view
4. Implement Monitors view
5. Implement TrendLog view

### Phase 4: Testing & Polish (Week 9-10)
1. Unit tests for components
2. E2E tests for critical flows
3. Performance optimization
4. Accessibility improvements
5. Documentation

---

**Status**: Ready for implementation
**Next Action**: Set up T3BASWeb project structure

