

import MessageType from "./MessageType"
import MessageModel from "./MessageModel"
import Hvac from "../../Hvac"
import IdxUtils from '../Common/IdxUtils'
import Utils1 from "../../Util/Utils1"
import T3Util from "../../Util/T3Util"
import { grpNav, library, T3000_Data, linkT3EntryDialog, selectPanelOptions, appState, globalMsg } from '../../Data/T3Data'
import T3UIUtil from "../UI/T3UIUtil"

class WebSocketClient {

  private socket: WebSocket;
  private retries: number = 0;
  private maxRetries: number = 10;
  private pingInterval: number = 10000; // 10 seconds
  private uri: string;
  public messageModel: MessageModel;
  public messageData: string;
  public needRefresh: boolean = true;
  public $q: any;
  public reloadInitialDataInterval: any;

  constructor() { }

  public connect() {

    this.uri = this.getUri();

    //ws://localhost:9104 || ws://127.0.0.1:9104
    const wsUri = `ws://${this.uri}:9104`;
    this.socket = new WebSocket(wsUri);

    this.socket.onopen = this.onOpen.bind(this);
    this.socket.onmessage = this.onMessage.bind(this);
    this.socket.onclose = this.onClose.bind(this);
    this.socket.onerror = this.onError.bind(this);
  }

  private onOpen(event: Event) {
    T3Util.Log('= Ws connection opened:', event);

    this.retries = 0;
    // this.startPing();

    if (this.socket.readyState === WebSocket.OPEN) {
      this.bindCurrentClient();
    }

    // Refesh the data if re/connected to the data client
    this.GetPanelsList();
  }

  private onMessage(event: MessageEvent) {
    // T3Util.Log('= Ws message received:', event.data);
    this.processMessage(event.data);
  }

  private onClose(event: CloseEvent) {
    T3Util.Log('= Ws connection closed:', event);
    this.attemptReconnect();
  }

  private onError(event: Event) {
    T3Util.LogError('= Ws error:', event);

    const errorMsg = `Load device data failed, please check whether the T3000 application is running or not.`;
    // Hvac.QuasarUtil.ShowWebSocketError(errorMsg);
    T3UIUtil.ShowWebSocketError(errorMsg);

    this.attemptReconnect();
  }

  private startPing() {
    setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send("ping");
      }
    }, this.pingInterval);
  }

  private attemptReconnect() {
    if (this.retries < this.maxRetries) {
      T3Util.Log(`= Ws attempting to reconnect (${this.retries + 1}/${this.maxRetries})`);
      setTimeout(() => {
        this.retries++;
        this.connect();
      }, 5000); // 5 seconds
    } else {
      T3Util.Log("= Ws max retries reached. Giving up.");
    }
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
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket?.send(message);
      const currentDateTime = new Date().toLocaleString();
      T3Util.Log('= Ws send message to T3 at', currentDateTime, message);
    } else {
      T3Util.Log('= Ws send message | socket is not open | ready state:', this.socket.readyState);

      // Store the message to send after reconnection
      const pendingMessage = message;

      // Remove existing onopen handler to avoid duplicates
      this.socket.onopen = null;

      // If socket is closed or closing, reconnect
      if (this.socket.readyState === WebSocket.CLOSED || this.socket.readyState === WebSocket.CLOSING) {
        T3Util.Log('= Ws reconnecting before sending message...');

        // Create new socket connection
        this.connect();

        // Set up onopen handler for the new connection
        this.socket.onopen = (event: Event) => {
          T3Util.Log('= Ws reconnected successfully, sending pending message');
          // Call the original onOpen handler
          this.onOpen(event);

          // Send the pending message
          if (this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(pendingMessage);
            T3Util.Log('= Ws pending message sent after reconnection');
          } else {
            T3Util.LogError('= Ws failed to send message after reconnection attempt');
          }
        };
      } else {
        // Socket is connecting, wait for it to open
        this.socket.onopen = () => {
          T3Util.Log('= Ws connection established, sending pending message');
          this.socket.send(pendingMessage);
        };
      }
    }
  }

  //#region  Format Message

  public FormatMessageData(action: number, panelId: number, viewitem: number, data: any) {

    // get the serial_number base on panelId
    const serialNumber = Hvac.DeviceOpt.getSerialNumber(panelId);

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

    const currentDevice = Hvac.DeviceOpt.getCurrentDevice();
    if (currentDevice === null || currentDevice == undefined) return;

    const graphicId = currentDevice.graphic;

    // get the serial_number base on panelId
    const serialNumber = Hvac.DeviceOpt.getSerialNumber(panelId);

    this.messageModel = new MessageModel();
    this.messageModel.setHeader();
    this.messageModel.setMessage(MessageType.UPDATE_ENTRY, panelId, graphicId, null, serialNumber);

    this.messageModel.message.field = data.field;
    this.messageModel.message.value = data.value;
    this.messageModel.message.entryIndex = data.entryIndex;
    this.messageModel.message.entryType = data.entryType;

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

    const currentDevice = Hvac.DeviceOpt.getCurrentDevice();
    if (currentDevice === null || currentDevice === undefined) return;

    const panelId = currentDevice.panelId;
    const graphicId = currentDevice.graphic;

    const serialNumber = Hvac.DeviceOpt.getSerialNumber(panelId);

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

    const currentDevice = Hvac.DeviceOpt.getCurrentDevice();
    if (currentDevice === null || currentDevice === undefined) return;

    const panelId = data.panelId || currentDevice.panenId;
    const graphicId = currentDevice.graphic;

    const serialNumber = Hvac.DeviceOpt.getSerialNumber(panelId);

    this.messageModel = new MessageModel();
    this.messageModel.setHeader();
    this.messageModel.setMessage(MessageType.LOAD_GRAPHIC_ENTRY, panelId, graphicId, null, serialNumber);

    this.messageModel.message.entryIndex = data.entryIndex;

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

    const currentDevice = Hvac.DeviceOpt.getCurrentDevice();
    if (currentDevice === null || currentDevice === undefined) return;

    const panelId = data.panelId || currentDevice.panenId;
    const graphicId = currentDevice.graphic;

    const serialNumber = Hvac.DeviceOpt.getSerialNumber(panelId);

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

  // action: 2,  // SAVE_GRAPHIC_DATA / SAVE_GRAPHIC_DATA_RES ✔
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

    this.FormatMessageData(MessageType.GET_PANELS_LIST, null, null, null);
    this.sendMessage(this.messageData);

    // this.sendMessage(JSON.stringify({ action: MessageType.GET_PANELS_LIST }));
  }

  public GetEntries(data: any[]) {
    // action: 6, // GET_ENTRIES

    const currentDevice = Hvac.DeviceOpt.getCurrentDevice();
    if (currentDevice === null || currentDevice === undefined) return;

    const panelId = currentDevice.deviceId;
    const graphicId = currentDevice.graphic;
    const serialNumber = currentDevice.serialNumber;

    this.FormatMessageData(MessageType.GET_ENTRIES, panelId, graphicId, data);
    this.sendMessage(this.messageData);

    // this.sendMessage(JSON.stringify({ action: MessageType.GET_ENTRIES }));
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

    const currentDevice = Hvac.DeviceOpt.getCurrentDevice();
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
        T3Util.Log('= Ws Received data:', true, { action: "GET_INITIAL_DATA_RES", data, entry, library });
      }
      else {
        T3Util.Log('= Ws Received data:', parsedData);
      }
    }
    catch (error) {
      T3Util.Log('= Ws Received data error', error);
    }
  }

  private processMessage(data: any) {

    T3Util.Log('= Ws received origin data', data);

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

      T3Util.Log('= ========================');
    } catch (error) {
      T3Util.LogError('= Ws failed to parse | process data:', error);
    }
  }

  private processMessageData(msgData) {

    if (msgData.action === MessageType.GET_PANEL_DATA_RES) {
      this.HandleGetPanelDataRes(msgData);
    }

    if (msgData.action === MessageType.GET_INITIAL_DATA_RES) {
      this.HandleGetInitialDataRes(msgData);
    }

    if (msgData.action === MessageType.SAVE_GRAPHIC_DATA_RES) {
      this.HandleSaveGraphicRes(msgData);
    }

    if (msgData.action === MessageType.UPDATE_ENTRY_RES) {
      this.HandleUpdateEntryRes(msgData);
    }

    if (msgData.action === MessageType.GET_PANELS_LIST_RES) {
      this.HandleGetPanelsListRes(msgData);
    }

    if (msgData.action === MessageType.GET_ENTRIES_RES) {
      this.HandleGetEntriesRes(msgData);
    }

    if (msgData.action === MessageType.LOAD_GRAPHIC_ENTRY_RES) {
      this.HandleLoadGraphicEntryRes(msgData);
    }

    if (msgData.action === MessageType.OPEN_ENTRY_EDIT_WINDOW_RES) {
      this.HandleOpenEntryEditWindowRes(msgData);
    }

    if (msgData.action === MessageType.SAVE_IMAGE_RES) {
      this.HandleSaveImageRes(msgData);
    }

    if (msgData.action === MessageType.SAVE_LIBRARY_DATA_RES) {
      this.HandleSaveLibraryDataRes(msgData);
    }

    if(msgData.action===MessageType.SAVE_NEW_LIBRARY_DATA_RES){
      this.HandleSaveNewLibraryDataRes(msgData);
    }

    if (msgData.action === MessageType.DELETE_IMAGE_RES) {
      this.HandleDeleteImageRes(msgData);
    }

    // specify action -1 [Data server is back online (T3 application)]
    if (msgData.action === MessageType.DATA_SERVER_ONLINE) {
      this.HandleDataServerOnline(msgData);
    }
  }

  public HandleGetPanelDataRes(msgData) {
    /*
     load graphic list from GET_PANEL_DATA_RES
     => action: 0, // GET_PANEL_DATA_RES
     => { command: "1GRP2", description: "Test2", id: "GRP2", index: 1, label: "TEST2", pid: 1 }
    */

    Hvac.DeviceOpt.initGraphicList(msgData.data);

    // refer to WebViewClient-> HandleGetPanelDataRes

    if (msgData?.panel_id) {
      Hvac.IdxPage.clearGetPanelsInterval();
    }

    if (msgData?.panel_id) {

      const check1 = T3000_Data.value.loadingPanel !== null && T3000_Data.value.loadingPanel < T3000_Data.value.panelsList.length - 1;
      if (check1) {
        T3000_Data.value.loadingPanel++;
        const index = T3000_Data.value.loadingPanel;
        // window.chrome?.webview?.postMessage({
        //   action: 0, // GET_PANEL_DATA
        //   panelId: T3000_Data.value.panelsList[index].panel_number,
        // });

        this.GetPanelData(T3000_Data.value.panelsList[index].panel_number);
      }

      const check2 = T3000_Data.value.loadingPanel !== null && T3000_Data.value.loadingPanel === T3000_Data.value.panelsList.length - 1;
      if (check2) {
        T3000_Data.value.loadingPanel = null;
      }

      T3000_Data.value.panelsData = T3000_Data.value.panelsData.filter(
        (item) => item.pid !== msgData.panel_id
      );

      T3000_Data.value.panelsData = T3000_Data.value.panelsData.concat(
        msgData.data
      );

      T3000_Data.value.panelsData.sort((a, b) => a.pid - b.pid);
      selectPanelOptions.value = T3000_Data.value.panelsData;

      T3000_Data.value.panelsRanges = T3000_Data.value.panelsRanges.filter(
        (item) => item.pid !== msgData.panel_id
      );

      T3000_Data.value.panelsRanges = T3000_Data.value.panelsRanges.concat(msgData.ranges);

      IdxUtils.refreshLinkedEntries(msgData.data);
      IdxUtils.refreshLinkedEntries2(msgData.data);
    }
  }

  public HandleGetInitialDataRes(msgData) {
    // action: 1, // GET_INITIAL_DATA_RES
    const appStateData = msgData.data;

    // save the T3 data to localstorage with key 'tempAppState'
    if (appStateData !== null && appStateData !== undefined) {
      localStorage.setItem('tempAppState', appStateData);
    }

    const parsedAppStateData = JSON.parse(appStateData);
    T3Util.Log('= Ws GET_INITIAL_DATA_RES -appState | needRefresh:', parsedAppStateData, this.needRefresh);

    if (!this.needRefresh) return;

    // merge the appState data to the current appState
    // Hvac.DeviceOpt.mergeAppState(parsedAppStateData);

    // sync t3 appState data to ls [deviceAppState]
    Hvac.DeviceOpt.syncTempAppStateToDeviceAppState();

    // load device appstate
    Hvac.DeviceOpt.refreshDeviceAppState();

    // refresh the current device
    Hvac.DeviceOpt.refreshCurrentDevice();

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
    Hvac.QuasarUtil.clearGlobalMsg("get_initial_data");
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
    Hvac.DeviceOpt.initDeviceList(data);
    T3Util.Log('= Ws GET_PANELS_LIST_RES', Hvac.DeviceOpt.deviceList);

    // load the first panel's panel data by default
    const firstPanelId = data.length > 0 ? data[0].panel_number : null;
    if (firstPanelId !== null) {
      this.GetPanelData(firstPanelId);
    }

    const currentDevice = JSON.parse(localStorage.getItem('currentDevice') || '{}');
    if (!currentDevice.deviceId) {
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
    T3Util.Log('= Ws GET_ENTRIES_RES', msgData.data);

    // TODO refer to WebViewClient-> HandleGetEntriesRes
    msgData.data.forEach((item) => {
      const itemIndex = T3000_Data.value.panelsData.findIndex(
        (ii) =>
          ii.index === item.index &&
          ii.type === item.type &&
          ii.pid === item.pid
      );
      if (itemIndex !== -1) {
        T3000_Data.value.panelsData[itemIndex] = item;
      }
    });

    if (!linkT3EntryDialog.value.active) {
      selectPanelOptions.value = T3000_Data.value.panelsData;
    }
    IdxUtils.refreshLinkedEntries(msgData.data);
    IdxUtils.refreshLinkedEntries2(msgData.data);
  }

  public HandleLoadGraphicEntryRes(msgData) {
    // action: 7, // LOAD_GRAPHIC_ENTRY_RES

    // TODO refer to WebViewClient-> HandleLoadGraphicEntryRes, appState
    msgData.data = JSON.parse(msgData.data);
    appState.value = msgData.data;

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
    T3Util.Log('= Ws Handle SAVE_NEW_LIBRARY_DATA_RES', msgData.data);
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
    const currentDevice = Hvac.DeviceOpt.getCurrentDevice();

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
    T3Util.LogError('= Ws error:', messageData);

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

    T3Util.Log('= Ws showSuccess | action:', rspAction, '| status:', rspStatus);

    if (rspAction == MessageType.LOAD_GRAPHIC_ENTRY_RES) {
      Hvac.QuasarUtil.ShowLOAD_GRAPHIC_ENTRY_RESSuccess();
    }

    if (rspAction == MessageType.GET_INITIAL_DATA_RES) {
      Hvac.QuasarUtil.ShowGET_INITIAL_DATA_RESSuccess();
    }
  }

  handleSpecialMessage(messageData) {

    // Add global error message and retry those action 3 times
    // GET_PANEL_DATA_RES | GET_INITIAL_DATA_RES | GET_PANELS_LIST_RES
    const action = messageData.action;

    if (action == MessageType.GET_PANEL_DATA_RES || action == MessageType.GET_PANELS_LIST_RES) {
      const errorMsg = `Load device data failed with error: "${messageData.error}". Please check whether the T3000 application is running or not.`;
      // Hvac.QuasarUtil.ShowWebSocketError(errorMsg);
      T3UIUtil.ShowWebSocketError(errorMsg);

      this.GetPanelsList();
    }

    if (action == MessageType.GET_INITIAL_DATA_RES) {
      const errorMsg = `Load initial data failed with error: "${messageData.error}". Please try not update the graphic area, this may cause data loss. Please check whether the T3000 application is running or not.`;
      // Hvac.QuasarUtil.ShowWebSocketError(errorMsg);
      T3UIUtil.ShowWebSocketError(errorMsg);
      this.reloadInitialData();

      // add global error message for blocking auto save
      Hvac.QuasarUtil.setGlobalMsg("error", errorMsg, false, "get_initial_data", null);
    }
  }

  reloadInitialData() {
    // Only reload the initial data if the "needRefresh" flag is true
    if (!this.needRefresh) return;
    if (this.reloadInitialDataInterval) return;

    T3Util.Log('= Ws reload-initial-interval start', this.reloadInitialDataInterval);

    // Set a timer to reload the initial data every 5 minutes
    this.reloadInitialDataInterval = setInterval(() => {
      const currentDevice = Hvac.DeviceOpt.getCurrentDevice();
      const panelId = currentDevice?.deviceId;
      const graphicId = currentDevice?.graphic;

      if (panelId && graphicId) {
        this.GetInitialData(panelId, graphicId);
      }
    }, 2000);

    T3Util.Log('= Ws reload-initial-interval end', this.reloadInitialDataInterval);
  }

  clearInitialDataInterval() {
    if (this.reloadInitialDataInterval) {
      clearInterval(this.reloadInitialDataInterval);
    }

    this.reloadInitialDataInterval = null;
    T3Util.Log('= Ws reload-initial-interval clear', this.reloadInitialDataInterval);
  }
}

export default WebSocketClient
