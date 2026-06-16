// Browser stub for Node.js 'fs' module
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

const _promises = {
    readFile: () => Promise.reject(new Error("fs.promises: not available")),
    writeFile: () => Promise.reject(new Error("fs.promises: not available")),
    readdir: () => Promise.resolve([]),
    mkdir: () => Promise.resolve(),
    unlink: () => Promise.resolve(),
    rmdir: () => Promise.resolve(),
    rename: () => Promise.resolve(),
    stat: () => Promise.resolve({ size: 0, isFile: () => true, isDirectory: () => false }),
    lstat: () => Promise.resolve({ size: 0, isFile: () => true, isDirectory: () => false }),
    access: () => Promise.reject(new Error("fs.promises: not available")),
};
export const promises = _promises;

export default {
    readFileSync, writeFileSync, existsSync, statSync, lstatSync, readdirSync,
    mkdirSync, unlinkSync, rmdirSync, renameSync, copyFileSync,
    createWriteStream, createReadStream, openSync, closeSync, readSync, writeSync,
    fstatSync, watchFile, unwatchFile, watch, stat,
    promises: _promises,
};
