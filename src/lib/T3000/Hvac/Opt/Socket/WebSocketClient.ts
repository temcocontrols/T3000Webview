

import MessageType from "./MessageType"
import MessageModel from "./MessageModel"
import Hvac from "../../Hvac"
import Utils5 from '../../Helper/Utils5'
import { grpNav, library, T3000_Data, linkT3EntryDialog, selectPanelOptions, appState } from '../../Data/T3Data'
import IdxUtils from '../IdxUtils'

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
    console.log('= Ws connection opened:', event);

    this.retries = 0;
    // this.startPing();

    if (this.socket.readyState === WebSocket.OPEN) {
      this.bindCurrentClient();
    }

    // Refesh the data if re/connected to the data client
    this.GetPanelsList();
  }

  private onMessage(event: MessageEvent) {
    // console.log('= Ws message received:', event.data);
    this.processMessage(event.data);
  }

  private onClose(event: CloseEvent) {
    console.log('= Ws connection closed:', event);
    this.attemptReconnect();
  }

  private onError(event: Event) {
    console.error('= Ws error:', event);
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
      console.log(`= Ws attempting to reconnect (${this.retries + 1}/${this.maxRetries})`);
      setTimeout(() => {
        this.retries++;
        this.connect();
      }, 5000); // 5 seconds
    } else {
      console.log("= Ws max retries reached. Giving up.");
    }
  }

  public getUri() {
    const url = new URL(window.location.href);
    return url.hostname;
  }

  public bindCurrentClient() {

    /*
    // get clientId from local storage
    let lsClientId = localStorage.getItem('clientId');

    if (lsClientId == undefined || lsClientId === null || lsClientId === "") {
      lsClientId = this.GenerateUUID();

      localStorage.setItem('clientId', lsClientId);
    }
    */

    const clientId = Utils5.generateUUID();
    this.messageModel = new MessageModel();
    this.messageModel.setHeader();
    this.messageModel.setMessage(13, null, null, null, null, clientId);

    const msgData = this.messageModel.formatMessageData();
    this.messageData = JSON.stringify(msgData);

    this.sendMessage(this.messageData);
  }

  public sendMessage(message: string) {
    if (this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(message);
      console.log('= Ws send to T3', message);
    } else {
      console.log('= Ws send message | socket is not open | wait for.  Ready state:', this.socket.readyState);
      this.socket.onopen = () => {
        this.socket.send(message);
      };
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

  public SaveGraphic(panelId, graphicId, data?: {}) {
    // action: 2, // SAVE_GRAPHIC

    // data => appState load the appState from localStorage
    const storedAppState = !data ? localStorage.getItem('appState') : data;

    let parsedAppState;
    if (typeof storedAppState === 'string') {
      try {
        parsedAppState = JSON.parse(storedAppState);
      } catch (error) {
        console.error('Failed to parse storedAppState:', error);
        parsedAppState = {};
      }
    } else {
      parsedAppState = storedAppState;
    }

    this.FormatMessageData(MessageType.SAVE_GRAPHIC_DATA, panelId, graphicId, parsedAppState);
    this.sendMessage(this.messageData);

    // this.sendMessage(JSON.stringify({ action: MessageType.SAVE_GRAPHIC }));
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
    const panelId = currentDevice.deviceId;
    const graphicId = currentDevice.graphic;
    const serialNumber = currentDevice.serialNumber;

    this.FormatMessageData(MessageType.GET_ENTRIES, panelId, graphicId, data);
    this.sendMessage(this.messageData);

    // this.sendMessage(JSON.stringify({ action: MessageType.GET_ENTRIES }));
  }

  public LoadGraphicEntry(panelId, graphicId) {
    // action: 7, // LOAD_GRAPHIC_ENTRY

    this.FormatMessageData(MessageType.LOAD_GRAPHIC_ENTRY, panelId, graphicId, null);
    this.sendMessage(this.messageData);

    // this.sendMessage(JSON.stringify({ action: MessageType.LOAD_GRAPHIC_ENTRY }));
  }

  public OpenEntryEditWindow(panelId) {
    // action: 8, // OPEN_ENTRY_EDIT_WINDOW

    this.FormatMessageData(MessageType.OPEN_ENTRY_EDIT_WINDOW, panelId, null, null);
    this.sendMessage(this.messageData);

    // this.sendMessage(JSON.stringify({ action: MessageType.OPEN_ENTRY_EDIT_WINDOW }));
  }

  public SaveImage(panelId: number, data: {}) {
    // action: 9, // SAVE_IMAGE

    this.FormatMessageData(MessageType.SAVE_IMAGE, panelId, null, data);
    this.sendMessage(this.messageData);

    // this.sendMessage(JSON.stringify({ action: MessageType.SAVE_IMAGE }));
  }

  public SaveLibraryData(panelId?: number, viewitem?: number, data?: any) {
    // action: 10, // SAVE_LIBRARY_DATA

    this.FormatMessageData(MessageType.SAVE_LIBRARY_DATA, panelId, viewitem, data);
    this.sendMessage(this.messageData);

    // this.sendMessage(JSON.stringify({ action: MessageType.SAVE_LIBRARY_DATA }));
  }

  public DeleteImage(panelId: number) {
    // action: 11, // DELETE_IMAGE

    this.FormatMessageData(MessageType.DELETE_IMAGE, panelId, null, null);
    this.sendMessage(this.messageData);

    // this.sendMessage(JSON.stringify({ action: MessageType.DELETE_IMAGE }));
  }

  //#endregion

  //#region Process Messages

  // Implement your message processing logic here
  private processMessage(data: any) {
    try {
      const parsedData = JSON.parse(data);
      console.log('= Ws received parsed data:', parsedData);

      if (parsedData.error) {
        this.handleError(parsedData);
        return;
      }

      this.processMessageData(parsedData);
      console.log('= ========================');
    } catch (error) {
      console.error('= Ws failed to parse | process data:', error);
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
    console.log('= Ws GET_INITIAL_DATA_RES -appState | needRefresh:', parsedAppStateData, this.needRefresh);

    if (this.needRefresh) {
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
    }
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
    console.log('= Ws GET_PANELS_LIST_RES', Hvac.DeviceOpt.deviceList);

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
    console.log('= Ws GET_ENTRIES_RES', msgData.data);

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
    const panelId = currentDevice.deviceId;
    const graphicId = currentDevice.graphic;
    this.GetInitialData(panelId, graphicId);
  }

  //#endregion

  initQuasar(quasar) {
    this.$q = quasar;
  }

  handleError(errorMsg) {
    if (!errorMsg && !errorMsg.error) return;
    console.error('= Ws error:', errorMsg);

    const message = errorMsg.error;

    this.$q.notify({
      message: message,
      color: "negative",
      icon: "error",
      actions: [
        {
          label: "Dismiss",
          color: "white",
          handler: () => {
            /* ... */
          },
        },
      ],
    });
  }
}

export default WebSocketClient
