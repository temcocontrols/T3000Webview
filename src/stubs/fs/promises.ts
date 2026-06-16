// Browser stub for fs/promises
export const readFile = () => Promise.reject(new Error("fs.promises: not available"));
export const writeFile = () => Promise.reject(new Error("fs.promises: not available"));
export const readdir = () => Promise.resolve([]);
export const mkdir = () => Promise.resolve();
export const unlink = () => Promise.resolve();
export const rmdir = () => Promise.resolve();
export const rename = () => Promise.resolve();
export const stat = () => Promise.reject(new Error("fs.promises: not available"));
export const lstat = () => Promise.reject(new Error("fs.promises: not available"));
export const access = () => Promise.reject(new Error("fs.promises: not available"));
export const open = () => Promise.reject(new Error("fs.promises: not available"));
export const realpath = (p: string) => Promise.resolve(p);
