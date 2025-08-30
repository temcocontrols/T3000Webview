// Composable for T3000 FFI API Service integration
// Uses HTTP retry patterns with direct FFI calls
// Keeps same JSON structure as WebSocket for consistency

import { ref, computed } from 'vue'
import axios, { AxiosError } from 'axios'

interface FfiApiResponse<T = any> {
  action: string
  status: 'success' | 'error'
  data?: T
  error?: string
  timestamp: string
}

interface DeviceInfo {
  panel_id: number
  panel_name: string
  panel_serial_number: number
  panel_ipaddress: string
  input_logging_time: string
  output_logging_time: string
  variable_logging_time: string
  ip_address?: string
  port?: number
  bacnet_mstp_mac_id?: number
  modbus_address?: number
  pc_ip_address?: string
  modbus_port?: number
  bacnet_ip_port?: number
  show_label_name?: string
  connection_type?: string
}

interface PointData {
  index: number
  panel: number
  full_label: string
  auto_manual: number
  value: number
  pid: number
  units: string
  range: number
  calibration: number
  sign: number
  status: number
  timestamp: string
  label?: string
  // Optional fields for different point types
  decom?: string
  sub_product?: number
  sub_id?: number
  sub_panel?: number
  network_number?: number
  description?: string
  digital_analog?: number
  filter?: number
  control?: number
  command?: string
  id?: string
  calibration_l?: number
  low_voltage?: number
  high_voltage?: number
  hw_switch_status?: number
  unused?: number
}

interface DeviceWithPoints {
  device_info: DeviceInfo
  input_points: PointData[]
  output_points: PointData[]
  variable_points: PointData[]
}

interface LoggingDataResponse {
  action: string
  devices: DeviceWithPoints[]
  timestamp: string
}

interface TrendLogData {
  device_serial: number
  panel_id: number
  trendlog_id: number
  point_index: number
  value: number
  timestamp: string
  units: string
  label: string
}

export function useT3000FfiApi() {
  // State
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const lastResponse = ref<any>(null)

  // Configuration
  const apiConfig = {
    baseURL: process.env.NODE_ENV === 'development' ? 'http://localhost:9103' : '',
    timeout: 30000, // 30 seconds
    retries: 3,
    retryDelay: 1000, // 1 second
  }

  // HTTP client with retry logic
  const apiClient = axios.create({
    baseURL: apiConfig.baseURL,
    timeout: apiConfig.timeout,
    headers: {
      'Content-Type': 'application/json',
    },
  })

  // Request interceptor for logging
  apiClient.interceptors.request.use(
    (config) => {
      console.log(`🔄 FFI API Request: ${config.method?.toUpperCase()} ${config.url}`)
      return config
    },
    (error) => {
      console.error('❌ FFI API Request Error:', error)
      return Promise.reject(error)
    }
  )

  // Response interceptor for error handling and retry
  apiClient.interceptors.response.use(
    (response) => {
      console.log(`✅ FFI API Response: ${response.status} ${response.config.url}`)
      return response
    },
    async (error: AxiosError) => {
      const config = error.config as any

      // Retry logic
      if (!config._retryCount) {
        config._retryCount = 0
      }

      if (config._retryCount < apiConfig.retries) {
        config._retryCount++
        console.log(`🔄 FFI API Retry ${config._retryCount}/${apiConfig.retries}: ${config.url}`)

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, apiConfig.retryDelay))

        return apiClient(config)
      }

      console.error(`❌ FFI API Error after ${apiConfig.retries} retries:`, error.response?.status, error.message)
      return Promise.reject(error)
    }
  )

  // Helper function to handle API responses
  const handleApiResponse = <T>(response: { data: FfiApiResponse<T> }): T => {
    const { data } = response
    lastResponse.value = data

    if (data.status === 'success' && data.data) {
      error.value = null
      return data.data
    } else {
      const errorMsg = data.error || 'Unknown API error'
      error.value = errorMsg
      throw new Error(errorMsg)
    }
  }

  // API Methods

  // Get all devices with points
  const getAllDevices = async (): Promise<LoggingDataResponse> => {
    isLoading.value = true
    error.value = null

    try {
      console.log('📡 FFI API: Getting all devices...')
      const response = await apiClient.get<FfiApiResponse<LoggingDataResponse>>('/api/t3000/devices')
      const result = handleApiResponse(response)
      console.log(`✅ FFI API: Retrieved ${result.devices.length} devices`)
      return result
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get devices'
      error.value = errorMsg
      console.error('❌ FFI API getAllDevices error:', errorMsg)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Get specific device by panel ID
  const getDeviceById = async (panelId: number): Promise<DeviceWithPoints> => {
    isLoading.value = true
    error.value = null

    try {
      console.log(`📡 FFI API: Getting device ${panelId}...`)
      const response = await apiClient.get<FfiApiResponse<DeviceWithPoints>>(`/api/t3000/devices/${panelId}`)
      const result = handleApiResponse(response)
      console.log(`✅ FFI API: Retrieved device ${panelId} - ${result.device_info.panel_name}`)
      return result
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : `Failed to get device ${panelId}`
      error.value = errorMsg
      console.error(`❌ FFI API getDeviceById(${panelId}) error:`, errorMsg)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Get device points (all types)
  const getDevicePoints = async (panelId: number): Promise<PointData[]> => {
    isLoading.value = true
    error.value = null

    try {
      console.log(`📡 FFI API: Getting points for device ${panelId}...`)
      const response = await apiClient.get<FfiApiResponse<PointData[]>>(`/api/t3000/devices/${panelId}/points`)
      const result = handleApiResponse(response)
      console.log(`✅ FFI API: Retrieved ${result.length} points for device ${panelId}`)
      return result
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : `Failed to get points for device ${panelId}`
      error.value = errorMsg
      console.error(`❌ FFI API getDevicePoints(${panelId}) error:`, errorMsg)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Get device points by type
  const getDevicePointsByType = async (panelId: number, pointType: 'input' | 'output' | 'variable'): Promise<PointData[]> => {
    isLoading.value = true
    error.value = null

    try {
      console.log(`📡 FFI API: Getting ${pointType} points for device ${panelId}...`)
      const response = await apiClient.get<FfiApiResponse<PointData[]>>(`/api/t3000/devices/${panelId}/points/${pointType}`)
      const result = handleApiResponse(response)
      console.log(`✅ FFI API: Retrieved ${result.length} ${pointType} points for device ${panelId}`)
      return result
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : `Failed to get ${pointType} points for device ${panelId}`
      error.value = errorMsg
      console.error(`❌ FFI API getDevicePointsByType(${panelId}, ${pointType}) error:`, errorMsg)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Get trend logs for device
  const getDeviceTrendLogs = async (panelId: number): Promise<string[]> => {
    isLoading.value = true
    error.value = null

    try {
      console.log(`📡 FFI API: Getting trend logs for device ${panelId}...`)
      const response = await apiClient.get<FfiApiResponse<string[]>>(`/api/t3000/devices/${panelId}/trendlogs`)
      const result = handleApiResponse(response)
      console.log(`✅ FFI API: Retrieved ${result.length} trend logs for device ${panelId}`)
      return result
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : `Failed to get trend logs for device ${panelId}`
      error.value = errorMsg
      console.error(`❌ FFI API getDeviceTrendLogs(${panelId}) error:`, errorMsg)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Get trend log data
  const getTrendLogData = async (panelId: number, trendlogId: number, options?: {
    startTime?: string
    endTime?: string
    limit?: number
  }): Promise<TrendLogData[]> => {
    isLoading.value = true
    error.value = null

    try {
      console.log(`📡 FFI API: Getting trend log data ${panelId}/${trendlogId}...`)

      const params = new URLSearchParams()
      params.append('panel_id', panelId.toString())
      params.append('trendlog_id', trendlogId.toString())
      if (options?.startTime) params.append('start_time', options.startTime)
      if (options?.endTime) params.append('end_time', options.endTime)
      if (options?.limit) params.append('limit', options.limit.toString())

      const response = await apiClient.get<FfiApiResponse<TrendLogData[]>>(
        `/api/t3000/devices/${panelId}/trendlogs/${trendlogId}?${params.toString()}`
      )
      const result = handleApiResponse(response)
      console.log(`✅ FFI API: Retrieved ${result.length} trend log data points`)
      return result
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : `Failed to get trend log data ${panelId}/${trendlogId}`
      error.value = errorMsg
      console.error(`❌ FFI API getTrendLogData(${panelId}, ${trendlogId}) error:`, errorMsg)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Get real-time data (same as getAllDevices but different endpoint)
  const getRealtimeData = async (): Promise<LoggingDataResponse> => {
    isLoading.value = true
    error.value = null

    try {
      console.log('📡 FFI API: Getting real-time data...')
      const response = await apiClient.get<FfiApiResponse<LoggingDataResponse>>('/api/t3000/realtime')
      const result = handleApiResponse(response)
      console.log(`✅ FFI API: Retrieved real-time data for ${result.devices.length} devices`)
      return result
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get real-time data'
      error.value = errorMsg
      console.error('❌ FFI API getRealtimeData error:', errorMsg)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Get real-time data for specific device
  const getDeviceRealtimeData = async (panelId: number): Promise<DeviceWithPoints> => {
    isLoading.value = true
    error.value = null

    try {
      console.log(`📡 FFI API: Getting real-time data for device ${panelId}...`)
      const response = await apiClient.get<FfiApiResponse<DeviceWithPoints>>(`/api/t3000/realtime/${panelId}`)
      const result = handleApiResponse(response)
      console.log(`✅ FFI API: Retrieved real-time data for device ${panelId}`)
      return result
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : `Failed to get real-time data for device ${panelId}`
      error.value = errorMsg
      console.error(`❌ FFI API getDeviceRealtimeData(${panelId}) error:`, errorMsg)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Get system status
  const getSystemStatus = async (): Promise<any> => {
    isLoading.value = true
    error.value = null

    try {
      console.log('📡 FFI API: Getting system status...')
      const response = await apiClient.get<FfiApiResponse<any>>('/api/t3000/status')
      const result = handleApiResponse(response)
      console.log('✅ FFI API: System status retrieved')
      return result
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get system status'
      error.value = errorMsg
      console.error('❌ FFI API getSystemStatus error:', errorMsg)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Refresh all data
  const refreshAllData = async (): Promise<LoggingDataResponse> => {
    isLoading.value = true
    error.value = null

    try {
      console.log('🔄 FFI API: Refreshing all data...')
      const response = await apiClient.post<FfiApiResponse<LoggingDataResponse>>('/api/t3000/refresh')
      const result = handleApiResponse(response)
      console.log(`✅ FFI API: Data refreshed for ${result.devices.length} devices`)
      return result
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to refresh data'
      error.value = errorMsg
      console.error('❌ FFI API refreshAllData error:', errorMsg)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // NEW: Direct FFI API methods that match WebSocket client operations

  // FFI GetPanelsList - Action 4 (replaces WebSocket GetPanelsList)
  const ffiGetPanelsList = async (): Promise<any> => {
    isLoading.value = true
    error.value = null

    try {
      console.log('🔄 FFI API ffiGetPanelsList started')
      const response = await apiClient.get<FfiApiResponse<any>>('/api/t3000/ffi/panels-list')
      const result = handleApiResponse(response)
      console.log('✅ FFI API ffiGetPanelsList completed:', result)
      return result
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get panels list'
      error.value = errorMsg
      console.error('❌ FFI API ffiGetPanelsList error:', errorMsg)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // FFI GetPanelData - Action 0 (replaces WebSocket GetPanelData)
  const ffiGetPanelData = async (panelId: number): Promise<any> => {
    isLoading.value = true
    error.value = null

    try {
      console.log(`🔄 FFI API ffiGetPanelData started for panel ${panelId}`)
      const response = await apiClient.get<FfiApiResponse<any>>(`/api/t3000/ffi/panel-data/${panelId}`)
      const result = handleApiResponse(response)
      console.log('✅ FFI API ffiGetPanelData completed:', result)
      return result
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get panel data'
      error.value = errorMsg
      console.error('❌ FFI API ffiGetPanelData error:', errorMsg)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // FFI GetInitialData - Action 1 (replaces WebSocket GetInitialData)
  const ffiGetInitialData = async (panelId: number, graphicId?: number): Promise<any> => {
    isLoading.value = true
    error.value = null

    try {
      const url = graphicId
        ? `/api/t3000/ffi/initial-data/${panelId}/${graphicId}`
        : `/api/t3000/ffi/initial-data/${panelId}`

      console.log(`🔄 FFI API ffiGetInitialData started for panel ${panelId} graphic ${graphicId || 'none'}`)
      const response = await apiClient.get<FfiApiResponse<any>>(url)
      const result = handleApiResponse(response)
      console.log('✅ FFI API ffiGetInitialData completed:', result)
      return result
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get initial data'
      error.value = errorMsg
      console.error('❌ FFI API ffiGetInitialData error:', errorMsg)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // FFI GetEntries - Action 6 (replaces WebSocket GetEntries)
  const ffiGetEntries = async (panelId: number, graphicId?: number): Promise<any> => {
    isLoading.value = true
    error.value = null

    try {
      const url = graphicId
        ? `/api/t3000/ffi/entries/${panelId}/${graphicId}`
        : `/api/t3000/ffi/entries/${panelId}`

      console.log(`🔄 FFI API ffiGetEntries started for panel ${panelId} graphic ${graphicId || 'none'}`)
      const response = await apiClient.get<FfiApiResponse<any>>(url)
      const result = handleApiResponse(response)
      console.log('✅ FFI API ffiGetEntries completed:', result)
      return result
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get entries'
      error.value = errorMsg
      console.error('❌ FFI API ffiGetEntries error:', errorMsg)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // FFI GetSelectedDeviceInfo - Action 12 (replaces WebSocket GetSelectedDeviceInfo)
  const ffiGetSelectedDeviceInfo = async (panelId: number): Promise<any> => {
    isLoading.value = true
    error.value = null

    try {
      console.log(`🔄 FFI API ffiGetSelectedDeviceInfo started for panel ${panelId}`)
      const response = await apiClient.get<FfiApiResponse<any>>(`/api/t3000/ffi/device-info/${panelId}`)
      const result = handleApiResponse(response)
      console.log('✅ FFI API ffiGetSelectedDeviceInfo completed:', result)
      return result
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get device info'
      error.value = errorMsg
      console.error('❌ FFI API ffiGetSelectedDeviceInfo error:', errorMsg)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Computed properties
  const hasError = computed(() => error.value !== null)
  const isReady = computed(() => !isLoading.value && !hasError.value)

  // Clear error
  const clearError = () => {
    error.value = null
  }

  return {
    // State
    isLoading: computed(() => isLoading.value),
    error: computed(() => error.value),
    hasError,
    isReady,
    lastResponse: computed(() => lastResponse.value),

    // Methods - Original API methods
    getAllDevices,
    getDeviceById,
    getDevicePoints,
    getDevicePointsByType,
    getDeviceTrendLogs,
    getTrendLogData,
    getRealtimeData,
    getDeviceRealtimeData,
    getSystemStatus,
    refreshAllData,
    clearError,

    // NEW: Direct FFI methods that match WebSocket operations
    ffiGetPanelsList,      // Action 4 - GET_PANELS_LIST
    ffiGetPanelData,       // Action 0 - GET_PANEL_DATA
    ffiGetInitialData,     // Action 1 - GET_INITIAL_DATA
    ffiGetEntries,         // Action 6 - GET_ENTRIES
    ffiGetSelectedDeviceInfo, // Action 12 - GET_SELECTED_DEVICE_INFO
  }
}
