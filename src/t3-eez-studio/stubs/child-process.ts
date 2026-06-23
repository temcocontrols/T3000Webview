// Browser stub for Node.js 'child_process'
const noopMethod = (cmd: string, args?: string[], opts?: any, cb?: any) => {
    const callback = typeof opts === "function" ? opts : cb;
    if (callback) callback(new Error("child_process: not available in browser"), "", "");
    return {} as any;
};
export const spawn = () => { throw new Error("child_process: not available in browser") };
export const spawnSync = () => { throw new Error("child_process: not available in browser") };
export const exec = (cmd: string, cb?: any) => { if (cb) cb(new Error("child_process: not available in browser"), "", ""); return {} as any };
export const execSync = () => { throw new Error("child_process: not available in browser") };
export const execFile = (file: string, args?: string[], opts?: any, cb?: any) => {
    const callback = typeof opts === "function" ? opts : (typeof args === "function" ? args : cb);
    if (callback) callback(new Error("child_process: not available in browser"), "", "");
    return {} as any;
};
export const fork = () => { throw new Error("child_process: not available in browser") };

export interface ChildProcess {}
export interface ChildProcessWithoutNullStreams {}

export default { spawn, spawnSync, exec, execSync, execFile, fork };
