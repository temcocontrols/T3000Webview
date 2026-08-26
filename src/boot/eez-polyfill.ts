/**
 * EEZ Studio browser polyfill — MUST run before any EEZ/React code loads.
 *
 * Provides Node.js globals (process, Buffer, global, __dirname, module, ...)
 * that vendored EEZ Studio source and third-party libraries reference even in
 * the browser. Loaded as the FIRST Quasar boot file so `process` etc. are
 * defined before any route/lazy chunk (e.g. the notification/toast chunk)
 * executes its top-level code.
 */
import "src/t3-eez-studio/bridge/browser-polyfill";

// Quasar boot files are expected to expose a default function.
export default () => {
  // no-op — polyfill is a side-effect import
};
