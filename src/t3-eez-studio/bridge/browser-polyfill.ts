// Browser polyfill for Node.js globals (Buffer, require, global)
// Injected before any EEZ Studio code loads

// mousetrap is CJS — no default ESM export
import * as MousetrapNS from "mousetrap";
const Mousetrap = (MousetrapNS as any).default || MousetrapNS;

// jQuery stub — exposed globally for drag-and-drop etc.
import "jquery";

// ace editor — exposed globally for code-editor.tsx
import * as ace from "ace-builds";
import "ace-builds/src-noconflict/theme-dracula";
import "ace-builds/src-noconflict/theme-github";
import "ace-builds/src-noconflict/mode-c_cpp";
import "ace-builds/src-noconflict/mode-javascript";
import "ace-builds/src-noconflict/mode-json";
import "ace-builds/src-noconflict/mode-python";
(globalThis as any).ace = ace;

// global
(globalThis as any).global = globalThis;
(globalThis as any).__dirname = "/";
(globalThis as any).__filename = "/index.js";
(globalThis as any).process = (globalThis as any).process || {
    env: {},
    platform: "browser",
    type: "renderer",
    execPath: "/usr/bin/node",
    cwd: () => "/",
    argv: [],
    version: "",
    versions: { node: "" },
};

// Safe JSON.parse — returns {} for empty/invalid input (localStorage rehydration)
const _origParse = JSON.parse;
JSON.parse = function safeParse(text: string, ...args: any[]) {
    if (!text || typeof text !== "string" || text.trim().length === 0) return {};
    try { return _origParse.call(JSON, text, ...args); } catch { return {}; }
};

// Buffer polyfill — use real 'buffer' npm package for full Node.js Buffer API
import { Buffer as NodeBuffer } from "buffer";
(globalThis as any).Buffer = NodeBuffer;

// MRU helpers — mirrors electron-kitchen.ts via localStorage
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

// ipcSyncDefaults — shared fallback values for sendSync
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

// Global require() polyfill — returns browser-compatible mocks
(globalThis as any).require = ((globalThis as any).require || function require(path: string) {
    if (path === "fs") return {
        readFileSync: () => "", writeFileSync: () => {}, existsSync: () => false,
        statSync: () => ({ size:0, isFile:()=>true, isDirectory:()=>false }),
        lstatSync: () => ({ size:0, isFile:()=>true, isDirectory:()=>false }),
        readdirSync: () => [], mkdirSync: () => {}, unlinkSync: () => {},
        rmdirSync: () => {}, renameSync: () => {}, copyFileSync: () => {},
        createWriteStream: () => ({ on:()=>{}, end:()=>{}, write:()=>{} }),
        createReadStream: () => ({ on:()=>{}, pipe:()=>{}, read:()=>null }),
        openSync: () => 0, closeSync: () => {}, readSync: () => 0, writeSync: () => {},
        watchFile: () => {}, unwatchFile: () => {}, watch: () => {},
        promises: { readdir:()=>Promise.resolve([]), mkdir:()=>Promise.resolve(), stat:()=>Promise.resolve({}) },
    };
    if (path === "path") return { resolve:(...p:string[])=>p.join("/"), relative:(f:string,t:string)=>t, join:(...p:string[])=>p.join("/"), sep:"/", basename:()=>"", dirname:()=>".", extname:()=>"" };
    if (path === "os") return { platform:()=>"browser", type:()=>"browser", homedir:()=>"/", tmpdir:()=>"/tmp" };
    if (path === "stream") return { Readable: class {}, Writable: class {}, Stream: class {} };
    if (path === "events") return { EventEmitter: class {} };
    if (path === "child_process") return { spawn: ()=>({on:()=>{},stdout:{on:()=>{}},stderr:{on:()=>{}}}), exec:()=>{}, execFile:()=>{} };
    if (path === "url") return { pathToFileURL:(p:string)=>new URL("file://"+p), fileURLToPath:()=>"" };
    if (path === "util") return { promisify:(f:Function)=>f, inspect:()=>"", format:()=>"" };
    if (path === "electron" || path.includes("@electron/remote")) return {
        BrowserWindow: class {
            webContents: any;
            constructor(_opts?: any) {
                this.webContents = { getURL:()=>"", send:()=>{}, on:()=>{}, session:{loadExtension:()=>Promise.resolve(),clearCache:()=>Promise.resolve()} };
            }
            static getAllWindows(){return[]}
            static fromId(){return null}
            loadURL(_url: string) {}
            loadFile(_path: string) {}
            show() {}
            close() {}
            on() {}
            once() {}
        },
        ipcRenderer: {
            on: ()=>{}, once: ()=>{}, removeListener: ()=>{}, removeAllListeners: ()=>{},
            send: (ch: string, ...args: any[]) => {
                if (ch === "setMRU") { writeMRU(args[0]); }
                if (ch === "setMruFilePath") {
                    const item = args[0] as { filePath: string; projectType?: string; hasFlowSupport?: boolean };
                    if (item?.filePath) {
                        const mru = readMRU();
                        const existing = mru.findIndex((m: any) => m.filePath === item.filePath);
                        if (existing !== -1) mru.splice(existing, 1);
                        mru.unshift({ filePath: item.filePath, projectType: item.projectType || "", hasFlowSupport: item.hasFlowSupport ?? false });
                        writeMRU(mru);
                    }
                }
            },
            sendSync: (ch:string) => {
                if (ch === "getMRU") { return readMRU(); }
                return ipcSyncDefaults[ch] ?? [];
            },
            invoke: (ch:string) => Promise.resolve(ipcSyncDefaults[ch] ?? {}),
            sendToHost: ()=>{}, postMessage: ()=>{},
        },
        ipcMain: {
            on:()=>{}, handle:()=>{}, handleOnce:()=>{}, removeHandler:()=>{}, removeAllListeners:()=>{}
        },
        enable: () => {},
        getCurrentWindow:()=>({id:1, webContents:{getURL:()=>""}}),
        app: {
            getPath: (p:string) => p === "userData" ? "/userData" : p === "home" ? "/project" : "/",
            getVersion: () => "0.0.0",
            getName: () => "EEZ Studio",
            getAppPath: () => "/",
            getLocale: () => "en",
            isPackaged: false,
            relaunch: () => {},
            exit: () => {},
            whenReady: () => Promise.resolve(),
            on: () => {},
            commandLine: { appendSwitch: () => {} },
        },
        dialog:{}, shell:{},
        clipboard: { writeText:()=>{}, readText:()=>"", writeBuffer:()=>{}, readBuffer:()=>new ArrayBuffer(0), write:()=>{}, read:()=>"", clear:()=>{}, availableFormats:()=>[] },
    };
    if (path === "tmp") return { tmpName:()=>{}, dir:()=>{} };
    if (path === "python-shell") return { PythonShell: { runString:()=>{} } };
    if (path === "rimraf") return () => {};
    if (path === "fs-extra") return { copy:()=>{}, remove:()=>{} };
    if (path === "archiver") return function() { return { on:()=>{}, pipe:()=>{}, finalize:()=>{}, glob:()=>{} }; };
    if (path === "better-sqlite3") return class {
        constructor(){} prepare(){return{run:()=>({}),get:()=>({}),all:()=>[],bind:()=>this.prepare()}}
        exec(){} close(){} pragma(){} defaultSafeIntegers(){return this} transaction(fn:Function){return fn}
    };
    if (path === "main/settings") return {
        getActiveDbPath: () => "/userData/storage.db",
        getDbPaths: () => [],
        setDbPaths: () => {},
        getSettings: () => ({}),
        getMRU: () => [],
        getIsDarkTheme: () => false,
        getHomePath: () => "/project",
        getExtensionsFolderPath: () => "/userData/extensions",
    };
    if (path.includes("electron-context-menu")) return () => {};
    if (path === "mousetrap") return Mousetrap;
    if (path === "simple-git") return { simpleGit: () => ({ init:()=>Promise.resolve(), status:()=>Promise.resolve({files:[],isClean:()=>true}), log:()=>Promise.resolve({all:[],latest:null,total:0}), diff:()=>Promise.resolve(""), add:()=>Promise.resolve(), commit:()=>Promise.resolve(), push:()=>Promise.resolve(), pull:()=>Promise.resolve(), checkout:()=>Promise.resolve(), branch:()=>Promise.resolve({all:[],current:""}), fetch:()=>Promise.resolve(), remote:()=>Promise.resolve([]) }) };
    if (path === "decompress") return () => Promise.resolve([]);
    if (path === "showdown") return { Converter: class { makeHtml(s:string){return s} } };
    if (path === "command-exists") return { sync: () => false };
    if (path === "sha256") return function sha256(s: string) { let h=0; for(let i=0;i<s.length;i++){h=((h<<5)-h)+s.charCodeAt(i);h|=0;} return Math.abs(h).toString(16).padStart(8,'0'); };
    // EEZ Studio module registry — populated by app.tsx and others at import time
    const reg = (globalThis as any).__eezModules;
    if (reg && reg[path]) return reg[path];
    return {};
});
