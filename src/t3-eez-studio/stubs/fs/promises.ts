// Browser stub for fs/promises — bridges through the same backend as the sync ops
import { getBridgeAPI } from "eez-studio-shared/bridge";

function _b() {
    try { return getBridgeAPI(); } catch { return null; }
}

export function readFile(p: string, _enc?: any): Promise<string | Uint8Array> {
    const b = _b();
    return b ? b.readTextFile(p).then(d => d as string) : Promise.resolve("");
}

export function writeFile(p: string, data: string | Uint8Array): Promise<void> {
    const b = _b();
    if (!b) return Promise.resolve();
    const d = typeof data === "string" ? new TextEncoder().encode(data) : data;
    return b.writeFile(p, d);
}

export function readdir(p: string): Promise<string[]> {
    const b = _b();
    return b ? b.listFiles(p) : Promise.resolve([]);
}

export function mkdir(p: string): Promise<void> {
    const b = _b();
    return b ? b.makeFolder(p) : Promise.resolve();
}

export function unlink(p: string): Promise<void> {
    const b = _b();
    return b ? b.deleteFile(p) : Promise.resolve();
}

export function rmdir(_p: string): Promise<void> {
    return Promise.resolve();
}

export function rename(oldP: string, newP: string): Promise<void> {
    const b = _b();
    return b ? b.readFile(oldP).then((d: any) => b.writeFile(newP, d)).then(() => b.deleteFile(oldP)) : Promise.resolve();
}

export function stat(p: string): Promise<{ size: number; isFile(): boolean; isDirectory(): boolean }> {
    const b = _b();
    if (b) {
        return Promise.all([b.getFileSize(p), b.isDirectory(p)])
            .then(([size, isDir]) => ({ size, isFile: () => !isDir, isDirectory: () => isDir }));
    }
    return Promise.resolve({ size: 0, isFile: () => true, isDirectory: () => false });
}

export function lstat(p: string): Promise<{ size: number; isFile(): boolean; isDirectory(): boolean; isSymbolicLink(): boolean }> {
    const b = _b();
    if (b) {
        return Promise.all([b.getFileSize(p), b.isDirectory(p)])
            .then(([size, isDir]) => ({ size, isFile: () => !isDir, isDirectory: () => isDir, isSymbolicLink: () => false }));
    }
    return Promise.resolve({ size: 0, isFile: () => true, isDirectory: () => false, isSymbolicLink: () => false });
}

export function access(_p: string, _mode?: number): Promise<void> {
    return Promise.resolve();
}

export function realpath(p: string): Promise<string> {
    return Promise.resolve(p);
}
