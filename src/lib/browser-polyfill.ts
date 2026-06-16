// Browser polyfill for Node.js globals (Buffer, require, global)
// Injected before any EEZ Studio code loads

// global
(globalThis as any).global = globalThis;

// Buffer polyfill
(globalThis as any).Buffer = (globalThis as any).Buffer || {
    alloc(size: number) { return new Uint8Array(size); },
    from(data: any) {
        if (typeof data === "string") return new TextEncoder().encode(data);
        if (data instanceof ArrayBuffer) return new Uint8Array(data);
        if (data instanceof Uint8Array) return data;
        return new Uint8Array(data || 0);
    },
    concat(buffers: Uint8Array[]) {
        const total = buffers.reduce((s, b) => s + b.length, 0);
        const result = new Uint8Array(total);
        let offset = 0;
        for (const b of buffers) { result.set(b, offset); offset += b.length; }
        return result;
    },
    isBuffer(_x: any) { return false; },
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
    if (path === "child_process") return { spawn: ()=>({on:()=>{},stdout:{on:()=>{}},stderr:{on:()=>{}}}), exec: ()=>{} };
    if (path === "url") return { pathToFileURL:(p:string)=>new URL("file://"+p), fileURLToPath:()=>"" };
    if (path === "util") return { promisify:(f:Function)=>f, inspect:()=>"", format:()=>"" };
    if (path === "electron" || path === "@electron/remote") return {
        BrowserWindow: class { static getAllWindows(){return[]} static fromId(){return null} }, app:{}, dialog:{}, shell:{}, clipboard:{}, getCurrentWindow:()=>({id:1}),
    };
    if (path === "tmp") return { tmpName:()=>{}, dir:()=>{} };
    if (path === "python-shell") return { PythonShell: { runString:()=>{} } };
    if (path === "rimraf") return () => {};
    if (path === "fs-extra") return { copy:()=>{}, remove:()=>{} };
    if (path === "archiver") return function() { return { on:()=>{}, pipe:()=>{}, finalize:()=>{}, glob:()=>{} }; };
    if (path === "better-sqlite3") return class { constructor(){} prepare(){return{run:()=>({}),get:()=>({}),all:()=>[]}} exec(){} close(){} };
    if (path.includes("electron-context-menu")) return () => {};
    if (path === "mousetrap") return { bind:()=>{}, unbind:()=>{}, reset:()=>{} };
    return {};
});
