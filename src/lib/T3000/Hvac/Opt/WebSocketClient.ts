

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

  private onOpen(event: Event) {
    console.log('= Ws connection opened:', event);
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
    } else {
      console.error('= Ws socket is not open. Ready state:', this.socket.readyState);
    }
  }

  //#region  Format Message

  public FormatMessageData(action: number, panelId?: number, needPanelId?: boolean) {
    this.messageModel = new MessageModel();
    this.messageModel.setHeader();
    this.messageModel.setMessage(action, panelId, needPanelId);

    const data = this.messageModel.formatMessageData();
    this.messageData = JSON.stringify(data);
  }

  //#endregion

  //#region Send Messages

  public GetData(action: number) {
    this.sendMessage(JSON.stringify({ action: action }));
  }

  public GetPanelData() {
    // action: 0, // GET_PANEL_DATA

    this.FormatMessageData(MessageType.GET_PANEL_DATA, undefined, true);
    this.sendMessage(this.messageData);

    // this.sendMessage(JSON.stringify({ action: MessageType.GET_PANEL_DATA }));
  }

  public GetInitialData() {
    // action: 1, // GET_INITIAL_DATA

    this.FormatMessageData(MessageType.GET_INITIAL_DATA, undefined, false);
    this.sendMessage(this.messageData);

    // this.sendMessage(JSON.stringify({ action: MessageType.GET_INITIAL_DATA }));
  }

  public SaveGraphic() {
    // action: 2, // SAVE_GRAPHIC

    this.FormatMessageData(MessageType.SAVE_GRAPHIC, undefined, false);
    this.sendMessage(this.messageData);

    // this.sendMessage(JSON.stringify({ action: MessageType.SAVE_GRAPHIC }));
  }

  public UpdateEntry() {
    // action: 3, // UPDATE_ENTRY

    this.FormatMessageData(MessageType.UPDATE_ENTRY, undefined, false);
    this.sendMessage(this.messageData);

    // this.sendMessage(JSON.stringify({ action: MessageType.UPDATE_ENTRY }));
  }

  public GetPanelsList() {
    // action: 4, // GET_PANELS_LIST

    this.FormatMessageData(MessageType.GET_PANELS_LIST, undefined, false);
    this.sendMessage(this.messageData);

    // this.sendMessage(JSON.stringify({ action: MessageType.GET_PANELS_LIST }));
  }

  public GetEntries() {
    // action: 6, // GET_ENTRIES

    this.FormatMessageData(MessageType.GET_ENTRIES, undefined, false);
    this.sendMessage(this.messageData);

    // this.sendMessage(JSON.stringify({ action: MessageType.GET_ENTRIES }));
  }

  public LoadGraphicEntry() {
    // action: 7, // LOAD_GRAPHIC_ENTRY

    this.FormatMessageData(MessageType.LOAD_GRAPHIC_ENTRY, undefined, false);
    this.sendMessage(this.messageData);

    // this.sendMessage(JSON.stringify({ action: MessageType.LOAD_GRAPHIC_ENTRY }));
  }

  public OpenEntryEditWindow() {
    // action: 8, // OPEN_ENTRY_EDIT_WINDOW

    this.FormatMessageData(MessageType.OPEN_ENTRY_EDIT_WINDOW, undefined, false);
    this.sendMessage(this.messageData);

    // this.sendMessage(JSON.stringify({ action: MessageType.OPEN_ENTRY_EDIT_WINDOW }));
  }

  public SaveImage() {
    // action: 9, // SAVE_IMAGE

    this.FormatMessageData(MessageType.SAVE_IMAGE, undefined, false);
    this.sendMessage(this.messageData);

    // this.sendMessage(JSON.stringify({ action: MessageType.SAVE_IMAGE }));
  }

  public SaveLibraryData() {
    // action: 10, // SAVE_LIBRARY_DATA

    this.FormatMessageData(MessageType.SAVE_LIBRARY_DATA, undefined, false);
    this.sendMessage(this.messageData);

    // this.sendMessage(JSON.stringify({ action: MessageType.SAVE_LIBRARY_DATA }));
  }

  public DeleteImage() {
    // action: 11, // DELETE_IMAGE

    this.FormatMessageData(MessageType.DELETE_IMAGE, undefined, false);
    this.sendMessage(this.messageData);

    // this.sendMessage(JSON.stringify({ action: MessageType.DELETE_IMAGE }));
  }

  public GetAllDevicesData() {
    // action: 12, // GET_ALL_DEVICES_DATA

    this.FormatMessageData(MessageType.GET_ALL_DEVICES_DATA, undefined, false);
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


//#region  Old Test Code

// const socket = new WebSocket('ws://localhost:9104');

// const testSendMsg = (action) => {
//   socket.send("ClientA test1");
// }

// function connectSocket() {

//   const isFirefox = typeof InstallTrigger !== 'undefined';

//   /*
//   action: 0, // GET_PANEL_DATA
//   action: 1, // GET_INITIAL_DATA
//   action: 2, // SAVE_GRAPHIC
//   action: 3, // UPDATE_ENTRY
//   action: 4, // GET_PANELS_LIST
//   action: 6, // GET_ENTRIES
//   action: 7, // LOAD_GRAPHIC_ENTRY
//   action: 8, // OPEN_ENTRY_EDIT_WINDOW
//   action: 9, // SAVE_IMAGE
//   action: 10, // SAVE_LIBRARY_DATA
//   action: 11, // DELETE_IMAGE
//   */

//   socket.onopen = function (event) {
//     // const message = {
//     //   action: 0, // GET_PANEL_DATA
//     //   panelId: 1,
//     //   from: isFirefox ? 'firefox' : 'other'
//     // };

//     const data = {
//       header: {
//         device: 'T3-XX-ESP',
//         panel: 1,
//         clientId: 'R102039488500',
//         from: isFirefox ? 'firefox' : 'other'
//       },
//       message: {
//         action: 0, // GET_PANEL_DATA
//         panelId: 1,
//       }
//     }

//     socket.send(JSON.stringify(data));

//     // socket.send(1);
//   };

//   socket.onmessage = function (event) {

//     // process the messgae here

//     console.log('==== Message from TCP Server, start to process it:', event.data);
//     // const jsonObj = JSON.parse(event.data);

//     // if (jsonObj.action === 0) {
//     //   socket.send(JSON.stringify({
//     //     action: 1, // GET_INITIAL_DATA
//     //   }));
//     // }
//   };

//   socket.onclose = function (event) {
//     // console.log('Socket is closed. Reconnect will be attempted in 1 second.', event.reason);
//     setTimeout(function () {
//       connectSocket();
//     }, 1000)
//   };

//   socket.onerror = function (error) {
//     console.error('Socket encountered error: ', error.message, 'Closing socket');
//     socket.close();

//     setTimeout(function () {
//       connectSocket();
//     }, 1000)
//   };
// }

// function processTcpMessage() {
//   console.log('=== TCP Start to process tcp message after mounted === , The window is:', window);

//   connectSocket();
// }

//#endregion
