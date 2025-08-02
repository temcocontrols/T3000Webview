<!--
  TrendLog IndexPage - Standalone page for displaying T3000 trend logs

  URL Parameters:
  - SN: Serial number of the T3000 device (required for real data)
  - panelid: Panel ID within the device (required for real data)
  - trendlogid: Specific trend log ID to display (required for real data)
  - alldata: Optional flag for retrieving all data (optional)

  Example URLs:
  - Demo mode: http://localhost:3003/#/trendlog
  - Real data: http://localhost:3003/#/trendlog?SN=123&panelid=3&trendlogid=1
  - With alldata: http://localhost:3003/#/trendlog?SN=123&panelid=3&trendlogid=1&alldata=true

  API Endpoints Attempted:
  1. Primary: /api/data/device/{panelid}/trend_logs/{trendlogid}
  2. Fallback: /api/modbus-registers/{trendlogid}

  Falls back to demo data if API endpoints are unavailable.
-->
<template>
  <div class="trend-log-page">
    <div class="page-header">
      <h1 class="page-title">{{ pageTitle }}</h1>
      <p class="page-description">
        <span v-if="urlParams.SN">
          Real-time and historical data visualization for T3000 system
          (SN: {{ urlParams.SN }}, Panel: {{ urlParams.panelid }}, Trend Log: {{ urlParams.trendlogid }})
        </span>
        <span v-else>
          Real-time and historical data visualization for T3000 systems (Demo Mode)
        </span>
      </p>

      <!-- URL Parameters Display (for debugging) -->
      <div v-if="urlParams.SN || Object.keys(route.query).length > 0" class="url-params-debug" style="font-size: 12px; color: #666; margin-top: 8px;">
        <strong>Parameters:</strong>
        <span v-if="urlParams.SN">
          SN={{ urlParams.SN }},
          Panel={{ urlParams.panelid }},
          TrendLog={{ urlParams.trendlogid }}
          <span v-if="urlParams.alldata">, AllData={{ urlParams.alldata }}</span>
        </span>
        <span v-else>
          Demo Mode - Try these test URLs:
          <br>
          <a href="#/trendlog?SN=123&panelid=3&trendlogid=1" style="color: #659dc5; text-decoration: none;">
            ?SN=123&panelid=3&trendlogid=1
          </a>
          <br>
          <a href="#/trendlog?SN=456&panelid=5&trendlogid=2&alldata=true" style="color: #659dc5; text-decoration: none;">
            ?SN=456&panelid=5&trendlogid=2&alldata=true
          </a>
        </span>

        <!-- Debug buttons -->
        <div style="margin-top: 8px;">
          <button @click="loadTrendLogData" class="debug-button" style="margin-right: 8px;">
            Reload Data
          </button>
          <button @click="testDemoData" class="debug-button" style="margin-right: 8px;">
            Test Demo
          </button>
          <button @click="testRealData" class="debug-button" v-if="urlParams.SN">
            Test API
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
        <button @click="loadTrendLogData" class="retry-button">Retry</button>
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
const trendLogData = ref<any>(null)

// URL Parameters
const urlParams = computed(() => ({
  SN: route.query.SN ? Number(route.query.SN) : null,
  panelid: route.query.panelid ? Number(route.query.panelid) : null,
  trendlogid: route.query.trendlogid ? Number(route.query.trendlogid) : null,
  alldata: route.query.alldata as string || null
}))

// Demo data function
const getDemoData = () => {
  return {
    title: "Demo Trend Log",
    active: true,
    type: "Temperature",
    translate: [256.6363359569053, 321.74069633799525],
    width: 60,
    height: 60,
    rotate: 0,
    scaleX: 1,
    scaleY: 1,
    settings: {
      fillColor: "#659dc5",
      titleColor: "inherit",
      bgColor: "inherit",
      textColor: "inherit",
      fontSize: 16,
      t3EntryDisplayField: "label"
    },
    zindex: 1,
    t3Entry: {
      an_inputs: 12,
      command: "3MON1",
      hour_interval_time: 0,
      id: "MON1",
      index: 0,
      input: [
        {
          network: 0,
          panel: 3,
          point_number: 0,
          point_type: 2,
          sub_panel: 0
        },
        {
          network: 0,
          panel: 3,
          point_number: 1,
          point_type: 2,
          sub_panel: 0
        },
        {
          network: 0,
          panel: 3,
          point_number: 2,
          point_type: 2,
          sub_panel: 0
        },
        {
          network: 0,
          panel: 3,
          point_number: 0,
          point_type: 3,
          sub_panel: 0
        },
        {
          network: 0,
          panel: 3,
          point_number: 4,
          point_type: 2,
          sub_panel: 0
        },
        {
          network: 0,
          panel: 3,
          point_number: 5,
          point_type: 2,
          sub_panel: 0
        },
        {
          network: 0,
          panel: 3,
          point_number: 6,
          point_type: 2,
          sub_panel: 0
        },
        {
          network: 0,
          panel: 3,
          point_number: 17,
          point_type: 2,
          sub_panel: 0
        },
        {
          network: 0,
          panel: 3,
          point_number: 8,
          point_type: 2,
          sub_panel: 0
        },
        {
          network: 0,
          panel: 3,
          point_number: 10,
          point_type: 2,
          sub_panel: 0
        },
        {
          network: 0,
          panel: 3,
          point_number: 11,
          point_type: 2,
          sub_panel: 0
        },
        {
          network: 0,
          panel: 3,
          point_number: 22,
          point_type: 2,
          sub_panel: 0
        },
        {
          network: 0,
          panel: 3,
          point_number: 0,
          point_type: 1,
          sub_panel: 0
        },
        {
          network: 0,
          panel: 3,
          point_number: 0,
          point_type: 1,
          sub_panel: 0
        }
      ],
      label: "TRL11111",
      minute_interval_time: 0,
      num_inputs: 14,
      pid: 3,
      range: [0, 0, 0, 4, 0, 0, 0, 7, 0, 0, 0, 0, 1, 1],
      second_interval_time: 15,
      status: 1,
      type: "MON"
    },
    showDimensions: true,
    cat: "Duct",
    id: 4
  }
}

// Fetch real data function
const fetchRealData = async (sn: number, panelid: number, trendlogid: number, alldata?: string) => {
  try {
    isLoading.value = true
    error.value = null

    // Primary API endpoint (adjust based on your backend implementation)
    // Based on the backend structure, the endpoint might be:
    // Option 1: Data management endpoint (if implemented)
    let apiUrl = `/api/data/device/${panelid}/trend_logs/${trendlogid}`

    // Option 2: Direct modbus register endpoint (fallback)
    const fallbackUrl = `/api/modbus-registers/${trendlogid}`

    const params = new URLSearchParams()
    if (sn) params.append('sn', sn.toString())
    if (alldata) params.append('alldata', alldata)

    const queryString = params.toString()
    const fullUrl = queryString ? `${apiUrl}?${queryString}` : apiUrl

    console.log(`Attempting to fetch trend log data from: ${fullUrl}`)

    // Try primary endpoint first
    let response = await fetch(fullUrl)

    // If primary endpoint fails, try fallback
    if (!response.ok && response.status === 404) {
      console.log(`Primary endpoint failed, trying fallback: ${fallbackUrl}`)
      const fallbackFullUrl = queryString ? `${fallbackUrl}?${queryString}` : fallbackUrl
      response = await fetch(fallbackFullUrl)
    }

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    // Transform API response to expected format if needed
    // The backend might return data in a different structure
    if (data.data) {
      // If wrapped in an API response structure
      return transformApiResponseToTrendLogFormat(data.data, sn, panelid, trendlogid)
    } else {
      // Direct response
      return transformApiResponseToTrendLogFormat(data, sn, panelid, trendlogid)
    }

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
    error.value = errorMessage
    console.error('Error fetching trend log data:', err)

    // Log the attempted URLs for debugging
    console.log('Failed to fetch from API endpoints, using demo data')

    // Return demo data with actual parameters
    return getDemoDataWithParams(sn, panelid, trendlogid, alldata)
  } finally {
    isLoading.value = false
  }
}

// Transform API response to the expected trend log format
const transformApiResponseToTrendLogFormat = (apiData: any, sn: number, panelid: number, trendlogid: number) => {
  // If the API returns data in the exact format we need, return as-is
  if (apiData.t3Entry && apiData.settings) {
    return apiData
  }

  // Otherwise, transform the API data to match the expected format
  return {
    title: apiData.name || apiData.label || `Trend Log ${trendlogid}`,
    active: apiData.status === 1 || apiData.active || true,
    type: apiData.type || "Temperature",
    translate: apiData.translate || [256.6363359569053, 321.74069633799525],
    width: apiData.width || 60,
    height: apiData.height || 60,
    rotate: apiData.rotate || 0,
    scaleX: apiData.scaleX || 1,
    scaleY: apiData.scaleY || 1,
    settings: {
      fillColor: apiData.fillColor || "#659dc5",
      titleColor: "inherit",
      bgColor: "inherit",
      textColor: "inherit",
      fontSize: 16,
      t3EntryDisplayField: "label"
    },
    zindex: apiData.zindex || 1,
    t3Entry: {
      an_inputs: apiData.an_inputs || 12,
      command: apiData.command || `${panelid}MON${trendlogid}`,
      hour_interval_time: apiData.hour_interval_time || 0,
      id: apiData.id || `MON${trendlogid}`,
      index: apiData.index || 0,
      input: apiData.input || [],
      label: apiData.label || `TRL_${sn}_${panelid}_${trendlogid}`,
      minute_interval_time: apiData.minute_interval_time || 0,
      num_inputs: apiData.num_inputs || 14,
      pid: panelid,
      range: apiData.range || [0, 0, 0, 4, 0, 0, 0, 7, 0, 0, 0, 0, 1, 1],
      second_interval_time: apiData.second_interval_time || 15,
      status: apiData.status || 1,
      type: "MON"
    },
    showDimensions: true,
    cat: apiData.cat || "Duct",
    id: trendlogid
  }
}

// Enhanced demo data with real parameters
const getDemoDataWithParams = (sn?: number, panelid?: number, trendlogid?: number, alldata?: string) => {
  const demoData = getDemoData()

  // Update demo data with actual parameters
  if (sn && panelid && trendlogid) {
    demoData.title = `Demo Trend Log ${trendlogid} (SN: ${sn})`
    demoData.id = trendlogid
    demoData.t3Entry.label = `TRL_${sn}_${panelid}_${trendlogid}`
    demoData.t3Entry.pid = panelid
    demoData.t3Entry.id = `MON${trendlogid}`
    demoData.t3Entry.command = `${panelid}MON${trendlogid}`

    // Update input points to use the actual panel ID
    demoData.t3Entry.input = demoData.t3Entry.input.map(input => ({
      ...input,
      panel: panelid
    }))
  }

  return demoData
}

// Load data based on URL parameters or use demo data
const loadTrendLogData = async () => {
  const { SN, panelid, trendlogid, alldata } = urlParams.value

  // Update page title based on parameters
  if (SN && panelid && trendlogid) {
    pageTitle.value = `Trend Log ${trendlogid} - Panel ${panelid} (SN: ${SN})`
    trendLogData.value = await fetchRealData(SN, panelid, trendlogid, alldata || undefined)
  } else {
    pageTitle.value = 'T3000 Trend Log Analysis (Demo)'
    trendLogData.value = getDemoData()
  }
}

// Test functions for debugging
const testDemoData = () => {
  console.log('Testing demo data...')
  trendLogData.value = getDemoData()
  pageTitle.value = 'T3000 Trend Log Analysis (Demo Test)'
}

const testRealData = async () => {
  const { SN, panelid, trendlogid, alldata } = urlParams.value
  if (SN && panelid && trendlogid) {
    console.log('Testing real data fetch...')
    trendLogData.value = await fetchRealData(SN, panelid, trendlogid, alldata || undefined)
  }
}

// Computed property for item data
const currentItemData = computed(() => {
  // If we have trend log data from URL parameters, use it
  if (trendLogData.value) {
    return trendLogData.value
  }

  // Otherwise, use the existing logic as fallback
  return scheduleItemData.value || {
    t3Entry: {
      description: 'Trend Log Chart',
      label: 'T3000 Data Analysis',
      id: 'trend-log-1',
      pid: 1
    },
    title: 'Trend Log Analysis'
  }
})

// Watch for URL parameter changes
watch(
  () => route.query,
  () => {
    loadTrendLogData()
  },
  { immediate: false }
)

onMounted(() => {
  // Load trend log data when the page loads
  loadTrendLogData()
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
  margin: 0 0 4px 0;
  font-size: 24px;
  font-weight: 600;
  color: #262626;
  line-height: 1.2;
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

  .page-description {
    font-size: 12px;
  }

  .chart-wrapper {
    padding: 4px;
  }
}
</style>
