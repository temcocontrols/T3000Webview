/**
 * Graphic Refresh API
 *
 * Wraps existing graphic data operations.
 * Graphics use different FFI actions (Action 0, 1, etc.) not Action 17.
 *
 * NOTE: Graphics are handled differently from point data:
 * - Action 0: GET_PANEL_DATA
 * - Action 1: GET_INITIAL_DATA
 * - Action 2: SAVE_GRAPHIC_DATA
 *
 * This service provides database operations only until graphic refresh
 * is integrated with the unified service pattern.
 */

import { T3Database } from '../../../../lib/t3-database';
import type { Graphic } from '../../../../lib/t3-database/types/graphics.types';
import { API_BASE_URL } from '../../../config/constants';

/**
 * Graphic Refresh API
 *
 * Database operations for graphics
 * TODO: Integrate with Action 0/1 for device refresh
 */
export class GraphicRefreshApi {

  // ============================================
  // DATABASE LOAD (Cached data, no device communication)
  // ============================================

  /**
   * Load all graphics from database (cached data)
   *
   * Does NOT communicate with device - returns last saved data
   *
   * @param serialNumber - Device serial number
   * @returns Array of graphics from database
   */
  static async loadAllFromDB(serialNumber: number): Promise<Graphic[]> {
    const db = new T3Database(`${API_BASE_URL}/api`);
    return db.graphics.getAll(serialNumber);
  }

  /**
   * Load single graphic from database by index
   *
   * Does NOT communicate with device - returns last saved data
   *
   * @param serialNumber - Device serial number
   * @param index - Graphic index
   * @returns Graphic if found, undefined otherwise
   */
  static async loadFromDB(serialNumber: number, index: number): Promise<Graphic | undefined> {
    const db = new T3Database(`${API_BASE_URL}/api`);
    const graphics = await db.graphics.getAll(serialNumber);
    return graphics.find(graphic => graphic.index === index);
  }

  /**
   * Load single graphic from database by ID
   *
   * @param id - Graphic database ID
   * @returns Graphic if found, undefined otherwise
   */
  static async loadByIdFromDB(id: string): Promise<Graphic | undefined> {
    // Parse the id to get serialNumber and graphicId
    const [serialNumberStr, graphicIdStr] = id.split('-');
    const serialNumber = parseInt(serialNumberStr);
    const graphicId = parseInt(graphicIdStr);

    if (isNaN(serialNumber) || isNaN(graphicId)) {
      return undefined;
    }

    const db = new T3Database(`${API_BASE_URL}/api`);
    return await db.graphics.get(serialNumber, graphicId) || undefined;
  }

  /**
   * Refresh all graphics from device
   *
   * TODO: Implement using Action 0 (GET_PANEL_DATA) or Action 1 (GET_INITIAL_DATA)
   * Graphics use different actions than point data (not Action 17)
   *
   * @param serialNumber - Device serial number
   */
  static async refreshAllFromDevice(serialNumber: number): Promise<any> {
    throw new Error('GraphicRefreshApi.refreshAllFromDevice not yet implemented - use Action 0/1');
  }

  /**
   * Refresh single graphic from device
   *
   * TODO: Implement using Action 7 (LOAD_GRAPHIC_ENTRY)
   *
   * @param serialNumber - Device serial number
   * @param index - Graphic index
   */
  static async refreshSingleFromDevice(serialNumber: number, index: number): Promise<any> {
    throw new Error('GraphicRefreshApi.refreshSingleFromDevice not yet implemented - use Action 7');
  }
}

// Backward compatibility alias
export class GraphicRefreshApiService extends GraphicRefreshApi {}
