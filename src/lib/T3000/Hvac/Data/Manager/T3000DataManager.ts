/**
 * T3000 Data Manager - Generic panel data management system
 *
 * Features:
 * - Data flow tracking
 * - Data readiness validation
 * - Promise-based data access
 * - Loading state management
 *
 * Purpose: Generic data manager for panel data with flow tracking
 */

import { ref, watch } from 'vue'
import { T3000_Data } from '../T3Data'
import LogUtil from '../../Util/LogUtil'

// Data readiness states
export enum DataReadiness {
  NOT_INITIALIZED = 'NOT_INITIALIZED',
  LOADING = 'LOADING',
  READY = 'READY',
  ERROR = 'ERROR'
}

// Data flow tracking
export interface DataFlowInfo {
  timestamp: number
  action: 'INIT' | 'UPDATE' | 'CLEAR'
  entryCount: number
  source?: string
  details?: any
}

// Data validation results
export interface DataValidationResult {
  isValid: boolean
  timestamp: number
  panelsCount: number
  entriesCount: number
}

// Data request options
export interface DataRequestOptions {
  timeout?: number
  retryAttempts?: number
  specificEntries?: string[]
}

class T3000DataManager {
  // State tracking
  private dataReadiness = ref<DataReadiness>(DataReadiness.NOT_INITIALIZED)
  private lastUpdateTime = ref<number>(0)
  private pendingRequests = new Map<string, { resolve: Function, reject: Function, timeout: NodeJS.Timeout }>()
  private dataFlowHistory: DataFlowInfo[] = []

  // Configuration
  private readonly DEFAULT_TIMEOUT = 30000
  private readonly MAX_RETRY_ATTEMPTS = 3
  private readonly MAX_HISTORY = 50

  constructor() {
    this.initializeManager()
  }

  /**
   * Initialize the data manager with watchers
   */
  private initializeManager(): void {
    // Track initial state
    this.trackDataFlow('INIT', T3000_Data.value.panelsData?.length || 0)

    // Watch for T3000_Data changes
    watch(() => T3000_Data.value.panelsData, (newData, oldData) => {
      this.handlePanelsDataChange(newData, oldData)
    }, { deep: true })

    watch(() => T3000_Data.value.loadingPanel, (newValue, oldValue) => {
      this.handleLoadingStateChange(newValue, oldValue)
    })

    // Initial state assessment
    this.assessCurrentDataState()
  }

  /**
   * Track data flow changes
   */
  private trackDataFlow(action: DataFlowInfo['action'], entryCount: number, source?: string, details?: any): void {
    const flowInfo: DataFlowInfo = {
      timestamp: Date.now(),
      action,
      entryCount,
      source,
      details
    }

    this.dataFlowHistory.push(flowInfo)

    // Keep history size manageable
    if (this.dataFlowHistory.length > this.MAX_HISTORY) {
      this.dataFlowHistory.shift()
    }
  }

  /**
   * Handle changes to panelsData
   */
  private handlePanelsDataChange(newData: any[], oldData: any[]): void {
    const timestamp = Date.now()
    this.lastUpdateTime.value = timestamp

    const newCount = newData?.length || 0
    const oldCount = oldData?.length || 0

    // Track the data flow
    this.trackDataFlow('UPDATE', newCount, this.detectChangeSource(), {
      previousCount: oldCount,
      countDelta: newCount - oldCount
    })

    // Check if data is now ready
    if (this.isDataComplete(newData)) {
      this.setDataReadiness(DataReadiness.READY)
      this.resolvePendingRequests()
    }
  }

  /**
   * Detect the source of data changes using stack trace
   */
  private detectChangeSource(): string {
    try {
      const stack = new Error().stack
      if (!stack) return 'unknown'

      if (stack.includes('WebViewClient')) return 'WebViewClient'
      if (stack.includes('WebSocketClient')) return 'WebSocketClient'
      if (stack.includes('IndexPage')) return 'IndexPage'
      if (stack.includes('demoDeviceData')) return 'DemoData'

      return 'unknown'
    } catch {
      return 'unknown'
    }
  }

  /**
   * Handle loading state changes
   */
  private handleLoadingStateChange(newValue: any, oldValue: any): void {
    if (newValue !== null && oldValue === null) {
      // Loading started
      this.setDataReadiness(DataReadiness.LOADING)
    } else if (newValue === null && oldValue !== null) {
      // Loading completed
      if (this.isDataComplete(T3000_Data.value.panelsData)) {
        this.setDataReadiness(DataReadiness.READY)
      }
    }
  }

  /**
   * Set data readiness state and notify listeners
   */
  private setDataReadiness(state: DataReadiness): void {
    const previousState = this.dataReadiness.value
    this.dataReadiness.value = state

    if (state === DataReadiness.READY) {
      this.resolvePendingRequests()
    } else if (state === DataReadiness.ERROR) {
      this.rejectPendingRequests('Data loading failed')
    }
  }

  /**
   * Check if current data is complete and valid
   */
  private isDataComplete(panelsData: any[]): boolean {
    if (!panelsData || !Array.isArray(panelsData)) {
      return false
    }

    const hasData = panelsData.length > 0
    const hasLoadingCompleted = T3000_Data.value.loadingPanel === null

    return hasData && hasLoadingCompleted
  }

  /**
   * Assess current data state on initialization
   */
  private assessCurrentDataState(): void {
    const panelsData = T3000_Data.value.panelsData
    const loadingPanel = T3000_Data.value.loadingPanel

    if (loadingPanel !== null) {
      this.setDataReadiness(DataReadiness.LOADING)
    } else if (this.isDataComplete(panelsData)) {
      this.setDataReadiness(DataReadiness.READY)
    } else {
      this.setDataReadiness(DataReadiness.NOT_INITIALIZED)
    }
  }

  /**
   * Wait for data to be ready with timeout
   */
  public async waitForDataReady(options: DataRequestOptions = {}): Promise<DataValidationResult> {
    const {
      timeout = this.DEFAULT_TIMEOUT,
      retryAttempts = this.MAX_RETRY_ATTEMPTS,
      specificEntries = []
    } = options

    // Check if data is already ready
    if (this.dataReadiness.value === DataReadiness.READY) {
      const validation = await this.validateData(specificEntries)
      if (validation.isValid) {
        return validation
      }
    }

    // Create promise for data readiness
    return new Promise((resolve, reject) => {
      const requestId = `req_${Date.now()}_${Math.random()}`

      const timeoutHandle = setTimeout(() => {
        this.pendingRequests.delete(requestId)
        reject(new Error(`Data not ready within ${timeout}ms timeout`))
      }, timeout)

      this.pendingRequests.set(requestId, {
        resolve: async () => {
          clearTimeout(timeoutHandle)
          this.pendingRequests.delete(requestId)

          try {
            const validation = await this.validateData(specificEntries)
            resolve(validation)
          } catch (error) {
            reject(error)
          }
        },
        reject: (error: string) => {
          clearTimeout(timeoutHandle)
          this.pendingRequests.delete(requestId)
          reject(new Error(error))
        },
        timeout: timeoutHandle
      })
    })
  }

  /**
   * Validate data quality and completeness
   */
  public async validateData(specificEntries: string[] = []): Promise<DataValidationResult> {
    const panelsData = T3000_Data.value.panelsData || []
    const timestamp = Date.now()

    // Basic data structure validation
    if (!Array.isArray(panelsData)) {
      return {
        isValid: false,
        timestamp,
        panelsCount: 0,
        entriesCount: 0
      }
    }

    // Check for specific entries if requested
    let allFound = true
    if (specificEntries.length > 0) {
      for (const entryId of specificEntries) {
        const found = panelsData.find(entry =>
          entry.id === entryId ||
          entry.label === entryId ||
          entry.description?.includes(entryId)
        )
        if (!found) {
          allFound = false
          break
        }
      }
    }

    return {
      isValid: allFound && panelsData.length > 0,
      timestamp,
      panelsCount: T3000_Data.value.panelsList?.length || 0,
      entriesCount: panelsData.length
    }
  }

  /**
   * Get specific entry from panelsData with validation
   */
  public async getEntry(entryId: string, options: DataRequestOptions = {}): Promise<any> {
    const validation = await this.waitForDataReady({
      ...options,
      specificEntries: [entryId]
    })

    if (!validation.isValid) {
      throw new Error(`Entry ${entryId} not available or invalid`)
    }

    const panelsData = T3000_Data.value.panelsData
    const entry = panelsData.find(item =>
      item.id === entryId ||
      item.label === entryId ||
      item.description?.includes(entryId)
    )

    if (!entry) {
      throw new Error(`Entry ${entryId} not found in panelsData`)
    }

    return entry
  }

  /**
   * Get specific entry from panelsData with PID filtering and validation
   */
  public async getEntryByPid(entryId: string, pid: number, options: DataRequestOptions = {}): Promise<any> {
    const validation = await this.waitForDataReady({
      ...options,
      specificEntries: [entryId]
    })

    if (!validation.isValid) {
      throw new Error(`Entry ${entryId} not available or invalid`)
    }

    // Filter by PID first, then find the entry
    const panelsData = T3000_Data.value.panelsData
    const pidFilteredData = panelsData.filter(item => item.pid === pid)

    if (pidFilteredData.length === 0) {
      throw new Error(`No entries found with PID ${pid}`)
    }

    const entry = pidFilteredData.find(item =>
      item.id === entryId ||
      item.label === entryId ||
      item.description?.includes(entryId)
    )

    if (!entry) {
      throw new Error(`Entry ${entryId} not found in PID ${pid} filtered data`)
    }

    return entry
  }

  /**
   * Get entries matching a pattern or filter
   */
  public async getEntriesMatching(filter: (entry: any) => boolean, options: DataRequestOptions = {}): Promise<any[]> {
    const validation = await this.waitForDataReady(options)

    if (!validation.isValid) {
      throw new Error('Data not available for filtering')
    }

    const panelsData = T3000_Data.value.panelsData
    return panelsData.filter(filter)
  }

  /**
   * Resolve all pending data requests
   */
  private resolvePendingRequests(): void {
    this.pendingRequests.forEach((request) => {
      request.resolve()
    })
    this.pendingRequests.clear()
  }

  /**
   * Reject all pending data requests
   */
  private rejectPendingRequests(reason: string): void {
    this.pendingRequests.forEach((request) => {
      request.reject(reason)
    })
    this.pendingRequests.clear()
  }

  /**
   * Get data flow history
   */
  public getDataFlowHistory(): DataFlowInfo[] {
    return [...this.dataFlowHistory]
  }

  /**
   * Get current data state info
   */
  public getDataStateInfo() {
    const panelsData = T3000_Data.value.panelsData || []

    return {
      readiness: this.dataReadiness.value,
      entryCount: panelsData.length,
      panelCount: T3000_Data.value.panelsList?.length || 0,
      lastUpdate: this.lastUpdateTime.value,
      isLoading: T3000_Data.value.loadingPanel !== null,
      pendingRequests: this.pendingRequests.size
    }
  }

  /**
   * Get current readiness state
   */
  public getReadinessState(): DataReadiness {
    return this.dataReadiness.value
  }

  /**
   * Check if data is ready
   */
  public get isReady(): boolean {
    return this.dataReadiness.value === DataReadiness.READY
  }

  /**
   * Get loading progress if applicable
   */
  public get loadingProgress(): number {
    const loadingPanel = T3000_Data.value.loadingPanel
    const totalPanels = T3000_Data.value.panelsList?.length || 0

    if (loadingPanel === null || totalPanels === 0) {
      return 100
    }

    return Math.round(((loadingPanel + 1) / totalPanels) * 100)
  }

  /**
   * Clear data flow history
   */
  public clearDataFlowHistory(): void {
    this.dataFlowHistory = []
  }

  /**
   * Force refresh data state
   */
  public forceRefresh(): void {
    this.assessCurrentDataState()
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    // Clear all pending requests
    this.rejectPendingRequests('Manager destroyed')

    // Clear history
    this.dataFlowHistory = []

    // Reset state
    this.dataReadiness.value = DataReadiness.NOT_INITIALIZED
  }
}

// Create singleton instance
export const t3000DataManager = new T3000DataManager()
