/**
 * T3000 Database Management API Service
 *
 * Provides comprehensive Trendlog Configuration and file management APIs
 * for the T3000 WebView application's database partitioning system.
 *
 * TypeScript implementation with full type safety and enhanced error handling.
 */

import { ref } from 'vue'

// API Configuration - Port 9103 for T3000 HTTP API (same as TrendlogDataAPI)
const DATABASE_API_BASE_URL = 'http://localhost:9103'// =====================================
// TYPE DEFINITIONS
// =====================================

/**
 * Database partition strategy types (matching Rust enum variants)
 */
export type PartitionStrategy = 'FiveMinutes' | 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Custom' | 'CustomMonths'

/**
 * Retention time units
 */
export type RetentionUnit = 'days' | 'weeks' | 'months'

/**
 * Database partition configuration interface (matching Rust DatabasePartitionConfig)
 */
export interface DatabasePartitionConfig {
  id?: number
  strategy: PartitionStrategy
  custom_days?: number
  custom_months?: number
  auto_cleanup_enabled: boolean
  retention_value: number
  retention_unit: RetentionUnit
  is_active: boolean
}

/**
 * Complete Trendlog Configuration interface (same as DatabasePartitionConfig)
 */
export type DatabaseConfig = DatabasePartitionConfig

/**
 * Database file information interface
 */
export interface DatabaseFileInfo {
  id: number
  fileName: string
  filePath: string
  size: string
  sizeBytes: number
  records: number
  startDate?: string
  endDate?: string
  isActive: boolean
  isArchived: boolean
  partitionIdentifier?: string
  ageDays: number
  createdAt: string
  updatedAt: string
  lastAccessedAt?: string
}

/**
 * Database statistics interface
 */
export interface DatabaseStatistics {
  totalFiles: number
  totalSize: string
  totalSizeBytes: number
  totalRecords: number
  activeFiles: number
  archivedFiles: number
  oldestFile?: string
  newestFile?: string
  averageFileSize: string
}

/**
 * API operation result interface
 */
export interface ApiResult<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

/**
 * Cleanup operation result interface
 */
export interface CleanupResult {
  filesDeleted: number
  spaceSaved: string
  spaceSavedBytes: number
  deletedFiles: string[]
  message: string
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  success: boolean
  error?: string
}

/**
 * Progress callback function type
 */
export type ProgressCallback = (message: string) => void

/**
 * Cleanup options interface
 */
export interface CleanupOptions {
  type?: 'old' | 'all'
  retentionDays?: number
  onProgress?: ProgressCallback
}

/**
 * Sampling Interval configuration interface
 */
export interface FfiSyncIntervalConfig {
  interval_secs: number
  last_sync?: string
}

/**
 * Sampling Interval update request interface
 */
export interface FfiSyncIntervalUpdateRequest {
  interval_secs: number
  changed_by?: string
  change_reason?: string
}

/**
 * FFI sync configuration history entry interface
 */
export interface FfiSyncConfigHistory {
  id: number
  config_key: string
  old_value: string
  new_value: string
  changed_by?: string
  change_reason?: string
  changed_at: string
}

// =====================================
// Trendlog Configuration API
// =====================================

/**
 * Trendlog Configuration management class
 */
export class DatabaseConfigAPI {
  /**
   * Get current Trendlog Configuration
   * @returns Promise resolving to current Trendlog Configuration
   * @throws Error if configuration cannot be loaded
   */
  static async getConfig(): Promise<DatabaseConfig> {
    try {
      const response = await fetch(`${DATABASE_API_BASE_URL}/api/database/config`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`)
      }

      const data: DatabaseConfig = await response.json()
      return data
    } catch (error) {
      console.error('Failed to get database config:', error)
      throw new Error('Failed to load Trendlog Configuration')
    }
  }

  /**
   * Update Trendlog Configuration
   * @param config Trendlog Configuration object to update
   * @returns Promise resolving to updated configuration
   * @throws Error if configuration cannot be saved
   */
  static async updateConfig(config: DatabaseConfig): Promise<DatabaseConfig> {
    try {
      const response = await fetch(`${DATABASE_API_BASE_URL}/api/database/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config)
      })

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`)
      }

      const data: DatabaseConfig = await response.json()
      return data
    } catch (error) {
      console.error('Failed to update database config:', error)
      throw new Error('Failed to save Trendlog Configuration')
    }
  }

  /**
   * Apply partitioning strategy
   * @returns Promise resolving to operation result with file list
   * @throws Error if partitioning strategy cannot be applied
   */
  static async applyPartitioningStrategy(): Promise<ApiResult<DatabaseFileInfo[]>> {
    try {
      const response = await fetch(`${DATABASE_API_BASE_URL}/api/database/partition/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`)
      }

      const data: ApiResult<DatabaseFileInfo[]> = await response.json()
      return data
    } catch (error) {
      console.error('Failed to apply partitioning strategy:', error)
      throw new Error('Failed to apply partitioning strategy')
    }
  }

  /**
   * Ensure required partitions exist when trendlog window opens
   * This method is called every time a user opens trendlog to automatically:
   * 1. Check if partition configuration exists (create monthly default if not)
   * 2. Check if required partitions exist for previous periods
   * 3. Create missing partitions and migrate data as needed
   * @returns Promise resolving to partition check result
   * @throws Error if partition check cannot be performed
   */
  static async ensurePartitionsOnTrendlogOpen(): Promise<{
    success: boolean;
    config_found: boolean;
    partitions_checked: number;
    partitions_created: number;
    data_migrated_mb: number;
    has_errors: boolean;
    errors: string[];
  }> {
    try {
      const response = await fetch(`${DATABASE_API_BASE_URL}/api/database/partition/ensure`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Failed to ensure partitions on trendlog open:', error)
      throw new Error('Failed to check database partitions')
    }
  }
}

// =====================================
// Sampling Interval CONFIGURATION API
// =====================================

/**
 * Sampling Interval configuration management class
 */
export class FfiSyncConfigAPI {
  /**
   * Get current Sampling Interval configuration
   * @returns Promise resolving to current Sampling Interval configuration
   * @throws Error if configuration cannot be loaded
   */
  static async getFfiSyncInterval(): Promise<FfiSyncIntervalConfig> {
    try {
      const response = await fetch(`${DATABASE_API_BASE_URL}/api/config/ffi-sync-interval`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`)
      }

      const data: FfiSyncIntervalConfig = await response.json()
      return data
    } catch (error) {
      console.error('Failed to get Sampling Interval:', error)
      throw new Error('Failed to load Sampling Interval configuration')
    }
  }

  /**
   * Update Sampling Interval configuration
   * @param interval_secs Interval in seconds (60 to 31536000, i.e., 1 minute to 365 days)
   * @param changed_by Optional: User or system identifier who made the change
   * @param change_reason Optional: Reason for the configuration change
   * @returns Promise resolving to updated Sampling Interval configuration
   * @throws Error if configuration cannot be saved or validation fails
   */
  static async updateFfiSyncInterval(
    interval_secs: number,
    changed_by?: string,
    change_reason?: string
  ): Promise<FfiSyncIntervalConfig> {
    try {
      // Client-side validation
      if (interval_secs < 60 || interval_secs > 31536000) {
        throw new Error('Interval must be between 1 minute (60s) and 365 days (31536000s)')
      }

      const requestBody: FfiSyncIntervalUpdateRequest = {
        interval_secs,
        changed_by,
        change_reason
      }

      const response = await fetch(`${DATABASE_API_BASE_URL}/api/config/ffi-sync-interval`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `API request failed: ${response.status}`)
      }

      const data: FfiSyncIntervalConfig = await response.json()
      return data
    } catch (error) {
      console.error('Failed to update Sampling Interval:', error)
      throw error instanceof Error ? error : new Error('Failed to save Sampling Interval configuration')
    }
  }

  /**
   * Get FFI sync configuration change history
   * @param limit Maximum number of history entries to return (default: 100)
   * @returns Promise resolving to array of configuration history entries
   * @throws Error if history cannot be loaded
   */
  static async getFfiSyncHistory(limit: number = 100): Promise<FfiSyncConfigHistory[]> {
    try {
      const response = await fetch(
        `${DATABASE_API_BASE_URL}/api/config/history?config_key=ffi.sync_interval_secs&limit=${limit}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`)
      }

      const data: FfiSyncConfigHistory[] = await response.json()
      return data
    } catch (error) {
      console.error('Failed to get FFI sync history:', error)
      throw new Error('Failed to load FFI sync configuration history')
    }
  }

  /**
   * Convert seconds to human-readable format
   * @param seconds Number of seconds
   * @returns Formatted string (e.g., "5 minutes", "2 hours", "1 day")
   */
  static formatInterval(seconds: number): string {
    if (seconds < 60) return `${seconds} seconds`
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours`
    return `${Math.floor(seconds / 86400)} days`
  }

  /**
   * Convert seconds to custom value in minutes for UI display
   * @param seconds Number of seconds
   * @returns Object with value in minutes and unit fixed to 'minutes'
   */
  static convertSecondsToCustom(seconds: number): { value: number; unit: 'minutes' } {
    return { value: seconds / 60, unit: 'minutes' }
  }

  /**
   * Convert custom value (in minutes) to seconds
   * @param value Numeric value in minutes
   * @returns Total seconds
   */
  static convertToSeconds(value: number): number {
    return value * 60
  }

  /**
   * Get preset interval options
   * @returns Array of preset interval options with labels and values
   */
  static getPresetIntervals(): Array<{ label: string; value: number }> {
    return [
      { label: '5 minutes', value: 300 },
      { label: '10 minutes', value: 600 },
      { label: '15 minutes', value: 900 },
      { label: '20 minutes', value: 1200 },
      { label: '25 minutes', value: 1500 }
    ]
  }

  /**
   * Check if interval value should show a performance warning
   * @param seconds Interval in seconds
   * @returns Warning message if applicable, null otherwise
   */
  static getWarningMessage(seconds: number): string | null {
    if (seconds < 300) {
      return 'Warning: Frequent syncs (< 5 min) may impact performance'
    } else if (seconds > 1500) {
      return 'Warning: Long intervals (> 25 min) may delay data updates'
    }
    return null
  }

  /**
   * Validate interval value
   * @param seconds Interval in seconds to validate
   * @returns Validation result with success flag and error message
   */
  static validateInterval(seconds: number): ValidationResult {
    if (seconds < 60) {
      return {
        success: false,
        error: 'Interval must be at least 1 minute (60 seconds)'
      }
    }
    if (seconds > 31536000) {
      return {
        success: false,
        error: 'Interval cannot exceed 365 days (31536000 seconds)'
      }
    }
    return { success: true }
  }
}

// =====================================
// DATABASE FILES API
// =====================================

/**
 * Database files management class
 */
export class DatabaseFilesAPI {
  /**
   * Get list of all database files
   * @returns Promise resolving to array of database file information
   * @throws Error if files cannot be loaded
   */
  static async getFiles(): Promise<DatabaseFileInfo[]> {
    try {
      const response = await fetch(`${DATABASE_API_BASE_URL}/api/database/files`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`)
      }

      const data: DatabaseFileInfo[] = await response.json()
      return data
    } catch (error) {
      console.error('Failed to get database files:', error)
      throw new Error('Failed to load database files')
    }
  }

  /**
   * Delete specific database file
   * @param fileId ID of the file to delete
   * @returns Promise resolving to operation result
   * @throws Error if file cannot be deleted
   */
  static async deleteFile(fileId: number): Promise<ApiResult> {
    try {
      const response = await fetch(`${DATABASE_API_BASE_URL}/api/database/files/${fileId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data: ApiResult = await response.json()

      if (!response.ok) {
        // If we got a structured error response, return it instead of throwing
        if (data.success === false && data.message) {
          return data
        }
        throw new Error(`API request failed: ${response.status}`)
      }

      return data
    } catch (error) {
      console.error('Failed to delete database file:', error)
      throw new Error('Failed to delete database file')
    }
  }

  /**
   * Cleanup old database files based on retention policy
   * @param retentionDays Number of days to retain files (default: 30)
   * @returns Promise resolving to cleanup result with statistics
   * @throws Error if cleanup operation fails
   */
  static async cleanupOldFiles(retentionDays: number = 30): Promise<CleanupResult> {
    try {
      const response = await fetch(`${DATABASE_API_BASE_URL}/api/database/cleanup/old?retention_days=${retentionDays}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`)
      }

      const data: CleanupResult = await response.json()
      return data
    } catch (error) {
      console.error('Failed to cleanup old files:', error)
      throw new Error('Failed to cleanup old database files')
    }
  }

  /**
   * Cleanup all database files (except active ones)
   * @returns Promise resolving to cleanup result with statistics
   * @throws Error if cleanup operation fails
   */
  static async cleanupAllFiles(): Promise<CleanupResult> {
    try {
      const response = await fetch(`${DATABASE_API_BASE_URL}/api/database/cleanup/all`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`)
      }

      const data: CleanupResult = await response.json()
      return data
    } catch (error) {
      console.error('Failed to cleanup all files:', error)
      throw new Error('Failed to cleanup all database files')
    }
  }

  /**
   * Optimize/compact database files
   * @returns Promise resolving to operation result
   * @throws Error if optimization fails
   */
  static async optimizeDatabase(): Promise<ApiResult> {
    try {
      const response = await fetch(`${DATABASE_API_BASE_URL}/api/database/optimize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`)
      }

      const data: ApiResult = await response.json()
      return data
    } catch (error) {
      console.error('Failed to optimize database:', error)
      throw new Error('Failed to optimize database')
    }
  }

  /**
   * Get database file statistics
   * @returns Promise resolving to database statistics
   * @throws Error if statistics cannot be loaded
   */
  static async getStatistics(): Promise<DatabaseStatistics> {
    try {
      const response = await fetch(`${DATABASE_API_BASE_URL}/api/database/stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`)
      }

      const data: DatabaseStatistics = await response.json()
      return data
    } catch (error) {
      console.error('Failed to get database statistics:', error)
      throw new Error('Failed to load database statistics')
    }
  }
}

// =====================================
// DATABASE UTILITIES
// =====================================

/**
 * Utility functions for database management
 */
export class DatabaseUtils {
  /**
   * Format file size in human-readable format
   * @param bytes File size in bytes
   * @returns Formatted file size string
   */
  static formatFileSize(bytes: number): string {
    const units: string[] = ['B', 'KB', 'MB', 'GB', 'TB']

    if (bytes === 0) return '0 B'

    const unitIndex = Math.floor(Math.log10(bytes) / Math.log10(1024))
    const clampedIndex = Math.min(unitIndex, units.length - 1)
    const size = bytes / Math.pow(1024, clampedIndex)

    if (size >= 100) {
      return `${size.toFixed(0)} ${units[clampedIndex]}`
    } else if (size >= 10) {
      return `${size.toFixed(1)} ${units[clampedIndex]}`
    } else {
      return `${size.toFixed(2)} ${units[clampedIndex]}`
    }
  }

  /**
   * Calculate retention date based on value and unit
   * @param value Retention value
   * @param unit Retention unit ('days', 'weeks', 'months')
   * @returns Calculated retention date
   */
  static calculateRetentionDate(value: number, unit: RetentionUnit): Date {
    const now = new Date()
    let days = 0

    switch (unit) {
      case 'days':
        days = value
        break
      case 'weeks':
        days = value * 7
        break
      case 'months':
        days = value * 30 // Approximate month
        break
      default:
        days = value
    }

    return new Date(now.getTime() - (days * 24 * 60 * 60 * 1000))
  }

  /**
   * Generate partition identifier based on strategy and date
   * @param strategy Partition strategy
   * @param customDays Custom days (for custom strategy)
   * @param customMonths Custom months (for custom-months strategy)
   * @param date Date to generate identifier for (default: current date)
   * @returns Partition identifier string
   */
  static generatePartitionIdentifier(
    strategy: PartitionStrategy,
    customDays?: number,
    customMonths?: number,
    date: Date = new Date()
  ): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')

    switch (strategy) {
      case 'FiveMinutes':
        const hour = String(date.getHours()).padStart(2, '0')
        const minute = String(Math.floor(date.getMinutes() / 5) * 5).padStart(2, '0')
        return `${year}-${month}-${day}-${hour}${minute}`
      case 'Daily':
        return `${year}-${month}-${day}`
      case 'Weekly':
        const weekNumber = Math.ceil(date.getDate() / 7)
        return `${year}-W${String(weekNumber).padStart(2, '0')}`
      case 'Monthly':
        return `${year}-${month}`
      case 'Quarterly':
        const quarter = Math.ceil((date.getMonth() + 1) / 3)
        return `${year}-Q${quarter}`
      case 'Custom':
        return `custom-${year}-${month}-${day}-${customDays || 30}`
      case 'CustomMonths':
        return `custom-${year}-${month}-${customMonths || 2}m`
      default:
        return `${year}-${month}`
    }
  }

  /**
   * Get description for partition strategy
   * @param strategy Partition strategy
   * @param customDays Custom days (for custom strategy)
   * @param customMonths Custom months (for custom-months strategy)
   * @returns Strategy description string
   */
  static getStrategyDescription(
    strategy: PartitionStrategy,
    customDays?: number,
    customMonths?: number
  ): string {
    switch (strategy) {
      case 'FiveMinutes':
        return 'One file every 5 minutes (for testing)'
      case 'Daily':
        return 'One file per day'
      case 'Weekly':
        return 'One file per week'
      case 'Monthly':
        return 'One file per month'
      case 'Quarterly':
        return 'One file per quarter (3 months)'
      case 'Custom':
        return `One file every ${customDays || 30} days`
      case 'CustomMonths':
        return `One file every ${customMonths || 2} months`
      default:
        return 'Unknown strategy'
    }
  }

  /**
   * Validate Trendlog Configuration
   * @param config Configuration object to validate
   * @returns Validation result with success flag and error message
   */
  static validateConfig(config: DatabaseConfig): ValidationResult {
    const { strategy, custom_days, custom_months, retention_value, retention_unit } = config

    // Validate strategy-specific parameters
    if (strategy === 'Custom' && (!custom_days || custom_days < 1 || custom_days > 365)) {
      return {
        success: false,
        error: 'Custom days must be between 1 and 365'
      }
    }

    if (strategy === 'CustomMonths' && (!custom_months || custom_months < 1 || custom_months > 12)) {
      return {
        success: false,
        error: 'Custom months must be between 1 and 12'
      }
    }

    // Validate retention values
    if (!retention_value || retention_value < 1) {
      return {
        success: false,
        error: 'Retention value must be at least 1'
      }
    }

    const maxRetention: Record<RetentionUnit, number> = {
      days: 3650,   // 10 years
      weeks: 520,   // 10 years
      months: 120   // 10 years
    }

    if (retention_value > maxRetention[retention_unit]) {
      return {
        success: false,
        error: `Retention ${retention_unit} cannot exceed ${maxRetention[retention_unit]}`
      }
    }

    return { success: true }
  }

  /**
   * Check if a strategy requires custom days parameter
   * @param strategy Partition strategy to check
   * @returns True if custom days parameter is required
   */
  static requiresCustomDays(strategy: PartitionStrategy): boolean {
    return strategy === 'Custom'
  }

  /**
   * Check if a strategy requires custom months parameter
   * @param strategy Partition strategy to check
   * @returns True if custom months parameter is required
   */
  static requiresCustomMonths(strategy: PartitionStrategy): boolean {
    return strategy === 'CustomMonths'
  }

  /**
   * Get all available partition strategies
   * @returns Array of all partition strategy options
   */
  static getAllStrategies(): PartitionStrategy[] {
    return ['FiveMinutes', 'Daily', 'Weekly', 'Monthly', 'Quarterly', 'Custom', 'CustomMonths']
  }

  /**
   * Get all available retention units
   * @returns Array of all retention unit options
   */
  static getAllRetentionUnits(): RetentionUnit[] {
    return ['days', 'weeks', 'months']
  }
}

// =====================================
// MAIN DATABASE MANAGEMENT SERVICE
// =====================================

/**
 * Complete database management service combining all APIs
 */
export class DatabaseManagementService {
  public readonly config: typeof DatabaseConfigAPI
  public readonly files: typeof DatabaseFilesAPI
  public readonly ffiSync: typeof FfiSyncConfigAPI
  public readonly utils: typeof DatabaseUtils

  constructor() {
    this.config = DatabaseConfigAPI
    this.files = DatabaseFilesAPI
    this.ffiSync = FfiSyncConfigAPI
    this.utils = DatabaseUtils
  }

  /**
   * Initialize database management with current configuration
   * @returns Promise resolving to initial state with config, files, and stats
   */
  async initialize(): Promise<{
    config: DatabaseConfig
    files: DatabaseFileInfo[]
    stats: DatabaseStatistics | null
    initialized: boolean
    error?: string
  }> {
    try {
      const [config, files, stats] = await Promise.all([
        this.config.getConfig(),
        this.files.getFiles(),
        this.files.getStatistics()
      ])

      return {
        config,
        files,
        stats,
        initialized: true
      }
    } catch (error) {
      console.error('Failed to initialize database management:', error)
      return {
        config: this.getDefaultConfig(),
        files: [],
        stats: null,
        initialized: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Get default configuration
   * @returns Default Trendlog Configuration object
   */
  getDefaultConfig(): DatabaseConfig {
    return {
      strategy: 'Monthly',
      custom_days: 30,
      custom_months: 2,
      auto_cleanup_enabled: true,
      retention_value: 30,
      retention_unit: 'days',
      is_active: true
    }
  }

  /**
   * Complete cleanup workflow with progress tracking
   * @param options Cleanup options including type and progress callback
   * @returns Promise resolving to cleanup results
   */
  async performCleanup(options: CleanupOptions = {}): Promise<CleanupResult> {
    const { type = 'old', retentionDays = 30, onProgress } = options

    try {
      onProgress?.('Starting cleanup...')

      let result: CleanupResult
      if (type === 'all') {
        result = await this.files.cleanupAllFiles()
      } else {
        result = await this.files.cleanupOldFiles(retentionDays)
      }

      onProgress?.('Cleanup completed successfully')
      return result
    } catch (error) {
      onProgress?.(`Cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      throw error
    }
  }

  /**
   * Validate and save configuration
   * @param config Configuration to validate and save
   * @returns Promise resolving to saved configuration
   * @throws Error if configuration is invalid or cannot be saved
   */
  async validateAndSaveConfig(config: DatabaseConfig): Promise<DatabaseConfig> {
    const validation = this.utils.validateConfig(config)
    if (!validation.success) {
      throw new Error(validation.error || 'Configuration validation failed')
    }

    return await this.config.updateConfig(config)
  }

  /**
   * Get comprehensive system status
   * @returns Promise resolving to complete system status
   */
  async getSystemStatus(): Promise<{
    config: DatabaseConfig
    stats: DatabaseStatistics
    health: 'good' | 'warning' | 'critical'
    issues: string[]
  }> {
    try {
      const [config, stats] = await Promise.all([
        this.config.getConfig(),
        this.files.getStatistics()
      ])

      const issues: string[] = []
      let health: 'good' | 'warning' | 'critical' = 'good'

      // Check for potential issues
      if (stats.totalFiles > 1000) {
        issues.push('High number of database files detected')
        health = 'warning'
      }

      if (stats.totalSizeBytes > 10 * 1024 * 1024 * 1024) { // > 10GB
        issues.push('Database size is very large')
        health = 'warning'
      }

      if (stats.archivedFiles > stats.activeFiles * 2) {
        issues.push('Many archived files - consider cleanup')
        health = 'warning'
      }

      return {
        config,
        stats,
        health,
        issues
      }
    } catch (error) {
      return {
        config: this.getDefaultConfig(),
        stats: {
          totalFiles: 0,
          totalSize: '0 B',
          totalSizeBytes: 0,
          totalRecords: 0,
          activeFiles: 0,
          archivedFiles: 0,
          averageFileSize: '0 B'
        },
        health: 'critical',
        issues: ['Failed to load system status']
      }
    }
  }
}

// =====================================
// EXPORTS
// =====================================

// Export singleton instance
export const databaseService = new DatabaseManagementService()

// =====================================
// COMPOSABLE FUNCTION (Vue 3 Pattern)
// =====================================

/**
 * Vue 3 composable for database management API
 * Following the pattern of TrendlogDataAPI
 */
export function useDatabaseAPI() {
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Expose all the static API classes
  const configAPI = DatabaseConfigAPI
  const filesAPI = DatabaseFilesAPI
  const ffiSyncAPI = FfiSyncConfigAPI
  const utils = DatabaseUtils
  const service = databaseService

  return {
    // Reactive state
    isLoading,
    error,

    // API classes
    configAPI,
    filesAPI,
    ffiSyncAPI,
    utils,
    service,

    // Convenience methods
    async getConfig() {
      isLoading.value = true
      error.value = null
      try {
        const result = await configAPI.getConfig()
        return result
      } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to get config'
        throw err
      } finally {
        isLoading.value = false
      }
    },

    async getFiles() {
      isLoading.value = true
      error.value = null
      try {
        const result = await filesAPI.getFiles()
        return result
      } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to get files'
        throw err
      } finally {
        isLoading.value = false
      }
    },

    async getFfiSyncInterval() {
      isLoading.value = true
      error.value = null
      try {
        const result = await ffiSyncAPI.getFfiSyncInterval()
        return result
      } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to get Sampling Interval'
        throw err
      } finally {
        isLoading.value = false
      }
    },

    async updateFfiSyncInterval(interval_secs: number, changed_by?: string, change_reason?: string) {
      isLoading.value = true
      error.value = null
      try {
        const result = await ffiSyncAPI.updateFfiSyncInterval(interval_secs, changed_by, change_reason)
        return result
      } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to update Sampling Interval'
        throw err
      } finally {
        isLoading.value = false
      }
    },

    async getFfiSyncHistory(limit: number = 100) {
      isLoading.value = true
      error.value = null
      try {
        const result = await ffiSyncAPI.getFfiSyncHistory(limit)
        return result
      } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to get FFI sync history'
        throw err
      } finally {
        isLoading.value = false
      }
    }
  }
}

// All types and classes are already exported at their definitions above
