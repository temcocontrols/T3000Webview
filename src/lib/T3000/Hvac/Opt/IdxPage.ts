
// Migrate code from HvacDrawer/IndexPage to IdxPage

import {
  globalNav, user, emptyLib, library, appState, rulersGridVisible, isBuiltInEdge, documentAreaPosition,
  viewportMargins, viewport, locked
} from "../Data/T3Data"
import { liveApi } from '../../../api'
import { useQuasar, useMeta } from "quasar"
import panzoom from "panzoom"
import { computed, triggerRef } from "vue"

let panzoomInstance = null;

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
        return parseInt(appState.value.viewportTransform.scale * 100);
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
