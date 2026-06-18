// Browser stub for mousetrap — keyboard shortcuts
// In the browser, keybindings are handled directly via DOM events
const noop = () => {};
const Mousetrap = {
    bind: noop,
    unbind: noop,
    reset: noop,
    trigger: noop,
    stopCallback: () => false,
} as any;
export default Mousetrap;
export { Mousetrap };
