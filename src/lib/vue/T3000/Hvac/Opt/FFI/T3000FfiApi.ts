// T3000 FFI API Service - TypeScript layer for message formatting and response handling
// This handles all WebSocket-compatible message creation and response parsing
// - Creates same JSON structure as WebSocket client for compatibility
// - Handles HTTP retry patterns and error management
// - Easy switching between WebSocket and FFI API modes

import { ref, computed } from 'vue'
import axios, { AxiosError } from 'axios'

// Import WebSocket client dependencies for message compatibility
import MessageType from '../Socket/MessageType'
import Utils1 from '../../Util/Utils1'
import { T3000_Data } from '../../Data/T3Data'

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
  const isReady = ref(true) // FFI API is always ready if server is running

  // Dynamic API base URL - matches React implementation
  const getApiBaseUrl = (): string => {
    if (typeof window !== 'undefined') {
      const protocol = window.location.protocol // http: or https:
      const hostname = window.location.hostname // localhost, 192.168.x.x, etc.
      return `${protocol}//${hostname}:9103`
    }
    // Fallback for SSR or build time
    return 'http://localhost:9103'
  }

  // Configuration
  const apiConfig = {
    // Dynamic baseURL - works on any IP address (localhost, 192.168.x.x, etc.)
    baseURL: getApiBaseUrl(),
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000
  }

  // Create WebSocket-compatible message payload
  const createMessagePayload = (action: number, panelId?: number, viewitem?: number, data?: any) => {
    const message: any = {
      action,
      msgId: Utils1.GenerateUUID()
    }

    if (panelId !== null && panelId !== undefined) {
      message.panelId = panelId
      // Get serial number for panel (use panelId as fallback)
      try {
        const panelsList = T3000_Data.value.panelsList as any[] || []
        const panelData = panelsList.find((p: any) =>
          p.panel_number === panelId ||
          p.panel_id === panelId ||
          p.id === panelId
        )
        message.serialNumber = panelData?.serial_number || panelData?.panel_serial_number || panelId
      } catch {
        message.serialNumber = panelId
      }
    }

    if (viewitem !== null && viewitem !== undefined) {
      // Convert to 0-based index like WebSocket client
      message.viewitem = viewitem > 0 ? viewitem - 1 : -1
    }

    if (data !== null && data !== undefined) {
      message.data = data
    }

    // C++ expects flat JSON structure with action at top level (not nested)
    // Add 'from' field for debugging/logging
    return {
      ...message,
      from: 'ffi_api'
    }
  }

  // Simple HTTP call to FFI middleware
  const callFfiApi = async (payload: any): Promise<any> => {
    try {
      const response = await axios.post(`${apiConfig.baseURL}/api/t3000/ffi/call`, payload, {
        timeout: apiConfig.timeout,
        headers: {
          'Content-Type': 'application/json'
        }
      })
      return response.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`FFI API call failed: ${error.response?.data?.error || error.message}`)
      }
      throw error
    }
  }

  // HTTP retry wrapper
  const callWithRetry = async (payload: any): Promise<any> => {
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= apiConfig.retryAttempts; attempt++) {
      try {
        return await callFfiApi(payload)
      } catch (error) {
        lastError = error as Error
        if (attempt < apiConfig.retryAttempts) {
          await new Promise(resolve => setTimeout(resolve, apiConfig.retryDelay))
        }
      }
    }

    throw lastError
  }

  // WebSocket-compatible FFI API methods

  /// GetPanelsList - Action 4 (same as WebSocket)
  const ffiGetPanelsList = async (): Promise<any> => {
    isLoading.value = true
    error.value = null

    try {
      const payload = createMessagePayload(MessageType.GET_PANELS_LIST)
      LogUtil.Debug('📡 FFI API Call - Action 4 (GET_PANELS_LIST)', {
        action: 4,
        msgId: payload.msgId,
        timestamp: new Date().toISOString(),
        payload
      })
      const response = await callWithRetry(payload)
      LogUtil.Debug('✅ FFI API Response - Action 4 (GET_PANELS_LIST)', response)
      lastResponse.value = response
      return response
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      error.value = errorMessage
      throw new Error(`GetPanelsList failed: ${errorMessage}`)
    } finally {
      isLoading.value = false
    }
  }

  /// GetPanelData - Action 0 (same as WebSocket)
  const ffiGetPanelData = async (panelId: number): Promise<any> => {
    isLoading.value = true
    error.value = null

    try {
      const payload = createMessagePayload(MessageType.GET_PANEL_DATA, panelId)
      LogUtil.Debug('📡 FFI API Call - Action 0 (GET_PANEL_DATA)', {
        action: 0,
        panelId,
        serialNumber: payload.serialNumber,
        msgId: payload.msgId,
        timestamp: new Date().toISOString(),
        payload
      })
      const response = await callWithRetry(payload)
      LogUtil.Debug('✅ FFI API Response - Action 0 (GET_PANEL_DATA)', response)
      lastResponse.value = response
      return response
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      error.value = errorMessage
      throw new Error(`GetPanelData failed: ${errorMessage}`)
    } finally {
      isLoading.value = false
    }
  }

  /// GetInitialData - Action 1 (same as WebSocket)
  const ffiGetInitialData = async (panelId: number, graphicId?: number): Promise<any> => {
    isLoading.value = true
    error.value = null

    try {
      const payload = createMessagePayload(MessageType.GET_INITIAL_DATA, panelId, graphicId)
      LogUtil.Debug('📡 FFI API Call - Action 1 (GET_INITIAL_DATA)', {
        action: 1,
        panelId,
        graphicId,
        serialNumber: payload.serialNumber,
        msgId: payload.msgId,
        timestamp: new Date().toISOString(),
        payload
      })
      const response = await callWithRetry(payload)
      LogUtil.Debug('✅ FFI API Response - Action 1 (GET_INITIAL_DATA)', response)
      lastResponse.value = response
      return response
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      error.value = errorMessage
      throw new Error(`GetInitialData failed: ${errorMessage}`)
    } finally {
      isLoading.value = false
    }
  }

  /// GetEntries - Action 6 (same as WebSocket)
  const ffiGetEntries = async (panelId: number, graphicId?: number): Promise<any> => {
    isLoading.value = true
    error.value = null

    try {
      const payload = createMessagePayload(MessageType.GET_ENTRIES, panelId, graphicId)
      LogUtil.Debug('📡 FFI API Call - Action 6 (GET_ENTRIES)', {
        action: 6,
        panelId,
        graphicId,
        serialNumber: payload.serialNumber,
        msgId: payload.msgId,
        timestamp: new Date().toISOString(),
        payload
      })
      const response = await callWithRetry(payload)
      LogUtil.Debug('✅ FFI API Response - Action 6 (GET_ENTRIES)', response)
      lastResponse.value = response
      return response
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      error.value = errorMessage
      throw new Error(`GetEntries failed: ${errorMessage}`)
    } finally {
      isLoading.value = false
    }
  }

  /// GetSelectedDeviceInfo - Action 12 (same as WebSocket)
  const ffiGetSelectedDeviceInfo = async (panelId: number): Promise<any> => {
    isLoading.value = true
    error.value = null

    try {
      const payload = createMessagePayload(MessageType.GET_SELECTED_DEVICE_INFO, panelId)
      LogUtil.Debug('📡 FFI API Call - Action 12 (GET_SELECTED_DEVICE_INFO)', {
        action: 12,
        panelId,
        serialNumber: payload.serialNumber,
        msgId: payload.msgId,
        timestamp: new Date().toISOString(),
        payload
      })
      const response = await callWithRetry(payload)
      LogUtil.Debug('✅ FFI API Response - Action 12 (GET_SELECTED_DEVICE_INFO)', response)
      lastResponse.value = response
      return response
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      error.value = errorMessage
      throw new Error(`GetSelectedDeviceInfo failed: ${errorMessage}`)
    } finally {
      isLoading.value = false
    }
  }

  /// GetLoggingData - Action 15 (LOGGING_DATA - gets all inputs, outputs, variables)
  const ffiGetLoggingData = async (panelId: number, serialNumber: number): Promise<any> => {
    isLoading.value = true
    error.value = null

    try {
      // LOGGING_DATA requires both panelId and serialNumber per C++ code:
      // int temp_panel_id = json.get("panelId", Json::nullValue).asInt();
      // int temp_serial_number = json.get("serialNumber", Json::nullValue).asInt();
      const payload = createMessagePayload(MessageType.LOGGING_DATA, panelId, null, null)
      payload.serialNumber = serialNumber
      LogUtil.Debug('📡 FFI API Call - Action 15 (LOGGING_DATA)', {
        action: 15,
        panelId,
        serialNumber,
        msgId: payload.msgId,
        timestamp: new Date().toISOString(),
        payload
      })
      const response = await callWithRetry(payload)
      LogUtil.Debug('✅ FFI API Response - Action 15 (LOGGING_DATA)', response)
      lastResponse.value = response
      return response
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      error.value = errorMessage
      throw new Error(`GetLoggingData failed: ${errorMessage}`)
    } finally {
      isLoading.value = false
    }
  }

  /// GetSystemStatus - Health check for FFI service
  const getSystemStatus = async (): Promise<any> => {
    try {
      // Simple health check - try to get panels list with short timeout
      const healthCheckConfig = {
        timeout: 5000, // 5 second timeout for health check
        headers: { 'Content-Type': 'application/json' }
      }

      const payload = createMessagePayload(MessageType.GET_PANELS_LIST)
      const response = await axios.post(`${apiConfig.baseURL}/api/t3000/ffi/call`, payload, healthCheckConfig)

      return {
        status: 'running',
        timestamp: new Date().toISOString(),
        service: 'FFI API',
        version: '1.0.0'
      }
    } catch (err) {
      return {
        status: 'offline',
        timestamp: new Date().toISOString(),
        service: 'FFI API',
        error: err instanceof Error ? err.message : 'Unknown error'
      }
    }
  }

  /// Additional WebSocket-compatible methods expected by Vue components

  /// GetDeviceRealtimeData - Alias for GetPanelData for compatibility
  const getDeviceRealtimeData = async (panelId: number): Promise<any> => {
    return await ffiGetPanelData(panelId)
  }

  /// GetDeviceById - Alias for GetPanelData for compatibility
  const getDeviceById = async (panelId: number): Promise<any> => {
    return await ffiGetPanelData(panelId)
  }

  /// RefreshAllData - Refresh all panel data for compatibility
  const refreshAllData = async (): Promise<any> => {
    try {
      // First get the panels list, then refresh each panel
      const panelsResponse = await ffiGetPanelsList()
      const panels = panelsResponse?.data?.panels || []

      const refreshPromises = panels.map((panel: any) =>
        ffiGetPanelData(panel.panel_id || panel.id)
      )

      const results = await Promise.allSettled(refreshPromises)
      return {
        status: 'success',
        refreshed: results.length,
        timestamp: new Date().toISOString()
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      error.value = errorMessage
      throw new Error(`RefreshAllData failed: ${errorMessage}`)
    }
  }

  // Return all methods and state
  return {
    // State
    isLoading: computed(() => isLoading.value),
    error: computed(() => error.value),
    hasError: computed(() => error.value !== null),
    isReady: computed(() => isReady.value),
    lastResponse: computed(() => lastResponse.value),

    // WebSocket-compatible methods
    ffiGetPanelsList,
    ffiGetPanelData,
    ffiGetInitialData,
    ffiGetEntries,
    ffiGetSelectedDeviceInfo,
    ffiGetLoggingData,
    getSystemStatus,
    getDeviceRealtimeData,
    getDeviceById,
    refreshAllData,

    // Utility methods
    clearError: () => { error.value = null },
    clearResponse: () => { lastResponse.value = null }
  }
}
