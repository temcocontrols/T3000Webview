// Browser stub for Node.js 'fs' module — sync ops use sync XHR bridge, async ops use fetch bridge API
import { getBridgeAPI } from "eez-studio-shared/bridge";

function _bridge() {
    try { return getBridgeAPI(); } catch { return null; }
}

// ---- Sync XHR helpers (modeled after child-process.ts) ----

function _syncGetJson<T = any>(apiPath: string): T | null {
    try {
        const xhr = new XMLHttpRequest();
        xhr.open("GET", apiPath, false);
        xhr.send();
        if (xhr.status === 200) return JSON.parse(xhr.responseText) as T;
        return null;
    } catch { return null; }
}

function _syncGetText(apiPath: string): string | null {
    try {
        const xhr = new XMLHttpRequest();
        xhr.open("GET", apiPath, false);
        xhr.send();
        if (xhr.status === 200) return xhr.responseText;
        return null;
    } catch { return null; }
}

function _syncGetBinary(apiPath: string): ArrayBuffer | null {
    try {
        const xhr = new XMLHttpRequest();
        xhr.open("GET", apiPath, false);
        xhr.responseType = "arraybuffer";
        xhr.send();
        if (xhr.status === 200) return xhr.response as ArrayBuffer;
        return null;
    } catch { return null; }
}

function _syncPost(apiPath: string, body?: string | ArrayBuffer, contentType?: string): boolean {
    try {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", apiPath, false);
        if (contentType) xhr.setRequestHeader("Content-Type", contentType);
        xhr.send(body ?? null);
        return xhr.status === 200 || xhr.status === 204;
    } catch { return false; }
}

function _syncDelete(apiPath: string): boolean {
    try {
        const xhr = new XMLHttpRequest();
        xhr.open("DELETE", apiPath, false);
        xhr.send();
        return xhr.status === 200 || xhr.status === 204 || xhr.status === 404;
    } catch { return false; }
}

function _enc(p: string): string {
    return encodeURIComponent(p);
}

// ---- Sync functions (bridge-based via sync XHR) ----

export function existsSync(p: string): boolean {
    const resp = _syncGetJson<{ exists: boolean }>(`/api/eez-studio/file-exists?path=${_enc(p)}`);
    return resp?.exists === true;
}

export function readFileSync(p: string, enc?: any): string | Buffer {
    const wantString =
        enc === "utf8" ||
        enc === "utf-8" ||
        (enc && typeof enc === "object" && (enc.encoding === "utf8" || enc.encoding === "utf-8"));
    if (wantString) {
        const text = _syncGetText(`/api/eez-studio/read-text-file?path=${_enc(p)}`);
        return text !== null ? text : "";
    }
    // Binary path: return Buffer
    const binary = _syncGetBinary(`/api/eez-studio/read-file?path=${_enc(p)}`);
    if (binary !== null) return Buffer.from(binary);
    return Buffer.alloc(0);
}

export function writeFileSync(p: string, data: string | Uint8Array | ArrayBufferView, _enc?: any): void {
    const wantString = typeof data === "string";
    const url = `/api/eez-studio/${wantString ? "write-text-file" : "write-file"}?path=${_enc(p)}`;
    if (wantString) {
        _syncPost(url, data as string, "text/plain");
    } else {
        const d = data as any;
        const ab: ArrayBuffer = (d.buffer instanceof ArrayBuffer) ? d.buffer : d;
        _syncPost(url, ab, "application/octet-stream");
    }
}

export function statSync(p: string): { size: number; isFile(): boolean; isDirectory(): boolean; isSymbolicLink(): boolean } {
    const sizeResp = _syncGetJson<{ size: number }>(`/api/eez-studio/file-size?path=${_enc(p)}`);
    const isDirResp = _syncGetJson<{ is_directory: boolean }>(`/api/eez-studio/is-directory?path=${_enc(p)}`);
    const size = sizeResp?.size ?? 0;
    const isDir = isDirResp?.is_directory ?? false;
    return {
        size,
        isFile: () => !isDir,
        isDirectory: () => isDir,
        isSymbolicLink: () => false,
    };
}

export function lstatSync(p: string): { size: number; isFile(): boolean; isDirectory(): boolean; isSymbolicLink(): boolean } {
    return statSync(p) as any;
}

// Dirent class for readdirSync({ withFileTypes: true })
class Dirent {
    name: string;
    private _isDir: boolean;
    constructor(name: string, isDirectory: boolean) {
        this.name = name;
        this._isDir = isDirectory;
    }
    isDirectory() { return this._isDir; }
    isFile() { return !this._isDir; }
    isBlockDevice() { return false; }
    isCharacterDevice() { return false; }
    isSymbolicLink() { return false; }
    isFIFO() { return false; }
    isSocket() { return false; }
}

export function readdirSync(p: string, opts?: { withFileTypes?: boolean; encoding?: string }): string[] | Dirent[] {
    // Try the detailed endpoint first (efficient single call)
    const detailed = _syncGetJson<{ entries: Array<{ name: string; is_directory: boolean }> }>(
        `/api/eez-studio/list-files-detailed?path=${_enc(p)}`
    );
    if (detailed && Array.isArray(detailed.entries)) {
        if (opts?.withFileTypes) {
            return detailed.entries.map(e => new Dirent(e.name, e.is_directory));
        }
        return detailed.entries.map(e => e.name);
    }
    // Fallback: basic list-files endpoint
    const resp = _syncGetJson<string[]>(`/api/eez-studio/list-files?path=${_enc(p)}`);
    if (resp && Array.isArray(resp)) {
        if (opts?.withFileTypes) {
            const basePath = p.replace(/\/+$/, "");
            return resp.map(name => {
                const fullPath = `${basePath}/${name}`;
                const isDirResp = _syncGetJson<{ is_directory: boolean }>(`/api/eez-studio/is-directory?path=${_enc(fullPath)}`);
                return new Dirent(name, isDirResp?.is_directory ?? false);
            });
        }
        return resp;
    }
    return [];
}

export function mkdirSync(p: string, _opts?: { recursive?: boolean }): void {
    // Rust make-folder uses create_dir_all (always recursive)
    _syncPost("/api/eez-studio/make-folder", JSON.stringify({ path: p }), "application/json");
}

export function unlinkSync(p: string): void {
    _syncDelete(`/api/eez-studio/delete-file?path=${_enc(p)}`);
}

export function rmdirSync(p: string): void {
    _syncDelete(`/api/eez-studio/delete-file?path=${_enc(p)}`);
}

export function rmSync(p: string, opts?: { recursive?: boolean; force?: boolean }): void {
    if (opts?.recursive) {
        const force = opts?.force ? "&force=true" : "";
        _syncDelete(`/api/eez-studio/delete-recursive?path=${_enc(p)}${force}`);
    } else {
        _syncDelete(`/api/eez-studio/delete-file?path=${_enc(p)}`);
    }
}

export function renameSync(oldP: string, newP: string): void {
    const data = _syncGetBinary(`/api/eez-studio/read-file?path=${_enc(oldP)}`);
    if (data !== null) {
        _syncPost(`/api/eez-studio/write-file?path=${_enc(newP)}`, data, "application/octet-stream");
        _syncDelete(`/api/eez-studio/delete-file?path=${_enc(oldP)}`);
    }
}

export function copyFileSync(src: string, dest: string): void {
    const data = _syncGetBinary(`/api/eez-studio/read-file?path=${_enc(src)}`);
    if (data !== null) {
        _syncPost(`/api/eez-studio/write-file?path=${_enc(dest)}`, data, "application/octet-stream");
    }
}

// Remaining sync stubs (no backend equivalents yet)
export function openSync(_p: string, _flags?: string, _mode?: number): number { return 0; }
export function closeSync(_fd: number): void {}
export function readSync(_fd: number, _buf: Buffer, _off?: number, _len?: number, _pos?: number): number { return 0; }
export function writeSync(_fd: number, _data: string | Buffer, _off?: number, _len?: number, _pos?: number): number { return 0; }
export function fstatSync(_fd: number): { size: number } { return { size: 0 }; }
export function watchFile(_filename: string, _options: any, _listener?: any): void {}
export function unwatchFile(_filename: string, _listener?: any): void {}
export function watch(_filename: string, _options?: any, _listener?: any): any { return { close: () => {} }; }
export function createWriteStream(_p: string, _opts?: any): any {
    return { on: () => {}, end: () => {}, write: () => {} };
}
export function createReadStream(_p: string, _opts?: any): any {
    return { on: () => {}, pipe: () => {}, read: () => null };
}

// ---- Callback-based async functions ----

export function stat(p: string, cb: (err: any, stats?: any) => void) {
    const b = _bridge();
    if (b) {
        Promise.all([b.getFileSize(p), b.isDirectory(p)])
            .then(([size, isDir]) => cb(null, { size, isFile: () => !isDir, isDirectory: () => isDir }))
            .catch((e: any) => cb(e));
    } else {
        cb(null, { size: 0, isFile: () => true, isDirectory: () => false });
    }
}
export function exists(p: string, cb: (exists: boolean) => void) {
    const b = _bridge();
    if (b) {
        b.fileExists(p).then((ok: boolean) => cb(ok)).catch(() => cb(false));
    } else {
        cb(false);
    }
}
export function mkdir(p: string, cb: (err: any) => void) {
    const b = _bridge();
    b ? b.makeFolder(p).then(() => cb(null)).catch((e: any) => cb(e)) : cb(null);
}
export function rename(oldP: string, newP: string, cb: (err: any) => void) { cb(null); }
export function open(p: string, _flags: string, cb: (err: any, fd?: number) => void) { cb(null, 0); }
export function close(fd: number, cb: (err: any) => void) { cb(null); }
export function read(fd: number, buf: Buffer, _off: number, _len: number, _pos: number, cb: (err: any, bytesRead?: number, buf?: Buffer) => void) { cb(null, 0, buf); }
export function readdir(p: string, cb: (err: any, files?: string[]) => void) {
    const b = _bridge();
    b ? b.listFiles(p).then((f: string[]) => cb(null, Array.isArray(f) ? f : [])).catch(() => cb(null, [])) : cb(null, []);
}
export function writeFile(p: string, data: string | Buffer, encOrCb: string | ((err: any) => void), maybeCb?: (err: any) => void) {
    const cb: (err: any) => void = typeof encOrCb === "function" ? encOrCb : (maybeCb || (() => {}));
    const b = _bridge();
    if (b) {
        const d = typeof data === "string" ? data : Buffer.isBuffer(data) ? data.toString("utf8") : String(data);
        b.writeFile(p, new TextEncoder().encode(d)).then(() => cb(null)).catch((e: any) => cb(e));
    } else { cb(null); }
}
export function readFile(p: string, encOrCb: string | ((err: any, data?: any) => void), maybeCb?: (err: any, data?: any) => void) {
    const cb: (err: any, data?: any) => void = typeof encOrCb === "function" ? encOrCb : (maybeCb || (() => {}));
    const b = _bridge();
    if (b) {
        b.readTextFile(p).then((d: string) => cb(null, d)).catch((e: any) => cb(e));
    } else { cb(null, ""); }
}

const _promises = {
    readFile: (p: string) => {
        const b = _bridge();
        return b ? b.readTextFile(p) : Promise.resolve("");
    },
    writeFile: (p: string, data: string | Uint8Array) => {
        const b = _bridge();
        return b ? b.writeFile(p, typeof data === "string" ? new TextEncoder().encode(data) : data) : Promise.resolve();
    },
    readdir: (p: string) => {
        const b = _bridge();
        return b ? b.listFiles(p) : Promise.resolve([]);
    },
    mkdir: (p: string) => {
        const b = _bridge();
        return b ? b.makeFolder(p) : Promise.resolve();
    },
    unlink: (p: string) => {
        const b = _bridge();
        return b ? b.deleteFile(p) : Promise.resolve();
    },
    rmdir: () => Promise.resolve(),
    rename: (oldP: string, newP: string) => {
        const b = _bridge();
        return b ? b.readFile(oldP).then((d: any) => b.writeFile(newP, d)).then(() => b.deleteFile(oldP)) : Promise.resolve();
    },
    stat: (p: string) => {
        const b = _bridge();
        if (b) {
            return Promise.all([b.getFileSize(p), b.isDirectory(p)])
                .then(([size, isDir]) => ({ size, isFile: () => !isDir, isDirectory: () => isDir }));
        }
        return Promise.resolve({ size: 0, isFile: () => true, isDirectory: () => false });
    },
    lstat: (p: string) => {
        const b = _bridge();
        if (b) {
            return Promise.all([b.getFileSize(p), b.isDirectory(p)])
                .then(([size, isDir]) => ({ size, isFile: () => !isDir, isDirectory: () => isDir, isSymbolicLink: () => false }));
        }
        return Promise.resolve({ size: 0, isFile: () => true, isDirectory: () => false, isSymbolicLink: () => false });
    },
    access: (_p: string) => Promise.resolve(),
};
export const promises = _promises;

export default {
    readFileSync, writeFileSync, existsSync, statSync, lstatSync, readdirSync,
    mkdirSync, unlinkSync, rmdirSync, renameSync, copyFileSync, rmSync,
    createWriteStream, createReadStream, openSync, closeSync, readSync, writeSync,
    fstatSync, watchFile, unwatchFile, watch,
    stat, exists, mkdir, rename, open, close, read, readdir, writeFile, readFile,
    promises: _promises,
};
