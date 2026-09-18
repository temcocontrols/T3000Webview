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
   * The pair registered by `initWindowListener`.
   *
   * Kept on the instance because the engine is a **singleton** (`Hvac.ts` creates one `IdxPageReact`)
   * that is re-initialised on every document mount. Holding the references is what makes the pair
   * removable: measured on route churn (designer → hub → designer × 8) `window` gained exactly
   * `beforeunload +1` and `resize +1` per navigation before this, i.e. they were never released.
   */
  private windowListeners: { beforeUnload?: () => void; resize?: () => void } = {};

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
   * Window listeners — React-safe (no WebSocket cleanup reference to WsClient).
   *
   * Idempotent: `initPageReact` runs on every document mount, so the previous pair is released first.
   * Without that, each navigation to a drawing added two permanent `window` listeners.
   */
  initWindowListener(): void {
    this.destroyWindowListener();

    const beforeUnload = () => {
      this.clearAutoSaveInterval();
    };

    const resize = () => {
      // In React, we don't use documentAreaPosition Vue bindings
    };

    window.addEventListener("beforeunload", beforeUnload);
    window.addEventListener("resize", resize);

    this.windowListeners = { beforeUnload, resize };
  }

  /**
   * Releases the listeners registered by `initWindowListener`.
   * Called on document teardown (`HvacDocument`) so nothing keeps firing after unmount.
   */
  destroyWindowListener(): void {
    const { beforeUnload, resize } = this.windowListeners;
    if (beforeUnload) {
      window.removeEventListener("beforeunload", beforeUnload);
    }
    if (resize) {
      window.removeEventListener("resize", resize);
    }
    this.windowListeners = {};
  }
}

export default IdxPageReact;
