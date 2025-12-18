/**
 * Panel Data Refresh Service
 *
 * Uses t3-transport library to refresh inputs/outputs/variables from device
 * Action 17: REFRESH_WEBVIEW_LIST
 *
 * Replaces old API route-based refresh with direct FFI calls via t3-transport
 */

import { T3Transport } from '../../../lib/t3-transport/core/T3Transport';
import { EntryType, WebViewMessageType } from '../../../lib/t3-transport/types/message-enums';
import { T3Database } from '../../../lib/t3-database';
import { API_BASE_URL } from '../../config/constants';

export type PointType = 'input' | 'output' | 'variable';

export interface RefreshOptions {
  serialNumber: number;
  type: PointType;
  index?: number;
}

export interface RefreshResult {
  success: boolean;
  message: string;
  itemCount: number;
  savedCount: number;
  timestamp: string;
}

/**
 * Panel Data Refresh Service
 * Implements Action 17 (REFRESH_WEBVIEW_LIST) using t3-transport
 */
export class PanelDataRefreshService {
  /**
   * Refresh inputs/outputs/variables from device using FFI
   * @param options - Refresh configuration
   * @returns Refresh result with counts
   */
  static async refreshFromDevice(options: RefreshOptions): Promise<RefreshResult> {
    const { serialNumber, type, index } = options;
    const timestamp = new Date().toISOString();

    try {
      // Initialize T3Transport with FFI
      const transport = new T3Transport({
        apiBaseUrl: `${API_BASE_URL}/api`
      });

      await transport.connect('ffi');

      // Map type to entryType: 0=OUTPUT, 1=INPUT, 2=VARIABLE
      const entryType = type === 'output' ? EntryType.OUTPUT :
                        type === 'input' ? EntryType.INPUT :
                        EntryType.VARIABLE;

      console.log(`[PanelDataRefreshService] Calling Action 17 (REFRESH_WEBVIEW_LIST) for ${type} (entryType=${entryType}${index !== undefined ? `, index=${index}` : ''})`);

      // Call Action 17: REFRESH_WEBVIEW_LIST
      let response;
      if (index !== undefined) {
        // Single item refresh - use send() with index
        response = await transport.send(WebViewMessageType.REFRESH_WEBVIEW_LIST, {
          serialNumber,
          entryType,
          index
        });
      } else {
        // All items refresh - use convenience method
        response = await transport.refreshDeviceRecords(serialNumber, entryType);
      }

      // Disconnect transport
      await transport.disconnect();

      // Check if response has data
      if (!response || !response.data) {
        throw new Error('No data received from device');
      }

      // Extract items from response based on type
      let items: any[] = [];
      if (response.data.items) {
        items = response.data.items;
      } else if (response.data.inputs) {
        items = response.data.inputs;
      } else if (response.data.outputs) {
        items = response.data.outputs;
      } else if (response.data.variables) {
        items = response.data.variables;
      }

      console.log(`[PanelDataRefreshService] Received ${items.length} ${type}(s) from device`);

      if (items.length === 0) {
        return {
          success: true,
          message: `No ${type}s found on device`,
          itemCount: 0,
          savedCount: 0,
          timestamp,
        };
      }

      // Save to database using T3Database
      const savedCount = await this.saveToDatabase(serialNumber, type, items);

      return {
        success: true,
        message: `Refreshed ${items.length} ${type}(s), saved ${savedCount} to database`,
        itemCount: items.length,
        savedCount,
        timestamp,
      };

    } catch (error) {
      console.error(`[PanelDataRefreshService] Refresh failed:`, error);
      throw error;
    }
  }

  /**
   * Save refreshed data to database
   * @param serialNumber - Device serial number
   * @param type - Point type (input/output/variable)
   * @param items - Array of items from device
   * @returns Number of items successfully saved
   */
  private static async saveToDatabase(
    serialNumber: number,
    type: PointType,
    items: any[]
  ): Promise<number> {
    const db = new T3Database(`${API_BASE_URL}/api`);

    // Transform all items to match database schema
    const transformedItems = items.map(item =>
      this.transformItem(serialNumber, type, item)
    );

    // Get the appropriate database entity
    const entity = type === 'input' ? db.inputs :
                   type === 'output' ? db.outputs :
                   db.variables;

    try {
      // Use batch save for efficient database operations
      const result = await entity.batchSave(serialNumber, transformedItems);
      const savedCount = result.inserted + result.updated;
      console.log(`[PanelDataRefreshService] Saved ${savedCount}/${items.length} ${type}(s) to database (${result.inserted} inserted, ${result.updated} updated)`);
      return savedCount;
    } catch (error) {
      console.error(`[PanelDataRefreshService] Failed to batch save ${type}s:`, error);
      throw error;
    }
  }

  /**
   * Transform item from FFI response to database format
   * @param serialNumber - Device serial number
   * @param type - Point type
   * @param item - Item from FFI response
   * @returns Transformed item for database
   */
  private static transformItem(serialNumber: number, type: PointType, item: any): any {
    // Common fields
    const transformed: any = {
      serialNumber,
    };

    // Add type-specific fields
    if (type === 'input') {
      transformed.inputIndex = item.index?.toString() || item.inputIndex;
      transformed.fullLabel = item.full_label || item.fullLabel;
      transformed.autoManual = item.auto_manual?.toString() || item.autoManual;
      transformed.fValue = item.value?.toString() || item.fValue;
      transformed.units = item.units;
      transformed.range = item.range?.toString() || item.range;
      transformed.calibration = item.calibration?.toString() || item.calibration;
      transformed.sign = item.sign?.toString() || item.sign;
      transformed.filterField = item.filter?.toString() || item.filterField;
      transformed.status = item.status?.toString() || item.status;
      transformed.label = item.label;
      transformed.digitalAnalog = item.digital_analog?.toString() || item.digitalAnalog;
    } else if (type === 'output') {
      transformed.outputIndex = item.index?.toString() || item.outputIndex;
      transformed.fullLabel = item.full_label || item.fullLabel;
      transformed.autoManual = item.auto_manual?.toString() || item.autoManual;
      transformed.fValue = item.value?.toString() || item.fValue;
      transformed.units = item.units;
      transformed.range = item.range?.toString() || item.range;
      transformed.lowVoltage = item.low_voltage?.toString() || item.lowVoltage;
      transformed.highVoltage = item.high_voltage?.toString() || item.highVoltage;
      transformed.label = item.label;
    } else if (type === 'variable') {
      transformed.variableIndex = item.index?.toString() || item.variableIndex;
      transformed.fullLabel = item.full_label || item.fullLabel;
      transformed.autoManual = item.auto_manual?.toString() || item.autoManual;
      transformed.fValue = item.value?.toString() || item.fValue;
      transformed.units = item.units;
      transformed.label = item.label;
    }

    return transformed;
  }

  /**
   * Refresh all inputs for a device
   */
  static async refreshAllInputs(serialNumber: number): Promise<RefreshResult> {
    return this.refreshFromDevice({ serialNumber, type: 'input' });
  }

  /**
   * Refresh single input for a device
   */
  static async refreshSingleInput(serialNumber: number, index: number): Promise<RefreshResult> {
    return this.refreshFromDevice({ serialNumber, type: 'input', index });
  }

  /**
   * Refresh all outputs for a device
   */
  static async refreshAllOutputs(serialNumber: number): Promise<RefreshResult> {
    return this.refreshFromDevice({ serialNumber, type: 'output' });
  }

  /**
   * Refresh single output for a device
   */
  static async refreshSingleOutput(serialNumber: number, index: number): Promise<RefreshResult> {
    return this.refreshFromDevice({ serialNumber, type: 'output', index });
  }

  /**
   * Refresh all variables for a device
   */
  static async refreshAllVariables(serialNumber: number): Promise<RefreshResult> {
    return this.refreshFromDevice({ serialNumber, type: 'variable' });
  }

  /**
   * Refresh single variable for a device
   */
  static async refreshSingleVariable(serialNumber: number, index: number): Promise<RefreshResult> {
    return this.refreshFromDevice({ serialNumber, type: 'variable', index });
  }
}

export default PanelDataRefreshService;
