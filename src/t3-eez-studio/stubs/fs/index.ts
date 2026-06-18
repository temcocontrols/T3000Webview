// Browser stub for Node.js 'fs' module — sync ops are no-ops, async ops use bridge API
import { getBridgeAPI } from "eez-studio-shared/bridge";

function _bridge() {
    try { return getBridgeAPI(); } catch { return null; }
}

// ---- Sync functions (no-ops) ----
export const readFileSync = (_p: string, _enc?: string) => "";
export const writeFileSync = () => {};
export const existsSync = () => false; // sync bridge impossible — use async exists() instead
export const statSync = () => ({ size: 0, isFile: () => true, isDirectory: () => false });
// lstatSync: default to directory so fs.readdir-based filters keep entries (extensions.ts uses async isDirectory instead)
export const lstatSync = () => ({ size: 0, isFile: () => false, isDirectory: () => true, isSymbolicLink: () => false });
export const readdirSync = () => [];
export const mkdirSync = () => {};
export const unlinkSync = () => {};
export const rmdirSync = () => {};
export const renameSync = () => {};
export const copyFileSync = () => {};
export const createWriteStream = () => ({ on: () => {}, end: () => {}, write: () => {} });
export const createReadStream = () => ({ on: () => {}, pipe: () => {}, read: () => null });
export const openSync = () => 0;
export const closeSync = () => {};
export const readSync = () => 0;
export const writeSync = () => {};
export const fstatSync = () => ({ size: 0 });
export const watchFile = () => {};
export const unwatchFile = () => {};
export const watch = () => {};

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
    b ? b.listFiles(p).then((f: string[]) => cb(null, f)).catch((e: any) => cb(e)) : cb(null, []);
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
    mkdirSync, unlinkSync, rmdirSync, renameSync, copyFileSync,
    createWriteStream, createReadStream, openSync, closeSync, readSync, writeSync,
    fstatSync, watchFile, unwatchFile, watch,
    stat, exists, mkdir, rename, open, close, read, readdir, writeFile, readFile,
    promises: _promises,
};
