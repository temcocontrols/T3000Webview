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
    title: `Trend Log ${trendlog_id} - Panel ${panel_id} (SN: ${sn})`,
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

// Load data based on query parameters
const loadTrendLogItemData = () => {
  LogUtil.Debug('Loading trend log data from query parameters...')
  LogUtil.Debug('Current scheduleItemData before update:', scheduleItemData.value)

  try {
    isLoading.value = true
    error.value = null

    const formattedData = formatDataFromQueryParams()

    if (formattedData) {
      trendLogItemData.value = formattedData.chartData
      scheduleItemData.value = formattedData.scheduleData
      pageTitle.value = formattedData.chartData.title
      LogUtil.Debug('Data formatted from query parameters:', formattedData)
      LogUtil.Debug('scheduleItemData updated to:', scheduleItemData.value)
    } else {
      trendLogItemData.value = null
      scheduleItemData.value = null
      pageTitle.value = 'T3000 Trend Log Analysis'
      LogUtil.Debug('No valid parameters provided')
      LogUtil.Debug('scheduleItemData set to null')
    }

  } catch (err) {
    console.error('Error formatting data:', err)
    error.value = err instanceof Error ? err.message : 'Failed to format data'
    trendLogItemData.value = null
    scheduleItemData.value = null
  } finally {
    isLoading.value = false
  }
}

// Clean computed property for TrendLogChart props - no side effects
const currentItemData = computed(() => {
  // Simply return the current trend log data for TrendLogChart
  return trendLogItemData.value
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

  // Watch scheduleItemData changes
  watch(() => scheduleItemData.value, (newValue, oldValue) => {
    LogUtil.Debug('scheduleItemData changed:')
    LogUtil.Debug('Old value:', oldValue)
    LogUtil.Debug('New value:', newValue)
  }, { immediate: true })

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
