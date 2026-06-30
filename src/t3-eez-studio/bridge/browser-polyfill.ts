// Browser polyfill for Node.js globals (Buffer, require, global)
// Injected before any EEZ Studio code loads
// Minimal Buffer polyfill for the build pipeline (DataBuffer + lz4 compress).
// Covers only the methods used by: data-buffer.ts, lz4.ts, assets.ts
class Buffer extends Uint8Array {
    static alloc(size: number) {
        return new Buffer(new Uint8Array(size));
    }
    static from(data: any, encoding?: string): Buffer {
        if (typeof data === "string" && encoding === "base64") {
            const binary = atob(data);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            return new Buffer(bytes);
        }
        if (data instanceof Uint8Array) return new Buffer(data);
        return new Buffer(new Uint8Array(data ?? 0));
    }
    static isBuffer(_obj: any) { return _obj instanceof Buffer; }

    writeInt8(v: number, o: number) { new DataView(this.buffer).setInt8(o, v); }
    writeUInt8(v: number, o: number) { new DataView(this.buffer).setUint8(o, v); }
    writeInt16LE(v: number, o: number) { new DataView(this.buffer).setInt16(o, v, true); }
    writeUInt16LE(v: number, o: number) { new DataView(this.buffer).setUint16(o, v, true); }
    writeInt32LE(v: number, o: number) { new DataView(this.buffer).setInt32(o, v, true); }
    writeUInt32LE(v: number, o: number) { new DataView(this.buffer).setUint32(o, v, true); }
    writeBigUInt64LE(v: bigint, o: number) { new DataView(this.buffer).setBigUint64(o, v, true); }
    writeFloatLE(v: number, o: number) { new DataView(this.buffer).setFloat32(o, v, true); }
    writeDoubleLE(v: number, o: number) { new DataView(this.buffer).setFloat64(o, v, true); }

    writeString(v: string, o: number, _len: number, _enc: string) {
        for (let i = 0; i < v.length; i++) this[o + i] = v.charCodeAt(i);
    }

    subarray(start?: number, end?: number): Buffer {
        return new Buffer(super.subarray(start, end));
    }

    copy(target: Uint8Array, targetStart?: number, sourceStart?: number, sourceEnd?: number) {
        const src = this.subarray(sourceStart ?? 0, sourceEnd ?? this.length);
        (target instanceof Buffer ? target : new Uint8Array(target.buffer, target.byteOffset, target.byteLength))
            .set(src, targetStart ?? 0);
    }
}

(globalThis as any).Buffer = Buffer;
(globalThis as any).global = globalThis;
(globalThis as any).process = (globalThis as any).process || {
    env: {},
    versions: {},
    platform: "browser",
    nextTick: (fn: Function, ...args: any[]) => Promise.resolve().then(() => fn(...args)),
    cwd: () => "/",
};

// mousetrap is CJS — no default ESM export
import * as MousetrapNS from "mousetrap";
const Mousetrap = (MousetrapNS as any).default || MousetrapNS;

// jQuery — expose globally for drag-and-drop and HVAC components
import $ from "jquery";
(globalThis as any).$ = (globalThis as any).jQuery = $;

// ace editor — exposed globally for code-editor.tsx
import * as ace from "ace-builds";
import "ace-builds/src-noconflict/theme-dracula";
import "ace-builds/src-noconflict/theme-github";
import "ace-builds/src-noconflict/mode-c_cpp";
import "ace-builds/src-noconflict/mode-javascript";
import "ace-builds/src-noconflict/mode-json";
import "ace-builds/src-noconflict/mode-python";
import "ace-builds/src-noconflict/mode-css";
import "ace-builds/src-noconflict/mode-scss";
import "ace-builds/src-noconflict/mode-html";
ace.config.set("basePath", "/node_modules/ace-builds/src-noconflict");
(globalThis as any).ace = ace;

// global
(globalThis as any).global = globalThis;
(globalThis as any).__dirname = "/wasm";
(globalThis as any).__filename = "/index.js";
(globalThis as any).process = {
    ...(globalThis as any).process,   // keep existing fields
    env: (globalThis as any).process?.env || {},
    platform: "browser",
    type: "renderer",                 // <-- always set
    execPath: "/usr/bin/node",
    cwd: () => "/",
    argv: [],
    version: "",
    versions: { node: "" },
};
// Empscripten-generated WASM JS files use CommonJS `module`
(globalThis as any).module = (globalThis as any).module || { exports: {} };

// Safe JSON.parse
const _origParse = JSON.parse;
JSON.parse = function safeParse(text: string, ...args: any[]) {
    if (!text || typeof text !== "string") return {};
    try { return _origParse.call(JSON, text, ...args); } catch { return {}; }
};

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
        promises: { readdir:()=>Promise.resolve([]), mkdir:()=>Promise.resolve(), stat:()=>Promise.resolve({}), readFile:()=>Promise.resolve(""), writeFile:()=>Promise.resolve() },
    };
    if (path === "path") return { isAbsolute:(p:string)=>p.startsWith("/"), resolve:(...p:string[])=>p.join("/"), relative:(f:string,t:string)=>t, join:(...p:string[])=>p.join("/"), sep:"/", basename:()=>"", dirname:()=>".", extname:()=>"" };
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
        getLocale: () => localStorage.getItem("locale") || "en",
        setLocale: (value: string) => localStorage.setItem("locale", value),
        getDateFormat: () => "YYYY-MM-DD",
        setDateFormat: (value: string) => {},
        getTimeFormat: () => "HH:mm:ss",
        setTimeFormat: (value: string) => {},
    };
    if (path.includes("electron-context-menu")) return () => {};
    if (path === "mousetrap") return Mousetrap;
    if (path === "simple-git") return { simpleGit: () => ({ init:()=>Promise.resolve(), status:()=>Promise.resolve({files:[],isClean:()=>true}), log:()=>Promise.resolve({all:[],latest:null,total:0}), diff:()=>Promise.resolve(""), add:()=>Promise.resolve(), commit:()=>Promise.resolve(), push:()=>Promise.resolve(), pull:()=>Promise.resolve(), checkout:()=>Promise.resolve(), branch:()=>Promise.resolve({all:[],current:""}), fetch:()=>Promise.resolve(), remote:()=>Promise.resolve([]) }) };
    if (path === "decompress") return async function decompress(buf: Buffer) {
        // Browser-compatible zip decompressor using central directory
        const data = new Uint8Array(buf);
        const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);
        const textDecoder = new TextDecoder();

        // Find EOCD signature PK\x05\x06 at the end of the file
        let eocdOffset = -1;
        for (let i = Math.max(0, data.length - 65557); i <= data.length - 22; i++) {
            if (dv.getUint32(i, true) === 0x06054b50) {
                eocdOffset = i;
                break;
            }
        }
        if (eocdOffset < 0) return [];

        const cdOffset = dv.getUint32(eocdOffset + 16, true);
        const cdSize = dv.getUint32(eocdOffset + 12, true);

        // Read central directory entries to get file offsets, sizes, names
        interface CDEntry { offset: number; name: string; }
        const entries: CDEntry[] = [];
        let cdPos = cdOffset;
        const cdEnd = cdOffset + cdSize;
        while (cdPos < cdEnd - 46) {
            if (dv.getUint32(cdPos, true) !== 0x02014b50) break;
            const nameLen = dv.getUint16(cdPos + 28, true);
            const extraLen = dv.getUint16(cdPos + 30, true);
            const commentLen = dv.getUint16(cdPos + 32, true);
            const localOffset = dv.getUint32(cdPos + 42, true);
            const name = textDecoder.decode(data.slice(cdPos + 46, cdPos + 46 + nameLen));
            entries.push({ offset: localOffset, name });
            cdPos += 46 + nameLen + extraLen + commentLen;
        }

        // Sort by local header offset so we can calculate boundaries
        entries.sort((a, b) => a.offset - b.offset);

        // Decompress each file
        const files: any[] = [];
        for (let e = 0; e < entries.length; e++) {
            const entry = entries[e];
            let lhOffset = entry.offset;
            if (dv.getUint32(lhOffset, true) !== 0x04034b50) continue;
            lhOffset += 4;
            const compression = dv.getUint16(lhOffset + 4, true);
            const fileNameLen = dv.getUint16(lhOffset + 22, true);
            const extraLen = dv.getUint16(lhOffset + 24, true);
            const fileStart = lhOffset + 26 + fileNameLen + extraLen;

            // Boundary is next file's local header, or central directory
            const fileEnd = (e + 1 < entries.length) ? entries[e + 1].offset : cdOffset;

            let fileData: Uint8Array;
            if (compression === 0) {
                fileData = data.slice(fileStart, fileEnd);
            } else {
                const ds = new DecompressionStream("deflate-raw");
                const writer = ds.writable.getWriter();
                const reader = ds.readable.getReader();
                writer.write(data.slice(fileStart, fileEnd));
                writer.close();
                const chunks: Uint8Array[] = [];
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    chunks.push(value);
                }
                const totalLen = chunks.reduce((acc, c) => acc + c.length, 0);
                fileData = new Uint8Array(totalLen);
                let pos = 0;
                for (const c of chunks) { fileData.set(c, pos); pos += c.length; }
            }
            files.push({ data: fileData, path: entry.name });
        }
        return files;
    };
    if (path === "showdown") return { Converter: class { makeHtml(s:string){return s} } };
    if (path === "command-exists") return { sync: () => false };
    if (path === "sha256") return function sha256(s: string) { let h=0; for(let i=0;i<s.length;i++){h=((h<<5)-h)+s.charCodeAt(i);h|=0;} return Math.abs(h).toString(16).padStart(8,'0'); };
    // EEZ Studio module registry — populated by app.tsx and others at import time
    const reg = (globalThis as any).__eezModules;
    if (reg && reg[path]) return reg[path];
    return {};
});
