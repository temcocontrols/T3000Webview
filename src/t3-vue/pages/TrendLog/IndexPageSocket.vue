
<!--
  TrendLog IndexPage - Standalone page for displaying T3000 trend logs

  URL Parameters:
  - sn: Serial number of the T3000 device (required for real data)
  - panel_id: Panel ID within the device (required for real data)
  - trendlog_id: Specific trend log ID to display (required for real data)
  - all_data: Monitor point data in URL-encoded JSON format (from C++ backend)

  Example URLs:

  - Real data: http://localhost:3003/#/trend-log?sn=123&panel_id=3&trendlog_id=1
  - With JSON data: http://localhost:3003/#/trend-log?sn=123&panel_id=3&trendlog_id=1&all_data=<URL-encoded-JSON>

  Data Flow:
  1. C++ CBacnetMonitor::OnBnClickedBtnMonitorGraphic() generates JSON from Str_monitor_point
  2. JSON is URL-encoded and passed as alldata parameter
  3. IndexPage decodes and parses JSON to display trend log data
  4. Falls back to API endpoints if JSON parsing fails
  5. Shows error state if no valid data source is available.

  API Endpoints Attempted (if JSON parsing fails):
  1. Primary: /api/data/device/{panelid}/trend_logs/{trendlogid}

-->
<template>
  <div class="trend-log-page">
    <!-- Panel ID Error State (T3000 integration, Ant Design style) -->
    <a-alert
      v-if="panelIdError"
      type="info"
      show-icon
      message="Panel ID Error"
      :description="panelIdErrorMsg"
      style="margin: 32px 0;"
    />

    <!-- Error State (Ant Design info alert) -->
    <a-alert
      v-else-if="error"
      type="info"
      show-icon
      message="Error Loading Data"
      :description="error"
      style="margin: 32px 0;"
    />

    <!-- Loading State: Only show if loading, no error, no panelIdError, and valid parameters -->
    <div v-else-if="isLoading && hasValidParameters" class="loading-wrapper">
      <div class="loading-content">
        <div class="loading-spinner"></div>
        <p>Loading trend log data...</p>
      </div>
    </div>

    <!-- Chart Content -->
    <div v-else-if="hasScheduleItemData" class="chart-wrapper">

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
        <button @click="loadTrendLogItemData" class="retry-button">Load Data</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, defineOptions, watch } from 'vue'
import { Alert as AAlert } from 'ant-design-vue'
import { useRoute } from 'vue-router'
import { useQuasar } from 'quasar'
import TrendLogChart from '@t3-vue/components/NewUI/TrendLogChart.vue'
import { scheduleItemData } from '@/lib/vue/T3000/Hvac/Data/Constant/RefConstant'
import { T3000_Data, logT3000DataFlowState } from '@/lib/vue/T3000/Hvac/Data/T3Data'
import Hvac from '@/lib/vue/T3000/Hvac/Hvac'
import { useTrendlogDataAPI } from '@/lib/vue/T3000/Hvac/Opt/FFI/TrendlogDataAPI'
import { useT3000FfiApi } from '@/lib/vue/T3000/Hvac/Opt/FFI/T3000FfiApi'
import LogUtil from '@/lib/vue/T3000/Hvac/Util/LogUtil'

// Define component name
defineOptions({
  name: 'TrendLogIndexPage'
})

// import { ref, computed, onMounted, defineOptions } from 'vue'
// import { useRoute } from 'vue-router'
// import { useQuasar } from 'quasar'

// Panel ID check for T3000 integration (computed)
const panelIdError = computed(() => {
  const pid = route.query.panel_id;
  return pid !== undefined && Number(pid) === 0;
});
const panelIdErrorMsg = 'Error: Panel ID is 0. Please launch this page from T3000 with a valid panel.';
defineExpose({ panelIdError, panelIdErrorMsg })

// Route and URL parameters
const route = useRoute()
const $q = useQuasar()

// API integration for historical data
const trendlogAPI = useTrendlogDataAPI()

// Page state
const pageTitle = ref('T3000 Trend Log Analysis')
const isLoading = ref(false)
const error = ref<string | null>(null)
const trendLogItemData = ref<any>(null)
const jsonValidationStatus = ref<'pending' | 'valid' | 'invalid' | 'error' | null>(null)


// URL Parameters with enhanced JSON handling
const urlParams = computed(() => ({
  sn: route.query.sn ? Number(route.query.sn) : null,
  panel_id: route.query.panel_id ? Number(route.query.panel_id) : null,
  trendlog_id: route.query.trendlog_id ? Number(route.query.trendlog_id) : null,
  all_data: route.query.all_data as string || null
}))

// Function to get and validate parameters
const getValidatedParameters = () => {
  const params = urlParams.value

  // Check if we have the minimum required parameters (allow trendlog_id=0)
  const hasRequiredParams = params.sn !== null && params.panel_id !== null && params.trendlog_id !== null

  return {
    sn: params.sn,
    panel_id: params.panel_id,
    trendlog_id: params.trendlog_id,
    all_data: params.all_data,
    isValid: hasRequiredParams
  }
}

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

const isJsonData = computed(() => {
  const { all_data } = urlParams.value
  if (!all_data) return false

  // Check if it looks like JSON (starts with { or URL-encoded {)
  return all_data.startsWith('{') || all_data.includes('%7B')
})

// Helper function to decode URL-encoded JSON with C++ error detection
const decodeUrlEncodedJson = (encodedString: string): any | null => {
  try {
    jsonValidationStatus.value = 'pending'

    // Decode URL encoding
    const decoded = decodeURIComponent(encodedString)

    // Check for C++ JSON conversion error
    if (decoded.includes('"error":"JSON conversion failed"') ||
        decoded === '{"error":"JSON conversion failed"}') {
      jsonValidationStatus.value = 'error'
      return null
    }

    // Parse JSON
    const parsed = JSON.parse(decoded)

    // Additional check for error object
    if (parsed.error && parsed.error.includes('JSON conversion failed')) {
      jsonValidationStatus.value = 'error'
      return null
    }

    // Validate structure
    const isValid = validateTrendLogJsonStructure(parsed)
    jsonValidationStatus.value = isValid ? 'valid' : 'invalid'

    return parsed
  } catch (error) {
    jsonValidationStatus.value = 'invalid'
    return null
  }
}

// Helper function to validate JSON structure
const validateTrendLogJsonStructure = (data: any): boolean => {
  if (!data || typeof data !== 'object') return false

  // If it's a direct t3Entry object (from C++)
  if (data.command && data.id && Array.isArray(data.input) && Array.isArray(data.range)) {
    return true
  }

  // If it's wrapped in a structure with t3Entry
  if (data.t3Entry &&
      typeof data.t3Entry === 'object' &&
      Array.isArray(data.t3Entry.input) &&
      Array.isArray(data.t3Entry.range)) {
    return true
  }

  return false
}

// Simple data formatter - convert query parameters to TrendLogChart format
const formatDataFromQueryParams = () => {
  const { sn, panel_id, trendlog_id, all_data } = urlParams.value

  // Print 1: Full original raw query parameters
  LogUtil.Debug('📊 IndexPageSocket - Original Query Parameters:', route.query)

  // Print 2: Complete readable object with decoded all_data
  const readableQuery = {
    sn: route.query.sn,
    panel_id: route.query.panel_id,
    trendlog_id: route.query.trendlog_id,
    all_data_decoded: all_data ? (() => {
      try {
        return decodeUrlEncodedJson(all_data)
      } catch (error) {
        return { error: 'Failed to decode', raw_preview: all_data.substring(0, 200) + '...' }
      }
    })() : null,
    // Include any other query parameters
    ...Object.fromEntries(
      Object.entries(route.query).filter(([key]) =>
        !['sn', 'panel_id', 'trendlog_id', 'all_data'].includes(key)
      )
    )
  }
  LogUtil.Debug('📊 IndexPageSocket - Readable Query Object:', readableQuery)  // Validate required parameters (allow trendlog_id=0)
  if (sn === null || panel_id === null || trendlog_id === null) {
    LogUtil.Debug('�?IndexPageSocket: Missing required parameters for trend log data')
    return null
  }

  let t3EntryData = null

  // Try to parse JSON data from C++ backend
  if (all_data) {
    const decodedData = decodeUrlEncodedJson(all_data)
    if (decodedData && jsonValidationStatus.value === 'valid') {
      t3EntryData = decodedData.t3Entry || decodedData
    }
  }

  // If no valid data, return null
  if (!t3EntryData) {
    return null
  }

  // Ensure required fields are set
  t3EntryData.pid = panel_id
  t3EntryData.label = t3EntryData.label || `${panel_id}_${trendlog_id}`
  t3EntryData.command = t3EntryData.command || `${panel_id}MON${trendlog_id}`
  t3EntryData.id = t3EntryData.id || `MON${trendlog_id}`

  // Format for TrendLogChart
  const chartData = {
    title: t3EntryData.label || 'T3000 Trend Log Analysis',
    t3Entry: t3EntryData
  }

  // Format for scheduleItemData
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
    title: chartData.title,
    translate: [583, 68],
    type: "Monitor",
    width: 60,
    zindex: 1
  }

  return { chartData, scheduleData }
}

// Load data based on query parameters with API integration
const loadTrendLogItemData = async () => {
  try {
    isLoading.value = true
    error.value = null

    const params = getValidatedParameters()


    // Only use all_data from query parameter; otherwise, show error
    if (params.all_data) {

      const formattedData = formatDataFromQueryParams()
      if (formattedData) {
        trendLogItemData.value = formattedData.chartData
        scheduleItemData.value = formattedData.scheduleData
        pageTitle.value = formattedData.chartData.title
        return
      } else {
        error.value = 'Error: The trend log data in the URL parameter (all_data) is missing or invalid. Please check the data source or try again.'
        trendLogItemData.value = null
        scheduleItemData.value = null

        return
      }
    } else {

      trendLogItemData.value = null
      scheduleItemData.value = null
      pageTitle.value = 'T3000 Trend Log Analysis'
      error.value = 'Missing required parameters: sn, panel_id, trendlog_id, or all_data.'
      return
    }

  } catch (err) {
    console.error('Error loading trend log data:', err)
    error.value = err instanceof Error ? err.message : 'Failed to load trend log data'
    trendLogItemData.value = null
    scheduleItemData.value = null

  } finally {
    isLoading.value = false
  }
}

// Watch for URL parameter changes and refresh scheduleItemData
watch(
  () => route.query,
  () => {
    loadTrendLogItemData()
  },
  { immediate: false }
)

// Watch scheduleItemData to ensure TrendLogChart receives updates
watch(
  () => scheduleItemData.value,
  (newValue, oldValue) => {
    // Reactive data change handling for TrendLogChart updates
    if (newValue !== oldValue) {
      // Force reactivity update if needed
    }
  },
  { immediate: true, deep: true }
)

// Initialize T3000_Data for the TrendLogChart component using FFI HTTP API
const ffiApi = useT3000FfiApi()

// Helper: load one panel's device data into T3000_Data.panelsData
const loadPanelData = async (targetPanelId: number): Promise<void> => {
  const response = await ffiApi.ffiGetPanelData(targetPanelId)
  if (response && response.data) {
    T3000_Data.value.panelsData = T3000_Data.value.panelsData.filter(
      (item: any) => item.pid !== targetPanelId
    )
    T3000_Data.value.panelsData = T3000_Data.value.panelsData.concat(response.data)
    T3000_Data.value.panelsData.sort((a: any, b: any) => a.pid - b.pid)
    LogUtil.Info('✅ [IndexPage] Panel data loaded', { panelId: targetPanelId, itemCount: response.data.length })
  } else {
    LogUtil.Warn('⚠️ [IndexPage] GET_PANEL_DATA returned no data', { panelId: targetPanelId })
  }
}

const initializeT3000Data = async () => {
  const { sn, panel_id, trendlog_id, all_data } = urlParams.value

  // Check if we have the required parameters
  if (!sn || panel_id === null || trendlog_id === null) {
    return
  }

  try {
    // Initialize T3000_Data structure
    if (!T3000_Data.value.panelsData) T3000_Data.value.panelsData = []
    if (!T3000_Data.value.panelsList) T3000_Data.value.panelsList = []
    if (!T3000_Data.value.panelsRanges) T3000_Data.value.panelsRanges = []

    // Add panel to panelsList if it doesn't exist
    const existingPanel = T3000_Data.value.panelsList.find(panel => panel.panel_number === panel_id)
    if (!existingPanel) {
      T3000_Data.value.panelsList.push({
        panel_number: panel_id,
        serial_number: sn,
        object_instance: 0,  // populated after Action 4 GET_PANELS_LIST
        panel_name: `Panel ${panel_id}`,
        online: true
      })
    }

    T3000_Data.value.loadingPanel = panel_id

    // Step 1: Action 4 - GET_PANELS_LIST (via FFI HTTP, replaces WebSocket GetPanelsList)
    LogUtil.Info('📡 [IndexPage] Action 4 GET_PANELS_LIST via FFI API', { panel_id, sn })
    const panelsListResponse = await ffiApi.ffiGetPanelsList()

    if (panelsListResponse) {
      LogUtil.Info('✅ [IndexPage] GET_PANELS_LIST response received via FFI', panelsListResponse)
      // Populate T3000_Data.panelsList from response so every panel's own serial_number
      // is available for per-panel FFI polling (action=15) in TrendLogChart.
      // Without this, getSerialForPanel() falls back to the URL panel's SN for foreign panels.
      const rawList = Array.isArray(panelsListResponse)
        ? panelsListResponse
        : (panelsListResponse.data ?? panelsListResponse.panels ?? [])
      if (Array.isArray(rawList) && rawList.length > 0) {
        rawList.forEach((p: any) => {
          if (!p || !p.panel_number) return
          const existing = T3000_Data.value.panelsList.find(
            (x: any) => x.panel_number === p.panel_number
          )
          if (existing) {
            // Update serial_number in case it changed
            existing.serial_number = p.serial_number ?? existing.serial_number
            existing.object_instance = p.object_instance ?? existing.object_instance
            existing.panel_name = p.panel_name ?? existing.panel_name
          } else {
            T3000_Data.value.panelsList.push({
              panel_number: p.panel_number,
              serial_number: p.serial_number,
              object_instance: p.object_instance ?? 0,
              panel_name: p.panel_name || `Panel ${p.panel_number}`,
              online: true
            })
          }
        })
        LogUtil.Info('✅ [IndexPage] panelsList populated from GET_PANELS_LIST', {
          count: T3000_Data.value.panelsList.length,
          panels: T3000_Data.value.panelsList.map((p: any) => ({ pn: p.panel_number, sn: p.serial_number }))
        })
      }
    } else {
      LogUtil.Warn('⚠️ [IndexPage] GET_PANELS_LIST returned no data', { panel_id })
    }

    // Step 2: Action 0 - GET_PANEL_DATA for the primary panel (pid in monitor config)
    LogUtil.Info('📡 [IndexPage] Action 0 GET_PANEL_DATA via FFI API', { panel_id })
    await loadPanelData(panel_id)

    // Step 3: Detect foreign panels referenced in monitor config inputs and load them too.
    // Example: pid=144 but inputs all point to panel:11 — we must also load panel 11's data
    // so TrendLogChart can resolve device descriptions (pid/id lookup in panelsData).
    const foreignPanelIds = new Set<number>()
    try {
      const monitorConfig = all_data ? JSON.parse(all_data) : null
      if (monitorConfig?.input && Array.isArray(monitorConfig.input)) {
        for (const inputItem of monitorConfig.input) {
          const inputPanel = Number(inputItem.panel)
          if (inputPanel && inputPanel !== panel_id) {
            foreignPanelIds.add(inputPanel)
          }
        }
      }
    } catch {
      // all_data parse error is non-fatal
    }

    if (foreignPanelIds.size > 0) {
      LogUtil.Info('📡 [IndexPage] Loading foreign panel(s) referenced in monitor inputs', {
        primaryPanel: panel_id,
        foreignPanels: Array.from(foreignPanelIds)
      })
      // Load all foreign panels in parallel
      await Promise.all(Array.from(foreignPanelIds).map(pid => loadPanelData(pid)))
    }

    T3000_Data.value.loadingPanel = null

  } catch (error) {
    T3000_Data.value.loadingPanel = null
    LogUtil.Error('❌ [IndexPage] FFI init error:', error)
  }
}

// REMOVED: Real-time data storage logic moved to TrendLogChart.vue component
// The TrendLogChart component handles real-time data storage automatically
// through its T3000_Data.panelsData watcher at line 998-1030

onMounted(() => {
  // Initialize Hvac system integration
  try {
    Hvac.IdxPage.initQuasar($q)
  } catch (error) {
    console.error('Failed to initialize Hvac integration:', error)
  }

  // Initialize T3000_Data with WebView2/WebSocket communication
  initializeT3000Data()

  // Load and format data from query parameters
  loadTrendLogItemData()
})
</script>

<style scoped>
.trend-log-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 0;
  background: #f5f5f5;
  overflow: hidden;
}

.chart-wrapper {
  flex: 1;
  padding: 8px;
  background: #f5f5f5;
  overflow: hidden;
  padding-top: 5px;
}

/* Ensure the chart component fills the available space */
.chart-wrapper :deep(.trendlog-chart-component) {
  height: 100%;
  background: #ffffff;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
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
  padding: 40px;
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  margin: 0 auto 16px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #659dc5;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-content p {
  margin: 0;
  color: #666;
  font-size: 14px;
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
  max-width: 500px;
}

.error-content h3 {
  margin: 0 0 16px 0;
  color: #ff4d4f;
  font-size: 18px;
}

.error-content p {
  margin: 0 0 24px 0;
  color: #666;
  font-size: 14px;
  line-height: 1.5;
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
  max-width: 500px;
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

.retry-button {
  background: #659dc5;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.retry-button:hover {
  background: #5a8db0;
}

.retry-button:active {
  transform: translateY(1px);
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
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  color: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.source-badge.realtime {
  background: linear-gradient(45deg, #4CAF50, #45a049);
}

.source-badge.historical {
  background: linear-gradient(45deg, #2196F3, #1976D2);
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

  .source-badge {
    font-size: 11px;
    padding: 3px 8px;
  }
}

@media (max-width: 480px) {
  .chart-wrapper {
    padding: 4px;
  }
}
</style>

