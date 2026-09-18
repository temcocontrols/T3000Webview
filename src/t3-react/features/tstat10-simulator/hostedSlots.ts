/**
 * LCD designer — the shell slots the hosted page portals its panels into.
 *
 * The page owns the designer state (`useDesignerState`), so it — not the shell — renders the panels; but
 * the panels belong in the shell's regions. A portal is how the two meet, the same mechanism the page
 * already uses for its Design/View toggle (`#page-header-actions`).
 *
 * The ids are resolved during render, so the shell must have committed its regions before the page mounts;
 * `LcdDocument` guarantees that by deferring the page by one commit.
 *
 * ## Why there is a version counter
 *
 * A portal holds on to the *element* it was given, so a slot that is replaced leaves the content attached
 * to a detached node. That is exactly what the Design ⇄ View switch does: View mode drops the regions (the
 * simulator layout needs the whole canvas), Design mode re-creates them — and the page, which renders the
 * portals, has no reason to re-render at that moment. Measured before the counter: after View → Design the
 * page list was empty (`[title="Remove page"]` count 0 instead of 7).
 *
 * So the slots announce themselves; the page subscribes (via `useSyncExternalStore`) and resolves its
 * targets again whenever the set of slots changes.
 */
export const LCD_SLOTS = {
    toolbox: "lcd-slot-toolbox",
    pages: "lcd-slot-pages",
    properties: "lcd-slot-properties"
} as const;

let version = 0;
const listeners = new Set<() => void>();

export function lcdSlotElement(slot: keyof typeof LCD_SLOTS): HTMLElement | null {
    return typeof document === "undefined" ? null : document.getElementById(LCD_SLOTS[slot]);
}

/** Called by the shell's slot elements when they mount or unmount. */
export function noteLcdSlotsChanged(): void {
    version++;
    listeners.forEach((listener) => listener());
}

export function subscribeLcdSlots(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

export function getLcdSlotsVersion(): number {
    return version;
}
