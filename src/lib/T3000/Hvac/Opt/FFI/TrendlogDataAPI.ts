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
    panel_id: number // Add missing panel_id field expected by server
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
    panel_id: number // Add missing panel_id field expected by server
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
   * Sync TrendLog with FFI (T3000 native integration)
   * @param device_id - Serial number of the T3000 device
   * @param panel_id - Panel identifier
   * @param trendlog_id - TrendLog identifier (numeric)
   * @returns Promise with sync result
   */
  const syncTrendlogWithFFI = async (device_id: number, panel_id: number, trendlog_id: number): Promise<any> => {
    try {
      const response = await fetch(`${TRENDLOG_API_BASE_URL}/api/t3_device/trendlogs/${trendlog_id}/sync-ffi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_id, panel_id })
      })

      if (!response.ok) {
        throw new Error(`FFI sync failed: ${response.status} ${response.statusText}`)
      }

      return await response.json()
    } catch (err) {
      console.error('Failed to sync TrendLog with FFI:', err)
      throw err
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
   * Step 1: Create initial TrendLog record (fast - from query parameters)
   * @param serial_number - Serial number of the T3000 device
   * @param trendlog_id - TrendLog identifier (string like "MONITOR0" or "0")
   * @returns Promise with initial TrendLog info
   */
  /**
   * Step 1: Create initial TrendLog record in database (fast)
   * @param serial_number - Serial number of the T3000 device
   * @param panel_id - Panel ID for multi-device support
   * @param trendlog_id - TrendLog identifier (string like "MONITOR0" or "0")
   * @returns Promise with initial TrendLog info
   */
  const createInitialTrendlog = async (serial_number: number, panel_id: number, trendlog_id: string, chart_title?: string): Promise<any> => {
    try {
      const response = await fetch(`${TRENDLOG_API_BASE_URL}/api/t3_device/trendlogs/${trendlog_id}/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_id: serial_number,
          panel_id: panel_id,
          chart_title: chart_title
        })
      })

      if (!response.ok) {
        throw new Error(`Initial TrendLog creation failed: ${response.status} ${response.statusText}`)
      }

      return await response.json()
    } catch (err) {
      console.error('Failed to create initial TrendLog:', err)
      throw err
    }
  }



  /**
   * Complete TrendLog initialization: Create initial record + FFI sync
   * @param serial_number - Serial number of the T3000 device
   * @param panel_id - Panel ID for multi-device support
   * @param trendlog_id - TrendLog identifier (string like "MONITOR0" or "0")
   * @returns Promise with complete TrendLog info
   */
  const initializeCompleteFFI = async (serial_number: number, panel_id: number, trendlog_id: string, chart_title?: string): Promise<any> => {
    try {
      // Step 1: Create initial record (fast)
      const initialResult = await createInitialTrendlog(serial_number, panel_id, trendlog_id, chart_title)

      // Step 2: Sync with FFI for complete info (slower)
      // Convert trendlog_id to numeric for FFI sync
      const numericTrendlogId = parseInt(trendlog_id.replace('MONITOR', '')) || 0
      const ffiResult = await syncTrendlogWithFFI(serial_number, panel_id, numericTrendlogId)

      return {
        initial: initialResult,
        ffi: ffiResult,
        success: initialResult.success && ffiResult.success
      }
    } catch (err) {
      console.error('Failed to initialize complete FFI:', err)
      throw err
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
   * Format socket data for batch save operation
   * Converts T3000 socket data structure to API format
   */
  const formatSocketDataForSave = (socketData: any[], serialNumber: number, panelId: number): RealtimeDataRequest[] => {
    return socketData.map(point => ({
      timestamp: new Date().toISOString(),
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

  /**
   * Save view selections for View 2 or 3
   * POST /api/t3_device/trendlogs/{trendlog_id}/views/{view_number}/selections
   * Enhanced to pass SerialNumber and PanelId for multi-device support
   */
  const saveViewSelections = async (trendlogId: string, viewNumber: number, selections: any[], serialNumber?: number, panelId?: number): Promise<boolean> => {
    try {
      const requestBody = {
        selections,
        serial_number: serialNumber,
        panel_id: panelId
      }

      console.log('🔧 TrendlogAPI: Making save request with device context', {
        url: `${TRENDLOG_API_BASE_URL}/api/t3_device/trendlogs/${trendlogId}/views/${viewNumber}/selections`,
        requestBody,
        selectionsCount: selections.length,
        deviceContext: { serialNumber, panelId }
      })

      const response = await fetch(`${TRENDLOG_API_BASE_URL}/api/t3_device/trendlogs/${trendlogId}/views/${viewNumber}/selections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unable to read error response')
        console.error('🚫 TrendlogAPI: Save failed', {
          status: response.status,
          statusText: response.statusText,
          errorText,
          url: `${TRENDLOG_API_BASE_URL}/api/t3_device/trendlogs/${trendlogId}/views/${viewNumber}/selections`
        })
      } else {
        console.log('✅ TrendlogAPI: Save successful', {
          status: response.status,
          trendlogId,
          viewNumber,
          selectionsCount: selections.length
        })
      }

      return response.ok
    } catch (err) {
      console.error('Failed to save view selections:', err)
      return false
    }
  }

  /**
   * Load view selections for View 2 or 3
   * GET /api/t3_device/trendlogs/{trendlog_id}/views/{view_number}/selections
   * Enhanced to include device context for multi-device support
   */
  const loadViewSelections = async (trendlogId: string, viewNumber: number, serialNumber?: number, panelId?: number): Promise<any[] | null> => {
    try {
      // Build URL with query parameters for device context if provided
      const params = new URLSearchParams()
      if (serialNumber !== undefined) params.append('serial_number', serialNumber.toString())
      if (panelId !== undefined) params.append('panel_id', panelId.toString())

      const queryString = params.toString()
      const url = `${TRENDLOG_API_BASE_URL}/api/t3_device/trendlogs/${trendlogId}/views/${viewNumber}/selections${queryString ? `?${queryString}` : ''}`

      console.log('🔧 TrendlogAPI: Loading view selections with device context', {
        url,
        deviceContext: { serialNumber, panelId }
      })

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        return null
      }

      return await response.json()
    } catch (err) {
      console.error('Failed to load view selections:', err)
      return null
    }
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

    // FFI Methods
    createInitialTrendlog,
    syncTrendlogWithFFI,
    initializeCompleteFFI,

    // View Selection Methods
    saveViewSelections,
    loadViewSelections,

    // Utility Methods
    formatSocketDataForSave
  }
}
