import Hvac from "../../Hvac";
import IdxUtils from "./IdxUtils";
import {
  globalNav, user, emptyLib, library, appState, rulersGridVisible, isBuiltInEdge, documentAreaPosition, savedNotify,
  viewportMargins, viewport, locked, deviceModel, T3_Types, emptyProject, undoHistory, redoHistory, moveable, deviceAppState,
  globalMsg, grpNav, T3000_Data
} from "../../Data/T3Data"
import { cloneDeep } from "lodash";
import { toRaw } from "vue";
import { liveApi } from "src/lib/api";
import DataOpt from "../Data/DataOpt";
import T3Util from "../../Util/T3Util";
import AntdUtil from "../UI/AntdUtil";

import {
  isDrawing, selectedTool, lastAction, clipboardFull, topContextToggleVisible, showSettingMenu, toggleModeValue, toggleValueValue, toggleValueDisable,
  toggleValueShow, toggleNumberDisable, toggleNumberShow, toggleNumberValue, gaugeSettingsDialog
} from "../../Data/Constant/RefConstant";
import { tools, /*T3_Types,*/ /*getObjectActiveValue,*/ /*T3000_Data,*/ /*user, globalNav,*/ demoDeviceData } from "../../../../common";

class IdxPage2 {

  private webview = (window as any).chrome?.webview;

  // Access Quasar framework instance
  public $q: any;
  public getPanelsInterval: any;
  public autoSaveInterval: any;

  initPage() {
    Hvac.WebClient.initMessageHandler();
    this.initGlobalNav();
    this.isLoggedIn();
    this.restoreAppState();
    //  this.setDocMarginOffset();
    //  this.initPanzoom();
    this.initMessageClient();
    //  this.initScorller();
    this.initAutoSaveInterval();
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
      appState.value = localState;
      // rulersGridVisible.value = appState.value.rulersGridVisible;
    }
  }

  // Checks if the user is logged in
  isLoggedIn() {
    // const $q = useQuasar();
    // T3Util.Log("= Idx $q:", $q);

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
        T3Util.Log(err);
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
        T3Util.Log(err);
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
    T3Util.Log('5555555 IndexPage2.vue->autoManualToggle->item, locked value', item);

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

    T3Util.Log('= Idx T3UpdateEntryField to T3 before, after', tempFieldBefore, fieldVal);
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

        T3Util.Log('= IdxPage load from local storage', currentDevice);

        // load device appstate
        //Hvac.DeviceOpt.refreshDeviceAppState();
        Hvac.WsClient.GetInitialData(currentDevice.deviceId, currentDevice.graphic, true);

        // T3Util.Log('=== indexPage.currentDevice load from local storage', currentDevice);
        // T3Util.Log('=== indexPage.deviceModel changed', deviceModel.value);
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
    T3Util.Log('= Idx2 save to local storage', new Date().toLocaleString());
    savedNotify.value = notify;
    this.saveToLocal();

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
        T3Util.Log('= Idx save to T3000 with initial data status error, cancel auto save');
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
        T3Util.Log('= Idx save to T3000 current device is null');
      }
    }
  }

  initAutoSaveInterval() {
    // do not trigger the auto save for the first time, cause there may have some other operations to load the initial data
    // from T3000, and the auto save will overwrite the graphic data if it will take a long time to load the initial data
    setTimeout(() => {
      this.autoSaveInterval = setInterval(() => {
        T3Util.Log('= Idx auto save every 30s', new Date().toLocaleString());
        this.save(true, true);
      }, 30000);
    }, 10000);
  }

  prepareSaveData() {
    const data = cloneDeep(toRaw(appState.value));

    // Recalculate the items count
    data.itemsCount = data.items.filter(item => item.width !== 0).length;

    data.selectedTargets = [];
    data.elementGuidelines = [];
    data.rulersGridVisible = rulersGridVisible.value;

    return data;
  }

  // Update a T3 entry field for an object
  T3UpdateEntryField(key, obj) {
    T3Util.Log('idx page 2  T3UpdateEntryField appState before', appState.value);
    // T3Util.Log('IndexPage.vue T3UpdateEntryField key=', key, 'obj=', obj);
    // T3Util.Log('IndexPage.vue T3UpdateEntryField appState after', appState.value);
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

    T3Util.Log('= Idx T3UpdateEntryField to T3 before, after', tempFieldBefore, fieldVal);
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
    if (appState.value.selectedTargets.length < 1 || locked.value) return;
    const selectedItems = appState.value.items.filter((i) =>
      appState.value.selectedTargets.some(
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
    // T3Util.Log('IndexPage.vue->viewportLeftClick->ev', ev);
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
    T3Util.Log("= IdxPage selectTool", tool, type);
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
      undoAction();
      setTimeout(() => {
        refreshObjects();
      }, 10);

      //clear empty drawing object
      Hvac.PageMain.ClearItemsWithZeroWidth(appState);
      Hvac.PageMain.SetWallDimensionsVisible("all", isDrawing.value, appState, false);
    }
  }

  // Undo the last action
  undoAction() {
    if (undoHistory.value.length < 1) return;
    redoHistory.value.unshift({
      title: lastAction,
      state: cloneDeep(appState.value),
    });
    appState.value = cloneDeep(undoHistory.value[0].state);
    undoHistory.value.shift();
    Hvac.IdxPage.refreshMoveable();
  }

  redoAction() {
    if (redoHistory.value.length < 1) return;
    undoHistory.value.unshift({
      title: lastAction,
      state: cloneDeep(appState.value),
    });
    appState.value = cloneDeep(redoHistory.value[0].state);
    redoHistory.value.shift();
    Hvac.IdxPage.refreshMoveable();
  }

  // Not used in new UI anymore, just for backup
  updateWeldModelCanvas(weldModel, pathItemList) {
    appState.value.items.map((item) => {
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
          // T3Util.Log('IndexPage.vue->updateWeldModelCanvas->pathItem', pathItem);
          // T3Util.Log('IndexPage.vue->updateWeldModelCanvas->weldItem', weldModel.width, weldModel.height);
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
    appState.value.items.map((item) => {
      if (item.type === "Weld" && item.id === weldModel.id) {
        item.settings.weldItems = itemList;
      }
    });
  }

  toggleRulersGrid(val) {
    rulersGridVisible.value = val === "Enable" ? true : false;
    appState.value.rulersGridVisible = rulersGridVisible.value;
    this.save(false, false);
  }

  convertObjectType(item, type) {
    if (!item) {
      item = appState.value.items[appState.value.activeItemIndex];
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
    addActionToHistory("Paste");
    const elements = [];
    const addedItems = [];
    items.forEach((item) => {
      addedItems.push(cloneObject(item));
    });
    setTimeout(() => {
      addedItems.forEach((addedItem) => {
        const el = document.querySelector(`#moveable-item-${addedItem.id}`);
        elements.push(el);
      });
      appState.value.selectedTargets = elements;
      selecto.value.setSelectedTargets(elements);
      appState.value.activeItemIndex = null;
    }, 10);
  }

  saveSelectedToClipboard() {
    if (locked.value) return;
    if (appState.value.selectedTargets.length === 0) return;
    const selectedItems = appState.value.items.filter((i) =>
      appState.value.selectedTargets.some(
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
    addActionToHistory("Send selected objects to back");
    const selectedItems = appState.value.items.filter((i) =>
      appState.value.selectedTargets.some(
        (ii) => ii.id === `moveable-item-${i.id}`
      )
    );
    selectedItems.forEach((item) => {
      item.zindex = item.zindex - 1;
    });
  }

  // Bring selected objects to the front by increasing their z-index
  bringSelectedToFront() {
    addActionToHistory("Bring selected objects to front");
    const selectedItems = appState.value.items.filter((i) =>
      appState.value.selectedTargets.some(
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

    if (appState.value.selectedTargets.length < 1 || locked.value) return;
    const selectedItems = appState.value.items.filter((i) =>
      appState.value.selectedTargets.some(
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

    if (appState.value.selectedTargets.length > 1) {
      topContextToggleVisible.value = false;
      toggleValueShow.value = false;
      toggleNumberShow.value = false;

    } else {
      if (appState.value.selectedTargets.length === 1) {
        const selectedItem = appState.value.items.find(
          (item) => `moveable-item-${item.id}` === appState.value.selectedTargets[0].id
        )

        if (selectedItem.t3Entry !== null) {
          topContextToggleVisible.value = true;
          ObjectRightClicked(selectedItem, null);
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
    // T3Util.Log('toggleClicked->item,type', item, type, ev);
    // T3Util.Log('toggleClicked->toggleModeValue,toggleValueValue',
    //   toggleModeValue.value, toggleValueValue.value);
    // T3Util.Log('toggleClicked->before item', item.t3Entry)

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
      T3UpdateEntryField("auto_manual", item);
    }

    if (type == "value") {
      item.t3Entry.control = toggleValueValue.value === "Off" ? 0 : 1;
      T3UpdateEntryField("control", item);
    }

    if (type === "number-value") {
      item.t3Entry.value = toggleNumberValue.value * 1;// * 1000;
      T3UpdateEntryField("value", item);
    }

    save(false, true);

    // T3Util.Log('toggleClicked->after item', item.t3Entry)
  }

  ObjectRightClicked(item, ev) {
    // ev.preventDefault();

    // T3Util.Log('ObjectRightClicked->appState.selectedTargets', appState.value.selectedTargets[0]);
    // T3Util.Log('ObjectRightClicked->ev,item', item);

    if (item.t3Entry !== null) {

      showSettingMenu.value = true;

      // T3Util.Log('ObjectRightClicked->item.t3Entry', item.t3Entry);

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
    // T3Util.Log('2222222222 IndexPage.vue->changeEntryValue->refItem,newVal,control', refItem, newVal, control);
    const key = control ? "control" : "value";
    const item = appState.value.items.find((i) => i.id === refItem.id);
    item.t3Entry[key] = newVal;
    T3UpdateEntryField(key, item);
  }

  // Toggles the auto/manual mode of an item
  autoManualToggle(item) {
    T3Util.Log('5555555 IndexPage.vue->autoManualToggle->item, locked value', item);

    // if (!locked.value) return;
    item.t3Entry.auto_manual = item.t3Entry.auto_manual ? 0 : 1;
    T3UpdateEntryField("auto_manual", item);
  }

  // Handle object click events based on t3Entry type
  objectClicked(item) {

    T3Util.Log("= P.IDX2 objectClicked");
    setTheSettingContextMenuVisible();

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
      T3UpdateEntryField("control", item);
    }
  }

  // Toggle the lock state of the application
  lockToggle() {
    appState.value.activeItemIndex = null;
    appState.value.selectedTargets = [];
    locked.value = !locked.value;
    if (locked.value) {
      selectTool("Pointer");
    }

    // Update the document area position based on the lock state
    IdxPage.restDocumentAreaPosition();
  }

  // Create a label for an entry with optional prefix
  entryLabel(option) {
    // T3Util.Log('entryLabel - ', option);
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
    if (appState.value.selectedTargets.length < 1) return;
    addActionToHistory("Duplicate the selected objects");
    const elements = [];
    const dupGroups = {};
    appState.value.selectedTargets.forEach((el) => {
      const item = appState.value.items.find(
        (i) => `moveable-item-${i.id}` === el.id
      );
      if (item) {
        let group = undefined;
        if (item.group) {
          if (!dupGroups[`${item.group}`]) {
            appState.value.groupCount++;
            dupGroups[`${item.group}`] = appState.value.groupCount;
          }

          group = dupGroups[`${item.group}`];
        }
        const dupItem = cloneObject(item, group);
        setTimeout(() => {
          const dupElement = document.querySelector(
            `#moveable-item-${dupItem.id}`
          );
          elements.push(dupElement);
        }, 10);
      }
    });
    setTimeout(() => {
      appState.value.selectedTargets = elements;
      selecto.value.setSelectedTargets(elements);
      appState.value.activeItemIndex = null;
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

    if (appState.value.items?.length > 0) {
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
          appState.value = importedState;
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
    appState.value = importedState;
    importJsonDialog.value.data = null;
    setTimeout(() => {
      IdxUtils.refreshMoveableGuides();
    }, 100);
    Hvac.IdxPage.refreshMoveable();
  }

  // Save an image to the library or online storage
  async saveLibImage(file) {
    if (user.value) {

      T3Util.Log('= Idx saveLibImage file', file);
      T3Util.Log('= Idx saveLibImage user', user.value);

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
          addOnlineLibImage(oItem);
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
      fileData: await readFile(file.data),
    };

    if (isBuiltInEdge.value) {
      Hvac.WebClient.SaveImage(message);
    }
    else {
      Hvac.WsClient.SaveImage(message);
    }

    // window.chrome?.webview?.postMessage(message);
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

    T3Util.Log("toolDropped->tool", ev, tool);
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
    if (appState.value.selectedTargets.length < 2) return;
    addActionToHistory("Ungroup the selected objects");
    if (appState.value.selectedTargets.length > 0) {
      appState.value.selectedTargets.forEach((el) => {
        const item = appState.value.items.find(
          (i) => `moveable-item-${i.id}` === el.id
        );
        if (item) {
          item.group = undefined;
        }
      });
    }
  }

  groupSelected() {
    if (appState.value.selectedTargets.length < 2) return;
    addActionToHistory("Group the selected objects");
    if (appState.value.selectedTargets.length > 0) {
      appState.value.groupCount++;
      appState.value.selectedTargets.forEach((el) => {
        const item = appState.value.items.find(
          (i) => `moveable-item-${i.id}` === el.id
        );
        if (item) {
          item.group = appState.value.groupCount;
        }
      });
    }
  }

  exportToJsonAction() {
    const content = cloneDeep(toRaw(appState.value));
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
    const itemIndex = appState.value.items.findIndex((i) => i.id === item.id);
    appState.value.items[itemIndex] = item;
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
    if (appState.value.selectedTargets.length < 2) return;

    const selectedItems1 = appState.value.items.filter((i) =>
      appState.value.selectedTargets.some(
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

    addActionToHistory("Weld selected objects");

    const selectedItems = appState.value.items.filter((i) =>
      appState.value.selectedTargets.some(
        (ii) => ii.id === `moveable-item-${i.id}`
      )
    );

    // Check whether the selected items's type are all General
    const isAllGeneral = selectedItems.every((item) => item.cat === "General");
    const isAllDuct = selectedItems.every((item) => item.type === "Duct");
    // T3Util.Log('IndexPage.vue->weldSelected->isAllGeneral,isAllDuct', isAllGeneral, isAllDuct);

    if (isAllGeneral || isAllDuct) {
      drawWeldObjectCanvas(selectedItems);
    } else {
      drawWeldObject(selectedItems);
    }

    selectedItems.forEach((item) => {
      const index = appState.value.items.findIndex((i) => i.id === item.id);
      if (index !== -1) {
        appState.value.items.splice(index, 1);
      }
    });

    Hvac.IdxPage.refreshMoveable();
  }


}

export default IdxPage2;
