import Hvac from "../../Hvac";
import IdxUtils from "./IdxUtils";
import {
  globalNav, user, emptyLib, library, appState, rulersGridVisible, isBuiltInEdge, documentAreaPosition, savedNotify,
  viewportMargins, viewport, locked, deviceModel, T3_Types, emptyProject, undoHistory, redoHistory, moveable, deviceAppState,
  globalMsg, loadSettings
} from "../../Data/T3Data"
import { cloneDeep } from "lodash";
import { toRaw } from "vue";
import { liveApi } from "src/lib/api";
import DataOpt from "../Data/DataOpt";
import T3Util from "../../Util/T3Util";

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
    // console.log("= Idx $q:", $q);

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
        console.log(err);
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
        console.log(err);
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
    console.log('5555555 IndexPage2.vue->autoManualToggle->item, locked value', item);

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

    console.log('= Idx T3UpdateEntryField to T3 before, after', tempFieldBefore, fieldVal);
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

        console.log('= IdxPage load from local storage', currentDevice);

        // load device appstate
        //Hvac.DeviceOpt.refreshDeviceAppState();
        Hvac.WsClient.GetInitialData(currentDevice.deviceId, currentDevice.graphic, true);

        // console.log('=== indexPage.currentDevice load from local storage', currentDevice);
        // console.log('=== indexPage.deviceModel changed', deviceModel.value);
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
        console.log('= Idx save to T3000 with initial data status error, cancel auto save');
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
        console.log('= Idx save to T3000 current device is null');
      }
    }
  }

  initAutoSaveInterval() {
    // do not trigger the auto save for the first time, cause there may have some other operations to load the initial data
    // from T3000, and the auto save will overwrite the graphic data if it will take a long time to load the initial data
    setTimeout(() => {
      this.autoSaveInterval = setInterval(() => {
        console.log('= Idx auto save every 30s', new Date().toLocaleString());
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
    console.log('idx page 2  T3UpdateEntryField appState before', appState.value);
    // console.log('IndexPage.vue T3UpdateEntryField key=', key, 'obj=', obj);
    // console.log('IndexPage.vue T3UpdateEntryField appState after', appState.value);
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

    console.log('= Idx T3UpdateEntryField to T3 before, after', tempFieldBefore, fieldVal);
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
}

export default IdxPage2;
