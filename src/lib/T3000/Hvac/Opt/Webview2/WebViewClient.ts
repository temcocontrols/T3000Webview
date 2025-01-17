

// Wrap a class to handle the communication between the WebView and the native code (T3000)
// Note: Migrated existing code from IndexPage for the window.chrome.webview part

import MessageType from "../Socket/MessageType"
import Hvac from "../../Hvac"
import MessageModel from "../Socket/MessageModel"
import Utils5 from "../../Helper/Utils5"
import IdxUtils from "../IdxUtils"
import { T3_Types, T3000_Data, appState, rulersGridVisible, grpNav, library } from "../../Data/T3Data"


class WebViewClient {

  /*
  window.chrome?.webview?.postMessage({
    action: 1, // GET_INITIAL_DATA
  });
  */

  // window.chrome?.webview?.addEventListener("message", (arg) => {});

  private webview = (window as any).chrome?.webview;
  public message: any;
  public messageData: string;

  constructor() {
    this.message = {};
  }

  initMessageHandler() {
    if (this.webview) {
      this.webview.addEventListener('message', this.handleMessage.bind(this));
    }
  }

  // Send a message to the native code T3 application
  sendMessage(message: any) {
    if (!this.webview) {
      console.log('= Wv2 window.chrome.webview is not available');
      return;
    }

    this.webview.postMessage(message);
    console.log('= Wv2 Sent message to T3:', message);
  }

  // Handle messages received from the native code T3 application
  handleMessage(data: any) {
    console.log('= Wv2 Received message from T3:', data);
    // Handle the message as needed

    try {
      const parsedData = JSON.parse(data);
      console.log('= Wv2 parsed server data:', parsedData);

      // Further processing based on parsed data
      this.processMessageData(parsedData);
      console.log('= Wv2 ========================');
    } catch (error) {
      console.error('= Wv2 failed to parse | process data:', error);
    }
  }

  FormatMessageData(action: number, panelId?: number, viewitem?: number, data?: any) {
    this.setMessageData(action, panelId, viewitem, data);
    this.messageData = this.message;//JSON.stringify(this.message);
  }

  setMessageData(action: number, panelId?: number, viewitem?: number, data?: any) {
    // get the serial_number base on panelId
    const serialNumber = Hvac.DeviceOpt.getSerialNumber(panelId);

    if (action !== null && action !== undefined) {
      this.message.action = action;
    }

    if (panelId !== null && panelId !== undefined) {
      this.message.panelId = panelId;
    }

    if (viewitem !== null && viewitem !== undefined) {

      // set the viewitem start index to 0 as t3 application
      this.message.viewitem = viewitem - 1;

      if (this.message.viewitem < 0) {
        this.message.viewitem = -1;
      }
    }

    if (data != null && data !== undefined) {
      this.message.data = data;
    }

    // Add msg id
    this.message.msgId = Utils5.generateUUID();

    const needAppedSerialNumber = panelId != null && serialNumber != null;
    if (needAppedSerialNumber) {
      this.message.serialNumber = serialNumber;
    }
  }

  /*
  // Request initial data and panels list if in a webview
  window.chrome?.webview?.postMessage({
    action: 1, // GET_INITIAL_DATA
  });
  */

  // Request initial data and panels list if in a webview
  GetInitialData(panelId?: number, viewitem?: number, data?: any) {
    this.FormatMessageData(MessageType.GET_INITIAL_DATA, panelId, viewitem, data);
    this.sendMessage(this.messageData);
  }

  /*
  window.chrome?.webview?.postMessage({
    action: 4, // GET_PANELS_LIST
  });
  */
  GetPanelsList(panelId?: number, viewitem?: number, data?: any) {
    this.FormatMessageData(MessageType.GET_PANELS_LIST, panelId, viewitem, data);
    this.sendMessage(this.messageData);
  }

  /*
  window.chrome?.webview?.postMessage({
    action: 0, // GET_PANEL_DATA
    panelId: T3000_Data.value.panelsList[0].panel_number,
  });
  */
  GetPanelData(panelId?: number, viewitem?: number, data?: any) {
    this.FormatMessageData(MessageType.GET_PANEL_DATA, panelId, viewitem, data);
    this.sendMessage(this.messageData);
  }

  GetEntries(panelId?: number, viewitem?: number, data?: any) {
    this.FormatMessageData(MessageType.GET_ENTRIES, panelId, viewitem, data);
    this.sendMessage(this.messageData);
  }

  private processMessageData(msgData) {

    if (msgData.action === MessageType.GET_PANEL_DATA_RES) {
      this.HandleGetPanelDataRes(msgData);
    }

    if (msgData.action === MessageType.GET_INITIAL_DATA_RES) {
      this.HandleGetInitialDataRes(msgData);
    }

    if (msgData.action === MessageType.SAVE_GRAPHIC_RES) {
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
  }

  public HandleGetPanelDataRes(arg) {
    // action: 0, // GET_PANEL_DATA_RES

    // load graphic list from GET_PANEL_DATA_RES
    // { command: "1GRP2", description: "Test2", id: "GRP2", index: 1, label: "TEST2", pid: 1 }

  }

  public HandleGetInitialDataRes(arg) {
    // action: 1, // GET_INITIAL_DATA_RES

    /*
    if (arg.data.action === "GET_INITIAL_DATA_RES") {
      if (arg.data.data) {
        arg.data.data = JSON.parse(arg.data.data);
      }

      appState.value = arg.data.data;
      rulersGridVisible.value = appState.value.rulersGridVisible;

      grpNav.value = [arg.data.entry];
      if (arg.data.library) {
        arg.data.library = JSON.parse(arg.data.library);
        library.value = arg.data.library;
      }
      setTimeout(() => {
        IdxUtils.refreshMoveableGuides();
      }, 100);

















































    }
    */

    appState.value = arg.data.data;
    rulersGridVisible.value = appState.value.rulersGridVisible;

    grpNav.value = [arg.data.entry];
    if (arg.data.library) {
      arg.data.library = JSON.parse(arg.data.library);
      library.value = arg.data.library;
    }

    setTimeout(() => {
      IdxUtils.refreshMoveableGuides();
    }, 100);
  }

  public HandleSaveGraphicRes(arg) {
    // action: 2, // SAVE_GRAPHIC_RES
  }

  public HandleUpdateEntryRes(arg) {
    // action: 3, // UPDATE_ENTRY_RES

    /*
    if (arg.data.action === "UPDATE_ENTRY_RES") {
      // Handle update entry response
    }
    */
  }

  public HandleGetPanelsListRes(arg) {
    // action: 4, // GET_PANELS_LIST_RES

    /*
    if (arg.data.action === "GET_PANELS_LIST_RES") {
      if (arg.data.data?.length) {
        T3000_Data.value.panelsList = arg.data.data;
        T3000_Data.value.loadingPanel = 0;
        window.chrome?.webview?.postMessage({
          action: 0, // GET_PANEL_DATA
          panelId: T3000_Data.value.panelsList[0].panel_number,
        });
      }
    }
    */

    if (!arg.data.data?.length) {
      return;
    }

    T3000_Data.value.panelsList = arg.data.data;
    T3000_Data.value.loadingPanel = 0;

    this.GetPanelData(T3000_Data.value.panelsList[0].panel_number);
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
}

export default WebViewClient
