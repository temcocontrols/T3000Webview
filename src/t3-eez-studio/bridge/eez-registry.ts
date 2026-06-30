// EEZ Studio module registry for browser require() polyfill
// In Electron, require() uses Node.js module resolution.
// In the browser, require() is a polyfill — we register Vite-bundled modules
// here so that lazy require() calls in render methods resolve correctly.

// home/home-tab — used by HomeTab.render()
import * as _homeTab from "home/home-tab";
// home/history — used by HistoryTab.render()
import * as _history from "home/history";
// home/shortcuts — used by ShortcutsTab.render()
import * as _shortcuts from "home/shortcuts";
// eez-studio-shared/extensions/extensions — used by beforeAppClose()
import * as _extensions from "eez-studio-shared/extensions/extensions";
// instrument/import-instrument-definition — used by IPC handler
import * as _importInstrument from "instrument/import-instrument-definition";
// instrument/instrument-object — used by message event listener in instruments/index.tsx
import * as _instrumentObject from "instrument/instrument-object";
// shortcuts/shortcuts-store — used by extensions.ts
import * as _shortcutsStore from "shortcuts/shortcuts-store";
// moment — used by getMoment() in util.ts for date formatting
import _moment from "moment";
import "moment-duration-format";
// i10n — used by getMoment()
import * as _i10n from "eez-studio-shared/i10n";
// lv_img_conv_v9 — LVGL image converter used by build pipeline
import * as _lvImgConvV9 from "project-editor/lvgl/lv_img_conv_v9/index.js";

const reg: Record<string, any> = (globalThis as any).__eezModules || {};
(globalThis as any).__eezModules = reg;

reg["home/home-tab"] = _homeTab;
reg["home/history"] = _history;
reg["home/shortcuts"] = _shortcuts;
reg["eez-studio-shared/extensions/extensions"] = _extensions;
reg["instrument/import-instrument-definition"] = _importInstrument;
reg["instrument/instrument-object"] = _instrumentObject;
reg["shortcuts/shortcuts-store"] = _shortcutsStore;
reg["moment"] = _moment;
reg["moment-duration-format"] = function install(m: any) { /* already applied via import */ };
reg["eez-studio-shared/i10n"] = _i10n;
reg["./lv_img_conv_v9/index.js"] = (_lvImgConvV9 as any).default || _lvImgConvV9;
console.log("[eez-registry] lv_img_conv_v9 registered, LVGLImage:", typeof (reg["./lv_img_conv_v9/index.js"] as any)?.LVGLImage);
