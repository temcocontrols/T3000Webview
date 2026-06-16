// Browser stub for Node.js 'os'
export const type = () => "browser";
export const platform = () => "browser";
export const release = () => "";
export const arch = () => "";
export const cpus = () => [];
export const totalmem = () => 0;
export const freemem = () => 0;
export const homedir = () => "/";
export const tmpdir = () => "/tmp";
export const networkInterfaces = () => ({});
export default { type, platform, release, arch, cpus, totalmem, freemem, homedir, tmpdir, networkInterfaces };
