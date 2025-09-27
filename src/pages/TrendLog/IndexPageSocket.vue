
<!--
  TrendLog IndexPage - Standalone page for displaying T3000 trend logs

  URL Parameters:
  - sn: Serial number of the T3000 device (required for real data)
  - panel_id: Panel ID within the device (required for real data)
  - trendlog_id: Specific trend log ID to display (required for real data)
  - all_data: Monitor point data in URL-encoded JSON format (from C++ backend)

  Example URLs:
  - Demo mode: http://localhost:3003/#/trend-log
  - Real data: http://localhost:3003/#/trend-log?sn=123&panel_id=3&trendlog_id=1
  - With JSON data: http://localhost:3003/#/trend-log?sn=123&panel_id=3&trendlog_id=1&all_data=<URL-encoded-JSON>

  Data Flow:
  1. C++ CBacnetMonitor::OnBnClickedBtnMonitorGraphic() generates JSON from Str_monitor_point
  2. JSON is URL-encoded and passed as alldata parameter
  3. IndexPage decodes and parses JSON to display trend log data
  4. Falls back to API endpoints if JSON parsing fails
  5. Shows error state if no valid data source is available (no mock data in production)

  API Endpoints Attempted (if JSON parsing fails):
  1. Primary: /api/data/device/{panelid}/trend_logs/{trendlogid}
  2. Fallback: /api/modbus-registers/{trendlogid}
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
import TrendLogChart from 'src/components/NewUI/TrendLogChart.vue'
import { scheduleItemData } from 'src/lib/T3000/Hvac/Data/Constant/RefConstant'
import { T3000_Data, logT3000DataFlowState } from 'src/lib/T3000/Hvac/Data/T3Data'
import Hvac from 'src/lib/T3000/Hvac/Hvac'
import { t3000DataManager } from 'src/lib/T3000/Hvac/Data/Manager/T3000DataManager'
import { useTrendlogDataAPI } from 'src/lib/T3000/Hvac/Opt/FFI/TrendlogDataAPI'
import LogUtil from 'src/lib/T3000/Hvac/Util/LogUtil'

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
const dataSource = ref<'json' | 'api' | 'fallback'>('json') // Track data source

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
    LogUtil.Debug('❌ IndexPageSocket: Missing required parameters for trend log data')
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

  // If no valid data, return null (do not create fallback)
  if (!t3EntryData) {
    return null
  }

  // Ensure required fields are set
  t3EntryData.pid = panel_id
  t3EntryData.label = t3EntryData.label || `TRL${sn}_${panel_id}_${trendlog_id}`
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
      dataSource.value = 'json'
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
        dataSource.value = 'fallback'
        return
      }
    } else {
      dataSource.value = 'fallback'
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
    dataSource.value = 'fallback'
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

// Initialize T3000_Data for the TrendLogChart component
const initializeT3000Data = async () => {
  const { sn, panel_id, trendlog_id } = urlParams.value

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
        panel_name: `Panel ${panel_id}`,
        online: true
      })
    }

    let dataLoaded = false

    // Try WebView2 client first (desktop T3000 app)
    if (Hvac.WebClient && (window as any).chrome?.webview) {
      try {
        Hvac.WebClient.initMessageHandler()
        Hvac.WebClient.initQuasar($q)
        T3000_Data.value.loadingPanel = panel_id

        Hvac.WebClient.GetPanelsList()
        setTimeout(() => Hvac.WebClient.GetPanelData(panel_id), 500)

        await t3000DataManager.waitForDataReady({
          timeout: 15000,
          specificEntries: [`MON${trendlog_id}`, `TRL${trendlog_id}`]
        })

        dataLoaded = true
      } catch (error) {
        T3000_Data.value.loadingPanel = null
      }
    }

    // Try WebSocket client fallback (web browser)
    if (!dataLoaded && Hvac.WsClient) {
      try {
        Hvac.WsClient.initQuasar($q)
        T3000_Data.value.loadingPanel = panel_id
        Hvac.WsClient.connect()

        setTimeout(() => {
          Hvac.WsClient.GetPanelsList()
          setTimeout(() => Hvac.WsClient.GetPanelData(panel_id), 1000)
        }, 1000)

        await t3000DataManager.waitForDataReady({
          timeout: 20000,
          specificEntries: [`MON${trendlog_id}`, `TRL${trendlog_id}`]
        })

        dataLoaded = true
      } catch (error) {
        T3000_Data.value.loadingPanel = null
      }
    }

    // Clear loading state if no data loaded
    if (!dataLoaded) {
      T3000_Data.value.loadingPanel = null
    }

    // Real-time data storage is handled automatically by TrendLogChart component

  } catch (error) {
    T3000_Data.value.loadingPanel = null
    console.error('T3000 initialization error:', error)
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

.source-badge.fallback {
  background: linear-gradient(45deg, #FF9800, #F57C00);
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

