/**
 * Program Refresh API
 *
 * Wraps PanelDataRefreshService for program-specific operations.
 * Provides both device refresh (via FFI Action 17) and database load methods.
 *
 * Architecture:
 * - Device refresh → delegates to PanelDataRefreshService (shared core)
 * - Database load → direct T3Database calls (cached data)
 * - Future: Add program-specific validation, transformations, etc.
 */

import { PanelDataRefreshService, RefreshResult } from '../../../shared/services/panelDataRefreshService';
import { T3Database } from '../../../../lib/t3-database';
import type { Program } from '../types/program.types';

/**
 * Program Refresh API
 *
 * Thin wrapper around PanelDataRefreshService + T3Database
 * for program-specific operations
 */
export class ProgramRefreshApi {

  // ============================================
  // DEVICE REFRESH (Action 17 via PanelDataRefreshService)
  // ============================================

  /**
   * Refresh all programs from device and auto-save to database
   *
   * Uses Action 17 (GET_WEBVIEW_LIST) via PanelDataRefreshService
   * Reads indexes 0-15 from device and saves to database
   *
   * NOTE: C++ BacnetWebView.cpp needs update to handle BAC_PRG (6) case
   *
   * @param serialNumber - Device serial number
   * @returns Refresh result with counts and status
   */
  static async refreshAllFromDevice(serialNumber: number): Promise<RefreshResult> {
    return PanelDataRefreshService.refreshAllPrograms(serialNumber);
  }

  /**
   * Refresh single program from device and auto-save to database
   *
   * Uses Action 17 (GET_WEBVIEW_LIST) via PanelDataRefreshService
   * Reads specific index from device and saves to database
   *
   * NOTE: C++ BacnetWebView.cpp needs update to handle BAC_PRG (6) case
   *
   * @param serialNumber - Device serial number
   * @param index - Program index (0-15)
   * @returns Refresh result with counts and status
   */
  static async refreshSingleFromDevice(serialNumber: number, index: number): Promise<RefreshResult> {
    return PanelDataRefreshService.refreshSingleProgram(serialNumber, index);
  }

  // ============================================
  // DATABASE LOAD (Cached data, no device communication)
  // ============================================

  /**
   * Load all programs from database (cached data)
   *
   * Does NOT communicate with device - returns last saved data
   * Use refreshAllFromDevice() to get fresh data from device
   *
   * @param serialNumber - Device serial number
   * @returns Array of programs from database
   */
  static async loadAllFromDB(serialNumber: number): Promise<Program[]> {
    return T3Database.getAllPrograms(serialNumber);
  }

  /**
   * Load single program from database by index
   *
   * Does NOT communicate with device - returns last saved data
   * Use refreshSingleFromDevice() to get fresh data from device
   *
   * @param serialNumber - Device serial number
   * @param index - Program index (0-15)
   * @returns Program if found, undefined otherwise
   */
  static async loadFromDB(serialNumber: number, index: number): Promise<Program | undefined> {
    const programs = await T3Database.getAllPrograms(serialNumber);
    return programs.find(program => program.index === index);
  }

  /**
   * Load single program from database by ID
   *
   * @param id - Program database ID
   * @returns Program if found, undefined otherwise
   */
  static async loadByIdFromDB(id: string): Promise<Program | undefined> {
    return T3Database.getProgramById(id);
  }

  // ============================================
  // FUTURE: Type-specific methods
  // ============================================

  /**
   * Validate program data
   *
   * Example placeholder for future validation logic:
   * - Check index range (0-15)
   * - Validate required fields
   * - Check program code syntax
   *
   * @param program - Program to validate
   * @returns Validation result with errors
   */
  static async validate(program: Program): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Example validations (extend as needed)
    if (program.index < 0 || program.index > 15) {
      errors.push('Index must be between 0-15');
    }

    if (!program.label || program.label.trim() === '') {
      errors.push('Label is required');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
