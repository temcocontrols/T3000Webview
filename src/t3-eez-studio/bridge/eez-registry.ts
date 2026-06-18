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
// shortcuts/shortcuts-store — used by extensions.ts
import * as _shortcutsStore from "shortcuts/shortcuts-store";
// moment — used by getMoment() in util.ts for date formatting
import _moment from "moment";
import "moment-duration-format";
// i10n — used by getMoment()
import * as _i10n from "eez-studio-shared/i10n";

const reg: Record<string, any> = (globalThis as any).__eezModules || {};
(globalThis as any).__eezModules = reg;

reg["home/home-tab"] = _homeTab;
reg["home/history"] = _history;
reg["home/shortcuts"] = _shortcuts;
reg["eez-studio-shared/extensions/extensions"] = _extensions;
reg["instrument/import-instrument-definition"] = _importInstrument;
reg["shortcuts/shortcuts-store"] = _shortcutsStore;
reg["moment"] = _moment;
reg["moment-duration-format"] = function install(m: any) { /* already applied via import */ };
reg["eez-studio-shared/i10n"] = _i10n;
