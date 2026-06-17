// Browser stub for Node.js 'fs' module — sync ops are no-ops, async ops use bridge API
import { getBridgeAPI } from "eez-studio-shared/bridge";

export const readFileSync = (_p: string, _enc?: string) => "";
export const writeFileSync = () => {};
export const existsSync = () => false;
export const statSync = () => ({ size: 0, isFile: () => true, isDirectory: () => false });
export const lstatSync = () => ({ size: 0, isFile: () => true, isDirectory: () => false, isSymbolicLink: () => false });
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
export const stat = () => { throw new Error("fs.stat: not available in browser") };

// Callback-based writeFile — used by EEZ Studio project save
export function writeFile(p: string, data: string, _enc: string, cb: (err: any) => void) {
    const b = _bridge();
    if (b) {
        b.writeFile(p, typeof data === "string" ? new TextEncoder().encode(data) : data)
            .then(() => cb(null))
            .catch((e: any) => cb(e));
    } else {
        cb(null);
    }
}
// Callback-based readFile
export function readFile(p: string, _enc: string, cb: (err: any, data?: string) => void) {
    const b = _bridge();
    if (b) {
        b.readTextFile(p)
            .then((d: string) => cb(null, d))
            .catch((e: any) => cb(e));
    } else {
        cb(null, "");
    }
}

function _bridge() {
    try { return getBridgeAPI(); } catch { return null; }
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
    readdir: () => Promise.resolve([]),
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
    stat: () => Promise.resolve({ size: 0, isFile: () => true, isDirectory: () => false }),
    lstat: () => Promise.resolve({ size: 0, isFile: () => true, isDirectory: () => false }),
    access: (_p: string) => Promise.resolve(),
};
export const promises = _promises;

export default {
    readFileSync, writeFileSync, existsSync, statSync, lstatSync, readdirSync,
    mkdirSync, unlinkSync, rmdirSync, renameSync, copyFileSync,
    createWriteStream, createReadStream, openSync, closeSync, readSync, writeSync,
    fstatSync, watchFile, unwatchFile, watch, stat,
    writeFile, readFile,
    promises: _promises,
};
