
// Migrate code from HvacDrawer/IndexPage to IdxPage

import {
  globalNav, user, emptyLib, library, appState, rulersGridVisible, isBuiltInEdge, documentAreaPosition,
  viewportMargins, viewport, locked, deviceModel, T3_Types
} from "../Data/T3Data"
import { liveApi } from '../../../api'
import { useQuasar, useMeta } from "quasar"
import panzoom from "panzoom"
import { computed, triggerRef, toRaw } from "vue"
import Hvac from "../Hvac"
import IdxUtils from "./IdxUtils"

let panzoomInstance = null;
let getPanelsInterval = null; // Interval for fetching panel data

class IdxPage {

  private webview = (window as any).chrome?.webview;
  // private panzoomInstance: any;
  public zoom: any;

  constructor() {
    // this.panzoomInstance = null;
    this.initZoom();
  }

  // wrap code for IndexPage's onMounted event
  initPage() {
    this.initGlobalNav();
    this.isLoggedIn();
    this.restoreAppState();
    this.setDocMarginOffset();
    this.initPanzoom();
    this.initMessageClient();
    this.initScorller();
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

    const localState = localStorage.getItem("appState");
    if (localState) {
      appState.value = JSON.parse(localState);
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
    panzoomInstance = panzoom(viewport.value, {
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
      // transformOrigin: { x: 0.5, y: 0.5 },
    });

    // Update the viewport transform on panzoom transform event
    panzoomInstance.on("transform", function (e) {

      const pzTrs = e.getTransform();
      // pzTrs.x = pzTrs.x < 0 ? 0 : pzTrs.x;
      // pzTrs.y = pzTrs.y < 0 ? 0 : pzTrs.y;

      appState.value.viewportTransform = e.getTransform();
      triggerRef(appState);

      IdxPage.restDocumentAreaPosition(e.getTransform());
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

  initZoom() {
    // Computed property for zoom control
    this.zoom = computed({
      // Getter for zoom value
      get() {
        return parseInt(appState.value.viewportTransform.scale * 100 + "");
      },
      // Setter for zoom value
      set(newValue) {
        if (!newValue) return;
        appState.value.viewportTransform.scale = newValue / 100;
        panzoomInstance.smoothZoomAbs(
          appState.value.viewportTransform.x,
          appState.value.viewportTransform.y,
          newValue / 100
        );
      },
    });
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

    getPanelsInterval = setInterval(() => {
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

  // Checks if the user is logged in
  isLoggedIn() {
    const $q = useQuasar();

    console.log("= Idx $q:", $q);

    const hasToken = $q.cookies.has("token");
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
