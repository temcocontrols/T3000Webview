/**
 * LCD designer — the Design ⇄ View mode, published for the shell.
 *
 * The page owns the mode (`useDesignerState`), but the *shell* has to know it: in Design mode the shell
 * draws the designer's regions, and in View mode those regions must disappear so the simulator layout
 * fills the canvas exactly as it does today.
 *
 * Same shape as `statusPublisher` / `activeProject`: the page publishes, the shell subscribes. Default
 * `design`, which is the mode the designer opens in.
 */
export type LcdMode = "design" | "view";

let mode: LcdMode = "design";
const listeners = new Set<() => void>();

/** Publishes the mode. No-op when unchanged, so calling it during render cannot loop. */
export function publishLcdMode(next: LcdMode): void {
    if (next === mode) {
        return;
    }
    mode = next;
    listeners.forEach((listener) => listener());
}

export function getLcdMode(): LcdMode {
    return mode;
}

export function subscribeLcdMode(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}
