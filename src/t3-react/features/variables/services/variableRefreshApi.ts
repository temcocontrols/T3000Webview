/**
 * Variable Refresh API
 *
 * Wraps PanelDataRefreshService for variable-specific operations.
 * Provides both device refresh (via FFI Action 17) and database load methods.
 *
 * Architecture:
 * - Device refresh → delegates to PanelDataRefreshService (shared core)
 * - Database load → direct T3Database calls (cached data)
 * - Future: Add variable-specific validation, transformations, etc.
 */

import { PanelDataRefreshService, RefreshResult } from '../../../shared/services/panelDataRefreshService';
import { T3Database } from '../../../../lib/t3-database';
import type { Variable } from '../types/variable.types';

/**
 * Variable Refresh API
 *
 * Thin wrapper around PanelDataRefreshService + T3Database
 * for variable-specific operations
 */
export class VariableRefreshApi {

  // ============================================
  // DEVICE REFRESH (Action 17 via PanelDataRefreshService)
  // ============================================

  /**
   * Refresh all variables from device and auto-save to database
   *
   * Uses Action 17 (GET_WEBVIEW_LIST) via PanelDataRefreshService
   * Reads indexes 0-63 from device and saves to database
   *
   * @param serialNumber - Device serial number
   * @returns Refresh result with counts and status
   */
  static async refreshAllFromDevice(serialNumber: number): Promise<RefreshResult> {
    return PanelDataRefreshService.refreshAllVariables(serialNumber);
  }

  /**
   * Refresh single variable from device and auto-save to database
   *
   * Uses Action 17 (GET_WEBVIEW_LIST) via PanelDataRefreshService
   * Reads specific index from device and saves to database
   *
   * @param serialNumber - Device serial number
   * @param index - Variable index (0-63)
   * @returns Refresh result with counts and status
   */
  static async refreshSingleFromDevice(serialNumber: number, index: number): Promise<RefreshResult> {
    return PanelDataRefreshService.refreshSingleVariable(serialNumber, index);
  }

  // ============================================
  // DATABASE LOAD (Cached data, no device communication)
  // ============================================

  /**
   * Load all variables from database (cached data)
   *
   * Does NOT communicate with device - returns last saved data
   * Use refreshAllFromDevice() to get fresh data from device
   *
   * @param serialNumber - Device serial number
   * @returns Array of variables from database
   */
  static async loadAllFromDB(serialNumber: number): Promise<Variable[]> {
    return T3Database.getAllVariables(serialNumber);
  }

  /**
   * Load single variable from database by index
   *
   * Does NOT communicate with device - returns last saved data
   * Use refreshSingleFromDevice() to get fresh data from device
   *
   * @param serialNumber - Device serial number
   * @param index - Variable index (0-63)
   * @returns Variable if found, undefined otherwise
   */
  static async loadFromDB(serialNumber: number, index: number): Promise<Variable | undefined> {
    const variables = await T3Database.getAllVariables(serialNumber);
    return variables.find(variable => variable.index === index);
  }

  /**
   * Load single variable from database by ID
   *
   * @param id - Variable database ID
   * @returns Variable if found, undefined otherwise
   */
  static async loadByIdFromDB(id: string): Promise<Variable | undefined> {
    return T3Database.getVariableById(id);
  }

  // ============================================
  // FUTURE: Type-specific methods
  // ============================================

  /**
   * Validate variable data
   *
   * Example placeholder for future validation logic:
   * - Check index range (0-63)
   * - Validate required fields
   * - Check value ranges
   *
   * @param variable - Variable to validate
   * @returns Validation result with errors
   */
  static async validate(variable: Variable): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Example validations (extend as needed)
    if (variable.index < 0 || variable.index > 63) {
      errors.push('Index must be between 0-63');
    }

    if (!variable.label || variable.label.trim() === '') {
      errors.push('Label is required');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
