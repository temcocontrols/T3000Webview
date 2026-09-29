/**
 * localStorage key registry for the NEW (React) HVAC engine — `src/lib/t3-hvac/**`.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * `src/lib/t3-hvac/**` (this tree: the React designer / `HvacDocument`) and
 * `src/lib/vue/T3000/Hvac/**` (the legacy Vue drawer, `#/hvac/t2`) are two independent copies of
 * the same engine. They never import each other's modules, but they historically used the *same
 * localStorage key strings* — and both restore them at startup (`IdxPage.restoreAppState()`,
 * `DataOpt.InitStoredData()`, `DataOpt.LoadAppStateV2()`, `DataOpt.LoadDocSettingData()`). The
 * result was that whichever page saved last was adopted by the other one.
 *
 * Every browser-storage key this tree reads or writes is therefore namespaced here with the `t3d.`
 * prefix. The legacy tree keeps `t3.*` / `appState` / `deviceAppState` untouched, so a drawing made
 * in `#/hvac/t2` can no longer appear in the React designer — and vice versa.
 *
 * RULES
 * -----
 * 1. Never use a literal storage key string in this tree — import it from here.
 * 2. Never add a key whose string is also used by `src/lib/vue/T3000/Hvac/**`: that would
 *    re-introduce the collision this file exists to remove.
 * 3. This file only covers *browser storage*. The document payload that goes to T3000 (a graphic
 *    file / device write) is unchanged — see `DataOpt.PrepareSaveData()`.
 * 4. `t3.config` is deliberately NOT namespaced: it is the app-wide log-settings slot shared with
 *    the React app's own Log Settings page (`src/t3-react/features/logs/…`), not drawing data.
 */
export const STORAGE_KEY_PREFIX = "t3d";

export const StorageKeys = {
    /* ---- engine document (T3Opt.Initialize → DataOpt.InitStoredData) ---- */

    /** Undo/redo ring of the engine document. */
    STATE: "t3d.state",
    /** Engine object store (`T3Gv.stdObj`). */
    DATA_STORE: "t3d.dataStore",
    /** Highest object id ever assigned. */
    CURRENT_OBJECT_SEQ_ID: "t3d.currentObjSeqId",
    /** Engine clipboard block (`T3Gv.clipboard`). */
    CLIPBOARD: "t3d.clipboard",
    /** `appStateV2` — the app-layer item table behind the properties panel / widget records. */
    APP_STATE_V2: "t3d.stateV2",
    /** Drawing blob written by `ShapeUtil.WriteBuffer` / read by `ShapeUtil.ReadBuffer`. */
    DRAW: "t3d.draw",
    /** Rulers, grid and zoom of the engine document. */
    DOC_INFO: "t3d.doc",
    /** Object library (tool palette symbols). */
    LIBRARY: "t3d.library",
    /** Pending group-navigation switch. */
    GRP_SWITCH: "t3d.grpSwitch",

    /* ---- legacy app layer (viewport transform, device binding, copy/paste) ---- */

    /** v1 `appState` — viewport transform, selected targets, canvas size. */
    APP_STATE: "t3d.appState",
    DEVICE_APP_STATE: "t3d.deviceAppState",
    TEMP_APP_STATE: "t3d.tempAppState",
    CURRENT_DEVICE: "t3d.currentDevice",
    /** Copy/paste buffer of the app layer (NOT the engine clipboard block). */
    CLIPBOARD_ITEMS: "t3d.clipboardItems",
    /** Panzoom transform and other UI-local settings. */
    LOCAL_SETTINGS: "t3d.localSettings"
} as const;

export type StorageKey = typeof StorageKeys[keyof typeof StorageKeys];

export default StorageKeys;
