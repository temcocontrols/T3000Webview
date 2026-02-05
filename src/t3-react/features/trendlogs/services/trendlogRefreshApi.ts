/**
 * Trendlog Refresh API
 *
 * Wraps PanelDataRefreshService for trendlog-specific operations.
 * Provides both device refresh (via FFI Action 17) and database load methods.
 *
 * Architecture:
 * - Device refresh → delegates to PanelDataRefreshService (shared core)
 * - Database load → direct T3Database calls (cached data)
 * - Future: Add trendlog-specific validation, transformations, etc.
 */

import { PanelDataRefreshService, RefreshResult } from '../../../shared/services/panelDataRefreshService';
import { T3Database } from '../../../../lib/t3-database';
import type { Trendlog } from '../../../../lib/t3-database/types/trendlog.types';
import { API_BASE_URL } from '../../../config/constants';

/**
 * Trendlog Refresh API
 *
 * Thin wrapper around PanelDataRefreshService + T3Database
 * for trendlog-specific operations
 */
export class TrendlogRefreshApi {

  // ============================================
  // DEVICE REFRESH (Action 17 via PanelDataRefreshService)
  // ============================================

  /**
   * Refresh all trendlogs from device and auto-save to database
   *
   * Uses Action 17 (GET_WEBVIEW_LIST) via PanelDataRefreshService
   * Reads indexes 0-15 from device and saves to database
   *
   * NOTE: C++ BacnetWebView.cpp needs update to handle BAC_TBL (7) case
   *
   * @param serialNumber - Device serial number
   * @returns Refresh result with counts and status
   */
  static async refreshAllFromDevice(serialNumber: number): Promise<RefreshResult> {
    return PanelDataRefreshService.refreshAllTrendlogs(serialNumber);
  }

  /**
   * Refresh single trendlog from device and auto-save to database
   *
   * Uses Action 17 (GET_WEBVIEW_LIST) via PanelDataRefreshService
   * Reads specific index from device and saves to database
   *
   * NOTE: C++ BacnetWebView.cpp needs update to handle BAC_TBL (7) case
   *
   * @param serialNumber - Device serial number
   * @param index - Trendlog index (0-15)
   * @returns Refresh result with counts and status
   */
  static async refreshSingleFromDevice(serialNumber: number, index: number): Promise<RefreshResult> {
    return PanelDataRefreshService.refreshSingleTrendlog(serialNumber, index);
  }

  // ============================================
  // DATABASE LOAD (Cached data, no device communication)
  // ============================================

  /**
   * Load all trendlogs from database (cached data)
   *
   * Does NOT communicate with device - returns last saved data
   * Use refreshAllFromDevice() to get fresh data from device
   *
   * @param serialNumber - Device serial number
   * @returns Array of trendlogs from database
   */
  static async loadAllFromDB(serialNumber: number): Promise<Trendlog[]> {
    const db = new T3Database(`${API_BASE_URL}/api`);
    return db.trendlogs.getAll(serialNumber);
  }

  /**
   * Load single trendlog from database by Trendlog_ID
   *
   * Does NOT communicate with device - returns last saved data
   * Use refreshSingleFromDevice() to get fresh data from device
   *
   * @param serialNumber - Device serial number
   * @param trendlogId - Trendlog ID string
   * @returns Trendlog if found, undefined otherwise
   */
  static async loadFromDB(serialNumber: number, trendlogId: string): Promise<Trendlog | undefined> {
    const db = new T3Database(`${API_BASE_URL}/api`);
    const trendlogs = await db.trendlogs.getAll(serialNumber);
    return trendlogs.find(trendlog => trendlog.Trendlog_ID === trendlogId);
  }

  /**
   * Load single trendlog from database by ID
   *
   * @param id - Trendlog database ID (format: serialNumber-trendlogId)
   * @returns Trendlog if found, undefined otherwise
   */
  static async loadByIdFromDB(id: string): Promise<Trendlog | undefined> {
    // Parse the id to get serialNumber and trendlogId
    const [serialNumberStr, trendlogIdStr] = id.split('-');
    const serialNumber = parseInt(serialNumberStr);
    const trendlogId = parseInt(trendlogIdStr);

    if (isNaN(serialNumber) || isNaN(trendlogId)) {
      return undefined;
    }

    const db = new T3Database(`${API_BASE_URL}/api`);
    return await db.trendlogs.get(serialNumber, trendlogId) || undefined;
  }

  // ============================================
  // FUTURE: Type-specific methods
  // ============================================

  /**
   * Validate trendlog data
   *
   * Example placeholder for future validation logic:
   * - Check index range (0-15)
   * - Validate required fields
   * - Check sample rate settings
   *
   * @param trendlog - Trendlog to validate
   * @returns Validation result with errors
   */
  static async validate(trendlog: Trendlog): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Example validations (extend as needed)
    if (trendlog.index < 0 || trendlog.index > 15) {
      errors.push('Index must be between 0-15');
    }

    if (!trendlog.label || trendlog.label.trim() === '') {
      errors.push('Label is required');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// Backward compatibility alias
export class TrendlogRefreshApiService extends TrendlogRefreshApi {}
