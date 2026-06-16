// Browser stub for Node.js 'util'
export const promisify = (fn: Function) => fn;
export const inspect = (obj: any) => JSON.stringify(obj);
export const inherits = (ctor: any, superCtor: any) => { ctor.super_ = superCtor; };
export const isDeepStrictEqual = (a: any, b: any) => JSON.stringify(a) === JSON.stringify(b);
export const format = (...args: any[]) => args.join(" ");
export const types = { isPromise: (x: any) => x && typeof x.then === "function" };
export const TextDecoder = globalThis.TextDecoder;
export const TextEncoder = globalThis.TextEncoder;
export default { promisify, inspect, inherits, isDeepStrictEqual, format, types, TextDecoder, TextEncoder };
