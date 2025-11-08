<template>
  <a-config-provider :theme="{
    token: {
      colorPrimary: '#0064c8',
      colorBgBase: '#ffffff',
      colorText: '#000000',
      colorBorder: '#d9d9d9',
    },
  }">
    <!-- Remove the modal wrapper - this is now just the chart content -->
      <!-- Top Controls Bar - Flexible Layout with Individual Item Wrapping -->
      <div class="top-controls-bar">
        <a-flex wrap="wrap" gap="small" class="controls-main-flex">
          <!-- Time Base Control -->
          <a-flex align="center" gap="small" class="control-group">
            <a-typography-text class="control-label" style="font-size: 11px;">Time Base:</a-typography-text>
            <a-dropdown placement="bottomRight">
              <a-button size="small" style="display: flex; align-items: center;">
                <span>{{ getTimeBaseLabel() }}</span>
                <DownOutlined style="margin-left: 4px;" />
              </a-button>
              <template #overlay>
                <a-menu @click="handleTimeBaseMenu" class="timebase-dropdown-menu">
                  <a-menu-item key="5m">5 minutes</a-menu-item>
                  <a-menu-item key="10m">10 minutes</a-menu-item>
                  <a-menu-item key="30m">30 minutes</a-menu-item>
                  <a-menu-item key="1h">1 hour</a-menu-item>
                  <a-menu-item key="4h">4 hours</a-menu-item>
                  <a-menu-item key="12h">12 hours</a-menu-item>
                  <a-menu-item key="1d">1 day</a-menu-item>
                  <a-menu-item key="4d">4 days</a-menu-item>
                  <a-menu-divider />
                  <a-menu-item key="custom">Custom Define</a-menu-item>
                </a-menu>
              </template>
            </a-dropdown>
          </a-flex>

          <!-- Navigation Arrows -->
          <a-flex align="center" class="control-group">
            <a-button-group size="small">
              <a-button @click="moveTimeLeft" :disabled="isRealTime">
                <template #icon>
                  <LeftOutlined />
                </template>
              </a-button>
              <a-button @click="moveTimeRight" :disabled="isRealTime">
                <template #icon>
                  <RightOutlined />
                </template>
              </a-button>
            </a-button-group>
          </a-flex>

          <!-- Zoom Controls -->
          <a-flex align="center" class="control-group">
            <a-button-group size="small">
              <a-button @click="zoomOut" :disabled="!canZoomOut" title="Zoom Out (Longer timebase)"
                        style="display: flex; align-items: center; gap: 2px;">
                <ZoomOutOutlined />
                <span>Zoom Out</span>
              </a-button>
              <a-button @click="zoomIn" :disabled="!canZoomIn" title="Zoom In (Shorter timebase)"
                        style="display: flex; align-items: center; gap: 2px;">
                <ZoomInOutlined />
                <span>Zoom In</span>
              </a-button>
            </a-button-group>
          </a-flex>

          <!-- Reset Button -->
          <a-flex align="center" class="control-group">
            <a-button @click="resetToDefaultTimebase" size="small" title="Reset to default 5 minutes timebase"
                      style="display: flex; align-items: center; gap: 2px;">
              <ReloadOutlined />
              <span>Reset</span>
            </a-button>
          </a-flex>

          <!-- View Buttons -->
          <a-flex align="center" class="control-group">
            <a-button-group size="small">
              <a-button :type="currentView === 1 ? 'primary' : 'default'" @click="setView(1)">
                View 1
              </a-button>
              <a-button :type="currentView === 2 ? 'primary' : 'default'" @click="setView(2)">
                View 2
              </a-button>
              <a-button :type="currentView === 3 ? 'primary' : 'default'" @click="setView(3)">
                View 3
              </a-button>
            </a-button-group>
          </a-flex>

          <!-- Status Tags -->
          <a-flex align="center" wrap="wrap" gap="small" class="control-group status-tags">
            <!-- FFI API Status Indicator -->
            <a-tag v-if="ffiApi.isLoading.value" color="processing" size="small">
              <template #icon>
                <LoadingOutlined />
              </template>
              FFI API Loading...
            </a-tag>
            <a-tag v-else-if="ffiApi.hasError.value" color="error" size="small">
              <template #icon>
                <DisconnectOutlined />
              </template>
              FFI API Error
            </a-tag>
            <a-tag v-else color="success" size="small">
              <template #icon>
                <WifiOutlined />
              </template>
              FFI API Ready
            </a-tag>

            <!-- Live/Historical Status with enhanced info -->
            <a-tag color="green" v-if="isRealTime" size="small">
              <template #icon>
                <SyncOutlined :spin="true" />
              </template>
              Live - {{ lastSyncTime }}
            </a-tag>
            <a-tag color="blue" v-else size="small">
              <template #icon>
                <ClockCircleOutlined />
              </template>
              Historical
            </a-tag>

            <!-- Range Info -->
            <a-tag size="small">{{ timeBase === 'custom' ? 'Custom' : timeBaseLabel }}</a-tag>
          </a-flex>

          <!-- Chart Options -->
          <a-flex align="center" class="control-group chart-options">
            <a-dropdown placement="bottomRight">
              <a-button size="small" style="display: flex; align-items: center;">
                <SettingOutlined style="margin-right: 4px;" />
                <span>Chart</span>
                <DownOutlined style="margin-left: 4px;" />
              </a-button>
              <template #overlay>
                <a-menu class="chart-options-menu" @click="handleChartOptionsMenu">
                  <a-menu-item key="grid">
                    <a-checkbox v-model:checked="showGrid" style="margin-right: 8px;" />
                    Show Grid
                  </a-menu-item>
                  <a-menu-item key="legend">
                    <a-checkbox v-model:checked="showLegend" style="margin-right: 8px;" />
                    Show Legend
                  </a-menu-item>
                  <a-menu-item key="smooth">
                    <a-checkbox v-model:checked="smoothLines" style="margin-right: 8px;" />
                    Smooth Lines
                  </a-menu-item>
                  <a-menu-item key="points">
                    <a-checkbox v-model:checked="showPoints" style="margin-right: 8px;" />
                    Show Points
                  </a-menu-item>
                  <a-menu-divider />
                  <a-menu-item key="reset">
                    <ReloadOutlined />
                    Reset to Default
                  </a-menu-item>
                </a-menu>
              </template>
            </a-dropdown>
          </a-flex>

          <!-- Export Options -->
          <a-flex align="center" class="control-group export-options">
            <a-dropdown placement="bottomRight">
              <a-button size="small" style="display: flex; align-items: center;">
                <ExportOutlined style="margin-right: 4px;" />
                <span>Export</span>
                <DownOutlined style="margin-left: 4px;" />
              </a-button>
              <template #overlay>
                <a-menu class="export-options-menu" @click="handleExportMenu">
                  <a-menu-item key="png">
                    <FileImageOutlined />
                    Export as PNG
                  </a-menu-item>
                  <a-menu-item key="jpg">
                    <FileImageOutlined />
                    Export as JPG
                  </a-menu-item>
                  <a-menu-divider />
                  <a-menu-item key="csv">
                    <FileExcelOutlined />
                    Export Data (CSV)
                  </a-menu-item>
                  <a-menu-item key="json">
                    <FileTextOutlined />
                    Export Data (JSON)
                  </a-menu-item>
                </a-menu>
              </template>
            </a-dropdown>
          </a-flex>
        </a-flex>
      </div>

      <div class="timeseries-container"> <!-- Left Panel: Data Series and Options -->
        <div class="left-panel">
          <!-- Data Series -->
          <div class="control-section">
            <div class="data-series-header">
              <!-- Line 1: Title with modal title and series count -->
              <div class="header-line-1">
                <h7>{{ chartTitle }} - Data Series ({{ visibleSeriesCount }}/{{ dataSeries.length }})</h7>
              </div>

              <!-- Line 2: All dropdown, By Type dropdown, Auto Scroll toggle -->
              <div class="header-line-2">
                <a-dropdown>
                  <a-button size="small" style="display: flex; align-items: center;">
                    <span>All</span>
                    <DownOutlined style="margin-left: 4px;" />
                  </a-button>
                  <template #overlay>
                    <a-menu @click="handleAllMenu" class="all-dropdown-menu">
                      <a-menu-item key="enable-all" :disabled="!hasDisabledSeries">
                        <CheckOutlined />
                        Enable All
                      </a-menu-item>
                      <a-menu-item key="disable-all" :disabled="!hasEnabledSeries">
                        <DisconnectOutlined />
                        Disable All
                      </a-menu-item>
                    </a-menu>
                  </template>
                </a-dropdown>
                <a-dropdown>
                  <a-button size="small" style="display: flex; align-items: center;">
                    <span>By Type</span>
                    <DownOutlined style="margin-left: 4px;" />
                  </a-button>
                  <template #overlay>
                    <a-menu @click="handleByTypeMenu" class="bytype-dropdown-menu">
                      <a-menu-item key="toggle-analog" :disabled="!hasAnalogSeries">
                        <LineChartOutlined />
                        {{ allAnalogEnabled ? 'Disable' : 'Enable' }} Analog ({{ analogCount }})
                      </a-menu-item>
                      <a-menu-item key="toggle-digital" :disabled="!hasDigitalSeries">
                        <BarChartOutlined />
                        {{ allDigitalEnabled ? 'Disable' : 'Enable' }} Digital ({{ digitalCount }})
                      </a-menu-item>
                    </a-menu>
                  </template>
                </a-dropdown>
                <div class="auto-scroll-toggle">
                  <a-typography-text class="toggle-label">Auto Scroll:</a-typography-text>
                  <a-switch v-model:checked="isRealTime" size="small" checked-children="On" un-checked-children="Off"
                    @change="onRealTimeToggle" />
                </div>
              </div>
            </div>
            <div class="series-list">
              <!-- Empty state when no data series available -->
              <div v-if="dataSeries.length === 0" class="series-empty-state">
                <div class="empty-state-content">
                  <div class="empty-state-icon">📊</div>
                  <div class="empty-state-text">No trend log data available</div>
                  <div class="empty-state-subtitle">Configure monitor points to see data series</div>
                </div>
              </div>

              <!-- Regular series list when data is available -->
              <div v-for="(series, index) in dataSeries" :key="series.name" class="series-item" :class="{
                'series-disabled': !series.visible
              }">
                <div class="series-header" @click="toggleSeriesVisibility(index, $event)">
                  <div class="series-toggle-indicator"
                       :class="{ 'active': series.visible, 'inactive': !series.visible }"
                       :style="{ backgroundColor: series.visible ? series.color : '#d9d9d9' }">
                    <div class="toggle-inner" :class="{ 'visible': series.visible }"></div>
                  </div>
                  <div class="series-info">
                    <div class="series-name-line">
                      <div class="series-name-container">
                        <span class="series-name">{{ getSeriesNameText(series) }}</span>
                        <q-chip
                          v-if="series.prefix"
                          :label="getChipLabelText(series.prefix)"
                          color="grey-4"
                          text-color="grey-8"
                          size="xs"
                          dense
                          class="series-prefix-tag-small"
                        />
                        <!-- Series name processed with dedicated function, chip placed after -->
                      </div>
                      <span class="series-inline-tags">
                        <!-- <a-tag size="small" :color="series.unitType === 'digital' ? 'blue' : 'green'">
                          {{ series.itemType }}
                        </a-tag> -->
                        <span class="unit-info">{{ series.unit }}</span>
                      </span>
                    </div>
                  </div>
                  <div class="series-controls">
                    <a-button size="small" type="text" class="expand-toggle"
                      @click="(e) => toggleSeriesExpansion(index, e)">
                      <template #icon>
                        <DownOutlined v-if="expandedSeries.has(index)" class="expand-icon expanded" />
                        <RightOutlined v-else class="expand-icon" />
                      </template>
                    </a-button>
                  </div>
                </div>
                <div v-if="expandedSeries.has(index)" class="series-stats">
                  <div class="stat-item">
                    <span class="stat-label">Last:</span>
                    <span class="stat-value">{{ getLastValue(series.data, series) }}</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">Avg:</span>
                    <span class="stat-value">{{ getAverageValue(series.data, series) }}</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">Min:</span>
                    <span class="stat-value">{{ getMinValue(series.data, series) }}</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">Max:</span>
                    <span class="stat-value">{{ getMaxValue(series.data, series) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Panel: Chart -->
        <div class="right-panel">
          <div class="chart-container" ref="chartContainer">
            <canvas ref="chartCanvas" class="chart-canvas"></canvas>
          </div>
        </div>
      </div>

      <!-- Loading overlay -->
      <div v-if="isLoading" class="loading-overlay">
        <a-spin size="large" />
        <div class="loading-text">Loading trend log data...</div>
      </div>

    <!-- Custom Date Range Modal -->
    <a-modal v-model:visible="customDateModalVisible" title="X Axis" :width="320" centered
             @ok="applyCustomDateRange" @cancel="cancelCustomDateRange">
      <div class="custom-date-modal">
        <!-- Start Time Row -->
        <a-row :gutter="8" class="date-time-row">
          <a-col :span="4" class="label-col">
            <label class="time-label">Start:</label>
          </a-col>
          <a-col :span="11">
            <a-date-picker v-model:value="customStartDate" placeholder="Date" size="small"
                          style="width: 100%; font-size: 11px;" format="DD/MM/YYYY" />
          </a-col>
          <a-col :span="9">
            <a-time-picker v-model:value="customStartTime" placeholder="Time" size="small"
                          style="width: 100%; font-size: 11px;" format="HH:mm" />
          </a-col>
        </a-row>

        <!-- End Time Row -->
        <a-row :gutter="8" class="date-time-row">
          <a-col :span="4" class="label-col">
            <label class="time-label">End:</label>
          </a-col>
          <a-col :span="11">
            <a-date-picker v-model:value="customEndDate" placeholder="Date" size="small"
                          style="width: 100%; font-size: 11px;" format="DD/MM/YYYY" />
          </a-col>
          <a-col :span="9">
            <a-time-picker v-model:value="customEndTime" placeholder="Time" size="small"
                          style="width: 100%; font-size: 11px;" format="HH:mm" />
          </a-col>
        </a-row>

        <!-- Quick Actions -->
        <div class="quick-actions">
          <a-space size="small">
            <a-button size="small" @click="setQuickRange('today')">Today</a-button>
            <a-button size="small" @click="setQuickRange('yesterday')">Yesterday</a-button>
            <a-button size="small" @click="setQuickRange('thisWeek')">This Week</a-button>
            <a-button size="small" @click="setQuickRange('lastWeek')">Last Week</a-button>
          </a-space>
        </div>

        <!-- Range Summary -->
        <div v-if="customStartDate && customEndDate && customStartTime && customEndTime" class="range-summary">
          <a-alert type="info" show-icon size="small">
            <template #message>
              <span class="range-text">{{ formatDateTimeRange() }}</span>
            </template>
          </a-alert>
        </div>
      </div>
    </a-modal>
  </a-config-provider>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { message, notification } from 'ant-design-vue'
import dayjs, { type Dayjs } from 'dayjs'
import Chart from 'chart.js/auto'
import 'chartjs-adapter-date-fns'
import {
  LeftOutlined,
  RightOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  ReloadOutlined,
  SyncOutlined,
  DownloadOutlined,
  FileExcelOutlined,
  DownOutlined,
  SettingOutlined,
  ExportOutlined,
  FileImageOutlined,
  FileOutlined,
  FileTextOutlined,
  CheckOutlined,
  DisconnectOutlined,
  LineChartOutlined,
  BarChartOutlined,
  ClockCircleOutlined,
  WifiOutlined,
  LoadingOutlined
} from '@ant-design/icons-vue'
// LogUtil replacement for FFI API version
const LogUtil = {
  Info: console.log,
  Debug: console.log,
  Warn: console.warn,
  Error: console.error
}
// Temporary scheduleItemData replacement
const scheduleItemData = { value: null }
// Temporary T3000_Data replacement
const T3000_Data = {
  value: {
    panelsData: [] as any[],
    panelsList: [] as any[]
  }
}

// FFI API SPECIFIC: Replace WebSocket imports with FFI API imports
import { useT3000FfiApi } from '@/lib/vue/T3000/Hvac/Opt/FFI/T3000FfiApi'
// Remove WebViewClient and Hvac dependencies for FFI API version
// import WebViewClient from '@/lib/vue/T3000/Hvac/Opt/Webview2/WebViewClient'
// import Hvac from '@/lib/vue/T3000/Hvac/Hvac'
// import { t3000DataManager, DataReadiness, type DataValidationResult } from '@/lib/vue/T3000/Hvac/Data/Manager/T3000DataManager'

// Unit Type Mappings for T3000 (Updated to match T3000.rc definitions exactly)
const DIGITAL_UNITS = {
  0: { label: 'No Units', states: ['', ''] as [string, string] },
  1: { label: 'Off/On', states: ['Off', 'On'] as [string, string] },
  2: { label: 'Close/Open', states: ['Close', 'Open'] as [string, string] },
  3: { label: 'Stop/Start', states: ['Stop', 'Start'] as [string, string] },
  4: { label: 'Disable/Enable', states: ['Disable', 'Enable'] as [string, string] },
  5: { label: 'Normal/Alarm', states: ['Normal', 'Alarm'] as [string, string] },
  6: { label: 'Normal/High', states: ['Normal', 'High'] as [string, string] },
  7: { label: 'Normal/Low', states: ['Normal', 'Low'] as [string, string] },
  8: { label: 'No/Yes', states: ['No', 'Yes'] as [string, string] },
  9: { label: 'Cool/Heat', states: ['Cool', 'Heat'] as [string, string] },
  10: { label: 'Unoccupy/Occupy', states: ['Unoccupy', 'Occupy'] as [string, string] },
  11: { label: 'Low/High', states: ['Low', 'High'] as [string, string] },
  12: { label: 'On/Off', states: ['On', 'Off'] as [string, string] },
  13: { label: 'Open/Close', states: ['Open', 'Close'] as [string, string] },
  14: { label: 'Start/Stop', states: ['Start', 'Stop'] as [string, string] },
  15: { label: 'Enable/Disable', states: ['Enable', 'Disable'] as [string, string] },
  16: { label: 'Alarm/Normal', states: ['Alarm', 'Normal'] as [string, string] },
  17: { label: 'High/Normal', states: ['High', 'Normal'] as [string, string] },
  18: { label: 'Low/Normal', states: ['Low', 'Normal'] as [string, string] },
  19: { label: 'Yes/No', states: ['Yes', 'No'] as [string, string] },
  20: { label: 'Heat/Cool', states: ['Heat', 'Cool'] as [string, string] },
  21: { label: 'Occupy/Unoccupy', states: ['Occupy', 'Unoccupy'] as [string, string] },
  22: { label: 'High/Low', states: ['High', 'Low'] as [string, string] }
} as const

const ANALOG_UNITS = {
  0: { label: 'Unused', symbol: '' },
  31: { label: 'deg.Celsius', symbol: '°C' },
  32: { label: 'deg.Fahrenheit', symbol: '°F' },
  33: { label: 'Feet per Min', symbol: 'ft/min' },
  34: { label: 'Pascals', symbol: 'Pa' },
  35: { label: 'KPascals', symbol: 'kPa' },
  36: { label: 'lbs/sqr.inch', symbol: 'psi' },
  37: { label: 'inches of WC', symbol: 'inWC' },
  38: { label: 'Watts', symbol: 'W' },
  39: { label: 'KWatts', symbol: 'kW' },
  40: { label: 'KWH', symbol: 'kWh' },
  41: { label: 'Volts', symbol: 'V' },
  42: { label: 'KV', symbol: 'kV' },
  43: { label: 'Amps', symbol: 'A' },
  44: { label: 'ma', symbol: 'mA' },
  45: { label: 'CFM', symbol: 'CFM' },
  46: { label: 'Seconds', symbol: 's' },
  47: { label: 'Minutes', symbol: 'min' },
  48: { label: 'Hours', symbol: 'h' },
  49: { label: 'Days', symbol: 'days' },
  50: { label: 'Time', symbol: 'time' },
  51: { label: 'Ohms', symbol: 'Ω' },
  52: { label: '%', symbol: '%' },
  53: { label: '%RH', symbol: '%RH' },
  54: { label: 'p/min', symbol: 'p/min' },
  55: { label: 'Counts', symbol: 'counts' },
  56: { label: '%Open', symbol: '%Open' },
  57: { label: 'Kg', symbol: 'kg' },
  58: { label: 'L/Hour', symbol: 'L/h' },
  59: { label: 'GPH', symbol: 'GPH' },
  60: { label: 'GAL', symbol: 'gal' },
  61: { label: 'CF', symbol: 'ft³' },
  62: { label: 'BTU', symbol: 'BTU' },
  63: { label: 'CMH', symbol: 'm³/h' },
  // Extended units for input-specific ranges (from T3000.rc analysis)
  100: { label: '0-5V', symbol: 'V' },
  101: { label: '0-100A', symbol: 'A' },
  102: { label: '4-20mA', symbol: 'mA' },
  103: { label: '0-20psi', symbol: 'psi' },
  104: { label: 'Pulse(1Hz)', symbol: 'pulses' },
  105: { label: '0-100%(0-10V)', symbol: '%' },
  106: { label: '0-100%(0-5V)', symbol: '%' },
  107: { label: '0-100%(4-20mA)', symbol: '%' },
  108: { label: '0-10V', symbol: 'V' },
  109: { label: 'Table1', symbol: '' },
  110: { label: 'Table2', symbol: '' },
  111: { label: 'Table3', symbol: '' },
  112: { label: 'Table4', symbol: '' },
  113: { label: 'Table5', symbol: '' },
  114: { label: 'Pulse(100Hz)', symbol: 'pulses' },
  115: { label: 'Hz', symbol: 'Hz' },
  116: { label: 'Humidity%', symbol: '%RH' },
  117: { label: 'CO2 PPM', symbol: 'ppm' },
  118: { label: 'RPM', symbol: 'rpm' },
  119: { label: 'TVOC PPB', symbol: 'ppb' },
  120: { label: 'ug/m3', symbol: 'μg/m³' },
  121: { label: '#/cm3', symbol: '#/cm³' },
  122: { label: 'dB', symbol: 'dB' },
  123: { label: 'Lux', symbol: 'lx' }
} as const

// Helper function to get unit info (Updated for T3000.rc compatibility)
const getUnitInfo = (unitCode: number) => {
  if (unitCode >= 0 && unitCode <= 22) {
    return {
      type: 'digital' as const,
      info: DIGITAL_UNITS[unitCode as keyof typeof DIGITAL_UNITS]
    }
  } else if ((unitCode >= 31 && unitCode <= 63) || (unitCode >= 100 && unitCode <= 123)) {
    return {
      type: 'analog' as const,
      info: ANALOG_UNITS[unitCode as keyof typeof ANALOG_UNITS]
    }
  }
  return {
    type: 'analog' as const,
    info: { label: '', symbol: '' }
  }
}

// Types
interface DataPoint {
  timestamp: number
  value: number
}

interface SeriesConfig {
  name: string
  color: string
  data: DataPoint[]
  visible: boolean
  unit?: string
  isEmpty?: boolean
  unitType: 'digital' | 'analog'      // NEW: Type of data (digital binary or analog continuous)
  unitCode: number                    // NEW: Unit code from T3000 (1-22 digital, 31-63 analog)
  digitalStates?: [string, string]   // NEW: State labels for digital units ['Low', 'High']
  itemType?: string                  // NEW: T3000 item type (VAR, Input, Output, HOL, etc.)
  prefix?: string                    // NEW: Category prefix (IN, OUT, VAR, etc.)
  description?: string               // NEW: Device description
}

/**
 * Map T3000 point types to readable names and determine data characteristics
 */
const getPointTypeInfo = (pointType: number) => {
  const pointTypeMap = {
    1: { name: 'Output', type: 'digital', category: 'OUT' },
    2: { name: 'Input', type: 'analog', category: 'IN' },
    3: { name: 'Variable', type: 'analog', category: 'VAR' },
    4: { name: 'Program', type: 'digital', category: 'PRG' },
    5: { name: 'Controller', type: 'analog', category: 'CON' },
    6: { name: 'Screen', type: 'digital', category: 'SCR' },
    7: { name: 'Holiday', type: 'digital', category: 'HOL' },
    8: { name: 'Schedule', type: 'digital', category: 'SCH' },
    9: { name: 'Monitor', type: 'analog', category: 'MON' }
  }

  return pointTypeMap[pointType] || { name: `Type_${pointType}`, type: 'analog', category: '' }
}

// Function to generate chip label text for series prefix display
const getChipLabelText = (prefix: string): string => {
  // Currently returns the prefix as-is (IN, OUT, VAR, etc.)
  // This function can be extended later to implement other logic
  return prefix
}

// Function to process series names for display in the 14 items list
const getSeriesNameText = (series: SeriesConfig): string => {
  // Currently returns the series description or name as-is
  // This function can be extended later to implement other logic for series name display
  return series.description || series.name
}

interface Props {
  itemData?: any
  title?: string
}

const props = withDefaults(defineProps<Props>(), {
  itemData: null,
  title: 'Trend Log Chart'
})

// FFI API SPECIFIC: Initialize FFI API composable for WebSocket replacement
const ffiApi = useT3000FfiApi()

// Computed property to get the current item data - prioritizes props over global state
const currentItemData = computed(() => {
  const data = props.itemData || scheduleItemData.value
  LogUtil.Debug('TrendLogChart: Using item data source:', {
    usingPropsItemData: !!props.itemData,
    usingGlobalScheduleData: !props.itemData,
    hasData: !!data,
    t3EntryId: (data as any)?.t3Entry?.id,
    t3EntryPid: (data as any)?.t3Entry?.pid
  })
  return data
})

// Remove modal-specific emits since this is now just a chart component

// New reactive variables for top controls
const timeBase = ref('5m')
const currentView = ref(1)
const zoomLevel = ref(1)
const customStartDate = ref<Dayjs | null>(null)
const customEndDate = ref<Dayjs | null>(null)
const customStartTime = ref<Dayjs | null>(null)
const customEndTime = ref<Dayjs | null>(null)
const customDateModalVisible = ref(false)
const isRealTime = ref(true)

// Dynamic interval calculation based on T3000 monitorConfig
const calculateT3000Interval = (monitorConfig: any): number => {
  if (!monitorConfig) {
    LogUtil.Warn('📊 TrendLogModal: No monitorConfig available, using default 60s interval')
    return 60000 // Default fallback: 1 minute
  }

  LogUtil.Info('🔍 TrendLogModal: Raw monitorConfig received:', monitorConfig)

  const {
    hour_interval_time = 0,
    minute_interval_time = 0,  // Default to 0, let T3000 config override
    second_interval_time = 0
  } = monitorConfig

  // Convert to milliseconds
  const totalSeconds = (hour_interval_time * 3600) +
                      (minute_interval_time * 60) +
                      second_interval_time

  // If no intervals specified at all, default to 1 minute, otherwise use calculated value
  const intervalMs = totalSeconds > 0
    ? Math.max(totalSeconds * 1000, 15000)  // Minimum 15 seconds
    : 60000  // Default 1 minute if all intervals are 0

  LogUtil.Info('🔄 TrendLogModal: Calculated T3000 interval:', {
    hour_interval_time,
    minute_interval_time,
    second_interval_time,
    totalSeconds,
    intervalMs,
    intervalMinutes: intervalMs / 60000
  })

  return intervalMs
}

// Dynamic update interval based on T3000 configuration
const updateInterval = computed(() => {
  return calculateT3000Interval(monitorConfig.value)
})

const isLoading = ref(false)
const showGrid = ref(true)
const showLegend = ref(false)  // Hide legend by default to give more space to chart
const smoothLines = ref(false)
const showPoints = ref(false)
const lastSyncTime = ref('No data synced yet')

// Reactive monitor configuration
const monitorConfig = ref(null as any)

// Connection and status tracking
const connectionStatus = ref<'connected' | 'connecting' | 'disconnected'>('connected')

// View switch alert state
const viewAlert = ref({
  visible: false,
  message: ''
})

// Series detail expansion state
const expandedSeries = ref<Set<number>>(new Set())


// Helper: Get device description from T3000_Data.value.panelsData
const getDeviceDescription = (panelId: number, pointType: number, pointNumber: number): string => {
  const panelsData = T3000_Data.value.panelsData
  if (!panelsData || !Array.isArray(panelsData)) return ''
  const pointTypeInfo = getPointTypeInfo(pointType)
  if (!pointTypeInfo || !pointTypeInfo.category) return ''
  const idToFind = `${pointTypeInfo.category}${pointNumber+1}` // Adjusted to match T3000.rc format
  const device = panelsData.find(
    (d: any) => String(d.pid) === String(panelId) && d.id === idToFind
  )
  return device?.description || ''
}

// Chart data - T3000 mixed digital/analog series (always 14 items)
const generateDataSeries = (): SeriesConfig[] => {
  // Check if we have real input data from t3Entry
  const hasInputData = props.itemData?.t3Entry?.input &&
                      Array.isArray(props.itemData.t3Entry.input) &&
                      props.itemData.t3Entry.input.length > 0

  const hasRangeData = props.itemData?.t3Entry?.range &&
                      Array.isArray(props.itemData.t3Entry.range) &&
                      props.itemData.t3Entry.range.length > 0

  // If no real input data, return empty array to show empty list
  if (!hasInputData || !hasRangeData) {
    LogUtil.Info('🔍 TrendLogChart: No real input data found, showing empty list')
    return []
  }

  const inputData = props.itemData.t3Entry.input
  const rangeData = props.itemData.t3Entry.range
  const actualItemCount = Math.min(inputData.length, rangeData.length)

  // Additional check: if actualItemCount is 0, return empty array
  if (actualItemCount === 0) {
    LogUtil.Info('🔍 TrendLogChart: No valid input items found, showing empty list')
    return []
  }

  LogUtil.Info(`🔍 TrendLogChart: Generating series for ${actualItemCount} real input items`)

  const colors = [
    '#FF0000', // Bright Red
    '#0000FF', // Pure Blue
    '#00AA00', // Pure Green
    '#FF8000', // Orange
    '#AA00AA', // Magenta
    '#00AAAA', // Cyan
    '#FFFF00', // Yellow
    '#AA0000', // Dark Red
    '#0066AA', // Steel Blue
    '#AA6600', // Brown/Orange
    '#6600AA', // Purple
    '#006600', // Dark Green
    '#FF6600', // Red-Orange
    '#0000AA', // Navy Blue
  ]

  return Array.from({ length: actualItemCount }, (_, index) => {
    const inputItem = inputData[index]
    const rangeValue = rangeData[index]

    // Use actual data from input item
    const panelId = inputItem.panel || 2
    const pointType = inputItem.point_type || 3
    const pointNumber = inputItem.point_number || index

    // Determine unit type based on range value: 0 = analog, 1 = digital
    const isDigital = rangeValue === 1
    const unitType: 'digital' | 'analog' = isDigital ? 'digital' : 'analog'

    let unit: string
    let digitalStates: [string, string] | undefined

    if (isDigital) {
      unit = ''
      digitalStates = ['Low', 'High'] // Default digital states
    } else {
      unit = '' // Will be determined based on context
      digitalStates = undefined
    }

    // Get point type info for prefix and description
    const pointTypeInfo = getPointTypeInfo(pointType)
    const description = getDeviceDescription(panelId, pointType, pointNumber)

    // Create clean description for tooltips
    const cleanDescription = description ? `${pointTypeInfo.category} - ${description}` : `${pointTypeInfo.category}${pointNumber + 1}`

    // Generate item type format: panelId + itemType + pointNumber
    const itemTypeMap: { [key: number]: string } = {
      1: 'Output',
      2: 'Input',
      3: 'VAR',
      7: 'HOL'
    }
    const itemTypeName = itemTypeMap[pointType] || 'VAR'
    const formattedItemType = `${panelId}${itemTypeName}${pointNumber + 1}`

    // Generate series name based on actual data
    const seriesName = `BMC01E1E-${index + 1}P${panelId}B`

    return {
      name: seriesName,
      color: colors[index % colors.length],
      data: [],
      visible: true, // All real data series are visible by default
      unit: unit,
      isEmpty: false, // Real data is never empty
      unitType: unitType,
      unitCode: rangeValue, // Store the range value (0 or 1)
      digitalStates: digitalStates,
      itemType: formattedItemType,
      prefix: pointTypeInfo.category, // Add prefix from category
      description: cleanDescription
    }
  })
}

const dataSeries = ref<SeriesConfig[]>(generateDataSeries())

// Get internal interval value from props - combine minute and second intervals
const getInternalIntervalSeconds = (): number => {
  const minuteInterval = props.itemData?.t3Entry?.minute_interval_time || 0
  const secondInterval = props.itemData?.t3Entry?.second_interval_time || 0

  // Calculate total interval: minute_interval_time * 60 + second_interval_time
  const totalIntervalSeconds = minuteInterval * 60 + secondInterval

  if (totalIntervalSeconds > 0) {
    return totalIntervalSeconds
  } else {
    // Default fallback - convert timebase minutes to seconds
    return getDataPointInterval(timeBase.value) * 60
  }
}

// Round interval to standard values for x-axis labels (input/output in seconds)
const getRoundedIntervalSeconds = (intervalSec: number): number => {
  if (intervalSec <= 5) return 5
  if (intervalSec <= 10) return 10
  if (intervalSec <= 15) return 15
  if (intervalSec <= 20) return 20
  if (intervalSec <= 30) return 30
  if (intervalSec <= 60) return 60

  // For larger intervals, convert to minutes and round
  const minutes = intervalSec / 60
  if (minutes <= 5) return 5 * 60
  if (minutes <= 10) return 10 * 60
  if (minutes <= 15) return 15 * 60
  if (minutes <= 20) return 20 * 60
  if (minutes <= 30) return 30 * 60

  // Round to nearest hour
  const hours = Math.round(minutes / 60)
  return hours * 60 * 60
}

// Get x-axis tick configuration based on timebase
const getXAxisTickConfig = (timeBase: string) => {
  const configs = {
    '5m': { stepMinutes: 1, unit: 'minute' },     // Every 1 minute
    '10m': { stepMinutes: 2, unit: 'minute' },    // Every 2 minutes
    '30m': { stepMinutes: 5, unit: 'minute' },    // Every 5 minutes
    '1h': { stepMinutes: 10, unit: 'minute' },    // Every 10 minutes
    '4h': { stepMinutes: 30, unit: 'minute' },    // Every 30 minutes
    '12h': { stepMinutes: 60, unit: 'hour' },     // Every 1 hour (60 minutes)
    '1d': { stepMinutes: 120, unit: 'hour' },     // Every 2 hours (120 minutes)
    '4d': { stepMinutes: 480, unit: 'hour' }      // Every 8 hours (480 minutes)
  }

  return configs[timeBase] || { stepMinutes: 10, unit: 'minute' }
}

// Get proper display format based on time range
const getDisplayFormat = (timeBase: string): string => {
  // Always show date + time for all timebases
  return 'dd/MM HH:mm'
}

// Handle custom timebase case - divide into 12 ticks with better distribution
const getCustomTickConfig = (customStartDate: Date, customEndDate: Date) => {
  const totalMinutes = Math.floor((customEndDate.getTime() - customStartDate.getTime()) / (1000 * 60))

  // Use fewer ticks for better readability and ensure we don't overcrowd the axis
  const maxTicks = 10
  const tickIntervalMinutes = Math.ceil(totalMinutes / maxTicks)

  // Determine appropriate unit based on interval
  let unit: 'minute' | 'hour'
  let stepSize: number
  let displayFormat: string

  if (tickIntervalMinutes < 60) {
    unit = 'minute'
    stepSize = tickIntervalMinutes
    displayFormat = 'dd/MM HH:mm'
  } else {
    unit = 'hour'
    stepSize = Math.ceil(tickIntervalMinutes / 60)
    displayFormat = 'dd/MM HH:mm' // Always show date + time
  }

  return { unit, stepSize, displayFormat, maxTicks }
}

// Debug function to verify data generation intervals
const debugDataIntervals = () => {
  const visibleSeries = dataSeries.value.filter(series => series.visible)
  if (visibleSeries.length === 0) return

  console.log('=== DATA INTERVAL DEBUG ===')
  console.log(`Expected interval: ${getInternalIntervalSeconds()} seconds`)
  console.log(`TimeBase: ${timeBase.value}`)

  visibleSeries.forEach((series, index) => {
    if (series.data.length < 2) return

    const intervals: number[] = []
    for (let i = 1; i < Math.min(series.data.length, 6); i++) { // Check first 5 intervals
      const timeDiff = series.data[i].timestamp - series.data[i-1].timestamp
      const intervalSec = timeDiff / 1000
      intervals.push(intervalSec)
    }

    const avgInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length
    console.log(`Series ${index + 1} (${series.name}):`)
    console.log(`  Data points: ${series.data.length}`)
    console.log(`  Average interval: ${avgInterval.toFixed(1)} seconds`)
    console.log(`  First intervals: ${intervals.map(i => i.toFixed(1)).join(', ')} seconds`)
  })
  console.log('=========================')
}

// Computed property to track current interval for debugging
const currentDataInterval = computed(() => {
  const internalSec = getInternalIntervalSeconds()
  const roundedSec = getRoundedIntervalSeconds(internalSec)

  // Disabled debug logging for production
  // console.log(`Data Interval - Internal: ${internalSec}sec, Rounded for display: ${roundedSec}sec`, {
  //   minuteInterval: props.itemData?.t3Entry?.minute_interval_time,
  //   secondInterval: props.itemData?.t3Entry?.second_interval_time,
  //   timeBase: timeBase.value
  // })

  return { internalSec, roundedSec }
})

// Chart references
const chartContainer = ref<HTMLElement>()
const chartCanvas = ref<HTMLCanvasElement>()
let chartInstance: Chart | null = null
let realtimeInterval: NodeJS.Timeout | null = null

// Computed properties
const chartTitle = computed(() => {
  return props.title ||
    props.itemData?.t3Entry?.description ||
    props.itemData?.t3Entry?.label ||
    props.itemData?.title ||
    'Trend Log Chart'
})

const totalDataPoints = computed(() => {
  return dataSeries.value
    .reduce((total, series) => total + series.data.length, 0)
})

const visibleSeriesCount = computed(() => {
  return dataSeries.value.filter(series => series.visible).length
})

const timeBaseLabel = computed(() => {
  const labels = {
    '5m': 'Last 5 minutes',
    '10m': 'Last 10 minutes',
    '30m': 'Last 30 minutes',
    '1h': 'Last 1 hour',
    '4h': 'Last 4 hours',
    '12h': 'Last 12 hours',
    '1d': 'Last 1 day',
    '4d': 'Last 4 days'
  }
  return labels[timeBase.value] || ''
})

// Helper function to get time base label for dropdown button
const getTimeBaseLabel = () => {
  const labels = {
    '5m': '5 minutes',
    '10m': '10 minutes',
    '30m': '30 minutes',
    '1h': '1 hour',
    '4h': '4 hours',
    '12h': '12 hours',
    '1d': '1 day',
    '4d': '4 days',
    'custom': 'Custom Define'
  }
  return labels[timeBase.value] || '1 hour'
}

// Timebase progression for zoom functionality (shorter to longer)
const timebaseProgression = ['5m', '10m', '30m', '1h', '4h', '12h', '1d', '4d']

// Computed properties for zoom button states
const canZoomIn = computed(() => {
  const currentIndex = timebaseProgression.indexOf(timeBase.value)
  return currentIndex > 0 // Can zoom in if not already at shortest timebase
})

const canZoomOut = computed(() => {
  const currentIndex = timebaseProgression.indexOf(timeBase.value)
  return currentIndex >= 0 && currentIndex < timebaseProgression.length - 1 // Can zoom out if not at longest timebase
})

// Function to set time base from dropdown
const setTimeBase = (value: string) => {
  if (value === 'custom') {
    // Open custom date modal instead of directly setting timebase
    customDateModalVisible.value = true
    return
  }

  timeBase.value = value
  onTimeBaseChange()
}

// Series control computed properties
const hasEnabledSeries = computed(() => {
  return dataSeries.value.some(series => series.visible)
})

const hasDisabledSeries = computed(() => {
  return dataSeries.value.some(series => !series.visible)
})

const analogSeries = computed(() => {
  return dataSeries.value.filter(series => series.unitType === 'analog')
})

const digitalSeries = computed(() => {
  return dataSeries.value.filter(series => series.unitType === 'digital')
})

const hasAnalogSeries = computed(() => {
  return analogSeries.value.length > 0
})

const hasDigitalSeries = computed(() => {
  return digitalSeries.value.length > 0
})

const analogCount = computed(() => {
  return analogSeries.value.length
})

const digitalCount = computed(() => {
  return digitalSeries.value.length
})

const allAnalogEnabled = computed(() => {
  return analogSeries.value.length > 0 && analogSeries.value.every(series => series.visible)
})


const allDigitalEnabled = computed(() => {
  return digitalSeries.value.length > 0 && digitalSeries.value.every(series => series.visible)
})

// Helper to get the data interval (in minutes) for the current time base
const getDataPointInterval = (timeBase: string): number => {
  const intervals = {
    '5m': 1,     // Every 1 minute
    '10m': 1,    // Every 1 minute
    '30m': 2,    // Every 2 minutes
    '1h': 5,     // Every 5 minutes
    '4h': 15,    // Every 15 minutes
    '12h': 30,   // Every 30 minutes
    '1d': 60,    // Every 60 minutes (1 hour)
    '4d': 240    // Every 240 minutes (4 hours)
  }
  return intervals[timeBase] || 1
}

// Helper to get min/max timestamp from all visible data series
const getDataSeriesTimeBounds = () => {
  const allPoints = dataSeries.value
    .filter(series => series.visible)
    .flatMap(series => series.data)
    .map(point => point.timestamp)
  if (allPoints.length === 0) return { min: undefined, max: undefined }
  return {
    min: Math.min(...allPoints),
    max: Math.max(...allPoints)
  }
}

// Chart configuration with Grafana-like styling
const getChartConfig = () => ({
  type: 'line' as const,
  data: {
    datasets: dataSeries.value
      .filter(series => series.visible)
      .map(series => {
        // Ensure data points are sorted by timestamp for proper line drawing
        const sortedData = series.data
          .slice()
          .sort((a, b) => a.timestamp - b.timestamp)
          .map(point => ({
            x: point.timestamp,
            y: point.value
          }))

        return {
          label: series.name,
          data: sortedData,
          borderColor: series.color,
          backgroundColor: series.color + '20',
          borderWidth: 2,
          fill: false,
          // NEW: Digital units use step-line, analog units use smooth/straight lines
          stepped: series.unitType === 'digital' ? 'middle' as const : false,
          tension: series.unitType === 'analog' && smoothLines.value ? 0.4 : 0,
          pointRadius: showPoints.value ? 3 : 0,
          pointHoverRadius: 6,
          pointBackgroundColor: series.color,
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          // Ensure line segments are drawn between all consecutive points
          spanGaps: false
        }
      })
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    // Disable automatic data reduction to ensure all points are drawn
    elements: {
      line: {
        borderWidth: 2,
        // Ensure all data points are connected, no skipping
        skipNull: false
      }
    },
    layout: {
      padding: {
        left: 10,
        right: 20,  // Increased right padding to ensure last point is visible
        top: 10,
        bottom: 10
      }
    },
    interaction: {
      intersect: false,
      mode: 'index' as const  // 🎯 Back to index mode for now
    },
    plugins: {
      legend: {
        display: showLegend.value,
        position: 'bottom' as const,
        labels: {
          color: '#000000',
          font: {
            size: 11,
            family: 'Inter, Helvetica, Arial, sans-serif'
          },
          usePointStyle: true,
          pointStyle: 'line',
          generateLabels: (chart: any) => {
            const datasets = chart.data.datasets
            return datasets.map((dataset: any, i: number) => ({
              text: dataset.label,
              fillStyle: dataset.borderColor,
              strokeStyle: dataset.borderColor,
              fontColor: dataset.borderColor,
              lineWidth: 2,
              pointStyle: 'line',
              datasetIndex: i
            }))
          }
        }
      },
      tooltip: {
        backgroundColor: '#ffffff',
        titleColor: '#000000',
        bodyColor: '#000000',
        borderColor: '#d9d9d9',
        borderWidth: 1,
        cornerRadius: 4,
        displayColors: true,
        usePointStyle: true,
        bodyFont: {
          size: 12,
          weight: 500
        },
        titleFont: {
          size: 13,
          weight: 600
        },
        padding: 8,
        callbacks: {
          title: (context: any) => {
            const date = new Date(context[0].parsed.x)
            return date.toLocaleString()
          },
          label: (context: any) => {
            const series = dataSeries.value.find(s => s.name === context.dataset.label)
            if (!series) return `${context.dataset.label}: ${context.parsed.y}`

            // 🔧 FIX #3: Use clean description without panel info for tooltip
            const cleanLabel = series.description || series.prefix || context.dataset.label

            // 🔧 FIX #2: Different formatting for digital vs analog
            if (series.unitType === 'digital') {
              const stateIndex = context.parsed.y === 1 ? 1 : 0
              const stateText = series.digitalStates?.[stateIndex] || (context.parsed.y === 1 ? 'High' : 'Low')
              // Digital outputs: show only state text, no unit symbol
              return `${cleanLabel}: ${stateText}`
            } else {
              // Analog outputs: show value with unit
              const unit = series.unit || ''
              return `${cleanLabel}: ${context.parsed.y.toFixed(2)}${unit}`
            }
          },
          labelColor: (context: any) => {
            const series = dataSeries.value.find(s => s.name === context.dataset.label)
            const color = series?.color || context.dataset.borderColor
            return {
              borderColor: color,
              backgroundColor: color,
              borderWidth: 2,
              borderRadius: 2
            }
          },
          labelTextColor: (context: any) => {
            const series = dataSeries.value.find(s => s.name === context.dataset.label)
            return series?.color || context.dataset.borderColor
          },
          beforeLabel: (context: any) => {
            // This creates the colored text effect
            return ''
          },
          afterLabel: (context: any) => {
            return ''
          }
        },
        // Use default tooltip with color customization
        enabled: true
      }
    },
    scales: {
      x: {
        type: 'time' as const,
        time: (() => {
          // Handle custom timebase separately
          if (timeBase.value === 'custom') {
            const customConfig = getCustomTickConfig(customStartDate.value?.toDate() || new Date(), customEndDate.value?.toDate() || new Date())
            return {
              unit: customConfig.unit,
              stepSize: customConfig.stepSize,
              displayFormats: {
                minute: customConfig.displayFormat,
                hour: customConfig.displayFormat,
                day: 'MM/dd HH:mm'
              },
              // Ensure Chart.js doesn't skip data points
              minUnit: 'second' as const
            }
          }

          // Use new tick configuration based on timebase
          const tickConfig = getXAxisTickConfig(timeBase.value)
          const displayFormat = getDisplayFormat(timeBase.value)

          return {
            unit: tickConfig.unit as 'minute' | 'hour',
            stepSize: tickConfig.stepMinutes,
            displayFormats: {
              minute: displayFormat,
              hour: displayFormat,
              day: 'dd/MM HH:mm'
            },
            // Ensure Chart.js doesn't skip data points
            minUnit: 'second' as const
          }
        })(),
        grid: {
          color: '#e0e0e0', // Always show grid - remove conditional
          display: true,     // Always display grid
          lineWidth: 1
        },
        ticks: {
          color: '#595959',
          font: {
            size: 11,
            family: 'Inter, Helvetica, Arial, sans-serif'
          },
          maxTicksLimit: (() => {
            // Handle custom timebase separately
            if (timeBase.value === 'custom') {
              const customConfig = getCustomTickConfig(customStartDate.value?.toDate() || new Date(), customEndDate.value?.toDate() || new Date())
              return customConfig.maxTicks
            }

            // Calculate max ticks based on timebase for proper grid division
            const maxTicksConfigs = {
              '5m': 6,    // 5 intervals + 1
              '15m': 6,   // 5 intervals + 1
              '30m': 6,   // 5 intervals + 1
              '1h': 13,   // 12 intervals + 1 (0,5,10,15,20,25,30,35,40,45,50,55,60)
              '6h': 19,   // 18 intervals + 1 (every 20 minutes)
              '12h': 19,  // 18 intervals + 1 (every 40 minutes)
              '24h': 19,  // 18 intervals + 1 (every 80 minutes)
              '7d': 29    // 28 intervals + 1 (every 360 minutes)
            }
            return maxTicksConfigs[timeBase.value] || 7
          })(),
          maxRotation: 0,
          minRotation: 0,
          includeBounds: true  // Force Chart.js to include boundary ticks
        },
        min: (() => {
          if (timeBase.value === 'custom' && customStartDate.value) {
            return customStartDate.value.valueOf()
          }
          // 🔧 FIX #1: Always show proper time range even without data
          const timeWindow = getCurrentTimeWindow()
          return timeWindow.min
        })(),
        max: (() => {
          if (timeBase.value === 'custom' && customEndDate.value) {
            return customEndDate.value.valueOf()
          }
          // 🔧 FIX #1: Always show proper time range even without data
          const timeWindow = getCurrentTimeWindow()
          return timeWindow.max
        })()
      },
      y: {
        // Enhanced Y-axis configuration - always show proper range and grid
        min: (() => {
          // If we have data, let Chart.js auto-scale with some padding
          if (dataSeries.value.some(series => series.visible && series.data.length > 0)) {
            return undefined // Let Chart.js auto-scale
          }
          // If no data, show a reasonable default range starting from 0
          return 0
        })(),
        max: (() => {
          // If we have data, let Chart.js auto-scale with some padding
          if (dataSeries.value.some(series => series.visible && series.data.length > 0)) {
            return undefined // Let Chart.js auto-scale
          }
          // If no data, show a reasonable default range up to 100
          return 100
        })(),
        grid: {
          color: '#d0d0d0',  // Always show grid - remove conditional
          display: true      // Always display grid
        },
        ticks: {
          color: '#595959',
          font: {
            size: 11,
            family: 'Inter, Helvetica, Arial, sans-serif'
          },
          // Format y-axis numbers to remove decimal places (e.g., 60.0 �?60)
          callback: function (value: any) {
            // Format all numeric values as integers (remove decimal places)
            if (typeof value === 'number') {
              return Math.round(value).toString()
            }
            return value?.toString() || ''
          }
        }
      }
    }
  }
})

// Time navigation tracking
const timeOffset = ref(0) // Offset in minutes from current time

// Add helper to get current time window with proper alignment (simplified)
const getCurrentTimeWindow = () => {
  const now = new Date()
  // Align current time to exact minute
  const currentMinute = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), 0, 0)

  // Apply time offset for navigation
  const offsetTime = new Date(currentMinute.getTime() + timeOffset.value * 60 * 1000)

  const rangeMinutes = getTimeRangeMinutes(timeBase.value)
  const startTime = new Date(offsetTime.getTime() - rangeMinutes * 60 * 1000)

  return {
    min: startTime.getTime(),
    max: offsetTime.getTime()
  }
}

// Data generation and management - Updated to use timebase-specific intervals
const generateMockData = (seriesIndex: number, timeRangeMinutes: number): DataPoint[] => {
  const now = new Date()
  // Align current time to exact minute
  const currentMinute = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), 0, 0)

  // Apply time offset for navigation
  const offsetTime = new Date(currentMinute.getTime() + timeOffset.value * 60 * 1000)

  const startTime = new Date(offsetTime.getTime() - timeRangeMinutes * 60 * 1000)
  const endTime = offsetTime.getTime()

  // Works
  // Determine data point interval based on timebase (optimal recommendations)
  const getDataPointInterval = (timeBase: string): number => {
    const intervals = {
      '5m': 1,     // Every 1 minute
      '15m': 1,    // Every 1 minute
      '30m': 1,    // Every 1 minute
      '1h': 5,     // Every 1 minute
      '6h': 20,    // Every 20 minutes (optimal)
      '12h': 40,   // Every 40 minutes (optimal)
      '24h': 80,   // Every 80 minutes (optimal)
      '7d': 360    // Every 360 minutes (2 hours) (optimal)
    }
    return intervals[timeBase] || 1
  }

  // Use internal interval from props (in seconds) for accurate data generation
  const dataIntervalSeconds = getInternalIntervalSeconds()
  const dataIntervalMinutes = dataIntervalSeconds / 60
  const dataPointCount = Math.floor(timeRangeMinutes / dataIntervalMinutes) + 1 // +1 to include both start and end points
  const series = dataSeries.value[seriesIndex]
  const data: DataPoint[] = []

  if (series.unitType === 'digital') {
    // Digital data: Generate step-like transitions between 0 and 1
    let currentState = Math.random() > 0.5 ? 1 : 0

    for (let i = 0; i < dataPointCount; i++) {
      // Calculate timestamp: start time plus i * dataInterval in seconds (converted to milliseconds)
      const timestamp = startTime.getTime() + i * dataIntervalSeconds * 1000

      // Randomly change state (about 10% chance per point for realistic transitions)
      if (Math.random() < 0.1) {
        currentState = currentState === 1 ? 0 : 1
      }

      data.push({ timestamp, value: currentState })
    }
  } else {
    // Analog data: Generate continuous values with realistic ranges
    // For analog items (range = 0), generate values like 8000 as per your specification
    const rangeValue = series.unitCode // This is now 0 or 1
    let baseValue: number
    let range: number

    if (rangeValue === 0) { // Analog
      // Generate realistic analog values - some in thousands as per your example (8000)
      if (seriesIndex % 4 === 0) {
        // Temperature-like values in thousands (like 8000)
        baseValue = 7000 + seriesIndex * 200
        range = 1000
      } else if (seriesIndex % 4 === 1) {
        // Pressure values
        baseValue = 1000 + seriesIndex * 100
        range = 300
      } else if (seriesIndex % 4 === 2) {
        // Flow values
        baseValue = 500 + seriesIndex * 50
        range = 200
      } else {
        // Other analog values
        baseValue = 100 + seriesIndex * 20
        range = 50
      }
    } else {
      // This shouldn't happen for analog branch, but safety fallback
      baseValue = 100
      range = 50
    }

    for (let i = 0; i < dataPointCount; i++) {
      // Calculate timestamp: start time plus i * dataInterval in seconds (converted to milliseconds)
      const timestamp = startTime.getTime() + i * dataIntervalSeconds * 1000

      // Generate smooth sine wave with some noise for realistic analog data
      const sineValue = Math.sin((i / dataPointCount) * Math.PI * 2) * (range / 3)
      const noise = (Math.random() - 0.5) * (range / 5)
      const value = baseValue + sineValue + noise

      data.push({ timestamp, value: Math.round(value * 100) / 100 })
    }
  }

  return data
}

// Generate data for custom date range
const generateCustomDateData = (seriesIndex: number, startDate: Date, endDate: Date): DataPoint[] => {
  const totalMinutes = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60))

  // Use appropriate interval based on the total time range
  let dataIntervalMinutes: number
  if (totalMinutes <= 60) {
    dataIntervalMinutes = 1 // 1 minute intervals for short ranges
  } else if (totalMinutes <= 720) {
    dataIntervalMinutes = 5 // 5 minute intervals for up to 12 hours
  } else if (totalMinutes <= 2880) {
    dataIntervalMinutes = 15 // 15 minute intervals for up to 2 days
  } else {
    dataIntervalMinutes = 60 // 1 hour intervals for longer ranges
  }

  // Calculate number of complete intervals + ensure endpoint is included
  const numCompleteIntervals = Math.floor(totalMinutes / dataIntervalMinutes)
  const series = dataSeries.value[seriesIndex]
  const data: DataPoint[] = []

  if (series.unitType === 'digital') {
    // Digital data: Generate step-like transitions between 0 and 1
    let currentState = Math.random() > 0.5 ? 1 : 0

    // Generate data points for complete intervals
    for (let i = 0; i <= numCompleteIntervals; i++) {
      const timestamp = startDate.getTime() + i * dataIntervalMinutes * 60 * 1000

      // Don't exceed the end date
      if (timestamp > endDate.getTime()) break

      // Randomly change state (about 10% chance per point for realistic transitions)
      if (Math.random() < 0.1) {
        currentState = currentState === 1 ? 0 : 1
      }

      data.push({ timestamp, value: currentState })
    }

    // Always ensure the exact end point is included
    const lastPoint = data[data.length - 1]
    if (!lastPoint || lastPoint.timestamp < endDate.getTime()) {
      // Keep the same state for the endpoint
      data.push({ timestamp: endDate.getTime(), value: currentState })
    }
  } else {
    // Analog data: Generate realistic sensor data with large values as per specification
    const rangeValue = series.unitCode // This is now 0 or 1
    let baseValue: number
    let range: number

    if (rangeValue === 0) { // Analog
      // Generate realistic analog values - some in thousands as per your example (8000)
      if (seriesIndex % 4 === 0) {
        // Temperature-like values in thousands (like 8000)
        baseValue = 7000 + seriesIndex * 200
        range = 1000
      } else if (seriesIndex % 4 === 1) {
        // Pressure values
        baseValue = 1000 + seriesIndex * 100
        range = 300
      } else if (seriesIndex % 4 === 2) {
        // Flow values
        baseValue = 500 + seriesIndex * 50
        range = 200
      } else {
        // Other analog values
        baseValue = 100 + seriesIndex * 20
        range = 50
      }
    } else {
      // This shouldn't happen for analog branch, but safety fallback
      baseValue = 100
      range = 50
    }

    // Generate data points for complete intervals
    for (let i = 0; i <= numCompleteIntervals; i++) {
      const timestamp = startDate.getTime() + i * dataIntervalMinutes * 60 * 1000

      // Don't exceed the end date
      if (timestamp > endDate.getTime()) break

      // Generate smooth sine wave with some noise for realistic analog data
      const totalDataPoints = numCompleteIntervals + 1
      const sineValue = Math.sin((i / totalDataPoints) * Math.PI * 2) * (range / 3)
      const noise = (Math.random() - 0.5) * (range / 5)
      const value = baseValue + sineValue + noise

      data.push({ timestamp, value: Math.round(value * 100) / 100 })
    }

    // Always ensure the exact end point is included
    const lastPoint = data[data.length - 1]
    if (!lastPoint || lastPoint.timestamp < endDate.getTime()) {
      // Generate value for the endpoint using same formula
      const totalDataPoints = numCompleteIntervals + 1
      const sineValue = Math.sin((totalDataPoints / totalDataPoints) * Math.PI * 2) * (range / 3)
      const noise = (Math.random() - 0.5) * (range / 5)
      const value = baseValue + sineValue + noise

      data.push({ timestamp: endDate.getTime(), value: Math.round(value * 100) / 100 })
    }
  }

  return data
}

// ====================================================================================
// REAL DATA INTEGRATION: T3000 Monitor Data Extraction and Real-time Data Fetching
// ====================================================================================

/**
 * Enhanced monitor configuration extraction using T3000DataManager
 * @returns Monitor configuration with input items and timing intervals
 */
const getMonitorConfigFromT3000Data = async () => {
  LogUtil.Info('🔍 TrendLogModal: === ENHANCED MONITOR CONFIG EXTRACTION ===')

  // Get the monitor ID and PID from current item data (props or global)
  const monitorId = (currentItemData.value as any)?.t3Entry?.id
  const panelId = (currentItemData.value as any)?.t3Entry?.pid

  LogUtil.Info('📊 TrendLogModal: Monitor extraction info:', {
    usingPropsItemData: !!props.itemData,
    usingGlobalScheduleData: !props.itemData,
    currentItemData: currentItemData.value,
    monitorId,
    panelId,
    fullT3Entry: (currentItemData.value as any)?.t3Entry
  })

  if (!monitorId) {
    LogUtil.Warn('�?TrendLogModal: No monitor ID found in currentItemData.t3Entry.id')
    return null
  }

  if (!panelId && panelId !== 0) {
    LogUtil.Warn('�?TrendLogModal: No panel ID found in currentItemData.t3Entry.pid')
    return null
  }

  LogUtil.Info(`🎯 TrendLogModal: Looking for monitor ID: ${monitorId} with PID: ${panelId}`)

  try {
    // Use FFI API to validate data readiness
    LogUtil.Info('�?TrendLogModal: Using FFI API to get panel data...')
    if (!ffiApi.isReady.value) {
      LogUtil.Error('�?TrendLogModal: FFI API is not ready')
      return null
    }

    const panelData = await ffiApi.ffiGetPanelData(panelId)
    if (!panelData || !panelData.entries) {
      LogUtil.Error('�?TrendLogModal: Panel data not available', { panelId })
      return null
    }

    LogUtil.Info('�?TrendLogModal: Panel data retrieved successfully')

    // Get the monitor entry by ID
    const monitorConfig = panelData.entries.find((entry: any) => entry.id === monitorId)

    if (!monitorConfig) {
      LogUtil.Warn(`�?TrendLogModal: Monitor configuration not found for ID: ${monitorId}`)
      return null
    }

    LogUtil.Info('�?TrendLogModal: Found monitor configuration:', monitorConfig)

    // Calculate the data retrieval interval in milliseconds using the unified function
    const intervalMs = calculateT3000Interval(monitorConfig)

    // Extract input items from the configuration
    const inputItems: any[] = []
    const ranges: any[] = []

    // Parse input items based on actual monitor configuration structure
    // monitorConfig has 'input' array with objects and 'range' array
    if (monitorConfig.input && Array.isArray(monitorConfig.input)) {
      LogUtil.Info(`🔍 TrendLogModal: Extracting ${monitorConfig.input.length} input items from monitor config`)

      for (let i = 0; i < monitorConfig.input.length; i++) {
        const inputItem = monitorConfig.input[i]
        if (inputItem && inputItem.panel !== undefined && inputItem.point_number !== undefined) {
          inputItems.push({
            panel: inputItem.panel,
            point_number: inputItem.point_number,
            index: i,
            point_type: inputItem.point_type,
            network: inputItem.network,
            sub_panel: inputItem.sub_panel
          })

          // Get corresponding range value
          const rangeValue = (monitorConfig.range && monitorConfig.range[i]) ? monitorConfig.range[i] : 0
          ranges.push(rangeValue)

          // **DEBUG FIRST ITEM SPECIFICALLY**
          if (i === 0) {
            LogUtil.Info(`🚨 FIRST ITEM (index 0) EXTRACTION DEBUG:`, {
              inputItem,
              extractedRangeValue: rangeValue,
              monitorConfigRangeArray: monitorConfig.range,
              rangeAtIndex0: monitorConfig.range ? monitorConfig.range[0] : 'NO_RANGE_ARRAY',
              expectedDeviceId: `IN${inputItem.point_number + 1}` // Should be IN1 for point_number=0
            })
          }

          LogUtil.Info(`📝 TrendLogModal: Item ${i}: point_type=${inputItem.point_type}, point_number=${inputItem.point_number}, range=${rangeValue}`)
        }
      }
    }

    LogUtil.Info(`�?TrendLogModal: Extracted ranges array:`, ranges)

    // Check if we actually have valid input items with meaningful data
    if (inputItems.length === 0) {
      LogUtil.Info('�?TrendLogModal: No valid input items found in monitor config, returning null')
      return null
    }

    // Additional validation: check if input items have valid point numbers and panels
    const validInputItems = inputItems.filter(item =>
      item.panel !== undefined &&
      item.point_number !== undefined &&
      item.point_number >= 0
    )

    if (validInputItems.length === 0) {
      LogUtil.Info('�?TrendLogModal: No input items with valid point numbers found, returning null')
      return null
    }

    const result = {
      id: monitorConfig.id,
      label: monitorConfig.label || monitorConfig.description || `Monitor ${monitorId}`,
      pid: monitorConfig.pid,
      type: monitorConfig.type,
      status: monitorConfig.status,
      numInputs: inputItems.length,
      inputItems: inputItems,
      ranges: ranges,
      dataIntervalMs: intervalMs,
      originalConfig: monitorConfig
    }

    LogUtil.Info('🎯 TrendLogModal: Processed monitor configuration:', {
      id: result.id,
      inputItemsCount: result.inputItems.length,
      rangesCount: result.ranges.length,
      dataInterval: result.dataIntervalMs
    })

    return result

  } catch (error) {
    LogUtil.Error('�?TrendLogModal: Error extracting monitor config:', error)
    return null
  }
}


/**
 * Initialize WebSocket and WebView clients for data communication
 */
const initializeDataClients = () => {
  LogUtil.Debug('=== INITIALIZING DATA CLIENTS ===')

  // Check if we're running in built-in browser (WebView) or external browser (WebSocket)
  const isBuiltInBrowser = window.location.protocol === 'ms-appx-web:' ||
                          (window as any).chrome?.webview !== undefined ||
                          (window as any).external?.sendMessage !== undefined

  LogUtil.Debug('Environment detected:', isBuiltInBrowser ? 'Built-in WebView' : 'External Browser')

  // FFI API SPECIFIC: Always use FFI API instead of WebSocket clients
  LogUtil.Info('🔧 TrendLogChartFfiApi: Using FFI API for all data requests')
  return ffiApi
}

/**
 * Wait for panelsData to be available and populated
 */
const waitForPanelsData = async (timeoutMs: number = 10000): Promise<boolean> => {
  const startTime = Date.now()

  while (Date.now() - startTime < timeoutMs) {
    const panelsData = T3000_Data.value.panelsData || []

    if (panelsData.length > 0) {
      LogUtil.Info(`�?TrendLogModal: PanelsData loaded with ${panelsData.length} devices`)
      return true
    }

    LogUtil.Info(`�?TrendLogModal: Waiting for panelsData... (${Date.now() - startTime}ms elapsed)`)
    await new Promise(resolve => setTimeout(resolve, 200)) // Reduced from 500ms to 200ms for faster detection
  }

  LogUtil.Warn(`�?TrendLogModal: Timeout waiting for panelsData after ${timeoutMs}ms`)
  return false
}

/**
 * Fetch real-time data for all monitor input items
 */
const fetchRealTimeMonitorData = async (): Promise<DataPoint[][]> => {
  try {
    LogUtil.Info('🔄 TrendLogModal: Starting real-time monitor data fetch...')

    // Set loading state
    isLoading.value = true

    // Use the reactive monitor config
    const monitorConfigData = monitorConfig.value
    if (!monitorConfigData) {
      LogUtil.Info('�?TrendLogModal: No monitor config found, falling back to mock data')
      isLoading.value = false
      return []
    }

    LogUtil.Info('�?TrendLogModal: Monitor config extracted:', monitorConfig)
    LogUtil.Info('📊 TrendLogModal: Monitor config details:', {
      id: monitorConfigData.id,
      inputItemsCount: monitorConfigData.inputItems?.length || 0,
      rangesCount: monitorConfigData.ranges?.length || 0,
      dataInterval: monitorConfigData.dataIntervalMs
    })

    // Check if panelsData is already available - if so, proceed immediately
    const currentPanelsData = T3000_Data.value.panelsData || []
    let panelsDataReady = false

    if (currentPanelsData.length > 0) {
      LogUtil.Info(`�?TrendLogModal: PanelsData already available with ${currentPanelsData.length} devices - proceeding immediately`)
      panelsDataReady = true
    } else {
      // Only wait if panelsData is not already available
      LogUtil.Info('�?TrendLogModal: PanelsData not ready, waiting for it to load...')
      panelsDataReady = await waitForPanelsData(5000) // Reduced timeout from 10s to 5s
    }

    if (!panelsDataReady) {
      LogUtil.Error('�?TrendLogModal: PanelsData not available, cannot proceed')
      isLoading.value = false
      return []
    }

    // Initialize data client (returns single client based on environment)
    const dataClient = initializeDataClients()

    if (!dataClient) {
      LogUtil.Info('�?TrendLogModal: No data client available')
      return []
    }

    LogUtil.Info('�?TrendLogModal: Data client initialized:', {
      clientType: dataClient.constructor.name,
      hasGetEntriesMethod: typeof dataClient.ffiGetEntries === 'function',
      clientMethods: Object.getOwnPropertyNames(Object.getPrototypeOf(dataClient)).filter(name => name.includes('Get'))
    })

    // Setup message handlers for GET_ENTRIES responses
    setupGetEntriesResponseHandlers(dataClient)

    // Get current device for panelId - use the first available panel as fallback
    const panelsList = T3000_Data.value.panelsList || []
    const currentPanelId = panelsList.length > 0 ? panelsList[0].panel_number : 1
    LogUtil.Info('📊 TrendLogModal: Using panelId:', currentPanelId)
    LogUtil.Info('📊 TrendLogModal: Available panels:', panelsList.map(p => ({ id: p.panel_number, name: p.panel_name })))

    // Get panels data for device mapping
    const panelsData = T3000_Data.value.panelsData || []
    LogUtil.Info('PANELS TrendLogModal: Total panelsData count:', panelsData)
    LogUtil.Info('PANELS TrendLogModal: PanelsData structure sample:', panelsData.slice(0, 2))

    // Instead of finding a single panel, return all panelData for the currentPanelId
    const currentPanelData = panelsData.filter(panel => String(panel.pid) === String(currentPanelId))

    if (!currentPanelData) {
      LogUtil.Info('ERROR TrendLogModal: No panel data found for panelId:', currentPanelData)
      LogUtil.Info('PANELS TrendLogModal: Available panel PIDs:', panelsData.map(p => p.pid))
      return []
    }

    // Use currentPanelData directly as devicesArray
    let devicesArray = currentPanelData

    if (!Array.isArray(devicesArray) || devicesArray.length === 0) {
      LogUtil.Info('ERROR TrendLogModal: No devices found in panel data')
      return []
    }

    LogUtil.Info('DEVICES TrendLogModal: Found', devicesArray.length, 'devices in panel')
    LogUtil.Info('DEVICES TrendLogModal: Sample devices from panel:', devicesArray.slice(0, 5).map(d => ({ id: d.id, label: d.label })))

    // Fetch data for all input items
    LogUtil.Info('🔄 TrendLogModal: Starting to fetch data for', monitorConfigData.inputItems.length, 'input items')

    const allDataPromises = monitorConfigData.inputItems.map(async (inputItem, index) => {
      LogUtil.Info(`🔄 TrendLogModal: Processing input item ${index + 1}/${monitorConfigData.inputItems.length}`)
      return await fetchSingleItemData(dataClient, inputItem, {
        ...monitorConfigData,
        panelId: currentPanelId,
        panelData: devicesArray, // Use the extracted devices array
        itemIndex: index
      })
    })

    const allDataResults = await Promise.all(allDataPromises)
    LogUtil.Info('�?TrendLogModal: All data fetched successfully, results count:', allDataResults.length)

    // Log detailed results
    allDataResults.forEach((result, index) => {
      LogUtil.Info(`📈 TrendLogModal: Series ${index} result:`, {
        dataPointCount: result.length,
        firstValue: result[0]?.value,
        hasData: result.length > 0 && result[0]?.value !== 0
      })
    })

    return allDataResults

  } catch (error) {
    LogUtil.Error('�?TrendLogModal: Error fetching real-time monitor data:', error)
    return []
  } finally {
    // Clear loading state
    isLoading.value = false
  }
}

/**
 * Fetch data for a single input item with enhanced device mapping
 */
const fetchSingleItemData = async (dataClient: any, inputItem: any, config: any): Promise<DataPoint[]> => {
  try {
    LogUtil.Info(`🔍 TrendLogModal: Processing input item:`, inputItem)
    LogUtil.Info(`🔧 TrendLogModal: Config passed to fetchSingleItemData:`, {
      panelId: config.panelId,
      itemIndex: config.itemIndex,
      panelDataLength: config.panelData?.length,
      rangesLength: config.ranges?.length
    })

    // Extract index from config (this should match the input item index in the array)
    const itemIndex = config.itemIndex || 0
    const rangeValue = config.ranges[itemIndex] || 0

    LogUtil.Info(`📊 TrendLogModal: Processing item ${itemIndex}, range value: ${rangeValue}`)

    // Log device mapping details
    const deviceId = logDeviceMapping(inputItem, itemIndex, rangeValue)

    // Debug: Log all available devices in panelData
    LogUtil.Info(`🔍 TrendLogModal: Available devices in panelData:`,
      config.panelData.map(device => ({ id: device.id, label: device.label, value: device.value }))
    )

    // Find matching device in panelsData using new enhanced lookup
    const matchingDevice = findPanelDataDevice(inputItem, config.panelData)

    if (!matchingDevice) {
      LogUtil.Info(`�?TrendLogModal: No device found with ID: ${deviceId}, leaving as empty`)
      LogUtil.Info(`🔍 TrendLogModal: Searched for "${deviceId}" in ${config.panelData.length} devices`)
      return [{
        timestamp: Date.now(),
        value: 0
      }]
    }

    LogUtil.Info(`�?TrendLogModal: Found matching device:`, matchingDevice)

    // Process the device value using enhanced logic with panel data + input range
    const processedValue = processDeviceValue(matchingDevice, rangeValue)
    LogUtil.Info(`📊 TrendLogModal: Processed value:`, processedValue)

    // Send GET_ENTRIES request to get latest data from T3000
    const deviceIndex = parseInt(matchingDevice.index) || 0
    // const deviceType = mapPointTypeToString(inputItem.point_type)
    const deviceType=inputItem.point_type

    LogUtil.Info(`📤 TrendLogModal: About to send GET_ENTRIES:`, {
      panelId: config.panelId,
      deviceIndex,
      deviceType,
      clientType: dataClient.constructor.name,
      hasGetEntriesMethod: typeof dataClient.GetEntries === 'function'
    })

    await sendGetEntriesRequest(dataClient, config.panelId, deviceIndex, deviceType)

    // Return current data point with processed value
    // Note: More data will come through the message handlers (HandleGetEntriesRes)
    const resultDataPoint = {
      timestamp: Date.now(),
      value: processedValue.value
    }

    LogUtil.Info(`📈 TrendLogModal: Returning data point for item ${itemIndex}:`, resultDataPoint)

    return [resultDataPoint]

  } catch (error) {
    LogUtil.Error('�?TrendLogModal: Error fetching single item data:', error)
    return [{
      timestamp: Date.now(),
      value: 0
    }]
  }
}

/**
 * Initialize data series from real T3000 monitor configuration
 */
const initializeRealDataSeries = async () => {
  LogUtil.Info('🚀 TrendLogModal: === INITIALIZING REAL DATA SERIES ===', {
    hasMonitorConfig: !!monitorConfig.value,
    inputItemsLength: monitorConfig.value?.inputItems?.length || 0,
    rangesLength: monitorConfig.value?.ranges?.length || 0
  })

  const monitorConfigData = monitorConfig.value
  if (!monitorConfigData) {
    LogUtil.Info('No monitor configuration found, clearing series')
    dataSeries.value = []
    return
  }

  LogUtil.Info('📊 TrendLogModal: Starting real data series initialization with config:', {
    inputItemsCount: monitorConfigData.inputItems?.length,
    rangesCount: monitorConfigData.ranges?.length,
    id: monitorConfigData.id
  })

  try {
    // Fetch real-time data for all items
    LogUtil.Info('🔄 TrendLogModal: Fetching real-time data...')
    const realTimeData = await fetchRealTimeMonitorData()

    LogUtil.Info('📈 TrendLogModal: Real-time data fetch completed:', {
      seriesCount: realTimeData.length,
      hasData: realTimeData.length > 0,
      sampleData: realTimeData.slice(0, 3).map((series, index) => ({
        seriesIndex: index,
        dataPointsCount: series.length,
        firstValue: series[0]?.value,
        isEmpty: series.length === 0
      }))
    })

    // Check if we have any real data at all
    const hasAnyRealData = realTimeData.some(series => series.length > 0)

    LogUtil.Info('🔍 TrendLogModal: Real data availability check:', {
      realTimeDataLength: realTimeData.length,
      hasAnyRealData: hasAnyRealData,
      sampleSeriesLengths: realTimeData.slice(0, 5).map(series => series.length),
      note: 'Will show all 14 items even if no data yet'
    })

    // Note: We continue even if hasAnyRealData is false to show all 14 items structure
    // This allows users to see which items are configured, even if data collection hasn't started

    // Update data series with real configuration - all 14 items from monitor config
    const newDataSeries: SeriesConfig[] = []

    for (let i = 0; i < monitorConfigData.inputItems.length; i++) {
      const inputItem = monitorConfigData.inputItems[i]
      const pointTypeInfo = getPointTypeInfo(inputItem.point_type)
      const rangeValue = monitorConfigData.ranges[i] || 0
      const itemData = realTimeData[i] || []

      // Log status for all series (even those without data yet)
      LogUtil.Info(`📊 TrendLogModal: Processing series ${i + 1}/${monitorConfigData.inputItems.length}:`, {
        inputItem,
        pointTypeInfo,
        rangeValue,
        dataPointsCount: itemData.length,
        hasData: itemData.length > 0
      })

      // *** DETAILED VALUE LOGGING FOR 14 ITEMS FROM T3000 ***
      LogUtil.Info(`🔍 [SERIES ${i + 1}] T3000 Data Details:`, {
        seriesNumber: i + 1,
        panelId: inputItem.panel,
        pointType: inputItem.point_type,
        pointNumber: inputItem.point_number,
        rangeValue: rangeValue,
        dataType: rangeValue === 1 ? 'DIGITAL' : 'ANALOG',
        rawDataPoints: itemData.length,
        firstDataPoint: itemData[0] ? {
          timestamp: itemData[0].timestamp,
          value: itemData[0].value,
          timestampReadable: new Date(itemData[0].timestamp).toISOString()
        } : 'NO DATA',
        lastDataPoint: itemData.length > 0 ? {
          timestamp: itemData[itemData.length - 1].timestamp,
          value: itemData[itemData.length - 1].value,
          timestampReadable: new Date(itemData[itemData.length - 1].timestamp).toISOString()
        } : 'NO DATA',
        valueRange: itemData.length > 0 ? {
          min: Math.min(...itemData.map(d => d.value)),
          max: Math.max(...itemData.map(d => d.value)),
          average: itemData.reduce((sum, d) => sum + d.value, 0) / itemData.length
        } : 'NO DATA',
        dataSource: itemData.length > 0 ? 'T3000_REAL_DATA' : 'NO_DATA_AVAILABLE'
      })

      // Use device description for series name
      const prefix = pointTypeInfo.category
      const desc = getDeviceDescription(inputItem.panel, inputItem.point_type, inputItem.point_number)

      // Create clean name - since we only create series with data
      const seriesName = desc || `${inputItem.point_number + 1} (P${inputItem.panel})`
      const cleanDescription = desc || `${inputItem.point_number + 1}`

      // Determine unit type based on range value: 0 = analog, 1 = digital
      const isDigital = rangeValue === 1

      let unitType: 'digital' | 'analog'
      let unitSymbol: string
      let digitalStates: [string, string] | undefined

      if (isDigital) {
        unitType = 'digital'
        unitSymbol = ''
        digitalStates = ['Low', 'High'] // Default digital states
      } else {
        unitType = 'analog'
        unitSymbol = '' // Will be determined based on point type or context
        digitalStates = undefined
      }

      const seriesConfig: SeriesConfig = {
        name: seriesName,
        color: `hsl(${(newDataSeries.length * 360) / monitorConfigData.inputItems.length}, 70%, 50%)`,
        data: itemData,
        visible: true,
        isEmpty: itemData.length === 0, // Mark as empty if no data points yet
        unit: unitSymbol,
        unitType: unitType,
        unitCode: rangeValue,
        digitalStates: digitalStates,
        itemType: pointTypeInfo.name,
        prefix: prefix,
        description: cleanDescription
      }

      newDataSeries.push(seriesConfig)

      LogUtil.Info(`�?TrendLogModal: Created series "${seriesConfig.name}":`, {
        type: seriesConfig.unitType,
        unit: seriesConfig.unit,
        dataPoints: seriesConfig.data.length,
        visible: seriesConfig.visible,
        isEmpty: seriesConfig.isEmpty,
        color: seriesConfig.color
      })
    }

    // Update the reactive data series
    dataSeries.value = newDataSeries

    LogUtil.Info('🎉 TrendLogModal: Real data series initialization complete:', {
      totalSeries: newDataSeries.length,
      visibleSeries: newDataSeries.filter(s => s.visible && !s.isEmpty).length,
      emptySeries: newDataSeries.filter(s => s.isEmpty).length,
      digitalSeries: newDataSeries.filter(s => s.unitType === 'digital').length,
      analogSeries: newDataSeries.filter(s => s.unitType === 'analog').length
    })

    LogUtil.Debug(`Successfully initialized ${newDataSeries.length} real data series`)

    // Log the monitor info (chartTitle is computed from props, so we don't modify it)
    LogUtil.Debug(`Chart title will be: ${monitorConfigData.label} (${monitorConfigData.id}) - Real-time Data`)

    // Update sync time since we successfully loaded real data
    lastSyncTime.value = new Date().toLocaleTimeString()

  } catch (error) {
    LogUtil.Error('Error initializing real data series:', error)
    LogUtil.Warn('Falling back to mock data')
  }
}

// ====================================================================================
// ENHANCED T3000 DEVICE MAPPING AND VALUE PROCESSING FUNCTIONS
// ====================================================================================

/**
 * Find panel data device by generated device ID
 */
const findPanelDataDevice = (inputItem: any, panelsData: any[]): any | null => {
  const deviceId = generateDeviceId(inputItem.point_type, inputItem.point_number)

  LogUtil.Info(`🔍 TrendLogModal: Looking for device with ID: ${deviceId}`, {
    inputItem,
    generatedDeviceId: deviceId,
    availableDevices: panelsData.map(d => d.id)
  })

  const device = panelsData.find(device => device.id === deviceId)

  if (!device) {
    LogUtil.Warn(`�?TrendLogModal: Device ${deviceId} not found in panelsData`)
    return null
  }

  LogUtil.Info(`�?TrendLogModal: Found device ${deviceId}:`, device)
  return device
}

/**
 * Determine if device is analog or digital from panel data and input range
 */
const isAnalogDevice = (panelData: any, inputRangeValue: number): boolean => {
  // Primary: Use input range value (0=analog, 1=digital)
  const isAnalogByRange = inputRangeValue === 0

  // Secondary: Use panel data digital_analog field (1=analog, 0=digital)
  const isAnalogByPanelData = panelData.digital_analog === 1

  LogUtil.Info(`🔍 TrendLogModal: Device type determination:`, {
    deviceId: panelData.id,
    inputRangeValue,
    isAnalogByRange,
    panelDataDigitalAnalog: panelData.digital_analog,
    isAnalogByPanelData,
    finalDecision: isAnalogByRange
  })

  // Use input range as primary source of truth
  return isAnalogByRange
}

/**
 * Get the correct value from panel data based on device type
 */
const getDeviceValue = (panelData: any, isAnalog: boolean): number => {
  let rawValue: number

  // Enhanced logging for digital outputs (OUT1, OUT2) to understand data structure
  if (panelData.id === 'OUT1' || panelData.id === 'OUT2') {
    LogUtil.Info(`🔍 DIGITAL OUTPUT DEBUG - ${panelData.id} Full Device Data:`, {
      id: panelData.id,
      value: panelData.value,
      control: panelData.control,
      digital_analog: panelData.digital_analog,
      range: panelData.range,
      label: panelData.label,
      unit: panelData.unit,
      index: panelData.index,
      auto_manual: panelData.auto_manual,
      pid: panelData.pid,
      isAnalogClassification: isAnalog,
      allFields: Object.keys(panelData)
    })
  }

  if (isAnalog) {
    // Analog devices: use 'value' field
    rawValue = parseFloat(panelData.value) || 0
    LogUtil.Info(`📊 TrendLogModal: Using analog value field:`, {
      deviceId: panelData.id,
      valueField: panelData.value,
      parsedValue: rawValue
    })
  } else {
    // Digital devices: For OUT1/OUT2, check multiple potential fields
    if (panelData.id === 'OUT1' || panelData.id === 'OUT2') {
      // Try different fields for digital outputs
      const controlValue = parseFloat(panelData.control) || 0
      const valueValue = parseFloat(panelData.value) || 0
      const autoManualValue = parseFloat(panelData.auto_manual) || 0

      // Use the field with the highest non-zero value, or control as fallback
      if (valueValue > 0) {
        rawValue = valueValue
        LogUtil.Info(`📊 TrendLogModal: Digital output using 'value' field:`, {
          deviceId: panelData.id,
          selectedField: 'value',
          selectedValue: rawValue
        })
      } else if (autoManualValue > 0) {
        rawValue = autoManualValue
        LogUtil.Info(`📊 TrendLogModal: Digital output using 'auto_manual' field:`, {
          deviceId: panelData.id,
          selectedField: 'auto_manual',
          selectedValue: rawValue
        })
      } else {
        rawValue = controlValue
        LogUtil.Info(`📊 TrendLogModal: Digital output using 'control' field (fallback):`, {
          deviceId: panelData.id,
          selectedField: 'control',
          selectedValue: rawValue
        })
      }
    } else {
      // Regular digital devices: use 'control' field
      rawValue = parseFloat(panelData.control) || 0
      LogUtil.Info(`📊 TrendLogModal: Using digital control field:`, {
        deviceId: panelData.id,
        controlField: panelData.control,
        parsedValue: rawValue,
        digitalAnalogFlag: panelData.digital_analog,
        rangeField: panelData.range
      })
    }
  }

  return rawValue
}

/**
 * Get analog unit symbol based on range value
 */
const getAnalogUnit = (range: number): string => {
  const analogUnits: { [key: number]: string } = {
    0: '',           // Unused/default
    31: '°C',        // deg.Celsius
    32: '°F',        // deg.Fahrenheit
    33: 'ft/min',    // Feet per Min
    34: 'Pa',        // Pascals
    35: 'kPa',       // KPascals
    36: 'psi',       // lbs/sqr.inch
    37: 'inWC',      // inches of WC
    38: 'W',         // Watts
    39: 'kW',        // KWatts
    40: 'kWh',       // KWH
    41: 'V',         // Volts
    42: 'kV',        // KV
    43: 'A',         // Amps
    44: 'mA',        // ma
    45: 'CFM',       // CFM
    46: 's',         // Seconds
    47: 'min',       // Minutes
    48: 'h',         // Hours
    49: 'days',      // Days
    50: 'time',      // Time
    51: 'Ω',         // Ohms
    52: '%',         // %
    53: '%RH',       // %RH
    54: 'p/min',     // p/min
    55: 'counts',    // Counts
    56: '%Open',     // %Open
    57: 'kg',        // Kg
    58: 'L/h',       // L/Hour
    59: 'GPH',       // GPH
    60: 'gal',       // GAL
    61: 'ft³',       // CF
    62: 'BTU',       // BTU
    63: 'm³/h'       // CMH
  }

  return analogUnits[range] || ''
}

/**
 * Get digital unit labels based on range value
 */
const getDigitalUnit = (range: number): { low: string; high: string } => {
  const digitalUnits: { [key: number]: { low: string; high: string } } = {
    1: { low: 'Off', high: 'On' },
    2: { low: 'Close', high: 'Open' },
    3: { low: 'Stop', high: 'Start' },
    4: { low: 'Disable', high: 'Enable' },
    5: { low: 'Normal', high: 'Alarm' },
    6: { low: 'Normal', high: 'High' },
    7: { low: 'Normal', high: 'Low' },
    8: { low: 'No', high: 'Yes' },
    9: { low: 'Cool', high: 'Heat' },
    10: { low: 'Unoccupy', high: 'Occupy' },
    11: { low: 'Low', high: 'High' },
    12: { low: 'On', high: 'Off' },
    13: { low: 'Open', high: 'Close' },
    14: { low: 'Start', high: 'Stop' },
    15: { low: 'Enable', high: 'Disable' },
    16: { low: 'Alarm', high: 'Normal' },
    17: { low: 'High', high: 'Normal' },
    18: { low: 'Low', high: 'Normal' },
    19: { low: 'Yes', high: 'No' },
    20: { low: 'Heat', high: 'Cool' },
    21: { low: 'Occupy', high: 'Unoccupy' },
    22: { low: 'High', high: 'Low' }
  }

  return digitalUnits[range] || { low: 'Low', high: 'High' }
}

/**
 * Generate device ID from inputItem (point_type + point_number)
 */
const generateDeviceId = (pointType: number, pointNumber: number): string => {
  const typeString = mapPointTypeToString(pointType)
  const deviceIndex = pointNumber + 1  // Convert 0-based to 1-based
  return `${typeString}${deviceIndex}`
}

/**
 * Map point type number to string prefix based on BAC definitions
 * T3000 point_type values are 1-based, but BAC defines are 0-based
 * So we subtract 1 from point_type to get the correct BAC define
 */
const mapPointTypeToString = (pointType: number): string => {
  const bacDefine = pointType - 1; // Convert T3000 1-based to BAC 0-based

  switch (bacDefine) {
    case 0: return 'OUT'    // BAC_OUT = 0
    case 1: return 'IN'     // BAC_IN = 1
    case 2: return 'VAR'    // BAC_VAR = 2
    case 3: return 'PID'    // BAC_PID = 3
    case 4: return 'SCH'    // BAC_SCH = 4
    case 5: return 'HOL'    // BAC_HOL = 5
    case 6: return 'PRG'    // BAC_PRG = 6
    case 7: return 'TBL'    // BAC_TBL = 7
    case 8: return 'DMON'   // BAC_DMON = 8
    case 9: return 'AMON'   // BAC_AMON = 9
    case 10: return 'GRP'   // BAC_GRP = 10
    case 11: return 'AY'    // BAC_AY = 11
    case 12: return 'ALARMM' // BAC_ALARMM = 12
    case 13: return 'UNIT'  // BAC_UNIT = 13
    case 14: return 'USER_NAME' // BAC_USER_NAME = 14
    case 15: return 'ALARMS' // BAC_ALARMS = 15
    case 16: return 'WR_TIME' // BAC_WR_TIME = 16
    case 17: return 'AR_Y'  // BAC_AR_Y = 17
    default: return ''
  }
}

/**
 * Get point type info for debugging (using existing function)
 */

/**
 * Process device value based on panel data and input range
 */
const processDeviceValue = (panelData: any, inputRangeValue: number): { value: number; displayValue: string; unit: string } => {
  // Determine if device is analog or digital
  const isAnalog = isAnalogDevice(panelData, inputRangeValue)

  // Get the correct raw value from panel data
  const rawValue = getDeviceValue(panelData, isAnalog)

  // **CRITICAL DEBUG FOR FIRST ITEM ISSUE**
  if (panelData.id === 'IN1') {
    LogUtil.Info(`🚨 FIRST ITEM DEBUG - IN1 Processing:`, {
      deviceId: panelData.id,
      inputRangeValue,
      isAnalog,
      rawValue,
      panelDataValue: panelData.value,
      panelDataControl: panelData.control,
      panelDataDigitalAnalog: panelData.digital_analog,
      panelDataRange: panelData.range,
      willDivideBy1000: isAnalog
    })
  }

  if (isAnalog) {
    // Analog processing: only divide by 1000 if value is larger than 1000
    // This handles cases where some values are already in correct scale
    let processedValue: number
    if (rawValue > 1000) {
      processedValue = rawValue / 1000
      LogUtil.Info(`📊 TrendLogModal: Large analog value divided by 1000:`, {
        deviceId: panelData.id,
        rawValue,
        processedValue,
        operation: 'DIVIDED_BY_1000'
      })
    } else {
      processedValue = rawValue
      LogUtil.Info(`📊 TrendLogModal: Small analog value used as-is:`, {
        deviceId: panelData.id,
        rawValue,
        processedValue,
        operation: 'USED_AS_IS'
      })
    }

    const unit = getAnalogUnit(panelData.range)

    LogUtil.Info(`📊 TrendLogModal: Analog value processing:`, {
      deviceId: panelData.id,
      rawValue,
      processedValue,
      unit,
      panelDataRange: panelData.range
    })

    // **ADDITIONAL DEBUG FOR FIRST ITEM**
    if (panelData.id === 'IN1') {
      LogUtil.Info(`🚨 FIRST ITEM FINAL RESULT:`, {
        deviceId: 'IN1',
        rawValue,
        processedValue,
        wasLargerThan1000: rawValue > 1000,
        expectedIfRawWas8000: 8000 / 1000,
        expectedIfRawWas8: 8,
        actualResult: processedValue
      })
    }

    return {
      value: processedValue,
      displayValue: `${processedValue.toFixed(2)}`,
      unit: unit
    }
  } else {
    // Digital processing: use control value as-is with state labels
    const digitalStates = getDigitalUnit(panelData.range)
    const displayValue = rawValue > 0 ? `1 (${digitalStates.high})` : `0 (${digitalStates.low})`

    LogUtil.Info(`📊 TrendLogModal: Digital value processing:`, {
      deviceId: panelData.id,
      rawValue,
      displayValue,
      digitalStates,
      panelDataRange: panelData.range
    })

    return {
      value: rawValue,
      displayValue: displayValue,
      unit: ''
    }
  }
}

/**
 * Send GET_ENTRIES request for a single device
 */
const sendGetEntriesRequest = async (dataClient: any, panelId: number, deviceIndex: number, deviceType: string): Promise<void> => {
  const requestData = [{
    panelId: panelId,
    index: deviceIndex,
    type: deviceType
  }]

  LogUtil.Info(`📤 TrendLogModal: Preparing GET_ENTRIES request:`, {
    panelId,
    deviceIndex,
    deviceType,
    requestData,
    clientType: dataClient?.constructor?.name,
    hasGetEntriesMethod: typeof dataClient?.GetEntries === 'function',
    clientConnectionStatus: dataClient?.socket?.readyState || 'unknown'
  })

  if (dataClient && dataClient.GetEntries) {
    try {
      LogUtil.Info(`🚀 TrendLogModal: Calling GetEntries method on ${dataClient.constructor.name}`)
      const result = dataClient.GetEntries(requestData)
      LogUtil.Info(`📨 TrendLogModal: GetEntries call completed, result:`, result)

      // Log additional client state for debugging
      if (dataClient.socket) {
        LogUtil.Info(`🔌 TrendLogModal: WebSocket state:`, {
          readyState: dataClient.socket.readyState,
          readyStateText: ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'][dataClient.socket.readyState],
          url: dataClient.socket.url
        })
      }

      if (dataClient.messageData) {
        const currentTime = new Date()
        const timeString = currentTime.toLocaleTimeString() + '.' + currentTime.getMilliseconds().toString().padStart(3, '0')
        LogUtil.Info(`📜 TrendLogModal: Last message data [${timeString}]:`, dataClient.messageData)

        // Track FFI API request timing for interval analysis (local tracking)
        const requestTime = {
          timestamp: currentTime.getTime(),
          timeString: timeString,
          panelsCount: Array.isArray(dataClient.messageData) ? dataClient.messageData.length : 0,
          modbusCount: 0
        }

        // Simple interval logging without global state
        LogUtil.Info(`⏱️ TrendLogModal: FFI API request at: ${timeString}`)
      }

    } catch (error) {
      LogUtil.Error('�?TrendLogModal: Error calling GetEntries:', error)
    }
  } else {
    LogUtil.Error('�?TrendLogModal: GetEntries method not available:', {
      hasDataClient: !!dataClient,
      clientType: dataClient?.constructor?.name,
      availableMethods: dataClient ? Object.getOwnPropertyNames(Object.getPrototypeOf(dataClient)) : 'N/A'
    })
  }
}

/**
 * Send GET_ENTRIES requests for multiple devices
 */
const sendBatchGetEntriesRequest = async (dataClient: any, requests: Array<{panelId: number, index: number, type: string}>): Promise<void> => {
  LogUtil.Info(`📤 TrendLogModal: Sending batch GET_ENTRIES request for ${requests.length} devices:`, requests)

  if (dataClient && dataClient.GetEntries) {
    dataClient.GetEntries(requests)
  } else {
    LogUtil.Error('�?TrendLogModal: No GetEntries method available on data client')
  }
}

/**
 * Enhanced device lookup with proper mapping
 */
const findDeviceByGeneratedId = (panelData: any[], deviceId: string): any => {
  LogUtil.Info(`🔍 TrendLogModal: Looking for device with ID: ${deviceId}`)

  const matchingDevice = panelData.find(device => device.id === deviceId)

  if (matchingDevice) {
    LogUtil.Info(`�?TrendLogModal: Found device:`, {
      id: matchingDevice.id,
      value: matchingDevice.value,
      label: matchingDevice.label,
      unit: matchingDevice.unit
    })
  } else {
    LogUtil.Info(`�?TrendLogModal: No device found with ID: ${deviceId}`)
  }

  return matchingDevice
}

/**
 * Log device mapping details for debugging
 *
 *  {
      "network": 0,
      "panel": 3,
      "point_number": 11,
      "point_type": 2,
      "sub_panel": 0
    }
 */
const logDeviceMapping = (inputItem: any, index: number, rangeValue: number) => {
  const deviceId = generateDeviceId(inputItem.point_type, inputItem.point_number)
  const pointTypeInfo = getPointTypeInfo(inputItem.point_type)

  LogUtil.Info(`📊 TrendLogModal: Input Item ${index + 1} Enhanced Mapping:`, {
    inputItem,
    pointType: inputItem.point_type,
    pointNumber: inputItem.point_number,
    pointTypeInfo,
    generatedDeviceId: deviceId,
    rangeValue,
    deviceIdBreakdown: {
      typeString: mapPointTypeToString(inputItem.point_type),
      deviceIndex: inputItem.point_number + 1,
      formula: `${mapPointTypeToString(inputItem.point_type)}${inputItem.point_number + 1}`
    },
    rangeAnalysis: {
      inputRange: rangeValue,
      isAnalogByRange: rangeValue === 0,
      isDigitalByRange: rangeValue === 1,
      rangeCategory: rangeValue === 0 ? 'Analog' : rangeValue === 1 ? 'Digital' : 'Unknown'
    },
    processingPlan: {
      willUseValueField: rangeValue === 0,
      willUseControlField: rangeValue === 1,
      willDivideBy1000: rangeValue === 0,
      willShowDigitalStates: rangeValue === 1
    }
  })

  return deviceId
}



/**
 * Setup message handlers for GET_ENTRIES responses
 */
const setupGetEntriesResponseHandlers = (dataClient: any) => {
  LogUtil.Info('🔧 TrendLogModal: Setting up GET_ENTRIES response handlers')
  LogUtil.Info('🔧 TrendLogModal: Client details:', {
    clientType: dataClient?.constructor?.name,
    hasHandleGetEntriesRes: typeof dataClient?.HandleGetEntriesRes === 'function',
    originalHandlerExists: !!dataClient?.HandleGetEntriesRes
  })

  if (!dataClient) {
    LogUtil.Error('�?TrendLogModal: No dataClient provided to setupGetEntriesResponseHandlers')
    return
  }

  // Store original handler if it exists
  const originalHandler = dataClient.HandleGetEntriesRes
  LogUtil.Info('💾 TrendLogModal: Stored original handler:', typeof originalHandler)

  // Create our custom handler
  dataClient.HandleGetEntriesRes = (msgData: any) => {
    LogUtil.Info('📨 TrendLogModal: === GET_ENTRIES RESPONSE RECEIVED ===')
    LogUtil.Info('📨 TrendLogModal: Full response data:', msgData)
    LogUtil.Info('📨 TrendLogModal: Response structure:', {
      hasData: !!msgData.data,
      dataType: typeof msgData.data,
      isArray: Array.isArray(msgData.data),
      dataLength: msgData.data?.length,
      action: msgData.action,
      status: msgData.status,
      error: msgData.error
    })

    try {
      if (msgData.data && Array.isArray(msgData.data)) {
        LogUtil.Info('�?TrendLogModal: Valid data array received, processing...')
        updateChartWithNewData(msgData.data)
      } else if (msgData.data) {
        LogUtil.Info('⚠️ TrendLogModal: Data received but not array format:', msgData.data)
      } else {
        LogUtil.Info('�?TrendLogModal: No data in response or data is null/undefined')
      }
    } catch (error) {
      LogUtil.Error('�?TrendLogModal: Error processing GET_ENTRIES response:', error)
    }

    // Call original handler if it existed
    if (originalHandler && typeof originalHandler === 'function') {
      LogUtil.Info('🔄 TrendLogModal: Calling original HandleGetEntriesRes handler')
      try {
        originalHandler.call(dataClient, msgData)
      } catch (error) {
        LogUtil.Error('�?TrendLogModal: Error calling original handler:', error)
      }
    } else {
      LogUtil.Info('ℹ️ TrendLogModal: No original handler to call')
    }
    LogUtil.Info('📨 TrendLogModal: === GET_ENTRIES RESPONSE PROCESSING COMPLETE ===')
  }

  LogUtil.Info('�?TrendLogModal: GET_ENTRIES response handler setup complete')
}

/**
 * Update chart with new data from GET_ENTRIES response
 */
const updateChartWithNewData = (newData: any[]) => {
  LogUtil.Info('📈 TrendLogModal: Updating chart with new data:', newData)

  const currentTime = Date.now()

  // Update each data series with new values
  newData.forEach((dataPoint, index) => {
    if (index < dataSeries.value.length && dataSeries.value[index]) {
      const newPoint: DataPoint = {
        timestamp: currentTime,
        value: parseFloat(dataPoint.value) || 0
      }

      // Add new point to series data
      dataSeries.value[index].data.push(newPoint)

      // Keep only recent data points (last 100 points to prevent memory issues)
      const maxDataPoints = 100
      if (dataSeries.value[index].data.length > maxDataPoints) {
        dataSeries.value[index].data = dataSeries.value[index].data.slice(-maxDataPoints)
      }

      LogUtil.Info(`📊 TrendLogModal: Updated series ${index} with value: ${newPoint.value}`)
    }
  })

  // Update the chart if it exists
  if (chartInstance) {
    updateChart()
  }
}

const getTimeRangeMinutes = (range: string): number => {
  const ranges = {
    '5m': 5,        // 5 minutes
    '10m': 10,      // 10 minutes
    '30m': 30,      // 30 minutes
    '1h': 60,       // 1 hour
    '4h': 240,      // 4 hours
    '12h': 720,     // 12 hours
    '1d': 1440,     // 1 day
    '4d': 5760      // 4 days
  }
  return ranges[range] || 60
}

const initializeData = async () => {
  LogUtil.Info('🚀 TrendLogModal: Starting data initialization...', {
    currentDataSeriesLength: dataSeries.value.length,
    hasMonitorConfig: !!monitorConfig.value,
    monitorInputItemsLength: monitorConfig.value?.inputItems?.length || 0
  })

  // First, try to initialize with real T3000 data
  const monitorConfigData = monitorConfig.value
  if (monitorConfigData && monitorConfigData.inputItems && monitorConfigData.inputItems.length > 0) {
    LogUtil.Info('🌐 *** USING REAL T3000 DATA *** - TrendLogModal: Real monitor data available, initializing with real data series')

    // Quick check: if we already have recent data, skip unnecessary re-fetching
    const hasRecentData = dataSeries.value.length > 0 &&
                         dataSeries.value.some(series => series.data.length > 0)

    if (hasRecentData) {
      LogUtil.Info('�?TrendLogModal: Recent data already available, skipping refetch')
      return
    }

    LogUtil.Info('📡 Real T3000 Data Source Info:', {
      totalInputItems: monitorConfigData.inputItems.length,
      hasRanges: monitorConfigData.ranges && monitorConfigData.ranges.length > 0,
      monitorId: monitorConfigData.id,
      dataType: 'REAL_T3000_DATA'
    })
    LogUtil.Info('📊 TrendLogModal: Monitor config details:', {
      id: monitorConfigData.id,
      inputItemsCount: monitorConfigData.inputItems.length,
      rangesCount: monitorConfigData.ranges.length,
      dataInterval: monitorConfigData.dataIntervalMs
    })

    try {
      // Test the real data fetching system
      LogUtil.Info('🔄 TrendLogModal: Testing real data fetch...')

      // Immediately indicate we're loading real data
      isLoading.value = true

      const realTimeData = await fetchRealTimeMonitorData()

      if (realTimeData && realTimeData.length > 0) {
        LogUtil.Info('�?TrendLogModal: Real data fetch successful, got', realTimeData.length, 'data series')

        // Log sample data for first few series
        realTimeData.slice(0, 3).forEach((seriesData, index) => {
          LogUtil.Info(`📈 TrendLogModal: Series ${index} sample data:`, {
            dataPointsCount: seriesData.length,
            firstPoint: seriesData[0],
            lastPoint: seriesData[seriesData.length - 1]
          })
        })

        await initializeRealDataSeries()

        // Clear loading state immediately after successful initialization
        isLoading.value = false

        // Update chart immediately to show data without delay
        updateChart()

        // Force a UI update to ensure immediate rendering
        nextTick(() => {
          updateChart()
        })

        return
      } else {
        LogUtil.Info('⚠️ TrendLogModal: Real data fetch returned empty results')
        isLoading.value = false
      }
    } catch (error) {
      LogUtil.Error('�?TrendLogModal: Failed to initialize real data series:', error)
      isLoading.value = false // Clear loading state on error
    }
  } else {
    LogUtil.Info('🔍 TrendLogModal: No real monitor data available, maintaining empty state')
    LogUtil.Info('📊 Empty State Configuration:', {
      configExists: !!monitorConfigData,
      hasInputItems: !!(monitorConfigData?.inputItems),
      inputItemsLength: monitorConfigData?.inputItems?.length || 0,
      scheduleDataExists: !!currentItemData.value,
      scheduleId: (currentItemData.value as any)?.t3Entry?.id,
      panelsDataLength: T3000_Data.value.panelsData?.length || 0,
      dataType: 'NO_DATA_AVAILABLE'
    })
    isLoading.value = false
  }

  // If no data series available, maintain empty state (no mock/test data generation)
  if (dataSeries.value.length === 0) {
    LogUtil.Info('🚫 TrendLogModal: No data series available, maintaining empty state')
    return
  }

  // For real data series, update the chart
  updateChart()
}

const addRealtimeDataPoint = async () => {
  // Only add data if we're in real-time mode
  if (!isRealTime.value) return

  // Safety check: If no data series exist, don't generate mock data
  if (dataSeries.value.length === 0) {
    LogUtil.Info('No data series available for real-time updates, skipping')
    return
  }

  const now = new Date()
  const callTimeString = now.toLocaleTimeString() + '.' + now.getMilliseconds().toString().padStart(3, '0')

  // Simple polling call logging without global state
  LogUtil.Info(`🔄 TrendLogModal: addRealtimeDataPoint called [${callTimeString}] - FFI API data point`)

  // 🔧 Use actual timestamp for real data points (not aligned to minutes)
  // This allows showing multiple data points per minute interval
  const timestamp = now.getTime()

  // Check if we have real monitor configuration for live data
  const monitorConfigData = monitorConfig.value

  if (monitorConfigData && monitorConfigData.inputItems.length > 0) {
    // Use real-time data from T3000
    try {
      const realTimeData = await fetchRealTimeMonitorData()

      dataSeries.value.forEach((series, index) => {
        if (series.isEmpty || !realTimeData[index]) return

        // Get the latest real data point
        const latestData = realTimeData[index]
        if (latestData && latestData.length > 0) {
          const latestPoint = latestData[latestData.length - 1]
          const newPoint = {
            timestamp: timestamp,
            value: latestPoint.value
          }

          series.data.push(newPoint)

          // Remove old points to maintain window size
          const maxDataPoints = Math.max(100, getTimeRangeMinutes(timeBase.value) / 5)
          if (series.data.length > maxDataPoints) {
            series.data.shift()
          }
        }
      })

      LogUtil.Debug('Added real-time data points from T3000')
      // Update sync time only when real data is successfully processed
      lastSyncTime.value = new Date().toLocaleTimeString()
    } catch (error) {
      LogUtil.Warn('Failed to get real-time data, falling back to mock data:', error)
      // Fall back to mock data generation
      addMockRealtimeDataPoint(timestamp)
    }
  } else {
    // Use mock data generation
    addMockRealtimeDataPoint(timestamp)
  }

  updateChart()
}

const addMockRealtimeDataPoint = (timestamp: number) => {
  // Safety check: Don't add mock data if no series exist
  if (dataSeries.value.length === 0) {
    LogUtil.Info('No data series available for mock real-time updates, skipping')
    return
  }

  dataSeries.value.forEach((series, index) => {
    if (series.isEmpty) return

    let newValue: number

    if (series.unitType === 'digital') {
      // Digital data: Randomly change state occasionally (simulate T3000 digital input changes)
      const lastValue = series.data.length > 0 ? series.data[series.data.length - 1].value : 0
      // 3% chance to change state each update (simulating real digital state changes)
      if (Math.random() < 0.03) {
        newValue = lastValue === 1 ? 0 : 1
      } else {
        newValue = lastValue
      }
    } else {
      // Analog data: Generate realistic continuous values
      const unitCode = series.unitCode
      const lastPoint = series.data[series.data.length - 1]
      const lastValue = lastPoint ? lastPoint.value : 0

      // Different variation patterns based on unit type
      let variation: number
      if (unitCode === 31 || unitCode === 32) { // Temperature
        variation = Math.sin(Date.now() * 0.0001) * 1 + Math.random() * 0.5 - 0.25
      } else if (unitCode === 54) { // Percent
        variation = Math.sin(Date.now() * 0.0002) * 5 + Math.random() * 2 - 1
      } else if (unitCode === 44) { // Volts
        variation = Math.sin(Date.now() * 0.0001) * 0.2 + Math.random() * 0.1 - 0.05
      } else if (unitCode === 49) { // Watts
        variation = Math.sin(Date.now() * 0.0001) * 10 + Math.random() * 5 - 2.5
      } else if (unitCode === 42) { // CFM
        variation = Math.sin(Date.now() * 0.0001) * 50 + Math.random() * 20 - 10
      } else {
        variation = Math.sin(Date.now() * 0.0001) * 2 + Math.random() * 1 - 0.5
      }

      newValue = Math.max(0, lastValue + variation) // Ensure non-negative
    }

    // Only add new point if timestamp is different from last point (avoid duplicates)
    const lastTimestamp = series.data.length > 0 ? series.data[series.data.length - 1].timestamp : 0
    if (timestamp > lastTimestamp) {
      series.data.push({ timestamp, value: newValue })

      // Keep only the last 500 points for performance (approximately 8+ hours of data)
      if (series.data.length > 500) {
        series.data.shift()
      }
    }
  })

  // Note: We don't update lastSyncTime here since this is mock data, not real sync
}

const createChart = () => {
  if (!chartCanvas.value) return

  const ctx = chartCanvas.value.getContext('2d')
  if (!ctx) return

  // Destroy existing chart
  if (chartInstance) {
    chartInstance.destroy()
  }

  chartInstance = new Chart(ctx, getChartConfig())
}

const updateChart = () => {
  if (!chartInstance) return

  chartInstance.data.datasets = dataSeries.value
    .filter(series => series.visible && series.data.length > 0)
    .map(series => {
      // Ensure data points are sorted by timestamp for proper line drawing
      const sortedData = series.data
        .slice()
        .sort((a, b) => a.timestamp - b.timestamp)
        .map(point => ({
          x: point.timestamp,
          y: point.value
        }))

      return {
        label: series.name,
        data: sortedData,
        borderColor: series.color,
        backgroundColor: series.color + '20',
        borderWidth: 2,
        fill: false,
        // Apply step-line for digital, smooth/straight for analog
        stepped: series.unitType === 'digital' ? 'middle' as const : false,
        tension: series.unitType === 'analog' && smoothLines.value ? 0.4 : 0,
        pointRadius: showPoints.value ? 3 : 0,  // Hide points completely when disabled
        pointHoverRadius: 6,
        pointBackgroundColor: series.color,
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        // Ensure point style makes end points visible
        pointStyle: 'circle' as const,
        // Ensure line segments are drawn between all consecutive points
        spanGaps: false
      }
    })  // Update x-axis configuration based on current timebase and navigation
  if (chartInstance.options.scales?.x) {
    const xScale = chartInstance.options.scales.x as any

    // Use new tick configuration based on timebase
    const tickConfig = getXAxisTickConfig(timeBase.value)
    const displayFormat = getDisplayFormat(timeBase.value)

    xScale.time = {
      unit: tickConfig.unit,
      stepSize: tickConfig.stepMinutes,
      displayFormats: {
        minute: displayFormat,
        hour: displayFormat,
        day: 'dd/MM HH:mm'
      },
      // Remove round to prevent timestamp rounding that affects line drawing
      minUnit: 'second'
    }

    // Calculate max ticks based on timebase for proper grid division
    const maxTicksConfigs = {
      '5m': 6,    // 5 intervals + 1 (every 1 minute)
      '10m': 6,   // 5 intervals + 1 (every 2 minutes)
      '30m': 7,   // 6 intervals + 1 (every 5 minutes)
      '1h': 7,    // 6 intervals + 1 (every 10 minutes)
      '4h': 9,    // 8 intervals + 1 (every 30 minutes)
      '12h': 13,  // 12 intervals + 1 (every 1 hour)
      '1d': 13,   // 12 intervals + 1 (every 2 hours)
      '4d': 13    // 12 intervals + 1 (every 8 hours)
    }

    xScale.ticks = {
      ...xScale.ticks,
      maxTicksLimit: maxTicksConfigs[timeBase.value] || 7,
      maxRotation: 0,
      minRotation: 0,
      includeBounds: true  // Force Chart.js to include boundary ticks
    }
    xScale.grid = {
      color: showGrid.value ? '#e0e0e0' : 'transparent',
      display: showGrid.value,
      lineWidth: 1
    }

    // 🔧 FIX #1: Always use the current time window, not data bounds
    // This ensures x-axis always shows correct timebase ticks regardless of data state
    const timeWindow = getCurrentTimeWindow()
    xScale.min = timeWindow.min
    xScale.max = timeWindow.max
  }

  // Update y-axis grid configuration
  if (chartInstance.options.scales?.y) {
    const yScale = chartInstance.options.scales.y as any
    yScale.grid = {
      color: showGrid.value ? '#e0e0e0' : 'transparent',
      display: showGrid.value,
      lineWidth: 1
    }
  }

  chartInstance.update('none')
}

// Series control methods
const enableAllSeries = () => {
  dataSeries.value.forEach(series => {
    series.visible = true
  })
  updateChart()
}

const disableAllSeries = () => {
  dataSeries.value.forEach(series => {
    series.visible = false
  })
  updateChart()
}

const toggleAnalogSeries = () => {
  const enableAnalog = !allAnalogEnabled.value
  dataSeries.value.forEach(series => {
    if (series.unitType === 'analog') {
      series.visible = enableAnalog
    }
  })
  updateChart()
}

const toggleDigitalSeries = () => {
  const enableDigital = !allDigitalEnabled.value
  dataSeries.value.forEach(series => {
    if (series.unitType === 'digital') {
      series.visible = enableDigital
    }
  })
  updateChart()
}


// New control functions - Updated to use timeOffset and regenerate data
const moveTimeLeft = async () => {
  if (isRealTime.value) return

  // Move time window left by exactly the timebase period
  const shiftMinutes = getTimeRangeMinutes(timeBase.value)

  // Update the time offset to track navigation
  timeOffset.value -= shiftMinutes

  // Regenerate data for the new time window
  await initializeData()

  // message.info(`Moved ${shiftMinutes} minutes back`)
}

const moveTimeRight = async () => {
  if (isRealTime.value) return

  // Move time window right by exactly the timebase period
  const shiftMinutes = getTimeRangeMinutes(timeBase.value)

  // Update the time offset to track navigation
  timeOffset.value += shiftMinutes

  // Regenerate data for the new time window
  await initializeData()

  // message.info(`Moved ${shiftMinutes} minutes forward`)
}

const zoomIn = () => {
  const currentIndex = timebaseProgression.indexOf(timeBase.value)
  if (currentIndex > 0) {
    const newTimebase = timebaseProgression[currentIndex - 1]
    timeBase.value = newTimebase
    onTimeBaseChange()
    // message.info(`Zoomed in to ${getTimeBaseLabel()}`)
  }
}

const zoomOut = () => {
  const currentIndex = timebaseProgression.indexOf(timeBase.value)
  if (currentIndex >= 0 && currentIndex < timebaseProgression.length - 1) {
    const newTimebase = timebaseProgression[currentIndex + 1]
    timeBase.value = newTimebase
    onTimeBaseChange()
    // message.info(`Zoomed out to ${getTimeBaseLabel()}`)
  }
}

const resetToDefaultTimebase = () => {
  timeBase.value = '5m'
  timeOffset.value = 0 // Reset time navigation as well
  onTimeBaseChange()
  // message.info('Reset to default 5 minutes timebase')
}

const setView = (viewNumber: number) => {
  currentView.value = viewNumber

  // Different view configurations
  const viewConfigs = {
    1: {
      showGrid: true,
      showLegend: false,
      smoothLines: false,
      showPoints: false,
      title: 'Standard View',
      description: 'Grid lines enabled for comprehensive data analysis'
    },
    2: {
      showGrid: false,
      showLegend: false,
      smoothLines: true,
      showPoints: false,
      title: 'Clean View',
      description: 'Minimalist display with smooth lines for focused viewing'
    },
    3: {
      showGrid: true,
      showLegend: false,
      smoothLines: true,
      showPoints: false,
      title: 'Detailed View',
      description: 'All features enabled for maximum data visualization detail'
    }
  }

  const config = viewConfigs[viewNumber]
  if (config) {
    showGrid.value = config.showGrid
    showLegend.value = config.showLegend
    smoothLines.value = config.smoothLines
    showPoints.value = config.showPoints

    if (chartInstance) {
      chartInstance.destroy()
      createChart()
    }

    /*
    // Show alert with view details
    viewAlert.value = {
      visible: true,
      message: `Switched to ${config.title}`
    }

    // Auto-hide alert after 4 seconds
    setTimeout(() => {
      viewAlert.value.visible = false
    }, 4000)
    */
  }
}

// Event handlers
const onTimeBaseChange = async () => {
  if (timeBase.value !== 'custom') {
    // Reset time offset when timebase changes
    timeOffset.value = 0
    await initializeData()
  }
}

const onCustomDateChange = async () => {
  if (timeBase.value === 'custom' && customStartDate.value && customEndDate.value) {
    // Generate data for custom date range
    await initializeData()
    // Force chart recreation to ensure proper axis scaling
    if (chartInstance) {
      chartInstance.destroy()
      createChart()
    }
  }
}

// Custom Date Modal Functions
const applyCustomDateRange = () => {
  if (customStartDate.value && customEndDate.value && customStartTime.value && customEndTime.value) {
    // Combine date and time
    const startDateTime = customStartDate.value
      .hour(customStartTime.value.hour())
      .minute(customStartTime.value.minute())
      .second(0)
      .millisecond(0)

    const endDateTime = customEndDate.value
      .hour(customEndTime.value.hour())
      .minute(customEndTime.value.minute())
      .second(0)
      .millisecond(0)

    // Validation
    if (endDateTime.isBefore(startDateTime)) {
      message.error('End time must be after start time')
      return
    }

    // Update the existing customStartDate and customEndDate with combined date+time
    customStartDate.value = startDateTime
    customEndDate.value = endDateTime

    // Set timebase to custom and apply changes
    timeBase.value = 'custom'
    customDateModalVisible.value = false
    onCustomDateChange()
    message.success('Custom date range applied successfully')
  } else {
    message.error('Please select both start and end date/time')
  }
}

const cancelCustomDateRange = () => {
  customDateModalVisible.value = false
  // Reset selections if needed
}

const setQuickRange = (range: string) => {
  const now = dayjs()

  switch (range) {
    case 'today':
      customStartDate.value = now.startOf('day')
      customEndDate.value = now.endOf('day')
      customStartTime.value = dayjs().hour(0).minute(0)
      customEndTime.value = dayjs().hour(23).minute(59)
      break
    case 'yesterday':
      const yesterday = now.subtract(1, 'day')
      customStartDate.value = yesterday.startOf('day')
      customEndDate.value = yesterday.endOf('day')
      customStartTime.value = dayjs().hour(0).minute(0)
      customEndTime.value = dayjs().hour(23).minute(59)
      break
    case 'thisWeek':
      customStartDate.value = now.startOf('week')
      customEndDate.value = now.endOf('week')
      customStartTime.value = dayjs().hour(0).minute(0)
      customEndTime.value = dayjs().hour(23).minute(59)
      break
    case 'lastWeek':
      const lastWeek = now.subtract(1, 'week')
      customStartDate.value = lastWeek.startOf('week')
      customEndDate.value = lastWeek.endOf('week')
      customStartTime.value = dayjs().hour(0).minute(0)
      customEndTime.value = dayjs().hour(23).minute(59)
      break
  }
}

const formatDateTimeRange = () => {
  if (customStartDate.value && customEndDate.value && customStartTime.value && customEndTime.value) {
    const start = customStartDate.value
      .hour(customStartTime.value.hour())
      .minute(customStartTime.value.minute())
    const end = customEndDate.value
      .hour(customEndTime.value.hour())
      .minute(customEndTime.value.minute())

    return `${start.format('DD/MM/YYYY HH:mm')} - ${end.format('DD/MM/YYYY HH:mm')}`
  }
  return ''
}

const onRealTimeToggle = (checked: boolean) => {
  LogUtil.Info(`🔄 TrendLogModal: Auto Scroll toggle - ${checked ? 'ON' : 'OFF'}`, {
    currentDataSeriesLength: dataSeries.value.length,
    hasRealData: !!monitorConfig.value?.inputItems?.length
  })

  if (checked) {
    // Reset time offset when switching to real-time
    timeOffset.value = 0
    // Regenerate data for current time
    initializeData()
    startRealTimeUpdates()
  } else {
    stopRealTimeUpdates()
    // Clear any stale monitor config and data series to ensure clean state
    LogUtil.Info('🧹 TrendLogModal: Clearing monitor config and data series on Auto Scroll OFF')
    monitorConfig.value = null
    dataSeries.value = []
  }
}

const onSeriesVisibilityChange = (index) => {
  LogUtil.Debug(`Toggling visibility for series ${dataSeries.value[index].name}`)
  toggleSeriesVisibility(index)
}

const toggleSeriesVisibility = (index: number, event?: Event) => {
  // Stop event propagation to prevent triggering parent handlers
  if (event && typeof event.stopPropagation === 'function') {
    event.stopPropagation()
  }

  if (dataSeries.value[index].isEmpty) return
  dataSeries.value[index].visible = !dataSeries.value[index].visible
  updateChart()
  LogUtil.Debug(`Toggled visibility for series ${dataSeries.value[index].name} to ${dataSeries.value[index].visible}`)
}

const toggleSeriesExpansion = (index: number, event?: Event) => {
  // Stop event propagation to prevent triggering parent handlers
  if (event && typeof event.stopPropagation === 'function') {
    event.stopPropagation()
  }

  if (dataSeries.value[index].isEmpty) return

  if (expandedSeries.value.has(index)) {
    expandedSeries.value.delete(index)
  } else {
    expandedSeries.value.add(index)
  }
}

const startRealTimeUpdates = () => {
  if (realtimeInterval) {
    clearInterval(realtimeInterval)
  }

  // Use monitor config data interval if available, otherwise fallback to default
  const monitorConfigData = monitorConfig.value
  const dataInterval = monitorConfigData?.dataIntervalMs || updateInterval.value

  // 🔍 DEBUG: Add detailed logging to trace interval calculation
  const setupTime = new Date()
  const setupTimeString = setupTime.toLocaleTimeString() + '.' + setupTime.getMilliseconds().toString().padStart(3, '0')

  LogUtil.Info(`🔄 TrendLogModal: Starting real-time updates [${setupTimeString}] with detailed interval analysis:`, {
    'monitorConfig.value exists': !!monitorConfig.value,
    'monitorConfigData': monitorConfigData,
    'monitorConfigData?.dataIntervalMs': monitorConfigData?.dataIntervalMs,
    'updateInterval.value (computed)': updateInterval.value,
    'actualInterval selected': dataInterval,
    intervalSeconds: dataInterval / 1000,
    intervalMinutes: dataInterval / 60000,
    'Raw monitorConfig': monitorConfig.value
  })

  // 🔍 If using computed updateInterval, log the calculation details
  if (!monitorConfigData?.dataIntervalMs) {
    LogUtil.Info('📊 TrendLogModal: Using computed updateInterval, calculating from monitorConfig:')
    const calculatedInterval = calculateT3000Interval(monitorConfig.value)
    LogUtil.Info('📊 TrendLogModal: Calculated interval result:', calculatedInterval)
  }

  // Track when timer starts
  LogUtil.Info(`�?TrendLogModal: Setting up polling timer [${setupTimeString}] - Next request expected at: ${new Date(Date.now() + dataInterval).toLocaleTimeString()}`)

  realtimeInterval = setInterval(addRealtimeDataPoint, dataInterval)
}

const stopRealTimeUpdates = () => {
  if (realtimeInterval) {
    clearInterval(realtimeInterval)
    realtimeInterval = null
  }
}

// Dropdown Menu Handlers
const handleTimeBaseMenu = ({ key }: { key: string }) => {
  setTimeBase(key)
}

const handleZoomMenu = ({ key }: { key: string }) => {
  // This function is no longer used since zoom is now handled by icon buttons
  // Keeping for backward compatibility if referenced elsewhere
}

const handleChartOptionsMenu = ({ key }: { key: string }) => {
  switch (key) {
    case 'grid':

    case 'json':
      exportDataJSON()
      break
  }
}

const handleAllMenu = ({ key }: { key: string }) => {
  switch (key) {
    case 'enable-all':
      enableAllSeries()
      break
    case 'disable-all':
      disableAllSeries()
      break
  }
}

const handleExportMenu = ({ key }: { key: string }) => {
  switch (key) {
    case 'png':
      exportChartPNG()
      break
    case 'jpg':
      exportChartJPG()
      break
    case 'csv':
      exportData()
      break
    case 'json':
      exportDataJSON()
      break
  }
}

const handleByTypeMenu = ({ key }: { key: string }) => {
  switch (key) {
    case 'toggle-analog':
      toggleAnalogSeries()
      break
    case 'toggle-digital':
      toggleDigitalSeries()
      break
  }
}

// Dropdown menu handlers
const handleCancel = () => {
  stopRealTimeUpdates()
  // Remove modal close since this is now just a chart component
}

// Utility functions
const getLastValue = (data: DataPoint[], series?: SeriesConfig): string => {
  if (data.length ===  0) return 'N/A'

  const lastValue = data[data.length - 1].value

  if (series?.unitType === 'digital') {
    const stateIndex = lastValue === 1 ? 1 : 0
    const stateText = series.digitalStates?.[stateIndex] || (lastValue === 1 ? 'High' : 'Low')
    return `${stateText} (${lastValue})`
  } else {
    const unit = series?.unit || ''
    return lastValue.toFixed(2) + unit
  }
}

const getAverageValue = (data: DataPoint[], series?: SeriesConfig): string => {
  if (data.length === 0) return 'N/A'

  const avg = data.reduce((sum, point) => sum + point.value, 0) / data.length

  if (series?.unitType === 'digital') {
    // For digital, show percentage of time in "high" state
    const highCount = data.filter(p => p.value === 1).length
    const percentage = (highCount / data.length) * 100
    return `${percentage.toFixed(1)}% High`
  } else {
    const unit = series?.unit || ''
    return avg.toFixed(2) + unit
  }
}

const getMinValue = (data: DataPoint[], series?: SeriesConfig): string => {
  if (data.length === 0) return 'N/A'

  const min = Math.min(...data.map(p => p.value))

  if (series?.unitType === 'digital') {
    const stateIndex = min === 1 ? 1 : 0
    const stateText = series.digitalStates?.[stateIndex] || (min === 1 ? 'High' : 'Low')
    return `${stateText} (${min})`
  } else {
    const unit = series?.unit || ''
    return min.toFixed(2) + unit
  }
}

const getMaxValue = (data: DataPoint[], series?: SeriesConfig): string => {
  if (data.length === 0) return 'N/A'

  const max = Math.max(...data.map(p => p.value))

  if (series?.unitType === 'digital') {
    const stateIndex = max === 1 ? 1 : 0
    const stateText = series.digitalStates?.[stateIndex] || (max === 1 ? 'High' : 'Low')
    return `${stateText} (${max})`
  } else {
    const unit = series?.unit || ''
    return max.toFixed(2) + unit
  }
}

const exportChart = () => {
  if (!chartInstance) return

  const link = document.createElement('a')
  link.download = `${chartTitle.value}_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.png`
  link.href = chartInstance.toBase64Image()
  link.click()

  // message.success('Chart exported successfully')
}

const exportData = () => {
  const activeSeriesData = dataSeries.value.filter(s => s.visible && !s.isEmpty)
  const csvData: string[] = []
  const headers = ['Timestamp', ...activeSeriesData.map(s => s.name)]
  csvData.push(headers.join(','))

  // Find max data length
  const maxLength = Math.max(...activeSeriesData.map(s => s.data.length))

  for (let i = 0; i < maxLength; i++) {
    const row: string[] = []
    const timestamp = activeSeriesData.find(s => s.data[i])?.data[i]?.timestamp
    if (timestamp) {
      row.push(new Date(timestamp).toISOString())
      activeSeriesData.forEach(series => {
        row.push(series.data[i]?.value?.toFixed(2) || '')
      })
      csvData.push(row.join(','))
    }
  }

  const blob = new Blob([csvData.join('\n')], { type: 'text/csv' })
  const link = document.createElement('a')
  link.download = `${chartTitle.value}_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.csv`
  link.href = URL.createObjectURL(blob)
  link.click()

  // message.success('Data exported successfully')
}

// Additional Export Methods
const exportChartPNG = () => {
  if (!chartInstance) return

  const link = document.createElement('a')
  link.download = `${chartTitle.value}_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.png`
  link.href = chartInstance.toBase64Image('image/png', 1.0)
  link.click()

  // message.success('Chart exported as PNG successfully')
}

const exportChartJPG = () => {
  if (!chartInstance) return

  const link = document.createElement('a')
  link.download = `${chartTitle.value}_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.jpg`
  link.href = chartInstance.toBase64Image('image/jpeg', 0.9)
  link.click()

  // message.success('Chart exported as JPG successfully')
}

const exportChartSVG = () => {
  if (!chartInstance) return

  // Note: Chart.js doesn't natively support SVG export
  // This would require additional library like chart.js-to-svg
  // message.info('SVG export requires additional implementation')
}

const exportDataJSON = () => {
  const activeSeriesData = dataSeries.value.filter(s => s.visible && !s.isEmpty)

  const jsonData = {
    title: chartTitle.value,
    exportedAt: new Date().toISOString(),
    timeRange: {
      start: activeSeriesData[0]?.data[0]?.timestamp,
      end: activeSeriesData[0]?.data[activeSeriesData[0]?.data.length - 1]?.timestamp
    },
    series: activeSeriesData.map(series => ({
      name: series.name,
      unit: series.unit,
      type: series.unitType,
      color: series.color,
      data: series.data.map(point => ({
        timestamp: point.timestamp,
        value: point.value
      }))
    }))
  }

  const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' })
  const link = document.createElement('a')
  link.download = `${chartTitle.value}_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.json`
  link.href = URL.createObjectURL(blob)
  link.click()

  // message.success('Data exported as JSON successfully')
}

// Chart Options Methods
const onChartOptionChange = () => {
  // Auto-refresh chart when options change
  if (chartInstance) {
    chartInstance.destroy()
    createChart()
  }
}

const resetChartOptions = () => {
  showGrid.value = true
  showLegend.value = true
  smoothLines.value = false
  showPoints.value = false

  // message.success('Chart options reset to default')
}

// Toggle methods for chart options
const toggleGridOption = () => {
  showGrid.value = !showGrid.value
  onChartOptionChange()
}

const toggleLegendOption = () => {
  showLegend.value = !showLegend.value
  onChartOptionChange()
}

const toggleSmoothOption = () => {
  smoothLines.value = !smoothLines.value
  onChartOptionChange()
}

const togglePointsOption = () => {
  showPoints.value = !showPoints.value
  onChartOptionChange()
}

// Watchers
watch([showGrid, showLegend, smoothLines, showPoints], () => {
  if (chartInstance) {
    chartInstance.destroy()
    createChart()
  }
})

// Remove modal visibility watcher since this is now always visible as a component

// Lifecycle
onMounted(async () => {
  LogUtil.Info('🚀 TrendLogModal: Component mounted - starting enhanced T3000 data integration test')

  LogUtil.Info('📊 TrendLogModal: Current item data source:', {
    usingPropsItemData: !!props.itemData,
    usingGlobalScheduleData: !props.itemData,
    itemData: currentItemData.value
  })

  LogUtil.Info('📊 TrendLogModal: Initial FFI API status:', ffiApi.isReady.value)

  // === ENHANCED T3000 REAL DATA INTEGRATION TEST ===
  LogUtil.Info('🔍 TrendLogModal: === STARTING ENHANCED T3000 REAL DATA INTEGRATION TEST ===')

  try {
    // Test 1: Data Manager Readiness Check
    LogUtil.Info('🔍 TrendLogModal: TEST 1 - FFI API Readiness Check')
    const initialReady = ffiApi.isReady.value
    LogUtil.Info(`📊 TrendLogModal: Initial FFI API status: ${initialReady}`)
    LogUtil.Info(`📊 TrendLogModal: FFI API ready: ${ffiApi.isReady.value ? 'Yes' : 'No'}`)

    // Test 2: Enhanced Monitor Configuration Extraction
    LogUtil.Info('🔍 TrendLogModal: TEST 2 - Enhanced Monitor Configuration Extraction')
    const monitorConfigData = await getMonitorConfigFromT3000Data()

    if (monitorConfigData) {
      // Set the reactive monitor config variable for all functions to use
      monitorConfig.value = monitorConfigData

      LogUtil.Info('�?TEST 2 PASSED: Monitor Configuration Found')
      LogUtil.Info('📋 TrendLogModal: Monitor Configuration:', monitorConfigData)
      LogUtil.Info(`📊 TrendLogModal: Found ${monitorConfigData.inputItems.length} input items to monitor`)
      LogUtil.Info(`⏱️ TrendLogModal: Data retrieval interval: ${monitorConfigData.dataIntervalMs}ms`)

      // Test 3: Device Mapping for each input item
      LogUtil.Info('🔍 TrendLogModal: TEST 3 - Device Mapping for all input items:')

      // Get the PID for filtering device searches
      const searchPanelId = (currentItemData.value as any)?.t3Entry?.pid
      LogUtil.Info(`📊 TrendLogModal: Using PID ${searchPanelId} for device searches`)

      for (let i = 0; i < monitorConfigData.inputItems.length; i++) {
        const inputItem = monitorConfigData.inputItems[i]
        const rangeValue = monitorConfigData.ranges[i] || 0
        const deviceId = logDeviceMapping(inputItem, i, rangeValue)

        LogUtil.Info(`📊 TrendLogModal: Device ID for input item ${i}:`, deviceId)

        // Test if we can find this device in panelsData using data manager with PID filtering
        try {
          if (searchPanelId !== undefined && searchPanelId !== null) {
            // Use FFI API to get panel data instead
            const panelData = await ffiApi.ffiGetPanelData(searchPanelId)
            const foundDevice = panelData?.entries?.find((entry: any) => entry.id === deviceId)
            if (foundDevice) {
              LogUtil.Info(`�?TEST 3.${i + 1} PASSED: Device ${deviceId} found in panelsData with PID ${searchPanelId}`, {
                id: foundDevice.id,
                label: foundDevice.label,
                pid: foundDevice.pid,
                type: foundDevice.type
              })
            } else {
              LogUtil.Warn(`�?TEST 3.${i + 1} FAILED: Device ${deviceId} not found in panel ${searchPanelId}`)
            }
          } else {
            LogUtil.Warn(`�?TEST 3.${i + 1} SKIPPED: No PID available for device search`)
          }
        } catch (error) {
          LogUtil.Warn(`�?TEST 3.${i + 1} FAILED: Device ${deviceId} NOT found in panelsData with PID ${searchPanelId}:`, error.message)

          // Fallback: Try to find device in all panels
          try {
            // Use FFI API to search across all panels
            const panelsList = await ffiApi.ffiGetPanelsList()
            let foundDeviceAnyPid: any = null

            for (const panel of panelsList || []) {
              const panelData = await ffiApi.ffiGetPanelData(panel.id)
              const device = panelData?.entries?.find((entry: any) => entry.id === deviceId)
              if (device) {
                foundDeviceAnyPid = device
                break
              }
            }

            if (foundDeviceAnyPid) {
              LogUtil.Info(`🔍 TEST 3.${i + 1} FALLBACK: Device ${deviceId} found without PID filtering:`, {
                id: foundDeviceAnyPid.id,
                label: foundDeviceAnyPid.label,
                pid: foundDeviceAnyPid.pid,
                type: foundDeviceAnyPid.type,
                note: `Found with PID ${foundDeviceAnyPid.pid} instead of expected PID ${searchPanelId}`
              })
            } else {
              LogUtil.Warn(`�?TEST 3.${i + 1} COMPLETE FAILURE: Device ${deviceId} not found in any panel`)
            }
          } catch (fallbackError) {
            LogUtil.Warn(`�?TEST 3.${i + 1} COMPLETE FAILURE: Device ${deviceId} not found even without PID filtering`)
          }
        }
      }

      // Test 4: Data Client Initialization
      LogUtil.Info('🔍 TrendLogModal: TEST 4 - Data Client Initialization:')
      const dataClient = initializeDataClients()
      if (dataClient) {
        LogUtil.Info('�?TEST 4 PASSED: Data client initialized:', dataClient.constructor.name)
        LogUtil.Info('🔧 TrendLogModal: Available client methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(dataClient)))
      } else {
        LogUtil.Warn('�?TEST 4 FAILED: No data client available')
      }

      // Test 5: Value Processing
      LogUtil.Info('🔍 TrendLogModal: TEST 5 - Value Processing Test:')
      // Test digital value processing
      const testDigitalValue = processDeviceValue({ value: '1' }, 1) // Off/On
      LogUtil.Info('�?TEST 5.1 Digital Value Processing:', testDigitalValue)

      // Test analog value processing
      const testAnalogValue = processDeviceValue({ value: '2500' }, 31) // Celsius, should be divided by 1000
      LogUtil.Info('�?TEST 5.2 Analog Value Processing:', testAnalogValue)

      LogUtil.Info('🏁 TrendLogModal: === ENHANCED T3000 REAL DATA INTEGRATION TEST COMPLETE ===')
    } else {
      LogUtil.Warn('�?TEST 2 FAILED: No Monitor Configuration Found')
      LogUtil.Info('🔍 TrendLogModal: Debugging info:')
      LogUtil.Info('📊 TrendLogModal: currentItemData.t3Entry:', (currentItemData.value as any)?.t3Entry)

      // Try to get detailed validation information
      try {
        // Use FFI API to validate data
        const isReady = ffiApi.isReady.value
        LogUtil.Info('📊 TrendLogModal: FFI API validation details:', { isReady })
      } catch (validationError) {
        LogUtil.Error('�?TrendLogModal: FFI API validation failed:', validationError)
      }
    }

  } catch (error) {
    LogUtil.Error('�?TrendLogModal: Enhanced data integration test failed:', error)
  }

  // Apply default view configuration to ensure settings are properly initialized
  setView(1)

  // Initialize chart since component is always visible
  nextTick(async () => {
    await initializeData()
    createChart()
    if (isRealTime.value) {
      startRealTimeUpdates()
    }
  })
})

onUnmounted(() => {
  stopRealTimeUpdates()
  if (chartInstance) {
    chartInstance.destroy()
  }
})
</script>

<style scoped>
.timeseries-container {
  display: flex;
  height: calc(97vh - 40px);
  /* Full viewport height minus top controls */
  /* min-height: 400px; */
  /* Minimum for small screens */
  gap: 6px;
  /* Ultra-minimal gap for maximum space */
  background: #ffffff;
  border-radius: 0px;
  /* No border radius */
  overflow: hidden;
  /* Prevent main container scrollbars */
  padding: 0;
  /* Remove any default padding */
}

.left-panel {
  width: clamp(210px, 23vw, 330px);
  /* Responsive width - adjusted values */
  background: #fafafa;
  border: 1px solid #e8e8e8;
  border-radius: 0px;
  /* No border radius */
  overflow-y: auto;
  overflow-x: hidden;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
}

.right-panel {
  flex: 1;
  background: #fafafa;
  border: 1px solid #e8e8e8;
  border-radius: 0px;
  /* No border radius */
  display: flex;
  flex-direction: column;
  min-width: 200px;
  /* Ensure readability */
  overflow: hidden;
  /* Contain content properly */
}

.control-section {
  padding: 0;
  /* Remove outer padding */
  border-bottom: 1px solid #e8e8e8;
}

.control-section:last-child {
  border-bottom: none;
}

/* Data Series section takes up remaining space */
.control-section:first-child {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 5px;
  /* Inner padding only for data series */
}

.control-section h4 {
  margin: 0 0 8px 0;
  /* Reduced margin */
  color: #262626;
  font-size: 12px;
  /* Smaller size */
  font-weight: 600;
}

.data-series-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 8px;
  padding: 6px 8px;
  background: #f8f9fa;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
}

.header-line-1,
.header-line-2 {
  padding-left: 0;
  margin-bottom: 5px;
}

.header-line-1 h7 {
  margin: 0;
  color: #262626;
  font-size: 13px;
  font-weight: 600;
}

.header-line-2 {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  width: 100%;
  gap: 8px;
  margin-top: 2px;
}

.control-group {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 6px;
}

.control-group-label {
  color: #8c8c8c !important;
  font-size: 10px;
  font-weight: 500;
  white-space: nowrap;
}

.auto-scroll-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
}

.toggle-label {
  color: #595959 !important;
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
}

.series-list {
  flex: 1;
  overflow-y: auto;
  padding-right: 4px;
}

/* Empty state styling */
.series-empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  padding: 20px;
}

.empty-state-content {
  text-align: center;
  color: #8c8c8c;
}

.empty-state-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state-text {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 8px;
  color: #595959;
}

.empty-state-subtitle {
  font-size: 14px;
  color: #8c8c8c;
}

.series-item {
  margin-bottom: 4px;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  background: #ffffff;
  transition: background-color 0.2s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  overflow: hidden;
  position: relative;
}

/* Clean and simple design for series items */
.series-item:not(.series-disabled) {
  cursor: pointer;
}

.series-disabled {
  opacity: 0.5;
  filter: grayscale(0.5);
}

.series-header {
  display: flex;
  align-items: center;
  padding: 6px 10px;
  cursor: pointer;
  gap: 8px;
  border-radius: 6px;
  margin: 1px 0;
}

.series-color-indicator {
  width: 3px;
  height: 24px;
  border-radius: 2px;
  flex-shrink: 0;
  opacity: 0.8;
}

.series-toggle-indicator {
  width: 24px;
  height: 16px;
  border-radius: 10px;
  flex-shrink: 0;
  cursor: pointer;
  position: relative;
  transition: all 0.3s ease;
  border: 2px solid transparent;
  display: flex;
  align-items: center;
  padding: 1px;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
}

.series-toggle-indicator.active {
  opacity: 1;
  border-color: rgba(255, 255, 255, 0.3);
}

.series-toggle-indicator.inactive {
  opacity: 0.6;
  background-color: #d9d9d9 !important;
}

.toggle-inner {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: white;
  transition: all 0.3s ease;
  transform: translateX(0);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.toggle-inner.visible {
  transform: translateX(8px);
}

.series-name {
  font-size: 12px;
  /* font-weight: 600; */
  margin-bottom: 2px;
  color: #262626;
  line-height: 1.3;
}

.series-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 2px 4px;
  border-radius: 4px;
}

.series-name-line {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: nowrap;
}

.series-name-container {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.series-prefix-tag {
  margin: 0 !important;
  flex-shrink: 0;
}

.series-prefix-tag-small {
  margin: 0 0 0 6px !important;
  flex-shrink: 0;
  font-size: 8px !important;
  padding: 2px 6px !important;
  height: auto !important;
  line-height: 1.2 !important;
}

.series-name {
  font-size: 12px;
  font-weight: 600;
  color: #262626;
  line-height: 1.3;
  flex-shrink: 0;
}

.series-inline-tags {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: nowrap;
}

.series-inline-tags .ant-tag {
  margin: 0;
  font-size: 10px;
  padding: 1px 4px;
  line-height: 1.2;
}

.series-details {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: nowrap;
}

.unit-info {
  color: #595959;
  font-size: 9px;
  font-weight: 500;
  background: rgba(0, 0, 0, 0.04);
  padding: 1px 3px;
  border-radius: 2px;
  white-space: nowrap;
  border: 1px solid rgba(0, 0, 0, 0.06);
  line-height: 1.2;
}

.series-controls {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin-left: auto;
  flex-shrink: 0;
}

.expand-toggle {
  padding: 0 !important;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #8c8c8c !important;
  border: none !important;
  background: transparent !important;
  flex-shrink: 0;
}

.expand-toggle:hover {
  color: #262626 !important;
  background: rgba(0, 0, 0, 0.05) !important;
}

.expand-icon {
  font-size: 10px;
  transition: transform 0.2s ease;
}

.expand-icon.expanded {
  transform: rotate(0deg);
}

.series-stats {
  padding: 6px 10px;
  border-top: 1px solid #f0f0f0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  background-color: #fafafa;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
}

.stat-label {
  color: #8c8c8c;
  font-size: 10px;
  font-weight: 500;
}

.stat-value {
  color: #262626;
  font-weight: 600;
  font-size: 10px;
}

.chart-header {
  padding: 6px 8px;
  /* Ultra-compact padding to match modal header */
  border-bottom: 1px solid #e8e8e8;
  background: #ffffff;
}

.chart-title-section {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 3px;
}

.chart-header h3 {
  margin: 0;
  /* Remove margin since it's now in flex */
  color: #262626;
  font-size: 16px;
  /* Slightly smaller font */
  font-weight: 600;
  flex-shrink: 0;
  /* Prevent title from shrinking */
}

.view-alert {
  max-width: 400px;
  flex-shrink: 1;
}

.chart-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  /* Reduced gap */
}

.chart-info-left {
  display: flex;
  gap: 12px;
  /* Reduced gap */
  align-items: center;
  flex-wrap: wrap;
}

.chart-info-right {
  display: flex;
  align-items: center;
}

.status-indicators {
  display: flex;
  gap: 12px;
  /* Reduced gap */
  align-items: center;
  flex-wrap: wrap;
}

.status-section {
  display: flex;
  align-items: center;
  gap: 4px;
}

.status-label {
  color: #8c8c8c !important;
  font-size: 11px;
  font-weight: 500;
}

.info-text {
  color: #8c8c8c;
  font-size: 12px;
  white-space: nowrap;
}

.chart-container {
  flex: 1;
  padding: 8px;
  /* Reduced padding to give more space to chart */
  position: relative;
  min-height: 320px;
  /* Increased min height since legend is removed */
  display: flex;
  flex-direction: column;
}

.chart-canvas {
  width: 100% !important;
  height: 100% !important;
  min-height: 300px;
  /* Increased min height since legend is removed */
}

/* Top Controls Bar - Individual Control Group Wrapping */
.top-controls-bar {
  background: #fafafa;
  border-bottom: 1px solid #d9d9d9;
  padding: 6px 8px;
  /* box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1); */
  position: sticky;
  top: 0;
  z-index: 100;
  min-height: 40px;
  margin-bottom: 5px;
}

.controls-main-flex {
  width: 100%;
  align-items: center;
  justify-content: flex-start;
}

.control-group {
  flex-shrink: 0;
  white-space: nowrap;
  align-items: center;
  gap: 6px;
}

.control-label {
  font-weight: 500;
  color: #666;
  white-space: nowrap;
}

.status-tags {
  flex-wrap: wrap;
}

.status-tags .ant-tag {
  margin: 1px 2px;
}

/* Responsive behavior - each control group wraps individually */
@media (max-width: 1200px) {
  .controls-main-flex {
    gap: 8px;
  }

  .control-group {
    flex-shrink: 1;
  }
}

@media (max-width: 1000px) {
  .top-controls-bar {
    padding: 4px 6px;
  }

  .controls-main-flex {
    gap: 6px;
  }

  .control-group {
    min-width: min-content;
  }
}

@media (max-width: 768px) {
  .top-controls-bar {
    padding: 3px 4px;
  }

  .controls-main-flex {
    gap: 4px;
    justify-content: center;
  }

  .control-group {
    flex: 0 0 auto;
    justify-content: center;
  }

  .control-label {
    font-size: 10px;
  }

  .control-group .ant-btn {
    font-size: 10px;
    padding: 2px 6px;
    height: 24px;
  }

  .status-tags .ant-tag {
    font-size: 9px;
    padding: 1px 4px;
  }
}

@media (max-width: 480px) {
  .controls-main-flex {
    justify-content: space-around;
    gap: 2px;
  }

  .control-group {
    flex: 1 1 auto;
    min-width: 0;
    justify-content: center;
  }

  .control-group .ant-btn-group {
    display: flex;
    gap: 1px;
  }

  .control-group .ant-btn-group .ant-btn {
    flex: 1;
    min-width: 30px;
    padding: 1px 3px;
    font-size: 9px;
  }

  /* Hide text in very small screens, keep icons */
  .control-group .ant-btn span:not(.anticon) {
    display: none;
  }
}

.controls-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: nowrap;
  flex-shrink: 1;
  min-width: 0;
}

.controls-right {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: nowrap;
  flex-shrink: 0;
  margin-right: 15px;
}

.control-item {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  white-space: nowrap;
}

/* Apply consistent styling to all dropdown menus */
:deep(.chart-options-menu),
:deep(.zoom-options-menu),
:deep(.export-options-menu) {
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

:deep(.chart-options-menu .ant-menu-item),
:deep(.zoom-options-menu .ant-menu-item),
:deep(.export-options-menu .ant-menu-item) {
  padding: 4px 8px;
  margin: 2px 0;
  border-radius: 4px;
  line-height: 1.2;
  min-height: auto;
  height: auto;
}

:deep(.chart-options-menu .ant-btn),
:deep(.zoom-options-menu .ant-btn),
:deep(.export-options-menu .ant-btn) {
  border: none !important;
  background: transparent !important;
  box-shadow: none !important;
  height: auto !important;
  padding: 4px 0 !important;
  line-height: 1.2 !important;
  color: #262626 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: flex-start !important;
}

:deep(.chart-options-menu .ant-btn .anticon),
:deep(.zoom-options-menu .ant-btn .anticon),
:deep(.export-options-menu .ant-btn .anticon) {
  margin-right: 6px !important;
  color: #1890ff !important;
}

:deep(.chart-options-menu .ant-btn span),
:deep(.zoom-options-menu .ant-btn span),
:deep(.export-options-menu .ant-btn span) {
  color: #262626 !important;
}

:deep(.chart-options-menu .ant-menu-item:hover),
:deep(.zoom-options-menu .ant-menu-item:hover),
:deep(.export-options-menu .ant-menu-item:hover) {
  background-color: #f5f5f5 !important;
}

:deep(.chart-options-menu .ant-btn:hover),
:deep(.zoom-options-menu .ant-btn:hover),
:deep(.export-options-menu .ant-btn:hover) {
  color: #1890ff !important;
  background: transparent !important;
}

:deep(.chart-options-menu .ant-menu-item:hover .ant-btn),
:deep(.zoom-options-menu .ant-menu-item:hover .ant-btn),
:deep(.export-options-menu .ant-menu-item:hover .ant-btn) {
  color: #1890ff !important;
}

/* Export Options Dropdown Menu Styles */
:deep(.export-options-menu) {
  min-width: 160px;
}

:deep(.export-options-menu .ant-menu-item) {
  padding: 6px 8px !important;
  height: auto !important;
}

:deep(.export-options-menu .ant-btn) {
  border: none !important;
  box-shadow: none !important;
  font-size: 12px;
  color: #333;
  padding: 4px 0 !important;
  height: auto !important;
  justify-content: flex-start;
}

:deep(.export-options-menu .ant-btn:hover) {
  color: #0064c8;
  background: transparent !important;
}

:deep(.export-options-menu .ant-btn .anticon) {
  margin-right: 8px;
  font-size: 14px;
}

/* ============================================
   EXPORT OPTIONS DROPDOWN COMPREHENSIVE STYLES
   ============================================ */

/* Base dropdown menu styling */
.export-options-menu {
  width: auto !important;
  min-width: auto !important;
  max-width: none !important;
  font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif !important;
}

/* Menu item layout - force single line */
.export-options-menu .ant-menu-item {
  height: auto !important;
  line-height: 1.2 !important;
  padding: 6px 12px !important;
  white-space: nowrap !important;
  overflow: visible !important;
  display: flex !important;
  align-items: center !important;
  width: auto !important;
  min-width: fit-content !important;
}

/* Smaller font size for menu items */
.export-options-menu .ant-menu-item,
.export-options-menu .ant-btn,
.export-options-menu .ant-btn span {
  font-weight: 400 !important;
}

/* Export button styling within menu items */
.export-options-menu .ant-btn {
  padding: 0 !important;
  height: auto !important;
  line-height: 1.2 !important;
  border: none !important;
  box-shadow: none !important;
  display: flex !important;
  align-items: center !important;
  width: 100% !important;
  text-align: left !important;
  justify-content: flex-start !important;
}

.export-options-menu .ant-btn .anticon {
  margin-right: 8px !important;
  display: inline-flex !important;
  align-items: center !important;
}

.export-options-menu .ant-btn span {
  display: inline !important;
  white-space: nowrap !important;
  line-height: 1.2 !important;
}

/* Hover effects */
.export-options-menu .ant-menu-item:hover {
  background-color: #f5f5f5 !important;
  color: #0064c8 !important;
}

.export-options-menu .ant-btn:hover {
  background-color: transparent !important;
  color: #0064c8 !important;
}

.export-options-menu .ant-menu-item:hover .ant-btn {
  color: #0064c8 !important;
}

/* Divider styling */
.export-options-menu .ant-menu-divider {
  margin: 4px 0 !important;
  background-color: #e8e8e8 !important;
}

/* Ensure dropdown positioning */
.export-options-menu.ant-dropdown-menu {
  padding: 4px 0 !important;
  border-radius: 4px !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15) !important;
  width: auto !important;
  min-width: fit-content !important;
}

/* Modal styling - ultra-compact and space-efficient */
:deep(.t3-timeseries-modal .ant-modal-content) {
  background: #ffffff !important;
  border: 1px solid #e8e8e8;
  border-radius: 0px !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15) !important;
  /* Lighter shadow */
  margin: 0 !important;
  /* Remove default margin */
  padding: 0 !important;
  /* Remove default padding */
  overflow: hidden !important;
  /* Prevent any spacing issues */
}

:deep(.t3-timeseries-modal .ant-modal-header) {
  background: #fafafa !important;
  border-bottom: 1px solid #e8e8e8 !important;
  border-radius: 0px !important;
  padding: 6px 8px !important;
  /* Ultra-compact padding */
  margin: 0 !important;
  /* Remove margin */
  min-height: 32px !important;
  /* Even more compact height */
  line-height: 1.2 !important;
  /* Tight line height */
}

:deep(.t3-timeseries-modal .ant-modal-title) {
  color: #262626 !important;
  font-weight: 600;
  font-size: 14px !important;
  /* Smaller but readable size */
  line-height: 1.2 !important;
  /* Tight line height */
  margin: 0 !important;
  padding: 0 !important;
}

:deep(.t3-timeseries-modal .ant-modal-close) {
  top: 16px !important;
  /* Align with top controls bar height */
  right: 12px !important;
  /* Align with export dropdown */
  z-index: 1000 !important;
}

:deep(.t3-timeseries-modal .ant-modal-close-x) {
  color: #8c8c8c !important;
  width: 28px !important;
  height: 28px !important;
  line-height: 28px !important;
  font-size: 14px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

:deep(.t3-timeseries-modal .ant-modal-body) {
  padding: 2px !important;
  /* Even more compact since no header */
  background: #ffffff !important;
  margin: 0 !important;
  overflow: hidden !important;
  /* Ensure tight fit */
}

/* Custom tooltip styling for colored text */
#chartjs-tooltip {
  opacity: 1;
  position: absolute;
  background: #ffffff;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  color: #000;
  font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  font-size: 12px;
  pointer-events: none;
  z-index: 1000;
}

#chartjs-tooltip table {
  margin: 0px;
  border-collapse: collapse;
}

#chartjs-tooltip table td,
#chartjs-tooltip table th {
  padding: 2px 8px;
  border: none;
}

#chartjs-tooltip table th {
  font-weight: 600;
  font-size: 13px;
  color: #000;
  text-align: left;
}

#chartjs-tooltip table td span {
  border-radius: 2px;
  font-weight: 500;
  padding: 2px 6px;
  white-space: nowrap;
}

/* Ensure series colors are maintained in all text elements */
.series-name-colored {
  font-weight: 500;
}

.chart-legend-colored .ant-legend-item {
  color: inherit !important;
}

/* Mobile responsive layout - Control Group Optimized */
@media (max-width: 768px) {
  /* Top controls - Individual control group wrapping */
  .top-controls-bar {
    padding: 3px !important;
  }

  .controls-main-flex {
    justify-content: center !important;
    gap: 4px !important;
  }

  .control-group {
    flex: 0 0 auto !important;
    justify-content: center !important;
    min-width: min-content !important;
  }

  .control-label {
    font-size: 10px !important;
  }

  /* Control items and buttons get smaller */
  .control-group .ant-btn {
    font-size: 10px !important;
    padding: 2px 6px !important;
    height: 24px !important;
  }

  .status-tags .ant-tag {
    font-size: 9px !important;
    padding: 1px 4px !important;
    margin: 1px !important;
  }

  /* Main layout - stack vertically with proper height calculations */
  .timeseries-container {
    flex-direction: column !important;
    height: calc(100vh - 60px) !important;
    /* Account for larger top controls on mobile */
    gap: 3px !important;
    overflow-y: auto !important;
  }

  .left-panel {
    width: 100% !important;
    height: 35vh !important;
    /* Fixed height - 35% of viewport */
    min-height: 200px !important;
    max-height: 35vh !important;
    order: 1;
    overflow-y: auto !important;
    flex-shrink: 0 !important;
  }

  .right-panel {
    width: 100% !important;
    height: calc(65vh - 60px - 3px) !important;
    /* Remaining height minus top controls and gap */
    min-height: 250px !important;
    min-width: auto !important;
    order: 2;
    flex: none !important;
    /* Don't use flex on mobile to ensure height calculation */
    overflow: hidden !important;
  }

  .chart-container {
    height: 100% !important;
    min-height: 200px !important;
    padding: 3px !important;
    overflow: hidden !important;
    /* Ensure chart fits within container */
  }

  .chart-canvas {
    min-height: 180px !important;
    /* Ensure space for chart and labels */
  }

  /* Series list improvements */
  .series-item {
    margin-bottom: 4px !important;
  }

  .series-header {
    flex-wrap: wrap !important;
    gap: 4px !important;
  }

  .series-name-line {
    flex-wrap: wrap !important;
    gap: 2px !important;
  }

  .series-stats {
    display: flex !important;
    flex-wrap: wrap !important;
    gap: 4px !important;
  }

  .stat-item {
    min-width: 60px !important;
    font-size: 10px !important;
  }

  :global(.t3-timeseries-modal .ant-modal) {
    width: 95vw !important;
    margin: 10px auto !important;
    max-width: none !important;
  }

  :global(.t3-timeseries-modal .ant-modal-content) {
    padding: 8px 10px !important;
  }
}

/* Very small screens - even more compact */
@media (max-width: 480px) {
  .top-controls-bar {
    padding: 2px !important;
  }

  .controls-main-flex {
    justify-content: space-around !important;
    gap: 2px !important;
  }

  .control-group {
    flex: 1 1 auto !important;
    min-width: 0 !important;
    justify-content: center !important;
  }

  /* Stack button groups and make them more compact */
  .control-group .ant-btn-group {
    display: flex !important;
    gap: 1px !important;
  }

  .control-group .ant-btn-group .ant-btn {
    flex: 1 !important;
    min-width: 30px !important;
    padding: 1px 3px !important;
    font-size: 9px !important;
  }

  /* Hide text in very small screens, keep icons */
  .control-group .ant-btn span:not(.anticon) {
    display: none !important;
  }

  /* Adjust heights for very small screens */
  .timeseries-container {
    height: calc(100vh - 70px) !important;
    /* Account for even larger top controls */
  }

  .left-panel {
    height: 30vh !important;
    min-height: 150px !important;
    max-height: 30vh !important;
  }

  .right-panel {
    height: calc(70vh - 70px - 3px) !important;
    min-height: 200px !important;
  }

  /* Series items more compact */
  .series-name {
    font-size: 11px !important;
  }

  .unit-info {
    font-size: 9px !important;
  }
}

/* Custom Date Modal Styles */
.custom-date-modal {
  padding: 10px 0;
}

.date-time-row {
  margin-bottom: 14px;
  align-items: center;
}

.label-col {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 4px;
}

.time-label {
  font-weight: 500;
  color: #262626;
  margin: 0;
  white-space: nowrap;
  font-size: 11px;
}

.custom-date-modal .ant-picker {
  height: 28px !important;
  font-size: 11px !important;
}

.custom-date-modal .ant-picker-input > input {
  font-size: 11px !important;
  padding: 2px 8px !important;
}

.quick-actions {
  margin: 16px 0 10px 0;
  padding: 10px;
  background: #fafafa;
  border-radius: 4px;
  border: 1px solid #f0f0f0;
}

.quick-actions .ant-space {
  width: 100%;
  justify-content: center;
}

.quick-actions .ant-btn {
  font-size: 10px;
  padding: 0 6px;
  height: 22px;
}

.range-summary {
  margin-top: 10px;
}

.range-summary .ant-alert {
  border-radius: 4px;
  padding: 4px 10px;
}

.range-summary .ant-alert-message {
  font-weight: 500;
}

.range-text {
  font-size: 10px;
  color: #1890ff;
}
</style>

<style>
.t3-timeseries-modal .ant-dropdown-menu-title-content {
  font-size: 12px !important;
}

.ant-dropdown-menu-title-content {
  font-size: 12px !important;
}

.ant-modal-content{
  padding: 10px 14px !important;
}
</style>
