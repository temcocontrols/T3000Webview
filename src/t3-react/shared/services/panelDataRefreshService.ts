/**
 * Panel Data Refresh Service
 *
 * Uses t3-transport library to refresh inputs/outputs/variables from device
 * Action 17: GET_WEBVIEW_LIST
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
 *
 * USING Action 17 (GET_WEBVIEW_LIST) - Reads FRESH data FROM DEVICE
 *
 * NOTE: Action 15 (LOGGING_DATA) is DISABLED in C++ by enable_trendlog_background_read flag
 */
export class PanelDataRefreshService {
  /**
   * Refresh inputs/outputs/variables from device using GET_WEBVIEW_LIST (Action 17)
   * Reads FRESH data from device using GetPrivateDataSaveSPBlocking()
   *
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

      console.log(`[PanelDataRefreshService] Calling Action 17 (GET_WEBVIEW_LIST) for ${type} (entryType=${entryType}${index !== undefined ? `, index=${index}` : ''})`);

      // Call Action 17: GET_WEBVIEW_LIST
      let response;
      if (index !== undefined) {
        // Single item refresh
        response = await transport.refreshDeviceRecords(serialNumber, entryType, index, index);
      } else {
        // All items refresh - refreshDeviceRecords will set correct start/end indexes
        response = await transport.refreshDeviceRecords(serialNumber, entryType);
      }

      /* COMMENTED OUT - Action 15 implementation (disabled in C++ by default)
      console.log(`[PanelDataRefreshService] Calling Action 15 (LOGGING_DATA) for ${type} (entryType=${entryType}${index !== undefined ? `, index=${index}` : ''})`);

      // Call Action 15: LOGGING_DATA - Gets all inputs, outputs, and variables
      const response = await transport.getFullDeviceData(serialNumber);
      */

      // Disconnect transport
      await transport.disconnect();

      // Check if response has data
      if (!response || !response.data) {
        throw new Error('No data received from device');
      }

      // Debug: Log the response structure
      console.log('[PanelDataRefreshService] Response structure:', JSON.stringify(response, null, 2).substring(0, 500));

      // Extract items from response - Action 17 returns device_data array
      // Response structure can be: response.data.device_data OR response.data.data.device_data
      let items: any[] = [];

      if (response.data.device_data && Array.isArray(response.data.device_data)) {
        items = response.data.device_data;
        console.log('[PanelDataRefreshService] Found items at response.data.device_data');
      } else if (response.data.data?.device_data && Array.isArray(response.data.data.device_data)) {
        items = response.data.data.device_data;
        console.log('[PanelDataRefreshService] Found items at response.data.data.device_data');
      } else {
        console.error('[PanelDataRefreshService] Could not find device_data array in response:', response);
      }

      /* COMMENTED OUT - Action 15 data extraction
      // Extract items from response - Action 15 returns inputs/outputs/variables arrays
      let items: any[] = [];

      if (type === 'input' && response.data.inputs) {
        items = response.data.inputs;
      } else if (type === 'output' && response.data.outputs) {
        items = response.data.outputs;
      } else if (type === 'variable' && response.data.variables) {
        items = response.data.variables;
      }
      */

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
        message: `Refreshed ${items.length} ${type}(s) from device, saved ${savedCount} to database`,
        itemCount: items.length,
        savedCount,
        timestamp,
      };

    } catch (error) {
      console.error(`[PanelDataRefreshService] Refresh failed:`, error);
      throw error;
    }
  }

  /* ============================================================================
   * COMMENTED OUT - Action 17 implementation (not debugged yet)
   * TODO: Uncomment and use this when Action 17 is ready
   * ============================================================================
  static async refreshFromDevice_Action17(options: RefreshOptions): Promise<RefreshResult> {
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

      console.log(`[PanelDataRefreshService] Calling Action 17 (GET_WEBVIEW_LIST) for ${type} (entryType=${entryType}${index !== undefined ? `, index=${index}` : ''})`);

      // Call Action 17: GET_WEBVIEW_LIST
      let response;
      if (index !== undefined) {
        // Single item refresh - use send() with index
        response = await transport.send(WebViewMessageType.GET_WEBVIEW_LIST, {
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
  ============================================================================ */

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
      const savedCount = result.updatedCount;
      console.log(`[PanelDataRefreshService] Saved ${savedCount}/${items.length} ${type}(s) to database (${result.updatedCount} updated, ${result.failedCount} failed)`);
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
      const indexValue = item.index?.toString() || item.inputIndex;
      transformed.inputIndex = indexValue;
      transformed.inputId = indexValue ? `IN${parseInt(indexValue) + 1}` : undefined;  // Format as IN1, IN2, IN3, etc. (1-based)
      transformed.panel = item.pid?.toString() || item.panel;  // C++ sends 'pid' (panel ID)
      transformed.fullLabel = item.description || item.full_label || item.fullLabel;  // C++ sends 'description'
      transformed.autoManual = item.auto_manual?.toString() || item.autoManual;
      transformed.fValue = item.value?.toString() || item.fValue;
      transformed.units = item.unit?.toString() || item.units;  // C++ sends 'unit' not 'units'
      transformed.rangeField = item.range?.toString() || item.rangeField;  // FIXED: Backend expects rangeField
      transformed.calibration = item.calibration_h?.toString() || item.calibration;  // C++ sends 'calibration_h'
      transformed.sign = item.calibration_sign?.toString() || item.sign;  // C++ sends 'calibration_sign'
      transformed.filterField = item.filter?.toString() || item.filterField;
      transformed.status = item.decom?.toString() || item.status;  // C++ sends 'decom'
      transformed.label = item.label;
      transformed.digitalAnalog = item.digital_analog?.toString() || item.digitalAnalog;
    } else if (type === 'output') {
      const indexValue = item.index?.toString() || item.outputIndex;
      transformed.outputIndex = indexValue;
      transformed.outputId = indexValue ? `OUT${parseInt(indexValue) + 1}` : undefined;  // Format as OUT1, OUT2, OUT3, etc. (1-based)
      transformed.panel = item.pid?.toString() || item.panel;  // C++ sends 'pid' (panel ID)
      transformed.fullLabel = item.description || item.full_label || item.fullLabel;  // C++ sends 'description'
      transformed.autoManual = item.auto_manual?.toString() || item.autoManual;
      transformed.fValue = item.value?.toString() || item.fValue;
      transformed.units = item.unit?.toString() || item.units;  // C++ sends 'unit' not 'units'
      transformed.rangeField = item.range?.toString() || item.rangeField;  // FIXED: Backend expects rangeField
      transformed.calibration = item.calibration_h?.toString() || item.calibration;  // C++ sends 'calibration_h'
      transformed.sign = item.calibration_sign?.toString() || item.sign;  // C++ sends 'calibration_sign'
      transformed.filterField = item.filter?.toString() || item.filterField;
      transformed.status = item.decom?.toString() || item.status;  // C++ sends 'decom'
      transformed.label = item.label;
      transformed.digitalAnalog = item.digital_analog?.toString() || item.digitalAnalog;
    } else if (type === 'variable') {
      const indexValue = item.index?.toString() || item.variableIndex;
      transformed.variableIndex = indexValue;
      transformed.variableId = indexValue ? `VAR${parseInt(indexValue) + 1}` : undefined;  // Format as VAR1, VAR2, VAR3, etc. (1-based)
      transformed.panel = item.pid?.toString() || item.panel;  // C++ sends 'pid' (panel ID)
      transformed.fullLabel = item.description || item.full_label || item.fullLabel;  // C++ sends 'description'
      transformed.autoManual = item.auto_manual?.toString() || item.autoManual;
      transformed.fValue = item.value?.toString() || item.fValue;
      transformed.units = item.unit?.toString() || item.units;  // C++ sends 'unit' not 'units'
      transformed.rangeField = item.range?.toString() || item.rangeField;  // FIXED: Backend expects rangeField
      transformed.calibration = item.calibration_h?.toString() || item.calibration;  // C++ sends 'calibration_h'
      transformed.sign = item.calibration_sign?.toString() || item.sign;  // C++ sends 'calibration_sign'
      transformed.filterField = item.filter?.toString() || item.filterField;
      transformed.status = item.decom?.toString() || item.status;  // C++ sends 'decom'
      transformed.label = item.label;
      transformed.digitalAnalog = item.digital_analog?.toString() || item.digitalAnalog;
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
