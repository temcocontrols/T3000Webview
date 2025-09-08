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
            <!-- Single line: Title, count, and status -->
            <div class="header-line-1">
              <h7>{{ chartTitle }} ({{ visibleSeriesCount }}/{{ dataSeries.length }})</h7>
              <!-- Data Source Indicator -->
              <div class="data-source-indicator">
                <span v-if="dataSource === 'realtime'" class="source-badge realtime">
                  📡 Live
                </span>
                <span v-else-if="dataSource === 'api'" class="source-badge historical">
                  📚 Historical ({{ timeBase }})
                </span>
                <span v-else class="source-badge fallback">
                  ⚠️ Fallback
                </span>
              </div>
            </div>

            <!-- Line 2: All dropdown, By Type dropdown, Auto Scroll toggle -->
            <div class="header-line-2">
              <div class="left-controls">
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
              </div>
              <div class="auto-scroll-toggle">
                <a-typography-text class="toggle-label">Auto Scroll:</a-typography-text>
                <a-switch v-model:checked="isRealTime" size="small"
                  @change="onRealTimeToggle" />
              </div>
            </div>
          </div>
          <div class="series-list">
            <!-- Empty state when no data series available -->
            <div v-if="dataSeries.length === 0" class="series-empty-state">
              <div class="empty-state-content">
                <div v-if="dataSource === 'fallback'" class="empty-state-icon">⚠️</div>
                <div v-else class="empty-state-icon">📊</div>

                <div v-if="dataSource === 'fallback'" class="empty-state-text">Data Connection Error</div>
                <div v-else class="empty-state-text">No trend log data available</div>

                <div v-if="dataSource === 'fallback'" class="empty-state-subtitle">
                  Unable to load real-time or historical data. Check system connections.
                </div>
                <div v-else class="empty-state-subtitle">Configure monitor points to see data series</div>
              </div>
            </div>

            <!-- Regular series list when data is available -->
            <div v-for="(series, index) in dataSeries" :key="series.name" class="series-item" :class="{
              'series-disabled': !series.visible
            }">
              <div class="series-header" @click="toggleSeriesVisibility(index, $event)">
                <div class="series-toggle-indicator" :class="{ 'active': series.visible, 'inactive': !series.visible }"
                  :style="{ backgroundColor: series.visible ? series.color : '#d9d9d9' }">
                  <div class="toggle-inner" :class="{ 'visible': series.visible }"></div>
                </div>
                <div class="series-info">
                  <div class="series-name-line">
                    <div class="series-name-container">
                      <span class="series-name">{{ getSeriesNameText(series) }}</span>
                      <q-chip v-if="series.prefix" :label="getChipLabelText(series.prefix)" color="grey-4"
                        text-color="grey-8" size="xs" dense class="series-prefix-tag-small" />
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
    <a-modal v-model:visible="customDateModalVisible" title="X Axis" :width="320" centered @ok="applyCustomDateRange"
      @cancel="cancelCustomDateRange">
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
import { useRoute } from 'vue-router'
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
import LogUtil from 'src/lib/T3000/Hvac/Util/LogUtil'
import { scheduleItemData } from 'src/lib/T3000/Hvac/Data/Constant/RefConstant'
import { T3000_Data } from 'src/lib/T3000/Hvac/Data/T3Data'
import { ranges as rangeDefinitions, T3_Types } from 'src/lib/T3000/Hvac/Data/Constant/T3Range'
import WebViewClient from 'src/lib/T3000/Hvac/Opt/Webview2/WebViewClient'
import Hvac from 'src/lib/T3000/Hvac/Hvac'
import { t3000DataManager, DataReadiness, type DataValidationResult } from 'src/lib/T3000/Hvac/Data/Manager/T3000DataManager'
import { useTrendlogDataAPI } from 'src/lib/T3000/Hvac/Opt/FFI/TrendlogDataAPI'

// BAC Units Constants - Digital/Analog Type Indicators
const BAC_UNITS_DIGITAL = 0
const BAC_UNITS_ANALOG = 1

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
  id?: string                         // NEW: Data point identifier (VAR1, IN1, etc.)
  type?: string                       // NEW: Data point type from GET_ENTRIES response
  digital_analog?: number             // NEW: BAC_UNITS value (0=digital, 1=analog)
  description?: string                // NEW: Human readable description
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
  digitalStates?: [string, string]    // NEW: State labels for digital units ['Low', 'High']
  itemType?: string                   // NEW: T3000 item type (VAR, Input, Output, HOL, etc.)
  prefix?: string                     // NEW: Category prefix (IN, OUT, VAR, etc.)
  description?: string                // NEW: Device description
  pointType?: number                  // NEW: Actual point type number from T3000
  pointNumber?: number                // NEW: Point number for reference
  panelId?: number                    // NEW: Panel ID for reference
}

/**
 * Map T3000 point types to readable names and determine data characteristics
 */
/*
 * TrendLogChart Component - Data Flow Tracking
 *
 * LOGGING APPROACH (Clean & Essential):
 * - = TLChart DataFlow: Key data flow events for 14 panel items
 * - Focus on: How panel items are extracted, API messages sent, data received
 * - Removed: Excessive decorative logs, temporary debug code, verbose diagnostics
 *
 * KEY DATA FLOW POINTS LOGGED:
 * 1. Panel item extraction (extractSpecificPoints) - which 14 items we need
 * 2. API requests (fetchHistoricalDataForTimebase) - which messages trigger data fetch
 * 3. Data conversion (convertApiDataToSeries) - how API data becomes chart data
 * 4. Component initialization - real-time vs historical data sources
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
  // Use the series name directly - no need to clean since we preserve original names
  const displayName = series.name || 'Unknown'

  // Removed verbose logging to reduce console noise

  return displayName
}

// Helper function to get unit information from panel data
const getUnitFromPanelData = (panelId: number, pointType: number, pointNumber: number): string => {
  const panelsData = T3000_Data.value.panelsData
  const panelsRanges = T3000_Data.value.panelsRanges

  if (!panelsData?.length) return ''

  // Get point type info and device ID
  const pointTypeInfo = getPointTypeInfo(pointType)
  if (!pointTypeInfo?.category) return ''

  const idToFind = `${pointTypeInfo.category}${pointNumber + 1}`
  const device = panelsData.find((d: any) =>
    String(d.pid) === String(panelId) && d.id === idToFind
  )

  if (!device || device.unit === undefined) return ''

  // Check for custom range data first
  if (panelsRanges?.length) {
    const rangeData = panelsRanges.find((r: any) =>
      String(r.pid) === String(panelId) && r.index === device.range
    )
    if (rangeData?.type === 'digital' && (rangeData.on || rangeData.off)) {
      return `${rangeData.off}/${rangeData.on}`
    }
  }

  // Use rangeDefinitions lookup
  let ranges: any[] = []
  if (pointTypeInfo.category === 'IN') ranges = rangeDefinitions.analog.input
  else if (pointTypeInfo.category === 'OUT') ranges = rangeDefinitions.analog.output
  else if (pointTypeInfo.category === 'VAR') ranges = rangeDefinitions.analog.variable

  const rangeInfo = ranges.find(r => r.id === device.unit)
  if (rangeInfo?.unit) return rangeInfo.unit

  // Check digital ranges
  const digitalRange = rangeDefinitions.digital.find(d => d.id === device.unit)
  if (digitalRange) return `${digitalRange.off}/${digitalRange.on}`

  return ''
}

// Function to convert Unix timestamp to local time string
const formatTimestampToLocal = (unixTimestamp: number): string => {
  // Handle both seconds and milliseconds Unix timestamps
  const timestamp = unixTimestamp > 1e10 ? unixTimestamp : unixTimestamp * 1000
  const date = new Date(timestamp)

  // Clean simple logging for data flow tracking
  // console.log('= TLChart DataFlow: Timestamp conversion for chart data point')

  // Return local time in YYYY-MM-DD HH:mm:ss format
  return date.toLocaleString('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).replace(/(\d{4})-(\d{2})-(\d{2}), (\d{2}):(\d{2}):(\d{2})/, '$1-$2-$3 $4:$5:$6')
}

interface Props {
  itemData?: any
  title?: string
}

const props = withDefaults(defineProps<Props>(), {
  itemData: null,
  title: 'Trend Log Chart'
})

// Computed property to get the current item data - prioritizes props over global state
const currentItemData = computed(() => {
  const data = props.itemData || scheduleItemData.value
  LogUtil.Info('= TLChart: currentItemData computed update', {
    hasPropsData: !!props.itemData,
    hasScheduleData: !!scheduleItemData.value,
    dataSource: props.itemData ? 'props' : 'scheduleItemData',
    dataId: data?.t3Entry?.id,
    dataPid: data?.t3Entry?.pid,
    hasT3000PanelsData: !!(T3000_Data.value?.panelsData),
    t3000PanelsDataLength: T3000_Data.value?.panelsData?.length || 0
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
    return 60000 // Default fallback: 1 minute
  }

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

// API integration for timebase data fetching
const trendlogAPI = useTrendlogDataAPI()
const dataSource = ref<'realtime' | 'api' | 'fallback'>('realtime') // Track data source for timebase changes

// Watch for fallback mode and clear data when entering it
watch(dataSource, (newSource) => {
  if (newSource === 'fallback') {
    LogUtil.Info('= TLChart: Entering fallback mode - clearing all chart data')
    dataSeries.value = []
    // Update chart to show empty state
    updateChart()
  }
})

// Route for URL parameter extraction
const route = useRoute()

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

  if (!panelsData?.length) return ''

  const pointTypeInfo = getPointTypeInfo(pointType)
  if (!pointTypeInfo?.category) return ''

  // Generate search ID (panel data is 1-based, param is 0-based)
  const idToFind = `${pointTypeInfo.category}${pointNumber + 1}`
  const device = panelsData.find((d: any) =>
    String(d.pid) === String(panelId) && d.id === idToFind
  )

  if (!device) return ''

  // Priority order: label → command → fullLabel → description → id
  return device.label || device.command || device.fullLabel || device.description || device.id || ''
}

// Helper: Get digital_analog field from T3000_Data.value.panelsData
const getDigitalAnalogFromPanelData = (panelId: number, pointType: number, pointNumber: number): number => {
  const panelsData = T3000_Data.value.panelsData

  if (!panelsData?.length) return BAC_UNITS_ANALOG

  const pointTypeInfo = getPointTypeInfo(pointType)
  if (!pointTypeInfo?.category) return BAC_UNITS_ANALOG

  const idToFind = `${pointTypeInfo.category}${pointNumber + 1}`
  const device = panelsData.find((d: any) =>
    String(d.pid) === String(panelId) && d.id === idToFind
  )

  return device?.digital_analog ?? BAC_UNITS_ANALOG
}

// Chart series colors for the 14 monitoring points
const SERIES_COLORS = [
  '#FF0000', '#0000FF', '#00AA00', '#FF8000', '#AA00AA', '#00AAAA', '#CC6600',
  '#AA0000', '#0066AA', '#AA6600', '#6600AA', '#006600', '#FF6600', '#0000AA'
]

// Chart data - T3000 mixed digital/analog series (always 14 items)
const generateDataSeries = (): SeriesConfig[] => {
  // Validate input data
  const inputData = props.itemData?.t3Entry?.input
  const rangeData = props.itemData?.t3Entry?.range

  if (!inputData?.length || !rangeData?.length) {
    return []
  }

  const actualItemCount = Math.min(inputData.length, rangeData.length)
  if (actualItemCount === 0) return []

  // Generate series configuration for each item
  return Array.from({ length: actualItemCount }, (_, index) => {
    const inputItem = inputData[index]
    const rangeValue = rangeData[index]

    const panelId = inputItem.panel
    const pointType = inputItem.point_type
    const pointNumber = inputItem.point_number

    // Determine digital/analog type and units
    const digitalAnalog = getDigitalAnalogFromPanelData(panelId, pointType, pointNumber)
    const isDigital = digitalAnalog === BAC_UNITS_DIGITAL
    const unitType: 'digital' | 'analog' = isDigital ? 'digital' : 'analog'

    const unit = isDigital ? '' : getUnitFromPanelData(panelId, pointType, pointNumber)
    const digitalStates: [string, string] | undefined = isDigital ? ['Low', 'High'] : undefined

    // Get descriptive information
    const pointTypeInfo = getPointTypeInfo(pointType)
    const description = getDeviceDescription(panelId, pointType, pointNumber)
    const cleanDescription = description ? `${pointTypeInfo.category} - ${description}` : `${pointTypeInfo.category}${pointNumber + 1}`
    const seriesName = description || `${pointTypeInfo.category}${pointNumber + 1} (P${panelId})`

    // Generate formatted item type
    const itemTypeMap: { [key: number]: string } = { 1: 'Output', 2: 'Input', 3: 'VAR', 7: 'HOL' }
    const itemTypeName = itemTypeMap[pointType] || 'VAR'
    const formattedItemType = `${panelId}${itemTypeName}${pointNumber + 1}`

    return {
      name: seriesName,
      color: SERIES_COLORS[index % SERIES_COLORS.length],
      data: [],
      visible: true,
      unit: unit,
      isEmpty: false,
      unitType: unitType,
      unitCode: rangeValue,
      digitalStates: digitalStates,
      itemType: formattedItemType,
      prefix: pointTypeInfo.category,
      description: cleanDescription,
      pointType: pointType,
      pointNumber: pointNumber,
      panelId: panelId
    }
  })
}

const dataSeries = ref<SeriesConfig[]>([])

// Regenerate data series when data source changes
const regenerateDataSeries = () => {
  LogUtil.Info('= TLChart: regenerateDataSeries called', {
    currentSeriesCount: dataSeries.value?.length || 0,
    hasCurrentData: !!currentItemData.value,
    timestamp: new Date().toISOString()
  })

  const newSeries = generateDataSeries()
  dataSeries.value = newSeries

  LogUtil.Info('= TLChart: Data series regenerated', {
    newSeriesCount: newSeries.length,
    newSeriesNames: newSeries.map(s => s.name)
  })
}

// Watch currentItemData and regenerate series when it changes
watch(currentItemData, (newData, oldData) => {
  LogUtil.Info('= TLChart: currentItemData watcher triggered', {
    hasNewData: !!newData,
    hasOldData: !!oldData,
    newDataId: newData?.t3Entry?.id,
    oldDataId: oldData?.t3Entry?.id,
    idsChanged: newData?.t3Entry?.id !== oldData?.t3Entry?.id,
    willRegenerate: !!newData
  })

  if (newData) {
    regenerateDataSeries()
  }
}, { immediate: true, deep: true })

// Watch dataSeries for updates
watch(dataSeries, (newSeries, oldSeries) => {
  LogUtil.Info('= TLChart: dataSeries updated', {
    newSeriesCount: newSeries?.length || 0,
    oldSeriesCount: oldSeries?.length || 0,
    seriesChanged: newSeries?.length !== oldSeries?.length,
    newSeriesNames: newSeries?.map(s => s.name) || []
  })
}, { deep: true })

// Watch props.itemData for changes
watch(() => props.itemData, (newData, oldData) => {
  LogUtil.Info('= TLChart: props.itemData changed', {
    hasNewData: !!newData,
    hasOldData: !!oldData,
    newDataId: newData?.t3Entry?.id,
    oldDataId: oldData?.t3Entry?.id,
    newDataPid: newData?.t3Entry?.pid,
    oldDataPid: oldData?.t3Entry?.pid,
    idsChanged: newData?.t3Entry?.id !== oldData?.t3Entry?.id,
    pidsChanged: newData?.t3Entry?.pid !== oldData?.t3Entry?.pid,
    timestamp: new Date().toISOString()
  })
}, { deep: true })

// Watch T3000_Data for panels data changes
watch(() => T3000_Data.value?.panelsData, (newPanelsData, oldPanelsData) => {
  if (newPanelsData && newPanelsData.length > 0) {
    // Regenerate data series when panels data becomes available or changes
    if (currentItemData.value) {
      regenerateDataSeries()
    }

    // Process new data for chart data points
    const chartDataFormat = newPanelsData.flat()
    updateChartWithNewData(chartDataFormat)
  }
}, { deep: true })

// Watch scheduleItemData for changes
watch(scheduleItemData, (newData, oldData) => {
  LogUtil.Info('= TLChart: scheduleItemData changed', {
    hasNewData: !!newData,
    hasOldData: !!oldData,
    newDataId: (newData as any)?.t3Entry?.id,
    oldDataId: (oldData as any)?.t3Entry?.id,
    newDataPid: (newData as any)?.t3Entry?.pid,
    oldDataPid: (oldData as any)?.t3Entry?.pid,
    idsChanged: (newData as any)?.t3Entry?.id !== (oldData as any)?.t3Entry?.id,
    pidsChanged: (newData as any)?.t3Entry?.pid !== (oldData as any)?.t3Entry?.pid,
    timestamp: new Date().toISOString()
  })
}, { deep: true })

// Watch timeBase for changes and API data fetching
watch(timeBase, (newTimeBase, oldTimeBase) => {
  LogUtil.Info('= TLChart: timeBase changed - API Data Fetch Analysis', {
    oldTimeBase: oldTimeBase,
    newTimeBase: newTimeBase,
    is5Minutes: newTimeBase === '5m',
    isCustom: newTimeBase === 'custom',
    needsApiData: newTimeBase !== '5m' && newTimeBase !== 'custom',
    currentDataSource: dataSource.value,
    willTriggerApiCall: newTimeBase !== '5m' && newTimeBase !== 'custom',
    timestamp: new Date().toISOString()
  })
}, { immediate: false })

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
  // Debug function disabled in production
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
let fallbackRecoveryInterval: NodeJS.Timeout | null = null

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
  const count = dataSeries.value.filter(series => series.visible).length
  LogUtil.Info('= TLChart: visibleSeriesCount computed', {
    visibleCount: count,
    totalCount: dataSeries.value.length,
    visibleSeries: dataSeries.value.filter(s => s.visible).map(s => s.name)
  })
  return count
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

  // Update Auto Scroll state based on timebase
  if (value === '5m') {
    isRealTime.value = true // Enable Auto Scroll for 5m (real-time)
  } else {
    isRealTime.value = false // Disable Auto Scroll for historical timebases
  }

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

// Helper function to get original series index from filtered series
const getOriginalSeriesIndex = (series: SeriesConfig): number => {
  return dataSeries.value.findIndex(s => s.name === series.name)
}

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
            y: mapValueToYAxis(point.value, series.unitType) // Apply two-zone mapping
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
            const timestamp = context[0].parsed.x

            // Check if this looks like a Unix timestamp (either seconds or milliseconds)
            if (typeof timestamp === 'number' && timestamp > 1e9) {
              return formatTimestampToLocal(timestamp)
            }

            // Fallback to standard date conversion
            const date = new Date(timestamp)
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
            const customConfig = getCustomTickConfig(customStartDate.value.toDate(), customEndDate.value.toDate())
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
              const customConfig = getCustomTickConfig(customStartDate.value.toDate(), customEndDate.value.toDate())
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
        // Two-zone Y-axis configuration for analog (upper) and digital (lower) data
        min: -0.5, // Extend below to provide space below digital values
        max: 11,
        grid: {
          color: (ctx: any) => {
            // Different grid colors for different zones
            const value = ctx.tick.value
            if (value === 2.5) return '#000000' // Black line at zone divider
            if (value <= 2.5) return '#e8f4ff' // Light blue for digital zone (bottom)
            return '#f0f0f0' // Light gray for analog zone (top)
          },
          display: true,
          lineWidth: (ctx: any) => {
            // Thicker line at zone divider
            return ctx.tick.value === 2.5 ? 3 : 1
          }
        },
        ticks: {
          color: '#595959',
          font: {
            size: 11,
            family: 'Inter, Helvetica, Arial, sans-serif'
          },
          stepSize: 0.5, // Smaller step size for finer control
          // Custom tick callback for two-zone layout with digital values at bottom
          callback: function (value: any) {
            if (typeof value === 'number') {
              // Bottom zone (Digital): below the divider line with more spacing
              if (value <= 2.5) {
                if (value === -0.5) return '' // Space below x-axis
                if (value === 0) return '0' // First digital value
                if (value === 0.5) return '' // Space between values
                if (value === 1) return '' // More space
                if (value === 1.5) return '1' // Second digital value with larger gap
                if (value === 2) return '' // Space before divider
                if (value === 2.5) return '' // At divider line
              }

              // Upper zone (Analog): above the divider line
              if (value >= 3) {
                const analogValue = (value - 3) * 100 // Start from 0, increment by 100
                return analogValue.toString()
              }
            }
            return ''
          }
        }
      }
    }
  }
})

// Value mapping for two-zone Y-axis layout
const mapValueToYAxis = (value: number, unitType: 'analog' | 'digital'): number => {
  if (unitType === 'digital') {
    // Digital values map to bottom zone (below divider at 2.5)
    // 0 maps to position 0 (where "0" label is)
    // 1 maps to position 1.5 (where "1" label is) - larger gap
    return value === 0 ? 0 : 1.5
  } else {
    // Analog values map to upper zone (3-11, above divider at 2.5)
    // Normalize large analog values to fit in the 3-11 range
    const normalizedValue = Math.max(0, Math.min(8, value / 1000)) // Scale down by 1000, clamp to 0-8
    return 3 + normalizedValue // Shift to 3-11 range
  }
}

// Section divider plugin for Chart.js
const sectionDividerPlugin = {
  id: 'sectionDivider',
  afterDraw: (chart: any) => {
    const ctx = chart.ctx
    const chartArea = chart.chartArea

    // Calculate the Y position for the divider (at value 2.5, between zones)
    const yScale = chart.scales.y
    const dividerY = yScale.getPixelForValue(2.5)

    // Draw thick black divider line
    ctx.save()
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(chartArea.left, dividerY)
    ctx.lineTo(chartArea.right, dividerY)
    ctx.stroke()

    // Add zone labels
    ctx.fillStyle = '#000000'
    ctx.font = 'bold 12px Inter, Arial, sans-serif'
    ctx.textAlign = 'left'

    // Upper zone label (Analog) - above the divider line
    const upperZoneY = yScale.getPixelForValue(7) // Middle of upper zone (3-11)
    // ctx.fillText('Analog Values', chartArea.left + 10, upperZoneY) // Removed per user request

    // Lower zone label (Digital) - below the divider line
    const lowerZoneY = yScale.getPixelForValue(0.75) // Middle of lower zone (-0.5 to 2.5)
    // ctx.fillText('Digital Values', chartArea.left + 10, lowerZoneY) // Removed per user request

    ctx.restore()
  }
}// Time navigation tracking
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


// Data generation and management functions removed
// Only real-time data from T3000 API will be used

// ====================================================================================
// REAL DATA INTEGRATION: T3000 Monitor Data Extraction and Real-time Data Fetching
// ====================================================================================

/**
 * Enhanced monitor configuration extraction using T3000DataManager
 * @returns Monitor configuration with input items and timing intervals
 */
const getMonitorConfigFromT3000Data = async () => {
  // Get the monitor ID and PID from current item data (props or global)
  const monitorId = (currentItemData.value as any)?.t3Entry?.id
  const panelId = (currentItemData.value as any)?.t3Entry?.pid

  if (!monitorId) {
    return null
  }

  if (!panelId && panelId !== 0) {
    return null
  }

  try {
    // Use enhanced data manager to wait for data readiness
    const validation = await t3000DataManager.waitForDataReady({
      timeout: 15000, // 15 seconds timeout
      specificEntries: [monitorId]
    })

    if (!validation.isValid) {
      return null
    }

    // Get the monitor entry using enhanced data manager with PID filtering
    const monitorConfig = await t3000DataManager.getEntryByPid(monitorId, panelId)

    if (!monitorConfig) {
      return null
    }

    // Calculate the data retrieval interval in milliseconds using the unified function
    const intervalMs = calculateT3000Interval(monitorConfig)

    // Extract input items from the configuration
    const inputItems = []
    const ranges = []

    // Parse input items based on actual monitor configuration structure
    // monitorConfig has 'input' array with objects and 'range' array
    if (monitorConfig.input && Array.isArray(monitorConfig.input)) {
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
        }
      }
    }

    // Check if we actually have valid input items with meaningful data
    if (inputItems.length === 0) {
      return null
    }

    // Additional validation: check if input items have valid point numbers and panels
    const validInputItems = inputItems.filter(item =>
      item.panel !== undefined &&
      item.point_number !== undefined &&
      item.point_number >= 0
    )

    if (validInputItems.length === 0) {
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

    return result

  } catch (error) {
    return null
  }
}


/**
 * Initialize WebSocket and WebView clients for data communication
 */
const initializeDataClients = () => {
  // Check if we're running in built-in browser (WebView) or external browser (WebSocket)
  const isBuiltInBrowser = window.location.protocol === 'ms-appx-web:' ||
    (window as any).chrome?.webview !== undefined ||
    (window as any).external?.sendMessage !== undefined

  if (isBuiltInBrowser) {
    // Use WebView client for built-in browser
    return new WebViewClient()
  } else {
    // Use WebSocket client for external browser
    return Hvac.WsClient
  }
}

/**
 * Wait for panelsData to be available and populated
 */
const waitForPanelsData = async (timeoutMs: number = 10000): Promise<boolean> => {
  const startTime = Date.now()

  while (Date.now() - startTime < timeoutMs) {
    const panelsData = T3000_Data.value.panelsData || []

    if (panelsData.length > 0) {
      return true
    }

    await new Promise(resolve => setTimeout(resolve, 200)) // Reduced from 500ms to 200ms for faster detection
  }

  return false
}

/**
 * Fetch real-time data for all monitor input items
 */
const fetchRealTimeMonitorData = async (): Promise<DataPoint[][]> => {
  try {
    // Set loading state
    isLoading.value = true

    // Use the reactive monitor config
    const monitorConfigData = monitorConfig.value
    if (!monitorConfigData) {
      isLoading.value = false
      return []
    }

    // Check if panelsData is already available - if so, proceed immediately
    const currentPanelsData = T3000_Data.value.panelsData || []
    let panelsDataReady = false

    if (currentPanelsData.length > 0) {
      panelsDataReady = true
    } else {
      // Only wait if panelsData is not already available
      panelsDataReady = await waitForPanelsData(5000) // Reduced timeout from 10s to 5s
    }

    if (!panelsDataReady) {
      isLoading.value = false
      return []
    }

    // Initialize data client (returns single client based on environment)
    const dataClient = initializeDataClients()

    if (!dataClient) {
      return []
    }

    // Setup message handlers for GET_ENTRIES responses
    setupGetEntriesResponseHandlers(dataClient)

    // Get current device for panelId - use the first available panel as fallback
    const panelsList = T3000_Data.value.panelsList || []
    const currentPanelId = panelsList.length > 0 ? panelsList[0].panel_number : 1

    // Get panels data for device mapping
    const panelsData = T3000_Data.value.panelsData || []

    // Instead of finding a single panel, return all panelData for the currentPanelId
    const currentPanelData = panelsData.filter(panel => String(panel.pid) === String(currentPanelId))

    if (!currentPanelData) {
      return []
    }

    // Use currentPanelData directly as devicesArray
    let devicesArray = currentPanelData

    if (!Array.isArray(devicesArray) || devicesArray.length === 0) {
      return []
    }

    // Fetch data for all input items using BATCH REQUEST (optimized approach)
    const allDataResults = await fetchAllItemsDataBatch(dataClient, monitorConfigData, {
      panelId: currentPanelId,
      panelData: devicesArray
    })

    return allDataResults

  } catch (error) {
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
    // Extract index from config (this should match the input item index in the array)
    const itemIndex = config.itemIndex || 0
    const rangeValue = config.ranges[itemIndex] || 0

    // Log device mapping details
    const deviceId = logDeviceMapping(inputItem, itemIndex, rangeValue)

    // Find matching device in panelsData using new enhanced lookup
    const matchingDevice = findPanelDataDevice(inputItem, config.panelData)

    if (!matchingDevice) {
      return [{
        timestamp: Date.now(),
        value: 0
      }]
    }

    // Process the device value using enhanced logic with panel data + input range
    const processedValue = processDeviceValue(matchingDevice, rangeValue)

    // Send GET_ENTRIES request to get latest data from T3000
    const deviceIndex = parseInt(matchingDevice.index) || 0
    // const deviceType = mapPointTypeToString(inputItem.point_type)
    const deviceType = inputItem.point_type

    await sendGetEntriesRequest(dataClient, config.panelId, deviceIndex, deviceType)

    // Return current data point with processed value
    // Note: More data will come through the message handlers (HandleGetEntriesRes)
    const resultDataPoint = {
      timestamp: Date.now(),
      value: processedValue.value
    }

    return [resultDataPoint]

  } catch (error) {
    return [{
      timestamp: Date.now(),
      value: 0
    }]
  }
}

/**
 * Fetch data for ALL items using BATCH request (optimized approach)
 * Sends one GET_ENTRIES request for all items instead of individual requests
 */
const fetchAllItemsDataBatch = async (dataClient: any, monitorConfigData: any, config: any): Promise<DataPoint[][]> => {
  try {
    LogUtil.Info('📦 TrendLogChart: fetchAllItemsDataBatch called', {
      inputItemsCount: monitorConfigData.inputItems?.length || 0,
      panelId: config.panelId,
      timestamp: new Date().toISOString()
    })

    // Build batch request data for ALL items at once
    const batchRequestData: any[] = []
    const itemConfigs: any[] = []

    monitorConfigData.inputItems.forEach((inputItem: any, index: number) => {
      const itemIndex = index
      const rangeValue = monitorConfigData.ranges[itemIndex] || 0

      // Find matching device in panelsData
      const matchingDevice = findPanelDataDevice(inputItem, config.panelData)

      if (matchingDevice) {
        const deviceIndex = parseInt(matchingDevice.index) || 0
        const deviceType = inputItem.point_type

        // Add to batch request
        batchRequestData.push({
          panelId: config.panelId,
          index: deviceIndex,
          type: deviceType
        })

        // Store config for processing response
        itemConfigs.push({
          inputItem,
          matchingDevice,
          rangeValue,
          itemIndex
        })

        LogUtil.Info(`📦 Added item ${index} to batch request`, {
          deviceIndex,
          deviceType,
          panelId: config.panelId
        })
      } else {
        LogUtil.Warn(`⚠️ No matching device found for item ${index}`)
        // Add placeholder for missing device
        itemConfigs.push(null)
      }
    })

    if (batchRequestData.length === 0) {
      LogUtil.Warn('⚠️ No valid items for batch request')
      return []
    }

    // Send single batch GET_ENTRIES request for ALL items
    LogUtil.Info('📡 Sending BATCH GET_ENTRIES request', {
      itemCount: batchRequestData.length,
      requestData: batchRequestData
    })

    if (dataClient && dataClient.GetEntries) {
      try {
        // Send one request with all items
        dataClient.GetEntries(config.panelId, null, batchRequestData)

        LogUtil.Info('�?BATCH GET_ENTRIES request sent successfully', {
          panelId: config.panelId,
          itemCount: batchRequestData.length
        })
      } catch (error) {
        LogUtil.Error('�?Error sending batch GET_ENTRIES request:', error)
      }
    }

    // Return initial data points for each item (real data will come via handlers)
    const results: DataPoint[][] = []

    itemConfigs.forEach((itemConfig, index) => {
      if (itemConfig) {
        const processedValue = processDeviceValue(itemConfig.matchingDevice, itemConfig.rangeValue)
        results.push([{
          timestamp: Date.now(),
          value: processedValue.value
        }])
      } else {
        // Default data point for missing items
        results.push([{
          timestamp: Date.now(),
          value: 0
        }])
      }
    })

    return results

  } catch (error) {
    LogUtil.Error('�?Error in fetchAllItemsDataBatch:', error)
    return []
  }
}

/**
 * Send batch GET_ENTRIES request for periodic real-time updates
 * Used by interval timer to efficiently update all monitored items at once
 */
const sendPeriodicBatchRequest = async (monitorConfigData: any): Promise<void> => {
  try {
    // Get current device for panelId
    const panelsList = T3000_Data.value.panelsList || []
    const currentPanelId = panelsList.length > 0 ? panelsList[0].panel_number : 1

    // Get panels data for device mapping
    const panelsData = T3000_Data.value.panelsData || []
    const currentPanelData = panelsData.filter(panel => String(panel.pid) === String(currentPanelId))

    if (!currentPanelData || currentPanelData.length === 0) {
      LogUtil.Debug('GET_ENTRIES Batch Request -> No panel data available')
      return
    }

    // Initialize data client
    const dataClient = initializeDataClients()
    if (!dataClient) {
      LogUtil.Debug('GET_ENTRIES Batch Request -> No data client available')
      return
    }

    // Build batch request for ALL monitored items
    const batchRequestData: any[] = []

    monitorConfigData.inputItems.forEach((inputItem: any, index: number) => {
      const matchingDevice = findPanelDataDevice(inputItem, currentPanelData)

      if (matchingDevice) {
        const deviceIndex = parseInt(matchingDevice.index) || 0
        const deviceType = inputItem.point_type

        batchRequestData.push({
          panelId: currentPanelId,
          index: deviceIndex,
          type: deviceType
        })
      }
    })

    LogUtil.Debug('GET_ENTRIES Batch Request -> Sending periodic batch:', {
      itemCount: batchRequestData.length,
      panelId: currentPanelId,
      batchSample: batchRequestData.slice(0, 3),
      timestamp: new Date().toISOString()
    })

    if (batchRequestData.length === 0) {
      LogUtil.Debug('GET_ENTRIES Batch Request -> No valid items for batch request')
      return
    }

    // Send single batch GET_ENTRIES request for ALL items
    LogUtil.Info('GET_ENTRIES Batch Request -> Sending batch request:', {
      itemCount: batchRequestData.length,
      panelId: currentPanelId,
      nextUpdateIn: calculateT3000Interval(monitorConfigData)
    })

    if (dataClient.GetEntries) {
      dataClient.GetEntries(currentPanelId, null, batchRequestData)

      LogUtil.Info('GET_ENTRIES Batch Request -> Batch request sent successfully:', {
        itemCount: batchRequestData.length,
        timestamp: new Date().toLocaleTimeString()
      })
    } else {
      LogUtil.Error('GET_ENTRIES Batch Request -> ERROR: GetEntries method not available')
    }

  } catch (error) {
    LogUtil.Error('GET_ENTRIES Batch Request -> ERROR in sendBatchGetEntriesRequest:', error)
  }
}

/**
 * Initialize data series from real T3000 monitor configuration
 */
const initializeRealDataSeries = async () => {
  const monitorConfigData = monitorConfig.value
  if (!monitorConfigData) {
    dataSeries.value = []
    return
  }

  try {
    // Fetch real-time data for all items
    const realTimeData = await fetchRealTimeMonitorData()

    // Check if we have any real data at all
    const hasAnyRealData = realTimeData.some(series => series.length > 0)

    if (!hasAnyRealData) {
      dataSeries.value = []
      return
    }

    // Update data series with real configuration - only for series that have data
    const newDataSeries: SeriesConfig[] = []

    for (let i = 0; i < monitorConfigData.inputItems.length; i++) {
      const inputItem = monitorConfigData.inputItems[i]
      const pointTypeInfo = getPointTypeInfo(inputItem.point_type)
      const rangeValue = monitorConfigData.ranges[i] || 0
      const itemData = realTimeData[i] || []

      // Skip series that have no data
      if (itemData.length === 0) {
        continue
      }

      // Use device description for series name
      const prefix = pointTypeInfo.category
      const desc = getDeviceDescription(inputItem.panel, inputItem.point_type, inputItem.point_number)

      // Create clean name - since we only create series with data
      const seriesName = desc || `${inputItem.point_number + 1} (P${inputItem.panel})`
      const cleanDescription = desc || `${inputItem.point_number + 1}`

      // Determine unit type based on digital_analog field from panel data
      // BAC_UNITS_DIGITAL = 0 (digital), BAC_UNITS_ANALOG = 1 (analog)
      const digitalAnalog = getDigitalAnalogFromPanelData(inputItem.panel, inputItem.point_type, inputItem.point_number)
      const isDigital = digitalAnalog === BAC_UNITS_DIGITAL

      LogUtil.Info('= TLChart: Series generation - Digital/Analog analysis', {
        inputItemIndex: i,
        panelId: inputItem.panel,
        pointType: inputItem.point_type,
        pointNumber: inputItem.point_number,
        digitalAnalog,
        isDigital
      })

      let unitType: 'digital' | 'analog'
      let unitSymbol: string
      let digitalStates: [string, string] | undefined

      if (isDigital) {
        unitType = 'digital'
        unitSymbol = '' // Digital units don't show unit symbols
        digitalStates = ['Low', 'High'] // Default digital states
      } else {
        unitType = 'analog'
        unitSymbol = getUnitFromPanelData(inputItem.panel, inputItem.point_type, inputItem.point_number) // Get unit from panel data
        digitalStates = undefined
      }

      LogUtil.Info('= TLChart: Series generation - Unit determination result', {
        unitType,
        unitSymbol,
        digitalStates
      })

      const seriesConfig: SeriesConfig = {
        name: seriesName,
        color: `hsl(${(newDataSeries.length * 360) / monitorConfigData.inputItems.length}, 70%, 50%)`,
        data: itemData,
        visible: true,
        isEmpty: false, // Only create series for data that exists
        unit: unitSymbol,
        unitType: unitType,
        unitCode: rangeValue,
        digitalStates: digitalStates,
        itemType: pointTypeInfo.name,
        prefix: prefix,
        description: cleanDescription
      }

      newDataSeries.push(seriesConfig)
    }

    // Update the reactive data series
    LogUtil.Info('= TLChart: initializeRealDataSeries updating dataSeries', {
      previousSeriesCount: dataSeries.value.length,
      newSeriesCount: newDataSeries.length,
      newSeriesNames: newDataSeries.map(s => s.name),
      timestamp: new Date().toISOString()
    })
    dataSeries.value = newDataSeries

    // Update sync time since we successfully loaded real data
    lastSyncTime.value = new Date().toLocaleTimeString()

  } catch (error) {
    LogUtil.Error('= TLChart: Error initializing real data series:', error)
    LogUtil.Warn('= TLChart: Setting fallback mode - chart will remain empty')
    dataSource.value = 'fallback'
    // Clear any existing data when entering fallback mode
    dataSeries.value = []
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

  const device = panelsData.find(device => device.id === deviceId)

  if (!device) {
    LogUtil.Warn('= TLChart: Device not found in panelsData', { deviceId: deviceId })
    return null
  }

  return device
}

/**
 * Determine if device is analog or digital using the digital_analog field
 */
const isAnalogDevice = (panelData: any, inputRangeValue: number): boolean => {
  // Primary: Use digital_analog field if available (BAC_UNITS_DIGITAL=0, BAC_UNITS_ANALOG=1)
  if (panelData && panelData.digital_analog !== undefined) {
    return panelData.digital_analog === BAC_UNITS_ANALOG
  }

  // Fallback: Use input range value (0=analog, 1=digital)
  const isAnalogByRange = inputRangeValue === 0

  // Secondary fallback: Use panel data control field (0=analog, 1=digital)
  const isAnalogByPanelData = panelData && panelData.control === 0

  // Use input range as primary fallback source of truth
  return isAnalogByRange
}

/**
 * Scale large values for display: if value >= 1000, divide by 1000
 * Matches the backend scaling logic for consistency between real-time and historical data
 */
const scaleValueIfNeeded = (rawValue: number): number => {
  if (rawValue >= 1000) {
    return rawValue / 1000
  }
  return rawValue
}

/**
 * Get the correct value from panel data based on device type
 */
const getDeviceValue = (panelData: any, isAnalog: boolean): number => {
  let rawValue: number

  if (isAnalog) {
    // Analog devices: use 'value' field
    rawValue = scaleValueIfNeeded(parseFloat(panelData.value) || 0)
  } else {
    // Digital devices: For OUT1/OUT2, check multiple potential fields
    if (panelData.id === 'OUT1' || panelData.id === 'OUT2') {
      // Try different fields for digital outputs
      const controlValue = scaleValueIfNeeded(parseFloat(panelData.control) || 0)
      const valueValue = scaleValueIfNeeded(parseFloat(panelData.value) || 0)
      const autoManualValue = scaleValueIfNeeded(parseFloat(panelData.auto_manual) || 0)

      // Use the field with the highest non-zero value, or control as fallback
      if (valueValue > 0) {
        rawValue = valueValue
      } else if (autoManualValue > 0) {
        rawValue = autoManualValue
      } else {
        rawValue = controlValue
      }
    } else {
      // Regular digital devices: use 'control' field
      rawValue = scaleValueIfNeeded(parseFloat(panelData.control) || 0)
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

  if (isAnalog) {
    // Analog processing: only divide by 1000 if value is larger than 1000
    // This handles cases where some values are already in correct scale
    let processedValue: number
    if (rawValue > 1000) {
      processedValue = rawValue / 1000
    } else {
      processedValue = rawValue
    }

    const unit = getAnalogUnit(panelData.range)

    return {
      value: processedValue,
      displayValue: `${processedValue.toFixed(2)}`,
      unit: unit
    }
  } else {
    // Digital processing: use control value as-is with state labels
    const digitalStates = getDigitalUnit(panelData.range)
    const displayValue = rawValue > 0 ? `1 (${digitalStates.high})` : `0 (${digitalStates.low})`

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
  LogUtil.Info('📡 TrendLogChart: sendGetEntriesRequest called', {
    panelId,
    deviceIndex,
    deviceType,
    hasDataClient: !!dataClient,
    hasGetEntriesMethod: !!(dataClient?.GetEntries),
    timestamp: new Date().toISOString()
  })

  const requestData = [{
    panelId: panelId,
    index: deviceIndex,
    type: deviceType
  }]

  if (dataClient && dataClient.GetEntries) {
    try {
      // CORRECT FORMAT: GetEntries(panelId?, viewitem?, data?)
      // Examples from codebase:
      // - IdxPage.ts: GetEntries(null, null, etries)
      // - Your test: GetEntries(undefined, undefined, [testRequest])
      dataClient.GetEntries(panelId, null, requestData)

      LogUtil.Info('�?TrendLogChart: GetEntries request sent with CORRECT format', {
        panelId,
        viewitem: null,
        requestData
      })
    } catch (error) {
      LogUtil.Error('�?Error calling GetEntries:', error)
    }
  } else {
    LogUtil.Error('�?GetEntries method not available on data client')
  }
}

/**
 * Send GET_ENTRIES requests for multiple devices
 */
const sendBatchGetEntriesRequest = async (dataClient: any, requests: Array<{ panelId: number, index: number, type: string }>): Promise<void> => {
  if (dataClient && dataClient.GetEntries) {
    // For batch requests, use the primary panelId from the first request
    const primaryPanelId = requests[0]?.panelId || null

    LogUtil.Info('📡 TrendLogChart: sendBatchGetEntriesRequest called', {
      primaryPanelId,
      requestCount: requests.length,
      requests
    })

    // CORRECT FORMAT: GetEntries(panelId?, viewitem?, data?)
    dataClient.GetEntries(primaryPanelId, null, requests)
  } else {
    LogUtil.Error('�?No GetEntries method available on data client')
  }
}

/**
 * Enhanced device lookup with proper mapping
 */
const findDeviceByGeneratedId = (panelData: any[], deviceId: string): any => {
  const matchingDevice = panelData.find(device => device.id === deviceId)

  if (!matchingDevice) {
    LogUtil.Warn(`No device found with ID: ${deviceId}`)
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
  // Core mapping info only
  return deviceId
}

/**
 * Debug function to test socket/webview communication manually
 */
const testCommunication = async () => {


  // Test 1: Data Client Creation
  const dataClient = initializeDataClients()


  if (!dataClient) {
    LogUtil.Error('�?TrendLogModal: Cannot proceed - no data client available')
    return
  }

  // Test 2: Setup Response Handler
  setupGetEntriesResponseHandlers(dataClient)
  LogUtil.Info('�?TrendLogModal: Test 2 - Response handler setup complete')

  // Test 3: Send Simple GET_ENTRIES Request
  try {
    const testPanelId = T3000_Data.value.panelsList?.[0]?.panel_number || 1
    const testRequest = {
      panelId: testPanelId,
      index: 1,
      type: 'IN'
    }



    if (dataClient.GetEntries) {
      const result = (dataClient as any).GetEntries(undefined, undefined, [testRequest])

    }

    // Wait a bit to see if response comes back
    setTimeout(() => {
      LogUtil.Info('�?TrendLogModal: Test 3 - Timeout check (5 seconds elapsed)')
    }, 5000)

  } catch (error) {
    LogUtil.Error('�?TrendLogModal: Test 3 - Error sending request:', error)
  }


}

  // Add testCommunication to global scope for manual testing
  ; (window as any).testTimeSeriesCommunication = testCommunication

/**
 * Setup message handlers for GET_ENTRIES responses
 */
const setupGetEntriesResponseHandlers = (dataClient: any) => {



  if (!dataClient) {
    LogUtil.Error('�?TrendLogModal: No dataClient provided to setupGetEntriesResponseHandlers')
    return
  }

  LogUtil.Debug('🔧 Setting up custom GET_ENTRIES handler...', {
    dataClientExists: !!dataClient,
    dataClientType: typeof dataClient,
    hasOriginalHandler: !!(dataClient && dataClient.HandleGetEntriesRes),
    originalHandlerType: typeof dataClient?.HandleGetEntriesRes
  })

  // Store original handler if it exists
  const originalHandler = dataClient.HandleGetEntriesRes

  LogUtil.Debug('🔧 Stored original handler:', {
    hasOriginal: !!originalHandler,
    originalType: typeof originalHandler
  })


  // Create our custom handler
  dataClient.HandleGetEntriesRes = (msgData: any) => {
    // Add timestamp for response tracking
    const responseTime = new Date()
    const timeString = `${responseTime.toLocaleTimeString()}.${responseTime.getMilliseconds().toString().padStart(3, '0')}`

    LogUtil.Info('🎯 TrendLogChart: GET_ENTRIES_RES Processing Start', {
      timestamp: timeString,
      msgId: msgData?.msgId,
      hasData: !!msgData?.data,
      dataLength: Array.isArray(msgData?.data) ? msgData.data.length : 0
    })

    try {
      if (msgData.data && Array.isArray(msgData.data)) {
        // Filter and analyze the received data
        const validItems = msgData.data.filter(item =>
          item &&
          typeof item === 'object' &&
          item.hasOwnProperty('value') &&
          item.value !== null &&
          item.value !== undefined &&
          item.id
        )

        const indexOnlyItems = msgData.data.filter(item =>
          item &&
          typeof item === 'object' &&
          Object.keys(item).length === 1 &&
          item.hasOwnProperty('index')
        )

        LogUtil.Info('📊 TrendLogChart: GET_ENTRIES Data Analysis', {
          totalReceived: msgData.data.length,
          validDataItems: validItems.length,
          indexOnlyItems: indexOnlyItems.length,
          validItemDetails: validItems.map(item => ({
            id: item.id,
            type: item.type,
            value: item.value,
            digital_analog: item.digital_analog,
            description: item.description || item.label
          }))
        })

        // Process the valid data items for chart rendering
        if (validItems.length > 0) {
          LogUtil.Info('⚡ TrendLogChart: Processing valid data for chart rendering', {
            validItemCount: validItems.length,
            currentSeriesCount: dataSeries.value?.length || 0
          })

          updateChartWithNewData(validItems)

          LogUtil.Info('✅ TrendLogChart: Chart data update completed', {
            updatedSeriesCount: dataSeries.value?.length || 0,
            timestamp: timeString
          })
        } else {
          LogUtil.Warn('⚠️ TrendLogChart: No valid data items found for chart rendering')
        }
      } else if (msgData.data) {
        LogUtil.Warn('⚠️ TrendLogChart: Data received but not an array', {
          dataType: typeof msgData.data,
          data: msgData.data
        })
      } else {
        LogUtil.Warn('⚠️ TrendLogChart: No data in response or data is null/undefined')
      }
    } catch (error) {
      LogUtil.Error('❌ TrendLogChart: Error processing GET_ENTRIES response:', error)
    }

    // Call original handler if it existed
    if (originalHandler && typeof originalHandler === 'function') {
      try {
        originalHandler.call(dataClient, msgData)
      } catch (error) {
        LogUtil.Error('❌ TrendLogModal: Error calling original handler:', error)
      }
    }
  }

  LogUtil.Debug('🔧 Custom handler installed successfully:', {
    newHandlerType: typeof dataClient.HandleGetEntriesRes,
    isOurHandler: dataClient.HandleGetEntriesRes.toString().includes('🎯 TrendLogChart')
  })

  LogUtil.Info('✅ TrendLogModal: GET_ENTRIES response handler setup complete')
}

/**
 * Update chart with new data from GET_ENTRIES response
 */
const updateChartWithNewData = (validDataItems: any[]) => {
  if (!dataSeries.value || dataSeries.value.length === 0) {
    LogUtil.Info('📈 TrendLogChart: No data series configured for chart update')
    return
  }

  if (!Array.isArray(validDataItems) || validDataItems.length === 0) {
    LogUtil.Warn('📈 TrendLogChart: No valid data items provided for update')
    return
  }

  const timestamp = new Date()

  LogUtil.Info('🔄 TrendLogChart: Chart Update Process Starting', {
    validDataItemCount: validDataItems.length,
    currentSeriesCount: dataSeries.value.length,
    seriesNames: dataSeries.value.map(s => s.name),
    timestamp: timestamp.toISOString()
  })

  let successfulMatches = 0
  let unmatchedItems = 0

  for (const dataItem of validDataItems) {
    try {
      let seriesIndex = -1
      let targetSeries = null
      let matchMethod = ''

      // Step 1: Try to match by series itemType (preferred method)
      for (let i = 0; i < dataSeries.value.length; i++) {
        const series = dataSeries.value[i]
        if (series && series.itemType && Array.isArray(series.itemType)) {
          if (series.itemType.includes(dataItem.id)) {
            seriesIndex = i
            targetSeries = series
            matchMethod = 'itemType'
            break
          }
        }
      }

      // Step 2: If no match by itemType, try position-based matching (fallback)
      if (seriesIndex === -1) {
        const itemIndex = validDataItems.indexOf(dataItem)
        if (itemIndex < dataSeries.value.length) {
          seriesIndex = itemIndex
          targetSeries = dataSeries.value[seriesIndex]
          matchMethod = 'position'
        }
      }

      if (targetSeries && seriesIndex !== -1) {
        // Create data point with comprehensive information
        const dataPoint: DataPoint = {
          timestamp: timestamp.getTime(),
          value: scaleValueIfNeeded(parseFloat(dataItem.value) || 0),
          id: dataItem.id,
          type: dataItem.type,
          digital_analog: dataItem.digital_analog || BAC_UNITS_ANALOG,
          description: dataItem.description || dataItem.label || `Point ${dataItem.id}`
        }

        // Initialize series data array if needed
        if (!targetSeries.data) {
          targetSeries.data = []
        }

        // Add new data point
        targetSeries.data.push(dataPoint)

        // Maintain data point limit for performance
        const maxDataPoints = 100
        if (targetSeries.data.length > maxDataPoints) {
          const removedCount = targetSeries.data.length - maxDataPoints
          targetSeries.data = targetSeries.data.slice(-maxDataPoints)
        }

        // Update series metadata if available
        if (dataItem.description && !targetSeries.description) {
          targetSeries.description = dataItem.description
        }
        if (dataItem.label && targetSeries.name === targetSeries.description) {
          targetSeries.name = dataItem.label
        }

        successfulMatches++

        LogUtil.Info('✅ TrendLogChart: Data Point Mapped Successfully', {
          itemId: dataItem.id,
          itemType: dataItem.type,
          value: dataItem.value,
          scaledValue: dataPoint.value,
          digitalAnalog: dataPoint.digital_analog === BAC_UNITS_DIGITAL ? 'Digital' : 'Analog',
          seriesName: targetSeries.name,
          seriesIndex: seriesIndex,
          matchMethod: matchMethod,
          totalPointsInSeries: targetSeries.data.length,
          description: dataPoint.description
        })

      } else {
        unmatchedItems++
        LogUtil.Warn('❌ TrendLogChart: No Series Match Found', {
          itemId: dataItem.id,
          itemType: dataItem.type,
          value: dataItem.value,
          availableSeriesCount: dataSeries.value.length,
          availableSeriesNames: dataSeries.value.map(s => s.name),
          seriesItemTypes: dataSeries.value.map(s => ({ name: s.name, itemType: s.itemType }))
        })
      }
    } catch (error) {
      unmatchedItems++
      LogUtil.Error(`❌ TrendLogChart: Error processing data item ${dataItem.id}:`, error)
    }
  }

  // Summary of data processing
  LogUtil.Info('📊 TrendLogChart: Data Processing Summary', {
    totalProcessed: validDataItems.length,
    successfulMatches,
    unmatchedItems,
    matchRate: `${((successfulMatches / validDataItems.length) * 100).toFixed(1)}%`,
    seriesWithData: dataSeries.value.filter(s => s.data && s.data.length > 0).length
  })

  // Update the chart
  if (chartInstance) {
    try {
      updateChart()

      const totalDataPoints = dataSeries.value.reduce((sum, series) => sum + (series.data?.length || 0), 0)

      LogUtil.Info('🎯 TrendLogChart: ChartJS Update Completed', {
        chartUpdated: true,
        totalDataPointsInChart: totalDataPoints,
        activeSeriesCount: dataSeries.value.filter(s => s.data && s.data.length > 0).length,
        updateTimestamp: new Date().toLocaleTimeString()
      })

    } catch (error) {
      LogUtil.Error('❌ TrendLogChart: ChartJS Update Error:', error)
    }
  } else {
    LogUtil.Warn('⚠️ TrendLogChart: Chart instance not available for update')
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
  LogUtil.Info('= TLChart: Starting data initialization for 14 panel items', {
    currentDataSeriesLength: dataSeries.value.length,
    hasMonitorConfig: !!monitorConfig.value,
    timeBase: timeBase.value
  })

  // Set data source to realtime for standard initialization
  dataSource.value = 'realtime'

  // First, try to initialize with real T3000 data
  const monitorConfigData = monitorConfig.value
  if (monitorConfigData && monitorConfigData.inputItems && monitorConfigData.inputItems.length > 0) {

    // Quick check: if we already have recent data, skip unnecessary re-fetching
    const hasRecentData = dataSeries.value.length > 0 &&
      dataSeries.value.some(series => series.data.length > 0)

    if (hasRecentData) {
      console.log('= TLChart DataFlow: Recent data already available, skipping re-fetch')
      return
    }

    LogUtil.Info('= TLChart: Real T3000 data source detected:', {
      totalInputItems: monitorConfigData.inputItems.length,
      monitorId: monitorConfigData.id
    })

    try {
      // Immediately indicate we're loading real data
      isLoading.value = true

      console.log('= TLChart DataFlow: Fetching real-time monitor data via T3000_Data message')
      const realTimeData = await fetchRealTimeMonitorData()

      if (realTimeData && realTimeData.length > 0) {
        console.log('= TLChart DataFlow: Real-time data received:', {
          seriesCount: realTimeData.length,
          dataType: 'REAL_T3000_DATA'
        })

        await initializeRealDataSeries()

        // Clear loading state immediately after successful initialization
        isLoading.value = false

        // Confirm realtime data source
        dataSource.value = 'realtime'
        LogUtil.Info('= TLChart: Real-time data initialization completed for 14 panel items')

        // Update chart immediately to show data without delay
        updateChart()

        // Force a UI update to ensure immediate rendering
        nextTick(() => {
          updateChart()
        })

        return
      } else {
        LogUtil.Warn('= TLChart: No real-time data available - using fallback')
        dataSource.value = 'fallback'
        // Clear all data when entering fallback mode
        dataSeries.value = []
        isLoading.value = false
        // Start recovery attempts
        startFallbackRecovery()
      }
    } catch (error) {
      LogUtil.Error('= TLChart: Failed to initialize real data series:', error)
      dataSource.value = 'fallback'
      // Clear all data when entering fallback mode
      dataSeries.value = []
      isLoading.value = false // Clear loading state on error
      // Start recovery attempts
      startFallbackRecovery()
    }
  } else {
    LogUtil.Info('📊 Empty State Configuration:', {
      configExists: !!monitorConfigData,
      hasInputItems: !!(monitorConfigData?.inputItems),
      inputItemsLength: monitorConfigData?.inputItems?.length || 0,
      scheduleDataExists: !!currentItemData.value,
      scheduleId: (currentItemData.value as any)?.t3Entry?.id,
      panelsDataLength: T3000_Data.value.panelsData?.length || 0,
      dataType: 'NO_DATA_AVAILABLE'
    })
    dataSource.value = 'fallback'
    // Clear all data when entering fallback mode
    dataSeries.value = []
    isLoading.value = false
    // Start recovery attempts
    startFallbackRecovery()
  }

  // If no data series available, chart will remain empty (no mock data generation)
  if (dataSeries.value.length === 0) {
    LogUtil.Info('📊 TrendLogChart: No data series available - maintaining empty state', {
      dataSeriesLength: dataSeries.value.length,
      hasMonitorConfig: !!monitorConfig.value
    })
    return
  }

  // Skip data generation if in fallback mode - fallback should show empty chart
  if (dataSource.value === 'fallback') {
    LogUtil.Info('📊 TrendLogChart: Skipping data generation - in fallback mode (should show empty chart)')
    return
  }

  // Real data only - no synthetic data generation
  LogUtil.Info('📊 TrendLogChart: Mock/demo data generation removed - chart will only show real data')

  // For real data series, update the chart
  updateChart()
}

const addRealtimeDataPoint = async () => {
  // Only add data if we're in real-time mode
  if (!isRealTime.value) {
    return
  }

  // Safety check: If no data series exist, skip processing
  if (dataSeries.value.length === 0) {
    LogUtil.Debug('Realtime Update -> No data series available')
    return
  }

  // Check if we have real monitor configuration for live data
  const monitorConfigData = monitorConfig.value

  if (monitorConfigData && monitorConfigData.inputItems.length > 0) {
    console.log('Realtime Update -> Triggering GET_ENTRIES batch request:', {
      monitorItems: monitorConfigData.inputItems.length,
      currentSeries: dataSeries.value.length,
      timestamp: new Date().toISOString()
    })

    try {
      // Send batch GET_ENTRIES request for ALL items at once
      await sendPeriodicBatchRequest(monitorConfigData)

      // Note: Real data will come through T3000_Data watcher -> updateChartWithNewData
      // which calls updateChartWithNewData() to update dataSeries automatically

      // Update sync time since batch request was sent successfully
      lastSyncTime.value = new Date().toLocaleTimeString()

      // If we were in fallback mode but successfully sent request, switch back to realtime
      if (dataSource.value === 'fallback') {
        LogUtil.Info('TrendLogChart: Auto-recovering from fallback mode - batch request sent successfully')
        dataSource.value = 'realtime'
      }

    } catch (error) {
      LogUtil.Warn('TrendLogChart: Failed to send batch request, setting fallback mode:', error)
      // Set fallback mode - chart will remain empty
      dataSource.value = 'fallback'
      // Clear all data when entering fallback mode
      dataSeries.value = []
      // Start recovery attempts
      startFallbackRecovery()
    }
  } else {
    // In fallback mode or no real data - do nothing, let chart remain empty
    LogUtil.Info('TrendLogChart: No real data available - fallback mode, chart remains empty')
  }
  updateChart()
}

const generateDemoDataPoints = async () => {
  LogUtil.Info('📊 TrendLogChart: Generating demo data points for empty series')

  const timeRangeMinutes = getTimeRangeMinutes(timeBase.value)

  dataSeries.value.forEach((series, index) => {
    if (series.data.length === 0) {
      LogUtil.Info(`📈 Generating demo data for series: ${series.name}`)

      // Demo data generation removed
      const demoData = []  // Mock data generation removed
      series.data = demoData

      LogUtil.Info(`Mock data generation disabled for ${series.name}`)
    }
  })
}

const createChart = () => {
  const isStandalone = !(window as any).chrome?.webview;

  console.log('= TLChart DataFlow: Creating chart in browser environment')

  if (!chartCanvas.value) {
    console.error('= TLChart createChart - Canvas ref not available');
    return;
  }

  // Check if canvas has proper dimensions (important for standalone browsers)
  if (chartCanvas.value.offsetWidth === 0 || chartCanvas.value.offsetHeight === 0) {
    console.warn('= TLChart createChart - Canvas has zero dimensions, delaying creation');
    setTimeout(() => createChart(), 100);
    return;
  }

  const ctx = chartCanvas.value.getContext('2d');
  if (!ctx) {
    console.error('= TLChart createChart - Failed to get 2D context');
    return;
  }

  try {
    // Destroy existing chart
    if (chartInstance) {
      chartInstance.destroy();
    }

    const config = getChartConfig();

    // Register the section divider plugin
    Chart.register(sectionDividerPlugin);

    // Force responsive behavior for standalone browsers
    if (isStandalone && config.options) {
      config.options.responsive = true;
      config.options.maintainAspectRatio = false;
      (config.options as any).animation = false; // Disable animations for better standalone performance
    }

    chartInstance = new Chart(ctx, config);

    console.log('= TLChart DataFlow: Chart created successfully with panel data');

  } catch (error) {
    console.error('= TLChart createChart - Error:', {
      error: error.message,
      isStandalone,
      canvasInfo: {
        width: chartCanvas.value.width,
        height: chartCanvas.value.height,
        offsetWidth: chartCanvas.value.offsetWidth,
        offsetHeight: chartCanvas.value.offsetHeight
      }
    });
  }
}

const updateChart = () => {
  if (!chartInstance) return

  const visibleSeries = dataSeries.value.filter(series => series.visible && series.data.length > 0)

  chartInstance.data.datasets = visibleSeries
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

    // Update Auto Scroll state based on timebase
    if (newTimebase === '5m') {
      isRealTime.value = true // Enable Auto Scroll for 5m (real-time)
    } else {
      isRealTime.value = false // Disable Auto Scroll for historical timebases
    }

    onTimeBaseChange()
    // message.info(`Zoomed in to ${getTimeBaseLabel()}`)
  }
}

const zoomOut = () => {
  const currentIndex = timebaseProgression.indexOf(timeBase.value)
  if (currentIndex >= 0 && currentIndex < timebaseProgression.length - 1) {
    const newTimebase = timebaseProgression[currentIndex + 1]
    timeBase.value = newTimebase

    // Update Auto Scroll state based on timebase
    if (newTimebase === '5m') {
      isRealTime.value = true // Enable Auto Scroll for 5m (real-time)
    } else {
      isRealTime.value = false // Disable Auto Scroll for historical timebases
    }

    onTimeBaseChange()
    // message.info(`Zoomed out to ${getTimeBaseLabel()}`)
  }
}

const resetToDefaultTimebase = () => {
  timeBase.value = '5m'
  timeOffset.value = 0 // Reset time navigation as well
  isRealTime.value = true // Turn Auto Scroll on when returning to 5m timebase
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
  console.log('= TLChart DataFlow: Timebase changed to:', timeBase.value)

  if (timeBase.value !== 'custom') {
    // Reset time offset when timebase changes
    timeOffset.value = 0

    // Check if timebase is NOT 5 minutes - need to get data from API/database
    if (timeBase.value !== '5m') {
      console.log('= TLChart DataFlow: Non-5m timebase - fetching historical data from API')

      // Calculate time range based on selected timebase
      const timeRanges = calculateTimeRangeForTimebase(timeBase.value)
      console.log('= TLChart DataFlow: Time range calculated:', {
        timeBase: timeBase.value,
        duration: timeRanges.durationMinutes + ' minutes'
      })

      // Try to get device parameters from current data
      const deviceParams = extractDeviceParameters()
      console.log('= TLChart DataFlow: Device parameters extracted for API request:', {
        hasSN: !!deviceParams.sn,
        hasPanelId: deviceParams.panel_id !== null,
        hasTrendlogId: deviceParams.trendlog_id !== null
      })

      if (deviceParams.sn && deviceParams.panel_id !== null && deviceParams.trendlog_id !== null) {
        console.log('= TLChart DataFlow: Valid device parameters - making API request for 14 panel items')
        await fetchHistoricalDataForTimebase(deviceParams, timeRanges)
      } else {
        console.log('= TLChart DataFlow: Missing device parameters - using fallback initialization')
        await initializeData()
      }
    } else {
      console.log('= TLChart DataFlow: 5m timebase - using real-time data initialization')
      await initializeData()
    }
  }
}

const onCustomDateChange = async () => {
  if (timeBase.value === 'custom' && customStartDate.value && customEndDate.value) {
    console.log('= TLChart DataFlow: Custom date range selected - fetching historical data')

    // Extract device parameters
    const deviceParams = extractDeviceParameters()
    const durationHours = Math.floor((customEndDate.value.valueOf() - customStartDate.value.valueOf()) / (1000 * 60 * 60))

    console.log('= TLChart DataFlow: Custom range details:', {
      durationHours: durationHours,
      hasValidParams: !!(deviceParams.sn && deviceParams.panel_id !== null && deviceParams.trendlog_id !== null)
    })

    if (deviceParams.sn && deviceParams.panel_id !== null && deviceParams.trendlog_id !== null) {
      console.log('= TLChart DataFlow: Making API request for custom date range')

      // Create time range object for custom dates
      const customTimeRanges = {
        startTime: customStartDate.value.toISOString(),
        endTime: customEndDate.value.toISOString(),
        durationMinutes: Math.floor((customEndDate.value.valueOf() - customStartDate.value.valueOf()) / (1000 * 60)),
        expectedDataPoints: Math.floor((customEndDate.value.valueOf() - customStartDate.value.valueOf()) / (1000 * 15)), // Assume 15-second intervals
        timebaseLabel: `Custom Range (${customStartDate.value.format('DD/MM HH:mm')} - ${customEndDate.value.format('DD/MM HH:mm')})`
      }

      await fetchHistoricalDataForTimebase(deviceParams, customTimeRanges)
    } else {
      console.log('= TLChart DataFlow: Missing device parameters - using standard initialization')
      await initializeData()
    }

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
    isRealTime.value = false // Disable Auto Scroll for custom date ranges (historical data)
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

const startFallbackRecovery = () => {
  // Clear any existing recovery interval
  if (fallbackRecoveryInterval) {
    clearInterval(fallbackRecoveryInterval)
  }

  // Try to recover from fallback mode every 10 seconds
  fallbackRecoveryInterval = setInterval(async () => {
    if (dataSource.value === 'fallback') {
      LogUtil.Info('🔄 TrendLogChart: Attempting fallback recovery - checking for real-time data')

      const monitorConfigData = monitorConfig.value
      if (monitorConfigData && monitorConfigData.inputItems && monitorConfigData.inputItems.length > 0) {
        try {
          const realTimeData = await fetchRealTimeMonitorData()

          if (realTimeData && realTimeData.length > 0) {
            LogUtil.Info('�?TrendLogChart: Fallback recovery successful - real data is now available')
            dataSource.value = 'realtime'

            // Reinitialize data series with real data
            await initializeRealDataSeries()
            updateChart()

            // Stop recovery attempts since we're back to realtime
            stopFallbackRecovery()
          }
        } catch (error) {
          LogUtil.Info('�?TrendLogChart: Fallback recovery attempt failed, will retry in 10 seconds')
        }
      }
    } else {
      // If we're no longer in fallback mode, stop recovery attempts
      stopFallbackRecovery()
    }
  }, 10000) // Try every 10 seconds

  LogUtil.Info('🔄 TrendLogChart: Started fallback recovery monitor (10 second intervals)')
}

const stopFallbackRecovery = () => {
  if (fallbackRecoveryInterval) {
    clearInterval(fallbackRecoveryInterval)
    fallbackRecoveryInterval = null
    LogUtil.Info('⏹️ TrendLogChart: Stopped fallback recovery monitor')
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

// Timebase API Integration Helper Functions
const calculateTimeRangeForTimebase = (timeBase: string) => {
  const now = dayjs()
  let startTime: string
  let endTime: string
  let durationMinutes: number

  const timeRangeMapping = {
    '5m': { duration: 5, label: '5 minutes' },
    '10m': { duration: 10, label: '10 minutes' },
    '30m': { duration: 30, label: '30 minutes' },
    '1h': { duration: 60, label: '1 hour' },
    '4h': { duration: 240, label: '4 hours' },
    '12h': { duration: 720, label: '12 hours' },
    '1d': { duration: 1440, label: '1 day' },
    '4d': { duration: 5760, label: '4 days' }
  }

  const config = timeRangeMapping[timeBase as keyof typeof timeRangeMapping] || { duration: 60, label: '1 hour' }
  durationMinutes = config.duration

  // Calculate start and end times - Format for LoggingTime_Fmt column
  const formatTimeForDB = (date: any): string => {
    const jsDate = date.toDate()
    const year = jsDate.getFullYear()
    const month = (jsDate.getMonth() + 1).toString().padStart(2, '0')
    const day = jsDate.getDate().toString().padStart(2, '0')
    const hours = jsDate.getHours().toString().padStart(2, '0')
    const minutes = jsDate.getMinutes().toString().padStart(2, '0')
    const seconds = jsDate.getSeconds().toString().padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  }

  endTime = formatTimeForDB(now)
  startTime = formatTimeForDB(now.subtract(durationMinutes, 'minute'))

  // Estimate expected data points based on T3000 typical intervals
  const typicalIntervalSeconds = 15 // T3000 default 15-second interval
  const expectedDataPoints = Math.floor((durationMinutes * 60) / typicalIntervalSeconds)

  return {
    startTime,
    endTime,
    durationMinutes,
    expectedDataPoints,
    timebaseLabel: config.label
  }
}

const extractDeviceParameters = () => {
  // Try to extract device parameters from various sources
  let sn: number | null = null
  let panel_id: number | null = null
  let trendlog_id: number | null = null

  // Method 1: Try from URL parameters (route)
  try {
    if (route.query.sn) sn = parseInt(route.query.sn as string)
    if (route.query.panel_id) panel_id = parseInt(route.query.panel_id as string)
    if (route.query.trendlog_id) trendlog_id = parseInt(route.query.trendlog_id as string)
  } catch (error) {
    // Route parameter parsing failed, continue with other methods
  }

  // Method 2: Try from current item data (props)
  if (props.itemData?.t3Entry) {
    const t3Entry = props.itemData.t3Entry

    // Use panel_id from t3Entry if not found in URL
    if (panel_id === null) {
      panel_id = t3Entry.pid || null
    }

    // Extract trendlog_id from id (e.g., "MON1" -> 1) if not found in URL
    if (trendlog_id === null && t3Entry.id && typeof t3Entry.id === 'string') {
      const match = t3Entry.id.match(/MON(\d+)|TRL(\d+)/i)
      trendlog_id = match ? parseInt(match[1] || match[2]) : null
    }
  }

  // Method 3: Try from T3000_Data if still missing
  if (!sn && T3000_Data.value.panelsList && T3000_Data.value.panelsList.length > 0) {
    sn = T3000_Data.value.panelsList[0].serial_number
  }

  if (!panel_id && T3000_Data.value.panelsList && T3000_Data.value.panelsList.length > 0) {
    panel_id = T3000_Data.value.panelsList[0].panel_number
  }

  console.log('= TLChart DataFlow: Device parameter extraction for API request:', {
    methods_used: ['URL params', 'props.itemData', 'T3000_Data'],
    final_result: { sn, panel_id, trendlog_id }
  })

  return { sn, panel_id, trendlog_id }
}

/**
 * Extract specific point information from current data series
 * This determines which of the 14 panel items we need to fetch values for
 */
const extractSpecificPoints = () => {
  const points: Array<{
    point_id: string
    point_type: string
    point_index: number
    panel_id: number
  }> = []

  if (!dataSeries.value || dataSeries.value.length === 0) {
    console.log('= TLChart DataFlow: No data series available for 14-item point extraction')
    return points
  }

  console.log('= TLChart DataFlow: Extracting 14 panel items from series data')

  // Extract points from current series configuration
  dataSeries.value.forEach((series, index) => {
    try {
      // Parse the itemType format: "2Input1" -> Panel=2, Type=Input, Index=0
      const itemType = series.itemType || `${extractDeviceParameters().panel_id}VAR${index + 1}`

      // Extract panel ID from itemType (first digit(s))
      const panelMatch = itemType.match(/^(\d+)/)
      const panelId = panelMatch ? parseInt(panelMatch[1]) : extractDeviceParameters().panel_id || 2

      // Extract point type and convert to API format
      let pointType: string
      let pointIndex: number

      if (itemType.includes('Input')) {
        pointType = 'INPUT'
        const indexMatch = itemType.match(/Input(\d+)$/)
        pointIndex = indexMatch ? parseInt(indexMatch[1]) - 1 : index // Convert to 0-based index
      } else if (itemType.includes('Output')) {
        pointType = 'OUTPUT'
        const indexMatch = itemType.match(/Output(\d+)$/)
        pointIndex = indexMatch ? parseInt(indexMatch[1]) - 1 : index
      } else if (itemType.includes('VAR')) {
        pointType = 'VARIABLE'
        const indexMatch = itemType.match(/VAR(\d+)$/)
        pointIndex = indexMatch ? parseInt(indexMatch[1]) - 1 : index
      } else if (itemType.includes('HOL')) {
        pointType = 'MONITOR'
        const indexMatch = itemType.match(/HOL(\d+)$/)
        pointIndex = indexMatch ? parseInt(indexMatch[1]) - 1 : index
      } else {
        pointType = 'VARIABLE' // Default fallback
        pointIndex = index
      }

      // Generate point_id in database-compatible format
      let pointId: string
      if (pointType === 'INPUT') {
        pointId = `IN${pointIndex + 1}`
      } else if (pointType === 'OUTPUT') {
        pointId = `OUT${pointIndex + 1}`
      } else if (pointType === 'VARIABLE') {
        pointId = `VAR${pointIndex + 1}`
      } else if (pointType === 'MONITOR') {
        pointId = `HOL${pointIndex + 1}`
      } else {
        pointId = `VAR${pointIndex + 1}`
      }

      points.push({
        point_id: pointId,
        point_type: pointType,
        point_index: pointIndex,
        panel_id: panelId
      })

      console.log('= TLChart DataFlow: Extracted panel item:', {
        itemNumber: index + 1,
        itemType: itemType,
        pointId: pointId, // Database-compatible format like "IN1", "OUT2", "VAR3"
        pointType: pointType
      })

    } catch (error) {
      console.warn('= TLChart DataFlow: Failed to extract point info for item', index, ':', error)
      // Add fallback point with database-compatible format
      const deviceParams = extractDeviceParameters()
      points.push({
        point_id: `VAR${index + 1}`, // Use database format "VAR1", "VAR2", etc.
        point_type: 'VARIABLE',
        point_index: index,
        panel_id: deviceParams.panel_id || 2
      })
    }
  })

  console.log('= TLChart DataFlow: 14 panel items extraction completed:', {
    totalItems: points.length,
    itemFormats: points.map(p => p.point_id)
  })

  return points
}

const fetchHistoricalDataForTimebase = async (deviceParams: any, timeRanges: any) => {
  try {
    console.log('= TLChart DataFlow: Starting API request to fetch historical data for panel items')

    isLoading.value = true
    dataSource.value = 'api'
    isRealTime.value = false // Auto Scroll should be off for historical data

    // Extract specific points from current data series
    const specificPoints = extractSpecificPoints()

    // Enhanced API request with specific point filtering
    // This ensures we only fetch data for the exact points displayed in the chart
    const historyRequest = {
      serial_number: deviceParams.sn,
      panel_id: deviceParams.panel_id,
      trendlog_id: deviceParams.trendlog_id.toString(),
      start_time: timeRanges.startTime,
      end_time: timeRanges.endTime,
      limit: Math.min(timeRanges.expectedDataPoints * 2, 5000), // Request up to 2x expected points, max 5000
      point_types: ['INPUT', 'OUTPUT', 'VARIABLE', 'MONITOR'], // All point types
      specific_points: specificPoints // NEW: Pass specific points to filter
    }

    console.log('= TLChart DataFlow: API request details:', {
      device: `SN:${deviceParams.sn}, Panel:${deviceParams.panel_id}, TrendLog:${deviceParams.trendlog_id}`,
      pointsRequested: specificPoints.length,
      timeRange: `${timeRanges.durationMinutes} minutes`
    })

    const historyResponse = await trendlogAPI.getTrendlogHistory(historyRequest)

    console.log('= TLChart DataFlow: API response received:', {
      hasData: !!(historyResponse?.data && historyResponse.data.length > 0),
      dataPointsCount: historyResponse?.data?.length || 0
    })

    if (historyResponse && historyResponse.data && historyResponse.data.length > 0) {
      console.log('= TLChart DataFlow: Converting API data to chart format for 14 panel items')

      // Process the historical data into series format
      const historicalSeries = convertApiDataToSeries(historyResponse.data, timeRanges)

      console.log('= TLChart DataFlow: Chart conversion completed:', {
        seriesCount: historicalSeries.length,
        totalDataPoints: historicalSeries.reduce((sum, series) => sum + series.data.length, 0)
      })

      // Update the data series with historical data
      dataSeries.value = historicalSeries

      // Update chart to display new data
      updateChart()

      // Update last sync time
      lastSyncTime.value = dayjs().format('HH:mm:ss')

    } else {
      console.log('= TLChart DataFlow: No historical data available - using fallback')
      dataSource.value = 'fallback'
      // Clear all data when entering fallback mode
      dataSeries.value = []

      // Fall back to standard initialization if API fails
      await initializeData()
    }

  } catch (error) {
    console.error('= TLChart DataFlow: API request failed:', error instanceof Error ? error.message : error)
    dataSource.value = 'fallback'
    // Clear all data when entering fallback mode
    dataSeries.value = []

    // Show error notification
    notification.error({
      message: 'Historical Data Error',
      description: `Failed to load historical data: ${error instanceof Error ? error.message : 'Unknown error'}`,
      duration: 4.5
    })

    // Fall back to standard initialization
    await initializeData()
  } finally {
    isLoading.value = false
  }
}

const convertApiDataToSeries = (apiData: any[], timeRanges: any): SeriesConfig[] => {
  console.log('= TLChart DataFlow: Converting API data to chart series format')

  // Store original series for name preservation and MAINTAIN ORIGINAL SEQUENCE
  const originalSeries = dataSeries.value || []
  console.log('= TLChart DataFlow: Preserving original 14-item series order:', {
    originalSeriesCount: originalSeries.length,
    preservingSequence: originalSeries.length > 0
  })

  // Group data points by point_id and point_type
  const groupedData = new Map<string, any[]>()

  apiData.forEach(point => {
    const key = `${point.point_type}_${point.point_id}`
    if (!groupedData.has(key)) {
      groupedData.set(key, [])
    }
    groupedData.get(key)!.push(point)
  })

  console.log('= TLChart DataFlow: Grouping API data by point types:', {
    totalApiPoints: apiData.length,
    uniqueSeries: groupedData.size
  })

  // MAINTAIN ORIGINAL SEQUENCE: Create series in the same order as original
  const series: SeriesConfig[] = []
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
    '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#F4D03F'
  ]

  // Process in original series order to maintain sequence
  originalSeries.forEach((originalSeries, index) => {
    // Find matching API data for this original series
    let matchingApiData: any[] | undefined = undefined
    let matchedKey: string | undefined = undefined

    // Try different matching strategies
    groupedData.forEach((apiPoints, apiKey) => {
      if (matchingApiData) return // Already found a match

      const [apiPointType, apiPointId] = apiKey.split('_')

      // Strategy 1: Match by itemType containing point ID
      if (originalSeries.itemType && originalSeries.itemType.includes(apiPointId)) {
        matchingApiData = apiPoints
        matchedKey = apiKey
        return
      }

      // Strategy 2: Match by name containing point ID
      if (originalSeries.name.includes(apiPointId)) {
        matchingApiData = apiPoints
        matchedKey = apiKey
        return
      }

      // Strategy 3: Match by prefix and sequence (e.g., INPUT series 0 matches IN1)
      if (originalSeries.prefix === apiPointType) {
        const expectedPointId = `${apiPointType === 'INPUT' ? 'IN' :
          apiPointType === 'OUTPUT' ? 'OUT' :
            apiPointType === 'VARIABLE' ? 'VAR' : 'UNK'}${index + 1}`
        if (apiPointId === expectedPointId) {
          matchingApiData = apiPoints
          matchedKey = apiKey
          return
        }
      }
    })

    if (matchingApiData && matchedKey) {
      // Remove from grouped data to avoid duplicate processing
      groupedData.delete(matchedKey)

      // Sort points by time
      matchingApiData.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())

      // Convert to chart data format
      const chartData: DataPoint[] = matchingApiData.map(point => ({
        timestamp: new Date(point.time).getTime(),
        value: typeof point.value === 'number' ? point.value : parseFloat(point.value) || 0
      }))

      const seriesConfig: SeriesConfig = {
        // PRESERVE ORIGINAL NAME - no time range labels
        name: originalSeries.name,
        color: originalSeries.color || colors[index % colors.length],
        data: chartData,
        visible: originalSeries.visible !== false, // Preserve visibility state
        unit: originalSeries.unit || '',
        unitType: originalSeries.unitType,
        unitCode: originalSeries.unitCode,
        digitalStates: originalSeries.digitalStates,
        itemType: originalSeries.itemType,
        prefix: originalSeries.prefix,
        // PRESERVE ORIGINAL DESCRIPTION - no time range labels
        description: originalSeries.description
      }

      series.push(seriesConfig)

      console.log('= TLChart DataFlow: Matched panel item to API data:', {
        itemIndex: index,
        name: originalSeries.name,
        dataPoints: chartData.length
      })
    } else {
      // No matching API data - create empty series to maintain sequence
      const emptySeries: SeriesConfig = {
        name: originalSeries.name,
        color: originalSeries.color || colors[index % colors.length],
        data: [], // Empty data
        visible: originalSeries.visible !== false,
        unit: originalSeries.unit || '',
        unitType: originalSeries.unitType,
        unitCode: originalSeries.unitCode,
        digitalStates: originalSeries.digitalStates,
        itemType: originalSeries.itemType,
        prefix: originalSeries.prefix,
        description: originalSeries.description,
        isEmpty: true // Mark as empty for UI handling
      }

      series.push(emptySeries)

      console.log('= TLChart DataFlow: No API data found for panel item:', {
        itemIndex: index,
        name: originalSeries.name
      })
    }
  })

  console.log('= TLChart DataFlow: 14 panel items series conversion completed:', {
    totalItems: series.length,
    itemsWithData: series.filter(s => !s.isEmpty).length,
    totalDataPoints: series.reduce((sum, s) => sum + s.data.length, 0)
  })

  return series
}

// Utility functions
const getLastValue = (data: DataPoint[], series?: SeriesConfig): string => {
  if (data.length === 0) return 'N/A'

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
  const csvData = []
  const headers = ['Timestamp', ...activeSeriesData.map(s => s.name)]
  csvData.push(headers.join(','))

  // Find max data length
  const maxLength = Math.max(...activeSeriesData.map(s => s.data.length))

  for (let i = 0; i < maxLength; i++) {
    const row = []
    const timestamp = activeSeriesData.find(s => s.data[i])?.data[i]?.timestamp
    if (timestamp) {
      // Use local time formatting instead of UTC
      if (typeof timestamp === 'number' && timestamp > 1e9) {
        row.push(formatTimestampToLocal(timestamp))
      } else {
        row.push(new Date(timestamp).toLocaleString())
      }
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

// Debug function to diagnose chart data issues
const diagnosticReport = () => {
  const report = {
    timestamp: new Date().toISOString(),
    dataSource: dataSource.value,
    isRealTime: isRealTime.value,
    isLoading: isLoading.value,
    hasMonitorConfig: !!monitorConfig.value,
    monitorConfigItems: monitorConfig.value?.inputItems?.length || 0,
    totalSeries: dataSeries.value.length,
    visibleSeries: dataSeries.value.filter(s => s.visible).length,
    seriesWithData: dataSeries.value.filter(s => s.data.length > 0).length,
    hasChartInstance: !!chartInstance,
    chartDatasets: chartInstance?.data?.datasets?.length || 0,
    seriesDetails: dataSeries.value.map((series, index) => ({
      index,
      name: series.name,
      visible: series.visible,
      dataPoints: series.data.length,
      isEmpty: series.isEmpty,
      lastValue: series.data.length > 0 ? series.data[series.data.length - 1].value : null,
      lastTimestamp: series.data.length > 0 ? new Date(series.data[series.data.length - 1].timestamp).toLocaleString() : null
    })),
    panelsDataLength: T3000_Data.value.panelsData?.length || 0,
    panelsListLength: T3000_Data.value.panelsList?.length || 0
  }

  // Removed diagnostic report - kept essential data flow tracking only
  // LogUtil.Info('= TLChart DataFlow: Component state diagnostic available if needed')
  // console.log('= TLChart DataFlow: Component state diagnostic available if needed')
  return report
}

// Expose diagnostic function globally for console debugging

// Lifecycle
onMounted(async () => {
  LogUtil.Info('= TLChart: Component mounted', {
    hasPropsItemData: !!props.itemData,
    propsItemDataId: props.itemData?.t3Entry?.id,
    propsItemDataPid: props.itemData?.t3Entry?.pid,
    hasScheduleItemData: !!scheduleItemData.value,
    currentDataSeriesCount: dataSeries.value?.length || 0,
    timestamp: new Date().toISOString()
  })

  LogUtil.Info('📊 TrendLogModal: Current item data source:', {
    usingPropsItemData: !!props.itemData,
    usingGlobalScheduleData: !props.itemData,
    itemData: currentItemData.value
  })



  // === ENHANCED T3000 REAL DATA INTEGRATION TEST ===


  try {
    // Test 1: Data Manager Readiness Check

    const initialReadiness = t3000DataManager.getReadinessState()



    // Test 2: Enhanced Monitor Configuration Extraction

    const monitorConfigData = await getMonitorConfigFromT3000Data()

    if (monitorConfigData) {
      // Set the reactive monitor config variable for all functions to use
      monitorConfig.value = monitorConfigData



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
            const foundDevice = await t3000DataManager.getEntryByPid(deviceId, searchPanelId)
            LogUtil.Info(`�?TEST 3.${i + 1} PASSED: Device ${deviceId} found in panelsData with PID ${searchPanelId}`, {
              id: foundDevice.id,
              label: foundDevice.label,
              pid: foundDevice.pid,
              type: foundDevice.type
            })
          } else {
            LogUtil.Warn(`�?TEST 3.${i + 1} SKIPPED: No PID available for device search`)
          }
        } catch (error) {
          LogUtil.Warn(`�?TEST 3.${i + 1} FAILED: Device ${deviceId} NOT found in panelsData with PID ${searchPanelId}:`, error.message)

          // Fallback: Try to find device without PID filtering for comparison
          try {
            const foundDeviceAnyPid = await t3000DataManager.getEntry(deviceId)
            LogUtil.Info(`🔍 TEST 3.${i + 1} FALLBACK: Device ${deviceId} found without PID filtering:`, {
              id: foundDeviceAnyPid.id,
              label: foundDeviceAnyPid.label,
              pid: foundDeviceAnyPid.pid,
              type: foundDeviceAnyPid.type,
              note: `Found with PID ${foundDeviceAnyPid.pid} instead of expected PID ${searchPanelId}`
            })
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
        const validation = await t3000DataManager.validateData()
        LogUtil.Info('📊 TrendLogModal: Data validation details:', validation)
      } catch (validationError) {
        LogUtil.Error('�?TrendLogModal: Data validation failed:', validationError)
      }
    }

  } catch (error) {
    LogUtil.Error('�?TrendLogModal: Enhanced data integration test failed:', error)
  }

  // Apply default view configuration to ensure settings are properly initialized
  setView(1)

  // Initialize chart since component is always visible
  nextTick(async () => {
    const isStandalone = !(window as any).chrome?.webview;

    console.log('= TLChart DataFlow: Initializing chart component')

    // Add extra delay for standalone browsers to ensure proper DOM layout
    if (!(window as any).chrome?.webview) {
      console.log('= TLChart DataFlow: Adding delay for standalone browser');
      await new Promise(resolve => setTimeout(resolve, 150));
    }

    // Verify canvas is ready with proper dimensions
    if (chartCanvas.value) {
      const canvasReady = chartCanvas.value.offsetWidth > 0 && chartCanvas.value.offsetHeight > 0

      console.log('= TLChart DataFlow: Canvas readiness check:', { ready: canvasReady })

      // If canvas still has no dimensions, wait longer for layout
      if (!canvasReady) {
        console.log('= TLChart DataFlow: Canvas not ready, waiting for layout...')
        await new Promise(resolve => setTimeout(resolve, 300))
      }
    }

    await initializeData()
    createChart()
    if (isRealTime.value) {
      startRealTimeUpdates()
    }
  })
})

onUnmounted(() => {
  stopRealTimeUpdates()
  stopFallbackRecovery()
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

.header-line-1 {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  /* Add space between title and badge */
  flex-wrap: nowrap;
  /* Prevent wrapping */
}

.header-line-1 h7 {
  margin: 0;
  color: #262626;
  font-size: 13px;
  font-weight: 600;
  flex: 1;
  /* Allow title to take available space */
  min-width: 0;
  /* Allow text truncation if needed */
  white-space: nowrap;
  /* Prevent text wrapping */
  overflow: hidden;
  text-overflow: ellipsis;
  /* Add ellipsis for very long titles */
}

/* Data Source Indicator */
.data-source-indicator {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  /* Prevent badge from shrinking */
}

.source-badge {
  display: inline-block;
  padding: 2px 6px;
  /* Slightly more compact padding */
  border-radius: 10px;
  font-size: 9px;
  /* Slightly smaller font */
  font-weight: 500;
  color: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  white-space: nowrap;
  /* Prevent badge text from wrapping */
}

.source-badge.realtime {
  background: linear-gradient(45deg, #4CAF50, #45a049);
}

.source-badge.historical {
  background: linear-gradient(45deg, #2196F3, #1976D2);
}

.source-badge.fallback {
  background: linear-gradient(45deg, #FF9800, #F57C00);
}

.header-line-2 {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  /* Changed from flex-start to space-between */
  width: 100%;
  gap: 8px;
  margin-top: 2px;
}

.left-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  /* Space between the dropdown buttons */
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

.custom-date-modal .ant-picker-input>input {
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

.ant-modal-content {
  padding: 10px 14px !important;
}
</style>
