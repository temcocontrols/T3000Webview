/**
 * Output Refresh API
 *
 * Wraps PanelDataRefreshService for output-specific operations.
 * Provides both device refresh (via FFI Action 17) and database load methods.
 *
 * Architecture:
 * - Device refresh → delegates to PanelDataRefreshService (shared core)
 * - Database load → direct T3Database calls (cached data)
 * - Future: Add output-specific validation, transformations, etc.
 */

import { PanelDataRefreshService, RefreshResult } from '../../../shared/services/panelDataRefreshService';
import { T3Database } from '../../../../lib/t3-database';
import type { Output } from '../types/output.types';

/**
 * Output Refresh API
 *
 * Thin wrapper around PanelDataRefreshService + T3Database
 * for output-specific operations
 */
export class OutputRefreshApi {

  // ============================================
  // DEVICE REFRESH (Action 17 via PanelDataRefreshService)
  // ============================================

  /**
   * Refresh all outputs from device and auto-save to database
   *
   * Uses Action 17 (GET_WEBVIEW_LIST) via PanelDataRefreshService
   * Reads indexes 0-63 from device and saves to database
   *
   * @param serialNumber - Device serial number
   * @returns Refresh result with counts and status
   */
  static async refreshAllFromDevice(serialNumber: number): Promise<RefreshResult> {
    return PanelDataRefreshService.refreshAllOutputs(serialNumber);
  }

  /**
   * Refresh single output from device and auto-save to database
   *
   * Uses Action 17 (GET_WEBVIEW_LIST) via PanelDataRefreshService
   * Reads specific index from device and saves to database
   *
   * @param serialNumber - Device serial number
   * @param index - Output index (0-63)
   * @returns Refresh result with counts and status
   */
  static async refreshSingleFromDevice(serialNumber: number, index: number): Promise<RefreshResult> {
    return PanelDataRefreshService.refreshSingleOutput(serialNumber, index);
  }

  // ============================================
  // DATABASE LOAD (Cached data, no device communication)
  // ============================================

  /**
   * Load all outputs from database (cached data)
   *
   * Does NOT communicate with device - returns last saved data
   * Use refreshAllFromDevice() to get fresh data from device
   *
   * @param serialNumber - Device serial number
   * @returns Array of outputs from database
   */
  static async loadAllFromDB(serialNumber: number): Promise<Output[]> {
    return T3Database.getAllOutputs(serialNumber);
  }

  /**
   * Load single output from database by index
   *
   * Does NOT communicate with device - returns last saved data
   * Use refreshSingleFromDevice() to get fresh data from device
   *
   * @param serialNumber - Device serial number
   * @param index - Output index (0-63)
   * @returns Output if found, undefined otherwise
   */
  static async loadFromDB(serialNumber: number, index: number): Promise<Output | undefined> {
    const outputs = await T3Database.getAllOutputs(serialNumber);
    return outputs.find(output => output.index === index);
  }

  /**
   * Load single output from database by ID
   *
   * @param id - Output database ID
   * @returns Output if found, undefined otherwise
   */
  static async loadByIdFromDB(id: string): Promise<Output | undefined> {
    return T3Database.getOutputById(id);
  }

  // ============================================
  // FUTURE: Type-specific methods
  // ============================================

  /**
   * Validate output data
   *
   * Example placeholder for future validation logic:
   * - Check index range (0-63)
   * - Validate required fields
   * - Check value ranges
   *
   * @param output - Output to validate
   * @returns Validation result with errors
   */
  static async validate(output: Output): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Example validations (extend as needed)
    if (output.index < 0 || output.index > 63) {
      errors.push('Index must be between 0-63');
    }

    if (!output.label || output.label.trim() === '') {
      errors.push('Label is required');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
