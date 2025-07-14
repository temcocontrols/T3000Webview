<template>
  <a-config-provider :theme="{
    algorithm: theme.defaultAlgorithm,
    token: {
      colorPrimary: '#0064c8',
      colorBgBase: '#ffffff',
      colorText: '#000000',
      colorBorder: '#d9d9d9',
    },
  }">
    <a-modal v-model:visible="timeSeriesModalVisible" :title="null" :width="1400" :footer="null"
      style="border-radius: 0px; top: 5px;" wrapClassName="t3-timeseries-modal" @cancel="handleCancel" centered>
      <!-- Top Controls Bar -->
      <div class="top-controls-bar">
        <div class="controls-group">
          <!-- Section 1: Time & Navigation Controls -->
          <div class="controls-section section-time">
            <!-- Time Base -->
            <div class="control-item">
              <a-typography-text class="control-label">Time Base:</a-typography-text>
              <a-select v-model:value="timeBase" size="small" style="width: 120px;" @change="onTimeBaseChange">
                <a-select-option value="5m">5 minutes</a-select-option>
                <a-select-option value="15m">15 minutes</a-select-option>
                <a-select-option value="30m">30 minutes</a-select-option>
                <a-select-option value="1h">1 hour</a-select-option>
                <a-select-option value="6h">6 hours</a-select-option>
                <a-select-option value="12h">12 hours</a-select-option>
                <a-select-option value="24h">24 hours</a-select-option>
                <a-select-option value="7d">7 days</a-select-option>
                <a-select-option value="custom">Custom Define</a-select-option>
              </a-select>
            </div>

            <!-- Navigation Arrows -->
            <div class="control-item">
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
            </div>
          </div>

          <!-- Vertical Separator -->
          <div class="section-divider"></div>

          <!-- Section 2: Zoom & View Controls -->
          <div class="controls-section section-zoom">
            <!-- Zoom Controls -->
            <div class="control-item">
              <a-dropdown placement="bottomRight">
                <a-button size="small" style="display: flex; align-items: center;">
                  <ZoomInOutlined style="margin-right: 4px;" />
                  <span>Zoom</span>
                  <DownOutlined style="margin-left: 4px;" />
                </a-button>
                <template #overlay>
                  <a-menu class="zoom-options-menu">
                    <a-menu-item key="zoom-in">
                      <a-button type="text" size="small" @click="zoomIn" style="width: 100%; text-align: left;">
                        <template #icon>
                          <ZoomInOutlined />
                        </template>
                        Zoom In
                      </a-button>
                    </a-menu-item>
                    <a-menu-item key="zoom-out">
                      <a-button type="text" size="small" @click="zoomOut" style="width: 100%; text-align: left;">
                        <template #icon>
                          <ZoomOutOutlined />
                        </template>
                        Zoom Out
                      </a-button>
                    </a-menu-item>
                    <a-menu-divider />
                    <a-menu-item key="reset-zoom">
                      <a-button type="text" size="small" @click="resetZoom" style="width: 100%; text-align: left;">
                        <template #icon>
                          <ReloadOutlined />
                        </template>
                        Reset Zoom
                      </a-button>
                    </a-menu-item>
                  </a-menu>
                </template>
              </a-dropdown>
            </div>

            <!-- View Buttons -->
            <div class="control-item">
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
            </div>
          </div>

          <!-- Vertical Separator -->
          <div class="section-divider"></div>

          <!-- Section 3: Chart Info & Status -->
          <div class="controls-section section-info">
            <!-- Chart Title -->
            <div class="control-item chart-title-compact">
              <h3 class="chart-title">{{ chartTitle }}</h3>
            </div>

            <!-- Status Tags -->
            <div class="control-item status-tags">
              <!-- Live/Historical Status with enhanced info -->
              <a-tag color="green" v-if="isRealTime" size="small">
                <template #icon>
                  <SyncOutlined :spin="true" />
                </template>
                Live • Updated {{ lastUpdateTime }}
              </a-tag>
              <a-tag color="blue" v-else size="small">
                <template #icon>
                  <ClockCircleOutlined />
                </template>
                Historical
              </a-tag>

              <!-- Connection Status -->
              <a-tag :color="connectionStatus === 'connected' ? 'green' : connectionStatus === 'connecting' ? 'orange' : 'red'" size="small">
                <template #icon>
                  <WifiOutlined v-if="connectionStatus === 'connected'" />
                  <LoadingOutlined v-else-if="connectionStatus === 'connecting'" />
                  <DisconnectOutlined v-else />
                </template>
                {{ connectionStatus === 'connected' ? 'Online' : connectionStatus === 'connecting' ? 'Connecting' : 'Offline' }}
              </a-tag>

              <!-- Series Count -->
              <a-tag size="small">{{ visibleSeriesCount }} series</a-tag>

              <!-- Range Info -->
              <a-tag size="small">{{ timeBase === 'custom' ? 'Custom' : timeBaseLabel }}</a-tag>

              <!-- View Info -->
              <a-tag color="blue" size="small">View {{ currentView }}</a-tag>
            </div>
          </div>

          <!-- Vertical Separator -->
          <div class="section-divider"></div>

          <!-- Section 4: Chart Options & Export -->
          <div class="controls-section section-options">
            <!-- Chart Options -->
            <div class="control-item chart-options">
              <a-dropdown placement="bottomRight">
                <a-button size="small" style="display: flex; align-items: center;">
                  <SettingOutlined style="margin-right: 4px;" />
                  <span>Chart</span>
                  <DownOutlined style="margin-left: 4px;" />
                </a-button>
                <template #overlay>
                  <a-menu class="chart-options-menu">
                    <a-menu-item key="grid">
                      <a-button type="text" size="small" @click="toggleGridOption" style="width: 100%; text-align: left;">
                        <template #icon>
                          <a-checkbox v-model:checked="showGrid" @click.stop style="margin-right: 8px;" />
                        </template>
                        Show Grid
                      </a-button>
                    </a-menu-item>
                    <a-menu-item key="legend">
                      <a-button type="text" size="small" @click="toggleLegendOption" style="width: 100%; text-align: left;">
                        <template #icon>
                          <a-checkbox v-model:checked="showLegend" @click.stop style="margin-right: 8px;" />
                        </template>
                        Show Legend
                      </a-button>
                    </a-menu-item>
                    <a-menu-item key="smooth">
                      <a-button type="text" size="small" @click="toggleSmoothOption" style="width: 100%; text-align: left;">
                        <template #icon>
                          <a-checkbox v-model:checked="smoothLines" @click.stop style="margin-right: 8px;" />
                        </template>
                        Smooth Lines
                      </a-button>
                    </a-menu-item>
                    <a-menu-item key="points">
                      <a-button type="text" size="small" @click="togglePointsOption" style="width: 100%; text-align: left;">
                        <template #icon>
                          <a-checkbox v-model:checked="showPoints" @click.stop style="margin-right: 8px;" />
                        </template>
                        Show Points
                      </a-button>
                    </a-menu-item>
                    <a-menu-divider />
                    <a-menu-item key="reset">
                      <a-button type="text" size="small" @click="resetChartOptions" style="width: 100%; text-align: left;">
                        <template #icon>
                          <ReloadOutlined />
                        </template>
                        Reset to Default
                      </a-button>
                    </a-menu-item>
                  </a-menu>
                </template>
              </a-dropdown>
            </div>

            <!-- Export Options -->
            <div class="control-item export-options">
              <a-dropdown placement="bottomRight">
                <a-button size="small" style="display: flex; align-items: center;">
                  <ExportOutlined style="margin-right: 4px;" />
                  <span>Export</span>
                  <DownOutlined style="margin-left: 4px;" />
                </a-button>
                <template #overlay>
                  <a-menu class="export-options-menu">
                    <a-menu-item key="png">
                      <a-button type="text" size="small" @click="exportChart" style="width: 100%; text-align: left;">
                        <template #icon>
                          <FileImageOutlined />
                        </template>
                        Export as PNG
                      </a-button>
                    </a-menu-item>
                    <a-menu-item key="jpg">
                      <a-button type="text" size="small" @click="exportChartJPG" style="width: 100%; text-align: left;">
                        <template #icon>
                          <FileImageOutlined />
                        </template>
                        Export as JPG
                      </a-button>
                    </a-menu-item>
                    <a-menu-divider />
                    <a-menu-item key="csv">
                      <a-button type="text" size="small" @click="exportData" style="width: 100%; text-align: left;">
                        <template #icon>
                          <FileExcelOutlined />
                        </template>
                        Export Data (CSV)
                      </a-button>
                    </a-menu-item>
                    <a-menu-item key="json">
                      <a-button type="text" size="small" @click="exportDataJSON" style="width: 100%; text-align: left;">
                        <template #icon>
                          <FileTextOutlined />
                        </template>
                        Export Data (JSON)
                      </a-button>
                    </a-menu-item>
                  </a-menu>
                </template>
              </a-dropdown>
            </div>
          </div>
        </div>
      </div>

      <div class="timeseries-container"> <!-- Left Panel: Data Series and Options -->
        <div class="left-panel">
          <!-- Data Series -->
          <div class="control-section">
            <div class="data-series-header">
              <!-- Line 1: Title with modal title and series count -->
              <div class="header-line-1">
                <h5>{{ modalTitle }} - Data Series ({{ visibleSeriesCount }}/{{ dataSeries.length }})</h5>
              </div>

              <!-- Line 2: All dropdown, By Type dropdown, Auto Scroll toggle -->
              <div class="header-line-2">
                <a-dropdown>
                  <a-button size="small" style="display: flex; align-items: center;">
                    <span>All</span>
                    <DownOutlined style="margin-left: 4px;" />
                  </a-button>
                  <template #overlay>
                    <a-menu>
                      <a-menu-item :disabled="!hasDisabledSeries">
                        <a-button type="text" size="small" @click="enableAllSeries" style="width: 100%; text-align: left;" :disabled="!hasDisabledSeries">
                          <template #icon>
                            <!-- <SyncOutlined /> -->
                          </template>
                          Enable All
                        </a-button>
                      </a-menu-item>
                      <a-menu-item :disabled="!hasEnabledSeries">
                        <a-button type="text" size="small" @click="disableAllSeries" style="width: 100%; text-align: left;" :disabled="!hasEnabledSeries">
                          <template #icon>
                            <DisconnectOutlined />
                          </template>
                          Disable All
                        </a-button>
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
                    <a-menu>
                      <a-menu-item :disabled="!hasAnalogSeries">
                        <a-button type="text" size="small" @click="toggleAnalogSeries" style="width: 100%; text-align: left;" :disabled="!hasAnalogSeries">
                          <template #icon>
                            <!-- <SyncOutlined v-if="!allAnalogEnabled" />
                            <DisconnectOutlined v-else /> -->
                          </template>
                          {{ allAnalogEnabled ? 'Disable' : 'Enable' }} Analog ({{ analogCount }})
                        </a-button>
                      </a-menu-item>
                      <a-menu-item :disabled="!hasDigitalSeries">
                        <a-button type="text" size="small" @click="toggleDigitalSeries" style="width: 100%; text-align: left;" :disabled="!hasDigitalSeries">
                          <template #icon>
                            <!-- <SyncOutlined v-if="!allDigitalEnabled" />
                            <DisconnectOutlined v-else /> -->
                          </template>
                          {{ allDigitalEnabled ? 'Disable' : 'Enable' }} Digital ({{ digitalCount }})
                        </a-button>
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
              <div v-for="(series, index) in dataSeries" :key="series.name" class="series-item" :class="{
                'series-disabled': !series.visible,
                'series-empty': series.isEmpty
              }">
                <div class="series-header" @click="series.isEmpty ? null : toggleSeries(index)">
                  <div v-if="!series.isEmpty" class="series-color-indicator" :style="{ backgroundColor: series.color }"></div>
                  <div class="series-info">
                    <span class="series-name">
                      {{ series.name }}
                      <span v-if="series.isEmpty" class="empty-indicator">(No Data)</span>
                    </span>
                    <div v-if="!series.isEmpty" class="series-details">
                      <a-tag size="small" :color="series.unitType === 'digital' ? 'blue' : 'green'">
                        {{ series.itemType }}
                      </a-tag>
                      <span class="unit-info">{{ series.unit }}</span>
                    </div>
                  </div>
                  <div class="series-controls" v-if="!series.isEmpty">
                    <a-button size="small" type="text" class="expand-toggle"
                      @click="(e) => toggleSeriesExpansion(index, e)">
                      <template #icon>
                        <DownOutlined v-if="expandedSeries.has(index)" class="expand-icon expanded" />
                        <RightOutlined v-else class="expand-icon" />
                      </template>
                    </a-button>
                    <a-switch v-model:checked="series.visible" size="small" @change="onSeriesVisibilityChange(index)" />
                  </div>
                  <div class="series-controls" v-else>
                    <span class="empty-placeholder">—</span>
                  </div>
                </div>
                <div v-if="expandedSeries.has(index) && !series.isEmpty" class="series-stats">
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

          <!-- Custom Date Range (only shown when Custom Define is selected) -->
          <div v-if="timeBase === 'custom'" class="control-section custom-date-section">
            <h4>Custom Range</h4>
            <a-space direction="vertical" size="small" style="width: 100%;">
              <a-date-picker v-model:value="customStartDate" placeholder="Start Date" size="small" style="width: 100%;"
                @change="onCustomDateChange" />
              <a-date-picker v-model:value="customEndDate" placeholder="End Date" size="small" style="width: 100%;"
                @change="onCustomDateChange" />
            </a-space>
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
    </a-modal>
  </a-config-provider>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { message, notification, theme } from 'ant-design-vue'
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
  FileTextOutlined
} from '@ant-design/icons-vue'
import LogUtil from 'src/lib/T3000/Hvac/Util/LogUtil'

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
    info: { label: 'Unknown', symbol: '' }
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
}

interface Props {
  visible?: boolean
  itemData?: any
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  itemData: null
})

const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

// Reactive state
const timeSeriesModalVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

// New reactive variables for top controls
const timeBase = ref('1h')
const currentView = ref(1)
const zoomLevel = ref(1)
const customStartDate = ref<Dayjs | null>(null)
const customEndDate = ref<Dayjs | null>(null)
const isRealTime = ref(true)
const updateInterval = ref(30000) // 30 seconds
const isLoading = ref(false)
const showGrid = ref(true)
const showLegend = ref(true)
const smoothLines = ref(false)
const showPoints = ref(false)
const lastUpdateTime = ref(new Date().toLocaleTimeString())

// Connection and status tracking
const connectionStatus = ref<'connected' | 'connecting' | 'disconnected'>('connected')

// View switch alert state
const viewAlert = ref({
  visible: false,
  message: ''
})

// Series detail expansion state
const expandedSeries = ref<Set<number>>(new Set())

// Chart data - T3000 mixed digital/analog series (always 14 items)
const generateDataSeries = (): SeriesConfig[] => {
  const colors = [
    '#E53E3E', // Bright Red
    '#1E88E5', // Bright Blue
    '#43A047', // Forest Green
    '#FB8C00', // Deep Orange
    '#8E24AA', // Deep Purple
    '#00ACC1', // Cyan
    '#FDD835', // Bright Yellow
    '#F4511E', // Deep Orange Red
    '#00695C', // Dark Teal
    '#5D4037', // Brown
    '#7B1FA2', // Dark Purple
    '#C62828', // Dark Red
    '#1565C0', // Dark Blue
    '#2E7D32', // Dark Green
    '#EF6C00', // Dark Orange
    '#6A1B9A', // Deep Purple
    '#0277BD', // Light Blue
    '#388E3C', // Medium Green
    '#F57C00', // Amber
    '#7B1FA2', // Purple
    '#0891B2'  // Cyan
  ]

  const baseSeries = [
    'BMC01E1E-1P1B', 'BMC01E1E-2P1B', 'BMC01E1E-3P1B', 'BMC01E1E-4P1B',
    'BMC01E1E-5P1B', 'BMC01E1E-6P1B', 'BMC01E1E-7P1B', 'BMC01E1E-8P1B',
    'BMC01E1E-9P1B', 'BMC01E1E-10P1B', 'BMC01E1E-11P1B', 'BMC01E1E-12P1B',
    'BMC01E1E-13P1B', 'BMC01E1E-14P1B'
  ]

  // Mixed unit codes for demo - digital and analog combined
  const unitCodes = [
    31, // deg.Celsius (analog)
    32, // deg.Fahrenheit (analog)
    1,  // Off/On (digital)
    2,  // Close/Open (digital)
    54, // Percent (analog)
    3,  // Stop/Start (digital)
    44, // Volts (analog)
    5,  // Normal/Alarm (digital)
    49, // Watts (analog)
    8,  // Auto/Manual (digital)
    54, // Percent (analog)
    11, // Inactive/Active (digital)
    42, // CFM (analog)
    18  // Standby/Running (digital)
  ]

  const itemTypes = ['VAR', 'Input', 'Output', 'HOL', 'VAR', 'Input', 'Output', 'HOL', 'VAR', 'Input', 'Output', 'HOL', 'VAR', 'Input']

  return baseSeries.map((name, index) => {
    const unitCode = unitCodes[index]
    const unitInfo = getUnitInfo(unitCode)

    let unit: string
    let digitalStates: [string, string] | undefined

    if (unitInfo.type === 'digital') {
      const digitalInfo = unitInfo.info as { label: string; states: [string, string] }
      unit = digitalInfo.label
      digitalStates = digitalInfo.states
    } else {
      const analogInfo = unitInfo.info as { label: string; symbol: string }
      unit = analogInfo.symbol
      digitalStates = undefined
    }

    return {
      name: name,
      color: colors[index % colors.length],
      data: [],
      visible: index < 7, // Only first 7 visible by default
      unit: unit,
      isEmpty: index >= 7, // Mark items 8-14 as empty by default
      unitType: unitInfo.type,
      unitCode: unitCode,
      digitalStates: digitalStates,
      itemType: itemTypes[index]
    }
  })
}

const dataSeries = ref<SeriesConfig[]>(generateDataSeries())

// Chart references
const chartContainer = ref<HTMLElement>()
const chartCanvas = ref<HTMLCanvasElement>()
let chartInstance: Chart | null = null
let realtimeInterval: NodeJS.Timeout | null = null

// Computed properties
const modalTitle = computed(() => {
  const name = props.itemData?.t3Entry?.description ||
    props.itemData?.t3Entry?.label ||
    props.itemData?.title ||
    'Trend Log Chart'
  // return `Time Series: ${name}`
  return `${name}`
})

const chartTitle = computed(() => {
  return props.itemData?.t3Entry?.description || ''
})

const totalDataPoints = computed(() => {
  return dataSeries.value
    .filter(series => !series.isEmpty)
    .reduce((total, series) => total + series.data.length, 0)
})

const visibleSeriesCount = computed(() => {
  return dataSeries.value.filter(series => series.visible && !series.isEmpty).length
})

const timeBaseLabel = computed(() => {
  const labels = {
    '5m': 'Last 5 minutes',
    '15m': 'Last 15 minutes',
    '30m': 'Last 30 minutes',
    '1h': 'Last 1 hour',
    '6h': 'Last 6 hours',
    '12h': 'Last 12 hours',
    '24h': 'Last 24 hours',
    '7d': 'Last 7 days'
  }
  return labels[timeBase.value] || 'Unknown'
})

// Series control computed properties
const hasEnabledSeries = computed(() => {
  return dataSeries.value.some(series => series.visible && !series.isEmpty)
})

const hasDisabledSeries = computed(() => {
  return dataSeries.value.some(series => !series.visible && !series.isEmpty)
})

const analogSeries = computed(() => {
  return dataSeries.value.filter(series => series.unitType === 'analog' && !series.isEmpty)
})

const digitalSeries = computed(() => {
  return dataSeries.value.filter(series => series.unitType === 'digital' && !series.isEmpty)
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

// Chart configuration with Grafana-like styling
const getChartConfig = () => ({
  type: 'line' as const,
  data: {
    datasets: dataSeries.value
      .filter(series => series.visible && !series.isEmpty)
      .map(series => ({
        label: series.name,
        data: series.data.map(point => ({
          x: point.timestamp,
          y: point.value
        })),
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
        pointBorderWidth: 2
      }))
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index' as const
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

            // Different formatting for digital vs analog
            if (series.unitType === 'digital') {
              const stateIndex = context.parsed.y === 1 ? 1 : 0
              const stateText = series.digitalStates?.[stateIndex] || (context.parsed.y === 1 ? 'High' : 'Low')
              return `${context.dataset.label}: ${stateText} (${context.parsed.y})`
            } else {
              const unit = series.unit || ''
              return `${context.dataset.label}: ${context.parsed.y.toFixed(2)}${unit}`
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
        time: {
          displayFormats: {
            minute: 'HH:mm',
            hour: 'HH:mm',
            day: 'MM/DD'
          }
        },
        grid: {
          color: showGrid.value ? '#d0d0d0' : 'transparent',
          display: showGrid.value
        },
        ticks: {
          color: '#595959',
          font: {
            size: 11,
            family: 'Inter, Helvetica, Arial, sans-serif'
          }
        }
      },
      y: {
        // NEW: Extended Y-axis range to support both digital (0/1) and analog values
        min: -1, // Allow space below 0 for better digital visualization
        grid: {
          color: showGrid.value ? '#d0d0d0' : 'transparent',
          display: showGrid.value
        },
        ticks: {
          color: '#595959',
          font: {
            size: 11,
            family: 'Inter, Helvetica, Arial, sans-serif'
          },
          // NEW: Dynamic Y-axis labeling for mixed units
          callback: function (value: any) {
            // For digital values (0 or 1), show cleaner labels
            if (value === 0 || value === 1) {
              return value.toString()
            }
            // For analog values, show with decimal places
            return typeof value === 'number' ? value.toFixed(1) : value
          }
        }
      }
    },
    elements: {
      line: {
        borderWidth: 2
      },
      point: {
        radius: showPoints.value ? 3 : 0,
        hoverRadius: 6
      }
    }
  }
})

// Data generation and management
const generateMockData = (seriesIndex: number, timeRangeMinutes: number): DataPoint[] => {
  const now = Date.now()
  const points = Math.min(timeRangeMinutes * 2, 200) // 1 point every 30 seconds, max 200 points
  const series = dataSeries.value[seriesIndex]
  const data: DataPoint[] = []

  if (series.unitType === 'digital') {
    // Digital data: Generate step-like transitions between 0 and 1
    let currentState = Math.random() > 0.5 ? 1 : 0

    for (let i = 0; i < points; i++) {
      const timestamp = now - (points - i) * 30000 // 30 second intervals

      // Randomly change state (about 10% chance per point for realistic transitions)
      if (Math.random() < 0.1) {
        currentState = currentState === 1 ? 0 : 1
      }

      data.push({ timestamp, value: currentState })
    }
  } else {
    // Analog data: Generate continuous values based on unit type
    const unitCode = series.unitCode
    let baseValue: number
    let range: number

    // Set realistic ranges based on unit type
    if (unitCode === 31 || unitCode === 32) { // Temperature (°C/°F)
      baseValue = unitCode === 31 ? 20 + seriesIndex * 2 : 68 + seriesIndex * 4
      range = unitCode === 31 ? 10 : 18
    } else if (unitCode === 54) { // Percent
      baseValue = 50 + seriesIndex * 5
      range = 30
    } else if (unitCode === 44) { // Volts
      baseValue = 12 + seriesIndex * 0.5
      range = 2
    } else if (unitCode === 49) { // Watts
      baseValue = 100 + seriesIndex * 50
      range = 50
    } else if (unitCode === 42) { // CFM
      baseValue = 500 + seriesIndex * 100
      range = 200
    } else {
      // Default for other analog units
      baseValue = 10 + seriesIndex * 5
      range = 10
    }

    for (let i = 0; i < points; i++) {
      const timestamp = now - (points - i) * 30000 // 30 second intervals
      const variation = Math.sin(i * 0.1) * range * 0.3 + (Math.random() * range * 0.4 - range * 0.2)
      const value = Math.max(0, baseValue + variation) // Ensure non-negative values
      data.push({ timestamp, value })
    }
  }

  return data
}

const getTimeRangeMinutes = (range: string): number => {
  const ranges = {
    '5m': 5,
    '15m': 15,
    '30m': 30,
    '1h': 60,
    '6h': 360,
    '12h': 720,
    '24h': 1440,
    '7d': 10080
  }
  return ranges[range] || 60
}

const initializeData = () => {
  const minutes = getTimeRangeMinutes(timeBase.value)
  dataSeries.value.forEach((series, index) => {
    if (!series.isEmpty) {
      series.data = generateMockData(index, minutes)
    }
  })
  updateChart()
}

const addRealtimeDataPoint = () => {
  const now = Date.now()
  dataSeries.value.forEach((series, index) => {
    if (series.isEmpty) return

    let newValue: number

    if (series.unitType === 'digital') {
      // Digital data: Randomly change state occasionally (simulate T3000 digital input changes)
      const lastValue = series.data.length > 0 ? series.data[series.data.length - 1].value : 0
      // 5% chance to change state each update (simulating real digital state changes)
      if (Math.random() < 0.05) {
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

    series.data.push({ timestamp: now, value: newValue })

    // Keep only the last 200 points for performance
    if (series.data.length > 200) {
      series.data.shift()
    }
  })

  lastUpdateTime.value = new Date().toLocaleTimeString()
  updateChart()
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
    .filter(series => series.visible && !series.isEmpty && series.data.length > 0)
    .map(series => ({
      label: series.name,
      data: series.data.map(point => ({
        x: point.timestamp,
        y: point.value
      })),
      borderColor: series.color,
      backgroundColor: series.color + '20',
      borderWidth: 2,
      fill: false,
      // Apply step-line for digital, smooth/straight for analog
      stepped: series.unitType === 'digital' ? 'middle' as const : false,
      tension: series.unitType === 'analog' && smoothLines.value ? 0.4 : 0,
      pointRadius: showPoints.value ? 3 : 0,
      pointHoverRadius: 6,
      pointBackgroundColor: series.color,
      pointBorderColor: '#fff',
      pointBorderWidth: 2
    }))

  chartInstance.update('none')
}

// Series control methods
const enableAllSeries = () => {
  dataSeries.value.forEach(series => {
    if (!series.isEmpty) {
      series.visible = true
    }
  })
  updateChart()
}

const disableAllSeries = () => {
  dataSeries.value.forEach(series => {
    if (!series.isEmpty) {
      series.visible = false
    }
  })
  updateChart()
}

const toggleAnalogSeries = () => {
  const enableAnalog = !allAnalogEnabled.value
  dataSeries.value.forEach(series => {
    if (series.unitType === 'analog' && !series.isEmpty) {
      series.visible = enableAnalog
    }
  })
  updateChart()
}

const toggleDigitalSeries = () => {
  const enableDigital = !allDigitalEnabled.value
  dataSeries.value.forEach(series => {
    if (series.unitType === 'digital' && !series.isEmpty) {
      series.visible = enableDigital
    }
  })
  updateChart()
}


// New control functions
const moveTimeLeft = () => {
  if (isRealTime.value) return

  // Move time window left by 15 minutes (or timebase/4)
  const baseMinutes = getTimeRangeMinutes(timeBase.value)
  const shiftMinutes = Math.max(baseMinutes / 4, 15)

  dataSeries.value.forEach((series) => {
    series.data = series.data.map(point => ({
      ...point,
      timestamp: point.timestamp - (shiftMinutes * 60 * 1000)
    }))
  })

  updateChart()
  message.info(`Moved ${shiftMinutes} minutes back`)
}

const moveTimeRight = () => {
  if (isRealTime.value) return

  // Move time window right by 15 minutes (or timebase/4)
  const baseMinutes = getTimeRangeMinutes(timeBase.value)
  const shiftMinutes = Math.max(baseMinutes / 4, 15)

  dataSeries.value.forEach((series) => {
    series.data = series.data.map(point => ({
      ...point,
      timestamp: point.timestamp + (shiftMinutes * 60 * 1000)
    }))
  })

  updateChart()
  message.info(`Moved ${shiftMinutes} minutes forward`)
}

const zoomIn = () => {
  if (zoomLevel.value < 4) {
    zoomLevel.value = Math.min(zoomLevel.value * 1.5, 4)

    if (chartInstance) {
      const xScale = chartInstance.scales.x
      const range = xScale.max - xScale.min
      const newRange = range / 1.5
      const center = (xScale.max + xScale.min) / 2

      chartInstance.options.scales.x.min = center - newRange / 2
      chartInstance.options.scales.x.max = center + newRange / 2
      chartInstance.update('none')
    }

    message.info(`Zoomed to ${Math.round(zoomLevel.value * 100)}%`)
  }
}

const zoomOut = () => {
  if (zoomLevel.value > 0.25) {
    zoomLevel.value = Math.max(zoomLevel.value / 1.5, 0.25)

    if (chartInstance) {
      const xScale = chartInstance.scales.x
      const range = xScale.max - xScale.min
      const newRange = range * 1.5
      const center = (xScale.max + xScale.min) / 2

      chartInstance.options.scales.x.min = center - newRange / 2
      chartInstance.options.scales.x.max = center + newRange / 2
      chartInstance.update('none')
    }

    message.info(`Zoomed to ${Math.round(zoomLevel.value * 100)}%`)
  }
}

const resetZoom = () => {
  zoomLevel.value = 1.0

  if (chartInstance) {
    // Reset to original data range
    const timeRangeMinutes = getTimeRangeMinutes(timeBase.value)
    const now = Date.now()
    const startTime = now - timeRangeMinutes * 60 * 1000

    chartInstance.options.scales.x.min = startTime
    chartInstance.options.scales.x.max = now
    chartInstance.update('none')
  }

  message.info('Zoom reset to 100%')
}

const setView = (viewNumber: number) => {
  currentView.value = viewNumber

  // Different view configurations
  const viewConfigs = {
    1: {
      showGrid: true,
      showLegend: true,
      smoothLines: false,
      showPoints: false,
      title: 'Standard View',
      description: 'Grid lines and legend enabled for comprehensive data analysis'
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
      showLegend: true,
      smoothLines: true,
      showPoints: true,
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
const onTimeBaseChange = () => {
  if (timeBase.value !== 'custom') {
    initializeData()
  }
}

const onCustomDateChange = () => {
  if (timeBase.value === 'custom' && customStartDate.value && customEndDate.value) {
    // Generate data for custom date range
    initializeData()
  }
}

const onRealTimeToggle = (checked: boolean) => {
  if (checked) {
    startRealTimeUpdates()
  } else {
    stopRealTimeUpdates()
  }
}

const onSeriesVisibilityChange = (index) => {
  LogUtil.Debug(`Toggling visibility for series ${dataSeries.value[index].name}`)
  toggleSeries(index)
}

const toggleSeries = (index: number) => {
  if (dataSeries.value[index].isEmpty) return
  dataSeries.value[index].visible = !dataSeries.value[index].visible
  updateChart()
}

const toggleSeriesExpansion = (index: number, event?: Event) => {
  // Stop event propagation to prevent triggering parent handlers
  if (event && typeof event.stopPropagation === 'function') {
    event.stopPropagation()
  }

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
  realtimeInterval = setInterval(addRealtimeDataPoint, updateInterval.value)
}

const stopRealTimeUpdates = () => {
  if (realtimeInterval) {
    clearInterval(realtimeInterval)
    realtimeInterval = null
  }
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

  message.success('Chart exported successfully')
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

  message.success('Data exported successfully')
}

// Additional Export Methods
const exportChartJPG = () => {
  if (!chartInstance) return

  const link = document.createElement('a')
  link.download = `${chartTitle.value}_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.jpg`
  link.href = chartInstance.toBase64Image('image/jpeg', 0.9)
  link.click()

  message.success('Chart exported as JPG successfully')
}

const exportChartSVG = () => {
  if (!chartInstance) return

  // Note: Chart.js doesn't natively support SVG export
  // This would require additional library like chart.js-to-svg
  message.info('SVG export requires additional implementation')
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

  message.success('Data exported as JSON successfully')
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

  message.success('Chart options reset to default')
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

const handleCancel = () => {
  stopRealTimeUpdates()
  timeSeriesModalVisible.value = false
}

// Watchers
watch([showGrid, showLegend, smoothLines, showPoints], () => {
  if (chartInstance) {
    chartInstance.destroy()
    createChart()
  }
})

watch(() => props.visible, (newVal) => {
  if (newVal) {
    nextTick(() => {
      initializeData()
      createChart()
      if (isRealTime.value) {
        startRealTimeUpdates()
      }
      lastUpdateTime.value = new Date().toLocaleTimeString()
    })
  } else {
    stopRealTimeUpdates()
  }
})

// Lifecycle
onMounted(() => {
  if (props.visible) {
    nextTick(() => {
      initializeData()
      createChart()
      if (isRealTime.value) {
        startRealTimeUpdates()
      }
    })
  }
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
  height: calc(85vh - 40px);
  /* Increased height for better chart visibility */
  min-height: 600px;
  /* Increased minimum height */
  max-height: 800px;
  /* Increased maximum height for larger screens */
  gap: 6px;
  /* Ultra-minimal gap for maximum space */
  background: #ffffff;
  border-radius: 0px;
  /* No border radius */
  overflow: visible;
  padding: 0;
  /* Remove any default padding */
}

.left-panel {
  width: 280px;
  /* Reduced from 300px */
  background: #fafafa;
  border: 1px solid #e8e8e8;
  border-radius: 0px;
  /* No border radius */
  overflow-y: auto;
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
  min-width: 0;
  /* Allow flex shrinking */
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
  padding: 8px;
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
}

.header-line-1 h5 {
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
.series-item:not(.series-disabled):not(.series-empty) {
  cursor: pointer;
}

.series-disabled {
  opacity: 0.5;
  filter: grayscale(0.5);
}

.series-empty {
  opacity: 0.4;
  pointer-events: none;
  background: #e8e8e8 !important;
}

.series-empty .series-header {
  cursor: default;
}

.series-empty .series-name,
.series-empty .stat-label,
.series-empty .stat-value,
.series-empty .unit-info {
  color: #8c8c8c !important;
  text-shadow: none !important;
}

.empty-indicator {
  color: #bfbfbf !important;
  font-style: italic;
  font-size: 10px;
  margin-left: 4px;
}

.empty-placeholder {
  color: #bfbfbf;
  font-size: 14px;
  width: 52px;
  text-align: center;
}

.series-header {
  display: flex;
  align-items: center;
  padding: 6px 10px;
  cursor: pointer;
  gap: 8px;
  transition: background-color 0.2s ease;
}

.series-header:hover:not(.series-empty .series-header) {
  background-color: rgba(0, 100, 200, 0.04);
}

.series-color-indicator {
  width: 3px;
  height: 24px;
  border-radius: 2px;
  flex-shrink: 0;
  opacity: 0.8;
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
}

.series-details {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: nowrap;
}

.unit-info {
  color: #595959;
  font-size: 10px;
  font-weight: 500;
  background: rgba(0, 0, 0, 0.04);
  padding: 2px 4px;
  border-radius: 3px;
  white-space: nowrap;
  border: 1px solid rgba(0, 0, 0, 0.06);
}

.series-controls {
  display: flex;
  align-items: center;
  gap: 8px;
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
  padding: 12px;
  /* Reduced padding */
  position: relative;
  min-height: 280px;
  /* Reduced min height */
  display: flex;
  flex-direction: column;
}

.chart-canvas {
  width: 100% !important;
  height: 100% !important;
  min-height: 260px;
  /* Reduced min height */
}

/* Top Controls Bar Styling */
.top-controls-bar {
  background: #fafafa;
  border: 1px solid #e8e8e8;
  border-radius: 0px;
  padding: 8px 12px;
  margin-bottom: 5px;
  box-sizing: border-box;
}

.controls-group {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0;
  flex-wrap: nowrap;
  width: 100%;
  min-height: 32px;
  box-sizing: border-box;
}

/* New sectioned controls structure */
.controls-section {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: nowrap;
  padding: 0 12px;
  min-height: 32px;
}

.section-time {
  flex-shrink: 1;
  min-width: 280px;
}

.section-info {
  flex: 1;
  min-width: 300px;
  justify-content: flex-start;
}

.section-zoom {
  flex-shrink: 0;
  min-width: 200px;
}

.section-options {
  flex-shrink: 0;
  min-width: 160px;
}

/* Vertical dividers between sections */
.section-divider {
  width: 1px;
  height: 28px;
  background: linear-gradient(to bottom, transparent, #d9d9d9 20%, #d9d9d9 80%, transparent);
  margin: 0 6px;
  flex-shrink: 0;
}

/* Chart title and status tags in info section */
.chart-title-compact {
  margin-right: 8px;
}

.chart-title {
  font-size: 14px;
  font-weight: 600;
  margin: 0;
  color: #262626;
  white-space: nowrap;
}

.status-tags {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: nowrap;
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
  font-size: 12px !important;
  color: #262626 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: flex-start !important;
}

:deep(.chart-options-menu .ant-btn .anticon),
:deep(.zoom-options-menu .ant-btn .anticon),
:deep(.export-options-menu .ant-btn .anticon) {
  font-size: 12px !important;
  margin-right: 6px !important;
  color: #1890ff !important;
}

:deep(.chart-options-menu .ant-btn span),
:deep(.zoom-options-menu .ant-btn span),
:deep(.export-options-menu .ant-btn span) {
  font-size: 12px !important;
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
  font-size: 12px !important;
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
  font-size: 12px !important;
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
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
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

/* Mobile responsive layout for main container */
@media (max-width: 768px) {
  .timeseries-container {
    flex-direction: column;
    height: auto;
    min-height: auto;
    max-height: none;
    gap: 8px;
  }

  .left-panel {
    width: 100%;
    min-height: 300px;
    max-height: 400px;
    order: 1;
  }

  .right-panel {
    width: 100%;
    min-height: 400px;
    order: 2;
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

@media (max-width: 480px) {
  .top-controls-bar {
    padding: 4px 6px;
  }

  .controls-section {
    padding: 4px 6px;
    gap: 3px;
  }

  .status-tags {
    gap: 2px;
  }

  .status-tags .ant-tag {
    font-size: 9px !important;
    padding: 1px 3px !important;
    line-height: 16px !important;
    margin: 0 !important;
  }

  .chart-title {
    font-size: 11px;
  }

  .control-label {
    font-size: 10px !important;
  }

  /* Compact select and buttons for small screens */
  .section-time .ant-select {
    width: 100% !important;
    max-width: 140px;
  }

  .section-zoom .ant-btn-group .ant-btn {
    min-width: 50px;
    font-size: 10px;
    padding: 0 6px;
  }

  .section-options .ant-btn {
    font-size: 10px;
    padding: 0 6px;
  }

  /* Stack elements vertically in sections for very small screens */
  .section-time .control-item,
  .section-zoom .control-item {
    width: 100%;
  }

  .section-time .ant-btn-group {
    width: 100%;
    justify-content: center;
  }

  .section-zoom .ant-btn-group {
    width: 100%;
    justify-content: center;
  }

  :global(.t3-timeseries-modal .ant-modal) {
    width: 98vw !important;
    margin: 5px auto !important;
  }

  :global(.t3-timeseries-modal .ant-modal-content) {
    padding: 6px 8px !important;
  }
}

@media (min-width: 768px) {
  .controls-left {
    overflow: hidden;
  }
}

/* Make series details tags much smaller */
.series-details .ant-tag {
  font-size: 10px !important;
  padding: 0 2px !important;
  line-height: 12px !important;
  height: 12px !important;
  margin: 0 !important;
  border-radius: 2px !important;
  min-width: auto !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  vertical-align: middle !important;
  border-width: 1px !important;
}

/* Override Ant Design tag styles more aggressively */
:deep(.series-details .ant-tag) {
  font-size:10px !important;
  padding: 0 2px !important;
  line-height: 12px !important;
  height: 12px !important;
  margin: 0 !important;
  border-radius: 2px !important;
  min-width: auto !important;
  box-sizing: border-box !important;
}

:deep(.series-details .ant-tag-blue) {
  font-size: 10px !important;
  padding: 0 2px !important;
  line-height: 12px !important;
  height: 12px !important;
}

:deep(.series-details .ant-tag-green) {
  font-size: 10px !important;
  padding: 0 2px !important;
  line-height: 12px !important;
  height: 12px !important;
}
</style>

<!-- Modal Content Padding Override -->
<style>
/* Override ant-modal-content padding from default 20,24 to 10,14 */
.t3-timeseries-modal .ant-modal-content {
  padding: 10px 14px !important;
}
</style>

<style scoped>
/* Additional robustness for top-controls-bar */
.top-controls-bar * {
  box-sizing: border-box;
}

/* Force single-line behavior for control labels */
.control-label {
  white-space: nowrap !important;
  font-size: 11px !important;
  flex-shrink: 0;
}

/* Ensure dropdowns don't break layout */
.control-item .ant-btn {
  white-space: nowrap !important;
  flex-shrink: 0;
}

.control-item .ant-select {
  flex-shrink: 0;
}

/* Prevent button groups from wrapping */
.control-item .ant-btn-group {
  flex-shrink: 0;
  white-space: nowrap;
}

/* Force chart info elements to stay compact */
.status-tags .ant-tag {
  flex-shrink: 0;
  white-space: nowrap;
  font-size: 10px !important;
  padding: 0 4px !important;
  line-height: 18px !important;
}

/* Override any ant design min-width constraints */
.top-controls-bar .ant-select-selector {
  min-width: auto !important;
}

.top-controls-bar .ant-btn {
  min-width: auto !important;
}

/* Ensure proper overflow handling */
.controls-group {
  overflow: hidden;
}

/* Responsive design for sectioned top bar */
@media (max-width: 1200px) {
  .section-info {
    min-width: 250px;
  }

  .section-time {
    min-width: 240px;
  }

  .status-tags .ant-tag {
    font-size: 9px !important;
    padding: 0 3px !important;
  }

  .chart-title {
    font-size: 13px;
  }
}

@media (max-width: 768px) {
  .controls-group {
    flex-direction: column;
    gap: 6px;
    align-items: stretch;
  }

  .controls-section {
    padding: 6px 8px;
    min-height: auto;
    justify-content: flex-start;
    flex-wrap: wrap;
    gap: 6px;
  }

  .section-divider {
    display: none;
  }

  .section-time,
  .section-info,
  .section-zoom,
  .section-options {
    min-width: auto;
    width: 100%;
    flex: none;
  }

  .section-time {
    background: rgba(0, 100, 200, 0.05);
    border-radius: 4px;
    border: 1px solid rgba(0, 100, 200, 0.1);
  }

  .section-info {
    background: rgba(255, 140, 0, 0.05);
    border-radius: 4px;
    border: 1px solid rgba(255, 140, 0, 0.1);
  }

  .section-zoom {
    background: rgba(0, 150, 0, 0.05);
    border-radius: 4px;
    border: 1px solid rgba(0, 150, 0, 0.1);
  }

  .section-options {
    background: rgba(130, 0, 130, 0.05);
    border-radius: 4px;
    border: 1px solid rgba(130, 0, 130, 0.1);
  }

  .status-tags {
    justify-content: flex-start;
    flex-wrap: wrap;
    gap: 4px;
    width: 100%;
  }

  .chart-title {
    text-align: left;
    font-size: 12px;
    margin-bottom: 4px;
  }

  .chart-title-compact {
    width: 100%;
    margin-bottom: 4px;
  }

  .control-item {
    gap: 4px;
    flex-wrap: wrap;
  }

  /* Ensure Time Base controls don't overflow */
  .section-time .control-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 3px;
  }

  .section-time .control-label {
    font-size: 11px;
    margin-bottom: 2px;
  }

  /* Make button groups wrap on mobile */
  .section-time .ant-btn-group,
  .section-zoom .ant-btn-group {
    flex-wrap: wrap;
  }

  /* Optimize View buttons for mobile */
  .section-zoom .ant-btn-group .ant-btn {
    min-width: 60px;
    font-size: 11px;
  }
}

@media (max-width: 480px) {
  .top-controls-bar {
    padding: 4px 6px;
  }

  .controls-section {
    padding: 4px 6px;
    gap: 3px;
  }

  .status-tags {
    gap: 2px;
  }

  .status-tags .ant-tag {
    font-size: 9px !important;
    padding: 1px 3px !important;
    line-height: 16px !important;
    margin: 0 !important;
  }

  .chart-title {
    font-size: 11px;
  }

  .control-label {
    font-size: 10px !important;
  }

  /* Compact select and buttons for small screens */
  .section-time .ant-select {
    width: 100% !important;
    max-width: 140px;
  }

  .section-zoom .ant-btn-group .ant-btn {
    min-width: 50px;
    font-size: 10px;
    padding: 0 6px;
  }

  .section-options .ant-btn {
    font-size: 10px;
    padding: 0 6px;
  }

  /* Stack elements vertically in sections for very small screens */
  .section-time .control-item,
  .section-zoom .control-item {
    width: 100%;
  }

  .section-time .ant-btn-group {
    width: 100%;
    justify-content: center;
  }

  .section-zoom .ant-btn-group {
    width: 100%;
    justify-content: center;
  }
}
</style>
