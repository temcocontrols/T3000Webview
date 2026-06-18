// Browser stub for Node.js 'child_process'
const noop = () => { throw new Error("child_process: not available in browser") };
export const spawn = noop;
export const spawnSync = noop;
export const exec = noop;
export const execSync = noop;
export const execFile = noop;
export const fork = noop;

export interface ChildProcess {}
export interface ChildProcessWithoutNullStreams {}

export default { spawn, spawnSync, exec, execSync, execFile, fork };
