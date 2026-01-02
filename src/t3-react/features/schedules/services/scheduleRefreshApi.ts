/**
 * Schedule Refresh API
 *
 * Wraps PanelDataRefreshService for schedule-specific operations.
 * Provides both device refresh (via FFI Action 17) and database load methods.
 *
 * Architecture:
 * - Device refresh → delegates to PanelDataRefreshService (shared core)
 * - Database load → direct T3Database calls (cached data)
 * - Future: Add schedule-specific validation, transformations, etc.
 */

import { PanelDataRefreshService, RefreshResult } from '../../../shared/services/panelDataRefreshService';
import { T3Database } from '../../../../lib/t3-database';
import type { Schedule } from '../types/schedule.types';

/**
 * Schedule Refresh API
 *
 * Thin wrapper around PanelDataRefreshService + T3Database
 * for schedule-specific operations
 */
export class ScheduleRefreshApi {

  // ============================================
  // DEVICE REFRESH (Action 17 via PanelDataRefreshService)
  // ============================================

  /**
   * Refresh all schedules from device and auto-save to database
   *
   * Uses Action 17 (GET_WEBVIEW_LIST) via PanelDataRefreshService
   * Reads indexes 0-7 from device and saves to database
   *
   * NOTE: C++ BacnetWebView.cpp needs update to handle BAC_SCH (4) case
   *
   * @param serialNumber - Device serial number
   * @returns Refresh result with counts and status
   */
  static async refreshAllFromDevice(serialNumber: number): Promise<RefreshResult> {
    return PanelDataRefreshService.refreshAllSchedules(serialNumber);
  }

  /**
   * Refresh single schedule from device and auto-save to database
   *
   * Uses Action 17 (GET_WEBVIEW_LIST) via PanelDataRefreshService
   * Reads specific index from device and saves to database
   *
   * NOTE: C++ BacnetWebView.cpp needs update to handle BAC_SCH (4) case
   *
   * @param serialNumber - Device serial number
   * @param index - Schedule index (0-7)
   * @returns Refresh result with counts and status
   */
  static async refreshSingleFromDevice(serialNumber: number, index: number): Promise<RefreshResult> {
    return PanelDataRefreshService.refreshSingleSchedule(serialNumber, index);
  }

  // ============================================
  // DATABASE LOAD (Cached data, no device communication)
  // ============================================

  /**
   * Load all schedules from database (cached data)
   *
   * Does NOT communicate with device - returns last saved data
   * Use refreshAllFromDevice() to get fresh data from device
   *
   * @param serialNumber - Device serial number
   * @returns Array of schedules from database
   */
  static async loadAllFromDB(serialNumber: number): Promise<Schedule[]> {
    return T3Database.getAllSchedules(serialNumber);
  }

  /**
   * Load single schedule from database by index
   *
   * Does NOT communicate with device - returns last saved data
   * Use refreshSingleFromDevice() to get fresh data from device
   *
   * @param serialNumber - Device serial number
   * @param index - Schedule index (0-7)
   * @returns Schedule if found, undefined otherwise
   */
  static async loadFromDB(serialNumber: number, index: number): Promise<Schedule | undefined> {
    const schedules = await T3Database.getAllSchedules(serialNumber);
    return schedules.find(schedule => schedule.index === index);
  }

  /**
   * Load single schedule from database by ID
   *
   * @param id - Schedule database ID
   * @returns Schedule if found, undefined otherwise
   */
  static async loadByIdFromDB(id: string): Promise<Schedule | undefined> {
    return T3Database.getScheduleById(id);
  }

  // ============================================
  // FUTURE: Type-specific methods
  // ============================================

  /**
   * Validate schedule data
   *
   * Example placeholder for future validation logic:
   * - Check index range (0-7)
   * - Validate required fields
   * - Check time slot validity
   *
   * @param schedule - Schedule to validate
   * @returns Validation result with errors
   */
  static async validate(schedule: Schedule): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Example validations (extend as needed)
    if (schedule.index < 0 || schedule.index > 7) {
      errors.push('Index must be between 0-7');
    }

    if (!schedule.label || schedule.label.trim() === '') {
      errors.push('Label is required');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
