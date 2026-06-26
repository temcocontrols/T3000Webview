import { setBridgeAPI, BridgeAPI } from "eez-studio-shared/bridge";

// const BASE = "http://localhost:9103/api/bridge";
const BASE = "/api/bridge";
const enc = encodeURIComponent;
const noop = () => {};

let backendOnline = true;
let backendChecked = false;

export function getBackendStatus() {
    return { online: backendOnline, checked: backendChecked };
}

function checkBackend() {
    const xhr = new XMLHttpRequest();
    xhr.timeout = 3000;
    xhr.open("GET", "http://localhost:9103");
    xhr.onload = () => { backendOnline = true; backendChecked = true; };
    xhr.ontimeout = () => { backendOnline = false; backendChecked = true; };
    xhr.onerror = () => { backendOnline = false; backendChecked = true; };
    xhr.send();
}

async function api(path: string, init?: RequestInit): Promise<any> {
    // Skip fetch if backend is known to be offline
    if (backendChecked && !backendOnline) {
        return { ok: false, json: () => ({}), text: () => "", arrayBuffer: () => new ArrayBuffer(0) } as any;
    }
    try {
        const opts = { ...init };
        if (opts.body && typeof opts.body === "string") {
            (opts as any).headers = { ...(opts.headers || {}), "Content-Type": "application/json" };
        }
        const res = await fetch(`${BASE}${path}`, opts);
        backendOnline = true;
        backendChecked = true;
        if (res.ok) {
            const ct = res.headers.get("content-type") || "";
            if (ct.includes("text/html")) {
                return { ok: true, json: () => ({}), text: () => "", arrayBuffer: () => new ArrayBuffer(0) } as any;
            }
            return res;
        }
    } catch {
        backendOnline = false;
        backendChecked = true;
    }
    return { ok: false, json: () => ({}), text: () => "", arrayBuffer: () => new ArrayBuffer(0) } as any;
}

const t3: BridgeAPI = {
    readFile: p => api(`/read-file?path=${enc(p)}`).then(r=>r.arrayBuffer()),
    writeFile: (p,d) => api(`/write-file?path=${enc(p)}`,{method:"POST",body:new Uint8Array(d)}).then(noop),
    readTextFile: p => api(`/read-text-file?path=${enc(p)}`).then(r=>r.text()),
    writeTextFile: (p,d) => api(`/write-text-file?path=${enc(p)}`,{method:"POST",body:d}).then(noop),
    makeFolder: p => api("/make-folder",{method:"POST",body:JSON.stringify({path:p})}).then(noop),
    fileExists: p => api(`/file-exists?path=${enc(p)}`).then(r=>r.json()).then(function(j: any) { return (j && j.exists) || false; }),
    deleteFile: p => api(`/delete-file?path=${enc(p)}`,{method:"DELETE"}).then(noop),
    listFiles: p => api(`/list-files?path=${enc(p)}`).then(r=>r.json()),
    getFileSize: p => api(`/file-size?path=${enc(p)}`).then(r=>r.json()).then(function(j: any) { return (j && j.size) || 0; }),
    isDirectory: p => api(`/is-directory?path=${enc(p)}`).then(r=>r.json()).then(function(j: any) { return (j && j.is_directory) || false; }),
    showOpenDialog: (o) => new Promise(r => {
        const i = document.createElement("input");
        i.type = "file";
        if (o.properties && o.properties.includes("openDirectory")) {
            (i as any).webkitdirectory = true;
        }
        i.onchange = () => r(Array.from(i.files || []).map((f: any) => f.webkitRelativePath || f.name));
        i.oncancel = () => r([]);
        i.click();
    }),
    showSaveDialog: function (o: any) {
        return Promise.resolve(prompt("Save as:", o.defaultPath || "untitled") || undefined);
    },
    showMessageBox: function (o: any) {
        var msg = o.message;
        if (o.detail) { msg = msg + "\n\n" + o.detail; }
        var response = confirm(msg) ? 0 : (o.cancelId != null ? o.cancelId : 1);
        return Promise.resolve({ response: response });
    },
    getUserDataPath: s => `/userData/${s}`,
    getAppVersion: () => "0.28.0",
    isDev: function() { var env = (import.meta as any).env; return env && env.DEV; },
    openProject: p => api(`/read-text-file?path=${enc(p)}`).then(r=>r.json()),
    saveProject: (p,d) => api(`/write-text-file?path=${enc(p)}`,{method:"POST",body:JSON.stringify(d,null,2)}).then(noop),
    buildProject: (p, _cb) => api("/build-project",{method:"POST",body:JSON.stringify({filePath:p})}).then(noop),
    proxyFetch: url => api(`/proxy-fetch?url=${enc(url)}`).then(r=>r.text()),
};

export function initEezBridge() {
    setBridgeAPI(t3);
    checkBackend(); // fire-and-forget: detect backend status early
}
