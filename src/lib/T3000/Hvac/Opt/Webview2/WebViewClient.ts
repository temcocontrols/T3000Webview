

// Wrap a class to handle the communication between the WebView and the native code (T3000)
// Note: Migrated existing code from IndexPage for the window.chrome.webview part

import MessageType from "../Socket/MessageType"
import MessageModel from "../Socket/MessageModel"
import { useQuasar } from "quasar"
import {
  T3_Types, T3000_Data, appState, rulersGridVisible, grpNav, library, selectPanelOptions, linkT3EntryDialog, savedNotify

} from "../../Data/T3Data"
import Utils1 from "../../Util/Utils1"
import T3Util from "../../Util/T3Util"
import LogUtil from "../../Util/LogUtil"


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

  // Dependency injection properties
  private deviceOpt: any;
  private idxPage: any;
  private idxUtils: any;

  constructor() {
    this.message = {};
  }

  // Dependency injection method
  setDependencies(deviceOpt: any, idxPage: any, idxUtils: any) {
    this.deviceOpt = deviceOpt;
    this.idxPage = idxPage;
    this.idxUtils = idxUtils;
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
      LogUtil.Debug('= Wv2 window.chrome.webview is not available');
      return;
    }

    // Decode action details for better logging
    const actionDetails = this.getActionDetails(message?.action);

    this.webview.postMessage(message);
    LogUtil.Debug(`= Wv2 Sent message to T3, action= ${actionDetails.name} | ${message?.action}, message=`, message);
  }

  // Handle messages received from the native code T3 application
  handleMessage(event: any) {
    const data = event?.data ?? {};

    // Get response action details for consistent logging
    const actionDetails = this.getActionDetails(data?.action);
    LogUtil.Debug(`= Wv2 Received message from T3, action= ${actionDetails.name} | ${data?.action}, message=`, data);

    try {
      this.processMessageData(data);
    } catch (error) {
      T3Util.Error('= wv2: handleMessage failed to parse | process data:', error);
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
    const serialNumber = this.deviceOpt.getSerialNumber(panelId);

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

  SaveNewLibraryData(panelId?: number, viewitem?: number, data?: any) {
    this.FormatMessageData(MessageType.SAVE_NEW_LIBRARY_DATA, panelId, viewitem, data);
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

  // Message handler map for action-based dispatch
  private messageHandlers: { [action: number]: (msgData: any) => void } = {
    [MessageType.GET_PANEL_DATA_RES]: this.HandleGetPanelDataRes.bind(this),
    [MessageType.GET_INITIAL_DATA_RES]: this.HandleGetInitialDataRes.bind(this),
    [MessageType.SAVE_GRAPHIC_DATA_RES]: this.HandleSaveGraphicDataRes.bind(this),
    [MessageType.UPDATE_ENTRY_RES]: this.HandleUpdateEntryRes.bind(this),
    [MessageType.GET_PANELS_LIST_RES]: this.HandleGetPanelsListRes.bind(this),
    [MessageType.GET_ENTRIES_RES]: this.HandleGetEntriesRes.bind(this),
    [MessageType.LOAD_GRAPHIC_ENTRY_RES]: this.HandleLoadGraphicEntryRes.bind(this),
    [MessageType.OPEN_ENTRY_EDIT_WINDOW_RES]: this.HandleOpenEntryEditWindowRes.bind(this),
    [MessageType.SAVE_IMAGE_RES]: this.HandleSaveImageRes.bind(this),
    [MessageType.SAVE_LIBRARY_DATA_RES]: this.HandleSaveLibraryDataRes.bind(this),
    [MessageType.SAVE_NEW_LIBRARY_DATA_RES]: this.HandleSaveNewLibraryDataRes.bind(this),
    [MessageType.DELETE_IMAGE_RES]: this.HandleDeleteImageRes.bind(this),
  };

  private processMessageData(msgData: any) {
    const handler = this.messageHandlers[msgData.action];
    if (handler) {
      handler(msgData);
    } else {
      LogUtil.Warn('No handler for message action:', msgData.action, msgData);
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
        this.idxPage.clearGetPanelsInterval();
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
      this.idxPage.clearGetPanelsInterval();
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

      // Filter out existing data for this panel
      T3000_Data.value.panelsData = T3000_Data.value.panelsData.filter(
        (item) => item.pid !== msgData.panel_id
      );

      // Add new panel data
      T3000_Data.value.panelsData = T3000_Data.value.panelsData.concat(msgData.data);
      T3000_Data.value.panelsData.sort((a, b) => a.pid - b.pid);
      selectPanelOptions.value = T3000_Data.value.panelsData;

      // Handle panel ranges
      T3000_Data.value.panelsRanges = T3000_Data.value.panelsRanges.filter(
        (item) => item.pid !== msgData.panel_id
      );

      T3000_Data.value.panelsRanges = T3000_Data.value.panelsRanges.concat(msgData.ranges);

      this.idxUtils.refreshLinkedEntries(msgData.data);
      this.idxUtils.refreshLinkedEntries2(msgData.data);
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
      this.idxUtils.refreshMoveableGuides();
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

    this.idxUtils.saveGraphicData(msgData, this.$q);
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

    // Update the global store
    T3000_Data.value.panelsList = msgData.data;
    T3000_Data.value.loadingPanel = 0;

    this.GetPanelData(T3000_Data.value.panelsList[0].panel_number);
  }

  public HandleGetEntriesRes(msgData) {
    // action: 6, // GET_ENTRIES_RES
    // LogUtil.Debug('= Wv2: HandleGetEntriesRes START =================');
    // LogUtil.Debug('= Wv2: HandleGetEntriesRes / received data length:', msgData.data?.length || 0);
    // LogUtil.Debug('= Wv2: HandleGetEntriesRes / BEFORE - panelsData length:', T3000_Data.value.panelsData.length);

    // Log sample of incoming data to see what's being updated
    if (msgData.data && msgData.data.length > 0) {
      // LogUtil.Debug('= Wv2: HandleGetEntriesRes / sample incoming data (first 3):',
      //   msgData.data.slice(0, 3).map(item => ({
      //     id: item.id,
      //     pid: item.pid,
      //     index: item.index,
      //     type: item.type,
      //     hasInputArray: Array.isArray(item.input),
      //     hasRangeArray: Array.isArray(item.range),
      //     inputLength: item.input?.length,
      //     rangeLength: item.range?.length
      //   }))
      // );
    }

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

    msgData.data.forEach((item, itemIdx) => {
      const itemIndex = T3000_Data.value.panelsData.findIndex(
        (ii) =>
          ii.index === item.index &&
          ii.type === item.type &&
          ii.pid === item.pid
      );

      if (itemIndex !== -1) {
        // Found existing item
        const existingItem = T3000_Data.value.panelsData[itemIndex];

        // LogUtil.Debug(`= Wv2: HandleGetEntriesRes / item ${itemIdx}: REPLACING existing item at index ${itemIndex}:`, {
        //   id: existingItem.id,
        //   pid: existingItem.pid,
        //   type: existingItem.type,
        //   existingHasInput: Array.isArray(existingItem.input),
        //   existingInputLength: existingItem.input?.length,
        //   existingHasRange: Array.isArray(existingItem.range),
        //   existingRangeLength: existingItem.range?.length,
        //   newHasInput: Array.isArray(item.input),
        //   newInputLength: item.input?.length,
        //   newHasRange: Array.isArray(item.range),
        //   newRangeLength: item.range?.length
        // });

        // 🚨 CRITICAL CHECK: Prevent data corruption!
        // Don't replace detailed monitor configs with simplified versions
        const existingIsDetailedMonitor = existingItem.type === 'MON' &&
          (Array.isArray(existingItem.input) || Array.isArray(existingItem.range) || existingItem.num_inputs > 0);
        const newIsSimplifiedMonitor = item.type === 'MON' &&
          !Array.isArray(item.input) && !Array.isArray(item.range) && !item.num_inputs;

        // Check for other potential data loss scenarios
        const existingHasComplexData = this.hasComplexDataStructures(existingItem);
        const newLacksComplexData = !this.hasComplexDataStructures(item);
        const potentialDataLoss = existingHasComplexData && newLacksComplexData;

        if (existingIsDetailedMonitor && newIsSimplifiedMonitor) {
          // LogUtil.Warn(`🚨 DATA CORRUPTION PREVENTED! Attempted to replace detailed monitor config with simplified version:`, {
          //   id: item.id,
          //   pid: item.pid,
          //   existingDetails: {
          //     input: !!existingItem.input,
          //     range: !!existingItem.range,
          //     num_inputs: existingItem.num_inputs,
          //     inputLength: existingItem.input?.length
          //   },
          //   newDetails: {
          //     input: !!item.input,
          //     range: !!item.range,
          //     num_inputs: item.num_inputs,
          //     inputLength: item.input?.length
          //   }
          // });

          // Smart field comparison: only update fields that exist in both objects
          // and are not critical complex structures
          const criticalFields = ['input', 'range', 'num_inputs', 'an_inputs']; // Protect these arrays/complex fields
          const existingKeys = Object.keys(existingItem);
          const newKeys = Object.keys(item);
          const commonFields = existingKeys.filter(key => newKeys.includes(key));
          const fieldsToUpdate = commonFields.filter(key => !criticalFields.includes(key));

          // LogUtil.Debug(`📊 HandleGetEntriesRes / Smart field comparison for ${item.id}:`, {
          //   existingKeys: existingKeys.length,
          //   newKeys: newKeys.length,
          //   commonFields: commonFields.length,
          //   fieldsToUpdate: fieldsToUpdate.length,
          //   criticalFieldsProtected: criticalFields.filter(cf => existingKeys.includes(cf)),
          //   updateFields: fieldsToUpdate
          // });

          // Update only the safe common fields
          let updatedCount = 0;
          fieldsToUpdate.forEach(field => {
            if (existingItem[field] !== item[field]) {
              // LogUtil.Debug(`🔄 HandleGetEntriesRes / Updating field '${field}': '${existingItem[field]}' → '${item[field]}'`);
              existingItem[field] = item[field];
              updatedCount++;
            }
          });

          // LogUtil.Info(`✅ HandleGetEntriesRes / Smart partial update applied for ${item.id}: ${updatedCount} fields updated, ${criticalFields.length} critical fields protected`);
        } else if (potentialDataLoss) {
          // Handle other types of potential data loss (not just monitors)
          // LogUtil.Warn(`⚠️ POTENTIAL DATA LOSS DETECTED! Applying smart update for ${item.type} item:`, {
          //   id: item.id,
          //   pid: item.pid,
          //   type: item.type,
          //   existingComplexity: this.getDataComplexityInfo(existingItem),
          //   newComplexity: this.getDataComplexityInfo(item)
          // });

          // Use the same smart field comparison approach
          const complexFields = this.getComplexFields(existingItem);
          const existingKeys = Object.keys(existingItem);
          const newKeys = Object.keys(item);
          const commonFields = existingKeys.filter(key => newKeys.includes(key));
          const fieldsToUpdate = commonFields.filter(key => !complexFields.includes(key));

          let updatedCount = 0;
          fieldsToUpdate.forEach(field => {
            if (existingItem[field] !== item[field]) {
              // LogUtil.Debug(`🔄 HandleGetEntriesRes / Updating ${item.type} field '${field}': '${existingItem[field]}' → '${item[field]}'`);
              existingItem[field] = item[field];
              updatedCount++;
            }
          });

          // LogUtil.Info(`✅ HandleGetEntriesRes / Smart update for ${item.type} ${item.id}: ${updatedCount} fields updated, ${complexFields.length} complex fields protected`);
        } else {
          // Safe to do full replacement
          T3000_Data.value.panelsData[itemIndex] = item;
          // LogUtil.Debug(`✅ HandleGetEntriesRes / Full replacement done for ${item.id}`);
        }
      } else {
        // LogUtil.Debug(`= Wv2: HandleGetEntriesRes / item ${itemIdx}: NOT FOUND in panelsData:`, {
        //   id: item.id,
        //   pid: item.pid,
        //   index: item.index,
        //   type: item.type
        // });
      }
    });

    if (!linkT3EntryDialog.value.active) {
      selectPanelOptions.value = T3000_Data.value.panelsData;
    }

    this.idxUtils.refreshLinkedEntries(msgData.data);
    this.idxUtils.refreshLinkedEntries2(msgData.data);

    // LogUtil.Debug('= Wv2: HandleGetEntriesRes / AFTER - panelsData length:', T3000_Data.value.panelsData.length);
    // LogUtil.Debug('= Wv2: HandleGetEntriesRes END ===================');
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
      this.idxUtils.refreshMoveableGuides();
    }, 100);

    // Refresh element count in right-side panel after loading graphic entry
    const currentDevice = this.deviceOpt?.getCurrentDevice();
    if (currentDevice) {
      this.deviceOpt?.refreshGraphicPanelElementCount(currentDevice);
    }
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

    this.idxUtils.saveLib();
  }

  public HandleSaveLibraryDataRes(msgData) {
    // action: 10, // SAVE_LIBRARY_DATA_RES
  }

  public HandleSaveNewLibraryDataRes(msgData) {
    // action: 14, // SAVE_NEW_LIBRARY_DATA_RES
    LogUtil.Debug('= Wv2 Handle SAVE_NEW_LIBRARY_DATA_RES:', msgData);
  }

  public HandleDeleteImageRes(msgData) {
    // action: 11, // DELETE_IMAGE_RES
  }

  public HandleGetAllDevicesDataRes(msgData) {
    // action: 12, // GET_ALL_DEVICES_DATA_RES
  }

  //#region Helper Methods for Data Integrity

  /**
   * Check if an object has complex data structures that shouldn't be lost
   */
  private hasComplexDataStructures(obj: any): boolean {
    if (!obj || typeof obj !== 'object') return false;

    // Check for arrays
    const hasArrays = Object.values(obj).some(value => Array.isArray(value));

    // Check for nested objects (excluding simple objects)
    const hasNestedObjects = Object.values(obj).some(value =>
      value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length > 0
    );

    // Check for specific complex fields based on object type
    const complexFieldsByType = {
      'MON': ['input', 'range', 'num_inputs', 'an_inputs'],
      'GRP': ['items', 'controls', 'children'],
      'SCH': ['schedule', 'items', 'events'],
      // Add more types as needed
    };

    const complexFields = complexFieldsByType[obj.type] || [];
    const hasTypeSpecificComplexity = complexFields.some(field => obj[field] !== undefined);

    return hasArrays || hasNestedObjects || hasTypeSpecificComplexity;
  }

  /**
   * Get complexity information about an object for logging
   */
  private getDataComplexityInfo(obj: any): any {
    if (!obj || typeof obj !== 'object') return { simple: true };

    const arrays = Object.keys(obj).filter(key => Array.isArray(obj[key]));
    const objects = Object.keys(obj).filter(key =>
      obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])
    );

    return {
      totalFields: Object.keys(obj).length,
      arrays: arrays.length,
      arrayFields: arrays,
      objects: objects.length,
      objectFields: objects,
      hasComplexity: this.hasComplexDataStructures(obj)
    };
  }

  /**
   * Get list of complex fields that should be protected from overwriting
   */
  private getComplexFields(obj: any): string[] {
    if (!obj || typeof obj !== 'object') return [];

    const complexFields = [];

    // Add arrays
    Object.keys(obj).forEach(key => {
      if (Array.isArray(obj[key])) {
        complexFields.push(key);
      }
    });

    // Add nested objects
    Object.keys(obj).forEach(key => {
      if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key]) && Object.keys(obj[key]).length > 0) {
        complexFields.push(key);
      }
    });

    // Add type-specific critical fields
    const criticalFieldsByType = {
      'MON': ['input', 'range', 'num_inputs', 'an_inputs'],
      'GRP': ['items', 'controls', 'children'],
      'SCH': ['schedule', 'items', 'events'],
      'PID': ['parameters', 'settings', 'config'],
      // Add more types as needed
    };

    const typeCriticalFields = criticalFieldsByType[obj.type] || [];
    typeCriticalFields.forEach(field => {
      if (obj[field] !== undefined && !complexFields.includes(field)) {
        complexFields.push(field);
      }
    });

    return complexFields;
  }

  // Helper method to get detailed information about action codes
  private getActionDetails(action: number): any {
    const actionMap = {
      0: {
        name: 'GET_PANEL_DATA',
        description: 'Request panel data from T3000 backend',
        category: 'Data_Request',
        implemented: true,
        responseAction: 'GET_PANEL_DATA_RES'
      },
      1: {
        name: 'GET_INITIAL_DATA',
        description: 'Request initial application data and state',
        category: 'Initialization',
        implemented: true,
        responseAction: 'GET_INITIAL_DATA_RES'
      },
      2: {
        name: 'SAVE_GRAPHIC_DATA',
        description: 'Save graphic/layout data to T3000',
        category: 'Data_Save',
        implemented: true,
        responseAction: 'SAVE_GRAPHIC_DATA_RES'
      },
      3: {
        name: 'UPDATE_ENTRY',
        description: 'Update a specific entry/field value',
        category: 'Data_Update',
        implemented: true,
        responseAction: 'UPDATE_ENTRY_RES'
      },
      4: {
        name: 'GET_PANELS_LIST',
        description: 'Request list of available panels',
        category: 'Data_Request',
        implemented: true,
        responseAction: 'GET_PANELS_LIST_RES'
      },
      5: {
        name: 'GET_PANEL_RANGE_INFO',
        description: 'Request panel range information',
        category: 'Data_Request',
        implemented: false, // Marked with ❓！
        responseAction: 'GET_PANEL_RANGE_INFO_RES'
      },
      6: {
        name: 'GET_ENTRIES',
        description: 'Request specific entries data',
        category: 'Data_Request',
        implemented: true,
        responseAction: 'GET_ENTRIES_RES'
      },
      7: {
        name: 'LOAD_GRAPHIC_ENTRY',
        description: 'Load graphic entry for editing',
        category: 'UI_Navigation',
        implemented: true,
        responseAction: 'LOAD_GRAPHIC_ENTRY_RES'
      },
      8: {
        name: 'OPEN_ENTRY_EDIT_WINDOW',
        description: 'Open entry edit window in T3000',
        category: 'UI_Action',
        implemented: true,
        responseAction: 'OPEN_ENTRY_EDIT_WINDOW_RES'
      },
      9: {
        name: 'SAVE_IMAGE',
        description: 'Save image file to T3000 library',
        category: 'File_Operation',
        implemented: true,
        responseAction: 'SAVE_IMAGE_RES'
      },
      10: {
        name: 'SAVE_LIBRARY_DATA',
        description: 'Save library data to T3000',
        category: 'Data_Save',
        implemented: true, // Marked with ✔❓
        responseAction: 'SAVE_LIBRARY_DATA_RES'
      },
      11: {
        name: 'DELETE_IMAGE',
        description: 'Delete image from T3000 library',
        category: 'File_Operation',
        implemented: true,
        responseAction: 'DELETE_IMAGE_RES'
      },
      12: {
        name: 'GET_SELECTED_DEVICE_INFO',
        description: 'Get information about selected device',
        category: 'Device_Info',
        implemented: true,
        responseAction: 'GET_SELECTED_DEVICE_INFO_RES'
      },
      13: {
        name: 'BIND_DEVICE',
        description: 'Bind/connect to a device',
        category: 'Device_Operation',
        implemented: false, // Marked with ❓！
        responseAction: 'BIND_DEVICE_RES'
      },
      14: {
        name: 'SAVE_NEW_LIBRARY_DATA',
        description: 'Save new library data to T3000',
        category: 'Data_Save',
        implemented: false, // Marked with ❓！
        responseAction: 'SAVE_NEW_LIBRARY_DATA_RES'
      }
    };

    return actionMap[action] || {
      name: 'UNKNOWN_ACTION',
      description: `Unknown action code: ${action}`,
      category: 'Unknown',
      implemented: false,
      responseAction: 'UNKNOWN_RES'
    };
  }

  //#endregion
}

export default WebViewClient
