
import { head } from "lodash";
import DeviceOpt from "./DeviceOpt"
import Utils5 from "../../Helper/Utils5"

/*
class Header {
  device: string;
  panel: number;
  clientId: string;
  from: string;
}

class Message {
  action: number;
  panelId: number;
}
*/

class MessageModel {

  public deviceOpt: DeviceOpt;
  public browserType: string;
  public header: { from: string };
  public message: any;

  /*
  {
    "device": "T3-XX-ESP 1",
    "graphic": 1,
    "graphicFull": {
        "id": "1",
        "fullLabel": "T3-XX-ESP 1 mock real 1",
        "label": "mock real 1",
        "elementCount": 7
    }
  }
  */

  public currentDevice: { device: string, deviceId: number, serialNumber: number, graphic: number, graphicFull: { id: number, fullLabel: string, label: string, elementCount: string } };

  /*
  const data = {
    header: {
      device: 'T3-XX-ESP',
      panel: 1,
      clientId: 'R102039488500',
      from: isFirefox ? 'firefox' : 'other'
    },
    message: {
      action: 0, // GET_PANEL_DATA
      panelId: 1,
    }
  }
  */

  constructor() {
    this.deviceOpt = new DeviceOpt();
    this.loadCurrentDevice();

    this.browserType = this.getBrowserType();
    this.header = { from: this.browserType };
    this.message = {};
  }

  getBrowserType(): string {
    const userAgent = navigator.userAgent;
    if (userAgent.indexOf("Firefox") > -1) {
      return "Firefox";
    } else if (userAgent.indexOf("Chrome") > -1) {
      return "Chrome";
    } else if (userAgent.indexOf("Safari") > -1) {
      return "Safari";
    } else if (userAgent.indexOf("MSIE") > -1 || !!document.DOCUMENT_NODE) {
      return "IE";
    } else {
      return "Unknown";
    }
  }

  loadCurrentDevice() {

    // get current device from local storage if null set an empty device
    const lsDevice = this.deviceOpt.getCurrentDevice();

    if (lsDevice === null) {
      this.setEmptyDevice();
    }
    else {
      this.currentDevice = lsDevice;
    }
  }

  setEmptyDevice() {
    this.currentDevice = { device: "", deviceId: -1, serialNumber: -1, graphic: -1, graphicFull: { id: -1, fullLabel: "", label: "", elementCount: "" } };
  }

  setHeader() {
    // load current selected device from local storage and fill the value to the header
    this.header.from = this.getBrowserType();
  }

  setMessage(action: number, panelId: number, viewitem: number, data: {}, serialNumber: number, clientId?: string) {

    if (action !== null && action !== undefined) {
      this.message.action = action;
    }

    if (panelId !== null && panelId !== undefined) {
      this.message.panelId = panelId;
    }

    if (viewitem !== null && viewitem !== undefined) {

      // set the viewitem start index to 0 as t3 application
      this.message.viewitem = viewitem - 1;
    }

    if (data != null && data !== undefined) {
      this.message.data = data;
    }

    if (clientId != null && clientId !== undefined) {
      this.message.clientId = Utils5.generateUUID();
    }

    // Add msg id
    this.message.msgId = Utils5.generateUUID();

    if (serialNumber != null && serialNumber !== undefined) {
      this.message.serialNumber = serialNumber;
    }
  }

  formatMessageData() {
    return { header: this.header, message: this.message };
  }
}

export default MessageModel
