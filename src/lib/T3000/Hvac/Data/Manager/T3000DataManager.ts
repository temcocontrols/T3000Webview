/**
 * T3000 Data Manager - Enhanced data management system for reliable T3000_Data handling
 *
 * Features:
 * - Data readiness validation
 * - Race condition prevention
 * - Loading state management
 * - Data freshness tracking
 * - Promise-based data access
 * - Comprehensive logging
 *
 * Created: 2025-07-24
 * Purpose: Fix TimeSeriesModal data access issues and ensure reliable data flow
 */

import { ref, computed, watch, nextTick } from 'vue'
import { T3000_Data } from '../T3Data'
import LogUtil from '../../Util/LogUtil'

// Data readiness states
export enum DataReadiness {
  NOT_INITIALIZED = 'NOT_INITIALIZED',
  LOADING_PANELS = 'LOADING_PANELS',
  LOADING_DATA = 'LOADING_DATA',
  READY = 'READY',
  ERROR = 'ERROR'
}

// Data validation results
export interface DataValidationResult {
  isValid: boolean
  missingData: string[]
  staleData: string[]
  timestamp: number
  panelsCount: number
  entriesCount: number
}

// Data request options
export interface DataRequestOptions {
  timeout?: number
  retryAttempts?: number
  requireFresh?: boolean
  specificEntries?: string[]
}

class T3000DataManager {
  // State tracking
  private dataReadiness = ref<DataReadiness>(DataReadiness.NOT_INITIALIZED)
  private loadingStartTime = ref<number | null>(null)
  private lastUpdateTime = ref<number>(0)
  private pendingRequests = new Map<string, { resolve: Function, reject: Function, timeout: NodeJS.Timeout }>()

  // Data validation cache
  private validationCache = new Map<string, DataValidationResult>()
  private readonly CACHE_DURATION = 30000 // 30 seconds

  // Configuration
  private readonly DEFAULT_TIMEOUT = 15000 // 15 seconds
  private readonly MAX_RETRY_ATTEMPTS = 3
  private readonly STALE_DATA_THRESHOLD = 60000 // 1 minute

  constructor() {
    this.initializeManager()
  }

  /**
   * Initialize the data manager with watchers and validation
   */
  private initializeManager(): void {
    LogUtil.Info('🚀 T3000DataManager: Initializing enhanced data management system')

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
   * Handle changes to panelsData
   */
  private handlePanelsDataChange(newData: any[], oldData: any[]): void {
    const timestamp = Date.now()
    this.lastUpdateTime.value = timestamp

    LogUtil.Info('🔄 T3000DataManager: ===== PANELS DATA CHANGE ANALYSIS =====')
    LogUtil.Info(`📊 T3000DataManager: PanelsData changed - New: ${newData?.length || 0}, Old: ${oldData?.length || 0}`)

    // Track where this change came from using stack trace
    LogUtil.Info('🔍 CHANGE SOURCE ANALYSIS:')
    try {
      const stack = new Error().stack
      const stackLines = stack?.split('\n') || []
      LogUtil.Info('   📍 CALL STACK (where the change originated):')
      stackLines.slice(1, 10).forEach((line, index) => {
        LogUtil.Info(`      ${index + 1}. ${line.trim()}`)
      })

      // Check if change came from known sources
      const isFromWebView = stack?.includes('WebViewClient')
      const isFromWebSocket = stack?.includes('WebSocketClient')
      const isFromIndexPage = stack?.includes('IndexPage')

      LogUtil.Info(`   🏷️ CHANGE SOURCE CLASSIFICATION:`)
      LogUtil.Info(`      - From WebViewClient: ${isFromWebView}`)
      LogUtil.Info(`      - From WebSocketClient: ${isFromWebSocket}`)
      LogUtil.Info(`      - From IndexPage: ${isFromIndexPage}`)

      if (isFromWebView) {
        LogUtil.Info('   🔄 DETECTED: Data replacement from WebViewClient (filter + concat pattern)')
      } else if (isFromWebSocket) {
        LogUtil.Info('   🔄 DETECTED: Data replacement from WebSocketClient (filter + concat pattern)')
      } else if (isFromIndexPage) {
        LogUtil.Info('   🔄 DETECTED: Data replacement from IndexPage (direct assignment)')
      } else {
        LogUtil.Info('   ❓ UNKNOWN SOURCE: Change came from unknown location')
      }
    } catch (error) {
      LogUtil.Warn('   ⚠️ Could not determine change source:', error)
    }

    // Log detailed before state
    LogUtil.Info('📋 BEFORE CHANGE - Old Data Analysis:')
    if (oldData && Array.isArray(oldData)) {
      LogUtil.Info(`   - Total entries: ${oldData.length}`)
      LogUtil.Info(`   - FULL OLD DATA DETAILS:`)

      // Print all entries with full details
      // oldData.forEach((entry, index) => {
      //   LogUtil.Info(`     [${index}] Entry:`, {
      //     id: entry?.id,
      //     label: entry?.label,
      //     description: entry?.description,
      //     value: entry?.value,
      //     pid: entry?.pid,
      //     type: entry?.type,
      //     unit: entry?.unit,
      //     status: entry?.status,
      //     timestamp: entry?.timestamp,
      //     lastUpdate: entry?.lastUpdate,
      //     // Include any other properties that might exist
      //     ...entry
      //   })
      // })

      // Check for critical entries in old data
      const oldCriticalEntries = this.findCriticalEntries(oldData)
      LogUtil.Info(`   - Critical entries found: ${oldCriticalEntries.length}`, oldCriticalEntries)

      // Additional detailed analysis
      LogUtil.Info(`   - OLD DATA STRUCTURE ANALYSIS:`)
      LogUtil.Info(`     - Entries with values: ${oldData.filter(entry => entry?.value !== undefined).length}`)
      LogUtil.Info(`     - Entries with descriptions: ${oldData.filter(entry => entry?.description).length}`)
      LogUtil.Info(`     - Unique PIDs: ${Array.from(new Set(oldData.map(entry => entry?.pid))).filter(Boolean).length}`)
      LogUtil.Info(`     - Unique types:`, Array.from(new Set(oldData.map(entry => entry?.type))).filter(Boolean))
    } else {
      LogUtil.Info('   - Old data: null or not array')
    }

    // Log detailed after state
    LogUtil.Info('📋 AFTER CHANGE - New Data Analysis:')
    if (newData && Array.isArray(newData)) {
      LogUtil.Info(`   - Total entries: ${newData.length}`)
      LogUtil.Info(`   - FULL NEW DATA DETAILS:`)

      // Print all entries with full details
      // newData.forEach((entry, index) => {
      //   LogUtil.Info(`     [${index}] Entry:`, {
      //     id: entry?.id,
      //     label: entry?.label,
      //     description: entry?.description,
      //     value: entry?.value,
      //     pid: entry?.pid,
      //     type: entry?.type,
      //     unit: entry?.unit,
      //     status: entry?.status,
      //     timestamp: entry?.timestamp,
      //     lastUpdate: entry?.lastUpdate,
      //     // Include any other properties that might exist
      //     ...entry
      //   })
      // })

      // Check for critical entries in new data
      const newCriticalEntries = this.findCriticalEntries(newData)
      LogUtil.Info(`   - Critical entries found: ${newCriticalEntries.length}`, newCriticalEntries)

      // Additional detailed analysis
      LogUtil.Info(`   - NEW DATA STRUCTURE ANALYSIS:`)
      LogUtil.Info(`     - Entries with values: ${newData.filter(entry => entry?.value !== undefined).length}`)
      LogUtil.Info(`     - Entries with descriptions: ${newData.filter(entry => entry?.description).length}`)
      LogUtil.Info(`     - Unique PIDs: ${Array.from(new Set(newData.map(entry => entry?.pid))).filter(Boolean).length}`)
      LogUtil.Info(`     - Unique types:`, Array.from(new Set(newData.map(entry => entry?.type))).filter(Boolean))
    } else {
      LogUtil.Info('   - New data: null or not array')
    }

    // Analyze the merging/change process
    LogUtil.Info('🔄 MERGING ANALYSIS:')
    this.analyzeMergingProcess(oldData, newData)

    // Log final T3000_Data state
    LogUtil.Info('📋 FINAL STATE - Current T3000_Data:')
    const currentPanelsData = T3000_Data.value.panelsData
    LogUtil.Info(`   - Current T3000_Data.panelsData length: ${currentPanelsData?.length || 0}`)
    if (currentPanelsData && Array.isArray(currentPanelsData)) {
      LogUtil.Info(`   - FULL FINAL DATA DETAILS:`)

      // Print all current entries with full details
      // currentPanelsData.forEach((entry, index) => {
      //   LogUtil.Info(`     [${index}] Final Entry:`, {
      //     id: entry?.id,
      //     label: entry?.label,
      //     description: entry?.description,
      //     value: entry?.value,
      //     pid: entry?.pid,
      //     type: entry?.type,
      //     unit: entry?.unit,
      //     status: entry?.status,
      //     timestamp: entry?.timestamp,
      //     lastUpdate: entry?.lastUpdate,
      //     // Include any other properties that might exist
      //     ...entry
      //   })
      // })

      const currentCriticalEntries = this.findCriticalEntries(currentPanelsData)
      LogUtil.Info(`   - Current critical entries: ${currentCriticalEntries.length}`, currentCriticalEntries)

      // Final state analysis
      LogUtil.Info(`   - FINAL DATA STRUCTURE ANALYSIS:`)
      LogUtil.Info(`     - Entries with values: ${currentPanelsData.filter(entry => entry?.value !== undefined).length}`)
      LogUtil.Info(`     - Entries with descriptions: ${currentPanelsData.filter(entry => entry?.description).length}`)
      LogUtil.Info(`     - Unique PIDs: ${Array.from(new Set(currentPanelsData.map(entry => entry?.pid))).filter(Boolean).length}`)
      LogUtil.Info(`     - Unique types:`, Array.from(new Set(currentPanelsData.map(entry => entry?.type))).filter(Boolean))
    }

    LogUtil.Info('🔄 T3000DataManager: ===== END PANELS DATA CHANGE ANALYSIS =====')

    // Clear validation cache on data change
    this.validationCache.clear()

    // Check if data is now ready
    if (this.isDataComplete(newData)) {
      this.setDataReadiness(DataReadiness.READY)
      this.resolvePendingRequests()
    }

    // Log data quality metrics
    this.logDataQualityMetrics(newData)
  }

  /**
   * Handle loading state changes
   */
  private handleLoadingStateChange(newValue: any, oldValue: any): void {
    LogUtil.Debug(`⏳ T3000DataManager: Loading state changed - New: ${newValue}, Old: ${oldValue}`)

    if (newValue !== null && oldValue === null) {
      // Loading started
      this.loadingStartTime.value = Date.now()
      this.setDataReadiness(DataReadiness.LOADING_PANELS)
    } else if (newValue === null && oldValue !== null) {
      // Loading completed
      const loadingDuration = this.loadingStartTime.value ? Date.now() - this.loadingStartTime.value : 0
      LogUtil.Info(`✅ T3000DataManager: Panel loading completed in ${loadingDuration}ms`)
      this.loadingStartTime.value = null

      // Check if data is ready
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

    LogUtil.Info(`🔄 T3000DataManager: Data readiness changed from ${previousState} to ${state}`)

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

    // Basic completeness check
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

    LogUtil.Info('🔍 T3000DataManager: Assessing current data state')
    LogUtil.Debug(`📊 Current state - PanelsData: ${panelsData?.length || 0} entries, Loading: ${loadingPanel}`)

    if (loadingPanel !== null) {
      this.setDataReadiness(DataReadiness.LOADING_PANELS)
    } else if (this.isDataComplete(panelsData)) {
      this.setDataReadiness(DataReadiness.READY)
    } else {
      this.setDataReadiness(DataReadiness.NOT_INITIALIZED)
    }
  }

  /**
   * Wait for data to be ready with timeout and retry logic
   */
  public async waitForDataReady(options: DataRequestOptions = {}): Promise<DataValidationResult> {
    const {
      timeout = this.DEFAULT_TIMEOUT,
      retryAttempts = this.MAX_RETRY_ATTEMPTS,
      requireFresh = false,
      specificEntries = []
    } = options

    LogUtil.Info(`⏱️ T3000DataManager: Waiting for data readiness (timeout: ${timeout}ms, retries: ${retryAttempts})`)

    // Check if data is already ready
    if (this.dataReadiness.value === DataReadiness.READY) {
      const validation = await this.validateData(specificEntries, requireFresh)
      if (validation.isValid) {
        LogUtil.Info('✅ T3000DataManager: Data already ready and valid')
        return validation
      }
    }

    // Create promise for data readiness
    return new Promise((resolve, reject) => {
      const requestId = `req_${Date.now()}_${Math.random()}`

      const timeoutHandle = setTimeout(() => {
        this.pendingRequests.delete(requestId)
        LogUtil.Warn(`⚠️ T3000DataManager: Data request timed out after ${timeout}ms`)
        reject(new Error(`Data not ready within ${timeout}ms timeout`))
      }, timeout)

      this.pendingRequests.set(requestId, {
        resolve: async () => {
          clearTimeout(timeoutHandle)
          this.pendingRequests.delete(requestId)

          try {
            const validation = await this.validateData(specificEntries, requireFresh)
            LogUtil.Info('✅ T3000DataManager: Data readiness request resolved')
            resolve(validation)
          } catch (error) {
            LogUtil.Error('❌ T3000DataManager: Data validation failed:', error)
            reject(error)
          }
        },
        reject: (error: string) => {
          clearTimeout(timeoutHandle)
          this.pendingRequests.delete(requestId)
          LogUtil.Error('❌ T3000DataManager: Data readiness request rejected:', error)
          reject(new Error(error))
        },
        timeout: timeoutHandle
      })

      LogUtil.Debug(`📝 T3000DataManager: Created data request ${requestId}`)
    })
  }

  /**
   * Validate data quality and completeness
   */
  public async validateData(specificEntries: string[] = [], requireFresh: boolean = false): Promise<DataValidationResult> {
    const cacheKey = `${specificEntries.join(',')}_${requireFresh}`
    const cached = this.validationCache.get(cacheKey)

    // Return cached result if valid
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
      LogUtil.Debug('📋 T3000DataManager: Returning cached validation result')
      return cached
    }

    LogUtil.Info('🔍 T3000DataManager: Performing data validation')

    const panelsData = T3000_Data.value.panelsData || []
    const timestamp = Date.now()
    const missingData: string[] = []
    const staleData: string[] = []

    // Basic data structure validation
    if (!Array.isArray(panelsData)) {
      const result: DataValidationResult = {
        isValid: false,
        missingData: ['panelsData not array'],
        staleData: [],
        timestamp,
        panelsCount: 0,
        entriesCount: 0
      }
      this.validationCache.set(cacheKey, result)
      return result
    }

    // Check for specific entries if requested
    if (specificEntries.length > 0) {
      for (const entryId of specificEntries) {
        const found = panelsData.find(entry => entry.id === entryId || entry.label === entryId)
        if (!found) {
          missingData.push(entryId)
          LogUtil.Warn(`❌ T3000DataManager: Missing required entry: ${entryId}`)
        } else {
          // Check data freshness
          if (requireFresh && this.isDataStale(found)) {
            staleData.push(entryId)
            LogUtil.Warn(`⏰ T3000DataManager: Stale data for entry: ${entryId}`)
          }
        }
      }
    }

    // Check for critical monitor entries like TRL1111, MON1
    const criticalEntries = ['TRL1111', 'MON1']
    for (const criticalId of criticalEntries) {
      const found = panelsData.find(entry =>
        entry.id === criticalId ||
        entry.label === criticalId ||
        entry.description?.includes(criticalId)
      )
      if (!found) {
        LogUtil.Warn(`⚠️ T3000DataManager: Critical entry not found: ${criticalId}`)
      } else {
        LogUtil.Debug(`✅ T3000DataManager: Critical entry found for panelsData: `,panelsData)
        LogUtil.Info(`✅ T3000DataManager: Critical entry found: ${criticalId}`, found)
      }
    }

    const result: DataValidationResult = {
      isValid: missingData.length === 0 && staleData.length === 0,
      missingData,
      staleData,
      timestamp,
      panelsCount: T3000_Data.value.panelsList?.length || 0,
      entriesCount: panelsData.length
    }

    LogUtil.Info(`📊 T3000DataManager: Validation complete - Valid: ${result.isValid}, Entries: ${result.entriesCount}, Missing: ${missingData.length}, Stale: ${staleData.length}`)

    this.validationCache.set(cacheKey, result)
    return result
  }

  /**
   * Check if data entry is stale
   */
  private isDataStale(entry: any): boolean {
    if (!entry.lastUpdate && !entry.timestamp) {
      return false // No timestamp available, assume fresh
    }

    const entryTime = entry.lastUpdate || entry.timestamp
    const age = Date.now() - new Date(entryTime).getTime()
    return age > this.STALE_DATA_THRESHOLD
  }

  /**
   * Get specific entry from panelsData with validation
   */
  public async getEntry(entryId: string, options: DataRequestOptions = {}): Promise<any> {
    LogUtil.Info(`🔍 T3000DataManager: Requesting entry: ${entryId}`)

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

    LogUtil.Info(`✅ T3000DataManager: Entry found: ${entryId}`, entry)
    return entry
  }

  /**
   * Get entries matching a pattern or filter
   */
  public async getEntriesMatching(filter: (entry: any) => boolean, options: DataRequestOptions = {}): Promise<any[]> {
    LogUtil.Info('🔍 T3000DataManager: Requesting filtered entries')

    const validation = await this.waitForDataReady(options)

    if (!validation.isValid) {
      throw new Error('Data not available for filtering')
    }

    const panelsData = T3000_Data.value.panelsData
    const matchingEntries = panelsData.filter(filter)

    LogUtil.Info(`✅ T3000DataManager: Found ${matchingEntries.length} matching entries`)
    return matchingEntries
  }

  /**
   * Resolve all pending data requests
   */
  private resolvePendingRequests(): void {
    LogUtil.Info(`✅ T3000DataManager: Resolving ${this.pendingRequests.size} pending requests`)

    this.pendingRequests.forEach((request, requestId) => {
      LogUtil.Debug(`📝 T3000DataManager: Resolving request ${requestId}`)
      request.resolve()
    })

    this.pendingRequests.clear()
  }

  /**
   * Reject all pending data requests
   */
  private rejectPendingRequests(reason: string): void {
    LogUtil.Warn(`❌ T3000DataManager: Rejecting ${this.pendingRequests.size} pending requests: ${reason}`)

    this.pendingRequests.forEach((request, requestId) => {
      LogUtil.Debug(`📝 T3000DataManager: Rejecting request ${requestId}`)
      request.reject(reason)
    })

    this.pendingRequests.clear()
  }

  /**
   * Log data quality metrics
   */
  private logDataQualityMetrics(panelsData: any[]): void {
    if (!panelsData || !Array.isArray(panelsData)) {
      LogUtil.Warn('📊 T3000DataManager: Invalid panelsData for metrics')
      return
    }

    const metrics = {
      totalEntries: panelsData.length,
      entryTypes: this.getEntryTypeCounts(panelsData),
      panelDistribution: this.getPanelDistribution(panelsData),
      hasDescriptions: panelsData.filter(entry => entry.description).length,
      hasValues: panelsData.filter(entry => entry.value !== undefined).length,
      timestamp: Date.now()
    }

    LogUtil.Info('📊 T3000DataManager: Data Quality Metrics:', metrics)
  }

  /**
   * Get count of entries by type
   */
  private getEntryTypeCounts(panelsData: any[]): Record<string, number> {
    const counts: Record<string, number> = {}

    for (const entry of panelsData) {
      const type = entry.type || 'UNKNOWN'
      counts[type] = (counts[type] || 0) + 1
    }

    return counts
  }

  /**
   * Get distribution of entries across panels
   */
  private getPanelDistribution(panelsData: any[]): Record<string, number> {
    const distribution: Record<string, number> = {}

    for (const entry of panelsData) {
      const panelId = entry.pid || 'UNKNOWN'
      distribution[panelId] = (distribution[panelId] || 0) + 1
    }

    return distribution
  }

  /**
   * Force refresh data from source
   */
  public async forceRefresh(): Promise<DataValidationResult> {
    LogUtil.Info('🔄 T3000DataManager: Force refreshing data')

    this.setDataReadiness(DataReadiness.LOADING_DATA)
    this.validationCache.clear()

    // Trigger data refresh through existing mechanisms
    // This would typically involve calling the WebSocket/WebView clients

    return this.waitForDataReady({ timeout: 30000 })
  }

  /**
   * Get current data readiness state
   */
  public getReadinessState(): DataReadiness {
    return this.dataReadiness.value
  }

  /**
   * Get computed property for reactive state
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
   * Find critical entries in data array
   */
  private findCriticalEntries(data: any[]): any[] {
    if (!data || !Array.isArray(data)) {
      return []
    }

    const criticalIds = ['TRL1111', 'MON1', 'TRL', 'MON']
    const criticalEntries: any[] = []

    for (const entry of data) {
      const matchesCritical = criticalIds.some(criticalId =>
        entry?.id === criticalId ||
        entry?.label === criticalId ||
        entry?.label?.includes(criticalId) ||
        entry?.description?.includes(criticalId)
      )

      if (matchesCritical) {
        criticalEntries.push({
          id: entry.id,
          label: entry.label,
          description: entry.description,
          value: entry.value,
          pid: entry.pid
        })
      }
    }

    return criticalEntries
  }

  /**
   * Analyze the merging process between old and new data
   */
  private analyzeMergingProcess(oldData: any[], newData: any[]): void {
    LogUtil.Info('🔍 DETAILED MERGING PROCESS ANALYSIS:')

    // Check if this is a complete replacement or incremental update
    if (!oldData || oldData.length === 0) {
      LogUtil.Info('   ⚡ TYPE: Initial data load (no old data)')
      LogUtil.Info(`   📥 New entries added: ${newData?.length || 0}`)
      return
    }

    if (!newData || newData.length === 0) {
      LogUtil.Info('   🗑️ TYPE: Data cleared (new data is empty)')
      LogUtil.Info(`   📤 Old entries removed: ${oldData.length}`)
      return
    }

    // Analyze changes in detail
    const oldIds = new Set(oldData.map(entry => entry?.id).filter(Boolean))
    const newIds = new Set(newData.map(entry => entry?.id).filter(Boolean))

    const addedIds = Array.from(newIds).filter(id => !oldIds.has(id))
    const removedIds = Array.from(oldIds).filter(id => !newIds.has(id))
    const commonIds = Array.from(newIds).filter(id => oldIds.has(id))

    LogUtil.Info(`   📊 CHANGE STATISTICS:`)
    LogUtil.Info(`      - Added entries: ${addedIds.length}`)
    LogUtil.Info(`      - Removed entries: ${removedIds.length}`)
    LogUtil.Info(`      - Common entries: ${commonIds.length}`)
    LogUtil.Info(`      - Total old: ${oldData.length}`)
    LogUtil.Info(`      - Total new: ${newData.length}`)

    if (addedIds.length > 0) {
      LogUtil.Info(`   ➕ ADDED ENTRIES:`, addedIds.slice(0, 10)) // Show first 10
    }

    if (removedIds.length > 0) {
      LogUtil.Info(`   ➖ REMOVED ENTRIES:`, removedIds.slice(0, 10)) // Show first 10
    }

    // Check for value changes in common entries
    const valueChanges: any[] = []
    for (const commonId of commonIds.slice(0, 5)) { // Check first 5 for performance
      const oldEntry = oldData.find(entry => entry?.id === commonId)
      const newEntry = newData.find(entry => entry?.id === commonId)

      if (oldEntry && newEntry && oldEntry.value !== newEntry.value) {
        valueChanges.push({
          id: commonId,
          oldValue: oldEntry.value,
          newValue: newEntry.value
        })
      }
    }

    if (valueChanges.length > 0) {
      LogUtil.Info(`   🔄 VALUE CHANGES:`, valueChanges)
    }

    // Determine merge strategy being used
    if (newData.length === oldData.length + addedIds.length - removedIds.length) {
      LogUtil.Info('   ✅ MERGE TYPE: Proper incremental update')
    } else if (addedIds.length === newData.length) {
      LogUtil.Info('   🔄 MERGE TYPE: Complete replacement')
    } else {
      LogUtil.Info('   ⚠️ MERGE TYPE: Inconsistent or partial update')
    }

    // Show the exact replacement pattern used in WebView/WebSocket clients
    LogUtil.Info('🔧 REPLACEMENT PATTERN ANALYSIS:')
    LogUtil.Info('   📋 The actual replacement happens in these locations:')
    LogUtil.Info('      1. WebViewClient.ts (lines ~372-376 and ~421-425):')
    LogUtil.Info('         - T3000_Data.value.panelsData = T3000_Data.value.panelsData.filter(item => item.pid !== panel_id)')
    LogUtil.Info('         - T3000_Data.value.panelsData = T3000_Data.value.panelsData.concat(new_data)')
    LogUtil.Info('         - T3000_Data.value.panelsData.sort((a, b) => a.pid - b.pid)')
    LogUtil.Info('      2. WebSocketClient.ts (lines ~646-650):')
    LogUtil.Info('         - Same filter + concat + sort pattern')
    LogUtil.Info('      3. IndexPage.vue (line ~773):')
    LogUtil.Info('         - T3000_Data.value.panelsData = data.data (direct assignment)')
    LogUtil.Info('   🔄 PROCESS: Old value replaced through filter/concat/sort operations')
    LogUtil.Info('      - Step 1: Filter out entries with matching panel ID')
    LogUtil.Info('      - Step 2: Concat new entries for that panel')
    LogUtil.Info('      - Step 3: Sort by panel ID (pid)')
    LogUtil.Info('   ⚡ TRIGGER: Message received from T3000 hardware via WebView/WebSocket')
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    LogUtil.Info('🧹 T3000DataManager: Cleaning up resources')

    // Clear all pending requests
    this.rejectPendingRequests('Manager destroyed')

    // Clear caches
    this.validationCache.clear()

    // Reset state
    this.dataReadiness.value = DataReadiness.NOT_INITIALIZED
  }
}

// Create singleton instance
export const t3000DataManager = new T3000DataManager()
