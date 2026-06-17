// Browser stub for chokidar (Node.js filesystem watcher)
const noop = () => ({ on() { return this; }, close() {} });
export const watch = noop;
export default { watch };
