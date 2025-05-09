

// Wrap a class to handle the communication between the WebView and the native code (T3000)
// Note: Migrated existing code from IndexPage for the window.chrome.webview part

import MessageType from "../Socket/MessageType"
import Hvac from "../../Hvac"
import MessageModel from "../Socket/MessageModel"
import Utils5 from "../../Util/Utils5"
import IdxUtils from "../Common/IdxUtils"
import { useQuasar } from "quasar"
import {
  T3_Types, T3000_Data, appState, rulersGridVisible, grpNav, library, selectPanelOptions, linkT3EntryDialog, savedNotify

} from "../../Data/T3Data"
import Utils1 from "../../Util/Utils1"
import T3Util from "../../Util/T3Util"


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

  // Access Quasar framework instance
  public $q: any;

  constructor() {
    this.message = {};
  }

  initMessageHandler() {
    if (this.webview) {
      this.webview.addEventListener('message', this.handleMessage.bind(this));
    }
  }

  initQuasar(quasar) {
    this.$q = quasar;
  }

  // Send a message to the native code T3 application
  sendMessage(message: any) {
    if (!this.webview) {
      T3Util.Log('= Wv2 window.chrome.webview is not available');
      return;
    }

    this.webview.postMessage(message);
    T3Util.Log('= Wv2 Sent message to T3:', message);
  }

  // Handle messages received from the native code T3 application
  handleMessage(event: any) {
    const data = event?.data ?? {};
    T3Util.Log('= Wv2 Received message from T3:', data);

    try {
      this.processMessageData(data);
      T3Util.Log('= Wv2 ========================');
    } catch (error) {
      console.error('= Wv2 failed to parse | process data:', error);
    }
  }

  FormatMessageData(action: number, panelId?: number, viewitem?: number, data?: any) {
    this.setMessageData(action, panelId, viewitem, data);
    this.messageData = this.message;//JSON.stringify(this.message);
  }

  FormatUpdateEntryData(data: any) {

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

    this.message = {};
    this.message.action = MessageType.UPDATE_ENTRY;
    this.message.field = data.field;
    this.message.value = data.value;
    this.message.panelId = data.panelId;
    this.message.entryIndex = data.entryIndex;
    this.message.entryType = data.entryType;

    this.messageData = this.message;
  }

  FormatSaveImageData(data: any) {
    /*
     {
       action: 9, // SAVE_IMAGE
       filename: file.name,
       fileLength: file.size,
       fileData: await readFile(file.data),
     }
     */

    this.message = {};
    this.message.action = MessageType.SAVE_IMAGE;
    this.message.filename = data.filename;
    this.message.fileLength = data.fileLength;
    this.message.fileData = data.fileData;

    this.messageData = this.message;
  }

  FormatLoadGraphicEntryData(data) {
    /*
    {
      action: 7, // LOAD_GRAPHIC_ENTRY
      panelId: item.t3Entry.pid,
      entryIndex: item.t3Entry.index,
    }
    */

    this.message = {};
    this.message.action = MessageType.LOAD_GRAPHIC_ENTRY;
    this.message.entryIndex = data.entryIndex;

    this.messageData = this.message;
  }

  FormatOpenEntryEditWindowData(data) {
    /*
    {
      action: 8, // OPEN_ENTRY_EDIT_WINDOW
      panelId: item.t3Entry.pid,
      entryType: T3_Types[item.t3Entry.type],
      entryIndex: item.t3Entry.index,
    }
    */

    this.message = {};
    this.message.action = MessageType.OPEN_ENTRY_EDIT_WINDOW;
    this.message.panelId = data.panelId;
    this.message.entryType = data.entryType;
    this.message.entryIndex = data.entryIndex;

    this.messageData = this.message;
  }

  setMessageData(action: number, panelId?: number, viewitem?: number, data?: any) {

    this.message = {};

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
    this.message.msgId = Utils1.GenerateUUID();

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

  SaveLibraryData(panelId?: number, viewitem?: number, data?: any) {
    this.FormatMessageData(MessageType.SAVE_LIBRARY_DATA, panelId, viewitem, data);
    this.sendMessage(this.messageData);
  }

  SaveGraphicData(panelId?: number, viewitem?: number, data?: any) {
    this.FormatMessageData(MessageType.SAVE_GRAPHIC_DATA, panelId, viewitem, data);
    this.sendMessage(this.messageData);
  }

  UpdateEntry(data: any) {

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
  }

  SaveImage(data: any) {
    /*
    {
      action: 9, // SAVE_IMAGE
      filename: file.name,
      fileLength: file.size,
      fileData: await readFile(file.data),
    }
    */

    this.FormatSaveImageData(data);
    this.sendMessage(this.messageData);
  }

  LoadGraphicEntry(data) {
    /*
    {
      action: 7, // LOAD_GRAPHIC_ENTRY
      panelId: item.t3Entry.pid,
      entryIndex: item.t3Entry.index,
    }
    */

    this.FormatLoadGraphicEntryData(data);
    this.sendMessage(this.messageData);
  }

  OpenEntryEditWindow(data) {

    /*
    {
      action: 8, // OPEN_ENTRY_EDIT_WINDOW
      panelId: item.t3Entry.pid,
      entryType: T3_Types[item.t3Entry.type],
      entryIndex: item.t3Entry.index,
    }
    */

    this.FormatOpenEntryEditWindowData(data);
    this.sendMessage(this.messageData);
  }

  DeleteImage(imagePath: string) {
    this.FormatMessageData(MessageType.DELETE_IMAGE, null, null, imagePath);
    this.sendMessage(this.messageData);
  }

  private processMessageData(msgData) {

    if (msgData.action === MessageType.GET_PANEL_DATA_RES) {
      this.HandleGetPanelDataRes(msgData);
    }

    if (msgData.action === MessageType.GET_INITIAL_DATA_RES) {
      this.HandleGetInitialDataRes(msgData);
    }

    if (msgData.action === MessageType.SAVE_GRAPHIC_DATA_RES) {
      this.HandleSaveGraphicDataRes(msgData);
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

  public HandleGetPanelDataRes(msgData) {
    // action: 0, // GET_PANEL_DATA_RES

    // load graphic list from GET_PANEL_DATA_RES
    // { command: "1GRP2", description: "Test2", id: "GRP2", index: 1, label: "TEST2", pid: 1 }

    /*
    if (arg.data.action === "GET_PANEL_DATA_RES") {
      // if (getPanelsInterval && arg.data?.panel_id) {
      //   clearInterval(getPanelsInterval);
      // }

      if (arg.data?.panel_id) {
        Hvac.IdxPage.clearGetPanelsInterval();
      }

      if (arg.data?.panel_id) {

        const check1 = T3000_Data.value.loadingPanel !== null && T3000_Data.value.loadingPanel < T3000_Data.value.panelsList.length - 1;
        if (check1) {
          T3000_Data.value.loadingPanel++;
          const index = T3000_Data.value.loadingPanel;
          window.chrome?.webview?.postMessage({
            action: 0, // GET_PANEL_DATA
            panelId: T3000_Data.value.panelsList[index].panel_number,
          });
        }

        const check2 = T3000_Data.value.loadingPanel !== null && T3000_Data.value.loadingPanel === T3000_Data.value.panelsList.length - 1;
        if (check2) {
          T3000_Data.value.loadingPanel = null;
        }

        T3000_Data.value.panelsData = T3000_Data.value.panelsData.filter(
          (item) => item.pid !== arg.data.panel_id
        );

        T3000_Data.value.panelsData = T3000_Data.value.panelsData.concat(
          arg.data.data
        );

        T3000_Data.value.panelsData.sort((a, b) => a.pid - b.pid);
        selectPanelOptions.value = T3000_Data.value.panelsData;

        T3000_Data.value.panelsRanges = T3000_Data.value.panelsRanges.filter(
          (item) => item.pid !== arg.data.panel_id
        );

        T3000_Data.value.panelsRanges = T3000_Data.value.panelsRanges.concat(arg.data.ranges);

        refreshLinkedEntries(arg.data.data);
      }
    }
    */

    // if (getPanelsInterval && arg.data?.panel_id) {
    //   clearInterval(getPanelsInterval);
    // }

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

    msgData.data = JSON.parse(msgData.data);
    appState.value = msgData.data;
    rulersGridVisible.value = appState.value.rulersGridVisible;

    grpNav.value = [msgData.entry];
    if (msgData.library) {
      msgData.library = JSON.parse(msgData.library);
      library.value = msgData.library;
    }

    setTimeout(() => {
      IdxUtils.refreshMoveableGuides();
    }, 100);
  }

  public HandleSaveGraphicDataRes(msgData) {
    // action: 2, // SAVE_GRAPHIC_RES

    // if (arg.data.action === "SAVE_GRAPHIC_DATA_RES") {
    //   if (arg.data.data?.status === true) {
    //     if (!savedNotify.value) return;
    //     $q.notify({
    //       message: "Saved successfully.",
    //       color: "primary",
    //       icon: "check_circle",
    //       actions: [
    //         {
    //           label: "Dismiss",
    //           color: "white",
    //           handler: () => {
    //             /* ... */
    //           },
    //         },
    //       ],
    //     });
    //   } else {
    //     $q.notify({
    //       message: "Error, not saved!",
    //       color: "negative",
    //       icon: "error",
    //       actions: [
    //         {
    //           label: "Dismiss",
    //           color: "white",
    //           handler: () => {
    //             /* ... */
    //           },
    //         },
    //       ],
    //     });
    //   }
    // }

    IdxUtils.saveGraphicData(msgData, this.$q);
  }

  public HandleUpdateEntryRes(msgData) {
    // action: 3, // UPDATE_ENTRY_RES

    /*
    if (arg.data.action === "UPDATE_ENTRY_RES") {
      // Handle update entry response
    }
    */
  }

  public HandleGetPanelsListRes(msgData) {
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

    if (!msgData.data?.length) return;
    T3000_Data.value.panelsList = msgData.data;
    T3000_Data.value.loadingPanel = 0;
    this.GetPanelData(T3000_Data.value.panelsList[0].panel_number);
  }

  public HandleGetEntriesRes(msgData) {
    // action: 6, // GET_ENTRIES_RES

    /*
    if (arg.data.action === "GET_ENTRIES_RES") {
      arg.data.data.forEach((item) => {
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
      refreshLinkedEntries(arg.data.data);
    }
    */

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

    /*
    if (arg.data.action === "LOAD_GRAPHIC_ENTRY_RES") {
      if (arg.data.data) {
        arg.data.data = JSON.parse(arg.data.data);
      }
      appState.value = arg.data.data;
      if (grpNav.value.length > 1) {
        const navItem = grpNav.value[grpNav.value.length - 2];
        if (
          navItem.index !== arg.data.entry.index ||
          navItem.pid !== arg.data.entry.pid
        ) {
          grpNav.value.push(arg.data.entry);
        } else {
          grpNav.value.pop();
        }
      } else {
        grpNav.value.push(arg.data.entry);
      }

      setTimeout(() => {
        IdxUtils.refreshMoveableGuides();
      }, 100);
    }
    */

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

    /*
    if (arg.data.action === "SAVE_IMAGE_RES") {
      library.value.imagesCount++;
      library.value.images.push({
        id: "IMG-" + library.value.imagesCount,
        name: arg.data.data.name,
        path: arg.data.data.path,
        online: false,
      });
      saveLib();
    }
    */

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
}

export default WebViewClient
