
// Migrate code from HvacDrawer/IndexPage to IdxPage

import {
  globalNav, user, emptyLib, library, appState, rulersGridVisible, isBuiltInEdge, documentAreaPosition, savedNotify,
  viewportMargins, viewport, locked, deviceModel, T3_Types, emptyProject, undoHistory, redoHistory, moveable, deviceAppState,
  globalMsg, loadSettings
} from "../Data/T3Data"
import { liveApi } from '../../../api'
import { useQuasar, useMeta } from "quasar"
import panzoom from "panzoom"
import { computed, triggerRef, toRaw, ref } from "vue"
import Hvac from "../Hvac"
import IdxUtils from "./IdxUtils"
import { cloneDeep } from "lodash"
import T3Utils from "../Util/T3Utils"
import { init } from "echarts"

let panzoomInstance = null;

class IdxPage {

  private webview = (window as any).chrome?.webview;
  public zoom: any;
  public getPanelsInterval: any;
  public autoSaveInterval: any;

  // Access Quasar framework instance
  public $q: any;

  constructor() {
    this.initZoom();
  }

  // wrap code for IndexPage's onMounted event
  initPage() {
    Hvac.WebClient.initMessageHandler();
    this.initGlobalNav();
    this.isLoggedIn();
    this.restoreAppState();
    this.setDocMarginOffset();
    this.initPanzoom();
    this.initMessageClient();
    this.initScorller();
    this.initAutoSaveInterval();
    this.initWindowListener();
    this.refreshMoveableGuides();
    this.resetPanzoom();
  }

  initPage5() {
    Hvac.WebClient.initMessageHandler();
    this.initGlobalNav();
    this.isLoggedIn();
    this.restoreAppState();
    this.setDocMarginOffset();
    // this.initPanzoom();
    this.initMessageClient();
    // this.initScorller();
    this.initAutoSaveInterval();
    this.initWindowListener5();
    this.refreshMoveableGuides();
    // this.resetPanzoom();

    Hvac.UI.Initialize(); // Initialize the HVAC UI
  }

  initQuasar(quasar) {
    this.$q = quasar;
    Hvac.WebClient.initQuasar(this.$q);
    Hvac.T3Utils.initQuasar(this.$q);
  }

  // Control zoom actions for the app
  zoomAction(action: string = "in", val: number = null) {
    if (action === "out") {
      this.zoom.value -= 10;
    } else if (action === "set") {
      this.zoom.value = val;
    } else {
      this.zoom.value += 10;
    }

    console.log('= Idx zoomAction', this.zoom.value);
  }

  initWindowListener() {
    // Save the state before the window is unloaded
    window.addEventListener("beforeunload", function (event) {
      // save(true, true);
      Hvac.IdxPage.clearAutoSaveInterval();
      Hvac.WsClient.clearInitialDataInterval();
    });

    window.addEventListener("resize", () => {
      IdxPage.restDocumentAreaPosition(null);
      // console.log('= Idx window resize', documentAreaPosition.value);
    });
  }

  initWindowListener5() {
    // Save the state before the window is unloaded
    window.addEventListener("beforeunload", function (event) {
      // save(true, true);
      Hvac.IdxPage.clearAutoSaveInterval();
      Hvac.WsClient.clearInitialDataInterval();
    });

    window.addEventListener("resize", () => {
      // IdxPage.restDocumentAreaPosition(null);
      // console.log('= Idx window resize', documentAreaPosition.value);
    });
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

    const localState = Hvac.LSUtils.loadParsedAppStateLS();
    if (localState) {
      appState.value = localState;
      rulersGridVisible.value = appState.value.rulersGridVisible;
    }
  }

  setDocMarginOffset() {
    if (this.webview) {
      isBuiltInEdge.value = true;
      documentAreaPosition.value.widthOffset = '128px';
      documentAreaPosition.value.heightOffset = '68px';

      viewportMargins.top = 56;
    }
    else {
      isBuiltInEdge.value = false;
      viewportMargins.top = 95 + 20 + 2;
    }
  }

  // Initialize panzoom for viewport
  initPanzoom() {
    const beforeWheel = function (e) {
      // Allow panzoom to handle the wheel event
      return false;
    }

    const options = {
      maxZoom: 4,
      minZoom: 0.1,
      zoomDoubleClickSpeed: 1,
      filterKey: function (/* e, dx, dy, dz */) {
        // don't let panzoom handle this event:
        return true;
      },
      beforeMouseDown: function (e) {
        // allow mouse-down panning only if altKey is down. Otherwise - ignore
        var shouldIgnore = !e.altKey;
        return shouldIgnore;
      },
      // Add the focal point for zooming to be the center of the viewport
      beforeWheel: beforeWheel,
    }

    panzoomInstance = panzoom(viewport.value, options);

    // Update the viewport transform on panzoom transform event
    panzoomInstance.on("transform", function (e) {
      appState.value.viewportTransform = e.getTransform();

      triggerRef(appState);

      IdxPage.restDocumentAreaPosition(e.getTransform());
      Hvac.T3Utils.setLocalSettings('transform', e.getTransform());
    });
  }

  resetPanzoom() {
    const transform = Hvac.T3Utils.getLocalSettings('transform');

    if (transform) {
      // panzoomInstance.zoomAbs(transform.x, transform.y, transform.scale);
      // panzoomInstance.moveTo(transform.x, transform.y);
    }
  }

  // Computed property for zoom control
  initZoom() {
    this.zoom = computed({
      // Getter for zoom value
      get() {
        const zoomVal = parseInt(appState.value.viewportTransform.scale * 100 + "");
        return zoomVal;
      },
      // Setter for zoom value
      set(newValue) {
        if (!newValue) return;

        const scale = newValue / 100;
        const x = appState.value.viewportTransform.x;
        const y = appState.value.viewportTransform.y;

        appState.value.viewportTransform.scale = scale;
        panzoomInstance.zoomAbs(x, y, scale);
      },
    });
  }

  static restDocumentAreaPosition(pzXY) {
    const div = document.querySelector('.full-area');
    documentAreaPosition.value.workAreaPadding = locked.value ? "0px" : "110px";
    documentAreaPosition.value.hRulerWOffset = locked.value ? "24px" : "128px";
    documentAreaPosition.value.wpwWOffset = locked.value ? "24px" : "128px";
    documentAreaPosition.value.wpWOffset = locked.value ? "26px" : "136px";
    documentAreaPosition.value.hRuler = { width: div.clientWidth, height: 20 };
    documentAreaPosition.value.vRuler = { width: 20, height: div.clientHeight };
    documentAreaPosition.value.hvGrid = { width: div.clientWidth, height: div.clientHeight };
    documentAreaPosition.value.wiewPortWH = { width: "calc(100vw - v-bind('documentAreaPosition.wpWOffset'))", height: "calc(100vh - 93px)" };
    documentAreaPosition.value.widthOffset = locked.value ? "24px" : "128px";

    if (isBuiltInEdge.value) {
      documentAreaPosition.value.heightOffset = locked.value ? "68px" : "68px";
    }
    else {
      documentAreaPosition.value.heightOffset = locked.value ? "115px" : "115px";
    }
  }

  // Refresh moveable guides after a short delay
  refreshMoveableGuides() {
    setTimeout(() => {
      IdxUtils.refreshMoveableGuides();
    }, 100);
  }

  handleScroll(event) {
    // Reset the h,v ruler's width for scrolling
    documentAreaPosition.value.vRuler.height += event.target.scrollTop;
    documentAreaPosition.value.hRuler.width += event.target.scrollLeft;

    // documentAreaPosition.value.wiewPortWH.width = documentAreaPosition.value.hRuler.width + "px";
    // documentAreaPosition.value.wiewPortWH.height = documentAreaPosition.value.vRuler.height + "px";

    // wiewPortWH= { width: "calc(100vw - v-bind('documentAreaPosition.wpWOffset'))", height: "calc(100vh - 68px)" };

    document.querySelector('.v-ruler').scroll(0, event.target.scrollTop);
    document.querySelector('.h-ruler').scroll(event.target.scrollLeft, 0);
  }

  initScorller() {
    // Viewport wrapper scroll event listener
    const div = document.querySelector('.viewport-wrapper');
    div.addEventListener('scroll', this.handleScroll);

    // Init ruler and grid default value
    documentAreaPosition.value.hRuler = { width: div.clientWidth, height: 20 };
    documentAreaPosition.value.vRuler = { width: 20, height: div.clientHeight };
    documentAreaPosition.value.hvGrid = { width: div.clientWidth, height: div.clientHeight };
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

  clearGetPanelsInterval() {
    if (this.getPanelsInterval) {
      clearInterval(this.getPanelsInterval);
    }
  }

  clearIdx() {
    appState.value.selectedTargets = [];

    if (panzoomInstance?.dispose) return;
    panzoomInstance?.dispose();
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

  // Update a T3 entry field for an object
  T3UpdateEntryField(key, obj) {
    // console.log('IndexPage.vue T3UpdateEntryField appState before', appState.value);
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

  // Clear ls appState and deviceAppState and tempAppState
  newProject() {
    if (isBuiltInEdge.value) {
      appState.value = cloneDeep(emptyProject);
      undoHistory.value = [];
      redoHistory.value = [];
      this.refreshMoveable();

      /*
      if (!window.chrome?.webview?.postMessage) {
        localStorage.removeItem("appState");
      }
      */

      if (!this.webview?.postMessage) {
        localStorage.removeItem("appState");
      }
    }
    else {
      appState.value = cloneDeep(emptyProject);
      undoHistory.value = [];
      redoHistory.value = [];
      this.refreshMoveable();

      // set ls appState to empty
      localStorage.setItem("appState", JSON.stringify(appState.value));

      // set ls deviceAppState's current appState to empty
      const currentDevice = Hvac.DeviceOpt.getCurrentDevice();
      const deviceAppState = Hvac.LSUtils.loadDeviceAppStateLS();

      if (currentDevice) {
        const deviceState = deviceAppState.find(
          (state) =>
            state.device.device === currentDevice.device &&
            state.device.graphic === currentDevice.graphic
        );

        if (deviceState) {
          deviceState.appState = cloneDeep(emptyProject);
          localStorage.setItem("deviceAppState", JSON.stringify(deviceAppState));
        }
      }

      // set ls tempAppState to empty
      localStorage.setItem("tempAppState", JSON.stringify(appState.value));

      // clear current device's element count
      currentDevice.graphicFull.elementCount = 0;
      localStorage.setItem("currentDevice", JSON.stringify(currentDevice));
    }
  }

  // Refresh the moveable object's rectangle after a short delay
  refreshMoveable() {
    // const targetsCache = cloneDeep(appState.value.selectedTargets);
    // appState.value.selectedTargets = [];
    setTimeout(() => {
      moveable.value.updateRect();
    }, 1);
  }

  // Wrap a new function for saving data to localstorage and T3000
  save(notify: boolean = false, saveToT3: boolean = false) {
    savedNotify.value = notify;
    this.saveToLocal();

    if (saveToT3) {
      this.saveToT3000();
    }
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

  // Save the current app state to localstorage, optionally displaying a notification
  saveToLocal() {
    // Prepare data
    const data = this.prepareSaveData();

    Hvac.LSUtils.saveAppState(data);

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

  clearAutoSaveInterval() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }
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

export default IdxPage
