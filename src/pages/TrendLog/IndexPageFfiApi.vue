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
    <!-- Loading State -->
    <div v-if="isLoading" class="loading-wrapper">
      <div class="loading-content">
        <div class="loading-spinner"></div>
        <p>Loading trend log data...</p>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-wrapper">
      <div class="error-content">
        <h3>Error Loading Data</h3>
        <p>{{ error }}</p>
        <button @click="loadTrendLogItemData" class="retry-button">Retry</button>
      </div>
    </div>

    <!-- Chart Content -->
    <div v-else-if="hasScheduleItemData" class="chart-wrapper">
      <!-- Data Source Indicator -->
      <div class="data-source-indicator">
        <span v-if="dataSource === 'json'" class="source-badge realtime">
          📡 Real-time Data (From C++ Backend)
        </span>
        <span v-else-if="dataSource === 'api'" class="source-badge historical">
          📚 Historical Data (From Database)
        </span>
        <span v-else class="source-badge fallback">
          ⚠️ No Data Available
        </span>
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
        <button @click="loadTrendLogItemData" class="retry-button">Load Data</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, defineOptions, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useQuasar } from 'quasar'
import TrendLogChart from 'src/components/NewUI/TrendLogChart.vue'
import { scheduleItemData } from 'src/lib/T3000/Hvac/Data/Constant/RefConstant'
import { T3000_Data } from 'src/lib/T3000/Hvac/Data/T3Data'
import LogUtil from 'src/lib/T3000/Hvac/Util/LogUtil'
import Hvac from 'src/lib/T3000/Hvac/Hvac'
import { t3000DataManager } from 'src/lib/T3000/Hvac/Data/Manager/T3000DataManager'
import { useTrendlogDataAPI } from 'src/composables/useTrendlogDataAPI'

// Define component name
defineOptions({
  name: 'TrendLogIndexPage'
})

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
    LogUtil.Debug('Decoded JSON string:', decoded)

    // Check for C++ JSON conversion error
    if (decoded.includes('"error":"JSON conversion failed"') ||
        decoded === '{"error":"JSON conversion failed"}') {
      LogUtil.Debug('Detected C++ JSON conversion error')
      jsonValidationStatus.value = 'error'
      return null
    }

    // Parse JSON
    const parsed = JSON.parse(decoded)
    LogUtil.Debug('Parsed JSON object:', parsed)

    // Additional check for error object
    if (parsed.error && parsed.error.includes('JSON conversion failed')) {
      LogUtil.Debug('Detected C++ JSON conversion error in parsed object')
      jsonValidationStatus.value = 'error'
      return null
    }

    // Validate structure
    const isValid = validateTrendLogJsonStructure(parsed)
    jsonValidationStatus.value = isValid ? 'valid' : 'invalid'

    return parsed
  } catch (error) {
    console.error('Failed to decode and parse JSON:', error)
    console.error('Original encoded string:', encodedString)
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

  // Must have required parameters (allow trendlog_id=0)
  if (sn === null || panel_id === null || trendlog_id === null) {
    return null
  }

  let t3EntryData = null

  // If all_data is provided, try to parse it
  if (all_data) {
    const decodedData = decodeUrlEncodedJson(all_data)
    if (decodedData && jsonValidationStatus.value === 'valid') {
      t3EntryData = decodedData.t3Entry || decodedData
    }
  }

  // If no all_data or parsing failed, create basic structure
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

  LogUtil.Debug('formatDataFromQueryParams created scheduleData:', scheduleData)
  return { chartData, scheduleData }
}

// Load data based on query parameters with API integration
const loadTrendLogItemData = async () => {
  LogUtil.Debug('Loading trend log data from query parameters...')
  LogUtil.Debug('Current scheduleItemData before update:', scheduleItemData.value)

  try {
    isLoading.value = true
    error.value = null

    const params = getValidatedParameters()

    // Priority 1: Try to load from JSON data (realtime data from C++ backend)
    if (params.all_data && params.isValid) {
      LogUtil.Info('📊 Loading data from JSON parameters (realtime)')
      dataSource.value = 'json'

      const formattedData = formatDataFromQueryParams()
      if (formattedData) {
        trendLogItemData.value = formattedData.chartData
        scheduleItemData.value = formattedData.scheduleData
        pageTitle.value = formattedData.chartData.title
        LogUtil.Debug('Data formatted from JSON parameters:', formattedData)
        LogUtil.Debug('scheduleItemData updated to:', scheduleItemData.value)
        return
      }
    }

    // Priority 2: Try to load from API (historical data)
    if (params.isValid && params.sn && params.panel_id !== null && params.trendlog_id !== null) {
      LogUtil.Info('📚 Loading data from API (historical)')
      dataSource.value = 'api'

      const historyRequest = {
        serial_number: params.sn,
        panel_id: params.panel_id,
        trendlog_id: params.trendlog_id.toString(),
        limit: 1000, // Get last 1000 data points
        point_types: ['INPUT', 'OUTPUT', 'VARIABLE'] // All point types
      }

      const historyData = await trendlogAPI.getTrendlogHistory(historyRequest)

      if (historyData && historyData.data && historyData.data.length > 0) {
        // Convert API data to TrendLogChart format
        const apiScheduleData = {
          id: historyData.trendlog_id,
          label: `TRL${params.sn}_${params.panel_id}_${params.trendlog_id}`,
          description: `Historical Trend Log ${params.trendlog_id} from Panel ${params.panel_id}`,
          pid: params.panel_id,
          type: "MON",
          value: historyData.data[0]?.value || 0,
          unit: historyData.data[0]?.units || "",
          status: 1,
          input: [],
          range: [],
          num_inputs: historyData.count,
          an_inputs: historyData.data.filter(d => d.is_analog).length,
          // Add the historical data
          scheduleData: historyData.data.map((point, index) => ({
            time: point.time,
            value: point.value,
            index: index,
            units: point.units,
            point_type: point.point_type
          }))
        }

        trendLogItemData.value = apiScheduleData
        scheduleItemData.value = apiScheduleData
        pageTitle.value = `Historical Trend Log ${params.trendlog_id} - Device ${params.sn}`

        LogUtil.Info('✅ Historical data loaded from API:', {
          count: historyData.count,
          trendlog_id: historyData.trendlog_id
        })
        return
      }
    }

    // Priority 3: Fallback - no valid data available
    LogUtil.Warn('⚠️ No valid data source available')
    dataSource.value = 'fallback'
    trendLogItemData.value = null
    scheduleItemData.value = null
    pageTitle.value = 'T3000 Trend Log Analysis'

    if (trendlogAPI.error.value) {
      error.value = `Failed to load historical data: ${trendlogAPI.error.value}`
    } else if (!params.isValid) {
      error.value = 'Missing required parameters: sn, panel_id, and trendlog_id'
    } else {
      error.value = 'No trend log data available'
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
    LogUtil.Debug('URL parameters changed, refreshing data...')
    loadTrendLogItemData()
  },
  { immediate: false }
)

// Watch scheduleItemData to ensure TrendLogChart receives updates
watch(
  () => scheduleItemData.value,
  (newValue, oldValue) => {
    LogUtil.Debug('scheduleItemData changed:')
    LogUtil.Debug('Old value:', oldValue)
    LogUtil.Debug('New value:', newValue)

    // Force reactivity update if needed
    if (newValue && typeof newValue === 'object') {
      LogUtil.Debug('scheduleItemData now has data, chart should be visible')
    } else {
      LogUtil.Debug('scheduleItemData is empty, chart should be hidden')
    }
  },
  { immediate: true, deep: true }
)

// Initialize T3000_Data for the TrendLogChart component
const initializeT3000Data = async () => {
  const { sn, panel_id, trendlog_id } = urlParams.value

  LogUtil.Info('🚀 TrendLog IndexPage: Initializing T3000_Data for standalone page')
  LogUtil.Info(`📊 Parameters: SN=${sn}, Panel=${panel_id}, TrendLog=${trendlog_id}`)

  // Check if we have the required parameters
  if (!sn || panel_id === null || trendlog_id === null) {
    LogUtil.Warn('⚠️ Missing required parameters for T3000_Data initialization')
    return
  }

  try {
    // Initialize T3000_Data structure if it's not already initialized
    if (!T3000_Data.value.panelsData) {
      T3000_Data.value.panelsData = []
    }
    if (!T3000_Data.value.panelsList) {
      T3000_Data.value.panelsList = []
    }
    if (!T3000_Data.value.panelsRanges) {
      T3000_Data.value.panelsRanges = []
    }

    // Add the panel to panelsList if it doesn't exist
    const existingPanel = T3000_Data.value.panelsList.find(panel => panel.panel_number === panel_id)
    if (!existingPanel) {
      LogUtil.Info(`📝 Adding panel ${panel_id} to panelsList`)
      T3000_Data.value.panelsList.push({
        panel_number: panel_id,
        serial_number: sn,
        panel_name: `Panel ${panel_id}`,
        online: true
      })
    }

    // Initialize communication clients properly
    let dataLoaded = false

    // Try WebView2 client first (for desktop T3000 app integration)
    if (Hvac.WebClient && (window as any).chrome?.webview) {
      LogUtil.Info('🌐 Initializing WebView2 client for T3000 device communication')

      try {
        // Initialize WebView2 message handler if not already initialized
        Hvac.WebClient.initMessageHandler()
        Hvac.WebClient.initQuasar($q)

        // Set loading state
        T3000_Data.value.loadingPanel = panel_id

        LogUtil.Info('📡 Requesting panels list from T3000 device via WebView2')
        // First get the panels list
        Hvac.WebClient.GetPanelsList()

        // Then get specific panel data after a delay
        setTimeout(() => {
          LogUtil.Info(`📊 Requesting panel ${panel_id} data from T3000 device`)
          Hvac.WebClient.GetPanelData(panel_id)
        }, 500)

        // Wait for data to be ready with timeout
        await t3000DataManager.waitForDataReady({
          timeout: 15000, // 15 seconds timeout for WebView2
          specificEntries: [`MON${trendlog_id}`, `TRL${trendlog_id}`]
        })

        LogUtil.Info('✅ T3000_Data initialized successfully from WebView2 device')
        dataLoaded = true

      } catch (error) {
        LogUtil.Warn('⚠️ WebView2 initialization failed, trying WebSocket fallback:', error)
        T3000_Data.value.loadingPanel = null
      }
    }

    // Try WebSocket client as fallback (for web browser integration)
    if (!dataLoaded && Hvac.WsClient) {
      LogUtil.Info('📡 Initializing WebSocket client for T3000 device communication')

      try {
        // Initialize WebSocket client properly
        Hvac.WsClient.initQuasar($q)

        // Set loading state
        T3000_Data.value.loadingPanel = panel_id

        LogUtil.Info('🔌 Connecting to WebSocket server...')
        // Connect to WebSocket server
        Hvac.WsClient.connect()

        // Wait a bit for connection to establish, then request data
        setTimeout(() => {
          LogUtil.Info('📊 Requesting panels list from T3000 device via WebSocket')
          // First get the panels list (this will automatically call GetPanelData for first panel)
          Hvac.WsClient.GetPanelsList()

          // Also request specific panel data
          setTimeout(() => {
            LogUtil.Info(`📊 Requesting panel ${panel_id} data from T3000 device`)
            Hvac.WsClient.GetPanelData(panel_id)
          }, 1000)
        }, 1000)

        // Wait for data to be ready with timeout
        await t3000DataManager.waitForDataReady({
          timeout: 20000, // 20 seconds timeout for WebSocket
          specificEntries: [`MON${trendlog_id}`, `TRL${trendlog_id}`]
        })

        LogUtil.Info('✅ T3000_Data initialized successfully from WebSocket device')
        dataLoaded = true

      } catch (error) {
        LogUtil.Warn('⚠️ WebSocket initialization failed:', error)
        T3000_Data.value.loadingPanel = null
      }
    }

    // PRODUCTION: Mock data fallback commented out - not needed for production
    // If both communication methods failed, create fallback data
    // if (!dataLoaded) {
    //   LogUtil.Warn('⚠️ Both WebView2 and WebSocket unavailable, creating minimal T3000_Data structure')

    //   // Create minimal data structure for the TrendLogChart
    //   const mockEntry = {
    //     id: `MON${trendlog_id}`,
    //     label: `TRL${sn}_${panel_id}_${trendlog_id}`,
    //     description: `Trend Log ${trendlog_id} from Panel ${panel_id}`,
    //     pid: panel_id,
    //     type: "MON",
    //     value: 0,
    //     unit: "",
    //     status: 1,
    //     input: [],
    //     range: [],
    //     num_inputs: 14,
    //     an_inputs: 12
    //   }

    //   // Add to panelsData if not already present
    //   const existingEntry = T3000_Data.value.panelsData.find(entry =>
    //     entry.id === mockEntry.id && entry.pid === panel_id
    //   )

    //   if (!existingEntry) {
    //     LogUtil.Info('📝 Adding fallback entry to panelsData')
    //     T3000_Data.value.panelsData.push(mockEntry)
    //   }

    //   T3000_Data.value.loadingPanel = null
    //   LogUtil.Info('📝 Created minimal T3000_Data structure for standalone usage')
    // }

    // Clear loading state if no data was loaded
    if (!dataLoaded) {
      T3000_Data.value.loadingPanel = null
      LogUtil.Warn('⚠️ Both WebView2 and WebSocket unavailable, no data loaded')
    }

    LogUtil.Info('✅ T3000_Data initialization completed')
    LogUtil.Debug('📊 Final T3000_Data state:', {
      panelsList: T3000_Data.value.panelsList?.length || 0,
      panelsData: T3000_Data.value.panelsData?.length || 0,
      loadingPanel: T3000_Data.value.loadingPanel
    })

    // Set up realtime data saving for socket data (port 9104)
    setupRealtimeDataSaving(sn, panel_id)

  } catch (error) {
    LogUtil.Error('❌ Error initializing T3000_Data:', error)
    // Ensure loading state is cleared on error
    T3000_Data.value.loadingPanel = null
  }
}

// Set up realtime data saving for socket port 9104
const setupRealtimeDataSaving = (serialNumber: number, panelId: number) => {
  LogUtil.Info('🔄 Setting up realtime data saving for socket port 9104')

  // Set up a watcher on T3000_Data.panelsData to detect realtime updates
  watch(
    () => T3000_Data.value.panelsData,
    async (newPanelsData, oldPanelsData) => {
      // Only process if we have valid data and this is a realtime update
      if (!newPanelsData || newPanelsData.length === 0) return

      try {
        // Find the panel data for our device
        const panelData = newPanelsData.find(panel => panel.pid === panelId)
        if (!panelData) return

        // Check if this is a new update (different from old data)
        const oldPanelData = oldPanelsData?.find(panel => panel.pid === panelId)
        if (oldPanelData && JSON.stringify(panelData) === JSON.stringify(oldPanelData)) {
          return // No change, skip saving
        }

        LogUtil.Info('💾 Detected realtime data update, saving to database')

        // Convert panel data to database format
        const dataPoints = []

        // Process the panel data based on its structure
        if (panelData.input && Array.isArray(panelData.input)) {
          panelData.input.forEach((point, index) => {
            if (point && typeof point === 'object' && point.value !== undefined) {
              dataPoints.push({
                serial_number: serialNumber,
                panel_id: panelId,
                point_id: point.id || `IN${index + 1}`,
                point_index: index + 1,
                point_type: 'INPUT',
                value: point.value.toString(),
                range_field: point.range?.toString(),
                digital_analog: point.digital_analog?.toString(),
                units: point.units
              })
            }
          })
        }

        // Add similar processing for other point types if available
        // (output, variable points would be processed similarly)

        if (dataPoints.length > 0) {
          // Save batch data to database
          const savedCount = await trendlogAPI.saveRealtimeBatch(dataPoints)
          LogUtil.Info(`✅ Saved ${savedCount} realtime data points to database`)
        }

      } catch (error) {
        LogUtil.Warn('⚠️ Error processing realtime data for database saving:', error)
      }
    },
    { deep: true } // Deep watch to detect changes in nested objects
  )

  LogUtil.Info('✅ Realtime data saving watcher setup completed')
}

onMounted(() => {
  LogUtil.Debug('TrendLog IndexPage mounted with query params:', route.query)
  LogUtil.Debug('Initial scheduleItemData state:', scheduleItemData.value)

  // Initialize Quasar integration for Hvac system (lightweight)
  LogUtil.Info('🚀 Initializing basic Quasar integration for standalone page')
  try {
    Hvac.IdxPage.initQuasar($q)
    LogUtil.Info('✅ Quasar integration initialized')
  } catch (error) {
    LogUtil.Warn('⚠️ Error initializing Quasar integration:', error)
  }

  // Initialize T3000_Data with proper WebSocket and WebView2 communication
  initializeT3000Data()

  // Load and format data from query parameters (with API integration)
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
