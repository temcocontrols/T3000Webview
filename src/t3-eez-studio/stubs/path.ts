// Browser stub for Node.js 'path'
export const isAbsolute = (p: string) => p.startsWith("/") || /^[A-Za-z]:[\\/]/.test(p);
export const resolve = (...p: string[]) => p.join("/");
export const relative = (from: string, to: string) => to;
export const join = (...p: string[]) => p.join("/");
export const sep = "/";
export const basename = (p: string, ext?: string) => { const n = p.replace(/^.*[\\/]/, ""); return ext && n.endsWith(ext) ? n.slice(0, -ext.length) : n };
export const dirname = (p: string) => { const i = Math.max(p.lastIndexOf("/"), p.lastIndexOf("\\")); return i === -1 ? "." : p.substring(0, i) || "/" };
export const extname = (p: string) => { const n = basename(p); const i = n.lastIndexOf("."); return i <= 0 ? "" : n.substring(i) };
export const parse = (p: string) => { const base = basename(p); const ext = extname(p); return { root: p.startsWith("/") ? "/" : p.substring(0, p.indexOf("/") + 1 || 0), dir: dirname(p), base, ext, name: base.slice(0, -ext.length || base.length) } };
export default { isAbsolute, resolve, relative, join, sep, basename, dirname, extname, parse };
