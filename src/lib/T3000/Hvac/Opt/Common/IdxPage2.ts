import Hvac from "../../Hvac";
import IdxUtils from "./IdxUtils";
import {
  globalNav, user, emptyLib, library, appState, rulersGridVisible, isBuiltInEdge, documentAreaPosition, savedNotify,
  viewportMargins, viewport, locked, deviceModel, T3_Types, emptyProject, undoHistory, redoHistory, moveable, deviceAppState,
  globalMsg, grpNav, T3000_Data, selectPanelOptions, linkT3EntryDialog,
  appStateV2
} from "../../Data/T3Data"
import { cloneDeep } from "lodash";
import { toRaw } from "vue";
import { liveApi } from "src/lib/api";
import DataOpt from "../Data/DataOpt";
import T3Util from "../../Util/T3Util";
import AntdUtil from "../UI/AntdUtil";

import {
  isDrawing, selectedTool, lastAction, clipboardFull, topContextToggleVisible, showSettingMenu, toggleModeValue, toggleValueValue, toggleValueDisable,
  toggleValueShow, toggleNumberDisable, toggleNumberShow, toggleNumberValue, gaugeSettingsDialog, insertCount, objectsRef, cursorIconPos, continuesObjectTypes,
  startTransform, snappable, keepRatio, selecto, targets, contextMenuShow, importJsonDialog
} from "../../Data/Constant/RefConstant";
import { tools, /*T3_Types,*/ /*getObjectActiveValue,*/ /*T3000_Data,*/ /*user, globalNav,*/ demoDeviceData } from "../../../../common";

import { insertT3EntryDialog } from "src/lib/T3000/Hvac/Data/Data";
import LogUtil from "../../Util/LogUtil";

//  let lastAction = null; // Store the last action performed

class IdxPage2 {

  private webview = (window as any).chrome?.webview;

  // Access Quasar framework instance
  public $q: any;
  public getPanelsInterval: any;
  public autoSaveInterval: any;

  initPage() {
    // Hvac.WebClient.initMessageHandler();
    // this.initGlobalNav();
    // this.isLoggedIn();
    // this.restoreAppState();
    //  this.setDocMarginOffset();
    //  this.initPanzoom();
    // this.initMessageClient();
    //  this.initScorller();
    // this.initAutoSaveInterval();
    //  this.initWindowListener();
    //  this.refreshMoveableGuides();
    //  this.resetPanzoom();
  }

  initQuasar(quasar) {
    this.$q = quasar;
    Hvac.WebClient.initQuasar(this.$q);
    Hvac.QuasarUtil.initQuasar(this.$q);
  }

  // Set global navigation properties
  initGlobalNav() {
    globalNav.value.title = "HVAC Drawer";
    globalNav.value.back = null;
    globalNav.value.home = "/";
  }

  // Restore app state from local storage if not in a webview
  restoreAppState() {
    if (this.webview?.postMessage) {
      return;
    }

    const localState = Hvac.LsOpt.loadParsedAppStateLS();
    if (localState) {
      appStateV2.value = localState;
      // rulersGridVisible.value = appState.value.rulersGridVisible;
    }
  }

  // Checks if the user is logged in
  isLoggedIn() {
    // const $q = useQuasar();
    // LogUtil.Debug("= Idx $q:", $q);

    const hasToken = this.$q.cookies.has("token");
    if (!hasToken) {
      user.value = null;
      return;
    }

    // Get the user's data from the API
    liveApi.get("hvacTools").then(async (res: any) => {
      const data = await res.json();
      if (data.length > 0) {
        data?.forEach((oItem) => {
          this.addOnlineLibImage(oItem);
        });
      }
    })
      .catch((err) => {
        LogUtil.Debug(err);
      });

    liveApi.get("hvacObjectLibs").then(async (res: any) => {
      const data = await res.json();
      if (data.length > 0) {
        data.forEach((oItem) => {
          library.value.objLib.push({
            id: oItem.id,
            label: oItem.label,
            items: oItem.items,
            online: true,
          });
        });
      }
    })
      .catch((err) => {
        LogUtil.Debug(err);
      });

    liveApi.get("me").then(async (res) => {
      user.value = await res.json();
    })
      .catch((err) => {
        // Not logged in
      });
  }

  // Toggles the auto/manual mode of an item
  static autoManualToggle(item) {
    LogUtil.Debug('5555555 IndexPage2.vue->autoManualToggle->item, locked value', item);

    // if (!locked.value) return;
    item.t3Entry.auto_manual = item.t3Entry.auto_manual ? 0 : 1;
    this.T3UpdateEntryField("auto_manual", item);
  }

  // Update a T3 entry field for an object
  static T3UpdateEntryField(key, obj) {
    if (!obj.t3Entry) return;
    let fieldVal = obj.t3Entry[key];

    const tempFieldBefore = fieldVal;

    if (Math.abs(fieldVal) >= 1000) {
      fieldVal = fieldVal / 1000;
    }

    if (key === "value" || key === "control") {
      IdxUtils.refreshObjectStatus(obj);
    }

    const msgData = {
      action: 3, // UPDATE_ENTRY
      field: key,
      value: fieldVal,
      panelId: obj.t3Entry.pid,
      entryIndex: obj.t3Entry.index,
      entryType: T3_Types[obj.t3Entry.type],
    };

    if (isBuiltInEdge.value) {
      Hvac.WebClient.UpdateEntry(msgData);
    }
    else {
      Hvac.WsClient.UpdateEntry(msgData);
    }

    LogUtil.Debug('= Idx T3UpdateEntryField to T3 before, after', tempFieldBefore, fieldVal);
  }

  // Set intervals for fetching panel and entry data if in a webview
  initFetchPanelEntryInterval() {
    if (!this.webview?.postMessage) {
      return;
    }

    this.getPanelsInterval = setInterval(() => {
      Hvac.WebClient.GetPanelsList();
    }, 10000);

    setInterval(function () {
      const lkdEntries = IdxUtils.getLinkedEntries();

      if (lkdEntries.length <= 0) {
        return;
      }

      const etries = lkdEntries.map((ii) => {
        return {
          panelId: ii.t3Entry.pid,
          index: ii.t3Entry.index,
          type: T3_Types[ii.t3Entry.type],
        };
      });

      Hvac.WebClient.GetEntries(null, null, etries);

    }, 10000);
  }

  initMessageClient() {
    // Built-in explorer

    if (isBuiltInEdge.value) {
      Hvac.WebClient.GetInitialData();
      Hvac.WebClient.GetPanelsList();
      this.initFetchPanelEntryInterval();
      return;
    }

    // External explorer
    // If accessed from an external browser
    if (!isBuiltInEdge.value) {
      this.initExternalBrowserOpt();
      return;
    }
  }

  initExternalBrowserOpt() {

    if (isBuiltInEdge.value) return;

    Hvac.WsClient.initQuasar(this.$q);

    // connect to the ws://localhost:9104 websocket server
    Hvac.WsClient.connect();

    // check if need to show the device list dialog
    setTimeout(() => {
      const currentDevice = Hvac.DeviceOpt.getCurrentDevice();
      if (!currentDevice) {
        deviceModel.value.active = true;
      }
      else {
        deviceModel.value.active = false;
        deviceModel.value.data = currentDevice;

        LogUtil.Debug('= IdxPage load from local storage', currentDevice);

        // load device appstate
        //Hvac.DeviceOpt.refreshDeviceAppState();
        Hvac.WsClient.GetInitialData(currentDevice.deviceId, currentDevice.graphic, true);

        // LogUtil.Debug('=== indexPage.currentDevice load from local storage', currentDevice);
        // LogUtil.Debug('=== indexPage.deviceModel changed', deviceModel.value);
      }
    }, 1000);

    setInterval(function () {
      const linkedEntries = IdxUtils.getLinkedEntries();
      if (linkedEntries.length === 0) return;

      const data = linkedEntries.map((ii) => {
        return {
          panelId: ii.t3Entry.pid,
          index: ii.t3Entry.index,
          type: T3_Types[ii.t3Entry.type],
        };
      });

      Hvac.WsClient.GetEntries(data);

      /*
      window.chrome?.webview?.postMessage({
        action: 6, // GET_ENTRIES
        data: getLinkedEntries().map((ii) => {
          return {
            panelId: ii.t3Entry.pid,
            index: ii.t3Entry.index,
            type: T3_Types[ii.t3Entry.type],
          };
        }),
      });
      */
    }, 10000);
  }

  // Wrap a new function for saving data to localstorage and T3000
  save(notify: boolean = false, saveToT3: boolean = false) {
    LogUtil.Debug('= Idx2 save to local storage', new Date().toLocaleString());
    savedNotify.value = notify;
    // this.saveToLocal();

    // save the data for new ui to local storage
    DataOpt.SaveToLocalStorage();

    if (saveToT3) {
      // this.saveToT3000();
      DataOpt.SaveToT3000();
    }
  }

  // Save the current app state to localstorage, optionally displaying a notification
  saveToLocal() {
    // Prepare data
    const data = this.prepareSaveData();

    Hvac.LsOpt.saveAppState(data);

    if (!isBuiltInEdge.value) {
      // Save current appState to ls deviceAppState
      Hvac.DeviceOpt.saveDeviceAppState(deviceAppState, deviceModel, data);
    }
  }

  // Save data to T3000
  saveToT3000() {
    // Prepare data
    const data = this.prepareSaveData();

    if (isBuiltInEdge.value) {
      Hvac.WebClient.SaveGraphicData(null, null, data);
    }
    else {
      const msgType = globalMsg.value.find((msg) => msg.msgType === "get_initial_data");
      if (msgType) {
        LogUtil.Debug('= Idx save to T3000 with initial data status error, cancel auto save');
        return;
      }

      // Post a save action to T3
      const currentDevice = Hvac.DeviceOpt.getCurrentDevice();
      const panelId = currentDevice?.deviceId;
      const graphicId = currentDevice?.graphic;

      if (panelId && graphicId) {
        Hvac.WsClient.SaveGraphic(panelId, graphicId, data);
      }
      else {
        LogUtil.Debug('= Idx save to T3000 current device is null');
      }
    }
  }

  initAutoSaveInterval() {
    // do not trigger the auto save for the first time, cause there may have some other operations to load the initial data
    // from T3000, and the auto save will overwrite the graphic data if it will take a long time to load the initial data
    setTimeout(() => {
      this.autoSaveInterval = setInterval(() => {
        LogUtil.Debug('= Idx auto save every 30s', new Date().toLocaleString());
        this.save(true, true);
      }, 30000);
    }, 10000);
  }

  prepareSaveData() {
    const data = cloneDeep(toRaw(appStateV2.value));

    // Recalculate the items count
    data.itemsCount = data.items.filter(item => item.width !== 0).length;

    data.selectedTargets = [];
    data.elementGuidelines = [];
    data.rulersGridVisible = rulersGridVisible.value;

    return data;
  }

  // Update a T3 entry field for an object
  T3UpdateEntryField(key, obj) {
    LogUtil.Debug('idx page 2  T3UpdateEntryField appState before', appStateV2.value);
    // LogUtil.Debug('IndexPage.vue T3UpdateEntryField key=', key, 'obj=', obj);
    // LogUtil.Debug('IndexPage.vue T3UpdateEntryField appState after', appState.value);
    if (!obj.t3Entry) return;
    let fieldVal = obj.t3Entry[key];

    const tempFieldBefore = fieldVal;

    if (Math.abs(fieldVal) >= 1000) {
      fieldVal = fieldVal / 1000;
    }

    if (key === "value" || key === "control") {
      IdxUtils.refreshObjectStatus(obj);
    }

    const msgData = {
      action: 3, // UPDATE_ENTRY
      field: key,
      value: fieldVal,
      panelId: obj.t3Entry.pid,
      entryIndex: obj.t3Entry.index,
      entryType: T3_Types[obj.t3Entry.type],
    };

    if (isBuiltInEdge.value) {
      Hvac.WebClient.UpdateEntry(msgData);
    }
    else {
      Hvac.WsClient.UpdateEntry(msgData);
    }

    LogUtil.Debug('= Idx T3UpdateEntryField to T3 before, after', tempFieldBefore, fieldVal);
  }

  // Adds the online images to the library
  addOnlineLibImage(oItem) {
    const iIndex = library.value.images.findIndex(
      (obj) => obj.id === "IMG-" + oItem.id
    );
    if (iIndex !== -1) {
      library.value.images.splice(iIndex, 1);
    }
    library.value.images.push({
      id: "IMG-" + oItem.id,
      dbId: oItem.id,
      name: oItem.name,
      path: process.env.API_URL + "/file/" + oItem.file.path,
      online: true,
    });
  }

  // add new library to t3
  addToNewLibrary() {
    if (appStateV2.value.selectedTargets.length < 1 || locked.value) return;
    const selectedItems = appStateV2.value.items.filter((i) =>
      appStateV2.value.selectedTargets.some(
        (ii) => ii.id === `moveable-item-${i.id}`
      )
    );
    let isOnline = false;
    const libItems = cloneDeep(selectedItems);
    library.value.objLibItemsCount++;
    let createdItem = null;
    if (user.value) {
      isOnline = true;
      liveApi
        .post("hvacObjectLibs", {
          json: {
            label: "Item " + library.value.objLibItemsCount,
            items: libItems.map((i) => {
              delete i.id;
              return i;
            }),
          },
        })
        .then(async (res) => {
          createdItem = await res.json();
          // $q.notify({
          //   type: "positive",
          //   message: "Successfully saved to library",
          // });
          AntdUtil.ShowMessage("success", "Successfully saved to library");

          library.value.objLib.push({
            id: createdItem?.id || library.value.objLibItemsCount,
            label: "Item " + library.value.objLibItemsCount,
            items: createdItem.items,
            online: isOnline,
          });
          IdxUtils.saveNewLib();
        })
        .catch((err) => {
          // $q.notify({
          //   type: "negative",
          //   message: err.message,
          // });
          AntdUtil.ShowMessage("error", err.message);
        });
    }
    library.value.objLib.push({
      id: createdItem?.id || library.value.objLibItemsCount,
      label: "Item " + library.value.objLibItemsCount,
      items: libItems,
      online: isOnline,
    });
    IdxUtils.saveNewLib();
  }

  // Refactor below functions to Idx page2 util for backup (new ui will not use this function anymore)
  viewportLeftClick(ev) {
    // LogUtil.Debug('IndexPage.vue->viewportLeftClick->ev', ev);
    ev.preventDefault();

    const check = !locked.value && selectedTool.value.name !== 'Pointer' && selectedTool.value.name != "Wall" && !isDrawing.value
      && selectedTool.value.name != "Int_Ext_Wall" && selectedTool.value.name != "Duct";

    if (check) {
      // Manually create a shape at the mouse current position

      var ePosition = {
        rect: { width: 60, height: 60, top: ev.clientY, left: ev.clientX },
        clientX: ev.clientX,
        clientY: ev.clientY
      };

      onSelectoDragEnd(ePosition);

      // Release the tool
      this.selectTool(tools[0]);
    }
  }

  // Select a tool and set its type
  selectTool(tool, type = "default") {
    LogUtil.Debug("= IdxPage selectTool", tool, type);
    selectedTool.value = tool;
    if (typeof tool === "string") {
      selectedTool.value = tools.find((item) => item.name === tool);
    }
    selectedTool.value.type = type;

    Hvac.UI.evtOpt.HandleSidebarToolEvent(selectedTool);
  }

  // Handles a right-click event on the viewport
  viewportRightClick(ev) {
    ev.preventDefault();
    this.selectTool(tools[0]);
    if (isDrawing.value) {
      isDrawing.value = false;
      this.undoAction();
      setTimeout(() => {
        this.refreshObjects();
      }, 10);

      //clear empty drawing object
      Hvac.PageMain.ClearItemsWithZeroWidth(appStateV2);
      Hvac.PageMain.SetWallDimensionsVisible("all", isDrawing.value, appStateV2, false);
    }
  }

  // Undo the last action
  undoAction() {
    if (undoHistory.value.length < 1) return;
    redoHistory.value.unshift({
      title: lastAction,
      state: cloneDeep(appStateV2.value),
    });
    appStateV2.value = cloneDeep(undoHistory.value[0].state);
    undoHistory.value.shift();
    Hvac.IdxPage.refreshMoveable();
  }

  redoAction() {
    if (redoHistory.value.length < 1) return;
    undoHistory.value.unshift({
      title: lastAction,
      state: cloneDeep(appStateV2.value),
    });
    appStateV2.value = cloneDeep(redoHistory.value[0].state);
    redoHistory.value.shift();
    Hvac.IdxPage.refreshMoveable();
  }

  // Not used in new UI anymore, just for backup
  updateWeldModelCanvas(weldModel, pathItemList) {
    appStateV2.value.items.map((item) => {
      if (
        (item.type === "Weld_General" || item.type === "Weld_Duct") &&
        item.id === weldModel.id
      ) {
        // Update the weld items's new width, height, translate
        const firstTrsx = item?.weldItems[0]?.translate[0];
        const firstTrsy = item?.weldItems[0]?.translate[1];

        item?.weldItems?.forEach((weldItem) => {
          const pathItem = pathItemList?.find(
            (itx) => itx?.item?.id === weldItem?.id
          );
          // LogUtil.Debug('IndexPage.vue->updateWeldModelCanvas->pathItem', pathItem);
          // LogUtil.Debug('IndexPage.vue->updateWeldModelCanvas->weldItem', weldModel.width, weldModel.height);
          if (pathItem) {
            weldItem.width = pathItem.newPos.width;
            weldItem.height = pathItem.newPos.height;
            weldItem.translate[0] = firstTrsx + pathItem.newPos.trsx;
            weldItem.translate[1] = firstTrsy + pathItem.newPos.trsy;
          }
        });
      }
    })
  }

  updateWeldModel(weldModel, itemList) {
    appStateV2.value.items.map((item) => {
      if (item.type === "Weld" && item.id === weldModel.id) {
        item.settings.weldItems = itemList;
      }
    });
  }

  toggleRulersGrid(val) {
    rulersGridVisible.value = val === "Enable" ? true : false;
    appStateV2.value.rulersGridVisible = rulersGridVisible.value;
    this.save(false, false);
  }

  convertObjectType(item, type) {
    if (!item) {
      item = appStateV2.value.items[appStateV2.value.activeItemIndex];
    }
    if (!item) return;
    addActionToHistory("Convert object to " + type);

    // Get the default settings for the new type
    const toolSettings =
      cloneDeep(tools.find((tool) => tool.name === type)?.settings) || {};
    const defaultSettings = Object.keys(toolSettings).reduce((acc, key) => {
      acc[key] = toolSettings[key].value;
      return acc;
    }, {});

    // Merge the default settings with the item's current settings
    const newSettings = {};
    for (const key in defaultSettings) {
      if (Object.hasOwnProperty.call(defaultSettings, key)) {
        if (item.settings[key] !== undefined) {
          newSettings[key] = item.settings[key];
        } else {
          newSettings[key] = defaultSettings[key];
        }
      }
    }
    const mainSettings = ["bgColor", "textColor", "title", "t3EntryDisplayField"];
    for (const mSetting of mainSettings) {
      if (newSettings[mSetting] === undefined) {
        newSettings[mSetting] = item.settings[mSetting];
      }
    }
    item.type = type;
    item.settings = newSettings;
  }

  // Deletes a library image
  deleteLibImage(item) {
    if (item.online) {
      // Delete the image from the API
      liveApi
        .delete("hvacTools/" + item.dbId || item.id.slice(4))
        .then(async () => {
          this.$q.notify({
            type: "positive",
            message: "Successfully deleted",
          });
        })
        .catch((err) => {
          this.$q.notify({
            type: "negative",
            message: err.message,
          });
        });
    }

    // Remove the image from the local library
    const itemIndex = library.value.images.findIndex(
      (obj) => obj.name === item.name
    );
    if (itemIndex !== -1) {
      library.value.images.splice(itemIndex, 1);
      if (!item.online) {
        // Delete the image from the webview

        if (library.value.images.length <= 0) {
          return;
        }

        const imagePath = cloneDeep(library.value.images[itemIndex].path);

        /*
        window.chrome?.webview?.postMessage({
          action: 11, // DELETE_IMAGE
          data: toRaw(imagePath),
        });
        */

        if (isBuiltInEdge.value) {
          Hvac.WebClient.DeleteImage(toRaw(imagePath));
        }
        else {
          Hvac.WsClient.DeleteImage(toRaw(imagePath));
        }

        IdxUtils.saveLib();
      }
    }
  }

  // Renames a library item
  renameLibItem(item, name) {
    if (user.value && item.online) {
      // Update the item on the API
      liveApi
        .patch("hvacObjectLibs/" + item.id, {
          json: {
            label: name,
          },
        })
        .then(async () => {
          this.$q.notify({
            type: "positive",
            message: "Successfully updated",
          });
        })
        .catch((err) => {
          this.$q.notify({
            type: "negative",
            message: err.message,
          });
        });
    }

    // Update the local library
    const itemIndex = library.value.objLib.findIndex(
      (obj) => obj.name === item.name
    );
    if (itemIndex !== -1) {
      library.value.objLib[itemIndex].label = name;
    }
    IdxUtils.saveLib();
  }

  // Deletes a library item
  deleteLibItem(item) {
    if (user.value && item.online) {
      // Delete the item from the API
      liveApi
        .delete("hvacObjectLibs/" + item.id)
        .then(async () => {
          this.$q.notify({
            type: "positive",
            message: "Successfully deleted",
          });
        })
        .catch((err) => {
          this.$q.notify({
            type: "negative",
            message: err.message,
          });
        });
    }

    // Remove the item from the local library
    const itemIndex = library.value.objLib.findIndex(
      (obj) => obj.name === item.name
    );
    if (itemIndex !== -1) {
      library.value.objLib.splice(itemIndex, 1);
    }
    IdxUtils.saveLib();
  }

  pasteFromClipboard() {
    if (locked.value) return;
    let items = [];
    const clipboard = localStorage.getItem("clipboard");
    if (clipboard) {
      items = JSON.parse(clipboard);
    }
    if (!items) return;
    this.addActionToHistory("Paste");
    const elements = [];
    const addedItems = [];
    items.forEach((item) => {
      addedItems.push(this.cloneObject(item));
    });
    setTimeout(() => {
      addedItems.forEach((addedItem) => {
        const el = document.querySelector(`#moveable-item-${addedItem.id}`);
        elements.push(el);
      });
      appStateV2.value.selectedTargets = elements;
      selecto.value.setSelectedTargets(elements);
      appStateV2.value.activeItemIndex = null;
    }, 10);
  }

  saveSelectedToClipboard() {
    if (locked.value) return;
    if (appStateV2.value.selectedTargets.length === 0) return;
    const selectedItems = appStateV2.value.items.filter((i) =>
      appStateV2.value.selectedTargets.some(
        (ii) => ii.id === `moveable-item-${i.id}`
      )
    );

    localStorage.setItem("clipboard", JSON.stringify(selectedItems));
    clipboardFull.value = true;
  }

  // Rotate selected objects by 90 degrees
  rotate90Selected(minues = false) {
    moveable.value.request(
      "rotatable",
      {
        deltaRotate: minues ? -90 : 90,
      },
      true
    );
    Hvac.IdxPage.refreshMoveable();
  }

  // Send selected objects to the back by decreasing their z-index
  sendSelectedToBack() {
    this.addActionToHistory("Send selected objects to back");
    const selectedItems = appStateV2.value.items.filter((i) =>
      appStateV2.value.selectedTargets.some(
        (ii) => ii.id === `moveable-item-${i.id}`
      )
    );
    selectedItems.forEach((item) => {
      item.zindex = item.zindex - 1;
    });
  }

  // Bring selected objects to the front by increasing their z-index
  bringSelectedToFront() {
    this.addActionToHistory("Bring selected objects to front");
    const selectedItems = appStateV2.value.items.filter((i) =>
      appStateV2.value.selectedTargets.some(
        (ii) => ii.id === `moveable-item-${i.id}`
      )
    );
    selectedItems.forEach((item) => {
      item.zindex = item.zindex + 1;
    });
  }

  // Remove the latest undo history entry
  objectSettingsUnchanged() {
    undoHistory.value.shift();
  }

  // Add selected items to the library
  addToLibrary() {

    if (appStateV2.value.selectedTargets.length < 1 || locked.value) return;
    const selectedItems = appStateV2.value.items.filter((i) =>
      appStateV2.value.selectedTargets.some(
        (ii) => ii.id === `moveable-item-${i.id}`
      )
    );
    let isOnline = false;
    const libItems = cloneDeep(selectedItems);
    library.value.objLibItemsCount++;
    let createdItem = null;
    if (user.value) {
      isOnline = true;
      liveApi
        .post("hvacObjectLibs", {
          json: {
            label: "Item " + library.value.objLibItemsCount,
            items: libItems.map((i) => {
              delete i.id;
              return i;
            }),
          },
        })
        .then(async (res) => {
          createdItem = await res.json();
          this.$q.notify({
            type: "positive",
            message: "Successfully saved to library",
          });

          library.value.objLib.push({
            id: createdItem?.id || library.value.objLibItemsCount,
            label: "Item " + library.value.objLibItemsCount,
            items: createdItem.items,
            online: isOnline,
          });
          IdxUtils.saveLib();
        })
        .catch((err) => {
          this.$q.notify({
            type: "negative",
            message: err.message,
          });
        });
    }
    library.value.objLib.push({
      id: createdItem?.id || library.value.objLibItemsCount,
      label: "Item " + library.value.objLibItemsCount,
      items: libItems,
      online: isOnline,
    });
    IdxUtils.saveLib();
  }

  // Navigate back in the group navigation history
  navGoBack() {
    if (grpNav.value.length > 1) {
      const item = grpNav.value[grpNav.value.length - 2];

      /*
      window.chrome?.webview?.postMessage({
        action: 7, // LOAD_GRAPHIC_ENTRY
        panelId: item.pid,
        entryIndex: item.index,
      });
      */

      const message = {
        action: 7, // LOAD_GRAPHIC_ENTRY
        panelId: item.pid,
        entryIndex: item.index,
      };

      if (isBuiltInEdge.value) {
        Hvac.WebClient.LoadGraphicEntry(message);
      }
      else {
        Hvac.WsClient.LoadGraphicEntry(message);
      }
    } else {

      /*
      window.chrome?.webview?.postMessage({
        action: 1, // GET_INITIAL_DATA
      });
      */

      if (isBuiltInEdge.value) {
        Hvac.WebClient.GetInitialData();
      }
      else {
        const currentDevice = Hvac.DeviceOpt.getCurrentDevice();
        const panelId = currentDevice.panelId;
        const graphicId = currentDevice.graphic;
        Hvac.WsClient.GetInitialData(panelId, graphicId, true);
      }
    }
  }

  setTheSettingContextMenuVisible() {

    if (appStateV2.value.selectedTargets.length > 1) {
      topContextToggleVisible.value = false;
      toggleValueShow.value = false;
      toggleNumberShow.value = false;

    } else {
      if (appStateV2.value.selectedTargets.length === 1) {
        const selectedItem = appStateV2.value.items.find(
          (item) => `moveable-item-${item.id}` === appStateV2.value.selectedTargets[0].id
        )

        if (selectedItem.t3Entry !== null) {
          topContextToggleVisible.value = true;
          this.ObjectRightClicked(selectedItem, null);
        }
        else {
          topContextToggleVisible.value = false;
          toggleValueShow.value = false;
          toggleNumberShow.value = false;
        }
      }
    }
  }

  toggleClicked(item, type, ev) {
    // ev.preventDefault();
    // LogUtil.Debug('toggleClicked->item,type', item, type, ev);
    // LogUtil.Debug('toggleClicked->toggleModeValue,toggleValueValue',
    //   toggleModeValue.value, toggleValueValue.value);
    // LogUtil.Debug('toggleClicked->before item', item.t3Entry)

    if (type === "mode") {

      // Disable the value field if the mode is set to Auto
      if (toggleModeValue.value === "Auto") {
        toggleValueDisable.value = true;
        toggleNumberDisable.value = true;
      }
      else {
        toggleValueDisable.value = false;
        toggleNumberDisable.value = false;
      }

      item.t3Entry.auto_manual = toggleModeValue.value === "Auto" ? 0 : 1;
      this.T3UpdateEntryField("auto_manual", item);
    }

    if (type == "value") {
      item.t3Entry.control = toggleValueValue.value === "Off" ? 0 : 1;
      this.T3UpdateEntryField("control", item);
    }

    if (type === "number-value") {
      item.t3Entry.value = toggleNumberValue.value * 1;// * 1000;
      this.T3UpdateEntryField("value", item);
    }

    this.save(false, true);

    // LogUtil.Debug('toggleClicked->after item', item.t3Entry)
  }

  ObjectRightClicked(item, ev) {
    // ev.preventDefault();

    // LogUtil.Debug('ObjectRightClicked->appState.selectedTargets', appState.value.selectedTargets[0]);
    // LogUtil.Debug('ObjectRightClicked->ev,item', item);

    if (item.t3Entry !== null) {

      showSettingMenu.value = true;

      // LogUtil.Debug('ObjectRightClicked->item.t3Entry', item.t3Entry);

      // Load the default auto_manual value
      if (item.t3Entry.auto_manual === 1) {
        toggleModeValue.value = "Manual";
        toggleValueDisable.value = false;
        toggleNumberDisable.value = false;
      }
      else {
        toggleModeValue.value = "Auto";
        toggleValueDisable.value = true;
        toggleNumberDisable.value = true;
      }

      // Show on/off value field only if the digital_analog is 0, otherwise show different value field (Input / Dropdown)

      if (item.t3Entry.digital_analog === 0) {
        toggleValueShow.value = true;
      }
      else {
        toggleValueShow.value = false;
      }

      // Load the default control value
      if (item.t3Entry.control === 1) {
        toggleValueValue.value = "On";
      }
      else {
        toggleValueValue.value = "Off";
      }

      // Set digital_analog field and value
      if (item.t3Entry.digital_analog === 1 && item.t3Entry.range !== 101) {
        toggleNumberShow.value = true;
        toggleNumberValue.value = item.t3Entry.value * 1;/// 1000;
      }
      else {
        toggleNumberShow.value = false;
      }
    }
    else {
      showSettingMenu.value = false;
    }
  }

  // Updates an entry value
  changeEntryValue(refItem, newVal, control) {
    // LogUtil.Debug('2222222222 IndexPage.vue->changeEntryValue->refItem,newVal,control', refItem, newVal, control);
    const key = control ? "control" : "value";
    const item = appStateV2.value.items.find((i) => i.id === refItem.id);
    item.t3Entry[key] = newVal;
    this.T3UpdateEntryField(key, item);
  }

  // Toggles the auto/manual mode of an item
  autoManualToggle(item) {
    LogUtil.Debug('5555555 IndexPage.vue->autoManualToggle->item, locked value', item);

    // if (!locked.value) return;
    item.t3Entry.auto_manual = item.t3Entry.auto_manual ? 0 : 1;
    this.T3UpdateEntryField("auto_manual", item);
  }

  // Handle object click events based on t3Entry type
  objectClicked(item) {

    LogUtil.Debug("= P.IDX2 objectClicked");
    this.setTheSettingContextMenuVisible();

    if (!locked.value) return;
    if (item.t3Entry?.type === "GRP") {

      const message = {
        action: 7, // LOAD_GRAPHIC_ENTRY
        panelId: item.t3Entry.pid,
        entryIndex: item.t3Entry.index,
      };

      if (isBuiltInEdge.value) {
        Hvac.WebClient.LoadGraphicEntry(message);
      }
      else {
        Hvac.WsClient.LoadGraphicEntry(message);
      }

      /*
      window.chrome?.webview?.postMessage({
        action: 7, // LOAD_GRAPHIC_ENTRY
        panelId: item.t3Entry.pid,
        entryIndex: item.t3Entry.index,
      });
      */

    } else if (["SCHEDULE", "PROGRAM", "HOLIDAY"].includes(item.t3Entry?.type)) {

      const message = {
        action: 8, // OPEN_ENTRY_EDIT_WINDOW
        panelId: item.t3Entry.pid,
        entryType: T3_Types[item.t3Entry.type],
        entryIndex: item.t3Entry.index,
      };

      if (isBuiltInEdge.value) {
        Hvac.WebClient.OpenEntryEditWindow(message);
      }
      else {
        Hvac.WsClient.OpenEntryEditWindow(message);
      }

      /*
      window.chrome?.webview?.postMessage({
        action: 8, // OPEN_ENTRY_EDIT_WINDOW
        panelId: item.t3Entry.pid,
        entryType: T3_Types[item.t3Entry.type],
        entryIndex: item.t3Entry.index,
      });
      */
    } else if (
      item.t3Entry?.auto_manual === 1 &&
      item.t3Entry?.digital_analog === 0 &&
      item.t3Entry?.range
    ) {
      item.t3Entry.control = item.t3Entry.control === 1 ? 0 : 1;
      this.T3UpdateEntryField("control", item);
    }
  }

  // Toggle the lock state of the application
  lockToggle() {
    appStateV2.value.activeItemIndex = null;
    appStateV2.value.selectedTargets = [];
    locked.value = !locked.value;
    if (locked.value) {
      this.selectTool("Pointer");
    }

    // Update the document area position based on the lock state
    Hvac.IdxPage.restDocumentAreaPosition();
  }

  // Create a label for an entry with optional prefix
  entryLabel(option) {
    LogUtil.Debug('entryLabel - ', option);
    let prefix =
      (option.description && option.id !== option.description) ||
        (!option.description && option.id !== option.label)
        ? option.id + " - "
        : "";
    prefix = !option.description && !option.label ? option.id : prefix;
    return prefix + (option.description || option.label || "");
  }


  // Reload panel data by requesting the panels list
  reloadPanelsData() {
    T3000_Data.value.loadingPanel = null;

    /*
    window.chrome?.webview?.postMessage({
      action: 4, // GET_PANELS_LIST
    });
    */

    if (isBuiltInEdge.value) {
      Hvac.WebClient.GetPanelsList();
    }
    else {
      Hvac.WsClient.GetPanelsList();
    }
  }

  // Duplicate the selected items in the app state
  duplicateSelected() {
    if (appStateV2.value.selectedTargets.length < 1) return;
    this.addActionToHistory("Duplicate the selected objects");
    const elements = [];
    const dupGroups = {};
    appStateV2.value.selectedTargets.forEach((el) => {
      const item = appStateV2.value.items.find(
        (i) => `moveable-item-${i.id}` === el.id
      );
      if (item) {
        let group = undefined;
        if (item.group) {
          if (!dupGroups[`${item.group}`]) {
            appStateV2.value.groupCount++;
            dupGroups[`${item.group}`] = appStateV2.value.groupCount;
          }

          group = dupGroups[`${item.group}`];
        }
        const dupItem = this.cloneObject(item, group);
        setTimeout(() => {
          const dupElement = document.querySelector(
            `#moveable-item-${dupItem.id}`
          );
          elements.push(dupElement);
        }, 10);
      }
    });
    setTimeout(() => {
      appStateV2.value.selectedTargets = elements;
      selecto.value.setSelectedTargets(elements);
      appStateV2.value.activeItemIndex = null;
    }, 20);
  }


  // Execute the import of the JSON data into the app state
  executeImportFromJson() {
    const importedState = JSON.parse(importJsonDialog.value.data);
    if (!importedState.items?.[0].type) {
      this.$q.notify({
        message: "Error, Invalid json file",
        color: "negative",
        icon: "error",
        actions: [
          {
            label: "Dismiss",
            color: "white",
            handler: () => {
              /* ... */
            },
          },
        ],
      });
      return;
    }

    if (appStateV2.value.items?.length > 0) {
      this.$q.dialog({
        dark: true,
        title: "You have unsaved drawing!",
        message: `Before proceeding with the import, please note that any unsaved drawing will be lost,
           and your undo history will also be erased. Are you sure you want to proceed?`,
        cancel: true,
        persistent: true,
      })
        .onOk(() => {
          undoHistory.value = [];
          redoHistory.value = [];
          importJsonDialog.value.active = false;
          appStateV2.value = importedState;
          importJsonDialog.value.data = null;
          setTimeout(() => {
            IdxUtils.refreshMoveableGuides();
          }, 100);
          Hvac.IdxPage.refreshMoveable();
        })
        .onCancel(() => {
          importJsonDialog.value.active = false;
        });
      return;
    }
    undoHistory.value = [];
    redoHistory.value = [];
    importJsonDialog.value.active = false;
    appStateV2.value = importedState;
    importJsonDialog.value.data = null;
    setTimeout(() => {
      IdxUtils.refreshMoveableGuides();
    }, 100);
    Hvac.IdxPage.refreshMoveable();
  }

  // Save an image to the library or online storage
  async saveLibImage(file) {
    if (user.value) {

      LogUtil.Debug('= Idx saveLibImage file', file);
      LogUtil.Debug('= Idx saveLibImage user', user.value);

      liveApi
        .post("hvacTools", {
          json: {
            name: file.name,
            fileId: file.id,
          },
        })
        .then(async (res) => {
          this.$q.notify({
            color: "positive",
            message: "Image successfully saved",
          });
          const oItem = await res.json();
          this.addOnlineLibImage(oItem);
        })
        .catch((err) => {
          this.$q.notify({
            color: "negative",
            message: err.message,
          });
        });

      return;
    }

    library.value.imagesCount++;

    const message = {
      action: 9, // SAVE_IMAGE
      filename: file.name,
      fileLength: file.size,
      fileData: await this.readFile(file.data),
    };

    if (isBuiltInEdge.value) {
      Hvac.WebClient.SaveImage(message);
    }
    else {
      Hvac.WsClient.SaveImage(message);
    }

    // window.chrome?.webview?.postMessage(message);
  }


  // Draws an object based on the provided size, position, and tool settings
  drawObject(size, pos, tool) {
    tool = tool || selectedTool.value;

    if (tool.type === "libItem") {
      this.addLibItem(tool.items, size, pos);
      return;
    }
    const scalPercentage = 1 / appStateV2.value.viewportTransform.scale;

    const toolSettings =
      cloneDeep(tools.find((t) => t.name === tool.name)?.settings) || {};
    const objectSettings = Object.keys(toolSettings).reduce((acc, key) => {
      acc[key] = toolSettings[key].value;
      return acc;
    }, {});

    if (tool.name === "G_Rectangle") {
      size.width = 100;
    }

    const tempItem = {
      title: null,
      active: false,
      type: tool.name,
      translate: [
        (pos.left - viewportMargins.left - appStateV2.value.viewportTransform.x) *
        scalPercentage,
        (pos.top - viewportMargins.top - appStateV2.value.viewportTransform.y) *
        scalPercentage,
      ],
      width: size.width * scalPercentage,
      height: size.height * scalPercentage,
      rotate: 0,
      scaleX: 1,
      scaleY: 1,
      settings: objectSettings,
      zindex: 1,
      t3Entry: null,
      showDimensions: true
    };

    if (tool.type === "Image") {
      tempItem.image = tool;
      tempItem.type = tool.id;
    }

    // copy the first category from tool.cat to item.cat
    if (tool.cat) {
      const [first] = tool.cat;
      tempItem.cat = first;
    }

    const item = this.addObject(tempItem);

    if (["Value", "Icon", "Switch"].includes(tool.name)) {
      linkT3EntryDialog.value.active = true;
    }

    setTimeout(() => {
      if (locked.value) return;
      appStateV2.value.activeItemIndex = appStateV2.value.items.findIndex(
        (i) => i.id === item.id
      );
    }, 10);
    setTimeout(() => {
      if (locked.value) return;
      const target = document.querySelector(`#moveable-item-${item.id}`);
      appStateV2.value.selectedTargets = [target];
      selecto.value.setSelectedTargets([target]);
    }, 100);
    return item;
  }


  toolDropped(ev, tool) {
    // const size = tool.name === "Int_Ext_Wall" ? { width: 200, height: 10 } : { width: 60, height: 60 };
    // drawObject(
    //   //{ width: 60, height: 60 },
    //   size,
    //   {
    //     clientX: ev.clientX,
    //     clientY: ev.clientY,
    //     top: ev.clientY,
    //     left: ev.clientX,
    //   },
    //   tool
    // );

    LogUtil.Debug("toolDropped->tool", ev, tool);
  }

  // // Saves the library data to the webview
  // function saveLib() {
  //   // Filter out online images and objects from the library
  //   const libImages = toRaw(library.value.images.filter((item) => !item.online));
  //   const libObjects = toRaw(library.value.objLib.filter((item) => !item.online));

  //   // Post a message to the webview with the saved data
  //   window.chrome?.webview?.postMessage({
  //     action: 10, // SAVE_LIBRARY_DATA
  //     data: { ...toRaw(library.value), images: libImages, objLib: libObjects },
  //   });
  // }

  ungroupSelected() {
    if (appStateV2.value.selectedTargets.length < 2) return;
    this.addActionToHistory("Ungroup the selected objects");
    if (appStateV2.value.selectedTargets.length > 0) {
      appStateV2.value.selectedTargets.forEach((el) => {
        const item = appStateV2.value.items.find(
          (i) => `moveable-item-${i.id}` === el.id
        );
        if (item) {
          item.group = undefined;
        }
      });
    }
  }

  groupSelected() {
    if (appStateV2.value.selectedTargets.length < 2) return;
    this.addActionToHistory("Group the selected objects");
    if (appStateV2.value.selectedTargets.length > 0) {
      appStateV2.value.groupCount++;
      appStateV2.value.selectedTargets.forEach((el) => {
        const item = appStateV2.value.items.find(
          (i) => `moveable-item-${i.id}` === el.id
        );
        if (item) {
          item.group = appStateV2.value.groupCount;
        }
      });
    }
  }

  exportToJsonAction() {
    const content = cloneDeep(toRaw(appStateV2.value));
    content.selectedTargets = [];
    content.elementGuidelines = [];

    const a = document.createElement("a");
    const file = new Blob([JSON.stringify(content)], {
      type: "application/json",
    });
    a.href = URL.createObjectURL(file);
    a.download = "HVAC_Drawer_Project.json";
    a.click();
  }

  // Save the gauge settings and update the app state
  gaugeSettingsSave(item) {
    const itemIndex = appStateV2.value.items.findIndex((i) => i.id === item.id);
    appStateV2.value.items[itemIndex] = item;
    gaugeSettingsDialog.value.active = false;
    gaugeSettingsDialog.value.data = {};
  }

  // Open the gauge settings dialog with the provided item data
  gaugeSettingsDialogAction(item) {
    gaugeSettingsDialog.value.active = true;
    gaugeSettingsDialog.value.data = item;
  }

  // Read a file and return its data as a promise
  readFile(file) {
    return new Promise((resolve, reject) => {
      var fr = new FileReader();
      fr.onload = () => {
        resolve(fr.result);
      };
      fr.onerror = reject;
      fr.readAsDataURL(file);
    });
  }


  // Weld selected objects into one shape
  weldSelected() {
    if (appStateV2.value.selectedTargets.length < 2) return;

    const selectedItems1 = appStateV2.value.items.filter((i) =>
      appStateV2.value.selectedTargets.some(
        (ii) => ii.id === `moveable-item-${i.id}`
      )
    );

    if (selectedItems1.some((item) => item.type === "Weld")) {
      this.$q.notify({
        type: "warning",
        message: "Currently not supported!",
      });
      return;
    }

    this.addActionToHistory("Weld selected objects");

    const selectedItems = appStateV2.value.items.filter((i) =>
      appStateV2.value.selectedTargets.some(
        (ii) => ii.id === `moveable-item-${i.id}`
      )
    );

    // Check whether the selected items's type are all General
    const isAllGeneral = selectedItems.every((item) => item.cat === "General");
    const isAllDuct = selectedItems.every((item) => item.type === "Duct");
    // LogUtil.Debug('IndexPage.vue->weldSelected->isAllGeneral,isAllDuct', isAllGeneral, isAllDuct);

    if (isAllGeneral || isAllDuct) {
      this.drawWeldObjectCanvas(selectedItems);
    } else {
      this.drawWeldObject(selectedItems);
    }

    selectedItems.forEach((item) => {
      const index = appStateV2.value.items.findIndex((i) => i.id === item.id);
      if (index !== -1) {
        appStateV2.value.items.splice(index, 1);
      }
    });

    Hvac.IdxPage.refreshMoveable();
  }

  checkIsOverlap(selectedItems) {
    const itemList = [];

    selectedItems.map((item) => {
      const { width, height, translate, rotate } = item;

      // const element = document.querySelector(`#moveable-item-${item.id}`);
      // const elRect = element.getBoundingClientRect();
      // const elInfo = getElementInfo(element);

      const startEl = document.querySelector(
        `#moveable-item-${item.id} .duct-start`
      );
      const endEl = document.querySelector(`#moveable-item-${item.id} .duct-end`);

      const isStartOverlap = this.isDuctOverlap(startEl);
      const isEndOverlap = this.isDuctOverlap(endEl);

      itemList.push({
        id: item.id,
        isStartOverlap: isStartOverlap,
        isEndOverlap: isEndOverlap,
      });
    });

    return itemList;
  }

  isDuctOverlap(partEl) {
    const parentDuct = partEl.closest(".moveable-item.Duct");
    const element1Rect = getElementInfo(partEl);
    const elements = document.querySelectorAll(".moveable-item.Duct");
    for (const el of Array.from(elements)) {
      if (parentDuct.isSameNode(el)) continue;
      const element2Rect = getElementInfo(el);

      const points1 = getDuctPoints(element1Rect);
      const points2 = getDuctPoints(element2Rect);
      const overlapSize = getOverlapSize(points1, points2);
      if (overlapSize > 0) return true;
    }
    return false;
  }

  getDuctPoints(info) {
    const { left, top, pos1, pos2, pos3, pos4 } = info;
    return [pos1, pos2, pos4, pos3].map((pos) => [left + pos[0], top + pos[1]]);
  }

  // Draw weld objects with canvas
  drawWeldObjectCanvas(selectedItems) {
    const scalPercentage = 1 / appStateV2.value.viewportTransform.scale;

    // Calculate the bounding box for the selected items
    const firstX = selectedItems[0].translate[0];
    const firstY = selectedItems[0].translate[1];
    const minX = Math.min(...selectedItems.map((item) => item.translate[0]));
    let minY = Math.min(...selectedItems.map((item) => item.translate[1]));
    const maxX = Math.max(
      ...selectedItems.map((item) => item.translate[0] + item.width)
    );
    const maxY = Math.max(
      ...selectedItems.map((item) => item.translate[1] + item.height)
    );
    let newMinX = firstX < minX ? firstX : minX;

    const boundingBox = selectedItems.reduce(
      (acc, item) => {
        const rad = (item.rotate * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);

        const corners = [
          { x: item.translate[0], y: item.translate[1] },
          {
            x: item.translate[0] + item.width * cos,
            y: item.translate[1] + item.width * sin,
          },
          {
            x: item.translate[0] - item.height * sin,
            y: item.translate[1] + item.height * cos,
          },
          {
            x: item.translate[0] + item.width * cos - item.height * sin,
            y: item.translate[1] + item.width * sin + item.height * cos,
          },
        ];

        corners.forEach((corner) => {
          acc.minX = Math.min(acc.minX, corner.x);
          acc.minY = Math.min(acc.minY, corner.y);
          acc.maxX = Math.max(acc.maxX, corner.x);
          acc.maxY = Math.max(acc.maxY, corner.y);
        });

        return acc;
      },
      { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
    );

    const transX = boundingBox.minX;
    const transY = boundingBox.minY;
    const width = boundingBox.maxX - boundingBox.minX;
    const height = boundingBox.maxY - boundingBox.minY;

    const title = selectedItems.map((item) => item?.type ?? "").join("-");
    let previous = selectedItems[0].zindex;

    selectedItems.forEach((item) => {
      item.zindex = previous - 1;
      previous = item.zindex;
    });

    const isAllDuct = selectedItems.every((item) => item.type === "Duct");

    if (isAllDuct) {
      // Get the new pos for all ducts
      const overlapList = this.checkIsOverlap(selectedItems);

      selectedItems.forEach((item) => {
        const overlapItem = overlapList.find((pos) => pos.id === item.id);
        if (overlapItem) {
          item.overlap = {
            isStartOverlap: overlapItem.isStartOverlap,
            isEndOverlap: overlapItem.isEndOverlap,
          };
        }
      });
    }

    const newWidth = (maxX - minX) * scalPercentage + 8;
    const newHeight = (maxY - minY) * scalPercentage + 8;

    const tempItem = {
      title: `Weld-${title}`,
      active: false,
      cat: "General",
      type: isAllDuct ? "Weld_Duct" : "Weld_General",
      translate: [newMinX, minY],
      width: newWidth,
      height: newHeight,
      // translate: [transX, minY],
      // width: width * scalPercentage,
      // height: height * scalPercentage,
      rotate: 0,
      scaleX: 1,
      scaleY: 1,
      settings: {
        active: false,
        fillColor: "#659dc5",
        fontSize: 16,
        inAlarm: false,
        textColor: "inherit",
        titleColor: "inherit",
      },
      weldItems: cloneDeep(selectedItems),
      zindex: 1,
      t3Entry: null,
      id: appStateV2.value.itemsCount + 1,
    };

    this.addObject(tempItem);
  }


  // Adds a new object to the app state and updates guidelines
  addObject(item, group = undefined, addToHistory = true) {
    if (addToHistory) {
      this.addActionToHistory(`Add ${item?.type ?? ''}`);
    }
    appStateV2.value.itemsCount++;
    item.id = appStateV2.value.itemsCount;
    item.group = group;
    if (!item.settings.titleColor) {
      item.settings.titleColor = "inherit";
    }
    if (!item.settings.bgColor) {
      item.settings.bgColor = "inherit";
    }
    if (!item.settings.textColor) {
      item.settings.textColor = "inherit";
    }
    if (!item.settings.fontSize) {
      item.settings.fontSize = 16;
    }
    appStateV2.value.items.push(item);
    const lines = document.querySelectorAll(".moveable-item");
    appStateV2.value.elementGuidelines = [];
    Array.from(lines).forEach(function (el) {
      appStateV2.value.elementGuidelines.push(el);
    });
    return item;
  }

  drawWeldObject(selectedItems) {
    const scalPercentage = 1 / appStateV2.value.viewportTransform.scale;

    // Calculate the bounding box for the selected items
    const firstX = selectedItems[0].translate[0];
    const firstY = selectedItems[0].translate[1];
    const minX = Math.min(...selectedItems.map((item) => item.translate[0]));
    const minY = Math.min(...selectedItems.map((item) => item.translate[1]));
    const maxX = Math.max(
      ...selectedItems.map((item) => item.translate[0] + item.width)
    );
    const maxY = Math.max(
      ...selectedItems.map((item) => item.translate[1] + item.height)
    );

    const transX = firstX < minX ? firstX : minX;

    const title = selectedItems.map((item) => item?.type ?? "").join("-");

    let previous = selectedItems[0].zindex;
    selectedItems.forEach((item) => {
      item.zindex = previous - 1;
      previous = item.zindex;
    });

    const tempItem = {
      title: `Weld-${title}`,
      active: false,
      type: "Weld",
      translate: [transX, minY],
      width: (maxX - minX) * scalPercentage,
      height: (maxY - minY) * scalPercentage,
      rotate: 0,
      scaleX: 1,
      scaleY: 1,
      settings: {
        active: false,
        fillColor: "#659dc5",
        fontSize: 16,
        inAlarm: false,
        textColor: "inherit",
        titleColor: "inherit",
        weldItems: cloneDeep(selectedItems),
      },
      zindex: 1,
      t3Entry: null,
      id: appStateV2.value.itemsCount + 1,
    };

    this.addObject(tempItem);
  }

  // Delete selected objects from the app state
  deleteSelected() {
    this.addActionToHistory("Remove selected objects");
    if (appStateV2.value.selectedTargets.length > 0) {
      appStateV2.value.selectedTargets.forEach((el) => {
        const iIndex = appStateV2.value.items.findIndex(
          (item) => `moveable-item-${item.id}` === el.id
        );
        if (iIndex !== -1) {
          appStateV2.value.items.splice(iIndex, 1);
        }
      });
      appStateV2.value.selectedTargets = [];
      appStateV2.value.activeItemIndex = null;
    }
  }

  newProject() {
    if (appStateV2.value.items?.length > 0) {
      this.$q.dialog({
        dark: true,
        title: "Do you want to clear the drawing and start over?",
        message: "This will also erase your undo history",
        cancel: true,
        persistent: true,
      })
        .onOk(() => {
          Hvac.IdxPage.newProject();
        })
        .onCancel(() => { });
      return;
    }

    Hvac.IdxPage.newProject();
  }

  insertT3EntryOnSave() {
    this.addActionToHistory("Link object to T3000 entry");
    if (!appStateV2.value.items[appStateV2.value.activeItemIndex].settings.t3EntryDisplayField) {
      if (appStateV2.value.items[appStateV2.value.activeItemIndex].label === undefined) {
        appStateV2.value.items[appStateV2.value.activeItemIndex].settings.t3EntryDisplayField = "description";
      } else {
        appStateV2.value.items[appStateV2.value.activeItemIndex].settings.t3EntryDisplayField = "label";
      }
    }

    appStateV2.value.items[appStateV2.value.activeItemIndex].t3Entry = cloneDeep(
      toRaw(insertT3EntryDialog.value.data)
    )

    // Change the icon based on the linked entry type
    if (appStateV2.value.items[appStateV2.value.activeItemIndex].type === "Icon") {
      let icon = "fa-solid fa-camera-retro";
      if (insertT3EntryDialog.value.data.type === "GRP") {
        icon = "fa-solid fa-camera-retro";
      } else if (insertT3EntryDialog.value.data.type === "SCHEDULE") {
        icon = "schedule";
      } else if (insertT3EntryDialog.value.data.type === "PROGRAM") {
        icon = "fa-solid fa-laptop-code";
      } else if (insertT3EntryDialog.value.data.type === "HOLIDAY") {
        icon = "calendar_month";
      }
      appStateV2.value.items[appStateV2.value.activeItemIndex].settings.icon = icon;
    }
    IdxUtils.refreshObjectStatus(appStateV2.value.items[appStateV2.value.activeItemIndex]);
    insertT3EntryDialog.value.data = null;
    insertT3EntryDialog.value.active = false;
  }


  // Insert Key Function
  insertT3EntrySelect(value) {
    this.addActionToHistory("Insert object to T3000 entry");

    const posIncrease = insertCount.value * 80;

    // Add a shape to graphic area
    const size = { width: 60, height: 60 };
    const pos = { clientX: 300, clientY: 100, top: 100, left: 200 + posIncrease };
    const tempTool = tools.find((item) => item.name === 'Pump');
    const item = this.drawObject(size, pos, tempTool);

    // Set the added shape to active
    const itemIndex = appStateV2.value.items.findIndex((i) => i.id === item.id);
    appStateV2.value.activeItemIndex = itemIndex;

    // Link to T3 entry
    this.insertT3EntryOnSave();

    insertCount.value++;

    // LogUtil.Debug('insertT3EntrySelect item:', appState.value.items[appState.value.activeItemIndex]);
  }

  selectPanelFilterFn(val, update) {
    if (val === "") {
      update(() => {
        selectPanelOptions.value = T3000_Data.value.panelsData;

        // here you have access to "ref" which
        // is the Vue reference of the QSelect
      });
      return;
    }

    update(() => {
      const keyword = val.toUpperCase();
      selectPanelOptions.value = T3000_Data.value.panelsData.filter(
        (item) =>
          item.command.toUpperCase().indexOf(keyword) > -1 ||
          item.description?.toUpperCase().indexOf(keyword) > -1 ||
          item.label?.toUpperCase().indexOf(keyword) > -1
      );
    });
  }

  // Rotate an item by 90 degrees, optionally in the negative direction
  rotate90(item, minues = false) {
    if (!item) return;
    this.addActionToHistory("Rotate object");
    if (!minues) {
      item.rotate = item.rotate + 90;
    } else {
      item.rotate = item.rotate - 90;
    }
    Hvac.IdxPage.refreshMoveable();
  }

  // Flip an item horizontally
  flipH(item) {
    this.addActionToHistory("Flip object H");
    if (item.scaleX === 1) {
      item.scaleX = -1;
    } else {
      item.scaleX = 1;
    }
    Hvac.IdxPage.refreshMoveable();
  }

  // Flip an item vertically
  flipV(item) {
    this.addActionToHistory("Flip object V");
    if (item.scaleY === 1) {
      item.scaleY = -1;
    } else {
      item.scaleY = 1;
    }
    Hvac.IdxPage.refreshMoveable();
  }

  // Bring an item to the front by increasing its z-index
  bringToFront(item) {
    this.addActionToHistory("Bring object to front");
    item.zindex = item.zindex + 1;
  }

  // Send an item to the back by decreasing its z-index
  sendToBack(item) {
    this.addActionToHistory("Send object to back");
    item.zindex = item.zindex - 1;
  }

  // Remove an item from the app state
  removeObject(item) {
    this.addActionToHistory("Remove object");
    const index = appStateV2.value.items.findIndex((i) => i.id === item.id);
    appStateV2.value.activeItemIndex = null;
    appStateV2.value.items.splice(index, 1);

    appStateV2.value.selectedTargets = [];
  }

  // Duplicate an item and select the new copy
  duplicateObject(i) {
    this.addActionToHistory(`Duplicate ${i.type}`);
    appStateV2.value.activeItemIndex = null;
    const item = this.cloneObject(i);
    appStateV2.value.selectedTargets = [];
    setTimeout(() => {
      this.selectObject(item);
    }, 10);
  }

  // Clone an object and adjust its position slightly
  cloneObject(i, group = undefined) {
    const dubItem = cloneDeep(i);
    dubItem.translate[0] = dubItem.translate[0] + 5;
    dubItem.translate[1] = dubItem.translate[1] + 5;
    const item = this.addObject(dubItem, group, false);
    return item;
  }

  // Select an object and update the app state
  selectObject(item) {
    const target = document.querySelector(`#moveable-item-${item.id}`);
    appStateV2.value.selectedTargets = [target];
    appStateV2.value.activeItemIndex = appStateV2.value.items.findIndex(
      (ii) => ii.id === item.id
    );
  }

  // Adds a library item to the app state and updates selection
  addLibItem(items, size, pos) {
    const elements = [];
    const addedItems = [];
    appStateV2.value.groupCount++;
    items.forEach((item) => {
      addedItems.push(this.cloneObject(item, appStateV2.value.groupCount));
    });
    setTimeout(() => {
      addedItems.forEach((addedItem) => {
        const el = document.querySelector(`#moveable-item-${addedItem.id}`);
        elements.push(el);
      });
      appStateV2.value.selectedTargets = elements;
      selecto.value.setSelectedTargets(elements);
      appStateV2.value.activeItemIndex = null;
      const scalPercentage = 1 / appStateV2.value.viewportTransform.scale;
      setTimeout(() => {
        moveable.value.request(
          "draggable",
          {
            x:
              (pos.clientX -
                viewportMargins.left -
                appStateV2.value.viewportTransform.x) *
              scalPercentage -
              size.width * scalPercentage,
            y:
              (pos.clientY -
                viewportMargins.top -
                appStateV2.value.viewportTransform.y) *
              scalPercentage -
              size.height * scalPercentage,
          },
          true
        );
        setTimeout(() => {
          Hvac.IdxPage.refreshMoveable();
        }, 1);
      }, 10);
    }, 10);
  }

  // Starts rotating a group of elements and adds the action to the history
  onRotateGroupStart(e) {
    this.addActionToHistory("Rotate Group");
    e.events.forEach((ev) => {
      const itemIndex = appStateV2.value.items.findIndex(
        (item) => `moveable-item-${item.id}` === ev.target.id
      );
      ev.set(appStateV2.value.items[itemIndex].rotate);
      ev.dragStart && ev.dragStart.set(appStateV2.value.items[itemIndex].translate);
    });
  }

  // Handles rotating of a group of elements and updates their state
  onRotateGroup(e) {
    e.events.forEach((ev, i) => {
      const itemIndex = appStateV2.value.items.findIndex(
        (item) => `moveable-item-${item.id}` === ev.target.id
      );
      appStateV2.value.items[itemIndex].translate = ev.drag.beforeTranslate;
      appStateV2.value.items[itemIndex].rotate = ev.rotate;
    });
  }

  // Handles resizing of a group of elements
  onResizeGroup(e) {
    e.events.forEach((ev, i) => {
      ev.target.style.width = `${ev.width}px`;
      ev.target.style.height = `${ev.height}px`;
      ev.target.style.transform = ev.drag.transform;
    });
  }

  // Ends the resizing of a group of elements and updates the app state
  onResizeGroupEnd(e) {
    e.events.forEach((ev) => {
      const itemIndex = appStateV2.value.items.findIndex(
        (item) => `moveable-item-${item.id}` === ev.lastEvent.target.id
      );
      appStateV2.value.items[itemIndex].width = ev.lastEvent.width;
      appStateV2.value.items[itemIndex].height = ev.lastEvent.height;
      appStateV2.value.items[itemIndex].translate =
        ev.lastEvent.drag.beforeTranslate;
    });
    this.refreshObjects();
    keepRatio.value = false;
  }

  onRotate(e) {
    // e.target.style.transform = e.drag.transform;
    const item = appStateV2.value.items.find(
      (item) => `moveable-item-${item.id}` === e.target.id
    );
    item.rotate = e.rotate;
  }

  onResizeEnd(e) {

    // Fix bug for when double clicking on the selected object, also clicked the resize button accidentally
    if (e.lastEvent === null || e.lastEvent === undefined) {
      return;
    }

    const itemIndex = appStateV2.value.items.findIndex((item) => `moveable-item-${item.id}` === e?.lastEvent?.target?.id);

    appStateV2.value.items[itemIndex].width = e.lastEvent.width;
    appStateV2.value.items[itemIndex].height = e.lastEvent.height;
    appStateV2.value.items[itemIndex].translate = e.lastEvent.drag.beforeTranslate;

    // T3000.Utils.Log('onResizeEnd', `current item:`, appState.value.items[itemIndex], `itemIndex:${itemIndex}`, `width:${e.lastEvent.width}`, `height:${e.lastEvent.height}`, `translate:${e.lastEvent.drag.beforeTranslate}`);
    Hvac.PageMain.UpdateExteriorWallStroke(appStateV2, itemIndex, e.lastEvent.height);

    // Refresh objects after resizing
    this.refreshObjects();
  }

  onResize(e) {
    const item = appStateV2.value.items.find(
      (item) => `moveable-item-${item.id}` === e.target.id
    );
    e.target.style.width = `${e.width}px`;
    e.target.style.height = `${e.height}px`;
    e.target.style.transform = `translate(${e.drag.beforeTranslate[0]}px, ${e.drag.beforeTranslate[1]}px) rotate(${item.rotate}deg) scaleX(${item.scaleX}) scaleY(${item.scaleY})`;
  }

  // Handles dragging of an element
  onDrag(e) {
    const item = appStateV2.value.items.find(
      (item) => `moveable-item-${item.id}` === e.target.id
    );
    // item.translate = e.beforeTranslate;
    e.target.style.transform = e.transform;
  }

  // Ends the dragging of an element
  onDragEnd(e) {
    if (!e.lastEvent) {
      undoHistory.value.shift(); // Remove the last action if dragging was not completed
    } else {
      const item = appStateV2.value.items.find(
        (item) => `moveable-item-${item.id}` === e.target.id
      );
      item.translate = e.lastEvent.beforeTranslate;

      LogUtil.Debug('= IdxPage onDragEnd:', e, item.translate);
      this.save(false, false); // Save the state after drag end
      this.refreshObjects(); // Refresh objects
    }
  }

  // Starts dragging a group of elements
  onDragGroupStart(e) {
    this.addActionToHistory("Move Group");
    e.events.forEach((ev, i) => {
      const itemIndex = appStateV2.value.items.findIndex(
        (item) => `moveable-item-${item.id}` === ev.target.id
      );
      ev.set(appStateV2.value.items[itemIndex].translate);
    });
  }

  // Handles dragging of a group of elements
  onDragGroup(e) {
    e.events.forEach((ev, i) => {
      const itemIndex = appStateV2.value.items.findIndex(
        (item) => `moveable-item-${item.id}` === ev.target.id
      );
      appStateV2.value.items[itemIndex].translate = ev.beforeTranslate;
    });
  }

  // Ends the dragging of a group of elements
  onDragGroupEnd(e) {
    if (!e.lastEvent) {
      undoHistory.value.shift(); // Remove the last action if dragging was not completed
    } else {
      this.refreshObjects(); // Refresh objects
    }
  }

  // Handles the start of a selecto drag event
  onSelectoDragStart(e) {
    // T3000Util.HvacLog('1 onSelectoDragStart', "e=", e, "target=", e.inputEvent.target);
    const target = e.inputEvent.target;
    if (
      moveable.value.isMoveableElement(target) ||
      appStateV2.value.selectedTargets.some(
        (t) => t === target || t.contains(target)
      )
    ) {
      e.stop();
    }
  }

  // Handles the end of a selecto select event
  onSelectoSelectEnd(e) {
    // T3000Util.HvacLog('3 onSelectoSelectEnd 1', e, e.isDragStart);
    appStateV2.value.selectedTargets = e.selected;
    if (e?.selected && !e?.inputEvent?.ctrlKey) {
      const selectedItems = appStateV2.value.items.filter((i) =>
        e.selected.some((ii) => ii.id === `moveable-item-${i.id}`)
      );
      const selectedGroups = [
        ...new Set(
          selectedItems.filter((iii) => iii.group).map((iiii) => iiii.group)
        ),
      ];
      selectedGroups.forEach((gId) => {
        this.selectGroup(gId);
      });
    }

    if (appStateV2.value.selectedTargets.length === 1) {
      appStateV2.value.activeItemIndex = appStateV2.value.items.findIndex(
        (item) =>
          `moveable-item-${item.id}` === appStateV2.value.selectedTargets[0].id
      );
    } else {
      appStateV2.value.activeItemIndex = null;
    }

    if (e.isDragStart) {
      e.inputEvent.preventDefault();

      setTimeout(() => {
        moveable.value.dragStart(e.inputEvent);
      });
    }

    if (appStateV2.value.selectedTargets.length > 1 && !locked.value) {
      setTimeout(() => {
        contextMenuShow.value = true;
      }, 100);
    } else {
      contextMenuShow.value = false;
    }

    IdxUtils.refreshMoveableGuides(); // Refresh the moveable guidelines after selection

    setTimeout(() => {
      Hvac.PageMain.SetWallDimensionsVisible("select", isDrawing.value, appStateV2, null);
    }, 100);
  }

  // Selects a group of elements by their group ID
  selectGroup(id) {
    const targets = [];
    appStateV2.value.items
      .filter(
        (i) =>
          i.group === id &&
          !appStateV2.value.selectedTargets.some(
            (ii) => ii.id === `moveable-item-${i.id}`
          )
      )
      .forEach((iii) => {
        const target = document.querySelector(`#moveable-item-${iii.id}`);
        targets.push(target);
      });

    appStateV2.value.selectedTargets =
      appStateV2.value.selectedTargets.concat(targets);
    selecto.value.setSelectedTargets(appStateV2.value.selectedTargets);
  }

  // Starts resizing an element
  onResizeStart(e) {
    this.addActionToHistory("Resize object");
    const itemIndex = appStateV2.value.items.findIndex(
      (item) => `moveable-item-${item.id}` === e.target.id
    );
    e.setOrigin(["%", "%"]);
    e.dragStart && e.dragStart.set(appStateV2.value.items[itemIndex].translate);
  }

  // Adds an action to the history for undo/redo functionality
  addActionToHistory(title) {
    if (process.env.DEV) {
      // LogUtil.Debug(title); // Log the action title in development mode
    }
    if (title !== "Move Object") {
      setTimeout(() => {
        LogUtil.Debug("= IdxPage addActionToHistory", title);
        this.save(false, false); // Save the current state
        this.refreshObjects(); // Refresh objects
      }, 200);
    }

    redoHistory.value = []; // Clear redo history
    undoHistory.value.unshift({
      title,
      state: cloneDeep(appStateV2.value),
    });

    // Maintain a maximum of 20 actions in the undo history
    if (undoHistory.value.length > 20) {
      undoHistory.value.pop();
    }
  }

  viewportMouseMoved(e) {
    // Move object icon with mouse
    cursorIconPos.value.x = e.clientX - viewportMargins.left;
    cursorIconPos.value.y = e.clientY - viewportMargins.top;

    // LogUtil.Debug('Viewport mouse moved cursorIconPos:', "mouse",

    const scalPercentage = 1 / appStateV2.value.viewportTransform.scale;

    // process drawing ducts
    if (
      isDrawing.value &&
      continuesObjectTypes.includes(selectedTool.value.name) &&
      appStateV2.value.activeItemIndex !== null
    ) {
      // Check if the Ctrl key is pressed
      const isCtrlPressed = e.ctrlKey;
      // Calculate the distance and angle between the initial point and mouse cursor
      const mouseX = (e.clientX - viewportMargins.left - appStateV2.value.viewportTransform.x) * scalPercentage;
      const mouseY = (e.clientY - viewportMargins.top - appStateV2.value.viewportTransform.y) * scalPercentage;
      const dx = mouseX - startTransform.value[0];
      const dy = mouseY - startTransform.value[1];
      let angle = Math.atan2(dy, dx) * (180 / Math.PI);

      // Rotate in 5-degree increments when Ctrl is held
      if (isCtrlPressed) {
        angle = Math.round(angle / 5) * 5;
      }

      // const distance = Math.sqrt(dx * dx + dy * dy) + selectedTool.value.height;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // LogUtil.Debug('Viewport mouse moved:', e, 'angle:', angle, 'distance:', distance);

      // Set the scale and rotation of the drawing line
      appStateV2.value.items[appStateV2.value.activeItemIndex].rotate = angle;
      appStateV2.value.items[appStateV2.value.activeItemIndex].width = distance;
      this.refreshObjects();
    }
  }

  refreshObjects() {
    if (!objectsRef.value) return;
    for (const obj of objectsRef.value) {
      if (!obj.refresh) continue;
      obj.refresh();
    }
  }

  showMoreDevices() {

    // clear the dirty selection data
    Hvac.DeviceOpt.clearDirtyCurrentDevice();

    deviceModel.value.active = true;

    // clear the shape selection
    appStateV2.value.selectedTarget = [];
    appStateV2.value.selectedTargets = [];
    appStateV2.value.activeItemIndex = null;

    // refresh the graphic panel data
    Hvac.DeviceOpt.refreshGraphicPanelElementCount(deviceModel.value.data);
  }

  updateDeviceModel(isActive, data) {
    LogUtil.Debug('= Idx updateDeviceModel ===', isActive, data)
    deviceModel.value.active = isActive;
    deviceModel.value.data = data;

  }
}

export default IdxPage2;
