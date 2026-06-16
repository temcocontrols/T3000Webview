// Browser stub for Node.js 'url'
export const pathToFileURL = (p: string) => new URL("file://" + p.replace(/\\/g, "/"));
export const fileURLToPath = (u: URL | string) => String(u).replace(/^file:\/\//, "");
export const URL = globalThis.URL;
export const URLSearchParams = globalThis.URLSearchParams;
export const format = (u: any) => String(u);
export const parse = (u: string) => new URL(u);
export const resolve = (from: string, to: string) => to;
export default { pathToFileURL, fileURLToPath, URL, URLSearchParams, format, parse, resolve };
