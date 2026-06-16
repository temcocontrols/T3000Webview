import { setBridgeAPI, BridgeAPI } from "eez-studio-shared/bridge";

const BASE = "/api/bridge";
const enc = encodeURIComponent;

const t3: BridgeAPI = {
    readFile: p => fetch(`${BASE}/read-file?path=${enc(p)}`,{credentials:"include"}).then(r=>r.arrayBuffer()),
    writeFile: (p,d) => fetch(`${BASE}/write-file`,{method:"POST",headers:{"Content-Type":"application/octet-stream"},body:new Uint8Array(d),credentials:"include"}).then(()=>{}),
    readTextFile: p => fetch(`${BASE}/read-text-file?path=${enc(p)}`,{credentials:"include"}).then(r=>r.text()),
    writeTextFile: (p,d) => fetch(`${BASE}/write-text-file`,{method:"POST",headers:{"Content-Type":"text/plain"},body:d,credentials:"include"}).then(()=>{}),
    makeFolder: p => fetch(`${BASE}/make-folder`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({path:p}),credentials:"include"}).then(()=>{}),
    fileExists: p => fetch(`${BASE}/file-exists?path=${enc(p)}`,{credentials:"include"}).then(r=>r.json()),
    deleteFile: p => fetch(`${BASE}/delete-file?path=${enc(p)}`,{method:"DELETE",credentials:"include"}).then(()=>{}),
    listFiles: p => fetch(`${BASE}/list-files?path=${enc(p)}`,{credentials:"include"}).then(r=>r.json()),
    getFileSize: p => fetch(`${BASE}/file-size?path=${enc(p)}`,{credentials:"include"}).then(r=>r.json()),
    isDirectory: p => fetch(`${BASE}/is-directory?path=${enc(p)}`,{credentials:"include"}).then(r=>r.json()),
    showOpenDialog: (o) => new Promise(r=>{const i=document.createElement("input");i.type="file";if(o.properties?.includes("openDirectory"))(i as any).webkitdirectory=true;i.onchange=()=>r(Array.from(i.files||[]).map((f:any)=>f.webkitRelativePath||f.name));i.oncancel=()=>r([]);i.click()}),
    showSaveDialog: (o) => Promise.resolve(prompt("Save as:",o.defaultPath||"untitled")||undefined),
    showMessageBox: (o) => Promise.resolve({response:confirm(o.message+(o.detail?"\n\n"+o.detail:""))?0:o.cancelId??1}),
    getUserDataPath: s => `/eez-user-data/${s}`,
    getAppVersion: () => "0.28.0",
    isDev: () => (import.meta as any).env?.DEV ?? false,
    openProject: p => fetch(`${BASE}/read-text-file?path=${enc(p)}`,{credentials:"include"}).then(r=>r.json()),
    saveProject: (p,d) => fetch(`${BASE}/write-text-file`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(d,null,2),credentials:"include"}).then(()=>{}),
    buildProject: (p,cb) => fetch(`${BASE}/build-project`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({filePath:p}),credentials:"include"}).then(()=>{}),
};

export function initEezBridge() { setBridgeAPI(t3); }
