

import MessageType from "./MessageType"
import MessageModel from "./MessageModel"
import IdxUtils from '../Common/IdxUtils'
import Utils1 from "../../Util/Utils1"
import T3Util from "../../Util/T3Util"
import { grpNav, library, T3000_Data, linkT3EntryDialog, selectPanelOptions, appState, globalMsg, locked, rulersGridVisible } from '../../Data/T3Data'
import T3UIUtil from "../UI/T3UIUtil"
import LogUtil from "../../Util/LogUtil"
import { demoDeviceData } from '../../../../common'

class WebSocketClient {

  private socket: WebSocket | null = null;
  private retries: number = 0;
  private maxRetries: number = 10;
  private pingInterval: number = 10000; // 10 seconds
  private pingIntervalId: NodeJS.Timeout | null = null;
  private reconnectTimeoutId: NodeJS.Timeout | null = null;

  // Error tracking for data requests
  private dataRequestErrorCount: number = 0; // Track consecutive errors
  private maxDataRequestErrors: number = 3; // Stop after 3 consecutive errors
  private lastErrorTime: number = 0; // Track when last error occurred

  private uri: string;
  public messageModel: MessageModel;
  public messageData: string;
  public needRefresh: boolean = true;
  public $q: any;
  public reloadInitialDataInterval: any;
  private isDestroyed: boolean = false;
  private messageQueue: string[] = [];

  // Dependency injection - services will be injected after construction
  private deviceOpt: any = null;
  private idxPage: any = null;
  private quasarUtil: any = null;

  constructor() { }

  // Dependency injection method
  public setDependencies(deviceOpt: any, idxPage: any, quasarUtil: any) {
    this.deviceOpt = deviceOpt;
    this.idxPage = idxPage;
    this.quasarUtil = quasarUtil;
  }

  public connect() {
    if (this.isDestroyed) {
      LogUtil.Error('Cannot connect: WebSocketClient has been destroyed');
      return;
    }

    // Cleanup previous connection
    this.cleanup();

    this.uri = this.getUri();

    //ws://localhost:9104 || ws://127.0.0.1:9104
    const wsUri = `ws://${this.uri}:9104`;

    try {
      this.socket = new WebSocket(wsUri);
      this.setupEventHandlers();
    } catch (error) {
      LogUtil.Error('Failed to create WebSocket connection:', error);
      this.attemptReconnect();
    }
  }

  private setupEventHandlers() {
    if (!this.socket) return;

    this.socket.onopen = this.onOpen.bind(this);
    this.socket.onmessage = this.onMessage.bind(this);
    this.socket.onclose = this.onClose.bind(this);
    this.socket.onerror = this.onError.bind(this);
  }

  private onOpen(event: Event) {
    LogUtil.Debug('= ws: connection opened:', event);

    this.retries = 0;
    // this.startPing();

    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.bindCurrentClient();
      this.processPendingMessages();
    }

    // Refresh the data if re/connected to the data client
    this.GetPanelsList();
  }

  private onMessage(event: MessageEvent) {
    LogUtil.Debug('= Ws message received:', event.data);
    try {
      this.processMessage(event.data);
    } catch (error) {
      LogUtil.Error('Error processing WebSocket message:', error);
    }
  }

  private onClose(event: CloseEvent) {
    LogUtil.Debug('= ws: connection closed:', event);
    this.cleanup();
    if (!this.isDestroyed) {
      this.attemptReconnect();
    }
  }

  private onError(event: Event) {
    T3Util.Error('= ws: onError/', event);

    const errorMsg = `Load device data failed, please check whether the T3000 application is running or not.`;
    T3UIUtil.ShowWebSocketError(errorMsg);

    this.cleanup();
    if (!this.isDestroyed) {
      this.attemptReconnect();
    }
  }

  private cleanup() {
    // Clear intervals
    if (this.pingIntervalId) {
      clearInterval(this.pingIntervalId);
      this.pingIntervalId = null;
    }

    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }

    if (this.reloadInitialDataInterval) {
      clearInterval(this.reloadInitialDataInterval);
      this.reloadInitialDataInterval = null;
    }

    // Clean up socket
    if (this.socket) {
      this.socket.onopen = null;
      this.socket.onmessage = null;
      this.socket.onclose = null;
      this.socket.onerror = null;

      if (this.socket.readyState === WebSocket.OPEN) {
        this.socket.close();
      }
      this.socket = null;
    }
  }

  private startPing() {
    // Clear existing interval if any
    if (this.pingIntervalId) {
      clearInterval(this.pingIntervalId);
    }

    this.pingIntervalId = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        try {
          this.socket.send("ping");
        } catch (error) {
          LogUtil.Error('Failed to send ping:', error);
        }
      }
    }, this.pingInterval);
  }

  private attemptReconnect() {
    if (this.retries >= this.maxRetries || this.isDestroyed) {
      // LogUtil.Debug("= ws: max retries reached or client destroyed. Giving up.");
      return;
    }

    // Use exponential backoff for reconnection delay
    const delay = Math.min(1000 * Math.pow(2, this.retries), 30000);

    // LogUtil.Debug(`= ws: attempting to reconnect (${this.retries + 1}/${this.maxRetries}) in ${delay}ms`);

    this.reconnectTimeoutId = setTimeout(() => {
      this.retries++;
      this.connect();
    }, delay);
  }

  public getUri() {
    const url = new URL(window.location.href);
    return url.hostname;
  }

  public bindCurrentClient() {

    const clientId = Utils1.GenerateUUID();
    this.messageModel = new MessageModel();
    this.messageModel.setHeader();
    this.messageModel.setMessage(13, null, null, null, null, clientId);

    const msgData = this.messageModel.formatMessageData();
    this.messageData = JSON.stringify(msgData);

    this.sendMessage(this.messageData);
  }

  sendMessage(message: string) {

    // // TEMP DEBUG: Only send GET_PANEL_DATA messages, ignore others
    // try {
    //   const parsed = JSON.parse(message);
    //   if (parsed.message.action !== MessageType.GET_PANEL_DATA) {
    //     LogUtil.Debug('TEMP DEBUG: Skipping non-GET_PANEL_DATA message:', parsed.message.action );
    //     return;
    //   }
    // } catch (e) {
    //   LogUtil.Debug('TEMP DEBUG: Failed to parse message, sending anyway:', message);
    // }

    if (this.isDestroyed) {
      LogUtil.Error('Cannot send message: WebSocketClient has been destroyed');
      return;
    }

    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      try {
      this.socket.send(message);
      const currentDateTime = new Date().toLocaleString();

      // Parse message to check action type and add detailed logging
      try {
        const parsedMessage = JSON.parse(message);
        const messageContent = parsedMessage?.message || parsedMessage;
        const actionDetails = this.getActionDetails(messageContent?.action);

        LogUtil.Debug('= WS: Sent message to T3000 backend:', {
          messageDetails: {
            action: messageContent?.action,
            actionName: actionDetails.name,
            actionDescription: actionDetails.description,
            actionCategory: actionDetails.category,
            implemented: actionDetails.implemented
          },
          messageContext: {
            panelId: messageContent?.panelId,
            viewitem: messageContent?.viewitem,
            msgId: messageContent?.msgId,
            serialNumber: messageContent?.serialNumber,
            hasData: !!messageContent?.data,
            dataType: messageContent?.data ? typeof messageContent.data : null,
            dataLength: Array.isArray(messageContent?.data) ? messageContent.data.length :
                       (typeof messageContent?.data === 'string' ? messageContent.data.length : null)
          },
          connectionInfo: {
            socketState: this.socket.readyState,
            socketUrl: this.socket.url,
            timestamp: currentDateTime
          },
          rawMessage: message
        });
      } catch {
        // If parsing fails, log normally with basic info
        LogUtil.Debug('= WS: Sent message to T3000 backend (unparseable):', {
          messageType: 'RAW_STRING',
          messageLength: message?.length || 0,
          timestamp: currentDateTime,
          rawMessage: message
        });
      }
      } catch (error) {
      LogUtil.Error('Failed to send message:', error);
      this.messageQueue.push(message);
      this.attemptReconnect();
      }
    } else {
      // Queue message for later
      this.messageQueue.push(message);
      LogUtil.Debug('= ws: sendMessage / socket not open, message queued. Ready state:', this.socket?.readyState);

      // If not connected, attempt to connect
      if (!this.socket || this.socket.readyState === WebSocket.CLOSED) {
      this.connect();
      }
    }
    }

  private processPendingMessages() {
    while (this.messageQueue.length > 0 && this.socket?.readyState === WebSocket.OPEN) {
      const message = this.messageQueue.shift();
      if (message) {
        try {
          this.socket.send(message);
          LogUtil.Debug('= ws: pending message sent:', message);
        } catch (error) {
          LogUtil.Error('Failed to send pending message:', error);
          // Put message back at the beginning of queue
          this.messageQueue.unshift(message);
          break;
        }
      }
    }
  }

  public destroy() {
    this.isDestroyed = true;
    this.cleanup();
    this.messageQueue = [];
    LogUtil.Debug('= ws: WebSocketClient destroyed');
  }

  /**
   * Load demo data as fallback when real panel data is unavailable
   */
  private async loadDemoDataFallback() {
    try {
      LogUtil.Info('📦 Loading demo device data as fallback');
      const demoData = await demoDeviceData();

      if (demoData && demoData.data) {
        T3000_Data.value.panelsData = demoData.data;
        selectPanelOptions.value = demoData.data;

        if (demoData.ranges) {
          T3000_Data.value.panelsRanges = demoData.ranges;
        }

        LogUtil.Info(`✅ Demo data loaded successfully: ${demoData.data.length} panels`);
      } else {
        LogUtil.Warn('⚠️ Demo data load returned empty or invalid data');
      }
    } catch (error) {
      LogUtil.Error('❌ Failed to load demo data:', error);
    }
  }

  //#region  Format Message

  public FormatMessageData(action: number, panelId: number, viewitem: number, data: any) {

    // get the serial_number base on panelId
    const serialNumber = this.deviceOpt?.getSerialNumber(panelId) ?? -1;

    this.messageModel = new MessageModel();
    this.messageModel.setHeader();
    this.messageModel.setMessage(action, panelId, viewitem, data, serialNumber);

    const msgData = this.messageModel.formatMessageData();
    this.messageData = JSON.stringify(msgData);
  }

  public FormatUpdateEntryData(data: any) {
    /*
    {
      action: 3, // UPDATE_ENTRY
      field: key,
      value: fieldVal,
      panelId: obj.t3Entry.pid,
      entryIndex: obj.t3Entry.index,
      entryType: T3_Types[obj.t3Entry.type],
    }
    */

    const panelId = data.panelId;

    const currentDevice = this.deviceOpt?.getCurrentDevice();
    if (currentDevice === null || currentDevice == undefined) return;

    const graphicId = currentDevice.graphic;

    // get the serial_number base on panelId
    const serialNumber = this.deviceOpt?.getSerialNumber(panelId) ?? -1;

    this.messageModel = new MessageModel();
    this.messageModel.setHeader();
    this.messageModel.setMessage(MessageType.UPDATE_ENTRY, panelId, graphicId, null, serialNumber);

    this.messageModel.message.field = data.field;
    this.messageModel.message.value = data.value;
    this.messageModel.message.entryIndex = data.entryIndex;
    this.messageModel.message.entryType = data.entryType;

    if (data.data !== undefined) {
      this.messageModel.message.data = data.data;
    }

    const msgData = this.messageModel.formatMessageData();
    this.messageData = JSON.stringify(msgData);
  }

  public FormatSaveImageData(data: any) {
    /*
    {
      action: 9, // SAVE_IMAGE
      filename: file.name,
      fileLength: file.size,
      fileData: await readFile(file.data),
    }
    */

    const currentDevice = this.deviceOpt?.getCurrentDevice();
    if (currentDevice === null || currentDevice === undefined) return;

    const panelId = currentDevice.panelId;
    const graphicId = currentDevice.graphic;

    const serialNumber = this.deviceOpt?.getSerialNumber(panelId) ?? -1;

    this.messageModel = new MessageModel();
    this.messageModel.setHeader();
    this.messageModel.setMessage(MessageType.SAVE_IMAGE, panelId, graphicId, null, serialNumber);

    this.messageModel.message.filename = data.filename;
    this.messageModel.message.fileLength = data.fileLength;
    this.messageModel.message.fileData = data.fileData;

    const msgData = this.messageModel.formatMessageData();
    this.messageData = JSON.stringify(msgData);
  }

  public FormatLoadGraphicEntryData(data) {
    /*
    {
      action: 7, // LOAD_GRAPHIC_ENTRY
      panelId: item.t3Entry.pid,
      entryIndex: item.t3Entry.index,
    }
    */

    const currentDevice = this.deviceOpt?.getCurrentDevice();
    if (currentDevice === null || currentDevice === undefined) return;

    const panelId = data.panelId || currentDevice.panenId;
    const graphicId = currentDevice.graphic;

    const serialNumber = this.deviceOpt?.getSerialNumber(panelId) ?? -1;

    this.messageModel = new MessageModel();
    this.messageModel.setHeader();
    this.messageModel.setMessage(MessageType.LOAD_GRAPHIC_ENTRY, panelId, graphicId, null, serialNumber);

    this.messageModel.message.entryIndex = data.entryIndex;
    this.messageModel.message.viewitem = data.entryIndex; // for compatibility

    const msgData = this.messageModel.formatMessageData();
    this.messageData = JSON.stringify(msgData);
  }

  FormatOpenEntryEditWindow(data) {
    /*
    {
      action: 8, // OPEN_ENTRY_EDIT_WINDOW
      panelId: item.t3Entry.pid,
      entryType: T3_Types[item.t3Entry.type],
      entryIndex: item.t3Entry.index,
    }
    */

    const currentDevice = this.deviceOpt?.getCurrentDevice();
    if (currentDevice === null || currentDevice === undefined) return;

    const panelId = data.panelId || currentDevice.panenId;
    const graphicId = currentDevice.graphic;

    const serialNumber = this.deviceOpt?.getSerialNumber(panelId) ?? -1;

    this.messageModel = new MessageModel();
    this.messageModel.setHeader();
    this.messageModel.setMessage(MessageType.OPEN_ENTRY_EDIT_WINDOW, panelId, graphicId, null, serialNumber);

    this.messageModel.message.entryType = data.entryType;
    this.messageModel.message.entryIndex = data.entryIndex;

    const msgData = this.messageModel.formatMessageData();
    this.messageData = JSON.stringify(msgData);
  }

  //#endregion

  //#region Send Messages

  public GetData(action: number) {
    this.sendMessage(JSON.stringify({ action: action }));
  }

  public GetPanelData(panelId: number) {
    // action: 0, // GET_PANEL_DATA

    // Create detailed call stack information
    const callStack = new Error().stack;
    const stackLines = callStack ? callStack.split('\n') : [];
    const callerInfo = stackLines.slice(1, 6); // Get top 5 stack frames

    // Extract the immediate caller information
    const immediateCallerLine = stackLines[2] || 'Unknown caller';
    const callerMatch = immediateCallerLine.match(/at\s+(.+)\s+\((.+):(\d+):(\d+)\)/);
    const callerDetails = callerMatch ? {
      functionName: callerMatch[1],
      fileName: callerMatch[2].split('/').pop() || callerMatch[2],
      lineNumber: callerMatch[3],
      columnNumber: callerMatch[4]
    } : {
      functionName: 'Unknown',
      fileName: immediateCallerLine.trim(),
      lineNumber: 'Unknown',
      columnNumber: 'Unknown'
    };

    console.log('= WS: GET PANEL DATA REQUEST - Sending WebSocket request to T3000 backend:', {
      action: 'GET_PANEL_DATA',
      messageType: MessageType.GET_PANEL_DATA,
      targetPanelId: panelId,
      callerInformation: {
        immediateCallerFunction: callerDetails.functionName,
        callerFile: callerDetails.fileName,
        callerLine: callerDetails.lineNumber,
        callerColumn: callerDetails.columnNumber,
        fullCallerContext: immediateCallerLine.trim()
      },
      callStackTrace: {
        topCallers: callerInfo.map(line => line.trim()),
        requestOrigin: this.identifyRequestOrigin(callerInfo),
        triggerSource: this.categorizeCallSource(callerInfo)
      },
      currentT3000State: {
        panelsDataLength: T3000_Data.value.panelsData?.length || 0,
        panelsListLength: T3000_Data.value.panelsList?.length || 0,
        loadingPanel: T3000_Data.value.loadingPanel
      },
      timestamp: new Date().toISOString()
    });

    this.FormatMessageData(MessageType.GET_PANEL_DATA, panelId, null, null);
    this.sendMessage(this.messageData);

    // this.sendMessage(JSON.stringify({ action: MessageType.GET_PANEL_DATA }));
  }

  public GetInitialData(panelId: number, graphicId: number, needRefresh?: boolean) {
    // action: 1, // GET_INITIAL_DATA

    this.needRefresh = needRefresh ?? true;
    this.FormatMessageData(MessageType.GET_INITIAL_DATA, panelId, graphicId, null);
    this.sendMessage(this.messageData);

    // this.sendMessage(JSON.stringify({ action: MessageType.GET_INITIAL_DATA }));
  }

  // action: 2,  // SAVE_GRAPHIC_DATA / SAVE_GRAPHIC_DATA_RES
  public SaveGraphic(panelId, graphicId, data?: {}) {
    this.FormatMessageData(MessageType.SAVE_GRAPHIC_DATA, panelId, graphicId, data);
    this.sendMessage(this.messageData);
  }

  public UpdateEntry(data: any) {
    // action: 3, // UPDATE_ENTRY

    /*
    {
      action: 3, // UPDATE_ENTRY
      field: key,
      value: fieldVal,
      panelId: obj.t3Entry.pid,
      entryIndex: obj.t3Entry.index,
      entryType: T3_Types[obj.t3Entry.type],
    }
    */

    this.FormatUpdateEntryData(data);
    this.sendMessage(this.messageData);

    // this.sendMessage(JSON.stringify({ action: MessageType.UPDATE_ENTRY }));
  }

  public GetPanelsList() {
    // action: 4, // GET_PANELS_LIST

    // Create detailed call stack information
    const callStack = new Error().stack;
    const stackLines = callStack ? callStack.split('\n') : [];
    const callerInfo = stackLines.slice(1, 6); // Get top 5 stack frames

    // Extract the immediate caller information
    const immediateCallerLine = stackLines[2] || 'Unknown caller';
    const callerMatch = immediateCallerLine.match(/at\s+(.+)\s+\((.+):(\d+):(\d+)\)/);
    const callerDetails = callerMatch ? {
      functionName: callerMatch[1],
      fileName: callerMatch[2].split('/').pop() || callerMatch[2],
      lineNumber: callerMatch[3],
      columnNumber: callerMatch[4]
    } : {
      functionName: 'Unknown',
      fileName: immediateCallerLine.trim(),
      lineNumber: 'Unknown',
      columnNumber: 'Unknown'
    };

    console.log('= WS: GET PANELS LIST REQUEST - Sending WebSocket request to T3000 backend:', {
      action: 'GET_PANELS_LIST',
      messageType: MessageType.GET_PANELS_LIST,
      callerInformation: {
        immediateCallerFunction: callerDetails.functionName,
        callerFile: callerDetails.fileName,
        callerLine: callerDetails.lineNumber,
        callerColumn: callerDetails.columnNumber,
        fullCallerContext: immediateCallerLine.trim()
      },
      callStackTrace: {
        topCallers: callerInfo.map(line => line.trim()),
        requestOrigin: this.identifyRequestOrigin(callerInfo),
        triggerSource: this.categorizeCallSource(callerInfo)
      },
      currentT3000State: {
        panelsDataLength: T3000_Data.value.panelsData?.length || 0,
        panelsListLength: T3000_Data.value.panelsList?.length || 0,
        loadingPanel: T3000_Data.value.loadingPanel
      },
      timestamp: new Date().toISOString()
    });

    this.FormatMessageData(MessageType.GET_PANELS_LIST, null, null, null);
    this.sendMessage(this.messageData);

    // this.sendMessage(JSON.stringify({ action: MessageType.GET_PANELS_LIST }));
  }

  public GetEntries(data: any[]) {
    // action: 6, // GET_ENTRIES

    console.log('= ws: GetEntries / data:', data);

    const currentDevice = this.deviceOpt?.getCurrentDevice();
    if (currentDevice === null || currentDevice === undefined) return;

    const panelId = currentDevice.deviceId;
    const graphicId = currentDevice.graphic;
    const serialNumber = currentDevice.serialNumber;

    this.FormatMessageData(MessageType.GET_ENTRIES, panelId, graphicId, data);
    this.sendMessage(this.messageData);

    // this.sendMessage(JSON.stringify({ action: MessageType.GET_ENTRIES }));
  }

  public GetLoggingData(serialNumber?: number) {
    // action: 15, // LOGGING_DATA
    console.log('= ws: GetLoggingData / serialNumber:', serialNumber);

    const currentDevice = this.deviceOpt?.getCurrentDevice();
    if (currentDevice === null || currentDevice === undefined) return;

    const panelId = currentDevice.deviceId;
    const graphicId = currentDevice.graphic;
    const sn = serialNumber || currentDevice.serialNumber;

    this.FormatMessageData(MessageType.LOGGING_DATA, panelId, graphicId, null);
    this.messageModel.message.serialNumber = sn;

    const msgData = this.messageModel.formatMessageData();
    this.messageData = JSON.stringify(msgData);
    this.sendMessage(this.messageData);
  }

  public LoadGraphicEntry(data) {
    // action: 7, // LOAD_GRAPHIC_ENTRY

    /*
    {
      action: 7, // LOAD_GRAPHIC_ENTRY
      panelId: item.t3Entry.pid,
      entryIndex: item.t3Entry.index,
    }
    */

    this.FormatLoadGraphicEntryData(data);
    this.sendMessage(this.messageData);

    // this.sendMessage(JSON.stringify({ action: MessageType.LOAD_GRAPHIC_ENTRY }));
  }

  public OpenEntryEditWindow(data) {
    // action: 8, // OPEN_ENTRY_EDIT_WINDOW

    this.FormatOpenEntryEditWindow(data);
    this.sendMessage(this.messageData);

    // this.sendMessage(JSON.stringify({ action: MessageType.OPEN_ENTRY_EDIT_WINDOW }));
  }

  public SaveImage(data) {
    // action: 9, // SAVE_IMAGE

    this.FormatSaveImageData(data);
    this.sendMessage(this.messageData);

    // this.sendMessage(JSON.stringify({ action: MessageType.SAVE_IMAGE }));
  }

  public SaveLibraryData(panelId?: number, viewitem?: number, data?: any) {
    // action: 10, // SAVE_LIBRARY_DATA
    this.FormatMessageData(MessageType.SAVE_LIBRARY_DATA, panelId, viewitem, data);
    this.sendMessage(this.messageData);
    // this.sendMessage(JSON.stringify({ action: MessageType.SAVE_LIBRARY_DATA }));
  }

  public SaveNewLibraryData(panelId?: number, viewitem?: number, data?: any) {
    // action: 14, // SAVE_NEW_LIBRARY_DATA
    this.FormatMessageData(MessageType.SAVE_NEW_LIBRARY_DATA, panelId, viewitem, data);
    this.sendMessage(this.messageData);
    // this.sendMessage(JSON.stringify({ action: MessageType.SAVE_NEW_LIBRARY_DATA }));
  }

  public DeleteImage(imagePath: string) {
    // action: 11, // DELETE_IMAGE

    const currentDevice = this.deviceOpt?.getCurrentDevice();
    if (currentDevice === null || currentDevice === undefined) return;

    const panelId = currentDevice.deviceId;
    const graphicId = currentDevice.graphic;

    this.FormatMessageData(MessageType.DELETE_IMAGE, panelId, graphicId, imagePath);
    this.sendMessage(this.messageData);

    // this.sendMessage(JSON.stringify({ action: MessageType.DELETE_IMAGE }));
  }

  //#endregion

  //#region Process Messages

  // Implement your message processing logic here

  private printLog(parsedData) {
    try {
      if (parsedData.action == "GET_INITIAL_DATA_RES") {
        const data = JSON.parse(parsedData.data);
        const entry = parsedData.entry;
        const library = parsedData.library != undefined && parsedData.library !== "" ? JSON.parse(parsedData.library) : {};
        LogUtil.Debug('= ws: printLog / Received data:', true, { action: "GET_INITIAL_DATA_RES", data, entry, library });
      }
      else {
        LogUtil.Debug('= ws: printLog / Received data:', parsedData);
      }
    }
    catch (error) {
      LogUtil.Debug('= ws: printLog / Received data error', error);
    }
  }

  private processMessage(data: any) {

    LogUtil.Debug('= ws: printLog / received origin data', data);

    try {
      const parsedData = JSON.parse(data);

      const hasError = parsedData.error !== undefined || parsedData?.status === false;
      if (hasError) {
        this.handleError(parsedData);
        return;
      }

      this.printLog(parsedData);

      this.processMessageData(parsedData);
      this.showSuccess(parsedData);

      LogUtil.Debug('= ========================');
    } catch (error) {
      T3Util.Error('= ws: processMessage/ failed to parse | process data:', error);
    }
  }

  // Message handler map for action-based dispatch
  private messageHandlers: { [action: number]: (msgData: any) => void } = {
    [MessageType.GET_PANEL_DATA_RES]: this.HandleGetPanelDataRes.bind(this),
    [MessageType.GET_INITIAL_DATA_RES]: this.HandleGetInitialDataRes.bind(this),
    [MessageType.SAVE_GRAPHIC_DATA_RES]: this.HandleSaveGraphicRes.bind(this),
    [MessageType.UPDATE_ENTRY_RES]: this.HandleUpdateEntryRes.bind(this),
    [MessageType.GET_PANELS_LIST_RES]: this.HandleGetPanelsListRes.bind(this),
    [MessageType.GET_ENTRIES_RES]: this.HandleGetEntriesRes.bind(this),
    [MessageType.LOGGING_DATA_RES]: this.HandleLoggingDataRes.bind(this),
    [MessageType.LOAD_GRAPHIC_ENTRY_RES]: this.HandleLoadGraphicEntryRes.bind(this),
    [MessageType.OPEN_ENTRY_EDIT_WINDOW_RES]: this.HandleOpenEntryEditWindowRes.bind(this),
    [MessageType.SAVE_IMAGE_RES]: this.HandleSaveImageRes.bind(this),
    [MessageType.SAVE_LIBRARY_DATA_RES]: this.HandleSaveLibraryDataRes.bind(this),
    [MessageType.SAVE_NEW_LIBRARY_DATA_RES]: this.HandleSaveNewLibraryDataRes.bind(this),
    [MessageType.DELETE_IMAGE_RES]: this.HandleDeleteImageRes.bind(this),
    [MessageType.DATA_SERVER_ONLINE]: this.HandleDataServerOnline.bind(this),
  };

  private processMessageData(msgData: any) {
    const handler = this.messageHandlers[msgData.action];
    if (handler) {
      handler(msgData);
    } else {
      LogUtil.Warn('No handler for message action:', msgData.action, msgData);
    }
  }

  public HandleGetPanelDataRes(msgData) {

    // LogUtil.Debug('= ws: HandleGetPanelDataRes / msgData:', JSON.stringify(msgData, null, 2));
    /*
     load graphic list from GET_PANEL_DATA_RES
     => action: 0, // GET_PANEL_DATA_RES
     => { command: "1GRP2", description: "Test2", id: "GRP2", index: 1, label: "TEST2", pid: 1 }
    */

    LogUtil.Debug('= ws: HandleGetPanelDataRes START =================');
    LogUtil.Debug('= ws: HandleGetPanelDataRes / received panel_id:', msgData?.panel_id);
    LogUtil.Debug('= ws: HandleGetPanelDataRes / received data length:', msgData?.data?.length || 0);
    LogUtil.Debug('= ws: HandleGetPanelDataRes / current loadingPanel:', T3000_Data.value.loadingPanel);
    LogUtil.Debug('= ws: HandleGetPanelDataRes / total panels in list:', T3000_Data.value.panelsList.length);
    LogUtil.Debug('= ws: HandleGetPanelDataRes / BEFORE - panelsData length:', T3000_Data.value.panelsData.length);

    // Log sample data from the response to see what we're getting
    if (msgData?.data && msgData.data.length > 0) {
      LogUtil.Debug('= ws: HandleGetPanelDataRes / sample received data items (first 3):',
        msgData.data.slice(0, 3).map(item => ({
          pid: item.pid,
          index: item.index,
          type: item.type,
          label: item.label || item.description
        }))
      );
    }

    this.deviceOpt?.initGraphicList(msgData.data);

    // refer to WebViewClient-> HandleGetPanelDataRes

    if (msgData?.panel_id) {
      this.idxPage?.clearGetPanelsInterval();
    }

    if (msgData?.panel_id) {

      const check1 = T3000_Data.value.loadingPanel !== null && T3000_Data.value.loadingPanel < T3000_Data.value.panelsList.length - 1;
      if (check1) {
        LogUtil.Debug('= ws: HandleGetPanelDataRes / triggering next panel load, increment loadingPanel from:', T3000_Data.value.loadingPanel);
        T3000_Data.value.loadingPanel++;
        const index = T3000_Data.value.loadingPanel;
        const nextPanelId = T3000_Data.value.panelsList[index].panel_number;
        LogUtil.Debug('= ws: HandleGetPanelDataRes / loading next panel at index:', index, 'panel_number:', nextPanelId);
        // window.chrome?.webview?.postMessage({
        //   action: 0, // GET_PANEL_DATA
        //   panelId: T3000_Data.value.panelsList[index].panel_number,
        // });

        this.GetPanelData(nextPanelId);
      }

      const check2 = T3000_Data.value.loadingPanel !== null && T3000_Data.value.loadingPanel === T3000_Data.value.panelsList.length - 1;
      if (check2) {
        LogUtil.Debug('= ws: HandleGetPanelDataRes / reached last panel, setting loadingPanel to null');
        T3000_Data.value.loadingPanel = null;
      }

      console.log('= WS: PANEL DATA RESPONSE START - Processing panel data from WebSocket:', {
        incomingPanelId: msgData.panel_id,
        incomingDataLength: msgData.data?.length || 0,
        incomingRangesLength: msgData.ranges?.length || 0,
        beforeUpdate: {
          panelsDataLength: T3000_Data.value.panelsData?.length || 0,
          panelsRangesLength: T3000_Data.value.panelsRanges?.length || 0,
          loadingPanel: T3000_Data.value.loadingPanel
        },
        timestamp: new Date().toISOString()
      });

      // Log filtering operation
      const beforeFilterLength = T3000_Data.value.panelsData.length;
      const itemsToRemove = T3000_Data.value.panelsData.filter(item => item.pid === msgData.panel_id);
      console.log('= WS: PANEL DATA FILTER - Removing existing data for panel:', {
        panelId: msgData.panel_id,
        beforeFilterLength,
        itemsToRemoveCount: itemsToRemove.length,
        timestamp: new Date().toISOString()
      });

      T3000_Data.value.panelsData = T3000_Data.value.panelsData.filter(
        (item) => item.pid !== msgData.panel_id
      );

      const afterFilterLength = T3000_Data.value.panelsData.length;
      console.log('= WS: PANEL DATA FILTERED - Completed filtering:', {
        afterFilterLength,
        removedItems: beforeFilterLength - afterFilterLength,
        timestamp: new Date().toISOString()
      });

      // Log concatenation operation
      const newDataLength = msgData.data ? msgData.data.length : 0;
      console.log('= WS: PANEL DATA CONCAT - Adding new data:', {
        newDataLength,
        addedItemsSample: msgData.data?.slice(0, 3),
        timestamp: new Date().toISOString()
      });

      T3000_Data.value.panelsData = T3000_Data.value.panelsData.concat(
        msgData.data
      );

      const finalLength = T3000_Data.value.panelsData.length;
      console.log('= WS: PANEL DATA ADDED - Completed adding new data:', {
        finalLength,
        expectedLength: afterFilterLength + newDataLength,
        actuallyAdded: finalLength - afterFilterLength,
        timestamp: new Date().toISOString()
      });

      // Log unique pid counts to see if we have duplicates
      const pidCounts = {};
      T3000_Data.value.panelsData.forEach(item => {
        pidCounts[item.pid] = (pidCounts[item.pid] || 0) + 1;
      });
      console.log('= WS: PANEL DATA PID ANALYSIS - PID distribution after update:', {
        pidCounts,
        uniquePanels: Object.keys(pidCounts).length,
        totalItems: finalLength,
        timestamp: new Date().toISOString()
      });

      // Check for any unexpected duplicates
      const duplicatePids = Object.keys(pidCounts).filter(pid => pidCounts[pid] > 1);
      if (duplicatePids.length > 0) {
        LogUtil.Debug('= ws: HandleGetPanelDataRes / WARNING: Found items with same PID after filtering!', duplicatePids);
      }

      T3000_Data.value.panelsData.sort((a, b) => a.pid - b.pid);
      selectPanelOptions.value = T3000_Data.value.panelsData;

      // Log ranges operation
      const beforeRangesLength = T3000_Data.value.panelsRanges.length;
      T3000_Data.value.panelsRanges = T3000_Data.value.panelsRanges.filter(
        (item) => item.pid !== msgData.panel_id
      );
      const afterRangesFilterLength = T3000_Data.value.panelsRanges.length;

      T3000_Data.value.panelsRanges = T3000_Data.value.panelsRanges.concat(msgData.ranges);
      const finalRangesLength = T3000_Data.value.panelsRanges.length;

      LogUtil.Debug('= ws: HandleGetPanelDataRes / ranges: before filter:', beforeRangesLength,
        'after filter:', afterRangesFilterLength, 'after concat:', finalRangesLength,
        'new ranges added:', msgData.ranges ? msgData.ranges.length : 0);

      IdxUtils.refreshLinkedEntries(msgData.data);
      IdxUtils.refreshLinkedEntries2(msgData.data);

      LogUtil.Debug('= ws: HandleGetPanelDataRes / FINAL - panelsData length:', T3000_Data.value.panelsData.length);
      LogUtil.Debug('= ws: HandleGetPanelDataRes END ===================');
    }
  }

  public HandleGetInitialDataRes(msgData) {

    LogUtil.Debug('= ws: HandleGetInitialDataRes / msgData:', msgData);

    // Reset error count on successful response
    this.dataRequestErrorCount = 0;

    const isCrtDevice = this.deviceOpt?.isCurrentDeviceMessage(msgData);

    if (!isCrtDevice) {
      LogUtil.Debug('= ws: HandleGetInitialDataRes / not current device message, return');
      return;
    }

    // action: 1, // GET_INITIAL_DATA_RES
    const appStateData = msgData.data;

    // save the T3 data to localstorage with key 'tempAppState'
    if (appStateData !== null && appStateData !== undefined) {
      localStorage.setItem('tempAppState', appStateData);
    }

    const parsedAppStateData = JSON.parse(appStateData);
    LogUtil.Debug('= ws: HandleGetInitialDataRes / GET_INITIAL_DATA_RES msgData-appState | needRefresh:', parsedAppStateData, this.needRefresh);

    if (!this.needRefresh) return;

    // merge the appState data to the current appState
    // this.deviceOpt?.mergeAppState(parsedAppStateData);

    // sync t3 appState data to ls [deviceAppState]
    this.deviceOpt?.syncTempAppStateToDeviceAppState();

    // load device appstate
    this.deviceOpt?.refreshDeviceAppState();

    // refresh the current device
    this.deviceOpt?.refreshCurrentDevice();

    // refer to WebViewClient-> HandleGetInitialDataRes
    grpNav.value = [msgData.entry];
    if (msgData.library) {
      msgData.library = JSON.parse(msgData.library);
      library.value = msgData.library;
    }

    setTimeout(() => {
      IdxUtils.refreshMoveableGuides();
    }, 100);

    this.clearInitialDataInterval();
    this.quasarUtil?.clearGlobalMsg("get_initial_data");
  }

  public HandleSaveGraphicRes(msgData) {
    // action: 2, // SAVE_GRAPHIC_RES
    IdxUtils.saveGraphicData(msgData, this.$q);
  }

  public HandleUpdateEntryRes(msgData) {
    // action: 3, // UPDATE_ENTRY_RES
  }

  public HandleGetPanelsListRes(msgData) {

    //#region external browser

    const data = msgData.data;
    if (data === undefined) return;

    // action: 4, // GET_PANELS_LIST_RES
    this.deviceOpt?.initDeviceList(data);
    LogUtil.Debug('= ws: GET_PANELS_LIST_RES', this.deviceOpt?.deviceList);

    // load the first panel's panel data by default
    const firstPanelId = data.length > 0 ? data[0].panel_number : null;
    if (firstPanelId !== null) {
      this.GetPanelData(firstPanelId);
    }

    const currentDevice = JSON.parse(localStorage.getItem('currentDevice') || '{}');
    if (currentDevice && !currentDevice.deviceId) {
      const panelName = currentDevice.device;
      const panel = data.find((panel) => panel.panel_name === panelName);
      if (panel) {
        currentDevice.deviceId = panel.panel_number;
        currentDevice.serialNumber = panel.serial_number;
        localStorage.setItem('currentDevice', JSON.stringify(currentDevice));
      }
    }

    //#endregion

    //#region built-in browser, refer to WebViewClient-> HandleGetPanelsListRes

    if (!msgData.data?.length) return;
    T3000_Data.value.panelsList = msgData.data;
    T3000_Data.value.loadingPanel = 0;
    //this.GetPanelData(T3000_Data.value.panelsList[0].panel_number);

    //#endregion
  }

  public HandleGetEntriesRes(msgData) {
    // action: 6, // GET_ENTRIES_RES
    // LogUtil.Debug('= ws: HandleGetEntriesRes START =================');
    // LogUtil.Debug('= ws: HandleGetEntriesRes / received data length:', msgData.data?.length || 0);
    // LogUtil.Debug('= ws: HandleGetEntriesRes / BEFORE - panelsData length:', T3000_Data.value.panelsData.length);

    // Log sample of incoming data to see what's being updated
    // if (msgData.data && msgData.data.length > 0) {
    //   LogUtil.Debug('= ws: HandleGetEntriesRes / sample incoming data (first 3):',
    //     msgData.data.slice(0, 3).map(item => ({
    //       id: item.id,
    //       pid: item.pid,
    //       index: item.index,
    //       type: item.type,
    //       hasInputArray: Array.isArray(item.input),
    //       hasRangeArray: Array.isArray(item.range),
    //       inputLength: item.input?.length,
    //       rangeLength: item.range?.length
    //     }))
    //   );
    // }

    // TODO refer to WebViewClient-> HandleGetEntriesRes
    msgData.data.forEach((item, itemIdx) => {
      const itemIndex = T3000_Data.value.panelsData.findIndex(
        (ii) =>
          ii.index === item.index &&
          ii.type === item.type &&
          ii.pid === item.pid
      );

      if (itemIndex !== -1) {
        // Found existing item - log what we're about to replace
        const existingItem = T3000_Data.value.panelsData[itemIndex];

        // LogUtil.Debug(`= ws: HandleGetEntriesRes / item ${itemIdx}: REPLACING existing item at index ${itemIndex}:`, {
        //   id: existingItem.id,
        //   pid: existingItem.pid,
        //   type: existingItem.type,
        //   existingHasInput: Array.isArray(existingItem.input),
        //   existingInputLength: existingItem.input?.length,
        //   existingHasRange: Array.isArray(existingItem.range),
        //   existingRangeLength: existingItem.range?.length,
        //   newHasInput: Array.isArray(item.input),
        //   newInputLength: item.input?.length,
        //   newHasRange: Array.isArray(item.range),
        //   newRangeLength: item.range?.length
        // });

        // 🚨 CRITICAL CHECK: Prevent data corruption!
        // Don't replace detailed monitor configs with simplified versions
        const existingIsDetailedMonitor = existingItem.type === 'MON' &&
          (Array.isArray(existingItem.input) || Array.isArray(existingItem.range) || existingItem.num_inputs > 0);
        const newIsSimplifiedMonitor = item.type === 'MON' &&
          !Array.isArray(item.input) && !Array.isArray(item.range) && !item.num_inputs;

        // Check for other potential data loss scenarios
        const existingHasComplexData = this.hasComplexDataStructures(existingItem);
        const newLacksComplexData = !this.hasComplexDataStructures(item);
        const potentialDataLoss = existingHasComplexData && newLacksComplexData;

        if (existingIsDetailedMonitor && newIsSimplifiedMonitor) {
          LogUtil.Warn(`🚨 DATA CORRUPTION PREVENTED! Attempted to replace detailed monitor config with simplified version:`, {
            id: item.id,
            pid: item.pid,
            existingDetails: {
              input: !!existingItem.input,
              range: !!existingItem.range,
              num_inputs: existingItem.num_inputs,
              inputLength: existingItem.input?.length
            },
            newDetails: {
              input: !!item.input,
              range: !!item.range,
              num_inputs: item.num_inputs,
              inputLength: item.input?.length
            }
          });

          // Smart field comparison: only update fields that exist in both objects
          // and are not critical complex structures
          const criticalFields = ['input', 'range', 'num_inputs', 'an_inputs']; // Protect these arrays/complex fields
          const existingKeys = Object.keys(existingItem);
          const newKeys = Object.keys(item);
          const commonFields = existingKeys.filter(key => newKeys.includes(key));
          const fieldsToUpdate = commonFields.filter(key => !criticalFields.includes(key));

          // LogUtil.Debug(`📊 HandleGetEntriesRes / Smart field comparison for ${item.id}:`, {
          //   existingKeys: existingKeys.length,
          //   newKeys: newKeys.length,
          //   commonFields: commonFields.length,
          //   fieldsToUpdate: fieldsToUpdate.length,
          //   criticalFieldsProtected: criticalFields.filter(cf => existingKeys.includes(cf)),
          //   updateFields: fieldsToUpdate
          // });

          // Update only the safe common fields
          let updatedCount = 0;
          fieldsToUpdate.forEach(field => {
            if (existingItem[field] !== item[field]) {
              // LogUtil.Debug(`🔄 HandleGetEntriesRes / Updating field '${field}': '${existingItem[field]}' '${item[field]}'`);
              existingItem[field] = item[field];
              updatedCount++;
            }
          });

          // LogUtil.Info(`HandleGetEntriesRes / Smart partial update applied for ${item.id}: ${updatedCount} fields updated, ${criticalFields.length} critical fields protected`);
        } else if (potentialDataLoss) {
          // Handle other types of potential data loss (not just monitors)
          // LogUtil.Warn(`⚠️ POTENTIAL DATA LOSS DETECTED! Applying smart update for ${item.type} item:`, {
          //   id: item.id,
          //   pid: item.pid,
          //   type: item.type,
          //   existingComplexity: this.getDataComplexityInfo(existingItem),
          //   newComplexity: this.getDataComplexityInfo(item)
          // });

          // Use the same smart field comparison approach
          const complexFields = this.getComplexFields(existingItem);
          const existingKeys = Object.keys(existingItem);
          const newKeys = Object.keys(item);
          const commonFields = existingKeys.filter(key => newKeys.includes(key));
          const fieldsToUpdate = commonFields.filter(key => !complexFields.includes(key));

          let updatedCount = 0;
          fieldsToUpdate.forEach(field => {
            if (existingItem[field] !== item[field]) {
              // LogUtil.Debug(`🔄 HandleGetEntriesRes / Updating ${item.type} field '${field}': '${existingItem[field]}' '${item[field]}'`);
              existingItem[field] = item[field];
              updatedCount++;
            }
          });

          // LogUtil.Info(`HandleGetEntriesRes / Smart update for ${item.type} ${item.id}: ${updatedCount} fields updated, ${complexFields.length} complex fields protected`);
        } else {
          // Safe to do full replacement
          T3000_Data.value.panelsData[itemIndex] = item;
          // LogUtil.Debug(`HandleGetEntriesRes / Full replacement done for ${item.id}`);
        }
      } else {
        // LogUtil.Debug(`= ws: HandleGetEntriesRes / item ${itemIdx}: NOT FOUND in panelsData:`, {
        //   id: item.id,
        //   pid: item.pid,
        //   index: item.index,
        //   type: item.type
        // });
      }
    });

    if (!linkT3EntryDialog.value.active) {
      selectPanelOptions.value = T3000_Data.value.panelsData;
    }
    IdxUtils.refreshLinkedEntries(msgData.data);
    IdxUtils.refreshLinkedEntries2(msgData.data);

    // LogUtil.Debug('= ws: HandleGetEntriesRes / AFTER - panelsData length:', T3000_Data.value.panelsData.length);
    // LogUtil.Debug('= ws: HandleGetEntriesRes END ===================');
  }

  public HandleLoggingDataRes(msgData) {
    // action: 15, // LOGGING_DATA_RES
    LogUtil.Debug('= ws: HandleLoggingDataRes START =================');
    LogUtil.Debug('= ws: HandleLoggingDataRes / response structure:', {
      hasData: !!(msgData?.data),
      dataLength: msgData?.data?.length || 0,
    });

    // Extract and flatten device_data arrays from nested structure
    let allPoints = [];

    if (msgData.data && Array.isArray(msgData.data)) {
      msgData.data.forEach((device, deviceIdx) => {
        LogUtil.Debug(`= ws: HandleLoggingDataRes / device ${deviceIdx}:`, {
          panel_id: device.panel_id,
          panel_name: device.panel_name,
          panel_serial_number: device.panel_serial_number,
          hasDeviceData: !!(device.device_data),
          deviceDataLength: device.device_data?.length || 0
        });

        if (device.device_data && Array.isArray(device.device_data)) {
          allPoints = allPoints.concat(device.device_data);
        }
      });
    }

    LogUtil.Debug('= ws: HandleLoggingDataRes / total points extracted:', allPoints.length);

    // Normalize fields to match GET_ENTRIES_RES format
    allPoints.forEach((item, itemIdx) => {
      // Fix 1: Rename "unit" → "units"
      if (item.unit !== undefined && item.units === undefined) {
        item.units = item.unit;
        delete item.unit;
      }

      // Fix 2: Convert type format: "INPUT" → "IN", "OUTPUT" → "OUT", "VARIABLE" → "VAR"
      if (item.type) {
        const typeMap = {
          'INPUT': 'IN',
          'OUTPUT': 'OUT',
          'VARIABLE': 'VAR'
        };
        if (typeMap[item.type]) {
          item.type = typeMap[item.type];
        }
      }

      // Fix 3: Rename calibration fields (for compatibility)
      if (item.calibration_h !== undefined && item.calibration === undefined) {
        item.calibration = item.calibration_h;
      }
      if (item.calibration_sign !== undefined && item.sign === undefined) {
        item.sign = item.calibration_sign;
      }

      // Update T3000_Data.panelsData (same logic as GET_ENTRIES_RES)
      const itemIndex = T3000_Data.value.panelsData.findIndex(
        (ii) =>
          ii.index === item.index &&
          ii.type === item.type &&
          ii.pid === item.pid
      );

      if (itemIndex !== -1) {
        const existingItem = T3000_Data.value.panelsData[itemIndex];

        // Same smart update logic as GET_ENTRIES_RES
        const existingIsDetailedMonitor = existingItem.type === 'MON' &&
          (Array.isArray(existingItem.input) || Array.isArray(existingItem.range) || existingItem.num_inputs > 0);
        const newIsSimplifiedMonitor = item.type === 'MON' &&
          !Array.isArray(item.input) && !Array.isArray(item.range) && !item.num_inputs;

        const existingHasComplexData = this.hasComplexDataStructures(existingItem);
        const newLacksComplexData = !this.hasComplexDataStructures(item);
        const potentialDataLoss = existingHasComplexData && newLacksComplexData;

        if (existingIsDetailedMonitor && newIsSimplifiedMonitor) {
          LogUtil.Warn(`🚨 DATA CORRUPTION PREVENTED! [LOGGING_DATA] Attempted to replace detailed monitor with simplified version:`, {
            id: item.id,
            pid: item.pid
          });

          const criticalFields = ['input', 'range', 'num_inputs', 'an_inputs'];
          const existingKeys = Object.keys(existingItem);
          const newKeys = Object.keys(item);
          const commonFields = existingKeys.filter(key => newKeys.includes(key));
          const fieldsToUpdate = commonFields.filter(key => !criticalFields.includes(key));

          fieldsToUpdate.forEach(field => {
            if (existingItem[field] !== item[field]) {
              existingItem[field] = item[field];
            }
          });
        } else if (potentialDataLoss) {
          const complexFields = this.getComplexFields(existingItem);
          const existingKeys = Object.keys(existingItem);
          const newKeys = Object.keys(item);
          const commonFields = existingKeys.filter(key => newKeys.includes(key));
          const fieldsToUpdate = commonFields.filter(key => !complexFields.includes(key));

          fieldsToUpdate.forEach(field => {
            if (existingItem[field] !== item[field]) {
              existingItem[field] = item[field];
            }
          });
        } else {
          T3000_Data.value.panelsData[itemIndex] = item;
        }
      }
    });

    if (!linkT3EntryDialog.value.active) {
      selectPanelOptions.value = T3000_Data.value.panelsData;
    }
    IdxUtils.refreshLinkedEntries(allPoints);
    IdxUtils.refreshLinkedEntries2(allPoints);

    LogUtil.Debug('= ws: HandleLoggingDataRes / AFTER - panelsData length:', T3000_Data.value.panelsData.length);
    LogUtil.Debug('= ws: HandleLoggingDataRes END ===================');
  }

  public HandleLoadGraphicEntryRes(msgData) {
    // action: 7, // LOAD_GRAPHIC_ENTRY_RES

    // TODO refer to WebViewClient-> HandleLoadGraphicEntryRes, appState
    msgData.data = JSON.parse(msgData.data);
    appState.value = msgData.data;

    // Restore UI state from appState
    if (typeof appState.value.rulersGridVisible !== 'undefined') {
      rulersGridVisible.value = appState.value.rulersGridVisible;
    }
    if (typeof appState.value.locked !== 'undefined') {
      locked.value = appState.value.locked;
    }

    if (grpNav.value.length > 1) {
      const navItem = grpNav.value[grpNav.value.length - 2];
      if (navItem.index !== msgData.entry.index || navItem.pid !== msgData.entry.pid) {
        grpNav.value.push(msgData.entry);
      } else {
        grpNav.value.pop();
      }
    } else {
      grpNav.value.push(msgData.entry);
    }

    setTimeout(() => {
      IdxUtils.refreshMoveableGuides();
    }, 100);

    // Refresh element count in right-side panel after loading graphic entry
    const currentDevice = this.deviceOpt?.getCurrentDevice();
    if (currentDevice) {
      this.deviceOpt?.refreshGraphicPanelElementCount(currentDevice);
    }
  }

  public HandleOpenEntryEditWindowRes(msgData) {
    // action: 8, // OPEN_ENTRY_EDIT_WINDOW_RES
  }

  public HandleSaveImageRes(msgData) {
    // action: 9, // SAVE_IMAGE_RES

    // refer to WebViewClient-> HandleSaveImageRes
    library.value.imagesCount++;
    library.value.images.push({
      id: "IMG-" + library.value.imagesCount,
      name: msgData.data.name,
      path: msgData.data.path,
      online: false,
    });

    IdxUtils.saveLib();
  }

  public HandleSaveLibraryDataRes(msgData) {
    // action: 10, // SAVE_LIBRARY_DATA_RES
  }

  public HandleSaveNewLibraryDataRes(msgData) {
    // action: 14, // SAVE_NEW_LIBRARY_DATA_RES
    LogUtil.Debug('= ws: Handle SAVE_NEW_LIBRARY_DATA_RES', msgData.data);
  }

  public HandleDeleteImageRes(msgData) {
    // action: 11, // DELETE_IMAGE_RES
  }

  public HandleGetAllDevicesDataRes(msgData) {
    // action: 12, // GET_ALL_DEVICES_DATA_RES
  }

  public HandleDataServerOnline(msgData) {
    // action: -1, // DATA_SERVER_ONLINE

    // refresh panel list
    this.GetPanelsList();

    // refresh appState
    const currentDevice = this.deviceOpt?.getCurrentDevice();

    const panelId = currentDevice?.deviceId;
    const graphicId = currentDevice?.graphic;

    if (panelId && graphicId) {
      this.GetInitialData(panelId, graphicId);
    }
  }

  //#endregion

  initQuasar(quasar) {
    this.$q = quasar;
  }

  handleError(messageData) {
    if (!messageData && !messageData.error) return;
    T3Util.Error('= ws: handleError/ messageData:', messageData);

    const errorMsg = messageData?.error ?? "";
    const isSpecial = messageData.action === MessageType.GET_PANEL_DATA_RES || messageData.action === MessageType.GET_INITIAL_DATA_RES || messageData.action === MessageType.GET_PANELS_LIST_RES;

    if (isSpecial) {
      // handle special message GET_PANEL_DATA_RES | GET_INITIAL_DATA_RES | GET_PANELS_LIST_RES
      this.handleSpecialMessage(messageData);
    }
    else {
      if (errorMsg !== "") {
        // Hvac.QuasarUtil.ShowWebSocketError(errorMsg);
        T3UIUtil.ShowWebSocketError(errorMsg);
      }
    }
  }

  showSuccess(response) {
    /*
    LOAD_GRAPHIC_ENTRY
    GET_INITIAL_DATA
    tempjson["data"] = nbuff_str;
    tempjson["data"]["status"] = true;
    */

    const rspAction = response?.action ?? -1;
    const rspStatus = response?.data?.status ?? false;

    LogUtil.Debug('= ws: showSuccess | action:', rspAction, '| status:', rspStatus);

    if (rspAction == MessageType.LOAD_GRAPHIC_ENTRY_RES) {
      this.quasarUtil?.ShowLOAD_GRAPHIC_ENTRY_RESSuccess();
    }

    if (rspAction == MessageType.GET_INITIAL_DATA_RES) {
      this.quasarUtil?.ShowGET_INITIAL_DATA_RESSuccess();
    }
  }

  handleSpecialMessage(messageData) {

    // Add global error message and retry those action 3 times
    // GET_PANEL_DATA_RES | GET_INITIAL_DATA_RES | GET_PANELS_LIST_RES
    const action = messageData.action;

    // Track consecutive errors and stop retrying after limit
    const now = Date.now();
    const timeSinceLastError = now - this.lastErrorTime;

    // Reset error count if more than 60 seconds since last error
    if (timeSinceLastError > 60000) {
      this.dataRequestErrorCount = 0;
    }

    this.dataRequestErrorCount++;
    this.lastErrorTime = now;

    // Stop retrying if we've hit the error limit
    if (this.dataRequestErrorCount > this.maxDataRequestErrors) {
      LogUtil.Warn(`⚠️ Stopped retrying after ${this.maxDataRequestErrors} consecutive errors for action: ${action}`);
      LogUtil.Warn(`Error message: ${messageData.error}`);
      // Show a single error message and stop
      if (this.dataRequestErrorCount === this.maxDataRequestErrors + 1) {
        const errorMsg = `Unable to load panel data after ${this.maxDataRequestErrors} attempts. ${messageData.error}`;
        T3UIUtil.ShowWebSocketError(errorMsg);
      }

      // Load demo data as fallback if panel data is empty
      if (action == MessageType.GET_PANEL_DATA_RES && T3000_Data.value.panelsData.length === 0) {
        LogUtil.Info('📦 Loading demo data as fallback after max retries');
        this.loadDemoDataFallback();
      }

      return; // Don't retry anymore
    }

    if (action == MessageType.GET_PANEL_DATA_RES || action == MessageType.GET_PANELS_LIST_RES) {
      const errorMsg = `Load device data failed with error: "${messageData.error}". Retry ${this.dataRequestErrorCount}/${this.maxDataRequestErrors}`;
      LogUtil.Warn(errorMsg);

      // Check if this is a 'no cached data' error - don't retry since data doesn't exist
      if (messageData.error && messageData.error.includes('No cached data')) {
        LogUtil.Info('📦 No cached data available for this panel, dismissing loading and stopping retry');

        // Clear loading state to dismiss the loading dialog
        T3000_Data.value.loadingPanel = null;

        // Load demo data as fallback ONLY if we have no data at all
        if (T3000_Data.value.panelsData.length === 0) {
          LogUtil.Info('📦 No panel data exists, loading demo data as fallback');
          this.loadDemoDataFallback();
        }

        // Reset error count since this is expected behavior, not a real error
        this.dataRequestErrorCount = 0;

        // Don't retry - data genuinely doesn't exist for this panel
        return;
      }

      // Only show error on last retry
      if (this.dataRequestErrorCount === this.maxDataRequestErrors) {
        T3UIUtil.ShowWebSocketError(errorMsg);
      }

      // Add delay before retry to prevent flooding
      setTimeout(() => {
        this.GetPanelsList();
      }, 5000); // Wait 5 seconds before retry
    }

    if (action == MessageType.GET_INITIAL_DATA_RES) {
      const errorMsg = `Load initial data failed with error: "${messageData.error}". Retry ${this.dataRequestErrorCount}/${this.maxDataRequestErrors}`;
      LogUtil.Warn(errorMsg);
      // Only show error on last retry
      if (this.dataRequestErrorCount === this.maxDataRequestErrors) {
        T3UIUtil.ShowWebSocketError(errorMsg);
        // add global error message for blocking auto save
        this.quasarUtil?.setGlobalMsg("error", errorMsg, false, "get_initial_data", null);
      }

      // Don't call reloadInitialData here - let the existing interval handle it
      // this.reloadInitialData(); // REMOVED - causes infinite loop
    }
  }

  reloadInitialData() {
    // Only reload the initial data if the "needRefresh" flag is true
    if (!this.needRefresh) return;
    if (this.reloadInitialDataInterval) return;

    // LogUtil.Debug('= ws: reload-initial-interval start', this.reloadInitialDataInterval);

    // Set a timer to reload the initial data every 30 seconds (reduced from 2 seconds to prevent flooding)
    this.reloadInitialDataInterval = setInterval(() => {
      const currentDevice = this.deviceOpt?.getCurrentDevice();
      const panelId = currentDevice?.deviceId;
      const graphicId = currentDevice?.graphic;

      if (panelId && graphicId) {
        this.GetInitialData(panelId, graphicId);
      }
    }, 30000); // 30 seconds instead of 2 seconds

    // LogUtil.Debug('= ws: reload-initial-interval end', this.reloadInitialDataInterval);
  }

  clearInitialDataInterval() {
    if (this.reloadInitialDataInterval) {
      clearInterval(this.reloadInitialDataInterval);
    }

    this.reloadInitialDataInterval = null;
    LogUtil.Debug('= ws: clearInitialDataInterval / this.reloadInitialDataInterval ', this.reloadInitialDataInterval);
  }

  //#region Helper Methods for Data Integrity

  /**
   * Check if an object has complex data structures that shouldn't be lost
   */
  private hasComplexDataStructures(obj: any): boolean {
    if (!obj || typeof obj !== 'object') return false;

    // Check for arrays
    const hasArrays = Object.values(obj).some(value => Array.isArray(value));

    // Check for nested objects (excluding simple objects)
    const hasNestedObjects = Object.values(obj).some(value =>
      value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length > 0
    );

    // Check for specific complex fields based on object type
    const complexFieldsByType = {
      'MON': ['input', 'range', 'num_inputs', 'an_inputs'],
      'GRP': ['items', 'controls', 'children'],
      'SCH': ['schedule', 'items', 'events'],
      // Add more types as needed
    };

    const complexFields = complexFieldsByType[obj.type] || [];
    const hasTypeSpecificComplexity = complexFields.some(field => obj[field] !== undefined);

    return hasArrays || hasNestedObjects || hasTypeSpecificComplexity;
  }

  /**
   * Get complexity information about an object for logging
   */
  private getDataComplexityInfo(obj: any): any {
    if (!obj || typeof obj !== 'object') return { simple: true };

    const arrays = Object.keys(obj).filter(key => Array.isArray(obj[key]));
    const objects = Object.keys(obj).filter(key =>
      obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])
    );

    return {
      totalFields: Object.keys(obj).length,
      arrays: arrays.length,
      arrayFields: arrays,
      objects: objects.length,
      objectFields: objects,
      hasComplexity: this.hasComplexDataStructures(obj)
    };
  }

  /**
   * Get list of complex fields that should be protected from overwriting
   */
  private getComplexFields(obj: any): string[] {
    if (!obj || typeof obj !== 'object') return [];

    const complexFields = [];

    // Add arrays
    Object.keys(obj).forEach(key => {
      if (Array.isArray(obj[key])) {
        complexFields.push(key);
      }
    });

    // Add nested objects
    Object.keys(obj).forEach(key => {
      if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key]) && Object.keys(obj[key]).length > 0) {
        complexFields.push(key);
      }
    });

    // Add type-specific critical fields
    const criticalFieldsByType = {
      'MON': ['input', 'range', 'num_inputs', 'an_inputs'],
      'GRP': ['items', 'controls', 'children'],
      'SCH': ['schedule', 'items', 'events'],
      'PID': ['parameters', 'settings', 'config'],
      // Add more types as needed
    };

    const typeCriticalFields = criticalFieldsByType[obj.type] || [];
    typeCriticalFields.forEach(field => {
      if (obj[field] !== undefined && !complexFields.includes(field)) {
        complexFields.push(field);
      }
    });

    return complexFields;
  }

  // Helper method to identify the origin of requests based on call stack
  private identifyRequestOrigin(callerInfo: string[]): string {
    for (const caller of callerInfo) {
      if (caller.includes('IndexPageSocket')) {
        return 'TrendLogIndexPageSocket.vue';
      }
      if (caller.includes('IndexPage')) {
        return 'IndexPage.vue';
      }
      if (caller.includes('initializeT3000Data')) {
        return 'T3000_Data_Initialization';
      }
      if (caller.includes('onMounted')) {
        return 'Component_OnMounted_Lifecycle';
      }
      if (caller.includes('setTimeout')) {
        return 'Delayed_Timer_Execution';
      }
      if (caller.includes('HandleGetPanelsListRes')) {
        return 'Auto_Chain_After_PanelsList_Response';
      }
      if (caller.includes('HandleGetPanelDataRes')) {
        return 'Auto_Chain_After_PanelData_Response';
      }
      if (caller.includes('watch')) {
        return 'Vue_Reactive_Watcher';
      }
      if (caller.includes('loadTrendLogItemData')) {
        return 'Data_Loading_Function';
      }
      if (caller.includes('connect')) {
        return 'WebSocket_Connection_Establishment';
      }
    }
    return 'Unknown_Origin';
  }

  // Helper method to categorize the source of the call
  private categorizeCallSource(callerInfo: string[]): string {
    const stackString = callerInfo.join(' ');

    if (stackString.includes('initializeT3000Data')) {
      return 'INITIALIZATION_REQUEST';
    }
    if (stackString.includes('onMounted')) {
      return 'COMPONENT_MOUNT_REQUEST';
    }
    if (stackString.includes('setTimeout')) {
      return 'DELAYED_EXECUTION_REQUEST';
    }
    if (stackString.includes('HandleGetPanelsListRes')) {
      return 'AUTO_CHAIN_AFTER_PANELS_LIST';
    }
    if (stackString.includes('HandleGetPanelDataRes')) {
      return 'AUTO_CHAIN_AFTER_PANEL_DATA';
    }
    if (stackString.includes('watch')) {
      return 'REACTIVE_WATCHER_TRIGGER';
    }
    if (stackString.includes('loadTrendLogItemData')) {
      return 'EXPLICIT_DATA_LOAD_REQUEST';
    }
    if (stackString.includes('retry') || stackString.includes('Retry')) {
      return 'USER_RETRY_REQUEST';
    }
    if (stackString.includes('route')) {
      return 'ROUTE_CHANGE_TRIGGER';
    }
    if (stackString.includes('connect')) {
      return 'WEBSOCKET_CONNECTION_TRIGGER';
    }

    return 'MANUAL_OR_DIRECT_CALL';
  }

  // Helper method to get detailed information about action codes
  private getActionDetails(action: number): any {
    const actionMap = {
      0: {
        name: 'GET_PANEL_DATA',
        description: 'Request panel data from T3000 backend',
        category: 'Data_Request',
        implemented: true,
        responseAction: 'GET_PANEL_DATA_RES'
      },
      1: {
        name: 'GET_INITIAL_DATA',
        description: 'Request initial application data and state',
        category: 'Initialization',
        implemented: true,
        responseAction: 'GET_INITIAL_DATA_RES'
      },
      2: {
        name: 'SAVE_GRAPHIC_DATA',
        description: 'Save graphic/layout data to T3000',
        category: 'Data_Save',
        implemented: true,
        responseAction: 'SAVE_GRAPHIC_DATA_RES'
      },
      3: {
        name: 'UPDATE_ENTRY',
        description: 'Update a specific entry/field value',
        category: 'Data_Update',
        implemented: true,
        responseAction: 'UPDATE_ENTRY_RES'
      },
      4: {
        name: 'GET_PANELS_LIST',
        description: 'Request list of available panels',
        category: 'Data_Request',
        implemented: true,
        responseAction: 'GET_PANELS_LIST_RES'
      },
      5: {
        name: 'GET_PANEL_RANGE_INFO',
        description: 'Request panel range information',
        category: 'Data_Request',
        implemented: false, // Marked with ❓！
        responseAction: 'GET_PANEL_RANGE_INFO_RES'
      },
      6: {
        name: 'GET_ENTRIES',
        description: 'Request specific entries data',
        category: 'Data_Request',
        implemented: true,
        responseAction: 'GET_ENTRIES_RES'
      },
      7: {
        name: 'LOAD_GRAPHIC_ENTRY',
        description: 'Load graphic entry for editing',
        category: 'UI_Navigation',
        implemented: true,
        responseAction: 'LOAD_GRAPHIC_ENTRY_RES'
      },
      8: {
        name: 'OPEN_ENTRY_EDIT_WINDOW',
        description: 'Open entry edit window in T3000',
        category: 'UI_Action',
        implemented: true,
        responseAction: 'OPEN_ENTRY_EDIT_WINDOW_RES'
      },
      9: {
        name: 'SAVE_IMAGE',
        description: 'Save image file to T3000 library',
        category: 'File_Operation',
        implemented: true,
        responseAction: 'SAVE_IMAGE_RES'
      },
      10: {
        name: 'SAVE_LIBRARY_DATA',
        description: 'Save library data to T3000',
        category: 'Data_Save',
        implemented: true, // Marked with ✔❓
        responseAction: 'SAVE_LIBRARY_DATA_RES'
      },
      11: {
        name: 'DELETE_IMAGE',
        description: 'Delete image from T3000 library',
        category: 'File_Operation',
        implemented: true,
        responseAction: 'DELETE_IMAGE_RES'
      },
      12: {
        name: 'GET_SELECTED_DEVICE_INFO',
        description: 'Get information about selected device',
        category: 'Device_Info',
        implemented: true,
        responseAction: 'GET_SELECTED_DEVICE_INFO_RES'
      },
      13: {
        name: 'BIND_DEVICE',
        description: 'Bind/connect to a device',
        category: 'Device_Operation',
        implemented: false, // Marked with ❓！
        responseAction: 'BIND_DEVICE_RES'
      },
      14: {
        name: 'SAVE_NEW_LIBRARY_DATA',
        description: 'Save new library data to T3000',
        category: 'Data_Save',
        implemented: false, // Marked with ❓！
        responseAction: 'SAVE_NEW_LIBRARY_DATA_RES'
      }
    };

    return actionMap[action] || {
      name: 'UNKNOWN_ACTION',
      description: `Unknown action code: ${action}`,
      category: 'Unknown',
      implemented: false,
      responseAction: 'UNKNOWN_RES'
    };
  }

  //#endregion
}

export default WebSocketClient
