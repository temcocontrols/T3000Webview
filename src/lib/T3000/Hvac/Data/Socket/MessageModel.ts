
import DeviceOpt from "../../Opt/DeviceOpt"

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

  deviceOpt: DeviceOpt;

  public header: { device: string, panel: number, clientId: string, from: string };
  public message: { action: number, panelId: number };

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

  currentDevice: { device: string, graphic: number, graphicFull: { id: string, fullLabel: string, label: string, elementCount: string } };

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

    this.header = { device: '', panel: -1, clientId: '', from: '' };
    this.message = { action: -1, panelId: -1 };
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
    this.currentDevice.device = "";
    this.currentDevice.graphic = -1;
    this.currentDevice.graphicFull = { id: '', fullLabel: '', label: '', elementCount: '' };
  }

  setHeader() {
    // load current selected device from local storage and fill the value to the header

    this.header.device = this.currentDevice.device;
    this.header.panel = this.currentDevice.graphic;
    this.header.clientId = '0000000000';
    this.header.from = 'ext-wb';
  }

  setMessage(action: number, panelId?: number, needPanelId?: boolean) {

    if (needPanelId === true) {

      if (panelId === null || panelId === undefined) {
        this.message.action = action;

        // load panelId from local storage
        this.message.panelId = this.currentDevice.graphic;
      }
      else {
        this.message.action = action;
        this.message.panelId = panelId;
      }
    }
    else {
      this.message.action = action;
      this.message.panelId = panelId;
    }
  }

  formatMessageData() {
    return { header: this.header, message: this.message };
  }
}

export default MessageModel
