/**
 * EEZ Studio Bridge API — HTTP client for the T3000 Rust backend.
 *
 * All file-system and project operations go through the BridgeAPI interface
 * (defined in eez-studio-shared/bridge). This module:
 *
 *   1. Registers the bridge via {@link initEezBridge} (called once at boot).
 *   2. Proxies every filesystem call through `GET/POST /api/eez-studio/*`.
 *   3. Runs a one-shot health check via {@link checkBackendHealth} which
 *      hits `GET /api/eez-studio/health` (3s timeout) and caches the
 *      result so multiple callers share a single HTTP request.
 *
 * When the backend is *known* to be offline (`backendHealth === false`),
 * all API calls short-circuit with a fake error response — no network
 * requests are made.
 *
 * ## Exports
 *   - `initEezBridge()`        — register bridge, fire health check
 *   - `checkBackendHealth()`   — returns `Promise<boolean>` (cached)
 *
 * ## Backend routes (Rust – axum)
 *   - `GET  /api/eez-studio/health`         → `{"status":"ok"}`
 *   - `GET  /api/eez-studio/read-file?path=`
 *   - `POST /api/eez-studio/write-file?path=`
 *   - … (see `api/src/t3_eez_studio/mod.rs`)
 *
 * @module eez-studio-api
 */

import { setBridgeAPI, BridgeAPI } from "eez-studio-shared/bridge";

// const BASE = "http://localhost:9103/api/eez-studio";
const BASE = "/api/eez-studio";
const enc = encodeURIComponent;
const noop = () => {};

let backendHealth: boolean | undefined = undefined;
let healthPromise: Promise<boolean> | undefined = undefined;

export function checkBackendHealth(): Promise<boolean> {
    if (healthPromise) return healthPromise;
    healthPromise = Promise.race([
        fetch(`${BASE}/health`),
        new Promise<Response>((_, reject) => setTimeout(() => reject(new Error("timeout")), 3000))
    ])
    .then(res => { backendHealth = res.ok; return res.ok; })
    .catch(() => { backendHealth = false; return false; });
    return healthPromise;
}

async function api(path: string, init?: RequestInit): Promise<any> {
    if (backendHealth === false) {
        return { ok: false, json: () => ({}), text: () => "", arrayBuffer: () => new ArrayBuffer(0) } as any;
    }
    try {
        const opts = { ...init };
        if (opts.body && typeof opts.body === "string") {
            (opts as any).headers = { ...(opts.headers || {}), "Content-Type": "application/json" };
        }
        const res = await Promise.race([
            fetch(`${BASE}${path}`, opts),
            new Promise<Response>((_, reject) => setTimeout(() => reject(new Error("timeout")), 10000))
        ]);
        if (res.ok) {
            const ct = res.headers.get("content-type") || "";
            if (ct.includes("text/html")) {
                return { ok: true, status: 200, json: () => ({}), text: () => "", arrayBuffer: () => new ArrayBuffer(0) } as any;
            }
            return res;
        }
        // Capture status for error reporting
        const status = res.status;
    } catch {
        // fetch failed — let checkBackendHealth() own the status
    }
    return { ok: false, status: (typeof status !== 'undefined' ? status : 0), json: () => ({}), text: () => "", arrayBuffer: () => new ArrayBuffer(0) } as any;
}

// Helper: raise on non-2xx so write failures propagate to caller
async function apiOK(path: string, init?: RequestInit): Promise<void> {
    const res = await api(path, init);
    if (!res.ok) throw new Error(`API ${init?.method || "GET"} ${path} failed: ${res.status}`);
}

const t3: BridgeAPI = {
    readFile: p => api(`/read-file?path=${enc(p)}`).then(r=>r.arrayBuffer()),
    writeFile: (p,d) => apiOK(`/write-file?path=${enc(p)}`,{method:"POST",body:new Uint8Array(d)}),
    readTextFile: p => api(`/read-text-file?path=${enc(p)}`).then(r=>r.text()),
    writeTextFile: (p,d) => apiOK(`/write-text-file?path=${enc(p)}`,{method:"POST",body:d}),
    makeFolder: p => apiOK("/make-folder",{method:"POST",body:JSON.stringify({path:p})}),
    fileExists: p => api(`/file-exists?path=${enc(p)}`).then(r=>r.json()).then(function(j: any) { return (j && j.exists) || false; }),
    deleteFile: p => apiOK(`/delete-file?path=${enc(p)}`,{method:"DELETE"}),
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
    proxyFetchBinary: url => api(`/proxy-fetch-binary?url=${enc(url)}`).then(r=>r.arrayBuffer()),
};

export function initEezBridge() {
    setBridgeAPI(t3);
    checkBackendHealth(); // fire-and-forget: detect backend status early
}
