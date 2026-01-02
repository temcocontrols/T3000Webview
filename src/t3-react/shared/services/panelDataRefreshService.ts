/**
 * Panel Data Refresh Service
 *
 * Uses t3-transport library to refresh all point types from device:
 * - Inputs, Outputs, Variables
 * - Programs, Schedules, PID Loops, Holidays
 *
 * Action 17: GET_WEBVIEW_LIST
 *
 * Replaces old API route-based refresh with direct FFI calls via t3-transport
 */

import { T3Transport } from '../../../lib/t3-transport/core/T3Transport';
import { EntryType, WebViewMessageType } from '../../../lib/t3-transport/types/message-enums';
import { T3Database } from '../../../lib/t3-database';
import { API_BASE_URL } from '../../config/constants';

export type PointType = 'input' | 'output' | 'variable' | 'program' | 'schedule' | 'pidloop' | 'holiday' | 'trendlog' | 'alarm';

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
   * Refresh point data from device using GET_WEBVIEW_LIST (Action 17)
   * Reads FRESH data from device using GetPrivateDataSaveSPBlocking()
   * Supports all point types: input, output, variable, program, schedule, pidloop, holiday
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

      // Map type to entryType: 0=OUTPUT, 1=INPUT, 2=VARIABLE, 3=CONTROLLER, 4=SCHEDULE, 5=ANNUAL, 6=PROGRAM, 7=TABLE, 15=ALARMS
      const entryTypeMap: Record<PointType, EntryType> = {
        'output': EntryType.OUTPUT,          // BAC_OUT = 0
        'input': EntryType.INPUT,            // BAC_IN = 1
        'variable': EntryType.VARIABLE,      // BAC_VAR = 2
        'pidloop': EntryType.CONTROLLER,     // BAC_PID = 3
        'schedule': EntryType.SCHEDULE,      // BAC_SCH = 4
        'holiday': EntryType.ANNUAL,         // BAC_HOL = 5
        'program': EntryType.PROGRAM,        // BAC_PRG = 6
        'trendlog': EntryType.TABLE,         // BAC_TBL = 7
        'alarm': EntryType.ALARMS,           // BAC_ALARMS = 15
      };

      const entryType = entryTypeMap[type];

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
   * @param type - Point type (input/output/variable/program/schedule/pidloop/holiday)
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
    const entityMap: Record<PointType, any> = {
      'input': db.inputs,
      'output': db.outputs,
      'variable': db.variables,
      'program': db.programs,
      'schedule': db.schedules,
      'pidloop': db.pidLoops,
      'holiday': db.holidays,
    };

    const entity = entityMap[type];

    if (!entity) {
      throw new Error(`Unsupported point type: ${type}`);
    }

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
    } else if (type === 'program') {
      // Program transformation - pass through for now, backend will handle
      const indexValue = item.index?.toString() || item.programIndex;
      transformed.programIndex = indexValue;
      transformed.programId = indexValue ? `PRG${parseInt(indexValue) + 1}` : undefined;
      transformed.panel = item.pid?.toString() || item.panel;
      transformed.fullLabel = item.description || item.full_label || item.fullLabel;
      transformed.label = item.label;
      // Copy all other fields as-is
      Object.assign(transformed, item);
    } else if (type === 'schedule') {
      // Schedule transformation - pass through for now, backend will handle
      const indexValue = item.index?.toString() || item.scheduleIndex;
      transformed.scheduleIndex = indexValue;
      transformed.scheduleId = indexValue ? `SCH${parseInt(indexValue) + 1}` : undefined;
      transformed.panel = item.pid?.toString() || item.panel;
      transformed.fullLabel = item.description || item.full_label || item.fullLabel;
      transformed.label = item.label;
      // Copy all other fields as-is
      Object.assign(transformed, item);
    } else if (type === 'pidloop') {
      // PID Loop transformation - pass through for now, backend will handle
      const indexValue = item.index?.toString() || item.pidLoopIndex;
      transformed.pidLoopIndex = indexValue;
      transformed.pidLoopId = indexValue ? `PID${parseInt(indexValue) + 1}` : undefined;
      transformed.panel = item.pid?.toString() || item.panel;
      transformed.fullLabel = item.description || item.full_label || item.fullLabel;
      transformed.label = item.label;
      // Copy all other fields as-is
      Object.assign(transformed, item);
    } else if (type === 'holiday') {
      // Holiday transformation - pass through for now, backend will handle
      const indexValue = item.index?.toString() || item.holidayIndex;
      transformed.holidayIndex = indexValue;
      transformed.holidayId = indexValue ? `HOL${parseInt(indexValue) + 1}` : undefined;
      transformed.panel = item.pid?.toString() || item.panel;
      transformed.fullLabel = item.description || item.full_label || item.fullLabel;
      transformed.label = item.label;
      // Copy all other fields as-is
      Object.assign(transformed, item);
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

  /**
   * Refresh all programs for a device
   */
  static async refreshAllPrograms(serialNumber: number): Promise<RefreshResult> {
    return this.refreshFromDevice({ serialNumber, type: 'program' });
  }

  /**
   * Refresh single program for a device
   */
  static async refreshSingleProgram(serialNumber: number, index: number): Promise<RefreshResult> {
    return this.refreshFromDevice({ serialNumber, type: 'program', index });
  }

  /**
   * Refresh all schedules for a device
   */
  static async refreshAllSchedules(serialNumber: number): Promise<RefreshResult> {
    return this.refreshFromDevice({ serialNumber, type: 'schedule' });
  }

  /**
   * Refresh single schedule for a device
   */
  static async refreshSingleSchedule(serialNumber: number, index: number): Promise<RefreshResult> {
    return this.refreshFromDevice({ serialNumber, type: 'schedule', index });
  }

  /**
   * Refresh all PID loops for a device
   */
  static async refreshAllPidLoops(serialNumber: number): Promise<RefreshResult> {
    return this.refreshFromDevice({ serialNumber, type: 'pidloop' });
  }

  /**
   * Refresh single PID loop for a device
   */
  static async refreshSinglePidLoop(serialNumber: number, index: number): Promise<RefreshResult> {
    return this.refreshFromDevice({ serialNumber, type: 'pidloop', index });
  }

  /**
   * Refresh all holidays for a device
   */
  static async refreshAllHolidays(serialNumber: number): Promise<RefreshResult> {
    return this.refreshFromDevice({ serialNumber, type: 'holiday' });
  }

  /**
   * Refresh single holiday for a device
   */
  static async refreshSingleHoliday(serialNumber: number, index: number): Promise<RefreshResult> {
    return this.refreshFromDevice({ serialNumber, type: 'holiday', index });
  }

  // =============================================================================
  // Trendlog Refresh Methods
  // =============================================================================

  /**
   * Refresh all trendlogs for a device
   */
  static async refreshAllTrendlogs(serialNumber: number): Promise<RefreshResult> {
    return this.refreshFromDevice({ serialNumber, type: 'trendlog' });
  }

  /**
   * Refresh single trendlog for a device
   */
  static async refreshSingleTrendlog(serialNumber: number, index: number): Promise<RefreshResult> {
    return this.refreshFromDevice({ serialNumber, type: 'trendlog', index });
  }

  // =============================================================================
  // Alarm Refresh Methods
  // =============================================================================

  /**
   * Refresh all alarms for a device
   */
  static async refreshAllAlarms(serialNumber: number): Promise<RefreshResult> {
    return this.refreshFromDevice({ serialNumber, type: 'alarm' });
  }

  /**
   * Refresh single alarm for a device
   */
  static async refreshSingleAlarm(serialNumber: number, index: number): Promise<RefreshResult> {
    return this.refreshFromDevice({ serialNumber, type: 'alarm', index });
  }
}

export default PanelDataRefreshService;
