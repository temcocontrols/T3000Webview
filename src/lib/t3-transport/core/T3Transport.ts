/**
 * T3Transport - Unified Transport Service
 * Single service class for all T3000 communication
 * Supports WebSocket, WebView2, and FFI transports with auto-detection
 */

import type {
  TransportConfig,
  TransportType,
  TransportStatus,
  TransportInfo,
  TransportEvent,
  TransportEventCallback,
  WebViewResponse,
  ITransport
} from '../types/transport.types';
import { WebViewMessageType } from '../types/message-enums';
import { WebSocketTransport } from '../transports/WebSocketTransport';
import { WebViewTransport } from '../transports/WebViewTransport';
import { FFITransport } from '../transports/FFITransport';

/**
 * Identifiers action 17 (`GET_WEBVIEW_LIST`) needs.
 *
 * The device tree already holds both, so callers should pass them instead of
 * letting the transport ask `GET_PANELS_LIST` (action 4) — that list is filled
 * only from UDP replies and is empty on an RS485 install.
 */
export interface Action17Target {
  panelId: number;
  objectInstance: number;
}

export class T3Transport {
  private transport?: ITransport;
  private config: Partial<TransportConfig>;

  constructor(config?: Partial<TransportConfig>) {
    this.config = config || {};
  }

  /**
   * Initialize with auto-detected transport
   * Priority: webview → websocket → ffi
   */
  async autoConnect(): Promise<TransportType> {
    const webview = new WebViewTransport(this.config);
    if (webview.isAvailable()) {
      await this.connectWithTransport(webview);
      return 'webview';
    }

    const websocket = new WebSocketTransport(this.config);
    if (websocket.isAvailable()) {
      try {
        await this.connectWithTransport(websocket);
        return 'websocket';
      } catch (error) {
        console.warn('WebSocket connection failed, falling back to FFI', error);
      }
    }

    // Fallback to FFI
    const ffi = new FFITransport(this.config);
    await this.connectWithTransport(ffi);
    return 'ffi';
  }

  /**
   * Connect with specific transport type
   */
  async connect(type: TransportType): Promise<void> {
    let transport: ITransport;

    switch (type) {
      case 'websocket':
        transport = new WebSocketTransport(this.config);
        break;
      case 'webview':
        transport = new WebViewTransport(this.config);
        break;
      case 'ffi':
        transport = new FFITransport(this.config);
        break;
      default:
        throw new Error(`Unknown transport type: ${type}`);
    }

    await this.connectWithTransport(transport);
  }

  private async connectWithTransport(transport: ITransport): Promise<void> {
    if (this.transport) {
      await this.transport.disconnect();
    }

    this.transport = transport;
    await this.transport.connect();
  }

  /**
   * Disconnect current transport
   */
  async disconnect(): Promise<void> {
    if (this.transport) {
      await this.transport.disconnect();
      this.transport = undefined;
    }
  }

  /**
   * Generic send method for any action
   */
  async send(action: WebViewMessageType, payload: any = {}): Promise<WebViewResponse> {
    if (!this.transport) {
      throw new Error('Transport not connected. Call connect() or autoConnect() first.');
    }

    return await this.transport.send(action, payload);
  }

  // =============================================================================
  // Convenience Methods for Specific Actions (0-17)
  // =============================================================================

  /**
   * Action 0: Get panel/graphics data
   */
  async getPanelData(panelId: number): Promise<WebViewResponse> {
    return this.send(WebViewMessageType.GET_PANEL_DATA, { panelId });
  }

  /**
   * Action 1: Get initial graphics data
   */
  async getInitialData(): Promise<WebViewResponse> {
    return this.send(WebViewMessageType.GET_INITIAL_DATA, {});
  }

  /**
   * Action 2: Save graphic data
   */
  async saveGraphicData(graphicData: any): Promise<WebViewResponse> {
    return this.send(WebViewMessageType.SAVE_GRAPHIC_DATA, { data: graphicData });
  }

  /**
   * Action 3: Update single entry (graphics or point)
   */
  async updateEntry(entryType: number, entryIndex: number, data: any): Promise<WebViewResponse> {
    return this.send(WebViewMessageType.UPDATE_ENTRY, { entryType, entryIndex, data });
  }

  /**
   * Action 4: Get lightweight device list
   */
  async getDeviceList(): Promise<WebViewResponse> {
    return this.send(WebViewMessageType.GET_PANELS_LIST, {});
  }

  /**
   * Action 5: Get panel range information
   */
  async getPanelRangeInfo(panelId: number): Promise<WebViewResponse> {
    return this.send(WebViewMessageType.GET_PANEL_RANGE_INFO, { panelId });
  }

  /**
   * Action 6: Get graphic entries
   */
  async getEntries(panelId: number): Promise<WebViewResponse> {
    return this.send(WebViewMessageType.GET_ENTRIES, { panelId });
  }

  /**
   * Action 7: Load specific graphic entry
   */
  async loadGraphicEntry(entryId: number): Promise<WebViewResponse> {
    return this.send(WebViewMessageType.LOAD_GRAPHIC_ENTRY, { entryId });
  }

  /**
   * Action 8: Open entry edit window
   */
  async openEntryEditWindow(entryType: number, entryIndex: number): Promise<WebViewResponse> {
    return this.send(WebViewMessageType.OPEN_ENTRY_EDIT_WINDOW, { entryType, entryIndex });
  }

  /**
   * Action 9: Save image data
   */
  async saveImage(imageData: any): Promise<WebViewResponse> {
    return this.send(WebViewMessageType.SAVE_IMAGE, { data: imageData });
  }

  /**
   * Action 10: Save library data
   */
  async saveLibraryData(libraryData: any): Promise<WebViewResponse> {
    return this.send(WebViewMessageType.SAVE_LIBRAY_DATA, { data: libraryData });
  }

  /**
   * Action 11: Delete image
   */
  async deleteImage(imageId: number): Promise<WebViewResponse> {
    return this.send(WebViewMessageType.DELETE_IMAGE, { imageId });
  }

  /**
   * Action 12: Get selected device information
   */
  async getSelectedDeviceInfo(serialNumber: number): Promise<WebViewResponse> {
    return this.send(WebViewMessageType.GET_SELECTED_DEVICE_INFO, { serialNumber });
  }

  /**
   * Action 13: Bind device
   */
  async bindDevice(deviceData: any): Promise<WebViewResponse> {
    return this.send(WebViewMessageType.BIND_DEVICE, { data: deviceData });
  }

  /**
   * Action 14: Save new library data
   */
  async saveNewLibraryData(libraryData: any): Promise<WebViewResponse> {
    return this.send(WebViewMessageType.SAVE_NEW_LIBRARY_DATA, { data: libraryData });
  }

  /**
   * Action 15: Full device data synchronization (all points)
   */
  async getFullDeviceData(serialNumber: number): Promise<WebViewResponse> {
    return this.send(WebViewMessageType.LOGGING_DATA, { serialNumber });
  }

  /**
   * Action 16: Update full records to device
   */
  async updateDeviceRecords(serialNumber: number, entryType: number, records: any[]): Promise<WebViewResponse> {
    return this.send(WebViewMessageType.UPDATE_WEBVIEW_LIST, {
      serialNumber,
      entryType,
      records
    });
  }

  /**
   * Action 17: Refresh records from device
   * @param serialNumber - Device serial number
   * @param entryType - Entry type (0=OUTPUT, 1=INPUT, 2=VARIABLE, 3=CONTROLLER/PID, 4=SCHEDULE, 5=ANNUAL/HOLIDAY, 6=PROGRAM)
   * @param startIndex - Start index (default 0)
   * @param endIndex - End index (default -1 for all items)
   */
  /**
   * Refresh point data from device using GET_WEBVIEW_LIST (Action 17)
   *
   * `target` carries `panelId` + `objectInstance`. Pass it whenever the caller
   * already knows them (the device tree always does) — that avoids a round trip
   * through action 4, which only reports devices that answered the UDP scan and
   * is therefore empty on an RS485 install. Only when it is omitted does this
   * fall back to looking the device up in the panel list.
   */
  async refreshDeviceRecords(
    serialNumber: number,
    entryType: number,
    startIndex: number = 0,
    endIndex: number = -1,
    target?: Action17Target
  ): Promise<WebViewResponse> {
    const resolved = await this.resolveAction17Target(serialNumber, target);
    // Set default end index based on type if not provided
    // From global_define.h in T3000-Source
    if (endIndex === -1) {
      switch (entryType) {
        case 0: // BAC_OUT / OUTPUT
          endIndex = 63;  // BAC_OUTPUT_ITEM_COUNT (64 items, 0-63)
          break;
        case 1: // BAC_IN / INPUT
          endIndex = 127; // BAC_INPUT_ITEM_COUNT (128 items, 0-127)
          break;
        case 2: // BAC_VAR / VARIABLE
          endIndex = 63;  // BAC_VARIABLE_ITEM_COUNT (64 items, 0-63)
          break;
        case 3: // BAC_PID / CONTROLLER / PID
          endIndex = 15;  // BAC_PID_COUNT (16 items, 0-15)
          break;
        case 4: // BAC_SCH / SCHEDULE
          endIndex = 7;   // BAC_SCHEDULE_COUNT (8 items, 0-7)
          break;
        case 5: // BAC_HOL / ANNUAL / HOLIDAY
          endIndex = 3;   // BAC_HOLIDAY_COUNT (4 items, 0-3)
          break;
        case 6: // BAC_PRG / PROGRAM
          endIndex = 15;  // BAC_PROGRAM_ITEM_COUNT (16 items, 0-15)
          break;
        case 7: // BAC_TBL / TABLE / TRENDLOG
          endIndex = 15;  // BAC_TRENDLOG_COUNT (16 items, 0-15)
          break;
        case 8: // BAC_DMON / DIGITAL MONITOR
          endIndex = 31;  // BAC_MONITOR_COUNT (32 items, 0-31)
          break;
        case 9: // BAC_AMON / ANALOG MONITOR
          endIndex = 31;  // BAC_MONITOR_COUNT (32 items, 0-31)
          break;
        case 10: // BAC_GRP / GROUP
          endIndex = 15;  // BAC_GROUP_COUNT (16 items, 0-15)
          break;
        case 12: // BAC_ALARMM / ALARM MONITOR
          endIndex = 31;  // BAC_ALARM_COUNT (32 items, 0-31)
          break;
        case 15: // BAC_ALARMS / ALARM SETTINGS
          endIndex = 31;  // BAC_ALARM_COUNT (32 items, 0-31)
          break;
        default:
          endIndex = 63;  // Default fallback
          break;
      }
    }

    return this.send(WebViewMessageType.GET_WEBVIEW_LIST, {
      panelId: resolved.panelId,
      serialNumber,
      entryType,
      entryIndexStart: startIndex,
      entryIndexEnd: endIndex,
      objectinstance: resolved.objectInstance
    });
  }

  /**
   * Resolve `panelId` + `objectInstance` for an action-17 request.
   *
   * Uses the caller-supplied target when it is usable, so the call does not
   * depend on `GET_PANELS_LIST` (action 4). Action 4 reads
   * `g_bacnet_panel_info`, which the C++ engine fills only from UDP `0x65`
   * replies and only for top-level devices — so on an RS485 install (Tstat10 /
   * TSTAT7 on a COM port) it returns nothing, even though action 17 can read
   * those devices perfectly. The tree rows already carry the triple, so callers
   * pass it and this never has to ask action 4.
   */
  private async resolveAction17Target(
    serialNumber: number,
    target?: Action17Target
  ): Promise<Action17Target> {
    if (
      target &&
      typeof target.panelId === 'number' &&
      target.panelId > 0 &&
      target.panelId < 255 &&
      typeof target.objectInstance === 'number' &&
      target.objectInstance > 0
    ) {
      return target;
    }

    // Fallback: legacy lookup through the panel list (action 4).
    const deviceListResponse = await this.getDeviceList();

    // Handle the response - data might be directly an array or nested
    const deviceList = Array.isArray(deviceListResponse.data)
      ? deviceListResponse.data
      : (deviceListResponse.data?.data && Array.isArray(deviceListResponse.data.data))
        ? deviceListResponse.data.data
        : [];

    if (!Array.isArray(deviceList) || deviceList.length === 0) {
      throw new Error(
        `No devices found in the T3000 panel list (action 4). Pass panelId/objectInstance from the device record instead.`
      );
    }

    // Response uses snake_case: serial_number, panel_number, object_instance
    const device = deviceList.find((d: any) => d.serial_number === serialNumber);

    if (!device) {
      throw new Error(`Device with serial number ${serialNumber} not found in device list`);
    }

    return {
      panelId: device.panel_number,
      objectInstance: device.object_instance
    };
  }

  /**
   * Get device settings using Action 17 with READ_SETTING_COMMAND (98)
   * Reads entire Str_Setting_Info structure (400 bytes) from device
   *
   * @param serialNumber - Device serial number
   * @returns WebViewResponse with settings data
   */
  async getDeviceSettings(serialNumber: number, target?: Action17Target): Promise<WebViewResponse> {
    const resolved = await this.resolveAction17Target(serialNumber, target);

    // Call Action 17 (GET_WEBVIEW_LIST) with entryType=98 (READ_SETTING_COMMAND)
    // Returns single Str_Setting_Info structure (400 bytes), not an array
    return this.send(WebViewMessageType.GET_WEBVIEW_LIST, {
      panelId: resolved.panelId,
      serialNumber,
      entryType: 98,  // READ_SETTING_COMMAND
      entryIndexStart: 0,
      entryIndexEnd: 0,
      objectinstance: resolved.objectInstance
    });
  }

  /**
   * Get device MISC data using Action 17 with READ_MISC (96)
   * Reads entire Str_MISC structure (400 bytes) from device.
   * Health counters are at bytes 147-188 of the returned All[] array.
   */
  async getDeviceMisc(serialNumber: number, target?: Action17Target): Promise<WebViewResponse> {
    const resolved = await this.resolveAction17Target(serialNumber, target);

    return this.send(WebViewMessageType.GET_WEBVIEW_LIST, {
      panelId: resolved.panelId,
      serialNumber,
      entryType: 96,  // READ_MISC
      entryIndexStart: 0,
      entryIndexEnd: 0,
      objectinstance: resolved.objectInstance
    });
  }

  // =============================================================================
  // Transport Management Methods
  // =============================================================================

  /**
   * Get current transport information
   */
  getTransportInfo(): TransportInfo | null {
    return this.transport?.getInfo() || null;
  }

  /**
   * Get current transport type
   */
  getCurrentTransportType(): TransportType | null {
    return this.transport?.type || null;
  }

  /**
   * Get connection status
   */
  getStatus(): TransportStatus {
    return this.transport?.status || TransportStatus.DISCONNECTED;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.transport?.status === TransportStatus.CONNECTED;
  }

  /**
   * Register event listener
   */
  on(event: TransportEvent, callback: TransportEventCallback): void {
    this.transport?.on(event, callback);
  }

  /**
   * Unregister event listener
   */
  off(event: TransportEvent, callback: TransportEventCallback): void {
    this.transport?.off(event, callback);
  }

  /**
   * Update configuration (for FFI transport)
   */
  updateConfig(config: Partial<TransportConfig>): void {
    this.config = { ...this.config, ...config };

    // Update transport if it's FFI
    if (this.transport?.type === 'ffi') {
      const ffiTransport = this.transport as FFITransport;
      if (config.apiBaseUrl) {
        ffiTransport.updateBaseUrl(config.apiBaseUrl);
      }
      if (config.timeout) {
        ffiTransport.updateTimeout(config.timeout);
      }
    }
  }
}
