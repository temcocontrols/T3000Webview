/**
 * Input Refresh API
 *
 * Wraps PanelDataRefreshService for input-specific operations.
 * Provides both device refresh (via FFI Action 17) and database load methods.
 *
 * Architecture:
 * - Device refresh → delegates to PanelDataRefreshService (shared core)
 * - Database load → direct T3Database calls (cached data)
 * - Future: Add input-specific validation, transformations, etc.
 */

import { PanelDataRefreshService, RefreshResult } from '../../../shared/services/panelDataRefreshService';
import { T3Database } from '../../../../lib/t3-database';
import type { Input } from '../types/input.types';

/**
 * Input Refresh API
 *
 * Thin wrapper around PanelDataRefreshService + T3Database
 * for input-specific operations
 */
export class InputRefreshApi {

  // ============================================
  // DEVICE REFRESH (Action 17 via PanelDataRefreshService)
  // ============================================

  /**
   * Refresh all inputs from device and auto-save to database
   *
   * Uses Action 17 (GET_WEBVIEW_LIST) via PanelDataRefreshService
   * Reads indexes 0-127 from device and saves to database
   *
   * @param serialNumber - Device serial number
   * @returns Refresh result with counts and status
   */
  static async refreshAllFromDevice(serialNumber: number): Promise<RefreshResult> {
    return PanelDataRefreshService.refreshAllInputs(serialNumber);
  }

  /**
   * Refresh single input from device and auto-save to database
   *
   * Uses Action 17 (GET_WEBVIEW_LIST) via PanelDataRefreshService
   * Reads specific index from device and saves to database
   *
   * @param serialNumber - Device serial number
   * @param index - Input index (0-127)
   * @returns Refresh result with counts and status
   */
  static async refreshSingleFromDevice(serialNumber: number, index: number): Promise<RefreshResult> {
    return PanelDataRefreshService.refreshSingleInput(serialNumber, index);
  }

  // ============================================
  // DATABASE LOAD (Cached data, no device communication)
  // ============================================

  /**
   * Load all inputs from database (cached data)
   *
   * Does NOT communicate with device - returns last saved data
   * Use refreshAllFromDevice() to get fresh data from device
   *
   * @param serialNumber - Device serial number
   * @returns Array of inputs from database
   */
  static async loadAllFromDB(serialNumber: number): Promise<Input[]> {
    return T3Database.getAllInputs(serialNumber);
  }

  /**
   * Load single input from database by index
   *
   * Does NOT communicate with device - returns last saved data
   * Use refreshSingleFromDevice() to get fresh data from device
   *
   * @param serialNumber - Device serial number
   * @param index - Input index (0-127)
   * @returns Input if found, undefined otherwise
   */
  static async loadFromDB(serialNumber: number, index: number): Promise<Input | undefined> {
    const inputs = await T3Database.getAllInputs(serialNumber);
    return inputs.find(input => input.index === index);
  }

  /**
   * Load single input from database by ID
   *
   * @param id - Input database ID
   * @returns Input if found, undefined otherwise
   */
  static async loadByIdFromDB(id: string): Promise<Input | undefined> {
    return T3Database.getInputById(id);
  }

  // ============================================
  // FUTURE: Type-specific methods
  // ============================================

  /**
   * Validate input data
   *
   * Example placeholder for future validation logic:
   * - Check index range (0-127)
   * - Validate required fields
   * - Check value ranges
   *
   * @param input - Input to validate
   * @returns Validation result with errors
   */
  static async validate(input: Input): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Example validations (extend as needed)
    if (input.index < 0 || input.index > 127) {
      errors.push('Index must be between 0-127');
    }

    if (!input.label || input.label.trim() === '') {
      errors.push('Label is required');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
