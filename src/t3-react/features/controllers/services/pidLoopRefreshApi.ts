/**
 * PID Loop Refresh API
 *
 * Wraps PanelDataRefreshService for PID loop-specific operations.
 * Provides both device refresh (via FFI Action 17) and database load methods.
 *
 * Architecture:
 * - Device refresh → delegates to PanelDataRefreshService (shared core)
 * - Database load → direct T3Database calls (cached data)
 * - Future: Add PID loop-specific validation, transformations, etc.
 */

import { PanelDataRefreshService, RefreshResult } from '../../../shared/services/panelDataRefreshService';
import { T3Database } from '../../../../lib/t3-database';
import type { Controller } from '../types/controller.types';

/**
 * PID Loop Refresh API
 *
 * Thin wrapper around PanelDataRefreshService + T3Database
 * for PID loop-specific operations
 */
export class PidLoopRefreshApi {

  // ============================================
  // DEVICE REFRESH (Action 17 via PanelDataRefreshService)
  // ============================================

  /**
   * Refresh all PID loops from device and auto-save to database
   *
   * Uses Action 17 (GET_WEBVIEW_LIST) via PanelDataRefreshService
   * Reads indexes 0-15 from device and saves to database
   *
   * NOTE: C++ BacnetWebView.cpp needs update to handle BAC_PID (3) case
   *
   * @param serialNumber - Device serial number
   * @returns Refresh result with counts and status
   */
  static async refreshAllFromDevice(serialNumber: number): Promise<RefreshResult> {
    return PanelDataRefreshService.refreshAllPidLoops(serialNumber);
  }

  /**
   * Refresh single PID loop from device and auto-save to database
   *
   * Uses Action 17 (GET_WEBVIEW_LIST) via PanelDataRefreshService
   * Reads specific index from device and saves to database
   *
   * NOTE: C++ BacnetWebView.cpp needs update to handle BAC_PID (3) case
   *
   * @param serialNumber - Device serial number
   * @param index - PID loop index (0-15)
   * @returns Refresh result with counts and status
   */
  static async refreshSingleFromDevice(serialNumber: number, index: number): Promise<RefreshResult> {
    return PanelDataRefreshService.refreshSinglePidLoop(serialNumber, index);
  }

  // ============================================
  // DATABASE LOAD (Cached data, no device communication)
  // ============================================

  /**
   * Load all PID loops from database (cached data)
   *
   * Does NOT communicate with device - returns last saved data
   * Use refreshAllFromDevice() to get fresh data from device
   *
   * @param serialNumber - Device serial number
   * @returns Array of PID loops from database
   */
  static async loadAllFromDB(serialNumber: number): Promise<Controller[]> {
    return T3Database.getAllControllers(serialNumber);
  }

  /**
   * Load single PID loop from database by index
   *
   * Does NOT communicate with device - returns last saved data
   * Use refreshSingleFromDevice() to get fresh data from device
   *
   * @param serialNumber - Device serial number
   * @param index - PID loop index (0-15)
   * @returns PID loop if found, undefined otherwise
   */
  static async loadFromDB(serialNumber: number, index: number): Promise<Controller | undefined> {
    const controllers = await T3Database.getAllControllers(serialNumber);
    return controllers.find(controller => controller.index === index);
  }

  /**
   * Load single PID loop from database by ID
   *
   * @param id - PID loop database ID
   * @returns PID loop if found, undefined otherwise
   */
  static async loadByIdFromDB(id: string): Promise<Controller | undefined> {
    return T3Database.getControllerById(id);
  }

  // ============================================
  // FUTURE: Type-specific methods
  // ============================================

  /**
   * Validate PID loop data
   *
   * Example placeholder for future validation logic:
   * - Check index range (0-15)
   * - Validate required fields
   * - Check PID parameters (Kp, Ki, Kd)
   *
   * @param controller - PID loop to validate
   * @returns Validation result with errors
   */
  static async validate(controller: Controller): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Example validations (extend as needed)
    if (controller.index < 0 || controller.index > 15) {
      errors.push('Index must be between 0-15');
    }

    if (!controller.label || controller.label.trim() === '') {
      errors.push('Label is required');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
