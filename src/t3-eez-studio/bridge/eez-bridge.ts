import { setBridgeAPI, BridgeAPI } from "eez-studio-shared/bridge";

const BASE = "http://localhost:9103/api/bridge";
const enc = encodeURIComponent;
const noop = () => {};
const noBackend = () => { console.warn("[EEZ Bridge] No Rust backend — using mock"); };

async function api(path: string, init?: RequestInit): Promise<any> {
    try {
        const opts = { ...init };
        // Auto-set Content-Type for JSON string bodies (Axum requires it)
        if (opts.body && typeof opts.body === "string" && opts.body.startsWith("{")) {
            (opts as any).headers = { ...(opts.headers || {}), "Content-Type": "application/json" };
        }
        const res = await fetch(`${BASE}${path}`, opts);
        if (res.ok) {
            // If the backend returns HTML (e.g. an error page), treat as empty
            const ct = res.headers.get("content-type") || "";
            if (ct.includes("text/html")) {
                return { ok: true, json: () => ({}), text: () => "", arrayBuffer: () => new ArrayBuffer(0) } as any;
            }
            return res;
        }
    } catch {}
    noBackend();
    return { ok: false, json: () => ({}), text: () => "", arrayBuffer: () => new ArrayBuffer(0) } as any;
}

const t3: BridgeAPI = {
    readFile: p => api(`/read-file?path=${enc(p)}`).then(r=>r.arrayBuffer()),
    writeFile: (p,d) => api(`/write-file?path=${enc(p)}`,{method:"POST",body:new Uint8Array(d)}).then(noop),
    readTextFile: p => api(`/read-text-file?path=${enc(p)}`).then(r=>r.text()),
    writeTextFile: (p,d) => api(`/write-text-file?path=${enc(p)}`,{method:"POST",body:d}).then(noop),
    makeFolder: p => api("/make-folder",{method:"POST",body:JSON.stringify({path:p})}).then(noop),
    fileExists: p => api(`/file-exists?path=${enc(p)}`).then(r=>r.json()),
    deleteFile: p => api(`/delete-file?path=${enc(p)}`,{method:"DELETE"}).then(noop),
    listFiles: p => api(`/list-files?path=${enc(p)}`).then(r=>r.json()),
    getFileSize: p => api(`/file-size?path=${enc(p)}`).then(r=>r.json()),
    isDirectory: p => api(`/is-directory?path=${enc(p)}`).then(r=>r.json()),
    showOpenDialog: (o) => new Promise(r=>{const i=document.createElement("input");i.type="file";if(o.properties?.includes("openDirectory"))(i as any).webkitdirectory=true;i.onchange=()=>r(Array.from(i.files||[]).map((f:any)=>f.webkitRelativePath||f.name));i.oncancel=()=>r([]);i.click()}),
    showSaveDialog: (o) => Promise.resolve(prompt("Save as:",o.defaultPath||"untitled")||undefined),
    showMessageBox: (o) => Promise.resolve({response:confirm(o.message+(o.detail?"\n\n"+o.detail:""))?0:o.cancelId??1}),
    getUserDataPath: s => `/eez-user-data/${s}`,
    getAppVersion: () => "0.28.0",
    isDev: () => (import.meta as any).env?.DEV ?? false,
    openProject: p => api(`/read-text-file?path=${enc(p)}`).then(r=>r.json()),
    saveProject: (p,d) => api(`/write-text-file?path=${enc(p)}`,{method:"POST",body:JSON.stringify(d,null,2)}).then(noop),
    buildProject: (p,cb) => api("/build-project",{method:"POST",body:JSON.stringify({filePath:p})}).then(noop),
};

export function initEezBridge() { setBridgeAPI(t3); }
