

// Wrap a class to handle the communication between the WebView and the native code (T3000)
// Note: Migrated existing code from IndexPage for the window.chrome.webview part

import MessageType from "../Socket/MessageType"
import Hvac from "../../Hvac"
import MessageModel from "../Socket/MessageModel"
import Utils5 from "../../Helper/Utils5"
import IdxUtils from "../IdxUtils"
import { T3_Types } from "../../Data/T3Data"


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
    console.log('= Wv Sent message to T3:', message);
  }

  // Handle messages received from the native code T3 application
  handleMessage(arg: any) {
    console.log('= Wv2 Received message from T3:', arg);
    // Handle the message as needed
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

  GetEntries(panelId?: number, viewitem?: number, data?: any) {
    this.FormatMessageData(MessageType.GET_ENTRIES, panelId, viewitem, data);
    this.sendMessage(this.messageData);
  }
}

export default WebViewClient
