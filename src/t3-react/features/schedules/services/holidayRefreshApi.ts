/**
 * Holiday Refresh API
 *
 * Wraps PanelDataRefreshService for holiday-specific operations.
 * Provides both device refresh (via FFI Action 17) and database load methods.
 *
 * Architecture:
 * - Device refresh → delegates to PanelDataRefreshService (shared core)
 * - Database load → direct T3Database calls (cached data)
 * - Future: Add holiday-specific validation, transformations, etc.
 */

import { PanelDataRefreshService, RefreshResult } from '../../../shared/services/panelDataRefreshService';
import { T3Database } from '../../../../lib/t3-database';
import type { Holiday } from '../types/holiday.types';

/**
 * Holiday Refresh API
 *
 * Thin wrapper around PanelDataRefreshService + T3Database
 * for holiday-specific operations
 */
export class HolidayRefreshApi {

  // ============================================
  // DEVICE REFRESH (Action 17 via PanelDataRefreshService)
  // ============================================

  /**
   * Refresh all holidays from device and auto-save to database
   *
   * Uses Action 17 (GET_WEBVIEW_LIST) via PanelDataRefreshService
   * Reads indexes 0-3 from device and saves to database
   *
   * NOTE: C++ BacnetWebView.cpp needs update to handle BAC_HOL (5) case
   *
   * @param serialNumber - Device serial number
   * @returns Refresh result with counts and status
   */
  static async refreshAllFromDevice(serialNumber: number): Promise<RefreshResult> {
    return PanelDataRefreshService.refreshAllHolidays(serialNumber);
  }

  /**
   * Refresh single holiday from device and auto-save to database
   *
   * Uses Action 17 (GET_WEBVIEW_LIST) via PanelDataRefreshService
   * Reads specific index from device and saves to database
   *
   * NOTE: C++ BacnetWebView.cpp needs update to handle BAC_HOL (5) case
   *
   * @param serialNumber - Device serial number
   * @param index - Holiday index (0-3)
   * @returns Refresh result with counts and status
   */
  static async refreshSingleFromDevice(serialNumber: number, index: number): Promise<RefreshResult> {
    return PanelDataRefreshService.refreshSingleHoliday(serialNumber, index);
  }

  // ============================================
  // DATABASE LOAD (Cached data, no device communication)
  // ============================================

  /**
   * Load all holidays from database (cached data)
   *
   * Does NOT communicate with device - returns last saved data
   * Use refreshAllFromDevice() to get fresh data from device
   *
   * @param serialNumber - Device serial number
   * @returns Array of holidays from database
   */
  static async loadAllFromDB(serialNumber: number): Promise<Holiday[]> {
    return T3Database.getAllHolidays(serialNumber);
  }

  /**
   * Load single holiday from database by index
   *
   * Does NOT communicate with device - returns last saved data
   * Use refreshSingleFromDevice() to get fresh data from device
   *
   * @param serialNumber - Device serial number
   * @param index - Holiday index (0-3)
   * @returns Holiday if found, undefined otherwise
   */
  static async loadFromDB(serialNumber: number, index: number): Promise<Holiday | undefined> {
    const holidays = await T3Database.getAllHolidays(serialNumber);
    return holidays.find(holiday => holiday.index === index);
  }

  /**
   * Load single holiday from database by ID
   *
   * @param id - Holiday database ID
   * @returns Holiday if found, undefined otherwise
   */
  static async loadByIdFromDB(id: string): Promise<Holiday | undefined> {
    return T3Database.getHolidayById(id);
  }

  // ============================================
  // FUTURE: Type-specific methods
  // ============================================

  /**
   * Validate holiday data
   *
   * Example placeholder for future validation logic:
   * - Check index range (0-3)
   * - Validate required fields
   * - Check date validity
   *
   * @param holiday - Holiday to validate
   * @returns Validation result with errors
   */
  static async validate(holiday: Holiday): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Example validations (extend as needed)
    if (holiday.index < 0 || holiday.index > 3) {
      errors.push('Index must be between 0-3');
    }

    if (!holiday.label || holiday.label.trim() === '') {
      errors.push('Label is required');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
