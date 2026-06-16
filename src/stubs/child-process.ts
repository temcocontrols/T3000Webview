// Browser stub for Node.js 'child_process'
export const spawn = () => { throw new Error("child_process.spawn: not available in browser") };
export const exec = () => { throw new Error("child_process.exec: not available in browser") };
export const execSync = () => { throw new Error("child_process.execSync: not available in browser") };
export const fork = () => { throw new Error("child_process.fork: not available in browser") };
export default { spawn, exec, execSync, fork };
