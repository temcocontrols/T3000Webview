/**
 * Alarm Refresh API
 *
 * Wraps PanelDataRefreshService for alarm-specific operations.
 * Provides both device refresh (via FFI Action 17) and database load methods.
 *
 * Architecture:
 * - Device refresh → delegates to PanelDataRefreshService (shared core)
 * - Database load → direct T3Database calls (cached data)
 * - Future: Add alarm-specific validation, transformations, etc.
 */

import { PanelDataRefreshService, RefreshResult } from '../../../shared/services/panelDataRefreshService';
import { T3Database } from '../../../../lib/t3-database';
import type { Alarm } from '../../../../lib/t3-database/types/alarms.types';
import { API_BASE_URL } from '../../../config/constants';

/**
 * Alarm Refresh API
 *
 * Thin wrapper around PanelDataRefreshService + T3Database
 * for alarm-specific operations
 */
export class AlarmRefreshApi {

  // ============================================
  // DEVICE REFRESH (Action 17 via PanelDataRefreshService)
  // ============================================

  /**
   * Refresh all alarms from device and auto-save to database
   *
   * Uses Action 17 (GET_WEBVIEW_LIST) via PanelDataRefreshService
   * Reads indexes 0-31 from device and saves to database
   *
   * NOTE: C++ BacnetWebView.cpp needs update to handle BAC_ALARMS (15) case
   *
   * @param serialNumber - Device serial number
   * @returns Refresh result with counts and status
   */
  static async refreshAllFromDevice(serialNumber: number): Promise<RefreshResult> {
    return PanelDataRefreshService.refreshAllAlarms(serialNumber);
  }

  /**
   * Refresh single alarm from device and auto-save to database
   *
   * Uses Action 17 (GET_WEBVIEW_LIST) via PanelDataRefreshService
   * Reads specific index from device and saves to database
   *
   * NOTE: C++ BacnetWebView.cpp needs update to handle BAC_ALARMS (15) case
   *
   * @param serialNumber - Device serial number
   * @param index - Alarm index (0-31)
   * @returns Refresh result with counts and status
   */
  static async refreshSingleFromDevice(serialNumber: number, index: number): Promise<RefreshResult> {
    return PanelDataRefreshService.refreshSingleAlarm(serialNumber, index);
  }

  // ============================================
  // DATABASE LOAD (Cached data, no device communication)
  // ============================================

  /**
   * Load all alarms from database (cached data)
   *
   * Does NOT communicate with device - returns last saved data
   * Use refreshAllFromDevice() to get fresh data from device
   *
   * @param serialNumber - Device serial number
   * @returns Array of alarms from database
   */
  static async loadAllFromDB(serialNumber: number): Promise<Alarm[]> {
    const db = new T3Database(`${API_BASE_URL}/api`);
    return db.alarms.getAll(serialNumber);
  }

  /**
   * Load single alarm from database by Alarm_ID
   *
   * Does NOT communicate with device - returns last saved data
   * Use refreshSingleFromDevice() to get fresh data from device
   *
   * @param serialNumber - Device serial number
   * @param alarmId - Alarm ID string
   * @returns Alarm if found, undefined otherwise
   */
  static async loadFromDB(serialNumber: number, alarmId: string): Promise<Alarm | undefined> {
    const db = new T3Database(`${API_BASE_URL}/api`);
    const alarms = await db.alarms.getAll(serialNumber);
    return alarms.find(alarm => alarm.Alarm_ID === alarmId);
  }

  /**
   * Load single alarm from database by ID
   *
   * @param id - Alarm database ID (format: serialNumber-alarmId)
   * @returns Alarm if found, undefined otherwise
   */
  static async loadByIdFromDB(id: string): Promise<Alarm | undefined> {
    // Parse the id to get serialNumber and alarmId
    const [serialNumberStr, alarmIdStr] = id.split('-');
    const serialNumber = parseInt(serialNumberStr);
    const alarmId = parseInt(alarmIdStr);

    if (isNaN(serialNumber) || isNaN(alarmId)) {
      return undefined;
    }

    const db = new T3Database(`${API_BASE_URL}/api`);
    return await db.alarms.get(serialNumber, alarmId) || undefined;
  }

  // ============================================
  // FUTURE: Type-specific methods
  // ============================================

  /**
   * Validate alarm data
   *
   * Example placeholder for future validation logic:
   * - Check index range (0-31)
   * - Validate required fields
   * - Check alarm thresholds
   *
   * @param alarm - Alarm to validate
   * @returns Validation result with errors
   */
  static async validate(alarm: Alarm): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Example validations (extend as needed)
    if (alarm.index < 0 || alarm.index > 31) {
      errors.push('Index must be between 0-31');
    }

    if (!alarm.label || alarm.label.trim() === '') {
      errors.push('Label is required');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// Backward compatibility alias
export class AlarmRefreshApiService extends AlarmRefreshApi {}
