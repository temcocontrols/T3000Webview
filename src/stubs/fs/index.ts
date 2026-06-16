// Browser stub for Node.js 'fs' module
export default {};
export const readFileSync = () => { throw new Error("fs.readFileSync: not available in browser") };
export const writeFileSync = () => { throw new Error("fs.writeFileSync: not available in browser") };
export const existsSync = () => false;
export const statSync = () => { throw new Error("fs.statSync: not available in browser") };
export const lstatSync = () => { throw new Error("fs.lstatSync: not available in browser") };
export const readdirSync = () => [];
export const mkdirSync = () => {};
export const unlinkSync = () => {};
export const rmdirSync = () => {};
export const renameSync = () => {};
export const copyFileSync = () => {};
export const createWriteStream = () => { throw new Error("fs.createWriteStream: not available in browser") };
export const createReadStream = () => { throw new Error("fs.createReadStream: not available in browser") };
export const openSync = () => { throw new Error("fs.openSync: not available in browser") };
export const closeSync = () => {};
export const readSync = () => { throw new Error("fs.readSync: not available in browser") };
export const writeSync = () => { throw new Error("fs.writeSync: not available in browser") };
export const fstatSync = () => { throw new Error("fs.fstatSync: not available in browser") };
export const watchFile = () => {};
export const unwatchFile = () => {};
export const watch = () => {};
export const stat = () => { throw new Error("fs.stat: not available in browser") };
export const promises = {
    readFile: () => Promise.reject(new Error("fs.promises: not available")),
    writeFile: () => Promise.reject(new Error("fs.promises: not available")),
    readdir: () => Promise.resolve([]),
    mkdir: () => Promise.resolve(),
    unlink: () => Promise.resolve(),
    rmdir: () => Promise.resolve(),
    rename: () => Promise.resolve(),
    stat: () => Promise.reject(new Error("fs.promises: not available")),
    lstat: () => Promise.reject(new Error("fs.promises: not available")),
    access: () => Promise.reject(new Error("fs.promises: not available")),
};
