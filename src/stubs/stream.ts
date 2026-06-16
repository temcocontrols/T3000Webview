// Browser stub for Node.js 'stream'
import { EventEmitter } from "./events";
export class Readable extends EventEmitter {}
export class Writable extends EventEmitter {}
export class Transform extends EventEmitter {}
export class Stream extends EventEmitter {}
export const pipeline = () => {};
export default { Readable, Writable, Transform, Stream, pipeline };
