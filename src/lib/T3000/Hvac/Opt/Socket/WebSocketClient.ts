

import MessageType from "./MessageType"
import MessageModel from "./MessageModel"
import Hvac from "../../Hvac"
import Utils5 from '../../Helper/Utils5'

class WebSocketClient {

  private socket: WebSocket;
  private retries: number = 0;
  private maxRetries: number = 5;
  private pingInterval: number = 10000; // 10 seconds
  private uri: string;

  public messageModel: MessageModel;
  public messageData: string;

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
      // this.GetPanelsList();
      // this.GetInitialData(1);
      this.GetEntries(1);
      this.LoadGraphicEntry(1,1)
    }
  }

  private onMessage(event: MessageEvent) {
    console.log('= Ws message received:', event.data);
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
    this.messageModel.setMessage(13, null, null, null, clientId);

    const msgData = this.messageModel.formatMessageData();
    this.messageData = JSON.stringify(msgData);

    this.sendMessage(this.messageData);
  }

  public sendMessage(message: string) {
    if (this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(message);
      console.log('= Ws send to T3', message);
    } else {
      console.error('= Ws socket is not open. Ready state:', this.socket.readyState);
      this.socket.onopen = () => {
        this.socket.send(message);
      };
    }
  }

  //#region  Format Message

  public FormatMessageData(action: number, panelId: number, viewitem: number, data: {}) {
    this.messageModel = new MessageModel();
    this.messageModel.setHeader();
    this.messageModel.setMessage(action, panelId, viewitem, data);

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

  public GetInitialData(panelId: number) {
    // action: 1, // GET_INITIAL_DATA

    this.FormatMessageData(MessageType.GET_INITIAL_DATA, panelId, null, null);
    this.sendMessage(this.messageData);

    // this.sendMessage(JSON.stringify({ action: MessageType.GET_INITIAL_DATA }));
  }

  public SaveGraphic(panelId, graphicId, data: {}) {
    // action: 2, // SAVE_GRAPHIC

    this.FormatMessageData(MessageType.SAVE_GRAPHIC, panelId, graphicId, data);
    this.sendMessage(this.messageData);

    // this.sendMessage(JSON.stringify({ action: MessageType.SAVE_GRAPHIC }));
  }

  public UpdateEntry(panelId: number) {
    // action: 3, // UPDATE_ENTRY

    this.FormatMessageData(MessageType.UPDATE_ENTRY, panelId, null, null);
    this.sendMessage(this.messageData);

    // this.sendMessage(JSON.stringify({ action: MessageType.UPDATE_ENTRY }));
  }

  public GetPanelsList() {
    // action: 4, // GET_PANELS_LIST

    this.FormatMessageData(MessageType.GET_PANELS_LIST, null, null, null);
    this.sendMessage(this.messageData);

    // this.sendMessage(JSON.stringify({ action: MessageType.GET_PANELS_LIST }));
  }

  public GetEntries(panelId: number) {
    // action: 6, // GET_ENTRIES

    this.FormatMessageData(MessageType.GET_ENTRIES, panelId, null, null);
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

  public SaveLibraryData(panelId: number) {
    // action: 10, // SAVE_LIBRARY_DATA

    this.FormatMessageData(MessageType.SAVE_LIBRARY_DATA, panelId, null, null);
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

  private processMessage(data: any) {
    // Implement your message processing logic here
    // console.log('= Ws processing message:', data);
    try {
      const parsedData = JSON.parse(data);
      console.log('= Ws parsed server data:', parsedData);

      // Further processing based on parsed data
      this.processMessageData(parsedData);
      console.log('= ========================');
    } catch (error) {
      console.error('= Ws failed to parse | process data:', error);
    }
  }

  private processMessageData(msgData) {

    if (msgData.action === MessageType.GET_PANEL_DATA_RES) {
      this.HandleGetPanelDataRes(msgData.data);
    }

    if (msgData.action === MessageType.GET_INITIAL_DATA_RES) {
      this.HandleGetInitialDataRes(msgData.data);
    }

    if (msgData.action === MessageType.SAVE_GRAPHIC_RES) {
      this.HandleSaveGraphicRes(msgData.data);
    }

    if (msgData.action === MessageType.UPDATE_ENTRY_RES) {
      this.HandleUpdateEntryRes(msgData.data);
    }

    if (msgData.action === MessageType.GET_PANELS_LIST_RES) {
      this.HandleGetPanelsListRes(msgData.data);
    }

    if (msgData.action === MessageType.GET_ENTRIES_RES) {
      this.HandleGetEntriesRes(msgData.data);
    }

    if (msgData.action === MessageType.LOAD_GRAPHIC_ENTRY_RES) {
      this.HandleLoadGraphicEntryRes(msgData.data);
    }

    if (msgData.action === MessageType.OPEN_ENTRY_EDIT_WINDOW_RES) {
      this.HandleOpenEntryEditWindowRes(msgData.data);
    }

    if (msgData.action === MessageType.SAVE_IMAGE_RES) {
      this.HandleSaveImageRes(msgData.data);
    }

    if (msgData.action === MessageType.SAVE_LIBRARY_DATA_RES) {
      this.HandleSaveLibraryDataRes(msgData.data);
    }

    if (msgData.action === MessageType.DELETE_IMAGE_RES) {
      this.HandleDeleteImageRes(msgData.data);
    }
  }

  public HandleGetPanelDataRes(data) {
    // action: 0, // GET_PANEL_DATA_RES

  }

  public HandleGetInitialDataRes(data) {
    // action: 1, // GET_INITIAL_DATA_RES
  }

  public HandleSaveGraphicRes(data) {
    // action: 2, // SAVE_GRAPHIC_RES
  }

  public HandleUpdateEntryRes(data) {
    // action: 3, // UPDATE_ENTRY_RES
  }

  public HandleGetPanelsListRes(data) {
    // action: 4, // GET_PANELS_LIST_RES
    Hvac.DeviceOpt.initDeviceList(data);
    console.log('= Ws GET_PANELS_LIST_RES', Hvac.DeviceOpt.deviceList)
  }

  public HandleGetEntriesRes(data) {
    // action: 6, // GET_ENTRIES_RES
  }

  public HandleLoadGraphicEntryRes(data) {
    // action: 7, // LOAD_GRAPHIC_ENTRY_RES
  }

  public HandleOpenEntryEditWindowRes(data) {
    // action: 8, // OPEN_ENTRY_EDIT_WINDOW_RES
  }

  public HandleSaveImageRes(data) {
    // action: 9, // SAVE_IMAGE_RES
  }

  public HandleSaveLibraryDataRes(data) {
    // action: 10, // SAVE_LIBRARY_DATA_RES
  }

  public HandleDeleteImageRes(data) {
    // action: 11, // DELETE_IMAGE_RES
  }

  public HandleGetAllDevicesDataRes(data) {
    // action: 12, // GET_ALL_DEVICES_DATA_RES
  }

  //#endregion
}

export default WebSocketClient
