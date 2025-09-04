// T3000 TrendLog Data API Composable
// Handles historical data API calls for TrendLog IndexPage.vue
// Enhanced with specific point filtering for timebase functionality
import { ref } from 'vue'

// API Configuration - Port 9103 for T3000 HTTP API (9104 is WebSocket only)
const TRENDLOG_API_BASE_URL = 'http://localhost:9103'

export interface TrendlogHistoryRequest {
  serial_number: number
  panel_id: number
  trendlog_id: string
  start_time?: string  // Format: "YYYY-MM-DD HH:MM:SS" to match LoggingTime_Fmt column
  end_time?: string    // Format: "YYYY-MM-DD HH:MM:SS" to match LoggingTime_Fmt column
  limit?: number
  point_types?: string[] // ["INPUT", "OUTPUT", "VARIABLE"]
    // New specific point filtering for timebase requests
  specific_points?: {
    point_id: string
    point_type: string
    point_index: number
  }[]
}

export interface SmartTrendlogRequest {
  serial_number: number
  panel_id: number
  lookback_minutes: number
  data_sources: string[] // ["FFI_SYNC", "REALTIME", "HISTORICAL", "MANUAL"]
  specific_points?: {
    point_id: string
    point_type: string
    point_index: number
  }[]
  consolidate_duplicates: boolean
  max_points?: number
}

export interface SmartTrendlogResponse {
  data: any[]
  total_points: number
  sources_used: string[]
  consolidation_applied: boolean
  has_historical_data: boolean
}

export interface TrendlogDataPoint {
  time: string
  value: number              // Scaled value (divided by 1000 if original > 1000)
  point_id: string
  point_type: string
  point_index: number
  units?: string
  range?: string
  raw_value: string          // Original string value from database
  original_value?: number    // Original numeric value before scaling
  was_scaled?: boolean       // Indicates if value was scaled down
  is_analog: boolean
}

export interface TrendlogHistoryResponse {
  device_id: number
  panel_id: number
  trendlog_id: string
  data: TrendlogDataPoint[]
  count: number
  message: string
}

export interface RealtimeDataRequest {
  serial_number: number
  panel_id: number
  point_id: string
  point_index: number
  point_type: string
  value: string
  range_field?: string
  digital_analog?: string
  units?: string
  // Enhanced source tracking
  data_source?: string     // 'REALTIME', 'FFI_SYNC', 'HISTORICAL', 'MANUAL'
  sync_interval?: number   // Sync interval in seconds
  created_by?: string      // 'FRONTEND', 'BACKEND', 'API'
}

export function useTrendlogDataAPI() {
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Get historical trendlog data for display in TrendLogChart
   * Used when TrendLog IndexPage needs to load historical data from API instead of URL parameters
   */
  const getTrendlogHistory = async (request: TrendlogHistoryRequest): Promise<TrendlogHistoryResponse | null> => {
    isLoading.value = true
    error.value = null

    try {
      const response = await fetch(`${TRENDLOG_API_BASE_URL}/api/t3_device/devices/${request.serial_number}/trendlogs/${request.trendlog_id}/history`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      })

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`)
      }

      const data: TrendlogHistoryResponse = await response.json()
      return data
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch trendlog history'
      error.value = errorMsg
      console.error('TrendLog API Error:', errorMsg)
      return null
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Save realtime data point to database (called from socket port 9104 handler)
   * Used when realtime data is received from T3000 device via WebSocket
   */
  const saveRealtimeData = async (dataPoint: RealtimeDataRequest): Promise<boolean> => {
    try {
      const response = await fetch(`${TRENDLOG_API_BASE_URL}/api/t3_device/trendlog-data/realtime`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataPoint)
      })

      return response.ok
    } catch (err) {
      console.error('Failed to save realtime data:', err)
      return false
    }
  }

  /**
   * Save batch of realtime data points to database
   * Used for batch saving multiple data points from socket
   */
  const saveRealtimeBatch = async (dataPoints: RealtimeDataRequest[]): Promise<number> => {
    try {
      const response = await fetch(`${TRENDLOG_API_BASE_URL}/api/t3_device/trendlog-data/realtime/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataPoints)
      })

      if (!response.ok) {
        throw new Error(`Batch save failed: ${response.status}`)
      }

      const result = await response.json()
      return result.rows_affected || 0
    } catch (err) {
      console.error('Failed to save realtime batch:', err)
      return 0
    }
  }

  /**
   * Get recent trendlog data for realtime display
   */
  const getRecentData = async (
    serialNumber: number,
    panelId: number,
    pointTypes?: string[],
    limit: number = 100
  ): Promise<TrendlogDataPoint[]> => {
    try {
      const params = new URLSearchParams({
        panel_id: panelId.toString(),
        limit: limit.toString()
      })

      if (pointTypes && pointTypes.length > 0) {
        params.set('point_types', pointTypes.join(','))
      }

      const response = await fetch(`${TRENDLOG_API_BASE_URL}/api/t3_device/devices/${serialNumber}/trendlog-data/recent?${params}`)

      if (!response.ok) {
        throw new Error(`Failed to fetch recent data: ${response.status}`)
      }

      const result = await response.json()
      return result.data || []
    } catch (err) {
      console.error('Failed to fetch recent data:', err)
      return []
    }
  }

  /**
   * Get trendlog data statistics
   */
  const getDataStatistics = async (serialNumber: number, panelId: number) => {
    try {
      const params = new URLSearchParams({
        panel_id: panelId.toString()
      })

      const response = await fetch(`${TRENDLOG_API_BASE_URL}/api/t3_device/devices/${serialNumber}/trendlog-data/stats?${params}`)

      if (!response.ok) {
        throw new Error(`Failed to fetch statistics: ${response.status}`)
      }

      return await response.json()
    } catch (err) {
      console.error('Failed to fetch statistics:', err)
      return null
    }
  }

  /**
   * Smart trendlog data retrieval with source prioritization
   */
  const getSmartTrendlogData = async (request: SmartTrendlogRequest): Promise<SmartTrendlogResponse | null> => {
    try {
      const response = await fetch(
        `${TRENDLOG_API_BASE_URL}/devices/${request.serial_number}/trendlog-data/smart`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request)
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to fetch smart trendlog data: ${response.status}`)
      }

      const result = await response.json()
      return {
        data: result.data || [],
        total_points: result.total_points || 0,
        sources_used: result.sources_used || [],
        consolidation_applied: result.consolidation_applied || false,
        has_historical_data: result.has_historical_data || false
      }
    } catch (err) {
      console.error('Failed to fetch smart trendlog data:', err)
      return null
    }
  }

  /**
   * Convert socket data from port 9104 to format suitable for database saving
   * Used when processing realtime data from WebSocket connection
   */
  const formatSocketDataForSave = (
    socketData: any,
    serialNumber: number,
    panelId: number
  ): RealtimeDataRequest[] => {
    if (!socketData || !Array.isArray(socketData.data)) {
      return []
    }

    return socketData.data.map((point: any) => ({
      serial_number: serialNumber,
      panel_id: panelId,
      point_id: point.id || `${point.type || 'UNK'}${point.index || 0}`,
      point_index: point.index || 0,
      point_type: point.type || 'UNKNOWN',
      value: point.value?.toString() || '0',
      range_field: point.range?.toString(),
      digital_analog: point.digital_analog?.toString(),
      units: point.units
    }))
  }

  return {
    // State
    isLoading,
    error,

    // API Methods
    getTrendlogHistory,
    saveRealtimeData,
    saveRealtimeBatch,
    getRecentData,
    getDataStatistics,
    getSmartTrendlogData,

    // Utility Methods
    formatSocketDataForSave
  }
}
