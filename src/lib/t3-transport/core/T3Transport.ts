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
  async refreshDeviceRecords(
    serialNumber: number,
    entryType: number,
    startIndex: number = 0,
    endIndex: number = -1
  ): Promise<WebViewResponse> {
    // Get device info (panelId and objectInstance) from device list
    const deviceListResponse = await this.getDeviceList();

    // Handle the response - data might be directly an array or nested
    const deviceList = Array.isArray(deviceListResponse.data)
      ? deviceListResponse.data
      : (deviceListResponse.data?.data && Array.isArray(deviceListResponse.data.data))
        ? deviceListResponse.data.data
        : [];

    if (!Array.isArray(deviceList) || deviceList.length === 0) {
      throw new Error(`No devices found. Response data is not an array or is empty.`);
    }

    // Response uses snake_case: serial_number, panel_number, object_instance
    const device = deviceList.find((d: any) => d.serial_number === serialNumber);

    if (!device) {
      throw new Error(`Device with serial number ${serialNumber} not found in device list`);
    }

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
        default:
          endIndex = 63;  // Default fallback
          break;
      }
    }

    return this.send(WebViewMessageType.GET_WEBVIEW_LIST, {
      panelId: device.panel_number,
      serialNumber,
      entryType,
      entryIndexStart: startIndex,
      entryIndexEnd: endIndex,
      objectinstance: device.object_instance
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
