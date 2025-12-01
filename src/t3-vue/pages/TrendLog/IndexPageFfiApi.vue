<!--
  TrendLog IndexPageFfiApi - T3000 FFI API Integration for displaying trend logs

  URL Parameters:
  - sn: Serial number of the T3000 device (required for real data)
  - panel_id: Panel ID within the device (required for real data)
  - trendlog_id: Specific trend log ID to display (required for real data)
  - all_data: Monitor point data in URL-encoded JSON format (from C++ backend)

  Example URLs:
  - Demo mode: http://localhost:3003/#/trend-log-ffi
  - Real data: http://localhost:3003/#/trend-log-ffi?sn=123&panel_id=3&trendlog_id=1
  - With JSON data: http://localhost:3003/#/trend-log-ffi?sn=123&panel_id=3&trendlog_id=1&all_data=<URL-encoded-JSON>

  Data Flow (NEW FFI API):
  1. C++ CBacnetMonitor::OnBnClickedBtnMonitorGraphic() generates JSON from Str_monitor_point
  2. JSON is URL-encoded and passed as alldata parameter (Priority 1)
  3. Falls back to NEW FFI API endpoints (/api/t3000/*) with HTTP retry patterns
  4. Uses same JSON structure as WebSocket for consistency
  5. Shows error state if no valid data source is available

  NEW FFI API Endpoints (with HTTP retry):
  1. Primary: /api/t3000/devices/{panel_id} - Direct FFI call with retry
  2. Realtime: /api/t3000/realtime/{panel_id} - Real-time FFI data
  3. Points: /api/t3000/devices/{panel_id}/points - All device points
  4. Status: /api/t3000/status - System status check
-->
<template>
  <div class="trend-log-page">
    <!-- Loading State -->
    <div v-if="isLoading" class="loading-wrapper">
      <div class="loading-content">
        <div class="loading-spinner"></div>
        <p>Loading trend log data via FFI API...</p>
        <p v-if="ffiApi.isLoading.value" class="loading-detail">🔄 FFI API call in progress...</p>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-wrapper">
      <div class="error-content">
        <h3>Error Loading Data</h3>
        <p>{{ error }}</p>
        <div v-if="ffiApi.hasError.value" class="ffi-error-details">
          <p><strong>FFI API Error:</strong> {{ ffiApi.error.value }}</p>
          <button @click="ffiApi.clearError(); loadTrendLogItemData()" class="retry-button">
            Clear Error & Retry
          </button>
        </div>
        <button v-else @click="loadTrendLogItemData" class="retry-button">Retry</button>
      </div>
    </div>

    <!-- Chart Content -->
    <div v-else-if="hasScheduleItemData" class="chart-wrapper">
      <!-- Data Source Indicator -->
      <div class="data-source-indicator">
        <span v-if="dataSource === 'json'" class="source-badge realtime">
          📡 Real-time Data (From C++ Backend)
        </span>
        <span v-else-if="dataSource === 'ffi-api'" class="source-badge ffi-api">
          🔧 FFI API Data (HTTP with Retry)
        </span>
        <span v-else-if="dataSource === 'ffi-realtime'" class="source-badge ffi-realtime">
          �?FFI Real-time (HTTP Direct)
        </span>
        <span v-else class="source-badge fallback">
          ⚠️ No Data Available
        </span>
      </div>

      <!-- System Status (if available) -->
      <div v-if="systemStatus" class="system-status-indicator">
        <span :class="['status-badge', systemStatus.status === 'running' ? 'running' : 'offline']">
          {{ systemStatus.status === 'running' ? '🟢' : '🔴' }}
          FFI Service: {{ systemStatus.status }}
        </span>
        <span class="timestamp">{{ new Date(systemStatus.timestamp).toLocaleTimeString() }}</span>
      </div>

      <TrendLogChart
        :itemData="scheduleItemData"
        :title="pageTitle"
      />
    </div>

    <!-- No Data State -->
    <div v-else class="no-data-wrapper">
      <div class="no-data-content">
        <h3>No Data Available</h3>
        <p>Please provide valid URL parameters to display trend log data.</p>
        <div class="api-actions">
          <button @click="loadTrendLogItemData" class="retry-button">Load Data</button>
          <button @click="refreshSystemData" class="refresh-button">🔄 Refresh FFI Data</button>
          <button @click="checkSystemStatus" class="status-button">📊 Check FFI Status</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, defineOptions, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useQuasar } from 'quasar'
import TrendLogChart from '../../components/NewUI/TrendLogChartFfiApi.vue'
import { scheduleItemData } from '@/lib/vue/T3000/Hvac/Data/Constant/RefConstant'
import LogUtil from '@/lib/vue/T3000/Hvac/Util/LogUtil'
import { useT3000FfiApi } from '@/lib/vue/T3000/Hvac/Opt/FFI/T3000FfiApi'

// Define component name
defineOptions({
  name: 'TrendLogIndexPageFfiApi'
})

// Route and URL parameters
const route = useRoute()
const $q = useQuasar()

// NEW: FFI API integration with HTTP retry patterns
const ffiApi = useT3000FfiApi()

// Page state
const pageTitle = ref('T3000 Trend Log Analysis - FFI API')
const isLoading = ref(false)
const error = ref<string | null>(null)
const trendLogItemData = ref<any>(null)
const jsonValidationStatus = ref<'pending' | 'valid' | 'invalid' | 'error' | null>(null)
const dataSource = ref<'json' | 'ffi-api' | 'ffi-realtime' | 'fallback'>('json')
const systemStatus = ref<any>(null)

// URL Parameters with enhanced JSON handling
const urlParams = computed(() => ({
  sn: route.query.sn ? Number(route.query.sn) : null,
  panel_id: route.query.panel_id ? Number(route.query.panel_id) : null,
  trendlog_id: route.query.trendlog_id ? Number(route.query.trendlog_id) : null,
  all_data: route.query.all_data as string || null
}))

// Computed properties for template
const hasValidParameters = computed(() => {
  const params = urlParams.value
  return params.sn !== null && params.panel_id !== null && params.trendlog_id !== null
})

const hasScheduleItemData = computed(() => {
  return scheduleItemData.value &&
         typeof scheduleItemData.value === 'object' &&
         Object.keys(scheduleItemData.value).length > 0
})

// Helper function to decode URL-encoded JSON with C++ error detection
const decodeUrlEncodedJson = (encodedString: string): any | null => {
  try {
    jsonValidationStatus.value = 'pending'
    const decoded = decodeURIComponent(encodedString)
    LogUtil.Debug('Decoded JSON string:', decoded)

    if (decoded.includes('"error":"JSON conversion failed"')) {
      LogUtil.Debug('Detected C++ JSON conversion error')
      jsonValidationStatus.value = 'error'
      return null
    }

    const parsed = JSON.parse(decoded)
    jsonValidationStatus.value = 'valid'
    return parsed
  } catch (error) {
    console.error('Failed to decode and parse JSON:', error)
    jsonValidationStatus.value = 'invalid'
    return null
  }
}

// Format data from query parameters
const formatDataFromQueryParams = () => {
  const { sn, panel_id, trendlog_id, all_data } = urlParams.value

  if (sn === null || panel_id === null || trendlog_id === null) {
    return null
  }

  let t3EntryData: any = null

  if (all_data) {
    const decodedData = decodeUrlEncodedJson(all_data)
    if (decodedData && jsonValidationStatus.value === 'valid') {
      t3EntryData = decodedData.t3Entry || decodedData
    }
  }

  if (!t3EntryData) {
    t3EntryData = {
      an_inputs: 12,
      command: `${panel_id}MON${trendlog_id}`,
      hour_interval_time: 0,
      id: `MON${trendlog_id}`,
      index: 0,
      input: [],
      label: `TRL${sn}_${panel_id}_${trendlog_id}`,
      minute_interval_time: 0,
      num_inputs: 14,
      pid: panel_id,
      range: [],
      second_interval_time: 15,
      status: 1,
      type: "MON"
    }
  }

  const scheduleData = {
    active: false,
    cat: "TrendLog",
    height: 60,
    id: trendlog_id,
    rotate: 0,
    scaleX: 1,
    scaleY: 1,
    settings: {
      active: false,
      bgColor: "inherit",
      fillColor: "#659dc5",
      fontSize: 16,
      inAlarm: false,
      t3EntryDisplayField: "label",
      textColor: "inherit",
      titleColor: "inherit"
    },
    showDimensions: true,
    t3Entry: t3EntryData,
    title: t3EntryData?.label || 'T3000 Trend Log Analysis - FFI API',
    translate: [583, 68],
    type: "Monitor",
    width: 60,
    zindex: 1
  }

  return { chartData: { title: scheduleData.title, t3Entry: t3EntryData }, scheduleData }
}

// NEW: Load data using FFI API with HTTP retry patterns
const loadTrendLogItemData = async () => {
  LogUtil.Debug('Loading trend log data via FFI API...')

  try {
    isLoading.value = true
    error.value = null
    ffiApi.clearError()

    const params = urlParams.value

    // Priority 1: Try JSON data from URL parameters
    if (params.all_data && params.sn && params.panel_id !== null && params.trendlog_id !== null) {
      LogUtil.Info('📊 Loading data from JSON parameters (realtime)')
      dataSource.value = 'json'

      const formattedData = formatDataFromQueryParams()
      if (formattedData) {
        trendLogItemData.value = formattedData.chartData
        scheduleItemData.value = formattedData.scheduleData
        pageTitle.value = formattedData.chartData.title
        return
      }
    }

    // Priority 2: Try FFI API - Real-time data
    if (params.panel_id !== null) {
      LogUtil.Info('🔧 Loading data via FFI API (realtime)')
      dataSource.value = 'ffi-realtime'

      try {
        const deviceData = await ffiApi.getDeviceRealtimeData(params.panel_id)

        if (deviceData && deviceData.device_info) {
          const ffiScheduleData = {
            id: params.trendlog_id || 0,
            label: `FFI_${deviceData.device_info.panel_name}_${params.trendlog_id || 0}`,
            description: `FFI Real-time Trend Log ${params.trendlog_id || 0} from ${deviceData.device_info.panel_name}`,
            pid: deviceData.device_info.panel_id,
            type: "MON",
            value: 0,
            unit: "",
            status: 1,
            input: deviceData.input_points || [],
            output: deviceData.output_points || [],
            variable: deviceData.variable_points || [],
            range: [],
            num_inputs: (deviceData.input_points?.length || 0) + (deviceData.output_points?.length || 0) + (deviceData.variable_points?.length || 0),
            an_inputs: deviceData.input_points?.filter(p => p.digital_analog === 0).length || 0,
            device_info: deviceData.device_info,
            last_updated: new Date().toISOString()
          }

          trendLogItemData.value = ffiScheduleData
          scheduleItemData.value = ffiScheduleData
          pageTitle.value = `FFI Real-time: ${deviceData.device_info.panel_name} - TrendLog ${params.trendlog_id || 0}`

          LogUtil.Info('�?FFI Real-time data loaded')
          return
        }
      } catch (ffiError) {
        LogUtil.Warn('⚠️ FFI Real-time API failed, trying standard FFI API...', ffiError)
      }
    }

    // Priority 3: Try FFI API - Standard device data
    if (params.panel_id !== null) {
      LogUtil.Info('🔧 Loading data via FFI API (standard)')
      dataSource.value = 'ffi-api'

      try {
        const deviceData = await ffiApi.getDeviceById(params.panel_id)

        if (deviceData && deviceData.device_info) {
          const ffiScheduleData = {
            id: params.trendlog_id || 0,
            label: `FFI_${deviceData.device_info.panel_name}_${params.trendlog_id || 0}`,
            description: `FFI Standard Trend Log ${params.trendlog_id || 0} from ${deviceData.device_info.panel_name}`,
            pid: deviceData.device_info.panel_id,
            type: "MON",
            value: 0,
            unit: "",
            status: 1,
            input: deviceData.input_points || [],
            output: deviceData.output_points || [],
            variable: deviceData.variable_points || [],
            range: [],
            device_info: deviceData.device_info,
            last_updated: new Date().toISOString()
          }

          trendLogItemData.value = ffiScheduleData
          scheduleItemData.value = ffiScheduleData
          pageTitle.value = `FFI API: ${deviceData.device_info.panel_name} - TrendLog ${params.trendlog_id || 0}`

          LogUtil.Info('�?FFI API data loaded')
          return
        }
      } catch (ffiError) {
        LogUtil.Error('�?FFI API failed:', ffiError)
      }
    }

    // Fallback - no valid data available
    LogUtil.Warn('⚠️ No valid data source available')
    dataSource.value = 'fallback'
    trendLogItemData.value = null
    scheduleItemData.value = {}

    if (ffiApi.hasError.value) {
      error.value = `FFI API Error: ${ffiApi.error.value}`
    } else {
      error.value = 'No trend log data available via FFI API'
    }

  } catch (err) {
    console.error('Error loading trend log data via FFI API:', err)
    error.value = err instanceof Error ? err.message : 'Failed to load trend log data via FFI API'
    trendLogItemData.value = null
    scheduleItemData.value = {}
    dataSource.value = 'fallback'
  } finally {
    isLoading.value = false
  }
}

// Check system status
const checkSystemStatus = async () => {
  try {
    LogUtil.Info('📊 Checking FFI API system status...')
    const status = await ffiApi.getSystemStatus()
    systemStatus.value = status
    LogUtil.Info('�?FFI API system status:', status)
  } catch (err) {
    LogUtil.Error('�?Failed to get system status:', err)
    systemStatus.value = { status: 'error', error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

// Refresh system data
const refreshSystemData = async () => {
  try {
    LogUtil.Info('🔄 Refreshing FFI API system data...')
    await ffiApi.refreshAllData()
    LogUtil.Info('�?FFI API system data refreshed')
    await loadTrendLogItemData()
  } catch (err) {
    LogUtil.Error('�?Failed to refresh system data:', err)
  }
}

// Watch for URL parameter changes
watch(
  () => route.query,
  () => {
    LogUtil.Debug('URL parameters changed, refreshing FFI API data...')
    loadTrendLogItemData()
  },
  { immediate: false }
)

// Initialize on mount
onMounted(async () => {
  LogUtil.Info('🚀 TrendLog IndexPageFfiApi: Component mounted')

  // Check system status on mount
  await checkSystemStatus()

  // Load data
  await loadTrendLogItemData()
})
</script>

<style scoped>
.trend-log-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
}

.chart-wrapper {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: #ffffff;
  padding: 16px;
}

/* Loading state styles */
.loading-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
}

.loading-content {
  text-align: center;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #659dc5;
  border-radius: 50%;
  margin: 0 auto 16px auto;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-content p {
  margin: 8px 0;
  color: #666;
  font-size: 14px;
}

.loading-detail {
  font-style: italic;
  color: #999;
}

/* Error state styles */
.error-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
}

.error-content {
  text-align: center;
  padding: 40px;
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  max-width: 600px;
}

.error-content h3 {
  margin: 0 0 16px 0;
  color: #ff4d4f;
  font-size: 18px;
}

.error-content p {
  margin: 0 0 16px 0;
  color: #666;
  font-size: 14px;
  line-height: 1.5;
}

.ffi-error-details {
  background: #fff2f0;
  border: 1px solid #ffccc7;
  border-radius: 6px;
  padding: 16px;
  margin: 16px 0;
}

.ffi-error-details p {
  margin: 0 0 12px 0;
  color: #a8071a;
}

/* No data state styles */
.no-data-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
}

.no-data-content {
  text-align: center;
  padding: 40px;
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  max-width: 600px;
}

.no-data-content h3 {
  margin: 0 0 16px 0;
  color: #8c8c8c;
  font-size: 18px;
}

.no-data-content p {
  margin: 0 0 24px 0;
  color: #666;
  font-size: 14px;
  line-height: 1.5;
}

.api-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}

.retry-button, .refresh-button, .status-button {
  background: #659dc5;
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.retry-button:hover, .refresh-button:hover, .status-button:hover {
  background: #5a8db0;
}

.refresh-button {
  background: #52c41a;
}

.refresh-button:hover {
  background: #45a014;
}

.status-button {
  background: #722ed1;
}

.status-button:hover {
  background: #612db4;
}

/* Data Source Indicator */
.data-source-indicator {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 10;
}

.source-badge {
  display: inline-block;
  padding: 6px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  color: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.source-badge.realtime {
  background: linear-gradient(45deg, #4CAF50, #45a049);
}

.source-badge.ffi-api {
  background: linear-gradient(45deg, #FF9800, #F57C00);
}

.source-badge.ffi-realtime {
  background: linear-gradient(45deg, #9C27B0, #7B1FA2);
}

.source-badge.fallback {
  background: linear-gradient(45deg, #f5222d, #cf1322);
}

/* System Status Indicator */
.system-status-indicator {
  position: absolute;
  top: 40px;
  right: 10px;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 500;
  color: white;
}

.status-badge.running {
  background: #52c41a;
}

.status-badge.offline {
  background: #ff4d4f;
}

.timestamp {
  font-size: 10px;
  color: #8c8c8c;
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  .chart-wrapper {
    padding: 8px;
  }

  .data-source-indicator {
    top: 5px;
    right: 5px;
  }

  .system-status-indicator {
    top: 30px;
    right: 5px;
  }

  .source-badge {
    font-size: 11px;
    padding: 4px 8px;
  }

  .api-actions {
    flex-direction: column;
    align-items: center;
  }

  .retry-button, .refresh-button, .status-button {
    width: 200px;
  }
}
</style>
