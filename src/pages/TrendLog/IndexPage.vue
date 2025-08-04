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
  5. Falls back to demo data if API endpoints are unavailable

  API Endpoints Attempted (if JSON parsing fails):
  1. Primary: /api/data/device/{panelid}/trend_logs/{trendlogid}
  2. Fallback: /api/modbus-registers/{trendlogid}
-->
<template>
  <div class="trend-log-page">
    <div class="page-header">
      <h1 class="page-title">{{ pageTitle }}</h1>

      <!-- Parameter Details Section -->
      <div class="parameter-details" v-if="hasValidParameters">
        <div class="parameter-grid">
          <div class="parameter-item">
            <span class="parameter-label">Serial Number:</span>
            <span class="parameter-value">{{ urlParams.sn }}</span>
          </div>
          <div class="parameter-item">
            <span class="parameter-label">Panel ID:</span>
            <span class="parameter-value">{{ urlParams.panel_id }}</span>
          </div>
          <div class="parameter-item">
            <span class="parameter-label">Trend Log ID:</span>
            <span class="parameter-value">{{ urlParams.trendlog_id }}</span>
          </div>
          <div class="parameter-item" v-if="urlParams.all_data">
            <span class="parameter-label">Data Source:</span>
            <span class="parameter-value data-source">
              <span v-if="isJsonData" class="status-success">C++ JSON Data</span>
              <span v-else class="status-warning">Legacy/API Data</span>
            </span>
          </div>
        </div>
        <div class="data-status" v-if="urlParams.all_data">
          <span class="status-label">JSON Status:</span>
          <span v-if="jsonValidationStatus === 'valid'" class="status-success">✓ Valid Structure</span>
          <span v-else-if="jsonValidationStatus === 'error'" class="status-error">✗ Conversion Error</span>
          <span v-else-if="jsonValidationStatus === 'invalid'" class="status-warning">⚠ Invalid Structure</span>
          <span v-else class="status-pending">⧗ Validating...</span>
        </div>
      </div>

      <p class="page-description">
        <span v-if="hasValidParameters">
          Real-time and historical data visualization for T3000 system
        </span>
        <span v-else>
          Real-time and historical data visualization for T3000 systems (Demo Mode)
        </span>
      </p>

      <!-- URL Parameters Display (for debugging) -->
      <div v-if="urlParams.sn || Object.keys(route.query).length > 0" class="url-params-debug" style="font-size: 12px; color: #666; margin-top: 8px;">
        <strong>Parameters:</strong>
        <span v-if="urlParams.sn">
          sn={{ urlParams.sn }},
          panel_id={{ urlParams.panel_id }},
          trendlog_id={{ urlParams.trendlog_id }}
          <span v-if="urlParams.all_data">
            <br>
            all_data: {{ urlParams.all_data.length > 100 ? urlParams.all_data.substring(0, 100) + '...' : urlParams.all_data }}
            <span v-if="urlParams.all_data.startsWith('{')"> (JSON Format)</span>
            <span v-else-if="urlParams.all_data.match(/^[0-9A-Fa-f]+$/)"> (Legacy Hex Format)</span>
            <span v-else> (URL-Encoded JSON)</span>
          </span>
        </span>
        <span v-else>
          Demo Mode - Try these test URLs:
          <br>
          <a href="#/trend-log?sn=123&panel_id=3&trendlog_id=1" style="color: #659dc5; text-decoration: none;">
            ?sn=123&panel_id=3&trendlog_id=1
          </a>
          <br>
          <a href="#/trend-log?sn=456&panel_id=5&trendlog_id=2&all_data=%7B%22test%22%3A%22json%22%7D" style="color: #659dc5; text-decoration: none;">
            ?sn=456&panel_id=5&trendlog_id=2&all_data=(JSON)
          </a>
        </span>

        <!-- Debug buttons -->
        <div style="margin-top: 8px;">
          <button @click="loadTrendLogItemData" class="debug-button" style="margin-right: 8px;">
            Reload Data
          </button>
          <button @click="testDemoData" class="debug-button" style="margin-right: 8px;">
            Test Demo
          </button>
          <button @click="testRealData" class="debug-button" v-if="urlParams.sn">
            Test API
          </button>
          <button @click="testJsonParsing" class="debug-button" style="margin-left: 8px;" v-if="urlParams.all_data">
            Test JSON
          </button>
        </div>
      </div>
    </div>

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
    <div v-else class="chart-wrapper">
      <TrendLogChart
        :itemData="currentItemData"
        :title="pageTitle"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, defineOptions, watch } from 'vue'
import { useRoute } from 'vue-router'
import TrendLogChart from 'src/components/NewUI/TrendLogChart.vue'
import { scheduleItemData } from 'src/lib/T3000/Hvac/Data/Constant/RefConstant'
import LogUtil from 'src/lib/T3000/Hvac/Util/LogUtil'

// Define component name
defineOptions({
  name: 'TrendLogIndexPage'
})

// Route and URL parameters
const route = useRoute()

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

  // Check if we have the minimum required parameters
  const hasRequiredParams = params.sn && params.panel_id && params.trendlog_id

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
  return !!(params.sn && params.panel_id && params.trendlog_id)
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

// Helper function to create demo input/range arrays for consistent structure
const createDemoInputRangeArrays = (panel_id?: number) => {
  const input = [
    // 14 input items with all fields set to 0 as per specification
    { network: 0, panel: 0, point_number: 0, point_type: 0, sub_panel: 0 },
    { network: 0, panel: 0, point_number: 0, point_type: 0, sub_panel: 0 },
    { network: 0, panel: 0, point_number: 0, point_type: 0, sub_panel: 0 },
    { network: 0, panel: 0, point_number: 0, point_type: 0, sub_panel: 0 },
    { network: 0, panel: 0, point_number: 0, point_type: 0, sub_panel: 0 },
    { network: 0, panel: 0, point_number: 0, point_type: 0, sub_panel: 0 },
    { network: 0, panel: 0, point_number: 0, point_type: 0, sub_panel: 0 },
    { network: 0, panel: 0, point_number: 0, point_type: 0, sub_panel: 0 },
    { network: 0, panel: 0, point_number: 0, point_type: 0, sub_panel: 0 },
    { network: 0, panel: 0, point_number: 0, point_type: 0, sub_panel: 0 },
    { network: 0, panel: 0, point_number: 0, point_type: 0, sub_panel: 0 },
    { network: 0, panel: 0, point_number: 0, point_type: 0, sub_panel: 0 },
    { network: 0, panel: 0, point_number: 0, point_type: 0, sub_panel: 0 },
    { network: 0, panel: 0, point_number: 0, point_type: 0, sub_panel: 0 }
  ]

  // Range configuration with all values set to 0 as per specification
  const range = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]

  return { input, range }
}

// Helper function to format scheduleItemData based on query parameters and current data
const formatScheduleItemData = () => {
  const { sn, panel_id, trendlog_id } = urlParams.value

  // Get the actual data (either from trendLogItemData or create demo data)
  let t3EntryData
  if (trendLogItemData.value) {
    // Use real data if available
    t3EntryData = trendLogItemData.value.t3Entry || trendLogItemData.value
  } else {
    // Create demo data based on query parameters
    const { input, range } = createDemoInputRangeArrays(panel_id)
    t3EntryData = {
      an_inputs: 0,
      command: `${panel_id || 3}MON${trendlog_id || 1}`,
      hour_interval_time: 0,
      id: `MON${trendlog_id || 1}`,
      index: 0,
      input,
      label: `TRL${sn || 11111}_${panel_id || 3}_${trendlog_id || 1}`,
      minute_interval_time: 0,
      num_inputs: 0,
      pid: panel_id || 3,
      range,
      second_interval_time: 15,
      status: 1,
      type: "MON"
    }
  }

  // Format as scheduleItemData structure
  return {
    active: false,
    cat: "TrendLog",
    height: 60,
    id: trendlog_id || 1,
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
    title: trendLogItemData.value?.title || `Trend Log ${trendlog_id || 1}`,
    translate: [583, 68],
    type: "Monitor",
    width: 60,
    zindex: 1
  }
}

// Demo data function - creates proper t3Entry structure for TrendLogChart
const getDemoData = () => {
  const { input, range } = createDemoInputRangeArrays()

  return {
    title: "Demo Trend Log",
    t3Entry: {
      an_inputs: 0,
      command: "3MON1",
      hour_interval_time: 0,
      id: "MON1",
      index: 0,
      input,
      label: "TRL11111",
      minute_interval_time: 0,
      num_inputs: 0,
      pid: 3,
      range,
      second_interval_time: 15,
      status: 1,
      type: "MON"
    }
  }
}

// Fetch real data function - no API calls, uses TrendLogChart approach
const fetchRealData = async (sn: number, panel_id: number, trendlog_id: number, all_data?: string) => {
  LogUtil.Debug('fetchRealData called with:', { sn, panel_id, trendlog_id, all_data: all_data ? 'present' : 'none' })

  try {
    isLoading.value = true
    error.value = null

    // Get validated parameters
    const validatedParams = getValidatedParameters()
    if (!validatedParams.isValid) {
      throw new Error('Invalid parameters: sn, panel_id, and trendlog_id are required')
    }

    // If all_data is provided, try to parse it as JSON first (from C++ backend)
    if (all_data) {
      LogUtil.Debug('Processing all_data parameter:', all_data.substring(0, 100) + '...')

      // Try to decode and parse JSON from C++ backend
      const decodedJsonData = decodeUrlEncodedJson(all_data)

      // Check if C++ returned an error or if parsing failed
      if (jsonValidationStatus.value === 'error') {
        LogUtil.Debug('C++ JSON conversion failed, falling back to demo data')
        // Don't return early, fall through to demo data
      } else if (decodedJsonData && jsonValidationStatus.value === 'valid') {
        LogUtil.Debug('Successfully parsed JSON data from C++ backend:', decodedJsonData)

        // Format data properly for TrendLogChart component
        let processedData
        if (decodedJsonData.command && decodedJsonData.id) {
          // Direct t3Entry object from C++
          processedData = {
            title: `Trend Log ${trendlog_id} - Panel ${panel_id} (SN: ${sn})`,
            t3Entry: decodedJsonData
          }
        } else if (decodedJsonData.t3Entry) {
          // Wrapped structure with t3Entry
          processedData = {
            title: decodedJsonData.title || `Trend Log ${trendlog_id} - Panel ${panel_id} (SN: ${sn})`,
            t3Entry: decodedJsonData.t3Entry
          }
        } else {
          // Assume the whole object is the data structure
          processedData = decodedJsonData
        }

        // Ensure t3Entry has required parameters for TrendLogChart
        if (processedData.t3Entry) {
          processedData.t3Entry.pid = panel_id
          processedData.t3Entry.label = processedData.t3Entry.label || `TRL_${sn}_${panel_id}_${trendlog_id}`
          processedData.t3Entry.command = processedData.t3Entry.command || `${panel_id}MON${trendlog_id}`
          processedData.t3Entry.id = processedData.t3Entry.id || `MON${trendlog_id}`

          // Ensure input array exists and is properly formatted
          if (!Array.isArray(processedData.t3Entry.input)) {
            processedData.t3Entry.input = []
          }

          // Ensure range array exists and matches input array length
          if (!Array.isArray(processedData.t3Entry.range)) {
            processedData.t3Entry.range = new Array(processedData.t3Entry.input.length).fill(0)
          }
        }

        LogUtil.Debug('Formatted data for TrendLogChart:', processedData)
        return processedData
      } else {
        LogUtil.Debug('Failed to parse all_data as valid JSON, falling back to demo data')
      }
    }

    // No API calls - fall back directly to demo data like TrendLogChart does
    LogUtil.Debug('Using demo data approach like TrendLogChart')
    return getDemoDataWithParams(sn, panel_id, trendlog_id, all_data)

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
    error.value = errorMessage
    console.error('Error processing trend log data:', err)

    // Return demo data with actual parameters
    return getDemoDataWithParams(sn, panel_id, trendlog_id, all_data)
  } finally {
    isLoading.value = false
  }
}

// Enhanced demo data with real parameters - formats data for TrendLogChart compatibility
const getDemoDataWithParams = (sn?: number, panel_id?: number, trendlog_id?: number, all_data?: string) => {
  // First, try to parse all_data as JSON if it's provided
  if (all_data) {
    const decodedJsonData = decodeUrlEncodedJson(all_data)
    if (decodedJsonData && validateTrendLogJsonStructure(decodedJsonData)) {
      LogUtil.Debug('Using JSON data from all_data parameter as demo data')

      // Format the JSON data properly for TrendLogChart
      let formattedData
      if (decodedJsonData.command && decodedJsonData.id) {
        // Direct t3Entry object from C++
        formattedData = {
          title: `Trend Log ${trendlog_id} (SN: ${sn}) - From C++`,
          t3Entry: decodedJsonData
        }
      } else if (decodedJsonData.t3Entry) {
        // Wrapped structure
        formattedData = {
          title: decodedJsonData.title || `Trend Log ${trendlog_id} (SN: ${sn}) - From C++`,
          t3Entry: decodedJsonData.t3Entry
        }
      } else {
        formattedData = decodedJsonData
      }

      // Update t3Entry with current parameters
      if (sn && panel_id && trendlog_id && formattedData.t3Entry) {
        formattedData.t3Entry.pid = panel_id
        formattedData.t3Entry.label = formattedData.t3Entry.label || `TRL_${sn}_${panel_id}_${trendlog_id}`
        formattedData.t3Entry.command = formattedData.t3Entry.command || `${panel_id}MON${trendlog_id}`
        formattedData.t3Entry.id = formattedData.t3Entry.id || `MON${trendlog_id}`

        // Update input points to use the actual panel ID if needed
        if (Array.isArray(formattedData.t3Entry.input)) {
          formattedData.t3Entry.input = formattedData.t3Entry.input.map((input: any) => ({
            ...input,
            panel: input.panel || panel_id // Use existing panel or fallback to URL panel_id
          }))
        }
      }

      return formattedData
    }
  }

  // Fallback to structured demo data - optimized for TrendLogChart
  const demoData = getDemoData()

  // Update demo data with actual parameters if provided
  if (sn && panel_id && trendlog_id) {
    demoData.title = `Demo Trend Log ${trendlog_id} (SN: ${sn})`
    demoData.t3Entry.label = `TRL${sn}_${panel_id}_${trendlog_id}`
    demoData.t3Entry.pid = panel_id
    demoData.t3Entry.id = `MON${trendlog_id}`
    demoData.t3Entry.command = `${panel_id}MON${trendlog_id}`

    // Create mixed panel data - some from requested panel, some from other panels
    demoData.t3Entry.input = demoData.t3Entry.input.map((input, index) => ({
      ...input,
      // For demo: mix panels 2 and the requested panel_id to show left/right panel data
      panel: index < 7 ? 2 : panel_id // First 7 items from panel 2, rest from requested panel
    }))
  }

  return demoData
}

// Load data based on URL parameters or use demo data - no API calls like TrendLogChart
const loadTrendLogItemData = async () => {
  LogUtil.Debug('Loading trend log item data...')

  // Get validated parameters
  const validatedParams = getValidatedParameters()
  LogUtil.Debug('Validated parameters:', validatedParams)

  // Reset validation status
  jsonValidationStatus.value = null

  // Update page title based on parameters
  if (validatedParams.isValid) {
    const { sn, panel_id, trendlog_id, all_data } = validatedParams
    pageTitle.value = `Trend Log ${trendlog_id} - Panel ${panel_id} (SN: ${sn})`

    // Detect data source
    if (all_data) {
      const isJson = all_data.startsWith('{') || all_data.includes('%7B') // URL-encoded '{'
      LogUtil.Debug(`Data source: ${isJson ? 'JSON from C++' : 'Legacy/API'}`)
    }

    try {
      // Process data using the same approach as TrendLogChart (no API calls)
      trendLogItemData.value = await fetchRealData(sn!, panel_id!, trendlog_id!, all_data || undefined)
    } catch (err) {
      console.error('Error processing trend log data:', err)
      error.value = err instanceof Error ? err.message : 'Failed to process trend log data'
      // Fall back to demo data with parameters
      trendLogItemData.value = getDemoDataWithParams(sn!, panel_id!, trendlog_id!, all_data || undefined)
    }
  } else {
    pageTitle.value = 'T3000 Trend Log Analysis (Demo)'
    trendLogItemData.value = getDemoData()
  }

  LogUtil.Debug('Final trend log data loaded:', trendLogItemData.value)

  // Trigger currentItemData computation to update scheduleItemData
  // This ensures scheduleItemData is updated with the latest data
  const updatedItemData = currentItemData.value
  LogUtil.Debug('scheduleItemData updated after data load:', scheduleItemData.value)
}

// Test functions for debugging
const testDemoData = () => {
  LogUtil.Debug('Testing demo data...')
  trendLogItemData.value = getDemoData()
  pageTitle.value = 'T3000 Trend Log Analysis (Demo Test)'
  // Trigger scheduleItemData update
  const updatedItemData = currentItemData.value
  LogUtil.Debug('scheduleItemData updated after demo test:', scheduleItemData.value)
}

const testRealData = async () => {
  const { sn, panel_id, trendlog_id, all_data } = urlParams.value
  if (sn && panel_id && trendlog_id) {
    LogUtil.Debug('Testing data processing (no API calls)...')
    trendLogItemData.value = await fetchRealData(sn, panel_id, trendlog_id, all_data || undefined)
    // Trigger scheduleItemData update
    const updatedItemData = currentItemData.value
    LogUtil.Debug('scheduleItemData updated after real data test:', scheduleItemData.value)
  }
}

const testJsonParsing = () => {
  const { all_data } = urlParams.value
  if (all_data) {
    LogUtil.Debug('Testing JSON parsing...')
    LogUtil.Debug('Raw all_data:', all_data)

    const decoded = decodeUrlEncodedJson(all_data)
    if (decoded) {
      LogUtil.Debug('Successfully decoded JSON:', decoded)
      const isValid = validateTrendLogJsonStructure(decoded)
      LogUtil.Debug('JSON structure validation:', isValid ? 'PASSED' : 'FAILED')

      if (isValid) {
        LogUtil.Debug('Using decoded JSON as trend log data')
        trendLogItemData.value = decoded
        pageTitle.value = 'T3000 Trend Log Analysis (JSON Test)'
        // Trigger scheduleItemData update
        const updatedItemData = currentItemData.value
        LogUtil.Debug('scheduleItemData updated after JSON test:', scheduleItemData.value)
      }
    } else {
      LogUtil.Debug('Failed to decode JSON')
    }
  }
}

// Computed property for item data - formats URL parameters into props for TrendLogChart
const currentItemData = computed(() => {
  // Always set scheduleItemData based on current query parameters and data
  scheduleItemData.value = formatScheduleItemData()

  LogUtil.Debug('scheduleItemData updated from query parameters:', scheduleItemData.value)

  // Return the trend log data for TrendLogChart props (or null for default behavior)
  if (trendLogItemData.value) {
    LogUtil.Debug('Using trendLogItemData for TrendLogChart props:', trendLogItemData.value)
    return trendLogItemData.value
  } else {
    LogUtil.Debug('No trendLogItemData available, TrendLogChart will use default behavior')
    return null
  }
})// Watch for URL parameter changes
watch(
  () => route.query,
  () => {
    loadTrendLogItemData()
  },
  { immediate: false }
)

onMounted(() => {
  LogUtil.Debug('TrendLog IndexPage mounted with query params:', route.query)

  // Initialize scheduleItemData based on query parameters
  scheduleItemData.value = formatScheduleItemData()
  LogUtil.Debug('Initial scheduleItemData set on mount:', scheduleItemData.value)

  // Load trend log data when the page loads
  loadTrendLogItemData()

  // Simple debugging to verify URL parameter processing
  LogUtil.Debug('=== IndexPage Props Formation (same as HvacDrawer objectDoubleClicked) ===')
  LogUtil.Debug('URL Parameters:', urlParams.value)
  LogUtil.Debug('Has Valid Parameters:', hasValidParameters.value)

  // Watch for changes in currentItemData (props to TrendLogChart)
  watch(() => currentItemData.value, (newData) => {
    LogUtil.Debug('=== Props passed to TrendLogChart ===')
    if (newData) {
      LogUtil.Debug('Title:', newData?.title)
      LogUtil.Debug('t3Entry ID:', newData?.t3Entry?.id)
      LogUtil.Debug('t3Entry PID:', newData?.t3Entry?.pid)
      LogUtil.Debug('Input count:', newData?.t3Entry?.input?.length)
      LogUtil.Debug('Range count:', newData?.t3Entry?.range?.length)

      // Log panel distribution
      if (newData?.t3Entry?.input && Array.isArray(newData.t3Entry.input)) {
        const panelCounts = newData.t3Entry.input.reduce((acc: any, input: any) => {
          acc[input.panel] = (acc[input.panel] || 0) + 1
          return acc
        }, {})
        LogUtil.Debug('Panel distribution:', panelCounts)
      }
    } else {
      LogUtil.Debug('No props data - TrendLogChart will use default behavior')
    }
  }, { immediate: true })

  // Watch scheduleItemData to confirm it matches HvacDrawer pattern
  watch(() => scheduleItemData.value, (newScheduleData, oldScheduleData) => {
    LogUtil.Debug('=== scheduleItemData Updated (matches HvacDrawer objectDoubleClicked pattern) ===')

    if (!newScheduleData) {
      LogUtil.Debug('⚠ scheduleItemData is NULL/UNDEFINED - This will cause TrendLogChart issues!')
      return
    }

    LogUtil.Debug('scheduleItemData structure:', {
      hasData: !!newScheduleData,
      cat: (newScheduleData as any)?.cat,
      id: (newScheduleData as any)?.id,
      type: (newScheduleData as any)?.type,
      title: (newScheduleData as any)?.title,
      hasT3Entry: !!(newScheduleData as any)?.t3Entry,
      hasSettings: !!(newScheduleData as any)?.settings
    })

    LogUtil.Debug('scheduleItemData t3Entry:', {
      id: (newScheduleData as any)?.t3Entry?.id,
      pid: (newScheduleData as any)?.t3Entry?.pid,
      type: (newScheduleData as any)?.t3Entry?.type,
      label: (newScheduleData as any)?.t3Entry?.label,
      command: (newScheduleData as any)?.t3Entry?.command,
      inputCount: (newScheduleData as any)?.t3Entry?.input?.length,
      rangeCount: (newScheduleData as any)?.t3Entry?.range?.length,
      status: (newScheduleData as any)?.t3Entry?.status
    })

    // Check if this is an update (not initial set)
    if (oldScheduleData && oldScheduleData !== newScheduleData) {
      LogUtil.Debug('📊 scheduleItemData UPDATED - TrendLogChart should refresh with new data')
    } else if (!oldScheduleData) {
      LogUtil.Debug('🆕 scheduleItemData INITIALIZED - Ready for TrendLogChart')
    }
  }, { immediate: true, deep: true })
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

.page-header {
  background: #ffffff;
  border-bottom: 1px solid #e8e8e8;
  padding: 16px 24px 12px;
  flex-shrink: 0;
}

.page-title {
  margin: 0 0 12px 0;
  font-size: 24px;
  font-weight: 600;
  color: #262626;
  line-height: 1.2;
}

.parameter-details {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  padding: 12px 16px;
  margin-bottom: 12px;
}

.parameter-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 8px 16px;
  margin-bottom: 8px;
}

.parameter-item {
  display: flex;
  align-items: center;
  font-size: 13px;
}

.parameter-label {
  font-weight: 500;
  color: #495057;
  margin-right: 8px;
  min-width: 80px;
}

.parameter-value {
  color: #212529;
  font-weight: 600;
}

.data-source {
  display: flex;
  align-items: center;
}

.data-status {
  display: flex;
  align-items: center;
  font-size: 13px;
  padding-top: 8px;
  border-top: 1px solid #dee2e6;
}

.status-label {
  font-weight: 500;
  color: #495057;
  margin-right: 8px;
}

.status-success {
  color: #28a745;
  font-weight: 500;
}

.status-warning {
  color: #ffc107;
  font-weight: 500;
}

.status-error {
  color: #dc3545;
  font-weight: 500;
}

.status-pending {
  color: #6c757d;
  font-weight: 500;
}

.page-description {
  margin: 0;
  font-size: 14px;
  color: #8c8c8c;
  line-height: 1.4;
}

.chart-wrapper {
  flex: 1;
  padding: 12px;
  background: #f5f5f5;
  overflow: hidden;
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

/* URL params debug display */
.url-params-debug {
  padding: 8px 12px;
  background: #f0f0f0;
  border-radius: 4px;
  border-left: 3px solid #659dc5;
}

.debug-button {
  background: #f0f0f0;
  color: #333;
  border: 1px solid #d9d9d9;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.debug-button:hover {
  background: #e6f7ff;
  border-color: #659dc5;
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  .page-header {
    padding: 12px 16px 8px;
  }

  .page-title {
    font-size: 20px;
    margin-bottom: 8px;
  }

  .parameter-details {
    padding: 8px 12px;
    margin-bottom: 8px;
  }

  .parameter-grid {
    grid-template-columns: 1fr;
    gap: 6px;
  }

  .parameter-item {
    font-size: 12px;
  }

  .parameter-label {
    min-width: 70px;
  }

  .data-status {
    font-size: 12px;
  }

  .page-description {
    font-size: 13px;
  }

  .chart-wrapper {
    padding: 8px;
  }
}

@media (max-width: 480px) {
  .page-header {
    padding: 8px 12px 6px;
  }

  .page-title {
    font-size: 18px;
  }

  .parameter-details {
    padding: 6px 8px;
  }

  .parameter-item {
    flex-direction: column;
    align-items: flex-start;
  }

  .parameter-label {
    margin-bottom: 2px;
  }

  .page-description {
    font-size: 12px;
  }

  .chart-wrapper {
    padding: 4px;
  }
}
</style>
