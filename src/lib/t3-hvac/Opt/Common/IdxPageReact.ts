/**
 * IdxPageReact — React-specific IdxPage
 *
 * Extends the base IdxPage but overrides initPage() to skip Vue-only features:
 *   - panzoom (requires a Vue-managed viewport DOM ref)
 *   - scroller (requires .viewport-wrapper element)
 *   - messageClient (WebView-specific)
 *   - moveableGuides (Vue Moveable component)
 *
 * All drawing/zoom/save/restore logic is inherited from the base class.
 *
 * This class exists so the Vue version's IdxPage.ts remains untouched.
 */

import IdxPage from "./IdxPage";
import Hvac from "../../Hvac";
import {
  globalNav, appState, rulersGridVisible, documentAreaPosition,
} from "../../Data/T3Data";
import DataOpt from "../Data/DataOpt";
import LogUtil from "../../Util/LogUtil";

class IdxPageReact extends IdxPage {

  /**
   * React-safe initPage.
   * Calls only the methods that don't depend on Vue/panzoom/scroller.
   */
  initPageReact(): void {
    LogUtil.Debug("[IdxPageReact] initPageReact — React-safe initialization");

    Hvac.WebClient.initMessageHandler();
    this.initGlobalNav();
    this.isLoggedInSafe();
    this.restoreAppState();
    this.initAutoSaveInterval();
    this.initWindowListener();
    this.clearGrpSwitch();

    LogUtil.Debug("[IdxPageReact] initPageReact — done");
  }

  /**
   * Safe version of isLoggedIn — guards against null $q (no Quasar in React).
   */
  isLoggedInSafe(): void {
    if (!this.$q) {
      // No Quasar instance — skip cookie-based auth checks
      return;
    }
    // Delegate to base class (which accesses this.$q.cookies)
    super.isLoggedIn();
  }

  /**
   * Window listener — React-safe (no WebSocket cleanup reference to WsClient).
   */
  initWindowListener(): void {
    window.addEventListener("beforeunload", () => {
      this.clearAutoSaveInterval();
    });

    window.addEventListener("resize", () => {
      // In React, we don't use documentAreaPosition Vue bindings
    });
  }
}

export default IdxPageReact;
