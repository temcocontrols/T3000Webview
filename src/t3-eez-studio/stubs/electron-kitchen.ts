// Comprehensive browser stub for Electron — all APIs as no-ops
const noop = () => {};
const noopAsync = () => Promise.resolve();
const noopObj = () => ({});

const MRU_STORAGE_KEY = "eez-studio-mru";

function readMRU(): any[] {
    try {
        const raw = window.localStorage.getItem(MRU_STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch { return []; }
}

function writeMRU(value: any[]) {
    try {
        window.localStorage.setItem(MRU_STORAGE_KEY, JSON.stringify(value));
    } catch { /* noop */ }
}

const ipcSyncDefaults: Record<string, any> = {
    getDbPaths: [],
    getActiveDbPath: "/userData/storage.db",
    getSettings: {},
    getMRU: [],
    getReservedKeybindings: [],
    getIsDarkTheme: false,
    getShowComponentsPaletteInProjectEditor: false,
    getHomePath: "/project",
    getExtensionsFolderPath: "/userData/extensions",
    getLocale: "en",
    getDateFormat: "YYYY-MM-DD",
    getTimeFormat: "HH:mm:ss",
};

// Simple event emitter so ipcRenderer.on actually works in browser
const ipcListeners: Record<string, Array<(...args: any[]) => void>> = {};
function emitIPC(ch: string, ...args: any[]) {
    (ipcListeners[ch] || []).forEach(fn => fn(...args));
}

export const ipcRenderer = {
    on: (ch: string, handler: (...args: any[]) => void) => {
        if (!ipcListeners[ch]) ipcListeners[ch] = [];
        ipcListeners[ch].push(handler);
    },
    once: (ch: string, handler: (...args: any[]) => void) => {
        const wrapper = (...args: any[]) => {
            handler(...args);
            const arr = ipcListeners[ch];
            if (arr) { const i = arr.indexOf(wrapper); if (i !== -1) arr.splice(i, 1); }
        };
        if (!ipcListeners[ch]) ipcListeners[ch] = [];
        ipcListeners[ch].push(wrapper);
    },
    removeListener: (ch: string, handler: (...args: any[]) => void) => {
        const arr = ipcListeners[ch];
        if (arr) { const i = arr.indexOf(handler); if (i !== -1) arr.splice(i, 1); }
    },
    removeAllListeners: (ch?: string) => {
        if (ch) { delete ipcListeners[ch]; }
        else { for (const k of Object.keys(ipcListeners)) delete ipcListeners[k]; }
    },
    send: (ch: string, ...args: any[]) => {
        if (ch === "setMRU") { writeMRU(args[0]); emitIPC("mru-changed", null, readMRU()); }
        if (ch === "setMruFilePath") {
            const item = args[0] as { filePath: string; projectType?: string; hasFlowSupport?: boolean };
            if (item?.filePath) {
                const mru = readMRU();
                const existing = mru.findIndex((m: any) => m.filePath === item.filePath);
                if (existing !== -1) mru.splice(existing, 1);
                mru.unshift({ filePath: item.filePath, projectType: item.projectType || "", hasFlowSupport: item.hasFlowSupport ?? false });
                writeMRU(mru);
                emitIPC("mru-changed", null, mru);
            }
        }
        if (ch === "open-file") {
            const filePath: string = args[0] || "";
            window.dispatchEvent(new CustomEvent("eez-open-project", { detail: filePath }));
        }
        if (ch === "open-project") {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = ".eez-project,.eez-dashboard";
            input.style.display = "none";
            document.body.appendChild(input);
            input.onchange = async () => {
                const file = input.files?.[0];
                document.body.removeChild(input);
                if (!file) return;
                const text = await file.text();
                const baseName = file.name.replace(/\.(eez-project|eez-dashboard)$/, '');
                const folderPath = `/project/${baseName}`;
                const projPath = `${folderPath}/${file.name}`;
                try {
                    await fetch("http://localhost:9103/api/bridge/make-folder", {
                        method: "POST",
                        body: JSON.stringify({path: folderPath}),
                        headers: { "Content-Type": "application/json" }
                    });
                    const resp = await fetch("http://localhost:9103/api/bridge/write-text-file?path=" + encodeURIComponent(projPath), {
                        method: "POST",
                        body: text,
                        headers: { "Content-Type": "text/plain" }
                    });
                    if (!resp.ok) console.error("Upload failed:", resp.status);
                } catch(e) { console.error("Upload error:", e); }
                window.dispatchEvent(new CustomEvent("eez-open-project", { detail: projPath }));
            };
            input.click();
        }
    },
    sendSync: (ch: string) => {
        if (ch === "getMRU") { return readMRU(); }
        return ipcSyncDefaults[ch] ?? [];
    },
    invoke: (ch: string) => Promise.resolve(ipcSyncDefaults[ch] ?? {}),
    sendToHost: noop, postMessage: noop,
};
export const ipcMain = { on:noop, handle:noop, handleOnce:noop, removeHandler:noop, removeAllListeners:noop };
export const app = { getPath:(p:string)=>{ if (p==="userData") return "/userData"; if (p==="home") return "/project"; return "/"; }, getVersion:()=>"0.0.0", relaunch:noop, exit:noop, whenReady:noopAsync, on:noop, getName:()=>"EEZ Studio", getAppPath:()=>"/", isPackaged:false, commandLine:{appendSwitch:noop}, getLocale:()=>"en" };
export const dialog = { showOpenDialog:()=>Promise.resolve({filePaths:[],canceled:false}), showSaveDialog:()=>Promise.resolve({filePath:void 0,canceled:false}), showMessageBox:()=>Promise.resolve({response:0}) };
export const shell = { openPath:()=>Promise.resolve(""), openExternal:()=>Promise.resolve(), showItemInFolder:noop, beep:noop, moveItemToTrash:()=>Promise.resolve(), openPathAsync:()=>Promise.resolve("") };
export const clipboard = { writeText:noop, readText:()=>"", writeBuffer:noop, readBuffer:()=>Buffer.alloc(0), writeHTML:noop, readHTML:()=>"", writeImage:noop, readImage:()=>({}), write:noop, read:()=>"", clear:noop, availableFormats:()=>[] };
export const screen = { getPrimaryDisplay:()=>({workAreaSize:{width:1920,height:1080},bounds:{width:1920,height:1080},size:{width:1920,height:1080}}), getAllDisplays:()=>[], getCursorScreenPoint:()=>({x:0,y:0}), getDisplayMatching:noopObj };
export const nativeTheme = { shouldUseDarkColors:false, themeSource:"system", addListener:noop, removeListener:noop, on:noop };
export const session = { defaultSession:{loadExtension:noopAsync,clearCache:noopAsync,clearStorageData:noopAsync,setPermissionRequestHandler:noop}, fromPartition:noopObj };
export const powerSaveBlocker = { start:()=>0, stop:noop, isStarted:()=>false };
export const powerMonitor = { on:noop, getSystemIdleTime:()=>0, getSystemIdleState:()=>"active" };
export const net = { fetch:fetch.bind(window), request:()=>({on:noop,end:noop}), resolveHost:noopAsync };
export const process = { type:"browser", versions:{node:"",chrome:"",electron:""}, platform:"browser", arch:"x64" };
export const contextBridge = { exposeInMainWorld:noop };

// @electron/remote stubs — used by EEZ Studio UI components (tabs, context menus, etc.)
export class MenuItem {
    label: string = "";
    click?: () => void;
    constructor(options?: { label?: string; click?: () => void }) {
        if (options) {
            this.label = options.label ?? "";
            this.click = options.click;
        }
    }
}
export class Menu {
    items: MenuItem[] = [];
    append(item: MenuItem) { this.items.push(item); }
    popup(_options?: any) { /* no-op in browser */ }
    closePopup() { /* no-op in browser */ }
}
export const getCurrentWindow = () => ({
    id: 0,
    show: noop,
    close: noop,
    minimize: noop,
    maximize: noop,
    isMaximized: () => false,
    isMinimized: () => false,
    isFocused: () => true,
    focus: noop,
    restore: noop,
    webContents: { send: noop, on: noop, removeListener: noop },
});
export const getCurrentWebContents = () => ({
    send: noop,
    on: noop,
    removeListener: noop,
});
export const crashReporter = { start:noop, addExtraParameter:noop, removeExtraParameter:noop, getParameters:noopObj };
export const desktopCapturer = { getSources:()=>Promise.resolve([]) };
export const inAppPurchase = { purchaseProduct:noopAsync, getProducts:()=>Promise.resolve([]), canMakePayments:()=>false, restoreCompletedTransactions:noop };
export const protocol = { registerSchemesAsPrivileged:noop, handle:noop, registerFileProtocol:noop, registerBufferProtocol:noop, registerStringProtocol:noop, registerHttpProtocol:noop, registerStreamProtocol:noop, unregisterProtocol:noop, isProtocolHandled:()=>false };
export const safeStorage = { isEncryptionAvailable:()=>false, encryptString:()=>Buffer.alloc(0), decryptString:()=>"", setUsePlainTextEncryption:noop, getSelectedStorageBackend:()=>"basic_text" };
export const systemPreferences = { isDarkMode:()=>false, getColor:()=>"#000000", getSystemColor:()=>"#000000", getUserDefault:noopObj, setUserDefault:noop, removeUserDefault:noop, isAeroGlassEnabled:()=>false, getAccentColor:()=>"#000000", getMediaAccessStatus:()=>"not-determined", askForMediaAccess:()=>Promise.resolve(false), subscribeNotification:noop, unsubscribeNotification:noop, isTrustedAccessibilityClient:()=>false, postNotification:noop };
export const webFrame = { setZoomFactor:noop, getZoomFactor:()=>1, setZoomLevel:noop, getZoomLevel:()=>0, setVisualZoomLevelLimits:noop, setSpellCheckProvider:noop, insertCSS:noopAsync, executeJavaScript:noopAsync, getResourceUsage:noopObj, clearCache:noop };
export const webContents = { getAllWebContents:()=>[], getFocusedWebContents:()=>null, fromId:()=>null };
export const autoUpdater = { checkForUpdates:noop, getFeedURL:()=>"", setFeedURL:noop, on:noop, quitAndInstall:noop };
export const contentTracing = { startRecording:noopAsync, stopRecording:noopAsync, getTraceBufferUsage:noopAsync, getCategories:noopAsync };
export const globalShortcut = { register:noop, unregister:noop, unregisterAll:noop, isRegistered:()=>false };
export const webUtils = { getPathForFile:()=>"" };
export const nativeImage = {
    createEmpty: () => ({ isEmpty: () => true, getSize: () => ({ width: 0, height: 0 }), resize: () => ({}), toDataURL: () => "", toJPEG: () => Buffer.alloc(0), toPNG: () => Buffer.alloc(0), toBitmap: () => Buffer.alloc(0), getBitmap: () => Buffer.alloc(0), getNativeHandle: () => Buffer.alloc(0), crop: () => ({}), addRepresentation: () => ({}) }),
    createFromPath: () => ({}),
    createFromBuffer: () => ({}),
    createFromDataURL: () => ({}),
    createFromNamedImage: () => ({})
};

export class BrowserWindow {
    id = 1;
    static getAllWindows() { return [new BrowserWindow()]; }
    static fromId(_id: number) { return new BrowserWindow(); }
    static getFocusedWindow() { return null; }
    constructor() {}
    loadURL() { return Promise.resolve(); }
    loadFile() { return Promise.resolve(); }
    on() {}
    once() {}
    webContents = { send: noop, on: noop, executeJavaScript: noopAsync };
    show() {} hide() {} close() {} focus() {} blur() {}
    maximize() {} minimize() {} restore() {}
    isDestroyed() { return false; }
    isVisible() { return false; }
    isFocused() { return false; }
    setTitle(_t: string) {}
    getTitle() { return ""; }
    setSize(_w: number, _h: number) {}
    getSize() { return [800, 600]; }
    setPosition(_x: number, _y: number) {}
    getPosition() { return [0, 0]; }
    center() {}
}
// Menu and MenuItem are defined above with browser-compatible stubs
export const Tray = class { constructor(_icon:any){} setToolTip(){} setTitle(){} setImage(){} on(){} displayBalloon(){} popUpContextMenu(){} closeContextMenu(){} destroy(){} };
export const Notification = class { constructor(_o?:any){} show(){} close(){} on(){} static isSupported(){return false} };
export const ShareMenu = class { constructor(_o?:any){} };
export const TouchBar = { TouchBarButton:class{}, TouchBarColorPicker:class{}, TouchBarGroup:class{}, TouchBarLabel:class{}, TouchBarPopover:class{}, TouchBarScrubber:class{}, TouchBarSegmentedControl:class{}, TouchBarSlider:class{}, TouchBarSpacer:class{}, TouchBarOtherItemsProxy:class{} };

export default {
    ipcRenderer, ipcMain, app, dialog, shell, clipboard, screen, nativeTheme, session,
    powerSaveBlocker, powerMonitor, net, process, contextBridge, crashReporter, desktopCapturer,
    inAppPurchase, protocol, safeStorage, systemPreferences, webFrame, webContents,
    autoUpdater, contentTracing, globalShortcut, webUtils, getCurrentWindow, nativeImage,
    BrowserWindow, Menu, MenuItem, Tray, Notification, ShareMenu, TouchBar
};
