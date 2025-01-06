

import MessageType from "../Data/Socket/MessageType"

class WebSocketClient {

  private socket: WebSocket;

  constructor() {
    this.socket = new WebSocket('ws://localhost:9104');
    this.initialize();
  }

  private initialize() {
    this.socket.onopen = this.onOpen.bind(this);
    this.socket.onmessage = this.onMessage.bind(this);
    this.socket.onclose = this.onClose.bind(this);
    this.socket.onerror = this.onError.bind(this);
  }

  private onOpen(event: Event) {
    console.log('WebSocket connection opened:', event);
  }

  private onMessage(event: MessageEvent) {
    console.log('WebSocket message received:', event.data);

    this.processMessage(event.data);
  }

  private onClose(event: CloseEvent) {
    console.log('WebSocket connection closed:', event);

    // Attempt to reconnect after a delay
    setTimeout(() => {
      console.log('Attempting to reconnect...');
      this.socket = new WebSocket('ws://localhost:9104');
      this.initialize();
    }, 5000); // Reconnect after 5 seconds
  }

  private onError(event: Event) {
    console.error('WebSocket error:', event);

    // Attempt to reconnect after a delay
    setTimeout(() => {
      console.log('Attempting to reconnect...');
      this.socket = new WebSocket('ws://localhost:9104');
      this.initialize();
    }, 5000); // Reconnect after 5 seconds
  }

  public sendMessage(message: string) {
    if (this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(message);
    } else {
      console.error('WebSocket is not open. Ready state:', this.socket.readyState);
    }
  }

  //#region Send Messages

  public GetData(action: number) {
    this.sendMessage(JSON.stringify({ action: action }));
  }

  public GetPanelData() {
    // action: 0, // GET_PANEL_DATA
    this.sendMessage(JSON.stringify({ action: MessageType.GET_PANEL_DATA }));
  }

  public GetInitialData() {
    // action: 1, // GET_INITIAL_DATA
    this.sendMessage(JSON.stringify({ action: MessageType.GET_INITIAL_DATA }));
  }

  public SaveGraphic() {
    // action: 2, // SAVE_GRAPHIC
    this.sendMessage(JSON.stringify({ action: MessageType.SAVE_GRAPHIC }));
  }

  public UpdateEntry() {
    // action: 3, // UPDATE_ENTRY
    this.sendMessage(JSON.stringify({ action: MessageType.UPDATE_ENTRY }));
  }

  public GetPanelsList() {
    // action: 4, // GET_PANELS_LIST
    this.sendMessage(JSON.stringify({ action: MessageType.GET_PANELS_LIST }));
  }

  public GetEntries() {
    // action: 6, // GET_ENTRIES
    this.sendMessage(JSON.stringify({ action: MessageType.GET_ENTRIES }));
  }

  public LoadGraphicEntry() {
    // action: 7, // LOAD_GRAPHIC_ENTRY
    this.sendMessage(JSON.stringify({ action: MessageType.LOAD_GRAPHIC_ENTRY }));
  }

  public OpenEntryEditWindow() {
    // action: 8, // OPEN_ENTRY_EDIT_WINDOW
    this.sendMessage(JSON.stringify({ action: MessageType.OPEN_ENTRY_EDIT_WINDOW }));
  }

  public SaveImage() {
    // action: 9, // SAVE_IMAGE
    this.sendMessage(JSON.stringify({ action: MessageType.SAVE_IMAGE }));
  }

  public SaveLibraryData() {
    // action: 10, // SAVE_LIBRARY_DATA
    this.sendMessage(JSON.stringify({ action: MessageType.SAVE_LIBRARY_DATA }));
  }

  public DeleteImage() {
    // action: 11, // DELETE_IMAGE
    this.sendMessage(JSON.stringify({ action: MessageType.DELETE_IMAGE }));
  }

  public GetAllDevicesData() {
    // action: 12, // GET_ALL_DEVICES_DATA
    this.sendMessage(JSON.stringify({ action: MessageType.GET_ALL_DEVICES_DATA }));
  }

  //#endregion

  //#region Process Messages

  private processMessage(data: any) {
    // Implement your message processing logic here
    console.log('Processing message:', data);
    // Example: Parse JSON data
    try {
      const parsedData = JSON.parse(data);
      console.log('Parsed data:', parsedData);

      // Further processing based on parsed data
      this.processMessageData(parsedData);

    } catch (error) {
      console.error('Failed to parse message data:', error);
    }
  }

  private processMessageData(data) {
    /*
    action: 0, // GET_PANEL_DATA_RES
    action: 1, // GET_INITIAL_DATA_RES
    action: 2, // SAVE_GRAPHIC_RES
    action: 3, // UPDATE_ENTRY_RES
    action: 4, // GET_PANELS_LIST_RES
    action: 6, // GET_ENTRIES_RES
    action: 7, // LOAD_GRAPHIC_ENTRY_RES
    action: 8, // OPEN_ENTRY_EDIT_WINDOW_RES
    action: 9, // SAVE_IMAGE_RES
    action: 10, // SAVE_LIBRARY_DATA_RES
    action: 11, // DELETE_IMAGE_RES
    action: 12, //GET_ALL_DEVICES_DATA_RES
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
