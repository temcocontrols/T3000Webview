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
import { T3000_Data, logT3000DataFlowState } from 'src/lib/T3000/Hvac/Data/T3Data'
import Hvac from 'src/lib/T3000/Hvac/Hvac'
import { t3000DataManager } from 'src/lib/T3000/Hvac/Data/Manager/T3000DataManager'
import { useTrendlogDataAPI } from 'src/lib/T3000/Hvac/Opt/FFI/TrendlogDataAPI'

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

  // ===========================================
  // JSON Parsing Parameter Debugging
  // ===========================================
  console.log('= TLISocketPage: ===== JSON PROCESSING DATA FLOW START =====')
  console.log('= TLISocketPage: Raw URL Parameters:', {
    sn: sn,
    panel_id: panel_id,
    trendlog_id: trendlog_id,
    all_data_present: !!all_data,
    all_data_length: all_data ? all_data.length : 0,
    all_data_preview: all_data ? all_data.substring(0, 150) + '...' : null,
    timestamp: new Date().toISOString()
  });

  // Must have required parameters (allow trendlog_id=0)
  if (sn === null || panel_id === null || trendlog_id === null) {
    console.log('= TLISocketPage: VALIDATION FAILED - Missing required parameters');
    console.log('= TLISocketPage: Required params check:', { sn, panel_id, trendlog_id });
    return null
  }

  let t3EntryData = null

  // If all_data is provided, try to parse it
  if (all_data) {
    console.log('= TLISocketPage: PROCESSING JSON FROM C++ BACKEND')
    const decodedData = decodeUrlEncodedJson(all_data)
    console.log('= TLISocketPage: JSON DECODE RESULTS - Full analysis:', {
      decodeSuccessful: !!decodedData,
      jsonValidationStatus: jsonValidationStatus.value,
      hasT3Entry: !!(decodedData && decodedData.t3Entry),
      decodedKeys: decodedData ? Object.keys(decodedData) : [],
      t3EntryKeys: decodedData?.t3Entry ? Object.keys(decodedData.t3Entry) : [],
      fullDecodedData: decodedData, // Full data structure
      timestamp: new Date().toISOString()
    });

    if (decodedData && jsonValidationStatus.value === 'valid') {
      t3EntryData = decodedData.t3Entry || decodedData
      console.log('= TLISocketPage: JSON DECODE SUCCESS - Using t3Entry data:', {
        pid: t3EntryData.pid,
        id: t3EntryData.id,
        label: t3EntryData.label,
        inputCount: t3EntryData.input?.length,
        rangeCount: t3EntryData.range?.length,
        fullT3EntryData: t3EntryData, // Complete t3Entry structure
        inputDataSample: t3EntryData.input?.slice(0, 3) || [],
        rangeDataSample: t3EntryData.range?.slice(0, 3) || []
      });
    } else {
      console.log('= TLISocketPage: JSON DECODE FAILED - Invalid or corrupted data:', {
        decodedData,
        validationStatus: jsonValidationStatus.value,
        rawDataPreview: all_data?.substring(0, 200)
      })
    }
  }

  // If no all_data or parsing failed, create basic structure
  if (!t3EntryData) {
    console.log('= TLISocketPage: CREATING FALLBACK T3ENTRY STRUCTURE')
    console.log('= TLISocketPage: Fallback creation reason: no_valid_json_data')
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

  console.log('= TLISocketPage: JSON PROCESSING COMPLETE - Final chart data:', {
    title: chartData.title,
    t3Entry: {
      pid: chartData.t3Entry.pid,
      label: chartData.t3Entry.label,
      inputCount: chartData.t3Entry.input?.length,
      rangeCount: chartData.t3Entry.range?.length,
      fullT3Entry: chartData.t3Entry, // Complete structure for debugging
      input: chartData.t3Entry.input,
      range: chartData.t3Entry.range
    }
  });

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

    // ===========================================
    // Load Function Parameter Debugging
    // ===========================================
    console.log('= TLISocketPage: ===== DATA LOADING FLOW START =====')
    console.log('= TLISocketPage: Function parameters analysis:', {
      sn: params.sn,
      panel_id: params.panel_id,
      trendlog_id: params.trendlog_id,
      isValid: params.isValid,
      hasAllData: !!params.all_data,
      allDataSize: params.all_data?.length || 0,
      fullParams: params, // Complete parameter object
      timestamp: new Date().toISOString()
    })

    console.log('= TLISocketPage: Data loading strategy selection:', {
      priority1_json: !!params.all_data,
      priority2_api: params.isValid && params.sn && params.panel_id !== null && params.trendlog_id !== null,
      priority3_fallback: !params.all_data && !params.isValid,
      selectedStrategy: params.all_data ? 'JSON_FROM_CPP' : (params.isValid ? 'API_HISTORICAL' : 'FALLBACK')
    })

    // Priority 1: Try to load data from JSON parameters (realtime)
    if (params.all_data) {
      console.log('= TLISocketPage: EXECUTING PRIORITY 1 - JSON Data from C++ Backend')
      dataSource.value = 'json'
      const formattedData = formatDataFromQueryParams()
      if (formattedData) {
        trendLogItemData.value = formattedData.chartData
        scheduleItemData.value = formattedData.scheduleData
        pageTitle.value = formattedData.chartData.title
        console.log('= TLISocketPage: JSON LOADING SUCCESS - Data processed:', {
          title: formattedData.chartData.title,
          t3Entry_id: formattedData.scheduleData?.t3Entry?.id,
          dataSource: dataSource.value,
          fullChartData: formattedData.chartData, // Complete chart structure
          fullScheduleData: formattedData.scheduleData, // Complete schedule structure
          processingComplete: true
        })
        return
      }
    }

    // Priority 2: Try to load from API (historical data)
    if (params.isValid && params.sn && params.panel_id !== null && params.trendlog_id !== null) {
      console.log('= TLISocketPage: EXECUTING PRIORITY 2 - API Historical Data')
      dataSource.value = 'api'

      // Generate time range: start_time should be 1 hour ago, end_time should be current time
      const now = new Date()
      const oneHourAgo = new Date(now.getTime() - (60 * 60 * 1000))

      // Format times as "YYYY-MM-DD HH:MM:SS" to match LoggingTime_Fmt format
      const formatTimeForDB = (date: Date): string => {
        const year = date.getFullYear()
        const month = (date.getMonth() + 1).toString().padStart(2, '0')
        const day = date.getDate().toString().padStart(2, '0')
        const hours = date.getHours().toString().padStart(2, '0')
        const minutes = date.getMinutes().toString().padStart(2, '0')
        const seconds = date.getSeconds().toString().padStart(2, '0')
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
      }

      const historyRequest = {
        serial_number: params.sn,
        panel_id: params.panel_id,
        trendlog_id: params.trendlog_id.toString(),
        start_time: formatTimeForDB(oneHourAgo), // 1 hour ago
        end_time: formatTimeForDB(now), // Current time
        limit: 1000, // Get last 1000 data points
        point_types: ['INPUT', 'OUTPUT', 'VARIABLE'] // All point types
      }

      console.log('= TLISocketPage: API REQUEST DETAILS - Historical data query:', {
        historyRequest,
        requestType: 'getTrendlogHistory',
        timestamp: new Date().toISOString()
      })

      const historyData = await trendlogAPI.getTrendlogHistory(historyRequest)

      console.log('= TLISocketPage: API RESPONSE RECEIVED - Full response analysis:', {
        hasData: !!historyData,
        dataCount: historyData?.data?.length || 0,
        trendlogId: historyData?.trendlog_id,
        sampleData: historyData?.data?.slice(0, 3) || [],
        fullApiResponse: historyData, // Complete API response
        responseTimestamp: new Date().toISOString()
      })

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
        console.log('= TLISocketPage: API LOADING SUCCESS - Historical data processed:', {
          title: pageTitle.value,
          dataCount: historyData.data.length,
          dataSource: dataSource.value,
          fullApiScheduleData: apiScheduleData, // Complete processed data structure
          processingComplete: true
        })
        return
      } else {
        console.log('= TLISocketPage: API LOADING FAILED - Empty or invalid response:', {
          hasHistoryData: !!historyData,
          hasDataArray: !!(historyData?.data),
          dataLength: historyData?.data?.length || 0,
          fullResponse: historyData, // Complete response for debugging
          failureReason: 'empty_or_invalid_data'
        })
      }
    }

    // Priority 3: Fallback - no valid data available
    console.log('= TLISocketPage: EXECUTING PRIORITY 3 - Fallback (No Data Available)')
    dataSource.value = 'fallback'
    trendLogItemData.value = null
    scheduleItemData.value = null
    pageTitle.value = 'T3000 Trend Log Analysis'

    const errorDetails = {
      hasApiError: !!trendlogAPI.error.value,
      apiErrorMessage: trendlogAPI.error.value,
      isValidParams: params.isValid,
      missingParams: {
        sn: params.sn === null,
        panel_id: params.panel_id === null,
        trendlog_id: params.trendlog_id === null
      },
      fullErrorContext: {
        params,
        apiError: trendlogAPI.error.value,
        timestamp: new Date().toISOString()
      }
    }

    console.log('= TLISocketPage: FALLBACK ERROR ANALYSIS - Complete error context:', errorDetails)

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
  (newQuery, oldQuery) => {
    console.log('= TLISocketPage: ROUTE QUERY CHANGED - URL Parameter Debug')
    console.log('─'.repeat(60))

    const oldParams = {
      sn: oldQuery?.sn ? Number(oldQuery.sn) : null,
      panel_id: oldQuery?.panel_id ? Number(oldQuery.panel_id) : null,
      trendlog_id: oldQuery?.trendlog_id ? Number(oldQuery.trendlog_id) : null,
      all_data: oldQuery?.all_data as string || null
    }

    const newParams = urlParams.value

    console.log('= TLISocketPage: Previous route parameters:', {
      sn: oldParams.sn,
      panel_id: oldParams.panel_id,
      trendlog_id: oldParams.trendlog_id,
      all_data_length: oldParams.all_data?.length || 0,
      fullPreviousContext: oldParams
    })

    console.log('= TLISocketPage: New route parameters:', {
      sn: newParams.sn,
      panel_id: newParams.panel_id,
      trendlog_id: newParams.trendlog_id,
      all_data_length: newParams.all_data?.length || 0,
      all_data_preview: newParams.all_data?.substring(0, 150) + (newParams.all_data?.length > 150 ? '...' : ''),
      fullNewContext: newParams
    })

    console.log('= TLISocketPage: Route parameter changes analysis:', {
      sn_changed: oldParams.sn !== newParams.sn,
      panel_id_changed: oldParams.panel_id !== newParams.panel_id,
      trendlog_id_changed: oldParams.trendlog_id !== newParams.trendlog_id,
      all_data_changed: oldParams.all_data !== newParams.all_data,
      validation_status: getValidatedParameters().isValid,
      changeDetails: {
        oldParams,
        newParams,
        timestamp: new Date().toISOString()
      }
    })

    console.log('= TLISocketPage: Triggering loadTrendLogItemData due to route change')
    console.log('─'.repeat(60))

    loadTrendLogItemData()
  },
  { immediate: false }
)

// Watch scheduleItemData to ensure TrendLogChart receives updates
watch(
  () => scheduleItemData.value,
  (newValue, oldValue) => {
    console.log('= TLISocketPage: SCHEDULE ITEM DATA WATCHER - Data change triggered:', {
      newValue: newValue,
      oldValue: oldValue,
      hasNewT3Entry: !!(newValue && (newValue as any).t3Entry),
      newPid: (newValue as any)?.t3Entry?.pid,
      newInputCount: (newValue as any)?.t3Entry?.input?.length,
      newRangeCount: (newValue as any)?.t3Entry?.range?.length,
      dataSource: dataSource.value,
      timestamp: new Date().toISOString(),
      fullDataAnalysis: {
        newDataType: typeof newValue,
        oldDataType: typeof oldValue,
        hasChanges: newValue !== oldValue,
        completeNewValue: newValue,
        completeOldValue: oldValue
      }
    });
    // Force reactivity update if needed
  },
  { immediate: true, deep: true }
)

// Initialize T3000_Data for the TrendLogChart component
const initializeT3000Data = async () => {
  const { sn, panel_id, trendlog_id } = urlParams.value

  console.log('= TLISocketPage: INITIALIZE T3000DATA - Starting T3000_Data initialization:', {
    sn, panel_id, trendlog_id,
    currentT3000State: {
      panelsDataKeys: Object.keys(T3000_Data.value.panelsData || {}),
      panelsListLength: T3000_Data.value.panelsList?.length || 0,
      panelsRangesKeys: Object.keys(T3000_Data.value.panelsRanges || {}),
      loadingPanel: T3000_Data.value.loadingPanel
    },
    initializationContext: {
      timestamp: new Date().toISOString(),
      hasRequiredParams: !!sn && !!panel_id && !!trendlog_id,
      fullT3000State: T3000_Data.value
    },
    dataSourceAnalysis: {
      hasExistingData: T3000_Data.value.panelsData.length > 0 || T3000_Data.value.panelsList.length > 0,
      possibleSources: [
        'previous_page_navigation',
        'background_loading',
        'shared_global_state',
        'early_initialization'
      ],
      nextAction: 'will_request_fresh_data_from_t3000_backend'
    }
  });

  // Log complete data flow state
  logT3000DataFlowState('BEFORE_T3000_INITIALIZATION', {
    component: 'TrendLogIndexPageSocket',
    params: { sn, panel_id, trendlog_id }
  });

  // Check if we have the required parameters
  if (!sn || panel_id === null || trendlog_id === null) {
    console.log('= TLISocketPage: INITIALIZE T3000DATA FAILED - Missing required parameters:', {
      missingParamAnalysis: {
        sn: { provided: sn, valid: !!sn },
        panel_id: { provided: panel_id, valid: panel_id !== null },
        trendlog_id: { provided: trendlog_id, valid: trendlog_id !== null }
      },
      allParameters: { sn, panel_id, trendlog_id },
      timestamp: new Date().toISOString()
    });
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
      try {
        // Initialize WebView2 message handler if not already initialized
        Hvac.WebClient.initMessageHandler()
        Hvac.WebClient.initQuasar($q)

        // Set loading state
        T3000_Data.value.loadingPanel = panel_id

        // First get the panels list
        console.log('= TLISocketPage: CALLING GetPanelsList - From initializeT3000Data WebView2 path:', {
          callerFunction: 'initializeT3000Data',
          callerContext: 'WebView2_initialization_sequence',
          targetAction: 'GetPanelsList',
          requestedBy: 'TrendLogIndexPageSocket.vue',
          requestReason: 'Initialize_T3000_Data_for_TrendLog',
          timestamp: new Date().toISOString()
        });
        Hvac.WebClient.GetPanelsList()

        // Then get specific panel data after a delay
        setTimeout(() => {
          console.log('= TLISocketPage: CALLING GetPanelData - From initializeT3000Data WebView2 delayed execution:', {
            callerFunction: 'initializeT3000Data->setTimeout',
            callerContext: 'WebView2_delayed_panel_data_request',
            targetAction: 'GetPanelData',
            targetPanelId: panel_id,
            requestedBy: 'TrendLogIndexPageSocket.vue',
            requestReason: 'Get_specific_panel_data_after_panels_list',
            delayMs: 500,
            timestamp: new Date().toISOString()
          });
          Hvac.WebClient.GetPanelData(panel_id)
        }, 500)

        // Wait for data to be ready with timeout
        await t3000DataManager.waitForDataReady({
          timeout: 15000, // 15 seconds timeout for WebView2
          specificEntries: [`MON${trendlog_id}`, `TRL${trendlog_id}`]
        })

        dataLoaded = true

      } catch (error) {
        T3000_Data.value.loadingPanel = null
      }
    }

    // Try WebSocket client as fallback (for web browser integration)
    if (!dataLoaded && Hvac.WsClient) {
      try {
        // Initialize WebSocket client properly
        Hvac.WsClient.initQuasar($q)

        // Set loading state
        T3000_Data.value.loadingPanel = panel_id

        // Connect to WebSocket server
        Hvac.WsClient.connect()

        // Wait a bit for connection to establish, then request data
        setTimeout(() => {
          // First get the panels list (this will automatically call GetPanelData for first panel)
          console.log('= TLISocketPage: CALLING WebSocket GetPanelsList - From initializeT3000Data WebSocket path:', {
            callerFunction: 'initializeT3000Data->setTimeout',
            callerContext: 'WebSocket_initialization_sequence',
            targetAction: 'WsClient.GetPanelsList',
            requestedBy: 'TrendLogIndexPageSocket.vue',
            requestReason: 'Initialize_T3000_Data_via_WebSocket_fallback',
            delayMs: 1000,
            timestamp: new Date().toISOString()
          });
          Hvac.WsClient.GetPanelsList()

          // Also request specific panel data
          setTimeout(() => {
            console.log('= TLISocketPage: CALLING WebSocket GetPanelData - From initializeT3000Data WebSocket nested timeout:', {
              callerFunction: 'initializeT3000Data->setTimeout->setTimeout',
              callerContext: 'WebSocket_delayed_panel_data_request',
              targetAction: 'WsClient.GetPanelData',
              targetPanelId: panel_id,
              requestedBy: 'TrendLogIndexPageSocket.vue',
              requestReason: 'Get_specific_panel_data_via_WebSocket',
              totalDelayMs: 2000,
              timestamp: new Date().toISOString()
            });
            Hvac.WsClient.GetPanelData(panel_id)
          }, 1000)
        }, 1000)

        // Wait for data to be ready with timeout
        await t3000DataManager.waitForDataReady({
          timeout: 20000, // 20 seconds timeout for WebSocket
          specificEntries: [`MON${trendlog_id}`, `TRL${trendlog_id}`]
        })

        dataLoaded = true

      } catch (error) {
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
    }

    // Set up realtime data saving for socket data (port 9104)
    setupRealtimeDataSaving(sn, panel_id)

    // Log complete T3000_Data initialization completion
    logT3000DataFlowState('AFTER_T3000_INITIALIZATION_COMPLETE', {
      component: 'TrendLogIndexPageSocket',
      params: { sn, panel_id, trendlog_id },
      success: dataLoaded,
      finalState: {
        panelsDataCount: T3000_Data.value.panelsData?.length || 0,
        panelsListCount: T3000_Data.value.panelsList?.length || 0,
        panelsRangesCount: T3000_Data.value.panelsRanges?.length || 0,
        loadingPanel: T3000_Data.value.loadingPanel,
        communicationMethod: dataLoaded ?
          ((window as any).chrome?.webview ? 'WebView2' : 'WebSocket') :
          'failed'
      }
    });

    console.log('= TLISocketPage: INITIALIZE T3000DATA - Initialization complete:', {
      success: dataLoaded,
      finalT3000State: {
        panelsDataCount: T3000_Data.value.panelsData?.length || 0,
        panelsListCount: T3000_Data.value.panelsList?.length || 0,
        panelsRangesCount: T3000_Data.value.panelsRanges?.length || 0,
        loadingPanel: T3000_Data.value.loadingPanel
      },
      communicationMethod: dataLoaded ?
        ((window as any).chrome?.webview ? 'WebView2' : 'WebSocket') :
        'failed',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    // Ensure loading state is cleared on error
    T3000_Data.value.loadingPanel = null

    // Log error completion
    logT3000DataFlowState('T3000_INITIALIZATION_ERROR', {
      component: 'TrendLogIndexPageSocket',
      params: { sn, panel_id, trendlog_id },
      error: error?.message || 'Unknown error',
      finalState: {
        panelsDataCount: T3000_Data.value.panelsData?.length || 0,
        panelsListCount: T3000_Data.value.panelsList?.length || 0,
        loadingPanel: T3000_Data.value.loadingPanel
      }
    });

    console.error('= TLISocketPage: INITIALIZE T3000DATA - Error during initialization:', {
      error: error?.message || 'Unknown error',
      stack: error?.stack,
      finalState: T3000_Data.value,
      timestamp: new Date().toISOString()
    });
  }
}

// Set up realtime data saving for socket port 9104
const setupRealtimeDataSaving = (serialNumber: number, panelId: number) => {
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
        }

      } catch (error) {
        // Error processing realtime data for database saving
      }
    },
    { deep: true } // Deep watch to detect changes in nested objects
  )
}

onMounted(() => {
  // ===========================================
  // URL Parameter Debugging Information
  // ===========================================
  console.log('= TLISocketPage: URL PARAMETER DEBUG - Component mounted analysis')
  console.log('='.repeat(80))

  const rawQuery = route.query
  const params = urlParams.value
  const validation = getValidatedParameters()

  console.log('= TLISocketPage: Raw route query parameters:', {
    rawQuery,
    fullRouteContext: route
  })
  console.log('= TLISocketPage: Parsed URL parameters analysis:', {
    sn: params.sn,
    panel_id: params.panel_id,
    trendlog_id: params.trendlog_id,
    all_data_present: !!params.all_data,
    all_data_length: params.all_data?.length || 0,
    all_data_preview: params.all_data?.substring(0, 200) + (params.all_data?.length > 200 ? '...' : ''),
    completeParams: params
  })

  console.log('= TLISocketPage: Parameter validation results:', {
    hasRequiredParams: validation.isValid,
    sn_valid: params.sn !== null && !isNaN(params.sn),
    panel_id_valid: params.panel_id !== null && !isNaN(params.panel_id),
    trendlog_id_valid: params.trendlog_id !== null && !isNaN(params.trendlog_id),
    all_data_format: params.all_data ? (params.all_data.startsWith('{') ? 'JSON' : params.all_data.includes('%7B') ? 'URL-encoded JSON' : 'Unknown') : 'None',
    validationObject: validation
  })

  console.log('= TLISocketPage: Browser URL context:', {
    href: window.location.href,
    origin: window.location.origin,
    pathname: window.location.pathname,
    search: window.location.search,
    hash: window.location.hash,
    fullLocationObject: window.location
  })

  if (params.all_data) {
    try {
      const decoded = decodeUrlEncodedJson(params.all_data)
      console.log('= TLISocketPage: JSON data analysis from URL parameters:', {
        canParse: !!decoded,
        hasT3Entry: !!(decoded && decoded.t3Entry),
        t3Entry_id: decoded?.t3Entry?.id,
        t3Entry_pid: decoded?.t3Entry?.pid,
        t3Entry_label: decoded?.t3Entry?.label,
        inputCount: decoded?.t3Entry?.input?.length || 0,
        rangeCount: decoded?.t3Entry?.range?.length || 0,
        fullDecodedData: decoded
      })
    } catch (e) {
      console.log('= TLISocketPage: JSON parse error in URL data:', {
        errorMessage: e.message,
        errorStack: e.stack,
        rawAllData: params.all_data?.substring(0, 300),
        timestamp: new Date().toISOString()
      })
    }
  }

  console.log('='.repeat(80))
  console.log('= TLISocketPage: COMPONENT INITIALIZATION START - Beginning IndexPageSocket setup')

  // Initialize Quasar integration for Hvac system (lightweight)
  try {
    Hvac.IdxPage.initQuasar($q)
  } catch (error) {
    // Error initializing Quasar integration
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

