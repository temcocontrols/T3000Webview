

import MessageType from "../Data/Socket/MessageType"
import MessageModel from "../Data/Socket/MessageModel"

class WebSocketClient {

  private socket: WebSocket;

  public messageModel: MessageModel;
  public messageData: string;

  constructor() {
    // this.socket = new WebSocket('ws://localhost:9104');
    // this.initialize();
  }

  public Initialize() {

    this.socket = new WebSocket('ws://localhost:9104');

    this.socket.onopen = this.onOpen.bind(this);
    this.socket.onmessage = this.onMessage.bind(this);
    this.socket.onclose = this.onClose.bind(this);
    this.socket.onerror = this.onError.bind(this);
  }

  public GenerateUUID() {
    let d = new Date().getTime();
    let d2 = (performance && performance.now && performance.now() * 1000) || 0;
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      let r = Math.random() * 16;
      if (d > 0) {
        r = (d + r) % 16 | 0;
        d = Math.floor(d / 16);
      } else {
        r = (d2 + r) % 16 | 0;
        d2 = Math.floor(d2 / 16);
      }
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
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

    const lsClientId = this.GenerateUUID();
    this.messageModel = new MessageModel();
    this.messageModel.setHeader();
    this.messageModel.setMessage(13, null, null, null, lsClientId);

    const msgData = this.messageModel.formatMessageData();
    this.messageData = JSON.stringify(msgData);

    console.log('= Ws bind msg:', this.messageData)

    this.sendMessage(this.messageData);
  }

  private onOpen(event: Event) {
    console.log('= Ws connection opened:', event);
    if (this.socket.readyState === WebSocket.OPEN) {
      this.bindCurrentClient();
    }
  }

  private onMessage(event: MessageEvent) {
    console.log('= Ws message received:', event.data);

    this.processMessage(event.data);
  }

  private onClose(event: CloseEvent) {
    console.log('= Ws connection closed:', event);

    // Attempt to reconnect after a delay
    setTimeout(() => {
      console.log('= Ws attempting to reconnect...');
      this.Initialize();
    }, 5000); // Reconnect after 5 seconds
  }

  private onError(event: Event) {
    console.error('= Ws error:', event);

    // Attempt to reconnect after a delay
    setTimeout(() => {
      console.log('= Ws attempting to reconnect...');
      this.Initialize();
    }, 5000); // Reconnect after 5 seconds
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

  public GetAllDevicesData() {
    // action: 12, // GET_ALL_DEVICES_DATA

    this.FormatMessageData(MessageType.GET_ALL_DEVICES_DATA, null, null, null);
    this.sendMessage(this.messageData);

    // this.sendMessage(JSON.stringify({ action: MessageType.GET_ALL_DEVICES_DATA }));
  }

  //#endregion

  //#region Process Messages

  private processMessage(data: any) {
    // Implement your message processing logic here
    console.log('= Ws processing message:', data);
    // Example: Parse JSON data
    try {
      const parsedData = JSON.parse(data);
      console.log('= Ws parsed data:', parsedData);

      // Further processing based on parsed data
      this.processMessageData(parsedData);

    } catch (error) {
      console.error('= Ws failed to parse message data:', error);
    }
  }

  private processMessageData(data) {
    /*
    action: 0,  // GET_PANEL_DATA
    action: 1,  // GET_INITIAL_DATA
    action: 2,  // SAVE_GRAPHIC_DATA
    action: 3,  // UPDATE_ENTRY
    action: 4,  // GET_PANELS_LIST
    action: 5,  // GET_PANEL_RANGE_INFO
    action: 6,  // GET_ENTRIES
    action: 7,  // LOAD_GRAPHIC_ENTRY
    action: 8,  // OPEN_ENTRY_EDIT_WINDOW
    action: 9,  // SAVE_IMAGE
    action: 10, // SAVE_LIBRARY_DATA
    action: 11, // DELETE_IMAGE
    action: 12, // GET_SELECTED_DEVICE_INFO
    action: 13, // BIND_DEVICE
    */

    if (data.action === MessageType.GET_PANEL_DATA_RES) {
      this.HandleGetPanelDataRes(data);
    }

    if (data.action === MessageType.GET_INITIAL_DATA_RES) {
      this.HandleGetInitialDataRes(data);
    }

    if (data.action === MessageType.SAVE_GRAPHIC_RES) {
      this.HandleSaveGraphicRes(data);
    }

    if (data.action === MessageType.UPDATE_ENTRY_RES) {
      this.HandleUpdateEntryRes(data);
    }

    if (data.action === MessageType.GET_PANELS_LIST_RES) {
      this.HandleGetPanelsListRes(data);
    }

    if (data.action === MessageType.GET_ENTRIES_RES) {
      this.HandleGetEntriesRes(data);
    }

    if (data.action === MessageType.LOAD_GRAPHIC_ENTRY_RES) {
      this.HandleLoadGraphicEntryRes(data);
    }

    if (data.action === MessageType.OPEN_ENTRY_EDIT_WINDOW_RES) {
      this.HandleOpenEntryEditWindowRes(data);
    }

    if (data.action === MessageType.SAVE_IMAGE_RES) {
      this.HandleSaveImageRes(data);
    }

    if (data.action === MessageType.SAVE_LIBRARY_DATA_RES) {
      this.HandleSaveLibraryDataRes(data);
    }

    if (data.action === MessageType.DELETE_IMAGE_RES) {
      this.HandleDeleteImageRes(data);
    }

    if (data.action === MessageType.GET_ALL_DEVICES_DATA_RES) {
      this.HandleGetAllDevicesDataRes(data);
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
